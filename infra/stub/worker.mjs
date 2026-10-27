#!/usr/bin/env node
// =====================================================================
// WORKER GIẢ LẬP: lấy việc từ bảng bench.jobs (FOR UPDATE SKIP LOCKED), sinh PDF hợp đồng.
// Cùng mẫu với outbox thật (docs/database N7): không cần Redis, hàng đợi nằm trong Postgres.
// Chạy N tiến trình worker để tăng thông lượng (sinh PDF là việc CPU đồng bộ trong một tiến trình Node).
//   DATABASE_URL=...  WORKER_ID=w1  DOC_DIR=/tmp/agv-docs  node worker.mjs
// =====================================================================
import pg from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderContract } from './lib/pdf.mjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench';
const DOC_DIR = process.env.DOC_DIR || '/tmp/agv-docs';
const ID = process.env.WORKER_ID || `w${process.pid}`;
mkdirSync(DOC_DIR, { recursive: true });

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
const listener = new pg.Client({ connectionString: DATABASE_URL });
await listener.connect();
await listener.query('LISTEN bench_jobs');
let wake = null;
listener.on('notification', () => wake?.());

const claim = async () => {
  const { rows } = await pool.query(`
    UPDATE bench.jobs SET status = 'running', started_at = now(), attempts = attempts + 1
    WHERE id = (SELECT id FROM bench.jobs WHERE status = 'queued' AND available_at <= now()
                ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id, kind, payload`);
  return rows[0];
};

let stopping = false;
process.on('SIGTERM', () => { stopping = true; wake?.(); });
process.on('SIGINT', () => { stopping = true; wake?.(); });
console.log(`[worker ${ID}] GIẢ LẬP: chờ việc trong bench.jobs`);

while (!stopping) {
  const job = await claim();
  if (!job) {
    await new Promise((r) => { wake = r; setTimeout(r, 1000); });
    continue;
  }
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.code, o.grade, o.qty_g, o.unit_price_vnd_per_kg, o.deposit_vnd, o.fee_vnd,
             c.name_vi AS commodity_name, s.name AS seller_name, b.name AS buyer_name
      FROM bench.orders o JOIN bench.commodities c ON c.id = o.commodity_id
      JOIN bench.orgs s ON s.id = o.seller_org_id JOIN bench.orgs b ON b.id = o.buyer_org_id
      WHERE o.code = $1`, [job.payload.code]);
    if (!rows.length) throw new Error('không có đơn');
    const { buf, sha256 } = await renderContract(rows[0]);
    const key = `contracts/${rows[0].code}-${job.id}.pdf`;
    writeFileSync(join(DOC_DIR, key.replace('/', '_')), buf);
    await pool.query(
      `INSERT INTO bench.documents (order_id, kind, version, sha256, storage_key, bytes)
       VALUES ($1, 'contract', coalesce((SELECT max(version) FROM bench.documents WHERE order_id = $1 AND kind = 'contract'), 0) + 1, $2, $3, $4)`,
      [rows[0].id, sha256, key, buf.length]);
    await pool.query(`UPDATE bench.jobs SET status = 'done', done_at = now(), result = $2 WHERE id = $1`,
      [job.id, { bytes: buf.length, sha256: sha256.toString('hex') }]);
  } catch (e) {
    // thử lại có giãn cách; quá 5 lần thì đánh dấu failed để vận hành xem
    await pool.query(`UPDATE bench.jobs SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'queued' END,
                      available_at = now() + (attempts * interval '10 seconds'), result = $2 WHERE id = $1`,
      [job.id, { loi: e.message }]);
  }
}
await listener.end();
await pool.end();
