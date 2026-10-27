# 06 · Lỗ hổng tìm thấy trong đặc tả và lược đồ của nhóm khác (kèm đề xuất sửa)

Bản 25/10/2026, soát lần hai trên lược đồ **đã chốt** (`db/migrations` 0001–0023 lúc chạy, seed, `docs/database/00–07`) và đặc tả `docs/nghiep-vu/00–12`. Tôi không sửa file của nhóm khác; mỗi mục ghi nơi sửa đề xuất.

## 0. Bằng chứng chạy thật

`node security/tests/db/kiem-tra-db.mjs` áp nguyên migrations + seed của nhóm DB lên PGlite (PostgreSQL 17.5 WASM), dựng hai đơn thử theo đúng đường hợp lệ (ký hai bên, cọc qua sự kiện ngân hàng), rồi chạy **45 ca**: 41 thao tác nguy hiểm phải bị chặn, 4 thao tác hợp lệ phải qua. Mỗi ca chạy trong giao dịch riêng, kích hoạt ràng buộc hoãn rồi hoàn lại. Lý do chặn của từng ca được in ra (`--chi-tiet`) và đã được đọc để chắc ca bị chặn **đúng vì kiểm soát đang thử**, không vì dựng dữ liệu sai.

| Lần soát | Lược đồ | Bị chặn đúng | Lỗ hổng | Hợp lệ qua |
|---|---|---|---|---|
| Lần 1 (bản nháp 0001–0010) | 9 migration | 17/38 | 21 | 5/5 |
| Lần 2 (đã chốt) | 23 migration | **29/41** | **12** | **4/4** |

Nhóm DB đã sửa trong khoảng giữa hai lần soát: đơn không vào hiệu lực khi chưa có cọc; bên trả không tự xác nhận "đã nhận"; trạng thái "đã nhận đủ" phải có xác nhận; mã giao dịch ngân hàng duy nhất; lệnh chi/hoàn đúng tổ chức nhận và khớp quyết toán; tài khoản nhận tiền có thời gian chờ, kiểm tên, chặn người giúp và người không có quyền; chữ ký phải đúng người đang thao tác và đúng bên; khóa chống lặp sổ cái từ chối nội dung khác; quyết toán đối chiếu đầu vào với sổ cái; vai DB và RLS (đọc). Các mục cũ D-02, D-05, D-06, D-12, D-13, D-16 coi như **đã đóng** (có ca chạy chứng minh, riêng D-16 chứng minh bằng đọc trigger 0013/0021 và `db/tests/050`).

Bất biến `security/sql/bat-bien-so-cai.sql` (21 câu) chạy trên dữ liệu sau khi dựng: **21/21 đạt**.

## A. Lược đồ DB · còn mở

