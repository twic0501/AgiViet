// Các quy tắc ngoài vòng đơn: người dùng, lô (cách ly, lô gộp, tự ẩn), hạn mức, chào hàng, che liên lạc, báo giá, hẹn xem,
// đề nghị đổi đơn, đánh giá, sổ vườn, ứng tiền, dịch vụ, hỗ trợ, thu mua, chính sách, số liệu tổng hợp.
import { describe, expect, it } from 'vitest';
import { bangKe01, chamDiemNhaCungCap, chiaTienLoGop, cheLienLac, congNo, loiLoVu, tienNguoiBan, uyTin } from '../src/index.ts';
import { BAY, DONG_XANH, HE_THONG, MIEN_TAY, NAM, Phien, VAN_HANH } from './phien.ts';

const NGAY = 24 * 3600_000;
/** Đơn chạy tới khi nhận đủ tiền qua tài khoản đảm bảo. */
function donXong(p: Phien, lo: string, kg: number, nhan = kg) {
  const ma = p.donDaCoc(lo, kg);
  p.buoc(DONG_XANH, ma, 'nhapKetQua', nhan, kg - nhan);
  p.buoc(NAM, ma, 'ketQuaDung');
  p.buoc(DONG_XANH, ma, 'chuyenTienDamBao', p.don(ma).conPhaiTra!);
  p.buoc(HE_THONG, ma, 'giaiNgan');
  return ma;
}

describe('Người dùng', () => {
  it('đăng ký: số điện thoại hợp lệ, không trùng; bên mua cần tên tổ chức', () => {
    const p = new Phien(false);
    expect(p.lam(NAM, { loai: 'dang_ky', vai: 'ban', ten: 'Năm', sdt: '12345' }).loi).toMatch(/10 hoặc 11 chữ số/);
    expect(p.lam(NAM, { loai: 'dang_ky', vai: 'ban', ten: 'Năm', sdt: '0918 234 421' }).loi).toBeUndefined();
    expect(p.lam(BAY, { loai: 'dang_ky', vai: 'ban', ten: 'Bảy', sdt: '0918234421' }).loi).toMatch(/đã có tài khoản/);
    expect(p.lam(DONG_XANH, { loai: 'dang_ky', vai: 'mua', ten: 'Trí', sdt: '0277386210' }).loi).toMatch(/tổ chức/);
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: 'LO-1' }).loi).toMatch(/chưa đăng ký/);
  });
  it('xác minh: gửi giấy tờ → vận hành duyệt; từ chối phải có lý do', () => {
    const p = new Phien();
    expect(p.lam(NAM, { loai: 'gui_xac_minh', giayTo: 'cccd.jpg' }).loi).toBeUndefined();
    expect(p.lam(NAM, { loai: 'duyet_xac_minh', nguoiDungId: NAM.id, dongY: true }).loi).toBeDefined();
    expect(p.lam(VAN_HANH, { loai: 'duyet_xac_minh', nguoiDungId: NAM.id, dongY: false }).loi).toMatch(/lý do/);
    p.lam(VAN_HANH, { loai: 'duyet_xac_minh', nguoiDungId: NAM.id, dongY: true });
    expect(p.so.nguoiDung.find(n => n.id === NAM.id)?.xacMinh).toBe('da_xac_minh');
  });
  it('tài khoản nhận tiền phải đứng tên chính người bán', () => {
    const p = new Phien();
    expect(p.lam(NAM, { loai: 'cap_nhat_tai_khoan_nhan', nganHang: 'Agribank', so: '7300205123456', chuTaiKhoan: 'TRAN VAN TU' }).loi).toMatch(/trùng tên/);
    expect(p.lam(NAM, { loai: 'cap_nhat_tai_khoan_nhan', nganHang: 'Agribank', so: '7300205123456', chuTaiKhoan: 'Nguyễn Thị Năm' }).loi).toBeUndefined();
  });
  it('bị khóa thì không thao tác được; mở khóa thì dùng lại', () => {
    const p = new Phien();
    p.lam(VAN_HANH, { loai: 'khoa_tai_khoan', nguoiDungId: NAM.id, lyDo: 'nghi đăng tin giả' });
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 100, coSo: 'da_can', gia: 1 }).loi).toMatch(/tạm khóa/);
    p.lam(VAN_HANH, { loai: 'mo_khoa_tai_khoan', nguoiDungId: NAM.id });
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 100, coSo: 'da_can', gia: 1 }).loi).toBeUndefined();
  });
  it('người giúp: tối đa 3, khác số chủ; gỡ được', () => {
    const p = new Phien();
    expect(p.lam(NAM, { loai: 'them_nguoi_giup', ten: 'Út', sdt: '0918234421', quyen: 'xem' }).loi).toMatch(/khác số/);
    for (const s of ['0900000001', '0900000002', '0900000003']) p.lam(NAM, { loai: 'them_nguoi_giup', ten: 'Con', sdt: s, quyen: 'thao_tac' });
    expect(p.lam(NAM, { loai: 'them_nguoi_giup', ten: 'Cháu', sdt: '0900000004', quyen: 'xem' }).loi).toMatch(/Tối đa 3/);
    expect(p.lam(NAM, { loai: 'go_nguoi_giup', sdt: '0900000001' }).loi).toBeUndefined();
  });
});

