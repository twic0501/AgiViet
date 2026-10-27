-- =====================================================================
-- 0005 · Gói & chính sách, hợp đồng khung, đơn nhóm, đơn (hợp đồng cọc),
--        phiên bản/phụ lục với điều khoản tiền tường minh, tài liệu PDF có SHA-256,
--        chữ ký, đề nghị sửa, yêu cầu hủy, hạn (thực thể riêng, F02).
--        Theo 03-vong-doi-don.md mục 5, 10–13 và 04-tien-va-coc.md mục 2–4.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Gói bên mua và chính sách (có phiên bản; đơn chụp phiên bản lúc lập)
-- ---------------------------------------------------------------------
CREATE TABLE ref.plans (
  code               text PRIMARY KEY,
  spec_code          text NOT NULL UNIQUE,
  label_vi           text NOT NULL,
  monthly_price_vnd  bigint NOT NULL,
  first_order_fee_bps integer NOT NULL,    -- đơn đầu với người bán đó
  repeat_fee_bps     integer NOT NULL,     -- từ đơn thứ hai (mối quen)
  fee_floor_vnd      bigint,               -- NULL = không sàn
  fee_cap_vnd        bigint,
  max_members        integer NOT NULL,
  CONSTRAINT ck_plan_values CHECK (monthly_price_vnd >= 0 AND first_order_fee_bps BETWEEN 0 AND 10000
         AND repeat_fee_bps BETWEEN 0 AND 10000 AND max_members > 0
         AND (fee_floor_vnd IS NULL OR fee_cap_vnd IS NULL OR fee_floor_vnd <= fee_cap_vnd))
);
COMMENT ON TABLE ref.plans IS 'Gói theo 02-phan-khuc mục 6. Giá trị thử; đổi bằng migration hoặc trang vận hành (ghi audit).';
INSERT INTO ref.plans VALUES
  ('free',        'mien_phi',     'Miễn phí',     0,       100, 50, 20000, 2000000, 1),
  ('procurement', 'thu_mua',      'Thu mua',      1500000, 30,  0,  20000, 1500000, 3),
  ('enterprise',  'doanh_nghiep', 'Doanh nghiệp', 4000000, 20,  20, 20000, 3000000, 10),
  ('kitchen',     'bep',          'Bếp',          490000,  0,   0,  NULL,  NULL,    2);

CREATE TABLE core.subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES core.organizations (id),
  plan_code    text NOT NULL REFERENCES ref.plans (code),
  active_during tstzrange NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES core.users (id),
  CONSTRAINT ex_subscription_overlap EXCLUDE USING gist (org_id WITH =, active_during WITH &&)
);
COMMENT ON TABLE core.subscriptions IS 'Gói của tổ chức bên mua theo thời gian; không chồng lấn (exclusion constraint).';

-- Chính sách tiền và hạn: mỗi đơn chụp một phiên bản (không đổi khi vận hành chỉnh sau đó).
CREATE TABLE core.policy_versions (
  id                        integer PRIMARY KEY,
  effective_from            timestamptz NOT NULL,
  deposit_bps               integer NOT NULL DEFAULT 3000,   -- K02: 30%
  deposit_round_vnd         bigint  NOT NULL DEFAULT 1000,   -- cọc làm tròn nửa lên tới nghìn
  ref_floor_bps             integer NOT NULL DEFAULT 7000,   -- K10: giá tính cọc ≥ 70% P_tk
  abnormal_price_bps        integer NOT NULL DEFAULT 6000,   -- K10: < 60% P_tk = giá bất thường
  low_price_warn_bps        integer NOT NULL DEFAULT 8000,   -- K11
  high_price_warn_bps       integer NOT NULL DEFAULT 13000,  -- người bán trả giá > 130% P_tk
  estimated_commit_cap_bps  integer NOT NULL DEFAULT 8000,   -- K21: ước tính chỉ hứa 80%
  shortfall_penalty_bps     integer[] NOT NULL DEFAULT ARRAY[0,1000,5000,10000], -- Q04: bất khả kháng / báo ≥3 ngày / báo <3 ngày / không báo
  contact_open_threshold_vnd bigint NOT NULL DEFAULT 3000000, -- Q11
  deadlines                 jsonb NOT NULL,                  -- thời lượng các hạn (03 mục 13), dạng {"sign":"24 hours",...}
  note                      text,
  CONSTRAINT ck_policy_bps CHECK (deposit_bps BETWEEN 0 AND 10000 AND ref_floor_bps BETWEEN 0 AND 10000
        AND abnormal_price_bps BETWEEN 0 AND 10000 AND low_price_warn_bps BETWEEN 0 AND 10000
        AND estimated_commit_cap_bps BETWEEN 0 AND 10000 AND cardinality(shortfall_penalty_bps) = 4)
);
CREATE TRIGGER tg_policy_immutable BEFORE UPDATE OR DELETE ON core.policy_versions
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Tài liệu (PDF) bất biến, chuỗi phiên bản bằng mã băm bản trước (Q14)
-- ---------------------------------------------------------------------
CREATE TABLE ref.document_types (
  code      text PRIMARY KEY,
  label_vi  text NOT NULL,
  needs_signatures text[] NOT NULL DEFAULT '{}'   -- bên phải ký để tài liệu có hiệu lực
);
INSERT INTO ref.document_types VALUES
  ('contract',            'Hợp đồng cọc (phiên bản 1)',             ARRAY['buyer','seller']),
  ('annex',               'Phụ lục hợp đồng',                       ARRAY['buyer','seller']),
  ('framework_contract',  'Hợp đồng khung',                         ARRAY['buyer','seller']),
  ('acceptance_record',   'Biên bản nghiệm thu',                    ARRAY['buyer','seller']),
  ('loading_record',      'Biên bản xuất hàng / bốc hàng',          ARRAY['seller']),
  ('receipt_record',      'Biên bản giao nhận tại nơi đến',         ARRAY['buyer']),
  ('return_record',       'Biên bản trả hàng',                      ARRAY['buyer','seller']),
  ('destruction_record',  'Biên bản tiêu hủy',                      ARRAY['buyer','seller']),
  ('inspection_report',   'Kết quả kiểm định',                      ARRAY['inspector']),
  ('settlement_statement','Bảng quyết toán',                        '{}'),
  ('tax_list_01tndn',     'Bảng kê 01/TNDN',                        '{}'),
  ('cancellation_record', 'Biên bản hủy đơn',                       ARRAY['buyer','seller']),
  ('authorization',       'Giấy ủy quyền (hộ cho tổ trưởng, người giúp)', '{}'),
  ('evidence',            'Bằng chứng (ảnh, video, chứng từ)',       '{}'),
  ('allocation_statement','Bảng phân bổ phần hộ (lô gộp)',          '{}');

INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('document','draft',            'Nháp',                 true,  false, 1, 'nhap'),
  ('document','awaiting_signature','Chờ ký',              true,  false, 2, 'cho_ky'),
  ('document','partially_signed', 'Đã ký một phần',       false, false, 3, 'da_ky_mot_phan'),
  ('document','fully_signed',     'Đã ký đủ',             true,  false, 4, 'da_ky_du'),
  ('document','effective',        'Có hiệu lực (đã cọc)', false, false, 5, 'co_hieu_luc'),
  ('document','superseded',       'Đã thay bởi phiên bản sau', false, true, 6, 'da_thay_the'),
  ('document','ended',            'Đã kết thúc',          false, true,  7, 'da_ket_thuc'),
  ('document','cancelled',        'Đã hủy',               false, true,  8, 'da_huy');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason) VALUES
  ('document','draft','awaiting_signature',          ARRAY['system'], false),
  ('document','draft','cancelled',                   NULL,            true),
  ('document','awaiting_signature','partially_signed', ARRAY['system'], false),
  ('document','awaiting_signature','fully_signed',   ARRAY['system'], false),
  ('document','awaiting_signature','cancelled',      NULL,            true),
  ('document','partially_signed','fully_signed',     ARRAY['system'], false),
  ('document','partially_signed','cancelled',        NULL,            true),
  ('document','fully_signed','effective',            ARRAY['system','bank'], false),
  ('document','fully_signed','superseded',           ARRAY['system'], false),
  ('document','fully_signed','ended',                ARRAY['system'], false),
  ('document','fully_signed','cancelled',            NULL,            true),
  ('document','effective','superseded',              ARRAY['system'], false),
  ('document','effective','ended',                   ARRAY['system'], false),
  ('document','effective','cancelled',               NULL,            true);

CREATE TABLE core.documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,                 -- mã tài liệu in trên PDF, dùng ở trang xác minh (QR-06)
  doc_type        text NOT NULL REFERENCES ref.document_types (code),
  spec_type       text,                                 -- HD, PL, HDK, HDBT, BBGN, BBNT, BBKD, BBTH, BQT, CTTT, BK01, BBHUY, HDPHI
  owner_org_id    uuid REFERENCES core.organizations (id),
  order_id        uuid,                                 -- FK thêm dưới
  entity          text,                                 -- thực thể khác (delivery, dispute, lot ...)
  entity_id       uuid,
  series_key      text NOT NULL,                        -- chuỗi phiên bản: 'HD:<order>' ...
  version_no      integer NOT NULL,
  prev_document_id uuid REFERENCES core.documents (id),
  prev_content_sha256 bytea,                            -- ma_bam_phien_ban_truoc
  content_sha256  bytea NOT NULL,                       -- SHA-256 của JSON chuẩn hóa RFC 8785 (cái được KÝ)
  canonical_content jsonb,                              -- nội dung chuẩn hóa (không áp cho ảnh/tệp ngoài)
  file_sha256     bytea NOT NULL,                       -- SHA-256 của tệp PDF/ảnh
  storage_key     text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      bigint NOT NULL,
  generator_version text,                               -- phiên bản bộ sinh PDF (tệp có thể khác, nội dung thì không)
  is_test_data    boolean NOT NULL DEFAULT true,        -- "DỮ LIỆU THỬ" trên PDF (v2 luôn true)
  captured_at     timestamptz,                          -- ảnh/video: giờ chụp
  captured_lat    double precision,
  captured_lng    double precision,
  captured_in_app boolean,                              -- CG-01: ảnh chụp trong app hay tải lên
  source_label    text NOT NULL DEFAULT 'system',       -- system | self_declared | counterparty_confirmed | partner_confirmed
  status          text NOT NULL DEFAULT 'draft',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  cancel_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES core.users (id),
  CONSTRAINT uq_document_series UNIQUE (series_key, version_no),
  CONSTRAINT ck_doc_sha CHECK (octet_length(content_sha256) = 32 AND octet_length(file_sha256) = 32
                               AND (prev_content_sha256 IS NULL OR octet_length(prev_content_sha256) = 32)),
  CONSTRAINT ck_doc_chain CHECK ((version_no = 1) = (prev_document_id IS NULL) AND (prev_document_id IS NULL) = (prev_content_sha256 IS NULL)),
  CONSTRAINT ck_doc_size CHECK (size_bytes > 0),
  CONSTRAINT ck_doc_source CHECK (source_label IN ('system','self_declared','counterparty_confirmed','partner_confirmed')),
  CONSTRAINT ck_doc_cancel CHECK ((status = 'cancelled') = (cancel_reason IS NOT NULL))
);
COMMENT ON TABLE core.documents IS 'Tài liệu có phiên bản. Nội dung, mã băm, tệp bất biến; chỉ trạng thái được đổi (trigger). Không xóa (07 mục 1.6).';
CREATE INDEX ix_documents_order ON core.documents (order_id, doc_type) WHERE order_id IS NOT NULL;
CREATE INDEX ix_documents_entity ON core.documents (entity, entity_id) WHERE entity IS NOT NULL;
CREATE INDEX ix_documents_file_sha ON core.documents (file_sha256);       -- trang xác minh: tải tệp lên để so
CREATE INDEX ix_documents_content_sha ON core.documents (content_sha256);
CREATE TRIGGER tg_document_status BEFORE INSERT OR UPDATE OF status ON core.documents
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('document');
CREATE TRIGGER tg_documents_no_delete BEFORE DELETE ON core.documents
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION core.freeze_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.code, NEW.doc_type, NEW.order_id, NEW.entity, NEW.entity_id, NEW.series_key, NEW.version_no, NEW.prev_document_id,
      NEW.prev_content_sha256, NEW.content_sha256, NEW.canonical_content, NEW.file_sha256, NEW.storage_key, NEW.mime_type,
      NEW.size_bytes, NEW.owner_org_id, NEW.created_at, NEW.created_by)
     IS DISTINCT FROM
     (OLD.code, OLD.doc_type, OLD.order_id, OLD.entity, OLD.entity_id, OLD.series_key, OLD.version_no, OLD.prev_document_id,
      OLD.prev_content_sha256, OLD.content_sha256, OLD.canonical_content, OLD.file_sha256, OLD.storage_key, OLD.mime_type,
      OLD.size_bytes, OLD.owner_org_id, OLD.created_at, OLD.created_by) THEN
    RAISE EXCEPTION 'Tài liệu % là bất biến: chỉ đổi trạng thái; sửa = phiên bản mới', OLD.code USING HINT = 'ck_append_only';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_documents_freeze BEFORE UPDATE ON core.documents
  FOR EACH ROW EXECUTE FUNCTION core.freeze_document();

CREATE FUNCTION core.check_document_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_prev core.documents%ROWTYPE;
BEGIN
  IF NEW.prev_document_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_prev FROM core.documents WHERE id = NEW.prev_document_id;
  IF v_prev.series_key <> NEW.series_key OR v_prev.version_no <> NEW.version_no - 1 OR v_prev.content_sha256 <> NEW.prev_content_sha256 THEN
    RAISE EXCEPTION 'Chuỗi tài liệu sai: bản trước phải cùng chuỗi, liền số và đúng mã băm' USING HINT = 'ck_document_chain';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_documents_chain BEFORE INSERT ON core.documents
  FOR EACH ROW EXECUTE FUNCTION core.check_document_chain();

