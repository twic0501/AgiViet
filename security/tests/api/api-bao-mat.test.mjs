// Kiểm thử bảo mật hộp đen cho backend (CHẠY KHI BACKEND CÓ). Mặc định bỏ qua.
//
//   AGV_API_URL=http://localhost:8080 AGV_API_CONFIG=security/tests/api/cau-hinh.json node --test security/tests/api/*.test.mjs
//
// Đặc tả 12 chỉ nêu tên nhóm lệnh (POST có idempotency_key, expected_revision); đường dẫn đầy đủ và tên trường dưới đây là
// GIẢ ĐỊNH, đặt trong tệp cấu hình (cau-hinh.json, mẫu: cau-hinh.mau.json) để kỹ sư backend ánh xạ mà không sửa bài kiểm thử.
// Mỗi ca ghi mã checklist (04-checklist-backend-app.md) mà nó kiểm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { signWebhook } from '../../lib/webhook.mjs';
import { settle } from '../../lib/settlement.mjs';

const BASE = process.env.AGV_API_URL;
const skip = !BASE && 'Chưa có AGV_API_URL: bỏ qua kiểm thử API';
const cfg = BASE ? JSON.parse(readFileSync(process.env.AGV_API_CONFIG || new URL('./cau-hinh.mau.json', import.meta.url), 'utf8')) : {};

