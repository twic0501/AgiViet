-- Bất biến tiền: chạy ĐỌC (không ghi) trên Postgres thật hoặc PGlite, mỗi câu trả về các dòng VI PHẠM.
-- Không có dòng nào = đạt. Dùng: định kỳ (mỗi giờ) trên production + sau mỗi bộ kiểm thử backend.
-- Mỗi câu bắt đầu bằng dòng chú thích "-- @kiem <mã> <mô tả>" để runner tách và đặt tên.
-- Phụ thuộc lược đồ db/migrations 0001–0008 (bản 25/10/2026). Câu nào tham chiếu bảng chưa có thì runner bỏ qua và báo.

-- @kiem S01 Mỗi giao dịch sổ cái cân (tổng = 0) và có ≥ 2 bút toán
SELECT t.id, coalesce(sum(e.amount_vnd), 0) AS tong, count(e.id) AS so_dong
  FROM ledger.transactions t LEFT JOIN ledger.entries e ON e.transaction_id = t.id
 GROUP BY t.id HAVING coalesce(sum(e.amount_vnd), 0) <> 0 OR count(e.id) < 2;

-- @kiem S02 Số dư đệm bằng tổng bút toán
SELECT a.id, b.balance_vnd, coalesce(s.tong, 0) AS tong_but_toan
  FROM ledger.accounts a
  LEFT JOIN ledger.account_balances b ON b.account_id = a.id
  LEFT JOIN (SELECT account_id, sum(amount_vnd) AS tong FROM ledger.entries GROUP BY account_id) s ON s.account_id = a.id
 WHERE coalesce(b.balance_vnd, 0) <> coalesce(s.tong, 0);

-- @kiem S03 Tài khoản không được âm thì không âm
SELECT a.id, a.account_type, b.balance_vnd
  FROM ledger.accounts a JOIN ledger.account_balances b ON b.account_id = a.id
  JOIN ref.ledger_account_types t ON t.code = a.account_type
 WHERE t.non_negative AND b.balance_vnd < 0;

-- @kiem S04 Quyền đòi đối xứng theo đơn (seller_receivable + buyer_payable = 0)
SELECT a.order_id, sum(e.amount_vnd) AS lech
  FROM ledger.entries e JOIN ledger.accounts a ON a.id = e.account_id
 WHERE a.account_type IN ('seller_receivable','buyer_payable')
 GROUP BY a.order_id HAVING sum(e.amount_vnd) <> 0;

-- @kiem S05 Bút toán của giao dịch theo đơn chỉ chạm tài khoản của chính đơn đó (đề xuất D-03)
SELECT t.id AS giao_dich, t.order_id, a.order_id AS don_cua_tai_khoan, a.account_type
  FROM ledger.transactions t JOIN ledger.entries e ON e.transaction_id = t.id JOIN ledger.accounts a ON a.id = e.account_id
 WHERE t.order_id IS NOT NULL AND a.order_id IS NOT NULL AND a.order_id <> t.order_id;

-- @kiem S06 Bút toán external của giao dịch theo đơn chỉ thuộc bên mua hoặc bên bán của đơn (đề xuất D-03)
SELECT t.id AS giao_dich, t.order_id, a.org_id
  FROM ledger.transactions t JOIN core.orders o ON o.id = t.order_id
  JOIN ledger.entries e ON e.transaction_id = t.id JOIN ledger.accounts a ON a.id = e.account_id
 WHERE a.account_type = 'external' AND a.org_id NOT IN (o.buyer_org_id, o.seller_org_id);

-- @kiem S07 Giao dịch thủ công/đảo phải có người duyệt khác người lập (Q16, đề xuất D-04)
SELECT t.id, t.kind, t.posted_by, t.approved_by
  FROM ledger.transactions t JOIN ref.ledger_txn_kinds k ON k.code = t.kind
 WHERE (k.money_type = 'correction' OR t.reverses_id IS NOT NULL)
   AND (t.approved_by IS NULL OR t.approved_by = t.posted_by);

-- @kiem S08 Mỗi giao dịch chỉ bị đảo tối đa một lần
SELECT reverses_id, count(*) FROM ledger.transactions WHERE reverses_id IS NOT NULL GROUP BY reverses_id HAVING count(*) > 1;

-- @kiem S09 Phí không bao giờ lấy từ tiền người bán (BT-T10): không có giao dịch nào ghi Có external của người bán
--         đồng thời ghi Nợ fee_held hoặc platform_revenue
SELECT t.id
  FROM ledger.transactions t JOIN core.orders o ON o.id = t.order_id
 WHERE EXISTS (SELECT 1 FROM ledger.entries e JOIN ledger.accounts a ON a.id = e.account_id
                WHERE e.transaction_id = t.id AND a.account_type = 'external' AND a.org_id = o.seller_org_id AND e.amount_vnd < 0)
   AND EXISTS (SELECT 1 FROM ledger.entries e JOIN ledger.accounts a ON a.id = e.account_id
                WHERE e.transaction_id = t.id AND a.account_type IN ('fee_held','platform_revenue') AND e.amount_vnd > 0);

