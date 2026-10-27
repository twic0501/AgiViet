DELETE FROM cmd.test_clock;
SELECT test.context(NULL,NULL,'system');
SELECT set_config('app.test_time','',true);
SELECT set_config('test.c56.site',(SELECT site_id::text FROM core.lots WHERE code='L-0412'),true);
SELECT set_config('test.c58.data',jsonb_build_object('occurred_on',current_date,'activity','care','note','Nhân viên khảo sát mô phỏng đối chiếu sổ vườn')::text,true);
SELECT test.as_login('db_test_verify',$$SELECT set_config('test.c58.staffentry',cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c58.data')::jsonb,'C58-STAFF')::text,true)$$);
SELECT test.check('C58 nguồn nhân viên được DB gắn theo vai, không do payload',EXISTS(SELECT 1 FROM core.cultivation_entries WHERE id=current_setting('test.c58.staffentry')::uuid AND source='agiviet_confirmed' AND recorded_by=test.person('Bùi Thị Thảo')));
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C58 chủ không sửa bản xác nhận thành tự ghi',
 'SELECT cmd.record_cultivation(current_setting(''test.c56.site'')::uuid,current_setting(''test.c58.data'')::jsonb||jsonb_build_object(''supersedes_id'',current_setting(''test.c58.staffentry'')::uuid,''correction_reason'',''Đổi nhãn''),''C58-DOWNGRADE'')','ck_cultivation_scope')$$);
SELECT set_config('test.c58.photo',(test.command_doc('C58-PHOTO')||'{"mime_type":"image/jpeg"}')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c58.photoid',cmd.attach_cultivation_photo(current_setting('test.c56.site')::uuid,current_setting('test.c58.photo')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.record_cultivation(current_setting('test.c56.site')::uuid,current_setting('test.c58.data')::jsonb||jsonb_build_object('photo_document_ids',jsonb_build_array(current_setting('test.c58.photoid')::uuid)),'C58-PHOTO-ENTRY')$$);
SELECT test.check('C58 ảnh nhật ký là tham chiếu tài liệu đúng tổ chức',(SELECT photo_document_ids=ARRAY[current_setting('test.c58.photoid')::uuid] FROM core.cultivation_entries WHERE request_key='C58-PHOTO-ENTRY'));
-- Gợi ý sau 24h chỉ thêm gợi ý, không tự bật urgent và không nhân khi worker retry.
SELECT set_config('test.c58.urgent',(SELECT id::text FROM core.lots WHERE code='C56-URGENT'),true);
INSERT INTO cmd.test_clock VALUES(true,now()+interval '25 hours');
SELECT test.as_login('db_test_system',$$SELECT cmd.suggest_urgent_sales()$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.suggest_urgent_sales()$$);
SELECT test.check('C58 24h không ai hỏi tạo một gợi ý riêng cho chủ',(SELECT count(*)=1 FROM core.urgent_sale_suggestions WHERE lot_id=current_setting('test.c58.urgent')::uuid));
SELECT set_config('test.c58.deadline',(SELECT id::text FROM core.deadlines WHERE entity_id=current_setting('test.c58.urgent')::uuid AND kind='urgent_sale' AND status='open'),true);
SELECT test.as_login('db_test_system',$$SELECT cmd.expire_deadline_result(current_setting('test.c58.deadline')::uuid)$$);
SELECT test.check('C58 hết hạn bán gấp tự tắt cờ',(SELECT urgent_sale_until IS NULL FROM core.lots WHERE id=current_setting('test.c58.urgent')::uuid));
DELETE FROM cmd.test_clock;
SELECT test.as_login('db_test_buyer',$$SELECT test.check('C58 bên mua không đọc gợi ý khẩn cấp của người bán',(SELECT count(*)=0 FROM core.urgent_sale_suggestions))$$);
-- Hàng dạt có tiêu chí loại trong danh mục, không lách cách ly/an toàn.
SELECT set_config('test.c58.subdata',(SELECT jsonb_build_object('product_id',product_id,'grade_codes',jsonb_build_array(grade_code),'min_qty',10000,'is_offtake_partner',true,'floor_price_vnd',8000,'standing_price_vnd',8500,'valid_during',daterange(current_date,current_date+30))::text FROM core.product_grades WHERE product_id=(SELECT product_id FROM core.lots WHERE code='L-0412') AND is_substandard LIMIT 1),true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.c58.standing',cmd.set_substandard_offer(current_setting('test.c58.subdata')::jsonb)::text,true)$$);
SELECT test.check('C58 đối tác có lời chào bao tiêu hàng dạt theo mùa',EXISTS(SELECT 1 FROM core.substandard_receivers WHERE id=current_setting('test.c58.standing')::uuid AND buyer_org_id=test.org('TC-M01') AND is_offtake_partner AND floor_price_vnd=8000));
SELECT test.as_login('db_test_buyer',$$SELECT cmd.withdraw_substandard_offer(current_setting('test.c58.standing')::uuid)$$);
SELECT test.check('C58 rút lời chào không xóa lịch sử',(SELECT isempty(valid_during) FROM core.substandard_receivers WHERE id=current_setting('test.c58.standing')::uuid));
-- Giá công thức không nhận tham khảo từ client; chốt từ view giao dịch đúng ngày.
SELECT test.seasonal_order('C58FORM','pre_harvest',true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C58 view giá cũ không thay cho giá ngày chốt',
 'SELECT cmd.propose_harvest_fix(current_setting(''test.s.order'')::uuid,1100000)','ck_seasonal_reference')$$);
-- Nạp mẫu giao dịch ảo tại hôm nay, nhiều cặp thật trong fixture; refresh qua quyền owner thử.
INSERT INTO core.historical_trades(id,code,buyer_org_id,seller_org_id,product_id,grade_code,province_code,qty,unit_price_vnd,accepted_at,is_test_data,source_key)
SELECT test.id('C58-PRICE-'||n),'C58-PRICE-'||n,test.org(CASE WHEN n%2=0 THEN 'TC-M01' ELSE 'TC-M04' END),test.org('TC-B01'),l.product_id,'L1','DT',1000000,25000,now()-interval '1 minute',true,'du-lieu-ao.json'
FROM generate_series(1,4) n CROSS JOIN core.lots l WHERE l.code='L-0412';
REFRESH MATERIALIZED VIEW mkt.reference_prices;
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c58.fix',cmd.propose_harvest_fix(current_setting('test.s.order')::uuid,1100000)::text,true)$$);
SELECT test.check('C58 giá chốt công thức lưu nguồn tham khảo và nằm sàn/trần',EXISTS(SELECT 1 FROM core.amendments WHERE id=current_setting('test.c58.fix')::uuid AND (payload->>'unit_price_vnd')::bigint BETWEEN 23000 AND 28000 AND payload->>'reference_as_of' IS NOT NULL));
-- Mất mùa chỉ giảm cam kết bằng phụ lục, không biến cập nhật dự báo thành lượng ký.
SELECT test.seasonal_order('C58LOSS','offtake');
SELECT set_config('test.c58.evidence',test.command_doc('C58-STORM')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c58.evidenceid',cmd.attach_evidence(current_setting('test.s.order')::uuid,current_setting('test.c58.evidence')::jsonb)::text,true)$$);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('C58 giảm mất mùa không chứng cứ bị chặn',
 'SELECT cmd.propose_amendment(current_setting(''test.s.order'')::uuid,''force_majeure_reduction'',''{"qty_g":1800000,"reason":"Mưa gió"}'')','ck_command_evidence')$$);
