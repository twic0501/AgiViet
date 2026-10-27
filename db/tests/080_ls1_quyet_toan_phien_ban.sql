SELECT set_config('app.test_time','2026-11-04 07:00+07',true);
SELECT test.make_order('LS1','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('LS1','TC-M01','Trần Thu Hà');
SELECT test.fund_order('LS1');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
 VALUES(test.id('LS1:goods'),'TEST-LS1-GOODS',test.id('LS1'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),32200000,'after_days','due');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id) VALUES(test.id('LS1:goods'),'full',32200000,test.person('Nguyễn Thị Năm'),'LS1-GOODS',test.payment_otp(test.id('LS1:goods'),32200000,ref.ctx_user()));
SELECT test.start_delivery('LS1',1,2000000,'TC-M01','Võ Hoàng Phúc');
INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code)
SELECT test.id('LS1:accept:1'),n,test.id('LS1:lot'),kind,qty,payable,price,value,reason FROM (VALUES
 (1::smallint,'accepted',1850000,1850000,23000,42550000,NULL::text),
 (2::smallint,'downgraded',120000,120000,15000,1800000,'TRAY_VO'),
 (3::smallint,'rejected',30000,0,0,0,'DAP'))t(n,kind,qty,payable,price,value,reason);
SELECT test.close_delivery('LS1',1,'TC-M01','Võ Hoàng Phúc',1970000);
SELECT ledger.move_qty(test.id('LS1:lot'),'in_transit','returned_pending','reject',30000,test.id('LS1'),'LS1:reject');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='awaiting_settlement' WHERE id=test.id('LS1');
INSERT INTO core.settlements(id,order_id,seq,is_final,v_vnd,d_vnd,c_vnd,n_vnd,c_nb_formula_vnd,release_vnd,refund_vnd,t_bm_vnd,t_nb_vnd,inputs)
VALUES(test.id('LS1:s1'),test.id('LS1'),1,true,44350000,32200000,13800000,44350000,12150000,12150000,1650000,0,0,'{"test":"TH047-v1"}');
SELECT test.instruction(test.id('LS1:release'),'TEST-LS1-RELEASE','release_deposit_to_seller',test.id('LS1'),test.id('LS1:deposit'),test.id('LS1:s1'),12150000);
SELECT test.instruction(test.id('LS1:refund'),'TEST-LS1-REFUND','refund_deposit_to_buyer',test.id('LS1'),test.id('LS1:deposit'),test.id('LS1:s1'),1650000,test.id('LS1:receipt'));
UPDATE core.bank_instructions SET status='sent' WHERE order_id=test.id('LS1');
SELECT test.context(NULL,NULL,'bank');
SELECT test.instruction_event('LS1-release-processing','TEST-LS1-RELEASE','instruction_processing',12150000);
SELECT test.instruction_event('LS1-refund-processing','TEST-LS1-REFUND','instruction_processing',1650000);
CREATE TABLE test.ls1_old_entries AS SELECT e.* FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id WHERE t.order_id=test.id('LS1');
CREATE TABLE test.ls1_old_instructions AS SELECT * FROM core.bank_instructions WHERE order_id=test.id('LS1');
-- BBNT v2 nối hash v1; lượng đúng 1950 + 20 + 30 = 2000 kg.
INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,prev_document_id,prev_content_sha256,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,status)
SELECT test.id('LS1:bbnt2'),'TEST-LS1-BBNT-V2',doc_type,owner_org_id,order_id,series_key,2,id,content_sha256,digest('LS1-bbnt2','sha256'),digest('pdf2','sha256'),'{"correction":"1950/20/30"}','test/no-real-pdf','application/pdf',1,'awaiting_signature'
FROM core.documents WHERE id=test.id('LS1:bbnt:1');
SELECT test.context('Võ Hoàng Phúc','TC-M01','buyer');
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
VALUES(test.id('LS1:bbnt2'),'buyer',test.person('Võ Hoàng Phúc'),test.org('TC-M01'),'otp',digest('LS1-bbnt2','sha256'),test.otp(test.id('LS1:bbnt2'),ref.ctx_user()),'device');
INSERT INTO core.acceptance_versions(id,delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by)
VALUES(test.id('LS1:accept2'),test.id('LS1:batch:1'),2,test.id('LS1:accept:1'),2000000,test.id('LS1:bbnt2'),test.person('Võ Hoàng Phúc'));
INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,replaces_line_id)
SELECT test.id('LS1:accept2'),n,test.id('LS1:lot'),t.kind,t.qty,t.payable,t.price,t.value,t.reason,old.id FROM (VALUES
 (1::smallint,'accepted',1950000,1950000,23000,44850000,NULL::text),
 (2::smallint,'downgraded',20000,20000,15000,300000,'TRAY_VO'),
 (3::smallint,'rejected',30000,0,0,0,'DAP'))t(n,kind,qty,payable,price,value,reason)
 JOIN core.acceptance_lines old ON old.acceptance_id=test.id('LS1:accept:1') AND old.line_no=n;
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
VALUES(test.id('LS1:bbnt2'),'seller',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'otp',digest('LS1-bbnt2','sha256'),test.otp(test.id('LS1:bbnt2'),ref.ctx_user()),'device');
UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=test.id('LS1:accept2');
SELECT test.context(NULL,NULL,'system');
UPDATE core.documents SET status='fully_signed' WHERE id=test.id('LS1:bbnt2');
CREATE FUNCTION test.ls1_revision(k text,version smallint,prev uuid,v bigint,xnb bigint,delta bigint) RETURNS void LANGUAGE sql AS $$
 INSERT INTO core.settlements(id,order_id,seq,previous_settlement_id,is_final,v_vnd,d_vnd,c_vnd,x_nb_vnd,n_vnd,c_nb_formula_vnd,release_vnd,refund_vnd,t_bm_vnd,t_nb_vnd,inputs)
 VALUES(test.id(k),test.id('LS1'),version,prev,true,v,32200000,13800000,xnb,v-xnb,0,0,0,greatest(delta,0),greatest(-delta,0),jsonb_build_object('test',k))
