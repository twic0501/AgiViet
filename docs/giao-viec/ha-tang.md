# Giao việc: kỹ sư hạ tầng/SRE (Codex gpt-6.1-sol)

Bạn là kỹ sư hạ tầng/SRE cấp principal cho AgiViet production v2: app bán (điện thoại, mạng yếu nông thôn), app mua (máy tính, điện thoại), backend, PostgreSQL 17, dịch vụ AI, sinh PDF hợp đồng, mã QR, ngân hàng giữ cọc mô phỏng qua webhook. Viết tiếng Việt có dấu, không emoji.

## Làm tiếp, không làm lại
Một kỹ sư trước đã làm dở và bị ngắt (đang sửa ngữ nghĩa quét QR lặp lại trong stub). Đọc kỹ mọi thứ trong `infra/` (ci, giam-sat, load, proxy, scripts, stub) trước, giữ phần đúng, làm tiếp.

## Phạm vi ghi
Chỉ ghi vào `infra/` và `docs/ha-tang/` của `/home/twictrn/agiviet-production-v2`. Không sửa thư mục khác. Postgres compose của kỹ sư DB ở `db/docker-compose.yml` (cổng 55432): tái dùng/tham chiếu, không ghi đè. Không dùng sudo, không cài gói hệ thống. Docker có sẵn; nếu daemon không chạy thì ghi rõ, không cố cài. Dọn container/tiến trình bạn tự bật khi xong (trừ khi ghi rõ cần để chạy tiếp).

## Nguồn
Đặc tả `docs/nghiep-vu/` (`00-tong-quan.md`, `03-vong-doi-don.md`, `06-kho-van-chuyen-qr.md`, `du-lieu-ao.json`, và `12-yeu-cau-cho-ky-su.md` nếu có); lược đồ `db/` và `docs/database/` nếu có.

## Nhiệm vụ
1. Kiến trúc triển khai: 2–3 phương án (VPS Việt Nam + Compose; Cloud Run/Fly + Postgres quản lý; Firebase Hosting phần tĩnh), chi phí/tháng cho giai đoạn thi và giai đoạn lớn hơn, độ trễ tới người dùng VN, sao lưu, khôi phục, giám sát.
2. Môi trường cục bộ `infra/docker-compose.yml` đủ dịch vụ; backend chưa có thì dùng stub trong `infra/stub/` (ghi rõ là giả lập) mô phỏng endpoint nặng.
3. Kiểm thử chịu tải chạy thật trên máy này: mô hình tải mùa vụ cao điểm, đăng lô đồng loạt, tìm nguồn, webhook ngân hàng dồn dập, sinh PDF, quét QR giờ cao điểm; smoke/load/stress/spike/soak ngắn; đo p50/p95/p99, throughput, lỗi, tài nguyên.
4. Tối ưu lượt nặng: điểm nghẽn và biện pháp (chỉ mục, materialized view, hàng đợi PDF/AI, cache, CDN ảnh, rate limit, idempotency, PgBouncer, phân trang, PWA offline); đo trước/sau ít nhất 1–2 tối ưu.
5. Vận hành: health check, giám sát, cảnh báo, sao lưu Postgres, RPO/RTO, CI/CD tối giản.

## Sản phẩm
`docs/ha-tang/00-kien-truc-trien-khai.md`, `01-moi-truong-cuc-bo.md`, `02-kiem-thu-chiu-tai.md` (số đo thật), `03-toi-uu.md`, `04-van-hanh-giam-sat-sao-luu.md`, `05-danh-gia-thanh-that.md`; `infra/README.md`.

## Đánh giá thành thật (file 05, bắt buộc)
Số nào đo thật trên máy này, số nào ước tính; giới hạn đo trên laptop so với production; phần chưa đo vì backend chưa có; rủi ro hạ tầng lớn nhất. Không phóng đại.

## Tiết kiệm hạn mức
Không chờ vòng lặp. Thiếu tài liệu thì ghi giả định rồi làm tiếp. Xong thì in tóm tắt ngắn (phương án + chi phí, số đo chính, điểm nghẽn, việc backend cần làm, đánh giá thành thật tóm gọn) và dừng.
