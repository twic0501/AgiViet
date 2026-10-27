-- Hồi quy theo Codex rà 1614c70 (migration 0062). Dùng R59A/R59B từ tests/250–255.
SELECT set_config('app.test_time','',true); -- lệnh hệ thống/đăng nhập dùng giờ thật

-- 2 + 5: phân bổ phí có phiên bản; phần chờ xử lý chuyển sang kết luận cuối; khoản hoàn có hạn.
SELECT set_config('test.f.order',test.id('R59B')::text,false),set_config('test.f.insp',test.id('R59B:inspection')::text,false),
       set_config('test.f.evdata',test.command_doc('F62-EV')::text,false);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.f.ev',cmd.attach_evidence(current_setting('test.f.order')::uuid,current_setting('test.f.evdata')::jsonb)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.f.p1',cmd.propose_decision('inspection_fee_allocation','inspection',current_setting('test.f.insp')::uuid,'Chưa rõ lỗi: để chờ',current_setting('test.f.ev')::uuid,'{"buyer_vnd":0,"seller_vnd":0,"partner_vnd":0,"platform_vnd":0,"pending_vnd":280000}')::text,false)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.f.d1',cmd.approve_decision(current_setting('test.f.p1')::uuid)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.allocate_inspection_fee(current_setting('test.f.d1')::uuid)$$);
SELECT test.check('R62-2 phân bổ đầu: còn phần chờ xử lý, chưa có khoản hoàn',
 EXISTS(SELECT 1 FROM core.v_fee_dossier WHERE inspection_id=test.id('R59B:inspection') AND trang_thai='còn phần chờ xử lý' AND reimburse_due_vnd=0));
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.f.p2',cmd.propose_decision('inspection_fee_allocation','inspection',current_setting('test.f.insp')::uuid,'Kết luận: người bán chịu',current_setting('test.f.ev')::uuid,'{"buyer_vnd":0,"seller_vnd":280000,"partner_vnd":0,"platform_vnd":0,"pending_vnd":0}')::text,false)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.f.d2',cmd.approve_decision(current_setting('test.f.p2')::uuid)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.f.a2',cmd.allocate_inspection_fee(current_setting('test.f.d2')::uuid)::text,false)$$);
SELECT test.check('R62-2 quyết định mới tạo phiên bản 2, hết phần chờ, tạo khoản hoàn 280.000',
 EXISTS(SELECT 1 FROM core.v_fee_dossier WHERE inspection_id=test.id('R59B:inspection') AND version_no=2 AND pending_vnd=0 AND seller_vnd=280000 AND reimburse_due_vnd=280000 AND trang_thai='còn thiếu hoàn'));
SELECT test.as_login('db_test_verify',$$SELECT test.check('R62-2 gọi lại cùng quyết định trả đúng phân bổ cũ, không tạo thêm',cmd.allocate_inspection_fee(current_setting('test.f.d2')::uuid)=current_setting('test.f.a2')::uuid)$$);
SELECT test.check('R62-2 chỉ một khoản hoàn cho kiểm định này',
 (SELECT count(*)=1 FROM core.inspection_fee_allocations a JOIN core.direct_payments p ON p.id=a.reimburse_payment_id WHERE a.inspection_id=test.id('R59B:inspection')));
SELECT test.check('R62-5 mọi khoản hoàn phí có hạn trả',
 NOT EXISTS(SELECT 1 FROM core.direct_payments WHERE kind='inspection_fee_reimburse' AND code LIKE 'PKD-%' AND due_at IS NULL AND created_at>now()-interval '1 day' AND order_id=test.id('R59B')));

-- 3: khiếu nại sau giao qua lệnh của bên mua.
SELECT set_config('test.k.l1',test.id('R59A:line:1')::text,false),set_config('test.k.l2',test.id('R59A:line:2')::text,false),set_config('test.k.l4',test.id('R59A:line:4')::text,false),
       set_config('test.k.chk',(SELECT id FROM core.deferred_checks WHERE order_id=test.id('R59A') LIMIT 1)::text,false);
SELECT test.c6_dong_luot_giao(1);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_ok('R62-3 khiếu nại trong hạn 12 giờ sau giao qua lệnh được nhận','SELECT cmd.open_post_delivery_claim(current_setting(''test.k.l1'')::uuid,10000,''Về kho thấy dập'',''quality'')')$$);
SELECT test.c6_dong_luot_giao(20);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('R62-3 quá hạn, không gắn tiêu chí kiểm sau: bị chặn','SELECT cmd.open_post_delivery_claim(current_setting(''test.k.l2'')::uuid,10000,''Muộn'',''quality'')','ck_complaint_window')$$);
UPDATE core.deferred_checks SET result='khong_dat',result_at=ref.clock_at() WHERE id=current_setting('test.k.chk')::uuid;
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('R62-3 tiêu chí kiểm sau KHÔNG mở cửa cho khiếu nại thiếu cân','SELECT cmd.open_post_delivery_claim(current_setting(''test.k.l2'')::uuid,10000,''Thiếu cân'',''shortfall'',current_setting(''test.k.chk'')::uuid)','ck_complaint_window')$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_ok('R62-3 khiếu nại chất lượng gắn đúng tiêu chí kiểm sau không đạt được nhận','SELECT cmd.open_post_delivery_claim(current_setting(''test.k.l2'')::uuid,10000,''Dư lượng không đạt'',''quality'',current_setting(''test.k.chk'')::uuid)')$$);

