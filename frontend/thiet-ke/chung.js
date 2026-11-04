import "./khung-dt.js";
import "./lich.js";
import "./hieu-ung-ghep.js";
// Phần dùng chung cho các màn mẫu app bán: định dạng, phiên, tải dữ liệu, ảnh sản phẩm, chặng hợp đồng.
export const LUOT = { seller: ["bac", "Bác"], buyer: ["cho", "Bên mua"], bank: ["tien", "Ngân hàng"], ops: ["cho", "AgiViet"], system: ["cho", "Hệ thống"] };
// Mã hạng (backend trả mã thô) → chữ cho bác: L1 → Loại 1, DAT → Hàng dạt, 48-52 (tôm) → Cỡ 48–52 con/kg…
export const tenLoai = (ma) => {
  const m = String(ma || "");
  if (/^L\d+$/.test(m)) return `Loại ${m.slice(1)}`;
  if (/^[A-C]$/.test(m)) return `Loại ${m}`;
  if (m === "DAT") return "Hàng dạt";
  if (m === "chua_tach") return "Chưa tách loại";
  if (m === "ngoai_co") return "Ngoài cỡ";
  if (/^\d+-\d+$/.test(m)) return `Cỡ ${m.replace("-", "–")} con/kg`;
  if (/^\d+(\.\d+)?-\d+(\.\d+)?$/.test(m)) return `Cỡ ${m.replace("-", "–").replace(/\./g, ",")} kg/con`;
  const am = m.match(/^(.+)-am(\d+)$/);
  if (am) return `Giống ${am[1]}, ẩm ≤ ${am[2]}%`;
  return m;
};
// Cỡ chữ người dùng chọn ở màn Tôi: phóng cả trang (giữ bố cục), áp dụng ngay khi mọi màn nạp chung.js
export const CO_CHU = [["1", "Bình thường"], ["1.12", "Lớn"], ["1.25", "Rất lớn"]];
export function datCoChu(v) {
  try { if (v) localStorage.setItem("agv-co-chu", v); v = localStorage.getItem("agv-co-chu") || "1"; } catch { v = v || "1"; }
  document.documentElement.style.zoom = v === "1" ? "" : v;
}
datCoChu();
export const CHANG = ["Chào giá", "Ký", "Cọc", "Giao", "Nhận tiền"];