-- @kiem S10 Cọc ngân hàng xác nhận không vượt giá trị hợp đồng (BT-T2, Q07)
SELECT o.id, b.balance_vnd AS coc_dang_giu, v.contract_value_vnd
  FROM core.orders o
  JOIN core.order_versions v ON v.order_id = o.id AND v.version_no = o.effective_version_no
  JOIN ledger.accounts a ON a.order_id = o.id AND a.account_type = 'deposit_escrow'
  JOIN ledger.account_balances b ON b.account_id = a.id
 WHERE b.balance_vnd > v.contract_value_vnd;

-- @kiem S11 Đơn đã hiệu lực (hoặc sau đó) phải có cọc đã ghi sổ (không hiệu lực khi chưa có tiền)
SELECT o.id, o.code, o.status
  FROM core.orders o
 WHERE o.status IN ('active','awaiting_settlement','outstanding','completed')
   AND o.contract_type NOT IN ('framework_calloff')
   AND NOT EXISTS (SELECT 1 FROM ledger.transactions t JOIN ref.ledger_txn_kinds k ON k.code = t.kind
                    WHERE t.order_id = o.id AND k.money_type = 'deposit');

-- @kiem S12 Khoản trả thẳng "đã nhận đủ" phải có tổng xác nhận của bên nhận bằng số phải trả (BT-T9)
SELECT d.id, d.code, d.amount_due_vnd, coalesce(sum(c.amount_vnd), 0) AS da_xac_nhan
  FROM core.direct_payments d LEFT JOIN core.direct_payment_confirmations c ON c.direct_payment_id = d.id
 WHERE d.status = 'fully_received'
 GROUP BY d.id HAVING coalesce(sum(c.amount_vnd), 0) <> d.amount_due_vnd;

-- @kiem S13 Không có hai lệnh ngân hàng thành công cùng căn cứ và cùng loại (BT-T7)
SELECT basis_kind, basis_id, kind, count(*)
  FROM core.bank_instructions WHERE status IN ('succeeded','reconciled')
 GROUP BY basis_kind, basis_id, kind HAVING count(*) > 1;

-- @kiem S14 Lệnh thủ công có người duyệt khác người lập
SELECT id, code FROM core.bank_instructions WHERE is_manual AND (approved_by IS NULL OR approved_by = created_by);

-- @kiem S15 Tổng chi + hoàn từ cọc theo lệnh không vượt cọc ngân hàng xác nhận (BT-T1, phần kiểm được bằng lệnh)
SELECT i.deposit_id, sum(i.amount_vnd) AS tong_lenh, d.expected_deposit_vnd + d.expected_fee_vnd AS da_nop_du_kien
  FROM core.bank_instructions i JOIN core.deposits d ON d.id = i.deposit_id
 WHERE i.status IN ('created','sent','processing','succeeded','reconciled')
 GROUP BY i.deposit_id, d.expected_deposit_vnd, d.expected_fee_vnd
HAVING sum(i.amount_vnd) > d.expected_deposit_vnd + d.expected_fee_vnd;

-- @kiem S16 Mỗi sự kiện ngân hàng áp dụng một lần (BT-T8): không có hai giao dịch sổ cái cùng mã sự kiện
SELECT idempotency_key, count(*) FROM ledger.transactions
 WHERE idempotency_key LIKE 'bank:%' GROUP BY idempotency_key HAVING count(*) > 1;

-- @kiem S17 Một tài khoản ngân hàng (băm) đang dùng cho nhiều tổ chức (cờ R2, không phải lỗi tuyệt đối)
SELECT account_number_hash, array_agg(DISTINCT org_id) AS to_chuc
  FROM pii.bank_accounts WHERE status IN ('active','cooling_down')
 GROUP BY account_number_hash HAVING count(DISTINCT org_id) > 1;

-- @kiem S18 Tài khoản nhận tiền được kích hoạt trước khi hết thời gian chờ
SELECT id, org_id, cooldown_until, activated_at FROM pii.bank_accounts
 WHERE activated_at IS NOT NULL AND (cooldown_until IS NULL OR activated_at < cooldown_until);

-- @kiem S19 Tài khoản chụp trong phiên bản hợp đồng thuộc đúng tổ chức bán của đơn
SELECT v.order_id, v.version_no, b.org_id AS chu_tai_khoan, o.seller_org_id
  FROM core.order_versions v JOIN core.orders o ON o.id = v.order_id JOIN pii.bank_accounts b ON b.id = v.seller_bank_account_id
 WHERE b.org_id <> o.seller_org_id;

-- @kiem S20 Webhook chữ ký sai không bao giờ được áp dụng
SELECT id, provider, provider_event_id FROM evt.inbound_webhooks WHERE NOT signature_valid AND process_result = 'applied';

-- @kiem S21 Người giúp không có vai được ký/chi tiền/đổi tài khoản trong cùng tổ chức (K17 đường vòng)
SELECT d.helper_user_id, d.org_id, r.code
  FROM core.delegations d
  JOIN core.memberships m ON m.user_id = d.helper_user_id AND m.org_id = d.org_id AND m.status = 'active'
  JOIN core.membership_roles mr ON mr.membership_id = m.id JOIN ref.roles r ON r.code = mr.role_code
 WHERE d.revoked_at IS NULL AND (r.can_sign OR r.can_pay OR r.can_payout_admin);
