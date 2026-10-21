// Lệnh về đơn: tạo đơn, các bước theo bảng luật, đề nghị đổi lịch / giảm lượng / đổi giá, đánh giá.
import { tien, tinhCoc, tinhPhi, vnd } from '../chinh-sach.ts';
import { LUAT, aiLam, type TenBuoc, type ThamSoBuoc } from '../don/luat.ts';
import { NHAN_TRANG_THAI } from '../don/trang-thai.ts';
import type { DeNghi, Don, NguoiLam, SoGiaoDich, Vai } from '../kieu.ts';
import { conBan, traLuong } from '../lo.ts';
import { ben, capMa, chuRong, homNay, loi, ngayHopLe, soDuong, type BangXuLy, type KetQuaLenh } from './chung.ts';

export type LenhBuocDon = { [B in TenBuoc]: { loai: 'buoc_don'; ma: string; buoc: B; thamSo: ThamSoBuoc[B] } }[TenBuoc];

export type LenhDon =
  | { loai: 'tao_don'; loId: string; kg: number; gia: number; ngayGiao: string; baoGiaId?: string }
  | LenhBuocDon
  | { loai: 'de_nghi_don'; ma: string; deNghi: DeNghi['loai']; giaTri: string; lyDo: string }
  | { loai: 'tra_loi_de_nghi'; deNghiId: string; dongY: boolean }
  | { loai: 'danh_gia'; ma: string; diem: 1 | 2 | 3 | 4 | 5; nhanXet?: string }
  | { loai: 'kiem_han' };

/** Ghi một dòng lịch sử vào đơn (mỗi thay đổi tăng phiên bản đơn). */
export function ghiDon(don: Don, noiDung: string, vai: Vai, luc: number) {
  don.phienBan += 1;
  don.lichSu.push({ noiDung, luc, vai });
}

const tenVai = (v: Vai) => (v === 'ban' ? 'Người bán' : v === 'mua' ? 'Bên mua' : v === 'van_hanh' ? 'Vận hành' : 'Hệ thống');
const laChu = (don: Don, nguoi: NguoiLam) => (nguoi.vai === 'ban' && don.ban.id === nguoi.id) || (nguoi.vai === 'mua' && don.mua.id === nguoi.id);

/** Tính lại cọc và phí theo giá trị mới (chỉ khi chưa cọc). */
function tinhLaiCoc(don: Don, so: SoGiaoDich) {
  if (!don.coc || don.daCoc) return;
  const giaTri = tien(don.kg, don.gia);
  don.coc.so = tinhCoc(giaTri, so.chinhSach);
  don.coc.phi = tinhPhi(giaTri, don.coc.loaiPhi === 'moi_quen', so.chinhSach);
}

export function buocDon(l: LenhBuocDon, so: SoGiaoDich, nguoi: NguoiLam, bayGio: number): KetQuaLenh {
  const don = so.don.find(d => d.ma === l.ma);
  if (!don) return loi(`Không tìm thấy đơn ${l.ma}.`);
  const luat = LUAT[l.buoc];
  if (!luat) return loi('Bước không có trong bảng luật.');
  if ((nguoi.vai === 'ban' || nguoi.vai === 'mua') && !laChu(don, nguoi)) return loi(`Đơn ${don.ma} không phải đơn của bạn.`);
  if (!aiLam(luat as never, don).includes(nguoi.vai)) return loi(`Việc "${luat.ten}" của đơn ${don.ma} không phải phần của ${tenVai(nguoi.vai).toLowerCase()}.`);
  if (!luat.tu.includes(don.trangThai)) return loi(`Đơn ${don.ma} đang ở bước "${NHAN_TRANG_THAI[don.trangThai]}", không ${luat.ten} được.`);
  if (so.deNghi.some(d => d.donMa === don.ma && d.trangThai === 'cho') && ['nhapKetQua', 'datCoc', 'xacNhanDon'].includes(l.buoc)) return loi('Đơn đang có đề nghị thay đổi chờ trả lời. Trả lời đề nghị trước.');
  const lo = so.lo.find(x => x.id === don.loId);
  const kq = (luat.lam as (nc: unknown, ...t: unknown[]) => ReturnType<typeof luat.lam>)({ don, lo, so, nguoi, bayGio, cs: so.chinhSach }, ...l.thamSo);
  if (typeof kq === 'object' && 'loi' in kq) return kq;
  const den = typeof kq === 'string' ? luat.den : kq.den;
  if (!den) return loi('Bảng luật thiếu trạng thái đích.');
  don.trangThai = den;
  ghiDon(don, typeof kq === 'string' ? kq : kq.ghi, nguoi.vai, bayGio);
  // Đơn đóng: khoản ứng trước (nếu có) được thu hồi từ tiền hàng; đề nghị đang chờ hết hiệu lực
  if (['da_nhan_tien', 'da_huy', 'qua_han', 'ban_tu_choi'].includes(den)) {
    for (const u of so.ungTien) if (u.donMa === don.ma && u.trangThai === 'da_giai_ngan') u.trangThai = 'da_thu_hoi';
    for (const u of so.ungTien) if (u.donMa === don.ma && u.trangThai === 'cho_duyet') u.trangThai = 'tu_choi';
    for (const d of so.deNghi) if (d.donMa === don.ma && d.trangThai === 'cho') d.trangThai = 'tu_choi';
  }
  return { ma: don.ma };
}

