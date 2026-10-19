// Kiểu dữ liệu nghiệp vụ. Tên trường tiếng Việt không dấu, giống cách gọi trong tài liệu docs/01-nghiep-vu.

/** Vai của người thao tác. "he_thong" là ngân hàng đối tác và đồng hồ hạn, không phải người dùng. */
export type Vai = 'ban' | 'mua' | 'he_thong';

/** Một bên trong giao dịch: định danh ổn định + tên hiển thị. Liên lạc (số điện thoại, địa chỉ) nằm ở tầng dữ liệu. */
export interface Ben {
  id: string;
  ten: string;
}

/** Người đang thao tác: vai + danh tính. Mọi lệnh đều cần biết ai làm. */
export interface NguoiLam extends Ben {
  vai: Vai;
}

export type CoSoLuong = 'uoc_tinh' | 'da_can';

/** Lô hàng người bán đăng. hua = tổng lượng đã hứa cho các đơn đã xác nhận; giao = đã giao và chốt cân. */
export interface Lo {
  id: string;
  ban: Ben;
  matHang: string;
  ten: string;
  kg: number;
  coSo: CoSoLuong;
  gia: number | null;
  hua: number;
  giao: number;
  haiTu?: string;
  haiDen?: string;
  dangLuc: number;
}

export type TrangThaiKetNoi = 'cho' | 'dong_y' | 'tu_choi';

/** Lời mời kết nối của bên mua với một lô. Người bán đồng ý thì bên mua mới tạo đơn được. */
export interface KetNoi {
  id: string;
  loId: string;
  ban: Ben;
  mua: Ben;
  trangThai: TrangThaiKetNoi;
  guiLuc: number;
  traLoiLuc?: number;
}

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
  ban: Ben;
  mua: Ben;
  kg: number;
  gia: number;
  trangThai: TrangThaiDon;
  phienBan: number;
  taoLuc: number;
  lichSu: DongLichSu[];
  coc?: Coc;
  daCoc?: { so: number; phi: number; luc: number };
  ketQuaCan?: { nhan: number; tuChoi: number; luc: number; nguon: 'tu_khai' | 'ben_kia_xac_nhan'; phanDoi?: boolean };
  phaiTra?: number;
  conPhaiTra?: number;
  daTra?: number;
  hoanCoc?: number;
  tra?: { so: number; luc: number } | null;
  thanhToan?: 'dam_bao' | 'truc_tiep';
  huy?: { ben: 'ban' | 'mua'; lyDo: string; truoc?: TrangThaiDon; cocVe?: 'ban' | 'mua' };
  chungTu?: { ten: string; luc: number }[];
  doiSoat?: { vai: 'ban' | 'mua'; noiDung: string; luc: number }[];
}

/** Toàn bộ dữ liệu giao dịch tầng nghiệp vụ cần. Tầng dữ liệu lưu nguyên khối này (mô phỏng) hoặc ánh xạ sang máy chủ. */
export interface SoGiaoDich {
  phienBan: 1;
  lo: Lo[];
  ketNoi: KetNoi[];
  don: Don[];
  dem: { lo: number; ketNoi: number; don: number };
}

export type KetQua<T> = { ok: true; giaTri: T } | { ok: false; loi: string };
