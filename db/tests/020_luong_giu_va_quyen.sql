SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.offers(id,code,direction,lot_id,buyer_org_id,seller_org_id)
SELECT test.id('hold-offer'),'TEST-HOLD','buyer_bid',id,test.org('TC-M01'),seller_org_id FROM core.lots WHERE code='L-0412';
UPDATE core.offers SET status='accepted' WHERE id=test.id('hold-offer');
INSERT INTO core.holds(id,lot_id,offer_id,qty,expires_at)
SELECT test.id('hold'),id,test.id('hold-offer'),3000000,now()+interval '24 hours' FROM core.lots WHERE code='L-0412';
SELECT test.check('Giữ được 3000 kg trước khi có đơn',EXISTS(SELECT 1 FROM ledger.qty_balances WHERE bucket='held' AND order_key=test.id('hold') AND qty=3000000));
SELECT test.expect_error('Lô ước tính chặn vượt 80 phần trăm', $$DO $b$ BEGIN
 INSERT INTO core.offers(id,code,direction,lot_id,buyer_org_id,seller_org_id) SELECT test.id('hold2-offer'),'TEST-HOLD2','buyer_bid',id,test.org('TC-M04'),seller_org_id FROM core.lots WHERE code='L-0412';
 UPDATE core.offers SET status='accepted' WHERE id=test.id('hold2-offer');
 INSERT INTO core.holds(id,lot_id,offer_id,qty,expires_at) SELECT test.id('hold2'),id,test.id('hold2-offer'),300000,now()+interval '24 hours' FROM core.lots WHERE code='L-0412'; END $b$;$$,'ck_qty_estimated_cap');
SELECT test.context(NULL,NULL,'system');
UPDATE core.holds SET status='expired' WHERE id=test.id('hold');
SELECT test.check('Hết hạn trả đủ lượng khả dụng', (SELECT qty=4000000 FROM ledger.qty_balances WHERE lot_id=(SELECT id FROM core.lots WHERE code='L-0412') AND bucket='available'));
SELECT test.expect_error('Không sửa lượng giữ', $$UPDATE core.holds SET qty=1 WHERE id=test.id('hold')$$,'ck_hold_frozen');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
DO $$ DECLARE raw text; BEGIN
 raw:=core.issue_qr('lot',(SELECT id FROM core.lots WHERE code='L-0412'));
 PERFORM test.check('QR công khai quét lại được',core.scan_qr(raw,'test')='accepted' AND core.scan_qr(raw,'test')='accepted');
 raw:=core.issue_qr('invitation',test.org('TC-B01'),clock_timestamp()+interval '1 hour',test.person('Nguyễn Thị Năm'));
 PERFORM test.check('QR dùng một lần',core.scan_qr(raw,'test',test.invitation_otp(raw,ref.ctx_user()))='accepted' AND core.scan_qr(raw,'test')='used');
 raw:=core.issue_qr('invitation',test.org('TC-B01'),clock_timestamp()+interval '1 hour',test.person('Trần Văn Sáu'));
 PERFORM test.check('QR đúng người được chỉ định',core.scan_qr(raw,'test')='wrong_user');
 END $$;
SELECT test.check('QR lạ có nhật ký',core.scan_qr('not-a-valid-token','test')='unknown');
SELECT test.expect_error('Người giúp không được đổi tài khoản', $$DO $b$ BEGIN
 PERFORM set_config('app.actor_kind','helper',true); UPDATE pii.bank_accounts SET status='locked' WHERE org_id=test.org('TC-B01'); END $b$;$$,'KHONG_CO_QUYEN');
SELECT test.expect_error('Khung kế toán không được cho nợ thêm', $$DO $b$ BEGIN
 PERFORM test.context('Phạm Thị Mai','TC-B03','seller');
 INSERT INTO core.framework_credit_grants(framework_id,extra_credit_vnd,granted_by) SELECT id,1700000,test.person('Phạm Thị Mai') FROM core.framework_contracts WHERE code='KH-2003'; END $b$;$$,'KHONG_CO_QUYEN');
SELECT test.expect_ok('Khung ban điều hành được cho nợ thêm', $$DO $b$ BEGIN
 PERFORM test.context('Lê Văn Hòa','TC-B03','seller');
 INSERT INTO core.framework_credit_grants(framework_id,extra_credit_vnd,granted_by) SELECT id,1700000,test.person('Lê Văn Hòa') FROM core.framework_contracts WHERE code='KH-2003'; END $b$;$$);
SELECT test.expect_error('Xe không nhận hai chuyến chồng giờ', $$DO $b$ BEGIN
 INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) SELECT 'TEST-TRIP1',id,test.person('Hồ Văn Lộc'),test.org('TC-M01'),tstzrange('2026-11-04 06:00+07','2026-11-04 12:00+07'),3200000 FROM core.vehicles WHERE plate_no='66C-123.45';
 INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) SELECT 'TEST-TRIP2',id,test.person('Hồ Văn Lộc'),test.org('TC-M01'),tstzrange('2026-11-04 07:00+07','2026-11-04 13:00+07'),3200000 FROM core.vehicles WHERE plate_no='66C-123.45'; END $b$;$$,'23P01');
SELECT test.check('Khóa idempotency trả lại cùng hàng', (evt.claim_idempotency('test','same',digest('a','sha256'))).key='same');
SELECT test.expect_error('Idempotency khác thân bị chặn', $$SELECT evt.claim_idempotency('test','same',digest('b','sha256'))$$,'IDEMPOTENCY_CONFLICT');
INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) VALUES('bank_sim','TEST-IDEM-WEBHOOK','deposit_received',true,'{}');
SELECT test.expect_error('Khóa webhook không cho ghi lặp', $$INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) SELECT provider,provider_event_id,event_type,signature_valid,payload FROM evt.inbound_webhooks LIMIT 1$$,'23505');
