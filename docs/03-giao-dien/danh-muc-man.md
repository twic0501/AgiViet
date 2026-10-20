<!-- Tệp sinh tự động bằng `npm run tai-lieu`. Đừng sửa tay. -->

# Danh mục màn app Nhà sản xuất (app bán)

Nguồn: `apps/app-ban/src/danh-muc-man.ts`. Mỗi màn mở ở `/<mã>` trong app; bài thử `apps/app-ban/test/danh-muc-man.test.ts` bảo đảm màn nào trong danh mục cũng có giao diện.

Tổng 82 màn: 80 màn của app thật và 2 màn công cụ mô phỏng (Phòng thử, Giả lập bên mua). "So với bản cũ": Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.

## Bắt đầu

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `chao-mung` | Chào mừng | Bắt đầu | Có | Logo · Khẩu hiệu · Nút Bắt đầu · Tôi đã có tài khoản |
| `dang-nhap` | Số điện thoại | Bắt đầu | Có | Ô số điện thoại · Nút Gửi mã · Trợ giúp |
| `otp` | Nhập mã | Bắt đầu | Có | 6 ô mã · Gửi lại · Gọi đọc mã cho tôi |
| `vai-tro` | Bạn bán thế nào? | Bắt đầu | Có | Chọn: hộ nhà vườn · Nuôi trồng thủy sản · Hợp tác xã · Tổ hợp tác |
| `mat-hang` | Mặt hàng | Bắt đầu | Có | Lưới ảnh mặt hàng · Chọn nhiều |
| `ho-so` | Hồ sơ | Bắt đầu | Có | Tên · Xã/huyện · Lấy vị trí đang đứng |
| `khai-bao-vuon` | Khai báo vườn | Bắt đầu | Mới | Từng vườn/ao: diện tích · Loại cây/con · Số gốc · Năm trồng · Vụ hiện tại. Bỏ qua được |
| `xac-minh` | Xác minh | Bắt đầu | Có | Chụp căn cước · Trạng thái chờ duyệt · Để sau |
| `tro-giup-truy-cap` | Trợ giúp đăng nhập | Bắt đầu | Có | Đổi số · Mất máy · Gọi tổng đài |

## Hôm nay

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `hom-nay` | Hôm nay | Hôm nay | Mới | Thẻ "Bước tiếp theo" của từng đơn (tới lượt ai · Còn bao lâu) · Nhắc cách ly thuốc · Thời tiết 3 ngày · Số liệu tuần · Lối tắt Ghi / Đăng |
| `tong-ket-tuan` | Tổng kết tuần | Hôm nay | Mới | Đã bán · Đã thu · Đã chi · Lời tạm tính · So tuần trước |
| `thong-bao` | Thông báo | Hôm nay | Sửa | Danh sách thông báo chia theo 4 nhóm trạng thái (chuyển từ Tôi sang) |

## Vườn

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `vuon` | Vườn của tôi | Vườn | Mới | Danh sách vườn/ao · Vụ đang chạy · Vòng hồ sơ vườn % · Nút Ghi |
| `mua-vu` | Mùa vụ | Vườn | Mới | Dòng thời gian một vụ (ra hoa → đậu trái → thu hoạch → bán) · Sản lượng ước · Ngày hái dự kiến · Nút Đăng bán từ vụ này |
| `nhat-ky` | Nhật ký canh tác | Vườn | Mới | Dòng theo ngày: phun thuốc · Bón phân · Tưới · Thu hoạch · Lọc theo vườn · Ảnh đính kèm |
| `thu-chi` | Thu chi | Vườn | Mới | Sổ thu chi theo vụ · Tổng thu · Tổng chi · Lời lỗ · Tiền bán qua app tự vào |
| `ghi` | Nói để ghi | Vườn | Mới | Nút mic lớn · Chữ hiện dần khi nói · Có thể gõ hoặc chụp hóa đơn |
| `xac-nhan-ghi` | Kiểm tra dòng vừa ghi | Vườn | Mới | AI tách thành trường (ngày · Việc · Thuốc/phân · Lượng · Tiền) · Sửa từng trường · Lưu |
| `cach-ly` | Thời gian cách ly | Vườn | Mới | Thuốc đã phun · Ngày được hái sớm nhất · Cảnh báo nếu lô đang bán còn trong thời gian cách ly |
| `ho-so-vuon` | Hồ sơ nguồn gốc | Vườn | Mới | Tóm tắt nhật ký để bên mua xem · Mã QR truy xuất · Mức đầy đủ · Chọn phần cho xem |

