// AgiViet · App Thu mua: cấu hình cho khung vẽ màn dùng chung (js/khung.js) và vỏ app (js/app.js).
window.KHUNG_CAU_HINH = {
  app: 'mua',
  /** Màn nào nằm ở trang nào. Sửa bảng này rồi chạy npm run trang-mua để sinh lại trang HTML. */
  trang: {
    'vao-app.html': ['dang-nhap', 'otp', 'thong-tin-to-chuc', 'chon-goi'],
    'tong-quan.html': ['tong-quan'],
    'nguon-hang.html': ['nguon-hang', 'goi-y', 'chi-tiet-lo', 'ho-so-ban'],
    'nhu-cau.html': ['nhu-cau', 'tao-nhu-cau', 'chi-tiet-nhu-cau'],
    'bao-gia.html': ['bao-gia', 'so-bao-gia', 'gui-bao-gia'],
    'tin-nhan.html': ['tin-nhan', 'hen-xem-vuon'],
    'don-hang.html': ['don-hang', 'chi-tiet-don', 'thoa-thuan', 'dat-coc', 'mo-lien-lac', 'nghiem-thu', 'doc-phieu-can', 'doi-soat', 'lich-nhan', 'huy-don'],
    'tien.html': ['vi-dam-bao', 'cong-no', 'ghi-thanh-toan'],
    'kho.html': ['ton-kho', 'nhap-kho', 'truy-xuat'],
    'nha-cung-cap.html': ['moi-quen', 'cham-diem', 'ghi-don-ngoai', 'nhap-excel'],
    'ke-hoach.html': ['ke-hoach'],
    'bao-cao.html': ['bang-ke', 'bao-cao'],
    'dich-vu.html': ['dich-vu', 'yeu-cau-dich-vu'],
    'to-chuc.html': ['ho-so-to-chuc', 'thanh-vien', 'goi-cua-toi', 'so-sanh-goi', 'nang-cap', 'nang-cap-xong', 'uy-tin'],
    'cong-cu.html': ['phong-thu', 'gia-lap'],
  },
  /** Màn gốc của từng mục (không có nút Quay lại). */
  goc: ['tong-quan', 'nguon-hang', 'nhu-cau', 'bao-gia', 'tin-nhan', 'don-hang', 'vi-dam-bao', 'cong-no', 'ton-kho', 'moi-quen', 'ke-hoach', 'bang-ke', 'dich-vu', 'ho-so-to-chuc', 'goi-cua-toi'],
  /** Thanh bên: [nhóm, [[mục, đường dẫn, icon, nhãn]]]. Mục trùng tên với khóa trong soViec() thì hiện số việc. */
  menu: [
    ['', [['tong-quan', 'tong-quan.html#tong-quan', 'home', 'Tổng quan']]],
    ['Mua hàng', [['nguon', 'nguon-hang.html#nguon-hang', 'search', 'Nguồn hàng'], ['nhu-cau', 'nhu-cau.html#nhu-cau', 'demand', 'Tin cần mua'], ['bao-gia', 'bao-gia.html#bao-gia', 'quote', 'Báo giá'], ['tin-nhan', 'tin-nhan.html#tin-nhan', 'chat', 'Tin nhắn']]],
    ['Giao dịch', [['don', 'don-hang.html#don-hang', 'order', 'Đơn hàng'], ['lich', 'don-hang.html#lich-nhan', 'calendar', 'Lịch nhận'], ['tien', 'tien.html#vi-dam-bao', 'wallet', 'Tiền, công nợ']]],
    ['Quản lý', [['kho', 'kho.html#ton-kho', 'warehouse', 'Kho'], ['ncc', 'nha-cung-cap.html#moi-quen', 'people', 'Nhà cung cấp'], ['ke-hoach', 'ke-hoach.html#ke-hoach', 'season', 'Kế hoạch mua'], ['bao-cao', 'bao-cao.html#bang-ke', 'report', 'Thuế, báo cáo']]],
    ['Tổ chức', [['dich-vu', 'dich-vu.html#dich-vu', 'delivery', 'Kiểm định, xe, kho'], ['to-chuc', 'to-chuc.html#ho-so-to-chuc', 'identity', 'Tổ chức'], ['goi', 'to-chuc.html#goi-cua-toi', 'payment', 'Gói, thanh toán']]],
  ],
  /** Điều hướng dưới trên điện thoại (mục cuối "Thêm" mở thanh bên). */
  menuDuoi: [['tong-quan', 'tong-quan.html#tong-quan', 'home', 'Tổng quan'], ['nguon', 'nguon-hang.html#nguon-hang', 'search', 'Nguồn hàng'], ['don', 'don-hang.html#don-hang', 'order', 'Đơn hàng'], ['tien', 'tien.html#vi-dam-bao', 'wallet', 'Tiền']],
  khongCanDangNhap: ['vao-app.html', 'cong-cu.html', 'index.html', 'dang-nhap.html'],
  trangVao: 'vao-app.html#dang-nhap',
  trangChu: 'tong-quan.html',
  nghe: false,
  /** Số việc trên thanh bên, điều hướng dưới. */
  soViec(c, A) {
    const v = A.mc.viecCanLam(c.so, c.n, c.bg);
    const don = v.don.length + v.deNghi.length;
    return { 'tong-quan': don + v.loiMoi.length + v.baoGia.length + v.hen.length, don, 'nhu-cau': v.loiMoi.length, 'bao-gia': v.baoGia.length, 'tin-nhan': v.hen.length };
  },
};
