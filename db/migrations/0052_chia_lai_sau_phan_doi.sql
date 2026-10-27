-- Đề xuất chia lại bảo toàn lượng của từng dòng tranh chấp; không sửa lịch sử.
CREATE TABLE core.acceptance_revisions(
 acceptance_id uuid PRIMARY KEY REFERENCES core.acceptance_versions,
 previous_id uuid NOT NULL UNIQUE REFERENCES core.acceptance_versions,
 request_sha256 bytea NOT NULL,created_by uuid NOT NULL REFERENCES core.users,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.acceptance_revision_disputes(
 acceptance_id uuid NOT NULL REFERENCES core.acceptance_revisions,
 dispute_id uuid NOT NULL REFERENCES core.disputes,
 PRIMARY KEY(acceptance_id,dispute_id)
);
ALTER TABLE core.acceptance_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.acceptance_revision_disputes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_revisions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_revision_disputes FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.acceptance_revision_lines(
 line_id uuid PRIMARY KEY REFERENCES core.acceptance_lines,dispute_id uuid NOT NULL REFERENCES core.disputes
);
ALTER TABLE core.acceptance_revision_lines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_revision_lines FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
-- p_lines chỉ chứa các phần thay dòng disputed; mỗi phần chỉ source_line_id cũ.
CREATE FUNCTION cmd.revise_acceptance_after_objection(p_previous uuid,p_document jsonb,p_lines jsonb,p_evidence uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; l core.acceptance_lines%ROWTYPE;
 result uuid; doc uuid; h bytea; old core.acceptance_revisions%ROWTYPE; x jsonb; n integer:=0; nid uuid;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_previous;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Chỉ người nhận chỉ định được lập lại kết quả' USING HINT='KHONG_CO_QUYEN'; END IF;
 h:=digest(jsonb_build_object('previous',p_previous,'document',p_document,'lines',p_lines,'evidence',p_evidence)::text,'sha256');
 SELECT * INTO old FROM core.acceptance_revisions WHERE previous_id=a.id;
 IF old.acceptance_id IS NOT NULL THEN
 IF old.request_sha256 IS DISTINCT FROM h THEN RAISE EXCEPTION 'Bản gửi lại khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF;
 RETURN old.acceptance_id;
 END IF;
 PERFORM 1 FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id
 WHERE al.acceptance_id=a.id AND tc.status<>'resolved' ORDER BY tc.id FOR UPDATE OF tc;
 IF d.status IS DISTINCT FROM 'disputed'
 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE delivery_id=d.id)
 OR NOT EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status='disputed')
 OR EXISTS(SELECT 1 FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id
 JOIN core.users u ON u.id=tc.opened_by
 WHERE al.acceptance_id=a.id AND tc.status<>'resolved' AND (tc.status<>'open' OR tc.created_at+interval '24 hours'<=ref.clock_at()
 OR NOT EXISTS(SELECT 1 FROM core.memberships m WHERE m.user_id=u.id AND m.org_id=(SELECT seller_org_id FROM core.orders WHERE id=d.order_id))
 OR EXISTS(SELECT 1 FROM core.inspections WHERE dispute_id=tc.id)))
 THEN RAISE EXCEPTION 'Chỉ chia lại phản đối của người bán trong 24 giờ, trước kiểm định/chốt lượng' USING HINT='ck_dispute_scope'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND order_id=d.order_id AND doc_type='evidence' AND owner_org_id=ref.ctx_org()) THEN RAISE EXCEPTION 'Cần chứng cứ cân lại mới đúng đơn' USING HINT='ck_command_evidence'; END IF;
 IF EXISTS(SELECT 1 FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id WHERE al.acceptance_id=a.id AND tc.status<>'resolved' AND tc.created_at>(SELECT created_at FROM core.documents WHERE id=p_evidence)) THEN RAISE EXCEPTION 'Chứng cứ phải được tạo sau phản đối' USING HINT='ck_command_evidence'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Thiếu các phần chia lại' USING HINT='ck_command_payload'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) j WHERE NOT EXISTS(
 SELECT 1 FROM core.acceptance_lines al JOIN core.disputes tc ON tc.line_id=al.id
 WHERE al.id=(j->>'source_line_id')::uuid AND al.acceptance_id=a.id AND al.status='disputed' AND tc.status='open'))
 OR EXISTS(SELECT 1 FROM core.acceptance_lines al WHERE al.acceptance_id=a.id AND al.status='disputed'
 AND al.qty::numeric IS DISTINCT FROM (SELECT sum((j->>'qty')::numeric) FROM jsonb_array_elements(p_lines) j WHERE (j->>'source_line_id')::uuid=al.id))
 THEN RAISE EXCEPTION 'Phải thay đúng và đủ lượng từng dòng tranh chấp' USING HINT='ck_dispute_scope'; END IF;
 doc:=cmd.attach_document(d.order_id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by)
 VALUES(d.id,a.version_no+1,a.id,a.weighed_qty,doc,ref.ctx_user()) RETURNING id INTO result;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id ORDER BY line_no LOOP
 IF l.status='disputed' THEN
 FOR x IN SELECT j FROM jsonb_array_elements(p_lines) j WHERE (j->>'source_line_id')::uuid=l.id LOOP
 IF (x->>'lot_id')::uuid IS DISTINCT FROM l.lot_id OR (x->>'order_line_no')::smallint IS DISTINCT FROM l.order_line_no THEN
 RAISE EXCEPTION 'Chia lại không đổi nguồn lô/dòng hợp đồng' USING HINT='ck_dispute_scope'; END IF;
 n:=n+1;
 nid:=cmd.insert_row('core.acceptance_lines',(x-'source_line_id')||jsonb_build_object('acceptance_id',result,'line_no',n,'evidence_document_id',p_evidence),
 ARRAY['acceptance_id','line_no','lot_id','order_line_no','kind','qty','payable_qty','unit_price_vnd','value_vnd','reason_code','evidence_document_id','measurements']);
 UPDATE core.acceptance_lines SET status='disputed' WHERE id=nid;
 INSERT INTO core.acceptance_revision_lines SELECT nid,id FROM core.disputes WHERE line_id=l.id AND status='open';
 END LOOP;
 ELSE
 n:=n+1;
 INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,contribution_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements,order_line_no)
 VALUES(result,n,l.lot_id,l.contribution_id,l.kind,l.qty,l.payable_qty,l.unit_price_vnd,l.value_vnd,l.reason_code,l.evidence_document_id,l.measurements,l.order_line_no) RETURNING id INTO nid;
 IF l.status='closed' THEN UPDATE core.acceptance_lines SET status='closed' WHERE id=nid; END IF;
 END IF;
 END LOOP;
 INSERT INTO core.acceptance_revisions VALUES(result,a.id,h,ref.ctx_user(),now());
 INSERT INTO core.acceptance_revision_disputes SELECT result,tc.id FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id WHERE al.acceptance_id=a.id AND tc.status='open';
 PERFORM set_config('app.reason','Bên mua chia lại các dòng bị người bán phản đối',true);
 UPDATE core.disputes SET status='awaiting_seller' WHERE id IN (SELECT dispute_id FROM core.acceptance_revision_disputes WHERE acceptance_id=result);
 UPDATE core.deliveries SET status='checking' WHERE id=d.id;
 PERFORM evt.emit('delivery',d.id,'acceptance.revised_after_objection',jsonb_build_object('acceptance_id',result,'previous_id',a.id),ARRAY['notify']);
 RETURN result;
