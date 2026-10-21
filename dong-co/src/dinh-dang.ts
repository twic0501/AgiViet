// Định dạng số, tiền, lượng, ngày giờ theo cách người Việt đọc.

export const so = (v: number | null | undefined) => Math.round(v ?? 0).toLocaleString('vi-VN');
export const dong = (v: number | null | undefined) => `${so(v)} đ`;
/** 1.500 kg → "1,5 tấn"; 800 kg → "800 kg". */
export const luong = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tấn` : `${so(kg)} kg`);
/** 95.000.000 → "95 triệu"; 1.250.000.000 → "1,25 tỷ". */
export const tienGon = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : v >= 1e6 ? `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu` : dong(v));
/** "2026-10-19" → "19/10/2026"; ngắn: "19/10". */
export const ngay = (iso: string | undefined, ngan = false) => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return ngan ? `${Number(d)}/${Number(m)}` : `${d}/${m}/${y}`; };
const vn = (luc: number) => new Date(luc + 7 * 3600_000);
export const gio = (luc: number) => { const x = vn(luc); return `${x.getUTCHours()}:${String(x.getUTCMinutes()).padStart(2, '0')}`; };
export const gioNgay = (luc: number) => { const x = vn(luc); return `${gio(luc)} ${x.getUTCDate()}/${x.getUTCMonth() + 1}`; };
/** "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "4 ngày trước". */
export function tuongDoi(luc: number, bayGio: number) {
  const s = Math.max(0, bayGio - luc) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 2 * 86400) return 'hôm qua';
  return `${Math.floor(s / 86400)} ngày trước`;
}
/** Đổi chữ số người gõ (có dấu chấm, phẩy, chữ) thành số. "1.500" → 1500; "2,5" → 2.5. */
export const docSo = (s: string) => {
  const c = s.replace(/\s/g, '');
  const t = (/,\d{1,2}$/.test(c) ? c.replace(/\./g, '').replace(',', '.') : c.replace(/[.,]/g, '')).replace(/[^\d.-]/g, '');
  return /\d/.test(t) ? Number(t) : NaN;   // không có chữ số nào thì không phải số (tránh "abc" thành 0)
};
