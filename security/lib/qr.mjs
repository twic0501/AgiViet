// QR có chữ ký và hạn cho AgiViet (không áp dụng cho VietQR, xem vietqr.mjs).
//
// Định dạng:  "AGV1." + b64url(JSON chuẩn tắc của payload) + "." + b64url(chữ ký Ed25519)
// Dùng Ed25519 (bất đối xứng) để app hiện trường xác minh được khi mất mạng bằng KHÓA CÔNG KHAI;
// khóa bí mật chỉ nằm ở máy chủ (KMS/HSM). Ai chụp được QR cũng không tự làm QR mới được.
//
// Payload:
//   v    1
//   t    loại: lot | recv | trip | seal | doc
//   sub  mã đối tượng (lô, đợt giao, chuyến, niêm phong, tài liệu)
//   aud  phạm vi ràng buộc (ví dụ recv: user được chỉ định nhận; trip: mã đợt giao)
//   iat  giờ phát (giây Unix), exp giờ hết hạn (bắt buộc trừ loại lot/doc)
//   jti  mã ngẫu nhiên, dùng để đánh dấu "đã dùng" với loại dùng một lần
//   kid  mã khóa ký
//   x    trường riêng theo loại (ví dụ doc: sha256 của PDF)
//
// QR chỉ là CON TRỎ CÓ CHỮ KÝ. Máy chủ vẫn phải kiểm trạng thái hiện tại (đợt giao còn mở, người quét đúng là
// người được chỉ định, chuyến chưa hủy). QR hợp lệ không thay cho kiểm quyền.
import { generateKeyPairSync, sign as edSign, verify as edVerify, randomBytes, createPublicKey } from 'node:crypto';
import { canonicalJson, b64url, fromB64url, hmac, safeEqual } from './util.mjs';

export const QR_TYPES = Object.freeze({
  lot:  { singleUse: false, maxTtlSec: null,          needsExp: false, needsAud: false }, // truy xuất công khai
  recv: { singleUse: true,  maxTtlSec: 3 * 24 * 3600, needsExp: true,  needsAud: true  }, // nhận hàng (Q15)
  trip: { singleUse: false, maxTtlSec: 2 * 24 * 3600, needsExp: true,  needsAud: true  }, // thẻ chuyến: tài xế + xe
  seal: { singleUse: false, maxTtlSec: 30 * 24 * 3600, needsExp: true, needsAud: true  }, // niêm phong mẫu đối chứng
  doc:  { singleUse: false, maxTtlSec: null,          needsExp: false, needsAud: false }, // xác minh tài liệu PDF
});

const PREFIX = 'AGV1';
const MAX_TOKEN_LEN = 600; // QR mức sửa lỗi M vẫn quét tốt trên giấy in nhiệt

export function generateQrKeyPair() {
  return generateKeyPairSync('ed25519');
}

export function issueQr({ type, sub, aud, ttlSec, extra, kid, privateKey, now }) {
  const spec = QR_TYPES[type];
  if (!spec) throw new TypeError(`Loại QR không hỗ trợ: ${type}`);
  if (!sub) throw new TypeError('Thiếu sub');
  if (spec.needsAud && !aud) throw new TypeError(`QR ${type} phải ràng buộc aud`);
  if (spec.needsExp && !ttlSec) throw new TypeError(`QR ${type} phải có hạn`);
  if (spec.maxTtlSec && ttlSec > spec.maxTtlSec) throw new RangeError(`Hạn QR ${type} vượt mức tối đa`);
  const payload = { v: 1, t: type, sub: String(sub), iat: now, jti: randomBytes(12).toString('base64url'), kid };
  if (aud) payload.aud = String(aud);
  if (ttlSec) payload.exp = now + ttlSec;
  if (extra) payload.x = extra;
  const body = Buffer.from(canonicalJson(payload), 'utf8');
  const sig = edSign(null, body, privateKey);
  const token = `${PREFIX}.${b64url(body)}.${b64url(sig)}`;
  if (token.length > MAX_TOKEN_LEN) throw new RangeError('QR quá dài');
  return { token, payload };
}