-- Chữ ký: ký đúng mã băm của tài liệu; người giúp không bao giờ ký (K17).
CREATE TABLE core.signatures (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid NOT NULL REFERENCES core.documents (id),
  party            text NOT NULL,                     -- buyer | seller | witness | inspector | ops | carrier
  signer_user_id   uuid REFERENCES core.users (id),    -- NULL khi party = system (ký số mô phỏng của AgiViet)
  signer_org_id    uuid REFERENCES core.organizations (id),
  signer_role      text,                              -- vai lúc ký (ref.roles)
  method           text NOT NULL,                     -- otp | simulated_digital (ky_so_mo_phong) | onscreen_handwriting (ky_tay_chung_kien) | qr_confirm (qr_tai_cho)
  signed_sha256    bytea NOT NULL,                    -- phải bằng documents.content_sha256
  otp_challenge_id text,                              -- tham chiếu phiên OTP (không lưu mã)
  cert_fingerprint text,                              -- ký số mô phỏng Ed25519: mã khóa thử (không phải chữ ký số công cộng)
  signature_value  bytea,                              -- chữ ký số mô phỏng trên content_sha256
  handwriting_image_key text,                         -- ký tay chứng kiến: ảnh nét ký
  phone_masked     text,                              -- số điện thoại (che) nhận OTP
  ip_address       inet,
  user_agent       text,
  device_id        text,
  lat              double precision,
  lng              double precision,
  statements       text[] NOT NULL DEFAULT '{}',      -- câu đã tick: cam kết giao, giá bất thường (KT-03)
  signed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_signature_party UNIQUE (document_id, party, signer_org_id),
  CONSTRAINT ck_sig_party CHECK (party IN ('buyer','seller','witness','inspector','ops','carrier','system') AND ((party = 'system') = (signer_user_id IS NULL))),
  CONSTRAINT ck_sig_method CHECK (method IN ('otp','simulated_digital','onscreen_handwriting','qr_confirm')),
  CONSTRAINT ck_sig_digital CHECK ((method = 'simulated_digital') = (cert_fingerprint IS NOT NULL)),
  CONSTRAINT ck_sig_otp CHECK (method <> 'otp' OR otp_challenge_id IS NOT NULL),
  CONSTRAINT ck_sig_witness CHECK (method <> 'onscreen_handwriting' OR party IN ('witness','carrier'))  -- ký tay chỉ để chứng kiến
);
COMMENT ON TABLE core.signatures IS 'Chữ ký điện tử: người ký, thời điểm, phương thức, IP/thiết bị/vị trí; ký trên đúng mã băm. Append-only.';
CREATE INDEX ix_signatures_signer ON core.signatures (signer_user_id, signed_at);
CREATE TRIGGER tg_signatures_immutable BEFORE UPDATE OR DELETE ON core.signatures
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION core.check_signature() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_doc core.documents%ROWTYPE; v_can_sign boolean;
BEGIN
  SELECT * INTO v_doc FROM core.documents WHERE id = NEW.document_id;
  IF v_doc.content_sha256 <> NEW.signed_sha256 THEN
    RAISE EXCEPTION 'Chữ ký không khớp mã băm nội dung tài liệu % (PHIEN_BAN_DA_DOI)', v_doc.code USING HINT = 'PHIEN_BAN_DA_DOI';
  END IF;
  IF ref.ctx_actor() = 'helper' THEN
    RAISE EXCEPTION 'Người giúp không được ký' USING HINT = 'ck_signature_helper';
  END IF;
  -- Hợp đồng, phụ lục, hợp đồng khung: người ký phải là thành viên đang hoạt động có vai được ký.
  IF v_doc.doc_type IN ('contract','annex','framework_contract') AND NEW.party IN ('buyer','seller') THEN
    SELECT EXISTS (
      SELECT 1 FROM core.memberships m
        JOIN core.membership_roles mr ON mr.membership_id = m.id
        JOIN ref.roles r ON r.code = mr.role_code
       WHERE m.user_id = NEW.signer_user_id AND m.org_id = NEW.signer_org_id
         AND m.status = 'active' AND r.can_sign) INTO v_can_sign;
    IF NOT v_can_sign THEN
      RAISE EXCEPTION 'Người dùng không có quyền ký thay tổ chức' USING HINT = 'ck_signature_role';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_signatures_check BEFORE INSERT ON core.signatures
  FOR EACH ROW EXECUTE FUNCTION core.check_signature();

