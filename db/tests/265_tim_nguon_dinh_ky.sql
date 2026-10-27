-- Bản 23 · tìm nguồn định kỳ (0063): kiểm qua lệnh thật bằng đăng nhập bên mua/người bán/nhân viên.
SELECT set_config('app.test_time','',true);
SELECT set_config('test.d.product',(SELECT id::text FROM core.products WHERE code='XOAI_CAT_CHU'),false),
       set_config('test.d.buyer',test.org('TC-M01')::text,false),set_config('test.d.seller',test.org('TC-B01')::text,false),
       set_config('test.d.day1',(current_date+3)::text,false),set_config('test.d.day2',(current_date+4)::text,false);

-- Thỏa thuận: mặc định duyệt từng phương án (Q25), hạn chốt 14:00 (Q26).
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.d.ag',cmd.create_sourcing_agreement('DK-NHA-MAY',current_setting('test.d.product')::uuid,'{"loai":"L1"}',ARRAY['chung_nhan_vung_trong'],false,NULL,NULL,NULL)::text,false)$$);
SELECT test.check('DK thỏa thuận mặc định duyệt từng phương án, chốt 14:00',
 (SELECT sourcing_mode='duyet_tung_phuong_an' AND cutoff_time='14:00' FROM core.sourcing_agreements WHERE id=current_setting('test.d.ag')::uuid));
INSERT INTO core.sourcing_forecasts(agreement_id,period,qty_g) VALUES(current_setting('test.d.ag')::uuid,daterange(current_date+3,current_date+10),30000000);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.d.d1',cmd.confirm_sourcing_day(current_setting('test.d.ag')::uuid,current_setting('test.d.day1')::date,5000000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.d.d2',cmd.confirm_sourcing_day(current_setting('test.d.ag')::uuid,current_setting('test.d.day2')::date,5000000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('DK chốt sau hạn (hôm nay, hạn 14:00 hôm qua) bị chặn','SELECT cmd.confirm_sourcing_day(current_setting(''test.d.ag'')::uuid,current_date,5000000)','ck_sourcing_cutoff')$$);

-- Người bán tự đặt kỳ trả 3 ngày, mức cho nợ 80 triệu.
-- (Bộ thử có sẵn công nợ giữa hai bên từ các kiểm thử trước: mức cho nợ = nợ sẵn có + 80 triệu.)
SELECT set_config('test.d.base',core.pair_exposure(test.org('TC-M01'),test.org('TC-B01'))::text,false);
SELECT set_config('test.d.limit',(current_setting('test.d.base')::bigint+80000000)::text,false);
SELECT test.as_login('db_test_seller',$$SELECT cmd.set_credit_terms(current_setting('test.d.buyer')::uuid,3,current_setting('test.d.limit')::bigint)$$);

-- Phương án A ngày 1: 2 tấn × 20.000 = 40 triệu.
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.d.a1',cmd.propose_allocation(current_setting('test.d.d1')::uuid,current_setting('test.d.seller')::uuid,2000000,20000)::text,false)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('DK chưa được bên mua duyệt thì người bán chưa cam kết được','SELECT cmd.commit_allocation(current_setting(''test.d.a1'')::uuid)','ck_sourcing_scope')$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.approve_allocation(current_setting('test.d.a1')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.commit_allocation(current_setting('test.d.a1')::uuid)$$);
SELECT test.check('DK độ phủ ngày 1: cần 5 tấn · cam kết 2 · thiếu 3',
 (SELECT confirmed_qty_g=5000000 AND committed_qty_g=2000000 AND missing_qty_g=3000000 FROM core.v_sourcing_coverage WHERE day_id=current_setting('test.d.d1')::uuid));

-- Ngày 2: thêm 40 triệu → nợ chồng 80/80 được; thêm 10 triệu → 90 > 80 bị chặn.
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.d.a2',cmd.propose_allocation(current_setting('test.d.d2')::uuid,current_setting('test.d.seller')::uuid,2000000,20000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.approve_allocation(current_setting('test.d.a2')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.commit_allocation(current_setting('test.d.a2')::uuid)$$);
SELECT test.check('DK công nợ chồng tăng đúng 80 triệu sau hai đợt',core.pair_exposure(test.org('TC-M01'),test.org('TC-B01'))=current_setting('test.d.base')::bigint+80000000);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.d.a3',cmd.propose_allocation(current_setting('test.d.d2')::uuid,current_setting('test.d.seller')::uuid,500000,20000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.approve_allocation(current_setting('test.d.a3')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('DK vượt mức cho nợ người bán đặt bị chặn','SELECT cmd.commit_allocation(current_setting(''test.d.a3'')::uuid)','ck_credit_limit')$$);

