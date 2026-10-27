-- Bản 23 (khóa 28/10/2026) + lựa chọn E1/E2 của người sáng lập: chứng minh luật mới chặn thật.
-- (E1 trả đủ phần công nhận: kiểm ở 130/135. B1 còn hàng trả lại thì chưa hoàn tất: kiểm ở 080.)

-- B3: V1 không tạo mới người giúp.
SELECT test.check('B23 công tắc người giúp mặc định tắt',NOT ref.flag('nguoi_giup'));
SELECT test.expect_error('B23 không tạo ủy quyền người giúp khi công tắc tắt',
 $$INSERT INTO core.delegations(org_id,principal_user_id,helper_user_id,actions,valid_during,created_by)
   VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),ARRAY['x'],tstzrange(now(),now()+interval '1 day'),gen_random_uuid())$$,'ck_command_payload');

-- B2/B4: V1 không đăng ký mới thương lái, tổ hợp gom; HTX sản xuất vẫn được.
SELECT test.expect_error('B23 không tạo mới thương lái',
 $$INSERT INTO core.organizations(code,kind,display_name,can_buy,can_sell) VALUES('TEST-TL','trader','Thương lái thử',true,false)$$,'ck_command_payload');
SELECT test.expect_error('B23 không tạo mới tổ hợp gom',
 $$INSERT INTO core.organizations(code,kind,display_name,can_buy,can_sell) VALUES('TEST-TH','coop_group','Tổ hợp gom thử',false,true)$$,'ck_command_payload');
SELECT test.expect_ok('B23 HTX sản xuất vẫn đăng ký được',
 $$INSERT INTO core.organizations(code,kind,display_name,can_buy,can_sell,province_code) VALUES('TEST-HTX-SX','cooperative','HTX sản xuất thử',false,true,(SELECT code FROM ref.provinces LIMIT 1))$$);
SELECT test.check('B23 dữ liệu ảo cũ vẫn còn (không xóa lịch sử)',EXISTS(SELECT 1 FROM core.organizations WHERE kind='trader'));

-- E2: một người không thể có hai tài khoản cùng CCCD để tự duyệt cho mình; người duyệt khác người lập.
INSERT INTO core.users(id,display_name) VALUES(test.id('E2:a'),'Người lập thử'),(test.id('E2:b'),'Tài khoản thứ hai thử');
INSERT INTO pii.identity_documents(user_id,doc_type,number_enc,number_hash,number_masked,key_id)
 VALUES(test.id('E2:a'),'cccd','\x01',sha256('E2-CCCD-1'::bytea),'0790****0001','TEST');
SELECT test.expect_error('E2 cùng số CCCD không gắn được tài khoản thứ hai',
 $$INSERT INTO pii.identity_documents(user_id,doc_type,number_enc,number_hash,number_masked,key_id)
   VALUES(test.id('E2:b'),'cccd','\x01',sha256('E2-CCCD-1'::bytea),'0790****0001','TEST')$$,'uq_iddoc');
SELECT test.expect_error('E2 người duyệt trùng người lập bị chặn',
 $$INSERT INTO ops.decisions(kind,entity,entity_id,proposed_by,approved_by,reason) VALUES('manual_payment','order',gen_random_uuid(),test.id('E2:a'),test.id('E2:a'),'thử')$$,'KHONG_CO_QUYEN');
SELECT test.expect_error('E2 quyết định đã duyệt không sửa được số tiền',
 $$UPDATE ops.decisions SET detail='{"amount_vnd":1}' WHERE true$$,'append-only');

-- B5: khảo sát vườn chưa có người bán đồng ý thì không mở liên lạc.
SELECT test.expect_error('B23 liên lạc khảo sát chưa mở khi không có chuyến hợp lệ',
 $$SELECT pii.read_survey_contact(gen_random_uuid(),gen_random_uuid())$$,'CONTACT_LOCKED');
SELECT test.check('B23 mở liên lạc không còn ngưỡng 3 triệu',
 position('3000000' IN pg_get_functiondef('core.refresh_contact_grant'::regproc))=0);
