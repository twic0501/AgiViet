<!-- Tệp sinh tự động bằng `npm run tai-lieu`. Đừng sửa tay. -->

# Danh mục màn app mô phỏng

Nguồn: `apps/app-mo-phong/src/phan-he/danh-muc-man.ts`. Màn chưa có giao diện thật hiện khung bố cục theo cột "Khu vực" khi mở trong app (`/ban/<mã>`, `/mua/<mã>`), và xem cả danh mục ở `/danh-muc`.

| | Tổng | Giai đoạn 1 | Giai đoạn 2 | Giai đoạn 3 |
|---|---|---|---|---|
| Nhà sản xuất | 80 | 58 | 10 | 12 |
| Thu mua | 49 | 29 | 10 | 10 |

Giai đoạn 1: luồng mua bán cốt lõi · 2: quản lý (vườn, kho, thuế) · 3: mở rộng (đối tác, gói, uy tín, hợp tác xã). "So với bản cũ": Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.

## App Nhà sản xuất

### Bắt đầu

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `chao-mung` | Chào mừng | 1 | Có | Logo · Khẩu hiệu · Nút Bắt đầu · Tôi đã có tài khoản |
| `dang-nhap` | Số điện thoại | 1 | Có | Ô số điện thoại · Nút Gửi mã · Trợ giúp |
| `otp` | Nhập mã | 1 | Có | 6 ô mã · Gửi lại · Gọi đọc mã cho tôi |
| `vai-tro` | Bạn bán thế nào? | 1 | Có | Chọn: hộ nhà vườn · Nuôi trồng thủy sản · Hợp tác xã · Tổ hợp tác |
| `mat-hang` | Mặt hàng | 1 | Có | Lưới ảnh mặt hàng · Chọn nhiều |
| `ho-so` | Hồ sơ | 1 | Có | Tên · Xã/huyện · Lấy vị trí đang đứng |
| `khai-bao-vuon` | Khai báo vườn | 2 | Mới | Từng vườn/ao: diện tích · Loại cây/con · Số gốc · Năm trồng · Vụ hiện tại. Bỏ qua được |
| `xac-minh` | Xác minh | 1 | Có | Chụp căn cước · Trạng thái chờ duyệt · Để sau |
| `tro-giup-truy-cap` | Trợ giúp đăng nhập | 1 | Có | Đổi số · Mất máy · Gọi tổng đài |

### Hôm nay

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `hom-nay` | Hôm nay | 1 | Mới | Thẻ "Bước tiếp theo" của từng đơn (tới lượt ai · Còn bao lâu) · Nhắc cách ly thuốc · Thời tiết 3 ngày · Số liệu tuần · Lối tắt Ghi / Đăng |
| `tong-ket-tuan` | Tổng kết tuần | 2 | Mới | Đã bán · Đã thu · Đã chi · Lời tạm tính · So tuần trước |
| `thong-bao` | Thông báo | 1 | Sửa | Danh sách thông báo chia theo 4 nhóm trạng thái (chuyển từ Tôi sang) |

### Vườn

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `vuon` | Vườn của tôi | 2 | Mới | Danh sách vườn/ao · Vụ đang chạy · Vòng hồ sơ vườn % · Nút Ghi |
| `mua-vu` | Mùa vụ | 2 | Mới | Dòng thời gian một vụ (ra hoa → đậu trái → thu hoạch → bán) · Sản lượng ước · Ngày hái dự kiến · Nút Đăng bán từ vụ này |
| `nhat-ky` | Nhật ký canh tác | 2 | Mới | Dòng theo ngày: phun thuốc · Bón phân · Tưới · Thu hoạch · Lọc theo vườn · Ảnh đính kèm |
| `thu-chi` | Thu chi | 2 | Mới | Sổ thu chi theo vụ · Tổng thu · Tổng chi · Lời lỗ · Tiền bán qua app tự vào |
| `ghi` | Nói để ghi | 2 | Mới | Nút mic lớn · Chữ hiện dần khi nói · Có thể gõ hoặc chụp hóa đơn |
| `xac-nhan-ghi` | Kiểm tra dòng vừa ghi | 2 | Mới | AI tách thành trường (ngày · Việc · Thuốc/phân · Lượng · Tiền) · Sửa từng trường · Lưu |
| `cach-ly` | Thời gian cách ly | 2 | Mới | Thuốc đã phun · Ngày được hái sớm nhất · Cảnh báo nếu lô đang bán còn trong thời gian cách ly |
| `ho-so-vuon` | Hồ sơ nguồn gốc | 2 | Mới | Tóm tắt nhật ký để bên mua xem · Mã QR truy xuất · Mức đầy đủ · Chọn phần cho xem |