## Bán hàng

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `hang` | Hàng đang bán | Bán · Hàng | Sửa | Thẻ lô có nhãn trạng thái 4 nhóm · Thanh lượng còn lại · Số khách đang hỏi · Vẫn còn hàng |
| `chi-tiet-lo` | Chi tiết lô | Bán · Hàng | Sửa | Ảnh · Lượng còn bán / đã hứa / đã giao · Đơn liên quan kèm trạng thái · Hồ sơ nguồn gốc · Sửa tin · Bán bớt |
| `cap-nhat-luong` | Còn lại bao nhiêu? | Bán · Hàng | Có | Báo lượng mới · Cảnh báo nếu thấp hơn lượng đã hứa |
| `sap-co-hang` | Sắp có hàng | Bán · Hàng | Có | Đăng tin trước mùa: ngày hái · Lượng ước |
| `chung-tu` | Chứng từ | Bán · Hàng | Có | Giấy kiểm nghiệm · Chứng nhận VietGAP · Ảnh |
| `lo-gop` | Lô gộp nhiều hộ | Bán · Hàng | Có | Danh sách hộ · Phần của từng hộ · Nhắc gửi giấy · Thêm hộ |
| `dang` | Đăng hàng | Bán · Đăng hàng | Sửa | Chụp / Nói / Tự gõ · Thêm lựa chọn "Từ mùa vụ đang có" |
| `chon-mat-hang` | Chọn mặt hàng | Bán · Đăng hàng | Có | Lưới mặt hàng |
| `chup` | Chụp ảnh hàng | Bán · Đăng hàng | Có | Khung chụp · Gợi ý góc chụp · Ảnh đã chụp |
| `nghe` | Đang nghe | Bán · Đăng hàng | Có | Sóng âm · Chữ hiện dần · Nói lại · Nói xong |
| `kiem-tra` | Kiểm tra | Bán · Đăng hàng | Sửa | Các trường AI điền sẵn để sửa · Chặn nếu còn thời gian cách ly thuốc |
| `xem-lai` | Xem lại | Bán · Đăng hàng | Sửa | Tin hoàn chỉnh như bên mua thấy (đã ẩn liên lạc) · Nghe lại tin · Đăng bán |
| `xong` | Đã đăng | Bán · Đăng hàng | Có | Xác nhận · Số bên mua phù hợp đang tìm hàng này |
| `khach` | Khách hỏi mua | Bán · Khách | Sửa | Danh sách bên mua: tên tổ chức · Vùng · Huy hiệu đã xác minh · Điểm uy tín · Không còn hiện số điện thoại |
| `nhu-cau` | Cần mua | Bán · Khách | Có | Tin cần mua của bên mua phù hợp với hàng của mình · Chào hàng |
| `ket-noi` | Khách muốn nói chuyện | Bán · Khách | Sửa | Thông tin và uy tín bên mua · Đồng ý / Không / Báo cáo |
| `ho-so-ben-mua` | Hồ sơ bên mua | Bán · Khách | Mới | Tên tổ chức · Vùng · Năm hoạt động · Tỷ lệ trả đúng hạn · Số đơn đã làm · Nhận xét |
| `chat` | Nhắn tin | Bán · Khách | Sửa | Tin nhắn · Gọi qua app (che số) · Số điện thoại · Zalo · Link bị che kèm lời nhắc |
| `bao-gia` | Báo giá | Bán · Khách | Có | Giá theo loại · Lượng · Ngày giao · Đồng ý / Gửi giá khác |
| `hen-xem` | Hẹn xem vườn | Bán · Khách | Sửa | Ngày giờ · Địa chỉ đến cấp ấp (chưa có số nhà) · Gọi qua app |
| `bao-cao` | Báo cáo | Bán · Khách | Có | Lý do · Ảnh · Gửi |

