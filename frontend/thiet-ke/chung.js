// Phần dùng chung cho các màn mẫu app bán: định dạng, phiên, tải dữ liệu, ảnh sản phẩm, chặng hợp đồng.
export const LUOT = { seller: ["bac", "Bác"], buyer: ["cho", "Bên mua"], bank: ["tien", "Ngân hàng"], ops: ["cho", "AgiViet"], system: ["cho", "Hệ thống"] };
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
  const theoTen = [["chào", 0], ["ký", 1], ["cọc", 2], ["giao", 3], ["nghiệm", 3], ["quyết", 4], ["tiền", 4]].find(([k]) => c.includes(k));
  if (theoTen) return theoTen[1];
  const s = d.status || "";
  return /draft|sign/.test(s) ? 1 : /deposit/.test(s) ? 2 : /deliver|ship|accept/.test(s) ? 3 : /settle|complet/.test(s) ? 4 : 1;
}
// Hợp đồng còn đang chạy (bỏ đã xong/hủy/từ chối)
export const dangLam = (d) => !/complet|cancel|declin|withdrawn|reject|expired|closed/.test(d.status || "");

// "Chờ bên mua ký và gửi" / "Bác cần ký và gửi" — nói rõ ai làm
export const viecCho = (d) => {
  const l = d.hien_thi?.toi_luot;
  if (!l) return d.hien_thi?.ten || d.status;
  const viec = l.viec.charAt(0).toLowerCase() + l.viec.slice(1);
  return l.phia === d.phia_cua_ban ? `Bác cần ${viec}` : `Chờ ${(LUOT[l.phia]?.[1] || "bên kia").toLowerCase()} ${viec}`;
};

// Phiên: ưu tiên token thật từ đăng nhập OTP (lưu trong sessionStorage);
// chỉ khi không có mới dùng ?thu=<sđt> của môi trường thử (đăng nhập giả lập).
const KHOA_PHIEN = "agv-phien";
export const luuPhien = (token) => { try { sessionStorage.setItem(KHOA_PHIEN, token); } catch {} };
export async function phien() {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t) return t; } catch {}
  const sdt = new URLSearchParams(location.search).get("thu");
  if (!sdt) throw new Error("Bác đăng nhập trước nhé.");
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) });
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
  ["tin-nhan", "Tin nhắn", "./ban-tin-nhan.html"], ["tien", "Tiền", "#tien"]];
// Đăng bài ở giữa là nút tròn xanh lớn nhô lên khỏi thanh; cuộn xuống thì thanh thụt bớt, cuộn lên hiện đủ.
const CONG = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
export function veTab(dangMo, soTin = 0) {
  // Thanh nổi dạng viên thuốc: chỉ biểu tượng; mục đang mở có nền xanh nhạt, biểu tượng đặc và hiện chữ; Đăng bài là nút tròn xanh
  const nav = document.createElement("nav");
  nav.className = "tab"; nav.setAttribute("aria-label", "Mục chính");
  nav.innerHTML = MUC_TAB.map(([k, ten, href]) => k === "dang-bai"
    ? `<a href="${href}" class="tab-giua" aria-label="${ten}"${k === dangMo ? ' aria-current="page"' : ""}><span class="fab">${CONG}</span></a>`
    : `<a href="${href}" aria-label="${ten}${k === "tin-nhan" && soTin ? ` (${soTin} tin mới)` : ""}"${k === dangMo ? ' aria-current="page"' : ""}><span class="ic">${bieuTuong(k, k === dangMo)}${k === "tin-nhan" && soTin ? `<i class="cham-moi"></i>` : ""}</span><span class="nhan">${ten}</span></a>`).join("");
  document.querySelector(".trang").appendChild(nav);
  giuThamSo(nav);
  // Cuộn xuống: thanh thụt vào; cuộn lên hoặc gần đầu trang: hiện đủ
  let truoc = scrollY, cho = false;
  addEventListener("scroll", () => {
    if (cho) return; cho = true;
    requestAnimationFrame(() => {
      const y = scrollY, d = y - truoc;
      if (Math.abs(d) > 6) { nav.classList.toggle("thu", d > 0 && y > 60); truoc = y; }
      cho = false;
    });
  }, { passive: true });
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
  datViTri();
}

