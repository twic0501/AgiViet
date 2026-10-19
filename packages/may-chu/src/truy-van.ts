// Truy vấn theo vai: mỗi người chỉ thấy dữ liệu của mình; thông tin người khác chỉ là phần công khai;
// liên lạc (số điện thoại, địa chỉ chính xác) chỉ có khi hai bên đã có đơn đặt cọc.
import {
  conBan, lienLacMo, loHienThi, NHAN_TRANG_THAI, nhom, tinhTrangLo, uyTin,
  type Don, type KetNoi, type Lo, type NguoiLam, type Nhom, type SoGiaoDich, type TinhTrangLo, type UyTin,
} from '@agiviet/nghiep-vu';

export interface HoSoCongKhai {
  id: string;
  vai: 'ban' | 'mua';
  ten: string;
  vung: string;
  daXacMinh: boolean;
  loaiBan?: 'ho' | 'htx' | 'to_hop';
  toChuc?: { ten: string; loaiHinh: string };
  thamGia: number;
  uyTin: UyTin;
}

export function hoSoCongKhai(so: SoGiaoDich, id: string): HoSoCongKhai | null {
  const n = so.nguoiDung.find(x => x.id === id);
  if (!n) return null;
  return {
    id: n.id, vai: n.vai, ten: n.toChuc?.ten ?? n.ten, vung: n.vung, daXacMinh: n.xacMinh === 'da_xac_minh', thamGia: n.taoLuc, uyTin: uyTin(so, n.id),
    ...(n.loaiBan ? { loaiBan: n.loaiBan } : {}), ...(n.toChuc ? { toChuc: { ten: n.toChuc.ten, loaiHinh: n.toChuc.loaiHinh } } : {}),
  };
}

/** Liên lạc của người kia: chỉ trả khi hai bên đã có đơn đặt cọc. */
export function lienLacCua(so: SoGiaoDich, nguoiXem: NguoiLam, kiaId: string): { ten: string; sdt: string; diaChi: string } | null {
  const [banId, muaId] = nguoiXem.vai === 'ban' ? [nguoiXem.id, kiaId] : [kiaId, nguoiXem.id];
  if (!lienLacMo(so, banId, muaId)) return null;
  const n = so.nguoiDung.find(x => x.id === kiaId);
  return n ? { ten: n.ten, sdt: n.sdt, diaChi: [n.diaChi, n.vung].filter(Boolean).join(', ') } : null;
}

export const toi = (so: SoGiaoDich, nguoi: NguoiLam) => so.nguoiDung.find(n => n.id === nguoi.id);

/* ---------------- Đơn ---------------- */

export const donCuaToi = (so: SoGiaoDich, nguoi: NguoiLam): Don[] => so.don.filter(d => (nguoi.vai === 'ban' ? d.ban.id : d.mua.id) === nguoi.id);

export function donTheoNhom(so: SoGiaoDich, nguoi: NguoiLam, bayGio: number): Record<Nhom, Don[]> {
  const kq: Record<Nhom, Don[]> = { lam: [], loi: [], cho: [], xong: [], het: [] };
  for (const d of donCuaToi(so, nguoi)) kq[nhom(d, nguoi.vai, bayGio)].push(d);
  return kq;
}

/** Đơn sắp giao theo ngày (chưa cân), gần nhất trước. */
export const lichGiao = (so: SoGiaoDich, nguoi: NguoiLam) =>
  donCuaToi(so, nguoi).filter(d => ['cho_coc', 'cho_giao', 'cho_dong_y_huy'].includes(d.trangThai)).sort((a, b) => a.ngayGiao.localeCompare(b.ngayGiao));

export const deNghiCuaDon = (so: SoGiaoDich, ma: string) => so.deNghi.filter(d => d.donMa === ma);
export const deNghiChoToi = (so: SoGiaoDich, nguoi: NguoiLam) =>
  so.deNghi.filter(d => d.trangThai === 'cho' && d.tu !== nguoi.vai && donCuaToi(so, nguoi).some(x => x.ma === d.donMa));

/* ---------------- Lô, kết nối, nhu cầu ---------------- */

export const loCuaToi = (so: SoGiaoDich, nguoi: NguoiLam, bayGio: number): (Lo & { tinhTrang: TinhTrangLo; conBanDuoc: number })[] =>
  so.lo.filter(l => l.ban.id === nguoi.id).map(l => ({ ...l, tinhTrang: tinhTrangLo(l, bayGio, so.chinhSach.hanHienThiLo), conBanDuoc: conBan(l) }));

/** Lô bên mua tìm thấy: đang hiển thị và còn bán được. */
export const loDangBan = (so: SoGiaoDich, bayGio: number) => so.lo.filter(l => loHienThi(l, bayGio, so.chinhSach.hanHienThiLo));

export const ketNoiCuaToi = (so: SoGiaoDich, nguoi: NguoiLam): KetNoi[] => so.ketNoi.filter(k => (nguoi.vai === 'ban' ? k.ban.id : k.mua.id) === nguoi.id);

/** Lời mời gửi tới tôi, đang chờ tôi trả lời. */
export const loiMoiChoToi = (so: SoGiaoDich, nguoi: NguoiLam) =>
  ketNoiCuaToi(so, nguoi).filter(k => k.trangThai === 'cho' && k.tu !== nguoi.vai);

