CREATE FUNCTION test.command_order(k text,buyer_code text,buyer_name text,ctype text,terms jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql AS $$
DECLARE b pii.bank_accounts%ROWTYPE;
BEGIN
 SELECT * INTO b FROM pii.bank_accounts WHERE org_id=test.org('TC-B01') AND status='active';
 PERFORM test.make_order(k,buyer_code,buyer_name,ctype,terms||jsonb_build_object('seller_bank_account_id',b.id,'seller_bank_code',b.bank_code,'seller_account_masked',b.account_masked,'seller_account_holder',b.holder_name));
END $$;
SELECT set_config('app.test_time','',true);
-- Fixture tạo đơn + chữ ký/ngân hàng bằng helper cũ; mọi bước đang kiểm chạy login runtime.
SELECT test.command_order('C40BUY','TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()-interval '1 hour',now()+interval '3 days')));
SELECT test.sign_order('C40BUY','TC-M01','Trần Thu Hà'); SELECT test.fund_order('C40BUY');
SELECT set_config('test.c40.order',test.id('C40BUY')::text,true);
-- Đã trả thẳng 1 triệu: phải có nghĩa vụ hoàn, không bỏ tiền khỏi quyền đòi.
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
VALUES(test.id('C40BUY:direct'),'C40BUY-DIRECT',test.id('C40BUY'),'goods_before_loading','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),1000000,'order_active','due');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id)
VALUES(test.id('C40BUY:direct'),'full',1000000,'C40BUY-DIRECT-REF',ref.ctx_user(),test.payment_otp(test.id('C40BUY:direct'),1000000,ref.ctx_user()));
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c40.cancel',cmd.request_cancel(current_setting('test.c40.order')::uuid,'buyer_request','Bên mua xin hủy')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.answer_cancel(current_setting('test.c40.cancel')::uuid,true)$$);
SELECT set_config('test.c40.document',test.command_doc('C40BUY-CANCEL')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C40 app không tự hạch toán hủy','SELECT cmd.process_cancellation(current_setting(''test.c40.cancel'')::uuid,current_setting(''test.c40.document'')::jsonb)','42501')$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c40.cancel_doc',cmd.process_cancellation(current_setting('test.c40.cancel')::uuid,current_setting('test.c40.document')::jsonb)::text,true)$$);
SELECT test.check('C40 hủy bên mua: ghi N bằng cọc, chi đúng cọc và hoàn toàn bộ D',EXISTS(SELECT 1 FROM core.cancellation_accountings a WHERE cancellation_id=current_setting('test.c40.cancel')::uuid AND n_vnd=c_vnd AND release_vnd=c_vnd AND refund_vnd=0 AND t_nb_vnd=1000000 AND fee_refund_vnd=0) AND EXISTS(SELECT 1 FROM core.direct_payments WHERE order_id=test.id('C40BUY') AND kind='seller_refund' AND amount_due_vnd=1000000));
SELECT test.check('C40 hạch toán quyền đòi đủ, lượng cam kết đã nhả',EXISTS(SELECT 1 FROM ledger.transactions WHERE kind='cancellation_accrual' AND order_id=test.id('C40BUY')) AND NOT EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=test.id('C40BUY:lot') AND bucket='committed' AND qty<>0));
SELECT test.as_login('db_test_system',$$SELECT cmd.process_cancellation(current_setting('test.c40.cancel')::uuid,current_setting('test.c40.document')::jsonb)$$);
SELECT test.check('C40 retry không nhân bút toán hoặc lệnh',(SELECT count(*)=1 FROM ledger.transactions WHERE kind='cancellation_accrual' AND order_id=test.id('C40BUY')) AND (SELECT count(*)=1 FROM core.bank_instructions WHERE basis_kind='cancellation' AND basis_id=current_setting('test.c40.cancel')::uuid));
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C40 retry hủy khác chứng từ bị chặn','SELECT cmd.process_cancellation(current_setting(''test.c40.cancel'')::uuid,current_setting(''test.c40.document'')::jsonb||jsonb_build_object(''content_sha256'',''\\x''||repeat(''ff'',32)))','IDEMPOTENCY_CONFLICT')$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c40.finish',cmd.finish_cancellation(current_setting('test.c40.cancel')::uuid),true)$$);
SELECT test.check('C40 chưa có callback/hoàn D chưa đóng hủy',current_setting('test.c40.finish')='processing_money' AND (SELECT status='active' FROM core.orders WHERE id=test.id('C40BUY')));
-- Thành công lệnh qua bank worker thật (receipt giả lập API trong test).
SELECT set_config('test.c40.instruction',(SELECT id::text FROM core.bank_instructions WHERE basis_id=current_setting('test.c40.cancel')::uuid),true);
SELECT test.as_login('db_test_system',$$SELECT cmd.send_instruction(current_setting('test.c40.instruction')::uuid)$$);
SELECT test.instruction_event('C40BUY-PAID',(SELECT code FROM core.bank_instructions WHERE id=current_setting('test.c40.instruction')::uuid),'instruction_succeeded',(SELECT amount_vnd FROM core.bank_instructions WHERE id=current_setting('test.c40.instruction')::uuid));
SELECT set_config('test.c40.proof',test.command_statement('C40BUY-STATEMENT',current_setting('test.c40.instruction')::uuid)::text,true);
SELECT test.as_login('db_test_system',$$SELECT cmd.reconcile_instruction(current_setting('test.c40.instruction')::uuid,current_setting('test.c40.proof')::uuid)$$);
SELECT set_config('test.c40.refund',(SELECT id::text FROM core.direct_payments WHERE order_id=test.id('C40BUY') AND kind='seller_refund'),true);
SELECT set_config('test.c40.otp',test.payment_otp(current_setting('test.c40.refund')::uuid,1000000,test.person('Lê Thị Lan')),true);
SELECT test.as_login('db_test_payer',$$SELECT cmd.confirm_direct_payment(current_setting('test.c40.refund')::uuid,1000000,'full','C40BUY-REFUND',current_setting('test.c40.otp'),'bank_transfer',NULL)$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c40.finish',cmd.finish_cancellation(current_setting('test.c40.cancel')::uuid),true)$$);
SELECT test.check('C40 chỉ đóng sau đối soát + nhận D; sổ quyền đòi và cọc bằng 0',current_setting('test.c40.finish')='done' AND (SELECT status='closed' FROM core.orders WHERE id=test.id('C40BUY')) AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('C40BUY') AND account_type IN ('seller_receivable','buyer_payable','deposit_escrow','deposit_in_instruction','fee_held') AND balance_vnd<>0));
-- Hủy bên bán: hoàn C + phí chia về đúng nguồn, không ghi forfeiture.
SELECT test.command_order('C40SELL','TC-M01','Trần Thu Hà','spot'); SELECT test.sign_order('C40SELL','TC-M01','Trần Thu Hà'); SELECT test.fund_order('C40SELL');
SELECT set_config('test.c40.order',test.id('C40SELL')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c40.cancel',cmd.request_cancel(current_setting('test.c40.order')::uuid,'seller_request','Bên bán xin hủy')::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.answer_cancel(current_setting('test.c40.cancel')::uuid,true)$$);
SELECT set_config('test.c40.document',test.command_doc('C40SELL-CANCEL')::text,true);
SELECT test.as_login('db_test_system',$$SELECT cmd.process_cancellation(current_setting('test.c40.cancel')::uuid,current_setting('test.c40.document')::jsonb)$$);
SELECT test.check('C40 hủy bên bán hoàn đủ cọc và phí, về đúng nguồn',EXISTS(SELECT 1 FROM core.cancellation_accountings a JOIN core.deposits d ON d.order_id=a.order_id WHERE a.order_id=test.id('C40SELL') AND a.forfeited_vnd=0 AND a.n_vnd=0 AND a.refund_vnd=d.expected_deposit_vnd AND a.fee_refund_vnd=d.expected_fee_vnd) AND (SELECT sum(amount_vnd)=(SELECT expected_deposit_vnd+expected_fee_vnd FROM core.deposits WHERE order_id=test.id('C40SELL')) FROM core.bank_instructions WHERE order_id=test.id('C40SELL')) AND NOT EXISTS(SELECT 1 FROM core.bank_instructions b JOIN core.bank_events e ON e.id=b.source_bank_event_id WHERE b.order_id=test.id('C40SELL') AND b.target_account_hash<>e.payer_account_hash));
SELECT test.expect_error('C40 accounting hủy bất biến',$$UPDATE core.cancellation_accountings SET n_vnd=1 WHERE order_id=test.id('C40SELL')$$,'ck_append_only');
-- Phụ lục: hai bên phải đồng ý và ký trước khi tác động tiền/lượng.
SELECT test.command_order('C41','TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()+interval '4 days',now()+interval '5 days')));
SELECT test.sign_order('C41','TC-M01','Trần Thu Hà'); SELECT test.fund_order('C41');
INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id) SELECT 'C41-D1',test.id('C41'),1,1,qty_min,delivery_window,test.person('Trần Thu Hà') FROM core.order_versions WHERE order_id=test.id('C41');
SELECT set_config('test.c41.order',test.id('C41')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c41.amend',cmd.propose_amendment(current_setting('test.c41.order')::uuid,'decrease_qty','{"qty_g":1000000,"reason":"Giảm một nửa"}')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C41 bên gửi không tự đồng ý','SELECT cmd.answer_amendment(current_setting(''test.c41.amend'')::uuid,''accept'',''{}'')','KHONG_CO_QUYEN')$$);
SELECT set_config('test.c41.document',test.command_doc('C41-ANNEX')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c41.doc',cmd.answer_amendment(current_setting('test.c41.amend')::uuid,'accept',current_setting('test.c41.document')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C41 chưa ký không áp phụ lục','SELECT cmd.apply_signed_amendment(current_setting(''test.c41.amend'')::uuid)','ck_order_version_signed')$$);
SELECT set_config('test.c41.otp',test.otp(current_setting('test.c41.doc')::uuid,test.person('Trần Thu Hà')),true);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.sign_document(current_setting('test.c41.doc')::uuid,'buyer',current_setting('test.c41.otp'),'TEST')$$);
SELECT set_config('test.c41.otp',test.otp(current_setting('test.c41.doc')::uuid,test.person('Nguyễn Thị Năm')),true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.sign_document(current_setting('test.c41.doc')::uuid,'seller',current_setting('test.c41.otp'),'TEST')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.c41.amend')::uuid)$$);
SELECT test.check('C41 phụ lục giảm: lượng đúng một lần, cọc/phí hoàn ngay',EXISTS(SELECT 1 FROM core.orders WHERE id=test.id('C41') AND effective_version_no=2) AND EXISTS(SELECT 1 FROM core.deliveries WHERE code='C41-D1' AND planned_qty=1000000 AND version_no=2) AND (SELECT sum(amount_vnd)=6900000 FROM core.bank_instructions WHERE order_id=test.id('C41') AND kind='refund_deposit_to_buyer') AND EXISTS(SELECT 1 FROM core.contract_charges WHERE order_id=test.id('C41') AND kind='shortfall_penalty'));
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.c41.amend')::uuid)$$);
SELECT test.check('C41 retry không nhân lượng/phạt',(SELECT count(*)=1 FROM core.contract_charges WHERE order_id=test.id('C41') AND kind='shortfall_penalty') AND (SELECT qty=1000000 FROM ledger.qty_balances WHERE lot_id=test.id('C41:lot') AND order_key=test.id('C41') AND bucket='committed'));
SET CONSTRAINTS ALL IMMEDIATE;