describe('Lô hàng', () => {
  it('chặn đăng bán khi vườn còn trong thời gian cách ly thuốc', () => {
    const p = new Phien();
    const vuon = p.lam(NAM, { loai: 'them_vuon', ten: 'Vườn sau nhà', loaiVuon: 'vuon', dienTich: 2, donViDienTich: 'cong', cay: 'Xoài cát Chu', soGoc: 120 }).ma!;
    p.lam(NAM, { loai: 'ghi_nhat_ky', vuonId: vuon, ngay: p.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun trừ rầy', vatTu: 'Thuốc A', ngayCachLy: 7 });
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1000, coSo: 'uoc_tinh', gia: null, vuonId: vuon }).loi).toMatch(/cách ly/);
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1000, coSo: 'uoc_tinh', gia: null, vuonId: vuon, haiTu: p.ngay(7), haiDen: p.ngay(10) }).loi).toBeUndefined();
  });
  it('lô gộp: tổng phần các hộ phải bằng lượng lô', () => {
    const p = new Phien();
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài HTX', kg: 3000, coSo: 'uoc_tinh', gia: null, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1500 }] }).loi).toMatch(/phải bằng/);
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài HTX', kg: 2500, coSo: 'uoc_tinh', gia: null, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1500 }] }).loi).toBeUndefined();
  });
  it('tin tự ẩn sau 14 ngày không xác nhận còn hàng; xác nhận thì hiện lại', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1000, coSo: 'da_can', gia: 20000 }).ma!;
    p.gio += 15 * NGAY;
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).loi).toMatch(/đang ẩn/);
    p.lam(NAM, { loai: 'con_hang', loId: lo });
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).loi).toBeUndefined();
  });
  it('ngày hái "đến" phải sau "từ"; người khác không sửa được lô', () => {
    const p = new Phien();
    expect(p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1, haiTu: '2026-10-12', haiDen: '2026-10-10' }).loi).toMatch(/sau ngày/);
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 }).ma!;
    expect(p.lam(BAY, { loai: 'sua_lo', loId: lo, gia: 2 }).loi).toBeDefined();
  });
});

