ALTER TABLE cmd.login_principals DROP CONSTRAINT login_principals_actor_kind_check;
ALTER TABLE cmd.login_principals ADD CHECK(actor_kind IN ('buyer','seller','ops','helper','system','inspector'));
-- Inspector là danh tính của provider được quản trị ánh xạ, không phải app tự đặt actor.
CREATE FUNCTION cmd.require_inspector(p_provider uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor();
 IF ref.ctx_actor()<>'inspector' OR ref.ctx_org() IS DISTINCT FROM p_provider OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=ref.ctx_user() AND role_code='inspector' AND active) THEN RAISE EXCEPTION 'Sai đối tác kiểm định' USING HINT='KHONG_CO_QUYEN'; END IF;
END $$;
-- Command sao chép chỉ được đóng dòng có chứng cứ bản trước hoặc kết luận kiểm định.
UPDATE ref.state_transitions SET actor_kinds=ARRAY['seller','ops','buyer','inspector','system'] WHERE entity='acceptance_line' AND from_status='proposed' AND to_status='closed';
-- Sao chép trạng thái dòng chưa kết luận sang phiên bản kết quả kế tiếp.
UPDATE ref.state_transitions SET actor_kinds=ARRAY['seller','buyer','ops','inspector'] WHERE entity='acceptance_line' AND from_status='proposed' AND to_status='disputed';
CREATE TABLE core.dispute_resolutions(
 dispute_id uuid PRIMARY KEY REFERENCES core.disputes,inspection_result_id uuid UNIQUE REFERENCES core.inspection_results,
 decision_id uuid UNIQUE REFERENCES ops.decisions,acceptance_id uuid NOT NULL REFERENCES core.acceptance_versions,
 result text NOT NULL CHECK(result IN ('passed','failed')),resolved_by uuid NOT NULL REFERENCES core.users,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((inspection_result_id IS NULL)<>(decision_id IS NULL))
);
ALTER TABLE core.dispute_resolutions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.dispute_resolutions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.inspection_provider_events(
 provider_org_id uuid NOT NULL REFERENCES core.organizations,event_key text NOT NULL CHECK(length(btrim(event_key))>0),
 inspection_id uuid NOT NULL REFERENCES core.inspections,result_id uuid NOT NULL UNIQUE REFERENCES core.inspection_results,
 request_sha256 bytea NOT NULL,PRIMARY KEY(provider_org_id,event_key)
);
ALTER TABLE core.inspection_provider_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.inspection_provider_events FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.open_dispute(p_line uuid,p_qty bigint,p_reason text,p_claim text DEFAULT 'quality') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO l FROM core.acceptance_lines WHERE id=p_line;
 SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.party_order(d.order_id,ARRAY['owner','purchaser','warehouse','site_receiver','coop_board','collection_staff']);
 IF l.status IS DISTINCT FROM 'proposed' OR d.status NOT IN ('checking','awaiting_seller','disputed') OR p_qty IS NULL OR p_qty<=0 OR p_qty IS DISTINCT FROM l.qty OR p_claim IS NULL OR p_claim NOT IN ('quality','shortfall') OR coalesce(length(btrim(p_reason)),0)=0 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) THEN RAISE EXCEPTION 'Dòng/trạng thái tranh chấp không hợp lệ' USING HINT='ck_dispute_scope'; END IF;
 UPDATE core.acceptance_lines SET status='disputed' WHERE id=l.id;
 INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind) VALUES(l.id,d.order_id,p_qty,ref.ctx_user(),p_reason,p_claim) RETURNING id INTO result;
 IF ref.ctx_actor()='buyer' THEN UPDATE core.disputes SET status='awaiting_seller' WHERE id=result; END IF;
 IF d.status='awaiting_seller' AND ref.ctx_actor()='seller' THEN UPDATE core.deliveries SET status='disputed' WHERE id=d.id; END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.claim_arrival_difference(p_delivery uuid,p_line_no smallint,p_qty bigint,p_reason text,p_evidence uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; a core.acceptance_versions%ROWTYPE; l core.acceptance_lines%ROWTYPE; na uuid; doc uuid; n smallint:=0; nid uuid; target uuid; result uuid; reason_code text;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; o:=cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.status IS DISTINCT FROM 'arrival_check' OR NOT EXISTS(SELECT 1 FROM core.deadlines WHERE entity_id=d.id AND kind='arrival_check' AND status='open' AND due_at>ref.clock_at()) OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND order_id=o.id AND doc_type='evidence' AND owner_org_id=o.buyer_org_id) OR coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'Hết hạn/sai chứng cứ khiếu nại' USING HINT='ck_dispute_scope'; END IF;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') THEN RAISE EXCEPTION 'Cần bản nghiệm thu trước đã ký' USING HINT='ck_command_acceptance'; END IF;
 SELECT * INTO l FROM core.acceptance_lines WHERE acceptance_id=a.id AND line_no=p_line_no;
 IF l.kind NOT IN ('accepted','downgraded') OR l.id IS NULL OR p_qty IS NULL OR p_qty<=0 OR p_qty>l.qty THEN RAISE EXCEPTION 'Sai phần khiếu nại' USING HINT='ck_dispute_scope'; END IF;
 SELECT r.reason_code INTO reason_code FROM core.product_reject_reasons r JOIN core.lots lot ON lot.product_id=r.product_id AND lot.profile_version=r.profile_version WHERE lot.id=l.lot_id ORDER BY r.reason_code LIMIT 1;
 doc:=cmd.attach_document(o.id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by) VALUES(d.id,a.version_no+1,a.id,a.weighed_qty,doc,ref.ctx_user()) RETURNING id INTO na;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id ORDER BY line_no LOOP
 IF l.line_no=p_line_no THEN
 IF l.qty>p_qty THEN
 n:=n+1; INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements,order_line_no)
 VALUES(na,n,l.lot_id,l.kind,l.qty-p_qty,l.qty-p_qty,l.unit_price_vnd,ref.div_round((l.qty-p_qty)::numeric*l.unit_price_vnd,1000),l.reason_code,l.evidence_document_id,l.measurements,l.order_line_no) RETURNING id INTO nid;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=nid;
 END IF;
 n:=n+1; INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,order_line_no) VALUES(na,n,l.lot_id,'rejected',p_qty,0,0,0,reason_code,p_evidence,l.order_line_no) RETURNING id INTO target;
 UPDATE core.acceptance_lines SET status='disputed' WHERE id=target;
 ELSE
 IF l.status<>'closed' THEN RAISE EXCEPTION 'Bản trước chưa chốt' USING HINT='ck_command_acceptance'; END IF;
 n:=n+1; INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements,order_line_no)
 VALUES(na,n,l.lot_id,l.kind,l.qty,l.payable_qty,l.unit_price_vnd,l.value_vnd,l.reason_code,l.evidence_document_id,l.measurements,l.order_line_no) RETURNING id INTO nid;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=nid;
 END IF;
 END LOOP;
 INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason) VALUES(target,o.id,p_qty,ref.ctx_user(),p_reason) RETURNING id INTO result;
 UPDATE core.disputes SET status='awaiting_seller' WHERE id=result;
 UPDATE core.deliveries SET status='disputed' WHERE id=d.id;
 UPDATE core.deadlines SET status='met' WHERE entity_id=d.id AND kind='arrival_check' AND status='open';
 RETURN result;