| Mã | Mức | Lỗ hổng | Ca | Đề xuất sửa |
|---|---|---|---|---|
| D-01 | **Cao** | Kiểm vai ở DB dựa vào `app.actor_kind`, `app.user_id` do phiên tự đặt. Phiên nào có quyền ghi đều tự khai `bank` để ghi một khoản báo có giả và kích hoạt đơn. Vai `agiviet_app` hiện **chỉ đọc**; chưa có hàm lệnh `SECURITY DEFINER` nào cho ghi, nên backend hoặc phải chạy bằng owner (vượt RLS, làm được mọi ca dưới đây), hoặc chưa ghi được | DB-13 | Lớp hàm lệnh `SECURITY DEFINER` (ví dụ `cmd.confirm_direct_payment`, `cmd.apply_bank_event`) cấp EXECUTE theo vai; chỉ vai mới `agiviet_bank_worker` gọi được `core.apply_bank_event`; trong hàm kiểm `session_user`/vai thay vì tin GUC. Không cấp owner cho backend web (đúng như `docs/database/04` đã cảnh báo) |
| D-03 | **Cao** | Giao dịch sổ cái gắn đơn A chạm được tài khoản cọc của đơn B và trả `external` cho tổ chức ngoài đơn | DB-08, DB-09 | `0007`: constraint trigger hoãn: `accounts.order_id` của mọi bút toán = `transactions.order_id`; `external` chỉ thuộc bên mua/bán của đơn. Kiểm định kỳ: S05, S06 |
| D-04 | **Cao** | `manual_adjustment` ghi được **không có người duyệt** (chỉ chặn người duyệt = người lập). Lệnh ngân hàng thủ công đã bắt `ops.decisions`, sổ cái thì chưa | DB-06 | `money_type='correction'` ⇒ `approved_by` NOT NULL và tham chiếu `ops.decisions` (lập ≠ duyệt, vai tài chính), như `guard_instruction` đã làm |
| D-07 | Trung bình | Lệnh `release_deposit_to_seller` chỉ kiểm tổ chức nhận và khớp ảnh chụp **của chính nó**; `target_bank_account_id` có thể NULL và không bắt buộc bằng tài khoản chụp trong phiên bản hợp đồng hiện hành. Đặc tả cũng mơ hồ (`03` 9.3 "chụp lúc tạo lệnh" và `03` 5.3 "chụp lúc ký"): nếu backend lấy tài khoản đang dùng lúc tạo lệnh thì kịch bản đổi tài khoản 25 giờ trước quyết toán thành công | đọc lược đồ 0013 | `03` 9.3 ghi rõ đích = tài khoản trong phiên bản hợp đồng; `guard_instruction`: lệnh chi bắt buộc `target_bank_account_id = order_versions.seller_bank_account_id` của phiên bản hiệu lực; muốn đổi thì phụ lục hai bên ký |
| D-08 | Trung bình | Tiền cọc đến **sau khi đơn đã đóng** vẫn vào `deposit_escrow` của đơn | DB-16 | `core.apply_bank_event`: đơn không ở `awaiting_deposit` ⇒ ghi `suspense` theo đơn, `apply_result='late_after_closed'`, tạo việc hoàn về nguồn |
| D-09 | **Cao** | (a) INSERT thẳng webhook `signature_valid=false` với `process_result='applied'` được (kiểm chỉ ở UPDATE); (b) `bank_events` không có dấu "đã tra lại API ngân hàng": một webhook đúng chữ ký là đủ để ghi tiền | DB-17, DB-44 | (a) CHECK cột `process_result <> 'applied' OR signature_valid`; (b) cột `requeried_at`, `requery_status` ở `core.bank_events`; `apply_bank_event` từ chối khi chưa `confirmed` |
| D-10 | Trung bình | Xác nhận "đã nhận đủ" khoản chuyển khoản **không cần mã giao dịch** ngân hàng; UNIQUE mã giao dịch chỉ có tác dụng khi có mã | DB-45 | Thêm `method` vào xác nhận; `bank_transfer` ⇒ `bank_txn_ref` NOT NULL; `cash` ⇒ có tài liệu biên nhận |
| D-11 | Thấp | `effective_at` sổ cái lùi tùy ý (về 2020) | DB-10 | CHECK cửa sổ ±7 ngày quanh `posted_at`, ngoại lệ qua quyết định vận hành |
| D-14 | **Cao** | Người đang là **người giúp** của hộ vẫn được thêm làm thành viên vai `owner` của chính hộ đó, rồi ký và nhận tiền như chủ (đường vòng K17) | DB-34, S21 | Trigger trên `membership_roles`: chặn vai `can_sign/can_pay/can_payout_admin` cho người có `delegations` còn hiệu lực trong tổ chức; người cấp phải là owner; vai tiền mới cấp có thời gian chờ 24 giờ + báo liên hệ dự phòng |
| D-15 | **Cao** | Chữ ký `method='otp'` chỉ cần `otp_challenge_id` là chuỗi bất kỳ; DB không có bảng thử thách OTP nên không chứng minh được OTP **đã xác minh** cho đúng `content_sha256` và số tiền (`docs/database/04` tự ghi nhận) | DB-37b | Bảng `evt.otp_challenges (id, user_id, purpose, binding_sha256, expires_at, attempts, verified_at)`; FK từ `signatures` và `direct_payment_confirmations`; trigger: `verified_at` có, `user_id = signer`, binding = băm(mục đích, người, content_sha256, số tiền). Cách tính binding: `security/lib/otp.mjs` |
| D-17 | Trung bình | Lệnh `refund_excess` với `basis_kind='excess'` (và `fee_refund`) **không bị kiểm căn cứ**: tạo được lệnh hoàn cho bên mua với `basis_id` bịa khi không có khoản nộp thừa | DB-46 | `guard_instruction`: `excess` ⇒ `basis_id` là sự kiện ngân hàng có phần thừa, số ≤ phần thừa; `fee_refund` ⇒ căn cứ hủy/phụ lục theo bảng hoàn phí |
| D-18 | Trung bình | Hoàn tiền **không gắn tài khoản nguồn**: `bank_events` không lưu tài khoản người nộp (băm, che, tên) nên không làm được "hoàn về nguồn", không phát hiện nộp hộ từ tài khoản lạ (chống rửa tiền) | đọc lược đồ | Thêm `payer_account_hash/masked/name` vào `core.bank_events`; lệnh `refund_*` có `target_account_hash` = tài khoản nguồn |
| D-19 | Thấp | Nhật ký append-only bằng trigger; owner vẫn tắt trigger/TRUNCATE được; chưa có chuỗi băm | đọc lược đồ | Xuất ngày sang kho WORM với chuỗi băm (`03` B12) |

