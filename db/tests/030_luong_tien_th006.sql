-- Luồng thực ghi DB: ký hai bên -> cọc thiếu/bổ sung -> trả thẳng -> nghiệm thu -> quyết toán -> lệnh ngân hàng.
SELECT test.context('Trần Thu Hà','TC-M01','buyer');
INSERT INTO core.orders(id,code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
SELECT test.id('order'),'TEST-HD2001','spot',test.org('TC-M01'),test.org('TC-B01'),'processor',product_id,id,1,'procurement',true,test.person('Trần Thu Hà') FROM core.lots WHERE code='L-0412';
INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,status)
VALUES(test.id('contract'),'TEST-HD2001-PDF','contract',test.org('TC-M01'),test.id('order'),'TEST-HD2001',1,digest('test-terms','sha256'),digest('test-pdf-bytes','sha256'),'{"test":true}','test/no-real-pdf','application/pdf',14,'awaiting_signature');
INSERT INTO core.order_versions(order_id,version_no,document_id,profile_version,qty_min,qty_max,qty_tolerance_bps,price_mode,unit_price_vnd,downgrade_price_vnd,ref_price_vnd,deposit_price_vnd,contract_value_vnd,deposit_basis_vnd,deposit_rule,deposit_bps,deposit_vnd,fee_rule,fee_bps,fee_floor_vnd,fee_cap_vnd,fee_vnd,payment_timing,seller_bank_account_id,seller_bank_code,seller_account_masked,seller_account_holder,delivery_mode,acceptance_point,transport_by,delivery_window,reject_allowance_bps,shortfall_penalty_bps)
SELECT test.id('order'),1,test.id('contract'),1,2000000,2000000,500,'fixed',23000,15000,25000,23000,46000000,46000000,'percent',3000,13800000,'standard',30,20000,1500000,138000,'before_loading',id,bank_code,account_masked,holder_name,'at_farm','tai_vuon','buyer',tstzrange('2026-11-04 06:00+07','2026-11-04 12:00+07'),500,ARRAY[0,1000,5000,10000] FROM pii.bank_accounts WHERE org_id=test.org('TC-B01') AND status='active';
SELECT test.expect_error('Phiên bản chưa ký không được hiệu lực', $$UPDATE core.orders SET effective_version_no=1 WHERE id=test.id('order')$$,'ck_order_version_signed');
SELECT test.expect_error('Ký sai băm bị chặn', $$INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id) VALUES(test.id('contract'),'buyer',test.person('Trần Thu Hà'),test.org('TC-M01'),'otp',digest('wrong','sha256'),'TEST-OTP','device')$$,'PHIEN_BAN_DA_DOI');
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
VALUES(test.id('contract'),'buyer',test.person('Trần Thu Hà'),test.org('TC-M01'),'otp',digest('test-terms','sha256'),test.otp(test.id('contract'),test.person('Trần Thu Hà')),'device-buyer');
UPDATE core.orders SET status='awaiting_seller' WHERE id=test.id('order');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('Người giúp không ký được', $$DO $b$ BEGIN PERFORM set_config('app.actor_kind','helper',true);
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id) VALUES(test.id('contract'),'seller',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'otp',digest('test-terms','sha256'),'TEST-OTP','device'); END $b$;$$,'ck_signature_helper');
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
VALUES(test.id('contract'),'seller',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'otp',digest('test-terms','sha256'),test.otp(test.id('contract'),test.person('Nguyễn Thị Năm')),'device-seller');
UPDATE core.orders SET effective_version_no=1 WHERE id=test.id('order');
UPDATE core.orders SET status='awaiting_deposit' WHERE id=test.id('order');
SELECT test.expect_error('Không sửa byte metadata tài liệu', $$UPDATE core.documents SET generator_version='tampered' WHERE id=test.id('contract')$$,'ck_append_only');
SELECT test.context(NULL,NULL,'system');
UPDATE core.documents SET status='fully_signed' WHERE id=test.id('contract');
INSERT INTO core.deposits(id,order_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no)
VALUES(test.id('deposit'),test.id('order'),test.org('TC-M01'),13800000,138000,'AGV TESTHD2001 COC','THU-TEST-HD2001');
SELECT test.expect_error('Không vào hiệu lực khi chưa có cọc', $$UPDATE core.orders SET status='active' WHERE id=test.id('order')$$,'ck_order_deposit');
CREATE FUNCTION test.bank_receipt(p_code text,p_amount bigint,p_ref text,p_valid boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE w bigint; e uuid:=test.id(p_code);
BEGIN
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) VALUES('bank_sim',p_code,'deposit_received',p_valid,jsonb_build_object('amount_vnd',p_amount)) RETURNING id INTO w;
 INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,payment_ref,occurred_at,requeried_at,requery_status,requery_evidence,payer_account_hash,payer_account_masked,payer_account_name,payer_bank_code) VALUES(e,'bank_sim',p_code,w,'deposit_received',p_amount,p_ref,now(),now(),'confirmed','{"simulator":true}',digest('TEST-PAYER','sha256'),'****0001','DONG XANH','TEST'); RETURN e;
