CREATE FUNCTION cmd.attach_framework_evidence(p_framework uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 PERFORM cmd.require_org(CASE ref.ctx_actor() WHEN 'buyer' THEN f.buyer_org_id ELSE f.seller_org_id END,ARRAY['owner','purchaser','accountant','coop_board']);
 RETURN cmd.attach_document(NULL,'evidence',p_document,'framework',f.id);
END $$;
CREATE OR REPLACE FUNCTION cmd.report_payment(p_payment uuid,p_amount bigint,p_method text,p_evidence uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.direct_payments%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO d FROM core.direct_payments WHERE id=p_payment FOR UPDATE;
 PERFORM cmd.require_org(d.payer_org_id,ARRAY['owner','accountant','coop_board']);
 IF d.status NOT IN ('due','payer_reported','partially_received','overdue') OR p_amount IS NULL OR p_amount<=0 OR p_amount>d.amount_due_vnd-coalesce((SELECT sum(amount_vnd) FROM core.direct_payment_confirmations WHERE direct_payment_id=d.id),0)
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND owner_org_id=ref.ctx_org() AND doc_type IN ('evidence','receipt_record') AND (order_id=d.order_id OR d.framework_id IS NOT NULL AND entity='framework' AND entity_id=d.framework_id)) THEN RAISE EXCEPTION 'Báo trả cần chứng cứ đúng khoản/phạm vi' USING HINT='ck_command_payment'; END IF;
 INSERT INTO core.direct_payment_reports(direct_payment_id,amount_vnd,method,evidence_doc_id,reported_by) VALUES(d.id,p_amount,p_method,p_evidence,ref.ctx_user()) RETURNING id INTO result;
 UPDATE core.direct_payments SET status='payer_reported' WHERE id=d.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('direct_payment_confirm','direct_payment',d.id,d.order_id,ref.clock_at()+interval '48 hours',ref.clock_at()) ON CONFLICT(entity,entity_id,kind) WHERE status='open' DO NOTHING; RETURN result;
END $$;
CREATE OR REPLACE FUNCTION cmd.reconcile_direct_payment(p_payment uuid,p_amount bigint,p_result text,p_reference text,p_decision uuid,p_proof uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE d ops.decisions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['finance','risk']); SELECT * INTO d FROM ops.decisions WHERE id=p_decision;
 IF d.kind IS DISTINCT FROM 'payment_reconciliation' OR d.entity IS DISTINCT FROM 'direct_payment' OR d.entity_id IS DISTINCT FROM p_payment OR d.proposed_by IS DISTINCT FROM ref.ctx_user()
 OR d.detail-'command_proposal_id' IS DISTINCT FROM jsonb_build_object('amount_vnd',p_amount,'result',p_result,'bank_reference',p_reference,'proof_id',p_proof) THEN RAISE EXCEPTION 'Quyết định phải duyệt đúng khoản/số/kết quả/bằng chứng' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO result FROM core.direct_payment_confirmations WHERE bank_evidence_id=p_proof;
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM set_config('app.reason',d.reason,true);
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,ops_decision_by,bank_evidence_id)
 VALUES(p_payment,p_result,p_amount,p_reference,ref.ctx_user(),ARRAY[d.proposed_by,d.approved_by],p_proof) RETURNING id INTO result; RETURN result;
