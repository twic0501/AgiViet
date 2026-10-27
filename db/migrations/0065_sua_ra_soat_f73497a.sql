-- Sửa theo Codex rà commit f73497a (28/10/2026). Codex chốt: một khoản phí chỉ thu một lần (đơn 23 ưu tiên hồ sơ hoàn
-- riêng, đối chiếu phần đã thu/trừ); khiếu nại còn hạn vẫn nhận sau quyết toán, hiện trong hộp việc, không tự đảo tiền đã chi.

-- ---------- 1. Một phí chỉ thu một lần ----------
-- Luồng kết luận tranh chấp cũ thu phí qua contract_charges (trừ khi quyết toán). Phân bổ phí phải trừ phần đó.
CREATE FUNCTION core.inspection_fee_collected(p_inspection uuid,p_side text) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT coalesce(sum(amount_vnd),0) FROM core.contract_charges WHERE source_entity='inspection' AND source_id=p_inspection AND kind='inspection_fee' AND payer_side=p_side
$$;
COMMENT ON FUNCTION core.inspection_fee_collected(uuid,text) IS 'Phần phí kiểm định đã thu qua quyết toán (contract_charges) từ một bên.';
CREATE OR REPLACE FUNCTION cmd.allocate_inspection_fee(p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE q ops.decisions%ROWTYPE; i core.inspections%ROWTYPE; o core.orders%ROWTYPE; pay uuid; owe bigint; due bigint; dir text; nv smallint; aid uuid; side text;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor','finance']);
 SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF q.kind IS DISTINCT FROM 'inspection_fee_allocation' OR q.entity IS DISTINCT FROM 'inspection' THEN RAISE EXCEPTION 'Sai quyết định phân bổ phí' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO aid FROM core.inspection_fee_allocations WHERE decision_id=q.id;
 IF aid IS NOT NULL THEN RETURN aid; END IF;
 PERFORM cmd.check_payload(q.detail-'command_proposal_id',ARRAY['buyer_vnd','seller_vnd','partner_vnd','platform_vnd','pending_vnd']);
 SELECT * INTO i FROM core.inspections WHERE id=q.entity_id FOR UPDATE;
 SELECT o2.* INTO o FROM core.orders o2 JOIN core.deliveries d ON d.order_id=o2.id WHERE d.id=i.delivery_id;
 SELECT coalesce(max(version_no),0)+1 INTO nv FROM core.inspection_fee_allocations WHERE inspection_id=i.id;
 INSERT INTO core.inspection_fee_allocations(inspection_id,version_no,buyer_vnd,seller_vnd,partner_vnd,platform_vnd,pending_vnd,decision_id)
 VALUES(i.id,nv,(q.detail->>'buyer_vnd')::bigint,(q.detail->>'seller_vnd')::bigint,(q.detail->>'partner_vnd')::bigint,(q.detail->>'platform_vnd')::bigint,(q.detail->>'pending_vnd')::bigint,q.id) RETURNING id INTO aid;
 IF i.prepaid_by_org_id=o.buyer_org_id THEN owe:=(q.detail->>'seller_vnd')::bigint; dir:='seller_to_buyer'; side:='seller';
 ELSIF i.prepaid_by_org_id=o.seller_org_id THEN owe:=(q.detail->>'buyer_vnd')::bigint; dir:='buyer_to_seller'; side:='buyer';
 ELSE owe:=0; side:=NULL; END IF;
 -- Đã lập ở phiên bản trước + đã thu qua quyết toán: không thu lại.
 SELECT coalesce(sum(p.amount_due_vnd),0) INTO due FROM core.inspection_fee_allocations a JOIN core.direct_payments p ON p.id=a.reimburse_payment_id
  WHERE a.inspection_id=i.id AND p.status<>'cancelled';
 IF side IS NOT NULL THEN due:=due+core.inspection_fee_collected(i.id,side); END IF;
 IF owe<due THEN RAISE EXCEPTION 'Phần hoàn giảm so với đã lập/đã thu: cần quyết định hoàn ngược riêng' USING HINT='ck_fee_allocation_decrease'; END IF;
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
-- Hồ sơ phí: chưa phân bổ nhưng tranh chấp đã có kết luận theo luồng cũ (phí đã thu qua quyết toán hoặc bên ứng tự chịu) là đã xong.
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
  core.inspection_fee_collected(i.id,'seller')+core.inspection_fee_collected(i.id,'buyer') AS collected_in_settlement_vnd,
  CASE WHEN a.inspection_id IS NULL AND EXISTS(SELECT 1 FROM core.dispute_resolutions r WHERE r.dispute_id=i.dispute_id) THEN 'đã xử lý theo kết luận tranh chấp'
       WHEN a.inspection_id IS NULL THEN 'chưa phân bổ'
       WHEN a.pending_vnd>0 THEN 'còn phần chờ xử lý'
       WHEN coalesce(p.con_mo,false) THEN 'còn thiếu hoàn'
       WHEN a.partner_vnd+a.platform_vnd>0 AND a.third_party_settled_at IS NULL THEN 'chờ đối tác/AgiViet trả'
       ELSE 'đã xong' END AS trang_thai
 FROM core.inspections i JOIN core.deliveries d ON d.id=i.delivery_id
 LEFT JOIN cur a ON a.inspection_id=i.id LEFT JOIN pays p ON p.inspection_id=i.id;
COMMENT ON VIEW core.v_fee_dossier IS 'Hồ sơ phí kiểm định: một phí chỉ thu một lần (đối chiếu phần đã thu qua quyết toán).';
REVOKE ALL ON core.v_fee_dossier FROM PUBLIC;

-- ---------- 2. Khiếu nại sau giao: kết luận người bán sai → khoản trừ, không đảo tiền đã chi ----------
ALTER TABLE core.disputes ADD COLUMN post_delivery boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN core.disputes.post_delivery IS 'Khiếu nại sau khi lượt giao đã đóng (cmd.open_post_delivery_claim)';
ALTER TABLE core.contract_charges DROP CONSTRAINT ck_cc_kind;
ALTER TABLE core.contract_charges ADD CONSTRAINT ck_cc_kind CHECK(kind IN ('shortfall_penalty','inspection_fee','storage_fee','disposal_cost','materials_offset','post_delivery_claim'));
CREATE OR REPLACE FUNCTION cmd.open_post_delivery_claim(p_line uuid,p_qty bigint,p_reason text,p_claim text,p_deferred_check uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO l FROM core.acceptance_lines WHERE id=p_line;
 SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','purchaser','warehouse','site_receiver']);
 IF d.status<>'closed' OR p_qty IS NULL OR p_qty<=0 OR p_qty>l.payable_qty OR p_claim NOT IN ('quality','shortfall') OR coalesce(length(btrim(p_reason)),0)=0
  OR EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=d.id AND n.version_no>a.version_no) THEN
  RAISE EXCEPTION 'Khiếu nại sau giao không hợp lệ (dòng phải thuộc bản nghiệm thu hiện hành)' USING HINT='ck_dispute_scope'; END IF;
 INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind,created_at,deferred_check_id,post_delivery)
 VALUES(l.id,d.order_id,p_qty,ref.ctx_user(),p_reason,p_claim,ref.clock_at(),p_deferred_check,true) RETURNING id INTO result;
 UPDATE core.disputes SET status='awaiting_seller' WHERE id=result;
 RETURN result;
