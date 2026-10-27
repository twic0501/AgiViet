-- SET SESSION AUTHORIZATION chỉ là harness owner mô phỏng login vật lý.
-- Bên trong phiên gateway dùng SET LOCAL ROLE như pool pg, không đổi session_user.
DELETE FROM cmd.test_clock;
SELECT set_config('app.test_time','',true),set_config('test.gw.owner',session_user,true);
CREATE ROLE db_test_gateway LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE ROLE db_test_gateway_unbound NOLOGIN;
GRANT agiviet_app TO db_test_gateway_unbound;
GRANT db_test_seller,db_test_buyer,db_test_system,db_test_auth,db_test_helper,
 db_test_gateway_unbound,agiviet_bank_worker TO db_test_gateway;
INSERT INTO cmd.trusted_gateways(login_name) VALUES('db_test_gateway');
GRANT USAGE ON SCHEMA test TO db_test_gateway;
GRANT INSERT ON test.results TO db_test_gateway;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_gateway;
GRANT USAGE ON SCHEMA test TO agiviet_bank_worker,db_test_gateway_unbound;
GRANT INSERT ON test.results TO agiviet_bank_worker,db_test_gateway_unbound;
GRANT USAGE ON SEQUENCE test.results_id_seq TO agiviet_bank_worker,db_test_gateway_unbound;
CREATE FUNCTION test.gateway_guard() RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,cmd AS $$ BEGIN PERFORM cmd.enter_actor(); END $$;
CREATE FUNCTION test.gateway_roles() RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,cmd AS $$
 SELECT cmd.has_runtime_role('agiviet_auth_worker') OR cmd.has_runtime_role('agiviet_bank_worker')
 OR cmd.has_runtime_role('agiviet_orchestrator')
$$;
REVOKE ALL ON FUNCTION test.gateway_guard(),test.gateway_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION test.gateway_guard(),test.gateway_roles() TO db_test_gateway;
GRANT EXECUTE ON FUNCTION test.gateway_roles() TO db_test_seller;
SELECT test.check('C54 cấu hình cổng không cho app/auth/system sửa',
 NOT has_table_privilege('db_test_seller','cmd.trusted_gateways','UPDATE')
 AND NOT has_table_privilege('db_test_auth','cmd.trusted_gateways','INSERT')
 AND NOT has_table_privilege('db_test_system','cmd.trusted_gateways','DELETE'));
SELECT test.check('C54 cổng không kế thừa quyền command, bảng hay broker',
 NOT has_schema_privilege('db_test_gateway','cmd','USAGE')
 AND NOT has_function_privilege('db_test_gateway','cmd.create_lot(jsonb)','EXECUTE')
 AND NOT has_table_privilege('db_test_gateway','core.orders','SELECT'));
SELECT set_config('test.gw.lot',(SELECT jsonb_build_object('code','C54GW-LOT','product_id',product_id,
 'profile_version',profile_version,'grade_code',grade_code,'site_id',site_id,'facility_id',facility_id,
 'qty_basis','weighed','declared_qty',2000000)::text FROM core.lots WHERE code='L-0412'),true);
SELECT set_config('test.gw.registration',jsonb_build_object('name','Đăng ký qua cổng',
 'organization',jsonb_build_object('code','C54REG','kind','household','display_name','Hộ qua cổng','can_sell',true),
 'contact',jsonb_build_object('phone_enc',decode('aa','hex'),'phone_hash',digest('C54-PHONE','sha256'),'phone_masked','090***054','key_id','TEST'))::text,true);

-- Cả chuỗi dưới đây giữ nguyên session_user, cùng transaction runner.
SET LOCAL SESSION AUTHORIZATION db_test_gateway;
SELECT test.expect_error('C54 cổng chưa SET ROLE không gọi command',
 $$SELECT cmd.create_lot('{}')$$,'42501');
SELECT test.expect_error('C54 kể cả qua SECURITY DEFINER cổng trần không có principal',
 $$SELECT test.gateway_guard()$$,'KHONG_CO_QUYEN');
