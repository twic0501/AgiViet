DELETE FROM cmd.test_clock;
SELECT test.context(NULL,NULL,'system');
SELECT set_config('app.test_time','',true);
SELECT set_config('test.c56.site',(SELECT site_id::text FROM core.lots WHERE code='L-0412'),true);
-- Tạo/ký/nhận cọc qua login runtime; helper chỉ chuẩn bị chứng cứ OTP/ngân hàng ảo.
CREATE FUNCTION test.seasonal_order(k text,typ text,p_formula boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE lot uuid; offer uuid; oid uuid; doc uuid; terms jsonb; q bigint:=CASE typ WHEN 'pre_harvest' THEN 1000000 ELSE 2000000 END; fee bigint; dep bigint; amount bigint;
BEGIN
 PERFORM set_config('test.s.code',k,true); PERFORM set_config('test.s.type',typ,true);
 PERFORM set_config('test.s.data',(SELECT jsonb_build_object('code',k||'-LOT','product_id',product_id,'profile_version',profile_version,'grade_code',grade_code,'site_id',site_id,'qty_basis','estimated','declared_qty',4000000)::text FROM core.lots WHERE code='L-0412'),true);
 lot:=test.as_login('db_test_seller',$q$SELECT cmd.create_lot(current_setting('test.s.data')::jsonb)$q$)::uuid; PERFORM set_config('test.s.lot',lot::text,true);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.publish_lot(current_setting('test.s.lot')::uuid,23000,20000)$q$);
 PERFORM set_config('test.s.qty',q::text,true); PERFORM set_config('test.s.buyer',test.org('TC-M01')::text,true);
 offer:=test.as_login('db_test_buyer',$q$SELECT cmd.send_offer(current_setting('test.s.code')||'-OFFER',current_setting('test.s.lot')::uuid,NULL,current_setting('test.s.buyer')::uuid,'buyer_bid',23000,current_setting('test.s.qty')::bigint)$q$)::uuid;
 PERFORM set_config('test.s.offer',offer::text,true); PERFORM test.as_login('db_test_seller',$q$SELECT cmd.accept_offer(current_setting('test.s.offer')::uuid)$q$);
 SELECT to_jsonb(v)-ARRAY['write_xid','created_at','amendment_id'] INTO terms FROM core.order_versions v JOIN core.orders o ON o.id=v.order_id WHERE o.code='CMD-ORDER' AND v.version_no=1;
 dep:=CASE typ WHEN 'pre_harvest' THEN 6900000 ELSE 2000000 END;
 fee:=least(coalesce((terms->>'fee_cap_vnd')::bigint,9223372036854775807),greatest(coalesce((terms->>'fee_floor_vnd')::bigint,0),ref.div_round((terms->>'fee_bps')::numeric*q*23000,10000000)));
 IF (terms->>'fee_bps')::integer=0 THEN fee:=0; END IF;
 terms:=terms||jsonb_build_object('qty_min',q,'qty_max',CASE typ WHEN 'pre_harvest' THEN 1200000 ELSE q END,'unit_price_vnd',23000,'contract_value_vnd',q*23,'deposit_basis_vnd',q*23,'deposit_price_vnd',23000,
 'deposit_rule',CASE typ WHEN 'pre_harvest' THEN 'percent' ELSE 'per_unit' END,'deposit_bps',CASE typ WHEN 'pre_harvest' THEN 3000 ELSE 0 END,'deposit_vnd',dep,'fee_vnd',fee,
 'price_mode',CASE WHEN p_formula THEN 'formula' ELSE 'fixed' END,'price_formula',CASE WHEN p_formula THEN '{"floor":23000,"cap":28000,"ref_bps":10000}'::jsonb END,
 'delivery_mode','at_buyer_warehouse','acceptance_point','tai_kho_ben_mua','acceptance_facility_id',NULL,'transport_by','seller','payment_timing','after_days','pay_after_days',7,'inspection_before_loading',false,'silent_accept_hours',NULL,
 'delivery_window',tstzrange(now()-interval '1 hour',now()+interval '5 days'),'designated_receiver_user_id',test.person('Võ Hoàng Phúc'));
 PERFORM set_config('test.s.terms',terms::text,true); PERFORM set_config('test.s.doc',test.command_doc(k||'-DOC')::text,true);
 PERFORM set_config('test.s.season',jsonb_build_object('harvest_during',daterange(current_date,current_date+6),'materials_advance_vnd',CASE typ WHEN 'pre_harvest' THEN 0 ELSE 2000000 END)::text,true);
 PERFORM set_config('test.s.batches',CASE typ WHEN 'pre_harvest' THEN jsonb_build_array(jsonb_build_object('committed_qty',q,'delivery_window',tstzrange(now()-interval '1 hour',now()+interval '2 days')))
 ELSE jsonb_build_array(jsonb_build_object('committed_qty',1000000,'delivery_window',tstzrange(now()-interval '1 hour',now()+interval '2 days'),'materials_offset_vnd',1000000),jsonb_build_object('committed_qty',1000000,'delivery_window',tstzrange(now()+interval '3 days',now()+interval '4 days'),'materials_offset_vnd',1000000)) END::text,true);
 oid:=test.as_login('db_test_buyer',$q$SELECT cmd.create_seasonal_order(current_setting('test.s.code'),current_setting('test.s.offer')::uuid,current_setting('test.s.type'),current_setting('test.s.terms')::jsonb,current_setting('test.s.doc')::jsonb,current_setting('test.s.season')::jsonb,current_setting('test.s.batches')::jsonb)$q$)::uuid;
 PERFORM set_config('test.s.order',oid::text,true); SELECT document_id INTO doc FROM core.order_versions WHERE order_id=oid;
 PERFORM set_config('test.s.docid',doc::text,true); PERFORM set_config('test.s.otp',test.otp(doc,test.person('Trần Thu Hà')),true);
 PERFORM test.as_login('db_test_buyer',$q$SELECT cmd.sign_document(current_setting('test.s.docid')::uuid,'buyer',current_setting('test.s.otp'),'TEST')$q$);
 PERFORM test.as_login('db_test_buyer',$q$SELECT cmd.send_order(current_setting('test.s.order')::uuid)$q$);
 PERFORM set_config('test.s.otp',test.otp(doc,test.person('Nguyễn Thị Năm')),true);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.sign_document(current_setting('test.s.docid')::uuid,'seller',current_setting('test.s.otp'),'TEST')$q$);
 PERFORM test.as_login('db_test_system',$q$SELECT cmd.finalize_signed_order(current_setting('test.s.order')::uuid,current_setting('test.s.code')||'-REF',current_setting('test.s.code')||'-VA','bank_sim')$q$);
 SELECT expected_deposit_vnd+expected_fee_vnd INTO amount FROM core.deposits WHERE order_id=oid;
 PERFORM test.apply_bank_event(test.bank_receipt(k||'-FUND',amount,k||'-REF'));
 PERFORM test.as_login('db_test_system',$q$SELECT set_config('test.s.delivery',cmd.activate_order_after_deposit(current_setting('test.s.order')::uuid)::text,true)$q$);
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION test.seasonal_order(text,text,boolean) FROM PUBLIC;
SELECT test.seasonal_order('C57PRE','pre_harvest');
SELECT test.check('C57 đặt trước giữ khoảng lượng, cọc 30 phần trăm theo min và chờ chốt',
 EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=current_setting('test.s.order')::uuid AND qty_min=1000000 AND qty_max=1200000 AND deposit_vnd=6900000)
 AND test.as_login('db_test_seller',$$SELECT seasonal_status FROM core.v_seasonal_progress WHERE order_id=current_setting('test.s.order')::uuid$$)='cho_chot_luong_gia');
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C57 chưa chốt không sẵn sàng giao',
 'SELECT cmd.ready_delivery(current_setting(''test.s.delivery'')::uuid)','ck_harvest_fix')$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C57 chốt ngoài khoảng bị chặn',
 'SELECT cmd.propose_harvest_fix(current_setting(''test.s.order'')::uuid,1300000)','ck_harvest_fix')$$);
