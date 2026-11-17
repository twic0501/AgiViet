// Nguồn hàng: phiếu tìm nguồn ngay đầu tab (mặt hàng, loại, lượng, tỉnh, cần trước ngày) → gợi ý lô khớp cập nhật theo từng ô điền.
// Không thấy lô ưng ý thì "Gửi phiếu cho người bán báo giá" (đăng nhu cầu, giá tối đa kín). Vẫn tìm được theo chữ / mã vùng trồng.
import { api, manCu, thu } from "../api";
import { DL } from "../du-lieu";
import { bao, esc, kg, ngay, tenLoai, tinh, trong, vnd } from "../ui";
import type { Lo } from "../kieu";
import { laySp } from "./nhu-cau";

// Phiếu đang điền (giữ khi đổi tab rồi quay lại)
const P = { sp: "", loai: "", kg: "", tinh: "", han: "", tu: "", gia: "", giay: [] as string[], nhatKy: false, gom: false };
const GIAY: [string, string][] = [["growing_area_code", "Mã số vùng trồng"], ["vietgap", "VietGAP"], ["spray_diary", "Nhật ký cách ly thuốc"], ["residue_test", "Kiểm dư lượng thuốc"],
  ["phytosanitary", "Kiểm dịch thực vật"], ["pond_diary", "Nhật ký ao (thủy sản)"], ["antibiotic_test", "Test kháng sinh (thủy sản)"]];
interface LoGoiY { lot_id: string; lot_code: string; seller_name?: string; province_code?: string; grade_code?: string; kha_dung_cam_ket_g: string; ly_do_khop?: string[]; thieu?: string[]; nhat_ky_muc?: number; luong_g?: string }
interface KetQuaTim { khop_du: LoGoiY[]; khop_mot_phan: LoGoiY[]; gan_khop_gia: LoGoiY[]; goi_y_gom: { nguon: LoGoiY[]; da_gom_kg: number; con_thieu_kg: number } | null; so_lo_xet: number }
let tim: { khoa: string; kq?: KetQuaTim; loi?: string; dangDanhThuc?: boolean } | null = null, henTim = 0;
const TINH_DS: [string, string][] = [["", "Mọi tỉnh"], ["DT", "Đồng Tháp"], ["TG", "Tiền Giang"], ["BT", "Bến Tre"], ["VL", "Vĩnh Long"], ["CT", "Cần Thơ"], ["AG", "An Giang"], ["ST", "Sóc Trăng"], ["CM", "Cà Mau"], ["KG", "Kiên Giang"], ["LA", "Long An"], ["TN", "Tây Ninh"]];
// Mã số vùng trồng (vd MVT-DT-0412): gõ vào ô tìm là tra người bán sở hữu mã
const LA_MA_VUNG = /^[A-Z]{2,5}-[A-Z]{2,4}-\d{2,6}$/i;
interface VungTrong { ma: string; nguoi_ban: string; tinh?: string; vuon?: string; lo_ids: string[]; thi_truong: { thi_truong: string; da_xac_minh: boolean; bi_thu_hoi: boolean; con_han: boolean; het_han?: string }[] }
let vung: { ma: string; kq?: VungTrong; loi?: string } | null = null;

let dauPhieu = "";
/** Danh sách phiếu đã gửi (tải riêng, không chặn gợi ý). */
export async function napDauPhieu(o: HTMLElement): Promise<void> { const { dsPhieu } = await import("./nhu-cau"); dauPhieu = await dsPhieu(); const d = o.querySelector("#dau-phieu"); if (d) d.innerHTML = dauPhieu; }

