DELETE FROM cmd.test_clock;
-- Hồi quy thực tế: đủ cọc, đề nghị đổi giá, ký cả hai bên rồi áp.
CREATE FUNCTION test.price_annex(k text,p_price bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM test.command_order(k,'TC-M01','Trần Thu Hà','spot');
 PERFORM test.sign_order(k,'TC-M01','Trần Thu Hà'); PERFORM test.fund_order(k);
 PERFORM set_config('test.x.order',test.id(k)::text,true);
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
 SELECT k||'-D1',test.id(k),1,1,qty_min,delivery_window,test.person('Võ Hoàng Phúc') FROM core.order_versions WHERE order_id=test.id(k) AND version_no=1;
 PERFORM set_config('test.c51.price',p_price::text,true);
 PERFORM test.as_login('db_test_seller',$q$SELECT set_config('test.c51.amend',cmd.propose_amendment(current_setting('test.x.order')::uuid,'change_price',jsonb_build_object('unit_price_vnd',current_setting('test.c51.price')::bigint,'reason','Hai bên đổi giá'))::text,true)$q$);
 PERFORM set_config('test.c51.doc',test.command_doc(k||'-ANNEX')::text,true);
 PERFORM test.as_login('db_test_buyer',$q$SELECT set_config('test.c51.docid',cmd.answer_amendment(current_setting('test.c51.amend')::uuid,'accept',current_setting('test.c51.doc')::jsonb)::text,true)$q$);
 PERFORM set_config('test.c51.otp',test.otp(current_setting('test.c51.docid')::uuid,test.person('Trần Thu Hà')),true);
 PERFORM test.as_login('db_test_buyer',$q$SELECT cmd.sign_document(current_setting('test.c51.docid')::uuid,'buyer',current_setting('test.c51.otp'),'TEST')$q$);
 PERFORM set_config('test.c51.otp',test.otp(current_setting('test.c51.docid')::uuid,test.person('Nguyễn Thị Năm')),true);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.sign_document(current_setting('test.c51.docid')::uuid,'seller',current_setting('test.c51.otp'),'TEST')$q$);
 PERFORM test.as_login('db_test_system',$q$SELECT cmd.apply_signed_amendment(current_setting('test.c51.amend')::uuid)$q$);
