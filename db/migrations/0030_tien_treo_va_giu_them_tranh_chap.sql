-- N-01/N-13: tiền chưa đủ C+F và tiền thừa không nằm trong C.
INSERT INTO ref.ledger_account_types VALUES
 ('deposit_pending','Tiền treo chờ đủ cọc và phí / chờ hoàn nguồn','order',true),
 ('excess_held','Tiền nộp thừa chờ hoàn nguồn','order',true),
 ('excess_in_instruction','Tiền thừa đang trong lệnh hoàn nguồn','order',true);
INSERT INTO ref.ledger_txn_kinds VALUES
 ('deposit_allocation','Chuyển tiền treo đủ điều kiện thành cọc, phí và tiền thừa','deposit'),
 ('deposit_reclassification','Phân loại số dư trước nâng cấp N-01/N-13','deposit'),
 ('suspense_return','Hoàn tiền treo về nguồn đã tra lại ngân hàng','deposit');
UPDATE ref.bank_instruction_kinds SET source='excess_held' WHERE code='refund_excess';

-- Nâng cấp giữ nguyên entries cũ, ghi bút toán phân loại có khóa ổn định.
DO $$ DECLARE d core.deposits%ROWTYPE; pending bigint; excess bigint; lines jsonb;
BEGIN
 FOR d IN SELECT * FROM core.deposits LOOP
  SELECT coalesce(sum(balance_vnd),0) INTO pending FROM ledger.v_account_balances
   WHERE account_type='deposit_escrow' AND order_id IS NOT DISTINCT FROM d.order_id AND framework_id IS NOT DISTINCT FROM d.framework_id;
  IF d.status<>'partially_received' THEN pending:=0; END IF;
  SELECT coalesce(sum(e.excess_vnd),0)-coalesce((SELECT sum(b.amount_vnd) FROM core.bank_instructions b
    WHERE b.deposit_id=d.id AND b.kind='refund_excess' AND b.status IN ('succeeded','reconciled')),0)
   INTO excess FROM core.bank_events e WHERE e.applied_at IS NOT NULL AND e.apply_result='applied'
    AND (e.payment_ref=d.payment_ref OR e.payment_ref IN (SELECT payment_ref FROM core.deposit_adjustments WHERE deposit_id=d.id));
  -- Không đổi nguồn của lệnh đang chạy; yêu cầu đối soát trước nâng cấp thay vì bịa lịch sử.
  IF excess>0 AND EXISTS(SELECT 1 FROM core.bank_instructions WHERE deposit_id=d.id AND kind='refund_excess' AND status IN ('created','sent','processing')) THEN
   RAISE EXCEPTION 'Đối soát lệnh hoàn thừa đang chạy trước migration 0030: %',d.id;
  END IF;
  IF pending>0 OR excess>0 THEN
   lines:=jsonb_build_array(jsonb_build_object('type','deposit_escrow','order',d.order_id,'framework',d.framework_id,'amount',-(pending+greatest(excess,0))));
   IF pending>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('type','deposit_pending','order',d.order_id,'framework',d.framework_id,'amount',pending)); END IF;
   IF excess>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('type','excess_held','order',d.order_id,'framework',d.framework_id,'amount',excess)); END IF;
   PERFORM ledger.post('deposit_reclassification',d.order_id,'n01-n13:'||d.id,'Phân loại tiền treo/thừa khi nâng cấp',lines,now(),NULL,NULL,jsonb_build_object('framework',d.framework_id));
  END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION ledger.apply_deposit_receipt(p_event uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; d core.deposits%ROWTYPE; c bigint; f bigint; allocated_c bigint; allocated_f bigint;
 pending bigint; need_c bigint; need_f bigint; excess bigint; late boolean; result text; lines jsonb;
BEGIN
 SELECT * INTO e FROM core.bank_events WHERE id=p_event FOR UPDATE;
 IF e.applied_at IS NOT NULL THEN RETURN 'duplicate_ignored'; END IF;
 IF e.kind IS DISTINCT FROM 'deposit_received' OR e.requery_status IS DISTINCT FROM 'confirmed'
  OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=e.webhook_id AND signature_valid) THEN
  RAISE EXCEPTION 'Nhận tiền cần bằng chứng API ngân hàng' USING HINT='ck_bank_requery'; END IF;
 SELECT * INTO d FROM core.deposits WHERE payment_ref=e.payment_ref OR id IN
  (SELECT deposit_id FROM core.deposit_adjustments WHERE payment_ref=e.payment_ref) FOR UPDATE;
 IF d.id IS NULL THEN
  PERFORM ledger.post('unmatched_receipt',NULL,'bankev:'||e.id,'Tiền vào chưa khớp',
   jsonb_build_array(jsonb_build_object('type','suspense','amount',e.amount_vnd),jsonb_build_object('type','external_unidentified','amount',-e.amount_vnd)),
   e.occurred_at,NULL,NULL,jsonb_build_object('bank_event',e.id));
  UPDATE core.bank_events SET applied_at=now(),apply_result='unmatched_suspense' WHERE id=e.id;
  RETURN 'unmatched';
 END IF;
 PERFORM 1 FROM core.orders WHERE id=d.order_id FOR UPDATE;
 late:=EXISTS(SELECT 1 FROM core.orders WHERE id=d.order_id AND status IN ('closed','completed')) OR d.status IN ('processing','fully_processed','void');
 PERFORM ledger.post('deposit_receipt',d.order_id,'bankev:'||e.id,'Tiền vào ngăn treo: '||d.payment_ref,
  jsonb_build_array(jsonb_build_object('type','deposit_pending','order',d.order_id,'framework',d.framework_id,'amount',e.amount_vnd),
   jsonb_build_object('type','external','org',d.payer_org_id,'amount',-e.amount_vnd)),
  e.occurred_at,NULL,NULL,jsonb_build_object('bank_event',e.id,'framework',d.framework_id));
 IF late THEN
  UPDATE core.bank_events SET applied_at=now(),apply_result='late_after_closed' WHERE id=e.id;
  INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason) VALUES(e.id,d.id,'late_after_closed');
  RETURN 'late_after_closed';
 END IF;
 c:=d.expected_deposit_vnd+coalesce((SELECT sum(greatest(delta_deposit_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=d.id),0);
 f:=d.expected_fee_vnd+coalesce((SELECT sum(greatest(delta_fee_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=d.id),0);
 SELECT coalesce(sum(en.amount_vnd) FILTER(WHERE a.account_type='deposit_escrow'),0),
        coalesce(sum(en.amount_vnd) FILTER(WHERE a.account_type='fee_held'),0)
 INTO allocated_c,allocated_f FROM ledger.entries en JOIN ledger.accounts a ON a.id=en.account_id JOIN ledger.transactions t ON t.id=en.transaction_id
 WHERE a.order_id IS NOT DISTINCT FROM d.order_id AND a.framework_id IS NOT DISTINCT FROM d.framework_id
 AND t.kind IN ('deposit_receipt','fee_capture','deposit_allocation','deposit_reclassification');
 need_c:=greatest(0,c-allocated_c); need_f:=greatest(0,f-allocated_f);
 SELECT coalesce(sum(balance_vnd),0) INTO pending FROM ledger.v_account_balances
 WHERE account_type='deposit_pending' AND order_id IS NOT DISTINCT FROM d.order_id AND framework_id IS NOT DISTINCT FROM d.framework_id;
 IF pending>=need_c+need_f THEN
  excess:=pending-need_c-need_f;
  lines:=jsonb_build_array(jsonb_build_object('type','deposit_pending','order',d.order_id,'framework',d.framework_id,'amount',-pending));
  IF need_c>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('type','deposit_escrow','order',d.order_id,'framework',d.framework_id,'amount',need_c)); END IF;
  IF need_f>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('type','fee_held','order',d.order_id,'framework',d.framework_id,'amount',need_f)); END IF;
  IF excess>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('type','excess_held','order',d.order_id,'framework',d.framework_id,'amount',excess)); END IF;
  PERFORM ledger.post('deposit_allocation',d.order_id,'allocate:'||e.id,'Đủ C+F: tách cọc, phí, thừa',lines,e.occurred_at,NULL,NULL,jsonb_build_object('framework',d.framework_id));
  result:='held';
 ELSE excess:=0; result:='partially_received'; END IF;
 IF d.status IN ('awaiting_transfer','partially_received') AND d.status<>result THEN UPDATE core.deposits SET status=result WHERE id=d.id; END IF;
 UPDATE core.bank_events SET applied_at=now(),apply_result='applied',excess_vnd=least(e.amount_vnd,excess) WHERE id=e.id;
 RETURN result;
END $$;

-- Vỏ bank worker và requery giữ nguyên; loại bỏ nhánh cũ đưa tiền muộn vào suspense toàn cục.
CREATE OR REPLACE FUNCTION core.apply_bank_event(p_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core,ledger,evt,ref,public AS $$
DECLARE e core.bank_events%ROWTYPE;
BEGIN
 IF NOT (session_user='agiviet_bank_worker' OR current_setting('role',true)='agiviet_bank_worker'
 OR (pg_has_role(session_user,'agiviet_bank_worker','MEMBER') AND session_user<>current_user)) THEN
 RAISE EXCEPTION 'Chỉ login/role bank worker được áp ngân hàng' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO e FROM core.bank_events WHERE id=p_id FOR UPDATE;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Không có sự kiện'; END IF;
 IF NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=e.webhook_id AND signature_valid AND provider=e.provider AND provider_event_id=e.provider_event_id) THEN
 RAISE EXCEPTION 'Webhook không xác thực' USING HINT='ck_webhook_signature'; END IF;
 IF e.requery_status IS DISTINCT FROM 'confirmed' OR e.requeried_at IS NULL OR e.requery_evidence IS NULL THEN
 RAISE EXCEPTION 'Phải tra lại API ngân hàng và xác nhận trước ghi tiền' USING HINT='ck_bank_requery'; END IF;
 IF e.applied_at IS NOT NULL THEN RETURN 'duplicate_ignored'; END IF;
 PERFORM set_config('app.actor_kind','bank',true); PERFORM set_config('app.user_id','',true); PERFORM set_config('app.org_id','',true);
 RETURN core.apply_bank_event_internal(p_id);
END $$;

-- N-08: snapshot khoản giữ thêm được DB tính từ tranh chấp mở và hợp đồng.
ALTER TABLE core.disputes ADD COLUMN claim_kind text NOT NULL DEFAULT 'quality' CHECK(claim_kind IN ('quality','shortfall'));
COMMENT ON COLUMN core.disputes.claim_kind IS 'quality: không phạt thiếu lượng; shortfall: giữ mức phạt Q04 tối đa cho lượng tranh chấp.';
ALTER TABLE core.settlements ADD COLUMN hold_formula_version smallint NOT NULL DEFAULT 1 CHECK(hold_formula_version IN (1,2));
ALTER TABLE core.settlements ALTER COLUMN hold_formula_version SET DEFAULT 2;
COMMENT ON COLUMN core.settlements.hold_formula_version IS '1 giữ nguyên snapshot lịch sử trước N-08; bản mới buộc 2, tính G_them theo đặc tả sửa.';
ALTER TABLE core.settlements ADD COLUMN additional_hold_vnd bigint NOT NULL DEFAULT 0 CHECK(additional_hold_vnd>=0);
COMMENT ON COLUMN core.settlements.additional_hold_vnd IS 'G_them tại lúc tính bản tạm: phí kiểm định bên mua ứng và phạt Q04 tối đa phần tranh chấp; bản cuối bằng 0.';
CREATE FUNCTION core.dispute_additional_hold(p_order uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT sum(i.fee_vnd) FROM core.inspections i JOIN core.disputes d ON d.id=i.dispute_id
  WHERE d.order_id=o.id AND d.status<>'resolved' AND i.prepaid_by_org_id=o.buyer_org_id),0)
 +coalesce((SELECT sum(ref.div_round(v.deposit_vnd::numeric*d.disputed_qty*
  (SELECT max(bps) FROM unnest(v.shortfall_penalty_bps) bps),v.qty_min::numeric*10000))
  FROM core.disputes d WHERE d.order_id=o.id AND d.status<>'resolved' AND d.claim_kind='shortfall'),0)
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=p_order
$$;
CREATE FUNCTION ledger.interim_release(p_v bigint,p_d bigint,p_c bigint,p_extra bigint,p_prior bigint DEFAULT 0) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN
 IF p_v IS NULL OR p_d IS NULL OR p_c IS NULL OR p_extra IS NULL OR p_prior IS NULL OR least(p_v,p_d,p_c,p_extra,p_prior)<0 OR p_prior>p_c THEN
 RAISE EXCEPTION 'Đầu vào chi tạm không hợp lệ'; END IF;
 RETURN greatest(0,greatest(0,least(p_c,greatest(0,p_v-p_d))-p_extra)-p_prior);
