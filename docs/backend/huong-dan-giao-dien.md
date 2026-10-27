# Hướng dẫn cho kỹ sư giao diện: dùng backend AgiViet v2

Tài liệu đầy đủ từng đường dẫn: [openapi.yaml](openapi.yaml). Tài liệu này nói cách bắt đầu và thứ tự gọi API cho các màn chính (đặc tả màn ở `docs/nghiep-vu/12` phần B).

## 1. Chạy backend thử

```sh
cd backend
npm start          # http://127.0.0.1:8080  (đổi bằng PORT, HOST)
```

- Môi trường thử (mặc định `AGV_MOI_TRUONG=thu`): DB PGlite chạy trong tiến trình, nạp dữ liệu ảo từ `db/seed`, đồng hồ thử bắt đầu `02/11/2026 08:00 (+07)`.
- OTP thử luôn là `123456`; PIN app thử khi ký biên bản tại chỗ là `2468`.
- Dữ liệu mất khi tắt máy chủ (DB trong bộ nhớ). Muốn về trạng thái sạch: `POST /v1/test/reset`.
- Bộ kiểm thử tự động gọi đúng các API này: `backend/test/luong.ts` là ví dụ chạy được cho từng bước của luồng thuận.

## 2. Đăng nhập

```http
POST /v1/auth/otp/send     {"phone":"0918000421"}
→ {"challenge_id":"…","het_han_giay":300,"ma_thu":"123456"}
POST /v1/auth/otp/verify   {"challenge_id":"…","phone":"0918000421","code":"123456","device_id":"may-chi-nam"}
→ {"token":"…","user":{…,"roles":["owner"],"actions":["lot.create",…]}}
```

Mọi lệnh sau gửi `Authorization: Bearer <token>`. Nên gửi `x-device-id` cố định cho mỗi máy (ghi vào chữ ký và lịch sử).

`user.actions` là danh sách **hành động được phép** (quyền theo hành động, 12 A6). Dùng nó để ẩn/khóa nút; server vẫn kiểm lại và trả `403 KHONG_CO_QUYEN` nếu sai. Người thuộc nhiều tổ chức: chọn bằng `org_code` lúc verify hoặc `POST /v1/auth/switch-org`.

**Đóng vai bên kia** (chỉ môi trường thử, để một người test cả hai app): `POST /v1/test/impersonate {"phone":"0909000210"}` trả token ngay không cần OTP. Danh sách tài khoản: `GET /v1/test/accounts`. SMS mô phỏng: `GET /v1/test/sms/0918000421`.

### Tài khoản ảo hay dùng

| Người | Số | Tổ chức | Vai |
|---|---|---|---|
| Nguyễn Thị Năm | 0918000421 | TC-B01 Hộ Nguyễn Thị Năm (bán) | owner |
| Nguyễn Văn Tèo | 0918000422 | người giúp của TC-B01 | helper (view, lot.draft, message.send, delivery.record) |
| Trần Văn Sáu | 0939000160 | TC-B02 (bán) | owner |
| Lê Văn Hòa / Phạm Thị Mai | 0907000300 / 0907000301 | TC-B03 HTX Mỹ Xương | coop_board+owner / accountant |
| Trần Thu Hà | 0909000210 | TC-M01 Nhà máy sấy Đồng Xanh (mua) | purchaser, hạn mức 50.000.000 |
| Lê Thị Lan | 0909000211 | TC-M01 | accountant |
| Võ Hoàng Phúc | 0909000212 | TC-M01 | warehouse (người nhận) |
| Nguyễn Đức Thịnh | 0909000213 | TC-M01 | owner (duyệt nội bộ) |
| Tạ Văn Hùng | 0938000610 | TC-M07 Vựa trái cây Tư Hùng (mua + bán) | owner |
| Đỗ Minh Trí / Bùi Thị Thảo | 0901000005 / 0901000004 | AgiViet | vận hành finance |
| Ngô Thị Vy | 0901000001 | AgiViet | dispatcher |

## 3. Quy ước dữ liệu và lỗi

