-- =====================================================================
-- 0002 · Tổ chức, người dùng, thành viên, vai trò, người giúp (ủy quyền),
--        dữ liệu cá nhân nhạy cảm (schema pii), tài khoản nhận tiền.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tham chiếu địa bàn (tỉnh/xã sau sáp nhập 2025: 2 cấp). Mã theo danh mục hành chính.
-- ---------------------------------------------------------------------
CREATE TABLE ref.provinces (
  code     text PRIMARY KEY,
  name_vi  text NOT NULL
);
CREATE TABLE ref.communes (
  code           text PRIMARY KEY,
  province_code  text NOT NULL REFERENCES ref.provinces (code),
  name_vi        text NOT NULL,
  lat            double precision,   -- tâm xã: dùng tính khoảng cách gần đúng khi chưa có tọa độ vườn
  lng            double precision
);
CREATE INDEX ix_communes_province ON ref.communes (province_code);

-- ---------------------------------------------------------------------
-- Tổ chức: hộ, HTX, tổ hợp tác, doanh nghiệp, vựa, đối tác dịch vụ, chính AgiViet
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order) VALUES
  ('organization','pending',   'Chờ xác minh',     true,  false, 1),
  ('organization','active',    'Đang hoạt động',   false, false, 2),
  ('organization','suspended', 'Tạm khóa',         false, false, 3),
  ('organization','closed',    'Đã đóng',          false, true,  4);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason) VALUES
  ('organization','pending','active',     ARRAY['ops','system'], false),
  ('organization','pending','closed',     NULL,                  true),
  ('organization','active','suspended',   ARRAY['ops','system'], true),
  ('organization','suspended','active',   ARRAY['ops'],          true),
  ('organization','active','closed',      ARRAY['ops'],          true),
  ('organization','suspended','closed',   ARRAY['ops'],          true);

CREATE TABLE core.organizations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,                 -- mã hiển thị: TC-000123
  kind               text NOT NULL,
  display_name       text NOT NULL,
  legal_name         text,                                 -- tên theo giấy phép (doanh nghiệp, HTX)
  tax_code           text,                                 -- MST doanh nghiệp/HTX; hộ có thể không có
  province_code      text REFERENCES ref.provinces (code),
  commune_code       text REFERENCES ref.communes (code),
  can_sell           boolean NOT NULL DEFAULT false,       -- vai bán (app Nhà sản xuất)
  can_buy            boolean NOT NULL DEFAULT false,       -- vai mua (app Thu mua); vựa có thể cả hai
  verification_level smallint NOT NULL DEFAULT 0,          -- 0 số điện thoại, 1 eKYC/MST, 2 đối chiếu hồ sơ tổ chức
  is_platform        boolean NOT NULL DEFAULT false,       -- chính AgiViet (đối tác trong sổ cái phí)
  status             text NOT NULL DEFAULT 'pending',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_org_kind CHECK (kind IN ('household','cooperative','coop_group','enterprise','trader','service_partner','platform')),
  -- household = hộ/trang trại (ho), cooperative = HTX (htx), coop_group = tổ hợp tác (to_hop_tac),
  -- enterprise = doanh nghiệp/nhà máy/nhà hàng, trader = vựa, đầu mối, service_partner = ngân hàng/kiểm định/nhà xe/kho
  CONSTRAINT ck_org_role CHECK (can_sell OR can_buy OR kind IN ('service_partner','platform')),
  CONSTRAINT ck_org_verif CHECK (verification_level BETWEEN 0 AND 2),
  CONSTRAINT ck_org_tax_code CHECK (tax_code IS NULL OR tax_code ~ '^[0-9]{10}([0-9]{3})?$'),
  CONSTRAINT ck_org_platform CHECK (is_platform = (kind = 'platform'))
);
COMMENT ON TABLE core.organizations IS 'Chủ thể giao dịch. Mọi dữ liệu nghiệp vụ thuộc một tổ chức. Một vựa có thể vừa bán vừa mua.';
-- Phân khúc bên mua (K24): suy ra dần, một tổ chức có thể nhiều phân khúc; phiếu và đơn mang phân khúc riêng.
CREATE TABLE ref.buyer_segments (
  code      text PRIMARY KEY,
  spec_code text NOT NULL UNIQUE,
  label_vi  text NOT NULL
);
INSERT INTO ref.buyer_segments VALUES
  ('export',     'xuat_khau', 'Xuất khẩu'),
  ('processor',  'che_bien',  'Chế biến'),
  ('horeca',     'nha_hang',  'Nhà hàng, quán ăn'),
  ('wholesaler', 'dau_moi',   'Vựa, đầu mối');

