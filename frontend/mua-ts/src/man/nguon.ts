// Nguồn hàng, 3 màn tách riêng:
//  #nguon          lô đang bán (lọc theo mặt hàng) + nút "Lập phiếu tìm nguồn" + phiếu đã gửi người bán
//  #nguon/phieu    phiếu tìm nguồn: Hàng → Giao → Giá và giấy tờ, nút "Tìm nguồn" dính đáy
//  #nguon/ket-qua  kết quả từ máy chủ: khớp đủ → AgiViet đề xuất gom (tự tính, không bắt người mua chọn) → khớp một phần → gần mức giá
// Người mua không thấy giá lô khi tìm nguồn (A3.10); giá mong muốn giữ kín.
import { api, thu } from "../api";
import { DL } from "../du-lieu";
import { bao, esc, kg, ngay, tenLoai, tinh, trong, vnd } from "../ui";
import type { Lo } from "../kieu";
import { laySp } from "./nhu-cau";

// Phiếu đang điền (giữ khi đổi màn rồi quay lại)
const P = { sp: "", loai: "", kg: "", tinh: "", han: "", gia: "", giay: [] as string[], nhatKy: false };
// Mã số vùng trồng không nằm ở đây: người bán đầu tiên của AgiViet là các trại đã có mã vùng trồng.
const GIAY: [string, string][] = [["vietgap", "VietGAP"], ["spray_diary", "Nhật ký cách ly thuốc"], ["residue_test", "Kiểm dư lượng thuốc"],
  ["phytosanitary", "Kiểm dịch thực vật"], ["pond_diary", "Nhật ký ao (thủy sản)"], ["antibiotic_test", "Test kháng sinh (thủy sản)"]];
interface LoGoiY { lot_id: string; lot_code: string; seller_name?: string; province_code?: string; grade_code?: string; kha_dung_cam_ket_g: string; ly_do_khop?: string[]; thieu?: string[]; nhat_ky_muc?: number; luong_g?: string }
interface KetQuaTim { khop_du: LoGoiY[]; khop_mot_phan: LoGoiY[]; gan_khop_gia: LoGoiY[]; goi_y_gom: { nguon: LoGoiY[]; da_gom_kg: number; con_thieu_kg: number } | null; so_lo_xet: number }
const TINH_DS: [string, string][] = [["", "Mọi tỉnh"], ["DT", "Đồng Tháp"], ["TG", "Tiền Giang"], ["BT", "Bến Tre"], ["VL", "Vĩnh Long"], ["CT", "Cần Thơ"], ["AG", "An Giang"], ["ST", "Sóc Trăng"], ["CM", "Cà Mau"], ["KG", "Kiên Giang"], ["LA", "Long An"], ["TN", "Tây Ninh"]];
let locSp = "", dauPhieu = "";
const soKg = () => Number(P.kg.replace(",", ".")) || 0, soGia = () => Number(P.gia.replace(/\D/g, "")) || 0;
const thieuPhieu = () => [!P.sp && "mặt hàng", !(soKg() > 0) && "lượng cần", !(soGia() >= 1000) && "giá mong muốn"].filter(Boolean) as string[];

/** Phiếu đã gửi người bán (tải riêng, không chặn màn). */
export async function napDauPhieu(o: HTMLElement): Promise<void> { const { dsPhieu } = await import("./nhu-cau"); dauPhieu = await dsPhieu(); const d = o.querySelector("#dau-phieu"); if (d) d.innerHTML = dauPhieu; }

const theLo = (l: Lo) => {
  const coChao = DL.loiChao.find((x) => x.lot_code === l.code && /sent|accepted/.test(x.status));
  return `<article class="the">
    <div class="hang"><b>${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</b><span class="chip ${l.status === "upcoming" ? "bien" : "la"}">${l.status === "upcoming" ? "Sắp có" : "Có ngay"}</span></div>
    <p class="phu">${esc(l.seller_name || "")} · ${esc(tinh(l.province_code))}</p>
    <p class="phu so">Còn ${vnd(kg(l.available_g ?? l.qty?.available))} kg · từ ${ngay(l.available_from)}${l.qty_basis === "weighed" ? " · đã cân" : " · người bán ước tính"}</p>
    ${l.ban_gap ? `<div class="tin"><span class="chip do">Bán gấp</span></div>` : ""}
    ${coChao ? `<a class="nut vien rong" href="#tin/offer/${coChao.id}">Xem lời chào của bạn</a>` : `<button type="button" class="nut vien nho tra-gia" data-tra="${l.id}">Trả giá</button>`}
  </article>`;
};
const ganTraGia = (o: HTMLElement, ve: () => void) => o.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => { const l = DL.lo.find((x) => x.id === b.dataset.tra); if (l) moTraGia(l, ve); }));

