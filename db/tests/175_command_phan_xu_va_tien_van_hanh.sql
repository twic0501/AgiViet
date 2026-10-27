SELECT set_config('app.test_time','',true);
CREATE ROLE db_test_finance LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO db_test_finance;
INSERT INTO cmd.login_principals VALUES('db_test_finance',test.person('Đỗ Minh Trí'),test.org('AGV'),'ops',true);
GRANT USAGE ON SCHEMA test TO db_test_finance;
GRANT INSERT ON test.results TO db_test_finance;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_finance;
-- Tài chính lập/duyệt có đầy đủ proof, không dùng quyền owner cho lệnh nghiệp vụ.
SELECT test.command_order('C46PAY','TC-M01','Trần Thu Hà','spot'); SELECT test.sign_order('C46PAY','TC-M01','Trần Thu Hà'); SELECT test.fund_order('C46PAY');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
VALUES(test.id('C46PAY:DIRECT'),'C46PAY-DIRECT',test.id('C46PAY'),'goods_on_receipt','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),100,'acceptance_closed','due');
SELECT test.context('Trần Thu Hà','TC-M01','buyer');
UPDATE core.direct_payments SET status='payer_reported' WHERE id=test.id('C46PAY:DIRECT');
SELECT test.context(NULL,NULL,'system');
UPDATE core.direct_payments SET status='mismatch' WHERE id=test.id('C46PAY:DIRECT');
SELECT set_config('test.c46.order',test.id('C46PAY')::text,true),set_config('test.c46.payment',test.id('C46PAY:DIRECT')::text,true),set_config('test.c46.evidencedata',test.command_doc('C46PAY-EVIDENCE')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c46.evidence',cmd.attach_evidence(current_setting('test.c46.order')::uuid,current_setting('test.c46.evidencedata')::jsonb)::text,true)$$);
-- Adapter tạo sao kê binding đúng khoản và bên nhận. Chỉ bank worker được ghi proof.
SELECT set_config('test.c46.bankwebhook',jsonb_build_object('provider','bank_sim','provider_event_id','C46PAY-STATEMENT','event_type','statement_line','signature_valid',true,'payload','{}'::jsonb)::text,true),
 set_config('test.c46.bankevent',jsonb_build_object('kind','statement_line','amount_vnd',100,'bank_txn_ref','C46PAY-REF','occurred_at',now(),'requeried_at',now(),'requery_status','confirmed','requery_evidence',jsonb_build_object('direction','credit','recipient_org_id',test.org('TC-B01'),'payment_binding',core.payment_binding(test.id('C46PAY:DIRECT'),100)))::text,true);
SET LOCAL ROLE agiviet_bank_worker;
SELECT set_config('test.c46.proof',cmd.record_bank_event(current_setting('test.c46.bankwebhook')::jsonb,current_setting('test.c46.bankevent')::jsonb)::text,true);
RESET ROLE;
SELECT set_config('test.c46.detail',jsonb_build_object('amount_vnd',100,'result','full','bank_reference','C46PAY-REF','proof_id',current_setting('test.c46.proof')::uuid)::text,true);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c46.proposal',cmd.propose_decision('payment_reconciliation','direct_payment',current_setting('test.c46.payment')::uuid,'Đối soát API đã xác minh',current_setting('test.c46.evidence')::uuid,current_setting('test.c46.detail')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C46 người lập không tự duyệt quyết định','SELECT cmd.approve_decision(current_setting(''test.c46.proposal'')::uuid)','ck_decision_two_people')$$);
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('C46 supervisor thiếu finance/risk không duyệt đối soát','SELECT cmd.approve_decision(current_setting(''test.c46.proposal'')::uuid)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_finance',$$SELECT set_config('test.c46.decision',cmd.approve_decision(current_setting('test.c46.proposal')::uuid)::text,true)$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C46 không đổi số tiền sau duyệt','SELECT cmd.reconcile_direct_payment(current_setting(''test.c46.payment'')::uuid,99,''partial'',''C46PAY-REF'',current_setting(''test.c46.decision'')::uuid,current_setting(''test.c46.proof'')::uuid)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.reconcile_direct_payment(current_setting('test.c46.payment')::uuid,100,'full','C46PAY-REF',current_setting('test.c46.decision')::uuid,current_setting('test.c46.proof')::uuid)$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.reconcile_direct_payment(current_setting('test.c46.payment')::uuid,100,'full','C46PAY-REF',current_setting('test.c46.decision')::uuid,current_setting('test.c46.proof')::uuid)$$);
SELECT test.check('C46 hai người + API ghi tiền đúng một lần',(SELECT status='fully_received' FROM core.direct_payments WHERE id=test.id('C46PAY:DIRECT')) AND (SELECT count(*)=1 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('C46PAY:DIRECT')));
-- Lệnh hoàn thủ công cũng không chọn đích: detail đã duyệt chỉ có nguồn đã xác minh.
SELECT set_config('test.c46.detail',jsonb_build_object('kind','refund_deposit_to_buyer','amount_vnd',100,'source_event_id',test.id('C46PAY:receipt'))::text,true);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c46.proposal',cmd.propose_decision('manual_payment','order',current_setting('test.c46.order')::uuid,'Hoàn thủ công có quyết định',current_setting('test.c46.evidence')::uuid,current_setting('test.c46.detail')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.c46.manualdecision',cmd.approve_decision(current_setting('test.c46.proposal')::uuid)::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C46 khách không phát lệnh tiền vận hành','SELECT cmd.create_manual_instruction(current_setting(''test.c46.manualdecision'')::uuid)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.create_manual_instruction(current_setting('test.c46.manualdecision')::uuid)$$);
SELECT test.check('C46 lệnh thủ công giữ đúng nguồn và người lập duyệt',EXISTS(SELECT 1 FROM core.bank_instructions b JOIN core.bank_events e ON e.id=b.source_bank_event_id WHERE b.basis_id=current_setting('test.c46.manualdecision')::uuid AND b.is_manual AND b.created_by=test.person('Bùi Thị Thảo') AND b.approved_by=test.person('Nguyễn Hữu Tâm') AND b.target_account_hash=e.payer_account_hash AND b.amount_vnd=100));
-- TH-040b thật: đề nghị từ 25 giờ trước theo đồng hồ thử; quyết định vẫn giờ thật.
SELECT test.command_order('C46FM','TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()+interval '4 days',now()+interval '5 days'))); SELECT test.sign_order('C46FM','TC-M01','Trần Thu Hà'); SELECT test.fund_order('C46FM');
INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window) SELECT 'C46FM-D1',order_id,1,1,qty_min,delivery_window FROM core.order_versions WHERE order_id=test.id('C46FM');
SELECT set_config('test.c46.fmorder',test.id('C46FM')::text,true),set_config('test.c46.fmevidencedata',test.command_doc('C46FM-EVIDENCE')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c46.fmevidence',cmd.attach_evidence(current_setting('test.c46.fmorder')::uuid,current_setting('test.c46.fmevidencedata')::jsonb)::text,true)$$);
INSERT INTO cmd.test_clock(at) VALUES(now()-interval '25 hours');
UPDATE core.orders SET policy_version=22 WHERE id=current_setting('test.c46.fmorder')::uuid; -- đơn chính sách cũ: kiểm đường ký thay cũ; bản 23 chặn, xem 250
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c46.amendment',cmd.propose_amendment(current_setting('test.c46.fmorder')::uuid,'force_majeure_reduction','{"qty_g":1000000,"reason":"Thiên tai thử"}',ARRAY[current_setting('test.c46.fmevidence')::uuid])::text,true)$$);
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c46.fmproposal',cmd.propose_decision('force_majeure_reduction','amendment',current_setting('test.c46.amendment')::uuid,'Đã xét chứng cứ thiên tai',current_setting('test.c46.fmevidence')::uuid,'{}')::text,true)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.c46.fmdecision',cmd.approve_decision(current_setting('test.c46.fmproposal')::uuid)::text,true)$$);
SELECT set_config('test.c46.fmdoc',(test.command_doc('C46FM-ANNEX')||jsonb_build_object('canonical_content',jsonb_build_object('operational_signature_notice','ký thay bằng quyết định vận hành '||current_setting('test.c46.fmdecision'))))::text,true);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C46 chỉ người duyệt được ký quyết định thay','SELECT cmd.prepare_operational_reduction(current_setting(''test.c46.amendment'')::uuid,current_setting(''test.c46.fmdecision'')::uuid,current_setting(''test.c46.fmdoc'')::jsonb)','ck_operational_signature')$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.c46.annex',cmd.prepare_operational_reduction(current_setting('test.c46.amendment')::uuid,current_setting('test.c46.fmdecision')::uuid,current_setting('test.c46.fmdoc')::jsonb)::text,true)$$);
SELECT test.check('C46 ký thay có ghi rõ quyết định và không giả OTP buyer',EXISTS(SELECT 1 FROM core.signatures WHERE document_id=current_setting('test.c46.annex')::uuid AND party='buyer' AND method='quyet_dinh_van_hanh' AND otp_challenge_id IS NULL));
-- Bản 23 (rà soát 70611c2): CÙNG đường TH-040b đủ điều kiện cũ (im lặng 25 giờ, quyết định hai người) nhưng đơn chính sách 23 → bị chặn.
SELECT test.command_order('V23FM','TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()+interval '4 days',now()+interval '5 days'))); SELECT test.sign_order('V23FM','TC-M01','Trần Thu Hà'); SELECT test.fund_order('V23FM');
INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window) SELECT 'V23FM-D1',order_id,1,1,qty_min,delivery_window FROM core.order_versions WHERE order_id=test.id('V23FM');
SELECT set_config('test.v23.order',test.id('V23FM')::text,true),set_config('test.v23.evidencedata',test.command_doc('V23FM-EVIDENCE')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.v23.evidence',cmd.attach_evidence(current_setting('test.v23.order')::uuid,current_setting('test.v23.evidencedata')::jsonb)::text,true)$$);
INSERT INTO cmd.test_clock(at) VALUES(now()-interval '25 hours');
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.v23.amendment',cmd.propose_amendment(current_setting('test.v23.order')::uuid,'force_majeure_reduction','{"qty_g":1000000,"reason":"Thiên tai thử"}',ARRAY[current_setting('test.v23.evidence')::uuid])::text,true)$$);
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.v23.proposal',cmd.propose_decision('force_majeure_reduction','amendment',current_setting('test.v23.amendment')::uuid,'Đã xét chứng cứ thiên tai',current_setting('test.v23.evidence')::uuid,'{}')::text,true)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.v23.decision',cmd.approve_decision(current_setting('test.v23.proposal')::uuid)::text,true)$$);
SELECT set_config('test.v23.doc',(test.command_doc('V23FM-ANNEX')||jsonb_build_object('canonical_content',jsonb_build_object('operational_signature_notice','ký thay bằng quyết định vận hành '||current_setting('test.v23.decision'))))::text,true);
SELECT test.check('B23 đơn mới mang chính sách 23',(SELECT policy_version=23 FROM core.orders WHERE id=test.id('V23FM')));
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('B23 ký thay bên mua im lặng bị chặn dù đủ điều kiện TH-040b cũ','SELECT cmd.prepare_operational_reduction(current_setting(''test.v23.amendment'')::uuid,current_setting(''test.v23.decision'')::uuid,current_setting(''test.v23.doc'')::jsonb)','ck_customer_consent')$$);
SELECT test.check('B23 phụ lục không có hiệu lực, đề nghị vẫn mở, phiên bản đơn giữ nguyên',
 (SELECT status='open' FROM core.amendments WHERE id=current_setting('test.v23.amendment')::uuid)
 AND (SELECT effective_version_no=1 FROM core.orders WHERE id=test.id('V23FM'))
 AND NOT EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=test.id('V23FM') AND version_no>1));
SELECT set_config('test.c46.otp',test.otp(current_setting('test.c46.annex')::uuid,test.person('Nguyễn Thị Năm')),true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.sign_document(current_setting('test.c46.annex')::uuid,'seller',current_setting('test.c46.otp'),'TEST')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.c46.amendment')::uuid)$$);
SELECT test.check('C46 bất khả kháng giảm lượng không phạt, hoàn chênh đúng',EXISTS(SELECT 1 FROM core.orders WHERE id=test.id('C46FM') AND effective_version_no=2) AND NOT EXISTS(SELECT 1 FROM core.contract_charges WHERE order_id=test.id('C46FM') AND kind='shortfall_penalty') AND (SELECT sum(amount_vnd)=6900000 FROM core.bank_instructions WHERE order_id=test.id('C46FM') AND kind='refund_deposit_to_buyer'));
SET CONSTRAINTS ALL IMMEDIATE;
