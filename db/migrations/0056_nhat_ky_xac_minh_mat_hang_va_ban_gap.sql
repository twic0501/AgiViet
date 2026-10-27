-- Bổ sung trên 0055: không đổi hợp đồng/tiền lịch sử, không cấp DML runtime.
CREATE TABLE core.cultivation_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES core.production_sites,
 org_id uuid NOT NULL REFERENCES core.organizations, occurred_on date NOT NULL,
 activity text NOT NULL CHECK(activity IN ('fertilize','spray','water','flower','fruit_set','harvest','weather_incident','pest_incident','care')),
 note text NOT NULL CHECK(length(btrim(note))>0), medicine_name text, withdrawal_days integer,
 clear_on date GENERATED ALWAYS AS (occurred_on+withdrawal_days) STORED,
 harvested_qty bigint CHECK(harvested_qty>0), delivery_id uuid REFERENCES core.deliveries,
 shortfall_reason text CHECK(shortfall_reason IS NULL OR length(btrim(shortfall_reason))>0),
 photo_document_ids uuid[] NOT NULL DEFAULT '{}', recorded_by uuid NOT NULL REFERENCES core.users,
 source text NOT NULL CHECK(source IN ('self_recorded','agiviet_confirmed')),
 supersedes_id uuid UNIQUE REFERENCES core.cultivation_entries, correction_reason text,
 recorded_at timestamptz NOT NULL DEFAULT ref.clock_at(), request_key text NOT NULL CHECK(length(btrim(request_key))>0),
 UNIQUE(org_id,request_key), CHECK((activity='spray')=(medicine_name IS NOT NULL AND withdrawal_days IS NOT NULL)),
 CHECK(withdrawal_days IS NULL OR withdrawal_days BETWEEN 0 AND 365), CHECK(medicine_name IS NULL OR length(btrim(medicine_name))>0),
 CHECK((activity='harvest')=(harvested_qty IS NOT NULL)), CHECK(delivery_id IS NULL OR activity='harvest'),
 CHECK((supersedes_id IS NULL)=(correction_reason IS NULL)), CHECK(correction_reason IS NULL OR length(btrim(correction_reason))>0)
);
CREATE INDEX ix_cultivation_site_date ON core.cultivation_entries(site_id,occurred_on);
CREATE INDEX ix_cultivation_delivery ON core.cultivation_entries(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.cultivation_entries FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
COMMENT ON TABLE core.cultivation_entries IS 'Nhật ký chỉ thêm; sửa bằng supersedes_id. Thuốc là khai báo mô phỏng/người dùng, không phải tư vấn sử dụng. Cách ly bảo thủ giữ cả mốc cũ khi sửa.';

CREATE TABLE core.seller_product_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES core.organizations,
 site_id uuid NOT NULL REFERENCES core.production_sites, product_id uuid NOT NULL REFERENCES core.products,
 profile_version integer NOT NULL, grade_code text NOT NULL, criteria jsonb NOT NULL CHECK(jsonb_typeof(criteria)='object' AND criteria<>'{}'),
 inspection_source text NOT NULL CHECK(length(btrim(inspection_source))>0), evidence_document_id uuid NOT NULL REFERENCES core.documents,
 valid_during daterange NOT NULL CHECK(NOT isempty(valid_during) AND NOT lower_inf(valid_during) AND NOT upper_inf(valid_during)),
 proposed_by uuid NOT NULL REFERENCES core.users, proposed_at timestamptz NOT NULL DEFAULT ref.clock_at(),
 FOREIGN KEY(product_id,profile_version,grade_code) REFERENCES core.product_grades
);
CREATE TABLE core.seller_product_reviews (
 verification_id uuid PRIMARY KEY REFERENCES core.seller_product_verifications,
 approved_by uuid NOT NULL REFERENCES core.users, approved_at timestamptz NOT NULL DEFAULT ref.clock_at()
);
CREATE TABLE core.seller_product_revocations (
 verification_id uuid PRIMARY KEY REFERENCES core.seller_product_reviews(verification_id),
 revoked_by uuid NOT NULL REFERENCES core.users, reason text NOT NULL CHECK(length(btrim(reason))>0), revoked_at timestamptz NOT NULL DEFAULT ref.clock_at()
);
CREATE INDEX ix_seller_product_scope ON core.seller_product_verifications(org_id,site_id,product_id,profile_version,grade_code);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.seller_product_verifications FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.seller_product_reviews FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.seller_product_revocations FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.guard_product_review() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,core,ops AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.seller_product_verifications v
 JOIN ops.staff_assignments a ON a.user_id=NEW.approved_by AND a.active AND a.role_code IN ('risk','supervisor')
 JOIN ops.staff_assignments b ON b.user_id=v.proposed_by AND b.active
 WHERE v.id=NEW.verification_id AND v.proposed_by<>NEW.approved_by) THEN
 RAISE EXCEPTION 'Cần người duyệt độc lập đang có phân công' USING HINT='ck_product_two_person'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_review BEFORE INSERT ON core.seller_product_reviews FOR EACH ROW EXECUTE FUNCTION core.guard_product_review();

