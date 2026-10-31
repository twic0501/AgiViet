// Màn 21–41: Bán · Hàng · Đăng hàng · Khách (tin nhắn trực tiếp kiểu Zalo) + Thời tiết, Giá & tin tức
import { esc, d, so, kg, ic, the, dong, viec, nhan, lk, nut, chon, o, hangLo } from "./tien-ich.js";

const lo = (s, ma) => s.lo.find((x) => x.ma === ma) || s.lo[0];
const buocDang = (i, ten) => `<div style="display:flex;align-items:center;gap:10px"><span class="m-nhan m-n-xong">Bước ${i}/4</span><b>${ten}</b></div><div style="height:6px;border-radius:3px;background:var(--giay-sau)"><i style="display:block;height:100%;width:${i * 25}%;border-radius:3px;background:var(--la);transition:width .5s var(--em)"></i></div>`;

// Phát hiện liên lạc (mô phỏng phía app): số ≥ 8 chữ số (kể cả đọc bằng chữ), Zalo/Facebook/@
const SO_CHU = { "không": 0, "khong": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "bẩy": 7, "tám": 8, "chín": 9 };
export function quetLienLac(t) {
  const thap = t.toLowerCase();
  const doiChu = thap.split(/\s+/).map((w) => (w in SO_CHU ? String(SO_CHU[w]) : w)).join(" ");
  const coSo = /(\d[\s.\-_]*){8,}/.test(doiChu);
  const coKenh = /\b(zalo|zl|facebook|fb|messenger|viber|telegram|tele|sđt|sdt)\b|@[a-z0-9_.]{3,}|kết bạn/.test(thap);
  if (!coSo && !coKenh) return { sach: true, che: t };
  let che = t.replace(/(\d[\s.\-_]*){8,}/g, (x) => "••• ••• •••" + (/\s$/.test(x) ? " " : "")).replace(/\b(zalo|zl|facebook|fb|messenger|viber|telegram|tele)\b/gi, "•••").replace(/@[A-Za-z0-9_.]{3,}/g, "•••");
  if (!coSo && coKenh) che = che;
  if (coSo && che === t) che = "Tin có số điện thoại đọc bằng chữ (đã che)";
  return { sach: false, che, loai: coSo ? "số điện thoại" : "kênh nhắn ngoài" };
}

const veTin = (m) => {
  if (m.k === "he") return `<div class="m-he-thong ${m.canh ? "m-canh" : ""}">${ic(m.canh ? "canh" : "khien", 16)}<span>${esc(m.t)}</span></div>`;
  if (m.k === "anh") return `<div class="m-tin m-anh-tin ${m.ai === "toi" ? "m-toi" : "m-ho"}"><div class="m-anh-chat" style="background-image:url(${esc(m.anh)})"></div><small style="padding:2px 8px">${esc(m.luc)}</small></div>`;
  if (m.k === "gia") {
    const toi = m.ai === "toi", cho = m.trang === "cho-bac" && !toi;
    return `<div class="m-the-gia ${toi ? "m-cua-toi" : ""}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${toi ? "Bác trả giá" : "Bên mua trả giá"}</b>${m.trang === "dong-y" ? nhan("Hai bên đã đồng ý", "m-n-xong") : m.trang === "khong" ? nhan("Bác không bán", "") : cho ? nhan("Chờ bác trả lời", "m-n-bac") : nhan(toi ? "Chờ bên mua" : "Đã trả lại", "")}</div>
      <div class="m-gia"><span class="m-ghi">${kg(m.luong)} · ${esc(m.ghi || "")}</span><b>${so(m.gia)} đ/kg</b></div>
      <div class="m-ghi">Thành tiền ${d(m.gia * m.luong)} (trước phí, chi phí chở)</div>
      ${cho ? `<div class="m-hang-nut m-deu"><button class="m-nut m-phu m-nho" type="button" data-gia="tra">Trả giá</button><button class="m-nut m-vang m-nho" type="button" data-gia="dong-y">Đồng ý ${so(m.gia)}</button></div><button class="m-nut m-chu m-nho" type="button" data-gia="khong" style="color:var(--do)">Không bán</button>` : ""}</div>`;
  }
  return `<div class="m-tin ${m.ai === "toi" ? "m-toi" : "m-ho"}">${m.che ? esc(m.t).replace(/•••[ •]*/g, (x) => `<span class="m-che">${x}</span>`) : esc(m.t)}<small>${esc(m.luc)}</small></div>`;
};

