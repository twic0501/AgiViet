-- D-03, D-04, D-11: chứng cứ phê duyệt và phạm vi tiền được kiểm ngay tại DB.
ALTER TABLE ledger.transactions ADD COLUMN decision_id uuid REFERENCES ops.decisions(id);
CREATE UNIQUE INDEX uq_ledger_decision ON ledger.transactions(decision_id) WHERE decision_id IS NOT NULL;
CREATE FUNCTION ledger.guard_correction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d ops.decisions%ROWTYPE;
BEGIN
 IF EXISTS(SELECT 1 FROM ref.ledger_txn_kinds WHERE code=NEW.kind AND money_type='correction') THEN
  SELECT * INTO d FROM ops.decisions WHERE id=NEW.decision_id;
  IF NEW.posted_by IS NULL OR NEW.approved_by IS NULL OR NEW.posted_by=NEW.approved_by
   OR d.kind IS DISTINCT FROM 'ledger_correction' OR d.entity IS DISTINCT FROM 'ledger_transaction'
   OR d.entity_id IS DISTINCT FROM NEW.id OR d.proposed_by IS DISTINCT FROM NEW.posted_by OR d.approved_by IS DISTINCT FROM NEW.approved_by
   OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.posted_by AND active AND role_code='finance')
   OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.approved_by AND active AND role_code IN ('finance','supervisor')) THEN
   RAISE EXCEPTION 'Điều chỉnh cần quyết định tài chính, người lập và duyệt khác nhau' USING HINT='ck_ledger_approval'; END IF;
 END IF;
 IF abs(extract(epoch FROM NEW.effective_at-NEW.posted_at))>604800 AND NOT EXISTS(
  SELECT 1 FROM ops.decisions WHERE id=NEW.decision_id AND kind='ledger_correction' AND entity='ledger_transaction' AND entity_id=NEW.id
   AND proposed_by=NEW.posted_by AND approved_by=NEW.approved_by AND detail->>'allow_backdate'='true') THEN
  RAISE EXCEPTION 'Ngày hiệu lực ngoài cửa sổ 7 ngày cần quyết định' USING HINT='ck_ledger_effective_window'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_correction BEFORE INSERT ON ledger.transactions FOR EACH ROW EXECUTE FUNCTION ledger.guard_correction();
CREATE FUNCTION ledger.check_entry_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t ledger.transactions%ROWTYPE; a ledger.accounts%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO t FROM ledger.transactions WHERE id=NEW.transaction_id;
 SELECT * INTO a FROM ledger.accounts WHERE id=NEW.account_id;
 IF t.order_id IS NOT NULL THEN
  SELECT * INTO o FROM core.orders WHERE id=t.order_id;
  IF (a.order_id IS NOT NULL AND a.order_id<>t.order_id)
   OR (a.framework_id IS NOT NULL AND a.framework_id IS DISTINCT FROM o.framework_id)
   OR (a.account_type IN ('deposit_escrow','deposit_in_instruction','fee_held','fee_in_instruction') AND a.order_id IS DISTINCT FROM t.order_id)
   OR (a.account_type='external' AND a.org_id NOT IN (o.buyer_org_id,o.seller_org_id)) THEN
   RAISE EXCEPTION 'Bút toán chạm cọc hoặc tổ chức ngoài đơn' USING HINT='ck_ledger_order_scope'; END IF;
 ELSIF a.order_id IS NOT NULL OR (a.framework_id IS NOT NULL AND a.framework_id IS DISTINCT FROM t.framework_id) THEN
  RAISE EXCEPTION 'Giao dịch thiếu phạm vi đơn/khung của tài khoản' USING HINT='ck_ledger_order_scope';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER entry_scope AFTER INSERT ON ledger.entries DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION ledger.check_entry_scope();

