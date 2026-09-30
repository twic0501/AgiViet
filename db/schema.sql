-- AgiViet · schema quan hệ theo Đặc tả kiến trúc v4 (mục 10–11).
-- Quy ước: id TEXT; thời gian TEXT ISO-8601 UTC; tiền INTEGER đồng (VND, không float);
-- khối lượng INTEGER gam (*_g); tỷ lệ INTEGER phần vạn (*_bps: 80 = 0,8%).
PRAGMA foreign_keys = ON;

-- ============ Danh tính, tổ chức, quyền ============
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  recovered_at TEXT                      -- lần khôi phục tài khoản / đổi SIM gần nhất (BR-08: chờ 72 giờ)
);
CREATE TABLE otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  org_id TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('ca_nhan','ho','htx','doanh_nghiep')),
  name TEXT NOT NULL,
  province TEXT,
  commune TEXT,
  can_sell INTEGER NOT NULL DEFAULT 0,
  can_buy INTEGER NOT NULL DEFAULT 0,
  seller_type TEXT CHECK (seller_type IN ('tu_trong','htx')),   -- bên bán: chủ hàng hoặc HTX; thương lái là bên mua
  phone_verified_at TEXT,
  org_checked_at TEXT,                   -- "Đã đối chiếu hồ sơ tổ chức" (BR-07)
  capability_note TEXT,                  -- năng lực nhận hàng đã đối chiếu (BR-43)
  capability_checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  org_id TEXT NOT NULL REFERENCES organizations(id),
  roles TEXT NOT NULL,                   -- csv: create,approve,sign,receive,reconcile,administer,manage_payout,helper
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','view_only','revoked')),
  UNIQUE (user_id, org_id)
);
CREATE TABLE backup_contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('nguoi_than','htx','email')),
  label TEXT NOT NULL,
  value_masked TEXT NOT NULL,
  verified_at TEXT
);
CREATE TABLE authority_records (
  id TEXT PRIMARY KEY,
  principal_org TEXT NOT NULL REFERENCES organizations(id),
  agent_org TEXT NOT NULL REFERENCES organizations(id),
  lot_id TEXT REFERENCES lots(id),
  scope TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  evidence_id TEXT REFERENCES evidence(id),
  reviewer TEXT,
  status TEXT NOT NULL CHECK (status IN ('cho_kiem','hop_le','thieu','het_han'))
);

-- ============ Gói và hạn mức (BR-05, BR-33, mục 25) ============
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  plan TEXT NOT NULL CHECK (plan IN ('free','business')),
  period_start TEXT NOT NULL,            -- theo tháng dương lịch
  period_end TEXT NOT NULL,
  prorated_amount_vnd INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('dang_dung','het_han','huy_gia_han'))
);
CREATE TABLE quota_holds (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('ket_noi')),
  period TEXT NOT NULL,                  -- YYYY-MM
  source_id TEXT NOT NULL UNIQUE,        -- connection_requests.id
  status TEXT NOT NULL CHECK (status IN ('giu','da_dung','tra_lai')),
  created_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE TABLE quota_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('ket_noi','tin_mua','tin_ban','ai','loi_chao','video_phut')),
  period TEXT NOT NULL,
  source_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (kind, source_id)               -- chống trừ lượt hai lần (BR-30)
);

