import type { LoaiHang, Lo } from './kieu.ts';

/** Lượng còn bán được = lượng lô − lượng đã hứa cho các đơn người bán đã xác nhận. */
export const conBan = (lo: Pick<Lo, 'kg' | 'hua'>): number => Math.max(0, lo.kg - lo.hua);

/** Trả lại lượng đã hứa khi đơn bị hủy, quá hạn hoặc giảm lượng. */
export function traLuong(lo: Lo | undefined, kg: number): void {
  if (lo) lo.hua = Math.max(0, lo.hua - kg);
}

export type TinhTrangLo = 'dang_ban' | 'con_it' | 'sap_an' | 'da_an' | 'da_chot_het';

/** Tình trạng hiển thị của lô: hết hàng, ẩn tay, quá hạn xác nhận còn hàng (tự ẩn), sắp ẩn (còn ≤ 2 ngày), còn ít (≤ 20%). */
export function tinhTrangLo(lo: Lo, bayGio: number, hanHienThi: number): TinhTrangLo {
  if (!conBan(lo)) return 'da_chot_het';
  if (lo.an || bayGio - lo.conHangLuc > hanHienThi) return 'da_an';
  if (bayGio - lo.conHangLuc > hanHienThi - 2 * 24 * 3600_000) return 'sap_an';
  return conBan(lo) <= lo.kg * 0.2 ? 'con_it' : 'dang_ban';
}

/** Bên mua chỉ tìm thấy lô đang hiển thị và còn bán được. */
export const loHienThi = (lo: Lo, bayGio: number, hanHienThi: number): boolean =>
  ['dang_ban', 'con_it', 'sap_an'].includes(tinhTrangLo(lo, bayGio, hanHienThi));

/** Loại hàng của lô; lô đăng trước khi có trường loại thì suy từ "cho chế biến". */
export const loaiCua = (lo: Pick<Lo, 'loai' | 'choCheBien'>): LoaiHang => lo.loai ?? (lo.choCheBien ? 'loai_2' : 'loai_1');
export const NHAN_LOAI: Record<LoaiHang, string> = { loai_1: 'Loại 1', loai_2: 'Loại 2', loai_3: 'Loại 3', dat: 'Hàng dạt' };
export const LOAI_HANG = Object.keys(NHAN_LOAI) as LoaiHang[];
/** Loại ngay dưới (phần hàng bị trả lại). */
export const loaiDuoi = (l: LoaiHang): LoaiHang => (l === 'loai_1' ? 'loai_2' : l === 'loai_2' ? 'loai_3' : 'dat');
export const laKemLoai = (lo: Pick<Lo, 'loai' | 'choCheBien'>): boolean => loaiCua(lo) !== 'loai_1';
export const dangBanGap = (lo: Pick<Lo, 'banGap'>, bayGio: number): boolean => !!lo.banGap && bayGio <= lo.banGap.den;