CREATE FUNCTION cmd.create_production_site(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','coop_board']);
 IF ref.ctx_actor()<>'seller' THEN RAISE EXCEPTION 'Chỉ người bán' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN cmd.insert_row('core.production_sites',p_data||jsonb_build_object('org_id',ref.ctx_org(),'created_by',ref.ctx_user()),
 ARRAY['kind','name','commune_code','lat','lng','area_m2','address_detail','org_id','created_by']);
END $$;
CREATE FUNCTION cmd.propose_seller_product(p_site uuid,p_product uuid,p_profile integer,p_grade text,p_criteria jsonb,p_source text,p_valid daterange,p_evidence uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE org uuid; result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']);
 SELECT org_id INTO org FROM core.production_sites WHERE id=p_site AND deleted_at IS NULL FOR UPDATE;
 IF NOT core.can_review_product_org(org) THEN RAISE EXCEPTION 'Ngoài phạm vi phân công' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF org IS NULL OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=org AND can_sell AND status='active')
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type='evidence' AND owner_org_id=org
 AND entity='organization' AND entity_id=org) THEN RAISE EXCEPTION 'Thiếu cơ sở/chứng cứ đúng tổ chức' USING HINT='ck_product_verification'; END IF;
 INSERT INTO core.seller_product_verifications(org_id,site_id,product_id,profile_version,grade_code,criteria,inspection_source,evidence_document_id,valid_during,proposed_by)
 VALUES(org,p_site,p_product,p_profile,p_grade,p_criteria,p_source,p_evidence,p_valid,ref.ctx_user()) RETURNING id INTO result;
 PERFORM evt.audit('seller_product.proposed','seller_product',result); RETURN result;