-- ============ Danh mục, lô, nhu cầu ============
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sector TEXT NOT NULL,
  branch TEXT NOT NULL,
  grp TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  custom INTEGER NOT NULL DEFAULT 0,     -- mặt hàng tự nhập
  created_by_org TEXT REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'danh_muc' CHECK (status IN ('danh_muc','tu_nhap_cho_duyet','tu_nhap_da_duyet'))
);
CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  kind TEXT NOT NULL CHECK (kind IN ('san_giao','mua_vu')),
  status TEXT NOT NULL CHECK (status IN ('nhap','cong_khai','tam_dung','het_hang')),
  created_at TEXT NOT NULL
);
CREATE TABLE lot_versions (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  revision INTEGER NOT NULL,
  qty_g INTEGER NOT NULL CHECK (qty_g > 0),
  qty_basis TEXT NOT NULL CHECK (qty_basis IN ('uoc_tinh','da_can')),
  grade TEXT,
  avail_from TEXT,
  avail_to TEXT,
  locality TEXT,
  ask_price_vnd_per_kg INTEGER,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (lot_id, revision)
);
CREATE TABLE availability_events (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  kind TEXT NOT NULL CHECK (kind IN ('con_hang','cap_nhat','ban_ngoai','tam_dung','mo_lai')),
  by_user TEXT NOT NULL REFERENCES users(id),
  at TEXT NOT NULL
);
CREATE TABLE purchase_requests (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('nhap','cong_khai','tam_dung','dong')),
  recurring INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  published_at TEXT
);
CREATE TABLE request_lines (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES purchase_requests(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  grade TEXT,
  qty_min_g INTEGER NOT NULL,
  qty_max_g INTEGER NOT NULL CHECK (qty_max_g >= qty_min_g),
  window_from TEXT NOT NULL,
  window_to TEXT NOT NULL,
  delivery_point TEXT,
  pay_terms TEXT
);
CREATE TABLE price_inquiries (          -- BR-46: hỏi giá riêng, không công khai
  id TEXT PRIMARY KEY,
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  lot_id TEXT NOT NULL REFERENCES lots(id),
  qty_g INTEGER NOT NULL,
  window_text TEXT,
  delivery_point TEXT,
  note TEXT,
  status TEXT NOT NULL CHECK (status IN ('cho','da_bao_gia','dong')),
  created_at TEXT NOT NULL
);
CREATE TABLE connection_requests (
  id TEXT PRIMARY KEY,
  from_org TEXT NOT NULL REFERENCES organizations(id),
  to_org TEXT NOT NULL REFERENCES organizations(id),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('ban','mua')),
  lot_id TEXT REFERENCES lots(id),
  inquiry_id TEXT REFERENCES price_inquiries(id),
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('cho','chap_nhan','tu_choi','het_han','rut')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE TABLE relationships (
  id TEXT PRIMARY KEY,
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  UNIQUE (buyer_org, seller_org)
);
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  request_line_id TEXT REFERENCES request_lines(id),
  price_inquiry_id TEXT REFERENCES price_inquiries(id),
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('gui','chap_nhan','tu_choi','het_han')),
  created_at TEXT NOT NULL,
  CHECK ((request_line_id IS NULL) <> (price_inquiry_id IS NULL))   -- XOR (v4 mục 10)
);
CREATE TABLE quote_versions (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  version_no INTEGER NOT NULL,
  price_vnd_per_kg INTEGER NOT NULL CHECK (price_vnd_per_kg > 0),
  qty_g INTEGER NOT NULL,
  valid_until TEXT NOT NULL,
  terms TEXT,
  created_by_org TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  UNIQUE (quote_id, version_no)
);
CREATE TABLE alternative_offers (       -- mục 31.4: chỉ đội đo lường đọc
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  price_vnd_per_kg INTEGER,
  terms TEXT,
  evidence_level TEXT NOT NULL CHECK (evidence_level IN ('loi_ke','co_giay')),
  created_at TEXT NOT NULL
);

-- ============ Hợp đồng khung, đơn, xác nhận, giữ chỗ (BR-16, BR-39) ============
CREATE TABLE framework_agreements (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  framework_id TEXT REFERENCES framework_agreements(id),
  buyer_org TEXT NOT NULL REFERENCES organizations(id),
  seller_org TEXT NOT NULL REFERENCES organizations(id),
  current_version_id TEXT,               -- chỉ đổi khi đủ hai xác nhận
  status TEXT NOT NULL CHECK (status IN ('nhap','cho_xac_nhan','da_xac_nhan','giao_tung_phan','cho_quyet_toan','dong','huy')),
  created_at TEXT NOT NULL,
  CHECK (buyer_org <> seller_org)
);
CREATE TABLE order_versions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  version_no INTEGER NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  terms_json TEXT NOT NULL,              -- điểm giao, cân, tiền, rủi ro, quy trình nghiệm thu
  hash TEXT NOT NULL,
  supersedes_id TEXT REFERENCES order_versions(id),
  created_by_org TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL,
  UNIQUE (order_id, version_no),
  CHECK (julianday(window_end) - julianday(window_start) BETWEEN 0 AND 90)   -- BR-39
);
CREATE TABLE order_lines (
  id TEXT PRIMARY KEY,
  order_version_id TEXT NOT NULL REFERENCES order_versions(id),
  lot_id TEXT REFERENCES lots(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  qty_min_g INTEGER NOT NULL,
  qty_max_g INTEGER NOT NULL CHECK (qty_max_g >= qty_min_g),
  unit_price_vnd_per_kg INTEGER NOT NULL
);
CREATE TABLE order_confirmations (
  id TEXT PRIMARY KEY,
  order_version_id TEXT NOT NULL REFERENCES order_versions(id),
  party TEXT NOT NULL CHECK (party IN ('mua','ban')),
  user_id TEXT NOT NULL REFERENCES users(id),
  method TEXT NOT NULL CHECK (method IN ('app','doi_tac','giay')),
  hash TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  UNIQUE (order_version_id, party)
);
CREATE TABLE signature_attempts (
  id TEXT PRIMARY KEY,
  order_version_id TEXT NOT NULL REFERENCES order_versions(id),
  party TEXT NOT NULL CHECK (party IN ('mua','ban')),
  provider TEXT NOT NULL,
  request_ref TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('cho','thanh_cong','that_bai','cho_kiem_tra')),
  created_at TEXT NOT NULL
);
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  order_version_id TEXT NOT NULL REFERENCES order_versions(id),
  lot_id TEXT NOT NULL REFERENCES lots(id),
  qty_g INTEGER NOT NULL CHECK (qty_g > 0),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cho_dong_y','dang_giu','da_cam_ket','het_han','giai_phong')),
  created_at TEXT NOT NULL
);
CREATE TABLE reservation_consents (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  party TEXT NOT NULL CHECK (party IN ('mua','ban')),
  user_id TEXT NOT NULL REFERENCES users(id),
  at TEXT NOT NULL,
  UNIQUE (reservation_id, party)
);
CREATE TABLE lot_commitments (          -- lượng cam kết theo đơn (BR-09)
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  qty_g INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cam_ket','giai_phong')),
  created_at TEXT NOT NULL,
  UNIQUE (lot_id, order_id)
);

