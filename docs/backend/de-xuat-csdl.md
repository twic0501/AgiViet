# Đề xuất thay đổi CSDL từ phía backend

Backend không sửa `db/`. Các điểm dưới đây gặp khi nối backend vào lược đồ 0001–0032; ưu tiên từ cao xuống.

## 1. Bọc các bước điều phối thành cmd.* (ưu tiên cao)

DB hiện có command cho: ký (`cmd.sign_document`), xác nhận tiền (`cmd.confirm_direct_payment`), quét QR (`cmd.scan_qr`), OTP (`cmd.record_otp`, `cmd.otp_verification`), sự kiện ngân hàng (`cmd.record_bank_event` + `core.apply_bank_event`), điều chỉnh sổ (`cmd.post_correction`), gọi lại lệnh (`cmd.confirm_payout_callback`), hoàn tiền treo (`cmd.complete_bank_return`).

Mọi bước khác (tạo/đăng lô, nhu cầu, lời chào, giữ lượng, lập đơn + order_versions + tài liệu, chuyển trạng thái đơn/đợt/cọc, khoản trả thẳng, báo đã trả, chuyến xe, nghiệm thu, lô con, quyết toán, lệnh ngân hàng, hủy, hàng việc) backend đang chạy bằng **kết nối điều phối = owner** trong PGlite, đặt `app.user_id/org_id/actor_kind` từ phiên đã xác thực. Trigger/CHECK của DB vẫn chặn chuyển sai, nhưng đây trái với khuyến nghị `docs/database/06` ("không chạy bằng owner"). Đề xuất:

- Tạo vai `agiviet_orchestrator` (NOLOGIN, không BYPASSRLS) cho tiến trình backend và các hàm `cmd.*` SECURITY DEFINER tương ứng từng lệnh nghiệp vụ, nhận tham số đã kiểm (không nhận actor từ client), tự gọi `cmd.enter_actor()`.
- Danh sách tối thiểu theo thứ tự luồng: `cmd.create_lot`, `cmd.publish_lot`, `cmd.create_demand`, `cmd.send_offer`, `cmd.accept_offer` (tạo hold), `cmd.create_order` (orders + order_versions + documents cùng giao dịch), `cmd.report_payment`, `cmd.assign_receiver`, `cmd.book_trip`, `cmd.start_acceptance`, `cmd.submit_acceptance`, `cmd.agree_acceptance`, `cmd.confirm_arrival`, `cmd.request_cancel`, `cmd.answer_cancel`; phía hệ thống: `cmd.activate_order_after_deposit`, `cmd.create_settlement` (+ lệnh), `cmd.send_instruction`, `cmd.reconcile_instruction`, `cmd.expire_deadline`.
- Khi đã có, backend đổi `src/db/co-so-du-lieu.ts` sang gọi các hàm này dưới login riêng (D-01) và bỏ quyền owner.

## 2. `cmd.sign_document` chưa nhận `statements`

`core.guard_signature_party` đòi `abnormal_price_ack` trong `signatures.statements` khi đơn có `flag_abnormal_price`, nhưng `cmd.sign_document(p_doc, p_party, p_otp, p_device)` không có tham số statements. Backend phải chèn chữ ký trực tiếp (owner + ngữ cảnh người bán) cho trường hợp này. Đề xuất thêm `p_statements text[] DEFAULT '{}'`.

## 3. Ký biên bản tại chỗ (BBNT) không có command

`cmd.sign_document` cố định `method='otp'` và mục đích OTP chỉ có `contract_sign/amendment_sign/money_received`. Ký BBNT bằng PIN/sinh trắc (N-03) dùng `method='qr_confirm'`, backend chèn trực tiếp. Đề xuất `cmd.sign_record(p_doc, p_party, p_method, p_device, p_pin_receipt)` với biên nhận xác thực lại do auth worker ghi (tương tự OTP) và mục đích OTP `record_sign` cho trường hợp không có PIN.

