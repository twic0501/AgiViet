# 06. Hướng dẫn cho backend

## Kết nối và quyền

Pool PostgreSQL thật dùng `agv_backend_gateway` (LOGIN, NOINHERIT, không superuser/BYPASSRLS/CREATEROLE/CREATEDB), rồi `SET LOCAL ROLE` trong từng transaction. Login riêng kế thừa `agiviet_app` vẫn được hỗ trợ. Migrations 0025–0057 cung cấp command SECURITY DEFINER với search_path cố định; không cấp DML bảng tiền hoặc ALL FUNCTIONS. Owner chỉ dùng migration/provision/import/test. Danh tính lấy từ `cmd.login_principals` qua `cmd.effective_login()`; không dùng SET app.user_id/actor_kind làm cơ chế xác thực.

Ví dụ driver có placeholder, mỗi request dùng login đã được ánh xạ trước bởi quản trị tin cậy:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT set_config('app.request_id', $1, true),
       set_config('app.reason', $2, true);
SELECT cmd.sign_document($3::uuid, $4, $5, $6);
-- Hoặc cmd.confirm_direct_payment(payment, amount, result, bank_ref, otp, method, receipt).
COMMIT;
```

Không SET CONSTRAINTS ALL IMMEDIATE trước khi command ghi xong các vế sổ cái; các constraint hoãn kiểm ở COMMIT. Danh sách command điều phối và cách gọi nằm ở mục “Tích hợp 0033–0037” và bảng “Bước backend → hàm cmd.* (0038–0047)” bên dưới. Endpoint ngoài phạm vi command phải từ chối; không dùng owner để lấp đường còn thiếu.

Mỗi login danh tính ánh xạ một người/tổ chức/phía. Broker là thành phần tin cậy của backend, tạo login và mapping sau xác thực; không cho request web tự cập nhật login_principals hay chọn login khác. Ứng dụng cần quản lý idempotency ở lớp command/API; không có quyền gọi tùy ý evt.claim_idempotency hoặc ghép ledger entries.

### Pool gateway từ 0054

Owner áp đủ migrations rồi chạy từ gốc repo:

```sh
psql "$DATABASE_URL_OWNER" -v ON_ERROR_STOP=1 \
  -v gateway_password="$AGV_GATEWAY_PASSWORD" -f db/scripts/cap-quyen-cong.sql
```

Đặt `DATABASE_URL` runtime thành login gateway, trỏ cùng database. Không dùng URL owner. Script mới giữ quyền reader/meta/broker/auth/bank theo hợp đồng backend, thêm SELECT `public.schema_migrations` cho kiểm tra lúc mở pool. Script `backend/scripts/cap-quyen-postgres.sql` hiện có GRANT ngược gateway cho broker, tạo vòng membership, và thiếu SELECT metadata trước SET ROLE; **dùng bản trong db/scripts ở trên**. Broker có ADMIN trên principal do chính nó tạo nên có thể `GRANT principal TO gateway` mà không cần membership ngược đó. Script provision đã chạy hai lần trên PGlite, chưa chạy trên PostgreSQL native.

`cmd.trusted_gateways(login_name,enabled,configured_at)` chỉ owner có quyền ghi; migration đăng ký sẵn tên `agv_backend_gateway`, script owner bật lại cấu hình. Không suy ra cổng từ tiền tố tên, membership, mapping principal hay custom GUC. Cổng phải giữ các thuộc tính bắt buộc; sai thuộc tính bị từ chối. Không cấp DML cấu hình cho broker, reader, app hoặc worker.

Với login thường, helper giữ `session_user`; nếu SET ROLE sang một principal khác trong mapping thì command và context đọc bị chặn `KHONG_CO_QUYEN`, kể cả membership đã được cấp nhầm. Với cổng đã đăng ký, helper lấy vai đang chọn từ **tham số hệ thống `role`** mà PostgreSQL kiểm quyền SET ROLE. Đây là vai `current_user` tại điểm gọi trước khi vào SECURITY DEFINER; bên trong hàm, `current_user` đã thành owner nên không thể dùng trực tiếp. Không lấy quyền từ `pg_has_role(session_user,...)` của gateway: MEMBER bắc cầu có thể bao gồm tất cả worker dù NOINHERIT.

Login principal được chọn phải có mapping active; command tiếp tục kiểm người dùng, tổ chức, membership/delegation, phân công và vai hệ thống như trước. Adapter auth/bank dùng vai worker đã cấp; reader/meta/broker là các vai kỹ thuật, không tự trở thành principal. Gateway chưa SET ROLE hoặc đã RESET ROLE không có quyền command, không nhận lại actor từ GUC còn sót. Gateway chỉ đọc metadata migration trước SET ROLE.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL ROLE agv_backend_read;
-- Đọc/kiểm đầu vào bằng backend đã xác thực.
SET LOCAL ROLE agv_u_0123456789abcdef; -- ví dụ; tên principal do server dựng
SELECT cmd.sign_document($1::uuid, $2, $3, $4);
SET LOCAL ROLE agv_backend_meta;
-- Ghi metadata/outbox theo quyền đã cấp; có thể tiếp tục chọn principal system.
COMMIT;
```

Tên role là identifier, không nhận từ payload client hoặc dùng placeholder giá trị SQL để thay tên role. Dùng allowlist/tên do broker dựng như backend hiện tại. Mọi bước vẫn cùng connection/transaction; COMMIT/ROLLBACK hủy SET LOCAL ROLE. PGlite trong backend vẫn đổi SESSION AUTHORIZATION như trước; bộ kiểm bổ sung trong db dùng `session_user` cố định và SET LOCAL ROLE để kiểm giao thức PostgreSQL của cổng.

### Phiên pending và người giúp từ 0055

Giữ API `record_login_session` / `lookup_session` / `revoke_session`, chữ ký tham số và cột trả về. Auth adapter vẫn ghi OTP đã kiểm, binding `{org_id,device_id,token_sha256}`, rồi command tiêu thụ OTP một lần và lưu hash token. Không nhận scope hoặc delegation từ client. `auth.sessions` bổ sung:

| session_kind | Điều kiện cấp/lookup |
|---|---|
| `member` | Người dùng không khóa, tổ chức active, membership active. |
| `pending_registration` | Đúng user/org trong registration_results, membership active, tổ chức pending hoặc active sau xác minh. Không cấp vai chủ hoặc bỏ thời gian chờ. |
| `helper` | Tổ chức active; ủy quyền đúng helper/org còn hạn, chưa thu hồi; principal không khóa, membership active và còn vai owner/coop_board. Phiên gắn cố định delegation_id. |

Lookup kiểm lại scope trên DB cùng hạn token và revoked_at; thu hồi/hết hạn delegation, khóa helper/principal hoặc mất vai chủ làm phiên helper không dùng được. Không tự chuyển phiên sang delegation mới. Phiên pending vẫn bị `enter_actor` chặn nghiệp vụ khi tổ chức chưa active; helper giữ đúng user thật, không ký thay principal. Phiên member cũ của đúng người đăng ký tại tổ chức pending được migration đổi scope, giữ ID/hash/thời hạn. Quyền sửa/đọc phiên trực tiếp không được cấp cho app.

Backend hiện đã thử lưu/khôi phục qua API này; DB không cần đổi giao thức. Tích hợp DB đã được kiểm riêng cho hai scope mới; bộ backend 55/55 hiện chưa có ca restart riêng cho pending/helper. OTP trước xác minh và giới hạn gửi OTP vẫn ở bộ nhớ theo mục 17; không bổ sung kho OTP tạm trong đợt này.

### Đánh giá reader RLS theo đề xuất 17

**Giữ BYPASSRLS của reader trong đợt này.** Backend chọn reader trước khi có principal (tìm số/phiên, chọn tổ chức, provision), đồng thời dùng reader cho truy vấn thị trường và vận hành nhiều tổ chức. Một số bảng bật RLS chưa có chính sách SELECT; `ref.ctx_*` không ánh xạ reader thành người dùng. Bỏ BYPASSRLS ngay sẽ làm nhiều truy vấn hợp lệ thành rỗng. Mở chính sách công khai trên cả hàng lots/demands lại có thể lộ giá kín, vị trí hoặc dữ liệu cùng hàng; `staff_assignments` cũng chưa xác định đầy đủ phạm vi đọc cho mọi bảng. Chỉ thêm vài policy không đủ để bảo đảm quyền đọc.

Giới hạn hiện tại: reader chỉ SELECT nhưng đọc rộng, nên backend phải tiếp tục kiểm quyền và lọc trường trả về; DB chưa cô lập từng người đọc ở vai này. Đợt riêng cần hợp đồng truy vấn/cột công khai, hàm hoặc view đọc có phạm vi cho login/phiên/vận hành, policy đủ trên bảng liên quan, và ca chặn giá kín/đọc chéo tổ chức trước khi đổi provisioning sang NOBYPASSRLS. Giữ API `mkt.search_lots` với tập cột an toàn hiện có; không mở rộng policy công khai để làm test xanh.

Kết quả, lệnh tái kiểm và giới hạn PostgreSQL native: [08-ket-qua-cong-postgres.md](08-ket-qua-cong-postgres.md).

## Mức cô lập và thứ tự khóa

- Đọc danh sách thường dùng READ COMMITTED.
- Ghi tiền/lượng có nhiều điều kiện liên bảng dùng SERIALIZABLE. Với READ COMMITTED phải rà từng khóa bảo vệ điều kiện; trigger khóa lô/khung/cọc không tự chứng minh toàn bộ workflow an toàn dưới mọi kiểu gọi.
- Khóa đối tượng chính và các lô theo thứ tự ổn định; khóa ngân hàng, khoản trực tiếp hoặc khung trước khi đọc các tổng liên quan. Những command chỉ có hold trước đơn khóa lô tương ứng.
- Không giữ khóa chờ OTP, ký trên thiết bị hay API ngân hàng. Ghi nhu cầu gửi ra outbox rồi COMMIT.
- Lỗi `40001` hoặc `40P01`: rollback và thử lại cả transaction với cùng idempotency key và thân, số lần hữu hạn, backoff ngắn. Không retry một câu SQL nằm giữa transaction đã lỗi.

PGlite một kết nối chưa kiểm chứng tranh chấp giữa hai phiên. Đừng bỏ SERIALIZABLE/retry dựa vào việc bộ test này chạy nhanh.

## Tiền và lượng ở API

Dùng bigint/string cho số nguyên qua driver và JSON. Không đổi bigint sang `Number` để làm phép nhân tiền. Hash yêu cầu tính trên nội dung chuẩn hóa, bao gồm loại command, tổ chức, đối tượng và số tiền; loại các trường transport không mang ý nghĩa nghiệp vụ.

`ledger.post` chống trùng và kiểm hash payload, khóa advisory theo key. Hàm này là nội bộ; không nhận p_lines do client tùy ý ghép. Cùng key khác thân phải trả xung đột, không âm thầm trả giao dịch cũ. Thời điểm ghi tự động không là phần hash của post; các tham số kinh tế cần đưa vào request_hash ở lớp command.

`ledger.reverse` cũ không tự tạo quyết định nên sẽ bị chặn nếu thiếu decision_id; đường đảo mới phải ghi transaction có quyết định đúng mã và các entries ngược dấu. Không sửa bản gốc. Đảo ledger của một sự kiện có bảng nghiệp vụ liên quan phải đi cùng chứng từ điều chỉnh nghiệp vụ; không đảo tiền đơn độc rồi bỏ trạng thái “đã nhận” cũ.

`ledger.move_qty` nhận gram và idempotency key ổn định; cùng key khác nội dung bị chặn. Với hold dùng UPDATE bảng hold để trigger tự chuyển lượng, không gọi chuyển lần hai. Với đợt giao dùng start_acceptance/dispatch_delivery và close_delivery/finish_warehouse_delivery để ghi cả trạng thái và chuyển lượng nguyên tử. `delivery_id` trên chuyển động nên được chèn ngay từ đầu khi ghi SQL nội bộ, không UPDATE bút toán sau đó.

