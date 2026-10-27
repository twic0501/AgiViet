-- Sửa những lỗ hổng của bản nháp: khóa lô, đóng giao dịch, kiểm nguồn và quyền.
UPDATE ref.plans SET max_members=5 WHERE code='procurement';
ALTER TABLE core.products ADD CONSTRAINT ck_v2_grams CHECK(base_unit='g' AND price_unit='kg' AND price_unit_base_qty=1000);
ALTER TABLE core.facilities RENAME COLUMN capacity_kg TO capacity_qty;
ALTER TABLE core.order_versions ADD CHECK(price_unit_base_qty=1000 AND version_no>0 AND (downgrade_price_vnd IS NULL OR downgrade_price_vnd>=0));
ALTER TABLE core.order_versions ADD CHECK(NOT lower_inf(delivery_window) AND NOT upper_inf(delivery_window));
ALTER TABLE core.order_versions ADD CHECK(moisture_std_bps IS NULL OR moisture_std_bps BETWEEN 0 AND 9999);
ALTER TABLE core.order_versions ADD CHECK(pay_after_days IS NULL OR pay_after_days>0);
ALTER TABLE core.documents ADD CHECK(version_no>0);
ALTER TABLE core.deposits ADD UNIQUE(id,order_id);
ALTER TABLE core.deposit_adjustments ADD UNIQUE(deposit_id,order_version_no);
ALTER TABLE core.bank_events ADD CHECK(kind<>'deposit_received' OR (amount_vnd IS NOT NULL AND webhook_id IS NOT NULL));

CREATE OR REPLACE FUNCTION ledger.apply_qty_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE z constant uuid:='00000000-0000-0000-0000-000000000000'; f boolean; t boolean; k uuid;
BEGIN
 PERFORM 1 FROM core.lots WHERE id=NEW.lot_id FOR UPDATE;
 SELECT per_order INTO f FROM ref.qty_buckets WHERE code=NEW.from_bucket;
 SELECT per_order INTO t FROM ref.qty_buckets WHERE code=NEW.to_bucket;
 IF (f OR t) AND NEW.order_id IS NULL THEN RAISE EXCEPTION 'Ngăn theo đơn cần đơn' USING HINT='ck_qty_move_order'; END IF;
 k:=CASE WHEN f THEN NEW.order_id ELSE z END;
 -- Không INSERT một giá trị âm để hy vọng ON CONFLICT bỏ qua CHECK.
 UPDATE ledger.qty_balances SET qty=qty-NEW.qty,updated_at=now() WHERE lot_id=NEW.lot_id AND bucket=NEW.from_bucket AND order_key=k;
 IF NOT FOUND THEN
  IF NEW.from_bucket<>'source' THEN RAISE EXCEPTION 'Không đủ lượng' USING ERRCODE='23514',HINT='ck_qty_non_negative'; END IF;
  INSERT INTO ledger.qty_balances(lot_id,bucket,order_key,qty) VALUES(NEW.lot_id,NEW.from_bucket,k,-NEW.qty);
 END IF;
 INSERT INTO ledger.qty_balances AS b(lot_id,bucket,order_key,qty)
 VALUES(NEW.lot_id,NEW.to_bucket,CASE WHEN t THEN NEW.order_id ELSE z END,NEW.qty)
 ON CONFLICT(lot_id,bucket,order_key) DO UPDATE SET qty=b.qty+excluded.qty,updated_at=now();
 RETURN NEW;
EXCEPTION WHEN check_violation THEN RAISE EXCEPTION 'Không đủ lượng lô % tại ngăn %',NEW.lot_id,NEW.from_bucket USING ERRCODE='23514',HINT='ck_qty_non_negative';
END $$;
CREATE FUNCTION ledger.guard_qty() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l core.lots%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO l FROM core.lots WHERE id=NEW.lot_id FOR UPDATE;
 IF NEW.reason='declare' AND EXISTS(SELECT 1 FROM ledger.qty_movements WHERE lot_id=NEW.lot_id AND reason='declare') THEN
 RAISE EXCEPTION 'Lô đã khai nguồn' USING HINT='ck_qty_declared_once'; END IF;
 IF NEW.reason='declare' AND NEW.qty<>l.declared_qty THEN RAISE EXCEPTION 'Lượng khai khác lô' USING HINT='ck_qty_declare'; END IF;
 IF NEW.to_bucket IN ('held','committed') AND (l.safety_locked_at IS NOT NULL OR l.status IN ('closed','hidden','draft')) THEN
 RAISE EXCEPTION 'Lô không thể hứa mới' USING HINT='ck_qty_lot_unavailable'; END IF;
 IF NEW.order_id IS NOT NULL THEN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 IF o.seller_org_id<>l.seller_org_id THEN RAISE EXCEPTION 'Lô khác người bán của đơn' USING HINT='ck_qty_party'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_guard_qty BEFORE INSERT ON ledger.qty_movements FOR EACH ROW EXECUTE FUNCTION ledger.guard_qty();
