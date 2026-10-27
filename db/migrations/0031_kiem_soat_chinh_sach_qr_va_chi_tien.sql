-- N-09: nội dung chính sách phải nằm trong quyết định hai người, chờ đủ 24 giờ.
ALTER TABLE core.policy_versions ADD COLUMN approval_decision_id uuid UNIQUE REFERENCES ops.decisions(id);
COMMENT ON COLUMN core.policy_versions.approval_decision_id IS 'Quyết định policy_change có detail.policy khớp toàn bộ nội dung; lịch sử nhập khẩu có thể NULL.';
CREATE FUNCTION core.guard_policy_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d ops.decisions%ROWTYPE;
BEGIN
 SELECT * INTO d FROM ops.decisions WHERE id=NEW.approval_decision_id;
 IF d.kind IS DISTINCT FROM 'policy_change' OR d.entity IS DISTINCT FROM 'policy_version'
 OR d.proposed_by IS NOT DISTINCT FROM d.approved_by
 OR d.detail->'policy' IS DISTINCT FROM to_jsonb(NEW)-'approval_decision_id'
 OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=d.proposed_by AND active)
 OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=d.approved_by AND active AND role_code='supervisor')
 OR d.created_at>now() OR NEW.effective_from<d.created_at+interval '24 hours' THEN
 RAISE EXCEPTION 'Chính sách cần quyết định hai người khớp nội dung và chờ 24 giờ' USING HINT='ck_policy_approval'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_policy_approval BEFORE INSERT ON core.policy_versions FOR EACH ROW EXECUTE FUNCTION core.guard_policy_publication();
CREATE FUNCTION core.guard_policy_effective() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.policy_versions WHERE id=NEW.policy_version_id AND effective_from<=now()) THEN
 RAISE EXCEPTION 'Chính sách chưa hiệu lực' USING HINT='ck_policy_not_effective'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_policy_effective BEFORE INSERT OR UPDATE OF policy_version_id ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_policy_effective();
CREATE TRIGGER a_policy_effective BEFORE INSERT OR UPDATE OF policy_version_id ON core.framework_contracts FOR EACH ROW EXECUTE FUNCTION core.guard_policy_effective();
-- Mọi nơi chọn chính sách mới nhất phải lọc thời điểm hiệu lực.
CREATE OR REPLACE FUNCTION ledger.check_estimated_cap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_basis text; v_cap_bps int; v_lot_qty bigint; v_promised bigint;
BEGIN
  IF NEW.to_bucket NOT IN ('held','committed') THEN RETURN NEW; END IF;
  SELECT l.qty_basis INTO v_basis FROM core.lots l WHERE l.id = NEW.lot_id;
  IF v_basis <> 'estimated' THEN RETURN NEW; END IF;
  SELECT estimated_commit_cap_bps INTO v_cap_bps FROM core.policy_versions WHERE effective_from<=now() ORDER BY effective_from DESC LIMIT 1;
  SELECT -qty INTO v_lot_qty FROM ledger.qty_balances WHERE lot_id = NEW.lot_id AND bucket = 'source';
  SELECT coalesce(sum(qty), 0) INTO v_promised FROM ledger.qty_balances
   WHERE lot_id = NEW.lot_id AND bucket IN ('held','committed','in_transit','delivered');
  IF v_promised * 10000 > v_lot_qty * coalesce(v_cap_bps, 8000) THEN
    RAISE EXCEPTION 'Lô ước tính chỉ được hứa tối đa % phần vạn (% / %)', coalesce(v_cap_bps, 8000), v_promised, v_lot_qty
      USING HINT = 'ck_qty_estimated_cap';
  END IF;
  RETURN NEW;
END $$;