- Tiền đồng, lượng **gam**. Phản hồi trả chuỗi chữ số (`"13800000"`, `"2000000"` = 2.000 kg). Hiển thị kg tối đa 1 chữ số thập phân.
- Lệnh POST bắt buộc `idempotency_key` (UUID client sinh). **Khi mạng rớt, gửi lại cùng khóa và cùng thân**: server trả đúng kết quả cũ (`replayed: true`), không ký hai lần, không ghi tiền hai lần (TH-060).
- `expected_revision`: gửi `revision` đã đọc để tránh ghi đè (409 `REVISION_XUNG_DOT` → tải lại).
- Lỗi: `{"errors":[{"code":"OTP_SAI","message":"Mã xác nhận không đúng.","fix":"…","details":{…}}],"request_id":"req-…"}`. Hiện `message` + `fix` + nút "Cần hỗ trợ" kèm `request_id`.
- Phản hồi lệnh có `events` (ví dụ `["don.ben_mua_ky"]`) để giao diện biết điều gì vừa xảy ra.
- Không tự tính trạng thái hay tiền: đọc `GET /v1/orders/{id}` → `hien_thi.ten` (dòng trạng thái), `hien_thi.chang` (5 chặng), `hien_thi.toi_luot`, `hanh_dong` (nút được bấm).

## 4. Luồng gọi API theo màn

### App bán: đăng lô (D1–D6)
1. `GET /v1/products`, `GET /v1/products/{code}/profile` (bảng loại, lý do trả lại).
2. `GET /v1/reference-prices?product=XOAI_CAT_CHU&grade=L1` cho thước giá.
3. `POST /v1/lots` → lô nháp; `data.canh_bao` (ví dụ "Thấp hơn mặt bằng 24%"), lỗi `CHUA_HET_CACH_LY`.
4. `POST /v1/files` (ảnh, `entity:"lot"`, `captured_in_app:true` nếu chụp bằng camera app).
5. `POST /v1/lots/{id}/publish`. D7: `GET /v1/lots?mine=true`, `GET /v1/lots/{id}` (chủ lô thấy `floor_price_vnd`), `GET /v1/lots/{id}/qty`.

### App mua: phiếu nhu cầu, hàng khớp (MN1–MN2)
`POST /v1/demands` → `POST /v1/demands/{id}/publish` → `GET /v1/demands/{id}/matches` (3 nhóm, không số giá, gợi ý gom). Chi tiết lô `GET /v1/lots/{id}` (không giá).

### Lời chào (MN4, S2)
- Bên mua: `POST /v1/offers {direction:"buyer_bid", lot_id, demand_line_id?, qty_g, price_vnd}`. Nếu `status = auto_rejected` hiện đúng `data.thong_bao` ("Chưa tới mức người bán chấp nhận."), không số.
- Người bán: `GET /v1/offers` → `GET /v1/offers/{id}` (`toi_luot_toi`, `luot_tra_gia_con`) → `accept` / `counter {price_vnd}` / `reject`. Sau đồng ý hiện `data.thong_bao` (bắt đầu bằng "Đây chưa phải hợp đồng.").

### Lập đơn, ký (MD1–MD3, O2–O4)
1. Bên mua: `POST /v1/orders {offer_id, downgrade_price_vnd, delivery_mode, transport_by, delivery_from, delivery_to, payment_timing, designated_receiver_user_id, silent_accept_hours}` → `data.tinh` (P_coc, cọc, phí, trả thẳng), `data.document_id` (PDF HD).
2. Vượt hạn mức: `submit-approval` → người khác (owner) `approve` → ký.
3. Ký: `POST /v1/otp/challenges {purpose:"contract_sign", document_id}` → nhập mã → `POST /v1/orders/{id}/sign {challenge_id, code}`.
4. Người bán: O2 `GET /v1/orders/{id}/terms` (8 thẻ), O5 `GET /v1/documents/{document_id}/file` (PDF); ký `POST /v1/orders/{id}/sign {challenge_id, code, commitment_ack:true, abnormal_price_ack?}`.

### Chuyển cọc (MP1, O8)
`GET /v1/orders/{id}/deposit-instruction` → VietQR, nội dung `AGV HD3001 COC`, `total_vnd`, `received_vnd`, `due_at`. Chỉ khi ngân hàng xác nhận (webhook) đơn mới sang `active`. Môi trường thử: `POST /v1/sim/bank/transfers {payment_ref, amount_vnd}` rồi `POST /v1/sim/bank/deliver {}`.

### Trả thẳng và xác nhận tiền (MP2, G1)
- Bên mua (kế toán): `GET /v1/orders/{id}/payments` → `POST /v1/files {entity:"payment"}` (ảnh ủy nhiệm chi) → `POST /v1/payments/{pid}/report {amount_vnd, method, evidence_document_id}`. Không cộng vào "đã nhận".
- Người bán: nút luôn kèm số. `POST /v1/otp/challenges {purpose:"money_received", payment_id, amount_vnd}` → `POST /v1/payments/{pid}/confirm {challenge_id, code, amount_vnd, result:"full"|"partial", bank_txn_ref}`; hoặc `not-received`.
- Lỗi cần xử lý: `MA_GIAO_DICH_TRUNG`, `TIEN_VUOT_SO_BAO`, `OTP_SAI`, `OTP_HET_HAN`.

