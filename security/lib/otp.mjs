// OTP gắn với ngữ cảnh (purpose binding) cho các thao tác: ký hợp đồng/phụ lục, xác nhận tiền đã nhận,
// đổi tài khoản nhận tiền, duyệt chi, đăng nhập thiết bị mới.
//
// Nguyên tắc:
// 1. Mã gắn với NGỮ CẢNH: mục đích + người + mã phiên bản hợp đồng + sha256 tài liệu + số tiền + đơn.
//    Máy chủ lưu HMAC(pepper, challenge|mã|bindingHash), không lưu mã rõ. Lúc xác minh, bindingHash được tính lại
//    từ TRẠNG THÁI HIỆN TẠI ở máy chủ; hợp đồng đổi (phiên bản mới, số tiền khác) sau khi gửi mã => mã vô hiệu.
// 2. Hạn 5 phút, tối đa 5 lần nhập sai mỗi thử thách, dùng một lần.
// 3. Tin nhắn nói rõ ĐANG ĐỒNG Ý VIỆC GÌ và BAO NHIÊU TIỀN, kèm câu chống lừa đảo. Người bị lừa đọc mã qua điện thoại
//    vẫn thấy "đổi tài khoản nhận tiền" chứ không phải "xác minh quà tặng".
// 4. Người giúp (helper) không bao giờ nhận được thử thách cho ký/tiền/đổi tài khoản (kiểm ở issueOtp).
// 5. OTP là chữ ký điện tử đơn giản: chứng minh quyền kiểm soát số điện thoại tại thời điểm đó, không chứng minh
//    danh tính hay thẩm quyền. Thẩm quyền ký (vai can_sign) phải kiểm riêng.
import { randomInt, randomBytes } from 'node:crypto';
import { canonicalJson, sha256Hex, hmac, safeEqual, formatVnd } from './util.mjs';

export const PURPOSES = Object.freeze({
  contract_sign:      { label: 'KY HOP DONG',              needs: ['order_code', 'contract_version_id', 'document_sha256', 'amount_vnd'], helperAllowed: false },
  amendment_sign:     { label: 'KY PHU LUC',               needs: ['order_code', 'contract_version_id', 'document_sha256', 'amount_vnd'], helperAllowed: false },
  money_received:     { label: 'XAC NHAN DA NHAN TIEN',    needs: ['order_code', 'payment_id', 'amount_vnd'],                              helperAllowed: false },
  payout_change:      { label: 'DOI TAI KHOAN NHAN TIEN',  needs: ['bank_account_id', 'account_masked'],                                   helperAllowed: false },
  payment_approve:    { label: 'DUYET CHI',                needs: ['order_code', 'payment_id', 'amount_vnd'],                              helperAllowed: false },
  login_new_device:   { label: 'DANG NHAP THIET BI MOI',   needs: ['device_label'],                                                       helperAllowed: true },
});

export const OTP_TTL_SEC = 300;
export const OTP_MAX_ATTEMPTS = 5;

export function bindingHash(purpose, userId, binding) {
  const p = PURPOSES[purpose];
  if (!p) throw new TypeError(`Mục đích OTP không hỗ trợ: ${purpose}`);
  for (const k of p.needs) if (binding?.[k] === undefined || binding[k] === null) throw new TypeError(`OTP ${purpose} thiếu ${k}`);
  const subset = Object.fromEntries(p.needs.map((k) => [k, binding[k]]));
  return sha256Hex(canonicalJson({ purpose, user: userId, ...subset }));
}

/** Nội dung SMS/Zalo: không dấu để vừa một tin; luôn kèm việc + số tiền + cảnh báo. */
export function otpMessage(purpose, code, binding) {
  const p = PURPOSES[purpose];
  const what = [p.label, binding.order_code, binding.account_masked].filter(Boolean).join(' ');
  const amt = binding.amount_vnd !== undefined ? ` so tien ${formatVnd(binding.amount_vnd)}` : '';
  return `AgiViet: ${code} la ma ${what}${amt}. Het han 5 phut. KHONG doc ma nay cho bat ky ai, ke ca nhan vien AgiViet.`;
}

/**
 * Phát thử thách. actor: { userId, isHelperForThisOrg, canSign, isOwner }
 * Trả { challenge (lưu DB), code (chỉ gửi qua SMS, không lưu), message }.
 */
export function issueOtp({ purpose, actor, binding, pepper, now }) {
  const p = PURPOSES[purpose];
  if (!p) throw new TypeError('Mục đích OTP không hỗ trợ');
  if (actor.isHelperForThisOrg && !p.helperAllowed) throw new Error('nguoi_giup_khong_duoc_phep');
  if ((purpose === 'contract_sign' || purpose === 'amendment_sign') && !actor.canSign) throw new Error('khong_co_quyen_ky');
  if (purpose === 'payout_change' && !actor.isOwner) throw new Error('chi_chu_tai_khoan');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const challengeId = randomBytes(16).toString('hex');
  const bh = bindingHash(purpose, actor.userId, binding);
  const challenge = {
    id: challengeId, purpose, user_id: actor.userId, binding_hash: bh,
    code_mac: hmac(pepper, `${challengeId}|${code}|${bh}`).toString('hex'),
    expires_at: now + OTP_TTL_SEC, attempts: 0, used_at: null, created_at: now,
  };
  return { challenge, code, message: otpMessage(purpose, code, binding) };
}

/**
 * Xác minh. currentBinding phải được dựng lại từ DB (phiên bản hợp đồng hiện hành, số tiền hiện hành),
 * KHÔNG lấy từ yêu cầu của client. Hàm sửa challenge tại chỗ (attempts, used_at): backend phải ghi lại
 * trong cùng giao dịch với hành động được xác nhận, khóa hàng challenge (SELECT ... FOR UPDATE).
 */
export function verifyOtp(challenge, { code, userId, purpose, currentBinding, pepper, now }) {
  if (challenge.used_at) return { ok: false, reason: 'da_dung' };
  if (now > challenge.expires_at) return { ok: false, reason: 'het_han' };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'qua_so_lan' };
  if (challenge.user_id !== userId || challenge.purpose !== purpose) return { ok: false, reason: 'sai_nguoi_hoac_muc_dich' };
  let bh;
  try { bh = bindingHash(purpose, userId, currentBinding); } catch { return { ok: false, reason: 'thieu_ngu_canh' }; }
  if (bh !== challenge.binding_hash) {
    challenge.used_at = now; // nội dung đã đổi: hủy hẳn thử thách, buộc gửi mã mới với nội dung mới
    return { ok: false, reason: 'noi_dung_da_doi' };
  }
  const mac = hmac(pepper, `${challenge.id}|${String(code)}|${bh}`).toString('hex');
  if (!/^\d{6}$/.test(String(code)) || !safeEqual(mac, challenge.code_mac)) {
    challenge.attempts += 1;
    return { ok: false, reason: 'sai_ma', remaining: OTP_MAX_ATTEMPTS - challenge.attempts };
  }
  challenge.used_at = now;
  return { ok: true };
}
