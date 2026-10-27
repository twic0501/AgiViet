-- =====================================================================
-- 0003 · Danh mục mặt hàng, hồ sơ ngành hàng có phiên bản (01-mat-hang.md),
--        địa điểm sản xuất (vườn/ao/ruộng), cơ sở (kho, điểm gom, kho lạnh).
-- =====================================================================

CREATE TABLE ref.product_groups (
  code     text PRIMARY KEY,
  label_vi text NOT NULL
);
INSERT INTO ref.product_groups VALUES
  ('fresh_fruit', 'Trái cây tươi'),
  ('aquaculture', 'Thủy sản nuôi'),
  ('grain',       'Lương thực');

-- Mặt hàng (định danh ổn định). Cấu hình chi tiết nằm ở phiên bản hồ sơ.
CREATE TABLE core.products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,              -- spec: ma (XOAI_CAT_CHU, TOM_THE, ...)
  name_vi        text NOT NULL,
  search_names   text[] NOT NULL DEFAULT '{}',      -- tên địa phương, không dấu
  group_code     text NOT NULL REFERENCES ref.product_groups (code),
  open_tier      smallint NOT NULL,                 -- spec cap_mo: 1 mở ngay, 2 cần kiểm định, 3 nhánh kém loại/chế biến; 0 = chỉ ghi sổ
  base_unit      text NOT NULL DEFAULT 'g',         -- đơn vị lưu lượng nhỏ nhất
  price_unit     text NOT NULL DEFAULT 'kg',        -- đơn vị giá
  price_unit_base_qty bigint NOT NULL DEFAULT 1000, -- 1 kg = 1000 g
  current_profile_version integer,                  -- phiên bản hồ sơ đang dùng cho đơn MỚI
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_product_tier CHECK (open_tier BETWEEN 0 AND 3),
  CONSTRAINT ck_product_unit CHECK (base_unit IN ('g','piece') AND price_unit IN ('kg','piece')),
  CONSTRAINT ck_product_unit_qty CHECK (price_unit_base_qty > 0)
);
CREATE TRIGGER tg_product_touch BEFORE UPDATE ON core.products FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Hồ sơ ngành hàng có phiên bản: hợp đồng trỏ tới đúng phiên bản lúc ký; bất biến.
CREATE TABLE core.product_profiles (
  product_id          uuid NOT NULL REFERENCES core.products (id),
  profile_version     integer NOT NULL,
  quality_mode        text NOT NULL,                 -- spec kieu_chat_luong: grade (loai), size_table (bang_co), moisture (do_am)
  varieties           text[] NOT NULL DEFAULT '{}',  -- giong
  product_forms       text[] NOT NULL DEFAULT '{}',  -- dang_san_pham
  qty_tolerance_bps   integer NOT NULL,              -- dung_sai_luong (±), 500 = 5%
  reject_allowance_bps integer NOT NULL,             -- loi_cho_phep: trả lại không cần ảnh
  seal_sample_desc    text,                          -- mau_doi_chung
  silent_accept_hours integer,                       -- han_nghiem_thu_im_lang ở nơi đến (NULL = không có)
  shelf_life_days     integer,                       -- thời gian sống nhiệt thường; ≤ 10 ngày = hàng tươi (hạn cọc 12 giờ)
  storage_note        text,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,  -- phần mô tả mềm: giấy tờ, kiểm định, hợp đồng gợi ý, rủi ro (không dùng cho tính tiền)
  effective_from      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES core.users (id),
  PRIMARY KEY (product_id, profile_version),
  CONSTRAINT ck_profile_quality CHECK (quality_mode IN ('grade','size_table','moisture')),
  CONSTRAINT ck_profile_tol CHECK (qty_tolerance_bps BETWEEN 0 AND 5000),
  CONSTRAINT ck_profile_reject CHECK (reject_allowance_bps BETWEEN 0 AND 10000)
);
COMMENT ON TABLE core.product_profiles IS 'Hồ sơ ngành hàng (spec ho_so_nganh_hang) theo phiên bản. Bất biến; đổi = phiên bản mới.';
CREATE TRIGGER tg_profile_immutable BEFORE UPDATE OR DELETE ON core.product_profiles
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE core.products ADD CONSTRAINT fk_product_current_profile
  FOREIGN KEY (id, current_profile_version) REFERENCES core.product_profiles (product_id, profile_version)
  DEFERRABLE INITIALLY DEFERRED;

