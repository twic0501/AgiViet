-- =====================================================================
-- 0008 · Sổ lượng lô (inventory ledger) – "sổ lượng một nguồn" (F01)
--
-- Mỗi đơn vị cơ sở (gam, con) của lô nằm đúng một NGĂN:
--   available         khả dụng (chào bán được)
--   held              giữ tạm có hạn sau khi đồng ý giá, trước khi hợp đồng có hiệu lực   [theo đơn]
--   committed         cam kết cho đơn đã có hiệu lực                                        [theo đơn]
--   in_transit        đang giao: đã nghiệm thu/bốc, chưa hoàn tất đợt                       [theo đơn]
--   delivered         đã giao xong (nghiệm thu chốt)                                         [theo đơn]
--   returned_pending  trả lại chờ xử lý (nhận lại, bán gấp tại chỗ, tiêu hủy)               [theo đơn]
--   moved_to_child    đã chuyển sang lô con (tách loại, phần trả lại thành lô loại dưới)
--   loss              hao hụt / loại bỏ / tiêu hủy có biên bản / bán ngoài app
-- Hao hụt ĐƯỜNG (sau điểm nghiệm thu) không đi qua sổ lượng của lô: hàng đã là của bên mua (Q02, Q03);
-- nó được ghi ở core.transit_incidents (0009).
-- và một ngăn nguồn ảo:
--   source            ngoài sổ (khai thêm, cân lại tăng, nhận từ lô cha). Chỉ ngăn này được âm.
--
-- Mỗi chuyển động là MỘT dòng (from_bucket → to_bucket, qty > 0): bút toán kép theo bản chất,
-- tổng các ngăn thật của lô = − số dư ngăn source = lượng lô hiện tại.
-- =====================================================================

CREATE TABLE ref.qty_buckets (
  code       text PRIMARY KEY,
  label_vi   text NOT NULL,
  per_order  boolean NOT NULL,     -- ngăn này phải gắn một đơn
  sort_order integer NOT NULL
);
INSERT INTO ref.qty_buckets (code, label_vi, per_order, sort_order) VALUES
  ('source',           'Ngoài sổ (nguồn)',              false, 0),
  ('available',        'Khả dụng',                      false, 1),
  ('held',             'Giữ tạm',                       true,  2),
  ('committed',        'Cam kết',                       true,  3),
  ('in_transit',       'Đang giao',                     true,  4),
  ('delivered',        'Đã giao',                       true,  5),
  ('returned_pending', 'Trả lại chờ xử lý',             true,  6),
  ('moved_to_child',   'Đã chuyển lô con',              false, 7),
  ('loss',             'Hao hụt / loại bỏ',             false, 8);

-- Chuyển ngăn được phép (ngoài các cặp này là lỗi nghiệp vụ).
CREATE TABLE ref.qty_moves (
  from_bucket text NOT NULL REFERENCES ref.qty_buckets (code),
  to_bucket   text NOT NULL REFERENCES ref.qty_buckets (code),
  reason      text NOT NULL,
  label_vi    text NOT NULL,
  PRIMARY KEY (from_bucket, to_bucket, reason)
);
INSERT INTO ref.qty_moves (from_bucket, to_bucket, reason, label_vi) VALUES
  ('source','available',            'declare',          'Đăng lô: khả dụng = lượng khai'),
  ('source','available',            'estimate_up',      'Sửa lượng ước tính / cân lại tăng'),
  ('available','source',            'estimate_down',    'Sửa lượng ước tính / cân lại giảm (lượng lô giảm)'),
  ('source','available',            'split_in',         'Nhận lượng từ lô cha (tách loại, trả lại)'),
  ('available','loss',              'sold_outside',     'Bán ngoài app'),
  ('available','loss',              'spoiled',          'Hư hỏng, loại bỏ'),
  ('available','moved_to_child',    'split_out',        'Tách sang lô con theo loại'),
  ('available','held',              'hold',             'Đồng ý giá: tạo giữ lượng'),
  ('held','available',              'hold_release',     'Giữ lượng hết hạn / hủy'),
  ('held','committed',              'commit',           'Cọc xác nhận: giữ lượng thành cam kết'),
  ('available','committed',         'commit_direct',    'Cam kết thêm (phụ lục tăng lượng, đợt mới)'),
  ('committed','available',         'commit_release',   'Hủy đơn / giảm lượng / kết thúc phần thiếu'),
  ('committed','in_transit',        'start_check',      'Bắt đầu nghiệm thu tại điểm / xuất hàng (người bán lo xe)'),
  ('in_transit','delivered',        'accept',           'Nghiệm thu chốt: đạt + hạ cấp + hư do đường'),
  ('in_transit','returned_pending', 'reject',           'Nghiệm thu chốt: trả lại'),
  ('in_transit','committed',        'not_loaded',       'Phần không bốc (người bán rút phần tranh chấp, không nhận phần vượt)'),
  ('delivered','returned_pending',  'reject_after',     'Kiểm định kết luận khác mẫu: chuyển sang trả lại'),
  ('returned_pending','available',  'take_back',        'Người bán nhận lại vào lô'),
  ('returned_pending','moved_to_child','return_to_child','Trả lại thành lô con loại dưới'),
  ('returned_pending','loss',       'destroy',          'Tiêu hủy có biên bản');