SELECT set_config('test.s.update',jsonb_build_object('qty_min',900000,'qty_max',1100000,'harvest_during',daterange(current_date+1,current_date+4),'note','Theo dõi sau mưa, đây là dự báo chưa sửa cam kết')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.record_production_update(current_setting('test.s.order')::uuid,current_setting('test.s.update')::jsonb,'C57-PRODUCTION')$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.check('C57 bên mua đọc dự báo, lượng ký không tự giảm',
 (SELECT count(*)=1 FROM core.production_updates WHERE order_id=current_setting('test.s.order')::uuid)
 AND (SELECT qty_min=1000000 FROM core.order_versions WHERE order_id=current_setting('test.s.order')::uuid AND version_no=1))$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.s.amendment',cmd.propose_harvest_fix(current_setting('test.s.order')::uuid,1100000)::text,true)$$);
SELECT set_config('test.s.doc',test.command_doc('C57PRE-ANNEX')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.s.annexdoc',cmd.answer_amendment(current_setting('test.s.amendment')::uuid,'accept',current_setting('test.s.doc')::jsonb)::text,true)$$);
SELECT test.check('C57 đồng ý mới tạo phụ lục, chưa tự áp trước chữ ký',EXISTS(SELECT 1 FROM core.orders WHERE id=current_setting('test.s.order')::uuid AND effective_version_no=1));
SELECT set_config('test.s.otp',test.otp(current_setting('test.s.annexdoc')::uuid,test.person('Trần Thu Hà')),true);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.sign_document(current_setting('test.s.annexdoc')::uuid,'buyer',current_setting('test.s.otp'),'TEST')$$);
SELECT set_config('test.s.otp',test.otp(current_setting('test.s.annexdoc')::uuid,test.person('Nguyễn Thị Năm')),true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.sign_document(current_setting('test.s.annexdoc')::uuid,'seller',current_setting('test.s.otp'),'TEST')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.s.amendment')::uuid)$$);
SELECT test.check('C57 phụ lục chốt lượng tạo chênh cọc 24h và giữ nguyên bản đầu',
 EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=current_setting('test.s.order')::uuid AND version_no=1 AND qty_max=1200000)
 AND EXISTS(SELECT 1 FROM core.deposit_adjustments a JOIN core.deposits d ON d.id=a.deposit_id WHERE d.order_id=current_setting('test.s.order')::uuid AND delta_deposit_vnd=690000)
 AND EXISTS(SELECT 1 FROM core.deadlines WHERE order_id=current_setting('test.s.order')::uuid AND kind='deposit_top_up' AND due_at=created_at+interval '24 hours'));
-- Công thức tính đúng sàn/chia lợi/trần, không lấy giá ngoài làm tham khảo.
SELECT test.check('C57 công thức sàn và chia lợi',core.seasonal_formula_price('{"floor":18000,"share_bps":5000}',26000)=22000 AND core.seasonal_formula_price('{"floor":18000,"cap":21000,"ref_bps":10000}',26000)=21000);
SELECT test.expect_error('C57 công thức thiếu/âm bị chặn',$$SELECT core.seasonal_formula_price('{"floor":0,"ref_bps":10000}',25000)$$,'ck_seasonal_formula');
SELECT test.seasonal_order('C57OFF','offtake');
SELECT test.check('C57 bao tiêu tạo hai đợt từ lịch và chỉ một cọc vụ',
 (SELECT count(*)=2 AND sum(planned_qty)=2000000 FROM core.deliveries WHERE order_id=current_setting('test.s.order')::uuid)
 AND (SELECT count(*)=1 FROM core.deposits WHERE order_id=current_setting('test.s.order')::uuid));
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C57 chưa hết vụ không quyết toán nhả cọc',
 'SELECT cmd.create_settlement(current_setting(''test.s.order'')::uuid,false,''C57-EARLY'')','ck_seasonal_deposit')$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.fix_seasonal_batch_price(current_setting('test.s.delivery')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.fix_seasonal_batch_price(current_setting('test.s.delivery')::uuid)$$);