END $$;
-- Chỉ đóng phản đối khi người bán chấp nhận chính bản mới đã có hai chữ ký.
ALTER FUNCTION cmd.agree_acceptance(uuid) RENAME TO agree_acceptance_before_revision;
REVOKE ALL ON FUNCTION cmd.agree_acceptance_before_revision(uuid) FROM agiviet_app;
CREATE FUNCTION cmd.agree_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; tc core.disputes%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF EXISTS(SELECT 1 FROM core.acceptance_revisions WHERE acceptance_id=a.id) AND NOT EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE acceptance_id=a.id) THEN
 IF d.status<>'awaiting_seller' OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer')
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN
 RAISE EXCEPTION 'Cần gửi và ký bản chia lại hiện hành' USING HINT='ck_command_acceptance'; END IF;
 FOR tc IN SELECT t.* FROM core.disputes t JOIN core.acceptance_revision_disputes r ON r.dispute_id=t.id WHERE r.acceptance_id=a.id ORDER BY t.id FOR UPDATE OF t LOOP
 IF tc.status IS DISTINCT FROM 'awaiting_seller' THEN RAISE EXCEPTION 'Tranh chấp đã chuyển xử lý khác' USING HINT='ck_dispute_scope'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=tc.line_id AND status='disputed';
 UPDATE core.disputes SET status='resolved' WHERE id=tc.id;
 UPDATE core.deadlines SET status='met' WHERE entity_id=tc.id AND status='open';
 END LOOP;
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=a.id AND status='disputed';
 END IF;
 PERFORM cmd.agree_acceptance_before_revision(a.id);
