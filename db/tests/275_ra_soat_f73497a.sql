-- Hồi quy theo Codex rà f73497a (migration 0065).
SELECT set_config('app.test_time','',true);

-- 1. Một phí chỉ thu một lần: phí đã thu qua quyết toán thì phân bổ không lập khoản hoàn nữa.
INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
 VALUES(test.id('R59A'),'inspection_fee','seller',150000,'{"test":"thu qua quyet toan"}','inspection',test.id('C11:kd'),test.person('Phạm Quốc Bảo'));
SELECT set_config('test.f5.insp',test.id('C11:kd')::text,false);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.f5.p',cmd.propose_decision('inspection_fee_allocation','inspection',current_setting('test.f5.insp')::uuid,'Người bán chịu',current_setting('test.c2.ev')::uuid,'{"buyer_vnd":0,"seller_vnd":150000,"partner_vnd":0,"platform_vnd":0,"pending_vnd":0}')::text,false)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.f5.d',cmd.approve_decision(current_setting('test.f5.p')::uuid)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.allocate_inspection_fee(current_setting('test.f5.d')::uuid)$$);
SELECT test.check('F1 phí đã thu qua quyết toán: không lập khoản hoàn trùng',
 (SELECT reimburse_payment_id IS NULL FROM core.inspection_fee_allocations WHERE inspection_id=test.id('C11:kd'))
 AND (SELECT collected_in_settlement_vnd=150000 AND reimburse_due_vnd=0 FROM core.v_fee_dossier WHERE inspection_id=test.id('C11:kd')));

-- 2. Khiếu nại sau giao, kết luận người bán sai → khoản trừ = lượng khiếu nại × đơn giá, không đảo tiền đã chi.
-- (tests/260 tạo khiếu nại trong expect_ok nên đã hoàn tác; tạo thật ở đây.)
SELECT test.c6_dong_luot_giao(1);
SELECT set_config('test.f2.l1',test.id('R59A:line:1')::text,false);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.f2.dispute',cmd.open_post_delivery_claim(current_setting('test.f2.l1')::uuid,10000,'Về kho thấy dập','quality')::text,false)$$);
SELECT test.check('F2 khiếu nại sau giao được đánh dấu post_delivery',(SELECT post_delivery FROM core.disputes WHERE id=current_setting('test.f2.dispute')::uuid));
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('F4 dòng đã có tranh chấp mở: không mở thêm','SELECT cmd.open_post_delivery_claim(current_setting(''test.f2.l1'')::uuid,5000,''Lần hai'',''quality'')','ck_dispute_duplicate')$$);
INSERT INTO core.dispute_resolutions(dispute_id,decision_id,acceptance_id,result,resolved_by)
 SELECT current_setting('test.f2.dispute')::uuid,(SELECT id FROM ops.decisions WHERE proposed_by<>approved_by ORDER BY created_at LIMIT 1),test.id('R59A:accept:1'),'failed',test.person('Phạm Quốc Bảo');
SELECT test.check('F2 khiếu nại sau giao người bán sai: trừ 10 kg × 23.000 = 230.000 qua quyết toán',
 EXISTS(SELECT 1 FROM core.contract_charges WHERE order_id=test.id('R59A') AND kind='post_delivery_claim' AND payer_side='seller' AND amount_vnd=230000));

-- 3. Chính sách chốt cùng bước ký.
SELECT test.command_order('F3','TC-M01','Trần Thu Hà','spot');
UPDATE core.orders SET policy_version=22 WHERE id=test.id('F3'); -- đơn nháp mang nhãn cũ
SELECT test.sign_order('F3','TC-M01','Trần Thu Hà');
SELECT test.check('F3 ký đủ sau khi E1 hiệu lực → chính sách 23',(SELECT policy_version=23 FROM core.orders WHERE id=test.id('F3')));

-- 4. Không trùng tranh chấp trên cùng dòng: kiểm ở mục 2 (F4).

-- 5. Đơn đã hoàn tất có hồ sơ mới vẫn hiện trong hộp việc, nhãn "còn hồ sơ mở".
INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,due_at,status)
 VALUES('TEST-F5-SAU-HOAN-TAT',test.id('LS1'),'seller_refund','seller_to_buyer',test.org('TC-B01'),test.org('TC-M01'),1000,'after_days',now()+interval '7 days','due');
SELECT test.check('F5 đơn completed có hồ sơ mới hiện trong hộp việc',
 (SELECT status='completed' FROM core.orders WHERE id=test.id('LS1')) AND EXISTS(SELECT 1 FROM ops.v_open_dossiers WHERE order_id=test.id('LS1') AND order_status='completed'));
SELECT test.check('F5 nhãn hiển thị "còn hồ sơ mở", trạng thái tiền không đảo',
 (SELECT nhan_hien_thi='Đã quyết toán mua bán · còn hồ sơ mở' AND status='completed' FROM core.v_order_display_status WHERE order_id=test.id('LS1')));

-- 6. Không giao việc cho tài khoản đã khóa; hồ sơ giao cho người bị khóa coi như chưa có người.
SELECT set_config('test.f6.owner',(SELECT s.user_id::text FROM ops.staff_assignments s WHERE s.active ORDER BY s.user_id DESC LIMIT 1),false);
SELECT set_config('test.f6.kind',kind,false),set_config('test.f6.ref',ref_id::text,false),set_config('test.f6.order',order_id::text,false)
 FROM ops.v_open_dossiers WHERE order_id=test.id('LS1') LIMIT 1;
UPDATE core.users SET disabled_at=now() WHERE id=current_setting('test.f6.owner')::uuid;
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('F6 không giao cho tài khoản đã khóa','SELECT cmd.assign_dossier(current_setting(''test.f6.order'')::uuid,current_setting(''test.f6.kind''),current_setting(''test.f6.ref'')::uuid,current_setting(''test.f6.owner'')::uuid,now()+interval ''1 day'')','ck_command_payload')$$);
UPDATE core.users SET disabled_at=NULL WHERE id=current_setting('test.f6.owner')::uuid;
