-- =====================================================================
-- LƯỢC ĐỒ GIẢ LẬP CHO ĐO TẢI (schema "bench") — KHÔNG PHẢI LƯỢC ĐỒ THẬT.
--
-- Lược đồ thật do kỹ sư DB viết ở db/migrations (core, ledger, evt, ...), lúc viết file này
-- mới có 0001, 0002, 0007, 0008 nên chưa dựng được đơn, lô, nhu cầu thật.
-- File này mô phỏng HÌNH DẠNG các bảng nóng để đo tải sớm, có giữ những cơ chế tốn kém của bản thật:
--   * sổ cái kép: bút toán + trigger cập nhật số dư (upsert) + constraint trigger hoãn kiểm tổng = 0
--   * webhook chống lặp UNIQUE (provider, provider_event_id)
--   * khóa chống lặp lệnh (idempotency_keys)
--   * sổ lượng lô: chuyển động + số dư theo ngăn do trigger duy trì
--   * outbox ghi cùng giao dịch
-- Chạy trong database riêng "agiviet_bench" để không đụng database "agiviet" của kỹ sư DB.
-- Chỉ mục ở đây là bộ "tối thiểu" (khóa chính, khóa duy nhất). Chỉ mục tối ưu nằm ở toi-uu.sql
-- để đo trước/sau.
-- =====================================================================
DROP SCHEMA IF EXISTS bench CASCADE;
CREATE SCHEMA bench;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SET search_path = bench;

CREATE TABLE commodities (
  id          smallint PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  name_vi     text NOT NULL,
  max_grade   smallint NOT NULL
);
INSERT INTO commodities VALUES
 (1,'xoai_cat_chu','Xoài cát Chu',3),(2,'chanh_khong_hat','Chanh không hạt',3),
 (3,'sau_rieng','Sầu riêng Ri6/Monthong',3),(4,'buoi_da_xanh','Bưởi da xanh',3),
 (5,'thanh_long','Thanh long',3),(6,'tom_the','Tôm thẻ chân trắng',3),
 (7,'ca_tra','Cá tra nguyên liệu',2),(8,'lua_tuoi','Lúa tươi',2);

-- 13 tỉnh ĐBSCL cũ, tọa độ gần đúng trung tâm (để tính khoảng cách giả lập).
CREATE TABLE provinces (code smallint PRIMARY KEY, name_vi text, lat double precision, lng double precision);
INSERT INTO provinces VALUES
 (1,'Cần Thơ',10.03,105.78),(2,'Đồng Tháp',10.46,105.63),(3,'Tiền Giang',10.36,106.36),
 (4,'Vĩnh Long',10.25,105.97),(5,'Bến Tre',10.24,106.37),(6,'Trà Vinh',9.93,106.34),
 (7,'Sóc Trăng',9.60,105.97),(8,'Hậu Giang',9.78,105.47),(9,'An Giang',10.52,105.13),
 (10,'Kiên Giang',10.01,105.08),(11,'Bạc Liêu',9.29,105.72),(12,'Cà Mau',9.18,105.15),
 (13,'Long An',10.54,106.41),(14,'TP Hồ Chí Minh',10.78,106.70);

CREATE TABLE orgs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('seller','buyer','platform')),
  name          text NOT NULL,
  province_code smallint NOT NULL REFERENCES provinces(code),
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  seller_org_id      uuid NOT NULL REFERENCES orgs(id),
  commodity_id       smallint NOT NULL REFERENCES commodities(id),
  grade              smallint NOT NULL,
  qty_total_g        bigint NOT NULL CHECK (qty_total_g > 0),
  floor_price_vnd_per_kg bigint NOT NULL CHECK (floor_price_vnd_per_kg > 0),  -- giá thấp nhất chịu bán (kín)
  province_code      smallint NOT NULL REFERENCES provinces(code),
  lat                double precision NOT NULL,
  lng                double precision NOT NULL,
  harvest_on         date NOT NULL,
  status             text NOT NULL CHECK (status IN ('draft','open','reserved','closed','cancelled')),
  photo_count        smallint NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  version            int NOT NULL DEFAULT 1
);

