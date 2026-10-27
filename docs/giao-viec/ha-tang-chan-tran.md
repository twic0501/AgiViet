# Giao việc: tên miền + chặn tràn tài nguyên và chi phí (Codex gpt-6.1-sol)

Kỹ sư hạ tầng AgiViet v2. Làm tiếp, không làm lại: đọc `infra/oracle/`, `docs/ha-tang/05`, `06`, `infra/oracle/kiem-chung.md`. Backend đạt 56/56 trên PostgreSQL 17 thật qua `agv_backend_gateway`.

Tên miền chính thức: **agiviet.id.vn** (người dùng sở hữu). Người dùng tự trỏ DNS.

Việc (chỉ `infra/` và `docs/ha-tang/`):
1. Điền tên miền vào `.env.example`/Caddyfile/tài liệu; hướng dẫn trỏ bản ghi A (và AAAA nếu có) tại nhà đăng ký tên miền .id.vn, kiểm tra DNS trước khi Caddy xin chứng chỉ (tránh bị Let's Encrypt giới hạn do thử sai nhiều lần).
2. Giới hạn tốc độ: rate limit ở Caddy (hoặc backend nếu Caddy không có module sẵn; nếu cần build Caddy có plugin thì ghi rõ) cho `/v1/auth*` (OTP) chặt, `/v1/*` vừa phải; giới hạn kích thước body/tệp tải lên ở Caddy khớp backend.
3. Canh tài nguyên trên máy: script + systemd timer (không vòng lặp chờ) kiểm ổ đĩa, RAM, kích thước volume DB/tệp tải lên, docker image/build cache cũ; vượt ngưỡng thì ghi cảnh báo và dọn phần an toàn (image cũ, cache, tệp tạm), không bao giờ tự xóa DB hay backup.
4. Giới hạn tài nguyên container (CPU/RAM) tổng nằm trong 2 OCPU/12 GB; restart policy hợp lý. THÊM hồ sơ nhỏ `OCI_SIZE=6` (1 OCPU/6 GB A1) vì vùng Singapore đang báo out of host capacity, máy nhỏ dễ có slot hơn: chọn giới hạn container, pool DB, swap phù hợp để chạy đủ backend + frontend + AI + PostgreSQL; nếu AI không vừa thì cho phép tắt AI (backend đã có dự phòng bằng luật) và ghi rõ. Hướng dẫn trong 06: tạo máy 1 OCPU/6 GB trước, sau này tăng cấu hình (resize) mà không tạo lại.

Lưu ý: lượt trước bị dừng giữa chừng theo yêu cầu người dùng; đọc lại phần đã sửa trong `infra/`, `docs/ha-tang/`, làm tiếp, không làm lại.
5. `docs/ha-tang/07-chong-tran-chi-phi.md`: vì sao Always Free không bị thu tiền, các cách vô tình phát sinh phí (nâng PAYG, tài nguyên không nhãn Always Free, volume sót, băng thông >10 TB, Object Storage), cách đặt Quota cứng + Budget alert nếu đã PAYG, danh sách kiểm hằng tháng cho người dùng (ngắn, từng bước trên Console).
6. Kiểm chứng cục bộ được gì thì làm (caddy validate, shellcheck), cập nhật `05-danh-gia-thanh-that.md`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.
