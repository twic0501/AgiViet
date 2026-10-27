-- Giao nhận, nghiệm thu theo phiên bản, tranh chấp, kho, chuyến, QR và vận hành.
CREATE TABLE ref.staff_roles (code text PRIMARY KEY, label_vi text NOT NULL);
INSERT INTO ref.staff_roles VALUES ('dispatcher','Điều phối'),('field','Hiện trường'),('inspector','Kiểm định'),('support','Tổng đài'),('finance','Đối soát'),('risk','Rủi ro'),('catalog','Danh mục'),('supervisor','Trưởng ca');
CREATE TABLE ops.staff_assignments (
 user_id uuid NOT NULL REFERENCES core.users, role_code text NOT NULL REFERENCES ref.staff_roles,
 province_code text REFERENCES ref.provinces, active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(user_id,role_code)
);
CREATE TABLE ops.decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, entity text NOT NULL, entity_id uuid NOT NULL,
 proposed_by uuid NOT NULL REFERENCES core.users, approved_by uuid NOT NULL REFERENCES core.users,
 reason text NOT NULL CHECK(length(trim(reason))>0), evidence_document_id uuid NOT NULL REFERENCES core.documents,
 detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(proposed_by<>approved_by)
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.decisions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, order_id uuid NOT NULL REFERENCES core.orders,
 version_no integer NOT NULL, batch_no integer NOT NULL CHECK(batch_no>0), planned_qty bigint NOT NULL CHECK(planned_qty>0),
 delivery_window tstzrange NOT NULL CHECK(NOT isempty(delivery_window) AND NOT lower_inf(delivery_window) AND NOT upper_inf(delivery_window)),
 receiver_user_id uuid REFERENCES core.users, destination_facility_id uuid REFERENCES core.facilities,
 status text NOT NULL DEFAULT 'preparing', status_changed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1,
 UNIQUE(order_id,batch_no), FOREIGN KEY(order_id,version_no) REFERENCES core.order_versions
);
INSERT INTO ref.statuses(entity,code,label_vi,is_initial,is_terminal,spec_code) VALUES
 ('delivery','preparing','Chờ chuẩn bị',true,false,'cho_chuan_bi'),('delivery','ready','Sẵn sàng',false,false,'san_sang'),
 ('delivery','checking','Đang nghiệm thu',false,false,'dang_nghiem_thu'),('delivery','awaiting_seller','Chờ người bán xác nhận',false,false,'cho_nb_xac_nhan'),
 ('delivery','in_transit','Đang vận chuyển',false,false,'dang_van_chuyen'),('delivery','arrived','Đã đến',false,false,'da_den'),
 ('delivery','arrival_check','Kiểm tại nơi đến',false,false,'cho_kiem_den'),('delivery','disputed','Tranh chấp',false,false,'tranh_chap'),
 ('delivery','closed','Đã chốt',false,true,'da_chot'),('delivery','shortfall_ended','Kết thúc phần thiếu',false,true,'da_ket_thuc_phan_thieu'),('delivery','cancelled','Đã hủy',false,true,'da_huy');
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds)
SELECT 'delivery',a,b,actors FROM (VALUES
 ('preparing','ready',ARRAY['system']),('ready','checking',ARRAY['buyer']),('ready','in_transit',ARRAY['seller']),
 ('checking','awaiting_seller',ARRAY['buyer','system']),('awaiting_seller','in_transit',ARRAY['seller']),
 ('awaiting_seller','closed',ARRAY['seller','ops']),('awaiting_seller','disputed',ARRAY['seller']),
 ('in_transit','arrived',ARRAY['buyer']),('in_transit','checking',ARRAY['buyer']),('in_transit','arrival_check',ARRAY['buyer']),
 ('arrived','checking',ARRAY['buyer']),('arrived','arrival_check',ARRAY['buyer']),('arrival_check','closed',ARRAY['buyer','system']),
 ('arrival_check','disputed',ARRAY['buyer']),('disputed','closed',ARRAY['system','ops']),
 ('preparing','cancelled',ARRAY['system']),('ready','cancelled',ARRAY['system']),('preparing','shortfall_ended',ARRAY['system'])) t(a,b,actors);
