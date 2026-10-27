-- =====================================================================
-- 0006 · Tiền ở tầng nghiệp vụ: cọc, sự kiện ngân hàng, lệnh ngân hàng, khoản trả thẳng
--        (báo / xác nhận), quyết toán. Theo 03 mục 9 và 04 mục 4–9.
-- Mỗi bảng ở đây là "đơn từ" (ai yêu cầu gì, ngân hàng báo gì). Dòng tiền thật được ghi
-- ở sổ cái (0007) bằng trigger, nên hai bên không thể lệch nhau.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cọc của đơn hoặc của hợp đồng khung
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('deposit','awaiting_transfer',  'Chờ chuyển',              true,  false, 1, 'cho_chuyen'),
  ('deposit','partially_received', 'Nhận một phần',           false, false, 2, 'nhan_mot_phan'),
  ('deposit','held',               'Ngân hàng đang giữ',      false, false, 3, 'dang_giu'),
  ('deposit','processing',         'Đang xử lý (có lệnh)',    false, false, 4, 'dang_xu_ly'),
  ('deposit','fully_processed',    'Đã xử lý hết',            false, true,  5, 'da_xu_ly_het'),
  ('deposit','void',               'Không phát sinh (đơn đóng trước cọc, không có tiền)', false, true, 6, NULL);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('deposit','awaiting_transfer','held',               ARRAY['bank','system']),
  ('deposit','awaiting_transfer','partially_received', ARRAY['bank','system']),
  ('deposit','partially_received','held',              ARRAY['bank','system']),
  ('deposit','partially_received','processing',        ARRAY['system']),   -- hết hạn cọc: hoàn tiền lẻ
  ('deposit','awaiting_transfer','void',               ARRAY['system']),
  ('deposit','held','processing',                      ARRAY['system','ops']),
  ('deposit','processing','held',                      ARRAY['system']),   -- quyết toán từng phần xong, còn phần giữ
  ('deposit','processing','fully_processed',           ARRAY['system']);

CREATE TABLE core.deposits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid UNIQUE REFERENCES core.orders (id),
  framework_id        uuid UNIQUE REFERENCES core.framework_contracts (id),
  payer_org_id        uuid NOT NULL REFERENCES core.organizations (id),
  expected_deposit_vnd bigint NOT NULL,                 -- C (cập nhật bằng hàng bổ sung, không sửa: xem deposit_adjustments)
  expected_fee_vnd    bigint NOT NULL,                  -- F thu cùng cọc
  payment_ref         text NOT NULL UNIQUE,             -- nội dung chuyển khoản: AGV HD2001 COC
  virtual_account_no  text NOT NULL UNIQUE,             -- số tài khoản ảo theo đơn tại ngân hàng đối tác (mô phỏng)
  bank_provider       text NOT NULL DEFAULT 'bank_sim',
  status              text NOT NULL DEFAULT 'awaiting_transfer',
  status_changed_at   timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_deposit_owner CHECK ((order_id IS NULL) <> (framework_id IS NULL)),
  CONSTRAINT ck_deposit_amounts CHECK (expected_deposit_vnd >= 0 AND expected_fee_vnd >= 0)
);
COMMENT ON TABLE core.deposits IS 'Cọc: chỉ ngân hàng làm được bước sang "đang giữ". Số liệu tiền thật đọc từ sổ cái.';
CREATE TRIGGER tg_deposit_status BEFORE INSERT OR UPDATE OF status ON core.deposits
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('deposit');
CREATE TRIGGER tg_deposit_touch BEFORE UPDATE ON core.deposits FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Điều chỉnh cọc theo phụ lục (04 mục 4): bổ sung (COCBS) hoặc hoàn chênh.
CREATE TABLE core.deposit_adjustments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id       uuid NOT NULL REFERENCES core.deposits (id),
  order_version_no integer NOT NULL,
  delta_deposit_vnd bigint NOT NULL,                   -- + bổ sung, − hoàn chênh
  delta_fee_vnd    bigint NOT NULL DEFAULT 0,
  payment_ref      text UNIQUE,                        -- AGV HD2001 COCBS (khi bổ sung)
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dep_adj_nonzero CHECK (delta_deposit_vnd <> 0 OR delta_fee_vnd <> 0),
  CONSTRAINT ck_dep_adj_ref CHECK ((delta_deposit_vnd > 0) = (payment_ref IS NOT NULL))
);
CREATE TRIGGER tg_dep_adj_immutable BEFORE UPDATE OR DELETE ON core.deposit_adjustments
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Sự kiện ngân hàng đã chuẩn hóa (từ evt.inbound_webhooks). BT-T8: mỗi mã sự kiện áp một lần.
-- ---------------------------------------------------------------------
CREATE TABLE core.bank_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           text NOT NULL,
  provider_event_id  text NOT NULL,                     -- ma_su_kien_nh
  webhook_id         bigint REFERENCES evt.inbound_webhooks (id),
  kind               text NOT NULL,                     -- deposit_received | instruction_processing | instruction_succeeded | instruction_failed | statement_line
  amount_vnd         bigint,
  payment_ref        text,                              -- nội dung chuyển khoản (đối chiếu cọc)
  bank_txn_ref       text,                              -- mã giao dịch phía ngân hàng
  instruction_code   text,                              -- lệnh liên quan (nếu có)
  occurred_at        timestamptz NOT NULL,              -- giờ ngân hàng
  received_at        timestamptz NOT NULL DEFAULT now(),
  applied_at         timestamptz,
  apply_result       text,                              -- applied | duplicate_ignored | late_after_reconciled | unmatched_suspense
  CONSTRAINT uq_bank_event UNIQUE (provider, provider_event_id),
  CONSTRAINT ck_bank_event_kind CHECK (kind IN ('deposit_received','instruction_processing','instruction_succeeded','instruction_failed','statement_line')),
  CONSTRAINT ck_bank_event_amount CHECK (amount_vnd IS NULL OR amount_vnd > 0)
);
CREATE INDEX ix_bank_events_ref ON core.bank_events (payment_ref) WHERE payment_ref IS NOT NULL;
CREATE INDEX ix_bank_events_unapplied ON core.bank_events (received_at) WHERE applied_at IS NULL;