## Ký, tài liệu và gọi hàng khung

1. Chuẩn hóa nội dung RFC 8785, sinh PDF từ snapshot, băm bytes thật và lưu object thành công trước khi chèn metadata. Dọn object mồ côi bằng job riêng nếu transaction DB rollback.
2. Bản v1 và phụ lục có chuỗi hash liên tục; chữ ký trỏ đúng document và content hash. Auth worker xác thực OTP challenge/HMAC, lưu receipt và command tiêu thụ; binding do DB dựng từ nội dung/tiền/phiên bản. Không lưu OTP thô.
3. Ký buyer/seller, đổi effective_version_no sau đủ chữ ký, cập nhật status tài liệu bằng actor system. Không tin `fully_signed` từ client.
4. Lần gọi khung nhiều món dùng `value_basis='lines'`, tổng dòng vào contract_value. `qty_min` là tổng gam các dòng; giá header không dùng tính tổng. Mỗi dòng ghim product/profile/grade; nghiệm thu mang order_line_no. Chèn header và tất cả dòng cùng transaction.
5. Gọi hàng không ký lại từng lần nếu kế thừa hợp đồng khung running có tài liệu hai bên đã ký. Khung nhập từ JSON chưa có chứng từ đó, không tự coi nó đã ký chỉ vì nguồn ghi đang chạy.

## Nhận cọc và trả thẳng

Nhận callback có UNIQUE provider/event_id; khi trùng đọc lại kết quả, không phát thêm event tiền mới. `cmd.record_bank_event` nhận chữ ký hợp lệ và bằng chứng đã tra lại API từ adapter; `core.apply_bank_event` chỉ cho bank worker áp callback chuẩn hóa. Thiếu API receipt không được ghi tiền. Thân HTTP gốc, cách kiểm chữ ký, mã merchant và sao kê phải được đối chiếu tại adapter; cột signature_valid không tự xác thực mật mã.

Sau ngân hàng nhận đủ, command điều phối mới cho đơn active và hold committed, mở khoản trả trước bốc, tạo hạn. Nếu thiếu C+F, toàn bộ ở `deposit_pending` theo đơn/khung, chưa là C và chưa mở liên lạc; đủ tiền mới chuyển đúng C, F và phần thừa sang ba ngăn riêng. Thừa tạo lệnh refund_excess từ excess_held. Tiền muộn sau đóng tạo task hoàn nguồn, không active lại đơn. Hoàn thừa, cọc bổ sung, hoàn chênh và hoàn phí cần command có căn cứ, không tự sửa expected_deposit_vnd.

Bên trả báo kèm chứng từ; bên nhận gọi cmd.confirm_direct_payment đúng số, có OTP đã xác minh dùng một lần. Chuyển khoản bắt buộc mã ngân hàng; tiền mặt bắt buộc receipt_document_id đúng khoản/số tiền, có chữ ký OTP cả hai bên. UI cảnh báo tiền mặt từ 20 triệu mỗi lần, vẫn cho xác nhận; DB cũng ghi cờ và outbox. Trigger ghi sổ và đồng bộ trạng thái nhận tiền. Khi confirmation bị chặn vượt số báo, tạo việc đối soát; không đổi amount_due để cho qua.

## Giao nhận và quyết toán

Backend chuẩn bị người nhận/QR/chuyến/hồ sơ, chỉ chuyển ready sau khi có dữ liệu thật. Kiểm đúng biển số, người nhận, mẫu và vị trí thuộc command, không tự suy rủi ro từ việc quét QR.

Chèn một acceptance_version và tất cả lines trong cùng transaction. Bản gửi lại là phiên bản mới, không thêm dòng vào bản đã COMMIT. Khóa order/delivery khi chọn phiên bản kế tiếp. Chỉ dòng closed vào V cuối; phần tranh chấp dùng luật V_kt cho chi tạm. Chốt tiền/giá cỡ/ẩm theo snapshot đã ký, không sửa giá trực tiếp ở màn nghiệm thu.

Lập settlements từ chứng cứ và sổ hiện tại, dùng split_settlement để tính chia tiền. Bản kế tiếp tăng seq và nối previous_settlement_id; bản sau quyết toán cuối chỉ ghi delta N và trigger sinh nghĩa vụ, không phát lệnh chia lại cọc. Bản cũ/lệnh cũ bất biến. Tạo đúng lệnh số dương và nghĩa vụ T_bm/T_nb; lệnh trỏ settlement làm căn cứ. Lệnh retry sau thất bại dùng mã mới, chỉ trỏ replaces_instruction_id. Succeeded mới tính tiền đã đi; reconciled mới đủ điều kiện hoàn tất. Không hủy lệnh đang chạy.

## Worker outbox

```sql
-- Login orchestrator đã ánh xạ system:
BEGIN;
SELECT * FROM cmd.claim_outbox($1,50);
COMMIT;
-- Gọi mạng sau COMMIT, dùng event_id + destination làm khóa chống lặp.
-- Mỗi hàng trả về có id và attempts dùng làm lease token:
SELECT cmd.finish_outbox($2::bigint,$3::integer,NULL); -- thành công
-- Hoặc cmd.finish_outbox(id,attempts,error_text) khi gửi thất bại.
```

Worker hết lease có thể gửi lại; consumer phải deduplicate. Thành công cập nhật status sent và sent_at cùng nhau; thất bại lùi available_at, ghi last_error; quá số lần chuyển dead để vận hành xử lý. Không dùng seq toàn cục làm bằng chứng thứ tự COMMIT của mọi aggregate.

## Mã lỗi và kiểm tra khi triển khai

Đọc SQLSTATE và HINT có mã ổn định: `ck_qty_non_negative`, `ck_status_transition`, `IDEMPOTENCY_CONFLICT`, `PHIEN_BAN_DA_DOI`, `KHONG_CO_QUYEN`, `CHUA_DU_TIEN_TRUOC_BOC`. UNIQUE/FK/CHECK thường trả `23505/23503/23514`; ánh xạ theo constraint name, không trả tên bảng hoặc giá kín trong thông báo người dùng.

Triển khai phải có migration checksum, DB backup và thử restore; kiểm tra vai runtime bằng SET ROLE; kiểm tra hai phiên tranh cùng lô, hai lệnh chi cùng cọc, callback và timeout đồng thời. Seed và tests chỉ chạy trong DB thử. Tests tạo các đối tượng `TEST-*` và giữ một luồng tiền để đối chiếu.

## Receipt, hoàn nguồn và kiểm tra bảo mật

Auth worker dùng cmd.record_otp + cmd.otp_verification sau kiểm HMAC/SMS thật. Gửi binding giống core.signature_binding/core.payment_binding; số tiền JSON phải ở miền số nguyên an toàn của stack hoặc dùng encoder bigint chuẩn. Trường contract_version_id của ký là UUID document, của nhận tiền là số effective_version_no. App không tự gọi receipt API.

Bank worker dùng cmd.record_bank_event(webhook,event), giữ bằng chứng API và thông tin tài khoản nguồn rồi apply trong transaction. Không nhận cột signature_valid/requery_status từ trình duyệt. Retry cùng mã event cần đọc lại event gốc; UNIQUE từ chối ghi khác nội dung. Event đã áp dụng không sửa; callback muộn của lệnh cũ vẫn xử lý được sau revision quyết toán.

Lệnh chi có target_bank_account_id/snapshot bằng phiên bản đã ký; muốn đổi đích phải phụ lục. Hoàn gắn source_bank_event_id và đúng hash/ngân hàng/số che/tên nguồn. Excess lấy excess_vnd của event; refund_fee dùng cancellation hoặc deposit_adjustment có delta_fee âm và phụ lục giảm lượng đủ chữ ký. bank_return_tasks là việc hoàn suspense, chưa có worker tự hoàn.

Bộ security gốc vẫn đọc/chạy, không sửa. Fixture gốc dùng OTP bịa và chưa API receipt nên bị chặn lúc dựng trên schema mới. Dùng adapter db/tools/kiem-tra-bao-mat-tuong-thich.mjs để nâng fixture và 4 ca hợp lệ; 41 SQL tấn công giữ nguyên. Các bài db/tests/110–115 còn kiểm riêng đúng lý do chặn với đầy đủ bằng chứng cho điều kiện khác.


## Tích hợp 0030–0032

1. **Chi tạm:** gọi `core.dispute_additional_hold(order)` và `ledger.interim_release(V_kt,D,C,G_them,prior)` trong tầng điều phối tin cậy; DB tự dựng lại G khi INSERT settlement. Tranh chấp thiếu lượng dùng `claim_kind=shortfall`, đúng lượng/đơn; phí ở `inspections` phải phản ánh khoản bên mua đã ứng thật. Các hàm nội bộ không được cấp trực tiếp cho app. Bản cuối dùng `split_settlement` với số đã chi tạm mới.
2. **Hoàn tiền treo:** bank worker đọc task chờ, chuyển đúng snapshot nguồn. Receipt API dạng `statement_line`, `amount_vnd` đúng khoản nguồn, `requery_evidence` chứa `source_event_id`, `direction="debit"`, `target_bank_code`, `target_account_hash` dạng hex. Sau xác minh API gọi `cmd.complete_bank_return(source_event, proof_event)`. Không dùng cờ trả tiền do client gửi; command ghi sổ và cờ returned nguyên tử. Không đủ ngân hàng/hash nguồn thì chuyển đối soát.
3. **Gọi lại lệnh:** bank dispatcher bỏ qua lệnh created có `callback_required` nhưng chưa có callback. V08 được tạo từ SLA priority 1. Finance/risk ghi cuộc gọi thật đúng task và gọi `cmd.confirm_payout_callback(instruction, contact_user, call)`. Command dùng danh tính login; contact phải là chủ phía nhận có số đã xác minh. Chỉ sau đó gửi lệnh. Không cho VH-QL/supervisor thực hiện bước nhả.
4. **Chính sách:** tầng quản trị tin cậy lập `ops.decisions(kind=policy_change,entity=policy_version)` với `detail.policy` là toàn bộ JSON hàng chính sách, trừ approval_decision_id. Quyết định chứa người lập/người duyệt và thời điểm duyệt, sau đó INSERT policy trỏ đúng quyết định, effective_from >= created_at + 24h. Chưa có command duyệt chính sách cho pool web; không cấp DML rộng hay dùng owner cho endpoint để lấp phần thiếu này.
5. **Lời mời:** auth adapter xác minh số đích, ghi OTP purpose invitation_accept theo `core.invitation_binding(jti)`; nhận qua `cmd.scan_qr(raw_token,device,otp_id)`. Người nhận vẫn cần login đã được ánh xạ; onboarding người mới chưa có membership cần broker/command riêng, chưa được cung cấp trong DB này. Quyền tiền sau nhận mời vẫn chờ 24h. Định dạng payload chuẩn tắc, chữ ký Ed25519, khóa công khai và xác minh offline thuộc issuer/verifier/backend; DB hiện dùng token ngẫu nhiên hash + jti để quyết định online, chưa phải triển khai QR Ed25519 hoàn chỉnh.
6. **Đối soát nhận tiền:** ngoài quyết định hai người, bắt buộc statement_line có bank_txn_ref đúng, amount_vnd đúng, requery_evidence gồm payment_binding theo `core.payment_binding`, recipient_org_id đúng bên nhận và direction="credit"; chèn confirmation với bank_evidence_id. Chỉ finance/risk được kết luận. Dùng cmd.reconcile_direct_payment với quyết định đúng khoản và sao kê API; không mở quyền INSERT bảng cho app.