// Tiền gọn cho thẻ ("41,4 triệu đ"); tienDu cho số đầy đủ (đặt ở title/aria để bác xem chính xác)
export const tien = (v) => {
  const n = Number(v || 0);
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ đ`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu đ`;
  return `${n.toLocaleString("vi-VN")} đ`;
};
export const tienDu = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đồng`;
// Lượng: dưới 10 tấn ghi kg đầy đủ để không làm tròn mất hàng (1.049 kg không thành "1 tấn")
export const can = (g) => {
  const kg = Number(g || 0) / 1000;
  return kg >= 10000 ? [(kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }), "tấn"] : [kg.toLocaleString("vi-VN", { maximumFractionDigits: 0 }), "kg"];
};
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Đọc số người nhập (kg, giá): có phẩy → phẩy là thập phân, chấm là nghìn ("1.234,5"); chỉ có chấm theo nhóm 3 số → nghìn
// ("1.500", "12.000"); còn lại chấm là thập phân ("12.5" — bàn phím số Android, hoặc app tự điền lại khi sửa). Trước đây
// mọi dấu chấm bị bỏ nên "12.5" thành 125.
export const docSo = (s) => {
  const t = String(s ?? "").trim().replace(/\s/g, "");
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  return Number(/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t);
};
console.assert(docSo("12.5") === 12.5 && docSo("12,5") === 12.5 && docSo("1.500") === 1500 && docSo("1.234,5") === 1234.5 && docSo("1500") === 1500 && docSo("0.8") === 0.8, "docSo");
// Số hữu hạn trong khoảng, sai thì null (không chèn chuỗi lạ vào HTML)
export const so = (v, min = -Infinity, max = Infinity) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };

// Ảnh minh họa theo mã mặt hàng (ảnh thật trong /assets/products); không khớp → null (giao diện dùng ô giữ chỗ trung tính)
const ANH = [[/XOAI/, "xoai-cat-chu"], [/SAU_RIENG|DURIAN/, "sau-rieng"], [/THANH_LONG|DRAGON/, "thanh-long"], [/TOM|SHRIMP/, "tom"],
  [/CA_PHE|COFFEE/, "ca-phe"], [/LUA|GAO|RICE/, "lua-gao"], [/BUOI|POMELO|CAM_|QUYT|CHANH/, "buoi"], [/VAI|NHAN|CHOM/, "vai"],
  [/CHUOI|BANANA/, "chuoi"], [/DUA_HAU|DUA_LUOI|MELON/, "dua-hau"], [/RAU|^CAI|XA_LACH/, "rau-cai"], [/KHOAI|CA_ROT/, "cu"],
  [/TIEU|PEPPER/, "ho-tieu"], [/DIEU|CASHEW/, "hat-dieu"], [/CA_TRA|BASA/, "ca-tra"], [/^CUA|CRAB/, "cua"]];
export const ANH_SP = (ma) => { const t = ANH.find(([m]) => m.test(ma || "")); return t ? `/assets/products/${t[1]}.jpg` : null; };

// Chặng hiện tại của hợp đồng (0 chào giá … 4 nhận tiền) theo hien_thi.chang của backend, rơi về trạng thái.
export function chiSoChang(d) {
  const c = (d.hien_thi?.chang || "").toLowerCase();
  const theoTen = [["chào", 0], ["ký", 1], ["cọc", 2], ["giao", 3], ["nghiệm", 3], ["thanh toán", 4], ["quyết", 4], ["tiền", 4]].find(([k]) => c.includes(k));
  if (theoTen) return theoTen[1];
  const s = d.status || "";
  return /outstanding|settl|paid/.test(s) ? 4 : /draft|sign/.test(s) ? 1 : /deposit/.test(s) ? 2 : /deliver|ship|accept/.test(s) ? 3 : /settle|complet/.test(s) ? 4 : 1;
}
// Hợp đồng còn đang chạy (bỏ đã xong/hủy/từ chối)
export const dangLam = (d) => !/complet|cancel|declin|withdrawn|reject|expired|closed/.test(d.status || "");

// "Chờ bên mua ký và gửi" / "Bác cần ký và gửi" — nói rõ ai làm
export const viecCho = (d) => {
  const l = d.hien_thi?.toi_luot;
  if (!l) return d.hien_thi?.ten || d.status;
  const viec = l.viec.charAt(0).toLowerCase() + l.viec.slice(1);
  const ai = LUOT[l.phia]?.[1] || "bên kia";   // giữ hoa tên riêng (AgiViet, Ngân hàng), chỉ hạ "Bên mua"
  return l.phia === d.phia_cua_ban ? `Bác cần ${viec}` : `Chờ ${ai === "Bên mua" ? "bên mua" : ai} ${viec}`;
};

// Phiên: ưu tiên token thật từ đăng nhập OTP (lưu trong sessionStorage);
// chỉ khi không có mới dùng ?thu=<sđt> của môi trường thử (đăng nhập giả lập).
// Ảnh trâu cho màn trống (chỉ app bán): chua-co-don · chua-co-lo-hang · chua-co-tien-ve · chua-co-tin-nhan · khong-co-mang · khong-tim-thay
export const anhTrong = (loai) => `<img class="trau-trong" src="/assets/trau/anh/trong-${loai}@2x.webp" srcset="/assets/trau/anh/trong-${loai}@2x.webp 2x, /assets/trau/anh/trong-${loai}@3x.webp 3x" width="120" height="120" alt="" loading="lazy" decoding="async">`;
if (typeof window !== "undefined") window.anhTrong = anhTrong;
// ── Giọng đọc tiếng Việt dùng chung (Web Speech của máy) ──
// Chọn giọng Việt tự nhiên nhất máy có (Natural / Online / Google / HoaiMy…), tốc độ 0,9 cho người lớn tuổi (bác đổi được ở màn Tôi),
// cao độ 1,05 cho ấm, đọc theo từng câu để có ngắt nghỉ tự nhiên.
const GIONG_UU_TIEN = [/natural/i, /online/i, /google/i, /hoai ?my|hoài ?my/i, /linh|an\b|nam ?minh/i];
function chonGiong() {
  try {
    const ds = speechSynthesis.getVoices().filter((v) => /^vi/i.test(v.lang));
    for (const r of GIONG_UU_TIEN) { const v = ds.find((x) => r.test(x.name)); if (v) return v; }
    return ds[0] || null;
  } catch { return null; }
}
const tocDoDoc = () => { try { return Number(localStorage.getItem("agv-toc-do-doc")) || 0.9; } catch { return 0.9; } };
export function taoGiong(cau, toc) {
  const u = new SpeechSynthesisUtterance(cau);
  u.lang = "vi-VN"; u.rate = toc || tocDoDoc(); u.pitch = 1.05; u.volume = 1;
  const v = chonGiong(); if (v) u.voice = v;
  return u;
}
// Máy không có bộ đọc (vd Chrome trên Linux chưa cài speech-dispatcher) thì nói rõ thay vì im lặng
const baoKhongGiong = () => baoNhanh("Máy này chưa có giọng đọc nên chưa phát tiếng được. Trên điện thoại bác sẽ nghe bình thường.");
// Giọng máy chủ (Gemini TTS) / MP3 tạo sẵn đều trên mọi máy; lỗi/chưa đăng nhập thì dùng giọng của máy.
// Mỗi lượt đọc có số thứ tự: speechSynthesis.cancel() (mọi nơi trong app đang dùng) làm hỏng lượt cũ → lượt cũ tự bỏ sau mỗi bước chờ.
let amDangPhat = null, luotDoc = 0;
const nhoAm = new Map();
try { const goc = speechSynthesis.cancel.bind(speechSynthesis);
  speechSynthesis.cancel = () => { luotDoc++; const a = amDangPhat; amDangPhat = null; if (a) { a.pause(); a.__huy?.(); } goc(); }; } catch {}
async function tokenDoc() {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t) return t; } catch {}
  return new URLSearchParams(location.search).has("thu") ? phien().catch(() => null) : null;
}
// Câu cố định (hướng dẫn…) đã tạo sẵn thành MP3 ở /am-thanh/ (gói miễn phí chỉ ~10 lượt đọc/ngày mỗi mô hình)
let dsAmSan = null;
const amSan = () => (dsAmSan ??= fetch("/am-thanh/ds.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
// → "xong" | "loi" (thử giọng máy) | "huy" (đã bị dừng, không làm gì thêm)
async function docMayChu(doan, toc, luot) {
  const san = (await amSan())[doan];
  if (luot !== luotDoc) return "huy";
  let url = san ? "/am-thanh/" + san : nhoAm.get(doan);
  if (!url) {
    const tk = await tokenDoc(); if (luot !== luotDoc) return "huy";
    if (!tk || doan.length > 400) return "loi";
    const r = await fetch("/v1/tts", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json", authorization: "Bearer " + tk }, body: JSON.stringify({ van_ban: doan }) }).catch(() => null);
    if (luot !== luotDoc) return "huy";
    if (!r?.ok) return "loi";
    url = URL.createObjectURL(await r.blob()); nhoAm.set(doan, url);
    if (luot !== luotDoc) return "huy";
  }
  return new Promise((xong) => {
    const a = new Audio(url); a.playbackRate = Math.min(1.6, Math.max(0.6, (toc || tocDoDoc()) / 0.9)); amDangPhat = a;
    const ket = (kq) => { a.onended = a.onerror = a.__huy = null; if (amDangPhat === a) amDangPhat = null; xong(kq); };
    a.onended = () => ket("xong"); a.onerror = () => ket("loi"); a.__huy = () => ket("huy");
    a.play().catch(() => ket(luot === luotDoc ? "loi" : "huy"));
  });
}
// Đọc thành tiếng; trả true khi đọc xong (hoặc máy không đọc được), false khi bị dừng giữa chừng.
export function docTo(doan, toc) {
  return new Promise(async (xong) => {
    try {
      try { speechSynthesis.cancel(); } catch {}
      const luot = luotDoc;
      const chu = String(doan || "").replace(/\s+/g, " ").trim();
      if (!chu) return xong(true);
      const kq = await docMayChu(chu, toc, luot).catch(() => "loi");
      if (kq === "huy" || luot !== luotDoc) return xong(false);
      if (kq === "xong") return xong(true);
      if (!("speechSynthesis" in window) || !speechSynthesis.getVoices().length) { baoKhongGiong(); return xong(true); }
      const cau = chu.split(/(?<=[.!?…:;])\s+/).map((c) => c.trim()).filter(Boolean);
      const hen = setTimeout(() => xong(luot === luotDoc), 4000 + chu.length * 120); // có máy không báo đọc xong
      cau.forEach((c, i) => { const u = taoGiong(c, toc); if (i === cau.length - 1) u.onend = u.onerror = () => { clearTimeout(hen); xong(luot === luotDoc); }; speechSynthesis.speak(u); });
    } catch { xong(true); }
  });
}
if (typeof window !== "undefined") { window.giongViet = { taoGiong, docTo }; try { speechSynthesis.onvoiceschanged = () => {}; speechSynthesis.getVoices(); } catch {} }

const KHOA_PHIEN = "agv-phien";
export const luuPhien = (token) => { try { sessionStorage.setItem(KHOA_PHIEN, token); } catch {} };
// Phiên hết hạn: API trả 401 cho đúng token đang lưu → xóa token, tải lại một lần (có ?thu= thì tạo phiên thử mới,
// không thì về màn đăng nhập) thay vì kẹt "Thử lại" với token cũ. Cờ theo địa chỉ để không tải lại vòng vòng.
if (typeof window !== "undefined" && !window.__agv401) {
  window.__agv401 = true;
  const CO = "agv-401-tai-lai", goc = window.fetch.bind(window);
  setTimeout(() => { try { sessionStorage.removeItem(CO); } catch {} }, 8000);
  window.fetch = async (u, o) => {
    const r = await goc(u, o);
    try {
      const url = String(u?.url ?? u), h = o?.headers || {}, gui = String(h.authorization || h.Authorization || "");
      const t = sessionStorage.getItem(KHOA_PHIEN);
      if (r.status === 401 && /\/v1\//.test(url) && !/\/v1\/(otp|auth|test)\//.test(url) && t && gui.includes(t)) {
        sessionStorage.removeItem(KHOA_PHIEN);
        if (sessionStorage.getItem(CO) !== location.href) { sessionStorage.setItem(CO, location.href); location.reload(); }
      }
    } catch {}
    return r;
  };
}
export async function phien() {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t) return t; } catch {}
  const sdt = new URLSearchParams(location.search).get("thu");
  // Mất mạng: không được coi là chưa đăng nhập (đá về màn đăng nhập làm bác tưởng bị đăng xuất)
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Chưa có mạng. Bác kết nối lại rồi thử lại; trang đã mở trước đó vẫn xem được.");
  // Chưa đăng nhập: đưa về màn đăng nhập của đúng app thay vì để màn trống báo lỗi.
  const veDangNhap = () => { if (!/dang-nhap|mua-app/.test(location.pathname)) location.replace(/\/mua/.test(location.pathname) ? "./dang-nhap.html?ben=mua" : "./dang-nhap.html"); return new Error("Bác đăng nhập trước nhé."); };
  if (!sdt) throw veDangNhap();
  // Đăng nhập thay bằng số thử chỉ có ở môi trường thử (máy chủ báo test_tools); bản thật luôn bắt đăng nhập OTP
  const MAT_MANG = "Chưa có mạng. Bác kết nối lại rồi thử lại; trang đã mở trước đó vẫn xem được.";
  // Không gọi được máy chủ = mất mạng (navigator.onLine có thể vẫn báo true lúc vừa tải lại) → báo, KHÔNG đá về đăng nhập
  const thu = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => null);
  if (thu === null) throw new Error(MAT_MANG);
  if (!thu.test_tools) throw veDangNhap();
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) }).catch(() => null);
  if (!r) throw new Error(MAT_MANG);
  if (!r.ok) throw new Error("Không mở được tài khoản thử.");
  return (await r.json()).token;
}
// Giữ tham số thử (?thu=) trên mọi liên kết nội bộ khi chuyển màn
export function giuThamSo(goc = document) {
  const thu = new URLSearchParams(location.search).get("thu");
  if (!thu) return;
  goc.querySelectorAll('a[href*=".html"]').forEach((a) => {
    const u = new URL(a.getAttribute("href"), location.href); u.searchParams.set("thu", thu); a.href = u.pathname + u.search + u.hash;
  });
}

// Tải dữ liệu; phần phụ lỗi thì đánh dấu loi (không giả làm rỗng)
export async function layDuLieu(token) {
  const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${d}: ${r.status}`))));
  const phu = (d) => get(d).catch(() => ({ __loi: true }));
  const [me, don, lo, tienTom, troi, sp] = await Promise.all([get("/v1/me"), get("/v1/orders"), get("/v1/lots?mine=true"), get("/v1/money/summary"), phu("/v1/weather"), phu("/v1/products")]);
  const tenSp = new Map((sp.__loi ? [] : Array.isArray(sp) ? sp : sp.items || []).map((p) => [p.code, p.name_vi || p.name]));
  return { me, don, lo, tienTom, troi, tenSp };
}