export const XU_LY_DON: BangXuLy<LenhDon> = {
  tao_don(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua tạo đơn.');
    const lo = so.lo.find(x => x.id === l.loId);
    if (!lo) return loi('Không tìm thấy lô.');
    const kn = so.ketNoi.find(k => k.loId === lo.id && k.mua.id === nguoi.id && k.trangThai === 'dong_y');
    if (!kn) return loi('Người bán chưa đồng ý kết nối với bạn cho lô này.');
    let { kg, gia, ngayGiao } = l;
    if (l.baoGiaId) {
      const bg = so.baoGia.find(b => b.id === l.baoGiaId && b.ketNoiId === kn.id);
      if (!bg || bg.trangThai !== 'dong_y') return loi('Báo giá này chưa được hai bên chốt.');
      if (so.don.some(d => d.baoGiaId === bg.id)) return loi('Báo giá này đã dùng để tạo đơn.');
      ({ kg, gia, ngayGiao } = bg);
    }
    if (!soDuong(kg) || kg > conBan(lo)) return loi(`Lượng phải lớn hơn 0 và không quá ${vnd(conBan(lo))} kg còn bán được của lô.`);
    if (!soDuong(gia)) return loi('Nhập giá đã thỏa thuận (lớn hơn 0).');
    if (!ngayHopLe(ngayGiao) || ngayGiao < homNay(bayGio)) return loi('Chọn ngày giao từ hôm nay trở đi.');
    const don: Don = {
      ma: capMa(so, 'HĐ', 4), loId: lo.id, tenLo: lo.ten, matHang: lo.matHang, ban: lo.ban, mua: ben(nguoi), kg, gia, ngayGiao, ketNoiId: kn.id,
      ...(l.baoGiaId ? { baoGiaId: l.baoGiaId } : {}),
      trangThai: 'cho_ban_xac_nhan', phienBan: 1, taoLuc: bayGio,
      lichSu: [{ noiDung: `Bên mua tạo đơn${l.baoGiaId ? ` theo báo giá ${l.baoGiaId}` : ''}: ${vnd(kg)} kg × ${vnd(gia)} đ, giao ${ngayGiao.split('-').reverse().join('/')}`, luc: bayGio, vai: 'mua' }],
    };
    so.don.unshift(don);
    return { ma: don.ma };
  },
  buoc_don: (l, { so, nguoi, bayGio }) => buocDon(l, so, nguoi, bayGio),
  de_nghi_don(l, { so, nguoi, bayGio }) {
    const don = so.don.find(d => d.ma === l.ma);
    if (!don || !laChu(don, nguoi)) return loi(`Không tìm thấy đơn ${l.ma} của bạn.`);
    if (so.deNghi.some(d => d.donMa === don.ma && d.trangThai === 'cho')) return loi('Đơn đã có một đề nghị chờ trả lời.');
    if (chuRong(l.lyDo)) return loi('Ghi lý do để bên kia hiểu.');
    if (l.deNghi === 'doi_lich') {
      if (!['cho_coc', 'cho_giao'].includes(don.trangThai)) return loi('Chỉ đổi lịch được trước khi cân.');
      if (!ngayHopLe(l.giaTri) || l.giaTri < homNay(bayGio)) return loi('Chọn ngày giao mới từ hôm nay trở đi.');
      if (l.giaTri === don.ngayGiao) return loi('Ngày mới trùng ngày đang hẹn.');
    } else if (l.deNghi === 'giam_luong') {
      if (!['cho_coc', 'cho_giao'].includes(don.trangThai)) return loi('Chỉ giảm lượng được sau khi xác nhận đơn và trước khi cân.');
      const kg = Number(l.giaTri);
      if (!soDuong(kg) || kg >= don.kg) return loi(`Lượng mới phải lớn hơn 0 và nhỏ hơn ${vnd(don.kg)} kg.`);
    } else {
      if (!['cho_ban_xac_nhan', 'cho_coc'].includes(don.trangThai)) return loi('Chỉ đổi giá được trước khi đặt cọc.');
      const gia = Number(l.giaTri);
      if (!soDuong(gia) || gia === don.gia) return loi('Giá mới phải lớn hơn 0 và khác giá cũ.');
    }
    const id = capMa(so, 'DN');
    so.deNghi.push({ id, donMa: don.ma, tu: nguoi.vai as 'ban' | 'mua', loai: l.deNghi, giaTri: l.giaTri, lyDo: l.lyDo.trim(), trangThai: 'cho', luc: bayGio });
    const moTa = l.deNghi === 'doi_lich' ? `đổi ngày giao sang ${l.giaTri.split('-').reverse().join('/')}` : l.deNghi === 'giam_luong' ? `giảm còn ${vnd(Number(l.giaTri))} kg` : `đổi giá thành ${vnd(Number(l.giaTri))} đ/kg`;
    ghiDon(don, `${tenVai(nguoi.vai)} đề nghị ${moTa}: ${l.lyDo.trim()}`, nguoi.vai, bayGio);
    return { ma: id };
  },
  tra_loi_de_nghi(l, { so, nguoi, bayGio }) {
    const dn = so.deNghi.find(d => d.id === l.deNghiId);
    if (!dn) return loi('Không tìm thấy đề nghị.');
    const don = so.don.find(d => d.ma === dn.donMa)!;
    if (!laChu(don, nguoi)) return loi('Đề nghị này không thuộc đơn của bạn.');
    if (dn.tu === nguoi.vai) return loi('Bên kia mới trả lời được đề nghị của bạn.');
    if (dn.trangThai !== 'cho') return loi('Đề nghị này đã được trả lời.');
    dn.trangThai = l.dongY ? 'dong_y' : 'tu_choi';
    if (l.dongY) {
      if (dn.loai === 'doi_lich') don.ngayGiao = dn.giaTri;
      else if (dn.loai === 'giam_luong') {
        const moi = Number(dn.giaTri);
        traLuong(so.lo.find(x => x.id === don.loId), don.kg - moi);
        don.kg = moi;
        tinhLaiCoc(don, so);
      } else { don.gia = Number(dn.giaTri); tinhLaiCoc(don, so); }
    }
    ghiDon(don, `${tenVai(nguoi.vai)} ${l.dongY ? 'đồng ý' : 'không đồng ý'} đề nghị ${dn.id}`, nguoi.vai, bayGio);
    return { ma: dn.id };
  },
  danh_gia(l, { so, nguoi, bayGio }) {
    const don = so.don.find(d => d.ma === l.ma);
    if (!don || !laChu(don, nguoi)) return loi(`Không tìm thấy đơn ${l.ma} của bạn.`);
    if (don.trangThai !== 'da_nhan_tien') return loi('Đánh giá được sau khi đơn hoàn tất.');
    if (![1, 2, 3, 4, 5].includes(l.diem)) return loi('Chọn từ 1 đến 5 sao.');
    if (so.danhGia.some(d => d.donMa === don.ma && d.tu.id === nguoi.id)) return loi('Bạn đã đánh giá đơn này.');
    const id = capMa(so, 'DG');
    so.danhGia.push({ id, donMa: don.ma, tu: ben(nguoi), cho: nguoi.vai === 'ban' ? don.mua : don.ban, diem: l.diem, nhanXet: l.nhanXet?.trim() ?? '', luc: bayGio });
    return { ma: id };
  },
  kiem_han(_l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'he_thong') return loi('Chỉ hệ thống đóng đơn quá hạn.');
    for (const d of so.don.filter(x => x.trangThai === 'cho_coc' && x.coc && bayGio > x.coc.han)) {
      buocDon({ loai: 'buoc_don', ma: d.ma, buoc: 'quaHanCoc', thamSo: [] }, so, nguoi, bayGio);
    }
    return {};
  },
};
