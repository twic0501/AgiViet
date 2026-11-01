// Giao dịch HĐ-0018 dùng CHUNG giữa app bán (chị Năm) và app mua (chị Thu Hà) — dữ liệu mô phỏng trong localStorage.
// Hai app mở ở hai khung (cùng máy) thấy cùng một trạng thái: bên này bấm, bên kia vẽ lại ngay (sự kiện storage).
// Không gọi backend. Không có hiệu ứng phụ khi nạp module.

// ── Số tiền HĐ-0018 (khớp prompt app mua V2 mục 4) ──
export const TIEN = { GIA: 23000, GIA_HA: 15000, LUONG: 2000, COC: 13800000, PHI: 138000, TRA_THANG: 32200000, GIA_TRI: 46000000 };

// Kết quả nghiệm thu theo kịch bản
export const NGHIEM_THU = {
  thuan: { dat: 1850, ha: 120, tra: 30 },
  "tra-lai": { dat: 1200, ha: 100, tra: 700 },
  "can-lech": { dat: 1810, ha: 120, tra: 30 },          // cân tại kho 1.960 kg (trong ±5%)
  "phan-doi": { dat: 1866, ha: 104, tra: 30 },          // sau kiểm định: 104/120 kg hạ cấp là đúng
};
export function tinhTien(h) {
  const n = NGHIEM_THU[h.kb] && (h.kb !== "phan-doi" || h.phu === "da-kiem-dinh" || h.buoc >= 12) ? NGHIEM_THU[h.kb] : NGHIEM_THU.thuan;
  const nt = n.dat * TIEN.GIA + n.ha * TIEN.GIA_HA;                 // giá trị nghiệm thu
  const daTra = h.nbXn || 0;                                       // phần trả thẳng người bán đã xác nhận
  const cocNB = Math.max(0, Math.min(TIEN.COC, nt - daTra));        // ngân hàng chuyển cho người bán từ cọc
  return { ...n, nt, cocNB, hoanMua: TIEN.COC - cocNB, nbHoan: Math.max(0, daTra - nt) };
}

// ── Trạng thái HĐ-0018 chung ──
const K_HD = "agv-hd-0018";
export const HD_DAU = { buoc: 0, daTra: 0, nbXn: 0, kb: "thuan", phu: "", ban: 1, huy: false, ngayGiao: "28/10" };
export function docHD() { try { return { ...HD_DAU, ...(JSON.parse(localStorage.getItem(K_HD)) || {}) }; } catch { return { ...HD_DAU }; } }
export function ghiHD(sua) {
  const moi = typeof sua === "function" ? sua(docHD()) || docHD() : { ...docHD(), ...sua };
  try { localStorage.setItem(K_HD, JSON.stringify(moi)); } catch {}
  dispatchEvent(new CustomEvent("agv-hd", { detail: moi }));
  return moi;
}
export function datLaiHD(kb = "thuan") { return ghiHD({ ...HD_DAU, kb }); }
export function ngheHD(f) {
  addEventListener("storage", (e) => { if (e.key === K_HD) f(docHD(), true); });
  addEventListener("agv-hd", () => f(docHD(), false));
}

