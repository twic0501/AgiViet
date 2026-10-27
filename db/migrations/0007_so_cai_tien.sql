-- =====================================================================
-- 0007 · Sổ cái kép tiền (VND)
--
-- Quy ước: mỗi tài khoản sổ cái là một "chỗ tiền hoặc một quyền đòi tiền".
--   amount_vnd > 0  = ghi Nợ (tiền/quyền đi VÀO tài khoản)
--   amount_vnd < 0  = ghi Có (tiền/quyền đi RA khỏi tài khoản)
--   Mỗi giao dịch: ≥ 2 bút toán, tổng = 0 (kiểm ở cuối giao dịch DB bằng constraint trigger hoãn).
--   Số dư = tổng bút toán. Không cột số dư nào được sửa tay.
--
-- Loại tài khoản (ref.ledger_account_types) – xem docs/database/02:
--   external          tiền của một tổ chức ở NGOÀI AgiViet (ngân hàng riêng, tiền mặt). Số dư âm = tổ chức đã bỏ tiền ra.
--   deposit_escrow    cọc của một đơn đang nằm ở tài khoản ngân hàng đối tác. Không bao giờ âm.
--   deposit_in_instruction  phần cọc đã nằm trong lệnh chi/hoàn chưa có kết quả (BT-T1: coc_trong_lenh).
--   fee_in_instruction      phần phí đang trong lệnh hoàn phí.
--   fee_held          phí bên mua đã nộp cho đơn, "Đã thu · hoàn hay không tùy kết quả đơn" (M12). Không âm.
--   platform_revenue  phí AgiViet đã ghi nhận doanh thu (sau khi đơn kết thúc, không còn khả năng hoàn).
--   seller_receivable quyền đòi của người bán với bên mua trong một đơn (dương = bên mua còn nợ người bán).
--   buyer_payable     nghĩa vụ đối ứng của bên mua (luôn bằng âm seller_receivable cùng đơn).
--   suspense          tiền ngân hàng báo về mà chưa khớp được lệnh (chờ đối soát thủ công). Không âm.
-- =====================================================================

CREATE TABLE ref.ledger_account_types (
  code          text PRIMARY KEY,
  label_vi      text NOT NULL,
  scope         text NOT NULL,          -- org: theo tổ chức; order: theo đơn (+ tổ chức); global
  non_negative  boolean NOT NULL,       -- số dư (Nợ dương) không được âm khi kết thúc giao dịch
  CONSTRAINT ck_lat_scope CHECK (scope IN ('org','order','global'))
);
INSERT INTO ref.ledger_account_types (code, label_vi, scope, non_negative) VALUES
  ('external',          'Tiền ngoài AgiViet của tổ chức',              'org',    false),
  ('deposit_escrow',    'Cọc đang giữ tại ngân hàng đối tác',          'order',  true),
  ('deposit_in_instruction','Cọc đang trong lệnh ngân hàng',        'order',  true),
  ('fee_held',          'Phí đã thu, chờ đơn kết thúc',                'order',  true),
  ('fee_in_instruction','Phí đang trong lệnh hoàn',                    'order',  true),
  ('platform_revenue',  'Doanh thu phí AgiViet',                       'global', false),
  ('seller_receivable', 'Người bán còn được nhận trong đơn',           'order',  false),
  ('buyer_payable',     'Bên mua còn phải trả trong đơn (đối ứng)',    'order',  false),
  ('suspense',          'Tiền ngân hàng báo chưa khớp lệnh',           'global', true),
  ('external_unidentified','Nguồn chưa xác định (tiền vào chưa khớp)', 'global', false);

CREATE TABLE ledger.accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type  text NOT NULL REFERENCES ref.ledger_account_types (code),
  org_id        uuid REFERENCES core.organizations (id),
  order_id      uuid REFERENCES core.orders (id),
  framework_id  uuid REFERENCES core.framework_contracts (id),   -- cọc khung, công nợ theo kỳ của hợp đồng khung
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ledger_account UNIQUE NULLS NOT DISTINCT (account_type, org_id, order_id, framework_id),
  CONSTRAINT ck_ledger_account_one_scope CHECK (order_id IS NULL OR framework_id IS NULL)
);
COMMENT ON TABLE ledger.accounts IS 'Tài khoản sổ cái. Mỗi (loại, tổ chức, đơn) đúng một tài khoản; tạo lười bằng ledger.account_of().';
CREATE INDEX ix_ledger_accounts_order ON ledger.accounts (order_id) WHERE order_id IS NOT NULL;

