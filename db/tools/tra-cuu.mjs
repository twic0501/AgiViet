#!/usr/bin/env node
// Dựng DB tạm (PGlite, trong bộ nhớ) từ migrations + seed rồi chạy câu SQL tra cứu, in kết quả dạng bảng.
// Dùng để đối chiếu thiết kế, không ghi gì ra ngoài.
// Chạy: node db/tools/tra-cuu.mjs "SELECT ..." ["SELECT ..." ...]   hoặc   node db/tools/tra-cuu.mjs -f tep.sql
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dbDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pgliteDir = process.env.PGLITE_DIR || join(dbDir, 'node_modules/@electric-sql/pglite');
const mod = (p) => import(pathToFileURL(join(pgliteDir, 'dist', p)).href);
const { PGlite } = await mod('index.js');
const { btree_gist } = await mod('contrib/btree_gist.js');
const { pgcrypto } = await mod('contrib/pgcrypto.js');

const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone = 'Asia/Ho_Chi_Minh'`);
await db.exec('CREATE TABLE public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
for (const folder of ['migrations', 'seed']) {
  const dir = join(dbDir, folder);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
}
const args = process.argv.slice(2);
const cau = args[0] === '-f' ? [readFileSync(args[1], 'utf8')] : args;
for (const sql of cau) {
  const kq = await db.query(sql);
  if (!kq.rows.length) { console.log('(không có dòng)'); continue; }
  const cot = Object.keys(kq.rows[0]);
  console.log(cot.join(' | '));
  for (const r of kq.rows) console.log(cot.map((c) => (r[c] === null ? '∅' : String(r[c]))).join(' | '));
  console.log(`— ${kq.rows.length} dòng`);
}
