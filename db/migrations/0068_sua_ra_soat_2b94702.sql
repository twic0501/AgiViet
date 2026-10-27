-- Sửa theo Codex rà commit 2b94702 (28/10/2026).
-- 1 Đọc hồ sơ đơn qua API bị 501: hàm đọc dùng ref.div_round (vai đọc không có quyền) → hàm đọc chạy quyền chủ DB;
--   kiểm quyền truy cập đơn do backend làm trước khi gọi.
-- 2 Gắn phân bổ sang đơn làm mất công nợ: phân bổ vẫn tính tới khi đơn hoàn tất; chỉ gắn đơn đã ký, đúng giá trị.
-- 3 Chi phí đổi lượng đã xác nhận tính vào công nợ, quá hạn thì chặn tăng nghĩa vụ.
-- 4 Bồi hoàn AgiViet: không vượt số đã duyệt; chứng từ trả tiền phải là chứng cứ của đơn.

-- ---------- 1 ----------
ALTER FUNCTION core.open_dossiers(uuid) SECURITY DEFINER SET search_path=pg_catalog,core,ledger,ops,ref;
CREATE FUNCTION core.unsecured_claims_of(p_order uuid) RETURNS TABLE(dispute_id uuid, claim_kind text, inspection_fee_vnd bigint, penalty_vnd bigint, security_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT dispute_id, claim_kind, inspection_fee_vnd::bigint, penalty_vnd::bigint, security_status FROM core.v_unsecured_claims WHERE order_id=p_order
$$;
COMMENT ON FUNCTION core.unsecured_claims_of(uuid) IS 'Khoản đòi thêm chưa bảo đảm của một đơn (đọc qua API; backend kiểm quyền đơn trước).';

-- ---------- 2 + 3 ----------
CREATE OR REPLACE FUNCTION core.pair_exposure(p_buyer uuid,p_seller uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 -- Khoản trả trực tiếp chưa nhận đủ, TRỪ các đơn đã gắn phân bổ (phân bổ đó tính ở dưới, tránh tính trùng).
 SELECT coalesce((SELECT sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0))
   FROM core.direct_payments p WHERE p.payer_org_id=p_buyer AND p.payee_org_id=p_seller AND p.direction='buyer_to_seller'
    AND p.status NOT IN ('fully_received','cancelled')
    AND NOT EXISTS(SELECT 1 FROM core.sourcing_allocations a WHERE a.order_id=p.order_id)),0)
 -- Phân bổ đã cam kết (phần giao được nếu thiếu) tính tới khi đơn gắn hoàn tất/đóng.
 + coalesce((SELECT sum(ref.div_round((CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)::numeric*a.unit_price_vnd_per_kg,1000))
   FROM core.sourcing_allocations a JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.sourcing_agreements g ON g.id=d.agreement_id
   LEFT JOIN core.orders o ON o.id=a.order_id
   WHERE g.buyer_org_id=p_buyer AND a.seller_org_id=p_seller AND a.status IN ('committed','shortfall')
    AND (a.order_id IS NULL OR o.status NOT IN ('completed','closed'))),0)
 -- Chi phí đổi lượng bên mua đã xác nhận phải trả.
 + coalesce((SELECT sum(amount_vnd) FROM core.sourcing_cost_claims WHERE buyer_org_id=p_buyer AND seller_org_id=p_seller AND status='phai_tra'),0)
$$;
CREATE OR REPLACE FUNCTION core.pair_has_overdue(p_buyer uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT EXISTS(SELECT 1 FROM core.direct_payments p WHERE p.payer_org_id=p_buyer AND p.payee_org_id=p_seller AND p.direction='buyer_to_seller'
  AND p.status NOT IN ('fully_received','cancelled') AND (p.status='overdue' OR (p.due_at IS NOT NULL AND p.due_at<ref.clock_at())))
 OR EXISTS(SELECT 1 FROM core.sourcing_cost_claims k WHERE k.buyer_org_id=p_buyer AND k.seller_org_id=p_seller AND k.status='phai_tra' AND k.due_at<ref.clock_at())
$$;
CREATE OR REPLACE FUNCTION cmd.link_allocation_order(p_alloc uuid,p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 SELECT * INTO o FROM core.orders WHERE id=p_order;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.status NOT IN ('committed','shortfall') OR a.order_id IS NOT NULL OR o.buyer_org_id<>g.buyer_org_id OR o.seller_org_id<>a.seller_org_id OR o.product_id<>g.product_id
  OR EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=p_order) THEN
  RAISE EXCEPTION 'Đơn không khớp phân bổ (bên mua, người bán, mặt hàng) hoặc đã gắn' USING HINT='ck_command_payload'; END IF;
 IF core.order_committed_at(o.id) IS NULL OR o.status IN ('drafting','internal_approval','awaiting_seller','closed') THEN
  RAISE EXCEPTION 'Chỉ gắn đơn đã ký đủ' USING HINT='ck_command_state'; END IF;
 IF v.contract_value_vnd<>ref.div_round((CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)::numeric*a.unit_price_vnd_per_kg,1000) THEN
  RAISE EXCEPTION 'Giá trị đơn khác phân bổ đã cam kết' USING HINT='ck_command_payload'; END IF;
 UPDATE core.sourcing_allocations SET order_id=p_order WHERE id=a.id;
END $$;

-- ---------- 4 ----------
CREATE OR REPLACE FUNCTION core.guard_platform_liability() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE q ops.decisions%ROWTYPE; BEGIN
 SELECT * INTO q FROM ops.decisions WHERE id=NEW.decision_id;
 IF q.id IS NULL OR q.proposed_by=q.approved_by OR q.kind<>'platform_liability' OR q.entity<>'order' OR q.entity_id<>NEW.order_id THEN
  RAISE EXCEPTION 'Cần quyết định hai người loại platform_liability cho đúng đơn' USING HINT='ck_decision_two_people'; END IF;
 IF (q.detail->>'amount_vnd') IS NULL OR NEW.amount_vnd>(q.detail->>'amount_vnd')::bigint THEN
  RAISE EXCEPTION 'Số bồi hoàn vượt số đã duyệt' USING HINT='ck_liability_amount'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION core.guard_platform_liability_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=NEW.paid_evidence_id AND doc_type='evidence' AND order_id=NEW.order_id) THEN
  RAISE EXCEPTION 'Chứng từ trả tiền phải là chứng cứ của đúng đơn' USING HINT='ck_pl_paid_evidence'; END IF;
 IF (NEW.amount_vnd,NEW.decision_id,NEW.order_id) IS DISTINCT FROM (OLD.amount_vnd,OLD.decision_id,OLD.order_id) THEN
  RAISE EXCEPTION 'Bồi hoàn bất biến; sửa bằng quyết định mới' USING HINT='ck_append_only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_platform_liability_paid BEFORE UPDATE ON core.platform_liabilities FOR EACH ROW EXECUTE FUNCTION core.guard_platform_liability_paid();
