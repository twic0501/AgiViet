// npm run test:pg — dựng PostgreSQL 17 nhúng trong thư mục tạm, migrate + seed bằng owner, cấp quyền cổng (db/scripts/cap-quyen-cong.sql),
// chạy bộ tình huống với DATABASE_URL = agv_backend_gateway, rồi tắt sạch. Không sudo, không docker.
// Binary: AGV_PG_BIN (thư mục có initdb/pg_ctl/postgres) và AGV_PSQL (psql 17). Mặc định dùng bản đã tải ở infra/.local.
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOC = join(BACKEND, '..');
const BIN = process.env.AGV_PG_BIN ?? join(GOC, 'infra/.local/tools/node_modules/@embedded-postgres/linux-x64/native/bin');
const PSQL = process.env.AGV_PSQL ?? join(GOC, 'infra/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin/psql');
const PORT = process.env.AGV_TEST_PG_PORT ?? '55441';
const LIBPQ = process.env.AGV_LIBPQ_DIR ?? join(BIN, '..', 'lib');
process.env.LD_LIBRARY_PATH = [LIBPQ, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
for (const f of [join(BIN, 'initdb'), join(BIN, 'pg_ctl'), PSQL]) if (!existsSync(f)) { console.error(`Thiếu ${f} (đặt AGV_PG_BIN/AGV_PSQL)`); process.exit(2); }

const thuMuc = mkdtempSync(join(tmpdir(), 'agv-pg-'));
const data = join(thuMuc, 'data');
const chay = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → ${r.status}`);
};
const owner = (db) => `postgres://agiviet_owner@127.0.0.1:${PORT}/${db}`;
let dangChay = false;
function tat() {
  if (dangChay) { spawnSync(join(BIN, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w'], { stdio: 'inherit' }); dangChay = false; }
  rmSync(thuMuc, { recursive: true, force: true });
}
process.on('SIGINT', () => { tat(); process.exit(130); });

let ma = 1;
try {
  chay(join(BIN, 'initdb'), ['-D', data, '-U', 'agiviet_owner', '--auth=trust', '-E', 'UTF8', '--locale=C', '-c', 'timezone=Asia/Ho_Chi_Minh']);
  chay(join(BIN, 'pg_ctl'), ['-D', data, '-l', join(thuMuc, 'pg.log'), '-w', 'start', '-o', `-p ${PORT} -k ${thuMuc} -c listen_addresses=127.0.0.1 -c max_connections=200`]);
  dangChay = true;
  const psqlEnv = { PATH: `${dirname(PSQL)}:${process.env.PATH}` };
  chay(PSQL, [owner('postgres'), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c', 'CREATE DATABASE agiviet_mau']);
  chay('bash', [join(GOC, 'db/scripts/migrate.sh')], { ...psqlEnv, DATABASE_URL: owner('agiviet_mau') });
  chay('bash', [join(GOC, 'db/scripts/seed.sh')], { ...psqlEnv, DATABASE_URL: owner('agiviet_mau') });
  chay(PSQL, [owner('agiviet_mau'), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-v', 'gateway_password=thu-cong-chi-dung-local', '-f', join(GOC, 'db/scripts/cap-quyen-cong.sql')]);
  // Chỉ kiểm thử: vai ghi đồng hồ nghiệp vụ (production không có).
  chay(PSQL, [owner('agiviet_mau'), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c',
    `CREATE ROLE agv_backend_clock NOLOGIN NOSUPERUSER BYPASSRLS; GRANT USAGE ON SCHEMA cmd TO agv_backend_clock;
     GRANT SELECT,INSERT,UPDATE ON cmd.test_clock TO agv_backend_clock; GRANT agv_backend_clock TO agv_backend_gateway WITH INHERIT FALSE;`]);
  const env = {
    DATABASE_URL: `postgres://agv_backend_gateway:thu-cong-chi-dung-local@127.0.0.1:${PORT}/agiviet`,
    AGV_TEST_PG_OWNER_URL: owner('postgres'), AGV_TEST_PG_TEMPLATE: 'agiviet_mau', AGV_MOI_TRUONG: 'thu',
    AGV_DAT_LAI_KHI_KHOI_DONG: '1', // bộ kiểm thử chủ động dựng DB từ mẫu lúc khởi động
  };
  const args = ['tsx', 'test/chay-tinh-huong.ts', ...process.argv.slice(2)];
  ma = await new Promise((res) => spawn('npx', args, { cwd: BACKEND, stdio: 'inherit', env: { ...process.env, ...env } }).on('exit', (c) => res(c ?? 1)));
} catch (e) {
  console.error(String(e?.message ?? e)); ma = 1;
} finally { tat(); }
process.exit(ma);
