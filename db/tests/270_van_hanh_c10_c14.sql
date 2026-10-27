-- Bản 23 · vận hành C10–C14 (migration 0064).
SELECT set_config('app.test_time','',true);

-- C10: giữ hàng tại chỗ chỉ khi mặt hàng có thông số; có hạn quyết định; hết hạn chạy phương án đã ủy quyền.
SELECT set_config('test.h.order',test.id('R59A')::text,false),set_config('test.h.checker',test.person('Nguyễn Thị Năm')::text,false);
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('C10 mặt hàng chưa có thông số giữ thì không giữ tại chỗ','SELECT cmd.start_hold_in_place(current_setting(''test.h.order'')::uuid,current_setting(''test.h.checker'')::uuid,''Giao một phần bằng xe nhỏ'',2000000)','ck_hold_not_allowed')$$);
INSERT INTO core.product_hold_limits(product_id,max_hold_hours,check_every_hours,decide_before_hours,note)
 SELECT product_id,12,3,6,'Bóng mát, thông số minh họa' FROM core.orders WHERE id=test.id('R59A');
SELECT test.as_login('db_test_approve',$$SELECT test.expect_error('C9 hợp đồng chưa ủy quyền giữ tại chỗ thì bị chặn','SELECT cmd.start_hold_in_place(current_setting(''test.h.order'')::uuid,current_setting(''test.h.checker'')::uuid,''x'',1)','ck_hold_not_authorized')$$);
CREATE FUNCTION test.h_uy_quyen() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 SET LOCAL session_replication_role=replica; -- giả lập điều khoản ủy quyền đã có trong hợp đồng đã ký
 UPDATE core.order_versions v SET extra_terms=coalesce(v.extra_terms,'{}')||'{"hold_default_plan":"Giao một phần bằng xe nhỏ","hold_max_cost_vnd":2000000}'
  FROM core.orders o WHERE o.id=test.id('R59A') AND v.order_id=o.id AND v.version_no=o.effective_version_no;
 SET LOCAL session_replication_role=origin;
END $f$;
SELECT test.h_uy_quyen();
SELECT test.as_login('db_test_approve',$$SELECT set_config('test.h.id',cmd.start_hold_in_place(current_setting('test.h.order')::uuid,current_setting('test.h.checker')::uuid,'Giao một phần bằng xe nhỏ',2000000)::text,false)$$);
SELECT test.check('C10 hạn quyết định = bắt đầu + 6 giờ, giữ tối đa 12 giờ',
 (SELECT decide_by=started_at+interval '6 hours' AND max_until=started_at+interval '12 hours' FROM core.hold_in_place WHERE id=current_setting('test.h.id')::uuid));