export const MAN_2 = {
  // ── Hàng ──
  hang: { tieu: "Chợ", phu: "Hàng của bác · bên mua cần", tab: "hang", ve: (s) => ({ than: `
    <div class="m-loc"><button type="button" aria-pressed="true">Hàng của tôi</button><button type="button" aria-pressed="false" data-di="nhu-cau">Bên mua cần ${s.canMua.length}</button></div>
    ${s.lo.map(hangLo).join("")}
    ${nut("Đăng thêm hàng", { ma: "dang", lop: "m-phu m-rong", icon: "them" })}
    ${the("Lô gộp nhiều hộ", `<p class="m-ghi">HTX Mỹ Xương gom xoài của 6 hộ thành lô 5 tấn cho bên xuất khẩu.</p>`, lk("Xem", "lo-gop"))}` }) },
  "chi-tiet-lo": { tieu: (s, t) => `${lo(s, t.lo).ma} · ${lo(s, t.lo).ten}`, phu: (s, t) => lo(s, t.lo).loai, ve_tu: "hang", ve: (s, t) => { const l = lo(s, t.lo); return { than: `
    <div style="aspect-ratio:16/10;border-radius:18px;background:url(/assets/products/xoai-cat-chu.jpg) center/cover"></div>
    <div class="m-hai-o"><div class="m-the m-so-lon"><small>Còn bán</small><b style="font-size:24px">${kg(l.con)}</b></div><div class="m-the m-so-lon m-tien"><small>Giá mong muốn</small><b style="font-size:24px">${so(l.gia)}</b><span class="m-ghi">đ/kg</span></div></div>
    ${the("Lô hàng", dong("Đã khai", kg(l.khai)) + dong("Ngày hái", l.hai) + dong("Giá thấp nhất (bên mua không thấy)", `${so(l.san)} đ/kg`) + dong("Trạng thái", l.trang === "sap-co" ? nhan("Sắp có hàng", "m-n-tien") : nhan("Đang bán", "m-n-xong")))}
    ${l.chao ? viec(`${l.chao} lời chào đang chờ`, "Đồng Xanh trả 23.000 đ/kg cho 2.000 kg.", `<div>${nut("Mở tin nhắn", { ma: "chat", tham: { ma: "T1" }, lop: "m-vang m-rong" })}</div>`) : ""}
    <div class="m-hai-o">${nut("Còn lại bao nhiêu?", { ma: "cap-nhat-luong", tham: { lo: l.ma }, lop: "m-phu" })}${nut("Chứng từ", { ma: "chung-tu", lop: "m-phu" })}</div>` }; } },
  "cap-nhat-luong": { tieu: "Còn lại bao nhiêu?", phu: (s, t) => lo(s, t.lo).ma, ve_tu: "hang", ve: (s, t) => { const l = lo(s, t.lo); return { than: `
    <h2 class="m-tieu">Lô ${l.ma} còn bao nhiêu ký?</h2>
    <label class="m-o"><span>Còn lại (kg)</span><input inputmode="numeric" value="${l.con}" style="font-size:28px;font-weight:700" id="con"></label>
    <div class="m-loc">${[-500, -100, 100, 500].map((k) => `<button type="button" data-cong="${k}">${k > 0 ? "+" : "−"}${Math.abs(k)} kg</button>`).join("")}</div>
    ${chon("can", [["Ước chừng", "Bên mua đặt tối đa 80% lượng này"], ["Đã cân", "Bên mua đặt được hết"]])}`,
    day: nut("Lưu", { id: "luu", lop: "m-vang m-rong" }) }; },
    sau: (el, s, t, api) => { const i = el.querySelector("#con"); el.querySelectorAll("[data-cong]").forEach((b) => b.addEventListener("click", () => { i.value = Math.max(0, Number(i.value) + Number(b.dataset.cong)); i.animate([{ transform: "scale(1.04)" }, { transform: "none" }], { duration: 200 }); })); el.querySelector("#luu").addEventListener("click", () => { api.doi((x) => { lo(x, t.lo).con = Number(i.value); }); api.toast(`Đã cập nhật ${t.lo || "L-0412"}: còn ${so(i.value)} kg`); api.lui(); }); } },
  "sap-co-hang": { tieu: "Sắp có hàng", phu: "L-0414 · hái từ 12/11", ve_tu: "hang", ve: (s) => ({ than: `
    ${viec("Bên mua đặt trước được", "Lô hiện cho bên mua dạng \"sắp có hàng\". Cọc chỉ chuyển khi hai bên ký.", "", "m-cho")}
    ${the("Lô L-0414", dong("Dự kiến", "2.000 kg loại 1") + dong("Hái từ", "12/11 (sau cách ly 09/11)") + dong("Giá mong muốn", "24.000 đ/kg"))}
    ${the("Nhắc trước ngày hái", dong("07/11", "Chụp ảnh vườn") + dong("11/11", "Xác nhận lượng thật"))}`,
    day: nut("Xác nhận còn đúng kế hoạch", { lop: "m-vang m-rong" }) }) },
  "chung-tu": { tieu: "Chứng từ", phu: "Giấy tờ đi kèm lô", ve_tu: "hang", ve: () => ({ than: `
    ${[["Phiếu kiểm dư lượng thuốc", "Trung tâm Cần Thơ · 15/10", "Đã xác minh", "m-n-xong"], ["Mã vùng trồng VN-DT-0412", "Sở NN Đồng Tháp", "Đã xác minh", "m-n-xong"], ["Ảnh vườn trước hái", "8 ảnh · chụp trong app", "Chụp trong app", "m-n-xong"], ["Hóa đơn phân bón", "Tự tải lên", "Tự khai", ""]].map(([t, g, n, l]) => `<div class="m-hang" style="grid-template-columns:44px 1fr auto"><span class="m-anh" style="width:44px;height:44px;display:grid;place-items:center;background:var(--la-nhat);color:var(--la)">${ic("hd", 22)}</span><span><b>${t}</b><small>${g}</small></span>${nhan(n, l)}</div>`).join("")}`,
    day: nut("Chụp thêm chứng từ", { lop: "m-phu m-rong", icon: "anh" }) }) },
  "lo-gop": { tieu: "Lô gộp nhiều hộ", phu: "HTX Mỹ Xương · L-G021", ve_tu: "hang", ve: () => ({ than: `
    <div class="m-so-lon"><small>Phần của bác trong lô gộp</small><b>1.200 kg</b><span class="m-ghi">trên tổng 5.000 kg · 6 hộ</span></div>
    ${the("Các hộ", [["Chị Năm (bác)", 1200], ["Anh Tư", 900], ["Chú Bảy", 1000], ["Cô Ba", 700], ["Anh Sáu", 600], ["Chị Út", 600]].map(([a, b]) => dong(a, kg(b))).join(""))}
    <p class="m-ghi">HTX ký với bên mua. Tiền về HTX rồi chia theo phần cân thật của từng hộ.</p>` }) },

  // ── Đăng hàng ──
  dang: { tieu: "Đăng hàng", phu: "Chọn cách bác thấy dễ", ve: () => ({ than: `
    <h2 class="m-tieu">Bác đăng bán lô nào?</h2>
    <div class="m-hang" style="cursor:default"><span class="m-anh m-anh-xoai"></span><span><b>Xoài cát Chu</b><small>Vườn xoài ấp 3 · đã xác minh</small></span>${lk("Đổi", "chon-mat-hang")}</div>
    ${[["mic", "Nói", "App hỏi từng câu, bác trả lời", "nghe"], ["so", "Theo nhật ký", "Lấy lần thu hoạch đã ghi", "kiem-tra"], ["hd", "Điền từng ô", "Tự gõ lượng, ngày, giá", "chup"]].map(([i, t, g, m]) => `<div class="m-hang" data-di="${m}"><span class="m-anh" style="display:grid;place-items:center;background:var(--vang-nhat);color:var(--chin)">${ic(i, 28)}</span><span><b>${t}</b><small>${g}</small></span>${ic("toi", 20)}</div>`).join("")}` }) },
  "chon-mat-hang": { tieu: "Chọn mặt hàng", phu: "Đăng hàng", ve: () => ({ than: `
    ${chon("mh", [["Xoài cát Chu", "Vườn xoài ấp 3 · đã xác minh"], ["Xoài cát Hòa Lộc", "Chưa xác minh · cần ảnh vườn"]])}
    <div class="m-hai-o">${["Loại 1", "Loại 2"].map((t, i) => `<button class="m-nut ${i ? "m-phu" : ""}" type="button">${t}</button>`).join("")}</div>`,
    day: nut("Tiếp tục", { ma: "chup", lop: "m-vang m-rong" }) }) },
  chup: { tieu: "Chụp ảnh hàng", phu: "Bước 1/4", ve: () => ({ than: `
    ${buocDang(1, "Ảnh hàng")}
    <div class="m-khung-chup">${ic("anh", 48)}<span style="position:absolute;bottom:16px;font-size:14px">Để trái xoài trong khung</span></div>
    <div class="m-luoi-anh"><span style="background-image:url(/assets/products/xoai-cat-chu.jpg)"></span><span style="background-image:url(/assets/products/xoai-cat-chu.jpg);filter:saturate(1.3)"></span><span style="background:var(--giay-lot)"></span></div>
    <p class="m-ghi">Ảnh chụp ngay trong app được nhãn "Chụp trong app", bên mua tin hơn ảnh có sẵn.</p>`,
    day: `<div class="m-hang-nut">${nut("Ảnh có sẵn", { lop: "m-phu" })}${nut("Tiếp tục", { ma: "kiem-tra", lop: "m-vang" })}</div>` }) },
  nghe: { tieu: "Đang nghe", phu: "Đăng hàng bằng giọng nói", ve: () => ({ than: `
    ${buocDang(2, "Lượng, ngày")}
    <section class="m-the" style="background:var(--la);color:#f4f1e8;box-shadow:none"><small style="opacity:.75">App hỏi</small><p style="font-size:20px;font-weight:600">Đợt này bác còn bán bao nhiêu ký? Đã cân hay ước chừng?</p></section>
    <div class="m-mic">${ic("mic", 44)}</div>
    <section class="m-the" style="background:var(--giay-lot);box-shadow:none"><p style="font-size:18px">"Còn khoảng ba tấn rưỡi, ước chừng thôi"</p></section>
    <p class="m-ghi" style="text-align:center">App sẽ đọc lại để bác nghe đúng chưa.</p>`,
    day: nut("Dừng, gõ tay", { ma: "kiem-tra", lop: "m-phu m-rong" }) }) },
  "kiem-tra": { tieu: "Kiểm tra", phu: "Bước 3/4", ve: () => ({ than: `
    ${buocDang(3, "Giá")}
    <div class="m-hai-o">${o("Lượng (kg)", "3500")}${o("Ngày hái", "27/10")}</div>
    ${chon("ld", [["Ước chừng", "Bên mua đặt tối đa 80%"], ["Đã cân", ""]])}
    <div class="m-hai-o">${o("Giá mong muốn", "23.000", "đ/kg")}${o("Giá thấp nhất", "21.500", "Bên mua không thấy")}</div>
    ${viec("Giá tham khảo tuần này", "Xoài cát Chu loại 1: 21.500–24.000 đ/kg tại vườn (từ các lô trên AgiViet).", "", "m-cho")}
    ${viec("Từ lần phun 12/10 tới giờ, bác có xịt thêm không?", "", `<div class="m-hang-nut m-deu">${nut("Có", { ma: "cach-ly", lop: "m-phu" })}${nut("Không xịt thêm", { lop: "m-phu" })}</div>`)}`,
    day: nut("Xem lại", { ma: "xem-lai", lop: "m-vang m-rong" }) }) },
  "xem-lai": { tieu: "Xem lại", phu: "Bước 4/4", ve: () => ({ than: `
    ${buocDang(4, "Đăng")}
    <div style="aspect-ratio:16/9;border-radius:18px;background:url(/assets/products/xoai-cat-chu.jpg) center/cover"></div>
    ${the("Bên mua sẽ thấy", dong("Hàng", "Xoài cát Chu · Loại 1") + dong("Lượng", "3.500 kg (ước chừng)") + dong("Hái", "27/10") + dong("Giá", "23.000 đ/kg") + dong("Vườn", "Mỹ Xương, Cao Lãnh"), lk("Sửa", "kiem-tra"))}
    <p class="m-ghi">Bên mua không thấy giá thấp nhất và số điện thoại của bác.</p>`,
    day: nut("Đăng lên chợ", { ma: "xong", lop: "m-vang m-rong" }) }) },
  xong: { tieu: "Đã đăng", khongDau: false, phu: "L-0415", ve: () => ({ than: `
    <div style="display:grid;justify-items:center;text-align:center;gap:12px;padding:32px 0"><span class="m-nay" style="width:88px;height:88px;border-radius:50%;background:var(--la);color:#f4f1e8;display:grid;place-items:center">${ic("tich", 44)}</span><h2 class="m-tieu">Lô L-0415 đã lên chợ</h2><p class="m-ghi">12 bên mua đang tìm xoài cát Chu sẽ thấy lô này. Có lời chào, app báo ngay.</p></div>`,
    day: `${nut("Về trang chủ", { ma: "hom-nay", lop: "m-vang m-rong" })}${nut("Xem lô", { ma: "chi-tiet-lo", tham: { lo: "L-0412" }, lop: "m-chu m-rong" })}` }) },

  // ── Khách: danh sách hội thoại (tab Tin nhắn) ──
  khach: { tieu: "Tin nhắn", phu: "Hộ Nguyễn Thị Năm", tab: "khach", ve: (s) => ({ than: `
    <div class="m-loc"><button type="button" aria-pressed="true">Tất cả</button><button type="button" aria-pressed="false">Chờ bác ${s.hoiThoai.filter((h) => h.chuaDoc).length}</button><button type="button" aria-pressed="false" data-di="nhu-cau">Bên mua cần</button></div>
    ${s.hoiThoai.map((h) => { const cuoi = h.tin.filter((m) => m.k !== "he").at(-1); const chu = cuoi.k === "gia" ? `${cuoi.ai === "toi" ? "Bác" : "Bên mua"} trả ${so(cuoi.gia)} đ/kg` : cuoi.k === "anh" ? "Ảnh" : cuoi.t; return `<div class="m-hang" data-di="chat" data-tham='{"ma":"${h.ma}"}' style="grid-template-columns:52px minmax(0,1fr) auto"><span class="m-anh" style="width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--la-nhat);color:var(--la);font-weight:700;font-size:18px">${esc(h.ben.split(" ").at(-1)[0])}</span><span style="min-width:0"><b style="display:flex;gap:6px;align-items:center">${esc(h.ben)}${h.xm ? `<span style="color:var(--la)" title="Đã xác minh">${ic("khien", 16)}</span>` : ""}</b><small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${h.chuaDoc ? "color:var(--muc);font-weight:600" : ""}">${esc(chu)}</small></span><span style="display:grid;justify-items:end;gap:4px"><small class="m-ghi">${esc(cuoi.luc.split(" ").at(-1))}</small>${h.chuaDoc ? `<span class="m-dem" style="position:static;min-width:22px;height:22px;border-radius:11px;background:var(--do);color:#fff;font-size:12px;display:grid;place-items:center">${h.chuaDoc}</span>` : ""}</span></div>`; }).join("")}
    <p class="m-ghi">Nhắn qua AgiViet để có bằng chứng khi tranh chấp. Số điện thoại hai bên che tới khi ngân hàng giữ cọc.</p>` }) },
  "nhu-cau": { tieu: "Cần mua", phu: "Bên mua đang tìm hàng như của bác", ve_tu: "hang", ve: (s) => ({ than: s.canMua.map((n) => `<section class="m-the" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(n.ben)}</b>${n.xm ? nhan("Đã xác minh", "m-n-xong") : nhan("Chưa xác minh", "")}</div><p>${esc(n.hang)} · <b>${kg(n.luong)}</b></p><p class="m-ghi">${esc(n.khi)} · ${esc(n.noi)} · ${n.uy}★</p><div class="m-hang-nut m-deu">${nut("Hồ sơ", { ma: "ho-so-ben-mua", lop: "m-phu m-nho" })}${nut("Chào hàng", { ma: "bao-gia", lop: "m-vang m-nho" })}</div></section>`).join("") }) },
  "ket-noi": { tieu: "Khách muốn nói chuyện", phu: "Lời mời mới", ve: () => ({ than: `
    <div style="display:grid;justify-items:center;text-align:center;gap:10px;padding:16px 0"><span style="width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:var(--la-nhat);color:var(--la);font-size:30px;font-weight:700" class="m-nay">X</span><h2 class="m-tieu">Nhà máy sấy Đồng Xanh</h2><p class="m-ghi">muốn hỏi về lô L-0412 · 4,7★ · 15 đơn đã xong</p></div>
    ${the("Họ hỏi", `<p>"Chị còn đủ 2 tấn loại 1 giao 28/10 không?"</p>`)}
    <p class="m-ghi">Nhận lời thì mở trò chuyện. Số điện thoại vẫn che tới khi có cọc.</p>`,
    day: `<div class="m-hang-nut">${nut("Từ chối", { lop: "m-phu" }).replace('type="button"', 'type="button" data-lui')}${nut("Nhận lời, nhắn tin", { ma: "chat", tham: { ma: "T1" }, lop: "m-vang" })}</div>` }) },
  "ho-so-ben-mua": { tieu: "Nhà máy sấy Đồng Xanh", phu: "Hồ sơ bên mua", ve: () => ({ than: `
    <div class="m-hai-o"><div class="m-the m-so-lon"><small>Trả đúng hạn</small><b>98%</b></div><div class="m-the m-so-lon"><small>Người bán chấm</small><b>4,7★</b></div></div>
    ${the("Đã xác minh", dong("Giấy phép kinh doanh", nhan("Đã xác minh", "m-n-xong")) + dong("Tài khoản công ty", nhan("Đúng tên", "m-n-xong")) + dong("Kho nhận hàng", "KCN Sa Đéc"))}
    ${the("Người bán nói gì", [["Anh Sáu · Bến Tre", "Nghiệm thu nhanh, trả tiền đúng giờ.", 5], ["Chị Mười · Cao Lãnh", "Có lệch tiền một lần, đã đối soát xong.", 4]].map(([a, b, c]) => `<div class="m-dong" style="display:block"><b>${a} · ${"★".repeat(c)}</b><p class="m-ghi">${b}</p></div>`).join(""))}` }) },
  chat: { tieu: (s, t) => (s.hoiThoai.find((h) => h.ma === t.ma) || s.hoiThoai[0]).ben, phu: (s, t) => { const h = s.hoiThoai.find((x) => x.ma === t.ma) || s.hoiThoai[0]; return `${h.nguoi} · lô ${h.lo}${h.moLienLac ? " · liên lạc đã mở" : ""}`; }, ve_tu: "khach",
    nutPhai: (s, t) => { const h = s.hoiThoai.find((x) => x.ma === t.ma) || s.hoiThoai[0]; return `<button class="m-dau-nut" type="button" aria-label="${h.moLienLac ? "Gọi" : "Gọi qua app (che số)"}">${ic("dien")}</button>`; },
    ve: (s, t) => { const h = s.hoiThoai.find((x) => x.ma === t.ma) || s.hoiThoai[0]; return {
      than: `<div class="m-chat" id="chat">${h.tin.map(veTin).join("")}</div>`,
      day: `<div class="m-go-nhanh" style="margin:-12px -16px 0;padding:8px 12px 0"><button type="button" id="tra-gia">${ic("can", 18)}Trả giá</button><button type="button" id="gui-anh">${ic("anh", 18)}Gửi ảnh hàng</button><button type="button" data-di="hen-xem">${ic("lich", 18)}Hẹn xem vườn</button><button type="button" data-di="bao-cao">${ic("canh", 18)}Báo cáo</button></div>
        <div class="m-go" style="margin:0 -16px calc(-14px - env(safe-area-inset-bottom));"><button type="button" id="chup" aria-label="Chụp ảnh">${ic("anh")}</button><textarea id="go" rows="1" placeholder="Nhắn cho ${esc(h.nguoi)}" aria-label="Nội dung tin nhắn"></textarea><button type="button" class="m-gui" id="gui" aria-label="Gửi">${ic("gui")}</button></div>` }; },
    sau: (el, s, t, api) => {
      const h = s.hoiThoai.find((x) => x.ma === t.ma) || s.hoiThoai[0];
      const cuon = el.querySelector(".m-cuon"); requestAnimationFrame(() => { cuon.scrollTop = cuon.scrollHeight; });
      if (h.chuaDoc) api.doi((x) => { const k = x.hoiThoai.find((y) => y.ma === h.ma); x.chuaDoc = Math.max(0, x.chuaDoc - k.chuaDoc); k.chuaDoc = 0; });
      const gio = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const them = (m) => { api.doi((x) => x.hoiThoai.find((y) => y.ma === h.ma).tin.push(m)); el.querySelector("#chat").insertAdjacentHTML("beforeend", veTin(m)); cuon.scrollTo({ top: cuon.scrollHeight, behavior: "smooth" }); };
      const viPham = () => (s.viPham || 0);
      const go = el.querySelector("#go");
      go.addEventListener("input", () => { go.style.height = "auto"; go.style.height = Math.min(120, go.scrollHeight) + "px"; });
      el.querySelector("#gui").addEventListener("click", () => {
        const chu = go.value.trim(); if (!chu) return;
        if (!h.moLienLac && viPham() >= 3) { them({ k: "he", canh: true, t: "Bác đang bị tạm khóa nhắn tới 24 giờ sau lần vi phạm thứ 3.", luc: gio() }); return; }
        const q = h.moLienLac ? { sach: true, che: chu } : quetLienLac(chu);
        go.value = ""; go.style.height = "auto";
        them({ k: "tin", ai: "toi", t: q.che, luc: gio(), che: !q.sach });
        if (!q.sach) { api.doi((x) => { x.viPham = (x.viPham || 0) + 1; }); them({ k: "he", canh: true, t: `Tin có ${q.loai} nên đã bị che. Trao đổi liên lạc trước khi ngân hàng giữ cọc là vi phạm (lần ${viPham()}/3). ${viPham() >= 3 ? "Bác đã bị tạm khóa nhắn 24 giờ." : "Lần 3 sẽ tạm khóa nhắn 24 giờ."}`, luc: gio() }); }
      });
      el.querySelector("#gui-anh").addEventListener("click", () => them({ k: "anh", ai: "toi", anh: "/assets/products/xoai-cat-chu.jpg", luc: gio() }));
      el.querySelector("#chup").addEventListener("click", () => api.tam(`<div class="m-tam-than"><h2>Gửi ảnh</h2>${nut("Chụp ảnh mới", { lop: "m-phu m-rong", icon: "anh" })}${nut("Chọn ảnh có sẵn", { lop: "m-phu m-rong" })}<p class="m-ghi">Ảnh có số điện thoại, Zalo, mã QR liên lạc sẽ không gửi đi và bị tính vi phạm.</p></div>`, (n, dong) => n.querySelectorAll(".m-nut").forEach((b) => b.addEventListener("click", () => { dong(); them({ k: "anh", ai: "toi", anh: "/assets/products/xoai-cat-chu.jpg", luc: gio() }); }))));
      const moTraGia = (giaCu = 23000) => api.tam(`<div class="m-tam-than"><h2>Bác trả giá</h2><p class="m-ghi">Lô ${h.lo} · bên mua còn trả lời được 24 giờ.</p><div class="m-hai-o">${o("Giá (đ/kg)", String(giaCu + 500), "", 'inputmode="numeric" id="g"')}${o("Lượng (kg)", "2000", "", 'inputmode="numeric" id="l"')}</div><p class="m-ghi">Bác còn ${s.luotTra ?? 1} lần trả giá.</p></div><div class="m-day"><div class="m-hang-nut"><button class="m-nut m-phu" type="button" data-dong>Đóng</button><button class="m-nut m-vang" type="button" id="gui-gia">Gửi giá</button></div></div>`, (n, dong) => n.querySelector("#gui-gia").addEventListener("click", () => { const g = Number(n.querySelector("#g").value.replace(/\D/g, "")), l = Number(n.querySelector("#l").value.replace(/\D/g, "")); dong(); api.doi((x) => { x.hoiThoai.find((y) => y.ma === h.ma).tin.forEach((m) => { if (m.trang === "cho-bac") m.trang = "da-tra"; }); x.luotTra = Math.max(0, (x.luotTra ?? 1) - 1); }); them({ k: "gia", ai: "toi", gia: g, luong: l, ghi: "Bác trả lại", luc: gio(), trang: "cho-mua" }); el.querySelectorAll("[data-gia]").forEach((b) => b.closest(".m-the-gia")?.querySelectorAll(".m-hang-nut,.m-chu").forEach((x) => x.remove())); }));
      el.querySelector("#tra-gia").addEventListener("click", () => moTraGia());
      el.querySelector("#chat").addEventListener("click", (e) => {
        const b = e.target.closest("[data-gia]"); if (!b) return;
        const m = h.tin.find((x) => x.trang === "cho-bac");
        if (b.dataset.gia === "tra") return moTraGia(m?.gia);
        if (b.dataset.gia === "khong") { api.doi((x) => { x.hoiThoai.find((y) => y.ma === h.ma).tin.find((y) => y.trang === "cho-bac").trang = "khong"; }); api.veLai(); return; }
        api.tam(`<div class="m-tam-than"><h2>Đồng ý bán?</h2>${dong("Lượng", kg(m.luong))}${dong("Giá", `${so(m.gia)} đ/kg`)}${dong("Thành tiền", d(m.gia * m.luong), "m-tong")}<p class="m-ghi">Hàng được giữ 24 giờ cho bên mua. <b>Chưa phải hợp đồng</b>: hai bên xem lại thỏa thuận rồi mới ký.</p></div><div class="m-day"><div class="m-hang-nut"><button class="m-nut m-phu" type="button" data-dong>Quay lại</button><button class="m-nut m-vang" type="button" id="chot">Xác nhận đồng ý</button></div></div>`, (n, dong) => n.querySelector("#chot").addEventListener("click", () => {
          dong(); api.doi((x) => { x.hoiThoai.find((y) => y.ma === h.ma).tin.find((y) => y.trang === "cho-bac").trang = "dong-y"; if (x.hd.buoc === 0) x.hd.buoc = 1; x.hoiThoai.find((y) => y.ma === h.ma).tin.push({ k: "he", t: "Hai bên đã đồng ý 23.000 đ/kg cho 2.000 kg. Bên mua đang soạn thỏa thuận HĐ-0018.", luc: gio() }); });
          api.toast("Đã đồng ý giá · hàng được giữ 24 giờ"); api.veLai();
        }));
      });
    } },
  "bao-gia": { tieu: "Báo giá", phu: "Chào hàng cho Nhà máy sấy Đồng Xanh", ve: () => ({ than: `
    ${the("Bên mua cần", dong("Hàng", "Xoài cát Chu loại 1") + dong("Lượng", "2.000 kg") + dong("Nhận", "27–29/10 · bên mua lo xe"))}
    <div class="m-hai-o">${o("Giá bác chào (đ/kg)", "23.500")}${o("Lượng (kg)", "2000")}</div>
    ${chon("lo", [["Từ lô L-0412", "Còn 3.500 kg · ước chừng"]])}
    <p class="m-ghi">Giá bác chào chỉ bên mua này thấy. Bên mua có 24 giờ trả lời, tối đa 2 lượt trả giá mỗi bên.</p>`,
    day: nut("Gửi chào hàng", { ma: "chat", tham: { ma: "T1" }, lop: "m-vang m-rong" }) }) },
  "hen-xem": { tieu: "Hẹn xem vườn", phu: "Nhà máy sấy Đồng Xanh", ve: () => ({ than: `
    ${the("Bên mua đề nghị", dong("Ngày giờ", "Chủ nhật 26/10 · 8:00") + dong("Người tới", "Chị Thu Hà + 1 người") + dong("Chỗ gặp", "Đầu ấp 3, Mỹ Xương"))}
    <p class="m-ghi">Địa chỉ chi tiết chỉ gửi khi bác nhận lời. Gặp nhau rồi vẫn nên chốt giá qua app để có hợp đồng.</p>`,
    day: `<div class="m-hang-nut">${nut("Đổi giờ", { lop: "m-phu" })}${nut("Nhận lời hẹn", { lop: "m-vang", ma: "chat", tham: { ma: "T1" } })}</div>` }) },
  "bao-cao": { tieu: "Báo cáo", phu: "Gửi cho AgiViet", ve: () => ({ than: `
    <h2 class="m-tieu">Bên mua này làm gì sai?</h2>
    ${chon("bc", [["Đòi số điện thoại, Zalo trước khi có cọc", ""], ["Ép giá, dọa bỏ", ""], ["Nói lời khiếm nhã", ""], ["Nghi lừa đảo", ""], ["Khác", ""]])}
    <label class="m-o"><span>Kể thêm (không bắt buộc)</span><textarea></textarea></label>`,
    day: nut("Gửi báo cáo", { lop: "m-huy m-rong" }) }) },

  // ── Thêm: Thời tiết · Giá & tin tức ──
  "thoi-tiet": { tieu: "Thời tiết Cao Lãnh", phu: "7 ngày tới", ve: () => ({ than: `
    <section class="m-the" style="background:linear-gradient(160deg,#2b5b47,#1f4d3a);color:#f4f1e8;box-shadow:none"><div style="display:flex;align-items:center;gap:16px">${ic("troi", 56)}<div><b style="font-size:40px;line-height:1">32°</b><p style="opacity:.8">Có thể mưa chiều · 7 mm · gió 13 km/h</p></div></div><p style="background:rgba(244,241,232,.12);padding:10px 12px;border-radius:12px">Chuẩn bị bạt che khi hái và chờ xe. Hái sáng sớm để trái không dính mưa.</p></section>
    ${the("7 ngày", ["T2 · 32°/24° · mưa 96%", "T3 · 32°/24° · mưa 80%", "T4 · 32°/25° · mưa 60%", "T5 · 31°/24° · mưa 70%", "T6 · 32°/24° · mưa 85%", "T7 · 33°/25° · mưa 40%", "CN · 32°/24° · nắng"].map((x) => { const [a, b, c] = x.split(" · "); return dong(`<b style="color:var(--muc)">${a}</b>`, `${b} <span class="m-ghi">· ${c}</span>`); }).join(""))}` }) },
  "gia-tin-tuc": { tieu: "Giá & tin tức", phu: "Theo hàng của bác: xoài cát Chu", ve: () => ({ than: `
    <div class="m-loc"><button type="button" aria-pressed="true">Giá thị trường</button><button type="button" aria-pressed="false">Tin tức</button><button type="button" aria-pressed="false">Học kỹ thuật</button></div>
    <section class="m-the"><div class="m-so-lon m-tien"><small>Xoài cát Chu loại 1 · tại vườn</small><b>21.500–24.000</b><span class="m-ghi">đ/kg · 18 giao dịch tuần này trên AgiViet</span></div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:90px">${[20.5, 21, 22, 21.8, 22.6, 23, 23.2].map((v, i) => `<i style="flex:1;height:${(v - 19) / 5 * 100}%;border-radius:6px 6px 2px 2px;background:${i === 6 ? "var(--vang)" : "var(--la-nhat)"}"></i>`).join("")}</div><p class="m-ghi">7 tuần gần nhất · tham khảo từ các lô trên AgiViet, không phải giá chính thức.</p></section>
    ${[["Xuất khẩu xoài sang Úc tăng mạnh mùa này", "Báo Nông nghiệp · 27/10", "xoai-cat-chu"], ["Cách bao trái xoài giảm sâu đục trái", "Học kỹ thuật · 6 phút đọc", "xoai-cat-chu"]].map(([t, g, a]) => `<div class="m-hang"><span class="m-anh" style="background-image:url(/assets/products/${a}.jpg)"></span><span><b>${t}</b><small>${g}</small></span>${ic("toi", 18)}</div>`).join("")}` }) },
};
