// Ghép bộ hiệu ứng (hieu-ung-app.js + hieu-ung-them.js/.css, gom ở ~/Documents/AgiViet/hieu-ung-asset) vào các màn ĐÃ CHỐT.
// Chỉ thêm chuyển động, KHÔNG đổi bố cục, màu, chữ của màn. Nạp tự động qua chung.js.
const giam = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const E = "cubic-bezier(.23,1,.32,1)";

function nap() {
  if (document.getElementById("hu-ghep")) return;
  for (const f of ["./hieu-ung-app.css", "./hieu-ung-them.css"]) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = f; document.head.appendChild(l); }
  for (const f of ["./hieu-ung-app.js", "./hieu-ung-them.js"]) { const s = document.createElement("script"); s.src = f; s.async = false; document.head.appendChild(s); }
  const st = document.createElement("style"); st.id = "hu-ghep";
  st.textContent = `
  /* Nút nhún (Motion v2): bóng mờ 3px phía dưới, bấm lún xuống. :where() để nút có bóng riêng giữ nguyên bóng của nó. */
  :where(.nut) { box-shadow: 0 3px 0 rgba(17, 41, 31, .28); transition: transform 110ms ${E}, box-shadow 110ms ${E}, background-color 140ms ${E}; }
  .nut:active:not(:disabled) { transform: translateY(3px); }
  :where(.nut):active:not(:disabled) { box-shadow: 0 0 0 rgba(17, 41, 31, .28); }
  /* Nút tròn header (quay lại, chuông, hỗ trợ): lún + mũi tên lùi nhẹ */
  .nut-tron { transition: transform 120ms ${E}; }
  .nut-tron:active { transform: translateY(2px) scale(.96); }
  .nut-tron svg { transition: transform 200ms cubic-bezier(.3,1.3,.5,1); }
  #dong:active svg { transform: translateX(-3px); }
  /* Thanh tab: biểu tượng tab đang mở nảy nhẹ khi vào; nút Đăng bài giữa lún khi bấm */
  .tab a[aria-current="page"] .ic { animation: hu-nay-vao 320ms ${E} both; }
  .tab .tab-giua:active .fab { transform: translateY(4px) scale(.98); }
  /* Chuyển trang có hướng: vào từ phải (tới), từ trái (lùi), chỉ mờ (đổi tab) */
  /* Nội dung trượt ngang khi vào trang không được làm trang rộng ra (không lộ thanh cuộn ngang) */
  html.hu-toi body > *, html.hu-lui body > * { overflow-x: clip; }   /* clip không làm hỏng header/tab dính; đặt trên body sẽ bị chuyển lên cửa sổ nên không ăn */
  @keyframes hu-vao-phai { from { opacity: 0; transform: translateX(28px); } }
  @keyframes hu-vao-trai { from { opacity: 0; transform: translateX(-28px); } }
  @keyframes hu-vao-mo { from { opacity: 0; } }
  html.hu-toi .noi, html.hu-toi .hero { animation: hu-vao-phai 220ms ${E} both !important; }
  html.hu-lui .noi, html.hu-lui .hero { animation: hu-vao-trai 220ms ${E} both !important; }
  html.hu-thay .noi, html.hu-thay .hero { animation: hu-vao-mo 160ms ease-out both !important; }
  @media (prefers-reduced-motion: reduce) {
    :where(.nut), .nut-tron, .nut-tron svg { transition: none !important; }
    .nut:active, .nut-tron:active { transform: none !important; }
    html.hu-toi .noi, html.hu-lui .noi, html.hu-thay .noi, html.hu-toi .hero, html.hu-lui .hero, html.hu-thay .hero, .tab a[aria-current="page"] .ic { animation: none !important; }
  }`;
  document.head.appendChild(st);
}

// Hướng vào trang (do trang trước ghi lại khi bấm)
// Trình duyệt có chuyển cảnh giữa hai trang (chuyen-trang.js) thì để nó lo, không trượt kiểu cũ chồng lên
const coVT = () => document.documentElement.hasAttribute("data-hu-vt");
function huongVao() {
  if (coVT()) return;
  let h = null;
  try { h = sessionStorage.getItem("hu-huong"); sessionStorage.removeItem("hu-huong"); } catch {}
  if (h && !giam()) document.documentElement.classList.add("hu-" + h);
}

// Rời trang: màn hiện tại trượt ra theo hướng rồi mới chuyển
const vung = () => document.querySelector(".noi") || document.querySelector("main");
function roi(huong, di) {
  try { sessionStorage.setItem("hu-huong", huong); } catch {}
  const v = vung();
  if (!v || giam()) return di();
  const dx = huong === "toi" ? -28 : huong === "lui" ? 28 : 0;
  v.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${dx}px)` }], { duration: 110, easing: "ease-in", fill: "forwards" });
  setTimeout(di, 100);
}
function ganChuyenTrang() {
  if (coVT()) return;
  // Liên kết sang màn khác trong bản thiết kế
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !/\/thiet-ke\/(ban-[a-z-]+|dang-nhap)\.html$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.hash) return;
    e.preventDefault();
    roi(a.closest(".tab") ? "thay" : "toi", () => { location.href = a.href; });
  });
  // Nút quay lại ở header (#dong): trượt ra phải rồi chạy đúng xử lý cũ của màn
  document.addEventListener("click", (e) => {
    const b = e.target.closest("#dong");
    if (!b || b.dataset.huQua) return;
    e.preventDefault(); e.stopImmediatePropagation();
    roi("lui", () => { b.dataset.huQua = "1"; b.click(); delete b.dataset.huQua; });
  }, true);
}

// Thẻ bấm được lún khi chạm; khối trong màn hiện lần lượt ở lần vẽ đầu
// Chỉ thẻ mà bản thân là liên kết (thẻ có nút con riêng thì không lún cả thẻ)
const THE = "a.the-hd, a.the-lo, a.tb, a.tb-troi, a.tb-troi-on";
function ganCham(goc) {
  const HU = window.HieuUng; if (!HU) return;
  goc.querySelectorAll?.(THE).forEach((x) => { if (!x.dataset.huNhan) { x.dataset.huNhan = "1"; HU.nhan(x); } });
}
function theoDoi() {
  let daHien = false;
  const chay = () => {
    ganCham(document);
    const v = document.querySelector(".noi");
    // Hiện lần lượt khi màn đã có nội dung thật (bỏ qua khung tải)
    if (!daHien && v && v.children.length > 1 && !v.querySelector(":scope > .khung-tai") && window.HieuUngThem) {
      daHien = true; window.HieuUngThem.hienLanLuot([...v.children].slice(0, 8), 45);
    }
  };
  new MutationObserver(chay).observe(document.body, { childList: true, subtree: true });
  setTimeout(chay, 300);
  // Chuông có chấm tin mới: lắc một lần
  setTimeout(() => {
    const chuong = document.querySelector('.dau [aria-label*="hông báo"] svg, .dau a[href*="thong-bao"] svg');
    const coMoi = document.querySelector(".dau .cham-moi, .dau [class*='cham']");
    if (chuong && coMoi && !giam()) chuong.animate([0, -14, 12, -8, 5, 0].map((r) => ({ transform: `rotate(${r}deg)` })), { duration: 560, easing: "cubic-bezier(.45,0,.55,1)" });
  }, 900);
}

if (typeof document !== "undefined") {
  nap(); huongVao();
  const bat = () => { ganChuyenTrang(); theoDoi(); };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", bat) : bat();
}
