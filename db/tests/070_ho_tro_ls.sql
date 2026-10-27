-- Fixture đi qua INSERT/UPDATE, ký và callback thật của schema, không tắt trigger/constraint.
CREATE FUNCTION test.make_order(k text,buyer_code text,buyer_name text,ctype text,terms jsonb DEFAULT '{}',product text DEFAULT 'XOAI_CAT_CHU') RETURNS void LANGUAGE plpgsql AS $$
DECLARE lot uuid:=test.id(k||':lot'); oid uuid:=test.id(k); doc uuid:=test.id(k||':contract'); qty bigint:=coalesce((terms->>'qty_min')::bigint,2000000);
BEGIN
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 INSERT INTO core.lots(id,code,seller_org_id,product_id,profile_version,grade_code,site_id,qty_basis,declared_qty)
 SELECT lot,'TEST-'||k||'-LOT',test.org('TC-B01'),p.id,1,'L1',l.site_id,'weighed',qty FROM core.products p CROSS JOIN core.lots l WHERE p.code=product AND l.code='L-0412';
 UPDATE core.lots SET status='on_sale' WHERE id=lot;
 PERFORM test.context(buyer_name,buyer_code,'buyer');
 INSERT INTO core.orders(id,code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 SELECT oid,'TEST-'||k,ctype,test.org(buyer_code),test.org('TC-B01'),'processor',p.id,lot,1,'procurement',false,test.person(buyer_name) FROM core.products p WHERE code=product;
 INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,status)
 VALUES(doc,'TEST-'||k||'-HD','contract',test.org(buyer_code),oid,'TEST-'||k||'-HD',1,digest(k,'sha256'),digest(k||'-pdf','sha256'),jsonb_build_object('test',k),'test/no-real-pdf','application/pdf',1,'awaiting_signature');
 INSERT INTO core.order_versions
 SELECT (jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||jsonb_build_object(
  'order_id',oid,'version_no',1,'document_id',doc,'qty_min',qty,'qty_max',qty,
  'ref_price_vnd',NULL,'ref_price_source','none','ref_price_grade_code',NULL,'ref_price_scope',NULL,'ref_price_order_count',NULL,'ref_price_as_of',NULL,'ref_price_external_id',NULL,
  'payment_timing','after_days','pay_after_days',7,'transport_by','seller','created_at',ref.clock_at(),'write_xid',pg_current_xact_id()::text)||terms)).*
 FROM core.order_versions v WHERE v.order_id=test.id('order') AND v.version_no=1;
END $$;
CREATE FUNCTION test.sign_order(k text,buyer_code text,buyer_name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM test.context(buyer_name,buyer_code,'buyer');
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
 SELECT id,'buyer',test.person(buyer_name),test.org(buyer_code),'otp',content_sha256,test.otp(id,ref.ctx_user()),'test-device' FROM core.documents WHERE id=test.id(k||':contract');
 UPDATE core.orders SET status='awaiting_seller' WHERE id=test.id(k);
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
 SELECT id,'seller',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'otp',content_sha256,test.otp(id,ref.ctx_user()),'test-device' FROM core.documents WHERE id=test.id(k||':contract');
 UPDATE core.orders SET effective_version_no=1,status='awaiting_deposit' WHERE id=test.id(k);
 PERFORM test.context(NULL,NULL,'system');
 UPDATE core.documents SET status='fully_signed' WHERE id=test.id(k||':contract');
 INSERT INTO core.deposits(id,order_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no)
 SELECT test.id(k||':deposit'),o.id,o.buyer_org_id,v.deposit_vnd,v.fee_vnd,'AGV TEST-'||k||' COC','TEST-'||k||'-VA' FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=1 WHERE o.id=test.id(k);
END $$;
CREATE FUNCTION test.fund_order(k text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE d core.deposits%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deposits WHERE id=test.id(k||':deposit');
 PERFORM test.context(NULL,NULL,'bank');
 PERFORM test.apply_bank_event(test.bank_receipt(k||':receipt',d.expected_deposit_vnd+d.expected_fee_vnd,d.payment_ref));
 PERFORM test.context(NULL,NULL,'system');
 UPDATE core.orders SET status='active' WHERE id=test.id(k);
 PERFORM ledger.move_qty(lot_id,'available','committed','commit_direct',v.qty_min,o.id,k||':commit') FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=1 WHERE o.id=test.id(k);
END $$;
-- Giao đủ quy trình ready -> QR -> nghiệm thu -> người bán chốt; các dòng do caller thêm cùng transaction.
CREATE FUNCTION test.start_delivery(k text,batch integer,qty bigint,buyer_code text,receiver text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE did uuid:=test.id(k||':batch:'||batch); token text; v core.order_versions%ROWTYPE;
BEGIN
 SELECT * INTO v FROM core.order_versions WHERE order_id=test.id(k) AND version_no=1;
 PERFORM test.context(NULL,NULL,'system');
 INSERT INTO core.deliveries(id,code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
 VALUES(did,'TEST-'||k||'-DOT-'||batch,test.id(k),1,batch,qty,v.delivery_window,test.person(receiver));
 token:=core.issue_qr('receipt',did,upper(v.delivery_window)+interval '1 hour',test.person(receiver));
 UPDATE core.deliveries SET status='ready' WHERE id=did;
 PERFORM test.context(receiver,buyer_code,'buyer');
 PERFORM core.scan_qr(token,'test-device');
 IF v.acceptance_point='tai_kho_ben_mua' THEN
  PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller'); UPDATE core.deliveries SET status='in_transit' WHERE id=did;
  PERFORM test.context(receiver,buyer_code,'buyer'); UPDATE core.deliveries SET status='arrived' WHERE id=did;
 END IF;
 UPDATE core.deliveries SET status='checking' WHERE id=did;
 PERFORM ledger.move_qty((SELECT lot_id FROM core.orders WHERE id=test.id(k)),'committed','in_transit','start_check',qty,test.id(k),k||':start:'||batch);
 INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes,status)
 VALUES(test.id(k||':bbnt:'||batch),'TEST-'||k||'-BBNT-'||batch,'acceptance_record',test.org(buyer_code),test.id(k),'TEST-'||k||'-BBNT-'||batch,1,digest(k||':bbnt:'||batch,'sha256'),digest('pdf','sha256'),'{}','test/no-real-pdf','application/pdf',1,'awaiting_signature');
 INSERT INTO core.acceptance_versions(id,delivery_id,version_no,weighed_qty,document_id,recorded_by)
 VALUES(test.id(k||':accept:'||batch),did,1,qty,test.id(k||':bbnt:'||batch),test.person(receiver));
END $$;
CREATE FUNCTION test.close_delivery(k text,batch integer,buyer_code text,receiver text,qty bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM test.context(receiver,buyer_code,'buyer');
 UPDATE core.deliveries SET status='awaiting_seller' WHERE id=test.id(k||':batch:'||batch);
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=test.id(k||':accept:'||batch);
 UPDATE core.deliveries SET status='closed' WHERE id=test.id(k||':batch:'||batch);
 PERFORM ledger.move_qty((SELECT lot_id FROM core.orders WHERE id=test.id(k)),'in_transit','delivered','accept',qty,test.id(k),k||':delivered:'||batch);
END $$;
