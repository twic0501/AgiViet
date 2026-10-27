# 03 · Biện pháp cụ thể, kiểm chứng được, và đặt ở đâu

Bản 25/10/2026. Mỗi biện pháp: nội dung kỹ thuật, vị trí (DB / Backend / App / Vận hành / Đối tác), cách kiểm, trạng thái. "Đã có mã" = có trong `security/lib` và bài kiểm thử chạy đạt; "DB có" = lược đồ đã chốt chặn được (ca `DB-xx` chạy thật); "Đề xuất" = mới là thiết kế.

| Mã | Biện pháp | DB | Backend | App | Vận hành | Kiểm bằng | Trạng thái |
|---|---|---|---|---|---|---|---|
| B01 | Webhook HMAC-SHA256 + timestamp ±300 s + nonce + kid | UNIQUE mã sự kiện (có); CHECK applied ⇒ chữ ký đúng ở cả INSERT (D-09) | Xác minh trên raw body; thứ tự định dạng, khóa, thời gian, chữ ký, nonce | — | Xoay khóa 90 ngày | webhook.test.mjs; DB-17, DB-18 | Mã có; DB một phần |
| B02 | Tra lại API ngân hàng trước khi ghi tiền | Cột trạng thái tra lại (D-09) | matchBankCredit: lệch vào tiền treo | — | Tiền treo P2 | webhook.test.mjs; DB-44 | Mã có; DB thiếu |
| B03 | Khóa chống lặp có băm nội dung | Có (DB-07) | Trùng khóa khác thân trả 409 | UUID mỗi thao tác | — | DB-07; BE-IDEM-01 | DB có |
| B04 | Số tiền do server tính từ phiên bản hợp đồng | CHECK công thức (có) | Bỏ qua số tiền client gửi | Hiện số từ server | — | BE-TIEN-01; db/tests/050 | DB có |
| B05 | OTP gắn mục đích, người, phiên bản, băm nội dung, số tiền; 5 phút, 5 lần sai, một lần; tin nhắn nêu việc, số tiền, cảnh báo lừa đảo | Bảng thử thách OTP + FK (D-15) | otp.mjs; ngữ cảnh tính lại từ DB | Hiện lại việc và số tiền | Không hỏi OTP | otp.test.mjs; DB-37b | Mã có; DB thiếu |
| B06 | Chống quyết toán hai lần: khóa hàng đơn FOR UPDATE, quyết toán cuối duy nhất, UNIQUE lệnh theo căn cứ, ngăn cọc trong lệnh không âm; READ COMMITTED đủ khi khóa đơn trước, nếu không thì SERIALIZABLE và thử lại lỗi 40001 | Có | Khóa đơn đầu giao dịch | — | — | DB-26, DB-27; BE-TIEN-05 cần Postgres thật | DB có |
| B07 | Người giúp không có bước tiền, ký, đổi tài khoản | Có khi khai đúng vai (DB-19, 31, 31b, 36); đường vòng gán vai chủ còn mở (D-14) | Kiểm quyền theo hành động | Ẩn nút | Thu hồi nhanh | DB-34; BE-QUYEN-01/02 | Một phần |
| B08 | Phân quyền theo vai + RLS theo tổ chức | Vai NOLOGIN, RLS đọc (có); hàm lệnh ghi (D-01) | Kiểm user, org, vai, hành động, tổ chức tài nguyên ở mọi route | — | Rà quyền mỗi quý | BE-QUYEN-04 | Một phần |
| B09 | Hai người cho tiền thủ công: lập khác duyệt, step-up 5 phút, không xung đột lợi ích, từ 100 triệu cần 2 người duyệt, duyệt đúng băm nội dung, chạy một lần, hết hạn 24 giờ; ảnh UNC không là bằng chứng | Lệnh ngân hàng thủ công cần ops.decisions (có); sổ cái chưa (D-04) | four-eyes.mjs, evidence.mjs | Trang vận hành hai cột | Quy trình | four-eyes.test.mjs; DB-05, DB-06 | Mã có; DB một phần |
| B10 | Đổi tài khoản nhận tiền: chủ, 2 yếu tố có OTP số cũ, tên khớp, chờ 24h hoặc 72h, báo kênh cũ, liên hệ dự phòng, bên mua đơn mở; đích lệnh là tài khoản trong hợp đồng; giữ lệnh từ 20 triệu khi tài khoản mới dưới 72h | Thời gian chờ, tên, quyền (có) | payout-account.mjs | Nút Không phải tôi | Gọi lại số cũ | payout-anomaly.test.mjs; DB-30, 31, 32 | Mã có; DB có |
| B11 | Phiên và thiết bị: token 15 phút, làm mới 30 ngày có xoay; thiết bị mới chờ 72h cho thao tác tiền | last_recovery_at (có) | Đăng ký, thu hồi thiết bị | PIN hoặc sinh trắc trong app (N-03) | Quy trình khôi phục SIM | Checklist | Đề xuất |
| B12 | Nhật ký kiểm toán bất biến | Append-only (có); vai ứng dụng không sở hữu bảng | Ghi mọi thao tác nhạy cảm | — | Xuất ngày sang kho WORM, chuỗi băm theo ngày | Kiểm chuỗi băm | Một phần |
| B13 | VietQR dựng ở server từ lệnh chụp; soát QR so lệnh; hiện tên chủ và 4 số cuối | — | vietqr.mjs | Hiện tên, 4 số cuối, số tiền | — | vietqr.test.mjs | Mã có |
| B14 | QR AgiViet ký Ed25519, chuẩn tắc, có loại, aud, exp, jti; QR nhận hàng dùng một lần; mã 6 số chỉ kiểm ở server | core.issue_qr/scan_qr (có, định dạng khác) | qr.mjs | Xác minh offline bằng khóa công khai | — | qr.test.mjs | Mã có |
| B15 | PDF ký trên băm nội dung chuẩn tắc, băm tệp, chuỗi phiên bản, niêm phong Ed25519; bắt nối thêm sau EOF | Có | pdf-hash.mjs; trang xác minh không trả bản gốc | — | — | pdf-hash.test.mjs; DB-35, 38, 39 | Mã có; DB có |
| B16 | Giám sát R1 đến R8 | ops.anomaly_flags (có) | anomaly.mjs | — | VH-RR; báo ngân hàng đối tác | payout-anomaly.test.mjs | Mã có |
| B17 | Mã hóa PII AES-256-GCM phong bì, khóa chủ ở KMS, HMAC có khóa để tra trùng, bản che; ảnh CCCD trong kho mã hóa, đường dẫn ký 5 phút | Cột có; pii_reader + hàm đọc có audit (có) | Thư viện trung tâm, không log PII | Không lưu PII ở bộ nhớ đệm | Xoay khóa năm | Checklist | Một phần |
| B18 | Bí mật trong KMS; quét bí mật ở CI | — | Nạp khi khởi động | Chỉ khóa công khai trong app | — | CI | Đề xuất |
| B19 | Bất biến sổ cái mỗi giờ, đối soát ba chiều hằng ngày | bat-bien-so-cai.sql 21 câu | Job | — | P0 khi lệch số dư | Dữ liệu thử 21/21 đạt | Mã có |
| B20 | Giới hạn tần suất OTP, đăng nhập, mã 6 số, tải lên trang xác minh | — | rate-limit.mjs + Redis | — | Cảnh báo bơm SMS | otp.test.mjs | Mã có |
| B21 | Mô-đun mô phỏng (đồng hồ, cổng đối tác, app.test_time) không có trong production | Bỏ qua app.test_time ở production (N-07) | Cờ biên dịch, kiểm khi khởi động | Nhãn DỮ LIỆU THỬ | — | CI | Đề xuất |
| B22 | Trang vận hành qua VPN, FIDO2 bắt buộc, step-up cho tiền và PII | — | — | — | Cấp, thu hồi trong ngày | Checklist | Đề xuất |

