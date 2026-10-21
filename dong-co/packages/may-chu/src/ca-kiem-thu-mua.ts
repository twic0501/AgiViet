// Ca kiểm thử app mua (giai đoạn B): cùng khung PhienThu với app bán; bên mua chính là Nhà máy sấy Đồng Xanh (mua[0]).
// Mỗi ca chỉ màn của app mua nên mở để xem kết quả (đường dẫn trong app mua, không có /mua).
import { bangKe01, congNo, phuKeHoach, tien, thangCua, truyXuat, type NguoiLam } from '@agiviet/nghiep-vu';
import { chayCa, PhienThu, type CaKiemThu, type KetQuaCa } from './ca-kiem-thu.ts';
import { chayMotNhip, TRE } from './he-thong.ts';
import { lienLacCua, tinNhanCua } from './truy-van.ts';

const NGAY = 24 * 3600_000;
const tachMoi = (t: PhienThu, kg = 4000) => { const lo = t.lo(kg); t.ketNoi(lo); return lo; };

export const CA_KIEM_THU_MUA: CaKiemThu[] = [
  /* ---------- Tài khoản, gói ---------- */
  { ma: 'M01', nhom: 'Tài khoản', ten: 'Đăng ký tổ chức', kyVong: 'Thiếu tên tổ chức bị chặn; đủ thì có hồ sơ, gửi giấy phép thì chờ duyệt.', chay(t) {
    const moi: NguoiLam = { vai: 'mua', id: 'mua-hau-giang', ten: 'Công ty Nông sản Hậu Giang' };
    t.kiemBiChan('Không ghi tên tổ chức bị chặn', t.thu(moi, { loai: 'dang_ky', vai: 'mua', ten: 'Anh Bảo', sdt: '0939111222' }), /tổ chức/);
    t.kiemDuoc('Đăng ký đủ thông tin', t.thu(moi, { loai: 'dang_ky', vai: 'mua', ten: 'Anh Bảo', sdt: '0939111222', vung: 'Vị Thanh, Hậu Giang', toChuc: { ten: moi.ten, maSoThue: '6300123456', loaiHinh: 'Doanh nghiệp chế biến' } }));
    t.thu(moi, { loai: 'gui_xac_minh', giayTo: 'giay-phep-kinh-doanh.pdf' });
    t.kiem('Hồ sơ chờ duyệt xác minh', t.so.nguoiDung.find(n => n.id === moi.id)?.xacMinh === 'cho_duyet');
    t.kiem('Mặc định gói Miễn phí', t.so.nguoiDung.find(n => n.id === moi.id)?.goi === 'mien_phi');
    t.man = 'ho-so-to-chuc';
  } },
  { ma: 'M02', nhom: 'Tài khoản', ten: 'Hạn mức lượt kết nối gói Miễn phí', kyVong: '5 lời mời mỗi tháng; lời mời thứ 6 bị chặn; người bán từ chối thì trả lượt.', chay(t) {
    const lo = [1, 2, 3, 4, 5, 6].map(() => t.lo(500));
    const kn = lo.slice(0, 5).map(l => t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: l }).ma!);
    t.kiem('Gửi được 5 lời mời', kn.every(Boolean));
    t.kiemBiChan('Lời mời thứ 6 bị chặn', t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: lo[5]! }), /lượt kết nối/);
    t.thu(t.ban, { loai: 'tra_loi_ket_noi', ketNoiId: kn[0]!, dongY: false });
    t.kiemDuoc('Bị từ chối một lời mời thì gửi thêm được', t.thu(t.mua[0], { loai: 'gui_loi_moi', loId: lo[5]! }));
    t.man = 'goi-cua-toi';
  } },
  { ma: 'M03', nhom: 'Tài khoản', ten: 'Hạn mức tin cần mua', kyVong: 'Gói Miễn phí đăng tối đa 5 tin cần mua mỗi tháng.', chay(t) {
    for (let i = 0; i < 5; i++) t.lam(t.mua[0], { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: `Xoài đợt ${i + 1}`, kg: 1000, tu: t.ngay(1), den: t.ngay(10) });
    t.kiemBiChan('Tin thứ 6 bị chặn', t.thu(t.mua[0], { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: 'Xoài đợt 6', kg: 1000, tu: t.ngay(1), den: t.ngay(10) }), /tin cần mua/);
    t.kiemBiChan('Ngày "đến" trước ngày "từ" bị chặn', t.thu(t.mua[1], { loai: 'dang_nhu_cau', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: 1000, tu: t.ngay(10), den: t.ngay(1) }));
    t.man = 'nhu-cau';
  } },
  { ma: 'M04', nhom: 'Tài khoản', ten: 'Thành viên theo gói', kyVong: 'Miễn phí chỉ 1 tài khoản; Business tối đa 5; còn thành viên thì không hạ gói được.', chay(t) {
    t.kiemBiChan('Gói Miễn phí không thêm thành viên', t.thu(t.mua[0], { loai: 'them_thanh_vien', ten: 'Anh Quang', sdt: '0909000457', quyen: 'ke_toan' }));
    t.kiemDuoc('Lên gói Business', t.thu(t.mua[0], { loai: 'chon_goi', goi: 'business' }));
    for (let i = 1; i <= 4; i++) t.lam(t.mua[0], { loai: 'them_thanh_vien', ten: `Thành viên ${i}`, sdt: `090900046${i}`, quyen: 'mua_hang' });
    t.kiemBiChan('Thành viên thứ 5 (tài khoản thứ 6) bị chặn', t.thu(t.mua[0], { loai: 'them_thanh_vien', ten: 'Thành viên 5', sdt: '0909000465', quyen: 'mua_hang' }));
    t.kiemBiChan('Còn thành viên thì không hạ về Miễn phí', t.thu(t.mua[0], { loai: 'chon_goi', goi: 'mien_phi' }), /Gỡ bớt/);
    t.man = 'thanh-vien';
  } },
  /* ---------- Nguồn hàng, kết nối, trao đổi ---------- */
  { ma: 'M05', nhom: 'Nguồn hàng', ten: 'Chưa kết nối thì chưa đặt hàng', kyVong: 'Tạo đơn khi người bán chưa đồng ý kết nối bị chặn; đồng ý rồi thì được.', chay(t) {
    const lo = t.lo();
    t.kiemBiChan('Tạo đơn khi chưa kết nối bị chặn', t.thu(t.mua[0], { loai: 'tao_don', loId: lo, kg: 1000, gia: 25000, ngayGiao: t.ngay(3) }), /đồng ý kết nối/);
    t.ketNoi(lo);
    t.kiemDuoc('Sau khi người bán đồng ý thì tạo đơn được', t.thu(t.mua[0], { loai: 'tao_don', loId: lo, kg: 1000, gia: 25000, ngayGiao: t.ngay(3) }));
    t.man = `chi-tiet-lo?lo=${lo}`;
  } },
  { ma: 'M06', nhom: 'Nguồn hàng', ten: 'Che liên lạc trong tin nhắn', kyVong: 'Trước cọc, số điện thoại trong tin nhắn bị che; bên mua không thấy số người bán.', chay(t) {
    const lo = t.lo(), kn = t.ketNoi(lo);
    t.lam(t.ban, { loai: 'gui_tin', ketNoiId: kn, noiDung: 'Anh gọi em 0918 234 421 nha' });
    const tin = tinNhanCua(t.so, kn).at(-1)!;
    t.kiem('Số điện thoại trong tin bị che', !tin.noiDung.includes('0918') && tin.biChe.length > 0, tin.noiDung);
    t.kiem('Chưa cọc: không có liên lạc người bán', lienLacCua(t.so, t.mua[0], t.ban.id) === null);
    t.man = `tin-nhan?kn=${kn}`;
  } },
  { ma: 'M07', nhom: 'Nguồn hàng', ten: 'Báo giá thành đơn', kyVong: 'Bên mua gửi giá, người bán đồng ý; đơn tạo theo đúng báo giá; mỗi báo giá một đơn.', chay(t) {
    const lo = t.lo(), kn = t.ketNoi(lo);
    const bg = t.lam(t.mua[0], { loai: 'gui_bao_gia', ketNoiId: kn, gia: 23500, kg: 1500, ngayGiao: t.ngay(4), ghiChu: 'Loại 1' });
    t.lam(t.ban, { loai: 'tra_loi_bao_gia', baoGiaId: bg, dongY: true });
    const ma = t.lam(t.mua[0], { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg });
    t.kiem('Đơn đúng giá và lượng đã chốt', t.d(ma).gia === 23500 && t.d(ma).kg === 1500);
    t.kiemBiChan('Dùng lại báo giá lần hai bị chặn', t.thu(t.mua[0], { loai: 'tao_don', loId: lo, kg: 0, gia: 0, ngayGiao: '', baoGiaId: bg }), /đã dùng/);
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M08', nhom: 'Nguồn hàng', ten: 'Hẹn xem vườn', kyVong: 'Không hẹn vào quá khứ; người bán đồng ý thì hẹn được chốt.', chay(t) {
    const lo = t.lo(), kn = t.ketNoi(lo);
    t.kiemBiChan('Hẹn vào hôm qua bị chặn', t.thu(t.mua[0], { loai: 'de_nghi_hen', ketNoiId: kn, luc: `${t.ngay(-1)}T08:00` }));
    const hen = t.lam(t.mua[0], { loai: 'de_nghi_hen', ketNoiId: kn, luc: `${t.ngay(2)}T08:00`, ghiChu: 'Xem trái trên cây' });
    t.lam(t.ban, { loai: 'tra_loi_hen', henId: hen, dongY: true });
    t.kiem('Hẹn đã chốt', t.so.henXem.find(h => h.id === hen)?.trangThai === 'dong_y');
    t.man = `hen-xem-vuon?kn=${kn}`;
  } },
  /* ---------- Đơn, cọc ---------- */
  { ma: 'M09', nhom: 'Đơn', ten: 'Đặt quá lượng còn bán', kyVong: 'Lô 4.000 kg: đơn 5.000 kg bị chặn ngay khi tạo.', chay(t) {
    const lo = tachMoi(t);
    t.kiemBiChan('Đơn 5.000 kg bị chặn', t.thu(t.mua[0], { loai: 'tao_don', loId: lo, kg: 5000, gia: 25000, ngayGiao: t.ngay(3) }), /còn bán được/);
    t.man = `chi-tiet-lo?lo=${lo}`;
  } },
  { ma: 'M10', nhom: 'Đơn', ten: 'Rút đơn trước khi người bán xác nhận', kyVong: 'Rút được; lượng của lô không bị giữ.', chay(t) {
    const lo = tachMoi(t), ma = t.don(lo, 1000);
    t.kiemDuoc('Rút đơn', t.thuBuoc(t.mua[0], ma, 'rutDon'));
    t.kiem('Đơn đã hủy, lô không giữ lượng', t.d(ma).trangThai === 'da_huy' && t.l(lo).hua === 0);
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M11', nhom: 'Đơn', ten: 'Cọc và phí: đơn đầu, đơn mối quen', kyVong: 'Đơn đầu 4.000 kg × 25.000 đ: cọc 10 triệu, phí giới thiệu 1 triệu; đơn sau cùng người bán: phí mối quen 0,3%.', chay(t) {
    const lo = tachMoi(t, 10000), ma = t.don(lo, 4000);
    t.buoc(t.ban, ma, 'xacNhanDon');
    t.kiem('Cọc 10.000.000 đ, phí giới thiệu 1.000.000 đ', t.d(ma).coc?.so === 10_000_000 && t.d(ma).coc?.phi === 1_000_000 && t.d(ma).coc?.loaiPhi === 'gioi_thieu');
    t.kiemDuoc('Đặt cọc', t.thuBuoc(t.mua[0], ma, 'datCoc'));
    const ma2 = t.don(lo, 4000); t.buoc(t.ban, ma2, 'xacNhanDon');
    t.kiem('Đơn sau: phí mối quen 300.000 đ', t.d(ma2).coc?.loaiPhi === 'moi_quen' && t.d(ma2).coc?.phi === 300_000, String(t.d(ma2).coc?.phi));
    t.man = `dat-coc?ma=${ma2}`;
  } },
  { ma: 'M12', nhom: 'Đơn', ten: 'Quá hạn cọc', kyVong: 'Quá 48 giờ: không đặt cọc được nữa, hệ thống đóng đơn.', chay(t) {
    const lo = tachMoi(t), ma = t.don(lo, 1000);
    t.buoc(t.ban, ma, 'xacNhanDon');
    t.tua(49 * 3600_000);
    t.kiemBiChan('Cọc sau hạn bị chặn', t.thuBuoc(t.mua[0], ma, 'datCoc'), /quá hạn/i);
    chayMotNhip(t.dv);
    t.kiem('Hệ thống đóng đơn quá hạn', t.d(ma).trangThai === 'qua_han');
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M13', nhom: 'Đơn', ten: 'Liên lạc người bán mở sau khi cọc', kyVong: 'Trước cọc không có số người bán; cọc xong thấy số và địa chỉ vườn.', chay(t) {
    const lo = tachMoi(t), ma = t.don(lo, 1000);
    t.buoc(t.ban, ma, 'xacNhanDon');
    t.kiem('Trước cọc: chưa có liên lạc', lienLacCua(t.so, t.mua[0], t.ban.id) === null);
    t.buoc(t.mua[0], ma, 'datCoc');
    const ll = lienLacCua(t.so, t.mua[0], t.ban.id);
    t.kiem('Sau cọc: thấy số người bán', ll?.sdt === '0918234421', ll?.sdt);
    t.man = `mo-lien-lac?ma=${ma}`;
  } },
  { ma: 'M14', nhom: 'Đơn', ten: 'Dời lịch giao', kyVong: 'Bên mua đề nghị dời ngày; người bán đồng ý thì ngày giao đổi.', chay(t) {
    const lo = tachMoi(t), ma = t.donDaCoc(lo, 1000);
    const ngayMoi = t.ngay(6);
    const dn = t.lam(t.mua[0], { loai: 'de_nghi_don', ma, deNghi: 'doi_lich', giaTri: ngayMoi, lyDo: 'Xe lạnh kẹt lịch' });
    t.lam(t.ban, { loai: 'tra_loi_de_nghi', deNghiId: dn, dongY: true });
    t.kiem('Ngày giao đã đổi', t.d(ma).ngayGiao === ngayMoi);
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M15', nhom: 'Đơn', ten: 'Xin hủy sau khi cọc', kyVong: 'Bên mua xin hủy, người bán đồng ý: đơn hủy, cọc thuộc về người bán, lượng trả về lô.', chay(t) {
    const lo = tachMoi(t), ma = t.donDaCoc(lo, 1000);
    t.buoc(t.mua[0], ma, 'yeuCauHuy', 'Đổi kế hoạch sản xuất');
    t.buoc(t.ban, ma, 'dongYHuy');
    t.kiem('Đơn hủy, cọc về người bán', t.d(ma).trangThai === 'da_huy' && t.d(ma).huy?.cocVe === 'ban');
    t.kiem('Lượng trả về lô', t.l(lo).hua === 0);
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  /* ---------- Nghiệm thu, tiền ---------- */
  { ma: 'M16', nhom: 'Nghiệm thu', ten: 'Nhập kết quả cân', kyVong: 'Nhận + không nhận vượt lượng đơn bị chặn; đúng thì chờ người bán xác nhận.', chay(t) {
    const lo = tachMoi(t), ma = t.donDaCoc(lo, 4000);
    t.kiemBiChan('Cân 4.100 kg cho đơn 4.000 kg bị chặn', t.thuBuoc(t.mua[0], ma, 'nhapKetQua', 4100, 0), /vượt/);
    t.kiemDuoc('Nhận 3.900, trả lại 100', t.thuBuoc(t.mua[0], ma, 'nhapKetQua', 3900, 100));
    t.kiem('Chờ người bán xác nhận', t.d(ma).trangThai === 'cho_ban_xn_kq');
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M17', nhom: 'Nghiệm thu', ten: 'Người bán báo số cân sai', kyVong: 'Đơn quay về chờ cân; bên mua nhập lại số mới.', chay(t) {
    const lo = tachMoi(t), ma = t.donDaCoc(lo, 2000);
    t.buoc(t.mua[0], ma, 'nhapKetQua', 1800, 200);
    t.buoc(t.ban, ma, 'ketQuaSai');
    t.kiem('Đơn quay về chờ cân, có đánh dấu tranh chấp', t.d(ma).trangThai === 'cho_giao' && t.d(ma).ketQuaCan?.phanDoi === true);
    t.kiemDuoc('Nhập lại 1.950 kg', t.thuBuoc(t.mua[0], ma, 'nhapKetQua', 1950, 50));
    t.man = `nghiem-thu?ma=${ma}`;
  } },
  { ma: 'M18', nhom: 'Tiền', ten: 'Chuyển tiền qua tài khoản đảm bảo', kyVong: 'Chuyển sai số bị chặn; đúng số thì ngân hàng giải ngân, đơn đóng.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 4000, 3800);
    const con = t.d(ma).conPhaiTra!;
    t.kiem('Còn phải trả = 95 triệu − cọc 10 triệu', con === 85_000_000, String(con));
    t.kiemBiChan('Chuyển thiếu 1 triệu bị chặn', t.thuBuoc(t.mua[0], ma, 'chuyenTienDamBao', con - 1_000_000), /đúng số/);
    t.kiemDuoc('Chuyển đúng số', t.thuBuoc(t.mua[0], ma, 'chuyenTienDamBao', con));
    t.tua(TRE.nganHang); chayMotNhip(t.dv);
    t.kiem('Ngân hàng giải ngân, đơn đóng đủ tiền', t.d(ma).trangThai === 'da_nhan_tien' && t.d(ma).daTra === t.d(ma).phaiTra);
    t.man = `chi-tiet-don?ma=${ma}`;
  } },
  { ma: 'M19', nhom: 'Tiền', ten: 'Trả trực tiếp nhiều lần', kyVong: 'Trả một nửa: người bán nhận một phần; trả nốt thì người bán xác nhận đủ.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 2000);
    const con = t.d(ma).conPhaiTra!;
    t.buoc(t.mua[0], ma, 'baoDaTra', con / 2);
    t.kiemBiChan('Người bán không xác nhận "đủ" khi mới trả một nửa', t.thuBuoc(t.ban, ma, 'tienDu'), /còn thiếu/);
    t.buoc(t.ban, ma, 'nhanMotPhan');
    t.kiem('Còn phải trả một nửa', t.d(ma).conPhaiTra === con / 2);
    t.buoc(t.mua[0], ma, 'baoDaTra', con / 2);
    t.kiemDuoc('Trả nốt, người bán xác nhận đủ', t.thuBuoc(t.ban, ma, 'tienDu'));
    t.man = `cong-no`;
  } },
  { ma: 'M20', nhom: 'Tiền', ten: 'Người bán chưa thấy tiền: đối soát', kyVong: 'Bên mua gửi ủy nhiệm chi và ghi đối soát; người bán thấy tiền thì đóng.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 1000);
    t.buoc(t.mua[0], ma, 'baoDaTra', t.d(ma).conPhaiTra!);
    t.buoc(t.ban, ma, 'tienChua');
    t.kiemDuoc('Gửi chứng từ', t.thuBuoc(t.mua[0], ma, 'guiChungTu', 'Ủy nhiệm chi 15.000.000 đ'));
    t.kiemDuoc('Ghi đối soát', t.thuBuoc(t.mua[0], ma, 'ghiDoiSoat', 'Đã chuyển lúc 9 giờ'));
    t.buoc(t.ban, ma, 'tienDu');
    t.kiem('Đơn đóng', t.d(ma).trangThai === 'da_nhan_tien');
    t.man = `doi-soat?ma=${ma}`;
  } },
  { ma: 'M21', nhom: 'Tiền', ten: 'Đánh giá người bán sau đơn', kyVong: 'Chỉ đánh giá được khi đơn hoàn tất, mỗi đơn một lần.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 1000);
    t.kiemBiChan('Chưa hoàn tất thì chưa đánh giá', t.thu(t.mua[0], { loai: 'danh_gia', ma, diem: 5 }));
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.tua(TRE.nganHang); chayMotNhip(t.dv);
    t.kiemDuoc('Đánh giá 5 sao', t.thu(t.mua[0], { loai: 'danh_gia', ma, diem: 5, nhanXet: 'Hàng đúng loại' }));
    t.kiemBiChan('Đánh giá lần hai bị chặn', t.thu(t.mua[0], { loai: 'danh_gia', ma, diem: 4 }));
    t.man = 'uy-tin';
  } },
  /* ---------- Quản lý ---------- */
  { ma: 'M22', nhom: 'Quản lý', ten: 'Nhập, xuất kho', kyVong: 'Nhập không vượt lượng đã nhận; xuất không vượt tồn.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 4000, 3800);
    t.kiemBiChan('Nhập 4.000 kg (nhận 3.800) bị chặn', t.thu(t.mua[0], { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 4000, viTri: 'Kho A1', ngayNhap: t.ngay(0), hanDung: t.ngay(20) }));
    const pk = t.lam(t.mua[0], { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 3000, viTri: 'Kho A1', ngayNhap: t.ngay(0), hanDung: t.ngay(20) });
    t.kiemBiChan('Xuất 3.500 kg (tồn 3.000) bị chặn', t.thu(t.mua[0], { loai: 'xuat_kho', phieuId: pk, kg: 3500, ngay: t.ngay(0), ghiChu: '' }));
    t.kiemDuoc('Xuất 1.000 kg', t.thu(t.mua[0], { loai: 'xuat_kho', phieuId: pk, kg: 1000, ngay: t.ngay(0), ghiChu: 'Chuyền sấy' }));
    t.man = 'ton-kho';
  } },
  { ma: 'M23', nhom: 'Quản lý', ten: 'Truy xuất lô kho về nhật ký vườn', kyVong: 'Phiếu kho → đơn → người bán → vườn → các lần phun thuốc.', chay(t) {
    const v = t.lam(t.ban, { loai: 'them_vuon', ten: 'Vườn xoài', loaiVuon: 'vuon', dienTich: 1, donViDienTich: 'ha', cay: 'Xoài cát Chu', soGoc: 200 });
    t.lam(t.ban, { loai: 'ghi_nhat_ky', vuonId: v, ngay: t.ngay(-20), loaiViec: 'phun_thuoc', noiDung: 'Phun trừ rầy', vatTu: 'Thuốc trừ rầy', ngayCachLy: 7 });
    const lo = t.lo(3000, { vuonId: v }); t.ketNoi(lo);
    const ma = t.donChot(lo, 1000);
    const pk = t.lam(t.mua[0], { loai: 'nhap_kho', donMa: ma, phanLoai: 'Loại 1', kg: 1000, viTri: 'Kho A2', ngayNhap: t.ngay(0), hanDung: t.ngay(15) });
    const tx = truyXuat(t.so, pk, t.dongHo.bayGio());
    t.kiem('Truy được tới người bán và vườn', tx?.nguoiBan?.id === t.ban.id && tx?.nguon?.vuon.id === v);
    t.kiem('Thấy lần phun thuốc trong nhật ký', !!tx?.nguon?.nhatKy.some(k => k.loai === 'phun_thuoc'));
    t.man = `truy-xuat?phieu=${pk}`;
  } },
  { ma: 'M24', nhom: 'Quản lý', ten: 'Đơn ngoài app và công nợ', kyVong: 'Đơn mua ngoài app còn nợ vào công nợ; trả hết thì ra khỏi công nợ.', chay(t) {
    const n = t.lam(t.mua[0], { loai: 'ghi_don_ngoai', nguoiBan: 'Anh Sáu Lộc', diaChiNguoiBan: 'Mỹ Hiệp', matHang: 'xoai-cat-chu', ten: 'Xoài loại 2', kg: 1000, gia: 13000, ngay: t.ngay(0), daTra: 5_000_000 });
    t.kiem('Công nợ có 8 triệu của đơn ngoài app', congNo(t.so, t.mua[0].id).ds.some(x => x.ma === n && x.con === 8_000_000));
    t.kiemBiChan('Trả vượt số nợ bị chặn', t.thu(t.mua[0], { loai: 'tra_don_ngoai', donNgoaiId: n, so: 9_000_000 }));
    t.lam(t.mua[0], { loai: 'tra_don_ngoai', donNgoaiId: n, so: 8_000_000 });
    t.kiem('Trả hết thì ra khỏi công nợ', !congNo(t.so, t.mua[0].id).ds.some(x => x.ma === n));
    t.man = 'cong-no';
  } },
  { ma: 'M25', nhom: 'Quản lý', ten: 'Bảng kê mua hàng 01/TNDN', kyVong: 'Bảng kê tháng gồm đơn trong app đã nhận đủ tiền và đơn ngoài app, tổng đúng.', chay(t) {
    const lo = tachMoi(t), ma = t.donChot(lo, 1000);
    t.buoc(t.mua[0], ma, 'chuyenTienDamBao', t.d(ma).conPhaiTra!); t.tua(TRE.nganHang); chayMotNhip(t.dv);
    t.lam(t.mua[0], { loai: 'ghi_don_ngoai', nguoiBan: 'Chị Út Mai', diaChiNguoiBan: 'Châu Thành', matHang: 'thanh-long-ruot-do', ten: 'Thanh long', kg: 500, gia: 12000, ngay: t.ngay(0), daTra: 6_000_000 });
    const bk = bangKe01(t.so, t.mua[0].id, thangCua(t.dongHo.bayGio()));
    t.kiem('Bảng kê có 2 dòng', bk.dong.length === 2, String(bk.dong.length));
    t.kiem('Tổng = 25 triệu + 6 triệu', bk.tong === tien(1000, 25000) + 6_000_000, String(bk.tong));
    t.man = 'bang-ke';
  } },
  { ma: 'M26', nhom: 'Quản lý', ten: 'Kế hoạch mua và phần còn thiếu', kyVong: 'Kế hoạch 5 tấn; đơn đã cọc 3 tấn trong tháng thì còn thiếu 2 tấn; mỗi tháng một dòng mỗi mặt hàng.', chay(t) {
    const lo = tachMoi(t), ma = t.donDaCoc(lo, 3000);
    const thang = t.d(ma).ngayGiao.slice(0, 7);
    t.lam(t.mua[0], { loai: 'them_ke_hoach', matHang: 'xoai-cat-chu', ten: 'Xoài cát Chu', thang, kgCan: 5000 });
    const p = phuKeHoach(t.so, t.mua[0].id).find(k => k.thang === thang);
    t.kiem('Đã có 3 tấn, thiếu 2 tấn', p?.daCo === 3000 && p?.thieu === 2000, `${p?.daCo}/${p?.thieu}`);
    t.kiemBiChan('Dòng trùng tháng, mặt hàng bị chặn', t.thu(t.mua[0], { loai: 'them_ke_hoach', matHang: 'xoai-cat-chu', ten: 'Xoài', thang, kgCan: 1000 }));
    t.man = 'ke-hoach';
  } },
  { ma: 'M27', nhom: 'Quản lý', ten: 'Đặt kiểm định cho lô', kyVong: 'Gửi yêu cầu → đối tác báo giá → bên mua đặt.', chay(t) {
    const lo = t.lo();
    const y = t.lam(t.mua[0], { loai: 'yeu_cau_dich_vu', dichVu: 'kiem_dinh', ngay: t.ngay(2), loId: lo, ghiChu: 'Kiểm dư lượng' });
    t.tua(TRE.doiTac); chayMotNhip(t.dv);
    t.kiem('Đối tác đã báo giá', t.so.dichVu.find(x => x.id === y)?.trangThai === 'da_bao_gia');
    t.kiemDuoc('Đặt dịch vụ', t.thu(t.mua[0], { loai: 'dat_dich_vu', yeuCauId: y }));
    t.man = 'dich-vu';
  } },
];

void NGAY;

export const chayCaMua = (ma: string): KetQuaCa | null => { const ca = CA_KIEM_THU_MUA.find(c => c.ma === ma); return ca ? chayCa(ca) : null; };
