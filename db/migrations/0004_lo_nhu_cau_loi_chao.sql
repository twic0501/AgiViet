-- =====================================================================
-- 0004 · Lô, nhu cầu (phiếu), lời chào (chào giá / báo giá kín), giữ lượng
--        Theo 03-vong-doi-don.md mục 1–4.
-- Giá kín (giá thấp nhất chịu bán của lô, giá tối đa của phiếu) nằm ở bảng *_private riêng,
-- RLS chỉ cho chủ sở hữu đọc (0014). Bên kia không bao giờ SELECT được con số.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Lô
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('lot','draft',     'Đang soạn',                 true,  false, 1, 'nhap'),
  ('lot','upcoming',  'Sắp có hàng (ước tính)',    false, false, 2, 'sap_co_hang'),
  ('lot','on_sale',   'Đang bán',                  false, false, 3, 'dang_ban'),
  ('lot','hidden',    'Tạm ẩn (quá 14 ngày)',      false, false, 4, 'tam_an'),
  ('lot','sold_out',  'Hết hàng',                  false, false, 5, 'het_hang'),
  ('lot','closed',    'Đã đóng',                   false, true,  6, 'da_dong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason, note_vi) VALUES
  ('lot','draft','on_sale',      ARRAY['seller','helper'], false, 'dang_lo'),
  ('lot','draft','upcoming',     ARRAY['seller','helper'], false, 'dang_lo (ước tính, ngày có hàng > hôm nay)'),
  ('lot','upcoming','on_sale',   ARRAY['seller','helper','system'], false, 'tới ngày có hàng (giả định, đặc tả chưa ghi)'),
  ('lot','on_sale','hidden',     ARRAY['system'],          false, 'het_han_hien_thi 14 ngày'),
  ('lot','hidden','on_sale',     ARRAY['seller','helper'], false, 'xac_nhan_con_hang'),
  ('lot','on_sale','sold_out',   ARRAY['system'],          false, 'khả dụng = 0 và giữ tạm = 0'),
  ('lot','sold_out','on_sale',   ARRAY['system'],          false, 'lượng trả về lô'),
  ('lot','draft','closed',       ARRAY['seller','helper'], false, 'dong_lo'),
  ('lot','upcoming','closed',    ARRAY['seller'],          false, 'dong_lo'),
  ('lot','on_sale','closed',     ARRAY['seller'],          false, 'dong_lo'),
  ('lot','hidden','closed',      ARRAY['seller','system'], false, 'dong_lo'),
  ('lot','sold_out','closed',    ARRAY['seller','system'], false, 'dong_lo');

CREATE TABLE core.lots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,                       -- LO-2026-000123; in trên tem QR
  seller_org_id      uuid NOT NULL REFERENCES core.organizations (id),
  product_id         uuid NOT NULL REFERENCES core.products (id),
  profile_version    integer NOT NULL,
  grade_code         text NOT NULL,
  variety            text,
  product_form       text,
  site_id            uuid REFERENCES core.production_sites (id),
  facility_id        uuid REFERENCES core.facilities (id),     -- lô nằm ở điểm gom/kho lạnh
  parent_lot_id      uuid REFERENCES core.lots (id),            -- lô con: tách loại, phần trả lại
  origin_order_id    uuid,                                       -- lô con sinh từ phần trả lại của đơn (FK ở 0005)
  is_pooled          boolean NOT NULL DEFAULT false,             -- lô gộp HTX (có phần đóng góp)
  qty_basis          text NOT NULL,                              -- estimated (ước tính) | weighed (đã cân)
  declared_qty       bigint NOT NULL,                            -- lượng khai lần đăng (đơn vị cơ sở); lượng hiện tại lấy từ sổ lượng
  available_from     date,
  harvest_on         date,
  spray_clear_on     date,                                       -- ngày hết cách ly thuốc: harvest_on < ngày này thì chặn
  ask_price_vnd      bigint,                                     -- giá mong muốn (đ/đơn vị giá), công khai dạng "so với mặt bằng"
  price_changed_at   timestamptz,
  last_confirmed_at  timestamptz,                                -- xác nhận còn hàng (14 ngày)
  urgent_sale_until  timestamptz,                                -- cờ bán gấp (không lộ cho bên mua)
  safety_locked_at   timestamptz,                                -- cờ khóa an toàn (Q17)
  safety_lock_reason text,
  is_substandard     boolean NOT NULL DEFAULT false,             -- loại dưới: chỉ hiện cho bên nhận hàng kém loại
  status             text NOT NULL DEFAULT 'draft',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  FOREIGN KEY (product_id, profile_version, grade_code) REFERENCES core.product_grades (product_id, profile_version, grade_code),
  CONSTRAINT ck_lot_basis CHECK (qty_basis IN ('estimated','weighed')),
  CONSTRAINT ck_lot_qty CHECK (declared_qty > 0),
  CONSTRAINT ck_lot_price CHECK (ask_price_vnd IS NULL OR ask_price_vnd > 0),
  CONSTRAINT ck_lot_spray CHECK (harvest_on IS NULL OR spray_clear_on IS NULL OR harvest_on >= spray_clear_on),
  CONSTRAINT ck_lot_parent CHECK (parent_lot_id IS NULL OR parent_lot_id <> id),
  CONSTRAINT ck_lot_safety CHECK ((safety_locked_at IS NULL) = (safety_lock_reason IS NULL)),
  CONSTRAINT ck_lot_safety_no_urgent CHECK (safety_locked_at IS NULL OR urgent_sale_until IS NULL),
  CONSTRAINT ck_lot_place CHECK (site_id IS NOT NULL OR facility_id IS NOT NULL OR status = 'draft')
);
COMMENT ON TABLE core.lots IS 'Lô hàng. Lượng KHÔNG lưu ở đây mà ở sổ lượng ledger.qty_*; declared_qty chỉ là lượng khai lần đầu.';
CREATE INDEX ix_lots_seller ON core.lots (seller_org_id, status);
CREATE INDEX ix_lots_search ON core.lots (product_id, grade_code, status) WHERE status IN ('on_sale','upcoming') AND safety_locked_at IS NULL;
CREATE INDEX ix_lots_parent ON core.lots (parent_lot_id) WHERE parent_lot_id IS NOT NULL;
CREATE INDEX ix_lots_confirm_due ON core.lots (last_confirmed_at) WHERE status = 'on_sale';
CREATE INDEX ix_lots_urgent ON core.lots (urgent_sale_until) WHERE urgent_sale_until IS NOT NULL;
CREATE TRIGGER tg_lot_status BEFORE INSERT OR UPDATE OF status ON core.lots
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('lot');
CREATE TRIGGER tg_lot_touch BEFORE UPDATE ON core.lots FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Giá kín của lô + lịch sử giá (sửa giá tối đa 1 lần / 24 giờ trừ khi bán gấp).
CREATE TABLE core.lot_price_versions (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lot_id           uuid NOT NULL REFERENCES core.lots (id),
  ask_price_vnd    bigint NOT NULL,          -- giá mong muốn
  floor_price_vnd  bigint NOT NULL,          -- giá thấp nhất chịu bán (KÍN) – mặc định 90% giá mong muốn
  ref_price_vnd    bigint,                   -- giá tham khảo lúc đặt (để hiện cảnh báo lịch sử)
  below_cost_ack   boolean NOT NULL DEFAULT false,
  set_at           timestamptz NOT NULL DEFAULT now(),
  set_by           uuid REFERENCES core.users (id),
  CONSTRAINT ck_lpv_prices CHECK (ask_price_vnd > 0 AND floor_price_vnd > 0 AND floor_price_vnd <= ask_price_vnd)
);
COMMENT ON TABLE core.lot_price_versions IS 'Giá của lô theo thời gian. floor_price_vnd là KÍN: RLS chỉ cho tổ chức bán đọc. Append-only.';
CREATE INDEX ix_lpv_lot ON core.lot_price_versions (lot_id, set_at DESC);
CREATE TRIGGER tg_lpv_immutable BEFORE UPDATE OR DELETE ON core.lot_price_versions
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION core.check_lot_price_rate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_last timestamptz; v_urgent timestamptz; v_status text;
BEGIN
  SELECT max(set_at) INTO v_last FROM core.lot_price_versions WHERE lot_id = NEW.lot_id;
  SELECT urgent_sale_until, status INTO v_urgent, v_status FROM core.lots WHERE id = NEW.lot_id;
  IF v_last IS NOT NULL AND v_status <> 'draft' AND NEW.set_at < v_last + interval '24 hours'
     AND (v_urgent IS NULL OR v_urgent < NEW.set_at) THEN
    RAISE EXCEPTION 'Giá lô chỉ được sửa 1 lần mỗi 24 giờ (lần trước %)', v_last USING HINT = 'ck_lot_price_rate';
  END IF;
  UPDATE core.lots SET ask_price_vnd = NEW.ask_price_vnd, price_changed_at = NEW.set_at WHERE id = NEW.lot_id;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_lpv_rate BEFORE INSERT ON core.lot_price_versions
  FOR EACH ROW EXECUTE FUNCTION core.check_lot_price_rate();