END $$;
CREATE FUNCTION cmd.approve_seller_product(p_verification uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 PERFORM 1 FROM core.seller_product_verifications WHERE id=p_verification FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có đề xuất' USING HINT='ck_product_verification'; END IF;
 IF NOT core.can_review_product_org((SELECT org_id FROM core.seller_product_verifications WHERE id=p_verification)) THEN RAISE EXCEPTION 'Ngoài phạm vi phân công' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF EXISTS(SELECT 1 FROM core.seller_product_reviews WHERE verification_id=p_verification AND approved_by=ref.ctx_user()) THEN RETURN p_verification; END IF;
 INSERT INTO core.seller_product_reviews(verification_id,approved_by) VALUES(p_verification,ref.ctx_user());
 PERFORM evt.audit('seller_product.approved','seller_product',p_verification); RETURN p_verification;
END $$;
CREATE FUNCTION cmd.revoke_seller_product(p_verification uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 PERFORM 1 FROM core.seller_product_verifications WHERE id=p_verification FOR UPDATE;
 IF NOT core.can_review_product_org((SELECT org_id FROM core.seller_product_verifications WHERE id=p_verification)) THEN RAISE EXCEPTION 'Ngoài phạm vi phân công' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO core.seller_product_revocations(verification_id,revoked_by,reason) VALUES(p_verification,ref.ctx_user(),p_reason);
 PERFORM evt.audit('seller_product.revoked','seller_product',p_verification);
END $$;

CREATE FUNCTION cmd.record_cultivation(p_site uuid,p_data jsonb,p_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid; result uuid; src text; old core.cultivation_entries%ROWTYPE; previous core.cultivation_entries%ROWTYPE; body jsonb;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT org_id INTO org FROM core.production_sites WHERE id=p_site AND deleted_at IS NULL FOR UPDATE;
 IF org IS NULL THEN RAISE EXCEPTION 'Không có cơ sở' USING HINT='ck_cultivation_scope'; END IF;
 IF ref.ctx_actor()='ops' THEN PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']); src:='agiviet_confirmed';
 ELSE
  IF ref.ctx_actor() NOT IN ('seller','helper') THEN RAISE EXCEPTION 'Chỉ chủ/người giúp nhật ký' USING HINT='KHONG_CO_QUYEN'; END IF;
  IF ref.ctx_actor()='helper' THEN PERFORM cmd.require_lot_editor(org,'diary.write');
  ELSE PERFORM cmd.require_org(org,ARRAY['owner','coop_board']); END IF;
  src:='self_recorded';
 END IF;
 PERFORM cmd.check_payload(p_data,ARRAY['occurred_on','activity','note','medicine_name','withdrawal_days','harvested_qty','delivery_id','shortfall_reason','photo_document_ids','supersedes_id','correction_reason']);
 IF p_data->>'occurred_on' IS NULL OR (p_data->>'occurred_on')::date>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_data->'photo_document_ids','[]')) x
 WHERE NOT EXISTS(SELECT 1 FROM core.documents WHERE id=x::uuid AND owner_org_id=org AND doc_type='evidence' AND mime_type LIKE 'image/%'))
 OR (p_data->>'delivery_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.deliveries d JOIN core.orders o ON o.id=d.order_id JOIN core.lots l ON l.id=o.lot_id
 WHERE d.id=(p_data->>'delivery_id')::uuid AND o.seller_org_id=org AND l.site_id=p_site)) THEN
 RAISE EXCEPTION 'Ngày, ảnh hoặc đợt khác phạm vi' USING HINT='ck_cultivation_scope'; END IF;
 body:=p_data||jsonb_build_object('site_id',p_site,'org_id',org,'recorded_by',ref.ctx_user(),'source',src,'request_key',p_key);
 -- So sánh nội dung đã chuẩn hóa, không cho retry một khóa với nội dung khác.
 SELECT * INTO old FROM core.cultivation_entries WHERE org_id=org AND request_key=p_key;
 IF old.id IS NOT NULL THEN
  IF (to_jsonb(old)-ARRAY['id','recorded_at','clear_on']) IS DISTINCT FROM
    (to_jsonb(jsonb_populate_record(NULL::core.cultivation_entries,jsonb_build_object('photo_document_ids','[]'::jsonb)||body))-ARRAY['id','recorded_at','clear_on']) THEN
   RAISE EXCEPTION 'Khóa nhật ký đã dùng với nội dung khác' USING HINT='IDEMPOTENCY_CONFLICT'; END IF;
  RETURN old.id;
 END IF;
 IF p_data->>'supersedes_id' IS NOT NULL THEN
  SELECT * INTO previous FROM core.cultivation_entries WHERE id=(p_data->>'supersedes_id')::uuid FOR UPDATE;
  IF previous.site_id IS DISTINCT FROM p_site OR previous.source='agiviet_confirmed' AND src<>'agiviet_confirmed'
  OR EXISTS(SELECT 1 FROM core.cultivation_entries WHERE supersedes_id=previous.id) THEN
   RAISE EXCEPTION 'Chỉ sửa bản hiện hành cùng cơ sở; không hạ nhãn xác nhận' USING HINT='ck_cultivation_scope'; END IF;
 END IF;
 result:=cmd.insert_row('core.cultivation_entries',body,ARRAY['site_id','org_id','recorded_by','source','request_key','occurred_on','activity','note','medicine_name','withdrawal_days','harvested_qty','delivery_id','shortfall_reason','photo_document_ids','supersedes_id','correction_reason']);
 PERFORM evt.emit('production_site',p_site,'cultivation.recorded',jsonb_build_object('entry_id',result,'audience_org_id',org),ARRAY['sync_apps']);
 RETURN result;
