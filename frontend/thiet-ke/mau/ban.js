// App bán · bản mẫu đủ màn, dữ liệu mô phỏng (không gọi backend). Một trang, chuyển màn có hiệu ứng trượt.
// Mở thẳng một màn: ban.html#man=<mã>  (mã theo AgiViet_danh_muc_man.csv, phần App Nhà sản xuất).
import { MAN_1 } from "./man-1.js";
import { MAN_2 } from "./man-2.js";
import { MAN_3 } from "./man-3.js";
import { DAU } from "./du-lieu.js";

import { esc, ic } from "./tien-ich.js";
export { esc, d, so, kg, ic } from "./tien-ich.js";

// ── Trạng thái mô phỏng ──
const KHOA = "agv-ban-mau";
let s;
try { s = JSON.parse(localStorage.getItem(KHOA)); } catch {}
if (!s || s.phien !== DAU.phien) s = structuredClone(DAU);
const luu = () => { try { localStorage.setItem(KHOA, JSON.stringify(s)); } catch {} };

const MAN = { ...MAN_1, ...MAN_2, ...MAN_3 };
export const DANH_SACH = MAN;
const TAB = [["hom-nay", "Trang chủ", "nha"], ["hang", "Chợ", "cho"], ["dang", "Đăng bài", "them"], ["khach", "Tin nhắn", "tin"], ["tien", "Tiền", "tien"]];

const goc = document.getElementById("m-goc");
let ngan = [];          // ngăn xếp màn: [{ ma, tham }]
let dangChuyen = false;

function veMan(ma, tham = {}) {
  const m = MAN[ma] || MAN["hom-nay"];
  const kq = m.ve(s, tham, api);
  const el = document.createElement("section");
  el.className = "m-man";
  el.dataset.ma = ma;
  const tieu = typeof m.tieu === "function" ? m.tieu(s, tham) : m.tieu;
  const phu = typeof m.phu === "function" ? m.phu(s, tham) : (m.phu ?? "Hộ Nguyễn Thị Năm");
  const coTab = !!m.tab;
  const dau = kq.dau ?? (m.khongDau ? "" : `<header class="m-dau">
      ${coTab ? `<span class="m-lui" style="font-weight:700;font-size:16px" aria-hidden="true">N</span>` : `<button class="m-lui" type="button" data-lui aria-label="Quay lại">${ic("lui")}</button>`}
      <div class="m-dau-chu"><small>${esc(phu)}</small><h1>${esc(tieu)}</h1></div>
      ${coTab ? `<button class="m-dau-nut" type="button" data-di="can-ho-tro" aria-label="Hỗ trợ">${ic("tai")}</button><button class="m-dau-nut" type="button" data-di="thong-bao" aria-label="Thông báo">${ic("chuong")}<i></i></button>` : (m.nutPhai ? m.nutPhai(s, tham) : "")}
    </header>`);
  el.innerHTML = `${dau}
    <div class="m-cuon"><div class="m-than ${coTab ? "m-co-tab" : ""}">${kq.than}</div>${kq.sau || ""}</div>
    ${kq.day ? `<div class="m-day">${kq.day}</div>` : ""}
    ${coTab ? `<nav class="m-tab" aria-label="Menu chính">${TAB.map(([t, ten, i]) => `<button type="button" data-tab="${t}" ${m.tab === t ? 'aria-current="page"' : ""}>${t === "dang" ? `<span class="m-tab-dang">${ic("them", 28)}</span>` : ic(i, 24)}<span>${ten}</span>${t === "khach" && s.chuaDoc ? `<span class="m-dem">${s.chuaDoc}</span>` : ""}</button>`).join("")}</nav>` : ""}`;
  // gắn sự kiện chung
  el.querySelectorAll("[data-lui]").forEach((b) => b.addEventListener("click", () => api.lui()));
  el.querySelectorAll("[data-di]").forEach((b) => b.addEventListener("click", () => api.di(b.dataset.di, b.dataset.tham ? JSON.parse(b.dataset.tham) : {})));
  el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => api.tab(b.dataset.tab)));
  el.querySelectorAll(".m-loc").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  // Hiệu ứng chạm (hieu-ung-app.js của Motion v2): thẻ/dòng bấm được lún nhẹ rồi bật lại
  const HU = window.HieuUng;
  if (HU) el.querySelectorAll(".m-hang, .m-the[role=button], .m-loi-tat button, .m-chon label").forEach((x) => HU.nhan(x));
  m.sau?.(el, s, tham, api);
  return el;
}