// ---- Bộ biểu tượng AgiViet: hai lớp — khối tô xanh nhạt bên trong + nét đậm bo tròn 2px; đang chọn thì khối tô đặc, chi tiết bên trong đổi màu kem ----
// Mỗi biểu tượng: [khối (tô), viền (nét), chi tiết (nét)]
const IC = {
  "trang-chu": ["M4 10.2 12 4l8 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z", "M4 10.2 12 4l8 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z", "M10 20.5v-5h4v5"],
  cho: ["M4.5 10.5h15v8.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z", "M3.5 10.5 5.2 4.5h13.6l1.7 6M4.5 10.5v8.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-8.5", "M3.5 10.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0M10 20.5v-4.5h4v4.5"],
  "tin-nhan": ["M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9.5A1.5 1.5 0 0 1 19 17h-8l-5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5z", "M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9.5A1.5 1.5 0 0 1 19 17h-8l-5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5z", "M8 9.5h8M8 12.5h5"],
  tien: ["M4 7.5h15.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5V8.5a1 1 0 0 1 1-1z", "M4 7.5h15.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5V8.5a1 1 0 0 1 1-1zM5 7.5l10-3.5 1.2 3.5", "M15.5 13.75h2.5"],
  "nhat-ky": ["M6.5 3.5H18a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5A2 2 0 0 1 4.5 18.5v-13a2 2 0 0 1 2-2z", "M6.5 3.5H18a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5A2 2 0 0 1 4.5 18.5v-13a2 2 0 0 1 2-2zM8 3.5v17", "M15.5 8c-2.6 0-4 1.6-4 4 2.6 0 4-1.6 4-4zM11.5 12v3"],
  "thoi-tiet": ["M7.5 19a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.7 1A3.5 3.5 0 0 1 17.5 19z", "M7.5 19a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.7 1A3.5 3.5 0 0 1 17.5 19z", "M6 4.5l1 1.2M3.5 8h1.5M10 2.5v1.5"],
  "tin-tuc": ["M5 4.5h11.5V18a2 2 0 0 0 2 2H6.5A1.5 1.5 0 0 1 5 18.5z", "M5 4.5h11.5V18a2 2 0 0 0 2 2H6.5A1.5 1.5 0 0 1 5 18.5zM16.5 9h3v9a2 2 0 0 1-2 2", "M8 8.5h5.5M8 12h5.5M8 15.5h3.5"],
  "hop-dong": ["M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z", "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8zM14 3.5V8h4.5", "M8.5 15.5c1-1.2 1.8-1.2 2.4 0s1.4 1.2 2.4 0M8.5 11.5h4"],
  hoc: ["M12 4.5 21 9l-9 4.5L3 9z", "M12 4.5 21 9l-9 4.5L3 9zM6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11", "M21 9v5"],
  "cai-dat": ["M4 6.5h16M4 12h16M4 17.5h16", "M4 6.5h16M4 12h16M4 17.5h16", "M9 6.5h.01M15 12h.01M8 17.5h.01"],
  "ho-tro": ["M4.5 13.5h3v6h-1.5a1.5 1.5 0 0 1-1.5-1.5zM16.5 13.5h3V18a1.5 1.5 0 0 1-1.5 1.5h-1.5z", "M4.5 15v-3a7.5 7.5 0 0 1 15 0v3M4.5 13.5h3v6h-1.5a1.5 1.5 0 0 1-1.5-1.5zM16.5 13.5h3V18a1.5 1.5 0 0 1-1.5 1.5h-1.5z", "M18 19.5a3 3 0 0 1-3 2h-2"],
  chuong: ["M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z", "M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z", "M10 21a2 2 0 0 0 4 0"],
};
export const bieuTuong = (ten, dac = false, co = 24) => {
  const [khoi, vien, chiTiet] = IC[ten];
  return `<svg viewBox="0 0 24 24" width="${co}" height="${co}" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="${khoi}" fill="currentColor" opacity="${dac ? 1 : 0.16}" stroke="none"/>`
    + `<path d="${vien}" stroke="currentColor" stroke-width="2"/>`
    + `<path d="${chiTiet}" stroke="${dac ? "var(--tren-la)" : "currentColor"}" stroke-width="2"/></svg>`;
};

// Thanh menu dưới dùng chung: Trang chủ · Chợ · Đăng bài · Tin nhắn · Tiền
const MUC_TAB = [["trang-chu", "Trang chủ", "./ban-hom-nay.html"], ["cho", "Chợ", "./ban-hang-hoa.html"], ["dang-bai", "Đăng bài", "./ban-dang-bai.html"],
  ["tin-nhan", "Tin nhắn", "./ban-tin-nhan.html"], ["tien", "Tiền", "./ban-tien.html"]];
// Đăng bài ở giữa là nút tròn xanh lớn nhô lên khỏi thanh; cuộn xuống thì thanh thụt bớt, cuộn lên hiện đủ.
const CONG = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
export function veTab(dangMo, soTin = 0) {
  // Thanh nổi dạng viên thuốc: chỉ biểu tượng; mục đang mở có nền xanh nhạt, biểu tượng đặc và hiện chữ; Đăng bài là nút tròn xanh
  const nav = document.createElement("nav");
  nav.className = "tab"; nav.setAttribute("aria-label", "Mục chính");
  nav.innerHTML = MUC_TAB.map(([k, ten, href]) => k === "dang-bai"
    ? `<a href="${href}" class="tab-giua" aria-label="${ten}"${k === dangMo ? ' aria-current="page"' : ""}><span class="fab">${CONG}</span><span class="nhan">${ten}</span></a>`
    : `<a href="${href}" aria-label="${ten}${k === "tin-nhan" && soTin ? ` (${soTin} tin mới)` : ""}"${k === dangMo ? ' aria-current="page"' : ""}><span class="ic">${bieuTuong(k, k === dangMo)}${k === "tin-nhan" && soTin ? `<i class="cham-moi"></i>` : ""}</span><span class="nhan">${ten}</span></a>`).join("");
  document.querySelector(".trang").appendChild(nav);
  giuThamSo(nav);
  // Cuộn xuống: thanh trượt xuống ẩn; cuộn lên, chạm màn hình hoặc gần đầu trang: trượt lên hiện lại
  let truoc = scrollY, cho = false;
  // header liền khối xanh khi ở đầu trang; --tien (0→1) cho nội dung khối xanh mờ dần trước khi trượt dưới header
  let choTien = false;
  const danhDau = () => { const h = document.documentElement; h.classList.toggle("da-cuon", scrollY > 4);
    if (choTien) return; choTien = true;
    requestAnimationFrame(() => { h.style.setProperty("--tien", Math.min(1, Math.max(0, scrollY / 130)).toFixed(3)); choTien = false; }); };
  danhDau(); addEventListener("scroll", danhDau, { passive: true });
  addEventListener("scroll", () => {
    if (cho) return; cho = true;
    requestAnimationFrame(() => {
      const y = scrollY, d = y - truoc;
      if (Math.abs(d) > 6) { nav.classList.toggle("thu", d > 0 && y > 60); truoc = y; }
      cho = false;
    });
  }, { passive: true });
  addEventListener("pointerdown", (e) => { if (!nav.contains(e.target) && !e.target.closest?.(".nut-cuon")) nav.classList.remove("thu"); }, { passive: true });
  nutCuonNhanh();
  return nav;
}

