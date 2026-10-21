// Kiểu dữ liệu nghiệp vụ. Tên trường tiếng Việt không dấu, trùng thuật ngữ trong docs/01-nghiep-vu.
import type { ChinhSach } from './chinh-sach.ts';

/** Vai của người thao tác. "he_thong" là ngân hàng đối tác và đồng hồ hạn; "van_hanh" là đội AgiViet. */
export type Vai = 'ban' | 'mua' | 'he_thong' | 'van_hanh';
export type VaiNguoiDung = 'ban' | 'mua';

/** Một bên trong giao dịch: định danh ổn định + tên hiển thị. */
export interface Ben {
  id: string;
  ten: string;
}

/** Người đang thao tác: vai + danh tính. Mọi lệnh đều cần biết ai làm. */
export interface NguoiLam extends Ben {
  vai: Vai;
}

/* ---------------- Người dùng ---------------- */

export type TrangThaiXacMinh = 'chua' | 'cho_duyet' | 'da_xac_minh' | 'tu_choi';
export type Goi = 'mien_phi' | 'business';
export type QuyenThanhVien = 'quan_ly' | 'mua_hang' | 'ke_toan';

export interface NguoiDung {
  id: string;
  vai: VaiNguoiDung;
  ten: string;
  sdt: string;
  /** Huyện, tỉnh: ai cũng thấy. */
  vung: string;
  /** Địa chỉ chính xác (vườn, kho nhận): chỉ lộ cho bên kia khi đã có đơn đặt cọc. */
  diaChi: string;
  xacMinh: TrangThaiXacMinh;
  giayTo?: { ten: string; guiLuc: number; lyDoTuChoi?: string };
  /** Người bán: hộ, hợp tác xã, tổ hợp tác. */
  loaiBan?: 'ho' | 'htx' | 'to_hop';
  matHang: string[];
  /** Bên mua: tổ chức, gói, thành viên. */
  toChuc?: { ten: string; maSoThue: string; loaiHinh: string };
  goi: Goi;
  thanhVien: { ten: string; sdt: string; quyen: QuyenThanhVien }[];
  taiKhoanNhan?: { nganHang: string; so: string; chuTaiKhoan: string; doiLuc: number };
  /** Con cháu được dùng chung tài khoản: "xem" chỉ xem, "thao_tac" được bấm thay (trừ ký và đổi tài khoản nhận tiền). */
  nguoiGiup: { ten: string; sdt: string; quyen: 'xem' | 'thao_tac' }[];
  caiDat: { coChu: 'vua' | 'lon' | 'rat_lon'; tocDoDoc: number; amThanh: boolean };
  biKhoa?: { lyDo: string; luc: number };
  /** Bên mua nhận hàng loại 2, 3, hàng dạt: được báo khi có lô kém loại đúng mặt hàng (trống mặt hàng = mọi mặt hàng). */
  nhanHangKemLoai?: { matHang: string[]; kgToiThieu: number; vung: string };
  /** Đối tác bao tiêu (AgiViet ký thỏa thuận khung): cam kết giá sàn thu mua hàng loại 3, hàng dạt theo mặt hàng. */
  baoTieu?: { giaSan: Record<string, number>; diemGom: string; tu: number };
  taoLuc: number;
}

/* ---------------- Lô, nhu cầu, kết nối ---------------- */

export type CoSoLuong = 'uoc_tinh' | 'da_can';
/** Loại hàng: loại 1 (đẹp, xuất khẩu, siêu thị), loại 2, loại 3, hàng dạt (nhỏ, trầy, chín ép: cho chế biến). */
export type LoaiHang = 'loai_1' | 'loai_2' | 'loai_3' | 'dat';