END $$;
CREATE FUNCTION cmd.request_inspection(p_dispute uuid,p_provider uuid,p_sample uuid,p_fee bigint,p_proof uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE; o:=cmd.party_order(tc.order_id,ARRAY['owner','purchaser','warehouse','site_receiver','coop_board','collection_staff']);
 SELECT dl.* INTO d FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id JOIN core.deliveries dl ON dl.id=a.delivery_id WHERE l.id=tc.line_id FOR UPDATE OF dl;
 IF tc.status NOT IN ('open','awaiting_seller','inconclusive') OR NOT EXISTS(SELECT 1 FROM core.memberships m JOIN ops.staff_assignments s ON s.user_id=m.user_id WHERE m.org_id=p_provider AND m.status='active' AND s.role_code='inspector' AND s.active)
 OR (p_sample IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.sealed_samples WHERE id=p_sample AND delivery_id=d.id)) OR p_fee IS NULL OR p_fee<0
 OR (p_fee>0 AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_proof AND order_id=o.id AND doc_type='evidence' AND owner_org_id=ref.ctx_org())) THEN RAISE EXCEPTION 'Sai đối tác/mẫu/chứng cứ ứng phí' USING HINT='ck_command_evidence'; END IF;
 INSERT INTO core.inspections(delivery_id,dispute_id,provider_org_id,sample_id,kind,fee_vnd,prepaid_by_org_id,due_at) VALUES(d.id,tc.id,p_provider,p_sample,'dispute_quality',p_fee,ref.ctx_org(),ref.clock_at()+interval '48 hours') RETURNING id INTO result;
 UPDATE core.disputes SET status='awaiting_inspection' WHERE id=tc.id;
 UPDATE core.deadlines SET status='met' WHERE entity_id=tc.id AND kind='dispute_agreement' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('inspection_result','dispute',tc.id,o.id,ref.clock_at()+interval '48 hours',ref.clock_at()); RETURN result;