### Giao nhận tại vườn (MG1, G2–G4, MG2–MG3)
1. Bên mua: `POST /v1/deliveries/{did}/receiver {user_id}` (nếu chưa chỉ định trong đơn), `POST /v1/deliveries/{did}/trip {plate_no:"66C-123.45", freight_vnd}`. `did` lấy từ `GET /v1/orders/{id}` → `dot_giao[0].id`.
2. G2: `GET /v1/deliveries/{did}/readiness` (6 dòng, đỏ kèm `ly_do`). Đủ thì đợt tự sang `ready`.
3. Người nhận (Phúc) mở QR-02: `POST /v1/deliveries/{did}/receipt-qr` → `qr_token` (vẽ QR), `ma_6_so`, làm mới mỗi 5 phút.
4. Người bán quét: `POST /v1/deliveries/{did}/start-check {qr_token | ma_6_so, plate_no}`.
5. Người nhận ghi kết quả: `POST /v1/deliveries/{did}/acceptance {weighed_g, seal_code, lines:[{kind, qty_g, reason_code, evidence_document_id}]}`.
6. Người bán xem (`GET /v1/deliveries/{did}` → `ket_qua`, PDF BBNT), nhập PIN rồi `POST /v1/deliveries/{did}/acceptance/agree {pin, expected_sha256}`.
7. Nơi đến: `POST /v1/deliveries/{did}/arrival {weighed_g}` → `POST /v1/deliveries/{did}/arrival/confirm` → quyết toán tự chạy (`data.quyet_toan`).

### Tiền của đơn, quyết toán (T1–T2, MP3)
`GET /v1/orders/{id}/money`: cọc, phí (`trang_thai`: "Đã thu · hoàn hay không tùy kết quả đơn" / "Không hoàn"), khoản trả thẳng, lệnh ngân hàng (4 chặng created/sent/succeeded/reconciled), bảng quyết toán, sổ cái. "Cọc đã về" chỉ hiện khi lệnh `succeeded`.

### Hủy (X1, MX1)
`GET /v1/orders/{id}/cancellation-preview` (màn hệ quả) → `POST /v1/orders/{id}/cancellation-requests {reason_kind, reason_text}` → bên kia `POST /v1/cancellation-requests/{cid}/accept|reject`. Đơn chờ cọc: `POST /v1/orders/{id}/cancel`. Trước khi người bán ký: bên mua `withdraw`, người bán `decline`.

### Khiếu nại khác mẫu ở nơi đến, kiểm định (MG3–MG4, G9)
Trong 2 giờ sau ký nhận: `POST /v1/deliveries/{did}/arrival/complaint {line_no, qty_g, reason, reason_code, seal_code, inspection_fee_vnd, evidence_document_id}` → `data.quyet_toan_tam` (chi tạm, giữ thêm). Theo dõi `GET /v1/disputes/{id}`; trạng thái đơn hiện "Đã chốt phần không tranh chấp · đang xử lý phần còn lại". Kết quả kiểm định chỉ đến từ đối tác qua webhook có chữ ký (thử: `POST /v1/sim/inspection/result`).

### Ký: giải thích trước khi gửi OTP
`GET /v1/orders/{id}` có `ky = {duoc_ky, can_duyet_noi_bo, da_duyet, han_muc_vnd, gia_tri_vnd, ly_do}`. `hanh_dong` chỉ có `sign` khi `duoc_ky`; đơn vượt hạn mức chưa duyệt có `submit_approval`.

### Hủy: bên kia trả lời
`GET /v1/orders/{id}/cancellation-requests` → mỗi yêu cầu có `requested_by_side`, `outcome` (hệ quả), `reply_due_at`, `la_cua_toi`, `hanh_dong` (`accept`,`reject` chỉ cho bên kia có quyền). Không lưu mã yêu cầu ở máy bên gửi.

### Phản đối dòng tại vườn, cân lại, rút phần (G4, MG2)
Người bán: `POST /v1/deliveries/{did}/acceptance/dispute {line_no, reason, option: chia_lai|rut_phan}`. Bên mua (kho/người nhận) gửi lại `POST /v1/deliveries/{did}/acceptance` (tạo phiên bản mới; rút phần thì kèm `withdrawn_g`). Người bán `agree`. Danh sách hồ sơ: `GET /v1/orders/{id}/disputes` (có `hanh_dong`: `resubmit_acceptance` cho bên mua, `agree_acceptance` cho người bán).

