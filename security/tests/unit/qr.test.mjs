import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQrKeyPair, issueQr, verifyQr, fallbackCode, checkFallbackCode } from '../../lib/qr.mjs';
import { MemoryNonceStore } from '../../lib/nonce-store.mjs';
import { b64url, fromB64url } from '../../lib/util.mjs';

const { privateKey, publicKey } = generateQrKeyPair();
const attacker = generateQrKeyPair();
const pub = { 'qr-2026-10': publicKey };
const NOW = 1_793_000_000;

const recv = () => issueQr({ type: 'recv', sub: 'DOT-2001-1', aud: 'user-kho-dong-xanh', ttlSec: 6 * 3600, kid: 'qr-2026-10', privateKey, now: NOW });

test('QR nhận hàng hợp lệ, đúng người nhận', () => {
  const { token } = recv();
  const r = verifyQr(token, { expectedType: 'recv', expectedAud: 'user-kho-dong-xanh', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW + 60 });
  assert.equal(r.ok, true);
  assert.equal(r.payload.sub, 'DOT-2001-1');
});

test('QR nhận hàng chỉ dùng một lần (chụp lại mã dùng lần sau bị chặn)', () => {
  const { token } = recv();
  const store = new MemoryNonceStore();
  const o = { expectedType: 'recv', expectedAud: 'user-kho-dong-xanh', publicKeys: pub, jtiStore: store, now: NOW };
  assert.equal(verifyQr(token, o).ok, true);
  assert.equal(verifyQr(token, o).reason, 'da_dung');
});

test('QR hết hạn bị chặn', () => {
  const { token } = recv();
  assert.equal(verifyQr(token, { expectedType: 'recv', expectedAud: 'user-kho-dong-xanh', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW + 7 * 3600 }).reason, 'het_han');
});

test('Giả tài xế/người nhận: QR của người khác bị chặn', () => {
  const { token } = recv();
  assert.equal(verifyQr(token, { expectedType: 'recv', expectedAud: 'tai-xe-la', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW }).reason, 'sai_doi_tuong');
});

test('Dùng nhầm loại: QR lô (công khai) không dùng làm QR nhận hàng', () => {
  const { token } = issueQr({ type: 'lot', sub: 'LO-1', kid: 'qr-2026-10', privateKey, now: NOW });
  assert.equal(verifyQr(token, { expectedType: 'recv', expectedAud: 'x', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW }).reason, 'sai_loai');
});

test('Kẻ gian tự ký bằng khóa riêng, hoặc sửa payload, đều bị chặn', () => {
  const forged = issueQr({ type: 'recv', sub: 'DOT-2001-1', aud: 'tai-xe-la', ttlSec: 3600, kid: 'qr-2026-10', privateKey: attacker.privateKey, now: NOW });
  assert.equal(verifyQr(forged.token, { expectedType: 'recv', expectedAud: 'tai-xe-la', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW }).reason, 'sai_chu_ky');

  const { token } = recv();
  const [p, b, s] = token.split('.');
  const payload = JSON.parse(fromB64url(b).toString());
  payload.aud = 'tai-xe-la';
  const keys = Object.keys(payload).sort();
  const canon = '{' + keys.map((k) => JSON.stringify(k) + ':' + JSON.stringify(payload[k])).join(',') + '}';
  const tampered = [p, b64url(Buffer.from(canon)), s].join('.');
  assert.equal(verifyQr(tampered, { expectedType: 'recv', expectedAud: 'tai-xe-la', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW }).reason, 'sai_chu_ky');
});

test('Thân không chuẩn tắc (thêm khoảng trắng) bị chặn trước khi kiểm chữ ký', () => {
  const { token } = recv();
  const [p, b, s] = token.split('.');
  const spaced = b64url(Buffer.from(' ' + fromB64url(b).toString()));
  assert.equal(verifyQr([p, spaced, s].join('.'), { expectedType: 'recv', expectedAud: 'user-kho-dong-xanh', publicKeys: pub, jtiStore: new MemoryNonceStore(), now: NOW }).reason, 'khong_chuan_tac');
});

test('Phát QR sai luật: recv thiếu aud, hạn quá dài', () => {
  assert.throws(() => issueQr({ type: 'recv', sub: 'D', ttlSec: 60, kid: 'k', privateKey, now: NOW }));
  assert.throws(() => issueQr({ type: 'recv', sub: 'D', aud: 'u', ttlSec: 30 * 24 * 3600, kid: 'k', privateKey, now: NOW }));
});

test('QR tài liệu mang mã băm; xác minh offline bằng khóa công khai', () => {
  const { token } = issueQr({ type: 'doc', sub: 'HD-2001-v2', extra: { sha256: 'ab'.repeat(32) }, kid: 'qr-2026-10', privateKey, now: NOW });
  const r = verifyQr(token, { expectedType: 'doc', publicKeys: pub, now: NOW + 365 * 86400 });
  assert.equal(r.ok, true);
  assert.equal(r.payload.x.sha256, 'ab'.repeat(32));
  assert.ok(token.length < 400, 'QR đủ ngắn để in');
});

test('Mã 6 số dự phòng: đúng ngữ cảnh mới khớp', () => {
  const secret = 'bi-mat-ma-du-phong';
  const ctx = { deliveryId: 'DOT-2001-1', receiverUserId: 'u1', windowStart: NOW };
  const c = fallbackCode(secret, ctx);
  assert.match(c, /^\d{6}$/);
  assert.equal(checkFallbackCode(secret, ctx, c), true);
  assert.equal(checkFallbackCode(secret, { ...ctx, receiverUserId: 'u2' }, c), false);
  assert.equal(checkFallbackCode(secret, ctx, '12345'), false);
});
