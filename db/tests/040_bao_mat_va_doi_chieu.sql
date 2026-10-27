SELECT test.context('Lê Thị Lan','TC-M01','buyer');
SELECT test.expect_error('Không đọc liên lạc của đơn không tồn tại', $$SELECT pii.read_order_contact(test.id('unknown'),test.person('Nguyễn Thị Năm'))$$,'CONTACT_LOCKED');
SELECT test.expect_ok('Liên hệ sau cọc được đọc và kiểm toán', $$SELECT pii.read_order_contact(test.id('order'),test.person('Nguyễn Thị Năm'))$$);
-- SET ROLE chạy thật, thử cả RLS lẫn REVOKE. Không dựa vào chủ migration để kết luận quyền ứng dụng.
SET LOCAL ROLE agiviet_app;
DO $$ BEGIN
 IF (SELECT count(*) FROM core.lot_price_versions)<>0 THEN RAISE EXCEPTION 'RLS lộ giá kín người bán'; END IF;
 IF (SELECT count(*) FROM core.demand_line_max_prices)<>4 THEN RAISE EXCEPTION 'RLS sai giá kín nhu cầu của Đồng Xanh'; END IF;
 IF (SELECT count(*) FROM core.orders)<>1 THEN RAISE EXCEPTION 'RLS sai đơn tổ chức'; END IF;
 IF (SELECT count(*) FROM mkt.search_lots((SELECT id FROM core.products WHERE code='XOAI_CAT_CHU')))=0 THEN RAISE EXCEPTION 'Hàm tìm nguồn không trả nguồn'; END IF;
 END $$;
RESET ROLE;
SELECT test.check('RLS thực chạy: mua không thấy giá kín bán, thấy đúng nhu cầu của mình',true);
SELECT test.expect_error('Vai app không đọc PII trực tiếp', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; PERFORM * FROM pii.user_contacts; END $b$;$$,'42501');
SELECT test.expect_error('Vai app không gọi hàm ghi tiền', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; PERFORM ledger.reverse('00000000-0000-0000-0000-000000000001'::uuid,'Thử',NULL); END $b$;$$,'42501');
SELECT test.expect_error('Vai app không tự chỉnh số dư', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; UPDATE ledger.account_balances SET balance_vnd=0; END $b$;$$,'42501');
SELECT test.expect_error('Vai app không TRUNCATE bút toán', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; TRUNCATE ledger.entries; END $b$;$$,'42501');
SELECT test.context('Trần Văn Sáu','TC-B02','seller');
SET LOCAL ROLE agiviet_app;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM core.orders) THEN RAISE EXCEPTION 'Đọc đơn của tổ chức khác'; END IF;
 IF (SELECT count(*) FROM core.lot_price_versions)<>1 THEN RAISE EXCEPTION 'Sai giá riêng người bán Sáu'; END IF;
 END $$;
RESET ROLE;
SELECT test.check('RLS thực chạy: người bán khác không thấy đơn',true);
SELECT test.expect_error('Vai app không tạo đơn bằng SQL trực tiếp', $$DO $b$ BEGIN SET LOCAL ROLE agiviet_app; INSERT INTO core.orders(id,code,status) VALUES('00000000-0000-0000-0000-000000000002','ILLEGAL','completed'); END $b$;$$,'42501');
SELECT test.context(NULL,NULL,'system');
DO $$ DECLARE a uuid; b uuid; lines jsonb;
BEGIN
 lines:=jsonb_build_array(jsonb_build_object('type','external','org',test.org('TC-M01'),'amount',-12345),jsonb_build_object('type','external','org',test.org('TC-B01'),'amount',12345));
 a:=test.manual_post('manual_adjustment',NULL,'test-money-idem','Thử chống lặp',lines);
 b:=test.manual_post('manual_adjustment',NULL,'test-money-idem','Thử chống lặp',lines);
 PERFORM test.check('Ghi tiền cùng khóa không ghi trùng',a=b AND (SELECT count(*)=2 FROM ledger.entries WHERE transaction_id=a));
 PERFORM test.expect_error('Tiền cùng khóa khác thân bị chặn',format('SELECT ledger.post(%L,NULL,%L,%L,%L::jsonb)','manual_adjustment','test-money-idem','Thân khác',lines::text),'IDEMPOTENCY_CONFLICT');
 PERFORM test.reverse(a);
 PERFORM test.check('Bút toán đảo đối ứng đúng tài khoản',(SELECT sum(amount_vnd)=0 FROM ledger.entries WHERE transaction_id IN (a,(SELECT id FROM ledger.transactions WHERE reverses_id=a))));