-- Bảng loại (L1/L2/L3/dạt; A/B/C) của từng phiên bản hồ sơ.
CREATE TABLE core.product_grades (
  product_id       uuid NOT NULL,
  profile_version  integer NOT NULL,
  grade_code       text NOT NULL,                    -- L1, L2, L3, DAT, A, B, C ...
  label_vi         text NOT NULL,
  rank             smallint NOT NULL,                -- 1 = cao nhất
  is_substandard   boolean NOT NULL DEFAULT false,   -- loại dưới: kênh hàng kém loại
  criteria         text NOT NULL,                    -- chỉ tiêu (khoảng trọng lượng, khuyết tật)
  sample_photo_keys text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (product_id, profile_version, grade_code),
  FOREIGN KEY (product_id, profile_version) REFERENCES core.product_profiles (product_id, profile_version),
  CONSTRAINT uq_grade_rank UNIQUE (product_id, profile_version, rank)
);
CREATE TRIGGER tg_grade_immutable BEFORE UPDATE OR DELETE ON core.product_grades
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Lý do trả lại / hạ cấp có mã (spec ly_do_tra_lai).
CREATE TABLE core.product_reject_reasons (
  product_id       uuid NOT NULL,
  profile_version  integer NOT NULL,
  reason_code      text NOT NULL,                    -- DAP, THOI, SAU_DUC, SAI_GIONG ...
  label_vi         text NOT NULL,
  is_safety        boolean NOT NULL DEFAULT false,   -- lý do an toàn (dư lượng, kháng sinh): khóa lô (Q17)
  PRIMARY KEY (product_id, profile_version, reason_code),
  FOREIGN KEY (product_id, profile_version) REFERENCES core.product_profiles (product_id, profile_version)
);
CREATE TRIGGER tg_reason_immutable BEFORE UPDATE OR DELETE ON core.product_reject_reasons
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Hao hụt đường cho phép theo điều kiện chuyến (spec hao_hut_duong[]).
CREATE TABLE core.product_transit_loss (
  product_id       uuid NOT NULL,
  profile_version  integer NOT NULL,
  vehicle_kind     text NOT NULL,                    -- normal, reefer, boat
  max_hours        integer NOT NULL,                 -- chuyến tối đa bao nhiêu giờ; 0 = mọi thời lượng
  allowance_bps    integer NOT NULL,                 -- 200 = 2%
  extra_bps_per_day integer NOT NULL DEFAULT 0,      -- xoài: +1%/ngày khi > 24 giờ
  PRIMARY KEY (product_id, profile_version, vehicle_kind, max_hours),
  FOREIGN KEY (product_id, profile_version) REFERENCES core.product_profiles (product_id, profile_version),
  CONSTRAINT ck_transit_vehicle CHECK (vehicle_kind IN ('normal','reefer','boat')),
  CONSTRAINT ck_transit_bps CHECK (allowance_bps BETWEEN 0 AND 5000)
);