END $$;
-- Kiểm định vẫn xử lý được các phần đã chia nếu hai bên không thống nhất.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.revise_acceptance_after_objection(uuid,jsonb,jsonb,uuid),cmd.agree_acceptance(uuid) TO agiviet_app;

CREATE OR REPLACE FUNCTION cmd.apply_dispute_result(p_dispute uuid,p_result text,p_document jsonb,p_inspection uuid,p_decision uuid) RETURNS uuid
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
 IF NOT EXISTS(SELECT 1 FROM core.dispute_resolutions WHERE acceptance_id=a.id) AND NOT EXISTS(SELECT 1 FROM core.acceptance_revisions WHERE acceptance_id=a.id) THEN RAISE EXCEPTION 'Tranh chấp không còn ở bản hiện hành' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 END IF;
 doc:=cmd.attach_document(o.id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by) VALUES(d.id,a.version_no+1,a.id,a.weighed_qty,doc,ref.ctx_user()) RETURNING id INTO na;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id ORDER BY line_no LOOP
 IF EXISTS(SELECT 1 FROM core.acceptance_revision_lines WHERE line_id=l.id AND dispute_id=tc.id) OR (NOT EXISTS(SELECT 1 FROM core.acceptance_revision_lines rl JOIN core.acceptance_lines al ON al.id=rl.line_id WHERE al.acceptance_id=a.id) AND l.line_no=original_line) THEN
 k:=CASE WHEN p_result='passed' THEN 'accepted' ELSE l.kind END;
 SELECT * INTO target_line FROM core.order_lines WHERE order_id=o.id AND version_no=d.version_no AND line_no=l.order_line_no;
 price:=CASE WHEN p_result='passed' THEN coalesce(target_line.unit_price_vnd,v.unit_price_vnd) ELSE l.unit_price_vnd END;
 payable:=CASE WHEN k='rejected' THEN 0 ELSE l.qty END;
 ELSE
 k:=l.kind;price:=l.unit_price_vnd;payable:=l.payable_qty;
 END IF;
 INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements,order_line_no)
 VALUES(na,l.line_no,l.lot_id,k,l.qty,payable,price,ref.div_round(payable::numeric*price,1000),CASE WHEN k IN ('downgraded','rejected') THEN l.reason_code END,l.evidence_document_id,l.measurements,l.order_line_no) RETURNING id INTO nid;
 IF EXISTS(SELECT 1 FROM core.acceptance_revision_lines WHERE line_id=l.id AND dispute_id=tc.id) OR (NOT EXISTS(SELECT 1 FROM core.acceptance_revision_lines rl JOIN core.acceptance_lines al ON al.id=rl.line_id WHERE al.acceptance_id=a.id) AND l.line_no=original_line) OR l.status='closed' THEN UPDATE core.acceptance_lines SET status='closed' WHERE id=nid;
 ELSIF l.status='disputed' THEN UPDATE core.acceptance_lines SET status='disputed' WHERE id=nid; END IF;
 INSERT INTO core.acceptance_revision_lines SELECT nid,dispute_id FROM core.acceptance_revision_lines WHERE line_id=l.id;
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

