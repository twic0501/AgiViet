-- D-15: receipt xác minh chỉ từ auth worker, binding do DB dựng lại, tiêu thụ nguyên tử.
CREATE TABLE evt.otp_challenges (
 id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES core.users,
 purpose text NOT NULL CHECK(purpose IN ('contract_sign','amendment_sign','money_received')),
 binding_sha256 bytea NOT NULL CHECK(octet_length(binding_sha256)=32),
 code_mac bytea NOT NULL CHECK(octet_length(code_mac)=32),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), verified_at timestamptz, used_at timestamptz,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '5 minutes'),
 CHECK(verified_at IS NULL OR verified_at BETWEEN created_at AND expires_at), CHECK(used_at IS NULL OR verified_at IS NOT NULL)
);
ALTER TABLE evt.otp_challenges ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE evt.otp_challenges IS 'Auth worker kiểm HMAC OTP/SMS và ghi receipt; app không được tạo hoặc xác minh. Binding SHA256 JSON canonical scalars giống security/lib/otp.mjs.';
CREATE FUNCTION evt.otp_hash(p_purpose text,p_user uuid,p_binding jsonb) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
 SELECT public.digest('{'||string_agg(to_jsonb(key)::text||':'||value::text,',' ORDER BY key COLLATE "C")||'}','sha256')
 FROM jsonb_each(p_binding||jsonb_build_object('purpose',p_purpose,'user',p_user::text))