### Bán · Hàng

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `hang` | Hàng đang bán | 1 | Sửa | Thẻ lô có nhãn trạng thái 4 nhóm · Thanh lượng còn lại · Số khách đang hỏi · Vẫn còn hàng |
| `chi-tiet-lo` | Chi tiết lô | 1 | Sửa | Ảnh · Lượng còn bán / đã hứa / đã giao · Đơn liên quan kèm trạng thái · Hồ sơ nguồn gốc · Sửa tin · Bán bớt |
| `cap-nhat-luong` | Còn lại bao nhiêu? | 1 | Có | Báo lượng mới · Cảnh báo nếu thấp hơn lượng đã hứa |
| `sap-co-hang` | Sắp có hàng | 1 | Có | Đăng tin trước mùa: ngày hái · Lượng ước |
| `chung-tu` | Chứng từ | 3 | Có | Giấy kiểm nghiệm · Chứng nhận VietGAP · Ảnh |
| `lo-gop` | Lô gộp nhiều hộ | 3 | Có | Danh sách hộ · Phần của từng hộ · Nhắc gửi giấy · Thêm hộ |

### Bán · Đăng hàng

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `dang` | Đăng hàng | 1 | Sửa | Chụp / Nói / Tự gõ · Thêm lựa chọn "Từ mùa vụ đang có" |
| `chon-mat-hang` | Chọn mặt hàng | 1 | Có | Lưới mặt hàng |
| `chup` | Chụp ảnh hàng | 1 | Có | Khung chụp · Gợi ý góc chụp · Ảnh đã chụp |
| `nghe` | Đang nghe | 1 | Có | Sóng âm · Chữ hiện dần · Nói lại · Nói xong |
| `kiem-tra` | Kiểm tra | 1 | Sửa | Các trường AI điền sẵn để sửa · Chặn nếu còn thời gian cách ly thuốc |
| `xem-lai` | Xem lại | 1 | Sửa | Tin hoàn chỉnh như bên mua thấy (đã ẩn liên lạc) · Nghe lại tin · Đăng bán |
| `xong` | Đã đăng | 1 | Có | Xác nhận · Số bên mua phù hợp đang tìm hàng này |

### Bán · Khách

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `khach` | Khách hỏi mua | 1 | Sửa | Danh sách bên mua: tên tổ chức · Vùng · Huy hiệu đã xác minh · Điểm uy tín · Không còn hiện số điện thoại |
| `nhu-cau` | Cần mua | 1 | Có | Tin cần mua của bên mua phù hợp với hàng của mình · Chào hàng |
| `ket-noi` | Khách muốn nói chuyện | 1 | Sửa | Thông tin và uy tín bên mua · Đồng ý / Không / Báo cáo |
| `ho-so-ben-mua` | Hồ sơ bên mua | 1 | Mới | Tên tổ chức · Vùng · Năm hoạt động · Tỷ lệ trả đúng hạn · Số đơn đã làm · Nhận xét |
| `chat` | Nhắn tin | 1 | Sửa | Tin nhắn · Gọi qua app (che số) · Số điện thoại · Zalo · Link bị che kèm lời nhắc |
| `bao-gia` | Báo giá | 1 | Có | Giá theo loại · Lượng · Ngày giao · Đồng ý / Gửi giá khác |
| `hen-xem` | Hẹn xem vườn | 1 | Sửa | Ngày giờ · Địa chỉ đến cấp ấp (chưa có số nhà) · Gọi qua app |
| `bao-cao` | Báo cáo | 1 | Có | Lý do · Ảnh · Gửi |

