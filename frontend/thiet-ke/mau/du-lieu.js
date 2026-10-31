// Dữ liệu mô phỏng app bán — phía chị Năm (Nguyễn Thị Năm), khớp từng số với app mua (HĐ-0018, prompt app mua V2).
export const TIEN = { COC: 13800000, PHI: 138000, TRA_THANG: 32200000, GIA_TRI: 46000000, NGHIEM_THU: 44350000, COC_CHO_BAC: 12150000, HOAN_BEN_MUA: 1650000 };

// 15 bước HĐ-0018 nhìn từ phía người bán. ai: bac | mua | nh (ngân hàng)
export const BUOC = [
  { ai: "bac", lam: "Đồng ý giá 23.000 đ/kg", nut: "Đồng ý giá", chang: 0 },
  { ai: "mua", lam: "Bên mua soạn và ký thỏa thuận", mp: "Mô phỏng: bên mua ký", chang: 1 },
  { ai: "bac", lam: "Bác xem lại và ký", nut: "Xem và ký", di: "ky", chang: 1 },
  { ai: "mua", lam: "Bên mua chuyển cọc 13.938.000 đ", mp: "Mô phỏng: bên mua chuyển cọc", han: "48 giờ sau khi bác ký", chang: 2 },
  { ai: "nh", lam: "Ngân hàng xác nhận đã giữ cọc", mp: "Mô phỏng: ngân hàng xác nhận", chang: 2 },
  { ai: "mua", lam: "Bên mua chuyển thẳng 32.200.000 đ cho bác", mp: "Mô phỏng: bên mua chuyển tiền", han: "trước 5:30 ngày 28/10", chang: 3 },
  { ai: "bac", lam: "Bác kiểm tài khoản, xác nhận đúng số", nut: "Kiểm tiền", di: "kiem-tien", chang: 3 },
  { ai: "bac", lam: "Xe tới vườn: nhập mã nhận hàng, bốc, niêm phong mẫu", nut: "Bàn giao hàng", di: "ban-giao", chang: 3 },
  { ai: "mua", lam: "Bên mua xem video lúc bốc, bấm Đạt khi bốc", mp: "Mô phỏng: bên mua Đạt khi bốc", chang: 3 },
  { ai: "mua", lam: "Kho bên mua ký nhận hàng", mp: "Mô phỏng: kho ký nhận", chang: 3 },
  { ai: "mua", lam: "Bên mua gửi kết quả cân", mp: "Mô phỏng: bên mua gửi kết quả cân", han: "2 giờ từ lúc ký nhận", chang: 3 },
  { ai: "bac", lam: "Bác đồng ý kết quả cân", nut: "Xem kết quả cân", di: "ket-qua", han: "24 giờ", chang: 4 },
  { ai: "nh", lam: "Ngân hàng chuyển cọc cho bác", mp: "Mô phỏng: ngân hàng chuyển 12.150.000 đ", chang: 4 },
  { ai: "bac", lam: "Bác xác nhận tiền đã về", nut: "Tiền đã về", di: "tien-ve", chang: 4 },
  { ai: "bac", lam: "Hoàn tất · đánh giá bên mua", nut: "Đánh giá bên mua", di: "danh-gia", chang: 4 },
];
export const CHANG = ["Chào giá", "Ký", "Cọc", "Giao", "Nhận tiền"];