// Nút cuộn nhanh: hiện khi đang cuộn, ẩn sau 1,6 giây đứng yên; nhấn giữ rồi kéo để cuộn nhanh; chạm để về đầu trang.
function nutCuonNhanh() {
  const n = document.createElement("button");
  n.type = "button"; n.className = "nut-cuon"; n.setAttribute("aria-label", "Cuộn nhanh: chạm để lên đầu trang, giữ và kéo để cuộn");
  n.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4"/></svg>';
  document.body.appendChild(n);
  const TREN = 96, DUOI = 150;   // chừa header và thanh menu
  const toiDa = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const datViTri = () => { const ti = scrollY / toiDa(); n.style.transform = `translateY(${TREN + ti * Math.max(0, innerHeight - TREN - DUOI)}px)`; };
  let hen = 0, keo = false, daKeo = false;
  const hien = () => { if (toiDa() < innerHeight * 0.6) return; n.classList.add("hien"); clearTimeout(hen); hen = setTimeout(() => { if (!keo) n.classList.remove("hien"); }, 1600); };
  addEventListener("scroll", () => { datViTri(); hien(); }, { passive: true });
  n.addEventListener("pointerdown", (e) => { keo = true; daKeo = false; n.setPointerCapture(e.pointerId); n.classList.add("dang-keo"); });
  n.addEventListener("pointermove", (e) => {
    if (!keo) return; daKeo = true;
    const ti = Math.min(1, Math.max(0, (e.clientY - TREN) / Math.max(1, innerHeight - TREN - DUOI)));
    scrollTo({ top: ti * toiDa(), behavior: "instant" });
  });
  const tha = () => { if (!keo) return; keo = false; n.classList.remove("dang-keo"); if (!daKeo) scrollTo({ top: 0, behavior: "smooth" }); hien(); };
  n.addEventListener("pointerup", tha); n.addEventListener("pointercancel", tha);
  // Bàn phím (Enter/Space): lên đầu trang; nút ẩn thì ra khỏi thứ tự Tab
  n.addEventListener("click", (e) => { if (e.detail === 0) scrollTo({ top: 0, behavior: "smooth" }); });
  n.tabIndex = -1;
  new MutationObserver(() => { n.tabIndex = n.classList.contains("hien") ? 0 : -1; }).observe(n, { attributes: true, attributeFilter: ["class"] });
  datViTri();
}

// Header dùng chung: ảnh đại diện + tên bên trái; Hỗ trợ (tai nghe) + Thông báo (chuông, chấm xanh) bên phải
export function veDau(goc, { chao, ten, chuDau, soThongBao = 0 }) {
  goc.classList.add("dau-xanh", "nen-xanh");
  goc.innerHTML = `<div class="dau-trai"><span class="anh-dai-dien" aria-hidden="true">${chuDau ? esc(chuDau) : '<img src="/assets/logo.svg" alt="" width="40" height="40" style="border-radius:50%">'}</span><div><p class="chao">${esc(chao)}</p><h1>${esc(ten)}</h1></div></div>
    <div class="dau-phai">
      <button class="nut-tron" type="button" data-tro-ly aria-label="Trợ lý AgiViet: hỏi đáp, tìm tính năng">${bieuTuong("ho-tro")}</button>
      <a class="nut-tron" href="./ban-thong-bao.html#thong-bao" aria-label="Thông báo${soThongBao ? `, ${soThongBao} mới` : ""}">${bieuTuong("chuong")}${soThongBao ? '<i class="cham-moi"></i>' : ""}</a>
    </div>`;
  goc.querySelector("[data-tro-ly]").onclick = (e) => moTroLy(e.currentTarget);
  giuThamSo(goc);
}