-- ============ Dịch vụ hỗ trợ theo đơn (BR-40, BR-41, BR-44) ============
CREATE TABLE service_engagement_versions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  version_no INTEGER NOT NULL,
  proposed_by TEXT NOT NULL CHECK (proposed_by IN ('mua','ban')),
  status TEXT NOT NULL CHECK (status IN ('de_nghi','kich_hoat','hoan_tat','ket_thuc_chuyen_co_che','huy','vo_hieu')),
  created_at TEXT NOT NULL,
  activated_at TEXT,
  UNIQUE (order_id, version_no)
);
CREATE TABLE service_scopes (
  id TEXT PRIMARY KEY,
  sev_id TEXT NOT NULL UNIQUE REFERENCES service_engagement_versions(id),
  parties TEXT NOT NULL,
  product_group TEXT NOT NULL,
  max_qty_g INTEGER NOT NULL CHECK (max_qty_g > 0),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  included_work TEXT NOT NULL,
  service_period_end TEXT NOT NULL,
  quote_valid_until TEXT NOT NULL
);
CREATE TABLE dispute_plans (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  sev_id TEXT REFERENCES service_engagement_versions(id),
  confirm_hours INTEGER NOT NULL,
  lab_name TEXT NOT NULL,
  mediation_days INTEGER,                -- NULL với đơn tự giao dịch (không có điều phối)
  next_mechanism TEXT NOT NULL,
  accepted_mua_at TEXT,
  accepted_ban_at TEXT
);
CREATE TABLE fee_policy_snapshots (
  id TEXT PRIMARY KEY,
  sev_id TEXT NOT NULL UNIQUE REFERENCES service_engagement_versions(id),
  buyer_plan TEXT NOT NULL CHECK (buyer_plan IN ('free','business')),
  rate_bps INTEGER NOT NULL,
  cap_vnd INTEGER NOT NULL,
  activation_fee_vnd INTEGER NOT NULL,
  tax_bps INTEGER NOT NULL,
  payer_mua_bps INTEGER NOT NULL,
  payer_ban_bps INTEGER NOT NULL,
  CHECK (payer_mua_bps + payer_ban_bps = 10000)
);
CREATE TABLE service_consents (
  id TEXT PRIMARY KEY,
  sev_id TEXT NOT NULL REFERENCES service_engagement_versions(id),
  party TEXT NOT NULL CHECK (party IN ('mua','ban')),
  user_id TEXT NOT NULL REFERENCES users(id),
  max_share_vnd INTEGER NOT NULL,        -- con số tối đa bên đó thấy và đồng ý
  at TEXT NOT NULL,
  UNIQUE (sev_id, party)
);
CREATE TABLE service_milestones (
  id TEXT PRIMARY KEY,
  sev_id TEXT NOT NULL REFERENCES service_engagement_versions(id),
  kind TEXT NOT NULL CHECK (kind IN ('ky_doi_tac','dieu_phoi_rieng','ca_truc_chuyen_biet')),
  price_vnd INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cho','da_lam','huy')),
  performed_at TEXT
);