-- Phần đóng góp của lô gộp HTX / tổ hợp tác (spec 12.5): hộ, lượng, tem kiện QR riêng.
CREATE TABLE core.lot_contributions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id           uuid NOT NULL REFERENCES core.lots (id),
  household_org_id uuid NOT NULL REFERENCES core.organizations (id),
  source_lot_id    uuid REFERENCES core.lots (id),         -- lô của hộ (nếu hộ có tài khoản)
  qty              bigint NOT NULL,
  growing_area_code text,                                  -- xuất khẩu: mã vùng trồng từng phần
  authorization_doc_id uuid,                               -- giấy ủy quyền (tổ hợp tác) – FK ở 0005
  consented_at     timestamptz,                            -- hộ đồng ý trên app
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contribution UNIQUE (lot_id, household_org_id),
  CONSTRAINT ck_contribution_qty CHECK (qty > 0)
);
CREATE INDEX ix_contribution_household ON core.lot_contributions (household_org_id);

-- ---------------------------------------------------------------------
-- Nhu cầu mua (phiếu)
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('demand','draft',     'Nháp',        true,  false, 1, 'nhap'),
  ('demand','open',      'Đang mở',     false, false, 2, 'dang_mo'),
  ('demand','fulfilled', 'Đủ lượng',    false, true,  3, 'du_luong'),
  ('demand','expired',   'Hết hạn',     false, true,  4, 'het_han'),
  ('demand','closed',    'Đã đóng',     false, true,  5, 'da_dong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason, note_vi) VALUES
  ('demand','draft','open',       ARRAY['buyer'],  false, 'dang_nhu_cau'),
  ('demand','draft','closed',     ARRAY['buyer'],  false, 'bỏ nháp'),
  ('demand','open','fulfilled',   ARRAY['system'], false, 'lượng có đơn hiệu lực ≥ lượng cần'),
  ('demand','open','expired',     ARRAY['system'], false, 'het_han_ngay_can'),
  ('demand','open','closed',      ARRAY['buyer'],  false, 'dong_nhu_cau');

CREATE TABLE core.demands (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  buyer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  segment_code       text NOT NULL REFERENCES ref.buyer_segments (code),
  product_id         uuid NOT NULL REFERENCES core.products (id),
  profile_version    integer NOT NULL,
  is_recurring       boolean NOT NULL DEFAULT false,
  recurrence         jsonb,                        -- định kỳ: mỗi lần bao nhiêu, bao lâu một lần, trong bao lâu
  demand_form        text,                         -- suy ra: single_lot | needs_pooling | recurring_small | pre_season
  needed_during      daterange NOT NULL,           -- ngày cần (khoảng)
  delivery_mode      text NOT NULL,                -- self_pickup | delivered
  delivery_facility_id uuid REFERENCES core.facilities (id),
  delivery_commune_code text REFERENCES ref.communes (code),
  required_docs      text[] NOT NULL DEFAULT '{}', -- bộ lọc cứng (ref.document_kinds)
  accepts_substandard boolean NOT NULL DEFAULT false,
  status             text NOT NULL DEFAULT 'draft',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  deleted_at         timestamptz,                  -- xóa mềm chỉ cho nháp
  FOREIGN KEY (product_id, profile_version) REFERENCES core.product_profiles (product_id, profile_version),
  CONSTRAINT ck_demand_form CHECK (demand_form IS NULL OR demand_form IN ('single_lot','needs_pooling','recurring_small','pre_season')),
  CONSTRAINT ck_demand_mode CHECK (delivery_mode IN ('self_pickup','delivered')),
  CONSTRAINT ck_demand_recur CHECK (is_recurring = (recurrence IS NOT NULL)),
  CONSTRAINT ck_demand_soft_delete CHECK (deleted_at IS NULL OR status = 'draft')
);
CREATE INDEX ix_demands_buyer ON core.demands (buyer_org_id, status);
CREATE INDEX ix_demands_match ON core.demands (product_id, status) WHERE status = 'open';
CREATE TRIGGER tg_demand_status BEFORE INSERT OR UPDATE OF status ON core.demands
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('demand');
CREATE TRIGGER tg_demand_touch BEFORE UPDATE ON core.demands FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

CREATE TABLE core.demand_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id    uuid NOT NULL REFERENCES core.demands (id),
  grade_code   text NOT NULL,
  qty          bigint NOT NULL,                -- lượng cần (đơn vị cơ sở)
  CONSTRAINT uq_demand_line_grade UNIQUE (demand_id, grade_code),
  CONSTRAINT ck_demand_line_qty CHECK (qty > 0)
);