SELECT test.check('C54 MEMBER bắc cầu không cấp quyền worker cho cổng trần',NOT test.gateway_roles());
SET LOCAL ROLE db_test_seller;
SELECT test.check('C54 SET ROLE thay current_user, giữ nguyên session_user',
 session_user='db_test_gateway' AND current_user='db_test_seller');
SELECT set_config('app.user_id','00000000-0000-0000-0000-000000000001',true),
 set_config('app.actor_kind','system',true);
SELECT test.check('C54 context qua SECURITY DEFINER không nhận GUC giả',
 ref.ctx_user()=test.person('Nguyễn Thị Năm') AND ref.ctx_org()=test.org('TC-B01') AND ref.ctx_actor()='seller');
SELECT cmd.create_lot(current_setting('test.gw.lot')::jsonb);
SELECT test.check('C54 seller không hưởng quyền worker từ membership của gateway',NOT test.gateway_roles());
SET LOCAL ROLE db_test_buyer;
SELECT test.check('C54 chuyển buyer trong giao dịch không giữ danh tính seller',
 session_user='db_test_gateway' AND ref.ctx_user()=test.person('Trần Thu Hà') AND ref.ctx_actor()='buyer');
SELECT test.expect_error('C54 buyer không dùng payload seller',
 $$SELECT cmd.create_lot(current_setting('test.gw.lot')::jsonb)$$,'KHONG_CO_QUYEN');
SET LOCAL ROLE db_test_system;
SELECT test.check('C54 điều phối chọn đúng vai trong phiên gateway',current_user='db_test_system' AND session_user='db_test_gateway');
SELECT cmd.expire_deadline_result(test.id('CMD-FUTURE-HAN'));
SET LOCAL ROLE db_test_auth;
SELECT cmd.record_registration(current_setting('test.gw.registration')::jsonb,'C54-GATEWAY-SMS');
SET LOCAL ROLE agiviet_bank_worker;
SELECT test.expect_error('C54 bank adapter qua gateway vào đúng nhánh ngân hàng',
 $$SELECT core.apply_bank_event(NULL)$$,'Không có sự kiện');
SELECT test.expect_error('C54 complete_bank_return qua gateway vào đúng nhánh',
 $$SELECT cmd.complete_bank_return(NULL,NULL)$$,'ck_bank_return_source');
SELECT test.expect_error('C54 verify_bank_account qua gateway vào đúng nhánh',
 $$SELECT cmd.verify_bank_account(NULL,true,'{}')$$,'ck_bank_account_proof');
SET LOCAL ROLE db_test_gateway_unbound;
SELECT test.expect_error('C54 vai app chưa ánh xạ không tự trở thành actor',
 $$SELECT cmd.create_lot('{}')$$,'KHONG_CO_QUYEN');
RESET ROLE;
SELECT test.expect_error('C54 RESET ROLE không giữ quyền nghiệp vụ trước đó',
 $$SELECT test.gateway_guard()$$,'KHONG_CO_QUYEN');
RESET SESSION AUTHORIZATION;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.gw.owner')); END $$;
RESET ROLE;
SELECT test.check('C54 command ghi đúng user/org và auth receipt qua gateway',
 EXISTS(SELECT 1 FROM core.lots WHERE code='C54GW-LOT' AND created_by=test.person('Nguyễn Thị Năm') AND seller_org_id=test.org('TC-B01'))
 AND EXISTS(SELECT 1 FROM app_auth.registration_receipts WHERE provider_reference='C54-GATEWAY-SMS'));

-- Tấn công: cố tình cấp chéo membership, PostgreSQL cho SET ROLE nhưng DB vẫn chặn đổi actor.
GRANT db_test_seller TO db_test_buyer;
SET LOCAL SESSION AUTHORIZATION db_test_buyer;
SET LOCAL ROLE db_test_seller;
SELECT test.expect_error('C54 login thường SET ROLE principal khác bị chặn',
 $$SELECT cmd.create_lot(current_setting('test.gw.lot')::jsonb)$$,'KHONG_CO_QUYEN');