### Thiếu, vượt lượng, giao bù (G7, MG5)
- Vượt trong dung sai: bên mua gửi kết quả kèm `accept_overage: true`; không chọn thì chỉ ghi lượng hợp đồng. Phần trả thêm thành `T_bm` lúc quyết toán.
- Thiếu ngoài dung sai: `agree` trả 422 kèm `details.thieu_g`; người bán gửi lại `agree` với `shortfall: {choice: backfill|end|force_majeure, notice: none|lt3d|ge3d, backfill_from, backfill_to}`. `data.xu_ly_thieu` có đợt mới (giao bù) hoặc tiền phạt Q04.

### Giao tại kho bên mua (G5, MG2 tại kho)
Người bán đặt xe (`trip`), người nhận mở QR (`receipt-qr`) và đọc mã 6 số cho người bán → người bán `POST /v1/deliveries/{did}/ship {loaded_g, ma_6_so|qr_token, seal_code}` → kho `POST /v1/deliveries/{did}/receive {plate_no}` → `acceptance` → người bán `agree` → đợt chốt; khoản "trả khi nhận" mở, quyết toán chạy khi người bán xác nhận đủ.

### Đề nghị sửa, phụ lục (O3, MD4)
`POST /v1/orders/{id}/amendments {kind, payload, reason, evidence_document_ids?, notice_days_before_delivery?}` → bên kia `POST /v1/amendments/{aid}/accept` (`data.annex_document_id`, `data.tinh`) hoặc `reject`; im lặng 24 giờ = không đồng ý. Hai bên ký: `POST /v1/otp/challenges {purpose:"amendment_sign", document_id: annex_document_id}` → `POST /v1/amendments/{aid}/sign {challenge_id, code}`. Khi đủ: `data.he_qua` (hoàn phí, `bo_sung_coc_ref` để chuyển cọc bổ sung, khoản trả thẳng mới). Danh sách: `GET /v1/orders/{id}/amendments`. Ký phụ lục cũng theo hạn mức (cần chủ ký nếu vượt).

### Trả thẳng: thông tin chuyển (MP2)
`GET /v1/payments/{pid}/instruction` (chỉ bên trả có quyền tiền): số tài khoản đầy đủ CHỤP trong hợp đồng, `vietqr`, `noi_dung` (`AGV HD3001 TT1`), `so_tien_con_vnd`, `canh_bao` nếu người bán vừa đổi tài khoản.

### Tổ chức, thành viên, tài khoản nhận tiền (A1–A10, MA1–MA2)
- Đăng ký: `POST /v1/auth/otp/send` → `POST /v1/auth/register {challenge_id, phone, code, name, org:{side, kind, display_name, tax_code?, province_code, segment_code?, plan_code?}}` → token; tổ chức `pending` tới khi vận hành `POST /v1/ops/orgs/{id}/verify`. Lưu ý: tổ chức mới chưa có vai chủ (giới hạn CSDL), nên chưa đăng lô/ký được.
- Thành viên: `GET /v1/org/members` (user_id, tên, vai hiệu lực, vai chờ hiệu lực, hạn mức) dùng để chọn người nhận; `POST /v1/org/members/invitations {phone, name, roles, approval_limit_vnd}` → `invitation_token` (vẽ QR-09/đường dẫn); người được mời `POST /v1/invitations/accept {token, phone, challenge_id, code}`; đổi vai `POST /v1/org/members/{membership_id}/roles {add, remove, approval_limit_vnd}`. Vai đặc quyền (owner, purchaser, accountant, coop_board) hiệu lực sau 24 giờ.
- Tài khoản nhận tiền: `GET /v1/payout-accounts`; đổi `POST /v1/payout-accounts {bank_code, account_no, holder_name, challenge_id, code}` (OTP tới số của chủ); `activate` sau 24 giờ; `not-me` khóa ngay.

### Tiền theo kỳ, gói, hỗ trợ, thông báo, hồ sơ nguồn
`GET /v1/money/summary?from&to`; `GET /v1/plans` (giá thử), `GET|POST /v1/org/subscription`; `GET|POST /v1/support` (việc V23, chưa có người nhận thì nói rõ); `GET /v1/notifications?after_seq` (worker outbox gửi mỗi 30 giây); `GET /v1/lots/{id}/source-profile` (giấy tờ có trạng thái thật, `uy_tin: null`); so lời chào `GET /v1/demands/{id}/offer-comparison` (`gia_tai_kho_vnd: null` khi thiếu dữ liệu). Kết quả ghép `GET /v1/demands/{id}/matches` có `nguon` = `ai` hoặc `luat_backend (AI lỗi, dự phòng)`.

