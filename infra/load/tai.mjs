#!/usr/bin/env node
// =====================================================================
// Bộ tạo tải AgiViet v2 (mô hình MỞ: bắn theo tốc độ đến cố định, không chờ phản hồi,
// nên không bị "coordinated omission" như công cụ vòng kín). Viết bằng Node vì máy đo không chạy
// được Docker (k6 qua image grafana/k6 không dùng được).
//
//   node infra/load/tai.mjs --kich-ban load [--base http://127.0.0.1:8080] [--nhan ten] [--pdf sync|queue]
//                            [--ref live|mv] [--chi luong1,luong2] [--he-so 1.0] [--thoi-gian 0.5]
// Kịch bản ở infra/load/kich-ban.mjs. Kết quả: in bảng + ghi infra/load/ket-qua/<nhan>.json
// =====================================================================
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, FLOWS } from './kich-ban.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'stub', 'package.json'));
const pg = require('pg');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('--base', process.env.BASE || 'http://127.0.0.1:8080');
const SC = arg('--kich-ban', 'smoke');
const LABEL = arg('--nhan', SC);
const PDF_MODE = arg('--pdf', 'sync');
const REF = arg('--ref', 'live');
const ONLY = arg('--chi', null)?.split(',');
const FACTOR = Number(arg('--he-so', 1));
const DB = process.env.DATABASE_URL || 'postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench';
const SECRET = process.env.WEBHOOK_SECRET || 'dev-only-webhook-secret';
const MAX_INFLIGHT = Number(arg('--toi-da-dong-thoi', 4000));
const originalScenario = SCENARIOS[SC];
const durationFactor = Number(arg('--thoi-gian', 1));
if (!Number.isFinite(durationFactor) || durationFactor <= 0 || !Number.isFinite(FACTOR) || FACTOR <= 0 || !Number.isInteger(MAX_INFLIGHT) || MAX_INFLIGHT < 1 || !/^[a-zA-Z0-9_-]+$/.test(LABEL)) throw new Error('Tham số tải/nhãn không hợp lệ');
const scenario = originalScenario && { ...originalScenario, phases: originalScenario.phases.map(p => ({...p, giay: Math.max(1, Math.round(p.giay * durationFactor))})) };
if (!scenario) { console.error('Không có kịch bản', SC, Object.keys(SCENARIOS)); process.exit(2); }

// ---------- dữ liệu thật trong DB để bắn ----------
const idsResponse = await fetch(`${BASE}/v1/_bench/ids?n=3000`, {signal: AbortSignal.timeout(10000)});
if (!idsResponse.ok) throw new Error(`Không đọc được dữ liệu bench: HTTP ${idsResponse.status}`);
const ids = await idsResponse.json();
for (const field of ['seller_ids','demand_ids','deposit_order_codes','order_codes','qr_tokens']) if (!ids[field]?.length) throw new Error(`Thiếu dữ liệu ${field}; đặt lại database bộ đo`);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let depositIdx = 0;
const photo = Buffer.alloc(250 * 1024, 0x5a); // ảnh đã nén phía app ~250 KB
const sentEvents = [];