## 4. Đồng hồ: `created_at`/`occurred_at` dùng now() thật

Ở môi trường thử backend có đồng hồ tua; DB dùng `now()` thật (đúng N-07). Hệ quả:
- `ledger.post` chặn ngày hiệu lực lệch quá 7 ngày so với `posted_at` (`ck_ledger_effective_window`) → backend phải ghi `occurred_at` của sự kiện ngân hàng và `computed_at` quyết toán bằng giờ thật, không phải giờ đồng hồ thử.
- `core.deadlines.created_at` mặc định now() trong khi `due_at` theo đồng hồ thử → backend truyền `created_at` rõ.
Đề xuất: ghi rõ trong `docs/database/06` cột nào phải là giờ thật, cột nào được nhận giờ nghiệp vụ.

## 5. Bảng phiên và OTP đăng nhập

Chưa có bảng phiên đăng nhập, thiết bị, OTP đăng nhập (mục đích `login` không có trong `evt.otp_challenges`). Backend giữ trong bộ nhớ → mất khi khởi động lại, không chạy nhiều tiến trình được. Đề xuất `auth.sessions(id, user_id, org_id, device_id, token_hash, expires_at, revoked_at)` và thêm mục đích `login`, `login_new_device` cho OTP.

## 6. "Đơn đầu" và `core.historical_trades`

`core.refresh_contact_grant` đếm cả `core.historical_trades` khi xét ngưỡng mở liên lạc. Seed có 4 giao dịch lịch sử Sáu → Tư Hùng, trong khi `09` TH-015/TH-051 coi cặp này là "đơn đầu" (phí 1%). Backend tính phí đơn đầu chỉ theo đơn hoàn tất trên app. Đề xuất thống nhất: thêm cột `counts_as_relationship boolean` cho `historical_trades` hoặc ghi rõ quy tắc ở đặc tả.

## 7. Trạng thái cọc khi có lệnh

`core.deposits.status` có `held → processing → fully_processed` nhưng không trigger nào tự chuyển khi lệnh chi/hoàn được tạo/đối soát; backend hiện không chuyển (để tránh trạng thái lệch). Đề xuất trigger theo lệnh ngân hàng, hoặc ghi rõ ai chuyển.

## 8. Khoảng thời gian QR nhận hàng

`core.guard_delivery_ready` đòi có lượt quét QR nhận hàng `accepted` của người nhận trước cả `ready → in_transit` (người bán xuất hàng khi giao tại kho). Ở giao tại kho, người nhận không có mặt lúc bốc. Đề xuất chỉ đòi quét khi `checking` (hoặc dùng thẻ chuyến QR-03 cho lúc xuất hàng). Hiện backend bắt người bán nhập mã 6 số do người nhận đọc từ xa lúc xuất hàng.

## 9. Cấp vai chủ cho tổ chức mới đăng ký

`core.guard_privileged_membership` chỉ cho CHỦ hiện hành cấp vai đặc quyền. Tổ chức mới đăng ký chưa có chủ nên không ai cấp được vai `owner` (seed vượt qua bằng cách tắt trigger). Backend đăng ký được người dùng + tổ chức `pending` + thành viên không vai, rồi dừng. Đề xuất: `cmd.bootstrap_owner(org, user, decision)` chỉ chạy khi tổ chức vừa được vận hành xác minh, có quyết định hai người, hiệu lực sau 24 giờ.

## 10. Hoàn cọc chênh khi phụ lục giảm cọc

`core.guard_instruction` chỉ nhận `basis_kind` settlement/cancellation/excess/fee_refund/debt_offset/ops_decision; không có căn cứ cho lệnh hoàn cọc chênh ngay khi phụ lục giảm lượng/giá được ký (04 mục 4). Backend ghi `deposit_adjustments` âm và để phần chênh về bên mua ở quyết toán cuối (cùng số ròng, chậm hơn đặc tả). Đề xuất `basis_kind='deposit_adjustment'` trỏ `deposit_adjustments.id` có `delta_deposit_vnd<0`, giới hạn đúng số chênh, về tài khoản nguồn.