-- N-04/N-12: id là jti, token nhận hàng/biên bản không được đặt thành tái sử dụng.
ALTER TABLE core.qr_tokens ADD COLUMN invited_phone_hash bytea CHECK(invited_phone_hash IS NULL OR octet_length(invited_phone_hash)=32);
COMMENT ON COLUMN core.qr_tokens.invited_phone_hash IS 'Hash số điện thoại đích, chụp khi mời; nhận lời mời cần OTP invitation_accept cùng hash và jti.';
ALTER TABLE evt.otp_challenges DROP CONSTRAINT otp_challenges_purpose_check;
ALTER TABLE evt.otp_challenges ADD CONSTRAINT otp_challenges_purpose_check CHECK(purpose IN ('contract_sign','amendment_sign','money_received','invitation_accept'));
UPDATE core.qr_tokens SET revoked_at=coalesce(revoked_at,now()) WHERE kind IN ('receipt','record','invitation') AND NOT single_use;
CREATE FUNCTION core.guard_qr_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.kind IN ('receipt','record','invitation') AND NOT NEW.single_use THEN
   RAISE EXCEPTION 'QR nhận hàng, biên bản và lời mời dùng một lần' USING HINT='ck_qr_single_use'; END IF;
  IF NEW.kind='invitation' THEN
   IF NEW.invited_phone_hash IS NULL THEN
    SELECT phone_hash INTO NEW.invited_phone_hash FROM pii.user_contacts WHERE user_id=NEW.designated_user_id AND phone_verified_at IS NOT NULL;
   END IF;
   IF NEW.invited_phone_hash IS NULL THEN RAISE EXCEPTION 'Lời mời thiếu số điện thoại đích' USING HINT='ck_invitation_phone'; END IF;
  END IF;
  IF NEW.used_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'QR mới chưa được tiêu thụ' USING HINT='ck_qr_identity'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['used_at','revoked_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['used_at','revoked_at'])
   OR OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at
   OR OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
   RAISE EXCEPTION 'Danh tính QR và trạng thái đã dùng bất biến' USING HINT='ck_qr_identity'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_qr_identity BEFORE INSERT OR UPDATE ON core.qr_tokens FOR EACH ROW EXECUTE FUNCTION core.guard_qr_identity();
CREATE TRIGGER no_delete BEFORE DELETE ON core.qr_tokens FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.invitation_binding(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('jti',id::text,'org_id',invitation_org_id::text,'phone_hash',encode(invited_phone_hash,'hex')) FROM core.qr_tokens WHERE id=p_id AND kind='invitation'
$$;
CREATE FUNCTION core.scan_qr(p_token text,p_device text,p_otp text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE q core.qr_tokens%ROWTYPE; r text;
BEGIN
 SELECT * INTO q FROM core.qr_tokens WHERE token_hash=digest(p_token,'sha256') FOR UPDATE;
 r:=CASE WHEN q.id IS NULL THEN 'unknown' WHEN q.revoked_at IS NOT NULL THEN 'revoked'
 WHEN q.expires_at<=ref.clock_at() THEN 'expired' WHEN q.single_use AND q.used_at IS NOT NULL THEN 'used'
 WHEN q.designated_user_id IS NOT NULL AND q.designated_user_id IS DISTINCT FROM ref.ctx_user() THEN 'wrong_user'
 WHEN q.kind='invitation' AND NOT EXISTS(SELECT 1 FROM pii.user_contacts WHERE user_id=ref.ctx_user() AND phone_verified_at IS NOT NULL AND phone_hash=q.invited_phone_hash) THEN 'wrong_user'
 ELSE 'accepted' END;
 IF r='accepted' AND q.kind='invitation' THEN
  PERFORM evt.consume_otp(p_otp,ref.ctx_user(),'invitation_accept',core.invitation_binding(q.id));
 END IF;
 INSERT INTO evt.qr_scans(token_id,actor_user_id,result,device_id,scanned_at) VALUES(q.id,ref.ctx_user(),r,p_device,ref.clock_at());
 IF r='accepted' AND q.single_use THEN UPDATE core.qr_tokens SET used_at=ref.clock_at() WHERE id=q.id; END IF;
 RETURN r;
END $$;
CREATE OR REPLACE FUNCTION core.scan_qr(p_token text,p_device text) RETURNS text LANGUAGE sql AS $$ SELECT core.scan_qr(p_token,p_device,NULL) $$;
CREATE FUNCTION cmd.scan_qr(p_token text,p_device text,p_otp text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,cmd,core,evt,pii,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor(); RETURN core.scan_qr(p_token,p_device,p_otp);
END $$;
GRANT EXECUTE ON FUNCTION cmd.scan_qr(text,text,text) TO agiviet_app;

-- N-02/N-14: biên nhận đúng đơn, có hai bên ký; cờ tiền mặt theo từng lần nhận.
CREATE OR REPLACE FUNCTION core.guard_cash_receipt_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.method='cash' AND NEW.receipt_document_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM core.documents d JOIN core.direct_payments p ON p.id=NEW.direct_payment_id
 WHERE d.id=NEW.receipt_document_id AND d.doc_type='evidence' AND
 (d.order_id=p.order_id OR (p.framework_id IS NOT NULL AND d.entity_id=p.framework_id))) THEN
 RAISE EXCEPTION 'Biên nhận tiền mặt phải thuộc đúng đơn/khung' USING HINT='ck_cash_receipt_scope'; END IF;
 IF NEW.method='cash' AND NEW.amount_vnd>0 AND NEW.receipt_document_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM core.documents WHERE id=NEW.receipt_document_id AND canonical_content->>'payment_id'=NEW.direct_payment_id::text
 AND canonical_content->>'amount_vnd'=NEW.amount_vnd::text) THEN
 RAISE EXCEPTION 'Biên nhận không khớp khoản và số tiền' USING HINT='ck_cash_receipt_binding'; END IF;
 IF NEW.method='cash' AND NEW.amount_vnd>0 AND NEW.receipt_document_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM core.direct_payments p JOIN core.signatures a ON a.document_id=NEW.receipt_document_id
 JOIN core.signatures b ON b.document_id=a.document_id AND b.signer_org_id=p.payee_org_id
 WHERE p.id=NEW.direct_payment_id AND a.signer_org_id=p.payer_org_id AND a.party IN ('buyer','seller') AND b.party IN ('buyer','seller')
 AND a.method='otp' AND b.method='otp' AND a.signer_user_id<>b.signer_user_id) THEN
 RAISE EXCEPTION 'Biên nhận tiền mặt cần hai bên ký có xác thực' USING HINT='ck_cash_receipt_signatures'; END IF;
 RETURN NEW;
END $$;
ALTER TABLE core.direct_payment_confirmations ADD COLUMN cash_warning boolean GENERATED ALWAYS AS (method='cash' AND amount_vnd>=20000000) STORED;
COMMENT ON COLUMN core.direct_payment_confirmations.cash_warning IS 'N-14: từ 20 triệu VND mỗi lần tiền mặt, cảnh báo không chặn.';
CREATE FUNCTION core.flag_large_cash() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p core.direct_payments%ROWTYPE;
BEGIN
 IF NEW.cash_warning THEN
  SELECT * INTO p FROM core.direct_payments WHERE id=NEW.direct_payment_id;
  INSERT INTO ops.anomaly_flags(rule_code,org_id,order_id,evidence,severity)
  VALUES('cash_ge_20m',p.payee_org_id,p.order_id,jsonb_build_object('confirmation_id',NEW.id,'payment_id',p.id,'amount_vnd',NEW.amount_vnd,'warning_only',true),1);
  PERFORM evt.emit('direct_payment',p.id,'payment.cash_warning',jsonb_build_object('confirmation_id',NEW.id,'amount_vnd',NEW.amount_vnd),ARRAY['notify']);
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER z_cash_warning AFTER INSERT ON core.direct_payment_confirmations FOR EACH ROW EXECUTE FUNCTION core.flag_large_cash();

-- N-15: tổ hợp tác không đứng ra nhận tiền chung; HTX pháp nhân vẫn được nhận.
CREATE FUNCTION core.guard_no_group_money() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recipient uuid; row_data jsonb:=to_jsonb(NEW);
BEGIN
 recipient:=(row_data->>CASE TG_TABLE_NAME WHEN 'bank_accounts' THEN 'org_id' WHEN 'bank_instructions' THEN 'target_org_id'
 WHEN 'direct_payments' THEN 'payee_org_id' WHEN 'confirmed_external_transfers' THEN 'payee_org_id'
 ELSE 'seller_org_id' END)::uuid;
 PERFORM 1 FROM core.organizations WHERE id=recipient FOR SHARE;
 IF EXISTS(SELECT 1 FROM core.organizations WHERE id=recipient AND kind='coop_group') THEN
 RAISE EXCEPTION 'Tổ hợp tác phải dùng đơn con và tài khoản từng hộ' USING HINT='ck_coop_group_money'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_no_group_money BEFORE INSERT OR UPDATE ON pii.bank_accounts FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE TRIGGER a_00_no_group_money BEFORE INSERT OR UPDATE ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE TRIGGER a_00_no_group_money BEFORE INSERT OR UPDATE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE TRIGGER a_00_no_group_money BEFORE INSERT ON core.confirmed_external_transfers FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE TRIGGER a_00_no_group_money BEFORE INSERT OR UPDATE OF seller_org_id ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE TRIGGER a_00_no_group_money BEFORE INSERT OR UPDATE OF seller_org_id ON core.framework_contracts FOR EACH ROW EXECUTE FUNCTION core.guard_no_group_money();
CREATE FUNCTION core.freeze_org_kind() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.kind IS DISTINCT FROM OLD.kind THEN RAISE EXCEPTION 'Loại pháp lý tổ chức bất biến; lập tổ chức mới' USING HINT='ck_org_kind_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_org_kind BEFORE UPDATE OF kind ON core.organizations FOR EACH ROW EXECUTE FUNCTION core.freeze_org_kind();

-- D-07/D-18: giữ lệnh >=20 triệu tới tài khoản mới dưới 72 giờ để gọi lại.
CREATE FUNCTION pii.stamp_bank_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='active' AND (TG_OP='INSERT' OR OLD.status<>'active') THEN NEW.activated_at:=now();
 ELSIF TG_OP='UPDATE' AND NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
 RAISE EXCEPTION 'Không đổi thời điểm kích hoạt tài khoản' USING HINT='ck_bank_activation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_activation_clock BEFORE INSERT OR UPDATE ON pii.bank_accounts FOR EACH ROW EXECUTE FUNCTION pii.stamp_bank_activation();
ALTER TABLE core.bank_instructions ADD COLUMN callback_required boolean NOT NULL DEFAULT false;
ALTER TABLE core.bank_instructions ADD COLUMN target_activated_at timestamptz;
COMMENT ON COLUMN core.bank_instructions.callback_required IS 'Từ 20 triệu và tài khoản kích hoạt dưới 72 giờ hoặc không rõ giờ: giữ created tới khi có chứng cứ gọi lại.';
COMMENT ON COLUMN core.bank_instructions.target_activated_at IS 'Snapshot do DB lấy từ tài khoản đích; không do bên lập lệnh khai.';
CREATE TABLE ops.payout_callbacks (
 instruction_id uuid PRIMARY KEY REFERENCES core.bank_instructions,
 bank_account_id uuid NOT NULL REFERENCES pii.bank_accounts,
 contact_user_id uuid NOT NULL REFERENCES core.users,
 contact_phone_hash bytea NOT NULL CHECK(octet_length(contact_phone_hash)=32),
 confirmed_by uuid NOT NULL REFERENCES core.users,
 call_id uuid NOT NULL REFERENCES ops.calls,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE ops.payout_callbacks IS 'Chứng cứ gọi lại số đã xác minh để nhả lệnh tài khoản mới; chỉ finance/risk, không phải supervisor.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.payout_callbacks FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.payout_needs_callback(p_amount bigint,p_activated timestamptz,p_at timestamptz) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT p_amount>=20000000 AND (p_activated IS NULL OR p_activated>p_at-interval '72 hours')
$$;
CREATE FUNCTION core.guard_instruction_callback() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  SELECT activated_at INTO NEW.target_activated_at FROM pii.bank_accounts WHERE id=NEW.target_bank_account_id;
  NEW.callback_required:=(NEW.kind='release_deposit_to_seller' OR NEW.target_bank_account_id IS NOT NULL) AND core.payout_needs_callback(NEW.amount_vnd,NEW.target_activated_at,now());
 ELSE
  IF (NEW.callback_required,NEW.target_activated_at) IS DISTINCT FROM (OLD.callback_required,OLD.target_activated_at) THEN
   RAISE EXCEPTION 'Không sửa điều kiện giữ lệnh' USING HINT='ck_instruction_callback'; END IF;
 END IF;
 IF NEW.callback_required AND NEW.status<>'created' AND NOT EXISTS(SELECT 1 FROM ops.payout_callbacks WHERE instruction_id=NEW.id) THEN
 RAISE EXCEPTION 'Lệnh tài khoản mới đang chờ gọi lại' USING HINT='ck_instruction_callback'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_callback BEFORE INSERT OR UPDATE ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_instruction_callback();
CREATE FUNCTION ops.guard_payout_callback() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b core.bank_instructions%ROWTYPE;
BEGIN
 SELECT * INTO b FROM core.bank_instructions WHERE id=NEW.instruction_id FOR UPDATE;
 IF NOT b.callback_required OR b.status<>'created' OR NEW.bank_account_id IS DISTINCT FROM b.target_bank_account_id
 OR ref.ctx_actor()<>'ops' OR NEW.confirmed_by IS DISTINCT FROM ref.ctx_user()
 OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.confirmed_by AND active AND role_code IN ('finance','risk'))
 OR NOT EXISTS(SELECT 1 FROM pii.user_contacts c JOIN core.memberships m ON m.user_id=c.user_id JOIN core.membership_roles r ON r.membership_id=m.id
  WHERE c.user_id=NEW.contact_user_id AND c.phone_hash=NEW.contact_phone_hash AND c.phone_verified_at IS NOT NULL
  AND m.org_id=b.target_org_id AND m.status='active' AND r.role_code='owner')
 OR NOT EXISTS(SELECT 1 FROM ops.calls c JOIN ops.tasks t ON t.id=c.task_id WHERE c.id=NEW.call_id
  AND c.caller_user_id=NEW.confirmed_by AND c.callee_user_id=NEW.contact_user_id AND c.duration_seconds>0
  AND c.at>=b.created_at AND c.at<=now() AND t.entity='bank_instruction' AND t.entity_id=b.id) THEN
 RAISE EXCEPTION 'Gọi lại cần finance/risk và cuộc gọi đúng chủ, số đã xác minh, đúng lệnh' USING HINT='ck_payout_callback_proof'; END IF;
 NEW.created_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER a_proof BEFORE INSERT ON ops.payout_callbacks FOR EACH ROW EXECUTE FUNCTION ops.guard_payout_callback();
CREATE FUNCTION cmd.confirm_payout_callback(p_instruction uuid,p_contact uuid,p_call uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,cmd,core,ops,pii,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor();
 INSERT INTO ops.payout_callbacks(instruction_id,bank_account_id,contact_user_id,contact_phone_hash,confirmed_by,call_id)
 SELECT b.id,b.target_bank_account_id,p_contact,c.phone_hash,ref.ctx_user(),p_call
 FROM core.bank_instructions b JOIN pii.user_contacts c ON c.user_id=p_contact WHERE b.id=p_instruction;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có lệnh hoặc liên hệ' USING HINT='ck_payout_callback_proof'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION cmd.confirm_payout_callback(uuid,uuid,uuid) TO agiviet_app;
ALTER TABLE ops.payout_callbacks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ops.payout_callbacks FROM PUBLIC,agiviet_app,agiviet_worker,agiviet_bank_worker,agiviet_auth_worker;
REVOKE ALL ON FUNCTION core.scan_qr(text,text,text),core.invitation_binding(uuid),core.guard_qr_identity(),core.guard_policy_publication(),core.guard_policy_effective(),core.guard_no_group_money(),core.freeze_org_kind(),core.flag_large_cash(),core.guard_instruction_callback(),pii.stamp_bank_activation(),ops.guard_payout_callback() FROM PUBLIC;

CREATE FUNCTION core.queue_payout_callback() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sla ref.sla_policies%ROWTYPE;
BEGIN
 IF NEW.callback_required THEN
  SELECT * INTO sla FROM ref.sla_policies WHERE priority=1;
  INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,order_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
  VALUES('CB-'||NEW.id,'V08',1,'bank_instruction',NEW.id,NEW.order_id,'finance','payout-callback:'||NEW.id,'Tài khoản mới, lệnh từ 20 triệu',
  now()+sla.response_minutes*interval '1 minute',now()+sla.resolution_minutes*interval '1 minute',now()+sla.update_minutes*interval '1 minute');
  PERFORM evt.emit('bank_instruction',NEW.id,'instruction.callback_required',jsonb_build_object('amount_vnd',NEW.amount_vnd),ARRAY['notify']);
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER z_callback_task AFTER INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.queue_payout_callback();
CREATE FUNCTION ledger.guard_group_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.amount_vnd>0 AND EXISTS(SELECT 1 FROM ledger.accounts a JOIN core.organizations o ON o.id=a.org_id WHERE a.id=NEW.account_id AND a.account_type='external' AND o.kind='coop_group') THEN
 RAISE EXCEPTION 'Không ghi nhận tiền chung cho tổ hợp tác' USING HINT='ck_coop_group_money'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_00_no_group_receipt BEFORE INSERT ON ledger.entries FOR EACH ROW EXECUTE FUNCTION ledger.guard_group_receipt();
REVOKE ALL ON FUNCTION core.payout_needs_callback(bigint,timestamptz,timestamptz),core.queue_payout_callback(),ledger.guard_group_receipt() FROM PUBLIC;

-- N-02/N-06: quyết định vận hành không thay được OTP người nhận hoặc tra soát ngân hàng.
ALTER TABLE core.direct_payment_confirmations ADD COLUMN bank_evidence_id uuid UNIQUE REFERENCES core.bank_events;
COMMENT ON COLUMN core.direct_payment_confirmations.bank_evidence_id IS 'Ngoại lệ đối soát: statement_line do bank worker tra API, gắn khoản/số tiền/phiên bản/người nhận; không dùng ảnh hay cuộc gọi làm kết luận.';
CREATE OR REPLACE FUNCTION core.consume_payment_otp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; p core.direct_payments%ROWTYPE;
BEGIN
 IF NEW.amount_vnd>0 THEN
  IF NEW.ops_decision_by IS NULL THEN
   PERFORM evt.consume_otp(NEW.otp_challenge_id,NEW.confirmed_by,'money_received',core.payment_binding(NEW.direct_payment_id,NEW.amount_vnd));
  ELSE
   SELECT * INTO e FROM core.bank_events WHERE id=NEW.bank_evidence_id FOR UPDATE;
   SELECT * INTO p FROM core.direct_payments WHERE id=NEW.direct_payment_id;
   IF e.id IS NULL OR e.kind<>'statement_line' OR e.amount_vnd IS DISTINCT FROM NEW.amount_vnd OR e.requery_status IS DISTINCT FROM 'confirmed'
    OR e.requeried_at IS NULL OR e.bank_txn_ref IS DISTINCT FROM NEW.bank_txn_ref OR nullif(btrim(e.bank_txn_ref),'') IS NULL
    OR e.requery_evidence->'payment_binding' IS DISTINCT FROM core.payment_binding(p.id,NEW.amount_vnd)
    OR e.requery_evidence->>'recipient_org_id' IS DISTINCT FROM p.payee_org_id::text OR e.requery_evidence->>'direction' IS DISTINCT FROM 'credit'
    OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=e.webhook_id AND signature_valid AND provider=e.provider AND provider_event_id=e.provider_event_id)
    OR NEW.confirmed_by IS DISTINCT FROM ref.ctx_user()
    OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.confirmed_by AND active AND role_code IN ('finance','risk')) THEN
    RAISE EXCEPTION 'Đối soát nhận tiền phải có bằng chứng API khớp khoản và người nhận' USING HINT='ck_payment_bank_proof'; END IF;
  END IF;
 END IF; RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION cmd.scan_qr(text,text,text),cmd.confirm_payout_callback(uuid,uuid,uuid) FROM PUBLIC;
