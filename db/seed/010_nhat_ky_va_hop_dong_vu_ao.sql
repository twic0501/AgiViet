-- Toàn bộ là dữ liệu ảo bổ sung, không phải kết quả thăm vườn/chứng từ thật.
-- Không thay seed nguồn 000; chạy lại không thay đổi bản ghi hoặc tài chính.
DO $seed$
DECLARE nam uuid; org uuid; site uuid; field_staff uuid; reviewer uuid; doc uuid; v uuid; x record; p record; n integer:=0; oid uuid; buyer uuid; buyer_user uuid; bank pii.bank_accounts%ROWTYPE; pol core.policy_versions%ROWTYPE; plan ref.plans%ROWTYPE; l core.lots%ROWTYPE; q bigint; price bigint; dep bigint; fee bigint; ctype text; contract uuid; day0 date:=date '2026-10-01';
BEGIN
 IF EXISTS(SELECT 1 FROM core.documents WHERE code='DEMO56-SURVEY') THEN RETURN; END IF;
 SELECT id INTO nam FROM core.users WHERE display_name='Nguyễn Thị Năm'; SELECT id INTO org FROM core.organizations WHERE code='TC-B01';
 SELECT * INTO l FROM core.lots WHERE code='L-0412'; site:=l.site_id;
 SELECT user_id INTO field_staff FROM ops.staff_assignments WHERE role_code='field' AND active ORDER BY user_id LIMIT 1; SELECT id INTO reviewer FROM core.users WHERE display_name='Nguyễn Hữu Tâm';
 INSERT INTO core.documents(code,doc_type,owner_org_id,entity,entity_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,is_test_data,created_by)
 VALUES('DEMO56-SURVEY','evidence',org,'organization',org,'DEMO56-SURVEY',1,digest('DEMO56-SURVEY','sha256'),digest('DEMO56-SURVEY-FILE','sha256'),'{"simulation":true,"note":"Khảo sát cơ sở ảo, không phải bằng chứng thật"}','test/demo56/no-real-survey.pdf','application/pdf',1,true,field_staff) RETURNING id INTO doc;
 -- Chỉ các tổ hợp mặt hàng/loại đã có trong seed; không tự xác minh mặt hàng khác.
 FOR x IN SELECT DISTINCT seller_org_id,site_id,product_id,profile_version,grade_code FROM core.lots WHERE site_id IS NOT NULL LOOP
 SELECT id INTO doc FROM core.documents WHERE code=CASE WHEN x.seller_org_id=org THEN 'DEMO56-SURVEY' ELSE 'DEMO56-SURVEY-'||x.seller_org_id END;
 IF doc IS NULL THEN
 INSERT INTO core.documents(code,doc_type,owner_org_id,entity,entity_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,is_test_data,created_by)
 VALUES('DEMO56-SURVEY-'||x.seller_org_id,'evidence',x.seller_org_id,'organization',x.seller_org_id,'DEMO56-SURVEY-'||x.seller_org_id,1,digest('DEMO56-SURVEY-'||x.seller_org_id,'sha256'),digest('DEMO56-FILE-'||x.seller_org_id,'sha256'),'{"simulation":true,"note":"Phạm vi ảo, không phải khảo sát thật"}','test/demo56/no-real-survey-'||x.seller_org_id||'.pdf','application/pdf',1,true,field_staff) RETURNING id INTO doc;
 END IF;
 INSERT INTO core.seller_product_verifications(org_id,site_id,product_id,profile_version,grade_code,criteria,inspection_source,evidence_document_id,valid_during,proposed_by)
 VALUES(x.seller_org_id,x.site_id,x.product_id,x.profile_version,x.grade_code,'{"scope":"Đối chiếu quy cách và nguồn gốc trong dữ liệu ảo; không phải chứng nhận ATTP/xuất khẩu","simulation":true}', 'Mô phỏng nhân viên khảo sát, duyệt độc lập; chỉ dùng trình diễn',doc,'[2026-01-01,2028-01-01)',field_staff) RETURNING id INTO v;
 INSERT INTO core.seller_product_reviews(verification_id,approved_by) VALUES(v,reviewer);
 END LOOP;
 INSERT INTO core.documents(code,doc_type,owner_org_id,entity,entity_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,is_test_data,created_by)
 VALUES('DEMO56-GARDEN-PHOTO','evidence',org,'organization',org,'DEMO56-GARDEN-PHOTO',1,digest('DEMO56-PHOTO','sha256'),digest('DEMO56-PHOTO-FILE','sha256'),'{"simulation":true,"note":"Tham chiếu ảnh ảo; không phải ảnh đã chụp thật"}','test/demo56/no-real-garden-photo.jpg','image/jpeg',1,true,nam) RETURNING id INTO doc;
 FOR x IN SELECT * FROM (VALUES
 (0,'care','Dọn cỏ quanh gốc, tỉa cành khô, kiểm đường mương sau vụ trước.',NULL::text,NULL::integer,NULL::bigint),
 (8,'fertilize','Bón phân hữu cơ đã ủ theo sổ vật tư ảo, phủ gốc giữ ẩm.',NULL,NULL,NULL),
 (18,'water','Tưới bổ sung khu cuối vườn, kiểm béc và rãnh thoát nước.',NULL,NULL,NULL),
 (35,'care','Theo dõi đọt, vệ sinh tán, đánh dấu các cây sinh trưởng yếu.',NULL,NULL,NULL),
 (48,'flower','Ghi nhận ra hoa không đồng đều giữa hai khu vườn.',NULL,NULL,NULL),
 (57,'pest_incident','Quan sát bọ trĩ trên một số chùm hoa, ghi vùng cần theo dõi.',NULL,NULL,NULL),
 (59,'spray','Ghi theo sổ vật tư mô phỏng; tên và hạn bên dưới hoàn toàn ảo, không phải hướng dẫn dùng thuốc.','Thuốc BVTV mẫu A (ẢO)',14,NULL),
 (70,'fruit_set','Kiểm đậu trái, ghi nhận rụng sinh lý nhẹ sau mưa.',NULL,NULL,NULL),
 (83,'fertilize','Bổ sung dinh dưỡng theo sổ vật tư ảo, ghi riêng khu cây yếu.',NULL,NULL,NULL),
 (95,'water','Tưới sáng sớm, kiểm đất khu cao và dọn vật cản rãnh.',NULL,NULL,NULL),
 (105,'weather_incident','Mưa lớn và gió làm rụng một số trái; chụp và đánh dấu khu ảnh hưởng.',NULL,NULL,NULL),
 (112,'care','Tỉa trái sâu/trầy, bao trái còn tốt và thu gom bao hỏng.',NULL,NULL,NULL),
 (125,'fruit_set','Khảo sát lại số trái trên cây mẫu, cập nhật dự kiến sản lượng vụ.',NULL,NULL,NULL),
 (140,'harvest','Hái thử chọn độ già, cân và tách phần trầy vỏ; 120 kg dữ liệu ảo.',NULL,NULL,120000::bigint),
 (148,'harvest','Thu chọn đợt đầu, ghi cân 350 kg; vệ sinh dụng cụ sau hái, dữ liệu ảo.',NULL,NULL,350000::bigint)
 ) a(days,activity,note,medicine,withdrawal,qty) LOOP
 n:=n+1;
 INSERT INTO core.cultivation_entries(site_id,org_id,occurred_on,activity,note,medicine_name,withdrawal_days,harvested_qty,photo_document_ids,recorded_by,source,request_key)
 VALUES(site,org,day0-150+x.days,x.activity,x.note,x.medicine,x.withdrawal,x.qty,ARRAY[doc],nam,'self_recorded','DEMO56-DIARY-'||n);
 END LOOP;
 -- Bốn xe bổ sung thuộc nhà xe gốc; không thêm người dùng/đổi 20 lô nền.
 FOR n IN 1..4 LOOP
 INSERT INTO core.vehicles(org_id,plate_no,kind,capacity_qty)
 SELECT org_id,'DEMO-66C-'||lpad(n::text,3,'0'),'normal',10000000 FROM core.vehicles WHERE plate_no='66C-123.45'
 ON CONFLICT(plate_no) DO NOTHING;
 END LOOP;
 SELECT id INTO buyer FROM core.organizations WHERE code='TC-M04';
 SELECT m.user_id INTO buyer_user FROM core.memberships m WHERE m.org_id=buyer AND m.status='active' ORDER BY m.id LIMIT 1;
 SELECT * INTO bank FROM pii.bank_accounts WHERE org_id=org AND status='active' LIMIT 1;
 SELECT * INTO pol FROM core.policy_versions ORDER BY id DESC LIMIT 1;
 SELECT * INTO plan FROM ref.plans WHERE code='free';
 PERFORM set_config('app.user_id',buyer_user::text,true); PERFORM set_config('app.org_id',buyer::text,true); PERFORM set_config('app.actor_kind','buyer',true);
 FOR n IN 1..2 LOOP
 ctype:=CASE n WHEN 1 THEN 'pre_harvest' ELSE 'offtake' END; q:=CASE n WHEN 1 THEN 1800000 ELSE 3000000 END; price:=CASE n WHEN 1 THEN 23000 ELSE 18000 END;
 dep:=CASE n WHEN 1 THEN 12420000 ELSE 3000000 END;
 fee:=least(coalesce(plan.fee_cap_vnd,9223372036854775807),greatest(coalesce(plan.fee_floor_vnd,0),ref.div_round(plan.first_order_fee_bps::numeric*q*price,10000*1000)));
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 VALUES('DEMO56-'||upper(ctype),ctype,buyer,org,'processor',l.product_id,l.id,pol.id,'free',true,buyer_user) RETURNING id INTO oid;
 INSERT INTO core.seasonal_contracts(order_id,site_id,harvest_during,materials_advance_vnd) VALUES(oid,site,'[2026-11-10,2026-12-21)',CASE n WHEN 1 THEN 0 ELSE 3000000 END);
 INSERT INTO core.documents(code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,is_test_data,created_by)
 VALUES('DEMO56-CONTRACT-'||n,'contract',buyer,oid,'DEMO56-CONTRACT-'||n,1,digest('DEMO56-CONTRACT-'||n,'sha256'),digest('DEMO56-PDF-'||n,'sha256'),jsonb_build_object('simulation',true,'note','Bản dự thảo mô phỏng chưa ký, chưa nhận cọc','contract_type',ctype),'test/demo56/no-real-contract-'||n||'.pdf','application/pdf',1,true,buyer_user) RETURNING id INTO contract;
 INSERT INTO core.order_versions(order_id,version_no,document_id,profile_version,qty_min,qty_max,qty_tolerance_bps,price_mode,unit_price_vnd,price_formula,deposit_price_vnd,contract_value_vnd,deposit_basis_vnd,deposit_rule,deposit_bps,deposit_vnd,fee_rule,fee_bps,fee_floor_vnd,fee_cap_vnd,fee_vnd,payment_timing,pay_after_days,seller_bank_account_id,seller_bank_code,seller_account_masked,seller_account_holder,delivery_mode,acceptance_point,transport_by,delivery_window,reject_allowance_bps,shortfall_penalty_bps,created_by)
 VALUES(oid,1,contract,l.profile_version,q,CASE n WHEN 1 THEN 2200000 ELSE q END,500,CASE n WHEN 1 THEN 'fixed' ELSE 'formula' END,price,CASE n WHEN 2 THEN '{"floor":18000,"share_bps":5000,"scope":"DBSCL"}'::jsonb END,price,q*price/1000,q*price/1000,CASE n WHEN 1 THEN 'percent' ELSE 'per_unit' END,CASE n WHEN 1 THEN 3000 ELSE 0 END,dep,'standard',plan.first_order_fee_bps,plan.fee_floor_vnd,plan.fee_cap_vnd,fee,'after_days',7,bank.id,bank.bank_code,bank.account_masked,bank.holder_name,'at_farm','tai_vuon','seller','[2026-11-10 07:00+07,2026-12-20 18:00+07)',500,pol.shortfall_penalty_bps,buyer_user);
 IF n=1 THEN INSERT INTO core.seasonal_batches VALUES(oid,1,q,'[2026-11-10 07:00+07,2026-11-11 18:00+07)',0);
 ELSE
 INSERT INTO core.seasonal_batches VALUES(oid,1,1000000,'[2026-11-10 07:00+07,2026-11-11 18:00+07)',1000000),(oid,2,1000000,'[2026-11-25 07:00+07,2026-11-26 18:00+07)',1000000),(oid,3,1000000,'[2026-12-19 07:00+07,2026-12-20 18:00+07)',1000000);
 END IF;
 END LOOP;
END $seed$;
