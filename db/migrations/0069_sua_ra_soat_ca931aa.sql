-- Sửa theo Codex rà commit ca931aa (28/10/2026). Codex chốt: phân bổ đã gắn đơn chỉ đổi qua phụ lục/hủy hợp đồng;
-- một quyết định bồi hoàn tạo một nghĩa vụ; người nhận khớp quyết định; chỉ đóng khoản tiền sau xác minh.

-- ---------- 1. Không gắn vào đơn đã kết thúc ----------
CREATE OR REPLACE FUNCTION cmd.link_allocation_order(p_alloc uuid,p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.status NOT IN ('committed','shortfall') OR a.order_id IS NOT NULL OR o.buyer_org_id<>g.buyer_org_id OR o.seller_org_id<>a.seller_org_id OR o.product_id<>g.product_id
  OR EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=p_order) THEN
  RAISE EXCEPTION 'Đơn không khớp phân bổ (bên mua, người bán, mặt hàng) hoặc đã gắn' USING HINT='ck_command_payload'; END IF;
 IF core.order_committed_at(o.id) IS NULL OR o.status IN ('drafting','internal_approval','awaiting_seller','closed','completed','outstanding','cancelled') THEN
  RAISE EXCEPTION 'Chỉ gắn đơn đã ký và còn đang chạy' USING HINT='ck_command_state'; END IF;
 IF o.created_at<a.seller_committed_at-interval '1 day' THEN
  RAISE EXCEPTION 'Đơn lập trước cam kết nguồn: không dùng đơn cũ' USING HINT='ck_command_state'; END IF;
 IF v.contract_value_vnd<>ref.div_round((CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)::numeric*a.unit_price_vnd_per_kg,1000) THEN
  RAISE EXCEPTION 'Giá trị đơn khác phân bổ đã cam kết' USING HINT='ck_command_payload'; END IF;
 UPDATE core.sourcing_allocations SET order_id=p_order WHERE id=a.id;
END $$;

-- ---------- 2. Phân bổ đã gắn đơn: chỉ đổi qua phụ lục/hủy hợp đồng ----------
CREATE FUNCTION core.guard_allocation_linked() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.order_id IS NOT NULL AND (NEW.qty_g IS DISTINCT FROM OLD.qty_g OR NEW.unit_price_vnd_per_kg IS DISTINCT FROM OLD.unit_price_vnd_per_kg OR NEW.status IS DISTINCT FROM OLD.status) THEN
  RAISE EXCEPTION 'Phân bổ đã gắn đơn: đổi lượng/hủy qua phụ lục hoặc hủy hợp đồng' USING HINT='ck_allocation_linked'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_allocation_linked BEFORE UPDATE ON core.sourcing_allocations FOR EACH ROW EXECUTE FUNCTION core.guard_allocation_linked();
CREATE FUNCTION core.guard_change_linked() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE id=NEW.allocation_id AND order_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Phân bổ đã gắn đơn: đổi lượng qua phụ lục hợp đồng' USING HINT='ck_allocation_linked'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_change_linked BEFORE INSERT ON core.allocation_changes FOR EACH ROW EXECUTE FUNCTION core.guard_change_linked();

-- ---------- 3 + 4. Bồi hoàn: một quyết định một nghĩa vụ; người nhận khớp; tạo chưa trả ----------
CREATE UNIQUE INDEX ux_platform_liability_decision ON core.platform_liabilities(decision_id);
CREATE OR REPLACE FUNCTION core.guard_platform_liability() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE q ops.decisions%ROWTYPE; BEGIN
 SELECT * INTO q FROM ops.decisions WHERE id=NEW.decision_id;
 IF q.id IS NULL OR q.proposed_by=q.approved_by OR q.kind<>'platform_liability' OR q.entity<>'order' OR q.entity_id<>NEW.order_id THEN
  RAISE EXCEPTION 'Cần quyết định hai người loại platform_liability cho đúng đơn' USING HINT='ck_decision_two_people'; END IF;
 IF (q.detail->>'amount_vnd') IS NULL OR NEW.amount_vnd>(q.detail->>'amount_vnd')::bigint THEN
  RAISE EXCEPTION 'Số bồi hoàn vượt số đã duyệt' USING HINT='ck_liability_amount'; END IF;
 IF (q.detail->>'payee_org_id') IS NULL OR NEW.payee_org_id<>(q.detail->>'payee_org_id')::uuid THEN
  RAISE EXCEPTION 'Bên nhận khác quyết định' USING HINT='ck_liability_payee'; END IF;
 IF NEW.paid_at IS NOT NULL OR NEW.paid_evidence_id IS NOT NULL THEN
  RAISE EXCEPTION 'Tạo bồi hoàn ở trạng thái chưa trả; ghi đã trả sau xác minh' USING HINT='ck_pl_paid_evidence'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION core.guard_platform_liability_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.amount_vnd,NEW.decision_id,NEW.order_id,NEW.payee_org_id,NEW.kind) IS DISTINCT FROM (OLD.amount_vnd,OLD.decision_id,OLD.order_id,OLD.payee_org_id,OLD.kind) THEN
  RAISE EXCEPTION 'Bồi hoàn bất biến; sửa bằng quyết định mới' USING HINT='ck_append_only'; END IF;
 IF OLD.paid_at IS NOT NULL AND (NEW.paid_at,NEW.paid_evidence_id) IS DISTINCT FROM (OLD.paid_at,OLD.paid_evidence_id) THEN
  RAISE EXCEPTION 'Đã ghi trả; không sửa' USING HINT='ck_append_only'; END IF;
 IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=NEW.paid_evidence_id AND doc_type='evidence' AND order_id=NEW.order_id) THEN
  RAISE EXCEPTION 'Chứng từ trả tiền phải là chứng cứ của đúng đơn' USING HINT='ck_pl_paid_evidence'; END IF;
 RETURN NEW;