SELECT test.check('C10 đang giữ tại chỗ là hồ sơ mở',EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A')) WHERE kind='giu_tai_cho'));
INSERT INTO core.hold_in_place(order_id,started_at,max_until,decide_by,checker_user_id,default_plan,max_cost_vnd)
 VALUES(test.id('R59B'),now()-interval '13 hours',now()-interval '1 hour',now()-interval '7 hours',test.person('Nguyễn Thị Năm'),'Giao một phần bằng xe nhỏ',2000000);
SELECT test.as_login('db_test_system',$$SELECT cmd.expire_hold_in_place()$$);
SELECT test.check('C10 hết hạn giữ: chạy phương án đã ủy quyền trước',
 EXISTS(SELECT 1 FROM core.hold_in_place WHERE order_id=test.id('R59B') AND outcome='phuong_an_mac_dinh'));

-- C11: sự cố mẫu → mẫu không hợp lệ; bên chịu cần quyết định; kết quả trên mẫu sự cố bị chặn.
-- Dựng mẫu niêm phong và lần kiểm định dùng mẫu đó (bộ thử chưa có mẫu nào).
INSERT INTO core.sealed_samples(id,code,delivery_id,held_by_org_id,seal_no,sealed_by,sealed_at,document_id)
 VALUES(test.id('C11:mau'),'TEST-C11-MAU',test.id('R59A:batch:1'),test.org('DT-KD'),'NIEM-C11',test.person('Võ Hoàng Phúc'),now()-interval '2 days',test.id('R59A:bbnt:1'));
INSERT INTO core.inspections(id,delivery_id,dispute_id,sample_id,provider_org_id,kind,fee_vnd,prepaid_by_org_id,due_at)
 VALUES(test.id('C11:kd'),test.id('R59A:batch:1'),test.id('R59A:dispute'),test.id('C11:mau'),test.org('DT-KD'),'sample',150000,test.org('TC-M01'),now()+interval '1 day');
SELECT test.check('C11 dựng được mẫu và lần kiểm định',EXISTS(SELECT 1 FROM core.inspections WHERE id=test.id('C11:kd') AND sample_id=test.id('C11:mau')));
SELECT test.expect_error('C11 xác định bên chịu phải có quyết định',
 $$INSERT INTO core.sample_incidents(sample_id,kind,found_at,reported_by,responsible) SELECT id,'mat_niem',now(),test.person('Phạm Quốc Bảo'),'doi_tac' FROM core.sealed_samples LIMIT 1$$);
INSERT INTO core.sample_incidents(sample_id,kind,found_at,reported_by,redo_cost_vnd,advanced_by_org_id)
 SELECT id,'mat_niem',now(),test.person('Phạm Quốc Bảo'),150000,test.org('TC-M01') FROM core.sealed_samples ORDER BY code LIMIT 1;
SELECT test.check('C11 mẫu có sự cố là không hợp lệ',
 EXISTS(SELECT 1 FROM core.v_sample_validity v JOIN core.sample_incidents i ON i.sample_id=v.sample_id WHERE NOT v.hop_le));
SELECT test.expect_error('C11 không ghi kết quả kiểm định trên mẫu có sự cố',
 $$INSERT INTO core.inspection_results(inspection_id,result,inspector_user_id,measurements,issued_at)
   SELECT i.id,'pass',test.person('Phạm Quốc Bảo'),'{}',now() FROM core.inspections i JOIN core.sample_incidents x ON x.sample_id=i.sample_id LIMIT 1$$,'ck_sample_invalid');

-- C12: lỗi AgiViet: phải có quyết định hai người; chưa trả là hồ sơ mở.
SELECT test.expect_error('C12 quyết định không đúng loại/đơn không dùng được cho bồi hoàn',
 $$INSERT INTO core.platform_liabilities(order_id,kind,amount_vnd,payee_org_id,reason,decision_id,prevention_note)
   SELECT test.id('R59A'),'dat_nham_dich_vu',500000,test.org('TC-B01'),'Đặt xe thường thay xe lạnh',id,'Kiểm loại xe theo mặt hàng trước khi đặt' FROM ops.decisions WHERE proposed_by<>approved_by LIMIT 1$$,'ck_decision_two_people');
INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(test.id('C12:qd'),'platform_liability','order',test.id('R59A'),test.person('Đỗ Minh Trí'),test.person('Nguyễn Hữu Tâm'),'Lỗi đặt nhầm xe của AgiViet',test.id('R59A:bbnt:1'),'{"amount_vnd":500000}');
INSERT INTO core.platform_liabilities(order_id,kind,amount_vnd,payee_org_id,reason,decision_id)
 VALUES(test.id('R59A'),'dat_nham_dich_vu',500000,test.org('TC-B01'),'Đặt xe thường thay xe lạnh',test.id('C12:qd'));
SELECT test.expect_error('C12 đánh dấu đã trả phải có chứng từ ngân hàng',
 $$UPDATE core.platform_liabilities SET paid_at=now() WHERE decision_id=test.id('C12:qd')$$,'ck_pl_paid_evidence');
SELECT test.check('C12 bồi hoàn AgiViet chưa trả là hồ sơ mở',EXISTS(SELECT 1 FROM core.open_dossiers(test.id('R59A')) WHERE kind='agiviet_boi_hoan'));

-- C14: chi phí phục vụ theo đơn (Q24, phương pháp).
INSERT INTO ops.work_logs(task_id,user_id,work_on,minutes,category,outside_cost_vnd,subsidized,order_id,shared)
 VALUES(NULL,test.person('Phạm Quốc Bảo'),current_date,60,'sourcing',0,false,test.id('R59A'),false),
       (NULL,test.person('Phạm Quốc Bảo'),current_date,480,'standby',0,false,test.id('R59A'),true);
SELECT test.check('C14 công trực tiếp 60 phút × 60.000 đ/giờ = 60.000; ca trực dùng chung không tính trọn vào đơn',
 (SELECT direct_labor_vnd=60000 FROM ops.v_service_cost WHERE order_id=test.id('R59A')));
SELECT test.check('C14 chi phí đơn gồm bồi hoàn do lỗi AgiViet',
 (SELECT platform_liability_vnd>=500000 FROM ops.v_service_cost WHERE order_id=test.id('R59A')));
