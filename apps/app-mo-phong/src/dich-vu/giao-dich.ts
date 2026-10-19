// Tầng dịch vụ: nhận lệnh từ giao diện, đọc kho, gọi nghiệp vụ, ghi kho. Giao diện không gọi thẳng tầng dữ liệu hay apDung.
import { apDung, type ChinhSach, type KetQua, type Lenh, type NguoiLam, CHINH_SACH_MAC_DINH } from '@agiviet/nghiep-vu';
import type { KhoGiaoDich } from '../du-lieu/kho.ts';

export interface DongHo {
  bayGio(): number;
}
export const DONG_HO_THAT: DongHo = { bayGio: () => Date.now() };

export class DichVuGiaoDich {
  constructor(
    private readonly kho: KhoGiaoDich,
    private readonly dongHo: DongHo = DONG_HO_THAT,
    private readonly chinhSach: ChinhSach = CHINH_SACH_MAC_DINH,
  ) {}

  /** Chạy một lệnh. Trả mã đối tượng vừa tạo/đổi, hoặc lời báo lỗi viết cho người dùng. */
  thucHien(nguoi: NguoiLam, lenh: Lenh): KetQua<string | undefined> {
    // Nếu nơi khác vừa ghi: đọc lại và áp dụng lại trên dữ liệu mới. Nghiệp vụ tự chặn nếu bước không còn hợp lệ.
    for (let lan = 0; lan < 2; lan++) {
      const { so, phienBan } = this.kho.doc();
      const kq = apDung(so, lenh, nguoi, this.dongHo.bayGio(), this.chinhSach);
      if (!kq.ok) return kq;
      if (this.kho.ghi(kq.giaTri.so, phienBan).ok) return { ok: true, giaTri: kq.giaTri.doiTuong };
    }
    return { ok: false, loi: 'Dữ liệu vừa thay đổi ở nơi khác. Xem lại màn rồi thử lại.' };
  }

  doc() {
    return this.kho.doc().so;
  }

  theoDoi(nghe: () => void) {
    return this.kho.theoDoi(nghe);
  }

  bayGio() {
    return this.dongHo.bayGio();
  }
}
