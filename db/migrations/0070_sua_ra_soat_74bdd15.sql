-- Sửa theo Codex rà commit 74bdd15 (28/10/2026). Codex chốt: khớp đúng đợt giao; đồng bộ phân bổ khi phụ lục có hiệu lực;
-- ghi nhận sự cố thiếu hàng riêng; quyết định gắn đúng khoản và số tiền; đóng nghĩa vụ tiền bằng xác nhận đã kiểm chứng.

-- ---------- 1. Gắn đơn phải khớp lượng, giá, ngày giao (không chỉ tổng tiền) ----------
CREATE OR REPLACE FUNCTION cmd.link_allocation_order(p_alloc uuid,p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; dd date; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; qty bigint;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 SELECT delivery_date INTO dd FROM core.sourcing_days WHERE id=a.day_id;
 SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.status NOT IN ('committed','shortfall') OR a.order_id IS NOT NULL OR o.buyer_org_id<>g.buyer_org_id OR o.seller_org_id<>a.seller_org_id OR o.product_id<>g.product_id
  OR EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=p_order) THEN
  RAISE EXCEPTION 'Đơn không khớp phân bổ (bên mua, người bán, mặt hàng) hoặc đã gắn' USING HINT='ck_command_payload'; END IF;
 IF core.order_committed_at(o.id) IS NULL OR o.status IN ('drafting','internal_approval','awaiting_seller','closed','completed','outstanding','cancelled') THEN
  RAISE EXCEPTION 'Chỉ gắn đơn đã ký và còn đang chạy' USING HINT='ck_command_state'; END IF;
 IF o.created_at<a.seller_committed_at-interval '1 day' THEN
  RAISE EXCEPTION 'Đơn lập trước cam kết nguồn: không dùng đơn cũ' USING HINT='ck_command_state'; END IF;
 SELECT sum(l.qty) INTO qty FROM core.order_lines l WHERE l.order_id=o.id AND l.version_no=o.effective_version_no;
 IF v.price_unit_base_qty<>1000 OR qty IS DISTINCT FROM (CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)
  OR EXISTS(SELECT 1 FROM core.order_lines l WHERE l.order_id=o.id AND l.version_no=o.effective_version_no AND l.unit_price_vnd<>a.unit_price_vnd_per_kg)
  OR NOT (v.delivery_window && tstzrange((dd::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),((dd+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))) THEN
  RAISE EXCEPTION 'Đơn khác phân bổ về lượng, giá hoặc ngày giao' USING HINT='ck_command_payload'; END IF;
 UPDATE core.sourcing_allocations SET order_id=p_order WHERE id=a.id;
END $$;

-- ---------- 2. Phụ lục có hiệu lực → đồng bộ phân bổ; giao thiếu sau gắn đơn vẫn ghi được ----------
CREATE OR REPLACE FUNCTION core.guard_allocation_linked() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.order_id IS NOT NULL AND coalesce(current_setting('app.dong_bo_phu_luc',true),'')<>'on'
  AND NOT (NEW.status='shortfall' AND OLD.status='committed' AND NEW.qty_g=OLD.qty_g AND NEW.unit_price_vnd_per_kg=OLD.unit_price_vnd_per_kg)
  AND (NEW.qty_g IS DISTINCT FROM OLD.qty_g OR NEW.unit_price_vnd_per_kg IS DISTINCT FROM OLD.unit_price_vnd_per_kg OR NEW.status IS DISTINCT FROM OLD.status) THEN
  RAISE EXCEPTION 'Phân bổ đã gắn đơn: đổi lượng/hủy qua phụ lục hoặc hủy hợp đồng' USING HINT='ck_allocation_linked'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION core.guard_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF coalesce(current_setting('app.dong_bo_phu_luc',true),'')<>'on' AND OLD.status='committed'
    AND (NEW.qty_g IS DISTINCT FROM OLD.qty_g OR NEW.unit_price_vnd_per_kg IS DISTINCT FROM OLD.unit_price_vnd_per_kg OR NEW.status IN ('cancelled'))
    AND NOT EXISTS(SELECT 1 FROM core.allocation_changes WHERE allocation_id=OLD.id AND seller_consented_at IS NOT NULL AND new_qty_g=CASE WHEN NEW.status='cancelled' THEN 0 ELSE NEW.qty_g END)
    AND NEW.status<>'shortfall' THEN
  RAISE EXCEPTION 'Phân bổ đã cam kết chỉ đổi khi người bán đồng ý' USING HINT='ck_allocation_consent'; END IF;
 IF OLD.order_id IS NOT NULL AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN RAISE EXCEPTION 'Không đổi đơn đã gắn' USING HINT='ck_append_only'; END IF;
 RETURN NEW;
END $$;
-- Phiên bản hợp đồng có hiệu lực đổi (phụ lục đã ký/áp dụng, hoặc hủy) → phân bổ gắn đơn theo đúng hợp đồng.
CREATE FUNCTION core.sync_allocation_from_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE qty bigint; price bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM set_config('app.dong_bo_phu_luc','on',true);
 IF NEW.status='cancelled' THEN
  UPDATE core.sourcing_allocations SET status='cancelled' WHERE order_id=NEW.id AND status='committed';
 ELSIF NEW.effective_version_no IS DISTINCT FROM OLD.effective_version_no THEN
  SELECT sum(qty), max(unit_price_vnd) INTO qty, price FROM core.order_lines WHERE order_id=NEW.id AND version_no=NEW.effective_version_no;
  UPDATE core.sourcing_allocations SET qty_g=qty, unit_price_vnd_per_kg=price WHERE order_id=NEW.id AND qty IS NOT NULL;
 END IF;
 PERFORM set_config('app.dong_bo_phu_luc','',true);
 RETURN NEW;
END $$;
CREATE TRIGGER z_sync_allocation AFTER UPDATE OF effective_version_no,status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.sync_allocation_from_order();

-- ---------- 3. Kết luận tranh chấp chi phí: đúng loại quyết định, đúng khoản, đúng số ----------
CREATE OR REPLACE FUNCTION cmd.settle_sourcing_cost_dispute(p_claim uuid,p_decision uuid,p_amount bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$ DECLARE k core.sourcing_cost_claims%ROWTYPE; q ops.decisions%ROWTYPE; BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 SELECT * INTO k FROM core.sourcing_cost_claims WHERE id=p_claim FOR UPDATE; SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF k.status<>'tranh_chap' THEN RAISE EXCEPTION 'Khoản không ở tranh chấp' USING HINT='ck_command_state'; END IF;
 IF q.id IS NULL OR q.proposed_by=q.approved_by OR q.kind<>'sourcing_cost_dispute' OR q.entity<>'sourcing_cost_claim' OR q.entity_id<>k.id
  OR (q.detail->>'amount_vnd') IS NULL OR (q.detail->>'amount_vnd')::bigint<>p_amount OR p_amount<0 OR p_amount>k.amount_vnd THEN
  RAISE EXCEPTION 'Cần quyết định hai người loại sourcing_cost_dispute cho đúng khoản và đúng số' USING HINT='ck_decision_two_people'; END IF;
 IF p_amount=0 THEN UPDATE core.sourcing_cost_claims SET status='khong_phai_tra' WHERE id=k.id;
 ELSE UPDATE core.sourcing_cost_claims SET status='phai_tra',amount_vnd=p_amount,due_at=ref.clock_at()+interval '7 days' WHERE id=k.id; END IF;
END $$;
CREATE OR REPLACE FUNCTION cmd.propose_decision(p_kind text,p_entity text,p_id uuid,p_reason text,p_evidence uuid,p_detail jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$
DECLARE result uuid; oid uuid;
BEGIN
 PERFORM cmd.require_staff(CASE WHEN p_kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p_kind IN ('ledger_correction','manual_payment','platform_liability') THEN ARRAY['finance','supervisor'] ELSE ARRAY['risk','supervisor'] END);
 IF NOT ((p_kind='payment_reconciliation' AND p_entity='direct_payment') OR (p_kind='dispute_resolution' AND p_entity='dispute') OR (p_kind='force_majeure_reduction' AND p_entity='amendment') OR (p_kind='ledger_correction' AND p_entity='ledger_transaction') OR (p_kind='manual_payment' AND p_entity='order') OR (p_kind='policy_change' AND p_entity='policy_version') OR (p_kind='inspection_fee_allocation' AND p_entity='inspection') OR (p_kind='platform_liability' AND p_entity='order') OR (p_kind='sourcing_cost_dispute' AND p_entity='sourcing_cost_claim')) THEN RAISE EXCEPTION 'Sai loại quyết định' USING HINT='ck_command_payload'; END IF;
 IF p_entity='order' THEN oid:=p_id;
 ELSIF p_entity='ledger_transaction' THEN oid:=(p_detail->>'order_id')::uuid;
 ELSIF p_entity='direct_payment' THEN SELECT order_id INTO oid FROM core.direct_payments WHERE id=p_id;
 ELSIF p_entity='dispute' THEN SELECT order_id INTO oid FROM core.disputes WHERE id=p_id;
 ELSIF p_entity='amendment' THEN SELECT order_id INTO oid FROM core.amendments WHERE id=p_id;
 ELSIF p_entity='inspection' THEN SELECT d.order_id INTO oid FROM core.inspections i JOIN core.deliveries d ON d.id=i.delivery_id WHERE i.id=p_id;
 END IF;
 IF p_entity='sourcing_cost_claim' THEN
  IF NOT EXISTS(SELECT 1 FROM core.sourcing_cost_claims WHERE id=p_id AND evidence_document_id=p_evidence AND status='tranh_chap') THEN RAISE EXCEPTION 'Chứng cứ sai đối tượng' USING HINT='ck_command_evidence'; END IF;
 ELSIF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type IN ('evidence','inspection_report') AND (order_id=oid OR p_entity='policy_version')) THEN RAISE EXCEPTION 'Chứng cứ sai đối tượng' USING HINT='ck_command_evidence'; END IF;
 IF p_detail IS NULL OR jsonb_typeof(p_detail)<>'object' OR p_detail ? 'command_proposal_id' THEN RAISE EXCEPTION 'Sai detail' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.decision_proposals(kind,entity,entity_id,proposed_by,reason,evidence_document_id,detail) VALUES(p_kind,p_entity,p_id,ref.ctx_user(),p_reason,p_evidence,p_detail) RETURNING id INTO result; RETURN result;
END $$;

-- ---------- 4. Bồi hoàn: ghi đã trả chỉ qua lệnh xác minh của tài chính (người khác người đề xuất) ----------
ALTER TABLE core.platform_liabilities ADD COLUMN paid_verified_by uuid REFERENCES core.users;
COMMENT ON COLUMN core.platform_liabilities.paid_verified_by IS 'Nhân viên tài chính đối soát sao kê và xác minh đã trả (khác người đề xuất quyết định)';
CREATE OR REPLACE FUNCTION core.guard_platform_liability_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.amount_vnd,NEW.decision_id,NEW.order_id,NEW.payee_org_id,NEW.kind) IS DISTINCT FROM (OLD.amount_vnd,OLD.decision_id,OLD.order_id,OLD.payee_org_id,OLD.kind) THEN
  RAISE EXCEPTION 'Bồi hoàn bất biến; sửa bằng quyết định mới' USING HINT='ck_append_only'; END IF;
 IF OLD.paid_at IS NOT NULL AND (NEW.paid_at,NEW.paid_evidence_id,NEW.paid_verified_by) IS DISTINCT FROM (OLD.paid_at,OLD.paid_evidence_id,OLD.paid_verified_by) THEN
  RAISE EXCEPTION 'Đã ghi trả; không sửa' USING HINT='ck_append_only'; END IF;
 IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL AND (coalesce(current_setting('app.xac_minh_tien',true),'')<>'on' OR NEW.paid_verified_by IS NULL) THEN
  RAISE EXCEPTION 'Ghi đã trả chỉ qua lệnh xác minh tiền của tài chính' USING HINT='ck_pl_paid_evidence'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION cmd.verify_platform_liability_paid(p_liability uuid,p_bank_evidence uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$ DECLARE l core.platform_liabilities%ROWTYPE; q ops.decisions%ROWTYPE; BEGIN
 PERFORM cmd.require_staff(ARRAY['finance']);
 SELECT * INTO l FROM core.platform_liabilities WHERE id=p_liability FOR UPDATE; SELECT * INTO q FROM ops.decisions WHERE id=l.decision_id;
 IF l.id IS NULL OR l.paid_at IS NOT NULL THEN RAISE EXCEPTION 'Không có hoặc đã ghi trả' USING HINT='ck_command_state'; END IF;
 IF ref.ctx_user()=q.proposed_by THEN RAISE EXCEPTION 'Người xác minh phải khác người đề xuất' USING HINT='ck_decision_two_people'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_bank_evidence AND doc_type='evidence' AND order_id=l.order_id) THEN RAISE EXCEPTION 'Cần sao kê ngân hàng của đúng đơn' USING HINT='ck_command_evidence'; END IF;
 PERFORM set_config('app.xac_minh_tien','on',true);
 UPDATE core.platform_liabilities SET paid_at=ref.clock_at(),paid_evidence_id=p_bank_evidence,paid_verified_by=ref.ctx_user() WHERE id=l.id;
 PERFORM set_config('app.xac_minh_tien','',true);
END $$;
REVOKE ALL ON FUNCTION cmd.verify_platform_liability_paid(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.verify_platform_liability_paid(uuid,uuid),cmd.link_allocation_order(uuid,uuid),cmd.settle_sourcing_cost_dispute(uuid,uuid,bigint) TO agiviet_app;
