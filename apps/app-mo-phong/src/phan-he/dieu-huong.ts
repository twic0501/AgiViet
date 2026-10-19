// Điều hướng hai vai. Mỗi mục trỏ tới một "trang" trong danh mục màn; màn đầu là màn mở khi bấm mục.
import type { VaiApp } from './danh-muc-man.ts';

export interface MucDieuHuong {
  trang: string;
  ten: string;
  manDau: string;
  /** Nhóm trên thanh bên (chỉ app Thu mua). */
  nhom?: string;
}

/** App Nhà sản xuất: thanh dưới 5 mục; "Tôi" ở góc trên; nút giữa để Ghi hoặc Đăng. */
export const THANH_DUOI_BAN: MucDieuHuong[] = [
  { trang: 'hom-nay', ten: 'Hôm nay', manDau: 'hom-nay' },
  { trang: 'vuon', ten: 'Vườn', manDau: 'vuon' },
  { trang: 'ban', ten: 'Bán', manDau: 'hang' },
  { trang: 'don', ten: 'Đơn', manDau: 'lich' },
  { trang: 'tien', ten: 'Tiền', manDau: 'tien' },
];
export const MUC_TOI_BAN: MucDieuHuong = { trang: 'toi', ten: 'Tôi', manDau: 'toi' };

/** App Thu mua: thanh bên chia nhóm. */
export const THANH_BEN_MUA: MucDieuHuong[] = [
  { trang: 'tong-quan', ten: 'Tổng quan', manDau: 'tong-quan', nhom: 'Hôm nay' },
  { trang: 'nguon-hang', ten: 'Nguồn hàng', manDau: 'nguon-hang', nhom: 'Mua hàng' },
  { trang: 'nhu-cau', ten: 'Nhu cầu', manDau: 'nhu-cau', nhom: 'Mua hàng' },
  { trang: 'bao-gia', ten: 'Báo giá', manDau: 'bao-gia', nhom: 'Mua hàng' },
  { trang: 'tin-nhan', ten: 'Tin nhắn', manDau: 'tin-nhan', nhom: 'Mua hàng' },
  { trang: 'don', ten: 'Đơn', manDau: 'don-hang', nhom: 'Giao dịch' },
  { trang: 'tien', ten: 'Tiền', manDau: 'vi-dam-bao', nhom: 'Giao dịch' },
  { trang: 'kho', ten: 'Kho', manDau: 'nhap-kho', nhom: 'Quản lý' },
  { trang: 'nha-cung-cap', ten: 'Nhà cung cấp', manDau: 'moi-quen', nhom: 'Quản lý' },
  { trang: 'ke-hoach', ten: 'Kế hoạch', manDau: 'ke-hoach', nhom: 'Quản lý' },
  { trang: 'thue-bao-cao', ten: 'Thuế và báo cáo', manDau: 'bang-ke', nhom: 'Quản lý' },
  { trang: 'dich-vu', ten: 'Dịch vụ', manDau: 'dich-vu', nhom: 'Tổ chức' },
  { trang: 'to-chuc', ten: 'Tổ chức', manDau: 'ho-so-to-chuc', nhom: 'Tổ chức' },
];

/** Trang không nằm trong thanh điều hướng (đăng ký, đăng nhập): bố cục không có thanh. */
export const TRANG_NGOAI: Record<VaiApp, string> = { ban: 'bat-dau', mua: 'vao-app' };

export const MAN_VAO: Record<VaiApp, string> = { ban: 'hom-nay', mua: 'tong-quan' };
