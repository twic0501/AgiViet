// Màn 1–20: Bắt đầu · Hôm nay · Vườn
import { esc, d, so, kg, ic, the, dong, viec, nhan, lk, nut, chang, chon, o } from "./tien-ich.js";
import { BUOC } from "./du-lieu.js";

const buocBat = (i) => `<div style="display:flex;gap:6px" aria-label="Bước ${i} trên 5">${[1, 2, 3, 4, 5].map((k) => `<i style="flex:1;height:5px;border-radius:3px;background:${k <= i ? "var(--la)" : "var(--giay-sau)"}"></i>`).join("")}</div>`;
const NGUON = { chup: ["Chụp trong app", "m-n-xong"], vh: ["Nhân viên đã kiểm", "m-n-nh"], noi: ["Nói để ghi", ""], go: ["Tự ghi", ""] };

export const MAN_1 = {
  // ── Bắt đầu ──
  "chao-mung": { tieu: "Chào mừng", khongDau: true, ve: () => ({
    than: `<div style="display:grid;justify-items:center;text-align:center;gap:14px;padding:40px 8px 0">
      <img src="/assets/logo.svg" alt="" width="72" height="72" class="m-nay">
      <h1 class="m-tieu" style="font-size:28px;color:var(--la)">AgiViet</h1>
      <p style="color:var(--muc-phu);font-size:17px">Bán nông sản, thủy sản có hợp đồng.<br>Tiền cọc do ngân hàng giữ.</p></div>
      ${[["khien", "Ngân hàng giữ cọc", "Bên mua chuyển cọc trước, bác mới giao hàng"], ["mic", "Nói là đăng được hàng", "App hỏi từng câu, bác trả lời bằng giọng nói"], ["nguoi", "Có người giúp khi vướng", "Gọi tổng đài, hoặc nhờ con cháu đăng nhập hộ"]].map(([i, t, g]) => `<div class="m-hang" style="cursor:default"><span class="m-anh" style="display:grid;place-items:center;background:var(--vang-nhat);color:var(--chin)">${ic(i, 28)}</span><span><b>${t}</b><small>${g}</small></span><span></span></div>`).join("")}`,
    day: `${nut("Bắt đầu", { ma: "dang-nhap", lop: "m-vang m-rong" })}${nut("Tôi đã có tài khoản", { ma: "dang-nhap", lop: "m-chu m-rong" })}` }) },
  "dang-nhap": { tieu: "Số điện thoại", phu: "Đăng nhập", ve: () => ({
    than: `<h2 class="m-tieu">Bác nhập số điện thoại</h2><p class="m-phu-de">App gửi mã 6 số qua tin nhắn.</p>
      <label class="m-o"><span>Số điện thoại</span><input inputmode="tel" value="0918 234 421" style="font-size:22px;letter-spacing:.04em"></label>
      <p class="m-ghi">Không nhận được tin nhắn? ${lk("Nhận mã qua cuộc gọi", "tro-giup-truy-cap")}</p>`,
    day: nut("Nhận mã", { ma: "otp", lop: "m-vang m-rong" }) }) },
  otp: { tieu: "Nhập mã", phu: "Đăng nhập", ve: () => ({
    than: `<h2 class="m-tieu">Mã vừa gửi tới 0918 234 421</h2><p class="m-phu-de">Mã hết hạn sau 5 phút.</p>
      <div class="m-otp">${"123456".split("").map((c) => `<input aria-label="Số mã" maxlength="1" value="${c}" inputmode="numeric">`).join("")}</div>
      <button class="m-nut m-chu" type="button">Gửi lại mã sau 42 giây</button>`,
    day: nut("Xác nhận", { ma: "vai-tro", lop: "m-vang m-rong" }) }) },
  "vai-tro": { tieu: "Bác bán thế nào?", phu: "Bước 1 trên 5", ve: () => ({
    than: `${buocBat(1)}<h2 class="m-tieu">Bác bán hàng nhà mình, hay gom của nhiều nhà?</h2>
      ${chon("vai", [["Hàng nhà tôi trồng, nuôi", "Nông hộ, chủ vườn, chủ ao"], ["Hợp tác xã, tổ hợp tác", "Bán chung cho nhiều thành viên"], ["Tôi gom hàng của nhiều nhà", "Thương lái, vựa đầu mối"]])}`,
    day: nut("Tiếp tục", { ma: "mat-hang", lop: "m-vang m-rong" }) }) },
  "mat-hang": { tieu: "Mặt hàng", phu: "Bước 2 trên 5", ve: () => ({
    than: `${buocBat(2)}<h2 class="m-tieu">Nhà mình bán những gì?</h2><p class="m-phu-de">Chọn nhiều cũng được. Đăng bài sẽ điền sẵn.</p>
      <div class="m-loc">${["Xoài", "Sầu riêng", "Bưởi", "Thanh long", "Lúa gạo", "Cà phê", "Tôm", "Cá tra", "Rau củ", "Khác"].map((t, i) => `<button type="button" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>
      ${o("Giống, loại chính", "Xoài cát Chu", "Ví dụ: sầu riêng Ri6, tôm thẻ chân trắng")}`,
    day: nut("Tiếp tục", { ma: "ho-so", lop: "m-vang m-rong" }) }) },
  "ho-so": { tieu: "Hồ sơ", phu: "Bước 3 trên 5", ve: (s) => ({
    than: `${buocBat(3)}<h2 class="m-tieu">Bên mua sẽ gọi bác là gì?</h2>
      ${o("Họ tên (đúng căn cước)", s.ho.ten)}${o("Tên hay gọi", s.ho.goi, "Bên mua thấy tên này. Số điện thoại che tới khi có cọc.")}
      ${o("Xã, huyện, tỉnh", s.ho.noi)}
      <div class="m-hai-o"><label class="m-o"><span>Ngân hàng</span><select><option>Agribank</option><option>Vietcombank</option><option>BIDV</option></select></label>${o("Số tài khoản", "5104 2058 2186", "", 'inputmode="numeric"')}</div>
      <p class="m-ghi">Tài khoản phải đúng tên bác. Đổi tài khoản sau này phải chờ 24 giờ cho an toàn.</p>`,
    day: nut("Tiếp tục", { ma: "khai-bao-vuon", lop: "m-vang m-rong" }) }) },
  "khai-bao-vuon": { tieu: "Khai báo vườn", phu: "Bước 4 trên 5", ve: () => ({
    than: `${buocBat(4)}<h2 class="m-tieu">Vườn của bác ở đâu?</h2><p class="m-phu-de">Đứng trong vườn rồi bấm lấy vị trí. Bên mua chỉ thấy tới cấp ấp.</p>
      <div style="aspect-ratio:16/10;border-radius:18px;background:linear-gradient(160deg,#cfdcc4,#b9cfa9 50%,#d9cfa9);position:relative;overflow:hidden"><i style="position:absolute;inset:22% 28% 30% 24%;border:2.5px dashed var(--la);border-radius:18% 30% 22% 26%;background:rgba(31,77,58,.12)"></i><i style="position:absolute;left:50%;top:46%;width:18px;height:18px;border-radius:50%;background:var(--do);box-shadow:0 0 0 6px rgba(168,57,44,.25);transform:translate(-50%,-50%)" class="m-nay"></i></div>
      ${nut("Lấy vị trí đang đứng", { lop: "m-phu m-rong", icon: "la" })}
      ${o("Tên vườn", "Vườn xoài ấp 3")}<div class="m-hai-o">${o("Diện tích", "1,2 ha")}${o("Số cây", "320")}</div>
      ${o("Mã vùng trồng (nếu có)", "", "Không có cũng được. Bên xuất khẩu hay hỏi mã này.", 'placeholder="VD: VN-DT-0412"')}`,
    day: nut("Tiếp tục", { ma: "xac-minh", lop: "m-vang m-rong" }) }) },
  "xac-minh": { tieu: "Xác minh", phu: "Bước 5 trên 5", ve: () => ({
    than: `${buocBat(5)}<h2 class="m-tieu">Còn 2 việc để bác bán được</h2>
      ${the("", [["tich", "Số điện thoại", "0918 234 421", "Xong"], ["anh", "Chụp căn cước", "Mặt trước và mặt sau, đủ sáng", ""], ["nguoi", "Chụp mặt bác", "Để so với ảnh căn cước", ""]].map(([i, t, g, x]) => `<div class="m-dong" style="align-items:center"><span style="display:flex;gap:12px;align-items:center;color:var(--muc)"><span style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:${x ? "var(--la)" : "var(--vang-nhat)"};color:${x ? "#f4f1e8" : "var(--chin)"}">${ic(i, 20)}</span><span><b style="display:block">${t}</b><small class="m-ghi">${g}</small></span></span>${x ? nhan("Xong", "m-n-xong") : `<button class="m-nut m-phu m-nho" type="button">Chụp</button>`}</div>`).join(""))}
      ${viec("Sau khi gửi", "Nhân viên AgiViet duyệt trong 24 giờ. Trong lúc chờ, bác vẫn ghi nhật ký và đăng bài nháp được.", "", "m-cho")}`,
    day: `${nut("Gửi xác minh", { ma: "hom-nay", lop: "m-vang m-rong" })}${nut("Để sau, vào app trước", { ma: "hom-nay", lop: "m-chu m-rong" })}` }) },
  "tro-giup-truy-cap": { tieu: "Trợ giúp đăng nhập", phu: "Không vào được app?", ve: () => ({
    than: `<h2 class="m-tieu">Bác gặp chuyện gì?</h2>
      ${chon("loi", [["Không nhận được mã", "Chờ 1 phút rồi gửi lại, hoặc nhận qua cuộc gọi"], ["Đổi số điện thoại", "Chụp căn cước để giữ tài khoản cũ"], ["Quên mã PIN", "Nhận mã qua tin nhắn để đặt PIN mới"]])}
      <div class="m-hai-o">${nut("Gọi tổng đài", { lop: "m-phu", icon: "dien" })}${nut("Nhờ người giúp", { lop: "m-phu", icon: "nguoi", ma: "nguoi-giup" })}</div>
      <p class="m-ghi">Tổng đài 1900 1234 · 6:00–21:00 mỗi ngày.</p>`,
    day: nut("Nhận mã qua cuộc gọi", { lop: "m-vang m-rong" }) }) },

  // ── Hôm nay ──
  "hom-nay": { tieu: "Hộ Nguyễn Thị Năm", phu: "Chào chị Năm · Thứ Hai 27/10", tab: "hom-nay", ve: (s) => {
    const b = BUOC[Math.min(s.hd.buoc, 14)], xong = s.hd.buoc >= 15;
    return { than: `
      ${xong ? viec("HĐ-0018 đã hoàn tất", "Tiền xoài đã về đủ. Cảm ơn chị Năm.", "", "m-xong")
        : b.ai === "bac" ? viec(b.lam, `HĐ-0018 · Nhà máy sấy Đồng Xanh · 2.000 kg xoài${b.han ? ` · hạn ${b.han}` : ""}`, `<div style="margin-top:4px">${nut(b.nut, { ma: b.di || "chi-tiet-don", lop: "m-vang m-rong" })}</div>`)
        : viec(`Đang chờ ${b.ai === "nh" ? "ngân hàng" : "bên mua"}`, `${esc(b.lam)}. Bác chưa phải làm gì.`, `<div>${nut("Xem hợp đồng", { ma: "chi-tiet-don", lop: "m-phu m-rong" })}</div>`, "m-cho")}
      <div class="m-loi-tat">${[["troi", "Thời tiết", "thoi-tiet"], ["so", "Nhật ký canh tác", "nhat-ky"], ["hd", "Hợp đồng", "lich"], ["bao", "Giá & tin tức", "gia-tin-tuc"], ["cai", "Cài đặt & Hỗ trợ", "toi"]].map(([i, t, m]) => `<button type="button" data-di="${m}">${ic(i, 28)}<span>${t}</span></button>`).join("")}</div>
      ${the("Hợp đồng đang chạy", `<div role="button" data-di="chi-tiet-don" style="display:grid;gap:10px;cursor:pointer"><div style="display:flex;justify-content:space-between;gap:10px"><b>HĐ-0018 · Đồng Xanh</b><span class="m-so">${d(46000000)}</span></div>${chang(b.chang, xong)}</div>
        ${s.hopDongKhac.map((h) => `<div class="m-dong"><span>${h.ma} · ${esc(h.ben)}<br><small class="m-ghi">${esc(h.viec)}</small></span><b>${h.luot === "bac" ? nhan("Tới lượt bác", "m-n-bac") : nhan("Xong", "m-n-xong")}</b></div>`).join("")}`, lk("Tất cả", "lich"))}
      ${the("Thời tiết Cao Lãnh", `<div style="display:flex;align-items:center;gap:14px">${ic("troi", 40)}<div><b style="font-size:24px">32°</b> <span class="m-ghi">· có thể mưa chiều, 7 mm</span><p class="m-ghi">Chuẩn bị bạt che khi hái và chờ xe.</p></div></div>`, lk("7 ngày", "thoi-tiet"))}
      ${the("Tuần này", dong("Lời chào mới", "3") + dong("Tiền về", d(27600000)) + dong("Nhật ký đã ghi", "4 lần"), lk("Tổng kết", "tong-ket-tuan"))}` };
  } },
  "tong-ket-tuan": { tieu: "Tổng kết tuần", phu: "20–26/10", ve: (s) => ({ than: `
    <div class="m-so-lon m-tien"><small>Tiền về tuần này</small><b>${d(27600000)}</b></div>
    ${the("Bán hàng", dong("Lời chào nhận", "5") + dong("Đã đồng ý", "2") + dong("Hợp đồng mới", "1 · HĐ-0018"))}
    ${the("Vườn", dong("Nhật ký đã ghi", "4 lần") + dong("Có ảnh làm chứng", "3 lần") + dong("Cách ly thuốc", "hết 09/11"))}
    ${viec("Tuần tới", "Giao 50 kg cho Bếp Sen thứ Năm. Lô L-0414 dự hái 12/11, nhớ chụp ảnh vườn trước khi đăng.", "", "m-cho")}` }) },
  "thong-bao": { tieu: "Thông báo", ve: () => ({ than: `
    <div class="m-loc"><button type="button" aria-pressed="true">Tất cả</button><button type="button" aria-pressed="false">Cần bác làm 2</button><button type="button" aria-pressed="false">Tiền</button></div>
    ${[["can", "Đồng Xanh trả giá lần cuối 23.000 đ/kg", "Bấm để trả lời · 09:05", "chat", true, { ma: "T1" }], ["canh", "Vựa Ba Cường gửi số điện thoại, đã bị che", "Trao đổi trước khi có cọc là vi phạm · hôm qua", "chat", false, { ma: "T2" }], ["troi", "Không có mưa lớn, gió mạnh 3 ngày tới", "Thời tiết Cao Lãnh", "thoi-tiet", false], ["tien", "Ngân hàng chuyển cọc HĐ-0009: 7.200.000 đ", "Kiểm tài khoản Agribank •••• 2186 · 28/10", "lich-su-tien", false], ["bao", "Giá xoài cát Chu tuần này 21.500–24.000 đ/kg", "Tin ngành · 27/10", "gia-tin-tuc", false]].map(([i, t, g, m, can, th]) => `<div class="m-hang" data-di="${m}"${th ? ` data-tham='${JSON.stringify(th)}'` : ""}><span class="m-anh" style="display:grid;place-items:center;background:${can ? "var(--do-nen)" : "var(--la-nhat)"};color:${can ? "var(--do)" : "var(--la)"};width:48px;height:48px">${ic(i, 24)}</span><span><b>${esc(t)}</b><small>${esc(g)}</small></span>${can ? nhan("Cần bác", "m-n-bac") : ""}</div>`).join("")}` }) },

  // ── Vườn ──
  vuon: { tieu: "Vườn của tôi", ve: (s) => { const v = s.vuon[0]; return { than: `
    <div style="aspect-ratio:16/9;border-radius:18px;background:url(/assets/products/xoai-cat-chu.jpg) center/cover;position:relative"><span class="m-nhan m-n-xong" style="position:absolute;left:12px;top:12px">Nhân viên đã tới vườn 20/10</span></div>
    ${the(v.ten, dong("Diện tích", v.dt) + dong("Cây", `${v.soCay} cây ${v.cay}`) + dong("Mã vùng trồng", v.maVung) + dong("Cách ly thuốc", nhan("Còn tới 09/11", "m-n-bac")))}
    <div class="m-hai-o">${nut("Mùa vụ", { ma: "mua-vu", lop: "m-phu", icon: "lich" })}${nut("Nhật ký", { ma: "nhat-ky", lop: "m-phu", icon: "so" })}</div>
    <div class="m-hai-o">${nut("Thu chi", { ma: "thu-chi", lop: "m-phu", icon: "tien" })}${nut("Hồ sơ nguồn gốc", { ma: "ho-so-vuon", lop: "m-phu", icon: "khien" })}</div>`,
    day: nut("Nói để ghi nhật ký", { ma: "ghi", lop: "m-vang m-rong", icon: "mic" }) }; } },
  "mua-vu": { tieu: "Mùa vụ", phu: "Vườn xoài ấp 3 · vụ nghịch 2026", ve: () => ({ than: `
    <ol class="m-buoc">${[["Ra hoa", "08/2026", 1], ["Bao trái", "09/2026 · 3.200 trái", 1], ["Hái đợt 1", "27/10 · 350 kg", 1], ["Hái đợt 2", "dự 12/11 · ~2.000 kg (L-0414)", 0], ["Cắt tỉa sau vụ", "12/2026", -1]].map(([t, g, k]) => `<li class="${k > 0 ? "m-b-xong" : k === 0 ? "m-b-nay" : "m-b-cho"}"><span class="m-b-vong">${k > 0 ? ic("tich", 15) : ""}</span><div><b>${t}</b><small>${g}</small></div></li>`).join("")}</ol>
    ${viec("Đợt 2 có thể bán trước", "Đăng \"sắp có hàng\" cho lô L-0414, hái từ 12/11 (sau ngày hết cách ly 09/11).", `<div>${nut("Xem lô L-0414", { ma: "sap-co-hang", lop: "m-phu m-rong" })}</div>`)}` }) },
  "nhat-ky": { tieu: "Nhật ký canh tác", phu: "Vườn xoài ấp 3", ve: (s) => ({ than: `
    ${viec("Nhật ký có ảnh được bên mua tin hơn", "Ảnh chụp trong app có giờ và vị trí. Nhân viên tới vườn sẽ đánh dấu \"đã kiểm\".", "", "m-cho")}
    <div class="m-loc"><button type="button" aria-pressed="true">Tất cả</button><button type="button" aria-pressed="false">Phun thuốc</button><button type="button" aria-pressed="false">Thu hoạch</button></div>
    ${s.nhatKy.map((n) => `<section class="m-the" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>${esc(n.ngay)} · ${esc(n.viec)}</b>${nhan(...NGUON[n.kiem ? "vh" : n.nguon])}</div><p class="m-ghi">${esc(n.chi)}</p>${n.anh ? `<div class="m-luoi-anh">${Array.from({ length: Math.min(n.anh, 3) }, () => `<span style="background-image:url(/assets/products/xoai-cat-chu.jpg)"></span>`).join("")}</div>` : `<p class="m-ghi" style="color:var(--chin)">Chưa có ảnh làm chứng</p>`}</section>`).join("")}`,
    day: `<div class="m-hang-nut">${nut("Gõ", { ma: "xac-nhan-ghi", lop: "m-phu" })}${nut("Nói để ghi", { ma: "ghi", lop: "m-vang", icon: "mic" })}</div>` }) },
  "thu-chi": { tieu: "Thu chi", phu: "Tháng 10/2026", ve: (s) => ({ than: `
    <div class="m-hai-o"><div class="m-the m-so-lon m-tien"><small>Thu</small><b style="font-size:22px">${d(27600000)}</b></div><div class="m-the m-so-lon"><small>Chi</small><b style="font-size:22px">${d(1200000)}</b></div></div>
    ${the("Các khoản", s.thuChi.map((x) => dong(`${x.ngay} · ${esc(x.noi)}`, `<span style="color:${x.vao ? "var(--la)" : "var(--do)"}">${x.vao ? "+" : "−"}${so(x.so)}</span>`)).join(""))}
    <p class="m-ghi">Tiền bán qua AgiViet tự vào sổ. Khoản chi bác nói hoặc chụp hóa đơn để ghi.</p>`,
    day: nut("Ghi khoản chi", { ma: "ghi", lop: "m-vang m-rong", icon: "mic" }) }) },
  ghi: { tieu: "Nói để ghi", phu: "Nhật ký canh tác", ve: () => ({ than: `
    <div class="m-mic">${ic("mic", 44)}</div>
    <p style="text-align:center;font-size:18px;font-weight:600">Đang nghe…</p>
    <section class="m-the" style="background:var(--giay-lot);box-shadow:none"><p style="font-size:18px;line-height:1.5">"Sáng nay phun thuốc trừ rầy hai bình, thuốc Abamectin, cách ly bảy ngày"</p></section>
    <p class="m-ghi" style="text-align:center">Nói tự nhiên. Xong thì bấm "Xong, kiểm tra".</p>
    ${nut("Chụp ảnh làm chứng", { lop: "m-phu m-rong", icon: "anh" })}`,
    day: `<div class="m-hang-nut">${nut("Hủy", { lop: "m-phu" }).replace('type="button"', 'type="button" data-lui')}${nut("Xong, kiểm tra", { ma: "xac-nhan-ghi", lop: "m-vang" })}</div>` }) },
  "xac-nhan-ghi": { tieu: "Kiểm tra dòng vừa ghi", phu: "AI tách từ lời bác nói", ve: () => ({ than: `
    ${the("Dòng nhật ký", dong("Ngày", "02/11/2026") + dong("Việc", "Phun thuốc") + dong("Thuốc", "Abamectin") + dong("Lượng", "2 bình") + dong("Cách ly", "7 ngày → hết 09/11"))}
    <div class="m-luoi-anh"><span style="background-image:url(/assets/products/xoai-cat-chu.jpg)"></span><span style="background-image:url(/assets/products/xoai-cat-chu.jpg);filter:hue-rotate(20deg)"></span><button type="button" style="border:1.5px dashed var(--ke-dam);background:none;display:grid;place-items:center;color:var(--la)">${ic("them", 26)}</button></div>
    ${viec("Sau khi lưu", "Lô xoài sẽ chỉ đăng được \"sắp có hàng\", hái từ 09/11 trở đi.", "", "m-cho")}
    <p class="m-ghi">Ảnh chụp trong app mới tính làm chứng. Dòng này sẽ có nhãn "Chụp trong app".</p>`,
    day: `<div class="m-hang-nut">${nut("Sửa", { ma: "ghi", lop: "m-phu" })}${nut("Lưu vào nhật ký", { id: "luu-nk", lop: "m-vang" })}</div>` }),
    sau: (el, s, t, api) => el.querySelector("#luu-nk").addEventListener("click", () => { api.toast("Đã lưu nhật ký phun thuốc 02/11"); api.lui(); }) },
  "cach-ly": { tieu: "Thời gian cách ly", phu: "Vườn xoài ấp 3", ve: () => ({ than: `
    <div class="m-so-lon"><small>Còn cách ly thuốc tới</small><b style="color:var(--do)">09/11/2026</b><span class="m-ghi">7 ngày nữa · lần phun 02/11 (Abamectin)</span></div>
    ${the("Trong lúc cách ly", dong("Đăng \"có hàng ngay\"", nhan("Không được", "m-n-bac")) + dong("Đăng \"sắp có hàng\"", nhan("Được, hái từ 09/11", "m-n-xong")) + dong("Giao hàng", nhan("Từ 09/11", "m-n-tien")))}
    <p class="m-ghi">Ngày hết cách ly lấy từ nhật ký phun thuốc. Nếu bác phun thêm mà chưa ghi, phải ghi trước khi đăng bán.</p>` }) },
  "ho-so-vuon": { tieu: "Hồ sơ nguồn gốc", phu: "Bên mua thấy trang này", ve: () => ({ than: `
    ${the("Đã xác minh", dong("Danh tính", nhan("Căn cước · 14/09", "m-n-xong")) + dong("Vườn", nhan("Nhân viên tới 20/10", "m-n-nh")) + dong("Tài khoản nhận tiền", nhan("Đúng tên", "m-n-xong")))}
    ${the("Nhật ký 30 ngày", dong("Số lần ghi", "12") + dong("Có ảnh chụp trong app", "8") + dong("Nhân viên đã kiểm", "3"))}
    ${the("Giấy tờ", dong("Mã vùng trồng VN-DT-0412", nhan("Đã xác minh", "m-n-xong")) + dong("VietGAP", nhan("Chưa có", "")))}
    ${nut("Xin xác minh thêm giấy tờ", { ma: "phan-cua-toi", lop: "m-phu m-rong", icon: "khien" })}` }) },
};
