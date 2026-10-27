-- Cổng NOINHERIT chỉ chọn vai; không lấy current_user bên trong SECURITY DEFINER
-- (đó là owner). GUC hệ thống role giữ vai gọi và PostgreSQL kiểm quyền SET ROLE.
CREATE TABLE cmd.trusted_gateways (
 login_name name PRIMARY KEY, enabled boolean NOT NULL DEFAULT true,
 configured_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO cmd.trusted_gateways(login_name) VALUES ('agv_backend_gateway');
ALTER TABLE cmd.trusted_gateways ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cmd.trusted_gateways FROM PUBLIC,agiviet_app,agiviet_orchestrator,
 agiviet_auth_worker,agiviet_bank_worker,agiviet_worker,agiviet_readonly;
COMMENT ON TABLE cmd.trusted_gateways IS 'Chỉ owner cấu hình login cổng. Không suy ra độ tin cậy từ membership, tiền tố tên, GUC app.* hoặc login_principals.';
COMMENT ON COLUMN cmd.trusted_gateways.login_name IS 'Login kết nối do owner đăng ký, không phải vai đã SET ROLE.';
COMMENT ON COLUMN cmd.trusted_gateways.enabled IS 'Cho phép nhận vai đã SET ROLE làm login hiệu lực khi cổng đáp ứng thuộc tính bắt buộc.';
COMMENT ON COLUMN cmd.trusted_gateways.configured_at IS 'Giờ thật owner tạo cấu hình.';

CREATE FUNCTION cmd.effective_login() RETURNS name LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,cmd AS $$
DECLARE chosen text:=nullif(current_setting('role',true),'none');
BEGIN
 IF EXISTS(SELECT 1 FROM cmd.trusted_gateways WHERE login_name=session_user AND enabled) THEN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolcanlogin
   AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb) THEN
   RAISE EXCEPTION 'Cổng phải là LOGIN NOINHERIT không đặc quyền' USING HINT='KHONG_CO_QUYEN';
  END IF;
  -- Không xét membership của cổng: MEMBER là bắc cầu, kể cả khi NOINHERIT.
  IF chosen IS NULL OR chosen=session_user::text THEN RETURN NULL; END IF;
  RETURN chosen::name;
 END IF;
 -- Login thường không thể đổi sang principal khác kể cả được cấp membership nhầm.
 IF chosen IS NOT NULL AND chosen<>session_user::text
  AND EXISTS(SELECT 1 FROM cmd.login_principals WHERE login_name=chosen::name) THEN
  RAISE EXCEPTION 'Login thường không được chuyển danh tính' USING HINT='KHONG_CO_QUYEN';
 END IF;
 RETURN session_user;
END $$;
REVOKE ALL ON FUNCTION cmd.effective_login() FROM PUBLIC;

-- Helper nội bộ: giữ đường SET ROLE worker của owner/fixture cũ; cổng phải chọn
-- đúng adapter, không hưởng quyền MEMBER bắc cầu từ session_user của cổng.
CREATE FUNCTION cmd.has_runtime_role(p_role name) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,cmd AS $$
 SELECT coalesce(cmd.effective_login() IS NOT NULL AND
  ((pg_has_role(cmd.effective_login(),p_role,'MEMBER') AND
    (cmd.effective_login()<>current_user OR cmd.effective_login()=p_role))
   OR current_setting('role',true)=p_role::text),false)
$$;
REVOKE ALL ON FUNCTION cmd.has_runtime_role(name) FROM PUBLIC;