// ---- Trợ lý AgiViet: dẫn đường ngay trên máy (nhanh, không cần mạng) + hỏi AI qua backend cho câu tự do ----
const BO_DAU = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
// Câu soạn sẵn khi trợ lý AI chưa bật: chép đúng lời đã duyệt trong ai/agiviet_ai/tro_ly.py (CAU_LUA, QUY_TRINH), không thêm số.
const CAU_LUA_BAN = "Bác cẩn thận nhé: AgiViet không bao giờ hỏi mã OTP hay mật khẩu, và tiền chỉ đi qua tài khoản đảm bảo ngân hàng trong app. Đừng chuyển tiền hay đọc mã cho ai. Nếu có người yêu cầu, bác bấm Báo cáo trong mục Hỗ trợ.";
const SOAN_SAN = [
  [/quyet toan|hoan (coc|tien)|ket thuc don|xu ly coc|don xong/, "Cọc chỉ được xử lý khi nghiệm thu đã chốt, khoản trả thẳng đến hạn đã được bác xác nhận, không còn tranh chấp và ngân hàng xác nhận đủ điều kiện."], // trước 'coc': 'hoàn cọc' là câu quyết toán
  [/coc|dam bao|ngan hang giu/, "Bên mua cọc 30% giá trị đơn vào tài khoản của ngân hàng đối tác; không bên nào rút được cọc. Hạn cọc 48 giờ (hàng tươi 12 giờ). Sau khi cọc, liên lạc hai bên mới mở."],
  [/dang (ban|lo|hang|bai)|ban (xoai|hang|lua|tom|ca)|dang len/, "Đăng lô: bác đăng giá mong muốn và giá thấp nhất (giá thấp nhất giữ kín, bên mua không thấy). Lô tự ẩn sau 14 ngày nếu không xác nhận còn hàng."],
  [/chao gia|tra gia|tu choi|khong ban|thuong luong/, "Chào giá: bác đồng ý, trả giá hoặc không bán. Mỗi lượt 24 giờ; mỗi bên trả giá tối đa 2 lần. Đồng ý giá thì hàng được giữ 24 giờ. Đồng ý giá chưa phải hợp đồng."],
  [/\bky\b|hop dong/, "Ký: hai bên xem lại thỏa thuận, đề nghị sửa đúng mục hoặc ký bằng mã; hạn 24 giờ, quá hạn đơn tự rút."],
  [/nhu cau|ben mua can|ghep|tim khach/, "Ghép: bác thấy bên mua đang cần hàng của mình trong mục Chợ và có thể chào hàng."], // trước 'giao': bỏ dấu thì 'cần' = 'cân'
  [/giao|boc|can|nghiem thu|xe/, "Giao nhận: đủ thẻ Sẵn sàng giao mới bốc; quét mã, bốc hàng, lập biên bản; bác xác nhận số cân trong 24 giờ, quá hạn thì người vận hành đối chiếu, cọc vẫn giữ."],
  [/tien (ve|con lai|hang)|tra tien|chuyen khoan|tien mat|da nhan/, "Phần tiền còn lại hai bên tự trả cho nhau theo hợp đồng. App ghi nhận và đối soát. Bác xác nhận đúng số đã nhận; im lặng không bao giờ bị coi là đã nhận."],
];
export function cauSoanSan(t) {
  if (/\botp\b|mat khau|ma xac|doc ma|gui ma|tai khoan rieng|chuyen (truoc|ngoai)|ngoai app/.test(t)) return CAU_LUA_BAN;
  const g = SOAN_SAN.find(([m]) => m.test(t));
  return g ? g[1] : "Trợ lý AI đang tạm nghỉ. Bác hỏi về cọc, đăng hàng, chào giá, ký, giao nhận hay tiền thì con trả lời được, hoặc nhắn nhân viên AgiViet.";
}
const DUONG = [
  [/dang (hang|bai|lo|ban)|ban hang moi|them lo/, "Đăng hàng mới", "./ban-dang-bai.html", "Bác bấm vào đây để đăng lô hàng: chọn mặt hàng, nhập lượng, giá và chụp ảnh."],
  [/chao gia|tra gia|tin nhan|nhan tin/, "Xem chào giá", "./ban-tin-nhan.html", "Lời chào giá của bên mua nằm ở mục Tin nhắn."],
  // Chợ so trên chữ CÓ dấu: bỏ dấu thì "chợ" trùng "cho" ("cho tôi hỏi…" sẽ bị dẫn nhầm)
  [/chợ|hàng đang bán|lô hàng|xem lô|sửa lô|còn bao nhiêu/, "Mở Chợ (hàng đang bán)", "./ban-hang-hoa.html", "Hàng bác đang bán nằm ở mục Chợ."],
  [/thong bao/, "Xem thông báo", "./ban-thong-bao.html#thong-bao", "Mọi cập nhật về lô, hợp đồng, tiền nằm trong Thông báo."],
  [/nhan vien|goi|tong dai|xac minh|gap nguoi/, "Nhắn nhân viên AgiViet", "./ban-thong-bao.html#ho-tro", "Bác nhắn cho nhân viên, họ sẽ gọi lại cho bác."],
  [/hop dong|ky /, "Xem hợp đồng", "./ban-hom-nay.html#t-hd", "Hợp đồng đang làm nằm ở Trang chủ, có thanh chặng cho từng hợp đồng."],
  [/thoi tiet|mua|nang/, "Xem thời tiết", "./ban-hom-nay.html#t-troi", "Thời tiết 4 ngày tới nằm ở cuối Trang chủ."],
];
const GOI_Y = ["Xin nhân viên gọi lại", "Tiền cọc của tôi ở đâu?", "Đăng hàng mới", "Xem chào giá của bên mua"];
const LOI_CHAO_TL = "Dạ, con là trâu trợ lý AgiViet. Bác cần gì cứ nói với con: bấm nút micro màu vàng rồi nói, hoặc gõ chữ. Muốn gặp người thật thì bấm Xin nhân viên gọi lại.";
let troLy = null, nutMoTroLy = null;
function dungTroLy() {
  const tam = document.createElement("div");
  tam.innerHTML = `<div class="tl-che" data-dong></div>
    <section class="tl-tam" role="dialog" aria-modal="true" aria-labelledby="tl-tieu" inert>
      <div class="tl-dau"><span class="tl-tay"></span><h2 id="tl-tieu">Nhân viên trâu AgiViet</h2><button type="button" class="tl-dong" data-dong aria-label="Đóng">×</button></div>
      <div class="tl-hoi" id="tl-hoi" aria-live="polite">
        ${trauTuThe("23-tai-nghe", "", 72)}
        <div class="tl-bong ai" id="tl-chao">${esc(LOI_CHAO_TL)}</div>
      </div>
      <div class="tl-goi-y" id="tl-goi-y">${GOI_Y.map((g) => `<button type="button">${esc(g)}</button>`).join("")}</div>
      <p class="tl-nghe-bao" id="tl-nghe-bao" role="status" hidden></p>
      <form class="tl-go" id="tl-go"><button type="button" class="tl-mic" id="tl-mic" aria-label="Bấm rồi nói câu hỏi" aria-pressed="false">${'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'}</button><input id="tl-o" maxlength="600" autocomplete="off" placeholder="Hỏi AgiViet…" aria-label="Câu hỏi"><button type="submit" aria-label="Gửi">${'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'}</button></form>
    </section>`;
  document.body.appendChild(tam);
  const $t = (s) => tam.querySelector(s);
  const hoi = $t("#tl-hoi");
  const them = (lop, html) => { const d = document.createElement("div"); d.className = `tl-bong ${lop}`; d.innerHTML = html; hoi.appendChild(d); hoi.scrollTop = hoi.scrollHeight; return d; };
  // Trả lời: hỏi bằng giọng thì đọc to luôn; câu nào cũng có nút "Nghe" để nghe lại
  const NUT_NGHE = '<button type="button" class="tl-nghe" aria-label="Nghe câu trả lời"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>Nghe</button>';
  const ganNghe = (d) => { d.insertAdjacentHTML("beforeend", NUT_NGHE); const b = d.querySelector(".tl-nghe"); b.onclick = () => docTo(d.dataset.chu || d.textContent.replace(/Nghe$/, "")); };
  const traLoi = (d, chu, noi) => { d.dataset.chu = chu; ganNghe(d); if (noi) docTo(chu); };
  // Gửi kèm đơn đang mở + màn/bước đang đứng để nhân viên khỏi phải hỏi lại "bác đang ở đơn nào".
  function nguCanhHoTro(noiDung) {
    const q = new URLSearchParams(location.search), id = q.get("id") || q.get("don");
    const laUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
    const buoc = (document.querySelector(".hd-viec, [data-buoc-hien-tai]")?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const man = (document.title || location.pathname).replace(/\s+/g, " ").slice(0, 80);
    return { message: `${noiDung}\n— Đang ở: ${man}${buoc ? ` · bước: ${buoc}` : ""}`.slice(0, 1900), ...(laUuid ? { order_id: id } : {}) };
  }
  async function guiNhanVien(noiDung, noi) {
    const cho = them("ai cho", "Đang gửi cho nhân viên…");
    try {
      const token = await phien();
      const r = await fetch("/v1/support", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...nguCanhHoTro(noiDung) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.errors?.[0]?.message || "Chưa gửi được.");
      const chu = "Dạ con đã báo nhân viên AgiViet. Nhân viên sẽ gọi lại cho bác trong giờ làm việc, sáu giờ sáng tới chín giờ tối. Bác xem tiến độ ở trang hồ sơ, mục Hỗ trợ.";
      cho.classList.remove("cho"); cho.textContent = chu; traLoi(cho, chu, noi);
    } catch (e) { cho.classList.remove("cho"); cho.textContent = e.message + " Bác gọi tổng đài 1900 1234 nhé."; traLoi(cho, cho.textContent, noi); }
  }
  async function gui(cau, noi = false) {
    cau = cau.trim(); if (!cau) return;
    them("toi", esc(cau));
    const kd = BO_DAU(cau);
    if (/goi lai|goi cho toi|gap nguoi that|gap nhan vien|noi chuyen voi nguoi/.test(kd)) return guiNhanVien("Xin nhân viên gọi lại: " + cau, noi);
    if (/^nhan (cho )?nhan vien/.test(kd)) return guiNhanVien(cau.replace(/^\s*nhắn\s*(cho\s*)?nhân viên[:,]?\s*/i, "") || cau, noi);
    // Hỏi tiền/cọc: trả lời bằng số liệu hợp đồng thật của bác (không để AI đoán)
    if (/tien coc|coc (cua toi|o dau)|tien (cua toi|o dau|ve chua|ve)|bao gio (co|nhan) tien|khi nao (co|nhan) tien/.test(kd)) {
      const cho = them("ai cho", "Con xem sổ tiền của bác…");
      try {
        const token = await phien(), h = { headers: { authorization: "Bearer " + token } };
        const ds = (await (await fetch("/v1/orders", h)).json()).filter((d) => !/cancel|declin|withdrawn|closed/.test(d.status));
        const TT = { drafting: "chưa tới bước cọc (bên mua đang soạn hợp đồng)", awaiting_seller: "chưa tới bước cọc (chờ bác ký)", awaiting_deposit: "bên mua chưa chuyển cọc, ngân hàng chưa giữ gì", active: "ngân hàng đang giữ cọc, không bên nào rút được", awaiting_settlement: "ngân hàng đang quyết toán, sắp chuyển cho bác", outstanding: "đã giao xong, còn khoản phải trả", completed: "đã quyết toán xong" };
        const dong = [];
        for (const d of ds.slice(0, 4)) {
          const ct = await (await fetch(`/v1/orders/${d.id}`, h)).json().catch(() => ({}));
          const coc = Number(ct.dieu_khoan?.deposit_vnd || 0);
          dong.push(`Hợp đồng ${d.code} với ${d.buyer_name}: cọc ${coc ? tien(coc) : "chưa có"}, ${TT[d.status] || d.status}.${d.hien_thi?.toi_luot ? ` Việc tiếp: ${d.hien_thi.toi_luot.viec}.` : ""}`);
        }
        const chu = dong.length ? `Bác có ${ds.length} hợp đồng. ${dong.join(" ")} Tiền cọc luôn do ngân hàng đối tác giữ, không nằm ở AgiViet.` : "Bác chưa có hợp đồng nào nên chưa có tiền cọc. Khi bên mua chuyển cọc, ngân hàng đối tác giữ và con báo bác ngay.";
        cho.classList.remove("cho"); cho.innerHTML = `${esc(chu)}<a class="tl-di" href="./ban-tien.html">Mở sổ tiền ›</a>`; giuThamSo(cho); traLoi(cho, chu, noi);
      } catch { cho.classList.remove("cho"); cho.textContent = "Con chưa đọc được sổ tiền, bác mở mục Tiền ở thanh dưới nhé."; traLoi(cho, cho.textContent, noi); }
      return;
    }
    const t = BO_DAU(cau), co = cau.toLowerCase();
    // Câu hỏi giải thích (thế nào, làm sao, tại sao…) luôn để AI trả lời; chỉ câu muốn đi tới đâu mới dẫn đường
    const hoiGiaiThich = /the nao|lam sao|tai sao|vi sao|co duoc|nhu nao|giai thich|bao lau|khi nao|bao nhieu|la gi/.test(t);
    const duong = hoiGiaiThich ? null : DUONG.find(([m]) => m.test(t) || m.test(co));
    if (duong) {   // Dẫn đường ngay, không cần gọi AI
      const [, nhan, href, cauTra] = duong;
      const d = them("ai", `${esc(cauTra)}<a class="tl-di" href="${href}">${esc(nhan)} ›</a>`); giuThamSo(d); traLoi(d, cauTra, noi);
      return;
    }
    const cho = them("ai cho", "Đang nghĩ…");
    try {
      const token = await phien();
      const r = await fetch("/v1/assistant/ask", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ cau }) });
      const j = await r.json().catch(() => ({}));
      // AI chưa bật / lỗi máy chủ: trả câu soạn sẵn đã duyệt (lời của ai/agiviet_ai/tro_ly.py), không bịa
      const soan = !r.ok && (j.errors?.[0]?.code === "AI_CHUA_BAT" || r.status >= 500) ? cauSoanSan(t) : null;
      if (soan) { cho.classList.remove("cho"); cho.innerHTML = `${esc(soan)}<a class="tl-di" href="./ban-thong-bao.html#ho-tro">Hỏi thêm nhân viên ›</a>`; giuThamSo(cho); traLoi(cho, soan, noi); return; }
      if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || "Trợ lý chưa trả lời được.");
      cho.classList.remove("cho"); cho.textContent = j.tra_loi; traLoi(cho, j.tra_loi, noi);
    } catch (e) {
      cho.classList.remove("cho"); cho.innerHTML = `${esc(e.message)}<a class="tl-di" href="./ban-thong-bao.html#ho-tro">Nhắn nhân viên ›</a>`; giuThamSo(cho); traLoi(cho, e.message, noi);
    }
  }
  // Hỏi bằng giọng: bấm micro → nói → câu nói hiện vào ô rồi tự gửi (vi-VN). Máy không hỗ trợ thì báo rõ, vẫn gõ được.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $t("#tl-mic"), baoNghe = $t("#tl-nghe-bao");
  const bao = (c) => { baoNghe.textContent = c; baoNghe.hidden = !c; };
  let nghe = null;
  mic.onclick = () => {
    if (nghe) { nghe.stop(); return; }
    if (!SR) { bao("Máy này chưa nghe được giọng nói. Bác gõ câu hỏi, hoặc bấm câu gợi ý ở trên nhé."); return; }
    try { speechSynthesis.cancel(); } catch {}
    nghe = new SR(); nghe.lang = "vi-VN"; nghe.interimResults = true; nghe.maxAlternatives = 1;
    let cuoi = "";
    mic.setAttribute("aria-pressed", "true"); mic.classList.add("dang-nghe"); bao("Đang nghe… bác nói đi, nói xong bấm lại micro.");
    nghe.onresult = (e) => { cuoi = [...e.results].map((r) => r[0].transcript).join(" ").trim(); $t("#tl-o").value = cuoi; };
    nghe.onerror = (e) => { bao(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Bác cho phép app dùng micro trong cài đặt trình duyệt rồi thử lại." : e.error === "no-speech" ? "Chưa nghe thấy gì, bác bấm micro rồi nói lại nhé." : "Chưa nghe rõ, bác thử lại hoặc gõ câu hỏi."); };
    nghe.onend = () => { mic.setAttribute("aria-pressed", "false"); mic.classList.remove("dang-nghe"); nghe = null; if (cuoi) { bao(""); $t("#tl-o").value = ""; gui(cuoi, true); } };
    try { nghe.start(); } catch { bao("Chưa bật được micro, bác thử lại."); nghe = null; mic.classList.remove("dang-nghe"); }
  };
  $t("#tl-goi-y").querySelectorAll("button").forEach((b) => (b.onclick = () => gui(b.textContent)));
  $t("#tl-go").onsubmit = (e) => { e.preventDefault(); const o = $t("#tl-o"); const v = o.value; o.value = ""; gui(v); };
  tam.querySelectorAll("[data-dong]").forEach((b) => (b.onclick = dongTroLy));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && troLy?.querySelector(".tl-tam.mo")) dongTroLy(); });
  return tam;
}
export function moTroLy(nut) {
  troLy ||= dungTroLy(); nutMoTroLy = nut || null;
  const tam = troLy.querySelector(".tl-tam");
  tam.inert = false; tam.classList.add("mo"); troLy.querySelector(".tl-che").classList.add("mo");
  setTimeout(() => troLy.querySelector("#tl-o").focus(), 300);
  if (!troLy.dataset.daChao) { troLy.dataset.daChao = "1"; setTimeout(() => docTo(LOI_CHAO_TL), 350); }   // nhân viên trâu nói trước: tiếng + chữ
}
function dongTroLy() {
  try { speechSynthesis.cancel(); } catch {}
  const tam = troLy.querySelector(".tl-tam");
  tam.classList.remove("mo"); troLy.querySelector(".tl-che").classList.remove("mo"); tam.inert = true; nutMoTroLy?.focus();
}