/** Màn chính: lối vào phiếu + phiếu đã gửi + lô đang bán. */
export async function veNguon(o: HTMLElement, man?: string): Promise<void> {
  if (man === "phieu") return vePhieu(o);
  if (man === "ket-qua") return veKetQuaTim(o);
  const sp = await laySp();
  const tat = DL.lo.filter((l) => !l.is_substandard || l.ban_gap), coSp = [...new Set(tat.map((l) => l.product_code))];
  const ds = tat.filter((l) => !locSp || l.product_code === locSp);
  const tenSp = (m: string) => sp.find((x) => x.code === m)?.name_vi ?? m;
  o.innerHTML = `
    <section class="the nguon-dau">
      <h2>Cần mua số lượng lớn?</h2>
      <p class="phu">Điền mặt hàng, lượng, giá mong muốn và giấy tờ cần. AgiViet tìm hộ đáp ứng đủ, tự đề xuất gom nhiều hộ khi một hộ không đủ.</p>
      ${P.sp ? `<p><b>Phiếu đang điền:</b> ${esc(tenSp(P.sp))}${soKg() ? ` · ${vnd(soKg())} kg` : ""}</p>
        <div class="hai-nut"><a class="nut vien" href="#nguon/phieu">Sửa phiếu</a>${thieuPhieu().length ? "" : `<a class="nut chinh" href="#nguon/ket-qua">Xem kết quả</a>`}</div>`
        : `<a class="nut chinh rong" href="#nguon/phieu">Lập phiếu tìm nguồn</a>`}
    </section>
    <div id="dau-phieu">${dauPhieu}</div>
    <div class="hang"><h2>Đang bán</h2><span class="phu">${ds.length} lô</span></div>
    <div class="loc" role="group" aria-label="Lọc theo mặt hàng"><button type="button" data-loc="" aria-pressed="${!locSp}">Tất cả</button>${coSp.map((m) => `<button type="button" data-loc="${esc(m)}" aria-pressed="${locSp === m}">${esc(tenSp(m))}</button>`).join("")}</div>
    ${ds.length ? ds.map(theLo).join("") : trong("Chưa có lô nào đang bán. Lập phiếu để người bán có hàng báo giá cho bạn.")}`;
  o.querySelectorAll<HTMLButtonElement>("[data-loc]").forEach((b) => (b.onclick = () => { locSp = b.dataset.loc!; veNguon(o); }));
  ganTraGia(o, () => veNguon(o));
}