-- ---------------------------------------------------------------------
-- Lệnh ngân hàng: chụp đích lúc tạo, bất biến về số tiền và đích (F05, BT-T7)
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('bank_instruction','created',    'Đã tạo',               true,  false, 1, 'da_tao'),
  ('bank_instruction','sent',       'Đã gửi lệnh',          false, false, 2, 'da_gui'),
  ('bank_instruction','processing', 'Ngân hàng đang xử lý', false, false, 3, 'dang_xu_ly'),
  ('bank_instruction','succeeded',  'Ngân hàng đã xác nhận',false, false, 4, 'thanh_cong'),
  ('bank_instruction','failed',     'Thất bại',             false, true,  5, 'that_bai'),
  ('bank_instruction','reconciled', 'Đã đối soát',          false, true,  6, 'da_doi_soat');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('bank_instruction','created','sent',          ARRAY['system']),
  ('bank_instruction','sent','processing',       ARRAY['bank']),
  ('bank_instruction','sent','succeeded',        ARRAY['bank']),   -- ngân hàng có thể bỏ qua bước "đang xử lý"
  ('bank_instruction','sent','failed',           ARRAY['bank']),
  ('bank_instruction','processing','succeeded',  ARRAY['bank']),
  ('bank_instruction','processing','failed',     ARRAY['bank']),
  ('bank_instruction','succeeded','reconciled',  ARRAY['system','ops']);
-- Không có chuyển nào rời 'reconciled'/'failed': sự kiện cũ đến muộn không đảo trạng thái (03 mục 9.3).

CREATE TABLE ref.bank_instruction_kinds (
  code      text PRIMARY KEY,
  spec_code text NOT NULL UNIQUE,
  label_vi  text NOT NULL,
  source    text NOT NULL,          -- deposit_escrow | fee_held
  target    text NOT NULL           -- seller | buyer
);
INSERT INTO ref.bank_instruction_kinds VALUES
  ('release_deposit_to_seller', 'chi_coc_nb', 'Chi cọc cho người bán',   'deposit_escrow', 'seller'),
  ('refund_deposit_to_buyer',   'hoan_coc_bm','Hoàn cọc cho bên mua',    'deposit_escrow', 'buyer'),
  ('refund_excess',             'hoan_thua',  'Hoàn phần chuyển thừa',   'deposit_escrow', 'buyer'),
  ('refund_fee',                'hoan_phi',   'Hoàn phí cho bên mua',    'fee_held',       'buyer');
