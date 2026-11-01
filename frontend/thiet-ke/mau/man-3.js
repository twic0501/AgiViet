// Màn 42–80: Đơn · Tiền · Tôi (+ Kiểm tiền, Bàn giao, Đánh giá bên mua)
import { esc, d, so, kg, ic, the, dong, viec, nhan, lk, nut, chang, chon, o } from "./tien-ich.js";
import { BUOC, TIEN } from "./du-lieu.js";
import { docHD, ghiHD, tinhTien } from "../giao-dich-chung.js";

const AI = { bac: "Bác", mua: "Bên mua", nh: "Ngân hàng" };
// Tiền đang ở đâu theo bước (nhìn từ phía bác)
function tienO(b) {
  const nhan = (b >= 7 ? TIEN.TRA_THANG : 0) + (b >= 13 ? TIEN.COC_CHO_BAC : 0);
  const giu = b >= 4 && b < 13 ? TIEN.COC : 0;
  const cho = b >= 15 ? 0 : b >= 11 ? TIEN.COC_CHO_BAC : b >= 6 && b < 7 ? TIEN.TRA_THANG : TIEN.GIA_TRI - nhan;
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px var(--ke);background:var(--giay-noi)">
    ${[["Bác đã nhận", nhan, "var(--la)", "o-bac"], ["Ngân hàng giữ", giu, "var(--chin)", "o-nh"], ["Còn chờ", cho, "var(--muc-phu)", "o-cho"]].map(([t, v, c, id], i) => `<div id="${id}" style="padding:10px 10px 12px;${i ? "border-left:1px solid var(--ke)" : ""}"><small class="m-ghi" style="font-size:12.5px">${t}</small><b class="m-so" data-v="${v}" style="display:block;font-size:15px;color:${c};border-radius:6px">${so(v)}</b></div>`).join("")}</div>`;
}
// Kịch bản do app mua nạp (giao-dich-chung.js): những lúc tới lượt chị Năm làm
const TEN_KB = { "doi-ngay": "Đổi ngày giao trước khi ký", thieu: "Trả thiếu rồi bổ sung", lech: "Lệch tiền", "tra-lai": "Trả lại nhiều", "phan-doi": "Phản đối một dòng", "can-lech": "Cân lệch trong ±5%", huy: "Xin hủy sau cọc" };
const nutKb = (chu, lam, lop = "m-vang") => `<button class="m-nut ${lop} m-rong" type="button" data-kb="${lam}">${esc(chu)}</button>`;
function viecKichBan() {
  const h = docHD(), t = tinhTien(h);
  if (h.huy) return viec("Đơn đã hủy theo thỏa thuận", `Hàng về lại lô L-0412. Cọc ${d(TIEN.COC)} ngân hàng chuyển cho bác. Phí bên mua không hoàn.`, "", "m-cho");
  if (h.phu === "xin-huy") return viec("Bên mua xin hủy đơn", `Bác có 24 giờ để trả lời. Nếu hủy: cọc ${d(TIEN.COC)} chuyển cho bác, hàng về lại lô. Im lặng là không đồng ý.`, `<div style="display:grid;gap:8px">${nutKb("Đồng ý hủy", "huy-ok")}${nutKb("Không đồng ý", "huy-khong", "m-phu")}</div>`);
  if (h.kb === "doi-ngay" && h.buoc === 2 && !h.daDeNghi) return viec("Bác cần đổi ngày giao?", "Mưa nhiều, bác có thể đề nghị đổi ngày giao 28/10 → 29/10 trước khi ký. Bên mua đồng ý thì sang bản 2.", `<div style="display:grid;gap:8px">${nutKb("Đề nghị đổi sang 29/10", "de-nghi", "m-phu")}${nut("Xem và ký", { ma: "ky", lop: "m-vang m-rong" })}</div>`);
  if (h.phu === "de-nghi") return viec("Chờ bên mua trả lời đề nghị đổi ngày", "Đang đề nghị: chưa ký được tới khi bên mua trả lời.", "", "m-cho");
  if (h.kb === "lech" && h.buoc === 6 && !h.phu) return viec("Bên mua báo đã chuyển 32.200.000 đ", "Bác kiểm tài khoản. Nếu chỉ thấy một phần thì báo đúng số bác thấy.", `<div style="display:grid;gap:8px">${nutKb("Tôi chỉ thấy 20.000.000 đ", "lech", "m-phu")}${nut("Kiểm tiền", { ma: "kiem-tien", lop: "m-vang m-rong" })}</div>`);
  if (h.phu === "lech" || h.phu === "cho-vh") return viec("Lệch tiền, đang đối soát", "Bác thấy 20.000.000 đ, bên mua báo 32.200.000 đ. Đây là lệch, không phải vi phạm. Người vận hành đối chiếu sao kê trong 48 giờ. Chưa cho bốc.", "", "m-cho");
  if (h.buoc === 7 && (h.nbXn || 0) < TIEN.TRA_THANG && h.kb !== "lech") {
    if ((h.daTra || 0) > (h.nbXn || 0)) return viec(`Bên mua báo trả thêm ${d(h.daTra - h.nbXn)}`, `Bác đã xác nhận ${d(h.nbXn)}. Mở app ngân hàng xem Agribank •••• 2186 có thêm tiền chưa. Chỉ bấm khi thấy tiền thật.`, nutKb(`Đã nhận thêm ${d(h.daTra - h.nbXn)}`, "nhan-them"));
    return viec(`Bên mua mới trả ${d(h.nbXn)} / ${d(TIEN.TRA_THANG)}`, `Còn thiếu ${d(TIEN.TRA_THANG - h.nbXn)}. Chưa cho bốc tới khi nhận đủ. Bên mua đã được báo trả nốt.`, "", "m-cho");
  }
  if (h.kb === "phan-doi" && h.buoc === 11 && !h.daPhanDoi) return viec("Có kết quả cân", "Đạt 1.850 · hạ cấp 120 · trả lại 30 kg. Bác thấy dòng hạ cấp không đúng thì phản đối riêng dòng đó.", `<div style="display:grid;gap:8px">${nutKb("Phản đối dòng hạ cấp 120 kg", "phan-doi", "m-phu")}${nut("Xem kết quả cân", { ma: "ket-qua", lop: "m-vang m-rong" })}</div>`);
  if (h.phu === "phan-doi") return viec("Bác đã phản đối dòng hạ cấp", "Các dòng khác đã chốt. Bên mua đang cân lại dòng này.", "", "m-cho");
  if (h.phu === "can-lai") return viec("Bên mua cân lại: vẫn 120 kg hạ cấp", "Bác đồng ý hoặc gửi mẫu M-2291 đi kiểm định 48 giờ. Bên sai chịu phí kiểm định.", `<div style="display:grid;gap:8px">${nutKb("Vẫn không đồng ý → kiểm định", "kd", "m-phu")}</div>`);
  if (h.phu === "kiem-dinh") return viec("Đang kiểm định mẫu M-2291", "Kết quả trong 48 giờ.", "", "m-cho");
  if (h.kb === "tra-lai" && h.buoc === 13 && h.phu === "cho-nb-hoan") return viec(`Bác cần hoàn ${d(t.nbHoan)} cho bên mua`, `Giá trị nghiệm thu ${d(t.nt)} thấp hơn số bác đã nhận ${d(TIEN.TRA_THANG)}. Chuyển phần dư vào tài khoản công ty Đồng Xanh, nội dung HD0018 HOAN.`, nutKb(`Tôi đã hoàn ${d(t.nbHoan)}`, "nb-hoan"));
  return "";
}
const viecDon = (s) => {
  const kb = viecKichBan(); if (kb) return kb;
  const b = s.hd.buoc;
  if (b >= 15) return viec("HĐ-0018 đã hoàn tất", `Bác đã nhận đủ ${d(TIEN.NGHIEM_THU)}. Cảm ơn chị Năm.`, "", "m-xong");
  const x = BUOC[b];
  if (x.ai === "bac") return viec(x.lam, x.han ? `Hạn: ${x.han}` : "", `<div>${nut(x.nut, { ma: x.di || "", id: x.di ? "" : "lam", lop: "m-vang m-rong" })}</div>`);
  return viec(`Đang chờ ${AI[x.ai].toLowerCase()}`, `${esc(x.lam)}${x.han ? ` · hạn ${esc(x.han)}` : ""}. Bác chưa phải làm gì.`, `<div><button class="m-nut m-phu m-rong" type="button" id="mp" style="border-radius:999px;background:var(--bien-nen);color:var(--bien);box-shadow:0 0 0 1.5px #9db8c9 inset,0 3px 0 #b8ccd8">${esc(x.mp)}</button></div>`, "m-cho");
};
const tienLen = (api, chu) => { api.doi((x) => { x.hd.buoc = Math.min(15, x.hd.buoc + 1); }); if (chu) api.toast(chu); };

export const MAN_3 = {
  // ── Đơn ──
  lich: { tieu: "Hợp đồng", phu: "Đơn và lịch giao", ve_tu: "hom-nay", ve: (s) => ({ than: `
    <div class="m-loc"><button type="button" aria-pressed="true">Đang chạy</button><button type="button" aria-pressed="false">Lịch giao</button><button type="button" aria-pressed="false">Đã xong</button></div>
    <section class="m-the" role="button" data-di="chi-tiet-don" style="cursor:pointer;box-shadow:0 0 0 1.5px #e3c77a"><div style="display:flex;justify-content:space-between;gap:8px"><b>HĐ-0018 · Nhà máy sấy Đồng Xanh</b>${BUOC[Math.min(s.hd.buoc, 14)].ai === "bac" && s.hd.buoc < 15 ? nhan("Tới lượt bác", "m-n-bac") : nhan(s.hd.buoc >= 15 ? "Xong" : "Đang chờ", s.hd.buoc >= 15 ? "m-n-xong" : "")}</div><p class="m-ghi">2.000 kg xoài cát Chu · ${d(TIEN.GIA_TRI)} · giao 28/10 tại vườn</p>${chang(BUOC[Math.min(s.hd.buoc, 14)].chang, s.hd.buoc >= 15)}</section>
    ${s.hopDongKhac.map((h) => `<section class="m-the"><div style="display:flex;justify-content:space-between;gap:8px"><b>${h.ma} · ${esc(h.ben)}</b>${h.luot === "bac" ? nhan("Tới lượt bác", "m-n-bac") : nhan("Xong", "m-n-xong")}</div><p class="m-ghi">${esc(h.hang)} · ${esc(h.viec)}</p>${chang(h.chang, h.luot === "xong")}</section>`).join("")}
    ${the("Lịch giao tuần này", dong("Thứ Ba 28/10 · 5:30", "HĐ-0018 · 2.000 kg") + dong("Thứ Năm 30/10", "HĐ-0011 · 50 kg"))}` }) },
  "chi-tiet-don": { tieu: "HĐ-0018 · Đồng Xanh", phu: "2.000 kg xoài cát Chu · tại vườn", ve_tu: "lich", ve: (s) => ({ than: `
    ${viecDon(s)}
    ${tienO(s.hd.buoc)}
    <section class="m-the">${chang(BUOC[Math.min(s.hd.buoc, 14)].chang, s.hd.buoc >= 15)}</section>
    ${the("Các bước", `<ol class="m-buoc">${BUOC.map((x, i) => `<li class="${i < s.hd.buoc ? "m-b-xong" : i === s.hd.buoc ? "m-b-nay" : "m-b-cho"}"><span class="m-b-vong">${i < s.hd.buoc ? ic("tich", 15) : i + 1}</span><div><small>${AI[x.ai]}${x.han && i >= s.hd.buoc ? ` · hạn ${esc(x.han)}` : ""}</small><b>${esc(x.lam)}</b></div></li>`).join("")}</ol>`, `<span class="m-ghi">${Math.min(s.hd.buoc, 15)}/15</span>`)}
    ${the("Thỏa thuận", dong("Giá loại 1", "23.000 đ/kg") + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Cọc ngân hàng giữ", d(TIEN.COC)) + dong("Bên mua trả thẳng trước bốc", d(TIEN.TRA_THANG)) + dong("Tiền về tài khoản", "Agribank •••• 2186"), lk("Bản đầy đủ", "ban-day-du"))}
    ${the("Có vướng mắc?", `<div class="m-hai-o">${nut("Xin đổi lịch", { ma: "doi-lich", lop: "m-phu m-nho" })}${nut("Xin thay đổi", { ma: "yeu-cau-thay-doi", lop: "m-phu m-nho" })}</div><div class="m-hai-o">${nut("Nhắn bên mua", { ma: "chat", tham: { ma: "T1" }, lop: "m-phu m-nho" })}${nut("Xin hủy", { ma: "huy-don", lop: "m-huy m-nho" })}</div>`)}
    <button class="m-nut m-chu m-rong" type="button" id="lai">Chạy lại hợp đồng từ đầu (mô phỏng)</button>` }),
    sau: (el, s, t, api) => {
      const HU = window.HieuUng, cu = window.__tienCu, buocCu = window.__buocCu;
      if (HU && cu) ["o-bac", "o-nh", "o-cho"].forEach((id) => { const b = el.querySelector(`#${id} b`); const moi = Number(b.dataset.v); if (cu[id] !== undefined && cu[id] !== moi) HU.demSo(b, cu[id], moi, { hau: "" }); });
      if (HU && buocCu !== undefined && s.hd.buoc === 13 && buocCu === 12) setTimeout(() => HU.xuBay(el.querySelector("#o-nh"), el.querySelector("#o-bac"), 6), 200);
      if (HU && buocCu !== undefined && s.hd.buoc > buocCu) { const li = el.querySelectorAll(".m-buoc li")[s.hd.buoc - 1]; const v = li?.querySelector(".m-b-vong"); if (v) HU.nayDich(v).then(() => HU.nayDich(v)); }
      window.__tienCu = Object.fromEntries(["o-bac", "o-nh", "o-cho"].map((id) => [id, Number(el.querySelector(`#${id} b`).dataset.v)]));
      window.__buocCu = s.hd.buoc;
      el.querySelector("#mp")?.addEventListener("click", () => { tienLen(api, BUOC[s.hd.buoc].mp.replace("Mô phỏng: ", "") ); api.veLai(); });
      el.querySelector("#lam")?.addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đã gửi"); tienLen(api, `Xong: ${BUOC[s.hd.buoc].lam}`); api.veLai(); });
      el.querySelector("#lai").addEventListener("click", () => { ghiHD({ buoc: 0, daTra: 0, nbXn: 0, kb: docHD().kb, phu: "", ban: 1, huy: false, ngayGiao: "28/10" }); api.doi((x) => { x.hd.buoc = 0; }); api.veLai(); });
      el.querySelectorAll("[data-kb]").forEach((b) => b.addEventListener("click", async () => {
        await api.xong(b, "Đã gửi");
        const P = { "huy-ok": { huy: true, phu: "" }, "huy-khong": { phu: "" }, "de-nghi": { phu: "de-nghi", daDeNghi: true }, lech: { phu: "lech", nbXn: 20000000 }, "phan-doi": { phu: "phan-doi", daPhanDoi: true }, kd: { phu: "kiem-dinh" }, "nb-hoan": { phu: "nb-da-hoan" } }[b.dataset.kb];
        ghiHD((x) => ({ ...x, ...(b.dataset.kb === "nhan-them" ? { nbXn: x.daTra } : P) })); api.veLai();
      }));
      const kbDang = docHD().kb; if (kbDang && kbDang !== "thuan") el.querySelector(".m-than").insertAdjacentHTML("afterbegin", `<p class="m-ghi">Kịch bản thử đang chạy: <b>${esc(TEN_KB[kbDang] || kbDang)}</b> (nạp từ app mua).</p>`);
    } },
  "xac-nhan-don": { tieu: "Đơn mới", phu: "Bên mua gửi thỏa thuận", ve: () => ({ than: `
    ${viec("Nhà máy sấy Đồng Xanh gửi thỏa thuận HĐ-0018", "Bác có 24 giờ để xem và ký. Không ký thì hàng hết giữ, lô bán tiếp bình thường.")}
    ${the("Tóm tắt", dong("Hàng", "2.000 kg xoài cát Chu loại 1") + dong("Giá", "23.000 đ/kg") + dong("Giao", "28/10 · 5:30 · tại vườn, bên mua lo xe") + dong("Bác nhận tổng", d(TIEN.GIA_TRI), "m-tong"))}`,
    day: `<div class="m-hang-nut">${nut("Đề nghị sửa", { ma: "yeu-cau-thay-doi", lop: "m-phu" })}${nut("Xem và ký", { ma: "ky", lop: "m-vang" })}</div>` }) },
  "so-sanh": { tieu: "So sánh khách", phu: "3 bên mua cùng muốn lô L-0412", ve: () => ({ than: `
    ${[["Nhà máy sấy Đồng Xanh", "23.000", "2.000 kg", "Bên mua lo xe · trả thẳng trước bốc", "4,7★ · 98% trả đúng hạn", true], ["Vựa Ba Cường", "23.500", "1.000 kg", "Bác giao tận vựa · trả khi nhận", "4,1★ · chưa xác minh", false], ["HTX Tân Thuận", "22.800", "3.000 kg", "Bên mua lo xe · trả trước bốc", "4,7★", true]].map(([a, g, l, gn, u, xm]) => `<section class="m-the" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${a}</b><b class="m-so">${g} đ/kg</b></div><p class="m-ghi">${l} · ${gn}</p><p class="m-ghi">${u} ${xm ? "· đã xác minh" : ""}</p></section>`).join("")}
    <p class="m-ghi">Giá cao nhất chưa chắc lợi nhất: xem ai lo xe, trả tiền lúc nào, đã xác minh chưa.</p>` }) },
  "phuong-thuc": { tieu: "Chọn cách giao dịch", phu: "HĐ-0018", ve: () => ({ than: `
    <h2 class="m-tieu">Bác muốn nhận tiền thế nào?</h2>
    ${chon("pt", [["Trả trước khi bốc", "Bên mua chuyển đủ phần còn lại, bác mới cho bốc. An toàn nhất."], ["Kiểm rồi mới trả", "Bên mua kiểm tại vườn, đạt thì chuyển tiền rồi bốc."], ["Trả khi nhận tại kho", "Bác chịu rủi ro đường đi. Chỉ nên chọn với mối quen."]])}
    ${viec("Cọc 30% luôn qua ngân hàng", "Dù chọn cách nào, cọc 13.800.000 đ vẫn do ngân hàng giữ tới khi xong đơn.", "", "m-cho")}`,
    day: nut("Tiếp tục", { ma: "chon-luong", lop: "m-vang m-rong" }) }) },
  "chon-luong": { tieu: "Hứa bán bao nhiêu?", phu: "HĐ-0018", ve: () => ({ than: `
    <h2 class="m-tieu">Bác hứa giao bao nhiêu ký?</h2>
    <label class="m-o"><span>Lượng (kg)</span><input inputmode="numeric" value="2000" style="font-size:28px;font-weight:700"></label>
    ${the("", dong("Lô L-0412 còn", "3.500 kg (ước chừng)") + dong("Được hứa tối đa", "2.800 kg (80%)") + dong("Sai số cho phép", "±5% · 1.900–2.100 kg"))}
    <p class="m-ghi">Giao thiếu quá 5% thì phần thiếu tính theo điều khoản thiếu lượng.</p>`,
    day: nut("Tiếp tục", { ma: "ky", lop: "m-vang m-rong" }) }) },
  ky: { tieu: "Thỏa thuận", phu: "HĐ-0018 · bản 1", ve: () => ({ than: `
    ${the("Hàng và giá", dong("Hàng", "Xoài cát Chu loại 1") + dong("Lượng", "2.000 kg (±5%)") + dong("Giá", "23.000 đ/kg") + dong("Giá hạ cấp", "15.000 đ/kg"))}
    ${the("Tiền", dong("Cọc ngân hàng giữ", d(TIEN.COC)) + dong("Bên mua trả thẳng trước bốc", d(TIEN.TRA_THANG)) + dong("Bác nhận tổng", d(TIEN.GIA_TRI), "m-tong"))}
    ${the("Giao nhận", dong("Ngày", "28/10 · 5:30") + dong("Nơi", "Tại vườn, bên mua lo xe") + dong("Kiểm hàng", "Tại kho bên mua · 2 giờ"))}
    <div class="m-hai-o">${nut("Quyền và trách nhiệm", { ma: "quyen", lop: "m-phu m-nho" })}${nut("Bản đầy đủ", { ma: "ban-day-du", lop: "m-phu m-nho" })}</div>`,
    day: `<div class="m-hang-nut">${nut("Không ký", { lop: "m-phu" }).replace('type="button"', 'type="button" data-lui')}${nut("Ký thỏa thuận", { ma: "ky-otp", lop: "m-vang" })}</div>` }) },
  quyen: { tieu: "Quyền và trách nhiệm", phu: "Nói gọn, đọc to được", ve: () => ({ than: `
    ${the("Bác được", ["Ngân hàng giữ cọc trước khi bác giao", "Nhận đủ tiền thẳng trước khi cho bốc", "Phản đối từng dòng kết quả cân trong 24 giờ", "Mất mùa có giấy xã: hủy không bị phạt"].map((x) => `<p style="display:flex;gap:10px;padding:6px 0">${ic("tich", 20)}<span>${x}</span></p>`).join(""))}
    ${the("Bác cần", ["Giao đúng loại, đúng lượng ±5%", "Niêm phong mẫu đối chứng khi bốc", "Không đưa số điện thoại trước khi có cọc"].map((x) => `<p style="display:flex;gap:10px;padding:6px 0">${ic("khien", 20)}<span>${x}</span></p>`).join(""))}`,
    day: nut("Nghe đọc to", { lop: "m-phu m-rong", icon: "tai" }) }) },
  "ban-day-du": { tieu: "Bản đầy đủ", phu: "HĐ-0018 · PDF 6 trang", ve: () => ({ than: `<section class="m-the" style="font-size:14px;line-height:1.65">${["Điều 1. Hàng hóa: 2.000 kg xoài cát Chu loại 1, lô L-0412, vườn Mỹ Xương…", "Điều 2. Giá: 23.000 đ/kg; hàng hạ cấp 15.000 đ/kg…", "Điều 3. Thanh toán: cọc 30% qua tài khoản đảm bảo; phần còn lại trả thẳng trước 5:30 ngày 28/10…", "Điều 4. Giao nhận và nghiệm thu…", "Điều 5. Thiếu lượng, hạ cấp, trả lại…", "Điều 6. Mất mùa, bất khả kháng…"].map((x) => `<p style="padding:8px 0;border-bottom:1px solid var(--ke)">${x}</p>`).join("")}</section>`,
    day: nut("Tải PDF", { lop: "m-phu m-rong" }) }) },
  "ky-otp": { tieu: "Xác nhận ký", phu: "HĐ-0018", ve: () => ({ than: `
    <h2 class="m-tieu">Nhập mã ký gửi tới 0918 234 421</h2><p class="m-phu-de">Ký bằng mã có giá trị như ký tay.</p>
    <div class="m-otp">${"482917".split("").map((c) => `<input aria-label="Số mã" maxlength="1" value="${c}" inputmode="numeric">`).join("")}</div>`,
    day: nut("Ký", { id: "ky", lop: "m-vang m-rong" }) }),
    sau: (el, s, t, api) => el.querySelector("#ky").addEventListener("click", () => { api.doi((x) => { if (x.hd.buoc <= 2) x.hd.buoc = 3; }); api.thay("ky-xong"); }) },
  "ky-xong": { tieu: "Hoàn tất ký", phu: "HĐ-0018", sau: (el) => { const HU = window.HieuUng; if (!HU) return; HU.kyTen(el.querySelector("#net-ky"), 1200).then(() => HU.dongDau(el.querySelector("#dau-ky"))); }, ve: () => ({ than: `
    <div style="display:grid;justify-items:center;text-align:center;gap:12px;padding:20px 0"><div style="position:relative;width:260px;height:150px;border-radius:16px;background:var(--giay-noi);box-shadow:0 0 0 1px var(--ke)"><svg viewBox="0 0 260 150" width="260" height="150" aria-hidden="true"><path id="net-ky" d="M30 100c18-40 30-52 38-40s-10 44 4 42 22-48 34-46-2 40 12 40 18-30 30-28 6 22 20 20 24-16 40-14" fill="none" stroke="#1c2a21" stroke-width="3" stroke-linecap="round"/><line x1="24" y1="118" x2="236" y2="118" stroke="rgba(28,42,33,.2)"/></svg><span id="dau-ky" style="visibility:hidden;position:absolute;right:14px;top:14px;border:3px solid var(--do);color:var(--do);font-weight:800;font-size:15px;padding:4px 10px;border-radius:8px;transform:rotate(-8deg);letter-spacing:.06em">ĐÃ KÝ</span></div><h2 class="m-tieu">Bác đã ký HĐ-0018</h2><p class="m-ghi">Bên mua có 48 giờ để chuyển cọc 13.938.000 đ vào ngân hàng. Chưa có cọc thì bác chưa giao.</p></div>`,
    day: nut("Xem hợp đồng", { ma: "chi-tiet-don", lop: "m-vang m-rong" }) }) },
  "ky-giay": { tieu: "Ký giấy", phu: "Cho bác quen ký tay", ve: () => ({ than: `
    ${viec("Nhân viên mang bản in tới", "Bác ký tay 2 bản, nhân viên chụp lại và gửi lên app. Hợp đồng có hiệu lực khi app nhận ảnh.", "", "m-cho")}
    ${the("Hẹn ký", dong("Ngày", "Thứ Ba 28/10 · 7:00") + dong("Nhân viên", "Anh Hùng · AgiViet"))}`,
    day: nut("Đặt lịch ký giấy", { lop: "m-vang m-rong" }) }) },
  "so-ban": { tieu: "Các bản", phu: "HĐ-0018", ve: () => ({ than: `<ol class="m-buoc">${[["Bản 2 · đang hiệu lực", "Đổi ngày giao 28/10 → 29/10 · hai bên ký 27/10", 1], ["Bản 1", "Bên mua soạn 26/10", 1]].map(([a, b]) => `<li class="m-b-xong"><span class="m-b-vong">${ic("hd", 15)}</span><div><b>${a}</b><small>${b}</small></div></li>`).join("")}</ol>` }) },
  coc: { tieu: "Tiền cọc", phu: "HĐ-0018", ve: (s) => ({ than: `
    <div class="m-so-lon m-tien"><small>Ngân hàng đang giữ</small><b>${d(s.hd.buoc >= 4 && s.hd.buoc < 13 ? TIEN.COC : 0)}</b><span class="m-ghi">cọc 30% · ngân hàng đối tác</span></div>
    ${the("Cọc đi đâu", `<ol class="m-buoc">${["Bên mua chuyển cọc vào ngân hàng", "Ngân hàng giữ, không ai rút được", "Xong cân, ngân hàng chuyển cho bác phần còn lại của tiền hàng"].map((x, i) => `<li class="m-b-cho"><span class="m-b-vong">${i + 1}</span><div><b>${x}</b></div></li>`).join("")}</ol>`)}` }) },
  "mo-lien-lac": { tieu: "Đã mở liên lạc", phu: "HĐ-0018", ve: () => ({ than: `
    ${viec("Ngân hàng đã giữ cọc", "Liên lạc hai bên đã mở. Vẫn nên nhắn qua app để có bằng chứng.", "", "m-xong")}
    ${the("Bên mua", dong("Người liên hệ", "Chị Thu Hà") + dong("Số điện thoại", "0277 386 210") + dong("Xe tới lấy", "66C-123.45 · anh Lộc"))}`,
    day: `<div class="m-hang-nut m-deu">${nut("Nhắn tin", { ma: "chat", tham: { ma: "T1" }, lop: "m-phu" })}${nut("Gọi", { lop: "m-vang", icon: "dien" })}</div>` }) },
  "ket-qua": { tieu: "Kết quả cân", phu: "HĐ-0018 · kho Đồng Xanh", ve: () => ({ than: `
    ${viec("Bên mua gửi kết quả cân", "Bác có 24 giờ để đồng ý, hoặc phản đối từng dòng. Im lặng không tính là đồng ý.")}
    ${the("Kết quả", dong("Đạt loại 1", "1.850 kg × 23.000") + dong("Hạ cấp", "120 kg × 15.000") + dong("Trả lại", "30 kg (có ảnh)") + dong("Tiền hàng", d(TIEN.NGHIEM_THU), "m-tong"))}
    ${the("Bác sẽ nhận", dong("Bên mua đã trả thẳng", d(TIEN.TRA_THANG)) + dong("Ngân hàng chuyển từ cọc", d(TIEN.COC_CHO_BAC)) + dong("Cọc dư hoàn bên mua", d(TIEN.HOAN_BEN_MUA)))}
    <div class="m-luoi-anh"><span style="background-image:url(/assets/products/xoai-cat-chu.jpg)"></span><span style="background:repeating-linear-gradient(0deg,#fbf9f3 0 18px,#e8e1cf 18px 19px)"></span><span style="background-image:url(/assets/products/xoai-cat-chu.jpg);filter:sepia(.4)"></span></div>`,
    day: `<div class="m-hang-nut">${nut("Phản đối", { ma: "tranh-chap", lop: "m-phu" })}${nut("Đồng ý kết quả", { id: "dy", lop: "m-vang" })}</div>` }),
    sau: (el, s, t, api) => el.querySelector("#dy").addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đã đồng ý"); api.doi((x) => { if (x.hd.buoc === 11) x.hd.buoc = 12; }); api.toast("Đã đồng ý kết quả cân · chờ ngân hàng chuyển tiền"); api.lui(); }) },
  "giao-mot-phan": { tieu: "Giao đợt sau", phu: "HĐ-0011 · khung theo tuần", ve: () => ({ than: `
    ${the("Đợt 4 · thứ Năm 30/10", dong("Lượng", "50 kg") + dong("Đã giao 3 đợt", "150 kg") + dong("Còn trong khung", "250 kg"))}
    <p class="m-ghi">Mỗi đợt có mã nhận hàng riêng. Tiền đợt trước đã về mới giao đợt sau.</p>`,
    day: nut("Chuẩn bị đợt 4", { lop: "m-vang m-rong" }) }) },
  "doi-lich": { tieu: "Xin đổi lịch", phu: "HĐ-0018", ve: () => ({ than: `
    ${o("Ngày giao mới", "29/10/2026")}
    ${chon("ld", [["Mưa lớn, không hái được", ""], ["Xe chưa sắp xếp kịp", ""], ["Lý do khác", ""]])}
    <p class="m-ghi">Bên mua có 24 giờ đồng ý. Đồng ý thì sinh bản 2, hạn trả tiền dời theo.</p>`,
    day: nut("Gửi đề nghị", { lop: "m-vang m-rong" }) }) },
  "yeu-cau-thay-doi": { tieu: "Xin thay đổi", phu: "HĐ-0018", ve: () => ({ than: `
    <h2 class="m-tieu">Bác muốn đổi gì?</h2>
    ${chon("doi", [["Lượng", "Ví dụ: chỉ đủ 1.800 kg"], ["Giá", "Cần lý do rõ ràng"], ["Ngày giao", ""], ["Cách trả tiền", ""]])}
    <label class="m-o"><span>Ghi rõ</span><textarea>Mưa làm rụng trái, chỉ còn đủ 1.800 kg loại 1.</textarea></label>`,
    day: nut("Gửi đề nghị sửa", { lop: "m-vang m-rong" }) }) },
  "huy-don": { tieu: "Xin hủy đơn", phu: "HĐ-0018", ve: () => ({ than: `
    ${chon("ly", [["Mất mùa, thiên tai", "Cần ảnh và giấy xác nhận của xã"], ["Bác không giao được nữa", "Cọc hoàn bên mua, bác bị ghi \"hủy sau cọc\""]])}
    ${the("Nếu hủy vì mất mùa", dong("Hàng", "Không phải giao") + dong("Cọc 13.800.000 đ", "Hoàn bên mua") + dong("Uy tín", "Không bị trừ"))}
    ${nut("Chụp chứng từ", { lop: "m-phu m-rong", icon: "anh" })}
    <p class="m-ghi">Bên mua có 24 giờ trả lời. Im lặng là không đồng ý; AgiViet sẽ xem xét chứng từ.</p>`,
    day: nut("Gửi yêu cầu hủy", { lop: "m-huy m-rong" }) }) },
  "tranh-chap": { tieu: "Đối soát", phu: "HĐ-0018 · dòng hạ cấp 120 kg", ve: () => ({ than: `
    ${viec("Bác phản đối dòng hạ cấp", "Các dòng khác đã chốt, tiền phần đó vẫn chuyển bình thường.")}
    ${the("Dòng đang đối soát", dong("Bên mua ghi", "120 kg hạ cấp") + dong("Bác cho là", "Loại 1, trái đủ 350 g") + dong("Chênh lệch", d(960000), "m-tong"))}
    ${the("Bằng chứng của bác", `<div class="m-luoi-anh"><span style="background-image:url(/assets/products/xoai-cat-chu.jpg)"></span><span style="background:var(--la-dam);display:grid;place-items:center;color:#f4f1e8">${ic("anh", 26)}</span><span style="border:1.5px dashed var(--ke-dam)"></span></div><p class="m-ghi">Video lúc bốc · mẫu niêm phong M-2291 còn tại kho.</p>`)}
    <p class="m-ghi">Hai bên không thống nhất thì gửi kiểm định trong 48 giờ, bên sai chịu phí.</p>`,
    day: nut("Gửi phản đối", { lop: "m-vang m-rong" }) }) },
  "kiem-tien": { tieu: "Kiểm tiền", phu: "HĐ-0018 · bên mua báo đã chuyển", ve: () => ({ than: `
    ${viec(`Bên mua báo đã chuyển ${d(docHD().daTra || TIEN.TRA_THANG)}`, "Bác mở app ngân hàng xem Agribank •••• 2186 đã có tiền chưa. Chỉ bấm khi thấy tiền thật.")}
    ${o("Số tiền bác thấy về", d(docHD().daTra || TIEN.TRA_THANG).replace(" đ", ""), "", 'inputmode="numeric"')}${o("Mã giao dịch ngân hàng", "FT2630012345")}
    ${chon("kt", [["Đã nhận đủ", ""], ["Mới nhận một phần", "Ghi đúng số đã thấy"], ["Chưa thấy tiền", "Bên mua sẽ được báo kiểm lại"]])}`,
    day: nut("Xác nhận", { id: "xn", lop: "m-vang m-rong" }) }),
    sau: (el, s, t, api) => el.querySelector("#xn").addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đã xác nhận"); api.doi((x) => { if (x.hd.buoc === 6) x.hd.buoc = 7; }); api.toast(`Đã xác nhận nhận ${d(docHD().daTra || TIEN.TRA_THANG)}`); api.lui(); }) },
  "ban-giao": { tieu: "Bàn giao hàng", phu: "HĐ-0018 · xe 66C-123.45", ve: () => ({ than: `
    ${viec("Xe tới vườn", "Hỏi tài xế mã nhận hàng 6 số, nhập vào đây rồi mới cho bốc.")}
    <div class="m-otp">${"482917".split("").map((c) => `<input aria-label="Số mã" maxlength="1" value="${c}" inputmode="numeric">`).join("")}</div>
    ${the("Khi bốc", dong("Cân xe", "Ghi số cân, chụp phiếu") + dong("Mẫu đối chứng", "Niêm phong M-2291") + dong("Quay video", "Lúc bốc lên xe"))}`,
    day: nut("Đúng mã, bắt đầu bốc", { id: "bg", lop: "m-vang m-rong" }) }),
    sau: (el, s, t, api) => el.querySelector("#bg").addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đúng mã"); api.doi((x) => { if (x.hd.buoc === 7) x.hd.buoc = 8; }); api.toast("Đã bàn giao · chờ bên mua xem video lúc bốc"); api.lui(); }) },
  "danh-gia": { tieu: "Đánh giá bên mua", phu: "HĐ-0018 · Nhà máy sấy Đồng Xanh", ve: () => ({ than: `
    <h2 class="m-tieu">Bác thấy bên mua này thế nào?</h2>
    <div style="display:flex;gap:8px;justify-content:center;color:var(--vang)" id="sao">${[1, 2, 3, 4, 5].map((k) => `<button type="button" data-sao="${k}" aria-label="${k} sao" style="border:0;background:none;color:${k <= 5 ? "var(--vang)" : "var(--ke-dam)"};width:48px;height:48px;cursor:pointer">${ic("sao", 40)}</button>`).join("")}</div>
    <div class="m-loc">${["Trả tiền đúng giờ", "Xe tới đúng hẹn", "Cân rõ ràng", "Lịch sự"].map((t, i) => `<button type="button" aria-pressed="${i < 2}">${t}</button>`).join("")}</div>
    <label class="m-o"><span>Ghi thêm</span><textarea>Chị Hà làm việc nhanh, rõ ràng.</textarea></label>
    <p class="m-ghi">Bên mua cũng đánh giá bác. Hai bên chỉ thấy đánh giá của nhau sau khi cả hai đã gửi.</p>`,
    day: nut("Gửi đánh giá", { id: "dg", lop: "m-vang m-rong" }) }),
    sau: (el, s, t, api) => { el.querySelectorAll("[data-sao]").forEach((b) => b.addEventListener("click", () => el.querySelectorAll("[data-sao]").forEach((x) => { x.style.color = Number(x.dataset.sao) <= Number(b.dataset.sao) ? "var(--vang)" : "var(--ke-dam)"; x.animate([{ transform: "scale(.8)" }, { transform: "scale(1.15)" }, { transform: "none" }], { duration: 260 }); }))); el.querySelector("#dg").addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đã gửi"); api.doi((x) => { x.hd.buoc = 15; }); api.toast("Đã gửi đánh giá · HĐ-0018 hoàn tất"); api.lui(); }); } },

  // ── Tiền ──
  tien: { tieu: "Tiền hàng", phu: "Agribank •••• 2186", tab: "tien", ve: (s) => ({ than: `
    <section class="m-the" style="background:var(--la);color:#f4f1e8;box-shadow:none"><small style="opacity:.75">Đã nhận tháng này</small><b class="m-so" style="font-size:32px">${d(28760000 + (s.hd.buoc >= 7 ? TIEN.TRA_THANG : 0) + (s.hd.buoc >= 13 ? TIEN.COC_CHO_BAC : 0))}</b><small style="opacity:.75">vào tài khoản Agribank •••• 2186</small></section>
    <div class="m-hai-o"><div class="m-the m-so-lon m-tien"><small>Ngân hàng đang giữ cọc</small><b style="font-size:20px">${d(s.hd.buoc >= 4 && s.hd.buoc < 13 ? TIEN.COC : 0)}</b></div><div class="m-the m-so-lon"><small>Bên mua còn phải trả</small><b style="font-size:20px">${d(s.hd.buoc < 7 ? TIEN.TRA_THANG : 0)}</b></div></div>
    ${the("Theo hợp đồng", dong("HĐ-0018 · Đồng Xanh", nhan(s.hd.buoc >= 15 ? "Đã nhận đủ" : "Đang chạy", s.hd.buoc >= 15 ? "m-n-xong" : "m-n-tien")) + dong("HĐ-0011 · Bếp Sen", nhan("Tuần 4 chờ giao", "")) + dong("HĐ-0009 · Tân Thuận", nhan("Đã nhận đủ", "m-n-xong")), lk("Quyết toán", "quyet-toan"))}
    <div class="m-hai-o">${nut("Lịch sử tiền", { ma: "lich-su-tien", lop: "m-phu m-nho" })}${nut("Nhận tiền trước", { ma: "ung-tien", lop: "m-phu m-nho" })}</div>` }) },
  "tien-ve": { tieu: "Tiền đã về", phu: "HĐ-0018", ve: () => ({ than: `
    <div style="display:grid;justify-items:center;text-align:center;gap:10px;padding:24px 0"><span class="m-nay" style="width:96px;height:96px;border-radius:50%;background:var(--vang-nhat);color:var(--chin);display:grid;place-items:center">${ic("tien", 46)}</span><small class="m-ghi">Ngân hàng vừa chuyển</small><b class="m-so" id="so-ve" style="font-size:34px;color:var(--chin);border-radius:8px">${d(TIEN.COC_CHO_BAC)}</b><p class="m-ghi">vào Agribank •••• 2186 · 28/10 15:42</p></div>
    ${the("HĐ-0018 tổng cộng", dong("Bên mua trả thẳng", d(TIEN.TRA_THANG)) + dong("Ngân hàng chuyển từ cọc", d(TIEN.COC_CHO_BAC)) + dong("Bác nhận tổng", d(TIEN.NGHIEM_THU), "m-tong"))}
    <p class="m-ghi">Chỉ bấm khi đã thấy tiền trong tài khoản. Chưa thấy thì báo, AgiViet kiểm với ngân hàng.</p>`,
    day: `<div class="m-hang-nut">${nut("Chưa thấy", { lop: "m-phu" })}${nut("Đã thấy tiền về", { id: "ve", lop: "m-vang" })}</div>` }),
    sau: (el, s, t, api) => (window.HieuUng?.demSo(el.querySelector("#so-ve"), 0, TIEN.COC_CHO_BAC), el.querySelector("#ve").addEventListener("click", async (e) => { await api.xong(e.currentTarget, "Đã nhận tiền"); api.doi((x) => { if (x.hd.buoc === 13) x.hd.buoc = 14; }); api.toast("Đã xác nhận tiền về"); api.thay("danh-gia"); })) },
  "quyet-toan": { tieu: "Quyết toán", phu: "HĐ-0018 · từng bước", ve: () => ({ than: `
    ${the("Cách tính", dong("Tiền hàng theo kết quả cân", d(TIEN.NGHIEM_THU)) + dong("− Bác chịu bồi thường", "0 đ") + dong("= Bác được nhận tổng", d(TIEN.NGHIEM_THU), "m-tong") + dong("− Bên mua đã trả thẳng", d(TIEN.TRA_THANG)) + dong("= Ngân hàng chuyển từ cọc cho bác", d(TIEN.COC_CHO_BAC), "m-tong") + dong("Cọc dư hoàn bên mua", d(TIEN.HOAN_BEN_MUA)))}`,
    day: nut("Nghe đọc bảng tính", { lop: "m-phu m-rong", icon: "tai" }) }) },
  "lich-su-tien": { tieu: "Lịch sử tiền", phu: "Agribank •••• 2186", ve: (s) => ({ than: s.lichSuTien.map((t) => the(t.thang, t.dong.map(([n, nd, so2]) => dong(`${n} · ${esc(nd)}`, `<span style="color:var(--la)">+${so(so2)}</span>`)).join(""))).join("") }) },
  "ung-tien": { tieu: "Nhận tiền trước", phu: "Đang thử nghiệm", ve: () => ({ than: `
    ${viec("Chưa mở cho mọi người", "Nhận trước một phần tiền hàng khi hợp đồng đã có cọc. AgiViet đang thử với vài HTX, chưa có phí chính thức.", "", "m-cho")}
    ${the("Ví dụ HĐ-0018", dong("Ngân hàng đang giữ cọc", d(TIEN.COC)) + dong("Có thể nhận trước tối đa", "Chưa công bố"))}`,
    day: nut("Báo tôi khi có", { lop: "m-phu m-rong" }) }) },

  // ── Tôi ──
  toi: { tieu: "Tôi", phu: "Cài đặt & hỗ trợ", ve: (s) => ({ than: `
    <section class="m-the" style="grid-template-columns:64px 1fr;align-items:center"><span style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--la-nhat);color:var(--la);font-weight:700;font-size:24px">N</span><span><b style="font-size:18px">${esc(s.ho.ten)}</b><span class="m-ghi" style="display:block">${esc(s.ho.noi)}</span>${nhan("Đã xác minh", "m-n-xong")}</span></section>
    ${[["sao", "Uy tín của tôi", "uy-tin"], ["khien", "Phần hàng và giấy tờ của tôi", "phan-cua-toi"], ["tien", "Tài khoản nhận tiền", "tai-khoan-nhan"], ["xe", "Kiểm nghiệm, xe, kho", "dich-vu"], ["nguoi", "Người giúp", "nguoi-giup"], ["cai", "Cài đặt", "cai-dat"], ["khoa", "Bảo mật", "bao-mat"], ["khien", "Quyền riêng tư", "rieng-tu"], ["tai", "Trung tâm hỗ trợ", "ho-tro"]].map(([i, t, m]) => `<div class="m-hang" data-di="${m}" style="grid-template-columns:40px 1fr auto;padding:10px 12px"><span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--la-nhat);color:var(--la)">${ic(i, 20)}</span><b>${t}</b>${ic("toi", 18)}</div>`).join("")}` }) },
  "uy-tin": { tieu: "Uy tín của tôi", phu: "Bên mua thấy trước khi chào giá", ve: (s) => ({ than: `
    <div class="m-hai-o"><div class="m-the m-so-lon m-tien"><small>Bên mua chấm</small><b>${s.ho.uyTin}★</b></div><div class="m-the m-so-lon"><small>Đơn đã xong</small><b>${s.ho.soDon}</b></div></div>
    ${the("Từng mục", [["Giao đủ lượng", 97], ["Đúng loại", 94], ["Đúng hẹn", 100]].map(([a, b]) => `<div style="display:grid;gap:4px;padding:6px 0"><div style="display:flex;justify-content:space-between"><span>${a}</span><b>${b}%</b></div><div style="height:8px;border-radius:4px;background:var(--giay-sau)"><i style="display:block;height:100%;width:${b}%;border-radius:4px;background:var(--la)"></i></div></div>`).join(""))}
    ${the("Bên mua nói gì", [["Nhà máy Đồng Xanh", "Hàng đều, cân đúng, bốc đúng giờ.", 5], ["Vựa Ba Cường", "Có 2% dập, chị chủ động báo trước.", 4]].map(([a, b, c]) => `<div class="m-dong" style="display:block"><b>${a} · ${"★".repeat(c)}</b><p class="m-ghi">${b}</p></div>`).join(""))}` }) },
  "dich-vu": { tieu: "Kiểm nghiệm, xe, kho", phu: "Đối tác của AgiViet", ve: () => ({ than: [["khien", "Kiểm dư lượng thuốc", "Lấy mẫu tại vườn · 24–48 giờ · từ 850.000 đ"], ["xe", "Xe chở hàng", "Xe thường, xe lạnh, ghép chuyến"], ["la", "Kho lạnh gần vườn", "Gửi theo ngày"]].map(([i, t, g]) => `<div class="m-hang" data-di="dat-dich-vu"><span class="m-anh" style="display:grid;place-items:center;background:var(--la-nhat);color:var(--la)">${ic(i, 28)}</span><span><b>${t}</b><small>${g}</small></span>${ic("toi", 18)}</div>`).join("") }) },
  "dat-dich-vu": { tieu: "Đặt dịch vụ", phu: "Kiểm dư lượng thuốc", ve: () => ({ than: `
    ${chon("dv", [["Trung tâm kiểm định Cần Thơ", "850.000 đ · kết quả 24 giờ"], ["Vinacontrol Đồng Tháp", "1.100.000 đ · kết quả 12 giờ"]])}
    ${o("Ngày lấy mẫu", "05/11/2026")}`,
    day: nut("Đặt lịch", { lop: "m-vang m-rong" }) }) },
  "cai-dat": { tieu: "Cài đặt", ve: () => ({ than: `
    ${the("Chữ và giọng", `<div class="m-loc"><button type="button" aria-pressed="false">Bình thường</button><button type="button" aria-pressed="true">Lớn</button><button type="button" aria-pressed="false">Rất lớn</button></div>` + dong("Tốc độ đọc", "Chậm") + dong("Tự đọc thông báo", nhan("Bật", "m-n-xong")))}
    ${the("Thông báo", dong("Lời chào mới", nhan("Bật", "m-n-xong")) + dong("Thời tiết nguy hiểm", nhan("Bật", "m-n-xong")) + dong("Tin ngành", nhan("Mỗi sáng", "")))}` }) },
  "ho-tro": { tieu: "Trung tâm hỗ trợ", ve: () => ({ than: `
    ${[["Cọc là gì, ai giữ?", "Ngân hàng đối tác giữ, không ai rút được"], ["Bên mua không trả tiền thì sao?", "Không cho bốc khi chưa đủ tiền"], ["Phản đối kết quả cân thế nào?", "Phản đối từng dòng trong 24 giờ"]].map(([t, g]) => `<div class="m-hang" style="grid-template-columns:1fr auto"><span><b>${t}</b><small>${g}</small></span>${ic("toi", 18)}</div>`).join("")}`,
    day: `<div class="m-hang-nut m-deu">${nut("Gọi tổng đài", { lop: "m-phu", icon: "dien" })}${nut("Nhắn AgiViet", { ma: "can-ho-tro", lop: "m-vang" })}</div>` }) },
  "can-ho-tro": { tieu: "Cần hỗ trợ", phu: "Nhân viên AgiViet trả lời", ve: () => ({ than: `
    <div class="m-loc">${["Tiền chưa về", "Không ký được", "Bên mua không trả lời", "Khác"].map((t, i) => `<button type="button" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>
    <label class="m-o"><span>Bác nói hoặc gõ</span><textarea>Tiền cọc HĐ-0009 chưa thấy về Agribank.</textarea></label>
    ${nut("Nói thay vì gõ", { lop: "m-phu m-rong", icon: "mic" })}`,
    day: nut("Gửi cho AgiViet", { lop: "m-vang m-rong" }) }) },
  "trang-thai": { tieu: "Lỗi mẫu", phu: "Các trạng thái màn", ve: () => ({ than: `
    ${viec("Mất mạng", "Nhật ký và bài nháp vẫn lưu trên máy, có mạng sẽ tự gửi. Ký, tiền cần có mạng.", "", "m-cho")}
    ${viec("Không tải được hợp đồng", "Bác thử lại, hoặc gọi tổng đài nếu vẫn lỗi.", `<div>${nut("Tải lại", { lop: "m-phu m-rong" })}</div>`, "m-gap")}
    <section class="m-the"><div class="m-rong" style="text-align:center;padding:16px;display:grid;gap:8px;justify-items:center"><b>Chưa có lời chào nào</b><span class="m-ghi">Đăng lô rõ ảnh, đúng lượng để bên mua tìm thấy.</span>${nut("Đăng hàng", { ma: "dang", lop: "m-phu m-nho" })}</div></section>` }) },
  "nguoi-giup": { tieu: "Người giúp", phu: "Con cháu dùng app hộ", ve: () => ({ than: `
    ${the("Đang giúp bác", dong("Nguyễn Văn Tâm (con)", nhan("Đăng hàng, ghi nhật ký", "m-n-xong")))}
    <p class="m-ghi">Người giúp không ký hợp đồng, không xác nhận tiền, không xin hủy được.</p>`,
    day: nut("Mời người giúp", { lop: "m-vang m-rong", icon: "nguoi" }) }) },
  "tai-khoan-nhan": { tieu: "Tài khoản nhận tiền", ve: () => ({ than: `
    ${the("Đang dùng", dong("Ngân hàng", "Agribank") + dong("Số tài khoản", "•••• 2186") + dong("Chủ tài khoản", "Nguyễn Thị Năm") + dong("Kiểm tên", nhan("Đúng tên", "m-n-xong")))}
    ${viec("Đổi tài khoản phải chờ 24 giờ", "Để chống kẻ gian đổi tài khoản lấy tiền. Trong 24 giờ, tiền vẫn về tài khoản cũ.", "", "m-cho")}`,
    day: nut("Đổi tài khoản", { lop: "m-phu m-rong" }) }) },
  "bao-mat": { tieu: "Bảo mật", ve: () => ({ than: the("", dong("Mã PIN 4 số", nhan("Đã đặt", "m-n-xong")) + dong("Đăng nhập bằng vân tay", nhan("Bật", "m-n-xong")) + dong("Máy đang đăng nhập", "Điện thoại này")) + `<p class="m-ghi">AgiViet không bao giờ hỏi mã OTP hay mã PIN của bác qua điện thoại.</p>`, day: nut("Đăng xuất máy khác", { lop: "m-huy m-rong" }) }) },
  "rieng-tu": { tieu: "Quyền riêng tư", ve: () => ({ than: the("Bên mua thấy gì", dong("Tên hay gọi", "Chị Năm") + dong("Vị trí vườn", "Tới cấp ấp") + dong("Số điện thoại", "Sau khi ngân hàng giữ cọc") + dong("Giá thấp nhất", "Không bao giờ")) }) },
  "phan-cua-toi": { tieu: "Phần hàng và giấy tờ", phu: "Cập nhật hồ sơ, xin xác minh", ve: () => ({ than: `
    ${the("Giấy tờ", dong("Căn cước", nhan("Đã xác minh", "m-n-xong")) + dong("Mã vùng trồng", nhan("Đã xác minh", "m-n-xong")) + dong("VietGAP", nhan("Chưa có", "")) + dong("Kiểm dư lượng 15/10", nhan("Chờ duyệt", "m-n-tien")))}
    ${viec("Chưa có giấy kiểm định?", "Bác đặt nhân viên tới vườn lấy mẫu, hoặc chụp giấy đang có để AgiViet duyệt. Được duyệt thì lô có nhãn \"Đã kiểm\".", `<div class="m-hai-o">${nut("Chụp giấy tờ", { lop: "m-phu m-nho", icon: "anh" })}${nut("Đặt kiểm định", { ma: "dat-dich-vu", lop: "m-phu m-nho" })}</div>`)}` }) },
};