$$;
CREATE FUNCTION core.signature_binding(p_doc uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('order_code',coalesce(o.code,d.code),'contract_version_id',d.id::text,
 'document_sha256',encode(d.content_sha256,'hex'),'amount_vnd',coalesce(v.contract_value_vnd,0))
 FROM core.documents d LEFT JOIN core.orders o ON o.id=d.order_id LEFT JOIN core.order_versions v ON v.document_id=d.id WHERE d.id=p_doc
$$;
CREATE FUNCTION core.payment_binding(p_payment uuid,p_amount bigint) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('order_code',coalesce(o.code,f.code),'payment_id',p.id::text,'amount_vnd',p_amount,
 'contract_version_id',o.effective_version_no) FROM core.direct_payments p LEFT JOIN core.orders o ON o.id=p.order_id
 LEFT JOIN core.framework_contracts f ON f.id=p.framework_id WHERE p.id=p_payment
$$;
CREATE FUNCTION evt.consume_otp(p_id text,p_user uuid,p_purpose text,p_binding jsonb) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c evt.otp_challenges%ROWTYPE;
BEGIN
 SELECT * INTO c FROM evt.otp_challenges WHERE id=p_id FOR UPDATE;
 IF c.id IS NULL OR c.user_id IS DISTINCT FROM p_user OR c.purpose IS DISTINCT FROM p_purpose
 OR c.binding_sha256 IS DISTINCT FROM evt.otp_hash(p_purpose,p_user,p_binding) OR p_binding IS NULL
 OR c.verified_at IS NULL OR c.expires_at<now() OR c.attempts>=5 OR c.used_at IS NOT NULL THEN
 RAISE EXCEPTION 'OTP chưa xác minh, hết hạn, đã dùng hoặc sai binding tiền/phiên bản' USING HINT='ck_otp_verified_binding'; END IF;
 UPDATE evt.otp_challenges SET used_at=now() WHERE id=p_id;
END $$;
ALTER TABLE core.signatures ADD CONSTRAINT fk_signature_otp FOREIGN KEY(otp_challenge_id) REFERENCES evt.otp_challenges(id) NOT VALID;
ALTER TABLE core.direct_payment_confirmations ADD COLUMN otp_challenge_id text REFERENCES evt.otp_challenges(id);
ALTER TABLE core.direct_payment_confirmations ADD COLUMN method text NOT NULL DEFAULT 'bank_transfer' CHECK(method IN ('bank_transfer','cash'));
ALTER TABLE core.direct_payment_confirmations ADD COLUMN receipt_document_id uuid REFERENCES core.documents(id);
-- NOT VALID để giữ chứng từ đã COMMIT trước migration, vẫn bắt buộc trên mọi INSERT mới.
ALTER TABLE core.direct_payment_confirmations ADD CONSTRAINT ck_confirmation_evidence CHECK(amount_vnd=0 OR
 (method='bank_transfer' AND nullif(btrim(bank_txn_ref),'') IS NOT NULL) OR (method='cash' AND receipt_document_id IS NOT NULL)) NOT VALID;
CREATE FUNCTION core.consume_signature_otp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.method='otp' THEN
 PERFORM evt.consume_otp(NEW.otp_challenge_id,NEW.signer_user_id,
  CASE WHEN (SELECT doc_type FROM core.documents WHERE id=NEW.document_id)='annex' THEN 'amendment_sign' ELSE 'contract_sign' END,
  core.signature_binding(NEW.document_id)); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_otp BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.consume_signature_otp();
CREATE FUNCTION core.consume_payment_otp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.amount_vnd>0 AND NEW.ops_decision_by IS NULL THEN
 PERFORM evt.consume_otp(NEW.otp_challenge_id,NEW.confirmed_by,'money_received',core.payment_binding(NEW.direct_payment_id,NEW.amount_vnd)); END IF;
 RETURN NEW; END $$;
CREATE TRIGGER z_otp BEFORE INSERT ON core.direct_payment_confirmations FOR EACH ROW EXECUTE FUNCTION core.consume_payment_otp();

CREATE FUNCTION cmd.confirm_direct_payment(p_payment uuid,p_amount bigint,p_result text,p_bank_ref text,p_otp text,p_method text DEFAULT 'bank_transfer',p_receipt uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref,evt,cmd,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor();
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id,method,receipt_document_id)
 VALUES(p_payment,p_result,p_amount,p_bank_ref,ref.ctx_user(),p_otp,p_method,p_receipt) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.sign_document(p_doc uuid,p_party text,p_otp text,p_device text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref,evt,cmd,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor();
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
 SELECT id,p_party,ref.ctx_user(),ref.ctx_org(),'otp',content_sha256,p_otp,p_device FROM core.documents WHERE id=p_doc RETURNING id INTO result;
 RETURN result;
END $$;
-- Trusted auth service already verifies HMAC with its secret; DB stores attempts and verified receipt.
CREATE FUNCTION cmd.record_otp(p_id text,p_user uuid,p_purpose text,p_binding jsonb,p_mac bytea) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,evt,public AS $$ BEGIN
 INSERT INTO evt.otp_challenges(id,user_id,purpose,binding_sha256,code_mac,expires_at)
 VALUES(p_id,p_user,p_purpose,evt.otp_hash(p_purpose,p_user,p_binding),p_mac,now()+interval '5 minutes'); END $$;
CREATE FUNCTION cmd.otp_verification(p_id text,p_valid boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,evt AS $$
DECLARE c evt.otp_challenges%ROWTYPE;
BEGIN
 SELECT * INTO c FROM evt.otp_challenges WHERE id=p_id FOR UPDATE;
 IF c.id IS NULL OR c.used_at IS NOT NULL OR c.verified_at IS NOT NULL OR c.expires_at<now() OR c.attempts>=5 THEN RETURN false; END IF;
 UPDATE evt.otp_challenges SET attempts=attempts+CASE WHEN p_valid THEN 0 ELSE 1 END,verified_at=CASE WHEN p_valid THEN now() END WHERE id=p_id;
 RETURN p_valid;
END $$;
GRANT USAGE ON SCHEMA cmd TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.sign_document(uuid,text,text,text),cmd.confirm_direct_payment(uuid,bigint,text,text,text,text,uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.record_otp(text,uuid,text,jsonb,bytea),cmd.otp_verification(text,boolean) TO agiviet_auth_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA evt,core,ledger,ops,pii FROM agiviet_auth_worker,agiviet_bank_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
-- Vai tiền chỉ hiệu lực sau thời gian chờ; các hàm kiểm quyền hiện có đọc qua view này.
ALTER TABLE core.membership_roles RENAME TO membership_role_grants;
CREATE VIEW core.membership_roles AS SELECT membership_id,role_code,granted_by,granted_at,effective_at FROM core.membership_role_grants WHERE effective_at<=now();
-- Simple view is automatically updatable; grant trigger remains on backing table.