CREATE OR REPLACE FUNCTION ledger.move_qty(p_lot uuid,p_from text,p_to text,p_reason text,p_qty bigint,p_order uuid,p_idem text,p_related_lot uuid DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE r ledger.qty_movements%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('qty:'||p_idem,0));
 SELECT * INTO r FROM ledger.qty_movements WHERE idempotency_key=p_idem;
 IF FOUND THEN
 IF (r.lot_id,r.from_bucket,r.to_bucket,r.reason,r.qty,r.order_id,r.related_lot_id,r.note) IS DISTINCT FROM (p_lot,p_from,p_to,p_reason,p_qty,p_order,p_related_lot,p_note) THEN
 RAISE EXCEPTION 'Khóa lượng đã dùng với nội dung khác' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN r.id; END IF;
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,related_lot_id,idempotency_key,note,actor_user_id,request_id)
 VALUES(p_lot,p_from,p_to,p_reason,p_qty,p_order,p_related_lot,p_idem,p_note,ref.ctx_user(),ref.ctx('request_id')) RETURNING id INTO r.id; RETURN r.id;
END $$;
-- Chuyển lô cha/con phải có hai vế bằng nhau trong cùng transaction.
CREATE FUNCTION ledger.check_qty_split() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a numeric; b numeric;
BEGIN
 IF NEW.related_lot_id IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(sum(qty),0) INTO a FROM ledger.qty_movements WHERE lot_id=CASE WHEN NEW.reason='split_in' THEN NEW.related_lot_id ELSE NEW.lot_id END
 AND related_lot_id=CASE WHEN NEW.reason='split_in' THEN NEW.lot_id ELSE NEW.related_lot_id END AND reason IN ('split_out','return_to_child');
 SELECT coalesce(sum(qty),0) INTO b FROM ledger.qty_movements WHERE lot_id=CASE WHEN NEW.reason='split_in' THEN NEW.lot_id ELSE NEW.related_lot_id END
 AND related_lot_id=CASE WHEN NEW.reason='split_in' THEN NEW.related_lot_id ELSE NEW.lot_id END AND reason='split_in';
 IF a<>b THEN RAISE EXCEPTION 'Tách lô thiếu vế đối ứng' USING HINT='ck_qty_split'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER qty_split AFTER INSERT ON ledger.qty_movements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.check_qty_split();

ALTER TABLE ledger.transactions ADD COLUMN write_xid xid8 NOT NULL DEFAULT pg_current_xact_id();
ALTER TABLE ledger.transactions ADD COLUMN request_hash bytea CHECK(request_hash IS NULL OR octet_length(request_hash)=32);
CREATE FUNCTION ledger.guard_entry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM ledger.transactions WHERE id=NEW.transaction_id AND write_xid=pg_current_xact_id()) THEN
 RAISE EXCEPTION 'Giao dịch đã chốt, phải đảo bằng giao dịch mới' USING HINT='ck_ledger_sealed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_guard_entry BEFORE INSERT ON ledger.entries FOR EACH ROW EXECUTE FUNCTION ledger.guard_entry();
CREATE FUNCTION ledger.check_transaction_header() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE s numeric; n integer; d numeric;
BEGIN
 SELECT coalesce(sum(amount_vnd),0),count(*) INTO s,n FROM ledger.entries WHERE transaction_id=NEW.id;
 IF s<>0 OR n<2 THEN RAISE EXCEPTION 'Giao dịch tiền rỗng hoặc không cân' USING HINT='ck_ledger_balanced'; END IF;
 IF NEW.reverses_id IS NOT NULL THEN
 SELECT sum(abs(delta)) INTO d FROM (SELECT account_id,sum(amount_vnd) delta FROM ledger.entries WHERE transaction_id IN (NEW.id,NEW.reverses_id) GROUP BY account_id)t;
 IF d<>0 THEN RAISE EXCEPTION 'Bút toán đảo không đối ứng bản gốc' USING HINT='ck_ledger_reversal'; END IF;
 END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER transaction_header AFTER INSERT ON ledger.transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.check_transaction_header();