CREATE OR REPLACE FUNCTION ref.ctx_user() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN cmd.effective_login() IS NULL THEN NULL WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(cmd.effective_login(),'agiviet_app','MEMBER') OR pg_has_role(cmd.effective_login(),'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN (SELECT user_id FROM cmd.login_principals WHERE login_name=cmd.effective_login() AND active)
 ELSE nullif(current_setting('app.user_id',true),'')::uuid END
$$;

CREATE OR REPLACE FUNCTION ref.ctx_org() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN cmd.effective_login() IS NULL THEN NULL WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(cmd.effective_login(),'agiviet_app','MEMBER') OR pg_has_role(cmd.effective_login(),'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN (SELECT org_id FROM cmd.login_principals WHERE login_name=cmd.effective_login() AND active)
 ELSE nullif(current_setting('app.org_id',true),'')::uuid END
$$;

CREATE OR REPLACE FUNCTION ref.ctx_actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN cmd.effective_login() IS NULL THEN NULL WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(cmd.effective_login(),'agiviet_app','MEMBER') OR pg_has_role(cmd.effective_login(),'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN coalesce((SELECT actor_kind FROM cmd.login_principals WHERE login_name=cmd.effective_login() AND active),'unknown')
 ELSE coalesce(nullif(current_setting('app.actor_kind',true),''),'unknown') END
$$;

CREATE OR REPLACE FUNCTION cmd.enter_actor() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE p cmd.login_principals%ROWTYPE;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=cmd.effective_login() AND active;
 IF p.user_id IS NULL OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
 OR (NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=p.user_id AND org_id=p.org_id AND status='active') AND NOT (p.actor_kind='helper' AND EXISTS(SELECT 1 FROM core.delegations WHERE helper_user_id=p.user_id AND org_id=p.org_id AND revoked_at IS NULL AND valid_during@>ref.clock_at())))
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND status='active')
 OR (p.actor_kind IN ('ops','system') AND (NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND is_platform)
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p.user_id AND active)))
 OR (p.actor_kind='system' AND NOT cmd.has_runtime_role('agiviet_orchestrator')) THEN
 RAISE EXCEPTION 'Login chưa được ánh xạ danh tính/quyền hoạt động' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true); PERFORM set_config('app.actor_kind',p.actor_kind,true);
 -- Không cho request dùng cờ import để bỏ máy trạng thái.
 PERFORM set_config('app.allow_any_initial','',true);
END $$;

CREATE OR REPLACE FUNCTION cmd.accept_invitation(p_token text,p_device text,p_otp text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,ref,public AS $$
DECLARE p cmd.login_principals%ROWTYPE; q core.qr_tokens%ROWTYPE; m uuid; r text;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=cmd.effective_login() AND active;
 SELECT * INTO q FROM core.qr_tokens WHERE token_hash=digest(p_token,'sha256') AND kind='invitation' FOR UPDATE;
 IF p.user_id IS NULL OR p.actor_kind NOT IN ('buyer','seller') OR q.designated_user_id IS DISTINCT FROM p.user_id OR q.invitation_org_id IS DISTINCT FROM p.org_id
 OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND status='active') THEN RAISE EXCEPTION 'Sai danh tính lời mời' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO m FROM core.memberships WHERE org_id=p.org_id AND user_id=p.user_id AND status='invited' FOR UPDATE;
 IF m IS NULL THEN RAISE EXCEPTION 'Lời mời không còn chờ' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true); PERFORM set_config('app.actor_kind',p.actor_kind,true); PERFORM set_config('app.allow_any_initial','',true);
 -- consume_otp gắn phone_hash của đúng QR; auth worker phải xác minh số trước.
 r:=core.scan_qr(p_token,p_device,p_otp);
 IF r<>'accepted' THEN RAISE EXCEPTION 'QR lời mời không hợp lệ: %',r USING HINT='ck_invitation_phone'; END IF;
 UPDATE core.memberships SET status='active' WHERE id=m; RETURN m;
END $$;

CREATE OR REPLACE FUNCTION cmd.record_registration(p_payload jsonb,p_reference text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,app_auth,core,public AS $$
DECLARE result uuid; old app_auth.registration_receipts%ROWTYPE;
BEGIN
 IF NOT cmd.has_runtime_role('agiviet_auth_worker') THEN RAISE EXCEPTION 'Chỉ auth adapter' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.check_payload(p_payload,ARRAY['name','organization','contact']);
 PERFORM cmd.check_payload(p_payload->'organization',ARRAY['code','kind','display_name','legal_name','tax_code','province_code','commune_code','can_buy','can_sell','segment_code']);
 PERFORM cmd.check_payload(p_payload->'contact',ARRAY['phone_enc','phone_hash','phone_masked','key_id']);
 IF coalesce(length(btrim(p_payload->>'name')),0)=0 OR octet_length((p_payload->'contact'->>'phone_hash')::bytea) IS DISTINCT FROM 32
 OR coalesce(octet_length((p_payload->'contact'->>'phone_enc')::bytea),0)=0 OR coalesce(length(p_payload->'contact'->>'key_id'),0)=0 THEN RAISE EXCEPTION 'Thiếu danh tính/số đã xác minh' USING HINT='ck_command_payload'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_reference,0));
 SELECT * INTO old FROM app_auth.registration_receipts WHERE provider_reference=p_reference;
 IF old.id IS NOT NULL THEN IF old.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'Receipt khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.id; END IF;
 INSERT INTO app_auth.registration_receipts(payload,payload_sha256,provider_reference) VALUES(p_payload,digest(p_payload::text,'sha256'),p_reference) RETURNING id INTO result; RETURN result;
