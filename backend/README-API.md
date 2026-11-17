# API AgiViet `/v1` · Bản đồ theo luồng nghiệp vụ

Máy chủ Node/Fastify (`src/routes/v1.ts`, ~205 đường), sau cổng Go `agiviet-cong`. Frontend gọi qua cùng tên miền (`agiviet.id.vn/v1/*`, Vercel chuyển tiếp).

## Quy ước chung
- **Đăng nhập:** `Authorization: Bearer <token>` (OTP: `POST /v1/auth/otp/send` → `/verify`). Bản thử: `POST /v1/test/impersonate`, mã OTP `123456`.
- **Đọc** (`GET`): trả `{ data }`.
- **Lệnh** (`POST`): bắt buộc `idempotency_key` (8–128 ký tự) trong thân; gửi lại cùng khóa trả đúng kết quả cũ (`replayed: true`). Trả `{ id, revision, status, events[], errors[], data }`.
- **Lỗi:** HTTP 4xx/5xx với `{ errors: [{ code, message, fix }] }`; `code` ổn định (`KHONG_TIM_THAY`, `TRANG_THAI_KHONG_CHO_PHEP`, `DU_LIEU_KHONG_HOP_LE`, …), `message` tiếng Việt cho người dùng.
- **Quyền:** kiểm theo tổ chức của phiên (người bán chỉ thấy lô/đơn của mình…); tên đối tác ẩn danh (`Người bán NB-xxxx`) tới khi có hợp đồng, số điện thoại mở khi ngân hàng xác nhận cọc.
- **Real-time:** `GET /v1/events` (Server-Sent Events): `san_sang`, rồi `thay_doi { giao_dich, tin }` mỗi khi lời chào/hợp đồng/tin nhắn của tổ chức đổi; luồng tự đóng sau 4 phút, client nối lại. Dùng `fetch` để gửi được `Authorization` (xem `frontend/thiet-ke/thoi-gian-thuc.js`).

## Luồng chính
| Bước | Đường |
|---|---|
| Người bán đăng lô | `POST /v1/lots` → `/v1/lots/:id/publish`, `/price`, `/confirm-available`, `/close` |
| Người mua tìm nguồn | `GET /v1/lots`; phiếu tìm nguồn `POST /v1/sourcing/search`; phiếu gửi người bán báo giá `POST /v1/demands` → `/publish` |
| Chào giá, trả giá | `POST /v1/offers` (`direction: buyer_bid / seller_ask`) → `/:id/counter`, `/:id/accept`, `/:id/reject`, `/:id/withdraw` |
| **Điều khoản** (sau chốt giá) | ① `GET /v1/terms/framework` (khung chung) → `POST /v1/offers/:id/terms/framework-read` (mỗi bên phải đọc) ② `GET/POST /v1/offers/:id/terms` (đề xuất: ngày giao, giá xuống loại, trả tiền, xe, ghi chú, `muc_rieng[≤8]`) → `/terms/accept { phien_ban }` hoặc `/terms/reject { phien_ban, y_kien{mục: dong_y/sua/khong}, ly_do }` ③ thống nhất mới tạo được hợp đồng |
| Hợp đồng | `POST /v1/orders { offer_id, … }` (dùng đúng bản điều khoản đã thống nhất) → `GET /v1/orders/:id`, `/terms` (thẻ điều khoản, có mục riêng), `POST /v1/otp/challenges` + `/v1/orders/:id/sign` (ký OTP, đóng dấu thời gian TSA) |
| Cọc (ngân hàng giữ) | `GET /v1/orders/:id/deposit-instruction` (VietQR); bản thử `/v1/sim/bank/*`; tài khoản nhận tiền người bán chỉ hiện cho người mua sau khi hai bên ký |
| Giao nhận, nghiệm thu | `/v1/deliveries/:id/receiver`, `/trip`, `/receipt-qr`, `/ship`, `/arrival`, `/start-check`, `/acceptance`, `/acceptance/agree`, `/acceptance/dispute`, `/receive` |
| Trả tiền, quyết toán | `GET /v1/orders/:id/payments`, `/money`; `POST /v1/payments/:id/report`, `/confirm`, `/not-received` |
| Đổi, hủy, tranh chấp | `/v1/orders/:id/amendments`, `/cancellation-preview`, `/cancellation-requests`, `/disputes` |
| Tin nhắn | `GET/POST /v1/messages` (theo `offer_id` hoặc `order_id`; tự che số điện thoại/Zalo), `GET /v1/messages/summary` |
| Truy xuất | `GET /v1/verify/:code` (tài liệu + tem thời gian), `/v1/growing-areas/:ma` |

Nhóm khác: hợp đồng khung `/v1/frameworks/*`, đặt trước theo vụ `/v1/seasonal-orders/*`, thỏa thuận tìm nguồn định kỳ `/v1/sourcing-agreements/*`, tổ chức `/v1/org/*`, tài khoản nhận tiền `/v1/payout-accounts/*`, vận hành `/v1/ops/*`, trợ lý `/v1/assistant/ask`, công cụ thử `/v1/test/*` (chỉ môi trường thử).

## Kiểm thử
- `npm test`: 76 tình huống nghiệp vụ (PGlite). `npm run test:pg`: trên PostgreSQL thật.
- Trên stack đang chạy (có đối tác AI): `node test/kiem-tron-luong.mjs <url>` (chốt giá → khung chung → điều khoản riêng → hợp đồng, hai chiều), `kiem-lien-lac.mjs`, `kiem-an-danh.mjs`.
- AI đối tác: `ai/danh_gia/danh_gia_doi_tac.py` (bộ chấm luật hội thoại).
