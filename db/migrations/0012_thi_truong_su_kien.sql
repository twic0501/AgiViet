-- Thị trường: lịch sử nhập có nhãn riêng; giá thật chỉ từ dòng đã chốt.
CREATE TABLE core.historical_trades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, seller_org_id uuid NOT NULL REFERENCES core.organizations,
 product_id uuid NOT NULL REFERENCES core.products, grade_code text NOT NULL, qty bigint NOT NULL CHECK(qty>0),
 unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd>0), accepted_at timestamptz NOT NULL,
 province_code text REFERENCES ref.provinces, excluded_from_ref_price boolean NOT NULL DEFAULT false,
 is_test_data boolean NOT NULL CHECK(is_test_data), source_key text NOT NULL
);
COMMENT ON TABLE core.historical_trades IS 'Đơn nền từ JSON; chỉ dữ liệu thử, không giả dựng chữ ký hay dòng tiền quá khứ. Không dùng cho số dư.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.historical_trades FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE ops.seed_sources (
 source_key text PRIMARY KEY, sha256 bytea NOT NULL CHECK(octet_length(sha256)=32), payload jsonb NOT NULL,
 loaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.seed_sources FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE mkt.external_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES core.products, grade_code text NOT NULL,
 unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd>0), source_label text NOT NULL, observed_on date NOT NULL,
 is_test_data boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE mkt.external_prices IS 'Giá ngoài hoặc giả định; không được dùng làm giá tính cọc. Số so_don trong JSON không được giả thành đơn đã chốt.';
CREATE TABLE ops.anomaly_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rule_code text NOT NULL, org_id uuid REFERENCES core.organizations,
 buyer_org_id uuid REFERENCES core.organizations, seller_org_id uuid REFERENCES core.organizations,
 order_id uuid REFERENCES core.orders, lot_id uuid REFERENCES core.lots,
 evidence jsonb NOT NULL, severity smallint NOT NULL CHECK(severity BETWEEN 0 AND 3),
 decision_id uuid REFERENCES ops.decisions, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE INDEX ix_anomalies_open ON ops.anomaly_flags(rule_code,created_at) WHERE resolved_at IS NULL;
