-- Tin nhắn thật giữa bên mua và người bán, gắn với một lời chào giá hoặc một hợp đồng.
-- Nội dung lưu là bản ĐÃ CHE liên lạc (backend quét số điện thoại, Zalo, STK, link… trước khi gọi lệnh);
-- bản gốc không lưu để hai bên không lách ra ngoài app.
CREATE TABLE core.chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id uuid REFERENCES core.offers, order_id uuid REFERENCES core.orders,
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, seller_org_id uuid NOT NULL REFERENCES core.organizations,
 sender_org_id uuid NOT NULL REFERENCES core.organizations, sender_user_id uuid NOT NULL REFERENCES core.users,
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 1000),
 had_contact boolean NOT NULL DEFAULT false, contact_kinds text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(offer_id IS NOT NULL OR order_id IS NOT NULL),
 CHECK(sender_org_id IN (buyer_org_id, seller_org_id))
);
CREATE INDEX chat_messages_offer_idx ON core.chat_messages(offer_id, created_at);
CREATE INDEX chat_messages_order_idx ON core.chat_messages(order_id, created_at);
CREATE INDEX chat_messages_buyer_idx ON core.chat_messages(buyer_org_id, created_at DESC);
CREATE INDEX chat_messages_seller_idx ON core.chat_messages(seller_org_id, created_at DESC);
ALTER TABLE core.chat_messages ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.chat_messages IS 'Tin nhắn hai bên trong một lời chào giá/hợp đồng; nội dung đã che liên lạc trước khi lưu.';
COMMENT ON COLUMN core.chat_messages.id IS 'Mã';
COMMENT ON COLUMN core.chat_messages.offer_id IS 'Lời chào giá (nếu nhắn trước khi có hợp đồng)';
COMMENT ON COLUMN core.chat_messages.order_id IS 'Hợp đồng (nếu nhắn sau khi lập đơn)';
COMMENT ON COLUMN core.chat_messages.buyer_org_id IS 'Bên mua';
COMMENT ON COLUMN core.chat_messages.seller_org_id IS 'Người bán';
COMMENT ON COLUMN core.chat_messages.sender_org_id IS 'Tổ chức gửi';
COMMENT ON COLUMN core.chat_messages.sender_user_id IS 'Người gửi';
COMMENT ON COLUMN core.chat_messages.body IS 'Nội dung đã che liên lạc';
COMMENT ON COLUMN core.chat_messages.had_contact IS 'Bản gốc có thông tin liên lạc bị che';
COMMENT ON COLUMN core.chat_messages.contact_kinds IS 'Loại liên lạc bị che (so_dien_thoai, zalo, stk, link…)';
COMMENT ON COLUMN core.chat_messages.created_at IS 'Lúc gửi';

CREATE FUNCTION cmd.send_message(p_offer uuid, p_order uuid, p_body text, p_had_contact boolean, p_kinds text[]) RETURNS uuid
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
 INSERT INTO core.chat_messages(offer_id, order_id, buyer_org_id, seller_org_id, sender_org_id, sender_user_id, body, had_contact, contact_kinds, created_at)
 VALUES(p_offer, p_order, b, s, me, ref.ctx_user(), btrim(p_body), coalesce(p_had_contact,false), coalesce(p_kinds,'{}'), ref.clock_at()) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION cmd.send_message(uuid,uuid,text,boolean,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.send_message(uuid,uuid,text,boolean,text[]) TO agiviet_app;

CREATE FUNCTION core.chat_messages_of(p_org uuid) RETURNS SETOF core.chat_messages LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT * FROM core.chat_messages WHERE p_org IN (buyer_org_id, seller_org_id) ORDER BY created_at
$$;
COMMENT ON FUNCTION core.chat_messages_of(uuid) IS 'Tin nhắn mà một tổ chức là bên mua hoặc người bán; backend truyền tổ chức đang thao tác.';