END $$;
SELECT test.context(NULL,NULL,'bank');
SELECT test.expect_error('Webhook sai chữ ký không làm tăng cọc', $$SELECT test.apply_bank_event(test.bank_receipt('bad-signature',13938000,'AGV TESTHD2001 COC',false))$$,'ck_webhook_signature');
SELECT test.apply_bank_event(test.bank_receipt('partial-deposit',13000000,'AGV TESTHD2001 COC'));
SELECT test.check('Cọc thiếu giữ đơn chờ cọc',(SELECT status='awaiting_deposit' FROM core.orders WHERE id=test.id('order')) AND (SELECT status='partially_received' FROM core.deposits WHERE id=test.id('deposit')));
SELECT test.apply_bank_event(test.bank_receipt('topup-deposit',938000,'AGV TESTHD2001 COC'));
SELECT test.check('Cọc đủ tách đúng phí',(SELECT balance_vnd=13800000 FROM ledger.v_account_balances WHERE order_id=test.id('order') AND account_type='deposit_escrow') AND (SELECT balance_vnd=138000 FROM ledger.v_account_balances WHERE order_id=test.id('order') AND account_type='fee_held'));
SELECT test.check('Sự kiện ngân hàng lặp không áp lại',test.apply_bank_event(test.id('topup-deposit'))='duplicate_ignored');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='active' WHERE id=test.id('order');
SELECT test.check('Liên lạc mở sau cọc đủ, đơn trên 3 triệu',EXISTS(SELECT 1 FROM core.contact_grants WHERE order_id=test.id('order') AND mode='full'));
SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','committed','commit_direct',2000000,test.id('order'),'test-commit');
SELECT test.check('Gọi lại chuyển lượng cùng khóa trả kết quả cũ',ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','committed','commit_direct',2000000,test.id('order'),'test-commit')=(SELECT id FROM ledger.qty_movements WHERE idempotency_key='test-commit'));
SELECT test.expect_error('Chuyển lượng cùng khóa khác số bị chặn', $$SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','committed','commit_direct',1,test.id('order'),'test-commit')$$,'IDEMPOTENCY_CONFLICT');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading)
VALUES(test.id('direct'),'TEST-TT1',test.id('order'),'goods_before_loading','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),32200000,'order_active','due',true);
SELECT test.expect_error('Không tự đánh dấu nhận đủ tiền', $$DO $b$ BEGIN PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller'); UPDATE core.direct_payments SET status='fully_received' WHERE id=test.id('direct'); END $b$;$$,'ck_payment_confirmed');
SELECT test.context('Lê Thị Lan','TC-M01','buyer');
INSERT INTO core.direct_payment_reports(direct_payment_id,amount_vnd,method,evidence_doc_id,reported_by) VALUES(test.id('direct'),32200000,'bank_transfer',test.id('contract'),test.person('Lê Thị Lan'));
UPDATE core.direct_payments SET status='payer_reported' WHERE id=test.id('direct');
SELECT test.check('Bên trả chỉ báo không sinh tiền',(SELECT count(*)=0 FROM ledger.transactions WHERE order_id=test.id('order') AND kind='direct_payment'));
SELECT test.expect_error('Bên trả không tự xác nhận bên nhận', $$INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by) VALUES(test.id('direct'),'full',32200000,test.person('Lê Thị Lan'))$$,'KHONG_CO_QUYEN');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('Người giúp không xác nhận tiền', $$DO $b$ BEGIN PERFORM set_config('app.actor_kind','helper',true); INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by) VALUES(test.id('direct'),'full',32200000,test.person('Nguyễn Thị Năm')); END $b$;$$,'KHONG_CO_QUYEN');
INSERT INTO core.direct_payment_confirmations(id,direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id) VALUES(test.id('confirm1'),test.id('direct'),'partial',20000000,'TEST-FT1',test.person('Nguyễn Thị Năm'),test.payment_otp(test.id('direct'),20000000,test.person('Nguyễn Thị Năm')));
SELECT test.check('Nhận một phần trạng thái đúng',(SELECT status='partially_received' FROM core.direct_payments WHERE id=test.id('direct')));
SELECT test.expect_error('Mã giao dịch không được dùng hai lần', $$INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id) VALUES(test.id('direct'),'full',12200000,'TEST-FT1',test.person('Nguyễn Thị Năm'),test.payment_otp(test.id('direct'),12200000,ref.ctx_user()))$$,'23505');
INSERT INTO core.direct_payment_confirmations(id,direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,otp_challenge_id) VALUES(test.id('confirm2'),test.id('direct'),'full',12200000,'TEST-FT2',test.person('Nguyễn Thị Năm'),test.payment_otp(test.id('direct'),12200000,test.person('Nguyễn Thị Năm')));
SELECT test.check('Đã nhận đủ đúng 32200000',(SELECT sum(amount_vnd)=32200000 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('direct')));
INSERT INTO core.deliveries(id,code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
VALUES(test.id('delivery'),'TEST-DOT1',test.id('order'),1,1,2000000,tstzrange('2026-11-04 06:00+07','2026-11-04 12:00+07'),test.person('Võ Hoàng Phúc'));
SELECT test.context(NULL,NULL,'system');
SELECT test.expect_error('Không sẵn sàng khi thiếu QR và xe', $$UPDATE core.deliveries SET status='ready' WHERE id=test.id('delivery')$$,'ck_delivery_ready');
SELECT set_config('app.test_time','2026-11-04T07:00:00+07:00',true);
SELECT set_config('app.test_receipt_token',core.issue_qr('receipt',test.id('delivery'),'2026-11-04T18:00:00+07:00',test.person('Võ Hoàng Phúc')),true);
INSERT INTO core.trips(id,code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd)
SELECT test.id('trip'),'TEST-TH006-TRIP',id,test.person('Hồ Văn Lộc'),test.org('TC-M01'),tstzrange('2026-11-04 06:00+07','2026-11-04 12:00+07'),3200000 FROM core.vehicles WHERE plate_no='66C-123.45';
UPDATE core.trips SET status='accepted' WHERE id=test.id('trip');
INSERT INTO core.trip_deliveries(trip_id,delivery_id,loaded_qty,freight_share_vnd) VALUES(test.id('trip'),test.id('delivery'),1970000,3200000);
UPDATE core.deliveries SET status='ready' WHERE id=test.id('delivery');
SELECT test.context('Võ Hoàng Phúc','TC-M01','buyer');
SELECT core.scan_qr(ref.ctx('test_receipt_token'),'device-receiver');
UPDATE core.deliveries SET status='checking' WHERE id=test.id('delivery');
SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'committed','in_transit','start_check',2000000,test.id('order'),'test-start');
INSERT INTO core.acceptance_versions(id,delivery_id,version_no,weighed_qty,document_id,recorded_by)
VALUES(test.id('acceptance'),test.id('delivery'),1,2000000,test.id('contract'),test.person('Võ Hoàng Phúc'));
INSERT INTO core.acceptance_lines(id,acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code)
SELECT test.id('line:'||n),test.id('acceptance'),n,id,k,qty,payable,price,value,reason FROM core.lots CROSS JOIN (VALUES
 (1::smallint,'accepted',1850000,1850000,23000,42550000,NULL::text),(2::smallint,'downgraded',120000,120000,15000,1800000,'TRAY_VO'),(3::smallint,'rejected',30000,0,0,0,'DAP'))v(n,k,qty,payable,price,value,reason) WHERE code='L-0412';
UPDATE core.deliveries SET status='awaiting_seller' WHERE id=test.id('delivery');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=test.id('acceptance');
UPDATE core.deliveries SET status='closed' WHERE id=test.id('delivery');
SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'in_transit','delivered','accept',1970000,test.id('order'),'test-delivered');
SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'in_transit','returned_pending','reject',30000,test.id('order'),'test-reject');
INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,parent_lot_id,origin_order_id,qty_basis,declared_qty,is_substandard)
SELECT test.id('child'),'TEST-RETURN-LOT',seller_org_id,product_id,profile_version,'L2',site_id,id,test.id('order'),'weighed',30000,true FROM core.lots WHERE code='L-0412';
SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'returned_pending','moved_to_child','return_to_child',30000,test.id('order'),'test-child-out',test.id('child'));
SELECT ledger.move_qty(test.id('child'),'source','available','split_in',30000,NULL,'test-child-in',(SELECT id FROM core.lots WHERE code='L-0412'));
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='awaiting_settlement' WHERE id=test.id('order');
INSERT INTO core.settlements(id,order_id,seq,is_final,v_vnd,d_vnd,c_vnd,n_vnd,c_nb_formula_vnd,release_vnd,refund_vnd,t_bm_vnd,t_nb_vnd,inputs)
VALUES(test.id('settlement'),test.id('order'),1,true,44350000,32200000,13800000,44350000,12150000,12150000,1650000,0,0,'{"test":"TH006"}');
SELECT test.check('TH006 quyết toán đúng 44350000 và chia cọc đúng',(SELECT n_vnd=44350000 AND release_vnd=12150000 AND refund_vnd=1650000 FROM core.settlements WHERE id=test.id('settlement')));
SELECT test.expect_error('Chặn hoàn tất khi tiền còn giữ',(SELECT $$UPDATE core.orders SET status='completed' WHERE id=test.id('order')$$),'ck_order_money');
SELECT test.instruction(test.id('release'),'TEST-RELEASE','release_deposit_to_seller',test.id('order'),test.id('deposit'),test.id('settlement'),12150000);
SELECT test.instruction(test.id('refund'),'TEST-REFUND','refund_deposit_to_buyer',test.id('order'),test.id('deposit'),test.id('settlement'),1650000,test.id('partial-deposit'));
UPDATE core.bank_instructions SET status='sent' WHERE order_id=test.id('order');
SELECT test.expect_error('Không đổi tài khoản đích lệnh đang chạy', $$UPDATE core.bank_instructions SET target_account_masked='****9999' WHERE id=test.id('release')$$,'ck_instruction_frozen');
SELECT test.expect_error('Không hủy lệnh đang chạy', $$UPDATE core.bank_instructions SET status='failed' WHERE id=test.id('release')$$,'ck_status_actor');
CREATE FUNCTION test.instruction_event(p_name text,p_instruction text,p_kind text,p_amount bigint) RETURNS text LANGUAGE plpgsql AS $$ DECLARE w bigint; e uuid:=test.id(p_name);
BEGIN
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) VALUES('bank_sim',p_name,p_kind,true,'{}') RETURNING id INTO w;
 INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,instruction_code,bank_txn_ref,occurred_at,requeried_at,requery_status,requery_evidence) VALUES(e,'bank_sim',p_name,w,p_kind,p_amount,p_instruction,'TEST-BANK-'||p_name,now(),now(),'confirmed','{"simulator":true}');
 RETURN test.apply_bank_event(e); END $$;
