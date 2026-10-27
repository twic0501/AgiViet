// Ký và xác minh webhook ngân hàng (và đối tác khác): HMAC-SHA256 + timestamp + nonce + mã khóa.
//
// Chuỗi được ký (v1):  "v1" ":" kid ":" timestamp ":" nonce ":" <thân yêu cầu nguyên byte>
// Header:
//   X-AGV-Key-Id     mã khóa (xoay khóa: mỗi kid có thể có 2 bí mật trong giai đoạn chuyển)
//   X-AGV-Timestamp  giây Unix
//   X-AGV-Nonce      16–64 ký tự [A-Za-z0-9_-], không lặp trong cửa sổ hạn
//   X-AGV-Signature  "v1=" + hex(HMAC)
//
// Lưu ý triển khai:
// 1. Xác minh trên THÂN NGUYÊN BYTE (raw body), không trên JSON đã parse rồi stringify lại.
// 2. Thứ tự: định dạng -> khóa -> hạn thời gian -> chữ ký -> nonce. Chỉ ghi nonce SAU khi chữ ký đúng,
//    để kẻ tấn công không "đốt" được nonce hợp lệ bằng yêu cầu giả.
// 3. Chữ ký đúng chỉ chứng minh người gửi giữ bí mật. Webhook là THÔNG BÁO, không phải bằng chứng cuối:
//    trước khi ghi sổ cái tiền phải tra lại ngân hàng (API truy vấn giao dịch) và khớp lệnh (xem matchBankCredit).
// 4. Chống lặp nghiệp vụ là việc riêng: UNIQUE (provider, provider_event_id) ở evt.inbound_webhooks
//    và idempotency_key ở ledger.transactions. Nonce chỉ chống phát lại ở tầng vận chuyển.
import { randomBytes } from 'node:crypto';
import { hmac, safeEqual } from './util.mjs';

export const H = Object.freeze({
  kid: 'x-agv-key-id',
  ts: 'x-agv-timestamp',
  nonce: 'x-agv-nonce',
  sig: 'x-agv-signature',
});

export const DEFAULTS = Object.freeze({
  toleranceSec: 300, // lệch giờ tối đa cho phép (cả quá khứ lẫn tương lai)
  maxBodyBytes: 256 * 1024,
});

const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const KID_RE = /^[A-Za-z0-9._-]{1,64}$/;

function baseString(kid, ts, nonce, body) {
  return Buffer.concat([Buffer.from(`v1:${kid}:${ts}:${nonce}:`, 'utf8'), body]);
}

const toBuf = (b) => (Buffer.isBuffer(b) ? b : Buffer.from(b, 'utf8'));

/** Ký một thân webhook. Dùng ở cổng ngân hàng mô phỏng và trong kiểm thử. */
export function signWebhook({ secret, kid, rawBody, timestamp, nonce }) {
  if (!KID_RE.test(kid)) throw new TypeError('kid không hợp lệ');
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const n = nonce ?? randomBytes(16).toString('hex');
  const mac = hmac(secret, baseString(kid, ts, n, toBuf(rawBody))).toString('hex');
  return { [H.kid]: kid, [H.ts]: String(ts), [H.nonce]: n, [H.sig]: `v1=${mac}` };
}

/**
 * Xác minh webhook.
 * @param {object} p
 * @param {object} p.headers   header (khóa chữ thường)
 * @param {Buffer|string} p.rawBody
 * @param {Record<string,(string|Buffer)[]>} p.keys  kid -> danh sách bí mật còn hiệu lực (xoay khóa)
 * @param {{checkAndSet:Function}} p.nonceStore
 * @param {number} p.now  giây Unix
 * @returns {{ok:true, kid:string} | {ok:false, reason:string}}
 */
export function verifyWebhook({ headers, rawBody, keys, nonceStore, now, provider = 'bank', toleranceSec = DEFAULTS.toleranceSec, maxBodyBytes = DEFAULTS.maxBodyBytes }) {
  const h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const kid = h[H.kid], tsRaw = h[H.ts], nonce = h[H.nonce], sigRaw = h[H.sig];
  if (!kid || !tsRaw || !nonce || !sigRaw) return { ok: false, reason: 'thieu_header' };
  if (!KID_RE.test(kid) || !NONCE_RE.test(nonce) || !/^\d{9,11}$/.test(tsRaw)) return { ok: false, reason: 'sai_dinh_dang' };
  const m = /^v1=([0-9a-f]{64})$/.exec(sigRaw);
  if (!m) return { ok: false, reason: 'sai_dinh_dang_chu_ky' };
  const body = toBuf(rawBody ?? '');
  if (body.length > maxBodyBytes) return { ok: false, reason: 'than_qua_lon' };

  const secrets = keys?.[kid];
  if (!secrets || secrets.length === 0) return { ok: false, reason: 'khoa_khong_biet' };

  const ts = Number(tsRaw);
  if (Math.abs(now - ts) > toleranceSec) return { ok: false, reason: 'qua_han_thoi_gian' };

  const given = Buffer.from(m[1], 'hex');
  const base = baseString(kid, tsRaw, nonce, body);
  let match = false;
  for (const s of secrets) {
    // so mọi khóa, không dừng sớm, để thời gian không lộ khóa nào khớp
    if (safeEqual(hmac(s, base), given)) match = true;
  }
  if (!match) return { ok: false, reason: 'sai_chu_ky' };

  // cửa sổ nhớ nonce phải phủ hết khoảng timestamp được chấp nhận ở hai phía
  if (!nonceStore.checkAndSet(`webhook:${provider}:${kid}`, nonce, toleranceSec * 2 + 60, now)) {
    return { ok: false, reason: 'phat_lai_nonce' };
  }
  return { ok: true, kid };
}

/**
 * Khớp một khoản ngân hàng báo có (đã xác minh chữ ký VÀ đã tra lại API ngân hàng) với lệnh nộp cọc.
 * Không tự quyết "gần đúng": mọi lệch đều vào tài khoản treo (suspense) chờ vận hành đối soát.
 *
 * instruction: { id, reference, amount_vnd, credit_account, currency: 'VND', status }
 * credit:      { bank_txn_id, reference, amount_vnd, credit_account, currency, payer_account_hash, requeried: bool }
 * @returns {{outcome:'confirm'|'suspense'|'reject', reasons:string[]}}
 */
export function matchBankCredit(instruction, credit) {
  const reasons = [];
  if (!credit?.requeried) return { outcome: 'reject', reasons: ['chua_tra_lai_ngan_hang'] };
  if (!instruction) return { outcome: 'suspense', reasons: ['khong_co_lenh'] };
  if (!Number.isSafeInteger(credit.amount_vnd) || credit.amount_vnd <= 0) return { outcome: 'reject', reasons: ['so_tien_khong_hop_le'] };
  if (credit.currency !== 'VND') reasons.push('sai_tien_te');
  if (credit.credit_account !== instruction.credit_account) reasons.push('sai_tai_khoan_nhan');
  if (instruction.status !== 'awaiting_funds') reasons.push('lenh_khong_cho_tien');
  if (credit.reference !== instruction.reference) reasons.push('sai_ma_tham_chieu');
  if (credit.amount_vnd < instruction.amount_vnd) reasons.push('thieu_tien');
  if (credit.amount_vnd > instruction.amount_vnd) reasons.push('thua_tien');
  if (!credit.payer_account_hash) reasons.push('khong_ro_tai_khoan_nguon');
  return reasons.length ? { outcome: 'suspense', reasons } : { outcome: 'confirm', reasons: [] };
}
