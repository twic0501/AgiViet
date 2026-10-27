SELECT set_config('app.test_time','',true);
CREATE ROLE db_test_inspector LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO db_test_inspector;
INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind)
SELECT 'db_test_inspector',m.user_id,m.org_id,'inspector' FROM core.memberships m JOIN ops.staff_assignments s ON s.user_id=m.user_id WHERE m.org_id=test.org('DT-KD') AND s.role_code='inspector' AND s.active LIMIT 1;
GRANT USAGE ON SCHEMA test TO db_test_inspector;
GRANT INSERT ON test.results TO db_test_inspector;
GRANT USAGE ON SEQUENCE test.results_id_seq TO db_test_inspector;
SELECT test.command_order('C42','TC-M01','Trần Thu Hà','spot',jsonb_build_object('delivery_window',tstzrange(now()-interval '1 hour',now()+interval '1 day'),'delivery_mode','at_buyer_warehouse','acceptance_point','tai_kho_ben_mua','acceptance_facility_id',NULL,'designated_receiver_user_id',test.person('Võ Hoàng Phúc')));
SELECT test.sign_order('C42','TC-M01','Trần Thu Hà');SELECT test.fund_order('C42');
INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window) SELECT 'C42-D1',order_id,1,1,qty_min,delivery_window FROM core.order_versions WHERE order_id=test.id('C42');
SELECT set_config('test.c42.order',test.id('C42')::text,true),set_config('test.c42.delivery',(SELECT id::text FROM core.deliveries WHERE code='C42-D1'),true);
-- Tham số user đích không phải actor; giấu truy vấn fixture khỏi runtime.
SELECT set_config('test.c42.receiver',test.person('Võ Hoàng Phúc')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c42.qr',cmd.assign_receiver(current_setting('test.c42.delivery')::uuid,current_setting('test.c42.receiver')::uuid)::text,true)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.ready_delivery(current_setting('test.c42.delivery')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.dispatch_delivery(current_setting('test.c42.delivery')::uuid)$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.scan_qr(current_setting('test.c42.qr'),'TEST')$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.start_acceptance(current_setting('test.c42.delivery')::uuid)$$);
SELECT set_config('test.c42.doc',test.command_doc('C42-BBNT')::text,true),set_config('test.c42.lines',jsonb_build_array(jsonb_build_object('lot_id',test.id('C42:lot'),'kind','accepted','qty',1500000,'payable_qty',1500000,'unit_price_vnd',23000,'value_vnd',34500000),jsonb_build_object('lot_id',test.id('C42:lot'),'kind','rejected','qty',500000,'payable_qty',0,'unit_price_vnd',0,'value_vnd',0,'reason_code',(SELECT r.reason_code FROM core.product_reject_reasons r JOIN core.lots l ON l.product_id=r.product_id AND l.profile_version=r.profile_version WHERE l.id=test.id('C42:lot') ORDER BY r.reason_code LIMIT 1)))::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c42.acceptance',cmd.submit_acceptance(current_setting('test.c42.delivery')::uuid,2000000,current_setting('test.c42.doc')::jsonb,current_setting('test.c42.lines')::jsonb)::text,true)$$);
SELECT set_config('test.c42.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c42.acceptance')::uuid),true);
SELECT set_config('test.c42.receipt',cmd.record_reauthentication(test.person('Võ Hoàng Phúc'),current_setting('test.c42.docid')::uuid,'TEST','pin')::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.sign_record(current_setting('test.c42.docid')::uuid,'buyer','qr_confirm','TEST',current_setting('test.c42.receipt')::uuid)$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.send_acceptance(current_setting('test.c42.acceptance')::uuid)$$);
-- Chốt phần không tranh chấp qua chữ ký hai bên trước khi mở dòng phản đối.
SELECT set_config('test.c42.line',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c42.acceptance')::uuid AND kind='rejected'),true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c42.dispute',cmd.open_dispute(current_setting('test.c42.line')::uuid,500000,'Người bán phản đối phần trả lại')::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C42 không mở tranh chấp lặp/vượt lượng','SELECT cmd.open_dispute(current_setting(''test.c42.line'')::uuid,500001,''Sai lượng'')','ck_dispute_scope')$$);
SELECT test.check('C42 phản đối ghim người mở và trạng thái đợt',EXISTS(SELECT 1 FROM core.disputes WHERE id=current_setting('test.c42.dispute')::uuid AND opened_by=test.person('Nguyễn Thị Năm')) AND EXISTS(SELECT 1 FROM core.deliveries WHERE code='C42-D1' AND status='disputed'));
-- Phần còn lại đã được người bán chấp thuận: command chuyên biệt, không UPDATE owner.
SELECT set_config('test.c42.goodline',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c42.acceptance')::uuid AND kind='accepted'),true);
SELECT set_config('test.c42.receipt',cmd.record_reauthentication(test.person('Nguyễn Thị Năm'),current_setting('test.c42.docid')::uuid,'TEST','pin')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.sign_record(current_setting('test.c42.docid')::uuid,'seller','qr_confirm','TEST',current_setting('test.c42.receipt')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.agree_acceptance_line(current_setting('test.c42.goodline')::uuid)$$);
SELECT set_config('test.c42.provider',test.org('DT-KD')::text,true),set_config('test.c42.evidence',test.command_doc('C42-FEE')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c42.proof',cmd.attach_evidence(current_setting('test.c42.order')::uuid,current_setting('test.c42.evidence')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c42.inspection',cmd.request_inspection(current_setting('test.c42.dispute')::uuid,current_setting('test.c42.provider')::uuid,NULL,100000,current_setting('test.c42.proof')::uuid)::text,true)$$);
SELECT set_config('test.c42.report',test.command_doc('C42-REPORT')::text,true),set_config('test.c42.newdoc',test.command_doc('C42-NEW-BBNT')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C42 buyer không giả kết luận kiểm định','SELECT cmd.record_inspection_result(current_setting(''test.c42.inspection'')::uuid,''TEST-EVENT'',''failed'',current_setting(''test.c42.report'')::jsonb,''{}'',current_setting(''test.c42.newdoc'')::jsonb)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_inspector',$$SELECT set_config('test.c42.result',cmd.record_inspection_result(current_setting('test.c42.inspection')::uuid,'TEST-EVENT','failed',current_setting('test.c42.report')::jsonb,'{}',current_setting('test.c42.newdoc')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_inspector',$$SELECT cmd.record_inspection_result(current_setting('test.c42.inspection')::uuid,'TEST-EVENT','failed',current_setting('test.c42.report')::jsonb,'{}',current_setting('test.c42.newdoc')::jsonb)$$);
SELECT test.as_login('db_test_inspector',$$SELECT test.expect_error('C42 event kiểm định khác kết quả bị chặn','SELECT cmd.record_inspection_result(current_setting(''test.c42.inspection'')::uuid,''TEST-EVENT'',''passed'',current_setting(''test.c42.report'')::jsonb,''{}'',current_setting(''test.c42.newdoc'')::jsonb)','IDEMPOTENCY_CONFLICT')$$);
SELECT test.check('C42 kết luận bất biến, phí bên sai ghi đúng một lần',EXISTS(SELECT 1 FROM core.disputes WHERE id=current_setting('test.c42.dispute')::uuid AND status='resolved') AND (SELECT count(*)=1 AND sum(amount_vnd)=100000 FROM core.contract_charges WHERE order_id=test.id('C42') AND kind='inspection_fee'));
SELECT test.as_login('db_test_system',$$SELECT cmd.close_resolved_delivery(current_setting('test.c42.delivery')::uuid)$$);
SELECT test.check('C42 đóng theo kết luận chuyển đúng 1500kg đạt/500kg trả',EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=test.id('C42:lot') AND order_key=test.id('C42') AND bucket='delivered' AND qty=1500000) AND EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=test.id('C42:lot') AND order_key=test.id('C42') AND bucket='returned_pending' AND qty=500000));
SELECT test.as_login('db_test_system',$$SELECT cmd.create_settlement(current_setting('test.c42.order')::uuid,true,'C42-FINAL')$$);
SELECT test.check('C42 quyết toán dùng bản theo kiểm định và phí đã ứng',EXISTS(SELECT 1 FROM core.settlements WHERE order_id=test.id('C42') AND is_final AND v_vnd=34500000 AND x_nb_vnd=100000 AND n_vnd=34400000));
SET CONSTRAINTS ALL IMMEDIATE;
