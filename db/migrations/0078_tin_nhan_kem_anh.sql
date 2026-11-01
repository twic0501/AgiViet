-- Tin nhắn kèm ảnh (ảnh hàng, giấy tờ…). Backend đọc chữ trong ảnh (AI) + quét liên lạc TRƯỚC khi gọi lệnh:
-- ảnh có số điện thoại / Zalo / STK / mã QR / chụp màn hình app nhắn tin trước khi ngân hàng nhận cọc thì không gửi.
ALTER TABLE core.chat_messages ADD COLUMN attachment_document_id uuid REFERENCES core.documents;
COMMENT ON COLUMN core.chat_messages.attachment_document_id IS 'Ảnh đính kèm (đã qua quét liên lạc); tệp thuộc tổ chức người gửi';

DROP FUNCTION cmd.send_message(uuid,uuid,text,boolean,text[]);
CREATE FUNCTION cmd.send_message(p_offer uuid, p_order uuid, p_body text, p_had_contact boolean, p_kinds text[], p_attachment uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE b uuid; s uuid; me uuid; result uuid;
BEGIN
 PERFORM cmd.enter_actor();
 IF p_order IS NOT NULL THEN SELECT buyer_org_id, seller_org_id INTO b, s FROM core.orders WHERE id=p_order;
 ELSE SELECT buyer_org_id, seller_org_id INTO b, s FROM core.offers WHERE id=p_offer; END IF;
 IF b IS NULL THEN RAISE EXCEPTION 'Không thấy cuộc trao đổi' USING HINT='KHONG_TIM_THAY'; END IF;
 me := ref.ctx_org();
 IF me NOT IN (b, s) THEN RAISE EXCEPTION 'Không thuộc cuộc trao đổi' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.require_org(me, ARRAY['owner','coop_board','accountant','collection_staff','purchaser','warehouse','site_receiver']);
 IF p_attachment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_attachment AND owner_org_id=me AND mime_type LIKE 'image/%') THEN
  RAISE EXCEPTION 'Ảnh không thuộc người gửi' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO core.chat_messages(offer_id, order_id, buyer_org_id, seller_org_id, sender_org_id, sender_user_id, body, had_contact, contact_kinds, attachment_document_id, created_at)
 VALUES(p_offer, p_order, b, s, me, ref.ctx_user(), btrim(p_body), coalesce(p_had_contact,false), coalesce(p_kinds,'{}'), p_attachment, ref.clock_at()) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION cmd.send_message(uuid,uuid,text,boolean,text[],uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.send_message(uuid,uuid,text,boolean,text[],uuid) TO agiviet_app;