-- Đổi lượng đã cam kết: không sửa thẳng; phải có người bán đồng ý.
SELECT test.expect_error('DK không sửa thẳng lượng đã cam kết',
 $$UPDATE core.sourcing_allocations SET qty_g=1000000 WHERE id=current_setting('test.d.a1')::uuid$$,'ck_allocation_consent');
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.d.c1',cmd.request_allocation_change(current_setting('test.d.a1')::uuid,1000000)::text,false)$$);
SELECT test.check('DK yêu cầu giảm chưa có hiệu lực khi người bán chưa đồng ý',
 (SELECT qty_g=2000000 FROM core.sourcing_allocations WHERE id=current_setting('test.d.a1')::uuid));
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('DK báo chi phí phải có chứng cứ','SELECT cmd.answer_allocation_change(current_setting(''test.d.c1'')::uuid,true,1500000,NULL)','ck_command_evidence')$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.answer_allocation_change(current_setting('test.d.c1')::uuid,true,0,NULL)$$);
SELECT test.check('DK người bán đồng ý: lượng còn 1 tấn',
 (SELECT qty_g=1000000 AND status='committed' FROM core.sourcing_allocations WHERE id=current_setting('test.d.a1')::uuid));

-- Sau hạn chốt: không sửa lượng đã chốt của ngày.
INSERT INTO core.sourcing_days(id,agreement_id,delivery_date,cutoff_at,confirmed_qty_g,confirmed_by,confirmed_at)
 VALUES(test.id('DK:qua-han'),current_setting('test.d.ag')::uuid,current_date-1,now()-interval '1 day',5000000,test.person('Trần Thu Hà'),now()-interval '2 days');
SELECT test.expect_error('DK sau hạn chốt không sửa lượng ngày',
 $$UPDATE core.sourcing_days SET confirmed_qty_g=3000000 WHERE id=test.id('DK:qua-han')$$,'ck_sourcing_cutoff');

-- Giao thiếu 2 lần/30 ngày → mở rà soát, không tự trừ uy tín.
SELECT test.as_login('db_test_seller',$$SELECT cmd.report_shortfall(current_setting('test.d.a1')::uuid,500000)$$);
SELECT test.check('DK lần thiếu đầu: chưa mở rà soát',NOT EXISTS(SELECT 1 FROM ops.tasks WHERE kind='V26' AND entity_id=test.org('TC-B01')));
SELECT test.as_login('db_test_seller',$$SELECT cmd.report_shortfall(current_setting('test.d.a2')::uuid,1500000)$$);
SELECT test.check('DK lần thiếu thứ hai trong 30 ngày: mở việc rà soát V26',EXISTS(SELECT 1 FROM ops.tasks WHERE kind='V26' AND entity_id=test.org('TC-B01')));
SELECT test.check('DK báo trước giờ nhận được ghi là báo sớm',
 (SELECT bool_and(reported_early) FROM core.shortfall_events WHERE seller_org_id=test.org('TC-B01')));

-- Nợ quá hạn chặn cam kết mới dù còn mức.
INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,due_at,status)
 VALUES('TEST-DK-QUA-HAN',test.id('R59A'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),1000,'after_days',now()-interval '1 day','due');
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.d.a4',cmd.propose_allocation(current_setting('test.d.d1')::uuid,current_setting('test.d.seller')::uuid,100000,20000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.approve_allocation(current_setting('test.d.a4')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('DK nợ quá hạn chặn cam kết mới','SELECT cmd.commit_allocation(current_setting(''test.d.a4'')::uuid)','ck_credit_overdue')$$);

-- Dừng thỏa thuận: dự kiến hủy, cam kết cũ còn.
SELECT test.as_login('db_test_buyer',$$SELECT cmd.stop_sourcing(current_setting('test.d.ag')::uuid)$$);
SELECT test.check('DK dừng: dự kiến bị hủy, không phát sinh nghĩa vụ',
 NOT EXISTS(SELECT 1 FROM core.sourcing_forecasts WHERE agreement_id=current_setting('test.d.ag')::uuid AND cancelled_at IS NULL));
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('DK dừng rồi không chốt ngày mới','SELECT cmd.confirm_sourcing_day(current_setting(''test.d.ag'')::uuid,current_date+6,1000)','ck_sourcing_cutoff')$$);
