-- Sửa theo Codex rà commit 1614c70 (28/10/2026).
-- 1 (P1) Chính sách đơn phân loại theo LÚC CAM KẾT (hai bên ký bản đầu), không theo công thức đã chạy. Lịch sử tiền giữ nguyên.
-- 2 (P1) Phân bổ phí kiểm định có phiên bản: quyết định mới (hai người) thay phần "chờ xử lý"; khoản hoàn tính phần chênh.
-- 3 (P1) Đường khiếu nại sau giao: lệnh riêng; ngoại lệ chỉ cho đúng tiêu chí kiểm sau đã có kết quả không đạt, loại chất lượng.
-- 4 (P1) Chờ đối soát cọc: hạn tuyệt đối 6 giờ tính từ lần mở đầu tiên của đơn; hồ sơ quá hạn được đóng "hết hạn".
-- 5 (P2) Khoản hoàn phí có hạn trả (7 ngày).
-- 6 (P2) Hồ sơ mở chưa có người phụ trách → tạo việc (có SLA, quá hạn/chuyển cấp theo hệ thống việc sẵn có); lệnh giao người phụ trách.

-- ---------- 1 ----------
DROP TRIGGER b_policy_committed ON core.orders;
DROP FUNCTION core.guard_policy_matches_settlement();
CREATE FUNCTION core.order_committed_at(p_order uuid) RETURNS timestamptz LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN count(DISTINCT s.party) FILTER (WHERE s.party IN ('buyer','seller'))=2 THEN max(s.signed_at) FILTER (WHERE s.party IN ('buyer','seller')) END
 FROM core.order_versions v JOIN core.signatures s ON s.document_id=v.document_id WHERE v.order_id=p_order AND v.version_no=1
$$;
COMMENT ON FUNCTION core.order_committed_at(uuid) IS 'Lúc hai bên ký đủ bản hợp đồng đầu: căn cứ cam kết để phân loại chính sách của đơn.';
CREATE OR REPLACE FUNCTION core.backfill_order_policy() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer; e1_from timestamptz;
BEGIN
 SELECT applied_at INTO e1_from FROM public.schema_migrations WHERE name LIKE '0058%';
 IF e1_from IS NULL THEN RETURN 0; END IF;
 UPDATE core.orders o SET policy_version=CASE WHEN coalesce(core.order_committed_at(o.id),o.created_at)<e1_from THEN 22 ELSE 23 END
  WHERE o.policy_version IS DISTINCT FROM CASE WHEN coalesce(core.order_committed_at(o.id),o.created_at)<e1_from THEN 22 ELSE 23 END;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
COMMENT ON FUNCTION core.backfill_order_policy() IS 'Phân loại chính sách theo lúc cam kết: ký đủ trước khi E1 (0058) có hiệu lực → 22, còn lại 23. Không sửa quyết toán/lệnh tiền đã có.';
SELECT core.backfill_order_policy();

