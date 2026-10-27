-- Bản 23 · hoàn thiện giao ngay (C1, C2, C4, C5, C6 trong docs/anh-xa-db/01-anh-xa-v23.md). C3 đã làm ở 0058–0060.

-- ---------- C1: "Đã quyết toán mua bán · còn hồ sơ mở", hồ sơ có người phụ trách và hạn ----------
UPDATE ref.statuses SET label_vi='Đã quyết toán mua bán · còn hồ sơ mở' WHERE entity='order' AND code='outstanding';
CREATE TABLE ops.dossier_owners (
 order_id uuid NOT NULL REFERENCES core.orders, kind text NOT NULL, ref_id uuid NOT NULL,
 owner_user_id uuid NOT NULL REFERENCES core.users, due_at timestamptz NOT NULL,
 assigned_by uuid NOT NULL REFERENCES core.users, assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(order_id,kind,ref_id)
);
ALTER TABLE ops.dossier_owners ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE ops.dossier_owners IS 'Người phụ trách và hạn của từng hồ sơ còn mở (bản 23: hồ sơ mở phải có người phụ trách, có hạn).';
COMMENT ON COLUMN ops.dossier_owners.order_id IS 'Đơn';
COMMENT ON COLUMN ops.dossier_owners.kind IS 'Loại hồ sơ (như core.open_dossiers.kind)';
COMMENT ON COLUMN ops.dossier_owners.ref_id IS 'Đối tượng của hồ sơ';
COMMENT ON COLUMN ops.dossier_owners.owner_user_id IS 'Người phụ trách';
COMMENT ON COLUMN ops.dossier_owners.due_at IS 'Hạn xử lý';
COMMENT ON COLUMN ops.dossier_owners.assigned_by IS 'Người giao';
COMMENT ON COLUMN ops.dossier_owners.assigned_at IS 'Lúc giao';

