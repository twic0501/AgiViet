-- =====================================================================
-- TỐI ƯU áp lên schema bench (đo trước/sau ở docs/ha-tang/03-toi-uu.md).
-- Các mục ở đây là ĐỀ XUẤT cho lược đồ thật (db/); kỹ sư DB quyết định đưa vào migration nào.
-- Chạy lặp lại được (IF NOT EXISTS / OR REPLACE).
-- =====================================================================
SET search_path = bench;

-- T1. Tra tài khoản sổ cái dùng được chỉ mục.
-- Bản gốc (giống ledger.account_of ở db/migrations/0007) lọc bằng "org_id IS NOT DISTINCT FROM p_org
-- AND order_id IS NOT DISTINCT FROM p_order": trong phép đo này planner không tận dụng tốt B-tree cho các điều kiện NULL-safe,
-- nên mỗi lần gọi là một lượt quét tuần tự cả bảng tài khoản (~0,86 triệu dòng ở dữ liệu ảo, tăng ~2 dòng/đơn).
-- Sửa: rẽ nhánh theo phạm vi để mỗi nhánh là phép bằng có chỉ mục.
CREATE INDEX IF NOT EXISTS ix_ledger_accounts_order ON ledger_accounts (order_id, account_type) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_ledger_accounts_org ON ledger_accounts (org_id, account_type) WHERE order_id IS NULL AND org_id IS NOT NULL;
CREATE OR REPLACE FUNCTION ledger_account_of(p_type text, p_org uuid, p_order uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  IF p_order IS NOT NULL THEN
    SELECT id INTO v_id FROM bench.ledger_accounts
     WHERE order_id = p_order AND account_type = p_type AND org_id IS NOT DISTINCT FROM p_org;
  ELSIF p_org IS NOT NULL THEN
    SELECT id INTO v_id FROM bench.ledger_accounts
     WHERE org_id = p_org AND account_type = p_type AND order_id IS NULL;
  ELSE
    SELECT id INTO v_id FROM bench.ledger_accounts
     WHERE account_type = p_type AND org_id IS NULL AND order_id IS NULL;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO bench.ledger_accounts (account_type, org_id, order_id) VALUES (p_type, p_org, p_order)
    ON CONFLICT ON CONSTRAINT uq_ledger_account DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM bench.ledger_accounts WHERE account_type = p_type
         AND org_id IS NOT DISTINCT FROM p_org AND order_id IS NOT DISTINCT FROM p_order;
    END IF;
  END IF;
  RETURN v_id;
END $$;
-- đối soát theo tài khoản (không nóng, nhưng cần cho câu kiểm số dư và màn sổ cái)
CREATE INDEX IF NOT EXISTS ix_ledger_entries_account ON ledger_entries (account_id);

-- T2. Ghép cung–cầu: chỉ mục từng phần chỉ chứa lô đang mở (~20% bảng), có sẵn cột lọc.
CREATE INDEX IF NOT EXISTS ix_lots_match ON lots (commodity_id, harvest_on)
  INCLUDE (grade, lat, lng, floor_price_vnd_per_kg) WHERE status = 'open';

-- T3. Danh sách lô cho bên mua: phân trang keyset theo (created_at, id), có/không lọc tỉnh.
CREATE INDEX IF NOT EXISTS ix_lots_browse ON lots (commodity_id, created_at DESC, id DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS ix_lots_browse_prov ON lots (commodity_id, province_code, created_at DESC, id DESC) WHERE status = 'open';

-- T4. Giá tham khảo: (a) chỉ mục cho câu tính trực tiếp; (b) materialized view làm mới theo lịch.
CREATE INDEX IF NOT EXISTS ix_orders_refprice ON orders (commodity_id, grade, accepted_at)
  INCLUDE (unit_price_vnd_per_kg, province_code, seller_org_id, buyer_org_id)
  WHERE status = 'completed' AND NOT price_abnormal AND NOT pair_flagged AND NOT off_app;

DROP MATERIALIZED VIEW IF EXISTS mkt_ref_price;
CREATE MATERIALIZED VIEW mkt_ref_price AS
SELECT commodity_id, grade, province_code, coalesce(province_code, -1)::smallint AS province_key,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY unit_price_vnd_per_kg)::bigint AS median_vnd_per_kg,
       count(*)::int AS n_orders,
       count(DISTINCT (seller_org_id, buyer_org_id))::int AS n_pairs,
       now() AS refreshed_at
FROM orders
WHERE status = 'completed' AND accepted_at >= now() - interval '30 days'
  AND NOT price_abnormal AND NOT pair_flagged AND NOT off_app
GROUP BY GROUPING SETS ((commodity_id, grade), (commodity_id, grade, province_code));
-- khóa duy nhất để REFRESH ... CONCURRENTLY (không khóa người đọc khi làm mới)
CREATE UNIQUE INDEX uq_mkt_ref_price ON mkt_ref_price (commodity_id, grade, province_key);
CREATE INDEX ix_mkt_ref_price_lookup ON mkt_ref_price (commodity_id, grade, province_code);

ANALYZE lots; ANALYZE orders; ANALYZE ledger_accounts; ANALYZE mkt_ref_price;