/** Lô hàng người bán đăng. hua = tổng lượng đã hứa cho các đơn người bán đã xác nhận; giao = đã giao và chốt cân. */
export interface Lo {
  id: string;
  ban: Ben;
  matHang: string;
  ten: string;
  kg: number;
  coSo: CoSoLuong;
  /** null = nhận báo giá. */
  gia: number | null;
  hua: number;
  giao: number;
  /** Thuộc tính chia loại theo mẫu của nhóm hàng (loại, cỡ, độ ẩm…). */
  thuocTinh: Record<string, string>;
  /** Hàng loại 2, 3 dành cho nhà máy chế biến. */
  choCheBien: boolean;
  haiTu?: string;
  haiDen?: string;
  vuonId?: string;
  anh: string[];
  moTa: string;
  dangLuc: number;
  /** Lần cuối người bán xác nhận còn hàng; quá hạn hiển thị thì tin tự ẩn. */
  conHangLuc: number;
  an?: boolean;
  /** Lô gộp nhiều hộ (hợp tác xã): phần của từng hộ. */
  thanhPhan?: { ho: string; kg: number }[];
  /** Loại hàng; trống = suy từ choCheBien (lô đăng trước khi có trường này). */
  loai?: LoaiHang;
  /** Đang bán gấp: lên đầu danh sách, báo bên mua nhận hàng kém loại, hết hạn thì thôi. */
  banGap?: { tu: number; den: number };
  /** Tách từ lô khác (chia theo loại), hoặc thành từ phần hàng bị trả lại của một đơn. */
  tachTu?: string;
  traVeTuDon?: string;
}

export interface NhuCau {
  id: string;
  mua: Ben;
  matHang: string;
  ten: string;
  kg: number;
  tu: string;
  den: string;
  giaTran: number | null;
  thuocTinh: Record<string, string>;
  ghiChu: string;
  trangThai: 'mo' | 'dong';
  dangLuc: number;
}

/** Kết nối giữa một bên mua và một người bán về một lô (bên mua mời) hoặc một nhu cầu (người bán chào hàng). */
export interface KetNoi {
  id: string;
  ban: Ben;
  mua: Ben;
  loId?: string;
  nhuCauId?: string;
  /** Ai gửi lời mời; bên kia trả lời. */
  tu: VaiNguoiDung;
  trangThai: 'cho' | 'dong_y' | 'tu_choi' | 'rut';
  loiNhan: string;
  guiLuc: number;
  traLoiLuc?: number;
}

/* ---------------- Trao đổi: tin nhắn, báo giá, hẹn xem ---------------- */

export interface TinNhan {
  id: string;
  ketNoiId: string;
  vai: VaiNguoiDung;
  noiDung: string;
  /** Có che liên lạc (số điện thoại, đường dẫn ngoài) trong tin này. */
  biChe: string[];
  /** Nguyên văn trước khi che: chỉ trang vận hành xem được. */
  goc?: string;
  luc: number;
}

export interface BaoGia {
  id: string;
  ketNoiId: string;
  tu: VaiNguoiDung;
  gia: number;
  kg: number;
  ngayGiao: string;
  ghiChu: string;
  trangThai: 'cho' | 'dong_y' | 'tu_choi' | 'het';
  luc: number;
}

export interface HenXem {
  id: string;
  ketNoiId: string;
  tu: VaiNguoiDung;
  luc: string;
  ghiChu: string;
  trangThai: 'cho' | 'dong_y' | 'tu_choi' | 'huy';
  guiLuc: number;
}

/* ---------------- Đơn ---------------- */

export type TrangThaiDon =
  | 'cho_ban_xac_nhan'
  | 'ban_tu_choi'
  | 'cho_coc'
  | 'qua_han'
  | 'cho_giao'
  | 'cho_dong_y_huy'
  | 'cho_ban_xn_kq'
  | 'da_chot'
  | 'tien_dang_giu'
  | 'bao_da_tra'
  | 'chua_thay_tien'
  | 'da_nhan_tien'
  | 'da_huy';

export type LoaiPhi = 'gioi_thieu' | 'moi_quen';

export interface Coc {
  so: number;
  phi: number;
  loaiPhi: LoaiPhi;
  han: number;
}

/** Hợp đồng cọc của đơn: hai bên chọn khi lập đơn, chỉ có hiệu lực và được app bảo vệ khi cọc đi qua tài khoản đảm bảo. */
export interface HopDong {
  /** Tiêu chuẩn nghiệm thu: loại hàng và tỷ lệ không đạt được trả lại không cần ảnh. */
  tieuChuan: { loai: LoaiHang; loiChoPhep: number };
  /** Giá cho phần hạ cấp (đạt loại dưới): bên mua nhận với giá này thay vì trả lại. null = không nhận hạ cấp. */
  giaHaCap: number | null;
  /** Nơi giao, quyết định lúc chuyển rủi ro: tại vườn (bên mua kiểm trước khi bốc) hoặc tại kho bên mua (người bán chịu tới lúc cân). */
  noiGiao: 'tai_vuon' | 'tai_kho';
  /** Giá tham khảo lúc lập đơn (trung vị đơn đã chốt 30 ngày), null khi chưa đủ dữ liệu. */
  giaThamKhao: number | null;
  /** Giá dùng để tính cọc và phí: max(giá đơn, tỷ lệ × giá tham khảo). */
  giaTinhCoc: number;
  /** Giá đơn dưới ngưỡng bất thường; người bán phải xác nhận thêm khi ký, đơn được đánh dấu cho vận hành. */
  giaBatThuong?: boolean;
  banDongYGiaBatThuong?: number;
}

