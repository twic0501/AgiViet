-- Cơ sở phí Q06 tách khỏi cơ sở cọc sau đổi giá, giữ nguyên cấu trúc snapshot hợp đồng.
CREATE TABLE core.order_version_fee_bases(
 order_id uuid NOT NULL,version_no integer NOT NULL,basis_vnd bigint NOT NULL CHECK(basis_vnd>=0),
 PRIMARY KEY(order_id,version_no),FOREIGN KEY(order_id,version_no) REFERENCES core.order_versions(order_id,version_no) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE core.order_version_fee_bases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.order_version_fee_bases FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
COMMENT ON TABLE core.order_version_fee_bases IS 'Cơ sở phí độc lập của phụ lục Q06, tạo nguyên tử với phiên bản và bất biến.';
COMMENT ON COLUMN core.order_version_fee_bases.order_id IS 'Đơn có phụ lục; không đổi snapshot đã ký.';
COMMENT ON COLUMN core.order_version_fee_bases.version_no IS 'Phiên bản phụ lục, FK kiểm ở COMMIT.';
COMMENT ON COLUMN core.order_version_fee_bases.basis_vnd IS 'Đổi giá giữ cơ sở phí; đổi lượng phân tỷ lệ cơ sở phí trước và áp sàn/trần.';
CREATE FUNCTION core.order_fee_basis(p_order uuid,p_version integer,p_default bigint) RETURNS bigint
LANGUAGE sql VOLATILE SET search_path=pg_catalog,core AS $$
 SELECT coalesce((SELECT basis_vnd FROM core.order_version_fee_bases WHERE order_id=p_order AND version_no=p_version),p_default)
$$;
ALTER TABLE core.order_versions DROP CONSTRAINT ck_ov_fee;
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_fee CHECK(fee_rule IN ('standard','group_allocated','period') AND fee_vnd>=0
 AND (fee_rule<>'standard' OR fee_vnd=CASE WHEN fee_bps=0 THEN 0 ELSE least(coalesce(fee_cap_vnd,9223372036854775807),greatest(coalesce(fee_floor_vnd,0),ref.div_round(fee_bps::numeric*core.order_fee_basis(order_id,version_no,deposit_basis_vnd),10000))) END));
CREATE FUNCTION core.guard_fee_basis() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,core,ref AS $$
DECLARE prev core.order_versions%ROWTYPE; am core.amendments%ROWTYPE; basis bigint;
BEGIN
 SELECT * INTO prev FROM core.order_versions WHERE order_id=NEW.order_id AND version_no=NEW.version_no-1;
 SELECT * INTO am FROM core.amendments WHERE id=NEW.amendment_id AND order_id=NEW.order_id;
 IF prev.order_id IS NULL OR am.id IS NULL THEN RETURN NEW; END IF;
 basis:=core.order_fee_basis(prev.order_id,prev.version_no,prev.deposit_basis_vnd);
 IF am.kind IN ('increase_qty','decrease_qty','force_majeure_reduction') THEN basis:=ref.div_round(basis::numeric*NEW.qty_min,prev.qty_min); END IF;
 INSERT INTO core.order_version_fee_bases VALUES(NEW.order_id,NEW.version_no,basis);
 RETURN NEW;
END $$;
CREATE TRIGGER a_fee_basis BEFORE INSERT ON core.order_versions FOR EACH ROW EXECUTE FUNCTION core.guard_fee_basis();
REVOKE ALL ON FUNCTION core.guard_fee_basis(),core.order_fee_basis(uuid,integer,bigint) FROM PUBLIC;
-- Q06: giữ phí khi chỉ đổi giá; hoàn chênh cọc, không nới guard hoàn phí.
CREATE OR REPLACE FUNCTION cmd.answer_amendment(p_amendment uuid,p_action text,p_document jsonb DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; d core.documents%ROWTYPE; doc uuid; q bigint; price bigint; pc bigint; val bigint; basis bigint; c bigint; f bigint; fb bigint; so integer; patch jsonb;
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
 fb:=core.order_fee_basis(v.order_id,v.version_no,v.deposit_basis_vnd);
 IF a.kind IN ('increase_qty','decrease_qty','force_majeure_reduction') THEN fb:=ref.div_round(fb::numeric*q,v.qty_min); END IF;
 f:=CASE WHEN v.fee_bps=0 THEN 0 ELSE least(coalesce(v.fee_cap_vnd,9223372036854775807),greatest(coalesce(v.fee_floor_vnd,0),ref.div_round(v.fee_bps::numeric*fb,10000))) END;
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
CREATE OR REPLACE FUNCTION cmd.refund_deposit_reduction(p_order uuid,p_version integer) RETURNS uuid
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
 INSERT INTO core.deposit_adjustments(deposit_id,order_version_no,delta_deposit_vnd,delta_fee_vnd) VALUES(d.id,p_version,v.deposit_vnd-prev.deposit_vnd,CASE WHEN EXISTS(SELECT 1 FROM core.amendments WHERE id=v.amendment_id AND kind IN ('decrease_qty','force_majeure_reduction')) THEN v.fee_vnd-prev.fee_vnd ELSE 0 END) RETURNING id INTO result;
 PERFORM cmd.refund_sources(p_order,'deposit_adjustment',result,'refund_deposit_to_buyer',prev.deposit_vnd-v.deposit_vnd);
 IF prev.fee_vnd>v.fee_vnd AND EXISTS(SELECT 1 FROM core.amendments WHERE id=v.amendment_id AND kind IN ('decrease_qty','force_majeure_reduction')) THEN PERFORM cmd.refund_sources(p_order,'fee_refund',result,'refund_fee',prev.fee_vnd-v.fee_vnd); END IF;
 PERFORM cmd.refresh_deposit(d.id); RETURN result;
END $$;

-- Mã mới 14 ký tự, chữ số kiểm MOD 97; không đổi mã đã phát hành.
CREATE SEQUENCE core.topup_reference_seq MAXVALUE 9999999999 NO CYCLE;
CREATE FUNCTION core.assign_topup_reference() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,core AS $$
DECLARE n bigint; body text;
BEGIN
 IF NEW.delta_deposit_vnd>0 OR NEW.delta_fee_vnd>0 THEN
 LOOP
 n:=nextval('core.topup_reference_seq'); body:=lpad(n::text,10,'0');
 NEW.payment_ref:='TP'||body||lpad((98-(n::numeric*100)%97)::text,2,'0');
 EXIT WHEN NOT EXISTS(SELECT 1 FROM core.deposits WHERE payment_ref=NEW.payment_ref)
 AND NOT EXISTS(SELECT 1 FROM core.deposit_adjustments WHERE payment_ref=NEW.payment_ref);
 END LOOP;
 END IF;
 RETURN NEW;
END $$;
-- Cho phép bổ sung chỉ phí (sàn cọc có thể khiến delta cọc bằng 0).
ALTER TABLE core.deposit_adjustments DROP CONSTRAINT ck_dep_adj_ref;
ALTER TABLE core.deposit_adjustments ADD CONSTRAINT ck_dep_adj_ref CHECK
 ((delta_deposit_vnd>0 OR delta_fee_vnd>0)=(payment_ref IS NOT NULL));
CREATE TRIGGER a_topup_reference BEFORE INSERT ON core.deposit_adjustments
 FOR EACH ROW EXECUTE FUNCTION core.assign_topup_reference();
REVOKE ALL ON SEQUENCE core.topup_reference_seq FROM PUBLIC,agiviet_app,agiviet_orchestrator;
REVOKE ALL ON FUNCTION core.assign_topup_reference() FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.prepare_operational_reduction(p_amendment uuid,p_decision uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; d core.documents%ROWTYPE; q ops.decisions%ROWTYPE; qty bigint; val bigint; basis bigint; c bigint; f bigint; fb bigint; doc uuid;
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
 fb:=ref.div_round(core.order_fee_basis(v.order_id,v.version_no,v.deposit_basis_vnd)::numeric*qty,v.qty_min);
 f:=CASE WHEN v.fee_bps=0 THEN 0 ELSE least(coalesce(v.fee_cap_vnd,9223372036854775807),greatest(coalesce(v.fee_floor_vnd,0),ref.div_round(v.fee_bps::numeric*fb,10000))) END;
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
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

