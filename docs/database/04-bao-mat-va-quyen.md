# 04. Bảo mật và quyền

## Ranh giới tin cậy và vai DB

Backend web dùng login chỉ kế thừa `agiviet_app`, không dùng owner. Các vai chức năng là NOLOGIN, NOSUPERUSER, NOBYPASSRLS; DBA tạo login và cấp membership riêng. Không cấp bank/auth worker cho pool web. Owner migration vẫn có toàn quyền DDL và là trust root.

| Vai | Quyền |
|---|---|
| agiviet_app | SELECT được liệt kê qua RLS; EXECUTE cmd.sign_document, cmd.confirm_direct_payment, cmd.post_correction |
| agiviet_readonly | SELECT được liệt kê qua RLS; không command ghi |
| agiviet_bank_worker | cmd.record_bank_event và core.apply_bank_event; không INSERT bảng tiền trực tiếp |
| agiviet_auth_worker | cmd.record_otp và cmd.otp_verification; không ký/nhận tiền thay người dùng |
| agiviet_worker | Event/outbox, chỉ cập nhật các cột giao thư |
| agiviet_pii_reader | pii.read_order_contact, không SELECT bảng PII |
| owner | Migration/import/test; không dùng cho endpoint web |

PUBLIC không có EXECUTE nghiệp vụ, không CREATE public. Command SECURITY DEFINER có search_path cố định, chỉ gọi SQL có tham số. Default privileges thu hồi EXECUTE PUBLIC cho hàm mới của cùng owner; đổi owner phải kiểm lại.

`cmd.login_principals` ánh xạ **session_user PostgreSQL** sang user/org/actor, chỉ quản trị tin cậy được ghi. `cmd.enter_actor` kiểm ánh xạ còn active, user chưa disabled và membership active. `ref.ctx_user/org/actor` bỏ qua GUC tự đặt khi login thuộc app hoặc SET ROLE app. `app.actor_kind=bank` không cấp quyền ngân hàng: wrapper còn kiểm login/role membership PostgreSQL. Worker ngân hàng xóa ngữ cảnh user/org cũ trước ghi.

Ánh xạ hiện tại là một login cho một danh tính/tổ chức. Chưa có broker phiên có chữ ký cho pool chung nhiều người dùng; không thể lấy user_id từ body rồi UPDATE ánh xạ trên mỗi request. Khi chưa có broker và command đầy đủ, endpoint chưa hỗ trợ phải từ chối. Không chuyển pool sang owner để chạy SQL nội bộ.

RLS đọc giới hạn tổ chức/membership active. Hai bên xem đúng đơn, giá kín chỉ bên sở hữu; tìm nguồn chỉ trả cột an toàn. Các vai đọc thuần và PII vẫn cần broker/ngữ cảnh xác thực phù hợp; không coi việc cấp login SQL cho khách hàng là API công khai an toàn. Các bảng mới OTP/audit/việc hoàn và bảng cấp vai bật RLS, không cấp DML trực tiếp cho runtime.

## Người giúp và phân vai

Ủy quyền chỉ chứa hành động không tiền/không ký, có hạn và exclusion chống chồng. DB chặn helper mang vai có `can_sign/can_pay/can_payout_admin` cùng tổ chức ở cả hướng cấp vai và hướng cấp ủy quyền. Không được chuyển org/user của một membership đã tạo để mang vai sang người khác.

`membership_role_grants` giữ hàng cấp vai; view tự cập nhật `membership_roles` chỉ hiện vai đã tới `effective_at`. Cấp vai đặc quyền phải do owner hiện hành đúng người đang thao tác; hiệu lực sau ít nhất 24 giờ, ghi audit và outbox notify cho backup_contact. Worker giao thông báo thật chưa được nối. Seed dưới owner tạm tắt riêng trigger cấp vai/thông báo để nhập vai lịch sử, nạp ngày hiệu lực có nhãn; runtime không có ALTER TABLE.

Chữ ký kiểm `can_sign`, đúng phía và hạn mức; tiền kiểm `can_pay`; đổi tài khoản kiểm `can_payout_admin`. Điều chỉnh tiền cần `ops.decisions` trỏ đúng transaction, người lập finance và người duyệt finance/supervisor khác nhau. Lệnh ngân hàng thủ công cũng kiểm quyết định hai người. Chưa có trọn bộ command lập/duyệt quyết định vận hành cho UI.

