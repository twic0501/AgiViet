// Giả lập bên mua (giai đoạn 1, khi chưa có app Thu mua): ba bên mua mẫu; gợi ý việc bên mua làm tiếp được với người bán này.
// Mỗi gợi ý là một lệnh thật, chạy qua dịch vụ và nghiệp vụ như app thật.
import { conBan, dangBanGap, laKemLoai, ngayCua, type Lenh, type NguoiLam, type SoGiaoDich } from '@agiviet/nghiep-vu';
import type { DichVu } from './dich-vu.ts';
import { loDangBan } from './truy-van.ts';

export interface NguoiMuaMau {
  nguoi: NguoiLam;
  nguoiLienHe: string;
  sdt: string;
  vung: string;
  diaChi: string;
  loaiHinh: string;
  maSoThue: string;
}

export const NGUOI_MUA_MAU: NguoiMuaMau[] = [
  { nguoi: { vai: 'mua', id: 'mua-dong-xanh', ten: 'Nhà máy sấy Đồng Xanh' }, nguoiLienHe: 'Anh Trí', sdt: '0277386210', vung: 'Sa Đéc, Đồng Tháp', diaChi: 'Lô C2, KCN Sa Đéc', loaiHinh: 'Nhà máy chế biến', maSoThue: '1401234567' },
  { nguoi: { vai: 'mua', id: 'mua-mien-tay', ten: 'Công ty Trái cây Miền Tây' }, nguoiLienHe: 'Chị Hạnh', sdt: '0292386222', vung: 'Ninh Kiều, Cần Thơ', diaChi: '12 Trần Hưng Đạo', loaiHinh: 'Doanh nghiệp xuất khẩu', maSoThue: '1801234568' },
  { nguoi: { vai: 'mua', id: 'mua-ut-hien', ten: 'Vựa Út Hiền' }, nguoiLienHe: 'Cô Út Hiền', sdt: '0939123456', vung: 'Cao Lãnh, Đồng Tháp', diaChi: 'Chợ đầu mối Cao Lãnh', loaiHinh: 'Vựa trái cây', maSoThue: '1401234569' },
];
/** Hai người bán mẫu khác (ngoài chị Năm) để app mua có nhiều nguồn. */
export const NGUOI_BAN_KHAC = [
  { nguoi: { vai: 'ban', id: 'ban-tu-ben', ten: 'Anh Tư Bền' } as NguoiLam, sdt: '0907222333', vung: 'Vĩnh Châu, Sóc Trăng', diaChi: 'Ấp Biển Trên, Vĩnh Hải', matHang: ['tom-the-chan-trang'] },
  { nguoi: { vai: 'ban', id: 'ban-hai-thu', ten: 'Cô Hai Thu' } as NguoiLam, sdt: '0918555444', vung: 'Cái Bè, Tiền Giang', diaChi: 'Ấp Hòa Hảo, Hòa Khánh', matHang: ['xoai-cat-chu'] },
];
/** Đối tác bao tiêu mẫu: AgiViet ký thỏa thuận khung, cam kết giá sàn thu mua hàng loại 3, hàng dạt (người nhận cuối cùng). */
export const DOI_TAC_BAO_TIEU_MAU: NguoiMuaMau = { nguoi: { vai: 'mua', id: 'mua-mekong', ten: 'Nhà máy chế biến Mekong' }, nguoiLienHe: 'Anh Khoa', sdt: '0292386333', vung: 'Thốt Nốt, Cần Thơ', diaChi: 'Lô 8, KCN Thốt Nốt', loaiHinh: 'Nhà máy chế biến (nước ép, sấy, cấp đông)', maSoThue: '1801234570' };
export const GIA_SAN_BAO_TIEU: Record<string, number> = { 'xoai-cat-chu': 6000, 'thanh-long-ruot-do': 4000, 'chanh-day': 5000, 'tom-the-chan-trang': 55000 };
export const VAN_HANH_MAU: NguoiLam = { vai: 'van_hanh', id: 'van-hanh', ten: 'Đội vận hành AgiViet' };