END $$;
CREATE FUNCTION core.charge_post_delivery_claim() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tc core.disputes%ROWTYPE; l core.acceptance_lines%ROWTYPE; amt bigint;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=NEW.dispute_id;
 IF tc.post_delivery AND NEW.result='failed' THEN
  SELECT * INTO l FROM core.acceptance_lines WHERE id=tc.line_id;
  amt:=ref.div_round(tc.disputed_qty::numeric*l.unit_price_vnd,1000);
  IF amt>0 THEN
   INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
   VALUES(tc.order_id,'post_delivery_claim','seller',amt,jsonb_build_object('dispute_id',tc.id,'qty_g',tc.disputed_qty,'unit_price_vnd',l.unit_price_vnd),'dispute',tc.id,NEW.resolved_by);
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_post_delivery_charge AFTER INSERT ON core.dispute_resolutions FOR EACH ROW EXECUTE FUNCTION core.charge_post_delivery_claim();

-- ---------- 3. Chính sách chốt cùng bước ký ----------
CREATE FUNCTION core.classify_policy_on_sign() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,public AS $$
DECLARE oid uuid; e1_from timestamptz; c timestamptz;
BEGIN
 SELECT v.order_id INTO oid FROM core.order_versions v WHERE v.document_id=NEW.document_id AND v.version_no=1;
 IF oid IS NULL THEN RETURN NEW; END IF;
 c:=core.order_committed_at(oid);
 IF c IS NULL THEN RETURN NEW; END IF;
 SELECT applied_at INTO e1_from FROM public.schema_migrations WHERE name LIKE '0058%';
 UPDATE core.orders SET policy_version=CASE WHEN e1_from IS NOT NULL AND c<e1_from THEN 22 ELSE 23 END
  WHERE id=oid AND policy_version IS DISTINCT FROM CASE WHEN e1_from IS NOT NULL AND c<e1_from THEN 22 ELSE 23 END;
 RETURN NEW;
END $$;
CREATE TRIGGER z_policy_on_sign AFTER INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.classify_policy_on_sign();

