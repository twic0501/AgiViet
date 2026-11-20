// Hàm số thuần dùng chung hai app (không đụng DOM, nạp được ở app mua lẫn app bán).
// Đọc số người nhập (kg, giá): có phẩy → phẩy là thập phân, chấm là nghìn ("1.234,5"); chỉ có chấm theo nhóm 3 số → nghìn
// ("1.500", "12.000"); còn lại chấm là thập phân ("12.5" — bàn phím số Android, hoặc app tự điền lại khi sửa). Trước đây
// mọi dấu chấm bị bỏ nên "12.5" thành 125.
export const docSo = (s: unknown): number => {
  const t = String(s ?? "").trim().replace(/\s/g, "");
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  return Number(/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t);
};
console.assert(docSo("12.5") === 12.5 && docSo("12,5") === 12.5 && docSo("1.500") === 1500 && docSo("1.234,5") === 1234.5 && docSo("1500") === 1500 && docSo("0.8") === 0.8, "docSo");

const CS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const baSo = (n: number, du: boolean): string => {
  const t = Math.floor(n / 100), c = Math.floor(n / 10) % 10, d = n % 10, r: string[] = [];
  if (du || t) r.push(CS[t] + " trăm");
  if (c > 1) r.push(CS[c] + " mươi"); else if (c === 1) r.push("mười"); else if (d && (du || t)) r.push("lẻ");
  if (d) r.push(d === 1 && c > 1 ? "mốt" : d === 5 && c > 0 ? "lăm" : d === 4 && c > 1 ? "tư" : CS[d]);
  return r.join(" ");
};
/** 23400 → "Hai mươi ba ngàn bốn trăm đồng" (cho người lớn tuổi kiểm lại số đã gõ). */
export const tienBangChu = (so: number): string => {
  let n = Math.floor(so); if (!(n > 0)) return "";
  const nhom: number[] = []; while (n > 0) { nhom.push(n % 1000); n = Math.floor(n / 1000); }
  const DV = ["", "ngàn", "triệu", "tỷ", "ngàn tỷ"], ra: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) if (nhom[i]) ra.push(baSo(nhom[i], i < nhom.length - 1) + (DV[i] ? " " + DV[i] : ""));
  const s = ra.join(" "); return s[0].toUpperCase() + s.slice(1) + " đồng";
};