describe('Kết nối và hạn mức', () => {
  it('gói Miễn phí: 5 lời mời mỗi tháng; bị từ chối thì trả lượt', () => {
    const p = new Phien();
    const lo = Array.from({ length: 7 }, (_, i) => p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: `Xoài ${i}`, kg: 100, coSo: 'da_can', gia: 1 }).ma!);
    const kn = lo.slice(0, 5).map(l => p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: l }).ma!);
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo[5]! }).loi).toMatch(/5\/5/);
    p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn[0]!, dongY: false });
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo[5]! }).loi).toBeUndefined();
    p.lam(DONG_XANH, { loai: 'chon_goi', goi: 'business' });
    expect(p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo[6]! }).loi).toBeUndefined();
  });
  it('người bán chào hàng vào nhu cầu; bên mua đồng ý thì tạo đơn được', () => {
    const p = new Phien();
    const nc = p.lam(DONG_XANH, { loai: 'dang_nhu_cau', matHang: 'mango', ten: 'Xoài loại 2 cho sấy', kg: 5000, tu: p.ngay(2), den: p.ngay(20) }).ma!;
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 6000, coSo: 'uoc_tinh', gia: null }).ma!;
    expect(p.lam(DONG_XANH, { loai: 'chao_hang', nhuCauId: nc, loId: lo }).loi).toBeDefined();
    const kn = p.lam(NAM, { loai: 'chao_hang', nhuCauId: nc, loId: lo }).ma!;
    expect(p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true }).loi).toMatch(/người nhận/);
    p.lam(DONG_XANH, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true });
    expect(p.taoDon(lo, 5000, 9000).loi).toBeUndefined();
  });
  it('nhu cầu: ngày "đến" sau "từ"; tối đa 5 tin mỗi tháng ở gói Miễn phí', () => {
    const p = new Phien();
    expect(p.lam(DONG_XANH, { loai: 'dang_nhu_cau', matHang: 'x', ten: 'X', kg: 1, tu: p.ngay(5), den: p.ngay(1) }).loi).toMatch(/sau ngày/);
    for (let i = 0; i < 5; i++) p.lam(DONG_XANH, { loai: 'dang_nhu_cau', matHang: 'x', ten: 'X', kg: 1, tu: p.ngay(1), den: p.ngay(5) });
    expect(p.lam(DONG_XANH, { loai: 'dang_nhu_cau', matHang: 'x', ten: 'X', kg: 1, tu: p.ngay(1), den: p.ngay(5) }).loi).toMatch(/5\/5/);
  });
});

describe('Trao đổi', () => {
  it('che số điện thoại, Zalo, đường dẫn trước khi cọc; sau cọc thì không che', () => {
    expect(cheLienLac('Gọi em 0918 234 421 hoặc zalo nha').biChe).toEqual(['so_dien_thoai', 'mang_xa_hoi']);
    expect(cheLienLac('kết bạn zép lào với em').noiDung).toBe('kết bạn ••• với em');
    expect(cheLienLac('số em không chín một tám hai ba bốn bốn hai một').biChe).toContain('so_bang_chu');
    expect(cheLienLac('Xoài loại 1 giá 25.000 đ, giao 3 tấn ngày 12/10').biChe).toEqual([]);
    const p = new Phien(); const lo = p.loSanSang();
    const kn = p.so.ketNoi[0]!.id;
    p.lam(NAM, { loai: 'gui_tin', ketNoiId: kn, noiDung: 'Gọi chị 0918234421 nha' });
    expect(p.so.tinNhan.at(-1)).toMatchObject({ noiDung: 'Gọi chị ••• nha', biChe: ['so_dien_thoai'], goc: 'Gọi chị 0918234421 nha' });
    p.donDaCoc(lo, 1000);
    p.lam(NAM, { loai: 'gui_tin', ketNoiId: kn, noiDung: 'Gọi chị 0918234421 nha' });
    expect(p.so.tinNhan.at(-1)).toMatchObject({ noiDung: 'Gọi chị 0918234421 nha', biChe: [] });
  });
  it('chưa kết nối thì không nhắn được', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 }).ma!;
    const kn = p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).ma!;
    expect(p.lam(DONG_XANH, { loai: 'gui_tin', ketNoiId: kn, noiDung: 'chào' }).loi).toMatch(/đồng ý kết nối/);
  });
  it('báo giá: bên kia chốt mới tạo đơn được; mỗi báo giá một đơn; báo giá mới thay báo giá cũ', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const kn = p.so.ketNoi[0]!.id;
    const bg1 = p.lam(NAM, { loai: 'gui_bao_gia', ketNoiId: kn, gia: 26000, kg: 2000, ngayGiao: p.ngay(4) }).ma!;
    const bg2 = p.lam(NAM, { loai: 'gui_bao_gia', ketNoiId: kn, gia: 25500, kg: 2000, ngayGiao: p.ngay(4) }).ma!;
    expect(p.so.baoGia.find(b => b.id === bg1)?.trangThai).toBe('het');
    expect(p.lam(DONG_XANH, { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg2 }).loi).toMatch(/chưa được hai bên chốt/);
    expect(p.lam(NAM, { loai: 'tra_loi_bao_gia', baoGiaId: bg2, dongY: true }).loi).toMatch(/Bên kia/);
    p.lam(DONG_XANH, { loai: 'tra_loi_bao_gia', baoGiaId: bg2, dongY: true });
    const ma = p.lam(DONG_XANH, { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg2 }).ma!;
    expect(p.don(ma)).toMatchObject({ kg: 2000, gia: 25500, baoGiaId: bg2 });
    expect(p.lam(DONG_XANH, { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg2 }).loi).toMatch(/đã dùng/);
  });
  it('hẹn xem vườn: giờ tương lai, một đề nghị chờ mỗi lúc, bên kia trả lời', () => {
    const p = new Phien(); p.loSanSang();
    const kn = p.so.ketNoi[0]!.id;
    expect(p.lam(DONG_XANH, { loai: 'de_nghi_hen', ketNoiId: kn, luc: '2026-10-01T08:00' }).loi).toMatch(/tương lai/);
    const h = p.lam(DONG_XANH, { loai: 'de_nghi_hen', ketNoiId: kn, luc: '2026-10-11T08:00' }).ma!;
    expect(p.lam(NAM, { loai: 'de_nghi_hen', ketNoiId: kn, luc: '2026-10-12T08:00' }).loi).toMatch(/chờ trả lời/);
    expect(p.lam(DONG_XANH, { loai: 'tra_loi_hen', henId: h, dongY: true }).loi).toBeDefined();
    p.lam(NAM, { loai: 'tra_loi_hen', henId: h, dongY: true });
    expect(p.so.henXem[0]?.trangThai).toBe('dong_y');
  });
});

