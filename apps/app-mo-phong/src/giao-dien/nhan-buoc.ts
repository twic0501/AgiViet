// Chữ trên nút của từng bước, theo người đang bấm. Bước có tham số thì giao diện hỏi thêm (xem phan-he/chung/BangBuoc).
import type { TenBuoc } from '@agiviet/nghiep-vu';

export const NHAN_BUOC: Record<TenBuoc, string> = {
  rutDon: 'Rút đơn',
  xacNhanDon: 'Xác nhận đơn',
  tuChoiDon: 'Từ chối đơn',
  datCoc: 'Đặt cọc vào tài khoản đảm bảo',
  quaHanCoc: 'Đóng đơn quá hạn',
  huyTruocCoc: 'Hủy đơn',
  yeuCauHuy: 'Xin hủy đơn',
  dongYHuy: 'Đồng ý hủy',
  tuChoiHuy: 'Không đồng ý hủy',
  nhapKetQua: 'Gửi kết quả cân',
  ketQuaDung: 'Số cân đúng',
  ketQuaSai: 'Số cân không đúng',
  chuyenTienDamBao: 'Chuyển vào tài khoản đảm bảo',
  giaiNgan: 'Giải ngân',
  baoDaTra: 'Ghi đã trả trực tiếp',
  tienDu: 'Đã nhận đủ',
  nhanMotPhan: 'Nhận một phần',
  tienChua: 'Chưa thấy tiền',
  guiChungTu: 'Gửi chứng từ',
  ghiDoiSoat: 'Ghi vào đối soát',
};

/** Bước phụ hoặc có hậu quả lớn: hiện kiểu nút phụ hoặc cảnh báo. */
export const KIEU_BUOC: Partial<Record<TenBuoc, 'phu' | 'canh-bao'>> = {
  rutDon: 'phu', tuChoiDon: 'phu', huyTruocCoc: 'canh-bao', yeuCauHuy: 'canh-bao', tuChoiHuy: 'phu', ketQuaSai: 'phu',
  baoDaTra: 'phu', nhanMotPhan: 'phu', tienChua: 'phu', guiChungTu: 'phu', ghiDoiSoat: 'phu',
};
