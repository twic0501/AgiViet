#!/usr/bin/env node
// Kiểm khói chức năng cho backend GIẢ LẬP: gọi mỗi đường dẫn một lần, in kết quả rút gọn.
//   BASE=http://127.0.0.1:8080 node infra/load/khoi.mjs
import { createHmac, randomUUID } from 'node:crypto';
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
import assert from 'node:assert/strict';
const SECRET = process.env.WEBHOOK_SECRET || 'dev-only-webhook-secret';
const j = async (method, path, body, headers = {}) => {
  const t = performance.now();
  const raw = body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const r = await fetch(BASE + path, { method, body: raw, headers: { ...(Buffer.isBuffer(body) ? {} : { 'content-type': 'application/json' }), ...headers } });
  const txt = await r.text();
  const expected = headers['x-signature'] === 'sai' ? 401 : path === '/v1/qr/scan' && body?.token?.endsWith('xx') ? 400 : null;
  assert(expected ? r.status === expected : r.status >= 200 && r.status < 300, `HTTP ${r.status} ${path}`);
  console.log(`${String(r.status).padEnd(4)} ${(performance.now() - t).toFixed(1).padStart(7)} ms  ${method} ${path}  ${txt.slice(0, 140)}`);
  return JSON.parse(txt || '{}');
};
let fail = 0;
const ids = await j('GET', '/v1/_bench/ids?n=5');
await j('GET', '/health');
await j('GET', '/ready');
await j('GET', `/v1/demands/${ids.demand_ids[0]}/matches`);
await j('GET', '/v1/ref-price?commodity_id=1&grade=1');
await j('GET', '/v1/ref-price?commodity_id=1&grade=1&province=2');
const p1 = await j('GET', '/v1/lots?commodity_id=6&province=12');
if (p1.next) await j('GET', `/v1/lots?commodity_id=6&province=12&cursor=${p1.next}`);
const key = randomUUID();
const lot = { seller_org_id: ids.seller_ids[0], commodity_id: 1, grade: 1, qty_g: 2_000_000, floor_price_vnd_per_kg: 24000, photo_count: 3 };
const a = await j('POST', '/v1/lots', lot, { 'idempotency-key': key });
const b = await j('POST', '/v1/lots', lot, { 'idempotency-key': key });
if (a.code !== b.code || !b.lap_lai) { console.log('LỖI: khóa chống lặp không trả kết quả cũ'); fail++; }
const ev = { event_id: randomUUID(), order_code: ids.deposit_order_codes[0], status: 'confirmed', amount_vnd: 15000000 };
const raw = JSON.stringify(ev);
const sig = createHmac('sha256', SECRET).update(raw).digest('hex');
const w1 = await j('POST', '/v1/webhooks/bank', ev, { 'x-signature': sig });
const w2 = await j('POST', '/v1/webhooks/bank', ev, { 'x-signature': sig });
if (w1.result !== 'ok' || !w2.trung_lap) { console.log('LỖI: webhook chống lặp'); fail++; }
await j('POST', '/v1/webhooks/bank', ev, { 'x-signature': 'sai' });
await j('GET', `/v1/orders/${ids.deposit_order_codes[0]}/ledger`);
const s1 = await j('POST', '/v1/qr/scan', { token: ids.qr_tokens[0], device: 'kho-1' });
const s2 = await j('POST', '/v1/qr/scan', { token: ids.qr_tokens[0], device: 'kho-1' });
assert.equal(s1.result, 'ok');
assert.equal(s2.result, 'already_scanned');
assert.equal(s1.delivery_id, s2.delivery_id);
const scans = await Promise.all(Array.from({ length: 10 }, () => j('POST', '/v1/qr/scan', { token: ids.qr_tokens[1] })));
assert.equal(scans.filter(s => s.result === 'ok').length, 1);
assert.equal(scans.filter(s => s.result === 'already_scanned').length, 9);
await j('POST', '/v1/qr/scan', { token: ids.qr_tokens[0].slice(0, -2) + 'xx' });
await j('POST', `/v1/orders/${ids.order_codes[0]}/contract-pdf?mode=sync`);
const job = await j('POST', `/v1/orders/${ids.order_codes[1]}/contract-pdf?mode=queue`);
await new Promise((r) => setTimeout(r, 1500));
const js = await j('GET', `/v1/jobs/${job.job_id}`);
if (js.status !== 'done') { console.log('LỖI: worker chưa xử lý việc PDF'); fail++; }
await j('POST', '/v1/voice', { seconds: 6 });
await j('POST', '/v1/uploads/photo', Buffer.alloc(250 * 1024, 7), { 'content-type': 'image/jpeg' });
console.log(fail ? `KHÓI: ${fail} lỗi` : 'KHÓI: đạt');
process.exit(fail ? 1 : 0);