CREATE TRIGGER state BEFORE INSERT OR UPDATE OF status ON core.deliveries FOR EACH ROW EXECUTE FUNCTION evt.guard_status('delivery');
CREATE TRIGGER touch BEFORE UPDATE ON core.deliveries FOR EACH ROW EXECUTE FUNCTION ref.touch_row();
CREATE INDEX ix_deliveries_order ON core.deliveries(order_id,status);
ALTER TABLE core.direct_payments ADD FOREIGN KEY(delivery_id) REFERENCES core.deliveries;
ALTER TABLE ledger.qty_movements ADD FOREIGN KEY(delivery_id) REFERENCES core.deliveries;

CREATE TABLE core.acceptance_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id uuid NOT NULL REFERENCES core.deliveries,
 version_no integer NOT NULL CHECK(version_no>0), previous_id uuid REFERENCES core.acceptance_versions,
 weighed_qty bigint NOT NULL CHECK(weighed_qty>0), document_id uuid NOT NULL REFERENCES core.documents,
 recorded_by uuid NOT NULL REFERENCES core.users, recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(delivery_id,version_no), CHECK((version_no=1)=(previous_id IS NULL))
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_versions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.acceptance_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), acceptance_id uuid NOT NULL REFERENCES core.acceptance_versions,
 line_no smallint NOT NULL CHECK(line_no>0), lot_id uuid NOT NULL REFERENCES core.lots,
 contribution_id uuid REFERENCES core.lot_contributions, kind text NOT NULL CHECK(kind IN ('accepted','downgraded','rejected','transit_damage','table_adjustment')),
 qty bigint NOT NULL CHECK(qty>0), payable_qty bigint NOT NULL CHECK(payable_qty>=0), unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd>=0),
 value_vnd bigint NOT NULL, reason_code text, evidence_document_id uuid REFERENCES core.documents,
 measurements jsonb NOT NULL DEFAULT '{}', replaces_line_id uuid UNIQUE REFERENCES core.acceptance_lines,
 status text NOT NULL DEFAULT 'proposed', status_changed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(acceptance_id,line_no),
 CHECK(value_vnd=ref.div_round(payable_qty::numeric*unit_price_vnd,1000)),
 CHECK(kind<>'rejected' OR (payable_qty=0 AND value_vnd=0)),
 CHECK(kind NOT IN ('downgraded','rejected') OR reason_code IS NOT NULL)
);
INSERT INTO ref.statuses(entity,code,label_vi,is_initial,is_terminal) VALUES
 ('acceptance_line','proposed','Đề xuất',true,false),('acceptance_line','disputed','Tranh chấp',false,false),('acceptance_line','closed','Đã chốt',false,true);
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds) VALUES
 ('acceptance_line','proposed','closed',ARRAY['seller','ops']),('acceptance_line','proposed','disputed',ARRAY['seller','buyer']),('acceptance_line','disputed','closed',ARRAY['inspector','ops','seller']);
CREATE TRIGGER state BEFORE INSERT OR UPDATE OF status ON core.acceptance_lines FOR EACH ROW EXECUTE FUNCTION evt.guard_status('acceptance_line');
CREATE FUNCTION core.freeze_acceptance_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN PERFORM ref.ctx('unused'); RAISE EXCEPTION 'Không xóa dòng nghiệm thu' USING HINT='ck_append_only'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','status_changed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','status_changed_at']) THEN
 RAISE EXCEPTION 'Sửa nghiệm thu bằng phiên bản mới' USING HINT='ck_append_only'; END IF; RETURN NEW; END $$;
