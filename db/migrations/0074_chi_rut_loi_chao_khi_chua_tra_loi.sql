-- Rà soát Codex 01/11/2026: cmd.reply_offer cho bên gửi rút lời chào cả khi bên kia đã trả giá.
-- Trái mô tả trạng thái (0004: "rut (bên gửi, chưa có trả lời)") và quy trình B3: rút rồi gửi lại sẽ đặt lại giới hạn 2 lượt trả giá.
-- Sửa: chỉ rút khi current_round = 1. Phần còn lại của hàm giữ nguyên như 0048.
CREATE OR REPLACE FUNCTION cmd.reply_offer(p_offer uuid,p_action text,p_price bigint DEFAULT NULL,p_qty bigint DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; side text; low boolean;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 side:=ref.ctx_actor();
 PERFORM cmd.require_org(CASE side WHEN 'buyer' THEN f.buyer_org_id WHEN 'seller' THEN f.seller_org_id END,ARRAY['owner','purchaser','coop_board']);
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.status IS DISTINCT FROM 'sent' OR r.expires_at<=ref.clock_at() THEN RAISE EXCEPTION 'Lời chào không còn mở' USING HINT='ck_command_state'; END IF;
 IF p_action='withdraw' AND side=(CASE f.direction WHEN 'buyer_bid' THEN 'buyer' ELSE 'seller' END) THEN
 -- 0074: chỉ rút khi bên kia CHƯA trả lời (vòng đầu). Đã có trả giá thì phải trả lời/không bán; rút rồi gửi mới sẽ xóa giới hạn 2 lượt.
 IF f.current_round>1 THEN RAISE EXCEPTION 'Bên kia đã trả lời: không rút được, hãy đồng ý, trả giá hoặc từ chối' USING HINT='ck_offer_withdraw_replied'; END IF;
 UPDATE core.offers SET status='withdrawn' WHERE id=f.id;
 ELSIF p_action='reject' AND side<>r.from_side THEN UPDATE core.offers SET status='rejected' WHERE id=f.id;
 ELSIF p_action='counter' AND side<>r.from_side THEN
 IF (CASE side WHEN 'buyer' THEN f.buyer_counters ELSE f.seller_counters END)>=2 THEN RAISE EXCEPTION 'Tối đa hai lượt mỗi bên' USING HINT='ck_offer_counters'; END IF;
 PERFORM 1 FROM core.lots WHERE id=f.lot_id FOR UPDATE;
 SELECT side='buyer' AND p_price<floor_price_vnd INTO low FROM core.lot_price_versions WHERE lot_id=f.lot_id ORDER BY id DESC LIMIT 1;
 INSERT INTO core.offer_rounds(offer_id,round_no,from_side,price_vnd,qty,expires_at,created_by)
 VALUES(f.id,f.current_round+1,side,p_price,p_qty,ref.clock_at()+interval '24 hours',ref.ctx_user());
 UPDATE core.offers SET current_round=current_round+1,buyer_counters=buyer_counters+CASE WHEN side='buyer' THEN 1 ELSE 0 END,seller_counters=seller_counters+CASE WHEN side='seller' THEN 1 ELSE 0 END WHERE id=f.id;
 IF coalesce(low,false) THEN UPDATE core.offers SET status='rejected' WHERE id=f.id; END IF;
 ELSE RAISE EXCEPTION 'Sai bên/hành động lời chào' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deadlines SET status='met' WHERE entity='offer' AND entity_id=f.id AND kind='offer_reply' AND status='open';
 IF p_action='counter' AND NOT coalesce(low,false) THEN INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('offer_reply','offer',f.id,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
END $$;

