import pg from '../stub/node_modules/pg/lib/index.js';
const c = new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect();
const t=performance.now();
await c.query('REFRESH MATERIALIZED VIEW CONCURRENTLY bench.mkt_ref_price');
const refresh_ms=performance.now()-t;
const plan=(await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM bench.ledger_accounts WHERE order_id=(SELECT id FROM bench.orders WHERE code='DC-00000001') AND account_type='deposit_escrow'`)).rows;
const counts=(await c.query(`SELECT relname,n_live_tup FROM pg_stat_user_tables WHERE schemaname='bench' ORDER BY n_live_tup DESC`)).rows;
const settings=(await c.query(`SELECT version(), current_setting('shared_buffers') AS shared_buffers, pg_database_size(current_database()) AS bytes`)).rows[0];
console.log(JSON.stringify({refresh_ms,plan,counts,settings},null,2));await c.end();