const giam = matchMedia("(prefers-reduced-motion: reduce)").matches;
function chuyen(moi, huong) {
  const cu = goc.querySelector(".m-man:last-of-type");
  goc.appendChild(moi);
  window.HieuUng?.noiLen(moi.querySelectorAll(".m-than > *"), 40);
  if (!cu || giam || huong === "thay") { cu?.remove(); return; }
  dangChuyen = true;
  const t = 340, e = "cubic-bezier(.23,1,.32,1)";
  if (huong === "toi") {
    moi.animate([{ transform: "translateX(100%)" }, { transform: "none" }], { duration: t, easing: e });
    cu.animate([{ transform: "none", filter: "brightness(1)" }, { transform: "translateX(-24%)", filter: "brightness(.9)" }], { duration: t, easing: e, fill: "forwards" });
  } else {
    goc.insertBefore(moi, cu);
    moi.animate([{ transform: "translateX(-24%)", filter: "brightness(.9)" }, { transform: "none", filter: "brightness(1)" }], { duration: t, easing: e });
    cu.animate([{ transform: "none" }, { transform: "translateX(100%)" }], { duration: t, easing: e, fill: "forwards" });
  }
  setTimeout(() => { cu.remove(); dangChuyen = false; }, t);
}

export const api = {
  get s() { return s; },
  di(ma, tham = {}) { if (dangChuyen) return; ngan.push({ ma, tham }); chuyen(veMan(ma, tham), "toi"); ghiHash(); },
  lui() { if (dangChuyen) return; if (ngan.length <= 1) { ngan = [{ ma: "hom-nay", tham: {} }]; chuyen(veMan("hom-nay"), "lui"); ghiHash(); return; } ngan.pop(); const t = ngan.at(-1); chuyen(veMan(t.ma, t.tham), "lui"); ghiHash(); },
  thay(ma, tham = {}) { ngan[ngan.length - 1] = { ma, tham }; chuyen(veMan(ma, tham), "toi"); ghiHash(); },
  tab(ma) { if (dangChuyen) return; ngan = [{ ma, tham: {} }]; chuyen(veMan(ma), "thay"); ghiHash(); if (ma === "dang") { /* Đăng bài là màn phụ có nút thoát */ } },
  veLai() { const t = ngan.at(-1); const cu = goc.querySelector(".m-man:last-of-type"); const cuon = cu?.querySelector(".m-cuon")?.scrollTop || 0; const moi = veMan(t.ma, t.tham); cu?.replaceWith(moi); moi.querySelector(".m-cuon").scrollTop = cuon; },
  doi(f) { f(s); luu(); },
  datLai() { s = structuredClone(DAU); luu(); },
  // Nút xác nhận: chấm chờ → dấu tích + chữ "đã xong" (chỉ phản ánh việc đã làm)
  async xong(btn, chu = "Đã lưu") {
    const HU = window.HieuUng;
    if (!HU || !btn) return;
    HU.dangGui(btn);
    await new Promise((r) => setTimeout(r, 550));
    await HU.thanhCong(btn, chu);
    await new Promise((r) => setTimeout(r, 350));
  },
  toast(chu) {
    goc.querySelector(".m-toast")?.remove();
    const t = document.createElement("div"); t.className = "m-toast"; t.setAttribute("role", "status");
    t.innerHTML = `${ic("tich")}<span>${esc(chu)}</span>`; goc.appendChild(t); setTimeout(() => t.remove(), 2700);
  },
  tam(html, gan) {
    const n = document.createElement("div"); n.className = "m-che-nen";
    n.innerHTML = `<div class="m-tam" role="dialog" aria-modal="true"><div class="m-tay"></div>${html}</div>`;
    const dong = () => { n.querySelector(".m-tam").animate([{ transform: "none" }, { transform: "translateY(100%)" }], { duration: 220, easing: "ease-in" }); n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => n.remove(); };
    n.addEventListener("click", (e) => { if (e.target === n || e.target.closest("[data-dong]")) dong(); });
    goc.appendChild(n); gan?.(n, dong); return dong;
  },
};
function ghiHash() { const t = ngan.at(-1); history.replaceState(null, "", `#man=${t.ma}${Object.keys(t.tham).length ? "&" + new URLSearchParams(t.tham) : ""}`); }

// Mở theo hash (bàn thiết kế dẫn thẳng vào từng màn)
function moTheoHash() {
  const q = new URLSearchParams(location.hash.slice(1).split("?")[0]);
  const ma = MAN[q.get("man")] ? q.get("man") : "hom-nay";
  const tham = Object.fromEntries([...q].filter(([k]) => k !== "man"));
  ngan = MAN[ma].tab || ma === "hom-nay" ? [{ ma, tham }] : [{ ma: MAN[ma].ve_tu || "hom-nay", tham: {} }, { ma, tham }];
  goc.innerHTML = "";
  const el = veMan(ma, tham);
  goc.appendChild(el);
  window.HieuUng?.noiLen(el.querySelectorAll(".m-than > *"), 40);
}
addEventListener("hashchange", () => { const q = new URLSearchParams(location.hash.slice(1).split("?")[0]); if (q.get("man") !== ngan.at(-1)?.ma) moTheoHash(); });
moTheoHash();