export interface DongLichSu {
  noiDung: string;
  luc: number;
  vai: Vai;
}

/** Đơn hàng. phienBan tăng mỗi bước thành công, luôn bằng số dòng lịch sử. */
export interface Don {
  ma: string;
  loId: string;
  tenLo: string;
  matHang: string;
  ban: Ben;
  mua: Ben;
  kg: number;
  gia: number;
  ngayGiao: string;
  ketNoiId?: string;
  /** Đơn tạo theo báo giá đã chốt (mỗi báo giá chỉ tạo một đơn). */
  baoGiaId?: string;
  trangThai: TrangThaiDon;
  phienBan: number;
  taoLuc: number;
  lichSu: DongLichSu[];
  coc?: Coc;
  daCoc?: { so: number; phi: number; luc: number };
  /** Hợp đồng cọc (đơn lập trước khi có hợp đồng thì trống). */
  hopDong?: HopDong;
  /** Kết quả cân 3 phần: đạt (giá đơn), hạ cấp (giá hạ cấp), trả lại (không tính tiền); trả lại vượt tỷ lệ cho phép phải có ảnh. */
  ketQuaCan?: { nhan: number; tuChoi: number; haCap?: number; anh?: string[]; luc: number; nguon: 'tu_khai' | 'ben_kia_xac_nhan'; phanDoi?: boolean; phieu?: string };
  /** Phần bị trả lại đã thành lô bán gấp này. */
  traVeLoId?: string;
  /** Quá ngày giao chưa cân mà không có đề nghị đổi lịch hoặc giảm lượng. */
  giaoTre?: number;
  phaiTra?: number;
  conPhaiTra?: number;
  daTra?: number;
  hoanCoc?: number;
  tra?: { so: number; luc: number } | null;
  thanhToan?: 'dam_bao' | 'truc_tiep';
  huy?: { ben: 'ban' | 'mua'; lyDo: string; truoc?: TrangThaiDon; cocVe?: 'ban' | 'mua' };
  chungTu?: { ten: string; luc: number }[];
  doiSoat?: { vai: Vai; noiDung: string; luc: number }[];
  /** Kết luận của vận hành khi xử lý tranh chấp (không thay quyết định của hai bên). */
  ketLuan?: { noiDung: string; luc: number };
}

/** Đề nghị đổi điều kiện đơn: một bên gửi, bên kia đồng ý hoặc không. */
export interface DeNghi {
  id: string;
  donMa: string;
  tu: VaiNguoiDung;
  loai: 'doi_lich' | 'giam_luong' | 'doi_gia';
  /** Ngày mới (yyyy-mm-dd), lượng mới (kg) hoặc giá mới (đ/kg). */
  giaTri: string;
  lyDo: string;
  trangThai: 'cho' | 'dong_y' | 'tu_choi';
  luc: number;
}

/* ---------------- Quản lý (giai đoạn 2) ---------------- */

export interface Vuon {
  id: string;
  ban: Ben;
  ten: string;
  loai: 'vuon' | 'ao' | 'ruong';
  dienTich: number;
  donViDienTich: 'ha' | 'cong' | 'm2';
  cay: string;
  soGoc: number;
  namTrong: number;
}

export type GiaiDoanVu = 'chuan_bi' | 'ra_hoa' | 'dau_trai' | 'thu_hoach' | 'xong';
export interface MuaVu {
  id: string;
  vuonId: string;
  ban: Ben;
  ten: string;
  batDau: string;
  giaiDoan: GiaiDoanVu;
  sanLuongUoc: number;
  haiDuKien: string;
}

export type LoaiNhatKy = 'phun_thuoc' | 'bon_phan' | 'tuoi' | 'thu_hoach' | 'cham_soc' | 'khac';
export interface NhatKy {
  id: string;
  ban: Ben;
  vuonId: string;
  ngay: string;
  loai: LoaiNhatKy;
  noiDung: string;
  vatTu?: string;
  luong?: string;
  /** Phun thuốc: số ngày cách ly ghi trên nhãn thuốc. */
  ngayCachLy?: number;
  anh?: string;
  luc: number;
}

