# 04 · Danh sách kiểm tra cho backend và app (theo OWASP ASVS)

Bản 25/10/2026. Mức mục tiêu: **ASVS 4.0.3 mức 2** cho toàn hệ thống, **mức 3** cho các chức năng tiền (cọc, trả thẳng, lệnh ngân hàng, quyết toán, đổi tài khoản nhận tiền) và trang vận hành. Mã ASVS ghi theo chương (V1–V14) để đối chiếu; khi chuyển sang ASVS 5.0 cần ánh xạ lại mã. Cột "Kiểm bằng" trỏ tới bài kiểm thử tự động có sẵn (`security/tests/api`, bỏ qua tới khi có backend) hoặc ghi "soát tay".

Trạng thái tất cả các dòng hiện là **chưa kiểm** vì backend và app chưa có.

## 1. Backend

### Xác thực và phiên (ASVS V2, V3)

| Mã | Yêu cầu | ASVS | Kiểm bằng |
|---|---|---|---|
| BE-AUTH-01 | OTP 6 số, sinh bằng CSPRNG, lưu HMAC (không lưu mã rõ), hạn 5 phút, tối đa 5 lần sai, dùng một lần | V2.7 | `lib/otp.mjs` làm mẫu; soát tay |
| BE-AUTH-02 | Giới hạn gửi OTP theo số, người, IP, toàn hệ thống (`OTP_SEND_RULES`); trả 429 | V2.2.1, V11 | BE-OTP-01 |
| BE-AUTH-03 | Sai OTP khóa **thử thách**, không khóa tài khoản (chống khóa người khác) | V2.2 | soát tay |
| BE-AUTH-04 | Thiết bị mới hoặc khôi phục SIM ⇒ ghi `users.last_recovery_at`; 72 giờ chặn đổi tài khoản nhận tiền và xác nhận tiền trên thiết bị mới trên 20 triệu | V2.5 | soát tay |
| BE-AUTH-05 | Token truy cập ≤ 15 phút; token làm mới xoay vòng, phát hiện dùng lại thì thu hồi cả chuỗi; đăng xuất thu hồi phía server | V3.3, V3.5 | soát tay |
| BE-AUTH-06 | Trang vận hành: FIDO2/WebAuthn bắt buộc; step-up (≤ 5 phút) trước duyệt tiền, xem PII đầy đủ, mở khóa tài khoản | V2.8, V4.3 | soát tay |
| BE-AUTH-07 | OTP gửi qua cuộc gọi tự động (người đọc chậm) chỉ phát mã + câu cảnh báo; không có người gọi đọc mã | V2.7 | soát tay |

### Phân quyền (ASVS V4)

| Mã | Yêu cầu | Kiểm bằng |
|---|---|---|
| BE-QUYEN-01 | Người giúp: API trả 403 cho xác nhận tiền, ký, đổi/kích hoạt tài khoản, đồng ý hủy (không chỉ ẩn nút) | BE-QUYEN-01/02 |
| BE-QUYEN-02 | Quyền kiểm **theo hành động** từ thành viên + vai đã xác thực; không nhận vai/tổ chức/actor từ client | BE-QUYEN-03 |
| BE-QUYEN-03 | Mọi truy vấn đối tượng kiểm tổ chức của tài nguyên (chống IDOR); 404 thay vì 403 khi không thuộc | BE-QUYEN-04 |
| BE-QUYEN-04 | Backend kết nối DB bằng vai có hàm lệnh hẹp, **không** bằng owner migration (xem `06` D-01); đặt `app.*` bằng `set_config(..., true)` trong từng giao dịch từ phiên đã xác thực | soát tay + `pg_roles` |
| BE-QUYEN-05 | Duyệt nội bộ bên mua: người duyệt khác người lập, có hạn mức | soát tay |

### Tiền (ASVS V11 logic nghiệp vụ, V1.11)

| Mã | Yêu cầu | Kiểm bằng |
|---|---|---|
| BE-TIEN-01 | Không nhận số tiền cọc/phí/quyết toán từ client; tính từ phiên bản hợp đồng | BE-TIEN-01 |
| BE-TIEN-02 | Báo "đã chuyển" kèm ảnh UNC không đổi trạng thái tiền | BE-TIEN-02 |
| BE-TIEN-03 | Webhook: HMAC + timestamp + nonce trên raw body (`lib/webhook.mjs`), ghi nguyên văn trước khi xử lý, trả 401 khi sai, không lộ lý do chi tiết | BE-WH-01 |
| BE-TIEN-04 | Luôn **tra lại API ngân hàng** trước khi ghi tiền; lệch là tiền treo (`matchBankCredit`) | soát tay |
| BE-TIEN-05 | Quyết toán: khóa đơn `FOR UPDATE`, kiểm trạng thái sau khóa, idempotency `settle:<đơn>:<seq>`; gọi đồng thời 10 lần chỉ ra một bộ lệnh | BE-TIEN-05 |
| BE-TIEN-06 | Kết quả quyết toán khớp oracle `lib/settlement.mjs` | BE-TIEN-06 |
| BE-TIEN-07 | Xác nhận khoản trả thẳng/công nợ: người xác nhận thuộc **tổ chức nhận**, có OTP `money_received` gắn số tiền và mã khoản; chuyển khoản bắt buộc mã giao dịch | soát tay |
| BE-TIEN-08 | Lệnh ngân hàng: đích = tài khoản chụp trong phiên bản hợp đồng (chi) hoặc tài khoản nguồn (hoàn); `checkPayoutInstruction` trước khi gửi; mã lệnh là khóa chống lặp với ngân hàng | soát tay |
| BE-TIEN-09 | Mọi thao tác tiền thủ công qua `four-eyes` (lập ≠ duyệt, step-up, băm nội dung, ≥ 100 triệu hai người duyệt); bằng chứng hạng A/C, không ảnh UNC | BE-VH-01 |
| BE-TIEN-10 | "Thất bại" của lệnh chỉ là cuối khi tra lại xác nhận; lệnh thay qua hai người và tra lại lệnh cũ trước khi gửi | soát tay |
| BE-TIEN-11 | Chạy `security/sql/bat-bien-so-cai.sql` mỗi giờ; vi phạm S01–S16 là P0 | job |