// ---- Thông báo: backend không lưu "đã đọc" → máy nhớ seq lớn nhất đã xem ----
const KHOA_XEM = "agv-tb-da-xem";
export const seqDaXem = () => { try { return Number(localStorage.getItem(KHOA_XEM)) || 0; } catch { return 0; } };
export const ghiDaXem = (seq) => { try { if (seq > seqDaXem()) localStorage.setItem(KHOA_XEM, String(seq)); } catch {} };
export async function soThongBaoMoi(token) {
  try {
    const r = await fetch("/v1/notifications?limit=50", { headers: { authorization: "Bearer " + token } });
    if (!r.ok) return 0;
    const ds = await r.json(); const da = seqDaXem();
    return (Array.isArray(ds) ? ds : []).filter((n) => Number(n.seq) > da).length;
  } catch { return 0; }
}

// ---- Bong bóng nhắc nhỏ kèm đầu trâu (feed kiểu Motion v2): trượt lên trên thanh dưới, có Nghe + đóng; mỗi lời nhắc 1 lần/ngày ----
// nhacTrau({ khoa: "ky-hd", mat: "lo"|"vui"|"ngac-nhien"|"ngu", chu: "...", an: 12000 })
export function nhacTrau({ khoa, mat = "vui", chu, an = 14000, luonHien = false }) {
  if (typeof document === "undefined" || !chu) return;
  const ngay = new Date().toISOString().slice(0, 10), k = `agv-nhac-${khoa}`;
  try { if (!luonHien && localStorage.getItem(k) === ngay) return; localStorage.setItem(k, ngay); } catch {}
  if (!document.getElementById("css-nhac-trau")) {
    const st = document.createElement("style"); st.id = "css-nhac-trau";
    st.textContent = `.nhac-trau{position:fixed;left:12px;right:12px;bottom:96px;z-index:70;max-width:460px;margin:0 auto;display:flex;gap:10px;align-items:flex-start;background:var(--giay-noi,#fbf8f1);border:1.5px solid var(--ke-dam,rgba(29,42,34,.22));border-radius:18px;padding:10px 10px 10px 8px;box-shadow:0 10px 28px rgba(0,0,0,.18);transform:translateY(24px);opacity:0;transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .32s}
.nhac-trau.hien{transform:none;opacity:1}.nhac-trau img{flex:none;width:56px;height:56px}
.nhac-trau p{margin:2px 0 6px;font-size:16px;line-height:1.45;color:var(--muc,#1d2a22)}
.nhac-trau .nt-day{display:flex;gap:6px}.nhac-trau button{min-height:40px;padding:0 12px;border-radius:999px;border:1px solid var(--ke-dam,rgba(29,42,34,.22));background:#fff;color:var(--la,#1f4d3a);font:700 14px var(--chu,system-ui);cursor:pointer}
.nhac-trau .nt-dong{margin-left:auto;border:0;background:none;color:var(--muc-nhat,#5c645c);font-size:20px;min-width:44px;min-height:44px;padding:0}
@media (prefers-reduced-motion: reduce){.nhac-trau{transition:none}}
body:has(.hd-che, .man-che.mo, [role="dialog"].mo, dialog[open]) .nhac-trau{display:none}`; /* đang mở tấm thao tác → không che nút chính */
    document.head.appendChild(st);
  }
  document.querySelector(".nhac-trau")?.remove();
  const d = document.createElement("aside"); d.className = "nhac-trau"; d.setAttribute("role", "status");
  d.innerHTML = `<img src="/assets/trau/anh/dau-${mat}@2x.webp" alt=""><div style="flex:1;min-width:0"><p>${esc(chu)}</p><div class="nt-day"><button type="button" data-nghe>Nghe</button></div></div><button type="button" class="nt-dong" aria-label="Đóng lời nhắc">✕</button>`;
  document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add("hien"));
  const y0 = scrollY;
  const khiCuon = () => { if (Math.abs(scrollY - y0) > 120) tat(); }; // đang cuộn đọc nội dung → không che (Codex: che màn Tiền)
  const tat = () => { removeEventListener("scroll", khiCuon); d.classList.remove("hien"); setTimeout(() => d.remove(), 350); };
  addEventListener("scroll", khiCuon, { passive: true });
  d.querySelector(".nt-dong").onclick = tat;
  d.querySelector("[data-nghe]").onclick = () => { clearTimeout(hen); docTo(chu); };
  const hen = setTimeout(tat, an);
}
if (typeof window !== "undefined") window.nhacTrau = nhacTrau;

