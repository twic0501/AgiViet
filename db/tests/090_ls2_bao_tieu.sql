-- LS-2: BT-2005 chưa có tiền; điều kiện TH-055 phải tạo từ ký, NH xác nhận, đợt 1.
SELECT test.check('LS2 seed BT2005 không tự có đơn/cọc/bút toán',
 (SELECT operational_order_id IS NULL FROM core.imported_offtake_plans WHERE code='BT-2005')
 AND NOT EXISTS(SELECT 1 FROM core.orders WHERE code='BT-2005')
 AND NOT EXISTS(SELECT 1 FROM ledger.transactions WHERE memo LIKE '%BT-2005%'));
SELECT test.check('LS2 KH2003 số dư đầu kỳ có nhãn nhập khẩu',EXISTS(SELECT 1 FROM core.framework_opening_exposures x JOIN core.framework_contracts f ON f.id=x.framework_id WHERE f.code='KH-2003' AND source_key='du-lieu-ao.json' AND unpaid_delivered_vnd=1160000));
SELECT set_config('app.test_time','2026-11-04 07:00+07',true);
SELECT test.make_order('BT2005','TC-M04','Đặng Quốc Việt','offtake',
 '{"qty_min":9000000,"qty_max":9000000,"unit_price_vnd":18000,"downgrade_price_vnd":9000,"deposit_price_vnd":18000,
 "contract_value_vnd":162000000,"deposit_basis_vnd":162000000,"price_mode":"formula","price_formula":{"ref_bps":9000,"floor":18000},
 "deposit_rule":"per_unit","deposit_bps":0,"deposit_vnd":9000000,"fee_bps":0,"fee_vnd":0,
 "delivery_mode":"at_buyer_warehouse","acceptance_point":"tai_kho_ben_mua","transport_by":"seller",
 "acceptance_facility_id":null,"designated_receiver_user_id":null,"payment_timing":"after_days","pay_after_days":7}');
SELECT test.sign_order('BT2005','TC-M04','Đặng Quốc Việt');
SELECT test.expect_error('LS2 chưa ngân hàng xác nhận thì không active', $$UPDATE core.orders SET status='active' WHERE id=test.id('BT2005')$$,'ck_order_deposit');
SELECT test.fund_order('BT2005');
UPDATE core.imported_offtake_plans SET operational_order_id=test.id('BT2005') WHERE code='BT-2005';
SELECT test.check('LS2 ngân hàng xác nhận cọc vụ đúng 9 triệu',
 (SELECT balance_vnd=9000000 FROM ledger.v_account_balances WHERE order_id=test.id('BT2005') AND account_type='deposit_escrow')
 AND EXISTS(SELECT 1 FROM core.bank_events WHERE id=test.id('BT2005:receipt') AND requery_status='confirmed' AND applied_at IS NOT NULL));
SELECT test.start_delivery('BT2005',1,3000000,'TC-M04','Đặng Quốc Việt');
INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd)
VALUES(test.id('BT2005:accept:1'),1,test.id('BT2005:lot'),'accepted',3000000,3000000,18000,54000000);
SELECT test.close_delivery('BT2005',1,'TC-M04','Đặng Quốc Việt',3000000);
INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis)
VALUES(test.id('BT2005'),'materials_offset','seller',5000000,'{"batch_no":1,"source":"advance_materials"}');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at)
VALUES(test.id('BT2005:pay1'),'TEST-BT2005-DOT1',test.id('BT2005'),'goods_batch','buyer_to_seller',test.org('TC-M04'),test.org('TC-B01'),49000000,'after_days','due',now()+interval '7 days');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id)
VALUES(test.id('BT2005:pay1'),'full',49000000,'BT2005-DOT1',ref.ctx_user(),test.payment_otp(test.id('BT2005:pay1'),49000000,ref.ctx_user()));
SELECT test.check('LS2 chốt đợt1 3000kg, nhận 49 triệu, giữ nguyên cọc vụ',
 (SELECT status='closed' AND planned_qty=3000000 FROM core.deliveries WHERE id=test.id('BT2005:batch:1'))
 AND (SELECT status='fully_received' FROM core.direct_payments WHERE id=test.id('BT2005:pay1'))
 AND (SELECT balance_vnd=9000000 FROM ledger.v_account_balances WHERE order_id=test.id('BT2005') AND account_type='deposit_escrow'));
SELECT test.check('LS2 mọi bút toán đợt1 cân, không tự dựng quyết toán cuối',
 NOT EXISTS(SELECT t.id FROM ledger.transactions t JOIN ledger.entries e ON e.transaction_id=t.id WHERE t.order_id=test.id('BT2005') GROUP BY t.id HAVING sum(e.amount_vnd)<>0)
 AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=test.id('BT2005')));
SET CONSTRAINTS ALL IMMEDIATE;
