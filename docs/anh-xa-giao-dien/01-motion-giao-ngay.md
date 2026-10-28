# Ánh xạ màn Motion v2 → API → quyền → trạng thái → lỗi · luồng giao ngay xuyên ba bên

Ngày 28/10/2026. Căn cứ:
- Prototype đã duyệt `~/Downloads/AgiViet Motion app design/AgiViet Motion v2.dc.html` (app **người bán**; luồng `FLOW` 12 màn).
- Luồng đã chạy đạt trên PostgreSQL 17 thật: TH-006 (`backend/test/luong.ts`, `tinh-huong.ts`; bằng chứng `docs/bang-chung/giao-dich-xuyen-ba-ben-pg.md`).
- Mã lỗi: `backend/src/loi.ts`. Backend trả `{ errors: [{ code, message, fix, details }], request_id }`; giao diện hiện `message` (+ `fix` nếu có), giữ `request_id` để gửi hỗ trợ; không tự đặt câu khác.

Nguyên tắc nối: **giữ nguyên giao diện, hiệu ứng, cách tương tác đã duyệt**; chỉ thay dữ liệu cứng bằng dữ liệu API và thêm trạng thái chờ/lỗi.
Motion chỉ vẽ app người bán. Bước của bên mua dùng app `/mua` hiện có; bước vận hành gọi API vận hành (giao diện hộp việc làm sau).
Tiền: mọi số trên màn **đọc từ backend** (`/v1/orders/:id`, `/v1/orders/:id/money`); giao diện không tự tính cọc, phí, quyết toán. Quyết toán nằm ở **`/money.quyet_toan`** (mảng, lấy bản `is_effective`), không ở GET đơn.
Lệnh gửi lại cùng `idempotency_key` (ký, ký phụ lục, xác nhận tiền) trả **kết quả đã lưu** kèm `replayed:true`, không đòi OTP mới.

Vai trong ví dụ TH-006: bên mua Trần Thu Hà (chủ, TC-M01) · kế toán bên mua Lê Thị Lan · người nhận được chỉ định Võ Hoàng Phúc ·
người bán Nguyễn Thị Năm (chủ, TC-B01) · tài chính AgiViet Đỗ Minh Trí · ngân hàng giả lập.

## Lỗi chung mọi màn

| Mã | HTTP | Cách hiện |
|---|---|---|
| CHUA_DANG_NHAP | 401 | Về màn đăng nhập, giữ màn đang mở để quay lại |
| KHONG_TIM_THAY | 404 | "Không tìm thấy hoặc bạn không được xem" — không lộ đơn có tồn tại hay không |
| TRANG_THAI_KHONG_CHO_PHEP | 409 | Tải lại đơn, đưa về màn đúng trạng thái mới (người khác vừa làm bước này) |
| PHIEN_BAN_DA_DOI / REVISION_XUNG_DOT | 409 | "Nội dung đã đổi" + nút xem bản mới; không gửi lại tự động |
| CAN_MANG | 503 | Giữ dữ liệu đã nhập; nút thử lại. Bước tiền/ký không lưu hàng đợi ngoại tuyến |
| QUA_NHIEU_YEU_CAU | 429 | Khóa nút vài giây |
| LOI_HE_THONG / DICH_VU_NGOAI_LOI | 500/503 | Câu chung + mã tham chiếu; nút gọi nhân viên |

Mọi lệnh ghi gửi `idempotency_key`; bấm hai lần không tạo hai tác động (đã kiểm đồng thời trên PostgreSQL thật).

## Bảng theo bước