-- ---------- 4. Không trùng tranh chấp cho cùng dòng qua các phiên bản nghiệm thu ----------
CREATE FUNCTION core.guard_dispute_duplicate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dlv uuid; ln smallint;
BEGIN
 SELECT a.delivery_id, l.line_no INTO dlv, ln FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE l.id=NEW.line_id;
 IF EXISTS(SELECT 1 FROM core.disputes x JOIN core.acceptance_lines l ON l.id=x.line_id JOIN core.acceptance_versions a ON a.id=l.acceptance_id
           WHERE a.delivery_id=dlv AND l.line_no=ln AND x.status<>'resolved') THEN
  RAISE EXCEPTION 'Dòng này đã có tranh chấp đang mở' USING HINT='ck_dispute_duplicate'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_dispute_duplicate BEFORE INSERT ON core.disputes FOR EACH ROW EXECUTE FUNCTION core.guard_dispute_duplicate();

-- ---------- 5. Hồ sơ mới sau "Hoàn tất" vẫn hiện ----------
DROP VIEW ops.v_open_dossiers;
CREATE VIEW ops.v_open_dossiers AS
 SELECT o.id AS order_id, o.code, o.status AS order_status, d.kind, d.ref_id, d.note, w.owner_user_id, w.due_at,
  (w.owner_user_id IS NULL) AS chua_co_nguoi_phu_trach, (w.due_at < ref.clock_at()) AS qua_han
 FROM core.orders o CROSS JOIN LATERAL core.open_dossiers(o.id) d
 LEFT JOIN ops.dossier_owners w ON w.order_id=o.id AND w.kind=d.kind AND w.ref_id=d.ref_id
 WHERE o.status NOT IN ('drafting');
COMMENT ON VIEW ops.v_open_dossiers IS 'Hộp việc: hồ sơ còn mở của mọi đơn, KỂ CẢ đơn đã hoàn tất nhận khiếu nại còn hạn (Codex C4).';
REVOKE ALL ON ops.v_open_dossiers FROM PUBLIC;
CREATE VIEW core.v_order_display_status AS
 SELECT o.id AS order_id, o.status,
  CASE WHEN o.status IN ('completed','outstanding') AND EXISTS(SELECT 1 FROM core.open_dossiers(o.id)) THEN 'Đã quyết toán mua bán · còn hồ sơ mở'
       ELSE (SELECT label_vi FROM ref.statuses WHERE entity='order' AND code=o.status) END AS nhan_hien_thi
 FROM core.orders o;
COMMENT ON VIEW core.v_order_display_status IS 'Nhãn hiển thị: đơn đã hoàn tất mà nhận hồ sơ mới hiện "còn hồ sơ mở"; không đảo trạng thái tiền.';
REVOKE ALL ON core.v_order_display_status FROM PUBLIC;
-- cmd.sweep_open_dossiers dùng view mới (cùng cột cần dùng).

-- ---------- 6. Không giao việc cho tài khoản đã khóa ----------
CREATE OR REPLACE FUNCTION cmd.assign_dossier(p_order uuid,p_kind text,p_ref uuid,p_owner uuid,p_due timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$ BEGIN
 PERFORM cmd.require_staff(ARRAY['supervisor','risk','finance','support']);
 IF NOT EXISTS(SELECT 1 FROM core.open_dossiers(p_order) WHERE kind=p_kind AND ref_id=p_ref) OR p_due IS NULL OR p_due<=ref.clock_at()
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments s JOIN core.users u ON u.id=s.user_id WHERE s.user_id=p_owner AND s.active AND u.disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Sai hồ sơ / người phụ trách (phải còn hiệu lực, không bị khóa) / hạn' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.dossier_owners(order_id,kind,ref_id,owner_user_id,due_at,assigned_by) VALUES(p_order,p_kind,p_ref,p_owner,p_due,ref.ctx_user())
 ON CONFLICT(order_id,kind,ref_id) DO UPDATE SET owner_user_id=EXCLUDED.owner_user_id,due_at=EXCLUDED.due_at,assigned_by=EXCLUDED.assigned_by,assigned_at=now();
END $$;
-- Hồ sơ giao cho người nay đã khóa: coi như chưa có người phụ trách.
DROP VIEW ops.v_open_dossiers;
CREATE VIEW ops.v_open_dossiers AS
 SELECT o.id AS order_id, o.code, o.status AS order_status, d.kind, d.ref_id, d.note, w.owner_user_id, w.due_at,
  (w.owner_user_id IS NULL OR u.disabled_at IS NOT NULL) AS chua_co_nguoi_phu_trach, (w.due_at < ref.clock_at()) AS qua_han
 FROM core.orders o CROSS JOIN LATERAL core.open_dossiers(o.id) d
 LEFT JOIN ops.dossier_owners w ON w.order_id=o.id AND w.kind=d.kind AND w.ref_id=d.ref_id
 LEFT JOIN core.users u ON u.id=w.owner_user_id
 WHERE o.status NOT IN ('drafting');
COMMENT ON VIEW ops.v_open_dossiers IS 'Hộp việc: hồ sơ còn mở mọi đơn (kể cả đã hoàn tất nhận khiếu nại còn hạn); người phụ trách bị khóa = chưa có người.';
REVOKE ALL ON ops.v_open_dossiers FROM PUBLIC;