-- ============ Giao nhận, nghiệm thu, bất đồng (BR-18, BR-42, BR-44) ============
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  seq INTEGER NOT NULL,
  planned_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('chua_giao','dang_giao','da_giao')),
  UNIQUE (order_id, seq)
);
CREATE TABLE measurements (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  metric TEXT NOT NULL,                  -- ca_bi_g, bi_g, tinh_g, brix_x10 ...
  value INTEGER NOT NULL,
  unit TEXT NOT NULL,
  source_label TEXT NOT NULL CHECK (source_label IN ('tu_khai','ben_kia_xac_nhan','doi_tac_xac_nhan')),
  entered_by_org TEXT NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL
);
CREATE TABLE inspection_result_versions (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  version_no INTEGER NOT NULL,
  accepted_g INTEGER NOT NULL,
  rejected_g INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  price_adjust_vnd_per_kg INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  hash TEXT NOT NULL,
  entered_by_org TEXT NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('cho_xac_nhan','bat_dong','chot','thay_the')),
  created_at TEXT NOT NULL,
  UNIQUE (delivery_id, version_no)
);
CREATE TABLE result_confirmations (
  id TEXT PRIMARY KEY,
  result_version_id TEXT NOT NULL REFERENCES inspection_result_versions(id),
  party TEXT NOT NULL CHECK (party IN ('mua','ban')),
  decision TEXT NOT NULL CHECK (decision IN ('dong_y','phan_doi')),
  disputed_g INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  at TEXT NOT NULL,
  UNIQUE (result_version_id, party)
);
CREATE TABLE accepted_lines (
  id TEXT PRIMARY KEY,
  order_line_id TEXT NOT NULL REFERENCES order_lines(id),
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  result_version_id TEXT NOT NULL REFERENCES inspection_result_versions(id),
  qty_g INTEGER NOT NULL CHECK (qty_g > 0),
  unit_price_vnd_per_kg INTEGER NOT NULL,
  value_vnd INTEGER NOT NULL,
  resolution_ref TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE disputes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  delivery_id TEXT REFERENCES deliveries(id),
  result_version_id TEXT REFERENCES inspection_result_versions(id),
  status TEXT NOT NULL CHECK (status IN ('mo','da_giai_quyet','chuyen_co_che')),
  step_index INTEGER NOT NULL DEFAULT 0,
  step_deadline TEXT,
  undisputed_g INTEGER NOT NULL DEFAULT 0,
  disputed_g INTEGER NOT NULL,
  disputed_value_vnd INTEGER NOT NULL,
  goods_location TEXT,
  next_handler TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE dispute_events (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id),
  step_index INTEGER NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL
);

-- ============ Tiền, phí, hóa đơn (BR-22, BR-41, BR-45) ============
CREATE TABLE fee_invoices (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  payer_org TEXT NOT NULL REFERENCES organizations(id),
  order_id TEXT REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('phi_kich_hoat','phi_moc','phi_thanh_cong','thue_bao')),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd >= 0),
  tax_vnd INTEGER NOT NULL DEFAULT 0,
  issued_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('phat_hanh','da_tra','khieu_nai','huy'))
);
CREATE TABLE obligations (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  fee_invoice_id TEXT REFERENCES fee_invoices(id),
  kind TEXT NOT NULL CHECK (kind IN ('tien_hang','coc','phi','doi_tac')),
  payer_org TEXT NOT NULL REFERENCES organizations(id),
  beneficiary_org TEXT NOT NULL REFERENCES organizations(id),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd >= 0),
  due_at TEXT,
  label TEXT,
  created_at TEXT NOT NULL,
  CHECK ((order_id IS NULL) <> (fee_invoice_id IS NULL))            -- XOR (v4 mục 11)
);
CREATE TABLE payout_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  bank TEXT NOT NULL,
  number_masked TEXT NOT NULL,
  number_hash TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cho_xac_minh','dang_dung','da_thay','da_khoa')),
  created_at TEXT NOT NULL,
  activated_at TEXT
);
CREATE TABLE payout_change_requests (
  id TEXT PRIMARY KEY,
  payout_account_id TEXT NOT NULL UNIQUE REFERENCES payout_accounts(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  factors_used TEXT NOT NULL,            -- otp,goi_lai_du_phong,truc_tiep,video
  name_match INTEGER,                    -- 1 khớp, 0 lệch, NULL chưa tra được
  cooldown_until TEXT NOT NULL,
  notified TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('cho','duyet','khoa','xac_minh_thu_cong')),
  denied_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE payment_instructions (
  id TEXT PRIMARY KEY,
  obligation_id TEXT NOT NULL REFERENCES obligations(id),
  payout_account_id TEXT NOT NULL REFERENCES payout_accounts(id),
  issued_at TEXT NOT NULL,
  seen_by_payer_at TEXT
);
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  payer_org TEXT NOT NULL REFERENCES organizations(id),
  payee_org TEXT NOT NULL REFERENCES organizations(id),
  method TEXT NOT NULL CHECK (method IN ('chuyen_khoan','tien_mat','doi_tac')),
  mode TEXT NOT NULL CHECK (mode IN ('demo','truc_tiep','doi_tac')),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
  reference TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE payment_reports (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id),
  reported_by TEXT NOT NULL REFERENCES users(id),
  has_receipt_image INTEGER NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);
