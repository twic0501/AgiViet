# Giao việc: triển khai lên Oracle Cloud Always Free (Codex gpt-6.1-sol)

Bạn là kỹ sư hạ tầng/SRE của AgiViet production v2. Người dùng đã chọn phương án B: Oracle Cloud Infrastructure (OCI) Always Free, vùng Singapore, chạy nguyên bộ Docker Compose. Đọc hết `infra/` và `docs/ha-tang/` (bạn đã làm trước đó), `db/README.md`. Viết tiếng Việt có dấu, không emoji.

## Làm tiếp, không làm lại
Tái dùng Compose, proxy, giám sát, sao lưu đã có; chỉ thêm phần riêng cho OCI.

## Việc cần làm
1. `docs/ha-tang/06-trien-khai-oracle-free.md`: hướng dẫn từng bước cho người không rành hạ tầng: tạo tài khoản (lưu ý cần thẻ xác minh, chọn home region Singapore vì không đổi được), tạo máy ảo Ampere A1 (ARM64) trong hạn mức Always Free (ghi rõ hạn mức theo hiểu biết của bạn và nhắc người dùng kiểm lại trang chính thức vì điều kiện có thể đã đổi), mạng VCN, mở cổng 80/443 cả ở Security List lẫn tường lửa trong máy (iptables của image Oracle Linux/Ubuntu), SSH bằng khóa, cài Docker, tên miền miễn phí hoặc rẻ, HTTPS tự động (Caddy hoặc Traefik + Let's Encrypt), biến môi trường và bí mật.
2. Cấu hình chạy được trên ARM64: kiểm mọi image trong Compose có bản arm64 (postgres:17 có); file `infra/oracle/docker-compose.oracle.yml` (override) với giới hạn bộ nhớ hợp lý cho máy 24 GB/4 OCPU dùng chung Postgres, backend, AI nhẹ, proxy, worker.
3. Script `infra/oracle/`: `cai-dat-may.sh` (cài Docker, tường lửa, swap, người dùng không phải root, tự cập nhật bảo mật), `trien-khai.sh` (kéo mã, build, migrate, khởi động, kiểm health), `sao-luu.sh` (pg_dump hằng ngày + lưu sang Object Storage Always Free hoặc nơi khác ngoài máy, giữ N bản), `khoi-phuc.sh`. Script idempotent, có `set -euo pipefail`, không ghi bí mật vào repo.
4. Rủi ro riêng của gói miễn phí và cách giảm: máy ảo bị thu hồi khi nhàn rỗi lâu (theo chính sách Oracle — ghi rõ ngưỡng theo hiểu biết và nhắc kiểm lại), hết dung lượng ARM ở vùng (lỗi "out of capacity"), không có SLA; kế hoạch dự phòng sang phương án A (Cloudflare Pages + Render/Koyeb + Neon) trong 1 giờ.
5. AI trên ARM CPU: mô hình nhỏ chạy được ở mức nào (ước lượng, ghi rõ chưa đo); mặc định giọng nói nhận trên trình duyệt, tách trường bằng luật, LLM là tùy chọn.
6. Cập nhật `infra/README.md` và `docs/ha-tang/05-danh-gia-thanh-that.md` (phần OCI: cái gì chưa thể kiểm chứng vì chưa có tài khoản thật).

## Phạm vi và tiết kiệm hạn mức
Chỉ ghi vào `infra/` và `docs/ha-tang/`. Không tạo tài khoản hay gọi API đám mây. Không chờ vòng lặp. Xong thì in tóm tắt rồi dừng.
