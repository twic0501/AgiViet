SELECT set_config('app.test_time','2026-11-04 07:00+07',true);
SELECT test.make_order('LS3','TC-M01','Trần Thu Hà','spot');
UPDATE core.orders SET policy_version=22 WHERE id=test.id('LS3'); -- đơn chính sách cũ (trước bản 23): kiểm đường ký thay cũ; bản 23 chặn, xem 250
SELECT test.sign_order('LS3','TC-M01','Trần Thu Hà');
SELECT test.fund_order('LS3');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes)
VALUES(test.id('LS3:evidence'),'TEST-LS3-EV','evidence',test.org('TC-B01'),test.id('LS3'),'TEST-LS3-EV',1,digest('flood','sha256'),digest('flood','sha256'),'test/flood','image/jpeg',1);
INSERT INTO core.amendments(id,order_id,kind,proposed_by_org_id,proposed_by_user_id,payload,evidence_doc_ids,resulting_version_no,buyer_reply_deadline,created_at)
VALUES(test.id('LS3:a'),test.id('LS3'),'force_majeure_reduction',test.org('TC-B01'),ref.ctx_user(),'{"qty_min":1500000}',ARRAY[test.id('LS3:evidence')],2,'2026-11-03 07:00+07','2026-11-02 07:00+07');
SELECT test.context('Phạm Quốc Bảo','AGV','ops');
UPDATE core.amendments SET status='accepted' WHERE id=test.id('LS3:a');
INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail,created_at)
VALUES(test.id('LS3:decision'),'force_majeure_reduction','amendment',test.id('LS3:a'),test.person('Ngô Thị Vy'),test.person('Phạm Quốc Bảo'),'Lũ: giảm lượng sau im lặng 24 giờ',test.id('LS3:evidence'),'{}','2026-11-04 07:00+07');
INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,prev_document_id,prev_content_sha256,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,status)
SELECT test.id('LS3:annex'),'TEST-LS3-ANNEX','annex',owner_org_id,order_id,series_key,2,id,content_sha256,digest('annex-ls3','sha256'),digest('annex-pdf','sha256'),
 jsonb_build_object('operational_signature_notice','ký thay bằng quyết định vận hành '||test.id('LS3:decision')),'test/annex','application/pdf',1,'awaiting_signature'
FROM core.documents WHERE id=test.id('LS3:contract');
INSERT INTO core.order_versions
SELECT (jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||jsonb_build_object('version_no',2,'amendment_id',test.id('LS3:a'),'document_id',test.id('LS3:annex'),
 'qty_min',1500000,'qty_max',1500000,'contract_value_vnd',34500000,'deposit_basis_vnd',34500000,'deposit_vnd',10350000,'fee_vnd',103500))).*
