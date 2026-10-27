-- Sửa theo Codex rà commit e93e590 (28/10/2026). Nguyên tắc Codex chốt: C5 mọi lần tăng nghĩa vụ kiểm lại mức nợ/quá hạn;
-- C6 giao thiếu giữ phần giao được; C7 một phần hàng không hoàn hai lần; C8 dừng chặn cam kết mới, chi phí đổi lượng thành
-- khoản phải trả có xác nhận; C9 giữ hàng tại chỗ cần ủy quyền trong hợp đồng + hạn theo đơn, bồi hoàn đóng khi tiền xác minh.

-- ---------- 1. Phí kiểm định: phân bổ trước kết luận → luồng kết luận không thu lại ----------
CREATE FUNCTION core.guard_fee_charge_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.kind='inspection_fee' AND NEW.source_entity='inspection' AND EXISTS(SELECT 1 FROM core.inspection_fee_allocations WHERE inspection_id=NEW.source_id) THEN
  RETURN NULL; -- đã có phân bổ phí (hồ sơ hoàn riêng): không thu thêm qua quyết toán (C3 một phí thu một lần)
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_fee_charge_once BEFORE INSERT ON core.contract_charges FOR EACH ROW EXECUTE FUNCTION core.guard_fee_charge_once();

-- ---------- 2. Khiếu nại sau giao: cùng phần hàng không trừ quá giá trị (C7) ----------
CREATE FUNCTION core.post_delivery_claimed_qty(p_delivery uuid,p_line_no smallint) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT coalesce(sum(x.disputed_qty),0) FROM core.disputes x JOIN core.acceptance_lines l ON l.id=x.line_id JOIN core.acceptance_versions a ON a.id=l.acceptance_id
 WHERE x.post_delivery AND a.delivery_id=p_delivery AND l.line_no=p_line_no
  AND NOT EXISTS(SELECT 1 FROM core.dispute_resolutions r WHERE r.dispute_id=x.id AND r.result='passed')
$$;
CREATE FUNCTION core.guard_post_delivery_qty() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE l core.acceptance_lines%ROWTYPE; dlv uuid; BEGIN
 IF NEW.post_delivery THEN
  SELECT * INTO l FROM core.acceptance_lines WHERE id=NEW.line_id; SELECT delivery_id INTO dlv FROM core.acceptance_versions WHERE id=l.acceptance_id;
  IF core.post_delivery_claimed_qty(dlv,l.line_no)+NEW.disputed_qty>l.payable_qty THEN
   RAISE EXCEPTION 'Tổng lượng khiếu nại sau giao vượt lượng đã nhận của dòng' USING HINT='ck_claim_qty'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_post_delivery_qty BEFORE INSERT ON core.disputes FOR EACH ROW EXECUTE FUNCTION core.guard_post_delivery_qty();
-- Một tranh chấp chỉ sinh một khoản trừ (kết luận lại không trừ thêm).
CREATE UNIQUE INDEX ux_post_delivery_charge ON core.contract_charges(source_id) WHERE kind='post_delivery_claim' AND reverses_id IS NULL;
CREATE OR REPLACE FUNCTION core.charge_post_delivery_claim() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tc core.disputes%ROWTYPE; l core.acceptance_lines%ROWTYPE; amt bigint;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=NEW.dispute_id;
 IF tc.post_delivery AND NEW.result='failed' AND NOT EXISTS(SELECT 1 FROM core.contract_charges WHERE kind='post_delivery_claim' AND source_id=tc.id) THEN
  SELECT * INTO l FROM core.acceptance_lines WHERE id=tc.line_id;
  amt:=least(ref.div_round(tc.disputed_qty::numeric*l.unit_price_vnd,1000),l.value_vnd);
  IF amt>0 THEN
   INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
   VALUES(tc.order_id,'post_delivery_claim','seller',amt,jsonb_build_object('dispute_id',tc.id,'qty_g',tc.disputed_qty,'unit_price_vnd',l.unit_price_vnd),'dispute',tc.id,NEW.resolved_by);
  END IF;
 END IF;
 RETURN NEW;
END $$;