## OTP và chữ ký

`evt.otp_challenges` lưu ID, user, purpose, binding SHA256, code_mac, hạn ≤5 phút, attempts ≤5, verified_at và used_at. App không tự tạo hay đánh dấu đã xác minh. Auth worker tin cậy kiểm HMAC/SMS tại dịch vụ, gọi record/verification; DB kiểm receipt, khóa hàng và tiêu thụ cùng transaction ký/nhận tiền. Không lưu mã OTP rõ.

Binding chữ ký là JSON scalar chuẩn tắc có khóa sắp thứ tự: purpose, user, order_code, contract_version_id (UUID document), document_sha256, amount_vnd (giá trị hợp đồng). `evt.otp_hash` khớp cách SHA256 canonical JSON của `security/lib/otp.mjs` cho các trường scalar này. Binding nhận tiền còn có payment_id, số tiền và effective_version_no; đây là mở rộng thêm phiên bản so với helper security hiện tại. Backend phải dùng đúng binding DB dựng lại. OTP đã dùng, hết hạn, chưa verified, sai người/mục đích/tiền/phiên bản hoặc quá số lần đều bị chặn.

FK chữ ký và CHECK chứng cứ xác nhận tiền là NOT VALID cho lịch sử trước nâng cấp, vẫn kiểm mọi hàng mới. Không tự hợp thức hóa chứng từ cũ bằng OTP bịa. Xác nhận đối soát thủ công có quyết định hai người dùng đường riêng; chuyển khoản vẫn cần mã ngân hàng, tiền mặt cần tài liệu biên nhận.

`quyet_dinh_van_hanh` chỉ cho TH-040b theo [03](03-trang-thai-va-su-kien.md): phụ lục giảm lượng bất khả kháng, im lặng 24 giờ, đúng chứng cứ, hai người, người duyệt ký mô phỏng AgiViet và thông báo rõ mã quyết định. Không mở quyền ký hợp đồng khác.

## Ngân hàng, hoàn tiền và sổ cái

Adapter ngân hàng kiểm chữ ký HTTP, merchant và **tra lại API** rồi mới record event với requeried_at/requery_status=confirmed/requery_evidence. DB không tự gọi mạng và không chứng minh thay worker rằng HTTP/API đã thực sự được kiểm. Webhook chữ ký sai không được INSERT/UPDATE ở trạng thái applied. Apply thiếu API receipt bị chặn ngay cả khi gọi bằng bank worker. Event đã áp dụng bất biến, gọi lại trả duplicate_ignored.

D-03 kiểm hoãn phạm vi tài khoản/đơn và external của đúng hai bên. D-07 yêu cầu tài khoản chi bằng snapshot hợp đồng hiệu lực. D-17 hoàn thừa bị giới hạn bởi excess_vnd của chính event; hoàn phí cần căn cứ Q06 đã ký/đang xử lý và đúng số được hoàn. D-18 lưu hash, ngân hàng, số che, tên người nộp; mọi lệnh hoàn gắn nguồn và đối chiếu các trường này, tổng không vượt nguồn. Chưa có bộ phát hiện đầy đủ mọi người nộp hộ/tài khoản lạ.

Tiền đến khi đơn không còn chờ cọc ghi suspense và bank_return_tasks; không kích hoạt lại đơn. Việc hoàn nguồn còn cần worker. Ngày sổ cái giới hạn ±7 ngày quanh posted_at, ngoại lệ cần quyết định hai người có allow_backdate.

## PII, audit và lưu giữ

PII phải mã hóa ở backend bằng KMS; hash điện thoại/giấy tờ nên là HMAC có khóa. Seed có nhãn TEST-NOT-ENCRYPTED và số hư cấu, không phải cấu hình production. Liên lạc mở theo cọc/giá trị/lịch sử; pii.read_order_contact kiểm quyền và ghi audit trước trả bản mã. Bộ lọc chat/OCR/relay vẫn thuộc backend.