describe('Đề nghị đổi đơn', () => {
  it('giảm lượng: trả phần dư về lô; chưa cọc thì tính lại cọc', () => {
    const p = new Phien(); const lo = p.loSanSang(4000);
    const ma = p.taoDon(lo, 4000).ma!;
    p.buoc(NAM, ma, 'xacNhanDon');
    p.lam(NAM, { loai: 'de_nghi_don', ma, deNghi: 'giam_luong', giaTri: '3000', lyDo: 'mưa rụng trái' });
    expect(p.buoc(DONG_XANH, ma, 'datCoc').loi).toMatch(/đề nghị/);
    expect(p.lam(NAM, { loai: 'tra_loi_de_nghi', deNghiId: p.so.deNghi[0]!.id, dongY: true }).loi).toMatch(/Bên kia/);
    p.lam(DONG_XANH, { loai: 'tra_loi_de_nghi', deNghiId: p.so.deNghi[0]!.id, dongY: true });
    expect(p.don(ma)).toMatchObject({ kg: 3000, coc: { so: 7_500_000 } });
    expect(p.lo(lo).hua).toBe(3000);
  });
  it('đổi giá chỉ trước khi cọc; đổi lịch chỉ trước khi cân', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 1000);
    expect(p.lam(DONG_XANH, { loai: 'de_nghi_don', ma, deNghi: 'doi_gia', giaTri: '20000', lyDo: 'x' }).loi).toMatch(/trước khi đặt cọc/);
    expect(p.lam(DONG_XANH, { loai: 'de_nghi_don', ma, deNghi: 'doi_lich', giaTri: p.ngay(6), lyDo: 'xe hư' }).loi).toBeUndefined();
    p.lam(NAM, { loai: 'tra_loi_de_nghi', deNghiId: p.so.deNghi[0]!.id, dongY: true });
    expect(p.don(ma).ngayGiao).toBe(p.ngay(6));
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 1000, 0);
    expect(p.lam(DONG_XANH, { loai: 'de_nghi_don', ma, deNghi: 'doi_lich', giaTri: p.ngay(8), lyDo: 'x' }).loi).toMatch(/trước khi cân/);
  });
  it('đánh giá: sau khi đơn hoàn tất, mỗi bên một lần', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 1000);
    expect(p.lam(DONG_XANH, { loai: 'danh_gia', ma, diem: 5 }).loi).toMatch(/hoàn tất/);
    const xong = donXong(p, lo, 1000);
    expect(p.lam(DONG_XANH, { loai: 'danh_gia', ma: xong, diem: 5, nhanXet: 'Giao đúng hẹn' }).loi).toBeUndefined();
    expect(p.lam(DONG_XANH, { loai: 'danh_gia', ma: xong, diem: 4 }).loi).toMatch(/đã đánh giá/);
  });
});

