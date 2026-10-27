ALTER TABLE core.bank_events ADD COLUMN excess_vnd bigint NOT NULL DEFAULT 0 CHECK(excess_vnd>=0 AND excess_vnd<=amount_vnd);
ALTER TABLE core.bank_events ADD COLUMN payer_bank_code text;
COMMENT ON COLUMN core.bank_events.excess_vnd IS 'Phần thừa của chính sự kiện lúc ghi nhận, khóa cùng applied_at; lịch sử thiếu chứng cứ mặc định 0.';
COMMENT ON COLUMN core.bank_events.payer_bank_code IS 'Ngân hàng nguồn đã tra lại, đích hoàn phải trùng.';
CREATE OR REPLACE FUNCTION core.freeze_bank_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['applied_at','apply_result','excess_vnd']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['applied_at','apply_result','excess_vnd'])
  OR (OLD.applied_at IS NOT NULL AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD))
  OR (NEW.applied_at IS NOT NULL AND (NEW.requery_status IS DISTINCT FROM 'confirmed' OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=NEW.webhook_id AND signature_valid)))
  OR NEW.excess_vnd IS DISTINCT FROM OLD.excess_vnd AND NEW.applied_at IS NULL THEN
  RAISE EXCEPTION 'Sự kiện đã áp dụng hoặc bằng chứng ngân hàng bất biến' USING HINT='ck_append_only'; END IF;
 RETURN NEW; END $$;
CREATE FUNCTION core.check_bank_event_proof() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.applied_at IS NOT NULL AND (NEW.requery_status IS DISTINCT FROM 'confirmed' OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=NEW.webhook_id AND signature_valid)) THEN
 RAISE EXCEPTION 'Không đánh dấu đã áp dụng khi chưa xác thực/tra lại API' USING HINT='ck_bank_requery'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_bank_proof BEFORE INSERT ON core.bank_events FOR EACH ROW EXECUTE FUNCTION core.check_bank_event_proof();
CREATE FUNCTION core.guard_refund_entitlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; used bigint; entitled bigint; adj core.deposit_adjustments%ROWTYPE;
BEGIN
 IF NEW.kind LIKE 'refund_%' THEN
  SELECT * INTO e FROM core.bank_events WHERE id=NEW.source_bank_event_id FOR UPDATE;
  IF e.payer_bank_code IS NULL OR NEW.target_bank_code IS DISTINCT FROM e.payer_bank_code THEN
  RAISE EXCEPTION 'Ngân hàng đích hoàn phải bằng ngân hàng nguồn' USING HINT='ck_refund_source'; END IF;
 END IF;
 IF NEW.basis_kind='excess' THEN
  SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE basis_kind='excess' AND basis_id=NEW.basis_id AND status<>'failed';
  IF NEW.basis_id IS DISTINCT FROM e.id OR used+NEW.amount_vnd>e.excess_vnd THEN
   RAISE EXCEPTION 'Căn cứ không có đủ tiền thừa của chính sự kiện' USING HINT='ck_instruction_excess'; END IF;
 END IF;
 IF NEW.basis_kind='fee_refund' OR NEW.kind='refund_fee' THEN
  IF NEW.kind<>'refund_fee' THEN RAISE EXCEPTION 'Sai loại lệnh hoàn phí' USING HINT='ck_instruction_fee_refund'; END IF;
  IF NEW.basis_kind='cancellation' THEN
   SELECT d.expected_fee_vnd INTO entitled FROM core.cancellation_requests c JOIN core.deposits d ON d.order_id=c.order_id
   WHERE c.id=NEW.basis_id AND c.order_id=NEW.order_id AND c.status='processing_money'
   AND NOT c.partial_undelivered_only AND c.reason_kind IN ('seller_request','seller_no_delivery','force_majeure');
  ELSIF NEW.basis_kind='fee_refund' THEN
   SELECT a.* INTO adj FROM core.deposit_adjustments a JOIN core.orders o ON o.id=NEW.order_id JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=a.order_version_no
   JOIN core.amendments am ON am.id=v.amendment_id
   WHERE a.id=NEW.basis_id AND a.deposit_id=NEW.deposit_id AND a.delta_fee_vnd<0 AND v.version_no<=o.effective_version_no
   AND am.kind IN ('decrease_qty','force_majeure_reduction') AND am.status='accepted';
   entitled:=-adj.delta_fee_vnd;
  END IF;
  SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE kind='refund_fee' AND basis_kind=NEW.basis_kind AND basis_id=NEW.basis_id AND status<>'failed';
  IF entitled IS NULL OR NEW.amount_vnd+used>entitled THEN
   RAISE EXCEPTION 'Hoàn phí thiếu căn cứ Q06 hoặc vượt phần được hoàn' USING HINT='ck_instruction_fee_refund'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_entitlement BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_refund_entitlement();