### Vận hành
`GET /v1/ops/tasks` → `claim` → `resolve {result_code}`; đối soát `POST /v1/ops/reconcile`; nhả lệnh chi chờ gọi lại `POST /v1/ops/instructions/{id}/callback`.

### Cập nhật phiên 5 (26/10/2026)
- **Chủ đầu tiên của tổ chức mới** (hai người): nhân viên field/risk/supervisor/support tải chứng cứ `POST /v1/files {entity:'organization', entity_id: org_id, ...}` rồi `POST /v1/ops/orgs/{id}/owner-verifications {evidence_document_id, reason, user_id?}` → `{id, status:'proposed'}`. Người khác có vai risk/supervisor gọi `POST /v1/ops/owner-verifications/{id}/approve` → `{status:'active', decision_id, owner_grant_id, owner_effective_at}`; vai chủ có hiệu lực sau 24 giờ (hiện `owner_effective_at` cho người dùng). Người lập tự duyệt bị chặn; duyệt lần hai bị chặn. Danh sách: `GET /v1/ops/owner-verifications`. `POST /v1/ops/orgs/{id}/verify` cũ vẫn chạy nhưng không cấp chủ.
- **Phụ lục giảm cọc**: khi phụ lục hiệu lực, `he_qua` có `hoan_coc_vnd`, `hoan_phi_vnd` (nếu có), `lenh_hoan` (mã lệnh, phân tách bằng dấu phẩy). Tiền chênh hoàn ngay về nguồn, quyết toán cuối không hoàn lần hai (`refund_vnd` = 0 cho phần này). Bỏ `ghi_chu_coc` cũ.
- **Ảnh lô cho bên mua**: `GET /v1/documents/{photo_id}/file` trả 200 với ảnh (`image/*`) của lô đang `on_sale`/`upcoming`/`sold_out`; chứng từ khác vẫn 404 nếu không có quyền. Tên tệp theo đúng đuôi ảnh.
- **Tạo nhu cầu**: mỗi dòng bắt buộc `grade_code`, `qty_g`, `max_price_vnd`, `min_source_qty_g` (chuỗi số nguyên dương; `min_source_qty_g` ≤ `qty_g`). Thiếu hoặc 0 trả 422 `DU_LIEU_KHONG_HOP_LE` với thông báo theo dòng, không còn 500.
- Tài khoản nhận tiền: thời gian chờ tính theo đồng hồ nghiệp vụ (`cooldown_until`), kích hoạt qua command DB.

### Cập nhật phiên 6 (26/10/2026, sau chuyển command)
- Người giúp: `GET|POST /v1/org/delegations {helper_user_id, actions[], valid_to, valid_from?}`, `POST /v1/org/delegations/{id}/revoke`. Muốn người giúp đặt giá/đăng lô phải cấp `lot.update` (API tạo lô luôn đặt giá nên cần cả `lot.draft` và `lot.update`).
- Lời chào dưới giá kín trả 200 với `status: auto_rejected`, không có số kín.
- Báo chưa nhận: `POST /v1/payments/{id}/not-received {reason?}` → `status: mismatch`, `task_id`.
- Đăng ký trả `{user_id, org_id, org_status: 'pending'}`; tổ chức chỉ hoạt động sau xác minh hai người (mục phiên 5). `/v1/ops/orgs/{id}/verify` trả 501.
- Đổi gói trả `tien_thang_dau_vnd`, `gia_thang_vnd`, `bien_nhan_mo_phong` (billing mô phỏng).
- Phản đối dòng chọn `rut_phan` phải gửi `pin`; bên mua gửi lại kết quả với `withdrawn_g` đúng lượng tranh chấp và giữ nguyên các dòng còn lại.
- Bất khả kháng: tải chứng cứ vào đơn trước, thiếu trả 422.
- Mã do DB cấp: nội dung chuyển trước bốc `AGV <mã đơn> BEFORE`, bổ sung cọc `TP` + 12 số (mã cũ `TOPUP-…`), mã việc `TASK-…`. Hiển thị nguyên văn, không tự dựng mã.

