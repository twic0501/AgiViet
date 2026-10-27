// Công cụ dev: nạp DB mới vào PGlite rồi chạy các câu SQL trong file (phân tách bằng dòng ';;').
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dbDir = new URL('../../db/', import.meta.url).pathname;
const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone='Asia/Ho_Chi_Minh'`);
for (const folder of ['migrations', 'seed']) {
  for (const f of readdirSync(join(dbDir, folder)).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec('BEGIN;\n' + readFileSync(join(dbDir, folder, f), 'utf8') + '\nCOMMIT;');
  }
}
const sqls = readFileSync(process.argv[2], 'utf8').split(/^;;$/m).map((s) => s.trim()).filter(Boolean);
for (const s of sqls) {
  try {
    const r = await db.query(s);
    console.log('### ' + s.split('\n')[0].slice(0, 100));
    for (const row of r.rows) console.log(Object.values(row).map((v) => (v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' | '));
  } catch (e) {
    console.log('ERR ' + e.message);
  }
}
