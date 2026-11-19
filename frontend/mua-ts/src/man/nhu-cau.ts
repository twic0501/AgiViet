import { docSo } from "../../../thiet-ke/so.ts";
// Phiếu tìm nguồn: người mua ghi mặt hàng, loại, lượng, giá tối đa (KÍN), ngày cần → AgiViet gợi ý lô khớp để trả giá.
// API: POST /v1/demands (+ /publish), GET /v1/demands?mine=true, GET /v1/demands/:id, GET /v1/demands/:id/matches (ghép luật + AI).
import { api, thu } from "../api";
import { DL } from "../du-lieu";
import { bao, esc, kg, tenLoai, tinh, trong, vnd } from "../ui";
import { moTraGia } from "./nguon";

interface SanPham { code: string; name_vi: string; grades?: { grade_code: string }[] }
interface LoKhop { lot_id: string; lot_code: string; seller_name?: string; province_code?: string; kha_dung_cam_ket_g?: string; diem?: number; ly_do_khop?: string[]; thieu?: string[] }
interface DongKhop { grade_code: string; qty_g: string; khop_du?: LoKhop[]; khop_mot_phan?: LoKhop[]; gan_khop_gia?: LoKhop[] }

let sp: SanPham[] | null = null;
export const laySp = async () => (sp ??= (await thu(api<SanPham[]>("/v1/products"))) ?? []);
const tenSp = (ma?: string) => sp?.find((x) => x.code === ma)?.name_vi || ma || "";
const ngayLech = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const TT: Record<string, string> = { draft: "Nháp", open: "Đang tìm", closed: "Đã đóng", fulfilled: "Đã đủ hàng", expired: "Hết hạn" };

/** Danh sách phiếu của mình (gắn đầu tab Nguồn). */
export async function dsPhieu(): Promise<string> {
  const ds = (await thu(api<any>("/v1/demands?mine=true"))) as any;
  const pk: any[] = Array.isArray(ds) ? ds : ds?.items ?? [];
  await laySp();
  return `<section class="the"><div class="hang"><h2>Phiếu đã gửi người bán</h2><a class="nut vien nho" href="#nhu-cau/moi">Gửi phiếu</a></div>
    ${pk.length ? pk.slice(0, 5).map((n) => `<a class="viec" href="#nhu-cau/${n.id}"><i class="${n.status === "open" ? "do" : ""}"></i><div><b>${esc(n.code)} · ${esc(n.product_name || tenSp(n.product_code))}</b><p class="phu">${esc(TT[n.status] || n.status)}</p></div><span aria-hidden="true">›</span></a>`).join("")
      : `<p class="phu">Chưa gửi phiếu nào. Không thấy lô ưng ý thì gửi phiếu để người bán báo giá; giá tối đa được giữ kín.</p>`}</section>`;
}

