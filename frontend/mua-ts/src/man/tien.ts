// Tiền: còn phải trả, cọc ngân hàng giữ, từng khoản. Trả tiền (biên lai) mở màn đơn của app cũ.
import { manCu } from "../api";
import { DL, canTra, conTra } from "../du-lieu";
import { esc, ngay, trong, vnd } from "../ui";

const TT: Record<string, string> = { due: "Chưa trả", payer_reported: "Đã báo chuyển · chờ người bán xác nhận", partially_received: "Người bán mới nhận một phần", partially_confirmed: "Người bán mới nhận một phần", overdue: "Quá hạn", fully_received: "Người bán đã nhận đủ", confirmed: "Người bán đã nhận đủ", mismatch: "Lệch số tiền · AgiViet đang xem", not_due: "Chưa tới hạn" };

export function veTien(o: HTMLElement): void {
  const no = DL.khoan.filter(canTra), tong = no.reduce((a, p) => a + conTra(p), 0), t = DL.tien?.tong;
  o.innerHTML = `
    <section class="the"><p class="nhan">Bạn còn phải trả</p>
      <div class="so-lon so">${DL.thieuKhoan ? "Chưa tính đủ" : `${vnd(tong)} <small>đ</small>`}</div>
      <p class="phu">${DL.thieuKhoan ? `Chưa tải được khoản trả của ${DL.thieuKhoan} đơn.` : no.length ? `${no.length} khoản · hạn sớm nhất ${ngay(no.map((p) => p.due_at).filter(Boolean).sort()[0])}` : "Không có khoản nào tới hạn."}</p>
      <div class="luoi2"><div class="o"><span class="phu">Cọc ngân hàng giữ</span><b class="so">${DL.tien ? `${vnd(t?.coc_dang_giu)} đ` : "Chưa tải được"}</b></div>
      <div class="o"><span class="phu">Ngân hàng đã hoàn</span><b class="so">${DL.tien ? `${vnd(t?.ngan_hang_da_chuyen_den)} đ` : "Chưa tải được"}</b></div></div>
    </section>
    ${DL.khoan.length ? DL.khoan.map((p) => `<article class="the"><div class="hang"><div><b class="so">${vnd(p.amount_due_vnd)} đ</b><p class="phu">${esc(p.nguon)}</p></div><span class="chip ${canTra(p) ? "do" : /received|confirmed/.test(p.status) ? "la" : ""}">${esc(TT[p.status] || p.status)}</span></div>
      ${canTra(p) && p.don_id ? `<a class="nut chinh rong" href="${manCu("chi-tiet-don", `don=${p.don_id}`)}">Trả ${vnd(conTra(p))} đ</a>` : ""}</article>`).join("") : trong("Chưa có khoản trả nào. Khoản trả tiền hàng sinh ra sau khi nhận hàng, theo số cân thật.")}`;
}
