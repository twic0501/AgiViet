// Hàm dùng chung: JSON chuẩn tắc, băm, so sánh hằng thời gian, base64url.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * JSON chuẩn tắc (khóa sắp xếp, không khoảng trắng) để ký và băm.
 * Chặn số thực và số vượt Number.MAX_SAFE_INTEGER: tiền phải là số nguyên đồng (K25).
 * Số tiền lớn hơn 2^53 phải gửi dạng chuỗi chữ số.
 */
export function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(`Số không phải số nguyên an toàn: ${value} (tiền/lượng phải là số nguyên)`);
    }
    return String(value);
  }
  if (typeof value === 'bigint') return JSON.stringify(value.toString());
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
  }
  throw new TypeError(`Kiểu không hỗ trợ trong JSON chuẩn tắc: ${typeof value}`);
}

export const sha256 = (data) => createHash('sha256').update(data).digest();
export const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');
export const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** So sánh hằng thời gian cho hai Buffer/chuỗi; khác độ dài trả false mà không rò thời gian theo nội dung. */
export function safeEqual(a, b) {
  const ba = Buffer.isBuffer(a) ? a : Buffer.from(String(a), 'utf8');
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) {
    // vẫn so một lần để thời gian không phụ thuộc độ dài đúng/sai quá rõ
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export const b64url = (buf) => Buffer.from(buf).toString('base64url');
export const fromB64url = (s) => {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) throw new TypeError('base64url không hợp lệ');
  return Buffer.from(s, 'base64url');
};

/** Định dạng tiền VND cho tin nhắn: 15000000 -> "15.000.000d". */
export function formatVnd(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new TypeError('Số tiền phải là số nguyên không âm');
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'd';
}

/** Đồng hồ tiêm được (kiểm thử). Đơn vị giây. */
export const nowSec = () => Math.floor(Date.now() / 1000);