-- ---------------------------------------------------------------------
-- Hợp đồng khung (nhà hàng ↔ đầu mối) – 03 mục 12.3
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('framework','drafting',          'Đang soạn',                  true,  false, 1, 'soan_thao'),
  ('framework','awaiting_signature','Chờ ký',                     false, false, 2, 'cho_ky'),
  ('framework','awaiting_deposit',  'Chờ cọc khung',              false, false, 3, 'cho_coc_khung'),
  ('framework','running',           'Đang chạy',                  false, false, 4, 'dang_chay'),
  ('framework','needs_security',    'Chờ bổ sung bảo đảm',        false, false, 5, 'cho_bo_sung_bao_dam'),
  ('framework','ended',             'Kết thúc (đã quyết toán cọc khung)', false, true, 6, 'ket_thuc'),
  ('framework','closed',            'Đã đóng',                    false, true,  7, 'da_dong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('framework','drafting','awaiting_signature', ARRAY['buyer']),
  ('framework','drafting','closed',             ARRAY['buyer']),
  ('framework','awaiting_signature','awaiting_deposit', ARRAY['seller']),
  ('framework','awaiting_signature','closed',   ARRAY['seller','buyer','system']),
  ('framework','awaiting_deposit','running',    ARRAY['bank','system']),
  ('framework','awaiting_deposit','closed',     ARRAY['system','buyer','seller']),
  ('framework','running','needs_security',      ARRAY['system']),
  ('framework','needs_security','running',      ARRAY['system','bank','seller']),
  ('framework','running','ended',               ARRAY['system','ops']),
  ('framework','needs_security','ended',        ARRAY['system','ops']);

CREATE TABLE core.framework_contracts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,                  -- KH-xxxx
  buyer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  seller_org_id      uuid NOT NULL REFERENCES core.organizations (id),
  segment_code       text NOT NULL REFERENCES ref.buyer_segments (code),
  schedule           jsonb NOT NULL,                        -- ngày lặp, danh mục món, lượng mặc định
  price_period       text NOT NULL,                         -- week | month
  billing_period     text NOT NULL DEFAULT 'week',
  framework_deposit_vnd bigint NOT NULL,                    -- cọc khung (≥ 1 kỳ thanh toán)
  extra_credit_vnd   bigint NOT NULL DEFAULT 0,             -- người bán cho nợ thêm
  fee_bps            integer NOT NULL DEFAULT 0,            -- phí theo kỳ, không sàn (Q10)
  active_during      daterange NOT NULL,
  policy_version_id  integer NOT NULL REFERENCES core.policy_versions (id),
  status             text NOT NULL DEFAULT 'drafting',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_fw_parties CHECK (buyer_org_id <> seller_org_id),
  CONSTRAINT ck_fw_money CHECK (framework_deposit_vnd >= 0 AND extra_credit_vnd >= 0 AND fee_bps BETWEEN 0 AND 10000),
  CONSTRAINT ck_fw_period CHECK (price_period IN ('week','month') AND billing_period IN ('week','month'))
);
CREATE TRIGGER tg_fw_status BEFORE INSERT OR UPDATE OF status ON core.framework_contracts
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('framework');
CREATE TRIGGER tg_fw_touch BEFORE UPDATE ON core.framework_contracts FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Lịch sử "cho nợ thêm" (chỉ người ký được của bên bán cấp).
CREATE TABLE core.framework_credit_grants (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  framework_id  uuid NOT NULL REFERENCES core.framework_contracts (id),
  extra_credit_vnd bigint NOT NULL,
  granted_by    uuid NOT NULL REFERENCES core.users (id),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_fcg CHECK (extra_credit_vnd >= 0)
);
CREATE TRIGGER tg_fcg_immutable BEFORE UPDATE OR DELETE ON core.framework_credit_grants
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Đơn nhóm (nhiều người bán) – 03 mục 12.4
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('group_order','gathering', 'Pha gom',         true,  false, 1, 'pha_gom'),
  ('group_order','executing', 'Pha thực hiện',   false, false, 2, 'pha_thuc_hien'),
  ('group_order','completed', 'Xong',            false, true,  3, NULL),
  ('group_order','closed',    'Đã đóng (không đủ tổng)', false, true, 4, 'da_dong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('group_order','gathering','executing', ARRAY['system']),
  ('group_order','gathering','closed',    ARRAY['system','buyer']),
  ('group_order','executing','completed', ARRAY['system']);

CREATE TABLE core.group_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  buyer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  demand_id          uuid REFERENCES core.demands (id),
  product_id         uuid NOT NULL REFERENCES core.products (id),
  grade_code         text NOT NULL,
  total_qty          bigint NOT NULL,
  unit_price_vnd     bigint NOT NULL,                       -- một giá chung
  all_or_nothing     boolean NOT NULL,                      -- "Chỉ nhận khi đủ tổng" / "Nhận từng phần"
  cutoff_at          timestamptz NOT NULL,                  -- giờ chốt nhóm
  collection_facility_id uuid REFERENCES core.facilities (id),
  group_fee_vnd      bigint,                                -- Q09: phí một lần trên tổng, phân bổ theo phần
  status             text NOT NULL DEFAULT 'gathering',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_group_values CHECK (total_qty > 0 AND unit_price_vnd > 0 AND (group_fee_vnd IS NULL OR group_fee_vnd >= 0))
);
CREATE TRIGGER tg_group_status BEFORE INSERT OR UPDATE OF status ON core.group_orders
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('group_order');
CREATE TRIGGER tg_group_touch BEFORE UPDATE ON core.group_orders FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- ---------------------------------------------------------------------
-- Đơn (hợp đồng cọc)
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('order','drafting',          'Đang soạn hợp đồng',              true,  false, 1, 'soan_thao'),
  ('order','internal_approval', 'Chờ quản lý duyệt',               false, false, 2, 'cho_duyet_noi_bo'),
  ('order','awaiting_seller',   'Chờ người bán ký',                false, false, 3, 'cho_nguoi_ban_ky'),
  ('order','awaiting_deposit',  'Chờ cọc',                         false, false, 4, 'cho_coc'),
  ('order','active',            'Đã cọc · đang thực hiện',         false, false, 5, 'hieu_luc'),
  ('order','awaiting_settlement','Chờ quyết toán',                 false, false, 6, 'cho_quyet_toan'),
  ('order','outstanding',       'Đã giao xong · còn công nợ',      false, false, 7, 'con_cong_no'),
  ('order','completed',         'Hoàn tất',                        false, true,  8, 'hoan_tat'),
  ('order','closed',            'Đã đóng',                         false, true,  9, 'da_dong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason, note_vi) VALUES
  ('order','drafting','internal_approval',  ARRAY['buyer'],          false, 'gui_duyet'),
  ('order','internal_approval','drafting',  ARRAY['buyer'],          false, 'duyet / tu_choi_duyet (quản lý khác người lập)'),
  ('order','drafting','awaiting_seller',    ARRAY['buyer'],          false, 'ky_va_gui'),
  ('order','drafting','active',             ARRAY['system'],         false, 'chỉ lần gọi hàng khung (trigger kiểm)'),
  ('order','awaiting_seller','awaiting_deposit', ARRAY['seller','system'], false, 'ky (người bán, không phải người giúp); system: chốt đơn nhóm'),
  ('order','awaiting_seller','closed',      ARRAY['seller','system','buyer'], true, 'tu_choi_ky / het_han_ky / rut_don'),
  ('order','drafting','closed',             ARRAY['buyer','system'], true,  'rut_don'),
  ('order','internal_approval','closed',    ARRAY['buyer','system'], true,  'rut_don'),
  ('order','awaiting_deposit','active',     ARRAY['bank','system'],  false, 'ngân hàng xác nhận cọc đủ'),
  ('order','awaiting_deposit','closed',     ARRAY['system','buyer','seller'], true, 'het_han_coc / huy_truoc_coc'),
  ('order','active','awaiting_settlement',  ARRAY['system'],         false, 'mọi đợt ở trạng thái cuối, không tranh chấp mở'),
  ('order','active','closed',               ARRAY['system','ops'],   true,  'hủy được chấp thuận, tiền hủy xong'),
  ('order','awaiting_settlement','completed', ARRAY['system'],       false, 'lệnh đã đối soát, không còn công nợ'),
  ('order','awaiting_settlement','outstanding', ARRAY['system'],     false, 'còn khoản phải trả/phải hoàn'),
  ('order','outstanding','completed',       ARRAY['system','buyer','seller','ops'], false, 'xác nhận đã nhận khoản công nợ');

CREATE TABLE ref.contract_types (
  code      text PRIMARY KEY,
  spec_code text NOT NULL UNIQUE,
  label_vi  text NOT NULL
);
INSERT INTO ref.contract_types VALUES
  ('spot',             'giao_ngay', 'Giao ngay'),
  ('pre_harvest',      'dat_truoc', 'Đặt trước khi hái'),
  ('offtake',          'bao_tieu',  'Bao tiêu theo vụ'),
  ('framework_calloff','khung',     'Lần gọi hàng của hợp đồng khung'),
  ('group_part',       'don_nhom',  'Phần của đơn nhóm'),
  ('pooled_lot',       'lo_gop',    'Lô gộp HTX');

CREATE TABLE ref.order_close_reasons (
  code      text PRIMARY KEY,
  spec_code text NOT NULL UNIQUE,
  label_vi  text NOT NULL
);
INSERT INTO ref.order_close_reasons VALUES
  ('seller_declined',     'tu_choi',             'Người bán từ chối'),
  ('sign_expired',        'qua_han_ky',          'Quá hạn ký'),
  ('deposit_expired',     'qua_han_coc',         'Quá hạn cọc'),
  ('cancel_before_deposit','huy_truoc_coc',      'Hủy trước cọc'),
  ('cancel_after_deposit','huy_sau_coc',         'Hủy sau cọc'),
  ('force_majeure',       'huy_bat_kha_khang',   'Hủy do bất khả kháng'),
  ('seller_no_delivery',  'nguoi_ban_khong_giao','Người bán không giao'),
  ('buyer_no_pickup',     'ben_mua_khong_nhan',  'Bên mua không nhận'),
  ('group_not_filled',    'nhom_khong_du',       'Đơn nhóm không đủ tổng');

CREATE TABLE core.orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,                   -- HĐ-2001
  contract_type      text NOT NULL REFERENCES ref.contract_types (code),
  buyer_org_id       uuid NOT NULL REFERENCES core.organizations (id),
  seller_org_id      uuid NOT NULL REFERENCES core.organizations (id),
  segment_code       text NOT NULL REFERENCES ref.buyer_segments (code),
  product_id         uuid NOT NULL REFERENCES core.products (id),
  lot_id             uuid REFERENCES core.lots (id),          -- lô chính (đơn khung có thể nhiều lô ở dòng)
  offer_id           uuid REFERENCES core.offers (id),
  hold_id            uuid REFERENCES core.holds (id),
  demand_id          uuid REFERENCES core.demands (id),
  framework_id       uuid REFERENCES core.framework_contracts (id),
  group_order_id     uuid REFERENCES core.group_orders (id),
  policy_version_id  integer NOT NULL REFERENCES core.policy_versions (id),
  plan_code          text NOT NULL REFERENCES ref.plans (code),  -- gói bên mua lúc lập (chụp)
  is_first_pair_order boolean NOT NULL,                       -- cờ cap_moi: cặp chưa có đơn hoàn tất
  effective_version_no integer,                               -- phiên bản đã đủ chữ ký hai bên (NULL khi chưa ký xong bản 1)
  created_by_user_id uuid NOT NULL REFERENCES core.users (id), -- người lập (người duyệt phải khác)
  approved_by_user_id uuid REFERENCES core.users (id),
  -- Cờ song song (03 mục 5.1) – không phải trạng thái
  flag_abnormal_price boolean NOT NULL DEFAULT false,         -- gia_bat_thuong
  flag_payment_violation boolean NOT NULL DEFAULT false,      -- vi_pham_thanh_toan
  flag_suspected_collusion boolean NOT NULL DEFAULT false,    -- cặp bị đánh dấu: loại khỏi P_tk
  excluded_from_ref_price boolean NOT NULL DEFAULT false,
  close_reason       text REFERENCES ref.order_close_reasons (code),
  status             text NOT NULL DEFAULT 'drafting',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_order_parties CHECK (buyer_org_id <> seller_org_id),
  CONSTRAINT ck_order_close_reason CHECK ((status = 'closed') = (close_reason IS NOT NULL)),
  CONSTRAINT ck_order_framework CHECK ((contract_type = 'framework_calloff') = (framework_id IS NOT NULL)),
  CONSTRAINT ck_order_group CHECK ((contract_type = 'group_part') = (group_order_id IS NOT NULL)),
  CONSTRAINT ck_order_approver CHECK (approved_by_user_id IS NULL OR approved_by_user_id <> created_by_user_id)
);
COMMENT ON TABLE core.orders IS 'Đơn = hợp đồng cọc. Điều khoản nằm ở core.order_versions (bất biến). Cờ co_de_nghi_mo, co_tranh_chap, dang_xin_huy suy ra từ bảng con (view core.v_order_flags).';
CREATE INDEX ix_orders_buyer ON core.orders (buyer_org_id, status, created_at DESC);
CREATE INDEX ix_orders_seller ON core.orders (seller_org_id, status, created_at DESC);
CREATE INDEX ix_orders_pair ON core.orders (buyer_org_id, seller_org_id, status);
CREATE INDEX ix_orders_lot ON core.orders (lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX ix_orders_group ON core.orders (group_order_id) WHERE group_order_id IS NOT NULL;
CREATE INDEX ix_orders_framework ON core.orders (framework_id) WHERE framework_id IS NOT NULL;
CREATE INDEX ix_orders_open ON core.orders (status) WHERE status NOT IN ('completed','closed');
CREATE TRIGGER tg_order_status BEFORE INSERT OR UPDATE OF status ON core.orders
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('order');
CREATE TRIGGER tg_order_touch BEFORE UPDATE ON core.orders FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- Lần gọi hàng của khung: tạo ở 'drafting' rồi system chuyển thẳng sang 'active' (không cọc riêng).
-- Chỉ đơn framework_calloff được đi đường tắt này.
CREATE FUNCTION core.check_calloff_shortcut() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'drafting' AND NEW.status = 'active' AND NEW.contract_type <> 'framework_calloff' THEN
    RAISE EXCEPTION 'Chỉ lần gọi hàng của hợp đồng khung được vào hiệu lực không qua cọc' USING HINT = 'ck_status_transition';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_order_calloff_shortcut BEFORE UPDATE OF status ON core.orders
  FOR EACH ROW EXECUTE FUNCTION core.check_calloff_shortcut();

ALTER TABLE core.lots ADD CONSTRAINT fk_lot_origin_order FOREIGN KEY (origin_order_id) REFERENCES core.orders (id);
ALTER TABLE core.holds ADD CONSTRAINT fk_hold_order FOREIGN KEY (order_id) REFERENCES core.orders (id);
ALTER TABLE core.documents ADD CONSTRAINT fk_document_order FOREIGN KEY (order_id) REFERENCES core.orders (id);
ALTER TABLE core.lot_contributions ADD CONSTRAINT fk_contribution_auth_doc FOREIGN KEY (authorization_doc_id) REFERENCES core.documents (id);
ALTER TABLE core.delegations ADD CONSTRAINT fk_delegation_evidence FOREIGN KEY (evidence_id) REFERENCES core.documents (id);

-- ---------------------------------------------------------------------
-- Phiên bản đơn (phiên bản 1 = hợp đồng, ≥ 2 = phụ lục). Bất biến. Điều khoản tiền là cột, không JSON.
-- ---------------------------------------------------------------------
CREATE TABLE core.order_versions (
  order_id             uuid NOT NULL REFERENCES core.orders (id),
  version_no           integer NOT NULL,
  amendment_id         uuid,                                  -- đề nghị sinh ra phụ lục (FK dưới)
  document_id          uuid REFERENCES core.documents (id),   -- PDF của phiên bản (mã băm ký trên đó)
  -- Hàng
  profile_version      integer NOT NULL,
  qty_min              bigint NOT NULL,                       -- Q (lượng khoảng: lượng tối thiểu)
  qty_max              bigint NOT NULL,
  qty_tolerance_bps    integer NOT NULL,
  -- Giá
  price_mode           text NOT NULL,                         -- fixed | formula (đặt trước, bao tiêu) | size_table | moisture
  unit_price_vnd       bigint NOT NULL,                       -- P (công thức: giá sàn tới khi chốt)
  downgrade_price_vnd  bigint,                                -- P_hc
  price_formula        jsonb,                                 -- {"ref_bps":10000,"floor":20000,"cap":26000} hoặc {"ref_bps":9000,"floor":18000}
  size_price_table     jsonb,                                 -- tôm/cá: [{"from":48,"to":52,"price":118000},...]
  moisture_std_bps     integer,                               -- lúa: ẩm chuẩn (2500 = 25%)
  impurity_max_bps     integer,
  price_unit_base_qty  bigint NOT NULL DEFAULT 1000,
  ref_price_vnd        bigint,                                -- P_tk lúc ký (NULL = chưa đủ dữ liệu)
  ref_price_order_count integer,
  ref_price_scope      text,                                  -- tỉnh hoặc 'DBSCL'
  deposit_price_vnd    bigint NOT NULL,                       -- P_coc
  -- Tiền
  contract_value_vnd   bigint NOT NULL,                       -- G = Q × P
  deposit_basis_vnd    bigint NOT NULL,                       -- G_coc = Q × P_coc
  deposit_rule         text NOT NULL,                         -- percent | per_unit (bao tiêu) | none (lần gọi khung)
  deposit_bps          integer NOT NULL,
  deposit_vnd          bigint NOT NULL,                       -- C
  fee_rule             text NOT NULL,                         -- standard | group_allocated | period (khung)
  fee_bps              integer NOT NULL,
  fee_floor_vnd        bigint,
  fee_cap_vnd          bigint,
  fee_vnd              bigint NOT NULL,                       -- F
  payment_timing       text NOT NULL,                         -- before_loading | inspect_then_before_loading | on_receipt | after_days | period
  pay_after_days       integer,
  seller_bank_account_id uuid NOT NULL REFERENCES pii.bank_accounts (id),  -- K26/F05: chụp tài khoản lúc ký
  seller_bank_code     text NOT NULL,
  seller_account_masked text NOT NULL,
  seller_account_holder text NOT NULL,
  buyer_refund_account_masked text,                           -- tài khoản bên mua nhận hoàn ngoài app
  -- Giao
  delivery_mode        text NOT NULL,                         -- spec kieu_giao: at_farm | at_buyer_warehouse | at_collection_point | at_buyer_door
  acceptance_point     text NOT NULL,                         -- tai_vuon/tai_ao/tai_ruong/tai_diem_gom/tai_kho_ben_mua/tai_cua_ben_mua (= điểm chuyển rủi ro)
  acceptance_facility_id uuid REFERENCES core.facilities (id),
  transport_by         text NOT NULL,                         -- buyer | seller | partner_for_buyer | partner_for_seller
  cost_bearers         jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {"loading":"buyer","packaging":"seller","inspection":"split"}
  delivery_window      tstzrange NOT NULL,
  designated_receiver_user_id uuid REFERENCES core.users (id),
  inspection_before_loading boolean NOT NULL DEFAULT false,
  -- Nghiệm thu
  reject_allowance_bps integer NOT NULL,
  transit_loss_allowance_bps integer,
  seal_sample_required boolean NOT NULL DEFAULT false,
  silent_accept_hours  integer,                               -- NULL = không có điều khoản im lặng
  -- Thiếu lượng
  shortfall_penalty_bps integer[] NOT NULL,                   -- Q04 chụp lúc ký
  extra_terms          jsonb NOT NULL DEFAULT '{}'::jsonb,    -- phần chữ không tính tiền
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES core.users (id),
  PRIMARY KEY (order_id, version_no),
  CONSTRAINT ck_ov_qty CHECK (qty_min > 0 AND qty_max >= qty_min AND qty_tolerance_bps BETWEEN 0 AND 5000),
  CONSTRAINT ck_ov_price CHECK (unit_price_vnd > 0 AND (downgrade_price_vnd IS NULL OR downgrade_price_vnd < unit_price_vnd)
                                AND deposit_price_vnd >= unit_price_vnd),
  CONSTRAINT ck_ov_price_mode CHECK (price_mode IN ('fixed','formula','size_table','moisture')
        AND (price_mode <> 'formula' OR price_formula IS NOT NULL)
        AND (price_mode <> 'size_table' OR size_price_table IS NOT NULL)
        AND (price_mode <> 'moisture' OR moisture_std_bps IS NOT NULL)),
  -- 04 mục 3: P_coc = max(P, ceil(0,7 × P_tk)) khi có P_tk; = P khi chưa đủ dữ liệu
  CONSTRAINT ck_ov_deposit_price CHECK (
        (ref_price_vnd IS NULL AND deposit_price_vnd = unit_price_vnd)
     OR (ref_price_vnd IS NOT NULL AND deposit_price_vnd = greatest(unit_price_vnd, ceil(ref_price_vnd * 0.7)::bigint))),
  -- 04 mục 2: tiền = làm tròn nửa lên (lượng × giá ÷ 1000)
  CONSTRAINT ck_ov_contract_value CHECK (contract_value_vnd = ref.div_round(qty_min::numeric * unit_price_vnd, price_unit_base_qty)),
  CONSTRAINT ck_ov_deposit_basis CHECK (deposit_basis_vnd = ref.div_round(qty_min::numeric * deposit_price_vnd, price_unit_base_qty)),
  -- Q07: C = min(G, làm tròn tới nghìn (r × G_coc))
  CONSTRAINT ck_ov_deposit CHECK (deposit_rule IN ('percent','per_unit','none') AND deposit_vnd >= 0 AND deposit_vnd <= contract_value_vnd
        AND (deposit_rule <> 'percent' OR deposit_vnd = least(contract_value_vnd, ref.div_round(deposit_bps::numeric * deposit_basis_vnd, 10000 * 1000) * 1000))
        AND (deposit_rule <> 'none' OR deposit_vnd = 0)),
  -- Phí: 0 nếu r = 0; ngược lại min(trần, max(sàn, làm tròn(r × G_coc)))
  CONSTRAINT ck_ov_fee CHECK (fee_rule IN ('standard','group_allocated','period') AND fee_vnd >= 0
        AND (fee_rule <> 'standard' OR fee_vnd = CASE WHEN fee_bps = 0 THEN 0 ELSE
               least(coalesce(fee_cap_vnd, 9223372036854775807), greatest(coalesce(fee_floor_vnd, 0), ref.div_round(fee_bps::numeric * deposit_basis_vnd, 10000))) END)),
  CONSTRAINT ck_ov_timing CHECK (payment_timing IN ('before_loading','inspect_then_before_loading','on_receipt','after_days','period')
        AND ((payment_timing = 'after_days') = (pay_after_days IS NOT NULL))),
  CONSTRAINT ck_ov_delivery CHECK (delivery_mode IN ('at_farm','at_buyer_warehouse','at_collection_point','at_buyer_door')
        AND acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom','tai_kho_ben_mua','tai_cua_ben_mua')
        AND transport_by IN ('buyer','seller','partner_for_buyer','partner_for_seller')),
  -- Q02: điểm nghiệm thu khớp kiểu giao
  CONSTRAINT ck_ov_q02 CHECK (
        (delivery_mode = 'at_farm' AND acceptance_point IN ('tai_vuon','tai_ao','tai_ruong'))
     OR (delivery_mode = 'at_buyer_warehouse' AND acceptance_point = 'tai_kho_ben_mua')
     OR (delivery_mode = 'at_collection_point' AND acceptance_point = 'tai_diem_gom')
     OR (delivery_mode = 'at_buyer_door' AND acceptance_point = 'tai_cua_ben_mua')),
  CONSTRAINT ck_ov_window CHECK (NOT isempty(delivery_window) AND upper(delivery_window) - lower(delivery_window) <= interval '90 days'),
  CONSTRAINT ck_ov_bps CHECK (reject_allowance_bps BETWEEN 0 AND 10000 AND deposit_bps BETWEEN 0 AND 10000 AND fee_bps BETWEEN 0 AND 10000
        AND cardinality(shortfall_penalty_bps) = 4)
);
COMMENT ON TABLE core.order_versions IS 'Điều khoản đơn theo phiên bản. CHECK kiểm lại công thức tiền 04 mục 2–4 ngay trong DB. Bất biến.';
CREATE TRIGGER tg_ov_immutable BEFORE UPDATE OR DELETE ON core.order_versions
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE INDEX ix_ov_bank_account ON core.order_versions (seller_bank_account_id);

-- Phiên bản hiệu lực phải tồn tại và có đủ chữ ký bên mua + người bán trên đúng PDF của phiên bản đó (M13).
ALTER TABLE core.orders ADD CONSTRAINT fk_order_effective_version
  FOREIGN KEY (id, effective_version_no) REFERENCES core.order_versions (order_id, version_no) DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION core.check_effective_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_doc uuid; v_parties text[];
BEGIN
  IF NEW.effective_version_no IS NULL OR NEW.effective_version_no IS NOT DISTINCT FROM OLD.effective_version_no THEN
    RETURN NEW;
  END IF;
  IF OLD.effective_version_no IS NOT NULL AND NEW.effective_version_no < OLD.effective_version_no THEN
    RAISE EXCEPTION 'Không lùi phiên bản hiệu lực' USING HINT = 'ck_order_version_forward';
  END IF;
  SELECT document_id INTO v_doc FROM core.order_versions WHERE order_id = NEW.id AND version_no = NEW.effective_version_no;
  SELECT array_agg(DISTINCT party) INTO v_parties FROM core.signatures WHERE document_id = v_doc;
  IF v_doc IS NULL OR v_parties IS NULL OR NOT (v_parties @> ARRAY['buyer','seller']) THEN
    RAISE EXCEPTION 'Phiên bản % của đơn % chưa đủ chữ ký hai bên', NEW.effective_version_no, NEW.code USING HINT = 'ck_order_version_signed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_order_effective_version BEFORE UPDATE OF effective_version_no ON core.orders
  FOR EACH ROW EXECUTE FUNCTION core.check_effective_version();

-- Dòng hàng của phiên bản (đơn thường 1 dòng; lần gọi khung nhiều món; lô gộp theo phần hộ).
CREATE TABLE core.order_lines (
  order_id         uuid NOT NULL,
  version_no       integer NOT NULL,
  line_no          smallint NOT NULL,
  lot_id           uuid REFERENCES core.lots (id),
  product_id       uuid NOT NULL REFERENCES core.products (id),
  grade_code       text NOT NULL,
  qty              bigint NOT NULL,
  unit_price_vnd   bigint NOT NULL,
  downgrade_price_vnd bigint,
  line_value_vnd   bigint NOT NULL,
  PRIMARY KEY (order_id, version_no, line_no),
  FOREIGN KEY (order_id, version_no) REFERENCES core.order_versions (order_id, version_no),
  CONSTRAINT ck_ol_values CHECK (qty > 0 AND unit_price_vnd > 0 AND line_value_vnd = ref.div_round(qty::numeric * unit_price_vnd, 1000))
);
CREATE TRIGGER tg_ol_immutable BEFORE UPDATE OR DELETE ON core.order_lines
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- ---------------------------------------------------------------------
-- Đề nghị sửa (phụ lục) – 03 mục 10
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('amendment','open',      'Đang mở',        true,  false, 1, 'dang_mo'),
  ('amendment','accepted',  'Đã đồng ý',      false, true,  2, 'da_dong_y'),
  ('amendment','rejected',  'Bị từ chối',     false, true,  3, 'bi_tu_choi'),
  ('amendment','withdrawn', 'Đã rút',         false, true,  4, 'da_rut');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, note_vi) VALUES
  ('amendment','open','accepted',  ARRAY['buyer','seller','ops'], 'dong_y (bên kia); ops: bất khả kháng VH chấp nhận'),
  ('amendment','open','rejected',  ARRAY['buyer','seller','system'], 'khong_dong_y / het_han_tra_loi (im lặng = không đồng ý)'),
  ('amendment','open','withdrawn', ARRAY['buyer','seller'], 'rut (bên gửi)');