/** Nhu cầu đang mở mà người bán có thể chào hàng: ưu tiên mặt hàng người bán đã chọn ở hồ sơ. */
export function nhuCauPhuHop(so: SoGiaoDich, nguoi: NguoiLam) {
  const mh = new Set(toi(so, nguoi)?.matHang ?? []);
  const cuaToi = new Set(so.lo.filter(l => l.ban.id === nguoi.id).map(l => l.matHang));
  return so.nhuCau.filter(n => n.trangThai === 'mo')
    .map(n => ({ ...n, hop: mh.has(n.matHang) || cuaToi.has(n.matHang), daChao: so.ketNoi.some(k => k.nhuCauId === n.id && k.ban.id === nguoi.id) }))
    .sort((a, b) => Number(b.hop) - Number(a.hop) || b.dangLuc - a.dangLuc);
}

export const tinNhanCua = (so: SoGiaoDich, ketNoiId: string) => so.tinNhan.filter(t => t.ketNoiId === ketNoiId).map(({ goc: _goc, ...t }) => t);
export const baoGiaCua = (so: SoGiaoDich, ketNoiId: string) => so.baoGia.filter(b => b.ketNoiId === ketNoiId);
export const henCua = (so: SoGiaoDich, ketNoiId: string) => so.henXem.filter(h => h.ketNoiId === ketNoiId);

/* ---------------- Việc cần làm, thông báo ---------------- */

export function viecCanLam(so: SoGiaoDich, nguoi: NguoiLam, bayGio: number) {
  const n = donTheoNhom(so, nguoi, bayGio);
  const kn = new Set(ketNoiCuaToi(so, nguoi).map(k => k.id));
  return {
    don: [...n.loi, ...n.lam],
    loiMoi: loiMoiChoToi(so, nguoi),
    baoGia: so.baoGia.filter(b => kn.has(b.ketNoiId) && b.trangThai === 'cho' && b.tu !== nguoi.vai),
    hen: so.henXem.filter(h => kn.has(h.ketNoiId) && h.trangThai === 'cho' && h.tu !== nguoi.vai),
    deNghi: deNghiChoToi(so, nguoi),
    loSapAn: nguoi.vai === 'ban' ? loCuaToi(so, nguoi, bayGio).filter(l => l.tinhTrang === 'sap_an' || (l.tinhTrang === 'da_an' && !l.an && l.conBanDuoc > 0)) : [],
  };
}

export interface ThongBao {
  luc: number;
  noiDung: string;
  /** Đường dẫn màn liên quan trong app (không có vai đứng trước). */
  man: string;
  loai: 'don' | 'ket_noi' | 'tin' | 'bao_gia' | 'hen' | 'he_thong';
}

/** Thông báo của một người: tổng hợp từ lịch sử đơn và các trao đổi, chỉ việc do người khác làm. */
export function thongBao(so: SoGiaoDich, nguoi: NguoiLam, toiDa = 50): ThongBao[] {
  const ds: ThongBao[] = [];
  for (const d of donCuaToi(so, nguoi)) for (const l of d.lichSu) if (l.vai !== nguoi.vai) ds.push({ luc: l.luc, noiDung: `${d.ma}: ${l.noiDung}`, man: `chi-tiet-don?ma=${encodeURIComponent(d.ma)}`, loai: 'don' });
  for (const k of ketNoiCuaToi(so, nguoi)) {
    const ben = nguoi.vai === 'ban' ? k.mua.ten : k.ban.ten;
    if (k.tu !== nguoi.vai) ds.push({ luc: k.guiLuc, noiDung: `${ben} ${k.tu === 'mua' ? 'muốn kết nối' : 'chào hàng'}${k.loiNhan ? `: "${k.loiNhan}"` : ''}`, man: `ket-noi?kn=${k.id}`, loai: 'ket_noi' });
    else if (k.traLoiLuc && k.trangThai !== 'rut') ds.push({ luc: k.traLoiLuc, noiDung: `${ben} ${k.trangThai === 'dong_y' ? 'đồng ý' : 'từ chối'} kết nối`, man: `chat?kn=${k.id}`, loai: 'ket_noi' });
    for (const t of so.tinNhan.filter(t => t.ketNoiId === k.id && t.vai !== nguoi.vai)) ds.push({ luc: t.luc, noiDung: `${ben}: ${t.noiDung.slice(0, 80)}`, man: `chat?kn=${k.id}`, loai: 'tin' });
    for (const b of so.baoGia.filter(b => b.ketNoiId === k.id && b.tu !== nguoi.vai)) ds.push({ luc: b.luc, noiDung: `${ben} gửi báo giá ${b.gia.toLocaleString('vi-VN')} đ/kg × ${b.kg.toLocaleString('vi-VN')} kg`, man: `bao-gia?kn=${k.id}`, loai: 'bao_gia' });
    for (const h of so.henXem.filter(h => h.ketNoiId === k.id && h.tu !== nguoi.vai)) ds.push({ luc: h.guiLuc, noiDung: `${ben} đề nghị hẹn xem lúc ${h.luc.replace('T', ' ')}`, man: `hen-xem?kn=${k.id}`, loai: 'hen' });
  }
  return ds.sort((a, b) => b.luc - a.luc).slice(0, toiDa);
}

/** Câu ngắn mô tả đơn cho thẻ danh sách. */
export const moTaDon = (d: Don) => `${d.kg.toLocaleString('vi-VN')} kg × ${d.gia.toLocaleString('vi-VN')} đ · ${NHAN_TRANG_THAI[d.trangThai]}`;
