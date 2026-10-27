-- D-19: chuỗi hash nối lịch sử; WORM cần hạ tầng xuất ngoài DB và giữ checkpoint độc lập.
CREATE TABLE evt.audit_chain (
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, audit_id bigint NOT NULL UNIQUE REFERENCES evt.audit_log,
 previous_sha256 bytea NOT NULL, row_json text NOT NULL, row_sha256 bytea NOT NULL CHECK(octet_length(row_sha256)=32)
);
COMMENT ON TABLE evt.audit_chain IS 'Chuỗi SHA256 tuần tự của audit_log. Owner vẫn là trust root; xuất checkpoint sang WORM bên ngoài trước khi nhận tiền thật.';
CREATE FUNCTION evt.audit_payload(p evt.audit_log) RETURNS text LANGUAGE sql STABLE SET timezone='UTC' AS $$ SELECT to_jsonb(p)::text $$;
CREATE FUNCTION evt.chain_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev bytea;
BEGIN
 PERFORM pg_advisory_xact_lock(72841019);
 SELECT row_sha256 INTO prev FROM evt.audit_chain ORDER BY seq DESC LIMIT 1;
 prev:=coalesce(prev,decode(repeat('00',32),'hex'));
 INSERT INTO evt.audit_chain(audit_id,previous_sha256,row_json,row_sha256) VALUES(NEW.id,prev,evt.audit_payload(NEW),public.digest(prev||convert_to(evt.audit_payload(NEW),'UTF8'),'sha256'));
 RETURN NEW;
END $$;
-- Backfill append-only side table; do not modify audit history.
DO $$ DECLARE r evt.audit_log%ROWTYPE; prev bytea:=decode(repeat('00',32),'hex'); h bytea; BEGIN
 FOR r IN SELECT * FROM evt.audit_log ORDER BY id LOOP
 h:=public.digest(prev||convert_to(evt.audit_payload(r),'UTF8'),'sha256');
 INSERT INTO evt.audit_chain(audit_id,previous_sha256,row_json,row_sha256) VALUES(r.id,prev,evt.audit_payload(r),h); prev:=h;
 END LOOP;
END $$;
CREATE TRIGGER z_chain AFTER INSERT ON evt.audit_log FOR EACH ROW EXECUTE FUNCTION evt.chain_audit();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON evt.audit_chain FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE evt.audit_chain ENABLE ROW LEVEL SECURITY;
-- RLS trên các bảng mới, vai runtime không có quyền tạo receipt/phê duyệt/audit.
ALTER TABLE core.membership_role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.bank_return_tasks ENABLE ROW LEVEL SECURITY;
-- Bổ sung mô tả những trường mới, không ghi đè chú thích cũ.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT n.nspname,c.relname,a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('core','ledger','pii','ops','evt','mkt','ref') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND col_description(c.oid,a.attnum) IS NULL LOOP
 EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,'Kiểm soát bổ sung 0024–0027: '||r.attname||'. Xem docs/database/04-bao-mat-va-quyen.md.');
 END LOOP;
END $$;

INSERT INTO ref.ledger_txn_kinds VALUES('imported_framework_deposit','Số dư cọc khung nhập khẩu có nhãn','deposit');
CREATE OR REPLACE FUNCTION ledger.open_framework_exposure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.unpaid_delivered_vnd>0 THEN
 PERFORM ledger.post('settlement_accrual',NULL,'fw-opening:'||NEW.framework_id,'Dư nợ đầu kỳ nhập khẩu: '||NEW.source_key,
 jsonb_build_array(jsonb_build_object('type','seller_receivable','framework',NEW.framework_id,'amount',NEW.unpaid_delivered_vnd),jsonb_build_object('type','buyer_payable','framework',NEW.framework_id,'amount',-NEW.unpaid_delivered_vnd)),now(),NULL,NULL,jsonb_build_object('framework',NEW.framework_id));
 END IF; RETURN NEW; END $$;
