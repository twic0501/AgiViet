# Giao việc: backend chuyển hết sang cmd.* (Codex làm thay Claude khi Claude hết hạn mức)

Đọc `docs/giao-viec/backend.md` (giữ mọi yêu cầu, phạm vi ghi chỉ `backend/` và `docs/backend/`), rồi `backend/TIEN-DO.md` và `docs/backend/danh-gia-thanh-that.md`. Làm tiếp, không làm lại: hiện `npm test` đạt 52/52 tình huống, 384/384 bước, `npx tsc -p .` sạch.

Việc:
1. Đọc bảng "bước backend → hàm cmd.*" mới trong `docs/database/06-huong-dan-cho-backend.md`; chuyển mọi bước điều phối đang chạy bằng owner sang gọi `cmd.*` dưới login riêng (theo mẫu `db/dang-nhap-rieng.ts` đã có), kể cả quyết toán dùng `create_settlement` thay cho tự tính.
2. Sau khi chuyển, chặn hẳn đường owner ở chế độ thường: nhánh nào DB chưa có command thì trả lỗi rõ ràng (đúng hướng dẫn 06), chỉ giữ owner cho nạp seed/đặt lại môi trường thử.
3. Giữ API cũ không đổi ngược; cập nhật `openapi.yaml` nếu có thay đổi.
4. Chạy `npm test` và `npx tsc -p .`; mọi tình huống phải đạt. Nếu có dịch vụ AI ở `ai/` chạy được cục bộ thì chạy thêm bản có `AGV_TEST_AI_URL`.
5. Cập nhật `backend/TIEN-DO.md`, `docs/backend/danh-gia-thanh-that.md` (đếm thật số bước còn dùng owner). Không chờ vòng lặp. Xong in tóm tắt đạt/tổng rồi dừng.