END $$;

CREATE FUNCTION core.site_clear_on(p_site uuid) RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT max(clear_on) FROM core.cultivation_entries WHERE site_id=p_site AND activity='spray'
$$;
CREATE FUNCTION cmd.assert_lot_verified(p_lot uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,core,cmd,ref AS $$
DECLARE l core.lots%ROWTYPE; clear date; today date:=(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 SELECT * INTO l FROM core.lots WHERE id=p_lot;
 -- Khóa cơ sở cùng thứ tự với ghi nhật ký; SERIALIZABLE/retry khi đua publish/spray/revoke.
 PERFORM 1 FROM core.production_sites WHERE id=l.site_id AND org_id=l.seller_org_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM core.seller_product_verifications v JOIN core.seller_product_reviews r ON r.verification_id=v.id
 WHERE v.org_id=l.seller_org_id AND v.site_id=l.site_id AND v.product_id=l.product_id AND v.profile_version=l.profile_version AND v.grade_code=l.grade_code
 AND v.valid_during@>today AND NOT EXISTS(SELECT 1 FROM core.seller_product_revocations WHERE verification_id=v.id)) THEN
 RAISE EXCEPTION 'Mặt hàng/cơ sở/loại chưa xác minh hoặc hết hiệu lực' USING HINT='ck_lot_verified_product'; END IF;
 clear:=greatest(core.site_clear_on(l.site_id),l.spray_clear_on);
 IF clear>today OR clear>l.harvest_on THEN RAISE EXCEPTION 'Nhật ký còn ngày cách ly' USING HINT='ck_lot_withdrawal'; END IF;
 UPDATE core.lots SET spray_clear_on=clear,is_substandard=(SELECT is_substandard FROM core.product_grades WHERE product_id=l.product_id AND profile_version=l.profile_version AND grade_code=l.grade_code) WHERE id=l.id;
END $$;
ALTER TABLE core.lots ADD COLUMN urgent_sale_from timestamptz;
ALTER TABLE core.lots ADD COLUMN urgent_sale_reason text;
UPDATE core.lots SET urgent_sale_from=least(created_at,urgent_sale_until-interval '1 microsecond'),urgent_sale_reason='Cờ bán gấp có trước 0056; chưa có lý do gốc' WHERE urgent_sale_until IS NOT NULL;
ALTER TABLE core.lots ADD CONSTRAINT ck_urgent_period CHECK(urgent_sale_until IS NULL OR (urgent_sale_from IS NOT NULL AND urgent_sale_until>urgent_sale_from AND length(btrim(urgent_sale_reason))>0));
CREATE TABLE core.urgent_sale_suggestions (
 lot_id uuid PRIMARY KEY REFERENCES core.lots, suggested_at timestamptz NOT NULL DEFAULT ref.clock_at(),
 reason text NOT NULL DEFAULT 'Hàng tươi đang bán 24 giờ chưa có lời hỏi mua'
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.urgent_sale_suggestions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.set_urgent_sale(p_lot uuid,p_until timestamptz,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board']);
 IF ref.ctx_actor()<>'seller' OR l.status NOT IN ('on_sale','upcoming') OR l.safety_locked_at IS NOT NULL
 OR p_until IS NOT NULL AND (p_until<=ref.clock_at() OR coalesce(length(btrim(p_reason)),0)=0) THEN
 RAISE EXCEPTION 'Cờ bán gấp cần lô an toàn, hạn và lý do' USING HINT='ck_urgent_sale'; END IF;
 IF p_until IS NOT NULL THEN PERFORM cmd.assert_lot_verified(l.id); END IF;
 UPDATE core.deadlines SET status='cancelled' WHERE entity='lot' AND entity_id=l.id AND kind='urgent_sale' AND status='open';
 UPDATE core.lots SET urgent_sale_from=CASE WHEN p_until IS NOT NULL THEN ref.clock_at() END,urgent_sale_until=p_until,urgent_sale_reason=CASE WHEN p_until IS NOT NULL THEN p_reason END WHERE id=l.id;
 IF p_until IS NOT NULL THEN INSERT INTO core.deadlines(kind,entity,entity_id,due_at) VALUES('urgent_sale','lot',l.id,p_until); END IF;
 PERFORM evt.audit('lot.urgent_sale','lot',l.id,jsonb_build_object('until',p_until,'reason',p_reason));
END $$;
CREATE FUNCTION cmd.suggest_urgent_sales() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE n integer;
BEGIN
 PERFORM cmd.require_system();
 WITH added AS (
 INSERT INTO core.urgent_sale_suggestions(lot_id)
 SELECT l.id FROM core.lots l JOIN core.product_profiles p ON p.product_id=l.product_id AND p.profile_version=l.profile_version
 WHERE l.status='on_sale' AND l.safety_locked_at IS NULL AND p.shelf_life_days<=10
 AND coalesce(l.last_confirmed_at,l.created_at)<=ref.clock_at()-interval '24 hours'
 AND NOT EXISTS(SELECT 1 FROM core.offers o WHERE o.lot_id=l.id AND o.direction='buyer_bid' AND o.status<>'auto_rejected' AND o.created_at>ref.clock_at()-interval '24 hours')
 ON CONFLICT DO NOTHING RETURNING lot_id)
 SELECT count(*) INTO n FROM added;
 -- Gợi ý riêng cho chủ, không tự giảm giá/bật cờ hoặc thông báo bên mua.
 RETURN n;
END $$;
CREATE FUNCTION cmd.set_substandard_offer(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=ref.ctx_org() AND can_buy)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_data->'grade_codes') g WHERE NOT EXISTS(SELECT 1 FROM core.product_grades
 WHERE product_id=(p_data->>'product_id')::uuid AND grade_code=g AND is_substandard))
 OR coalesce(jsonb_array_length(p_data->'grade_codes'),0)=0
 OR (p_data->>'standing_price_vnd')::bigint<=0 OR (p_data->>'floor_price_vnd')::bigint<=0 THEN
 RAISE EXCEPTION 'Sai đối tác/loại/giá' USING HINT='ck_substandard_offer'; END IF;
 RETURN cmd.insert_row('core.substandard_receivers',p_data||jsonb_build_object('buyer_org_id',ref.ctx_org()),
 ARRAY['buyer_org_id','product_id','grade_codes','min_qty','radius_km','standing_price_vnd','is_offtake_partner','floor_price_vnd','valid_during']);
END $$;
CREATE FUNCTION cmd.withdraw_substandard_offer(p_offer uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT buyer_org_id INTO org FROM core.substandard_receivers WHERE id=p_offer FOR UPDATE;
 PERFORM cmd.require_org(org,ARRAY['owner','purchaser']);
 UPDATE core.substandard_receivers SET valid_during='empty'::daterange WHERE id=p_offer;
 PERFORM evt.audit('substandard_offer.withdrawn','substandard_offer',p_offer);
END $$;

-- Chuyến đã xong không còn chiếm lịch xe. Giữ nguyên khoảng lịch sử.
ALTER TABLE core.trips DROP CONSTRAINT trips_vehicle_id_scheduled_during_excl;
ALTER TABLE core.trips ADD CONSTRAINT trips_vehicle_id_scheduled_during_excl
 EXCLUDE USING gist(vehicle_id WITH =,scheduled_during WITH &&) WHERE(status NOT IN ('cancelled','completed'));
ALTER TABLE core.trips ADD COLUMN completed_at timestamptz;
ALTER TABLE core.trips ALTER COLUMN created_at SET DEFAULT ref.clock_at();
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds,note_vi)
 SELECT 'trip',s,'completed',ARRAY['seller','buyer','system','ops'],'Tất cả đợt của chuyến đã chốt/kết thúc; giữ lịch sử lịch xe'
 FROM unnest(ARRAY['booked','accepted','at_pickup','loading','running','arrived','incident']) s;
CREATE FUNCTION core.complete_delivery_trips() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE tid uuid;
BEGIN
 IF NEW.status NOT IN ('closed','shortfall_ended','cancelled') THEN RETURN NEW; END IF;
 FOR tid IN SELECT trip_id FROM core.trip_deliveries WHERE delivery_id=NEW.id ORDER BY trip_id LOOP
  PERFORM 1 FROM core.trips WHERE id=tid FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM core.trip_deliveries td JOIN core.deliveries d ON d.id=td.delivery_id WHERE td.trip_id=tid AND d.status NOT IN ('closed','shortfall_ended','cancelled')) THEN
   UPDATE core.trips SET status='completed',completed_at=ref.clock_at() WHERE id=tid AND status NOT IN ('completed','cancelled');
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER z_complete_trip AFTER UPDATE OF status ON core.deliveries FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION core.complete_delivery_trips();
-- Nâng cấp các chuyến cũ đã có đủ chứng cứ đợt chốt, không giả định chuyến không có đợt là xong.
DO $$ DECLARE t uuid; BEGIN
 FOR t IN SELECT id FROM core.trips t WHERE status NOT IN ('completed','cancelled') AND EXISTS(SELECT 1 FROM core.trip_deliveries WHERE trip_id=t.id)
 AND NOT EXISTS(SELECT 1 FROM core.trip_deliveries td JOIN core.deliveries d ON d.id=td.delivery_id WHERE td.trip_id=t.id AND d.status NOT IN ('closed','shortfall_ended','cancelled')) LOOP
  PERFORM set_config('app.actor_kind','system',true);
  UPDATE core.trips SET status='completed',completed_at=ref.clock_at() WHERE id=t;
 END LOOP;