export interface ThuChi {
  id: string;
  ban: Ben;
  muaVuId?: string;
  loai: 'thu' | 'chi';
  so: number;
  noiDung: string;
  ngay: string;
  luc: number;
}

export interface PhieuKho {
  id: string;
  mua: Ben;
  /** Đơn trong app, hoặc đơn ghi ngoài app. */
  donMa?: string;
  donNgoaiId?: string;
  matHang: string;
  ten: string;
  loai: string;
  kg: number;
  viTri: string;
  ngayNhap: string;
  hanDung: string;
  xuat: { kg: number; ngay: string; ghiChu: string }[];
}

export interface DonNgoai {
  id: string;
  mua: Ben;
  nguoiBan: string;
  diaChiNguoiBan: string;
  matHang: string;
  ten: string;
  kg: number;
  gia: number;
  ngay: string;
  daTra: number;
}

export interface KeHoach {
  id: string;
  mua: Ben;
  matHang: string;
  ten: string;
  thang: string;
  kgCan: number;
}

export interface MoiQuenNgoai {
  id: string;
  mua: Ben;
  ten: string;
  sdt: string;
  vung: string;
  matHang: string;
}

/* ---------------- Mở rộng và vận hành (giai đoạn 3) ---------------- */

export interface YeuCauDichVu {
  id: string;
  nguoi: Ben;
  vai: VaiNguoiDung;
  loai: 'kiem_dinh' | 'van_chuyen' | 'kho_lanh' | 'so_che';
  donMa?: string;
  loId?: string;
  ngay: string;
  ghiChu: string;
  baoGia?: { doiTac: string; gia: number };
  trangThai: 'cho_bao_gia' | 'da_bao_gia' | 'da_dat' | 'xong' | 'huy';
  luc: number;
}

export interface UngTien {
  id: string;
  donMa: string;
  ban: Ben;
  so: number;
  phi: number;
  trangThai: 'cho_duyet' | 'da_giai_ngan' | 'da_thu_hoi' | 'tu_choi';
  luc: number;
}

export interface YeuCauHoTro {
  id: string;
  nguoi: Ben;
  vai: VaiNguoiDung;
  chuDe: string;
  noiDung: string;
  donMa?: string;
  trangThai: 'moi' | 'dang_xu_ly' | 'xong';
  traLoi: { noiDung: string; luc: number }[];
  luc: number;
}

export interface BaoCaoViPham {
  id: string;
  nguoiBao: Ben;
  doiTuong: { loai: 'nguoi' | 'lo' | 'tin_nhan' | 'nhu_cau'; id: string };
  lyDo: string;
  trangThai: 'moi' | 'giu_nguyen' | 'da_xu_ly';
  luc: number;
}

export interface DanhGia {
  id: string;
  donMa: string;
  tu: Ben;
  cho: Ben;
  diem: 1 | 2 | 3 | 4 | 5;
  nhanXet: string;
  luc: number;
}

/* ---------------- Sổ giao dịch ---------------- */

/** Toàn bộ dữ liệu tầng nghiệp vụ cần. Tầng dữ liệu lưu nguyên khối này (mô phỏng) hoặc ánh xạ sang máy chủ. */
export interface SoGiaoDich {
  phienBan: 2;
  nguoiDung: NguoiDung[];
  lo: Lo[];
  nhuCau: NhuCau[];
  ketNoi: KetNoi[];
  tinNhan: TinNhan[];
  baoGia: BaoGia[];
  henXem: HenXem[];
  don: Don[];
  deNghi: DeNghi[];
  vuon: Vuon[];
  muaVu: MuaVu[];
  nhatKy: NhatKy[];
  thuChi: ThuChi[];
  kho: PhieuKho[];
  donNgoai: DonNgoai[];
  keHoach: KeHoach[];
  moiQuenNgoai: MoiQuenNgoai[];
  dichVu: YeuCauDichVu[];
  ungTien: UngTien[];
  hoTro: YeuCauHoTro[];
  baoCao: BaoCaoViPham[];
  danhGia: DanhGia[];
  chinhSach: ChinhSach;
  dem: Record<string, number>;
}

export type KetQua<T> = { ok: true; giaTri: T } | { ok: false; loi: string };
