import { esc, giuThamSo } from "./chung.ts";
const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const T = location.search;
const so = (n) => Number(n).toLocaleString("vi-VN");
const d = (n) => so(n) + " đ";
const P = { lui: "M15 5l-7 7 7 7", tich: "M5 12l5 5 9-10", tien: "M4 7.5h15.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5V8.5a1 1 0 0 1 1-1zM15.5 13.75h2.5", khien: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", xe: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", kho: "M3 9l9-5 9 5v11H3zM8 20v-6h8v6", dien: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z", sao: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z", hd: "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8zM14 3.5V8h4.5M8.5 11.5h4" };
const ic = (k, w = 22) => `<svg class="th-i" viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true"><path d="${P[k]}"/></svg>`;
const the = (t, html) => `<section class="th-the">${t ? `<h2>${esc(t)}</h2>` : ""}${html}</section>`;
const dong = (a, b, l = "") => `<div class="th-dong ${l}"><span>${a}</span><b>${b}</b></div>`;
const nhan = (t, l = "") => `<span class="th-nhan ${l}">${esc(t)}</span>`;
const viec = (t, p, nut = "", l = "") => `<section class="th-viec ${l}"><h2>${esc(t)}</h2>${p ? `<p>${p}</p>` : ""}${nut}</section>`;
const chon = (ten, ds, mac = 0) => `<div class="th-chon" role="radiogroup">${ds.map(([t, g], i) => `<label><input type="radio" name="${ten}" ${i === mac ? "checked" : ""}><span><b>${esc(t)}</b>${g ? `<small>${esc(g)}</small>` : ""}</span></label>`).join("")}</div>`;
const lk = (t, href, lop = "phu-nut") => `<a class="nut ${lop}" href="${href}${href.includes("?") || href.startsWith("#") ? "" : T}" style="text-decoration:none;width:100%">${esc(t)}</a>`;
const day = (chinh, phu = "") => `<div class="th-day">${phu ? `<div class="th-hang-nut">${phu}${chinh}</div>` : chinh}</div>`;
const nutVang = (t, id) => `<button type="button" class="nut th-vang" id="${id}">${esc(t)}</button>`;
const nutPhu = (t, id = "") => `<button type="button" class="nut phu-nut" ${id ? `id="${id}"` : ""}>${esc(t)}</button>`;