END $$;
REVOKE ALL ON FUNCTION test.price_annex(text,bigint) FROM PUBLIC;
-- Có phí 138000 thực thu: phụ lục giá giữ nguyên phí và cơ sở phí đã ký.
SELECT test.price_annex('C51LOW',20000);
SELECT test.check('C51 giảm giá ký/áp thành công, giữ phí Q06',EXISTS(SELECT 1 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no JOIN core.order_versions p ON p.order_id=o.id AND p.version_no=1 WHERE o.id=test.id('C51LOW') AND o.effective_version_no=2 AND v.unit_price_vnd=20000 AND v.deposit_vnd=12000000 AND v.fee_vnd=p.fee_vnd AND v.fee_vnd=138000));
SELECT test.check('C51 chỉ hoàn 1800000 cọc về nguồn, không hoàn phí',(SELECT sum(amount_vnd)=1800000 FROM core.bank_instructions WHERE order_id=current_setting('test.x.order')::uuid AND kind='refund_deposit_to_buyer') AND NOT EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=current_setting('test.x.order')::uuid AND kind='refund_fee') AND EXISTS(SELECT 1 FROM core.deposit_adjustments WHERE deposit_id=(SELECT id FROM core.deposits WHERE order_id=current_setting('test.x.order')::uuid) AND delta_fee_vnd=0 AND payment_ref IS NULL));
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.c51.amend')::uuid)$$);
SELECT test.check('C51 retry áp giảm giá không nhân lệnh',(SELECT count(*)=1 FROM core.bank_instructions WHERE order_id=current_setting('test.x.order')::uuid));
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c51.next',cmd.propose_amendment(current_setting('test.x.order')::uuid,'decrease_qty','{"qty_g":1000000,"reason":"Giảm nửa lượng sau đổi giá"}')::text,true)$$);
SELECT set_config('test.c51.doc',test.command_doc('C51LOW-QTY-ANNEX')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.answer_amendment(current_setting('test.c51.next')::uuid,'accept',current_setting('test.c51.doc')::jsonb)$$);
SELECT test.check('C51 giảm lượng sau giảm giá phân phí cũ theo lượng, áp sàn/trần',EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=test.id('C51LOW') AND version_no=3 AND fee_vnd=69000) AND EXISTS(SELECT 1 FROM core.order_version_fee_bases WHERE order_id=test.id('C51LOW') AND version_no=3 AND basis_vnd=23000000));
SELECT test.expect_error('C51 cơ sở phí phụ lục bất biến',$$UPDATE core.order_version_fee_bases SET basis_vnd=1 WHERE order_id=test.id('C51LOW')$$,'ck_append_only');
SELECT test.price_annex('C51HIGH',25000);
SELECT set_config('test.c51.ref',(SELECT payment_ref FROM core.deposit_adjustments WHERE deposit_id=(SELECT id FROM core.deposits WHERE order_id=current_setting('test.x.order')::uuid)),true);
SELECT test.check('C51 mã bổ sung cọc 14 ký tự MOD97, phí đổi giá giữ nguyên',current_setting('test.c51.ref') ~ '^TP[0-9]{12}$' AND substring(current_setting('test.c51.ref') FROM 3)::numeric%97=1 AND EXISTS(SELECT 1 FROM core.deposit_adjustments WHERE payment_ref=current_setting('test.c51.ref') AND delta_deposit_vnd=1200000 AND delta_fee_vnd=0));
SELECT test.apply_bank_event(test.bank_receipt('C51HIGH-TOPUP',1200000,current_setting('test.c51.ref')));
SELECT test.check('C51 callback mã ngắn khớp đúng cọc',(SELECT coalesce(sum(balance_vnd),0)=15000000 FROM ledger.v_account_balances WHERE order_id=current_setting('test.x.order')::uuid AND account_type='deposit_escrow'));
SELECT test.check('C51 runtime không được cấp sequence hay helper mã',NOT has_sequence_privilege('agiviet_app','core.topup_reference_seq','USAGE') AND NOT has_function_privilege('agiviet_app','core.assign_topup_reference()','EXECUTE'));
-- create_invitee có sẵn: không tạo lại danh tính khi cùng phone hash; không ghi đè tên/bản mã.
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c51.invitee',cmd.create_invitee('Người được mời mới C51',decode('c1','hex'),digest('C51-PHONE','sha256'),'090***151','TEST')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c51.invitee2',cmd.create_invitee('Không ghi đè',decode('c2','hex'),digest('C51-PHONE','sha256'),'090***151','TEST')::text,true)$$);
SELECT test.check('C51 tạo danh tính mời idempotent theo số, không ghi đè',current_setting('test.c51.invitee')=current_setting('test.c51.invitee2') AND EXISTS(SELECT 1 FROM core.users u JOIN pii.user_contacts p ON p.user_id=u.id WHERE u.id=current_setting('test.c51.invitee')::uuid AND u.display_name='Người được mời mới C51' AND p.phone_enc=decode('c1','hex') AND p.phone_verified_at IS NULL));
SELECT test.as_login('db_test_seller',$$SELECT cmd.invite_member(current_setting('test.c51.invitee')::uuid,ARRAY['collection_staff'],NULL)$$);
SELECT test.check('C51 danh tính mới mời được, chưa tự kích hoạt',EXISTS(SELECT 1 FROM core.memberships WHERE user_id=current_setting('test.c51.invitee')::uuid AND status='invited'));
-- Dựng phản đối 80 kg; hai dòng không tranh chấp đã chốt.
CREATE FUNCTION test.objection(k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM test.ready_source(k);
 PERFORM set_config('test.c47.doc',test.command_doc(k||'-BBNT')::text,true);
 PERFORM set_config('test.c47.lines',jsonb_build_array(
 jsonb_build_object('lot_id',current_setting('test.x.lot')::uuid,'kind','accepted','qty',900000,'payable_qty',900000,'unit_price_vnd',23000,'value_vnd',20700000),
 jsonb_build_object('lot_id',current_setting('test.x.lot')::uuid,'kind','downgraded','qty',80000,'payable_qty',80000,'unit_price_vnd',15000,'value_vnd',1200000,'reason_code',(SELECT r.reason_code FROM core.product_reject_reasons r JOIN core.lots l ON l.product_id=r.product_id AND l.profile_version=r.profile_version WHERE l.id=current_setting('test.x.lot')::uuid ORDER BY r.reason_code LIMIT 1)),
 jsonb_build_object('lot_id',current_setting('test.x.lot')::uuid,'kind','rejected','qty',20000,'payable_qty',0,'unit_price_vnd',0,'value_vnd',0,'reason_code',(SELECT r.reason_code FROM core.product_reject_reasons r JOIN core.lots l ON l.product_id=r.product_id AND l.profile_version=r.profile_version WHERE l.id=current_setting('test.x.lot')::uuid ORDER BY r.reason_code LIMIT 1)))::text,true);
 IF k='C52MULTI' THEN
 PERFORM set_config('test.c47.lines',(jsonb_set(jsonb_set(current_setting('test.c47.lines')::jsonb,'{0,qty}','880000'),'{0,payable_qty}','880000') #- '{0,value_vnd}' || '[]'::jsonb)::text,true);
 PERFORM set_config('test.c47.lines',(jsonb_set(current_setting('test.c47.lines')::jsonb,'{0,value_vnd}','20240000') || jsonb_build_array((current_setting('test.c47.lines')::jsonb->1)||jsonb_build_object('qty',20000,'payable_qty',20000,'value_vnd',300000)))::text,true);
 END IF;
 PERFORM test.as_login('db_test_receiver',$q$SELECT set_config('test.c47.acceptance',cmd.submit_acceptance(current_setting('test.c47.delivery')::uuid,1000000,current_setting('test.c47.doc')::jsonb,current_setting('test.c47.lines')::jsonb)::text,true)$q$);
 PERFORM set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c47.acceptance')::uuid),true);
 PERFORM test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
 PERFORM test.as_login('db_test_receiver',$q$SELECT cmd.send_acceptance(current_setting('test.c47.acceptance')::uuid)$q$);
 PERFORM test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
 PERFORM set_config('test.c52.accepted',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c47.acceptance')::uuid AND kind='accepted'),true);
 PERFORM set_config('test.c52.rejected',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c47.acceptance')::uuid AND kind='rejected'),true);
 PERFORM test.as_login('db_test_seller',$q$SELECT cmd.agree_acceptance_line(current_setting('test.c52.accepted')::uuid); SELECT cmd.agree_acceptance_line(current_setting('test.c52.rejected')::uuid)$q$);
 PERFORM set_config('test.c52.old',current_setting('test.c47.acceptance'),true);
 PERFORM set_config('test.c52.line',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.old')::uuid AND kind='downgraded' AND qty=80000),true);
 PERFORM test.as_login('db_test_seller',$q$SELECT set_config('test.c47.dispute',cmd.open_dispute(current_setting('test.c52.line')::uuid,80000,'Đề nghị chia lại')::text,true)$q$);
 PERFORM set_config('test.c47.doc',test.command_doc(k||'-NEW-PHOTO')::text,true);
 PERFORM test.as_login('db_test_receiver',$q$SELECT set_config('test.c52.evidence',cmd.attach_evidence(current_setting('test.x.order')::uuid,current_setting('test.c47.doc')::jsonb)::text,true)$q$);
 PERFORM set_config('test.c52.doc',test.command_doc(k||'-REVISION')::text,true);
 PERFORM set_config('test.c52.lines',jsonb_build_array(
 jsonb_build_object('source_line_id',current_setting('test.c52.line')::uuid,'lot_id',current_setting('test.x.lot')::uuid,'kind','accepted','qty',40000,'payable_qty',40000,'unit_price_vnd',23000,'value_vnd',920000),
 jsonb_build_object('source_line_id',current_setting('test.c52.line')::uuid,'lot_id',current_setting('test.x.lot')::uuid,'kind','downgraded','qty',40000,'payable_qty',40000,'unit_price_vnd',15000,'value_vnd',600000,'reason_code',(SELECT reason_code FROM core.acceptance_lines WHERE id=current_setting('test.c52.line')::uuid)))::text,true);
END $$;
REVOKE ALL ON FUNCTION test.objection(text) FROM PUBLIC;
SELECT test.objection('C52REWEIGH');
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C52 buyer khác người nhận không cân lại','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 thiếu chứng cứ mới bị chặn','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,NULL)','ck_command_evidence')$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 bỏ mất phần tranh chấp bị chặn','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,jsonb_build_array(current_setting(''test.c52.lines'')::jsonb->0),current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 không tự đổi giá khi cân lại','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,jsonb_set(jsonb_set(current_setting(''test.c52.lines'')::jsonb,''{0,unit_price_vnd}'',''1''),''{0,value_vnd}'',''40''),current_setting(''test.c52.evidence'')::uuid)','ck_acceptance_price')$$);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c52.new',cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)::text,true)$$);
SELECT test.as_login('db_test_receiver',$$SELECT cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)$$);
SELECT test.check('C52 bản mới 940/40/20, giữ dòng chốt và lịch sử',EXISTS(SELECT 1 FROM core.acceptance_versions WHERE id=current_setting('test.c52.new')::uuid AND previous_id=current_setting('test.c52.old')::uuid AND version_no=2) AND (SELECT sum(qty)=940000 FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.new')::uuid AND kind='accepted') AND (SELECT count(*)=2 FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.new')::uuid AND status='closed') AND (SELECT status='awaiting_seller' FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid) AND (SELECT status='disputed' FROM core.acceptance_lines WHERE id=current_setting('test.c52.line')::uuid));
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 retry khác tài liệu xung đột','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb||''{"code":"OTHER"}'',current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','IDEMPOTENCY_CONFLICT')$$);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.c52.settlement',cmd.create_settlement(current_setting('test.x.order')::uuid,false,'C52-INTERIM')::text,true)$$);
SELECT test.check('C52 chưa seller đồng ý không tăng V_kt theo bản chia lại',(SELECT v_vnd=21900000 FROM core.settlements WHERE id=current_setting('test.c52.settlement')::uuid));
SELECT set_config('test.c47.acceptance',current_setting('test.c52.new'),true),set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c52.new')::uuid),true);
SELECT test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
SELECT test.as_login('db_test_receiver',$$SELECT cmd.send_acceptance(current_setting('test.c52.new')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C52 chưa ký seller không đóng tranh chấp','SELECT cmd.agree_acceptance(current_setting(''test.c52.new'')::uuid)','ck_command_acceptance')$$);
SELECT test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
SELECT test.as_login('db_test_seller',$$SELECT cmd.agree_acceptance(current_setting('test.c52.new')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.agree_acceptance(current_setting('test.c52.new')::uuid)$$);
SELECT test.check('C52 seller đồng ý đóng tranh chấp, V đúng, không nhân lượng',(SELECT status='resolved' FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid) AND (SELECT sum(value_vnd)=22220000 AND bool_and(status='closed') FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.new')::uuid) AND (SELECT qty=980000 FROM ledger.qty_balances WHERE order_key=current_setting('test.x.order')::uuid AND bucket='delivered') AND (SELECT count(*)=1 FROM core.source_acceptance_finalizations WHERE delivery_id=current_setting('test.c47.delivery')::uuid));
SELECT test.check('C52 không mở quyền helper nội bộ',NOT has_function_privilege('agiviet_app','cmd.agree_acceptance_before_revision(uuid)','EXECUTE') AND NOT has_function_privilege('agiviet_app','cmd.apply_dispute_result(uuid,text,jsonb,uuid,uuid)','EXECUTE'));
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT test.objection('C52INSPECT');
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c52.new',cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)::text,true)$$);
SELECT set_config('test.c47.provider',test.org('DT-KD')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c47.inspection',cmd.request_inspection(current_setting('test.c47.dispute')::uuid,current_setting('test.c47.provider')::uuid,NULL,0,NULL)::text,true)$$);
SELECT test.check('C52 chưa thống nhất chia lại vẫn đặt được kiểm định',EXISTS(SELECT 1 FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid AND status='awaiting_inspection') AND EXISTS(SELECT 1 FROM core.deliveries WHERE id=current_setting('test.c47.delivery')::uuid AND status='disputed'));
SELECT set_config('test.c47.report',test.command_doc('C52INSPECT-REPORT')::text,true),set_config('test.c47.resolutiondoc',test.command_doc('C52INSPECT-RESULT')::text,true);
SELECT test.as_login('db_test_inspector',$$SELECT cmd.record_inspection_result(current_setting('test.c47.inspection')::uuid,'C52INSPECT-EVENT','passed',current_setting('test.c47.report')::jsonb,'{}',current_setting('test.c47.resolutiondoc')::jsonb)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.close_resolved_delivery(current_setting('test.c47.delivery')::uuid)$$);
SELECT test.check('C52 kiểm định xử lý đủ cả hai phần 40kg, giữ nguyên dòng khác',(SELECT sum(qty)=980000 FROM core.acceptance_lines WHERE acceptance_id=(SELECT id FROM core.acceptance_versions WHERE delivery_id=current_setting('test.c47.delivery')::uuid ORDER BY version_no DESC LIMIT 1) AND kind='accepted') AND (SELECT status='closed' FROM core.deliveries WHERE id=current_setting('test.c47.delivery')::uuid) AND (SELECT count(*)=1 FROM core.dispute_resolutions WHERE dispute_id=current_setting('test.c47.dispute')::uuid));
SELECT test.objection('C52LATE');
INSERT INTO cmd.test_clock VALUES(true,now()+interval '24 hours');
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 đúng mốc 24h không chia lại','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c47.inspection',cmd.request_inspection(current_setting('test.c47.dispute')::uuid,current_setting('test.c47.provider')::uuid,NULL,0,NULL)::text,true)$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 đã yêu cầu kiểm định không quay lại chia lại','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
SET CONSTRAINTS ALL IMMEDIATE;

SET CONSTRAINTS ALL DEFERRED;
SELECT test.objection('C52MULTI');
SELECT set_config('test.c52.line2',(SELECT id::text FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.old')::uuid AND kind='downgraded' AND qty=20000),true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c52.dispute2',cmd.open_dispute(current_setting('test.c52.line2')::uuid,20000,'Phản đối dòng thứ hai')::text,true)$$);
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C52 nhiều tranh chấp không được bỏ sót một dòng','SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
SELECT set_config('test.c52.lines',(current_setting('test.c52.lines')::jsonb||jsonb_build_array((current_setting('test.c52.lines')::jsonb->1)||jsonb_build_object('source_line_id',current_setting('test.c52.line2')::uuid,'qty',20000,'payable_qty',20000,'value_vnd',300000)))::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c52.new',cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c52.ins1',cmd.request_inspection(current_setting('test.c47.dispute')::uuid,current_setting('test.c47.provider')::uuid,NULL,0,NULL)::text,true)$$);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c52.ins2',cmd.request_inspection(current_setting('test.c52.dispute2')::uuid,current_setting('test.c47.provider')::uuid,NULL,0,NULL)::text,true)$$);
SELECT set_config('test.c47.report',test.command_doc('C52MULTI-REPORT1')::text,true),set_config('test.c47.resolutiondoc',test.command_doc('C52MULTI-RESULT1')::text,true);
SELECT test.as_login('db_test_inspector',$$SELECT cmd.record_inspection_result(current_setting('test.c52.ins1')::uuid,'C52MULTI-EVENT1','passed',current_setting('test.c47.report')::jsonb,'{}',current_setting('test.c47.resolutiondoc')::jsonb)$$);
SELECT test.check('C52 kết luận một dòng giữ phần tranh chấp khác đang mở',(SELECT count(*)=1 FROM core.acceptance_lines WHERE acceptance_id=(SELECT id FROM core.acceptance_versions WHERE delivery_id=current_setting('test.c47.delivery')::uuid ORDER BY version_no DESC LIMIT 1) AND status='disputed') AND (SELECT status='awaiting_inspection' FROM core.disputes WHERE id=current_setting('test.c52.dispute2')::uuid));
SELECT set_config('test.c47.report',test.command_doc('C52MULTI-REPORT2')::text,true),set_config('test.c47.resolutiondoc',test.command_doc('C52MULTI-RESULT2')::text,true);
SELECT test.as_login('db_test_inspector',$$SELECT cmd.record_inspection_result(current_setting('test.c52.ins2')::uuid,'C52MULTI-EVENT2','failed',current_setting('test.c47.report')::jsonb,'{}',current_setting('test.c47.resolutiondoc')::jsonb)$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.close_resolved_delivery(current_setting('test.c47.delivery')::uuid)$$);
SELECT test.check('C52 kết luận nối sau chia lại giữ đúng ánh xạ từng phần',(SELECT sum(value_vnd)=22380000 AND bool_and(status='closed') FROM core.acceptance_lines WHERE acceptance_id=(SELECT id FROM core.acceptance_versions WHERE delivery_id=current_setting('test.c47.delivery')::uuid ORDER BY version_no DESC LIMIT 1)) AND (SELECT count(*)=2 FROM core.dispute_resolutions r JOIN core.disputes tc ON tc.id=r.dispute_id WHERE tc.order_id=current_setting('test.x.order')::uuid));
SET CONSTRAINTS ALL IMMEDIATE;
