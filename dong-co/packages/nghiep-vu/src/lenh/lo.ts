// Lệnh về lô hàng: đăng, sửa, báo lượng còn lại, xác nhận còn hàng, ẩn và hiện lại.
import type { CoSoLuong, Lo, SoGiaoDich } from '../kieu.ts';
import { conBan } from '../lo.ts';
import { ben, capMa, chuRong, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export interface DuLieuLo {
  matHang: string;
  ten: string;
  kg: number;
  coSo: CoSoLuong;
  gia: number | null;
  thuocTinh?: Record<string, string>;
  choCheBien?: boolean;
  haiTu?: string;
  haiDen?: string;
  vuonId?: string;
  anh?: string[];
  moTa?: string;
  /** Lô gộp nhiều hộ: tổng phải bằng lượng lô. */
  thanhPhan?: { ho: string; kg: number }[];
}

export type LenhLo =
  | ({ loai: 'dang_lo' } & DuLieuLo)
  | { loai: 'sua_lo'; loId: string; gia?: number | null; moTa?: string; thuocTinh?: Record<string, string>; choCheBien?: boolean; haiTu?: string; haiDen?: string; anh?: string[] }
  | { loai: 'cap_nhat_luong'; loId: string; kg: number; coSo: CoSoLuong }
  | { loai: 'con_hang'; loId: string }
  | { loai: 'an_lo'; loId: string; an: boolean };

/** Ngày cách ly thuốc còn hiệu lực của một vườn: phun ngày N với thời gian cách ly C ngày thì được hái từ N + C. */
export function hetCachLy(so: SoGiaoDich, vuonId: string): string | null {
  let muonNhat: string | null = null;
  for (const k of so.nhatKy) {
    if (k.vuonId !== vuonId || k.loai !== 'phun_thuoc' || !k.ngayCachLy) continue;
    const d = new Date(k.ngay + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k.ngayCachLy);
    const het = d.toISOString().slice(0, 10);
    if (!muonNhat || het > muonNhat) muonNhat = het;
  }
  return muonNhat;
}

function kiemDuLieu(l: Partial<DuLieuLo>, so: SoGiaoDich, banId: string, homNay: string): string | null {
  if (l.ten !== undefined && chuRong(l.ten)) return 'Ghi tên mặt hàng.';
  if (l.kg !== undefined && !soDuong(l.kg)) return 'Lượng phải lớn hơn 0.';
  if (l.gia !== undefined && l.gia !== null && !soDuong(l.gia)) return 'Giá phải lớn hơn 0, hoặc để trống để nhận báo giá.';
  if (l.haiTu && !ngayHopLe(l.haiTu)) return 'Ngày hái "từ" không hợp lệ.';
  if (l.haiDen && !ngayHopLe(l.haiDen)) return 'Ngày hái "đến" không hợp lệ.';
  if (l.haiTu && l.haiDen && l.haiTu > l.haiDen) return 'Ngày hái "đến" phải sau ngày "từ".';
  if (l.vuonId) {
    if (!so.vuon.some(v => v.id === l.vuonId && v.ban.id === banId)) return 'Không tìm thấy vườn này trong sổ của bạn.';
    // An toàn thực phẩm: không bán hàng hái trước khi hết thời gian cách ly thuốc
    const het = hetCachLy(so, l.vuonId);
    const haiSomNhat = l.haiTu ?? homNay;
    if (het && haiSomNhat < het) return `Vườn này còn trong thời gian cách ly thuốc tới hết ngày ${het.split('-').reverse().join('/')}. Chọn ngày hái từ ngày đó trở đi.`;
  }
  if (l.thanhPhan) {
    if (l.thanhPhan.some(t => chuRong(t.ho) || !soDuong(t.kg))) return 'Mỗi hộ trong lô gộp cần tên và lượng lớn hơn 0.';
    const tong = l.thanhPhan.reduce((s, t) => s + t.kg, 0);
    if (l.kg !== undefined && tong !== l.kg) return `Tổng phần các hộ (${tong.toLocaleString('vi-VN')} kg) phải bằng lượng lô (${l.kg.toLocaleString('vi-VN')} kg).`;
  }
  return null;
}

export const XU_LY_LO: BangXuLy<LenhLo> = {
  dang_lo(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'ban') return loi('Chỉ người bán đăng lô.');
    const sai = kiemDuLieu(l, so, nguoi.id, new Date(bayGio + 7 * 3600_000).toISOString().slice(0, 10));
    if (sai) return loi(sai);
    const lo: Lo = {
      id: capMa(so, 'LO'), ban: ben(nguoi), matHang: l.matHang, ten: l.ten.trim(), kg: l.kg, coSo: l.coSo, gia: l.gia, hua: 0, giao: 0,
      thuocTinh: l.thuocTinh ?? {}, choCheBien: !!l.choCheBien, anh: l.anh ?? [], moTa: l.moTa?.trim() ?? '', dangLuc: bayGio, conHangLuc: bayGio,
      ...(l.haiTu ? { haiTu: l.haiTu } : {}), ...(l.haiDen ? { haiDen: l.haiDen } : {}), ...(l.vuonId ? { vuonId: l.vuonId } : {}),
      ...(l.thanhPhan ? { thanhPhan: l.thanhPhan.map(t => ({ ho: t.ho.trim(), kg: t.kg })) } : {}),
    };
    so.lo.unshift(lo);
    return { ma: lo.id };
  },
  sua_lo(l, { so, nguoi, bayGio }) {
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo || lo.ban.id !== nguoi.id) return loi('Chỉ người bán của lô này sửa được tin.');
    // Kiểm theo ngày hái sau khi sửa (giữ ngày cũ nếu không đổi), để chỉ sửa giá thì không bị chặn oan
    const haiTu = l.haiTu ?? lo.haiTu, haiDen = l.haiDen ?? lo.haiDen;
    const sai = kiemDuLieu({ ...l, ...(haiTu ? { haiTu } : {}), ...(haiDen ? { haiDen } : {}), ...(lo.vuonId ? { vuonId: lo.vuonId } : {}) }, so, nguoi.id, new Date(bayGio + 7 * 3600_000).toISOString().slice(0, 10));
    if (sai) return loi(sai);
    if (l.gia !== undefined) lo.gia = l.gia;
    if (l.moTa !== undefined) lo.moTa = l.moTa.trim();
    if (l.thuocTinh) lo.thuocTinh = l.thuocTinh;
    if (l.choCheBien !== undefined) lo.choCheBien = l.choCheBien;
    if (l.haiTu !== undefined) lo.haiTu = l.haiTu;
    if (l.haiDen !== undefined) lo.haiDen = l.haiDen;
    if (l.anh) lo.anh = l.anh;
    lo.conHangLuc = bayGio;
    return { ma: lo.id };
  },
  cap_nhat_luong(l, { so, nguoi, bayGio }) {
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo) return loi('Không tìm thấy lô.');
    if (nguoi.vai !== 'ban' || lo.ban.id !== nguoi.id) return loi('Chỉ người bán của lô này sửa được lượng.');
    if (!soDuong(l.kg)) return loi('Lượng còn lại phải lớn hơn 0.');
    if (lo.thanhPhan) return loi('Lô gộp nhiều hộ: sửa phần của từng hộ ở màn Lô gộp.');
    // Cho phép thấp hơn lượng đã hứa (mưa bão rụng trái): giao diện cảnh báo, thỏa thuận cũ giữ nguyên
    lo.kg = l.kg;
    lo.coSo = l.coSo;
    lo.conHangLuc = bayGio;
    return { ma: lo.id };
  },
  con_hang(l, { so, nguoi, bayGio }) {
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo || lo.ban.id !== nguoi.id) return loi('Chỉ người bán của lô này xác nhận được.');
    if (!conBan(lo)) return loi('Lô đã chốt hết, không cần xác nhận còn hàng.');
    lo.conHangLuc = bayGio;
    lo.an = false;
    return { ma: lo.id };
  },
  an_lo(l, { so, nguoi, bayGio }) {
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo || lo.ban.id !== nguoi.id) return loi('Chỉ người bán của lô này ẩn hoặc hiện được tin.');
    lo.an = l.an;
    if (!l.an) lo.conHangLuc = bayGio;
    return { ma: lo.id };
  },
};
