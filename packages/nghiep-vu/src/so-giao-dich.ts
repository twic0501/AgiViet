// Sổ giao dịch và hàm apDung: cửa duy nhất để thay đổi dữ liệu giao dịch.
// apDung(sổ, lệnh, người làm, giờ) → sổ mới, hoặc lỗi. Không sửa sổ cũ, không đọc giờ hệ thống, không đụng lưu trữ:
// tầng dịch vụ lo việc lấy sổ từ tầng dữ liệu, gọi apDung, rồi lưu sổ mới.
import { CHINH_SACH_MAC_DINH, vnd, type ChinhSach } from './chinh-sach.ts';
import { LUAT, aiLam, type TenBuoc, type ThamSoBuoc } from './don/luat.ts';
import { NHAN_TRANG_THAI } from './don/trang-thai.ts';
import type { Don, KetNoi, KetQua, Lo, NguoiLam, SoGiaoDich } from './kieu.ts';
import { conBan } from './lo.ts';

export const soTrong = (): SoGiaoDich => ({ phienBan: 1, lo: [], ketNoi: [], don: [], dem: { lo: 0, ketNoi: 0, don: 0 } });

export type LenhBuocDon = { [B in TenBuoc]: { loai: 'buoc_don'; ma: string; buoc: B; thamSo: ThamSoBuoc[B] } }[TenBuoc];

export type Lenh =
  | { loai: 'dang_lo'; matHang: string; ten: string; kg: number; coSo: Lo['coSo']; gia: number | null; haiTu?: string; haiDen?: string }
  | { loai: 'cap_nhat_luong'; loId: string; kg: number; coSo: Lo['coSo'] }
  | { loai: 'gui_loi_moi'; loId: string }
  | { loai: 'tra_loi_ket_noi'; ketNoiId: string; dongY: boolean }
  | { loai: 'tao_don'; loId: string; kg: number; gia: number }
  | LenhBuocDon
  | { loai: 'kiem_han' };

/** Kết quả một lệnh: sổ mới + mã đối tượng vừa tạo hoặc vừa đổi (để giao diện mở đúng chỗ). */
export interface DaApDung {
  so: SoGiaoDich;
  doiTuong?: string;
}

const sai = (loi: string): KetQua<never> => ({ ok: false, loi });
/** Sổ chỉ chứa dữ liệu JSON thuần nên sao chép qua JSON là đủ và không phụ thuộc môi trường chạy. */
const saoChep = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ben = (n: NguoiLam) => ({ id: n.id, ten: n.ten });

