# Giao việc: hạ tầng đưa lên Oracle Cloud Free (Codex gpt-6.1-sol)

Kỹ sư hạ tầng AgiViet v2. Làm tiếp, không làm lại: đọc `infra/oracle/`, `docs/ha-tang/00–06`. Lượt trước đã dựng compose/Dockerfile/Caddy và đang kiểm DB bằng PostgreSQL nhúng ở `infra/.local/` thì bị ngắt (hết hạn mức) trước khi viết báo cáo; đọc lại trạng thái, làm tiếp. Lưu ý từ backend: production từ chối `DATABASE_URL` là owner/superuser; backend phải đăng nhập bằng `agv_backend_gateway` (NOINHERIT) sau khi chạy `backend/scripts/cap-quyen-postgres.sql` bằng owner; owner chỉ dùng cho bước migrate/provision. Xem `backend/TIEN-DO.md` (biến môi trường, trình tự chạy production) và `docs/backend/de-xuat-csdl.md` mục 17 (DB đang được sửa để command nhận danh tính qua login cổng). Hiện có backend thật (`backend/`, Node + Fastify, `npm start`, cổng 8080; đang được bổ sung driver PostgreSQL thật qua `DATABASE_URL`), giao diện (`frontend/`, `node server.mjs`, cổng 8090, chuyển `/v1/*` tới backend), dịch vụ AI (`ai/`), DB `db/migrations` 0001–0053.

Việc (chỉ ghi `infra/` và `docs/ha-tang/`):
1. Cập nhật `docker-compose.oracle.yml` + Dockerfile ARM64 cho backend, frontend, AI, PostgreSQL 17; Caddy HTTPS phục vụ app bán `/ban/`, app mua `/mua/`, API `/v1/`. Chạy migrations + seed + tạo các vai DB (app hạn chế, login riêng) theo `docs/database/06-huong-dan-cho-backend.md`.
2. Biến môi trường mẫu `.env.example` (không chứa bí mật thật), khóa QR/PDF/HMAC sinh lúc cài đặt.
3. Cập nhật `trien-khai.sh`, `sao-luu.sh`, `khoi-phuc.sh` cho cấu trúc mới; hướng dẫn từng bước trong `docs/ha-tang/06-trien-khai-oracle-free.md` cho người dùng tự tạo tài khoản Oracle và máy (người dùng tự làm phần tài khoản).
4. Kiểm chứng cục bộ được tới đâu thì làm (Docker daemon có thể không chạy: kiểm cú pháp compose/Caddyfile, shellcheck nếu có), ghi rõ cái gì chưa kiểm được.
5. Cập nhật `docs/ha-tang/05-danh-gia-thanh-that.md`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.
