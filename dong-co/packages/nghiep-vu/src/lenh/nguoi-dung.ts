// Lệnh về người dùng: đăng ký, hồ sơ, xác minh, tài khoản nhận tiền, cài đặt, người giúp, gói; vận hành duyệt và khóa.
import type { Goi, NguoiDung, VaiNguoiDung } from '../kieu.ts';
import { chuRong, loi, type BangXuLy } from './chung.ts';

export type LenhNguoiDung =
  | { loai: 'dang_ky'; vai: VaiNguoiDung; ten: string; sdt: string; vung?: string; loaiBan?: NguoiDung['loaiBan']; toChuc?: NguoiDung['toChuc'] }
  | { loai: 'cap_nhat_ho_so'; ten?: string; vung?: string; diaChi?: string; matHang?: string[]; loaiBan?: NguoiDung['loaiBan']; toChuc?: NguoiDung['toChuc'] }
  | { loai: 'gui_xac_minh'; giayTo: string }
  | { loai: 'cap_nhat_tai_khoan_nhan'; nganHang: string; so: string; chuTaiKhoan: string }
  | { loai: 'cap_nhat_cai_dat'; coChu?: NguoiDung['caiDat']['coChu']; tocDoDoc?: number; amThanh?: boolean }
  | { loai: 'them_nguoi_giup'; ten: string; sdt: string; quyen: 'xem' | 'thao_tac' }
  | { loai: 'go_nguoi_giup'; sdt: string }
  | { loai: 'chon_goi'; goi: Goi }
  | { loai: 'them_thanh_vien'; ten: string; sdt: string; quyen: NguoiDung['thanhVien'][number]['quyen'] }
  | { loai: 'go_thanh_vien'; sdt: string }
  | { loai: 'duyet_xac_minh'; nguoiDungId: string; dongY: boolean; lyDo?: string }
  | { loai: 'khoa_tai_khoan'; nguoiDungId: string; lyDo: string }
  | { loai: 'mo_khoa_tai_khoan'; nguoiDungId: string }
  | { loai: 'cap_nhat_nhan_hang_kem_loai'; bat: boolean; matHang?: string[]; kgToiThieu?: number; vung?: string }
  | { loai: 'dat_bao_tieu'; nguoiDungId: string; bat: boolean; giaSan?: Record<string, number>; diemGom?: string };

const SDT = /^0\d{9,10}$/;
const chuanSdt = (s: string) => s.replace(/[\s.\-]/g, '');

