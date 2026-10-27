CREATE TABLE core.amendment_applications(amendment_id uuid PRIMARY KEY REFERENCES core.amendments,applied_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE core.amendment_applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.amendment_applications FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.propose_amendment(p_order uuid,p_kind text,p_payload jsonb,p_evidence uuid[] DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; q bigint; days integer;
BEGIN
 o:=cmd.party_order(p_order); SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF o.status NOT IN ('awaiting_deposit','active') OR v.value_basis<>'single_product' OR EXISTS(SELECT 1 FROM core.amendments WHERE order_id=o.id AND (status='open' OR status='accepted' AND resulting_version_no>o.effective_version_no)) OR EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money')) THEN RAISE EXCEPTION 'Đơn đang có xử lý khác/chưa ký' USING HINT='ck_command_state'; END IF;
 IF p_kind IN ('increase_qty','decrease_qty','force_majeure_reduction') THEN
 PERFORM cmd.check_payload(p_payload,ARRAY['qty_g','reason']); q:=(p_payload->>'qty_g')::bigint;
 IF q IS NULL OR q<=0 OR (p_kind='increase_qty' AND q<=v.qty_min) OR (p_kind<>'increase_qty' AND q>=v.qty_min)
 OR q<coalesce((SELECT sum(qty) FROM ledger.qty_balances WHERE order_key=o.id AND bucket IN ('in_transit','delivered','returned_pending','moved_to_child')),0) THEN RAISE EXCEPTION 'Lượng mới không hợp lệ' USING HINT='ck_command_terms'; END IF;
 IF p_kind='force_majeure_reduction' AND (ref.ctx_actor()<>'seller' OR coalesce(cardinality(p_evidence),0)=0) THEN RAISE EXCEPTION 'Bất khả kháng cần người bán/chứng cứ' USING HINT='ck_command_evidence'; END IF;
 ELSIF p_kind='change_price' THEN PERFORM cmd.check_payload(p_payload,ARRAY['unit_price_vnd','reason']); IF (p_payload->>'unit_price_vnd')::bigint<=coalesce(v.downgrade_price_vnd,0) OR p_payload->>'unit_price_vnd' IS NULL THEN RAISE EXCEPTION 'Giá mới không hợp lệ' USING HINT='ck_command_terms'; END IF;
 ELSIF p_kind='change_date' THEN PERFORM cmd.check_payload(p_payload,ARRAY['delivery_window','reason']); IF isempty((p_payload->>'delivery_window')::tstzrange) OR p_payload->>'delivery_window' IS NULL THEN RAISE EXCEPTION 'Thiếu cửa sổ giao' USING HINT='ck_command_terms'; END IF;
 ELSIF p_kind='change_transport' THEN PERFORM cmd.check_payload(p_payload,ARRAY['transport_by','reason']); IF p_payload->>'transport_by' IS NULL OR p_payload->>'transport_by' NOT IN ('buyer','seller','partner_for_buyer','partner_for_seller') THEN RAISE EXCEPTION 'Sai bên vận chuyển' USING HINT='ck_command_terms'; END IF;
 ELSIF p_kind='change_receiver' THEN PERFORM cmd.check_payload(p_payload,ARRAY['receiver_user_id','reason']); IF ref.ctx_actor()<>'buyer' OR NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.user_id=(p_payload->>'receiver_user_id')::uuid AND m.org_id=o.buyer_org_id AND m.status='active' AND r.role_code IN ('owner','warehouse','site_receiver')) THEN RAISE EXCEPTION 'Sai người nhận/bên mua' USING HINT='KHONG_CO_QUYEN'; END IF;
 ELSE RAISE EXCEPTION 'Loại đề nghị không hợp lệ cho đơn một mặt hàng' USING HINT='ck_command_payload'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_evidence) e WHERE NOT EXISTS(SELECT 1 FROM core.documents WHERE id=e AND order_id=o.id AND doc_type='evidence')) THEN RAISE EXCEPTION 'Chứng cứ khác đơn' USING HINT='ck_command_evidence'; END IF;
 days:=greatest(0,extract(day FROM lower(v.delivery_window)-ref.clock_at())::integer);
 INSERT INTO core.amendments(order_id,kind,proposed_by_org_id,proposed_by_user_id,payload,evidence_doc_ids,notice_days_before_delivery,buyer_reply_deadline,created_at)
 VALUES(o.id,p_kind,ref.ctx_org(),ref.ctx_user(),p_payload,p_evidence,days,CASE WHEN ref.ctx_actor()='seller' THEN ref.clock_at()+interval '24 hours' END,ref.clock_at()) RETURNING id INTO result;
 IF p_kind='change_receiver' THEN
 UPDATE core.amendments SET status='accepted' WHERE id=result;
 PERFORM cmd.assign_receiver(d.id,(p_payload->>'receiver_user_id')::uuid) FROM core.deliveries d WHERE d.order_id=o.id AND d.status IN ('preparing','ready');
 ELSE INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('amendment_reply','amendment',result,o.id,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.answer_amendment(p_amendment uuid,p_action text,p_document jsonb DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; d core.documents%ROWTYPE; doc uuid; q bigint; price bigint; pc bigint; val bigint; basis bigint; c bigint; f bigint; so integer; patch jsonb;
BEGIN
 SELECT * INTO a FROM core.amendments WHERE id=p_amendment FOR UPDATE; o:=cmd.party_order(a.order_id);
 IF a.status IS DISTINCT FROM 'open' OR a.kind='change_receiver' THEN RAISE EXCEPTION 'Đề nghị không chờ trả lời' USING HINT='ck_command_state'; END IF;
 IF p_action='withdraw' THEN
 IF a.proposed_by_org_id<>ref.ctx_org() THEN RAISE EXCEPTION 'Chỉ bên gửi rút' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.amendments SET status='withdrawn' WHERE id=a.id;
 ELSIF p_action IN ('accept','reject') THEN
 IF a.proposed_by_org_id=ref.ctx_org() THEN RAISE EXCEPTION 'Bên gửi không tự trả lời' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.deadlines WHERE entity='amendment' AND entity_id=a.id AND status='open' AND due_at>ref.clock_at()) THEN RAISE EXCEPTION 'Hết hạn trả lời' USING HINT='ck_deadline_not_due'; END IF;
 IF p_action='reject' THEN UPDATE core.amendments SET status='rejected',buyer_replied_at=CASE WHEN ref.ctx_actor()='buyer' THEN ref.clock_at() ELSE buyer_replied_at END WHERE id=a.id;
 ELSE
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 q:=CASE WHEN a.kind IN ('increase_qty','decrease_qty','force_majeure_reduction') THEN (a.payload->>'qty_g')::bigint ELSE v.qty_min END;
 price:=CASE WHEN a.kind='change_price' THEN (a.payload->>'unit_price_vnd')::bigint ELSE v.unit_price_vnd END;
 pc:=CASE WHEN v.ref_price_source='trades' THEN greatest(price,ceil(v.ref_price_vnd*0.7)::bigint) ELSE price END;
 val:=ref.div_round(q::numeric*price,v.price_unit_base_qty); basis:=ref.div_round(q::numeric*pc,v.price_unit_base_qty);
 c:=CASE v.deposit_rule WHEN 'percent' THEN least(val,ref.div_round(v.deposit_bps::numeric*basis,10000000)*1000) WHEN 'none' THEN 0 ELSE ref.div_round(v.deposit_vnd::numeric*q,v.qty_min) END;
 f:=CASE WHEN v.fee_bps=0 THEN 0 ELSE least(coalesce(v.fee_cap_vnd,9223372036854775807),greatest(coalesce(v.fee_floor_vnd,0),ref.div_round(v.fee_bps::numeric*basis,10000))) END;
 SELECT max(version_no)+1 INTO so FROM core.order_versions WHERE order_id=o.id;
 SELECT * INTO d FROM core.documents WHERE id=v.document_id;
 -- Chuỗi phải nối đúng phiên bản hiện hành; không cho client chọn người/tổ chức/status.
 doc:=cmd.attach_document(o.id,'annex',p_document||jsonb_build_object('series_key',d.series_key,'version_no',so,'prev_document_id',d.id,'prev_content_sha256',d.content_sha256),'amendment',a.id);
 patch:=jsonb_build_object('version_no',so,'amendment_id',a.id,'document_id',doc,'qty_min',q,'qty_max',q,'unit_price_vnd',price,'deposit_price_vnd',pc,'contract_value_vnd',val,'deposit_basis_vnd',basis,'deposit_vnd',c,'fee_vnd',f,'created_by',ref.ctx_user(),'created_at',now(),'write_xid',pg_current_xact_id()::text);
 IF a.kind='change_date' THEN patch:=patch||jsonb_build_object('delivery_window',a.payload->>'delivery_window'); END IF;
 IF a.kind='change_transport' THEN patch:=patch||jsonb_build_object('transport_by',a.payload->>'transport_by'); END IF;
 nv:=jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||patch);
 INSERT INTO core.order_versions SELECT (nv).*;
 UPDATE core.amendments SET status='accepted',resulting_version_no=so,buyer_replied_at=CASE WHEN ref.ctx_actor()='buyer' THEN ref.clock_at() ELSE buyer_replied_at END WHERE id=a.id;
 END IF;
 ELSE RAISE EXCEPTION 'Sai hành động đề nghị' USING HINT='ck_command_payload'; END IF;
 UPDATE core.deadlines SET status=CASE WHEN p_action='withdraw' THEN 'cancelled' ELSE 'met' END WHERE entity='amendment' AND entity_id=a.id AND status='open'; RETURN doc;