-- chuyen_phi (tách phí sang tài khoản doanh thu) do ngân hàng làm lúc nhận; sổ cái ghi bằng 'fee_capture'.

CREATE TABLE core.bank_instructions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,                 -- mã lệnh = khóa chống lặp gửi ngân hàng
  kind                text NOT NULL REFERENCES ref.bank_instruction_kinds (code),
  deposit_id          uuid NOT NULL REFERENCES core.deposits (id),
  order_id            uuid REFERENCES core.orders (id),
  basis_kind          text NOT NULL,                        -- settlement | cancellation | excess | fee_refund | debt_offset | ops_decision
  basis_id            uuid NOT NULL,                        -- mã căn cứ (quyết toán, yêu cầu hủy, ...)
  replaces_instruction_id uuid REFERENCES core.bank_instructions (id),  -- lệnh mới thay lệnh thất bại
  amount_vnd          bigint NOT NULL,
  target_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  target_bank_account_id uuid REFERENCES pii.bank_accounts (id),
  target_bank_code    text NOT NULL,                        -- chụp lúc tạo
  target_account_masked text NOT NULL,
  target_account_holder text NOT NULL,
  created_by          uuid REFERENCES core.users (id),
  approved_by         uuid REFERENCES core.users (id),      -- lệnh thủ công: người duyệt ≠ người lập (Q16)
  is_manual           boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'created',
  status_changed_at   timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  bank_txn_ref        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_bi_amount CHECK (amount_vnd > 0),
  CONSTRAINT ck_bi_basis CHECK (basis_kind IN ('settlement','cancellation','excess','fee_refund','debt_offset','ops_decision')),
  CONSTRAINT ck_bi_manual CHECK (NOT is_manual OR (approved_by IS NOT NULL AND approved_by IS DISTINCT FROM created_by))
);
COMMENT ON TABLE core.bank_instructions IS 'Lệnh chi/hoàn tới ngân hàng đối tác. Số tiền và tài khoản đích chụp lúc tạo, không đổi (trigger).';
-- BT-T7: không có hai lệnh thành công cùng căn cứ và cùng loại.
CREATE UNIQUE INDEX uq_bi_success_per_basis ON core.bank_instructions (basis_kind, basis_id, kind)
  WHERE status IN ('created','sent','processing','succeeded','reconciled');
CREATE INDEX ix_bi_order ON core.bank_instructions (order_id);
CREATE INDEX ix_bi_pending ON core.bank_instructions (status) WHERE status IN ('created','sent','processing','succeeded');
CREATE TRIGGER tg_bi_status BEFORE INSERT OR UPDATE OF status ON core.bank_instructions
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('bank_instruction');
CREATE TRIGGER tg_bi_touch BEFORE UPDATE ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

CREATE FUNCTION core.freeze_instruction_target() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.amount_vnd, NEW.target_org_id, NEW.target_bank_account_id, NEW.target_bank_code, NEW.target_account_masked,
      NEW.target_account_holder, NEW.kind, NEW.deposit_id, NEW.basis_kind, NEW.basis_id, NEW.code)
     IS DISTINCT FROM
     (OLD.amount_vnd, OLD.target_org_id, OLD.target_bank_account_id, OLD.target_bank_code, OLD.target_account_masked,
      OLD.target_account_holder, OLD.kind, OLD.deposit_id, OLD.basis_kind, OLD.basis_id, OLD.code) THEN
    RAISE EXCEPTION 'Lệnh ngân hàng % đã tạo: không được đổi số tiền, đích, căn cứ', OLD.code USING HINT = 'ck_instruction_frozen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_bi_freeze BEFORE UPDATE ON core.bank_instructions
  FOR EACH ROW EXECUTE FUNCTION core.freeze_instruction_target();
