// Khuôn chung của các nhóm lệnh: ngữ cảnh, kết quả, tiện ích kiểm tra.
import { ngayCua } from '../chinh-sach.ts';
import type { Ben, NguoiDung, NguoiLam, SoGiaoDich } from '../kieu.ts';

export interface NguCanhLenh {
  /** Bản sao của sổ: được sửa trực tiếp. */
  so: SoGiaoDich;
  nguoi: NguoiLam;
  bayGio: number;
}

/** Kết quả một lệnh: mã đối tượng vừa tạo hoặc vừa đổi; hoặc lỗi viết cho người dùng. */
export type KetQuaLenh = { ma?: string } | { loi: string };

export const loi = (noiDung: string): { loi: string } => ({ loi: noiDung });
export const ben = (n: NguoiLam | NguoiDung): Ben => ({ id: n.id, ten: n.ten });

/** Cấp mã mới theo tiền tố: LO-1, KN-1, HĐ-0001… */
export function capMa(so: SoGiaoDich, tienTo: string, rong = 0): string {
  so.dem[tienTo] = (so.dem[tienTo] ?? 0) + 1;
  return `${tienTo}-${String(so.dem[tienTo]).padStart(rong, '0')}`;
}

export const homNay = (bayGio: number) => ngayCua(bayGio);
export const ngayHopLe = (s: string | undefined): boolean => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const chuRong = (s: string | undefined): boolean => !s || !s.trim();
export const soDuong = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Kiểu một bảng xử lý: mỗi loại lệnh một hàm. */
export type BangXuLy<L extends { loai: string }> = { [K in L['loai']]: (lenh: Extract<L, { loai: K }>, nc: NguCanhLenh) => KetQuaLenh };
