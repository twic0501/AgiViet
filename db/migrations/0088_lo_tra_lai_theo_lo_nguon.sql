-- 0088: Sửa theo bản rà Codex 02/11 (lỗi nặng 5). Buổi gọi hàng khung nhiều lô có orders.lot_id NULL:
-- người bán đồng ý kết quả có hàng trả lại tại vườn → tạo lô con theo o.lot_id (NULL) → lỗi, cả lệnh bị hủy.
-- Nay có bản lệnh nhận thêm lô nguồn: lô phải thuộc dòng món của đơn; mỗi lô nguồn tạo một lô con riêng.
CREATE OR REPLACE FUNCTION cmd.create_return_lot(p_order uuid,p_qty bigint,p_grade text,p_code text,p_lot uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; l core.lots%ROWTYPE; result uuid; nguon uuid;
BEGIN
 o:=cmd.order_party(p_order,'seller',ARRAY['owner','coop_board','collection_staff']);
 nguon:=coalesce(p_lot,o.lot_id);
 IF o.lot_id IS NULL AND NOT EXISTS(SELECT 1 FROM core.order_lines WHERE order_id=o.id AND lot_id=nguon) THEN RAISE EXCEPTION 'Lô nguồn không thuộc đơn' USING HINT='ck_command_payload'; END IF;
 IF o.lot_id IS NOT NULL AND nguon<>o.lot_id THEN RAISE EXCEPTION 'Lô nguồn không thuộc đơn' USING HINT='ck_command_payload'; END IF;
 SELECT * INTO l FROM core.lots WHERE id=nguon FOR UPDATE;
 IF p_qty IS NULL OR p_qty<=0 OR NOT EXISTS(SELECT 1 FROM core.product_grades WHERE product_id=l.product_id AND profile_version=l.profile_version AND grade_code=p_grade) THEN RAISE EXCEPTION 'Lượng/loại lô con không hợp lệ' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.lots(code,seller_org_id,product_id,profile_version,grade_code,site_id,facility_id,parent_lot_id,origin_order_id,qty_basis,declared_qty,is_substandard,created_by)
 VALUES(p_code,l.seller_org_id,l.product_id,l.profile_version,p_grade,l.site_id,l.facility_id,l.id,o.id,'weighed',p_qty,true,ref.ctx_user()) RETURNING id INTO result;
 PERFORM ledger.move_qty(l.id,'returned_pending','moved_to_child','return_to_child',p_qty,o.id,'child-out:'||result,result);
 PERFORM ledger.move_qty(result,'source','available','split_in',p_qty,NULL,'child-in:'||result,l.id);
 UPDATE core.lots SET status='on_sale',last_confirmed_at=ref.clock_at() WHERE id=result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION cmd.create_return_lot(uuid,bigint,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.create_return_lot(uuid,bigint,text,text,uuid) TO agiviet_app;
COMMENT ON FUNCTION cmd.create_return_lot(uuid,bigint,text,text,uuid) IS 'Người bán tạo lô con từ hàng trả lại tại nguồn, theo đúng lô nguồn (buổi gọi hàng nhiều lô, 0088).';