## 11. Thời gian chờ tài khoản nhận tiền theo giờ thật

`core.guard_bank_account` so `cooldown_until` (tính từ `created_at` mặc định `now()`) với `clock_timestamp()` thật; đồng hồ thử của backend không tua được 24 giờ chờ, nên kiểm thử kích hoạt phải ghi `created_at` lùi trong DB thử. Đề xuất dùng `ref.clock_at()` như các hàm khác.

## 12. Xóa vai thành viên

Backend bỏ vai bằng `DELETE FROM core.membership_role_grants` (không có trạng thái thu hồi, không lịch sử ngoài audit). Đề xuất cột `revoked_at/revoked_by` thay cho xóa.

## Cập nhật phiên 5 (26/10/2026)

Đã dùng từ 0033–0037: mục 9 (chủ đầu tiên hai người), mục 10 (hoàn cọc chênh theo phụ lục), mục 11 (cmd.test_clock), một phần mục 1 (activate_bank_account, refund_deposit_reduction, sync_document, send_instruction, finish_order). Đề nghị thêm cho DB: (a) `sync_document` nhận cả tài liệu `draft` do command tạo, hoặc backend phải tạo tài liệu qua `create_order`/`attach_evidence`; (b) command hết hạn có trả về loại xử lý để backend gửi thông báo đúng; (c) command cho phân xử tranh chấp, hạch toán hủy, khung/nhóm để bỏ owner hoàn toàn.

## 13. Kiểm thử tích hợp command 0001–0047 (Codex, 26/10/2026)

Các mục 1–12 phía trên giữ như lịch sử, không phản ánh toàn bộ mã hiện tại. Runtime đã bỏ DML nghiệp vụ trực tiếp và không dùng owner để lấp command thiếu. Chi tiết ánh xạ/quyền: [chuyen-command.md](chuyen-command.md).