### Ai được nhập nghiệm thu (sau chuyển cmd.*)
- `POST /v1/deliveries/{id}/acceptance` (gửi/gửi lại kết quả): phía mua, vai `owner`, `warehouse` hoặc `site_receiver`, **và phải là người nhận được chỉ định của đợt** (`receiver_user_id`, đặt qua `POST /v1/deliveries/{id}/receiver`). `purchaser`/`accountant` không nhập được. Cần `pin`.
- Sau phản đối `chia_lai` (0052): bên mua tải ảnh/phiếu cân lại mới vào đơn (`POST /v1/files`, entity=order) **sau** khi người bán phản đối, rồi gửi lại cùng lượng cân với đủ dòng (có thể gửi `evidence_document_id`; nếu bỏ, backend lấy chứng cứ mới nhất sau phản đối). Dòng không tranh chấp phải giữ nguyên; phần chênh theo loại thay dòng tranh chấp. Thiếu chứng cứ trả 422. Phản hồi có `chia_lai: true`; tranh chấp sang `awaiting_seller`, đóng khi người bán đồng ý bản mới. Chỉ trong 24 giờ từ phản đối, trước kiểm định. Danh sách tranh chấp có lại hành động `resubmit_acceptance`.
- Rút phần (`rut_phan`): người bán gửi `pin` khi phản đối; bên mua gửi lại với `withdrawn_g`.
- `acceptance/agree`: phía bán vai `owner`, `coop_board` hoặc `collection_staff`, kèm `pin`.
- Phụ lục `change_price` giảm giá (0051): hiệu lực bình thường, `he_qua.hoan_coc_vnd` là cọc chênh hoàn về nguồn, phí giữ nguyên (Q06), `hoan_phi_vnd` = 0.
- Mã nạp cọc bổ sung mới: `TP` + 12 chữ số (có số kiểm MOD97), hiển thị nguyên văn `he_qua.bo_sung_coc_ref`. Mã đã phát trước đó (`TOPUP-…`) vẫn dùng được.
- Mời thành viên số chưa có tài khoản: chạy bình thường (`create_invitee`).
- `GET /v1/org/subscription` đọc theo đồng hồ nghiệp vụ: sau đổi gói thấy gói mới ngay.

### Nạp cọc bổ sung sau tải lại trang
`GET /v1/orders/{id}/deposit-instruction` có thêm `top_ups[]`: `{adjustment_id, version_no, payment_ref (TP… hoặc TOPUP-… cũ), deposit_vnd, fee_vnd, total_vnd, received_vnd, status: awaiting_transfer|partially_received|received, due_at, vietqr}`. Giao diện đọc mã từ đây thay vì giữ phản hồi ký phụ lục.

### Phiên đăng nhập
Phiên đăng nhập bằng OTP được lưu bền (chỉ SHA-256 token). Tiến trình khởi động lại thì token vẫn dùng được; `POST /v1/auth/logout` thu hồi trong DB. Mã OTP chưa nhập sẽ mất khi khởi động lại; khi đó người dùng xin mã mới.

### Lối tắt nhà vườn (27/10/2026)
- `GET /v1/weather?province=DT`: tham số tỉnh không bắt buộc, mặc định là tỉnh của tổ chức. Trả 7 ngày, mỗi ngày có `loi_khuyen`, kèm `canh_bao` gộp. Luôn hiển thị `nguon` và `lay_luc`. Mạng lỗi trả 503 `DICH_VU_NGOAI_LOI`: hiện “Chưa lấy được dự báo”, không hiện số cũ hay số đoán.
- `GET /v1/news?product=XOAI_CAT_CHU`: chỉ có tiêu đề, nguồn, ngày, link tới bài gốc (mở tab mới). Không hiển thị tóm tắt. Tin của tỉnh mình (`theo_tinh`) lên trước. `nguon_loi` liệt kê báo chưa đọc được. Các nguồn: Báo Nông nghiệp và Môi trường, VnExpress Kinh doanh, Tuổi Trẻ Kinh doanh, VOV Kinh tế. Báo Đồng Tháp hiện lỗi RSS nên chưa có.
- `GET /v1/seller/history?limit=50&before=<luc>`: dòng thời gian, mới nhất trước, gồm lô, lời chào, đơn, tiền về, chi cọc, tranh chấp, hủy. `order_id` dùng để mở đơn. Bên mua nhận 403.