/** Chấm một lô theo phiếu: điểm + lý do khớp / chưa khớp (người mua không thấy giá lô khi tìm nguồn — A3.10). */
function cham(l: Lo): { diem: number; khop: string[]; chua: string[] } {
  const khop: string[] = [], chua: string[] = []; let diem = 0;
  const con = kg(l.available_g ?? l.qty?.available), can = Number(P.kg.replace(",", ".")) || 0;
  if (P.loai) { if (l.grade_code === P.loai) { diem += 2; khop.push(`đúng ${tenLoai(l.grade_code)}`); } else chua.push(`${tenLoai(l.grade_code)}, không phải ${tenLoai(P.loai)}`); }
  if (can) { if (con >= can) { diem += 3; khop.push("đủ lượng"); } else { diem += 1; chua.push(`chỉ còn ${vnd(con)}/${vnd(can)} kg`); } }
  if (P.han) { if (!l.available_from || l.available_from <= P.han) { diem += 2; khop.push("kịp ngày cần"); } else chua.push(`có hàng từ ${ngay(l.available_from)}`); }
  if (P.tinh) { if (l.province_code === P.tinh) { diem += 1; khop.push(`ở ${tinh(P.tinh)}`); } else chua.push(`ở ${tinh(l.province_code)}`); }
  if (l.qty_basis === "weighed") { diem += 1; khop.push("đã cân"); }
  if ((l.photos || []).some((p) => p.captured_in_app)) { diem += 1; khop.push("có ảnh chụp trong app"); }
  return { diem, khop, chua };
}

