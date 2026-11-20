// Đơn: danh sách + chi tiết. Điều khoản lấy đúng thẻ trong hợp đồng (có mục riêng hai bên thêm).
// Ký hợp đồng (OTP) và đặt cọc làm ngay ở đây bằng tấm trượt (dialog); giao nhận còn mở màn đầy đủ của app cũ.
import { api, manCu } from "../api";
import { DL, canTra, conTra } from "../du-lieu";
import type { ChiTietDon } from "../kieu";
import { esc, maHD, trong, vnd } from "../ui";
import { veGiaoNhan } from "./giao";

const ai = (p?: string) => (p === "buyer" ? "Bạn" : p === "seller" ? "Người bán" : "AgiViet");

export function veDsDon(o: HTMLElement): void {
  o.innerHTML = (DL.don.length ? DL.don.map((d) => { const tl = d.hien_thi?.toi_luot, toi = tl?.phia === "buyer";
    return `<a class="the bam" href="#don/${d.id}">
      <div class="hang"><b>${esc(maHD(d.code))} · ${esc(d.seller_name || "")}</b><span class="chip ${toi ? "do" : ""}">${toi ? "Tới lượt bạn" : esc(d.hien_thi?.ten || d.status)}</span></div>
      <p class="phu">Giá trị ${vnd(d.contract_value_vnd)} đ${tl ? ` · ${ai(tl.phia)}: ${esc(tl.viec)}` : ""}</p></a>`; }).join("")
    : trong("Chưa có đơn. Đơn được lập từ một lời chào giá người bán đã đồng ý.", `<a class="nut vien" href="#nguon">Tìm nguồn hàng</a>`))
    + `<a class="nut vien rong" href="${manCu("lap-khung")}">Lập hợp đồng khung tuần</a>`;
}

interface TheDK { so: number; tieu_de: string; noi_dung: string }
interface HuongDanCoc { total_vnd: string; received_vnd?: string; deposit_vnd: string; fee_vnd: string; due_at: string; virtual_account_no: string; ngan_hang: string; payment_ref: string; vietqr?: string; cau?: string }
const dong = (nhan: string, gt: string) => `<div class="dong"><span>${nhan}</span><b>${gt}</b></div>`;
// Điều khoản là câu dài: nhãn ở trên, nội dung ở dưới (hai cột làm nhãn dài đè lên nội dung)
const dongDK = (nhan: string, gt: string) => `<div class="dk-dong"><span>${nhan}</span><p>${gt}</p></div>`;
const gio = (s?: string) => (s ? new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "");

/** Tấm trượt dùng chung (dialog gốc: khóa focus, Esc đóng). Trả về phần thân để vẽ nội dung. */
function moTam(tieuDe: string): { than: HTMLElement; dong: () => void } {
  const t = document.createElement("dialog"); t.className = "tam"; t.setAttribute("aria-labelledby", "tam-don-td");
  t.innerHTML = `<div class="tam-dau"><h2 id="tam-don-td">${esc(tieuDe)}</h2><button type="button" class="nut-tron" data-dong aria-label="Đóng">×</button></div><div class="tam-than"></div>`;
  document.body.append(t); t.showModal();
  const dong = () => { t.close(); t.remove(); };
  t.addEventListener("click", (e) => { if (e.target === t || (e.target as HTMLElement).closest("[data-dong]")) dong(); });
  t.addEventListener("close", () => t.remove());
  return { than: t.querySelector<HTMLElement>(".tam-than")!, dong };
}

function tamKy(d: ChiTietDon, xong: () => void): void {
  const { than, dong: dongTam } = moTam("Ký hợp đồng");
  const hd = [...(d.tai_lieu || [])].reverse().find((x) => x.doc_type === "contract");
  than.innerHTML = `<div class="ky">
    <p>Ký bằng mã OTP gửi về số điện thoại của bạn. Chữ ký được đóng dấu thời gian và đối chiếu được ở trang Xác minh hợp đồng.</p>
    <label class="chon"><input type="checkbox" id="ky-doc"> Tôi đã đọc toàn bộ điều khoản của ${esc(maHD(d.code))}</label>
    <button type="button" class="nut vien rong" id="ky-ma" disabled>Gửi mã OTP</button>
    <label class="o-nhap">Mã OTP (6 số)<input id="ky-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
    <button type="button" class="nut chinh rong" id="ky-gui" disabled>Ký hợp đồng</button>
    <p class="phu" id="ky-bao" role="status"></p></div>`;
  const $ = <T extends HTMLElement>(s: string) => than.querySelector<T>(s)!;
  const bao = (s: string) => ($("#ky-bao").textContent = s);
  let ch = "";
  $<HTMLInputElement>("#ky-doc").onchange = (e) => ($<HTMLButtonElement>("#ky-ma").disabled = !(e.target as HTMLInputElement).checked);
  $<HTMLButtonElement>("#ky-ma").onclick = async (e) => {
    const n = e.currentTarget as HTMLButtonElement; n.disabled = true;
    try { ch = (await api<{ challenge_id: string }>("/v1/otp/challenges", { purpose: "contract_sign", document_id: hd?.id })).challenge_id; $<HTMLButtonElement>("#ky-gui").disabled = false; bao("Đã gửi mã. Nhập mã rồi bấm Ký."); $("#ky-otp").focus(); }
    catch (err) { bao((err as Error).message); } n.disabled = false; n.textContent = "Gửi lại mã";
  };
  $<HTMLButtonElement>("#ky-gui").onclick = async (e) => {
    const ma = $<HTMLInputElement>("#ky-otp").value.trim(); if (!/^\d{6}$/.test(ma)) return bao("Mã gồm 6 số.");
    const n = e.currentTarget as HTMLButtonElement; n.disabled = true; bao("Đang ký…");
    try { await api(`/v1/orders/${d.id}/sign`, { challenge_id: ch, code: ma, expected_revision: (d as any).revision }); dongTam(); xong(); }
    catch (err) { bao((err as Error).message); n.disabled = false; }
  };
}

