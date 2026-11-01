// Kịch bản trình diễn cho testquytrinhapp.html: mỗi tình huống của mô hình quy trình v23 (quy-trinh.json)
// được đi lại trên HAI APP thật (app bán mẫu + app mua) bằng dữ liệu mô phỏng chung HĐ-0018 (giao-dich-chung.js).
// Mỗi bước: qt = chỉ số các bước v23 (0-based) mà bước này thể hiện · ai = vai làm · ben = điện thoại có nút bấm
// · ban/mua = màn mở trên từng điện thoại · nut = [{ sel, chu }] nút cần bấm (lọc theo chữ nếu có) · lech = chỗ bản mô phỏng khác v23.
const B = { don: "./mau/ban.html#man=chi-tiet-don", ky: "./mau/ban.html#man=ky-otp", kt: "./mau/ban.html#man=kiem-tien", bg: "./mau/ban.html#man=ban-giao", kq: "./mau/ban.html#man=ket-qua", chat: "./ban-tin-nhan.html?thu=0918000421#tro=T1" };
const M = { don: "./mua.html?man=chi-tiet-don", chat: "./mua.html?man=tin-nhan" };
const VIEC_MUA = ".sl-viec [data-lam]";
const mua = (chu, qt, them = {}) => ({ qt, ai: "mua", ben: "mua", ban: B.don, mua: M.don, nut: [{ sel: VIEC_MUA, chu }], ...them });
const nh = (chu, qt, them = {}) => ({ qt, ai: "nh", ben: "mua", ban: B.don, mua: M.don, nut: [{ sel: VIEC_MUA, chu }], ghi: "Ngân hàng không có app: bấm nút Mô phỏng (ở app mua) thay ngân hàng.", ...them });
const banKb = (kb, chu, qt, them = {}) => ({ qt, ai: "ban", ben: "ban", ban: B.don, mua: M.don, nut: [{ sel: `[data-kb="${kb}"]`, chu }], ...them });
const banMan = (trang, sel, chu, qt, them = {}) => ({ qt, ai: "ban", ben: "ban", ban: trang, mua: M.don, nut: [{ sel, chu }], ...them });
const xem = (qt, ghi, them = {}) => ({ qt, ai: "app", ben: null, ban: B.don, mua: M.don, nut: [], ghi, ...them });