END $$;
-- Cọc của đơn nhóm đi qua activate_order_after_deposit chung; chốt ký nhóm chỉ qua cutoff_group.
-- Đơn gọi hàng không phát sinh nghĩa vụ từng đơn vì thu theo framework_period.
CREATE OR REPLACE FUNCTION cmd.agree_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; amount bigint; received bigint; outstanding bigint;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE; o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 IF d.status<>'awaiting_seller' OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status='disputed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Cần bản hiện hành hai chữ ký, không tranh chấp' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=a.id AND status='proposed';
 IF o.framework_id IS NOT NULL THEN RETURN; END IF;
 SELECT coalesce(sum(l.value_vnd),0) INTO amount FROM core.acceptance_lines l JOIN core.acceptance_versions av ON av.id=l.acceptance_id JOIN core.deliveries dl ON dl.id=av.delivery_id WHERE dl.order_id=o.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=dl.id AND n.version_no>av.version_no);
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payments p JOIN core.direct_payment_confirmations c ON c.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='buyer_to_seller';
 SELECT coalesce(sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0)),0) INTO outstanding FROM core.direct_payments p WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.status NOT IN ('fully_received','cancelled');
 amount:=greatest(0,amount-v.deposit_vnd-received-outstanding);
 IF amount>0 AND v.payment_timing IN ('inspect_then_before_loading','on_receipt','after_days') THEN
 INSERT INTO core.direct_payments(code,order_id,delivery_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('GOODS-'||a.id,o.id,d.id,CASE WHEN v.payment_timing='after_days' THEN 'goods_after_days' ELSE 'goods_on_receipt' END,'buyer_to_seller',o.buyer_org_id,o.seller_org_id,amount,CASE WHEN v.payment_timing='after_days' THEN 'after_days' ELSE 'acceptance_closed' END,'due',v.payment_timing='inspect_then_before_loading',ref.clock_at()+coalesce(v.pay_after_days,0)*interval '1 day',v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
END $$;
GRANT EXECUTE ON FUNCTION cmd.attach_framework_evidence(uuid,jsonb) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.close_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; accepted bigint; rejected bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF d.status='closed' THEN RETURN; END IF;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Nghiệm thu chưa chốt' USING HINT='ck_command_acceptance'; END IF;
 -- system không thay seller xác nhận tại nguồn. Ghi nhận đóng sau arrived/arrival_check.
 IF d.status='arrived' THEN RAISE EXCEPTION 'Người nhận cần begin_arrival_check' USING HINT='ck_command_state'; END IF;
 IF d.status='awaiting_seller' THEN
 -- Chuyển này chỉ được ghi bởi seller; system từ chối để giữ máy trạng thái cũ.
 RAISE EXCEPTION 'Người bán cần chốt tại kho qua finish_warehouse_delivery' USING HINT='ck_command_state'; END IF;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 PERFORM cmd.move_delivery_closed(d.id,a.id);
 PERFORM cmd.sync_document(a.document_id);
END $$;

CREATE OR REPLACE FUNCTION cmd.submit_acceptance(p_delivery uuid,p_weighed bigint,p_document jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; prev core.acceptance_versions%ROWTYPE; result uuid; doc uuid; x jsonb; n integer:=0;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.status NOT IN ('checking','awaiting_seller') OR d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Chưa nghiệm thu hoặc sai người nhận' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF EXISTS(SELECT 1 FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE av.delivery_id=d.id AND tc.status<>'resolved') THEN RAISE EXCEPTION 'Xử lý tranh chấp trước khi gửi lại' USING HINT='ck_command_acceptance'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Thiếu dòng nghiệm thu' USING HINT='ck_command_payload'; END IF;
 SELECT * INTO prev FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 doc:=cmd.attach_document(d.order_id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by) VALUES(d.id,coalesce(prev.version_no,0)+1,prev.id,p_weighed,doc,ref.ctx_user()) RETURNING id INTO result;
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 n:=n+1;
 PERFORM cmd.insert_row('core.acceptance_lines',x||jsonb_build_object('acceptance_id',result,'line_no',n,'evidence_document_id',doc),ARRAY['acceptance_id','line_no','lot_id','order_line_no','kind','qty','payable_qty','unit_price_vnd','value_vnd','reason_code','evidence_document_id','measurements','replaces_line_id']);
 END LOOP;
 RETURN result; -- Ký BBNT qua sign_record, không tự tạo chữ ký hay nhận fully_signed từ JSON.
END $$;
-- Tài khoản ảo của nhóm do adapter cấp trước chốt, không bịa mã ngân hàng trong DB.
CREATE TABLE cmd.group_deposit_accounts(
 order_id uuid PRIMARY KEY REFERENCES core.orders,payment_ref text NOT NULL UNIQUE CHECK(length(btrim(payment_ref))>0),
 virtual_account_no text NOT NULL UNIQUE CHECK(length(btrim(virtual_account_no))>0),provider text NOT NULL CHECK(length(btrim(provider))>0)
);
ALTER TABLE cmd.group_deposit_accounts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON cmd.group_deposit_accounts FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.register_group_deposit_account(p_order uuid,p_ref text,p_virtual text,p_provider text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE a cmd.group_deposit_accounts%ROWTYPE;
BEGIN
 PERFORM cmd.require_system();
 PERFORM 1 FROM core.orders o JOIN core.group_orders g ON g.id=o.group_order_id WHERE o.id=p_order AND g.status='gathering' AND o.status IN ('drafting','awaiting_seller') FOR UPDATE OF o,g;
 IF NOT FOUND THEN RAISE EXCEPTION 'Phần nhóm không còn pha gom' USING HINT='ck_command_state'; END IF;
 SELECT * INTO a FROM cmd.group_deposit_accounts WHERE order_id=p_order;
 IF a.order_id IS NOT NULL THEN IF (a.payment_ref,a.virtual_account_no,a.provider) IS DISTINCT FROM (p_ref,p_virtual,p_provider) THEN RAISE EXCEPTION 'Đã cấp tài khoản ảo khác' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN; END IF;
 INSERT INTO cmd.group_deposit_accounts VALUES(p_order,p_ref,p_virtual,p_provider);
END $$;
CREATE FUNCTION cmd.reset_group_parts(p_group uuid,p_new_cutoff timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE g core.group_orders%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO g FROM core.group_orders WHERE id=p_group FOR UPDATE; PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 IF g.status IS DISTINCT FROM 'gathering' OR p_new_cutoff IS NULL OR p_new_cutoff<=ref.clock_at() OR EXISTS(SELECT 1 FROM core.orders WHERE group_order_id=g.id AND status NOT IN ('drafting','internal_approval','awaiting_seller','closed')) THEN RAISE EXCEPTION 'Chỉ phân lại trước cọc nhóm' USING HINT='ck_command_state'; END IF;
 FOR o IN SELECT * FROM core.orders WHERE group_order_id=g.id AND status<>'closed' ORDER BY id FOR UPDATE LOOP PERFORM cmd.close_unsigned_order(o.id,'cancel_before_deposit'); END LOOP;
 UPDATE core.group_orders SET cutoff_at=p_new_cutoff,group_fee_vnd=NULL WHERE id=g.id;
 UPDATE core.deadlines SET status='cancelled' WHERE entity='group_order' AND entity_id=g.id AND kind='group_cutoff' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('group_cutoff','group_order',g.id,p_new_cutoff,ref.clock_at());
END $$;
GRANT EXECUTE ON FUNCTION cmd.register_group_deposit_account(uuid,text,text,text) TO agiviet_orchestrator;
GRANT EXECUTE ON FUNCTION cmd.reset_group_parts(uuid,timestamptz) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
-- TH-040b: ngoại lệ duy nhất được ký thay. Không nhận bên ký/actor/quyền từ tham số.
UPDATE ref.state_transitions SET actor_kinds=array_append(actor_kinds,'ops') WHERE entity='amendment' AND from_status='open' AND to_status='accepted' AND NOT ('ops'=ANY(actor_kinds));
CREATE FUNCTION cmd.prepare_operational_reduction(p_amendment uuid,p_decision uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; d core.documents%ROWTYPE; q ops.decisions%ROWTYPE; qty bigint; val bigint; basis bigint; c bigint; f bigint; doc uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']); SELECT * INTO a FROM core.amendments WHERE id=p_amendment FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=a.order_id FOR UPDATE; SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.kind IS DISTINCT FROM 'force_majeure_reduction' OR a.status IS DISTINCT FROM 'open' OR a.proposed_by_org_id IS DISTINCT FROM o.seller_org_id OR a.buyer_reply_deadline IS NULL OR ref.clock_at()<a.buyer_reply_deadline OR a.buyer_replied_at IS NOT NULL OR o.status IS DISTINCT FROM 'active'
 OR q.kind IS DISTINCT FROM 'force_majeure_reduction' OR q.entity IS DISTINCT FROM 'amendment' OR q.entity_id IS DISTINCT FROM a.id OR q.approved_by IS DISTINCT FROM ref.ctx_user() OR q.created_at<a.buyer_reply_deadline OR NOT (q.evidence_document_id=ANY(a.evidence_doc_ids)) OR p_document->'canonical_content'->>'operational_signature_notice' IS DISTINCT FROM 'ký thay bằng quyết định vận hành '||q.id::text THEN RAISE EXCEPTION 'Chỉ ngoại lệ bất khả kháng im lặng có hai người và ghi rõ quyết định' USING HINT='ck_operational_signature'; END IF;
 qty:=(a.payload->>'qty_g')::bigint;
 IF qty<=0 OR qty>=v.qty_min OR v.value_basis<>'single_product' OR v.deposit_rule<>'percent' OR EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=o.id AND version_no>v.version_no) THEN RAISE EXCEPTION 'Sai phiên bản/giảm lượng' USING HINT='ck_operational_signature'; END IF;
 val:=ref.div_round(qty::numeric*v.unit_price_vnd,v.price_unit_base_qty);basis:=ref.div_round(qty::numeric*v.deposit_price_vnd,v.price_unit_base_qty);
 c:=least(val,ref.div_round(v.deposit_bps::numeric*basis,10000000)*1000);
 f:=CASE WHEN v.fee_bps=0 THEN 0 ELSE least(coalesce(v.fee_cap_vnd,9223372036854775807),greatest(coalesce(v.fee_floor_vnd,0),ref.div_round(v.fee_bps::numeric*basis,10000))) END;
 SELECT * INTO d FROM core.documents WHERE id=v.document_id;
 doc:=cmd.attach_document(o.id,'annex',p_document||jsonb_build_object('series_key',d.series_key,'version_no',v.version_no+1,'prev_document_id',d.id,'prev_content_sha256',d.content_sha256),'amendment',a.id);
 nv:=jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||jsonb_build_object('version_no',v.version_no+1,'amendment_id',a.id,'document_id',doc,'qty_min',qty,'qty_max',qty,'contract_value_vnd',val,'deposit_basis_vnd',basis,'deposit_vnd',c,'fee_vnd',f,'created_at',now(),'write_xid',pg_current_xact_id()::text));
 INSERT INTO core.order_versions SELECT (nv).*;
 UPDATE core.amendments SET status='accepted',resulting_version_no=nv.version_no WHERE id=a.id;
 -- Dấu quyết định nội bộ, không giả chữ ký OTP của khách. guard_operational_signature kiểm lại toàn bộ ngoại lệ.
 INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,device_id,cert_fingerprint,signature_value,ops_decision_id)
 SELECT doc,'buyer',ref.ctx_user(),ref.ctx_org(),'quyet_dinh_van_hanh',content_sha256,'OPS-DECISION:'||q.id,digest('ops-decision:'||q.id,'sha256'),digest(doc::text||':'||q.id::text,'sha256'),q.id FROM core.documents WHERE id=doc;
 RETURN doc;
END $$;
-- Sửa phạm vi quyết định điều chỉnh: người duyệt đã nhìn đúng toàn bộ nội dung sổ.
CREATE OR REPLACE FUNCTION cmd.post_correction(p_decision uuid,p_order uuid,p_idem text,p_memo text,p_lines jsonb,p_effective timestamptz DEFAULT now()) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ledger,ref,public AS $$
DECLARE d ops.decisions%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['finance']); SELECT * INTO d FROM ops.decisions WHERE id=p_decision;
 IF ref.ctx_user() IS DISTINCT FROM d.proposed_by OR d.kind IS DISTINCT FROM 'ledger_correction' OR d.entity IS DISTINCT FROM 'ledger_transaction'
 OR d.detail-'command_proposal_id' IS DISTINCT FROM jsonb_build_object('order_id',p_order,'idempotency_key',p_idem,'memo',p_memo,'lines',p_lines,'effective_at',p_effective) THEN RAISE EXCEPTION 'Nội dung sổ khác quyết định đã duyệt' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN ledger.post('manual_adjustment',p_order,p_idem,p_memo,p_lines,p_effective,NULL,d.approved_by,jsonb_build_object('id',d.entity_id,'decision',d.id));
END $$;
GRANT EXECUTE ON FUNCTION cmd.prepare_operational_reduction(uuid,uuid,jsonb) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
COMMENT ON TABLE ops.decision_proposals IS 'Đề xuất bất biến: login người lập và nội dung đã khóa; login người duyệt độc lập tạo ops.decisions.';
COMMENT ON TABLE core.cancellation_accountings IS 'Ảnh chụp hạch toán hủy: N, D, C, lượng nhả, phí hoàn và nghĩa vụ ròng; command dựng từ chứng cứ, không nhận số chia từ client.';
COMMENT ON TABLE core.amendment_applications IS 'Phụ lục đã áp hệ quả tiền/lượng đúng một lần; không đồng nhất đủ chữ ký với đã thực thi.';
COMMENT ON TABLE core.dispute_resolutions IS 'Kết luận trỏ bản nghiệm thu kế tiếp, có đúng một căn cứ kiểm định hoặc quyết định hai người.';
COMMENT ON TABLE core.inspection_provider_events IS 'Khóa chống lặp theo đối tác và event; hash toàn nội dung chặn event cùng mã khác kết luận.';
COMMENT ON TABLE core.framework_terms IS 'Tài liệu khung đã ghim, một kỳ hàng và tài khoản người bán chụp từ tài khoản đang active.';
COMMENT ON TABLE core.framework_periods IS 'Kỳ thu tiền khung không chồng lấn: giá trị từ quyết toán các đơn con, phí theo tỷ lệ, không sàn.';
COMMENT ON TABLE core.framework_closures IS 'Ảnh chụp số dư cọc khung được hoàn khi không còn giao nhận/công nợ; chỉ ended sau đối soát.';
COMMENT ON TABLE core.delivery_shortfall_actions IS 'Lựa chọn phần thiếu có hai chữ ký nghiệm thu; giao bù hoặc nhả lượng và phạt theo snapshot Q04.';
COMMENT ON TABLE cmd.deadline_results IS 'Kết quả hết hạn bất biến, trả lại cùng action/task để retry không gửi thông báo/hạch toán lặp.';
COMMENT ON TABLE cmd.group_deposit_accounts IS 'Tài khoản ảo thật do bank adapter cấp từng phần nhóm trước chốt; runtime không tự DML.';
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT n.nspname,c.relname,a.attname FROM pg_namespace n JOIN pg_class c ON c.relnamespace=n.oid JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE (n.nspname,c.relname) IN (('ops','decision_proposals'),('core','cancellation_accountings'),('core','amendment_applications'),('core','dispute_resolutions'),('core','inspection_provider_events'),('core','framework_terms'),('core','framework_periods'),('core','framework_closures'),('core','delivery_shortfall_actions'),('cmd','deadline_results'),('cmd','group_deposit_accounts')) AND col_description(c.oid,a.attnum) IS NULL LOOP
 EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,'Dữ liệu command '||r.relname||': '||r.attname||'; căn cứ và danh tính do DB kiểm, lịch sử bất biến.'); END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
CREATE FUNCTION cmd.create_manual_instruction(p_decision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ledger,ref,public AS $$
DECLARE q ops.decisions%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; dep core.deposits%ROWTYPE; e core.bank_events%ROWTYPE; result uuid; amount bigint; kind text;
BEGIN
 PERFORM cmd.require_staff(ARRAY['finance']); SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF q.kind IS DISTINCT FROM 'manual_payment' OR q.entity IS DISTINCT FROM 'order' OR q.proposed_by IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Sai quyết định lập lệnh hai người' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO result FROM core.bank_instructions WHERE basis_kind='ops_decision' AND basis_id=q.id AND status<>'failed'; IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM cmd.check_payload(q.detail-'command_proposal_id',ARRAY['kind','amount_vnd','source_event_id']);
 kind:=q.detail->>'kind';amount:=(q.detail->>'amount_vnd')::bigint;
 SELECT * INTO o FROM core.orders WHERE id=q.entity_id FOR UPDATE; SELECT * INTO dep FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF kind IS NULL OR kind NOT IN ('release_deposit_to_seller','refund_deposit_to_buyer') OR amount IS NULL OR amount<=0 OR o.status IN ('drafting','awaiting_seller','awaiting_deposit','closed','completed') THEN RAISE EXCEPTION 'Sai loại/số/trạng thái lệnh thủ công' USING HINT='ck_instruction_basis'; END IF;
 IF kind='release_deposit_to_seller' THEN
 IF amount>coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances WHERE order_id=o.id AND account_type='seller_receivable'),0) THEN RAISE EXCEPTION 'Không chi vượt quyền đòi đã ghi nhận' USING HINT='ck_instruction_basis'; END IF;
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_account_id,target_bank_code,target_account_masked,target_account_holder,created_by,approved_by,is_manual)
 VALUES('MANUAL-'||q.id,kind,dep.id,o.id,'ops_decision',q.id,amount,o.seller_org_id,v.seller_bank_account_id,v.seller_bank_code,v.seller_account_masked,v.seller_account_holder,q.proposed_by,q.approved_by,true) RETURNING id INTO result;
 ELSE
 SELECT * INTO e FROM core.bank_events WHERE id=(q.detail->>'source_event_id')::uuid FOR UPDATE;
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_code,target_account_masked,target_account_holder,source_bank_event_id,target_account_hash,created_by,approved_by,is_manual)
 VALUES('MANUAL-'||q.id,kind,dep.id,o.id,'ops_decision',q.id,amount,o.buyer_org_id,e.payer_bank_code,e.payer_account_masked,e.payer_account_name,e.id,e.payer_account_hash,q.proposed_by,q.approved_by,true) RETURNING id INTO result;
 END IF; RETURN result;
END $$;
CREATE FUNCTION cmd.publish_policy(p_decision uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE q ops.decisions%ROWTYPE; p core.policy_versions%ROWTYPE; result integer;
BEGIN
 PERFORM cmd.require_staff(ARRAY['supervisor']); SELECT * INTO q FROM ops.decisions WHERE id=p_decision;
 IF q.kind IS DISTINCT FROM 'policy_change' OR q.entity IS DISTINCT FROM 'policy_version' OR q.approved_by IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Sai quyết định chính sách' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO result FROM core.policy_versions WHERE approval_decision_id=q.id; IF result IS NOT NULL THEN RETURN result; END IF;
 p:=jsonb_populate_record(NULL::core.policy_versions,q.detail->'policy'||jsonb_build_object('approval_decision_id',q.id));
 INSERT INTO core.policy_versions SELECT (p).* RETURNING id INTO result; RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.create_manual_instruction(uuid),cmd.publish_policy(uuid) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