### Đơn

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `lich` | Đơn và lịch giao | 1 | Sửa | Đơn chia theo 4 nhóm (Bạn cần làm · Chờ bên kia · Có vấn đề · Đã xong) + lịch giao theo ngày |
| `chi-tiet-don` | Chi tiết đơn | 1 | Sửa | Thanh chặng đường 6 bước · Thẻ bước tiếp theo · Lượng · Giá · Cọc · Lịch sử đơn · Các nút xin đổi/hủy/báo sai |
| `xac-nhan-don` | Đơn mới | 1 | Mới | Lượng · Giá · Bên mua · Kiểm tra lượng còn bán · Xác nhận / Từ chối (chọn lý do) |
| `so-sanh` | So sánh khách | 3 | Có | Hai hoặc ba bên mua cạnh nhau: giá · Phí · Điều kiện · Uy tín |
| `phuong-thuc` | Chọn cách giao dịch | 1 | Sửa | Thanh toán đảm bảo (mặc định) hoặc tự giao dịch · Ghi rõ phí giới thiệu · Ai trả |
| `chon-luong` | Hứa bán bao nhiêu? | 1 | Có | Lượng hứa · Cảnh báo nếu lô còn là ước tính |
| `ky` | Thỏa thuận | 1 | Có | Tóm tắt điều kiện · Nghe · Hỏi hỗ trợ · Chưa đồng ý |
| `quyen` | Quyền và trách nhiệm | 1 | Có | Các ý chính bằng câu ngắn |
| `ban-day-du` | Bản đầy đủ | 1 | Có | Toàn văn · Nghe cả bản · Công tắc đã nghe hết · Người làm chứng |
| `ky-otp` | Xác nhận ký | 1 | Có | Mã OTP · Gọi đọc mã |
| `ky-xong` | Hoàn tất ký | 1 | Sửa | Xác nhận · Bước tiếp: chờ bên mua đặt cọc |
| `ky-giay` | Ký giấy | 3 | Có | Tải bản in · Chụp từng trang đã ký |
| `so-ban` | Các bản | 3 | Có | Lịch sử các bản thỏa thuận · Đề nghị sửa |
| `coc` | Tiền cọc | 1 | Sửa | Cọc đã vào tài khoản đảm bảo (do ngân hàng xác nhận) · Không còn tự bấm "đã nhận" |
| `mo-lien-lac` | Đã mở liên lạc | 1 | Mới | Tên người liên hệ · Số điện thoại · Địa chỉ giao hàng của hai bên · Gọi · Lưu danh bạ |
| `ket-qua` | Kết quả cân | 1 | Sửa | Số bên mua nhập · Ảnh phiếu cân · Đúng / Không đúng · Chụp số trên cân |
| `giao-mot-phan` | Giao đợt sau | 1 | Có | Phần đã giao · Phần còn lại · Đề nghị giao bù hoặc bớt |
| `doi-lich` | Xin đổi lịch | 1 | Có | Ngày mới · Lý do · Ảnh |
| `yeu-cau-thay-doi` | Xin thay đổi | 1 | Có | Đổi lượng · Giá · Ngày · Tạo bản thỏa thuận mới |
| `huy-don` | Xin hủy đơn | 1 | Sửa | Lý do · Bằng chứng · Cọc sẽ xử lý thế nào theo thỏa thuận |
| `tranh-chap` | Đối soát | 1 | Có | Phần đang lệch · Chứng từ hai bên · Người phụ trách · Đề nghị |

### Tiền

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `tien` | Tiền hàng | 1 | Sửa | Tiền đang giữ ở tài khoản đảm bảo · Tiền đã về · Tiền chờ · Từng khoản gắn với đơn |
| `tien-ve` | Tiền đã về | 1 | Mới | Số tiền · Đơn · Tài khoản nhận · Thời gian · Màn ăn mừng |
| `quyet-toan` | Quyết toán | 1 | Có | Bảng tính: lượng × giá − phí · Nghe bảng tính |
| `lich-su-tien` | Lịch sử tiền | 1 | Có | Mọi khoản theo tháng · Lọc theo đơn |
| `ung-tien` | Nhận tiền trước | 3 | Mới | Đơn đủ điều kiện · Số được ứng · Phí · Ngân hàng đối tác · Đồng ý |

