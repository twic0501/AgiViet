# Giao việc: DB chạy được trên PostgreSQL thật qua login cổng (Codex gpt-6.1-sol)

Kiến trúc sư CSDL AgiViet v2. Làm tiếp: `db/` 53 migrations, 512/512 đạt; backend 55/55 trên PGlite. Đọc `docs/backend/de-xuat-csdl.md` mục 17 và `backend/scripts/cap-quyen-postgres.sql`.

Vấn đề: trên Postgres thật backend dùng một pool đăng nhập bằng `agv_backend_gateway` (NOINHERIT) rồi `SET LOCAL ROLE` sang login danh tính trong từng giao dịch. Mọi command xác định danh tính bằng `session_user` nên luôn thấy cổng → `KHONG_CO_QUYEN`. Một bước nghiệp vụ cần nhiều danh tính trong cùng giao dịch nên không tách kết nối được.

Việc:
1. Sửa `cmd.enter_actor` và mọi chỗ `pg_has_role(session_user, …)`/`session_user` dùng làm danh tính: khi `session_user` là login cổng tin cậy (ghi trong bảng cấu hình, chỉ owner sửa) thì dùng `current_user`; ngược lại giữ `session_user`. Không cho login thường tự xưng là cổng. Thêm ca tấn công: login thường SET ROLE sang danh tính khác phải bị chặn; cổng không có quyền nghiệp vụ khi chưa SET ROLE.
2. Mục đề xuất RLS cho reader (nếu backend đã ghi) — đánh giá, làm nếu an toàn, không thì ghi lý do.
3. Phiên của tổ chức chờ xác minh và người giúp: thêm đường lưu phiên bền nếu hợp lý.
4. Migration mới; kiểm thử; chạy toàn bộ PGlite, `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy) và `cd backend && npm test` (chỉ chạy, phải 55/55). Nếu máy không có Postgres thật thì ghi rõ chưa kiểm được trên Postgres, mô phỏng tối đa trên PGlite (PGlite có session_user/current_user).

Chỉ ghi `db/` và `docs/database/`. Cập nhật `06-huong-dan-cho-backend.md`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.
