CREATE TABLE cmd.deadline_results(deadline_id uuid PRIMARY KEY REFERENCES core.deadlines,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE cmd.deadline_results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON cmd.deadline_results FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER FUNCTION cmd.expire_deadline(uuid) RENAME TO expire_deadline_internal;
REVOKE ALL ON FUNCTION cmd.expire_deadline_internal(uuid) FROM agiviet_orchestrator;
CREATE FUNCTION cmd.expire_deadline_result(p_deadline uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE h core.deadlines%ROWTYPE; result jsonb; action text; v_status text; task uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO h FROM core.deadlines WHERE id=p_deadline FOR UPDATE;
 SELECT r.result INTO result FROM cmd.deadline_results r WHERE deadline_id=h.id;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF h.id IS NULL OR h.due_at>ref.clock_at() THEN RAISE EXCEPTION 'Hạn chưa đến' USING HINT='ck_deadline_not_due'; END IF;
 IF h.status<>'open' THEN RETURN jsonb_build_object('status',h.status,'action','already_handled','kind',h.kind,'entity',h.entity,'entity_id',h.entity_id,'order_id',h.order_id); END IF;
 PERFORM set_config('app.reason','Hết hạn '||h.kind,true);
 IF h.kind='group_cutoff' THEN action:='group_'||cmd.cutoff_group(h.entity_id);
 ELSIF h.kind='dispute_agreement' THEN
 UPDATE core.disputes SET status='external_resolution' WHERE id=h.entity_id AND status='inconclusive';
 task:=cmd.create_task('V12',2::smallint,h.entity,h.entity_id,h.order_id,'risk','deadline:'||h.id,'Tranh chấp không kết luận: chuyển cơ chế khác, giữ nguyên tiền'); action:='external_resolution';
 ELSIF h.kind='amendment_reply' AND EXISTS(SELECT 1 FROM core.amendments WHERE id=h.entity_id AND kind='force_majeure_reduction' AND status='open') THEN
 task:=cmd.create_task('V13',2::smallint,h.entity,h.entity_id,h.order_id,'risk','deadline:'||h.id,'Bất khả kháng: xét chứng cứ sau 24 giờ, không ký thay tự động'); action:='force_majeure_review';
 ELSIF h.kind='direct_payment_confirm' THEN
 IF EXISTS(SELECT 1 FROM core.direct_payments WHERE id=h.entity_id AND status='payer_reported') THEN
 UPDATE core.direct_payments SET status='mismatch' WHERE id=h.entity_id AND status='payer_reported';
 task:=cmd.create_task('V08',2::smallint,h.entity,h.entity_id,h.order_id,'finance','deadline:'||h.id,'Báo trả chưa được xác nhận: đối soát, không ghi đã nhận'); action:='payment_reconciliation';
 ELSE action:='already_satisfied'; END IF;
 ELSE
 v_status:=cmd.expire_deadline_internal(h.id);
 action:=CASE h.kind WHEN 'offer_reply' THEN 'offer_expired' WHEN 'hold' THEN 'hold_released' WHEN 'seller_sign' THEN 'order_sign_expired' WHEN 'deposit' THEN 'order_deposit_expired' WHEN 'cancellation_reply' THEN 'cancel_rejected' WHEN 'amendment_reply' THEN 'amendment_rejected' WHEN 'lot_visibility' THEN 'lot_hidden' WHEN 'urgent_sale' THEN 'urgent_sale_ended' WHEN 'direct_payment_due' THEN 'payment_overdue' ELSE 'evidence_review_required' END;
 SELECT id INTO task FROM ops.tasks WHERE dedup_key='deadline:'||h.id;
 END IF;
 UPDATE core.deadlines SET status='expired' WHERE id=h.id AND core.deadlines.status='open';
 result:=jsonb_build_object('status','expired','action',action,'kind',h.kind,'entity',h.entity,'entity_id',h.entity_id,'order_id',h.order_id,'task_id',task);
 INSERT INTO cmd.deadline_results(deadline_id,result) VALUES(h.id,result);
 PERFORM evt.emit('deadline',h.id,'deadline.processed',result,ARRAY['notify']); RETURN result;
END $$;
CREATE FUNCTION cmd.expire_deadline(p_deadline uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,public AS $$ BEGIN RETURN cmd.expire_deadline_result(p_deadline)->>'status'; END $$;
CREATE FUNCTION cmd.create_payment_receipt(p_payment uuid,p_amount bigint,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE p core.direct_payments%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO p FROM core.direct_payments WHERE id=p_payment FOR UPDATE;
 o:=cmd.party_order(p.order_id,ARRAY['owner','accountant','coop_board']);
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>p.amount_due_vnd-coalesce((SELECT sum(amount_vnd) FROM core.direct_payment_confirmations WHERE direct_payment_id=p.id),0) THEN RAISE EXCEPTION 'Sai số tiền biên nhận' USING HINT='ck_command_payment'; END IF;
 RETURN cmd.attach_document(o.id,'receipt_record',p_document||jsonb_build_object('canonical_content',coalesce(p_document->'canonical_content','{}')||jsonb_build_object('payment_id',p.id,'amount_vnd',p_amount)),'direct_payment',p.id);
END $$;
CREATE FUNCTION cmd.make_payment_due(p_payment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE p core.direct_payments%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO p FROM core.direct_payments WHERE id=p_payment FOR UPDATE;
 IF p.status IS DISTINCT FROM 'not_due' OR p.due_at IS NULL OR p.due_at>ref.clock_at() THEN RAISE EXCEPTION 'Khoản chưa tới mốc' USING HINT='ck_command_payment'; END IF;
 IF p.due_trigger='acceptance_closed' AND NOT EXISTS(SELECT 1 FROM core.deliveries WHERE id=p.delivery_id AND status='closed') OR p.due_trigger='order_active' AND NOT EXISTS(SELECT 1 FROM core.orders WHERE id=p.order_id AND status='active') THEN RAISE EXCEPTION 'Chưa có chứng cứ mốc trả' USING HINT='ck_command_payment'; END IF;
 UPDATE core.direct_payments SET status='due' WHERE id=p.id;
END $$;
CREATE OR REPLACE FUNCTION cmd.act_on_task(p_task uuid,p_action text,p_detail jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE t ops.tasks%ROWTYPE;
BEGIN
 SELECT * INTO t FROM ops.tasks WHERE id=p_task FOR UPDATE; PERFORM cmd.require_staff(ARRAY[t.required_role,'supervisor']);
 IF p_action='claim' AND t.assigned_to IS NULL AND t.status IN ('new','overdue') THEN UPDATE ops.tasks SET status=CASE WHEN status='overdue' THEN 'working' ELSE 'claimed' END,assigned_to=ref.ctx_user() WHERE id=t.id;
 ELSIF t.assigned_to IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Việc thuộc nhân viên khác' USING HINT='KHONG_CO_QUYEN';
 ELSIF p_action='start' THEN UPDATE ops.tasks SET status='working' WHERE id=t.id;
 ELSIF p_action='wait' THEN UPDATE ops.tasks SET status='waiting_customer' WHERE id=t.id;
 ELSIF p_action='finish' AND coalesce(length(btrim(p_detail->>'result')),0)>0 THEN
 IF t.status='claimed' THEN UPDATE ops.tasks SET status='working' WHERE id=t.id; END IF;
 UPDATE ops.tasks SET status='done',result_code=p_detail->>'result' WHERE id=t.id;
 ELSE RAISE EXCEPTION 'Hành động việc không hợp lệ' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.task_actions(task_id,actor_user_id,action,detail) VALUES(t.id,ref.ctx_user(),p_action,p_detail);
END $$;
-- Lượng giao theo từng lô của dòng gọi hàng; helper không được runtime gọi riêng.
CREATE FUNCTION cmd.move_delivery_start(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,core,ledger,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; l record;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery; SELECT * INTO o FROM core.orders WHERE id=d.order_id;
 IF o.framework_id IS NULL THEN
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'committed','in_transit','start_check',d.planned_qty,o.id,d.id,'delivery-start:'||d.id);
 ELSE
 FOR l IN SELECT lot_id,sum(qty)::bigint qty FROM core.order_lines WHERE order_id=o.id AND version_no=d.version_no GROUP BY lot_id ORDER BY lot_id LOOP
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(l.lot_id,'committed','in_transit','start_check',l.qty,o.id,d.id,'delivery-start:'||d.id||':'||l.lot_id); END LOOP;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION cmd.dispatch_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; PERFORM cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF d.status='in_transit' THEN RETURN; END IF;
 UPDATE core.deliveries SET status='in_transit' WHERE id=d.id;
 IF d.status='ready' THEN PERFORM cmd.move_delivery_start(d.id); END IF;
END $$;
CREATE OR REPLACE FUNCTION cmd.start_acceptance(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Sai người nhận' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deliveries SET status='checking' WHERE id=d.id;
 IF d.status='ready' THEN PERFORM cmd.move_delivery_start(d.id); END IF;
END $$;
CREATE FUNCTION cmd.move_delivery_closed(p_delivery uuid,p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,core,ledger,public AS $$
DECLARE x record; d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery;
 FOR x IN SELECT lot_id,kind='rejected' rejected,sum(qty)::bigint qty FROM core.acceptance_lines WHERE acceptance_id=p_acceptance GROUP BY lot_id,kind='rejected' ORDER BY lot_id,kind='rejected' LOOP
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,d.order_id,d.id,'delivery-close:'||d.id||':'||x.lot_id||':'||x.rejected); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION cmd.expire_deadline(uuid),cmd.expire_deadline_result(uuid),cmd.make_payment_due(uuid) TO agiviet_orchestrator;
GRANT EXECUTE ON FUNCTION cmd.create_payment_receipt(uuid,bigint,jsonb) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.finish_warehouse_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; x record;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF NOT EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no AND acceptance_point IN ('tai_kho_ben_mua','tai_cua_ben_mua')) THEN RAISE EXCEPTION 'Không giao tại kho/cửa' USING HINT='ck_command_state'; END IF;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Chưa chốt nghiệm thu' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 PERFORM cmd.move_delivery_closed(d.id,a.id);
END $$;

CREATE OR REPLACE FUNCTION cmd.create_settlement(p_order uuid,p_final boolean,p_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; prev core.settlements%ROWTYPE; s record; result uuid; dep uuid;
 vv bigint; dd bigint; cc bigint; prior bigint; xnb bigint; xbm bigint; mat bigint; nn bigint; cnb bigint; rel bigint; refund bigint; tbm bigint; tnb bigint; extra bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF p_final IS NULL OR p_key IS NULL OR length(btrim(p_key))=0 THEN RAISE EXCEPTION 'Thiếu khóa quyết toán' USING HINT='ck_command_payload'; END IF;
 SELECT id INTO result FROM core.settlements WHERE order_id=o.id AND inputs->>'command_key'=p_key;
 IF result IS NOT NULL THEN
 IF (SELECT is_final FROM core.settlements WHERE id=result) IS DISTINCT FROM p_final THEN RAISE EXCEPTION 'Khóa lặp khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN result; END IF;
 IF o.status NOT IN ('active','awaiting_settlement','outstanding','completed') THEN RAISE EXCEPTION 'Đơn chưa quyết toán được' USING HINT='ck_command_state'; END IF;
 IF EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money','done')) THEN RAISE EXCEPTION 'Đơn có quy trình hủy' USING HINT='ck_command_cancel'; END IF;
 SELECT * INTO prev FROM core.settlements WHERE order_id=o.id AND is_effective;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 SELECT id INTO dep FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 SELECT coalesce(sum(al.value_vnd),0) INTO vv FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries d ON d.id=av.delivery_id
 WHERE d.order_id=o.id AND (al.status='closed' OR (NOT p_final AND al.status='disputed')) AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=d.id AND n.version_no>av.version_no) AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines n WHERE n.replaces_line_id=al.id);
 SELECT coalesce(sum(c.amount_vnd),0) INTO dd FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.kind IN ('goods_before_loading','goods_on_receipt','goods_after_days','goods_extra','goods_batch');
 SELECT coalesce(sum(amount_vnd),0) INTO prior FROM core.bank_instructions WHERE order_id=o.id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled');
 SELECT coalesce(sum(balance_vnd),0)+prior INTO cc FROM ledger.v_account_balances WHERE order_id=o.id AND account_type IN ('deposit_escrow','deposit_in_instruction');
 SELECT coalesce(sum(amount_vnd) FILTER(WHERE payer_side='seller' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE payer_side='buyer' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE kind='materials_offset'),0) INTO xnb,xbm,mat FROM core.contract_charges WHERE order_id=o.id;
 nn:=vv-xnb+xbm-mat;
 IF prev.is_final THEN
 cc:=prev.c_vnd; prior:=prev.prior_released_vnd; cnb:=0; rel:=0; refund:=0; tbm:=greatest(0,nn-prev.n_vnd); tnb:=greatest(0,prev.n_vnd-nn);
 ELSIF p_final THEN
 SELECT * INTO s FROM ledger.split_settlement(vv,dd,cc,xnb,xbm,prior,mat);
 cnb:=s.c_nb_formula_vnd; rel:=s.release_vnd; refund:=s.refund_vnd; tbm:=s.t_bm_vnd; tnb:=s.t_nb_vnd;
 ELSE
 extra:=core.dispute_additional_hold(o.id); rel:=ledger.interim_release(vv,dd,cc,extra,prior); cnb:=rel+prior; refund:=0; tbm:=0; tnb:=0;
 END IF;
 IF p_final AND o.status='active' THEN UPDATE core.orders SET status='awaiting_settlement' WHERE id=o.id; END IF;
 INSERT INTO core.settlements(order_id,seq,previous_settlement_id,is_final,v_vnd,d_vnd,c_vnd,x_nb_vnd,x_bm_vnd,materials_offset_vnd,n_vnd,prior_released_vnd,c_nb_formula_vnd,release_vnd,refund_vnd,t_bm_vnd,t_nb_vnd,inputs,computed_by)
 VALUES(o.id,coalesce(prev.seq,0)+1,prev.id,p_final,vv,dd,cc,xnb,xbm,mat,nn,prior,cnb,rel,refund,tbm,tnb,jsonb_build_object('command_key',p_key),ref.ctx_user()) RETURNING id INTO result;
 IF rel>0 THEN
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_account_id,target_bank_code,target_account_masked,target_account_holder)
 VALUES('QT-'||result||'-CHI','release_deposit_to_seller',dep,o.id,'settlement',result,rel,o.seller_org_id,v.seller_bank_account_id,v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
 IF refund>0 THEN PERFORM cmd.refund_sources(o.id,'settlement',result,'refund_deposit_to_buyer',refund); END IF;
 IF o.framework_id IS NULL AND NOT coalesce(prev.is_final,false) AND greatest(tbm,tnb)>0 THEN
 INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,settlement_id,status)
 VALUES('QT-'||result,o.id,CASE WHEN tbm>0 THEN 'settlement_buyer_balance' ELSE 'seller_refund' END,CASE WHEN tbm>0 THEN 'buyer_to_seller' ELSE 'seller_to_buyer' END,CASE WHEN tbm>0 THEN o.buyer_org_id ELSE o.seller_org_id END,CASE WHEN tbm>0 THEN o.seller_org_id ELSE o.buyer_org_id END,greatest(tbm,tnb),'settlement',result,'due');
 END IF;
 IF dep IS NOT NULL THEN PERFORM cmd.refresh_deposit(dep); END IF; RETURN result;
END $$;
