-- Hồi quy theo Codex rà e93e590 (migration 0067). Dùng dữ liệu từ tests/250–275.
SELECT set_config('app.test_time','',true);

-- C5: tăng cam kết cũ cũng bị kiểm quá hạn (265 để lại khoản quá hạn TC-M01 → TC-B01).
SELECT test.check('Tiền đề: còn khoản quá hạn giữa hai bên',core.pair_has_overdue(test.org('TC-M01'),test.org('TC-B01')));
-- C8: thỏa thuận đã dừng (265) không nhận cam kết mới.
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C8 thỏa thuận đã dừng: không cam kết mới','SELECT cmd.commit_allocation(current_setting(''test.d.a4'')::uuid)','ck_sourcing_stopped')$$);
-- C6: giao thiếu một phần giữ phần đã giao (a1: 1 tấn, giao 0,5 tấn).
SELECT test.check('C6 độ phủ ngày 1 giữ 0,5 tấn đã giao, không về 0',
 (SELECT committed_qty_g=500000 FROM core.v_sourcing_coverage WHERE day_id=current_setting('test.d.d1')::uuid));

-- Thỏa thuận mới sau khi khoản quá hạn được xử lý (đã trả).
CREATE FUNCTION test.e_huy_qua_han() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 SET LOCAL session_replication_role=replica; -- dọn dữ liệu thử: khoản quá hạn giả lập đã được xử lý
 UPDATE core.direct_payments SET status='cancelled' WHERE code='TEST-DK-QUA-HAN';
 SET LOCAL session_replication_role=origin;
END $f$;
SELECT test.e_huy_qua_han();
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.e.ag',cmd.create_sourcing_agreement('DK-E93',current_setting('test.d.product')::uuid,'{}',NULL,false,NULL,NULL,NULL)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.e.d',cmd.confirm_sourcing_day(current_setting('test.e.ag')::uuid,current_date+5,2000000)::text,false)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.e.a',cmd.propose_allocation(current_setting('test.e.d')::uuid,current_setting('test.d.seller')::uuid,1000000,20000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.approve_allocation(current_setting('test.e.a')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.commit_allocation(current_setting('test.e.a')::uuid)$$);
-- C5: tăng lượng qua đổi lượng vượt mức cho nợ → chặn.
SELECT test.as_login('db_test_seller',$$SELECT cmd.set_credit_terms(current_setting('test.d.buyer')::uuid,3,core.pair_exposure(current_setting('test.d.buyer')::uuid,current_setting('test.d.seller')::uuid))$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.e.c1',cmd.request_allocation_change(current_setting('test.e.a')::uuid,3000000)::text,false)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C5 tăng cam kết qua đổi lượng vượt mức cho nợ bị chặn','SELECT cmd.answer_allocation_change(current_setting(''test.e.c1'')::uuid,true,0,NULL)','ck_credit_limit')$$);
-- C8: giảm lượng có chi phí → khoản phải trả chờ bên mua xác nhận.
SELECT set_config('test.e.ev',test.id('R59A:bbnt:1')::text,false);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.e.c2',cmd.request_allocation_change(current_setting('test.e.a')::uuid,500000)::text,false)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.answer_allocation_change(current_setting('test.e.c2')::uuid,true,1500000,current_setting('test.e.ev')::uuid)$$);
SELECT test.check('C8 chi phí đổi lượng thành khoản chờ bên mua xác nhận',
 EXISTS(SELECT 1 FROM core.sourcing_cost_claims WHERE change_id=current_setting('test.e.c2')::uuid AND amount_vnd=1500000 AND status='cho_ben_mua_xac_nhan'));
SELECT set_config('test.e.k',(SELECT id::text FROM core.sourcing_cost_claims WHERE change_id=current_setting('test.e.c2')::uuid),false);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.answer_sourcing_cost(current_setting('test.e.k')::uuid,true)$$);
SELECT test.check('C8 bên mua xác nhận → khoản phải trả có hạn 7 ngày',
 EXISTS(SELECT 1 FROM core.sourcing_cost_claims WHERE id=current_setting('test.e.k')::uuid AND status='phai_tra' AND due_at IS NOT NULL));
SELECT test.expect_error('C8 đánh dấu đã trả phải có chứng từ',
 $$UPDATE core.sourcing_cost_claims SET status='da_tra' WHERE id=current_setting('test.e.k')::uuid$$);