CREATE TABLE payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  obligation_id TEXT NOT NULL REFERENCES obligations(id),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0)
);
CREATE TABLE receipt_confirmations (    -- người bán xác nhận: đủ hoặc một phần; không xóa, chỉ điều chỉnh
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  confirmed_by TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('du','mot_phan','chua_thay')),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd >= 0),
  at TEXT NOT NULL
);
CREATE TABLE correction_cases (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  opened_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('mo','dong')),
  at TEXT NOT NULL
);
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
  status TEXT NOT NULL CHECK (status IN ('cho_duyet','cho_doi_tac','da_hoan','tu_choi')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE fee_assessments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  snapshot_id TEXT NOT NULL REFERENCES fee_policy_snapshots(id),
  basis_vnd INTEGER NOT NULL,
  target_fee_vnd INTEGER NOT NULL,
  activation_credit_vnd INTEGER NOT NULL,
  settled_before_vnd INTEGER NOT NULL,
  delta_vnd INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE org_restrictions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('service_activation','ky_va_doi_tai_khoan')),
  reason TEXT NOT NULL,
  from_at TEXT NOT NULL,
  until_at TEXT
);

-- ============ Hỗ trợ, bằng chứng, nhật ký ============
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  entity_ref TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('P0','P1','P2','P3')),
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('moi','phan_cong','xu_ly','cho_thong_tin','co_ket_qua','chuyen_co_che','dong')),
  assignee TEXT,
  next_update_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  owner_org TEXT NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL,
  hash TEXT NOT NULL,
  mime TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  source_label TEXT NOT NULL CHECK (source_label IN ('tu_khai','ben_kia_xac_nhan','doi_tac_xac_nhan')),
  created_at TEXT NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  text TEXT NOT NULL,
  link TEXT,
  at TEXT NOT NULL,
  read_at TEXT
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_user TEXT,
  org_id TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  request_id TEXT,
  at TEXT NOT NULL
);
CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE idempotency_keys (
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status INTEGER NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (key, user_id)
);

-- ============ Đo lường pilot (mục 31) ============
CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  order_id TEXT REFERENCES orders(id),
  category TEXT NOT NULL CHECK (category IN ('huong_dan','xac_minh','tim_nguon','chuan_bi_thoa_thuan','dieu_phoi','truc_cho','ngoai_le','doi_soat')),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  external_cost_vnd INTEGER NOT NULL DEFAULT 0,
  subsidized INTEGER NOT NULL DEFAULT 0,
  is_estimate INTEGER NOT NULL DEFAULT 0,
  performed_by TEXT NOT NULL CHECK (performed_by IN ('nhan_vien','khach')),
  customer_task INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE eligibility_records (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  eligible INTEGER NOT NULL,
  offered INTEGER NOT NULL,
  reason_not_offered TEXT,
  capacity_gap TEXT
);

CREATE INDEX idx_lots_seller ON lots(seller_org);
CREATE INDEX idx_conn_to ON connection_requests(to_org, status);
CREATE INDEX idx_conn_from ON connection_requests(from_org, status);
CREATE INDEX idx_orders_buyer ON orders(buyer_org);
CREATE INDEX idx_orders_seller ON orders(seller_org);
CREATE INDEX idx_obl_order ON obligations(order_id);
CREATE INDEX idx_notif_org ON notifications(org_id, at);
