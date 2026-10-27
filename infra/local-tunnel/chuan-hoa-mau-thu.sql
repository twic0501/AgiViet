-- Chỉ DB mẫu sạch. Tránh snapshot giá có micro giây bị driver JS cắt thành mili giây.
-- Không sửa chứng từ/chữ ký, không sửa dữ liệu đang trình diễn.
BEGIN;
INSERT INTO cmd.test_clock(singleton,at) VALUES(true,'2026-11-02T01:00:00.000Z')
ON CONFLICT(singleton) DO UPDATE SET at=EXCLUDED.at;
REFRESH MATERIALIZED VIEW mkt.reference_prices;
DELETE FROM cmd.test_clock;
COMMIT;