CREATE TABLE core.amendments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES core.orders (id),
  kind               text NOT NULL,
  proposed_by_org_id uuid NOT NULL REFERENCES core.organizations (id),
  proposed_by_user_id uuid NOT NULL REFERENCES core.users (id),
  payload            jsonb NOT NULL,                  -- giá trị mới của đúng một mục
  evidence_doc_ids   uuid[] NOT NULL DEFAULT '{}',    -- bất khả kháng: ảnh, xác nhận HTX
  notice_days_before_delivery integer,                -- giảm lượng: báo trước bao nhiêu ngày (thang Q04)
  resulting_version_no integer,
  status             text NOT NULL DEFAULT 'open',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_amend_kind CHECK (kind IN ('change_date','increase_qty','decrease_qty','change_price','change_transport',
                                          'change_receiver','force_majeure_reduction','make_up_delivery','fix_qty_price','substitute_item','drop_item')),
  CONSTRAINT ck_amend_result CHECK (status <> 'accepted' OR kind = 'change_receiver' OR resulting_version_no IS NOT NULL),
  CONSTRAINT ck_amend_fm_evidence CHECK (kind <> 'force_majeure_reduction' OR cardinality(evidence_doc_ids) > 0)
);
CREATE INDEX ix_amend_order_open ON core.amendments (order_id) WHERE status = 'open';
CREATE TRIGGER tg_amend_status BEFORE INSERT OR UPDATE OF status ON core.amendments
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('amendment');
CREATE TRIGGER tg_amend_touch BEFORE UPDATE ON core.amendments FOR EACH ROW EXECUTE FUNCTION ref.touch_row();
ALTER TABLE core.order_versions ADD CONSTRAINT fk_ov_amendment FOREIGN KEY (amendment_id) REFERENCES core.amendments (id);

