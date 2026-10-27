-- =====================================================================
-- DỮ LIỆU ẢO CHO ĐO TẢI (schema bench). Không phải du-lieu-ao.json của nhóm nghiệp vụ.
-- Quy mô mặc định (SCALE = 1) tương đương ước lượng năm thứ 2–3 ở ĐBSCL, LỚN HƠN pilot nhiều lần:
--   20.000 người bán, 2.000 bên mua, 300.000 lô (60.000 đang mở), 30.000 nhu cầu,
--   400.000 đơn đã nghiệm thu trong 120 ngày, 1,6 triệu bút toán, 20.000 đợt giao trong ngày,
--   20.000 đơn chờ cọc (để bắn webhook ngân hàng).
-- {{SCALE}} được db-setup.mjs thay bằng hệ số quy mô.
-- Trigger được tắt trong lúc nạp (session_replication_role = replica) rồi tự tính số dư bằng truy vấn gộp.
-- =====================================================================
SET search_path = bench;
SET session_replication_role = replica;
SELECT setseed(0.2549);

CREATE TEMP TABLE base_price (commodity_id smallint PRIMARY KEY, vnd_per_kg bigint);
INSERT INTO base_price VALUES (1,25000),(2,12000),(3,70000),(4,30000),(5,15000),(6,110000),(7,28000),(8,7000);

INSERT INTO orgs (id, kind, name, province_code, lat, lng)
VALUES ('00000000-0000-0000-0000-000000000001','platform','AgiViet (DỮ LIỆU THỬ)',1,10.03,105.78);

INSERT INTO orgs (kind, name, province_code, lat, lng)
SELECT 'seller', 'Người bán thử ' || g, p.code, p.lat + (random()-0.5)*0.4, p.lng + (random()-0.5)*0.4
FROM generate_series(1, 20000*{{SCALE}}) g
JOIN provinces p ON p.code = 1 + (g % 13);

INSERT INTO orgs (kind, name, province_code, lat, lng)
SELECT 'buyer', 'Bên mua thử ' || g, p.code, p.lat + (random()-0.5)*0.2, p.lng + (random()-0.5)*0.2
FROM generate_series(1, 2000*{{SCALE}}) g
JOIN provinces p ON p.code = 1 + (g % 14);

CREATE TEMP TABLE s AS SELECT row_number() OVER (ORDER BY id) AS n, id, province_code, lat, lng FROM orgs WHERE kind='seller';
CREATE TEMP TABLE b AS SELECT row_number() OVER (ORDER BY id) AS n, id, province_code, lat, lng FROM orgs WHERE kind='buyer';
CREATE INDEX ON s(n); CREATE INDEX ON b(n);
ANALYZE s; ANALYZE b;

-- Lô
INSERT INTO lots (code, seller_org_id, commodity_id, grade, qty_total_g, floor_price_vnd_per_kg,
                  province_code, lat, lng, harvest_on, status, photo_count, created_at)
SELECT 'LO-' || lpad(g::text, 7, '0'), s.id, c, 1 + floor(random()*2)::int,
       (500 + floor(random()*19500))::bigint * 1000,
       (bp.vnd_per_kg * (0.8 + random()*0.3))::bigint,
       s.province_code, s.lat, s.lng,
       current_date + (floor(random()*150) - 120)::int,
       CASE WHEN r < 0.20 THEN 'open' WHEN r < 0.25 THEN 'reserved' WHEN r < 0.30 THEN 'cancelled' ELSE 'closed' END,
       floor(random()*6)::int,
       now() - (random() * interval '120 days')
FROM (SELECT g, 1 + floor(random()*8)::smallint AS c, random() AS r,
             1 + floor(random()*(20000*{{SCALE}}))::bigint AS sn
      FROM generate_series(1, 300000*{{SCALE}}) g) x
JOIN s ON s.n = x.sn
JOIN base_price bp ON bp.commodity_id = x.c;
-- Lô đang mở có ngày hái sắp tới
UPDATE lots SET harvest_on = current_date + floor(random()*30)::int WHERE status IN ('open','reserved');