export function apDung(soCu: SoGiaoDich, lenh: Lenh, nguoi: NguoiLam, bayGio: number, cs: ChinhSach = CHINH_SACH_MAC_DINH): KetQua<DaApDung> {
  const so = saoChep(soCu);
  switch (lenh.loai) {
    case 'dang_lo': {
      if (nguoi.vai !== 'ban') return sai('Chỉ người bán đăng lô.');
      if (!lenh.ten.trim()) return sai('Ghi tên mặt hàng.');
      if (!(lenh.kg > 0)) return sai('Lượng phải lớn hơn 0.');
      if (lenh.gia !== null && !(lenh.gia > 0)) return sai('Giá phải lớn hơn 0, hoặc để trống để nhận báo giá.');
      if (lenh.haiTu && lenh.haiDen && lenh.haiTu > lenh.haiDen) return sai('Ngày hái "đến" phải sau ngày "từ".');
      const lo: Lo = { id: `LO-${++so.dem.lo}`, ban: ben(nguoi), matHang: lenh.matHang, ten: lenh.ten.trim(), kg: lenh.kg, coSo: lenh.coSo, gia: lenh.gia, hua: 0, giao: 0, dangLuc: bayGio };
      if (lenh.haiTu) lo.haiTu = lenh.haiTu;
      if (lenh.haiDen) lo.haiDen = lenh.haiDen;
      so.lo.unshift(lo);
      return { ok: true, giaTri: { so, doiTuong: lo.id } };
    }
    case 'cap_nhat_luong': {
      const lo = so.lo.find(l => l.id === lenh.loId);
      if (!lo) return sai('Không tìm thấy lô.');
      if (nguoi.vai !== 'ban' || lo.ban.id !== nguoi.id) return sai('Chỉ người bán của lô này sửa được lượng.');
      if (!(lenh.kg > 0)) return sai('Lượng còn lại phải lớn hơn 0.');
      // Cho phép thấp hơn lượng đã hứa (mưa bão rụng trái): giao diện cảnh báo, thỏa thuận cũ giữ nguyên
      lo.kg = lenh.kg;
      lo.coSo = lenh.coSo;
      return { ok: true, giaTri: { so, doiTuong: lo.id } };
    }
    case 'gui_loi_moi': {
      if (nguoi.vai !== 'mua') return sai('Chỉ bên mua gửi lời mời kết nối.');
      const lo = so.lo.find(l => l.id === lenh.loId);
      if (!lo) return sai('Không tìm thấy lô.');
      if (!conBan(lo)) return sai('Lô đã chốt hết, không kết nối thêm được.');
      if (so.ketNoi.some(k => k.loId === lo.id && k.mua.id === nguoi.id)) return sai('Bạn đã gửi lời mời cho lô này rồi.');
      const kn: KetNoi = { id: `KN-${++so.dem.ketNoi}`, loId: lo.id, ban: lo.ban, mua: ben(nguoi), trangThai: 'cho', guiLuc: bayGio };
      so.ketNoi.unshift(kn);
      return { ok: true, giaTri: { so, doiTuong: kn.id } };
    }
    case 'tra_loi_ket_noi': {
      const kn = so.ketNoi.find(k => k.id === lenh.ketNoiId);
      if (!kn) return sai('Không tìm thấy lời mời.');
      if (nguoi.vai !== 'ban' || kn.ban.id !== nguoi.id) return sai('Chỉ người bán của lô trả lời lời mời này.');
      if (kn.trangThai !== 'cho') return sai(`Lời mời này đã được ${kn.trangThai === 'dong_y' ? 'đồng ý' : 'từ chối'} rồi.`);
      kn.trangThai = lenh.dongY ? 'dong_y' : 'tu_choi';
      kn.traLoiLuc = bayGio;
      return { ok: true, giaTri: { so, doiTuong: kn.id } };
    }
    case 'tao_don': {
      if (nguoi.vai !== 'mua') return sai('Chỉ bên mua tạo đơn.');
      const lo = so.lo.find(l => l.id === lenh.loId);
      if (!lo) return sai('Không tìm thấy lô.');
      if (!so.ketNoi.some(k => k.loId === lo.id && k.mua.id === nguoi.id && k.trangThai === 'dong_y')) return sai('Người bán chưa đồng ý kết nối với bạn cho lô này.');
      if (!(lenh.kg > 0) || lenh.kg > conBan(lo)) return sai(`Lượng phải lớn hơn 0 và không quá ${vnd(conBan(lo))} kg còn bán được của lô.`);
      if (!(lenh.gia > 0)) return sai('Nhập giá đã thỏa thuận (lớn hơn 0).');
      const don: Don = {
        ma: `HĐ-${String(++so.dem.don).padStart(4, '0')}`, loId: lo.id, tenLo: lo.ten, ban: lo.ban, mua: ben(nguoi),
        kg: lenh.kg, gia: lenh.gia, trangThai: 'cho_ban_xac_nhan', phienBan: 1, taoLuc: bayGio,
        lichSu: [{ noiDung: 'Bên mua tạo đơn', luc: bayGio, vai: 'mua' }],
      };
      so.don.unshift(don);
      return { ok: true, giaTri: { so, doiTuong: don.ma } };
    }
    case 'buoc_don':
      return buocDon(so, lenh, nguoi, bayGio, cs);
    case 'kiem_han': {
      if (nguoi.vai !== 'he_thong') return sai('Chỉ hệ thống đóng đơn quá hạn.');
      let moi = so;
      for (const d of so.don.filter(x => x.trangThai === 'cho_coc' && x.coc && bayGio > x.coc.han)) {
        const kq = buocDon(moi, { loai: 'buoc_don', ma: d.ma, buoc: 'quaHanCoc', thamSo: [] }, nguoi, bayGio, cs);
        if (kq.ok) moi = kq.giaTri.so;
      }
      return { ok: true, giaTri: { so: moi } };
    }
  }
}

function buocDon(so: SoGiaoDich, lenh: LenhBuocDon, nguoi: NguoiLam, bayGio: number, cs: ChinhSach): KetQua<DaApDung> {
  const don = so.don.find(d => d.ma === lenh.ma);
  if (!don) return sai(`Không tìm thấy đơn ${lenh.ma}.`);
  const luat = LUAT[lenh.buoc];
  if (!luat) return sai('Bước không có trong bảng luật.');
  // Đúng chủ: người bán chỉ thao tác đơn của mình, bên mua cũng vậy
  if ((nguoi.vai === 'ban' && don.ban.id !== nguoi.id) || (nguoi.vai === 'mua' && don.mua.id !== nguoi.id)) return sai(`Đơn ${don.ma} không phải đơn của bạn.`);
  if (!aiLam(luat as never, don).includes(nguoi.vai)) return sai(`Việc "${luat.ten}" của đơn ${don.ma} không phải phần của ${nguoi.vai === 'ban' ? 'người bán' : nguoi.vai === 'mua' ? 'bên mua' : 'hệ thống'}.`);
  if (!luat.tu.includes(don.trangThai)) return sai(`Đơn ${don.ma} đang ở bước "${NHAN_TRANG_THAI[don.trangThai]}", không ${luat.ten} được.`);
  const lo = so.lo.find(l => l.id === don.loId);
  const kq = (luat.lam as (nc: unknown, ...t: unknown[]) => ReturnType<typeof luat.lam>)({ don, lo, so, nguoi, bayGio, cs }, ...lenh.thamSo);
  if (typeof kq === 'object' && 'loi' in kq) return sai(kq.loi);
  const den = typeof kq === 'string' ? luat.den : kq.den;
  if (!den) return sai('Bảng luật thiếu trạng thái đích.');
  don.trangThai = den;
  don.phienBan += 1;
  don.lichSu.push({ noiDung: typeof kq === 'string' ? kq : kq.ghi, luc: bayGio, vai: nguoi.vai });
  return { ok: true, giaTri: { so, doiTuong: don.ma } };
}
