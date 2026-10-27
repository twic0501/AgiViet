// Chính sách tài khoản nhận tiền: đổi tài khoản, thời gian chờ, chụp tài khoản vào lệnh, chặn chi khi vừa đổi.
//
// Mối đe dọa chính: kẻ chiếm tài khoản (SIM swap, lừa lấy OTP, người giúp/người nhà) đổi tài khoản nhận tiền
// NGAY TRƯỚC quyết toán rồi rút tiền. Biện pháp:
//  - chỉ chủ (vai can_payout_admin) được yêu cầu; người giúp bị chặn ở API (F03) VÀ ở DB (đề xuất ở file 06);
//  - ≥ 2 yếu tố, trong đó OTP tới số CŨ đã xác minh + một yếu tố khác (liên hệ dự phòng, gặp trực tiếp HTX, video);
//  - tên chủ tài khoản do ngân hàng tra (NAPAS) phải khớp tên tổ chức/chủ hộ đã xác minh;
//  - chờ 24 giờ (72 giờ nếu trong 7 ngày có khôi phục tài khoản/đổi SIM/thiết bị mới), báo kênh cũ + liên hệ dự phòng
//    + bên mua của các đơn đang mở; chủ bấm "Không phải tôi" là khóa;
//  - lệnh chi đã lập GIỮ tài khoản đã chụp; không tự chuyển sang tài khoản mới (K26, F05);
//  - lệnh chi lập trong 72 giờ sau khi tài khoản mới có hiệu lực, với số tiền từ ngưỡng, phải qua vận hành gọi lại
//    số cũ hoặc liên hệ dự phòng (hold_for_callback).

export const PAYOUT_POLICY = Object.freeze({
  cooldownSec: 24 * 3600,
  cooldownAfterRecoverySec: 72 * 3600,
  recoveryLookbackSec: 7 * 24 * 3600,
  freshAccountWindowSec: 72 * 3600,
  freshAccountHoldVnd: 20_000_000,
});

/**
 * Đánh giá yêu cầu đổi tài khoản.
 * req: { requester:{ id, isOwner, isHelper, lastRecoveryAt, newDeviceAt }, factors:[...], nameMatch:boolean|null,
 *        accountHashUsedByOtherOrgs:number }
 */
export function evaluateChange(req, now) {
  const r = req.requester;
  if (r.isHelper) return { ok: false, reason: 'nguoi_giup_khong_duoc_doi' };
  if (!r.isOwner) return { ok: false, reason: 'chi_chu_tai_khoan' };
  const f = new Set(req.factors || []);
  if (!f.has('otp_old_phone') || f.size < 2) return { ok: false, reason: 'thieu_yeu_to_xac_minh' };
  if (req.nameMatch !== true) return { ok: false, reason: 'ten_chu_tai_khoan_khong_khop' };
  const recent = [r.lastRecoveryAt, r.newDeviceAt].some((t) => t && now - t < PAYOUT_POLICY.recoveryLookbackSec);
  const cooldown = recent ? PAYOUT_POLICY.cooldownAfterRecoverySec : PAYOUT_POLICY.cooldownSec;
  const flags = [];
  if (recent) flags.push('vua_khoi_phuc_hoac_thiet_bi_moi');
  if ((req.accountHashUsedByOtherOrgs || 0) > 0) flags.push('tai_khoan_dung_cho_to_chuc_khac');
  return { ok: true, cooldownUntil: now + cooldown, notify: ['kenh_cu', 'lien_he_du_phong', 'ben_mua_don_dang_mo'], flags, needsOpsReview: flags.length > 0 };
}

/** Kích hoạt khi hết thời gian chờ (worker hệ thống). */
export function canActivate(account, now) {
  if (account.status !== 'cooling_down') return { ok: false, reason: 'sai_trang_thai' };
  if (!account.cooldown_until || now < account.cooldown_until) return { ok: false, reason: 'chua_het_thoi_gian_cho' };
  if (account.name_match !== true) return { ok: false, reason: 'ten_khong_khop' };
  if (account.disputed) return { ok: false, reason: 'chu_da_bao_khong_phai_toi' };
  return { ok: true };
}

/**
 * Kiểm một lệnh chi trước khi gửi ngân hàng.
 * instruction: { snapshot_account_id, amount_vnd, created_at }
 * accounts: Map id -> { status, activated_at }
 */
export function checkPayoutInstruction(instruction, accounts, now) {
  const acc = accounts.get(instruction.snapshot_account_id);
  if (!acc) return { action: 'block', reason: 'khong_co_tai_khoan_chup' };
  if (acc.status === 'locked') return { action: 'block', reason: 'tai_khoan_dang_khoa' };
  if (acc.status === 'replaced') return { action: 'hold_for_owner', reason: 'tai_khoan_chup_da_bi_thay' }; // không tự đổi đích
  if (acc.status !== 'active') return { action: 'block', reason: 'tai_khoan_chua_hieu_luc' };
  if (now - acc.activated_at < PAYOUT_POLICY.freshAccountWindowSec && instruction.amount_vnd >= PAYOUT_POLICY.freshAccountHoldVnd) {
    return { action: 'hold_for_callback', reason: 'tai_khoan_moi_doi' };
  }
  return { action: 'send' };
}
