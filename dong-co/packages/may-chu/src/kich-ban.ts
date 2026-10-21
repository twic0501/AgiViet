// Kịch bản dữ liệu mẫu: 20 ngày làm ăn của chị Năm (Mỹ Xương, Cao Lãnh), dựng bằng lệnh thật qua nghiệp vụ nên luôn đúng luật.
// Có đơn ở đủ 13 trạng thái, lô ở mọi tình trạng, trao đổi, sổ vườn, tiền, dịch vụ, hỗ trợ.
import { ngayCua, TRANG_THAI, type Lenh, type NguoiLam, type SoGiaoDich, type TenBuoc, type ThamSoBuoc } from '@agiviet/nghiep-vu';
import { DichVu } from './dich-vu.ts';
import { dongHoCoDinh } from './dong-ho.ts';
import { damBaoNguoiMuaMau, DOI_TAC_BAO_TIEU_MAU, GIA_SAN_BAO_TIEU, NGUOI_BAN_KHAC, NGUOI_MUA_MAU, VAN_HANH_MAU } from './gia-lap.ts';
import { HE_THONG } from './he-thong.ts';
import { taoKhoBoNho } from './kho.ts';

export const NGUOI_BAN_MAU: NguoiLam = { vai: 'ban', id: 'ban-nam', ten: 'Chị Năm' };
const NGAY = 24 * 3600_000, GIO = 3600_000;

/** Bộ dựng: chạy lệnh trên kho bộ nhớ với đồng hồ đi tới từng bước; lệnh lỗi thì dừng ngay (kịch bản phải đúng luật). */
export class BoDung {
  readonly dongHo; readonly dv;
  constructor(batDau: number) {
    this.dongHo = dongHoCoDinh(batDau);
    this.dv = new DichVu(taoKhoBoNho(), this.dongHo);
  }
  lam(nguoi: NguoiLam, lenh: Lenh): string {
    const kq = this.dv.thucHien(nguoi, lenh);
    if (!kq.ok) throw new Error(`Kịch bản lỗi ở "${lenh.loai}" (${nguoi.ten}): ${kq.loi}`);
    return kq.giaTri ?? '';
  }
  buoc<B extends TenBuoc>(nguoi: NguoiLam, ma: string, buoc: B, ...thamSo: ThamSoBuoc[B]) { return this.lam(nguoi, { loai: 'buoc_don', ma, buoc, thamSo } as Lenh); }
  tua(ms: number) { this.dongHo.tua(ms); }
  ngay(themNgay = 0) { return ngayCua(this.dongHo.bayGio() + themNgay * NGAY); }
  get so(): SoGiaoDich { return this.dv.doc(); }
}

/** Người bán mẫu đăng ký, xác minh, có tài khoản nhận tiền. */
export function dangKyNguoiBanMau(b: BoDung, nguoi = NGUOI_BAN_MAU) {
  b.lam(nguoi, { loai: 'dang_ky', vai: 'ban', ten: nguoi.ten, sdt: '0918234421', vung: 'Mỹ Xương, Cao Lãnh, Đồng Tháp', loaiBan: 'ho' });
  b.lam(nguoi, { loai: 'cap_nhat_ho_so', diaChi: 'Ấp Mỹ Thạnh, xã Mỹ Xương', matHang: ['xoai-cat-chu', 'thanh-long-ruot-do', 'tom-the-chan-trang'] });
  b.lam(nguoi, { loai: 'gui_xac_minh', giayTo: 'can-cuoc-mat-truoc.jpg' });
  b.lam(VAN_HANH_MAU, { loai: 'duyet_xac_minh', nguoiDungId: nguoi.id, dongY: true });
  b.lam(nguoi, { loai: 'cap_nhat_tai_khoan_nhan', nganHang: 'Agribank Cao Lãnh', so: '7300205123456', chuTaiKhoan: 'NGUYEN THI NAM' });
}

