// Tầng dữ liệu: giao diện kho. Tầng dịch vụ chỉ biết giao diện này; đổi sang máy chủ thật thì viết thêm một bản cài đặt.
import type { SoGiaoDich } from '@agiviet/nghiep-vu';

/** Bản đọc của kho: sổ giao dịch + số phiên bản kho (tăng mỗi lần ghi). */
export interface BanDoc {
  so: SoGiaoDich;
  phienBan: number;
}

export type KetQuaGhi = { ok: true; phienBan: number } | { ok: false; loi: 'du_lieu_cu' };

export interface KhoGiaoDich {
  doc(): BanDoc;
  /** Ghi sổ mới, chỉ khi kho vẫn ở đúng phiên bản đã đọc (tránh ghi đè thay đổi của tab hay người khác). */
  ghi(so: SoGiaoDich, phienBanDaDoc: number): KetQuaGhi;
  /** Báo khi kho đổi (kể cả do tab khác). Trả hàm hủy theo dõi. */
  theoDoi(nghe: (ban: BanDoc) => void): () => void;
  /** Xóa sạch dữ liệu mô phỏng. */
  datLai(): void;
}

/** Hồ sơ một người dùng: danh tính công khai + liên lạc (chỉ lộ cho bên kia khi đơn đã cọc). */
export interface HoSo {
  id: string;
  vai: 'ban' | 'mua';
  ten: string;
  vung: string;
  daXacMinh: boolean;
  lienLac: { sdt: string; diaChi: string };
}

export interface KhoHoSo {
  lay(id: string): HoSo | undefined;
  luu(hs: HoSo): void;
  tatCa(): HoSo[];
}