/**
 * Xác minh QR.
 * @param {string} token
 * @param {object} o
 * @param {string} o.expectedType   bắt buộc: chống dùng nhầm loại (QR lô đem làm QR nhận hàng)
 * @param {Record<string, KeyObject|string>} o.publicKeys  kid -> khóa công khai
 * @param {string} [o.expectedAud]  với loại có aud: phải trùng (người nhận được chỉ định, mã đợt...)
 * @param {{checkAndSet:Function}} [o.jtiStore]  bắt buộc với loại dùng một lần
 * @param {number} o.now
 * @param {number} [o.skewSec=120]
 */
export function verifyQr(token, { expectedType, publicKeys, expectedAud, jtiStore, now, skewSec = 120 }) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LEN) return { ok: false, reason: 'sai_dinh_dang' };
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'sai_dinh_dang' };
  let body, sig, payload;
  try {
    body = fromB64url(parts[1]);
    sig = fromB64url(parts[2]);
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    return { ok: false, reason: 'sai_dinh_dang' };
  }
  // payload phải đúng dạng chuẩn tắc: chặn biến thể byte khác nhau cùng nghĩa
  try {
    if (canonicalJson(payload) !== body.toString('utf8')) return { ok: false, reason: 'khong_chuan_tac' };
  } catch {
    return { ok: false, reason: 'sai_dinh_dang' };
  }
  const key = publicKeys?.[payload.kid];
  if (!key) return { ok: false, reason: 'khoa_khong_biet' };
  const pub = typeof key === 'string' ? createPublicKey(key) : key;
  if (sig.length !== 64 || !edVerify(null, body, pub, sig)) return { ok: false, reason: 'sai_chu_ky' };

  if (payload.v !== 1) return { ok: false, reason: 'sai_phien_ban' };
  const spec = QR_TYPES[payload.t];
  if (!spec) return { ok: false, reason: 'loai_khong_biet' };
  if (payload.t !== expectedType) return { ok: false, reason: 'sai_loai' };
  if (!Number.isSafeInteger(payload.iat) || payload.iat > now + skewSec) return { ok: false, reason: 'iat_tuong_lai' };
  if (spec.needsExp && !Number.isSafeInteger(payload.exp)) return { ok: false, reason: 'thieu_han' };
  if (payload.exp !== undefined && now > payload.exp + skewSec) return { ok: false, reason: 'het_han' };
  if (spec.needsAud) {
    if (!expectedAud) return { ok: false, reason: 'chua_cho_aud_de_doi_chieu' };
    if (payload.aud !== String(expectedAud)) return { ok: false, reason: 'sai_doi_tuong' };
  }
  if (spec.singleUse) {
    if (!jtiStore) return { ok: false, reason: 'thieu_kho_jti' };
    const ttl = Math.max(60, (payload.exp ?? now) - now + skewSec * 2);
    if (!jtiStore.checkAndSet(`qr:${payload.t}`, payload.jti, ttl, now)) return { ok: false, reason: 'da_dung' };
  }
  return { ok: true, payload };
}

/**
 * Mã 6 số dự phòng khi không quét được QR nhận hàng (Q15).
 * Mã = HMAC(bí mật máy chủ, đợt giao | người nhận | cửa sổ) rút gọn 6 chữ số. Chỉ máy chủ kiểm
 * (không kiểm offline), giới hạn số lần nhập sai theo đợt giao (xem rate-limit.mjs).
 */
export function fallbackCode(secret, { deliveryId, receiverUserId, windowStart }) {
  const mac = hmac(secret, `recv6|${deliveryId}|${receiverUserId}|${windowStart}`);
  const n = mac.readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, '0');
}

export function checkFallbackCode(secret, ctx, code) {
  if (!/^\d{6}$/.test(String(code))) return false;
  return safeEqual(fallbackCode(secret, ctx), String(code));
}
