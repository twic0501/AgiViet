#!/usr/bin/env node
// =====================================================================
// BACKEND GIẢ LẬP (stub) của AgiViet v2 — CHỈ ĐỂ ĐO TẢI HẠ TẦNG.
// Không có xác thực thật, không có máy trạng thái đầy đủ, không có RLS, không phải API chính thức.
// Mô phỏng các lượt nặng: ghép cung–cầu, giá tham khảo, đăng lô (chống lặp + sổ lượng),
// webhook ngân hàng (chống lặp + sổ cái kép), quét QR tại kho, sinh PDF hợp đồng (đồng bộ hoặc
// qua hàng đợi), giọng nói (gọi dịch vụ AI giả lập), tải ảnh.
//
// Biến môi trường:
//   PORT=8080  DATABASE_URL=postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench
//   WORKERS=1           số tiến trình (node:cluster); production đặt = số vCPU dành cho backend
//   PG_POOL_MAX=10      kết nối tối đa mỗi tiến trình
//   PDF_MODE=sync|queue mặc định cho /contract-pdf (ghi đè bằng ?mode=)
//   REF_PRICE_SOURCE=live|mv  mặc định cho /ref-price (ghi đè bằng ?source=)
//   AI_URL=http://127.0.0.1:8090  AI_TIMEOUT_MS=8000
//   QR_SECRET=...  WEBHOOK_SECRET=...  (giá trị phát triển, production lấy từ secret manager)
//   RATE_LIMIT_RPS=0    giới hạn mỗi khách (header x-client-id, không có thì theo IP); 0 = tắt
//   UPLOAD_DIR=/tmp/agv-uploads  DOC_DIR=/tmp/agv-docs
// =====================================================================
import cluster from 'node:cluster';
import http from 'node:http';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import * as metrics from './lib/metrics.mjs';
import * as Q from './lib/sql.mjs';
import { renderContract } from './lib/pdf.mjs';

const env = (k, d) => process.env[k] ?? d;
const PORT = Number(env('PORT', 8080));
const WORKERS = Number(env('WORKERS', 1));
const DATABASE_URL = env('DATABASE_URL', 'postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench');
const QR_SECRET = env('QR_SECRET', 'dev-only-qr-secret');
const WEBHOOK_SECRET = env('WEBHOOK_SECRET', 'dev-only-webhook-secret');
const AI_URL = env('AI_URL', 'http://127.0.0.1:8090');
const AI_TIMEOUT_MS = Number(env('AI_TIMEOUT_MS', 8000));
const RATE = Number(env('RATE_LIMIT_RPS', 0));
const UPLOAD_DIR = env('UPLOAD_DIR', '/tmp/agv-uploads');
const DOC_DIR = env('DOC_DIR', '/tmp/agv-docs');