const makeReq = {
  mua_duyet_lo: () => ({ m: 'GET', p: `/v1/lots?commodity_id=${1 + Math.floor(Math.random() * 8)}${Math.random() < 0.6 ? `&province=${1 + Math.floor(Math.random() * 13)}` : ''}` }),
  mua_ghep: () => ({ m: 'GET', p: `/v1/demands/${pick(ids.demand_ids)}/matches` }),
  mua_gia_tk: () => ({ m: 'GET', p: `/v1/ref-price?commodity_id=${1 + Math.floor(Math.random() * 8)}&grade=${1 + Math.floor(Math.random() * 2)}${Math.random() < 0.5 ? `&province=${1 + Math.floor(Math.random() * 13)}` : ''}&source=${REF}` }),
  ban_dang_lo: () => {
    const key = Math.random() < 0.1 && ban_keys.length ? pick(ban_keys) : randomUUID();   // 10% gửi lại (mạng yếu)
    if (lotRequests.has(key)) return lotRequests.get(key);
    ban_keys.push(key); if (ban_keys.length > 500) lotRequests.delete(ban_keys.shift());
    const request = { m: 'POST', p: '/v1/lots', h: { 'idempotency-key': key }, b: JSON.stringify({
      seller_org_id: pick(ids.seller_ids), commodity_id: 1 + Math.floor(Math.random() * 8), grade: 1 + Math.floor(Math.random() * 2),
      qty_g: (500 + Math.floor(Math.random() * 10000)) * 1000, floor_price_vnd_per_kg: 20000, photo_count: 3 }) };
    lotRequests.set(key, request); return request;
  },
  webhook: () => {
    let ev;
    if (Math.random() < 0.1 && sentEvents.length) ev = pick(sentEvents);   // 10% ngân hàng gửi lại
    else {
      const code = ids.deposit_order_codes[depositIdx++ % ids.deposit_order_codes.length];
      ev = JSON.stringify({ event_id: randomUUID(), order_code: code, status: 'confirmed', amount_vnd: 15000000 });
      sentEvents.push(ev); if (sentEvents.length > 1000) sentEvents.shift();
    }
    return { m: 'POST', p: '/v1/webhooks/bank', b: ev, h: { 'x-signature': createHmac('sha256', SECRET).update(ev).digest('hex') } };
  },
  qr_quet: () => ({ m: 'POST', p: '/v1/qr/scan', b: JSON.stringify({ token: pick(ids.qr_tokens), device: 'kho-' + Math.floor(Math.random() * 30) }) }),
  pdf: () => ({ m: 'POST', p: `/v1/orders/${pick(ids.order_codes)}/contract-pdf?mode=${PDF_MODE}` }),
  giong_noi: () => ({ m: 'POST', p: '/v1/voice', b: JSON.stringify({ seconds: 8 }) }),
  anh: () => ({ m: 'POST', p: '/v1/uploads/photo', b: photo, ct: 'image/jpeg' }),
};
const ban_keys = [];
const lotRequests = new Map();

