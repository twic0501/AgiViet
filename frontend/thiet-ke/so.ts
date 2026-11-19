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