END $$;
SELECT test.expect_error('Tài khoản giữ hộ không được âm', $$DO $b$ BEGIN
 PERFORM test.manual_post('manual_adjustment',test.id('order'),'negative-escrow','Thử âm',jsonb_build_array(jsonb_build_object('type','deposit_escrow','order',test.id('order'),'amount',-1),jsonb_build_object('type','external','org',test.org('TC-M01'),'amount',1)));
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$,'ck_ledger_non_negative');
SELECT test.expect_error('Nghiệm thu không thêm dòng sau COMMIT', $$INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd) SELECT test.id('acceptance'),99,id,'accepted',1,1,23000,23 FROM core.lots WHERE code='L-0412'$$,'ck_acceptance_sealed');
SELECT test.expect_error('Tài liệu đã ký không đổi nội dung', $$UPDATE core.documents SET canonical_content='{"changed":true}' WHERE id=test.id('contract')$$,'ck_append_only');
SELECT test.expect_error('Không ký lại bản đã kết thúc', $$INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id) VALUES(test.id('contract'),'witness',test.person('Nguyễn Thị Năm'),test.org('TC-B01'),'otp',digest('test-terms','sha256'),'TEST-OTP','device')$$,'PHIEN_BAN_DA_DOI');
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT test.check('Mọi giao dịch >=2 dòng và tổng bằng 0',NOT EXISTS(SELECT t.id FROM ledger.transactions t LEFT JOIN ledger.entries e ON e.transaction_id=t.id GROUP BY t.id HAVING count(e.id)<2 OR coalesce(sum(e.amount_vnd),0)<>0));
SELECT test.check('Bộ đệm tiền khớp tổng bút toán',NOT EXISTS(SELECT 1 FROM ledger.v_account_balances v LEFT JOIN ledger.account_balances b ON b.account_id=v.account_id WHERE v.balance_vnd<>coalesce(b.balance_vnd,0)));
SELECT test.check('Ngăn lượng thật không âm',NOT EXISTS(SELECT 1 FROM ledger.qty_balances WHERE bucket<>'source' AND qty<0));
SELECT test.check('Mỗi lô bảo toàn tổng lượng',NOT EXISTS(SELECT lot_id FROM ledger.qty_balances GROUP BY lot_id HAVING sum(qty)<>0));
SELECT test.check('Lô chính không trừ hai lần: 2000 khả dụng, 1970 giao, 30 chuyển con',
 (SELECT qty=2000000 FROM ledger.qty_balances WHERE lot_id=(SELECT id FROM core.lots WHERE code='L-0412') AND bucket='available') AND
 (SELECT qty=1970000 FROM ledger.qty_balances WHERE lot_id=(SELECT id FROM core.lots WHERE code='L-0412') AND bucket='delivered') AND
 (SELECT qty=30000 FROM ledger.qty_balances WHERE lot_id=(SELECT id FROM core.lots WHERE code='L-0412') AND bucket='moved_to_child'));
SELECT test.check('Bộ đệm lượng khớp từng chuyển động',NOT EXISTS(
 WITH entries AS (
 SELECT lot_id,from_bucket bucket,CASE WHEN from_bucket='held' THEN hold_id WHEN b.per_order THEN order_id ELSE '00000000-0000-0000-0000-000000000000'::uuid END order_key,-qty delta FROM ledger.qty_movements m JOIN ref.qty_buckets b ON b.code=m.from_bucket
 UNION ALL SELECT lot_id,to_bucket,CASE WHEN to_bucket='held' THEN hold_id WHEN b.per_order THEN order_id ELSE '00000000-0000-0000-0000-000000000000'::uuid END,qty FROM ledger.qty_movements m JOIN ref.qty_buckets b ON b.code=m.to_bucket
 ), sums AS(SELECT lot_id,bucket,order_key,sum(delta) qty FROM entries GROUP BY 1,2,3)
 SELECT 1 FROM sums s FULL JOIN ledger.qty_balances b USING(lot_id,bucket,order_key) WHERE coalesce(s.qty,0)<>coalesce(b.qty,0)));
SELECT test.check('Mỗi lịch sử mới đều có event/outbox',NOT EXISTS(SELECT 1 FROM evt.state_history h WHERE h.entity_id=test.id('order') AND NOT EXISTS(SELECT 1 FROM evt.domain_events e JOIN evt.outbox b ON b.event_id=e.id WHERE e.aggregate_id=h.entity_id AND (e.payload->>'history_id')::bigint=h.id)));
SELECT test.check('Mỗi bảng nghiệp vụ có COMMENT',NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('core','ledger','pii','ops','evt','mkt','ref') AND c.relkind='r' AND obj_description(c.oid,'pg_class') IS NULL));
SELECT test.check('Mỗi cột nghiệp vụ có COMMENT',NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('core','ledger','pii','ops','evt','mkt','ref') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND col_description(c.oid,a.attnum) IS NULL));