-- D-07, D-17, D-18. Hoàn về chính tài khoản nguồn của sự kiện đã đối chiếu.
ALTER TABLE core.bank_events ADD COLUMN payer_account_hash bytea;
ALTER TABLE core.bank_events ADD COLUMN payer_account_masked text;
ALTER TABLE core.bank_events ADD COLUMN payer_account_name text;
ALTER TABLE core.bank_events ADD CONSTRAINT ck_payer_account CHECK(payer_account_hash IS NULL OR (octet_length(payer_account_hash)=32 AND payer_account_masked IS NOT NULL AND payer_account_name IS NOT NULL));
ALTER TABLE core.bank_instructions ADD COLUMN source_bank_event_id uuid REFERENCES core.bank_events(id);
ALTER TABLE core.bank_instructions ADD COLUMN target_account_hash bytea;
CREATE FUNCTION core.guard_instruction_destination() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v core.order_versions%ROWTYPE; e core.bank_events%ROWTYPE; available bigint; used bigint;
BEGIN
 IF NEW.kind='release_deposit_to_seller' THEN
  SELECT ov.* INTO v FROM core.orders o JOIN core.order_versions ov ON ov.order_id=o.id AND ov.version_no=o.effective_version_no WHERE o.id=NEW.order_id;
  IF NEW.target_bank_account_id IS NULL OR NEW.target_bank_account_id IS DISTINCT FROM v.seller_bank_account_id
   OR (NEW.target_bank_code,NEW.target_account_masked,NEW.target_account_holder) IS DISTINCT FROM (v.seller_bank_code,v.seller_account_masked,v.seller_account_holder) THEN
   RAISE EXCEPTION 'Đích chi phải là tài khoản trong phiên bản đã ký' USING HINT='ck_instruction_signed_account'; END IF;
 END IF;
 IF NEW.kind LIKE 'refund_%' THEN
  SELECT * INTO e FROM core.bank_events WHERE id=NEW.source_bank_event_id FOR UPDATE;
  IF e.id IS NULL OR e.kind<>'deposit_received' OR e.applied_at IS NULL OR e.payer_account_hash IS NULL
   OR NEW.target_account_hash IS DISTINCT FROM e.payer_account_hash
   OR NEW.target_account_masked IS DISTINCT FROM e.payer_account_masked
   OR NEW.target_account_holder IS DISTINCT FROM e.payer_account_name
   OR NOT EXISTS(SELECT 1 FROM core.deposits d WHERE d.id=NEW.deposit_id AND (d.payment_ref=e.payment_ref OR EXISTS(SELECT 1 FROM core.deposit_adjustments x WHERE x.deposit_id=d.id AND x.payment_ref=e.payment_ref))) THEN
   RAISE EXCEPTION 'Hoàn tiền phải về tài khoản nguồn đã xác nhận' USING HINT='ck_refund_source'; END IF;
  SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE source_bank_event_id=e.id AND status<>'failed';
  IF used+NEW.amount_vnd>e.amount_vnd THEN RAISE EXCEPTION 'Hoàn quá tiền nguồn' USING HINT='ck_refund_source'; END IF;
 END IF;
 IF NEW.basis_kind='excess' THEN
  SELECT * INTO e FROM core.bank_events WHERE id=NEW.basis_id FOR UPDATE;
  SELECT greatest(0,coalesce(sum(en.amount_vnd),0)-d.expected_deposit_vnd-d.expected_fee_vnd
   -coalesce((SELECT sum(greatest(delta_deposit_vnd,0)+greatest(delta_fee_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=d.id),0)) INTO available
   FROM core.deposits d LEFT JOIN core.bank_events be ON be.payment_ref=d.payment_ref AND be.apply_result='applied'
   LEFT JOIN ledger.transactions t ON t.bank_event_id=be.id AND t.kind='deposit_receipt'
   LEFT JOIN ledger.entries en ON en.transaction_id=t.id AND en.amount_vnd>0
   WHERE d.id=NEW.deposit_id GROUP BY d.id;
  SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE deposit_id=NEW.deposit_id AND basis_kind='excess' AND status<>'failed';
  IF NEW.kind<>'refund_excess' OR e.id IS NULL OR NEW.source_bank_event_id IS DISTINCT FROM e.id OR NEW.amount_vnd+used>coalesce(available,0) THEN
   RAISE EXCEPTION 'Không có tiền thừa đủ cho căn cứ hoàn' USING HINT='ck_instruction_excess'; END IF;
 END IF;

 RETURN NEW;
END $$;
CREATE TRIGGER a_destination BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_instruction_destination();
-- Các trường đích mới cũng bất biến.
CREATE FUNCTION core.freeze_refund_destination() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.source_bank_event_id,NEW.target_account_hash) IS DISTINCT FROM (OLD.source_bank_event_id,OLD.target_account_hash) THEN
 RAISE EXCEPTION 'Không đổi nguồn/đích lệnh' USING HINT='ck_instruction_frozen'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_destination_frozen BEFORE UPDATE ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.freeze_refund_destination();

-- D-14: kiểm cả hai hướng cấp vai và cấp ủy quyền, khóa tổ chức chống đua.
ALTER TABLE core.membership_roles ADD COLUMN effective_at timestamptz NOT NULL DEFAULT now();
CREATE FUNCTION core.guard_privileged_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m core.memberships%ROWTYPE;
BEGIN
 SELECT * INTO m FROM core.memberships WHERE id=NEW.membership_id;
 PERFORM 1 FROM core.organizations WHERE id=m.org_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM ref.roles WHERE code=NEW.role_code AND (can_sign OR can_pay OR can_payout_admin)) THEN
  IF EXISTS(SELECT 1 FROM core.delegations WHERE org_id=m.org_id AND helper_user_id=m.user_id AND revoked_at IS NULL AND upper(valid_during)>now()) THEN
   RAISE EXCEPTION 'Người giúp không kiêm vai tiền/chữ ký trong cùng hộ' USING HINT='ck_helper_privileged_role'; END IF;
  IF NEW.granted_by IS NULL OR NEW.granted_by IS DISTINCT FROM ref.ctx_user() OR NOT EXISTS(
   SELECT 1 FROM core.memberships p JOIN core.membership_roles r ON r.membership_id=p.id
   WHERE p.org_id=m.org_id AND p.user_id=NEW.granted_by AND p.status='active' AND r.role_code='owner' AND r.effective_at<=now()) THEN
   RAISE EXCEPTION 'Chỉ chủ hiện hành được cấp vai đặc quyền' USING HINT='ck_role_grant_owner'; END IF;
  NEW.effective_at:=greatest(NEW.effective_at,now()+interval '24 hours');
  PERFORM evt.audit('membership.privilege_cooling','organization',m.org_id,jsonb_build_object('user',m.user_id,'effective_at',NEW.effective_at,'notify','backup_contact'));
 END IF;
 RETURN NEW;
