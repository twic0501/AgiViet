// Công cụ dev: nạp migrations + seed vào PGlite rồi in lược đồ để tra cứu.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dbDir = new URL('../../db/', import.meta.url).pathname;
const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone='Asia/Ho_Chi_Minh'`);
for (const folder of ['migrations', 'seed']) {
  for (const f of readdirSync(join(dbDir, folder)).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec('BEGIN;\n' + readFileSync(join(dbDir, folder, f), 'utf8') + '\nCOMMIT;');
  }
}
const out = [];
const q = async (title, sql) => {
  const r = await db.query(sql);
  out.push('## ' + title);
  for (const row of r.rows) out.push(Object.values(row).map((v) => (v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' | '));
};
await q('cols', `SELECT table_schema||'.'||table_name, string_agg(column_name||':'||data_type||CASE WHEN is_nullable='NO' AND column_default IS NULL THEN '!' ELSE '' END, ', ' ORDER BY ordinal_position)
 FROM information_schema.columns WHERE table_schema IN ('ref','core','ledger','pii','ops','evt','mkt') GROUP BY 1 ORDER BY 1`);
await q('transitions', `SELECT * FROM ref.state_transitions ORDER BY 1,2,3`);
await q('statuses', `SELECT entity, string_agg(code, ',') FROM ref.statuses GROUP BY 1 ORDER BY 1`);
writeFileSync(process.argv[2] || '/tmp/agv-schema.txt', out.join('\n'));
console.log('ok');
