-- Mỗi kiểm soát có fixture đủ điều kiện, tránh bị chặn vì thiếu chứng cứ không liên quan.
SELECT test.expect_error('D01 owner tự đặt actor bank cũng không áp sự kiện', $$SELECT core.apply_bank_event(test.id('partial-deposit'))$$,'KHONG_CO_QUYEN');
SELECT test.expect_error('D01 app không gọi nội bộ apply bank', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; PERFORM core.apply_bank_event_internal('00000000-0000-0000-0000-000000000000'); END $b$;$$,'42501');
SELECT test.expect_error('D01 app không ghi OTP receipt', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; PERFORM cmd.otp_verification('fake',true); END $b$;$$,'42501');
SELECT test.expect_error('D01 app không tự ánh xạ login', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; UPDATE cmd.login_principals SET actor_kind='ops'; END $b$;$$,'42501');
SELECT test.context('Trần Thu Hà','TC-M01','buyer');
SET LOCAL ROLE agiviet_app;
SELECT set_config('app.actor_kind','bank',true),set_config('app.user_id','00000000-0000-0000-0000-000000000000',true);
DO $$ BEGIN IF ref.ctx_actor()<>'buyer' OR ref.ctx_user() IS NULL OR ref.ctx_user()='00000000-0000-0000-0000-000000000000'::uuid THEN RAISE EXCEPTION 'GUC giả được tin'; END IF; END $$;
RESET ROLE;
SELECT test.check('D01 danh tính app bỏ qua actor và user GUC giả',true);
SELECT test.expect_error('D03 đủ quyết định vẫn chặn cọc khác đơn', $$DO $b$ BEGIN
 PERFORM test.manual_post('manual_adjustment',test.id('LS3'),'D03-cross','Sai phạm vi',jsonb_build_array(jsonb_build_object('type','deposit_escrow','order',test.id('LS3'),'amount',-1),jsonb_build_object('type','deposit_escrow','order',test.id('BT2005'),'amount',1)));
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_ledger_order_scope');
SELECT test.expect_error('D03 đủ quyết định vẫn chặn external ngoài đơn', $$DO $b$ BEGIN
 PERFORM test.manual_post('manual_adjustment',test.id('LS3'),'D03-payee','Sai người nhận',jsonb_build_array(jsonb_build_object('type','deposit_escrow','order',test.id('LS3'),'amount',-1),jsonb_build_object('type','external','org',test.org('TC-B02'),'amount',1)));
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_ledger_order_scope');
SELECT test.expect_error('D04 điều chỉnh thiếu duyệt bị chặn trước ghi tiền', $$SELECT ledger.post('manual_adjustment',NULL,'D04-no','Thiếu quyết định','[{"type":"suspense","amount":1},{"type":"external_unidentified","amount":-1}]')$$,'ck_ledger_approval');
SELECT test.expect_ok('D04 điều chỉnh có quyết định hai tài chính vẫn qua', $$DO $b$ BEGIN PERFORM test.manual_post('manual_adjustment',NULL,'D04-yes','Có quyết định','[{"type":"suspense","amount":1},{"type":"external_unidentified","amount":-1}]'); SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);
CREATE FUNCTION test.clone_instruction(p_id uuid,p_patch jsonb) RETURNS void LANGUAGE sql AS $$
INSERT INTO core.bank_instructions SELECT (jsonb_populate_record(NULL::core.bank_instructions,to_jsonb(b)||jsonb_build_object('id',gen_random_uuid(),'code','TEST-BI-'||gen_random_uuid(),'status','created')||p_patch)).* FROM core.bank_instructions b WHERE id=p_id
$$;
SELECT test.expect_error('D07 lệnh chi thiếu tài khoản bản ký bị chặn', $$SELECT test.clone_instruction(test.id('release'),'{"target_bank_account_id":null}')$$,'ck_instruction_signed_account');
SELECT test.expect_error('D09 webhook sai chữ ký không thể INSERT đã áp dụng', $$INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload,process_result) VALUES('bank_sim','D09-bad','deposit_received',false,'{}','applied')$$,'ck_webhook_applied_signature');
SELECT test.make_order('SEC-LATE','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('SEC-LATE','TC-M01','Trần Thu Hà');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='closed',close_reason='deposit_expired' WHERE id=test.id('SEC-LATE');
SELECT test.apply_bank_event(test.bank_receipt('SEC-LATE:receipt',13938000,'AGV TEST-SEC-LATE COC'));
SELECT test.check('D08 tiền muộn vào suspense có việc hoàn, cọc không tăng',
 EXISTS(SELECT 1 FROM core.bank_events WHERE id=test.id('SEC-LATE:receipt') AND apply_result='late_after_closed')
 AND EXISTS(SELECT 1 FROM ops.bank_return_tasks WHERE bank_event_id=test.id('SEC-LATE:receipt'))
 AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('SEC-LATE') AND account_type='deposit_escrow' AND balance_vnd>0));
-- Sự kiện chưa requery nhưng đúng chữ ký đi qua bank role: chặn vì đúng điều kiện D09.
INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) VALUES('bank_sim','D09-no-api','deposit_received',true,'{}');
INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,payment_ref,occurred_at)
SELECT test.id('D09-no-api'),'bank_sim','D09-no-api',id,'deposit_received',1,'unmatched',now() FROM evt.inbound_webhooks WHERE provider_event_id='D09-no-api';
SELECT test.expect_error('D09 bank worker thiếu tra lại API vẫn bị chặn', $$SELECT test.apply_bank_event(test.id('D09-no-api'))$$,'ck_bank_requery');
SELECT test.expect_error('D09 không chèn bank event đã áp dụng thiếu API', $$INSERT INTO core.bank_events(provider,provider_event_id,kind,amount_vnd,occurred_at,applied_at) VALUES('bank_sim','D09-fake-applied','statement_line',1,now(),now())$$,'ck_bank_requery');
-- Khoản mới để thử tiền/OTP, khác các nghĩa vụ đã nhận ở các test trước.
SELECT test.make_order('SEC-PAY','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('SEC-PAY','TC-M01','Trần Thu Hà');
SELECT test.fund_order('SEC-PAY');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
VALUES(test.id('SEC-PAY:dp'),'TEST-SEC-PAY',test.id('SEC-PAY'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),100,'after_days','due');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes,canonical_content)
VALUES(test.id('SEC-PAY:cash-receipt'),'TEST-CASH-RECEIPT','evidence',test.org('TC-B01'),test.id('SEC-PAY'),'TEST-CASH-RECEIPT',1,digest('receipt','sha256'),digest('receipt','sha256'),'test/cash-receipt','image/jpeg',1,jsonb_build_object('payment_id',test.id('SEC-PAY:dp'),'amount_vnd',100));
CREATE FUNCTION test.confirm_sec(p_ref text,p_otp text,p_amount bigint DEFAULT 100,p_method text DEFAULT 'bank_transfer',p_receipt uuid DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id,method,receipt_document_id)
VALUES(test.id('SEC-PAY:dp'),'full',p_amount,p_ref,test.person('Nguyễn Thị Năm'),p_otp,p_method,p_receipt)
$$;
SELECT test.expect_error('D10 OTP đúng nhưng chuyển khoản thiếu mã vẫn bị chặn', $$SELECT test.confirm_sec(NULL,test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()))$$,'ck_confirmation_evidence');
SELECT test.expect_error('D10 tiền mặt OTP đúng nhưng thiếu biên nhận vẫn bị chặn', $$SELECT test.confirm_sec(NULL,test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()),100,'cash')$$,'ck_confirmation_evidence');
SELECT test.sign_cash_receipt(test.id('SEC-PAY:cash-receipt'));
SELECT test.expect_ok('D10 tiền mặt có biên nhận và OTP nhận tiền qua', $$SELECT test.confirm_sec(NULL,test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()),100,'cash',test.id('SEC-PAY:cash-receipt'))$$);
SELECT test.expect_error('D10 biên nhận tiền mặt đơn khác không được dùng', $$SELECT test.confirm_sec(NULL,test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()),100,'cash',test.id('LS3:evidence'))$$,'ck_cash_receipt_scope');
SELECT test.expect_error('D15 OTP bịa cho xác nhận tiền bị chặn', $$SELECT test.confirm_sec('OTP-FAKE','fake')$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP tiền khác số tiền bị chặn', $$SELECT test.confirm_sec('OTP-WRONG-AMOUNT',test.payment_otp(test.id('SEC-PAY:dp'),99,ref.ctx_user()))$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP tiền người khác bị chặn', $$SELECT test.confirm_sec('OTP-WRONG-USER',test.payment_otp(test.id('SEC-PAY:dp'),100,test.person('Lê Thị Lan')))$$,'ck_otp_verified_binding');
CREATE TABLE test.otp_saved(id text);
INSERT INTO test.otp_saved SELECT test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user());
SELECT test.confirm_sec('OTP-VALID',(SELECT id FROM test.otp_saved));
SELECT test.check('D15 OTP nhận tiền tiêu thụ một lần',EXISTS(SELECT 1 FROM evt.otp_challenges WHERE id=(SELECT id FROM test.otp_saved) AND used_at IS NOT NULL));
SELECT test.expect_error('D15 thử dùng lại OTP bị chặn', $$SELECT evt.consume_otp((SELECT id FROM test.otp_saved),test.person('Nguyễn Thị Năm'),'money_received',core.payment_binding(test.id('SEC-PAY:dp'),100))$$,'ck_otp_verified_binding');
-- Kiểm OTP chữ ký trên doc mới, các lỗi đúng binding.
SELECT test.make_order('SEC-SIGN','TC-M01','Trần Thu Hà','spot');
SELECT test.context('Trần Thu Hà','TC-M01','buyer');
CREATE FUNCTION test.sign_sec(p_otp text) RETURNS void LANGUAGE sql AS $$
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
SELECT id,'buyer',test.person('Trần Thu Hà'),test.org('TC-M01'),'otp',content_sha256,p_otp,'test-device' FROM core.documents WHERE id=test.id('SEC-SIGN:contract')
$$;
SELECT test.expect_error('D15 OTP chữ ký bịa bị chặn', $$SELECT test.sign_sec('fake')$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP chưa xác minh bị chặn', $$DO $b$ DECLARE c text:='unverified'; BEGIN PERFORM cmd.record_otp(c,ref.ctx_user(),'contract_sign',core.signature_binding(test.id('SEC-SIGN:contract')),digest('MAC','sha256')); PERFORM test.sign_sec(c); END $b$;$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP hợp đồng phiên bản khác bị chặn', $$SELECT test.sign_sec(test.otp(test.id('LS4:contract'),ref.ctx_user()))$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP hết hạn bị chặn', $$DO $b$ DECLARE c text:=test.otp(test.id('SEC-SIGN:contract'),ref.ctx_user()); BEGIN UPDATE evt.otp_challenges SET created_at=now()-interval '10 minutes',expires_at=now()-interval '5 minutes',verified_at=now()-interval '9 minutes' WHERE id=c; PERFORM test.sign_sec(c); END $b$;$$,'ck_otp_verified_binding');
SELECT test.expect_error('D15 OTP quá 5 lần sai bị chặn', $$DO $b$ DECLARE c text:='attempts'; BEGIN PERFORM cmd.record_otp(c,ref.ctx_user(),'contract_sign',core.signature_binding(test.id('SEC-SIGN:contract')),digest('MAC','sha256')); FOR i IN 1..5 LOOP PERFORM cmd.otp_verification(c,false); END LOOP; PERFORM test.sign_sec(c); END $b$;$$,'ck_otp_verified_binding');
SELECT test.sign_sec(test.otp(test.id('SEC-SIGN:contract'),ref.ctx_user()));
SELECT test.check('D15 chữ ký dùng OTP thật đã xác minh có FK',EXISTS(SELECT 1 FROM core.signatures s JOIN evt.otp_challenges c ON c.id=s.otp_challenge_id WHERE s.document_id=test.id('SEC-SIGN:contract') AND c.used_at IS NOT NULL));
-- D14 gán chủ cho helper, kể cả giả actor seller, vẫn bị chặn.
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('D14 người giúp không kiêm chủ cùng hộ', $$DO $b$ DECLARE mid uuid; BEGIN
 INSERT INTO core.memberships(org_id,user_id) SELECT test.org('TC-B01'),helper_user_id FROM core.delegations WHERE org_id=test.org('TC-B01') LIMIT 1 RETURNING id INTO mid;
 INSERT INTO core.membership_roles(membership_id,role_code,granted_by) VALUES(mid,'owner',test.person('Nguyễn Thị Năm')); END $b$;$$,'ck_helper_privileged_role');
-- D19 kiểm chuỗi với bytes JSONB gốc, không chỉ kiểm cấm UPDATE.
SELECT test.check('D19 mọi audit có chain và hash khớp',NOT EXISTS(SELECT 1 FROM evt.audit_log a LEFT JOIN evt.audit_chain c ON c.audit_id=a.id WHERE c.audit_id IS NULL OR c.row_sha256<>digest(c.previous_sha256||convert_to(evt.audit_payload(a),'UTF8'),'sha256')));
SELECT test.check('D19 chuỗi liên tục',NOT EXISTS(SELECT 1 FROM (SELECT previous_sha256,lag(row_sha256,1,decode(repeat('00',32),'hex')) OVER(ORDER BY seq) expected FROM evt.audit_chain)t WHERE previous_sha256<>expected));
SELECT test.expect_error('D19 app không TRUNCATE audit/chain', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; TRUNCATE evt.audit_chain; END $b$;$$,'42501');
SET CONSTRAINTS ALL IMMEDIATE;
