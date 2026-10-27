# Giao việc: giao diện lượt 2 (Codex gpt-6.1-sol)

Đọc lại `docs/giao-viec/frontend.md` (giữ mọi yêu cầu), rồi `frontend/TIEN-DO.md`. Làm tiếp, không làm lại. Backend đã xử lý toàn bộ `docs/frontend/de-xuat-backend.md`: sửa lỗi đăng lô, thêm thành viên/mời/đổi vai, yêu cầu hủy, danh sách tranh chấp, cờ `ky`, `GET /v1/payments/{id}/instruction` (VietQR), sổ tiền theo kỳ, so lời chào, gói, hỗ trợ, hồ sơ nguồn, thông báo, đăng ký, tài khoản nhận tiền, đề nghị sửa/phụ lục, phản đối/cân lại, giao tại kho, thiếu/vượt/giao bù. Xem `docs/backend/openapi.yaml` (114 đường dẫn) và `docs/backend/huong-dan-giao-dien.md`.

Việc:
1. Nối tất cả màn đang hiện "chưa có" với API mới; xóa ghi chú đã lỗi thời trong `docs/frontend/de-xuat-backend.md`.
2. Chạy lại `npm run test:branches` cho đạt 10/10.
3. Thêm Playwright cho các nhánh mới: hủy hai bên, tranh chấp, phụ lục, giao tại kho thiếu lượng, mời thành viên.
4. Thẻ lô bên mua cần ảnh sản phẩm (ảnh lô từ API; nếu thiếu thì ảnh minh họa theo mặt hàng, ghi rõ là minh họa).
5. Kiểm thanh tab dưới app bán ở viewport 390×844 khi cuộn (không chỉ ảnh full-page).

Tự xem ảnh, sửa lỗi. Chỉ ghi `frontend/` và `docs/frontend/`. Cập nhật `TIEN-DO.md`, `danh-gia-thanh-that.md`, báo đạt/tổng thật rồi dừng. Không chờ vòng lặp.