### Đầu vào, đầu ra, API (ASVS V5, V13)

| Mã | Yêu cầu | Kiểm bằng |
|---|---|---|
| BE-API-01 | Mọi lệnh POST có `Idempotency-Key`; cùng khóa khác thân ⇒ 409 | BE-IDEM-01 |
| BE-API-02 | `expected_revision` cho thay đổi trạng thái; lệch ⇒ `REVISION_XUNG_DOT` | soát tay |
| BE-API-03 | Kiểm kiểu bằng lược đồ (JSON Schema); tiền là số nguyên ≤ 1e12; từ chối số thực | soát tay |
| BE-API-04 | Truy vấn tham số hóa; không ghép chuỗi SQL | SAST |
| BE-API-05 | Tải lên (ảnh, PDF so sánh): giới hạn 10 MB, kiểm loại theo nội dung, quét mã độc, xử lý PDF trong sandbox, không trả lại tệp người khác tải | soát tay |
| BE-API-06 | Trang xác minh tài liệu công khai không trả PDF gốc, không lộ SĐT/số tài khoản | BE-PDF-01 |
| BE-API-07 | Lỗi trả mã nghiệp vụ (`12` mục mã lỗi), không lộ stack/SQL | soát tay |

### Dữ liệu, mật mã, nhật ký (ASVS V6, V7, V8, V9)

| Mã | Yêu cầu |
|---|---|
| BE-PII-01 | PII mã hóa phong bì AES-256-GCM, khóa chủ ở KMS, `key_id`; tra trùng bằng HMAC có khóa |
| BE-PII-02 | Không ghi PII, token, OTP vào log; che số điện thoại, số tài khoản trong log và thông báo |
| BE-PII-03 | Đọc PII qua `pii.read_order_contact` (có audit), không SELECT bảng PII |
| BE-CRY-01 | Khóa ký QR, khóa niêm phong PDF, bí mật HMAC webhook ở KMS/HSM; có `kid`; xoay khóa có kế hoạch |
| BE-CRY-02 | TLS 1.2+ mọi kết nối; mTLS hoặc danh sách IP cho kết nối ngân hàng |
| BE-LOG-01 | Nhật ký thao tác nhạy cảm (tiền, quyền, PII, đổi tài khoản) đủ ai, khi nào, từ đâu, kết quả; xuất WORM hằng ngày có chuỗi băm |
| BE-LOG-02 | Cảnh báo: nhiều lần sai chữ ký webhook, tăng đột biến OTP, cờ R1–R8, vi phạm bất biến |

### Cấu hình, triển khai (ASVS V14)

| Mã | Yêu cầu |
|---|---|
| BE-CFG-01 | Mô-đun mô phỏng (đồng hồ thử, cổng đối tác, `app.test_time`) không có trong bản production; kiểm khi khởi động |
| BE-CFG-02 | Bí mật không trong mã/compose production; quét gitleaks trong CI |
| BE-CFG-03 | Phụ thuộc ghim phiên bản, quét lỗ hổng (npm audit/OSV) |
| BE-CFG-04 | Sao lưu + PITR có kiểm khôi phục; tách quyền KMS cho sao lưu |

## 2. App (bán, mua, hiện trường) · ASVS + MASVS

| Mã | Yêu cầu | Ghi chú |
|---|---|---|
| APP-01 | Màn xác nhận tiền/ký/đổi tài khoản hiện lại **việc + số tiền** từ server trước khi nhập OTP | chống lừa và nhầm |
| APP-02 | Khóa app bằng PIN 6 số hoặc sinh trắc, yêu cầu lại trước ký biên bản, xác nhận tiền | N-03 |
| APP-03 | Token trong Android Keystore / iOS Keychain; không lưu PII trong bộ nhớ đệm không mã hóa | MASVS-STORAGE |
| APP-04 | Ghim chứng chỉ cho API | MASVS-NETWORK |
| APP-05 | Chặn chụp màn hình ở màn OTP, tài khoản ngân hàng, CCCD (`FLAG_SECURE`) | |
| APP-06 | Xác minh QR AgiViet offline bằng khóa công khai; kiểm đúng loại QR với màn đang dùng | `lib/qr.mjs` |
| APP-07 | Màn VietQR: tên chủ tài khoản, 4 số cuối, số tiền, nội dung; cảnh báo khi tài khoản đổi trong 30 ngày; không cho chia sẻ ảnh QR cọc ra ngoài | `06` mục 7.1 |
| APP-08 | Mất mạng: cho nháp, không cho ký, xác nhận tiền, chốt số cân | `00` nguyên tắc 6 |
| APP-09 | Không ô xác nhận tiền nào chọn sẵn; nút "Không phải tôi" ở thông báo đổi tài khoản | |
| APP-10 | Thông điệp cố định ở màn đăng nhập/OTP: "AgiViet không bao giờ hỏi mã OTP" | T09 |
| APP-11 | App bên mua soát chuỗi VietQR với lệnh trước khi hiện (`checkAgainstInstruction`) | |
| APP-12 | Không nhúng bí mật; chỉ khóa công khai; làm rối mã không thay cho kiểm ở server | |