### Tôi

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `toi` | Tôi | 1 | Có | Hồ sơ · Uy tín · Các mục cài đặt · Đăng xuất |
| `uy-tin` | Uy tín của tôi | 3 | Mới | Bậc uy tín · Giao đủ · Đúng hẹn · Nhận xét từ bên mua · Cách lên bậc |
| `dich-vu` | Kiểm nghiệm, xe, kho | 3 | Có | Dịch vụ đối tác |
| `dat-dich-vu` | Đặt dịch vụ | 3 | Có | Chọn ngày · Báo giá · Đặt |
| `cai-dat` | Cài đặt | 1 | Có | Cỡ chữ · Tốc độ đọc · Âm thanh · Rung · Ngôn ngữ |
| `ho-tro` | Trung tâm hỗ trợ | 1 | Có | Câu hỏi thường gặp · Hướng dẫn từng bước · Tạo yêu cầu |
| `can-ho-tro` | Cần hỗ trợ | 1 | Có | Mô tả · Ảnh · Gửi |
| `trang-thai` | Lỗi mẫu | 3 | Có | Màn mẫu cho các trạng thái lỗi (mất mạng · Ảnh mờ…) |
| `nguoi-giup` | Người giúp | 3 | Có | Con cháu được dùng chung tài khoản · Quyền từng người |
| `tai-khoan-nhan` | Tài khoản nhận tiền | 1 | Có | Tài khoản ngân hàng · Đổi tài khoản (có xác minh) |
| `bao-mat` | Bảo mật | 1 | Có | Thiết bị đang đăng nhập · Báo mất máy |
| `rieng-tu` | Quyền riêng tư | 1 | Sửa | Cho bên mua xem gì trước khi đặt cọc · Xem gì sau |
| `phan-cua-toi` | Phần hàng của tôi | 3 | Có | Dành cho hộ trong lô gộp: phần đã giao · Tiền đã chia |

## App Thu mua

### Vào app

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `dang-nhap` | Đăng nhập | 1 | Có | Số điện thoại hoặc email |
| `otp` | Mã xác minh | 1 | Có | 6 ô mã |
| `thong-tin-to-chuc` | Thông tin tổ chức | 1 | Sửa | Tên · Mã số thuế · Địa chỉ · Loại hình · Thêm giấy phép để xác minh |
| `chon-goi` | Chọn gói | 1 | Sửa | Miễn phí / Business theo mô hình phí mới |

### Tổng quan

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `tong-quan` | Tổng quan | 1 | Sửa | Việc cần làm chia 4 nhóm · Đơn sắp nhận · Tiền sắp trả · Nguồn gợi ý · Thiếu hàng |

### Nguồn hàng

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `nguon-hang` | Nguồn hàng | 1 | Sửa | Lưới lô: ảnh · Lượng còn bán · Vùng · Ngày hái · Uy tín người bán · Bộ lọc · Không hiện liên lạc |
| `goi-y` | Gợi ý khớp nhu cầu | 3 | Mới | AI xếp hạng lô hợp với từng nhu cầu · Lý do khớp |
| `chi-tiet-lo` | Chi tiết lô | 1 | Sửa | Ảnh · Lượng · Chất lượng · Hồ sơ nguồn gốc · Kết nối · Hỏi giá · Hẹn xem · Đặt kiểm định |
| `ho-so-ban` | Hồ sơ người bán | 1 | Sửa | Tên · Vùng · Uy tín · Nhật ký tóm tắt · Số điện thoại chỉ hiện sau khi đặt cọc |

### Nhu cầu

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `nhu-cau` | Nhu cầu mua | 1 | Có | Danh sách tin cần mua · Số báo giá đã nhận |
| `tao-nhu-cau` | Tạo nhu cầu | 1 | Có | Mặt hàng · Loại · Lượng · Khoảng ngày · Giá trần · AI điền giúp |
| `chi-tiet-nhu-cau` | Chi tiết nhu cầu | 1 | Có | Báo giá nhận được · Lô gợi ý |

### Báo giá

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `bao-gia` | Báo giá | 1 | Có | Báo giá theo nhu cầu |
| `so-bao-gia` | So báo giá | 3 | Có | Bảng so: giá · Tổng chi phí nhận hàng · Uy tín · Ngày giao |
| `gui-bao-gia` | Gửi báo giá | 1 | Có | Giá theo loại · Lượng · Điều kiện |

### Tin nhắn

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `tin-nhan` | Tin nhắn | 1 | Sửa | Hội thoại · Gọi và video qua app (che số) · Liên lạc bị che kèm lời nhắc |
| `hen-xem-vuon` | Hẹn xem vườn | 1 | Mới | Đề nghị ngày giờ · Địa chỉ cấp ấp · Trạng thái hẹn |

