# Giao việc: kiến trúc sư cơ sở dữ liệu (Codex gpt-6.1-sol)

Bạn là kiến trúc sư cơ sở dữ liệu cấp principal cho AgiViet production v2: sàn B2B nông sản và thủy sản Việt Nam có cọc giữ qua ngân hàng, hợp đồng, giao nhận, nghiệm thu, quyết toán. Database là phần quan trọng nhất. Tài liệu tiếng Việt có dấu, không emoji; tên bảng/cột tiếng Anh snake_case, giải thích tiếng Việt trong COMMENT.

## Làm tiếp, không làm lại
Kỹ sư trước đã làm dở: `db/migrations/0001…0010` (thiếu 0009), `db/scripts/`, `db/tools/kiem-tra-pglite.mjs` (kiểm tra cú pháp bằng PGlite, Postgres chạy trong Node, không cần Docker), `db/tests/000_khung.sql`, `docs/database/00-nguyen-tac.md`. Đọc hết trước, giữ phần đúng, sửa phần sai, làm tiếp.

## Phạm vi ghi
Chỉ ghi vào `db/` và `docs/database/` của `/home/twictrn/agiviet-production-v2`. Không sửa thư mục khác. Không sudo.

## Nguồn sự thật
Đặc tả nghiệp vụ `docs/nghiep-vu/` (00–08, 10, `du-lieu-ao.json`; nếu có thêm 09, 11, 12 thì đọc). Lược đồ phải khớp đặc tả; chỗ đặc tả chưa có thì ghi giả định trong `docs/database/`.

## Yêu cầu
- PostgreSQL 17 là đích; `db/docker-compose.yml` cổng 55432. Kiểm chứng bằng PGlite (`npx`/npm trong `db/`, mạng được phép) nếu Docker không dùng được trong sandbox.
- Migrations SQL thuần đánh số, chạy lại được trên DB trống; seed dữ liệu ảo từ `du-lieu-ao.json`.
- Tiền bigint VND, lượng bigint gram; không float.
- Sổ cái kép cho mọi dòng tiền (cọc, phí, trả thẳng, hoàn, phạt, quyết toán, giữ hộ ngân hàng); append-only, sửa bằng bút toán đảo; số dư suy ra từ bút toán.
- Sổ lượng lô (hứa, giao, trả về, hao hụt) không âm, không vượt.
- Máy trạng thái: bảng chuyển hợp lệ + lịch sử chuyển (ai, khi nào, từ, tới, lý do), chặn chuyển sai ở DB.
- Event log / outbox; idempotency key cho thanh toán và webhook.
- Phiên bản hợp đồng/tài liệu bất biến, SHA-256 PDF, chữ ký (người, thời điểm, OTP/ký số mô phỏng, thiết bị).
- QR: token ngẫu nhiên, loại, đối tượng, hạn, đã dùng, lượt quét.
- Matching và chống lách: giá tham khảo (materialized view), điểm phù hợp, cờ bất thường, ẩn liên lạc tới khi cọc.
- Đa tổ chức, vai trò, người giúp (không ký, không nhận tiền), nhân viên vận hành/hiện trường/kiểm định với hàng đợi việc và SLA.
- Kho, điểm gom, xe, chuyến, nhiệt độ, chuyển rủi ro.
- Toàn vẹn: khóa ngoại, CHECK, UNIQUE, exclusion khi hợp; chỉ mục cho truy vấn nóng; kiểm toán; không xóa cứng dữ liệu tiền; tách dữ liệu nhạy cảm; gợi ý RLS theo tổ chức; timestamptz.
- `db/tests/`: SQL kiểm tra bất biến (tổng bút toán mỗi giao dịch = 0, lượng không âm, chuyển trạng thái sai bị chặn, idempotency chống ghi trùng…) và chạy thật.

## Sản phẩm
`docs/database/00-nguyen-tac.md` (cập nhật), `01-mo-hinh-du-lieu.md` (ER Mermaid), `02-so-cai-tien-va-luong.md`, `03-trang-thai-va-su-kien.md`, `04-bao-mat-va-quyen.md`, `05-truy-van-nong-va-chi-muc.md`, `06-huong-dan-cho-backend.md` (giao dịch, mức cô lập, khóa hàng, idempotency), `07-danh-gia-thanh-that.md`; `db/README.md`.

## Đánh giá thành thật (file 07, bắt buộc)
Đã chạy thật trên engine nào (PGlite hay Postgres thật), số bảng, kết quả kiểm tra bất biến, chỗ chưa kiểm chứng, chỗ lệch đặc tả. Không phóng đại.

## Tiết kiệm hạn mức
Không chờ vòng lặp. Xong thì in tóm tắt ngắn rồi dừng.