export const KICH_BAN = [
  { id: "chinh", kb: "tra-sau", dau: { buoc: 0 }, xoaChat: true, tom: "Luồng thuận HĐ-0018 (xoài 2 tấn, lấy tại vườn), trả sau nghiệm thu như v23.",
    lechChung: "v23 dùng đơn thanh long 5 tấn chở về kho Long An, có thẩm định lô, phiếu nghĩa vụ, xe lạnh đối tác; bản mô phỏng là đơn xoài 2 tấn lấy tại vườn nên gộp nhiều bước.",
    buoc: [
      { qt: [10, 11], ai: "ban", ben: "ban", ban: B.chat, mua: M.chat, nut: [{ sel: '[data-gia="dong-y"]', chu: "" }, { sel: "#chot", chu: "" }], ghi: "Trong Trò chuyện, chị Năm đồng ý giá rồi bấm chốt." },
      mua("Ký và gửi", [12, 13, 16, 21], { lech: "v23 có phiếu nghĩa vụ hai bên điền và vòng đề nghị sửa (bản 2); mô phỏng gộp thành một nút ký." }),
      banMan(B.ky, "#ky", "", [20]),
      mua("Chuyển cọc", [25]),
      nh("Mô phỏng: ngân hàng xác nhận", [26, 27]),
      banMan(B.bg, "#bg", "", [33, 34]),
      mua("Đạt khi bốc", [35]),
      mua("Ký nhận", [37]),
      mua("Gửi kết quả", [37, 38]),
      banMan(B.kq, "#dy", "", [39]),
      mua("Ghi đã trả 30.550.000", [41], { ghi: "Trả sau nghiệm thu: phần còn lại = nghiệm thu 44.350.000 − cọc 13.800.000." }),
      banKb("xn-sau", "Đã nhận", [42]),
      nh("Mô phỏng: ngân hàng chi cọc", [43, 44], { ghi: "Ngân hàng chuyển hết cọc 13.800.000 cho chị Năm; không có tiền hoàn bên mua." }),
      mua("Nhập kho", [47], { lech: "Hồ sơ 50 kg trả lại (bước 47–48 v23) chưa có màn riêng." }),
      xem([47], "Hoàn tất: hai bên cùng thấy đơn xong."),
    ] },
  { id: "mua-huy", kb: "huy", dau: { buoc: 3 }, tom: "Bên mua xin hủy sau khi đã chuyển cọc.",
    buoc: [
      mua("Chuyển cọc", [2]),
      nh("Mô phỏng: ngân hàng xác nhận", [3]),
      mua("Xin hủy", [4]),
      banKb("huy-ok", "Đồng ý hủy", [5, 6]),
      xem([7, 8, 9], "Đơn đã hủy. Xem tiền ở hai bên.", { lech: "v23: ngân hàng chia cọc 50% người bán / 50% hoàn bên mua. Mô phỏng: chuyển TOÀN BỘ cọc 13.800.000 cho người bán." }),
    ] },
  { id: "de-nghi", kb: "doi-ngay", dau: { buoc: 2 }, tom: "Đổi ngày giao trước khi ký.",
    buoc: [
      banKb("de-nghi", "Đề nghị đổi sang 29/10", [0, 1], { lech: "v23: BÊN MUA đề nghị dời ngày, người bán đồng ý. Mô phỏng đảo vai: người bán đề nghị, bên mua đồng ý." }),
      mua("Đồng ý", [2, 3], { nut: [{ sel: '.sl-viec [data-lam="de-ok"]', chu: "" }] }),
      banMan(B.ky, "#ky", "", [4], { ghi: "Ký lại bản 2 (giao 29/10)." }),
    ] },
  { id: "tra-mot-phan", kb: "thieu", dau: { buoc: 5 }, tom: "Bên mua trả làm hai lần.",
    buoc: [
      mua("Ghi đã trả 20.000.000", [0], { lech: "Số v23: 30.000.000 + 20.850.000; mô phỏng: 20.000.000 + 12.200.000." }),
      banMan(B.kt, "#xn", "", [1]),
      mua("Ghi đã trả 12.200.000", [2]),
      banKb("nhan-them", "Đã nhận thêm", [4]),
      xem([5], "Đủ tiền: được bốc.", { lech: "Nhánh chuyển trùng (bước 4, 5, 8 v23: bấm nhầm chuyển 2 lần, người bán trả lại) chưa có trong mô phỏng." }),
    ] },
  { id: "tranh-chap-mot-dong", kb: "phan-doi", dau: { buoc: 11, daTra: 32200000, nbXn: 32200000 }, tom: "Chỉ một dòng hàng bị tranh chấp.",
    lechChung: "v23 tách phần công nhận để trả và chuyển cọc NGAY, chỉ treo 900.000 tranh chấp; mô phỏng chờ kiểm định xong mới chi.",
    buoc: [
      banKb("phan-doi", "Phản đối dòng hạ cấp", [1, 2]),
      mua("Cân lại", [], { lech: "v23 không có bước cân lại; đi thẳng kiểm định." }),
      banKb("kd", "kiểm định", [8]),
      nh("104/120 kg", [8, 9], { ai: "dt", ghi: "Phòng kiểm định không có app: bấm nút Mô phỏng ở app mua.", lech: "v23 kết luận giữ giá, người bán chịu phí kiểm định; mô phỏng ra 104/120 kg dưới chuẩn." }),
      nh("Mô phỏng: ngân hàng", [6, 7]),
      xem([9], "Xong: tiền chia theo kết quả kiểm định."),
    ] },
  { id: "can-khong-dung", kb: "can-lech", dau: { buoc: 10, daTra: 32200000, nbXn: 32200000 }, tom: "Cân tại kho khác cân lúc bốc.",
    buoc: [
      mua("Gửi kết quả", [1], { lech: "v23: 5.000 vs 4.850 kg (3%) → ghi hai kết quả, đối chiếu, cân lại có người bán. Mô phỏng chỉ có nhánh 1.960/2.000 kg trong ±5% chạy như thường." }),
      banMan(B.kq, "#dy", "", [5, 6]),
      nh("Mô phỏng: ngân hàng chi cọc", [6]),
    ] },
  { id: "ban-vi-pham", kb: "khong-giao", dau: { buoc: 7, daTra: 32200000, nbXn: 32200000 }, tom: "Xe tới vườn nhưng người bán không giao hàng.",
    lechChung: "v23 chưa có khoản trả trước khi bốc; mô phỏng bên mua đã trả thẳng 32,2 tr nên người bán phải trả lại thêm phần đó.",
    buoc: [
      nh("xe chờ 2 giờ", [4], { ai: "dt", ghi: "Xe (đối tác dịch vụ) không có app: bấm nút Mô phỏng ở app mua." }),
      banKb("khong-giao", "Tôi không giao được", [5, 6], { lech: "v23: nhân viên AgiViet gọi người bán rồi hệ thống ghi vi phạm; mô phỏng cho người bán tự bấm xác nhận." }),
      nh("Mô phỏng: ngân hàng hoàn cọc", [7, 8]),
      banKb("nb-tra-vp", "Tôi đã chuyển", [9], { lech: "Nhánh người bán KHÔNG trả bồi hoàn (bước 11 v23: trừ hạng, khóa đơn mới) chưa có nút riêng." }),
      mua("Đã nhận lại 33.400.000", [9]),
      xem([10], "Đơn đóng: bên mua nhận lại đủ, người bán bị trừ hạng."),
    ] },
  { id: "nghiem-thu-im-lang", kb: "im-lang", dau: { buoc: 9, daTra: 32200000, nbXn: 32200000 }, tom: "Bên mua xin gia hạn kiểm; người bán im lặng không chốt.",
    buoc: [
      mua("Ký nhận", [0]),
      mua("xin gia hạn", [0, 1], { ghi: "Kho thiếu QC lúc 20:00: xin gia hạn một lần tới 8:00 sáng (theo điều khoản)." }),
      mua("Gửi kết quả", [2]),
      nh("hết 24 giờ", [3], { ai: "app", ghi: "Hệ thống đếm giờ: bấm Mô phỏng ở app mua để tua tới hết 24 giờ. Im lặng KHÔNG thành đồng ý: bên mua không có nút tự đi tiếp." }),
      nh("nhân viên đã gọi", [4], { ai: "nv", ghi: "Nhân viên AgiViet chưa có app trong bản thử: bấm Mô phỏng ở app mua." }),
      banMan(B.kq, "#dy", "", [5]),
      nh("Mô phỏng: ngân hàng chi cọc", [5]),
    ] },
  { id: "chua-tra", kb: "chua-tra", dau: { buoc: 7 }, tom: "Đã dỡ hàng nhưng bên mua không trả phần còn lại.",
    buoc: [
      banMan(B.bg, "#bg", "", [4]),
      mua("Đạt khi bốc", [4]),
      mua("Ký nhận", [5]),
      mua("Gửi kết quả", [5]),
      banMan(B.kq, "#dy", "", [6]),
      banKb("qua-han-sau", "Quá hạn", [7], { ghi: "Bên mua không chuyển 30.550.000 trong 24 giờ: chị Năm báo chưa nhận." }),
      nh("hết 48 giờ", [8, 9], { ai: "app", ghi: "Hệ thống đếm 48 giờ, nhân viên gọi hai bên: bấm Mô phỏng ở app mua." }),
      nh("ngân hàng chuyển cọc", [10]),
      xem([11], "Đơn đóng có nợ: chị Năm nhận cọc, bên mua còn nợ 30.550.000, bị trừ uy tín và khóa đơn mới."),
    ] },
  { id: "da-nhan-nhieu-hon", kb: "tra-lai", dau: { buoc: 10, daTra: 32200000, nbXn: 32200000 }, tom: "Người bán đã nhận trước nhiều hơn giá trị nghiệm thu.",
    buoc: [
      mua("Gửi kết quả", [2]),
      banMan(B.kq, "#dy", "", [3]),
      nh("Mô phỏng: ngân hàng", [4]),
      mua("Đã nhận lại 13.800.000", [4]),
      banKb("nb-hoan", "Tôi đã hoàn", [5]),
      mua("Đã nhận lại 3.100.000", [6]),
      xem([6], "Xong: bên mua chi ròng đúng giá trị nghiệm thu."),
    ] },
];
