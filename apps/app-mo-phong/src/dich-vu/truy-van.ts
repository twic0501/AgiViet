// Truy vấn theo vai: mỗi người chỉ thấy lô, lời mời, đơn của mình; liên lạc bên kia chỉ có khi đơn đã cọc.
import { conBan, lienLacDaMo, nhom, type Don, type NguoiLam, type Nhom, type SoGiaoDich } from '@agiviet/nghiep-vu';
import type { HoSo, KhoHoSo } from '../du-lieu/kho.ts';

export const donCuaToi = (so: SoGiaoDich, nguoi: NguoiLam): Don[] =>
  so.don.filter(d => (nguoi.vai === 'ban' ? d.ban.id : d.mua.id) === nguoi.id);

export function donTheoNhom(so: SoGiaoDich, nguoi: NguoiLam, bayGio: number): Record<Nhom, Don[]> {
  const kq: Record<Nhom, Don[]> = { lam: [], loi: [], cho: [], xong: [], het: [] };
  for (const d of donCuaToi(so, nguoi)) kq[nhom(d, nguoi.vai, bayGio)].push(d);
  return kq;
}

/** Việc cần làm ngay: đơn tới lượt mình hoặc có vấn đề, và (người bán) lời mời kết nối chờ trả lời. */
export function viecCanLam(so: SoGiaoDich, nguoi: NguoiLam, bayGio: number) {
  const n = donTheoNhom(so, nguoi, bayGio);
  const loiMoi = nguoi.vai === 'ban' ? so.ketNoi.filter(k => k.ban.id === nguoi.id && k.trangThai === 'cho') : [];
  return { don: [...n.loi, ...n.lam], loiMoi };
}

export const loCuaToi = (so: SoGiaoDich, nguoi: NguoiLam) => so.lo.filter(l => l.ban.id === nguoi.id);

/** Lô đang bán cho bên mua tìm: còn bán được, không phải lô của chính mình. */
export const loDangBan = (so: SoGiaoDich) => so.lo.filter(l => conBan(l) > 0);

export interface ThongTinBenKia {
  ten: string;
  vung: string;
  daXacMinh: boolean;
  /** Chỉ có khi đơn đã cọc. */
  lienLac: HoSo['lienLac'] | null;
}

export function benKia(don: Don, nguoiXem: NguoiLam, hoSo: KhoHoSo): ThongTinBenKia {
  const ben = nguoiXem.vai === 'ban' ? don.mua : don.ban;
  const hs = hoSo.lay(ben.id);
  return { ten: ben.ten, vung: hs?.vung ?? 'Chưa rõ vùng', daXacMinh: hs?.daXacMinh ?? false, lienLac: lienLacDaMo(don) ? (hs?.lienLac ?? null) : null };
}
