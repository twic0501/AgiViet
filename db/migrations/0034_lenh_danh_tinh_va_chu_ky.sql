-- D-01: các helper không cấp EXECUTE cho runtime; chỉ entry point được liệt kê cuối file.
CREATE OR REPLACE FUNCTION cmd.enter_actor() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE p cmd.login_principals%ROWTYPE;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=session_user AND active;
 IF p.user_id IS NULL OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=p.user_id AND org_id=p.org_id AND status='active')
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND status='active')
 OR (p.actor_kind IN ('ops','system') AND (NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND is_platform)
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p.user_id AND active)))
 OR (p.actor_kind='system' AND NOT (current_setting('role',true)='agiviet_orchestrator' OR pg_has_role(session_user,'agiviet_orchestrator','MEMBER') AND session_user<>current_user)) THEN
 RAISE EXCEPTION 'Login chưa được ánh xạ danh tính/quyền hoạt động' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true); PERFORM set_config('app.actor_kind',p.actor_kind,true);
 -- Không cho request dùng cờ import để bỏ máy trạng thái.
 PERFORM set_config('app.allow_any_initial','',true);
END $$;
CREATE FUNCTION cmd.require_staff(p_roles text[]) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,ref,ops AS $$ BEGIN
 PERFORM cmd.enter_actor();
 IF ref.ctx_actor()<>'ops' OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=ref.ctx_user() AND active AND role_code=ANY(p_roles)) THEN
 RAISE EXCEPTION 'Thiếu vai vận hành' USING HINT='KHONG_CO_QUYEN'; END IF;
END $$;
CREATE FUNCTION cmd.require_system() RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,cmd,ref AS $$ BEGIN
 PERFORM cmd.enter_actor();
 IF ref.ctx_actor()<>'system' THEN RAISE EXCEPTION 'Chỉ tiến trình điều phối đã ánh xạ' USING HINT='KHONG_CO_QUYEN'; END IF;
END $$;
CREATE FUNCTION cmd.require_org(p_org uuid,p_roles text[]) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref AS $$ BEGIN
 IF p_org IS DISTINCT FROM ref.ctx_org() OR ref.ctx_actor() NOT IN ('buyer','seller') OR NOT EXISTS(
 SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id
 WHERE m.org_id=p_org AND m.user_id=ref.ctx_user() AND m.status='active' AND r.role_code=ANY(p_roles)) THEN
 RAISE EXCEPTION 'Sai tổ chức hoặc thiếu vai nghiệp vụ' USING HINT='KHONG_CO_QUYEN'; END IF;