-- C9: giữ tại chỗ lần hai không kéo dài quá hạn tính từ lần đầu (270 đã giữ R59A).
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.e.h2',cmd.start_hold_in_place(current_setting('test.h.order')::uuid,current_setting('test.h.checker')::uuid,'x',1)::text,false)$$);
SELECT test.check('C9 lần giữ thứ hai dùng hạn của lần đầu, lấy phương án và mức chi từ hợp đồng',
 (SELECT h2.max_until=h1.max_until AND h2.default_plan='Giao một phần bằng xe nhỏ' AND h2.max_cost_vnd=2000000
  FROM core.hold_in_place h1, core.hold_in_place h2 WHERE h1.id=current_setting('test.h.id')::uuid AND h2.id=current_setting('test.e.h2')::uuid));

-- C3/C7: phí đã phân bổ không thu thêm qua quyết toán; cùng phần hàng không khiếu nại vượt lượng.
SELECT set_config('test.e.n',(SELECT count(*)::text FROM core.contract_charges WHERE source_id=test.id('C11:kd') AND kind='inspection_fee'),false);
INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
 VALUES(test.id('R59A'),'inspection_fee','seller',150000,'{"test":"luồng kết luận sau phân bổ"}','inspection',test.id('C11:kd'),test.person('Phạm Quốc Bảo'));
SELECT test.check('C3 đã có phân bổ phí: luồng kết luận không thu thêm',
 (SELECT count(*) FROM core.contract_charges WHERE source_id=test.id('C11:kd') AND kind='inspection_fee')=current_setting('test.e.n')::bigint);
SELECT test.c6_dong_luot_giao(1);
SELECT set_config('test.e.l1',test.id('R59A:line:1')::text,false);
CREATE FUNCTION test.e_dong_tc() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 SET LOCAL session_replication_role=replica; -- tranh chấp đã có kết luận ở 275: đặt trạng thái đã giải quyết
 UPDATE core.disputes SET status='resolved' WHERE line_id=test.id('R59A:line:1') AND post_delivery;
 SET LOCAL session_replication_role=origin;
END $f$;
SELECT test.e_dong_tc();
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C7 khiếu nại lại cùng phần hàng vượt lượng đã nhận bị chặn','SELECT cmd.open_post_delivery_claim(current_setting(''test.e.l1'')::uuid,1745000,''Lần hai'',''quality'')','ck_claim_qty')$$);

-- Hồi quy Codex rà ca931aa (0069).
SELECT test.expect_error('ca931aa một quyết định bồi hoàn chỉ tạo một nghĩa vụ',
 $$INSERT INTO core.platform_liabilities(order_id,kind,amount_vnd,payee_org_id,reason,decision_id) VALUES(test.id('R59A'),'dat_nham_dich_vu',1,test.org('TC-B01'),'Lần hai',test.id('C12:qd'))$$);
SELECT test.expect_error('ca931aa đổi bên nhận bồi hoàn bị chặn',
 $$UPDATE core.platform_liabilities SET payee_org_id=test.org('TC-M01') WHERE decision_id=test.id('C12:qd')$$,'ck_append_only');
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('ca931aa không gắn phân bổ vào đơn đã kết thúc','SELECT cmd.link_allocation_order(current_setting(''test.e.a'')::uuid,(SELECT id FROM core.orders WHERE status IN (''completed'',''outstanding'',''closed'') LIMIT 1))')$$);

-- Hồi quy Codex rà 74bdd15 (0070).
SELECT test.expect_error('74bdd15 ghi đã trả bồi hoàn trực tiếp (không qua lệnh xác minh) bị chặn',
 $$UPDATE core.platform_liabilities SET paid_at=now(),paid_evidence_id=test.id('R59A:bbnt:1') WHERE decision_id=test.id('C12:qd')$$,'ck_pl_paid_evidence');
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('74bdd15 quyết định khác loại không kết luận được tranh chấp chi phí','SELECT cmd.settle_sourcing_cost_dispute(current_setting(''test.e.k'')::uuid,test.id(''C12:qd''),0)')$$);

-- Q24: ghi công qua việc được tính vào chi phí của đơn.
INSERT INTO ops.work_logs(task_id,user_id,work_on,minutes,category,outside_cost_vnd,subsidized)
 SELECT id,test.person('Phạm Quốc Bảo'),current_date,30,'exception',0,false FROM ops.tasks WHERE kind='V25' AND order_id=test.id('R59B') LIMIT 1;
SELECT test.check('Q24 công ghi qua việc tính vào đơn của việc',
 (SELECT direct_labor_vnd>=30000 FROM ops.v_service_cost WHERE order_id=test.id('R59B')));
