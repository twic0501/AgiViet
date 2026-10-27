INSERT INTO ref.ledger_txn_kinds VALUES('cancellation_accrual','Quyền đòi khi hủy đã được hai bên đồng ý','accrual');
CREATE TABLE core.cancellation_accountings(
 cancellation_id uuid PRIMARY KEY REFERENCES core.cancellation_requests,order_id uuid NOT NULL REFERENCES core.orders,
 document_id uuid NOT NULL REFERENCES core.documents, cancelled_qty bigint NOT NULL CHECK(cancelled_qty>=0),
 value_vnd bigint NOT NULL CHECK(value_vnd>=0),forfeited_vnd bigint NOT NULL CHECK(forfeited_vnd>=0),
 n_vnd bigint NOT NULL,d_vnd bigint NOT NULL CHECK(d_vnd>=0),c_vnd bigint NOT NULL CHECK(c_vnd>=0),prior_released_vnd bigint NOT NULL CHECK(prior_released_vnd>=0),
 release_vnd bigint NOT NULL CHECK(release_vnd>=0),refund_vnd bigint NOT NULL CHECK(refund_vnd>=0),
 fee_refund_vnd bigint NOT NULL CHECK(fee_refund_vnd>=0),t_bm_vnd bigint NOT NULL CHECK(t_bm_vnd>=0),t_nb_vnd bigint NOT NULL CHECK(t_nb_vnd>=0),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(prior_released_vnd+release_vnd+refund_vnd=c_vnd),
 CHECK(d_vnd+prior_released_vnd+release_vnd+t_bm_vnd-t_nb_vnd=n_vnd)
);
ALTER TABLE core.cancellation_accountings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.cancellation_accountings FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
-- Hủy nghĩa vụ chưa trả cũng phải giữ các confirmations cũ; accounting sinh số ròng mới.
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds,requires_reason)
SELECT 'direct_payment',s,'cancelled',ARRAY['system'],true FROM unnest(ARRAY['payer_reported','partially_received','overdue','mismatch']) s;
CREATE OR REPLACE FUNCTION cmd.request_cancel(p_order uuid,p_reason text,p_text text,p_partial boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; result uuid;
BEGIN
 o:=cmd.party_order(p_order);
 IF o.status NOT IN ('drafting','internal_approval','awaiting_seller','active','awaiting_deposit') OR p_reason IS NULL OR p_reason NOT IN ('buyer_request','seller_request','force_majeure') OR p_partial IS NULL
 OR (p_reason='buyer_request' AND ref.ctx_actor()<>'buyer') OR (p_reason='seller_request' AND ref.ctx_actor()<>'seller') THEN RAISE EXCEPTION 'Sai trạng thái/bên xin hủy' USING HINT='ck_command_cancel'; END IF;
 IF EXISTS(SELECT 1 FROM core.disputes WHERE order_id=o.id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id AND status NOT IN ('preparing','ready','closed','shortfall_ended','cancelled'))
 OR (NOT p_partial AND EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id AND status IN ('closed','shortfall_ended')))
 OR EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id AND is_final) THEN RAISE EXCEPTION 'Còn giao nhận/tranh chấp hoặc phải hủy phần chưa giao' USING HINT='ck_command_cancel'; END IF;
 IF p_reason='force_majeure' AND NOT EXISTS(SELECT 1 FROM core.documents WHERE order_id=o.id AND doc_type='evidence' AND owner_org_id=ref.ctx_org()) THEN RAISE EXCEPTION 'Bất khả kháng cần chứng cứ' USING HINT='ck_command_evidence'; END IF;
 INSERT INTO core.cancellation_requests(order_id,requested_by_org_id,requested_by_user_id,reason_kind,reason_text,partial_undelivered_only)
 VALUES(o.id,ref.ctx_org(),ref.ctx_user(),p_reason,p_text,p_partial) RETURNING id INTO result;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('cancellation_reply','cancellation',result,o.id,ref.clock_at()+interval '24 hours',ref.clock_at()); RETURN result;
