// Đơn: danh sách + chi tiết (điều khoản, ai đang làm gì). Thao tác (ký, cọc, giao nhận) mở màn sâu của app cũ.
import { api, manCu } from "../api";
import { DL, canTra, conTra } from "../du-lieu";
import type { ChiTietDon } from "../kieu";
import { esc, kg, maHD, trong, vnd } from "../ui";

const TRA: Record<string, string> = { on_receipt: "Khi nhận hàng", after_days: "Sau khi nhận", advance: "Trả trước" };
const ai = (p?: string) => (p === "buyer" ? "Bạn" : p === "seller" ? "Người bán" : "AgiViet");

export function veDsDon(o: HTMLElement): void {
  o.innerHTML = (DL.don.length ? DL.don.map((d) => { const tl = d.hien_thi?.toi_luot, toi = tl?.phia === "buyer";
    return `<a class="the bam" href="#don/${d.id}">
      <div class="hang"><b>${esc(maHD(d.code))} · ${esc(d.seller_name || "")}</b><span class="chip ${toi ? "do" : ""}">${toi ? "Tới lượt bạn" : esc(d.hien_thi?.ten || d.status)}</span></div>
      <p class="phu">Giá trị ${vnd(d.contract_value_vnd)} đ${tl ? ` · ${ai(tl.phia)}: ${esc(tl.viec)}` : ""}</p></a>`; }).join("")
    : trong("Chưa có đơn. Đơn được lập từ một lời chào giá người bán đã đồng ý.", `<a class="nut vien" href="#nguon">Tìm nguồn hàng</a>`))
    + `<a class="nut vien rong" href="${manCu("lap-khung")}">Lập hợp đồng khung tuần</a>`;
}

const dong = (nhan: string, gt: string) => `<div class="dong"><span>${nhan}</span><b>${gt}</b></div>`;

export async function veChiTietDon(o: HTMLElement, id: string): Promise<void> {
  o.innerHTML = `<div class="khung-tai" aria-label="Đang tải"></div>`;
  let d: ChiTietDon;
  try { d = await api<ChiTietDon>(`/v1/orders/${id}`); } catch (e) { o.innerHTML = trong((e as Error).message, `<a class="nut vien" href="#don">Về danh sách đơn</a>`); return; }
  const k = d.dieu_khoan || {}, tl = d.hien_thi?.toi_luot, toi = tl?.phia === "buyer";
  const khoan = DL.khoan.filter((p) => p.don_id === d.id && canTra(p));
  const hd = [...(d.tai_lieu || [])].reverse().find((x) => x.doc_type === "contract");
  const gioGiao = k.delivery_from ? `${new Date(k.delivery_from).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}${k.delivery_to ? " – " + new Date(k.delivery_to).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}` : "Chưa có";
  o.innerHTML = `
    <section class="the dau-don">
      <div class="hang"><h2>${esc(maHD(d.code))}</h2><span class="chip ${toi ? "do" : "la"}">${esc(d.hien_thi?.ten || d.status)}</span></div>
      ${tl ? `<p><b>${toi ? "Tới lượt bạn" : `Chờ ${ai(tl.phia).toLowerCase()}`}:</b> ${esc(tl.viec)}</p>` : ""}
      ${toi ? `<a class="nut chinh rong" href="${manCu("chi-tiet-don", `don=${d.id}`)}">${esc(tl!.viec)}</a>` : ""}
      ${khoan.map((p) => `<a class="nut chinh rong" href="#tien">Trả ${vnd(conTra(p))} đ</a>`).join("")}
    </section>
    <section class="the"><h2>Điều khoản</h2>
      ${dong("Người bán", esc(d.seller?.display_name || d.seller?.name || d.seller_name || ""))}
      ${dong("Lượng", `${vnd(kg(k.qty_g))} kg`)}
      ${dong("Giá", `${vnd(k.unit_price_vnd)} đ/kg`)}
      ${dong("Giá nếu xuống loại", k.downgrade_price_vnd ? `${vnd(k.downgrade_price_vnd)} đ/kg` : "Không đặt")}
      ${dong("Giá trị hợp đồng", `${vnd(k.contract_value_vnd ?? d.contract_value_vnd)} đ`)}
      ${dong("Cọc (ngân hàng giữ)", `${vnd(k.deposit_vnd ?? d.deposit_vnd)} đ`)}
      ${dong("Phí AgiViet", `${vnd(k.fee_vnd)} đ`)}
      ${dong("Trả tiền hàng", `${TRA[k.payment_timing || ""] || esc(k.payment_timing || "")}${k.payment_timing === "after_days" ? ` ${k.pay_after_days} ngày` : ""}`)}
      ${dong("Giao", k.delivery_mode === "at_farm" ? "Tại vườn, bạn lo xe" : esc(k.delivery_mode || ""))}
      ${dong("Ngày nhận", gioGiao)}
    </section>
    <section class="the hang-nut">
      <a class="nut vien" href="#tin/order/${d.id}">Nhắn người bán</a>
      ${hd ? `<a class="nut vien" href="/thiet-ke/xac-minh.html?ma=${encodeURIComponent(hd.code)}" target="_blank" rel="noopener">Xác minh hợp đồng</a>` : ""}
      <a class="nut vien" href="${manCu("chi-tiet-don", `don=${d.id}`)}">Mở đầy đủ (ký, cọc, giao nhận)</a>
    </section>`;
}