export async function veTaoPhieu(o: HTMLElement): Promise<void> {
  // Chỉ mặt hàng chính của tổ chức (0092); chưa chọn thì hiện tất cả để không chặn người mới
  const ds = (await laySp()).filter((x) => !DL.matHangChinh.length || DL.matHangChinh.includes(x.code));
  if (!ds.length) { o.innerHTML = trong("Chưa tải được danh mục mặt hàng. Thử tải lại trang."); return; }
  o.innerHTML = `<form class="the" id="pk" novalidate>
    <h2>Gửi phiếu cho người bán báo giá</h2>
    <p class="phu">Người bán có hàng sẽ chủ động báo giá cho bạn.</p>
    <label class="o-nhap">Mặt hàng<select id="pk-sp">${ds.map((s) => `<option value="${esc(s.code)}">${esc(s.name_vi)}</option>`).join("")}</select></label>
    <label class="o-nhap">Loại<select id="pk-loai"></select></label>
    <div class="luoi2"><label class="o-nhap">Lượng cần (kg)<input id="pk-kg" inputmode="decimal" value="1000"></label>
      <label class="o-nhap">Giá tối đa (đ/kg)<input id="pk-gia" inputmode="numeric"></label></div>
    <p class="phu" id="pk-neo"></p>
    <p class="phu">Giá tối đa chỉ bạn thấy. Người bán không thấy số này; họ báo giá, AgiViet chỉ gợi ý lô không vượt mức của bạn.</p>
    <div class="luoi2"><label class="o-nhap">Cần từ ngày<input id="pk-tu" type="date" value="${ngayLech(2)}"></label>
      <label class="o-nhap">Đến ngày<input id="pk-den" type="date" value="${ngayLech(9)}"></label></div>
    <p class="phu">Nhận tại vườn, bạn lo xe.</p>
    <p class="loi" id="pk-loi" role="alert"></p>
    <button class="nut chinh rong" id="pk-gui">Gửi phiếu và xem gợi ý</button></form>`;
  const $ = <T extends HTMLElement>(s: string) => o.querySelector<T>(s)!;
  const veLoai = () => { const s = ds.find((x) => x.code === $<HTMLSelectElement>("#pk-sp").value);
    $<HTMLSelectElement>("#pk-loai").innerHTML = (s?.grades?.length ? s.grades : [{ grade_code: "L1" }]).map((g) => `<option value="${esc(g.grade_code)}">${esc(tenLoai(g.grade_code))}</option>`).join(""); };
  const neo = async () => { const g = await thu(api<any>(`/v1/reference-prices?product=${encodeURIComponent($<HTMLSelectElement>("#pk-sp").value)}&grade=${encodeURIComponent($<HTMLSelectElement>("#pk-loai").value)}`));
    $("#pk-neo").textContent = g?.status === "du_du_lieu" ? `Giá giao dịch gần đây: ${vnd(g.price_vnd)} đ/kg.` : "Chưa đủ dữ liệu giá chợ cho loại này.";
    if (g?.status === "du_du_lieu" && !$<HTMLInputElement>("#pk-gia").value) $<HTMLInputElement>("#pk-gia").value = String(g.price_vnd); };
  // Điền sẵn từ phiếu tìm nguồn ở tab Nguồn (mặt hàng, loại, lượng, hạn)
  let daDienSan = false;
  try { const p = JSON.parse(sessionStorage.getItem("agv-phieu-nhap") || "null"); sessionStorage.removeItem("agv-phieu-nhap"); daDienSan = !!p?.sp;
    if (p?.sp) $<HTMLSelectElement>("#pk-sp").value = p.sp;
    veLoai(); if (p?.loai) $<HTMLSelectElement>("#pk-loai").value = p.loai;
    if (p?.kg) $<HTMLInputElement>("#pk-kg").value = p.kg; if (p?.han) $<HTMLInputElement>("#pk-den").value = p.han;
  } catch { veLoai(); }
  // Bản nháp phiếu báo giá: giữ khi quay lại / tải lại (lỗi QA F04); phiếu điền sẵn từ tab Nguồn được ưu tiên
  const O = ["pk-sp", "pk-loai", "pk-kg", "pk-gia", "pk-tu", "pk-den"];
  try { const nh = JSON.parse(sessionStorage.getItem("agv-nhap-bao-gia") || "null"); if (nh && !daDienSan) { if (nh["pk-sp"]) { $<HTMLSelectElement>("#pk-sp").value = nh["pk-sp"]; veLoai(); }
    for (const k of O.slice(1)) if (nh[k]) $<HTMLInputElement>("#" + k).value = nh[k]; } } catch { /* bỏ qua */ }
  $("#pk").addEventListener("input", () => { try { sessionStorage.setItem("agv-nhap-bao-gia", JSON.stringify(Object.fromEntries(O.map((k) => [k, $<HTMLInputElement>("#" + k).value])))); } catch { /* bỏ qua */ } });
  neo();
  $("#pk-sp").onchange = () => { veLoai(); $<HTMLInputElement>("#pk-gia").value = ""; neo(); };
  $("#pk-loai").onchange = () => { $<HTMLInputElement>("#pk-gia").value = ""; neo(); };
  $<HTMLFormElement>("#pk").onsubmit = async (e) => {
    e.preventDefault(); const nut = $<HTMLButtonElement>("#pk-gui"), loi = $("#pk-loi"); loi.textContent = "";
    const soKg = docSo($<HTMLInputElement>("#pk-kg").value), gia = Number($<HTMLInputElement>("#pk-gia").value.replace(/\D/g, ""));
    const tu = $<HTMLInputElement>("#pk-tu").value, den = $<HTMLInputElement>("#pk-den").value;
    if (!(soKg > 0)) return void (loi.textContent = "Nhập lượng cần (kg).");
    if (!(gia >= 1000)) return void (loi.textContent = "Nhập giá tối đa, ít nhất 1.000 đ/kg.");
    if (!tu || !den || tu > den) return void (loi.textContent = "Ngày cần: từ ngày phải trước hoặc bằng đến ngày.");
    nut.disabled = true;
    try {
      const qty = Math.round(soKg * 1000), seg = (DL.me as any)?.org?.segment_code || "horeca";
      const n = await api<{ id: string; code: string; status: string; revision: number }>("/v1/demands", {
        product_code: $<HTMLSelectElement>("#pk-sp").value, segment_code: seg, needed_from: tu, needed_to: den, delivery_mode: "self_pickup",
        required_docs: [],
        lines: [{ grade_code: $<HTMLSelectElement>("#pk-loai").value, qty_g: String(qty), max_price_vnd: String(gia), min_source_qty_g: String(Math.min(qty, 20000)) }] });
      if (n.status === "draft") await api(`/v1/demands/${n.id}/publish`, { expected_revision: n.revision });
      try { sessionStorage.removeItem("agv-nhap-bao-gia"); } catch { /* bỏ qua */ }
      bao(`Đã gửi phiếu ${n.code}. Người bán có món này sẽ báo giá cho bạn.`);
      window.dispatchEvent(new Event("agv-vong-ngay")); // bản thử: người bán AI báo giá ngay
      location.hash = `#nhu-cau/${n.id}`;
    } catch (err) { loi.textContent = (err as Error).message; nut.disabled = false; }
  };
}