## Theo vị trí

- **DB** chặn cả khi backend lỗi hoặc có người chạy SQL tay: bất biến tiền, append-only, máy trạng thái, công thức, đích lệnh, chờ đổi tài khoản, vai DB, RLS. Còn phải sửa theo thứ tự: D-01 (hàm lệnh ghi theo vai), D-15 (OTP), D-03, D-04, D-14, D-09, D-17/D-18.
- **Backend**: xác thực, kiểm quyền theo hành động, OTP, webhook, tra lại ngân hàng, tính tiền, khóa đơn, giới hạn tần suất, mã hóa PII, nhật ký.
- **App** không là ranh giới an toàn: hiện đúng việc và số tiền trước khi xác nhận, khóa app bằng PIN, ghim chứng chỉ, xác minh QR offline, giữ token trong Keystore hoặc Keychain, chặn chụp màn hình ở màn OTP và tài khoản.
- **Vận hành**: hai người cho tiền, gọi lại số đã xác minh, không hỏi OTP, xử lý cờ, đối soát ngày, khóa chi toàn hệ thống trong 5 phút khi số dư lệch.
- **Đối tác ngân hàng**: tài khoản ảo hoặc mã tham chiếu, webhook ký, API tra, sao kê ký, chống lặp lệnh, hoàn về nguồn, tra tên chủ tài khoản. Chưa xác nhận.