// ---- Trâu theo khoảnh khắc (ảnh tư thế chính diện Claude 2 đã chốt, assets/trau/tu-the/*) ----
// trauTuThe("11-mung", "Đã đồng ý giá") → ảnh trâu nhỏ + bong bóng lời; trang trí, không thay chữ (alt rỗng).
export const trauTuThe = (ma, cau = "", co = 96) => `<div class="trau-tt"><img src="/assets/trau/tu-the/${ma}.webp" width="${co}" height="${co}" alt="" loading="lazy" decoding="async">${cau ? `<p class="trau-tt-loi">${esc(cau)}</p>` : ""}</div>`;
if (typeof window !== "undefined") window.trauTuThe = trauTuThe;

// ---- Trâu động: ảnh tư thế tĩnh → Rive V4g (trau-v4.riv, máy trạng thái "trau", đầu vào số hanh_dong) cùng dáng ----
// Ảnh tĩnh giữ làm dự phòng (giảm chuyển động, lỗi tải, quá số con). Số dáng theo tên hoạt ảnh "Hành động N" trong tệp.
// Giữ ảnh tĩnh (soi lưới 03/11): 03-chao (Rive "1" không thấy vẫy), 20-xe-tai (xe tràn mép khung), 26-dong-ho (thiếu đồng hồ cát).
export const DANG_RIVE = { "01-dung": 0, "02-chop": 0, "04-nghe": 0, "05-nghi": 6, "06-vui": 4, "07-lo": 5, "08-chi": 2, "09-be": 13,
  "10-dien-thoai": 14, "11-mung": 16, "12-ghi-so": 15, "13-chi-trai": 17, "14-chi-xuong": 18, "15-chi-len": 19, "16-cam-tien": 20, "17-ky-giay": 21,
  "18-canh-bao": 22, "19-can": 25, "21-tui-mau": 27, "22-binh-xit-lich": 28, "23-tai-nghe": 29, "24-ngon-cai": 30, "25-binh-tinh": 31,
  "27-non-la": 33, "29-so-sanh": 35 };
const TOI_DA_TRAU = 4; // shortcut: tối đa 4 trâu động mỗi trang cho máy yếu; đo thêm trên máy thật rồi chỉnh
let soTrau = 0, napRive = null;
const layRive = () => napRive ??= (window.rive ? Promise.resolve(window.rive) : new Promise((ok, loi) => {
  const s = document.createElement("script"); s.src = "/assets/vendor/rive/rive.js"; s.onload = () => ok(window.rive); s.onerror = loi; document.head.appendChild(s);
})).then((rv) => { rv.RuntimeLoader.setWasmUrl("/assets/vendor/rive/rive.wasm"); return rv; });
function lamTrauDong(img) {
  const ma = (img.getAttribute("src") || "").match(/tu-the\/([\w-]+)\.webp/)?.[1];
  if (!(ma in DANG_RIVE) || soTrau >= TOI_DA_TRAU) return;
  soTrau++; img.dataset.trauDong = "1";
  layRive().then((rv) => {
    const c = document.createElement("canvas"); c.width = img.width * 2; c.height = img.height * 2;
    c.style.cssText = `width:${img.width}px;height:${img.height}px;flex:none`; c.setAttribute("aria-hidden", "true");
    const r = new rv.Rive({ src: "/assets/trau/trau-v4.riv", canvas: c, autoplay: true, stateMachines: "trau",
      layout: new rv.Layout({ fit: rv.Fit.Contain, alignment: rv.Alignment.BottomCenter }),
      onLoad: () => {
        const vao = r.stateMachineInputs("trau") || [];
        const hd = vao.find((x) => x.name === "hanh_dong"); if (hd) hd.value = DANG_RIVE[ma];
        img.replaceWith(c); // chỉ thay khi Rive đã sẵn sàng, không có khoảng trống
        c.addEventListener("pointerdown", () => vao.find((x) => x.name === "cham")?.fire());
      } });
  }).catch(() => { soTrau--; });
}
if (typeof document !== "undefined" && typeof IntersectionObserver !== "undefined" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const thay = new IntersectionObserver((ds) => ds.forEach((e) => { if (e.isIntersecting) { thay.unobserve(e.target); lamTrauDong(e.target); } }), { rootMargin: "120px" });
  const quet = (goc) => goc.querySelectorAll?.('.trau-tt img[src*="/tu-the/"]:not([data-trau-dong])').forEach((i) => thay.observe(i));
  const chay = () => { quet(document); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && quet(n.parentNode || n)))).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) chay(); else addEventListener("DOMContentLoaded", chay);
}
if (typeof document !== "undefined" && !document.getElementById("css-trau-tt")) {
  const st = document.createElement("style"); st.id = "css-trau-tt";
  st.textContent = `.trau-tt{display:flex;align-items:center;gap:10px;margin:4px 0}.trau-tt img{flex:none;object-fit:contain}
  .trau-tt-loi{position:relative;margin:0;background:var(--giay-noi,#fbf8f1);border:1px solid var(--ke,rgba(29,42,34,.12));border-radius:14px;padding:8px 12px;font-size:15px;color:var(--muc,#1d2a22);line-height:1.4}
  .trau-mang{position:fixed;left:50%;transform:translateX(-50%);top:8px;z-index:60;display:flex;align-items:center;gap:8px;max-width:calc(100% - 32px);background:#3a2f22;color:#fbf8f1;border-radius:14px;padding:6px 12px 6px 6px;font:600 14px var(--chu,system-ui);box-shadow:0 6px 18px rgba(0,0,0,.2)}
  .trau-mang img{width:44px;height:44px}`;
  document.head.appendChild(st);
  // Mất mạng: trâu báo nhẹ trên đầu trang (đã tải thì vẫn xem được; ký, tiền cần mạng)
  const baoMang = () => {
    document.querySelector(".trau-mang")?.remove();
    if (navigator.onLine) return;
    const d = document.createElement("div"); d.className = "trau-mang"; d.setAttribute("role", "status");
    d.innerHTML = `<img src="/assets/trau/anh/trong-khong-co-mang@2x.webp" alt="">Mất mạng. Bác vẫn xem được dữ liệu đã tải; ký, tiền chờ có mạng.`;
    document.body?.appendChild(d);
  };
  addEventListener("offline", baoMang); addEventListener("online", baoMang);
}

