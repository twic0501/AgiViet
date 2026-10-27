# Giao việc: đối chiếu lược đồ với đặc tả sau khi sửa N-01…N-16 (Codex gpt-6.1-sol)

Bạn là kiến trúc sư cơ sở dữ liệu AgiViet production v2. Làm tiếp, không làm lại: `db/` hiện có 29 migrations, 205/205 kiểm tra đạt. Kỹ sư nghiệp vụ vừa sửa đặc tả theo 16 mục bảo mật N-01…N-16, ghi ở mục 9 cuối `docs/nghiep-vu/00-tong-quan.md`. Đọc mục đó.

## Việc cần làm
1. Số tiền đổi do N-08 (chi tạm khi tranh chấp giữ thêm phí kiểm định bên mua đã ứng + mức phạt tối đa): 7.12/TH-029 chi tạm 9.570.000, giữ 4.230.000; 7.12A hoàn bên mua 4.230.000, không còn khoản ngoài app, người bán nhận 41.770.000; 7.12B chi thêm 2.580.000, hoàn bên mua 1.650.000; TH-031 chia 50/50 chi thêm 1.290.000, hoàn 2.940.000, không khoản ngoài app. Tìm mọi bài kiểm thử, seed, hàm tính trong `db/` còn dùng số cũ hoặc công thức cũ và sửa cho khớp.
2. Các điểm khác cần khớp ở mức DB nếu chưa có: N-01 (tiền nộp thiếu ở tiền treo theo đơn, chưa tính là đã cọc; tiền đến sau khi đơn đóng hoàn về nguồn, không mở lại đơn), N-02 (xác nhận đã nhận cần OTP `money_received` gắn số tiền và mã khoản; chuyển khoản bắt buộc mã giao dịch), N-04 (QR dùng một lần), N-09 (đổi chính sách cần hai người, hiệu lực sau 24 giờ), N-12 (lời mời gắn số điện thoại người được mời), N-13 (bất biến cọc tính trên C, phí F sổ riêng), N-14 (cờ cảnh báo tiền mặt từ 20.000.000 đ một lần, không chặn), N-15 (tổ hợp tác không nhận tiền chung), D-07/D-18 (lệnh chi cọc tới tài khoản trong phiên bản hợp đồng hiện hành; hoàn về nguồn; giữ lệnh chi tới tài khoản kích hoạt dưới 72 giờ và từ 20 triệu).
3. Migration mới (không sửa migration cũ), thêm kiểm thử, chạy lại toàn bộ trên PGlite và `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy, không sửa `security/`). Báo số đạt/tổng trước và sau.
4. Cập nhật `docs/database/` (phần liên quan và 07).

Chỉ ghi `db/` và `docs/database/`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.