describe('Sổ vườn', () => {
  it('nhật ký: không ghi ngày tương lai; phun thuốc phải có tên thuốc và ngày cách ly', () => {
    const p = new Phien();
    const v = p.lam(NAM, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' }).ma!;
    expect(p.lam(NAM, { loai: 'ghi_nhat_ky', vuonId: v, ngay: p.ngay(1), loaiViec: 'tuoi', noiDung: 'Tưới' }).loi).toMatch(/tương lai/);
    expect(p.lam(NAM, { loai: 'ghi_nhat_ky', vuonId: v, ngay: p.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun' }).loi).toMatch(/tên thuốc/);
    expect(p.lam(NAM, { loai: 'ghi_nhat_ky', vuonId: v, ngay: p.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun', vatTu: 'A' }).loi).toMatch(/cách ly/);
    expect(p.lam(BAY, { loai: 'ghi_nhat_ky', vuonId: v, ngay: p.ngay(0), loaiViec: 'tuoi', noiDung: 'Tưới' }).loi).toBeDefined();
  });
  it('mùa vụ chỉ đi tới; một vườn một vụ đang chạy', () => {
    const p = new Phien();
    const v = p.lam(NAM, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' }).ma!;
    const vu = p.lam(NAM, { loai: 'them_mua_vu', vuonId: v, ten: 'Vụ 2026', batDau: p.ngay(-60), sanLuongUoc: 8000, haiDuKien: p.ngay(20) }).ma!;
    expect(p.lam(NAM, { loai: 'them_mua_vu', vuonId: v, ten: 'Vụ 2', batDau: p.ngay(0), sanLuongUoc: 1, haiDuKien: p.ngay(9) }).loi).toMatch(/chưa xong/);
    p.lam(NAM, { loai: 'cap_nhat_mua_vu', muaVuId: vu, giaiDoan: 'dau_trai' });
    expect(p.lam(NAM, { loai: 'cap_nhat_mua_vu', muaVuId: vu, giaiDoan: 'ra_hoa' }).loi).toMatch(/không lùi/);
  });
  it('không xóa được nhật ký phun thuốc của vườn có lô đã có đơn', () => {
    const p = new Phien();
    const v = p.lam(NAM, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' }).ma!;
    const nk = p.lam(NAM, { loai: 'ghi_nhat_ky', vuonId: v, ngay: p.ngay(-20), loaiViec: 'phun_thuoc', noiDung: 'Phun', vatTu: 'A', ngayCachLy: 7 }).ma!;
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1000, coSo: 'da_can', gia: 20000, vuonId: v }).ma!;
    const kn = p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).ma!;
    p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true });
    const ma = p.taoDon(lo, 500).ma!; p.buoc(NAM, ma, 'xacNhanDon');
    expect(p.lam(NAM, { loai: 'xoa_nhat_ky', nhatKyId: nk }).loi).toMatch(/không xóa được/);
  });
  it('lời lỗ vụ: chi ghi tay, thu gồm tiền bán qua app của lô gắn vườn', () => {
    const p = new Phien();
    const v = p.lam(NAM, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' }).ma!;
    const vu = p.lam(NAM, { loai: 'them_mua_vu', vuonId: v, ten: 'Vụ', batDau: p.ngay(-30), sanLuongUoc: 1000, haiDuKien: p.ngay(0) }).ma!;
    p.lam(NAM, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 3_000_000, noiDung: 'Phân bón', ngay: p.ngay(-5), muaVuId: vu });
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1000, coSo: 'da_can', gia: 20000, vuonId: v }).ma!;
    const kn = p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).ma!;
    p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true });
    donXong(p, lo, 1000);
    expect(loiLoVu(p.so, vu)).toEqual({ chi: 3_000_000, thuTay: 0, thuApp: 25_000_000, loi: 22_000_000 });
  });
});

