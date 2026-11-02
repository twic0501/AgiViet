// Hướng dẫn dùng app lần đầu (tour trên Trang chủ thật): mỗi bước rọi sáng đúng một chỗ, trâu chỉ vào, lời ngắn + nút Nghe.
// Hiện một lần (agv-tour-xong); xem lại từ trang Tôi (ban-hom-nay.html?huong-dan=1). Không chặn người dùng: có "Bỏ qua".
import { esc, docTo, datCoChu, CO_CHU } from "./chung.js";

const KHOA = "agv-tour-xong";
const daXong = () => { try { return localStorage.getItem(KHOA) === "1"; } catch { return false; } };
const ghiXong = () => { try { localStorage.setItem(KHOA, "1"); } catch {} };

// [bộ chọn phần tử, dáng trâu, tiêu đề, lời]; null = không rọi (thẻ giữa màn)
const BUOC = [
  [null, "03-chao", "Chào bác tới AgiViet", "Con là trâu, đi cùng bác. Con chỉ bác mấy chỗ chính trong 1 phút nha. Bác bấm Nghe để con đọc cho bác."],
  [".tb-xanh", "13-chi-trai", "Việc cần làm hôm nay", "Ô xanh này báo việc đang chờ bác: lời chào giá mới, hợp đồng cần ký, tiền cần xác nhận. Bấm nút vàng là làm ngay."],
  [".loi-tat", "14-chi-xuong", "Lối tắt", "Thời tiết, nhật ký canh tác, hợp đồng, giá và tin tức, cài đặt — bấm vào ô là mở."],
  ["nav.tab", "14-chi-xuong", "Thanh dưới cùng", "Chợ là hàng bác đang bán và bên mua cần gì. Nút tròn ở giữa để đăng bán. Tin nhắn để trả lời giá và nhắn với bên mua. Tiền để xem tiền về."],
  ["a[href=\"./ban-toi.html\"]", "15-chi-len", "Cài đặt và hỗ trợ", "Bấm vào ô này để xem hồ sơ, nộp giấy tờ như VietGAP, mã vùng trồng, đổi cỡ chữ và nhờ nhân viên AgiViet giúp."],
  [".dau-phai", "15-chi-len", "Hỏi và nghe thông báo", "Nút tai nghe để hỏi trâu bằng giọng nói hoặc gõ chữ. Cái chuông là thông báo mới."],
  ["@co-chu", "02-chop", "Chữ có dễ đọc không?", "Bác chọn cỡ chữ cho dễ nhìn. Sau này đổi lại ở trang hồ sơ."],
  [null, "24-ngon-cai", "Xong rồi bác!", "Tiền cọc do ngân hàng giữ, bác không phải đóng tiền gì để bán. Có gì vướng, bác bấm tai nghe hỏi con nha."],
];

let o = null, i = 0, dang = false;
const css = `.hd-che{position:fixed;inset:0;z-index:80;pointer-events:auto}
.hd-ro{position:fixed;z-index:81;border-radius:16px;box-shadow:0 0 0 9999px rgba(20,28,22,.62);outline:3px solid #f2c94c;outline-offset:3px;transition:all .28s ease;pointer-events:none}
.hd-the{position:fixed;z-index:82;left:12px;right:12px;max-width:440px;margin:0 auto;background:var(--giay-noi,#fbf8f1);border-radius:20px;padding:14px 16px 16px;box-shadow:0 12px 32px rgba(0,0,0,.28);display:grid;gap:10px;transition:top .28s ease,bottom .28s ease}
.hd-dau{display:flex;gap:12px;align-items:center}.hd-dau img{flex:none;width:84px;height:84px}
.hd-dau h2{margin:0;font-size:20px;color:var(--muc,#1d2a22)}.hd-dau small{display:block;color:var(--muc-nhat,#5c645c);font-size:14px;margin-bottom:2px}
.hd-the p{margin:0;font-size:17px;line-height:1.5;color:var(--muc,#1d2a22)}
.hd-day{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.hd-day .nut{min-height:48px;padding:0 16px}
.hd-bo{background:none;border:0;color:var(--muc-nhat,#5c645c);font:600 15px var(--chu,system-ui);min-height:44px;padding:0 6px;cursor:pointer;margin-right:auto}
.hd-nghe{display:inline-flex;align-items:center;gap:6px;min-height:48px;padding:0 14px;border-radius:999px;border:1.5px solid var(--la,#1f4d3a);background:#fff;color:var(--la,#1f4d3a);font:700 15px var(--chu,system-ui);cursor:pointer}
.hd-co{display:flex;gap:8px}.hd-co button{flex:1;min-height:52px;border-radius:14px;border:1.5px solid var(--ke-dam,rgba(29,42,34,.22));background:#fff;color:var(--muc,#1d2a22);font-weight:700;cursor:pointer}
.hd-co button[aria-pressed=true]{border-color:var(--la,#1f4d3a);background:var(--la-nhat,#dde8df)}
@media (prefers-reduced-motion: reduce){.hd-ro,.hd-the{transition:none}}`;

