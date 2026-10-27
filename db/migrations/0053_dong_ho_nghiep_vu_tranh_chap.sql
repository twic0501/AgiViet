-- Đồng bộ mốc nghiệp vụ; production không có cmd.test_clock nên vẫn lấy giờ thật.
-- Không sửa timestamp lịch sử, chữ ký/OTP, quyết định, audit hay sổ cái/ngân hàng.
-- Default bảo vệ cả các đường insert nội bộ và command không liệt kê timestamp.
-- status_changed_at/updated_at là dấu kỹ thuật, giữ giờ thật theo hướng dẫn 06.
-- Không dùng các dấu kỹ thuật này để tính cửa sổ 24 giờ hay hạn nghiệp vụ.

ALTER TABLE core.disputes ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.documents ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.acceptance_versions ALTER COLUMN recorded_at SET DEFAULT ref.clock_at();
ALTER TABLE core.acceptance_lines ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.acceptance_revisions ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.dispute_resolutions ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.dispute_withdrawals ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.dispute_goods_withdrawals ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.sealed_samples ALTER COLUMN sealed_at SET DEFAULT ref.clock_at();
ALTER TABLE core.sample_custody_events ALTER COLUMN at SET DEFAULT ref.clock_at();
ALTER TABLE core.inspections ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.inspection_results ALTER COLUMN issued_at SET DEFAULT ref.clock_at();

-- Những bảng có hạn nghiệp vụ cũng phải tạo mốc gốc cùng miền thời gian.
-- Đặc biệt QR có CHECK expires_at > created_at: tua lùi trước giờ thật từng bị chặn.

ALTER TABLE core.qr_tokens ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.deadlines ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.offers ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.offer_rounds ALTER COLUMN created_at SET DEFAULT ref.clock_at();
ALTER TABLE core.holds ALTER COLUMN created_at SET DEFAULT ref.clock_at();

COMMENT ON COLUMN core.documents.created_at IS 'Mốc tạo tài liệu nghiệp vụ theo ref.clock_at(); chữ ký/OTP và audit vẫn theo giờ thật.';
COMMENT ON COLUMN core.disputes.created_at IS 'Mốc mở tranh chấp theo ref.clock_at(), gốc cửa sổ chia lại 24 giờ.';
COMMENT ON COLUMN core.dispute_withdrawals.created_at IS 'Mốc rút tranh chấp theo ref.clock_at(); audit giữ giờ thật.';
COMMENT ON COLUMN core.acceptance_revisions.created_at IS 'Mốc lập bản chia lại theo ref.clock_at().';

