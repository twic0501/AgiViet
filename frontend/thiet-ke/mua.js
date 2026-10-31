// App MUA AgiViet — bản thiết kế 49 màn (danh mục "App Thu mua"), dữ liệu mẫu theo AgiViet_prompt_app_mua_V2.md.
// Một người mua làm hết (chị Thu Hà, Nhà máy sấy Đồng Xanh). Máy tính + điện thoại dùng chung trạng thái.
import { esc, d, kg, so, icon, taoKho, chayApp } from "./so-lam-an.js";

// ── Dữ liệu ──
const TONG_CHUYEN_COC = 13938000, COC = 13800000, PHI = 138000, TRA_THANG = 32200000, NGHIEM_THU = 44350000, COC_CHO_NB = 12150000, HOAN = 1650000;
const BUOC = [
  { ai: "ban", lam: "Đồng ý giá: hàng được giữ 24 giờ", nut: "Đồng ý giá" },
  { ai: "ban", lam: "Soạn và ký thỏa thuận", nut: "Ký và gửi" },
  { ai: "nb", lam: "Người bán xem lại và ký", mp: "Mô phỏng: chị Năm ký" },
  { ai: "ban", lam: `Chuyển cọc ${d(TONG_CHUYEN_COC)}`, nut: `Chuyển cọc ${d(TONG_CHUYEN_COC)}`, han: "48 giờ sau khi người bán ký" },
  { ai: "nh", lam: "Ngân hàng xác nhận cọc · mở liên lạc", mp: "Mô phỏng: ngân hàng xác nhận" },
  { ai: "ban", lam: `Trả thẳng ${d(TRA_THANG)} cho người bán`, nut: "Ghi đã trả", han: "trước 5:30 ngày 28/10" },
  { ai: "nb", lam: "Người bán xác nhận đúng số", mp: "Mô phỏng: chị Năm xác nhận số đã nhận" },
  { ai: "nb", lam: "Xe tới vườn: quét mã 482 917, bốc, niêm phong mẫu M-2291", mp: "Mô phỏng: xe bốc xong" },
  { ai: "ban", lam: "Xem video lúc bốc → Đạt khi bốc", nut: "Đạt khi bốc" },
  { ai: "ban", lam: "Kho ký nhận (bắt đầu 2 giờ nghiệm thu)", nut: "Ký nhận" },
  { ai: "ban", lam: "Nghiệm thu 3 phần", nut: "Gửi kết quả", han: "2 giờ từ lúc ký nhận" },
  { ai: "nb", lam: "Người bán đồng ý kết quả", mp: "Mô phỏng: chị Năm đồng ý", han: "24 giờ" },
  { ai: "nh", lam: "Ngân hàng xử lý cọc", mp: "Mô phỏng: ngân hàng chi cọc" },
  { ai: "ban", lam: `Xác nhận tiền hoàn ${d(HOAN)} đã về`, nut: `Đã nhận lại ${d(HOAN)}` },
  { ai: "ban", lam: "Hoàn tất: nhập kho, bảng kê, đánh giá", nut: "Nhập kho" },
];
const AI = { ban: "Bạn", nb: "Người bán", nh: "Ngân hàng", vh: "Người vận hành" };

const DAU = {
  phien: "mua-v1",
  goi: "free",
  hd: { buoc: 0, daTra: 0, nbXn: 0, traThieu: false, loTra: 0 },
  chao: { rut: 0, chon: null },
  hoiChon: "PN-0042",
};
const kho = taoKho("agv-mua", DAU);
const doi = (f) => kho.doi(f);

const LO = [
  { ma: "L-0412", ten: "Xoài cát Chu loại 1", nguoi: "Chị Năm", noi: "Mỹ Xương, Cao Lãnh, Đồng Tháp", gia: 23000, con: 3500, hai: "27/10", uy: 4.8, don: 31, anh: "xoai", kiem: true },
  { ma: "L-0431", ten: "Xoài cát Hòa Lộc loại 1", nguoi: "Anh Tư Hòa", noi: "Cái Bè, Tiền Giang", gia: 31500, con: 1800, hai: "29/10", uy: 4.6, don: 12, anh: "xoai", kiem: false },
  { ma: "L-0440", ten: "Thanh long ruột đỏ", nguoi: "HTX Tân Thuận", noi: "Chợ Gạo, Tiền Giang", gia: 14200, con: 6000, hai: "30/10", uy: 4.7, don: 58, anh: "thanh-long", kiem: true },
  { ma: "L-0398", ten: "Bưởi da xanh loại 1", nguoi: "Anh Sáu", noi: "Mỏ Cày Bắc, Bến Tre", gia: 28000, con: 2200, hai: "02/11", uy: 4.9, don: 44, anh: "buoi", kiem: true },
  { ma: "L-0427", ten: "Tôm thẻ chân trắng 60 con/kg", nguoi: "Chị Bảy Hồng", noi: "Đầm Dơi, Cà Mau", gia: 118000, con: 900, hai: "28/10", uy: 4.5, don: 9, anh: "tom", kiem: false },
  { ma: "L-0436", ten: "Sầu riêng Ri6 loại 1", nguoi: "Anh Huỳnh Bảy", noi: "Cai Lậy, Tiền Giang", gia: 62000, con: 1500, hai: "31/10", uy: 4.4, don: 17, anh: "sau", kiem: false },
];
const CHAO = [
  { nguoi: "Chị Năm", lo: "L-0412", gia: 23000, giao: "Tại vườn · bạn tự lo xe 180 km", phiXe: 900, ngay: "28/10", uy: 4.8, luong: 2000, ha: 15000 },
  { nguoi: "Anh Tư Hòa", lo: "L-0431*", gia: 23500, giao: "Giao tận kho Đồng Xanh", phiXe: 0, ngay: "30/10", uy: 4.1, luong: 1500, ha: 16000 },
  { nguoi: "HTX Tân Thuận", lo: "L-0445", gia: 22800, giao: "Tại vườn · bạn tự lo xe 230 km", phiXe: 1500, ngay: "29/10", uy: 4.7, luong: 2000, ha: 14000 },
];
const NHU_CAU = [
  { ma: "PN-0042", hang: "Xoài cát Chu loại 1", luong: 2000, khoang: "27–29/10", tran: 24000, bao: 3, trang: "Đang nhận báo giá" },
  { ma: "PN-0045", hang: "Thanh long ruột đỏ loại 1–2", luong: 5000, khoang: "01–05/11", tran: 15000, bao: 1, trang: "Đang nhận báo giá" },
  { ma: "PN-0039", hang: "Bưởi da xanh loại 1", luong: 1200, khoang: "20–22/10", tran: 29000, bao: 4, trang: "Đã chốt · HĐ-0015" },
];
const DON_KHAC = [
  { ma: "HĐ-0024", hang: "Sầu riêng Ri6 · 800 kg", nguoi: "Anh Huỳnh Bảy", buoc: "Người bán đề nghị đổi ngày giao 28/10 → 29/10", luot: "ban", han: "còn 5 giờ", tien: 49600000 },
  { ma: "HĐ-0021", hang: "Thanh long ruột đỏ · 3.000 kg", nguoi: "HTX Tân Thuận", buoc: "Ngân hàng đang xác nhận cọc", luot: "nh", han: "trong ngày", tien: 42600000 },
  { ma: "HĐ-0012", hang: "Xoài cát Chu · 1.500 kg", nguoi: "Chị Mười", buoc: "Lệch tiền, đang đối soát (bạn báo 32.200.000 · bên bán thấy 20.000.000)", luot: "vh", han: "còn 1 ngày", tien: 34500000 },
  { ma: "HĐ-0015", hang: "Bưởi da xanh · 1.200 kg", nguoi: "Anh Sáu", buoc: "Hoàn tất", luot: "xong", han: "", tien: 33600000 },
];

// ── Trạng thái đơn HĐ-0018 ──
const hdTien = (h) => {
  const b = h.buoc;
  const banChi = (b >= 4 ? TONG_CHUYEN_COC : 0) + h.daTra - (b >= 14 ? HOAN : 0);
  const nh = b >= 4 && b < 13 ? COC : 0;
  const nb = h.nbXn + (b >= 13 ? COC_CHO_NB : 0);
  return { banChi, nh, nb };
};
const hdChan = (h) => (h.buoc === 7 && h.nbXn < TRA_THANG && h.nbXn > 0) ? `Chưa bốc được: người bán mới xác nhận ${so(h.nbXn)} / ${d(TRA_THANG)}` : "";
const hdLuot = (h) => h.buoc >= BUOC.length ? "xong" : hdChan(h) ? "ban" : BUOC[h.buoc].ai;
const hdTienSauBuoc = (i) => [
  "Hàng được giữ 24 giờ", "", "", "Ngân hàng giữ 13.800.000 đ (chờ xác nhận)", "Ngân hàng giữ 13.800.000 đ", "Đã báo trả 32.200.000 đ", "Người bán đã nhận 32.200.000 đ",
  "Rủi ro đường từ đây thuộc bạn", "", "", "Giá trị nghiệm thu 44.350.000 đ", "", "12.150.000 đ sang chị Năm · 1.650.000 đ hoàn bạn", "Chi ròng 44.350.000 đ", ""][i];
const viecCan = (s) => (hdLuot(s.hd) === "ban" ? 1 : 0) + DON_KHAC.filter((x) => x.luot === "ban").length + 1;