-- ---------- 2 + 5 ----------
ALTER TABLE core.inspection_fee_allocations DROP CONSTRAINT inspection_fee_allocations_pkey;
ALTER TABLE core.inspection_fee_allocations ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE core.inspection_fee_allocations ADD COLUMN version_no smallint NOT NULL DEFAULT 1 CHECK(version_no>=1);
ALTER TABLE core.inspection_fee_allocations ADD CONSTRAINT uq_fee_alloc_version UNIQUE(inspection_id,version_no);
ALTER TABLE core.inspection_fee_allocations ADD CONSTRAINT uq_fee_alloc_decision UNIQUE(decision_id);
COMMENT ON COLUMN core.inspection_fee_allocations.id IS 'Mã phân bổ';
COMMENT ON COLUMN core.inspection_fee_allocations.version_no IS 'Phiên bản; bản mới nhất có hiệu lực (vd chuyển phần chờ xử lý sang kết luận cuối)';
CREATE OR REPLACE FUNCTION cmd.allocate_inspection_fee(p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE q ops.decisions%ROWTYPE; i core.inspections%ROWTYPE; o core.orders%ROWTYPE; pay uuid; owe bigint; due bigint; dir text; nv smallint; aid uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor','finance']);
 SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF q.kind IS DISTINCT FROM 'inspection_fee_allocation' OR q.entity IS DISTINCT FROM 'inspection' THEN RAISE EXCEPTION 'Sai quyết định phân bổ phí' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO aid FROM core.inspection_fee_allocations WHERE decision_id=q.id;
 IF aid IS NOT NULL THEN RETURN aid; END IF; -- gọi lại cùng quyết định
 PERFORM cmd.check_payload(q.detail-'command_proposal_id',ARRAY['buyer_vnd','seller_vnd','partner_vnd','platform_vnd','pending_vnd']);
 SELECT * INTO i FROM core.inspections WHERE id=q.entity_id FOR UPDATE;
 SELECT o2.* INTO o FROM core.orders o2 JOIN core.deliveries d ON d.order_id=o2.id WHERE d.id=i.delivery_id;
 SELECT coalesce(max(version_no),0)+1 INTO nv FROM core.inspection_fee_allocations WHERE inspection_id=i.id;
 INSERT INTO core.inspection_fee_allocations(inspection_id,version_no,buyer_vnd,seller_vnd,partner_vnd,platform_vnd,pending_vnd,decision_id)
 VALUES(i.id,nv,(q.detail->>'buyer_vnd')::bigint,(q.detail->>'seller_vnd')::bigint,(q.detail->>'partner_vnd')::bigint,(q.detail->>'platform_vnd')::bigint,(q.detail->>'pending_vnd')::bigint,q.id) RETURNING id INTO aid;
 IF i.prepaid_by_org_id=o.buyer_org_id THEN owe:=(q.detail->>'seller_vnd')::bigint; dir:='seller_to_buyer';
 ELSIF i.prepaid_by_org_id=o.seller_org_id THEN owe:=(q.detail->>'buyer_vnd')::bigint; dir:='buyer_to_seller';
 ELSE owe:=0; END IF;
 -- Phần hoàn đã lập ở các phiên bản trước (chưa hủy) được trừ ra; chỉ lập phần chênh.
 SELECT coalesce(sum(p.amount_due_vnd),0) INTO due FROM core.inspection_fee_allocations a JOIN core.direct_payments p ON p.id=a.reimburse_payment_id
  WHERE a.inspection_id=i.id AND p.status<>'cancelled';
 IF owe<due THEN RAISE EXCEPTION 'Phần hoàn giảm so với đã lập: cần quyết định hoàn ngược riêng' USING HINT='ck_fee_allocation_decrease'; END IF;
 IF owe>due THEN
  INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,due_at,status)
  VALUES('PKD-'||aid,o.id,'inspection_fee_reimburse',dir,
   CASE WHEN dir='seller_to_buyer' THEN o.seller_org_id ELSE o.buyer_org_id END,
   CASE WHEN dir='seller_to_buyer' THEN o.buyer_org_id ELSE o.seller_org_id END,owe-due,'after_days',ref.clock_at()+interval '7 days','due') RETURNING id INTO pay;
  UPDATE core.inspection_fee_allocations SET reimburse_payment_id=pay WHERE id=aid;
 END IF;
 RETURN aid;
END $$;
GRANT EXECUTE ON FUNCTION cmd.allocate_inspection_fee(uuid) TO agiviet_app;
-- Trigger cũ: so sánh trên khóa cũ; cập nhật để chỉ cho ghi reimburse_payment_id/third_party_settled_at.
CREATE OR REPLACE FUNCTION core.guard_fee_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE fee bigint; BEGIN
 IF TG_OP='UPDATE' AND (NEW.inspection_id,NEW.version_no,NEW.buyer_vnd,NEW.seller_vnd,NEW.partner_vnd,NEW.platform_vnd,NEW.pending_vnd,NEW.decision_id) IS DISTINCT FROM
    (OLD.inspection_id,OLD.version_no,OLD.buyer_vnd,OLD.seller_vnd,OLD.partner_vnd,OLD.platform_vnd,OLD.pending_vnd,OLD.decision_id) THEN
  RAISE EXCEPTION 'Phân bổ phí bất biến; đổi bằng quyết định mới' USING HINT='ck_append_only'; END IF;
 SELECT fee_vnd INTO fee FROM core.inspections WHERE id=NEW.inspection_id;
 IF NEW.buyer_vnd+NEW.seller_vnd+NEW.partner_vnd+NEW.platform_vnd+NEW.pending_vnd<>fee THEN
  RAISE EXCEPTION 'Tổng phần chịu phải bằng phí kiểm định %',fee USING HINT='ck_fee_allocation_sum'; END IF;
 RETURN NEW;
