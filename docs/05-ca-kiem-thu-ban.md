<!-- Tệp sinh tự động bằng `npm run tai-lieu`. Đừng sửa tay. -->

# Ca kiểm thử app bán (giai đoạn 1)

Nguồn: `packages/may-chu/src/ca-kiem-thu.ts`. Mỗi ca dựng tình huống trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng (người bán mẫu chị Năm và 3 bên mua mẫu), rồi kiểm từng điểm. Chạy được ở hai nơi: `npm test` (Vitest) và màn **Phòng thử** trong app bán (`/phong-thu`), nơi bấm "Xem trên app" để nạp kết quả của ca và mở đúng màn.

| Mã | Nhóm | Ca | Kỳ vọng |
|---|---|---|---|
| B01 | Tài khoản | Đăng ký người bán | Số điện thoại sai bị chặn; đăng ký đúng thì có hồ sơ, chờ xác minh khi gửi căn cước. |
| B02 | Tài khoản | Tài khoản nhận tiền đúng tên | Tài khoản đứng tên người khác bị chặn; đúng tên thì lưu. |
| B03 | Tài khoản | Người giúp (con cháu) | Tối đa 3 người, khác số chủ tài khoản. |
| B04 | Tài khoản | Tài khoản bị khóa | Bị khóa thì mọi thao tác bị chặn, lời báo nêu lý do. |
| B05 | Lô hàng | Đăng lô thường | Lô hiện cho bên mua, đủ thuộc tính chia loại. |
| B06 | Lô hàng | Chặn đăng bán khi đang cách ly thuốc | Vườn vừa phun thuốc cách ly 7 ngày: đăng bán hái hôm nay bị chặn; hái sau hạn thì được. |
| B07 | Lô hàng | Lô gộp nhiều hộ | Tổng phần các hộ khác lượng lô bị chặn; đúng thì đăng được. |
| B08 | Lô hàng | Tin tự ẩn sau 14 ngày | Không xác nhận còn hàng 14 ngày thì bên mua không thấy; bấm "Vẫn còn hàng" thì hiện lại. |
| B09 | Lô hàng | Báo lượng còn lại thấp hơn đã hứa | Được ghi (mưa bão rụng trái), thỏa thuận cũ giữ nguyên, lượng còn bán về 0. |
| B10 | Khách | Trả lời lời mời kết nối | Đồng ý hoặc từ chối một lần; trả lời lần hai bị chặn. |
| B11 | Khách | Chào hàng vào tin cần mua | Người bán chọn lô chào hàng; bên mua đồng ý thì thành kết nối. |
| B12 | Khách | Che liên lạc trong tin nhắn | Trước khi cọc, số điện thoại và Zalo bị che; sau khi cọc thì hiện. |
| B13 | Khách | Báo giá thành đơn | Người bán gửi báo giá; bên mua chốt; đơn tạo theo đúng giá, lượng, ngày. |
| B14 | Khách | Hẹn xem vườn | Bên mua đề nghị giờ hẹn; người bán đồng ý; không hẹn vào quá khứ. |
| B15 | Đơn | Xác nhận đơn: giữ lượng, tính cọc và phí | 4.000 kg × 25.000 đ: cọc 10 triệu, phí giới thiệu 1 triệu, lượng bị giữ. |
| B16 | Đơn | Chặn bán lố | Hai đơn 3.000 kg cho lô 4.000 kg: xác nhận đơn thứ hai bị chặn. |
| B17 | Đơn | Bấm xác nhận hai lần | Lần hai bị chặn, lượng chỉ giữ một lần. |
| B18 | Đơn | Từ chối đơn | Đơn đóng, lượng không bị giữ, lý do lưu lại. |
| B19 | Đơn | Liên lạc mở sau khi cọc | Trước cọc không thấy số bên mua; sau cọc thấy. |
| B20 | Đơn | Quá hạn cọc | Quá 48 giờ chưa cọc: hệ thống đóng đơn, trả lượng cho lô. |
| B21 | Đơn | Hủy trước khi cọc | Người bán hủy được ngay, lượng trả về lô. |
| B22 | Đơn | Bên mua xin hủy sau khi cọc | Người bán đồng ý thì đơn hủy, cọc thuộc về người bán. |
| B23 | Đơn | Đổi lịch giao | Bên mua đề nghị dời ngày; người bán đồng ý thì ngày giao đổi. |
| B24 | Đơn | Giao một phần (giảm lượng) | Người bán đề nghị giảm 3.000 → 2.000 kg; bên mua đồng ý; 1.000 kg trả về lô. |
| B25 | Đơn | Số cân đúng: chốt, trừ cọc | Nhận 3.800/4.000 kg: tiền hàng 95 triệu, trừ cọc còn 85 triệu. |
| B26 | Đơn | Số cân sai: bên mua nhập lại | Người bán bấm "Không đúng" thì đơn quay về chờ cân. |
| B27 | Tiền | Tiền qua tài khoản đảm bảo | Bên mua chuyển đúng số; ngân hàng giải ngân; đơn đóng với đủ tiền. |
| B28 | Tiền | Trả thiếu không đóng được đơn | Bên mua báo trả một nửa: "Đã nhận đủ" bị chặn, chỉ "Nhận một phần". |
| B29 | Tiền | Chưa thấy tiền: đối soát | Mở đối soát; bên mua gửi chứng từ; người bán thấy tiền thì đóng. |
| B30 | Tiền | Tiền hàng nhỏ hơn cọc | Nhận ít hơn giá trị cọc: đơn đóng ngay, hoàn cọc dư cho bên mua. |
| B31 | Tiền | Ứng tiền trước | Tối đa 70% giá trị đơn; ngân hàng duyệt; đơn đóng thì khoản ứng được thu hồi. |
| B32 | Vườn | Nhật ký canh tác hợp lệ | Không ghi ngày tương lai; phun thuốc phải có tên thuốc và ngày cách ly. |
| B33 | Vườn | Lời lỗ vụ tính cả tiền bán qua app | Chi 3 triệu, bán qua app 25 triệu: lời 22 triệu. |
| B34 | Vườn | Chia tiền lô gộp | Tiền đơn chia theo phần từng hộ, tổng bằng đúng tiền nhận. |
| B35 | Khác | Uy tín lên "Tốt" | Ba đơn giao đủ, không hủy, được 5 sao: bậc "Tốt". |
| B36 | Khác | Đặt dịch vụ kiểm nghiệm | Gửi yêu cầu → đối tác báo giá → người bán đặt. |
| B37 | Khác | Đánh giá sau đơn | Chỉ đánh giá được khi đơn hoàn tất, mỗi đơn một lần. |
| B38 | Khác | Gửi yêu cầu hỗ trợ | Người bán gửi; vận hành trả lời; yêu cầu đóng. |