-- Hàm post cũ được giữ làm phần nội bộ; vỏ mới khóa idempotency và so hash yêu cầu.
ALTER FUNCTION ledger.post(text,uuid,text,text,jsonb,timestamptz,uuid,uuid,jsonb) RENAME TO post_internal;
CREATE FUNCTION ledger.post(p_kind text,p_order uuid,p_idem text,p_memo text,p_lines jsonb,p_effective_at timestamptz DEFAULT now(),p_reverses uuid DEFAULT NULL,p_approved_by uuid DEFAULT NULL,p_refs jsonb DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql AS $$ DECLARE h bytea; r ledger.transactions%ROWTYPE; id uuid;
BEGIN
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'Cần ít nhất hai bút toán' USING HINT='ck_ledger_balanced'; END IF;
 h:=digest(jsonb_build_array(p_kind,p_order,p_memo,p_lines,p_reverses,p_approved_by,p_refs)::text,'sha256');
 PERFORM pg_advisory_xact_lock(hashtextextended('money:'||p_idem,0));
 SELECT * INTO r FROM ledger.transactions WHERE idempotency_key=p_idem;
 IF FOUND THEN IF r.request_hash IS DISTINCT FROM h THEN RAISE EXCEPTION 'Khóa tiền khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN r.id; END IF;
 -- Chủ hàm nội bộ điền hash qua ngữ cảnh trước khi INSERT; không UPDATE dữ liệu append-only.
 PERFORM set_config('app.ledger_request_hash',encode(h,'hex'),true);
 id:=ledger.post_internal(p_kind,p_order,p_idem,p_memo,p_lines,p_effective_at,p_reverses,p_approved_by,p_refs);
 RETURN id; END $$;
CREATE FUNCTION ledger.stamp_transaction() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.write_xid:=pg_current_xact_id(); NEW.request_hash:=decode(ref.ctx('ledger_request_hash'),'hex'); RETURN NEW; END $$;
CREATE TRIGGER a_stamp BEFORE INSERT ON ledger.transactions FOR EACH ROW EXECUTE FUNCTION ledger.stamp_transaction();
CREATE VIEW ledger.v_account_balances AS SELECT a.id account_id,a.account_type,a.org_id,a.order_id,a.framework_id,coalesce(sum(e.amount_vnd),0) balance_vnd FROM ledger.accounts a LEFT JOIN ledger.entries e ON e.account_id=a.id GROUP BY a.id;

CREATE FUNCTION core.require_money_role(p_user uuid,p_org uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ref.ctx_actor()='helper' OR NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id JOIN ref.roles r ON r.code=mr.role_code
 WHERE m.user_id=p_user AND m.org_id=p_org AND m.status='active' AND r.can_pay) THEN
 RAISE EXCEPTION 'Không có quyền tiền của tổ chức' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF p_user IS DISTINCT FROM ref.ctx_user() OR p_org IS DISTINCT FROM ref.ctx_org() THEN RAISE EXCEPTION 'Sai ngữ cảnh người thao tác' USING HINT='KHONG_CO_QUYEN'; END IF;
END $$;
CREATE FUNCTION core.guard_confirmation_actor() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.direct_payments%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.direct_payments WHERE id=NEW.direct_payment_id FOR UPDATE;
 IF NEW.ops_decision_by IS NULL THEN PERFORM core.require_money_role(NEW.confirmed_by,d.payee_org_id);
 ELSE
 IF ref.ctx_actor()<>'ops' OR NOT EXISTS(SELECT 1 FROM ops.decisions WHERE kind='payment_reconciliation' AND entity_id=d.id AND proposed_by=NEW.ops_decision_by[1] AND approved_by=NEW.ops_decision_by[2]) THEN
 RAISE EXCEPTION 'Đối soát thiếu quyết định hai người' USING HINT='ck_money_decision'; END IF;
 END IF;
 IF d.status IN ('not_due','cancelled','fully_received') THEN RAISE EXCEPTION 'Khoản chưa đến hạn hoặc đã kết thúc' USING HINT='ck_payment_closed'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_actor BEFORE INSERT ON core.direct_payment_confirmations FOR EACH ROW EXECUTE FUNCTION core.guard_confirmation_actor();
CREATE FUNCTION core.guard_payment_report() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.direct_payments%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.direct_payments WHERE id=NEW.direct_payment_id FOR UPDATE;
 PERFORM core.require_money_role(NEW.reported_by,d.payer_org_id);
 IF NEW.evidence_doc_id IS NULL THEN RAISE EXCEPTION 'Báo trả tiền cần chứng từ' USING HINT='ck_report_evidence'; END IF;
 IF d.status IN ('not_due','cancelled','fully_received') THEN RAISE EXCEPTION 'Khoản không thể báo trả' USING HINT='ck_payment_closed'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_actor BEFORE INSERT ON core.direct_payment_reports FOR EACH ROW EXECUTE FUNCTION core.guard_payment_report();
CREATE FUNCTION core.guard_payment_status() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE total numeric;
BEGIN
 IF NEW.status IN ('fully_received','partially_received') AND NEW.status IS DISTINCT FROM OLD.status THEN
 SELECT coalesce(sum(amount_vnd),0) INTO total FROM core.direct_payment_confirmations WHERE direct_payment_id=NEW.id;
 IF (NEW.status='fully_received' AND total<>NEW.amount_due_vnd) OR (NEW.status='partially_received' AND (total<=0 OR total>=NEW.amount_due_vnd)) THEN
 RAISE EXCEPTION 'Trạng thái nhận tiền phải có xác nhận đủ số' USING HINT='ck_payment_confirmed'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_status_money BEFORE UPDATE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION core.guard_payment_status();
CREATE FUNCTION core.sync_payment_status() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.direct_payments%ROWTYPE; s text;
BEGIN
 SELECT * INTO d FROM core.direct_payments WHERE id=NEW.direct_payment_id;
 s:=CASE WHEN NEW.result='not_received' THEN 'mismatch' WHEN NEW.result='full' THEN 'fully_received' ELSE 'partially_received' END;
 IF s<>d.status THEN UPDATE core.direct_payments SET status=s WHERE id=d.id; END IF; RETURN NEW; END $$;
CREATE TRIGGER z_sync AFTER INSERT ON core.direct_payment_confirmations FOR EACH ROW EXECUTE FUNCTION core.sync_payment_status();
CREATE FUNCTION core.freeze_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['status','status_changed_at','updated_at','version','due_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','status_changed_at','updated_at','version','due_at']) THEN
 RAISE EXCEPTION 'Nghĩa vụ tiền bất biến; tạo nghĩa vụ điều chỉnh' USING HINT='ck_append_only'; END IF; RETURN NEW; END $$;