CREATE TRIGGER tg_freeze BEFORE UPDATE OR DELETE ON core.acceptance_lines FOR EACH ROW EXECUTE FUNCTION core.freeze_acceptance_line();
CREATE INDEX ix_acceptance_delivery ON core.acceptance_versions(delivery_id,version_no DESC);
CREATE INDEX ix_acceptance_lines_parent ON core.acceptance_lines(acceptance_id,status);
CREATE FUNCTION core.check_acceptance_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id uuid; v_total numeric; v_actual bigint;
BEGIN
 v_id:=(to_jsonb(NEW)->>CASE WHEN TG_TABLE_NAME='acceptance_versions' THEN 'id' ELSE 'acceptance_id' END)::uuid;
 SELECT weighed_qty INTO v_actual FROM core.acceptance_versions WHERE id=v_id;
 SELECT sum(qty) INTO v_total FROM core.acceptance_lines WHERE acceptance_id=v_id;
 IF v_total IS DISTINCT FROM v_actual::numeric THEN RAISE EXCEPTION 'Tổng dòng nghiệm thu khác lượng cân' USING HINT='ck_acceptance_total'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER acceptance_total AFTER INSERT ON core.acceptance_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.check_acceptance_total();
CREATE CONSTRAINT TRIGGER acceptance_total AFTER INSERT ON core.acceptance_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.check_acceptance_total();

CREATE TABLE core.disputes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL REFERENCES core.acceptance_lines, order_id uuid NOT NULL REFERENCES core.orders,
 disputed_qty bigint NOT NULL CHECK(disputed_qty>0), opened_by uuid NOT NULL REFERENCES core.users,
 reason text NOT NULL, decision_id uuid REFERENCES ops.decisions,
 status text NOT NULL DEFAULT 'open', status_changed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ref.statuses(entity,code,label_vi,is_initial,is_terminal,spec_code) VALUES
 ('dispute','open','Mở',true,false,'mo'),('dispute','awaiting_seller','Chờ người bán trả lời',false,false,'cho_nb_tra_loi'),
 ('dispute','awaiting_inspection','Chờ kiểm định',false,false,'cho_kiem_dinh'),('dispute','inconclusive','Không kết luận',false,false,'khong_ket_luan'),
 ('dispute','external_resolution','Chuyển cơ chế khác',false,false,'chuyen_co_che_khac'),('dispute','resolved','Đã kết luận',false,true,'da_ket_luan');
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds) VALUES
 ('dispute','open','awaiting_seller',ARRAY['buyer']),('dispute','awaiting_seller','resolved',ARRAY['seller']),
 ('dispute','open','awaiting_inspection',ARRAY['seller','buyer','system']),('dispute','awaiting_seller','awaiting_inspection',ARRAY['seller','buyer','system']),
 ('dispute','awaiting_inspection','resolved',ARRAY['inspector']),('dispute','awaiting_inspection','inconclusive',ARRAY['inspector']),
 ('dispute','inconclusive','awaiting_inspection',ARRAY['seller','buyer']),('dispute','inconclusive','resolved',ARRAY['ops']),
 ('dispute','inconclusive','external_resolution',ARRAY['system']),('dispute','external_resolution','resolved',ARRAY['ops']);