| # | Ai · ở đâu | Màn Motion | API đọc | API hành động | Quyền | Trạng thái trước → sau | Lỗi riêng phải hiện |
|---|---|---|---|---|---|---|---|
| 1 | Bên mua · app /mua | — (gửi lời chào) | `GET /v1/lots/:id` | `POST /v1/offers` `{direction:'buyer_bid', lot_id, demand_line_id, qty_g, price_vnd}` | thành viên bên mua | — → offer `sent` | KHONG_DU_LUONG, CHAO_VUOT_LUONG, MAT_HANG_CHUA_XAC_MINH, CHUA_HET_CACH_LY |
| 2 | Người bán | **S2 Lời chào giá** | `GET /v1/offers/:id` (`rounds`, `gia_tham_khao_vnd`, `phan_tram_gia_tham_khao`, `toi_luot_toi`, `luot_tra_gia_con`) | `POST /v1/offers/:id/accept` · `/counter` (trả giá) · `/reject` | chủ / người được ủy quyền bán | offer `sent` → `accepted` (giữ lượng) | HET_LUOT_TRA_GIA, KHONG_DU_LUONG, LO_KHOA_AN_TOAN |
| 3 | Người bán | **S4 Đã đồng ý giá** | `GET /v1/offers/:id` (`thong_bao`: "Đây chưa phải hợp đồng. Đã giữ …", `hold.expires_at`) | — (chờ bên mua lập thỏa thuận) | — | `accepted` | hết hạn giữ hàng → hiện lời chào hết hạn |
| 4 | Bên mua · /mua | — (lập + ký đơn) | — | `POST /v1/orders` (điều khoản giao, trả tiền, người nhận) → `POST /v1/orders/:id/sign` OTP | chủ / thu mua trong hạn mức | → `drafting` → `awaiting_seller` | CAN_DUYET_NOI_BO, CAN_XAC_NHAN_GIA_BAT_THUONG, OTP_SAI, OTP_HET_HAN |
| 5 | Người bán | **O4 Ký hợp đồng** | `GET /v1/orders/:id`; `GET /v1/documents/:docId` + `/file` (PDF; nghe từng điều) | mở OTP ký (challenge cho docId) | chủ | `awaiting_seller` | PHIEN_BAN_DA_DOI (hợp đồng đổi so với bản đang đọc) |
| 6 | Người bán | **O6 Nhập mã ký** | — | `POST /v1/orders/:id/sign` `{challenge_id, code, commitment_ack:true}` | chủ | `awaiting_seller` → `awaiting_deposit` | OTP_SAI, OTP_HET_HAN |
| 7 | Bên mua · kế toán | — (chuyển cọc) | `GET /v1/orders/:id/deposit-instruction` (VietQR, nội dung `AGV … COC`) | chuyển khoản ngoài app; ngân hàng gửi webhook | kế toán / chủ | `awaiting_deposit` → `active` khi ngân hàng xác nhận | hạn cọc 12 giờ hàng tươi; không coi "đã chuyển" là đã có cọc |
| 8 | Người bán | **O8 Chi tiết đơn (HĐ-xxxx)** | `GET /v1/orders/:id` (status, `lien_lac`, `dot_giao`), `GET /v1/orders/:id/money` (sổ cái: cọc đang giữ, phí đang giữ, khoản trả thẳng) | — | hai bên của đơn | `active` | CHUA_CO_COC (nếu mở trước khi ngân hàng xác nhận) |
| 9 | Bên mua · kế toán | — (báo đã trả trước bốc) | `GET /v1/orders/:id/payments` | `POST /v1/files` (ảnh chứng từ, chụp trong app) → `POST /v1/payments/:id/report` | kế toán / chủ | khoản `due` → `payer_reported` | TIEN_VUOT_SO_BAO |
| 10 | Người bán | **G1 Xác nhận tiền** | `GET /v1/orders/:id/payments` (`reported_vnd`, `confirmed_vnd`, `evidence_document_ids` → `GET /v1/documents/:id/file`) | OTP tiền → `POST /v1/payments/:id/confirm` `{amount_vnd, result:'full'|'partial', bank_txn_ref}` | chủ (người nhận tiền) | `payer_reported` → `fully_received` / `partially_received` | TIEN_VUOT_SO_BAO, MA_GIAO_DICH_TRUNG, TAI_KHOAN_DANG_CHO, OTP_SAI |
| 11 | Bên mua | — (đặt xe) | — | `POST /v1/deliveries/:id/trip` `{plate_no, freight_vnd}` | chủ / thu mua | đợt → `ready` | THE_SAN_SANG_CHUA_DU |
| 12 | Người bán | **G2 Sẵn sàng giao** | `GET /v1/deliveries/:id/readiness` (thẻ sẵn sàng: cọc, tiền trước bốc, xe, người nhận) | — | hai bên | đợt `ready` | CHUA_DU_TIEN_TRUOC_BOC, THE_SAN_SANG_CHUA_DU (dòng nào thiếu hiện đúng dòng đó) |
| 13 | Người nhận · /mua | — (mở mã giao) | — | `POST /v1/deliveries/:id/receipt-qr` | **chỉ người nhận được chỉ định** | — | NGUOI_NHAN_KHONG_CHI_DINH |
| 14 | Người bán | G2 (nút quét mã) → **màn chờ "Đang kiểm hàng"** | `GET /v1/deliveries/:id` | `POST /v1/deliveries/:id/start-check` `{qr_token, plate_no}` (quét QR / nhập mã 6 số) | chủ / người giao | `ready` → đang kiểm tại vườn (**chưa** chạy cảnh xe) | QR_KHONG_DUNG_DOT, QR_HET_HAN, QR_BI_KHOA |
| 15 | Người nhận · /mua | — (nhập nghiệm thu 3 phần) | — | `POST /v1/files` (ảnh dòng hạ cấp/trả lại) → `POST /v1/deliveries/:id/acceptance` `{pin, weighed_g, seal_code, lines[]}` | người nhận được chỉ định | → `awaiting_seller` (giá trị nghiệm thu do backend tính) | KET_QUA_KHONG_KHOP_TONG, KET_QUA_AM, THIEU_ANH_TRA_LAI, THIEU_LY_DO |
| 16 | Người bán | **G6 Kết quả nghiệm thu** | `GET /v1/deliveries/:id` (từng dòng: `kind`, `qty_g`, `value_vnd`, `reason_code`, `evidence_document_id`) | `POST /v1/deliveries/:id/acceptance/agree` `{pin}` · hoặc "Không đúng" đúng dòng: `POST /v1/deliveries/:id/acceptance/dispute` | chủ | `awaiting_seller` → `in_transit` (lô con hàng trả lại tạo tự động) | HET_HAN_KHIEU_NAI; im lặng quá hạn **không** bằng đồng ý trừ khi hợp đồng ghi |
| 16b | Người bán | **GX Đang giao (cảnh xe)** | `GET /v1/deliveries/:id` | — | hai bên | chạy cảnh khi đợt `in_transit` (sau G6 chốt) | — |
| 17 | Người nhận · /mua | — (cân khi tới) | — | `POST /v1/deliveries/:id/arrival` `{weighed_g}` → `/arrival/confirm` | người nhận được chỉ định | `in_transit` → đợt `closed`; đơn → `awaiting_settlement` | hao hụt vượt mức → hiện chênh lệch, khiếu nại qua `/arrival/complaint`, không tự trừ |
| 17b | Người bán | **T2 Quyết toán** | `GET /v1/orders/:id/money` (`quyet_toan` bản hiệu lực: V, N, chi cọc, hoàn cọc; `lenh_ngan_hang`) | — | hai bên | hiện **ngay khi** đơn `awaiting_settlement`, trước đối soát; lệnh ngân hàng chưa xong → màn chờ "Ngân hàng đang xử lý" | còn hồ sơ mở → nhãn "Đã quyết toán mua bán · còn hồ sơ mở" |
| 18 | Vận hành · tài chính AgiViet | — (đối soát) | — | ngân hàng thực hiện lệnh → `POST /v1/ops/reconcile` | vai `finance` | `awaiting_settlement` → `completed` | lệnh ngân hàng lỗi → hồ sơ trong hộp việc |
| 20 | Người bán | **T5 Tiền đã về (cảnh chuyển)** | `GET /v1/orders/:id/money` (`thuc_nhan.nguoi_ban_vnd`, `thuc_nhan.da_xac_minh`) | — | người bán | `completed` | chỉ chạy cảnh khi `thuc_nhan.da_xac_minh = true` (mọi lệnh ngân hàng đã đối soát) |
| 21 | Người bán | **T9 Hoàn tất (cảnh mừng)** | `GET /v1/orders/:id` (tài liệu BBNT, BQT) | — | hai bên | `completed` | — |

