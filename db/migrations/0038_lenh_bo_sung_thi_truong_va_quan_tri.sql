-- Bổ sung D-01. Không cấp DML và không có command SQL/bảng/trạng thái tùy ý.
CREATE FUNCTION cmd.check_payload(p_body jsonb,p_keys text[]) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
 IF jsonb_typeof(p_body) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_body) k WHERE NOT k=ANY(p_keys)) THEN
 RAISE EXCEPTION 'Payload không thuộc hợp đồng command' USING HINT='ck_command_payload'; END IF;
END $$;
CREATE FUNCTION cmd.party_order(p_order uuid,p_roles text[] DEFAULT ARRAY['owner','purchaser','coop_board']) RETURNS core.orders
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor(); RETURN cmd.order_party(p_order,ref.ctx_actor(),p_roles);
END $$;
CREATE OR REPLACE FUNCTION cmd.sync_document(p_doc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.documents%ROWTYPE; missing boolean;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.documents WHERE id=p_doc FOR UPDATE;
 IF d.id IS NULL THEN RAISE EXCEPTION 'Không có tài liệu' USING HINT='ck_command_state'; END IF;
 IF d.status='draft' THEN
  -- Nội dung/hash đã được freeze_document bảo vệ. Mở ký, tuyệt đối không tạo chữ ký.
  UPDATE core.documents SET status='awaiting_signature' WHERE id=d.id;
 END IF;
 SELECT EXISTS(SELECT 1 FROM ref.document_types t,unnest(t.needs_signatures) s WHERE t.code=d.doc_type AND NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=d.id AND party=s)) INTO missing;
 IF d.status IN ('draft','awaiting_signature','partially_signed') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=d.id) THEN
 UPDATE core.documents SET status=CASE WHEN missing THEN 'partially_signed' ELSE 'fully_signed' END WHERE id=d.id;
 END IF;
END $$;
CREATE FUNCTION cmd.attach_entity_evidence(p_entity text,p_id uuid,p_document jsonb,p_captured boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor();
 IF p_entity='lot' THEN SELECT seller_org_id INTO org FROM core.lots WHERE id=p_id FOR UPDATE;
 ELSIF p_entity='organization' THEN org:=p_id;
 ELSE RAISE EXCEPTION 'Sai loại đối tượng' USING HINT='ck_command_payload'; END IF;
 IF ref.ctx_actor()='ops' THEN PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']);
 ELSE PERFORM cmd.require_org(org,ARRAY['owner','coop_board','collection_staff']); END IF;
 IF NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=org) THEN RAISE EXCEPTION 'Không có tổ chức' USING HINT='ck_command_state'; END IF;
 RETURN cmd.insert_row('core.documents',p_document||jsonb_build_object('doc_type','evidence','owner_org_id',org,'created_by',ref.ctx_user(),'entity',p_entity,'entity_id',p_id,'captured_in_app',p_captured),
 ARRAY['code','series_key','version_no','content_sha256','canonical_content','file_sha256','storage_key','mime_type','size_bytes','generator_version','is_test_data','doc_type','owner_org_id','created_by','entity','entity_id','captured_in_app']);
END $$;
CREATE FUNCTION cmd.update_lot(p_lot uuid,p_action text,p_data jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board','collection_staff']);
 IF ref.ctx_actor()<>'seller' OR l.status='closed' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô không thể sửa' USING HINT='ck_command_state'; END IF;
 IF p_action='price' THEN
 PERFORM cmd.check_payload(p_data,ARRAY['ask_price_vnd','floor_price_vnd','below_cost_ack']);
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,below_cost_ack,set_by,set_at)
 VALUES(l.id,(p_data->>'ask_price_vnd')::bigint,(p_data->>'floor_price_vnd')::bigint,coalesce((p_data->>'below_cost_ack')::boolean,false),ref.ctx_user(),ref.clock_at());
 ELSIF p_action='confirm' THEN
 PERFORM cmd.check_payload(p_data,'{}');
 UPDATE core.lots SET last_confirmed_at=ref.clock_at(),status=CASE WHEN status='hidden' THEN 'on_sale' ELSE status END WHERE id=l.id;
 ELSIF p_action='close' THEN
 PERFORM cmd.check_payload(p_data,'{}');
 IF EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=l.id AND bucket IN ('held','committed','in_transit') AND qty>0) THEN RAISE EXCEPTION 'Lô còn lượng ràng buộc' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Chủ lô đóng tin',true); UPDATE core.lots SET status='closed' WHERE id=l.id;
 ELSE RAISE EXCEPTION 'Sai thao tác lô' USING HINT='ck_command_payload'; END IF;
 PERFORM evt.emit('lot',l.id,'lot.'||p_action,'{}',ARRAY['notify']);
