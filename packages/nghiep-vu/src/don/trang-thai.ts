import type { TrangThaiDon } from '../kieu.ts';

/** Nhãn trung lập của từng trạng thái (dùng chung hai vai). Lời "việc tiếp theo" riêng từng vai ở hien-thi.ts. */
export const NHAN_TRANG_THAI: Record<TrangThaiDon, string> = {
  cho_ban_xac_nhan: 'Chờ người bán xác nhận đơn',
  ban_tu_choi: 'Người bán từ chối đơn',
  cho_coc: 'Chờ bên mua đặt cọc',
  qua_han: 'Quá hạn đặt cọc, đơn đã đóng',
  cho_giao: 'Đã cọc, chờ giao và cân',
  cho_dong_y_huy: 'Có yêu cầu hủy, chờ bên kia trả lời',
  cho_ban_xn_kq: 'Kết quả cân chờ người bán xác nhận',
  da_chot: 'Đã chốt số cân, chờ trả tiền',
  tien_dang_giu: 'Tiền ở tài khoản đảm bảo, đang chuyển cho người bán',
  bao_da_tra: 'Bên mua báo đã trả, chờ người bán xác nhận',
  chua_thay_tien: 'Người bán chưa thấy tiền, đang đối soát',
  da_nhan_tien: 'Người bán đã nhận đủ, đơn đóng',
  da_huy: 'Đơn đã hủy',
};

export const TRANG_THAI: readonly TrangThaiDon[] = Object.keys(NHAN_TRANG_THAI) as TrangThaiDon[];

/** Đơn đóng mà không giao dịch xong. */
export const KET_THUC: readonly TrangThaiDon[] = ['ban_tu_choi', 'qua_han', 'da_huy'];

/** Đơn đã đóng, không còn bước nào. */
export const DA_DONG: readonly TrangThaiDon[] = [...KET_THUC, 'da_nhan_tien'];

/** Sáu chặng trên thanh tiến trình của đơn. */
export const CHANG = ['Kết nối', 'Đơn', 'Cọc', 'Giao và cân', 'Chốt', 'Tiền về'] as const;

/** Chặng đang ở của mỗi trạng thái (6 = đã qua hết). Đơn hủy giữ chặng lúc hủy, xem changCua(). */
export const CHANG_CUA: Partial<Record<TrangThaiDon, number>> = {
  cho_ban_xac_nhan: 1,
  ban_tu_choi: 1,
  cho_coc: 2,
  qua_han: 2,
  cho_giao: 3,
  cho_dong_y_huy: 3,
  cho_ban_xn_kq: 4,
  da_chot: 5,
  tien_dang_giu: 5,
  bao_da_tra: 5,
  chua_thay_tien: 5,
  da_nhan_tien: 6,
};