CREATE TABLE core.org_buyer_segments (
  org_id        uuid NOT NULL REFERENCES core.organizations (id),
  segment_code  text NOT NULL REFERENCES ref.buyer_segments (code),
  source        text NOT NULL,              -- declared (tự chọn lúc đăng ký), inferred (suy ra), confirmed (đã hỏi xác nhận)
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, segment_code),
  CONSTRAINT ck_obs_source CHECK (source IN ('declared','inferred','confirmed'))
);

CREATE UNIQUE INDEX uq_org_tax_code ON core.organizations (tax_code) WHERE tax_code IS NOT NULL;
CREATE UNIQUE INDEX uq_org_single_platform ON core.organizations (is_platform) WHERE is_platform;
CREATE INDEX ix_org_area ON core.organizations (province_code, commune_code);
CREATE TRIGGER tg_org_status BEFORE INSERT OR UPDATE OF status ON core.organizations
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('organization');
CREATE TRIGGER tg_org_touch BEFORE UPDATE ON core.organizations
  FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- ---------------------------------------------------------------------
-- Người dùng (danh tính đăng nhập). Số điện thoại và giấy tờ nằm ở pii.
-- ---------------------------------------------------------------------
CREATE TABLE core.users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name      text NOT NULL,
  locale            text NOT NULL DEFAULT 'vi',
  is_staff          boolean NOT NULL DEFAULT false,      -- nhân viên AgiViet (vận hành, hiện trường, kiểm định)
  last_recovery_at  timestamptz,                         -- khôi phục tài khoản/đổi SIM: kích hoạt thời gian chờ dài cho thao tác nhạy cảm
  disabled_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_user_locale CHECK (locale IN ('vi','en'))
);
CREATE TRIGGER tg_user_touch BEFORE UPDATE ON core.users FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- ---------------------------------------------------------------------
-- Vai trò trong tổ chức (bảng tham chiếu, thay cho chuỗi csv của schema cũ)
-- ---------------------------------------------------------------------
CREATE TABLE ref.roles (
  code        text PRIMARY KEY,
  side        text NOT NULL,          -- seller, buyer, both
  label_vi    text NOT NULL,
  can_sign    boolean NOT NULL DEFAULT false,   -- được ký hợp đồng thay tổ chức
  can_pay     boolean NOT NULL DEFAULT false,   -- được ra lệnh nạp/chi tiền
  can_payout_admin boolean NOT NULL DEFAULT false, -- được đổi tài khoản nhận tiền
  CONSTRAINT ck_role_side CHECK (side IN ('seller','buyer','both'))
);
-- Vai theo 02-phan-khuc-ben-mua.md mục 3.2 và 4 (Q13). spec_code = mã trong đặc tả nghiệp vụ.
ALTER TABLE ref.roles ADD COLUMN spec_code text;
INSERT INTO ref.roles (code, side, label_vi, can_sign, can_pay, can_payout_admin, spec_code) VALUES
  ('owner',             'both',   'Chủ tài khoản / chủ, quản lý',                 true,  true,  true,  'quan_ly'),
  ('purchaser',         'buyer',  'Mua hàng: phiếu, chào giá, soạn HĐ, ký trong hạn mức', true, false, false, 'mua_hang'),
  ('accountant',        'both',   'Kế toán: chuyển cọc, ghi đã trả, xác nhận tiền, bảng kê', false, true, false, 'ke_toan'),
  ('warehouse',         'buyer',  'Kho, kiểm hàng: ký nhận, nghiệm thu 3 phần',   false, false, false, 'kho'),
  ('site_receiver',     'buyer',  'Người nhận tại điểm: QR nhận hàng, ký nhận',   false, false, false, 'nguoi_nhan'),
  ('coop_board',        'seller', 'HTX: chủ nhiệm, ban điều hành (ký, cho nợ thêm, duyệt phân bổ)', true, true, false, 'htx_ban_dieu_hanh'),
  ('collection_staff',  'seller', 'HTX: nhân viên điểm gom (cân, chia loại, biên bản)', false, false, false, 'htx_diem_gom'),
  ('coop_member',       'seller', 'Hộ thành viên HTX: chỉ xem phần của mình, báo sai, xác nhận HTX đã chi', false, false, false, 'ho_thanh_vien');

INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order) VALUES
  ('membership','invited',  'Đã mời',     true,  false, 1),
  ('membership','active',   'Đang dùng',  true,  false, 2),
  ('membership','suspended','Tạm dừng',   false, false, 3),
  ('membership','revoked',  'Đã thu hồi', false, true,  4);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason) VALUES
  ('membership','invited','active',    NULL, false),
  ('membership','invited','revoked',   NULL, false),
  ('membership','active','suspended',  NULL, true),
  ('membership','suspended','active',  NULL, false),
  ('membership','active','revoked',    NULL, true),
  ('membership','suspended','revoked', NULL, true);

CREATE TABLE core.memberships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES core.organizations (id),
  user_id           uuid NOT NULL REFERENCES core.users (id),
  title             text,
  approval_limit_vnd bigint,                       -- hạn mức tự quyết; đơn trên mức cần người có vai approver
  status            text NOT NULL DEFAULT 'active',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES core.users (id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           integer NOT NULL DEFAULT 1,
  CONSTRAINT uq_membership UNIQUE (org_id, user_id),
  CONSTRAINT ck_membership_limit CHECK (approval_limit_vnd IS NULL OR approval_limit_vnd >= 0)
);
CREATE INDEX ix_membership_user ON core.memberships (user_id) WHERE status = 'active';
CREATE TRIGGER tg_membership_status BEFORE INSERT OR UPDATE OF status ON core.memberships
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('membership');
CREATE TRIGGER tg_membership_touch BEFORE UPDATE ON core.memberships FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

CREATE TABLE core.membership_roles (
  membership_id uuid NOT NULL REFERENCES core.memberships (id),
  role_code     text NOT NULL REFERENCES ref.roles (code),
  granted_by    uuid REFERENCES core.users (id),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role_code)
);
COMMENT ON TABLE core.membership_roles IS 'Vai trò của thành viên. Thu hồi = xóa dòng (ghi evt.audit_log ở backend).';

-- ---------------------------------------------------------------------
-- Người giúp: ủy quyền giới hạn (con cháu bấm thay, cán bộ HTX đăng ký giúp)
-- Không bao giờ được: ký hợp đồng, đổi tài khoản nhận tiền, rút/chi tiền.
-- ---------------------------------------------------------------------
CREATE TABLE ref.delegable_actions (
  code      text PRIMARY KEY,
  label_vi  text NOT NULL
);
INSERT INTO ref.delegable_actions (code, label_vi) VALUES
  ('view',              'Xem đơn, lô, ví'),
  ('lot.draft',         'Soạn và đăng lô'),
  ('lot.update',        'Cập nhật lượng, ảnh, xác nhận còn hàng'),
  ('quote.reply',       'Trả lời chào giá (không chốt)'),
  ('message.send',      'Nhắn tin'),
  ('delivery.record',   'Ghi biên bản giao, chụp ảnh, nhập cân'),
  ('diary.write',       'Ghi nhật ký vườn');