END $$;
ALTER TABLE core.settlements DROP CONSTRAINT ck_st_interim;
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_interim CHECK(hold_formula_version=1 OR is_final OR
 (release_vnd=ledger.interim_release(v_vnd,d_vnd,c_vnd,additional_hold_vnd,prior_released_vnd)
 AND refund_vnd=0 AND t_bm_vnd=0 AND t_nb_vnd=0)) NOT VALID;
CREATE FUNCTION core.snapshot_dispute_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.hold_formula_version:=2;
 NEW.additional_hold_vnd:=CASE WHEN NEW.is_final THEN 0 ELSE coalesce(core.dispute_additional_hold(NEW.order_id),0) END;
 RETURN NEW;
END $$;
CREATE TRIGGER a_01_dispute_hold BEFORE INSERT ON core.settlements FOR EACH ROW EXECUTE FUNCTION core.snapshot_dispute_hold();
COMMENT ON FUNCTION ledger.interim_release IS 'N-08: max(0,min(C,max(0,V_kt-D))-G_them), trừ phần đã chi trước; không làm thay đổi công thức quyết toán cuối.';
REVOKE ALL ON FUNCTION core.dispute_additional_hold(uuid),ledger.interim_release(bigint,bigint,bigint,bigint,bigint) FROM PUBLIC;