// ---------- lấy mẫu tài nguyên (/proc) ----------
const TICK = 100, PAGE = 4096;
const groups = () => {
  const g = { postgres: [], backend: [], ai: [], worker: [] };
  for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      const comm = readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
      if (comm === 'postgres' || cmd.includes('native/bin/postgres')) g.postgres.push(pid);
      else if (cmd.includes('server.mjs')) g.backend.push(pid);
      else if (/(?:^|\0|\/)ai\.mjs(?:\0|$)/.test(cmd)) g.ai.push(pid);
      else if (cmd.includes('worker.mjs')) g.worker.push(pid);
    } catch {}
  }
  return g;
};
const readProc = (pid) => {
  try {
    const s = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = s.slice(s.lastIndexOf(')') + 2).split(' ');
    // Dùng PSS (chia đều trang nhớ dùng chung) để không đếm shared_buffers của Postgres nhiều lần.
    let rss = Number(f[21]) * PAGE;
    try { const m = /Pss:\s+(\d+) kB/.exec(readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8')); if (m) rss = Number(m[1]) * 1024; } catch {}
    return { cpu: Number(f[11]) + Number(f[12]), rss };
  } catch { return null; }
};
const samples = [];
let prev = null;
let generatorLagMax = 0;
const sample = () => {
  const g = groups(); const now = Date.now(); const cur = {};
  for (const [k, pids] of Object.entries(g)) {
    let cpu = 0, rss = 0;
    for (const p of pids) { const r = readProc(p); if (r) { cpu += r.cpu; rss += r.rss; } }
    cur[k] = { cpu, rss, pids };
  }
  if (prev) {
    const dt = (now - prev.at) / 1000; const row = { t: now };
    for (const k of Object.keys(cur)) {
      // tiến trình mới/ra đi làm lệch; chấp nhận sai số nhỏ của mẫu 1 giây
      row[k + '_cpu_pct'] = Math.max(0, ((cur[k].cpu - prev.v[k].cpu) / TICK / dt) * 100);
      row[k + '_rss_mb'] = cur[k].rss / 1048576;
    }
    samples.push(row);
  }
  prev = { at: now, v: cur };
};

// ---------- thống kê ----------
const pct = (arr, p) => { if (!arr.length) return null; const a = arr; const i = Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1); return a[Math.max(0, i)]; };
const stats = new Map();   // key phase|flow
const rec = (phase, flow, ms, status) => {
  const k = `${phase}|${flow}`;
  let s = stats.get(k);
  if (!s) { s = { lat: [], codes: {}, errs: 0 }; stats.set(k, s); }
  s.lat.push(ms);
  s.codes[status] = (s.codes[status] || 0) + 1;
  if (typeof status !== 'number' || status < 200 || status >= 300) s.errs++;
};

// ---------- chạy ----------
const pgc = new pg.Client({ connectionString: DB });
await pgc.connect();
await pgc.query('SELECT pg_stat_statements_reset()').catch(() => {});
const dbBefore = (await pgc.query(`SELECT xact_commit, xact_rollback, blks_hit, blks_read FROM pg_stat_database WHERE datname = current_database()`)).rows[0];

const businessResults = {};
let inflight = 0, dropped = 0, maxInflight = 0;
const fire = async (phase, flow) => {
  if (inflight >= MAX_INFLIGHT) { dropped++; return; }
  inflight++; maxInflight = Math.max(maxInflight, inflight);
  const r = makeReq[flow]();
  const t = performance.now();
  try {
    const res = await fetch(BASE + r.p, { method: r.m, body: r.b, signal: AbortSignal.timeout(30000),
      headers: { 'content-type': r.ct || 'application/json', 'x-client-id': flow + '-' + Math.floor(Math.random() * 500), ...(r.h || {}) } });
    const payload = await res.text();
    try { const result = JSON.parse(payload); if (result.result) businessResults[result.result] = (businessResults[result.result] || 0) + 1; if (result.trung_lap) businessResults.trung_lap = (businessResults.trung_lap || 0) + 1; } catch {}
    rec(phase, flow, performance.now() - t, res.status);
  } catch (e) {
    rec(phase, flow, performance.now() - t, 'ERR');
  } finally { inflight--; }
};

console.log(`Kịch bản "${SC}" (${scenario.mo_ta}) → ${BASE}; pdf=${PDF_MODE}, ref=${REF}, hệ số ${FACTOR}`);
const sampler = setInterval(sample, 1000); sample();
const t0 = Date.now();
for (const ph of scenario.phases) {
  const rates = Object.fromEntries(Object.entries(ph.rps).filter(([f]) => !ONLY || ONLY.includes(f)).map(([f, r]) => [f, r * FACTOR]));
  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  console.log(`  pha "${ph.ten}": ${ph.giay}s, tổng ${total.toFixed(1)} yêu cầu/giây`);
  const end = Date.now() + ph.giay * 1000;
  // mỗi luồng có bộ hẹn giờ riêng, bước 10 ms, bắn số yêu cầu tích lũy theo tốc độ (đến đều, không phải Poisson)
  await new Promise((resolve) => {
    const acc = Object.fromEntries(Object.keys(rates).map((f) => [f, 0]));
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now(); const dt = (now - last) / 1000; last = now; generatorLagMax = Math.max(generatorLagMax, dt * 1000 - 10);
      for (const [f, r] of Object.entries(rates)) {
        acc[f] += r * dt;
        while (acc[f] >= 1) { acc[f] -= 1; fire(ph.ten, f); }
      }
      if (Date.now() >= end) { clearInterval(iv); resolve(); }
    }, 10);
  });
}
// chờ yêu cầu còn treo (tối đa 35 s)
const waitStart = Date.now();
while (inflight > 0 && Date.now() - waitStart < 35000) await new Promise((r) => setTimeout(r, 200));
clearInterval(sampler); sample();
const elapsed = (Date.now() - t0) / 1000;