-- ---------- 3–6. Tìm nguồn định kỳ ----------
-- C6: phân bổ giao thiếu tính phần đã giao (delivered_qty_g) trong độ phủ và công nợ.
CREATE OR REPLACE FUNCTION core.pair_exposure(p_buyer uuid,p_seller uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT coalesce((SELECT sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0))
   FROM core.direct_payments p WHERE p.payer_org_id=p_buyer AND p.payee_org_id=p_seller AND p.direction='buyer_to_seller'
    AND p.status NOT IN ('fully_received','cancelled')),0)
 + coalesce((SELECT sum(ref.div_round((CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)::numeric*a.unit_price_vnd_per_kg,1000)) FROM core.sourcing_allocations a
   JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.sourcing_agreements g ON g.id=d.agreement_id
   WHERE g.buyer_org_id=p_buyer AND a.seller_org_id=p_seller AND a.status IN ('committed','shortfall') AND a.order_id IS NULL),0)
$$;
CREATE OR REPLACE VIEW core.v_sourcing_coverage AS
 SELECT d.id AS day_id, g.id AS agreement_id, g.code, d.delivery_date, d.cutoff_at, d.confirmed_qty_g,
  coalesce(sum(CASE a.status WHEN 'committed' THEN a.qty_g WHEN 'shortfall' THEN a.delivered_qty_g END),0) AS committed_qty_g,
  greatest(0,d.confirmed_qty_g-coalesce(sum(CASE a.status WHEN 'committed' THEN a.qty_g WHEN 'shortfall' THEN a.delivered_qty_g END),0)) AS missing_qty_g,
  coalesce(sum(a.qty_g) FILTER (WHERE a.status IN ('proposed','buyer_approved')),0) AS pending_qty_g
 FROM core.sourcing_days d JOIN core.sourcing_agreements g ON g.id=d.agreement_id
 LEFT JOIN core.sourcing_allocations a ON a.day_id=d.id GROUP BY d.id,g.id;

