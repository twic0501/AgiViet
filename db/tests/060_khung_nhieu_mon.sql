-- Kiểm tổng nhiều món của KH-2003, không giả dựng hợp đồng khung đã ký trong seed.
CREATE FUNCTION test.calloff(p_missing boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO core.orders(id,code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,framework_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 SELECT test.id('calloff'),'TEST-CALLOFF','framework_calloff',test.org('TC-M05'),test.org('TC-B03'),'horeca',id,(SELECT id FROM core.framework_contracts WHERE code='KH-2003'),1,'kitchen',false,test.person('Võ Thanh Sen') FROM core.products WHERE code='XOAI_CAT_CHU';
 INSERT INTO core.order_versions
 SELECT (jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||jsonb_build_object(
 'order_id',test.id('calloff'),'document_id',NULL,'qty_min',50000,'qty_max',50000,'unit_price_vnd',26000,'ref_price_vnd',NULL,'deposit_price_vnd',26000,'ref_price_source','none','ref_price_grade_code',NULL,'ref_price_scope',NULL,'ref_price_order_count',NULL,'ref_price_as_of',NULL,'ref_price_external_id',NULL,
 'contract_value_vnd',1160000,'deposit_basis_vnd',1160000,'deposit_rule','none','deposit_bps',0,'deposit_vnd',0,'fee_rule','period','fee_bps',0,'fee_vnd',0,
 'seller_bank_account_id',b.id,'seller_bank_code',b.bank_code,'seller_account_masked',b.account_masked,'seller_account_holder',b.holder_name,
 'delivery_mode','at_buyer_door','acceptance_point','tai_cua_ben_mua','transport_by','seller','value_basis','lines','write_xid',pg_current_xact_id()::text))).*
 FROM core.order_versions v CROSS JOIN pii.bank_accounts b WHERE v.order_id=test.id('order') AND v.version_no=1 AND b.org_id=test.org('TC-B03') AND b.status='active';
 INSERT INTO core.order_lines(order_id,version_no,line_no,product_id,profile_version,grade_code,qty,unit_price_vnd,line_value_vnd)
 SELECT test.id('calloff'),1,1,id,1,'L1',30000,26000,780000 FROM core.products WHERE code='XOAI_CAT_CHU';
 IF NOT p_missing THEN
 INSERT INTO core.order_lines(order_id,version_no,line_no,product_id,profile_version,grade_code,qty,unit_price_vnd,line_value_vnd)
 SELECT test.id('calloff'),1,2,id,1,'L1',20000,19000,380000 FROM core.products WHERE code='THANH_LONG'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 END $$;
SELECT test.expect_ok('Khung nhiều món: 780000 + 380000 = 1160000', $$SELECT test.calloff(false)$$);
SELECT test.expect_error('Khung thiếu một món không khớp tổng hợp đồng', $$SELECT test.calloff(true)$$,'ck_order_lines_total');
SELECT test.expect_error('Không thêm dòng hàng sau khi phiên bản đã COMMIT', $$INSERT INTO core.order_lines(order_id,version_no,line_no,product_id,grade_code,qty,unit_price_vnd,line_value_vnd) SELECT test.id('order'),1,99,id,'L1',1000,23000,23000 FROM core.products WHERE code='XOAI_CAT_CHU'$$,'ck_order_lines_sealed');