END $$;
CREATE OR REPLACE FUNCTION cmd.answer_cancel(p_request uuid,p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE c core.cancellation_requests%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO c FROM core.cancellation_requests WHERE id=p_request FOR UPDATE;
 PERFORM cmd.order_party(c.order_id,ref.ctx_actor(),ARRAY['owner','purchaser','coop_board']);
 IF c.requested_by_org_id=ref.ctx_org() OR p_accept IS NULL THEN RAISE EXCEPTION 'Chỉ bên kia trả lời' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF c.status IS DISTINCT FROM 'awaiting_reply' OR NOT EXISTS(SELECT 1 FROM core.deadlines WHERE entity='cancellation' AND entity_id=c.id AND kind='cancellation_reply' AND status='open' AND due_at>ref.clock_at()) THEN RAISE EXCEPTION 'Yêu cầu hủy không còn chờ/hết hạn' USING HINT='ck_command_cancel'; END IF;
 UPDATE core.cancellation_requests SET status=CASE WHEN p_accept THEN 'processing_money' ELSE 'rejected' END WHERE id=c.id;
 UPDATE core.deadlines SET status='met' WHERE entity='cancellation' AND entity_id=c.id AND status='open';
END $$;
CREATE FUNCTION cmd.process_cancellation(p_request uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE c core.cancellation_requests%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; dep core.deposits%ROWTYPE; a core.cancellation_accountings%ROWTYPE;
 doc uuid; q bigint; vv bigint; dd bigint; cc bigint; prior bigint; forfeit bigint; nn bigint; prev_n bigint; delta bigint; rel bigint; refund bigint; ff bigint; debt bigint; xnb bigint; xbm bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO c FROM core.cancellation_requests WHERE id=p_request FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=c.order_id FOR UPDATE;
 SELECT * INTO a FROM core.cancellation_accountings WHERE cancellation_id=c.id;
 IF a.cancellation_id IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=a.document_id AND content_sha256=(p_document->>'content_sha256')::bytea) THEN RAISE EXCEPTION 'Thử lại hủy khác chứng từ' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN a.document_id; END IF;
 IF c.status IS DISTINCT FROM 'processing_money' OR o.status IS DISTINCT FROM 'active' OR o.framework_id IS NOT NULL THEN RAISE EXCEPTION 'Hủy chưa được đồng ý' USING HINT='ck_command_cancel'; END IF;
 IF EXISTS(SELECT 1 FROM core.disputes WHERE order_id=o.id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id AND status NOT IN ('preparing','ready','closed','shortfall_ended','cancelled')) OR EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=o.id AND status IN ('created','sent','processing','succeeded')) THEN RAISE EXCEPTION 'Chờ giao nhận/tranh chấp/đối soát lệnh trước hủy' USING HINT='ck_command_cancel'; END IF;
 IF NOT c.partial_undelivered_only AND EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id AND status IN ('closed','shortfall_ended')) THEN RAISE EXCEPTION 'Đã giao: chỉ hủy phần còn lại' USING HINT='ck_command_cancel'; END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 SELECT * INTO dep FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 SELECT coalesce(sum(qty),0) INTO q FROM ledger.qty_balances WHERE lot_id=o.lot_id AND order_key=o.id AND bucket='committed';
 SELECT coalesce(sum(al.value_vnd),0) INTO vv FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries d ON d.id=av.delivery_id
 WHERE d.order_id=o.id AND al.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=d.id AND n.version_no>av.version_no) AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines n WHERE n.replaces_line_id=al.id);
 SELECT coalesce(sum(cn.amount_vnd),0) INTO dd FROM core.direct_payments p JOIN core.direct_payment_confirmations cn ON cn.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='buyer_to_seller';
 -- Nếu đã hoàn tiền trực tiếp, D là số nhận ròng (không đòi hoàn lần hai).
 dd:=dd-coalesce((SELECT sum(cn.amount_vnd) FROM core.direct_payments p JOIN core.direct_payment_confirmations cn ON cn.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='seller_to_buyer'),0);
 SELECT coalesce(sum(amount_vnd),0) INTO prior FROM core.bank_instructions WHERE order_id=o.id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled');
 SELECT coalesce(sum(balance_vnd),0)+prior INTO cc FROM ledger.v_account_balances WHERE order_id=o.id AND account_type='deposit_escrow';
 forfeit:=CASE WHEN c.reason_kind='buyer_request' THEN CASE WHEN c.partial_undelivered_only THEN least(cc,ref.div_round(cc::numeric*q,v.qty_min)) ELSE cc END ELSE 0 END;
 SELECT coalesce(sum(amount_vnd) FILTER(WHERE payer_side='seller'),0),coalesce(sum(amount_vnd) FILTER(WHERE payer_side='buyer'),0) INTO xnb,xbm FROM core.contract_charges WHERE order_id=o.id;
 nn:=vv+forfeit-xnb+xbm;
 rel:=greatest(0,least(cc,greatest(0,nn))-prior); refund:=cc-prior-rel;
 debt:=nn-dd-prior-rel;
 SELECT coalesce(sum(balance_vnd),0) INTO ff FROM ledger.v_account_balances WHERE order_id=o.id AND account_type='fee_held';
 ff:=CASE WHEN c.reason_kind IN ('seller_request','force_majeure') THEN CASE WHEN c.partial_undelivered_only THEN least(ff,ref.div_round(v.fee_vnd::numeric*q,v.qty_min)) ELSE ff END ELSE 0 END;
 doc:=cmd.attach_document(o.id,'cancellation_record',p_document,'cancellation',c.id);
 INSERT INTO core.cancellation_accountings(cancellation_id,order_id,document_id,cancelled_qty,value_vnd,forfeited_vnd,n_vnd,d_vnd,c_vnd,prior_released_vnd,release_vnd,refund_vnd,fee_refund_vnd,t_bm_vnd,t_nb_vnd)
 VALUES(c.id,o.id,doc,q,vv,forfeit,nn,dd,cc,prior,rel,refund,ff,greatest(0,debt),greatest(0,-debt));
 SELECT coalesce((SELECT n_vnd FROM core.settlements WHERE order_id=o.id AND is_effective),0) INTO prev_n;
 delta:=nn-prev_n;
 IF delta<>0 THEN PERFORM ledger.post('cancellation_accrual',o.id,'cancel-accrual:'||c.id,'Hạch toán hủy đã đồng ý',jsonb_build_array(jsonb_build_object('type','seller_receivable','order',o.id,'amount',delta),jsonb_build_object('type','buyer_payable','order',o.id,'amount',-delta)),now(),NULL,NULL,jsonb_build_object('cancellation',c.id)); END IF;
 PERFORM set_config('app.reason','Hủy đã được hai bên đồng ý',true);
 UPDATE core.deliveries SET status='cancelled' WHERE order_id=o.id AND status IN ('preparing','ready');
 IF q>0 THEN PERFORM ledger.move_qty(o.lot_id,'committed','available','commit_release',q,o.id,'cancel-qty:'||c.id); END IF;
 UPDATE core.qr_tokens SET revoked_at=ref.clock_at() WHERE delivery_id IN (SELECT id FROM core.deliveries WHERE order_id=o.id AND status='cancelled') AND revoked_at IS NULL;
 UPDATE core.deadlines SET status='cancelled' WHERE order_id=o.id AND status='open';
 UPDATE core.direct_payments SET status='cancelled' WHERE order_id=o.id AND status NOT IN ('fully_received','cancelled');
 IF rel>0 THEN INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_account_id,target_bank_code,target_account_masked,target_account_holder)
 VALUES('CANCEL-'||c.id||'-SELL', 'release_deposit_to_seller',dep.id,o.id,'cancellation',c.id,rel,o.seller_org_id,v.seller_bank_account_id,v.seller_bank_code,v.seller_account_masked,v.seller_account_holder); END IF;
 IF refund>0 THEN PERFORM cmd.refund_sources(o.id,'cancellation',c.id,'refund_deposit_to_buyer',refund); END IF;
 IF ff>0 THEN PERFORM cmd.refund_sources(o.id,'cancellation',c.id,'refund_fee',ff); END IF;
 IF debt<>0 THEN INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at)
 VALUES('CANCEL-'||c.id||'-DIRECT',o.id,CASE WHEN debt>0 THEN 'settlement_buyer_balance' ELSE 'seller_refund' END,CASE WHEN debt>0 THEN 'buyer_to_seller' ELSE 'seller_to_buyer' END,CASE WHEN debt>0 THEN o.buyer_org_id ELSE o.seller_org_id END,CASE WHEN debt>0 THEN o.seller_org_id ELSE o.buyer_org_id END,abs(debt),'cancellation','due',ref.clock_at()+interval '72 hours'); END IF;
 PERFORM cmd.refresh_deposit(dep.id);
 PERFORM evt.emit('cancellation',c.id,'cancellation.accounted',jsonb_build_object('order_id',o.id,'document_id',doc,'n_vnd',nn),ARRAY['notify']); RETURN doc;