function veBuoc(h, gon = false) {
  const chan = hdChan(h);
  return `<ol class="sl-buoc">${BUOC.map((b, i) => {
    const xong = i < h.buoc, nay = i === h.buoc;
    const lop = xong ? "sl-b-xong" : nay ? (chan && i === 7 ? "sl-b-nay sl-b-chan" : "sl-b-nay") : "sl-b-cho";
    if (gon && !nay && Math.abs(i - h.buoc) > 2) return "";
    return `<li class="${lop}${xong && i === h.buoc - 1 ? " sl-moi" : ""}"><span class="sl-b-vong">${xong ? icon("tich") : i + 1}</span><div>
      <span class="sl-b-ai">${AI[b.ai]}${b.han && !xong ? ` · hạn ${esc(b.han)}` : ""}</span>
      <b>${esc(b.lam)}</b>
      ${xong && hdTienSauBuoc(i) ? `<div class="sl-b-tien">${esc(hdTienSauBuoc(i))}</div>` : ""}
      ${nay && chan && i === 7 ? `<div class="sl-b-ly">${esc(chan)}</div>` : ""}
    </div></li>`;
  }).join("")}</ol>`;
}
function veTienO(h) {
  const t = hdTien(h);
  return `<div class="sl-tien-o" id="tien-o">
    <div><small>Bạn đã chi</small><b class="sl-so">${d(t.banChi)}</b><span class="sl-ghi">${h.buoc === 13 ? "chờ hoàn 1.650.000 đ" : h.buoc >= 14 ? "đã nhận lại tiền hoàn" : "gồm phí 138.000 đ"}</span></div>
    <div><small>Ngân hàng giữ</small><b class="sl-so" style="color:var(--chin)">${d(t.nh)}</b><span class="sl-ghi">${t.nh ? "cọc 30%" : h.buoc >= 13 ? "đã xử lý cọc" : "chưa có cọc"}</span></div>
    <div><small>Chị Năm đã nhận</small><b class="sl-so" style="color:var(--la)">${d(t.nb)}</b><span class="sl-ghi">${h.daTra > h.nbXn ? `chờ xác nhận ${so(h.daTra - h.nbXn)} đ` : "đã xác nhận đúng số"}</span></div>
  </div>`;
}
function veViec(h, url) {
  const luot = hdLuot(h);
  if (luot === "xong") return `<div class="sl-viec sl-xong"><div><h2>Hoàn tất · hết nghĩa vụ hai bên</h2><p>Đã nhập kho 1.850 kg loại 1 và 120 kg hạ cấp. Bảng kê tháng 10 đã có dòng này.</p></div><div class="sl-hang-nut"><a class="sl-nut sl-vien" href="${url("bang-ke")}">Tải bảng kê</a></div></div>`;
  const b = BUOC[h.buoc], chan = hdChan(h);
  if (chan) return `<div class="sl-viec sl-chan-lai"><div><h2>${esc(chan)}</h2><p>Còn thiếu ${d(TRA_THANG - h.nbXn)}. Trả nốt vào Agribank •••• 2186 (đúng tài khoản trong hợp đồng), nội dung HD0018.</p></div><div class="sl-hang-nut">${h.daTra < TRA_THANG ? `<button class="sl-nut sl-vang" data-lam="tra-not">Ghi đã trả ${d(TRA_THANG - h.daTra)}</button>` : `<button class="sl-nut sl-mp" data-lam="mp">Mô phỏng: chị Năm xác nhận phần còn lại</button>`}</div></div>`;
  if (luot === "ban") {
    const nut = b.nut === "Ghi đã trả" ? `Ghi đã trả ${d(h.traThieu ? 20000000 : TRA_THANG)}` : b.nut;
    const them = h.buoc === 10 ? `<a class="sl-nut sl-vien" href="${url("nghiem-thu")}">Mở bảng nghiệm thu</a>` : h.buoc === 1 ? `<a class="sl-nut sl-vien" href="${url("thoa-thuan")}">Xem lại thỏa thuận</a>` : h.buoc === 3 ? `<a class="sl-nut sl-vien" href="${url("dat-coc")}">Xem chi tiết cọc</a>` : "";
    const giai = { 0: "Hàng của chị Năm được giữ 24 giờ cho bạn từ lúc đồng ý.", 3: "Cọc 30% do ngân hàng đối tác giữ. Phí giới thiệu 0,3% lưu vào hợp đồng.", 5: "Chuyển thẳng cho chị Năm, chỉ vào Agribank •••• 2186, nội dung HD0018. Bạn đang chịu rủi ro 32.200.000 đ cho phần trả trước khi bốc.", 8: "Xem video bốc tại vườn. Bấm xong thì rủi ro đường thuộc bạn.", 9: "Bấm khi xe về kho. Từ lúc này bạn có 2 giờ để nghiệm thu.", 10: "Mẫu: đạt 1.850 kg · hạ cấp 120 kg · trả lại 30 kg → 44.350.000 đ.", 13: "Ngân hàng đã gửi lệnh hoàn. Chỉ bấm khi tiền đã thật sự về tài khoản.", 14: "Nhập 1.970 kg vào kho nguyên liệu, rồi đánh giá chị Năm." }[h.buoc] || "";
    return `<div class="sl-viec"><div><h2>${esc(b.lam)}</h2><p>${esc(giai)}${b.han ? ` Hạn: ${esc(b.han)}.` : ""}</p></div><div class="sl-hang-nut">${them}<button class="sl-nut sl-vang" data-lam="lam">${esc(nut)}</button>${h.buoc === 13 ? `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>` : ""}</div></div>`;
  }
  return `<div class="sl-viec sl-cho"><div><h2>Đang chờ ${esc(AI[luot].toLowerCase())}: ${esc(b.lam.replace(/^Người bán |^Ngân hàng /, ""))}</h2><p>Bạn không phải làm gì lúc này${b.han ? ` · hạn ${esc(b.han)}` : ""}. Khi có kết quả, đơn tự sang bước sau.</p></div><div class="sl-hang-nut"><button class="sl-nut sl-mp" data-lam="mp">${esc(b.mp)}</button></div></div>`;
}
function ganNutDon(goc, veLai) {
  goc.querySelectorAll("[data-lam]").forEach((n) => n.addEventListener("click", () => {
    const lam = n.dataset.lam;
    if (lam === "chua") { n.closest(".sl-viec").querySelector("p").textContent = "Đã ghi: chưa nhận. Ngân hàng được báo kiểm lại lệnh hoàn; đơn chưa hoàn tất."; return; }
    doi((s) => {
      const h = s.hd;
      if (lam === "tra-not") { h.daTra = TRA_THANG; return; }
      if (h.buoc === 5) { h.daTra = h.traThieu ? 20000000 : TRA_THANG; h.buoc++; return; }
      if (h.buoc === 6 || (h.buoc === 7 && hdChan(h))) { h.nbXn = h.daTra; if (h.buoc === 6) h.buoc++; return; }
      if (h.buoc === 7 && h.nbXn < TRA_THANG) return;
      h.buoc = Math.min(BUOC.length, h.buoc + 1);
    });
    const o = document.getElementById("tien-o"); o?.querySelectorAll("div").forEach((x) => x.classList.add("sl-nhay"));
  }));
}

// ── Mẫu dùng lại ──
const nhanLuot = (l) => l === "ban" ? `<span class="sl-nhan sl-n-ban">Tới lượt bạn</span>` : l === "nb" ? `<span class="sl-nhan">Chờ người bán</span>` : l === "nh" ? `<span class="sl-nhan sl-n-nh">Chờ ngân hàng</span>` : l === "vh" ? `<span class="sl-nhan sl-n-nh">Người vận hành kiểm</span>` : `<span class="sl-nhan sl-n-xong">Hoàn tất</span>`;
const sao = (n) => `<span class="sl-so" style="color:var(--chin);font-weight:600">${n.toFixed(1)}★</span>`;
const theLo = (l, url) => `<a class="sl-lo" href="${url("chi-tiet-lo", "&lo=" + l.ma)}"><div class="sl-lo-anh sl-anh-${l.anh}">${l.kiem ? `<span class="sl-nhan sl-n-xong">Đã kiểm tại vườn</span>` : `<span class="sl-nhan">Người bán tự khai</span>`}</div>
  <div class="sl-lo-than"><b>${esc(l.ten)}</b><span class="sl-ghi">${esc(l.nguoi)} · ${esc(l.noi)}</span><span class="sl-gia">${so(l.gia)} đ/kg</span><span class="sl-ghi">Còn ${kg(l.con)} · hái ${esc(l.hai)} · ${sao(l.uy)} · ${l.don} đơn</span></div></a>`;
const the = (tieu, than, phai = "") => `<section class="sl-the"><div class="sl-the-dau"><h2><span class="sl-cham"></span>${esc(tieu)}</h2>${phai}</div>${than}</section>`;
const dong = (a, b, lop = "") => `<div class="sl-dong ${lop}"><span>${a}</span><b>${b}</b></div>`;
const bao = (chu, loai = "") => `<div class="sl-bao ${loai}">${icon(loai === "sl-bao-do" ? "canh" : "khien")}<div>${chu}</div></div>`;
const timO = (goi) => `<label class="sl-tim">${icon("tim")}<input placeholder="${esc(goi)}" aria-label="${esc(goi)}"></label>`;
const loc = (ds, chon = 0) => `<div class="sl-loc" role="group">${ds.map((x, i) => `<button type="button" aria-pressed="${i === chon}">${esc(x)}</button>`).join("")}</div>`;
const ganLoc = (goc) => goc.querySelectorAll(".sl-loc").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
const lo = (ma) => LO.find((x) => x.ma === ma) || LO[0];