if (cluster.isPrimary && WORKERS > 1) {
  console.log(`[stub] tiến trình chính ${process.pid}, mở ${WORKERS} tiến trình con`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();
  cluster.on('exit', (w, code) => { console.error(`[stub] tiến trình ${w.process.pid} thoát (${code}), mở lại`); cluster.fork(); });
} else {
  start();
}

function start() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  mkdirSync(DOC_DIR, { recursive: true });
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: Number(env('PG_POOL_MAX', 10)),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    options: '-c statement_timeout=5000 -c timezone=Asia/Ho_Chi_Minh',
  });
  pool.on('error', (e) => console.error('[stub] lỗi pool', e.message));

  const tx = async (fn) => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  };

  // ---- giới hạn tần suất (token bucket trong bộ nhớ; production dùng ở proxy hoặc Redis) ----
  const buckets = new Map();
  const allow = (key) => {
    if (!RATE) return true;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b) { b = { tokens: RATE * 2, at: now }; buckets.set(key, b); }
    b.tokens = Math.min(RATE * 2, b.tokens + ((now - b.at) / 1000) * RATE);
    b.at = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  };

  // ---- QR động: token = base64url(deliveryId.expUnix).sig ----
  const sign = (s) => createHmac('sha256', QR_SECRET).update(s).digest('base64url').slice(0, 22);
  const makeToken = (deliveryId, ttlSec = 6 * 3600) => {
    const body = Buffer.from(`${deliveryId}.${Math.floor(Date.now() / 1000) + ttlSec}`).toString('base64url');
    return `${body}.${sign(body)}`;
  };
  const readToken = (tok) => {
    const [body, sig] = String(tok || '').split('.');
    if (!body || !sig || String(tok).split('.').length !== 2) return null;
    const exp = Buffer.from(sign(body)); const got = Buffer.from(sig);
    if (exp.length !== got.length || !timingSafeEqual(exp, got)) return null;
    const [id, expAt] = Buffer.from(body, 'base64url').toString().split('.');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(Number(expAt))) return null;
    if (Number(expAt) < Date.now() / 1000) return { expired: true };
    return { id };
  };

  // ---- PDF: sinh, lưu, ghi bản ghi tài liệu (dùng chung cho đồng bộ và worker) ----
  const ORDER_FOR_PDF = `
    SELECT o.id, o.code, o.grade, o.qty_g, o.unit_price_vnd_per_kg, o.deposit_vnd, o.fee_vnd,
           c.name_vi AS commodity_name, s.name AS seller_name, b.name AS buyer_name
    FROM bench.orders o JOIN bench.commodities c ON c.id = o.commodity_id
    JOIN bench.orgs s ON s.id = o.seller_org_id JOIN bench.orgs b ON b.id = o.buyer_org_id
    WHERE o.code = $1`;
  const makePdf = async (code) => {
    const { rows } = await pool.query(ORDER_FOR_PDF, [code]);
    if (!rows.length) return null;
    const o = rows[0];
    const { buf, sha256 } = await renderContract(o);
    const key = `contracts/${o.code}-${Date.now()}-${process.pid}.pdf`;
    writeFileSync(join(DOC_DIR, key.replace('/', '_')), buf);
    const r = await pool.query(
      `INSERT INTO bench.documents (order_id, kind, version, sha256, storage_key, bytes)
       VALUES ($1, 'contract', coalesce((SELECT max(version) FROM bench.documents WHERE order_id = $1 AND kind = 'contract'), 0) + 1, $2, $3, $4)
       RETURNING id, version`, [o.id, sha256, key, buf.length]);
    return { document_id: r.rows[0].id, version: r.rows[0].version, bytes: buf.length, sha256: sha256.toString('hex') };
  };

  const callAi = async (path, body) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), AI_TIMEOUT_MS);
    try {
      const r = await fetch(AI_URL + path, { method: 'POST', body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' }, signal: ac.signal });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    } finally { clearTimeout(t); }
  };

  // ---- định tuyến ----
  const routes = [];
  const on = (method, pattern, name, fn) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    routes.push({ method, re, keys, name, fn });
  };

  on('GET', '/health', 'health', async () => [200, { ok: true, service: 'stub-backend', gia_lap: true, pid: process.pid }]);
  on('GET', '/ready', 'ready', async () => { await pool.query('SELECT id FROM bench.orders LIMIT 1'); return [200, { ok: true }]; });
  on('GET', '/metrics', 'metrics', async () => {
    const {rows} = await pool.query(`SELECT count(*) FILTER (WHERE status='failed')::int AS failed, coalesce(extract(epoch FROM now()-min(created_at) FILTER (WHERE status IN ('queued','running'))),0)::float AS oldest FROM bench.jobs`);
    return [200, metrics.render({
    pdf_failed_jobs: rows[0].failed, pdf_oldest_pending_seconds: rows[0].oldest,
    pg_pool_total: pool.totalCount, pg_pool_idle: pool.idleCount, pg_pool_waiting: pool.waitingCount,
  }), 'text/plain; version=0.0.4']; });

  on('GET', '/v1/demands/:id/matches', 'matches', async ({ p }) => {
    const { rows } = await pool.query(Q.MATCH, [p.id]);
    return [200, { demand_id: p.id, matches: rows }];
  });

  on('GET', '/v1/ref-price', 'ref_price', async ({ q }) => {
    const src = q.get('source') || env('REF_PRICE_SOURCE', 'live');
    const args = [Number(q.get('commodity_id')), Number(q.get('grade') || 1), q.get('province') ? Number(q.get('province')) : null];
    const { rows } = await pool.query(src === 'mv' ? Q.REF_PRICE_MV : Q.REF_PRICE_LIVE, args);
    const r = rows[0];
    const ok = r && r.n_orders >= 3 && r.n_pairs >= 2;
    return [200, ok ? { ...r, nguon: `trung vị ${r.n_orders} đơn đã nghiệm thu 30 ngày` } : { chua_du_du_lieu: true }];
  });

  on('GET', '/v1/lots', 'lots_list', async ({ q }) => {
    const cid = Number(q.get('commodity_id') || 1);
    const prov = q.get('province') ? Number(q.get('province')) : null;
    if (q.has('page')) {
      const { rows } = await pool.query(Q.LOTS_OFFSET, [cid, prov, Number(q.get('page')) * 20]);
      return [200, { items: rows }];
    }
    let at = null, id = null;
    if (q.get('cursor')) [at, id] = Buffer.from(q.get('cursor'), 'base64url').toString().split('|');
    const { rows } = await pool.query(Q.LOTS_KEYSET, [cid, prov, at, id]);
    const last = rows.at(-1);
    return [200, { items: rows, next: last ? Buffer.from(`${last.created_at.toISOString()}|${last.id}`).toString('base64url') : null }];
  });

  on('POST', '/v1/lots', 'lot_create', async ({ body, headers }) => {
    const key = headers['idempotency-key'];
    if (!key) return [400, { loi: 'thiếu Idempotency-Key' }];
    return tx(async (c) => {
      const ins = await c.query(`INSERT INTO bench.idempotency_keys (key, actor) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key`, [key, body.seller_org_id]);
      if (!ins.rowCount) {
        const prev = await c.query(`SELECT response FROM bench.idempotency_keys WHERE key = $1`, [key]);
        return [200, { ...(prev.rows[0]?.response || {}), lap_lai: true }];
      }
      const lot = await c.query(
        `INSERT INTO bench.lots (code, seller_org_id, commodity_id, grade, qty_total_g, floor_price_vnd_per_kg,
                                 province_code, lat, lng, harvest_on, status, photo_count)
         SELECT 'LN-' || substr(md5($1), 1, 12), o.id, $2, $3, $4, $5, o.province_code, o.lat, o.lng, current_date + $6::int, 'open', $7
         FROM bench.orgs o WHERE o.id = $8 RETURNING id, code`,
        [key, body.commodity_id, body.grade, body.qty_g, body.floor_price_vnd_per_kg, body.harvest_in_days ?? 3, body.photo_count ?? 0, body.seller_org_id]);
      if (!lot.rowCount) throw Object.assign(new Error('không có người bán'), { http: 404 });
      const l = lot.rows[0];
      await c.query(`INSERT INTO bench.qty_movements (lot_id, from_bucket, to_bucket, qty_g, idem_key) VALUES ($1, NULL, 'available', $2, $3)`, [l.id, body.qty_g, 'declare:' + key]);
      await c.query(`INSERT INTO bench.outbox (topic, aggregate_id, payload) VALUES ('lot.created', $1, $2)`, [l.id, { code: l.code }]);
      const resp = { lot_id: l.id, code: l.code };
      await c.query(`UPDATE bench.idempotency_keys SET response = $2 WHERE key = $1`, [key, resp]);
      return [201, resp];
    });
  });

  on('POST', '/v1/webhooks/bank', 'bank_webhook', async ({ raw, body, headers }) => {
    const expect = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    if (headers['x-signature'] !== expect) return [401, { loi: 'sai chữ ký webhook' }];
    return tx(async (c) => {
      const ins = await c.query(
        `INSERT INTO bench.inbound_webhooks (provider, provider_event_id, payload) VALUES ('bank_sim', $1, $2)
         ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`, [body.event_id, body]);
      if (!ins.rowCount) return [200, { trung_lap: true }];   // ngân hàng gửi lại: trả 200, không làm gì
      const o = await c.query(
        `SELECT id, buyer_org_id, deposit_vnd, fee_vnd, deposit_status FROM bench.orders WHERE code = $1 FOR UPDATE`, [body.order_code]);
      let result = 'ok';
      if (!o.rowCount) result = 'unmatched';
      else if (!['sent', 'bank_processing'].includes(o.rows[0].deposit_status)) result = 'ignored_state';
      else if (body.status !== 'confirmed') result = 'bank_failed';
      if (result === 'ok') {
        const ord = o.rows[0];
        for (const [kind, acct, amount] of [['deposit_in', 'deposit_escrow', ord.deposit_vnd], ['fee_in', 'fee_held', ord.fee_vnd]]) {
          const t = await c.query(
            `INSERT INTO bench.ledger_txns (kind, order_id, idempotency_key, memo) VALUES ($1, $2, $3, 'ngân hàng xác nhận (giả lập)') RETURNING id`,
            [kind, ord.id, `bank:bank_sim:${body.event_id}:${kind}`]);
          await c.query(
            `INSERT INTO bench.ledger_entries (transaction_id, line_no, account_id, amount_vnd) VALUES
               ($1, 1, bench.ledger_account_of('external', $2, NULL), -$4::bigint),
               ($1, 2, bench.ledger_account_of($5, NULL, $3), $4::bigint)`,
            [t.rows[0].id, ord.buyer_org_id, ord.id, amount, acct]);
        }
        await c.query(`UPDATE bench.orders SET deposit_status = 'bank_confirmed', status = 'active', version = version + 1 WHERE id = $1`, [ord.id]);
        await c.query(`INSERT INTO bench.outbox (topic, aggregate_id, payload) VALUES ('order.deposit_confirmed', $1, $2)`, [ord.id, { event_id: body.event_id }]);
      } else if (result === 'unmatched') {
        // tiền về không khớp lệnh: vào tài khoản treo, chờ đối soát thủ công (không giả lập bút toán ở đây)
      }
      await c.query(`UPDATE bench.inbound_webhooks SET processed_at = now(), result = $2 WHERE id = $1`, [ins.rows[0].id, result]);
      return [200, { result }];
    });
  });

  on('POST', '/v1/qr/scan', 'qr_scan', async ({ body }) => {
    let deliveryId = null;
    if (body.token) {
      const t = readToken(body.token);
      if (!t) return [400, { loi: 'mã QR không hợp lệ' }];
      if (t.expired) return [410, { loi: 'mã QR đã hết hạn, nhờ người nhận mở mã mới' }];
      deliveryId = t.id;
    }
    return tx(async (c) => {
      const d = body.otp6
        ? await c.query(`SELECT id, status, window_during @> now() AS in_window FROM bench.deliveries WHERE order_id = (SELECT id FROM bench.orders WHERE code = $1) AND otp6 = $2 FOR UPDATE`, [body.order_code, body.otp6])
        : await c.query(`SELECT id, status, window_during @> now() AS in_window FROM bench.deliveries WHERE id = $1 FOR UPDATE`, [deliveryId]);
      if (!d.rowCount) return [404, { loi: 'không tìm thấy đợt giao' }];
      const row = d.rows[0];
      // Quét lại là lượt đối chiếu lặp, không nghiệm thu hay chuyển rủi ro lần nữa.
      const result = !row.in_window ? 'outside_window' : row.status !== 'scheduled' ? 'already_scanned' : 'ok';
      await c.query(`INSERT INTO bench.qr_scans (delivery_id, scanned_by, result) VALUES ($1, $2, $3)`, [row.id, body.device || 'kho', result]);
      if (result === 'ok') await c.query(`UPDATE bench.deliveries SET status = 'arrived' WHERE id = $1 AND status = 'scheduled'`, [row.id]);
      return [200, { delivery_id: row.id, result }];
    });
  });

  on('POST', '/v1/orders/:code/contract-pdf', 'contract_pdf', async ({ p, q }) => {
    const mode = q.get('mode') || env('PDF_MODE', 'sync');
    if (mode === 'queue') {
      const r = await pool.query(`INSERT INTO bench.jobs (kind, payload) VALUES ('contract_pdf', $1) RETURNING id`, [{ code: p.code }]);
      await pool.query(`NOTIFY bench_jobs`);
      return [202, { job_id: r.rows[0].id, trang_thai: 'đang tạo tài liệu' }];
    }
    const d = await makePdf(p.code);
    return d ? [201, d] : [404, { loi: 'không có đơn' }];
  });

  on('GET', '/v1/jobs/:id', 'job_status', async ({ p }) => {
    const { rows } = await pool.query(`SELECT id, status, result, created_at, done_at FROM bench.jobs WHERE id = $1`, [p.id]);
    return rows.length ? [200, rows[0]] : [404, {}];
  });

  on('GET', '/v1/orders/:code/ledger', 'order_ledger', async ({ p }) => {
    const { rows } = await pool.query(
      `SELECT a.account_type, b.balance_vnd FROM bench.orders o JOIN bench.ledger_accounts a ON a.order_id = o.id
       JOIN bench.ledger_balances b ON b.account_id = a.id WHERE o.code = $1`, [p.code]);
    return [200, { accounts: rows }];
  });

  on('POST', '/v1/voice', 'voice', async ({ body }) => {
    try {
      const r = await callAi('/voice/transcribe', { seconds: body.seconds || 8 });
      return [r.status, r.body];
    } catch (e) {
      return [504, { loi: 'dịch vụ giọng nói quá hạn, hãy nhập tay', chi_tiet: e.name }];
    }
  });

  on('POST', '/v1/uploads/photo', 'photo_upload', async ({ raw, q }) => {
    if (raw.length > 5 * 1024 * 1024) return [413, { loi: 'ảnh quá 5 MB, app phải nén trước khi gửi' }];
    const sha = createHash('sha256').update(raw).digest();
    const key = `photos/${randomUUID()}.jpg`;
    writeFileSync(join(UPLOAD_DIR, key.replace('/', '_')), raw);
    const r = await pool.query(`INSERT INTO bench.photos (lot_id, sha256, bytes, storage_key) VALUES (NULL, $1, $2, $3) RETURNING id`, [sha, raw.length, key]);
    return [201, { photo_id: r.rows[0].id, bytes: raw.length }];
  });

  // ---- chỉ dùng cho bộ tạo tải: lấy mã thật trong DB để bắn ----
  on('GET', '/v1/_bench/ids', 'bench_ids', async ({ q }) => {
    const n = Math.min(Number(q.get('n') || 1000), 20000);
    const [dem, dep, dlv, sel, ord] = await Promise.all([
      pool.query(`SELECT id FROM bench.demands WHERE status = 'open' ORDER BY random() LIMIT $1`, [n]),
      pool.query(`SELECT code FROM bench.orders WHERE deposit_status = 'sent' ORDER BY random() LIMIT $1`, [n * 20]),
      pool.query(`SELECT id FROM bench.deliveries ORDER BY random() LIMIT $1`, [n]),
      pool.query(`SELECT id FROM bench.orgs WHERE kind = 'seller' ORDER BY random() LIMIT $1`, [n]),
      pool.query(`SELECT code FROM bench.orders WHERE status = 'completed' ORDER BY random() LIMIT $1`, [n]),
    ]);
    return [200, {
      demand_ids: dem.rows.map((r) => r.id),
      deposit_order_codes: dep.rows.map((r) => r.code),
      qr_tokens: dlv.rows.map((r) => makeToken(r.id)),
      seller_ids: sel.rows.map((r) => r.id),
      order_codes: ord.rows.map((r) => r.code),
    }];
  });

  const server = http.createServer(async (req, res) => {
    const t0 = process.hrtime.bigint();
    const url = new URL(req.url, 'http://x');
    let route = 'not_found';
    const done = (status, payload, ctype = 'application/json; charset=utf-8') => {
      const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
      res.writeHead(status, { 'content-type': ctype, 'x-gia-lap': 'stub' });
      res.end(s);
      metrics.observe(route, req.method, status, Number(process.hrtime.bigint() - t0) / 1e9);
    };
    try {
      const clientKey = req.headers['x-client-id'] || req.socket.remoteAddress;
      if (!url.pathname.startsWith('/health') && !url.pathname.startsWith('/metrics') && !url.pathname.startsWith('/v1/_bench') && !allow(clientKey)) {
        route = 'rate_limited';
        return done(429, { loi: 'quá nhiều yêu cầu, thử lại sau' });
      }
      const chunks = [];
      let size = 0;
      for await (const ch of req) { size += ch.length; if (size > 6 * 1024 * 1024) return done(413, { loi: 'nội dung quá lớn' }); chunks.push(ch); }
      const raw = Buffer.concat(chunks);
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname);
        if (!m) continue;
        route = r.name;
        const p = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        const isJson = (req.headers['content-type'] || '').includes('json');
        const body = isJson && raw.length ? JSON.parse(raw) : {};
        const [status, payload, ctype] = await r.fn({ p, q: url.searchParams, body, raw, headers: req.headers });
        return done(status, payload, ctype);
      }
      done(404, { loi: 'không có đường dẫn' });
    } catch (e) {
      const status = e.http || (e instanceof SyntaxError ? 400 : e.code === '57014' ? 503 : 500);   // 57014 = statement_timeout
      if (status >= 500) console.error(`[stub] ${route}: ${e.message}`);
      done(status, { loi: status === 503 ? 'quá tải, thử lại' : 'lỗi máy chủ', ma: e.code });
    }
  });
  server.keepAliveTimeout = 65000;
  server.listen(PORT, () => console.log(`[stub] GIẢ LẬP backend pid ${process.pid} nghe cổng ${PORT}`));
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

export { };