-- ---------------------------------------------------------------------
-- Yêu cầu hủy – 03 mục 11
-- ---------------------------------------------------------------------
INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order, spec_code) VALUES
  ('cancellation','awaiting_reply',  'Chờ bên kia trả lời', true,  false, 1, 'cho_tra_loi'),
  ('cancellation','processing_money','Đang xử lý tiền',     false, false, 2, 'cho_xu_ly_tien'),
  ('cancellation','rejected',        'Bị từ chối',          false, true,  3, 'bi_tu_choi'),
  ('cancellation','done',            'Xong',                false, true,  4, 'xong');
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds) VALUES
  ('cancellation','awaiting_reply','processing_money', ARRAY['buyer','seller','ops']),
  ('cancellation','awaiting_reply','rejected',         ARRAY['buyer','seller','system']),
  ('cancellation','processing_money','done',           ARRAY['system']);

CREATE TABLE core.cancellation_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES core.orders (id),
  requested_by_org_id uuid NOT NULL REFERENCES core.organizations (id),
  requested_by_user_id uuid NOT NULL REFERENCES core.users (id),
  reason_kind        text NOT NULL,                  -- buyer_request | seller_request | force_majeure | seller_no_delivery | buyer_no_payment | buyer_vehicle_late
  reason_text        text,
  partial_undelivered_only boolean NOT NULL DEFAULT false,
  outcome            jsonb,                          -- cọc về ai, phí hoàn hay không, khoản hoàn (ảnh chụp màn xác nhận)
  status             text NOT NULL DEFAULT 'awaiting_reply',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_cancel_reason CHECK (reason_kind IN ('buyer_request','seller_request','force_majeure','seller_no_delivery','buyer_no_payment','buyer_vehicle_late'))
);
CREATE UNIQUE INDEX uq_cancel_one_open ON core.cancellation_requests (order_id) WHERE status IN ('awaiting_reply','processing_money');
CREATE TRIGGER tg_cancel_status BEFORE INSERT OR UPDATE OF status ON core.cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('cancellation');
CREATE TRIGGER tg_cancel_touch BEFORE UPDATE ON core.cancellation_requests FOR EACH ROW EXECUTE FUNCTION ref.touch_row();

