SELECT set_config('app.test_time','',true);
DELETE FROM cmd.test_clock;
-- Mỗi thao tác nghiệp vụ được kiểm dưới SESSION AUTHORIZATION runtime thật.
SELECT set_config('test.c47.demandline',(SELECT l.id::text FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE d.code='CMD-DEMAND' LIMIT 1),true);
SELECT set_config('test.c47.price',(SELECT (max_price_vnd+1000)::text FROM core.demand_line_max_prices WHERE demand_line_id=current_setting('test.c47.demandline')::uuid ORDER BY id DESC LIMIT 1),true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C47 người bán không sửa giá kín nhu cầu','SELECT cmd.raise_demand_price(current_setting(''test.c47.demandline'')::uuid,999999)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.raise_demand_price(current_setting('test.c47.demandline')::uuid,current_setting('test.c47.price')::bigint)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C47 giá nhu cầu không giảm','SELECT cmd.raise_demand_price(current_setting(''test.c47.demandline'')::uuid,1)','ck_demand_price_up')$$);
SELECT test.check('C47 giá mới ghim người mua từ login',EXISTS(SELECT 1 FROM core.demand_line_max_prices WHERE demand_line_id=current_setting('test.c47.demandline')::uuid AND max_price_vnd=current_setting('test.c47.price')::bigint AND set_by=test.person('Trần Thu Hà')));

SELECT test.command_order('C47UNSIGNED','TC-M01','Trần Thu Hà','spot');
SELECT set_config('test.c47.order',test.id('C47UNSIGNED')::text,true),set_config('test.c47.doc',test.command_doc('C47UNSIGNED-CANCEL')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c47.cancel',cmd.request_cancel(current_setting('test.c47.order')::uuid,'buyer_request','Hủy trước ký')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.answer_cancel(current_setting('test.c47.cancel')::uuid,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C47 app không tự đóng hủy trước cọc','SELECT cmd.process_unsigned_cancellation(current_setting(''test.c47.cancel'')::uuid,current_setting(''test.c47.doc'')::jsonb)','42501')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.process_unsigned_cancellation(current_setting('test.c47.cancel')::uuid,current_setting('test.c47.doc')::jsonb)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.process_unsigned_cancellation(current_setting('test.c47.cancel')::uuid,current_setting('test.c47.doc')::jsonb)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.finish_cancellation(current_setting('test.c47.cancel')::uuid)$$);
SELECT test.check('C47 hủy trước ký đóng đơn và chứng từ, accounting rỗng đúng một lần',EXISTS(SELECT 1 FROM core.orders WHERE id=test.id('C47UNSIGNED') AND status='closed') AND EXISTS(SELECT 1 FROM core.cancellation_requests WHERE id=current_setting('test.c47.cancel')::uuid AND status='done') AND EXISTS(SELECT 1 FROM core.cancellation_accountings WHERE order_id=test.id('C47UNSIGNED') AND c_vnd=0 AND n_vnd=0) AND EXISTS(SELECT 1 FROM core.documents WHERE order_id=test.id('C47UNSIGNED') AND doc_type='contract' AND status='cancelled'));

-- Có tiền cọc thiếu: không coi deposit_pending là escrow hoặc tự báo đã hoàn.
SELECT test.command_order('C47PARTIAL','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('C47PARTIAL','TC-M01','Trần Thu Hà');
SELECT test.apply_bank_event(test.bank_receipt('C47PARTIAL-FUND',1000000,'AGV TEST-C47PARTIAL COC'));
SELECT set_config('test.c47.order',test.id('C47PARTIAL')::text,true),set_config('test.c47.doc',test.command_doc('C47PARTIAL-CANCEL')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c47.cancel',cmd.request_cancel(current_setting('test.c47.order')::uuid,'seller_request','Hủy trước khi cọc đủ')::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.answer_cancel(current_setting('test.c47.cancel')::uuid,true)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.process_unsigned_cancellation(current_setting('test.c47.cancel')::uuid,current_setting('test.c47.doc')::jsonb)$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c47.finish',cmd.finish_cancellation(current_setting('test.c47.cancel')::uuid),true)$$);
SELECT test.check('C47 tiền thiếu còn chờ hoàn nguồn, không đánh dấu hủy xong',current_setting('test.c47.finish')='processing_money' AND EXISTS(SELECT 1 FROM ops.bank_return_tasks t JOIN core.deposits d ON d.id=t.deposit_id WHERE d.order_id=test.id('C47PARTIAL') AND t.status='pending') AND EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('C47PARTIAL') AND account_type='deposit_pending' AND balance_vnd=1000000));

SELECT test.complete_return(test.id('C47PARTIAL-FUND'),test.return_proof('C47PARTIAL-RETURN',test.id('C47PARTIAL-FUND')));
SELECT test.as_login('db_test_system',$$SELECT cmd.finish_cancellation(current_setting('test.c47.cancel')::uuid)$$);
SELECT test.check('C47 hủy nộp thiếu chỉ xong sau bằng chứng hoàn nguồn',EXISTS(SELECT 1 FROM core.cancellation_requests WHERE id=current_setting('test.c47.cancel')::uuid AND status='done') AND EXISTS(SELECT 1 FROM core.orders WHERE id=test.id('C47PARTIAL') AND close_reason='cancel_before_deposit') AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('C47PARTIAL') AND account_type='deposit_pending' AND balance_vnd<>0));

