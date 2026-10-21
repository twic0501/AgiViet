// Liên lạc giữa hai bên: chỉ mở khi đã có đơn đặt cọc giữa họ. Trước đó, tin nhắn bị che số điện thoại và đường dẫn ngoài.
import type { SoGiaoDich } from './kieu.ts';

/** Hai người đã có ít nhất một đơn đặt cọc với nhau (bất kể đơn sau đó ra sao). */
export const lienLacMo = (so: SoGiaoDich, banId: string, muaId: string): boolean =>
  so.don.some(d => d.ban.id === banId && d.mua.id === muaId && !!d.daCoc);

const MAU: { loai: string; re: RegExp }[] = [
  // Số điện thoại Việt Nam: 0 hoặc +84, cho phép cách bằng dấu cách, chấm, gạch
  { loai: 'so_dien_thoai', re: /(?:\+?84|0)(?:[\s.\-]?\d){8,10}/g },
  // Số viết bằng chữ ("không chín một tám…"): từ 7 chữ số đọc liên tiếp
  { loai: 'so_bang_chu', re: /(?:\b(?:không|một|mốt|hai|ba|bốn|tư|năm|lăm|sáu|bảy|tám|chín)\b[\s,.-]*){7,}/giu },
  { loai: 'duong_dan', re: /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|vn|net|me|ly)(?:\/\S*)?/gi },
  { loai: 'mang_xa_hoi', re: /(?<![\p{L}])(?:zalo|za\s*lô|zép\s*lào|dép\s*lào|facebook|face|fb|messenger|mess|telegram|viber|tiktok)(?![\p{L}])/giu },
  { loai: 'email', re: /[\w.+-]+@[\w-]+\.[\w.]+/g },
];

/** Che liên lạc trong một tin nhắn. Trả nội dung đã che và các loại đã che (rỗng nếu không che gì). */
export function cheLienLac(noiDung: string): { noiDung: string; biChe: string[] } {
  let kq = noiDung;
  const biChe: string[] = [];
  for (const { loai, re } of MAU) {
    re.lastIndex = 0;
    if (re.test(kq)) {
      biChe.push(loai);
      re.lastIndex = 0;
      kq = kq.replace(re, '•••');
    }
  }
  return { noiDung: kq, biChe };
}
