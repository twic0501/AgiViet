// App MUA (Vite + TypeScript). Điều hướng bằng #: #hom-nay, #nguon, #don, #don/<id>, #tien, #tin, #tin/<order|offer>/<id>.
import { inject } from "@vercel/analytics";
import { layPhien } from "./api";
import { batDoiTacAo } from "./doi-tac-ao";
import { DL, napHet } from "./du-lieu";
import { dsViec, veHomNay } from "./man/hom-nay";
import { napDauPhieu, veNguon } from "./man/nguon";
import { veChiTietPhieu, veTaoPhieu } from "./man/nhu-cau";
import { veChiTietDon, veDsDon } from "./man/don";
import { veTien } from "./man/tien";
import { dungChat, soTinMoi, veChat, veDsTin } from "./man/tin";
import { $, esc, trong } from "./ui";

const TIEU_DE: Record<string, string> = { "hom-nay": "Hôm nay", nguon: "Nguồn hàng", "nhu-cau": "Gửi phiếu báo giá", don: "Đơn", tien: "Tiền", tin: "Tin nhắn" };

async function veTheoDuong(): Promise<void> {
  const [man = "hom-nay", a, b] = location.hash.slice(1).split("/");
  const o = $("#man"), sau = !!a;
  dungChat();
  $("#tieu-de").textContent = man === "don-gom" ? "Đơn gom" : man === "don" && a ? "Chi tiết đơn" : man === "nguon" && a ? (a === "phieu" ? "Phiếu tìm nguồn" : a === "mat-hang" ? "Mặt hàng chính" : "Kết quả tìm nguồn") : TIEU_DE[man] || "Hôm nay";
  $("#lui").hidden = !sau; document.body.dataset.man = man + (sau ? "-con" : "");
  document.querySelectorAll<HTMLAnchorElement>(".tab a").forEach((x) => x.setAttribute("aria-current", x.hash === "#" + (man === "nhu-cau" ? "nguon" : man) ? "page" : "false"));
  try {
    if (man === "nguon") { await veNguon(o, a); if (!a) napDauPhieu(o); }
    else if (man === "nhu-cau") await (a === "moi" ? veTaoPhieu(o) : veChiTietPhieu(o, a));
    else if (man === "don") { await (a ? veChiTietDon(o, a) : veDsDon(o)); if (!a) import("./man/don-gom").then(async (m) => { const h = await m.dsDonGomHtml(); if (h && location.hash.startsWith("#don")) o.insertAdjacentHTML("afterbegin", h); }); }
    else if (man === "don-gom" && a) await (await import("./man/don-gom")).veDonGom(o, a);
    else if (man === "tien") veTien(o);
    else if (man === "tin") await (a && b ? veChat(o, a, b) : veDsTin(o));
    else veHomNay(o);
  } catch (e) { o.innerHTML = trong((e as Error).message); }
  demTab();
  if (!sau) window.scrollTo(0, 0);
}

function demTab(): void {
  const viec = dsViec().length, tin = soTinMoi();
  const dat = (id: string, n: number) => { const x = $(id); x.textContent = String(n); x.hidden = !n; };
  dat("#dem-viec", viec); dat("#dem-tin", tin);
}

async function batDau(): Promise<void> {
  if (!(await layPhien())) { location.replace("/thiet-ke/dang-nhap.html?ben=mua"); return; }
  try { await napHet(); } catch (e) { $("#man").innerHTML = trong(`Chưa tải được dữ liệu: ${(e as Error).message}`, `<button class="nut vien" onclick="location.reload()">Tải lại</button>`); return; }
  $("#ten-to-chuc").textContent = DL.me?.org?.name || DL.me?.user?.display_name || "";
  $("#tai").hidden = true;
  addEventListener("hashchange", veTheoDuong);
  // Sau thao tác đổi trạng thái (trả giá…), và mỗi 30 giây: nạp lại dữ liệu nhưng không vẽ lại khung chat đang mở.
  const lamMoi = async () => { await napHet().catch(() => {}); if (!location.hash.startsWith("#tin/")) veTheoDuong(); else demTab(); };
  addEventListener("agv-lam-moi", lamMoi);
  // Real-time: máy chủ báo thay đổi → nạp lại ngay (nhịp 30 giây bên dưới chỉ còn là dự phòng)
  import("../../thiet-ke/thoi-gian-thuc.ts" as string).then((m: { moKenh: (f: () => Promise<string | null>) => void }) => m.moKenh(layPhien)).catch(() => {});
  addEventListener("agv-thay-doi", (e) => { if ((e as CustomEvent).detail?.giao_dich || !location.hash.startsWith("#tin/")) lamMoi(); });
  // Bản thử: AI đóng vai người bán (trả lời lời chào, nhắn tin, báo giá nhu cầu).
  batDoiTacAo().catch(() => {});
  setInterval(() => { if (!document.hidden) lamMoi(); }, 30000);
  // Quay lại từ màn sâu (app cũ) bằng nút lùi: trang lấy từ bfcache → tải lại để số luôn mới.
  addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
  await veTheoDuong();
}

// Máy tính (màn rộng, có chuột): chạy trong khung điện thoại như app cũ (khung-dt.js). Trong iframe thì không chuyển.
if (window.top === window && matchMedia("(min-width: 700px) and (pointer: fine)").matches) {
  location.replace("/thiet-ke/khung-dt.html?u=" + encodeURIComponent(location.pathname + location.search + location.hash));
  throw new Error("chuyển sang khung điện thoại");
}
// ‹: đã đi trong app thì lùi lại; mở thẳng từ ngoài (link sâu) thì về màn cha, không văng khỏi app.
let buocTrongApp = 0; addEventListener("hashchange", () => buocTrongApp++);
const CHA: Record<string, string> = { "don-gom": "#don", "nhu-cau": "#nguon" };
$("#lui").onclick = () => { if (buocTrongApp > 0) { buocTrongApp -= 2; history.back(); return; }
  const g = location.hash.slice(1).split("/")[0] || "hom-nay"; location.replace(CHA[g] ?? "#" + g); };
// Tấm trượt (dialog): mở thì thêm một mục lịch sử để nút quay lại của máy chỉ đóng tấm, không rời màn.
const moGoc = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  moGoc.call(this); history.pushState({ tam: true }, "");
  this.addEventListener("close", () => { if (history.state?.tam) history.back(); }, { once: true });
};
addEventListener("popstate", () => document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => d.close()));
// Vercel Web Analytics (đếm lượt xem trang, không cookie); bản chạy trên máy tự bỏ qua
if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) inject();
batDau().catch((e) => { $("#man").innerHTML = trong(esc((e as Error).message)); });

// Trang mở từ bản cũ, vừa đưa bản mới lên → mã nạp sau 404: tải lại một lần lấy bản mới (QA F13)
addEventListener("vite:preloadError", (e) => { try { if (sessionStorage.getItem("agv-tai-lai-ban-moi") === location.href) return; sessionStorage.setItem("agv-tai-lai-ban-moi", location.href); } catch { /* bỏ qua */ } e.preventDefault(); location.reload(); });