END $$;

-- Chính sách đọc riêng, không mở nhật ký/xác minh trên thị trường công khai.
CREATE FUNCTION core.can_read_cultivation_org(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref,cmd AS $$
 SELECT core.can_access_org(p_org) OR (ref.ctx_actor()='helper' AND ref.ctx_org()=p_org AND EXISTS(
 SELECT 1 FROM core.delegations d JOIN core.memberships m ON m.org_id=d.org_id AND m.user_id=d.principal_user_id AND m.status='active'
 JOIN core.membership_roles r ON r.membership_id=m.id AND r.role_code IN ('owner','coop_board')
 JOIN core.users u ON u.id=d.principal_user_id AND u.disabled_at IS NULL
 JOIN core.users h ON h.id=d.helper_user_id AND h.disabled_at IS NULL
 WHERE d.org_id=p_org AND d.helper_user_id=ref.ctx_user() AND d.revoked_at IS NULL AND d.valid_during@>ref.clock_at() AND 'diary.write'=ANY(d.actions)))
$$;
GRANT EXECUTE ON FUNCTION core.can_read_cultivation_org(uuid) TO agiviet_app;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['cultivation_entries','seller_product_verifications','seller_product_reviews','seller_product_revocations','urgent_sale_suggestions'] LOOP
 EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT ON core.%I TO agiviet_app',t);
 END LOOP;
END $$;
CREATE POLICY own_diary ON core.cultivation_entries FOR SELECT USING(core.can_read_cultivation_org(org_id));
CREATE POLICY own_product_verification ON core.seller_product_verifications FOR SELECT USING(core.can_access_org(org_id));
CREATE POLICY own_product_review ON core.seller_product_reviews FOR SELECT USING(EXISTS(SELECT 1 FROM core.seller_product_verifications WHERE id=verification_id));
CREATE POLICY own_product_revocation ON core.seller_product_revocations FOR SELECT USING(EXISTS(SELECT 1 FROM core.seller_product_verifications WHERE id=verification_id));
CREATE POLICY own_urgent_suggestion ON core.urgent_sale_suggestions FOR SELECT USING(EXISTS(SELECT 1 FROM core.lots WHERE id=lot_id AND core.can_access_org(seller_org_id)));
GRANT EXECUTE ON FUNCTION cmd.create_production_site(jsonb),cmd.record_cultivation(uuid,jsonb,text),cmd.propose_seller_product(uuid,uuid,integer,text,jsonb,text,daterange,uuid),cmd.approve_seller_product(uuid),cmd.revoke_seller_product(uuid,text),cmd.set_urgent_sale(uuid,timestamptz,text),cmd.set_substandard_offer(jsonb),cmd.withdraw_substandard_offer(uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.suggest_urgent_sales() TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.publish_lot(p_lot uuid,p_ask bigint,p_floor bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_lot_editor(l.seller_org_id,'lot.update');
 IF l.status<>'draft' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô chưa thể đăng' USING HINT='ck_command_state'; END IF;
 PERFORM cmd.assert_lot_verified(l.id);
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_by,set_at) VALUES(l.id,p_ask,p_floor,ref.ctx_user(),ref.clock_at());
 UPDATE core.lots SET status=CASE WHEN available_from>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'upcoming' ELSE 'on_sale' END,last_confirmed_at=ref.clock_at() WHERE id=l.id;
END $$;

CREATE OR REPLACE FUNCTION cmd.update_lot(p_lot uuid,p_action text,p_data jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_lot_editor(l.seller_org_id,'lot.update');
 IF ref.ctx_actor() NOT IN ('seller','helper') OR l.status='closed' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô không thể sửa' USING HINT='ck_command_state'; END IF;
 IF p_action='price' THEN
 PERFORM cmd.check_payload(p_data,ARRAY['ask_price_vnd','floor_price_vnd','below_cost_ack']);
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,below_cost_ack,set_by,set_at)
 VALUES(l.id,(p_data->>'ask_price_vnd')::bigint,(p_data->>'floor_price_vnd')::bigint,coalesce((p_data->>'below_cost_ack')::boolean,false),ref.ctx_user(),ref.clock_at());
 ELSIF p_action='confirm' THEN
 PERFORM cmd.assert_lot_verified(l.id);
 PERFORM cmd.check_payload(p_data,'{}');
 UPDATE core.lots SET last_confirmed_at=ref.clock_at(),status=CASE WHEN status='hidden' THEN 'on_sale' ELSE status END WHERE id=l.id;
 ELSIF p_action='close' THEN
 PERFORM cmd.check_payload(p_data,'{}');
 IF EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=l.id AND bucket IN ('held','committed','in_transit') AND qty>0) THEN RAISE EXCEPTION 'Lô còn lượng ràng buộc' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Chủ lô đóng tin',true); UPDATE core.lots SET status='closed' WHERE id=l.id;
 ELSE RAISE EXCEPTION 'Sai thao tác lô' USING HINT='ck_command_payload'; END IF;
 PERFORM evt.emit('lot',l.id,'lot.'||p_action,'{}',ARRAY['notify']);
END $$;


REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
CREATE FUNCTION cmd.attach_cultivation_photo(p_site uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT org_id INTO org FROM core.production_sites WHERE id=p_site AND deleted_at IS NULL FOR UPDATE;
 IF ref.ctx_actor()='ops' THEN PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']);
 ELSIF ref.ctx_actor()='helper' THEN PERFORM cmd.require_lot_editor(org,'diary.write');
 ELSE PERFORM cmd.require_org(org,ARRAY['owner','coop_board']); END IF;
 IF org IS NULL OR p_document->>'mime_type' NOT LIKE 'image/%' OR p_document->>'mime_type' IS NULL THEN RAISE EXCEPTION 'Cần tệp ảnh đúng cơ sở' USING HINT='ck_cultivation_scope'; END IF;
 RETURN cmd.insert_row('core.documents',p_document||jsonb_build_object('doc_type','evidence','owner_org_id',org,'entity','production_site','entity_id',p_site,'created_by',ref.ctx_user()),
 ARRAY['code','series_key','version_no','content_sha256','file_sha256','canonical_content','storage_key','mime_type','size_bytes','generator_version','is_test_data','doc_type','owner_org_id','entity','entity_id','created_by']);
END $$;
GRANT EXECUTE ON FUNCTION cmd.attach_cultivation_photo(uuid,jsonb) TO agiviet_app;
CREATE FUNCTION core.can_review_product_org(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ops,ref AS $$
 SELECT ref.ctx_actor()='ops' AND EXISTS(SELECT 1 FROM core.organizations o JOIN ops.staff_assignments s ON s.user_id=ref.ctx_user() AND s.active AND s.role_code IN ('field','risk','supervisor')
 JOIN core.users u ON u.id=s.user_id AND u.disabled_at IS NULL WHERE o.id=p_org AND (s.province_code IS NULL OR s.province_code=o.province_code))
$$;
GRANT EXECUTE ON FUNCTION core.can_review_product_org(uuid) TO agiviet_app;
CREATE POLICY staff_product_verification ON core.seller_product_verifications FOR SELECT USING(core.can_review_product_org(org_id));
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
COMMENT ON COLUMN core.lots.urgent_sale_from IS 'Giờ nghiệp vụ chủ bật bán gấp; không xuất trong mkt.search_lots.';
COMMENT ON COLUMN core.lots.urgent_sale_reason IS 'Lý do bán gấp của người bán, không phải xác nhận an toàn.';
COMMENT ON COLUMN core.trips.completed_at IS 'Giờ nghiệp vụ tất cả đợt đã kết thúc; scheduled_during giữ lịch sử, xe được giải phóng.';
CREATE FUNCTION core.guard_seller_product_scope() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,core,ops AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.production_sites WHERE id=NEW.site_id AND org_id=NEW.org_id AND deleted_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=NEW.evidence_document_id AND doc_type='evidence' AND owner_org_id=NEW.org_id AND entity='organization' AND entity_id=NEW.org_id)
 OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.proposed_by AND active AND role_code IN ('field','risk','supervisor')) THEN
 RAISE EXCEPTION 'Hồ sơ mặt hàng phải đúng cơ sở, chứng cứ tổ chức và người khảo sát' USING HINT='ck_product_verification'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_scope BEFORE INSERT ON core.seller_product_verifications FOR EACH ROW EXECUTE FUNCTION core.guard_seller_product_scope();
CREATE POLICY staff_diary ON core.cultivation_entries FOR SELECT USING(core.can_review_product_org(org_id));
CREATE POLICY own_production_site ON core.production_sites FOR SELECT USING(core.can_read_cultivation_org(org_id));
GRANT SELECT ON core.production_sites TO agiviet_app;
-- Lời chào hàng dạt có bộ đọc chỉ cột công khai, tránh mở toàn hàng lô/địa chỉ.
CREATE FUNCTION cmd.list_substandard_offers(p_lot uuid) RETURNS TABLE(id uuid,buyer_org_id uuid,min_qty bigint,radius_km integer,standing_price_vnd bigint,is_offtake_partner boolean,floor_price_vnd bigint,valid_during daterange)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE core.lots.id=p_lot;
 PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board']);
 IF NOT l.is_substandard OR l.safety_locked_at IS NOT NULL THEN RETURN; END IF;
 IF core.site_clear_on(l.site_id)>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN RETURN; END IF;
 RETURN QUERY SELECT s.id,s.buyer_org_id,s.min_qty,s.radius_km,s.standing_price_vnd,s.is_offtake_partner,s.floor_price_vnd,s.valid_during
 FROM core.substandard_receivers s JOIN core.organizations o ON o.id=s.buyer_org_id AND o.status='active' AND o.can_buy
 WHERE s.product_id=l.product_id AND l.grade_code=ANY(s.grade_codes) AND s.valid_during@>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
END $$;
GRANT EXECUTE ON FUNCTION cmd.list_substandard_offers(uuid) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