CREATE TABLE core.organization_blocks (
 org_id uuid NOT NULL REFERENCES core.organizations, blocked_org_id uuid NOT NULL REFERENCES core.organizations,
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(org_id,blocked_org_id), CHECK(org_id<>blocked_org_id)
);
CREATE TABLE mkt.match_candidates (
 demand_line_id uuid NOT NULL REFERENCES core.demand_lines, lot_id uuid NOT NULL REFERENCES core.lots,
 match_group text NOT NULL CHECK(match_group IN ('full','partial','near_price')),
 score_bps integer NOT NULL CHECK(score_bps BETWEEN 0 AND 11000),
 distance_m bigint NOT NULL CHECK(distance_m>=0), promiseable_qty bigint NOT NULL CHECK(promiseable_qty>=0),
 hard_filters_passed boolean NOT NULL CHECK(hard_filters_passed), algorithm_version text NOT NULL,
 reasons jsonb NOT NULL, computed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 PRIMARY KEY(demand_line_id,lot_id), CHECK(expires_at>computed_at)
);
COMMENT ON TABLE mkt.match_candidates IS 'Bộ đệm điểm do backend chạy H1-H11 và 9 thành phần tính; không lưu giá kín, không coi ghép là xác minh. Hết hạn phải tính lại.';
CREATE INDEX ix_match_rank ON mkt.match_candidates(demand_line_id,match_group,score_bps DESC);
ALTER TABLE core.demand_lines ADD COLUMN min_source_qty bigint NOT NULL DEFAULT 20000 CHECK(min_source_qty>0);
ALTER TABLE core.demands ADD COLUMN max_radius_m bigint NOT NULL DEFAULT 150000 CHECK(max_radius_m>0);
ALTER TABLE core.demands ADD COLUMN product_form text;
ALTER TABLE core.demands ADD COLUMN preferred_docs text[] NOT NULL DEFAULT '{}';
CREATE TABLE core.contact_grants (
 order_id uuid PRIMARY KEY REFERENCES core.orders, buyer_org_id uuid NOT NULL REFERENCES core.organizations,
 seller_org_id uuid NOT NULL REFERENCES core.organizations, mode text NOT NULL CHECK(mode IN ('relay','full')),
 granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE FUNCTION core.refresh_contact_grant() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE o core.orders%ROWTYPE; value bigint; n integer;
BEGIN
 IF NEW.status<>'active' THEN RETURN NEW; END IF;
 SELECT * INTO o FROM core.orders WHERE id=NEW.id;
 IF o.framework_id IS NULL AND NOT EXISTS(SELECT 1 FROM core.deposits WHERE order_id=o.id AND status IN ('held','processing','fully_processed')) THEN RETURN NEW; END IF;
 SELECT contract_value_vnd INTO value FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 SELECT count(*) INTO n FROM (SELECT id::text FROM core.orders WHERE buyer_org_id=o.buyer_org_id AND seller_org_id=o.seller_org_id AND status='completed'
 UNION ALL SELECT code FROM core.historical_trades WHERE buyer_org_id=o.buyer_org_id AND seller_org_id=o.seller_org_id)t;
 INSERT INTO core.contact_grants(order_id,buyer_org_id,seller_org_id,mode) VALUES(o.id,o.buyer_org_id,o.seller_org_id,CASE WHEN value>=3000000 OR n>=2 THEN 'full' ELSE 'relay' END)
 ON CONFLICT(order_id) DO NOTHING; RETURN NEW;
END $$;
CREATE TRIGGER z_contact AFTER UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.refresh_contact_grant();

CREATE FUNCTION ref.is_schema_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT current_user=pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='core'
$$;
CREATE FUNCTION ref.clock_at() RETURNS timestamptz LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN ref.is_schema_owner() AND ref.ctx('test_time') IS NOT NULL THEN ref.ctx('test_time')::timestamptz ELSE now() END
$$;
CREATE FUNCTION mkt.quantile(p bigint[],p_bps integer) RETURNS numeric LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE x numeric; i integer; f numeric;
BEGIN
 IF cardinality(p)=0 THEN RETURN NULL; END IF;
 x:=1+(cardinality(p)-1)*p_bps::numeric/10000; i:=floor(x); f:=x-i;
 RETURN p[i]+f*(p[least(i+1,cardinality(p))]::numeric-p[i]); END $$;
CREATE VIEW mkt.v_price_samples AS
SELECT h.id order_id,h.buyer_org_id,h.seller_org_id,h.product_id,h.grade_code,h.province_code,h.unit_price_vnd,h.accepted_at
FROM core.historical_trades h WHERE NOT h.excluded_from_ref_price
UNION ALL
SELECT o.id,o.buyer_org_id,o.seller_org_id,o.product_id,l.grade_code,org.province_code,
 ref.div_round(sum(al.value_vnd)::numeric*1000,sum(al.payable_qty)),max(av.recorded_at)
FROM core.orders o JOIN core.order_versions ov ON ov.order_id=o.id AND ov.version_no=o.effective_version_no
JOIN core.deliveries d ON d.order_id=o.id JOIN core.acceptance_versions av ON av.delivery_id=d.id
JOIN core.acceptance_lines al ON al.acceptance_id=av.id JOIN core.lots l ON l.id=al.lot_id
JOIN core.organizations org ON org.id=o.seller_org_id
WHERE al.status='closed' AND al.kind='accepted' AND NOT o.flag_abnormal_price AND NOT o.flag_suspected_collusion
 AND NOT o.excluded_from_ref_price AND o.framework_id IS NULL AND ov.delivery_mode IN ('at_farm','at_collection_point')
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions newer WHERE newer.delivery_id=av.delivery_id AND newer.version_no>av.version_no)
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines newer WHERE newer.replaces_line_id=al.id)
GROUP BY o.id,l.grade_code,org.province_code HAVING sum(al.payable_qty)>0;
CREATE MATERIALIZED VIEW mkt.reference_prices AS
WITH expanded AS (
 SELECT s.*,s.province_code scope FROM mkt.v_price_samples s WHERE accepted_at BETWEEN ref.clock_at()-interval '30 days' AND ref.clock_at()
 UNION ALL SELECT s.*,'DBSCL' FROM mkt.v_price_samples s WHERE accepted_at BETWEEN ref.clock_at()-interval '30 days' AND ref.clock_at()
), bands AS (
 SELECT product_id,grade_code,scope,array_agg(unit_price_vnd ORDER BY unit_price_vnd) prices,count(*) n FROM expanded GROUP BY product_id,grade_code,scope
), kept AS (
 SELECT e.* FROM expanded e JOIN bands b USING(product_id,grade_code,scope)
 WHERE b.n<5 OR e.unit_price_vnd BETWEEN mkt.quantile(b.prices,2500)-1.5*(mkt.quantile(b.prices,7500)-mkt.quantile(b.prices,2500))
 AND mkt.quantile(b.prices,7500)+1.5*(mkt.quantile(b.prices,7500)-mkt.quantile(b.prices,2500))
)
SELECT product_id,grade_code,scope,round(mkt.quantile(array_agg(unit_price_vnd ORDER BY unit_price_vnd),5000))::bigint unit_price_vnd,
 count(*)::integer order_count,count(DISTINCT (buyer_org_id,seller_org_id))::integer pair_count,ref.clock_at() as_of
FROM kept GROUP BY product_id,grade_code,scope HAVING count(*)>=3 AND count(DISTINCT (buyer_org_id,seller_org_id))>=2;
CREATE UNIQUE INDEX uq_reference_price ON mkt.reference_prices(product_id,grade_code,scope);

-- Mọi chuyển trạng thái đều phát sự kiện và outbox cùng transaction.
ALTER TABLE evt.state_history ADD COLUMN device_id text;
ALTER TABLE evt.state_history ADD COLUMN command text;
CREATE FUNCTION evt.state_to_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM evt.emit(NEW.entity,NEW.entity_id,NEW.entity||'.'||NEW.to_status,jsonb_build_object('from',NEW.from_status,'to',NEW.to_status,'history_id',NEW.id));
 RETURN NEW; END $$;
