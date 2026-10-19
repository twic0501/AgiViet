// Chính sách phí, cọc, hạn, hạn mức. Mức hiện tại là mức mô phỏng; trang vận hành chỉnh được (lệnh cap_nhat_chinh_sach).
import type { Goi } from './kieu.ts';

export interface HanMuc {
  /** Lời mời kết nối mới mỗi tháng (đang chờ + được đồng ý; bị từ chối thì trả lượt). */
  ketNoi: number;
  /** Tin cần mua mới mỗi tháng. */
  nhuCau: number;
  /** Số thành viên của tổ chức (kể cả người quản lý). */
  thanhVien: number;
}

export interface ChinhSach {
  /** Phí giới thiệu: đơn đầu tiên giữa bên mua và người bán này (tỷ lệ trên giá trị đơn). */
  phiGioiThieu: number;
  /** Phí mối quen: từ đơn thứ hai trở đi với cùng người bán. */
  phiMoiQuen: number;
  phiSan: number;
  phiTran: number;
  /** Tỷ lệ cọc trên giá trị đơn, làm tròn tới nghìn đồng. */
  tyLeCoc: number;
  /** Thời hạn đặt cọc kể từ khi người bán xác nhận (mili giây). */
  hanCoc: number;
  /** Tin lô tự ẩn nếu người bán không xác nhận còn hàng trong khoảng này (mili giây). */
  hanHienThiLo: number;
  hanMuc: Record<Goi, HanMuc>;
  /** Giá gói Business mỗi tháng (đồng, chưa thuế). */
  giaBusiness: number;
  /** Ứng tiền trước: tối đa bao nhiêu phần giá trị đơn, phí trên số ứng. */
  ungToiDa: number;
  phiUng: number;
}

export const CHINH_SACH_MAC_DINH: ChinhSach = {
  phiGioiThieu: 0.01,
  phiMoiQuen: 0.003,
  phiSan: 50_000,
  phiTran: 3_000_000,
  tyLeCoc: 0.1,
  hanCoc: 48 * 3600_000,
  hanHienThiLo: 14 * 24 * 3600_000,
  hanMuc: {
    mien_phi: { ketNoi: 5, nhuCau: 5, thanhVien: 1 },
    business: { ketNoi: 50, nhuCau: 30, thanhVien: 5 },
  },
  giaBusiness: 1_500_000,
  ungToiDa: 0.7,
  phiUng: 0.015,
};

export const tien = (kg: number, gia: number): number => Math.round(kg * gia);

export function tinhPhi(giaTri: number, laMoiQuen: boolean, cs: ChinhSach = CHINH_SACH_MAC_DINH): number {
  const tyLe = laMoiQuen ? cs.phiMoiQuen : cs.phiGioiThieu;
  return Math.min(cs.phiTran, Math.max(cs.phiSan, Math.round(giaTri * tyLe)));
}

export const tinhCoc = (giaTri: number, cs: ChinhSach = CHINH_SACH_MAC_DINH): number => Math.round((giaTri * cs.tyLeCoc) / 1000) * 1000;

export const vnd = (v: number | undefined): string => Math.round(v ?? 0).toLocaleString('vi-VN');

/** Tháng (yyyy-mm) của một mốc giờ, theo giờ Việt Nam. */
export const thangCua = (luc: number): string => new Date(luc + 7 * 3600_000).toISOString().slice(0, 7);
/** Ngày (yyyy-mm-dd) của một mốc giờ, theo giờ Việt Nam. */
export const ngayCua = (luc: number): string => new Date(luc + 7 * 3600_000).toISOString().slice(0, 10);
