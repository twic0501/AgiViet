// Lệnh dịch vụ đối tác, ứng tiền trước, hỗ trợ, báo cáo vi phạm; và lệnh của vận hành (chính sách, kết luận tranh chấp).
import { tien, vnd, type ChinhSach } from '../chinh-sach.ts';
import type { BaoCaoViPham, YeuCauDichVu } from '../kieu.ts';
import { ghiDon } from './don.ts';
import { ben, capMa, chuRong, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export type LenhKhac =
  | { loai: 'yeu_cau_dich_vu'; dichVu: YeuCauDichVu['loai']; ngay: string; ghiChu?: string; donMa?: string; loId?: string }
  | { loai: 'bao_gia_dich_vu'; yeuCauId: string; doiTac: string; gia: number }
  | { loai: 'dat_dich_vu'; yeuCauId: string }
  | { loai: 'huy_dich_vu'; yeuCauId: string }
  | { loai: 'xong_dich_vu'; yeuCauId: string }
  | { loai: 'xin_ung_tien'; donMa: string; so: number }
  | { loai: 'duyet_ung_tien'; ungTienId: string; dongY: boolean }
  | { loai: 'gui_ho_tro'; chuDe: string; noiDung: string; donMa?: string }
  | { loai: 'tra_loi_ho_tro'; hoTroId: string; noiDung: string; xong: boolean }
  | { loai: 'bao_cao_vi_pham'; doiTuong: BaoCaoViPham['doiTuong']; lyDo: string }
  | { loai: 'xu_ly_bao_cao'; baoCaoId: string; ketQua: 'giu_nguyen' | 'da_xu_ly' }
  | { loai: 'cap_nhat_chinh_sach'; thayDoi: Partial<Omit<ChinhSach, 'hanMuc'>> }
  | { loai: 'ket_luan_tranh_chap'; donMa: string; noiDung: string };

const nguoiDungVai = (v: string): v is 'ban' | 'mua' => v === 'ban' || v === 'mua';

export const XU_LY_KHAC: BangXuLy<LenhKhac> = {
  yeu_cau_dich_vu(l, { so, nguoi, bayGio }) {
    if (!nguoiDungVai(nguoi.vai)) return loi('Chỉ người bán hoặc bên mua đặt dịch vụ.');
    if (!ngayHopLe(l.ngay)) return loi('Chọn ngày cần dịch vụ.');
    if (l.donMa && !so.don.some(d => d.ma === l.donMa && (d.ban.id === nguoi.id || d.mua.id === nguoi.id))) return loi('Không tìm thấy đơn của bạn.');
    if (l.loId && !so.lo.some(x => x.id === l.loId)) return loi('Không tìm thấy lô.');
    const id = capMa(so, 'DV');
    so.dichVu.unshift({ id, nguoi: ben(nguoi), vai: nguoi.vai, loai: l.dichVu, ngay: l.ngay, ghiChu: l.ghiChu?.trim() ?? '', trangThai: 'cho_bao_gia', luc: bayGio, ...(l.donMa ? { donMa: l.donMa } : {}), ...(l.loId ? { loId: l.loId } : {}) });
    return { ma: id };
  },
  bao_gia_dich_vu(l, { so, nguoi }) {
    if (nguoi.vai !== 'he_thong' && nguoi.vai !== 'van_hanh') return loi('Đối tác gửi báo giá qua hệ thống.');
    const y = so.dichVu.find(x => x.id === l.yeuCauId);
    if (!y || y.trangThai !== 'cho_bao_gia') return loi('Yêu cầu này không chờ báo giá.');
    if (chuRong(l.doiTac) || !soDuong(l.gia)) return loi('Ghi đối tác và giá.');
    y.baoGia = { doiTac: l.doiTac, gia: l.gia };
    y.trangThai = 'da_bao_gia';
    return { ma: y.id };
  },
  dat_dich_vu(l, { so, nguoi }) {
    const y = so.dichVu.find(x => x.id === l.yeuCauId && x.nguoi.id === nguoi.id);
    if (!y) return loi('Không tìm thấy yêu cầu của bạn.');
    if (y.trangThai !== 'da_bao_gia') return loi('Chờ đối tác báo giá rồi mới đặt được.');
    y.trangThai = 'da_dat';
    return { ma: y.id };
  },
  huy_dich_vu(l, { so, nguoi }) {
    const y = so.dichVu.find(x => x.id === l.yeuCauId && x.nguoi.id === nguoi.id);
    if (!y) return loi('Không tìm thấy yêu cầu của bạn.');
    if (['xong', 'huy'].includes(y.trangThai)) return loi('Yêu cầu đã kết thúc.');
    y.trangThai = 'huy';
    return { ma: y.id };
  },
  xong_dich_vu(l, { so, nguoi }) {
    if (nguoi.vai !== 'he_thong' && nguoi.vai !== 'van_hanh') return loi('Đối tác báo hoàn tất qua hệ thống.');
    const y = so.dichVu.find(x => x.id === l.yeuCauId);
    if (!y || y.trangThai !== 'da_dat') return loi('Dịch vụ chưa được đặt.');
    y.trangThai = 'xong';
    return { ma: y.id };
  },
  xin_ung_tien(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'ban') return loi('Ứng tiền trước dành cho người bán.');
    const d = so.don.find(x => x.ma === l.donMa && x.ban.id === nguoi.id);
    if (!d) return loi('Không tìm thấy đơn của bạn.');
    if (!['cho_giao', 'cho_ban_xn_kq', 'da_chot'].includes(d.trangThai)) return loi('Chỉ ứng được cho đơn đã đặt cọc và chưa nhận tiền.');
    if (so.ungTien.some(u => u.donMa === d.ma && ['cho_duyet', 'da_giai_ngan'].includes(u.trangThai))) return loi('Đơn này đã có khoản ứng.');
    const toiDa = Math.floor(tien(d.kg, d.gia) * so.chinhSach.ungToiDa / 1000) * 1000;
    if (!soDuong(l.so) || l.so > toiDa) return loi(`Số ứng phải lớn hơn 0 và không quá ${vnd(toiDa)} đ (${Math.round(so.chinhSach.ungToiDa * 100)}% giá trị đơn).`);
    const id = capMa(so, 'UT');
    so.ungTien.unshift({ id, donMa: d.ma, ban: ben(nguoi), so: l.so, phi: Math.round(l.so * so.chinhSach.phiUng), trangThai: 'cho_duyet', luc: bayGio });
    ghiDon(d, `Người bán xin ứng trước ${vnd(l.so)} đ từ ngân hàng đối tác`, 'ban', bayGio);
    return { ma: id };
  },
  duyet_ung_tien(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'he_thong') return loi('Ngân hàng đối tác duyệt khoản ứng.');
    const u = so.ungTien.find(x => x.id === l.ungTienId);
    if (!u || u.trangThai !== 'cho_duyet') return loi('Khoản ứng này không chờ duyệt.');
    u.trangThai = l.dongY ? 'da_giai_ngan' : 'tu_choi';
    const d = so.don.find(x => x.ma === u.donMa);
    if (d) ghiDon(d, l.dongY ? `Ngân hàng chuyển ứng trước ${vnd(u.so)} đ (phí ${vnd(u.phi)} đ), thu lại từ tiền hàng` : 'Ngân hàng không duyệt khoản ứng', 'he_thong', bayGio);
    return { ma: u.id };
  },
  gui_ho_tro(l, { so, nguoi, bayGio }) {
    if (!nguoiDungVai(nguoi.vai)) return loi('Chỉ người dùng gửi yêu cầu hỗ trợ.');
    if (chuRong(l.chuDe) || chuRong(l.noiDung)) return loi('Chọn chủ đề và mô tả việc cần hỗ trợ.');
    const id = capMa(so, 'HT');
    so.hoTro.unshift({ id, nguoi: ben(nguoi), vai: nguoi.vai, chuDe: l.chuDe, noiDung: l.noiDung.trim(), trangThai: 'moi', traLoi: [], luc: bayGio, ...(l.donMa ? { donMa: l.donMa } : {}) });
    return { ma: id };
  },
  tra_loi_ho_tro(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'van_hanh') return loi('Đội vận hành trả lời hỗ trợ.');
    const h = so.hoTro.find(x => x.id === l.hoTroId);
    if (!h) return loi('Không tìm thấy yêu cầu.');
    if (h.trangThai === 'xong') return loi('Yêu cầu đã đóng.');
    if (chuRong(l.noiDung)) return loi('Ghi nội dung trả lời.');
    h.traLoi.push({ noiDung: l.noiDung.trim(), luc: bayGio });
    h.trangThai = l.xong ? 'xong' : 'dang_xu_ly';
    return { ma: h.id };
  },
  bao_cao_vi_pham(l, { so, nguoi, bayGio }) {
    if (!nguoiDungVai(nguoi.vai)) return loi('Chỉ người dùng gửi báo cáo.');
    if (chuRong(l.lyDo)) return loi('Ghi lý do báo cáo.');
    if (so.baoCao.some(b => b.nguoiBao.id === nguoi.id && b.doiTuong.id === l.doiTuong.id && b.trangThai === 'moi')) return loi('Bạn đã báo cáo nội dung này, đang chờ xử lý.');
    const id = capMa(so, 'BC');
    so.baoCao.unshift({ id, nguoiBao: ben(nguoi), doiTuong: l.doiTuong, lyDo: l.lyDo.trim(), trangThai: 'moi', luc: bayGio });
    return { ma: id };
  },
  xu_ly_bao_cao(l, { so, nguoi }) {
    if (nguoi.vai !== 'van_hanh') return loi('Đội vận hành xử lý báo cáo.');
    const b = so.baoCao.find(x => x.id === l.baoCaoId);
    if (!b || b.trangThai !== 'moi') return loi('Báo cáo này đã được xử lý.');
    b.trangThai = l.ketQua;
    if (l.ketQua === 'da_xu_ly' && b.doiTuong.loai === 'lo') { const lo = so.lo.find(x => x.id === b.doiTuong.id); if (lo) lo.an = true; }
    return { ma: b.id };
  },
  cap_nhat_chinh_sach(l, { so, nguoi }) {
    if (nguoi.vai !== 'van_hanh') return loi('Đội vận hành chỉnh chính sách.');
    const m = { ...so.chinhSach, ...l.thayDoi };
    if (!(m.phiGioiThieu >= 0 && m.phiGioiThieu <= 0.05 && m.phiMoiQuen >= 0 && m.phiMoiQuen <= m.phiGioiThieu)) return loi('Phí giới thiệu từ 0 đến 5%; phí mối quen không vượt phí giới thiệu.');
    if (!(m.phiSan >= 0 && m.phiTran >= m.phiSan)) return loi('Trần phí phải lớn hơn hoặc bằng sàn phí.');
    if (!(m.tyLeCoc > 0 && m.tyLeCoc <= 0.5)) return loi('Tỷ lệ cọc từ trên 0 đến 50%.');
    if (!(m.hanCoc >= 3600_000)) return loi('Hạn cọc tối thiểu 1 giờ.');
    // Áp cho đơn xác nhận sau thời điểm đổi; đơn đã tính cọc giữ nguyên
    so.chinhSach = m;
    return {};
  },
  ket_luan_tranh_chap(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'van_hanh') return loi('Đội vận hành ghi kết luận tranh chấp.');
    const d = so.don.find(x => x.ma === l.donMa);
    if (!d) return loi('Không tìm thấy đơn.');
    if (!['chua_thay_tien', 'cho_giao', 'cho_ban_xn_kq'].includes(d.trangThai) || (d.trangThai !== 'chua_thay_tien' && !d.ketQuaCan?.phanDoi)) return loi('Đơn này không có tranh chấp đang mở.');
    if (chuRong(l.noiDung)) return loi('Ghi kết luận.');
    d.ketLuan = { noiDung: l.noiDung.trim(), luc: bayGio };
    ghiDon(d, `Vận hành kết luận: ${l.noiDung.trim()}`, 'van_hanh', bayGio);
    return { ma: d.ma };
  },
};