-- Kiểm phạm vi của tài khoản theo loại.
CREATE FUNCTION ledger.check_account_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_scope text;
BEGIN
  SELECT scope INTO v_scope FROM ref.ledger_account_types WHERE code = NEW.account_type;
  IF (v_scope = 'org'    AND (NEW.org_id IS NULL OR NEW.order_id IS NOT NULL OR NEW.framework_id IS NOT NULL))
  OR (v_scope = 'order'  AND (NEW.order_id IS NULL AND NEW.framework_id IS NULL))
  OR (v_scope = 'global' AND (NEW.org_id IS NOT NULL OR NEW.order_id IS NOT NULL OR NEW.framework_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Tài khoản % sai phạm vi (%)', NEW.account_type, v_scope USING HINT = 'ck_ledger_account_scope';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_ledger_account_scope BEFORE INSERT ON ledger.accounts
  FOR EACH ROW EXECUTE FUNCTION ledger.check_account_scope();
CREATE TRIGGER tg_ledger_accounts_immutable BEFORE UPDATE OR DELETE ON ledger.accounts
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION ledger.account_of(p_type text, p_org uuid, p_order uuid, p_framework uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM ledger.accounts
   WHERE account_type = p_type AND org_id IS NOT DISTINCT FROM p_org
     AND order_id IS NOT DISTINCT FROM p_order AND framework_id IS NOT DISTINCT FROM p_framework;
  IF v_id IS NULL THEN
    INSERT INTO ledger.accounts (account_type, org_id, order_id, framework_id) VALUES (p_type, p_org, p_order, p_framework)
    ON CONFLICT ON CONSTRAINT uq_ledger_account DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM ledger.accounts
       WHERE account_type = p_type AND org_id IS NOT DISTINCT FROM p_org
         AND order_id IS NOT DISTINCT FROM p_order AND framework_id IS NOT DISTINCT FROM p_framework;
    END IF;
  END IF;
  RETURN v_id;
END $$;

-- ---------------------------------------------------------------------
-- Giao dịch sổ cái và bút toán
-- ---------------------------------------------------------------------
CREATE TABLE ref.ledger_txn_kinds (
  code      text PRIMARY KEY,
  label_vi  text NOT NULL,
  money_type text NOT NULL,             -- K04: deposit (cọc), direct (trả thẳng), advance (ứng tiền), materials (vật tư đối trừ), fee, accrual (ghi nhận nghĩa vụ), correction
  CONSTRAINT ck_ltk_money CHECK (money_type IN ('deposit','direct','advance','materials','fee','accrual','correction'))
);
INSERT INTO ref.ledger_txn_kinds (code, label_vi, money_type) VALUES
  ('deposit_receipt',     'Ngân hàng xác nhận nhận cọc (+ phí)',          'deposit'),
  ('fee_capture',         'Tách phí khỏi tiền cọc đã nhận',               'fee'),
  ('unmatched_receipt',   'Tiền vào chưa khớp đơn (chờ đối soát)',        'deposit'),
  ('instruction_reserve', 'Đưa tiền vào lệnh ngân hàng',                  'deposit'),
  ('instruction_paid',    'Ngân hàng xác nhận lệnh thành công',           'deposit'),
  ('instruction_failed',  'Lệnh thất bại: tiền về lại chỗ cũ',            'deposit'),
  ('direct_payment',      'Bên nhận xác nhận khoản trả thẳng',            'direct'),
  ('settlement_accrual',  'Ghi nhận số người bán được nhận ròng (N)',     'accrual'),
  ('fee_recognition',     'Phí không còn hoàn: ghi doanh thu',            'fee'),
  ('reversal',            'Bút toán đảo',                                 'correction'),
  ('manual_adjustment',   'Điều chỉnh thủ công (hai người)',              'correction');

CREATE TABLE ledger.transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL REFERENCES ref.ledger_txn_kinds (code),
  order_id           uuid REFERENCES core.orders (id),
  framework_id       uuid REFERENCES core.framework_contracts (id),
  idempotency_key    text NOT NULL,             -- ví dụ 'bank:<provider>:<event_id>' hoặc 'settle:<order>:<n>'
  reverses_id        uuid REFERENCES ledger.transactions (id),  -- bút toán đảo trỏ về giao dịch gốc
  bank_event_id      uuid REFERENCES core.bank_events (id),
  bank_instruction_id uuid REFERENCES core.bank_instructions (id),
  dp_confirmation_id uuid REFERENCES core.direct_payment_confirmations (id),
  settlement_id      uuid REFERENCES core.settlements (id),
  memo               text NOT NULL,
  effective_at       timestamptz NOT NULL DEFAULT now(),   -- thời điểm kinh tế (giờ ngân hàng xác nhận)
  posted_at          timestamptz NOT NULL DEFAULT now(),   -- thời điểm ghi sổ
  posted_by          uuid REFERENCES core.users (id),
  approved_by        uuid REFERENCES core.users (id),     -- lệnh tiền thủ công: người duyệt khác người lập (Q16)
  request_id         text,
  CONSTRAINT uq_ledger_txn_idem UNIQUE (idempotency_key),
  CONSTRAINT ck_ledger_txn_maker_checker CHECK (approved_by IS NULL OR approved_by <> posted_by),
  CONSTRAINT ck_ledger_txn_reverse_self CHECK (reverses_id IS NULL OR reverses_id <> id)
);
COMMENT ON TABLE ledger.transactions IS 'Một sự kiện tiền (đã xảy ra, đã được xác nhận). Bất biến. Sửa bằng giao dịch đảo (reverses_id).';
CREATE UNIQUE INDEX uq_ledger_txn_reversed_once ON ledger.transactions (reverses_id) WHERE reverses_id IS NOT NULL;
CREATE INDEX ix_ledger_txn_order ON ledger.transactions (order_id, posted_at) WHERE order_id IS NOT NULL;
CREATE INDEX ix_ledger_txn_kind_time ON ledger.transactions (kind, effective_at);
CREATE TRIGGER tg_ledger_txn_immutable BEFORE UPDATE OR DELETE ON ledger.transactions
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE TABLE ledger.entries (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id uuid   NOT NULL REFERENCES ledger.transactions (id),
  line_no        smallint NOT NULL,
  account_id     uuid   NOT NULL REFERENCES ledger.accounts (id),
  amount_vnd     bigint NOT NULL,
  CONSTRAINT uq_ledger_entry_line UNIQUE (transaction_id, line_no),
  CONSTRAINT ck_ledger_entry_nonzero CHECK (amount_vnd <> 0),
  CONSTRAINT ck_ledger_entry_bound CHECK (abs(amount_vnd) <= 1000000000000)   -- 1.000 tỷ đ: chặn lỗi đơn vị (nhập nhầm gam thành tiền)
);
COMMENT ON TABLE ledger.entries IS 'Bút toán. Dương = Nợ (vào), âm = Có (ra). Tổng theo giao dịch = 0. Append-only.';
CREATE INDEX ix_ledger_entries_account ON ledger.entries (account_id, transaction_id);
CREATE INDEX ix_ledger_entries_txn ON ledger.entries (transaction_id);
CREATE TRIGGER tg_ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger.entries
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Số dư duy trì bởi trigger, trong cùng giao dịch DB (không sửa tay: vai app không có quyền UPDATE).
CREATE TABLE ledger.account_balances (
  account_id   uuid PRIMARY KEY REFERENCES ledger.accounts (id),
  balance_vnd  bigint NOT NULL DEFAULT 0,
  entry_count  bigint NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE ledger.account_balances IS 'Bộ đệm số dư = SUM(entries). Có câu đối chiếu trong db/tests. Chỉ trigger ghi.';

CREATE FUNCTION ledger.apply_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ledger.account_balances AS b (account_id, balance_vnd, entry_count)
  VALUES (NEW.account_id, NEW.amount_vnd, 1)
  ON CONFLICT (account_id) DO UPDATE
    SET balance_vnd = b.balance_vnd + EXCLUDED.balance_vnd,
        entry_count = b.entry_count + 1,
        updated_at  = now();
  RETURN NEW;
END $$;
CREATE TRIGGER tg_ledger_entries_apply AFTER INSERT ON ledger.entries
  FOR EACH ROW EXECUTE FUNCTION ledger.apply_entry();

-- Kiểm cân đối ở CUỐI giao dịch DB: tổng = 0, ≥ 2 dòng; tài khoản không âm vẫn không âm.
CREATE FUNCTION ledger.check_txn_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_sum numeric; v_n int;
BEGIN
  SELECT coalesce(sum(amount_vnd), 0), count(*) INTO v_sum, v_n
    FROM ledger.entries WHERE transaction_id = NEW.transaction_id;
  IF v_sum <> 0 OR v_n < 2 THEN
    RAISE EXCEPTION 'Giao dịch sổ cái % không cân: tổng %, số dòng %', NEW.transaction_id, v_sum, v_n
      USING HINT = 'ck_ledger_balanced';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER tg_ledger_txn_balanced AFTER INSERT ON ledger.entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.check_txn_balanced();

CREATE FUNCTION ledger.check_non_negative() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_bal bigint; v_type text; v_nn boolean;
BEGIN
  SELECT b.balance_vnd, a.account_type, t.non_negative INTO v_bal, v_type, v_nn
    FROM ledger.account_balances b
    JOIN ledger.accounts a ON a.id = b.account_id
    JOIN ref.ledger_account_types t ON t.code = a.account_type
   WHERE b.account_id = NEW.account_id;
  IF v_nn AND v_bal < 0 THEN
    RAISE EXCEPTION 'Tài khoản % (%) sẽ âm: %', NEW.account_id, v_type, v_bal USING HINT = 'ck_ledger_non_negative';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER tg_ledger_non_negative AFTER INSERT ON ledger.entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.check_non_negative();

-- Hai tài khoản quyền đòi trong một đơn luôn đối xứng: seller_receivable + buyer_payable = 0.
CREATE FUNCTION ledger.check_claim_mirror() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_acc ledger.accounts%ROWTYPE; v_sum numeric;
BEGIN
  SELECT * INTO v_acc FROM ledger.accounts WHERE id = NEW.account_id;
  IF v_acc.account_type NOT IN ('seller_receivable','buyer_payable') THEN RETURN NULL; END IF;
  SELECT coalesce(sum(e.amount_vnd), 0) INTO v_sum
    FROM ledger.entries e JOIN ledger.accounts a ON a.id = e.account_id
   WHERE a.order_id IS NOT DISTINCT FROM v_acc.order_id AND a.framework_id IS NOT DISTINCT FROM v_acc.framework_id
     AND a.account_type IN ('seller_receivable','buyer_payable');
  IF v_sum <> 0 THEN
    RAISE EXCEPTION 'Quyền đòi lệch (đơn %, khung %): seller_receivable + buyer_payable = %', v_acc.order_id, v_acc.framework_id, v_sum
      USING HINT = 'ck_ledger_claim_mirror';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER tg_ledger_claim_mirror AFTER INSERT ON ledger.entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.check_claim_mirror();

-- Hàm ghi sổ duy nhất backend được gọi. p_lines: [{"type":"deposit_escrow","org":uuid|null,"order":uuid|null,"amount":123}, ...]
-- Gọi lặp cùng idempotency_key trả về giao dịch cũ (không ghi lần hai).
CREATE FUNCTION ledger.post(p_kind text, p_order uuid, p_idem text, p_memo text, p_lines jsonb,
                            p_effective_at timestamptz DEFAULT now(),
                            p_reverses uuid DEFAULT NULL, p_approved_by uuid DEFAULT NULL,
                            p_refs jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_txn uuid; v_line jsonb; v_no int := 0;
BEGIN
  SELECT id INTO v_txn FROM ledger.transactions WHERE idempotency_key = p_idem;
  IF v_txn IS NOT NULL THEN RETURN v_txn; END IF;

  INSERT INTO ledger.transactions (kind, order_id, framework_id, idempotency_key, reverses_id, memo, effective_at, posted_by, approved_by, request_id,
                                   bank_event_id, bank_instruction_id, dp_confirmation_id, settlement_id)
  VALUES (p_kind, p_order, (p_refs->>'framework')::uuid, p_idem, p_reverses, p_memo, p_effective_at, ref.ctx_user(), p_approved_by, ref.ctx('request_id'),
          (p_refs->>'bank_event')::uuid, (p_refs->>'bank_instruction')::uuid, (p_refs->>'dp_confirmation')::uuid, (p_refs->>'settlement')::uuid)
  RETURNING id INTO v_txn;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_no := v_no + 1;
    INSERT INTO ledger.entries (transaction_id, line_no, account_id, amount_vnd)
    VALUES (v_txn, v_no,
            ledger.account_of(v_line->>'type', (v_line->>'org')::uuid, (v_line->>'order')::uuid, (v_line->>'framework')::uuid),
            (v_line->>'amount')::bigint);
  END LOOP;
  RETURN v_txn;
END $$;

-- Đảo một giao dịch: cùng tài khoản, ngược dấu. Mỗi giao dịch chỉ đảo được một lần (uq_ledger_txn_reversed_once).
CREATE FUNCTION ledger.reverse(p_txn uuid, p_reason text, p_approved_by uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_new uuid; v_orig ledger.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_orig FROM ledger.transactions WHERE id = p_txn;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không có giao dịch %', p_txn; END IF;
  IF v_orig.reverses_id IS NOT NULL THEN
    RAISE EXCEPTION 'Không đảo một bút toán đảo; lập giao dịch mới' USING HINT = 'ck_ledger_reverse_of_reverse';
  END IF;
  INSERT INTO ledger.transactions (kind, order_id, framework_id, idempotency_key, reverses_id, memo, posted_by, approved_by, request_id)
  VALUES ('reversal', v_orig.order_id, v_orig.framework_id, 'reverse:' || p_txn, p_txn, 'Đảo: ' || p_reason, ref.ctx_user(), p_approved_by, ref.ctx('request_id'))
  RETURNING id INTO v_new;
  INSERT INTO ledger.entries (transaction_id, line_no, account_id, amount_vnd)
  SELECT v_new, line_no, account_id, -amount_vnd FROM ledger.entries WHERE transaction_id = p_txn;
  RETURN v_new;
END $$;
