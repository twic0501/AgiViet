import pg from '../stub/node_modules/pg/lib/index.js';
const c=new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect();
const q=await c.query(`SELECT status,count(*)::int AS n FROM bench.jobs GROUP BY status`);
const lag=await c.query(`SELECT percentile_cont(ARRAY[0.5,0.95,0.99]) WITHIN GROUP(ORDER BY extract(epoch FROM done_at-created_at)*1000) AS pdf_end_to_end_ms FROM bench.jobs WHERE status='done'`);
const qr=await c.query(`SELECT count(*) AS dot_quet_hai_lan FROM (SELECT delivery_id FROM bench.qr_scans WHERE result='ok' GROUP BY 1 HAVING count(*)>1) x`);
const full=await c.query(`SELECT
 (SELECT count(*) FROM bench.ledger_balances b FULL JOIN
    (SELECT account_id,sum(amount_vnd) AS amount,count(*) AS n FROM bench.ledger_entries GROUP BY 1) e USING(account_id)
    WHERE b.account_id IS NULL OR e.account_id IS NULL OR b.balance_vnd<>e.amount OR b.entry_count<>e.n) AS so_du_thieu_hoac_lech,
 (SELECT count(*) FROM bench.ledger_txns t LEFT JOIN
    (SELECT transaction_id,count(*) AS n,sum(amount_vnd) AS amount FROM bench.ledger_entries GROUP BY 1) e ON t.id=e.transaction_id
    WHERE coalesce(e.n,0)<2 OR e.amount<>0) AS giao_dich_thieu_hoac_lech,
 (SELECT count(*) FROM bench.lots l LEFT JOIN
    (SELECT lot_id,sum(qty_g) AS qty FROM bench.qty_balances GROUP BY 1) b ON b.lot_id=l.id
    WHERE l.status IN ('open','reserved') AND coalesce(b.qty,0)<>l.qty_total_g) AS lo_lech_luong`);
console.log(JSON.stringify({jobs:q.rows,pdf:lag.rows,qr:qr.rows,doi_soat_day_du:full.rows},null,2)); await c.end();
