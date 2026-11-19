import { docSo } from "../../../thiet-ke/so.ts";
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
// Giấy tờ theo nhóm hàng: thủy sản (ao, kháng sinh) khác cây trồng (thuốc BVTV, kiểm dịch thực vật)
const GIAY: [string, string, "chung" | "cay" | "thuy"][] = [["vietgap", "VietGAP", "chung"], ["spray_diary", "Nhật ký cách ly thuốc", "cay"], ["residue_test", "Kiểm dư lượng thuốc", "cay"],
  ["phytosanitary", "Kiểm dịch thực vật", "cay"], ["pond_diary", "Nhật ký ao", "thuy"], ["antibiotic_test", "Test kháng sinh", "thuy"]];
const laThuySan = (nhom?: string) => /aqua|seafood|thuy|fish|shrimp/i.test(nhom || "");
let nhomSp: (ma: string) => string | undefined = () => undefined;
const giayCua = (sp: string) => GIAY.filter(([, , n]) => n === "chung" || (laThuySan(nhomSp(sp)) ? n === "thuy" : n === "cay"));
interface TieuChi { ma: string; ten: string; diem: number; toi_da: number }
interface LoGoiY { lot_id: string; lot_code: string; seller_name?: string; province_code?: string; grade_code?: string; kha_dung_cam_ket_g: string; thieu?: string[]; can_thuong_luong?: boolean; nhat_ky_muc?: number; luong_g?: string }
interface KetQuaTim { ket_qua: LoGoiY[]; goi_y_gom: { nguon: LoGoiY[]; da_gom_kg: number; con_thieu_kg: number } | null; so_lo_xet: number }
// Kết quả lần tìm gần nhất theo lô (tấm chi tiết dùng lại phần còn thiếu)
const diemLo = new Map<string, LoGoiY>();
const TINH_DS: [string, string][] = [["", "Mọi tỉnh"], ["DT", "Đồng Tháp"], ["TG", "Tiền Giang"], ["BT", "Bến Tre"], ["VL", "Vĩnh Long"], ["CT", "Cần Thơ"], ["AG", "An Giang"], ["ST", "Sóc Trăng"], ["CM", "Cà Mau"], ["KG", "Kiên Giang"], ["LA", "Long An"], ["TN", "Tây Ninh"]];
let locSp = "", dauPhieu = "";
const soKg = () => docSo(P.kg) || 0, soGia = () => Number(P.gia.replace(/\D/g, "")) || 0;
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
    ${coChao ? `<a class="nut vien rong" href="#tin/offer/${coChao.id}">Xem lời chào của bạn</a>` : `<div class="hang-nut"><button type="button" class="nut vien nho" data-ct="${l.id}">Xem chi tiết</button><button type="button" class="nut chinh nho" data-tra="${l.id}">Trả giá</button></div>`}
  </article>`;
};
const ganTraGia = (o: HTMLElement, ve: () => void) => o.querySelectorAll<HTMLButtonElement>("[data-tra]").forEach((b) => (b.onclick = () => { const l = DL.lo.find((x) => x.id === b.dataset.tra); if (l) moTraGia(l, ve); }));

/** Màn chính: lối vào phiếu + phiếu đã gửi + lô đang bán. */
export async function veNguon(o: HTMLElement, man?: string): Promise<void> {
  if (man === "mat-hang") return veChonMatHang(o);
  if (!DL.matHangChinh.length) return veChonMatHang(o, true);
  if (man === "phieu") return vePhieu(o);
  if (man === "ket-qua") return veKetQuaTim(o);
  const sp = await laySp();
  const tat = DL.lo.filter((l) => (!l.is_substandard || l.ban_gap) && DL.matHangChinh.includes(l.product_code)), coSp = [...new Set(tat.map((l) => l.product_code))];
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
    <p class="phu mhc">Mặt hàng chính: <b>${DL.matHangChinh.map((m) => esc(tenSp(m))).join(", ")}</b> · <a href="#nguon/mat-hang">Đổi</a></p>
    <div id="dau-phieu">${dauPhieu}</div>
    <div class="hang"><h2>Đang bán</h2><span class="phu">${ds.length} lô</span></div>
    <div class="loc" role="group" aria-label="Lọc theo mặt hàng"><button type="button" data-loc="" aria-pressed="${!locSp}">Tất cả</button>${coSp.map((m) => `<button type="button" data-loc="${esc(m)}" aria-pressed="${locSp === m}">${esc(tenSp(m))}</button>`).join("")}</div>
    ${ds.length ? ds.map(theLo).join("") : trong("Chưa có lô nào đang bán. Lập phiếu để người bán có hàng báo giá cho bạn.")}`;
  o.querySelectorAll<HTMLButtonElement>("[data-loc]").forEach((b) => (b.onclick = () => { locSp = b.dataset.loc!; veNguon(o); }));
  ganTraGia(o, () => veNguon(o)); ganChiTiet(o);
}

