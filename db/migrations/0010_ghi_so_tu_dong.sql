-- =====================================================================
-- 0010 · Ghi sổ cái tự động từ tầng nghiệp vụ (0006).
-- Backend KHÔNG tự ghép bút toán cho các sự kiện dưới đây: chèn/đổi trạng thái bảng nghiệp vụ là
-- sổ cái tự ghi trong cùng giao dịch DB. Nhờ vậy "đơn từ" và "sổ" không thể lệch nhau.
-- =====================================================================

-- Phạm vi quyền đòi của một đơn: lần gọi hàng khung dùng công nợ của hợp đồng khung (thanh toán theo kỳ).
CREATE FUNCTION ledger.claim_scope(p_order uuid, OUT o_order uuid, OUT o_framework uuid)
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN o.framework_id IS NULL THEN o.id END, o.framework_id FROM core.orders o WHERE o.id = p_order
$$;

-- 1) Ngân hàng báo nhận tiền cọc (gọi sau khi đã chèn core.bank_events). Trả về trạng thái cọc mới.
CREATE FUNCTION ledger.apply_deposit_receipt(p_event uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_ev core.bank_events%ROWTYPE; v_dep core.deposits%ROWTYPE;
  v_expected bigint; v_received bigint; v_fee_captured bigint; v_fee_due bigint; v_new_status text;
BEGIN
  SELECT * INTO v_ev FROM core.bank_events WHERE id = p_event FOR UPDATE;
  IF v_ev.applied_at IS NOT NULL THEN RETURN 'duplicate_ignored'; END IF;   -- BT-T8
  IF v_ev.kind <> 'deposit_received' THEN RAISE EXCEPTION 'Sự kiện % không phải nhận cọc', p_event; END IF;

  SELECT d.* INTO v_dep FROM core.deposits d
   WHERE d.payment_ref = v_ev.payment_ref
      OR d.id = (SELECT a.deposit_id FROM core.deposit_adjustments a WHERE a.payment_ref = v_ev.payment_ref)
   FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM ledger.post('unmatched_receipt', NULL, 'bankev:' || p_event, 'Tiền vào chưa khớp: ' || coalesce(v_ev.payment_ref, '?'),
      jsonb_build_array(jsonb_build_object('type','suspense','amount', v_ev.amount_vnd),
                        jsonb_build_object('type','external_unidentified','amount', -v_ev.amount_vnd)),
      v_ev.occurred_at, NULL, NULL, jsonb_build_object('bank_event', p_event));
    UPDATE core.bank_events SET applied_at = now(), apply_result = 'unmatched_suspense' WHERE id = p_event;
    RETURN 'unmatched';
  END IF;

  PERFORM ledger.post('deposit_receipt', v_dep.order_id, 'bankev:' || p_event, 'Nhận cọc ' || v_dep.payment_ref,
    jsonb_build_array(
      jsonb_build_object('type','deposit_escrow','order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', v_ev.amount_vnd),
      jsonb_build_object('type','external','org', v_dep.payer_org_id, 'amount', -v_ev.amount_vnd)),
    v_ev.occurred_at, NULL, NULL, jsonb_build_object('bank_event', p_event, 'framework', v_dep.framework_id));

  v_expected := v_dep.expected_deposit_vnd + v_dep.expected_fee_vnd
              + coalesce((SELECT sum(greatest(delta_deposit_vnd, 0) + greatest(delta_fee_vnd, 0)) FROM core.deposit_adjustments WHERE deposit_id = v_dep.id), 0);
  v_fee_due := v_dep.expected_fee_vnd + coalesce((SELECT sum(greatest(delta_fee_vnd, 0)) FROM core.deposit_adjustments WHERE deposit_id = v_dep.id), 0);
  SELECT coalesce(sum(e.amount_vnd), 0) INTO v_received
    FROM ledger.transactions t JOIN ledger.entries e ON e.transaction_id = t.id JOIN ledger.accounts a ON a.id = e.account_id
   WHERE t.kind = 'deposit_receipt' AND a.account_type = 'deposit_escrow'
     AND a.order_id IS NOT DISTINCT FROM v_dep.order_id AND a.framework_id IS NOT DISTINCT FROM v_dep.framework_id;
  SELECT coalesce(sum(e.amount_vnd), 0) INTO v_fee_captured
    FROM ledger.transactions t JOIN ledger.entries e ON e.transaction_id = t.id JOIN ledger.accounts a ON a.id = e.account_id
   WHERE t.kind = 'fee_capture' AND a.account_type = 'fee_held'
     AND a.order_id IS NOT DISTINCT FROM v_dep.order_id AND a.framework_id IS NOT DISTINCT FROM v_dep.framework_id;

  -- Đủ cọc + phí: tách phần phí chưa tách sang fee_held. Phần thừa nằm lại ở cọc; backend tạo lệnh hoan_thua.
  IF v_received >= v_expected AND v_fee_due > v_fee_captured THEN
    PERFORM ledger.post('fee_capture', v_dep.order_id, 'feecap:' || v_dep.id || ':' || v_fee_due, 'Tách phí ' || v_dep.payment_ref,
      jsonb_build_array(
        jsonb_build_object('type','deposit_escrow','order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -(v_fee_due - v_fee_captured)),
        jsonb_build_object('type','fee_held','order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', v_fee_due - v_fee_captured)),
      v_ev.occurred_at, NULL, NULL, jsonb_build_object('framework', v_dep.framework_id));
  END IF;

  v_new_status := CASE WHEN v_received >= v_expected THEN 'held' ELSE 'partially_received' END;
  IF v_dep.status <> v_new_status AND v_dep.status IN ('awaiting_transfer','partially_received') THEN
    UPDATE core.deposits SET status = v_new_status WHERE id = v_dep.id;
  END IF;
  UPDATE core.bank_events SET applied_at = now(), apply_result = 'applied' WHERE id = p_event;
  RETURN v_new_status;
END $$;
COMMENT ON FUNCTION ledger.apply_deposit_receipt IS 'Áp sự kiện ngân hàng "đã nhận cọc": ghi sổ, tách phí khi đủ, đổi trạng thái cọc. Gọi lặp an toàn.';

-- 2) Lệnh ngân hàng: tạo → giữ tiền trong lệnh; thành công → chuyển ra đích; thất bại → trả về chỗ cũ.
CREATE FUNCTION ledger.on_bank_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_kind ref.bank_instruction_kinds%ROWTYPE; v_dep core.deposits%ROWTYPE;
  v_src text; v_hold text; v_lines jsonb; v_c_order uuid; v_c_fw uuid;
BEGIN
  SELECT * INTO v_kind FROM ref.bank_instruction_kinds WHERE code = NEW.kind;
  SELECT * INTO v_dep FROM core.deposits WHERE id = NEW.deposit_id;
  v_src  := v_kind.source;
  v_hold := CASE WHEN v_src = 'fee_held' THEN 'fee_in_instruction' ELSE 'deposit_in_instruction' END;

  IF TG_OP = 'INSERT' THEN
    PERFORM ledger.post('instruction_reserve', v_dep.order_id, 'bi:' || NEW.id || ':reserve', 'Lệnh ' || NEW.code,
      jsonb_build_array(
        jsonb_build_object('type', v_src,  'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount',  NEW.amount_vnd)),
      now(), NULL, NEW.approved_by, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
    RETURN NEW;
  END IF;

  IF NEW.status = 'succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
      jsonb_build_object('type', 'external', 'org', NEW.target_org_id, 'amount', NEW.amount_vnd));
    IF NEW.kind = 'release_deposit_to_seller' THEN
      IF v_dep.framework_id IS NOT NULL THEN
        v_c_fw := v_dep.framework_id;
      ELSE
        SELECT o_order, o_framework INTO v_c_order, v_c_fw FROM ledger.claim_scope(v_dep.order_id);
      END IF;
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('type','seller_receivable','order', v_c_order, 'framework', v_c_fw, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type','buyer_payable',    'order', v_c_order, 'framework', v_c_fw, 'amount',  NEW.amount_vnd));
    END IF;
    PERFORM ledger.post('instruction_paid', v_dep.order_id, 'bi:' || NEW.id || ':paid', 'Lệnh thành công ' || NEW.code,
      v_lines, now(), NULL, NULL, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
  ELSIF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
    PERFORM ledger.post('instruction_failed', v_dep.order_id, 'bi:' || NEW.id || ':failed', 'Lệnh thất bại ' || NEW.code,
      jsonb_build_array(
        jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type', v_src,  'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount',  NEW.amount_vnd)),
      now(), NULL, NULL, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_bi_ledger_insert AFTER INSERT ON core.bank_instructions
  FOR EACH ROW EXECUTE FUNCTION ledger.on_bank_instruction();
CREATE TRIGGER tg_bi_ledger_status AFTER UPDATE OF status ON core.bank_instructions
  FOR EACH ROW EXECUTE FUNCTION ledger.on_bank_instruction();

-- 3) Xác nhận khoản trả thẳng (chỉ bên nhận) → tiền đổi chỗ ngoài app + quyền đòi giảm/tăng.
CREATE FUNCTION ledger.on_direct_payment_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_dp core.direct_payments%ROWTYPE; v_c_order uuid; v_c_fw uuid; v_sign int;
BEGIN
  IF NEW.amount_vnd = 0 THEN RETURN NEW; END IF;
  SELECT * INTO v_dp FROM core.direct_payments WHERE id = NEW.direct_payment_id;
  IF v_dp.order_id IS NOT NULL THEN
    SELECT o_order, o_framework INTO v_c_order, v_c_fw FROM ledger.claim_scope(v_dp.order_id);
  ELSE
    v_c_fw := v_dp.framework_id;
  END IF;
  -- buyer_to_seller: quyền đòi của người bán giảm; seller_to_buyer: tăng lại (người bán đã hoàn phần thừa).
  v_sign := CASE WHEN v_dp.direction = 'buyer_to_seller' THEN -1 ELSE 1 END;
  PERFORM ledger.post('direct_payment', v_dp.order_id, 'dpc:' || NEW.id, 'Xác nhận ' || v_dp.code,
    jsonb_build_array(
      jsonb_build_object('type','external','org', v_dp.payer_org_id, 'amount', -NEW.amount_vnd),
      jsonb_build_object('type','external','org', v_dp.payee_org_id, 'amount',  NEW.amount_vnd),
      jsonb_build_object('type','seller_receivable','order', v_c_order, 'framework', v_c_fw, 'amount',  v_sign * NEW.amount_vnd),
      jsonb_build_object('type','buyer_payable',    'order', v_c_order, 'framework', v_c_fw, 'amount', -v_sign * NEW.amount_vnd)),
    NEW.confirmed_at, NULL, NULL, jsonb_build_object('dp_confirmation', NEW.id, 'framework', v_dp.framework_id));
  RETURN NEW;
END $$;
CREATE TRIGGER tg_dpc_ledger AFTER INSERT ON core.direct_payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION ledger.on_direct_payment_confirmation();

-- 4) Quyết toán → ghi nhận phần N tăng/giảm so với lần trước (quyền đòi người bán ↔ nghĩa vụ bên mua).
CREATE FUNCTION ledger.on_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_prev bigint; v_delta bigint; v_c_order uuid; v_c_fw uuid;
BEGIN
  SELECT n_vnd INTO v_prev FROM core.settlements
   WHERE order_id = NEW.order_id AND seq < NEW.seq ORDER BY seq DESC LIMIT 1;
  v_delta := NEW.n_vnd - coalesce(v_prev, 0);
  IF v_delta = 0 THEN RETURN NEW; END IF;
  SELECT o_order, o_framework INTO v_c_order, v_c_fw FROM ledger.claim_scope(NEW.order_id);
  PERFORM ledger.post('settlement_accrual', NEW.order_id, 'settle:' || NEW.id, 'Quyết toán lần ' || NEW.seq,
    jsonb_build_array(
      jsonb_build_object('type','seller_receivable','order', v_c_order, 'framework', v_c_fw, 'amount',  v_delta),
      jsonb_build_object('type','buyer_payable',    'order', v_c_order, 'framework', v_c_fw, 'amount', -v_delta)),
    NEW.computed_at, NULL, NULL, jsonb_build_object('settlement', NEW.id, 'framework', v_c_fw));
  RETURN NEW;
END $$;
CREATE TRIGGER tg_settlement_ledger AFTER INSERT ON core.settlements
  FOR EACH ROW EXECUTE FUNCTION ledger.on_settlement();

-- 5) Đơn kết thúc (hoàn tất / đóng): phí còn giữ không hoàn nữa → doanh thu (M12, BT-T10).
CREATE FUNCTION ledger.on_order_finished() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_bal bigint;
BEGIN
  IF NEW.status NOT IN ('completed','closed') OR OLD.status = NEW.status THEN RETURN NEW; END IF;
  SELECT b.balance_vnd INTO v_bal
    FROM ledger.accounts a JOIN ledger.account_balances b ON b.account_id = a.id
   WHERE a.account_type = 'fee_held' AND a.order_id = NEW.id;
  IF coalesce(v_bal, 0) > 0 THEN
    PERFORM ledger.post('fee_recognition', NEW.id, 'feerev:' || NEW.id, 'Phí đơn ' || NEW.code || ' không còn hoàn',
      jsonb_build_array(
        jsonb_build_object('type','fee_held','order', NEW.id, 'amount', -v_bal),
        jsonb_build_object('type','platform_revenue','amount', v_bal)));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_order_fee_recognition AFTER UPDATE OF status ON core.orders
  FOR EACH ROW EXECUTE FUNCTION ledger.on_order_finished();

-- 6) Ước tính chỉ hứa tối đa 80% (K21, CG-03): kiểm khi lượng vào ngăn giữ tạm / cam kết.
CREATE FUNCTION ledger.check_estimated_cap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_basis text; v_cap_bps int; v_lot_qty bigint; v_promised bigint;
BEGIN
  IF NEW.to_bucket NOT IN ('held','committed') THEN RETURN NEW; END IF;
  SELECT l.qty_basis INTO v_basis FROM core.lots l WHERE l.id = NEW.lot_id;
  IF v_basis <> 'estimated' THEN RETURN NEW; END IF;
  SELECT estimated_commit_cap_bps INTO v_cap_bps FROM core.policy_versions ORDER BY effective_from DESC LIMIT 1;
  SELECT -qty INTO v_lot_qty FROM ledger.qty_balances WHERE lot_id = NEW.lot_id AND bucket = 'source';
  SELECT coalesce(sum(qty), 0) INTO v_promised FROM ledger.qty_balances
   WHERE lot_id = NEW.lot_id AND bucket IN ('held','committed','in_transit','delivered');
  IF v_promised * 10000 > v_lot_qty * coalesce(v_cap_bps, 8000) THEN
    RAISE EXCEPTION 'Lô ước tính chỉ được hứa tối đa % phần vạn (% / %)', coalesce(v_cap_bps, 8000), v_promised, v_lot_qty
      USING HINT = 'ck_qty_estimated_cap';
  END IF;
  RETURN NEW;
END $$;
-- AFTER: số dư đã cập nhật (tg_qty_move_apply chạy trước vì tên xếp trước).
CREATE TRIGGER tg_qty_move_cap AFTER INSERT ON ledger.qty_movements
  FOR EACH ROW EXECUTE FUNCTION ledger.check_estimated_cap();
