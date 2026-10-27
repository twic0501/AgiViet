CREATE FUNCTION test.id(p text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT md5('agiviet-test:'||p)::uuid $$;
CREATE FUNCTION test.org(p text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM core.organizations WHERE code=p $$;
CREATE FUNCTION test.person(p text) RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT m.user_id FROM core.memberships m JOIN core.organizations o ON o.id=m.org_id JOIN core.users u ON u.id=m.user_id WHERE u.display_name=p LIMIT 1 $$;
CREATE FUNCTION test.context(p_user text,p_org text,p_actor text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF p_user IS NOT NULL THEN
 INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind) VALUES(session_user,test.person(p_user),test.org(p_org),p_actor)
 ON CONFLICT(login_name) DO UPDATE SET user_id=EXCLUDED.user_id,org_id=EXCLUDED.org_id,actor_kind=EXCLUDED.actor_kind;
 END IF;
 PERFORM set_config('app.user_id',coalesce(test.person(p_user)::text,''),true);
 PERFORM set_config('app.org_id',coalesce(test.org(p_org)::text,''),true);
 PERFORM set_config('app.actor_kind',p_actor,true);
 PERFORM set_config('app.reason','Kiểm tra bất biến dữ liệu thử',true);
 PERFORM set_config('app.device_id','test-device',true);
 PERFORM set_config('app.request_id','test-request',true);
 END $$;
SELECT test.check('Nạp đủ 50 người dùng', (SELECT count(*)=50 FROM core.users));
SELECT test.check('Nạp đủ 8 mặt hàng', (SELECT count(*)=8 FROM core.products));
SELECT test.check('Nạp đủ 20 lô', (SELECT count(*)=20 FROM core.lots));
SELECT test.check('Nạp đủ 8 nhu cầu, 9 dòng', (SELECT count(*)=8 FROM core.demands) AND (SELECT count(*)=9 FROM core.demand_lines));
SELECT test.check('15 đơn nền tách khỏi sổ tiền',(SELECT count(*)=15 FROM core.historical_trades));
SELECT test.check('Giá tham khảo xoài 25000 từ 14 đơn, 4 cặp',(SELECT unit_price_vnd=25000 AND order_count=14 AND pair_count=4 FROM mkt.reference_prices WHERE scope='DBSCL' AND grade_code='L1' AND product_id=(SELECT id FROM core.products WHERE code='XOAI_CAT_CHU')));
SELECT test.check('Khung Bếp Sen: còn 80000', (SELECT allowed_vnd-used_vnd=80000 FROM core.v_framework_limits WHERE id=(SELECT id FROM core.framework_contracts WHERE code='KH-2003')));
SELECT test.check('Thu mua tối đa 5 thành viên',(SELECT max_members=5 FROM ref.plans WHERE code='procurement'));
SELECT test.check('Lượng toàn bộ dùng gam',(SELECT bool_and(base_unit='g' AND price_unit_base_qty=1000) FROM core.products));
SELECT test.check('Phân bổ dư về phần lớn nhất',ref.allocate_vnd(10,ARRAY[3,2,1]::bigint[])=ARRAY[6,3,1]::bigint[]);
SELECT test.check('Phân bổ cước TH050',ref.allocate_vnd(3200000,ARRAY[1970,530]::bigint[])=ARRAY[2521600,678400]::bigint[]);
SELECT test.expect_error('Không sửa nguồn seed', $$UPDATE ops.seed_sources SET payload='{}'$$,'ck_append_only');
SELECT test.expect_error('Không sửa hồ sơ ngành hàng', $$UPDATE core.product_profiles SET qty_tolerance_bps=1$$,'ck_append_only');
SELECT test.expect_error('Không tự đi từ on_sale sang draft', $$UPDATE core.lots SET status='draft' WHERE code='L-0412'$$,'ck_status_transition');
SELECT test.expect_error('Không bỏ qua 24 giờ sửa giá', $$INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_at) SELECT id,23000,21000,price_changed_at+interval '1 hour' FROM core.lots WHERE code='L-0412'$$,'ck_lot_price_rate');
SELECT test.expect_error('Giá tối đa chỉ tăng', $$INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd) SELECT l.id,1000 FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE d.code='NC-3001'$$,'ck_demand_price_up');
SELECT test.expect_error('Chặn lượng âm', $$SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','loss','spoiled',-1,NULL,'negative')$$,'23514');
SELECT test.expect_error('Không khai nguồn lô lần hai', $$SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'source','available','declare',4000000,NULL,'duplicate-declare')$$,'ck_qty_declared_once');
SELECT test.expect_error('Chặn lấy vượt lượng có', $$SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','loss','spoiled',5000000,NULL,'overdraw')$$,'ck_qty_non_negative');
SELECT test.expect_ok('Trừ lượng hợp lệ thực chạy', $$SELECT ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','loss','spoiled',1000,NULL,'valid-move')$$);
SELECT test.expect_error('Tách lô phải đủ hai vế', $$DO $b$ BEGIN
 PERFORM ledger.move_qty((SELECT id FROM core.lots WHERE code='L-0412'),'available','moved_to_child','split_out',1000,NULL,'split-missing',(SELECT id FROM core.lots WHERE code='L-0413'));
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_qty_split');
SELECT test.expect_error('Chặn thêm dòng vào giao dịch đã COMMIT', $$INSERT INTO ledger.entries(transaction_id,line_no,account_id,amount_vnd) SELECT t.id,99,a.id,1 FROM ledger.transactions t CROSS JOIN ledger.accounts a LIMIT 1$$,'ck_ledger_sealed');
SELECT test.expect_error('Chặn giao dịch tiền rỗng ở cuối transaction', $$DO $b$ BEGIN
 INSERT INTO ledger.transactions(kind,idempotency_key,memo) VALUES('manual_adjustment','empty','Thử giao dịch rỗng'); SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_ledger_approval');
SELECT test.expect_error('Chặn giao dịch không cân', $$DO $b$ BEGIN
 PERFORM test.manual_post('manual_adjustment',NULL,'unbalanced','Không cân',jsonb_build_array(jsonb_build_object('type','external','org',test.org('TC-M01'),'amount',1),jsonb_build_object('type','external','org',test.org('TC-B01'),'amount',-2)));
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_ledger_balanced');
SELECT test.expect_error('Không sửa sổ tiền', $$UPDATE ledger.entries SET amount_vnd=100$$,'ck_append_only');
SELECT test.expect_error('Không xóa tài khoản sổ cái', $$DELETE FROM ledger.accounts$$,'ck_append_only');
SELECT test.expect_error('Không xóa tài liệu đã lưu', $$DO $b$ BEGIN
 INSERT INTO core.documents(id,code,doc_type,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes) VALUES(test.id('temp-doc'),'TEST-TEMP','evidence','TEST-TEMP',1,digest('x','sha256'),digest('x','sha256'),'test/no-file','application/pdf',1);
 DELETE FROM core.documents WHERE id=test.id('temp-doc'); END $b$;$$,'ck_append_only');
SELECT test.check('Bao tiêu nguồn: 1 kế hoạch, 3 đợt, đủ 9000kg', (SELECT count(*)=1 FROM core.imported_offtake_plans) AND (SELECT count(*)=3 AND sum(committed_qty)=9000000 FROM core.imported_offtake_batches));
SELECT test.check('Snapshot giữ đủ 13 mục nguồn kể cả chính sách và bao tiêu', (SELECT payload ?& ARRAY['meta','chinh_sach','goi','nguoi_dung','to_chuc_ban','to_chuc_mua','doi_tac','gia_tham_khao','don_nen','lo','nhu_cau','hop_dong_khung','bao_tieu'] FROM ops.seed_sources WHERE source_key='du-lieu-ao.json'));
