-- Đặt lại phần dữ liệu do lượt đo tải sinh ra (giữ dữ liệu ảo gốc), để các lượt đo so sánh được.
SET search_path = bench;
SET session_replication_role = replica;
DELETE FROM ledger_entries WHERE transaction_id IN (SELECT id FROM ledger_txns WHERE memo <> 'seed');
DELETE FROM ledger_txns WHERE memo <> 'seed';
TRUNCATE ledger_balances;
INSERT INTO ledger_balances (account_id, balance_vnd, entry_count)
SELECT account_id, sum(amount_vnd), count(*) FROM ledger_entries GROUP BY account_id;
DELETE FROM ledger_accounts a WHERE a.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ledger_balances b WHERE b.account_id = a.id);
UPDATE orders SET deposit_status = 'sent', status = 'awaiting_deposit', version = 1
 WHERE code LIKE 'DC-%' AND deposit_status <> 'sent';
TRUNCATE inbound_webhooks, outbox, idempotency_keys, qr_scans, jobs, documents, photos;
UPDATE deliveries SET status = 'scheduled' WHERE status <> 'scheduled';
DELETE FROM qty_balances WHERE lot_id IN (SELECT id FROM lots WHERE code LIKE 'LN-%');
DELETE FROM qty_movements WHERE lot_id IN (SELECT id FROM lots WHERE code LIKE 'LN-%');
DELETE FROM lots WHERE code LIKE 'LN-%';
SET session_replication_role = origin;