CREATE TRIGGER tg_bi_no_delete BEFORE DELETE ON core.bank_instructions
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Khoản trả thẳng (nghĩa vụ ngoài app) – 03 mục 9.2. Hai chiều:
--   buyer_to_seller: trả thẳng tiền hàng, T_bm, phí kiểm định bên mua sai
--   seller_to_buyer: T_nb (người bán hoàn ngoài app), phí kiểm định người bán sai
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('direct_payment','not_due',            'Chưa đến hạn',            true,  false, 1, 'chua_den_han'),
  ('direct_payment','due',                'Đến hạn',                 true,  false, 2, 'den_han'),
  ('direct_payment','payer_reported',     'Bên trả báo đã chuyển',   false, false, 3, 'bm_da_bao'),
  ('direct_payment','partially_received', 'Nhận một phần',           false, false, 4, 'nhan_mot_phan'),
  ('direct_payment','fully_received',     'Đã nhận đủ',              false, true,  5, 'da_nhan_du'),
  ('direct_payment','mismatch',           'Lệch, đang đối soát',     false, false, 6, 'lech_doi_soat'),
  ('direct_payment','overdue',            'Quá hạn',                 false, false, 7, 'qua_han'),
  ('direct_payment','cancelled',          'Không còn phải trả',      false, true,  8, NULL);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason, note_vi) VALUES
  ('direct_payment','not_due','due',                     ARRAY['system'], false, 'tới mốc'),
  ('direct_payment','not_due','cancelled',               ARRAY['system'], true,  'đơn hủy trước mốc'),
  ('direct_payment','due','payer_reported',              ARRAY['buyer','seller'], false, 'bao_da_tra (bên trả)'),
  ('direct_payment','due','fully_received',              ARRAY['buyer','seller'], false, 'xac_nhan_nhan_du (bên nhận)'),
  ('direct_payment','due','partially_received',          ARRAY['buyer','seller'], false, 'xac_nhan_nhan_mot_phan'),
  ('direct_payment','due','overdue',                     ARRAY['system'], false, 'het_han_tra'),
  ('direct_payment','due','cancelled',                   ARRAY['system','ops'], true, 'quyết toán/hủy làm khoản không còn'),
  ('direct_payment','payer_reported','fully_received',   ARRAY['buyer','seller'], false, 'xác nhận đủ'),
  ('direct_payment','payer_reported','partially_received',ARRAY['buyer','seller'], false, 'xác nhận một phần'),
  ('direct_payment','payer_reported','mismatch',         ARRAY['buyer','seller','system'], false, 'bao_chua_nhan / hết 48 giờ'),
  ('direct_payment','partially_received','payer_reported',ARRAY['buyer','seller'], false, 'báo phần còn lại'),
  ('direct_payment','partially_received','fully_received',ARRAY['buyer','seller'], false, 'xác nhận phần còn lại'),
  ('direct_payment','partially_received','overdue',      ARRAY['system'], false, 'quá hạn phần còn lại'),
  ('direct_payment','overdue','payer_reported',          ARRAY['buyer','seller'], false, 'báo trễ'),
  ('direct_payment','overdue','fully_received',          ARRAY['buyer','seller'], false, 'nhận trễ'),
  ('direct_payment','overdue','partially_received',      ARRAY['buyer','seller'], false, 'nhận trễ một phần'),
  ('direct_payment','mismatch','fully_received',         ARRAY['ops'], true, 'ket_luan_doi_soat (2 người)'),
  ('direct_payment','mismatch','partially_received',     ARRAY['ops'], true, 'ket_luan_doi_soat'),
  ('direct_payment','mismatch','due',                    ARRAY['ops'], true, 'ket_luan_doi_soat: chưa trả');