async function tamCoc(d: ChiTietDon, xong: () => void): Promise<void> {
  const { than, dong: dongTam } = moTam("Đặt cọc");
  than.innerHTML = `<div class="khung-tai"></div>`;
  let h: HuongDanCoc;
  try { h = await api<HuongDanCoc>(`/v1/orders/${d.id}/deposit-instruction`); } catch (e) { than.innerHTML = `<p class="loi">${esc((e as Error).message)}</p>`; return; }
  const con = Number(h.total_vnd) - Number(h.received_vnd || 0);
  const chep = (nhan: string, gt: string) => `<div class="dong"><span>${nhan}</span><b class="hang-chep">${esc(gt)} <button type="button" class="nut vien nho" data-chep="${esc(gt)}">Chép</button></b></div>`;
  than.innerHTML = `<div class="ky">
    <p class="so so-lon">${vnd(con)} <small>đ</small></p>
    <p class="phu">Gồm cọc ${vnd(h.deposit_vnd)} đ (ngân hàng giữ tới khi giao xong) + phí AgiViet ${vnd(h.fee_vnd)} đ.${Number(h.received_vnd) ? ` Ngân hàng đã nhận ${vnd(h.received_vnd)} đ.` : ""}</p>
    ${h.vietqr ? `<div class="qr" id="coc-qr"><p class="phu">Quét bằng app ngân hàng: số tiền và nội dung điền sẵn</p></div>` : ""}
    ${chep(`Số tài khoản · ${h.ngan_hang}`, h.virtual_account_no)}${chep("Nội dung chuyển khoản", h.payment_ref)}
    <p><b>Hạn chót ${gio(h.due_at)}.</b> Quá hạn chưa đủ cọc thì đơn tự đóng.</p>
    ${h.cau ? `<p class="phu">${esc(h.cau)}</p>` : ""}
    <button type="button" class="nut chinh rong" id="coc-gl" hidden>Tôi đã chuyển khoản ${vnd(con)} đ</button>
    <p class="phu" id="coc-gl-ghi" hidden>Bản thử: bấm là ngân hàng giả lập xác nhận đã nhận cọc.</p>
    <p class="phu" id="coc-bao" role="status">Đơn tự cập nhật khi ngân hàng báo đã nhận cọc.</p></div>`;
  const $ = <T extends HTMLElement>(s: string) => than.querySelector<T>(s)!;
  if (h.vietqr) import(/* @vite-ignore */ "/assets/qr.js" as string).then(async ({ default: QR }) => { const c = document.createElement("canvas"); await QR.toCanvas(c, h.vietqr, { width: 220, margin: 2, errorCorrectionLevel: "M" }); $("#coc-qr").prepend(c); }).catch(() => {});
  than.querySelectorAll<HTMLButtonElement>("[data-chep]").forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.chep!); b.textContent = "Đã chép"; } catch { b.textContent = "Chép tay"; } }));
  fetch("/frontend-capabilities.json").then((r) => r.json()).then((c) => { if (c.test_tools) { $("#coc-gl").hidden = false; $("#coc-gl-ghi").hidden = false; } }).catch(() => {});
  $<HTMLButtonElement>("#coc-gl").onclick = async (e) => {
    const n = e.currentTarget as HTMLButtonElement; n.disabled = true; $("#coc-bao").textContent = "Đang giả lập chuyển khoản…";
    try { await api("/v1/sim/bank/transfers", { payment_ref: h.payment_ref, amount_vnd: con, payer: { bank_code: "VCB", account_no: "0071000123456", name: "NGUOI MUA THU" } }); await api("/v1/sim/bank/deliver", {}); dongTam(); xong(); }
    catch (err) { $("#coc-bao").textContent = (err as Error).message; n.disabled = false; }
  };
}

