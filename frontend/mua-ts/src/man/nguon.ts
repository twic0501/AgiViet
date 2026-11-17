// Nguồn hàng: lô đang bán, lọc theo nhóm và từ khóa. Chào giá mở màn đầy đủ của app cũ.
import { api, manCu, thu } from "../api";
import { DL } from "../du-lieu";
import { bao, esc, kg, ngay, tenLoai, tinh, trong, vnd } from "../ui";
import type { Lo } from "../kieu";

const NHOM = (ma = ""): string => (/^(TOM|CA_|CUA|NGHEU|SO_|OC|MUC)/.test(ma) ? "Thủy sản" : /^(LUA|GAO|CAPHE|TIEU|DIEU|HAT|CACAO)/.test(ma) ? "Hạt, cà phê" : /^(RAU|CAI|HANH|OT|KHOAI|CU_|BAP)/.test(ma) ? "Rau củ" : "Trái cây");
let loc = "Tất cả", tu = "";

export function veNguon(o: HTMLElement): void {
  const tat = DL.lo.filter((l) => !l.is_substandard || l.ban_gap);
  const nhom = ["Tất cả", ...new Set(tat.map((l) => NHOM(l.product_code)))];
  const q = tu.trim().toLowerCase();
  const ds = tat.filter((l) => (loc === "Tất cả" || NHOM(l.product_code) === loc) && (!q || `${l.product_name} ${l.seller_name} ${tinh(l.province_code)}`.toLowerCase().includes(q)));
  o.innerHTML = `
    <label class="o-tim"><span class="an-chu">Tìm nguồn</span><input id="ng-tu" type="search" placeholder="Xoài, tôm, Đồng Tháp…" value="${esc(tu)}"></label>
    <div class="loc" role="group" aria-label="Lọc nhóm hàng">${nhom.map((m) => `<button type="button" aria-pressed="${m === loc}" data-loc="${esc(m)}">${esc(m)}</button>`).join("")}</div>
    ${ds.length ? ds.map((l) => {
      const anh = (l.photos || []).filter((p) => p.captured_in_app).length;
      const coChao = DL.loiChao.find((c) => c.lot_code === l.code && /sent|accepted/.test(c.status));
      return `<article class="the">
        <div class="hang"><b>${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</b><span class="chip ${l.status === "upcoming" ? "bien" : "la"}">${l.status === "upcoming" ? "Sắp có" : "Có ngay"}</span></div>
        <p class="phu">${esc(l.seller_name || "")} · ${esc(tinh(l.province_code))}</p>
        <p class="phu so">Còn ${vnd(kg(l.available_g ?? l.qty?.available))} kg · từ ${ngay(l.available_from)}</p>
        <div class="tin">${l.qty_basis === "weighed" ? `<span class="chip la">Đã cân</span>` : `<span class="chip">Người bán ước tính</span>`}${anh ? `<span class="chip la">${anh} ảnh chụp trong app</span>` : ""}${l.ban_gap ? `<span class="chip do">Bán gấp</span>` : ""}</div>
        ${coChao ? `<a class="nut vien rong" href="${manCu("bao-gia", `loi-chao=${coChao.id}`)}">Xem lời chào của bạn</a>` : `<button type="button" class="nut chinh rong" data-tra="${l.id}">Trả giá</button>`}
      </article>`; }).join("") : trong("Không có lô nào khớp. Gửi nhu cầu để người bán báo giá cho bạn.", `<a class="nut vien" href="${manCu("nhu-cau")}">Gửi nhu cầu</a>`)}`;
  o.querySelectorAll<HTMLButtonElement>("[data-loc]").forEach((b) => (b.onclick = () => { loc = b.dataset.loc!; veNguon(o); }));
  o.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => moTraGia(DL.lo.find((l) => l.id === b.dataset.tra)!, () => veNguon(o))));
  const tim = o.querySelector<HTMLInputElement>("#ng-tu")!;
  tim.oninput = () => { tu = tim.value; const vt = tim.selectionStart; veNguon(o); const moi = o.querySelector<HTMLInputElement>("#ng-tu")!; moi.focus(); moi.setSelectionRange(vt, vt); };
}

/** Hộp trả giá: giá + lượng, so với giá giao dịch gần đây cùng loại; gửi POST /v1/offers. */
async function moTraGia(l: Lo, sauGui: () => void): Promise<void> {
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
      window.dispatchEvent(new Event("agv-lam-moi")); sauGui();
    } catch (err) { h.querySelector("#tg-loi")!.textContent = (err as Error).message; nut.disabled = false; } };
  h.showModal();
}