END $$;
-- Ghi entitlement mới từ accounting bất biến. Các căn cứ cũ vẫn được kiểm như trước.
CREATE OR REPLACE FUNCTION core.guard_refund_entitlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; used bigint; entitled bigint; adj core.deposit_adjustments%ROWTYPE;
BEGIN
 IF NEW.kind LIKE 'refund_%' THEN SELECT * INTO e FROM core.bank_events WHERE id=NEW.source_bank_event_id FOR UPDATE;
 IF e.payer_bank_code IS NULL OR NEW.target_bank_code IS DISTINCT FROM e.payer_bank_code THEN RAISE EXCEPTION 'Sai ngân hàng nguồn hoàn' USING HINT='ck_refund_source'; END IF; END IF;
 IF NEW.basis_kind='excess' THEN SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE basis_kind='excess' AND basis_id=NEW.basis_id AND status<>'failed';
 IF NEW.basis_id IS DISTINCT FROM e.id OR used+NEW.amount_vnd>e.excess_vnd THEN RAISE EXCEPTION 'Vượt tiền thừa' USING HINT='ck_instruction_excess'; END IF; END IF;
 IF NEW.basis_kind='fee_refund' OR NEW.kind='refund_fee' THEN
 IF NEW.kind<>'refund_fee' THEN RAISE EXCEPTION 'Sai loại lệnh hoàn phí' USING HINT='ck_instruction_fee_refund'; END IF;
 IF NEW.basis_kind='cancellation' THEN
 SELECT fee_refund_vnd INTO entitled FROM core.cancellation_accountings WHERE cancellation_id=NEW.basis_id AND order_id=NEW.order_id;
 IF entitled IS NULL THEN -- tương thích fixture/import cũ, không có command runtime tạo accounting giả
 SELECT d.expected_fee_vnd INTO entitled FROM core.cancellation_requests c JOIN core.deposits d ON d.order_id=c.order_id WHERE c.id=NEW.basis_id AND c.order_id=NEW.order_id AND c.status='processing_money' AND NOT c.partial_undelivered_only AND c.reason_kind IN ('seller_request','seller_no_delivery','force_majeure'); END IF;
 ELSIF NEW.basis_kind='fee_refund' THEN
 SELECT a.* INTO adj FROM core.deposit_adjustments a JOIN core.orders o ON o.id=NEW.order_id JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=a.order_version_no JOIN core.amendments am ON am.id=v.amendment_id
 WHERE a.id=NEW.basis_id AND a.deposit_id=NEW.deposit_id AND a.delta_fee_vnd<0 AND v.version_no<=o.effective_version_no AND am.kind IN ('decrease_qty','force_majeure_reduction') AND am.status='accepted'; entitled:=-adj.delta_fee_vnd; END IF;
 SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE kind='refund_fee' AND basis_kind=NEW.basis_kind AND basis_id=NEW.basis_id AND status<>'failed';
 IF entitled IS NULL OR NEW.amount_vnd+used>entitled THEN RAISE EXCEPTION 'Hoàn phí thiếu căn cứ/vượt quyền' USING HINT='ck_instruction_fee_refund'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE FUNCTION cmd.finish_cancellation(p_request uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE c core.cancellation_requests%ROWTYPE; a core.cancellation_accountings%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO c FROM core.cancellation_requests WHERE id=p_request FOR UPDATE;
 PERFORM 1 FROM core.orders WHERE id=c.order_id FOR UPDATE;
 IF c.status='done' THEN RETURN 'done'; END IF;
 SELECT * INTO a FROM core.cancellation_accountings WHERE cancellation_id=c.id;
 IF c.status IS DISTINCT FROM 'processing_money' OR a.cancellation_id IS NULL THEN RAISE EXCEPTION 'Chưa hạch toán hủy' USING HINT='ck_command_cancel'; END IF;
 IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=c.order_id AND status NOT IN ('reconciled','failed')) OR EXISTS(SELECT 1 FROM core.direct_payments WHERE order_id=c.order_id AND status NOT IN ('fully_received','cancelled'))
 OR EXISTS(SELECT 1 FROM ops.bank_return_tasks t JOIN core.deposits d ON d.id=t.deposit_id WHERE d.order_id=c.order_id AND t.status<>'returned')
 OR EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=c.order_id AND account_type IN ('deposit_escrow','deposit_in_instruction','deposit_pending','excess_held','excess_in_instruction','fee_in_instruction','seller_receivable','buyer_payable') AND balance_vnd<>0) THEN RETURN 'processing_money'; END IF;
 PERFORM set_config('app.reason','Tiền hủy đã đối soát và các nghĩa vụ đã nhận đủ',true);
 UPDATE core.cancellation_requests SET status='done' WHERE id=c.id;
 UPDATE core.orders SET status='closed',close_reason=CASE WHEN status='closed' THEN close_reason WHEN c.reason_kind='force_majeure' THEN 'force_majeure' ELSE 'cancel_after_deposit' END WHERE id=c.order_id;
 PERFORM evt.emit('cancellation',c.id,'cancellation.done','{}',ARRAY['notify']); RETURN 'done';