END $$;
DROP VIEW core.v_fee_dossier;
CREATE VIEW core.v_fee_dossier AS
 WITH cur AS (SELECT DISTINCT ON (inspection_id) * FROM core.inspection_fee_allocations ORDER BY inspection_id,version_no DESC),
 pays AS (SELECT a.inspection_id, sum(p.amount_due_vnd) AS due_vnd,
   sum((SELECT coalesce(sum(c.amount_vnd),0) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id)) AS paid_vnd,
   bool_or(p.status NOT IN ('fully_received','cancelled')) AS con_mo, min(p.due_at) FILTER (WHERE p.status NOT IN ('fully_received','cancelled')) AS han_som_nhat
  FROM core.inspection_fee_allocations a JOIN core.direct_payments p ON p.id=a.reimburse_payment_id WHERE p.status<>'cancelled' GROUP BY a.inspection_id)
 SELECT d.order_id, i.id AS inspection_id, i.fee_vnd, i.prepaid_by_org_id, a.version_no,
  a.buyer_vnd, a.seller_vnd, a.partner_vnd, a.platform_vnd, a.pending_vnd,
  coalesce(p.due_vnd,0) AS reimburse_due_vnd, coalesce(p.paid_vnd,0) AS reimbursed_vnd, p.han_som_nhat AS reimburse_due_at,
  CASE WHEN a.inspection_id IS NULL THEN 'chưa phân bổ'
       WHEN a.pending_vnd>0 THEN 'còn phần chờ xử lý'
       WHEN coalesce(p.con_mo,false) THEN 'còn thiếu hoàn'
       WHEN a.partner_vnd+a.platform_vnd>0 AND a.third_party_settled_at IS NULL THEN 'chờ đối tác/AgiViet trả'
       ELSE 'đã xong' END AS trang_thai
 FROM core.inspections i JOIN core.deliveries d ON d.id=i.delivery_id
 LEFT JOIN cur a ON a.inspection_id=i.id LEFT JOIN pays p ON p.inspection_id=i.id;
COMMENT ON VIEW core.v_fee_dossier IS 'Hồ sơ phí kiểm định theo phân bổ mới nhất: phí, ai ứng, ai chịu, phải hoàn, đã hoàn, hạn hoàn, trạng thái.';
REVOKE ALL ON core.v_fee_dossier FROM PUBLIC;

-- ---------- 3 ----------
ALTER TABLE core.disputes ADD COLUMN deferred_check_id uuid REFERENCES core.deferred_checks;
COMMENT ON COLUMN core.disputes.deferred_check_id IS 'Khiếu nại sau hạn thường chỉ hợp lệ khi gắn tiêu chí kiểm sau của chính lượt giao đã có kết quả không đạt (loại chất lượng)';
CREATE OR REPLACE FUNCTION core.guard_complaint_window() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dlv core.deliveries%ROWTYPE; win integer; pol smallint; chk core.deferred_checks%ROWTYPE;
BEGIN
 SELECT d.* INTO dlv FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id JOIN core.deliveries d ON d.id=a.delivery_id WHERE l.id=NEW.line_id;
 SELECT policy_version INTO pol FROM core.orders WHERE id=NEW.order_id; win:=core.complaint_window_hours(NEW.order_id);
 IF pol=23 AND dlv.status='closed' AND ref.clock_at() > dlv.status_changed_at + make_interval(hours=>win) THEN
  SELECT * INTO chk FROM core.deferred_checks WHERE id=NEW.deferred_check_id;
  IF (chk.id IS NOT NULL AND chk.delivery_id=dlv.id AND NEW.claim_kind='quality' AND chk.result='khong_dat'
      AND ref.clock_at() <= chk.result_at + make_interval(hours=>win)) IS NOT TRUE THEN
   RAISE EXCEPTION 'Quá hạn khiếu nại: chỉ ghi phản ánh (core.late_feedback)' USING HINT='ck_complaint_window'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION cmd.open_post_delivery_claim(p_line uuid,p_qty bigint,p_reason text,p_claim text,p_deferred_check uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO l FROM core.acceptance_lines WHERE id=p_line;
 SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','purchaser','warehouse','site_receiver']);
 IF d.status<>'closed' OR p_qty IS NULL OR p_qty<=0 OR p_qty>l.qty OR p_claim NOT IN ('quality','shortfall') OR coalesce(length(btrim(p_reason)),0)=0
  OR EXISTS(SELECT 1 FROM core.disputes WHERE line_id=l.id AND status<>'resolved') THEN
  RAISE EXCEPTION 'Khiếu nại sau giao không hợp lệ' USING HINT='ck_dispute_scope'; END IF;
 INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind,created_at,deferred_check_id)
 VALUES(l.id,d.order_id,p_qty,ref.ctx_user(),p_reason,p_claim,ref.clock_at(),p_deferred_check) RETURNING id INTO result;
 UPDATE core.disputes SET status='awaiting_seller' WHERE id=result; -- máy trạng thái: open → awaiting_seller, như cmd.open_dispute
 RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.open_post_delivery_claim(uuid,bigint,text,text,uuid) TO agiviet_app;
