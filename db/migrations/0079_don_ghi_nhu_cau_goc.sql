-- Lỗi tìm được khi test đổi vai (02/11): cmd.create_order không ghi demand_id → đơn đi từ báo giá vào nhu cầu
-- bỏ qua kiểm giấy tờ bắt buộc của nhu cầu (mã vùng trồng, kiểm kháng sinh…) ở điều kiện sẵn sàng giao.
-- Sửa: trước khi chèn đơn, nếu có lời chào gắn dòng nhu cầu thì điền demand_id từ dòng nhu cầu đó.
CREATE FUNCTION core.don_dien_nhu_cau() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core AS $$
BEGIN
 IF NEW.demand_id IS NULL AND NEW.offer_id IS NOT NULL THEN
  SELECT l.demand_id INTO NEW.demand_id FROM core.offers o JOIN core.demand_lines l ON l.id=o.demand_line_id WHERE o.id=NEW.offer_id;
 END IF;
 RETURN NEW;
END $$;
COMMENT ON FUNCTION core.don_dien_nhu_cau() IS 'Điền nhu cầu gốc cho đơn lập từ báo giá vào nhu cầu (để kiểm giấy tờ bắt buộc khi giao).';
CREATE TRIGGER a_dien_nhu_cau BEFORE INSERT ON core.orders FOR EACH ROW EXECUTE FUNCTION core.don_dien_nhu_cau();

-- Điền bù cho đơn đã có (môi trường thử); nếu bảng đơn có chốt chặn sửa thì bỏ qua, không làm hỏng migration.
DO $$ BEGIN
 UPDATE core.orders o SET demand_id=l.demand_id FROM core.offers f JOIN core.demand_lines l ON l.id=f.demand_line_id
 WHERE o.offer_id=f.id AND o.demand_id IS NULL;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Bỏ qua điền bù demand_id: %', SQLERRM;
END $$;
