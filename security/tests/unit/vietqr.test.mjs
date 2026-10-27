import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16ccitt, buildVietQr, parseVietQr, checkAgainstInstruction } from '../../lib/vietqr.mjs';

test('CRC-16/CCITT-FALSE đúng vector chuẩn "123456789" = 29B1', () => {
  assert.equal(crc16ccitt('123456789'), '29B1');
});

const instr = { bin: '970436', accountNumber: '0071000123456', amountVnd: 35000000, reference: 'DH26100007' };
const qr = buildVietQr({ bin: instr.bin, accountNumber: instr.accountNumber, amountVnd: instr.amountVnd, addInfo: 'AGV DH26100007' });

test('Dựng rồi đọc lại VietQR khớp lệnh', () => {
  const p = parseVietQr(qr);
  assert.equal(p.ok, true);
  assert.equal(p.fields.accountNumber, '0071000123456');
  assert.equal(p.fields.amountVnd, 35000000);
  assert.equal(checkAgainstInstruction(qr, instr).ok, true);
});

test('Thay số tài khoản (giữ CRC cũ) bị phát hiện bởi CRC', () => {
  const swapped = qr.replace('0071000123456', '0071000999999');
  assert.equal(parseVietQr(swapped).reason, 'sai_crc');
});

test('Thay số tài khoản VÀ tính lại CRC: CRC qua nhưng đối chiếu lệnh bắt được', () => {
  const evil = buildVietQr({ bin: '970422', accountNumber: '9999888877', amountVnd: 35000000, addInfo: 'AGV DH26100007' });
  const r = checkAgainstInstruction(evil, instr);
  assert.equal(r.ok, false);
  assert.ok(r.mismatches.includes('sai_ngan_hang'));
  assert.ok(r.mismatches.includes('sai_so_tai_khoan'));
});

test('Sửa số tiền hoặc bỏ mã tham chiếu bị bắt', () => {
  const lessMoney = buildVietQr({ bin: instr.bin, accountNumber: instr.accountNumber, amountVnd: 3500000, addInfo: 'AGV DH26100007' });
  assert.deepEqual(checkAgainstInstruction(lessMoney, instr).mismatches, ['sai_so_tien']);
  const noRef = buildVietQr({ bin: instr.bin, accountNumber: instr.accountNumber, amountVnd: 35000000 });
  assert.deepEqual(checkAgainstInstruction(noRef, instr).mismatches, ['thieu_ma_tham_chieu']);
});

test('Chèn trường lặp để đánh lừa bộ đọc bị chặn', () => {
  const body = qr.slice(0, qr.length - 8);
  const injected = body + '5408' + '00001000' + '6304';
  const withCrc = injected + crc16ccitt(injected);
  assert.equal(parseVietQr(withCrc).reason, 'sai_tlv');
});

test('Dựng VietQR từ dữ liệu xấu bị từ chối', () => {
  assert.throws(() => buildVietQr({ bin: '97043', accountNumber: '1', amountVnd: 1 }));
  assert.throws(() => buildVietQr({ bin: '970436', accountNumber: '0071000123456', amountVnd: 1.5 }));
  assert.throws(() => buildVietQr({ bin: '970436', accountNumber: '0071000123456', amountVnd: 1, addInfo: 'Chuyển tiền có dấu' }));
});
