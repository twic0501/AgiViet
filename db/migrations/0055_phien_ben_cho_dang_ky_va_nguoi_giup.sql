-- Giữ nguyên API 0034; phiên là chứng cứ xác thực, không cấp vai nghiệp vụ.
ALTER TABLE app_auth.sessions ADD COLUMN session_kind text NOT NULL DEFAULT 'member'
 CHECK(session_kind IN ('member','pending_registration','helper'));
ALTER TABLE app_auth.sessions ADD COLUMN delegation_id uuid REFERENCES core.delegations;
ALTER TABLE app_auth.sessions ADD CONSTRAINT ck_session_delegation
 CHECK((session_kind='helper')=(delegation_id IS NOT NULL));
COMMENT ON COLUMN app_auth.sessions.session_kind IS 'Phạm vi xác thực tại lúc cấp: thành viên, người đăng ký đang chờ, hoặc ủy quyền người giúp. Không tự cấp vai.';
COMMENT ON COLUMN app_auth.sessions.delegation_id IS 'Phiên người giúp gắn một ủy quyền cố định; không tự chuyển sang ủy quyền mới sau khi bị thu hồi.';
-- 0034 từng chấp nhận active membership ở org pending. Giữ phiên còn hạn đã
-- cấp đúng người đăng ký, không mở rộng membership không có receipt đăng ký.
UPDATE app_auth.sessions s SET session_kind='pending_registration'
FROM core.organizations o,core.registration_results r
WHERE s.org_id=o.id AND o.status='pending' AND r.org_id=s.org_id AND r.user_id=s.user_id;

CREATE FUNCTION app_auth.session_scope_valid(p_kind text,p_user uuid,p_org uuid,p_delegation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT EXISTS(SELECT 1 FROM core.users WHERE id=p_user AND disabled_at IS NULL)
 AND EXISTS(SELECT 1 FROM core.organizations o WHERE o.id=p_org AND
  CASE p_kind
  WHEN 'member' THEN o.status='active' AND EXISTS(
   SELECT 1 FROM core.memberships WHERE user_id=p_user AND org_id=o.id AND status='active')
  WHEN 'pending_registration' THEN o.status IN ('pending','active') AND EXISTS(
   SELECT 1 FROM core.registration_results WHERE user_id=p_user AND org_id=o.id) AND EXISTS(
   SELECT 1 FROM core.memberships WHERE user_id=p_user AND org_id=o.id AND status='active')
  WHEN 'helper' THEN o.status='active' AND EXISTS(
   SELECT 1 FROM core.delegations d JOIN core.users u ON u.id=d.principal_user_id AND u.disabled_at IS NULL
   JOIN core.memberships m ON m.user_id=d.principal_user_id AND m.org_id=d.org_id AND m.status='active'
   JOIN core.membership_roles r ON r.membership_id=m.id AND r.role_code IN ('owner','coop_board')
   WHERE d.id=p_delegation AND d.helper_user_id=p_user AND d.org_id=o.id
   AND d.revoked_at IS NULL AND d.valid_during@>ref.clock_at())
  ELSE false END)
$$;
REVOKE ALL ON FUNCTION app_auth.session_scope_valid(text,uuid,uuid,uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.record_login_session(p_user uuid,p_org uuid,p_device text,p_hash bytea,p_expires timestamptz,p_otp text,p_purpose text DEFAULT 'login') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,app_auth,core,evt AS $$
DECLARE result uuid; scope text; delegation uuid;
BEGIN
 IF app_auth.session_scope_valid('member',p_user,p_org,NULL) THEN scope:='member';
 ELSIF app_auth.session_scope_valid('pending_registration',p_user,p_org,NULL) THEN scope:='pending_registration';
 ELSE
  SELECT d.id INTO delegation FROM core.delegations d
  WHERE d.helper_user_id=p_user AND d.org_id=p_org
  AND app_auth.session_scope_valid('helper',p_user,p_org,d.id) ORDER BY d.id LIMIT 1;
  IF delegation IS NOT NULL THEN scope:='helper'; END IF;
 END IF;
 IF p_purpose IS NULL OR p_purpose NOT IN ('login','login_new_device') OR scope IS NULL THEN
  RAISE EXCEPTION 'Không có quyền đăng nhập' USING HINT='KHONG_CO_QUYEN'; END IF;
 -- Binding không đổi: đúng user, org, thiết bị, hash token; OTP dùng một lần.
 PERFORM evt.consume_otp(p_otp,p_user,p_purpose,jsonb_build_object('org_id',p_org,'device_id',p_device,'token_sha256',encode(p_hash,'hex')));
 INSERT INTO app_auth.sessions(user_id,org_id,device_id,token_hash,expires_at,session_kind,delegation_id)
 VALUES(p_user,p_org,p_device,p_hash,p_expires,scope,delegation) RETURNING id INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION cmd.lookup_session(p_hash bytea) RETURNS TABLE(id uuid,user_id uuid,org_id uuid,device_id text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,app_auth AS $$
 SELECT s.id,s.user_id,s.org_id,s.device_id FROM app_auth.sessions s
 WHERE s.token_hash=p_hash AND s.revoked_at IS NULL AND s.expires_at>now()
 AND app_auth.session_scope_valid(s.session_kind,s.user_id,s.org_id,s.delegation_id)
$$;
-- CREATE OR REPLACE giữ ACL: chỉ auth worker gọi entry point, app không đọc/ghi phiên.