// ── 14 màn còn thiếu ──
const MAN = {
  "tong-ket-tuan": { chao: "Hôm nay", tieu: "Tổng kết tuần 20–26/10", ve: () => `
    <div class="th-so"><small>Tiền về tuần này</small><b style="color:var(--chin)">${d(27600000)}</b><span class="th-ghi">vào Agribank •••• 2186 · tuần trước ${d(18400000)}</span></div>
    ${the("Bán hàng", dong("Lời chào nhận", "5") + dong("Bác đã đồng ý", "2") + dong("Hợp đồng mới", "HĐ-0018 · Đồng Xanh"))}
    ${the("Vườn", dong("Nhật ký đã ghi", "4 lần") + dong("Có ảnh làm chứng", "3 lần") + dong("Cách ly thuốc", "hết 09/11"))}
    ${the("Tiền về theo ngày", `<div class="th-cot">${[["20", 0], ["21", 0], ["22", 1.16], ["23", 0], ["24", 20.4], ["25", 0], ["26", 7.2]].map(([n, v]) => `<div><i style="height:${Math.max(3, Number(v) / 20.4 * 100)}%;${v ? "" : "background:var(--giay-lot)"}"></i><small>${n}</small></div>`).join("")}</div><p class="th-ghi">Ngày trong tháng 10 · triệu đồng · chỉ tính tiền bác đã xác nhận về.</p>`)}
    ${viec("Tuần tới", "Giao 50 kg cho Bếp Sen thứ Sáu. Lô L-0414 dự hái 12/11, nhớ chụp ảnh vườn trước khi đăng.", "", "th-cho")}` },
  "thu-chi": { chao: "Vườn", tieu: "Thu chi tháng 10", ve: () => `
    <div class="th-hai"><section class="th-the th-so"><small>Thu</small><b style="font-size:22px;color:var(--la)">${d(27600000)}</b></section><section class="th-the th-so"><small>Chi</small><b style="font-size:22px;color:var(--dau-do)">${d(1200000)}</b></section></div>
    ${the("Các khoản", [["28/10", "Tiền xoài HĐ-0009", 27600000, 1], ["12/10", "Thuốc trừ rầy", 420000, 0], ["05/10", "Phân kali 2 bao", 780000, 0]].map(([n, t, v, vao]) => dong(`${n} · ${t}`, `<span style="color:${vao ? "var(--la)" : "var(--dau-do)"}">${vao ? "+" : "−"}${so(v)}</span>`)).join(""))}
    <p class="th-ghi">Tiền bán qua AgiViet tự vào sổ. Khoản chi bác nói hoặc chụp hóa đơn để ghi.</p>
    ${day(nutVang("Ghi khoản chi", "ghi-chi"))}` },
  "ket-noi": { chao: "Tin nhắn", tieu: "Khách muốn nói chuyện", ve: () => `
    <div style="display:grid;justify-items:center;text-align:center;gap:8px;padding:8px 0"><span class="th-tron" style="width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:var(--la-nhat);color:var(--la-dam);font-size:30px;font-weight:700">X</span><h2 style="font-size:20px">Nhà máy sấy Đồng Xanh</h2><p class="th-ghi">muốn hỏi về lô L-0412 · 4,7 sao · 15 đơn đã xong · đã xác minh</p></div>
    ${the("Họ hỏi", `<p>"Chị còn đủ 2 tấn loại 1 giao 28/10 không?"</p>`)}
    <p class="th-ghi">Nhận lời thì mở trò chuyện. Số điện thoại vẫn che tới khi ngân hàng giữ cọc.</p>
    ${day(lk("Nhận lời, nhắn tin", "./ban-tin-nhan.html" + T + "#tro=T1", "th-vang"), nutPhu("Từ chối", "tu-choi"))}` },
  "ho-so-ben-mua": { chao: "Người mua", tieu: "Nhà máy sấy Đồng Xanh", ve: () => `
    <div class="th-hai"><section class="th-the th-so"><small>Trả đúng hạn</small><b>98%</b></section><section class="th-the th-so"><small>Người bán chấm</small><b>4,7</b><span class="th-sao">${ic("sao", 16).repeat(5)}</span></section></div>
    ${the("Đã xác minh", dong("Giấy phép kinh doanh", nhan("Đã xác minh", "th-xanh")) + dong("Tài khoản công ty", nhan("Đúng tên", "th-xanh")) + dong("Kho nhận hàng", "KCN Sa Đéc, Đồng Tháp") + dong("Mua trên AgiViet từ", "06/2026 · 15 đơn"))}
    ${the("Người bán nói gì", [["Anh Sáu · Bến Tre", "Nghiệm thu nhanh, trả tiền đúng giờ."], ["Chị Mười · Cao Lãnh", "Có lệch tiền một lần, đã đối soát xong."]].map(([a, b]) => `<div class="th-dong" style="display:block"><b>${a}</b><p class="th-ghi">${b}</p></div>`).join(""))}
    ${day(lk("Nhắn tin", "./ban-tin-nhan.html" + T + "#tro=T1", "chinh-nut"))}` },
  "so-sanh": { chao: "Lô L-0412", tieu: "So sánh khách", ve: () => `
    <p class="th-ghi">3 người mua cùng muốn lô L-0412. Giá cao nhất chưa chắc lợi nhất: xem ai lo xe, trả tiền lúc nào, đã xác minh chưa.</p>
    ${[["Nhà máy sấy Đồng Xanh", 23000, "2.000 kg", "Người mua lo xe · trả thẳng trước bốc", "4,7 sao · đã xác minh", 1], ["Vựa Ba Cường", 23500, "1.000 kg", "Bác giao tận vựa · trả khi nhận", "4,1 sao · chưa xác minh", 0], ["HTX Tân Thuận", 22800, "3.000 kg", "Người mua lo xe · trả trước bốc", "4,7 sao · đã xác minh", 1]].map(([a, g, l, gn, u, xm]) => `<section class="th-the" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>${a}</b><b class="so" style="font-size:18px">${so(g)} đ/kg</b></div><p class="th-ghi">${l} · ${gn}</p><p class="th-ghi">${u}</p>${xm ? "" : `<p class="th-ghi" style="color:var(--dau-do)">Chưa xác minh: chỉ nên bán khi có cọc ngân hàng giữ.</p>`}</section>`).join("")}` },
  "chon-luong": { chao: "HĐ-0018", tieu: "Hứa bán bao nhiêu?", ve: () => `
    <label class="th-o">Lượng bác hứa giao (kg)<input inputmode="numeric" value="2000" id="luong" style="font-size:26px;font-weight:700"></label>
    ${the("", dong("Lô L-0412 còn", "3.500 kg (ước chừng)") + dong("Được hứa tối đa", "2.800 kg (80%)") + dong("Sai số cho phép", "±5% · 1.900–2.100 kg"))}
    <p class="th-ghi">Giao thiếu quá 5% thì phần thiếu tính theo điều khoản thiếu lượng trong thỏa thuận.</p>
    ${day(nutVang("Tiếp tục", "tiep"))}` },
  "quyen": { chao: "HĐ-0018", tieu: "Quyền và trách nhiệm", ve: () => `
    ${the("Bác được", ["Ngân hàng giữ cọc trước khi bác giao hàng", "Nhận đủ tiền thẳng trước khi cho bốc", "Phản đối từng dòng kết quả cân trong 24 giờ", "Mất mùa có chứng từ: được xem xét hủy không phạt"].map((x) => `<div class="th-dong-buoc"><span>${ic("tich", 16)}</span><p>${x}</p></div>`).join(""))}
    ${the("Bác cần", ["Giao đúng loại, đúng lượng ±5%", "Niêm phong mẫu đối chứng khi bốc", "Không đưa số điện thoại trước khi có cọc"].map((x) => `<div class="th-dong-buoc"><span style="background:var(--chin-nen);color:var(--chin)">${ic("khien", 16)}</span><p>${x}</p></div>`).join(""))}
    ${day(nutPhu("Nghe đọc to", "nghe"))}` },
  "mo-lien-lac": { chao: "HĐ-0018", tieu: "Đã mở liên lạc", ve: () => `
    ${viec("Ngân hàng đã giữ cọc", "Liên lạc hai bên đã mở. Vẫn nên nhắn qua app để có bằng chứng khi cần.", "", "th-xong")}
    ${the("Người mua", dong("Người liên hệ", "Chị Thu Hà") + dong("Số điện thoại", "0277 386 210") + dong("Xe tới lấy", "66C-123.45 · anh Lộc") + dong("Mã nhận hàng", "Tài xế đọc khi tới vườn"))}
    ${day(`<a class="nut th-vang" href="tel:0277386210" style="text-decoration:none">${ic("dien", 20)} Gọi chị Thu Hà</a>`, lk("Nhắn tin", "./ban-tin-nhan.html" + T + "#tro=T1").replace("width:100%", ""))}` },
  "tien-ve": { chao: "HĐ-0018", tieu: "Tiền đã về", ve: () => `
    <div class="th-tien-ve"><span class="th-vong">${ic("tien", 44)}</span><small class="th-ghi">Ngân hàng vừa chuyển</small><b id="so-ve">${d(12150000)}</b><p class="th-ghi">vào Agribank •••• 2186 · 28/10 15:42</p></div>
    ${the("HĐ-0018 tổng cộng", dong("Người mua trả thẳng", d(32200000)) + dong("Ngân hàng chuyển từ cọc", d(12150000)) + dong("Bác nhận tổng", d(44350000), "th-tong"))}
    <p class="th-ghi">Chỉ bấm khi đã thấy tiền trong tài khoản. Chưa thấy thì báo, AgiViet kiểm với ngân hàng.</p>
    ${day(nutVang("Đã thấy tiền về", "da-ve"), nutPhu("Chưa thấy", "chua-ve"))}` },
  "ung-tien": { chao: "Tiền", tieu: "Nhận tiền trước", ve: () => `
    ${viec("Đang thử nghiệm, chưa mở cho mọi người", "Nhận trước một phần tiền hàng khi hợp đồng đã có cọc ngân hàng giữ. AgiViet đang thử với vài HTX, chưa có phí chính thức.", "", "th-cho")}
    ${the("Ví dụ HĐ-0018", dong("Ngân hàng đang giữ cọc", d(13800000)) + dong("Có thể nhận trước tối đa", "Chưa công bố") + dong("Phí", "Chưa công bố"))}
    ${day(nutPhu("Báo tôi khi có", "bao-toi"))}` },
  "dich-vu": { chao: "Tôi", tieu: "Kiểm nghiệm, xe, kho", ve: () => `
    ${[["khien", "Kiểm dư lượng thuốc", "Lấy mẫu tại vườn · kết quả 24–48 giờ", "kiem"], ["xe", "Xe chở hàng", "Xe thường, xe lạnh, ghép chuyến", "xe"], ["kho", "Kho lạnh gần vườn", "Gửi theo ngày", "kho"]].map(([i, t, g, k]) => `<a class="th-hang" href="./ban-them.html?man=dat-dich-vu&loai=${k}${T.replace("?", "&")}"><span class="th-tron">${ic(i, 24)}</span><span><b>${t}</b><small>${g}</small></span><span aria-hidden="true">›</span></a>`).join("")}
    ${the("Đang đặt", dong("Kiểm dư lượng · L-0414", nhan("Lấy mẫu 05/11", "th-tien")))}
    <p class="th-ghi">Giá và thời gian trên là minh họa, chờ đối tác xác nhận.</p>` },
  "dat-dich-vu": { chao: "Kiểm nghiệm, xe, kho", tieu: "Đặt dịch vụ", ve: () => {
    const l = q.get("loai") || "kiem";
    const ds = { kiem: [["Trung tâm kiểm định Cần Thơ", "850.000 đ · kết quả 24 giờ (minh họa)"], ["Vinacontrol Đồng Tháp", "1.100.000 đ · kết quả 12 giờ (minh họa)"]], xe: [["Xe tải 2,5 tấn", "Cao Lãnh → Sa Đéc · khoảng 1,2 triệu đ (minh họa)"], ["Xe lạnh 5 tấn", "Ghép chuyến · khoảng 2,4 triệu đ (minh họa)"]], kho: [["Kho lạnh HTX Mỹ Xương", "Khoảng 300 đ/kg/ngày (minh họa)"]] }[l];
    const ten = { kiem: "Kiểm dư lượng thuốc", xe: "Xe chở hàng", kho: "Kho lạnh" }[l];
    return `<p class="th-ghi">${esc(ten)}</p>${chon("dv", ds)}<label class="th-o">Ngày<input type="date" value="2026-11-05"></label>${day(nutVang("Đặt lịch", "dat"))}`; } },
  "danh-gia": { chao: "HĐ-0018 · Nhà máy sấy Đồng Xanh", tieu: "Đánh giá người mua", ve: () => `
    <h2 style="font-size:20px">Bác thấy người mua này thế nào?</h2>
    <div style="display:flex;gap:6px;justify-content:center" id="sao">${[1, 2, 3, 4, 5].map((k) => `<button type="button" data-sao="${k}" aria-label="${k} sao" style="width:52px;height:52px;border:0;background:none;color:#e2a92c;cursor:pointer;display:grid;place-items:center">${ic("sao", 40)}</button>`).join("")}</div>
    <div class="th-chon">${["Trả tiền đúng giờ", "Xe tới đúng hẹn", "Cân rõ ràng", "Lịch sự"].map((t, i) => `<label><input type="checkbox" ${i < 2 ? "checked" : ""}><span><b>${t}</b></span></label>`).join("")}</div>
    <p class="th-ghi">Người mua cũng đánh giá bác. Hai bên chỉ thấy đánh giá của nhau sau khi cả hai đã gửi, để không ai sửa theo người kia.</p>
    ${day(nutVang("Gửi đánh giá", "gui-dg"))}` },
  "phan-cua-toi": { chao: "Lô gộp HTX Mỹ Xương", tieu: "Phần hàng của tôi", ve: () => `
    <div class="th-so"><small>Phần của bác trong lô gộp L-G021</small><b>1.200 kg</b><span class="th-ghi">trên tổng 5.000 kg · 6 hộ · HTX Mỹ Xương ký với người mua</span></div>
    ${the("Tiến độ phần của bác", dong("Đã khai", "1.200 kg") + dong("Cân thật khi gom", "1.180 kg") + dong("Loại 1 / hạ cấp", "1.120 / 60 kg") + `<div class="th-thanh"><i style="width:98%"></i></div>`)}
    ${the("Tiền phần của bác", dong("Giá loại 1", "23.000 đ/kg") + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Tạm tính", d(1120 * 23000 + 60 * 15000), "th-tong") + `<p class="th-ghi">HTX nhận tiền từ người mua rồi chuyển cho từng hộ theo phần cân thật. Bác xem được chứng từ chia tiền.</p>`)}` },
};