CREATE TRIGGER state BEFORE INSERT OR UPDATE OF status ON core.disputes FOR EACH ROW EXECUTE FUNCTION evt.guard_status('dispute');
CREATE UNIQUE INDEX uq_open_dispute ON core.disputes(line_id) WHERE status<>'resolved';
CREATE INDEX ix_disputes_order ON core.disputes(order_id,status);
CREATE TABLE core.sealed_samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, delivery_id uuid NOT NULL REFERENCES core.deliveries,
 held_by_org_id uuid NOT NULL REFERENCES core.organizations, seal_no text NOT NULL UNIQUE,
 sealed_by uuid NOT NULL REFERENCES core.users, sealed_at timestamptz NOT NULL DEFAULT now(), document_id uuid NOT NULL REFERENCES core.documents
);
CREATE TABLE core.sample_custody_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sample_id uuid NOT NULL REFERENCES core.sealed_samples,
 action text NOT NULL CHECK(action IN ('handover','open','receive')), actor_user_id uuid NOT NULL REFERENCES core.users,
 to_org_id uuid REFERENCES core.organizations, at timestamptz NOT NULL DEFAULT now(), evidence_document_id uuid NOT NULL REFERENCES core.documents
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.sample_custody_events FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.inspections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id uuid NOT NULL REFERENCES core.deliveries, dispute_id uuid REFERENCES core.disputes,
 sample_id uuid REFERENCES core.sealed_samples, provider_org_id uuid NOT NULL REFERENCES core.organizations,
 kind text NOT NULL, fee_vnd bigint NOT NULL CHECK(fee_vnd>=0), prepaid_by_org_id uuid NOT NULL REFERENCES core.organizations,
 due_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.inspection_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inspection_id uuid NOT NULL REFERENCES core.inspections,
 result text NOT NULL CHECK(result IN ('passed','failed','inconclusive')), report_document_id uuid NOT NULL REFERENCES core.documents,
 inspector_user_id uuid NOT NULL REFERENCES core.users, measurements jsonb NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(),
 supersedes_id uuid UNIQUE REFERENCES core.inspection_results
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.inspection_results FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE INDEX ix_inspections_delivery ON core.inspections(delivery_id,kind);
CREATE TABLE core.risk_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id uuid NOT NULL REFERENCES core.deliveries,
 from_org_id uuid NOT NULL REFERENCES core.organizations, to_org_id uuid NOT NULL REFERENCES core.organizations,
 qty bigint NOT NULL CHECK(qty>0), acceptance_point text NOT NULL, document_id uuid NOT NULL REFERENCES core.documents,
 at timestamptz NOT NULL DEFAULT now(), CHECK(from_org_id<>to_org_id)
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.risk_transfers FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE TABLE core.vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES core.organizations,
 plate_no text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('normal','reefer','boat')), capacity_qty bigint NOT NULL CHECK(capacity_qty>0)
);
CREATE TABLE core.trips (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, vehicle_id uuid NOT NULL REFERENCES core.vehicles,
 driver_user_id uuid NOT NULL REFERENCES core.users, payer_org_id uuid NOT NULL REFERENCES core.organizations,
 scheduled_during tstzrange NOT NULL CHECK(NOT isempty(scheduled_during) AND NOT lower_inf(scheduled_during) AND NOT upper_inf(scheduled_during)),
 freight_vnd bigint NOT NULL CHECK(freight_vnd>=0), waiting_fee_vnd bigint NOT NULL DEFAULT 0 CHECK(waiting_fee_vnd>=0),
 min_temp_dc integer, max_temp_dc integer, seal_no text,
 status text NOT NULL DEFAULT 'booked', status_changed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(min_temp_dc IS NULL OR max_temp_dc IS NULL OR min_temp_dc<=max_temp_dc),
 EXCLUDE USING gist(vehicle_id WITH =,scheduled_during WITH &&) WHERE(status<>'cancelled')
);
INSERT INTO ref.statuses(entity,code,label_vi,is_initial,is_terminal,spec_code)
SELECT 'trip',a,b,c,d,e FROM (VALUES
 ('booked','Đã đặt',true,false,'da_dat'),('accepted','Nhà xe nhận',false,false,'nha_xe_nhan'),('at_pickup','Tới điểm bốc',false,false,'toi_diem_boc'),
 ('loading','Đang bốc',false,false,'dang_boc'),('running','Đang chạy',false,false,'dang_chay'),('arrived','Tới nơi đến',false,false,'toi_noi_den'),
 ('delivered','Đã giao',false,false,'da_giao'),('completed','Hoàn thành',false,true,'hoan_thanh'),('incident','Sự cố',false,false,'su_co'),('cancelled','Đã hủy',false,true,'huy')) t(a,b,c,d,e);
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds)
SELECT 'trip',a,b,ARRAY['seller','buyer','system','carrier','ops'] FROM (VALUES
 ('booked','accepted'),('accepted','at_pickup'),('at_pickup','loading'),('loading','running'),('running','arrived'),('arrived','delivered'),('delivered','completed'),
 ('booked','cancelled'),('accepted','cancelled'),('running','incident'),('incident','running'),('incident','cancelled')) t(a,b);