| Điểm cần DB hoặc hợp đồng API bổ sung | Bằng chứng tích hợp / ảnh hưởng |
|---|---|
| close_unsigned_order/release_hold/process_unsigned_cancellation ghi hold.status=released nhưng ref.statuses/transitions chỉ có cancelled/expired/committed | TH-042 rollback với ck_status_transition; backend trả 501 rõ, không sửa hold bằng owner. Xem 0038, 0047 so với 0004. |
| finalize_signed_order đặt hạn cọc 24 giờ cho mọi sản phẩm | TH-006 và TH-043 vẫn yêu cầu hàng tươi 12 giờ theo chính sách backend; không giả đồng hồ để ép command hết hạn sớm. |
| create_lot/update_lot/attach_entity_evidence không hỗ trợ ủy quyền helper | TH-003, TH-061; helper hiện bị từ chối, không giả principalUserId thành actor ký. Cần command kiểm đúng delegation và ghi người giúp thật. |
| send_offer/reply_offer không có nhánh tự từ chối kín dưới floor | TH-011/012/015; backend chặn 501 trước gửi, không tạo lời chào sent ngoài ý muốn. Cần command atomically tạo auto_rejected/rejected và không thông báo cho seller. |
| Recipient báo chưa nhận tiền ngay chưa có command | TH-020; expire_deadline_result đã hỗ trợ hết 48 giờ, nhưng không thay hành động chủ động not-received. |
| Đăng ký user/org/subscription, xác minh organization tổng quát chưa có command | TH-001/TH-001B dừng ở 501; bootstrap_owner vẫn có command nhưng fixture đăng ký API không tạo được. |
| Đổi subscription chưa có command | GD-05; không cấp DML subscription hoặc làm thay đổi gói bằng owner. |
| agree_acceptance không cam kết lượng vượt, close_delivery chuyển lượng vượt từ in_transit thiếu nguồn | TH-037b: trước khi thêm chặn sớm đã tái hiện ck_qty_non_negative ở arrival/confirm. Hiện nhận vượt bị từ chối 501. Cần command nhận vượt chuyển available→committed→in_transit nguyên tử, giới hạn dung sai. |
| Giao tại nguồn: command mới chuyển delivered/returned_pending ở close_delivery nơi đến | TH-006/024 mong chuyển lượng và tách lô con ngay khi NB đồng ý tại nguồn. Không thể gọi create_return_lot trước khi có returned_pending. Cần thống nhất thời điểm ledger/rủi ro và command tương ứng. |
| Sau open_dispute, delivery thành disputed; submit_acceptance từ chối còn tranh chấp | TH-027 và GD-04: luồng cân lại/gửi lại cũ không dùng được. Cần command tái lập bản nghiệm thu sau phản đối hoặc API riêng cho quyết định/withdraw_dispute đúng chữ ký. Không tự đóng tranh chấp bằng owner. |
| expire_deadline_result với arrival_check chỉ tạo việc, không thực thi điều khoản im lặng đã ký | TH-029x mong tự chốt sau 2 giờ; hiện giữ mở để điều phối theo kết quả command. Cần command riêng chốt theo điều khoản và chuyển lượng đúng một lần. |
| Command tạo payment code BEFORE, top-up reference TOPUP thay TT1/COCBS | GD-03 và TH-AM-1 assertion mã cũ không đạt dù số tiền đúng. Nếu mã là opaque thì cần quyết định cập nhật hợp đồng/kiểm thử; backend không tự sửa mã DB đã ký/ngân hàng đang dùng. |
| Không command đăng metadata PDF hệ thống settlement_statement/chứng từ lệnh đã xác nhận | Quyết toán vẫn chạy DB; PDF snapshot lưu bản trình bày backend riêng, không giả chữ ký hoặc ghi core.documents bằng owner. Cần entry point system có whitelist/căn cứ immutable. |
| Cache AI match_candidates thiếu command | TH-004ai: 6 kiểm AI đạt, kiểm ghi cache hỏng; API vẫn dùng kết quả AI. Cần command nhận snapshot/hash/expiry và định dạng whitelist, hoặc chốt không yêu cầu cache. |
| BBNT cần receipt tái xác thực, API cũ gửi kết quả không có PIN/OTP | Đã nối record_reauthentication + sign_record và thêm pin đầu vào. Nếu buộc tương thích tuyệt đối với body cũ cần thiết kế receipt gắn đúng document từ bước trước; không dùng QR hay login OTP giả thành PIN/biometric receipt. |

Một ca cũ TH-046 cũng không còn đi qua khi xin hủy force_majeure không có evidence: command mới yêu cầu chứng cứ đúng đơn. Đây là kiểm chặt hơn của DB, cần bổ sung bằng chứng thật ở client/fixture; không tạo chứng cứ giả từ reason_text. Gửi/phân quyền booking tương tự: command không cấp kế toán đặt xe thay purchaser/chủ.

Chạy lại theo mã: `cd backend && npx tsx test/chay-tinh-huong.ts TH-042 TH-043 TH-037b TH-029x`. Không sửa db/ trong đợt backend này.

## 14. Sau khi dùng 0048–0050 (Claude, phiên 6, 26/10/2026)

Các dòng của mục 13 đã được 0048–0050 giải quyết và backend đã dùng: helper (require_lot_editor/delegate_helper), tự từ chối kín, báo chưa nhận, đăng ký/gói, nhận vượt, chốt tại nguồn, rút phần tranh chấp, cache AI; TH-042/043/029x đạt. Còn đề nghị:

| Điểm | Ảnh hưởng |
|---|---|
| Biên nhận gói phải bằng đúng giá tháng; chính sách 11 mục 2 tính tháng đầu theo ngày còn lại | API trả `tien_thang_dau_vnd` (theo ngày) và `gia_thang_vnd`; billing mô phỏng ghi giá tháng. Cần thống nhất số thu thật. |
| Seed ủy quyền người giúp chỉ có `lot.draft`; DB đòi `lot.update` cho giá/đăng | Đúng nguyên tắc tối thiểu; kiểm thử cấp thêm qua API. Nếu nghiệp vụ muốn “người giúp đăng lô” mặc định thì sửa seed. |
| Không có đường một người xác minh tổ chức mới | `/v1/ops/orgs/{id}/verify` giữ 501. Nếu không cần thì bỏ endpoint ở bản sau. |
| Mời người chưa có danh tính | Backend trả 501 tới khi nối `create_invitee`/broker danh tính (chưa kiểm phiên này). |
| Mã khoản/bổ sung cọc/việc do DB cấp (BEFORE, TOPUP-uuid, TASK-uuid) | Nội dung chuyển khoản `TOPUP-<uuid>` dài với ngân hàng; đề nghị mã ngắn có kiểm tổng. |

## 15. Từ kiểm giao diện lượt 3 (Claude, 26/10/2026)

| Điểm | Bằng chứng | Đề nghị |
|---|---|---|
| `refund_deposit_reduction` (0036) hoàn cả phí chênh khi phí giảm, nhưng guard 0040 chỉ cho hoàn phí với `decrease_qty`/`force_majeure_reduction` | Phụ lục `change_price` giảm giá làm cọc và phí giảm: `apply_signed_amendment` lỗi `ck_instruction_fee_refund` "Hoàn phí thiếu căn cứ/vượt quyền", cả lần ký rollback. TH-AM-2 tái hiện. | Chọn một: (a) Q06 không hoàn phí khi giảm giá → command chỉ hoàn cọc, phí giữ (hoặc ghi giảm phí phải thu); (b) cho phép hoàn phí theo delta với `change_price`. Backend hiện trả 501 `CHUA_HO_TRO` rõ, không ghi đè. |
| Cân lại/chia lại khi còn dòng tranh chấp | `submit_acceptance` (0046) chặn khi đợt `disputed` hoặc còn tranh chấp chưa resolved; không có command cho bên mua lập lại kết quả theo lựa chọn `chia_lai` (chỉ có rút phần 0050 và kiểm định). Giao diện nhận 403 trước đây. TH-R2-CANLAI. | Thêm command “sửa kết quả sau phản đối” (bên mua lập bản mới thay dòng tranh chấp, đóng tranh chấp khi người bán ký bản mới). Backend trả 501 rõ, không quảng cáo hành động `resubmit_acceptance` khi chưa có biên bản rút. |

## 16. Sau 0051–0052 (Claude, 26/10/2026)

Đã dùng: phụ lục giảm giá (hoàn cọc chênh, giữ phí Q06, TH-AM-2 đạt), mã nạp cọc ngắn `TP` + 12 số (TH-AM-1), `create_invitee` (mời người mới, đã dùng từ trước, bỏ stub 501), `revise_acceptance_after_objection` (chia lại sau phản đối).

| Điểm | Bằng chứng | Đề nghị |
|---|---|---|
| `revise_acceptance_after_objection` so `tc.created_at + 24h <= ref.clock_at()`, nhưng `core.disputes.created_at` mặc định `now()` (giờ thật) còn `ref.clock_at()` là đồng hồ nghiệp vụ | Môi trường thử tua đồng hồ (2026-11-04) nên mọi tranh chấp tạo lúc giờ thật (2026-10-26) bị coi đã quá 24 giờ → `ck_dispute_scope`. TH-R2-CANLAI hỏng 5/7 bước ở môi trường thử; production (bảng clock rỗng) không bị. | `open_dispute` ghi `created_at = ref.clock_at()` hoặc so với `due_at` của hạn `dispute` (đã tạo theo clock). Theo bảng thời gian ở hướng dẫn 06, mốc nghiệp vụ phải dùng `ref.clock_at`. |