CREATE TABLE core.delegations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES core.organizations (id),
  principal_user_id uuid NOT NULL REFERENCES core.users (id),   -- người được giúp (chủ hộ)
  helper_user_id   uuid NOT NULL REFERENCES core.users (id),    -- người giúp
  actions          text[] NOT NULL,                             -- tập con của ref.delegable_actions
  valid_during     tstzrange NOT NULL,
  evidence_id      uuid,                                        -- giấy ủy quyền nếu có (core.documents, gắn ở 0005)
  revoked_at       timestamptz,
  revoked_by       uuid REFERENCES core.users (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES core.users (id),
  CONSTRAINT ck_delegation_self CHECK (principal_user_id <> helper_user_id),
  CONSTRAINT ck_delegation_actions CHECK (cardinality(actions) > 0
     AND actions <@ ARRAY['view','lot.draft','lot.update','quote.reply','message.send','delivery.record','diary.write']::text[]),
  CONSTRAINT ck_delegation_range CHECK (NOT isempty(valid_during) AND lower(valid_during) IS NOT NULL),
  CONSTRAINT ex_delegation_overlap EXCLUDE USING gist (
     org_id WITH =, principal_user_id WITH =, helper_user_id WITH =, valid_during WITH &&
  ) WHERE (revoked_at IS NULL)
);
COMMENT ON TABLE core.delegations IS 'Ủy quyền người giúp. CHECK cứng: không có quyền ký, tiền, đổi tài khoản. Không chồng thời gian cho cùng một cặp.';
CREATE INDEX ix_delegation_helper ON core.delegations (helper_user_id) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------
-- Dữ liệu cá nhân nhạy cảm (schema pii)
-- *_enc: bản mã hóa ở tầng ứng dụng (AES-256-GCM, khóa ở KMS, có key_id để xoay khóa)
-- *_hash: HMAC-SHA256 với khóa bí mật (tra trùng, đăng nhập) – không phải sha256 thuần (chống dò từ điển SĐT)
-- *_masked: bản che để hiển thị (0909***123)
-- ---------------------------------------------------------------------
CREATE TABLE pii.user_contacts (
  user_id         uuid PRIMARY KEY REFERENCES core.users (id),
  phone_enc       bytea NOT NULL,
  phone_hash      bytea NOT NULL,
  phone_masked    text  NOT NULL,
  zalo_id_enc     bytea,
  email_enc       bytea,
  email_hash      bytea,
  key_id          text  NOT NULL,          -- khóa đã mã hóa bản ghi này
  phone_verified_at timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_phone_hash UNIQUE (phone_hash),
  CONSTRAINT ck_phone_hash_len CHECK (octet_length(phone_hash) = 32),
  CONSTRAINT ck_phone_masked CHECK (phone_masked ~ '^[0-9]{2,4}\*+[0-9]{2,4}$')
);
CREATE UNIQUE INDEX uq_email_hash ON pii.user_contacts (email_hash) WHERE email_hash IS NOT NULL;

CREATE TABLE pii.identity_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES core.users (id),
  doc_type         text NOT NULL,          -- cccd, passport, business_license, coop_certificate
  number_enc       bytea NOT NULL,
  number_hash      bytea NOT NULL,
  number_masked    text  NOT NULL,         -- 0790****1234
  full_name_enc    bytea,
  birth_date_enc   bytea,
  front_image_key  text,                   -- khóa kho đối tượng (mã hóa phía máy chủ kho)
  back_image_key   text,
  ekyc_provider    text,
  ekyc_ref         text,
  ekyc_score_bps   integer,                -- độ khớp khuôn mặt, phần vạn
  verified_at      timestamptz,
  key_id           text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_iddoc_type CHECK (doc_type IN ('cccd','passport','business_license','coop_certificate')),
  CONSTRAINT uq_iddoc UNIQUE (doc_type, number_hash),
  CONSTRAINT ck_iddoc_score CHECK (ekyc_score_bps IS NULL OR ekyc_score_bps BETWEEN 0 AND 10000)
);
CREATE INDEX ix_iddoc_user ON pii.identity_documents (user_id);