const dbAfter = (await pgc.query(`SELECT xact_commit, xact_rollback, blks_hit, blks_read FROM pg_stat_database WHERE datname = current_database()`)).rows[0];
const top = (await pgc.query(`SELECT calls, round(total_exec_time::numeric, 0) AS total_ms, round(mean_exec_time::numeric, 2) AS mean_ms,
   round(max_exec_time::numeric, 1) AS max_ms, left(regexp_replace(query, '\\s+', ' ', 'g'), 110) AS q
   FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
   ORDER BY total_exec_time DESC LIMIT 10`).catch(() => ({ rows: [] }))).rows;
// kiểm toàn vẹn sau tải
const integ = (await pgc.query(`SELECT
   (SELECT coalesce(sum(amount_vnd),0) FROM bench.ledger_entries) AS tong_but_toan,
   (SELECT count(*) FROM (SELECT transaction_id FROM bench.ledger_entries GROUP BY 1 HAVING sum(amount_vnd) <> 0) x) AS gd_lech,
   (SELECT count(*) FROM bench.ledger_balances b JOIN (SELECT account_id, sum(amount_vnd) AS s FROM bench.ledger_entries GROUP BY 1) e
      USING (account_id) WHERE b.balance_vnd <> e.s) AS so_du_lech,
   (SELECT count(*) FROM (SELECT order_id FROM bench.ledger_txns WHERE kind = 'deposit_in' GROUP BY 1 HAVING count(*) > 1) x) AS don_coc_hai_lan,
   (SELECT count(*) FROM bench.jobs WHERE status = 'queued') AS viec_pdf_dang_cho,
   (SELECT count(*) FROM bench.jobs WHERE status = 'failed') AS viec_pdf_hong`)).rows[0];
const pdfEnd = (await pgc.query(`SELECT
 (SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) AS n FROM bench.jobs GROUP BY status) s) AS counts,
 percentile_cont(ARRAY[0.5,0.95,0.99]) WITHIN GROUP (ORDER BY extract(epoch FROM done_at-created_at)*1000) FILTER (WHERE status='done') AS end_to_end_ms
 FROM bench.jobs`)).rows[0];
await pgc.end();

