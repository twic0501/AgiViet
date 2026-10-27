SELECT test.make_order('SEC-EXCESS','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('SEC-EXCESS','TC-M01','Trần Thu Hà');
SELECT test.apply_bank_event(test.bank_receipt('SEC-EXCESS:ev',14938000,'AGV TEST-SEC-EXCESS COC'));
SELECT test.context(NULL,NULL,'system');
CREATE FUNCTION test.excess_instruction(p_patch jsonb DEFAULT '{}') RETURNS void LANGUAGE sql AS $$
INSERT INTO core.bank_instructions
SELECT (jsonb_populate_record(NULL::core.bank_instructions,
 jsonb_build_object('id',gen_random_uuid(),'code','TEST-EXCESS-'||gen_random_uuid(),'kind','refund_excess','deposit_id',test.id('SEC-EXCESS:deposit'),
 'order_id',test.id('SEC-EXCESS'),'basis_kind','excess','basis_id',test.id('SEC-EXCESS:ev'),'amount_vnd',1000000,
 'target_org_id',test.org('TC-M01'),'target_bank_code','TEST','target_account_masked','****0001','target_account_holder','DONG XANH',
 'source_bank_event_id',test.id('SEC-EXCESS:ev'),'target_account_hash',digest('TEST-PAYER','sha256'),
 'status','created','created_at',now(),'updated_at',now(),'version',1,'status_changed_at',now(),'is_manual',false)||p_patch)).*
$$;
SELECT test.check('D17 sự kiện ghi riêng 1 triệu nộp thừa',(SELECT excess_vnd=1000000 FROM core.bank_events WHERE id=test.id('SEC-EXCESS:ev')));
SELECT test.expect_ok('D17 D18 hoàn thừa có căn cứ thật và đúng nguồn vẫn qua', $$DO $b$ BEGIN PERFORM test.excess_instruction(); SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);
SELECT test.expect_error('D17 căn cứ thừa bịa bị chặn', $$SELECT test.excess_instruction(jsonb_build_object('basis_id',test.id('fake-excess')))$$,'ck_instruction_excess');
SELECT test.expect_error('D17 thừa 1 triệu không hoàn 1000001', $$SELECT test.excess_instruction('{"amount_vnd":1000001}')$$,'ck_instruction_excess');
SELECT test.expect_error('D18 hoàn về hash tài khoản khác bị chặn', $$SELECT test.excess_instruction(jsonb_build_object('target_account_hash',digest('OTHER','sha256')))$$,'ck_refund_source');
SELECT test.expect_error('D18 hoàn về ngân hàng khác bị chặn', $$SELECT test.excess_instruction('{"target_bank_code":"OTHER"}')$$,'ck_refund_source');
SELECT test.expect_error('D17 hoàn phí không có căn cứ bị chặn', $$SELECT test.excess_instruction(jsonb_build_object('kind','refund_fee','basis_kind','fee_refund','basis_id',test.id('fake-fee'),'amount_vnd',1000))$$,'ck_instruction_fee_refund');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.cancellation_requests(id,order_id,requested_by_org_id,requested_by_user_id,reason_kind)
VALUES(test.id('SEC-EXCESS:cancel'),test.id('SEC-EXCESS'),ref.ctx_org(),ref.ctx_user(),'seller_request');
UPDATE core.cancellation_requests SET status='processing_money' WHERE id=test.id('SEC-EXCESS:cancel');
SELECT test.context(NULL,NULL,'system');
SELECT test.expect_ok('D17 hoàn phí Q06 người bán xin hủy có căn cứ qua', $$DO $b$ BEGIN PERFORM test.excess_instruction(jsonb_build_object('kind','refund_fee','basis_kind','cancellation','basis_id',test.id('SEC-EXCESS:cancel'),'amount_vnd',138000)); SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);
SELECT test.expect_error('D17 người mua xin hủy không được hoàn phí', $$DO $b$ BEGIN UPDATE core.cancellation_requests SET reason_kind='buyer_request' WHERE id=test.id('SEC-EXCESS:cancel'); PERFORM test.excess_instruction(jsonb_build_object('kind','refund_fee','basis_kind','cancellation','basis_id',test.id('SEC-EXCESS:cancel'),'amount_vnd',138000)); END $b$;$$,'ck_instruction_fee_refund');
SELECT test.expect_error('D17 hoàn phí không vượt phần được hoàn', $$SELECT test.excess_instruction(jsonb_build_object('kind','refund_fee','basis_kind','cancellation','basis_id',test.id('SEC-EXCESS:cancel'),'amount_vnd',138001))$$,'ck_instruction_fee_refund');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('D14 không cấp ủy quyền giúp cho chủ hiện hành', $$INSERT INTO core.delegations(org_id,principal_user_id,helper_user_id,actions,valid_during) VALUES(test.org('TC-B01'),test.person('Trần Thu Hà'),test.person('Nguyễn Thị Năm'),ARRAY['view'],tstzrange(now(),now()+interval '1 day'))$$,'ck_helper_privileged_role');
-- Cấp vai mới có cooling, thông báo backup_contact trong outbox.
INSERT INTO core.memberships(id,org_id,user_id) VALUES(test.id('new-fin-role'),test.org('TC-B01'),test.person('Trần Thu Hà'));
INSERT INTO core.membership_roles(membership_id,role_code,granted_by) VALUES(test.id('new-fin-role'),'accountant',test.person('Nguyễn Thị Năm'));
SELECT test.check('D14 vai tiền mới chưa được dùng trong 24 giờ',EXISTS(SELECT 1 FROM core.membership_role_grants WHERE membership_id=test.id('new-fin-role') AND effective_at>=now()+interval '24 hours') AND NOT EXISTS(SELECT 1 FROM core.membership_roles WHERE membership_id=test.id('new-fin-role')));
SELECT test.check('D14 cấp vai có thông báo backup qua outbox',EXISTS(SELECT 1 FROM evt.domain_events e JOIN evt.outbox ob ON ob.event_id=e.id WHERE e.event_type='membership.privilege_cooling' AND e.payload->>'recipient'='backup_contact' AND ob.destination='notify'));
-- Runtime thật: đổi session_user sang login chỉ kế thừa app, command tự gắn người nhận từ mapping.
CREATE ROLE agiviet_test_seller LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO agiviet_test_seller;
INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind) VALUES('agiviet_test_seller',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'seller');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
VALUES(test.id('SEC-EXCESS:dp'),'TEST-REAL-LOGIN',test.id('SEC-EXCESS'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),500,'after_days','due');
SELECT set_config('test.payment_id',test.id('SEC-EXCESS:dp')::text,true),set_config('test.otp_id',test.payment_otp(test.id('SEC-EXCESS:dp'),500,test.person('Nguyễn Thị Năm')),true);
SELECT set_config('test.original_auth',session_user,true);
SET LOCAL SESSION AUTHORIZATION agiviet_test_seller;
SELECT set_config('app.actor_kind','bank',true),set_config('app.user_id','00000000-0000-0000-0000-000000000000',true);
SELECT cmd.confirm_direct_payment(current_setting('test.payment_id')::uuid,500,'full','REAL-LOGIN-PAY',current_setting('test.otp_id'));
RESET SESSION AUTHORIZATION;
RESET ROLE;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.original_auth')); END $$;
RESET ROLE;
SELECT test.check('D01 command ghi chạy qua login app không owner, không tin GUC',EXISTS(SELECT 1 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('SEC-EXCESS:dp') AND confirmed_by=test.person('Nguyễn Thị Năm')));
-- D11: chứng cứ đủ thì kiểm đúng cửa sổ ngày (không bị che bởi D04).
SELECT test.expect_error('D11 đủ duyệt nhưng ghi năm2020 không có ngoại lệ bị chặn', $$DO $b$ DECLARE tid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid(); BEGIN
 INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(did,'ledger_correction','ledger_transaction',tid,test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí'),'Test backdate',test.id('LS3:evidence'),'{}');
 INSERT INTO ledger.transactions(id,kind,idempotency_key,memo,posted_by,approved_by,decision_id,effective_at)
 VALUES(tid,'manual_adjustment','backdate-test','Test backdate',test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí'),did,'2020-01-01'); END $b$;$$,'ck_ledger_effective_window');
SET CONSTRAINTS ALL DEFERRED;
SELECT test.expect_ok('D11 ngoại lệ ngày cũ có quyết định hai người vẫn qua', $$DO $b$ DECLARE tid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid(); BEGIN
 INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(did,'ledger_correction','ledger_transaction',tid,test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí'),'Có ngoại lệ backdate',test.id('LS3:evidence'),'{"allow_backdate":true}');
 INSERT INTO ledger.transactions(id,kind,idempotency_key,memo,posted_by,approved_by,decision_id,effective_at)
 VALUES(tid,'manual_adjustment','backdate-approved','Ngoại lệ',test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí'),did,'2020-01-01');
 INSERT INTO ledger.entries(transaction_id,line_no,account_id,amount_vnd)
 VALUES(tid,1,ledger.account_of('suspense',NULL,NULL),1),(tid,2,ledger.account_of('external_unidentified',NULL,NULL),-1);
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);
DO $$ DECLARE e uuid; BEGIN
 SET LOCAL ROLE agiviet_bank_worker;
 e:=cmd.record_bank_event(jsonb_build_object('provider','bank_sim','provider_event_id','CMD-BANK-VALID','event_type','deposit_received','signature_valid',true,'payload',jsonb_build_object('simulator',true)),
 jsonb_build_object('kind','deposit_received','amount_vnd',1,'payment_ref','unmatched-cmd','occurred_at',now(),'requeried_at',now(),'requery_status','confirmed','requery_evidence',jsonb_build_object('simulator',true)));
 PERFORM core.apply_bank_event(e);
 RESET ROLE;
 PERFORM test.check('D01 bank worker gọi command nhận và áp sự kiện hợp lệ',EXISTS(SELECT 1 FROM core.bank_events WHERE id=e AND applied_at IS NOT NULL AND apply_result='unmatched_suspense'));
END $$;

SET CONSTRAINTS ALL IMMEDIATE;

SET LOCAL timezone='UTC';
SELECT test.check('D19 xuất hash ổn định khi đổi timezone',NOT EXISTS(SELECT 1 FROM evt.audit_log a JOIN evt.audit_chain c ON c.audit_id=a.id WHERE c.row_json<>evt.audit_payload(a) OR c.row_sha256<>digest(c.previous_sha256||convert_to(evt.audit_payload(a),'UTF8'),'sha256')));
SET LOCAL timezone='Asia/Ho_Chi_Minh';
