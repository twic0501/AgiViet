UPDATE ref.feature_flags SET enabled=true WHERE code='nguoi_giup'; -- kiểm mã người giúp cũ; V1 tắt (bản 23)
DELETE FROM cmd.test_clock;
SELECT test.context(NULL,NULL,'system');
SELECT set_config('app.test_time','',true);
SELECT set_config('test.c56.site',(SELECT site_id::text FROM core.lots WHERE code='L-0412'),true),
 set_config('test.c56.product',(SELECT product_id::text FROM core.lots WHERE code='L-0412'),true);
SELECT test.check('C56 seed chị Năm đúng số, 15 nhật ký, mặt hàng có hai người duyệt',
 EXISTS(SELECT 1 FROM pii.user_contacts WHERE user_id=test.person('Nguyễn Thị Năm') AND phone_hash=digest('0918000421','sha256'))
 AND (SELECT count(*)=15 FROM core.cultivation_entries WHERE request_key LIKE 'DEMO56-DIARY-%')
 AND EXISTS(SELECT 1 FROM core.seller_product_verifications v JOIN core.seller_product_reviews r ON r.verification_id=v.id WHERE v.site_id=current_setting('test.c56.site')::uuid AND v.proposed_by<>r.approved_by));
SELECT test.check('C56 bốn xe ảo và hai dự thảo vụ chưa tạo tiền/chữ ký giả',
 (SELECT count(*)=4 FROM core.vehicles WHERE plate_no LIKE 'DEMO-66C-%')
 AND (SELECT count(*)=2 FROM core.orders WHERE code LIKE 'DEMO56-%' AND status='drafting' AND effective_version_no IS NULL)
 AND NOT EXISTS(SELECT 1 FROM core.deposits d JOIN core.orders o ON o.id=d.order_id WHERE o.code LIKE 'DEMO56-%'));
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('C56 bên mua không ghi nhật ký vườn bán',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,''{}'',''C56-BUYER'')','KHONG_CO_QUYEN')$$);
SELECT set_config('test.c56.data',jsonb_build_object('occurred_on',(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'activity','water','note','Tưới khu A, kiểm rãnh sau mưa')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.entry',cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c56.data')::jsonb,'C56-WATER')::text,true)$$);
SELECT test.check('C56 retry nhật ký trả đúng ID',test.as_login('db_test_seller',$$SELECT cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c56.data')::jsonb,'C56-WATER')$$)=current_setting('test.c56.entry'));
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 khóa retry khác nội dung bị chặn',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,current_setting(''test.c56.data'')::jsonb||''{"note":"khác"}'',''C56-WATER'')','IDEMPOTENCY_CONFLICT')$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 không tự gắn nhãn nhân viên',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,current_setting(''test.c56.data'')::jsonb||''{"source":"agiviet_confirmed"}'',''C56-FORGE'')','ck_command_payload')$$);
SELECT test.expect_error('C56 nhật ký không sửa tại chỗ',$$UPDATE core.cultivation_entries SET note='x' WHERE id=current_setting('test.c56.entry')::uuid$$,'ck_append_only');
SELECT test.expect_error('C56 nhật ký không xóa',$$DELETE FROM core.cultivation_entries WHERE id=current_setting('test.c56.entry')::uuid$$,'ck_append_only');
SELECT test.as_login('db_test_seller',$$SELECT cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c56.data')::jsonb||jsonb_build_object('supersedes_id',current_setting('test.c56.entry')::uuid,'correction_reason','Nhầm khu','note','Tưới khu B'),'C56-CORRECT')$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 không rẽ nhánh bản sửa',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,current_setting(''test.c56.data'')::jsonb||jsonb_build_object(''supersedes_id'',current_setting(''test.c56.entry'')::uuid,''correction_reason'',''lặp''),''C56-BRANCH'')','ck_cultivation_scope')$$);
-- Helper thật không có membership; chủ chỉ cấp diary.write, không cấp quyền đăng lô.
SELECT set_config('test.c56.helper',test.id('C48HELPER')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.delegation',cmd.delegate_helper(current_setting('test.c56.helper')::uuid,ARRAY['diary.write'],tstzrange(now(),now()+interval '1 day'))::text,true)$$);
SELECT test.as_login('db_test_helper',$$SELECT cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c56.data')::jsonb,'C56-HELPER')$$);
SELECT test.check('C56 người giúp giữ user thật, nguồn tự ghi',EXISTS(SELECT 1 FROM core.cultivation_entries WHERE request_key='C56-HELPER' AND recorded_by=test.id('C48HELPER') AND source='self_recorded'));
SELECT test.as_login('db_test_helper',$$SELECT test.check('C56 helper đọc được nhật ký trong ủy quyền',(SELECT count(*)>0 FROM core.cultivation_entries))$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.revoke_delegation(current_setting('test.c56.delegation')::uuid)$$);
SELECT test.as_login('db_test_helper',$$SELECT test.expect_error('C56 helper thu hồi không ghi tiếp',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,current_setting(''test.c56.data'')::jsonb,''C56-REVOKED'')','KHONG_CO_QUYEN')$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.check('C56 RLS bên mua không đọc nhật ký/xác minh tổ chức bán',
 (SELECT count(*)=0 FROM core.cultivation_entries) AND (SELECT count(*)=0 FROM core.seller_product_verifications))$$);
-- Cơ sở mới không kế thừa dấu xác minh của vườn cũ.
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.newsite',cmd.create_production_site('{"kind":"orchard","name":"Vườn thử command 56"}')::text,true)$$);
SELECT set_config('test.c56.lotdata',jsonb_build_object('code','C56-UNVERIFIED','site_id',current_setting('test.c56.newsite')::uuid,'product_id',current_setting('test.c56.product')::uuid,'profile_version',1,'grade_code','L1','qty_basis','weighed','declared_qty',1000000)::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.lot',cmd.create_lot(current_setting('test.c56.lotdata')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 cơ sở mới chưa duyệt không đăng lô',
 'SELECT cmd.publish_lot(current_setting(''test.c56.lot'')::uuid,23000,20000)','ck_lot_verified_product')$$);
