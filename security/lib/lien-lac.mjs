// Phát hiện và che liên lạc trước khi ngân hàng giữ cọc (số điện thoại, STK, link, email, kênh nhắn ngoài).
// Hàm thuần, không phụ thuộc trình duyệt: dùng được ở app bán, app mua, trang vận hành, bài test Node, và để chép sang backend.
// Nguyên tắc: thà che thừa một chút còn hơn lọt số; nhưng KHÔNG che số tiền, khối lượng, ngày, mã lô / mã đơn.

const BO_DAU = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
// Chữ số đọc bằng chữ (đã bỏ dấu): không, một/mốt, hai, ba, bốn/tư, năm/lăm, sáu, bảy, tám, chín, linh/lẻ = 0, "o" = 0
const SO_CHU = { khong: "0", linh: "0", le: "0", o: "0", mot: "1", mot1: "1", hai: "2", ba: "3", bon: "4", tu: "4", nam: "5", lam: "5", sau: "6", bay: "7", tam: "8", chin: "9" };
const NGAN_HANG = "vcb|vietcombank|agribank|agri|acb|mb|mbbank|techcombank|tcb|bidv|vietinbank|vtb|tpbank|vpbank|sacombank|shb|ocb|hdbank|vib|msb|seabank|stk|so tk|so tai khoan|tai khoan|tk";
const KENH = /\b(zalo|za lo|da lo|de lo|zl|facebook|fb|face|phay|messenger|mess|viber|telegram|tele|tiktok|instagram|insta|ket ban|sdt|so dt|dien thoai)\b/;
const LINK = /https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|vn|me|net|org|ly|io|app|link|info|biz)(\/\S*)?\b/gi;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/gi;
// Email viết lách: "ten at gmail dot com", "ten a còng gmail chấm com"
const EMAIL_LACH = /[a-z0-9._-]{2,}\s*(\(at\)|\bat\b|a cong|acong|\[at\])\s*[a-z0-9-]{2,}\s*(\.|\bdot\b|\bcham\b|\(dot\))\s*(com|vn|net|org)\b/;
// Chữ cái hay dùng thay chữ số khi lách: o→0, l/i→1 (chỉ tính khi đứng sát chữ số khác)
const GIONG_SO = { o: "0", l: "1", i: "1" };
// Số tiền / khối lượng / ngày: loại ra trước khi tìm số điện thoại
const KHONG_PHAI_SDT = [
  /\d{1,3}(?:[.,]\d{3})+\s*(d|dong|vnd|vnđ|k|kg|tan|ta|tr|trieu)\b/gi,
  /\d+(?:[.,]\d+)?\s*(trieu|tr|nghin|ngan|k|kg|tan|ta|g|gam|%)\b/gi,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g,
  /\b(hd|hđ|l|lo|lc|tc|xm)-?\d{2,6}\b/gi,
];