CREATE TRIGGER state BEFORE INSERT OR UPDATE OF status ON core.trips FOR EACH ROW EXECUTE FUNCTION evt.guard_status('trip');
CREATE TABLE core.trip_deliveries (
 trip_id uuid NOT NULL REFERENCES core.trips, delivery_id uuid NOT NULL REFERENCES core.deliveries,
 loaded_qty bigint NOT NULL CHECK(loaded_qty>0), freight_share_vnd bigint NOT NULL CHECK(freight_share_vnd>=0), PRIMARY KEY(trip_id,delivery_id)
);
CREATE INDEX ix_trip_deliveries_delivery ON core.trip_deliveries(delivery_id);
CREATE TABLE core.temperature_readings (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, trip_id uuid REFERENCES core.trips, facility_id uuid REFERENCES core.facilities,
 sensor_ref text NOT NULL, temp_dc integer NOT NULL CHECK(temp_dc BETWEEN -1000 AND 1500), measured_at timestamptz NOT NULL,
 provider_event_key text NOT NULL UNIQUE, received_at timestamptz NOT NULL DEFAULT now(), CHECK((trip_id IS NULL)<>(facility_id IS NULL))
);
CREATE INDEX ix_temperature_trip ON core.temperature_readings(trip_id,measured_at);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.temperature_readings FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.transit_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), trip_id uuid NOT NULL REFERENCES core.trips, delivery_id uuid REFERENCES core.deliveries,
 kind text NOT NULL CHECK(kind IN ('delay','breakdown','temperature','accident','excess_loss')), qty bigint CHECK(qty>=0),
 reported_by uuid NOT NULL REFERENCES core.users, evidence_document_id uuid REFERENCES core.documents,
 detail jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.transit_incidents FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.storage_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES core.facilities, lot_id uuid NOT NULL REFERENCES core.lots,
 owner_org_id uuid NOT NULL REFERENCES core.organizations, payer_org_id uuid NOT NULL REFERENCES core.organizations,
 reserved_qty bigint NOT NULL CHECK(reserved_qty>0), booked_during tstzrange NOT NULL CHECK(NOT isempty(booked_during)),
 price_vnd_per_kg_day bigint NOT NULL CHECK(price_vnd_per_kg_day>=0), fee_vnd bigint NOT NULL CHECK(fee_vnd>=0),
 dispute_id uuid REFERENCES core.disputes, agreement_document_id uuid NOT NULL REFERENCES core.documents,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.storage_movements (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, booking_id uuid NOT NULL REFERENCES core.storage_bookings,
 kind text NOT NULL CHECK(kind IN ('in','out','loss')), qty bigint NOT NULL CHECK(qty>0),
 receiver_user_id uuid REFERENCES core.users, document_id uuid NOT NULL REFERENCES core.documents,
 idempotency_key text NOT NULL UNIQUE, at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.storage_movements FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.return_dispositions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL REFERENCES core.acceptance_lines,
 holder_facility_id uuid NOT NULL REFERENCES core.facilities, choice text NOT NULL CHECK(choice IN ('take_back','urgent_sale','cold_storage','destroy')),
 chosen_by uuid REFERENCES core.users, decision_document_id uuid REFERENCES core.documents, due_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.qr_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),
 kind text NOT NULL CHECK(kind IN ('lot','receipt','trip','seal','record','document','storage','invitation')),
 lot_id uuid REFERENCES core.lots, delivery_id uuid REFERENCES core.deliveries, trip_id uuid REFERENCES core.trips,
 sample_id uuid REFERENCES core.sealed_samples, document_id uuid REFERENCES core.documents, booking_id uuid REFERENCES core.storage_bookings,
 invitation_org_id uuid REFERENCES core.organizations, designated_user_id uuid REFERENCES core.users,
 expires_at timestamptz, single_use boolean NOT NULL DEFAULT true, used_at timestamptz, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(lot_id,delivery_id,trip_id,sample_id,document_id,booking_id,invitation_org_id)=1),
 CHECK((kind='lot' AND lot_id IS NOT NULL) OR (kind='receipt' AND delivery_id IS NOT NULL) OR (kind='trip' AND trip_id IS NOT NULL)
 OR (kind='seal' AND sample_id IS NOT NULL) OR (kind IN ('record','document') AND document_id IS NOT NULL)
 OR (kind='storage' AND booking_id IS NOT NULL) OR (kind='invitation' AND invitation_org_id IS NOT NULL)),
 CHECK(kind IN ('lot','document') OR expires_at IS NOT NULL), CHECK(expires_at IS NULL OR expires_at>created_at)
);
COMMENT ON TABLE core.qr_tokens IS 'Chỉ lưu SHA-256 của token ngẫu nhiên 256 bit; raw token trả một lần qua hàm issue_qr. QR không mang PII.';
CREATE TABLE evt.qr_scans (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, token_id uuid REFERENCES core.qr_tokens, actor_user_id uuid REFERENCES core.users,
 result text NOT NULL CHECK(result IN ('accepted','expired','used','revoked','wrong_user','unknown')), device_id text,
 scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_qr_scans_token ON evt.qr_scans(token_id,scanned_at);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON evt.qr_scans FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.scan_qr(p_token text,p_device text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE q core.qr_tokens%ROWTYPE; r text;
BEGIN
 SELECT * INTO q FROM core.qr_tokens WHERE token_hash=digest(p_token,'sha256') FOR UPDATE;
 r:=CASE WHEN q.id IS NULL THEN 'unknown' WHEN q.revoked_at IS NOT NULL THEN 'revoked'
 WHEN q.expires_at<=ref.clock_at() THEN 'expired' WHEN q.single_use AND q.used_at IS NOT NULL THEN 'used'
 WHEN q.designated_user_id IS NOT NULL AND q.designated_user_id IS DISTINCT FROM ref.ctx_user() THEN 'wrong_user' ELSE 'accepted' END;
 INSERT INTO evt.qr_scans(token_id,actor_user_id,result,device_id,scanned_at) VALUES(q.id,ref.ctx_user(),r,p_device,ref.clock_at());
 IF r='accepted' AND q.single_use THEN UPDATE core.qr_tokens SET used_at=ref.clock_at() WHERE id=q.id; END IF;
 RETURN r;
END $$;
CREATE FUNCTION core.issue_qr(p_kind text,p_object uuid,p_expires timestamptz DEFAULT NULL,p_user uuid DEFAULT NULL) RETURNS text LANGUAGE plpgsql AS $$
DECLARE raw text:=encode(gen_random_bytes(32),'hex');
BEGIN
 INSERT INTO core.qr_tokens(token_hash,kind,lot_id,delivery_id,trip_id,sample_id,document_id,booking_id,invitation_org_id,designated_user_id,expires_at,single_use)
 VALUES(digest(raw,'sha256'),p_kind,CASE WHEN p_kind='lot' THEN p_object END,CASE WHEN p_kind='receipt' THEN p_object END,
 CASE WHEN p_kind='trip' THEN p_object END,CASE WHEN p_kind='seal' THEN p_object END,CASE WHEN p_kind IN ('record','document') THEN p_object END,
 CASE WHEN p_kind='storage' THEN p_object END,CASE WHEN p_kind='invitation' THEN p_object END,p_user,p_expires,p_kind NOT IN ('lot','document','trip'));
 RETURN raw; END $$;

CREATE TABLE ref.sla_policies (priority smallint PRIMARY KEY CHECK(priority BETWEEN 0 AND 3), response_minutes integer NOT NULL, update_minutes integer NOT NULL, resolution_minutes integer NOT NULL, business_hours boolean NOT NULL);
INSERT INTO ref.sla_policies VALUES(0,15,30,240,false),(1,15,30,240,true),(2,240,1440,2880,true),(3,1440,2880,7200,true);
CREATE TABLE ref.task_kinds (code text PRIMARY KEY, label_vi text NOT NULL);
INSERT INTO ref.task_kinds SELECT 'V'||lpad(n::text,2,'0'),'Việc vận hành '||n FROM generate_series(1,24)n;
CREATE TABLE ops.tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, kind text NOT NULL REFERENCES ref.task_kinds,
 priority smallint NOT NULL REFERENCES ref.sla_policies, entity text NOT NULL, entity_id uuid NOT NULL, order_id uuid REFERENCES core.orders,
 province_code text REFERENCES ref.provinces, assigned_to uuid REFERENCES core.users, required_role text NOT NULL REFERENCES ref.staff_roles,
 source_event_id uuid REFERENCES evt.domain_events(id), dedup_key text NOT NULL UNIQUE, trigger_reason text NOT NULL,
 response_due_at timestamptz NOT NULL, resolution_due_at timestamptz NOT NULL, next_update_at timestamptz NOT NULL,
 result_code text, status text NOT NULL DEFAULT 'new', status_changed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(resolution_due_at>=response_due_at)
);
INSERT INTO ref.statuses(entity,code,label_vi,is_initial,is_terminal,spec_code)
SELECT 'task',a,b,c,d,e FROM (VALUES ('new','Mới',true,false,'moi'),('claimed','Đã nhận',false,false,'da_nhan'),('working','Đang xử lý',false,false,'dang_xu_ly'),
 ('waiting_customer','Chờ khách',false,false,'cho_khach'),('done','Xong',false,true,'xong'),('overdue','Quá SLA',false,false,'qua_sla'),('escalated','Chuyển cấp',false,false,'chuyen_cap'))t(a,b,c,d,e);
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds)
SELECT 'task',a,b,ARRAY['ops','field','inspector','system'] FROM (VALUES ('new','claimed'),('claimed','working'),('working','waiting_customer'),('waiting_customer','working'),
 ('working','done'),('waiting_customer','done'),('new','overdue'),('claimed','overdue'),('working','overdue'),('waiting_customer','overdue'),('overdue','escalated'),('escalated','working'),('overdue','working'))t(a,b);
