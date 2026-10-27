-- D-01: app không ghi bảng trực tiếp; actor bank dựa quyền PostgreSQL, không dựa app.actor_kind.
CREATE ROLE agiviet_bank_worker NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE agiviet_auth_worker NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA cmd;
REVOKE ALL ON SCHEMA cmd FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA cmd REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE TABLE cmd.login_principals (
 login_name name PRIMARY KEY, user_id uuid NOT NULL REFERENCES core.users, org_id uuid NOT NULL REFERENCES core.organizations,
 actor_kind text NOT NULL CHECK(actor_kind IN ('buyer','seller','ops','helper')), active boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE cmd.login_principals IS 'Ánh xạ login PostgreSQL do quản trị tin cậy cấp; runtime không tự nhận user/org bằng GUC. Pool chung cần broker xác thực riêng trước khi mở rộng.';
CREATE FUNCTION cmd.enter_actor() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE p cmd.login_principals%ROWTYPE;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=session_user AND active;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
  OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=p.user_id AND org_id=p.org_id AND status='active') THEN
  RAISE EXCEPTION 'Login chưa được ánh xạ danh tính tin cậy' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true);
 PERFORM set_config('app.actor_kind',p.actor_kind,true);
END $$;
ALTER TABLE evt.inbound_webhooks ADD CONSTRAINT ck_webhook_applied_signature CHECK(process_result IS DISTINCT FROM 'applied' OR signature_valid);
ALTER TABLE core.bank_events ADD COLUMN requeried_at timestamptz;
ALTER TABLE core.bank_events ADD COLUMN requery_status text CHECK(requery_status IN ('confirmed','rejected','pending'));
ALTER TABLE core.bank_events ADD COLUMN requery_evidence jsonb;
ALTER TABLE core.bank_events ADD CONSTRAINT ck_requery_confirmation CHECK(requery_status IS DISTINCT FROM 'confirmed' OR (requeried_at IS NOT NULL AND requery_evidence IS NOT NULL));
ALTER FUNCTION core.apply_bank_event(uuid) RENAME TO apply_bank_event_internal;
CREATE FUNCTION core.apply_bank_event(p_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core,ledger,evt,ref,public AS $$
DECLARE e core.bank_events%ROWTYPE; d core.deposits%ROWTYPE; r text;
BEGIN
 -- SET ROLE là tham số đặc biệt do PostgreSQL kiểm membership; không phải custom GUC.
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
 PERFORM set_config('app.actor_kind','bank',true);
 PERFORM set_config('app.user_id','',true); PERFORM set_config('app.org_id','',true);
 IF e.kind='deposit_received' THEN
  SELECT * INTO d FROM core.deposits WHERE payment_ref=e.payment_ref OR id IN (SELECT deposit_id FROM core.deposit_adjustments WHERE payment_ref=e.payment_ref) FOR UPDATE;
  PERFORM 1 FROM core.orders WHERE id=d.order_id FOR UPDATE;
  IF d.order_id IS NOT NULL AND EXISTS(SELECT 1 FROM core.orders WHERE id=d.order_id AND status<>'awaiting_deposit') THEN
   PERFORM ledger.post('unmatched_receipt',d.order_id,'bankev:'||e.id,'Tiền đến sau hạn/đóng: hoàn về nguồn',
    jsonb_build_array(jsonb_build_object('type','suspense','amount',e.amount_vnd),jsonb_build_object('type','external','org',d.payer_org_id,'amount',-e.amount_vnd)),
    now(),NULL,NULL,jsonb_build_object('bank_event',e.id));
   UPDATE core.bank_events SET applied_at=now(),apply_result='late_after_closed' WHERE id=e.id;
   INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason) VALUES(e.id,d.id,'late_after_closed');
   RETURN 'late_after_closed';
  END IF;
 END IF;
 r:=core.apply_bank_event_internal(p_id);
 RETURN r;
END $$;
CREATE TABLE ops.bank_return_tasks (
 bank_event_id uuid PRIMARY KEY REFERENCES core.bank_events, deposit_id uuid NOT NULL REFERENCES core.deposits,
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','returned'))
);
COMMENT ON TABLE ops.bank_return_tasks IS 'Tiền đến muộn ở suspense, chờ hoàn nguồn; worker không tự coi là cọc.';
GRANT USAGE ON SCHEMA core,cmd TO agiviet_bank_worker,agiviet_auth_worker;
GRANT EXECUTE ON FUNCTION core.apply_bank_event(uuid) TO agiviet_bank_worker;
CREATE FUNCTION cmd.record_bank_event(p_webhook jsonb,p_event jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core,evt,public AS $$
DECLARE w bigint; e uuid;
BEGIN
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload)
 VALUES(p_webhook->>'provider',p_webhook->>'provider_event_id',p_webhook->>'event_type',(p_webhook->>'signature_valid')::boolean,p_webhook->'payload') RETURNING id INTO w;
 INSERT INTO core.bank_events(provider,provider_event_id,webhook_id,kind,amount_vnd,payment_ref,instruction_code,bank_txn_ref,occurred_at,
 payer_account_hash,payer_account_masked,payer_account_name,requeried_at,requery_status,requery_evidence)
 VALUES(p_webhook->>'provider',p_webhook->>'provider_event_id',w,p_event->>'kind',(p_event->>'amount_vnd')::bigint,p_event->>'payment_ref',p_event->>'instruction_code',p_event->>'bank_txn_ref',(p_event->>'occurred_at')::timestamptz,
 decode(p_event->>'payer_account_hash','hex'),p_event->>'payer_account_masked',p_event->>'payer_account_name',(p_event->>'requeried_at')::timestamptz,p_event->>'requery_status',p_event->'requery_evidence') RETURNING id INTO e;
 RETURN e;
END $$;
GRANT EXECUTE ON FUNCTION cmd.record_bank_event(jsonb,jsonb) TO agiviet_bank_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA cmd FROM PUBLIC,agiviet_app,agiviet_worker,agiviet_bank_worker,agiviet_auth_worker;
-- Mọi đường nội bộ ghi tiền vẫn không được cấp EXECUTE cho app.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA core,ledger,evt,ops,pii FROM agiviet_bank_worker,agiviet_auth_worker;
GRANT EXECUTE ON FUNCTION core.apply_bank_event(uuid) TO agiviet_bank_worker;
