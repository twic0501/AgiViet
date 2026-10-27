#!/usr/bin/env node
// Kiểm chứng toàn bộ SQL (migrations + seed + tests) trên PGlite: PostgreSQL 17 biên dịch sang WASM,
// chạy trong tiến trình Node, không cần Docker hay cài Postgres hệ thống.
// Dùng khi không có Docker. Bản chính thức vẫn là postgres:17 qua docker-compose (xem db/README.md).
//
// Cài và chạy trong db/: npm ci --cache /tmp/agiviet-npm-cache; npm test
// Có thể dùng bản cài bên ngoài bằng PGLITE_DIR. package-lock ghim PGlite 0.3.16.
//
// Giới hạn đã biết của PGlite: một kết nối duy nhất (không thử được tranh chấp khóa giữa hai phiên),
// không có pg_cron. Các phần đó chỉ kiểm được trên postgres:17 thật.

import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = join(here, '..');
rmSync(join(dbDir,'test-results.json'),{force:true});
const pgliteDir = process.env.PGLITE_DIR || join(dbDir, 'node_modules/@electric-sql/pglite');
const mod = (p) => import(pathToFileURL(join(pgliteDir, 'dist', p)).href);
const { PGlite } = await mod('index.js');
const { btree_gist } = await mod('contrib/btree_gist.js');
const { pgcrypto } = await mod('contrib/pgcrypto.js');

const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone = 'Asia/Ho_Chi_Minh'`);
const ver = await db.query('SELECT version()');
console.log(ver.rows[0].version);

const applied = [];
await db.exec('CREATE TABLE public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
const { createHash } = await import('node:crypto');
const run = async (folder) => {
  const dir = join(dbDir, folder);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    const t = Date.now();
    const sha = createHash('sha256').update(sql).digest('hex');
    if (folder === 'migrations') {
      const old = await db.query('SELECT sha256 FROM public.schema_migrations WHERE name=$1', [f]);
      if (old.rows.length) {
        if (old.rows[0].sha256 !== sha) throw new Error('Checksum migration đổi: ' + f);
        continue;
      }
    }
    try {
      await db.exec('BEGIN;\n' + sql + '\nCOMMIT;');
      if (folder === 'migrations') {
        await db.query('INSERT INTO public.schema_migrations(name,sha256) VALUES($1,$2)',[f,sha]);
        applied.push(f);
      }
      console.log(`  ok  ${folder}/${f} (${Date.now() - t} ms)`);
    } catch (e) {
      console.error(`  LỖI ${folder}/${f}: ${e.message}`);
      if (e.position) {
        const pos = Number(e.position) + 0 - 'BEGIN;\n'.length;
        const line = sql.slice(0, pos).split('\n').length;
        console.error(`       tại dòng ~${line}: ${sql.split('\n')[line - 1]?.trim()}`);
      }
      if (e.where) console.error(`       ${e.where}`);
      process.exit(1);
    }
  }
};

console.log('Migrations:');
await run('migrations');
console.log('Seed:');
await run('seed');
const snapshot = async () => (await db.query(`SELECT
 (SELECT count(*)::int FROM core.users) users,
 (SELECT count(*)::int FROM ledger.entries) entries,
 (SELECT count(*)::int FROM ledger.qty_movements) movements,
 (SELECT count(*)::int FROM evt.state_history) history,
 (SELECT count(*)::int FROM evt.domain_events) events`)).rows[0];
const before = await snapshot();
await run('migrations');
await run('seed');
if (JSON.stringify(before) !== JSON.stringify(await snapshot())) throw new Error('Migrate/seed lần hai làm thay đổi số bản ghi');
console.log('Migrate/seed lần hai: không ghi trùng.');
console.log('Tests:');
await run('tests');

// Đối chiếu binding chữ ký với helper chính thức security (chỉ import/đọc).
const { bindingHash } = await import(pathToFileURL(join(dbDir,'..','security','lib','otp.mjs')).href);
const otpSample = (await db.query(`SELECT test.person('Trần Thu Hà')::text uid,
 core.signature_binding(test.id('SEC-SIGN:contract')) binding,
 encode(evt.otp_hash('contract_sign',test.person('Trần Thu Hà'),core.signature_binding(test.id('SEC-SIGN:contract'))),'hex') hash`)).rows[0];
await db.query('SELECT test.check($1,$2)', ['D15 SHA256 binding chữ ký khớp security/lib/otp.mjs',otpSample.hash===bindingHash('contract_sign',otpSample.uid,otpSample.binding)]);
// Kiểm công cụ xuất/đối chiếu audit bằng SHA256 độc lập ngoài SQL.
const { spawnSync } = await import('node:child_process');
const exported = (await db.query(`SELECT c.seq,c.audit_id,encode(c.previous_sha256,'hex') previous_sha256,
 encode(c.row_sha256,'hex') row_sha256,c.row_json FROM evt.audit_chain c JOIN evt.audit_log a ON a.id=c.audit_id ORDER BY c.seq`)).rows;
const jsonl = exported.map(r=>JSON.stringify(r)).join('\n')+'\n';
const checkAudit = (payload, checkpoint) => spawnSync(process.execPath,[join(here,'kiem-tra-audit.mjs'),'-',...(checkpoint?[checkpoint]:[])],{input:payload,encoding:'utf8'});
const checkpoint = exported.at(-1)?.row_sha256;
const goodAudit = checkAudit(jsonl,checkpoint);
const changed = structuredClone(exported); changed[0].row_json+=' ';
const badAudit = checkAudit(changed.map(r=>JSON.stringify(r)).join('\n'));
const badCheckpoint = checkAudit(jsonl,'ff'.repeat(32));
await db.query('SELECT test.check($1,$2,$3)', ['D19 exporter kiểm hash và checkpoint ngoài SQL',goodAudit.status===0,goodAudit.status?goodAudit.stderr:null]);
await db.query('SELECT test.check($1,$2)', ['D19 exporter phát hiện nội dung hoặc checkpoint bị đổi',badAudit.status!==0 && badCheckpoint.status!==0]);
const res = await db.query('SELECT name, passed, detail FROM test.results ORDER BY id');
let fail = 0;
for (const r of res.rows) {
  if (!r.passed) fail++;
  console.log(`${r.passed ? '  ĐẠT ' : '  HỎNG'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
const counts = await db.query(`
  SELECT count(*)::int AS n FROM information_schema.tables
  WHERE table_type = 'BASE TABLE' AND table_schema IN ('ref','core','ledger','pii','ops','evt','mkt')`);
console.log(`\nSố bảng: ${counts.rows[0].n}. Kiểm tra: ${res.rows.length - fail}/${res.rows.length} đạt.`);
if (!res.rows.length) throw new Error('Không có kiểm tra bất biến nào được chạy');
const report = { checked_at: new Date().toISOString(), engine: ver.rows[0].version, migrations: applied,
 tables: counts.rows[0].n, migration_seed_replay: true, checks: res.rows.length, passed: res.rows.length-fail, failed: fail, results: res.rows };
writeFileSync(join(dbDir,'test-results.json'), JSON.stringify(report,null,2)+'\n');
await db.close();
process.exit(fail ? 1 : 0);