END $$;
-- Helper nội bộ: không nhận giá tiền. Dựng bản nghiệm thu mới từ snapshot + kết luận.
CREATE FUNCTION cmd.apply_dispute_result(p_dispute uuid,p_result text,p_document jsonb,p_inspection uuid,p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; o core.orders%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; v core.order_versions%ROWTYPE; l core.acceptance_lines%ROWTYPE; na uuid; doc uuid; nid uuid; k text; price bigint; payable bigint; rr core.inspection_results%ROWTYPE; ins core.inspections%ROWTYPE; q bigint; b text; original_line smallint; target_line core.order_lines%ROWTYPE;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE; SELECT * INTO o FROM core.orders WHERE id=tc.order_id FOR UPDATE;
 SELECT av.* INTO a FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE al.id=tc.line_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 IF EXISTS(SELECT 1 FROM core.dispute_resolutions WHERE dispute_id=tc.id) THEN RETURN (SELECT acceptance_id FROM core.dispute_resolutions WHERE dispute_id=tc.id); END IF;
 SELECT line_no INTO original_line FROM core.acceptance_lines WHERE id=tc.line_id;
 IF EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) THEN
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF NOT EXISTS(SELECT 1 FROM core.dispute_resolutions WHERE acceptance_id=a.id) THEN RAISE EXCEPTION 'Tranh chấp không còn ở bản hiện hành' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 END IF;
 doc:=cmd.attach_document(o.id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by) VALUES(d.id,a.version_no+1,a.id,a.weighed_qty,doc,ref.ctx_user()) RETURNING id INTO na;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id ORDER BY line_no LOOP
 IF l.line_no=original_line THEN
 k:=CASE WHEN p_result='passed' THEN 'accepted' ELSE l.kind END;
 SELECT * INTO target_line FROM core.order_lines WHERE order_id=o.id AND version_no=d.version_no AND line_no=l.order_line_no;
 price:=CASE WHEN p_result='passed' THEN coalesce(target_line.unit_price_vnd,v.unit_price_vnd) ELSE l.unit_price_vnd END;
 payable:=CASE WHEN k='rejected' THEN 0 ELSE l.qty END;
 ELSE
 k:=l.kind;price:=l.unit_price_vnd;payable:=l.payable_qty;
 END IF;
 INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements,order_line_no)
 VALUES(na,l.line_no,l.lot_id,k,l.qty,payable,price,ref.div_round(payable::numeric*price,1000),CASE WHEN k IN ('downgraded','rejected') THEN l.reason_code END,l.evidence_document_id,l.measurements,l.order_line_no) RETURNING id INTO nid;
 IF l.line_no=original_line OR l.status='closed' THEN UPDATE core.acceptance_lines SET status='closed' WHERE id=nid;
 ELSIF l.status='disputed' THEN UPDATE core.acceptance_lines SET status='disputed' WHERE id=nid; END IF;
 END LOOP;
 IF p_inspection IS NOT NULL THEN
 SELECT * INTO rr FROM core.inspection_results WHERE id=p_inspection; SELECT * INTO ins FROM core.inspections WHERE id=rr.inspection_id;
 IF ins.fee_vnd>0 AND ((p_result='failed' AND ins.prepaid_by_org_id=o.buyer_org_id) OR (p_result='passed' AND ins.prepaid_by_org_id=o.seller_org_id)) THEN
 INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
 VALUES(o.id,'inspection_fee',CASE p_result WHEN 'failed' THEN 'seller' ELSE 'buyer' END,ins.fee_vnd,jsonb_build_object('inspection_id',ins.id,'result_id',rr.id),'inspection',ins.id,ref.ctx_user()); END IF;
 END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=tc.line_id AND status='disputed';
 UPDATE core.disputes SET status='resolved',decision_id=p_decision WHERE id=tc.id;
 INSERT INTO core.dispute_resolutions(dispute_id,inspection_result_id,decision_id,acceptance_id,result,resolved_by) VALUES(tc.id,p_inspection,p_decision,na,p_result,ref.ctx_user());
 UPDATE core.deadlines SET status='met' WHERE entity_id=tc.id AND status='open';
 -- Không tự giả chữ ký buyer/seller cho phiên bản theo kết luận; decision/report là căn cứ riêng.
 PERFORM evt.emit('dispute',tc.id,'dispute.resolved',jsonb_build_object('acceptance_id',na,'inspection_result_id',p_inspection,'decision_id',p_decision),ARRAY['notify']); RETURN na;
