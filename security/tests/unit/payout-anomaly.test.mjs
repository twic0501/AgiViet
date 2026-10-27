import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateChange, canActivate, checkPayoutInstruction, PAYOUT_POLICY } from '../../lib/payout-account.mjs';
import { r1Cycles, r2SharedAccounts, r3DepositChurn, r4RefundDestination, r5AbnormalPricePairs, r6PayoutAfterChange, r7Structuring } from '../../lib/anomaly.mjs';

const NOW = 1_793_000_000;
const owner = { id: 'u-nam', isOwner: true, isHelper: false };

test('Đổi tài khoản: người giúp bị chặn; thiếu yếu tố hoặc tên lệch bị chặn', () => {
  assert.equal(evaluateChange({ requester: { ...owner, isHelper: true }, factors: ['otp_old_phone', 'backup_contact'], nameMatch: true }, NOW).reason, 'nguoi_giup_khong_duoc_doi');
  assert.equal(evaluateChange({ requester: owner, factors: ['otp_old_phone'], nameMatch: true }, NOW).reason, 'thieu_yeu_to_xac_minh');
  assert.equal(evaluateChange({ requester: owner, factors: ['otp_new_phone', 'video'], nameMatch: true }, NOW).reason, 'thieu_yeu_to_xac_minh');
  assert.equal(evaluateChange({ requester: owner, factors: ['otp_old_phone', 'video'], nameMatch: false }, NOW).reason, 'ten_chu_tai_khoan_khong_khop');
});

test('Đổi tài khoản: chờ 24 giờ; 72 giờ nếu vừa khôi phục (SIM swap)', () => {
  const ok = evaluateChange({ requester: owner, factors: ['otp_old_phone', 'backup_contact'], nameMatch: true }, NOW);
  assert.equal(ok.cooldownUntil, NOW + PAYOUT_POLICY.cooldownSec);
  const rec = evaluateChange({ requester: { ...owner, lastRecoveryAt: NOW - 3600 }, factors: ['otp_old_phone', 'in_person'], nameMatch: true }, NOW);
  assert.equal(rec.cooldownUntil, NOW + PAYOUT_POLICY.cooldownAfterRecoverySec);
  assert.equal(rec.needsOpsReview, true);
});

test('Kích hoạt trước hạn chờ hoặc khi chủ báo "không phải tôi" bị chặn', () => {
  const acc = { status: 'cooling_down', cooldown_until: NOW + 100, name_match: true };
  assert.equal(canActivate(acc, NOW).reason, 'chua_het_thoi_gian_cho');
  assert.equal(canActivate(acc, NOW + 100).ok, true);
  assert.equal(canActivate({ ...acc, disputed: true }, NOW + 100).reason, 'chu_da_bao_khong_phai_toi');
});

test('Lệnh chi giữ tài khoản đã chụp; tài khoản bị thay thì giữ lệnh chờ chủ, không tự đổi đích', () => {
  const accounts = new Map([
    ['old', { status: 'replaced', activated_at: NOW - 90 * 86400 }],
    ['new', { status: 'active', activated_at: NOW - 3600 }],
    ['stable', { status: 'active', activated_at: NOW - 90 * 86400 }],
  ]);
  assert.equal(checkPayoutInstruction({ snapshot_account_id: 'old', amount_vnd: 5e7 }, accounts, NOW).action, 'hold_for_owner');
  assert.equal(checkPayoutInstruction({ snapshot_account_id: 'new', amount_vnd: 5e7 }, accounts, NOW).action, 'hold_for_callback');
  assert.equal(checkPayoutInstruction({ snapshot_account_id: 'new', amount_vnd: 1e6 }, accounts, NOW).action, 'send');
  assert.equal(checkPayoutInstruction({ snapshot_account_id: 'stable', amount_vnd: 5e8 }, accounts, NOW).action, 'send');
});

test('R1 giao dịch vòng hai và ba bên được phát hiện; giao dịch một chiều thì không', () => {
  const t = (buyer, seller, amount_vnd) => ({ buyer, seller, amount_vnd, at: NOW - 86400 });
  assert.equal(r1Cycles([t('A', 'B', 100e6), t('B', 'A', 95e6)], { now: NOW }).length, 1);
  assert.equal(r1Cycles([t('A', 'B', 100e6), t('B', 'C', 98e6), t('C', 'A', 99e6)], { now: NOW }).length, 1);
  assert.equal(r1Cycles([t('A', 'B', 100e6), t('A', 'C', 98e6)], { now: NOW }).length, 0);
  assert.equal(r1Cycles([t('A', 'B', 100e6), t('B', 'A', 20e6)], { now: NOW }).length, 0, 'vựa hai vai mua bán giá trị khác xa không bị cờ vòng');
});

test('R2–R7 cơ bản', () => {
  assert.equal(r2SharedAccounts([{ org: 'X', account_hash: 'h1' }, { org: 'Y', account_hash: 'h1' }, { org: 'Z', account_hash: 'h2' }]).length, 1);
  assert.equal(r3DepositChurn([1, 2, 3].map((i) => ({ buyer: 'B', kind: 'deposit_refunded_on_cancel', at: NOW - i * 86400 })), { now: NOW }).length, 1);
  assert.equal(r4RefundDestination([{ id: 'rf1', source_account_hash: 'a', destination_account_hash: 'b' }])[0].severity, 'P0');
  assert.equal(r5AbnormalPricePairs([{ buyer: 'B', seller: 'S', price_ratio_bps: 5000, at: NOW }, { buyer: 'B', seller: 'S', price_ratio_bps: 5500, at: NOW }], { now: NOW }).length, 1);
  assert.equal(r6PayoutAfterChange([{ id: 'p1', org: 'S', at: NOW }], [{ org: 'S', activated_at: NOW - 3600 }]).length, 1);
  assert.equal(r7Structuring([1, 2, 3].map(() => ({ buyer: 'B', seller: 'S', amount_vnd: 48e6, at: NOW })), { now: NOW, limitVnd: 50e6 }).length, 1);
});
