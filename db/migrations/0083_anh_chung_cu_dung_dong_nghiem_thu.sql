-- 0083: Ảnh chứng cứ nghiệm thu giữ ĐÚNG trên từng dòng (phát hiện qua ChatGPT chấm đóng vai vòng 2, 02/11/2026).
-- Trước: cmd.submit_acceptance_internal (0046, đổi tên ở 0050) ghi evidence_document_id = ID biên bản PDF cho MỌI dòng
--  → người bán thấy "có ảnh" nhưng chỉ mở được biên bản; luật 0013 (trả lại vượt mức phải có ảnh) bị vô hiệu vì ô ảnh luôn có giá trị.
-- Nay: dòng có ảnh giữ đúng ID ảnh, sau khi kiểm ảnh thuộc chính đợt giao/đơn này (chống gắn ảnh của đơn khác);
--  dòng không ảnh để trống. Biên bản vẫn ở acceptance_versions.document_id.
CREATE OR REPLACE FUNCTION cmd.submit_acceptance_internal(p_delivery uuid,p_weighed bigint,p_document jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; prev core.acceptance_versions%ROWTYPE; result uuid; doc uuid; x jsonb; n integer:=0; anh uuid;
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
 anh:=NULLIF(x->>'evidence_document_id','')::uuid;
 IF anh IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=anh AND doc_type='evidence' AND ((entity='delivery' AND entity_id=d.id) OR order_id=d.order_id)) THEN
  RAISE EXCEPTION 'Ảnh chứng cứ không thuộc đợt giao này' USING HINT='ck_command_payload'; END IF;
 PERFORM cmd.insert_row('core.acceptance_lines',(x-'evidence_document_id')||jsonb_build_object('acceptance_id',result,'line_no',n,'evidence_document_id',anh),ARRAY['acceptance_id','line_no','lot_id','order_line_no','kind','qty','payable_qty','unit_price_vnd','value_vnd','reason_code','evidence_document_id','measurements','replaces_line_id']);
 END LOOP;
 RETURN result;
END $$;
COMMENT ON FUNCTION cmd.submit_acceptance_internal(uuid,bigint,jsonb,jsonb) IS 'Ghi một phiên bản nghiệm thu + các dòng; ảnh chứng cứ từng dòng là ảnh thật thuộc đợt/đơn (0083), biên bản PDF ở acceptance_versions.document_id.';

-- Luật "trả lại vượt mức phải có ảnh" (0013) trước đây không bao giờ vướng vì ô ảnh luôn chứa ID biên bản.
-- Nay ô ảnh trung thực → chỉ đòi ảnh cho dòng trả lại CHƯA CHỐT (ghi mới/đang tranh chấp); dòng đã chốt hai bên ký ở bản trước
-- (chép sang với status 'closed', vd khi khiếu nại khác mẫu) không bắt lại.
CREATE OR REPLACE FUNCTION core.check_acceptance_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a uuid; rejected numeric; total bigint; bps integer;
BEGIN
 a:=NEW.id; SELECT weighed_qty INTO total FROM core.acceptance_versions WHERE id=a;
 SELECT v.reject_allowance_bps INTO bps FROM core.acceptance_versions av JOIN core.deliveries d ON d.id=av.delivery_id JOIN core.order_versions v ON v.order_id=d.order_id AND v.version_no=d.version_no WHERE av.id=a;
 SELECT coalesce(sum(qty),0) INTO rejected FROM core.acceptance_lines WHERE acceptance_id=a AND kind='rejected';
 IF rejected*10000>total::numeric*bps AND EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a AND kind='rejected' AND status<>'closed' AND evidence_document_id IS NULL) THEN RAISE EXCEPTION 'Trả hàng vượt ngưỡng cần ảnh' USING HINT='ck_acceptance_evidence'; END IF;
 RETURN NULL; END $$;
COMMENT ON FUNCTION core.check_acceptance_evidence() IS 'Trả lại vượt mức cho phép: mọi dòng trả lại chưa chốt phải có ảnh thật (0083).';