CREATE TRIGGER z_emit AFTER INSERT ON evt.state_history FOR EACH ROW EXECUTE FUNCTION evt.state_to_event();
-- Bỏ cổng seed ở runtime: chỉ owner schema được dùng allow_any_initial.
CREATE OR REPLACE FUNCTION evt.guard_status() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ent text:=TG_ARGV[0]; actor text:=ref.ctx_actor(); reason text:=ref.ctx('reason'); tr ref.state_transitions%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' THEN
 IF NOT EXISTS(SELECT 1 FROM ref.statuses WHERE entity=ent AND code=NEW.status AND (is_initial OR (ref.is_schema_owner() AND ref.ctx('allow_any_initial')='on'))) THEN
 RAISE EXCEPTION 'Trạng thái đầu sai: % %',ent,NEW.status USING HINT='ck_status_initial'; END IF;
 ELSE
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 SELECT * INTO tr FROM ref.state_transitions WHERE entity=ent AND from_status=OLD.status AND to_status=NEW.status;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chuyển trạng thái sai: % % -> %',ent,OLD.status,NEW.status USING HINT='ck_status_transition'; END IF;
 IF tr.actor_kinds IS NOT NULL AND NOT(actor=ANY(tr.actor_kinds)) THEN RAISE EXCEPTION 'Vai không được chuyển' USING HINT='ck_status_actor'; END IF;
 IF tr.requires_reason AND reason IS NULL THEN RAISE EXCEPTION 'Cần lý do chuyển' USING HINT='ck_status_reason'; END IF;
 NEW.status_changed_at:=now();
 END IF;
 INSERT INTO evt.state_history(entity,entity_id,from_status,to_status,actor_user_id,actor_org_id,actor_kind,reason,request_id,device_id,command)
 VALUES(ent,NEW.id,CASE WHEN TG_OP='UPDATE' THEN OLD.status END,NEW.status,ref.ctx_user(),ref.ctx_org(),actor,reason,ref.ctx('request_id'),ref.ctx('device_id'),ref.ctx('command'));
 RETURN NEW; END $$;

CREATE FUNCTION evt.claim_idempotency(p_scope text,p_key text,p_hash bytea) RETURNS evt.idempotency_keys LANGUAGE plpgsql AS $$
DECLARE r evt.idempotency_keys%ROWTYPE;
BEGIN
 INSERT INTO evt.idempotency_keys(scope,key,request_hash,expires_at) VALUES(p_scope,p_key,p_hash,'infinity') ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM evt.idempotency_keys WHERE scope=p_scope AND key=p_key FOR UPDATE;
 IF r.request_hash<>p_hash THEN RAISE EXCEPTION 'Khóa đã dùng với thân khác' USING HINT='IDEMPOTENCY_CONFLICT'; END IF;
 RETURN r; END $$;
CREATE FUNCTION core.apply_bank_event(p_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; b core.bank_instructions%ROWTYPE; w evt.inbound_webhooks%ROWTYPE; r text;
BEGIN
 IF ref.ctx_actor()<>'bank' THEN RAISE EXCEPTION 'Chỉ worker ngân hàng áp sự kiện' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO e FROM core.bank_events WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có sự kiện'; END IF;
 IF e.applied_at IS NOT NULL THEN RETURN 'duplicate_ignored'; END IF;
 SELECT * INTO w FROM evt.inbound_webhooks WHERE id=e.webhook_id;
 IF w.signature_valid IS DISTINCT FROM true OR w.provider<>e.provider OR w.provider_event_id<>e.provider_event_id THEN RAISE EXCEPTION 'Webhook không xác thực' USING HINT='ck_webhook_signature'; END IF;
 IF e.kind='deposit_received' THEN RETURN ledger.apply_deposit_receipt(p_id); END IF;
 SELECT * INTO b FROM core.bank_instructions WHERE code=e.instruction_code FOR UPDATE;
 IF NOT FOUND THEN r:='unmatched_instruction';
 ELSIF b.status IN ('reconciled','failed') THEN r:='late_after_reconciled';
 ELSIF e.amount_vnd IS DISTINCT FROM b.amount_vnd THEN RAISE EXCEPTION 'Số tiền ngân hàng lệch lệnh' USING HINT='ck_bank_amount';
 ELSIF e.kind='instruction_processing' AND b.status='sent' THEN UPDATE core.bank_instructions SET status='processing' WHERE id=b.id; r:='applied';
 ELSIF e.kind='instruction_succeeded' AND b.status IN ('sent','processing') THEN UPDATE core.bank_instructions SET status='succeeded',bank_txn_ref=e.bank_txn_ref WHERE id=b.id; r:='applied';
 ELSIF e.kind='instruction_failed' AND b.status IN ('sent','processing') THEN UPDATE core.bank_instructions SET status='failed' WHERE id=b.id; r:='applied';
 ELSE r:='out_of_order_requeried'; END IF;
 UPDATE core.bank_events SET applied_at=now(),apply_result=r WHERE id=p_id; RETURN r;
END $$;