-- Giá tối đa KÍN theo dòng; chỉ tăng (spec 2: "giá tối đa chỉ tăng"). Append-only.
CREATE TABLE core.demand_line_max_prices (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  demand_line_id uuid NOT NULL REFERENCES core.demand_lines (id),
  max_price_vnd  bigint NOT NULL,
  set_at         timestamptz NOT NULL DEFAULT now(),
  set_by         uuid REFERENCES core.users (id),
  CONSTRAINT ck_dlmp_price CHECK (max_price_vnd > 0)
);
COMMENT ON TABLE core.demand_line_max_prices IS 'Giá tối đa kín của dòng nhu cầu. RLS: chỉ tổ chức mua đọc. Chỉ được tăng.';
CREATE INDEX ix_dlmp_line ON core.demand_line_max_prices (demand_line_id, id DESC);
CREATE TRIGGER tg_dlmp_immutable BEFORE UPDATE OR DELETE ON core.demand_line_max_prices
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.check_demand_price_up() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_prev bigint;
BEGIN
  SELECT max_price_vnd INTO v_prev FROM core.demand_line_max_prices
   WHERE demand_line_id = NEW.demand_line_id ORDER BY id DESC LIMIT 1;
  IF v_prev IS NOT NULL AND NEW.max_price_vnd < v_prev THEN
    RAISE EXCEPTION 'Giá tối đa của phiếu chỉ được tăng (% < %)', NEW.max_price_vnd, v_prev USING HINT = 'ck_demand_price_up';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_dlmp_up BEFORE INSERT ON core.demand_line_max_prices
  FOR EACH ROW EXECUTE FUNCTION core.check_demand_price_up();

