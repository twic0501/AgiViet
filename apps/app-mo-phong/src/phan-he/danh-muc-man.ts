// Danh mục màn của app mô phỏng: nguồn duy nhất cho điều hướng, khung bố cục từng màn và tài liệu docs/03-giao-dien.
// Màn chưa làm hiện khung bố cục theo khuVuc; màn đã làm khai báo thành phần riêng trong phan-he/<vai>/man.ts.
// tinhTrangCu: so với bộ giao diện cũ (fe-nongdan, fe-thumua): Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.
export type VaiApp = 'ban' | 'mua';
export interface Man {
  vai: VaiApp;
  id: string;
  ten: string;
  /** Mục điều hướng chứa màn này. */
  trang: string;
  /** Nhóm trong danh mục thiết kế (để in tài liệu). */
  nhom: string;
  /** 1: luồng mua bán cốt lõi · 2: quản lý (vườn, kho, thuế) · 3: mở rộng (đối tác, gói, uy tín, hợp tác xã) */
  giaiDoan: 1 | 2 | 3;
  tinhTrangCu: 'Có' | 'Sửa' | 'Mới';
  /** Các khu vực của màn, từ trên xuống. */
  khuVuc: string[];
}

export const DANH_MUC_MAN: readonly Man[] = [
  {
    vai: "ban",
    id: "chao-mung",
    ten: "Chào mừng",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Logo",
      "Khẩu hiệu",
      "Nút Bắt đầu",
      "Tôi đã có tài khoản"
    ]
  },
  {
    vai: "ban",
    id: "dang-nhap",
    ten: "Số điện thoại",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Ô số điện thoại",
      "Nút Gửi mã",
      "Trợ giúp"
    ]
  },
  {
    vai: "ban",
    id: "otp",
    ten: "Nhập mã",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "6 ô mã",
      "Gửi lại",
      "Gọi đọc mã cho tôi"
    ]
  },
  {
    vai: "ban",
    id: "vai-tro",
    ten: "Bạn bán thế nào?",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Chọn: hộ nhà vườn",
      "Nuôi trồng thủy sản",
      "Hợp tác xã",
      "Tổ hợp tác"
    ]
  },
  {
    vai: "ban",
    id: "mat-hang",
    ten: "Mặt hàng",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lưới ảnh mặt hàng",
      "Chọn nhiều"
    ]
  },
  {
    vai: "ban",
    id: "ho-so",
    ten: "Hồ sơ",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tên",
      "Xã/huyện",
      "Lấy vị trí đang đứng"
    ]
  },
  {
    vai: "ban",
    id: "khai-bao-vuon",
    ten: "Khai báo vườn",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 2,
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
    vai: "ban",
    id: "xac-minh",
    ten: "Xác minh",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Chụp căn cước",
      "Trạng thái chờ duyệt",
      "Để sau"
    ]
  },
  {
    vai: "ban",
    id: "tro-giup-truy-cap",
    ten: "Trợ giúp đăng nhập",
    trang: "bat-dau",
    nhom: "Bắt đầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Đổi số",
      "Mất máy",
      "Gọi tổng đài"
    ]
  },
  {
    vai: "ban",
    id: "hom-nay",
    ten: "Hôm nay",
    trang: "hom-nay",
    nhom: "Hôm nay",
    giaiDoan: 1,
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
    vai: "ban",
    id: "tong-ket-tuan",
    ten: "Tổng kết tuần",
    trang: "hom-nay",
    nhom: "Hôm nay",
    giaiDoan: 2,
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
    vai: "ban",
    id: "thong-bao",
    ten: "Thông báo",
    trang: "hom-nay",
    nhom: "Hôm nay",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Danh sách thông báo chia theo 4 nhóm trạng thái (chuyển từ Tôi sang)"
    ]
  },
  {
    vai: "ban",
    id: "vuon",
    ten: "Vườn của tôi",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Danh sách vườn/ao",
      "Vụ đang chạy",
      "Vòng hồ sơ vườn %",
      "Nút Ghi"
    ]
  },
  {
    vai: "ban",
    id: "mua-vu",
    ten: "Mùa vụ",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Dòng thời gian một vụ (ra hoa → đậu trái → thu hoạch → bán)",
      "Sản lượng ước",
      "Ngày hái dự kiến",
      "Nút Đăng bán từ vụ này"
    ]
  },
  {
    vai: "ban",
    id: "nhat-ky",
    ten: "Nhật ký canh tác",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
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
    vai: "ban",
    id: "thu-chi",
    ten: "Thu chi",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
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
    vai: "ban",
    id: "ghi",
    ten: "Nói để ghi",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Nút mic lớn",
      "Chữ hiện dần khi nói",
      "Có thể gõ hoặc chụp hóa đơn"
    ]
  },
  {
    vai: "ban",
    id: "xac-nhan-ghi",
    ten: "Kiểm tra dòng vừa ghi",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
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
    vai: "ban",
    id: "cach-ly",
    ten: "Thời gian cách ly",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Thuốc đã phun",
      "Ngày được hái sớm nhất",
      "Cảnh báo nếu lô đang bán còn trong thời gian cách ly"
    ]
  },
  {
    vai: "ban",
    id: "ho-so-vuon",
    ten: "Hồ sơ nguồn gốc",
    trang: "vuon",
    nhom: "Vườn",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Tóm tắt nhật ký để bên mua xem",
      "Mã QR truy xuất",
      "Mức đầy đủ",
      "Chọn phần cho xem"
    ]
  },
  {
    vai: "ban",
    id: "hang",
    ten: "Hàng đang bán",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thẻ lô có nhãn trạng thái 4 nhóm",
      "Thanh lượng còn lại",
      "Số khách đang hỏi",
      "Vẫn còn hàng"
    ]
  },
  {
    vai: "ban",
    id: "chi-tiet-lo",
    ten: "Chi tiết lô",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 1,
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
    vai: "ban",
    id: "cap-nhat-luong",
    ten: "Còn lại bao nhiêu?",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Báo lượng mới",
      "Cảnh báo nếu thấp hơn lượng đã hứa"
    ]
  },
  {
    vai: "ban",
    id: "sap-co-hang",
    ten: "Sắp có hàng",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Đăng tin trước mùa: ngày hái",
      "Lượng ước"
    ]
  },
  {
    vai: "ban",
    id: "chung-tu",
    ten: "Chứng từ",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Giấy kiểm nghiệm",
      "Chứng nhận VietGAP",
      "Ảnh"
    ]
  },
  {
    vai: "ban",
    id: "lo-gop",
    ten: "Lô gộp nhiều hộ",
    trang: "ban",
    nhom: "Bán · Hàng",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Danh sách hộ",
      "Phần của từng hộ",
      "Nhắc gửi giấy",
      "Thêm hộ"
    ]
  },
  {
    vai: "ban",
    id: "dang",
    ten: "Đăng hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Chụp / Nói / Tự gõ",
      "Thêm lựa chọn \"Từ mùa vụ đang có\""
    ]
  },
  {
    vai: "ban",
    id: "chon-mat-hang",
    ten: "Chọn mặt hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lưới mặt hàng"
    ]
  },
  {
    vai: "ban",
    id: "chup",
    ten: "Chụp ảnh hàng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Khung chụp",
      "Gợi ý góc chụp",
      "Ảnh đã chụp"
    ]
  },
  {
    vai: "ban",
    id: "nghe",
    ten: "Đang nghe",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Sóng âm",
      "Chữ hiện dần",
      "Nói lại",
      "Nói xong"
    ]
  },
  {
    vai: "ban",
    id: "kiem-tra",
    ten: "Kiểm tra",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Các trường AI điền sẵn để sửa",
      "Chặn nếu còn thời gian cách ly thuốc"
    ]
  },
  {
    vai: "ban",
    id: "xem-lai",
    ten: "Xem lại",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tin hoàn chỉnh như bên mua thấy (đã ẩn liên lạc)",
      "Nghe lại tin",
      "Đăng bán"
    ]
  },
  {
    vai: "ban",
    id: "xong",
    ten: "Đã đăng",
    trang: "ban",
    nhom: "Bán · Đăng hàng",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Xác nhận",
      "Số bên mua phù hợp đang tìm hàng này"
    ]
  },
  {
    vai: "ban",
    id: "khach",
    ten: "Khách hỏi mua",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
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
    vai: "ban",
    id: "nhu-cau",
    ten: "Cần mua",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tin cần mua của bên mua phù hợp với hàng của mình",
      "Chào hàng"
    ]
  },
  {
    vai: "ban",
    id: "ket-noi",
    ten: "Khách muốn nói chuyện",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thông tin và uy tín bên mua",
      "Đồng ý / Không / Báo cáo"
    ]
  },
  {
    vai: "ban",
    id: "ho-so-ben-mua",
    ten: "Hồ sơ bên mua",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
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
    vai: "ban",
    id: "chat",
    ten: "Nhắn tin",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
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
    vai: "ban",
    id: "bao-gia",
    ten: "Báo giá",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Giá theo loại",
      "Lượng",
      "Ngày giao",
      "Đồng ý / Gửi giá khác"
    ]
  },
  {
    vai: "ban",
    id: "hen-xem",
    ten: "Hẹn xem vườn",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Ngày giờ",
      "Địa chỉ đến cấp ấp (chưa có số nhà)",
      "Gọi qua app"
    ]
  },
  {
    vai: "ban",
    id: "bao-cao",
    ten: "Báo cáo",
    trang: "ban",
    nhom: "Bán · Khách",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lý do",
      "Ảnh",
      "Gửi"
    ]
  },
  {
    vai: "ban",
    id: "lich",
    ten: "Đơn và lịch giao",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Đơn chia theo 4 nhóm (Bạn cần làm",
      "Chờ bên kia",
      "Có vấn đề",
      "Đã xong) + lịch giao theo ngày"
    ]
  },
  {
    vai: "ban",
    id: "chi-tiet-don",
    ten: "Chi tiết đơn",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
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
    vai: "ban",
    id: "xac-nhan-don",
    ten: "Đơn mới",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
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
    vai: "ban",
    id: "so-sanh",
    ten: "So sánh khách",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Hai hoặc ba bên mua cạnh nhau: giá",
      "Phí",
      "Điều kiện",
      "Uy tín"
    ]
  },
  {
    vai: "ban",
    id: "phuong-thuc",
    ten: "Chọn cách giao dịch",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thanh toán đảm bảo (mặc định) hoặc tự giao dịch",
      "Ghi rõ phí giới thiệu",
      "Ai trả"
    ]
  },
  {
    vai: "ban",
    id: "chon-luong",
    ten: "Hứa bán bao nhiêu?",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lượng hứa",
      "Cảnh báo nếu lô còn là ước tính"
    ]
  },
  {
    vai: "ban",
    id: "ky",
    ten: "Thỏa thuận",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tóm tắt điều kiện",
      "Nghe",
      "Hỏi hỗ trợ",
      "Chưa đồng ý"
    ]
  },
  {
    vai: "ban",
    id: "quyen",
    ten: "Quyền và trách nhiệm",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Các ý chính bằng câu ngắn"
    ]
  },
  {
    vai: "ban",
    id: "ban-day-du",
    ten: "Bản đầy đủ",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Toàn văn",
      "Nghe cả bản",
      "Công tắc đã nghe hết",
      "Người làm chứng"
    ]
  },
  {
    vai: "ban",
    id: "ky-otp",
    ten: "Xác nhận ký",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Mã OTP",
      "Gọi đọc mã"
    ]
  },
  {
    vai: "ban",
    id: "ky-xong",
    ten: "Hoàn tất ký",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Xác nhận",
      "Bước tiếp: chờ bên mua đặt cọc"
    ]
  },
  {
    vai: "ban",
    id: "ky-giay",
    ten: "Ký giấy",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tải bản in",
      "Chụp từng trang đã ký"
    ]
  },
  {
    vai: "ban",
    id: "so-ban",
    ten: "Các bản",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lịch sử các bản thỏa thuận",
      "Đề nghị sửa"
    ]
  },
  {
    vai: "ban",
    id: "coc",
    ten: "Tiền cọc",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Cọc đã vào tài khoản đảm bảo (do ngân hàng xác nhận)",
      "Không còn tự bấm \"đã nhận\""
    ]
  },
  {
    vai: "ban",
    id: "mo-lien-lac",
    ten: "Đã mở liên lạc",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
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
    vai: "ban",
    id: "ket-qua",
    ten: "Kết quả cân",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Số bên mua nhập",
      "Ảnh phiếu cân",
      "Đúng / Không đúng",
      "Chụp số trên cân"
    ]
  },
  {
    vai: "ban",
    id: "giao-mot-phan",
    ten: "Giao đợt sau",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Phần đã giao",
      "Phần còn lại",
      "Đề nghị giao bù hoặc bớt"
    ]
  },
  {
    vai: "ban",
    id: "doi-lich",
    ten: "Xin đổi lịch",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Ngày mới",
      "Lý do",
      "Ảnh"
    ]
  },
  {
    vai: "ban",
    id: "yeu-cau-thay-doi",
    ten: "Xin thay đổi",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Đổi lượng",
      "Giá",
      "Ngày",
      "Tạo bản thỏa thuận mới"
    ]
  },
  {
    vai: "ban",
    id: "huy-don",
    ten: "Xin hủy đơn",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Lý do",
      "Bằng chứng",
      "Cọc sẽ xử lý thế nào theo thỏa thuận"
    ]
  },
  {
    vai: "ban",
    id: "tranh-chap",
    ten: "Đối soát",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Phần đang lệch",
      "Chứng từ hai bên",
      "Người phụ trách",
      "Đề nghị"
    ]
  },
  {
    vai: "ban",
    id: "tien",
    ten: "Tiền hàng",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tiền đang giữ ở tài khoản đảm bảo",
      "Tiền đã về",
      "Tiền chờ",
      "Từng khoản gắn với đơn"
    ]
  },
  {
    vai: "ban",
    id: "tien-ve",
    ten: "Tiền đã về",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
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
    vai: "ban",
    id: "quyet-toan",
    ten: "Quyết toán",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Bảng tính: lượng × giá − phí",
      "Nghe bảng tính"
    ]
  },
  {
    vai: "ban",
    id: "lich-su-tien",
    ten: "Lịch sử tiền",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Mọi khoản theo tháng",
      "Lọc theo đơn"
    ]
  },
  {
    vai: "ban",
    id: "ung-tien",
    ten: "Nhận tiền trước",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 3,
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
    vai: "ban",
    id: "toi",
    ten: "Tôi",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Hồ sơ",
      "Uy tín",
      "Các mục cài đặt",
      "Đăng xuất"
    ]
  },
  {
    vai: "ban",
    id: "uy-tin",
    ten: "Uy tín của tôi",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
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
    vai: "ban",
    id: "dich-vu",
    ten: "Kiểm nghiệm, xe, kho",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Dịch vụ đối tác"
    ]
  },
  {
    vai: "ban",
    id: "dat-dich-vu",
    ten: "Đặt dịch vụ",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Chọn ngày",
      "Báo giá",
      "Đặt"
    ]
  },
  {
    vai: "ban",
    id: "cai-dat",
    ten: "Cài đặt",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
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
    vai: "ban",
    id: "ho-tro",
    ten: "Trung tâm hỗ trợ",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Câu hỏi thường gặp",
      "Hướng dẫn từng bước",
      "Tạo yêu cầu"
    ]
  },
  {
    vai: "ban",
    id: "can-ho-tro",
    ten: "Cần hỗ trợ",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Mô tả",
      "Ảnh",
      "Gửi"
    ]
  },
  {
    vai: "ban",
    id: "trang-thai",
    ten: "Lỗi mẫu",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Màn mẫu cho các trạng thái lỗi (mất mạng",
      "Ảnh mờ…)"
    ]
  },
  {
    vai: "ban",
    id: "nguoi-giup",
    ten: "Người giúp",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Con cháu được dùng chung tài khoản",
      "Quyền từng người"
    ]
  },
  {
    vai: "ban",
    id: "tai-khoan-nhan",
    ten: "Tài khoản nhận tiền",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tài khoản ngân hàng",
      "Đổi tài khoản (có xác minh)"
    ]
  },
  {
    vai: "ban",
    id: "bao-mat",
    ten: "Bảo mật",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Thiết bị đang đăng nhập",
      "Báo mất máy"
    ]
  },
  {
    vai: "ban",
    id: "rieng-tu",
    ten: "Quyền riêng tư",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Cho bên mua xem gì trước khi đặt cọc",
      "Xem gì sau"
    ]
  },
  {
    vai: "ban",
    id: "phan-cua-toi",
    ten: "Phần hàng của tôi",
    trang: "toi",
    nhom: "Tôi",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Dành cho hộ trong lô gộp: phần đã giao",
      "Tiền đã chia"
    ]
  },
  {
    vai: "mua",
    id: "dang-nhap",
    ten: "Đăng nhập",
    trang: "vao-app",
    nhom: "Vào app",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Số điện thoại hoặc email"
    ]
  },
  {
    vai: "mua",
    id: "otp",
    ten: "Mã xác minh",
    trang: "vao-app",
    nhom: "Vào app",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "6 ô mã"
    ]
  },
  {
    vai: "mua",
    id: "thong-tin-to-chuc",
    ten: "Thông tin tổ chức",
    trang: "vao-app",
    nhom: "Vào app",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tên",
      "Mã số thuế",
      "Địa chỉ",
      "Loại hình",
      "Thêm giấy phép để xác minh"
    ]
  },
  {
    vai: "mua",
    id: "chon-goi",
    ten: "Chọn gói",
    trang: "vao-app",
    nhom: "Vào app",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Miễn phí / Business theo mô hình phí mới"
    ]
  },
  {
    vai: "mua",
    id: "tong-quan",
    ten: "Tổng quan",
    trang: "tong-quan",
    nhom: "Tổng quan",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Việc cần làm chia 4 nhóm",
      "Đơn sắp nhận",
      "Tiền sắp trả",
      "Nguồn gợi ý",
      "Thiếu hàng"
    ]
  },
  {
    vai: "mua",
    id: "nguon-hang",
    ten: "Nguồn hàng",
    trang: "nguon-hang",
    nhom: "Nguồn hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Lưới lô: ảnh",
      "Lượng còn bán",
      "Vùng",
      "Ngày hái",
      "Uy tín người bán",
      "Bộ lọc",
      "Không hiện liên lạc"
    ]
  },
  {
    vai: "mua",
    id: "goi-y",
    ten: "Gợi ý khớp nhu cầu",
    trang: "nguon-hang",
    nhom: "Nguồn hàng",
    giaiDoan: 3,
    tinhTrangCu: "Mới",
    khuVuc: [
      "AI xếp hạng lô hợp với từng nhu cầu",
      "Lý do khớp"
    ]
  },
  {
    vai: "mua",
    id: "chi-tiet-lo",
    ten: "Chi tiết lô",
    trang: "nguon-hang",
    nhom: "Nguồn hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Ảnh",
      "Lượng",
      "Chất lượng",
      "Hồ sơ nguồn gốc",
      "Kết nối",
      "Hỏi giá",
      "Hẹn xem",
      "Đặt kiểm định"
    ]
  },
  {
    vai: "mua",
    id: "ho-so-ban",
    ten: "Hồ sơ người bán",
    trang: "nguon-hang",
    nhom: "Nguồn hàng",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Tên",
      "Vùng",
      "Uy tín",
      "Nhật ký tóm tắt",
      "Số điện thoại chỉ hiện sau khi đặt cọc"
    ]
  },
  {
    vai: "mua",
    id: "nhu-cau",
    ten: "Nhu cầu mua",
    trang: "nhu-cau",
    nhom: "Nhu cầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Danh sách tin cần mua",
      "Số báo giá đã nhận"
    ]
  },
  {
    vai: "mua",
    id: "tao-nhu-cau",
    ten: "Tạo nhu cầu",
    trang: "nhu-cau",
    nhom: "Nhu cầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Mặt hàng",
      "Loại",
      "Lượng",
      "Khoảng ngày",
      "Giá trần",
      "AI điền giúp"
    ]
  },
  {
    vai: "mua",
    id: "chi-tiet-nhu-cau",
    ten: "Chi tiết nhu cầu",
    trang: "nhu-cau",
    nhom: "Nhu cầu",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Báo giá nhận được",
      "Lô gợi ý"
    ]
  },
  {
    vai: "mua",
    id: "bao-gia",
    ten: "Báo giá",
    trang: "bao-gia",
    nhom: "Báo giá",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Báo giá theo nhu cầu"
    ]
  },
  {
    vai: "mua",
    id: "so-bao-gia",
    ten: "So báo giá",
    trang: "bao-gia",
    nhom: "Báo giá",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Bảng so: giá",
      "Tổng chi phí nhận hàng",
      "Uy tín",
      "Ngày giao"
    ]
  },
  {
    vai: "mua",
    id: "gui-bao-gia",
    ten: "Gửi báo giá",
    trang: "bao-gia",
    nhom: "Báo giá",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Giá theo loại",
      "Lượng",
      "Điều kiện"
    ]
  },
  {
    vai: "mua",
    id: "tin-nhan",
    ten: "Tin nhắn",
    trang: "tin-nhan",
    nhom: "Tin nhắn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Hội thoại",
      "Gọi và video qua app (che số)",
      "Liên lạc bị che kèm lời nhắc"
    ]
  },
  {
    vai: "mua",
    id: "hen-xem-vuon",
    ten: "Hẹn xem vườn",
    trang: "tin-nhan",
    nhom: "Tin nhắn",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Đề nghị ngày giờ",
      "Địa chỉ cấp ấp",
      "Trạng thái hẹn"
    ]
  },
  {
    vai: "mua",
    id: "don-hang",
    ten: "Đơn và lịch nhận",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Đơn chia 4 nhóm",
      "Lịch tháng"
    ]
  },
  {
    vai: "mua",
    id: "chi-tiet-don",
    ten: "Chi tiết đơn",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Thanh chặng đường",
      "Bước tiếp theo",
      "Các đợt giao",
      "Phiếu cân",
      "Lịch sử"
    ]
  },
  {
    vai: "mua",
    id: "thoa-thuan",
    ten: "Lập thỏa thuận",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Lượng",
      "Giá theo loại",
      "Lịch giao",
      "Cọc",
      "Điều khoản mất mùa"
    ]
  },
  {
    vai: "mua",
    id: "dat-coc",
    ten: "Đặt cọc",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Phí giới thiệu (đơn đầu) hoặc phí mối quen",
      "Số cọc",
      "Chuyển vào tài khoản đảm bảo",
      "Mã chuyển khoản"
    ]
  },
  {
    vai: "mua",
    id: "mo-lien-lac",
    ten: "Đã mở liên lạc",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Người liên hệ",
      "Số điện thoại",
      "Địa chỉ vườn của người bán"
    ]
  },
  {
    vai: "mua",
    id: "nghiem-thu",
    ten: "Nhập kết quả cân",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Lượng nhận",
      "Lượng không nhận theo loại",
      "Lý do"
    ]
  },
  {
    vai: "mua",
    id: "doc-phieu-can",
    ten: "Đọc phiếu cân",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Chụp phiếu",
      "AI điền số",
      "So với đơn",
      "Báo lệch"
    ]
  },
  {
    vai: "mua",
    id: "doi-soat",
    ten: "Đối soát",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Phần đang lệch",
      "Chứng từ",
      "Đề xuất",
      "Trả phần không tranh chấp"
    ]
  },
  {
    vai: "mua",
    id: "lich-nhan",
    ten: "Lịch nhận và trả tiền",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Theo tháng",
      "Xuất Excel"
    ]
  },
  {
    vai: "mua",
    id: "huy-don",
    ten: "Hủy đơn",
    trang: "don",
    nhom: "Đơn",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Lý do",
      "Cọc xử lý theo thỏa thuận",
      "Chờ bên kia đồng ý"
    ]
  },
  {
    vai: "mua",
    id: "vi-dam-bao",
    ten: "Tài khoản đảm bảo",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Số dư",
      "Tiền đang giữ theo đơn",
      "Tiền đã chuyển cho người bán",
      "Nạp thêm"
    ]
  },
  {
    vai: "mua",
    id: "cong-no",
    ten: "Công nợ",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Theo người bán",
      "Theo đơn",
      "Xuất Excel"
    ]
  },
  {
    vai: "mua",
    id: "ghi-thanh-toan",
    ten: "Chuyển tiền đơn",
    trang: "tien",
    nhom: "Tiền",
    giaiDoan: 1,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Chuyển khoản phải trả vào tài khoản đảm bảo",
      "Duyệt chi nhiều cấp"
    ]
  },
  {
    vai: "mua",
    id: "nhap-kho",
    ten: "Nhập kho",
    trang: "kho",
    nhom: "Kho",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Từ đơn đã nghiệm thu",
      "Chia theo loại",
      "Vị trí kho"
    ]
  },
  {
    vai: "mua",
    id: "ton-kho",
    ten: "Tồn kho",
    trang: "kho",
    nhom: "Kho",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Lượng theo mặt hàng",
      "Loại",
      "Ngày nhập",
      "Hạn dùng"
    ]
  },
  {
    vai: "mua",
    id: "truy-xuat",
    ten: "Truy xuất lô",
    trang: "kho",
    nhom: "Kho",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Lô kho → đơn → người bán → nhật ký vườn",
      "Mã QR"
    ]
  },
  {
    vai: "mua",
    id: "moi-quen",
    ten: "Mối quen",
    trang: "nha-cung-cap",
    nhom: "Nhà cung cấp",
    giaiDoan: 2,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Danh sách mối",
      "Đơn gần nhất",
      "Điểm",
      "Phí mối quen thấp"
    ]
  },
  {
    vai: "mua",
    id: "nhap-excel",
    ten: "Nhập từ Excel",
    trang: "nha-cung-cap",
    nhom: "Nhà cung cấp",
    giaiDoan: 2,
    tinhTrangCu: "Có",
    khuVuc: [
      "Tải tệp",
      "Khớp cột",
      "Xem trước"
    ]
  },
  {
    vai: "mua",
    id: "cham-diem",
    ten: "Chấm điểm nhà cung cấp",
    trang: "nha-cung-cap",
    nhom: "Nhà cung cấp",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Giao đủ",
      "Đúng loại",
      "Đúng hẹn theo từng người bán"
    ]
  },
  {
    vai: "mua",
    id: "ghi-don-ngoai",
    ten: "Ghi đơn ngoài app",
    trang: "nha-cung-cap",
    nhom: "Nhà cung cấp",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Ghi lại đơn mua trực tiếp để công nợ",
      "Kho",
      "Bảng kê đủ"
    ]
  },
  {
    vai: "mua",
    id: "ke-hoach",
    ten: "Kế hoạch mua",
    trang: "ke-hoach",
    nhom: "Kế hoạch",
    giaiDoan: 2,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Nhu cầu theo tháng",
      "Đã có nguồn",
      "Dự báo thiếu hàng"
    ]
  },
  {
    vai: "mua",
    id: "bang-ke",
    ten: "Bảng kê mua hàng nông sản",
    trang: "thue-bao-cao",
    nhom: "Thuế và báo cáo",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Bảng kê mẫu 01/TNDN tự lập từ đơn",
      "Xuất PDF/Excel"
    ]
  },
  {
    vai: "mua",
    id: "bao-cao",
    ten: "Báo cáo",
    trang: "thue-bao-cao",
    nhom: "Thuế và báo cáo",
    giaiDoan: 2,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Khối lượng",
      "Chi phí",
      "Giá bình quân theo mặt hàng",
      "Vùng",
      "Tháng"
    ]
  },
  {
    vai: "mua",
    id: "dich-vu",
    ten: "Kiểm định, xe, kho",
    trang: "dich-vu",
    nhom: "Dịch vụ",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Yêu cầu đang có",
      "Đối tác"
    ]
  },
  {
    vai: "mua",
    id: "yeu-cau-dich-vu",
    ten: "Yêu cầu dịch vụ",
    trang: "dich-vu",
    nhom: "Dịch vụ",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Báo giá đối tác",
      "Đặt lịch"
    ]
  },
  {
    vai: "mua",
    id: "thanh-vien",
    ten: "Thành viên và phân quyền",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Người dùng",
      "Vai trò",
      "Quyền duyệt chi"
    ]
  },
  {
    vai: "mua",
    id: "goi-cua-toi",
    ten: "Gói và thanh toán",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Gói hiện tại",
      "Hóa đơn"
    ]
  },
  {
    vai: "mua",
    id: "so-sanh-goi",
    ten: "So sánh gói",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Sửa",
    khuVuc: [
      "Quyền từng gói theo mô hình phí mới",
      "Bỏ câu \"Miễn phí rẻ hơn\""
    ]
  },
  {
    vai: "mua",
    id: "nang-cap",
    ten: "Nâng cấp",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Kỳ thanh toán",
      "Xuất hóa đơn"
    ]
  },
  {
    vai: "mua",
    id: "nang-cap-xong",
    ten: "Đã nâng cấp",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Có",
    khuVuc: [
      "Xác nhận",
      "Mời thành viên"
    ]
  },
  {
    vai: "mua",
    id: "ho-so-to-chuc",
    ten: "Hồ sơ tổ chức",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 1,
    tinhTrangCu: "Có",
    khuVuc: [
      "Thông tin doanh nghiệp",
      "Giấy tờ xác minh"
    ]
  },
  {
    vai: "mua",
    id: "uy-tin",
    ten: "Uy tín của tổ chức",
    trang: "to-chuc",
    nhom: "Tổ chức",
    giaiDoan: 3,
    tinhTrangCu: "Mới",
    khuVuc: [
      "Tỷ lệ trả đúng hạn",
      "Số đơn",
      "Nhận xét của người bán"
    ]
  }
];

export const manCua = (vai: VaiApp) => DANH_MUC_MAN.filter(m => m.vai === vai);
export const timMan = (vai: VaiApp, id: string) => DANH_MUC_MAN.find(m => m.vai === vai && m.id === id);
