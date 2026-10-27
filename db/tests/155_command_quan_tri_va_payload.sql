-- Harness dùng SESSION AUTHORIZATION thật; helper chỉ owner fixture gọi được.
CREATE FUNCTION test.as_login(p_login name,p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE original name:=session_user; result text;
BEGIN
 EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',p_login);
 BEGIN EXECUTE p_sql INTO result;
 EXCEPTION WHEN OTHERS THEN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',original); RAISE; END;
 EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',original); RETURN result;
END $$;
REVOKE ALL ON FUNCTION test.as_login(name,text) FROM PUBLIC;
CREATE FUNCTION test.command_doc(k text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('code',k,'series_key',k,'version_no',1,'content_sha256',digest(k,'sha256'),'file_sha256',digest(k||':pdf','sha256'),'canonical_content',jsonb_build_object('TEST',true),'storage_key','TEST/'||k,'mime_type','application/pdf','size_bytes',1)
$$;
CREATE FUNCTION test.command_statement(k text,p_instruction uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE b core.bank_instructions%ROWTYPE; result uuid; target_hash bytea;
BEGIN
 SELECT * INTO b FROM core.bank_instructions WHERE id=p_instruction;
 SELECT coalesce(b.target_account_hash,account_number_hash) INTO target_hash FROM pii.bank_accounts WHERE id=b.target_bank_account_id;
 target_hash:=coalesce(b.target_account_hash,target_hash);
 SET LOCAL ROLE agiviet_bank_worker;
 result:=cmd.record_bank_event(jsonb_build_object('provider','bank_sim','provider_event_id',k,'event_type','statement_line','signature_valid',true,'payload','{}'::jsonb),
 jsonb_build_object('kind','statement_line','amount_vnd',b.amount_vnd,'instruction_code',b.code,'bank_txn_ref',b.bank_txn_ref,'occurred_at',now(),'requeried_at',now(),'requery_status','confirmed','requery_evidence',jsonb_build_object('direction','debit','target_bank_code',b.target_bank_code,'target_account_hash',encode(target_hash,'hex'))));
 RESET ROLE; RETURN result;
END $$;
SELECT set_config('app.test_time','',true);
DELETE FROM cmd.test_clock;
SELECT set_config('test.cmd.cancelorder',test.id('LS4')::text,true);
SELECT test.check('C38 mọi command runtime SECURITY DEFINER + search_path cố định',NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='cmd' AND (has_function_privilege('agiviet_app',p.oid,'EXECUTE') OR has_function_privilege('agiviet_orchestrator',p.oid,'EXECUTE') OR has_function_privilege('agiviet_bank_worker',p.oid,'EXECUTE')) AND (NOT p.prosecdef OR NOT EXISTS(SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))));
SELECT test.check('C38 không có helper mới hoặc DML cấp runtime',NOT has_function_privilege('agiviet_app','cmd.party_order(uuid,text[])','EXECUTE') AND NOT has_function_privilege('agiviet_orchestrator','cmd.apply_dispute_result(uuid,text,jsonb,uuid,uuid)','EXECUTE') AND NOT has_function_privilege('agiviet_app','cmd.create_group_part_internal(uuid,bigint,text,uuid,jsonb,jsonb)','EXECUTE') AND NOT has_function_privilege('agiviet_orchestrator','cmd.expire_deadline_internal(uuid)','EXECUTE') AND NOT EXISTS(SELECT 1 FROM information_schema.role_table_grants WHERE grantee IN ('agiviet_app','agiviet_orchestrator') AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE') AND table_schema IN ('core','ledger','cmd','ops','pii')));
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C38 không chọn actor qua payload', 'SELECT cmd.propose_amendment(NULL,''change_date'',''{"actor":"system"}''::jsonb)', 'KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C38 buyer không tạo người được mời khi không phải chủ', 'SELECT cmd.create_invitee(''Test'',decode(''aa'',''hex''),decode(repeat(''ab'',32),''hex''),''090***111'',''TEST'')','KHONG_CO_QUYEN')$$);
-- Dùng chủ người bán (Năm) tạo danh tính người được mời, không lấy actor từ người dùng đích.
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c38.invitee',cmd.create_invitee('Người thử được mời',decode('aa','hex'),decode(repeat('ab',32),'hex'),'090***111','TEST')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c38.invite',cmd.invite_member(current_setting('test.c38.invitee')::uuid,ARRAY['collection_staff'],1000000)::text,true)$$);
SELECT test.check('C39 lời mời ghim danh tính login và số đích',EXISTS(SELECT 1 FROM core.memberships WHERE id=(current_setting('test.c38.invite')::jsonb->>'membership_id')::uuid AND status='invited' AND created_by=test.person('Nguyễn Thị Năm')) AND EXISTS(SELECT 1 FROM core.qr_tokens WHERE id=(current_setting('test.c38.invite')::jsonb->>'invitation_id')::uuid AND invited_phone_hash=decode(repeat('ab',32),'hex')));
CREATE ROLE db_test_invited LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO db_test_invited;
INSERT INTO cmd.login_principals VALUES('db_test_invited',current_setting('test.c38.invitee')::uuid,test.org('TC-B01'),'seller',true);
GRANT USAGE ON SCHEMA test TO db_test_invited;
GRANT INSERT ON test.results TO db_test_invited;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_invited;
SELECT test.as_login('db_test_invited',$$SELECT test.expect_error('C39 invited chưa được dùng command thị trường','SELECT cmd.create_lot(''{}''::jsonb)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C39 login khác không nhận lời mời','SELECT cmd.accept_invitation(current_setting(''test.c38.invite'')::jsonb->>''token'',''TEST'',''fake'')','KHONG_CO_QUYEN')$$);
SELECT cmd.record_otp('C39-INVITE',current_setting('test.c38.invitee')::uuid,'invitation_accept',core.invitation_binding((current_setting('test.c38.invite')::jsonb->>'invitation_id')::uuid),digest('TEST','sha256'));
SELECT cmd.otp_verification('C39-INVITE',true);
SELECT test.as_login('db_test_auth',$$SELECT cmd.verify_invitation_contact('C39-INVITE')$$);
SELECT test.as_login('db_test_invited',$$SELECT cmd.accept_invitation(current_setting('test.c38.invite')::jsonb->>'token','TEST','C39-INVITE')$$);
SELECT test.check('C39 OTP lời mời được tiêu thụ, membership active',EXISTS(SELECT 1 FROM core.memberships WHERE user_id=current_setting('test.c38.invitee')::uuid AND org_id=test.org('TC-B01') AND status='active') AND EXISTS(SELECT 1 FROM evt.otp_challenges WHERE id='C39-INVITE' AND used_at IS NOT NULL));
SELECT test.as_login('db_test_invited',$$SELECT test.expect_error('C39 không replay lời mời','SELECT cmd.accept_invitation(current_setting(''test.c38.invite'')::jsonb->>''token'',''TEST'',''C39-INVITE'')','ck_command_state')$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.update_member((current_setting('test.c38.invite')::jsonb->>'membership_id')::uuid,'suspended',500000,'Tạm dừng thử')$$);
SELECT test.as_login('db_test_invited',$$SELECT test.expect_error('C39 suspended không dùng lại login','SELECT cmd.update_lot(NULL,''confirm'')','KHONG_CO_QUYEN')$$);
SELECT set_config('test.c39.owner',(SELECT id::text FROM core.memberships WHERE user_id=test.person('Nguyễn Thị Năm') AND org_id=test.org('TC-B01')),true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C39 không khóa chủ cuối cùng','SELECT cmd.update_member(current_setting(''test.c39.owner'')::uuid,''suspended'',NULL,''Thử'')','ck_last_owner')$$);
-- Tài khoản mới: app không được chọn name_match; OTP sai binding không có hiệu lực.
SELECT set_config('test.c39.bankhash',encode(digest('C39-ACCOUNT','sha256'),'hex'),true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C39 đổi tài khoản cần OTP','SELECT cmd.request_bank_account(''970436'',decode(''ab'',''hex''),decode(current_setting(''test.c39.bankhash''),''hex''),''****1234'',''NGUYEN THI NAM'',''TEST'',''FAKE'')','ck_otp_verified_binding')$$);
SELECT cmd.record_otp('C39-BANK',test.person('Nguyễn Thị Năm'),'bank_account_change',jsonb_build_object('org_id',test.org('TC-B01'),'bank_code','970436','account_hash',current_setting('test.c39.bankhash'),'holder','NGUYEN THI NAM'),digest('TEST','sha256'));
SELECT cmd.otp_verification('C39-BANK',true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c39.account',cmd.request_bank_account('970436',decode('ab','hex'),decode(current_setting('test.c39.bankhash'),'hex'),'****1234','NGUYEN THI NAM','TEST','C39-BANK')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C39 app không tự tra tên ngân hàng','SELECT cmd.verify_bank_account(current_setting(''test.c39.account'')::uuid,true,''{}'')','42501')$$);
SET LOCAL ROLE agiviet_bank_worker;
SELECT cmd.verify_bank_account(current_setting('test.c39.account')::uuid,true,jsonb_build_object('bank_code','970436','account_hash',current_setting('test.c39.bankhash'),'holder','NGUYEN THI NAM','reference','TEST-API'));
RESET ROLE;
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C39 không bỏ qua 24h tài khoản','SELECT cmd.activate_bank_account(current_setting(''test.c39.account'')::uuid)','ck_bank_cooldown')$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.lock_bank_account(current_setting('test.c39.account')::uuid,'Không phải tôi')$$);
SELECT test.check('C39 khóa ngay và xếp việc P0',EXISTS(SELECT 1 FROM pii.bank_accounts WHERE id=current_setting('test.c39.account')::uuid AND status='locked') AND EXISTS(SELECT 1 FROM ops.tasks WHERE entity_id=current_setting('test.c39.account')::uuid AND kind='V05' AND priority=0));
-- Việc/outbox chỉ ghi theo login, không nhận user_id tùy ý.
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c39.task',cmd.create_task('V08',2::smallint,'order',current_setting('test.cmd.cancelorder')::uuid,current_setting('test.cmd.cancelorder')::uuid,'risk','C39-TASK','Kiểm tra thử')::text,true)$$);
SELECT test.as_login('db_test_approve',$$SELECT cmd.act_on_task(current_setting('test.c39.task')::uuid,'claim','{}')$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C39 không cướp việc người khác','SELECT cmd.act_on_task(current_setting(''test.c39.task'')::uuid,''finish'',''{"result":"ok"}'')','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_approve',$$SELECT cmd.record_work(current_setting('test.c39.task')::uuid,current_date,5,'reconciliation',0)$$);
SELECT test.as_login('db_test_approve',$$SELECT cmd.act_on_task(current_setting('test.c39.task')::uuid,'finish','{"result":"TEST-DONE"}')$$);
SELECT test.check('C39 kết thúc việc có audit hành động và giờ công',EXISTS(SELECT 1 FROM ops.tasks WHERE id=current_setting('test.c39.task')::uuid AND status='done') AND EXISTS(SELECT 1 FROM ops.work_logs WHERE task_id=current_setting('test.c39.task')::uuid AND user_id=test.person('Nguyễn Hữu Tâm')));
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c39.outbox',(SELECT jsonb_build_object('id',id,'attempt',attempts)::text FROM cmd.claim_outbox('notify',1)),true)$$);
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C39 lease outbox khác attempt bị chặn','SELECT cmd.finish_outbox((current_setting(''test.c39.outbox'')::jsonb->>''id'')::bigint,999,NULL)','ck_outbox_lease')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.finish_outbox((current_setting('test.c39.outbox')::jsonb->>'id')::bigint,(current_setting('test.c39.outbox')::jsonb->>'attempt')::integer,NULL)$$);
SELECT test.check('C39 outbox sent có timestamp',EXISTS(SELECT 1 FROM evt.outbox WHERE id=(current_setting('test.c39.outbox')::jsonb->>'id')::bigint AND status='sent' AND sent_at IS NOT NULL));
-- Mở ký tài liệu draft bằng system không tự tạo chữ ký.
INSERT INTO core.documents(code,doc_type,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes)
VALUES('C38-DRAFT','evidence','C38-DRAFT',1,digest('DRAFT','sha256'),digest('PDF','sha256'),'TEST/DRAFT','application/pdf',1);
SELECT set_config('test.c38.draft',(SELECT id::text FROM core.documents WHERE code='C38-DRAFT'),true);
SELECT test.as_login('db_test_system',$$SELECT cmd.sync_document(current_setting('test.c38.draft')::uuid)$$);
SELECT test.check('C38 sync draft chỉ mở ký, không fully_signed',EXISTS(SELECT 1 FROM core.documents WHERE code='C38-DRAFT' AND status='awaiting_signature') AND NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=current_setting('test.c38.draft')::uuid));