`evt.audit_chain` nối SHA256(prev || bytes JSONB của audit chuẩn UTC), lưu cả row_json bất biến, khóa advisory để serialize chuỗi. Trigger append-only, runtime không TRUNCATE. Xuất snapshot bằng `db/tools/xuat-audit.sql`, kiểm độc lập bằng `node db/tools/kiem-tra-audit.mjs audit.jsonl [checkpoint]` rồi giữ JSONL/checkpoint trên kho WORM độc lập mỗi ngày. Công cụ kiểm phát hiện sửa bytes hoặc checkpoint khác.

**D-19 chưa đóng hoàn toàn:** chưa cấu hình kho WORM, lịch xuất, khóa ký/checkpoint độc lập hay thử khôi phục. Owner vẫn có thể tắt trigger/TRUNCATE hoặc viết lại cả log và chain; chuỗi trong cùng DB không bảo vệ khỏi owner. Không tự tuyên bố đã có WORM.

DB không tự chứng minh PDF trên storage, RFC8785 cho tài liệu đầy đủ, khóa ký số, HMAC webhook hoặc SMS thật. Cần tích hợp và kiểm chứng riêng; chưa có rotation KMS, ẩn danh, backup/PITR production.


## Kiểm soát bổ sung 0030–0032

- N-02: nhận tiền thông thường cần OTP `money_received` gắn người nhận, mã khoản, số tiền và phiên bản. Biên nhận tiền mặt phải đúng đơn/khung, có `canonical_content.payment_id/amount_vnd` khớp và chữ ký OTP của cả hai bên. Đối soát ngoại lệ có quyết định hai người vẫn phải có `bank_evidence_id` đã tra API, khớp binding khoản và tổ chức nhận; ảnh/cuộc gọi không thay thế chứng cứ đó.
- N-04/N-12: QR `receipt`, `record`, `invitation` không được phát với `single_use=false`; không đổi jti, đối tượng, hạn, số đích hoặc xóa dấu đã dùng. Lời mời kiểm hash số đã xác minh của người nhận và OTP `invitation_accept` gắn `jti/org_id/phone_hash`. Scan không OTP không nhận lời mời. Quyền tiền mới vẫn chờ 24 giờ qua `membership_role_grants`/view hiện hành.
- N-09: chính sách mới cần quyết định `policy_change`, người lập đang làm việc, người duyệt supervisor khác người lập, nội dung `detail.policy` khớp toàn bộ hàng trừ FK quyết định, hiệu lực từ ít nhất 24 giờ sau quyết định. Đơn/khung không được chọn chính sách tương lai; giới hạn lượng chỉ chọn bản đã hiệu lực. Lịch sử không được bịa quyết định duyệt.
- N-14: cột sinh `cash_warning` + `anomaly_flags.cash_ge_20m` + outbox, không đặt trần cứng. Ngưỡng áp dụng từng lần xác nhận, không cộng dồn ngày.
- N-15: chặn tổ hợp tác đứng bán nhận tiền chung trên đơn/khung, tài khoản nhận, khoản trả thẳng, khoản dịch vụ, lệnh ngân hàng và entries external dương; không cho đổi loại pháp lý để lách. HTX pháp nhân giữ quyền nhận tiền.
- D-07/D-18: ngoài kiểm đích theo hợp đồng/hoàn nguồn từ 0024–0029, lệnh từ 20 triệu tới tài khoản kích hoạt dưới 72 giờ phải gọi lại. Không rõ giờ kích hoạt cũng giữ thận trọng đối với tài khoản nhận chi. Hoàn về nguồn không gắn tài khoản đăng ký mới không bị chuyển sang tài khoản khác để né quy tắc nguồn. Chứng cứ gọi lại phải là cuộc gọi đúng task/lệnh, đúng chủ và số đã xác minh, thời lượng dương, do finance/risk thực hiện; supervisor không nhả lệnh. DB chụp và khóa giờ kích hoạt, không tin giờ do bên lập lệnh gửi lên.

Command mới cấp riêng: `cmd.scan_qr`, `cmd.confirm_payout_callback` cho app có danh tính tin cậy; `cmd.complete_bank_return` chỉ bank worker. REVOKE PUBLIC rõ ràng trên các command mới, không dựa riêng ALTER DEFAULT PRIVILEGES theo schema. Bảng callback RLS bật, runtime không được DML trực tiếp. Chứng cứ cuộc gọi/API vẫn cần adapter đáng tin cậy; DB không tự xác minh chữ ký nhà mạng/ngân hàng hay thiết bị FIDO2.