SELECT set_config('test.c56.evidence',(SELECT id::text FROM core.documents WHERE code='DEMO56-SURVEY'),true);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c56.verification',cmd.propose_seller_product(current_setting('test.c56.newsite')::uuid,current_setting('test.c56.product')::uuid,1,'L1','{"criterion":"Đối chiếu mẫu mô phỏng"}','Khảo sát ảo',daterange(current_date-1,current_date+30),current_setting('test.c56.evidence')::uuid)::text,true)$$);
SELECT test.as_login('db_test_verify',$$SELECT test.expect_error('C56 người lập không tự duyệt',
 'SELECT cmd.approve_seller_product(current_setting(''test.c56.verification'')::uuid)','ck_product_two_person')$$);
SELECT test.as_login('db_test_approve',$$SELECT cmd.approve_seller_product(current_setting('test.c56.verification')::uuid)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.publish_lot(current_setting('test.c56.lot')::uuid,23000,20000)$$);
SELECT test.check('C56 duyệt hai người mới đăng thành công',EXISTS(SELECT 1 FROM core.lots WHERE id=current_setting('test.c56.lot')::uuid AND status='on_sale'));
-- Phun thuốc không cho tự khai spray_clear_on sớm hơn nhật ký.
SELECT set_config('test.c56.lotdata',(current_setting('test.c56.lotdata')::jsonb||'{"code":"C56-WITHDRAWAL","spray_clear_on":"2020-01-01"}')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.spraylot',cmd.create_lot(current_setting('test.c56.lotdata')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.sprayentry',cmd.record_cultivation(current_setting('test.c56.newsite')::uuid,jsonb_build_object('occurred_on',current_date,'activity','spray','note','Dữ liệu thuốc ảo','medicine_name','Mẫu ảo','withdrawal_days',7),'C56-SPRAY')::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 nhật ký chặn đăng dù client khai hết cách ly',
 'SELECT cmd.publish_lot(current_setting(''test.c56.spraylot'')::uuid,23000,20000)','ck_lot_withdrawal')$$);
INSERT INTO cmd.test_clock VALUES(true,now()+interval '7 days');
SELECT test.as_login('db_test_seller',$$SELECT cmd.publish_lot(current_setting('test.c56.spraylot')::uuid,23000,20000)$$);
SELECT test.check('C56 hết cách ly đăng được, mốc lấy từ nhật ký',EXISTS(SELECT 1 FROM core.lots WHERE id=current_setting('test.c56.spraylot')::uuid AND spray_clear_on=current_date+7));
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_approve',$$SELECT cmd.revoke_seller_product(current_setting('test.c56.verification')::uuid,'Hết phạm vi mô phỏng')$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C56 thu hồi chặn đăng/xác nhận lại',
 'SELECT cmd.update_lot(current_setting(''test.c56.lot'')::uuid,''confirm'')','ck_lot_verified_product')$$);
SELECT set_config('test.c56.lotdata',(current_setting('test.c56.lotdata')::jsonb||jsonb_build_object('code','C56-URGENT','site_id',current_setting('test.c56.site')::uuid))::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c56.urgent',cmd.create_lot(current_setting('test.c56.lotdata')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.publish_lot(current_setting('test.c56.urgent')::uuid,23000,20000)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.set_urgent_sale(current_setting('test.c56.urgent')::uuid,now()+interval '4 hours','Cần giải phóng hàng tươi')$$);
SELECT test.check('C56 bán gấp có từ/đến/lý do và hạn worker',EXISTS(SELECT 1 FROM core.lots WHERE code='C56-URGENT' AND urgent_sale_from IS NOT NULL AND urgent_sale_until>urgent_sale_from AND urgent_sale_reason IS NOT NULL));
SELECT test.check('C56 app không có DML nhật ký/xác minh, helper nội bộ không public',NOT has_table_privilege('db_test_seller','core.cultivation_entries','INSERT') AND NOT has_function_privilege('db_test_seller','cmd.assert_lot_verified(uuid)','EXECUTE'));
SET CONSTRAINTS ALL IMMEDIATE;
UPDATE ref.feature_flags SET enabled=false WHERE code='nguoi_giup';