## 17. Chạy trên PostgreSQL thật với pool (Claude, 26/10/2026) — CHẶN TRIỂN KHAI

Backend đã có driver `pg` (pool, SERIALIZABLE, thử lại 40001/40P01). Trên PGlite, một kết nối đổi `SET SESSION AUTHORIZATION` giữa các login trong cùng giao dịch (reader → login danh tính → meta → điều phối). Trên PostgreSQL thật lệnh này cần superuser, nên runtime không dùng được nếu không chạy owner.

Phương án trong backend: pool đăng nhập bằng `agv_backend_gateway` (NOINHERIT, không superuser), mỗi giao dịch `SET LOCAL ROLE` sang reader rồi sang login danh tính khi gọi command. **Nhưng mọi command xác định danh tính bằng `session_user`** (`cmd.enter_actor`, `require_system` qua `pg_has_role(session_user,'agiviet_orchestrator')`, `record_registration` qua `pg_has_role(session_user,'agiviet_auth_worker')`, `cmd.login_principals.login_name=session_user`). Dưới `SET ROLE`, `session_user` vẫn là login cổng nên mọi command sẽ trả `KHONG_CO_QUYEN`.

Một nghiệp vụ cần nhiều login trong cùng một giao dịch nguyên tử (ví dụ ký + phát sự kiện + điều phối). Tách mỗi login thành kết nối riêng sẽ mất tính nguyên tử, nên không chọn cách đó.

Đề nghị DB (chọn một):
1. `cmd.enter_actor` và các kiểm `pg_has_role(session_user, …)` dùng `current_user` khi `session_user` là login cổng tin cậy (`agv_backend_gateway`, NOINHERIT, chỉ là thành viên của các login danh tính đã ánh xạ). Giữ nguyên `session_user` cho mọi login khác. Kèm kiểm: login cổng không có quyền nào ngoài SET ROLE, và `current_user` phải nằm trong `cmd.login_principals`.
2. Hoặc dùng một GUC đã ký (HMAC phía DB với khóa trong bảng chỉ owner đọc) để chuyển danh tính. Cách này phức tạp hơn và không khuyến nghị.

Ngoài ra:
- Phiên đăng nhập đã lưu bền qua `record_login_session`/`lookup_session`/`revoke_session`. Thử thách OTP đăng nhập *trước khi kiểm* và bộ giới hạn gửi OTP vẫn ở bộ nhớ (mất khi khởi động lại; người dùng chỉ phải xin mã mới). Phiên của tổ chức chờ xác minh và của người giúp (không có membership active) chưa có đường DB, nên vẫn ở bộ nhớ.
- `infra/oracle/docker-compose.oracle.yml` đang đặt `DATABASE_URL` của backend là `agiviet_owner`. Backend production từ chối URL owner/superuser, nên hạ tầng cần URL `agv_backend_gateway` sau khi chạy `backend/scripts/cap-quyen-postgres.sql`.
- Bỏ BYPASSRLS cho reader cần chính sách đọc thêm: lô `on_sale/upcoming/sold_out` và nhu cầu `open` công khai (không gồm giá kín), vai vận hành theo `staff_assignments`, và chính sách cho các bảng bật RLS chưa có chính sách đọc. Khi chưa có, backend giữ reader BYPASSRLS chỉ có SELECT và tự kiểm quyền đọc ở API.

## 18. Sau chạy Postgres thật (Claude, 26/10/2026)

Mục 17 đã xong nhờ 0054–0055; `npm run test:pg` đạt 56/56. Không phát hiện lỗi DB mới. Ghi nhận một điểm: owner (session superuser) `SET ROLE` sang login danh tính bị `effective_login` chặn. Đây là đúng thiết kế, nên fixture thử phải gọi command qua cổng, không qua owner.