CREATE TABLE core.direct_payments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,                 -- AGV HD2001 TT1 (nội dung chuyển khoản)
  order_id           uuid REFERENCES core.orders (id),
  framework_id       uuid REFERENCES core.framework_contracts (id),
  delivery_id        uuid,                                 -- đợt (khoản theo đợt, bao tiêu) – FK ở 0009
  kind               text NOT NULL,
  direction          text NOT NULL,
  payer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  payee_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  amount_due_vnd     bigint NOT NULL,
  due_trigger        text NOT NULL,                        -- order_active | acceptance_closed | after_days | period_end | settlement
  due_at             timestamptz,
  blocks_loading     boolean NOT NULL DEFAULT false,       -- khoản "trước bốc": chặn thẻ Sẵn sàng giao
  payee_account_masked text,                               -- chụp lúc lập (F05)
  payee_account_holder text,
  payee_bank_code    text,
  settlement_id      uuid,                                 -- khoản sinh từ quyết toán (FK dưới)
  status             text NOT NULL DEFAULT 'not_due',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_dp_owner CHECK ((order_id IS NULL) <> (framework_id IS NULL)),
  CONSTRAINT ck_dp_kind CHECK (kind IN ('goods_before_loading','goods_on_receipt','goods_after_days','goods_extra','goods_batch',
                                        'framework_period','settlement_buyer_balance','seller_refund','inspection_fee_reimburse','storage_fee_reimburse')),
  CONSTRAINT ck_dp_direction CHECK (direction IN ('buyer_to_seller','seller_to_buyer')),
  CONSTRAINT ck_dp_amount CHECK (amount_due_vnd > 0),
  CONSTRAINT ck_dp_parties CHECK (payer_org_id <> payee_org_id)
);
COMMENT ON TABLE core.direct_payments IS 'Khoản trả ngoài app. "Đã nhận" CHỈ đến từ xác nhận của bên nhận (BT-T9); không bao giờ từ báo của bên trả hoặc hết hạn.';
CREATE INDEX ix_dp_order ON core.direct_payments (order_id, status);
CREATE INDEX ix_dp_payee_open ON core.direct_payments (payee_org_id, status) WHERE status NOT IN ('fully_received','cancelled');
CREATE INDEX ix_dp_payer_open ON core.direct_payments (payer_org_id, status) WHERE status NOT IN ('fully_received','cancelled');
CREATE TRIGGER tg_dp_status BEFORE INSERT OR UPDATE OF status ON core.direct_payments
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('direct_payment');
CREATE TRIGGER tg_dp_touch BEFORE UPDATE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Báo đã trả của bên trả (không cộng tiền).
CREATE TABLE core.direct_payment_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_payment_id uuid NOT NULL REFERENCES core.direct_payments (id),
  amount_vnd        bigint NOT NULL,
  method            text NOT NULL,                       -- bank_transfer | cash
  evidence_doc_id   uuid REFERENCES core.documents (id), -- ảnh ủy nhiệm chi / biên nhận
  reported_by       uuid NOT NULL REFERENCES core.users (id),
  reported_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dpr_amount CHECK (amount_vnd > 0),
  CONSTRAINT ck_dpr_method CHECK (method IN ('bank_transfer','cash'))
);
CREATE INDEX ix_dpr_dp ON core.direct_payment_reports (direct_payment_id);
CREATE TRIGGER tg_dpr_immutable BEFORE UPDATE OR DELETE ON core.direct_payment_reports
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Xác nhận của bên nhận, LUÔN kèm số (K05). Sinh bút toán sổ cái (trigger ở 0007).
CREATE TABLE core.direct_payment_confirmations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direct_payment_id uuid NOT NULL REFERENCES core.direct_payments (id),
  order_id          uuid,                                -- chép từ khoản, để UNIQUE mã giao dịch trong đơn
  result            text NOT NULL,                       -- full | partial | not_received
  amount_vnd        bigint NOT NULL,                     -- số đã nhận lần này (0 nếu not_received)
  bank_txn_ref      text,                                -- mã giao dịch ngân hàng người nhận nhập (chống trùng, BT-T3)
  confirmed_by      uuid NOT NULL REFERENCES core.users (id),
  ops_decision_by   uuid[],                              -- đối soát thủ công: 2 người (người lập ≠ người duyệt)
  confirmed_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dpc_result CHECK (result IN ('full','partial','not_received')
        AND ((result = 'not_received') = (amount_vnd = 0)) AND amount_vnd >= 0),
  CONSTRAINT ck_dpc_ops CHECK (ops_decision_by IS NULL OR (cardinality(ops_decision_by) = 2 AND ops_decision_by[1] <> ops_decision_by[2]))
);
CREATE UNIQUE INDEX uq_dpc_bank_ref ON core.direct_payment_confirmations (order_id, bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;
CREATE INDEX ix_dpc_dp ON core.direct_payment_confirmations (direct_payment_id);
CREATE TRIGGER tg_dpc_immutable BEFORE UPDATE OR DELETE ON core.direct_payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Kiểm khi xác nhận: không người giúp; không vượt số còn phải trả; không vượt tổng đã báo (TIEN_VUOT_SO_BAO) nếu đã có báo.
CREATE FUNCTION core.check_direct_payment_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_dp core.direct_payments%ROWTYPE; v_confirmed bigint; v_reported bigint; v_n_reports int;
BEGIN
  IF ref.ctx_actor() = 'helper' THEN
    RAISE EXCEPTION 'Người giúp không được xác nhận tiền' USING HINT = 'ck_money_helper';
  END IF;
  SELECT * INTO v_dp FROM core.direct_payments WHERE id = NEW.direct_payment_id FOR UPDATE;
  NEW.order_id := v_dp.order_id;
  SELECT coalesce(sum(amount_vnd), 0) INTO v_confirmed FROM core.direct_payment_confirmations WHERE direct_payment_id = NEW.direct_payment_id;
  SELECT coalesce(sum(amount_vnd), 0), count(*) INTO v_reported, v_n_reports FROM core.direct_payment_reports WHERE direct_payment_id = NEW.direct_payment_id;
  IF v_confirmed + NEW.amount_vnd > v_dp.amount_due_vnd THEN
    RAISE EXCEPTION 'Xác nhận vượt số phải trả (% + % > %)', v_confirmed, NEW.amount_vnd, v_dp.amount_due_vnd USING HINT = 'TIEN_VUOT_SO_PHAI_TRA';
  END IF;
  IF v_n_reports > 0 AND v_confirmed + NEW.amount_vnd > v_reported AND NEW.ops_decision_by IS NULL THEN
    RAISE EXCEPTION 'Xác nhận vượt số bên trả đã báo (% > %)', v_confirmed + NEW.amount_vnd, v_reported USING HINT = 'TIEN_VUOT_SO_BAO';
  END IF;
  IF NEW.result = 'full' AND v_confirmed + NEW.amount_vnd <> v_dp.amount_due_vnd THEN
    RAISE EXCEPTION 'Đã nhận đủ phải bằng số còn phải trả' USING HINT = 'ck_dpc_full';
  END IF;
  IF NEW.result = 'partial' AND v_confirmed + NEW.amount_vnd >= v_dp.amount_due_vnd THEN
    RAISE EXCEPTION 'Nhận một phần phải nhỏ hơn số còn phải trả' USING HINT = 'ck_dpc_partial';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_dpc_check BEFORE INSERT ON core.direct_payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION core.check_direct_payment_confirmation();

-- ---------------------------------------------------------------------
-- Quyết toán (04 mục 5–6). Mỗi lần chạy một hàng bất biến; CHECK kiểm công thức.
-- ---------------------------------------------------------------------
CREATE TABLE core.settlements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES core.orders (id),
  seq                smallint NOT NULL,                   -- 1, 2… (từng phần khi tranh chấp, rồi cuối)
  is_final           boolean NOT NULL,
  v_vnd              bigint NOT NULL,                     -- V (cuối) hoặc V_kt (từng phần)
  d_vnd              bigint NOT NULL,                     -- D: trả thẳng người bán ĐÃ xác nhận
  c_vnd              bigint NOT NULL,                     -- C: cọc ngân hàng đã xác nhận
  x_nb_vnd           bigint NOT NULL DEFAULT 0,           -- người bán phải trả bên mua (phạt Q04, phí kiểm định)
  x_bm_vnd           bigint NOT NULL DEFAULT 0,           -- bên mua phải trả người bán ngoài tiền hàng
  materials_offset_vnd bigint NOT NULL DEFAULT 0,         -- vật tư đối trừ (bao tiêu)
  n_vnd              bigint NOT NULL,                     -- N = V − X_nb + X_bm − vật tư
  prior_released_vnd bigint NOT NULL DEFAULT 0,           -- cọc đã chi tạm cho người bán ở lần trước
  c_nb_formula_vnd   bigint NOT NULL,                     -- C_nb theo bảng 04 mục 5 bước 2
  release_vnd        bigint NOT NULL,                     -- lệnh chi_coc_nb lần này
  refund_vnd         bigint NOT NULL,                     -- lệnh hoan_coc_bm lần này (chỉ ở lần cuối)
  t_bm_vnd           bigint NOT NULL,                     -- bên mua còn phải trả
  t_nb_vnd           bigint NOT NULL,                     -- người bán còn phải hoàn
  inputs             jsonb NOT NULL,                      -- dòng nghiệm thu, phạt, … đã dùng (để tái tính)
  computed_at        timestamptz NOT NULL DEFAULT now(),
  computed_by        uuid REFERENCES core.users (id),
  CONSTRAINT uq_settlement_seq UNIQUE (order_id, seq),
  CONSTRAINT ck_st_nonneg CHECK (v_vnd >= 0 AND d_vnd >= 0 AND c_vnd >= 0 AND x_nb_vnd >= 0 AND x_bm_vnd >= 0
        AND materials_offset_vnd >= 0 AND prior_released_vnd >= 0 AND release_vnd >= 0 AND refund_vnd >= 0 AND t_bm_vnd >= 0 AND t_nb_vnd >= 0),
  CONSTRAINT ck_st_n CHECK (n_vnd = v_vnd - x_nb_vnd + x_bm_vnd - materials_offset_vnd),
  -- Từng phần: chi tạm = min(C, max(0, V_kt − D)) − đã chi; không hoàn, không công nợ.
  CONSTRAINT ck_st_interim CHECK (is_final OR (
        release_vnd = greatest(0, least(c_vnd, greatest(0, n_vnd - d_vnd)) - prior_released_vnd)
        AND refund_vnd = 0 AND t_bm_vnd = 0 AND t_nb_vnd = 0)),
  -- Cuối: bảng 04 mục 5 bước 2, có trừ phần đã chi tạm (04 mục 6.4).
  CONSTRAINT ck_st_final CHECK (NOT is_final OR (
        c_nb_formula_vnd = CASE WHEN n_vnd >= d_vnd + c_vnd THEN c_vnd WHEN n_vnd >= d_vnd THEN n_vnd - d_vnd ELSE 0 END
        AND release_vnd = greatest(0, c_nb_formula_vnd - prior_released_vnd)
        AND refund_vnd = c_vnd - prior_released_vnd - release_vnd
        AND t_bm_vnd = greatest(0, n_vnd - d_vnd - c_vnd)
        AND t_nb_vnd = greatest(0, d_vnd - n_vnd) + greatest(0, prior_released_vnd - c_nb_formula_vnd))),
  -- Bất biến 04 mục 5: người bán thực nhận = N (khi mọi nghĩa vụ xong)
  CONSTRAINT ck_st_seller_net CHECK (NOT is_final OR d_vnd + prior_released_vnd + release_vnd + t_bm_vnd - t_nb_vnd = n_vnd),
  CONSTRAINT ck_st_deposit_split CHECK (prior_released_vnd + release_vnd + refund_vnd <= c_vnd)
);
COMMENT ON TABLE core.settlements IS 'Phép quyết toán. CHECK mã hóa đúng công thức 04 mục 5–6; backend tính sai là DB từ chối.';
CREATE UNIQUE INDEX uq_settlement_one_final ON core.settlements (order_id) WHERE is_final;
CREATE TRIGGER tg_settlement_immutable BEFORE UPDATE OR DELETE ON core.settlements
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE core.direct_payments ADD CONSTRAINT fk_dp_settlement FOREIGN KEY (settlement_id) REFERENCES core.settlements (id);