FROM core.order_versions v WHERE order_id=test.id('LS3') AND version_no=1;
CREATE FUNCTION test.operational_sig(p_doc uuid DEFAULT test.id('LS3:annex')) RETURNS void LANGUAGE sql AS $$
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,cert_fingerprint,signature_value,device_id,ops_decision_id)
SELECT id,'buyer',test.person('Phạm Quốc Bảo'),test.org('AGV'),'quyet_dinh_van_hanh',content_sha256,'TEST-AGV-CERT',decode('01','hex'),'ops-device',test.id('LS3:decision') FROM core.documents WHERE id=p_doc
$$;
SELECT test.expect_error('LS3 không ký vận hành vào hợp đồng thường', $$SELECT test.operational_sig(test.id('LS3:contract'))$$,'ck_operational_signature');
SELECT test.expect_error('LS3 bên mua đã phản hồi không được ký thay', $$DO $b$ BEGIN UPDATE core.amendments SET buyer_replied_at=ref.clock_at() WHERE id=test.id('LS3:a'); PERFORM test.operational_sig(); END $b$;$$,'ck_operational_signature');
SELECT test.expect_error('LS3 chưa hết hạn 24 giờ không được ký thay', $$DO $b$ BEGIN UPDATE core.amendments SET buyer_reply_deadline=ref.clock_at()+interval '1 hour' WHERE id=test.id('LS3:a'); PERFORM test.operational_sig(); END $b$;$$,'ck_operational_signature');
SELECT test.expect_error('LS3 không áp dụng cho phụ lục đổi giá', $$DO $b$ BEGIN UPDATE core.amendments SET kind='change_price' WHERE id=test.id('LS3:a'); PERFORM test.operational_sig(); END $b$;$$,'ck_operational_signature');
SELECT test.expect_error('LS3 thiếu chứng cứ quyết định không được ký thay', $$DO $b$ BEGIN UPDATE core.amendments SET evidence_doc_ids=ARRAY[test.id('LS3:contract')] WHERE id=test.id('LS3:a'); PERFORM test.operational_sig(); END $b$;$$,'ck_operational_signature');
SELECT test.expect_error('LS3 mảng chứng cứ NULL không vượt kiểm tra', $$DO $b$ BEGIN UPDATE core.amendments SET evidence_doc_ids=ARRAY[NULL::uuid] WHERE id=test.id('LS3:a'); PERFORM test.operational_sig(); END $b$;$$,'ck_operational_signature');
SELECT test.operational_sig();
SELECT test.check('LS3 TH040b hai người, chữ ký AgiViet thay buyer có thông báo',EXISTS(SELECT 1 FROM core.signatures WHERE document_id=test.id('LS3:annex') AND method='quyet_dinh_van_hanh' AND ops_decision_id=test.id('LS3:decision')));
SELECT test.expect_error('LS3 phụ lục đã ký vận hành không thể đổi loại', $$UPDATE core.amendments SET kind='change_price' WHERE id=test.id('LS3:a')$$,'ck_append_only');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
VALUES(test.id('LS3:annex'),'seller',ref.ctx_user(),ref.ctx_org(),'otp',digest('annex-ls3','sha256'),test.otp(test.id('LS3:annex'),ref.ctx_user()),'device');
UPDATE core.orders SET effective_version_no=2 WHERE id=test.id('LS3');
SELECT test.check('LS3 phiên bản giảm lượng đã đủ hai phía và hiệu lực',(SELECT effective_version_no=2 FROM core.orders WHERE id=test.id('LS3')));
-- LS4: chọn giá ngoài rất cao, giá hợp đồng thấp hơn 70%; P_coc vẫn bằng P.
INSERT INTO mkt.external_prices(id,product_id,grade_code,unit_price_vnd,source_label,observed_on,is_test_data)
SELECT test.id('LS4:external'),id,'L1',100000,'TEST nguồn ngoài: chỉ hiển thị',current_date,true FROM core.products WHERE code='XOAI_CAT_CHU';
SELECT test.make_order('LS4','TC-M01','Trần Thu Hà','spot',jsonb_build_object('ref_price_vnd',100000,'ref_price_source','external','ref_price_external_id',test.id('LS4:external')));
SELECT test.check('LS4 giá ngoài 100000 không nâng cọc, P_coc vẫn 23000',EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=test.id('LS4') AND ref_price_source='external' AND deposit_price_vnd=23000 AND deposit_vnd=13800000));
SELECT test.expect_error('LS4 chặn lấy 70% giá ngoài để tính cọc', $$SELECT test.make_order('LS4bad','TC-M01','Trần Thu Hà','spot',jsonb_build_object('ref_price_vnd',100000,'ref_price_source','external','ref_price_external_id',test.id('LS4:external'),'deposit_price_vnd',70000,'deposit_basis_vnd',140000000,'deposit_vnd',42000000,'fee_vnd',420000))$$,'ck_ov_deposit_price');
SELECT test.expect_error('LS4 không tự nhận giá ngoài là giao dịch đủ mẫu', $$SELECT test.make_order('LS4fake','TC-M01','Trần Thu Hà','spot','{"ref_price_vnd":100000,"ref_price_source":"trades"}')$$,'ck_deposit_reference_source');
SELECT test.check('LS4 view tham khảo chỉ lấy mẫu giao dịch',position('external_prices' in pg_get_viewdef('mkt.reference_prices'::regclass))=0);
SET CONSTRAINTS ALL IMMEDIATE;
