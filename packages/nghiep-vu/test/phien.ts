// Phiên thử: giữ một sổ giao dịch trong bộ nhớ và cho từng người làm lệnh, giống tầng dịch vụ của app nhưng không lưu trữ.
import { apDung, soTrong, type Lenh, type NguoiLam, type SoGiaoDich, type TenBuoc, type ThamSoBuoc } from '../src/index.ts';

export const BAT_DAU = Date.UTC(2026, 9, 9, 1);
export const NAM: NguoiLam = { vai: 'ban', id: 'ban-nam', ten: 'Chị Năm · Mỹ Xương' };
export const BAY: NguoiLam = { vai: 'ban', id: 'ban-bay', ten: 'Anh Bảy · Cái Bè' };
export const DONG_XANH: NguoiLam = { vai: 'mua', id: 'mua-dx', ten: 'Nhà máy sấy Đồng Xanh' };
export const MIEN_TAY: NguoiLam = { vai: 'mua', id: 'mua-mt', ten: 'Công ty Trái cây Miền Tây' };
export const HE_THONG: NguoiLam = { vai: 'he_thong', id: 'he-thong', ten: 'Hệ thống' };

export class Phien {
  so: SoGiaoDich = soTrong();
  gio = BAT_DAU;
  /** Chạy lệnh; thành công thì giữ sổ mới và trả mã đối tượng, lỗi thì trả { loi } và sổ giữ nguyên. */
  lam(nguoi: NguoiLam, lenh: Lenh): { ma: string; loi?: undefined } | { loi: string; ma?: undefined } {
    const kq = apDung(this.so, lenh, nguoi, this.gio);
    if (!kq.ok) return { loi: kq.loi };
    this.so = kq.giaTri.so;
    return { ma: kq.giaTri.doiTuong ?? '' };
  }
  buoc<B extends TenBuoc>(nguoi: NguoiLam, ma: string, buoc: B, ...thamSo: ThamSoBuoc[B]) {
    return this.lam(nguoi, { loai: 'buoc_don', ma, buoc, thamSo } as Lenh);
  }
  don(ma: string) { return this.so.don.find(d => d.ma === ma)!; }
  lo(id: string) { return this.so.lo.find(l => l.id === id)!; }
  /** Lô mới của người bán, bên mua kết nối, người bán đồng ý. Trả mã lô. */
  loSanSang(kg = 4000, ban = NAM, mua = DONG_XANH): string {
    const lo = this.lam(ban, { loai: 'dang_lo', matHang: 'passion-fruit', ten: 'Chanh dây', kg, coSo: 'uoc_tinh', gia: 25000 }).ma!;
    const kn = this.lam(mua, { loai: 'gui_loi_moi', loId: lo }).ma!;
    this.lam(ban, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true });
    return lo;
  }
  taoDon(lo: string, kg: number, gia = 25000, mua = DONG_XANH) { return this.lam(mua, { loai: 'tao_don', loId: lo, kg, gia }); }
}