-- Giấy tờ (bộ lọc cứng khi ghép).
CREATE TABLE ref.document_kinds (
  code       text PRIMARY KEY,
  label_vi   text NOT NULL,
  has_expiry boolean NOT NULL DEFAULT true
);
INSERT INTO ref.document_kinds VALUES
  ('growing_area_code',  'Mã số vùng trồng',                 true),
  ('packing_house_code', 'Mã cơ sở đóng gói',                true),
  ('spray_diary',        'Nhật ký cách ly thuốc',            false),
  ('pond_diary',         'Nhật ký ao (thả, thuốc, ngừng thuốc)', false),
  ('residue_test',       'Kết quả kiểm dư lượng',            true),
  ('antibiotic_test',    'Kết quả test kháng sinh',          true),
  ('cadmium_test',       'Kết quả kiểm cadimi, vàng O',      true),
  ('vietgap',            'Chứng nhận VietGAP',               true),
  ('asc_bap',            'Chứng nhận ASC/BAP',               true),
  ('phytosanitary',      'Kiểm dịch thực vật',               true);

-- ---------------------------------------------------------------------
-- Địa điểm sản xuất (vườn, ao, ruộng) của người bán
-- ---------------------------------------------------------------------
CREATE TABLE core.production_sites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES core.organizations (id),
  kind           text NOT NULL,                     -- orchard (vườn), pond (ao), field (ruộng)
  name           text NOT NULL,
  commune_code   text REFERENCES ref.communes (code),
  lat            double precision,
  lng            double precision,
  area_m2        bigint,
  address_detail text,                              -- KHÔNG công khai; chỉ lộ sau cọc (04-bao-mat)
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES core.users (id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  deleted_at     timestamptz,                       -- xóa mềm: người dùng tự tạo, có thể bỏ
  CONSTRAINT ck_site_kind CHECK (kind IN ('orchard','pond','field')),
  CONSTRAINT ck_site_latlng CHECK ((lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN 8 AND 24 AND lng BETWEEN 102 AND 110)))
);
CREATE INDEX ix_site_org ON core.production_sites (org_id) WHERE deleted_at IS NULL;
CREATE TRIGGER tg_site_touch BEFORE UPDATE ON core.production_sites FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Giấy tờ gắn tổ chức/địa điểm (mã vùng trồng, VietGAP...). Tệp nằm ở core.documents (0005).
CREATE TABLE core.certifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES core.organizations (id),
  site_id        uuid REFERENCES core.production_sites (id),
  product_id     uuid REFERENCES core.products (id),
  kind           text NOT NULL REFERENCES ref.document_kinds (code),
  number         text,
  market         text,                              -- thị trường áp dụng (CN, US, EU...) với mã vùng trồng
  valid_during   daterange,
  verified_by    uuid REFERENCES core.users (id),   -- nhân viên đã đối chiếu
  verified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz
);
CREATE INDEX ix_cert_org_kind ON core.certifications (org_id, kind) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------
-- Cơ sở: kho bên mua, điểm gom HTX, kho lạnh đối tác, bến nhà máy
-- ---------------------------------------------------------------------
CREATE TABLE core.facilities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES core.organizations (id),
  kind           text NOT NULL,                     -- buyer_warehouse, collection_point, cold_storage, factory_dock, restaurant
  name           text NOT NULL,
  commune_code   text REFERENCES ref.communes (code),
  lat            double precision,
  lng            double precision,
  address_detail text,
  cold_min_dc    integer,                           -- dải nhiệt kho lạnh, phần mười độ C
  cold_max_dc    integer,
  capacity_kg    bigint,
  collection_fee_vnd_per_kg bigint,                 -- phí gom của điểm gom (ghi trong hợp đồng)
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_facility_kind CHECK (kind IN ('buyer_warehouse','collection_point','cold_storage','factory_dock','restaurant')),
  CONSTRAINT ck_facility_cold CHECK (cold_min_dc IS NULL OR cold_max_dc IS NULL OR cold_min_dc <= cold_max_dc),
  CONSTRAINT ck_facility_fee CHECK (collection_fee_vnd_per_kg IS NULL OR collection_fee_vnd_per_kg >= 0)
);
CREATE INDEX ix_facility_org ON core.facilities (org_id) WHERE active;
CREATE TRIGGER tg_facility_touch BEFORE UPDATE ON core.facilities FOR EACH ROW EXECUTE FUNCTION ref.touch_row();