const theLo = (l: Lo, c?: { khop: string[]; chua: string[] }) => {
  const coChao = DL.loiChao.find((x) => x.lot_code === l.code && /sent|accepted/.test(x.status));
  return `<article class="the">
    <div class="hang"><b>${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</b><span class="chip ${l.status === "upcoming" ? "bien" : "la"}">${l.status === "upcoming" ? "Sắp có" : "Có ngay"}</span></div>
    <p class="phu">${esc(l.seller_name || "")} · ${esc(tinh(l.province_code))}</p>
    <p class="phu so">Còn ${vnd(kg(l.available_g ?? l.qty?.available))} kg · từ ${ngay(l.available_from)}${l.qty_basis === "weighed" ? " · đã cân" : " · người bán ước tính"}</p>
    ${c ? `<div class="tin">${c.khop.map((x) => `<span class="chip la">${esc(x)}</span>`).join("")}${c.chua.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}
    ${l.ban_gap ? `<div class="tin"><span class="chip do">Bán gấp</span></div>` : ""}
    ${coChao ? `<a class="nut vien rong" href="#tin/offer/${coChao.id}">Xem lời chào của bạn</a>` : `<button type="button" class="nut chinh rong" data-tra="${l.id}">Trả giá</button>`}
  </article>`;
};

function veKetQua(o: HTMLElement): void {
  const kq = o.querySelector<HTMLElement>("#ng-kq"); if (!kq) return;
  const tat = DL.lo.filter((l) => !l.is_substandard || l.ban_gap);
  const q = P.tu.trim(), laMa = LA_MA_VUNG.test(q);
  if (laMa && vung?.ma !== q.toUpperCase()) { const ma = q.toUpperCase(); vung = { ma };
    api<VungTrong>(`/v1/growing-areas/${encodeURIComponent(ma)}`).then((x) => { if (vung?.ma === ma) { vung.kq = x; veKetQua(o); } })
      .catch((e) => { if (vung?.ma === ma) { vung.loi = (e as Error).message; veKetQua(o); } }); }
  if (!laMa) vung = null;
  let html: string;
  const duMayChu = !laMa && P.sp && Number(P.kg.replace(",", ".")) > 0 && Number(P.gia.replace(/\D/g, "")) >= 1000;
  if (duMayChu) {
    const homNay = new Date().toISOString().slice(0, 10), den = P.han && P.han >= homNay ? P.han : new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const than = { product_code: P.sp, grade_code: P.loai || null, qty_g: String(Math.round(Number(P.kg.replace(",", ".")) * 1000)), max_price_vnd: P.gia.replace(/\D/g, ""),
      needed_from: homNay, needed_to: den, province_code: P.tinh || null, required_docs: P.giay, farm_diary: P.nhatKy, can_gom: P.gom };
    const khoa = JSON.stringify(than);
    if (tim?.khoa !== khoa) { tim = { khoa }; clearTimeout(henTim);
      // Dịch vụ ghép (Render gói miễn phí) ngủ sau ~15 phút: lần đầu có thể trả lỗi khi đang thức dậy → thử lại một lần sau 6 giây
      const goi = (lan: number): Promise<void> => api<KetQuaTim>("/v1/sourcing/search", than).then((x) => { if (tim?.khoa === khoa) { tim.kq = x; veKetQua(o); } })
        .catch((e) => { if (tim?.khoa !== khoa) return;
          if (lan === 0) { tim.loi = ""; tim.dangDanhThuc = true; veKetQua(o); return new Promise<void>((r) => setTimeout(r, 6000)).then(() => goi(1)); }
          tim.dangDanhThuc = false; tim.loi = (e as Error).message; veKetQua(o); });
      henTim = window.setTimeout(() => goi(0), 500); }
    kq.innerHTML = veTim(tim!, P);
    kq.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => { const l = DL.lo.find((x) => x.id === b.dataset.tra); if (l) moTraGia(l, () => veKetQua(o)); }));
    const gp = kq.querySelector<HTMLButtonElement>("#ng-gui-phieu");
    if (gp) gp.onclick = () => { try { sessionStorage.setItem("agv-phieu-nhap", JSON.stringify(P)); } catch { /* bỏ qua */ } location.hash = "#nhu-cau/moi"; };
    return;
  }
  if (laMa) {
    html = veVung(vung!) + (vung?.kq ? tat.filter((l) => vung!.kq!.lo_ids.includes(l.id)).map((l) => theLo(l)).join("") : "");
  } else {
    const chu = q.toLowerCase();
    const ds = tat.filter((l) => (!P.sp || l.product_code === P.sp) && (!chu || `${l.product_name} ${l.seller_name} ${tinh(l.province_code)}`.toLowerCase().includes(chu)))
      .map((l) => ({ l, c: cham(l) })).sort((a, b) => b.c.diem - a.c.diem);
    const coPhieu = !!(P.sp || P.kg || P.han || P.tinh || P.loai);
    html = `<div class="hang"><h2>${coPhieu ? "Gợi ý nguồn" : "Nguồn đang bán"}</h2><span class="phu">${ds.length} lô</span></div>`
      + (ds.length ? ds.map(({ l, c }) => theLo(l, coPhieu ? c : undefined)).join("") : trong("Chưa có lô nào khớp phiếu. Gửi phiếu để người bán có món này báo giá cho bạn."))
      + (coPhieu ? `<button type="button" class="nut vien rong" id="ng-gui-phieu">Gửi phiếu cho người bán báo giá</button><p class="phu">Gửi phiếu thì nhập thêm giá tối đa (giữ kín, người bán không thấy).</p>` : "");
  }
  kq.innerHTML = html;
  kq.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => moTraGia(DL.lo.find((l) => l.id === b.dataset.tra)!, () => veKetQua(o))));
  const gp = kq.querySelector<HTMLButtonElement>("#ng-gui-phieu");
  if (gp) gp.onclick = () => { try { sessionStorage.setItem("agv-phieu-nhap", JSON.stringify(P)); } catch { /* bỏ qua */ } location.hash = "#nhu-cau/moi"; };
}

export async function veNguon(o: HTMLElement): Promise<void> {
  const sp = await laySp();
  const loaiCua = (ma: string) => sp.find((x) => x.code === ma)?.grades?.map((g) => g.grade_code) ?? [];
  o.innerHTML = `
    <form class="the" id="phieu" aria-label="Phiếu tìm nguồn" onsubmit="return false">
      <h2>Phiếu tìm nguồn</h2>
      <label class="o-nhap">Mặt hàng<select id="pk-sp"><option value="">Chọn mặt hàng</option>${sp.map((s) => `<option value="${esc(s.code)}"${s.code === P.sp ? " selected" : ""}>${esc(s.name_vi)}</option>`).join("")}</select></label>
      <div class="luoi2"><label class="o-nhap">Loại<select id="pk-loai"></select></label>
        <label class="o-nhap">Lượng cần (kg)<input id="pk-kg" inputmode="decimal" value="${esc(P.kg)}" placeholder="vd 1000"></label></div>
      <div class="luoi2"><label class="o-nhap">Tỉnh<select id="pk-tinh">${TINH_DS.map(([m, t]) => `<option value="${m}"${m === P.tinh ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="o-nhap">Cần trước ngày<input id="pk-han" type="date" value="${esc(P.han)}"></label></div>
      <label class="o-nhap">Giá mong muốn (đ/kg)<input id="pk-gia" inputmode="numeric" value="${esc(P.gia)}" placeholder="vd 24000"></label>
      <p class="phu">Giá mong muốn giữ kín: người bán không thấy, AgiViet chỉ so với giá thấp nhất (cũng giữ kín) của người bán để gợi ý.</p>
      <fieldset class="giay"><legend>Giấy tờ yêu cầu (đã xác minh, còn hạn tới ngày cần)</legend>
        ${GIAY.map(([m, t]) => `<label class="chon"><input type="checkbox" data-giay="${m}"${P.giay.includes(m) ? " checked" : ""}> ${t}</label>`).join("")}
        <label class="chon"><input type="checkbox" id="pk-nk"${P.nhatKy ? " checked" : ""}> Có nhật ký canh tác ghi trong app</label></fieldset>
      <label class="chon"><input type="checkbox" id="pk-gom"${P.gom ? " checked" : ""}> Cho gom từ nhiều hộ khi một hộ không đủ lượng</label>
      <label class="o-tim"><span class="an-chu">Tìm theo chữ hoặc mã vùng trồng</span><input id="ng-tu" type="search" placeholder="Hoặc gõ tên, nơi, mã vùng trồng MVT-…" value="${esc(P.tu)}" autocapitalize="characters"></label>
    </form>
    <div id="ng-kq"></div>
    <div id="dau-phieu">${dauPhieu}</div>`;
  const $ = <T extends HTMLElement>(s: string) => o.querySelector<T>(s)!;
  const veLoai = () => { const ds = loaiCua(P.sp); if (!ds.includes(P.loai)) P.loai = "";
    $<HTMLSelectElement>("#pk-loai").innerHTML = `<option value="">Mọi loại</option>` + ds.map((g) => `<option value="${esc(g)}"${g === P.loai ? " selected" : ""}>${esc(tenLoai(g))}</option>`).join(""); };
  veLoai();
  $("#phieu").oninput = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.giay) { P.giay = t.checked ? [...P.giay, t.dataset.giay] : P.giay.filter((x) => x !== t.dataset.giay); return veKetQua(o); }
    if (t.id === "pk-nk") { P.nhatKy = t.checked; return veKetQua(o); }
    if (t.id === "pk-gom") { P.gom = t.checked; return veKetQua(o); }
    const ten = ({ "pk-sp": "sp", "pk-loai": "loai", "pk-kg": "kg", "pk-tinh": "tinh", "pk-han": "han", "ng-tu": "tu", "pk-gia": "gia" } as const)[t.id as "pk-sp"];
    if (!ten) return; P[ten] = t.value; if (ten === "sp") veLoai(); veKetQua(o);
  };
  veKetQua(o);
}