-- ---------------------------------------------------------------------
-- Hạn: thực thể riêng (F02). Gia hạn = hàng mới, hạn mới = giờ xử lý + thời lượng; hạn cũ 'extended'.
-- ---------------------------------------------------------------------
CREATE TABLE ref.deadline_kinds (
  code       text PRIMARY KEY,
  label_vi   text NOT NULL,
  on_expiry  text NOT NULL                       -- hệ quả khi hết hạn (mô tả; backend thực hiện)
);
INSERT INTO ref.deadline_kinds VALUES
  ('offer_reply',          'Trả lời lời chào / trả giá',          'Lời chào hết hiệu lực'),
  ('hold',                 'Giữ lượng',                           'Lượng về lô'),
  ('seller_sign',          'Người bán ký',                        'Đơn đóng qua_han_ky'),
  ('deposit',              'Cọc',                                 'Đơn đóng qua_han_coc'),
  ('deposit_top_up',       'Bổ sung cọc',                         'Thẻ Sẵn sàng giao đỏ'),
  ('amendment_reply',      'Trả lời đề nghị',                     'Không đồng ý'),
  ('cancellation_reply',   'Trả lời xin hủy',                     'Không đồng ý'),
  ('direct_payment_due',   'Hạn trả khoản trả thẳng',             'Quá hạn; > 72 giờ cờ vi phạm'),
  ('direct_payment_confirm','Người bán xác nhận khoản đã báo',    'Đối soát thủ công (không coi như đã nhận)'),
  ('onsite_result_confirm','Người bán xác nhận kết quả tại điểm', 'Việc P1 cho vận hành'),
  ('warehouse_result_confirm','Người bán xác nhận kết quả tại kho','Nhắc → P2 → 72 giờ vận hành chốt'),
  ('arrival_check',        'Kiểm tại nơi đến',                    'Có điều khoản im lặng: coi như đạt; không: P2'),
  ('submit_result',        'Gửi kết quả nghiệm thu tại kho',      'Có điều khoản: coi như đạt; không: P2'),
  ('reweigh',              'Cân lại khi tranh chấp',              'Tự sang kiểm định'),
  ('inspection_result',    'Kiểm định trả kết quả',               'P2 cho vận hành'),
  ('dispute_agreement',    'Thỏa thuận khi kiểm định không kết luận', 'Chuyển cơ chế khác'),
  ('debt_settle',          'Khoản công nợ sau quyết toán',        'Cờ vi phạm, P2'),
  ('lot_visibility',       'Tin lô hiển thị',                     'Tạm ẩn'),
  ('urgent_sale',          'Bán gấp',                             'Tắt cờ'),
  ('substandard_no_interest','Lô kém loại không ai hỏi',          'Gợi ý bán gấp'),
  ('payout_cooldown',      'Chờ đổi tài khoản nhận tiền',         'Kích hoạt được'),
  ('calloff_cutoff',       'Chốt lần gọi hàng khung',             'Theo mặc định lịch'),
  ('vehicle_late',         'Xe bên mua trễ',                      'Người bán được ghi đã sẵn hàng / được hủy giữ cọc'),
  ('return_choice',        'Người bán chọn cách xử lý hàng trả lại', 'Mặc định theo hợp đồng'),
  ('group_cutoff',         'Giờ chốt đơn nhóm',                   'Chốt nhóm');