CREATE TRIGGER tg_freeze BEFORE UPDATE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION core.freeze_payment();
CREATE TRIGGER no_delete BEFORE DELETE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER no_delete BEFORE DELETE ON core.deposits FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION core.guard_signature_party() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.documents%ROWTYPE; o core.orders%ROWTYPE; f core.framework_contracts%ROWTYPE; allowed uuid;
BEGIN
 SELECT * INTO d FROM core.documents WHERE id=NEW.document_id FOR UPDATE;
 IF d.status NOT IN ('awaiting_signature','partially_signed') OR EXISTS(SELECT 1 FROM core.documents WHERE series_key=d.series_key AND version_no>d.version_no) THEN
 RAISE EXCEPTION 'Không ký bản cũ hoặc đã kết thúc' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 IF NEW.party IN ('buyer','seller') THEN
 IF d.order_id IS NOT NULL THEN SELECT * INTO o FROM core.orders WHERE id=d.order_id; allowed:=CASE WHEN NEW.party='buyer' THEN o.buyer_org_id ELSE o.seller_org_id END;
 ELSIF d.doc_type='framework_contract' THEN SELECT * INTO f FROM core.framework_contracts WHERE id=d.entity_id; allowed:=CASE WHEN NEW.party='buyer' THEN f.buyer_org_id ELSE f.seller_org_id END;
 ELSE allowed:=d.owner_org_id; END IF;
 IF allowed IS NULL OR NEW.signer_org_id IS DISTINCT FROM allowed OR NEW.signer_user_id IS DISTINCT FROM ref.ctx_user() OR ref.ctx_org() IS DISTINCT FROM allowed THEN
 RAISE EXCEPTION 'Chữ ký sai bên' USING HINT='ck_signature_party'; END IF;
 IF NEW.party='seller' AND o.flag_abnormal_price AND NOT ('abnormal_price_ack'=ANY(NEW.statements)) THEN
 RAISE EXCEPTION 'Cần xác nhận giá bất thường' USING HINT='CAN_XAC_NHAN_GIA_BAT_THUONG'; END IF;
 END IF;
 IF NEW.method='simulated_digital' AND NEW.signature_value IS NULL THEN RAISE EXCEPTION 'Thiếu chữ ký mô phỏng' USING HINT='ck_signature_value'; END IF;
 IF NEW.device_id IS NULL THEN RAISE EXCEPTION 'Thiếu thiết bị ký' USING HINT='ck_signature_device'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_party BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_signature_party();
