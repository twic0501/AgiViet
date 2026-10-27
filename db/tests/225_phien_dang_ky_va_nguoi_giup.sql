UPDATE ref.feature_flags SET enabled=true WHERE code='nguoi_giup'; -- kiểm mã người giúp cũ; V1 tắt (bản 23)
-- SMS/OTP mô phỏng; không lưu token rõ. Dùng API auth worker nguyên trạng.
DELETE FROM cmd.test_clock;
SELECT test.context(NULL,NULL,'system');
GRANT USAGE ON SCHEMA test TO db_test_auth;
GRANT INSERT ON test.results TO db_test_auth;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_auth;
CREATE FUNCTION test.issue_scoped_session(p_user uuid,p_org uuid,k text) RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,test,public,cmd AS $$
BEGIN
 PERFORM set_config('test.session.user',p_user::text,true),set_config('test.session.org',p_org::text,true),set_config('test.session.key',k,true);
 PERFORM cmd.record_otp(k,p_user,'login',jsonb_build_object('org_id',p_org,'device_id','C55-DEVICE','token_sha256',encode(digest(k,'sha256'),'hex')),digest('TEST','sha256'));
 PERFORM cmd.otp_verification(k,true);
 RETURN test.as_login('db_test_auth',$q$SELECT cmd.record_login_session(current_setting('test.session.user')::uuid,current_setting('test.session.org')::uuid,'C55-DEVICE',digest(current_setting('test.session.key'),'sha256'),now()+interval '1 day',current_setting('test.session.key'))$q$)::uuid;
END $$;
CREATE FUNCTION test.scoped_session_count(k text) RETURNS integer LANGUAGE plpgsql SET search_path=pg_catalog,test,public,cmd AS $$ BEGIN
 PERFORM set_config('test.session.key',k,true);
 RETURN test.as_login('db_test_auth',$q$SELECT count(*) FROM cmd.lookup_session(digest(current_setting('test.session.key'),'sha256'))$q$)::integer;
END $$;
REVOKE ALL ON FUNCTION test.issue_scoped_session(uuid,uuid,text),test.scoped_session_count(text) FROM PUBLIC;

-- Tạo đăng ký pending mới bằng command, không tái sử dụng org đã được xác minh ở 200.
SELECT set_config('test.session.registration',jsonb_build_object('name','Người đăng ký phiên pending',
 'organization',jsonb_build_object('code','C55PENDING','kind','household','display_name','Hộ chờ xác minh','can_sell',true),
 'contact',jsonb_build_object('phone_enc',decode('aa','hex'),'phone_hash',digest('C55-PENDING-PHONE','sha256'),'phone_masked','090***055','key_id','TEST'))::text,true);
SELECT test.as_login('db_test_auth',$$SELECT set_config('test.session.receipt',cmd.record_registration(current_setting('test.session.registration')::jsonb,'C55-REGISTRATION')::text,true)$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.session.registered',cmd.register_organization(current_setting('test.session.receipt')::uuid)::text,true)$$);
SELECT set_config('test.session.pending_user',current_setting('test.session.registered')::jsonb->>'user_id',true),
 set_config('test.session.pending_org',current_setting('test.session.registered')::jsonb->>'org_id',true);
SELECT test.issue_scoped_session(current_setting('test.session.pending_user')::uuid,current_setting('test.session.pending_org')::uuid,'C55-PENDING');
SELECT test.check('C55 phiên pending bền qua API lookup sau bỏ context/cache',
 test.scoped_session_count('C55-PENDING')=1 AND EXISTS(SELECT 1 FROM app_auth.sessions
 WHERE token_hash=digest('C55-PENDING','sha256') AND session_kind='pending_registration' AND delegation_id IS NULL));
SELECT test.as_login('db_test_auth',$$SELECT test.expect_error('C55 OTP login không dùng lại để tạo token thứ hai',
 'SELECT cmd.record_login_session(current_setting(''test.session.pending_user'')::uuid,current_setting(''test.session.pending_org'')::uuid,''C55-DEVICE'',public.digest(''C55-OTHER'',''sha256''),now()+interval ''1 day'',''C55-PENDING'')','ck_otp_verified_binding')$$);
CREATE ROLE db_test_pending LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO db_test_pending;
GRANT USAGE ON SCHEMA test TO db_test_pending;
GRANT INSERT ON test.results TO db_test_pending;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_pending;
INSERT INTO cmd.login_principals VALUES('db_test_pending',current_setting('test.session.pending_user')::uuid,current_setting('test.session.pending_org')::uuid,'buyer',true);
SELECT test.as_login('db_test_pending',$$SELECT test.expect_error('C55 phiên pending không mở quyền nghiệp vụ',
 'SELECT cmd.create_demand(''{}'',''[]'')','KHONG_CO_QUYEN')$$);
UPDATE core.users SET disabled_at=now() WHERE id=current_setting('test.session.pending_user')::uuid;
SELECT test.check('C55 khóa người đăng ký vô hiệu phiên pending',test.scoped_session_count('C55-PENDING')=0);
UPDATE core.users SET disabled_at=NULL WHERE id=current_setting('test.session.pending_user')::uuid;
SELECT test.as_login('db_test_auth',$$SELECT cmd.revoke_session(digest('C55-PENDING','sha256'))$$);
SELECT test.check('C55 phiên pending bị thu hồi không lookup lại',test.scoped_session_count('C55-PENDING')=0);

-- Người giúp không có membership. Phiên gắn đúng delegation và chủ còn quyền.
SELECT set_config('test.session.helper',test.id('C48HELPER')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.delegate_helper(current_setting('test.session.helper')::uuid,ARRAY['lot.draft'],tstzrange(now(),now()+interval '3 days'))$$);
SELECT test.issue_scoped_session(test.id('C48HELPER'),test.org('TC-B01'),'C55-HELPER');
SELECT test.check('C55 người giúp không membership có phiên bền đúng ủy quyền',
 test.scoped_session_count('C55-HELPER')=1 AND EXISTS(SELECT 1 FROM app_auth.sessions s JOIN core.delegations d ON d.id=s.delegation_id
 WHERE s.token_hash=digest('C55-HELPER','sha256') AND s.session_kind='helper' AND d.helper_user_id=test.id('C48HELPER'))
 AND NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=test.id('C48HELPER') AND org_id=test.org('TC-B01')));