const m = MAN[q.get("man")];
const quayLai = () => (history.length > 1 ? history.back() : (location.href = "./ban-hom-nay.html" + T));
$("dau").innerHTML = `<button class="nut-tron" type="button" id="dong" aria-label="Quay lại"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
  <div style="flex:1;min-width:0"><p class="chao">${esc(m ? m.chao : "AgiViet")}</p><h1>${esc(m ? m.tieu : "Tiện ích")}</h1></div>`;
$("dong").onclick = quayLai;
// Không có tên màn (hoặc tên sai): hiện danh mục tiện ích thay vì báo lỗi thô
$("noi").innerHTML = m ? `<p role="note" style="margin:0 0 12px;padding:10px 12px;border-radius:12px;background:var(--chin-nen,#f5ead0);color:var(--chin,#85600c);font-weight:600;font-size:15px">Bản mô phỏng: số liệu ở màn này là mẫu, bấm nút chưa lưu thật. Việc thật bác làm ở Hợp đồng, Tiền, Tin nhắn.</p>${m.ve()}` : `${window.trauTuThe ? window.trauTuThe("08-chi", "Bác chọn việc muốn làm nhé.", 80) : ""}
  <nav class="them-ds" aria-label="Tiện ích" style="display:grid;gap:8px">${Object.entries(MAN).map(([k, x]) => `<a href="?${new URLSearchParams({ ...Object.fromEntries(q), man: k })}" style="display:flex;justify-content:space-between;align-items:center;min-height:56px;padding:10px 14px;border:1px solid var(--ke);border-radius:var(--bo-vua);background:var(--giay-noi);color:var(--muc);text-decoration:none"><span><b style="display:block;font-size:16px">${esc(x.tieu)}</b><small style="color:var(--muc-nhat);font-size:13px">${esc(x.chao)}</small></span><span aria-hidden="true">›</span></a>`).join("")}</nav>`;