/** Phiếu tìm nguồn: ba nhóm, nút Tìm nguồn dính đáy. */
async function vePhieu(o: HTMLElement): Promise<void> {
  const sp = await laySp();
  const loaiCua = (ma: string) => sp.find((x) => x.code === ma)?.grades?.map((g) => g.grade_code) ?? [];
  o.innerHTML = `<form id="phieu" class="phieu" novalidate>
    <section class="the"><h2>Hàng</h2>
      <label class="o-nhap">Mặt hàng<select id="pk-sp"><option value="">Chọn mặt hàng</option>${sp.map((s) => `<option value="${esc(s.code)}"${s.code === P.sp ? " selected" : ""}>${esc(s.name_vi)}</option>`).join("")}</select></label>
      <div class="luoi2"><label class="o-nhap">Loại<select id="pk-loai"></select></label>
        <label class="o-nhap">Lượng cần (kg)<input id="pk-kg" inputmode="decimal" value="${esc(P.kg)}" placeholder="vd 1000"></label></div>
    </section>
    <section class="the"><h2>Giao</h2>
      <div class="luoi2"><label class="o-nhap">Tỉnh<select id="pk-tinh">${TINH_DS.map(([m, t]) => `<option value="${m}"${m === P.tinh ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="o-nhap">Cần trước ngày<input id="pk-han" type="date" value="${esc(P.han)}"></label></div>
    </section>
    <section class="the"><h2>Giá và giấy tờ</h2>
      <label class="o-nhap">Giá mong muốn (đ/kg)<input id="pk-gia" inputmode="numeric" value="${esc(P.gia)}" placeholder="vd 24000"></label>
      <p class="phu">Giữ kín: người bán không thấy. AgiViet chỉ dùng để so với giá thấp nhất (cũng giữ kín) của người bán.</p>
      <fieldset class="giay"><legend>Giấy tờ cần có (đã xác minh, còn hạn)</legend>
        ${GIAY.map(([m, t]) => `<label class="chon"><input type="checkbox" data-giay="${m}"${P.giay.includes(m) ? " checked" : ""}> ${t}</label>`).join("")}
        <label class="chon"><input type="checkbox" id="pk-nk"${P.nhatKy ? " checked" : ""}> Có nhật ký canh tác ghi trong app</label></fieldset>
    </section>
    <div class="day-nut"><p class="phu" id="pk-thieu" role="status"></p><button type="submit" class="nut chinh rong" id="pk-tim">Tìm nguồn</button></div>
  </form>`;
  const $ = <T extends HTMLElement>(s: string) => o.querySelector<T>(s)!;
  const veLoai = () => { const ds = loaiCua(P.sp); if (!ds.includes(P.loai)) P.loai = "";
    $<HTMLSelectElement>("#pk-loai").innerHTML = `<option value="">Mọi loại</option>` + ds.map((g) => `<option value="${esc(g)}"${g === P.loai ? " selected" : ""}>${esc(tenLoai(g))}</option>`).join(""); };
  const capNut = () => { const t = thieuPhieu(); $<HTMLButtonElement>("#pk-tim").disabled = !!t.length; $("#pk-thieu").textContent = t.length ? `Còn thiếu: ${t.join(", ")}.` : ""; };
  veLoai(); capNut();
  $("#phieu").oninput = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.giay) P.giay = t.checked ? [...P.giay, t.dataset.giay] : P.giay.filter((x) => x !== t.dataset.giay);
    else if (t.id === "pk-nk") P.nhatKy = t.checked;
    else { const ten = ({ "pk-sp": "sp", "pk-loai": "loai", "pk-kg": "kg", "pk-tinh": "tinh", "pk-han": "han", "pk-gia": "gia" } as const)[t.id as "pk-sp"]; if (ten) { P[ten] = t.value; if (ten === "sp") veLoai(); } }
    capNut();
  };
  $<HTMLFormElement>("#phieu").onsubmit = (e) => { e.preventDefault(); if (!thieuPhieu().length) location.hash = "#nguon/ket-qua"; };
}

/** Kết quả theo phiếu (máy chủ ghép; luôn cho phép gom, AgiViet tự đề xuất khi cần). */
async function veKetQuaTim(o: HTMLElement): Promise<void> {
  if (thieuPhieu().length) { location.replace("#nguon/phieu"); return; }
  const sp = await laySp(), tenSp = sp.find((x) => x.code === P.sp)?.name_vi ?? P.sp;
  const yeu = [...P.giay.map(tenGiay), ...(P.nhatKy ? ["nhật ký canh tác"] : [])];
  o.innerHTML = `<section class="the tom-phieu">
      <div class="tin"><span class="chip">${esc(tenSp)}${P.loai ? ` ${esc(tenLoai(P.loai))}` : ""}</span><span class="chip">${vnd(soKg())} kg</span>${P.tinh ? `<span class="chip">${esc(tinh(P.tinh))}</span>` : ""}${P.han ? `<span class="chip">trước ${ngay(P.han)}</span>` : ""}<span class="chip">giá mong muốn (kín)</span></div>
      ${yeu.length ? `<p class="phu">Chỉ tính lô có: ${esc(yeu.join(", "))}.</p>` : ""}
      <a class="nut vien nho" href="#nguon/phieu">Sửa phiếu</a></section>
    <div id="ng-kq"><p class="phu" role="status">Đang tìm nguồn phù hợp…</p><div class="khung-tai"></div></div>`;
  const homNay = new Date().toISOString().slice(0, 10), den = P.han && P.han >= homNay ? P.han : new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const than = { product_code: P.sp, grade_code: P.loai || null, qty_g: String(Math.round(soKg() * 1000)), max_price_vnd: String(soGia()),
    needed_from: homNay, needed_to: den, province_code: P.tinh || null, required_docs: P.giay, farm_diary: P.nhatKy, can_gom: true };
  const kq = o.querySelector<HTMLElement>("#ng-kq")!;
  // Dịch vụ ghép (gói miễn phí) ngủ sau ~15 phút: lần đầu lỗi thì thử lại một lần sau 6 giây
  let k: KetQuaTim;
  try { k = await api<KetQuaTim>("/v1/sourcing/search", than).catch(async () => { kq.querySelector("p")!.textContent = "Đang khởi động dịch vụ ghép nguồn, chờ vài giây…"; await new Promise((r) => setTimeout(r, 6000)); return api<KetQuaTim>("/v1/sourcing/search", than); }); }
  catch (e) { kq.innerHTML = `<section class="the"><p class="loi">${esc((e as Error).message)}</p><button type="button" class="nut vien" id="ng-lai">Thử lại</button></section>`; kq.querySelector<HTMLButtonElement>("#ng-lai")!.onclick = () => veKetQuaTim(o); return; }
  const gom = k.goi_y_gom?.nguon.length ? k.goi_y_gom : null, motPhan = k.khop_mot_phan.filter((l) => !gom?.nguon.some((g) => g.lot_id === l.lot_id));
  const nhom = (tieuDe: string, ghi: string, ds: LoGoiY[], nhan: string, xanh = false) => ds.length ? `<section class="kq-nhom"><div class="hang"><h2>${tieuDe}</h2><span class="phu">${ds.length} lô</span></div>${ghi ? `<p class="phu">${ghi}</p>` : ""}${ds.map((l) => theGoiY(l, nhan, xanh)).join("")}</section>` : "";
  const tong = k.khop_du.length + motPhan.length + k.gan_khop_gia.length + (gom?.nguon.length ?? 0);
  kq.innerHTML = `<p class="phu">AgiViet đã xét ${k.so_lo_xet} lô đang bán.</p>
    ${nhom("Khớp đủ", "Một hộ đáp ứng đủ lượng, giấy tờ và mức giá.", k.khop_du, "Khớp đủ", true)}
    ${gom ? `<section class="kq-nhom gom"><div class="hang"><h2>AgiViet đề xuất gom ${gom.nguon.length} hộ</h2></div>
      <p class="phu">Không hộ nào đủ ${vnd(soKg())} kg. Gom được ${vnd(gom.da_gom_kg)} kg${gom.con_thieu_kg > 0 ? `, còn thiếu ${vnd(gom.con_thieu_kg)} kg` : ", đủ lượng"}. Các hộ ở gần nhau để chở chung một chuyến; mỗi hộ ký hợp đồng riêng.</p>
      ${gom.nguon.map((l) => theGoiY(l, "Trong nhóm gom")).join("")}</section>` : ""}
    ${nhom("Khớp một phần", "Đạt giấy tờ và giá nhưng thiếu lượng hoặc khác loại.", motPhan, "Khớp một phần")}
    ${nhom("Gần mức giá", "Giá thấp nhất của người bán cao hơn mức bạn muốn một chút; cần thương lượng.", k.gan_khop_gia, "Cần thương lượng")}
    ${tong ? "" : trong("Chưa có lô nào đạt phiếu. Thử nới giá mong muốn hoặc bớt giấy tờ, hoặc gửi phiếu để người bán báo giá.")}
    <section class="the"><p class="phu">Chưa ưng nguồn nào? Gửi phiếu để người bán có hàng chủ động báo giá cho bạn.</p><button type="button" class="nut vien rong" id="ng-gui-phieu">Gửi phiếu cho người bán báo giá</button></section>`;
  ganTraGia(kq, () => veKetQuaTim(o));
  kq.querySelector<HTMLButtonElement>("#ng-gui-phieu")!.onclick = () => { try { sessionStorage.setItem("agv-phieu-nhap", JSON.stringify({ ...P, tu: "", gom: true })); } catch { /* bỏ qua */ } location.hash = "#nhu-cau/moi"; };
}

/** Hộp trả giá: giá + lượng, so với giá giao dịch gần đây cùng loại; gửi POST /v1/offers. */
export async function moTraGia(l: Lo, sauGui: () => void): Promise<void> {
  const g = await thu(api<{ status: string; price_vnd: string }>(`/v1/reference-prices?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`));
  const neo = g?.status === "du_du_lieu" ? Number(g.price_vnd) : null, con = kg(l.available_g ?? l.qty?.available);
  const h = document.querySelector<HTMLDialogElement>("#hop")!;
  h.innerHTML = `<form method="dialog" class="hop-than">
    <h2>Trả giá ${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</h2>
    <p class="phu">${esc(l.seller_name || "")} · còn ${vnd(con)} kg · ${neo ? `giá giao dịch gần đây <b>${vnd(neo)} đ/kg</b>` : "chưa đủ dữ liệu giá chợ"}</p>
    <div class="luoi2"><label class="o-nhap">Giá (đ/kg)<input id="tg-gia" inputmode="numeric" value="${neo || ""}" required></label>
      <label class="o-nhap">Lượng (kg)<input id="tg-kg" inputmode="decimal" value="${Math.min(1000, con)}" required></label></div>
    <p class="phu" id="tg-tong" role="status"></p>
    <p class="phu">Giao tại vườn, bạn lo xe. Người bán có 24 giờ trả lời. Đồng ý giá chưa phải hợp đồng.</p>
    <p class="loi" id="tg-loi" role="alert"></p>
    <button class="nut chinh rong" id="tg-gui" value="gui">Gửi lời trả giá</button><button class="nut vien rong" value="huy" formnovalidate>Để sau</button></form>`;
  const giaO = h.querySelector<HTMLInputElement>("#tg-gia")!, kgO = h.querySelector<HTMLInputElement>("#tg-kg")!, nut = h.querySelector<HTMLButtonElement>("#tg-gui")!;
  const doc = () => ({ gia: Number(giaO.value.replace(/\D/g, "")), soKg: Number(kgO.value.replace(",", ".")) });
  const tinhTong = () => { const { gia, soKg } = doc(), ok = gia >= 1000 && soKg > 0 && soKg <= con;
    h.querySelector("#tg-tong")!.innerHTML = ok ? `Thành tiền <b class="so">${vnd(Math.round(gia * soKg))} đ</b>${neo && gia !== neo ? ` · ${gia < neo ? "thấp" : "cao"} hơn giá gần đây ${vnd(Math.abs(neo - gia))} đ/kg` : ""}` : "Nhập giá (≥ 1.000 đ/kg) và lượng không quá lượng còn."; return ok; };
  h.oninput = tinhTong; tinhTong();
  nut.onclick = async (e) => { e.preventDefault(); if (!tinhTong()) return; nut.disabled = true;
    try { const { gia, soKg } = doc(); const of = await api<{ status: string; code?: string }>("/v1/offers", { direction: "buyer_bid", lot_id: l.id, qty_g: Math.round(soKg * 1000), price_vnd: gia });
      h.close(); bao(/rejected/.test(of.status) ? "Chưa tới mức người bán chấp nhận. Lời chào đã đóng." : `Đã gửi ${of.code || "lời chào"}. Chờ người bán trả lời trong 24 giờ.`);
      window.dispatchEvent(new Event("agv-lam-moi")); window.dispatchEvent(new Event("agv-vong-ngay")); sauGui();
    } catch (err) { h.querySelector("#tg-loi")!.textContent = (err as Error).message; nut.disabled = false; } };
  h.showModal();
}


// Lý do nội bộ của bộ ghép không có nghĩa với người mua (khoảng cách khi chưa có địa chỉ nhận, điểm uy tín mặc định…)
const LY_DO_KY_THUAT = /0[.,]0 km|uy tín mặc định|không yêu cầu giấy tờ|cùng mặt hàng, dạng và loại/i;
const tenGiay = (m: string) => GIAY.find(([k]) => k === m)?.[1] ?? m;
const theGoiY = (l: LoGoiY, nhan: string, xanh = false) => `<article class="the">
  <div class="hang"><b>${esc(l.lot_code)} · ${esc(tenLoai(l.grade_code))}</b><span class="chip ${xanh ? "la" : ""}">${nhan}</span></div>
  <p class="phu">${esc(l.seller_name || "")} · ${esc(tinh(l.province_code))} · đáp ứng được ${vnd(kg(l.luong_g ?? l.kha_dung_cam_ket_g))} kg</p>
  <div class="tin">${(l.ly_do_khop || []).filter((x) => !LY_DO_KY_THUAT.test(x)).map((x) => `<span class="chip la">${esc(x)}</span>`).join("")}${l.nhat_ky_muc ? `<span class="chip la">nhật ký canh tác ${l.nhat_ky_muc} mục</span>` : ""}${(l.thieu || []).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>
  ${DL.lo.some((x) => x.id === l.lot_id) ? `<button type="button" class="nut vien nho tra-gia" data-tra="${esc(l.lot_id)}">Trả giá</button>` : ""}</article>`;

