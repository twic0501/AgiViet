-- 0081: một đợt giao đi được NHIỀU chuyến xe (đơn lớn, vd 15 tấn lúa với xe 5 tấn).
-- Trước: cmd.book_trip gắn cả planned_qty vào một chuyến → xe nhỏ hơn đợt thì "Chuyến vượt tải", đơn kẹt ở chuẩn bị
-- (phát hiện qua đóng vai vòng 2, GPTBAN-04 người dùng phổ thông bán 15 tấn lúa, 02/11/2026).
-- Nay: mỗi chuyến chở tối đa tải xe, lấy theo phần CÒN LẠI chưa có xe; sẵn sàng giao khi tổng loaded_qty các chuyến hiệu lực ≥ planned_qty.
CREATE OR REPLACE FUNCTION cmd.book_trip(p_delivery uuid,p_vehicle uuid,p_driver uuid,p_window tstzrange,p_freight bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; side text; tai bigint; da_co bigint; cho_xe bigint;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=d.order_id AND version_no=d.version_no;
 side:=CASE WHEN v.transport_by IN ('buyer','partner_for_buyer') THEN 'buyer' ELSE 'seller' END;
 o:=cmd.order_party(d.order_id,side,ARRAY['owner','purchaser','coop_board']);
 IF d.status NOT IN ('preparing','ready') OR o.status<>'active' THEN RAISE EXCEPTION 'Đợt chưa thể đặt xe' USING HINT='ck_command_state'; END IF;
 SELECT capacity_qty INTO tai FROM core.vehicles WHERE id=p_vehicle;
 IF tai IS NULL OR tai<=0 THEN RAISE EXCEPTION 'Xe không hợp lệ' USING HINT='ck_command_state'; END IF;
 SELECT coalesce(sum(td.loaded_qty),0) INTO da_co FROM core.trip_deliveries td JOIN core.trips t ON t.id=td.trip_id
  WHERE td.delivery_id=d.id AND t.status NOT IN ('cancelled','rejected','failed');
 IF da_co>=d.planned_qty THEN RAISE EXCEPTION 'Đợt đã đủ xe' USING HINT='ck_command_state'; END IF;
 cho_xe:=least(tai,d.planned_qty-da_co);
 INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) VALUES('TRIP-'||gen_random_uuid(),p_vehicle,p_driver,ref.ctx_org(),p_window,p_freight) RETURNING id INTO result;
 INSERT INTO core.trip_deliveries(trip_id,delivery_id,loaded_qty,freight_share_vnd) VALUES(result,d.id,cho_xe,p_freight);
 -- booked: nhà xe/dispatcher phải xác nhận thật bằng command riêng, không suy từ đặt xe.
 RETURN result;
END $$;
COMMENT ON FUNCTION cmd.book_trip(uuid,uuid,uuid,tstzrange,bigint) IS 'Đặt một chuyến xe cho đợt giao: chở tối đa tải xe, lấy theo phần còn lại chưa có xe (0081); đặt thêm khi đã đủ xe thì báo "Đợt đã đủ xe".';