CREATE TABLE ledger.qty_movements (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id          uuid   NOT NULL REFERENCES core.lots (id),
  from_bucket     text   NOT NULL,
  to_bucket       text   NOT NULL,
  reason          text   NOT NULL,
  qty             bigint NOT NULL,
  order_id        uuid   REFERENCES core.orders (id),        -- ngăn theo đơn
  delivery_id     uuid,                                       -- FK thêm ở 0009 (đợt giao)
  related_lot_id  uuid   REFERENCES core.lots (id),           -- lô con/lô cha khi tách
  idempotency_key text   NOT NULL,
  note            text,
  at              timestamptz NOT NULL DEFAULT now(),
  actor_user_id   uuid,
  request_id      text,
  CONSTRAINT uq_qty_move_idem UNIQUE (idempotency_key),
  CONSTRAINT ck_qty_move_positive CHECK (qty > 0),
  CONSTRAINT fk_qty_move_kind FOREIGN KEY (from_bucket, to_bucket, reason) REFERENCES ref.qty_moves (from_bucket, to_bucket, reason),
  CONSTRAINT ck_qty_move_split CHECK ((reason IN ('split_in','split_out','return_to_child')) = (related_lot_id IS NOT NULL))
);
COMMENT ON TABLE ledger.qty_movements IS 'Chuyển động lượng của lô giữa các ngăn. Append-only, có khóa chống lặp (F01).';
CREATE INDEX ix_qty_move_lot ON ledger.qty_movements (lot_id, id);
CREATE INDEX ix_qty_move_order ON ledger.qty_movements (order_id) WHERE order_id IS NOT NULL;
CREATE TRIGGER tg_qty_move_immutable BEFORE UPDATE OR DELETE ON ledger.qty_movements
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Số dư từng ngăn (theo lô, ngăn, đơn). CHECK không âm ngay lập tức (trừ source).
CREATE TABLE ledger.qty_balances (
  lot_id    uuid   NOT NULL REFERENCES core.lots (id),
  bucket    text   NOT NULL REFERENCES ref.qty_buckets (code),
  order_key uuid   NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',  -- đơn, hoặc uuid 0 cho ngăn không theo đơn
  qty       bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lot_id, bucket, order_key),
  CONSTRAINT ck_qty_balance_non_negative CHECK (bucket = 'source' OR qty >= 0)
);
COMMENT ON TABLE ledger.qty_balances IS 'Bộ đệm số dư ngăn = tổng chuyển động. CHECK qty ≥ 0 chặn tức thì mọi lần hứa vượt lượng có.';

CREATE FUNCTION ledger.apply_qty_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_zero constant uuid := '00000000-0000-0000-0000-000000000000';
  v_from_per boolean; v_to_per boolean;
BEGIN
  SELECT per_order INTO v_from_per FROM ref.qty_buckets WHERE code = NEW.from_bucket;
  SELECT per_order INTO v_to_per   FROM ref.qty_buckets WHERE code = NEW.to_bucket;
  IF (v_from_per OR v_to_per) AND NEW.order_id IS NULL THEN
    RAISE EXCEPTION 'Chuyển % → % phải gắn đơn', NEW.from_bucket, NEW.to_bucket USING HINT = 'ck_qty_move_order';
  END IF;

  INSERT INTO ledger.qty_balances AS b (lot_id, bucket, order_key, qty)
  VALUES (NEW.lot_id, NEW.from_bucket, CASE WHEN v_from_per THEN NEW.order_id ELSE v_zero END, -NEW.qty)
  ON CONFLICT (lot_id, bucket, order_key) DO UPDATE SET qty = b.qty + EXCLUDED.qty, updated_at = now();

  INSERT INTO ledger.qty_balances AS b (lot_id, bucket, order_key, qty)
  VALUES (NEW.lot_id, NEW.to_bucket, CASE WHEN v_to_per THEN NEW.order_id ELSE v_zero END, NEW.qty)
  ON CONFLICT (lot_id, bucket, order_key) DO UPDATE SET qty = b.qty + EXCLUDED.qty, updated_at = now();
  RETURN NEW;
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'Lô % không đủ lượng ở ngăn "%" để chuyển % sang "%"', NEW.lot_id, NEW.from_bucket, NEW.qty, NEW.to_bucket
    USING HINT = 'ck_qty_non_negative', ERRCODE = '23514';
END $$;
CREATE TRIGGER tg_qty_move_apply AFTER INSERT ON ledger.qty_movements
  FOR EACH ROW EXECUTE FUNCTION ledger.apply_qty_movement();

-- Hàm ghi chuyển động (gọi lặp cùng khóa = không ghi lần hai).
CREATE FUNCTION ledger.move_qty(p_lot uuid, p_from text, p_to text, p_reason text, p_qty bigint,
                                p_order uuid, p_idem text, p_related_lot uuid DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint;
BEGIN
  SELECT id INTO v_id FROM ledger.qty_movements WHERE idempotency_key = p_idem;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO ledger.qty_movements (lot_id, from_bucket, to_bucket, reason, qty, order_id, related_lot_id, idempotency_key, note, actor_user_id, request_id)
  VALUES (p_lot, p_from, p_to, p_reason, p_qty, p_order, p_related_lot, p_idem, p_note, ref.ctx_user(), ref.ctx('request_id'))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
