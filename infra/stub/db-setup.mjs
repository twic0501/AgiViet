#!/usr/bin/env node
// Dựng database đo tải (GIẢ LẬP): tạo database "agiviet_bench" nếu chưa có, chạy schema.sql, seed.sql,
// và tùy chọn toi-uu.sql. Không cần psql: dùng thư viện pg.
//
//   DATABASE_URL_ADMIN=postgres://agiviet_owner@127.0.0.1:55433/postgres \
//   DATABASE_URL=postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench \
//   node db-setup.mjs [--scale 1] [--chi-schema] [--toi-uu] [--bo-toi-uu] [--dat-lai]
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const scale = Number(args[args.indexOf('--scale') + 1] || 1) || 1;
const url = process.env.DATABASE_URL || 'postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench';
const adminUrl = process.env.DATABASE_URL_ADMIN || url.replace(/\/[^/]+$/, '/postgres');
const dbName = new URL(url).pathname.slice(1);

if (!/^[a-z][a-z0-9_]*_bench$/.test(dbName)) throw new Error('Chỉ dựng database riêng có hậu tố _bench');
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (!exists.rowCount) {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  log(`đã tạo database ${dbName}`);
}
await admin.end();

const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query(`SET timezone = 'Asia/Ho_Chi_Minh'`);
const run = async (file, subst = {}) => {
  let sql = readFileSync(join(here, 'sql', file), 'utf8');
  for (const [k, v] of Object.entries(subst)) sql = sql.replaceAll(`{{${k}}}`, String(v));
  log(`chạy ${file} ...`);
  await c.query(sql);
  log(`xong ${file}`);
};

if (flag('--dat-lai')) {
  await run('dat-lai.sql');
  await c.query('VACUUM ANALYZE');
  log('đã VACUUM ANALYZE');
} else if (flag('--bo-toi-uu')) {
  await run('bo-toi-uu.sql');
} else if (flag('--toi-uu')) {
  await run('toi-uu.sql');
} else {
  await run('schema.sql');
  if (!flag('--chi-schema')) {
    await run('seed.sql', { SCALE: scale });
    await c.query('ANALYZE');
    const r = await c.query(`SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='bench' ORDER BY n_live_tup DESC LIMIT 12`);
    for (const row of r.rows) log(`  ${row.relname.padEnd(18)} ${row.n_live_tup}`);
    const sz = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS s`);
    log(`kích thước database: ${sz.rows[0].s}`);
  }
}
await c.end();