// ── Các màn ──
const man = {
  // Vào app
  "dang-nhap": { tieuDe: "Đăng nhập", phu: "App mua AgiViet", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="align-items:center;max-width:960px">
      <section class="sl-the" style="padding:28px;display:grid;gap:16px">
        <h2 style="font-size:var(--c5)">Mua nông sản, thủy sản tận vườn — có hợp đồng, cọc do ngân hàng giữ</h2>
        <label class="sl-o"><span>Số điện thoại hoặc email công việc</span><input inputmode="email" value="0277 386 210"></label>
        <a class="sl-nut sl-vang" href="${url("otp")}" style="min-height:48px">Nhận mã xác minh</a>
        <p class="sl-ghi">Chưa có tài khoản tổ chức? Nhập số điện thoại, bước sau sẽ hỏi thông tin tổ chức.</p>
      </section>
      <div style="display:grid;gap:12px">${bao("Cọc 30% do ngân hàng đối tác giữ tới khi nghiệm thu xong.", "sl-bao-tien")}${bao("Người bán đã xác minh danh tính và tài khoản nhận tiền đúng tên.")}${bao("Số điện thoại hai bên được che tới khi ngân hàng xác nhận cọc.", "sl-bao-nh")}</div>
    </div>` },
  otp: { tieuDe: "Mã xác minh", lui: "dang-nhap", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:440px;display:grid;gap:16px;padding:24px">
      <p>Mã 6 số đã gửi tới <b>0277 386 210</b>. Mã hết hạn sau 5 phút.</p>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${"123456".split("").map((c) => `<input aria-label="Số mã" maxlength="1" value="${c}" style="min-width:0;width:100%;height:52px;text-align:center;font:700 22px var(--chu);border-radius:10px;border:1px solid var(--ke-dam);background:var(--giay-lot)">`).join("")}</div>
      <a class="sl-nut sl-vang" href="${url("thong-tin-to-chuc")}" style="min-height:48px">Xác minh</a>
      <button class="sl-nut sl-vien" type="button">Gửi lại mã (sau 42 giây)</button>
    </section>` },
  "thong-tin-to-chuc": { tieuDe: "Thông tin tổ chức", lui: "otp", phu: "Bước 1/2 · dùng cho hợp đồng và bảng kê thuế", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2">
        <label class="sl-o"><span>Tên tổ chức</span><input value="Công ty TNHH Nhà máy sấy Đồng Xanh"></label>
        <label class="sl-o"><span>Mã số thuế</span><input value="1601 234 567" inputmode="numeric"></label>
        <label class="sl-o"><span>Loại hình</span><select><option>Chế biến</option><option>Xuất khẩu</option><option>Bán lẻ, siêu thị</option><option>Vựa, đầu mối</option><option>Nhà hàng, bếp ăn</option><option>Mua thử</option></select><small>Chỉ đổi giá trị điền sẵn khi soạn thỏa thuận, không đổi luồng mua.</small></label>
        <label class="sl-o"><span>Người phụ trách mua</span><input value="Lê Thu Hà"></label>
      </div>
      <label class="sl-o"><span>Địa chỉ kho nhận hàng</span><input value="KCN Sa Đéc, Đồng Tháp"></label>
      <div class="sl-the sl-the-lot" style="display:flex;gap:12px;align-items:center">${icon("phieu")}<div style="flex:1"><b>Giấy phép kinh doanh</b><div class="sl-ghi">Thêm để được nhãn "Tổ chức đã xác minh". Có thể bổ sung sau.</div></div><button class="sl-nut sl-vien" type="button">Tải ảnh lên</button></div>
      <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vang" href="${url("chon-goi")}">Tiếp tục</a></div>
    </section>` },
  "chon-goi": { tieuDe: "Chọn gói", lui: "thong-tin-to-chuc", phu: "Bước 2/2 · đổi được bất cứ lúc nào", ve: (s, { url }) => veGoi(url, true) },

  // Tổng quan
  "tong-quan": { tieuDe: "Tổng quan", phu: "Thứ Hai, 27/10 · Nhà máy sấy Đồng Xanh", phai: (s) => `<span class="sl-an-dt">${timO("Tìm lô, đơn, người bán")}</span><a class="sl-nut sl-vang sl-an-dt" href="?man=tao-nhu-cau">${icon("them")}Tạo phiếu nhu cầu</a>`, ve: (s, { url }) => {
    const h = s.hd, luot = hdLuot(h);
    return `
    <div class="sl-luoi sl-l4">
      <div class="sl-the sl-chiso sl-gap"><small>Tới lượt bạn</small><b>${viecCan(s)}</b><span>việc cần làm hôm nay</span></div>
      <div class="sl-the sl-chiso"><small>Đơn sắp nhận</small><b>3</b><span>trong 7 ngày · 6.800 kg</span></div>
      <div class="sl-the sl-chiso sl-tien"><small>Tiền sắp trả</small><b>${so(h.daTra >= TRA_THANG ? 0 : TRA_THANG - h.daTra)}</b><span>đ · trả thẳng HĐ-0018 trước 5:30 28/10</span></div>
      <div class="sl-the sl-chiso"><small>Ngân hàng đang giữ</small><b>${so(hdTien(h).nh + 12780000)}</b><span>đ · cọc của 2 đơn</span></div>
    </div>
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        ${the("Việc cần làm", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Việc</th><th>Hạn</th><th>Lượt</th></tr></thead><tbody>
          <tr><td><a href="${url("chi-tiet-don")}">HĐ-0018</a><div class="sl-ghi">Xoài cát Chu · chị Năm</div></td><td>${esc(luot === "xong" ? "Hoàn tất" : hdChan(h) || BUOC[h.buoc].lam)}</td><td class="sl-so">${esc(luot === "xong" ? "" : BUOC[h.buoc]?.han || "hôm nay")}</td><td>${nhanLuot(luot)}</td></tr>
          ${DON_KHAC.filter((x) => x.luot !== "xong").map((x) => `<tr><td><a href="${url("chi-tiet-don")}">${x.ma}</a><div class="sl-ghi">${esc(x.hang)}</div></td><td>${esc(x.buoc)}</td><td class="sl-so">${esc(x.han)}</td><td>${nhanLuot(x.luot)}</td></tr>`).join("")}
          <tr><td><a href="${url("so-bao-gia")}">PN-0042</a><div class="sl-ghi">Xoài cát Chu · 2.000 kg</div></td><td>3 báo giá mới, chọn trước 18:00</td><td class="sl-so">còn 9 giờ</td><td>${nhanLuot("ban")}</td></tr>
        </tbody></table></div>`, `<a href="${url("don-hang")}">Tất cả đơn</a>`)}
        ${the("Nguồn khớp nhu cầu", `<div class="sl-luoi sl-l3">${LO.slice(0, 3).map((l) => theLo(l, url)).join("")}</div>`, `<a href="${url("goi-y")}">Xem gợi ý</a>`)}
      </div>
      <div style="display:grid;gap:16px">
        ${the("Lịch nhận tuần này", [["T3 28/10", "HĐ-0018 · 2.000 kg xoài", "tại vườn 5:30"], ["T4 29/10", "HĐ-0024 · 800 kg sầu riêng", "giao tận kho"], ["T6 31/10", "HĐ-0021 · 3.000 kg thanh long", "giao tận kho"]].map(([a, b, c]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, `<span class="sl-ghi">${c}</span>`)).join(""), `<a href="${url("lich-nhan")}">Lịch tháng</a>`)}
        ${the("Mối quen", [["Chị Năm", "4,8★ · 6 đơn · phí mối quen 0%"], ["Anh Sáu", "4,9★ · 4 đơn"], ["HTX Tân Thuận", "4,7★ · 3 đơn"]].map(([a, b]) => dong(a, `<span class="sl-ghi">${b}</span>`)).join(""), `<a href="${url("moi-quen")}">Mở</a>`)}
      </div>
    </div>`; } },

  // Nguồn hàng
  "nguon-hang": { tieuDe: "Nguồn hàng", phu: "Lô đang bán · cập nhật lượng còn mỗi ngày", phai: () => timO("Xoài, tôm, Đồng Tháp…"), ve: (s, { url }) => `
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">${loc(["Tất cả", "Trái cây", "Thủy sản", "Rau củ", "Hạt, cà phê"])}<span style="margin-left:auto" class="sl-an-dt">${loc(["Gần kho trước", "Hái sớm trước", "Uy tín cao trước"])}</span></div>
    <div class="sl-luoi sl-l3">${LO.map((l) => theLo(l, url)).join("")}</div>
    <p class="sl-ghi">Giá là giá tại vườn người bán chào. So báo giá sẽ quy về giá tại kho của bạn (cộng xe, hao hụt).</p>`, sau: (g) => ganLoc(g) },
  "goi-y": { tieuDe: "Gợi ý khớp nhu cầu", thuoc: "nguon-hang", lui: "nguon-hang", phu: "Xếp theo mức khớp với phiếu PN-0042", ve: (s, { url }) => `
    ${the("PN-0042 · Xoài cát Chu loại 1 · 2.000 kg · 27–29/10 · trần 24.000 đ/kg", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Lô</th><th>Người bán</th><th class="sl-so">Giá vườn</th><th class="sl-so">Còn</th><th>Vì sao khớp</th><th></th></tr></thead><tbody>
      <tr><td><a href="${url("chi-tiet-lo", "&lo=L-0412")}">L-0412</a></td><td>Chị Năm · 4,8★</td><td class="sl-so">23.000 đ</td><td class="sl-so">3.500 kg</td><td>Đúng giống, loại 1, hái 27/10, cách kho 180 km, đã kiểm tại vườn</td><td><span class="sl-nhan sl-n-xong">Khớp cao</span></td></tr>
      <tr><td>L-0445</td><td>HTX Tân Thuận · 4,7★</td><td class="sl-so">22.800 đ</td><td class="sl-so">2.400 kg</td><td>Đúng giống, xa kho 230 km, chưa có mẫu kiểm</td><td><span class="sl-nhan sl-n-tien">Khớp vừa</span></td></tr>
      <tr><td><a href="${url("chi-tiet-lo", "&lo=L-0431")}">L-0431</a></td><td>Anh Tư Hòa · 4,6★</td><td class="sl-so">31.500 đ</td><td class="sl-so">1.800 kg</td><td>Khác giống (Hòa Lộc), vượt giá trần</td><td><span class="sl-nhan">Khớp thấp</span></td></tr>
    </tbody></table></div>`)}
    ${bao("Gợi ý chỉ để tham khảo. AgiViet không xếp theo \"rẻ nhất\"; giá của hộ này không bao giờ đưa cho hộ khác.", "sl-bao-nh")}` },
  "chi-tiet-lo": { tieuDe: (s) => lo(new URLSearchParams(location.search).get("lo")).ten, thuoc: "nguon-hang", lui: "nguon-hang", phu: () => { const l = lo(new URLSearchParams(location.search).get("lo")); return `${l.ma} · ${l.nguoi} · ${l.noi}`; }, ve: (s, { url, q }) => { const l = lo(q.get("lo")); return `
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        <div class="sl-luoi sl-l3">${[1, 2, 3].map((i) => `<div class="sl-lo-anh sl-anh-${l.anh}" style="border-radius:12px;filter:brightness(${1 - i * 0.06})"></div>`).join("")}</div>
        ${the("Hàng", dong("Lượng còn bán", kg(l.con)) + dong("Giá chào tại vườn", `${so(l.gia)} đ/kg`) + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Ngày hái", l.hai) + dong("Quy cách", "Trái 350–550 g, không dập, cuống 1 cm") + dong("Đóng gói", "Sọt nhựa 20 kg của người bán"))}
        ${the("Hồ sơ nguồn gốc", dong("Vườn", "1,2 ha · mã vùng trồng VN-DT-0412") + dong("Lần phun gần nhất", "12/10 · hết cách ly 22/10") + dong("Ảnh chụp trong app", "8 ảnh · có giờ và vị trí") + dong("Nhãn", l.kiem ? `<span class="sl-nhan sl-n-xong">Đã kiểm tại vườn 20/10</span>` : `<span class="sl-nhan">Người bán tự khai</span>`), `<a href="${url("truy-xuat")}">Nhật ký</a>`)}
      </div>
      <div style="display:grid;gap:16px;position:sticky;top:80px">
        <section class="sl-the" style="display:grid;gap:12px"><div class="sl-chiso"><small>Giá chào</small><b>${so(l.gia)} đ/kg</b><span>còn ${kg(l.con)}</span></div>
          <button class="sl-nut sl-vang" type="button">Chào giá</button><a class="sl-nut sl-vien" href="${url("tin-nhan")}">Hỏi giá qua tin nhắn</a><a class="sl-nut sl-vien" href="${url("hen-xem-vuon")}">Hẹn xem vườn</a>
          <p class="sl-ghi">Giá bạn chào chỉ người bán này thấy. Chào tối đa 4 tấn đang mở cùng lúc.</p></section>
        <a class="sl-the" href="${url("ho-so-ban")}" style="text-decoration:none;display:flex;gap:12px;align-items:center"><span class="sl-anh" style="width:40px;height:40px;border-radius:50%;background:var(--la-nhat);display:grid;place-items:center;font-weight:700;color:var(--la)">N</span><div><b>${esc(l.nguoi)}</b><div class="sl-ghi">${sao(l.uy)} · ${l.don} đơn · giao đủ 97%</div></div></a>
      </div>
    </div>`; } },
  "ho-so-ban": { tieuDe: "Chị Năm (Nguyễn Thị Năm)", thuoc: "nguon-hang", lui: "chi-tiet-lo", phu: "Mỹ Xương, Cao Lãnh, Đồng Tháp · bán từ 2026", ve: (s, { url }) => `
    <div class="sl-luoi sl-l4">
      <div class="sl-the sl-chiso sl-tien"><small>Uy tín</small><b>4,8★</b><span>31 đơn đã xong</span></div>
      <div class="sl-the sl-chiso"><small>Giao đủ lượng</small><b>97%</b></div>
      <div class="sl-the sl-chiso"><small>Đúng loại</small><b>94%</b></div>
      <div class="sl-the sl-chiso"><small>Đúng hẹn</small><b>100%</b></div>
    </div>
    <div class="sl-luoi sl-l2">
      ${the("Đã xác minh", dong("Danh tính", `<span class="sl-nhan sl-n-xong">Căn cước · 14/09</span>`) + dong("Tài khoản nhận tiền", `Agribank •••• 2186 · đúng tên`) + dong("Vườn", `<span class="sl-nhan sl-n-xong">Nhân viên tới vườn 20/10</span>`) + dong("Số điện thoại", `<span class="sl-ghi">Hiện sau khi ngân hàng xác nhận cọc</span>`))}
      ${the("Nhật ký tóm tắt", ["Tháng 10: tỉa cành, bón kali, phun 1 lần (12/10)", "Tháng 9: bao trái 3.200 trái", "Tháng 8: ra hoa đợt 2"].map((x) => `<p style="padding:8px 0;border-bottom:1px solid var(--ke)">${esc(x)}</p>`).join(""))}
    </div>
    ${the("Nhận xét của bên mua", [["Nhà máy Đồng Xanh", "Hàng đều, cân đúng, bốc đúng giờ.", 5], ["Vựa Ba Cường", "Có 2% dập, chị chủ động báo trước.", 4]].map(([a, b, c]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, sao(c))).join(""))}` },

  // Nhu cầu
  "nhu-cau": { tieuDe: "Nhu cầu mua", phu: "Phiếu bạn đăng cho người bán thấy", phai: (s) => `<a class="sl-nut sl-vang" href="?man=tao-nhu-cau">${icon("them")}Tạo phiếu nhu cầu</a>`, ve: (s, { url }) => the("Phiếu của bạn", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Phiếu</th><th>Mặt hàng</th><th class="sl-so">Lượng</th><th>Ngày nhận</th><th class="sl-so">Giá trần</th><th class="sl-so">Báo giá</th><th>Trạng thái</th></tr></thead><tbody>
    ${NHU_CAU.map((n) => `<tr><td><a href="${url("chi-tiet-nhu-cau")}">${n.ma}</a></td><td>${esc(n.hang)}</td><td class="sl-so">${kg(n.luong)}</td><td>${n.khoang}</td><td class="sl-so">${so(n.tran)} đ</td><td class="sl-so">${n.bao}</td><td>${n.trang.startsWith("Đã") ? `<span class="sl-nhan sl-n-xong">${esc(n.trang)}</span>` : `<span class="sl-nhan sl-n-tien">${esc(n.trang)}</span>`}</td></tr>`).join("")}
    </tbody></table></div>`) },
  "tao-nhu-cau": { tieuDe: "Tạo phiếu nhu cầu", thuoc: "nhu-cau", lui: "nhu-cau", ve: (s, { url }) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Nói hoặc dán yêu cầu, AI điền giúp</span><textarea>Cần 2 tấn xoài cát Chu loại 1, nhận 27 tới 29/10 tại kho Sa Đéc, giá không quá 24 ngàn</textarea><small>AI đã điền các ô bên dưới. Bạn kiểm lại trước khi đăng.</small></label>
        <div class="sl-luoi sl-l2">
          <label class="sl-o"><span>Mặt hàng</span><input value="Xoài cát Chu"></label>
          <label class="sl-o"><span>Loại</span><select><option>Loại 1</option><option>Loại 1 và 2</option><option>Mọi loại</option></select></label>
          <label class="sl-o"><span>Lượng (kg)</span><input value="2.000" inputmode="numeric"></label>
          <label class="sl-o"><span>Giá trần (đ/kg)</span><input value="24.000" inputmode="numeric"><small>Người bán không thấy giá trần.</small></label>
          <label class="sl-o"><span>Nhận từ ngày</span><input type="date" value="2026-10-27"></label>
          <label class="sl-o"><span>Đến ngày</span><input type="date" value="2026-10-29"></label>
        </div>
        <label class="sl-o"><span>Nơi nhận</span><select><option>Kho Đồng Xanh · KCN Sa Đéc (mặc định)</option><option>Nhận tại vườn, tôi lo xe</option></select></label>
        <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("nhu-cau")}">Lưu nháp</a><a class="sl-nut sl-vang" href="${url("chi-tiet-nhu-cau")}">Đăng phiếu nhu cầu</a></div>
      </section>
      ${the("Thị trường tuần này", dong("Giá vườn xoài cát Chu", "21.500–24.000 đ") + dong("Lô đang bán khớp", "3 lô · 7.700 kg") + `<p class="sl-ghi" style="margin-top:8px">Tham khảo từ các lô đang bán trên AgiViet, không phải giá thị trường chính thức.</p>`)}
    </div>` },
  "chi-tiet-nhu-cau": { tieuDe: "PN-0042 · Xoài cát Chu loại 1", thuoc: "nhu-cau", lui: "nhu-cau", phu: "2.000 kg · nhận 27–29/10 · trần 24.000 đ/kg", phai: () => `<a class="sl-nut sl-vang" href="?man=so-bao-gia">So 3 báo giá</a>`, ve: (s, { url }) => `
    ${the("Báo giá nhận được", veBangChao(s, url, false))}
    ${the("Lô gợi ý chưa báo giá", `<div class="sl-luoi sl-l3">${LO.filter((l) => l.anh === "xoai").map((l) => theLo(l, url)).join("")}</div>`)}` },

  // Báo giá
  "bao-gia": { tieuDe: "Báo giá", phu: "Báo giá người bán gửi theo phiếu của bạn, và lời chào bạn gửi", ve: (s, { url }) => `
    ${loc(["Nhận được (4)", "Bạn đã chào (2)", "Đã đóng"])}
    ${the("PN-0042 · Xoài cát Chu · 3 báo giá", veBangChao(s, url, false), `<a href="${url("so-bao-gia")}">So</a>`)}
    ${the("PN-0045 · Thanh long ruột đỏ · 1 báo giá", `<div class="sl-bang-boc"><table class="sl-bang"><tbody><tr><td>HTX Tân Thuận</td><td class="sl-so">14.200 đ/kg</td><td>5.000 kg · giao tận kho 02/11</td><td><span class="sl-nhan sl-n-ban">Hết hạn sau 12 giờ</span></td></tr></tbody></table></div>`)}`, sau: ganLoc },
  "so-bao-gia": { tieuDe: "So báo giá · PN-0042", thuoc: "bao-gia", lui: "chi-tiet-nhu-cau", phu: "Quy về giá tại kho Đồng Xanh (cộng xe ước tính)", ve: (s, { url }) => `
    ${s.chao.chon ? bao(`Đã chọn chị Năm. Sinh ra <b>HĐ-0018</b> (bản nháp thỏa thuận). Hàng được giữ 24 giờ.`) : ""}
    ${the("Bảng so", veBangChao(s, url, true))}
    <div class="sl-luoi sl-l2">${bao("Không xếp theo \"rẻ nhất\". Xem thêm uy tín, ngày giao, ai lo xe. Giá hộ này không đưa sang hộ khác.", "sl-bao-nh")}${bao(`Bạn đã rút lời chào ${s.chao.rut}/2 lần cho phiếu này. Tổng lượng chào đang mở: 2.000 / 4.000 kg.`, "sl-bao-tien")}</div>`, sau: (g, k, { url }) => g.querySelectorAll("[data-chon]").forEach((b) => b.addEventListener("click", () => doi((s) => { s.chao.chon = b.dataset.chon; if (s.hd.buoc === 0) s.hd.buoc = 1; }))) },
  "gui-bao-gia": { tieuDe: "Chào giá", thuoc: "bao-gia", lui: "chi-tiet-lo", phu: "L-0412 · Xoài cát Chu loại 1 · chị Năm", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2">
        <label class="sl-o"><span>Giá loại 1 (đ/kg)</span><input value="23.000"></label>
        <label class="sl-o"><span>Giá hạ cấp (đ/kg)</span><input value="15.000"></label>
        <label class="sl-o"><span>Lượng (kg)</span><input value="2.000"><small>Còn chào được 2.000 kg trong mức 4 tấn đang mở.</small></label>
        <label class="sl-o"><span>Lời chào hết hạn sau</span><select><option>24 giờ</option><option>12 giờ</option><option>6 giờ</option></select></label>
      </div>
      <label class="sl-o"><span>Giao nhận</span><select><option>Tại vườn · tôi lo xe</option><option>Người bán giao tận kho</option></select></label>
      <label class="sl-o"><span>Cách trả phần còn lại</span><select><option>Trả thẳng trước khi bốc</option><option>Kiểm rồi mới trả (đạt khi kiểm tại vườn)</option><option>Trả khi nhận tại kho</option></select></label>
      ${dong("Cọc qua app (30%)", d(COC)) + dong("Phí giới thiệu 0,3%", d(PHI)) + dong("Trả thẳng người bán", d(TRA_THANG), "sl-tong")}
      <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("chi-tiet-lo")}">Hủy</a><a class="sl-nut sl-vang" href="${url("so-bao-gia")}">Chào giá</a></div>
    </section>` },

  // Tin nhắn
  "tin-nhan": { tieuDe: "Tin nhắn", ve: (s, { url }) => `
    <div class="sl-hai-cot" style="grid-template-columns:300px minmax(0,1fr)">
      <section class="sl-the" style="padding:8px">${[["Chị Năm", "HĐ-0018 · Dạ 5 giờ 30 xe vô được ạ", "08:12", true], ["HTX Tân Thuận", "PN-0045 · Gửi chị báo giá thanh long", "Hôm qua"], ["Anh Huỳnh Bảy", "HĐ-0024 · Em xin dời qua thứ 4", "Hôm qua"]].map(([a, b, c, m]) => `<a href="#" style="display:flex;gap:10px;padding:10px;border-radius:10px;text-decoration:none;${m ? "background:var(--giay-lot)" : ""}"><span style="width:36px;height:36px;border-radius:50%;background:var(--la-nhat);color:var(--la);display:grid;place-items:center;font-weight:700;flex:none">${a[a.length - 1] === "m" ? "N" : a[0]}</span><span style="min-width:0;flex:1"><b style="display:flex;justify-content:space-between">${a}<small class="sl-ghi">${c}</small></b><span class="sl-ghi" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b}</span></span></a>`).join("")}</section>
      <section class="sl-the" style="display:grid;gap:12px;align-content:start">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--ke);padding-bottom:12px"><b>Chị Năm · HĐ-0018</b><span style="margin-left:auto" class="sl-hang-nut"><button class="sl-nut sl-vien" type="button">${icon("dien")}Gọi qua app</button><a class="sl-nut sl-nhe" href="${url("hen-xem-vuon")}">Hẹn xem vườn</a></span></div>
        <div style="display:grid;gap:8px">
          <p style="justify-self:start;max-width:75%;background:var(--giay-lot);padding:10px 12px;border-radius:12px 12px 12px 4px">Chị ơi xe vô tới vườn được không, đường đất có mưa không?</p>
          <p style="justify-self:end;max-width:75%;background:var(--la);color:var(--tren-la);padding:10px 12px;border-radius:12px 12px 4px 12px">Xe 66C-123.45 anh Lộc, 5 giờ 30 tới nha chị.</p>
          <p style="justify-self:start;max-width:75%;background:var(--giay-lot);padding:10px 12px;border-radius:12px 12px 12px 4px">Dạ 5 giờ 30 xe vô được ạ</p>
          ${bao("Một tin nhắn có dãy số giống số điện thoại đã được che. Liên lạc ngoài app chỉ mở sau khi ngân hàng xác nhận cọc.", "sl-bao-nh")}
        </div>
        <label class="sl-tim" style="min-height:44px">${icon("tin")}<input placeholder="Nhắn cho chị Năm" aria-label="Nhắn tin"></label>
      </section>
    </div>` },
  "hen-xem-vuon": { tieuDe: "Hẹn xem vườn", thuoc: "tin-nhan", lui: "tin-nhan", phu: "Chị Năm · L-0412", ve: () => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Ngày giờ đề nghị</span><input type="datetime-local" value="2026-10-26T08:00"></label>
        <label class="sl-o"><span>Ngày giờ dự phòng</span><input type="datetime-local" value="2026-10-26T14:00"></label>
        <div class="sl-the sl-the-lot">${dong("Địa chỉ", "Ấp 3, Mỹ Xương, Cao Lãnh")}<p class="sl-ghi">Địa chỉ chi tiết hiện khi chị Năm nhận lời hẹn.</p></div>
        <button class="sl-nut sl-vang" type="button">Gửi lời hẹn</button>
      </section>
      ${the("Các lần hẹn", dong("26/10 · 8:00", `<span class="sl-nhan">Chờ chị Năm trả lời</span>`) + dong("19/10 · 9:30", `<span class="sl-nhan sl-n-xong">Đã xem vườn</span>`))}
    </div>` },

  // Đơn
  "don-hang": { tieuDe: "Đơn và lịch nhận", phu: "Xếp theo tới lượt ai và hạn", phai: () => `<a class="sl-nut sl-vien sl-an-dt" href="?man=lich-nhan">${icon("lich")}Lịch tháng</a>`, ve: (s, { url }) => {
    const h = s.hd, luot = hdLuot(h);
    const ds = [{ ma: "HĐ-0018", hang: "Xoài cát Chu · 2.000 kg", nguoi: "Chị Năm", buoc: luot === "xong" ? "Hoàn tất" : hdChan(h) || BUOC[h.buoc].lam, luot, han: luot === "xong" ? "" : BUOC[h.buoc]?.han || "hôm nay", tien: 46000000 }, ...DON_KHAC];
    const nhom = [["Tới lượt bạn", (x) => x.luot === "ban"], ["Đang chờ bên kia", (x) => ["nb", "nh", "vh"].includes(x.luot)], ["Hoàn tất", (x) => x.luot === "xong"]];
    return `${loc(["Tất cả", "Tới lượt bạn", "Có tranh chấp", "Còn công nợ"])}${nhom.map(([t, f]) => { const r = ds.filter(f); return r.length ? the(`${t} (${r.length})`, `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Người bán</th><th>Bước hiện tại</th><th>Hạn</th><th class="sl-so">Giá trị</th><th></th></tr></thead><tbody>${r.map((x) => `<tr><td><a href="${url("chi-tiet-don")}">${x.ma}</a><div class="sl-ghi">${esc(x.hang)}</div></td><td>${esc(x.nguoi)}</td><td>${esc(x.buoc)}</td><td>${esc(x.han)}</td><td class="sl-so">${d(x.tien)}</td><td>${nhanLuot(x.luot)}</td></tr>`).join("")}</tbody></table></div>`) : ""; }).join("")}`; }, sau: ganLoc },
  "chi-tiet-don": { tieuDe: "HĐ-0018 · Xoài cát Chu loại 1", thuoc: "don-hang", lui: "don-hang", phu: "2.000 kg · chị Năm · Mỹ Xương, Cao Lãnh · giao tại vườn, bạn lo xe", phai: (s) => nhanLuot(hdLuot(s.hd)), ve: (s, { url }) => {
    const h = s.hd;
    return `
    ${veViec(h, url)}
    ${veTienO(h)}
    <div class="sl-luoi sl-chinh-phu">
      ${the("Dòng bước của đơn", veBuoc(h), `<span class="sl-phai sl-ghi">${Math.min(h.buoc, 15)}/15 bước</span>`)}
      <div style="display:grid;gap:16px">
        ${the("Thỏa thuận (bản 1)", dong("Giá loại 1", "23.000 đ/kg") + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Cọc qua app", d(COC)) + dong("Phí 0,3%", d(PHI)) + dong("Trả thẳng trước bốc", d(TRA_THANG)) + dong("Tài khoản người bán", "Agribank •••• 2186"), `<a href="${url("thoa-thuan")}">Xem</a>`)}
        ${the("Giao nhận", dong("Xe", "66C-123.45 · anh Lộc") + dong("Mã nhận hàng", `<span class="sl-so">482 917</span>`) + dong("Mẫu đối chứng", "M-2291 niêm phong") + dong("Nghiệm thu", "Kho Đồng Xanh · 2 giờ"))}
        ${the("Liên lạc", h.buoc >= 5 ? dong("Chị Năm", `<span class="sl-so">0918 234 421</span>`) + `<a class="sl-nut sl-vien" style="width:100%;margin-top:8px" href="${url("mo-lien-lac")}">${icon("dien")}Gọi chị Năm</a>` : `<p class="sl-ghi">Số điện thoại che tới khi ngân hàng xác nhận cọc. Trước đó nhắn hoặc gọi qua app.</p>`)}
        ${the("Kịch bản thử", `<label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" id="kb-thieu" ${h.traThieu ? "checked" : ""} ${h.buoc > 5 ? "disabled" : ""}> Trả thiếu rồi bổ sung (20.000.000 đ trước)</label><div class="sl-hang-nut" style="margin-top:8px"><button class="sl-nut sl-nhe" type="button" id="kb-lai">Chạy lại từ đầu</button><a class="sl-nut sl-huy" href="${url("huy-don")}">Xin hủy</a></div>`)}
      </div>
    </div>`; }, sau: (g, k) => { ganNutDon(g); g.querySelector("#kb-thieu")?.addEventListener("change", (e) => doi((s) => { s.hd.traThieu = e.target.checked; })); g.querySelector("#kb-lai")?.addEventListener("click", () => doi((s) => { s.hd = structuredClone(DAU.hd); s.chao.chon = null; })); } },
  "thoa-thuan": { tieuDe: "Lập thỏa thuận · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", phu: "Bản 1 · điền sẵn theo phân khúc Chế biến", ve: (s, { url }) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Loại hợp đồng</span><select><option>Mua giao ngay</option><option>Hợp đồng khung theo tuần</option><option>Đặt trước khi hái</option><option>Bao tiêu cả vụ</option></select></label>
        <div class="sl-luoi sl-l2">
          <label class="sl-o"><span>Lượng</span><input value="2.000 kg (±5%)"></label><label class="sl-o"><span>Ngày giao</span><input value="28/10 · 5:30 tại vườn"></label>
          <label class="sl-o"><span>Giá loại 1</span><input value="23.000 đ/kg"></label><label class="sl-o"><span>Giá hạ cấp</span><input value="15.000 đ/kg"></label>
        </div>
        <label class="sl-o"><span>Trả phần còn lại</span><select><option>Trả thẳng 32.200.000 đ trước 5:30 ngày 28/10, trước khi bốc</option><option>Kiểm rồi mới trả</option><option>Trả khi nhận tại kho</option></select></label>
        <label class="sl-o"><span>Mất mùa, thiên tai</span><select><option>Hoàn cọc, không phạt bên nào (cần ảnh, biên bản xã)</option></select></label>
        <label class="sl-o"><span>Nghiệm thu</span><input value="Tại kho Đồng Xanh · 2 giờ từ lúc ký nhận · trả lại quá 5% phải có ảnh"></label>
        ${bao("Trước khi ký: bạn đang chịu rủi ro <b>32.200.000 đ</b> cho phần trả trước khi bốc. Cọc 13.800.000 đ do ngân hàng giữ.", "sl-bao-tien")}
        <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("chi-tiet-don")}">Lưu nháp</a><a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Ký và gửi</a></div>
      </section>
      ${the("Tiền theo thỏa thuận", dong("Giá trị hàng", "46.000.000 đ") + dong("Cọc 30% qua app", d(COC)) + dong("Phí giới thiệu 0,3%", d(PHI)) + dong("Chuyển qua app", d(TONG_CHUYEN_COC), "sl-tong") + dong("Trả thẳng người bán", d(TRA_THANG)) + `<p class="sl-ghi" style="margin-top:8px">Phí lưu vào hợp đồng lúc ký, không đổi khi bạn đổi gói.</p>`)}
    </div>` },
  "dat-coc": { tieuDe: "Đặt cọc · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        ${dong("Cọc 30%", d(COC)) + dong("Phí giới thiệu (đơn đầu với chị Năm) 0,3%", d(PHI)) + dong("Tổng chuyển", d(TONG_CHUYEN_COC), "sl-tong")}
        <div class="sl-the sl-the-lot" style="display:flex;gap:16px;align-items:center"><div class="sl-qr" role="img" aria-label="Mã QR chuyển khoản"></div><div style="display:grid;gap:4px"><span class="sl-ghi">Tài khoản đảm bảo tại ngân hàng đối tác</span><b class="sl-so">VietinBank 1140 0018 0018</b><span class="sl-ghi">Nội dung</span><b class="sl-so">AGV HD0018 COC</b></div></div>
        <p class="sl-ghi">Hạn: 48 giờ sau khi chị Năm ký. Đơn sau với mối quen: phí mối quen 0% theo gói Thu mua.</p>
        <a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Tôi đã chuyển cọc</a>
      </section>
      ${the("Cọc này đi đâu", `<ol class="sl-buoc">${["Ngân hàng giữ, không ai rút được", "Nghiệm thu chốt + trả thẳng đã xác nhận + không tranh chấp", "Ngân hàng chuyển phần (giá trị nghiệm thu − đã trả thẳng) cho người bán, hoàn phần dư cho bạn"].map((x, i) => `<li class="sl-b-cho"><span class="sl-b-vong">${i + 1}</span><div><b>${x}</b></div></li>`).join("")}</ol>`)}
    </div>` },
  "mo-lien-lac": { tieuDe: "Đã mở liên lạc · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: () => `
    ${bao("Ngân hàng đã xác nhận cọc 13.800.000 đ. Đơn trên 3 triệu nên hiện số thật.")}
    <div class="sl-luoi sl-l2" style="max-width:960px">${the("Người bán", dong("Người liên hệ", "Nguyễn Thị Năm") + dong("Số điện thoại", `<span class="sl-so">0918 234 421</span>`) + dong("Địa chỉ vườn", "Ấp 3, xã Mỹ Xương, Cao Lãnh, Đồng Tháp") + `<div class="sl-hang-nut" style="margin-top:12px"><a class="sl-nut sl-vang" href="tel:0918234421">${icon("dien")}Gọi</a><button class="sl-nut sl-vien" type="button">Chỉ đường</button></div>`)}
    ${the("Gửi cho tài xế", dong("Xe", "66C-123.45 · anh Lộc") + dong("Mã nhận hàng", `<b class="sl-so" style="font-size:var(--c5)">482 917</b>`) + `<p class="sl-ghi">Tài xế đọc mã cho chị Năm quét khi tới vườn. Không đưa mã cho ai khác.</p>`)}</div>` },
  "nghiem-thu": { tieuDe: "Nhập kết quả cân · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", phu: "Kho ký nhận 9:40 · còn 1 giờ 25 phút để gửi", ve: (s, { url }) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <div class="sl-hang-nut"><button class="sl-nut sl-nhe" type="button">Nhận đủ, đúng thỏa thuận</button><button class="sl-nut sl-vien" type="button" aria-pressed="true">Có chênh lệch</button></div>
        <div class="sl-luoi sl-l3">
          <label class="sl-o"><span>Đạt loại 1 (kg)</span><input value="1.850"></label>
          <label class="sl-o"><span>Hạ cấp (kg)</span><input value="120"></label>
          <label class="sl-o"><span>Trả lại (kg)</span><input value="30"><small>Trên 5% phải có ảnh</small></label>
        </div>
        <label class="sl-o"><span>Lý do hạ cấp</span><input value="Trái dưới 350 g, dập nhẹ"></label>
        <div class="sl-the sl-the-lot" style="display:flex;gap:12px;align-items:center">${icon("phieu")}<div style="flex:1"><b>Ảnh phiếu cân và hàng</b><div class="sl-ghi">2 ảnh · 9:52</div></div><a class="sl-nut sl-vien" href="${url("doc-phieu-can")}">Đọc phiếu cân</a></div>
        <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vien" type="button">Chưa kiểm được (gia hạn 1 lần)</button><a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Gửi kết quả</a></div>
      </section>
      ${the("Thành tiền", dong("1.850 kg × 23.000", d(42550000)) + dong("120 kg × 15.000", d(1800000)) + dong("30 kg trả lại", "0 đ") + dong("Giá trị nghiệm thu", d(NGHIEM_THU), "sl-tong") + dong("Đã trả thẳng", d(TRA_THANG)) + dong("Cọc chuyển chị Năm", d(COC_CHO_NB)) + dong("Cọc hoàn bạn", d(HOAN)) + `<p class="sl-ghi" style="margin-top:8px">Tổng 2.000 kg khớp cân xe. Chị Năm có 24 giờ để đồng ý hoặc phản đối từng dòng.</p>`)}
    </div>` },
  "doc-phieu-can": { tieuDe: "Đọc phiếu cân", thuoc: "don-hang", lui: "nghiem-thu", ve: () => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <div class="sl-lo-anh" style="border-radius:14px;aspect-ratio:3/4;background:repeating-linear-gradient(0deg,#fbf8f1 0 26px,#e8e1cf 26px 27px)"><span class="sl-nhan sl-n-xong">AI đã đọc</span></div>
      ${the("AI đọc được", dong("Số phiếu", "PC-102841") + dong("Biển số", "66C-123.45") + dong("Cân lần 1 (có hàng)", "9.420 kg") + dong("Cân lần 2 (xe không)", "7.420 kg") + dong("Hàng", "2.000 kg", "sl-tong") + `<div style="margin-top:12px">${bao("Khớp đơn 2.000 kg (trong ±5%).")}</div><p class="sl-ghi" style="margin-top:8px">Sửa nếu AI đọc sai, rồi dùng số này cho nghiệm thu.</p>`)}
    </div>` },
  "doi-soat": { tieuDe: "Đối soát · HĐ-0012", thuoc: "don-hang", lui: "don-hang", phu: "Lệch tiền, không phải vi phạm", ve: () => `
    ${bao("Bạn báo đã trả 32.200.000 đ, chị Mười chỉ thấy 20.000.000 đ. Người vận hành đang kiểm, hạn còn 1 ngày.", "sl-bao-tien")}
    <div class="sl-luoi sl-l2">${the("Phần đang lệch", dong("Bạn báo đã trả", d(32200000)) + dong("Người bán xác nhận", d(20000000)) + dong("Lệch", d(12200000), "sl-tong") + `<div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Gửi chứng từ</button></div>`)}
    ${the("Đã thống nhất (đã chốt)", dong("Nghiệm thu 1.500 kg", `<span class="sl-nhan sl-n-xong">Đã chốt</span>`) + dong("Phần không tranh chấp", d(20000000)) + `<p class="sl-ghi" style="margin-top:8px">Phần không tranh chấp vẫn được xử lý bình thường.</p>`)}</div>
    ${the("Chứng từ", dong("Ủy nhiệm chi 26/10 · 20.000.000 đ", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Ủy nhiệm chi 26/10 · 12.200.000 đ", `<span class="sl-nhan sl-n-nh">Người vận hành đang kiểm</span>`))}` },
  "lich-nhan": { tieuDe: "Lịch nhận và trả tiền", thuoc: "don-hang", lui: "don-hang", phu: "Tháng 10/2026", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Xuất Excel</button>`, ve: () => {
    const su = { 24: [["i", "HĐ-0015 bưởi"]], 26: [["t", "Cọc HĐ-0018"]], 27: [["t", "Trả thẳng 32,2 tr"]], 28: [["i", "HĐ-0018 xoài"]], 29: [["i", "HĐ-0024 sầu riêng"]], 31: [["i", "HĐ-0021 thanh long"], ["t", "Trả HĐ-0021"]] };
    const o = []; ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((t) => o.push(`<div class="sl-ten-thu">${t}</div>`));
    for (let i = 0; i < 2; i++) o.push(`<div class="sl-ngoai">${29 + i}</div>`);
    for (let n = 1; n <= 31; n++) o.push(`<div class="${n === 27 ? "sl-hom-nay" : ""}"><b>${n}</b>${(su[n] || []).map(([k, t]) => `<i class="${k === "t" ? "sl-i-tien" : ""}">${t}</i>`).join("")}</div>`);
    for (let i = 1; o.length % 7; i++) o.push(`<div class="sl-ngoai">${i}</div>`);
    return `<section class="sl-the"><div class="sl-lich">${o.join("")}</div><div class="sl-hang-nut" style="margin-top:12px"><span class="sl-nhan sl-n-xong">Nhận hàng</span><span class="sl-nhan sl-n-tien">Trả tiền</span></div></section>`; } },
  "huy-don": { tieuDe: "Xin hủy · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        <label class="sl-o"><span>Lý do</span><select><option>Nhà máy dừng dây chuyền</option><option>Thiên tai, mất mùa (cần chứng từ)</option><option>Lý do khác</option></select></label>
        <label class="sl-o"><span>Ghi thêm cho chị Năm</span><textarea>Dây chuyền sấy hỏng, chưa nhận được hàng tuần này.</textarea></label>
        <a class="sl-nut sl-huy" href="${url("chi-tiet-don")}">Gửi yêu cầu hủy</a>
        <p class="sl-ghi">Chị Năm có 24 giờ để trả lời. Im lặng là không đồng ý — đơn giữ nguyên.</p>
      </section>
      ${the("Nếu hủy sau cọc", dong("Hàng", "Về lại lô L-0412 của chị Năm") + dong("Cọc 13.800.000 đ", "Chuyển cho chị Năm") + dong("Phí 138.000 đ", "Không hoàn (đề xuất, chờ chốt)") + dong("Khoản trả thẳng", "Chưa có") + `<p class="sl-ghi" style="margin-top:8px">Đây là ảnh hưởng theo thỏa thuận bản 1, chưa xảy ra cho tới khi hai bên đồng ý.</p>`)}
    </div>` },

  // Tiền
  "vi-dam-bao": { tieuDe: "Tài khoản đảm bảo", phu: "Tiền do ngân hàng đối tác giữ theo từng đơn", ve: (s, { url }) => { const t = hdTien(s.hd); return `
    <div class="sl-luoi sl-l3">
      <div class="sl-the sl-chiso sl-tien"><small>Đang giữ</small><b>${d(t.nh + 12780000)}</b><span>cọc của 2 đơn</span></div>
      <div class="sl-the sl-chiso"><small>Đã chuyển cho người bán tháng này</small><b>${d((s.hd.buoc >= 13 ? COC_CHO_NB : 0) + 10080000)}</b></div>
      <div class="sl-the sl-chiso"><small>Hoàn về bạn tháng này</small><b>${d(s.hd.buoc >= 14 ? HOAN : 0)}</b><span>${s.hd.buoc === 13 ? "1.650.000 đ đã gửi lệnh, chờ về" : ""}</span></div>
    </div>
    ${the("Theo đơn", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Khoản</th><th class="sl-so">Số tiền</th><th>Trạng thái</th></tr></thead><tbody>
      <tr><td><a href="${url("chi-tiet-don")}">HĐ-0018</a></td><td>Cọc</td><td class="sl-so">${d(COC)}</td><td>${s.hd.buoc < 4 ? `<span class="sl-nhan">Chưa chuyển</span>` : s.hd.buoc === 4 ? `<span class="sl-nhan sl-n-nh">Đã chuyển · chờ ngân hàng xác nhận</span>` : s.hd.buoc < 13 ? `<span class="sl-nhan sl-n-tien">Ngân hàng đang giữ</span>` : `<span class="sl-nhan sl-n-xong">Đã xử lý</span>`}</td></tr>
      <tr><td>HĐ-0018</td><td>Phí giới thiệu</td><td class="sl-so">${d(PHI)}</td><td>${s.hd.buoc >= 4 ? `<span class="sl-nhan sl-n-xong">Đã trả · không hoàn</span>` : `<span class="sl-nhan">Chưa</span>`}</td></tr>
      <tr><td>HĐ-0018</td><td>Hoàn cọc dư</td><td class="sl-so">${d(HOAN)}</td><td>${s.hd.buoc < 13 ? `<span class="sl-nhan">Chưa tới bước</span>` : s.hd.buoc === 13 ? `<span class="sl-nhan sl-n-nh">Đã gửi lệnh · chưa về</span>` : `<span class="sl-nhan sl-n-xong">Đã về</span>`}</td></tr>
      <tr><td>HĐ-0021</td><td>Cọc</td><td class="sl-so">${d(12780000)}</td><td><span class="sl-nhan sl-n-nh">Đã chuyển · chờ ngân hàng xác nhận</span></td></tr>
    </tbody></table></div>`)}`; } },
  "cong-no": { tieuDe: "Công nợ", phu: "Theo người bán · chỉ tính khoản đã tới hạn hoặc đã chốt", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Xuất Excel</button>`, ve: (s) => `
    ${loc(["Theo người bán", "Theo đơn"])}
    ${the("Theo người bán", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th class="sl-so">Bạn còn phải trả</th><th class="sl-so">Người bán phải hoàn</th><th>Ghi chú</th></tr></thead><tbody>
      <tr><td>Chị Năm</td><td class="sl-so">${d(s.hd.nbXn >= TRA_THANG || s.hd.buoc < 5 ? 0 : TRA_THANG - s.hd.nbXn)}</td><td class="sl-so">0 đ</td><td>${s.hd.buoc < 5 ? "Chưa tới hạn trả thẳng" : s.hd.nbXn >= TRA_THANG ? "Đã đủ" : "Hạn 5:30 ngày 28/10"}</td></tr>
      <tr><td>Chị Mười</td><td class="sl-so">0 đ</td><td class="sl-so">0 đ</td><td><span class="sl-nhan sl-n-tien">Lệch 12.200.000 đ · đang đối soát</span></td></tr>
      <tr><td>Chị Bảy Hồng</td><td class="sl-so">0 đ</td><td class="sl-so">3.100.000 đ</td><td>Trả lại 700 kg · chị Bảy đã báo hoàn, bạn chưa xác nhận</td></tr>
    </tbody></table></div>`)}
    ${bao("\"Chưa nhận\" có ba trường hợp: chưa tới hạn (vẫn chờ) · lệch (cần đối soát) · quá hạn (mới là vi phạm).", "sl-bao-nh")}`, sau: ganLoc },
  "ghi-thanh-toan": { tieuDe: "Chuyển tiền đơn", phu: "Ghi khoản đã trả thẳng cho người bán", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        <label class="sl-o"><span>Đơn</span><select><option>HĐ-0018 · chị Năm · còn ${d(Math.max(0, TRA_THANG - s.hd.daTra))}</option></select></label>
        <label class="sl-o"><span>Số tiền đã chuyển</span><input value="${so(Math.max(0, TRA_THANG - s.hd.daTra))}"></label>
        <label class="sl-o"><span>Mã giao dịch ngân hàng</span><input placeholder="VD: FT2630012345"></label>
        <div class="sl-the sl-the-lot">${dong("Chỉ chuyển vào", "Agribank •••• 2186 · Nguyễn Thị Năm")}${dong("Nội dung", "HD0018")}</div>
        <a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Ghi đã trả</a>
        <p class="sl-ghi">Tiền chỉ tính là đã trả khi chị Năm xác nhận đúng số. Không có đường nào "coi như đã nhận".</p>
      </section>
      ${the("Các khoản đã ghi", s.hd.daTra ? dong(`HĐ-0018 · ${d(s.hd.daTra)}`, s.hd.nbXn >= s.hd.daTra ? `<span class="sl-nhan sl-n-xong">Người bán đã xác nhận</span>` : `<span class="sl-nhan">Chờ người bán xác nhận</span>`) : `<div class="sl-rong"><b>Chưa ghi khoản nào</b><span>Khoản bạn ghi sẽ hiện ở đây cùng trạng thái xác nhận.</span></div>`)}
    </div>` },

  // Kho
  "nhap-kho": { tieuDe: "Nhập kho", phu: "Từ đơn đã nghiệm thu", ve: (s) => `
    ${s.hd.buoc < 11 ? `<div class="sl-the"><div class="sl-rong"><b>Chưa có đơn chờ nhập</b><span>HĐ-0018 sẽ hiện ở đây sau khi bạn gửi kết quả nghiệm thu.</span></div></div>` : the("HĐ-0018 · Xoài cát Chu", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Loại</th><th class="sl-so">Lượng</th><th>Vị trí kho</th><th>Hạn dùng</th></tr></thead><tbody><tr><td>Loại 1</td><td class="sl-so">1.850 kg</td><td><select style="font:inherit;padding:6px;border-radius:8px;background:var(--giay-lot);border:1px solid var(--ke-dam)"><option>Kho mát A2</option></select></td><td>04/11</td></tr><tr><td>Hạ cấp</td><td class="sl-so">120 kg</td><td><select style="font:inherit;padding:6px;border-radius:8px;background:var(--giay-lot);border:1px solid var(--ke-dam)"><option>Kho chờ sấy B1</option></select></td><td>30/10</td></tr></tbody></table></div><div class="sl-hang-nut" style="justify-content:flex-end;margin-top:12px"><button class="sl-nut sl-vang" type="button">Nhập kho</button></div>`)}` },
  "ton-kho": { tieuDe: "Tồn kho", phu: "Cập nhật 27/10 · 8:00", ve: (s, { url }) => the("Theo mặt hàng", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Lô kho</th><th>Mặt hàng</th><th>Loại</th><th class="sl-so">Lượng</th><th>Ngày nhập</th><th>Hạn dùng</th><th></th></tr></thead><tbody>
    ${[["K-1027-01", "Xoài cát Chu", "Loại 1", 1850, "28/10", "04/11", ""], ["K-1022-03", "Bưởi da xanh", "Loại 1", 640, "22/10", "12/11", ""], ["K-1019-02", "Xoài cát Chu", "Hạ cấp", 85, "19/10", "29/10", "Sắp hết hạn"]].map((r) => `<tr><td><a href="${url("truy-xuat")}">${r[0]}</a></td><td>${r[1]}</td><td>${r[2]}</td><td class="sl-so">${kg(r[3])}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6] ? `<span class="sl-nhan sl-n-ban">${r[6]}</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`) },
  "truy-xuat": { tieuDe: "Truy xuất lô K-1027-01", thuoc: "ton-kho", lui: "ton-kho", ve: () => `
    <div class="sl-luoi sl-chinh-phu">
      ${the("Đường đi của lô", `<ol class="sl-buoc">${[["Lô kho K-1027-01", "1.850 kg xoài cát Chu loại 1 · kho mát A2"], ["Đơn HĐ-0018", "Nghiệm thu 28/10 · 9:40–10:55"], ["Người bán: chị Năm", "Đã xác minh · Mỹ Xương, Cao Lãnh"], ["Lô vườn L-0412", "Hái 27/10 · mẫu đối chứng M-2291"], ["Nhật ký vườn", "Phun 12/10, hết cách ly 22/10 · bón kali 05/10"]].map(([a, b]) => `<li class="sl-b-xong"><span class="sl-b-vong">${icon("tich")}</span><div><b>${a}</b><span class="sl-ghi">${b}</span></div></li>`).join("")}</ol>`)}
      <section class="sl-the" style="display:grid;gap:12px;justify-items:center;text-align:center"><div class="sl-qr" style="width:160px" role="img" aria-label="Mã QR truy xuất"></div><b>Mã truy xuất K-1027-01</b><span class="sl-ghi">Dán lên bao thành phẩm. Khách quét xem được vùng trồng và ngày hái, không thấy giá.</span><button class="sl-nut sl-vien" type="button">${icon("tai")}Tải mã QR</button></section>
    </div>` },

  // Nhà cung cấp
  "moi-quen": { tieuDe: "Mối quen", phu: "Người bán bạn đã mua · phí mối quen theo gói", ve: (s, { url }) => the("Danh sách mối", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th>Mặt hàng</th><th>Đơn gần nhất</th><th class="sl-so">Số đơn</th><th>Điểm</th><th>Phí mối quen</th></tr></thead><tbody>
    ${[["Chị Năm", "Xoài cát Chu", "HĐ-0018 · 28/10", 6, 4.8], ["Anh Sáu", "Bưởi da xanh", "HĐ-0015 · 22/10", 4, 4.9], ["HTX Tân Thuận", "Thanh long", "HĐ-0021 · 31/10", 3, 4.7], ["Chị Mười", "Xoài cát Chu", "HĐ-0012 · 19/10", 2, 4.2]].map((r) => `<tr><td><a href="${url("cham-diem")}">${r[0]}</a></td><td>${r[1]}</td><td>${r[2]}</td><td class="sl-so">${r[3]}</td><td>${sao(r[4])}</td><td>${s.goi === "bus" ? "0%" : "0,3%"}</td></tr>`).join("")}
  </tbody></table></div>`, `<a href="${url("nhap-excel")}">Nhập từ Excel</a>`) },
  "nhap-excel": { tieuDe: "Nhập mối quen từ Excel", thuoc: "moi-quen", lui: "moi-quen", ve: () => `
    <div class="sl-luoi sl-l2">
      <section class="sl-the" style="display:grid;gap:12px"><div class="sl-the sl-the-lot" style="text-align:center;padding:28px;border:1.5px dashed var(--ke-dam)"><b>nha-cung-cap-2026.xlsx</b><div class="sl-ghi">42 dòng · đã đọc</div></div>
        ${dong("Cột A → Tên người bán", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột B → Số điện thoại", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột C → Mặt hàng", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột D → Tỉnh", `<span class="sl-nhan sl-n-tien">Chọn cột</span>`)}</section>
      ${the("Xem trước", dong("Sẽ mời tham gia AgiViet", "31 người") + dong("Đã có trên AgiViet, thêm vào mối quen", "9 người") + dong("Thiếu số điện thoại, bỏ qua", "2 dòng") + `<div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Nhập 40 người</button></div><p class="sl-ghi" style="margin-top:8px">Người được mời nhận tin nhắn từ AgiViet, không thấy danh sách của bạn.</p>`)}
    </div>` },
  "cham-diem": { tieuDe: "Chấm điểm nhà cung cấp", thuoc: "moi-quen", lui: "moi-quen", phu: "Tính từ đơn trên AgiViet và đơn bạn ghi ngoài app", ve: () => the("6 tháng gần nhất", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th style="min-width:140px">Giao đủ</th><th style="min-width:140px">Đúng loại</th><th style="min-width:140px">Đúng hẹn</th><th class="sl-so">Đơn</th></tr></thead><tbody>
    ${[["Chị Năm", 97, 94, 100, 6], ["Anh Sáu", 100, 96, 100, 4], ["HTX Tân Thuận", 95, 90, 92, 3], ["Chị Mười", 88, 85, 80, 2]].map((r) => `<tr><td>${r[0]}</td>${[1, 2, 3].map((i) => `<td><div style="display:flex;gap:8px;align-items:center"><div class="sl-thanh" style="flex:1"><i style="width:${r[i]}%"></i></div><span class="sl-so">${r[i]}%</span></div></td>`).join("")}<td class="sl-so">${r[4]}</td></tr>`).join("")}
  </tbody></table></div>`) },
  "ghi-don-ngoai": { tieuDe: "Ghi đơn ngoài app", phu: "Để công nợ, kho và bảng kê thuế đủ dòng", ve: () => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2"><label class="sl-o"><span>Người bán</span><input value="Ông Tám (mua ở chợ đầu mối)"></label><label class="sl-o"><span>CCCD người bán (cho bảng kê)</span><input value="087•••••1234"></label>
      <label class="sl-o"><span>Mặt hàng</span><input value="Xoài cát Chu hạ cấp"></label><label class="sl-o"><span>Lượng (kg)</span><input value="400"></label>
      <label class="sl-o"><span>Đơn giá</span><input value="12.000 đ/kg"></label><label class="sl-o"><span>Ngày mua</span><input type="date" value="2026-10-25"></label></div>
      ${bao("Đơn ngoài app không có cọc ngân hàng giữ và không được AgiViet hỗ trợ tranh chấp.", "sl-bao-nh")}
      <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vang" type="button">Lưu đơn</button></div>
    </section>` },

  // Kế hoạch
  "ke-hoach": { tieuDe: "Kế hoạch mua", phu: "Nguyên liệu tháng 11/2026", ve: (s, { url }) => `
    <div class="sl-luoi sl-l3">
      <div class="sl-the sl-chiso"><small>Cần cả tháng</small><b>24 tấn</b><span>xoài, thanh long, bưởi</span></div>
      <div class="sl-the sl-chiso"><small>Đã có nguồn</small><b>15,8 tấn</b><span>66% · đơn và hợp đồng khung</span></div>
      <div class="sl-the sl-chiso sl-gap"><small>Dự báo thiếu</small><b>8,2 tấn</b><span>xoài cát Chu tuần 3–4</span></div>
    </div>
    ${the("Theo tuần", `<div class="sl-cot">${[[6, 6], [6, 5.2], [6, 2.8], [6, 1.8]].map(([c, co], i) => `<div><div style="display:flex;gap:4px;align-items:flex-end;height:100%;justify-content:center"><i style="height:${co / 6 * 100}%"></i><i class="sl-du-bao" style="height:100%"></i></div><small>Tuần ${i + 1}</small></div>`).join("")}</div><div class="sl-hang-nut" style="margin-top:12px"><span class="sl-nhan sl-n-xong">Đã có nguồn</span><span class="sl-nhan">Cần</span></div>`)}
    ${bao(`Thiếu 8,2 tấn xoài cát Chu tuần 3–4. <a href="${url("tao-nhu-cau")}" style="font-weight:700">Tạo phiếu nhu cầu</a> hoặc đặt trước khi hái với mối quen.`, "sl-bao-tien")}` },

  // Thuế và báo cáo
  "bang-ke": { tieuDe: "Bảng kê mua hàng nông sản", phu: "Mẫu 01/TNDN · tháng 10/2026 · tự lập từ đơn", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Tải Excel</button><button class="sl-nut sl-vang" type="button">${icon("tai")}Tải bảng kê PDF</button>`, ve: (s) => the("Bảng kê", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>STT</th><th>Ngày</th><th>Người bán</th><th>Địa chỉ</th><th>Hàng</th><th class="sl-so">Lượng</th><th class="sl-so">Đơn giá</th><th class="sl-so">Thành tiền</th></tr></thead><tbody>
    ${[["22/10", "Lê Văn Sáu", "Mỏ Cày Bắc, Bến Tre", "Bưởi da xanh", "1.200 kg", "28.000", 33600000], ["25/10", "Ông Tám (ngoài app)", "Cao Lãnh, Đồng Tháp", "Xoài hạ cấp", "400 kg", "12.000", 4800000], ...(s.hd.buoc >= 14 ? [["28/10", "Nguyễn Thị Năm", "Mỹ Xương, Cao Lãnh", "Xoài cát Chu", "1.970 kg", "23.000/15.000", NGHIEM_THU]] : [])].map((r, i) => `<tr><td>${i + 1}</td>${r.slice(0, 6).map((c, j) => `<td class="${j >= 4 ? "sl-so" : ""}">${c}</td>`).join("")}<td class="sl-so">${d(r[6])}</td></tr>`).join("")}
  </tbody></table></div>${s.hd.buoc < 14 ? `<p class="sl-ghi" style="margin-top:8px">HĐ-0018 sẽ vào bảng kê khi đơn hoàn tất.</p>` : ""}`) },
  "bao-cao": { tieuDe: "Báo cáo", phu: "Quý 4/2026", ve: () => `
    <div class="sl-luoi sl-l4">${[["Khối lượng mua", "38,4 tấn"], ["Chi cho hàng", "1,06 tỷ đ"], ["Giá bình quân xoài", "22.900 đ/kg"], ["Đơn đúng hẹn", "92%"]].map(([a, b]) => `<div class="sl-the sl-chiso"><small>${a}</small><b>${b}</b></div>`).join("")}</div>
    <div class="sl-luoi sl-l2">${the("Khối lượng theo mặt hàng (tấn)", `<div class="sl-cot">${[["Xoài", 18], ["Thanh long", 11], ["Bưởi", 6], ["Sầu riêng", 3.4]].map(([a, b]) => `<div><i style="height:${b / 18 * 100}%"></i><small>${a}</small></div>`).join("")}</div>`)}
    ${the("Theo vùng", dong("Đồng Tháp", "21,2 tấn") + dong("Tiền Giang", "11,4 tấn") + dong("Bến Tre", "5,8 tấn"))}</div>` },

  // Dịch vụ
  "dich-vu": { tieuDe: "Kiểm định, xe, kho", phu: "Đối tác dịch vụ của AgiViet", phai: () => `<a class="sl-nut sl-vang" href="?man=yeu-cau-dich-vu">${icon("them")}Yêu cầu dịch vụ</a>`, ve: () => `
    ${the("Yêu cầu đang có", dong("Kiểm dư lượng thuốc · HĐ-0021", `<span class="sl-nhan sl-n-nh">Phòng kiểm nghiệm nhận mẫu 30/10</span>`) + dong("Xe lạnh 5 tấn · 31/10", `<span class="sl-nhan sl-n-xong">Đã đặt</span>`))}
    <div class="sl-luoi sl-l3">${[["khien", "Kiểm định chất lượng", "Lấy mẫu tại vườn hoặc kho, kết quả 24–48 giờ"], ["xe", "Xe chở hàng", "Xe thường, xe lạnh, ghép chuyến"], ["kho", "Kho lạnh", "Gửi theo ngày gần vùng trồng"]].map(([i, a, b]) => `<section class="sl-the" style="display:grid;gap:8px">${icon(i).replace("<svg", '<svg style="width:28px;height:28px;stroke:var(--la);fill:none;stroke-width:1.8"')}<b>${a}</b><span class="sl-ghi">${b}</span></section>`).join("")}</div>` },
  "yeu-cau-dich-vu": { tieuDe: "Yêu cầu dịch vụ", thuoc: "dich-vu", lui: "dich-vu", ve: () => `
    <div class="sl-luoi sl-chinh-phu"><section class="sl-the" style="display:grid;gap:12px">
      <label class="sl-o"><span>Dịch vụ</span><select><option>Kiểm định trước khi bốc</option><option>Xe chở hàng</option><option>Kho lạnh</option></select></label>
      <label class="sl-o"><span>Cho đơn</span><select><option>HĐ-0018 · xoài · tại vườn Mỹ Xương</option></select></label>
      <label class="sl-o"><span>Ngày giờ</span><input type="datetime-local" value="2026-10-28T05:00"></label>
      <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vang" type="button">Đặt lịch</button></div></section>
      ${the("Báo giá đối tác", dong("Trung tâm kiểm định Cần Thơ", "850.000 đ · 24 giờ") + dong("Vinacontrol Đồng Tháp", "1.100.000 đ · 12 giờ"))}</div>` },

  // Tổ chức
  "thanh-vien": { tieuDe: "Thành viên và phân quyền", phu: "Gói Miễn phí: 1 người dùng", ve: (s, { url }) => `
    ${the("Người dùng", dong(`<b style="color:var(--muc)">Lê Thu Hà</b><div class="sl-ghi">thuha@dongxanh.vn</div>`, `<span class="sl-nhan sl-n-xong">Chủ tài khoản · làm mọi việc</span>`))}
    ${s.goi === "bus" ? the("Mời thêm", `<div class="sl-luoi sl-l2"><label class="sl-o"><span>Email</span><input placeholder="ketoan@dongxanh.vn"></label><label class="sl-o"><span>Vai trò</span><select><option>Kế toán · xem tiền, xuất bảng kê</option><option>Kho · ký nhận, nghiệm thu</option></select></label></div><div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Gửi lời mời</button></div>`) : bao(`Phân quyền nhiều người (kế toán, kho, duyệt chi) có ở gói Doanh nghiệp. <a href="${url("so-sanh-goi")}" style="font-weight:700">So sánh gói</a>`, "sl-bao-nh")}` },
  "goi-cua-toi": { tieuDe: "Gói và thanh toán", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2">${the("Gói hiện tại", dong("Gói", s.goi === "bus" ? "Business" : "Miễn phí") + dong("Phí giới thiệu đơn đầu", "0,3% giá trị") + dong("Phí mối quen", s.goi === "bus" ? "0%" : "0,3%") + `<div class="sl-hang-nut" style="margin-top:12px"><a class="sl-nut sl-vien" href="${url("so-sanh-goi")}">So sánh gói</a>${s.goi === "bus" ? "" : `<a class="sl-nut sl-vang" href="${url("nang-cap")}">Nâng cấp</a>`}</div>`)}
    ${the("Hóa đơn", s.goi === "bus" ? dong("27/10 · Business tháng 11", "990.000 đ") : `<div class="sl-rong"><b>Chưa có hóa đơn</b><span>Gói Miễn phí không có phí tháng. Phí giới thiệu xuất hóa đơn theo từng đơn.</span></div>`)}</div>` },
  "so-sanh-goi": { tieuDe: "So sánh gói", thuoc: "goi-cua-toi", lui: "goi-cua-toi", ve: (s, { url }) => veGoi(url, false) },
  "nang-cap": { tieuDe: "Nâng cấp lên Business", thuoc: "goi-cua-toi", lui: "so-sanh-goi", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px"><section class="sl-the" style="display:grid;gap:12px">
      <div class="sl-loc" role="radiogroup"><button type="button" aria-pressed="false">Theo tháng · 990.000 đ</button><button type="button" aria-pressed="true">Theo năm · 9.900.000 đ</button></div>
      <label class="sl-o"><span>Xuất hóa đơn cho</span><input value="Công ty TNHH Nhà máy sấy Đồng Xanh · MST 1601 234 567"></label>
      <label class="sl-o"><span>Email nhận hóa đơn</span><input value="ketoan@dongxanh.vn"></label>
      <button class="sl-nut sl-vang" type="button" id="nang">Thanh toán 9.900.000 đ</button></section>
      ${the("Thay đổi khi nâng cấp", dong("Phí mối quen", "0,3% → 0%") + dong("Người dùng", "1 → 5") + dong("Đơn đang chạy", "Giữ phí đã lưu trong hợp đồng"))}</div>`, sau: (g, k, { url }) => { ganLoc(g); g.querySelector("#nang").addEventListener("click", () => { doi((s) => { s.goi = "bus"; }); location.search = url("nang-cap-xong"); }); } },
  "nang-cap-xong": { tieuDe: "Đã nâng cấp", thuoc: "goi-cua-toi", ve: (s, { url }) => `
    <section class="sl-viec sl-xong" style="max-width:720px"><div><h2>Đồng Xanh đang dùng gói Business</h2><p>Hiệu lực tới 27/10/2027. Hóa đơn gửi về ketoan@dongxanh.vn trong 24 giờ.</p></div><div class="sl-hang-nut"><a class="sl-nut sl-vang" href="${url("thanh-vien")}">${icon("them_nguoi")}Mời thành viên</a></div></section>` },
  "ho-so-to-chuc": { tieuDe: "Hồ sơ tổ chức", ve: () => `
    <div class="sl-luoi sl-l2">${the("Doanh nghiệp", dong("Tên", "Công ty TNHH Nhà máy sấy Đồng Xanh") + dong("Mã số thuế", "1601 234 567") + dong("Loại hình", "Chế biến") + dong("Kho nhận hàng", "KCN Sa Đéc, Đồng Tháp") + dong("Người phụ trách", "Lê Thu Hà"))}
    ${the("Giấy tờ xác minh", dong("Giấy phép kinh doanh", `<span class="sl-nhan sl-n-xong">Đã xác minh 15/10</span>`) + dong("Tài khoản ngân hàng công ty", `<span class="sl-nhan sl-n-xong">VietinBank •••• 0277 · đúng tên</span>`) + dong("Giấy chứng nhận ATTP", `<span class="sl-nhan">Chưa tải</span>`))}</div>` },
  "uy-tin": { tieuDe: "Uy tín của tổ chức", phu: "Người bán thấy trước khi nhận lời chào của bạn", ve: () => `
    <div class="sl-luoi sl-l3">${[["Trả đúng hạn", "98%"], ["Đơn đã xong", "15"], ["Nhận xét của người bán", "4,7★"]].map(([a, b]) => `<div class="sl-the sl-chiso"><small>${a}</small><b>${b}</b></div>`).join("")}</div>
    ${the("Người bán nói gì", [["Chị Năm", "Trả tiền đúng giờ, xe tới đúng hẹn."], ["Anh Sáu", "Nghiệm thu nhanh, rõ ràng."], ["Chị Mười", "Có lệch tiền một lần, đã đối soát xong."]].map(([a, b]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, "")).join(""))}` },
};

function veBangChao(s, url, coNut) {
  return `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th class="sl-so">Giá vườn</th><th>Giao</th><th class="sl-so">Giá tại kho</th><th>Ngày</th><th>Uy tín</th>${coNut ? "<th></th>" : ""}</tr></thead><tbody>
  ${CHAO.map((c) => `<tr class="${s.chao.chon === c.nguoi ? "sl-chon" : ""}"><td><b>${esc(c.nguoi)}</b><div class="sl-ghi">${esc(c.lo)} · ${kg(c.luong)} · hạ cấp ${so(c.ha)}</div></td><td class="sl-so">${so(c.gia)} đ</td><td>${esc(c.giao)}</td><td class="sl-so"><b>${so(c.gia + c.phiXe)} đ</b>${c.phiXe ? `<div class="sl-ghi">xe ~${so(c.phiXe)} đ/kg</div>` : ""}</td><td>${c.ngay}</td><td>${sao(c.uy)}</td>${coNut ? `<td>${s.chao.chon === c.nguoi ? `<a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Mở HĐ-0018</a>` : s.chao.chon ? "" : `<button class="sl-nut ${c.nguoi === "Chị Năm" ? "sl-vang" : "sl-vien"}" type="button" data-chon="${esc(c.nguoi)}">Đồng ý</button>`}</td>` : ""}</tr>`).join("")}
  </tbody></table></div>`;
}
function veGoi(url, batDau) {
  const g = [["Miễn phí", "0 đ/tháng", ["Phí giới thiệu 0,3% đơn đầu với mỗi người bán", "Phí mối quen 0,3%", "1 người dùng", "Bảng kê thuế, công nợ, kho"], "free"], ["Business", "990.000 đ/tháng", ["Phí giới thiệu 0,3% đơn đầu", "Phí mối quen 0%", "5 người dùng, phân quyền", "Kế hoạch mua, chấm điểm nhà cung cấp, xuất Excel"], "bus"]];
  return `<div class="sl-luoi sl-l2" style="max-width:960px">${g.map(([t, p, ds, ma]) => `<section class="sl-the" style="display:grid;gap:12px;${ma === "bus" ? "box-shadow:0 0 0 2px var(--la)" : ""}"><h2 style="font-size:var(--c4)">${t}</h2><b style="font-size:var(--c5)" class="sl-so">${p}</b><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${ds.map((x) => `<li>${x}</li>`).join("")}</ul><a class="sl-nut ${ma === "bus" ? "sl-vang" : "sl-vien"}" href="${url(batDau ? "tong-quan" : ma === "bus" ? "nang-cap" : "goi-cua-toi")}">${batDau ? `Bắt đầu với ${t}` : ma === "bus" ? "Nâng cấp" : "Giữ gói này"}</a></section>`).join("")}</div>
  <p class="sl-ghi">Phí tính theo giá trị đơn, lưu vào hợp đồng lúc ký. Gói nào cũng có cọc ngân hàng giữ và hỗ trợ tranh chấp.</p>`;
}

const MENU = [
  { muc: [{ ma: "tong-quan", ten: "Tổng quan", icon: "nha", dem: viecCan }] },
  { nhom: "Mua", muc: [{ ma: "nguon-hang", ten: "Nguồn hàng", icon: "la" }, { ma: "nhu-cau", ten: "Nhu cầu", icon: "phieu" }, { ma: "bao-gia", ten: "Báo giá", icon: "can", dem: () => 4 }, { ma: "tin-nhan", ten: "Tin nhắn", icon: "tin" }] },
  { nhom: "Đơn", muc: [{ ma: "don-hang", ten: "Đơn và lịch", icon: "don" }, { ma: "vi-dam-bao", ten: "Tài khoản đảm bảo", icon: "tien" }, { ma: "cong-no", ten: "Công nợ", icon: "ghep" }, { ma: "ghi-thanh-toan", ten: "Chuyển tiền đơn", icon: "tien" }] },
  { nhom: "Kho và nguồn", muc: [{ ma: "nhap-kho", ten: "Nhập kho", icon: "kho" }, { ma: "ton-kho", ten: "Tồn kho", icon: "hop" }, { ma: "moi-quen", ten: "Mối quen", icon: "nguoi" }, { ma: "ghi-don-ngoai", ten: "Đơn ngoài app", icon: "phieu" }, { ma: "ke-hoach", ten: "Kế hoạch mua", icon: "lich" }] },
  { nhom: "Sổ sách", muc: [{ ma: "bang-ke", ten: "Bảng kê thuế", icon: "phieu" }, { ma: "bao-cao", ten: "Báo cáo", icon: "bieu" }, { ma: "dich-vu", ten: "Kiểm định, xe, kho", icon: "xe" }] },
  { nhom: "Tổ chức", muc: [{ ma: "ho-so-to-chuc", ten: "Hồ sơ tổ chức", icon: "toa" }, { ma: "uy-tin", ten: "Uy tín", icon: "sao" }, { ma: "thanh-vien", ten: "Thành viên", icon: "them_nguoi" }, { ma: "goi-cua-toi", ten: "Gói", icon: "cai" }] },
];
const TAB = [
  { ma: "tong-quan", ten: "Hôm nay", icon: "nha", dem: viecCan },
  { ma: "nguon-hang", ten: "Nguồn hàng", icon: "la", gom: ["nhu-cau", "bao-gia"] },
  { ma: "don-hang", ten: "Đơn", icon: "don" },
  { ma: "vi-dam-bao", ten: "Tiền", icon: "tien", gom: ["cong-no", "ghi-thanh-toan"] },
  { ma: "tin-nhan", ten: "Tin nhắn", icon: "tin" },
];
chayApp({ ten: "AgiViet Mua", phu: "Nhà máy sấy Đồng Xanh", menu: MENU, tab: TAB, man, kho, macDinh: "tong-quan", nguoi: { viet: "TH", ten: "Lê Thu Hà", vai: "Phụ trách mua" } });
export { man as MAN_MUA };