// Header dùng chung: ảnh đại diện + tên bên trái; Hỗ trợ (tai nghe) + Thông báo (chuông, chấm xanh) bên phải
export function veDau(goc, { chao, ten, chuDau, soThongBao = 0 }) {
  goc.innerHTML = `<div class="dau-trai"><span class="anh-dai-dien">${chuDau ? esc(chuDau) : '<img src="/assets/logo.svg" alt="" width="40" height="40" style="border-radius:50%">'}</span><div><p class="chao">${esc(chao)}</p><h1>${esc(ten)}</h1></div></div>
    <div class="dau-phai">
      <button class="nut-tron" type="button" data-tro-ly aria-label="Trợ lý AgiViet: hỏi đáp, tìm tính năng">${bieuTuong("ho-tro")}</button>
      <a class="nut-tron" href="./ban-thong-bao.html#thong-bao" aria-label="Thông báo${soThongBao ? `, ${soThongBao} mới` : ""}">${bieuTuong("chuong")}${soThongBao ? '<i class="cham-moi"></i>' : ""}</a>
    </div>`;
  goc.querySelector("[data-tro-ly]").onclick = (e) => moTroLy(e.currentTarget);
  giuThamSo(goc);
}

// ---- Trợ lý AgiViet: dẫn đường ngay trên máy (nhanh, không cần mạng) + hỏi AI qua backend cho câu tự do ----
const BO_DAU = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
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
const GOI_Y = ["Đăng hàng mới", "Xem chào giá của bên mua", "Tiền cọc của tôi ở đâu?", "Gọi nhân viên AgiViet"];
let troLy = null, nutMoTroLy = null;
function dungTroLy() {
  const tam = document.createElement("div");
  tam.innerHTML = `<div class="tl-che" data-dong></div>
    <section class="tl-tam" role="dialog" aria-modal="true" aria-labelledby="tl-tieu" inert>
      <div class="tl-dau"><span class="tl-tay"></span><h2 id="tl-tieu">Trợ lý AgiViet</h2><button type="button" class="tl-dong" data-dong aria-label="Đóng">×</button></div>
      <div class="tl-hoi" id="tl-hoi" aria-live="polite">
        <div class="tl-bong ai">Chào bác, bác cần làm gì? Bác bấm câu gợi ý hoặc gõ câu hỏi nhé.</div>
      </div>
      <div class="tl-goi-y" id="tl-goi-y">${GOI_Y.map((g) => `<button type="button">${esc(g)}</button>`).join("")}</div>
      <form class="tl-go" id="tl-go"><input id="tl-o" maxlength="600" autocomplete="off" placeholder="Hỏi AgiViet…" aria-label="Câu hỏi"><button type="submit" aria-label="Gửi">${'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'}</button></form>
    </section>`;
  document.body.appendChild(tam);
  const $t = (s) => tam.querySelector(s);
  const hoi = $t("#tl-hoi");
  const them = (lop, html) => { const d = document.createElement("div"); d.className = `tl-bong ${lop}`; d.innerHTML = html; hoi.appendChild(d); hoi.scrollTop = hoi.scrollHeight; return d; };
  async function gui(cau) {
    cau = cau.trim(); if (!cau) return;
    them("toi", esc(cau));
    const t = BO_DAU(cau), co = cau.toLowerCase();
    // Câu hỏi giải thích (thế nào, làm sao, tại sao…) luôn để AI trả lời; chỉ câu muốn đi tới đâu mới dẫn đường
    const hoiGiaiThich = /the nao|lam sao|tai sao|vi sao|co duoc|nhu nao|giai thich|bao lau|khi nao|bao nhieu|la gi/.test(t);
    const duong = hoiGiaiThich ? null : DUONG.find(([m]) => m.test(t) || m.test(co));
    if (duong) {   // Dẫn đường ngay, không cần gọi AI
      const [, nhan, href, cauTra] = duong;
      const d = them("ai", `${esc(cauTra)}<a class="tl-di" href="${href}">${esc(nhan)} ›</a>`); giuThamSo(d);
      return;
    }
    const cho = them("ai cho", "Đang nghĩ…");
    try {
      const token = await phien();
      const r = await fetch("/v1/assistant/ask", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ cau }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || "Trợ lý chưa trả lời được.");
      cho.classList.remove("cho"); cho.textContent = j.tra_loi;
    } catch (e) {
      cho.classList.remove("cho"); cho.innerHTML = `${esc(e.message)}<a class="tl-di" href="./ban-thong-bao.html#ho-tro">Nhắn nhân viên ›</a>`; giuThamSo(cho);
    }
  }
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
}
function dongTroLy() {
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
