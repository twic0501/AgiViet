// Lệnh về nhu cầu mua và kết nối. Kết nối hai chiều: bên mua mời một lô, hoặc người bán chào hàng vào một nhu cầu.
import { thangCua } from '../chinh-sach.ts';
import type { KetNoi, NguoiDung, SoGiaoDich } from '../kieu.ts';
import { conBan, loHienThi } from '../lo.ts';
import { ben, capMa, chuRong, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export type LenhKetNoi =
  | { loai: 'dang_nhu_cau'; matHang: string; ten: string; kg: number; tu: string; den: string; giaTran?: number | null; thuocTinh?: Record<string, string>; ghiChu?: string }
  | { loai: 'dong_nhu_cau'; nhuCauId: string }
  | { loai: 'gui_loi_moi'; loId: string; loiNhan?: string }
  | { loai: 'chao_hang'; nhuCauId: string; loId: string; loiNhan?: string }
  | { loai: 'tra_loi_ket_noi'; ketNoiId: string; dongY: boolean }
  | { loai: 'rut_loi_moi'; ketNoiId: string };

/** Lượt đã dùng trong tháng của một bên mua: kết nối (đang chờ + được đồng ý; bị từ chối, rút thì trả lượt) và tin cần mua. */
export function luotDaDung(so: SoGiaoDich, muaId: string, bayGio: number) {
  const thang = thangCua(bayGio);
  return {
    ketNoi: so.ketNoi.filter(k => k.mua.id === muaId && ['cho', 'dong_y'].includes(k.trangThai) && thangCua(k.guiLuc) === thang).length,
    nhuCau: so.nhuCau.filter(n => n.mua.id === muaId && thangCua(n.dangLuc) === thang).length,
  };
}

const hanMuc = (so: SoGiaoDich, n: NguoiDung) => so.chinhSach.hanMuc[n.goi];
const ketNoiDangCo = (so: SoGiaoDich, banId: string, muaId: string, loId: string) =>
  so.ketNoi.find(k => k.ban.id === banId && k.mua.id === muaId && k.loId === loId && ['cho', 'dong_y'].includes(k.trangThai));

export const XU_LY_KET_NOI: BangXuLy<LenhKetNoi> = {
  dang_nhu_cau(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua đăng tin cần mua.');
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (chuRong(l.ten)) return loi('Ghi mặt hàng cần mua.');
    if (!soDuong(l.kg)) return loi('Lượng cần mua phải lớn hơn 0.');
    if (!ngayHopLe(l.tu) || !ngayHopLe(l.den)) return loi('Chọn khoảng ngày cần nhận hàng.');
    if (l.tu > l.den) return loi('Ngày "đến" phải sau ngày "từ".');
    if (l.giaTran != null && !soDuong(l.giaTran)) return loi('Giá trần phải lớn hơn 0, hoặc để trống.');
    const dung = luotDaDung(so, nguoi.id, bayGio).nhuCau, tran = hanMuc(so, n).nhuCau;
    if (dung >= tran) return loi(`Đã dùng ${dung}/${tran} tin cần mua tháng này. Nâng gói hoặc chờ tháng sau.`);
    const id = capMa(so, 'NC');
    so.nhuCau.unshift({ id, mua: ben(nguoi), matHang: l.matHang, ten: l.ten.trim(), kg: l.kg, tu: l.tu, den: l.den, giaTran: l.giaTran ?? null, thuocTinh: l.thuocTinh ?? {}, ghiChu: l.ghiChu?.trim() ?? '', trangThai: 'mo', dangLuc: bayGio });
    return { ma: id };
  },
  dong_nhu_cau(l, { so, nguoi }) {
    const nc = so.nhuCau.find(x => x.id === l.nhuCauId);
    if (!nc || nc.mua.id !== nguoi.id) return loi('Chỉ bên mua đăng tin này đóng được tin.');
    if (nc.trangThai === 'dong') return loi('Tin đã đóng.');
    nc.trangThai = 'dong';
    return { ma: nc.id };
  },
  gui_loi_moi(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua gửi lời mời kết nối với lô.');
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo) return loi('Không tìm thấy lô.');
    if (!conBan(lo)) return loi('Lô đã chốt hết, không kết nối thêm được.');
    if (!loHienThi(lo, bayGio, so.chinhSach.hanHienThiLo)) return loi('Tin lô này đang ẩn.');
    if (ketNoiDangCo(so, lo.ban.id, nguoi.id, lo.id)) return loi('Bạn đã có lời mời hoặc kết nối với lô này.');
    const dung = luotDaDung(so, nguoi.id, bayGio).ketNoi, tran = hanMuc(so, n).ketNoi;
    if (dung >= tran) return loi(`Đã dùng ${dung}/${tran} lượt kết nối tháng này (gồm lời mời đang chờ). Rút một lời mời hoặc nâng gói.`);
    const kn: KetNoi = { id: capMa(so, 'KN'), ban: lo.ban, mua: ben(nguoi), loId: lo.id, tu: 'mua', trangThai: 'cho', loiNhan: l.loiNhan?.trim() ?? '', guiLuc: bayGio };
    so.ketNoi.unshift(kn);
    return { ma: kn.id };
  },
  chao_hang(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'ban') return loi('Chỉ người bán chào hàng vào tin cần mua.');
    const nc = so.nhuCau.find(x => x.id === l.nhuCauId);
    if (!nc || nc.trangThai !== 'mo') return loi('Tin cần mua này đã đóng.');
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo || lo.ban.id !== nguoi.id) return loi('Chọn một lô của bạn để chào hàng.');
    if (!conBan(lo)) return loi('Lô này đã chốt hết.');
    if (ketNoiDangCo(so, nguoi.id, nc.mua.id, lo.id)) return loi('Bạn đã chào lô này cho bên mua này rồi.');
    // Chào hàng không tốn lượt của bên mua; bên mua đồng ý thì mới tính là kết nối
    const kn: KetNoi = { id: capMa(so, 'KN'), ban: ben(nguoi), mua: nc.mua, loId: lo.id, nhuCauId: nc.id, tu: 'ban', trangThai: 'cho', loiNhan: l.loiNhan?.trim() ?? '', guiLuc: bayGio };
    so.ketNoi.unshift(kn);
    return { ma: kn.id };
  },
  tra_loi_ket_noi(l, { so, nguoi, bayGio }) {
    const kn = so.ketNoi.find(x => x.id === l.ketNoiId);
    if (!kn) return loi('Không tìm thấy lời mời.');
    const nhan = kn.tu === 'mua' ? kn.ban : kn.mua;
    if (nhan.id !== nguoi.id) return loi('Chỉ người nhận lời mời trả lời được.');
    if (kn.trangThai !== 'cho') return loi(`Lời mời này đã được ${kn.trangThai === 'dong_y' ? 'đồng ý' : kn.trangThai === 'rut' ? 'rút' : 'từ chối'} rồi.`);
    if (l.dongY && kn.tu === 'ban') {
      const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
      const dung = luotDaDung(so, nguoi.id, bayGio).ketNoi, tran = hanMuc(so, n).ketNoi;
      if (dung >= tran) return loi(`Đã dùng ${dung}/${tran} lượt kết nối tháng này. Nâng gói để nhận thêm chào hàng.`);
    }
    kn.trangThai = l.dongY ? 'dong_y' : 'tu_choi';
    kn.traLoiLuc = bayGio;
    return { ma: kn.id };
  },
  rut_loi_moi(l, { so, nguoi, bayGio }) {
    const kn = so.ketNoi.find(x => x.id === l.ketNoiId);
    if (!kn) return loi('Không tìm thấy lời mời.');
    const gui = kn.tu === 'mua' ? kn.mua : kn.ban;
    if (gui.id !== nguoi.id) return loi('Chỉ người gửi rút được lời mời.');
    if (kn.trangThai !== 'cho') return loi('Chỉ rút được lời mời đang chờ trả lời.');
    kn.trangThai = 'rut';
    kn.traLoiLuc = bayGio;
    return { ma: kn.id };
  },
};