END $$;
CREATE FUNCTION cmd.record_inspection_result(p_inspection uuid,p_event text,p_result text,p_report jsonb,p_measurements jsonb,p_acceptance_document jsonb DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE i core.inspections%ROWTYPE; tc core.disputes%ROWTYPE; doc uuid; result uuid; hash bytea; old core.inspection_provider_events%ROWTYPE;
BEGIN
 SELECT * INTO i FROM core.inspections WHERE id=p_inspection FOR UPDATE; PERFORM cmd.require_inspector(i.provider_org_id);
 hash:=digest(jsonb_build_object('inspection',i.id,'result',p_result,'report',p_report,'measurements',p_measurements,'acceptance',p_acceptance_document)::text,'sha256');
 SELECT * INTO old FROM core.inspection_provider_events WHERE provider_org_id=i.provider_org_id AND event_key=p_event;
 IF old.result_id IS NOT NULL THEN IF old.request_sha256 IS DISTINCT FROM hash THEN RAISE EXCEPTION 'Event kiểm định khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.result_id; END IF;
 SELECT * INTO tc FROM core.disputes WHERE id=i.dispute_id FOR UPDATE;
 IF tc.status IS DISTINCT FROM 'awaiting_inspection' OR p_result IS NULL OR p_result NOT IN ('passed','failed','inconclusive') OR EXISTS(SELECT 1 FROM core.inspection_results WHERE inspection_id=i.id)
 OR (i.sample_id IS NOT NULL AND p_measurements->>'seal_no' IS DISTINCT FROM (SELECT seal_no FROM core.sealed_samples WHERE id=i.sample_id)) THEN RAISE EXCEPTION 'Sai trạng thái/mẫu/kết quả kiểm định' USING HINT='ck_command_evidence'; END IF;
 doc:=cmd.attach_document(tc.order_id,'inspection_report',p_report,'inspection',i.id);
 INSERT INTO core.inspection_results(inspection_id,result,report_document_id,inspector_user_id,measurements) VALUES(i.id,p_result,doc,ref.ctx_user(),p_measurements) RETURNING id INTO result;
 INSERT INTO core.inspection_provider_events VALUES(i.provider_org_id,p_event,i.id,result,hash);
 UPDATE core.deadlines SET status='met' WHERE entity_id=tc.id AND kind='inspection_result' AND status='open';
 IF p_result='inconclusive' THEN
 UPDATE core.disputes SET status='inconclusive' WHERE id=tc.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('dispute_agreement','dispute',tc.id,tc.order_id,ref.clock_at()+interval '14 days',ref.clock_at());
 ELSE PERFORM cmd.apply_dispute_result(tc.id,p_result,p_acceptance_document,result,NULL); END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.resolve_dispute(p_dispute uuid,p_decision uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; q ops.decisions%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']); SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE;
 SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF tc.status NOT IN ('inconclusive','external_resolution') OR q.kind IS DISTINCT FROM 'dispute_resolution' OR q.entity IS DISTINCT FROM 'dispute' OR q.entity_id IS DISTINCT FROM tc.id OR q.approved_by IS DISTINCT FROM ref.ctx_user() OR q.detail->>'result' IS NULL OR q.detail->>'result' NOT IN ('passed','failed') THEN RAISE EXCEPTION 'Cần quyết định hai người đúng tranh chấp' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN cmd.apply_dispute_result(tc.id,q.detail->>'result',p_document,NULL,q.id);
END $$;
CREATE FUNCTION cmd.close_resolved_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; x record; pending bigint; delivered bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF d.status='closed' THEN RETURN; END IF;
 IF d.status IS DISTINCT FROM 'disputed' OR EXISTS(SELECT 1 FROM core.disputes WHERE order_id=o.id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.dispute_resolutions WHERE acceptance_id=a.id) THEN RAISE EXCEPTION 'Chưa kết luận hết tranh chấp' USING HINT='ck_command_acceptance'; END IF;
 -- Lượng đã thực hiện ở đợt này, không lấy tổng của đợt khác.
 SELECT coalesce(sum(CASE WHEN to_bucket='in_transit' THEN qty WHEN from_bucket='in_transit' THEN -qty ELSE 0 END),0),coalesce(sum(CASE WHEN to_bucket='delivered' THEN qty WHEN from_bucket='delivered' THEN -qty ELSE 0 END),0) INTO pending,delivered FROM ledger.qty_movements WHERE delivery_id=d.id;
 FOR x IN SELECT kind='rejected' rejected,sum(qty)::bigint qty FROM core.acceptance_lines WHERE acceptance_id=a.id GROUP BY kind='rejected' LOOP
 IF pending>0 THEN
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,o.id,d.id,'resolved:'||d.id||':'||x.rejected);
 ELSIF delivered>0 AND x.rejected THEN
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'delivered','returned_pending','reject_after',x.qty,o.id,d.id,'resolved-return:'||d.id);
 END IF;
 END LOOP;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
END $$;
GRANT EXECUTE ON FUNCTION cmd.open_dispute(uuid,bigint,text,text),cmd.claim_arrival_difference(uuid,smallint,bigint,text,uuid,jsonb),cmd.request_inspection(uuid,uuid,uuid,bigint,uuid),cmd.record_inspection_result(uuid,text,text,jsonb,jsonb,jsonb),cmd.resolve_dispute(uuid,uuid,jsonb) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.close_resolved_delivery(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