Số kiểm ở TH-006 (để so màn khi nối): cọc 13.800.000 đ, phí 138.000 đ, VietQR tổng 13.938.000 đ, trả thẳng trước bốc 32.200.000 đ,
nghiệm thu 1.850 kg nhận + 120 kg hạ cấp + 30 kg trả lại = 44.350.000 đ, chi cọc người bán 12.150.000 đ, hoàn cọc bên mua 1.650.000 đ,
người bán thực nhận 44.350.000 đ.

## Thứ tự hiển thị (chốt theo Codex rà ec5df6f)

Sẵn sàng (G2) → quét mã / **đang kiểm hàng** → **G6** chốt nghiệm thu → **GX** đang giao → xác nhận nơi đến → **T2** quyết toán → ngân hàng / đối soát → **T5** → **T9**.

## Màn chờ (thêm, cùng phong cách Motion: nhân vật + câu ngắn + nút làm mới)

| Màn chờ | Khi nào | Đọc | Thoát khi |
|---|---|---|---|
| Chờ cọc | đơn `awaiting_deposit` (sau O6) | `GET /v1/orders/:id` | đơn `active` → O8 |
| Nhận thiếu tiền | khoản `partially_received` | `/payments` (`confirmed_vnd` < `amount_due_vnd`) | đủ → G2; hoặc báo chưa nhận `/v1/payments/:id/not-received` |
| Đang kiểm / chờ nghiệm thu | sau `start-check`, chưa có kết quả | `GET /v1/deliveries/:id` | kết quả gửi (`awaiting_seller`) → G6 |
| Chờ ngân hàng | T2 có `lenh_ngan_hang` chưa `reconciled` | `/money` | `thuc_nhan.da_xac_minh` → T5 |

## Chỗ prototype phải đổi khi nối (theo `AgiViet_danh_gia_motion_v2_nghiep_vu.md`)

- Màn đi theo **trạng thái đơn từ backend**, không theo thứ tự `FLOW` cố định; mở app giữa chừng phải vào đúng màn.
- Các số đang viết cứng (23.000 đ, 92% giá tham khảo, 32.200.000 đ, 44.350.000 đ, HĐ-0018) thay bằng dữ liệu API.
- Lời nhân vật (bubble) giữ nguyên câu đã duyệt, chỉ thay số; khi chưa có AI dùng câu soạn sẵn.
- Màn chờ (S4, O8, T2) cần cập nhật khi bên kia làm xong: tải lại khi quay lại app + kéo để làm mới (chưa có đẩy thời gian thực).

## Việc tiếp theo

1. Nối S2 → T9 trong app /ban theo bảng trên, mỗi màn thêm trạng thái tải/lỗi.
2. Kiểm bằng E2E chạy đúng TH-006 qua giao diện: bên mua và vận hành đóng vai qua `/v1/test/impersonate`, người bán bấm trên màn Motion.