-- Fixture tạo một đơn tại kho; mọi bước giao nhận dưới login command.
CREATE FUNCTION test.prepare_dispute_command(k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM test.command_order(k,'TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()-interval '1 hour',now()+interval '1 day'),'delivery_mode','at_buyer_warehouse','acceptance_point','tai_kho_ben_mua','acceptance_facility_id',NULL,'designated_receiver_user_id',test.person('Võ Hoàng Phúc')));
 PERFORM test.sign_order(k,'TC-M01','Trần Thu Hà'); PERFORM test.fund_order(k);
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window) SELECT k||'-D1',order_id,1,1,qty_min,delivery_window FROM core.order_versions WHERE order_id=test.id(k);
 PERFORM set_config('test.c47.order',test.id(k)::text,true);
 PERFORM set_config('test.c47.delivery',(SELECT id::text FROM core.deliveries WHERE code=k||'-D1'),true);
 PERFORM set_config('test.c47.receiver',test.person('Võ Hoàng Phúc')::text,true);
 PERFORM test.as_login('db_test_buyer',$q$SELECT set_config('test.c47.qr',cmd.assign_receiver(current_setting('test.c47.delivery')::uuid,current_setting('test.c47.receiver')::uuid),true)$q$);
 PERFORM test.as_login('db_test_system',$q$SELECT cmd.ready_delivery(current_setting('test.c47.delivery')::uuid)$q$);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.dispatch_delivery(current_setting('test.c47.delivery')::uuid)$q$);
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.scan_qr(current_setting('test.c47.qr'),'TEST')$q$);
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.start_acceptance(current_setting('test.c47.delivery')::uuid)$q$);
END $$;
CREATE FUNCTION test.sign_command_record(p_login name,p_user uuid,p_party text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('test.c47.signer',p_user::text,true); PERFORM set_config('test.c47.party',p_party,true);
 PERFORM test.as_login('db_test_auth',$q$SELECT set_config('test.c47.receipt',cmd.record_reauthentication(current_setting('test.c47.signer')::uuid,current_setting('test.c47.docid')::uuid,'TEST','pin')::text,true)$q$);
 PERFORM test.as_login(p_login,$q$SELECT cmd.sign_record(current_setting('test.c47.docid')::uuid,current_setting('test.c47.party'),'qr_confirm','TEST',current_setting('test.c47.receipt')::uuid)$q$);
END $$;
REVOKE ALL ON FUNCTION test.prepare_dispute_command(text),test.sign_command_record(name,uuid,text) FROM PUBLIC;
SELECT test.prepare_dispute_command('C47WITHDRAW');
SELECT set_config('test.c47.doc',test.command_doc('C47WITHDRAW-BBNT')::text,true),set_config('test.c47.lines',jsonb_build_array(jsonb_build_object('lot_id',test.id('C47WITHDRAW:lot'),'kind','rejected','qty',2000000,'payable_qty',0,'unit_price_vnd',0,'value_vnd',0,'reason_code',(SELECT r.reason_code FROM core.product_reject_reasons r JOIN core.lots l ON l.product_id=r.product_id AND l.profile_version=r.profile_version WHERE l.id=test.id('C47WITHDRAW:lot') ORDER BY r.reason_code LIMIT 1)))::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c47.acceptance',cmd.submit_acceptance(current_setting('test.c47.delivery')::uuid,2000000,current_setting('test.c47.doc')::jsonb,current_setting('test.c47.lines')::jsonb)::text,true)$$);
SELECT set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c47.acceptance')::uuid),true),set_config('test.c47.line',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c47.acceptance')::uuid),true);
SELECT test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
SELECT test.as_login('db_test_receiver',$$SELECT cmd.send_acceptance(current_setting('test.c47.acceptance')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C47 không áp kết luận cả dòng cho lượng tranh chấp con','SELECT cmd.open_dispute(current_setting(''test.c47.line'')::uuid,1000000,''Cần tách dòng trước'')','ck_dispute_scope')$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c47.dispute',cmd.open_dispute(current_setting('test.c47.line')::uuid,2000000,'Phản đối phần trả')::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C47 người mua không rút thay người bán','SELECT cmd.withdraw_dispute(current_setting(''test.c47.dispute'')::uuid)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C47 rút phần cần ký BBNT trước','SELECT cmd.withdraw_dispute(current_setting(''test.c47.dispute'')::uuid)','ck_dispute_scope')$$);
SELECT test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
SELECT test.as_login('db_test_seller',$$SELECT cmd.withdraw_dispute(current_setting('test.c47.dispute')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.withdraw_dispute(current_setting('test.c47.dispute')::uuid)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.close_resolved_delivery(current_setting('test.c47.delivery')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.create_return_lot(current_setting('test.c47.order')::uuid,2000000,'L1','C47WITHDRAW-CHILD')$$);
SELECT test.check('C47 rút tranh chấp tạo lô con, không khai trùng lượng',EXISTS(SELECT 1 FROM core.dispute_withdrawals WHERE dispute_id=current_setting('test.c47.dispute')::uuid AND withdrawn_by=test.person('Nguyễn Thị Năm')) AND EXISTS(SELECT 1 FROM core.lots l JOIN ledger.qty_balances b ON b.lot_id=l.id WHERE l.code='C47WITHDRAW-CHILD' AND b.bucket='available' AND b.qty=2000000) AND NOT EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=test.id('C47WITHDRAW:lot') AND bucket IN ('returned_pending','in_transit') AND qty<>0));
SET CONSTRAINTS ALL IMMEDIATE;