-- Khoản phải trả giữa hai bên theo hợp đồng (phạt thiếu lượng, phí kiểm định bên sai, phí kho bên sai)
CREATE TABLE core.contract_charges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES core.orders (id),
  kind             text NOT NULL,          -- shortfall_penalty | inspection_fee | storage_fee | disposal_cost | materials_offset
  payer_side       text NOT NULL,          -- seller (vào X_nb) | buyer (vào X_bm)
  amount_vnd       bigint NOT NULL,
  basis            jsonb NOT NULL,         -- phạt: {"short_qty":150000,"tier":3,"bps":10000,"deposit":13800000,"total_qty":2000000}
  source_entity    text,
  source_id        uuid,
  reverses_id      uuid REFERENCES core.contract_charges (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES core.users (id),
  CONSTRAINT ck_cc_kind CHECK (kind IN ('shortfall_penalty','inspection_fee','storage_fee','disposal_cost','materials_offset')),
  CONSTRAINT ck_cc_side CHECK (payer_side IN ('seller','buyer')),
  CONSTRAINT ck_cc_amount CHECK (amount_vnd <> 0 AND (reverses_id IS NOT NULL OR amount_vnd > 0))
);
COMMENT ON TABLE core.contract_charges IS 'Chỉ các khoản đã ghi trong hợp đồng (EG-12). Sai thì ghi dòng đảo (reverses_id), không sửa.';
CREATE INDEX ix_cc_order ON core.contract_charges (order_id);
CREATE TRIGGER tg_cc_immutable BEFORE UPDATE OR DELETE ON core.contract_charges
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
