// Lệnh sổ làm vườn của người bán: vườn/ao, mùa vụ, nhật ký canh tác, thu chi.
import type { GiaiDoanVu, LoaiNhatKy, Vuon } from '../kieu.ts';
import { ben, capMa, chuRong, homNay, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export type LenhVuon =
  | { loai: 'them_vuon'; ten: string; loaiVuon: Vuon['loai']; dienTich: number; donViDienTich: Vuon['donViDienTich']; cay: string; soGoc?: number; namTrong?: number }
  | { loai: 'sua_vuon'; vuonId: string; ten?: string; dienTich?: number; cay?: string; soGoc?: number }
  | { loai: 'them_mua_vu'; vuonId: string; ten: string; batDau: string; sanLuongUoc: number; haiDuKien: string }
  | { loai: 'cap_nhat_mua_vu'; muaVuId: string; giaiDoan?: GiaiDoanVu; sanLuongUoc?: number; haiDuKien?: string }
  | { loai: 'ghi_nhat_ky'; vuonId: string; ngay: string; loaiViec: LoaiNhatKy; noiDung: string; vatTu?: string; luong?: string; ngayCachLy?: number; anh?: string }
  | { loai: 'xoa_nhat_ky'; nhatKyId: string }
  | { loai: 'ghi_thu_chi'; loaiTien: 'thu' | 'chi'; so: number; noiDung: string; ngay: string; muaVuId?: string }
  | { loai: 'xoa_thu_chi'; thuChiId: string };

const THU_TU_VU: GiaiDoanVu[] = ['chuan_bi', 'ra_hoa', 'dau_trai', 'thu_hoach', 'xong'];

export const XU_LY_VUON: BangXuLy<LenhVuon> = {
  them_vuon(l, { so, nguoi }) {
    if (nguoi.vai !== 'ban') return loi('Chỉ người bán có sổ vườn.');
    if (chuRong(l.ten) || chuRong(l.cay)) return loi('Ghi tên vườn và cây trồng / con nuôi.');
    if (!soDuong(l.dienTich)) return loi('Diện tích phải lớn hơn 0.');
    if (l.soGoc !== undefined && l.soGoc < 0) return loi('Số gốc không âm.');
    const id = capMa(so, 'VU');
    so.vuon.push({ id, ban: ben(nguoi), ten: l.ten.trim(), loai: l.loaiVuon, dienTich: l.dienTich, donViDienTich: l.donViDienTich, cay: l.cay.trim(), soGoc: l.soGoc ?? 0, namTrong: l.namTrong ?? 0 });
    return { ma: id };
  },
  sua_vuon(l, { so, nguoi }) {
    const v = so.vuon.find(x => x.id === l.vuonId && x.ban.id === nguoi.id);
    if (!v) return loi('Không tìm thấy vườn trong sổ của bạn.');
    if (l.ten !== undefined) { if (chuRong(l.ten)) return loi('Tên vườn không được trống.'); v.ten = l.ten.trim(); }
    if (l.dienTich !== undefined) { if (!soDuong(l.dienTich)) return loi('Diện tích phải lớn hơn 0.'); v.dienTich = l.dienTich; }
    if (l.cay !== undefined) v.cay = l.cay.trim();
    if (l.soGoc !== undefined) v.soGoc = l.soGoc;
    return { ma: v.id };
  },
  them_mua_vu(l, { so, nguoi }) {
    const v = so.vuon.find(x => x.id === l.vuonId && x.ban.id === nguoi.id);
    if (!v) return loi('Chọn vườn của bạn.');
    if (chuRong(l.ten)) return loi('Ghi tên vụ (ví dụ: Xoài vụ nghịch 2026).');
    if (!ngayHopLe(l.batDau) || !ngayHopLe(l.haiDuKien)) return loi('Chọn ngày bắt đầu và ngày hái dự kiến.');
    if (l.haiDuKien < l.batDau) return loi('Ngày hái phải sau ngày bắt đầu vụ.');
    if (!(l.sanLuongUoc >= 0)) return loi('Sản lượng ước không âm.');
    if (so.muaVu.some(m => m.vuonId === v.id && m.giaiDoan !== 'xong')) return loi('Vườn này đang có một vụ chưa xong. Kết thúc vụ cũ trước.');
    const id = capMa(so, 'MV');
    so.muaVu.push({ id, vuonId: v.id, ban: ben(nguoi), ten: l.ten.trim(), batDau: l.batDau, giaiDoan: 'chuan_bi', sanLuongUoc: l.sanLuongUoc, haiDuKien: l.haiDuKien });
    return { ma: id };
  },
  cap_nhat_mua_vu(l, { so, nguoi }) {
    const m = so.muaVu.find(x => x.id === l.muaVuId && x.ban.id === nguoi.id);
    if (!m) return loi('Không tìm thấy vụ của bạn.');
    if (m.giaiDoan === 'xong') return loi('Vụ đã kết thúc.');
    if (l.giaiDoan) {
      if (THU_TU_VU.indexOf(l.giaiDoan) < THU_TU_VU.indexOf(m.giaiDoan)) return loi('Giai đoạn vụ chỉ đi tới, không lùi.');
      m.giaiDoan = l.giaiDoan;
    }
    if (l.sanLuongUoc !== undefined) { if (!(l.sanLuongUoc >= 0)) return loi('Sản lượng ước không âm.'); m.sanLuongUoc = l.sanLuongUoc; }
    if (l.haiDuKien !== undefined) { if (!ngayHopLe(l.haiDuKien)) return loi('Ngày hái không hợp lệ.'); m.haiDuKien = l.haiDuKien; }
    return { ma: m.id };
  },
  ghi_nhat_ky(l, { so, nguoi, bayGio }) {
    const v = so.vuon.find(x => x.id === l.vuonId && x.ban.id === nguoi.id);
    if (!v) return loi('Chọn vườn của bạn.');
    if (!ngayHopLe(l.ngay)) return loi('Chọn ngày làm việc.');
    if (l.ngay > homNay(bayGio)) return loi('Nhật ký ghi việc đã làm: không chọn ngày trong tương lai.');
    if (chuRong(l.noiDung)) return loi('Ghi việc đã làm.');
    if (l.loaiViec === 'phun_thuoc') {
      if (chuRong(l.vatTu)) return loi('Ghi tên thuốc đã phun.');
      if (!(typeof l.ngayCachLy === 'number' && l.ngayCachLy >= 0 && l.ngayCachLy <= 120)) return loi('Ghi số ngày cách ly trên nhãn thuốc (0 đến 120 ngày).');
    }
    const id = capMa(so, 'NK');
    so.nhatKy.unshift({
      id, ban: ben(nguoi), vuonId: v.id, ngay: l.ngay, loai: l.loaiViec, noiDung: l.noiDung.trim(), luc: bayGio,
      ...(l.vatTu ? { vatTu: l.vatTu.trim() } : {}), ...(l.luong ? { luong: l.luong.trim() } : {}),
      ...(l.loaiViec === 'phun_thuoc' ? { ngayCachLy: l.ngayCachLy! } : {}), ...(l.anh ? { anh: l.anh } : {}),
    });
    return { ma: id };
  },
  xoa_nhat_ky(l, { so, nguoi }) {
    const k = so.nhatKy.find(x => x.id === l.nhatKyId && x.ban.id === nguoi.id);
    if (!k) return loi('Không tìm thấy dòng nhật ký của bạn.');
    // Nhật ký phun thuốc đã dùng làm căn cứ cách ly của lô đang bán thì không xóa được (giữ hồ sơ nguồn gốc trung thực)
    if (k.loai === 'phun_thuoc' && so.lo.some(lo => lo.vuonId === k.vuonId && lo.hua + lo.giao > 0)) return loi('Dòng phun thuốc này thuộc hồ sơ của lô đã có đơn, không xóa được. Ghi thêm dòng đính chính.');
    so.nhatKy = so.nhatKy.filter(x => x.id !== k.id);
    return { ma: k.id };
  },
  ghi_thu_chi(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'ban') return loi('Sổ thu chi dành cho người bán.');
    if (!soDuong(l.so)) return loi('Số tiền phải lớn hơn 0.');
    if (chuRong(l.noiDung)) return loi('Ghi khoản thu chi là gì.');
    if (!ngayHopLe(l.ngay) || l.ngay > homNay(bayGio)) return loi('Chọn ngày, không chọn ngày trong tương lai.');
    if (l.muaVuId && !so.muaVu.some(m => m.id === l.muaVuId && m.ban.id === nguoi.id)) return loi('Không tìm thấy vụ của bạn.');
    const id = capMa(so, 'TC');
    so.thuChi.unshift({ id, ban: ben(nguoi), loai: l.loaiTien, so: Math.round(l.so), noiDung: l.noiDung.trim(), ngay: l.ngay, luc: bayGio, ...(l.muaVuId ? { muaVuId: l.muaVuId } : {}) });
    return { ma: id };
  },
  xoa_thu_chi(l, { so, nguoi }) {
    const t = so.thuChi.find(x => x.id === l.thuChiId && x.ban.id === nguoi.id);
    if (!t) return loi('Không tìm thấy khoản thu chi của bạn.');
    so.thuChi = so.thuChi.filter(x => x.id !== t.id);
    return { ma: t.id };
  },
};
