// Lệnh quản lý của bên mua: kho (nhập từ đơn, xuất), đơn mua ngoài app, kế hoạch mua, danh bạ mối quen ngoài app.
import { ben, capMa, chuRong, homNay, loi, ngayHopLe, soDuong, type BangXuLy } from './chung.ts';

export type LenhThuMua =
  | { loai: 'nhap_kho'; donMa?: string; donNgoaiId?: string; phanLoai: string; kg: number; viTri: string; ngayNhap: string; hanDung: string }
  | { loai: 'xuat_kho'; phieuId: string; kg: number; ngay: string; ghiChu: string }
  | { loai: 'ghi_don_ngoai'; nguoiBan: string; diaChiNguoiBan: string; matHang: string; ten: string; kg: number; gia: number; ngay: string; daTra: number }
  | { loai: 'tra_don_ngoai'; donNgoaiId: string; so: number }
  | { loai: 'them_ke_hoach'; matHang: string; ten: string; thang: string; kgCan: number }
  | { loai: 'xoa_ke_hoach'; keHoachId: string }
  | { loai: 'nhap_moi_quen'; danhSach: { ten: string; sdt: string; vung: string; matHang: string }[] };

export const XU_LY_THU_MUA: BangXuLy<LenhThuMua> = {
  nhap_kho(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua có kho.');
    if (!!l.donMa === !!l.donNgoaiId) return loi('Chọn đơn trong app hoặc đơn ghi ngoài app để nhập kho.');
    let matHang = '', ten = '', toiDa = 0;
    if (l.donMa) {
      const d = so.don.find(x => x.ma === l.donMa && x.mua.id === nguoi.id);
      if (!d) return loi('Không tìm thấy đơn của bạn.');
      if (!d.ketQuaCan || !['da_chot', 'tien_dang_giu', 'bao_da_tra', 'chua_thay_tien', 'da_nhan_tien'].includes(d.trangThai)) return loi('Chỉ nhập kho đơn đã chốt số cân.');
      ({ matHang } = d); ten = d.tenLo; toiDa = d.ketQuaCan.nhan;
    } else {
      const n = so.donNgoai.find(x => x.id === l.donNgoaiId && x.mua.id === nguoi.id);
      if (!n) return loi('Không tìm thấy đơn ngoài app của bạn.');
      ({ matHang, ten } = n); toiDa = n.kg;
    }
    const daNhap = so.kho.filter(p => (l.donMa ? p.donMa === l.donMa : p.donNgoaiId === l.donNgoaiId)).reduce((s, p) => s + p.kg, 0);
    if (!soDuong(l.kg) || l.kg > toiDa - daNhap) return loi(`Lượng nhập phải lớn hơn 0 và không quá ${(toiDa - daNhap).toLocaleString('vi-VN')} kg còn chưa nhập của đơn.`);
    if (!ngayHopLe(l.ngayNhap) || l.ngayNhap > homNay(bayGio)) return loi('Chọn ngày nhập, không chọn ngày trong tương lai.');
    if (!ngayHopLe(l.hanDung) || l.hanDung < l.ngayNhap) return loi('Hạn dùng phải từ ngày nhập trở đi.');
    if (chuRong(l.viTri) || chuRong(l.phanLoai)) return loi('Ghi loại hàng và vị trí kho.');
    const id = capMa(so, 'PK');
    so.kho.unshift({ id, mua: ben(nguoi), matHang, ten, loai: l.phanLoai.trim(), kg: l.kg, viTri: l.viTri.trim(), ngayNhap: l.ngayNhap, hanDung: l.hanDung, xuat: [], ...(l.donMa ? { donMa: l.donMa } : { donNgoaiId: l.donNgoaiId! }) });
    return { ma: id };
  },
  xuat_kho(l, { so, nguoi, bayGio }) {
    const p = so.kho.find(x => x.id === l.phieuId && x.mua.id === nguoi.id);
    if (!p) return loi('Không tìm thấy phiếu kho của bạn.');
    const con = p.kg - p.xuat.reduce((s, x) => s + x.kg, 0);
    if (!soDuong(l.kg) || l.kg > con) return loi(`Lượng xuất phải lớn hơn 0 và không quá ${con.toLocaleString('vi-VN')} kg còn trong kho.`);
    if (!ngayHopLe(l.ngay) || l.ngay < p.ngayNhap || l.ngay > homNay(bayGio)) return loi('Ngày xuất phải từ ngày nhập tới hôm nay.');
    p.xuat.push({ kg: l.kg, ngay: l.ngay, ghiChu: l.ghiChu.trim() });
    return { ma: p.id };
  },
  ghi_don_ngoai(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua ghi đơn ngoài app.');
    if (chuRong(l.nguoiBan) || chuRong(l.ten)) return loi('Ghi người bán và mặt hàng.');
    if (!soDuong(l.kg) || !soDuong(l.gia)) return loi('Lượng và giá phải lớn hơn 0.');
    if (!ngayHopLe(l.ngay) || l.ngay > homNay(bayGio)) return loi('Chọn ngày mua, không chọn ngày trong tương lai.');
    if (!(l.daTra >= 0) || l.daTra > Math.round(l.kg * l.gia)) return loi('Số đã trả không âm và không vượt tiền hàng.');
    const id = capMa(so, 'DNG');
    so.donNgoai.unshift({ id, mua: ben(nguoi), nguoiBan: l.nguoiBan.trim(), diaChiNguoiBan: l.diaChiNguoiBan.trim(), matHang: l.matHang, ten: l.ten.trim(), kg: l.kg, gia: l.gia, ngay: l.ngay, daTra: l.daTra });
    return { ma: id };
  },
  tra_don_ngoai(l, { so, nguoi }) {
    const n = so.donNgoai.find(x => x.id === l.donNgoaiId && x.mua.id === nguoi.id);
    if (!n) return loi('Không tìm thấy đơn ngoài app của bạn.');
    const con = Math.round(n.kg * n.gia) - n.daTra;
    if (!soDuong(l.so) || l.so > con) return loi(`Số trả phải lớn hơn 0 và không quá ${con.toLocaleString('vi-VN')} đ còn nợ.`);
    n.daTra += l.so;
    return { ma: n.id };
  },
  them_ke_hoach(l, { so, nguoi }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua lập kế hoạch mua.');
    if (!/^\d{4}-\d{2}$/.test(l.thang)) return loi('Chọn tháng.');
    if (chuRong(l.ten) || !soDuong(l.kgCan)) return loi('Ghi mặt hàng và lượng cần (lớn hơn 0).');
    if (so.keHoach.some(k => k.mua.id === nguoi.id && k.matHang === l.matHang && k.thang === l.thang)) return loi('Tháng này đã có kế hoạch cho mặt hàng này. Sửa dòng cũ.');
    const id = capMa(so, 'KH');
    so.keHoach.push({ id, mua: ben(nguoi), matHang: l.matHang, ten: l.ten.trim(), thang: l.thang, kgCan: l.kgCan });
    return { ma: id };
  },
  xoa_ke_hoach(l, { so, nguoi }) {
    const k = so.keHoach.find(x => x.id === l.keHoachId && x.mua.id === nguoi.id);
    if (!k) return loi('Không tìm thấy dòng kế hoạch của bạn.');
    so.keHoach = so.keHoach.filter(x => x.id !== k.id);
    return { ma: k.id };
  },
  nhap_moi_quen(l, { so, nguoi }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua có danh bạ mối quen.');
    if (!l.danhSach.length) return loi('Tệp không có dòng nào.');
    const sai = l.danhSach.findIndex(m => chuRong(m.ten) || !/^0\d{9,10}$/.test(m.sdt.replace(/[\s.\-]/g, '')));
    if (sai >= 0) return loi(`Dòng ${sai + 1}: cần tên và số điện thoại hợp lệ.`);
    let them = 0;
    for (const m of l.danhSach) {
      const sdt = m.sdt.replace(/[\s.\-]/g, '');
      if (so.moiQuenNgoai.some(x => x.mua.id === nguoi.id && x.sdt === sdt)) continue;
      so.moiQuenNgoai.push({ id: capMa(so, 'MQ'), mua: ben(nguoi), ten: m.ten.trim(), sdt, vung: m.vung.trim(), matHang: m.matHang.trim() });
      them++;
    }
    return { ma: String(them) };
  },
};
