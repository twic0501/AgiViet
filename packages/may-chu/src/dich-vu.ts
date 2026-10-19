// Dịch vụ: nhận lệnh từ app, đọc kho, gọi nghiệp vụ, ghi kho. App không gọi thẳng kho hay apDung.
import { apDung, type KetQua, type Lenh, type NguoiLam, type SoGiaoDich } from '@agiviet/nghiep-vu';
import type { DongHo } from './dong-ho.ts';
import type { KhoGiaoDich } from './kho.ts';

export class DichVu {
  readonly kho: KhoGiaoDich;
  readonly dongHo: DongHo;
  constructor(kho: KhoGiaoDich, dongHo: DongHo) {
    this.kho = kho;
    this.dongHo = dongHo;
  }

  /** Chạy một lệnh. Trả mã đối tượng vừa tạo/đổi, hoặc lời báo lỗi viết cho người dùng. */
  thucHien(nguoi: NguoiLam, lenh: Lenh): KetQua<string | undefined> {
    // Nơi khác vừa ghi: đọc lại và áp dụng lại trên dữ liệu mới. Nghiệp vụ tự chặn nếu bước không còn hợp lệ.
    for (let lan = 0; lan < 3; lan++) {
      const { so, phienBan } = this.kho.doc();
      const kq = apDung(so, lenh, nguoi, this.dongHo.bayGio());
      if (!kq.ok) return kq;
      if (this.kho.ghi(kq.giaTri.so, phienBan).ok) return { ok: true, giaTri: kq.giaTri.doiTuong };
    }
    return { ok: false, loi: 'Dữ liệu vừa thay đổi ở nơi khác. Xem lại màn rồi thử lại.' };
  }

  doc(): SoGiaoDich { return this.kho.doc().so; }
  theoDoi(nghe: () => void) { return this.kho.theoDoi(nghe); }
  bayGio() { return this.dongHo.bayGio(); }
  /** Nạp nguyên một sổ (kịch bản mẫu, kết quả ca kiểm thử). */
  nap(so: SoGiaoDich) { this.kho.thay(so); }
}
