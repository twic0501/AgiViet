-- Bản 23 · giao ngay C1–C6 (migration 0061). Dùng đơn R59A/R59B dựng ở tests/250 (tranh chấp chất lượng mở,
-- bên mua ứng phí kiểm định 280.000).
SELECT set_config('app.test_time','2026-11-04 07:00+07',true);

-- C1: nhãn trạng thái và hồ sơ có người phụ trách, hạn.
SELECT test.check('C1 nhãn "Đã quyết toán mua bán · còn hồ sơ mở"',
 (SELECT label_vi='Đã quyết toán mua bán · còn hồ sơ mở' FROM ref.statuses WHERE entity='order' AND code='outstanding'));
INSERT INTO ops.dossier_owners(order_id,kind,ref_id,owner_user_id,due_at,assigned_by)
 VALUES(test.id('R59A'),'tranh_chap',test.id('R59A:dispute'),test.person('Phạm Quốc Bảo'),ref.clock_at()+interval '2 days',test.person('Phạm Quốc Bảo'));
SELECT test.check('C1 hộp việc hiện hồ sơ tranh chấp có người phụ trách, chưa quá hạn',
 EXISTS(SELECT 1 FROM ops.v_open_dossiers WHERE order_id=test.id('R59A') AND kind='tranh_chap' AND NOT chua_co_nguoi_phu_trach AND NOT qua_han));
SELECT test.check('C1 hồ sơ chưa giao người phụ trách được đánh dấu',
 EXISTS(SELECT 1 FROM ops.v_open_dossiers WHERE order_id=test.id('R59A') AND chua_co_nguoi_phu_trach));

-- C2: phân bổ phí kiểm định qua chuỗi lệnh thật (chứng cứ → lập → duyệt → phân bổ).
SELECT test.check('C2 trước phân bổ: hồ sơ phí "chưa phân bổ" và nằm trong hồ sơ mở',
 EXISTS(SELECT 1 FROM core.v_fee_dossier WHERE inspection_id=test.id('R59A:inspection') AND trang_thai='chưa phân bổ')
 AND EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A')) WHERE kind='phi_kiem_dinh'));
SELECT set_config('test.c2.order',test.id('R59A')::text,false),set_config('test.c2.insp',test.id('R59A:inspection')::text,false),
       set_config('test.c2.evdata',test.command_doc('C2-PHI-EV')::text,false);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c2.ev',cmd.attach_evidence(current_setting('test.c2.order')::uuid,current_setting('test.c2.evdata')::jsonb)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c2.prop',cmd.propose_decision('inspection_fee_allocation','inspection',current_setting('test.c2.insp')::uuid,'Kết luận hàng không đạt: người bán chịu phí',current_setting('test.c2.ev')::uuid,'{"buyer_vnd":0,"seller_vnd":280000,"partner_vnd":0,"platform_vnd":0,"pending_vnd":0}')::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C2 người lập không tự duyệt','SELECT cmd.approve_decision(current_setting(''test.c2.prop'')::uuid)','ck_decision_two_people')$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.c2.dec',cmd.approve_decision(current_setting('test.c2.prop')::uuid)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT cmd.allocate_inspection_fee(current_setting('test.c2.dec')::uuid)$$);
SELECT test.check('C2 tổng phần chịu = phí 280.000',
 (SELECT buyer_vnd+seller_vnd+partner_vnd+platform_vnd+pending_vnd=280000 FROM core.inspection_fee_allocations WHERE inspection_id=test.id('R59A:inspection')));
SELECT test.check('C2 bên mua đã ứng, người bán chịu → tự tạo khoản người bán hoàn 280.000 cho bên mua',
 EXISTS(SELECT 1 FROM core.inspection_fee_allocations a JOIN core.direct_payments p ON p.id=a.reimburse_payment_id
        WHERE a.inspection_id=test.id('R59A:inspection') AND p.kind='inspection_fee_reimburse' AND p.direction='seller_to_buyer' AND p.amount_due_vnd=280000));
SELECT test.check('C2 hồ sơ phí "còn thiếu hoàn"; khoản hoàn nằm trong hồ sơ mở như khoản trả trực tiếp',
 EXISTS(SELECT 1 FROM core.v_fee_dossier WHERE inspection_id=test.id('R59A:inspection') AND trang_thai='còn thiếu hoàn' AND reimburse_due_vnd=280000 AND reimbursed_vnd=0)
 AND EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A')) WHERE kind='tien_truc_tiep'));
SELECT test.expect_error('C2 phân bổ phí bất biến',
 $$UPDATE core.inspection_fee_allocations SET seller_vnd=0,buyer_vnd=280000 WHERE inspection_id=test.id('R59A:inspection')$$,'ck_append_only');
-- Tổng sai bị chặn (đơn R59B).
SELECT set_config('test.c2b.order',test.id('R59B')::text,false),set_config('test.c2b.insp',test.id('R59B:inspection')::text,false),
       set_config('test.c2b.evdata',test.command_doc('C2B-PHI-EV')::text,false);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c2b.ev',cmd.attach_evidence(current_setting('test.c2b.order')::uuid,current_setting('test.c2b.evdata')::jsonb)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c2b.prop',cmd.propose_decision('inspection_fee_allocation','inspection',current_setting('test.c2b.insp')::uuid,'Thử tổng sai',current_setting('test.c2b.ev')::uuid,'{"buyer_vnd":0,"seller_vnd":100000,"partner_vnd":0,"platform_vnd":0,"pending_vnd":0}')::text,false)$$);
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.c2b.dec',cmd.approve_decision(current_setting('test.c2b.prop')::uuid)::text,false)$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C2 tổng phần chịu khác phí bị chặn','SELECT cmd.allocate_inspection_fee(current_setting(''test.c2b.dec'')::uuid)','ck_fee_allocation_sum')$$);