-- Tài khoản nhận tiền: đúng tên chủ; đổi tài khoản có thời gian chờ và thông báo kênh cũ.
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order) VALUES
  ('payout_account','pending_verification','Chờ xác minh', true,  false, 1),
  ('payout_account','cooling_down',       'Đang chờ hết thời gian an toàn', false, false, 2),
  ('payout_account','active',             'Đang dùng',    false, false, 3),
  ('payout_account','replaced',           'Đã thay',      false, true,  4),
  ('payout_account','locked',             'Đã khóa',      false, false, 5),
  ('payout_account','rejected',           'Bị từ chối',   false, true,  6);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason) VALUES
  ('payout_account','pending_verification','cooling_down', ARRAY['system','bank','ops'], false),
  ('payout_account','pending_verification','rejected',     ARRAY['system','bank','ops'], true),
  ('payout_account','cooling_down','active',               ARRAY['system'],              false),
  ('payout_account','cooling_down','locked',               NULL,                         true),  -- chủ bấm "Không phải tôi"
  ('payout_account','active','replaced',                   ARRAY['system'],              false),
  ('payout_account','active','locked',                     ARRAY['ops','system','seller','buyer'], true),
  ('payout_account','locked','active',                     ARRAY['ops'],                 true),
  ('payout_account','locked','rejected',                   ARRAY['ops'],                 true);

CREATE TABLE pii.bank_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES core.organizations (id),
  bank_code          text NOT NULL,            -- mã ngân hàng (NAPAS BIN)
  account_number_enc bytea NOT NULL,
  account_number_hash bytea NOT NULL,
  account_masked     text NOT NULL,            -- ****6789
  holder_name        text NOT NULL,            -- tên in hoa không dấu theo ngân hàng
  name_match         boolean,                  -- tra tên qua ngân hàng: khớp/lệch/NULL chưa tra
  cooldown_until     timestamptz,              -- 24 giờ; 72 giờ nếu vừa khôi phục tài khoản
  requested_by       uuid NOT NULL REFERENCES core.users (id),
  verify_factors     text[] NOT NULL,          -- otp, backup_contact, in_person, video
  key_id             text NOT NULL,
  status             text NOT NULL DEFAULT 'pending_verification',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  activated_at       timestamptz,
  CONSTRAINT ck_bank_factors CHECK (cardinality(verify_factors) >= 2 AND 'otp' = ANY (verify_factors)),
  CONSTRAINT ck_bank_hash_len CHECK (octet_length(account_number_hash) = 32)
);
COMMENT ON TABLE pii.bank_accounts IS 'Tài khoản nhận tiền của tổ chức. Một tổ chức chỉ có một tài khoản đang dùng. Lệnh chi đã phát hành không tự đổi theo tài khoản mới.';
CREATE UNIQUE INDEX uq_bank_one_active ON pii.bank_accounts (org_id) WHERE status = 'active';
CREATE INDEX ix_bank_hash ON pii.bank_accounts (account_number_hash);   -- phát hiện một số TK dùng cho nhiều tổ chức
CREATE TRIGGER tg_bank_status BEFORE INSERT OR UPDATE OF status ON pii.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('payout_account');

-- Liên hệ dự phòng (người thân, HTX) để báo khi đổi tài khoản, khôi phục.
CREATE TABLE pii.backup_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES core.organizations (id),
  kind         text NOT NULL,
  label        text NOT NULL,
  value_enc    bytea NOT NULL,
  value_masked text NOT NULL,
  key_id       text NOT NULL,
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_backup_kind CHECK (kind IN ('relative','cooperative','email'))
);
CREATE INDEX ix_backup_org ON pii.backup_contacts (org_id);