SELECT test.expect_error('C55 không cấp phiên người giúp cho tổ chức khác',
 $$SELECT test.issue_scoped_session(test.id('C48HELPER'),test.org('TC-M01'),'C55-WRONG-ORG')$$,'KHONG_CO_QUYEN');
SELECT test.actual_command_order('C55HELPERSIGN');
SELECT set_config('test.session.contract',(SELECT d.id::text FROM core.documents d JOIN core.orders o ON o.id=d.order_id WHERE o.code='C55HELPERSIGN' AND d.doc_type='contract'),true);
SELECT test.as_login('db_test_helper',$$SELECT test.expect_error('C55 phiên helper không cho ký thay principal',
 'SELECT cmd.sign_document(current_setting(''test.session.contract'')::uuid,''seller'',''fake'',''TEST'')','ck_signature_role')$$);
SELECT set_config('test.session.delegation',(SELECT delegation_id::text FROM app_auth.sessions WHERE token_hash=digest('C55-HELPER','sha256')),true);
UPDATE core.users SET disabled_at=now() WHERE id=test.person('Nguyễn Thị Năm');
SELECT test.check('C55 khóa principal vô hiệu phiên helper',test.scoped_session_count('C55-HELPER')=0);
UPDATE core.users SET disabled_at=NULL WHERE id=test.person('Nguyễn Thị Năm');
INSERT INTO cmd.test_clock VALUES(true,now()+interval '4 days');
SELECT test.check('C55 hết hạn delegation vô hiệu phiên helper',test.scoped_session_count('C55-HELPER')=0);
DELETE FROM cmd.test_clock;
UPDATE core.delegations SET revoked_at=now(),revoked_by=principal_user_id WHERE id=current_setting('test.session.delegation')::uuid;
SELECT test.check('C55 thu hồi delegation vô hiệu phiên helper',test.scoped_session_count('C55-HELPER')=0);
SELECT test.expect_error('C55 delegation thu hồi không cấp lại phiên',
 $$SELECT test.issue_scoped_session(test.id('C48HELPER'),test.org('TC-B01'),'C55-REVOKED')$$,'KHONG_CO_QUYEN');
SELECT test.check('C55 scope và delegation chỉ auth adapter dùng, app không sửa phiên',
 NOT has_function_privilege('db_test_helper','app_auth.session_scope_valid(text,uuid,uuid,uuid)','EXECUTE')
 AND NOT has_table_privilege('db_test_pending','app_auth.sessions','INSERT')
 AND NOT has_function_privilege('db_test_pending','cmd.record_login_session(uuid,uuid,text,bytea,timestamptz,text,text)','EXECUTE'));
SET CONSTRAINTS ALL IMMEDIATE;
UPDATE ref.feature_flags SET enabled=false WHERE code='nguoi_giup';