// Mã hợp đồng hiển thị thống nhất "HĐ-…": backend sinh mã không dấu (HD-3005, giữ cho nội dung chuyển khoản),
// màn nào in mã cũng tự đổi khi hiện — không sửa dữ liệu, không đụng ô nhập.
const CO_MA_HD = /\bHD-(?=\d)/;
const doiChu = (s) => s.replace(/\bHD-(?=\d)/g, "HĐ-");
function doiMaHD(goc) {
  if (goc.nodeType === 3) { if (CO_MA_HD.test(goc.nodeValue)) goc.nodeValue = doiChu(goc.nodeValue); return; }
  if (goc.nodeType !== 1 || goc.closest?.("input,textarea,script,style")) return;
  const w = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  const ds = []; for (let n = w.nextNode(); n; n = w.nextNode()) if (CO_MA_HD.test(n.nodeValue) && !n.parentElement?.closest("input,textarea,script,style")) ds.push(n);
  for (const n of ds) n.nodeValue = doiChu(n.nodeValue);
}
if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const chay = () => {
    doiMaHD(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === "characterData") doiMaHD(m.target); else m.addedNodes.forEach(doiMaHD); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) chay(); else addEventListener("DOMContentLoaded", chay);
}
// Bản trình diễn: AI đóng mọi bên còn lại (POST /v1/test/doi-tac-ao/vong, chỉ môi trường thử). Mỗi 8 giây khi tab đang xem,
// bên kia làm xong việc gì thì báo một dòng + nút "Xem" tải lại màn. Bản thật không có test_tools → không chạy.
if (typeof document !== "undefined" && /\/(ban-[\w-]+|mua-app|mua)\.html$/.test(location.pathname)) (async () => {
  const cap = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => ({}));
  if (!cap.test_tools) return;
  // Chưa đăng nhập, không số thử (vd mua.html mô phỏng trong trang thử quy trình) → không chạy; gọi phien() lúc này sẽ đá trang về đăng nhập.
  try { if (!sessionStorage.getItem(KHOA_PHIEN) && !new URLSearchParams(location.search).has("thu")) return; } catch { return; }
  let tk = null; try { tk = await phien(); } catch { return; }
  const ten = (v) => `${v.to_chuc.startsWith("TC-M") ? "Bên mua" : "Người bán"} ${v.viec} · ${v.doi_tuong}`;
  const bao = (ds) => {
    let d = document.getElementById("agv-ai-bao");
    if (!d) { d = Object.assign(document.createElement("div"), { id: "agv-ai-bao" }); d.setAttribute("role", "status");
      d.style.cssText = "position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:9998;width:min(92vw,420px);display:flex;gap:10px;align-items:center;padding:10px 10px 10px 14px;border-radius:14px;background:#1f2a22;color:#f4f1e8;font:500 15px/1.4 inherit;box-shadow:0 8px 24px rgba(0,0,0,.2)";
      document.body.append(d); }
    d.innerHTML = `<span style="flex:1;min-width:0">${esc(ds.map(ten).join(" · "))}</span><button type="button" style="min-height:44px;padding:0 14px;border-radius:999px;border:0;background:#f4c84e;color:#1f1503;font:700 15px inherit;cursor:pointer">Xem</button>`;
    d.querySelector("button").onclick = () => location.reload();
    d.hidden = false; clearTimeout(d._an); d._an = setTimeout(() => (d.hidden = true), 12000);
  };
  let dangChay = false;
  const vong = async () => {
    if (document.hidden || dangChay) return;
    dangChay = true; setTimeout(() => (dangChay = false), 30000);
    const r = await fetch("/v1/test/doi-tac-ao/vong", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tk }, body: "{}" }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    dangChay = false;
    let xong = (j?.data ?? j)?.viec?.filter((v) => v.ket_qua === "xong") ?? [];
    if (!xong.length) return;
    // Chỉ báo việc dính tới tổ chức đang đăng nhập (lời chào / lô / đơn của mình), không lộ giao dịch người khác.
    const lay = (u) => fetch(u, { headers: { authorization: "Bearer " + tk } }).then((x) => x.json()).then((x) => { const v = x?.data ?? x; return v?.items ?? v ?? []; }).catch(() => []);
    const [of, don] = await Promise.all([lay("/v1/offers"), lay("/v1/orders")]);
    const cua = new Set([...of.flatMap((o) => [o.code, o.lot_code]), ...don.map((d) => d.code)].filter(Boolean).map((c) => c.replace("HĐ-", "HD-")));
    xong = xong.filter((v) => cua.has(String(v.doi_tuong).replace("HĐ-", "HD-")));
    if (xong.length) bao(xong);
  };
  setTimeout(vong, 2500); setInterval(vong, 8000);
})();
// Tính năng chưa làm (gắn data-dang-phat-trien="Tên"): bấm vào báo đang phát triển thay vì im lặng hay đi trang trống.
// Thông báo nhanh dùng chung (đang phát triển, máy chưa có giọng đọc…)
export function baoNhanh(chu) {
  let t = document.getElementById("agv-dang-phat-trien");
  if (!t) {
    t = Object.assign(document.createElement("div"), { id: "agv-dang-phat-trien" }); t.setAttribute("role", "status");
    t.style.cssText = "position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;width:max-content;max-width:min(92vw,420px);padding:12px 16px;border-radius:12px;background:#1f2a22;color:#f4f1e8;font:500 15px/1.45 inherit;box-shadow:0 8px 24px rgba(0,0,0,.18);text-align:center";
    document.body.append(t);
  }
  t.textContent = chu;
  t.hidden = false; clearTimeout(t._an); t._an = setTimeout(() => (t.hidden = true), 3600);
}
if (typeof document !== "undefined") document.addEventListener("click", (e) => {
  const n = e.target.closest?.("[data-dang-phat-trien]"); if (!n) return;
  e.preventDefault(); e.stopImmediatePropagation();
  baoNhanh(`${n.dataset.dangPhatTrien || "Tính năng này"} đang phát triển, sẽ có ở bản sau.`);
}, true);

// Mở được khi mạng yếu/mất: service worker lưu vỏ app (ưu tiên mạng, mất mạng dùng bản đã lưu), KHÔNG lưu API/phiên/giao dịch.
// Phạm vi /thiet-ke/ để không đụng app cũ /ban/, /mua/ (tự đăng ký riêng).
if (typeof navigator !== "undefined" && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "127.0.0.1" || location.hostname === "localhost"))
  navigator.serviceWorker.register("/sw.js", { scope: "/thiet-ke/" }).catch(() => {});