SELECT test.check('C57 giá đợt retry một snapshot',(SELECT count(*)=1 AND min(unit_price_vnd)=23000 FROM core.seasonal_batch_prices WHERE delivery_id=current_setting('test.s.delivery')::uuid));
-- Đi hết một đợt tại kho, 1 tấn giao / 1,5 tấn nhật ký => việc P2; tiền đợt không khấu trừ cọc vụ.
SELECT set_config('test.s.receiver',test.person('Võ Hoàng Phúc')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.s.qr',cmd.assign_receiver(current_setting('test.s.delivery')::uuid,current_setting('test.s.receiver')::uuid),true)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.ready_delivery(current_setting('test.s.delivery')::uuid)$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.scan_qr(current_setting('test.s.qr'),'TEST')$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C57 bao tiêu chưa ghi thu hoạch không nghiệm thu',
 'SELECT cmd.start_acceptance(current_setting(''test.s.delivery'')::uuid)','ck_seasonal_harvest')$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.record_cultivation(current_setting('test.c56.site')::uuid,jsonb_build_object('occurred_on',current_date,'activity','harvest','note','Cân tại vườn mô phỏng 1,5 tấn','harvested_qty',1500000,'delivery_id',current_setting('test.s.delivery')::uuid),'C57-HARVEST')$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.start_acceptance(current_setting('test.s.delivery')::uuid)$$);
