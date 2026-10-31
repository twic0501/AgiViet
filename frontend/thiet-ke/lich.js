// Lịch chọn ngày dùng chung cho app bán (thay lịch mặc định của trình duyệt: tiếng Anh, chữ nhỏ, tháng/ngày kiểu Mỹ).
// Mọi input[type=date] tự được thay bằng nút ghi "Thứ Sáu, 7/11/2026"; bấm mở tấm lịch tiếng Việt, ô 44px, có chọn nhanh.
// Input gốc giữ .value dạng YYYY-MM-DD và phát input/change như cũ — code màn không phải đổi. Tôn trọng min/max/disabled.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const isoNgay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const docIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
export const chuNgay = (s) => { const d = docIso(s); return d ? `${THU[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : ""; };
const MUI_T = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
const MUI_P = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`;
const ICON_LICH = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v16H4zM4 10h16M8 3v4M16 3v4"/></svg>`;

const KIEU = `
.lich-an { position: absolute !important; opacity: 0 !important; pointer-events: none !important; width: 1px !important; height: 1px !important; }
.lich-nut { display: flex !important; align-items: center; justify-content: space-between; gap: 10px; text-align: left; cursor: pointer; font: 500 17px/1.2 var(--chu); color: var(--muc); }
.lich-nut.lich-rong { color: var(--muc-nhat); }
.lich-nut svg { flex: none; color: var(--la); }
.lich-nut:disabled { opacity: .5; cursor: not-allowed; }
.lich-che { position: fixed; inset: 0; z-index: 60; background: rgba(15,22,17,.45); display: flex; align-items: flex-end; justify-content: center; animation: lich-mo 180ms both; }
@keyframes lich-mo { from { opacity: 0; } }
.lich-tam { width: min(100%, 480px); background: var(--giay); border-radius: 22px 22px 0 0; padding: 20px 16px 0; display: grid; gap: 14px; animation: lich-len 260ms cubic-bezier(.23,1,.32,1) both; max-height: 92dvh; overflow-y: auto; }
@keyframes lich-len { from { transform: translateY(40px); opacity: .6; } }
@media (prefers-reduced-motion: reduce) { .lich-che, .lich-tam { animation: none; } }
.lich-tam h2 { font-size: 20px; line-height: 1.3; }
.lich-nhanh { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px; }
.lich-nhanh::-webkit-scrollbar { display: none; }
.lich-nhanh button { flex: none; min-height: 44px; padding: 0 16px; border-radius: 22px; border: 0; background: var(--giay-lot); font: 600 15px var(--chu); color: var(--muc); cursor: pointer; }
.lich-nhanh button[aria-pressed="true"] { background: var(--la); color: #f6f2e7; }
.lich-nhanh button:disabled { opacity: .4; cursor: not-allowed; }
.lich-thang { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; }
.lich-thang b { text-align: center; font-size: 17px; }
.lich-thang button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--giay-noi); box-shadow: 0 0 0 1px var(--ke); display: grid; place-items: center; cursor: pointer; color: var(--muc); }
.lich-thang button:disabled { opacity: .35; cursor: default; }
.lich-luoi { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.lich-luoi span { text-align: center; font-size: 13px; font-weight: 600; color: var(--muc-nhat); padding-bottom: 4px; }
.lich-luoi span.lich-cn { color: var(--dau-do); }
.lich-luoi button { height: 44px; min-width: 0; border: 0; border-radius: 12px; background: none; font: 500 16px var(--chu); color: var(--muc); cursor: pointer; font-variant-numeric: tabular-nums; }
.lich-luoi button.lich-nay { box-shadow: inset 0 0 0 1.5px var(--la); font-weight: 700; }
.lich-luoi button[aria-pressed="true"] { background: var(--la); color: #f6f2e7; font-weight: 700; box-shadow: none; }
.lich-luoi button:disabled { color: var(--muc-mo); cursor: not-allowed; }
.lich-ghi { font-size: 14px; color: var(--muc-phu); min-height: 21px; }
.lich-day { position: sticky; bottom: 0; margin: 0 -16px; padding: 12px 16px calc(14px + env(safe-area-inset-bottom)); background: var(--giay); border-top: 1px solid var(--ke); display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; }
.lich-day .nut { min-height: 52px; }
.lich-day .lich-huy { background: transparent; color: var(--la); padding: 0 18px; }
.lich-day .lich-ok { background: var(--la); color: #f6f2e7; }
.lich-day .lich-ok:disabled { opacity: .45; cursor: not-allowed; }`;

function lam(o) {
  if (o.dataset.lich) return;
  o.dataset.lich = "1";
  const n = document.createElement("button");
  n.type = "button";
  n.className = `${o.className} lich-nut`;
  const lb = o.id && document.querySelector(`label[for="${o.id}"]`);
  n.id = (o.id || "ngay-" + Math.random().toString(36).slice(2, 7)) + "-nut";
  if (lb) lb.htmlFor = n.id;
  o.classList.add("lich-an");
  o.tabIndex = -1;
  o.setAttribute("aria-hidden", "true");
  o.after(n);
  const ve = () => {
    const c = chuNgay(o.value);
    n.innerHTML = `<span>${c || "Chọn ngày"}</span>${ICON_LICH}`;
    n.classList.toggle("lich-rong", !c);
    n.setAttribute("aria-label", `${lb ? lb.textContent.trim() + ": " : ""}${c || "chưa chọn ngày"}`);
  };
  // Code màn gán .value bằng lệnh → nút đổi theo
  const goc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  Object.defineProperty(o, "value", { get() { return goc.get.call(this); }, set(v) { goc.set.call(this, v); ve(); }, configurable: true });
  o.addEventListener("change", ve);
  n.addEventListener("click", () => moLich(o, n, lb));
  const dongBo = () => { n.disabled = o.disabled; n.hidden = o.hidden; };
  new MutationObserver(dongBo).observe(o, { attributes: true, attributeFilter: ["disabled", "hidden"] });
  dongBo();
  ve();
}

function moLich(o, nut, lb) {
  const min = docIso(o.min), max = docIso(o.max);
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  let chon = docIso(o.value);
  const goc = chon || (min && min > homNay ? min : max && max < homNay ? max : homNay);
  let thang = new Date(goc.getFullYear(), goc.getMonth(), 1);
  const ngoai = (d) => (min && d < min) || (max && d > max);
  const che = document.createElement("div");
  che.className = "lich-che";
  che.innerHTML = `<div class="lich-tam" role="dialog" aria-modal="true" aria-labelledby="lich-t"><h2 id="lich-t">${esc(lb?.textContent.trim() || "Chọn ngày")}</h2>
    <div class="lich-nhanh" role="group" aria-label="Chọn nhanh"></div><div class="lich-thang"></div><div class="lich-luoi"></div><p class="lich-ghi" aria-live="polite"></p>
    <div class="lich-day"><button type="button" class="nut lich-huy">Đóng</button><button type="button" class="nut lich-ok">Chọn ngày này</button></div></div>`;
  document.body.appendChild(che);
  const cuonCu = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  const $ = (s) => che.querySelector(s);
  const NHANH = [["Hôm nay", 0], ["Ngày mai", 1], ["3 ngày nữa", 3], ["Tuần sau", 7]];
  const ve = () => {
    $(".lich-nhanh").innerHTML = NHANH.map(([t, k]) => { const d = new Date(homNay); d.setDate(d.getDate() + k); return `<button type="button" data-k="${k}" ${ngoai(d) ? "disabled" : ""} aria-pressed="${!!chon && isoNgay(d) === isoNgay(chon)}">${t}</button>`; }).join("");
    const cuoiTruoc = new Date(thang.getFullYear(), thang.getMonth(), 0), dauSau = new Date(thang.getFullYear(), thang.getMonth() + 1, 1);
    $(".lich-thang").innerHTML = `<button type="button" data-t="-1" aria-label="Tháng trước" ${min && cuoiTruoc < min ? "disabled" : ""}>${MUI_T}</button><b>Tháng ${thang.getMonth() + 1}, ${thang.getFullYear()}</b><button type="button" data-t="1" aria-label="Tháng sau" ${max && dauSau > max ? "disabled" : ""}>${MUI_P}</button>`;
    const lech = (thang.getDay() + 6) % 7, soNgay = new Date(thang.getFullYear(), thang.getMonth() + 1, 0).getDate();
    let h = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((t) => `<span class="${t === "CN" ? "lich-cn" : ""}" aria-hidden="true">${t}</span>`).join("");
    for (let i = 0; i < lech; i++) h += "<i></i>";
    for (let k = 1; k <= soNgay; k++) {
      const d = new Date(thang.getFullYear(), thang.getMonth(), k);
      h += `<button type="button" data-n="${k}" class="${isoNgay(d) === isoNgay(homNay) ? "lich-nay" : ""}" aria-pressed="${!!chon && isoNgay(d) === isoNgay(chon)}" ${ngoai(d) ? "disabled" : ""} aria-label="${chuNgay(isoNgay(d))}${isoNgay(d) === isoNgay(homNay) ? " (hôm nay)" : ""}">${k}</button>`;
    }
    $(".lich-luoi").innerHTML = h;
    $(".lich-ghi").textContent = chon ? `Đã chọn: ${chuNgay(isoNgay(chon))}` : (min || max) ? `Chọn từ ${min ? chuNgay(o.min) : "trước"} tới ${max ? chuNgay(o.max) : "sau"}` : "";
    $(".lich-ok").disabled = !chon;
  };
  const dong = () => { che.remove(); document.body.style.overflow = cuonCu; removeEventListener("keydown", phim); nut.focus(); };
  const phim = (e) => { if (e.key === "Escape") dong(); };
  addEventListener("keydown", phim);
  che.addEventListener("click", (e) => {
    if (e.target === che || e.target.closest(".lich-huy")) return dong();
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.t) { thang = new Date(thang.getFullYear(), thang.getMonth() + Number(b.dataset.t), 1); ve(); }
    else if (b.dataset.n) { chon = new Date(thang.getFullYear(), thang.getMonth(), Number(b.dataset.n)); ve(); }
    else if (b.dataset.k) { chon = new Date(homNay); chon.setDate(chon.getDate() + Number(b.dataset.k)); thang = new Date(chon.getFullYear(), chon.getMonth(), 1); ve(); }
    else if (b.classList.contains("lich-ok") && chon) {
      o.value = isoNgay(chon);
      o.dispatchEvent(new Event("input", { bubbles: true }));
      o.dispatchEvent(new Event("change", { bubbles: true }));
      dong();
    }
  });
  ve();
  (che.querySelector('.lich-luoi [aria-pressed="true"]') || $(".lich-ok")).focus();
}

function cai() {
  if (document.getElementById("lich-kieu")) return;
  const st = document.createElement("style");
  st.id = "lich-kieu";
  st.textContent = KIEU;
  document.head.appendChild(st);
  const quet = (g) => g.querySelectorAll?.('input[type="date"]').forEach(lam);
  quet(document);
  new MutationObserver((ds) => ds.forEach((x) => x.addedNodes.forEach((nd) => { if (nd.nodeType !== 1) return; if (nd.matches?.('input[type="date"]')) lam(nd); quet(nd); }))).observe(document.body, { childList: true, subtree: true });
}
if (typeof document !== "undefined") (document.readyState === "loading" ? addEventListener("DOMContentLoaded", cai) : cai());
