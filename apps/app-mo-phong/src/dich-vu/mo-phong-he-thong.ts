// Mô phỏng phần "hệ thống": đồng hồ hạn cọc và ngân hàng đối tác giải ngân tiền ở tài khoản đảm bảo.
// Bản thật do máy chủ và ngân hàng làm; ở đây app nào đang mở cũng gọi được, nghiệp vụ bảo đảm mỗi bước chỉ chạy một lần.
import type { NguoiLam } from '@agiviet/nghiep-vu';
import type { DichVuGiaoDich } from './giao-dich.ts';

export const HE_THONG: NguoiLam = { vai: 'he_thong', id: 'he-thong', ten: 'Hệ thống AgiViet' };

/** Một nhịp: đóng đơn quá hạn cọc, giải ngân các khoản đã vào tài khoản đảm bảo. Trả số việc đã làm. */
export function chayMotNhip(dv: DichVuGiaoDich): number {
  let viec = 0;
  const so = dv.doc();
  if (so.don.some(d => d.trangThai === 'cho_coc' && d.coc && dv.bayGio() > d.coc.han)) {
    if (dv.thucHien(HE_THONG, { loai: 'kiem_han' }).ok) viec++;
  }
  for (const d of so.don.filter(x => x.trangThai === 'tien_dang_giu')) {
    if (dv.thucHien(HE_THONG, { loai: 'buoc_don', ma: d.ma, buoc: 'giaiNgan', thamSo: [] }).ok) viec++;
  }
  return viec;
}
