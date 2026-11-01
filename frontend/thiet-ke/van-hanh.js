// Trang VẬN HÀNH AgiViet (nhân viên + quản trị) — 11 màn theo danh mục "Trang vận hành". Máy tính là chính.
import { esc, d, so, icon, taoKho, chayApp } from "./so-lam-an.js";

const kho = taoKho("agv-van-hanh", { phien: "vh-v1", duyet: {}, tc: { quyet: null }, khoa: {}, phi: { gt: 0.3, mq: 0.3, tran: 2000000 } });
const doi = (f) => kho.doi(f);
const the = (tieu, than, phai = "") => `<section class="sl-the"><div class="sl-the-dau"><h2><span class="sl-cham"></span>${esc(tieu)}</h2>${phai}</div>${than}</section>`;
const dong = (a, b, lop = "") => `<div class="sl-dong ${lop}"><span>${a}</span><b>${b}</b></div>`;
const bao = (chu, loai = "") => `<div class="sl-bao ${loai}">${icon(loai === "sl-bao-do" ? "canh" : "khien")}<div>${chu}</div></div>`;
const nhan = (t, l = "") => `<span class="sl-nhan ${l}">${esc(t)}</span>`;
const loc = (ds, chon = 0) => `<div class="sl-loc" role="group">${ds.map((x, i) => `<button type="button" aria-pressed="${i === chon}">${esc(x)}</button>`).join("")}</div>`;
const ganLoc = (g) => g.querySelectorAll(".sl-loc").forEach((x) => x.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; x.querySelectorAll("button").forEach((y) => y.setAttribute("aria-pressed", String(y === b))); }));
const bang = (dau, hang) => `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr>${dau.map((h) => `<th class="${h.endsWith("#") ? "sl-so" : ""}">${esc(h.replace("#", ""))}</th>`).join("")}</tr></thead><tbody>${hang.join("")}</tbody></table></div>`;

const XM = [
  { ma: "XM-311", ten: "Nguyễn Thị Năm", loai: "Người bán · nông hộ", noi: "Mỹ Xương, Cao Lãnh", gui: "2 giờ trước", han: 22, giay: "Căn cước + ảnh vườn + tài khoản" },
  { ma: "XM-312", ten: "HTX Tân Thuận", loai: "Người bán · HTX", noi: "Chợ Gạo, Tiền Giang", gui: "5 giờ trước", han: 19, giay: "Giấy đăng ký HTX + biên bản họp" },
  { ma: "XM-308", ten: "Nhà máy sấy Đồng Xanh", loai: "Bên mua · chế biến", noi: "Sa Đéc, Đồng Tháp", gui: "Hôm qua", han: 4, giay: "Giấy phép kinh doanh + tài khoản công ty" },
  { ma: "XM-305", ten: "Vựa Ba Cường", loai: "Bên mua · vựa", noi: "Cái Bè, Tiền Giang", gui: "2 ngày", han: -2, giay: "Giấy phép hộ kinh doanh" },
];
const TC = [
  { ma: "TC-021", don: "HĐ-0019", hang: "Xoài cát Chu · 2.000 kg", ban: "Chị Năm", mua: "Nhà máy Đồng Xanh", dong: "Hạ cấp 120 kg", tien: 960000, han: "còn 38 giờ", buoc: "Kiểm định 48 giờ" },
  { ma: "TC-019", don: "HĐ-0012", hang: "Xoài cát Chu · 1.500 kg", ban: "Chị Mười", mua: "Nhà máy Đồng Xanh", dong: "Lệch tiền trả thẳng", tien: 12200000, han: "còn 1 ngày", buoc: "Chờ chứng từ" },
  { ma: "TC-017", don: "HĐ-0009", hang: "Tôm thẻ · 700 kg", ban: "Chị Bảy Hồng", mua: "Vựa Ba Cường", dong: "Trả lại 700 kg", tien: 3100000, han: "quá 3 giờ", buoc: "Chờ người bán hoàn" },
];