export const DAU = {
  phien: "ban-mau-v2",
  chuaDoc: 2,
  ho: { ten: "Nguyễn Thị Năm", goi: "Chị Năm", vai: "nong-ho", noi: "Mỹ Xương, Cao Lãnh, Đồng Tháp", sdt: "0918 234 421", nganHang: "Agribank", stk: "•••• 2186", xacMinh: true, uyTin: 4.8, soDon: 31 },
  vuon: [{ ma: "V-01", ten: "Vườn xoài ấp 3", dt: "1,2 ha", cay: "Xoài cát Chu", soCay: 320, maVung: "VN-DT-0412", camLy: "2026-10-22" }],
  lo: [
    { ma: "L-0412", ten: "Xoài cát Chu", loai: "Loại 1", con: 3500, khai: 4000, gia: 23000, san: 21500, trang: "dang-ban", hai: "27/10", chao: 3, anh: "xoai" },
    { ma: "L-0413", ten: "Xoài cát Chu", loai: "Loại 2", con: 800, khai: 800, gia: 15000, san: 13000, trang: "dang-ban", hai: "27/10", chao: 1, anh: "xoai" },
    { ma: "L-0414", ten: "Xoài cát Chu", loai: "Loại 1", con: 2000, khai: 2000, gia: 24000, san: 22000, trang: "sap-co", hai: "12/11", chao: 0, anh: "xoai" },
  ],
  canMua: [
    { ma: "PN-0042", ben: "Nhà máy sấy Đồng Xanh", hang: "Xoài cát Chu loại 1", luong: 2000, khi: "27–29/10", noi: "Kho Sa Đéc · bên mua lo xe", uy: 4.7, xm: true },
    { ma: "PN-0051", ben: "Nhà hàng Bếp Sen", hang: "Xoài cát Chu loại 1–2", luong: 50, khi: "mỗi tuần", noi: "Giao qua HTX Mỹ Xương", uy: 4.5, xm: true },
    { ma: "PN-0047", ben: "Vựa Ba Cường", hang: "Xoài loại 2", luong: 1000, khi: "30/10", noi: "Tại vườn", uy: 4.1, xm: false },
  ],
  // Hội thoại trực tiếp hai bên. kind: tin | gia (thẻ trả giá) | he (hệ thống) | anh
  hoiThoai: [
    { ma: "T1", ben: "Nhà máy sấy Đồng Xanh", nguoi: "Chị Thu Hà", lo: "L-0412", xm: true, chuaDoc: 1, moLienLac: false, tin: [
      { k: "he", t: "Hai bên nhắn qua AgiViet. Số điện thoại che tới khi ngân hàng giữ cọc.", luc: "26/10 08:00" },
      { k: "tin", ai: "ho", t: "Chào chị Năm, em bên Đồng Xanh. Xoài lô L-0412 còn đủ 2 tấn loại 1 không chị?", luc: "26/10 08:02" },
      { k: "tin", ai: "toi", t: "Dạ còn 3,5 tấn em. Trái 350–550 g, hái 27/10.", luc: "26/10 08:10" },
      { k: "anh", ai: "toi", anh: "/assets/products/xoai-cat-chu.jpg", luc: "26/10 08:11" },
      { k: "gia", ai: "ho", gia: 22500, luong: 2000, ghi: "Giao tại vườn, bên mua lo xe", luc: "26/10 08:20", trang: "da-tra" },
      { k: "gia", ai: "toi", gia: 23500, luong: 2000, ghi: "Bác trả lại", luc: "26/10 08:31", trang: "da-tra" },
      { k: "gia", ai: "ho", gia: 23000, luong: 2000, ghi: "Lượt trả giá cuối của bên mua", luc: "26/10 09:05", trang: "cho-bac" },
      { k: "tin", ai: "ho", t: "Chị đồng ý 23 ngàn thì em soạn thỏa thuận luôn nha.", luc: "26/10 09:06" },
    ] },
    { ma: "T2", ben: "Vựa Ba Cường", nguoi: "Anh Cường", lo: "L-0413", xm: false, chuaDoc: 1, moLienLac: false, tin: [
      { k: "tin", ai: "ho", t: "Chị ơi loại 2 bao nhiêu một ký?", luc: "Hôm qua 16:40" },
      { k: "tin", ai: "toi", t: "15 ngàn em, có 800 ký.", luc: "Hôm qua 16:52" },
      { k: "tin", ai: "ho", t: "Chị gọi em số ••• ••• ••• cho lẹ", luc: "Hôm qua 17:01", che: true },
      { k: "he", canh: true, t: "Tin vừa rồi có số điện thoại nên đã bị che. Trao đổi liên lạc trước khi có cọc là vi phạm (lần 1/3 của bên mua).", luc: "Hôm qua 17:01" },
    ] },
    { ma: "T3", ben: "Nhà hàng Bếp Sen", nguoi: "Anh Khoa", lo: "L-0412", xm: true, chuaDoc: 0, moLienLac: true, tin: [
      { k: "he", t: "Hợp đồng khung HĐ-0011 có hiệu lực, ngân hàng đã giữ cọc. Liên lạc đã mở.", luc: "20/10" },
      { k: "tin", ai: "ho", t: "Thứ 5 này chị giao 50 ký như tuần trước nha.", luc: "Thứ Hai 07:30" },
      { k: "tin", ai: "toi", t: "Dạ được em.", luc: "Thứ Hai 07:41" },
    ] },
  ],
  hd: { buoc: 0 },
  hopDongKhac: [
    { ma: "HĐ-0011", ben: "Nhà hàng Bếp Sen", hang: "Xoài · 50 kg/tuần", chang: 3, viec: "Giao thứ Năm 30/10", luot: "bac" },
    { ma: "HĐ-0009", ben: "HTX Tân Thuận", hang: "Xoài loại 1 · 1.200 kg", chang: 4, viec: "Hoàn tất", luot: "xong" },
  ],
  nhatKy: [
    { ngay: "02/11", viec: "Phun thuốc", chi: "Abamectin, cách ly 7 ngày → hết 09/11", anh: 2, nguon: "noi", kiem: false },
    { ngay: "29/10", viec: "Thu hoạch", chi: "Hái đợt đầu 350 kg, ghi cân", anh: 3, nguon: "chup", kiem: true },
    { ngay: "20/10", viec: "Nhân viên AgiViet tới vườn", chi: "Kiểm cây, chụp vườn, xác nhận nhật ký", anh: 6, nguon: "vh", kiem: true },
    { ngay: "12/10", viec: "Phun thuốc", chi: "Phun trừ rầy, cách ly 10 ngày → hết 22/10", anh: 1, nguon: "chup", kiem: false },
    { ngay: "05/10", viec: "Bón phân", chi: "Bón kali 2 bao", anh: 0, nguon: "go", kiem: false },
  ],
  nhatKyCu: [
    { thang: "Tháng 9/2026", so: 14, anh: 9, kiem: 2, tom: "Bao trái 3.200 trái · bón phân 3 lần · phun thuốc 2 lần" },
    { thang: "Tháng 8/2026", so: 11, anh: 5, kiem: 1, tom: "Ra hoa đợt 2 · tưới 6 lần · phun thuốc 1 lần" },
  ],
  thuChi: [
    { ngay: "28/10", noi: "Tiền xoài HĐ-0009", so: 27600000, vao: true },
    { ngay: "12/10", noi: "Thuốc trừ rầy", so: 420000, vao: false },
    { ngay: "05/10", noi: "Phân kali 2 bao", so: 780000, vao: false },
  ],
  lichSuTien: [
    { thang: "Tháng 10/2026", dong: [["28/10", "HĐ-0009 · ngân hàng chuyển cọc về", 7200000, "ve"], ["24/10", "HĐ-0009 · bên mua chuyển thẳng", 20400000, "ve"], ["18/10", "HĐ-0011 · tuần 3", 1160000, "ve"]] },
    { thang: "Tháng 9/2026", dong: [["30/09", "HĐ-0006 · tiền xoài", 18900000, "ve"]] },
  ],
};