function veVung(v: { ma: string; kq?: VungTrong; loi?: string }): string {
  if (v.loi) return `<section class="the"><p class="loi">${esc(v.loi)}</p></section>`;
  if (!v.kq) return `<div class="khung-tai" aria-label="Đang tra mã vùng trồng"></div>`;
  const k = v.kq;
  return `<section class="the" aria-label="Mã vùng trồng ${esc(k.ma)}">
    <div class="hang"><div><p class="nhan">Mã vùng trồng</p><h2>${esc(k.ma)}</h2></div></div>
    <p><b>${esc(k.nguoi_ban)}</b>${k.vuon ? ` · ${esc(k.vuon)}` : ""}${k.tinh ? ` · ${esc(tinh(k.tinh))}` : ""}</p>
    <div class="tin">${k.thi_truong.map((t) => `<span class="chip ${t.bi_thu_hoi || !t.con_han ? "do" : t.da_xac_minh ? "la" : ""}">Thị trường ${esc(t.thi_truong || "nội địa")} · ${t.bi_thu_hoi ? "đã thu hồi" : !t.con_han ? "hết hạn" : t.da_xac_minh ? "đã xác minh" : "người bán tự khai"}</span>`).join("")}</div>
    <p class="phu">${k.lo_ids.length ? `${k.lo_ids.length} lô đang bán bên dưới. Trả giá để mở trao đổi với người bán.` : "Người bán chưa có lô đang bán. Gửi phiếu để người bán báo giá cho bạn."}</p>
  </section>`;
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
  ${DL.lo.some((x) => x.id === l.lot_id) ? `<button type="button" class="nut chinh rong" data-tra="${esc(l.lot_id)}">Trả giá</button>` : ""}</article>`;

/** Kết quả tìm theo phiếu từ máy chủ: khớp đủ, gom nhiều hộ, khớp một phần, gần mức giá (cần thương lượng). Không có số giá nào. */
function veTim(t: { kq?: KetQuaTim; loi?: string; dangDanhThuc?: boolean }, p: typeof P): string {
  if (t.dangDanhThuc && !t.kq) return `<p class="phu" role="status">Đang khởi động dịch vụ ghép nguồn, chờ vài giây…</p><div class="khung-tai"></div>`;
  if (t.loi) return `<section class="the"><p class="loi">${esc(t.loi)}</p></section>`;
  if (!t.kq) return `<div class="khung-tai" aria-label="Đang tìm nguồn phù hợp"></div>`;
  const k = t.kq, tong = k.khop_du.length + k.khop_mot_phan.length + k.gan_khop_gia.length;
  const yeu = [...p.giay.map(tenGiay), ...(p.nhatKy ? ["nhật ký canh tác"] : [])];
  return `<div class="hang"><h2>Gợi ý nguồn</h2><span class="phu">xét ${k.so_lo_xet} lô</span></div>
    ${yeu.length ? `<p class="phu">Chỉ tính lô có: ${esc(yeu.join(", "))}.</p>` : ""}
    ${k.khop_du.map((l) => theGoiY(l, "Khớp đủ", true)).join("")}
    ${k.goi_y_gom?.nguon.length ? `<section class="the gom"><h2>Gom ${k.goi_y_gom.nguon.length} hộ</h2>
      <p class="phu">Đã gom ${vnd(k.goi_y_gom.da_gom_kg)} kg${k.goi_y_gom.con_thieu_kg > 0 ? ` · còn thiếu ${vnd(k.goi_y_gom.con_thieu_kg)} kg` : " · đủ lượng"}. Các hộ ở gần nhau để gom chung một chuyến; mỗi hộ ký hợp đồng riêng.</p>
      ${k.goi_y_gom.nguon.map((l) => theGoiY(l, "Trong nhóm gom")).join("")}</section>` : ""}
    ${k.khop_mot_phan.filter((l) => !k.goi_y_gom?.nguon.some((g) => g.lot_id === l.lot_id)).map((l) => theGoiY(l, "Khớp một phần")).join("")}
    ${k.gan_khop_gia.map((l) => theGoiY(l, "Gần mức giá · cần thương lượng")).join("")}
    ${tong ? "" : trong(p.gom ? "Chưa có lô nào đạt phiếu, kể cả khi gom. Thử nới giá mong muốn, bớt giấy tờ yêu cầu, hoặc gửi phiếu để người bán báo giá." : "Chưa có lô nào đạt phiếu. Thử nới giá mong muốn, bớt giấy tờ yêu cầu, bật gom nhiều hộ, hoặc gửi phiếu để người bán báo giá.")}
    <button type="button" class="nut vien rong" id="ng-gui-phieu">Gửi phiếu cho người bán báo giá</button>`;
}
