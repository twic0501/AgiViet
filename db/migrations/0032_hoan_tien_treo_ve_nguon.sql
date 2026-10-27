-- N-01: task hoàn có snapshot đích nguồn, không thể đánh dấu xong bằng lời khai.
ALTER TABLE ops.bank_return_tasks ADD COLUMN target_bank_code text;
ALTER TABLE ops.bank_return_tasks ADD COLUMN target_account_hash bytea;
ALTER TABLE ops.bank_return_tasks ADD COLUMN target_account_masked text;
ALTER TABLE ops.bank_return_tasks ADD COLUMN target_account_holder text;
ALTER TABLE ops.bank_return_tasks ADD COLUMN return_bank_event_id uuid UNIQUE REFERENCES core.bank_events;
-- Lịch sử giữ nguyên chứng cứ có thật; nguồn chưa rõ không được hoàn tự động.
UPDATE ops.bank_return_tasks t SET target_bank_code=e.payer_bank_code,target_account_hash=e.payer_account_hash,
 target_account_masked=e.payer_account_masked,target_account_holder=e.payer_account_name FROM core.bank_events e WHERE e.id=t.bank_event_id;
CREATE FUNCTION ops.guard_bank_return() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; proof core.bank_events%ROWTYPE; d core.deposits%ROWTYPE; source_type text;
BEGIN
 SELECT * INTO e FROM core.bank_events WHERE id=NEW.bank_event_id FOR UPDATE;
 SELECT * INTO d FROM core.deposits WHERE id=NEW.deposit_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF e.apply_result IS NULL OR e.apply_result NOT IN ('late_after_closed','applied')
  OR (e.apply_result='applied' AND (d.status<>'partially_received' OR NOT EXISTS(SELECT 1 FROM core.orders WHERE id=d.order_id AND status='closed'))) OR e.kind<>'deposit_received' OR e.applied_at IS NULL
  OR NOT (e.payment_ref=d.payment_ref OR e.payment_ref IN(SELECT payment_ref FROM core.deposit_adjustments WHERE deposit_id=d.id))
  OR NEW.status<>'pending' OR NEW.return_bank_event_id IS NOT NULL THEN
   RAISE EXCEPTION 'Khoản hoàn treo không đúng nguồn hoặc trạng thái' USING HINT='ck_bank_return_source'; END IF;
  NEW.target_bank_code:=e.payer_bank_code; NEW.target_account_hash:=e.payer_account_hash;
  NEW.target_account_masked:=e.payer_account_masked; NEW.target_account_holder:=e.payer_account_name;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['status','return_bank_event_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','return_bank_event_id']) OR OLD.status='returned' THEN
   RAISE EXCEPTION 'Task hoàn và nguồn tiền bất biến' USING HINT='ck_bank_return_source'; END IF;
 END IF;
 IF NEW.status='returned' THEN
  SELECT * INTO proof FROM core.bank_events WHERE id=NEW.return_bank_event_id FOR UPDATE;
  IF proof.id IS NULL OR proof.kind<>'statement_line' OR proof.applied_at IS NOT NULL OR proof.amount_vnd IS DISTINCT FROM e.amount_vnd
   OR proof.requery_status IS DISTINCT FROM 'confirmed' OR proof.requeried_at IS NULL
   OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=proof.webhook_id AND signature_valid AND provider=proof.provider AND provider_event_id=proof.provider_event_id)
   OR proof.requery_evidence->>'source_event_id' IS DISTINCT FROM e.id::text
   OR proof.requery_evidence->>'direction' IS DISTINCT FROM 'debit'
   OR NEW.target_account_hash IS NULL OR NEW.target_bank_code IS NULL
   OR proof.requery_evidence->>'target_account_hash' IS DISTINCT FROM encode(NEW.target_account_hash,'hex')
   OR proof.requery_evidence->>'target_bank_code' IS DISTINCT FROM NEW.target_bank_code THEN
   RAISE EXCEPTION 'Hoàn treo phải được API xác nhận đúng số tiền và tài khoản nguồn' USING HINT='ck_bank_return_proof'; END IF;
  -- Legacy 0025 dùng suspense global; 0030 dùng ngăn treo theo đơn/khung.
  SELECT a.account_type INTO source_type FROM ledger.transactions t JOIN ledger.entries en ON en.transaction_id=t.id JOIN ledger.accounts a ON a.id=en.account_id
  WHERE t.bank_event_id=e.id AND en.amount_vnd>0 AND a.account_type IN ('suspense','deposit_pending');
  IF source_type IS NULL AND e.apply_result='applied' AND EXISTS(SELECT 1 FROM ledger.transactions WHERE idempotency_key='n01-n13:'||d.id) THEN source_type:='deposit_pending'; END IF;
  IF source_type IS NULL THEN RAISE EXCEPTION 'Tiền nguồn chưa nằm trong ngăn treo' USING HINT='ck_bank_return_source'; END IF;
  PERFORM ledger.post('suspense_return',d.order_id,'return:'||e.id,'Hoàn tiền treo về nguồn',
   jsonb_build_array(jsonb_build_object('type',source_type,'order',CASE WHEN source_type='deposit_pending' THEN d.order_id END,
    'framework',CASE WHEN source_type='deposit_pending' THEN d.framework_id END,'amount',-e.amount_vnd),
    jsonb_build_object('type','external','org',d.payer_org_id,'amount',e.amount_vnd)),now(),NULL,NULL,jsonb_build_object('bank_event',proof.id,'framework',d.framework_id));
  UPDATE core.bank_events SET applied_at=now(),apply_result='suspense_return' WHERE id=proof.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_return_source BEFORE INSERT OR UPDATE ON ops.bank_return_tasks FOR EACH ROW EXECUTE FUNCTION ops.guard_bank_return();