END $$;
CREATE FUNCTION cmd.propose_owner_verification(p_org uuid,p_user uuid,p_evidence uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['field','risk','supervisor','support']);
 PERFORM 1 FROM core.organizations WHERE id=p_org AND status='pending' FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE org_id=p_org AND user_id=p_user AND status='active')
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type='evidence' AND entity='organization' AND entity_id=p_org)
 OR EXISTS(SELECT 1 FROM core.membership_role_grants r JOIN core.memberships m ON m.id=r.membership_id WHERE m.org_id=p_org AND r.role_code='owner') THEN
 RAISE EXCEPTION 'Xác minh cần tổ chức mới, thành viên và chứng cứ đúng tổ chức' USING HINT='ck_owner_bootstrap'; END IF;
 INSERT INTO ops.owner_verifications(org_id,user_id,proposed_by,evidence_document_id,reason)
 VALUES(p_org,p_user,ref.ctx_user(),p_evidence,p_reason) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.approve_owner_verification(p_verification uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE v ops.owner_verifications%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 SELECT * INTO v FROM ops.owner_verifications WHERE id=p_verification;
 PERFORM 1 FROM core.organizations WHERE id=v.org_id AND status='pending' FOR UPDATE;
 IF NOT FOUND OR v.proposed_by=ref.ctx_user() OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=v.proposed_by AND active) THEN
 RAISE EXCEPTION 'Người duyệt phải khác người xác minh, tổ chức còn pending' USING HINT='ck_owner_bootstrap'; END IF;
 INSERT INTO ops.decisions(kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES('owner_bootstrap','organization',v.org_id,v.proposed_by,ref.ctx_user(),v.reason,v.evidence_document_id,jsonb_build_object('verification_id',v.id,'user_id',v.user_id)) RETURNING id INTO result;
 UPDATE core.organizations SET status='active',verification_level=2 WHERE id=v.org_id;
 RETURN result;
END $$;
CREATE FUNCTION cmd.bootstrap_owner(p_org uuid,p_user uuid,p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 IF p_decision IS NULL THEN RAISE EXCEPTION 'Thiếu quyết định chủ đầu tiên' USING HINT='ck_owner_bootstrap'; END IF;
 PERFORM 1 FROM core.organizations WHERE id=p_org FOR UPDATE;
 INSERT INTO core.membership_role_grants(membership_id,role_code,granted_by,bootstrap_decision_id)
 SELECT id,'owner',ref.ctx_user(),p_decision FROM core.memberships WHERE org_id=p_org AND user_id=p_user AND status='active' RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Không có thành viên' USING HINT='ck_owner_bootstrap'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.grant_member_role(p_membership uuid,p_role text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE org uuid; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT org_id INTO org FROM core.memberships WHERE id=p_membership AND status='active';
 PERFORM cmd.require_org(org,ARRAY['owner']);
 PERFORM 1 FROM core.organizations WHERE id=org FOR UPDATE;
 INSERT INTO core.membership_role_grants(membership_id,role_code,granted_by) VALUES(p_membership,p_role,ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.revoke_member_role(p_grant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT m.org_id INTO org FROM core.membership_role_grants r JOIN core.memberships m ON m.id=r.membership_id WHERE r.id=p_grant;
 PERFORM cmd.require_org(org,ARRAY['owner']);
 UPDATE core.membership_role_grants SET revoked_at=ref.clock_at(),revoked_by=ref.ctx_user() WHERE id=p_grant AND revoked_at IS NULL;
END $$;

ALTER TABLE evt.otp_challenges DROP CONSTRAINT otp_challenges_purpose_check;
ALTER TABLE evt.otp_challenges ADD CHECK(purpose IN ('contract_sign','amendment_sign','money_received','invitation_accept','record_sign','login','login_new_device'));
CREATE SCHEMA app_auth;
REVOKE ALL ON SCHEMA app_auth FROM PUBLIC;
CREATE TABLE app_auth.sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES core.users, org_id uuid NOT NULL REFERENCES core.organizations,
 device_id text NOT NULL CHECK(length(btrim(device_id))>0), token_hash bytea NOT NULL UNIQUE CHECK(octet_length(token_hash)=32),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '30 days'), CHECK(revoked_at IS NULL OR revoked_at>=created_at)
);
ALTER TABLE app_auth.sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE app_auth.record_receipts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES core.users,
 document_id uuid NOT NULL REFERENCES core.documents, device_id text NOT NULL,
 method text NOT NULL CHECK(method IN ('pin','biometric')), binding_sha256 bytea NOT NULL CHECK(octet_length(binding_sha256)=32),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', used_at timestamptz,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '5 minutes')
);
ALTER TABLE app_auth.record_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.signatures ADD COLUMN record_receipt_id uuid UNIQUE REFERENCES app_auth.record_receipts;
CREATE FUNCTION cmd.record_login_session(p_user uuid,p_org uuid,p_device text,p_hash bytea,p_expires timestamptz,p_otp text,p_purpose text DEFAULT 'login') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app_auth,core,evt AS $$
DECLARE result uuid;
BEGIN
 IF p_purpose NOT IN ('login','login_new_device') OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p_user AND disabled_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=p_user AND org_id=p_org AND status='active') THEN
 RAISE EXCEPTION 'Không có quyền đăng nhập' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM evt.consume_otp(p_otp,p_user,p_purpose,jsonb_build_object('org_id',p_org,'device_id',p_device,'token_sha256',encode(p_hash,'hex')));
 INSERT INTO app_auth.sessions(user_id,org_id,device_id,token_hash,expires_at) VALUES(p_user,p_org,p_device,p_hash,p_expires) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.lookup_session(p_hash bytea) RETURNS TABLE(id uuid,user_id uuid,org_id uuid,device_id text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,app_auth,core AS $$
 SELECT s.id,s.user_id,s.org_id,s.device_id FROM app_auth.sessions s JOIN core.users u ON u.id=s.user_id
 JOIN core.memberships m ON m.user_id=s.user_id AND m.org_id=s.org_id
 WHERE s.token_hash=p_hash AND s.revoked_at IS NULL AND s.expires_at>now() AND u.disabled_at IS NULL AND m.status='active'
$$;
CREATE FUNCTION cmd.revoke_session(p_hash bytea) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,app_auth AS $$
 UPDATE app_auth.sessions SET revoked_at=now() WHERE token_hash=p_hash AND revoked_at IS NULL
$$;
CREATE FUNCTION cmd.record_reauthentication(p_user uuid,p_doc uuid,p_device text,p_method text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app_auth,core,evt AS $$
DECLARE result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_doc AND doc_type IN ('acceptance_record','loading_record','receipt_record','return_record','cancellation_record')) THEN
 RAISE EXCEPTION 'Chỉ tái xác thực biên bản' USING HINT='ck_record_receipt'; END IF;
 INSERT INTO app_auth.record_receipts(user_id,document_id,device_id,method,binding_sha256)
 VALUES(p_user,p_doc,p_device,p_method,evt.otp_hash('record_sign',p_user,core.signature_binding(p_doc))) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION core.consume_signature_otp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.method='otp' THEN
 PERFORM evt.consume_otp(NEW.otp_challenge_id,NEW.signer_user_id,
 CASE (SELECT doc_type FROM core.documents WHERE id=NEW.document_id) WHEN 'annex' THEN 'amendment_sign'
 WHEN 'contract' THEN 'contract_sign' WHEN 'framework_contract' THEN 'contract_sign' WHEN 'evidence' THEN 'contract_sign' ELSE CASE WHEN (SELECT purpose FROM evt.otp_challenges WHERE id=NEW.otp_challenge_id)='record_sign' THEN 'record_sign' ELSE 'contract_sign' END END,
 core.signature_binding(NEW.document_id)); END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION core.consume_record_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r app_auth.record_receipts%ROWTYPE;
BEGIN
 IF NEW.record_receipt_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO r FROM app_auth.record_receipts WHERE id=NEW.record_receipt_id FOR UPDATE;
 IF NEW.method<>'qr_confirm' OR r.user_id IS DISTINCT FROM NEW.signer_user_id OR r.document_id IS DISTINCT FROM NEW.document_id
 OR r.device_id IS DISTINCT FROM NEW.device_id OR r.expires_at<=now() OR r.used_at IS NOT NULL
 OR r.binding_sha256 IS DISTINCT FROM evt.otp_hash('record_sign',NEW.signer_user_id,core.signature_binding(NEW.document_id)) THEN
 RAISE EXCEPTION 'Receipt tái xác thực sai người/biên bản/thiết bị, hết hạn hoặc đã dùng' USING HINT='ck_record_receipt'; END IF;
 UPDATE app_auth.record_receipts SET used_at=now() WHERE id=r.id;
 RETURN NEW;
END $$;
CREATE TRIGGER z_record_receipt BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.consume_record_receipt();
DROP FUNCTION cmd.sign_document(uuid,text,text,text);
CREATE FUNCTION cmd.sign_document(p_doc uuid,p_party text,p_otp text,p_device text,p_statements text[] DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor();
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_doc AND doc_type IN ('contract','annex','framework_contract','evidence')) THEN
 RAISE EXCEPTION 'Dùng sign_record cho biên bản' USING HINT='ck_record_receipt'; END IF;
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id,statements)
 SELECT id,p_party,ref.ctx_user(),ref.ctx_org(),'otp',content_sha256,p_otp,p_device,p_statements FROM core.documents WHERE id=p_doc RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.sign_record(p_doc uuid,p_party text,p_method text,p_device text,p_pin_receipt uuid DEFAULT NULL,p_otp text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE result uuid; org uuid; o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT o1.* INTO o FROM core.orders o1 JOIN core.documents d ON d.order_id=o1.id WHERE d.id=p_doc AND d.doc_type IN ('acceptance_record','loading_record','receipt_record','return_record','cancellation_record');
 org:=CASE p_party WHEN 'buyer' THEN o.buyer_org_id WHEN 'seller' THEN o.seller_org_id END;
 PERFORM cmd.require_org(org,CASE WHEN p_party='buyer' THEN ARRAY['owner','warehouse','site_receiver'] ELSE ARRAY['owner','coop_board','collection_staff'] END);
 IF (p_method='otp' AND NOT EXISTS(SELECT 1 FROM evt.otp_challenges WHERE id=p_otp AND purpose='record_sign')) OR p_method NOT IN ('otp','qr_confirm') OR (p_method='qr_confirm' AND p_pin_receipt IS NULL) OR (p_method='otp' AND p_pin_receipt IS NOT NULL) THEN
 RAISE EXCEPTION 'Biên bản cần receipt PIN/sinh trắc hoặc OTP' USING HINT='ck_record_receipt'; END IF;
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id,record_receipt_id)
 SELECT id,p_party,ref.ctx_user(),ref.ctx_org(),p_method,content_sha256,p_otp,p_device,p_pin_receipt FROM core.documents WHERE id=p_doc RETURNING id INTO result;
 RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.propose_owner_verification(uuid,uuid,uuid,text),cmd.approve_owner_verification(uuid),cmd.bootstrap_owner(uuid,uuid,uuid),
 cmd.grant_member_role(uuid,text),cmd.revoke_member_role(uuid),cmd.sign_document(uuid,text,text,text,text[]),cmd.sign_record(uuid,text,text,text,uuid,text) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.record_login_session(uuid,uuid,text,bytea,timestamptz,text,text),cmd.lookup_session(bytea),cmd.revoke_session(bytea),cmd.record_reauthentication(uuid,uuid,text,text) TO agiviet_auth_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA app_auth FROM PUBLIC,agiviet_app,agiviet_auth_worker,agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd,app_auth FROM PUBLIC;
REVOKE ALL ON FUNCTION core.consume_record_receipt() FROM PUBLIC;