-- SECURITY DEFINER cho điều chỉnh: danh tính lấy từ login, căn cứ đã được hai nhân viên duyệt.
CREATE FUNCTION cmd.post_correction(p_decision uuid,p_order uuid,p_idem text,p_memo text,p_lines jsonb,p_effective timestamptz DEFAULT now()) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ledger,ref,public AS $$
DECLARE d ops.decisions%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO d FROM ops.decisions WHERE id=p_decision;
 IF ref.ctx_actor()<>'ops' OR ref.ctx_user() IS DISTINCT FROM d.proposed_by OR d.kind IS DISTINCT FROM 'ledger_correction'
 OR (d.detail->>'order_id')::uuid IS DISTINCT FROM p_order THEN
 RAISE EXCEPTION 'Sai người lập hoặc phạm vi quyết định' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN ledger.post('manual_adjustment',p_order,p_idem,p_memo,p_lines,p_effective,NULL,d.approved_by,jsonb_build_object('id',d.entity_id,'decision',d.id));
END $$;
GRANT EXECUTE ON FUNCTION cmd.post_correction(uuid,uuid,text,text,jsonb,timestamptz) TO agiviet_app;

CREATE OR REPLACE FUNCTION ledger.apply_deposit_receipt(p_event uuid) RETURNS text
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
  UPDATE core.bank_events SET applied_at = now(), apply_result = 'applied', excess_vnd=least(v_ev.amount_vnd,greatest(0,v_received-v_expected)) WHERE id = p_event;
  RETURN v_new_status;
END $$;

CREATE OR REPLACE FUNCTION cmd.record_bank_event(p_webhook jsonb,p_event jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core,evt,public AS $$
DECLARE w bigint; e uuid;
BEGIN
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload)
 VALUES(p_webhook->>'provider',p_webhook->>'provider_event_id',p_webhook->>'event_type',(p_webhook->>'signature_valid')::boolean,p_webhook->'payload') RETURNING id INTO w;
 INSERT INTO core.bank_events(provider,provider_event_id,webhook_id,kind,amount_vnd,payment_ref,instruction_code,bank_txn_ref,occurred_at,
 payer_bank_code,payer_account_hash,payer_account_masked,payer_account_name,requeried_at,requery_status,requery_evidence)
 VALUES(p_webhook->>'provider',p_webhook->>'provider_event_id',w,p_event->>'kind',(p_event->>'amount_vnd')::bigint,p_event->>'payment_ref',p_event->>'instruction_code',p_event->>'bank_txn_ref',(p_event->>'occurred_at')::timestamptz,
 p_event->>'payer_bank_code',decode(p_event->>'payer_account_hash','hex'),p_event->>'payer_account_masked',p_event->>'payer_account_name',(p_event->>'requeried_at')::timestamptz,p_event->>'requery_status',p_event->'requery_evidence') RETURNING id INTO e;
 RETURN e;
END $$;
CREATE FUNCTION core.notify_privileged_grant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m core.memberships%ROWTYPE;
BEGIN
 IF EXISTS(SELECT 1 FROM ref.roles WHERE code=NEW.role_code AND (can_sign OR can_pay OR can_payout_admin)) THEN
 SELECT * INTO m FROM core.memberships WHERE id=NEW.membership_id;
 PERFORM evt.emit('organization',m.org_id,'membership.privilege_cooling',jsonb_build_object('user_id',m.user_id,'role',NEW.role_code,'effective_at',NEW.effective_at,'recipient','backup_contact'),ARRAY['notify']);
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER z_notify_grant AFTER INSERT ON core.membership_role_grants FOR EACH ROW EXECUTE FUNCTION core.notify_privileged_grant();
CREATE FUNCTION core.freeze_membership_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.org_id,NEW.user_id) IS DISTINCT FROM (OLD.org_id,OLD.user_id) THEN
 RAISE EXCEPTION 'Không chuyển danh tính thành viên mang vai sang người khác; thu hồi và cấp lại' USING HINT='ck_membership_identity'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_membership_identity BEFORE UPDATE ON core.memberships FOR EACH ROW EXECUTE FUNCTION core.freeze_membership_identity();
CREATE FUNCTION core.guard_operational_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.method='quyet_dinh_van_hanh' AND NOT EXISTS(
 SELECT 1 FROM core.order_versions v JOIN core.amendments a ON a.id=v.amendment_id JOIN ops.decisions d ON d.id=NEW.ops_decision_id
 WHERE v.document_id=NEW.document_id AND d.evidence_document_id=ANY(a.evidence_doc_ids)) THEN
 RAISE EXCEPTION 'Quyết định vận hành phải có chứng cứ thực trong đề nghị' USING HINT='ck_operational_signature'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_00_ops_evidence BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_operational_evidence();
CREATE FUNCTION core.guard_cash_receipt_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.method='cash' AND NEW.receipt_document_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM core.documents d JOIN core.direct_payments p ON p.id=NEW.direct_payment_id
 WHERE d.id=NEW.receipt_document_id AND d.doc_type='evidence' AND
 (d.order_id=p.order_id OR (p.framework_id IS NOT NULL AND d.entity_id=p.framework_id))) THEN
 RAISE EXCEPTION 'Biên nhận tiền mặt phải thuộc đúng đơn/khung' USING HINT='ck_cash_receipt_scope'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER b_cash_receipt BEFORE INSERT ON core.direct_payment_confirmations FOR EACH ROW EXECUTE FUNCTION core.guard_cash_receipt_scope();
CREATE INDEX ix_instruction_source_bank_event ON core.bank_instructions(source_bank_event_id) WHERE source_bank_event_id IS NOT NULL;
CREATE INDEX ix_membership_grant_effective ON core.membership_role_grants(membership_id,effective_at);
