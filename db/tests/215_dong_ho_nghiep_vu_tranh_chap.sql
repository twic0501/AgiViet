-- Hồi quy 0053: clock cách giờ thật >24h, không sửa timestamp hàng để vượt hạn.
DELETE FROM cmd.test_clock;
SELECT set_config('app.test_time','',true);
SELECT test.as_login('db_test_system',$$SELECT test.check('C53 production clock rỗng lấy giờ thật',ref.clock_at()=now())$$);
INSERT INTO cmd.test_clock VALUES(true,now()+interval '3 days');
SELECT test.objection('C53CLOCK');
SELECT set_config('test.c53.opened',ref.clock_at()::text,true);
SELECT test.check('C53 mở phản đối và chứng cứ cùng clock tương lai',
 (SELECT created_at=ref.clock_at() FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid)
 AND (SELECT created_at=ref.clock_at() FROM core.documents WHERE id=current_setting('test.c52.evidence')::uuid)
 AND (SELECT recorded_at=ref.clock_at() FROM core.acceptance_versions WHERE id=current_setting('test.c52.old')::uuid)
 AND (SELECT bool_and(created_at=ref.clock_at()) FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.old')::uuid));
SELECT test.check('C53 lời chào và giữ lượng có gốc/hạn cùng clock',
 EXISTS(SELECT 1 FROM core.offers f JOIN core.offer_rounds r ON r.offer_id=f.id JOIN core.holds h ON h.offer_id=f.id
 WHERE f.id=current_setting('test.x.offer')::uuid AND f.created_at=ref.clock_at() AND r.created_at=ref.clock_at()
 AND r.expires_at=r.created_at+interval '24 hours' AND h.created_at=ref.clock_at() AND h.expires_at>h.created_at));
SELECT test.check('C53 audit trạng thái và chữ ký vẫn theo giờ thật',
 (SELECT status_changed_at=now() FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid)
 AND EXISTS(SELECT 1 FROM evt.state_history WHERE entity='dispute' AND entity_id=current_setting('test.c47.dispute')::uuid AND at=now())
 AND (SELECT bool_and(s.signed_at=now()) FROM core.signatures s JOIN core.acceptance_versions a ON a.document_id=s.document_id WHERE a.id=current_setting('test.c52.old')::uuid));
-- Chứng cứ cũ đúng đơn/vai vẫn phải bị từ chối theo mốc nghiệp vụ.
UPDATE cmd.test_clock SET at=at-interval '1 microsecond';
SELECT set_config('test.c47.doc',test.command_doc('C53-OLD-EVIDENCE')::text,true);
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c53.early',cmd.attach_evidence(current_setting('test.x.order')::uuid,current_setting('test.c47.doc')::jsonb)::text,true)$$);
UPDATE cmd.test_clock SET at=current_setting('test.c53.opened')::timestamptz;
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C53 chặn chứng cứ tạo trước phản đối theo clock',
 'SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c53.early'')::uuid)','ck_command_evidence')$$);
UPDATE cmd.test_clock SET at=at+interval '24 hours';
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C53 đúng 24h của clock thử bị chặn',
 'SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
UPDATE cmd.test_clock SET at=at+interval '1 microsecond';
SELECT test.as_login('db_test_receiver',$$SELECT test.expect_error('C53 quá 24h của clock thử bị chặn',
 'SELECT cmd.revise_acceptance_after_objection(current_setting(''test.c52.old'')::uuid,current_setting(''test.c52.doc'')::jsonb,current_setting(''test.c52.lines'')::jsonb,current_setting(''test.c52.evidence'')::uuid)','ck_dispute_scope')$$);
SELECT test.check('C53 từ chối quá hạn không ghi bản chia lại',
 NOT EXISTS(SELECT 1 FROM core.acceptance_revisions WHERE previous_id=current_setting('test.c52.old')::uuid)
 AND (SELECT status='open' FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid));
UPDATE cmd.test_clock SET at=current_setting('test.c53.opened')::timestamptz+interval '24 hours'-interval '1 microsecond';
SELECT test.as_login('db_test_receiver',$$SELECT set_config('test.c52.new',cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)::text,true)$$);
SELECT test.check('C53 trước 24h một microsecond chia lại thành công và đóng dấu clock',
 (SELECT created_at=ref.clock_at() FROM core.acceptance_revisions WHERE acceptance_id=current_setting('test.c52.new')::uuid)
 AND (SELECT recorded_at=ref.clock_at() FROM core.acceptance_versions WHERE id=current_setting('test.c52.new')::uuid)
 AND (SELECT bool_and(created_at=ref.clock_at()) FROM core.acceptance_lines WHERE acceptance_id=current_setting('test.c52.new')::uuid));
UPDATE cmd.test_clock SET at=at+interval '1 hour';
SELECT test.as_login('db_test_receiver',$$SELECT test.check('C53 retry sau hạn vẫn trả cùng bản không nhân ghi',
 cmd.revise_acceptance_after_objection(current_setting('test.c52.old')::uuid,current_setting('test.c52.doc')::jsonb,current_setting('test.c52.lines')::jsonb,current_setting('test.c52.evidence')::uuid)=current_setting('test.c52.new')::uuid)$$);
