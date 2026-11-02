-- 0082: Ngưỡng 70% giá hạ cấp (người sáng lập chốt 02/11/2026, docs/nghiep-vu/nghien-cuu-3-chinh-sach-0211.md).
-- Không đặt sàn cứng. Giá hạ cấp < 70% giá đơn thì người bán phải XÁC NHẬN RIÊNG khi ký đúng phiên bản đó
-- (statement 'low_downgrade_price_ack' trong chữ ký; chữ ký gắn document = PDF của phiên bản → phụ lục đổi giá phải xác nhận lại).
CREATE OR REPLACE FUNCTION core.guard_low_downgrade_ack() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dt text; gia bigint; ha bigint;
BEGIN
 IF NEW.party<>'seller' THEN RETURN NEW; END IF;
 SELECT doc_type INTO dt FROM core.documents WHERE id=NEW.document_id;
 IF dt NOT IN ('contract','annex') THEN RETURN NEW; END IF;
 SELECT unit_price_vnd, downgrade_price_vnd INTO gia, ha FROM core.order_versions WHERE document_id=NEW.document_id LIMIT 1;
 IF ha IS NOT NULL AND gia IS NOT NULL AND ha*10000 < gia*7000 AND NOT ('low_downgrade_price_ack'=ANY(NEW.statements)) THEN
  RAISE EXCEPTION 'Giá hạ cấp % đ/kg thấp hơn 70%% giá đơn % đ/kg: người bán phải xác nhận riêng trước khi ký', ha, gia USING HINT='ck_gia_ha_cap_thap';
 END IF;
 RETURN NEW;
END $$;
COMMENT ON FUNCTION core.guard_low_downgrade_ack() IS 'Chữ ký người bán trên hợp đồng/phụ lục có giá hạ cấp < 70% giá đơn phải kèm statement low_downgrade_price_ack (0082, ngưỡng người sáng lập chốt 02/11/2026).';
CREATE TRIGGER k_ha_cap_thap BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_low_downgrade_ack();