-- Sổ lượng cho lô đang mở / đang giữ
INSERT INTO qty_movements (lot_id, from_bucket, to_bucket, qty_g, idem_key)
SELECT id, NULL, 'available', qty_total_g, 'seed-declare-' || id FROM lots WHERE status IN ('open','reserved');
INSERT INTO qty_balances (lot_id, bucket, qty_g)
SELECT id, 'available', qty_total_g FROM lots WHERE status IN ('open','reserved');

-- Nhu cầu
INSERT INTO demands (buyer_org_id, commodity_id, min_grade, qty_g, need_from, need_to, province_code, lat, lng,
                     max_price_vnd_per_kg, status, created_at)
SELECT b.id, c, 1 + floor(random()*2)::int, (1000 + floor(random()*49000))::bigint * 1000,
       current_date + d0, current_date + d0 + 7 + floor(random()*14)::int,
       b.province_code, b.lat, b.lng, (bp.vnd_per_kg * (0.95 + random()*0.3))::bigint,
       CASE WHEN random() < 0.3 THEN 'open' ELSE 'closed' END, now() - random()*interval '60 days'
FROM (SELECT g, 1 + floor(random()*8)::smallint AS c, floor(random()*20)::int AS d0,
             1 + floor(random()*(2000*{{SCALE}}))::bigint AS bn FROM generate_series(1, 30000*{{SCALE}}) g) x
JOIN b ON b.n = x.bn
JOIN base_price bp ON bp.commodity_id = x.c;

-- Đơn đã nghiệm thu chốt trong 120 ngày (nguồn của giá tham khảo).
-- Bên mua phân bố lệch: 20 bên mua lớn chiếm ~40% đơn (giống thực tế vài nhà máy, vài DN xuất khẩu).
INSERT INTO orders (code, lot_id, seller_org_id, buyer_org_id, commodity_id, grade, province_code, qty_g,
                    unit_price_vnd_per_kg, deposit_vnd, fee_vnd, status, deposit_status,
                    price_abnormal, pair_flagged, off_app, accepted_at, created_at)
SELECT 'DH-' || lpad(g::text, 8, '0'), l.id, l.seller_org_id, b.id, l.commodity_id, l.grade, l.province_code, q,
       pr, (q/1000 * pr * 3 / 10), greatest(50000, q/1000 * pr / 100),
       'completed', 'reconciled',
       random() < 0.03, random() < 0.02, random() < 0.05,
       acc, acc - interval '3 days'
FROM (SELECT g,
             1 + floor(random()*(300000*{{SCALE}}))::bigint AS ln,
             CASE WHEN random() < 0.4 THEN 1 + floor(random()*20)::bigint
                  ELSE 1 + floor(random()*(2000*{{SCALE}}))::bigint END AS bn,
             (200 + floor(random()*9800))::bigint * 1000 AS q,
             now() - random()*interval '120 days' AS acc,
             random() AS noise
      FROM generate_series(1, 400000*{{SCALE}}) g) x
JOIN LATERAL (SELECT * FROM lots WHERE code = 'LO-' || lpad(x.ln::text, 7, '0')) l ON true
JOIN b ON b.n = x.bn
JOIN base_price bp ON bp.commodity_id = l.commodity_id
CROSS JOIN LATERAL (SELECT (bp.vnd_per_kg * (1.15 - 0.15*l.grade) * (0.85 + x.noise*0.3))::bigint AS pr) p;

-- Đơn chờ cọc (để bắn webhook): lệnh cọc đã gửi, chờ ngân hàng xác nhận.
INSERT INTO orders (code, lot_id, seller_org_id, buyer_org_id, commodity_id, grade, province_code, qty_g,
                    unit_price_vnd_per_kg, deposit_vnd, fee_vnd, status, deposit_status, created_at)