-- Hồ sơ "Nhận hàng kém loại" của bên mua (và giá sàn của đối tác bao tiêu).
CREATE TABLE core.substandard_receivers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id     uuid NOT NULL REFERENCES core.organizations (id),
  product_id       uuid NOT NULL REFERENCES core.products (id),
  grade_codes      text[] NOT NULL,
  min_qty          bigint NOT NULL DEFAULT 0,
  radius_km        integer NOT NULL DEFAULT 50,
  standing_price_vnd bigint,                         -- giá chào sẵn
  is_offtake_partner boolean NOT NULL DEFAULT false, -- đối tác bao tiêu: giá sàn theo mùa
  floor_price_vnd  bigint,                           -- giá sàn bao tiêu (công khai với người bán bán gấp)
  valid_during     daterange NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_ssr_partner CHECK (NOT is_offtake_partner OR floor_price_vnd IS NOT NULL),
  CONSTRAINT ck_ssr_radius CHECK (radius_km > 0)
);
CREATE INDEX ix_ssr_product ON core.substandard_receivers (product_id);

-- ---------------------------------------------------------------------
-- Lời chào: chao_gia (bên mua → lô) và bao_gia (người bán → nhu cầu, kín)
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('offer','sent',          'Đã gửi',                         true,  false, 1, 'da_gui'),
  ('offer','auto_rejected', 'Chưa tới mức người bán chấp nhận', true, true,  2, 'tu_tu_choi'),
  ('offer','accepted',      'Đã đồng ý giá',                  false, true,  3, 'da_dong_y'),
  ('offer','rejected',      'Bị từ chối',                     false, true,  4, 'tu_choi'),
  ('offer','withdrawn',     'Đã rút',                         false, true,  5, 'da_rut'),
  ('offer','expired',       'Hết hạn',                        false, true,  6, 'het_han');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason, note_vi) VALUES
  ('offer','sent','accepted',  ARRAY['seller','buyer'], false, 'dong_y (bên nhận)'),
  ('offer','sent','rejected',  ARRAY['seller','buyer'], false, 'tu_choi (bên nhận)'),
  ('offer','sent','withdrawn', ARRAY['seller','buyer'], false, 'rut (bên gửi, chưa có trả lời)'),
  ('offer','sent','expired',   ARRAY['system'],         false, 'het_han_tra_loi; hoặc lô khóa an toàn, phiếu hết hạn');