REVOKE ALL ON FUNCTION cmd.open_post_delivery_claim(uuid,bigint,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.open_post_delivery_claim(uuid,bigint,text,text,uuid) TO agiviet_app;

-- ---------- 4 ----------
ALTER TABLE core.deposit_reconciliations DROP CONSTRAINT deposit_reconciliations_outcome_check;
ALTER TABLE core.deposit_reconciliations ADD CONSTRAINT deposit_reconciliations_outcome_check CHECK(outcome IN ('co_coc_hop_le','khong_co_coc','het_han'));
COMMENT ON COLUMN core.deposit_reconciliations.outcome IS 'co_coc_hop_le: tiếp tục đơn; khong_co_coc: đóng theo điều khoản; het_han: quá 6 giờ chưa có kết quả, xử lý như không có cọc hợp lệ';
CREATE FUNCTION core.guard_deposit_recon_cap() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE first_at timestamptz; BEGIN
 SELECT min(opened_at) INTO first_at FROM core.deposit_reconciliations WHERE order_id=NEW.order_id;
 IF first_at IS NOT NULL AND NEW.hold_until > first_at + interval '6 hours' THEN
  RAISE EXCEPTION 'Chờ đối soát cọc tối đa 6 giờ tính từ lần mở đầu tiên của đơn' USING HINT='ck_deposit_recon_cap'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_recon_cap BEFORE INSERT ON core.deposit_reconciliations FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_recon_cap();
CREATE FUNCTION cmd.expire_deposit_reconciliations() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE n integer; BEGIN
 PERFORM cmd.require_system();
 UPDATE core.deposit_reconciliations SET closed_at=ref.clock_at(),outcome='het_han' WHERE closed_at IS NULL AND ref.clock_at()>=hold_until;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION cmd.expire_deposit_reconciliations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.expire_deposit_reconciliations() TO agiviet_orchestrator;

-- ---------- 6 ----------
INSERT INTO ref.task_kinds(code,label_vi) VALUES('V25','Hồ sơ mở chưa có người phụ trách: giao người, đặt hạn') ON CONFLICT DO NOTHING;
CREATE FUNCTION cmd.sweep_open_dossiers() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$
DECLARE r record; n integer:=0; s ref.sla_policies%ROWTYPE;
BEGIN
 PERFORM cmd.require_system();
 SELECT * INTO s FROM ref.sla_policies ORDER BY priority LIMIT 1;
 FOR r IN SELECT * FROM ops.v_open_dossiers WHERE chua_co_nguoi_phu_trach LOOP
  INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,order_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
  VALUES('TASK-'||gen_random_uuid(),'V25',s.priority,'order',r.order_id,r.order_id,'supervisor','HS:'||r.order_id||':'||r.kind||':'||r.ref_id,
   'Hồ sơ mở chưa có người phụ trách: '||r.note,ref.clock_at()+s.response_minutes*interval '1 minute',ref.clock_at()+s.resolution_minutes*interval '1 minute',ref.clock_at()+s.update_minutes*interval '1 minute')
  ON CONFLICT (dedup_key) DO NOTHING;
  IF FOUND THEN n:=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION cmd.sweep_open_dossiers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.sweep_open_dossiers() TO agiviet_orchestrator;
CREATE FUNCTION cmd.assign_dossier(p_order uuid,p_kind text,p_ref uuid,p_owner uuid,p_due timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$ BEGIN
 PERFORM cmd.require_staff(ARRAY['supervisor','risk','finance','support']);
 IF NOT EXISTS(SELECT 1 FROM core.open_dossiers(p_order) WHERE kind=p_kind AND ref_id=p_ref) OR p_due IS NULL OR p_due<=ref.clock_at()
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p_owner AND active) THEN
  RAISE EXCEPTION 'Sai hồ sơ / người phụ trách / hạn' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.dossier_owners(order_id,kind,ref_id,owner_user_id,due_at,assigned_by) VALUES(p_order,p_kind,p_ref,p_owner,p_due,ref.ctx_user())
 ON CONFLICT(order_id,kind,ref_id) DO UPDATE SET owner_user_id=EXCLUDED.owner_user_id,due_at=EXCLUDED.due_at,assigned_by=EXCLUDED.assigned_by,assigned_at=now();
END $$;
REVOKE ALL ON FUNCTION cmd.assign_dossier(uuid,text,uuid,uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.assign_dossier(uuid,text,uuid,uuid,timestamptz) TO agiviet_app;
