// Ca kiểm thử của app bán (giai đoạn 1): mỗi ca dựng tình huống trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng,
// ghi từng điểm kiểm, và chỉ màn nên mở để xem kết quả. Dùng chung cho Vitest và màn "Phòng thử" trong app.
import { chiaTienLoGop, loiLoVu, tienNguoiBan, uyTin, type Lenh, type NguoiLam, type SoGiaoDich, type TenBuoc, type ThamSoBuoc } from '@agiviet/nghiep-vu';
import { NGUOI_MUA_MAU } from './gia-lap.ts';
import { HE_THONG } from './he-thong.ts';
import { BoDung, dangKyNguoiBanMau, NGUOI_BAN_MAU } from './kich-ban.ts';
import { damBaoNguoiMuaMau, VAN_HANH_MAU } from './gia-lap.ts';
import { lienLacCua } from './truy-van.ts';

const NGAY = 24 * 3600_000;

export class PhienThu extends BoDung {
  readonly ban = NGUOI_BAN_MAU;
  readonly mua = NGUOI_MUA_MAU.map(m => m.nguoi) as [NguoiLam, NguoiLam, NguoiLam];
  readonly kiemTra: { moTa: string; dat: boolean; chiTiet?: string }[] = [];
  /** Màn mở để xem kết quả (đường dẫn trong app bán, không có /ban). */
  man = 'hom-nay';
  constructor(dangKyBan = true) {
    super(Date.now() - 2 * NGAY);
    damBaoNguoiMuaMau(this.dv);
    if (dangKyBan) dangKyNguoiBanMau(this);
  }
  /** Chạy lệnh, không dừng khi lỗi: trả { ma } hoặc { loi }. */
  thu(nguoi: NguoiLam, lenh: Lenh): { ma?: string; loi?: string } {
    const kq = this.dv.thucHien(nguoi, lenh);
    return kq.ok ? { ma: kq.giaTri ?? '' } : { loi: kq.loi };
  }
  thuBuoc<B extends TenBuoc>(nguoi: NguoiLam, ma: string, buoc: B, ...thamSo: ThamSoBuoc[B]) { return this.thu(nguoi, { loai: 'buoc_don', ma, buoc, thamSo } as Lenh); }
  kiem(moTa: string, dat: boolean, chiTiet?: string) { this.kiemTra.push({ moTa, dat, ...(chiTiet ? { chiTiet } : {}) }); }
  /** Lỗi phải xảy ra (bị chặn), và lời báo chứa đoạn chữ cho trước. */
  kiemBiChan(moTa: string, kq: { loi?: string }, chua?: RegExp) { this.kiem(moTa, !!kq.loi && (!chua || chua.test(kq.loi)), kq.loi ?? 'không bị chặn'); }
  kiemDuoc(moTa: string, kq: { loi?: string }) { this.kiem(moTa, !kq.loi, kq.loi); }
  // Tiện ích dựng nhanh
  lo(kg = 4000, them: Partial<Extract<Lenh, { loai: 'dang_lo' }>> = {}) { return this.lam(this.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu', kg, coSo: 'da_can', gia: 25000, ...them }); }
  ketNoi(lo: string, mua = this.mua[0]) { const k = this.lam(mua, { loai: 'gui_loi_moi', loId: lo }); this.lam(this.ban, { loai: 'tra_loi_ket_noi', ketNoiId: k, dongY: true }); return k; }
  don(lo: string, kg: number, mua = this.mua[0], gia = 25000) { return this.lam(mua, { loai: 'tao_don', loId: lo, kg, gia, ngayGiao: this.ngay(3) }); }
  donDaCoc(lo: string, kg: number, mua = this.mua[0]) { const ma = this.don(lo, kg, mua); this.buoc(this.ban, ma, 'xacNhanDon'); this.buoc(mua, ma, 'datCoc'); return ma; }
  donChot(lo: string, kg: number, nhan = kg, mua = this.mua[0]) { const ma = this.donDaCoc(lo, kg, mua); this.buoc(mua, ma, 'nhapKetQua', nhan, kg - nhan, 0, kg > nhan ? ['anh-hang-khong-dat.jpg'] : []); this.buoc(this.ban, ma, 'ketQuaDung'); return ma; }
  d(ma: string) { return this.so.don.find(x => x.ma === ma)!; }
  l(id: string) { return this.so.lo.find(x => x.id === id)!; }
}

export interface CaKiemThu {
  ma: string;
  nhom: string;
  ten: string;
  /** Kỳ vọng, viết cho người kiểm thử đọc. */
  kyVong: string;
  chay: (t: PhienThu) => void;
}

export interface KetQuaCa {
  ca: CaKiemThu;
  dat: boolean;
  kiemTra: PhienThu['kiemTra'];
  loi?: string;
  so?: SoGiaoDich;
  man: string;
}

export function chayCa(ca: CaKiemThu): KetQuaCa {
  const t = new PhienThu(ca.ma !== 'B01');
  try {
    ca.chay(t);
    return { ca, dat: t.kiemTra.length > 0 && t.kiemTra.every(k => k.dat), kiemTra: t.kiemTra, so: t.so, man: t.man };
  } catch (e) {
    return { ca, dat: false, kiemTra: t.kiemTra, loi: (e as Error).message, man: t.man };
  }
}

export const CA_KIEM_THU_BAN: CaKiemThu[] = [
  /* ---------- Tài khoản ---------- */
  { ma: 'B01', nhom: 'Tài khoản', ten: 'Đăng ký người bán', kyVong: 'Số điện thoại sai bị chặn; đăng ký đúng thì có hồ sơ, chờ xác minh khi gửi căn cước.', chay(t) {
    t.kiemBiChan('Số điện thoại 5 chữ số bị chặn', t.thu(t.ban, { loai: 'dang_ky', vai: 'ban', ten: 'Chị Năm', sdt: '09182' }), /10 hoặc 11/);
    t.kiemDuoc('Đăng ký với số 0918 234 421', t.thu(t.ban, { loai: 'dang_ky', vai: 'ban', ten: 'Chị Năm', sdt: '0918 234 421', vung: 'Mỹ Xương, Cao Lãnh' }));
    t.kiemBiChan('Đăng ký lần hai bị chặn', t.thu(t.ban, { loai: 'dang_ky', vai: 'ban', ten: 'Chị Năm', sdt: '0918234421' }));
    t.thu(t.ban, { loai: 'gui_xac_minh', giayTo: 'cccd.jpg' });
    t.kiem('Hồ sơ chuyển sang chờ duyệt', t.so.nguoiDung.find(n => n.id === t.ban.id)?.xacMinh === 'cho_duyet');
    t.man = 'xac-minh';
  } },
  { ma: 'B02', nhom: 'Tài khoản', ten: 'Tài khoản nhận tiền đúng tên', kyVong: 'Tài khoản đứng tên người khác bị chặn; đúng tên thì lưu.', chay(t) {
    t.kiemBiChan('Chủ tài khoản "TRAN VAN TU" bị chặn', t.thu(t.ban, { loai: 'cap_nhat_tai_khoan_nhan', nganHang: 'VCB', so: '0123456789', chuTaiKhoan: 'TRAN VAN TU' }), /trùng tên/);
    t.kiemDuoc('Chủ tài khoản "NGUYEN THI NAM" được lưu', t.thu(t.ban, { loai: 'cap_nhat_tai_khoan_nhan', nganHang: 'VCB', so: '0123456789', chuTaiKhoan: 'NGUYEN THI NAM' }));
    t.man = 'tai-khoan-nhan';
  } },
  { ma: 'B03', nhom: 'Tài khoản', ten: 'Người giúp (con cháu)', kyVong: 'Tối đa 3 người, khác số chủ tài khoản.', chay(t) {
    t.kiemBiChan('Trùng số chủ tài khoản bị chặn', t.thu(t.ban, { loai: 'them_nguoi_giup', ten: 'Út', sdt: '0918234421', quyen: 'xem' }));
    for (const s of ['0909000001', '0909000002', '0909000003']) t.thu(t.ban, { loai: 'them_nguoi_giup', ten: 'Con', sdt: s, quyen: 'thao_tac' });
    t.kiemBiChan('Người thứ 4 bị chặn', t.thu(t.ban, { loai: 'them_nguoi_giup', ten: 'Cháu', sdt: '0909000004', quyen: 'xem' }), /Tối đa 3/);
    t.man = 'nguoi-giup';
  } },
  { ma: 'B04', nhom: 'Tài khoản', ten: 'Tài khoản bị khóa', kyVong: 'Bị khóa thì mọi thao tác bị chặn, lời báo nêu lý do.', chay(t) {
    t.lam(VAN_HANH_MAU, { loai: 'khoa_tai_khoan', nguoiDungId: t.ban.id, lyDo: 'Nghi đăng tin trùng' });
    t.kiemBiChan('Đăng lô khi bị khóa bị chặn', t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 }), /tạm khóa/);
    t.lam(VAN_HANH_MAU, { loai: 'mo_khoa_tai_khoan', nguoiDungId: t.ban.id });
    t.kiemDuoc('Mở khóa thì đăng được', t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 }));
  } },
  /* ---------- Lô hàng ---------- */
  { ma: 'B05', nhom: 'Lô hàng', ten: 'Đăng lô thường', kyVong: 'Lô hiện cho bên mua, đủ thuộc tính chia loại.', chay(t) {
    const lo = t.lo(5000, { thuocTinh: { loai: 'Loại 1', co: '380' }, choCheBien: false });
    t.kiem('Lô có trong danh sách', t.l(lo)?.kg === 5000 && t.l(lo).thuocTinh.loai === 'Loại 1');
    t.kiemDuoc('Bên mua gửi được lời mời', t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: lo }));
    t.man = `chi-tiet-lo?lo=${lo}`;
  } },
  { ma: 'B06', nhom: 'Lô hàng', ten: 'Chặn đăng bán khi đang cách ly thuốc', kyVong: 'Vườn vừa phun thuốc cách ly 7 ngày: đăng bán hái hôm nay bị chặn; hái sau hạn thì được.', chay(t) {
    const v = t.lam(t.ban, { loai: 'them_vuon', ten: 'Vườn sau nhà', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài', soGoc: 300 });
    t.lam(t.ban, { loai: 'ghi_nhat_ky', vuonId: v, ngay: t.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun trừ rầy', vatTu: 'Thuốc A', ngayCachLy: 7 });
    t.kiemBiChan('Hái hôm nay bị chặn', t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: 1000, coSo: 'uoc_tinh', gia: null, vuonId: v }), /cách ly/);
    t.kiemDuoc('Hái từ ngày hết cách ly thì được', t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: 1000, coSo: 'uoc_tinh', gia: null, vuonId: v, haiTu: t.ngay(7) }));
    t.man = 'cach-ly';
  } },
  { ma: 'B07', nhom: 'Lô hàng', ten: 'Lô gộp nhiều hộ', kyVong: 'Tổng phần các hộ khác lượng lô bị chặn; đúng thì đăng được.', chay(t) {
    t.kiemBiChan('Tổng 2.500 kg khác 3.000 kg bị chặn', t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài HTX', kg: 3000, coSo: 'da_can', gia: 20000, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1500 }] }), /phải bằng/);
    const kq = t.thu(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài HTX', kg: 2500, coSo: 'da_can', gia: 20000, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1500 }] });
    t.kiemDuoc('Tổng đúng thì đăng được', kq);
    t.man = 'lo-gop';
  } },
  { ma: 'B08', nhom: 'Lô hàng', ten: 'Tin tự ẩn sau 14 ngày', kyVong: 'Không xác nhận còn hàng 14 ngày thì bên mua không thấy; bấm "Vẫn còn hàng" thì hiện lại.', chay(t) {
    const lo = t.lo();
    t.tua(15 * NGAY);
    t.kiemBiChan('Bên mua gửi lời mời lô đã ẩn bị chặn', t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: lo }), /ẩn/);
    t.lam(t.ban, { loai: 'con_hang', loId: lo });
    t.kiemDuoc('Xác nhận còn hàng thì bên mua mời được', t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: lo }));
    t.man = 'hang';
  } },
  { ma: 'B09', nhom: 'Lô hàng', ten: 'Báo lượng còn lại thấp hơn đã hứa', kyVong: 'Được ghi (mưa bão rụng trái), thỏa thuận cũ giữ nguyên, lượng còn bán về 0.', chay(t) {
    const lo = t.lo(4000); t.ketNoi(lo); t.donDaCoc(lo, 3000);
    t.kiemDuoc('Ghi lượng mới 2.500 kg', t.thu(t.ban, { loai: 'cap_nhat_luong', loId: lo, kg: 2500, coSo: 'da_can' }));
    t.kiem('Đã hứa vẫn 3.000 kg', t.l(lo).hua === 3000);
    t.man = `chi-tiet-lo?lo=${lo}`;
  } },
  /* ---------- Khách ---------- */
  { ma: 'B10', nhom: 'Khách', ten: 'Trả lời lời mời kết nối', kyVong: 'Đồng ý hoặc từ chối một lần; trả lời lần hai bị chặn.', chay(t) {
    const lo = t.lo();
    const k1 = t.lam(t.mua[0], { loai: 'gui_loi_moi', loId: lo }), k2 = t.lam(t.mua[1], { loai: 'gui_loi_moi', loId: lo });
    t.kiemDuoc('Đồng ý lời mời 1', t.thu(t.ban, { loai: 'tra_loi_ket_noi', ketNoiId: k1, dongY: true }));
    t.kiemDuoc('Từ chối lời mời 2', t.thu(t.ban, { loai: 'tra_loi_ket_noi', ketNoiId: k2, dongY: false }));
    t.kiemBiChan('Trả lời lần hai bị chặn', t.thu(t.ban, { loai: 'tra_loi_ket_noi', ketNoiId: k1, dongY: false }), /đã được/);
    t.man = 'khach';
  } },
  { ma: 'B11', nhom: 'Khách', ten: 'Chào hàng vào tin cần mua', kyVong: 'Người bán chọn lô chào hàng; bên mua đồng ý thì thành kết nối.', chay(t) {
    const nc = t.lam(t.mua[0], { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: 'Xoài loại 2 cho sấy', kg: 3000, tu: t.ngay(1), den: t.ngay(15) });
    const lo = t.lo();
    const kn = t.thu(t.ban, { loai: 'chao_hang', nhuCauId: nc, loId: lo });
    t.kiemDuoc('Chào hàng được', kn);
    t.kiemBiChan('Chào lần hai bị chặn', t.thu(t.ban, { loai: 'chao_hang', nhuCauId: nc, loId: lo }));
    t.lam(t.mua[0], { loai: 'tra_loi_ket_noi', ketNoiId: kn.ma!, dongY: true });
    t.kiem('Kết nối đã đồng ý', t.so.ketNoi.find(k => k.id === kn.ma)?.trangThai === 'dong_y');
    t.man = 'nhu-cau';
  } },
  { ma: 'B12', nhom: 'Khách', ten: 'Che liên lạc trong tin nhắn', kyVong: 'Trước khi cọc, số điện thoại và Zalo bị che; sau khi cọc thì hiện.', chay(t) {
    const lo = t.lo(); const kn = t.ketNoi(lo);
    t.lam(t.mua[0], { loai: 'gui_tin', ketNoiId: kn, noiDung: 'Chị gọi em 0277 386 210 hoặc Zalo nha' });
    const tin = t.so.tinNhan.at(-1)!;
    t.kiem('Số và Zalo bị che', tin.noiDung === 'Chị gọi em ••• hoặc ••• nha' && tin.biChe.length === 2, tin.noiDung);
    t.donDaCoc(lo, 1000);
    t.lam(t.mua[0], { loai: 'gui_tin', ketNoiId: kn, noiDung: 'Số em 0277 386 210' });
    t.kiem('Sau cọc không che', t.so.tinNhan.at(-1)!.noiDung === 'Số em 0277 386 210');
    t.man = `chat?kn=${kn}`;
  } },
  { ma: 'B13', nhom: 'Khách', ten: 'Báo giá thành đơn', kyVong: 'Người bán gửi báo giá; bên mua chốt; đơn tạo theo đúng giá, lượng, ngày.', chay(t) {
    const lo = t.lo(); const kn = t.ketNoi(lo);
    const bg = t.lam(t.ban, { loai: 'gui_bao_gia', ketNoiId: kn, gia: 26000, kg: 2000, ngayGiao: t.ngay(4) });
    t.kiemBiChan('Chưa chốt thì chưa tạo đơn được', t.thu(t.mua[0], { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg }));
    t.lam(t.mua[0], { loai: 'tra_loi_bao_gia', baoGiaId: bg, dongY: true });
    const ma = t.lam(t.mua[0], { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg });
    t.kiem('Đơn đúng 2.000 kg × 26.000 đ', t.d(ma).kg === 2000 && t.d(ma).gia === 26000);
    t.man = `bao-gia?kn=${kn}`;
  } },
  { ma: 'B14', nhom: 'Khách', ten: 'Hẹn xem vườn', kyVong: 'Bên mua đề nghị giờ hẹn; người bán đồng ý; không hẹn vào quá khứ.', chay(t) {
    const lo = t.lo(); const kn = t.ketNoi(lo);
    t.kiemBiChan('Hẹn vào quá khứ bị chặn', t.thu(t.mua[0], { loai: 'de_nghi_hen', ketNoiId: kn, luc: `${t.ngay(-1)}T08:00` }), /tương lai/);
    const h = t.lam(t.mua[0], { loai: 'de_nghi_hen', ketNoiId: kn, luc: `${t.ngay(1)}T08:00` });
    t.kiemDuoc('Người bán đồng ý', t.thu(t.ban, { loai: 'tra_loi_hen', henId: h, dongY: true }));
    t.man = `hen-xem?kn=${kn}`;
  } },
  /* ---------- Đơn ---------- */
  { ma: 'B15', nhom: 'Đơn', ten: 'Xác nhận đơn: giữ lượng, tính cọc và phí', kyVong: '4.000 kg × 25.000 đ: cọc 10 triệu, phí giới thiệu 1 triệu, lượng bị giữ.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 4000);
    t.kiemDuoc('Xác nhận đơn', t.thuBuoc(t.ban, ma, 'xacNhanDon'));
    t.kiem('Cọc 10.000.000 đ, phí 1.000.000 đ', t.d(ma).coc?.so === 10_000_000 && t.d(ma).coc?.phi === 1_000_000);
    t.kiem('Lô đã hứa 4.000 kg', t.l(lo).hua === 4000);
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B16', nhom: 'Đơn', ten: 'Chặn bán lố', kyVong: 'Hai đơn 3.000 kg cho lô 4.000 kg: xác nhận đơn thứ hai bị chặn.', chay(t) {
    const lo = t.lo(4000); t.ketNoi(lo); t.ketNoi(lo, t.mua[1]);
    const a = t.don(lo, 3000), b = t.don(lo, 3000, t.mua[1]);
    t.buoc(t.ban, a, 'xacNhanDon');
    t.kiemBiChan('Đơn thứ hai bị chặn', t.thuBuoc(t.ban, b, 'xacNhanDon'), /chỉ còn bán được 1\.000 kg/);
    t.man = 'lich';
  } },
  { ma: 'B17', nhom: 'Đơn', ten: 'Bấm xác nhận hai lần', kyVong: 'Lần hai bị chặn, lượng chỉ giữ một lần.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 2000);
    t.buoc(t.ban, ma, 'xacNhanDon');
    t.kiemBiChan('Lần hai bị chặn', t.thuBuoc(t.ban, ma, 'xacNhanDon'));
    t.kiem('Đã hứa đúng 2.000 kg', t.l(lo).hua === 2000);
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B18', nhom: 'Đơn', ten: 'Từ chối đơn', kyVong: 'Đơn đóng, lượng không bị giữ, lý do lưu lại.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 2000);
    t.kiemDuoc('Từ chối', t.thuBuoc(t.ban, ma, 'tuChoiDon', 'Giá thấp'));
    t.kiem('Đơn "Người bán từ chối", lô không giữ', t.d(ma).trangThai === 'ban_tu_choi' && t.l(lo).hua === 0);
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B19', nhom: 'Đơn', ten: 'Liên lạc mở sau khi cọc', kyVong: 'Trước cọc không thấy số bên mua; sau cọc thấy.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 1000); t.buoc(t.ban, ma, 'xacNhanDon');
    t.kiem('Trước cọc: chưa có liên lạc', lienLacCua(t.so, t.ban, t.mua[0].id) === null);
    t.buoc(t.mua[0], ma, 'datCoc');
    t.kiem('Sau cọc: thấy số bên mua', lienLacCua(t.so, t.ban, t.mua[0].id)?.sdt === '0277386210');
    t.man = `mo-lien-lac?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B20', nhom: 'Đơn', ten: 'Quá hạn cọc', kyVong: 'Quá 48 giờ chưa cọc: hệ thống đóng đơn, trả lượng cho lô.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 1000); t.buoc(t.ban, ma, 'xacNhanDon');
    t.tua(49 * 3600_000);
    t.kiemBiChan('Bên mua cọc trễ bị chặn', t.thuBuoc(t.mua[0], ma, 'datCoc'), /quá hạn/);
    t.lam(HE_THONG, { loai: 'kiem_han' });
    t.kiem('Đơn quá hạn, trả lượng', t.d(ma).trangThai === 'qua_han' && t.l(lo).hua === 0);
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B21', nhom: 'Đơn', ten: 'Hủy trước khi cọc', kyVong: 'Người bán hủy được ngay, lượng trả về lô.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.don(lo, 1000); t.buoc(t.ban, ma, 'xacNhanDon');
    t.kiemDuoc('Hủy', t.thuBuoc(t.ban, ma, 'huyTruocCoc', 'Trái bị nứt'));
    t.kiem('Đơn hủy, lô không giữ', t.d(ma).trangThai === 'da_huy' && t.l(lo).hua === 0);
    t.man = `huy-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B22', nhom: 'Đơn', ten: 'Bên mua xin hủy sau khi cọc', kyVong: 'Người bán đồng ý thì đơn hủy, cọc thuộc về người bán.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donDaCoc(lo, 1000);
    t.buoc(t.mua[0], ma, 'yeuCauHuy', 'Nhà máy ngưng dây chuyền');
    t.kiemDuoc('Người bán đồng ý hủy', t.thuBuoc(t.ban, ma, 'dongYHuy'));
    t.kiem('Cọc thuộc về người bán', t.d(ma).huy?.cocVe === 'ban');
    t.kiem('Tiền cọc vào "đã về" của người bán', tienNguoiBan(t.so, t.ban.id).daVe === t.d(ma).daCoc!.so);
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B23', nhom: 'Đơn', ten: 'Đổi lịch giao', kyVong: 'Bên mua đề nghị dời ngày; người bán đồng ý thì ngày giao đổi.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donDaCoc(lo, 1000);
    t.lam(t.mua[0], { loai: 'de_nghi_don', ma, deNghi: 'doi_lich', giaTri: t.ngay(6), lyDo: 'Xe kẹt lịch' });
    t.kiemDuoc('Người bán đồng ý', t.thu(t.ban, { loai: 'tra_loi_de_nghi', deNghiId: t.so.deNghi[0]!.id, dongY: true }));
    t.kiem('Ngày giao mới', t.d(ma).ngayGiao === t.ngay(6));
    t.man = `doi-lich?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B24', nhom: 'Đơn', ten: 'Giao một phần (giảm lượng)', kyVong: 'Người bán đề nghị giảm 3.000 → 2.000 kg; bên mua đồng ý; 1.000 kg trả về lô.', chay(t) {
    const lo = t.lo(4000); t.ketNoi(lo); const ma = t.donDaCoc(lo, 3000);
    t.lam(t.ban, { loai: 'de_nghi_don', ma, deNghi: 'giam_luong', giaTri: '2000', lyDo: 'Mưa rụng trái' });
    t.lam(t.mua[0], { loai: 'tra_loi_de_nghi', deNghiId: t.so.deNghi[0]!.id, dongY: true });
    t.kiem('Đơn còn 2.000 kg, lô đã hứa 2.000 kg', t.d(ma).kg === 2000 && t.l(lo).hua === 2000);
    t.man = `giao-mot-phan?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B25', nhom: 'Đơn', ten: 'Số cân đúng: chốt, trừ cọc', kyVong: 'Nhận 3.800/4.000 kg: tiền hàng 95 triệu, trừ cọc còn 85 triệu.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 4000, 3800);
    t.kiem('Tiền hàng 95.000.000 đ, còn phải trả 85.000.000 đ', t.d(ma).phaiTra === 95_000_000 && t.d(ma).conPhaiTra === 85_000_000);
    t.man = `quyet-toan?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B26', nhom: 'Đơn', ten: 'Số cân sai: bên mua nhập lại', kyVong: 'Người bán bấm "Không đúng" thì đơn quay về chờ cân.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donDaCoc(lo, 1000);
    t.buoc(t.mua[0], ma, 'nhapKetQua', 800, 200, 0, ['anh-hang-khong-dat.jpg']);
    t.kiemDuoc('Báo không đúng', t.thuBuoc(t.ban, ma, 'ketQuaSai'));
    t.kiem('Đơn chờ cân lại, có đánh dấu phản đối', t.d(ma).trangThai === 'cho_giao' && !!t.d(ma).ketQuaCan?.phanDoi);
    t.man = `ket-qua?ma=${encodeURIComponent(ma)}`;
  } },
  /* ---------- Tiền ---------- */
  { ma: 'B27', nhom: 'Tiền', ten: 'Tiền qua tài khoản đảm bảo', kyVong: 'Bên mua chuyển đúng số; ngân hàng giải ngân; đơn đóng với đủ tiền.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 2000);
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!);
    t.kiem('Đang giữ ở tài khoản đảm bảo', t.d(ma).trangThai === 'tien_dang_giu');
    t.buoc(HE_THONG, ma, 'giaiNgan');
    t.kiem('Đã nhận đủ 50.000.000 đ', t.d(ma).trangThai === 'da_nhan_tien' && t.d(ma).daTra === 50_000_000);
    t.man = `tien-ve?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B28', nhom: 'Tiền', ten: 'Trả thiếu không đóng được đơn', kyVong: 'Bên mua báo trả một nửa: "Đã nhận đủ" bị chặn, chỉ "Nhận một phần".', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 2000);
    t.buoc(t.mua[0], ma, 'baoDaTra', Math.round(t.d(ma).conPhaiTra! / 2));
    t.kiemBiChan('"Đã nhận đủ" bị chặn', t.thuBuoc(t.ban, ma, 'tienDu'), /còn thiếu/);
    t.kiemDuoc('"Nhận một phần" được', t.thuBuoc(t.ban, ma, 'nhanMotPhan'));
    t.kiem('Còn phải trả 22.500.000 đ', t.d(ma).conPhaiTra === 22_500_000);
    t.man = 'tien';
  } },
  { ma: 'B29', nhom: 'Tiền', ten: 'Chưa thấy tiền: đối soát', kyVong: 'Mở đối soát; bên mua gửi chứng từ; người bán thấy tiền thì đóng.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 1000);
    t.buoc(t.mua[0], ma, 'baoDaTra', t.d(ma).conPhaiTra!);
    t.kiemDuoc('Báo chưa thấy tiền', t.thuBuoc(t.ban, ma, 'tienChua'));
    t.buoc(t.mua[0], ma, 'guiChungTu', 'Ủy nhiệm chi');
    t.kiemDuoc('Ghi đối soát', t.thuBuoc(t.ban, ma, 'ghiDoiSoat', 'Đã xem sổ, chưa thấy'));
    t.kiemDuoc('Thấy tiền thì đóng', t.thuBuoc(t.ban, ma, 'tienDu'));
    t.man = `tranh-chap?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B30', nhom: 'Tiền', ten: 'Tiền hàng nhỏ hơn cọc', kyVong: 'Nhận ít hơn giá trị cọc: đơn đóng ngay, hoàn cọc dư cho bên mua.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 1000, 50);
    t.kiem('Đơn đóng, hoàn cọc dư', t.d(ma).trangThai === 'da_nhan_tien' && (t.d(ma).hoanCoc ?? 0) > 0, `hoàn ${t.d(ma).hoanCoc}`);
    t.man = `quyet-toan?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B31', nhom: 'Tiền', ten: 'Ứng tiền trước', kyVong: 'Tối đa 70% giá trị đơn; ngân hàng duyệt; đơn đóng thì khoản ứng được thu hồi.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donDaCoc(lo, 4000);
    t.kiemBiChan('Ứng 80 triệu (vượt 70%) bị chặn', t.thu(t.ban, { loai: 'xin_ung_tien', donMa: ma, so: 80_000_000 }), /70%/);
    const u = t.lam(t.ban, { loai: 'xin_ung_tien', donMa: ma, so: 50_000_000 });
    t.lam(HE_THONG, { loai: 'duyet_ung_tien', ungTienId: u, dongY: true });
    t.buoc(t.mua[0], ma, 'nhapKetQua', 4000, 0); t.buoc(t.ban, ma, 'ketQuaDung');
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.buoc(HE_THONG, ma, 'giaiNgan');
    t.kiem('Khoản ứng đã thu hồi', t.so.ungTien[0]?.trangThai === 'da_thu_hoi');
    t.man = 'ung-tien';
  } },
  /* ---------- Vườn ---------- */
  { ma: 'B32', nhom: 'Vườn', ten: 'Nhật ký canh tác hợp lệ', kyVong: 'Không ghi ngày tương lai; phun thuốc phải có tên thuốc và ngày cách ly.', chay(t) {
    const v = t.lam(t.ban, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' });
    t.kiemBiChan('Ngày mai bị chặn', t.thu(t.ban, { loai: 'ghi_nhat_ky', vuonId: v, ngay: t.ngay(1), loaiViec: 'tuoi', noiDung: 'Tưới' }), /tương lai/);
    t.kiemBiChan('Phun thuốc thiếu ngày cách ly bị chặn', t.thu(t.ban, { loai: 'ghi_nhat_ky', vuonId: v, ngay: t.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun', vatTu: 'Thuốc A' }), /cách ly/);
    t.kiemDuoc('Ghi đủ thì được', t.thu(t.ban, { loai: 'ghi_nhat_ky', vuonId: v, ngay: t.ngay(0), loaiViec: 'phun_thuoc', noiDung: 'Phun', vatTu: 'Thuốc A', ngayCachLy: 7 }));
    t.man = 'nhat-ky';
  } },
  { ma: 'B33', nhom: 'Vườn', ten: 'Lời lỗ vụ tính cả tiền bán qua app', kyVong: 'Chi 3 triệu, bán qua app 25 triệu: lời 22 triệu.', chay(t) {
    const v = t.lam(t.ban, { loai: 'them_vuon', ten: 'Vườn', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài' });
    const vu = t.lam(t.ban, { loai: 'them_mua_vu', vuonId: v, ten: 'Vụ', batDau: t.ngay(-30), sanLuongUoc: 1000, haiDuKien: t.ngay(0) });
    t.lam(t.ban, { loai: 'ghi_thu_chi', loaiTien: 'chi', so: 3_000_000, noiDung: 'Phân', ngay: t.ngay(-3), muaVuId: vu });
    const lo = t.lo(1000, { vuonId: v }); t.ketNoi(lo); const ma = t.donChot(lo, 1000);
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.buoc(HE_THONG, ma, 'giaiNgan');
    const ll = loiLoVu(t.so, vu)!;
    t.kiem('Lời 22.000.000 đ', ll.loi === 22_000_000, JSON.stringify(ll));
    t.man = 'thu-chi';
  } },
  { ma: 'B34', nhom: 'Vườn', ten: 'Chia tiền lô gộp', kyVong: 'Tiền đơn chia theo phần từng hộ, tổng bằng đúng tiền nhận.', chay(t) {
    const lo = t.lam(t.ban, { loai: 'dang_lo', matHang: 'xoai-cat-chu', ten: 'Xoài HTX', kg: 3000, coSo: 'da_can', gia: 20000, thanhPhan: [{ ho: 'Bà Tư', kg: 1000 }, { ho: 'Anh Sáu', kg: 1100 }, { ho: 'Cô Ba', kg: 900 }] });
    t.ketNoi(lo); const ma = t.donChot(lo, 3000, 2950);
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.buoc(HE_THONG, ma, 'giaiNgan');
    const chia = chiaTienLoGop(t.so, ma)!;
    t.kiem('Tổng chia bằng tiền nhận', chia.reduce((s, c) => s + c.tien, 0) === t.d(ma).daTra, chia.map(c => `${c.ho} ${c.tien}`).join(', '));
    t.man = 'phan-cua-toi';
  } },
  /* ---------- Khác ---------- */
  { ma: 'B35', nhom: 'Khác', ten: 'Uy tín lên "Tốt"', kyVong: 'Ba đơn giao đủ, không hủy, được 5 sao: bậc "Tốt".', chay(t) {
    const lo = t.lo(10000); t.ketNoi(lo);
    for (let i = 0; i < 3; i++) { const ma = t.donChot(lo, 1000); t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.buoc(HE_THONG, ma, 'giaiNgan'); t.lam(t.mua[0], { loai: 'danh_gia', ma, diem: 5 }); }
    t.kiem('Bậc "Tốt"', uyTin(t.so, t.ban.id).bac === 'tot');
    t.man = 'uy-tin';
  } },
  { ma: 'B36', nhom: 'Khác', ten: 'Đặt dịch vụ kiểm nghiệm', kyVong: 'Gửi yêu cầu → đối tác báo giá → người bán đặt.', chay(t) {
    const y = t.lam(t.ban, { loai: 'yeu_cau_dich_vu', dichVu: 'kiem_dinh', ngay: t.ngay(2) });
    t.kiemBiChan('Chưa có báo giá thì chưa đặt được', t.thu(t.ban, { loai: 'dat_dich_vu', yeuCauId: y }));
    t.lam(HE_THONG, { loai: 'bao_gia_dich_vu', yeuCauId: y, doiTac: 'Trung tâm Kiểm nghiệm Cần Thơ', gia: 1_200_000 });
    t.kiemDuoc('Đặt được', t.thu(t.ban, { loai: 'dat_dich_vu', yeuCauId: y }));
    t.man = 'dich-vu';
  } },
  { ma: 'B37', nhom: 'Khác', ten: 'Đánh giá sau đơn', kyVong: 'Chỉ đánh giá được khi đơn hoàn tất, mỗi đơn một lần.', chay(t) {
    const lo = t.lo(); t.ketNoi(lo); const ma = t.donChot(lo, 1000);
    t.kiemBiChan('Chưa xong thì chưa đánh giá', t.thu(t.ban, { loai: 'danh_gia', ma, diem: 5 }), /hoàn tất/);
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.buoc(HE_THONG, ma, 'giaiNgan');
    t.kiemDuoc('Đánh giá 5 sao', t.thu(t.ban, { loai: 'danh_gia', ma, diem: 5, nhanXet: 'Trả tiền nhanh' }));
    t.kiemBiChan('Lần hai bị chặn', t.thu(t.ban, { loai: 'danh_gia', ma, diem: 4 }));
    t.man = `chi-tiet-don?ma=${encodeURIComponent(ma)}`;
  } },
  { ma: 'B38', nhom: 'Khác', ten: 'Gửi yêu cầu hỗ trợ', kyVong: 'Người bán gửi; vận hành trả lời; yêu cầu đóng.', chay(t) {
    const h = t.lam(t.ban, { loai: 'gui_ho_tro', chuDe: 'Tiền', noiDung: 'Chưa thấy tiền cọc' });
    t.lam(VAN_HANH_MAU, { loai: 'tra_loi_ho_tro', hoTroId: h, noiDung: 'Tiền đã vào tài khoản đảm bảo', xong: true });
    t.kiem('Yêu cầu đã đóng, có trả lời', t.so.hoTro[0]?.trangThai === 'xong' && t.so.hoTro[0].traLoi.length === 1);
    t.man = 'ho-tro';
  } },
];