-- C5 + C8: kiểm chung cho mọi lần tăng nghĩa vụ.
CREATE FUNCTION core.check_commit_capacity(p_alloc uuid,p_added_vnd bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; t core.seller_credit_terms%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 IF g.status<>'active' THEN RAISE EXCEPTION 'Thỏa thuận đã dừng: không nhận cam kết mới hay tăng cam kết' USING HINT='ck_sourcing_stopped'; END IF;
 IF core.pair_has_overdue(g.buyer_org_id,a.seller_org_id) THEN RAISE EXCEPTION 'Bên mua đang có khoản quá hạn với người bán này' USING HINT='ck_credit_overdue'; END IF;
 SELECT * INTO t FROM core.seller_credit_terms WHERE buyer_org_id=g.buyer_org_id AND seller_org_id=a.seller_org_id;
 IF coalesce(t.pay_after_days,0)>0 AND core.pair_exposure(g.buyer_org_id,a.seller_org_id)+p_added_vnd>coalesce(t.credit_limit_vnd,0) THEN
  RAISE EXCEPTION 'Vượt mức cho nợ người bán đã đặt' USING HINT='ck_credit_limit'; END IF;
END $$;
CREATE OR REPLACE FUNCTION cmd.commit_allocation(p_alloc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 PERFORM cmd.require_org(a.seller_org_id,ARRAY['owner']);
 IF NOT (a.status='buyer_approved' OR (a.status='proposed' AND g.sourcing_mode='trong_pham_vi' AND a.unit_price_vnd_per_kg<=g.max_price_vnd_per_kg)) THEN
  RAISE EXCEPTION 'Chưa được bên mua duyệt hoặc vượt phạm vi ủy quyền' USING HINT='ck_sourcing_scope'; END IF;
 PERFORM core.check_commit_capacity(a.id,ref.div_round(a.qty_g::numeric*a.unit_price_vnd_per_kg,1000));
 UPDATE core.sourcing_allocations SET status='committed',seller_committed_by=ref.ctx_user(),seller_committed_at=ref.clock_at() WHERE id=a.id;
END $$;
CREATE OR REPLACE FUNCTION cmd.propose_allocation(p_day uuid,p_seller uuid,p_qty bigint,p_price bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE result uuid; BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 IF p_qty IS NULL OR p_qty<=0 OR p_price IS NULL OR p_price<=0 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_seller AND can_sell)
  OR NOT EXISTS(SELECT 1 FROM core.sourcing_days d JOIN core.sourcing_agreements g ON g.id=d.agreement_id WHERE d.id=p_day AND g.status='active') THEN
  RAISE EXCEPTION 'Sai phương án hoặc thỏa thuận đã dừng' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.sourcing_allocations(day_id,seller_org_id,qty_g,unit_price_vnd_per_kg,proposed_by) VALUES(p_day,p_seller,p_qty,p_price,ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;

-- C8: chi phí đổi lượng thành khoản phải trả có xác nhận của bên mua.
CREATE TABLE core.sourcing_cost_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), change_id uuid NOT NULL UNIQUE REFERENCES core.allocation_changes,
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, seller_org_id uuid NOT NULL REFERENCES core.organizations,
 amount_vnd bigint NOT NULL CHECK(amount_vnd>0), evidence_document_id uuid NOT NULL REFERENCES core.documents,
 status text NOT NULL DEFAULT 'cho_ben_mua_xac_nhan' CHECK(status IN ('cho_ben_mua_xac_nhan','phai_tra','tranh_chap','da_tra')),
 buyer_answered_by uuid REFERENCES core.users, buyer_answered_at timestamptz, due_at timestamptz, paid_evidence_id uuid REFERENCES core.documents,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'da_tra' OR paid_evidence_id IS NOT NULL)
);
ALTER TABLE core.sourcing_cost_claims ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.sourcing_cost_claims IS 'C8: chi phí người bán phát sinh khi bên mua đổi lượng sau hạn chốt: bên mua xác nhận → khoản phải trả có hạn; không đồng ý → tranh chấp; đã trả cần chứng từ.';
COMMENT ON COLUMN core.sourcing_cost_claims.id IS 'Mã';
COMMENT ON COLUMN core.sourcing_cost_claims.change_id IS 'Yêu cầu đổi lượng';
COMMENT ON COLUMN core.sourcing_cost_claims.buyer_org_id IS 'Bên mua';
COMMENT ON COLUMN core.sourcing_cost_claims.seller_org_id IS 'Người bán';
COMMENT ON COLUMN core.sourcing_cost_claims.amount_vnd IS 'Số tiền người bán báo';
COMMENT ON COLUMN core.sourcing_cost_claims.evidence_document_id IS 'Chứng cứ chi phí';
COMMENT ON COLUMN core.sourcing_cost_claims.status IS 'cho_ben_mua_xac_nhan / phai_tra / tranh_chap / da_tra';
COMMENT ON COLUMN core.sourcing_cost_claims.buyer_answered_by IS 'Bên mua trả lời';
COMMENT ON COLUMN core.sourcing_cost_claims.buyer_answered_at IS 'Lúc trả lời';
COMMENT ON COLUMN core.sourcing_cost_claims.due_at IS 'Hạn trả (7 ngày sau xác nhận)';
COMMENT ON COLUMN core.sourcing_cost_claims.paid_evidence_id IS 'Chứng từ đã trả';
COMMENT ON COLUMN core.sourcing_cost_claims.created_at IS 'Lúc ghi';
CREATE OR REPLACE FUNCTION cmd.answer_allocation_change(p_change uuid,p_agree boolean,p_cost bigint DEFAULT 0,p_evidence uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE c core.allocation_changes%ROWTYPE; a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO c FROM core.allocation_changes WHERE id=p_change FOR UPDATE; SELECT * INTO a FROM core.sourcing_allocations WHERE id=c.allocation_id FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 PERFORM cmd.require_org(a.seller_org_id,ARRAY['owner']);
 IF c.seller_consented_at IS NOT NULL OR c.rejected_at IS NOT NULL THEN RAISE EXCEPTION 'Đã trả lời' USING HINT='ck_command_state'; END IF;
 IF coalesce(p_cost,0)>0 AND p_evidence IS NULL THEN RAISE EXCEPTION 'Chi phí phải có chứng cứ' USING HINT='ck_command_evidence'; END IF;
 IF p_agree THEN
  IF c.new_qty_g>a.qty_g THEN -- C5: tăng nghĩa vụ → kiểm lại
   PERFORM core.check_commit_capacity(a.id,ref.div_round((c.new_qty_g-a.qty_g)::numeric*a.unit_price_vnd_per_kg,1000)); END IF;
  UPDATE core.allocation_changes SET seller_consented_by=ref.ctx_user(),seller_consented_at=ref.clock_at(),seller_cost_vnd=coalesce(p_cost,0),cost_evidence_id=p_evidence WHERE id=c.id;
  UPDATE core.sourcing_allocations SET qty_g=c.new_qty_g WHERE id=a.id AND c.new_qty_g>0;
  UPDATE core.sourcing_allocations SET status='cancelled' WHERE id=a.id AND c.new_qty_g=0;
  IF coalesce(p_cost,0)>0 THEN
   INSERT INTO core.sourcing_cost_claims(change_id,buyer_org_id,seller_org_id,amount_vnd,evidence_document_id) VALUES(c.id,g.buyer_org_id,a.seller_org_id,p_cost,p_evidence);
  END IF;
 ELSE UPDATE core.allocation_changes SET rejected_at=ref.clock_at() WHERE id=c.id; END IF;
END $$;
CREATE FUNCTION cmd.answer_sourcing_cost(p_claim uuid,p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE k core.sourcing_cost_claims%ROWTYPE; BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO k FROM core.sourcing_cost_claims WHERE id=p_claim FOR UPDATE;
 PERFORM cmd.require_org(k.buyer_org_id,ARRAY['owner','purchaser','accountant']);
 IF k.status<>'cho_ben_mua_xac_nhan' THEN RAISE EXCEPTION 'Đã trả lời' USING HINT='ck_command_state'; END IF;
 UPDATE core.sourcing_cost_claims SET status=CASE WHEN p_accept THEN 'phai_tra' ELSE 'tranh_chap' END,buyer_answered_by=ref.ctx_user(),buyer_answered_at=ref.clock_at(),
  due_at=CASE WHEN p_accept THEN ref.clock_at()+interval '7 days' END WHERE id=k.id;
END $$;
REVOKE ALL ON FUNCTION cmd.answer_sourcing_cost(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.answer_sourcing_cost(uuid,boolean) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.answer_allocation_change(uuid,boolean,bigint,uuid),cmd.commit_allocation(uuid),cmd.propose_allocation(uuid,uuid,bigint,bigint) TO agiviet_app;

-- C9 (C9 Codex): nối phân bổ sang đơn của đúng cặp/mặt hàng.
CREATE FUNCTION cmd.link_allocation_order(p_alloc uuid,p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 SELECT * INTO o FROM core.orders WHERE id=p_order;
 IF a.status NOT IN ('committed','shortfall') OR a.order_id IS NOT NULL OR o.buyer_org_id<>g.buyer_org_id OR o.seller_org_id<>a.seller_org_id OR o.product_id<>g.product_id
  OR EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=p_order) THEN
  RAISE EXCEPTION 'Đơn không khớp phân bổ (bên mua, người bán, mặt hàng) hoặc đã gắn' USING HINT='ck_command_payload'; END IF;
 UPDATE core.sourcing_allocations SET order_id=p_order WHERE id=a.id;
END $$;
REVOKE ALL ON FUNCTION cmd.link_allocation_order(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.link_allocation_order(uuid,uuid) TO agiviet_app;
CREATE OR REPLACE FUNCTION core.guard_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status='committed' AND (NEW.qty_g IS DISTINCT FROM OLD.qty_g OR NEW.unit_price_vnd_per_kg IS DISTINCT FROM OLD.unit_price_vnd_per_kg OR NEW.status IN ('cancelled'))
    AND NOT EXISTS(SELECT 1 FROM core.allocation_changes WHERE allocation_id=OLD.id AND seller_consented_at IS NOT NULL AND new_qty_g=CASE WHEN NEW.status='cancelled' THEN 0 ELSE NEW.qty_g END)
    AND NEW.status<>'shortfall' THEN
  RAISE EXCEPTION 'Phân bổ đã cam kết chỉ đổi khi người bán đồng ý' USING HINT='ck_allocation_consent'; END IF;
 IF OLD.order_id IS NOT NULL AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN RAISE EXCEPTION 'Không đổi đơn đã gắn' USING HINT='ck_append_only'; END IF;
 RETURN NEW;
END $$;

-- ---------- 7. Giữ hàng tại chỗ: ủy quyền trong hợp đồng + hạn theo đơn (C9) ----------
CREATE OR REPLACE FUNCTION cmd.start_hold_in_place(p_order uuid,p_checker uuid,p_default_plan text,p_max_cost bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE lim core.product_hold_limits%ROWTYPE; v core.order_versions%ROWTYPE; first_at timestamptz; result uuid; plan text; cap bigint;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor','support']);
 SELECT l.* INTO lim FROM core.orders o JOIN core.product_hold_limits l ON l.product_id=o.product_id WHERE o.id=p_order;
 IF lim.product_id IS NULL THEN RAISE EXCEPTION 'Mặt hàng không giữ được tại chỗ' USING HINT='ck_hold_not_allowed'; END IF;
 SELECT v2.* INTO v FROM core.orders o JOIN core.order_versions v2 ON v2.order_id=o.id AND v2.version_no=o.effective_version_no WHERE o.id=p_order;
 plan:=v.extra_terms->>'hold_default_plan'; cap:=(v.extra_terms->>'hold_max_cost_vnd')::bigint;
 IF plan IS NULL OR cap IS NULL THEN RAISE EXCEPTION 'Hợp đồng chưa ủy quyền phương án giữ tại chỗ và mức chi' USING HINT='ck_hold_not_authorized'; END IF;
 SELECT min(started_at) INTO first_at FROM core.hold_in_place WHERE order_id=p_order;
 first_at:=coalesce(first_at,ref.clock_at());
 IF ref.clock_at()>=first_at+make_interval(hours=>lim.max_hold_hours) THEN RAISE EXCEPTION 'Đã hết thời gian giữ tối đa của đơn' USING HINT='ck_hold_cap'; END IF;
 INSERT INTO core.hold_in_place(order_id,started_at,max_until,decide_by,checker_user_id,default_plan,max_cost_vnd)
 VALUES(p_order,ref.clock_at(),first_at+make_interval(hours=>lim.max_hold_hours),least(first_at+make_interval(hours=>lim.max_hold_hours-lim.decide_before_hours),first_at+make_interval(hours=>lim.max_hold_hours)),p_checker,plan,cap)
 RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION core.guard_hold_in_place_cap() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE lim integer; first_at timestamptz; BEGIN
 SELECT l.max_hold_hours INTO lim FROM core.orders o JOIN core.product_hold_limits l ON l.product_id=o.product_id WHERE o.id=NEW.order_id;
 SELECT min(started_at) INTO first_at FROM core.hold_in_place WHERE order_id=NEW.order_id;
 IF lim IS NOT NULL AND first_at IS NOT NULL AND NEW.max_until>first_at+make_interval(hours=>lim) THEN
  RAISE EXCEPTION 'Giữ tại chỗ vượt hạn tối đa tính từ lần đầu của đơn' USING HINT='ck_hold_cap'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_hold_cap BEFORE INSERT ON core.hold_in_place FOR EACH ROW EXECUTE FUNCTION core.guard_hold_in_place_cap();

-- ---------- 8. Bồi hoàn AgiViet: quyết định đúng loại; đóng khi tiền xác minh ----------
ALTER TABLE core.platform_liabilities ADD COLUMN paid_evidence_id uuid REFERENCES core.documents;
COMMENT ON COLUMN core.platform_liabilities.paid_evidence_id IS 'Chứng từ ngân hàng đã trả (bắt buộc khi đặt paid_at)';
ALTER TABLE core.platform_liabilities ADD CONSTRAINT ck_pl_paid_evidence CHECK(paid_at IS NULL OR paid_evidence_id IS NOT NULL);
CREATE OR REPLACE FUNCTION core.guard_platform_liability() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE q ops.decisions%ROWTYPE; BEGIN
 SELECT * INTO q FROM ops.decisions WHERE id=NEW.decision_id;
 IF q.id IS NULL OR q.proposed_by=q.approved_by OR q.kind<>'platform_liability' OR q.entity<>'order' OR q.entity_id<>NEW.order_id THEN
  RAISE EXCEPTION 'Cần quyết định hai người loại platform_liability cho đúng đơn' USING HINT='ck_decision_two_people'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION cmd.propose_decision(p_kind text,p_entity text,p_id uuid,p_reason text,p_evidence uuid,p_detail jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$
DECLARE result uuid; oid uuid;
BEGIN
 PERFORM cmd.require_staff(CASE WHEN p_kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p_kind IN ('ledger_correction','manual_payment','platform_liability') THEN ARRAY['finance','supervisor'] ELSE ARRAY['risk','supervisor'] END);
 IF NOT ((p_kind='payment_reconciliation' AND p_entity='direct_payment') OR (p_kind='dispute_resolution' AND p_entity='dispute') OR (p_kind='force_majeure_reduction' AND p_entity='amendment') OR (p_kind='ledger_correction' AND p_entity='ledger_transaction') OR (p_kind='manual_payment' AND p_entity='order') OR (p_kind='policy_change' AND p_entity='policy_version') OR (p_kind='inspection_fee_allocation' AND p_entity='inspection') OR (p_kind='platform_liability' AND p_entity='order')) THEN RAISE EXCEPTION 'Sai loại quyết định' USING HINT='ck_command_payload'; END IF;
 IF p_entity='order' THEN oid:=p_id;
 ELSIF p_entity='ledger_transaction' THEN oid:=(p_detail->>'order_id')::uuid;
 ELSIF p_entity='direct_payment' THEN SELECT order_id INTO oid FROM core.direct_payments WHERE id=p_id;
 ELSIF p_entity='dispute' THEN SELECT order_id INTO oid FROM core.disputes WHERE id=p_id;
 ELSIF p_entity='amendment' THEN SELECT order_id INTO oid FROM core.amendments WHERE id=p_id;
 ELSIF p_entity='inspection' THEN SELECT d.order_id INTO oid FROM core.inspections i JOIN core.deliveries d ON d.id=i.delivery_id WHERE i.id=p_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type IN ('evidence','inspection_report') AND (order_id=oid OR p_entity='policy_version')) THEN RAISE EXCEPTION 'Chứng cứ sai đối tượng' USING HINT='ck_command_evidence'; END IF;
 IF p_detail IS NULL OR jsonb_typeof(p_detail)<>'object' OR p_detail ? 'command_proposal_id' THEN RAISE EXCEPTION 'Sai detail' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.decision_proposals(kind,entity,entity_id,proposed_by,reason,evidence_document_id,detail) VALUES(p_kind,p_entity,p_id,ref.ctx_user(),p_reason,p_evidence,p_detail) RETURNING id INTO result; RETURN result;
END $$;

-- ---------- 9. Ghi công qua việc: chi phí đơn lấy order_id của việc ----------
CREATE OR REPLACE VIEW ops.v_service_cost AS
 SELECT o.id AS order_id, o.code,
  coalesce(sum(ref.div_round(w.minutes::numeric*w.cost_per_hour_vnd,60)) FILTER (WHERE NOT w.shared),0) AS direct_labor_vnd,
  coalesce(sum(w.outside_cost_vnd) FILTER (WHERE NOT w.subsidized),0) AS outside_cost_vnd,
  coalesce((SELECT sum(amount_vnd) FROM core.platform_liabilities p WHERE p.order_id=o.id),0) AS platform_liability_vnd,
  coalesce(v.fee_vnd,0) AS fee_vnd
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no
 LEFT JOIN (SELECT w2.*, coalesce(w2.order_id,t.order_id) AS for_order FROM ops.work_logs w2 LEFT JOIN ops.tasks t ON t.id=w2.task_id) w ON w.for_order=o.id
 GROUP BY o.id,v.fee_vnd;
