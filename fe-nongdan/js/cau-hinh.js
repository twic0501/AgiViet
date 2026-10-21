// AgiViet · App Nhà sản xuất: cấu hình cho khung vẽ màn dùng chung (js/khung.js).
window.KHUNG_CAU_HINH = {
  app: 'ban',
  /** Màn nào nằm ở trang nào. Sửa bảng này rồi chạy npm run trang-ban để sinh lại trang HTML. */
  trang: {
    'bat-dau.html': ['chao-mung', 'dang-nhap', 'otp', 'vai-tro', 'mat-hang', 'ho-so', 'khai-bao-vuon', 'xac-minh', 'tro-giup-truy-cap'],
    'hom-nay.html': ['hom-nay', 'tong-ket-tuan', 'thong-bao'],
    'vuon.html': ['vuon', 'mua-vu', 'nhat-ky', 'thu-chi', 'ghi', 'xac-nhan-ghi', 'cach-ly', 'ho-so-vuon'],
    'hang.html': ['hang', 'chi-tiet-lo', 'cap-nhat-luong', 'sap-co-hang', 'chung-tu', 'lo-gop', 'ban-gap', 'tach-lo'],
    'dang.html': ['dang', 'chon-mat-hang', 'chup', 'nghe', 'kiem-tra', 'xem-lai', 'xong'],
    'khach.html': ['khach', 'nhu-cau', 'ket-noi', 'ho-so-ben-mua', 'chat', 'bao-gia', 'hen-xem', 'bao-cao'],
    'lich.html': ['lich', 'chi-tiet-don', 'xac-nhan-don', 'so-sanh', 'coc', 'mo-lien-lac', 'ket-qua', 'giao-mot-phan', 'doi-lich', 'yeu-cau-thay-doi', 'huy-don', 'tranh-chap', 'so-ban', 'hop-dong'],
    'giao-dich.html': ['phuong-thuc', 'chon-luong', 'ky', 'quyen', 'ban-day-du', 'ky-otp', 'ky-xong', 'ky-giay'],
    'tien.html': ['tien', 'tien-ve', 'quyet-toan', 'lich-su-tien', 'ung-tien'],
    'toi.html': ['toi', 'uy-tin', 'dich-vu', 'dat-dich-vu', 'cai-dat', 'ho-tro', 'can-ho-tro', 'trang-thai', 'nguoi-giup', 'tai-khoan-nhan', 'bao-mat', 'rieng-tu', 'phan-cua-toi'],
    'cong-cu.html': ['phong-thu', 'gia-lap'],
  },
  khongCanDangNhap: ['bat-dau.html', 'cong-cu.html', 'index.html', 'nhan-dien.html', 'nguon-anh.html'],
  trangVao: 'bat-dau.html#chao-mung',
  trangChu: 'hom-nay.html',
  lienKetToi: 'toi.html#toi',
  nghe: true,
  /** Số việc hiện trên thanh dưới. */
  soViec(c, A) {
    const v = A.mc.viecCanLam(c.so, c.n, c.bg);
    return { don: v.don.length + v.deNghi.length, ban: v.loiMoi.length + v.baoGia.length + v.hen.length + v.loSapAn.length };
  },
};
