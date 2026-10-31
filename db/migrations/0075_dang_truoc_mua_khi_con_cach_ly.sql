-- Đăng trước mùa (brief D10) khi vườn còn cách ly thuốc.
-- Trước: còn cách ly hôm nay là chặn mọi lô, kể cả lô "sắp có hàng" hái sau ngày hết cách ly.
-- Nay: lô có hàng ngay vẫn chặn như cũ; lô sắp có hàng chỉ cần ngày có hàng VÀ ngày hái (nếu có) không trước ngày hết cách ly.
-- Mốc cách ly vẫn tính ở server từ nhật ký (lấy mốc muộn nhất giữa nhật ký và client khai).
CREATE OR REPLACE FUNCTION cmd.assert_lot_verified(p_lot uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,core,cmd,ref AS $$
DECLARE l core.lots%ROWTYPE; clear date; today date:=(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 SELECT * INTO l FROM core.lots WHERE id=p_lot;
 -- Khóa cơ sở cùng thứ tự với ghi nhật ký; SERIALIZABLE/retry khi đua publish/spray/revoke.
 PERFORM 1 FROM core.production_sites WHERE id=l.site_id AND org_id=l.seller_org_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM core.seller_product_verifications v JOIN core.seller_product_reviews r ON r.verification_id=v.id
 WHERE v.org_id=l.seller_org_id AND v.site_id=l.site_id AND v.product_id=l.product_id AND v.profile_version=l.profile_version AND v.grade_code=l.grade_code
 AND v.valid_during@>today AND NOT EXISTS(SELECT 1 FROM core.seller_product_revocations WHERE verification_id=v.id)) THEN
 RAISE EXCEPTION 'Mặt hàng/cơ sở/loại chưa xác minh hoặc hết hiệu lực' USING HINT='ck_lot_verified_product'; END IF;
 clear:=greatest(core.site_clear_on(l.site_id),l.spray_clear_on);
 IF clear>l.harvest_on THEN RAISE EXCEPTION 'Ngày hái trước ngày hết cách ly thuốc' USING HINT='ck_lot_withdrawal'; END IF;
 IF l.available_from IS NULL OR l.available_from<=today THEN
  IF clear>today THEN RAISE EXCEPTION 'Nhật ký còn ngày cách ly: chỉ đăng sắp có hàng từ ngày hết cách ly' USING HINT='ck_lot_withdrawal'; END IF;
 ELSIF clear>l.available_from THEN
  RAISE EXCEPTION 'Ngày có hàng trước ngày hết cách ly thuốc' USING HINT='ck_lot_withdrawal';
 END IF;
 UPDATE core.lots SET spray_clear_on=clear,is_substandard=(SELECT is_substandard FROM core.product_grades WHERE product_id=l.product_id AND profile_version=l.profile_version AND grade_code=l.grade_code) WHERE id=l.id;
END $$;
