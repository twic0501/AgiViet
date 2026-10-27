-- Phần hệ thống D-01: login kế thừa orchestrator, ánh xạ actor system, không DML.
CREATE FUNCTION cmd.sync_document(p_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.documents%ROWTYPE; missing boolean;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.documents WHERE id=p_doc FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM ref.document_types t,unnest(t.needs_signatures) s WHERE t.code=d.doc_type AND NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=d.id AND party=s)) INTO missing;
 IF d.status IN ('awaiting_signature','partially_signed') THEN
 UPDATE core.documents SET status=CASE WHEN missing THEN 'partially_signed' ELSE 'fully_signed' END WHERE id=d.id AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=d.id);
 END IF;
END $$;
CREATE FUNCTION cmd.send_order(p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.order_party(p_order,'buyer',ARRAY['owner','purchaser']);
 IF NOT EXISTS(SELECT 1 FROM core.order_versions v JOIN core.signatures s ON s.document_id=v.document_id AND s.party='buyer' WHERE v.order_id=o.id AND v.version_no=1) THEN RAISE EXCEPTION 'Bên mua chưa ký' USING HINT='ck_command_terms'; END IF;
 UPDATE core.orders SET status='awaiting_seller' WHERE id=o.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('seller_sign','order',o.id,o.id,ref.clock_at()+interval '24 hours',ref.clock_at());
END $$;
CREATE FUNCTION cmd.finalize_signed_order(p_order uuid,p_payment_ref text,p_virtual_account text,p_provider text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF o.contract_type<>'spot' OR o.status<>'awaiting_seller' THEN RAISE EXCEPTION 'Đơn không ở bước ký' USING HINT='ck_command_state'; END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 PERFORM cmd.sync_document(v.document_id);
 UPDATE core.orders SET effective_version_no=1,status='awaiting_deposit' WHERE id=o.id;
 INSERT INTO core.deposits(order_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no,bank_provider)
 VALUES(o.id,o.buyer_org_id,v.deposit_vnd,v.fee_vnd,p_payment_ref,p_virtual_account,p_provider) RETURNING id INTO result;
 UPDATE core.deadlines SET status='met' WHERE entity_id=o.id AND kind='seller_sign' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('deposit','deposit',result,o.id,ref.clock_at()+interval '24 hours',ref.clock_at());
 RETURN result;
END $$;
CREATE FUNCTION cmd.activate_order_after_deposit(p_order uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF o.status='active' THEN SELECT id INTO result FROM core.deliveries WHERE order_id=o.id AND batch_no=1; RETURN result; END IF;
 IF o.status IS DISTINCT FROM 'awaiting_deposit' THEN RAISE EXCEPTION 'Đơn không chờ cọc' USING HINT='ck_command_state'; END IF;
 UPDATE core.orders SET status='active' WHERE id=o.id; -- guard kiểm bằng chứng + số dư C/F.
 UPDATE core.holds SET status='committed' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='met' WHERE order_id=o.id AND kind='deposit' AND status='open';
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
 VALUES(o.code||'-D1',o.id,v.version_no,1,v.qty_min,v.delivery_window,v.designated_receiver_user_id) RETURNING id INTO result;
 IF v.designated_receiver_user_id IS NOT NULL THEN PERFORM core.issue_qr('receipt',result,greatest(upper(v.delivery_window),ref.clock_at()+interval '1 hour'),v.designated_receiver_user_id); END IF;
 IF v.contract_value_vnd>v.deposit_vnd AND v.payment_timing='before_loading' THEN
 INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES(o.code||'-BEFORE',o.id,'goods_before_loading','buyer_to_seller',o.buyer_org_id,o.seller_org_id,v.contract_value_vnd-v.deposit_vnd,'order_active','due',true,lower(v.delivery_window),v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.ready_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.require_system(); PERFORM 1 FROM core.orders WHERE id=(SELECT order_id FROM core.deliveries WHERE id=p_delivery) FOR UPDATE;
 UPDATE core.deliveries SET status='ready' WHERE id=p_delivery;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có đợt' USING HINT='ck_command_state'; END IF;
END $$;
CREATE FUNCTION cmd.accept_trip(p_trip uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$ BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher']);
 UPDATE core.trips SET status='accepted' WHERE id=p_trip; -- dispatcher ghi sau xác nhận thực từ nhà xe.
 IF NOT FOUND THEN RAISE EXCEPTION 'Không có chuyến' USING HINT='ck_command_state'; END IF;
 PERFORM evt.audit('trip.accepted','trip',p_trip);
END $$;
CREATE FUNCTION cmd.dispatch_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 UPDATE core.deliveries SET status='in_transit' WHERE id=d.id;
 IF d.status='ready' THEN
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 VALUES(o.lot_id,'committed','in_transit','start_check',d.planned_qty,o.id,d.id,'delivery-start:'||d.id);
 END IF;
END $$;
-- Nhập lệnh hoàn từ các nguồn đã tra lại. Không cho caller chọn tài khoản đích.
CREATE FUNCTION cmd.refund_sources(p_order uuid,p_basis_kind text,p_basis uuid,p_kind text,p_amount bigint) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE dep core.deposits%ROWTYPE; e record; remain bigint:=p_amount; amt bigint; buyer uuid;
BEGIN
 SELECT * INTO dep FROM core.deposits WHERE order_id=p_order FOR UPDATE;
 SELECT buyer_org_id INTO buyer FROM core.orders WHERE id=p_order;
 FOR e IN SELECT b.*,b.amount_vnd-coalesce((SELECT sum(amount_vnd) FROM core.bank_instructions WHERE source_bank_event_id=b.id AND status<>'failed'),0) available
 FROM core.bank_events b WHERE b.kind='deposit_received' AND b.applied_at IS NOT NULL AND b.apply_result='applied' AND b.payer_account_hash IS NOT NULL
 AND (b.payment_ref=dep.payment_ref OR b.payment_ref IN (SELECT payment_ref FROM core.deposit_adjustments WHERE deposit_id=dep.id)) ORDER BY b.occurred_at,b.id FOR UPDATE OF b LOOP
 EXIT WHEN remain<=0; amt:=least(remain,e.available); IF amt<=0 THEN CONTINUE; END IF;
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_code,target_account_masked,target_account_holder,source_bank_event_id,target_account_hash)
 VALUES('REF-'||gen_random_uuid(),p_kind,dep.id,p_order,p_basis_kind,p_basis,amt,buyer,e.payer_bank_code,e.payer_account_masked,e.payer_account_name,e.id,e.payer_account_hash);
 remain:=remain-amt;
 END LOOP;
 IF remain>0 THEN RAISE EXCEPTION 'Thiếu chứng cứ nguồn hoàn' USING HINT='ck_refund_source'; END IF;
END $$;
CREATE FUNCTION cmd.refresh_deposit(p_deposit uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deposits%ROWTYPE; target text; balance bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deposits WHERE id=p_deposit FOR UPDATE;
 IF d.status NOT IN ('held','processing') THEN RETURN d.status; END IF;
 IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE deposit_id=d.id AND status IN ('created','sent','processing','succeeded')) THEN target:='processing';
 ELSE
 SELECT coalesce(sum(balance_vnd),0) INTO balance FROM ledger.v_account_balances WHERE order_id IS NOT DISTINCT FROM d.order_id AND framework_id IS NOT DISTINCT FROM d.framework_id AND account_type IN ('deposit_escrow','deposit_in_instruction','excess_held','excess_in_instruction','fee_in_instruction','deposit_pending');
 target:=CASE WHEN balance>0 THEN 'held' WHEN EXISTS(SELECT 1 FROM core.bank_instructions WHERE deposit_id=d.id AND status='reconciled') THEN 'fully_processed' ELSE d.status END;
 END IF;
 IF d.status='held' AND target='fully_processed' THEN UPDATE core.deposits SET status='processing' WHERE id=d.id; END IF;
 IF d.status<>target THEN UPDATE core.deposits SET status=target WHERE id=d.id; END IF;
 RETURN target;
END $$;
CREATE FUNCTION cmd.refund_deposit_reduction(p_order uuid,p_version integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deposits%ROWTYPE; v core.order_versions%ROWTYPE; prev core.order_versions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_system(); PERFORM 1 FROM core.orders WHERE id=p_order AND effective_version_no>=p_version FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Phụ lục chưa hiệu lực' USING HINT='ck_instruction_deposit_adjustment'; END IF;
 SELECT * INTO d FROM core.deposits WHERE order_id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=p_order AND version_no=p_version;
 SELECT * INTO prev FROM core.order_versions WHERE order_id=p_order AND version_no=p_version-1;
 IF prev.order_id IS NULL OR v.deposit_vnd>=prev.deposit_vnd THEN RAISE EXCEPTION 'Không có phần cọc giảm' USING HINT='ck_instruction_deposit_adjustment'; END IF;
 SELECT id INTO result FROM core.deposit_adjustments WHERE deposit_id=d.id AND order_version_no=p_version;
 IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO core.deposit_adjustments(deposit_id,order_version_no,delta_deposit_vnd,delta_fee_vnd) VALUES(d.id,p_version,v.deposit_vnd-prev.deposit_vnd,v.fee_vnd-prev.fee_vnd) RETURNING id INTO result;
 PERFORM cmd.refund_sources(p_order,'deposit_adjustment',result,'refund_deposit_to_buyer',prev.deposit_vnd-v.deposit_vnd);
 IF prev.fee_vnd>v.fee_vnd THEN PERFORM cmd.refund_sources(p_order,'fee_refund',result,'refund_fee',prev.fee_vnd-v.fee_vnd); END IF;
 PERFORM cmd.refresh_deposit(d.id); RETURN result;
END $$;
CREATE FUNCTION cmd.create_settlement(p_order uuid,p_final boolean,p_key text) RETURNS uuid
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
 IF NOT coalesce(prev.is_final,false) AND greatest(tbm,tnb)>0 THEN
 INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,settlement_id,status)
 VALUES('QT-'||result,o.id,CASE WHEN tbm>0 THEN 'settlement_buyer_balance' ELSE 'seller_refund' END,CASE WHEN tbm>0 THEN 'buyer_to_seller' ELSE 'seller_to_buyer' END,CASE WHEN tbm>0 THEN o.buyer_org_id ELSE o.seller_org_id END,CASE WHEN tbm>0 THEN o.seller_org_id ELSE o.buyer_org_id END,greatest(tbm,tnb),'settlement',result,'due');
 END IF;
 PERFORM cmd.refresh_deposit(dep); RETURN result;
END $$;
CREATE FUNCTION cmd.send_instruction(p_instruction uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,evt,ref,public AS $$
DECLARE b core.bank_instructions%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO b FROM core.bank_instructions WHERE id=p_instruction FOR UPDATE;
 IF b.status IN ('sent','processing','succeeded','reconciled') THEN RETURN; END IF;
 IF b.status IS DISTINCT FROM 'created' THEN RAISE EXCEPTION 'Lệnh không thể gửi' USING HINT='ck_command_state'; END IF;
 UPDATE core.bank_instructions SET status='sent',sent_at=now() WHERE id=b.id; -- guard gọi lại vẫn chạy.
 PERFORM evt.emit('bank_instruction',b.id,'bank.dispatch',jsonb_build_object('instruction_code',b.code),ARRAY['bank']);
END $$;
CREATE FUNCTION cmd.reconcile_instruction(p_instruction uuid,p_proof uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,evt,ref,public AS $$
DECLARE b core.bank_instructions%ROWTYPE; e core.bank_events%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO b FROM core.bank_instructions WHERE id=p_instruction FOR UPDATE;
 SELECT * INTO e FROM core.bank_events WHERE id=p_proof;
 IF e.kind IS DISTINCT FROM 'statement_line' OR e.instruction_code IS DISTINCT FROM b.code OR e.amount_vnd IS DISTINCT FROM b.amount_vnd
 OR e.bank_txn_ref IS DISTINCT FROM b.bank_txn_ref OR e.bank_txn_ref IS NULL OR e.requery_status IS DISTINCT FROM 'confirmed'
 OR e.requery_evidence->>'direction' IS DISTINCT FROM 'debit'
 OR e.requery_evidence->>'target_bank_code' IS DISTINCT FROM b.target_bank_code
 OR e.requery_evidence->>'target_account_hash' IS DISTINCT FROM encode(coalesce(b.target_account_hash,(SELECT account_number_hash FROM pii.bank_accounts WHERE id=b.target_bank_account_id)),'hex')
 OR NOT EXISTS(SELECT 1 FROM evt.inbound_webhooks WHERE id=e.webhook_id AND signature_valid) THEN
 RAISE EXCEPTION 'Thiếu sao kê đúng lệnh/số tiền/đích' USING HINT='ck_instruction_reconciliation'; END IF;
 IF b.status<>'reconciled' THEN UPDATE core.bank_instructions SET status='reconciled' WHERE id=b.id; END IF;
 PERFORM evt.audit('bank.reconciled','bank_instruction',b.id,jsonb_build_object('proof',e.id));
 PERFORM cmd.refresh_deposit(b.deposit_id);
END $$;
CREATE FUNCTION cmd.expire_deadline(p_deadline uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE h core.deadlines%ROWTYPE; d core.deposits%ROWTYPE; o core.orders%ROWTYPE; hold core.holds%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO h FROM core.deadlines WHERE id=p_deadline FOR UPDATE;
 IF h.id IS NULL OR h.due_at>ref.clock_at() THEN RAISE EXCEPTION 'Hạn chưa tới' USING HINT='ck_deadline_not_due'; END IF;
 IF h.status<>'open' THEN RETURN h.status; END IF;
 PERFORM set_config('app.reason','Hết hạn '||h.kind,true);
 CASE h.kind
 WHEN 'offer_reply' THEN UPDATE core.offers SET status='expired' WHERE id=h.entity_id AND status='sent';
 WHEN 'hold' THEN
 SELECT * INTO hold FROM core.holds WHERE id=h.entity_id FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=hold.order_id FOR UPDATE;
 IF o.status IS DISTINCT FROM 'awaiting_deposit' THEN
 UPDATE core.holds SET status='expired' WHERE id=hold.id AND status='active';
 UPDATE core.orders SET status='closed',close_reason='sign_expired' WHERE id=o.id AND status IN ('drafting','internal_approval','awaiting_seller');
 END IF;
 WHEN 'seller_sign','deposit' THEN
 IF h.kind='deposit' THEN SELECT * INTO d FROM core.deposits WHERE id=h.entity_id FOR UPDATE; h.order_id:=d.order_id; END IF;
 SELECT * INTO o FROM core.orders WHERE id=coalesce(h.order_id,h.entity_id) FOR UPDATE;
 IF o.status IN ('drafting','internal_approval','awaiting_seller','awaiting_deposit') THEN
 UPDATE core.orders SET status='closed',close_reason=CASE WHEN h.kind='deposit' THEN 'deposit_expired' ELSE 'sign_expired' END WHERE id=o.id;
 UPDATE core.holds SET status='expired' WHERE id=o.hold_id AND status='active';
 -- Tiền từng phần vẫn treo: tạo việc hoàn nguồn thay vì nhận là cọc.
 INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
 SELECT e.id,d.id,'deposit_expired' FROM core.bank_events e WHERE e.payment_ref=d.payment_ref AND e.kind='deposit_received' AND e.apply_result='applied' AND d.status='partially_received' ON CONFLICT DO NOTHING;
 END IF;
 WHEN 'cancellation_reply' THEN UPDATE core.cancellation_requests SET status='rejected' WHERE id=h.entity_id AND status='awaiting_reply';
 WHEN 'amendment_reply' THEN UPDATE core.amendments SET status='rejected' WHERE id=h.entity_id AND status='open';
 WHEN 'lot_visibility' THEN UPDATE core.lots SET status='hidden' WHERE id=h.entity_id AND status='on_sale';
 WHEN 'urgent_sale' THEN UPDATE core.lots SET urgent_sale_until=NULL WHERE id=h.entity_id;
 WHEN 'direct_payment_due' THEN UPDATE core.direct_payments SET status='overdue' WHERE id=h.entity_id AND status IN ('due','partially_received');
 ELSE
 -- Các hạn cần đánh giá bằng chứng tạo task, không tự coi im lặng là nhận tiền/hàng.
 INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,order_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
 VALUES('HAN-'||h.id,'V07',2,h.entity,h.entity_id,h.order_id,'dispatcher','deadline:'||h.id,'Hết hạn '||h.kind||': cần điều phối theo chứng cứ',ref.clock_at()+interval '4 hours',ref.clock_at()+interval '48 hours',ref.clock_at()+interval '24 hours') ON CONFLICT(dedup_key) DO NOTHING;
 END CASE;
 UPDATE core.deadlines SET status='expired' WHERE id=h.id;
 RETURN 'expired';
END $$;
CREATE FUNCTION cmd.activate_bank_account(p_account uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,pii,ref,public AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT org_id INTO org FROM pii.bank_accounts WHERE id=p_account AND status='cooling_down' FOR UPDATE;
 IF org IS NULL THEN RAISE EXCEPTION 'Tài khoản không chờ kích hoạt' USING HINT='ck_bank_cooldown'; END IF;
 PERFORM 1 FROM core.organizations WHERE id=org FOR UPDATE;
 UPDATE pii.bank_accounts SET status='replaced' WHERE org_id=org AND status='active';
 UPDATE pii.bank_accounts SET status='active' WHERE id=p_account;
END $$;
CREATE FUNCTION cmd.act_on_task(p_task uuid,p_action text,p_detail jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE t ops.tasks%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO t FROM ops.tasks WHERE id=p_task FOR UPDATE;
 PERFORM cmd.require_staff(ARRAY[t.required_role]);
 IF p_action='claim' AND t.assigned_to IS NULL THEN UPDATE ops.tasks SET status='claimed',assigned_to=ref.ctx_user() WHERE id=t.id;
 ELSIF t.assigned_to IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Việc thuộc nhân viên khác' USING HINT='KHONG_CO_QUYEN';
 ELSIF p_action='start' THEN UPDATE ops.tasks SET status='working' WHERE id=t.id;
 ELSIF p_action='finish' AND length(btrim(p_detail->>'result'))>0 THEN UPDATE ops.tasks SET status='done',result_code=p_detail->>'result' WHERE id=t.id;
 ELSE RAISE EXCEPTION 'Hành động việc không hợp lệ' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.task_actions(task_id,actor_user_id,action,detail) VALUES(t.id,ref.ctx_user(),p_action,p_detail);
END $$;
CREATE FUNCTION cmd.record_call(p_task uuid,p_contact uuid,p_seconds integer,p_summary text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE t ops.tasks%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO t FROM ops.tasks WHERE id=p_task;
 PERFORM cmd.require_staff(ARRAY[t.required_role]);
 IF t.assigned_to IS DISTINCT FROM ref.ctx_user() OR length(btrim(p_summary))=0 THEN RAISE EXCEPTION 'Chưa nhận việc hoặc thiếu nội dung' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO ops.calls(task_id,caller_user_id,callee_user_id,duration_seconds,summary) VALUES(t.id,ref.ctx_user(),p_contact,p_seconds,p_summary) RETURNING id INTO result; RETURN result;
END $$;
-- Sửa mục 8 bằng định nghĩa mới, giữ mọi điều kiện ready/tiền/giờ của 0018.
CREATE OR REPLACE FUNCTION core.guard_delivery_ready() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; available numeric; received numeric; value_due numeric; needed text; normalized text; market text;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 SELECT * INTO v FROM core.order_versions WHERE order_id=NEW.order_id AND version_no=NEW.version_no;
 IF TG_OP='INSERT' OR NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NEW.status='ready' THEN
 IF o.status<>'active' OR NEW.version_no IS DISTINCT FROM o.effective_version_no OR EXISTS(SELECT 1 FROM core.amendments WHERE order_id=o.id AND status='open') OR
 EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money')) THEN RAISE EXCEPTION 'Đơn chưa đủ điều kiện giao' USING HINT='ck_delivery_ready'; END IF;
 IF o.lot_id IS NOT NULL THEN
 PERFORM 1 FROM core.lots WHERE id=o.lot_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.lots WHERE id=o.lot_id AND safety_locked_at IS NOT NULL) THEN RAISE EXCEPTION 'Lô khóa an toàn' USING HINT='ck_delivery_ready'; END IF;
 SELECT coalesce(sum(qty),0) INTO available FROM ledger.qty_balances WHERE lot_id=o.lot_id AND order_key=o.id AND bucket='committed';
 IF NEW.planned_qty>available THEN RAISE EXCEPTION 'Chưa đủ lượng cam kết' USING HINT='ck_delivery_ready'; END IF; END IF;
 IF o.framework_id IS NULL THEN
 SELECT coalesce(sum(balance_vnd),0) INTO available FROM ledger.v_account_balances WHERE order_id=o.id AND account_type='deposit_escrow';
 available:=available+coalesce((SELECT sum(amount_vnd) FROM core.bank_instructions WHERE order_id=o.id AND kind='release_deposit_to_seller' AND status IN ('created','sent','processing','succeeded','reconciled')),0);
 IF available<v.deposit_vnd THEN RAISE EXCEPTION 'Chưa đủ cọc sau phụ lục' USING HINT='ck_delivery_deposit'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM core.direct_payments p WHERE order_id=o.id AND blocks_loading AND kind<>'goods_on_receipt' AND p.status<>'cancelled' AND p.amount_due_vnd<>(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations WHERE direct_payment_id=p.id)) THEN RAISE EXCEPTION 'Chưa đủ tiền trước bốc' USING HINT='CHUA_DU_TIEN_TRUOC_BOC'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.user_id=NEW.receiver_user_id AND m.org_id=o.buyer_org_id AND m.status='active' AND r.role_code IN ('owner','warehouse','site_receiver')) THEN RAISE EXCEPTION 'Chưa chỉ định người nhận hợp lệ' USING HINT='ck_delivery_ready'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.qr_tokens WHERE delivery_id=NEW.id AND kind='receipt' AND designated_user_id=NEW.receiver_user_id AND revoked_at IS NULL AND expires_at>ref.clock_at()) THEN RAISE EXCEPTION 'Chưa phát QR nhận hàng' USING HINT='ck_delivery_ready'; END IF;
 IF v.transport_by IN ('buyer','partner_for_buyer','partner_for_seller') AND NOT EXISTS(SELECT 1 FROM core.trip_deliveries td JOIN core.trips t ON t.id=td.trip_id WHERE td.delivery_id=NEW.id AND t.status IN ('accepted','at_pickup','loading')) THEN RAISE EXCEPTION 'Chưa có chuyến xe nhận chở' USING HINT='ck_delivery_ready'; END IF;
 IF v.inspection_before_loading AND NOT EXISTS(SELECT 1 FROM core.inspections i JOIN core.inspection_results r ON r.inspection_id=i.id WHERE i.delivery_id=NEW.id AND r.result='passed' AND NOT EXISTS(SELECT 1 FROM core.inspection_results n WHERE n.supersedes_id=r.id)) THEN RAISE EXCEPTION 'Chưa đạt kiểm định trước bốc' USING HINT='ck_delivery_ready'; END IF;
 FOR needed IN SELECT unnest(required_docs) FROM core.demands WHERE id=o.demand_id LOOP
 normalized:=CASE split_part(needed,':',1) WHEN 'ma_vung_trong' THEN 'growing_area_code' WHEN 'nhat_ky_cach_ly' THEN 'spray_diary' WHEN 'nhat_ky_ao' THEN 'pond_diary' WHEN 'kiem_dinh' THEN CASE split_part(needed,':',2) WHEN 'cadimi_vang_o' THEN 'cadmium_test' WHEN 'khang_sinh' THEN 'antibiotic_test' ELSE needed END ELSE needed END;
 market:=CASE WHEN needed LIKE 'ma_vung_trong:%' THEN split_part(needed,':',2) END;
 IF NOT EXISTS(SELECT 1 FROM core.certifications c WHERE c.org_id=o.seller_org_id AND c.kind=normalized AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL AND (c.valid_during IS NULL OR c.valid_during@>(upper(NEW.delivery_window) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (market IS NULL OR c.market=market)) THEN RAISE EXCEPTION 'Thiếu hồ sơ xác minh %',needed USING HINT='ck_delivery_ready'; END IF;
 END LOOP;
 END IF;
 IF NEW.status='in_transit' AND (v.payment_timing IN ('before_loading','inspect_then_before_loading') OR (v.payment_timing='on_receipt' AND v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom'))) THEN
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.kind IN ('goods_before_loading','goods_on_receipt','goods_extra','goods_batch');
 IF v.payment_timing='before_loading' THEN value_due:=v.contract_value_vnd;
 ELSE SELECT coalesce(sum(l.value_vnd),0) INTO value_due FROM core.acceptance_versions a JOIN core.acceptance_lines l ON l.acceptance_id=a.id WHERE a.delivery_id=NEW.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=a.delivery_id AND n.version_no>a.version_no); END IF;
 IF received<greatest(0,value_due-v.deposit_vnd) THEN RAISE EXCEPTION 'Chưa đủ tiền trước bốc' USING HINT='CHUA_DU_TIEN_TRUOC_BOC'; END IF;
 END IF;
 IF (NEW.status IN ('checking','in_transit') AND OLD.status='ready') OR NEW.status IN ('checking','arrival_check') THEN
 IF NOT NEW.delivery_window@>ref.clock_at() THEN RAISE EXCEPTION 'Ngoài cửa sổ giao' USING HINT='ck_delivery_window'; END IF;
 IF (NEW.status IN ('checking','arrival_check') OR v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom')) AND NOT EXISTS(SELECT 1 FROM core.qr_tokens q JOIN evt.qr_scans s ON s.token_id=q.id WHERE q.delivery_id=NEW.id AND q.kind='receipt' AND q.revoked_at IS NULL AND q.expires_at>ref.clock_at() AND s.actor_user_id=NEW.receiver_user_id AND s.result='accepted') THEN RAISE EXCEPTION 'Chưa xác thực QR nhận hàng' USING HINT='ck_delivery_qr'; END IF;
 END IF;
 RETURN NEW; END $$;
-- Ràng buộc liên bảng và điều kiện nghiệp vụ tại các điểm chốt.
CREATE OR REPLACE FUNCTION core.guard_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d core.deposits%ROWTYPE; seller uuid; buyer uuid; k ref.bank_instruction_kinds%ROWTYPE; s core.settlements%ROWTYPE; a pii.bank_accounts%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deposits WHERE id=NEW.deposit_id FOR UPDATE;
 SELECT * INTO k FROM ref.bank_instruction_kinds WHERE code=NEW.kind;
 IF NEW.order_id IS DISTINCT FROM d.order_id THEN RAISE EXCEPTION 'Lệnh khác đơn của cọc' USING HINT='ck_instruction_order'; END IF;
 IF d.order_id IS NOT NULL THEN SELECT seller_org_id,buyer_org_id INTO seller,buyer FROM core.orders WHERE id=d.order_id;
 ELSE SELECT seller_org_id,buyer_org_id INTO seller,buyer FROM core.framework_contracts WHERE id=d.framework_id; END IF;
 IF NEW.target_org_id IS DISTINCT FROM (CASE WHEN k.target='seller' THEN seller ELSE buyer END) THEN RAISE EXCEPTION 'Sai tổ chức nhận tiền' USING HINT='ck_instruction_target'; END IF;
 IF NEW.target_bank_account_id IS NOT NULL THEN
 SELECT * INTO a FROM pii.bank_accounts WHERE id=NEW.target_bank_account_id;
 IF a.org_id<>NEW.target_org_id OR (a.bank_code,a.account_masked,a.holder_name) IS DISTINCT FROM (NEW.target_bank_code,NEW.target_account_masked,NEW.target_account_holder) THEN
 RAISE EXCEPTION 'Ảnh chụp tài khoản khác đích' USING HINT='ck_instruction_target'; END IF; END IF;
 IF NEW.basis_kind='settlement' THEN
 SELECT * INTO s FROM core.settlements WHERE id=NEW.basis_id;
 IF s.order_id IS DISTINCT FROM NEW.order_id OR (NEW.kind='release_deposit_to_seller' AND NEW.amount_vnd IS DISTINCT FROM s.release_vnd) OR NEW.kind NOT IN ('release_deposit_to_seller','refund_deposit_to_buyer') OR (NEW.kind='refund_deposit_to_buyer' AND NEW.amount_vnd+coalesce((SELECT sum(amount_vnd) FROM core.bank_instructions WHERE basis_kind='settlement' AND basis_id=s.id AND kind=NEW.kind AND status<>'failed'),0)>s.refund_vnd) THEN
 RAISE EXCEPTION 'Lệnh không khớp quyết toán' USING HINT='ck_instruction_basis'; END IF;
 ELSIF NEW.basis_kind='cancellation' AND NOT EXISTS(SELECT 1 FROM core.cancellation_requests WHERE id=NEW.basis_id AND order_id=NEW.order_id AND status='processing_money') THEN
 RAISE EXCEPTION 'Thiếu yêu cầu hủy đang xử lý tiền' USING HINT='ck_instruction_basis';
 ELSIF NEW.basis_kind IN ('ops_decision','debt_offset') AND NOT EXISTS(SELECT 1 FROM ops.decisions WHERE id=NEW.basis_id AND proposed_by=NEW.created_by AND approved_by=NEW.approved_by) THEN
 RAISE EXCEPTION 'Thiếu quyết định lập và duyệt' USING HINT='ck_instruction_basis'; END IF;
 IF NEW.is_manual AND (NEW.created_by IS NULL OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.created_by AND active AND role_code='finance') OR
 NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.approved_by AND active AND role_code IN ('finance','supervisor'))) THEN
 RAISE EXCEPTION 'Lệnh thủ công cần hai nhân viên tài chính' USING HINT='ck_instruction_approval'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.send_order(uuid),cmd.accept_trip(uuid),cmd.dispatch_delivery(uuid),cmd.act_on_task(uuid,text,jsonb),cmd.record_call(uuid,uuid,integer,text) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.sync_document(uuid),cmd.finalize_signed_order(uuid,text,text,text),cmd.activate_order_after_deposit(uuid),cmd.ready_delivery(uuid),cmd.refund_deposit_reduction(uuid,integer),cmd.create_settlement(uuid,boolean,text),cmd.refresh_deposit(uuid),cmd.send_instruction(uuid),cmd.reconcile_instruction(uuid,uuid),cmd.expire_deadline(uuid),cmd.activate_bank_account(uuid) TO agiviet_orchestrator;
-- Không có quyền ghi bảng hoặc gọi helper nội bộ cho vai điều phối.
REVOKE ALL ON ALL TABLES IN SCHEMA cmd,app_auth,core,pii,ledger,evt,ops FROM agiviet_orchestrator;
COMMENT ON TABLE ops.owner_verifications IS 'Xác minh chủ đầu tiên: người đề xuất, chứng cứ đúng tổ chức; người duyệt độc lập qua cmd.';
COMMENT ON COLUMN core.membership_role_grants.revoked_at IS 'Thời điểm thu hồi vai theo đồng hồ nghiệp vụ; lịch sử bất biến.';
COMMENT ON COLUMN core.membership_role_grants.revoked_by IS 'Chủ hiện hành đã thu hồi vai.';
COMMENT ON COLUMN core.membership_role_grants.id IS 'Mã lần cấp vai; cấp lại tạo mã mới.';
COMMENT ON COLUMN core.membership_role_grants.bootstrap_decision_id IS 'Quyết định hai người cấp chủ đầu tiên, chỉ dùng một lần.';
COMMENT ON COLUMN core.signatures.record_receipt_id IS 'Receipt PIN/sinh trắc một lần, ghim người, thiết bị, tài liệu và binding.';
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT c.oid,n.nspname,c.relname,a.attname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE n.nspname='ops' AND c.relname='owner_verifications' AND col_description(c.oid,a.attnum) IS NULL LOOP
 EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,'Xác minh chủ đầu tiên: '||r.attname||'; chỉ command tin cậy được ghi.'); END LOOP;
END $$;
