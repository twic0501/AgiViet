-- LS-4: reference_prices chỉ tổng hợp giao dịch, không UNION external_prices (0012).
-- Bổ sung xuất xứ cho snapshot ký; không cho số giá ngoài đi vào công thức cọc.
ALTER TABLE core.order_versions ADD COLUMN ref_price_source text NOT NULL DEFAULT 'none';
ALTER TABLE core.order_versions ADD COLUMN ref_price_grade_code text;
ALTER TABLE core.order_versions ADD COLUMN ref_price_as_of timestamptz;
ALTER TABLE core.order_versions ADD COLUMN ref_price_external_id uuid REFERENCES mkt.external_prices(id);
COMMENT ON COLUMN core.order_versions.ref_price_source IS 'none: không có tham khảo; trades: snapshot reference_prices đủ mẫu; external: chỉ hiển thị, P_coc=P.';
COMMENT ON COLUMN core.order_versions.ref_price_grade_code IS 'Loại hàng của snapshot tham khảo; phải khớp lô nếu đơn có lô.';
COMMENT ON COLUMN core.order_versions.ref_price_as_of IS 'Thời điểm snapshot giá giao dịch hoặc ngày quan sát giá ngoài, đóng băng cùng phiên bản ký.';
COMMENT ON COLUMN core.order_versions.ref_price_external_id IS 'Nguồn ngoài có nhãn, chỉ hiển thị; không được dùng tăng cọc.';

CREATE FUNCTION core.guard_deposit_reference_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; grade text; r mkt.reference_prices%ROWTYPE; e mkt.external_prices%ROWTYPE;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 SELECT grade_code INTO grade FROM core.lots WHERE id=o.lot_id;
 IF NEW.ref_price_vnd IS NULL THEN
  IF NEW.ref_price_source<>'none' OR NEW.ref_price_external_id IS NOT NULL
   OR NEW.ref_price_grade_code IS NOT NULL OR NEW.ref_price_as_of IS NOT NULL
   OR NEW.ref_price_order_count IS NOT NULL OR NEW.ref_price_scope IS NOT NULL THEN
   RAISE EXCEPTION 'Không có giá tham khảo nhưng còn xuất xứ' USING HINT='ck_deposit_reference_source'; END IF;
  RETURN NEW;
 END IF;
 NEW.ref_price_grade_code:=coalesce(NEW.ref_price_grade_code,grade);
 IF grade IS NOT NULL AND NEW.ref_price_grade_code IS DISTINCT FROM grade THEN
  RAISE EXCEPTION 'Tham khảo khác loại của lô' USING HINT='ck_deposit_reference_source'; END IF;
 IF NEW.ref_price_source='external' THEN
  SELECT * INTO e FROM mkt.external_prices WHERE id=NEW.ref_price_external_id;
  IF (e.product_id,e.grade_code,e.unit_price_vnd) IS DISTINCT FROM (o.product_id,NEW.ref_price_grade_code,NEW.ref_price_vnd) THEN
   RAISE EXCEPTION 'Giá ngoài không khớp nguồn có nhãn' USING HINT='ck_deposit_reference_source'; END IF;
  NEW.ref_price_order_count:=NULL; NEW.ref_price_scope:=NULL;
  NEW.ref_price_as_of:=e.observed_on::timestamptz;
 ELSIF NEW.ref_price_source IN ('none','trades') THEN
  SELECT * INTO r FROM mkt.reference_prices WHERE product_id=o.product_id AND grade_code=NEW.ref_price_grade_code
   AND scope=coalesce(NEW.ref_price_scope,'DBSCL') AND unit_price_vnd=NEW.ref_price_vnd AND order_count>=3 AND pair_count>=2;
  IF NOT FOUND OR NEW.ref_price_external_id IS NOT NULL
   OR (NEW.ref_price_order_count IS NOT NULL AND NEW.ref_price_order_count<>r.order_count)
   OR (NEW.ref_price_as_of IS NOT NULL AND NEW.ref_price_as_of IS DISTINCT FROM r.as_of) THEN
   RAISE EXCEPTION 'Giá tính cọc phải từ view giao dịch đủ mẫu, đúng hàng, loại, vùng và snapshot' USING HINT='ck_deposit_reference_source'; END IF;
  NEW.ref_price_source:='trades'; NEW.ref_price_scope:=r.scope;
  NEW.ref_price_order_count:=r.order_count; NEW.ref_price_as_of:=r.as_of;
 ELSE
  RAISE EXCEPTION 'Nguồn giá tham khảo không hợp lệ' USING HINT='ck_deposit_reference_source';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_reference_source BEFORE INSERT ON core.order_versions FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_reference_source();
-- Nâng cấp DB đã có: chỉ điền xuất xứ nếu chứng minh được từ view, không đoán nguồn ngoài.
-- UPDATE gọi cùng guard trong migration; nội dung kinh tế cũ không sửa. Không đủ chứng cứ thì rollback migration.
DROP TRIGGER tg_ov_immutable ON core.order_versions;
CREATE TRIGGER migration_reference_source BEFORE UPDATE ON core.order_versions FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_reference_source();
UPDATE core.order_versions SET ref_price_source='none';
DROP TRIGGER migration_reference_source ON core.order_versions;
CREATE TRIGGER tg_ov_immutable BEFORE UPDATE OR DELETE ON core.order_versions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_ref_source CHECK(
 (ref_price_source='none' AND ref_price_vnd IS NULL AND ref_price_external_id IS NULL)
 OR (ref_price_source='trades' AND ref_price_vnd>0 AND ref_price_order_count>=3 AND ref_price_scope IS NOT NULL AND ref_price_grade_code IS NOT NULL AND ref_price_as_of IS NOT NULL AND ref_price_external_id IS NULL)
 OR (ref_price_source='external' AND ref_price_vnd>0 AND ref_price_external_id IS NOT NULL AND ref_price_grade_code IS NOT NULL AND ref_price_as_of IS NOT NULL));
ALTER TABLE core.order_versions DROP CONSTRAINT ck_ov_deposit_price;
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_deposit_price CHECK(
 (ref_price_source='trades' AND deposit_price_vnd=greatest(unit_price_vnd,ceil(ref_price_vnd*0.7)::bigint))
 OR (ref_price_source IN ('none','external') AND deposit_price_vnd=unit_price_vnd));
COMMENT ON MATERIALIZED VIEW mkt.reference_prices IS 'Giá giao dịch rolling median/IQR đủ số đơn/cặp; không lấy giá ngoài. Chỉ snapshot nguồn trades được dùng M09 tính cọc.';
