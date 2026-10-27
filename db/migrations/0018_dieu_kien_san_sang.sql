CREATE FUNCTION core.guard_delivery_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; available numeric; received numeric; value_due numeric; needed text; normalized text; market text;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 SELECT * INTO v FROM core.order_versions WHERE order_id=NEW.order_id AND version_no=NEW.version_no;
 IF TG_OP='INSERT' OR NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NEW.status='ready' THEN
 IF o.status<>'active' OR NEW.version_no IS DISTINCT FROM o.effective_version_no OR EXISTS(SELECT 1 FROM core.amendments WHERE order_id=o.id AND status='open') OR
 EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money')) THEN RAISE EXCEPTION 'Đơn chưa đủ điều kiện giao' USING HINT='ck_delivery_ready'; END IF;
 IF o.lot_id IS NOT NULL THEN
 PERFORM 1 FROM core.lots WHERE id=o.lot_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.lots WHERE id=o.lot_id AND safety_locked_at IS NOT NULL) THEN RAISE EXCEPTION 'Lô khóa an toàn' USING HINT='ck_delivery_ready'; END IF;
 SELECT coalesce(sum(qty),0) INTO available FROM ledger.qty_balances WHERE lot_id=o.lot_id AND order_key=o.id AND bucket='committed';
 IF NEW.planned_qty>available THEN RAISE EXCEPTION 'Chưa đủ lượng cam kết' USING HINT='ck_delivery_ready'; END IF; END IF;
 IF o.framework_id IS NULL THEN
 SELECT coalesce(sum(balance_vnd),0) INTO available FROM ledger.v_account_balances WHERE order_id=o.id AND account_type='deposit_escrow';
 available:=available+coalesce((SELECT sum(amount_vnd) FROM core.bank_instructions WHERE order_id=o.id AND kind='release_deposit_to_seller' AND status IN ('created','sent','processing','succeeded','reconciled')),0);
 IF available<v.deposit_vnd THEN RAISE EXCEPTION 'Chưa đủ cọc sau phụ lục' USING HINT='ck_delivery_deposit'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM core.direct_payments p WHERE order_id=o.id AND blocks_loading AND kind<>'goods_on_receipt' AND p.status<>'cancelled' AND p.amount_due_vnd<>(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations WHERE direct_payment_id=p.id)) THEN RAISE EXCEPTION 'Chưa đủ tiền trước bốc' USING HINT='CHUA_DU_TIEN_TRUOC_BOC'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.user_id=NEW.receiver_user_id AND m.org_id=o.buyer_org_id AND m.status='active' AND r.role_code IN ('owner','warehouse','site_receiver')) THEN RAISE EXCEPTION 'Chưa chỉ định người nhận hợp lệ' USING HINT='ck_delivery_ready'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.qr_tokens WHERE delivery_id=NEW.id AND kind='receipt' AND designated_user_id=NEW.receiver_user_id AND revoked_at IS NULL AND expires_at>ref.clock_at()) THEN RAISE EXCEPTION 'Chưa phát QR nhận hàng' USING HINT='ck_delivery_ready'; END IF;
 IF v.transport_by IN ('buyer','partner_for_buyer','partner_for_seller') AND NOT EXISTS(SELECT 1 FROM core.trip_deliveries td JOIN core.trips t ON t.id=td.trip_id WHERE td.delivery_id=NEW.id AND t.status IN ('accepted','at_pickup','loading')) THEN RAISE EXCEPTION 'Chưa có chuyến xe nhận chở' USING HINT='ck_delivery_ready'; END IF;
 IF v.inspection_before_loading AND NOT EXISTS(SELECT 1 FROM core.inspections i JOIN core.inspection_results r ON r.inspection_id=i.id WHERE i.delivery_id=NEW.id AND r.result='passed' AND NOT EXISTS(SELECT 1 FROM core.inspection_results n WHERE n.supersedes_id=r.id)) THEN RAISE EXCEPTION 'Chưa đạt kiểm định trước bốc' USING HINT='ck_delivery_ready'; END IF;
 FOR needed IN SELECT unnest(required_docs) FROM core.demands WHERE id=o.demand_id LOOP
 normalized:=CASE split_part(needed,':',1) WHEN 'ma_vung_trong' THEN 'growing_area_code' WHEN 'nhat_ky_cach_ly' THEN 'spray_diary' WHEN 'nhat_ky_ao' THEN 'pond_diary' WHEN 'kiem_dinh' THEN CASE split_part(needed,':',2) WHEN 'cadimi_vang_o' THEN 'cadmium_test' WHEN 'khang_sinh' THEN 'antibiotic_test' ELSE needed END ELSE needed END;
 market:=CASE WHEN needed LIKE 'ma_vung_trong:%' THEN split_part(needed,':',2) END;
 IF NOT EXISTS(SELECT 1 FROM core.certifications c WHERE c.org_id=o.seller_org_id AND c.kind=normalized AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL AND (c.valid_during IS NULL OR c.valid_during@>(upper(NEW.delivery_window) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (market IS NULL OR c.market=market)) THEN RAISE EXCEPTION 'Thiếu hồ sơ xác minh %',needed USING HINT='ck_delivery_ready'; END IF;
 END LOOP;
 END IF;
 IF NEW.status='in_transit' AND (v.payment_timing IN ('before_loading','inspect_then_before_loading') OR (v.payment_timing='on_receipt' AND v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom'))) THEN
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.kind IN ('goods_before_loading','goods_on_receipt','goods_extra','goods_batch');
 IF v.payment_timing='before_loading' THEN value_due:=v.contract_value_vnd;
 ELSE SELECT coalesce(sum(l.value_vnd),0) INTO value_due FROM core.acceptance_versions a JOIN core.acceptance_lines l ON l.acceptance_id=a.id WHERE a.delivery_id=NEW.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=a.delivery_id AND n.version_no>a.version_no); END IF;
 IF received<greatest(0,value_due-v.deposit_vnd) THEN RAISE EXCEPTION 'Chưa đủ tiền trước bốc' USING HINT='CHUA_DU_TIEN_TRUOC_BOC'; END IF;
 END IF;
 IF NEW.status IN ('checking','in_transit') AND OLD.status='ready' THEN
 IF NOT NEW.delivery_window@>ref.clock_at() THEN RAISE EXCEPTION 'Ngoài cửa sổ giao' USING HINT='ck_delivery_window'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.qr_tokens q JOIN evt.qr_scans s ON s.token_id=q.id WHERE q.delivery_id=NEW.id AND q.kind='receipt' AND q.revoked_at IS NULL AND q.expires_at>ref.clock_at() AND s.actor_user_id=NEW.receiver_user_id AND s.result='accepted') THEN RAISE EXCEPTION 'Chưa xác thực QR nhận hàng' USING HINT='ck_delivery_qr'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_ready BEFORE INSERT OR UPDATE OF status ON core.deliveries FOR EACH ROW EXECUTE FUNCTION core.guard_delivery_ready();
CREATE FUNCTION core.check_trip_load() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE q numeric; cap bigint;
BEGIN
 PERFORM 1 FROM core.trips WHERE id=NEW.trip_id FOR UPDATE;
 SELECT v.capacity_qty INTO cap FROM core.trips t JOIN core.vehicles v ON v.id=t.vehicle_id WHERE t.id=NEW.trip_id;
 SELECT sum(loaded_qty) INTO q FROM core.trip_deliveries WHERE trip_id=NEW.trip_id;
 IF q>cap THEN RAISE EXCEPTION 'Chuyến vượt tải' USING HINT='ck_trip_capacity'; END IF; RETURN NEW; END $$;
CREATE TRIGGER z_capacity AFTER INSERT OR UPDATE ON core.trip_deliveries FOR EACH ROW EXECUTE FUNCTION core.check_trip_load();
CREATE UNIQUE INDEX uq_charge_reversal ON core.contract_charges(reverses_id) WHERE reverses_id IS NOT NULL;
CREATE FUNCTION core.check_charge_reversal() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE c core.contract_charges%ROWTYPE;
BEGIN
 IF NEW.reverses_id IS NOT NULL THEN SELECT * INTO c FROM core.contract_charges WHERE id=NEW.reverses_id;
 IF c.reverses_id IS NOT NULL OR (NEW.order_id,NEW.kind,NEW.payer_side,NEW.amount_vnd) IS DISTINCT FROM (c.order_id,c.kind,c.payer_side,-c.amount_vnd) THEN RAISE EXCEPTION 'Khoản đảo không đối ứng khoản gốc' USING HINT='ck_charge_reversal'; END IF; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_reversal BEFORE INSERT ON core.contract_charges FOR EACH ROW EXECUTE FUNCTION core.check_charge_reversal();
