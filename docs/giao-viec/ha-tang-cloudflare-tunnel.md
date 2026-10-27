# Giao việc: chạy AgiViet trên máy người dùng + Cloudflare Tunnel (Codex gpt-6.1-sol)

Kỹ sư hạ tầng AgiViet v2. Oracle Singapore chưa có slot, nên tạm chạy trên laptop của người dùng (Linux, không Docker daemon, không sudo) và đưa ra mạng qua Cloudflare Tunnel với tên miền **agiviet.id.vn**. Khi có VM Oracle thì chuyển sang bộ `infra/oracle/` (giữ nguyên, không phá).

Làm trong `infra/local-tunnel/` (mới) và `docs/ha-tang/08-chay-tam-cloudflare-tunnel.md`; không sửa `backend/`, `frontend/`, `db/`, `ai/`, `security/`.

Việc:
1. Script `khoi-dong.sh` / `dung.sh` / `trang-thai.sh`: PostgreSQL 17 nhúng sẵn ở `infra/.local` với thư mục dữ liệu BỀN (ngoài repo, ví dụ `~/.local/share/agiviet/pg`, quyền 0700), lần đầu migrate+seed bằng owner rồi `db/scripts/cap-quyen-cong.sql`; backend đăng nhập bằng `agv_backend_gateway` (không owner); frontend `node server.mjs`; AI bật nếu chạy được, có `ENABLE_AI=0`; Caddy (bản custom có rate limit ở `infra/.local` nếu có) làm cổng nội bộ 127.0.0.1 với rate limit, giới hạn body, chặn `/v1/test*` và `/v1/sim*` từ ngoài. Mọi cổng chỉ nghe 127.0.0.1. Bí mật/khóa sinh lần đầu, lưu ngoài repo (0600). Không vòng lặp chờ vô hạn: chờ sẵn sàng có giới hạn thời gian.
2. Quyết định chế độ trình diễn: người dùng cần trình diễn cho ban giám khảo (đóng vai hai bên, dữ liệu ảo, OTP thử). Đề xuất cách an toàn: hoặc giữ môi trường thử nhưng khóa giao diện bằng Basic Auth pilot và chỉ cho công cụ thử sau khóa, hoặc tách. Ghi rõ rủi ro (OTP cố định 123456 công khai = ai cũng đăng nhập được tài khoản ảo) và chọn mặc định an toàn.
3. Cloudflare Tunnel: tải `cloudflared` bản chính thức từ GitHub release của Cloudflare (ghi phiên bản, kiểm checksum) vào `infra/.local/`; mẫu `config.yml` ingress `agiviet.id.vn` (và `www`) → cổng Caddy nội bộ, còn lại 404. Các bước người dùng tự làm (đăng nhập `cloudflared tunnel login` trên trình duyệt, tạo tunnel, `route dns`) ghi rõ lệnh; script không tự đăng nhập.
4. Sao lưu: dùng lại cách dump của `infra/oracle/sao-luu.sh` cho PG cục bộ, giữ N bản, không đầy ổ.
5. Kiểm chứng cục bộ: chạy `khoi-dong.sh`, gọi qua Caddy 127.0.0.1 tới `/ban/`, `/mua/`, `/health`, một luồng API đăng nhập; `/v1/test*` bị chặn từ cổng ngoài; `dung.sh` tắt sạch (không còn tiến trình). Không chạy cloudflared thật (chưa đăng nhập). Ghi kết quả vào `docs/ha-tang/05-danh-gia-thanh-that.md` và 08.

Không chờ vòng lặp. Xong in tóm tắt (lệnh người dùng cần chạy theo thứ tự) rồi dừng.