END $$;

-- ---------- 5. Chi phí đổi lượng: đi hết vòng đời ----------
CREATE FUNCTION cmd.confirm_sourcing_cost_paid(p_claim uuid,p_evidence uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE k core.sourcing_cost_claims%ROWTYPE; BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO k FROM core.sourcing_cost_claims WHERE id=p_claim FOR UPDATE;
 PERFORM cmd.require_org(k.seller_org_id,ARRAY['owner','accountant']); -- người nhận tiền xác nhận đã nhận
 IF k.status<>'phai_tra' THEN RAISE EXCEPTION 'Khoản chưa ở trạng thái phải trả' USING HINT='ck_command_state'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type='evidence') THEN RAISE EXCEPTION 'Cần chứng từ' USING HINT='ck_command_evidence'; END IF;
 UPDATE core.sourcing_cost_claims SET status='da_tra',paid_evidence_id=p_evidence WHERE id=k.id;
END $$;
CREATE FUNCTION cmd.settle_sourcing_cost_dispute(p_claim uuid,p_decision uuid,p_amount bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$ DECLARE k core.sourcing_cost_claims%ROWTYPE; q ops.decisions%ROWTYPE; BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']);
 SELECT * INTO k FROM core.sourcing_cost_claims WHERE id=p_claim FOR UPDATE; SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF k.status<>'tranh_chap' THEN RAISE EXCEPTION 'Khoản không ở tranh chấp' USING HINT='ck_command_state'; END IF;
 IF q.id IS NULL OR q.proposed_by=q.approved_by OR p_amount IS NULL OR p_amount<0 OR p_amount>k.amount_vnd THEN
  RAISE EXCEPTION 'Cần quyết định hai người và số trong mức người bán báo' USING HINT='ck_decision_two_people'; END IF;
 IF p_amount=0 THEN UPDATE core.sourcing_cost_claims SET status='khong_phai_tra' WHERE id=k.id;
 ELSE UPDATE core.sourcing_cost_claims SET status='phai_tra',amount_vnd=p_amount,due_at=ref.clock_at()+interval '7 days' WHERE id=k.id; END IF;
END $$;
ALTER TABLE core.sourcing_cost_claims DROP CONSTRAINT sourcing_cost_claims_status_check;
ALTER TABLE core.sourcing_cost_claims ADD CONSTRAINT sourcing_cost_claims_status_check CHECK(status IN ('cho_ben_mua_xac_nhan','phai_tra','tranh_chap','da_tra','khong_phai_tra'));
COMMENT ON COLUMN core.sourcing_cost_claims.status IS 'cho_ben_mua_xac_nhan / phai_tra / tranh_chap / da_tra / khong_phai_tra (kết luận tranh chấp)';
REVOKE ALL ON FUNCTION cmd.confirm_sourcing_cost_paid(uuid,uuid),cmd.settle_sourcing_cost_dispute(uuid,uuid,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.confirm_sourcing_cost_paid(uuid,uuid),cmd.settle_sourcing_cost_dispute(uuid,uuid,bigint),cmd.link_allocation_order(uuid,uuid) TO agiviet_app;
CREATE FUNCTION core.sourcing_cost_claims_of(p_org uuid) RETURNS SETOF core.sourcing_cost_claims LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT * FROM core.sourcing_cost_claims WHERE p_org IN (buyer_org_id,seller_org_id) ORDER BY created_at DESC
$$;
COMMENT ON FUNCTION core.sourcing_cost_claims_of(uuid) IS 'Danh sách khoản chi phí đổi lượng của một tổ chức (bên mua hoặc người bán); backend truyền tổ chức đang thao tác.';
