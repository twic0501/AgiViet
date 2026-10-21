// Kịch bản dữ liệu mẫu: 20 ngày làm ăn của chị Năm (Mỹ Xương, Cao Lãnh), dựng bằng lệnh thật qua nghiệp vụ nên luôn đúng luật.
// Có đơn ở đủ 13 trạng thái, lô ở mọi tình trạng, trao đổi, sổ vườn, tiền, dịch vụ, hỗ trợ.
import { ngayCua, TRANG_THAI, type Lenh, type NguoiLam, type SoGiaoDich, type TenBuoc, type ThamSoBuoc } from '@agiviet/nghiep-vu';
import { DichVu } from './dich-vu.ts';
import { dongHoCoDinh } from './dong-ho.ts';
import { damBaoNguoiMuaMau, NGUOI_MUA_MAU, VAN_HANH_MAU } from './gia-lap.ts';
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

  const tao = (mua: NguoiLam, lo: string, kg: number, gia: number, giao = 4) => b.lam(mua, { loai: 'tao_don', loId: lo, kg, gia, ngayGiao: b.ngay(giao) });
  const xn = (ma: string) => b.buoc(N, ma, 'xacNhanDon');
  const coc = (mua: NguoiLam, ma: string) => b.buoc(mua, ma, 'datCoc');
  const can = (mua: NguoiLam, ma: string, nhan: number, tuChoi = 0) => { b.buoc(mua, ma, 'nhapKetQua', nhan, tuChoi); };

  // Ba đơn đã xong sớm (uy tín, lô gộp, tiền về)
  for (const [mua, lo, kg, gia] of [[DX, L1, 1200, 24500], [MT, L2, 600, 18000], [DX, L4, 3000, 23000]] as const) {
    const ma = tao(mua, lo, kg, gia, 2); xn(ma); coc(mua, ma);
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
  void ncDX;

  // Các đơn đang chạy, mỗi trạng thái một đơn: dồn vào 1,5 ngày cuối để không quá hạn khi nạp
  b.dongHo.dat(ketThuc - 1.5 * NGAY);
  const choXacNhan = tao(DX, L2, 1000, 18000, 5);                                                   // cho_ban_xac_nhan
  const tuChoi = tao(UH, L1, 500, 22000, 4); b.buoc(N, tuChoi, 'tuChoiDon', 'Giá thấp hơn giá đã chào');   // ban_tu_choi
  const choGiao = tao(DX, L1, 2000, 25000, 4); xn(choGiao); coc(DX, choGiao);                       // cho_giao (+ ứng tiền, đề nghị đổi lịch)
  const ut = b.lam(N, { loai: 'xin_ung_tien', donMa: choGiao, so: 30_000_000 }); b.tua(GIO); b.lam(HE_THONG, { loai: 'duyet_ung_tien', ungTienId: ut, dongY: true });
  const choHuy = tao(MT, L3, 400, 118000, 5); xn(choHuy); coc(MT, choHuy); b.buoc(MT, choHuy, 'yeuCauHuy', 'Khách nước ngoài lùi đơn'); // cho_dong_y_huy
  const choKq = tao(DX, L1, 1000, 25000, 1); xn(choKq); coc(DX, choKq);
  const daChot = tao(MT, L2, 800, 18200, 1); xn(daChot); coc(MT, daChot);
  const dangGiu = tao(DX, L1, 500, 25000, 1); xn(dangGiu); coc(DX, dangGiu);
  const baoTra = tao(UH, L2, 600, 17500, 1); xn(baoTra); coc(UH, baoTra);
  const chuaThay = tao(MT, L1, 700, 26000, 1); xn(chuaThay); coc(MT, chuaThay);
  b.tua(NGAY);
  can(DX, choKq, 980, 20);                                                                          // cho_ban_xn_kq
  can(MT, daChot, 800); b.buoc(N, daChot, 'ketQuaDung');                                            // da_chot
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
  const so = b.so;
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
