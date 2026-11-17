// Nguồn hàng: phiếu tìm nguồn ngay đầu tab (mặt hàng, loại, lượng, tỉnh, cần trước ngày) → gợi ý lô khớp cập nhật theo từng ô điền.
// Không thấy lô ưng ý thì "Gửi phiếu cho người bán báo giá" (đăng nhu cầu, giá tối đa kín). Vẫn tìm được theo chữ / mã vùng trồng.
import { api, manCu, thu } from "../api";
import { DL } from "../du-lieu";
import { bao, esc, kg, ngay, tenLoai, tinh, trong, vnd } from "../ui";
import type { Lo } from "../kieu";
import { laySp } from "./nhu-cau";

// Phiếu đang điền (giữ khi đổi tab rồi quay lại)
const P = { sp: "", loai: "", kg: "", tinh: "", han: "", tu: "" };
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
    const ten = ({ "pk-sp": "sp", "pk-loai": "loai", "pk-kg": "kg", "pk-tinh": "tinh", "pk-han": "han", "ng-tu": "tu" } as const)[t.id as "pk-sp"];
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