SELECT 'DC-' || lpad(g::text, 8, '0'), l.id, l.seller_org_id, b.id, l.commodity_id, l.grade, l.province_code,
       2000000, 25000, 15000000, 500000, 'awaiting_deposit', 'sent', now() - interval '1 hour'
FROM generate_series(1, 20000*{{SCALE}}) g
JOIN LATERAL (SELECT * FROM lots WHERE code = 'LO-' || lpad((1 + (g*7) % (300000*{{SCALE}}))::text, 7, '0')) l ON true
JOIN b ON b.n = CASE WHEN g % 5 = 0 THEN 1 ELSE 1 + (g % (2000*{{SCALE}})) END;

-- Đơn đang giao hôm nay + đợt giao có QR động, 30 kho/điểm gom
INSERT INTO orders (code, lot_id, seller_org_id, buyer_org_id, commodity_id, grade, province_code, qty_g,
                    unit_price_vnd_per_kg, deposit_vnd, fee_vnd, status, deposit_status, created_at)
SELECT 'DG-' || lpad(g::text, 8, '0'), l.id, l.seller_org_id, b.id, l.commodity_id, l.grade, l.province_code,
       3000000, 25000, 22500000, 750000, 'delivering', 'reconciled', now() - interval '2 days'
FROM generate_series(1, 20000*{{SCALE}}) g
JOIN LATERAL (SELECT * FROM lots WHERE code = 'LO-' || lpad((1 + (g*13) % (300000*{{SCALE}}))::text, 7, '0')) l ON true
JOIN b ON b.n = 1 + (g % (2000*{{SCALE}}));
INSERT INTO deliveries (order_id, warehouse_id, otp6, window_during)
SELECT id, 1 + (abs(hashtext(code)) % 30), lpad((abs(hashtext(code || 'otp')) % 1000000)::text, 6, '0'),
       tstzrange(date_trunc('day', now()), date_trunc('day', now()) + interval '1 day')
FROM orders WHERE status = 'delivering';

-- Sổ cái cho đơn đã có cọc: giao dịch cọc (2 dòng) + giao dịch phí (2 dòng)
INSERT INTO ledger_accounts (account_type, org_id, order_id)
SELECT 'external', id, NULL FROM orgs WHERE kind IN ('buyer','seller');
INSERT INTO ledger_accounts (account_type, org_id, order_id) VALUES ('platform_revenue', NULL, NULL), ('suspense', NULL, NULL);
INSERT INTO ledger_accounts (account_type, org_id, order_id)
SELECT t, NULL, o.id FROM orders o CROSS JOIN (VALUES ('deposit_escrow'),('fee_held')) v(t)
WHERE o.deposit_status = 'reconciled';

INSERT INTO ledger_txns (kind, order_id, idempotency_key, memo, posted_at)
SELECT k, o.id, k || ':' || o.id, 'seed', o.created_at
FROM orders o CROSS JOIN (VALUES ('deposit_in'),('fee_in')) v(k) WHERE o.deposit_status = 'reconciled';

INSERT INTO ledger_entries (transaction_id, line_no, account_id, amount_vnd)
SELECT t.id, 1, ext.id, -(CASE t.kind WHEN 'deposit_in' THEN o.deposit_vnd ELSE o.fee_vnd END)
FROM ledger_txns t JOIN orders o ON o.id = t.order_id
JOIN ledger_accounts ext ON ext.account_type = 'external' AND ext.org_id = o.buyer_org_id
UNION ALL
SELECT t.id, 2, acc.id, (CASE t.kind WHEN 'deposit_in' THEN o.deposit_vnd ELSE o.fee_vnd END)
FROM ledger_txns t JOIN orders o ON o.id = t.order_id
JOIN ledger_accounts acc ON acc.order_id = o.id
 AND acc.account_type = CASE t.kind WHEN 'deposit_in' THEN 'deposit_escrow' ELSE 'fee_held' END;

INSERT INTO ledger_balances (account_id, balance_vnd, entry_count)
SELECT account_id, sum(amount_vnd), count(*) FROM ledger_entries GROUP BY account_id;

SET session_replication_role = origin;
