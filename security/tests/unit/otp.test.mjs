import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueOtp, verifyOtp, OTP_MAX_ATTEMPTS } from '../../lib/otp.mjs';
import { SlidingWindowLimiter, OTP_SEND_RULES } from '../../lib/rate-limit.mjs';

const pepper = 'pepper-thu-nghiem';
const NOW = 1_793_000_000;
const seller = { userId: 'u-nam', canSign: true, isOwner: true, isHelperForThisOrg: false };
const binding = { order_code: 'DH-2610-0007', contract_version_id: 'cv-2', document_sha256: 'ab'.repeat(32), amount_vnd: 150000000 };

test('OTP ký hợp đồng: đúng mã, đúng nội dung thì qua, dùng một lần', () => {
  const { challenge, code } = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW });
  const v = { code, userId: 'u-nam', purpose: 'contract_sign', currentBinding: binding, pepper, now: NOW + 30 };
  assert.equal(verifyOtp(challenge, v).ok, true);
  assert.equal(verifyOtp(challenge, v).reason, 'da_dung');
});

test('Hợp đồng đổi số tiền sau khi gửi mã: mã vô hiệu và thử thách bị hủy', () => {
  const { challenge, code } = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW });
  const changed = { ...binding, amount_vnd: 15000000 };
  assert.equal(verifyOtp(challenge, { code, userId: 'u-nam', purpose: 'contract_sign', currentBinding: changed, pepper, now: NOW }).reason, 'noi_dung_da_doi');
  assert.equal(verifyOtp(challenge, { code, userId: 'u-nam', purpose: 'contract_sign', currentBinding: binding, pepper, now: NOW }).reason, 'da_dung');
});

test('Mã của mục đích này không dùng cho mục đích khác (ký hợp đồng ≠ đổi tài khoản)', () => {
  const { challenge, code } = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW });
  assert.equal(verifyOtp(challenge, { code, userId: 'u-nam', purpose: 'payout_change', currentBinding: { bank_account_id: 'b', account_masked: '****1' }, pepper, now: NOW }).reason, 'sai_nguoi_hoac_muc_dich');
});

test('Sai quá 5 lần thì khóa, kể cả nhập đúng sau đó', () => {
  const { challenge, code } = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW });
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
    assert.equal(verifyOtp(challenge, { code: wrong, userId: 'u-nam', purpose: 'contract_sign', currentBinding: binding, pepper, now: NOW }).reason, 'sai_ma');
  }
  assert.equal(verifyOtp(challenge, { code, userId: 'u-nam', purpose: 'contract_sign', currentBinding: binding, pepper, now: NOW }).reason, 'qua_so_lan');
});

test('Hết hạn 5 phút', () => {
  const { challenge, code } = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW });
  assert.equal(verifyOtp(challenge, { code, userId: 'u-nam', purpose: 'contract_sign', currentBinding: binding, pepper, now: NOW + 301 }).reason, 'het_han');
});

test('Người giúp không nhận được OTP ký, xác nhận tiền, đổi tài khoản', () => {
  const helper = { userId: 'u-chau', canSign: false, isOwner: false, isHelperForThisOrg: true };
  assert.throws(() => issueOtp({ purpose: 'contract_sign', actor: helper, binding, pepper, now: NOW }), /nguoi_giup/);
  assert.throws(() => issueOtp({ purpose: 'money_received', actor: helper, binding: { order_code: 'x', payment_id: 'p', amount_vnd: 1 }, pepper, now: NOW }), /nguoi_giup/);
  assert.throws(() => issueOtp({ purpose: 'payout_change', actor: helper, binding: { bank_account_id: 'b', account_masked: '****1' }, pepper, now: NOW }), /nguoi_giup/);
});

test('Nhân viên không có quyền ký thì không được phát OTP ký', () => {
  const kho = { userId: 'u-kho', canSign: false, isOwner: false, isHelperForThisOrg: false };
  assert.throws(() => issueOtp({ purpose: 'contract_sign', actor: kho, binding, pepper, now: NOW }), /khong_co_quyen_ky/);
});

test('Tin nhắn OTP nói rõ việc, số tiền và cảnh báo lừa đảo; mã không lưu rõ trong DB', () => {
  const { challenge, code, message } = issueOtp({ purpose: 'payout_change', actor: seller, binding: { bank_account_id: 'b', account_masked: '****6789' }, pepper, now: NOW });
  assert.match(message, /DOI TAI KHOAN NHAN TIEN \*\*\*\*6789/);
  assert.match(message, /KHONG doc ma nay cho bat ky ai, ke ca nhan vien AgiViet/);
  assert.ok(!JSON.stringify(challenge).includes(code));
  const m2 = issueOtp({ purpose: 'contract_sign', actor: seller, binding, pepper, now: NOW }).message;
  assert.match(m2, /so tien 150\.000\.000d/);
});

test('Giới hạn gửi OTP theo số điện thoại: 1 lần/60 giây, 3 lần/15 phút', () => {
  const lim = new SlidingWindowLimiter(OTP_SEND_RULES.perPhone);
  assert.equal(lim.hit('0909', NOW).ok, true);
  assert.equal(lim.hit('0909', NOW + 10).ok, false);
  assert.equal(lim.hit('0909', NOW + 61).ok, true);
  assert.equal(lim.hit('0909', NOW + 122).ok, true);
  const r = lim.hit('0909', NOW + 183);
  assert.equal(r.ok, false);
  assert.ok(r.retryAfterSec > 0);
  assert.equal(lim.hit('0912', NOW + 183).ok, true, 'số khác không bị ảnh hưởng');
});
