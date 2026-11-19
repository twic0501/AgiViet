export {};
const I = {
  vuon: "M12 21V11M12 11c-4 0-7-3-7-7 4 0 7 3 7 7zM12 11c4 0 7-3 7-7-4 0-7 3-7 7zM5 21h14",
  hop: "M3 8l9-5 9 5-9 5zM3 8v8l9 5 9-5V8M12 13v8",
  gom: "M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2-5 5-5s5 2 5 5M12 20c0-3 2-5 5-5s5 2 5 5",
  tich: "M5 12l5 5 9-10",
  khien: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  tien: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  may: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  dien: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z",
  nguoi: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  dong_ho: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
};
const ic = (k: string) => `<svg class="bd-i" viewBox="0 0 24 24" aria-hidden="true"><path d="${I[k]}"/></svg>`;
const THU_TU = ["vai-tro", "mat-hang", "ho-so", "khai-bao-vuon", "xac-minh"];
const q = new URLSearchParams(location.search);
const buoc = q.get("buoc") || "chao-mung";
const di = (b: string) => { q.set("buoc", b); return "?" + q.toString(); };
const sau = THU_TU[THU_TU.indexOf(buoc) + 1];
const truoc = THU_TU[THU_TU.indexOf(buoc) - 1];

const dau = (tieu: string, chao?: string) => {
  const i = THU_TU.indexOf(buoc);
  return `<header class="dau dau-xanh nen-xanh"><a class="nut-tron" href="${truoc ? di(truoc) : "./dang-nhap.html"}" aria-label="Quay lại"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>
    <div style="flex:1;min-width:0"><p class="chao">${chao || (i >= 0 ? `Bước ${i + 1} trên 5` : "AgiViet")}</p><h1>${tieu}</h1>${i >= 0 ? `<div class="bd-tien" aria-hidden="true">${THU_TU.map((_, k) => `<i class="${k <= i ? "bd-qua" : ""}"></i>`).join("")}</div>` : ""}</div></header>`;
};
const day = (chu: string, toi: string, lui?: string) => `<div class="bd-day"><a class="nut bd-vang" href="${toi}" style="text-decoration:none">${chu}</a>${lui || ""}</div>`;
const chon = (ten, ds, mac) => `<div class="bd-chon" role="radiogroup">${ds.map(([v, t, g, h], i) => `<label><input type="radio" name="${ten}" value="${v}" ${i === mac ? "checked" : ""}><span class="bd-o"><span class="bd-hinh">${ic(h)}</span><span><b>${t}</b><small>${g}</small></span><span class="bd-tick">${ic("tich")}</span></span></label>`).join("")}</div>`;

