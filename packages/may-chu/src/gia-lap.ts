// Giả lập bên mua (giai đoạn 1, khi chưa có app Thu mua): ba bên mua mẫu; gợi ý việc bên mua làm tiếp được với người bán này.
// Mỗi gợi ý là một lệnh thật, chạy qua dịch vụ và nghiệp vụ như app thật.
import { conBan, ngayCua, type Lenh, type NguoiLam, type SoGiaoDich } from '@agiviet/nghiep-vu';
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
        ds.push({ nhom: 'don', nhan: `${t} tạo đơn ${kg.toLocaleString('vi-VN')} kg lô ${lo.ten}`, nguoi: m.nguoi, lenh: { loai: 'tao_don', loId: lo.id, kg, gia: lo.gia ?? 15000, ngayGiao: ngay(3) } });
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