SELECT test.context(NULL,NULL,'bank');
SELECT test.instruction_event('release-ok','TEST-RELEASE','instruction_succeeded',12150000);
SELECT test.instruction_event('refund-ok','TEST-REFUND','instruction_succeeded',1650000);
SELECT test.context(NULL,NULL,'ops');
UPDATE core.bank_instructions SET status='reconciled' WHERE order_id=test.id('order');
SELECT test.context(NULL,NULL,'bank');
SELECT test.check('Webhook muộn không đảo lệnh đã đối soát',test.instruction_event('late-failed','TEST-RELEASE','instruction_failed',12150000)='late_after_reconciled' AND (SELECT status='reconciled' FROM core.bank_instructions WHERE id=test.id('release')));
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='completed' WHERE id=test.id('order');
SELECT test.check('TH006 đơn hoàn tất sau đối soát',(SELECT status='completed' FROM core.orders WHERE id=test.id('order')));
SELECT test.check('TH006 người bán thực nhận 44350000',(SELECT sum(e.amount_vnd)=44350000 FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id JOIN ledger.accounts a ON a.id=e.account_id WHERE t.order_id=test.id('order') AND a.account_type='external' AND a.org_id=test.org('TC-B01')));
SELECT test.check('TH006 cọc hết, phí doanh thu 138000',(SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE account_type='deposit_escrow' AND order_id=test.id('order')) AND (SELECT sum(e.amount_vnd)=138000 FROM ledger.entries e JOIN ledger.accounts a ON a.id=e.account_id JOIN ledger.transactions t ON t.id=e.transaction_id WHERE a.account_type='platform_revenue' AND t.order_id=test.id('order')));
