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
  { id: "chinh", kb: "thuan", dau: { buoc: 0 }, xoaChat: true, tom: "Luồng thuận 15 bước của HĐ-0018 (xoài 2 tấn, lấy tại vườn).",
    lechChung: "v23 dùng đơn thanh long 5 tấn chở về kho Long An, có thẩm định lô, phiếu nghĩa vụ, xe lạnh đối tác; bản mô phỏng là đơn xoài 2 tấn lấy tại vườn nên gộp nhiều bước.",
    buoc: [
      { qt: [10, 11], ai: "ban", ben: "ban", ban: B.chat, mua: M.chat, nut: [{ sel: '[data-gia="dong-y"]', chu: "" }, { sel: "#chot", chu: "" }], ghi: "Trong Trò chuyện, chị Năm đồng ý giá rồi bấm chốt." },
      mua("Ký và gửi", [12, 13, 16, 21], { lech: "v23 có phiếu nghĩa vụ hai bên điền và vòng đề nghị sửa (bản 2); mô phỏng gộp thành một nút ký." }),
      banMan(B.ky, "#ky", "", [20]),
      mua("Chuyển cọc", [25]),
      nh("Mô phỏng: ngân hàng xác nhận", [26, 27]),
      mua("Ghi đã trả", [41], { lech: "v23 chọn CK sau nghiệm thu 24 giờ; mô phỏng trả thẳng TRƯỚC khi bốc." }),
      banMan(B.kt, "#xn", "", [42]),
      banMan(B.bg, "#bg", "", [33, 34]),
      mua("Đạt khi bốc", [35]),
      mua("Ký nhận", [37]),
      mua("Gửi kết quả", [37, 38]),
      banMan(B.kq, "#dy", "", [39]),
      nh("Mô phỏng: ngân hàng chi cọc", [43, 44]),
      mua("Đã nhận lại 1.650.000", [44]),
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