// ── Trò chuyện chung (lưu theo góc nhìn người bán: ai "toi" = chị Năm, "ho" = bên mua) ──
export const K_TC = "agv-tro-chuyen-v1";
export const TC_DAU = [
  { ma: "T1", ben: "Nhà máy sấy Đồng Xanh", nguoi: "Chị Thu Hà", lo: "L-0412", xm: true, chuaDoc: 1, chuaDocMua: 0, moLienLac: false, tin: [
    { k: "he", t: "Hai bên nhắn qua AgiViet. Số điện thoại che tới khi ngân hàng giữ cọc.", luc: "08:00" },
    { k: "tin", ai: "ho", t: "Chào chị Năm, em bên Đồng Xanh. Xoài lô L-0412 còn đủ 2 tấn loại 1 không chị?", luc: "08:02" },
    { k: "tin", ai: "toi", t: "Dạ còn 3,5 tấn em. Trái 350–550 g, hái 27/10.", luc: "08:10" },
    { k: "anh", ai: "toi", anh: "/assets/products/xoai-cat-chu.jpg", luc: "08:11" },
    { k: "gia", ai: "ho", gia: 22500, luong: 2000, ghi: "Giao tại vườn, bên mua lo xe", luc: "08:20", trang: "da-tra" },
    { k: "gia", ai: "toi", gia: 23500, luong: 2000, ghi: "Bác trả lại", luc: "08:31", trang: "da-tra" },
    { k: "gia", ai: "ho", gia: 23000, luong: 2000, ghi: "Lượt trả giá cuối của bên mua", luc: "09:05", trang: "cho-bac" },
    { k: "tin", ai: "ho", t: "Chị đồng ý 23 ngàn thì em soạn thỏa thuận luôn nha.", luc: "09:06" },
  ] },
  { ma: "T2", ben: "Vựa Ba Cường", nguoi: "Anh Cường", lo: "L-0413", xm: false, chuaDoc: 1, moLienLac: false, tin: [
    { k: "tin", ai: "ho", t: "Chị ơi loại 2 bao nhiêu một ký?", luc: "16:40" },
    { k: "tin", ai: "toi", t: "15 ngàn em, có 800 ký.", luc: "16:52" },
    { k: "tin", ai: "ho", t: "Chị gọi em số ••• ••• ••• cho lẹ", luc: "17:01", che: true },
    { k: "he", canh: true, t: "Tin vừa rồi có số điện thoại nên đã bị che. Trao đổi liên lạc trước khi có cọc là vi phạm (lần 1/3 của bên mua).", luc: "17:01" },
  ] },
  { ma: "T3", ben: "Nhà hàng Bếp Sen", nguoi: "Anh Khoa", lo: "L-0412", xm: true, chuaDoc: 0, moLienLac: true, tin: [
    { k: "he", t: "Hợp đồng khung HĐ-0011 có hiệu lực, ngân hàng đã giữ cọc. Liên lạc đã mở.", luc: "20/10" },
    { k: "tin", ai: "ho", t: "Thứ Sáu này chị giao 50 ký như tuần trước nha.", luc: "07:30" },
    { k: "tin", ai: "toi", t: "Dạ được em.", luc: "07:41" },
  ] },
];
export function docTC() { try { const v = JSON.parse(localStorage.getItem(K_TC)); return Array.isArray(v) ? v : structuredClone(TC_DAU); } catch { return structuredClone(TC_DAU); } }
export function ghiTC(ds) { try { localStorage.setItem(K_TC, JSON.stringify(ds)); } catch {} dispatchEvent(new CustomEvent("agv-tc")); }
export function ngheTC(f) { addEventListener("storage", (e) => { if (e.key === K_TC) f(docTC()); }); }
// Liên lạc mở khi ngân hàng đã giữ cọc HĐ-0018 (bước 5 trở đi) cho hội thoại T1
export const moLienLacT1 = () => docHD().buoc >= 5 && !docHD().huy;

// Phát hiện liên lạc (mô phỏng): ≥ 8 chữ số (kể cả đọc bằng chữ), Zalo/Facebook/@
const SO_CHU = { "không": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9 };
export function quetLienLac(t) {
  const thap = t.toLowerCase();
  const doi = thap.split(/\s+/).map((w) => (w in SO_CHU ? String(SO_CHU[w]) : w)).join(" ");
  const coSo = /(\d[\s.\-_]*){8,}/.test(doi);
  const coKenh = /\b(zalo|zl|facebook|fb|messenger|viber|telegram|sđt|sdt)\b|@[a-z0-9_.]{3,}|kết bạn/.test(thap);
  if (!coSo && !coKenh) return { sach: true, che: t };
  let che = t.replace(/(\d[\s.\-_]*){8,}/g, (x) => "••• ••• •••" + (/\s$/.test(x) ? " " : "")).replace(/\b(zalo|zl|facebook|fb|messenger|viber|telegram)\b/gi, "•••").replace(/@[A-Za-z0-9_.]{3,}/g, "•••");
  if (coSo && che === t) che = "Tin có số điện thoại đọc bằng chữ (đã che)";
  return { sach: false, che, loai: coSo ? "số điện thoại" : "kênh nhắn ngoài" };
}
export const gioNay = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
