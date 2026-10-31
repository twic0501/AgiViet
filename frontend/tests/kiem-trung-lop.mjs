// Dò lớp CSS trùng tên: màn tự định nghĩa lại lớp đã có nghĩa khác trong so-vuon.css (nguồn lỗi bố cục lặp lại:
// .can 32px, .dong lưới, .thanh-tien cao 10px, .vong tròn 56px). Chạy: node tests/kiem-trung-lop.mjs (thoát 1 nếu có trùng mới)
import { readFileSync, readdirSync } from "node:fs";
const D = new URL("../thiet-ke/", import.meta.url).pathname;
const boCmt = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
// Lớp "gốc" = lớp đứng đầu một bộ chọn trong so-vuon.css (.ten, .ten:hover, .ten .con …)
const lopGoc = (css) => {
  const ds = new Set();
  for (const [, chon] of boCmt(css).matchAll(/([^{}]+)\{/g)) for (const phan of chon.split(",")) { const m = phan.trim().match(/^\.([a-z][\w-]*)/i); if (m) ds.add(m[1]); }
  return ds;
};
const goc = lopGoc(readFileSync(D + "so-vuon.css", "utf8"));
// Được phép: màn dùng lớp chung đúng nghĩa và chỉ chỉnh nhẹ (đã duyệt bằng mắt)
const CHO_PHEP = new Set(["nut", "noi", "dau", "dau-xanh", "nen-xanh", "bao", "tab", "trang", "chang", "chang-ten", "the-hd", "khung-tai", "chao", "nut-tron", "nut-chu", "chinh-nut", "phu-nut", "hang-nut", "nut-noi", "hd-wrap", "muc", "loi-tat", "cham-moi", "logo-ben", "dau-luot", "cho-ai", "phu", "ten", "gia", "hang", "so", "so-lon"]);
let loi = 0;
for (const f of readdirSync(D).filter((x) => x.endsWith(".html"))) {
  const html = readFileSync(D + f, "utf8");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const trung = [...lopGoc(css)].filter((c) => goc.has(c) && !CHO_PHEP.has(c));
  // Lớp dùng trong HTML/JS sinh ra mà trùng lớp gốc nhưng màn không tự định nghĩa: nghĩa chung sẽ áp vào → cũng báo
  const dung = new Set([...html.matchAll(/class="([^"$]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
  const nhamNghia = [...dung].filter((c) => goc.has(c) && !CHO_PHEP.has(c) && !trung.includes(c) && new RegExp(`\\.[\\w-]+ \\.${c}\\b`).test(css));
  if (trung.length || nhamNghia.length) { loi++; console.log(`✖ ${f}: định nghĩa lại [${trung.join(", ")}]${nhamNghia.length ? ` · lồng dưới lớp khác [${nhamNghia.join(", ")}]` : ""}`); }
}
console.log(loi ? `${loi} màn có lớp trùng tên với so-vuon.css` : "Không có lớp trùng tên");
process.exitCode = loi ? 1 : 0;