Đổi loại pháp lý tổ chức phải tạo tổ chức mới. Tổ hợp tác không được dùng tài khoản/đơn nhận tiền chung; command tạo đơn con từng hộ còn cần tích hợp. Tiền đang trong lệnh không được dùng lại. Các receipt API/SMS/cuộc gọi trong SQL tests đều là mô phỏng có nhãn, không chứng minh kết nối mạng thực.

## Tích hợp 0033–0037: D-01 và đề xuất backend 1–12

0033–0034 là hai migration chưa triển khai được hoàn thiện tiếp. 0001–0032 giữ nguyên. 0035–0037 thêm command; không đổi mã hoặc nghĩa TH-015/TH-051. Bộ test 130 chỉ đổi thời điểm fixture/kỳ vọng kích hoạt sang đồng hồ nghiệp vụ. Backend và `security/` không được sửa trong đợt này.

### Login runtime

- Pool người dùng kế thừa `agiviet_app`; ánh xạ `cmd.login_principals` do provisioner tin cậy quản lý, mỗi login một user/org/actor. Không cho request tự lựa actor hoặc ghi mapping. Quyền nghiệp vụ được kiểm lại từ membership, vai đã hết cooling, tổ chức active và user chưa bị khóa.
- Pool điều phối kế thừa `agiviet_orchestrator` (NOLOGIN, NOSUPERUSER, NOBYPASSRLS); login riêng ánh xạ `actor_kind='system'`, thành viên tổ chức nền tảng active và có phân công staff active. Không cấp vai này cho login web. Vai không có DML bảng nghiệp vụ/sổ cái/mapping/clock, chỉ EXECUTE entry point.
- `agiviet_auth_worker` xác minh OTP/PIN/sinh trắc rồi ghi receipt; `agiviet_bank_worker` ghi/áp event đã xác thực và tra lại API. Hai vai này không nhận body trực tiếp từ browser. Helper `cmd.insert_row`, `order_party`, `require_*`, `attach_document`, `refund_sources` không được cấp cho runtime.
- Mọi entry point mới dùng SECURITY DEFINER và search_path cố định. Schema `public` có pgcrypto, đã REVOKE CREATE FROM PUBLIC từ 0025. Không cấp CREATE vào các schema trong search_path cho runtime.

```sql
-- Provisioner thực hiện ngoài request; không đưa mật khẩu vào SQL/log ví dụ.
CREATE ROLE backend_system LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_orchestrator TO backend_system;
-- INSERT cmd.login_principals(...) với user/org nền tảng và actor_kind='system'.

-- Trên kết nối đã đăng nhập backend_system:
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT set_config('app.request_id', $1, true), set_config('app.reason', $2, true);
SELECT cmd.activate_order_after_deposit($3::uuid);
COMMIT;
```

### Hợp đồng gọi command

Tham số JSON là object có danh sách trường cho phép; trường ngoài hợp đồng gây `ck_command_payload`. ID sở hữu, người thao tác, trạng thái bắt đầu và liên kết cha được command tự gắn. Đối số bigint nên gửi chuỗi thập phân qua JSON/driver. Hash bytea trong JSON dùng biểu diễn PostgreSQL `\\x...`; tạo bằng `jsonb_build_object('file_sha256', decode($hex,'hex'))`. Khoảng thời gian dùng biểu diễn `tstzrange`/`daterange` chuẩn PostgreSQL.

`document_json` gồm `code,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes`; tùy chọn `canonical_content,generator_version,is_test_data,prev_document_id,prev_content_sha256`. Bản đầu version_no=1; bản sau nối đúng chuỗi hash. Upload bytes thật, kiểm hash và chuẩn hóa nội dung tại adapter PDF trước transaction; SQL test dùng metadata mô phỏng. Không gửi status/signatures/actor trong object.

Các hàm sau được gọi bằng `SELECT cmd.<tên>(...)`, dưới login kế thừa app:

| Hàm và đối số theo thứ tự | Kết quả, kiểm quyền và cách dùng |
|---|---|
| `create_lot(data jsonb)` | UUID lô draft. Bên bán owner/coop_board/collection_staff. data: code, product_id, profile_version, grade_code, qty_basis, declared_qty; tùy chọn variety, product_form, site_id, facility_id, available_from, harvest_on, spray_clear_on, is_substandard. Địa điểm phải thuộc tổ chức. |
| `publish_lot(lot uuid, ask bigint, floor bigint)` | void; khóa lô draft, ghi giá kín, đăng on_sale/upcoming và khai lượng đúng một lần. |
| `create_demand(data jsonb, lines jsonb)` | UUID; buyer owner/purchaser. data: code, segment_code, product_id, profile_version, needed_during, delivery_mode; tùy chọn delivery_facility_id, delivery_commune_code, required_docs, accepts_substandard. lines: mảng grade_code, qty, max_price_vnd, tùy chọn min_source_qty. Tạo header/dòng/giá kín rồi mở nhu cầu nguyên tử. |
| `send_offer(code text, lot uuid, demand_line uuid, buyer uuid, direction text, price bigint, qty bigint)` | UUID lời chào. direction buyer_bid/seller_quote; buyer là bên mua giao dịch, không là actor. Kiểm lô mở và nhu cầu đúng hàng/loại/tổ chức; tạo round và hạn 24h. |
| `accept_offer(offer uuid)` | UUID hold; chỉ bên nhận được nhận, round chưa hết hạn; trừ khả dụng qua trigger, tạo hạn giữ 24h. |
| `create_order(code text, offer uuid, terms jsonb, document_json jsonb)` | UUID; buyer owner/purchaser, offer accepted và hold còn hạn chưa gắn đơn. Tạo orders + order_versions v1 + documents nguyên tử. Hiện entry point dành đơn spot một mặt hàng. terms là các điều khoản của core.order_versions; không có amendment_id/write_xid/created_at, dùng value_basis=single_product. Q/profile/P phải khớp hold/lô/round; cọc/phí phải khớp policy và gói hiện hành; CHECK/trigger kiểm lại tiền, tài khoản, giá tham khảo. |
| `sign_document(doc uuid, party text, otp text, device text, statements text[] DEFAULT '{}')` | UUID chữ ký. Giữ tương thích lời gọi 4 đối số. Seller cần `ARRAY['abnormal_price_ack']` khi đơn có cờ giá bất thường. |
| `send_order(order uuid)` | void; buyer đã ký mới chuyển drafting → awaiting_seller và tạo hạn ký. |
| `attach_evidence(order uuid, document_json jsonb)` | UUID chứng cứ gắn đúng đơn/tổ chức. Dùng cho báo tiền và ảnh/chứng từ. |
| `report_payment(payment uuid, amount bigint, method text, evidence uuid)` | UUID report; chỉ vai owner/accountant/coop_board bên trả, chứng cứ đúng đơn và thuộc bên trả. Chỉ báo đã trả: chuyển payer_reported, tạo hạn xác nhận 48h, không sinh tiền đã nhận. |
| `assign_receiver(delivery uuid, receiver uuid)` | Raw token QR trả một lần; buyer owner/purchaser/warehouse, người nhận có vai owner/warehouse/site_receiver; thu hồi QR cũ và cấp mới. |
| `book_trip(delivery uuid, vehicle uuid, driver uuid, window tstzrange, freight bigint)` | UUID chuyến booked; bên chịu vận chuyển đặt, kiểm lịch/tải. Chưa coi nhà xe đã nhận. |
| `accept_trip(trip uuid)` | void; staff dispatcher ghi sau xác nhận thực của nhà xe; trạng thái accepted và audit. |
| `dispatch_delivery(delivery uuid)` | void; seller xuất hàng, ghi lượng committed → in_transit khi xuất trực tiếp. Các điều kiện tiền/giờ/hồ sơ vẫn do guard kiểm. |
| `start_acceptance(delivery uuid)` | void; chỉ receiver được chỉ định, cần QR đã quét; ready → checking đồng thời chuyển lượng, hàng đã in_transit không chuyển lượng lần hai. |
| `submit_acceptance(delivery uuid, weighed bigint, document_json jsonb, lines jsonb)` | UUID acceptance_version; receiver lập bản mới và toàn bộ dòng cùng transaction. lines: lot_id, kind, qty, payable_qty, unit_price_vnd, value_vnd; tùy chọn order_line_no, reason_code, measurements, replaces_line_id. Chưa tạo chữ ký. |
| `sign_record(doc uuid, party text, method text, device text, pin_receipt uuid DEFAULT NULL, otp text DEFAULT NULL)` | UUID chữ ký BBNT/biên bản; method=qr_confirm dùng receipt PIN/biometric, method=otp dùng OTP purpose=record_sign. Receipt ghim đúng người/doc/device/binding, hết hạn 5 phút, dùng một lần. |
| `send_acceptance(acceptance uuid)` | void; receiver đã ký bản mới nhất mới gửi checking → awaiting_seller. |
| `agree_acceptance(acceptance uuid)` | void; seller ký qua sign_record trước, cả hai bên đã ký và không có dòng tranh chấp mới chốt dòng. Mở khoản tiền hàng còn lại theo snapshot; không sửa giá nghiệm thu. |
| `confirm_arrival(delivery uuid)` | void; receiver xác nhận in_transit → arrived. |
| `finish_warehouse_delivery(delivery uuid)` | void; seller chốt đợt tại kho/cửa khi dòng mới nhất đã closed và có hai chữ ký; chuyển lượng đạt/trả lại nguyên tử. |
| `create_return_lot(order uuid, qty bigint, grade text, code text)` | UUID lô con; seller tách từ returned_pending của đúng đơn, hai vế split và xuất bản cùng transaction; không khai thêm lượng. |
| `request_cancel(order uuid, reason text, description text, partial boolean DEFAULT false)` | UUID đề nghị, đúng bên và lý do; tạo hạn trả lời 24h. |
| `answer_cancel(request uuid, accept boolean)` | void; chỉ đối tác trả lời; chuyển rejected hoặc processing_money. Chấp nhận chưa có nghĩa đã hoàn tiền/đóng đơn. |
| `act_on_task(task uuid, action text, detail jsonb)` | void; staff đúng required_role; claim/start/finish, finish cần detail.result; không xử lý việc người khác; ghi task_actions. |
| `record_call(task uuid, contact uuid, seconds integer, summary text)` | UUID cuộc gọi; staff đúng vai đã nhận task. Dùng UUID này với confirm_payout_callback; receipt SQL không thay bằng chứng gọi thật của adapter. |
| `reconcile_direct_payment(payment uuid, amount bigint, result text, bank_ref text, decision uuid, proof uuid)` | UUID confirmation; finance/risk đúng người lập quyết định payment_reconciliation hai người, sao kê credit đúng binding/khoản/đích; không cấp DML cho app. |

Lời gọi ví dụ sau khi đã chuẩn bị JSON/receipt:

```sql
SELECT cmd.create_order($1, $2::uuid, $3::jsonb, $4::jsonb);
SELECT cmd.sign_document($1::uuid,'seller',$2,$3,ARRAY['abnormal_price_ack']);
SELECT cmd.sign_record($1::uuid,'buyer','qr_confirm',$2,$3::uuid);
SELECT cmd.submit_acceptance($1::uuid,$2::bigint,$3::jsonb,$4::jsonb);
```

### Các bước hệ thống

Chỉ login kế thừa orchestrator, ánh xạ system, gọi:

| Hàm | Cách dùng |
|---|---|
| `sync_document(doc uuid)` | Suy trạng thái partially_signed/fully_signed từ chữ ký thật và needs_signatures; không nhận fully_signed từ client. |
| `finalize_signed_order(order uuid, payment_ref text, virtual_account text, provider text)` | UUID deposit; bản v1 đủ chữ ký mới đặt effective_version_no, awaiting_deposit, tạo cọc đúng điều khoản và hạn cọc. VA/reference phải do bank adapter cấp. |
| `activate_order_after_deposit(order uuid)` | UUID đợt đầu; cần đủ C+F và trạng thái held. Active đơn, commit hold, tạo đợt/khoản trước bốc theo điều khoản; gọi lại khi active trả đợt cũ. |
| `ready_delivery(delivery uuid)` | Kiểm đầy đủ receiver/QR/chuyến đã accepted/hồ sơ/tiền trước ready. |
| `close_delivery(delivery uuid)` | Chốt tại nguồn sau đến nơi/kiểm đến, có nghiệm thu hai bên và dòng closed; chuyển lượng và sync tài liệu. Giao tại kho dùng finish_warehouse_delivery dưới seller. |
| `refund_deposit_reduction(order uuid, version integer)` | UUID adjustment; phải là phiên bản hiệu lực, delta C âm, phụ lục được chấp nhận và có hai chữ ký. Tạo adjustment, chia lệnh hoàn đúng delta về từng nguồn; hoàn phí chỉ khi đủ điều kiện Q06. Gọi lại trả adjustment cũ. |
| `create_settlement(order uuid, final boolean, key text)` | UUID; tự lấy V/D/C/chi trước/phạt/vật tư từ chứng cứ và sổ; dùng split_settlement hoặc interim_release có G_them; tạo bản nối seq, lệnh chi/hoàn và nghĩa vụ. Sau bản cuối chỉ ghi delta N và nghĩa vụ, không chia lại cọc. Cùng key/final trả bản cũ, khác final báo IDEMPOTENCY_CONFLICT. |
| `send_instruction(instruction uuid)` | Created → sent và bank.dispatch outbox nguyên tử; callback_required chưa xác minh cuộc gọi vẫn bị chặn. Worker gửi sau COMMIT, mã lệnh là khóa ngân hàng. Gọi lại không sinh event mới. |
| `retry_instruction(failed_instruction uuid, new_code text)` | UUID mới, chỉ lệnh tự động failed; giữ căn cứ/số/đích, trỏ replaces_instruction_id, reserve lại. Không sửa lệnh cũ; cùng mã trả bản retry, khác mã gây xung đột. |
| `reconcile_instruction(instruction uuid, statement_event uuid)` | Sao kê statement_line đã tra API, đúng mã/số/txn_ref/direction=debit/target_bank_code/target_account_hash; chỉ succeeded mới sang reconciled. Callback succeeded vẫn phải qua bank worker, không có command system tự nhận thành công. |
| `refresh_deposit(deposit uuid)` | Đồng bộ trạng thái: lệnh created/sent/processing/succeeded còn chờ đối soát → processing; hết lệnh còn số dư giữ → held; hết số dư và lệnh đã reconciled → fully_processed. Các command tạo quyết toán/hoàn/retry/đối soát gọi hàm này. Sau callback failed, job gọi lại để trả held; không dùng timestamp của UI suy trạng thái. Fee_held chỉ ghi nhận doanh thu lúc kết thúc, không giữ cọc ở held vì phí này. |
| `finish_order(order uuid)` | completed khi guard xác nhận quyết toán cuối, giao nhận xong, lệnh đối soát, hết công nợ/số dư cần xử lý; nếu còn khoản trả thì outstanding. |
| `expire_deadline(deadline uuid)` | Kiểm due_at theo ref.clock_at, chỉ hạn open. Hết hạn chào/giữ/ký/cọc/hủy/đề nghị/lô/khoản đến hạn thực hiện chuyển tương ứng. Tiền cọc từng phần tạo bank_return_tasks, không active. Các hạn cần chứng cứ phức tạp tạo task dispatcher; không tự coi im lặng là đã nhận tiền/hàng. Retry hạn đã đóng trả trạng thái hiện tại. |
| `activate_bank_account(account uuid)` | Sau name_match và đủ 24/72h, thay tài khoản active cũ và kích hoạt tài khoản cooling_down nguyên tử. |

