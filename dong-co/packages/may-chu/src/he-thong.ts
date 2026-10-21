// Phần "hệ thống" của máy chủ mô phỏng: đồng hồ hạn cọc, ngân hàng đối tác (giải ngân, duyệt ứng tiền), đối tác dịch vụ.
// Bản thật do máy chủ, ngân hàng, đối tác làm; ở đây app nào đang mở cũng gọi được, nghiệp vụ bảo đảm mỗi bước chỉ chạy một lần.
import type { NguoiLam } from '@agiviet/nghiep-vu';
import type { DichVu } from './dich-vu.ts';

export const HE_THONG: NguoiLam = { vai: 'he_thong', id: 'he-thong', ten: 'Hệ thống AgiViet' };

const DOI_TAC = { kiem_dinh: ['Trung tâm Kiểm nghiệm Cần Thơ', 1_200_000], van_chuyen: ['Xe lạnh Phú Gia', 2_800_000], kho_lanh: ['Kho lạnh Sa Đéc', 900_000], so_che: ['Xưởng sấy, cấp đông Tân Phú Đông', 1_600_000] } as const;
/** Ngân hàng, đối tác phản hồi sau bao lâu (giờ mô phỏng; tua đồng hồ để thấy ngay). */
export const TRE = { nganHang: 2 * 60_000, doiTac: 60_000 };

/** Một nhịp: làm mọi việc của hệ thống đã tới lúc. Trả số việc đã làm. */
export function chayMotNhip(dv: DichVu): number {
  let viec = 0;
  const lam = (lenh: Parameters<DichVu['thucHien']>[1]) => { if (dv.thucHien(HE_THONG, lenh).ok) viec++; };
  const so = dv.doc(), gio = dv.bayGio();
  if (so.don.some(d => d.trangThai === 'cho_coc' && d.coc && gio > d.coc.han)) lam({ loai: 'kiem_han' });
  for (const d of so.don.filter(x => x.trangThai === 'tien_dang_giu' && x.tra && gio - x.tra.luc >= TRE.nganHang)) lam({ loai: 'buoc_don', ma: d.ma, buoc: 'giaiNgan', thamSo: [] });
  for (const u of so.ungTien.filter(x => x.trangThai === 'cho_duyet' && gio - x.luc >= TRE.nganHang)) lam({ loai: 'duyet_ung_tien', ungTienId: u.id, dongY: true });
  for (const y of so.dichVu.filter(x => x.trangThai === 'cho_bao_gia' && gio - x.luc >= TRE.doiTac)) {
    const [doiTac, gia] = DOI_TAC[y.loai];
    lam({ loai: 'bao_gia_dich_vu', yeuCauId: y.id, doiTac, gia });
  }
  const homNay = new Date(gio + 7 * 3600_000).toISOString().slice(0, 10);
  for (const y of so.dichVu.filter(x => x.trangThai === 'da_dat' && x.ngay < homNay)) lam({ loai: 'xong_dich_vu', yeuCauId: y.id });
  return viec;
}