### App bán: xác minh, nhật ký, bán gấp, hợp đồng vụ (0056–0057)
- **Mặt hàng đã xác minh** `GET /v1/seller/verified-products` (`?all=true` để xem cả chờ duyệt/hết hạn/thu hồi). Trường: `product_code, product_name, grade_code, grade_label, site_id, site_name, site_kind, criteria, inspection_source, valid_from, valid_to` (ngày cuối còn hiệu lực), `trang_thai`. `POST /v1/lots` chặn ngay với 422 `MAT_HANG_CHUA_XAC_MINH` nếu tổ chức × vườn × mặt hàng × loại chưa có hồ sơ còn hạn. Form đăng lô chỉ nên cho chọn mặt hàng/loại trong danh sách này.
- **Cơ sở**: `GET|POST /v1/production-sites`. **Nhật ký**: `GET /v1/farm-diary?site_id&from&to` trả `co_so[].ngay_het_cach_ly_gan_nhat` và `con_cach_ly`, `theo_vu[]` (nhóm theo hợp đồng vụ của vườn, còn lại theo năm), `viec[]` có `ten_viec` và `nhan` (“Tự ghi” hoặc “Nhân viên AgiViet xác nhận”). `POST /v1/farm-diary {site_id, occurred_on, activity, note, request_key, …}`:
  - Phun thuốc cần `medicine_name` và `withdrawal_days`; `clear_on` do DB tính.
  - Thu hoạch cần `harvested_qty_g`.
  - Ảnh tải `POST /v1/files {entity:'production_site', entity_id: site_id}` rồi đưa id vào `photo_document_ids`.
  - Sửa: gửi lại toàn bộ nội dung kèm `supersedes_id`, `correction_reason`, khóa mới. Sửa không rút ngắn cách ly.
  - Người giúp cần ủy quyền `diary.write`.
- **Bán gấp** `POST /v1/lots/{id}/urgent-sale {until, reason}`; tắt bằng `{on:false}`. Trả `ban_gap {tu, den, ly_do}`. Bên mua thấy `ban_gap: true, ban_gap_den, ban_gap_ly_do` và lô bán gấp ở đầu `GET /v1/lots`.
- **Hợp đồng vụ** `GET /v1/seasonal-orders` (`phia` seller/buyer), `GET /v1/seasonal-orders/{id}` (điều khoản, lịch ban đầu bất biến, đợt giao hiện hành, cập nhật sản lượng, đề nghị, `hanh_dong`).
  - Bên mua lập bằng `POST /v1/seasonal-orders` (thân như `/v1/orders` thêm `vu`). Ký/cọc như đơn thường. Đặt trước cọc 30% lượng tối thiểu; bao tiêu dùng `vu.deposit_vnd`.
  - Người bán cập nhật sản lượng ước `POST /v1/seasonal-orders/{id}/production-updates`. Việc này không đổi hợp đồng; có ảnh thì đáp ứng hạn ảnh 7 ngày.
  - Chốt đặt trước: `POST /v1/seasonal-orders/{id}/harvest-fix {qty_g}`, rồi bên kia `/v1/amendments/{id}/accept|reject`, hai bên ký `/sign`. Hiệu lực trả `he_qua` (cọc chênh, mã nạp `TP…`).
  - Mất mùa: `POST /v1/orders/{id}/amendments {kind:'force_majeure_reduction', payload:{qty_g}, evidence_document_ids}`, giảm ở đợt chưa giao cuối.
  - Giá đợt bao tiêu: `POST /v1/deliveries/{id}/batch-price`.

### Sửa lỗi chặn từ bảng đối chiếu (27/10)
- **Bắt đầu cân tại vườn (NV11)**: người bán là người nhập mã 6 số, hoặc quét QR, của người nhận bên mua. Người nhận phải có mặt; người bán gọi `POST /v1/deliveries/{id}/start-check`. Quyền phiên giờ có `delivery.record` cho chủ, ban điều hành và nhân viên gom bên bán. Nên dùng `GET /v1/deliveries/{id}`: `hanh_dong` chứa `start_check` khi đợt `ready` tại nguồn. Người nhận bên mua có `show_receipt_code`, không có `start_check`.
- **Cờ ký nghiệm thu (NV26)**: mỗi phần tử `ket_qua[]` có `seller_agreed_at`, `buyer_agreed_at` (null khi chưa ký) và `seller_agreed`, `buyer_agreed`. Chỉ hiện form đồng ý khi `hanh_dong` có `agree_acceptance`.
- **Điều khoản (NV24)**: `GET /v1/orders/{id}/terms` có `nguon_noi_dung`. Với dự thảo hoặc demo thiếu nội dung, thẻ dựng từ điều khoản DB kèm `canh_bao`; hãy hiện cảnh báo này.
- **Nhiều đợt (NV22)**: `GET /v1/orders/{id}` có `dot_giao[]` đủ các đợt và `dot_hien_hanh_id`. Người bán xem được mọi đợt của đơn mình; màn bán không nên cố định `dot_giao[0]`.
- **Tự ẩn tin (B08)**: lô quá 14 ngày chưa xác nhận còn hàng không hiện trong tìm nguồn. `GET /v1/lots?mine=true` trả `an_tu_dong` và `an_ly_do`; `POST /v1/lots/{id}/confirm-available` hiện lại.
- **Từ chối đơn (B18)**: `POST /v1/orders/{id}/decline {reason}`. `GET /v1/orders/{id}` trả `ly_do_dong` là lời giải thích cụ thể, còn `close_reason` vẫn là mã.

