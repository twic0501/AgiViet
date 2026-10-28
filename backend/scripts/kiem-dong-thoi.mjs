// npm run test:dong-thoi — kiểm gọi lại và thao tác đồng thời trên PostgreSQL 17 thật (không PGlite).
// Dựng PG nhúng trong thư mục tạm, migrate + seed + chạy toàn bộ db/tests/*.sql (ghi dữ liệu thử),
// rồi đua bằng các kết nối riêng đăng nhập bằng login thử (mỗi bên một phiên), có rào đồng bộ và lặp nhiều lần.
// Tiêu chí (chốt 28/10/2026):
//  A gọi lại cùng lệnh: có thể cùng trả thành công, nhưng chỉ một tác động nghiệp vụ.
//  B hai cam kết tranh mức cho nợ: nghĩa vụ cuối không vượt mức.
//  C hai người duyệt cùng một đề xuất: chỉ một quyết định hiệu lực.
// Kết quả từng bên + trạng thái DB cuối ghi vào backend/.dong-thoi-ket-qua.json.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOC = join(BACKEND, '..');
const BIN = process.env.AGV_PG_BIN ?? join(GOC, 'infra/.local/tools/node_modules/@embedded-postgres/linux-x64/native/bin');
const PSQL = process.env.AGV_PSQL ?? join(GOC, 'infra/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin/psql');
const PORT = process.env.AGV_TEST_PG_PORT ?? '55442';
const LAP = Number(process.env.AGV_LAP ?? 20);
process.env.LD_LIBRARY_PATH = [join(BIN, '..', 'lib'), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
for (const f of [join(BIN, 'initdb'), join(BIN, 'pg_ctl'), PSQL]) if (!existsSync(f)) { console.error(`Thiếu ${f}`); process.exit(2); }

const thuMuc = mkdtempSync(join(tmpdir(), 'agv-dt-'));
const data = join(thuMuc, 'data');
const url = (login) => `postgres://${login}@127.0.0.1:${PORT}/agiviet`;
const chay = (cmd, args, opt = {}) => {
  const r = spawnSync(cmd, args, { stdio: opt.input ? ['pipe', 'pipe', 'pipe'] : 'inherit', input: opt.input, env: { ...process.env, ...(opt.env ?? {}) }, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → ${r.status}\n${r.stderr?.toString().slice(-2000) ?? ''}`);
  return r.stdout?.toString() ?? '';
};
let dangChay = false;
const tat = () => { if (dangChay) { spawnSync(join(BIN, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast', '-w'], { stdio: 'ignore' }); dangChay = false; } rmSync(thuMuc, { recursive: true, force: true }); };
process.on('SIGINT', () => { tat(); process.exit(130); });

// Chạy song song nhiều thao tác, mỗi thao tác trên một kết nối riêng; rào: mọi bên BEGIN xong mới cùng gửi lệnh.
async function dua(thaoTac) {
  const ketNoi = await Promise.all(thaoTac.map(async (t) => { const c = new pg.Client({ connectionString: url(t.login) }); await c.connect(); await c.query('BEGIN'); return c; }));
  const kq = await Promise.all(thaoTac.map(async (t, i) => {
    try { const r = await ketNoi[i].query(t.sql, t.args ?? []); await ketNoi[i].query('COMMIT'); return { login: t.login, ok: true, ketQua: Object.values(r.rows[0] ?? {})[0] ?? null }; }
    catch (e) { await ketNoi[i].query('ROLLBACK').catch(() => {}); return { login: t.login, ok: false, loi: e.message, hint: e.hint ?? null }; }
  }));
  await Promise.all(ketNoi.map((c) => c.end()));
  return kq;
}

const baoCao = { lap: LAP, kich_ban: {} };
let hong = 0;
let ma = 1;
try {
  chay(join(BIN, 'initdb'), ['-D', data, '-U', 'agiviet_owner', '--auth=trust', '-E', 'UTF8', '--locale=C', '-c', 'timezone=Asia/Ho_Chi_Minh']);
  chay(join(BIN, 'pg_ctl'), ['-D', data, '-l', join(thuMuc, 'pg.log'), '-w', 'start', '-o', `-p ${PORT} -k ${thuMuc} -c listen_addresses=127.0.0.1 -c max_connections=100`]);
  dangChay = true;
  const psqlEnv = { PATH: `${dirname(PSQL)}:${process.env.PATH}` };
  chay(PSQL, [`postgres://agiviet_owner@127.0.0.1:${PORT}/postgres`, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c', 'CREATE DATABASE agiviet']);
  chay('bash', [join(GOC, 'db/scripts/migrate.sh')], { env: { ...psqlEnv, DATABASE_URL: url('agiviet_owner') } });
  chay('bash', [join(GOC, 'db/scripts/seed.sh')], { env: { ...psqlEnv, DATABASE_URL: url('agiviet_owner') } });

  // Toàn bộ kiểm thử SQL trên PostgreSQL thật: một phiên (các tệp dùng chung biến phiên như PGlite), mỗi tệp một giao dịch.
  const tep = readdirSync(join(GOC, 'db/tests')).filter((f) => f.endsWith('.sql')).sort();
  chay(PSQL, [url('agiviet_owner'), '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', '-'],
    { input: tep.map((f) => `\\echo ${f}\nBEGIN;\n${readFileSync(join(GOC, 'db/tests', f), 'utf8')}\nCOMMIT;\n`).join('') });
  const owner = new pg.Client({ connectionString: url('agiviet_owner') }); await owner.connect();
  const tk = (await owner.query(`SELECT count(*) FILTER (WHERE passed)::int dat, count(*)::int tong FROM test.results`)).rows[0];
  const hongSql = (await owner.query(`SELECT name, detail FROM test.results WHERE NOT passed ORDER BY id`)).rows;
  baoCao.kiem_thu_sql = { ...tk, hong: hongSql };
  console.log(`Kiểm thử SQL trên PostgreSQL thật: ${tk.dat}/${tk.tong} đạt.`);
  if (hongSql.length) { hong += hongSql.length; for (const h of hongSql) console.log('  HỎNG', h.name, h.detail ?? ''); }

  // Thêm một nhân viên tài chính làm người đề xuất (Đỗ Minh Trí) để có hai người duyệt khác người đề xuất.
  await owner.query(`CREATE ROLE db_test_tri LOGIN NOSUPERUSER NOBYPASSRLS; GRANT agiviet_app TO db_test_tri;
    INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind) VALUES('db_test_tri',test.person('Đỗ Minh Trí'),test.org('AGV'),'ops');
    DELETE FROM cmd.test_clock`);
  const g = (await owner.query(`SELECT test.org('TC-M01') buyer, test.org('TC-B01') seller, (SELECT id FROM core.products WHERE code='XOAI_CAT_CHU') product,
    test.id('R59A') don, (SELECT id FROM core.documents WHERE order_id=test.id('R59A') AND doc_type IN ('evidence','inspection_report') ORDER BY created_at LIMIT 1) chung_cu`)).rows[0];
  const asLogin = async (login, sql) => (await owner.query('SELECT test.as_login($1::name,$2) r', [login, sql])).rows[0].r;

  // ---------- B: hai cam kết tranh mức cho nợ ----------
  const B = [];
  for (let i = 0; i < LAP; i++) {
    const ag = await asLogin('db_test_buyer', `SELECT cmd.create_sourcing_agreement('DT-B-${i}','${g.product}','{}',NULL,false,NULL,NULL,NULL)`);
    const day = await asLogin('db_test_buyer', `SELECT cmd.confirm_sourcing_day('${ag}',current_date+5,2000000)`);
    const a = [];
    for (let k = 0; k < 2; k++) {
      const id = await asLogin('db_test_approve', `SELECT cmd.propose_allocation('${day}','${g.seller}',1000000,20000)`);
      await asLogin('db_test_buyer', `SELECT cmd.approve_allocation('${id}')`); a.push(id);
    }
    const truoc = BigInt((await owner.query('SELECT core.pair_exposure($1,$2) e', [g.buyer, g.seller])).rows[0].e);
    const muc = truoc + 20000000n; // đủ cho đúng một cam kết 20 triệu
    await asLogin('db_test_seller', `SELECT cmd.set_credit_terms('${g.buyer}',3,${muc})`);
    const kq = await dua(a.map((id) => ({ login: 'db_test_seller', sql: 'SELECT cmd.commit_allocation($1)', args: [id] })));
    const sau = BigInt((await owner.query('SELECT core.pair_exposure($1,$2) e', [g.buyer, g.seller])).rows[0].e);
    const soCamKet = (await owner.query(`SELECT count(*)::int n FROM core.sourcing_allocations WHERE id=ANY($1) AND status='committed'`, [a])).rows[0].n;
    const dat = sau <= muc && soCamKet === 1;
    B.push({ lan: i, ket_qua: kq, muc_cho_no: String(muc), cong_no_sau: String(sau), so_cam_ket: soCamKet, dat });
    // Dọn: hủy cam kết của lần này để lần sau không chồng nợ (đi đúng luồng đổi lượng có đồng ý).
    for (const id of a) {
      const st = (await owner.query('SELECT status FROM core.sourcing_allocations WHERE id=$1', [id])).rows[0].status;
      if (st === 'committed') {
        const c = await asLogin('db_test_buyer', `SELECT cmd.request_allocation_change('${id}',0)`);
        await asLogin('db_test_seller', `SELECT cmd.answer_allocation_change('${c}',true,0,NULL)`);
      }
    }
  }
  baoCao.kich_ban.B_tranh_muc_cho_no = B;

  // ---------- C: hai người khác nhau duyệt cùng một đề xuất; A: một người gửi lại lệnh duyệt hai lần cùng lúc ----------
  const C = [], A = [];
  for (let i = 0; i < LAP; i++) {
    for (const [ten, nguoiDuyet, mang] of [['C', ['db_test_verify', 'db_test_approve'], C], ['A', ['db_test_verify', 'db_test_verify'], A]]) {
      const p = await asLogin('db_test_tri', `SELECT cmd.propose_decision('manual_payment','order','${g.don}','Đua ${ten}${i}','${g.chung_cu}','{"lan":${i}}')`);
      const kq = await dua(nguoiDuyet.map((login) => ({ login, sql: 'SELECT cmd.approve_decision($1)', args: [p] })));
      const soQd = (await owner.query(`SELECT count(*)::int n FROM ops.decisions WHERE detail->>'command_proposal_id'=$1`, [p])).rows[0].n;
      const ids = new Set(kq.filter((k) => k.ok).map((k) => k.ketQua));
      const dat = soQd === 1 && kq.some((k) => k.ok) && ids.size === 1;
      mang.push({ lan: i, ket_qua: kq, so_quyet_dinh: soQd, dat });
    }
  }
  baoCao.kich_ban.C_hai_nguoi_duyet = C;
  baoCao.kich_ban.A_goi_lai_lenh_duyet = A;
  await owner.end();

  for (const [ten, ds] of Object.entries(baoCao.kich_ban)) {
    const n = ds.filter((x) => x.dat).length;
    if (n !== ds.length) hong++;
    console.log(`  ${n === ds.length ? 'ĐẠT ' : 'HỎNG'} ${ten}: ${n}/${ds.length} lần đúng`);
    for (const x of ds.filter((x) => !x.dat).slice(0, 2)) console.log('       ví dụ lệch:', JSON.stringify(x).slice(0, 400));
  }
  ma = hong ? 1 : 0;
} catch (e) { console.error(String(e?.stack ?? e)); ma = 1; }
finally { tat(); }
writeFileSync(join(BACKEND, '.dong-thoi-ket-qua.json'), JSON.stringify(baoCao, null, 2));
process.exit(ma);