describe('Tiền, ứng trước, lô gộp, uy tín', () => {
  it('ứng trước tối đa 70% giá trị đơn; ngân hàng duyệt; đơn đóng thì thu hồi', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 4000);
    expect(p.lam(NAM, { loai: 'xin_ung_tien', donMa: ma, so: 80_000_000 }).loi).toMatch(/70\.000\.000/);
    const u = p.lam(NAM, { loai: 'xin_ung_tien', donMa: ma, so: 50_000_000 }).ma!;
    expect(p.lam(NAM, { loai: 'duyet_ung_tien', ungTienId: u, dongY: true }).loi).toBeDefined();
    p.lam(HE_THONG, { loai: 'duyet_ung_tien', ungTienId: u, dongY: true });
    expect(tienNguoiBan(p.so, NAM.id).daUng).toBe(50_000_000 - 750_000);
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 4000, 0); p.buoc(NAM, ma, 'ketQuaDung');
    p.buoc(DONG_XANH, ma, 'chuyenTienDamBao', p.don(ma).conPhaiTra!); p.buoc(HE_THONG, ma, 'giaiNgan');
    expect(p.so.ungTien[0]?.trangThai).toBe('da_thu_hoi');
    expect(p.don(ma).lichSu.length).toBe(p.don(ma).phienBan);
  });
  it('lô gộp: chia tiền theo phần từng hộ, tổng đúng bằng tiền nhận', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài HTX', kg: 3000, coSo: 'da_can', gia: 20000, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1100 }, { ho: 'Cô Ba', kg: 900 }] }).ma!;
    const kn = p.lam(DONG_XANH, { loai: 'gui_loi_moi', loId: lo }).ma!;
    p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true });
    const ma = donXong(p, lo, 3000, 2950);
    const chia = chiaTienLoGop(p.so, ma)!;
    expect(chia.reduce((s, c) => s + c.tien, 0)).toBe(p.don(ma).daTra);
    expect(chia.map(c => c.ho)).toEqual(['Bà Tư', 'Anh Sáu', 'Cô Ba']);
  });
  it('uy tín: dưới 3 đơn là "Mới"; giao đủ, không hủy, đánh giá cao thì "Tốt"', () => {
    const p = new Phien(); const lo = p.loSanSang(10_000);
    expect(uyTin(p.so, NAM.id).bac).toBe('moi');
    for (let i = 0; i < 3; i++) { const ma = donXong(p, lo, 1000); p.lam(DONG_XANH, { loai: 'danh_gia', ma, diem: 5 }); }
    expect(uyTin(p.so, NAM.id)).toMatchObject({ bac: 'tot', soDonXong: 3, tyLeGiaoDu: 1, diemDanhGia: 5 });
    expect(uyTin(p.so, DONG_XANH.id).tyLeTraDungHan).toBe(1);
  });
});

