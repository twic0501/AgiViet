// Lệnh trao đổi trong một kết nối đã đồng ý: tin nhắn (tự che liên lạc khi chưa cọc), báo giá hai chiều, hẹn xem vườn.
import type { KetNoi, NguoiLam, SoGiaoDich } from '../kieu.ts';
import { cheLienLac, lienLacMo } from '../lien-lac.ts';
import { capMa, chuRong, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export type LenhTraoDoi =
  | { loai: 'gui_tin'; ketNoiId: string; noiDung: string }
  | { loai: 'gui_bao_gia'; ketNoiId: string; gia: number; kg: number; ngayGiao: string; ghiChu?: string }
  | { loai: 'tra_loi_bao_gia'; baoGiaId: string; dongY: boolean }
  | { loai: 'de_nghi_hen'; ketNoiId: string; luc: string; ghiChu?: string }
  | { loai: 'tra_loi_hen'; henId: string; dongY: boolean }
  | { loai: 'huy_hen'; henId: string };

/** Kết nối đã đồng ý mà người này là một bên. */
function ketNoiCuaToi(so: SoGiaoDich, id: string, nguoi: NguoiLam): KetNoi | { loi: string } {
  const kn = so.ketNoi.find(x => x.id === id);
  if (!kn || (kn.ban.id !== nguoi.id && kn.mua.id !== nguoi.id)) return loi('Không tìm thấy cuộc trao đổi này.');
  if (kn.trangThai !== 'dong_y') return loi('Hai bên cần đồng ý kết nối trước khi trao đổi.');
  return kn;
}
const vaiCua = (nguoi: NguoiLam) => nguoi.vai as 'ban' | 'mua';

export const XU_LY_TRAO_DOI: BangXuLy<LenhTraoDoi> = {
  gui_tin(l, { so, nguoi, bayGio }) {
    const kn = ketNoiCuaToi(so, l.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (chuRong(l.noiDung)) return loi('Tin nhắn trống.');
    if (l.noiDung.length > 1000) return loi('Tin nhắn dài quá 1.000 ký tự.');
    const mo = lienLacMo(so, kn.ban.id, kn.mua.id);
    const che = mo ? { noiDung: l.noiDung.trim(), biChe: [] } : cheLienLac(l.noiDung.trim());
    const id = capMa(so, 'TN');
    so.tinNhan.push({ id, ketNoiId: kn.id, vai: vaiCua(nguoi), noiDung: che.noiDung, biChe: che.biChe, ...(che.biChe.length ? { goc: l.noiDung.trim() } : {}), luc: bayGio });
    return { ma: id };
  },
  gui_bao_gia(l, { so, nguoi, bayGio }) {
    const kn = ketNoiCuaToi(so, l.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (!soDuong(l.gia) || !soDuong(l.kg)) return loi('Giá và lượng phải lớn hơn 0.');
    if (!ngayHopLe(l.ngayGiao)) return loi('Chọn ngày giao.');
    // Báo giá mới thay báo giá đang chờ của cùng người gửi trong kết nối này
    for (const b of so.baoGia) if (b.ketNoiId === kn.id && b.trangThai === 'cho' && b.tu === vaiCua(nguoi)) b.trangThai = 'het';
    const id = capMa(so, 'BG');
    so.baoGia.push({ id, ketNoiId: kn.id, tu: vaiCua(nguoi), gia: l.gia, kg: l.kg, ngayGiao: l.ngayGiao, ghiChu: l.ghiChu?.trim() ?? '', trangThai: 'cho', luc: bayGio });
    return { ma: id };
  },
  tra_loi_bao_gia(l, { so, nguoi }) {
    const bg = so.baoGia.find(x => x.id === l.baoGiaId);
    if (!bg) return loi('Không tìm thấy báo giá.');
    const kn = ketNoiCuaToi(so, bg.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (bg.tu === vaiCua(nguoi)) return loi('Bên kia mới trả lời được báo giá của bạn.');
    if (bg.trangThai !== 'cho') return loi('Báo giá này đã được trả lời hoặc đã có báo giá mới hơn.');
    bg.trangThai = l.dongY ? 'dong_y' : 'tu_choi';
    return { ma: bg.id };
  },
  de_nghi_hen(l, { so, nguoi, bayGio }) {
    const kn = ketNoiCuaToi(so, l.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (!ngayHopLe(l.luc.slice(0, 10))) return loi('Chọn ngày giờ hẹn.');
    if (Date.parse(l.luc) < bayGio) return loi('Giờ hẹn phải ở tương lai.');
    if (so.henXem.some(h => h.ketNoiId === kn.id && h.trangThai === 'cho')) return loi('Đang có một đề nghị hẹn chờ trả lời.');
    const id = capMa(so, 'HX');
    so.henXem.push({ id, ketNoiId: kn.id, tu: vaiCua(nguoi), luc: l.luc, ghiChu: l.ghiChu?.trim() ?? '', trangThai: 'cho', guiLuc: bayGio });
    return { ma: id };
  },
  tra_loi_hen(l, { so, nguoi }) {
    const h = so.henXem.find(x => x.id === l.henId);
    if (!h) return loi('Không tìm thấy lịch hẹn.');
    const kn = ketNoiCuaToi(so, h.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (h.tu === vaiCua(nguoi)) return loi('Bên kia mới trả lời được đề nghị hẹn của bạn.');
    if (h.trangThai !== 'cho') return loi('Đề nghị hẹn này đã được trả lời.');
    h.trangThai = l.dongY ? 'dong_y' : 'tu_choi';
    return { ma: h.id };
  },
  huy_hen(l, { so, nguoi }) {
    const h = so.henXem.find(x => x.id === l.henId);
    if (!h) return loi('Không tìm thấy lịch hẹn.');
    const kn = ketNoiCuaToi(so, h.ketNoiId, nguoi); if ('loi' in kn) return kn;
    if (!['cho', 'dong_y'].includes(h.trangThai)) return loi('Lịch hẹn này đã kết thúc.');
    h.trangThai = 'huy';
    return { ma: h.id };
  },
};