/** Đăng ký các bên mua mẫu (nếu chưa có) và cho họ đã xác minh. */
export function damBaoNguoiMuaMau(dv: DichVu) {
  for (const m of NGUOI_MUA_MAU) {
    if (dv.doc().nguoiDung.some(n => n.id === m.nguoi.id)) continue;
    dv.thucHien(m.nguoi, { loai: 'dang_ky', vai: 'mua', ten: m.nguoiLienHe, sdt: m.sdt, vung: m.vung, toChuc: { ten: m.nguoi.ten, maSoThue: m.maSoThue, loaiHinh: m.loaiHinh } });
    dv.thucHien(m.nguoi, { loai: 'cap_nhat_ho_so', diaChi: m.diaChi });
    dv.thucHien(m.nguoi, { loai: 'gui_xac_minh', giayTo: 'giay-phep-kinh-doanh.pdf' });
    dv.thucHien(VAN_HANH_MAU, { loai: 'duyet_xac_minh', nguoiDungId: m.nguoi.id, dongY: true });
  }
}

const NGUOI_BAN_MAU_GL: NguoiLam = { vai: 'ban', id: 'ban-nam', ten: 'Chị Năm' };   // trùng NGUOI_BAN_MAU ở kich-ban.ts (tránh nạp vòng)

export interface ViecGiaLap {
  nhom: 'ket_noi' | 'trao_doi' | 'don' | 'tien' | 'khac';
  nhan: string;
  nguoi: NguoiLam;
  lenh: Lenh;
}