SELECT set_config('test.c47.docid',(SELECT document_id::text FROM core.acceptance_versions WHERE id=current_setting('test.c52.new')::uuid),true);
SELECT test.sign_command_record('db_test_receiver',test.person('Võ Hoàng Phúc'),'buyer');
SELECT test.as_login('db_test_receiver',$$SELECT cmd.send_acceptance(current_setting('test.c52.new')::uuid)$$);
SELECT test.sign_command_record('db_test_seller',test.person('Nguyễn Thị Năm'),'seller');
SELECT test.as_login('db_test_seller',$$SELECT cmd.agree_acceptance(current_setting('test.c52.new')::uuid)$$);
SELECT test.check('C53 hai bên ký bản chia lại đóng tranh chấp khi clock tua',
 (SELECT status='resolved' FROM core.disputes WHERE id=current_setting('test.c47.dispute')::uuid));
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

UPDATE cmd.test_clock SET at=now()+interval '3 days';
SELECT test.objection('C53INSPECTION');
SELECT set_config('test.c47.provider',test.org('DT-KD')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c47.inspection',cmd.request_inspection(current_setting('test.c47.dispute')::uuid,current_setting('test.c47.provider')::uuid,NULL,0,NULL)::text,true)$$);
SELECT test.check('C53 kiểm định tạo/hạn 48h cùng clock',
 (SELECT created_at=ref.clock_at() AND due_at=created_at+interval '48 hours' FROM core.inspections WHERE id=current_setting('test.c47.inspection')::uuid)
 AND EXISTS(SELECT 1 FROM core.deadlines WHERE entity_id=current_setting('test.c47.dispute')::uuid AND kind='inspection_result' AND created_at=ref.clock_at() AND due_at=created_at+interval '48 hours'));
UPDATE cmd.test_clock SET at=at+interval '1 hour';
SELECT set_config('test.c47.report',test.command_doc('C53-REPORT')::text,true);
SELECT test.as_login('db_test_inspector',$$SELECT cmd.record_inspection_result(current_setting('test.c47.inspection')::uuid,'C53-INCONCLUSIVE','inconclusive',current_setting('test.c47.report')::jsonb,'{}',NULL)$$);
SELECT test.check('C53 kết quả và hạn thương lượng 14 ngày cùng clock',
 (SELECT issued_at=ref.clock_at() FROM core.inspection_results WHERE inspection_id=current_setting('test.c47.inspection')::uuid)
 AND EXISTS(SELECT 1 FROM core.deadlines WHERE entity_id=current_setting('test.c47.dispute')::uuid AND kind='dispute_agreement' AND created_at=ref.clock_at() AND due_at=created_at+interval '14 days'));

-- Tua lùi: QR hạn tương lai nghiệp vụ nhưng quá khứ so với giờ thật phải tạo được.
UPDATE cmd.test_clock SET at=now()-interval '3 days';
INSERT INTO core.qr_tokens(token_hash,kind,lot_id,expires_at)
 VALUES(digest('C53-PAST-QR','sha256'),'lot',current_setting('test.x.lot')::uuid,ref.clock_at()+interval '1 hour');
SELECT test.check('C53 QR tua lùi vẫn thỏa expires_at lớn hơn created_at',
 EXISTS(SELECT 1 FROM core.qr_tokens WHERE token_hash=digest('C53-PAST-QR','sha256') AND created_at=ref.clock_at() AND expires_at=created_at+interval '1 hour'));
-- C49ORG đã đổi free -> procurement ở clock +25h; tại giờ thật vẫn là gói free.
-- Guard cap phải đọc đúng gói tại clock, không âm thầm rơi về cap free = 1.
UPDATE cmd.test_clock SET at=now()+interval '3 days';
SELECT set_config('test.c53.org',(SELECT id::text FROM core.organizations WHERE code='C49ORG'),true);
INSERT INTO core.memberships(org_id,user_id,status)
 VALUES(current_setting('test.c53.org')::uuid,test.person('Trần Văn Sáu'),'invited');
SELECT test.check('C53 cap thành viên nhận gói đã kích hoạt theo clock',
 EXISTS(SELECT 1 FROM core.memberships WHERE org_id=current_setting('test.c53.org')::uuid AND user_id=test.person('Trần Văn Sáu') AND status='invited'));
UPDATE cmd.test_clock SET at=now()+interval '24 hours';
SELECT test.expect_error('C53 trước giờ nâng gói vẫn giữ cap miễn phí',
 $$INSERT INTO core.memberships(org_id,user_id,status) VALUES(current_setting('test.c53.org')::uuid,test.person('Võ Hoàng Phúc'),'invited')$$,'GOI_HET_THANH_VIEN');
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_system',$$SELECT test.check('C53 xóa clock thử trở về giờ thật',ref.clock_at()=now())$$);
SET CONSTRAINTS ALL IMMEDIATE;