-- 4: chờ đối soát cọc, hạn tuyệt đối 6 giờ; hồ sơ quá hạn được đóng.
SELECT test.command_order('C62D','TC-M01','Trần Thu Hà','spot');
SELECT set_config('test.r.order',test.id('C62D')::text,false);
INSERT INTO cmd.test_clock(at) VALUES(now()-interval '1 hour'); -- lần mở đầu: 1 giờ trước
SELECT test.as_login('db_test_system',$$SELECT set_config('test.r.r1',cmd.open_deposit_reconciliation(current_setting('test.r.order')::uuid,'Ngân hàng báo trễ',6)::text,false)$$);
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_system',$$SELECT cmd.close_deposit_reconciliation(current_setting('test.r.r1')::uuid,'khong_co_coc')$$);
SELECT test.expect_error('R62-4 đóng rồi mở lại không kéo dài quá 6 giờ tính từ lần đầu',
 $$SELECT test.as_login('db_test_system','SELECT cmd.open_deposit_reconciliation(current_setting(''test.r.order'')::uuid,''Mở lại'',6)')$$,'ck_deposit_recon_cap');
SELECT test.command_order('C62E','TC-M01','Trần Thu Hà','spot');
INSERT INTO core.deposit_reconciliations(order_id,opened_at,hold_until,reason,opened_by)
 VALUES(test.id('C62E'),now()-interval '7 hours',now()-interval '1 hour','Ngân hàng báo trễ',test.person('Phạm Quốc Bảo'));
SELECT test.as_login('db_test_system',$$SELECT cmd.expire_deposit_reconciliations()$$);
SELECT test.check('R62-4 hồ sơ đối soát quá hạn được đóng "hết hạn"',
 EXISTS(SELECT 1 FROM core.deposit_reconciliations WHERE order_id=test.id('C62E') AND outcome='het_han' AND closed_at IS NOT NULL));

-- 6: hồ sơ mở chưa có người phụ trách → tạo việc; giao người phụ trách.
SELECT test.as_login('db_test_system',$$SELECT set_config('test.s.n1',cmd.sweep_open_dossiers()::text,false)$$);
SELECT test.check('R62-6 quét tạo việc V25 cho hồ sơ chưa có người phụ trách',
 current_setting('test.s.n1')::integer>0 AND EXISTS(SELECT 1 FROM ops.tasks WHERE kind='V25' AND order_id=test.id('R59A')));
SELECT test.as_login('db_test_system',$$SELECT set_config('test.s.n2',cmd.sweep_open_dossiers()::text,false)$$);
SELECT test.check('R62-6 quét lại không tạo việc trùng',current_setting('test.s.n2')::integer=0);
SELECT set_config('test.s.kind',kind,false),set_config('test.s.ref',ref_id::text,false)
 FROM ops.v_open_dossiers WHERE order_id=test.id('R59A') AND chua_co_nguoi_phu_trach ORDER BY kind,ref_id LIMIT 1;
SELECT set_config('test.s.owner',(SELECT user_id::text FROM ops.staff_assignments WHERE active ORDER BY user_id LIMIT 1),false),
       set_config('test.s.order',test.id('R59A')::text,false);
SELECT test.as_login('db_test_verify',$$SELECT cmd.assign_dossier(current_setting('test.s.order')::uuid,current_setting('test.s.kind'),current_setting('test.s.ref')::uuid,current_setting('test.s.owner')::uuid,now()+interval '1 day')$$);
SELECT test.check('R62-6 hồ sơ đã giao người phụ trách và hạn',
 EXISTS(SELECT 1 FROM ops.v_open_dossiers WHERE order_id=test.id('R59A') AND kind=current_setting('test.s.kind') AND ref_id=current_setting('test.s.ref')::uuid AND NOT chua_co_nguoi_phu_trach));
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('R62-6 không giao cho hồ sơ không tồn tại','SELECT cmd.assign_dossier(current_setting(''test.s.order'')::uuid,''khong_co'',gen_random_uuid(),current_setting(''test.s.owner'')::uuid,now()+interval ''1 day'')','ck_command_payload')$$);
