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

const TIEU_DE: Record<string, string> = { "hom-nay": "Hôm nay", nguon: "Nguồn hàng", "nhu-cau": "Phiếu tìm nguồn", don: "Đơn", tien: "Tiền", tin: "Tin nhắn" };

async function veTheoDuong(): Promise<void> {
  const [man = "hom-nay", a, b] = location.hash.slice(1).split("/");
  const o = $("#man"), sau = !!a;
  dungChat();
  $("#tieu-de").textContent = man === "don" && a ? "Chi tiết đơn" : TIEU_DE[man] || "Hôm nay";
  $("#lui").hidden = !sau; document.body.dataset.man = man + (sau ? "-con" : "");
  document.querySelectorAll<HTMLAnchorElement>(".tab a").forEach((x) => x.setAttribute("aria-current", x.hash === "#" + (man === "nhu-cau" ? "nguon" : man) ? "page" : "false"));
  try {
    if (man === "nguon") { await veNguon(o); napDauPhieu(o); }
    else if (man === "nhu-cau") await (a === "moi" ? veTaoPhieu(o) : veChiTietPhieu(o, a));
    else if (man === "don") await (a ? veChiTietDon(o, a) : veDsDon(o));
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
$("#lui").onclick = () => (history.length > 1 ? history.back() : (location.hash = (location.hash.split("/")[0] || "#hom-nay")));
// Vercel Web Analytics (đếm lượt xem trang, không cookie); bản chạy trên máy tự bỏ qua
if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) inject();
batDau().catch((e) => { $("#man").innerHTML = trong(esc((e as Error).message)); });