SELECT set_config('test.s.doc',test.command_doc('C57OFF-ACCEPT')::text,true),set_config('test.s.lines',jsonb_build_array(jsonb_build_object('lot_id',current_setting('test.s.lot')::uuid,'kind','accepted','qty',1000000,'payable_qty',1000000,'unit_price_vnd',23000,'value_vnd',23000000))::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.s.acceptance',cmd.submit_acceptance(current_setting('test.s.delivery')::uuid,1000000,current_setting('test.s.doc')::jsonb,current_setting('test.s.lines')::jsonb)::text,true)$$);
SELECT set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.s.acceptance')::uuid),true);
SELECT test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
SELECT test.as_login('db_test_receiver',$$SELECT cmd.send_acceptance(current_setting('test.s.acceptance')::uuid)$$);
SELECT test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
SELECT test.as_login('db_test_seller',$$SELECT cmd.agree_acceptance(current_setting('test.s.acceptance')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.finish_warehouse_delivery(current_setting('test.s.delivery')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.finish_warehouse_delivery(current_setting('test.s.delivery')::uuid)$$);
SELECT test.check('C57 đợt trả trong 7 ngày: 23 triệu trừ 1 triệu vật tư, giữ nguyên 2 triệu cọc vụ',
 (SELECT count(*)=1 AND sum(amount_due_vnd)=22000000 FROM core.direct_payments WHERE order_id=current_setting('test.s.order')::uuid AND kind='goods_batch')
 AND EXISTS(SELECT 1 FROM core.direct_payments WHERE delivery_id=current_setting('test.s.delivery')::uuid AND due_at BETWEEN now()+interval '7 days'-interval '1 minute' AND now()+interval '7 days'+interval '1 minute')
 AND EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=current_setting('test.s.order')::uuid AND account_type='deposit_escrow' AND balance_vnd=2000000));
SELECT test.check('C57 dưới 80 phần trăm nhật ký không lý do tạo đúng một P2',
 (SELECT count(*)=1 FROM ops.tasks WHERE dedup_key='suspected-side-sale:'||current_setting('test.s.delivery') AND priority=2));
-- Tạo hai đợt còn mở và một chuyến gộp: không giải phóng xe khi chỉ một đợt kết thúc.
SELECT test.ready_source('C57TRIP1');
SELECT set_config('test.s.tripd1',current_setting('test.c47.delivery'),true);
SELECT test.ready_source('C57TRIP2');
SELECT set_config('test.s.tripd2',current_setting('test.c47.delivery'),true);
-- Fixture đặt xe bằng chủ DB để kiểm trigger kết thúc trên chuyến gộp, không tạo API gộp xe giả.
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.trips(id,code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd)
SELECT test.id('C57TRIP'),'C57TRIP',v.id,u.id,test.org('TC-B01'),tstzrange(now()-interval '1 hour',now()+interval '1 day'),100000
FROM core.vehicles v CROSS JOIN core.users u WHERE v.plate_no='DEMO-66C-001' AND u.display_name='Nguyễn Thị Năm';
INSERT INTO core.trip_deliveries(trip_id,delivery_id,loaded_qty,freight_share_vnd) VALUES
(test.id('C57TRIP'),current_setting('test.s.tripd1')::uuid,1000000,50000),(test.id('C57TRIP'),current_setting('test.s.tripd2')::uuid,1000000,50000);
-- Đợt đang checking không thể hủy trực tiếp: đưa fixture tới closed bằng nghiệm thu hai chữ ký thật.
CREATE FUNCTION test.finish_trip_fixture(p_delivery uuid,k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('test.c47.delivery',p_delivery::text,true);
 PERFORM set_config('test.c47.doc',test.command_doc(k)::text,true);
 PERFORM set_config('test.c47.lines',(SELECT jsonb_build_array(jsonb_build_object('lot_id',o.lot_id,'kind','accepted','qty',d.planned_qty,'payable_qty',d.planned_qty,'unit_price_vnd',23000,'value_vnd',d.planned_qty*23))::text FROM core.deliveries d JOIN core.orders o ON o.id=d.order_id WHERE d.id=p_delivery),true);
 PERFORM test.as_login('db_test_receiver',$q$SELECT set_config('test.c47.acceptance',cmd.submit_acceptance(current_setting('test.c47.delivery')::uuid,1000000,current_setting('test.c47.doc')::jsonb,current_setting('test.c47.lines')::jsonb)::text,true)$q$);
 PERFORM set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c47.acceptance')::uuid),true);
 PERFORM test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.send_acceptance(current_setting('test.c47.acceptance')::uuid)$q$);
 PERFORM test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.agree_acceptance(current_setting('test.c47.acceptance')::uuid)$q$);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.dispatch_delivery(current_setting('test.c47.delivery')::uuid)$q$);
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.confirm_arrival(current_setting('test.c47.delivery')::uuid)$q$);
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.begin_arrival_check(current_setting('test.c47.delivery')::uuid,1000000)$q$);
 PERFORM test.as_login('db_test_system',$q$SELECT cmd.close_delivery(current_setting('test.c47.delivery')::uuid)$q$);
