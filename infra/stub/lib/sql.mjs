// Các câu SQL nóng của backend GIẢ LẬP. Hình dạng câu truy vấn bám đặc tả nghiệp vụ
// (ghép giấu giá, giá tham khảo K09/Q18, sổ cái kép, webhook chống lặp) nhưng chạy trên schema bench.

// Ghép cung–cầu cho một phiếu nhu cầu: cùng mặt hàng, loại đạt yêu cầu, giá sàn kín <= giá trần kín
// (không trả giá nào ra ngoài), ngày hái trong cửa sổ, còn lượng khả dụng, trong bán kính ~150 km.
export const MATCH = `
SELECT l.code, l.grade, qb.qty_g AS available_g, l.harvest_on, l.province_code,
       round(x.dist_km::numeric, 1) AS dist_km,
       round((100 - x.dist_km*0.3 - abs(l.harvest_on - d.need_from)*2
              + CASE WHEN l.grade = 1 THEN 10 ELSE 0 END
              + least(qb.qty_g::numeric / d.qty_g, 1) * 20)::numeric, 1) AS score
FROM bench.demands d
JOIN bench.lots l
  ON l.commodity_id = d.commodity_id AND l.status = 'open' AND l.grade <= d.min_grade
 AND l.floor_price_vnd_per_kg <= d.max_price_vnd_per_kg
 AND l.harvest_on BETWEEN d.need_from - 7 AND d.need_to
 AND l.lat BETWEEN d.lat - 1.4 AND d.lat + 1.4 AND l.lng BETWEEN d.lng - 1.4 AND d.lng + 1.4
JOIN bench.qty_balances qb ON qb.lot_id = l.id AND qb.bucket = 'available' AND qb.qty_g >= least(d.qty_g / 10, 1000000)
CROSS JOIN LATERAL (SELECT 6371 * 2 * asin(sqrt(power(sin(radians(l.lat - d.lat) / 2), 2)
        + cos(radians(d.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - d.lng) / 2), 2))) AS dist_km) x
WHERE d.id = $1
ORDER BY score DESC
LIMIT 20`;

// Giá tham khảo tính trực tiếp (K09, Q18): trung vị đơn đã nghiệm thu 30 ngày, loại trừ giá bất thường,
// cặp bị đánh dấu, đơn ngoài app; cần >= 3 đơn từ >= 2 cặp.
export const REF_PRICE_LIVE = `
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY unit_price_vnd_per_kg)::bigint AS median_vnd_per_kg,
       count(*)::int AS n_orders,
       count(DISTINCT (seller_org_id, buyer_org_id))::int AS n_pairs
FROM bench.orders
WHERE commodity_id = $1 AND grade = $2 AND status = 'completed'
  AND accepted_at >= now() - interval '30 days'
  AND NOT price_abnormal AND NOT pair_flagged AND NOT off_app
  AND ($3::smallint IS NULL OR province_code = $3)`;

// Giá tham khảo đọc từ materialized view (toi-uu.sql), làm mới theo lịch.
export const REF_PRICE_MV = `
SELECT median_vnd_per_kg, n_orders, n_pairs, refreshed_at
FROM bench.mkt_ref_price
WHERE commodity_id = $1 AND grade = $2 AND province_code IS NOT DISTINCT FROM $3::smallint`;

export const LOTS_KEYSET = `
SELECT l.code, l.commodity_id, l.grade, l.province_code, l.harvest_on, l.created_at, l.photo_count, l.id
FROM bench.lots l
WHERE l.status = 'open' AND l.commodity_id = $1 AND ($2::smallint IS NULL OR l.province_code = $2)
  AND ($3::timestamptz IS NULL OR (l.created_at, l.id) < ($3, $4::uuid))
ORDER BY l.created_at DESC, l.id DESC
LIMIT 20`;

export const LOTS_OFFSET = `
SELECT l.code, l.commodity_id, l.grade, l.province_code, l.harvest_on, l.created_at, l.photo_count, l.id
FROM bench.lots l
WHERE l.status = 'open' AND l.commodity_id = $1 AND ($2::smallint IS NULL OR l.province_code = $2)
ORDER BY l.created_at DESC, l.id DESC
LIMIT 20 OFFSET $3`;