/** Việc các bên mua mẫu làm tiếp được với người bán này, theo trạng thái hiện tại. */
export function viecGiaLap(so: SoGiaoDich, banId: string, bayGio: number): ViecGiaLap[] {
  const ds: ViecGiaLap[] = [];
  const ngay = (n: number) => ngayCua(bayGio + n * 24 * 3600_000);
  const muaCua = (id: string) => NGUOI_MUA_MAU.find(m => m.nguoi.id === id)?.nguoi;
  for (const m of NGUOI_MUA_MAU) {
    const t = m.nguoi.ten;
    for (const lo of loDangBan(so, bayGio).filter(l => l.ban.id === banId)) {
      const kn = so.ketNoi.find(k => k.loId === lo.id && k.mua.id === m.nguoi.id && ['cho', 'dong_y'].includes(k.trangThai));
      if (!kn) ds.push({ nhom: 'ket_noi', nhan: `${t} gửi lời mời kết nối lô ${lo.ten}`, nguoi: m.nguoi, lenh: { loai: 'gui_loi_moi', loId: lo.id, loiNhan: 'Bên em cần hàng đều cho dây chuyền, chị cho xem thêm ảnh lô nha.' } });
      else if (kn.trangThai === 'dong_y' && conBan(lo) > 0 && !so.don.some(d => d.ketNoiId === kn.id && !['da_nhan_tien', 'da_huy', 'qua_han', 'ban_tu_choi'].includes(d.trangThai))) {
        const kg = Math.min(conBan(lo), Math.max(100, Math.round(conBan(lo) * 0.4 / 100) * 100));
        const gia = lo.gia ?? 15000, giaHaCap = Math.round(gia * 0.6 / 100) * 100;
        ds.push({ nhom: 'don', nhan: `${t} tạo đơn ${kg.toLocaleString('vi-VN')} kg lô ${lo.ten}`, nguoi: m.nguoi, lenh: { loai: 'tao_don', loId: lo.id, kg, gia, ngayGiao: ngay(3) } });
        ds.push({ nhom: 'don', nhan: `${t} tạo đơn ${kg.toLocaleString('vi-VN')} kg lô ${lo.ten}, có giá hạ cấp ${giaHaCap.toLocaleString('vi-VN')} đ/kg, giao tại kho`, nguoi: m.nguoi, lenh: { loai: 'tao_don', loId: lo.id, kg, gia, ngayGiao: ngay(3), giaHaCap, noiGiao: 'tai_kho' } as Lenh });
        ds.push({ nhom: 'don', nhan: `${t} tạo đơn giá thấp bất thường (${Math.round(gia * 0.5 / 100) * 100} đ/kg) lô ${lo.ten}`, nguoi: m.nguoi, lenh: { loai: 'tao_don', loId: lo.id, kg, gia: Math.round(gia * 0.5 / 100) * 100, ngayGiao: ngay(3) } });
      }
    }
  }
  for (const k of so.ketNoi.filter(k => k.ban.id === banId)) {
    const mua = muaCua(k.mua.id); if (!mua) continue;
    if (k.trangThai === 'cho' && k.tu === 'ban') {
      ds.push({ nhom: 'ket_noi', nhan: `${mua.ten} đồng ý lời chào hàng`, nguoi: mua, lenh: { loai: 'tra_loi_ket_noi', ketNoiId: k.id, dongY: true } });
      ds.push({ nhom: 'ket_noi', nhan: `${mua.ten} từ chối lời chào hàng`, nguoi: mua, lenh: { loai: 'tra_loi_ket_noi', ketNoiId: k.id, dongY: false } });
    }
    if (k.trangThai !== 'dong_y') continue;
    ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} nhắn tin (có ghi số điện thoại)`, nguoi: mua, lenh: { loai: 'gui_tin', ketNoiId: k.id, noiDung: `Chị gọi em số ${NGUOI_MUA_MAU.find(x => x.nguoi.id === mua.id)!.sdt} hoặc Zalo cho nhanh nha.` } });
    ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} nhắn hỏi chất lượng`, nguoi: mua, lenh: { loai: 'gui_tin', ketNoiId: k.id, noiDung: 'Hàng loại 1 chiếm khoảng bao nhiêu phần trăm vậy chị?' } });
    const lo = so.lo.find(l => l.id === k.loId);
    if (lo && !so.baoGia.some(b => b.ketNoiId === k.id && b.trangThai === 'cho' && b.tu === 'mua'))
      ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} gửi báo giá lô ${lo.ten}`, nguoi: mua, lenh: { loai: 'gui_bao_gia', ketNoiId: k.id, gia: Math.round((lo.gia ?? 16000) * 0.95 / 100) * 100, kg: Math.min(conBan(lo), 1000) || 100, ngayGiao: ngay(5), ghiChu: 'Giao tại vườn, bên em lo xe.' } });
    for (const b of so.baoGia.filter(b => b.ketNoiId === k.id && b.trangThai === 'cho' && b.tu === 'ban'))
      ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} đồng ý báo giá ${b.gia.toLocaleString('vi-VN')} đ/kg`, nguoi: mua, lenh: { loai: 'tra_loi_bao_gia', baoGiaId: b.id, dongY: true } });
    for (const b of so.baoGia.filter(b => b.ketNoiId === k.id && b.trangThai === 'dong_y' && !so.don.some(d => d.baoGiaId === b.id)))
      ds.push({ nhom: 'don', nhan: `${mua.ten} tạo đơn theo báo giá ${b.id}`, nguoi: mua, lenh: { loai: 'tao_don', loId: k.loId!, kg: 0, gia: 0, ngayGiao: '', baoGiaId: b.id } });
    if (!so.henXem.some(h => h.ketNoiId === k.id && h.trangThai === 'cho'))
      ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} đề nghị hẹn xem vườn`, nguoi: mua, lenh: { loai: 'de_nghi_hen', ketNoiId: k.id, luc: `${ngay(2)}T08:30`, ghiChu: 'Bên em ghé xem trái trên cây.' } });
    for (const h of so.henXem.filter(h => h.ketNoiId === k.id && h.trangThai === 'cho' && h.tu === 'ban'))
      ds.push({ nhom: 'trao_doi', nhan: `${mua.ten} đồng ý giờ hẹn`, nguoi: mua, lenh: { loai: 'tra_loi_hen', henId: h.id, dongY: true } });
  }
  for (const d of so.don.filter(d => d.ban.id === banId)) {
    const mua = muaCua(d.mua.id); if (!mua) continue;
    const b = (buoc: string, nhan: string, thamSo: unknown[] = [], nhom: ViecGiaLap['nhom'] = 'don') => ds.push({ nhom, nhan: `${mua.ten} · ${d.ma}: ${nhan}`, nguoi: mua, lenh: { loai: 'buoc_don', ma: d.ma, buoc, thamSo } as Lenh });
    const dn = so.deNghi.find(x => x.donMa === d.ma && x.trangThai === 'cho');
    if (dn && dn.tu === 'ban') {
      ds.push({ nhom: 'don', nhan: `${mua.ten} · ${d.ma}: đồng ý đề nghị ${dn.id}`, nguoi: mua, lenh: { loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: true } });
      ds.push({ nhom: 'don', nhan: `${mua.ten} · ${d.ma}: không đồng ý đề nghị ${dn.id}`, nguoi: mua, lenh: { loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: false } });
    }
    switch (d.trangThai) {
      case 'cho_ban_xac_nhan': b('rutDon', 'rút đơn'); break;
      case 'cho_coc': b('datCoc', `đặt cọc ${d.coc!.so.toLocaleString('vi-VN')} đ`, [], 'tien'); b('huyTruocCoc', 'hủy trước khi cọc', ['Đổi kế hoạch sản xuất']); break;
      case 'cho_giao':
        // Đơn đang có đề nghị chờ trả lời thì chưa nhập cân được (nghiệp vụ chặn): chỉ gợi ý khi không có
        if (!dn) {
          b('nhapKetQua', `cân đủ ${d.kg.toLocaleString('vi-VN')} kg`, [d.kg, 0]);
          b('nhapKetQua', `cân nhận ${Math.round(d.kg * 0.95).toLocaleString('vi-VN')} kg, trả lại 5%`, [Math.round(d.kg * 0.95), d.kg - Math.round(d.kg * 0.95)]);
          b('nhapKetQua', 'cân đạt 88%, trả lại 12% (kèm ảnh hàng không đạt)', [Math.round(d.kg * 0.88), d.kg - Math.round(d.kg * 0.88), 0, ['anh-hang-khong-dat.jpg']]);
          if (d.hopDong?.giaHaCap) b('nhapKetQua', 'cân 3 phần: đạt 85%, hạ cấp 12%, trả lại 3%', [Math.round(d.kg * 0.85), Math.round(d.kg * 0.03), d.kg - Math.round(d.kg * 0.85) - Math.round(d.kg * 0.03)]);
          ds.push({ nhom: 'don', nhan: `${mua.ten} · ${d.ma}: đề nghị dời ngày giao 2 ngày`, nguoi: mua, lenh: { loai: 'de_nghi_don', ma: d.ma, deNghi: 'doi_lich', giaTri: (() => { const x = new Date(d.ngayGiao + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 2); return x.toISOString().slice(0, 10); })(), lyDo: 'Xe bên em kẹt lịch' } });
          b('yeuCauHuy', 'xin hủy đơn', ['Nhà máy ngưng một dây chuyền']);
        }
        break;
      case 'cho_dong_y_huy': if (d.huy?.ben === 'ban') { b('dongYHuy', 'đồng ý hủy'); b('tuChoiHuy', 'không đồng ý hủy'); } break;
      case 'da_chot':
        b('chuyenTienDamBao', `chuyển ${d.conPhaiTra!.toLocaleString('vi-VN')} đ vào tài khoản đảm bảo`, [d.conPhaiTra], 'tien');
        b('baoDaTra', `ghi đã trả trực tiếp đủ ${d.conPhaiTra!.toLocaleString('vi-VN')} đ`, [d.conPhaiTra], 'tien');
        b('baoDaTra', `ghi đã trả trực tiếp một nửa`, [Math.round(d.conPhaiTra! / 2)], 'tien');
        break;
      case 'chua_thay_tien': b('guiChungTu', 'gửi ủy nhiệm chi', [`Ủy nhiệm chi ${(d.tra?.so ?? 0).toLocaleString('vi-VN')} đ`], 'tien'); b('ghiDoiSoat', 'ghi vào đối soát', ['Bên em đã chuyển lúc 9 giờ, nhờ chị kiểm lại'], 'tien'); break;
      case 'da_nhan_tien':
        if (!so.danhGia.some(g => g.donMa === d.ma && g.tu.id === mua.id)) ds.push({ nhom: 'khac', nhan: `${mua.ten} · ${d.ma}: đánh giá 5 sao`, nguoi: mua, lenh: { loai: 'danh_gia', ma: d.ma, diem: 5, nhanXet: 'Hàng đúng loại, giao đúng hẹn.' } });
        break;
    }
  }
  return ds;
}

/** Bên mua đăng một tin cần mua mẫu (để người bán thử chào hàng). */
export function lenhNhuCauMau(so: SoGiaoDich, bayGio: number, i = 0): { nguoi: NguoiLam; lenh: Lenh } {
  const m = NGUOI_MUA_MAU[i % NGUOI_MUA_MAU.length]!;
  const mau = [
    { matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu loại 2 cho sấy dẻo', kg: 5000, giaTran: 12000 },
    { matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ loại 1 xuất khẩu', kg: 3000, giaTran: 22000 },
    { matHang: 'tom-the-chan-trang', ten: 'Tôm thẻ 40 con/kg', kg: 1000, giaTran: 120000 },
  ][i % 3]!;
  void so;
  return { nguoi: m.nguoi, lenh: { loai: 'dang_nhu_cau', ...mau, tu: ngayCua(bayGio + 2 * 864e5), den: ngayCua(bayGio + 20 * 864e5), ghiChu: 'Ưu tiên hàng có nhật ký canh tác.' } };
}

/** Việc người bán (chị Năm và các người bán mẫu) làm tiếp được với bên mua này, theo trạng thái hiện tại. Dùng cho app mua. */
export function viecGiaLapBan(so: SoGiaoDich, muaId: string, bayGio: number): ViecGiaLap[] {
  const ds: ViecGiaLap[] = [];
  const ngay = (n: number) => ngayCua(bayGio + n * 24 * 3600_000);
  const ban = (b: { id: string; ten: string }): NguoiLam => ({ vai: 'ban', id: b.id, ten: b.ten });
  const coTaiKhoan = (id: string) => so.nguoiDung.some(n => n.id === id && n.vai === 'ban');
  for (const k of so.ketNoi.filter(x => x.mua.id === muaId)) {
    const nb = ban(k.ban);
    if (k.trangThai === 'cho' && k.tu === 'mua') {
      ds.push({ nhom: 'ket_noi', nhan: `${nb.ten} đồng ý kết nối`, nguoi: nb, lenh: { loai: 'tra_loi_ket_noi', ketNoiId: k.id, dongY: true } });
      ds.push({ nhom: 'ket_noi', nhan: `${nb.ten} từ chối kết nối`, nguoi: nb, lenh: { loai: 'tra_loi_ket_noi', ketNoiId: k.id, dongY: false } });
    }
    if (k.trangThai !== 'dong_y') continue;
    ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} nhắn tin (có ghi số điện thoại)`, nguoi: nb, lenh: { loai: 'gui_tin', ketNoiId: k.id, noiDung: `Anh chị gọi em số ${so.nguoiDung.find(n => n.id === nb.id)?.sdt ?? '0918 000 000'} hoặc Zalo cho nhanh nha.` } });
    ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} nhắn báo tình hình hàng`, nguoi: nb, lenh: { loai: 'gui_tin', ketNoiId: k.id, noiDung: 'Hàng đẹp, tuần này hái được. Anh chị chốt sớm em giữ hàng.' } });
    const lo = so.lo.find(l => l.id === k.loId);
    if (lo && conBan(lo) > 0 && !so.baoGia.some(b => b.ketNoiId === k.id && b.trangThai === 'cho' && b.tu === 'ban'))
      ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} gửi báo giá lô ${lo.ten}`, nguoi: nb, lenh: { loai: 'gui_bao_gia', ketNoiId: k.id, gia: lo.gia ?? 20000, kg: Math.min(conBan(lo), 1000), ngayGiao: ngay(4), ghiChu: 'Giao tại vườn, cân tại chỗ.' } });
    for (const b of so.baoGia.filter(x => x.ketNoiId === k.id && x.trangThai === 'cho' && x.tu === 'mua')) {
      ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} đồng ý báo giá ${b.gia.toLocaleString('vi-VN')} đ/kg`, nguoi: nb, lenh: { loai: 'tra_loi_bao_gia', baoGiaId: b.id, dongY: true } });
      ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} không đồng ý báo giá ${b.gia.toLocaleString('vi-VN')} đ/kg`, nguoi: nb, lenh: { loai: 'tra_loi_bao_gia', baoGiaId: b.id, dongY: false } });
    }
    for (const h of so.henXem.filter(x => x.ketNoiId === k.id && x.trangThai === 'cho' && x.tu === 'mua'))
      ds.push({ nhom: 'trao_doi', nhan: `${nb.ten} đồng ý giờ hẹn xem vườn`, nguoi: nb, lenh: { loai: 'tra_loi_hen', henId: h.id, dongY: true } });
  }
  // Tin cần mua đang mở: người bán mẫu có lô cùng mặt hàng thì chào hàng; chưa ai có thì chị Năm đăng lô mặt hàng đó
  const banMau = [NGUOI_BAN_MAU_GL, ...NGUOI_BAN_KHAC.map(k => k.nguoi)].filter(n => coTaiKhoan(n.id));
  for (const n of so.nhuCau.filter(x => x.mua.id === muaId && x.trangThai === 'mo')) {
    let coLo = false;
    for (const nb of banMau) {
      const lo = so.lo.find(l => l.ban.id === nb.id && l.matHang === n.matHang && conBan(l) > 0 && !l.an);
      if (!lo) continue;
      coLo = true;
      if (so.ketNoi.some(k => k.ban.id === nb.id && k.mua.id === muaId && (k.nhuCauId === n.id || (k.loId === lo.id && ['cho', 'dong_y'].includes(k.trangThai))))) continue;
      ds.push({ nhom: 'ket_noi', nhan: `${nb.ten} chào hàng lô ${lo.ten} vào tin "${n.ten}"`, nguoi: nb, lenh: { loai: 'chao_hang', nhuCauId: n.id, loId: lo.id, loiNhan: 'Bên em có hàng đúng loại, giao theo đợt được.' } });
    }
    if (!coLo && banMau[0]) ds.push({ nhom: 'khac', nhan: `${banMau[0].ten} đăng lô ${n.ten} (để chào hàng)`, nguoi: banMau[0], lenh: { loai: 'dang_lo', matHang: n.matHang, ten: n.ten, kg: n.kg, coSo: 'uoc_tinh', gia: n.giaTran ?? null, moTa: 'Đăng để chào hàng vào tin cần mua.' } as Lenh });
  }
  for (const d of so.don.filter(x => x.mua.id === muaId)) {
    const nb = ban(d.ban);
    const b = (buoc: string, nhan: string, thamSo: unknown[] = [], nhom: ViecGiaLap['nhom'] = 'don') => ds.push({ nhom, nhan: `${nb.ten} · ${d.ma}: ${nhan}`, nguoi: nb, lenh: { loai: 'buoc_don', ma: d.ma, buoc, thamSo } as Lenh });
    const dn = so.deNghi.find(x => x.donMa === d.ma && x.trangThai === 'cho');
    if (dn && dn.tu === 'mua') {
      ds.push({ nhom: 'don', nhan: `${nb.ten} · ${d.ma}: đồng ý đề nghị ${dn.id}`, nguoi: nb, lenh: { loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: true } });
      ds.push({ nhom: 'don', nhan: `${nb.ten} · ${d.ma}: không đồng ý đề nghị ${dn.id}`, nguoi: nb, lenh: { loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: false } });
    }
    switch (d.trangThai) {
      case 'cho_ban_xac_nhan':
        if (!dn) b('xacNhanDon', d.hopDong?.giaBatThuong ? 'ký hợp đồng cọc, xác nhận giá bất thường' : 'xác nhận đơn (ký hợp đồng cọc)', d.hopDong?.giaBatThuong ? [true] : []);
        b('tuChoiDon', 'từ chối đơn', ['Hết hàng']); break;
      case 'cho_coc': b('huyTruocCoc', 'hủy trước khi cọc', ['Mưa bão, hàng hư']); break;
      case 'cho_giao':
        if (!dn) {
          ds.push({ nhom: 'don', nhan: `${nb.ten} · ${d.ma}: đề nghị giảm còn ${Math.round(d.kg * 0.8).toLocaleString('vi-VN')} kg`, nguoi: nb, lenh: { loai: 'de_nghi_don', ma: d.ma, deNghi: 'giam_luong', giaTri: String(Math.round(d.kg * 0.8)), lyDo: 'Mưa bão rụng trái' } });
          b('yeuCauHuy', 'xin hủy đơn', ['Hàng bị sâu, không đạt loại']);
        }
        break;
      case 'cho_dong_y_huy': if (d.huy?.ben === 'mua') { b('dongYHuy', 'đồng ý hủy'); b('tuChoiHuy', 'không đồng ý hủy'); } break;
      case 'cho_ban_xn_kq': b('ketQuaDung', 'xác nhận số cân đúng'); b('ketQuaSai', 'báo số cân không đúng'); break;
      case 'bao_da_tra': if ((d.tra?.so ?? 0) >= (d.conPhaiTra ?? 0)) b('tienDu', 'xác nhận đã nhận đủ', [], 'tien'); else b('nhanMotPhan', 'xác nhận nhận một phần', [], 'tien'); b('tienChua', 'báo chưa thấy tiền', [], 'tien'); break;
      case 'chua_thay_tien': b('tienDu', 'đã thấy tiền, đóng đối soát', [], 'tien'); b('ghiDoiSoat', 'ghi vào đối soát', ['Đã xem sổ Agribank, chưa có khoản nào'], 'tien'); break;
      case 'da_nhan_tien':
        if (!so.danhGia.some(g => g.donMa === d.ma && g.tu.id === nb.id)) ds.push({ nhom: 'khac', nhan: `${nb.ten} · ${d.ma}: đánh giá 5 sao`, nguoi: nb, lenh: { loai: 'danh_gia', ma: d.ma, diem: 5, nhanXet: 'Trả tiền nhanh, cân sòng phẳng.' } });
        break;
    }
    if (d.ketQuaCan?.nguon === 'ben_kia_xac_nhan' && d.ketQuaCan.tuChoi && !d.traVeLoId)
      ds.push({ nhom: 'khac', nhan: `${nb.ten} · ${d.ma}: đưa ${d.ketQuaCan.tuChoi.toLocaleString('vi-VN')} kg bị trả lại thành lô bán gấp`, nguoi: nb, lenh: { loai: 'tra_hang_ve_lo', ma: d.ma } });
  }
  // Người bán mẫu bật bán gấp lô kém loại (để bên mua nhận hàng kém loại thấy thông báo)
  for (const lo of so.lo.filter(l => banMau.some(n => n.id === l.ban.id) && laKemLoai(l) && conBan(l) > 0 && !l.an && !dangBanGap(l, bayGio)))
    ds.push({ nhom: 'khac', nhan: `${lo.ban.ten} bật bán gấp lô ${lo.ten}`, nguoi: ban(lo.ban), lenh: { loai: 'bat_ban_gap', loId: lo.id } });
  return ds;
}