export const XU_LY_NGUOI_DUNG: BangXuLy<LenhNguoiDung> = {
  dang_ky(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== l.vai) return loi('Vai đăng ký không khớp với app đang dùng.');
    if (so.nguoiDung.some(n => n.id === nguoi.id)) return loi('Tài khoản này đã đăng ký.');
    const sdt = chuanSdt(l.sdt);
    if (!SDT.test(sdt)) return loi('Số điện thoại gồm 10 hoặc 11 chữ số, bắt đầu bằng 0.');
    if (so.nguoiDung.some(n => n.sdt === sdt && n.vai === l.vai)) return loi('Số điện thoại này đã có tài khoản. Chọn Đăng nhập.');
    if (chuRong(l.ten)) return loi(l.vai === 'ban' ? 'Ghi tên của bạn hoặc tên hợp tác xã.' : 'Ghi tên người liên hệ.');
    if (l.vai === 'mua' && (!l.toChuc || chuRong(l.toChuc.ten))) return loi('Ghi tên tổ chức (nhà máy, công ty, vựa).');
    so.nguoiDung.push({
      id: nguoi.id, vai: l.vai, ten: l.ten.trim(), sdt, vung: l.vung?.trim() ?? '', diaChi: '', xacMinh: 'chua', matHang: [],
      goi: 'mien_phi', thanhVien: [], nguoiGiup: [], caiDat: { coChu: 'vua', tocDoDoc: 0.95, amThanh: true }, taoLuc: bayGio,
      ...(l.loaiBan ? { loaiBan: l.loaiBan } : {}), ...(l.toChuc ? { toChuc: l.toChuc } : {}),
    });
    return { ma: nguoi.id };
  },
  cap_nhat_ho_so(l, { so, nguoi }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (l.ten !== undefined) { if (chuRong(l.ten)) return loi('Tên không được để trống.'); n.ten = l.ten.trim(); }
    if (l.vung !== undefined) n.vung = l.vung.trim();
    if (l.diaChi !== undefined) n.diaChi = l.diaChi.trim();
    if (l.matHang) n.matHang = [...new Set(l.matHang)];
    if (l.loaiBan) n.loaiBan = l.loaiBan;
    if (l.toChuc) n.toChuc = l.toChuc;
    return { ma: n.id };
  },
  gui_xac_minh(l, { so, nguoi, bayGio }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (n.xacMinh === 'da_xac_minh') return loi('Tài khoản đã được xác minh.');
    if (chuRong(l.giayTo)) return loi('Chụp căn cước (người bán) hoặc giấy phép kinh doanh (bên mua).');
    if (chuRong(n.vung)) return loi('Điền huyện, tỉnh ở hồ sơ trước khi gửi xác minh.');
    n.giayTo = { ten: l.giayTo, guiLuc: bayGio };
    n.xacMinh = 'cho_duyet';
    return { ma: n.id };
  },
  cap_nhat_tai_khoan_nhan(l, { so, nguoi, bayGio }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (nguoi.vai !== 'ban') return loi('Chỉ người bán có tài khoản nhận tiền.');
    if (chuRong(l.nganHang) || !/^\d{6,19}$/.test(l.so.replace(/\s/g, '')) || chuRong(l.chuTaiKhoan)) return loi('Ghi đủ ngân hàng, số tài khoản (6 đến 19 chữ số) và tên chủ tài khoản.');
    // Chủ tài khoản phải trùng tên người bán: chống đổi tài khoản nhận tiền sang người khác
    const bo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z ]/g, '').trim();
    if (!bo(n.ten).includes(bo(l.chuTaiKhoan).split(' ').pop() ?? '')) return loi('Tên chủ tài khoản phải trùng tên trên hồ sơ. Muốn nhận vào tài khoản người thân, liên hệ hỗ trợ.');
    n.taiKhoanNhan = { nganHang: l.nganHang.trim(), so: l.so.replace(/\s/g, ''), chuTaiKhoan: l.chuTaiKhoan.trim().toUpperCase(), doiLuc: bayGio };
    return { ma: n.id };
  },
  cap_nhat_cai_dat(l, { so, nguoi }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (l.tocDoDoc !== undefined && !(l.tocDoDoc >= 0.7 && l.tocDoDoc <= 1.3)) return loi('Tốc độ đọc từ 0,7 đến 1,3.');
    n.caiDat = { ...n.caiDat, ...(l.coChu ? { coChu: l.coChu } : {}), ...(l.tocDoDoc !== undefined ? { tocDoDoc: l.tocDoDoc } : {}), ...(l.amThanh !== undefined ? { amThanh: l.amThanh } : {}) };
    return { ma: n.id };
  },
  them_nguoi_giup(l, { so, nguoi }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    const sdt = chuanSdt(l.sdt);
    if (chuRong(l.ten) || !SDT.test(sdt)) return loi('Ghi tên và số điện thoại người giúp.');
    if (sdt === n.sdt) return loi('Người giúp phải dùng số điện thoại khác số của bạn.');
    if (n.nguoiGiup.some(g => g.sdt === sdt)) return loi('Người này đã là người giúp.');
    if (n.nguoiGiup.length >= 3) return loi('Tối đa 3 người giúp.');
    n.nguoiGiup.push({ ten: l.ten.trim(), sdt, quyen: l.quyen });
    return { ma: sdt };
  },
  go_nguoi_giup(l, { so, nguoi }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    const sdt = chuanSdt(l.sdt);
    if (!n.nguoiGiup.some(g => g.sdt === sdt)) return loi('Không tìm thấy người giúp này.');
    n.nguoiGiup = n.nguoiGiup.filter(g => g.sdt !== sdt);
    return { ma: sdt };
  },
  chon_goi(l, { so, nguoi }) {
    if (nguoi.vai !== 'mua') return loi('Người bán dùng app miễn phí, không có gói.');
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (l.goi === 'mien_phi' && n.thanhVien.length + 1 > so.chinhSach.hanMuc.mien_phi.thanhVien) return loi(`Gói Miễn phí chỉ có ${so.chinhSach.hanMuc.mien_phi.thanhVien} tài khoản. Gỡ bớt thành viên trước.`);
    n.goi = l.goi;
    return { ma: n.id };
  },
  them_thanh_vien(l, { so, nguoi }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ tổ chức bên mua có thành viên.');
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    const sdt = chuanSdt(l.sdt);
    if (chuRong(l.ten) || !SDT.test(sdt)) return loi('Ghi tên và số điện thoại thành viên.');
    if (n.thanhVien.some(t => t.sdt === sdt) || sdt === n.sdt) return loi('Số này đã là thành viên.');
    if (n.thanhVien.length + 1 >= so.chinhSach.hanMuc[n.goi].thanhVien) return loi(`Gói ${n.goi === 'business' ? 'Business' : 'Miễn phí'} có tối đa ${so.chinhSach.hanMuc[n.goi].thanhVien} tài khoản.`);
    n.thanhVien.push({ ten: l.ten.trim(), sdt, quyen: l.quyen });
    return { ma: sdt };
  },
  go_thanh_vien(l, { so, nguoi }) {
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    const sdt = chuanSdt(l.sdt);
    if (!n.thanhVien.some(t => t.sdt === sdt)) return loi('Không tìm thấy thành viên này.');
    n.thanhVien = n.thanhVien.filter(t => t.sdt !== sdt);
    return { ma: sdt };
  },
  duyet_xac_minh(l, { so, nguoi }) {
    if (nguoi.vai !== 'van_hanh') return loi('Chỉ đội vận hành duyệt xác minh.');
    const n = so.nguoiDung.find(x => x.id === l.nguoiDungId);
    if (!n) return loi('Không tìm thấy người dùng.');
    if (n.xacMinh !== 'cho_duyet') return loi('Hồ sơ này không ở trạng thái chờ duyệt.');
    if (!l.dongY && chuRong(l.lyDo)) return loi('Ghi lý do từ chối để người dùng biết cách sửa.');
    n.xacMinh = l.dongY ? 'da_xac_minh' : 'tu_choi';
    if (!l.dongY && n.giayTo) n.giayTo.lyDoTuChoi = l.lyDo!;
    return { ma: n.id };
  },
  khoa_tai_khoan(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'van_hanh') return loi('Chỉ đội vận hành khóa tài khoản.');
    const n = so.nguoiDung.find(x => x.id === l.nguoiDungId);
    if (!n) return loi('Không tìm thấy người dùng.');
    if (chuRong(l.lyDo)) return loi('Ghi lý do khóa.');
    n.biKhoa = { lyDo: l.lyDo, luc: bayGio };
    return { ma: n.id };
  },
  mo_khoa_tai_khoan(l, { so, nguoi }) {
    if (nguoi.vai !== 'van_hanh') return loi('Chỉ đội vận hành mở khóa tài khoản.');
    const n = so.nguoiDung.find(x => x.id === l.nguoiDungId);
    if (!n?.biKhoa) return loi('Tài khoản này không bị khóa.');
    delete n.biKhoa;
    return { ma: n.id };
  },
  cap_nhat_nhan_hang_kem_loai(l, { so, nguoi }) {
    if (nguoi.vai !== 'mua') return loi('Chỉ bên mua đăng ký nhận hàng kém loại.');
    const n = so.nguoiDung.find(x => x.id === nguoi.id)!;
    if (!l.bat) { delete n.nhanHangKemLoai; return { ma: n.id }; }
    const kg = l.kgToiThieu ?? 0;
    if (!(kg >= 0)) return loi('Lượng tối thiểu không âm.');
    n.nhanHangKemLoai = { matHang: l.matHang ?? [], kgToiThieu: kg, vung: l.vung?.trim() ?? '' };
    return { ma: n.id };
  },
  dat_bao_tieu(l, { so, nguoi, bayGio }) {
    if (nguoi.vai !== 'van_hanh') return loi('Chỉ đội vận hành ghi đối tác bao tiêu (theo thỏa thuận khung đã ký).');
    const n = so.nguoiDung.find(x => x.id === l.nguoiDungId);
    if (!n || n.vai !== 'mua') return loi('Đối tác bao tiêu phải là một bên mua đã đăng ký.');
    if (!l.bat) { delete n.baoTieu; return { ma: n.id }; }
    const gia = Object.entries(l.giaSan ?? {});
    if (!gia.length || gia.some(([, g]) => !(g > 0))) return loi('Ghi giá sàn (lớn hơn 0) cho ít nhất một mặt hàng.');
    if (chuRong(l.diemGom)) return loi('Ghi điểm gom nhận hàng.');
    n.baoTieu = { giaSan: Object.fromEntries(gia), diemGom: l.diemGom!.trim(), tu: bayGio };
    return { ma: n.id };
  },
};
