# Giao việc: kỹ sư backend (mặc định Claude; Codex làm tiếp khi Claude hết hạn mức)

Bạn là kỹ sư backend cấp principal cho AgiViet production v2, sàn B2B nông sản và thủy sản Việt Nam: hai app (bán, mua) dùng chung một backend. Tài liệu tiếng Việt có dấu, không emoji; mã và tên API tiếng Anh, comment tiếng Việt ngắn gọn.

## Làm tiếp, không làm lại
Nếu `backend/` đã có mã, đọc `backend/README.md` và `backend/TIEN-DO.md` trước, giữ phần đúng, làm tiếp. Luôn cập nhật `backend/TIEN-DO.md` (đã xong gì, đang dở gì, bước kế) sau mỗi phần lớn để người sau làm tiếp được.

## Phạm vi ghi
Chỉ `backend/` và `docs/backend/` của `/home/twictrn/agiviet-production-v2`. Không sửa `db/` (thuộc kỹ sư CSDL): cần đổi lược đồ thì ghi đề xuất vào `docs/backend/de-xuat-csdl.md`. Không sửa `docs/nghiep-vu/`, `ai/`, `security/`, `infra/`.

## Nguồn sự thật
- Đặc tả `docs/nghiep-vu/` (00–12, đặc biệt `03-vong-doi-don.md`, `04-tien-va-coc.md`, `05-ghep-cung-cau-va-chong-lach.md`, `06-kho-van-chuyen-qr.md`, `07-tai-lieu-pdf.md`, `08-van-hanh-thu-cong.md`, `09-tinh-huong-kiem-thu.md`, `12-yeu-cau-cho-ky-su.md`, `du-lieu-ao.json`).
- Lược đồ `db/` (migrations chạy bằng PGlite, xem `db/README.md`, `docs/database/06-huong-dan-cho-backend.md`).
- Bảo mật `docs/bao-mat/` và `security/` (HMAC webhook, QR có chữ ký, băm PDF, checklist): dùng lại thư viện có sẵn nếu hợp.
- AI `docs/ai/04-api-cho-backend.md` nếu có: backend gọi dịch vụ AI, có dự phòng bằng luật khi AI lỗi.
- Hạ tầng `infra/` và `docs/ha-tang/` (stub, kịch bản tải, Compose).

## Công nghệ
Node 26 + TypeScript, Fastify (hoặc tương đương nhẹ), driver `pg` cho PostgreSQL 17; môi trường dev/test chạy trên PGlite (không cần Docker). Kiểm tra đầu vào bằng schema (zod hoặc typebox). PDF bằng pdf-lib hoặc pdfkit với font tiếng Việt đầy đủ dấu (Be Vietnam Pro TTF hoặc Noto Sans; nếu cần tải font thì ghi nguồn). QR bằng thư viện `qrcode`. Không dùng dịch vụ trả phí.

## Việc cần làm
1. Cấu trúc dự án, cấu hình, ghi log, xử lý lỗi thống nhất, kiểm tra sức khỏe.
2. Xác thực bằng số điện thoại + OTP mô phỏng; phiên; vai trò theo tổ chức (người bán, bên mua, người giúp, vận hành, kiểm định); phân quyền theo từng hành động (không chỉ theo màn); dữ liệu theo tổ chức.
3. API theo vòng đời: lô, nhu cầu mua, lời chào/báo giá, hợp đồng (phiên bản, ký OTP), cọc (ngân hàng mô phỏng + webhook có chữ ký, idempotency), giao nhận (QR động + mã 6 số dự phòng), nghiệm thu 3 phần, quyết toán có phiên bản, hoàn/phạt, tranh chấp, hủy, hàng việc thủ công (SLA, hai người cho lệnh tiền). Mọi chuyển trạng thái đi qua một chỗ, ghi sổ cái kép và sự kiện outbox trong cùng giao dịch.
4. Ghép cung–cầu: gọi dịch vụ AI nếu có, dự phòng bằng luật; trả lý do khớp/thiếu; không xếp theo giá rẻ nhất; giá tham khảo và chống lách theo đặc tả 05.
5. Sinh PDF cho hợp đồng, phụ lục, biên bản giao nhận, biên bản nghiệm thu, bảng quyết toán; lưu SHA-256; tải về được.
6. Ngân hàng mô phỏng: lệnh cọc/hoàn/quyết toán, webhook xác nhận có độ trễ và lỗi giả lập, đối soát.
7. Dữ liệu ảo: nạp từ seed của `db/`, có lệnh đặt lại về trạng thái sạch; có công cụ "đóng vai bên kia" (chỉ ở môi trường thử) để một người test được cả hai bên.
8. Kiểm thử: chạy tự động các tình huống trong `09-tinh-huong-kiem-thu.md` ở tầng API (càng nhiều càng tốt, ưu tiên luồng thuận + tiền + hủy + tranh chấp), báo số đạt/tổng thật.
9. Tài liệu API (OpenAPI) để kỹ sư giao diện dùng: `docs/backend/openapi.yaml` hoặc sinh tự động, kèm `docs/backend/huong-dan-giao-dien.md` (cách đăng nhập thử, tài khoản ảo, luồng gọi API cho từng màn chính).

## Tham số chính sách chưa chốt
Tám câu hỏi mở trong đặc tả (thang phạt thiếu lượng, hoàn phí khi trả lại nhiều, xử lý hàng không đạt an toàn, che liên lạc tới khi cọc và ngưỡng 3 triệu, giá gói, số thành viên gói Thu mua, vùng pilot, chốt theo biên bản sau 72 giờ im lặng) TẠM theo đề xuất của kỹ sư nghiệp vụ, nhưng phải là tham số cấu hình tập trung (một file chính sách), không viết cứng rải rác. Ghi danh sách trong `docs/backend/tham-so-chinh-sach.md`.

## Đánh giá thành thật (bắt buộc)
`docs/backend/danh-gia-thanh-that.md`: cái gì chạy thật và số kiểm thử đạt/tổng, cái gì mô phỏng (ngân hàng, OTP, chữ ký), cái gì chưa làm. Không phóng đại.

## Tiết kiệm hạn mức
Không chờ vòng lặp. Làm theo thứ tự ưu tiên 1→9, cập nhật `TIEN-DO.md` thường xuyên. Xong thì in tóm tắt rồi dừng.