END $$;
CREATE FUNCTION cmd.refund_excess(p_event uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE e core.bank_events%ROWTYPE; d core.deposits%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO e FROM core.bank_events WHERE id=p_event FOR UPDATE;
 SELECT * INTO d FROM core.deposits WHERE payment_ref=e.payment_ref OR id IN (SELECT deposit_id FROM core.deposit_adjustments WHERE payment_ref=e.payment_ref) FOR UPDATE;
 SELECT id INTO result FROM core.bank_instructions WHERE basis_kind='excess' AND basis_id=e.id AND status<>'failed';
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF e.excess_vnd<=0 OR e.apply_result IS DISTINCT FROM 'applied' THEN RAISE EXCEPTION 'Không có tiền thừa' USING HINT='ck_instruction_excess'; END IF;
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_code,target_account_masked,target_account_holder,source_bank_event_id,target_account_hash)
 VALUES('EXCESS-'||e.id,'refund_excess',d.id,d.order_id,'excess',e.id,e.excess_vnd,d.payer_org_id,e.payer_bank_code,e.payer_account_masked,e.payer_account_name,e.id,e.payer_account_hash) RETURNING id INTO result;
 PERFORM cmd.refresh_deposit(d.id); RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.process_cancellation(uuid,jsonb),cmd.finish_cancellation(uuid),cmd.refund_excess(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