END $$;

CREATE OR REPLACE FUNCTION core.apply_bank_event(p_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core,ledger,evt,ref,public AS $$
DECLARE e core.bank_events%ROWTYPE;
BEGIN
 IF NOT cmd.has_runtime_role('agiviet_bank_worker') THEN
 RAISE EXCEPTION 'Chỉ login/role bank worker được áp ngân hàng' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO e FROM core.bank_events WHERE id=p_id FOR UPDATE;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Không có sự kiện'; END IF;
 IF NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=e.webhook_id AND signature_valid AND provider=e.provider AND provider_event_id=e.provider_event_id) THEN
 RAISE EXCEPTION 'Webhook không xác thực' USING HINT='ck_webhook_signature'; END IF;
 IF e.requery_status IS DISTINCT FROM 'confirmed' OR e.requeried_at IS NULL OR e.requery_evidence IS NULL THEN
 RAISE EXCEPTION 'Phải tra lại API ngân hàng và xác nhận trước ghi tiền' USING HINT='ck_bank_requery'; END IF;
 IF e.applied_at IS NOT NULL THEN RETURN 'duplicate_ignored'; END IF;
 PERFORM set_config('app.actor_kind','bank',true); PERFORM set_config('app.user_id','',true); PERFORM set_config('app.org_id','',true);
 RETURN core.apply_bank_event_internal(p_id);
END $$;

CREATE OR REPLACE FUNCTION cmd.complete_bank_return(p_source uuid,p_proof uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,ops,core,ledger,ref,evt,public AS $$ BEGIN
 IF NOT cmd.has_runtime_role('agiviet_bank_worker') THEN
 RAISE EXCEPTION 'Chỉ bank worker xác nhận hoàn nguồn' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE ops.bank_return_tasks SET return_bank_event_id=p_proof,status='returned' WHERE bank_event_id=p_source AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có task hoàn đang chờ' USING HINT='ck_bank_return_source'; END IF;
END $$;

CREATE OR REPLACE FUNCTION cmd.verify_bank_account(p_account uuid,p_match boolean,p_api_receipt jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,pii,ref,public AS $$
DECLARE a pii.bank_accounts%ROWTYPE;
BEGIN
 -- Cổng bank đã xác thực bên ngoài; không cấp app/orchestrator. Không nhận actor.
 IF NOT cmd.has_runtime_role('agiviet_bank_worker') THEN RAISE EXCEPTION 'Chỉ adapter ngân hàng' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO a FROM pii.bank_accounts WHERE id=p_account FOR UPDATE;
 IF a.status IS DISTINCT FROM 'pending_verification' OR p_match IS NULL OR p_api_receipt->>'bank_code' IS DISTINCT FROM a.bank_code OR p_api_receipt->>'account_hash' IS DISTINCT FROM encode(a.account_number_hash,'hex') OR p_api_receipt->>'holder' IS DISTINCT FROM a.holder_name OR coalesce(length(p_api_receipt->>'reference'),0)=0 THEN RAISE EXCEPTION 'Thiếu tra tên đúng tài khoản' USING HINT='ck_bank_account_proof'; END IF;
 PERFORM set_config('app.actor_kind','bank',true); PERFORM set_config('app.reason','Tra tên qua ngân hàng',true);
 UPDATE pii.bank_accounts SET name_match=p_match,status=CASE WHEN p_match THEN 'cooling_down' ELSE 'rejected' END WHERE id=a.id;
 PERFORM evt.audit('bank_account.verified','payout_account',a.id,p_api_receipt);
END $$;