CREATE OR REPLACE FUNCTION cmd.open_dispute(p_line uuid,p_qty bigint,p_reason text,p_claim text DEFAULT 'quality') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO l FROM core.acceptance_lines WHERE id=p_line;
 SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.party_order(d.order_id,ARRAY['owner','purchaser','warehouse','site_receiver','coop_board','collection_staff']);
 IF l.status IS DISTINCT FROM 'proposed' OR d.status NOT IN ('checking','awaiting_seller','disputed') OR p_qty IS NULL OR p_qty<=0 OR p_qty IS DISTINCT FROM l.qty OR p_claim IS NULL OR p_claim NOT IN ('quality','shortfall') OR coalesce(length(btrim(p_reason)),0)=0 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) THEN RAISE EXCEPTION 'Dòng/trạng thái tranh chấp không hợp lệ' USING HINT='ck_dispute_scope'; END IF;
 UPDATE core.acceptance_lines SET status='disputed' WHERE id=l.id;
 INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind,created_at) VALUES(l.id,d.order_id,p_qty,ref.ctx_user(),p_reason,p_claim,ref.clock_at()) RETURNING id INTO result;
 IF ref.ctx_actor()='buyer' THEN UPDATE core.disputes SET status='awaiting_seller' WHERE id=result; END IF;
 IF d.status='awaiting_seller' AND ref.ctx_actor()='seller' THEN UPDATE core.deliveries SET status='disputed' WHERE id=d.id; END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION cmd.revise_acceptance_after_objection(p_previous uuid,p_document jsonb,p_lines jsonb,p_evidence uuid) RETURNS uuid
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
 INSERT INTO core.acceptance_revisions VALUES(result,a.id,h,ref.ctx_user(),ref.clock_at());
 INSERT INTO core.acceptance_revision_disputes SELECT result,tc.id FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id WHERE al.acceptance_id=a.id AND tc.status='open';
 PERFORM set_config('app.reason','Bên mua chia lại các dòng bị người bán phản đối',true);
 UPDATE core.disputes SET status='awaiting_seller' WHERE id IN (SELECT dispute_id FROM core.acceptance_revision_disputes WHERE acceptance_id=result);
 UPDATE core.deliveries SET status='checking' WHERE id=d.id;
 PERFORM evt.emit('delivery',d.id,'acceptance.revised_after_objection',jsonb_build_object('acceptance_id',result,'previous_id',a.id),ARRAY['notify']);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION cmd.revise_acceptance_after_withdrawal(p_dispute uuid,p_record uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; l core.acceptance_lines%ROWTYPE; result uuid; doc uuid; n smallint:=0;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE; o:=cmd.order_party(tc.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 SELECT acceptance_id INTO result FROM core.dispute_goods_withdrawals WHERE dispute_id=tc.id;
 IF result IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM core.dispute_goods_withdrawals w JOIN core.acceptance_versions av ON av.id=w.acceptance_id JOIN core.documents dd ON dd.id=av.document_id WHERE w.dispute_id=tc.id AND w.record_id=p_record AND dd.content_sha256=(p_document->>'content_sha256')::bytea) THEN RAISE EXCEPTION 'Rút hàng khác bản đã ghi' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN result; END IF;
 SELECT av.* INTO a FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE al.id=tc.line_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 IF tc.status NOT IN ('open','awaiting_seller') OR d.status<>'disputed' OR d.receiver_user_id IS DISTINCT FROM ref.ctx_user() OR tc.disputed_qty>=a.weighed_qty
 OR EXISTS(SELECT 1 FROM core.disputes other JOIN core.acceptance_lines al ON al.id=other.line_id JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE av.delivery_id=d.id AND other.id<>tc.id AND other.status<>'resolved')
 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_record AND doc_type='return_record' AND order_id=o.id AND entity='dispute' AND entity_id=tc.id AND canonical_content=jsonb_build_object('action','withdraw_disputed_goods','dispute_id',tc.id,'acceptance_id',a.id,'qty',tc.disputed_qty))
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=p_record AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=p_record AND party='seller') THEN RAISE EXCEPTION 'Cần biên bản rút hàng hai bên đã ký đúng bản hiện hành' USING HINT='ck_dispute_scope'; END IF;
 doc:=cmd.attach_document(o.id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by)
 VALUES(d.id,a.version_no+1,a.id,a.weighed_qty-tc.disputed_qty,doc,ref.ctx_user()) RETURNING id INTO result;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id AND id<>tc.line_id ORDER BY line_no LOOP
 n:=n+1;
 INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,order_line_no,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements)
 VALUES(result,n,l.lot_id,l.order_line_no,l.kind,l.qty,l.payable_qty,l.unit_price_vnd,l.value_vnd,l.reason_code,l.evidence_document_id,l.measurements);
 END LOOP;
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 SELECT lot_id,'in_transit','returned_pending','reject',tc.disputed_qty,o.id,d.id,'dispute-withdraw:'||tc.id FROM core.acceptance_lines WHERE id=tc.line_id;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=tc.line_id;
 UPDATE core.disputes SET status='resolved' WHERE id=tc.id;
 PERFORM set_config('app.reason','Hai bên ký rút phần tranh chấp, gửi bản nghiệm thu mới',true);
 UPDATE core.deliveries SET status='checking',planned_qty=planned_qty-tc.disputed_qty WHERE id=d.id;
 UPDATE core.deadlines SET status='met' WHERE entity='dispute' AND entity_id=tc.id AND status='open';
 INSERT INTO core.dispute_goods_withdrawals VALUES(tc.id,p_record,result,tc.disputed_qty,ref.ctx_user(),ref.clock_at()); RETURN result;
END $$;
-- Gói được đăng ký/kích hoạt theo clock nghiệp vụ (0049); cap phải kiểm cùng clock.
CREATE OR REPLACE FUNCTION core.guard_member_cap() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE cap integer; n integer; is_buyer boolean;
BEGIN
 SELECT can_buy INTO is_buyer FROM core.organizations WHERE id=NEW.org_id FOR UPDATE;
 IF NOT is_buyer OR NEW.status NOT IN ('invited','active') THEN RETURN NEW; END IF;
 SELECT p.max_members INTO cap FROM core.subscriptions s JOIN ref.plans p ON p.code=s.plan_code WHERE s.org_id=NEW.org_id AND s.active_during@>ref.clock_at();
 SELECT count(*) INTO n FROM core.memberships WHERE org_id=NEW.org_id AND status IN ('invited','active') AND id<>NEW.id;
 IF n>=coalesce(cap,1) THEN RAISE EXCEPTION 'Gói hết số thành viên' USING HINT='GOI_HET_THANH_VIEN'; END IF; RETURN NEW; END $$;
-- CREATE OR REPLACE giữ nguyên owner/ACL và SECURITY DEFINER của command.
REVOKE ALL ON FUNCTION cmd.open_dispute(uuid,bigint,text,text),
 cmd.revise_acceptance_after_objection(uuid,jsonb,jsonb,uuid),
 cmd.revise_acceptance_after_withdrawal(uuid,uuid,jsonb) FROM PUBLIC;