SELECT test.as_login('db_test_seller',$$SELECT set_config('test.c58.loss',cmd.propose_amendment(current_setting('test.s.order')::uuid,'force_majeure_reduction','{"qty_g":1800000,"reason":"Mưa gió có ảnh ảo"}',ARRAY[current_setting('test.c58.evidenceid')::uuid])::text,true)$$);
SELECT test.check('C58 đề nghị giảm lượng chưa tự đổi cam kết',(SELECT planned_qty=1000000 FROM core.deliveries WHERE order_id=current_setting('test.s.order')::uuid AND batch_no=2));
SELECT set_config('test.s.doc',test.command_doc('C58LOSS-ANNEX')::text,true);
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.s.annexdoc',cmd.answer_amendment(current_setting('test.c58.loss')::uuid,'accept',current_setting('test.s.doc')::jsonb)::text,true)$$);
SELECT set_config('test.s.otp',test.otp(current_setting('test.s.annexdoc')::uuid,test.person('Trần Thu Hà')),true);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.sign_document(current_setting('test.s.annexdoc')::uuid,'buyer',current_setting('test.s.otp'),'TEST')$$);
SELECT set_config('test.s.otp',test.otp(current_setting('test.s.annexdoc')::uuid,test.person('Nguyễn Thị Năm')),true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.sign_document(current_setting('test.s.annexdoc')::uuid,'seller',current_setting('test.s.otp'),'TEST')$$);
SELECT test.as_login('db_test_system',$$SELECT cmd.apply_signed_amendment(current_setting('test.c58.loss')::uuid)$$);
SELECT test.check('C58 mất mùa: hai chữ ký rồi mới giảm đợt chưa giao, hoàn cọc chênh không phạt',
 (SELECT planned_qty=800000 FROM core.deliveries WHERE order_id=current_setting('test.s.order')::uuid AND batch_no=2)
 AND (SELECT committed_qty=1000000 FROM core.seasonal_batches WHERE order_id=current_setting('test.s.order')::uuid AND batch_no=2)
 AND EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=current_setting('test.s.order')::uuid AND kind='refund_deposit_to_buyer' AND amount_vnd=200000)
 AND NOT EXISTS(SELECT 1 FROM core.contract_charges WHERE order_id=current_setting('test.s.order')::uuid AND kind='shortfall_penalty'));
SET CONSTRAINTS ALL IMMEDIATE;