CREATE OR REPLACE FUNCTION core.freeze_document() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['status','status_changed_at','cancel_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','status_changed_at','cancel_reason']) THEN
 RAISE EXCEPTION 'Tài liệu bất biến' USING HINT='ck_append_only'; END IF; RETURN NEW; END $$;
-- Chặn lách hiệu lực bằng INSERT đặt sẵn phiên bản.
CREATE FUNCTION core.no_initial_effective_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.effective_version_no IS NOT NULL THEN RAISE EXCEPTION 'Tạo đơn trước, ký sau' USING HINT='ck_order_version_signed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_initial_version BEFORE INSERT ON core.orders FOR EACH ROW EXECUTE FUNCTION core.no_initial_effective_version();

CREATE FUNCTION core.guard_bank_account() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE recent timestamptz;
BEGIN
 IF ref.ctx_actor()='helper' THEN RAISE EXCEPTION 'Người giúp không đổi tài khoản' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF TG_OP='INSERT' THEN
 IF NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id JOIN ref.roles r ON r.code=mr.role_code WHERE m.user_id=NEW.requested_by AND m.org_id=NEW.org_id AND m.status='active' AND r.can_payout_admin) THEN
 RAISE EXCEPTION 'Không có quyền đổi tài khoản' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT last_recovery_at INTO recent FROM core.users WHERE id=NEW.requested_by;
 NEW.cooldown_until:=NEW.created_at+CASE WHEN recent>=NEW.created_at-interval '7 days' THEN interval '72 hours' ELSE interval '24 hours' END;
 ELSIF NEW.status='active' AND OLD.status<>'active' THEN
 IF NEW.name_match IS DISTINCT FROM true OR NEW.cooldown_until>clock_timestamp() THEN RAISE EXCEPTION 'Chưa hết thời gian chờ hoặc tên không khớp' USING HINT='ck_bank_cooldown'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.org_id,NEW.bank_code,NEW.account_number_enc,NEW.account_number_hash,NEW.holder_name,NEW.cooldown_until) IS DISTINCT FROM (OLD.org_id,OLD.bank_code,OLD.account_number_enc,OLD.account_number_hash,OLD.holder_name,OLD.cooldown_until) THEN
 RAISE EXCEPTION 'Tạo tài khoản mới để đổi đích' USING HINT='ck_append_only'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_bank_guard BEFORE INSERT OR UPDATE ON pii.bank_accounts FOR EACH ROW EXECUTE FUNCTION core.guard_bank_account();

-- Đầu vào webhook không thể thay thân, nguồn, chữ ký sau khi nhận.
CREATE FUNCTION evt.freeze_webhook() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.provider,NEW.provider_event_id,NEW.event_type,NEW.signature_valid,NEW.payload,NEW.received_at) IS DISTINCT FROM
 (OLD.provider,OLD.provider_event_id,OLD.event_type,OLD.signature_valid,OLD.payload,OLD.received_at) THEN RAISE EXCEPTION 'Webhook bất biến' USING HINT='ck_append_only'; END IF;
 IF NEW.process_result='applied' AND NOT NEW.signature_valid THEN RAISE EXCEPTION 'Webhook sai chữ ký' USING HINT='ck_webhook_signature'; END IF; RETURN NEW; END $$;
CREATE TRIGGER tg_freeze BEFORE UPDATE ON evt.inbound_webhooks FOR EACH ROW EXECUTE FUNCTION evt.freeze_webhook();
CREATE TRIGGER no_delete BEFORE DELETE ON evt.inbound_webhooks FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.freeze_bank_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-ARRAY['applied_at','apply_result']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['applied_at','apply_result']) THEN RAISE EXCEPTION 'Sự kiện ngân hàng bất biến' USING HINT='ck_append_only'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER tg_freeze BEFORE UPDATE ON core.bank_events FOR EACH ROW EXECUTE FUNCTION core.freeze_bank_event();
CREATE TRIGGER no_delete BEFORE DELETE ON core.bank_events FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