CREATE OR REPLACE FUNCTION core.guard_delivery_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; available numeric; received numeric; value_due numeric; needed text; normalized text; thi_truong text;
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
 IF v.transport_by IN ('buyer','partner_for_buyer','partner_for_seller') AND coalesce((SELECT sum(td.loaded_qty) FROM core.trip_deliveries td JOIN core.trips t ON t.id=td.trip_id WHERE td.delivery_id=NEW.id AND t.status IN ('accepted','at_pickup','loading')),0) < NEW.planned_qty THEN RAISE EXCEPTION 'Chưa đủ xe cho cả đợt' USING HINT='ck_delivery_ready'; END IF;
 IF v.inspection_before_loading AND NOT EXISTS(SELECT 1 FROM core.inspections i JOIN core.inspection_results r ON r.inspection_id=i.id WHERE i.delivery_id=NEW.id AND r.result='passed' AND NOT EXISTS(SELECT 1 FROM core.inspection_results n WHERE n.supersedes_id=r.id)) THEN RAISE EXCEPTION 'Chưa đạt kiểm định trước bốc' USING HINT='ck_delivery_ready'; END IF;
 FOR needed IN SELECT unnest(required_docs) FROM core.demands WHERE id=o.demand_id LOOP
 normalized:=CASE split_part(needed,':',1) WHEN 'ma_vung_trong' THEN 'growing_area_code' WHEN 'nhat_ky_cach_ly' THEN 'spray_diary' WHEN 'nhat_ky_ao' THEN 'pond_diary' WHEN 'kiem_dinh' THEN CASE split_part(needed,':',2) WHEN 'cadimi_vang_o' THEN 'cadmium_test' WHEN 'khang_sinh' THEN 'antibiotic_test' ELSE needed END ELSE needed END;
 thi_truong:=CASE WHEN needed LIKE 'ma_vung_trong:%' THEN split_part(needed,':',2) END;
 IF NOT EXISTS(SELECT 1 FROM core.certifications c WHERE c.org_id=o.seller_org_id AND c.kind=normalized AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL AND (c.valid_during IS NULL OR c.valid_during@>(upper(NEW.delivery_window) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (thi_truong IS NULL OR c.market=thi_truong)) THEN RAISE EXCEPTION 'Thiếu hồ sơ xác minh %',needed USING HINT='ck_delivery_ready'; END IF;
 END LOOP;
 END IF;
 IF NEW.status='in_transit' AND (v.payment_timing IN ('before_loading','inspect_then_before_loading') OR (v.payment_timing='on_receipt' AND v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom'))) THEN
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.kind IN ('goods_before_loading','goods_on_receipt','goods_extra','goods_batch');
 IF v.payment_timing='before_loading' THEN value_due:=v.contract_value_vnd;
 ELSE SELECT coalesce(sum(l.value_vnd),0) INTO value_due FROM core.acceptance_versions a JOIN core.acceptance_lines l ON l.acceptance_id=a.id WHERE a.delivery_id=NEW.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=a.delivery_id AND n.version_no>a.version_no); END IF;
 IF received<greatest(0,value_due-v.deposit_vnd) THEN RAISE EXCEPTION 'Chưa đủ tiền trước bốc' USING HINT='CHUA_DU_TIEN_TRUOC_BOC'; END IF;
 END IF;
 IF (NEW.status IN ('checking','in_transit') AND OLD.status='ready') OR NEW.status IN ('checking','arrival_check') THEN
 IF NOT NEW.delivery_window@>ref.clock_at() THEN RAISE EXCEPTION 'Ngoài cửa sổ giao' USING HINT='ck_delivery_window'; END IF;
 IF (NEW.status IN ('checking','arrival_check') OR v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom')) AND NOT EXISTS(SELECT 1 FROM core.qr_tokens q JOIN evt.qr_scans s ON s.token_id=q.id WHERE q.delivery_id=NEW.id AND q.kind='receipt' AND q.revoked_at IS NULL AND q.expires_at>ref.clock_at() AND s.actor_user_id=NEW.receiver_user_id AND s.result='accepted') THEN RAISE EXCEPTION 'Chưa xác thực QR nhận hàng' USING HINT='ck_delivery_qr'; END IF;
 END IF;
 RETURN NEW; END $$;
COMMENT ON FUNCTION core.guard_delivery_ready() IS 'Chốt chặn đợt giao sang ready/in_transit/checking: đơn hiệu lực, đủ lượng, đủ cọc, đủ tiền trước bốc, người nhận + QR, đủ xe cho cả đợt (tổng loaded_qty các chuyến ≥ planned_qty, 0081), kiểm định trước bốc, hồ sơ bắt buộc đúng thị trường (0080), cửa sổ giao.';