describe('Dịch vụ, hỗ trợ, báo cáo, chính sách', () => {
  it('dịch vụ: chờ báo giá → đối tác báo giá → đặt → xong', () => {
    const p = new Phien();
    const y = p.lam(NAM, { loai: 'yeu_cau_dich_vu', dichVu: 'kiem_dinh', ngay: p.ngay(2) }).ma!;
    expect(p.lam(NAM, { loai: 'dat_dich_vu', yeuCauId: y }).loi).toMatch(/Chờ đối tác/);
    p.lam(HE_THONG, { loai: 'bao_gia_dich_vu', yeuCauId: y, doiTac: 'Trung tâm kiểm nghiệm Cần Thơ', gia: 1_200_000 });
    p.lam(NAM, { loai: 'dat_dich_vu', yeuCauId: y });
    p.lam(HE_THONG, { loai: 'xong_dich_vu', yeuCauId: y });
    expect(p.so.dichVu[0]?.trangThai).toBe('xong');
  });
  it('hỗ trợ và báo cáo: người dùng gửi, vận hành trả lời; báo cáo lô bị xử lý thì lô ẩn', () => {
    const p = new Phien();
    const h = p.lam(NAM, { loai: 'gui_ho_tro', chuDe: 'Tiền', noiDung: 'Chưa thấy tiền cọc' }).ma!;
    p.lam(VAN_HANH, { loai: 'tra_loi_ho_tro', hoTroId: h, noiDung: 'Đã kiểm, tiền về trong ngày', xong: true });
    expect(p.so.hoTro[0]).toMatchObject({ trangThai: 'xong' });
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 }).ma!;
    const b = p.lam(DONG_XANH, { loai: 'bao_cao_vi_pham', doiTuong: { loai: 'lo', id: lo }, lyDo: 'Ảnh lấy trên mạng' }).ma!;
    p.lam(VAN_HANH, { loai: 'xu_ly_bao_cao', baoCaoId: b, ketQua: 'da_xu_ly' });
    expect(p.lo(lo).an).toBe(true);
  });
  it('chính sách: chỉ vận hành đổi; giá trị phải hợp lý; áp cho đơn xác nhận sau đó', () => {
    const p = new Phien(); const lo = p.loSanSang();
    expect(p.lam(NAM, { loai: 'cap_nhat_chinh_sach', thayDoi: { tyLeCoc: 0.2 } }).loi).toBeDefined();
    expect(p.lam(VAN_HANH, { loai: 'cap_nhat_chinh_sach', thayDoi: { phiMoiQuen: 0.02 } }).loi).toMatch(/không vượt/);
    p.lam(VAN_HANH, { loai: 'cap_nhat_chinh_sach', thayDoi: { tyLeCoc: 0.2 } });
    const ma = p.taoDon(lo, 1000).ma!; p.buoc(NAM, ma, 'xacNhanDon');
    expect(p.don(ma).coc?.so).toBe(5_000_000);
  });
});

describe('Thu mua', () => {
  it('nhập kho từ đơn đã chốt, không vượt lượng nhận; xuất không vượt tồn', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 2000);
    expect(p.lam(DONG_XANH, { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 100, viTri: 'Kho A', ngayNhap: p.ngay(0), hanDung: p.ngay(5) }).loi).toMatch(/đã chốt số cân/);
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 1900, 100); p.buoc(NAM, ma, 'ketQuaDung');
    expect(p.lam(DONG_XANH, { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 2000, viTri: 'Kho A', ngayNhap: p.ngay(0), hanDung: p.ngay(5) }).loi).toMatch(/1\.900/);
    const pk = p.lam(DONG_XANH, { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 1900, viTri: 'Kho A', ngayNhap: p.ngay(0), hanDung: p.ngay(5) }).ma!;
    expect(p.lam(DONG_XANH, { loai: 'xuat_kho', phieuId: pk, kg: 2000, ngay: p.ngay(0), ghiChu: 'vào chuyền' }).loi).toMatch(/1\.900/);
  });
  it('đơn ngoài app vào công nợ và bảng kê; chấm điểm nhà cung cấp từ đơn đã chốt', () => {
    const p = new Phien(); const lo = p.loSanSang();
    p.lam(DONG_XANH, { loai: 'ghi_don_ngoai', nguoiBan: 'Ông Hai Lúa', diaChiNguoiBan: 'Lấp Vò', matHang: 'mango', ten: 'Xoài', kg: 500, gia: 10000, ngay: p.ngay(0), daTra: 2_000_000 });
    expect(congNo(p.so, DONG_XANH.id).tongCon).toBe(3_000_000);
    const ma = donXong(p, lo, 1000, 950);
    const bk = bangKe01(p.so, DONG_XANH.id, p.ngay(0).slice(0, 7));
    expect(bk.dong.map(d => d.chungTu).sort()).toEqual([ma, 'DNG-1'].sort());
    expect(bk.tong).toBe(5_000_000 + 950 * 25000);
    expect(chamDiemNhaCungCap(p.so, DONG_XANH.id)[0]).toMatchObject({ id: NAM.id, soDon: 1, giaoDu: 0.95 });
    expect(chamDiemNhaCungCap(p.so, MIEN_TAY.id)).toEqual([]);
  });
});
