// Chính sách phí, cọc, hạn. Mức hiện tại là mức mô phỏng; mức thật do trang vận hành cấu hình (giai đoạn 3).

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
}

export const CHINH_SACH_MAC_DINH: ChinhSach = {
  phiGioiThieu: 0.01,
  phiMoiQuen: 0.003,
  phiSan: 50_000,
  phiTran: 3_000_000,
  tyLeCoc: 0.1,
  hanCoc: 48 * 3600_000,
};

export const tien = (kg: number, gia: number): number => Math.round(kg * gia);

export function tinhPhi(giaTri: number, laMoiQuen: boolean, cs: ChinhSach = CHINH_SACH_MAC_DINH): number {
  const tyLe = laMoiQuen ? cs.phiMoiQuen : cs.phiGioiThieu;
  return Math.min(cs.phiTran, Math.max(cs.phiSan, Math.round(giaTri * tyLe)));
}

export const tinhCoc = (giaTri: number, cs: ChinhSach = CHINH_SACH_MAC_DINH): number => Math.round((giaTri * cs.tyLeCoc) / 1000) * 1000;

export const vnd = (v: number | undefined): string => Math.round(v ?? 0).toLocaleString('vi-VN');