### 10 số đăng nhập mẫu (chỉ môi trường thử)
Gõ đúng 4 chữ số ở màn đăng nhập, OTP `123456`. Các số này không bị giới hạn gửi OTP và mã sống 24 giờ; production chỉ nhận số Việt Nam 10 số. Mỗi số là bí danh của một người có sẵn trong dữ liệu ảo, bên kia do quản trị đóng vai. Dựng lại bằng `cd backend && npm run demo:10-so` (`API_ORIGIN`, mặc định `http://127.0.0.1:18080`). `GET /v1/test/demo-numbers` trả danh sách; `GET /v1/me` là bí danh của `/v1/auth/session`.

| Số | Người | Tổ chức | App | Tình huống khi mở | Màn mở đầu |
|---|---|---|---|---|---|
| 0001 | Võ Thị Lan | Hộ Võ Thị Lan (TC-B04) | bán | Lô xoài cát Chu đang bán, 1 lời chào giá mới cần trả lời | `/ban/#/offers/{offer_id}` |
| 0002 | Lê Thị Hai | Hộ Lê Thị Hai (TC-B05) | bán | Đã đồng ý giá, hợp đồng chờ người bán ký OTP | `/ban/#/order/{order_id}` |
| 0003 | Huỳnh Văn Bảy | Hộ Huỳnh Văn Bảy (TC-B08) | bán | Đã cọc; bên mua báo đã chuyển tiền trước bốc kèm chứng từ, cần kiểm và xác nhận | `/ban/#/order/{order_id}` |
| 0004 | Trần Văn Sáu | Hộ Trần Văn Sáu (TC-B02) | bán | Bên mua nhập kết quả cân 3 phần (hạ cấp + trả lại kèm ảnh, cân thiếu 40 kg), chờ ký hoặc "Không đúng" | `/ban/#/order/{order_id}/delivery` |
| 0005 | Đặng Thị Bích | Hộ Đặng Thị Bích (TC-B07) | bán | Phần chanh trả lại thành lô con đang bán, có goi_y_ban_gap | `/ban/#/lots` |
| 0006 | Võ Thanh Sen | Nhà hàng Bếp Sen (TC-M05) | mua | Nhu cầu sầu riêng A đang mở, 3 báo giá (Nga, Phát, Hậu) | `/mua/#/demands/{demand_id}` |
| 0007 | Nguyễn Thị Mười | Quán Cơm Nhà Mười (TC-M06) | mua | Hợp đồng sầu riêng hai bên đã ký, cần chuyển cọc | `/mua/#/order/{order_id}` |
| 0008 | Nguyễn Thị Ngọc | Công ty XNK Sông Tiền (TC-M02) | mua | Đợt giao tại vườn đang ready, mình là người nhận: mở mã rồi nhập nghiệm thu | `/mua/#/order/{order_id}/delivery` |
| 0009 | Trần Văn Thành | Vựa lúa Ba Thành (TC-M08) | mua | Tranh chấp khác mẫu ở nơi đến, chờ kiểm định | `/mua/#/order/{order_id}/disputes` |
| 0010 | Tạ Văn Hùng | Vựa trái cây Tư Hùng (TC-M07) | mua | Đặt trước khi hái sầu riêng đã cọc, gần ngày hái, chờ chốt lượng/giá | `/mua/#/order/{order_id}` |

Script in ra đường dẫn có id thật. Số nào còn đúng tình huống thì giữ nguyên. Số nào người dùng đã bấm đi tiếp thì dựng tình huống mới; đơn cũ đã cọc vẫn còn làm lịch sử, vì sổ cái không xóa được.

## 5. Chưa có ở backend (giao diện nên ẩn hoặc làm giả)
Kiểm định viên tại vườn, thỏa thuận chia khi không kết luận, khung/nhóm/bao tiêu/lô gộp/đặt trước, tôm bảng cỡ, lúa độ ẩm, kho tồn, tin nhắn che số và gọi qua app, bảng kê 01/TNDN, thu phí gói thật, SMS thật. Chi tiết: [danh-gia-thanh-that.md](danh-gia-thanh-that.md).