export function quetLienLacDayDu(t) {
  // Bỏ phần đuôi biểu tượng số (0️⃣ = "0" + U+FE0F + U+20E3), đổi chữ số toàn khổ ０-９ về 0-9
  const goc = String(t || "").replace(/[\uFE0F\u20E3]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48));
  let x = BO_DAU(goc.toLowerCase());
  for (const r of KHONG_PHAI_SDT) x = x.replace(r, " ");
  // gộp chữ cái đơn xen dấu ("z.a.l.o", "f-b") thành một từ
  x = x.replace(/\b(?:[a-z][.\-_*](?=[a-z]\b))+[a-z]\b/g, (m) => m.replace(/[.\-_*]/g, ""));
  // tách chữ dính số ("khong9", "o9l8") để đọc từng mẩu
  x = x.replace(/([a-z])(?=\d)/g, "$1 ").replace(/(\d)(?=[a-z])/g, "$1 ");
  // đổi số đọc bằng chữ thành chữ số (bỏ dấu câu xen giữa)
  const tu = x.split(/[\s,;:]+/).filter(Boolean);
  let thayChu = false;
  const laSo = (w) => w !== undefined && (/^\d+$/.test(w) || w in SO_CHU);
  const doiChu = tu.map((w, i) => {
    if (w in SO_CHU) return SO_CHU[w];
    // o / l / i đơn lẻ, hoặc chuỗi "ooo", nằm giữa các mẩu số → coi là chữ số
    if (/^[oli]+$/.test(w) && (laSo(tu[i - 1]) || laSo(tu[i + 1]))) { thayChu = true; return w.replace(/[oli]/g, (c) => GIONG_SO[c]); }
    return w;
  });
  // chuỗi liên tiếp các "từ là chữ số" ghép lại (chỉ tính khi có ít nhất 1 từ đọc bằng chữ, để không đếm trùng)
  let chuoiChu = "", maxChu = ""; const cacChuoi = [];
  doiChu.forEach((w, i) => {
    if (/^\d+$/.test(w) && (w.length <= 4 || tu[i] in SO_CHU || /^[oli]+$/.test(tu[i]))) { chuoiChu += w; if (chuoiChu.length > maxChu.length) maxChu = chuoiChu; }
    else { if (chuoiChu) cacChuoi.push(chuoiChu); chuoiChu = ""; }
  });
  if (chuoiChu) cacChuoi.push(chuoiChu);
  const coChu = thayChu || tu.some((w) => w in SO_CHU && w !== "o" && w !== "le" && w !== "tu" && w !== "nam");
  const lienSo = x.replace(/[\s.\-_/,()·・|]+/g, "");
  const sdtSo = /(?:\+?84|0)\d{8,10}/.test(lienSo.replace(/\+/g, "+"));
  const sdtChu = coChu && cacChuoi.some((c) => /(?:84|0)\d{8,10}/.test(c));
  const stk = new RegExp(`\\b(${NGAN_HANG})\\b[^\\d]{0,12}(\\d[\\s.\\-_/,()·・|]{0,2}){6,}`).test(x);
  const kenh = KENH.test(x);
  const link = new RegExp(LINK.source, "i").test(goc);
  const emailLach = EMAIL_LACH.test(x);
  const email = new RegExp(EMAIL.source).test(goc) || emailLach;
  const handle = new RegExp(HANDLE.source, "i").test(goc);
  const loai = [];
  if (sdtSo || sdtChu) loai.push("số điện thoại");
  if (stk) loai.push("số tài khoản");
  if (link) loai.push("đường link");
  if (email) loai.push("email");
  if (kenh || handle) loai.push("kênh nhắn ngoài");
  if (!loai.length) return { sach: true, che: goc, loai };
  // che trên chữ gốc
  let che = goc
    .replace(EMAIL, "•••")
    .replace(LINK, "•••")
    .replace(HANDLE, (m, a) => `${a}•••`)
    .replace(/(?:\+?84|0)[\s.\-_/,()·・|]*(?:\d[\s.\-_/,()·・|]*){8,10}/g, "••• ••• •••")
    .replace(new RegExp(`(\\b(?:${NGAN_HANG})\\b[^\\d]{0,12})((?:\\d[\\s.\\-_/,()·・|]{0,2}){6,})`, "gi"), (m, a) => `${a}•••`)
    .replace(/(^|[^\p{L}])(zalo|za lô|za lo|dê lô|de lo|da lô|da lo|zl|facebook|fb|phây|phay|messenger|viber|telegram|tiktok|instagram)(?![\p{L}])/giu, (m, a) => `${a}•••`);
  // đã có kênh nhắn ngoài thì che luôn mẩu số đi kèm (≥ 3 chữ số), kể cả số chưa đủ dài
  if (kenh) che = che.replace(/\d[\d\s.\-]{2,}\d/g, "•••");
  if (stk) che = che.replace(/[\d•][\d•\s.\-]*\d/g, "•••");
  if ((sdtChu || emailLach) && che.replace(/•••/g, "") === goc.replace(/•••/g, "")) che = sdtChu ? "Tin có số điện thoại đọc bằng chữ (đã che)" : "Tin có địa chỉ email viết tránh (đã che)";
  return { sach: false, che, loai };
}