END $$;
CREATE FUNCTION cmd.apply_signed_amendment(p_amendment uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; dep core.deposits%ROWTYPE; q bigint; dc bigint; df bigint; dp bigint; adj uuid; d core.deliveries%ROWTYPE; penalty bigint; bps integer;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO a FROM core.amendments WHERE id=p_amendment FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=a.order_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.amendment_applications WHERE amendment_id=a.id) THEN RETURN a.resulting_version_no; END IF;
 SELECT * INTO nv FROM core.order_versions WHERE order_id=o.id AND version_no=a.resulting_version_no;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.status IS DISTINCT FROM 'accepted' OR nv.version_no IS DISTINCT FROM v.version_no+1 OR o.status NOT IN ('active','awaiting_deposit') OR EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money')) THEN RAISE EXCEPTION 'Phụ lục không nối bản hiệu lực' USING HINT='ck_command_state'; END IF;
 q:=nv.qty_min-v.qty_min; dc:=nv.deposit_vnd-v.deposit_vnd; df:=nv.fee_vnd-v.fee_vnd;
 -- Trước cọc: hoàn tất quy trình cọc đã ký ban đầu trước, rồi áp phụ lục và delta;
 -- không biến expected_* gốc bất biến hoặc lượng hold gốc thành số do request truyền.
 IF o.status='awaiting_deposit' AND (q<>0 OR dc<>0 OR df<>0) THEN RAISE EXCEPTION 'Kích hoạt cọc ban đầu rồi áp phụ lục kinh tế' USING HINT='ck_amendment_wait_deposit'; END IF;
 IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=o.id AND status IN ('created','sent','processing','succeeded')) THEN RAISE EXCEPTION 'Chờ đối soát lệnh trước phụ lục' USING HINT='ck_settlement_pending'; END IF;
 PERFORM cmd.sync_document(nv.document_id);
 UPDATE core.orders SET effective_version_no=nv.version_no WHERE id=o.id; -- trigger kiểm đủ chữ ký
 IF q<0 THEN PERFORM ledger.move_qty(o.lot_id,'committed','available','commit_release',-q,o.id,'annex-release:'||a.id);
 ELSIF q>0 THEN PERFORM ledger.move_qty(o.lot_id,'available','committed','commit_direct',q,o.id,'annex-commit:'||a.id); END IF;
 -- Phân delta đúng một lần, không cộng delta vào mọi đợt (lỗi thường gặp ở điều phối).
 SELECT * INTO d FROM core.deliveries WHERE order_id=o.id AND status IN ('preparing','ready') ORDER BY batch_no DESC LIMIT 1 FOR UPDATE;
 IF q<>0 AND (d.id IS NULL OR d.planned_qty+q<=0) THEN RAISE EXCEPTION 'Cần phân lại các đợt trước khi giảm lượng' USING HINT='ck_command_delivery'; END IF;
 UPDATE core.deliveries SET planned_qty=planned_qty+q WHERE id=d.id;
 UPDATE core.deliveries SET version_no=nv.version_no,delivery_window=nv.delivery_window WHERE order_id=o.id AND status IN ('preparing','ready');
 UPDATE core.qr_tokens SET revoked_at=ref.clock_at() WHERE delivery_id IN (SELECT id FROM core.deliveries WHERE order_id=o.id AND status IN ('preparing','ready')) AND kind='receipt' AND revoked_at IS NULL;
 PERFORM core.issue_qr('receipt',dl.id,greatest(upper(dl.delivery_window),ref.clock_at()+interval '1 hour'),dl.receiver_user_id) FROM core.deliveries dl WHERE dl.order_id=o.id AND dl.status IN ('preparing','ready') AND dl.receiver_user_id IS NOT NULL;
 SELECT * INTO dep FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 IF dc<0 THEN PERFORM cmd.refund_deposit_reduction(o.id,nv.version_no);
 ELSIF dc<>0 OR df<>0 THEN
 INSERT INTO core.deposit_adjustments(deposit_id,order_version_no,delta_deposit_vnd,delta_fee_vnd,payment_ref)
 VALUES(dep.id,nv.version_no,dc,df,CASE WHEN dc>0 OR df>0 THEN 'TOPUP-'||a.id END) RETURNING id INTO adj;
 IF dc>0 OR df>0 THEN INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('deposit_top_up','deposit',dep.id,o.id,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
 END IF;
 IF a.kind='decrease_qty' AND q<0 THEN
 bps:=v.shortfall_penalty_bps[CASE WHEN a.notice_days_before_delivery>=3 THEN 2 ELSE 3 END];
 penalty:=ref.div_round(v.deposit_vnd::numeric*(-q)*bps,v.qty_min::numeric*10000);
 IF penalty>0 THEN INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by) VALUES(o.id,'shortfall_penalty','seller',penalty,jsonb_build_object('short_qty',-q,'bps',bps,'notice_days',a.notice_days_before_delivery),'amendment',a.id,ref.ctx_user()); END IF;
 END IF;
 IF nv.payment_timing='before_loading' AND o.status='active' THEN
 PERFORM set_config('app.reason','Lập lại nghĩa vụ theo phụ lục đã ký',true);
 UPDATE core.direct_payments SET status='cancelled' WHERE order_id=o.id AND kind='goods_before_loading' AND status NOT IN ('fully_received','cancelled');
 SELECT greatest(0,nv.contract_value_vnd-nv.deposit_vnd-coalesce(sum(c.amount_vnd),0)) INTO dp FROM core.direct_payments p JOIN core.direct_payment_confirmations c ON c.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='buyer_to_seller';
 IF dp>0 THEN INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('ANNEX-'||a.id,o.id,'goods_before_loading','buyer_to_seller',o.buyer_org_id,o.seller_org_id,dp,'order_active','due',true,lower(nv.delivery_window),nv.seller_bank_code,nv.seller_account_masked,nv.seller_account_holder); END IF;
 END IF;
 UPDATE core.documents SET status='superseded' WHERE id=v.document_id AND status IN ('fully_signed','effective');
 INSERT INTO core.amendment_applications VALUES(a.id,now());
 PERFORM evt.emit('order',o.id,'amendment.effective',jsonb_build_object('version_no',nv.version_no),ARRAY['notify']); RETURN nv.version_no;
END $$;
GRANT EXECUTE ON FUNCTION cmd.propose_amendment(uuid,text,jsonb,uuid[]),cmd.answer_amendment(uuid,text,jsonb) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.apply_signed_amendment(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