$$;
SELECT test.expect_error('LS1 không được bỏ liên kết bản trước', $$SELECT test.ls1_revision('bad',2::smallint,NULL,45150000,0,800000)$$,'ck_settlement_sequence');
SELECT test.expect_error('LS1 không được nối quyết toán đơn khác', $$SELECT test.ls1_revision('bad',2::smallint,test.id('settlement'),45150000,0,800000)$$,'ck_settlement_sequence');
SELECT test.expect_error('LS1 chặn chênh tiền sai và rollback cờ hiệu lực', $$SELECT test.ls1_revision('bad',2::smallint,test.id('LS1:s1'),45150000,0,799999)$$,'ck_settlement_delta');
SELECT test.check('LS1 bản cũ vẫn hiệu lực sau insert bị chặn',(SELECT is_effective FROM core.settlements WHERE id=test.id('LS1:s1')));
SELECT test.ls1_revision('LS1:s2',2::smallint,test.id('LS1:s1'),45150000,0,800000);
SELECT test.check('LS1 TH047 hai bản cuối, duy nhất v2 hiệu lực',(SELECT count(*)=2 AND count(*) FILTER(WHERE is_effective)=1 AND bool_and(NOT is_effective OR seq=2) FROM core.settlements WHERE order_id=test.id('LS1')));
SELECT test.check('LS1 TH047 tự tạo T_bm 800000, không chia lại cọc',EXISTS(SELECT 1 FROM core.direct_payments WHERE settlement_id=test.id('LS1:s2') AND kind='settlement_buyer_balance' AND amount_due_vnd=800000 AND status='due') AND (SELECT release_vnd=0 AND refund_vnd=0 FROM core.settlements WHERE id=test.id('LS1:s2')));
SELECT test.check('LS1 bút toán chênh 800000 cân hai vế',(SELECT count(*)=2 AND sum(e.amount_vnd)=0 AND max(e.amount_vnd)=800000 FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id WHERE t.settlement_id=test.id('LS1:s2')));
SELECT test.check('LS1 lệnh đang xử lý và bút toán cũ giữ nguyên',NOT EXISTS(SELECT * FROM test.ls1_old_entries EXCEPT SELECT e.* FROM ledger.entries e) AND NOT EXISTS(SELECT * FROM test.ls1_old_instructions EXCEPT SELECT * FROM core.bank_instructions));
SELECT test.expect_error('LS1 chặn lặp phiên bản', $$SELECT test.ls1_revision('bad',2::smallint,test.id('LS1:s1'),45150000,0,800000)$$,'ck_settlement_sequence');
SELECT test.expect_error('LS1 không tự tắt cờ hiệu lực', $$UPDATE core.settlements SET is_effective=false WHERE id=test.id('LS1:s2')$$,'ck_append_only');
SELECT test.expect_error('LS1 không sửa quyết toán cũ', $$UPDATE core.settlements SET inputs='{}' WHERE id=test.id('LS1:s1')$$,'ck_append_only');
SELECT test.expect_error('LS1 không phát lệnh từ bản đã thay', $$INSERT INTO core.bank_instructions SELECT (jsonb_populate_record(NULL::core.bank_instructions,to_jsonb(b)||jsonb_build_object('id',test.id('bad-bi'),'code','TEST-BAD-BI'))).* FROM core.bank_instructions b WHERE id=test.id('LS1:release')$$,'ck_instruction_settlement_version');
SELECT test.context(NULL,NULL,'bank');
SELECT test.instruction_event('LS1-release-ok','TEST-LS1-RELEASE','instruction_succeeded',12150000);
SELECT test.instruction_event('LS1-refund-ok','TEST-LS1-REFUND','instruction_succeeded',1650000);
SELECT test.context(NULL,NULL,'ops');
UPDATE core.bank_instructions SET status='reconciled' WHERE order_id=test.id('LS1');
SELECT test.context(NULL,NULL,'system');
SELECT test.expect_error('LS1 còn T_bm thì chưa hoàn tất', $$UPDATE core.orders SET status='completed' WHERE id=test.id('LS1')$$,'ck_order_debt');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id)
SELECT id,'full',800000,test.person('Nguyễn Thị Năm'),'LS1-ADJ2',test.payment_otp(id,800000,ref.ctx_user()) FROM core.direct_payments WHERE settlement_id=test.id('LS1:s2');
SELECT test.context(NULL,NULL,'system');
-- Bản 23: tiền đã xong nhưng còn 30 kg hàng trả lại thì chưa Hoàn tất toàn bộ.
SELECT test.expect_error('B23 còn hàng trả lại thì chưa hoàn tất', $$UPDATE core.orders SET status='completed' WHERE id=test.id('LS1')$$,'ck_open_dossiers');
SELECT test.check('B23 hồ sơ mở chỉ còn hàng trả lại 30000 g',(SELECT string_agg(kind,',')='hang_tra_lai' FROM core.open_dossiers(test.id('LS1'))));
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT cmd.create_return_lot(test.id('LS1'),30000,(SELECT l.grade_code FROM core.lots l JOIN core.orders o ON o.lot_id=l.id WHERE o.id=test.id('LS1')),'TEST-LS1-TRA-LAI');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='completed' WHERE id=test.id('LS1');
SELECT test.check('LS1 TH047 hoàn tất, người bán nhận 45150000',(SELECT sum(e.amount_vnd)=45150000 FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id JOIN ledger.accounts a ON a.id=e.account_id WHERE t.order_id=test.id('LS1') AND a.account_type='external' AND a.org_id=test.org('TC-B01')));
-- Sửa tiếp theo hướng giảm N sau khi tiền đã đi: chỉ phát sinh hoàn ngoài app.
INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis) VALUES(test.id('LS1'),'inspection_fee','seller',1000000,'{"test":"correction"}');
SELECT test.ls1_revision('LS1:s3',3::smallint,test.id('LS1:s2'),45150000,1000000,-1000000);
SELECT test.check('LS1 chênh âm thành T_nb, mở lại nhãn công nợ',EXISTS(SELECT 1 FROM core.direct_payments WHERE settlement_id=test.id('LS1:s3') AND direction='seller_to_buyer' AND amount_due_vnd=1000000) AND (SELECT status='outstanding' FROM core.orders WHERE id=test.id('LS1')));
SELECT test.expect_error('LS1 không hủy nghĩa vụ điều chỉnh', $$UPDATE core.direct_payments SET status='cancelled' WHERE settlement_id=test.id('LS1:s3')$$,'ck_settlement_obligation');
SELECT test.context('Lê Thị Lan','TC-M01','buyer');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id)
SELECT id,'full',1000000,test.person('Lê Thị Lan'),'LS1-ADJ3',test.payment_otp(id,1000000,ref.ctx_user()) FROM core.direct_payments WHERE settlement_id=test.id('LS1:s3');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='completed' WHERE id=test.id('LS1');
SELECT test.ls1_revision('LS1:s4',4::smallint,test.id('LS1:s3'),45150000,1000000,0);
SELECT test.check('LS1 chênh 0 không tạo tiền hoặc nghĩa vụ mới',NOT EXISTS(SELECT 1 FROM core.direct_payments WHERE settlement_id=test.id('LS1:s4')) AND NOT EXISTS(SELECT 1 FROM ledger.transactions WHERE settlement_id=test.id('LS1:s4')));
SET CONSTRAINTS ALL IMMEDIATE;
