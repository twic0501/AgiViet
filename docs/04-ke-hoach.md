# Kế hoạch giai đoạn

Mỗi giai đoạn có tiêu chí xong rõ ràng. Không mở giai đoạn sau khi giai đoạn trước chưa đạt tiêu chí, trừ việc thiết kế (vẽ trước được).

## Giai đoạn 0 · Nền móng (đang ở đây)

| Việc | Trạng thái |
|---|---|
| Kho mã chung, ba dự án tách rời, kiểm kiểu nghiêm | Xong |
| Tầng nghiệp vụ: bảng luật 20 bước, 13 trạng thái, cọc, phí, liên lạc, kết nối, lô | Xong, 27 test |
| App mô phỏng: 4 tầng, kho trình duyệt có kiểm phiên bản, danh mục 129 màn, hai bố cục, khung bố cục cho màn chưa làm | Xong, 8 test |
| App mô phỏng: màn nối dữ liệu đầu tiên (Hôm nay, Hàng, Đơn, Chi tiết đơn; Tổng quan, Nguồn hàng, Đơn, Chi tiết đơn) | Xong |
| Trang giới thiệu: 12 khu, tầng nội dung riêng, ô chờ chữ | Xong, 4 test |
| Tài liệu, tài liệu sinh từ code, kiểm tra tự động trên GitHub | Xong |

**Tiêu chí xong:** `npm run kiem-tra` sạch; mở được cả 129 màn không lỗi; tài liệu khớp code.

## Giai đoạn 1 · Luồng mua bán cốt lõi (87 màn)

Mục tiêu: một người bán và một bên mua chạy hết một giao dịch trên app mô phỏng, từ đăng lô tới tiền về, không cần dữ liệu mẫu.

- Bên bán: đăng ký, hồ sơ, xác minh (mô phỏng); đăng lô (chụp, nói, gõ); hàng đang bán, sửa lượng; lời mời kết nối; nhắn tin có che liên lạc; hẹn xem vườn; đơn: xác nhận, từ chối, ký, cọc, mở liên lạc, cân, hủy, đối soát; tiền.
- Bên mua: đăng ký tổ chức, chọn gói; nguồn hàng có bộ lọc; nhu cầu; tin nhắn; đơn: tạo, đặt cọc, nghiệm thu, đối soát, hủy; tài khoản đảm bảo, công nợ.
- Mẫu chia loại cho trái cây và tôm; công tắc "Hàng cho chế biến".
- Thiết kế: bộ asset trạng thái, thanh chặng, phản hồi tức thì (Rive), thay khung bố cục bằng màn thật.
- Nội dung trang giới thiệu: viết chữ cho các ô chờ; ảnh chụp từ app.

**Tiêu chí xong:** bài thử hai vai trên trình duyệt chạy hết luồng đảm bảo và luồng trả trực tiếp; mọi lời báo lỗi của nghiệp vụ hiện đúng chỗ; kiểm thử với 5 người dùng thật mỗi vai.

## Giai đoạn 2 · Quản lý (20 màn)

- Bên bán: vườn, mùa vụ, nhật ký canh tác, thu chi, nói để ghi (AI tách trường, người xác nhận), thời gian cách ly thuốc (chặn đăng bán), hồ sơ nguồn gốc.
- Bên mua: nhập kho, tồn kho, truy xuất lô, chấm điểm nhà cung cấp, ghi đơn ngoài app, bảng kê 01/TNDN, báo cáo, mối quen, kế hoạch mua.
- Mẫu chia loại cho các nhóm còn lại.

**Tiêu chí xong:** từ một dòng nhật ký phun thuốc, app chặn đăng bán lô còn trong thời gian cách ly; từ một đơn đã nhận, bên mua truy ngược tới nhật ký vườn và xuất bảng kê.

## Giai đoạn 3 · Mở rộng (22 màn) và vận hành

- Uy tín hai chiều, gói Business, dịch vụ đối tác (kiểm định, xe, kho), ứng tiền trước, lô gộp hợp tác xã, người giúp.
- Trang vận hành (dự án mới `apps/van-hanh`): duyệt xác minh, kiểm duyệt tin, cảnh báo lách liên lạc, xử lý tranh chấp, theo dõi tiền đảm bảo, cấu hình phí.

## Giai đoạn 4 · Hệ thống thật

Máy chủ dùng `@agiviet/nghiep-vu`; kho `KhoGiaoDich` gọi API; ngân hàng đối tác cho tài khoản đảm bảo; luật sư rà mô hình giữ tiền và công khai thông tin người bán; thử nghiệm ở một huyện với hai mặt hàng.