CREATE TRIGGER no_delete BEFORE DELETE ON ops.bank_return_tasks FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.queue_partial_returns() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='closed' AND OLD.status='awaiting_deposit' THEN
  INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
  SELECT e.id,d.id,'partial_deposit_expired' FROM core.deposits d JOIN core.bank_events e ON
   (e.payment_ref=d.payment_ref OR e.payment_ref IN(SELECT payment_ref FROM core.deposit_adjustments WHERE deposit_id=d.id))
  WHERE d.order_id=NEW.id AND d.status='partially_received' AND e.apply_result='applied' AND e.applied_at IS NOT NULL
  ON CONFLICT(bank_event_id) DO NOTHING;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER z_partial_returns AFTER UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.queue_partial_returns();
CREATE FUNCTION cmd.complete_bank_return(p_source uuid,p_proof uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,ops,core,ledger,ref,evt,public AS $$ BEGIN
 IF NOT (session_user='agiviet_bank_worker' OR current_setting('role',true)='agiviet_bank_worker'
 OR (pg_has_role(session_user,'agiviet_bank_worker','MEMBER') AND session_user<>current_user)) THEN
 RAISE EXCEPTION 'Chỉ bank worker xác nhận hoàn nguồn' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE ops.bank_return_tasks SET return_bank_event_id=p_proof,status='returned' WHERE bank_event_id=p_source AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có task hoàn đang chờ' USING HINT='ck_bank_return_source'; END IF;
END $$;
REVOKE ALL ON FUNCTION cmd.complete_bank_return(uuid,uuid) FROM PUBLIC,agiviet_app,agiviet_worker,agiviet_auth_worker,agiviet_readonly;
GRANT EXECUTE ON FUNCTION cmd.complete_bank_return(uuid,uuid) TO agiviet_bank_worker;
REVOKE ALL ON FUNCTION ops.guard_bank_return(),core.queue_partial_returns() FROM PUBLIC;

-- Bất biến BT-T1: chỉ C, không cộng F hoặc tiền thiếu/thừa.
CREATE VIEW ledger.v_deposit_conservation AS
SELECT d.id deposit_id,d.order_id,d.framework_id,d.expected_deposit_vnd c_initial_vnd,
 coalesce((SELECT sum(greatest(delta_deposit_vnd,0)) FROM core.deposit_adjustments WHERE deposit_id=d.id),0) c_topup_vnd,
 coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances a WHERE a.order_id IS NOT DISTINCT FROM d.order_id AND a.framework_id IS NOT DISTINCT FROM d.framework_id AND account_type='deposit_escrow'),0) held_vnd,
 coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances a WHERE a.order_id IS NOT DISTINCT FROM d.order_id AND a.framework_id IS NOT DISTINCT FROM d.framework_id AND account_type='deposit_in_instruction'),0) in_instruction_vnd,
 coalesce((SELECT sum(amount_vnd) FROM core.bank_instructions WHERE deposit_id=d.id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled')),0) released_vnd,
 coalesce((SELECT sum(b.amount_vnd) FROM core.bank_instructions b JOIN ref.bank_instruction_kinds k ON k.code=b.kind WHERE b.deposit_id=d.id AND k.source='deposit_escrow' AND k.target='buyer' AND b.status IN ('succeeded','reconciled')),0) refunded_vnd
FROM core.deposits d;
COMMENT ON VIEW ledger.v_deposit_conservation IS 'BT-T1 khi đủ tiền: C ban đầu + C bổ sung = đang giữ + trong lệnh + đã chi + đã hoàn; F và tiền thiếu/thừa ở sổ riêng.';
-- Bổ sung chú thích cho cột mới, không thay chú thích nghiệp vụ sẵn có.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT n.nspname,c.relname,a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('core','ledger','pii','ops','evt','ref') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND col_description(c.oid,a.attnum) IS NULL LOOP
 EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,'Trường '||r.attname||'; đối chiếu kiểm soát N-01–N-16 và docs/database/06.');
 END LOOP;
END $$;