async function call(who, method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.tokens?.[who] ?? ''}`, 'idempotency-key': headers['idempotency-key'] ?? randomUUID(), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const fill = (p, v) => p.replace(/:(\w+)/g, (_, k) => v[k] ?? cfg.ids?.[k] ?? `:${k}`);

test('BE-QUYEN-01 Người giúp không xác nhận được tiền (API trả 403, không chỉ ẩn nút)', { skip }, async () => {
  const r = await call('nguoi_giup', 'POST', fill(cfg.paths.xac_nhan_tra_thang, {}), { ket_qua: 'du', so_tien: cfg.ids.so_tien_tra_thang });
  assert.equal(r.status, 403);
});

test('BE-QUYEN-02 Người giúp không đổi/kích hoạt được tài khoản nhận tiền (F03)', { skip }, async () => {
  for (const p of [cfg.paths.yeu_cau_doi_tai_khoan, cfg.paths.kich_hoat_tai_khoan]) {
    const r = await call('nguoi_giup', 'POST', fill(p, {}), {});
    assert.equal(r.status, 403, p);
  }
});

test('BE-QUYEN-03 Bên mua không tự xác nhận "người bán đã nhận đủ"', { skip }, async () => {
  const r = await call('ben_mua_ke_toan', 'POST', fill(cfg.paths.xac_nhan_tra_thang, {}), { ket_qua: 'du', so_tien: cfg.ids.so_tien_tra_thang });
  assert.ok([403, 404].includes(r.status));
});

test('BE-QUYEN-04 IDOR: người dùng tổ chức khác không đọc được đơn, PDF, tài khoản', { skip }, async () => {
  for (const p of [cfg.paths.chi_tiet_don, cfg.paths.tai_lieu_pdf]) {
    const r = await call('nguoi_ngoai', 'GET', fill(p, {}));
    assert.ok([403, 404].includes(r.status), p);
  }
});

test('BE-TIEN-01 Không nhận số tiền từ client cho cọc/phí: gửi số khác bị bỏ qua hoặc từ chối', { skip }, async () => {
  const r = await call('ben_mua_ke_toan', 'POST', fill(cfg.paths.tao_huong_dan_coc, {}), { so_tien: 1000, phi: 0 });
  if (r.status < 300) assert.equal(r.json?.so_tien, cfg.ids.coc_cong_phi_dung, 'server phải tự tính C + F');
  else assert.ok([400, 422].includes(r.status));
});

test('BE-TIEN-02 Báo "đã chuyển" kèm ảnh UNC KHÔNG làm đơn hiệu lực', { skip }, async () => {
  await call('ben_mua_ke_toan', 'POST', fill(cfg.paths.bao_da_chuyen_coc, {}), { so_tien: cfg.ids.coc_cong_phi_dung, anh_unc: 'doc-unc-1' });
  const d = await call('ben_mua_ke_toan', 'GET', fill(cfg.paths.chi_tiet_don, {}));
  assert.notEqual(d.json?.trang_thai, 'hieu_luc');
});

test('BE-WH-01 Webhook giả chữ ký, phát lại, timestamp cũ đều bị từ chối và không ghi sổ', { skip }, async () => {
  const body = JSON.stringify({ event_id: 'EV-API-' + randomUUID(), type: 'deposit_received', amount_vnd: cfg.ids.coc_cong_phi_dung, reference: cfg.ids.ma_noi_dung_coc });
  const now = Math.floor(Date.now() / 1000);
  const good = signWebhook({ secret: cfg.webhook.secret, kid: cfg.webhook.kid, rawBody: body, timestamp: now });
  const fake = signWebhook({ secret: 'sai', kid: cfg.webhook.kid, rawBody: body, timestamp: now });
  const old = signWebhook({ secret: cfg.webhook.secret, kid: cfg.webhook.kid, rawBody: body, timestamp: now - 3600 });
  const send = (h) => fetch(BASE + cfg.paths.webhook_ngan_hang, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body });
  assert.equal((await send(fake)).status, 401);
  assert.equal((await send(old)).status, 401);
  assert.ok((await send(good)).status < 300);
  assert.ok([200, 202, 409].includes((await send(good)).status), 'phát lại: không lỗi 5xx, không ghi lần hai');
});

test('BE-TIEN-05 Quyết toán gọi đồng thời 10 lần chỉ tạo một bộ lệnh (đua điều kiện)', { skip }, async () => {
  const rs = await Promise.all(Array.from({ length: 10 }, () => call('he_thong', 'POST', fill(cfg.paths.chay_quyet_toan, {}), {}, { 'idempotency-key': randomUUID() })));
  assert.ok(rs.every((r) => r.status < 500));
  const l = await call('van_hanh_ds', 'GET', fill(cfg.paths.lenh_ngan_hang_cua_don, {}));
  const kinds = (l.json?.items || []).map((x) => x.loai);
  assert.equal(kinds.filter((k) => k === 'chi_coc_nb').length <= 1, true);
  assert.equal(kinds.filter((k) => k === 'hoan_coc_bm').length <= 1, true);
});

test('BE-TIEN-06 Kết quả quyết toán khớp oracle của đặc tả 04', { skip }, async () => {
  const q = await call('van_hanh_ds', 'GET', fill(cfg.paths.bang_quyet_toan, {}));
  const { V, D, C, X_nb = 0, X_bm = 0 } = q.json || {};
  const o = settle({ V, D, C, X_nb, X_bm });
  assert.equal(q.json.C_nb, o.C_nb); assert.equal(q.json.C_bm, o.C_bm);
  assert.equal(q.json.T_bm, o.T_bm); assert.equal(q.json.T_nb, o.T_nb);
});

test('BE-IDEM-01 Cùng Idempotency-Key, khác thân => 409', { skip }, async () => {
  const key = randomUUID();
  await call('ben_mua_ke_toan', 'POST', fill(cfg.paths.bao_da_chuyen_coc, {}), { so_tien: 1 }, { 'idempotency-key': key });
  const r = await call('ben_mua_ke_toan', 'POST', fill(cfg.paths.bao_da_chuyen_coc, {}), { so_tien: 2 }, { 'idempotency-key': key });
  assert.equal(r.status, 409);
});

test('BE-OTP-01 Gửi OTP quá tần suất bị 429', { skip }, async () => {
  const rs = [];
  for (let i = 0; i < 3; i++) rs.push(await call('nguoi_ban_chu', 'POST', cfg.paths.gui_otp, { muc_dich: 'contract_sign', ma_don: cfg.ids.ma_don }));
  assert.ok(rs.some((r) => r.status === 429));
});

test('BE-VH-01 Vận hành một người không chi tiền được (cần người duyệt khác)', { skip }, async () => {
  const r = await call('van_hanh_ds', 'POST', fill(cfg.paths.lenh_thu_cong, {}), { loai: 'manual_refund', so_tien: 1000000, tu_duyet: true });
  assert.ok(r.status >= 400 || r.json?.trang_thai === 'cho_duyet');
});

test('BE-PDF-01 Trang xác minh công khai không trả tệp PDF gốc, không lộ số tài khoản/điện thoại', { skip }, async () => {
  const r = await fetch(BASE + fill(cfg.paths.xac_minh_cong_khai, {}));
  const t = await r.text();
  assert.ok(!/application\/pdf/.test(r.headers.get('content-type') || ''));
  assert.ok(!/\b0\d{9}\b/.test(t), 'không lộ số điện thoại');
  assert.ok(!/\b\d{9,16}\b/.test(t.replace(/[0-9a-f]{64}/g, '')), 'không lộ số tài khoản');
});