CREATE TRIGGER state BEFORE INSERT OR UPDATE OF status ON ops.tasks FOR EACH ROW EXECUTE FUNCTION evt.guard_status('task');
CREATE INDEX ix_tasks_queue ON ops.tasks(required_role,priority,response_due_at) WHERE status<>'done';
CREATE INDEX ix_tasks_assigned ON ops.tasks(assigned_to,resolution_due_at) WHERE status<>'done';
CREATE TABLE ops.task_actions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, task_id uuid NOT NULL REFERENCES ops.tasks,
 actor_user_id uuid NOT NULL REFERENCES core.users, action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}',
 document_id uuid REFERENCES core.documents, at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.task_actions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE ops.calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES ops.tasks, caller_user_id uuid NOT NULL REFERENCES core.users,
 callee_user_id uuid NOT NULL REFERENCES core.users, duration_seconds integer NOT NULL CHECK(duration_seconds>=0), summary text NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.calls FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE ops.work_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, task_id uuid NOT NULL REFERENCES ops.tasks, user_id uuid NOT NULL REFERENCES core.users,
 work_on date NOT NULL, minutes integer NOT NULL CHECK(minutes>0), category text NOT NULL CHECK(category IN ('guidance','verification','sourcing','agreement','coordination','standby','exception','reconciliation')),
 outside_cost_vnd bigint NOT NULL DEFAULT 0 CHECK(outside_cost_vnd>=0), subsidized boolean NOT NULL DEFAULT false
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.work_logs FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