const MAN = {
  "chao-mung": () => `<main class="bd-chao-mung"><img src="/assets/logo.svg" alt=""><h1>Chào bác tới AgiViet</h1><p style="color:var(--muc-phu)">Bán hàng có hợp đồng, có người giữ tiền cọc. Bác nói hay bấm đều được.</p>
    <ul><li><span>${ic("khien")}</span><div><b>Tiền cọc ngân hàng giữ</b><div style="font-size:14px;color:var(--muc-nhat)">Người mua chuyển cọc trước, bác mới giao</div></div></li>
    <li><span>${ic("mic")}</span><div><b>Nói là đăng được hàng</b><div style="font-size:14px;color:var(--muc-nhat)">App hỏi từng câu, bác trả lời</div></div></li>
    <li><span>${ic("nguoi")}</span><div><b>Có người giúp khi vướng</b><div style="font-size:14px;color:var(--muc-nhat)">Gọi tổng đài hoặc nhờ con cháu</div></div></li></ul></main>
    ${day("Bắt đầu", di("vai-tro"), `<a class="nut bd-lui" href="./dang-nhap.html" style="text-decoration:none">Tôi đã có tài khoản</a>`)}`,
  "vai-tro": () => `${dau("Bác bán thế nào?")}<main class="noi"><p class="bd-hoi">Bác bán hàng của nhà mình, hay gom của nhiều nhà?</p><p class="bd-giai">Chọn một. Đổi lại được trong phần Tôi.</p>
    ${chon("vai", [["nong-ho", "Hàng nhà tôi trồng, nuôi", "Nông hộ, chủ vườn, chủ ao", "vuon"], ["htx", "Hợp tác xã, tổ hợp tác", "Bán chung cho nhiều thành viên", "gom"], ["gom", "Tôi gom hàng của nhiều nhà", "Thương lái, vựa đầu mối", "hop"]], 0)}</main>
    ${day("Tiếp tục", di("mat-hang"))}`,
  "mat-hang": () => `${dau("Mặt hàng")}<main class="noi"><p class="bd-hoi">Nhà mình bán những gì?</p><p class="bd-giai">Chọn nhiều cũng được. Đăng bài sau sẽ điền sẵn.</p>
    <div class="bd-hang">${[["Xoài", 1], ["Sầu riêng", 0], ["Bưởi", 0], ["Thanh long", 0], ["Lúa gạo", 0], ["Cà phê", 0], ["Tôm", 0], ["Cá tra", 0], ["Rau củ", 0], ["Khác", 0]].map(([t, c]) => `<label><input type="checkbox" ${c ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
    <label class="bd-truong"><span>Giống, loại chính</span><input value="Xoài cát Chu"><small>Ví dụ: xoài cát Chu, sầu riêng Ri6, tôm thẻ.</small></label></main>
    ${day("Tiếp tục", di("ho-so"))}`,
  "ho-so": () => `${dau("Hồ sơ")}<main class="noi"><p class="bd-hoi">Người mua sẽ gọi bác bằng tên gì?</p>
    <label class="bd-truong"><span>Họ tên</span><input value="Nguyễn Thị Năm" autocomplete="name"></label>
    <label class="bd-truong"><span>Tên hay gọi</span><input value="Chị Năm"><small>Hiện cho người mua thấy. Số điện thoại thì che tới khi có cọc.</small></label>
    <label class="bd-truong"><span>Xã, huyện, tỉnh</span><input value="Mỹ Xương, Cao Lãnh, Đồng Tháp"></label>
    <label class="bd-truong"><span>Tài khoản nhận tiền</span><select><option>Agribank</option><option>Vietcombank</option><option>VietinBank</option><option>BIDV</option></select></label>
    <label class="bd-truong"><span>Số tài khoản</span><input value="5104 2058 2186" inputmode="numeric"><small>Phải đúng tên bác. Đổi tài khoản sau này phải chờ 24 giờ cho an toàn.</small></label></main>
    ${day("Tiếp tục", di("khai-bao-vuon"))}`,
  "khai-bao-vuon": () => `${dau("Khai báo vườn")}<main class="noi"><p class="bd-hoi">Vườn của bác ở đâu?</p><p class="bd-giai">Đứng trong vườn rồi bấm "Lấy vị trí". Người mua chỉ thấy tới cấp ấp.</p>
    <div class="bd-ban-do" role="img" aria-label="Bản đồ vườn"><i></i></div>
    <a class="nut phu-nut" href="#" data-dang-phat-trien="Lấy vị trí vườn" style="text-decoration:none">Lấy vị trí đang đứng</a>
    <div class="bd-the"><label class="bd-truong"><span>Tên vườn</span><input value="Vườn xoài ấp 3"></label>
    <label class="bd-truong"><span>Diện tích</span><input value="1,2 ha"></label>
    <label class="bd-truong"><span>Mã vùng trồng (nếu có)</span><input placeholder="VD: VN-DT-0412"><small>Không có cũng được. Bên xuất khẩu hay hỏi mã này.</small></label></div></main>
    ${day("Tiếp tục", di("xac-minh"))}`,
  "xac-minh": () => `${dau("Xác minh")}<main class="noi"><p class="bd-hoi">Còn 2 việc để bác bán được</p><p class="bd-giai">Xác minh để người mua tin, và để tiền về đúng tài khoản bác.</p>
    <div class="bd-the">
      <div class="bd-dong"><span class="bd-hinh bd-xong">${ic("tich")}</span><div><b>Số điện thoại</b><small>0918 234 421</small></div><span class="bd-nhan bd-xong">Xong</span></div>
      <div class="bd-dong"><span class="bd-hinh bd-dang">${ic("may")}</span><div><b>Chụp căn cước</b><small>Mặt trước và mặt sau, đủ sáng</small></div><a class="nut phu-nut" href="#" data-dang-phat-trien="Chụp căn cước" style="min-height:44px;padding:0 14px;text-decoration:none">Chụp</a></div>
      <div class="bd-dong"><span class="bd-hinh bd-chua">${ic("nguoi")}</span><div><b>Chụp mặt bác</b><small>Để so với ảnh căn cước</small></div><a class="nut phu-nut" href="#" data-dang-phat-trien="Chụp mặt xác minh" style="min-height:44px;padding:0 14px;text-decoration:none">Chụp</a></div>
    </div>
    <div class="bd-the" style="background:#f8ecc9;box-shadow:0 0 0 1px #e3c77a"><b>Sau khi gửi</b><p style="color:var(--muc-phu)">AgiViet duyệt trong 24 giờ. Trong lúc chờ, bác vẫn ghi nhật ký và đăng bài nháp được.</p></div></main>
    ${day("Gửi xác minh", "./ban-hom-nay.html?thu=0918000421", `<a class="nut bd-lui" href="./ban-hom-nay.html?thu=0918000421" style="text-decoration:none">Để sau, vào app trước</a>`)}`,
  "tro-giup": () => `${dau("Trợ giúp đăng nhập", "Không vào được app?")}<main class="noi"><p class="bd-hoi">Bác gặp chuyện gì?</p>
    ${chon("loi", [["ma", "Không nhận được mã", "Chờ 1 phút rồi bấm gửi lại, hoặc nhận qua cuộc gọi", "dong_ho"], ["so", "Đổi số điện thoại", "Cần chụp căn cước để giữ tài khoản cũ", "dien"], ["pin", "Quên mã PIN", "Nhận mã qua tin nhắn để đặt PIN mới", "khien"]], 0)}
    <div class="bd-goi"><a href="tel:19001234"><span>${ic("dien")}</span>Gọi tổng đài<small style="font-weight:400;color:var(--muc-nhat)">1900 1234 · 6:00–21:00</small></a><a href="#" data-dang-phat-trien="Nhờ người giúp đăng nhập"><span>${ic("nguoi")}</span>Nhờ người giúp<small style="font-weight:400;color:var(--muc-nhat)">Con cháu đăng nhập hộ</small></a></div></main>
    ${day("Nhận mã qua cuộc gọi", "./dang-nhap.html")}`,
};
document.getElementById("trang").innerHTML = (MAN[buoc] || MAN["chao-mung"])();
document.title = (document.querySelector("h1")?.textContent || "Bắt đầu") + " · AgiViet bán";
