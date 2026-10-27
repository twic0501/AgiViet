# Chuyển runtime sang command (Codex, 26/10/2026)

## Phạm vi và quyền

Chỉ sửa `backend/` và `docs/backend/`; đọc migrations 0001–0047. Không thay DB để làm xanh kiểm thử.

**Số bước ghi nghiệp vụ còn chạy owner trong chế độ thường: 0.** Rà `backend/src/nghiep-vu/` và `backend/src/pdf/` không còn SQL INSERT/UPDATE/DELETE, gọi `ledger.move_qty`, `core.issue_qr` hoặc `core.scan_qr` trực tiếp. Các helper đổi trạng thái/tạo/đóng hạn cũ chỉ ném `CHUA_HO_TRO`.

Owner chỉ nằm trong khởi tạo migrations/seed/cache, khởi tạo vai khi nạp/đặt lại và `nhapDuLieuThu` (import fixture chỉ trong môi trường thử, không có HTTP endpoint). Không có fallback owner trong `tx`/`doc`, kể cả môi trường thử. Khi giao dịch lỗi, lớp kết nối có thể reset session để phục hồi kết nối vật lý; không chạy nghiệp vụ bằng owner trong đoạn phục hồi.

- `agv_backend_read`: login không superuser, SELECT, BYPASSRLS để giữ các truy vấn hiện hành với phân quyền API. Không có DML bảng nghiệp vụ. Đây **chưa phải** mô hình đọc RLS hoàn chỉnh cho production.
- `agv_u_<hash>`: mỗi user/tổ chức/phía kế thừa `agiviet_app`; command tự lấy danh tính từ session_user. Không đổi người thao tác sang chủ tổ chức để né kiểm quyền.
- `agv_s_<hash>`: login điều phối riêng, kế thừa `agiviet_orchestrator`.
- `agv_backend_auth` / `agv_backend_bank`: login riêng kế thừa worker tương ứng, không SET ROLE từ owner trong runtime.
- `agv_backend_broker`: CREATEROLE, quyền quản trị cấp agiviet_app/orchestrator và DML **chỉ** login_principals, không DML bảng nghiệp vụ. Chỉ helper tin cậy của backend dựng ánh xạ; HTTP không nhận tên login. Chưa có broker/pool PostgreSQL production đã được kiểm định.
- `agv_backend_meta`: idempotency và phát thêm sự kiện API/outbox; không quyền tiền/lượng hay trạng thái nghiệp vụ. Sự kiện cốt lõi do command/trigger ghi nguyên tử cùng nghiệp vụ.
- `agv_backend_clock`: chỉ ghi cmd.test_clock ở môi trường thử; không owner ghi đồng hồ mỗi giao dịch.

PGlite vẫn giả lập các kết nối trên **một** kết nối vật lý bằng SET SESSION AUTHORIZATION. Không được coi đây là chứng minh an toàn pool chung hoặc nhiều transaction PostgreSQL thật. Production vẫn từ chối khởi động vì chưa có driver/pool production.

## Ánh xạ đã nối vào runtime

| Nhóm | Command thực sự gọi |
|---|---|
| Lô | create_lot, update_lot(price/confirm/close), publish_lot, attach_entity_evidence |
| Nhu cầu | create_demand, raise_demand_price, close_demand; publish cũ xác nhận nhu cầu đã open |
| Chào/giữ | send_offer, reply_offer, accept_offer; giới hạn lượt suy từ offer_rounds, không UPDATE counters |
| Đơn/ký | create_order, request_order_approval, approve_order, sign_document (cả statements giá bất thường), send_order, sync_document, finalize_signed_order |
| Cọc | record_bank_event + core.apply_bank_event dưới bank worker, activate_order_after_deposit, refund_excess, refresh_deposit gián tiếp qua command tiền |
| Khoản trực tiếp | attach_evidence, report_payment, confirm_direct_payment; khoản mới do activation/acceptance/amendment/cancellation/settlement tạo |
| Giao nhận | assign_receiver, book_trip, accept_trip dưới dispatcher thử riêng, ready_delivery, scan_qr, dispatch_delivery, start_acceptance, submit_acceptance, record_reauthentication + sign_record, send_acceptance, agree_acceptance, resolve_shortfall, confirm_arrival, begin_arrival_check, close_delivery, finish_warehouse_delivery, create_return_lot |
| Quyết toán | create_settlement, send_instruction, reconcile_instruction có statement_line đúng mã/số/đích, finish_order |
| Hủy | close_unsigned_order (hiện DB lỗi released), request_cancel, answer_cancel, process_cancellation/process_unsigned_cancellation, finish_cancellation |
| Phụ lục | propose_amendment, answer_amendment, sign_document, apply_signed_amendment; hoàn cọc/phí do DB, không tính lại ở backend |
| Tranh chấp | open_dispute, claim_arrival_difference, request_inspection, record_inspection_result dưới login inspector đã xác thực webhook, close_resolved_delivery |
| Thành viên | create_invitee, invite_member, verify_invitation_contact, accept_invitation, grant_member_role, revoke_member_role, update_member |
| Chủ đầu tiên | propose_owner_verification, approve_owner_verification, bootstrap_owner |
| Tài khoản nhận | request_bank_account, verify_bank_account, activate_bank_account, lock_bank_account |
| Việc/callback | create_task, act_on_task, record_call, confirm_payout_callback |
| Nền | expire_deadline_result, claim_outbox, finish_outbox |