function ve() {
  const [chon, dang_, tieu, loi] = BUOC[i];
  const el = chon && !chon.startsWith("@") ? document.querySelector(chon) : null;
  const ro = o.querySelector(".hd-ro"), the = o.querySelector(".hd-the");
  if (el) {
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getBoundingClientRect(), p = 6;
    Object.assign(ro.style, { display: "block", left: r.left - p + "px", top: r.top - p + "px", width: r.width + 2 * p + "px", height: r.height + 2 * p + "px" });
    const duoi = r.top + r.height / 2 < innerHeight / 2;   // phần rọi ở nửa trên → thẻ ở dưới
    the.style.top = duoi ? "auto" : "16px"; the.style.bottom = duoi ? "16px" : "auto";
  } else { ro.style.display = "none"; the.style.top = "auto"; the.style.bottom = "24px"; }
  o.querySelector(".hd-che").style.background = el ? "transparent" : "rgba(20,28,22,.62)";   // bước không rọi: vẫn tối nền
  let coChu = "1"; try { coChu = localStorage.getItem("agv-co-chu") || "1"; } catch {}
  the.innerHTML = `<div class="hd-dau"><img src="/assets/trau/tu-the/${dang_}.webp" alt=""><div><small>Bước ${i + 1}/${BUOC.length}</small><h2 id="hd-t">${esc(tieu)}</h2></div></div>
    <p>${esc(loi)}</p>
    ${chon === "@co-chu" ? `<div class="hd-co" role="group" aria-label="Cỡ chữ">${CO_CHU.map(([v, t]) => `<button type="button" data-co="${v}" aria-pressed="${v === coChu}" style="font-size:${15 * Number(v)}px">${t}</button>`).join("")}</div>` : ""}
    <div class="hd-day"><button type="button" class="hd-bo" data-bo>${i === BUOC.length - 1 ? "" : "Bỏ qua"}</button>
      <button type="button" class="hd-nghe" data-nghe>🔊 Nghe</button>
      ${i ? `<button type="button" class="nut phu-nut" data-lui>Lùi</button>` : ""}
      <button type="button" class="nut chinh-nut" data-tiep>${i === BUOC.length - 1 ? "Bắt đầu dùng" : "Tiếp"}</button></div>`;
  the.querySelector("[data-tiep]").onclick = () => { try { speechSynthesis.cancel(); } catch {} if (i < BUOC.length - 1) { i++; ve(); } else dong(); };
  the.querySelector("[data-lui]")?.addEventListener("click", () => { i--; ve(); });
  the.querySelector("[data-bo]").onclick = dong;
  the.querySelector("[data-nghe]").onclick = () => docTo(`${tieu}. ${loi}`);
  the.querySelectorAll("[data-co]").forEach((b) => (b.onclick = () => { datCoChu(b.dataset.co); ve(); }));
  the.querySelector("[data-tiep]").focus();
}
function dong() {
  try { speechSynthesis.cancel(); } catch {}
  ghiXong(); o?.remove(); o = null; dang = false; removeEventListener("resize", ve2);
}
const ve2 = () => o && ve();

/** Mở tour. tuDong=true chỉ mở khi chưa xem lần nào. */
export function moHuongDan(tuDong = false) {
  if (dang || (tuDong && daXong())) return;
  if (!document.getElementById("css-hd")) { const s = document.createElement("style"); s.id = "css-hd"; s.textContent = css; document.head.appendChild(s); }
  dang = true; i = 0;
  o = document.createElement("div");
  o.innerHTML = `<div class="hd-che"></div><div class="hd-ro"></div><section class="hd-the" role="dialog" aria-modal="true" aria-labelledby="hd-t"></section>`;
  document.body.appendChild(o);
  o.addEventListener("keydown", (e) => { if (e.key === "Escape") dong(); });
  addEventListener("resize", ve2);
  ve();
}
if (typeof window !== "undefined") window.moHuongDan = moHuongDan;