INSERT INTO ref.statuses (entity, code, label_vi, is_initial, is_terminal, sort_order) VALUES
  ('deadline','open',      'Đang chạy',     true,  false, 1),
  ('deadline','met',       'Đã làm kịp',    false, true,  2),
  ('deadline','expired',   'Đã hết hạn',    false, true,  3),
  ('deadline','extended',  'Đã gia hạn',    false, true,  4),
  ('deadline','cancelled', 'Không còn áp dụng', false, true, 5);
INSERT INTO ref.state_transitions (entity, from_status, to_status, actor_kinds, requires_reason) VALUES
  ('deadline','open','met',       NULL,                        false),
  ('deadline','open','expired',   ARRAY['system'],             false),
  ('deadline','open','extended',  NULL,                        true),
  ('deadline','open','cancelled', NULL,                        false);

CREATE TABLE core.deadlines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               text NOT NULL REFERENCES ref.deadline_kinds (code),
  entity             text NOT NULL,
  entity_id          uuid NOT NULL,
  order_id           uuid REFERENCES core.orders (id),
  due_at             timestamptz NOT NULL,
  reminders_at       timestamptz[] NOT NULL DEFAULT '{}',
  extended_from_id   uuid REFERENCES core.deadlines (id),
  extension_count    smallint NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'open',
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES core.users (id),
  CONSTRAINT ck_deadline_after_create CHECK (due_at > created_at),   -- F02: hạn mới > giờ xử lý
  CONSTRAINT ck_deadline_ext CHECK ((extended_from_id IS NULL) = (extension_count = 0))
);
COMMENT ON TABLE core.deadlines IS 'Mọi hạn là một hàng riêng. Worker quét (status=open, due_at ≤ now). Gia hạn chỉ tác động đúng hạn đó.';
CREATE INDEX ix_deadlines_due ON core.deadlines (due_at) WHERE status = 'open';
CREATE INDEX ix_deadlines_entity ON core.deadlines (entity, entity_id);
CREATE UNIQUE INDEX uq_deadline_open_per_kind ON core.deadlines (entity, entity_id, kind) WHERE status = 'open';
CREATE UNIQUE INDEX uq_deadline_extended_once ON core.deadlines (extended_from_id) WHERE extended_from_id IS NOT NULL;
CREATE TRIGGER tg_deadline_status BEFORE INSERT OR UPDATE OF status ON core.deadlines
  FOR EACH ROW EXECUTE FUNCTION evt.guard_status('deadline');