-- ---------- C2: hồ sơ phí kiểm định đủ số ----------
CREATE TABLE core.inspection_fee_allocations (
 inspection_id uuid PRIMARY KEY REFERENCES core.inspections,
 buyer_vnd bigint NOT NULL CHECK(buyer_vnd>=0), seller_vnd bigint NOT NULL CHECK(seller_vnd>=0),
 partner_vnd bigint NOT NULL CHECK(partner_vnd>=0), platform_vnd bigint NOT NULL CHECK(platform_vnd>=0),
 pending_vnd bigint NOT NULL CHECK(pending_vnd>=0),
 decision_id uuid NOT NULL REFERENCES ops.decisions, reimburse_payment_id uuid REFERENCES core.direct_payments,
 third_party_settled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.inspection_fee_allocations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.inspection_fee_allocations IS 'Phân bổ phí kiểm định: tổng các phần chịu = phí. Phần chưa rõ lỗi để pending (hồ sơ còn mở). Quyết định hai người.';
COMMENT ON COLUMN core.inspection_fee_allocations.inspection_id IS 'Lần kiểm định';
COMMENT ON COLUMN core.inspection_fee_allocations.buyer_vnd IS 'Phần bên mua chịu cuối cùng';
COMMENT ON COLUMN core.inspection_fee_allocations.seller_vnd IS 'Phần người bán chịu cuối cùng';
COMMENT ON COLUMN core.inspection_fee_allocations.partner_vnd IS 'Phần đối tác dịch vụ chịu (vd làm mất niêm)';
COMMENT ON COLUMN core.inspection_fee_allocations.platform_vnd IS 'Phần AgiViet chịu (lỗi của AgiViet)';
COMMENT ON COLUMN core.inspection_fee_allocations.pending_vnd IS 'Phần chưa xác định được bên chịu (chờ xử lý)';
COMMENT ON COLUMN core.inspection_fee_allocations.decision_id IS 'Quyết định hai người';
COMMENT ON COLUMN core.inspection_fee_allocations.reimburse_payment_id IS 'Khoản hoàn giữa hai bên (direct_payments, kind inspection_fee_reimburse)';
COMMENT ON COLUMN core.inspection_fee_allocations.third_party_settled_at IS 'Lúc phần đối tác/AgiViet đã trả xong';
COMMENT ON COLUMN core.inspection_fee_allocations.created_at IS 'Lúc ghi';
CREATE FUNCTION core.guard_fee_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE fee bigint; BEGIN
 IF TG_OP='UPDATE' AND (NEW.buyer_vnd,NEW.seller_vnd,NEW.partner_vnd,NEW.platform_vnd,NEW.pending_vnd,NEW.decision_id) IS DISTINCT FROM
    (OLD.buyer_vnd,OLD.seller_vnd,OLD.partner_vnd,OLD.platform_vnd,OLD.pending_vnd,OLD.decision_id) THEN
  RAISE EXCEPTION 'Phân bổ phí bất biến; đổi bằng quyết định mới' USING HINT='ck_append_only'; END IF;
 SELECT fee_vnd INTO fee FROM core.inspections WHERE id=NEW.inspection_id;
 IF NEW.buyer_vnd+NEW.seller_vnd+NEW.partner_vnd+NEW.platform_vnd+NEW.pending_vnd<>fee THEN
  RAISE EXCEPTION 'Tổng phần chịu phải bằng phí kiểm định %',fee USING HINT='ck_fee_allocation_sum'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_fee_allocation BEFORE INSERT OR UPDATE ON core.inspection_fee_allocations FOR EACH ROW EXECUTE FUNCTION core.guard_fee_allocation();

-- Cho phép loại quyết định "inspection_fee_allocation" (đối tượng: inspection).
CREATE OR REPLACE FUNCTION cmd.propose_decision(p_kind text,p_entity text,p_id uuid,p_reason text,p_evidence uuid,p_detail jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$
DECLARE result uuid; oid uuid;
BEGIN
 PERFORM cmd.require_staff(CASE WHEN p_kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p_kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance'] ELSE ARRAY['risk','supervisor'] END);
 IF NOT ((p_kind='payment_reconciliation' AND p_entity='direct_payment') OR (p_kind='dispute_resolution' AND p_entity='dispute') OR (p_kind='force_majeure_reduction' AND p_entity='amendment') OR (p_kind='ledger_correction' AND p_entity='ledger_transaction') OR (p_kind='manual_payment' AND p_entity='order') OR (p_kind='policy_change' AND p_entity='policy_version') OR (p_kind='inspection_fee_allocation' AND p_entity='inspection')) THEN RAISE EXCEPTION 'Sai loại quyết định' USING HINT='ck_command_payload'; END IF;
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

CREATE FUNCTION cmd.allocate_inspection_fee(p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE q ops.decisions%ROWTYPE; i core.inspections%ROWTYPE; o core.orders%ROWTYPE; pay uuid; owe bigint; dir text;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor','finance']);
 SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF q.kind IS DISTINCT FROM 'inspection_fee_allocation' OR q.entity IS DISTINCT FROM 'inspection' THEN RAISE EXCEPTION 'Sai quyết định phân bổ phí' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF EXISTS(SELECT 1 FROM core.inspection_fee_allocations WHERE inspection_id=q.entity_id) THEN
  RETURN q.entity_id; END IF;
 PERFORM cmd.check_payload(q.detail-'command_proposal_id',ARRAY['buyer_vnd','seller_vnd','partner_vnd','platform_vnd','pending_vnd']);
 SELECT * INTO i FROM core.inspections WHERE id=q.entity_id FOR UPDATE;
 SELECT o2.* INTO o FROM core.orders o2 JOIN core.deliveries d ON d.order_id=o2.id WHERE d.id=i.delivery_id;
 INSERT INTO core.inspection_fee_allocations(inspection_id,buyer_vnd,seller_vnd,partner_vnd,platform_vnd,pending_vnd,decision_id)
 VALUES(i.id,(q.detail->>'buyer_vnd')::bigint,(q.detail->>'seller_vnd')::bigint,(q.detail->>'partner_vnd')::bigint,(q.detail->>'platform_vnd')::bigint,(q.detail->>'pending_vnd')::bigint,q.id);
 -- Bên đã ứng khác bên phải chịu → khoản hoàn giữa hai bên (luồng trả trực tiếp có xác nhận/đối soát sẵn có).
 IF i.prepaid_by_org_id=o.buyer_org_id THEN owe:=(q.detail->>'seller_vnd')::bigint; dir:='seller_to_buyer';
 ELSIF i.prepaid_by_org_id=o.seller_org_id THEN owe:=(q.detail->>'buyer_vnd')::bigint; dir:='buyer_to_seller';
 ELSE owe:=0; END IF;
 IF owe>0 THEN
  INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
  VALUES('PKD-'||i.id,o.id,'inspection_fee_reimburse',dir,
   CASE WHEN dir='seller_to_buyer' THEN o.seller_org_id ELSE o.buyer_org_id END,
   CASE WHEN dir='seller_to_buyer' THEN o.buyer_org_id ELSE o.seller_org_id END,owe,'after_days','due') RETURNING id INTO pay;
  UPDATE core.inspection_fee_allocations SET reimburse_payment_id=pay WHERE inspection_id=i.id;
 END IF;
 RETURN i.id;
END $$;
GRANT EXECUTE ON FUNCTION cmd.allocate_inspection_fee(uuid) TO agiviet_app;
REVOKE ALL ON FUNCTION cmd.allocate_inspection_fee(uuid) FROM PUBLIC;

CREATE VIEW core.v_fee_dossier AS
 SELECT d.order_id, i.id AS inspection_id, i.fee_vnd, i.prepaid_by_org_id,
  a.buyer_vnd, a.seller_vnd, a.partner_vnd, a.platform_vnd, a.pending_vnd,
  coalesce(p.amount_due_vnd,0) AS reimburse_due_vnd,
  coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0) AS reimbursed_vnd,
  CASE WHEN a.inspection_id IS NULL THEN 'chưa phân bổ'
       WHEN a.pending_vnd>0 THEN 'còn phần chờ xử lý'
       WHEN p.id IS NOT NULL AND p.status NOT IN ('fully_received','cancelled') THEN 'còn thiếu hoàn'
       WHEN a.partner_vnd+a.platform_vnd>0 AND a.third_party_settled_at IS NULL THEN 'chờ đối tác/AgiViet trả'
       ELSE 'đã xong' END AS trang_thai
 FROM core.inspections i JOIN core.deliveries d ON d.id=i.delivery_id
 LEFT JOIN core.inspection_fee_allocations a ON a.inspection_id=i.id
 LEFT JOIN core.direct_payments p ON p.id=a.reimburse_payment_id;
COMMENT ON VIEW core.v_fee_dossier IS 'Hồ sơ phí kiểm định: phí, ai ứng, ai chịu, phải hoàn, đã hoàn, trạng thái.';
REVOKE ALL ON core.v_fee_dossier FROM PUBLIC;

-- ---------- C4: nguồn xác minh của mỗi khoản tiền ----------
CREATE VIEW core.v_money_verification AS
 SELECT c.id AS confirmation_id, p.id AS direct_payment_id, p.order_id, p.kind, p.direction, c.amount_vnd, c.confirmed_at,
  CASE WHEN c.ops_decision_by IS NOT NULL AND c.bank_evidence_id IS NOT NULL THEN 'đối soát có căn cứ'
       WHEN c.otp_challenge_id IS NOT NULL AND EXISTS(SELECT 1 FROM core.memberships m WHERE m.user_id=c.confirmed_by AND m.org_id=p.payee_org_id) THEN 'người nhận xác nhận'
       ELSE 'chưa rõ nguồn' END AS nguon_xac_minh,
  c.confirmed_by, c.ops_decision_by, c.bank_evidence_id
 FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id;
COMMENT ON VIEW core.v_money_verification IS 'Bản 23: mỗi khoản đã nhận ghi rõ nguồn xác minh: người nhận xác nhận, hoặc đối soát có căn cứ (hai người + chứng từ ngân hàng).';
REVOKE ALL ON core.v_money_verification FROM PUBLIC;

-- ---------- C5: chờ đối soát cọc, giữ tối đa 6 giờ ----------
CREATE TABLE core.deposit_reconciliations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders,
 opened_at timestamptz NOT NULL, hold_until timestamptz NOT NULL, reason text NOT NULL CHECK(length(btrim(reason))>0),
 opened_by uuid NOT NULL REFERENCES core.users, closed_at timestamptz,
 outcome text CHECK(outcome IN ('co_coc_hop_le','khong_co_coc')),
 CHECK(hold_until>opened_at AND hold_until<=opened_at+interval '6 hours'),
 CHECK((closed_at IS NULL)=(outcome IS NULL))
);
CREATE UNIQUE INDEX ux_deposit_recon_open ON core.deposit_reconciliations(order_id) WHERE closed_at IS NULL;
ALTER TABLE core.deposit_reconciliations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.deposit_reconciliations IS 'Bản 23: ngân hàng báo trễ/kết quả chưa rõ → chờ đối soát cọc, giữ lượng tối đa 6 giờ; chưa nhả lượng, chưa đóng đơn vì quá hạn cọc.';
COMMENT ON COLUMN core.deposit_reconciliations.id IS 'Mã đối soát';
COMMENT ON COLUMN core.deposit_reconciliations.order_id IS 'Đơn';
COMMENT ON COLUMN core.deposit_reconciliations.opened_at IS 'Lúc mở';
COMMENT ON COLUMN core.deposit_reconciliations.hold_until IS 'Giữ lượng tới (tối đa 6 giờ)';
COMMENT ON COLUMN core.deposit_reconciliations.reason IS 'Lý do (vd ngân hàng báo trễ)';
COMMENT ON COLUMN core.deposit_reconciliations.opened_by IS 'Người/hệ thống mở';
COMMENT ON COLUMN core.deposit_reconciliations.closed_at IS 'Lúc có kết quả';
COMMENT ON COLUMN core.deposit_reconciliations.outcome IS 'co_coc_hop_le: tiếp tục đơn; khong_co_coc: đóng theo điều khoản';
CREATE FUNCTION core.reconciling_deposit(p_order uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM core.deposit_reconciliations WHERE order_id=p_order AND closed_at IS NULL AND ref.clock_at()<hold_until)
$$;
CREATE FUNCTION core.guard_deposit_reconciling_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='closed' AND OLD.status<>'closed' AND NEW.close_reason='deposit_expired' AND core.reconciling_deposit(NEW.id) THEN
  RAISE EXCEPTION 'Đang chờ đối soát cọc: chưa đóng đơn vì quá hạn cọc' USING HINT='ck_deposit_reconciling'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_deposit_reconciling BEFORE UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_reconciling_order();
CREATE FUNCTION core.guard_deposit_reconciling_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status IN ('expired','cancelled') AND OLD.status='active' AND NEW.order_id IS NOT NULL AND core.reconciling_deposit(NEW.order_id) THEN
  RAISE EXCEPTION 'Đang chờ đối soát cọc: chưa nhả lượng' USING HINT='ck_deposit_reconciling'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_deposit_reconciling BEFORE UPDATE OF status ON core.holds FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_reconciling_hold();
CREATE FUNCTION cmd.open_deposit_reconciliation(p_order uuid,p_reason text,p_hours integer DEFAULT 6) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.require_system();
 IF p_hours IS NULL OR p_hours NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Giữ tối đa 6 giờ' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.deposit_reconciliations(order_id,opened_at,hold_until,reason,opened_by)
 VALUES(p_order,ref.clock_at(),ref.clock_at()+make_interval(hours=>p_hours),p_reason,ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.close_deposit_reconciliation(p_id uuid,p_outcome text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.require_system();
 UPDATE core.deposit_reconciliations SET closed_at=ref.clock_at(),outcome=p_outcome WHERE id=p_id AND closed_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION cmd.open_deposit_reconciliation(uuid,text,integer),cmd.close_deposit_reconciliation(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.open_deposit_reconciliation(uuid,text,integer),cmd.close_deposit_reconciliation(uuid,text) TO agiviet_orchestrator;

-- ---------- C6: kiểm sau giao, cách ly, hạn khiếu nại ----------
-- Hạn khiếu nại nằm trong order_versions.extra_terms->>'complaint_window_hours' (mặc định 12 giờ, 1–720),
-- không thêm cột để không đổi hợp đồng dữ liệu của lệnh tạo đơn.
CREATE FUNCTION core.complaint_window_hours(p_order uuid) RETURNS integer LANGUAGE sql STABLE AS $$
 SELECT least(720,greatest(1,coalesce((v.extra_terms->>'complaint_window_hours')::integer,12)))
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=p_order
$$;
COMMENT ON FUNCTION core.complaint_window_hours(uuid) IS 'Hạn khiếu nại tính từ lúc đóng lượt giao (giờ); quá hạn chỉ ghi phản ánh, trừ tiêu chí kiểm sau đã thỏa thuận.';
CREATE TABLE core.deferred_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders,
 delivery_id uuid NOT NULL REFERENCES core.deliveries, criterion text NOT NULL CHECK(length(btrim(criterion))>0),
 sample_id uuid REFERENCES core.sealed_samples, result_due_at timestamptz NOT NULL,
 quarantine_required boolean NOT NULL DEFAULT true, result text CHECK(result IN ('dat','khong_dat')), result_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK((result IS NULL)=(result_at IS NULL))
);
ALTER TABLE core.deferred_checks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.deferred_checks IS 'Tiêu chí còn kiểm sau giao (vd dư lượng). Trong lúc chờ: hàng cách ly nếu quarantine_required. Khiếu nại theo tiêu chí này không bị chặn bởi hạn khiếu nại thường.';
COMMENT ON COLUMN core.deferred_checks.id IS 'Mã';
COMMENT ON COLUMN core.deferred_checks.order_id IS 'Đơn';
COMMENT ON COLUMN core.deferred_checks.delivery_id IS 'Lượt giao';
COMMENT ON COLUMN core.deferred_checks.criterion IS 'Tiêu chí (vd dư lượng thuốc BVTV)';
COMMENT ON COLUMN core.deferred_checks.sample_id IS 'Mẫu niêm phong dùng để kiểm';
COMMENT ON COLUMN core.deferred_checks.result_due_at IS 'Hạn có kết quả';
COMMENT ON COLUMN core.deferred_checks.quarantine_required IS 'Hàng phải cách ly tới khi có kết quả';
COMMENT ON COLUMN core.deferred_checks.result IS 'Kết quả';
COMMENT ON COLUMN core.deferred_checks.result_at IS 'Lúc có kết quả';
COMMENT ON COLUMN core.deferred_checks.created_at IS 'Lúc ghi';
CREATE TABLE core.late_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders,
 raised_by uuid NOT NULL REFERENCES core.users, note text NOT NULL CHECK(length(btrim(note))>0),
 evidence_document_id uuid REFERENCES core.documents, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.late_feedback ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.late_feedback IS 'Phản ánh sau hạn khiếu nại: chỉ ghi nhận, không tự thành nghĩa vụ hoàn của người bán.';
COMMENT ON COLUMN core.late_feedback.id IS 'Mã';
COMMENT ON COLUMN core.late_feedback.order_id IS 'Đơn';
COMMENT ON COLUMN core.late_feedback.raised_by IS 'Người phản ánh';
COMMENT ON COLUMN core.late_feedback.note IS 'Nội dung';
COMMENT ON COLUMN core.late_feedback.evidence_document_id IS 'Chứng cứ kèm';
COMMENT ON COLUMN core.late_feedback.created_at IS 'Lúc ghi';
CREATE FUNCTION core.guard_complaint_window() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dlv core.deliveries%ROWTYPE; win integer; pol smallint;
BEGIN
 SELECT d.* INTO dlv FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id JOIN core.deliveries d ON d.id=a.delivery_id WHERE l.id=NEW.line_id;
 SELECT policy_version INTO pol FROM core.orders WHERE id=NEW.order_id; win:=core.complaint_window_hours(NEW.order_id);
 IF pol=23 AND dlv.status='closed' AND ref.clock_at() > dlv.status_changed_at + make_interval(hours=>win)
    AND NOT EXISTS(SELECT 1 FROM core.deferred_checks WHERE delivery_id=dlv.id AND (result IS NULL OR result_at>=ref.clock_at()-make_interval(hours=>win))) THEN
  RAISE EXCEPTION 'Quá hạn khiếu nại: chỉ ghi phản ánh (core.late_feedback)' USING HINT='ck_complaint_window'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_complaint_window BEFORE INSERT ON core.disputes FOR EACH ROW EXECUTE FUNCTION core.guard_complaint_window();

-- ---------- Hồ sơ mở: thêm phí kiểm định, kiểm sau giao, đối soát cọc ----------
CREATE OR REPLACE FUNCTION core.open_dossiers(p_order uuid) RETURNS TABLE(kind text, ref_id uuid, note text)
LANGUAGE sql STABLE AS $$
 SELECT 'tranh_chap', id, 'Tranh chấp chưa có kết quả' FROM core.disputes WHERE order_id=p_order AND status<>'resolved'
 UNION ALL
 SELECT 'tien_truc_tiep', id, 'Khoản trả trực tiếp chưa nhận đủ (' || status || ')' FROM core.direct_payments
  WHERE order_id=p_order AND status NOT IN ('fully_received','cancelled')
 UNION ALL
 SELECT 'lenh_ngan_hang', id, 'Lệnh ngân hàng chưa có kết quả cuối (' || status || ')' FROM core.bank_instructions
  WHERE order_id=p_order AND status IN ('created','sent','processing','succeeded')
 UNION ALL
 SELECT 'hang_tra_lai', lot_id, 'Hàng trả lại chưa xử lý: ' || qty || ' g' FROM ledger.qty_balances
  WHERE order_key=p_order AND bucket='returned_pending' AND qty>0
 UNION ALL
 SELECT 'phi_kiem_dinh', inspection_id, 'Hồ sơ phí kiểm định: ' || trang_thai FROM core.v_fee_dossier
  WHERE order_id=p_order AND trang_thai NOT IN ('đã xong','còn thiếu hoàn') -- khoản hoàn đã nằm ở tien_truc_tiep
 UNION ALL
 SELECT 'kiem_sau_giao', id, 'Tiêu chí kiểm sau giao chưa có kết quả: ' || criterion FROM core.deferred_checks
  WHERE order_id=p_order AND result IS NULL
 UNION ALL
 SELECT 'doi_soat_coc', id, 'Đang chờ đối soát cọc' FROM core.deposit_reconciliations
  WHERE order_id=p_order AND closed_at IS NULL
$$;

CREATE VIEW ops.v_open_dossiers AS
 SELECT o.id AS order_id, o.code, d.kind, d.ref_id, d.note, w.owner_user_id, w.due_at,
  (w.owner_user_id IS NULL) AS chua_co_nguoi_phu_trach, (w.due_at < ref.clock_at()) AS qua_han
 FROM core.orders o CROSS JOIN LATERAL core.open_dossiers(o.id) d
 LEFT JOIN ops.dossier_owners w ON w.order_id=o.id AND w.kind=d.kind AND w.ref_id=d.ref_id
 WHERE o.status NOT IN ('completed','closed','drafting');
COMMENT ON VIEW ops.v_open_dossiers IS 'Hộp việc: hồ sơ còn mở của mọi đơn, người phụ trách, hạn, quá hạn.';
REVOKE ALL ON ops.v_open_dossiers FROM PUBLIC;