COMMENT ON TABLE core.acceptance_revisions IS 'Bản chia lại sau phản đối; request hash chống retry khác nội dung, không giả chữ ký.';
COMMENT ON COLUMN core.acceptance_revisions.acceptance_id IS 'Bản nghiệm thu mới cần hai bên ký.';
COMMENT ON COLUMN core.acceptance_revisions.previous_id IS 'Bản bị phản đối, duy nhất một bản chia lại cho một request gốc.';
COMMENT ON COLUMN core.acceptance_revisions.request_sha256 IS 'SHA256 toàn bộ tham số đã chuẩn hóa bằng jsonb.';
COMMENT ON COLUMN core.acceptance_revisions.created_by IS 'Người nhận bên mua từ login tin cậy.';
COMMENT ON COLUMN core.acceptance_revisions.created_at IS 'Thời điểm tạo bản chia lại.';
COMMENT ON TABLE core.acceptance_revision_disputes IS 'Các tranh chấp được đề nghị đóng khi người bán đồng ý bản chia lại.';
COMMENT ON COLUMN core.acceptance_revision_disputes.acceptance_id IS 'Bản chia lại cần được gửi và ký.';
COMMENT ON COLUMN core.acceptance_revision_disputes.dispute_id IS 'Phản đối gốc, còn mở cho tới đủ chữ ký và đồng ý.';
COMMENT ON TABLE core.acceptance_revision_lines IS 'Nguồn tranh chấp của từng phần chia lại, giữ qua các kết luận kiểm định nối phiên bản.';
COMMENT ON COLUMN core.acceptance_revision_lines.line_id IS 'Dòng hiện hành hoặc lịch sử thuộc phần chia lại.';
COMMENT ON COLUMN core.acceptance_revision_lines.dispute_id IS 'Tranh chấp gốc bao phủ phần lượng này.';
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE FUNCTION core.acceptance_value(p_order uuid,p_final boolean) RETURNS numeric
LANGUAGE plpgsql SET search_path=pg_catalog,core AS $$
DECLARE vv numeric;
BEGIN
 SELECT coalesce(sum(al.value_vnd),0) INTO vv FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries d ON d.id=av.delivery_id
 WHERE d.order_id=p_order AND (al.status='closed' OR (NOT p_final AND al.status='disputed')) AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=d.id AND n.version_no>av.version_no) AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines n WHERE n.replaces_line_id=al.id);
 -- Chưa có đồng ý của người bán: không tăng V_kt theo đề xuất chia lại.
 IF NOT p_final THEN
 SELECT vv-coalesce(sum(greatest(0,q.value_vnd-old.value_vnd)),0) INTO vv FROM (
 SELECT rl.dispute_id,sum(al.value_vnd)::bigint value_vnd FROM core.acceptance_revision_lines rl
 JOIN core.acceptance_lines al ON al.id=rl.line_id JOIN core.acceptance_versions av ON av.id=al.acceptance_id
 JOIN core.deliveries dl ON dl.id=av.delivery_id JOIN core.disputes tc ON tc.id=rl.dispute_id
 WHERE dl.order_id=p_order AND tc.status<>'resolved'
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=dl.id AND n.version_no>av.version_no)
 GROUP BY rl.dispute_id) q JOIN core.disputes tc ON tc.id=q.dispute_id JOIN core.acceptance_lines old ON old.id=tc.line_id;
 END IF;
 RETURN vv;
END $$;
REVOKE ALL ON FUNCTION core.acceptance_value(uuid,boolean) FROM PUBLIC;
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
 vv:=core.acceptance_value(o.id,p_final);
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