Ví dụ điều phối sau BBNT đóng:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT cmd.sync_document($1::uuid);
SELECT cmd.create_settlement($2::uuid,true,$3);
COMMIT;
-- Một transaction riêng để send_instruction, rồi worker đọc outbox sau commit.
```

Các command có khóa tự nhiên chống lặp (publish/accept, finalize qua trạng thái/UNIQUE, mã tài liệu/đơn/lệnh) sẽ báo xung đột khi gọi lại ngoài trạng thái. Backend giữ idempotency key + hash request và kết quả ở API; không retry mù lệnh không có key. `create_settlement` dùng key để nhận diện snapshot đã ghi: muốn tính lại chứng cứ mới phải dùng key mới, không tái sử dụng key cũ để lấy số mới.

0038–0047 bổ sung command cho khung/nhóm, duyệt chính sách, phụ lục một mặt hàng, phân xử tranh chấp và hạch toán hủy. Bảng phía dưới là ánh xạ tích hợp hiện hành. `answer_cancel=true` mở bước xử lý tiền; tiếp tục bằng `process_cancellation` hoặc `process_unsigned_cancellation`, rồi `finish_cancellation` sau đối soát. Các nghiệp vụ chưa tồn tại trong schema/command (như đơn con tổ hợp tác, bao tiêu hoặc phụ lục nhiều món) chưa được mở bằng SQL owner. Hạn cần đánh giá bằng chứng được đưa vào task, không âm thầm hoàn thành nghiệp vụ.

### Chủ đầu tiên và lịch sử thu hồi vai (mục 9, 12)

1. Tổ chức mới pending, user và membership active chưa có vai. Provisioner/auth onboarding tạo các hàng đăng ký; người dùng không tự ghi bảng vai.
2. Vận hành gọi `cmd.propose_owner_verification(org,user,evidence_doc,reason)` → verification UUID. Evidence phải doc_type=evidence, entity=organization, entity_id đúng org. Người xác minh có vai field/risk/supervisor/support.
3. Người khác có risk/supervisor gọi `cmd.approve_owner_verification(verification)` → decision UUID, ghi người lập/người duyệt từ hai login và mở tổ chức active, verification_level=2. Không nhận approved_by từ client.
4. Chính người duyệt gọi `cmd.bootstrap_owner(org,user,decision)` trong 24h kể từ quyết định. Khóa tổ chức, đúng người/chứng cứ/verification, chưa từng có owner, quyết định dùng một lần. Vai chỉ vào view membership_roles sau 24h từ cấp.
5. Chủ đã hiệu lực gọi `cmd.grant_member_role(membership,role)` → grant UUID hoặc `cmd.revoke_member_role(grant)` → void. Thu hồi ghi revoked_at/revoked_by; không DELETE, không sửa lịch sử, không thu hồi chủ cuối cùng. Cấp lại tạo hàng mới; vai tiền/chữ ký lại phải chờ 24h. Quyền đọc nghiệp vụ dùng view membership_roles, không đọc grants trực tiếp để quyết định quyền.

```sql
SELECT cmd.propose_owner_verification($1::uuid,$2::uuid,$3::uuid,$4);
-- Login risk/supervisor khác người lập:
SELECT cmd.approve_owner_verification($1::uuid);
SELECT cmd.bootstrap_owner($1::uuid,$2::uuid,$3::uuid);
```

### Auth, OTP đăng nhập và ký biên bản (mục 2, 3, 5)

Auth worker gọi `cmd.record_login_session(user,org,device,token_hash,expires,otp,purpose DEFAULT 'login')` → UUID. Purpose login/login_new_device; OTP binding `{org_id,device_id,token_sha256}` đúng dữ liệu đăng nhập. Chỉ lưu SHA256 token ngẫu nhiên, hạn tối đa 30 ngày. `cmd.lookup_session(token_hash)` trả id/user/org/device khi chưa hết hạn, chưa thu hồi và user/membership hoạt động; `cmd.revoke_session(token_hash)` thu hồi bền vững. Không dùng dữ liệu phiên để cho request tự thay login_principals.

Sau khi xác thực lại PIN/biometric thật, auth worker gọi `cmd.record_reauthentication(user,doc,device,method)` → receipt UUID. Worker không nhận “PIN hợp lệ” từ browser làm bằng chứng. App nhận UUID rồi sign_record; receipt tự tiêu thụ cùng transaction chữ ký, rollback không làm mất receipt. Với OTP BBNT dùng cmd.record_otp purpose=record_sign và core.signature_binding(doc). Không dùng OTP contract_sign để ký BBNT.

### Đồng hồ (mục 4, 11)

Production giữ `cmd.test_clock` rỗng. Chỉ provisioner/owner DB thử cô lập được INSERT/UPDATE singleton `at`; không có command bật clock cho runtime. Khi không có hàng thử, runtime ref.clock_at() lấy giờ thật, bỏ qua app.test_time do request đặt. Không import bảng clock từ bản thử vào production. Owner fixtures cũ có thể đặt app.test_time, còn kiểm thử runtime dùng bảng clock được owner cấp.

```sql
-- Chỉ trong DB thử, do owner chạy:
INSERT INTO cmd.test_clock(singleton,at) VALUES(true,'2026-11-01 07:00+07');
UPDATE cmd.test_clock SET at=at+interval '24 hours';
-- Chạy activate_bank_account bằng login system thật; không sửa created_at để vượt chờ.
DELETE FROM cmd.test_clock;
```

Bank account mới dưới runtime được đóng dấu created_at=ref.clock_at, cooldown 24h hoặc 72h nếu vừa khôi phục tài khoản; kiểm kích hoạt và activated_at dùng cùng clock. Owner import có thể giữ created_at lịch sử. Phiên/OTP/PIN receipt vẫn dùng đồng hồ thật để chống kéo dài xác thực.

| Nhóm thời điểm | Quy tắc |
|---|---|
| Ledger posted_at/effective_at, bank occurred_at/requeried_at/applied_at, settlement computed_at | Giờ thật; không truyền giờ tua vào bank event hoặc computed_at. Cửa sổ effective_at ±7 ngày vẫn giữ nguyên. |
| OTP/login session/record receipt, quyết định và bằng chứng xác thực | Giờ thật, thời hạn chống replay không tua theo nghiệp vụ. |
| Tranh chấp created_at; tài liệu/chứng cứ nghiệp vụ created_at; nghiệm thu recorded_at, dòng/chia lại/rút/kết luận created_at; mẫu sealed_at, bàn giao mẫu at; kiểm định created_at/issued_at | Từ 0053 dùng ref.clock_at. Cửa sổ chia lại là [created_at, created_at + 24h); chứng cứ trước phản đối bị chặn. Không đổi timestamp lịch sử. |
| Deadline created_at/due_at, offer expires_at, QR expires/scan, cooling vai, chờ tài khoản | Giờ nghiệp vụ ref.clock_at; command ghi created_at và due_at cùng miền. |
| Offer/offer_round/hold/QR created_at; kiểm tra gói thành viên active_during | Từ 0053 dùng ref.clock_at cùng expires_at và thời điểm kích hoạt gói. QR tua lùi vẫn thỏa expires_at > created_at. |
| Audit/state history/status_changed_at/updated_at và timestamp kỹ thuật mặc định | Giữ timestamp thật theo trigger/default hiện có; không dùng chúng thay due_at/cooldown_until. |

### Seed Sáu → Tư Hùng và “đơn đầu” (mục 6)

Giữ nguyên 4 historical_trades của cặp Sáu → Tư Hùng và TH-015/TH-051. Đợt này không thêm cờ rồi tự gán false cho các hàng đó, không sửa phí/fixture để che mâu thuẫn.

Phương án cần thống nhất trong đặc tả: tách rõ **đơn đầu trên app để tính phí** và **quan hệ đã có chứng cứ để mở liên lạc**. create_order hiện xác định is_first_pair_order từ orders đã completed trên app, khớp cách backend đang tính phí; historical_trades vẫn tham gia refresh_contact_grant theo quy tắc cũ. Vì vậy không suy “được mở liên lạc” thành “đã có đơn app” hoặc ngược lại. Nếu TH-015/051 yêu cầu cặp này cũng chưa có quan hệ trước app, cần quyết định nghiệp vụ riêng: thêm counts_as_relationship và migration dữ liệu chỉ định nguồn/chứng cứ cho từng hàng, hoặc đổi bộ dữ liệu của kịch bản bằng quyết định đặc tả. Không tự đổi nghĩa hai mã TH trong migration này.

### Kết quả kiểm tra

Xem `db/test-results.json` và [kết quả 0038–0047](09-ket-qua-boc-dieu-phoi-command.md); báo cáo [08](08-ket-qua-de-xuat-backend.md) giữ mốc lịch sử 0033–0037. PGlite kiểm SQL/privilege dưới session_user thật, một kết nối; chưa là bằng chứng tranh chấp PostgreSQL nhiều phiên hoặc API ngân hàng/SMS/PIN thật. Bộ security nguyên bản được chạy nguyên trạng; fixture OTP giả bị chặn trước các ca, nên kết quả đó không được ghi thành 45/45. Adapter tương thích trong db/ giữ nguyên 41 SQL tấn công, chỉ nâng fixture và 4 ca hợp lệ theo chứng cứ mới.

## Bước backend → hàm cmd.* (0038–0047)

Đây là hợp đồng DB thay các bước owner nêu trong đánh giá backend phiên 5. Đợt này chỉ sửa DB/tài liệu; backend phải thay các câu DML bằng các lời gọi dưới đúng login. Chưa có thay đổi hay triển khai backend trong đợt này.

Ký hiệu **app**: login kế thừa `agiviet_app`, ánh xạ buyer/seller; **ops**: cũng kế thừa app nhưng ánh xạ ops và có staff role còn hiệu lực; **system**: login kế thừa `agiviet_orchestrator`, ánh xạ system. Mọi entry point dưới đây là SECURITY DEFINER, search_path cố định. Tham số người nhận/người được mời/đối tác là đối tượng nghiệp vụ, không phải actor; người thao tác và tổ chức thao tác được lấy từ `session_user`. Runtime không có DML hay EXECUTE helper nội bộ.

| Bước backend | Hàm `cmd.*` | Login và kết quả bắt buộc |
|---|---|---|
| Tạo, đăng lô | `create_lot`, `publish_lot` | app seller; draft → on_sale/upcoming, khai lượng một lần. |
| Giá lô, xác nhận còn hàng, đóng lô | `update_lot(lot,action,data)` | app seller; action `price/confirm/close`; không đóng khi còn held/committed/in_transit. |
| Chứng cứ lô/tổ chức | `attach_entity_evidence(entity,id,document,captured)` | app đúng tổ chức hoặc ops field/risk/supervisor; entity lot/organization. |
| Tạo và đăng nhu cầu | `create_demand(data,lines)` | app buyer; header/dòng/giá kín/open cùng transaction. Không gọi publish lần hai. |
| Tăng giá trần nhu cầu | `raise_demand_price(line,price)` | app buyer; khóa nhu cầu/dòng, chỉ tăng, lưu người đặt giá. |
| Đóng nhu cầu và lời chào còn mở | `close_demand` | app buyer; lời chào sent hết hiệu lực và hạn được đóng cùng transaction. Hold/đơn đã nhận vẫn giữ nguyên nghĩa vụ. |
| Gửi/trả giá/từ chối/rút chào | `send_offer`, `reply_offer(offer,action,price,qty)` | app đúng bên; action counter/reject/withdraw, mỗi vòng có hạn mới. |
| Nhận chào, giữ/nhả lượng | `accept_offer`, `release_hold` | app phía đối diện vòng hiện hành; hold đã vào đơn phải đóng qua đơn. |
| Lập đơn spot + tài liệu + bản v1 | `create_order` | app buyer; kinh tế khớp hold, giá và policy; nguyên tử. |
| Xin duyệt/duyệt nội bộ | `request_order_approval`, `approve_order(order,approve)` | app buyer; chủ duyệt khác người lập. |
| Ký hợp đồng, gửi cho người bán | `sign_document`, `send_order` | app; OTP đúng document/binding. `statements` hỗ trợ abnormal_price_ack. |
| Đồng bộ trạng thái tài liệu | `sync_document` | system; nhận cả draft, mở ký rồi suy trạng thái từ chữ ký, không tự ký. |
| Chốt ký và lập cọc | `finalize_signed_order` | system, đơn spot; reference/VA/provider do bank adapter cấp. Nhóm đi qua cutoff_group. |
| Kích hoạt sau cọc và nghĩa vụ trước bốc | `activate_order_after_deposit` | system; đủ C+F có bằng chứng ngân hàng, commit hold, tạo đợt/QR/khoản trả. Dùng chung phần nhóm sau chốt. |
| Bằng chứng/biên nhận khoản trả | `attach_evidence`, `create_payment_receipt` | app đúng đơn; biên nhận ghim payment_id và amount_vnd. |
| Báo trả, xác nhận đã nhận | `report_payment`, `confirm_direct_payment` | app bên trả/bên nhận có vai tiền; report không ghi tiền đã nhận. Confirmation dùng OTP; tiền mặt cần biên nhận hai chữ ký. |
| Tới mốc trả | `make_payment_due` | system; chỉ not_due với due_at đã tới và bằng chứng mốc. |
| Đối soát khoản trả lệch | `propose_decision`, `approve_decision`, `reconcile_direct_payment` | ops finance/risk độc lập; quyết định khóa đúng amount/result/reference/proof. Chỉ người lập thực thi, proof sao kê đúng khoản. |
| Chỉ định người nhận | `assign_receiver` | app buyer; thu hồi QR cũ, trả raw token mới một lần. |
| Đặt và nhận chuyến | `book_trip`, `accept_trip` | app bên chịu cước đặt; ops dispatcher ghi nhà xe thực sự nhận. |
| Ready/xuất/bắt đầu kiểm | `ready_delivery`, `dispatch_delivery`, `start_acceptance` | system / seller / người nhận chỉ định. Điều kiện tiền, lịch, hồ sơ, chuyến và QR giữ nguyên. |
| Lập/gửi/ký BBNT | `submit_acceptance`, `sign_record`, `send_acceptance` | người nhận lập bản và tất cả dòng cùng transaction; PIN/biometric receipt do auth worker ghi hoặc OTP record_sign. |
| Chấp nhận cả bản/từng dòng | `agree_acceptance`, `agree_acceptance_line` | app seller; bản hiện hành, hai chữ ký. Khoản tiền phát sinh tính nhận/lần trước, không nhân nghĩa vụ. Gọi hàng khung không tạo khoản trả riêng. |
| Đến nơi/kiểm nơi đến | `confirm_arrival`, `begin_arrival_check` | app receiver; begin_arrival_check ghi lượng cân vào event và tạo hạn 2 giờ. |
| Chốt giao tại nguồn/kho | `close_delivery`, `finish_warehouse_delivery` | system sau arrival_check / app seller tại kho; chuyển lượng từng lô, không tự thay chữ ký. |
| Chọn xử lý thiếu lượng | `resolve_shortfall(delivery,choice,window,evidence)` | app seller; choice backfill/end/force_majeure, cần BBNT hai chữ ký. Giao bù hoặc nhả lượng, phạt theo Q04. |
| Tách hàng trả thành lô con | `create_return_lot` | app seller; xuất returned_pending ở lô cha, nhập split_in ở lô con. |
| Quyết toán tạm/cuối/điều chỉnh | `create_settlement` | system; tự lấy V/D/C/G_them/phạt/vật tư, tự lập lệnh và nghĩa vụ. Sau bản cuối chỉ ghi delta, không chia lại cọc. |
| Gửi/retry lệnh | `send_instruction`, `retry_instruction` | system; outbox sau commit; lệnh failed được thay bằng mã mới. Lệnh thủ công cần quyết định mới, không retry tự động. |
| Callback + đối soát lệnh | `record_bank_event` + `core.apply_bank_event`, rồi `reconcile_instruction` | bank worker ghi/apply callback; system đối chiếu sao kê đúng mã/số/đích. Callback succeeded chưa là reconciled. |
| Hoàn thừa/hoàn chênh phụ lục | `refund_excess`, `refund_deposit_reduction` | system; nguồn và entitlement từ DB; không nhận tài khoản đích tùy ý. |
| Đồng bộ cọc, hoàn tất đơn | `refresh_deposit`, `finish_order` | system; processing/held/fully_processed theo sổ và lệnh; còn nghĩa vụ trả thì outstanding. |
| Hết hạn và loại thông báo | `expire_deadline_result(deadline)` | system; trả JSON bất biến `{status,action,kind,entity,entity_id,order_id,task_id}`. Retry cùng kết quả, không nhân task/event. `expire_deadline` giữ tương thích trả text status. |
| Đóng đơn chưa cọc đơn phương | `close_unsigned_order` | app đúng bên; seller_declined/cancel_before_deposit, nhả giữ và xếp hoàn tiền thiếu. |
| Xin/trả lời hủy | `request_cancel`, `answer_cancel` | app hai bên khác nhau; có hạn trả lời, không nhận số tiền chia từ client. |
| Hạch toán hủy sau cọc | `process_cancellation(request,document)` | system; đơn active, giao nhận/tranh chấp và lệnh trước đã xử lý. Snapshot N/D/C, phạt hủy, chia cọc/phí về nguồn, nghĩa vụ hoàn D, nhả lượng, hủy khoản chưa nhận. Hỗ trợ chỉ hủy phần chưa giao. |
| Hạch toán hủy trước cọc đủ | `process_unsigned_cancellation(request,document)` | system; accounting 0, đóng chứng từ/đơn, nhả hold. Tiền thiếu ở deposit_pending qua bank_return_tasks; không giả thành escrow. |
| Hoàn tiền thiếu/đến muộn, kết thúc hủy | `complete_bank_return`, `finish_cancellation` | bank worker cần API proof debit đúng nguồn; system chỉ done khi hết lệnh/công nợ/tiền treo. |
| Mở tranh chấp dòng | `open_dispute` | app bên đơn; p_qty phải bằng lượng dòng. Nếu chỉ tranh chấp một phần, tách dòng trong bản nghiệm thu mới trước khi mở; không áp kết luận toàn dòng cho p_qty nhỏ hơn. |
| Khác mẫu tại nơi đến | `claim_arrival_difference` | app buyer trong hạn arrival_check, chứng cứ đúng đơn; tạo bản mới, tách lượng tranh chấp. |
| Yêu cầu/ghi kết luận kiểm định | `request_inspection`, `record_inspection_result` | app yêu cầu; login inspector ánh xạ đúng provider + staff inspector ghi. Event key/hash chống lặp, mẫu niêm phong phải khớp. |
| Không kết luận 14 ngày, phân xử | `expire_deadline_result`, `propose_decision`, `approve_decision`, `resolve_dispute` | system giữ tiền/chuyển external_resolution/tạo task; ops risk/supervisor hai người, chỉ người duyệt phân xử đúng kết luận đã duyệt. |
| Người bán rút phần tranh chấp | `withdraw_dispute`, `close_resolved_delivery`, `create_return_lot` | seller ký BBNT và nhận lại phần rejected trước kiểm định; system chốt lượng rồi seller lập lô con. Không tạo kết luận kiểm định giả. |
| Chốt theo kết luận | `close_resolved_delivery` | system; hết tranh chấp của đợt và dòng hiện hành closed, có kết luận/biên bản rút hợp lệ. Nhiều dòng kết luận nối các phiên bản, giữ nguyên dòng chưa kết luận. |
| Gửi/rút/từ chối/nhận đề nghị sửa | `propose_amendment`, `answer_amendment` | app đúng bên; lượng/giá/ngày/vận chuyển hoặc đổi receiver. Hai bên chấp nhận và ký annex trước tác động kinh tế; receiver thay ngay theo quyền buyer. |
| Áp phụ lục đã ký | `apply_signed_amendment` | system; hiệu lực phiên bản, lượng/đợt/cọc/QR/khoản trả/phạt delta đúng một lần. Phụ lục kinh tế chờ cọc gốc active trước khi áp. |
| Giảm bất khả kháng khi mua im lặng | `prepare_operational_reduction` | ops người duyệt quyết định hai người sau 24 giờ; chỉ seller đề nghị FM, evidence đúng danh sách; tài liệu ghi rõ quyết định ký thay, không giả OTP buyer. Seller vẫn ký annex, system apply. |
| Tạo danh tính để mời/thêm thành viên | `create_invitee`, `invite_member`, `accept_invitation` | chủ mời; người được mời dùng login đã ánh xạ và OTP đúng số/QR một lần. Login invited chỉ được nhận lời mời. |
| Xác minh số lời mời | `verify_invitation_contact` | auth worker, chỉ challenge invitation đã verified đúng binding/số đích. |
| Sửa thành viên/cấp/thu hồi vai | `update_member`, `grant_member_role`, `revoke_member_role` | chủ cùng tổ chức; giữ chủ cuối cùng, không kích hoạt invited để vượt OTP, thu hồi giữ lịch sử. |
| Xác minh/cấp chủ đầu tiên | `propose_owner_verification`, `approve_owner_verification`, `bootstrap_owner` | ops hai người; chứng cứ tổ chức và quyết định một lần, vai chờ 24 giờ. |
| Đổi/xác minh/kích hoạt/khóa tài khoản nhận | `request_bank_account`, `verify_bank_account`, `activate_bank_account`, `lock_bank_account` | chủ + OTP / bank worker có API receipt / system đủ cooling / chủ hoặc ops risk/finance; không-phải-tôi xếp việc P0. |
| Tạo/nhận/xử lý việc | `create_task`, `act_on_task` | system tạo hoặc ops đúng role; claim/start/wait/finish; assigned_to từ login, không cướp việc, finish có result. |
| Ghi cuộc gọi/giờ công/gọi lại lệnh | `record_call`, `record_work`, `confirm_payout_callback` | ops đúng vai đã nhận task; callback proof trỏ cuộc gọi đúng task. Adapter chịu trách nhiệm cuộc gọi thực. |
| Quyết định tiền hai người | `propose_decision`, `approve_decision`, `create_manual_instruction`, `post_correction` | ops; detail bất biến đã duyệt chính xác số/nguồn hoặc toàn bộ lines/memo/effective_at. Hai người độc lập, không nhận proposed_by/approved_by qua request. |
| Chính sách mới | `propose_decision`, `approve_decision`, `publish_policy` | ops risk/supervisor đề xuất, supervisor khác duyệt và publish snapshot policy; không sửa policy đã dùng. |
| Claim/ack outbox | `claim_outbox`, `finish_outbox` | system; SKIP LOCKED + lease 1 phút, kiểm attempts/hạn lease; sent/failed/dead và backoff. |
| Soạn/ký/chốt cọc khung | `create_framework`, `sign_document`, `send_framework`, `finalize_framework` | app buyer soạn/ký/gửi; seller ký/chốt. Cọc ít nhất một kỳ lịch, snapshot tài khoản active. |
| Chạy khung/cho thêm nợ | `activate_framework`, `grant_framework_credit`, `refresh_framework_security` | system đủ cọc / seller cấp thêm nợ có lịch sử / system đánh giá running/needs_security. |
| Gọi hàng nhiều món | `create_calloff`, `activate_calloff` | app buyer rồi system; giá/món từ lịch đã ký, hạn mức khung và lượng từng lô. Dùng giao nhận/quyết toán chung, không cọc hay trả riêng mỗi calloff. |
| Lập khoản trả kỳ khung | `bill_framework_period(framework,period)` | system; kỳ hữu hạn đã kết thúc, không chồng lấn, lấy N từ quyết toán cuối của đơn có created_at trong kỳ. `fee_vnd` là snapshot phí tỷ lệ, không sàn; chưa là bằng chứng đã thu phí. |
| Báo/xác nhận tiền kỳ khung | `attach_framework_evidence`, `report_payment`, `confirm_direct_payment` | app đúng tổ chức; evidence framework; OTP và sổ công nợ khung như khoản trực tiếp. |
| Kết thúc khung, hoàn cọc | `close_framework` | system; hết đơn/khoản trả/công nợ khung; chia hoàn nguồn, processing_money tới khi đối soát rồi ended. |
| Tạo nhóm, phân bổ một phí tổng | `create_group`, `create_group_parts` | app buyer; một transaction tạo mọi phần từ offer/hold, allocate_vnd một phí chung trước ký. |
| Rút/phân lại phần trước cọc | `withdraw_group_part`, `reset_group_parts` | app seller rút phần awaiting_seller; buyer reset khi còn gathering, đóng/nhả bộ cũ, tạo lại và ký lại bộ phần. |
| Cấp VA và chốt nhóm | `register_group_deposit_account`, `cutoff_group` | system; VA thật mỗi phần, chốt đúng cutoff và đủ chữ ký/tổng/phí; thiếu all-or-nothing đóng, không thu cọc. |
| Hoàn thành nhóm | `finish_group` | system; mọi phần đã completed/closed mới completed nhóm. |

Các cấu trúc JSON/kiểu SQL nằm trong chữ ký migration tương ứng; không gửi cả bản ghi DB hay actor/status/created_by trong payload. `prepare_operational_reduction` cần `canonical_content.operational_signature_notice = 'ký thay bằng quyết định vận hành ' || decision_uuid`. Quyết định đối soát dùng detail `{amount_vnd,result,bank_reference,proof_id}`, lệnh thủ công dùng `{kind,amount_vnd,source_event_id}`; command so lại nội dung đã duyệt.

Ba đề nghị mới phiên 5 đã có đường gọi: `sync_document` nhận draft; `expire_deadline_result` trả action/task ổn định (khoản đã nhận trả already_satisfied, không tạo việc đối soát giả); phân xử/hủy/khung/nhóm có command chuyên biệt theo bảng. Không cấp EXECUTE cho `insert_row`, `party_order`, `apply_dispute_result`, `move_delivery_*`, `expire_deadline_internal`, `create_group_part_internal`.

## Tích hợp 0051–0052 · đề xuất backend mục 14–15

### Giảm giá và Q06

Chọn phương án **15(a)** theo `docs/nghiep-vu/04-tien-va-coc.md` mục 4, 9: phụ lục chỉ đổi giá **giữ phí**, cọc vẫn tính lại theo giá mới và snapshot tham khảo. Không mở thêm quyền hoàn phí cho `change_price`. Ví dụ 2.000 kg × 23.000 → 20.000 đ/kg: cọc 13.800.000 → 12.000.000, hoàn 1.800.000 về nguồn; phí 138.000 giữ nguyên, `delta_fee_vnd=0`. Đổi giá tăng cũng không thu thêm phí; tăng lượng mới thu phần phí tăng, giảm lượng có căn cứ mới hoàn phần phí giảm.

`core.order_version_fee_bases` ghi cơ sở phí riêng cho phụ lục bằng trigger; không nhận cơ sở phí từ request. Bản hợp đồng cũ không bị sửa, cấu trúc `order_versions` giữ nguyên. Đổi giá/ngày/vận chuyển kế thừa cơ sở phí trước; đổi lượng phân cơ sở phí trước theo lượng mới/lượng cũ, sau đó tính phí với tỷ lệ, sàn, trần đã ký. Vì vậy giảm lượng sau giảm giá không hoàn lại cả phần phí giảm giá đã giữ. `ck_ov_fee` vẫn kiểm công thức trên cơ sở phí này; các guard nguồn hoàn, số tiền và chữ ký vẫn áp dụng.

Gọi `propose_amendment` → bên kia `answer_amendment` → hai bên `sign_document` → system `apply_signed_amendment` như trước. `refund_deposit_reduction` chỉ phát hoàn phí cho giảm lượng có căn cứ. Backend có thể bỏ nhánh chuyển lỗi `ck_instruction_fee_refund` của phụ lục giảm giá thành 501 khi tích hợp phiên bản DB này. Không sửa PDF/snapshot phụ lục đã phát hành bằng DML; nếu trước nâng cấp đã soạn phụ lục giảm giá với phí thấp hơn, rút/soạn lại trước khi ký để điều khoản phí khớp Q06.

### Cân lại/chia lại sau phản đối

Command mới dành cho **người nhận được chỉ định bên mua**:

```sql
SELECT cmd.revise_acceptance_after_objection(
  $1::uuid,  -- acceptance_id hiện hành bị phản đối, dùng làm khóa chống lặp
  $2::jsonb, -- metadata BBNT mới theo hợp đồng attach_document
  $3::jsonb, -- array các phần thay thế dòng disputed
  $4::uuid   -- evidence mới, thuộc bên mua và đúng đơn
);
```

Mỗi phần có `source_line_id` là UUID dòng tranh chấp cũ, cùng `lot_id` và `order_line_no` cũ (bỏ `order_line_no` nếu dòng cũ NULL). Các trường kinh tế giống `submit_acceptance`: `kind`, `qty`, `payable_qty`, `unit_price_vnd`, `value_vnd`, `reason_code` nếu hạ cấp/trả lại, và `measurements` nếu cần. Không gửi `status`, `line_no`, `replaces_line_id`, `acceptance_id`, hoặc actor. Ví dụ thay dòng 80.000 g hạ cấp thành hai phần 40.000 g đạt + 40.000 g hạ cấp: cả hai phần cùng `source_line_id`, giá đạt/hạ cấp lấy đúng hợp đồng. Không đưa lại các dòng không tranh chấp; DB tự sao chép nguyên nội dung và trạng thái của chúng.

Điều kiện: đợt `disputed`, bản hiện hành, phản đối của người bán còn `open`, **chưa đủ 24 giờ** từ lúc mở và chưa yêu cầu kiểm định/chốt lượng. Phải chia lại đủ mọi dòng tranh chấp trong bản; tổng lượng từng nhóm `source_line_id` bằng lượng dòng gốc. Command này phân lại loại hàng trong tổng lượng đã cân; không thay đổi lượng giao hợp đồng. Thay đổi lượng hợp đồng vẫn qua phụ lục/nhánh thiếu, vượt hiện có. Chứng cứ mới phải được tạo không sớm hơn các phản đối và đúng đơn/tổ chức. BBNT mới chưa có chữ ký; đợt về `checking`, tranh chấp sang `awaiting_seller`.

Tiếp tục `sign_record` phía buyer → `send_acceptance` → `sign_record` phía seller → seller `agree_acceptance(new_acceptance_id)`. Chỉ khi bản hiện hành đã gửi, có hai chữ ký và seller đồng ý thì DB đóng phản đối gốc, các phần mới, rồi xử lý lượng, rủi ro và nghĩa vụ tiền như luồng thuận. Không cần dựng kết luận kiểm định giả. Retry cùng bản gốc và toàn bộ tham số trả cùng UUID; thay tài liệu/dòng/chứng cứ trả `IDEMPOTENCY_CONFLICT`. Sai người nhận trả `KHONG_CO_QUYEN`; sai phạm vi, lượng hoặc hạn trả `ck_dispute_scope`; thiếu chứng cứ trả `ck_command_evidence`.

Khi chưa thống nhất, hai bên vẫn gọi `request_inspection` trên **dispute_id gốc**. Đợt về `disputed`; kết luận áp đúng mọi phần đã tách theo ánh xạ nguồn và giữ nguyên những dòng/tranh chấp khác. `close_resolved_delivery` dùng sau khi tất cả tranh chấp của đợt đã kết luận. Bản chia lại không được dùng để tự tăng số chi tạm: `create_settlement(...,false,...)` và guard dùng chung phép tính V_kt, giới hạn phần chưa được seller đồng ý ở mức thấp hơn giữa đề xuất cũ và mới; sau đồng ý/kết luận mới dùng đầy đủ giá trị đã chốt. Hạn 24 giờ của command không thay thế việc backend/worker đặt lịch kiểm định khi hết hạn theo đặc tả.

### Mời người chưa có danh tính

Đã có từ 0039, không cần thêm một broker nhận danh tính tùy ý từ request:

```sql
-- Login chủ hiện hành, cùng transaction:
SELECT cmd.create_invitee($1::text,$2::bytea,$3::bytea,$4::text,$5::text);
-- name, phone_enc, phone_hash 32 byte, phone_masked, key_id
SELECT cmd.invite_member($6::uuid,$7::text[],$8::bigint);
```

Adapter tin cậy chuẩn hóa số, mã hóa bằng KMS và băm số theo quy ước hiện có; không ghi số rõ hoặc khóa mã hóa vào DB/log. Cùng phone_hash trả danh tính cũ dưới khóa advisory, không ghi đè tên/bản mã và không tự xác minh số. `invite_member` trả membership_id, invitation_id, token; chỉ trả token cho luồng mời được cấp quyền. Bước provision login/ánh xạ principal vẫn do hạ tầng tin cậy, không cho client tự chọn user/org. Người mới chưa có login có thể được tạo danh tính và nhận lời mời, nhưng chỉ nhận lời thành công khi có principal hợp lệ, OTP đúng số/binding qua auth worker `verify_invitation_contact`, rồi `accept_invitation`; token/OTP dùng một lần. Login invited chưa được dùng command thị trường. Bộ kiểm thử cũ đã kiểm luồng nhận đầy đủ; ca mới kiểm thêm tạo/mời từ số chưa tồn tại và retry không ghi đè.

### Mã nạp bổ sung cọc

0051 cấp mã mới dạng `TP` + **10 chữ số thứ tự** + **2 chữ số kiểm MOD 97**, tổng **14 ký tự**, ví dụ `TP000000000195`. Phần 12 chữ số sau `TP` lấy modulo 97 bằng 1. Sequence không quay vòng; trigger cấp mã khi delta cọc hoặc delta phí dương, không dùng mã từ client. Giữ nguyên các mã đã phát hành và mã cọc gốc/VA của adapter; không rút ngắn mã đang có tiền/lệnh liên quan. Mã việc và mã khoản trả không thay đổi trong lần này.

Backend phải đọc **nguyên văn `deposit_adjustments.payment_ref`** để tạo VietQR/nội dung chuyển khoản; không kiểm cứng tiền tố `TOPUP-` và không tự ghép UUID. Callback vẫn khớp chính xác mã trong DB, nguồn và API receipt như trước; số kiểm không thay thế đối soát ngân hàng. Hạn bổ sung cọc vẫn 24 giờ. Không cấp sequence/helper phát mã cho runtime.

### Chính sách chưa chốt và kết quả kiểm tra

Giữ nguyên billing/biên nhận gói và seed delegation. **Chưa chốt**: tháng đầu thu đủ giá hay theo số ngày còn lại; người giúp mặc định chỉ `lot.draft` hay gồm `lot.update`/đăng lô. Backend cần tiếp tục hiển thị/chặn theo quyền hiện có, không ngầm cấp thêm. Xác minh tổ chức/chủ đầu tiên vẫn theo luồng hai người; không bổ sung đường xác minh một người.

Kết quả và giới hạn của lần kiểm tra ghi tại [07-ket-qua-de-xuat-14-15.md](07-ket-qua-de-xuat-14-15.md). Chưa sửa backend hoặc bộ kiểm bảo mật. PGlite không kiểm đua khóa giữa hai phiên; yêu cầu SERIALIZABLE/retry vẫn giữ nguyên.

## Nhật ký, mặt hàng xác minh, hợp đồng vụ và bán gấp · 0056–0057

Áp tiếp sau 0055, không sửa checksum migrations cũ. Không đổi API spot, khung, đơn nhóm hoặc lô gộp. Hợp đồng vụ dùng chung `orders`, `order_versions`, chữ ký, cọc, nghiệm thu, phụ lục, ngân hàng và sổ lượng. Không tạo một sổ tiền thứ hai. Ghi bằng principal và `cmd.*` trong transaction **SERIALIZABLE**; retry toàn transaction khi `40001`/`40P01`. Không cấp DML bảng mới, không cấp helper nội bộ hoặc `ALL FUNCTIONS`.

### Cơ sở và nhật ký chỉ thêm

```sql
SELECT cmd.create_production_site($1::jsonb); -- chủ/ban điều hành bên bán
-- {kind:"orchard"|"pond"|"field",name,commune_code?,lat?,lng?,area_m2?,address_detail?}
SELECT cmd.attach_cultivation_photo($1::uuid,$2::jsonb); -- site_id, metadata ảnh
SELECT cmd.record_cultivation($1::uuid,$2::jsonb,$3::text); -- site_id, nội dung, request_key
```

Metadata ảnh theo hợp đồng tệp hiện có: `code,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes`, thêm `generator_version,is_test_data` nếu cần. Adapter phải tải/kiểm tệp trước, DB lưu tham chiếu; DB không xác minh byte trong object storage. Không nhận actor, nguồn, tổ chức hoặc người ghi từ request.

Ví dụ nội dung nhật ký:

```json
{
  "occurred_on": "2026-10-27",
  "activity": "water",
  "note": "Tưới khu A, kiểm rãnh thoát nước sau mưa",
  "photo_document_ids": []
}
```

`activity`: `fertilize` (bón phân), `spray`, `water`, `flower`, `fruit_set`, `harvest`, `weather_incident`, `pest_incident`, `care`. Phun thuốc phải có `medicine_name` và `withdrawal_days` (0–365); `clear_on` do DB tính từ ngày ghi việc, không do client khai. Đây là dữ liệu người ghi cung cấp, không phải hướng dẫn dùng thuốc hoặc kết quả kiểm dư lượng. Thu hoạch phải có `harvested_qty` nguyên gam, có thể gắn `delivery_id`; `shortfall_reason` ghi lý do lượng giao khác lượng thu hoạch. Ngày việc không được sau ngày nghiệp vụ Việt Nam.

Chủ/ban điều hành ghi nguồn `self_recorded` (hiện “tự ghi”); helper chỉ được ghi bằng ủy quyền **`diary.write`** còn hiệu lực, đúng tổ chức, principal còn quyền. Dùng `cmd.delegate_helper(helper_id,ARRAY['diary.write'],valid_during,evidence_id)` và `cmd.revoke_delegation(id)` hiện có. Không mượn user chủ. Nhân viên `field/risk/supervisor` ghi nguồn `agiviet_confirmed` (hiện “nhân viên AgiViet xác nhận”). Nhãn này xác nhận nội dung nhật ký, không chứng nhận mọi lô an toàn.

Sửa bằng cách gọi lại `record_cultivation` với **toàn bộ nội dung thay thế**, thêm `supersedes_id` và `correction_reason`, cùng khóa mới. Chỉ sửa bản hiện hành cùng cơ sở; chủ/helper không sửa bản nhân viên thành tự ghi. Không UPDATE/DELETE kể cả bằng owner thông thường. Lịch sử giữ nguyên; bản hiện hành là hàng không có hàng khác trỏ `supersedes_id`. Retry cùng `org_id/request_key` và nội dung trả cùng UUID; nội dung khác trả `IDEMPOTENCY_CONFLICT`. Cập nhật dự báo hợp đồng có khóa riêng theo đơn, cùng quy tắc.

Để bảo toàn cách ly khi sửa nhầm, mốc chặn lấy **max của mọi bản ghi phun thuốc**, kể cả bản đã được sửa. Không có đường tự xóa/rút ngắn thời gian cách ly. `publish_lot` và `update_lot(...,'confirm')` kiểm ngày hiện tại và ngày hái, rồi chụp mốc vào `lots.spray_clear_on`; giá trị client khai sớm hơn không vượt được nhật ký. Còn cách ly chặn cả đăng “sắp có hàng”, trả hint `ck_lot_withdrawal`.

SELECT `core.production_sites`, `core.cultivation_entries` theo RLS tổ chức; helper chỉ trong phạm vi nhật ký được ủy quyền, nhân viên theo phân công tỉnh. Nhật ký đầy đủ không mở công khai hoặc cho mọi bên mua. Bên mua xem cập nhật/ảnh gắn đúng đơn qua `production_updates`, không thấy toàn bộ sổ riêng của vườn khác.

### Mặt hàng xác minh theo cơ sở, loại và tiêu chí

```sql
SELECT cmd.propose_seller_product(
  $1::uuid, $2::uuid, $3::integer, $4::text,
  $5::jsonb, $6::text, $7::daterange, $8::uuid
); -- site, product, profile_version, grade_code, criteria, inspection_source, valid_during, evidence
SELECT cmd.approve_seller_product($1::uuid);
SELECT cmd.revoke_seller_product($1::uuid,$2::text); -- hồ sơ, lý do
```

Người lập: `field/risk/supervisor`; người duyệt: **người khác**, `risk/supervisor`, cả hai còn phân công. Chứng cứ `evidence` đúng tổ chức sản xuất, `entity='organization'`, `entity_id=org_id`, tạo bằng `attach_entity_evidence` hiện có. Kiểm quyền nhân viên theo tỉnh phân công (NULL = toàn địa bàn). `criteria` là object không rỗng: ghi rõ hạng/kênh, chỉ tiêu, phạm vi và điều chưa kiểm; không biến một bộ tiêu chí nội địa thành chứng nhận xuất khẩu chung.

Ba bảng `seller_product_verifications`, `seller_product_reviews`, `seller_product_revocations` đều chỉ thêm. Hiệu lực khi có review, chưa thu hồi, `valid_during @> ngày nghiệp vụ`; khoảng ngày nên dùng `[từ,đến)` với ngày đến là ngày đầu hết hiệu lực. Đăng/xác nhận lô cần **đúng tổ chức × site × product × profile_version × grade_code** còn hạn; chỉ có hồ sơ danh tính tổ chức chưa đủ. Không có cơ sở hoặc thiếu hồ sơ trả `ck_lot_verified_product`. Lô cũ không được migration tự xác minh; dữ liệu thật phải đi qua hai người. `is_substandard` được đồng bộ từ danh mục loại khi đăng, không chỉ tin cờ client.

SELECT ba bảng theo RLS tổ chức và phạm vi nhân viên. Vai reader BYPASSRLS hiện hữu vẫn có giới hạn như phần 0055: backend phải lọc và kiểm quyền; thay đổi này không tuyên bố đã loại bỏ reader đọc rộng.

### Tạo, ký và nhận cọc hợp đồng vụ

Sau `send_offer` → `accept_offer`, bên mua gọi:

```sql
SELECT cmd.create_seasonal_order(
  $1::text, $2::uuid, $3::text, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb
); -- code, offer_id, 'pre_harvest'|'offtake', terms, metadata PDF, season, batches
```

`terms` theo danh sách trường của `create_order` hiện có. Không nhận loại đơn, actor, vai hay trạng thái tùy ý. Giá/lượng tối thiểu phải khớp lời chào/hold; phí theo gói hiện hành, chính sách và tài khoản ngân hàng kiểm như đơn thường. PDF phải ghi cả khoảng lượng, công thức, vụ, lịch đợt, vật tư và thời hạn trả; adapter chịu trách nhiệm dựng đúng canonical/PDF trước ký.

`season`:

```json
{"harvest_during":"[2026-11-10,2026-12-21)","materials_advance_vnd":2000000}
```

`batches` là array theo thứ tự `batch_no` từ 1; mỗi hàng có `committed_qty`, `delivery_window` (chuỗi PostgreSQL tstzrange), `materials_offset_vnd` (mặc định 0). Tổng lượng đợt bằng `qty_min`/hold; tổng đối trừ bằng vật tư ứng. Cửa sổ từng đợt nằm trong cửa sổ hợp đồng. Đặt trước một đợt, lượng tối đa ≥ tối thiểu, không có vật tư ứng. Bao tiêu nhiều đợt, ban đầu `qty_min=qty_max`; `delivery_window` có thể tới 366 ngày, loại đơn khác giữ giới hạn 90 ngày. `harvest_during` là lịch dự kiến, không ghi nhận đã thu hoạch.

Đặt trước: cọc phần trăm **3000 bps = 30%** trên lượng tối thiểu; giá cố định hoặc `price_mode='formula'` với `unit_price_vnd=deposit_price_vnd=giá sàn` khi lập. Bao tiêu: cọc vụ `deposit_rule='per_unit'`, `deposit_vnd>0` theo thỏa thuận; `payment_timing='after_days'`, mặc định `pay_after_days=7` nếu bỏ trường, có thể ký N ngày khác >0. Không tạo cọc riêng ở từng đợt bao tiêu: cọc vụ giữ suốt vụ, cọc chênh đi qua phụ lục/adjustments của đơn.

Công thức JSON hỗ trợ:

```json
{"floor":18000,"ref_bps":9000,"cap":26000,"scope":"DBSCL"}
```

hoặc `{"floor":18000,"share_bps":5000,"scope":"DBSCL"}`: sàn + 50% phần tham khảo cao hơn sàn. Hai kiểu `ref_bps` và `share_bps` loại trừ nhau; trần tùy chọn ≥ sàn. Giá tính bằng số nguyên và quy tắc làm tròn VND hiện có. Khi chốt, DB lấy `mkt.reference_prices` đúng mặt hàng/loại/vùng, đủ ≥3 giao dịch, ≥2 cặp, **snapshot đúng ngày chốt và không ở tương lai**. Không nhận giá tham khảo từ client, không dùng `external_prices`; thiếu snapshot trả `ck_seasonal_reference`. Worker cần refresh giá trước ngày chốt, không im lặng coi thiếu dữ liệu là giá sàn.

Tiếp tục API cũ: hai bên `sign_document`, buyer `send_order`, system `finalize_signed_order(order,payment_ref,virtual_account,provider)`, callback/requery ngân hàng rồi `activate_order_after_deposit`. Mã ngân hàng/VA phải do adapter cấp. Activation tạo đúng các đợt từ lịch, một cọc vụ, retry không tạo thêm đợt. Không dùng owner để giả đã nhận tiền hoặc tự đi sang active.

### Theo dõi sản lượng, chốt đặt trước và giảm lượng do mất mùa

```sql
SELECT cmd.record_production_update($1::uuid,$2::jsonb,$3::text);
-- order_id, {qty_min,qty_max,harvest_during,note,photo_document_ids?}, request_key
SELECT cmd.propose_harvest_fix($1::uuid,$2::bigint); -- order_id, lượng chốt (gam)
```

Cập nhật sản lượng do chủ/ban điều hành bên bán ghi, chỉ thêm và hai bên đọc theo đơn. Ảnh là evidence dạng image đúng đơn/tổ chức bán, tải qua `attach_evidence`. Không sửa lượng/giá đã ký. Đặt trước active hiện `cho_chot_luong_gia` trong `core.v_seasonal_progress`; DB chặn sẵn sàng giao trước khi phụ lục chốt được áp dụng. Bảng view giữ cả `order_status` và `seasonal_status`, không giả thay trạng thái sổ cái.

`propose_harvest_fix` cho một trong hai bên đề nghị; lượng phải trong khoảng ban đầu, hoặc mức tối thiểu đã giảm bằng phụ lục mất mùa. Giá do DB tính từ công thức ban đầu tại ngày đề nghị; cố định giữ nguyên giá ký. Command tạo amendment `fix_qty_price` với lượng, giá và nguồn tham khảo. Tiếp tục **bên kia** `answer_amendment(...,'accept',metadata_annex)` → hai chữ ký OTP → system `apply_signed_amendment`. Chỉ khi đó mới đổi phiên bản, lượng giao và cọc; tiền chênh dùng `deposit_adjustments`, mã TP và hạn 24h hoặc lệnh hoàn về nguồn hiện có. Không tự động thu tiền khi bấm Đồng ý.

Đặt trước activation tạo deadline `pre_harvest_photo` sau 7 ngày. `record_production_update` có ảnh đúng đơn đáp ứng hạn mở và đặt hạn kế tiếp sau 7 ngày; bản không ảnh không đáp ứng hạn ảnh. Worker dùng hàng deadlines và `expire_deadline_result` hiện có để nhắc/đưa việc cho vận hành; không tự hủy hoặc phát phạt vì quên ảnh.

Mất mùa: `propose_amendment(order,'force_majeure_reduction',{"qty_g":...,"reason":...},evidence_ids)` hiện có, người bán đề nghị, chứng cứ đúng đơn bắt buộc; bên kia đồng ý, hai người ký, system áp dụng. Giảm ở đợt chưa giao cuối; không giảm dưới lượng đã thực hiện, không phạt thiếu như giảm lượng thông thường. Lịch gốc `seasonal_batches` bất biến, lịch/lượng hiện hành đọc `deliveries` theo `effective_version_no`. Nếu đợt cuối không đủ lượng để giảm hoặc lịch vật tư sẽ vượt giá trị đợt, command chặn; cần thỏa thuận lại lịch hợp lệ trước khi tiếp tục, không sửa snapshot/DML.

### Bao tiêu: nhật ký thu hoạch và tiền từng đợt

```sql
SELECT cmd.fix_seasonal_batch_price($1::uuid); -- delivery_id, bên mua/bán có quyền đơn
```

Chốt giá đợt theo giá cố định/công thức đã được hai bên ký, lưu một snapshot bất biến vào `seasonal_batch_prices`, retry trả giá cũ. Trước nghiệm thu/đi giao phải có giá đợt và nhật ký `activity='harvest'` gắn **đúng delivery_id**, vườn và tổ chức bán. Nghiệm thu phải dùng giá đợt; giá hạ cấp vẫn là giá hạ cấp đã ký. Không lấy giá từ request để tăng giá nghiệm thu.

Khi đợt `closed`, trigger chốt `seasonal_batch_accountings` đúng một lần, ghi `contract_charges(kind='materials_offset')` theo lịch, rồi tạo **một `direct_payments(kind='goods_batch')` = giá trị nghiệm thu − vật tư đợt**, đến hạn N ngày từ lúc chốt, kèm deadline. Không trừ cọc vụ khỏi tiền mỗi đợt. Giá trị không đủ vật tư đối trừ bị chặn thay vì tạo khoản âm hoặc chuyển mất nghĩa vụ. Các nhánh đóng tại kho, tại nguồn và sau tranh chấp đều dùng trigger chung; nhánh đồng ý nghiệm thu cũ vẫn giữ các kiểm lượng vượt/chia lại 0050–0052.

Lượng cân giao <80% tổng lượng thu hoạch hiện hành của đợt và chưa có `shortfall_reason` → việc **P2**, dedup `suspected-side-sale:<delivery_id>`, cho nhân viên xem xét “nghi bán ra ngoài”; không tự kết luận vi phạm. Thu hoạch sửa bằng bản mới không được cộng cả hai phiên bản. Cọc vụ không chi tạm qua `create_settlement(...,false,...)`; chỉ quyết toán cuối khi mọi đợt đã kết thúc, hoặc theo quy trình hủy có chứng cứ hiện có. Tiền trả đợt vẫn qua report/confirm/reconciliation và OTP/chứng cứ như trước.

### Bán gấp, hàng dạt và lịch xe

```sql
SELECT cmd.set_urgent_sale($1::uuid,$2::timestamptz,$3::text); -- lot, đến khi, lý do
-- p_until=NULL: chủ tắt cờ.
SELECT cmd.suggest_urgent_sales(); -- system, worker quét định kỳ
SELECT cmd.set_substandard_offer($1::jsonb); -- principal buyer
SELECT cmd.withdraw_substandard_offer($1::uuid);
SELECT * FROM cmd.list_substandard_offers($1::uuid); -- chủ lô dạt
```

Bán gấp ghi `urgent_sale_from/until/reason`, chỉ chủ/ban điều hành, lô chưa khóa an toàn và đã xác minh/cách ly xong. Có deadline tắt cờ; không công khai lý do khẩn cấp trong `mkt.search_lots`. Gợi ý là hàng riêng `urgent_sale_suggestions`, chỉ chủ đọc: hàng tươi (`shelf_life_days<=10`) đang bán ≥24h từ xác nhận, không có lời hỏi hợp lệ trong 24h, không khóa an toàn. Không tự bật cờ, đổi giá hoặc hứa có người nhận hàng. Worker retry không nhân gợi ý. Lời hỏi tự từ chối dưới giá kín không làm lộ hoạt động bên mua qua gợi ý.

Lời chào hàng dạt nhận `product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during`; loại phải là `is_substandard` trong danh mục, đối tác bao tiêu cần giá sàn, giá nếu có phải dương. Khoảng mùa `[từ,đến)`. Bộ đọc chỉ trả cột chào công khai của đối tác active, đúng mặt hàng/loại và còn hạn; `min_qty/radius_km` là điều kiện để backend đối chiếu tuyến/lượng, chưa tự xác nhận khả năng nhận. Rút chào giữ hàng lịch sử, đặt khoảng hiệu lực rỗng. Chỉ là lời chào, giao dịch vẫn đi qua offer/hold/hợp đồng; không biến hàng nghi không an toàn thành hàng dạt để bán lại.

Seed thêm `DEMO-66C-001`…`004`, xe thường 10 tấn, thuộc nhà xe ảo hiện có. Không thêm người dùng hoặc thay 20 lô nền. `trips_vehicle_id_scheduled_during_excl` tiếp tục chặn trùng xe **đang phục vụ**; loại `completed/cancelled` không chiếm lịch. Khi tất cả đợt của chuyến đã `closed/shortfall_ended/cancelled`, trigger tự đưa chuyến về `completed`, ghi `completed_at=ref.clock_at()`, giữ nguyên khoảng lịch sử. Chuyến gộp còn một đợt chưa kết thúc vẫn giữ xe. Migration đối chiếu cả chuyến cũ có đủ chứng cứ đợt kết thúc; chuyến chưa có đợt không bị coi là đã xong. `book_trip` vẫn nhận cửa sổ giao của đợt, `trips.created_at` và mốc kết thúc dùng đồng hồ nghiệp vụ, không gọi `now()` để tự dựng lịch mới.

### Seed, kiểm thử và giới hạn

`db/seed/010_nhat_ky_va_hop_dong_vu_ao.sql` thêm 15 việc một vụ của chị Năm (`0918***421`), vườn xoài Cát Chu có hồ sơ loại theo hai người, hai **dự thảo mô phỏng chưa ký/chưa cọc** `DEMO56-PRE_HARVEST` và `DEMO56-OFFTAKE`, ba đợt bao tiêu và bốn xe. Các tổ hợp mặt hàng/cơ sở/loại đã có trong seed được thêm hồ sơ **ảo có nhãn**, chứng cứ đúng tổ chức. Không tự xác minh dữ liệu production. Ảnh/PDF seed là tham chiếu ảo có `is_test_data`, không phải tệp đã khảo sát/ký thật; adapter cần dựng tài liệu/tải ảnh thật cho giao dịch thật. Seed chạy lại không nhân nhật ký, hợp đồng, xe hoặc số dư.

Các SQL tests 230/235/240 kiểm login thật không owner, RLS, helper, hai người, append-only/retry, cách ly, dự báo, phụ lục ký/cọc chênh, công thức giá, mất mùa, tiền đợt bao tiêu, P2 và giải phóng xe gộp. Kết quả và lệnh chạy lại: [09-ket-qua-nhat-ky-va-hop-dong-vu.md](09-ket-qua-nhat-ky-va-hop-dong-vu.md). Đây là phần CSDL; chưa thêm endpoint/UI mới hoặc triển khai live. PGlite chưa chứng minh đua khóa giữa nhiều phiên PostgreSQL native.