-- Tiền thừa trong lệnh cũng tách khỏi C.
CREATE OR REPLACE FUNCTION ledger.on_bank_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_kind ref.bank_instruction_kinds%ROWTYPE; v_dep core.deposits%ROWTYPE;
  v_src text; v_hold text; v_lines jsonb; v_c_order uuid; v_c_fw uuid;
BEGIN
  SELECT * INTO v_kind FROM ref.bank_instruction_kinds WHERE code = NEW.kind;
  SELECT * INTO v_dep FROM core.deposits WHERE id = NEW.deposit_id;
  v_src  := v_kind.source;
  v_hold := CASE WHEN v_src = 'fee_held' THEN 'fee_in_instruction' WHEN v_src='excess_held' THEN 'excess_in_instruction' ELSE 'deposit_in_instruction' END;

  IF TG_OP = 'INSERT' THEN
    PERFORM ledger.post('instruction_reserve', v_dep.order_id, 'bi:' || NEW.id || ':reserve', 'Lệnh ' || NEW.code,
      jsonb_build_array(
        jsonb_build_object('type', v_src,  'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount',  NEW.amount_vnd)),
      now(), NULL, NEW.approved_by, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
    RETURN NEW;
  END IF;

  IF NEW.status = 'succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
      jsonb_build_object('type', 'external', 'org', NEW.target_org_id, 'amount', NEW.amount_vnd));
    IF NEW.kind = 'release_deposit_to_seller' THEN
      IF v_dep.framework_id IS NOT NULL THEN
        v_c_fw := v_dep.framework_id;
      ELSE
        SELECT o_order, o_framework INTO v_c_order, v_c_fw FROM ledger.claim_scope(v_dep.order_id);
      END IF;
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('type','seller_receivable','order', v_c_order, 'framework', v_c_fw, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type','buyer_payable',    'order', v_c_order, 'framework', v_c_fw, 'amount',  NEW.amount_vnd));
    END IF;
    PERFORM ledger.post('instruction_paid', v_dep.order_id, 'bi:' || NEW.id || ':paid', 'Lệnh thành công ' || NEW.code,
      v_lines, now(), NULL, NULL, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
  ELSIF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
    PERFORM ledger.post('instruction_failed', v_dep.order_id, 'bi:' || NEW.id || ':failed', 'Lệnh thất bại ' || NEW.code,
      jsonb_build_array(
        jsonb_build_object('type', v_hold, 'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount', -NEW.amount_vnd),
        jsonb_build_object('type', v_src,  'order', v_dep.order_id, 'framework', v_dep.framework_id, 'amount',  NEW.amount_vnd)),
      now(), NULL, NULL, jsonb_build_object('bank_instruction', NEW.id, 'framework', v_dep.framework_id));
  END IF;
  RETURN NEW;
END $$;

-- Không thể ép cờ held chỉ từ tiền treo, kể cả đường điều phối nội bộ.
CREATE FUNCTION core.guard_deposit_funding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c bigint; f bigint; held_c bigint; held_f bigint;
BEGIN
 IF NEW.status='held' AND (TG_OP='INSERT' OR OLD.status<>'held') THEN
  c:=NEW.expected_deposit_vnd+coalesce((SELECT sum(greatest(delta_deposit_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=NEW.id),0);
  f:=NEW.expected_fee_vnd+coalesce((SELECT sum(greatest(delta_fee_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=NEW.id),0);
  SELECT coalesce(sum(en.amount_vnd) FILTER(WHERE a.account_type='deposit_escrow'),0),
   coalesce(sum(en.amount_vnd) FILTER(WHERE a.account_type='fee_held'),0) INTO held_c,held_f
  FROM ledger.entries en JOIN ledger.accounts a ON a.id=en.account_id JOIN ledger.transactions t ON t.id=en.transaction_id
  WHERE a.order_id IS NOT DISTINCT FROM NEW.order_id AND a.framework_id IS NOT DISTINCT FROM NEW.framework_id
  AND t.kind IN ('deposit_receipt','fee_capture','deposit_allocation','deposit_reclassification','imported_framework_deposit');
  IF held_c<c OR held_f<f THEN RAISE EXCEPTION 'Chưa đủ C và F trong sổ riêng; tiền treo chưa là cọc' USING HINT='ck_deposit_funded'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_funded BEFORE INSERT OR UPDATE OF status ON core.deposits FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_funding();
CREATE FUNCTION core.guard_dispute_hold_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id JOIN core.deliveries d ON d.id=a.delivery_id
  WHERE l.id=NEW.line_id AND d.order_id=NEW.order_id AND NEW.disputed_qty<=l.qty) THEN
  RAISE EXCEPTION 'Tranh chấp phải đúng đơn và không vượt lượng dòng' USING HINT='ck_dispute_scope'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_hold_scope BEFORE INSERT OR UPDATE ON core.disputes FOR EACH ROW EXECUTE FUNCTION core.guard_dispute_hold_scope();
CREATE FUNCTION core.guard_inspection_hold_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.dispute_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.disputes d JOIN core.acceptance_lines l ON l.id=d.line_id
 JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE d.id=NEW.dispute_id AND a.delivery_id=NEW.delivery_id) THEN
 RAISE EXCEPTION 'Kiểm định phải thuộc đúng đợt tranh chấp' USING HINT='ck_inspection_dispute_scope'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_hold_scope BEFORE INSERT ON core.inspections FOR EACH ROW EXECUTE FUNCTION core.guard_inspection_hold_scope();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.inspections FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