export async function veChiTietDon(o: HTMLElement, id: string): Promise<void> {
  if (!o.querySelector(".dau-don")) o.innerHTML = `<div class="khung-tai" aria-label="Đang tải"></div>`;
  let d: ChiTietDon, the: TheDK[] = [];
  try { [d, the] = await Promise.all([api<ChiTietDon>(`/v1/orders/${id}`), api<{ the?: TheDK[] }>(`/v1/orders/${id}/terms`).then((x) => x.the ?? []).catch(() => [])]); }
  catch (e) { o.innerHTML = trong((e as Error).message, `<a class="nut vien" href="#don">Về danh sách đơn</a>`); return; }
  if (!location.hash.startsWith(`#don/${id}`)) return; // đã sang màn khác trong lúc tải
  const k = d.dieu_khoan || {}, tl = d.hien_thi?.toi_luot, toi = tl?.phia === "buyer";
  const coKy = (d.hanh_dong || []).includes("sign"), coCoc = toi && /cọc/i.test(tl?.viec || "") && d.status === "awaiting_deposit";
  const khoan = DL.khoan.filter((p) => p.don_id === d.id && canTra(p));
  const hd = [...(d.tai_lieu || [])].reverse().find((x) => x.doc_type === "contract");
  const tk = (k as any).seller_account as { bank_code?: string; masked?: string; holder?: string } | null | undefined;
  const nutChinh = coKy ? `<button type="button" class="nut chinh rong" data-lam="ky">Ký hợp đồng</button>`
    : coCoc ? `<button type="button" class="nut chinh rong" data-lam="coc">Đặt cọc</button>`
    : toi ? `<button type="button" class="nut chinh rong" data-cuon>${esc(tl!.viec)}</button>` : "";
  o.innerHTML = `
    <section class="the dau-don">
      <div class="hang"><h2>${esc(maHD(d.code))}</h2><span class="chip ${toi ? "do" : "la"}">${esc(d.hien_thi?.ten || d.status)}</span></div>
      ${tl ? `<p><b>${toi ? "Tới lượt bạn" : `Chờ ${ai(tl.phia).toLowerCase()}`}:</b> ${esc(tl.viec)}</p>` : ""}
      ${nutChinh}
      ${khoan.map((p) => `<button type="button" class="nut chinh rong" data-cuon>Trả ${vnd(conTra(p))} đ</button>`).join("")}
      <p class="phu">${d.lien_lac_ben_kia ? `Liên lạc người bán: <b>${esc(d.lien_lac_ben_kia.ten)}</b> · <a href="tel:${esc(d.lien_lac_ben_kia.so_dien_thoai)}">${esc(d.lien_lac_ben_kia.so_dien_thoai)}</a>` : "Số điện thoại người bán mở sau khi ngân hàng xác nhận cọc."}</p>
    </section>
    <section class="the"><h2>Điều khoản hợp đồng</h2>
      ${dongDK("Người bán", esc(d.seller?.display_name || d.seller?.name || d.seller_name || ""))}
      ${the.length ? the.map((x) => dongDK(esc(x.tieu_de), esc(x.noi_dung))).join("") : dongDK("Giá", `${vnd(k.unit_price_vnd)} đ/kg`)}
      ${dongDK("Tài khoản nhận tiền người bán", tk ? esc(`${tk.bank_code || ""} ${tk.masked || ""}`) : "Hiện sau khi hai bên ký")}
    </section>
    <section class="the hang-nut">
      <a class="nut vien" href="#tin/order/${d.id}">Nhắn người bán</a>
      ${hd ? `<a class="nut vien" href="/thiet-ke/xac-minh.html?ma=${encodeURIComponent(hd.code)}" target="_blank" rel="noopener">Xác minh hợp đồng</a>` : ""}
    </section>`;
  const lai = () => { window.dispatchEvent(new Event("agv-lam-moi")); veChiTietDon(o, id); };
  o.querySelector<HTMLButtonElement>('[data-lam="ky"]')?.addEventListener("click", () => tamKy(d, lai));
  o.querySelector<HTMLButtonElement>('[data-lam="coc"]')?.addEventListener("click", () => tamCoc(d, lai));
  // Giao nhận, nghiệm thu, trả tiền cho người bán: ngay trong màn đơn (trước đây mở mua.html)
  await veGiaoNhan(o, d, lai);
  if (!location.hash.startsWith(`#don/${id}`)) return;
  o.querySelectorAll<HTMLButtonElement>("[data-cuon]").forEach((b) => (b.onclick = () => o.querySelector("#nt, #den, [data-khoan].toi-luot, #giao")?.scrollIntoView({ behavior: "smooth", block: "start" })));
}