END $$;
CREATE FUNCTION cmd.close_demand(p_demand uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT buyer_org_id INTO org FROM core.demands WHERE id=p_demand FOR UPDATE;
 PERFORM cmd.require_org(org,ARRAY['owner','purchaser']);
 PERFORM set_config('app.reason','Bên mua đóng nhu cầu',true); UPDATE core.demands SET status='closed' WHERE id=p_demand;
END $$;
CREATE FUNCTION cmd.reply_offer(p_offer uuid,p_action text,p_price bigint DEFAULT NULL,p_qty bigint DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; side text;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 side:=ref.ctx_actor();
 PERFORM cmd.require_org(CASE side WHEN 'buyer' THEN f.buyer_org_id WHEN 'seller' THEN f.seller_org_id END,ARRAY['owner','purchaser','coop_board']);
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.status IS DISTINCT FROM 'sent' OR r.expires_at<=ref.clock_at() THEN RAISE EXCEPTION 'Lời chào không còn mở' USING HINT='ck_command_state'; END IF;
 IF p_action='withdraw' AND side=(CASE f.direction WHEN 'buyer_bid' THEN 'buyer' ELSE 'seller' END) THEN
 UPDATE core.offers SET status='withdrawn' WHERE id=f.id;
 ELSIF p_action='reject' AND side<>r.from_side THEN UPDATE core.offers SET status='rejected' WHERE id=f.id;
 ELSIF p_action='counter' AND side<>r.from_side THEN
 INSERT INTO core.offer_rounds(offer_id,round_no,from_side,price_vnd,qty,expires_at,created_by)
 VALUES(f.id,f.current_round+1,side,p_price,p_qty,ref.clock_at()+interval '24 hours',ref.ctx_user());
 UPDATE core.offers SET current_round=current_round+1 WHERE id=f.id;
 ELSE RAISE EXCEPTION 'Sai bên/hành động lời chào' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deadlines SET status='met' WHERE entity='offer' AND entity_id=f.id AND kind='offer_reply' AND status='open';
 IF p_action='counter' THEN INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('offer_reply','offer',f.id,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
END $$;
-- Vòng trả giá: người chấp nhận là bên đối diện vòng hiện hành, không cố định direction ban đầu.
CREATE OR REPLACE FUNCTION cmd.accept_offer(p_offer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 PERFORM cmd.require_org(CASE r.from_side WHEN 'buyer' THEN f.seller_org_id ELSE f.buyer_org_id END,ARRAY['owner','purchaser','coop_board']);
 IF ref.ctx_actor() IS DISTINCT FROM (CASE r.from_side WHEN 'buyer' THEN 'seller' ELSE 'buyer' END) THEN RAISE EXCEPTION 'Không tự chấp nhận vòng của mình' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM 1 FROM core.lots WHERE id=f.lot_id AND status IN ('on_sale','upcoming') AND safety_locked_at IS NULL FOR UPDATE;
 IF NOT FOUND OR f.status IS DISTINCT FROM 'sent' OR r.expires_at<=ref.clock_at() THEN RAISE EXCEPTION 'Lời chào hết hiệu lực' USING HINT='ck_command_state'; END IF;
 UPDATE core.offers SET status='accepted' WHERE id=f.id;
 INSERT INTO core.holds(lot_id,offer_id,qty,expires_at) VALUES(f.lot_id,f.id,r.qty,ref.clock_at()+interval '24 hours') RETURNING id INTO result;
 UPDATE core.deadlines SET status='met' WHERE entity='offer' AND entity_id=f.id AND kind='offer_reply' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('hold','hold',result,ref.clock_at()+interval '24 hours',ref.clock_at());
 RETURN result;
END $$;
CREATE FUNCTION cmd.release_hold(p_hold uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE h core.holds%ROWTYPE; f core.offers%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO h FROM core.holds WHERE id=p_hold FOR UPDATE;
 SELECT * INTO f FROM core.offers WHERE id=h.offer_id;
 PERFORM cmd.require_org(CASE ref.ctx_actor() WHEN 'buyer' THEN f.buyer_org_id ELSE f.seller_org_id END,ARRAY['owner','purchaser','coop_board']);
 IF h.order_id IS NOT NULL THEN RAISE EXCEPTION 'Đã lập đơn: đóng đơn để nhả giữ' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Bên giao dịch nhả giữ lượng',true); UPDATE core.holds SET status='released' WHERE id=h.id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE entity='hold' AND entity_id=h.id AND status='open';
END $$;
CREATE FUNCTION cmd.approve_order(p_order uuid,p_approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.order_party(p_order,'buyer',ARRAY['owner']);
 IF o.created_by_user_id=ref.ctx_user() OR o.status<>'internal_approval' OR p_approve IS NULL THEN RAISE EXCEPTION 'Duyệt cần chủ khác người lập' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.orders SET approved_by_user_id=CASE WHEN p_approve THEN ref.ctx_user() END,status='drafting' WHERE id=o.id;
END $$;
CREATE FUNCTION cmd.request_order_approval(p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.order_party(p_order,'buyer',ARRAY['owner','purchaser']); UPDATE core.orders SET status='internal_approval' WHERE id=p_order;
END $$;
CREATE FUNCTION cmd.close_unsigned_order(p_order uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.party_order(p_order);
 IF o.status NOT IN ('drafting','internal_approval','awaiting_seller','awaiting_deposit') OR p_reason NOT IN ('seller_declined','cancel_before_deposit') OR (p_reason='seller_declined' AND ref.ctx_actor()<>'seller') THEN RAISE EXCEPTION 'Không thể đóng đơn ở bước này' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason',p_reason,true);
 UPDATE core.orders SET status='closed',close_reason=p_reason WHERE id=o.id;
 UPDATE core.holds SET status='released' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE order_id=o.id AND status='open';
 INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
 SELECT e.id,d.id,'cancel_before_deposit' FROM core.deposits d JOIN core.bank_events e ON e.payment_ref=d.payment_ref
 WHERE d.order_id=o.id AND e.kind='deposit_received' AND e.apply_result='applied' AND d.status='partially_received' ON CONFLICT DO NOTHING;
END $$;
-- Hai người vận hành: đề xuất và duyệt dưới hai login; người duyệt không được sửa detail.
CREATE TABLE ops.decision_proposals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL,entity text NOT NULL,entity_id uuid NOT NULL,
 proposed_by uuid NOT NULL REFERENCES core.users,reason text NOT NULL CHECK(length(btrim(reason))>0),
 evidence_document_id uuid NOT NULL REFERENCES core.documents,detail jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ops.decision_proposals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.decision_proposals FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE UNIQUE INDEX uq_cmd_decision_proposal ON ops.decisions((detail->>'command_proposal_id')) WHERE detail ? 'command_proposal_id';
CREATE FUNCTION cmd.propose_decision(p_kind text,p_entity text,p_id uuid,p_reason text,p_evidence uuid,p_detail jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,core,ref,public AS $$
DECLARE result uuid; oid uuid;
BEGIN
 PERFORM cmd.require_staff(CASE WHEN p_kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p_kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance'] ELSE ARRAY['risk','supervisor'] END);
 IF NOT ((p_kind='payment_reconciliation' AND p_entity='direct_payment') OR (p_kind='dispute_resolution' AND p_entity='dispute') OR (p_kind='force_majeure_reduction' AND p_entity='amendment') OR (p_kind='ledger_correction' AND p_entity='ledger_transaction') OR (p_kind='manual_payment' AND p_entity='order') OR (p_kind='policy_change' AND p_entity='policy_version')) THEN RAISE EXCEPTION 'Sai loại quyết định' USING HINT='ck_command_payload'; END IF;
 IF p_entity='order' THEN oid:=p_id;
 ELSIF p_entity='ledger_transaction' THEN oid:=(p_detail->>'order_id')::uuid;
 ELSIF p_entity='direct_payment' THEN SELECT order_id INTO oid FROM core.direct_payments WHERE id=p_id;
 ELSIF p_entity='dispute' THEN SELECT order_id INTO oid FROM core.disputes WHERE id=p_id;
 ELSIF p_entity='amendment' THEN SELECT order_id INTO oid FROM core.amendments WHERE id=p_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type IN ('evidence','inspection_report') AND (order_id=oid OR p_entity='policy_version')) THEN RAISE EXCEPTION 'Chứng cứ sai đối tượng' USING HINT='ck_command_evidence'; END IF;
 IF p_detail IS NULL OR jsonb_typeof(p_detail)<>'object' OR p_detail ? 'command_proposal_id' THEN RAISE EXCEPTION 'Sai detail' USING HINT='ck_command_payload'; END IF;
 INSERT INTO ops.decision_proposals(kind,entity,entity_id,proposed_by,reason,evidence_document_id,detail) VALUES(p_kind,p_entity,p_id,ref.ctx_user(),p_reason,p_evidence,p_detail) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.approve_decision(p_proposal uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE p ops.decision_proposals%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO p FROM ops.decision_proposals WHERE id=p_proposal FOR UPDATE;
 PERFORM cmd.require_staff(CASE WHEN p.kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p.kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance','supervisor'] WHEN p.kind='policy_change' THEN ARRAY['supervisor'] ELSE ARRAY['risk','supervisor'] END);
 IF p.id IS NULL OR p.proposed_by=ref.ctx_user() OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p.proposed_by AND active AND role_code=ANY(CASE WHEN p.kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p.kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance'] ELSE ARRAY['risk','supervisor'] END)) THEN RAISE EXCEPTION 'Thiếu người lập độc lập còn quyền' USING HINT='ck_decision_two_people'; END IF;
 SELECT id INTO result FROM ops.decisions WHERE detail->>'command_proposal_id'=p.id::text;
 IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO ops.decisions(kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(p.kind,p.entity,p.entity_id,p.proposed_by,ref.ctx_user(),p.reason,p.evidence_document_id,p.detail||jsonb_build_object('command_proposal_id',p.id)) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.create_task(p_kind text,p_priority smallint,p_entity text,p_id uuid,p_order uuid,p_role text,p_key text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE s ref.sla_policies%ROWTYPE; result uuid; t ops.tasks%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 IF ref.ctx_actor()='system' THEN PERFORM cmd.require_system(); ELSE PERFORM cmd.require_staff(ARRAY[p_role,'supervisor']); END IF;
 SELECT * INTO s FROM ref.sla_policies WHERE priority=p_priority;
 IF s.priority IS NULL OR length(btrim(p_key))=0 OR length(btrim(p_reason))=0 OR p_key IS NULL OR p_reason IS NULL THEN RAISE EXCEPTION 'Thiếu SLA/khóa/lý do' USING HINT='ck_command_payload'; END IF;
 SELECT * INTO t FROM ops.tasks WHERE dedup_key=p_key FOR UPDATE;
 IF t.id IS NOT NULL THEN
 IF (t.kind,t.priority,t.entity,t.entity_id,t.order_id,t.required_role,t.trigger_reason) IS DISTINCT FROM (p_kind,p_priority,p_entity,p_id,p_order,p_role,p_reason) THEN RAISE EXCEPTION 'Khóa việc khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN t.id; END IF;
 INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,order_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
 VALUES('TASK-'||gen_random_uuid(),p_kind,p_priority,p_entity,p_id,p_order,p_role,p_key,p_reason,ref.clock_at()+s.response_minutes*interval '1 minute',ref.clock_at()+s.resolution_minutes*interval '1 minute',ref.clock_at()+s.update_minutes*interval '1 minute') RETURNING id INTO result; RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.update_lot(uuid,text,jsonb),cmd.attach_entity_evidence(text,uuid,jsonb,boolean),cmd.close_demand(uuid),cmd.reply_offer(uuid,text,bigint,bigint),cmd.release_hold(uuid),cmd.approve_order(uuid,boolean),cmd.request_order_approval(uuid),cmd.close_unsigned_order(uuid,text),cmd.propose_decision(text,text,uuid,text,uuid,jsonb),cmd.approve_decision(uuid),cmd.create_task(text,smallint,text,uuid,uuid,text,text,text) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.create_task(text,smallint,text,uuid,uuid,text,text,text) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