/** Dựng kịch bản đầy đủ, kết thúc đúng lúc ketThuc (thường là giờ hiện tại). */
export function kichBanMau(ketThuc = Date.now()): SoGiaoDich {
  const b = new BoDung(ketThuc - 20 * NGAY);
  const N = NGUOI_BAN_MAU;
  const [DX, MT, UH] = NGUOI_MUA_MAU.map(m => m.nguoi) as [NguoiLam, NguoiLam, NguoiLam];
  dangKyNguoiBanMau(b);
  damBaoNguoiMuaMau(b.dv);
  b.lam(N, { loai: 'them_nguoi_giup', ten: 'Út Tâm (con gái)', sdt: '0909123123', quyen: 'thao_tac' });
  // Đầu ra cho hàng kém loại: Đồng Xanh nhận xoài loại 2, 3 cho sấy; Nhà máy Mekong là đối tác bao tiêu (giá sàn hàng dạt)
  const MK = DOI_TAC_BAO_TIEU_MAU;
  b.lam(MK.nguoi, { loai: 'dang_ky', vai: 'mua', ten: MK.nguoiLienHe, sdt: MK.sdt, vung: MK.vung, toChuc: { ten: MK.nguoi.ten, maSoThue: MK.maSoThue, loaiHinh: MK.loaiHinh } });
  b.lam(MK.nguoi, { loai: 'cap_nhat_ho_so', diaChi: MK.diaChi });
  b.lam(MK.nguoi, { loai: 'gui_xac_minh', giayTo: 'giay-phep-kinh-doanh.pdf' });
  b.lam(VAN_HANH_MAU, { loai: 'duyet_xac_minh', nguoiDungId: MK.nguoi.id, dongY: true });
  b.lam(VAN_HANH_MAU, { loai: 'dat_bao_tieu', nguoiDungId: MK.nguoi.id, bat: true, giaSan: GIA_SAN_BAO_TIEU, diemGom: 'Điểm gom chợ đầu mối Cao Lãnh, xe nhà máy tới lấy' });
  b.lam(MK.nguoi, { loai: 'cap_nhat_nhan_hang_kem_loai', bat: true, matHang: [], kgToiThieu: 300, vung: '' });
  b.lam(DX, { loai: 'cap_nhat_nhan_hang_kem_loai', bat: true, matHang: ['xoai-cat-chu', 'thanh-long-ruot-do'], kgToiThieu: 500, vung: '' });
  // Nhà máy sấy Đồng Xanh dùng gói Business, có kế toán và người mua hàng
  b.lam(DX, { loai: 'chon_goi', goi: 'business' });
  b.lam(DX, { loai: 'them_thanh_vien', ten: 'Anh Quang (kế toán)', sdt: '0909000457', quyen: 'ke_toan' });
  b.lam(DX, { loai: 'them_thanh_vien', ten: 'Chị Lan (mua hàng)', sdt: '0909000458', quyen: 'mua_hang' });
  // Hai người bán mẫu khác để bên mua có nhiều nguồn
  for (const k of NGUOI_BAN_KHAC) {
    b.lam(k.nguoi, { loai: 'dang_ky', vai: 'ban', ten: k.nguoi.ten, sdt: k.sdt, vung: k.vung, loaiBan: 'ho' });
    b.lam(k.nguoi, { loai: 'cap_nhat_ho_so', diaChi: k.diaChi, matHang: k.matHang });
    b.lam(k.nguoi, { loai: 'gui_xac_minh', giayTo: 'can-cuoc.jpg' });
    b.lam(VAN_HANH_MAU, { loai: 'duyet_xac_minh', nguoiDungId: k.nguoi.id, dongY: true });
  }

  // Sổ vườn
  const vX = b.lam(N, { loai: 'them_vuon', ten: 'Vườn xoài sau nhà', loaiVuon: 'vuon', dienTich: 12, donViDienTich: 'cong', cay: 'Xoài cát Chu', soGoc: 320, namTrong: 2014 });
  const vT = b.lam(N, { loai: 'them_vuon', ten: 'Ao tôm bờ kênh', loaiVuon: 'ao', dienTich: 4000, donViDienTich: 'm2', cay: 'Tôm thẻ chân trắng', soGoc: 0, namTrong: 2023 });
  const vuX = b.lam(N, { loai: 'them_mua_vu', vuonId: vX, ten: 'Xoài vụ nghịch 2026', batDau: b.ngay(-110), sanLuongUoc: 12000, haiDuKien: b.ngay(5) });
  b.lam(N, { loai: 'cap_nhat_mua_vu', muaVuId: vuX, giaiDoan: 'thu_hoach' });
  const vuT = b.lam(N, { loai: 'them_mua_vu', vuonId: vT, ten: 'Tôm vụ 2', batDau: b.ngay(-75), sanLuongUoc: 1800, haiDuKien: b.ngay(25) });
  b.lam(N, { loai: 'cap_nhat_mua_vu', muaVuId: vuT, giaiDoan: 'dau_trai' });
  const nk = (vuon: string, lui: number, loaiViec: 'phun_thuoc' | 'bon_phan' | 'tuoi' | 'cham_soc' | 'thu_hoach', noiDung: string, them: Record<string, unknown> = {}) =>
    b.lam(N, { loai: 'ghi_nhat_ky', vuonId: vuon, ngay: b.ngay(-lui), loaiViec, noiDung, ...them } as Lenh);
  nk(vX, 18, 'bon_phan', 'Bón phân NPK 20-20-15 nuôi trái', { vatTu: 'NPK 20-20-15', luong: '3 bao' });
  nk(vX, 16, 'phun_thuoc', 'Phun trừ rầy bông xoài', { vatTu: 'Thuốc trừ rầy gốc Thiamethoxam', luong: '2 bình 25 lít', ngayCachLy: 7 });
  nk(vX, 12, 'tuoi', 'Tưới rãnh, mực nước 20 cm');
  nk(vX, 8, 'cham_soc', 'Bao trái lô gần mương');
  nk(vT, 6, 'cham_soc', 'Thay 20% nước, bổ sung khoáng');
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 2_850_000, noiDung: 'Mua 3 bao phân NPK', ngay: b.ngay(-18), muaVuId: vuX });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 640_000, noiDung: 'Thuốc trừ rầy', ngay: b.ngay(-16), muaVuId: vuX });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 1_200_000, noiDung: 'Công bao trái 4 người', ngay: b.ngay(-8), muaVuId: vuX });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 4_500_000, noiDung: 'Thức ăn tôm 5 bao', ngay: b.ngay(-10), muaVuId: vuT });

  // Lô hàng
  const L1 = b.lam(N, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu', kg: 10000, coSo: 'uoc_tinh', gia: 25000, vuonId: vX, haiTu: b.ngay(0), haiDen: b.ngay(25), thuocTinh: { loai: 'Loại 1', co: '380', chin: 'Xanh già' }, anh: ['mango'], moTa: 'Xoài bao trái, vườn có nhật ký canh tác.' });
  const L2 = b.lam(N, { loai: 'dang_lo', matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ', kg: 3200, coSo: 'da_can', gia: 18000, thuocTinh: { loai: 'Loại 1', co: '450', chin: 'Chín tới' }, anh: ['dragon-fruit'] });
  const L3 = b.lam(N, { loai: 'dang_lo', matHang: 'tom-the-chan-trang', ten: 'Tôm thẻ chân trắng', kg: 1500, coSo: 'uoc_tinh', gia: 115000, vuonId: vT, thuocTinh: { 'con-kg': '45', tuoi: 'Sống', 'khang-sinh': 'Không dùng' }, anh: ['shrimp'] });
  const L4 = b.lam(N, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu (lô gộp tổ hợp tác)', kg: 6000, coSo: 'da_can', gia: 23000, choCheBien: true, thuocTinh: { loai: 'Loại 2' }, thanhPhan: [{ ho: 'Bà Tư Lành', kg: 2000 }, { ho: 'Anh Sáu Lộc', kg: 2500 }, { ho: 'Cô Ba Thủy', kg: 1500 }], anh: ['mango'] });
  b.tua(2 * NGAY);
  const kn = (mua: NguoiLam, lo: string) => { const k = b.lam(mua, { loai: 'gui_loi_moi', loId: lo }); b.lam(N, { loai: 'tra_loi_ket_noi', ketNoiId: k, dongY: true }); return k; };
  const kDX1 = kn(DX, L1), kMT1 = kn(MT, L1), kUH1 = kn(UH, L1), kDX2 = kn(DX, L2), kMT2 = kn(MT, L2), kUH2 = kn(UH, L2), kDX3 = kn(DX, L3), kMT3 = kn(MT, L3), kUH3 = kn(UH, L3), kDX4 = kn(DX, L4);
  void kMT2; void kDX3;
  b.lam(DX, { loai: 'gui_tin', ketNoiId: kDX1, noiDung: 'Chào chị Năm, bên em cần xoài cho đợt sấy giữa tháng.' });
  b.lam(N, { loai: 'gui_tin', ketNoiId: kDX1, noiDung: 'Chào em, xoài bao trái, tuần này hái được 3 tấn.' });
  b.lam(DX, { loai: 'gui_tin', ketNoiId: kDX1, noiDung: 'Chị gọi em 0277 386 210 hoặc Zalo cho nhanh nha.' });

  const tao = (mua: NguoiLam, lo: string, kg: number, gia: number, giao = 4, dk: { giaHaCap?: number; noiGiao?: 'tai_vuon' | 'tai_kho' } = {}) => b.lam(mua, { loai: 'tao_don', loId: lo, kg, gia, ngayGiao: b.ngay(giao), ...dk });
  const xn = (ma: string) => b.buoc(N, ma, 'xacNhanDon');
  const coc = (mua: NguoiLam, ma: string) => b.buoc(mua, ma, 'datCoc');
  const can = (mua: NguoiLam, ma: string, nhan: number, tuChoi = 0, haCap = 0) => { b.buoc(mua, ma, 'nhapKetQua', nhan, tuChoi, haCap, tuChoi ? ['anh-hang-khong-dat.jpg'] : []); };

  // Ba đơn đã xong sớm (uy tín, lô gộp, tiền về)
  const xongSom: string[] = [];
  for (const [mua, lo, kg, gia] of [[DX, L1, 1200, 24500], [MT, L2, 600, 18000], [DX, L4, 3000, 23000]] as const) {
    const ma = tao(mua, lo, kg, gia, 2); xn(ma); coc(mua, ma); xongSom.push(ma);
    b.tua(2 * NGAY); can(mua, ma, kg); b.buoc(N, ma, 'ketQuaDung');
    b.buoc(mua, ma, 'chuyenTienDamBao', b.so.don.find(d => d.ma === ma)!.conPhaiTra!); b.tua(GIO); b.buoc(HE_THONG, ma, 'giaiNgan');
    b.lam(mua, { loai: 'danh_gia', ma, diem: 5, nhanXet: 'Hàng đúng loại, giao đúng hẹn.' });
    b.lam(N, { loai: 'danh_gia', ma, diem: 5, nhanXet: 'Trả tiền nhanh.' });
  }
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 300_000, noiDung: 'Thuê người hái 1 buổi', ngay: b.ngay(-1), muaVuId: vuX });

  // Quá hạn cọc: xác nhận đã lâu, bên mua không cọc
  const quaHan = tao(UH, L3, 300, 112000, 6); xn(quaHan);
  // Hủy trước cọc
  const huy = tao(DX, L2, 200, 18500, 5); xn(huy); b.lam(DX, { loai: 'buoc_don', ma: huy, buoc: 'huyTruocCoc', thamSo: ['Đổi lịch sản xuất'] });
  b.tua(3 * NGAY);
  b.lam(HE_THONG, { loai: 'kiem_han' });

  // Hỗ trợ, dịch vụ
  const ht = b.lam(N, { loai: 'gui_ho_tro', chuDe: 'Tiền', noiDung: 'Cọc của đơn xoài đã vào tài khoản đảm bảo chưa?' });
  b.lam(VAN_HANH_MAU, { loai: 'tra_loi_ho_tro', hoTroId: ht, noiDung: 'Cọc đã vào tài khoản đảm bảo lúc 9:10, chị xem ở mục Tiền.', xong: true });

  // Tin cần mua của bên mua; người bán chào hàng
  b.lam(MT, { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu loại 1 xuất khẩu', kg: 8000, tu: b.ngay(3), den: b.ngay(25), giaTran: 27000, thuocTinh: { loai: 'Loại 1' }, ghiChu: 'Cần hồ sơ vùng trồng.' });
  const ncDX = b.lam(DX, { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: 'Xoài loại 2, 3 cho sấy dẻo', kg: 5000, tu: b.ngay(2), den: b.ngay(20), giaTran: 14000, thuocTinh: { loai: 'Loại 2' } });
  b.lam(UH, { loai: 'dang_nhu_cau', matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ cho chợ đầu mối', kg: 1500, tu: b.ngay(1), den: b.ngay(10) });
  // Nguồn khác: Anh Tư Bền (tôm), Cô Hai Thu (xoài loại 2 cho chế biến) chào hàng vào tin cần mua của Đồng Xanh
  const [TB, HT] = NGUOI_BAN_KHAC.map(k => k.nguoi) as [NguoiLam, NguoiLam];
  const loTB = b.lam(TB, { loai: 'dang_lo', matHang: 'tom-the-chan-trang', ten: 'Tôm thẻ size 40', kg: 2000, coSo: 'da_can', gia: 118000, thuocTinh: { 'con-kg': '40', tuoi: 'Sống', 'khang-sinh': 'Không dùng' }, anh: ['shrimp'], moTa: 'Ao bạt, có giấy kiểm nghiệm kháng sinh.' });
  const loHT = b.lam(HT, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu loại 2', kg: 5000, coSo: 'uoc_tinh', gia: 13500, choCheBien: true, thuocTinh: { loai: 'Loại 2' }, anh: ['mango'], moTa: 'Trái loại 2, 3 hợp sấy dẻo, hái theo đợt.' });
  b.lam(HT, { loai: 'chao_hang', nhuCauId: ncDX, loId: loHT, loiNhan: 'Bên em có 5 tấn loại 2, giao theo đợt được.' });
  const kTB = b.lam(DX, { loai: 'gui_loi_moi', loId: loTB, loiNhan: 'Bên em cần tôm sống cho đơn hàng đông lạnh.' });
  b.lam(TB, { loai: 'tra_loi_ket_noi', ketNoiId: kTB, dongY: true });
  b.lam(TB, { loai: 'gui_tin', ketNoiId: kTB, noiDung: 'Tôm size 40 đều, anh ghé ao xem được. Gọi em 0907 222 333 nha.' });
  // Quản lý của Đồng Xanh: mối quen ngoài app, đơn mua ngoài app, kế hoạch mua, kho
  b.lam(DX, { loai: 'nhap_moi_quen', danhSach: [
    { ten: 'Anh Sáu Lộc', sdt: '0918000771', vung: 'Mỹ Hiệp, Cao Lãnh', matHang: 'Xoài' },
    { ten: 'Chị Út Mai', sdt: '0918000772', vung: 'Châu Thành, Tiền Giang', matHang: 'Thanh long' },
    { ten: 'HTX Mỹ Xương', sdt: '0277386999', vung: 'Mỹ Xương, Cao Lãnh', matHang: 'Xoài' },
  ] });
  b.lam(DX, { loai: 'ghi_don_ngoai', nguoiBan: 'Anh Sáu Lộc', diaChiNguoiBan: 'Mỹ Hiệp, Cao Lãnh, Đồng Tháp', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu loại 2', kg: 2000, gia: 13000, ngay: b.ngay(-2), daTra: 15_000_000 });
  b.lam(DX, { loai: 'ghi_don_ngoai', nguoiBan: 'Chị Út Mai', diaChiNguoiBan: 'Châu Thành, Tiền Giang', matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ loại 2', kg: 800, gia: 12000, ngay: b.ngay(-1), daTra: 9_600_000 });
  const thangNay = ngayCua(ketThuc).slice(0, 7);
  const thangSau = ngayCua(ketThuc + 31 * NGAY).slice(0, 7);
  b.lam(DX, { loai: 'them_ke_hoach', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu', thang: thangNay, kgCan: 20000 });
  b.lam(DX, { loai: 'them_ke_hoach', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu', thang: thangSau, kgCan: 25000 });
  b.lam(DX, { loai: 'them_ke_hoach', matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ', thang: thangNay, kgCan: 3000 });
  for (const ma of xongSom.filter(m => b.so.don.find(d => d.ma === m)!.mua.id === DX.id)) {
    const d = b.so.don.find(x => x.ma === ma)!;
    b.lam(DX, { loai: 'nhap_kho', donMa: ma, phanLoai: d.tenLo.includes('gộp') ? 'Loại 2' : 'Loại 1', kg: d.ketQuaCan!.nhan, viTri: d.tenLo.includes('gộp') ? 'Kho lạnh B2' : 'Kho lạnh A1', ngayNhap: b.ngay(0), hanDung: b.ngay(20) });
  }
  const pk = b.so.kho.find(p => p.mua.id === DX.id && p.kg >= 3000);
  if (pk) b.lam(DX, { loai: 'xuat_kho', phieuId: pk.id, kg: 1200, ngay: b.ngay(0), ghiChu: 'Xuất cho chuyền sấy số 2' });

  // Các đơn đang chạy, mỗi trạng thái một đơn: dồn vào 1,5 ngày cuối để không quá hạn khi nạp
  b.dongHo.dat(ketThuc - 1.5 * NGAY);
  const choXacNhan = tao(DX, L2, 1000, 18000, 5);                                                   // cho_ban_xac_nhan
  const tuChoi = tao(UH, L1, 500, 22000, 4); b.buoc(N, tuChoi, 'tuChoiDon', 'Giá thấp hơn giá đã chào');   // ban_tu_choi
  const choGiao = tao(DX, L1, 2000, 25000, 4); xn(choGiao); coc(DX, choGiao);                       // cho_giao (+ ứng tiền, đề nghị đổi lịch)
  const ut = b.lam(N, { loai: 'xin_ung_tien', donMa: choGiao, so: 30_000_000 }); b.tua(GIO); b.lam(HE_THONG, { loai: 'duyet_ung_tien', ungTienId: ut, dongY: true });
  const choHuy = tao(MT, L3, 400, 118000, 5); xn(choHuy); coc(MT, choHuy); b.buoc(MT, choHuy, 'yeuCauHuy', 'Khách nước ngoài lùi đơn'); // cho_dong_y_huy
  const choKq = tao(DX, L1, 1000, 25000, 1, { giaHaCap: 15000 }); xn(choKq); coc(DX, choKq);     // hợp đồng có giá hạ cấp
  const daChot = tao(MT, L2, 800, 18200, 1, { giaHaCap: 11000, noiGiao: 'tai_kho' }); xn(daChot); coc(MT, daChot);
  const dangGiu = tao(DX, L1, 500, 25000, 1); xn(dangGiu); coc(DX, dangGiu);
  const baoTra = tao(UH, L2, 600, 17500, 1); xn(baoTra); coc(UH, baoTra);
  const chuaThay = tao(MT, L1, 700, 26000, 1); xn(chuaThay); coc(MT, chuaThay);
  b.tua(NGAY);
  can(DX, choKq, 900, 20, 80);                                                                      // cho_ban_xn_kq (3 phần)
  can(MT, daChot, 740, 20, 40); b.buoc(N, daChot, 'ketQuaDung');                                    // da_chot (có hàng trả lại)
  can(DX, dangGiu, 500); b.buoc(N, dangGiu, 'ketQuaDung');
  can(UH, baoTra, 600); b.buoc(N, baoTra, 'ketQuaDung');
  can(MT, chuaThay, 690, 10); b.buoc(N, chuaThay, 'ketQuaDung');
  const con = (ma: string) => b.so.don.find(d => d.ma === ma)!.conPhaiTra!;
  b.buoc(UH, baoTra, 'baoDaTra', Math.round(con(baoTra) / 2));                                     // bao_da_tra (trả thiếu)
  b.buoc(MT, chuaThay, 'baoDaTra', con(chuaThay)); b.buoc(N, chuaThay, 'tienChua');                 // chua_thay_tien
  b.buoc(MT, chuaThay, 'guiChungTu', `Ủy nhiệm chi ${con(chuaThay).toLocaleString('vi-VN')} đ`);
  b.buoc(N, chuaThay, 'ghiDoiSoat', 'Đã xem sổ Agribank tới 15 giờ, chưa thấy tiền');
  b.tua(2 * GIO);
  b.lam(DX, { loai: 'de_nghi_don', ma: choGiao, deNghi: 'doi_lich', giaTri: b.ngay(5), lyDo: 'Xe lạnh bên em kẹt lịch, xin dời 1 ngày' });
  const choCoc = tao(MT, L1, 1500, 25500, 4); xn(choCoc);                                           // cho_coc
  // Giá thấp bất thường (dưới 60% giá tham khảo xoài loại 1): chờ chị Năm xác nhận thêm khi ký
  tao(UH, L1, 500, 13000, 5);
  b.lam(MT, { loai: 'gui_bao_gia', ketNoiId: kMT1, gia: 25000, kg: 2000, ngayGiao: b.ngay(8), ghiChu: 'Lấy thêm 2 tấn đợt sau nếu đạt loại 1.' });
  b.lam(N, { loai: 'gui_bao_gia', ketNoiId: kUH2, gia: 18500, kg: 500, ngayGiao: b.ngay(4) });
  b.lam(UH, { loai: 'de_nghi_hen', ketNoiId: kUH1, luc: `${b.ngay(1)}T08:30`, ghiChu: 'Cô ghé xem trái trên cây.' });
  b.lam(UH, { loai: 'gui_tin', ketNoiId: kUH3, noiDung: 'Tôm size 45 bên cô lấy 300 ký, cháu để lại cô nha.' });
  const dv1 = b.lam(N, { loai: 'yeu_cau_dich_vu', dichVu: 'kiem_dinh', ngay: b.ngay(2), loId: L1, ghiChu: 'Kiểm dư lượng thuốc lô xoài' });
  b.lam(HE_THONG, { loai: 'bao_gia_dich_vu', yeuCauId: dv1, doiTac: 'Trung tâm Kiểm nghiệm Cần Thơ', gia: 1_200_000 });
  b.lam(N, { loai: 'dat_dich_vu', yeuCauId: dv1 });
  void kMT3; void kDX4;
  // Lô sắp có hàng và lô sắp tự ẩn (đăng 13 ngày trước, chưa xác nhận còn hàng)
  b.tua(GIO);
  const L5 = b.lam(N, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu vụ chính', kg: 15000, coSo: 'uoc_tinh', gia: null, haiTu: b.ngay(40), haiDen: b.ngay(70), vuonId: vX, moTa: 'Sắp có hàng: nhận đặt trước.', anh: ['mango'] });
  void L5;
  const L6 = b.lam(N, { loai: 'dang_lo', matHang: 'chanh-day', ten: 'Chanh dây', kg: 800, coSo: 'da_can', gia: 21000, anh: ['passion-fruit'] });
  // Tuần cuối: một đơn tôm vừa xong tiền về, vài khoản chi; chị Năm xác nhận còn hàng các lô đang bán
  const tomXong = tao(DX, L3, 200, 115000, 0); xn(tomXong); coc(DX, tomXong); can(DX, tomXong, 200); b.buoc(N, tomXong, 'ketQuaDung');
  b.buoc(DX, tomXong, 'chuyenTienDamBao', con(tomXong)); b.tua(GIO); b.buoc(HE_THONG, tomXong, 'giaiNgan');
  b.lam(DX, { loai: 'danh_gia', ma: tomXong, diem: 5, nhanXet: 'Tôm sống, đúng size.' });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 1_800_000, noiDung: 'Thức ăn tôm 2 bao', ngay: b.ngay(-2), muaVuId: vuT });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 450_000, noiDung: 'Xăng chạy máy bơm', ngay: b.ngay(-4), muaVuId: vuX });
  b.lam(N, { loai: 'ghi_thu_chi', loaiTien: 'thu', so: 2_000_000, noiDung: 'Bán chuối ở chợ', ngay: b.ngay(-3) });
  // Hàng kém loại: tách 800 kg xoài loại 2 (trái nhỏ, trầy) khỏi lô loại 1 và bật bán gấp; một lô thanh long dạt chưa ai hỏi
  const L7 = b.lam(N, { loai: 'tach_lo', loId: L1, phan: [{ loai: 'loai_2', kg: 800, gia: 12000 }] });
  b.lam(N, { loai: 'sua_lo', loId: L7, moTa: 'Trái nhỏ, trầy da, ngọt như loại 1. Hợp sấy dẻo, làm nước ép.' });
  b.lam(N, { loai: 'bat_ban_gap', loId: L7 });
  const L8 = b.lam(N, { loai: 'dang_lo', matHang: 'thanh-long-ruot-do', ten: 'Thanh long ruột đỏ hàng dạt', kg: 400, coSo: 'da_can', gia: null, loaiHang: 'dat', anh: ['dragon-fruit'], moTa: 'Trái nhỏ dưới 300 g, nám nhẹ.' });
  for (const l of [L1, L2, L3, L4]) b.dv.thucHien(N, { loai: 'con_hang', loId: l });   // lô đã chốt hết thì bỏ qua
  const so = b.so;
  const lo8 = so.lo.find(l => l.id === L8)!; lo8.dangLuc -= 2 * NGAY; lo8.conHangLuc -= 2 * NGAY;      // đăng 2 ngày, chưa ai hỏi: app gợi ý bán gấp
  const lo6 = so.lo.find(l => l.id === L6)!; lo6.conHangLuc -= 13 * NGAY; lo6.dangLuc -= 13 * NGAY;   // mô phỏng tin đã đăng 13 ngày
  // Dồn giờ tới đúng ketThuc
  b.dongHo.dat(ketThuc);
  // Một đơn vừa chuyển tiền vào tài khoản đảm bảo, ngân hàng chưa giải ngân (tien_dang_giu)
  b.buoc(DX, dangGiu, 'chuyenTienDamBao', con(dangGiu));
  const kq = b.so;
  const thieu = TRANG_THAI.filter(t => !kq.don.some(d => d.trangThai === t));
  if (thieu.length) throw new Error('Kịch bản thiếu trạng thái: ' + thieu.join(', '));
  return kq;
}