### Đơn

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `don-hang` | Đơn và lịch nhận | 1 | Sửa | Đơn chia 4 nhóm · Lịch tháng |
| `chi-tiet-don` | Chi tiết đơn | 1 | Sửa | Thanh chặng đường · Bước tiếp theo · Các đợt giao · Phiếu cân · Lịch sử |
| `thoa-thuan` | Lập thỏa thuận | 1 | Có | Lượng · Giá theo loại · Lịch giao · Cọc · Điều khoản mất mùa |
| `dat-coc` | Đặt cọc | 1 | Mới | Phí giới thiệu (đơn đầu) hoặc phí mối quen · Số cọc · Chuyển vào tài khoản đảm bảo · Mã chuyển khoản |
| `mo-lien-lac` | Đã mở liên lạc | 1 | Mới | Người liên hệ · Số điện thoại · Địa chỉ vườn của người bán |
| `nghiem-thu` | Nhập kết quả cân | 1 | Sửa | Lượng nhận · Lượng không nhận theo loại · Lý do |
| `doc-phieu-can` | Đọc phiếu cân | 1 | Mới | Chụp phiếu · AI điền số · So với đơn · Báo lệch |
| `doi-soat` | Đối soát | 1 | Có | Phần đang lệch · Chứng từ · Đề xuất · Trả phần không tranh chấp |
| `lich-nhan` | Lịch nhận và trả tiền | 1 | Có | Theo tháng · Xuất Excel |
| `huy-don` | Hủy đơn | 1 | Mới | Lý do · Cọc xử lý theo thỏa thuận · Chờ bên kia đồng ý |

### Tiền

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `vi-dam-bao` | Tài khoản đảm bảo | 1 | Mới | Số dư · Tiền đang giữ theo đơn · Tiền đã chuyển cho người bán · Nạp thêm |
| `cong-no` | Công nợ | 1 | Có | Theo người bán · Theo đơn · Xuất Excel |
| `ghi-thanh-toan` | Chuyển tiền đơn | 1 | Sửa | Chuyển khoản phải trả vào tài khoản đảm bảo · Duyệt chi nhiều cấp |

### Kho

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `nhap-kho` | Nhập kho | 2 | Mới | Từ đơn đã nghiệm thu · Chia theo loại · Vị trí kho |
| `ton-kho` | Tồn kho | 2 | Mới | Lượng theo mặt hàng · Loại · Ngày nhập · Hạn dùng |
| `truy-xuat` | Truy xuất lô | 2 | Mới | Lô kho → đơn → người bán → nhật ký vườn · Mã QR |

### Nhà cung cấp

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `moi-quen` | Mối quen | 2 | Sửa | Danh sách mối · Đơn gần nhất · Điểm · Phí mối quen thấp |
| `nhap-excel` | Nhập từ Excel | 2 | Có | Tải tệp · Khớp cột · Xem trước |
| `cham-diem` | Chấm điểm nhà cung cấp | 2 | Mới | Giao đủ · Đúng loại · Đúng hẹn theo từng người bán |
| `ghi-don-ngoai` | Ghi đơn ngoài app | 2 | Mới | Ghi lại đơn mua trực tiếp để công nợ · Kho · Bảng kê đủ |

### Kế hoạch

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `ke-hoach` | Kế hoạch mua | 2 | Sửa | Nhu cầu theo tháng · Đã có nguồn · Dự báo thiếu hàng |

### Thuế và báo cáo

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `bang-ke` | Bảng kê mua hàng nông sản | 2 | Mới | Bảng kê mẫu 01/TNDN tự lập từ đơn · Xuất PDF/Excel |
| `bao-cao` | Báo cáo | 2 | Mới | Khối lượng · Chi phí · Giá bình quân theo mặt hàng · Vùng · Tháng |

### Dịch vụ

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `dich-vu` | Kiểm định, xe, kho | 3 | Có | Yêu cầu đang có · Đối tác |
| `yeu-cau-dich-vu` | Yêu cầu dịch vụ | 3 | Có | Báo giá đối tác · Đặt lịch |

### Tổ chức

| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |
|---|---|---|---|---|
| `thanh-vien` | Thành viên và phân quyền | 3 | Có | Người dùng · Vai trò · Quyền duyệt chi |
| `goi-cua-toi` | Gói và thanh toán | 3 | Có | Gói hiện tại · Hóa đơn |
| `so-sanh-goi` | So sánh gói | 3 | Sửa | Quyền từng gói theo mô hình phí mới · Bỏ câu "Miễn phí rẻ hơn" |
| `nang-cap` | Nâng cấp | 3 | Có | Kỳ thanh toán · Xuất hóa đơn |
| `nang-cap-xong` | Đã nâng cấp | 3 | Có | Xác nhận · Mời thành viên |
| `ho-so-to-chuc` | Hồ sơ tổ chức | 1 | Có | Thông tin doanh nghiệp · Giấy tờ xác minh |
| `uy-tin` | Uy tín của tổ chức | 3 | Mới | Tỷ lệ trả đúng hạn · Số đơn · Nhận xét của người bán |