CREATE OR REPLACE FUNCTION core.guard_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE vv numeric; dd numeric; cc numeric; prior numeric; xnb numeric; xbm numeric; mat numeric; p core.settlements%ROWTYPE;
BEGIN
 PERFORM 1 FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO p FROM core.settlements WHERE id=NEW.previous_settlement_id;
 IF NEW.is_final AND (EXISTS(SELECT 1 FROM core.disputes WHERE order_id=NEW.order_id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.order_id AND status NOT IN ('closed','shortfall_ended','cancelled'))) THEN
 RAISE EXCEPTION 'Chưa kết thúc giao nhận, chỉ quyết toán tạm' USING HINT='ck_settlement_final'; END IF;
 vv:=core.acceptance_value(NEW.order_id,NEW.is_final);
 SELECT coalesce(sum(c.amount_vnd),0) INTO dd FROM core.direct_payment_confirmations c JOIN core.direct_payments dp ON dp.id=c.direct_payment_id WHERE dp.order_id=NEW.order_id AND dp.direction='buyer_to_seller' AND dp.kind IN ('goods_before_loading','goods_on_receipt','goods_after_days','goods_extra','goods_batch');
 IF NEW.is_adjustment THEN
  -- C và phần cọc chi trước giữ snapshot bản cuối đầu tiên; trạng thái callback không đổi phép chênh N.
  cc:=p.c_vnd; prior:=p.prior_released_vnd;
  IF NEW.t_bm_vnd<>greatest(0,NEW.n_vnd-p.n_vnd) OR NEW.t_nb_vnd<>greatest(0,p.n_vnd-NEW.n_vnd) THEN
   RAISE EXCEPTION 'Nghĩa vụ điều chỉnh phải bằng chênh N giữa hai phiên bản' USING HINT='ck_settlement_delta'; END IF;
 ELSE
  SELECT coalesce(sum(balance_vnd),0) INTO cc FROM ledger.v_account_balances WHERE order_id=NEW.order_id AND account_type IN ('deposit_escrow','deposit_in_instruction');
  SELECT coalesce(sum(amount_vnd),0) INTO prior FROM core.bank_instructions WHERE order_id=NEW.order_id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled');
  -- Bản tạm có lệnh chưa xong phải đợi callback, tránh chi lại tiền đang trong lệnh.
  IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=NEW.order_id AND status IN ('created','sent','processing')) THEN
   RAISE EXCEPTION 'Chờ kết quả lệnh tạm trước khi chia cọc lần tiếp' USING HINT='ck_settlement_pending'; END IF;
  cc:=cc+prior;
 END IF;
 SELECT coalesce(sum(amount_vnd) FILTER(WHERE payer_side='seller' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE payer_side='buyer' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE kind='materials_offset'),0) INTO xnb,xbm,mat FROM core.contract_charges WHERE order_id=NEW.order_id;
 IF (NEW.v_vnd,NEW.d_vnd,NEW.c_vnd,NEW.prior_released_vnd,NEW.x_nb_vnd,NEW.x_bm_vnd,NEW.materials_offset_vnd) IS DISTINCT FROM (vv,dd,cc,prior,xnb,xbm,mat) THEN
 RAISE EXCEPTION 'Đầu vào quyết toán không khớp chứng cứ và sổ tiền' USING HINT='ck_settlement_inputs'; END IF;
 RETURN NEW;
END $$;


-- Nhánh không thống nhất sau chia lại: cho yêu cầu kiểm định và giữ đợt disputed.
ALTER FUNCTION cmd.request_inspection(uuid,uuid,uuid,bigint,uuid) RENAME TO request_inspection_before_revision;
REVOKE ALL ON FUNCTION cmd.request_inspection_before_revision(uuid,uuid,uuid,bigint,uuid) FROM agiviet_app;
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds)
 VALUES('delivery','checking','disputed',ARRAY['buyer','seller']);
UPDATE ref.state_transitions SET actor_kinds=array_append(actor_kinds,'buyer')
 WHERE entity='delivery' AND from_status='awaiting_seller' AND to_status='disputed' AND NOT ('buyer'=ANY(actor_kinds));
CREATE FUNCTION cmd.request_inspection(p_dispute uuid,p_provider uuid,p_sample uuid,p_fee bigint,p_proof uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE d core.deliveries%ROWTYPE; result uuid;
BEGIN
 SELECT dl.* INTO d FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id
 JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries dl ON dl.id=av.delivery_id
 WHERE tc.id=p_dispute FOR UPDATE OF dl;
 result:=cmd.request_inspection_before_revision(p_dispute,p_provider,p_sample,p_fee,p_proof);
 IF d.status IN ('checking','awaiting_seller') AND EXISTS(SELECT 1 FROM core.acceptance_revision_disputes WHERE dispute_id=p_dispute) THEN
 UPDATE core.deliveries SET status='disputed' WHERE id=d.id;
 END IF;
 RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.request_inspection(uuid,uuid,uuid,bigint,uuid) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