-- C4: nguồn xác minh của khoản tiền.
SELECT test.check('C4 khoản trả trước R59A ghi nguồn "người nhận xác nhận"',
 EXISTS(SELECT 1 FROM core.v_money_verification WHERE direct_payment_id=test.id('R59A:goods') AND nguon_xac_minh='người nhận xác nhận'));
SELECT test.check('C4 không có khoản đã nhận nào "chưa rõ nguồn" trong các đơn bản 23 của bộ thử này',
 NOT EXISTS(SELECT 1 FROM core.v_money_verification v JOIN core.orders o ON o.id=v.order_id WHERE o.id IN (test.id('R59A'),test.id('R59B')) AND v.nguon_xac_minh='chưa rõ nguồn'));

-- C5: chờ đối soát cọc. Lệnh hệ thống dùng giờ thật, nên phần này cũng dùng giờ thật (bỏ giờ thử).
SELECT set_config('app.test_time','',true);
SELECT test.command_order('C61D','TC-M01','Trần Thu Hà','spot');
SELECT set_config('test.c5.order',test.id('C61D')::text,false);
SELECT test.as_login('db_test_system',$$SELECT test.expect_error('C5 giữ quá 6 giờ bị chặn','SELECT cmd.open_deposit_reconciliation(current_setting(''test.c5.order'')::uuid,''Ngân hàng báo trễ'',7)','ck_command_payload')$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c5.recon',cmd.open_deposit_reconciliation(current_setting('test.c5.order')::uuid,'Ngân hàng báo trễ',6)::text,false)$$);
SELECT test.expect_error('C5 đang chờ đối soát: không đóng đơn vì quá hạn cọc',
 $$UPDATE core.orders SET status='closed',close_reason='deposit_expired' WHERE id=test.id('C61D')$$,'ck_deposit_reconciling');
SELECT test.check('C5 hồ sơ "đang chờ đối soát cọc" nằm trong hồ sơ mở',
 EXISTS(SELECT 1 FROM core.open_dossiers(test.id('C61D')) WHERE kind='doi_soat_coc'));
SELECT test.expect_error('C5 không mở hai lần đối soát cùng lúc',
 $$SELECT test.as_login('db_test_system','SELECT cmd.open_deposit_reconciliation(current_setting(''test.c5.order'')::uuid,''lần hai'',2)')$$,'ux_deposit_recon_open');
SELECT test.as_login('db_test_system',$$SELECT cmd.close_deposit_reconciliation(current_setting('test.c5.recon')::uuid,'khong_co_coc')$$);
SELECT test.check('C5 có kết quả "không có cọc" thì hết hồ sơ đối soát',
 NOT EXISTS(SELECT 1 FROM core.open_dossiers(test.id('C61D')) WHERE kind='doi_soat_coc'));

-- C6: hạn khiếu nại, kiểm sau giao, phản ánh muộn.
CREATE FUNCTION test.c6_dong_luot_giao(p_hours_ago integer) RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 SET LOCAL session_replication_role=replica; -- giả lập lượt giao đã đóng từ trước
 UPDATE core.deliveries SET status='closed',status_changed_at=ref.clock_at()-make_interval(hours=>p_hours_ago) WHERE id=test.id('R59A:batch:1');
 SET LOCAL session_replication_role=origin;
END $f$;
SELECT test.c6_dong_luot_giao(20);
SELECT test.check('C6 hạn khiếu nại mặc định 12 giờ',core.complaint_window_hours(test.id('R59A'))=12);
SELECT test.expect_error('C6 khiếu nại sau 20 giờ (quá hạn 12 giờ) bị chặn, chỉ ghi phản ánh',
 $$INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind) VALUES(test.id('R59A:line:2'),test.id('R59A'),10000,test.person('Võ Hoàng Phúc'),'Về kho mới thấy dập','quality')$$,'ck_complaint_window');
SELECT test.expect_ok('C6 phản ánh muộn ghi được (không tạo nghĩa vụ)',
 $$INSERT INTO core.late_feedback(order_id,raised_by,note) VALUES(test.id('R59A'),test.person('Võ Hoàng Phúc'),'Về kho mới thấy dập')$$);
INSERT INTO core.deferred_checks(order_id,delivery_id,criterion,result_due_at) VALUES(test.id('R59A'),test.id('R59A:batch:1'),'Dư lượng thuốc BVTV',ref.clock_at()+interval '5 days');
SELECT test.check('C6 tiêu chí kiểm sau giao chưa có kết quả nằm trong hồ sơ mở',
 EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A')) WHERE kind='kiem_sau_giao'));
SELECT test.check('C6 đơn còn hồ sơ mở thì không hoàn tất toàn bộ',
 EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A'))));