SELECT test.expect_error('C54 login thường không đổi danh tính đọc bằng SET ROLE',
 $$SELECT ref.ctx_user()$$,'KHONG_CO_QUYEN');
RESET ROLE;
SELECT set_config('app.trusted_gateway','true',true),set_config('app.gateway_login','db_test_gateway',true);
SELECT test.check('C54 tự khai gateway bằng GUC không đổi principal',ref.ctx_user()=test.person('Trần Thu Hà'));
SELECT test.expect_error('C54 login thường không tự đăng ký cổng',
 $$INSERT INTO cmd.trusted_gateways(login_name) VALUES(session_user)$$,'42501');
SELECT test.expect_error('C54 login thường không bật/sửa cấu hình cổng',
 $$UPDATE cmd.trusted_gateways SET enabled=true$$,'42501');
RESET SESSION AUTHORIZATION;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.gw.owner')); END $$;
RESET ROLE;
REVOKE db_test_seller FROM db_test_buyer;
ALTER ROLE db_test_gateway INHERIT;
SET LOCAL SESSION AUTHORIZATION db_test_gateway;
SET LOCAL ROLE db_test_seller;
SELECT test.expect_error('C54 cấu hình sai gateway INHERIT phải fail closed',
 $$SELECT cmd.create_lot('{}')$$,'KHONG_CO_QUYEN');
RESET SESSION AUTHORIZATION;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.gw.owner')); END $$;
RESET ROLE;
ALTER ROLE db_test_gateway NOINHERIT;

-- Kiểm cmd.accept_invitation riêng vì entry point này chấp nhận membership invited.
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.gw.invitee',cmd.create_invitee('Người mời qua cổng',decode('aa','hex'),decode(repeat('c4',32),'hex'),'090***054','TEST')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.gw.invite',cmd.invite_member(current_setting('test.gw.invitee')::uuid,ARRAY['collection_staff'],1000000)::text,true)$$);
CREATE ROLE db_test_gateway_invited LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO db_test_gateway_invited;
GRANT db_test_gateway_invited TO db_test_gateway;
INSERT INTO cmd.login_principals VALUES('db_test_gateway_invited',current_setting('test.gw.invitee')::uuid,test.org('TC-B01'),'seller',true);
SELECT cmd.record_otp('C54-INVITE',current_setting('test.gw.invitee')::uuid,'invitation_accept',core.invitation_binding((current_setting('test.gw.invite')::jsonb->>'invitation_id')::uuid),digest('TEST','sha256'));
SELECT cmd.otp_verification('C54-INVITE',true);
SET LOCAL SESSION AUTHORIZATION db_test_gateway;
SET LOCAL ROLE db_test_auth;
SELECT cmd.verify_invitation_contact('C54-INVITE');
SET LOCAL ROLE db_test_gateway_invited;
SELECT cmd.accept_invitation(current_setting('test.gw.invite')::jsonb->>'token','TEST','C54-INVITE');
RESET SESSION AUTHORIZATION;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.gw.owner')); END $$;
RESET ROLE;
SELECT test.check('C54 nhận lời mời qua gateway tiêu thụ OTP và kích hoạt membership',
 EXISTS(SELECT 1 FROM core.memberships WHERE user_id=current_setting('test.gw.invitee')::uuid AND status='active')
 AND EXISTS(SELECT 1 FROM evt.otp_challenges WHERE id='C54-INVITE' AND used_at IS NOT NULL));

-- Rà catalogue sau nâng cấp: không còn hàm chạy thật dùng session_user để tra mapping/role.
SELECT test.check('C54 không còn định nghĩa cũ kiểm identity theo session_user',NOT EXISTS(
 SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('cmd','core','ref') AND (p.prosrc ~ 'pg_has_role\(session_user'
 OR p.prosrc ~ 'login_name\s*=\s*session_user') AND p.proname<>'effective_login'));
SET CONSTRAINTS ALL IMMEDIATE;