const theLo = (l: LoKhop, nhan: string) => `<article class="the">
  <div class="hang"><b>${esc(l.lot_code)} · ${esc(l.seller_name || "")}</b><span class="chip ${nhan === "Khớp đủ" ? "la" : ""}">${nhan}</span></div>
  <p class="phu">${esc(tinh(l.province_code))}${l.kha_dung_cam_ket_g ? ` · có thể đáp ứng ${vnd(kg(l.kha_dung_cam_ket_g))} kg` : ""}</p>
  ${(l.ly_do_khop || []).length ? `<p class="phu">Khớp: ${esc(l.ly_do_khop!.join(", "))}</p>` : ""}
  ${(l.thieu || []).length ? `<p class="phu">Còn thiếu: ${esc(l.thieu!.join(", "))}</p>` : ""}
  ${DL.lo.some((x) => x.id === l.lot_id) ? `<button type="button" class="nut chinh rong" data-tra="${esc(l.lot_id)}">Trả giá lô này</button>` : ""}</article>`;

export async function veChiTietPhieu(o: HTMLElement, id: string): Promise<void> {
  o.innerHTML = `<div class="khung-tai" aria-label="Đang tìm nguồn khớp"></div>`;
  const [n, m] = await Promise.all([thu(api<any>(`/v1/demands/${id}`)), thu(api<{ dong: DongKhop[]; nguon?: string }>(`/v1/demands/${id}/matches`)), laySp()]);
  if (!n) { o.innerHTML = trong("Không tìm thấy phiếu này.", `<a class="nut vien" href="#nguon">Về Nguồn hàng</a>`); return; }
  const dong = m?.dong ?? [];
  const lo = dong.flatMap((d) => [...(d.khop_du ?? []).map((l) => theLo(l, "Khớp đủ")), ...(d.khop_mot_phan ?? []).map((l) => theLo(l, "Khớp một phần")), ...(d.gan_khop_gia ?? []).map((l) => theLo(l, "Gần mức giá"))]);
  const l0 = (n.lines || [])[0] || {};
  o.innerHTML = `<section class="the"><p class="nhan">Phiếu ${esc(n.code)}</p><h2>${esc(n.product_name || tenSp(n.product_code))} ${esc(tenLoai(l0.grade_code))}</h2>
      <p class="phu">${l0.qty_g ? `${vnd(kg(l0.qty_g))} kg` : ""}${l0.max_price_vnd ? ` · giá tối đa (kín) ${vnd(l0.max_price_vnd)} đ/kg` : ""} · ${esc(TT[n.status] || n.status)}</p></section>
    ${(n.bao_gia || []).length ? `<div class="hang"><h2>Báo giá người bán gửi</h2><span class="phu">${n.bao_gia.length}</span></div>${n.bao_gia.map((b: any) => `<a class="the bam" href="${b.order_id ? `#don/${b.order_id}` : `#tin/offer/${b.offer_id}`}">
      <div class="hang"><b>${esc(b.lot_code)} · ${esc(b.seller_name)}</b><span class="chip ${b.toi_luot_toi ? "do" : b.status === "accepted" || b.order_id ? "la" : ""}">${b.order_id ? "Đã có hợp đồng" : b.status === "accepted" ? "Đã chốt giá" : b.toi_luot_toi ? "Tới lượt bạn trả lời" : b.status === "sent" ? "Chờ người bán" : "Đã đóng"}</span></div>
      <p class="phu">${vnd(b.price_vnd)} đ/kg × ${vnd(kg(b.qty_g))} kg · ${b.order_id ? "xem hợp đồng" : "mở để đồng ý, trả giá hoặc nhắn"}</p></a>`).join("")}` : ""}
    <h2>Gợi ý nguồn</h2>
    ${lo.length ? lo.join("") : trong((n.bao_gia || []).length ? "Chưa có lô đang bán khớp thêm. Các báo giá đã nhận ở trên." : "Chưa có lô nào khớp. Phiếu vẫn mở: người bán có món này sẽ báo giá cho bạn, có tin mới app sẽ báo.")}
    <a class="nut vien rong" href="#nguon">Về Nguồn hàng</a>`;
  o.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => { const l = DL.lo.find((x) => x.id === b.dataset.tra); if (l) moTraGia(l, () => veChiTietPhieu(o, id)); }));
}