const man = {
  "tong-quan-vh": { tieuDe: "Tổng quan vận hành", phu: "Thứ Hai 27/10 · ca sáng · 3 nhân viên trực", ve: (s, { url }) => `
    <div class="sl-dai">
      <a class="sl-gap" href="${url("tranh-chap")}"><small>Tranh chấp mở</small><b>3</b><span>1 quá hạn xử lý</span></a>
      <a href="${url("duyet-xac-minh")}"><small>Chờ xác minh</small><b>${4 - Object.keys(s.duyet).length}</b><span>1 quá 24 giờ</span></a>
      <div><small>Đơn kẹt quá hạn</small><b>2</b><span>người bán im lặng quá 24 giờ</span></div>
      <a class="sl-tien" href="${url("tien-dam-bao")}"><small>Ngân hàng đang giữ</small><b>412 tr</b><span>38 đơn · 2 lệnh chưa khớp</span></a>
    </div>
    <div class="sl-luoi sl-chinh-phu">
      ${the("Việc gấp theo hạn", bang(["Việc", "Đối tượng", "Hạn", "Người nhận", ""], [
        `<tr><td>Tranh chấp quá hạn</td><td><a href="${url("chi-tiet-tranh-chap")}">TC-017</a> · tôm thẻ</td><td>${nhan("quá 3 giờ", "sl-n-ban")}</td><td>Chưa giao</td><td><a class="sl-nut sl-vang" href="${url("chi-tiet-tranh-chap")}">Nhận việc</a></td></tr>`,
        `<tr><td>Xác minh quá 24 giờ</td><td><a href="${url("chi-tiet-xac-minh")}">XM-305</a> · Vựa Ba Cường</td><td>${nhan("quá 2 giờ", "sl-n-ban")}</td><td>Minh</td><td></td></tr>`,
        `<tr><td>Lệnh ngân hàng chưa khớp</td><td><a href="${url("tien-dam-bao")}">HĐ-0021</a> · cọc</td><td>${nhan("trong ngày")}</td><td>Lan</td><td></td></tr>`,
        `<tr><td>Tin bị gắn cờ</td><td><a href="${url("kiem-duyet-tin")}">L-0452</a> · ảnh lấy trên mạng</td><td>${nhan("còn 4 giờ")}</td><td>Chưa giao</td><td></td></tr>`,
        `<tr><td>Nghi lách liên lạc</td><td><a href="${url("canh-bao-lach")}">2 hội thoại</a></td><td>${nhan("còn 6 giờ")}</td><td>Chưa giao</td><td></td></tr>`]))}
      <div style="display:grid;gap:16px">
        ${the("Hôm nay", dong("Đơn mới ký", "14") + dong("Cọc ngân hàng xác nhận", "11 · 164,2 tr") + dong("Chi cọc cho người bán", "9 · 98,6 tr") + dong("Yêu cầu hỗ trợ mới", "7"))}
        ${the("Ca trực", dong("Minh", "Xác minh, kiểm duyệt") + dong("Lan", "Tiền, đối soát") + dong("Hùng", "Tranh chấp, hỗ trợ"))}
      </div>
    </div>` },

  "duyet-xac-minh": { tieuDe: "Hàng chờ xác minh", phu: "Người bán và bên mua · hạn 24 giờ từ lúc gửi", ve: (s, { url }) => `
    ${loc(["Tất cả", "Người bán", "Bên mua", "Quá hạn"])}
    ${the("Chờ duyệt", bang(["Mã", "Tên", "Loại", "Nơi", "Giấy tờ", "Gửi", "Hạn", ""], XM.map((x) => `<tr><td><a href="${url("chi-tiet-xac-minh", "&ma=" + x.ma)}">${x.ma}</a></td><td><b>${esc(x.ten)}</b></td><td>${esc(x.loai)}</td><td>${esc(x.noi)}</td><td class="sl-ghi">${esc(x.giay)}</td><td>${esc(x.gui)}</td><td>${s.duyet[x.ma] ? nhan(s.duyet[x.ma], s.duyet[x.ma] === "Đã duyệt" ? "sl-n-xong" : "") : x.han < 0 ? nhan(`quá ${-x.han} giờ`, "sl-n-ban") : nhan(`còn ${x.han} giờ`)}</td><td><a class="sl-nut sl-vien" href="${url("chi-tiet-xac-minh", "&ma=" + x.ma)}">Mở</a></td></tr>`)))}`, sau: ganLoc },
  "chi-tiet-xac-minh": { tieuDe: () => { const x = XM.find((y) => y.ma === new URLSearchParams(location.search).get("ma")) || XM[0]; return `Duyệt hồ sơ · ${x.ten}`; }, thuoc: "duyet-xac-minh", lui: "duyet-xac-minh", phu: () => { const x = XM.find((y) => y.ma === new URLSearchParams(location.search).get("ma")) || XM[0]; return `${x.ma} · ${x.loai} · ${x.noi}`; }, ve: (s, { q }) => { const x = XM.find((y) => y.ma === q.get("ma")) || XM[0]; const kq = s.duyet[x.ma]; return `
    ${kq ? bao(`${esc(kq)}. Người dùng đã được báo qua app.`, kq === "Đã duyệt" ? "" : "sl-bao-tien") : ""}
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        <div class="sl-luoi sl-l2">${["Căn cước mặt trước", "Ảnh chụp tại vườn"].map((t, i) => `<figure style="margin:0;display:grid;gap:6px"><div class="sl-lo-anh ${i ? "sl-anh-xoai" : ""}" style="border-radius:12px;${i ? "" : "background:repeating-linear-gradient(90deg,#e9e2cf 0 40px,#efe9d9 40px 80px)"}"></div><figcaption class="sl-ghi">${t}</figcaption></figure>`).join("")}</div>
        ${the("So khớp tự động", dong("Họ tên căn cước ↔ tên tài khoản ngân hàng", nhan("Khớp", "sl-n-xong")) + dong("Ảnh chân dung ↔ ảnh tự chụp", nhan("Khớp 96%", "sl-n-xong")) + dong("Vị trí ảnh vườn ↔ địa chỉ khai", nhan("Cách 0,4 km", "sl-n-xong")) + dong("Ảnh vườn có trên mạng không", nhan("Không tìm thấy", "sl-n-xong")) + dong("Số điện thoại trùng tài khoản khác", nhan("Không")))}
      </div>
      <section class="sl-the" style="display:grid;gap:12px;position:sticky;top:80px">
        <h2 style="font-size:var(--c3)">Quyết định</h2>
        <label class="sl-o"><span>Ghi chú (người dùng thấy nếu từ chối hoặc hỏi thêm)</span><textarea id="ghi">Ảnh căn cước rõ, vườn đúng vị trí.</textarea></label>
        <button class="sl-nut sl-vang" type="button" data-kq="Đã duyệt">Duyệt</button>
        <div class="sl-hang-nut"><button class="sl-nut sl-vien" type="button" data-kq="Đã hỏi thêm" style="flex:1">Hỏi thêm</button><button class="sl-nut sl-huy" type="button" data-kq="Đã từ chối" style="flex:1">Từ chối</button></div>
        <p class="sl-ghi">Mỗi quyết định ghi tên người duyệt và giờ, không sửa được.</p>
      </section>
    </div>`; }, sau: (g, k, { q }) => { const x = XM.find((y) => y.ma === q.get("ma")) || XM[0]; g.querySelectorAll("[data-kq]").forEach((b) => b.addEventListener("click", () => doi((s) => { s.duyet[x.ma] = b.dataset.kq; }))); } },

  "kiem-duyet-tin": { tieuDe: "Kiểm duyệt tin", phu: "Tin bị AI hoặc người dùng gắn cờ", ve: () => `
    ${loc(["Đang chờ (4)", "Ảnh lấy trên mạng", "Giá bất thường", "Tài khoản mới"])}
    <div class="sl-luoi sl-l2">${[["L-0452", "Sầu riêng Monthong loại 1", "Anh Tư Lợi · tài khoản 2 ngày", "Ảnh trùng 91% ảnh trên một trang bán hàng", "sl-anh-sau"], ["L-0449", "Tôm sú 20 con/kg", "Chị Út · Cà Mau", "Giá 95.000 đ thấp hơn 40% so với tuần", "sl-anh-tom"], ["L-0447", "Xoài cát Hòa Lộc", "Ông Hai Kiệt", "Lượng 50 tấn, vườn khai 0,5 ha", "sl-anh-xoai"], ["L-0444", "Cà phê nhân Robusta", "Vựa Minh Phát", "3 tài khoản cùng số điện thoại", "sl-anh-ca-phe"]].map(([m, t, n, ly, a]) => `<section class="sl-the" style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px"><div class="sl-lo-anh ${a}" style="border-radius:10px;aspect-ratio:1"></div><div style="display:grid;gap:6px;align-content:start"><b>${m} · ${t}</b><span class="sl-ghi">${n}</span>${bao(ly, "sl-bao-tien")}<div class="sl-hang-nut"><button class="sl-nut sl-nhe" type="button">Giữ tin</button><button class="sl-nut sl-vien" type="button">Ẩn, hỏi người bán</button><button class="sl-nut sl-huy" type="button">Gỡ tin</button></div></div></section>`).join("")}</div>`, sau: ganLoc },
  "canh-bao-lach": { tieuDe: "Lách liên lạc", phu: "Tin nhắn AI nghi trao số điện thoại trước khi cọc được xác nhận", ve: () => the("Cảnh báo", bang(["Hội thoại", "Trích (đã che)", "Mức", "Lần", ""], [
    `<tr><td>Anh Tư Hòa ↔ Vựa Ba Cường<div class="sl-ghi">Chưa có đơn</div></td><td>"gọi em số không chín ba ••• nha"</td><td>${nhan("Cao", "sl-n-ban")}</td><td class="sl-so">2</td><td><div class="sl-hang-nut"><button class="sl-nut sl-vien" type="button">Nhắc nhở</button><button class="sl-nut sl-huy" type="button">Khóa nhắn 24 giờ</button></div></td></tr>`,
    `<tr><td>Chị Út ↔ Nhà hàng Bếp Sen<div class="sl-ghi">PN-0051</div></td><td>"zalo em tên Út Cà Mau"</td><td>${nhan("Vừa", "sl-n-tien")}</td><td class="sl-so">1</td><td><div class="sl-hang-nut"><button class="sl-nut sl-vien" type="button">Nhắc nhở</button><button class="sl-nut sl-nhe" type="button">Bỏ qua</button></div></td></tr>`]) + `<p class="sl-ghi" style="margin-top:8px">Nhắc nhở lần đầu là tin nhắn tự động. Lần ba trong 30 ngày: khóa đăng tin 7 ngày (theo chính sách).</p>`) },

  "tranh-chap": { tieuDe: "Tranh chấp", phu: "Theo hạn xử lý", ve: (s, { url }) => `${loc(["Đang mở (3)", "Chờ kiểm định", "Đã chốt"])}${the("Đang mở", bang(["Mã", "Đơn", "Hai bên", "Dòng tranh chấp", "Số tiền#", "Bước", "Hạn"], TC.map((t) => `<tr><td><a href="${url("chi-tiet-tranh-chap", "&ma=" + t.ma)}">${t.ma}</a></td><td>${t.don}<div class="sl-ghi">${esc(t.hang)}</div></td><td>${esc(t.ban)} ↔ ${esc(t.mua)}</td><td>${esc(t.dong)}</td><td class="sl-so">${d(t.tien)}</td><td>${esc(t.buoc)}</td><td>${nhan(t.han, t.han.startsWith("quá") ? "sl-n-ban" : "")}</td></tr>`)))}`, sau: ganLoc },
  "chi-tiet-tranh-chap": { tieuDe: "Xử lý tranh chấp TC-021", thuoc: "tranh-chap", lui: "tranh-chap", phu: "HĐ-0019 · xoài cát Chu 2.000 kg · chị Năm ↔ Nhà máy Đồng Xanh", ve: (s) => `
    ${s.tc.quyet ? bao(`Đã chốt: ${esc(s.tc.quyet)}. Ngân hàng nhận lệnh xử lý cọc sau khi hai bên được báo.`) : bao("Chỉ dòng hạ cấp 120 kg đang tranh chấp. Các dòng khác đã chốt, phần không tranh chấp đã quyết toán.", "sl-bao-tien")}
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        ${the("AI tóm tắt hồ sơ", `<p>Bên mua hạ cấp 120 kg vì trái dưới 350 g. Người bán phản đối, nói đã lựa đúng quy cách và có video lúc bốc. Bên mua đã cân lại, kết quả giữ nguyên. Mẫu đối chứng M-2291 còn niêm phong tại kho.</p><p class="sl-ghi" style="margin-top:8px">Tóm tắt do AI viết từ chứng từ, người xử lý phải đọc chứng từ gốc trước khi quyết.</p>`)}
        <div class="sl-luoi sl-l2">
          ${the("Bên bán · chị Năm", dong("Video bốc tại vườn", "3 phút · 28/10 5:42") + dong("Ảnh trái lúc lựa", "6 ảnh") + dong("Ý kiến", "Đúng loại 1"))}
          ${the("Bên mua · Đồng Xanh", dong("Ảnh cân mẫu 20 trái", "4 ảnh") + dong("Phiếu cân lại", "PC-102877") + dong("Ý kiến", "120 kg dưới 350 g"))}
        </div>
        ${the("Lịch sử đơn", `<ol class="sl-buoc">${[["Nghiệm thu", "Đạt 1.850 · hạ cấp 120 · trả lại 30"], ["Người bán phản đối dòng hạ cấp", "28/10 14:20"], ["Bên mua cân lại", "28/10 16:05 · giữ nguyên"], ["Mở kiểm định 48 giờ", "Bên sai chịu phí kiểm định 850.000 đ"]].map(([a, b]) => `<li class="sl-b-xong"><span class="sl-b-vong">${icon("tich")}</span><div><b>${a}</b><span class="sl-ghi">${b}</span></div></li>`).join("")}</ol>`)}
      </div>
      <section class="sl-the" style="display:grid;gap:12px;position:sticky;top:80px">
        <h2 style="font-size:var(--c3)">Quyết định</h2>
        ${dong("Kết quả kiểm định", nhan("Đã có · 29/10", "sl-n-nh"))}
        <p class="sl-ghi">Trung tâm kiểm định Cần Thơ: 104/120 kg dưới 350 g.</p>
        <label class="sl-o"><span>Chốt</span><select id="quyet"><option>Giữ hạ cấp 104 kg, 16 kg tính loại 1 · bên mua chịu phí kiểm định theo tỷ lệ</option><option>Giữ nguyên hạ cấp 120 kg · người bán chịu phí kiểm định</option><option>Bỏ hạ cấp · bên mua chịu phí kiểm định</option></select></label>
        <button class="sl-nut sl-vang" type="button" id="chot">Chốt và gửi hai bên</button>
        <p class="sl-ghi">Hai bên có 24 giờ để khiếu nại lên quản trị trước khi ngân hàng xử lý cọc.</p>
      </section>
    </div>`, sau: (g) => g.querySelector("#chot")?.addEventListener("click", () => doi((s) => { s.tc.quyet = g.querySelector("#quyet").value; })) },

  "tien-dam-bao": { tieuDe: "Tiền đảm bảo", phu: "Tiền ngân hàng đối tác giữ · đối chiếu sao kê", ve: () => `
    <div class="sl-luoi sl-l3">
      <div class="sl-the sl-chiso sl-tien"><small>Đang giữ</small><b>412.380.000 đ</b><span>38 đơn</span></div>
      <div class="sl-the sl-chiso"><small>Lệnh chuyển người bán hôm nay</small><b>9</b><span>98.600.000 đ · 8 đã về</span></div>
      <div class="sl-the sl-chiso sl-gap"><small>Chưa khớp sao kê</small><b>2</b><span>cần kiểm tay</span></div>
    </div>
    ${the("Lệnh ngân hàng", bang(["Đơn", "Loại lệnh", "Số tiền#", "Gửi lúc", "Sao kê", ""], [
      `<tr><td>HĐ-0016</td><td>Chi cọc cho người bán</td><td class="sl-so">${d(12150000)}</td><td>08:02</td><td>${nhan("Khớp", "sl-n-xong")}</td><td></td></tr>`,
      `<tr><td>HĐ-0016</td><td>Hoàn bên mua</td><td class="sl-so">${d(1650000)}</td><td>08:02</td><td>${nhan("Khớp", "sl-n-xong")}</td><td></td></tr>`,
      `<tr><td>HĐ-0021</td><td>Nhận cọc</td><td class="sl-so">${d(12780000)}</td><td>07:40</td><td>${nhan("Chưa thấy trên sao kê", "sl-n-ban")}</td><td><button class="sl-nut sl-vien" type="button">Kiểm tay</button></td></tr>`,
      `<tr><td>HĐ-0013</td><td>Chi cọc cho người bán</td><td class="sl-so">${d(7200000)}</td><td>Hôm qua</td><td>${nhan("Ngân hàng báo lỗi tài khoản", "sl-n-ban")}</td><td><button class="sl-nut sl-vien" type="button">Gửi lại</button></td></tr>`]))}
    ${bao("Nhân viên không chuyển tiền tay. Mọi lệnh đi qua ngân hàng đối tác, có hai người duyệt khi trên 50 triệu.", "sl-bao-nh")}` },

  "nguoi-dung": { tieuDe: "Người dùng", phu: "Tra cứu tài khoản, lịch sử, khóa", phai: () => `<label class="sl-tim">${icon("tim")}<input placeholder="Tên, số điện thoại, mã số thuế" aria-label="Tìm người dùng"></label>`, ve: (s) => the("Kết quả", bang(["Tài khoản", "Vai", "Xác minh", "Đơn", "Cảnh báo", "Trạng thái", ""], [
    ["U-1042", "Nguyễn Thị Năm", "Người bán", "Đã xác minh", 31, "0"], ["U-2011", "Nhà máy sấy Đồng Xanh", "Bên mua", "Đã xác minh", 15, "0"], ["U-1188", "Anh Tư Hòa", "Người bán", "Đã xác minh", 12, "2 lần lách liên lạc"], ["U-1203", "Anh Tư Lợi", "Người bán", "Chờ", 0, "Ảnh lấy trên mạng"],
  ].map(([m, t, v, x, n, c]) => `<tr><td><b>${t}</b><div class="sl-ghi">${m}</div></td><td>${v}</td><td>${nhan(x, x === "Đã xác minh" ? "sl-n-xong" : "")}</td><td class="sl-so">${n}</td><td>${c === "0" ? `<span class="sl-ghi">Không</span>` : nhan(c, "sl-n-tien")}</td><td>${s.khoa[m] ? nhan("Đã khóa", "sl-n-ban") : nhan("Đang hoạt động", "sl-n-xong")}</td><td><button class="sl-nut ${s.khoa[m] ? "sl-vien" : "sl-huy"}" type="button" data-khoa="${m}">${s.khoa[m] ? "Mở khóa" : "Khóa"}</button></td></tr>`)) + `<p class="sl-ghi" style="margin-top:8px">Khóa tài khoản không hủy đơn đang chạy; đơn chuyển người vận hành theo dõi.</p>`), sau: (g) => g.querySelectorAll("[data-khoa]").forEach((b) => b.addEventListener("click", () => doi((s) => { s.khoa[b.dataset.khoa] = !s.khoa[b.dataset.khoa]; }))) },

  "yeu-cau-ho-tro": { tieuDe: "Yêu cầu hỗ trợ", phu: "Hàng chờ · giao người xử lý · trả lời", ve: () => `
    <div class="sl-hai-cot" style="grid-template-columns:minmax(0,1fr) 400px">
      ${the("Hàng chờ (7)", bang(["Mã", "Người gửi", "Chủ đề", "Kênh", "Chờ", "Giao"], [
        ["HT-882", "Chị Năm", "Chưa thấy tiền cọc về", "Gọi", "25 phút", "Lan"], ["HT-881", "Bác Hai Lúa", "Không đăng nhập được, mất số cũ", "App", "1 giờ", "—"], ["HT-879", "Nhà hàng Bếp Sen", "Muốn đổi kỳ hóa đơn", "Email", "3 giờ", "Hùng"]].map((r, i) => `<tr class="${i === 0 ? "sl-chon" : ""}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5] === "—" ? `<select aria-label="Giao người" style="font:inherit;padding:6px;border-radius:8px;background:var(--giay-lot);border:1px solid var(--ke-dam)"><option>Chọn</option><option>Minh</option><option>Lan</option><option>Hùng</option></select>` : r[5]}</td></tr>`)))}
      <section class="sl-the" style="display:grid;gap:12px">
        <b>HT-882 · Chị Năm · HĐ-0016</b>
        <p style="background:var(--giay-lot);padding:10px 12px;border-radius:12px">Cô ơi tiền cọc đơn xoài sao chưa thấy về tài khoản Agribank?</p>
        ${dong("Lệnh chi cọc", nhan("Ngân hàng đã chuyển 08:02", "sl-n-xong")) + dong("Sao kê", nhan("Khớp", "sl-n-xong"))}
        <label class="sl-o"><span>Trả lời</span><textarea>Dạ chị Năm, ngân hàng đã chuyển 12.150.000 đ lúc 8 giờ 2 phút sáng nay vào Agribank •••• 2186. Liên ngân hàng có thể chậm tới 2 giờ, chị kiểm lại giúp em nha.</textarea></label>
        <div class="sl-hang-nut"><button class="sl-nut sl-vang" type="button">Gửi trả lời</button><button class="sl-nut sl-vien" type="button">Gọi lại</button></div>
      </section>
    </div>` },

  "tinh-huong-vh": { tieuDe: "Chạy tình huống vận hành", phu: "Theo mô hình quy trình v23 · từng bước, đúng vai", ve: () => `<div id="vh-th"><p class="sl-ghi">Đang nạp mô hình quy trình…</p></div>`,
    sau: async (goc, kho, { q }) => { const ds = await napTH(); veTH(goc, ds, q.get("th") || docTH().id); } },
  "cau-hinh-phi": { tieuDe: "Cấu hình phí", phu: "Chỉ quản trị · đổi phí không ảnh hưởng đơn đã ký", ve: (s) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <div class="sl-luoi sl-l3">
          <label class="sl-o"><span>Phí giới thiệu đơn đầu (%)</span><input id="gt" value="${s.phi.gt}" inputmode="decimal"></label>
          <label class="sl-o"><span>Phí mối quen, gói Miễn phí (%)</span><input id="mq" value="${s.phi.mq}" inputmode="decimal"></label>
          <label class="sl-o"><span>Trần phí mỗi đơn (đ)</span><input id="tran" value="${so(s.phi.tran)}" inputmode="numeric"></label>
        </div>
        ${the("Gói", bang(["Gói", "Giá tháng#", "Phí mối quen", "Người dùng#"], [`<tr><td>Miễn phí</td><td class="sl-so">0 đ</td><td>${s.phi.mq}%</td><td class="sl-so">1</td></tr>`, `<tr><td>Business</td><td class="sl-so">990.000 đ</td><td>0%</td><td class="sl-so">5</td></tr>`]))}
        <label class="sl-o"><span>Áp dụng cho đơn ký từ</span><input type="date" value="2026-11-01"></label>
        <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vang" type="button" id="luu-phi">Lưu, chờ quản trị thứ hai duyệt</button></div>
      </section>
      ${the("Ví dụ đơn 46.000.000 đ", dong("Phí giới thiệu", d(Math.min(s.phi.tran, Math.round(46000000 * s.phi.gt / 100)))) + dong("Phí mối quen (Miễn phí)", d(Math.min(s.phi.tran, Math.round(46000000 * s.phi.mq / 100)))) + dong("Phí mối quen (Business)", "0 đ") + `<p class="sl-ghi" style="margin-top:8px">Phí lưu vào hợp đồng lúc ký. Lịch sử thay đổi phí giữ vĩnh viễn.</p>`)}
    </div>`, sau: (g) => g.querySelector("#luu-phi")?.addEventListener("click", () => doi((s) => { s.phi.gt = Number(g.querySelector("#gt").value.replace(",", ".")) || s.phi.gt; s.phi.mq = Number(g.querySelector("#mq").value.replace(",", ".")) || s.phi.mq; s.phi.tran = Number(g.querySelector("#tran").value.replace(/\D/g, "")) || s.phi.tran; })) },
};

// ── Chạy tình huống vận hành: các tình huống v23 KHÔNG có đủ hai bên bán + mua (ngân hàng, nhân viên, quản trị, một bên).
// Đọc thẳng /mo-phong-quy-trinh/quy-trinh.json; người vận hành xác nhận từng bước theo đúng vai, đúng thứ tự v23.
const K_TH = "agv-vh-tinh-huong";
const VAI_TEN = { ban: "Người bán", mua: "Bên mua", nv: "Nhân viên AgiViet", qt: "Quản trị AgiViet", nh: "Ngân hàng", dt: "Đối tác dịch vụ", app: "Hệ thống" };
const SO_TEN = { coc_giu: "Cọc ngân hàng giữ", phai_tra: "Còn phải trả", da_tra: "Đã trả", hoan: "Hoàn", no: "Nợ" };
const docTH = () => { try { return JSON.parse(localStorage.getItem(K_TH)) || {}; } catch { return {}; } };
const ghiTH = (x) => { try { localStorage.setItem(K_TH, JSON.stringify(x)); } catch {} };
let QT_TH = null;
async function napTH() {
  if (!QT_TH) {
    const qt = await fetch("/mo-phong-quy-trinh/quy-trinh.json").then((r) => r.json());
    QT_TH = qt.tinh_huong.filter((t) => { const v = new Set((t.buoc || []).map((b) => b.vai)); return !(v.has("ban") && v.has("mua")); });
  }
  return QT_TH;
}
function veTH(goc, ds, id) {
  const th = ds.find((t) => t.id === id) || ds[0];
  const st = docTH(); if (st.id !== th.id) { st.id = th.id; st.pi = 0; ghiTH(st); }
  const pi = st.pi || 0, xong = pi >= th.buoc.length, b = th.buoc[pi];
  let so = {}; th.buoc.slice(0, Math.min(pi + 1, th.buoc.length)).forEach((x) => Object.assign(so, x.so || {}));
  goc.querySelector("#vh-th").innerHTML = `
    <div class="sl-luoi sl-l2" style="align-items:start">
      <div style="display:grid;gap:12px">
        ${the("Tình huống", `<label class="sl-o"><span>Chọn tình huống (${ds.length} tình huống chỉ có vận hành / ngân hàng / một bên)</span><select id="th-chon">${ds.map((t) => `<option value="${t.id}" ${t.id === th.id ? "selected" : ""}>${esc(t.ten)}</option>`).join("")}</select></label><p class="sl-ghi" style="margin-top:6px">${esc(th.mo_ta || "")}</p>`)}
        ${xong ? `<section class="sl-viec sl-xong" id="th-viec" style="grid-template-columns:minmax(0,1fr)"><div><h2>Đã đi hết ${th.buoc.length} bước</h2><p>Tình huống "${esc(th.ten)}" chạy xong theo đúng thứ tự v23.</p></div><div class="sl-hang-nut" style="grid-row:auto;grid-column:auto"><button class="sl-nut sl-vien" type="button" id="th-lai">Chạy lại</button></div></section>`
          : `<section class="sl-viec" id="th-viec" style="grid-template-columns:minmax(0,1fr)"><div><h2>Bước ${pi + 1}/${th.buoc.length} · ${esc(VAI_TEN[b.vai] || b.vai)}: ${esc(b.viec)}</h2>
            <p>${esc(b.chi_tiet || "")}${b.dieu_kien ? ` <b>Điều kiện:</b> ${esc(b.dieu_kien)}.` : ""}${b.han ? ` <b>Hạn:</b> ${esc(b.han)}.` : ""}${b.trang_thai ? ` Trạng thái đơn: ${esc(b.trang_thai)}.` : ""}</p></div>
            <div class="sl-hang-nut" style="grid-row:auto;grid-column:auto"><button class="sl-nut sl-vien" type="button" id="th-lai">Chạy lại</button><button class="sl-nut ${["nv", "qt"].includes(b.vai) ? "sl-vang" : "sl-mp"}" type="button" id="th-tiep">${["nv", "qt"].includes(b.vai) ? "Xác nhận đã làm" : `Mô phỏng: ${esc(VAI_TEN[b.vai] || b.vai)} xong`}</button></div></section>`}
        ${Object.keys(so).length ? the("Số tiền ở bước này", Object.entries(so).map(([k, v]) => dong(esc(SO_TEN[k] || k.replace(/_/g, " ")), typeof v === "number" ? d(v) : esc(String(v)))).join("")) : ""}
      </div>
      ${the("Các bước v23", `<ol class="sl-buoc">${th.buoc.map((x, i) => `<li class="${i < pi ? "sl-b-xong" : i === pi ? "sl-b-nay" : "sl-b-cho"}"><span class="sl-b-vong">${i + 1}</span><div><small>${esc(VAI_TEN[x.vai] || x.vai)}</small><b>${esc(x.viec)}</b></div></li>`).join("")}</ol>`, `<span class="sl-ghi">${Math.min(pi, th.buoc.length)}/${th.buoc.length}</span>`)}
    </div>`;
  goc.querySelector("#th-chon").onchange = (e) => { history.replaceState(null, "", `?man=tinh-huong-vh&th=${e.target.value}`); ghiTH({ id: e.target.value, pi: 0 }); veTH(goc, ds, e.target.value); };
  goc.querySelector("#th-lai").onclick = () => { ghiTH({ id: th.id, pi: 0 }); veTH(goc, ds, th.id); };
  const n = goc.querySelector("#th-tiep"); if (n) n.onclick = () => { ghiTH({ id: th.id, pi: pi + 1 }); veTH(goc, ds, th.id); };
}

const MENU = [
  { muc: [{ ma: "tong-quan-vh", ten: "Tổng quan", icon: "nha" }] },
  { nhom: "Hàng chờ", muc: [{ ma: "duyet-xac-minh", ten: "Xác minh", icon: "khien", dem: (s) => 4 - Object.keys(s.duyet).length }, { ma: "kiem-duyet-tin", ten: "Kiểm duyệt tin", icon: "co", dem: () => 4 }, { ma: "canh-bao-lach", ten: "Lách liên lạc", icon: "canh", dem: () => 2 }, { ma: "tranh-chap", ten: "Tranh chấp", icon: "can", dem: (s) => s.tc.quyet ? 2 : 3 }, { ma: "yeu-cau-ho-tro", ten: "Hỗ trợ", icon: "tin", dem: () => 7 }] },
  { nhom: "Tiền và tài khoản", muc: [{ ma: "tien-dam-bao", ten: "Tiền đảm bảo", icon: "tien" }, { ma: "nguoi-dung", ten: "Người dùng", icon: "nguoi" }] },
  { nhom: "Quản trị", muc: [{ ma: "cau-hinh-phi", ten: "Cấu hình phí", icon: "cai" }, { ma: "tinh-huong-vh", ten: "Chạy tình huống", icon: "can" }] },
];
const TAB = [
  { ma: "tong-quan-vh", ten: "Tổng quan", icon: "nha" },
  { ma: "duyet-xac-minh", ten: "Xác minh", icon: "khien", gom: ["chi-tiet-xac-minh"] },
  { ma: "tranh-chap", ten: "Tranh chấp", icon: "can", gom: ["chi-tiet-tranh-chap"] },
  { ma: "tien-dam-bao", ten: "Tiền", icon: "tien" },
  { ma: "yeu-cau-ho-tro", ten: "Hỗ trợ", icon: "tin", gom: ["kiem-duyet-tin", "canh-bao-lach", "nguoi-dung", "cau-hinh-phi"] },
];
chayApp({ ten: "AgiViet Vận hành", phu: "Nhân viên và quản trị", menu: MENU, tab: TAB, man, kho, macDinh: "tong-quan-vh", nguoi: { viet: "LH", ten: "Lan", vai: "Vận hành · tiền, đối soát" } });
