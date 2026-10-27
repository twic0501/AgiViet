# Giao việc: sửa lược đồ theo đề xuất của backend (Codex gpt-6.1-sol)

Bạn là kiến trúc sư CSDL AgiViet production v2. Làm tiếp, không làm lại: lượt trước bị ngắt (model hết chỗ) sau khi đã viết `0033_chu_dau_tien_va_hoan_coc_chenh.sql` và `0034_lenh_danh_tinh_va_chu_ky.sql` nhưng chưa chạy lại kiểm thử; đọc hai tệp đó, chạy thử, sửa nếu lỗi (chưa có ai triển khai nên được sửa hai tệp này), rồi làm phần còn thiếu. Trước đó `db/` có 32 migrations, 285/285 đạt. Đọc `docs/backend/de-xuat-csdl.md` (đặc biệt mục 6, 9–12 và đề xuất bọc các bước điều phối thành `cmd.*` theo D-01).

Việc:
1. Mục 9: tổ chức mới đăng ký phải có cách cấp vai chủ đầu tiên an toàn (qua xác minh vận hành, hai người).
2. Mục 10: căn cứ lệnh hoàn phần cọc chênh khi ký phụ lục giảm lượng.
3. Thời gian chờ kích hoạt tài khoản nhận tiền dùng đồng hồ tua được ở môi trường thử (không ảnh hưởng production).
4. Các mục còn lại trong file, ưu tiên bọc điều phối lô/đơn/giao nhận/quyết toán/lệnh ngân hàng thành `cmd.*` SECURITY DEFINER để backend thôi chạy bằng owner.
5. Mục 6 (mâu thuẫn seed Sáu → Tư Hùng): ghi rõ phương án, không tự đổi nghĩa TH-015/051.

Migration mới, không sửa cũ; thêm kiểm thử; chạy lại toàn bộ trên PGlite và `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy). Ghi tên hàm `cmd.*` mới và cách gọi vào `docs/database/06-huong-dan-cho-backend.md`. Chỉ ghi `db/` và `docs/database/`. Không chờ vòng lặp. Xong in tóm tắt (đạt/tổng trước–sau) rồi dừng.
