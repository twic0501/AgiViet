// Danh mục màn của app Thu mua (49 màn đã chốt + 2 màn công cụ mô phỏng): nguồn cho trang HTML, điều hướng, bài thử.
export interface ManMua { id: string; ten: string; trang: string; nhom: string; khuVuc: string[] }

export const DANH_MUC_MAN_MUA: readonly ManMua[] = [
 {
  "id": "dang-nhap",
  "ten": "Đăng nhập",
  "trang": "vao-app",
  "nhom": "Vào app",
  "khuVuc": [
   "Số điện thoại hoặc email"
  ]
 },
 {
  "id": "otp",
  "ten": "Mã xác minh",
  "trang": "vao-app",
  "nhom": "Vào app",
  "khuVuc": [
   "6 ô mã"
  ]
 },
 {
  "id": "thong-tin-to-chuc",
  "ten": "Thông tin tổ chức",
  "trang": "vao-app",
  "nhom": "Vào app",
  "khuVuc": [
   "Tên",
   "Mã số thuế",
   "Địa chỉ",
   "Loại hình",
   "Thêm giấy phép để xác minh"
  ]
 },
 {
  "id": "chon-goi",
  "ten": "Chọn gói",
  "trang": "vao-app",
  "nhom": "Vào app",
  "khuVuc": [
   "Miễn phí / Business theo mô hình phí mới"
  ]
 },
 {
  "id": "tong-quan",
  "ten": "Tổng quan",
  "trang": "tong-quan",
  "nhom": "Tổng quan",
  "khuVuc": [
   "Việc cần làm chia 4 nhóm",
   "Đơn sắp nhận",
   "Tiền sắp trả",
   "Nguồn gợi ý",
   "Thiếu hàng"
  ]
 },
 {
  "id": "nguon-hang",
  "ten": "Nguồn hàng",
  "trang": "nguon-hang",
  "nhom": "Nguồn hàng",
  "khuVuc": [
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
  "id": "goi-y",
  "ten": "Gợi ý khớp nhu cầu",
  "trang": "nguon-hang",
  "nhom": "Nguồn hàng",
  "khuVuc": [
   "AI xếp hạng lô hợp với từng nhu cầu",
   "Lý do khớp"
  ]
 },
 {
  "id": "chi-tiet-lo",
  "ten": "Chi tiết lô",
  "trang": "nguon-hang",
  "nhom": "Nguồn hàng",
  "khuVuc": [
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
  "id": "ho-so-ban",
  "ten": "Hồ sơ người bán",
  "trang": "nguon-hang",
  "nhom": "Nguồn hàng",
  "khuVuc": [
   "Tên",
   "Vùng",
   "Uy tín",
   "Nhật ký tóm tắt",
   "Số điện thoại chỉ hiện sau khi đặt cọc"
  ]
 },
 {
  "id": "nhu-cau",
  "ten": "Nhu cầu mua",
  "trang": "nhu-cau",
  "nhom": "Nhu cầu",
  "khuVuc": [
   "Danh sách tin cần mua",
   "Số báo giá đã nhận"
  ]
 },
 {
  "id": "tao-nhu-cau",
  "ten": "Tạo nhu cầu",
  "trang": "nhu-cau",
  "nhom": "Nhu cầu",
  "khuVuc": [
   "Mặt hàng",
   "Loại",
   "Lượng",
   "Khoảng ngày",
   "Giá trần",
   "AI điền giúp"
  ]
 },
 {
  "id": "chi-tiet-nhu-cau",
  "ten": "Chi tiết nhu cầu",
  "trang": "nhu-cau",
  "nhom": "Nhu cầu",
  "khuVuc": [
   "Báo giá nhận được",
   "Lô gợi ý"
  ]
 },
 {
  "id": "bao-gia",
  "ten": "Báo giá",
  "trang": "bao-gia",
  "nhom": "Báo giá",
  "khuVuc": [
   "Báo giá theo nhu cầu"
  ]
 },
 {
  "id": "so-bao-gia",
  "ten": "So báo giá",
  "trang": "bao-gia",
  "nhom": "Báo giá",
  "khuVuc": [
   "Bảng so: giá",
   "Tổng chi phí nhận hàng",
   "Uy tín",
   "Ngày giao"
  ]
 },
 {
  "id": "gui-bao-gia",
  "ten": "Gửi báo giá",
  "trang": "bao-gia",
  "nhom": "Báo giá",
  "khuVuc": [
   "Giá theo loại",
   "Lượng",
   "Điều kiện"
  ]
 },
 {
  "id": "tin-nhan",
  "ten": "Tin nhắn",
  "trang": "tin-nhan",
  "nhom": "Tin nhắn",
  "khuVuc": [
   "Hội thoại",
   "Gọi và video qua app (che số)",
   "Liên lạc bị che kèm lời nhắc"
  ]
 },
 {
  "id": "hen-xem-vuon",
  "ten": "Hẹn xem vườn",
  "trang": "tin-nhan",
  "nhom": "Tin nhắn",
  "khuVuc": [
   "Đề nghị ngày giờ",
   "Địa chỉ cấp ấp",
   "Trạng thái hẹn"
  ]
 },
 {
  "id": "don-hang",
  "ten": "Đơn và lịch nhận",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Đơn chia 4 nhóm",
   "Lịch tháng"
  ]
 },
 {
  "id": "chi-tiet-don",
  "ten": "Chi tiết đơn",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Thanh chặng đường",
   "Bước tiếp theo",
   "Các đợt giao",
   "Phiếu cân",
   "Lịch sử"
  ]
 },
 {
  "id": "thoa-thuan",
  "ten": "Lập thỏa thuận",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Lượng",
   "Giá theo loại",
   "Lịch giao",
   "Cọc",
   "Điều khoản mất mùa"
  ]
 },
 {
  "id": "dat-coc",
  "ten": "Đặt cọc",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Phí giới thiệu (đơn đầu) hoặc phí mối quen",
   "Số cọc",
   "Chuyển vào tài khoản đảm bảo",
   "Mã chuyển khoản"
  ]
 },
 {
  "id": "mo-lien-lac",
  "ten": "Đã mở liên lạc",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Người liên hệ",
   "Số điện thoại",
   "Địa chỉ vườn của người bán"
  ]
 },
 {
  "id": "nghiem-thu",
  "ten": "Nhập kết quả cân",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Lượng nhận",
   "Lượng không nhận theo loại",
   "Lý do"
  ]
 },
 {
  "id": "doc-phieu-can",
  "ten": "Đọc phiếu cân",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Chụp phiếu",
   "AI điền số",
   "So với đơn",
   "Báo lệch"
  ]
 },
 {
  "id": "doi-soat",
  "ten": "Đối soát",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Phần đang lệch",
   "Chứng từ",
   "Đề xuất",
   "Trả phần không tranh chấp"
  ]
 },
 {
  "id": "lich-nhan",
  "ten": "Lịch nhận và trả tiền",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Theo tháng",
   "Xuất Excel"
  ]
 },
 {
  "id": "huy-don",
  "ten": "Hủy đơn",
  "trang": "don",
  "nhom": "Đơn",
  "khuVuc": [
   "Lý do",
   "Cọc xử lý theo thỏa thuận",
   "Chờ bên kia đồng ý"
  ]
 },
 {
  "id": "vi-dam-bao",
  "ten": "Tài khoản đảm bảo",
  "trang": "tien",
  "nhom": "Tiền",
  "khuVuc": [
   "Số dư",
   "Tiền đang giữ theo đơn",
   "Tiền đã chuyển cho người bán",
   "Nạp thêm"
  ]
 },
 {
  "id": "cong-no",
  "ten": "Công nợ",
  "trang": "tien",
  "nhom": "Tiền",
  "khuVuc": [
   "Theo người bán",
   "Theo đơn",
   "Xuất Excel"
  ]
 },
 {
  "id": "ghi-thanh-toan",
  "ten": "Chuyển tiền đơn",
  "trang": "tien",
  "nhom": "Tiền",
  "khuVuc": [
   "Chuyển khoản phải trả vào tài khoản đảm bảo",
   "Duyệt chi nhiều cấp"
  ]
 },
 {
  "id": "nhap-kho",
  "ten": "Nhập kho",
  "trang": "kho",
  "nhom": "Kho",
  "khuVuc": [
   "Từ đơn đã nghiệm thu",
   "Chia theo loại",
   "Vị trí kho"
  ]
 },
 {
  "id": "ton-kho",
  "ten": "Tồn kho",
  "trang": "kho",
  "nhom": "Kho",
  "khuVuc": [
   "Lượng theo mặt hàng",
   "Loại",
   "Ngày nhập",
   "Hạn dùng"
  ]
 },
 {
  "id": "truy-xuat",
  "ten": "Truy xuất lô",
  "trang": "kho",
  "nhom": "Kho",
  "khuVuc": [
   "Lô kho → đơn → người bán → nhật ký vườn",
   "Mã QR"
  ]
 },
 {
  "id": "moi-quen",
  "ten": "Mối quen",
  "trang": "nha-cung-cap",
  "nhom": "Nhà cung cấp",
  "khuVuc": [
   "Danh sách mối",
   "Đơn gần nhất",
   "Điểm",
   "Phí mối quen thấp"
  ]
 },
 {
  "id": "nhap-excel",
  "ten": "Nhập từ Excel",
  "trang": "nha-cung-cap",
  "nhom": "Nhà cung cấp",
  "khuVuc": [
   "Tải tệp",
   "Khớp cột",
   "Xem trước"
  ]
 },
 {
  "id": "cham-diem",
  "ten": "Chấm điểm nhà cung cấp",
  "trang": "nha-cung-cap",
  "nhom": "Nhà cung cấp",
  "khuVuc": [
   "Giao đủ",
   "Đúng loại",
   "Đúng hẹn theo từng người bán"
  ]
 },
 {
  "id": "ghi-don-ngoai",
  "ten": "Ghi đơn ngoài app",
  "trang": "nha-cung-cap",
  "nhom": "Nhà cung cấp",
  "khuVuc": [
   "Ghi lại đơn mua trực tiếp để công nợ",
   "Kho",
   "Bảng kê đủ"
  ]
 },
 {
  "id": "ke-hoach",
  "ten": "Kế hoạch mua",
  "trang": "ke-hoach",
  "nhom": "Kế hoạch",
  "khuVuc": [
   "Nhu cầu theo tháng",
   "Đã có nguồn",
   "Dự báo thiếu hàng"
  ]
 },
 {
  "id": "bang-ke",
  "ten": "Bảng kê mua hàng nông sản",
  "trang": "thue-bao-cao",
  "nhom": "Thuế và báo cáo",
  "khuVuc": [
   "Bảng kê mẫu 01/TNDN tự lập từ đơn",
   "Xuất PDF/Excel"
  ]
 },
 {
  "id": "bao-cao",
  "ten": "Báo cáo",
  "trang": "thue-bao-cao",
  "nhom": "Thuế và báo cáo",
  "khuVuc": [
   "Khối lượng",
   "Chi phí",
   "Giá bình quân theo mặt hàng",
   "Vùng",
   "Tháng"
  ]
 },
 {
  "id": "dich-vu",
  "ten": "Kiểm định, xe, kho",
  "trang": "dich-vu",
  "nhom": "Dịch vụ",
  "khuVuc": [
   "Yêu cầu đang có",
   "Đối tác"
  ]
 },
 {
  "id": "yeu-cau-dich-vu",
  "ten": "Yêu cầu dịch vụ",
  "trang": "dich-vu",
  "nhom": "Dịch vụ",
  "khuVuc": [
   "Báo giá đối tác",
   "Đặt lịch"
  ]
 },
 {
  "id": "thanh-vien",
  "ten": "Thành viên và phân quyền",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Người dùng",
   "Vai trò",
   "Quyền duyệt chi"
  ]
 },
 {
  "id": "goi-cua-toi",
  "ten": "Gói và thanh toán",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Gói hiện tại",
   "Hóa đơn"
  ]
 },
 {
  "id": "so-sanh-goi",
  "ten": "So sánh gói",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Quyền từng gói theo mô hình phí mới",
   "Bỏ câu \"Miễn phí rẻ hơn\""
  ]
 },
 {
  "id": "nang-cap",
  "ten": "Nâng cấp",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Kỳ thanh toán",
   "Xuất hóa đơn"
  ]
 },
 {
  "id": "nang-cap-xong",
  "ten": "Đã nâng cấp",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Xác nhận",
   "Mời thành viên"
  ]
 },
 {
  "id": "ho-so-to-chuc",
  "ten": "Hồ sơ tổ chức",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Thông tin doanh nghiệp",
   "Giấy tờ xác minh"
  ]
 },
 {
  "id": "uy-tin",
  "ten": "Uy tín của tổ chức",
  "trang": "to-chuc",
  "nhom": "Tổ chức",
  "khuVuc": [
   "Tỷ lệ trả đúng hạn",
   "Số đơn",
   "Nhận xét của người bán"
  ]
 },
 {
  "id": "phong-thu",
  "ten": "Phòng thử",
  "trang": "cong-cu",
  "nhom": "Công cụ mô phỏng",
  "khuVuc": [
   "Danh sách ca kiểm thử theo nhóm",
   "Nút chạy từng ca, chạy tất cả",
   "Kết quả từng điểm kiểm",
   "Xem trên app"
  ]
 },
 {
  "id": "gia-lap",
  "ten": "Giả lập người bán",
  "trang": "cong-cu",
  "nhom": "Công cụ mô phỏng",
  "khuVuc": [
   "Nạp kịch bản mẫu, xóa dữ liệu",
   "Tua đồng hồ",
   "Việc người bán làm tiếp được, theo nhóm"
  ]
 }
];
