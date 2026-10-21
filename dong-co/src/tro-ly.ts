// "Nói để ghi": tách một câu nói tiếng Việt thành dòng nhật ký hoặc dòng thu chi. Bản mô phỏng dùng luật (chạy ngay trên máy);
// người dùng luôn xem và sửa từng trường trước khi lưu ("AI gợi ý, người xác nhận").
import { MAT_HANG } from '@agiviet/danh-muc';

export type LoaiGhi = 'phun_thuoc' | 'bon_phan' | 'tuoi' | 'thu_hoach' | 'cham_soc' | 'chi' | 'thu';
export interface KetQuaTach {
  loai: LoaiGhi;
  ngay: string;
  noiDung: string;
  vatTu?: string;
  luong?: string;
  soTien?: number;
  ngayCachLy?: number;
  vuonId?: string;
  /** Trường nào tách được chắc chắn (để giao diện tô đậm), trường nào là đoán. */
  chac: (keyof KetQuaTach)[];
}

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** "900 nghìn" → 900000; "1 triệu 2" → 1200000; "2tr5" → 2500000; "1,5 triệu" → 1500000; "350k" → 350000. */
export function docTien(cau: string): number | undefined {
  const c = boDau(cau).replace(/(\d)\.(\d{3})/g, '$1$2');
  let m = c.match(/(\d+(?:[.,]\d+)?)\s*(?:trieu|tr|cu)\s*(\d)?(?!\d)/);
  if (m) return Math.round((Number(m[1]!.replace(',', '.')) + (m[2] ? Number(m[2]) / 10 : 0)) * 1e6);
  m = c.match(/(\d+(?:[.,]\d+)?)\s*(?:nghin|ngan|k|ngh)\b/);
  if (m) return Math.round(Number(m[1]!.replace(',', '.')) * 1000);
  m = c.match(/(\d{4,})\s*(?:dong|d)\b/);
  if (m) return Number(m[1]);
  return undefined;
}

function docNgay(cau: string, homNay: string): { ngay: string; chac: boolean } {
  const c = boDau(cau);
  const lui = (n: number) => { const d = new Date(homNay + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  if (/hom kia/.test(c)) return { ngay: lui(2), chac: true };
  if (/hom qua/.test(c)) return { ngay: lui(1), chac: true };
  const m = c.match(/ngay\s*(\d{1,2})\s*(?:\/|thang)\s*(\d{1,2})/);
  if (m) return { ngay: `${homNay.slice(0, 4)}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`, chac: true };
  return { ngay: homNay, chac: /hom nay|sang nay|chieu nay|toi nay/.test(c) };
}

export function tachCau(cau: string, homNay: string, vuon: { id: string; ten: string; cay: string }[] = []): KetQuaTach {
  const c = boDau(cau);
  const chac: KetQuaTach['chac'] = [];
  let loai: LoaiGhi = 'cham_soc';
  if (/\b(phun|xit)\b/.test(c)) loai = 'phun_thuoc';
  else if (/\bbon\b|\bphan\b/.test(c) && !/\bmua\b/.test(c)) loai = 'bon_phan';
  else if (/\btuoi\b/.test(c)) loai = 'tuoi';
  else if (/\b(hai|thu hoach)\b/.test(c) && !/\bban\b/.test(c)) loai = 'thu_hoach';
  else if (/\b(ban duoc|thu duoc|thu tien|ban)\b/.test(c)) loai = 'thu';
  else if (/\b(mua|tra|thue|ton|het|chi)\b/.test(c)) loai = 'chi';
  if (loai !== 'cham_soc') chac.push('loai');
  const n = docNgay(cau, homNay); if (n.chac) chac.push('ngay');
  const kq: KetQuaTach = { loai, ngay: n.ngay, noiDung: cau.trim().replace(/^./, x => x.toUpperCase()), chac };
  const tien = docTien(cau);
  if (tien !== undefined) { kq.soTien = tien; chac.push('soTien'); if (loai === 'cham_soc') { kq.loai = 'chi'; } }
  // Lượng: "3 bao", "2 bình 25 lít", "500 ký"
  // Hết từ kiểu Unicode: \b của JavaScript không hiểu chữ có dấu ("ký")
  const l = cau.match(/(\d+(?:[.,]\d+)?)\s*(bao|bình|binh|lít|lit|chai|gói|goi|ký|ky|kg|tấn|tan|thùng|thung|xe)(?![\p{L}\d])/iu);
  if (l) { kq.luong = `${l[1]} ${l[2]}`; chac.push('luong'); }
  // Thuốc, phân: sau chữ "thuốc"/"phân", tới dấu câu hoặc chữ "cho", "lúc", số
  const vt = cau.match(/((?:thuốc|thuoc|phân|phan)\s+[^,.;\d]{2,40}?)(?=\s+(?:cho|lúc|luc|ở|o|tại|tai|hết|het|giá|gia|cách|cach)\b|[,.;]|\s+\d|$)/i);
  if (vt && (loai === 'phun_thuoc' || loai === 'bon_phan' || loai === 'chi')) { kq.vatTu = vt[1]!.trim(); chac.push('vatTu'); }
  const cl = c.match(/cach ly\s*(\d{1,3})\s*ngay/);
  if (cl) { kq.ngayCachLy = Number(cl[1]); chac.push('ngayCachLy'); }
  const v = vuon.find(x => c.includes(boDau(x.ten)) || c.includes(boDau(x.cay).split(' ')[0]!));
  if (v) { kq.vuonId = v.id; chac.push('vuonId'); }
  return kq;
}

/** "Đăng hàng bằng giọng nói": tách mặt hàng, lượng, giá từ một câu nói. */
export function tachLoiDang(chu: string): { matHang?: string; kg?: number; gia?: number } {
  const c = boDau(chu).replace(/(\d)\.(\d{3})/g, '$1$2');
  const kq: { matHang?: string; kg?: number; gia?: number } = {};
  const tan = c.match(/(\d+(?:[.,]\d+)?)\s*tan\b/), kg = c.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|ky|ki lo|kilogam)\b/);
  if (tan) kq.kg = Math.round(Number(tan[1]!.replace(',', '.')) * 1000); else if (kg) kq.kg = Math.round(Number(kg[1]!.replace(',', '.')));
  const doanGia = c.match(/gia[^,.;]*/)?.[0] ?? (c.match(/\d+\s*(?:nghin|ngan|k)\b[^,.;]*/)?.[0] ?? '');
  const g = docTien(doanGia); if (g) kq.gia = g;
  // Ưu tiên khớp trọn tên (dài trước), rồi mới tới hai chữ đầu: "xoài cát Chu" không được lấy nhầm "xoài cát Hòa Lộc"
  const theoDai = [...MAT_HANG].sort((a, b) => b.ten.length - a.ten.length);
  const mh = theoDai.find(m => c.includes(boDau(m.ten.split(/[(,]/)[0]!.trim()))) ?? theoDai.find(m => c.includes(boDau(m.ten.split(' ').slice(0, 2).join(' '))));
  if (mh) kq.matHang = mh.id;
  return kq;
}