## B. Đặc tả nghiệp vụ · còn mở

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| N-01 | **Cao** | `cho_coc → hieu_luc` dựa vào sự kiện ngân hàng; không bắt tra lại API trước khi ghi (đặc tả 12 có "sai thứ tự thì tra trạng thái", chưa có "luôn tra") | `03` 5.2, 9.1; `12` webhook | Luôn tra lại giao dịch theo mã ngân hàng trước khi ghi tiền (`01` mục 3.1) |
| N-02 | **Cao** | Xác nhận "đã nhận đủ" trả thẳng không yêu cầu OTP. Tại vườn, nhân viên bên mua cầm máy người bán bấm hộ | `03` 9.2 | OTP mục đích `money_received` gắn số tiền + mã khoản; mã giao dịch NH bắt buộc khi chuyển khoản |
| N-03 | **Cao** | Ký biên bản nghiệm thu "qua QR tại chỗ" coi phiên đăng nhập + quét mã là hai yếu tố; cả hai nằm trên máy người bán | `07` mục 3; `06` QR-05 | PIN app/sinh trắc ngay trước khi ký, không thì OTP |
| N-04 | Trung bình | QR `AGV1:<loai>:<ma>:<han>:<chu_ky_8_ky_tu>`: HMAC đối xứng (xác minh offline phải phát khóa bí mật xuống app), 8 ký tự yếu cho QR không hết hạn, QR nhận hàng không ghi dùng một lần | `06` mục 7 | Ed25519, payload chuẩn tắc có loại/aud/exp/jti, QR nhận hàng dùng một lần (`security/lib/qr.mjs`). Lược đồ có `core.issue_qr/scan_qr` phía server; cần thống nhất định dạng |
| N-05 | Trung bình | QR-06 "tải bản gốc để so" (`06`) mâu thuẫn `07` 6.2 "tải tệp lên để so". Nếu là tải xuống thì ai có ảnh QR cũng lấy được hợp đồng | `06` QR-06 | Trang công khai không trả bản gốc; tải lên để so có giới hạn kích thước, tần suất, xử lý trong sandbox |
| N-06 | Trung bình | Đối soát V08 chấp nhận "chụp dòng sao kê" và "gọi lại cho tôi" làm căn cứ "đã nhận" | `08` V08, 6.1 | Căn cứ chỉ là xác nhận OTP của người nhận hoặc tra soát ngân hàng; ảnh và cuộc gọi là đầu mối; chỉ gọi ra số đã xác minh |
| N-07 | Trung bình | "Đồng hồ thử" và bảng phát sự kiện đối tác; lược đồ có `app.test_time`, `app.test_receipt_token` (dùng trong `db/tests/030`). Lọt production là tua hạn "im lặng = đạt" và giả sự kiện | `08` mục 8; `12` cổng mô phỏng | Cờ biên dịch + kiểm khi khởi động; hàm DB bỏ qua `app.test_time` ở production (hoặc tách migration thử) |
| N-08 | Trung bình | Chi tạm khi tranh chấp không giữ lại phí kiểm định và phạt có thể phát sinh; khi người bán thua, phần chi quá thành nợ ngoài app. Fuzz xác nhận; ví dụ 7.12A của chính đặc tả là một ca | `04` mục 6 | Giữ thêm `min(C, phí kiểm định đã ứng + mức phạt tối đa)` |
| N-09 | Trung bình | Đổi chính sách (tỷ lệ cọc, ngưỡng, hạn) không yêu cầu hai người | `08` màn 8 | Lập + duyệt, hiệu lực sau 24 giờ |
| N-10 | Trung bình | VH-QL có gần như mọi quyền; chiếm một tài khoản là đủ cho chuỗi mở khóa tài khoản nhận tiền + duyệt chi | `08` mục 2 | Tách quyền; FIDO2 cho mọi vai vận hành |
| N-11 | Thấp | Kết quả kiểm định (quyết định phạt/hoàn) qua "cổng đối tác", chưa nói kênh có chữ ký | `03` 8, `08` | Webhook ký HMAC hoặc ký số mô phỏng + đối chiếu QR niêm phong |
| N-12 | Thấp | Lời mời QR-09 không gắn số điện thoại người được mời | `06` QR-09 | Gắn số; nhận lời mời bằng OTP đúng số |
| N-13 | Thấp | `03` 9.1 tính phí trong bất biến cọc, `04` BT-T1 không | `03`, `04` | Một công thức: nộp = C + F; BT-T1 trên C |
| N-14 | Thấp | Tiền mặt không có trần | `04` mục 1 | Cảnh báo từ 20 triệu/lần; trần theo pháp luật (luật sư) |
| N-15 | Thấp | Tổ hợp tác (không pháp nhân) nhận tiền thay hộ có thể vướng Luật TMĐT 122/2025 Điều 21 | `03` 12.5 | Luật sư xác nhận; tạm thời dùng đơn con từng hộ |
| N-16 | Thấp | Màn A1–A3 có "Gọi đọc mã cho tôi" (OTP qua cuộc gọi). Đúng cho người đọc chậm nhưng tạo thói quen "có người gọi đọc mã" mà kẻ lừa đảo lợi dụng | `12` danh sách màn | Cuộc gọi tự động chỉ phát mã + câu "AgiViet không bao giờ hỏi lại mã này"; không có người thật gọi đọc mã |

## C. Kiểm lại

```
(cd db && npm ci)          # PGlite ghim 0.3.16
node security/tests/db/kiem-tra-db.mjs --chi-tiet
```
Sửa một mục D-xx thì ca tương ứng chuyển từ "LỖ HỔNG" sang "CHẶN". Bỏ `--chi-bao-cao` để mã thoát khác 0 khi còn lỗ hổng (dùng trong CI).
