// VietQR (chuẩn EMVCo MPM theo NAPAS): dựng, phân tích, kiểm CRC và ĐỐI CHIẾU với lệnh thanh toán đã chụp.
//
// Vì sao cần: VietQR do app ngân hàng của người trả tiền quét, app đó không biết chữ ký của AgiViet.
// Kẻ gian có thể thay QR (dán đè QR in, sửa ảnh gửi qua Zalo, mã độc trên máy) để tiền đi vào tài khoản khác.
// Biện pháp:
//   (1) chỉ dựng VietQR ở máy chủ từ lệnh thanh toán đã CHỤP tài khoản đích lúc lập (K26/F05);
//   (2) app hiện cạnh QR: tên chủ tài khoản + 4 số cuối + số tiền + nội dung, dặn người trả so với
//       màn xác nhận của app ngân hàng (app ngân hàng hiện tên người nhận tra qua NAPAS);
//   (3) app bên mua/ trang vận hành dùng checkAgainstInstruction() để soát mọi chuỗi VietQR trước khi hiện;
//   (4) tiền cọc chỉ được tính khi ngân hàng giữ cọc báo có ĐÚNG tài khoản cọc và ĐÚNG mã tham chiếu.
//
// Ghi chú chuẩn: trường 38 (GUID A000000727), 00 = BIN 6 số, 01 = số tài khoản/thẻ, dịch vụ QRIBFTTA = chuyển
// tới tài khoản. Cần đối chiếu lại tài liệu kỹ thuật NAPAS bản hiện hành khi tích hợp thật.
import { safeEqual } from './util.mjs';

export function crc16ccitt(str) {
  let crc = 0xffff;
  const bytes = Buffer.from(str, 'utf8');
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (id, value) => {
  const v = String(value);
  if (v.length > 99) throw new RangeError(`Trường ${id} quá dài`);
  return id + v.length.toString().padStart(2, '0') + v;
};

/** Dựng chuỗi VietQR động (một lần, có số tiền) từ lệnh thanh toán. */
export function buildVietQr({ bin, accountNumber, amountVnd, addInfo }) {
  if (!/^\d{6}$/.test(bin)) throw new TypeError('BIN phải 6 chữ số');
  if (!/^[0-9A-Za-z]{4,19}$/.test(accountNumber)) throw new TypeError('Số tài khoản không hợp lệ');
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) throw new TypeError('Số tiền phải là số nguyên dương');
  if (addInfo && !/^[0-9A-Za-z \-]{1,25}$/.test(addInfo)) throw new TypeError('Nội dung chỉ chữ số, chữ không dấu, tối đa 25');
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', accountNumber)) + tlv('02', 'QRIBFTTA');
  let s = tlv('00', '01') + tlv('01', '12') + tlv('38', merchant) + tlv('53', '704') + tlv('54', amountVnd) + tlv('58', 'VN');
  if (addInfo) s += tlv('62', tlv('08', addInfo));
  s += '6304';
  return s + crc16ccitt(s);
}

function parseTlv(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) throw new SyntaxError('TLV cụt');
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(s.slice(i + 2, i + 4))) throw new SyntaxError('Độ dài TLV sai');
    const v = s.slice(i + 4, i + 4 + len);
    if (v.length !== len) throw new SyntaxError('TLV cụt');
    if (id in out) throw new SyntaxError(`Trường ${id} lặp`); // chặn chèn trường thứ hai để đánh lừa bộ đọc
    out[id] = v;
    i += 4 + len;
  }
  return out;
}

/** Phân tích và kiểm CRC. Trả { ok, fields } hoặc { ok:false, reason }. */
export function parseVietQr(str) {
  if (typeof str !== 'string' || str.length < 30 || str.length > 512) return { ok: false, reason: 'sai_dinh_dang' };
  const crcPos = str.lastIndexOf('6304');
  if (crcPos !== str.length - 8) return { ok: false, reason: 'thieu_crc' };
  if (crc16ccitt(str.slice(0, crcPos + 4)) !== str.slice(crcPos + 4).toUpperCase()) return { ok: false, reason: 'sai_crc' };
  let top, m, acct, add = {};
  try {
    top = parseTlv(str.slice(0, crcPos));
    if (!top['38']) return { ok: false, reason: 'khong_phai_vietqr' };
    m = parseTlv(top['38']);
    if (m['00'] !== 'A000000727' || !m['01']) return { ok: false, reason: 'khong_phai_vietqr' };
    acct = parseTlv(m['01']);
    if (top['62']) add = parseTlv(top['62']);
  } catch (e) {
    return { ok: false, reason: 'sai_tlv', detail: e.message };
  }
  return {
    ok: true,
    fields: {
      dynamic: top['01'] === '12',
      bin: acct['00'],
      accountNumber: acct['01'],
      service: m['02'],
      currency: top['53'],
      amountVnd: top['54'] !== undefined && /^\d+$/.test(top['54']) ? Number(top['54']) : null,
      addInfo: add['08'] ?? null,
    },
  };
}

/**
 * Đối chiếu một chuỗi VietQR với lệnh thanh toán đã chụp ở máy chủ.
 * instruction: { bin, accountNumber, amountVnd, reference }  (accountNumber là bản giải mã ở máy chủ)
 */
export function checkAgainstInstruction(str, instruction) {
  const p = parseVietQr(str);
  if (!p.ok) return { ok: false, mismatches: [p.reason] };
  const f = p.fields, mm = [];
  if (!f.dynamic) mm.push('qr_tinh_khong_dung_cho_lenh');
  if (f.bin !== instruction.bin) mm.push('sai_ngan_hang');
  if (!safeEqual(f.accountNumber ?? '', instruction.accountNumber)) mm.push('sai_so_tai_khoan');
  if (f.currency !== '704') mm.push('sai_tien_te');
  if (f.amountVnd !== instruction.amountVnd) mm.push('sai_so_tien');
  if (!f.addInfo || !f.addInfo.includes(instruction.reference)) mm.push('thieu_ma_tham_chieu');
  return { ok: mm.length === 0, mismatches: mm, fields: f };
}
