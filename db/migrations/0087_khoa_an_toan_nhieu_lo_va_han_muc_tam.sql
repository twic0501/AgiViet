-- 0087: Sửa theo bản rà Codex 02/11 (docs/nghiep-vu/codex-ra-khung-tuan-0211.md), lỗi nặng 1 và 2.
-- (2) Buổi gọi hàng khung nhiều lô có orders.lot_id NULL → chốt sẵn sàng giao bỏ qua khóa an toàn. Nay kiểm mọi lô trong order_lines.
-- (1) Hạn mức khung: buổi chỉ có quyết toán TẠM bị loại cả giá trị khỏi phần đang dùng (NOT EXISTS settlements) → hạn mức "nhả" sai.
--     Nay buổi chưa có quyết toán CUỐI vẫn giữ phần chưa ghi công nợ = giá trị buổi − N tạm đã ghi vào phải thu người bán.
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
 IF NEW.planned_qty>available THEN RAISE EXCEPTION 'Chưa đủ lượng cam kết' USING HINT='ck_delivery_ready'; END IF;
 ELSE
 -- 0087: buổi gọi hàng khung nhiều lô (lot_id NULL): khóa và kiểm khóa an toàn MỌI lô trong dòng món.
 PERFORM 1 FROM core.lots WHERE id IN (SELECT lot_id FROM core.order_lines WHERE order_id=o.id AND version_no=NEW.version_no) FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.order_lines l JOIN core.lots x ON x.id=l.lot_id WHERE l.order_id=o.id AND l.version_no=NEW.version_no AND x.safety_locked_at IS NOT NULL) THEN RAISE EXCEPTION 'Lô khóa an toàn' USING HINT='ck_delivery_ready'; END IF;
 END IF;
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

CREATE OR REPLACE VIEW core.v_framework_limits AS
SELECT f.id,f.framework_deposit_vnd+f.extra_credit_vnd allowed_vnd,
 coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='seller_receivable'),0)
 +coalesce((SELECT scheduled_vnd FROM core.framework_opening_exposures WHERE framework_id=f.id),0)
 +coalesce((SELECT sum(greatest(v.contract_value_vnd-coalesce((SELECT s.n_vnd FROM core.settlements s WHERE s.order_id=o.id AND s.is_effective AND NOT s.is_final ORDER BY s.seq DESC LIMIT 1),0),0))
   FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no
   WHERE o.framework_id=f.id AND o.status='active' AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id AND is_final)),0) used_vnd
FROM core.framework_contracts f;
COMMENT ON VIEW core.v_framework_limits IS 'Giới hạn khung (0087): phải thu người bán đã ghi + buổi đang chạy chưa quyết toán cuối (giá trị buổi trừ N tạm đã ghi công nợ), không đếm trùng.';
