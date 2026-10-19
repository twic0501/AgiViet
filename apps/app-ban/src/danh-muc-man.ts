// Danh mục màn của app Nhà sản xuất (80 màn đã chốt + 2 màn công cụ mô phỏng): nguồn cho điều hướng, bài thử, tài liệu.
// tinhTrangCu: so với bộ giao diện cũ (fe-nongdan): Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.
export interface Man {
  id: string;
  ten: string;
  /** Mục điều hướng chứa màn này. */
  trang: string;
  nhom: string;
  tinhTrangCu: "Có" | "Sửa" | "Mới";
  /** Các khu vực của màn, từ trên xuống (đặc tả bố cục). */
  khuVuc: string[];
}

export const DANH_MUC_MAN: readonly Man[] = [
  {
    id: "chao-mung",
    ten: "Chào mừng",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Logo",
      "Khẩu hiệu",
      "Nút Bắt đầu",
      "Tôi đã có tài khoản"
    ]
  },
  {
    id: "dang-nhap",
    ten: "Số điện thoại",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Ô số điện thoại",
      "Nút Gửi mã",
      "Trợ giúp"
    ]
  },
  {
    id: "otp",
    ten: "Nhập mã",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "6 ô mã",
      "Gửi lại",
      "Gọi đọc mã cho tôi"
    ]
  },
  {
    id: "vai-tro",
    ten: "Bạn bán thế nào?",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Chọn: hộ nhà vườn",
      "Nuôi trồng thủy sản",
      "Hợp tác xã",
      "Tổ hợp tác"
    ]
  },
  {
    id: "mat-hang",
    ten: "Mặt hàng",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Lưới ảnh mặt hàng",
      "Chọn nhiều"
    ]
  },
  {
    id: "ho-so",
    ten: "Hồ sơ",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Tên",
      "Xã/huyện",
      "Lấy vị trí đang đứng"
    ]
  },
  {
    id: "khai-bao-vuon",
    ten: "Khai báo vườn",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Từng vườn/ao: diện tích",
      "Loại cây/con",
      "Số gốc",
      "Năm trồng",
      "Vụ hiện tại. Bỏ qua được"
    ]
  },
  {
    id: "xac-minh",
    ten: "Xác minh",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Chụp căn cước",
      "Trạng thái chờ duyệt",
      "Để sau"
    ]
  },
  {
    id: "tro-giup-truy-cap",
    ten: "Trợ giúp đăng nhập",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    tinhTrangCu: "Có",
    khuVuc: [
      "Đổi số",
      "Mất máy",
      "Gọi tổng đài"
    ]
  },
  {
    id: "hom-nay",
    ten: "Hôm nay",
    trang: "hom-nay",
    nhom: "Hôm nay",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Thẻ \"Bước tiếp theo\" của từng đơn (tới lượt ai",
      "Còn bao lâu)",
      "Nhắc cách ly thuốc",
      "Thời tiết 3 ngày",
      "Số liệu tuần",
      "Lối tắt Ghi / Đăng"
    ]
  },
  {
    id: "tong-ket-tuan",
    ten: "Tổng kết tuần",
    trang: "hom-nay",
    nhom: "Hôm nay",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Đã bán",
      "Đã thu",
      "Đã chi",
      "Lời tạm tính",
      "So tuần trước"
    ]
  },
  {
    id: "thong-bao",
    ten: "Thông báo",
    trang: "hom-nay",
    nhom: "Hôm nay",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Danh sách thông báo chia theo 4 nhóm trạng thái (chuyển từ Tôi sang)"
    ]
  },
  {
    id: "vuon",
    ten: "Vườn của tôi",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Danh sách vườn/ao",
      "Vụ đang chạy",
      "Vòng hồ sơ vườn %",
      "Nút Ghi"
    ]
  },
  {
    id: "mua-vu",
    ten: "Mùa vụ",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Dòng thời gian một vụ (ra hoa → đậu trái → thu hoạch → bán)",
      "Sản lượng ước",
      "Ngày hái dự kiến",
      "Nút Đăng bán từ vụ này"
    ]
  },
  {
    id: "nhat-ky",
    ten: "Nhật ký canh tác",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Dòng theo ngày: phun thuốc",
      "Bón phân",
      "Tưới",
      "Thu hoạch",
      "Lọc theo vườn",
      "Ảnh đính kèm"
    ]
  },
  {
    id: "thu-chi",
    ten: "Thu chi",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Sổ thu chi theo vụ",
      "Tổng thu",
      "Tổng chi",
      "Lời lỗ",
      "Tiền bán qua app tự vào"
    ]
  },
  {
    id: "ghi",
    ten: "Nói để ghi",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Nút mic lớn",
      "Chữ hiện dần khi nói",
      "Có thể gõ hoặc chụp hóa đơn"
    ]
  },
  {
    id: "xac-nhan-ghi",
    ten: "Kiểm tra dòng vừa ghi",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "AI tách thành trường (ngày",
      "Việc",
      "Thuốc/phân",
      "Lượng",
      "Tiền)",
      "Sửa từng trường",
      "Lưu"
    ]
  },
  {
    id: "cach-ly",
    ten: "Thời gian cách ly",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Thuốc đã phun",
      "Ngày được hái sớm nhất",
      "Cảnh báo nếu lô đang bán còn trong thời gian cách ly"
    ]
  },
  {
    id: "ho-so-vuon",
    ten: "Hồ sơ nguồn gốc",
    trang: "vuon",
    nhom: "Vườn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Tóm tắt nhật ký để bên mua xem",
      "Mã QR truy xuất",
      "Mức đầy đủ",
      "Chọn phần cho xem"
    ]
  },
  {
    id: "hang",
    ten: "Hàng đang bán",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thẻ lô có nhãn trạng thái 4 nhóm",
      "Thanh lượng còn lại",
      "Số khách đang hỏi",
      "Vẫn còn hàng"
    ]
  },
  {
    id: "chi-tiet-lo",
    ten: "Chi tiết lô",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Ảnh",
      "Lượng còn bán / đã hứa / đã giao",
      "Đơn liên quan kèm trạng thái",
      "Hồ sơ nguồn gốc",
      "Sửa tin",
      "Bán bớt"
    ]
  },
  {
    id: "cap-nhat-luong",
    ten: "Còn lại bao nhiêu?",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Báo lượng mới",
      "Cảnh báo nếu thấp hơn lượng đã hứa"
    ]
  },
  {
    id: "sap-co-hang",
    ten: "Sắp có hàng",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Đăng tin trước mùa: ngày hái",
      "Lượng ước"
    ]
  },
  {
    id: "chung-tu",
    ten: "Chứng từ",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Giấy kiểm nghiệm",
      "Chứng nhận VietGAP",
      "Ảnh"
    ]
  },
  {
    id: "lo-gop",
    ten: "Lô gộp nhiều hộ",
    trang: "ban",
    nhom: "Bán · Hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Danh sách hộ",
      "Phần của từng hộ",
      "Nhắc gửi giấy",
      "Thêm hộ"
    ]
  },
  {
    id: "dang",
    ten: "Đăng hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Chụp / Nói / Tự gõ",
      "Thêm lựa chọn \"Từ mùa vụ đang có\""
    ]
  },
  {
    id: "chon-mat-hang",
    ten: "Chọn mặt hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Lưới mặt hàng"
    ]
  },
  {
    id: "chup",
    ten: "Chụp ảnh hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Khung chụp",
      "Gợi ý góc chụp",
      "Ảnh đã chụp"
    ]
  },
  {
    id: "nghe",
    ten: "Đang nghe",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Sóng âm",
      "Chữ hiện dần",
      "Nói lại",
      "Nói xong"
    ]
  },
  {
    id: "kiem-tra",
    ten: "Kiểm tra",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Các trường AI điền sẵn để sửa",
      "Chặn nếu còn thời gian cách ly thuốc"
    ]
  },
  {
    id: "xem-lai",
    ten: "Xem lại",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tin hoàn chỉnh như bên mua thấy (đã ẩn liên lạc)",
      "Nghe lại tin",
      "Đăng bán"
    ]
  },
  {
    id: "xong",
    ten: "Đã đăng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    tinhTrangCu: "Có",
    khuVuc: [
      "Xác nhận",
      "Số bên mua phù hợp đang tìm hàng này"
    ]
  },
  {
    id: "khach",
    ten: "Khách hỏi mua",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Danh sách bên mua: tên tổ chức",
      "Vùng",
      "Huy hiệu đã xác minh",
      "Điểm uy tín",
      "Không còn hiện số điện thoại"
    ]
  },
  {
    id: "nhu-cau",
    ten: "Cần mua",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Có",
    khuVuc: [
      "Tin cần mua của bên mua phù hợp với hàng của mình",
      "Chào hàng"
    ]
  },
  {
    id: "ket-noi",
    ten: "Khách muốn nói chuyện",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thông tin và uy tín bên mua",
      "Đồng ý / Không / Báo cáo"
    ]
  },
  {
    id: "ho-so-ben-mua",
    ten: "Hồ sơ bên mua",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Tên tổ chức",
      "Vùng",
      "Năm hoạt động",
      "Tỷ lệ trả đúng hạn",
      "Số đơn đã làm",
      "Nhận xét"
    ]
  },
  {
    id: "chat",
    ten: "Nhắn tin",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tin nhắn",
      "Gọi qua app (che số)",
      "Số điện thoại",
      "Zalo",
      "Link bị che kèm lời nhắc"
    ]
  },
  {
    id: "bao-gia",
    ten: "Báo giá",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Có",
    khuVuc: [
      "Giá theo loại",
      "Lượng",
      "Ngày giao",
      "Đồng ý / Gửi giá khác"
    ]
  },
  {
    id: "hen-xem",
    ten: "Hẹn xem vườn",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Ngày giờ",
      "Địa chỉ đến cấp ấp (chưa có số nhà)",
      "Gọi qua app"
    ]
  },
  {
    id: "bao-cao",
    ten: "Báo cáo",
    trang: "ban",
    nhom: "Bán · Khách",
    tinhTrangCu: "Có",
    khuVuc: [
      "Lý do",
      "Ảnh",
      "Gửi"
    ]
  },
  {
    id: "lich",
    ten: "Đơn và lịch giao",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Đơn chia theo 4 nhóm (Bạn cần làm",
      "Chờ bên kia",
      "Có vấn đề",
      "Đã xong) + lịch giao theo ngày"
    ]
  },
  {
    id: "chi-tiet-don",
    ten: "Chi tiết đơn",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thanh chặng đường 6 bước",
      "Thẻ bước tiếp theo",
      "Lượng",
      "Giá",
      "Cọc",
      "Lịch sử đơn",
      "Các nút xin đổi/hủy/báo sai"
    ]
  },
  {
    id: "xac-nhan-don",
    ten: "Đơn mới",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Lượng",
      "Giá",
      "Bên mua",
      "Kiểm tra lượng còn bán",
      "Xác nhận / Từ chối (chọn lý do)"
    ]
  },
  {
    id: "so-sanh",
    ten: "So sánh khách",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Hai hoặc ba bên mua cạnh nhau: giá",
      "Phí",
      "Điều kiện",
      "Uy tín"
    ]
  },
  {
    id: "phuong-thuc",
    ten: "Chọn cách giao dịch",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thanh toán đảm bảo (mặc định) hoặc tự giao dịch",
      "Ghi rõ phí giới thiệu",
      "Ai trả"
    ]
  },
  {
    id: "chon-luong",
    ten: "Hứa bán bao nhiêu?",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Lượng hứa",
      "Cảnh báo nếu lô còn là ước tính"
    ]
  },
  {
    id: "ky",
    ten: "Thỏa thuận",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Tóm tắt điều kiện",
      "Nghe",
      "Hỏi hỗ trợ",
      "Chưa đồng ý"
    ]
  },
  {
    id: "quyen",
    ten: "Quyền và trách nhiệm",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Các ý chính bằng câu ngắn"
    ]
  },
  {
    id: "ban-day-du",
    ten: "Bản đầy đủ",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Toàn văn",
      "Nghe cả bản",
      "Công tắc đã nghe hết",
      "Người làm chứng"
    ]
  },
  {
    id: "ky-otp",
    ten: "Xác nhận ký",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Mã OTP",
      "Gọi đọc mã"
    ]
  },
  {
    id: "ky-xong",
    ten: "Hoàn tất ký",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Xác nhận",
      "Bước tiếp: chờ bên mua đặt cọc"
    ]
  },
  {
    id: "ky-giay",
    ten: "Ký giấy",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Tải bản in",
      "Chụp từng trang đã ký"
    ]
  },
  {
    id: "so-ban",
    ten: "Các bản",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Lịch sử các bản thỏa thuận",
      "Đề nghị sửa"
    ]
  },
  {
    id: "coc",
    ten: "Tiền cọc",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Cọc đã vào tài khoản đảm bảo (do ngân hàng xác nhận)",
      "Không còn tự bấm \"đã nhận\""
    ]
  },
  {
    id: "mo-lien-lac",
    ten: "Đã mở liên lạc",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Tên người liên hệ",
      "Số điện thoại",
      "Địa chỉ giao hàng của hai bên",
      "Gọi",
      "Lưu danh bạ"
    ]
  },
  {
    id: "ket-qua",
    ten: "Kết quả cân",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Số bên mua nhập",
      "Ảnh phiếu cân",
      "Đúng / Không đúng",
      "Chụp số trên cân"
    ]
  },
  {
    id: "giao-mot-phan",
    ten: "Giao đợt sau",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Phần đã giao",
      "Phần còn lại",
      "Đề nghị giao bù hoặc bớt"
    ]
  },
  {
    id: "doi-lich",
    ten: "Xin đổi lịch",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Ngày mới",
      "Lý do",
      "Ảnh"
    ]
  },
  {
    id: "yeu-cau-thay-doi",
    ten: "Xin thay đổi",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Đổi lượng",
      "Giá",
      "Ngày",
      "Tạo bản thỏa thuận mới"
    ]
  },
  {
    id: "huy-don",
    ten: "Xin hủy đơn",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Lý do",
      "Bằng chứng",
      "Cọc sẽ xử lý thế nào theo thỏa thuận"
    ]
  },
  {
    id: "tranh-chap",
    ten: "Đối soát",
    trang: "don",
    nhom: "Đơn",
    tinhTrangCu: "Có",
    khuVuc: [
      "Phần đang lệch",
      "Chứng từ hai bên",
      "Người phụ trách",
      "Đề nghị"
    ]
  },
  {
    id: "tien",
    ten: "Tiền hàng",
    trang: "tien",
    nhom: "Tiền",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tiền đang giữ ở tài khoản đảm bảo",
      "Tiền đã về",
      "Tiền chờ",
      "Từng khoản gắn với đơn"
    ]
  },
  {
    id: "tien-ve",
    ten: "Tiền đã về",
    trang: "tien",
    nhom: "Tiền",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Số tiền",
      "Đơn",
      "Tài khoản nhận",
      "Thời gian",
      "Màn ăn mừng"
    ]
  },
  {
    id: "quyet-toan",
    ten: "Quyết toán",
    trang: "tien",
    nhom: "Tiền",
    tinhTrangCu: "Có",
    khuVuc: [
      "Bảng tính: lượng × giá − phí",
      "Nghe bảng tính"
    ]
  },
  {
    id: "lich-su-tien",
    ten: "Lịch sử tiền",
    trang: "tien",
    nhom: "Tiền",
    tinhTrangCu: "Có",
    khuVuc: [
      "Mọi khoản theo tháng",
      "Lọc theo đơn"
    ]
  },
  {
    id: "ung-tien",
    ten: "Nhận tiền trước",
    trang: "tien",
    nhom: "Tiền",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Đơn đủ điều kiện",
      "Số được ứng",
      "Phí",
      "Ngân hàng đối tác",
      "Đồng ý"
    ]
  },
  {
    id: "toi",
    ten: "Tôi",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Hồ sơ",
      "Uy tín",
      "Các mục cài đặt",
      "Đăng xuất"
    ]
  },
  {
    id: "uy-tin",
    ten: "Uy tín của tôi",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Bậc uy tín",
      "Giao đủ",
      "Đúng hẹn",
      "Nhận xét từ bên mua",
      "Cách lên bậc"
    ]
  },
  {
    id: "dich-vu",
    ten: "Kiểm nghiệm, xe, kho",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Dịch vụ đối tác"
    ]
  },
  {
    id: "dat-dich-vu",
    ten: "Đặt dịch vụ",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Chọn ngày",
      "Báo giá",
      "Đặt"
    ]
  },
  {
    id: "cai-dat",
    ten: "Cài đặt",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Cỡ chữ",
      "Tốc độ đọc",
      "Âm thanh",
      "Rung",
      "Ngôn ngữ"
    ]
  },
  {
    id: "ho-tro",
    ten: "Trung tâm hỗ trợ",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Câu hỏi thường gặp",
      "Hướng dẫn từng bước",
      "Tạo yêu cầu"
    ]
  },
  {
    id: "can-ho-tro",
    ten: "Cần hỗ trợ",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Mô tả",
      "Ảnh",
      "Gửi"
    ]
  },
  {
    id: "trang-thai",
    ten: "Lỗi mẫu",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Màn mẫu cho các trạng thái lỗi (mất mạng",
      "Ảnh mờ…)"
    ]
  },
  {
    id: "nguoi-giup",
    ten: "Người giúp",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Con cháu được dùng chung tài khoản",
      "Quyền từng người"
    ]
  },
  {
    id: "tai-khoan-nhan",
    ten: "Tài khoản nhận tiền",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Tài khoản ngân hàng",
      "Đổi tài khoản (có xác minh)"
    ]
  },
  {
    id: "bao-mat",
    ten: "Bảo mật",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Thiết bị đang đăng nhập",
      "Báo mất máy"
    ]
  },
  {
    id: "rieng-tu",
    ten: "Quyền riêng tư",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Cho bên mua xem gì trước khi đặt cọc",
      "Xem gì sau"
    ]
  },
  {
    id: "phan-cua-toi",
    ten: "Phần hàng của tôi",
    trang: "toi",
    nhom: "Tôi",
    tinhTrangCu: "Có",
    khuVuc: [
      "Dành cho hộ trong lô gộp: phần đã giao",
      "Tiền đã chia"
    ]
  },
  {
    id: "phong-thu",
    ten: "Phòng thử",
    trang: "cong-cu",
    nhom: "Công cụ mô phỏng",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Danh sách ca kiểm thử theo nhóm",
      "Nút chạy từng ca, chạy tất cả",
      "Kết quả từng điểm kiểm",
      "Xem trên app"
    ]
  },
  {
    id: "gia-lap",
    ten: "Giả lập bên mua",
    trang: "cong-cu",
    nhom: "Công cụ mô phỏng",
    tinhTrangCu: "Mới",
    khuVuc: [
      "Nạp kịch bản mẫu, xóa dữ liệu",
      "Tua đồng hồ",
      "Việc bên mua làm được tiếp, theo nhóm"
    ]
  }
];

export const timMan = (id: string) => DANH_MUC_MAN.find(m => m.id === id);
