import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequest, approve, execute, payloadHash } from '../../lib/four-eyes.mjs';
import { evidenceSufficient } from '../../lib/evidence.mjs';

const NOW = 1_793_000_000;
const maker = { id: 'ops-a', isStaff: true, active: true, roles: ['ops_finance'] };
const checker = { id: 'ops-b', isStaff: true, active: true, roles: ['ops_finance_approver'], stepUpAt: NOW - 60, orgIds: [] };
const checker2 = { id: 'ops-c', isStaff: true, active: true, roles: ['ops_finance_approver'], stepUpAt: NOW - 60, orgIds: [] };
const payload = { order: 'DH-2610-0007', amount_vnd: 15000000, bank_txn_id: 'BT-1' };
const bankEv = [{ type: 'bank_statement_line', ref: 'SK-20261025-17' }];

test('Ảnh ủy nhiệm chi KHÔNG đủ để xác nhận cọc đã vào', () => {
  assert.throws(() => createRequest({ id: 'r1', kind: 'confirm_bank_credit', maker, payload, evidence: [{ type: 'payer_transfer_receipt_image' }], now: NOW }), /chi_co_bang_chung_khong_gia_tri/);
  assert.throws(() => createRequest({ id: 'r1', kind: 'confirm_bank_credit', maker, payload, evidence: [], now: NOW }), /khong_co_bang_chung/);
});

test('Thang bằng chứng: trả thẳng nhận xác nhận của người nhận; cọc thì không', () => {
  assert.equal(evidenceSufficient('direct_payment_received', [{ type: 'payee_in_app_confirmation_otp' }], 'auto').ok, true);
  assert.equal(evidenceSufficient('deposit_received', [{ type: 'payee_in_app_confirmation_otp' }], 'auto').ok, false);
  assert.equal(evidenceSufficient('deposit_received', [{ type: 'bank_trace_reply' }], 'auto').ok, false, 'hạng C chỉ qua duyệt tay');
  assert.equal(evidenceSufficient('deposit_received', [{ type: 'bank_trace_reply' }], 'manual').ok, true);
});

test('Tự duyệt bị chặn; duyệt đúng thì chạy được một lần', () => {
  const req = createRequest({ id: 'r2', kind: 'confirm_bank_credit', maker, payload, evidence: bankEv, now: NOW });
  assert.equal(approve(req, { checker: { ...maker, roles: ['ops_finance', 'ops_finance_approver'], stepUpAt: NOW }, seenPayloadHash: req.payload_hash, now: NOW }).reason, 'tu_duyet');
  assert.equal(approve(req, { checker, seenPayloadHash: req.payload_hash, now: NOW }).ok, true);
  assert.equal(execute(req, { payload, executor: { id: 'worker' }, now: NOW }).ok, true);
  assert.equal(execute(req, { payload, executor: { id: 'worker' }, now: NOW }).reason, 'chua_du_duyet');
});

test('Sửa số tiền sau khi duyệt bị chặn lúc chạy', () => {
  const req = createRequest({ id: 'r3', kind: 'confirm_bank_credit', maker, payload, evidence: bankEv, now: NOW });
  approve(req, { checker, seenPayloadHash: req.payload_hash, now: NOW });
  assert.equal(execute(req, { payload: { ...payload, amount_vnd: 150000000 }, executor: { id: 'worker' }, now: NOW }).reason, 'noi_dung_bi_doi_sau_duyet');
});

test('Người duyệt thấy nội dung khác (giao diện cũ) thì không duyệt được', () => {
  const req = createRequest({ id: 'r4', kind: 'confirm_bank_credit', maker, payload, evidence: bankEv, now: NOW });
  assert.equal(approve(req, { checker, seenPayloadHash: payloadHash({ ...payload, amount_vnd: 1 }), now: NOW }).reason, 'noi_dung_duyet_khac');
});

test('Thiếu xác thực tăng cường, xung đột lợi ích, hết hạn đều bị chặn', () => {
  const req = createRequest({ id: 'r5', kind: 'confirm_bank_credit', maker, payload, orderOrgIds: ['org-dong-xanh'], evidence: bankEv, now: NOW });
  assert.equal(approve(req, { checker: { ...checker, stepUpAt: NOW - 3600 }, seenPayloadHash: req.payload_hash, now: NOW }).reason, 'can_xac_thuc_tang_cuong');
  assert.equal(approve(req, { checker: { ...checker, orgIds: ['org-dong-xanh'] }, seenPayloadHash: req.payload_hash, now: NOW }).reason, 'xung_dot_loi_ich');
  assert.equal(approve(req, { checker, seenPayloadHash: req.payload_hash, now: NOW + 25 * 3600 }).reason, 'het_han');
});

test('Từ 100 triệu cần hai người duyệt khác nhau', () => {
  const big = { ...payload, amount_vnd: 150000000 };
  const req = createRequest({ id: 'r6', kind: 'confirm_bank_credit', maker, payload: big, evidence: bankEv, now: NOW });
  assert.equal(approve(req, { checker, seenPayloadHash: req.payload_hash, now: NOW }).status, 'pending');
  assert.equal(approve(req, { checker, seenPayloadHash: req.payload_hash, now: NOW }).reason, 'da_duyet_roi');
  assert.equal(execute(req, { payload: big, executor: { id: 'worker' }, now: NOW }).reason, 'chua_du_duyet');
  assert.equal(approve(req, { checker: checker2, seenPayloadHash: req.payload_hash, now: NOW }).status, 'approved');
  assert.equal(execute(req, { payload: big, executor: { id: 'worker' }, now: NOW }).ok, true);
});

test('Người lập không đủ vai không lập được', () => {
  assert.throws(() => createRequest({ id: 'r7', kind: 'confirm_bank_credit', maker: { id: 'x', isStaff: true, roles: ['ops_field'] }, payload, evidence: bankEv, now: NOW }), /nguoi_lap/);
});