## Đơn

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `lich` | Đơn và lịch giao | Đơn | Sửa | Đơn chia theo 4 nhóm (Bạn cần làm · Chờ bên kia · Có vấn đề · Đã xong) + lịch giao theo ngày |
| `chi-tiet-don` | Chi tiết đơn | Đơn | Sửa | Thanh chặng đường 6 bước · Thẻ bước tiếp theo · Lượng · Giá · Cọc · Lịch sử đơn · Các nút xin đổi/hủy/báo sai |
| `xac-nhan-don` | Đơn mới | Đơn | Mới | Lượng · Giá · Bên mua · Kiểm tra lượng còn bán · Xác nhận / Từ chối (chọn lý do) |
| `so-sanh` | So sánh khách | Đơn | Có | Hai hoặc ba bên mua cạnh nhau: giá · Phí · Điều kiện · Uy tín |
| `phuong-thuc` | Chọn cách giao dịch | Đơn | Sửa | Thanh toán đảm bảo (mặc định) hoặc tự giao dịch · Ghi rõ phí giới thiệu · Ai trả |
| `chon-luong` | Hứa bán bao nhiêu? | Đơn | Có | Lượng hứa · Cảnh báo nếu lô còn là ước tính |
| `ky` | Thỏa thuận | Đơn | Có | Tóm tắt điều kiện · Nghe · Hỏi hỗ trợ · Chưa đồng ý |
| `quyen` | Quyền và trách nhiệm | Đơn | Có | Các ý chính bằng câu ngắn |
| `ban-day-du` | Bản đầy đủ | Đơn | Có | Toàn văn · Nghe cả bản · Công tắc đã nghe hết · Người làm chứng |
| `ky-otp` | Xác nhận ký | Đơn | Có | Mã OTP · Gọi đọc mã |
| `ky-xong` | Hoàn tất ký | Đơn | Sửa | Xác nhận · Bước tiếp: chờ bên mua đặt cọc |
| `ky-giay` | Ký giấy | Đơn | Có | Tải bản in · Chụp từng trang đã ký |
| `so-ban` | Các bản | Đơn | Có | Lịch sử các bản thỏa thuận · Đề nghị sửa |
| `coc` | Tiền cọc | Đơn | Sửa | Cọc đã vào tài khoản đảm bảo (do ngân hàng xác nhận) · Không còn tự bấm "đã nhận" |
| `mo-lien-lac` | Đã mở liên lạc | Đơn | Mới | Tên người liên hệ · Số điện thoại · Địa chỉ giao hàng của hai bên · Gọi · Lưu danh bạ |
| `ket-qua` | Kết quả cân | Đơn | Sửa | Số bên mua nhập · Ảnh phiếu cân · Đúng / Không đúng · Chụp số trên cân |
| `giao-mot-phan` | Giao đợt sau | Đơn | Có | Phần đã giao · Phần còn lại · Đề nghị giao bù hoặc bớt |
| `doi-lich` | Xin đổi lịch | Đơn | Có | Ngày mới · Lý do · Ảnh |
| `yeu-cau-thay-doi` | Xin thay đổi | Đơn | Có | Đổi lượng · Giá · Ngày · Tạo bản thỏa thuận mới |
| `huy-don` | Xin hủy đơn | Đơn | Sửa | Lý do · Bằng chứng · Cọc sẽ xử lý thế nào theo thỏa thuận |
| `tranh-chap` | Đối soát | Đơn | Có | Phần đang lệch · Chứng từ hai bên · Người phụ trách · Đề nghị |

## Tiền

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `tien` | Tiền hàng | Tiền | Sửa | Tiền đang giữ ở tài khoản đảm bảo · Tiền đã về · Tiền chờ · Từng khoản gắn với đơn |
| `tien-ve` | Tiền đã về | Tiền | Mới | Số tiền · Đơn · Tài khoản nhận · Thời gian · Màn ăn mừng |
| `quyet-toan` | Quyết toán | Tiền | Có | Bảng tính: lượng × giá − phí · Nghe bảng tính |
| `lich-su-tien` | Lịch sử tiền | Tiền | Có | Mọi khoản theo tháng · Lọc theo đơn |
| `ung-tien` | Nhận tiền trước | Tiền | Mới | Đơn đủ điều kiện · Số được ứng · Phí · Ngân hàng đối tác · Đồng ý |

## Tôi

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `toi` | Tôi | Tôi | Có | Hồ sơ · Uy tín · Các mục cài đặt · Đăng xuất |
| `uy-tin` | Uy tín của tôi | Tôi | Mới | Bậc uy tín · Giao đủ · Đúng hẹn · Nhận xét từ bên mua · Cách lên bậc |
| `dich-vu` | Kiểm nghiệm, xe, kho | Tôi | Có | Dịch vụ đối tác |
| `dat-dich-vu` | Đặt dịch vụ | Tôi | Có | Chọn ngày · Báo giá · Đặt |
| `cai-dat` | Cài đặt | Tôi | Có | Cỡ chữ · Tốc độ đọc · Âm thanh · Rung · Ngôn ngữ |
| `ho-tro` | Trung tâm hỗ trợ | Tôi | Có | Câu hỏi thường gặp · Hướng dẫn từng bước · Tạo yêu cầu |
| `can-ho-tro` | Cần hỗ trợ | Tôi | Có | Mô tả · Ảnh · Gửi |
| `trang-thai` | Lỗi mẫu | Tôi | Có | Màn mẫu cho các trạng thái lỗi (mất mạng · Ảnh mờ…) |
| `nguoi-giup` | Người giúp | Tôi | Có | Con cháu được dùng chung tài khoản · Quyền từng người |
| `tai-khoan-nhan` | Tài khoản nhận tiền | Tôi | Có | Tài khoản ngân hàng · Đổi tài khoản (có xác minh) |
| `bao-mat` | Bảo mật | Tôi | Có | Thiết bị đang đăng nhập · Báo mất máy |
| `rieng-tu` | Quyền riêng tư | Tôi | Sửa | Cho bên mua xem gì trước khi đặt cọc · Xem gì sau |
| `phan-cua-toi` | Phần hàng của tôi | Tôi | Có | Dành cho hộ trong lô gộp: phần đã giao · Tiền đã chia |

## Công cụ mô phỏng

| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `phong-thu` | Phòng thử | Công cụ mô phỏng | Mới | Danh sách ca kiểm thử theo nhóm · Nút chạy từng ca, chạy tất cả · Kết quả từng điểm kiểm · Xem trên app |
| `gia-lap` | Giả lập bên mua | Công cụ mô phỏng | Mới | Nạp kịch bản mẫu, xóa dữ liệu · Tua đồng hồ · Việc bên mua làm được tiếp, theo nhóm |