END $$;
REVOKE ALL ON FUNCTION test.finish_trip_fixture(uuid,text) FROM PUBLIC;
SELECT test.finish_trip_fixture(current_setting('test.s.tripd1')::uuid,'C57TRIP1-ACCEPT');
SELECT test.check('C57 chuyến gộp còn một đợt chưa xong vẫn giữ lịch xe',(SELECT status='booked' AND completed_at IS NULL FROM core.trips WHERE id=test.id('C57TRIP')));
SELECT test.expect_error('C57 xe đang phục vụ vẫn chặn lịch trùng',$$INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) SELECT 'C57OVERLAP',vehicle_id,driver_user_id,payer_org_id,scheduled_during,0 FROM core.trips WHERE id=test.id('C57TRIP')$$,'23P01');
SELECT test.finish_trip_fixture(current_setting('test.s.tripd2')::uuid,'C57TRIP2-ACCEPT');
SELECT test.check('C57 mọi đợt xong tự kết thúc chuyến và có mốc nghiệp vụ',(SELECT status='completed' AND completed_at=ref.clock_at() FROM core.trips WHERE id=test.id('C57TRIP')));
SELECT test.expect_ok('C57 xe đã xong đặt lại cùng khoảng không kẹt exclusion',$$INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) SELECT 'C57REUSE',vehicle_id,driver_user_id,payer_org_id,scheduled_during,0 FROM core.trips WHERE id=test.id('C57TRIP')$$);
SET CONSTRAINTS ALL IMMEDIATE;