document.title = (m ? m.tieu : "Tiện ích") + " · AgiViet bán";
giuThamSo();

// Tương tác mô phỏng: nút chính → chấm chờ → dấu tích → thông báo
const xong = async (id, chu, sau0) => { const sau = sau0 ? "Mô phỏng: " + sau0 + " (chưa lưu thật)" : sau0; const b = $(id); if (!b) return; b.addEventListener("click", async () => { await window.HieuUngThem?.nutXong(b, chu); window.HieuUngThem?.thongBaoRoi(document.querySelector(".trang"), sau); }); };
xong("ghi-chi", "Đã mở", "Nói khoản chi, ví dụ: mua 2 bao phân 780 ngàn");
xong("tiep", "Đã lưu", "Đã lưu lượng hứa giao 2.000 kg");
xong("dat-ky", "Đã đặt", "Đã đặt lịch ký giấy 7:00 thứ Tư 28/10");
xong("bao-toi", "Đã ghi", "AgiViet sẽ báo bác khi mở nhận tiền trước");
xong("dat", "Đã đặt", "Đã gửi yêu cầu, đối tác xác nhận trong ngày");
xong("da-ve", "Đã xác nhận", "Đã xác nhận tiền về 12.150.000 đ");
xong("chua-ve", "Đã báo", "Đã báo AgiViet kiểm với ngân hàng");
xong("gui-dg", "Đã gửi", "Đã gửi đánh giá. Bác sẽ thấy đánh giá của người mua khi họ gửi.");
document.querySelectorAll("[data-sao]").forEach((b) => b.addEventListener("click", () => document.querySelectorAll("[data-sao]").forEach((x) => { x.style.color = Number(x.dataset.sao) <= Number(b.dataset.sao) ? "#e2a92c" : "var(--ke-dam)"; x.animate?.([{ transform: "scale(.85)" }, { transform: "scale(1.12)" }, { transform: "none" }], { duration: 240 }); })));
$("tu-choi")?.addEventListener("click", () => window.HieuUngThem?.thongBaoRoi(document.querySelector(".trang"), "Đã từ chối, người mua được báo lịch sự"));
$("nghe")?.addEventListener("click", () => { try { window.giongViet?.docTo([...document.querySelectorAll(".th-dong-buoc p")].map((p) => p.textContent).join(". ")); } catch {} });
if ($("so-ve")) setTimeout(() => window.HieuUng?.demSo($("so-ve"), 0, 12150000), 300);
// Lượng hứa: chặn vượt 80% (rung + báo ngay dưới ô)
$("tiep")?.addEventListener("click", (e) => { const v = Number($("luong").value.replace(/\D/g, "")); if (!(v > 0) || v > 2800) { e.stopImmediatePropagation(); window.HieuUng?.loiTruong($("luong"), "Tối đa 2.800 kg (80% lượng ước chừng)"); } }, true);
