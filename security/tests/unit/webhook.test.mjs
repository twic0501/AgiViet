import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook, verifyWebhook, matchBankCredit, H } from '../../lib/webhook.mjs';
import { MemoryNonceStore } from '../../lib/nonce-store.mjs';

const SECRET = 'bi-mat-thu-32-byte-khong-dung-that!!';
const keys = { 'bank-2026-10': [SECRET] };
const body = JSON.stringify({ event_id: 'evt_1', type: 'credit', amount_vnd: 15000000, reference: 'AGV DH26100007' });
const NOW = 1_793_000_000;

const fresh = () => new MemoryNonceStore();

test('webhook hợp lệ được chấp nhận', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const r = verifyWebhook({ headers, rawBody: body, keys, nonceStore: fresh(), now: NOW + 10 });
  assert.deepEqual(r, { ok: true, kid: 'bank-2026-10' });
});

test('phát lại cùng nonce bị chặn', () => {
  const store = fresh();
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  assert.equal(verifyWebhook({ headers, rawBody: body, keys, nonceStore: store, now: NOW }).ok, true);
  assert.equal(verifyWebhook({ headers, rawBody: body, keys, nonceStore: store, now: NOW + 5 }).reason, 'phat_lai_nonce');
});

test('sửa một byte thân (số tiền) làm hỏng chữ ký', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const tampered = body.replace('15000000', '95000000');
  assert.equal(verifyWebhook({ headers, rawBody: tampered, keys, nonceStore: fresh(), now: NOW }).reason, 'sai_chu_ky');
});

test('JSON parse rồi stringify lại (đổi khoảng trắng) cũng hỏng chữ ký: phải dùng raw body', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const reser = JSON.stringify(JSON.parse(body), null, 1);
  assert.equal(verifyWebhook({ headers, rawBody: reser, keys, nonceStore: fresh(), now: NOW }).reason, 'sai_chu_ky');
});

test('timestamp cũ hơn 5 phút hoặc ở tương lai bị chặn', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  assert.equal(verifyWebhook({ headers, rawBody: body, keys, nonceStore: fresh(), now: NOW + 301 }).reason, 'qua_han_thoi_gian');
  assert.equal(verifyWebhook({ headers, rawBody: body, keys, nonceStore: fresh(), now: NOW - 301 }).reason, 'qua_han_thoi_gian');
});

test('đổi timestamp trong header để "làm mới" bản ghi cũ bị chặn (timestamp nằm trong chuỗi ký)', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const replay = { ...headers, [H.ts]: String(NOW + 3600) };
  assert.equal(verifyWebhook({ headers: replay, rawBody: body, keys, nonceStore: fresh(), now: NOW + 3600 }).reason, 'sai_chu_ky');
});

test('đổi nonce để né chống phát lại bị chặn (nonce nằm trong chuỗi ký)', () => {
  const headers = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const replay = { ...headers, [H.nonce]: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
  assert.equal(verifyWebhook({ headers: replay, rawBody: body, keys, nonceStore: fresh(), now: NOW }).reason, 'sai_chu_ky');
});

test('chữ ký giả không đốt nonce của yêu cầu thật', () => {
  const store = fresh();
  const real = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const fake = { ...real, [H.sig]: 'v1=' + '0'.repeat(64) };
  assert.equal(verifyWebhook({ headers: fake, rawBody: body, keys, nonceStore: store, now: NOW }).reason, 'sai_chu_ky');
  assert.equal(verifyWebhook({ headers: real, rawBody: body, keys, nonceStore: store, now: NOW }).ok, true);
});

test('khóa không biết, ký bằng bí mật khác, header thiếu đều bị chặn', () => {
  const h1 = signWebhook({ secret: SECRET, kid: 'other', rawBody: body, timestamp: NOW });
  assert.equal(verifyWebhook({ headers: h1, rawBody: body, keys, nonceStore: fresh(), now: NOW }).reason, 'khoa_khong_biet');
  const h2 = signWebhook({ secret: 'bi-mat-cua-ke-gian', kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  assert.equal(verifyWebhook({ headers: h2, rawBody: body, keys, nonceStore: fresh(), now: NOW }).reason, 'sai_chu_ky');
  assert.equal(verifyWebhook({ headers: {}, rawBody: body, keys, nonceStore: fresh(), now: NOW }).reason, 'thieu_header');
});

test('xoay khóa: hai bí mật cùng kid trong giai đoạn chuyển đều được nhận', () => {
  const k2 = { 'bank-2026-10': [SECRET, 'bi-mat-moi-sau-xoay-khoa-32-byte!!'] };
  const h = signWebhook({ secret: 'bi-mat-moi-sau-xoay-khoa-32-byte!!', kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  assert.equal(verifyWebhook({ headers: h, rawBody: body, keys: k2, nonceStore: fresh(), now: NOW }).ok, true);
});

test('header chữ hoa vẫn đọc được; chữ ký sai định dạng bị chặn', () => {
  const h = signWebhook({ secret: SECRET, kid: 'bank-2026-10', rawBody: body, timestamp: NOW });
  const upper = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toUpperCase(), v]));
  assert.equal(verifyWebhook({ headers: upper, rawBody: body, keys, nonceStore: fresh(), now: NOW }).ok, true);
  assert.equal(verifyWebhook({ headers: { ...h, [H.sig]: 'sha1=abc' }, rawBody: body, keys, nonceStore: fresh(), now: NOW }).reason, 'sai_dinh_dang_chu_ky');
});

const instr = { id: 'i1', reference: 'AGV DH26100007', amount_vnd: 15000000, credit_account: 'ESCROW-VA-0007', status: 'awaiting_funds' };
const credit = { bank_txn_id: 'b1', reference: 'AGV DH26100007', amount_vnd: 15000000, credit_account: 'ESCROW-VA-0007', currency: 'VND', payer_account_hash: 'h', requeried: true };

test('khớp lệnh cọc: đúng hết thì xác nhận', () => {
  assert.equal(matchBankCredit(instr, credit).outcome, 'confirm');
});

test('khớp lệnh cọc: chưa tra lại ngân hàng thì không ghi', () => {
  assert.equal(matchBankCredit(instr, { ...credit, requeried: false }).outcome, 'reject');
});

test('khớp lệnh cọc: thiếu, thừa, sai tham chiếu, sai tài khoản đều vào tiền treo, không "gần đúng"', () => {
  assert.deepEqual(matchBankCredit(instr, { ...credit, amount_vnd: 14999000 }).reasons, ['thieu_tien']);
  assert.deepEqual(matchBankCredit(instr, { ...credit, amount_vnd: 15001000 }).reasons, ['thua_tien']);
  assert.equal(matchBankCredit(instr, { ...credit, reference: 'AGV DH26100008' }).outcome, 'suspense');
  assert.equal(matchBankCredit(instr, { ...credit, credit_account: 'KHAC' }).outcome, 'suspense');
  assert.equal(matchBankCredit({ ...instr, status: 'confirmed' }, credit).outcome, 'suspense');
  assert.equal(matchBankCredit(null, credit).outcome, 'suspense');
});
