# Giao việc: giao diện lượt 3 · kiểm lại trên backend mới (Codex gpt-6.1-sol)

Đọc `docs/giao-viec/frontend.md` (giữ mọi yêu cầu), `frontend/TIEN-DO.md`. Làm tiếp, không làm lại. Backend vừa đổi: ảnh lô bên mua tải được, tạo nhu cầu trả 422 có hướng dẫn, thêm xác minh chủ tổ chức (`/v1/ops/owner-verifications`), hoàn cọc chênh ngay khi ký phụ lục, và chuyển điều phối sang `cmd.*`. Xem `docs/backend/openapi.yaml`, `docs/backend/huong-dan-giao-dien.md`.

Việc: (1) bỏ ảnh minh họa tạm nếu API ảnh lô đã trả ảnh thật; hiện lỗi 422 tạo nhu cầu đúng ô; hiện khoản hoàn cọc chênh ở màn phụ lục; (2) chạy lại unit, `test:branches`, `test:round2`, `test:e2e` trên backend hiện tại, sửa lỗi phía giao diện; lỗi phía backend thì ghi `docs/frontend/de-xuat-backend.md`; (3) tự xem ảnh. Chỉ ghi `frontend/` và `docs/frontend/`. Cập nhật `TIEN-DO.md`, `danh-gia-thanh-that.md`, báo đạt/tổng thật rồi dừng. Không chờ vòng lặp.
