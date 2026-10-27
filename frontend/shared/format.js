const formatter = new Intl.NumberFormat("vi-VN");
export const money = (value) =>
  value == null ? "Chưa có" : formatter.format(BigInt(value)) + " đ";
export const quantity = (value) =>
  value == null
    ? "Chưa có"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
        Number(value) / 1000,
      ) + " kg";
export function date(value, { time = false } = {}) {
  if (!value) return "Chưa có";
  const d = new Date(value);
  if (Number.isNaN(+d)) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}
const digits = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];
function triple(n, full = false) {
  const h = Math.floor(n / 100),
    t = Math.floor((n % 100) / 10),
    u = n % 10;
  let w = [];
  if (h || full) w.push(digits[h], "trăm");
  if (t > 1) w.push(digits[t], "mươi");
  else if (t === 1) w.push("mười");
  else if ((h || full) && u) w.push("lẻ");
  if (u)
    w.push(u === 1 && t > 1 ? "mốt" : u === 5 && t > 0 ? "lăm" : digits[u]);
  return w.join(" ");
}
export function moneyWords(value) {
  if (value == null) return "Chưa có số tiền";
  let n = BigInt(value);
  if (!n) return "Không đồng";
  const negative = n < 0n;
  n = negative ? -n : n;
  const groups = [];
  while (n) {
    groups.push(Number(n % 1000n));
    n /= 1000n;
  }
  const words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    const level = i % 3;
    const unit = [null, "nghìn", "triệu"][level];
    words.push(triple(groups[i], i < groups.length - 1 && groups[i] < 100));
    if (unit) words.push(unit);
    if (i >= 3)
      words.push(
        Array(Math.floor(i / 3))
          .fill("tỷ")
          .join(" "),
      );
  }
  const s = (negative ? "âm " : "") + words.join(" ") + " đồng";
  return s[0].toUpperCase() + s.slice(1);
}
export const grams = (value) => {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(text))
    throw new Error("Nhập lượng kg, tối đa ba chữ số thập phân.");
  const [whole, fraction = ""] = text.split(".");
  return String(BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0")));
};
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