/** Phiếu tìm nguồn: ba nhóm, nút Tìm nguồn dính đáy. */
async function vePhieu(o: HTMLElement): Promise<void> {
  const sp = await laySp();
  const loaiCua = (ma: string) => sp.find((x) => x.code === ma)?.grades?.map((g) => g.grade_code) ?? [];
  o.innerHTML = `<form id="phieu" class="phieu" novalidate>
    <section class="the"><h2>Hàng</h2>
      <label class="o-nhap">Mặt hàng<select id="pk-sp"><option value="">Chọn mặt hàng</option>${sp.filter((s) => DL.matHangChinh.includes(s.code)).map((s) => `<option value="${esc(s.code)}"${s.code === P.sp ? " selected" : ""}>${esc(s.name_vi)}</option>`).join("")}</select></label>
      <p class="phu">Chỉ hiện mặt hàng chính của bạn · <a href="#nguon/mat-hang">Đổi mặt hàng chính</a></p>
      <div class="luoi2 sau-sp"><label class="o-nhap">Loại<select id="pk-loai"></select></label>
        <label class="o-nhap">Lượng cần (kg)<input id="pk-kg" inputmode="decimal" value="${esc(P.kg)}" placeholder="vd 1000"></label></div>
    </section>
    <section class="the sau-sp"><h2>Giao</h2>
      <div class="luoi2"><label class="o-nhap">Tỉnh<select id="pk-tinh">${TINH_DS.map(([m, t]) => `<option value="${m}"${m === P.tinh ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="o-nhap">Cần trước ngày<input id="pk-han" type="date" value="${esc(P.han)}"></label></div>
    </section>
    <section class="the sau-sp"><h2>Giá và giấy tờ</h2>
      <label class="o-nhap">Giá mong muốn (đ/kg)<input id="pk-gia" inputmode="numeric" value="${esc(P.gia)}" placeholder="vd 24000"></label>
      <p class="phu">Giữ kín: người bán không thấy. AgiViet chỉ dùng để so với giá thấp nhất (cũng giữ kín) của người bán.</p>
      <fieldset class="giay" id="pk-giay"></fieldset>
    </section>
    <div class="day-nut sau-sp"><p class="phu" id="pk-thieu" role="status"></p><button type="submit" class="nut chinh rong" id="pk-tim">Tìm nguồn</button></div>
  </form>`;
  const $ = <T extends HTMLElement>(s: string) => o.querySelector<T>(s)!;
  const veLoai = () => { const ds = loaiCua(P.sp); if (!ds.includes(P.loai)) P.loai = "";
    $<HTMLSelectElement>("#pk-loai").innerHTML = `<option value="">Mọi loại</option>` + ds.map((g) => `<option value="${esc(g)}"${g === P.loai ? " selected" : ""}>${esc(tenLoai(g))}</option>`).join(""); };
  nhomSp = (ma) => (sp.find((x) => x.code === ma) as { group_code?: string } | undefined)?.group_code;
  const veGiay = () => { const ds = giayCua(P.sp); P.giay = P.giay.filter((g) => ds.some(([m]) => m === g));
    $("#pk-giay").innerHTML = `<legend>Giấy tờ cần có (đã xác minh, còn hạn)</legend>${P.sp ? "" : `<p class="phu">Chọn mặt hàng để thấy giấy tờ của mặt hàng đó.</p>`}
      ${P.sp ? ds.map(([m, t]) => `<label class="chon"><input type="checkbox" data-giay="${m}"${P.giay.includes(m) ? " checked" : ""}> ${t}</label>`).join("") : ""}
      <label class="chon"><input type="checkbox" id="pk-nk"${P.nhatKy ? " checked" : ""}> Có nhật ký ${laThuySan(nhomSp(P.sp)) ? "nuôi" : "canh tác"} ghi trong app</label>`; };
  veGiay();
  const moDan = () => o.querySelectorAll<HTMLElement>(".sau-sp").forEach((x) => (x.hidden = !P.sp));
  moDan();
  const capNut = () => { const t = thieuPhieu(); $<HTMLButtonElement>("#pk-tim").disabled = !!t.length; $("#pk-thieu").textContent = t.length ? `Còn thiếu: ${t.join(", ")}.` : ""; };
  veLoai(); capNut();
  $("#phieu").oninput = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.giay) P.giay = t.checked ? [...P.giay, t.dataset.giay] : P.giay.filter((x) => x !== t.dataset.giay);
    else if (t.id === "pk-nk") P.nhatKy = t.checked;
    else { const ten = ({ "pk-sp": "sp", "pk-loai": "loai", "pk-kg": "kg", "pk-tinh": "tinh", "pk-han": "han", "pk-gia": "gia" } as const)[t.id as "pk-sp"]; if (ten) { P[ten] = t.value; if (ten === "sp") { veLoai(); veGiay(); moDan(); } } }
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
    <div id="ng-kq"><p class="phu" role="status">Đang tìm nguồn…</p><div class="khung-tai"></div></div>`;
  const homNay = new Date().toISOString().slice(0, 10), den = P.han && P.han >= homNay ? P.han : new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const than = { product_code: P.sp, grade_code: P.loai || null, qty_g: String(Math.round(soKg() * 1000)), max_price_vnd: String(soGia()),
    needed_from: homNay, needed_to: den, province_code: P.tinh || null, required_docs: P.giay, farm_diary: P.nhatKy, can_gom: true };
  const kq = o.querySelector<HTMLElement>("#ng-kq")!;
  // Dịch vụ ghép (gói miễn phí) ngủ sau ~15 phút: máy chủ tự chờ ~45 s; app thử thêm 2 lần, mỗi lần cách 8 s
  let k: KetQuaTim;
  const baoCho = (t: string) => { const x = kq.querySelector("p"); if (x) x.textContent = t; };
  const hen = window.setTimeout(() => baoCho("Đang khởi động dịch vụ ghép nguồn, có thể mất tới 1 phút…"), 3000);
  try { k = await (async () => { for (let lan = 0; ; lan++) { try { return await api<KetQuaTim>("/v1/sourcing/search", than); } catch (e) { if (lan >= 2) throw e; baoCho("Dịch vụ ghép nguồn đang khởi động, đang thử lại…"); await new Promise((r) => setTimeout(r, 8000)); } } })(); }
  catch (e) { kq.innerHTML = `<section class="the"><p class="loi">${esc((e as Error).message)}</p><button type="button" class="nut vien" id="ng-lai">Thử lại</button></section>`; kq.querySelector<HTMLButtonElement>("#ng-lai")!.onclick = () => veKetQuaTim(o); return; }
  finally { clearTimeout(hen); }
  const gom = k.goi_y_gom?.nguon.length ? k.goi_y_gom : null;
  diemLo.clear(); k.ket_qua.forEach((l) => diemLo.set(l.lot_id, l));
  // Lô đã nằm trong nhóm gom thì không lặp lại ở danh sách bên dưới
  const ngoaiGom = k.ket_qua.filter((l) => !gom?.nguon.some((g) => g.lot_id === l.lot_id));
  // Không chấm điểm, không xếp hạng hộ (người sáng lập 19/11): thứ tự trung tính theo mã lô, mỗi lô tự ghi còn thiếu gì
  const dsLo = [...ngoaiGom].sort((a, b) => a.lot_code.localeCompare(b.lot_code));
  const an = k.so_lo_xet - k.ket_qua.length;
  kq.innerHTML = `<p class="phu">AgiViet xem ${k.so_lo_xet} lô ${esc(tenSp)} đang bán theo phiếu của bạn. Lô nào còn thiếu so với phiếu thì ghi ngay dưới lô.</p>
    ${gom ? `<section class="kq-nhom gom"><div class="hang"><h2>AgiViet đề xuất gom ${gom.nguon.length} hộ</h2></div>
      <p class="phu">Không hộ nào đủ ${vnd(soKg())} kg. Gom được ${vnd(gom.da_gom_kg)} kg${gom.con_thieu_kg > 0 ? `, còn thiếu ${vnd(gom.con_thieu_kg)} kg` : ", đủ lượng"}. Các hộ ở gần nhau để chở chung một chuyến; mỗi hộ ký hợp đồng riêng.</p>
      ${gom.nguon.map((l) => theGoiY({ ...(diemLo.get(l.lot_id) ?? {}), ...l })).join("")}
      <button type="button" class="nut chinh rong" id="ng-gui-nhom">Gửi lời chào cho cả ${gom.nguon.length} hộ</button>
      <p class="phu">Cùng giá mong muốn của bạn; mỗi hộ nhận lời chào riêng với phần lượng của mình. Theo dõi ở tab Đơn.</p><p class="loi" id="ng-gn-loi" role="alert"></p></section>` : ""}
    ${dsLo.length ? `<section class="kq-nhom"><div class="hang"><h2>Các lô đang bán</h2><span class="phu">${dsLo.length} lô</span></div>${dsLo.map((l) => theGoiY(l)).join("")}</section>` : ""}
    ${an > 0 && k.ket_qua.length ? `<p class="phu">${an} lô khác không hiện: giá thấp nhất của người bán cao hơn nhiều so với mức bạn muốn, hoặc lô đã hết hàng, hết hạn.</p>` : ""}
    ${k.ket_qua.length ? "" : viSaoTrong(tenSp)}
    <section class="the"><p class="phu">Chưa ưng nguồn nào? Gửi phiếu để người bán có hàng chủ động báo giá cho bạn.</p><button type="button" class="nut vien rong" id="ng-gui-phieu">Gửi phiếu cho người bán báo giá</button></section>`;
  ganTraGia(kq, () => veKetQuaTim(o)); ganChiTiet(kq);
  const gn = kq.querySelector<HTMLButtonElement>("#ng-gui-nhom");
  if (gn && gom) gn.onclick = async () => { gn.disabled = true;
    try { const { taoDonGom } = await import("./don-gom"); location.hash = `#don-gom/${await taoDonGom(gom.nguon as { lot_id: string; luong_g: string }[], Math.round(soKg() * 1000), soGia())}`; }
    catch (e) { kq.querySelector("#ng-gn-loi")!.textContent = (e as Error).message; gn.disabled = false; } };
  kq.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => (b.onclick = () => { const g = b.dataset.go; if (g === "tinh") P.tinh = ""; if (g === "loai") P.loai = ""; if (g === "giay") { P.giay = []; P.nhatKy = false; } if (g === "han") P.han = ""; veKetQuaTim(o); }));
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
  const doc = () => ({ gia: Number(giaO.value.replace(/\D/g, "")), soKg: docSo(kgO.value) });
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
const tenGiay = (m: string) => GIAY.find(([k]) => k === m)?.[1] ?? m;
const theGoiY = (l: LoGoiY) => `<article class="the goi-y">
  <div class="hang"><div><b>${esc(l.lot_code)} · ${esc(tenLoai(l.grade_code))}</b><p class="phu">${esc(l.seller_name || "")} · ${esc(tinh(l.province_code))}</p></div></div>
  <p class="phu">Đáp ứng được ${vnd(kg(l.luong_g ?? l.kha_dung_cam_ket_g))} kg${l.nhat_ky_muc ? ` · nhật ký canh tác ${l.nhat_ky_muc} mục` : ""}</p>
  ${(l.thieu || []).length ? `<div class="tin"><span class="phu">Còn thiếu:</span>${(l.thieu || []).map((x) => `<span class="chip do">${esc(x)}</span>`).join("")}</div>` : `<div class="tin"><span class="chip la">Đủ theo phiếu</span></div>`}
  ${DL.lo.some((x) => x.id === l.lot_id) ? `<div class="hang-nut"><button type="button" class="nut vien nho" data-ct="${esc(l.lot_id)}">Xem chi tiết</button><button type="button" class="nut chinh nho" data-tra="${esc(l.lot_id)}">Trả giá</button></div>` : ""}</article>`;


/** Không có lô đạt phiếu: tìm điều kiện đang chặn (dựa trên lô đang bán) và cho gỡ từng cái. */
function viSaoTrong(tenSp: string): string {
  const cungSp = DL.lo.filter((l) => l.product_code === P.sp && (!l.is_substandard || l.ban_gap));
  const cungLoai = cungSp.filter((l) => !P.loai || l.grade_code === P.loai), cungTinh = cungLoai.filter((l) => !P.tinh || l.province_code === P.tinh);
  const ly: string[] = [], nut: string[] = [];
  const tinhKhac = [...new Set(cungLoai.map((l) => tinh(l.province_code)))];
  if (!cungSp.length) ly.push(`Hiện chưa có ai đang bán ${esc(tenSp)}.`);
  else if (!cungLoai.length) { ly.push(`Có ${cungSp.length} lô ${esc(tenSp)} nhưng không có ${esc(tenLoai(P.loai))}.`); nut.push(`<button type="button" class="nut vien nho" data-go="loai">Nhận mọi loại</button>`); }
  else if (!cungTinh.length) { ly.push(`Không có ${esc(tenSp)} ${esc(tenLoai(P.loai))} ở ${esc(tinh(P.tinh))}; có ${cungLoai.length} lô ở ${esc(tinhKhac.join(", "))}.`); nut.push(`<button type="button" class="nut vien nho" data-go="tinh">Tìm ở mọi tỉnh</button>`); }
  else {
    if (P.giay.length || P.nhatKy) { ly.push(`Có ${cungTinh.length} lô đúng mặt hàng nhưng chưa lô nào có đủ giấy tờ bạn yêu cầu.`); nut.push(`<button type="button" class="nut vien nho" data-go="giay">Bỏ yêu cầu giấy tờ</button>`); }
    if (P.han) { ly.push(`Có thể hàng chưa kịp trước ${ngay(P.han)}.`); nut.push(`<button type="button" class="nut vien nho" data-go="han">Bỏ hạn ngày</button>`); }
    ly.push("Hoặc giá mong muốn thấp hơn mức thấp nhất người bán chấp nhận (mức này giữ kín, AgiViet không cho biết).");
  }
  return `<section class="the trong-ly"><h2>Chưa có lô nào đạt phiếu</h2>${ly.map((x) => `<p>${x}</p>`).join("")}${nut.length ? `<div class="tin">${nut.join("")}</div>` : ""}</section>`;
}

const TEN_VIEC: Record<string, string> = { fertilize: "Bón phân", spray: "Phun thuốc", water: "Tưới", flower: "Ra hoa", fruit_set: "Đậu trái", harvest: "Thu hoạch", weather_incident: "Sự cố thời tiết", pest_incident: "Sâu bệnh", care: "Chăm sóc" };
const TT_GIAY: Record<string, [string, string]> = { da_xac_minh: ["Đã xác minh", "la"], tu_khai: ["Người bán tự khai", ""], het_hieu_luc: ["Hết hiệu lực", "do"] };
interface HoSoNguon { lot_code: string; nguoi_ban: { ten: string; muc_xac_minh?: string; tinh?: string }; vi_tri: { ten?: string } | null; don_hoan_tat_tren_app: number; anh: { nhan: string }[];
  giay_to: { kind: string; label_vi: string; market?: string; den?: string; trang_thai: string }[];
  nhat_ky: { ngay: string; viec: string; ghi_chu?: string; thuoc?: string; ngay_cach_ly?: number; het_cach_ly?: string }[] }

/** Tấm chi tiết một lô: người bán, giấy tờ (trạng thái, hạn), nhật ký canh tác, ảnh. */
async function moChiTietLo(lotId: string): Promise<void> {
  const t = document.createElement("dialog"); t.className = "tam"; t.setAttribute("aria-labelledby", "ct-lo-td");
  t.innerHTML = `<div class="tam-dau"><h2 id="ct-lo-td">Hồ sơ nguồn</h2><button type="button" class="nut-tron" data-dong aria-label="Đóng">×</button></div><div class="tam-than"><div class="khung-tai"></div></div>`;
  document.body.append(t); t.showModal();
  t.addEventListener("click", (e) => { if (e.target === t || (e.target as HTMLElement).closest("[data-dong]")) t.close(); }); t.addEventListener("close", () => t.remove());
  const than = t.querySelector<HTMLElement>(".tam-than")!;
  let h: HoSoNguon;
  try { h = await api<HoSoNguon>(`/v1/lots/${lotId}/source-profile`); } catch (e) { than.innerHTML = `<p class="loi">${esc((e as Error).message)}</p>`; return; }
  const l = DL.lo.find((x) => x.id === lotId);
  const d = diemLo.get(lotId);
  than.innerHTML = `<div class="ct-lo">
    ${d ? `<section><h3>So với phiếu của bạn</h3>${(d.thieu || []).length ? `<div class="tin"><span class="phu">Còn thiếu:</span>${(d.thieu || []).map((x) => `<span class="chip do">${esc(x)}</span>`).join("")}</div>` : `<div class="tin"><span class="chip la">Đủ theo phiếu</span></div>`}</section>` : ""}
    <section><h3>${esc(h.lot_code)}${l ? ` · ${esc(l.product_name || "")} ${esc(tenLoai(l.grade_code))}` : ""}</h3>
      <p class="phu">${esc(h.nguoi_ban.ten)} · ${esc(tinh(h.nguoi_ban.tinh))}${h.vi_tri?.ten ? ` · ${esc(h.vi_tri.ten)}` : ""}</p>
      <p class="phu">${h.don_hoan_tat_tren_app ? `${h.don_hoan_tat_tren_app} đơn đã hoàn tất trên AgiViet` : "Chưa có đơn hoàn tất trên AgiViet"} · ${h.anh.filter((a) => a.nhan === "chup_trong_app").length} ảnh chụp trong app</p></section>
    <section><h3>Giấy tờ</h3>${h.giay_to.length ? h.giay_to.map((g) => { const [n, c] = TT_GIAY[g.trang_thai] ?? [g.trang_thai, ""];
      return `<div class="dk-dong"><span>${esc(g.label_vi)}${g.market ? ` · thị trường ${esc(g.market)}` : ""}</span><p><span class="chip ${c}">${n}</span>${g.den ? ` <span class="phu">còn hạn tới ${ngay(g.den)}</span>` : ""}</p></div>`; }).join("") : `<p class="phu">Người bán chưa khai giấy tờ nào.</p>`}</section>
    <section><h3>Nhật ký canh tác</h3>${h.nhat_ky.length ? h.nhat_ky.map((n) => `<div class="dk-dong"><span>${ngay(n.ngay)}</span><p>${esc(TEN_VIEC[n.viec] ?? n.viec)}${n.thuoc ? ` · ${esc(n.thuoc)}${n.ngay_cach_ly ? `, cách ly ${n.ngay_cach_ly} ngày (hết ${ngay(n.het_cach_ly)})` : ""}` : ""}${n.ghi_chu ? `<br><span class="phu">${esc(n.ghi_chu)}</span>` : ""}</p></div>`).join("") : `<p class="phu">Vườn này chưa ghi nhật ký trong app.</p>`}</section>
    ${l ? `<button type="button" class="nut chinh rong" data-tra="${esc(lotId)}">Trả giá lô này</button>` : ""}</div>`;
  than.querySelector<HTMLButtonElement>("[data-tra]")?.addEventListener("click", () => { t.close(); if (l) moTraGia(l, () => window.dispatchEvent(new Event("agv-lam-moi"))); });
}
const ganChiTiet = (o: HTMLElement) => o.querySelectorAll<HTMLButtonElement>("[data-ct]").forEach((b) => (b.onclick = () => moChiTietLo(b.dataset.ct!)));

const TEN_NHOM: Record<string, string> = { fresh_fruit: "Trái cây tươi", aquaculture: "Thủy sản nuôi", seafood: "Hải sản", grain: "Lúa gạo, ngũ cốc", vegetable: "Rau củ", spice: "Gia vị", nut: "Hạt", other: "Khác" };
/** Chọn mặt hàng chính (tối đa 5). batDau = lần đầu vào tab Nguồn khi chưa chọn. */
async function veChonMatHang(o: HTMLElement, batDau = false): Promise<void> {
  const sp = await laySp() as (Awaited<ReturnType<typeof laySp>>[number] & { group_code?: string })[];
  const chon = new Set(DL.matHangChinh);
  const nhom = [...new Set(sp.map((s) => s.group_code || "other"))];
  o.innerHTML = `<form class="phieu" id="mhc" novalidate>
    <section class="the nguon-dau"><h2>${batDau ? "Bạn thường mua mặt hàng nào?" : "Mặt hàng chính"}</h2>
      <p class="phu">Chọn tối đa 5 mặt hàng bạn mua thường xuyên. AgiViet chỉ gợi ý nguồn và cho người bán thấy nhu cầu của bạn ở các mặt hàng này.</p></section>
    ${nhom.map((n) => `<section class="the"><h2>${esc(TEN_NHOM[n] ?? n)}</h2><div class="tin">${sp.filter((s) => (s.group_code || "other") === n).map((s) =>
      `<label class="chip-chon"><input type="checkbox" value="${esc(s.code)}"${chon.has(s.code) ? " checked" : ""}> ${esc(s.name_vi)}</label>`).join("")}</div></section>`).join("")}
    <div class="day-nut"><p class="phu" id="mhc-dem" role="status"></p><p class="loi" id="mhc-loi" role="alert"></p><button type="submit" class="nut chinh rong" id="mhc-luu">Lưu mặt hàng chính</button></div></form>`;
  const dem = () => { const n = o.querySelectorAll<HTMLInputElement>("#mhc input:checked").length;
    o.querySelectorAll<HTMLInputElement>("#mhc input:not(:checked)").forEach((x) => (x.disabled = n >= 5));
    o.querySelector("#mhc-dem")!.textContent = n ? `Đã chọn ${n}/5` : "Chưa chọn mặt hàng nào"; o.querySelector<HTMLButtonElement>("#mhc-luu")!.disabled = !n; };
  dem(); o.querySelector("#mhc")!.addEventListener("change", dem);
  o.querySelector<HTMLFormElement>("#mhc")!.onsubmit = async (e) => { e.preventDefault();
    const ma = [...o.querySelectorAll<HTMLInputElement>("#mhc input:checked")].map((x) => x.value), nut = o.querySelector<HTMLButtonElement>("#mhc-luu")!; nut.disabled = true;
    try { await api("/v1/org/main-products", { product_codes: ma }); DL.matHangChinh = ma; if (P.sp && !ma.includes(P.sp)) P.sp = ""; locSp = ""; location.hash = "#nguon"; if (!batDau) return; veNguon(o); }
    catch (err) { o.querySelector("#mhc-loi")!.textContent = (err as Error).message; nut.disabled = false; } };
}