Các command khung/nhóm, quyết định hai người tổng quát, chính sách, đảo sổ, hoàn tiền treo đã có ở DB nhưng chưa có API mới ở backend. Không thêm endpoint hoặc quyền gọi helper nội bộ để lấp phạm vi chưa triển khai.

## API và tài liệu

Giữ các URL và envelope cũ; cập nhật OpenAPI 117 path/127 operation. Không đổi tên trường response quyết toán hoặc phụ lục. Mã khoản/tiền bổ sung là mã do DB cấp (BEFORE, TOPUP), khác mẫu mã cũ ở một số assertion của bộ hồi quy.

Có thay đổi hành vi an toàn, chưa thể gọi là tương thích hoàn toàn:

- Đăng ký tổ chức, xác minh tổ chức tổng quát, đổi gói, người nhận báo chưa nhận, thao tác người giúp, tự từ chối kín dưới sàn, nhận vượt trong dung sai: trả 501 CHUA_HO_TRO tại nhánh thiếu command phù hợp.
- Gửi/ký BBNT dùng PIN được auth worker kiểm, receipt đúng user/document/device rồi sign_record. Request gửi BBNT cần pin (thử 2468); không giả receipt từ QR hay phiên đăng nhập. Đây là bổ sung đầu vào bắt buộc so với API cũ.
- Rút tranh chấp không nhận withdrawn_g do bên mua tự khai; DB yêu cầu người bán ký đúng bản và withdraw_dispute. Luồng cũ gửi lại sau phản đối chưa hoạt động.
- Booking command chỉ cho các vai DB chấp nhận; không giả người thao tác thay kế toán. Cổng nhà xe thử nhận bằng login dispatcher riêng.
- PDF hợp đồng/phụ lục/BBNT/biên bản hủy/kiểm định: upload bytes trước, đưa metadata vào command cùng giao dịch. Không tự INSERT core.documents, không tự INSERT chữ ký.
- PDF quyết toán: dựng **bản trình bày** từ snapshot DB, lưu sidecar trong backend, trạng thái draft/presentation_only, không giả chữ ký. GET metadata/file và danh sách tài liệu đơn đọc được sau khi kiểm lại settlement tồn tại và quyền trên đơn. Chưa có command đăng metadata settlement_statement vào core.documents; chứng từ lệnh thanh toán tự sinh trước đây cũng chưa có đường metadata system tương ứng. Không dùng attach_evidence dưới danh tính khách để né việc này.
- AI /match vẫn chạy; không ghi cache match_candidates khi DB chưa có command. Không coi gợi ý là bằng chứng xác minh.

## Kiểm thử và giới hạn

Kết quả đầy đủ ở `backend/test/ket-qua-khong-ai.json`, `ket-qua-co-ai.json`, `ket-qua-quyen-command.json`; số tổng được ghi trong TIEN-DO và đánh giá thành thật. Các assertion nghiệp vụ cũ không được thay thành “mong 501” để báo xanh. Một số tình huống dừng sớm nên tổng bước thực sự chạy thấp hơn mốc 384.

Chỉ sửa dữ liệu/đầu vào kiểm thử: thêm PIN rõ ràng ở request gửi BBNT, đặt xe bằng người có quyền theo command, và chuyển fixture tài khoản ngân hàng ghi lùi giờ sang hàm import thử riêng. Bộ kiểm quyền mới tách riêng khỏi 52 tình huống cũ, không dùng để thay thế số hồi quy.

AI được chạy bằng Python venv có sẵn, bản sao mã/dữ liệu dưới backend/.tmp/ai-runtime và audit ghi ở đó, không sửa hoặc phát sinh tệp trong ai/.

Các sai khác DB/thiếu command và cách tái hiện nằm ở mục 13 của de-xuat-csdl.md. **Chưa đạt điều kiện nghiệm thu mọi tình huống xanh; chưa sẵn sàng production.**