-- Sổ lượng (rút gọn từ 0008): chuyển động bất biến + số dư theo ngăn do trigger duy trì.
CREATE TABLE qty_movements (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id      uuid NOT NULL REFERENCES lots(id),
  from_bucket text,
  to_bucket   text NOT NULL,
  qty_g       bigint NOT NULL CHECK (qty_g > 0),
  order_id    uuid,
  idem_key    text NOT NULL UNIQUE,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE qty_balances (
  lot_id  uuid NOT NULL REFERENCES lots(id),
  bucket  text NOT NULL,
  qty_g   bigint NOT NULL CHECK (qty_g >= 0),
  PRIMARY KEY (lot_id, bucket)
);
CREATE FUNCTION apply_qty_move() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.from_bucket IS NOT NULL THEN
    UPDATE bench.qty_balances SET qty_g = qty_g - NEW.qty_g WHERE lot_id = NEW.lot_id AND bucket = NEW.from_bucket;
    IF NOT FOUND THEN RAISE EXCEPTION 'ngăn % của lô % chưa có', NEW.from_bucket, NEW.lot_id; END IF;
  END IF;
  INSERT INTO bench.qty_balances AS b (lot_id, bucket, qty_g) VALUES (NEW.lot_id, NEW.to_bucket, NEW.qty_g)
  ON CONFLICT (lot_id, bucket) DO UPDATE SET qty_g = b.qty_g + EXCLUDED.qty_g;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_qty_move AFTER INSERT ON qty_movements FOR EACH ROW EXECUTE FUNCTION apply_qty_move();

CREATE TABLE demands (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id   uuid NOT NULL REFERENCES orgs(id),
  commodity_id   smallint NOT NULL REFERENCES commodities(id),
  min_grade      smallint NOT NULL,
  qty_g          bigint NOT NULL,
  need_from      date NOT NULL,
  need_to        date NOT NULL,
  province_code  smallint NOT NULL,
  lat            double precision NOT NULL,
  lng            double precision NOT NULL,
  max_price_vnd_per_kg bigint NOT NULL,             -- giá tối đa kín
  status         text NOT NULL CHECK (status IN ('open','matched','closed')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  lot_id             uuid REFERENCES lots(id),
  demand_id          uuid REFERENCES demands(id),
  seller_org_id      uuid NOT NULL REFERENCES orgs(id),
  buyer_org_id       uuid NOT NULL REFERENCES orgs(id),
  commodity_id       smallint NOT NULL,
  grade              smallint NOT NULL,
  province_code      smallint NOT NULL,
  qty_g              bigint NOT NULL,
  unit_price_vnd_per_kg bigint NOT NULL,
  deposit_vnd        bigint NOT NULL,
  fee_vnd            bigint NOT NULL,
  status             text NOT NULL,           -- awaiting_deposit, active, delivering, accepted, completed, cancelled
  deposit_status     text NOT NULL,           -- none, sent, bank_processing, bank_confirmed, reconciled, failed
  price_abnormal     boolean NOT NULL DEFAULT false,
  pair_flagged       boolean NOT NULL DEFAULT false,
  off_app            boolean NOT NULL DEFAULT false,
  accepted_at        timestamptz,             -- thời điểm nghiệm thu chốt (dùng cho giá tham khảo)
  created_at         timestamptz NOT NULL DEFAULT now(),
  version            int NOT NULL DEFAULT 1
);

-- Sổ cái kép (rút gọn từ 0007, giữ đủ các trigger tốn kém).
CREATE TABLE ledger_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type  text NOT NULL,
  org_id        uuid,
  order_id      uuid,
  CONSTRAINT uq_ledger_account UNIQUE NULLS NOT DISTINCT (account_type, org_id, order_id)
);
CREATE TABLE ledger_txns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,
  order_id        uuid,
  idempotency_key text NOT NULL UNIQUE,
  memo            text NOT NULL,
  posted_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ledger_entries (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES ledger_txns(id),
  line_no        smallint NOT NULL,
  account_id     uuid NOT NULL REFERENCES ledger_accounts(id),
  amount_vnd     bigint NOT NULL CHECK (amount_vnd <> 0),
  UNIQUE (transaction_id, line_no)
);
CREATE TABLE ledger_balances (
  account_id  uuid PRIMARY KEY REFERENCES ledger_accounts(id),
  balance_vnd bigint NOT NULL DEFAULT 0,
  entry_count bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION ledger_apply_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO bench.ledger_balances AS b (account_id, balance_vnd, entry_count) VALUES (NEW.account_id, NEW.amount_vnd, 1)
  ON CONFLICT (account_id) DO UPDATE SET balance_vnd = b.balance_vnd + EXCLUDED.balance_vnd,
                                         entry_count = b.entry_count + 1, updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER tg_ledger_apply AFTER INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION ledger_apply_entry();
CREATE FUNCTION ledger_check_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_sum numeric; v_n int;
BEGIN
  SELECT coalesce(sum(amount_vnd),0), count(*) INTO v_sum, v_n FROM bench.ledger_entries WHERE transaction_id = NEW.transaction_id;
  IF v_sum <> 0 OR v_n < 2 THEN RAISE EXCEPTION 'Giao dịch % không cân: %', NEW.transaction_id, v_sum; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER tg_ledger_balanced AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_check_balanced();

CREATE FUNCTION ledger_account_of(p_type text, p_org uuid, p_order uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bench.ledger_accounts WHERE account_type = p_type
     AND org_id IS NOT DISTINCT FROM p_org AND order_id IS NOT DISTINCT FROM p_order;
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

-- Sự kiện vào, chống lặp, outbox.
CREATE TABLE inbound_webhooks (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider           text NOT NULL,
  provider_event_id  text NOT NULL,
  payload            jsonb NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  result             text,
  UNIQUE (provider, provider_event_id)
);
CREATE TABLE idempotency_keys (
  key          text PRIMARY KEY,
  actor        text NOT NULL,
  response     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE outbox (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic        text NOT NULL,
  aggregate_id uuid,
  payload      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  attempts     int NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Giao nhận + QR động.
CREATE TABLE deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id),
  warehouse_id  smallint NOT NULL,
  otp6          text NOT NULL,
  window_during tstzrange NOT NULL,
  status        text NOT NULL DEFAULT 'scheduled',   -- scheduled, arrived, received
  received_at   timestamptz
);
CREATE TABLE qr_scans (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delivery_id  uuid NOT NULL REFERENCES deliveries(id),
  scanned_by   text NOT NULL,
  result       text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);

-- Tài liệu PDF và hàng đợi việc nền.
CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id),
  kind         text NOT NULL,
  version      int NOT NULL,
  sha256       bytea NOT NULL CHECK (length(sha256) = 32),
  storage_key  text NOT NULL,
  bytes        int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, kind, version)
);
CREATE TABLE jobs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind         text NOT NULL,
  payload      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'queued',   -- queued, running, done, failed
  attempts     int NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  started_at   timestamptz,
  done_at      timestamptz,
  result       jsonb
);
CREATE INDEX ix_jobs_ready ON jobs (available_at) WHERE status = 'queued';

CREATE TABLE photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      uuid,
  sha256      bytea NOT NULL,
  bytes       int NOT NULL,
  storage_key text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
