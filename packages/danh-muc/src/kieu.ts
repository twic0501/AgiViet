export interface NhomHang {
  id: string;
  ten: string;
  /** Tên tệp icon nhóm (icon/<icon>.svg, bộ asset v1). */
  icon: string;
  /** Mã mẫu chia loại dùng khi đăng lô / tạo nhu cầu. */
  mauChiaLoai: string;
}

export interface MatHang {
  id: string;
  ten: string;
  nhom: string;
  nhomNho: string;
  /** N: nên bán · D: bán có điều kiện (xem dieuKien). */
  muc: 'N' | 'D';
  dieuKien: string;
  /** Tên tệp ảnh thật (anh/<anh>.jpg) nếu có. */
  anh?: string;
}

/** Một trường chia loại: chọn từ danh sách, hoặc nhập số có đơn vị. */
export type TruongChiaLoai =
  | { ma: string; nhan: string; kieu: 'chon'; luaChon: string[] }
  | { ma: string; nhan: string; kieu: 'so'; donVi: string; goiY?: string };

export interface MauChiaLoai {
  ma: string;
  ten: string;
  truong: TruongChiaLoai[];
  /** Có công tắc "Hàng cho chế biến" (loại 2, 3 cho nhà máy). */
  coCheBien: boolean;
}
