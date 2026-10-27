// Lỗi nghiệp vụ thống nhất: mã ổn định (12 mục A8), câu tiếng Việt dễ hiểu, cách khắc phục, HTTP status.
// Lỗi từ DB (HINT/SQLSTATE) được ánh xạ về mã nghiệp vụ; không trả tên bảng hay giá kín cho người dùng.

export interface MoTaLoi { http: number; cau: string; khacPhuc: string }

export const MA_LOI: Record<string, MoTaLoi> = {
  CHUA_DANG_NHAP: { http: 401, cau: 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.', khacPhuc: 'Đăng nhập lại bằng số điện thoại.' },
  KHONG_CO_QUYEN: { http: 403, cau: 'Vai của bạn không được làm việc này.', khacPhuc: 'Nhờ người có quyền trong tổ chức làm, hoặc xin cấp vai.' },
  KHONG_TIM_THAY: { http: 404, cau: 'Không tìm thấy hoặc bạn không được xem.', khacPhuc: 'Kiểm lại mã, hoặc tải lại danh sách.' },
  DU_LIEU_KHONG_HOP_LE: { http: 422, cau: 'Thông tin gửi lên chưa đúng.', khacPhuc: 'Sửa các trường được chỉ ra rồi gửi lại.' },
  PHIEN_BAN_DA_DOI: { http: 409, cau: 'Nội dung đã đổi so với bản bạn đang xem.', khacPhuc: 'Tải lại để xem bản mới nhất rồi làm lại.' },
  REVISION_XUNG_DOT: { http: 409, cau: 'Có người vừa cập nhật trước bạn.', khacPhuc: 'Tải lại rồi làm lại.' },
  IDEMPOTENCY_XUNG_DOT: { http: 409, cau: 'Mã chống lặp đã dùng cho một yêu cầu khác.', khacPhuc: 'Tạo mã mới cho thao tác mới.' },
  TRANG_THAI_KHONG_CHO_PHEP: { http: 409, cau: 'Bước này không làm được ở trạng thái hiện tại.', khacPhuc: 'Tải lại để xem trạng thái mới nhất.' },
  DANG_CO_DE_NGHI: { http: 409, cau: 'Đơn đang có đề nghị sửa chờ trả lời.', khacPhuc: 'Trả lời hoặc rút đề nghị trước.' },
  DANG_XIN_HUY: { http: 409, cau: 'Đơn đang có yêu cầu hủy chờ trả lời.', khacPhuc: 'Chờ bên kia trả lời yêu cầu hủy.' },
  KHONG_DU_LUONG: { http: 409, cau: 'Lô không còn đủ lượng khả dụng.', khacPhuc: 'Giảm lượng hoặc chọn lô khác.' },
  VUOT_80_UOC_TINH: { http: 409, cau: 'Lô ước tính chỉ được cam kết tối đa 80% lượng.', khacPhuc: 'Giảm lượng hoặc cân thực rồi cập nhật lô.' },
  MAT_HANG_CHUA_XAC_MINH: { http: 422, cau: 'Mặt hàng/loại này ở vườn này chưa được AgiViet xác minh hoặc đã hết hạn.', khacPhuc: 'Xem GET /v1/seller/verified-products; liên hệ nhân viên để xác minh trước khi đăng.' },
  CHUA_HET_CACH_LY: { http: 422, cau: 'Vườn còn cách ly thuốc.', khacPhuc: 'Chọn ngày hái sau ngày hết cách ly.' },
  DUOI_60_THAM_KHAO: { http: 422, cau: 'Giá chào thấp hơn 60% giá tham khảo.', khacPhuc: 'Nâng giá chào.' },
  CHAO_VUOT_LUONG: { http: 409, cau: 'Tổng lượng chào đang mở vượt 2 lần lượng cần.', khacPhuc: 'Chờ lời chào cũ được trả lời hoặc rút bớt.' },
  GIA_KHONG_DUOC_GIAM: { http: 422, cau: 'Giá tối đa chỉ được tăng.', khacPhuc: 'Giữ hoặc tăng giá tối đa.' },
  HET_LUOT_TRA_GIA: { http: 409, cau: 'Bạn đã hết lượt trả giá.', khacPhuc: 'Đồng ý hoặc từ chối lời chào.' },
  HET_LUOT_RUT: { http: 409, cau: 'Đã hết lượt rút lời chào trên phiếu này.', khacPhuc: '' },
  CAN_XAC_NHAN_GIA_BAT_THUONG: { http: 422, cau: 'Giá thấp bất thường, cần xác nhận thêm trước khi ký.', khacPhuc: 'Đọc và tick câu xác nhận.' },
  OTP_SAI: { http: 422, cau: 'Mã xác nhận không đúng.', khacPhuc: 'Nhập lại mã trong tin nhắn (còn lượt).' },
  OTP_HET_HAN: { http: 422, cau: 'Mã xác nhận đã hết hạn hoặc đã dùng.', khacPhuc: 'Bấm gửi lại mã.' },
  CHUA_CO_COC: { http: 409, cau: 'Ngân hàng chưa xác nhận cọc.', khacPhuc: 'Chờ ngân hàng xác nhận.' },
  CHUA_DU_TIEN_TRUOC_BOC: { http: 409, cau: 'Khoản trả trước bốc chưa được người bán xác nhận đủ.', khacPhuc: 'Bên mua chuyển đủ, người bán xác nhận.' },
  THE_SAN_SANG_CHUA_DU: { http: 409, cau: 'Thẻ Sẵn sàng giao chưa đủ.', khacPhuc: 'Xem dòng đỏ trên thẻ.' },
  QR_KHONG_DUNG_DOT: { http: 422, cau: 'Mã QR không đúng đợt giao này.', khacPhuc: 'Quét đúng QR của đợt.' },
  QR_HET_HAN: { http: 422, cau: 'Mã QR đã hết hạn hoặc đã dùng.', khacPhuc: 'Mở lại QR mới trên máy người nhận.' },
  QR_BI_KHOA: { http: 423, cau: 'Mã đã bị khóa do nhập sai nhiều lần.', khacPhuc: 'Gọi hỗ trợ.' },
  NGUOI_NHAN_KHONG_CHI_DINH: { http: 403, cau: 'Người này không phải người nhận được chỉ định.', khacPhuc: 'Dùng máy của người nhận được chỉ định.' },
  KET_QUA_KHONG_KHOP_TONG: { http: 422, cau: 'Tổng ba phần không bằng lượng cân.', khacPhuc: 'Sửa số đạt, hạ cấp, trả lại cho khớp.' },
  KET_QUA_AM: { http: 422, cau: 'Số lượng không được âm.', khacPhuc: '' },
  THIEU_ANH_TRA_LAI: { http: 422, cau: 'Trả lại vượt mức cho phép cần ảnh.', khacPhuc: 'Chụp ảnh phần trả lại.' },
  THIEU_LY_DO: { http: 422, cau: 'Thiếu lý do.', khacPhuc: 'Chọn mã lý do.' },
  HET_HAN_KHIEU_NAI: { http: 409, cau: 'Đã quá hạn khiếu nại.', khacPhuc: '' },
  DA_GIA_HAN: { http: 409, cau: 'Hạn này đã được gia hạn một lần.', khacPhuc: '' },
  TIEN_VUOT_SO_BAO: { http: 409, cau: 'Số xác nhận vượt số bên trả đã báo.', khacPhuc: 'Đã mở đối soát.' },
  MA_GIAO_DICH_TRUNG: { http: 409, cau: 'Mã giao dịch này đã được xác nhận trong đơn.', khacPhuc: 'Kiểm lại mã giao dịch ngân hàng.' },
  TAI_KHOAN_DANG_CHO: { http: 409, cau: 'Tài khoản nhận tiền đang trong thời gian chờ.', khacPhuc: 'Chờ hết thời gian chờ.' },
  LO_KHOA_AN_TOAN: { http: 409, cau: 'Lô đang khóa an toàn.', khacPhuc: 'Cần kết quả kiểm mới và vận hành duyệt.' },
  DUOI_SAN_BAO_TIEU: { http: 422, cau: 'Giá thấp nhất dưới giá sàn bao tiêu.', khacPhuc: '' },
  VUOT_MUC_KHUNG: { http: 409, cau: 'Vượt mức được phép của hợp đồng khung.', khacPhuc: 'Bổ sung cọc khung hoặc xin cho nợ thêm.' },
  GOI_HET_THANH_VIEN: { http: 409, cau: 'Gói hiện tại đã đủ số thành viên.', khacPhuc: 'Nâng gói hoặc bớt thành viên.' },
  GOI_HET_HAN_MUC: { http: 409, cau: 'Gói hiện tại đã hết hạn mức.', khacPhuc: 'Nâng gói.' },
  CAN_DUYET_NOI_BO: { http: 409, cau: 'Giá trị vượt hạn mức của bạn, cần quản lý duyệt.', khacPhuc: 'Gửi duyệt nội bộ.' },
  NGUOI_LAP_KHONG_DUOC_DUYET: { http: 403, cau: 'Người lập không được tự duyệt.', khacPhuc: 'Nhờ người khác duyệt.' },
  CAN_MANG: { http: 503, cau: 'Cần kết nối mạng cho bước này.', khacPhuc: 'Thử lại khi có mạng.' },
  WEBHOOK_KHONG_HOP_LE: { http: 401, cau: 'Webhook không xác thực.', khacPhuc: '' },
  CHUA_TRA_LAI_NGAN_HANG: { http: 409, cau: 'Chưa tra lại được giao dịch ở ngân hàng.', khacPhuc: 'Hệ thống sẽ thử lại.' },
  QUA_NHIEU_YEU_CAU: { http: 429, cau: 'Bạn thao tác quá nhanh.', khacPhuc: 'Đợi một chút rồi thử lại.' },
  CHI_MOI_TRUONG_THU: { http: 404, cau: 'Chức năng chỉ có ở môi trường thử.', khacPhuc: '' },
  LOI_HE_THONG: { http: 500, cau: 'Có lỗi hệ thống.', khacPhuc: 'Thử lại; nếu vẫn lỗi bấm Cần hỗ trợ và gửi mã yêu cầu.' },
  DICH_VU_NGOAI_LOI: { http: 503, cau: 'Nguồn dữ liệu bên ngoài đang lỗi.', khacPhuc: 'Thử lại sau ít phút.' },
  CHUA_HO_TRO: { http: 501, cau: 'Chức năng này chưa làm ở backend.', khacPhuc: '' },
};

export class LoiNghiepVu extends Error {
  ma: string;
  http: number;
  chiTiet?: unknown;
  constructor(ma: string, cau?: string, chiTiet?: unknown) {
    const mt = MA_LOI[ma] ?? MA_LOI.LOI_HE_THONG;
    super(cau ?? mt.cau);
    this.ma = MA_LOI[ma] ? ma : 'LOI_HE_THONG';
    this.http = mt.http;
    this.chiTiet = chiTiet;
  }
}

export const loi = (ma: string, cau?: string, chiTiet?: unknown) => new LoiNghiepVu(ma, cau, chiTiet);

/** Ánh xạ lỗi PostgreSQL (HINT ổn định, SQLSTATE) về mã nghiệp vụ. */
const HINT_MA: Record<string, string> = {
  KHONG_CO_QUYEN: 'KHONG_CO_QUYEN',
  PHIEN_BAN_DA_DOI: 'PHIEN_BAN_DA_DOI',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_XUNG_DOT',
  CHUA_DU_TIEN_TRUOC_BOC: 'CHUA_DU_TIEN_TRUOC_BOC',
  ck_qty_non_negative: 'KHONG_DU_LUONG',
  ck_qty_estimated_cap: 'VUOT_80_UOC_TINH',
  ck_status_transition: 'TRANG_THAI_KHONG_CHO_PHEP',
  ck_status_actor: 'KHONG_CO_QUYEN',
  ck_otp_verified_binding: 'OTP_HET_HAN',
  ck_delivery_ready: 'THE_SAN_SANG_CHUA_DU',
  ck_signature_helper: 'KHONG_CO_QUYEN',
  ck_signer_authority: 'KHONG_CO_QUYEN',
  ck_webhook_signature: 'WEBHOOK_KHONG_HOP_LE',
  ck_spray_clear: 'CHUA_HET_CACH_LY',
  ck_payment_over_reported: 'TIEN_VUOT_SO_BAO',
  FRAMEWORK_LIMIT_EXCEEDED: 'VUOT_MUC_KHUNG',
  ck_bank_cooldown: 'TAI_KHOAN_DANG_CHO',
  ck_lot_verified_product: 'MAT_HANG_CHUA_XAC_MINH',
  ck_lot_withdrawal: 'CHUA_HET_CACH_LY',
  ck_role_grant_owner: 'KHONG_CO_QUYEN',
};

export function anhXaLoiDb(e: any): LoiNghiepVu | null {
  if (!e || typeof e !== 'object' || !('code' in e || 'hint' in e)) return null;
  const hint: string | undefined = e.hint;
  const msg: string = String(e.message ?? '');
  if (hint && HINT_MA[hint]) return new LoiNghiepVu(HINT_MA[hint], undefined, { db: hint });
  if (hint && MA_LOI[hint]) return new LoiNghiepVu(hint, undefined, { db: hint });
  if (hint && hint.startsWith('ck_') ) return new LoiNghiepVu('TRANG_THAI_KHONG_CHO_PHEP', undefined, { db: hint, thong_bao: msg.slice(0, 160) });
  if(e.code==='42501')return new LoiNghiepVu('CHUA_HO_TRO','Đường DB này chưa có command hoặc chưa được cấp quyền runtime; backend không chạy dự phòng bằng owner.');
  if (e.code === '23505') {
    if (/bank_txn_ref|txn/i.test(msg) || /bank_txn_ref/.test(String(e.constraint ?? ''))) return new LoiNghiepVu('MA_GIAO_DICH_TRUNG');
    return new LoiNghiepVu('REVISION_XUNG_DOT', 'Bản ghi đã tồn tại (trùng).', { db: e.constraint ?? '23505' });
  }
  if (e.code === '23514' || e.code === '23503' || e.code === '23P01') return new LoiNghiepVu('DU_LIEU_KHONG_HOP_LE', undefined, { db: e.constraint ?? e.code, thong_bao: msg.slice(0, 160) });
  if (e.code === '40001' || e.code === '40P01') return new LoiNghiepVu('REVISION_XUNG_DOT', 'Xung đột đồng thời, thử lại.');
  if (e.code === 'P0001') return new LoiNghiepVu('TRANG_THAI_KHONG_CHO_PHEP', undefined, { db: hint ?? null, thong_bao: msg.slice(0, 160) });
  return null;
}