const flowsOut = []; const phaseOut = {};
for (const [k, s] of stats) {
  const [phase, flow] = k.split('|');
  s.lat.sort((a, b) => a - b);
  const ph = scenario.phases.find((p) => p.ten === phase);
  const row = { pha: phase, luong: flow, so_yc: s.lat.length, yc_giay: +(s.lat.length / ph.giay).toFixed(1),
    p50: +pct(s.lat, 50).toFixed(1), p95: +pct(s.lat, 95).toFixed(1), p99: +pct(s.lat, 99).toFixed(1), max: +s.lat.at(-1).toFixed(1),
    loi_pct: +((s.errs / s.lat.length) * 100).toFixed(2), ma: s.codes };
  flowsOut.push(row);
  (phaseOut[phase] ||= { lat: [], errs: 0, n: 0, giay: ph.giay });
  phaseOut[phase].lat.push(...s.lat); phaseOut[phase].errs += s.errs; phaseOut[phase].n += s.lat.length;
}
const phasesSummary = Object.entries(phaseOut).map(([ten, v]) => {
  v.lat.sort((a, b) => a - b);
  return { pha: ten, so_yc: v.n, yc_giay: +(v.n / v.giay).toFixed(1), p50: +pct(v.lat, 50).toFixed(1), p95: +pct(v.lat, 95).toFixed(1),
    p99: +pct(v.lat, 99).toFixed(1), loi_pct: +((v.errs / v.n) * 100).toFixed(2) };
});
const resAgg = {};
for (const k of ['postgres', 'backend', 'ai', 'worker']) {
  const c = samples.map((s) => s[k + '_cpu_pct']).filter((x) => x !== undefined).sort((a, b) => a - b);
  const m = samples.map((s) => s[k + '_rss_mb']).filter((x) => x !== undefined);
  resAgg[k] = { cpu_tb_pct: +(c.reduce((a, b) => a + b, 0) / (c.length || 1)).toFixed(0), cpu_p95_pct: +(pct(c, 95) ?? 0).toFixed(0), rss_max_mb: +Math.max(0, ...m).toFixed(0) };
}
const out = {
  nhan: LABEL, kich_ban: SC, mo_ta: scenario.mo_ta, luc: new Date().toISOString(), base: BASE, pdf: PDF_MODE, ref: REF, he_so: FACTOR,
  thoi_gian_giay: elapsed, he_so_thoi_gian: durationFactor, ket_qua_nghiep_vu: businessResults, generator_lag_max_ms: +generatorLagMax.toFixed(1), throughput_hoan_tat: +([...stats.values()].reduce((n,s)=>n+s.lat.length,0)/elapsed).toFixed(1), bo_lo_do_qua_dong_thoi: dropped, dong_thoi_toi_da: maxInflight,
  pha: phasesSummary, luong: flowsOut, tai_nguyen: resAgg, tai_nguyen_mau: samples,
  db: { giao_dich_commit: dbAfter.xact_commit - dbBefore.xact_commit, rollback: dbAfter.xact_rollback - dbBefore.xact_rollback,
        ti_le_cache: +((dbAfter.blks_hit - dbBefore.blks_hit) / Math.max(1, (dbAfter.blks_hit - dbBefore.blks_hit) + (dbAfter.blks_read - dbBefore.blks_read)) * 100).toFixed(2) },
  toan_ven: integ, pdf_cuoi_luot: pdfEnd, top_sql: top,
};
mkdirSync(join(here, 'ket-qua'), { recursive: true });
writeFileSync(join(here, 'ket-qua', `${LABEL}.json`), JSON.stringify(out, null, 2));

// ---------- in ----------
const pad = (s, n) => String(s).padEnd(n);
console.log('\nPha'.padEnd(14) + pad('yc/giây', 9) + pad('p50', 9) + pad('p95', 9) + pad('p99', 9) + 'lỗi%');
for (const p of phasesSummary) console.log(pad(p.pha, 13) + pad(p.yc_giay, 9) + pad(p.p50, 9) + pad(p.p95, 9) + pad(p.p99, 9) + p.loi_pct);
console.log('\n' + pad('Pha', 12) + pad('Luồng', 14) + pad('số yc', 8) + pad('yc/s', 7) + pad('p50 ms', 9) + pad('p95 ms', 9) + pad('p99 ms', 9) + pad('max', 9) + pad('lỗi%', 7) + 'mã');
for (const r of flowsOut) console.log(pad(r.pha, 12) + pad(r.luong, 14) + pad(r.so_yc, 8) + pad(r.yc_giay, 7) + pad(r.p50, 9) + pad(r.p95, 9) + pad(r.p99, 9) + pad(r.max, 9) + pad(r.loi_pct, 7) + JSON.stringify(r.ma));
console.log('\nTài nguyên (100% = 1 lõi):', JSON.stringify(resAgg));
console.log('DB:', JSON.stringify(out.db), ' bỏ lỡ:', dropped, ' đồng thời tối đa:', maxInflight);
console.log('Toàn vẹn:', JSON.stringify(integ));
console.log('Top SQL theo tổng thời gian:');
for (const t of top.slice(0, 6)) console.log(`  ${pad(t.calls, 7)} lần  tb ${pad(t.mean_ms, 8)} ms  max ${pad(t.max_ms, 8)}  ${t.q}`);
console.log(`\nĐã ghi infra/load/ket-qua/${LABEL}.json`);