END $$;
-- Seed import dưới owner tạm tắt riêng trigger này để nạp vai lịch sử; runtime không có ALTER TABLE.
CREATE TRIGGER a_privilege BEFORE INSERT OR UPDATE ON core.membership_roles FOR EACH ROW EXECUTE FUNCTION core.guard_privileged_membership();
CREATE FUNCTION core.guard_helper_conflict() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM core.organizations WHERE id=NEW.org_id FOR UPDATE;
 IF NEW.revoked_at IS NULL AND EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id JOIN ref.roles r ON r.code=mr.role_code
 WHERE m.org_id=NEW.org_id AND m.user_id=NEW.helper_user_id AND m.status='active' AND (r.can_sign OR r.can_pay OR r.can_payout_admin)) THEN
 RAISE EXCEPTION 'Vai chủ và người giúp không được chồng nhau' USING HINT='ck_helper_privileged_role'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_helper_conflict BEFORE INSERT OR UPDATE ON core.delegations FOR EACH ROW EXECUTE FUNCTION core.guard_helper_conflict();

CREATE OR REPLACE FUNCTION ledger.post_internal(p_kind text, p_order uuid, p_idem text, p_memo text, p_lines jsonb,
                            p_effective_at timestamptz DEFAULT now(),
                            p_reverses uuid DEFAULT NULL, p_approved_by uuid DEFAULT NULL,
                            p_refs jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_txn uuid; v_line jsonb; v_no int := 0;
BEGIN
  SELECT id INTO v_txn FROM ledger.transactions WHERE idempotency_key = p_idem;
  IF v_txn IS NOT NULL THEN RETURN v_txn; END IF;

  INSERT INTO ledger.transactions (id,decision_id,kind, order_id, framework_id, idempotency_key, reverses_id, memo, effective_at, posted_by, approved_by, request_id,
                                   bank_event_id, bank_instruction_id, dp_confirmation_id, settlement_id)
  VALUES (coalesce((p_refs->>'id')::uuid,gen_random_uuid()),(p_refs->>'decision')::uuid,p_kind, p_order, (p_refs->>'framework')::uuid, p_idem, p_reverses, p_memo, p_effective_at, ref.ctx_user(), p_approved_by, ref.ctx('request_id'),
          (p_refs->>'bank_event')::uuid, (p_refs->>'bank_instruction')::uuid, (p_refs->>'dp_confirmation')::uuid, (p_refs->>'settlement')::uuid)
  RETURNING id INTO v_txn;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_no := v_no + 1;
    INSERT INTO ledger.entries (transaction_id, line_no, account_id, amount_vnd)
    VALUES (v_txn, v_no,
            ledger.account_of(v_line->>'type', (v_line->>'org')::uuid, (v_line->>'order')::uuid, (v_line->>'framework')::uuid),
            (v_line->>'amount')::bigint);
  END LOOP;
  RETURN v_txn;
END $$;