CREATE TABLE core.offers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  direction          text NOT NULL,                  -- buyer_bid (chao_gia) | seller_quote (bao_gia)
  lot_id             uuid NOT NULL REFERENCES core.lots (id),
  demand_line_id     uuid REFERENCES core.demand_lines (id),
  buyer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  seller_org_id      uuid NOT NULL REFERENCES core.organizations (id),
  current_round      smallint NOT NULL DEFAULT 1,
  buyer_counters     smallint NOT NULL DEFAULT 0,    -- số lần bên mua đã trả giá (≤ 2)
  seller_counters    smallint NOT NULL DEFAULT 0,
  response_hours     smallint NOT NULL DEFAULT 24,   -- 24; vựa 6 hoặc 12
  status             text NOT NULL DEFAULT 'sent',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_offer_direction CHECK (direction IN ('buyer_bid','seller_quote')),
  CONSTRAINT ck_offer_quote_needs_demand CHECK (direction = 'buyer_bid' OR demand_line_id IS NOT NULL),
  CONSTRAINT ck_offer_counters CHECK (buyer_counters BETWEEN 0 AND 2 AND seller_counters BETWEEN 0 AND 2),
  CONSTRAINT ck_offer_parties CHECK (buyer_org_id <> seller_org_id),
  CONSTRAINT ck_offer_hours CHECK (response_hours IN (6, 12, 24))
);
CREATE INDEX ix_offers_lot ON core.offers (lot_id, status);
CREATE INDEX ix_offers_demand ON core.offers (demand_line_id, status) WHERE demand_line_id IS NOT NULL;
CREATE INDEX ix_offers_buyer ON core.offers (buyer_org_id, status);
CREATE INDEX ix_offers_seller ON core.offers (seller_org_id, status);
-- Một bên mua chỉ có một lời chào đang mở cho cùng một lô.
CREATE UNIQUE INDEX uq_offer_open_per_lot_buyer ON core.offers (lot_id, buyer_org_id) WHERE status = 'sent';
CREATE TRIGGER tg_offer_status BEFORE INSERT OR UPDATE OF status ON core.offers
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('offer');
CREATE TRIGGER tg_offer_touch BEFORE UPDATE ON core.offers FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Mỗi lượt chào / trả giá là một dòng bất biến.
CREATE TABLE core.offer_rounds (
  offer_id       uuid NOT NULL REFERENCES core.offers (id),
  round_no       smallint NOT NULL,
  from_side      text NOT NULL,                    -- buyer | seller
  price_vnd      bigint NOT NULL,                  -- đ/đơn vị giá
  qty            bigint NOT NULL,
  ref_price_vnd  bigint,                           -- giá tham khảo lúc gửi (để cảnh báo, chặn < 60%)
  below_ref_warned boolean NOT NULL DEFAULT false, -- < 80% đã cảnh báo người gửi
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES core.users (id),
  PRIMARY KEY (offer_id, round_no),
  CONSTRAINT ck_round_side CHECK (from_side IN ('buyer','seller')),
  CONSTRAINT ck_round_values CHECK (price_vnd > 0 AND qty > 0),
  CONSTRAINT ck_round_no CHECK (round_no BETWEEN 1 AND 5),       -- 1 lời chào + tối đa 2 trả giá mỗi bên
  CONSTRAINT ck_round_floor_60 CHECK (from_side = 'seller' OR ref_price_vnd IS NULL OR price_vnd * 100 >= ref_price_vnd * 60)
);
COMMENT ON TABLE core.offer_rounds IS 'Lượt chào giá. Bên mua chào dưới 60% giá tham khảo bị chặn ngay ở DB (K12).';
CREATE TRIGGER tg_round_immutable BEFORE UPDATE OR DELETE ON core.offer_rounds
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Giữ lượng (24 giờ; gia hạn tới hạn cọc khi đơn sang chờ cọc)
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('hold','active',    'Đang giữ',              true,  false, 1, 'dang_giu'),
  ('hold','expired',   'Hết hạn',               false, true,  2, 'het_han'),
  ('hold','committed', 'Đã chuyển cam kết',     false, true,  3, 'da_chuyen_cam_ket'),
  ('hold','cancelled', 'Đã hủy',                false, true,  4, 'da_huy');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('hold','active','expired',   ARRAY['system']),
  ('hold','active','committed', ARRAY['system','bank']),
  ('hold','active','cancelled', ARRAY['system','buyer','seller']);

CREATE TABLE core.holds (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id             uuid NOT NULL REFERENCES core.lots (id),
  offer_id           uuid NOT NULL UNIQUE REFERENCES core.offers (id),
  order_id           uuid,                                  -- gắn khi lập đơn (FK ở 0005)
  qty                bigint NOT NULL,
  expires_at         timestamptz NOT NULL,
  status             text NOT NULL DEFAULT 'active',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_hold_qty CHECK (qty > 0)
);
CREATE INDEX ix_holds_expiry ON core.holds (expires_at) WHERE status = 'active';
CREATE INDEX ix_holds_lot ON core.holds (lot_id) WHERE status = 'active';
CREATE TRIGGER tg_hold_status BEFORE INSERT OR UPDATE OF status ON core.holds
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('hold');
CREATE TRIGGER tg_hold_touch BEFORE UPDATE ON core.holds FOR EACH ROW EXECUTE FUNCTION ref.touch_row();
