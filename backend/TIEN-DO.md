# Tiến độ backend

Cập nhật: 26/10/2026, Codex tiếp phiên 5; DB migrations 0001–0047.

## Kết luận bàn giao

Cập nhật 26/10/2026, Claude, phiên 6 (migrations 0001–0050). Dùng command mới 0048–0050; **0 bước ghi nghiệp vụ runtime chạy owner** (giữ nguyên nguyên tắc của Codex). Bộ hồi quy xanh lại: **72/72 tình huống, 544/544 bước (PGlite và Postgres thật)** (không AI); **53/53, 393/393** (trước 2 ca mới; chưa chạy lại bản AI) với AI thật; `test:commands` **11/11**; tsc sạch.

### 10 số demo (27/10)
- 10 số demo 0001–0010 (chỉ môi trường thử): bí danh đăng nhập, `npm run demo:10-so` dựng bằng API thật (src/demo/dung-demo.ts), kiểm DEMO-10-SO; đã dựng trên 18080.

### Lỗi chặn bảng đối chiếu (27/10)
- Lỗi chặn bảng đối chiếu (DC-NV11, DC-NV26, DC-NV24, DC-B08, DC-NV22, DC-B18 trong test/tinh-huong-13.ts): thêm hành động `delivery.record` và `hanh_dong` theo đợt; cờ ký `seller_agreed_at/buyer_agreed_at`; điều khoản dự thảo dựng từ DB thay vì 500; tìm nguồn ẩn lô quá 14 ngày theo giờ yêu cầu; `dot_hien_hanh_id`; lý do từ chối giữ ở sự kiện `don.dong_truoc_coc` và trả `ly_do_dong`. Phần UI (seller.js đọc `dot_giao[0]`) thuộc frontend.

### App bán 0056–0057 (27/10)
- App bán 0056–0057: `GET /v1/seller/verified-products`, chặn lô chưa xác minh từ bản nháp (422 `MAT_HANG_CHUA_XAC_MINH`), `GET|POST /v1/production-sites`, `GET|POST /v1/farm-diary`, ảnh vườn qua `/v1/files entity=production_site`, `POST /v1/lots/{id}/urgent-sale` (bên mua thấy cờ + xếp đầu), `GET|POST /v1/seasonal-orders`, `GET /v1/seasonal-orders/{id}`, `POST …/production-updates`, `POST …/harvest-fix` (+ accept/reject/sign phụ lục `fix_qty_price` qua API phụ lục hiện có), `POST /v1/deliveries/{id}/batch-price`; mất mùa qua amendments `force_majeure_reduction`. Kiểm TH-NV-01..06. Chưa có ca kiểm giá công thức và tiền từng đợt bao tiêu tới nghiệm thu.

### Lối tắt nhà vườn (27/10)
- Lối tắt nhà vườn: `GET /v1/weather` (Open-Meteo, tọa độ tỉnh cố định, bộ đệm 1 giờ, lời khuyên mưa/nóng/gió, mạng lỗi trả 503), `GET /v1/news` (RSS 4 báo đã kiểm còn chạy, chỉ tiêu đề/nguồn/ngày/link; Báo Đồng Tháp RSS lỗi 500 nên chưa dùng), `GET /v1/seller/history` (gộp từ bảng sẵn có). Kiểm bằng fixture mạng (TH-TI-01..03), đạt cả trên Postgres thật; đã đọc thử RSS/Open-Meteo thật một lần. Khởi động lại stack tên miền: `AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/dung.sh` rồi `AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/khoi-dong.sh`.

### PostgreSQL thật (sau 0054–0055)
- `npm run test:pg`: dựng PostgreSQL 17 nhúng (binary `@embedded-postgres` ở infra/.local, đổi bằng `AGV_PG_BIN`, `AGV_PSQL`, `AGV_LIBPQ_DIR`) trong thư mục tạm. Owner chạy `db/scripts/migrate.sh` + `seed.sh` vào DB mẫu, rồi `db/scripts/cap-quyen-cong.sql`, rồi thêm vai `agv_backend_clock` chỉ để thử. Sau đó chạy bộ tình huống với `DATABASE_URL` = `agv_backend_gateway`. Mỗi tình huống dựng lại DB từ template bằng owner (biến chỉ có ở thử: `AGV_TEST_PG_OWNER_URL`, `AGV_TEST_PG_TEMPLATE`). Cuối cùng `pg_ctl stop` và xóa thư mục tạm, kể cả khi lỗi.
- **Kết quả: PGlite 56/56, 410/410; Postgres thật 56/56, 410/410** (cùng bộ). `test:commands` 11/11 (PGlite), tsc sạch. Đã kiểm không còn tiến trình postgres hay thư mục tạm.
- Sửa để chạy trên Postgres thật: tham số là mảng object gửi dạng JSON (driver `pg` vốn biến mảng JS thành mảng PG); role danh tính là toàn cụm nên chỉ tạo khi chưa có; cấp cho cổng `WITH INHERIT FALSE`. Fixture TH-009A tách: owner chỉ ghi dữ liệu nhập, còn kích hoạt chạy qua cổng. DB đúng khi chặn owner `SET ROLE` sang login danh tính.
- Phiên bền cho người giúp và người đăng ký đang chờ dùng 0055 (`session_kind` helper/pending_registration). TH-PHIEN-BEN-2 kiểm qua giả lập khởi động lại.
- Mục 17 đã được DB giải quyết (0054); file `backend/scripts/cap-quyen-postgres.sql` cũ có vòng GRANT, dùng `db/scripts/cap-quyen-cong.sql` thay thế.

- Driver `pg` thật: đặt `DATABASE_URL` → pool (`AGV_PG_POOL_MAX`, mặc định 10), giao dịch SERIALIZABLE, thử lại 40001/40P01, đọc READ ONLY, không có khóa tuần tự, `SET LOCAL ROLE` từ login cổng `agv_backend_gateway`. Không đặt → PGlite như cũ. Production bắt buộc `DATABASE_URL` và từ chối URL owner/superuser; khởi động cũng từ chối nếu login là superuser hoặc chưa được cấp vai. Cấp vai bằng `scripts/cap-quyen-postgres.sql` (provisioner, owner, một lần).
- **Chưa chạy được command trên Postgres thật**: DB xác định danh tính bằng `session_user`, `SET ROLE` không đổi được → đề xuất DB mục 17. Máy này không có postgres/pg_ctl/docker nên **chưa kiểm được** đường `pg`; chỉ kiểm cấu hình khởi động.
- Phiên bền: OTP đăng nhập ghi qua auth worker rồi `record_login_session`; tra `lookup_session` khi không có trong bộ nhớ; đăng xuất `revoke_session` (TH-PHIEN-BEN).
- `GET /v1/orders/{id}/deposit-instruction` trả `top_ups[]` (mã TP… đọc lại sau tải trang; TH-AM-1 kiểm).
- BYPASSRLS của reader: giữ. Chính sách RLS của DB chỉ cho đọc dữ liệu của chính tổ chức (`can_access_org`/`can_access_order`). Chưa có chính sách cho lô/nhu cầu công khai của tổ chức khác, cho nhân viên vận hành, hay cho nhiều bảng bật RLS mà không có chính sách đọc (pii, auth, ops…). Bỏ BYPASSRLS thì tìm nguồn, màn vận hành và tra phiên sẽ trả rỗng. Quyền đọc vẫn do API kiểm. Muốn bỏ thì DB cần thêm chính sách công khai/vận hành (de-xuat-csdl mục 17).
- Sau 0051–0052: phụ lục giảm giá chạy (TH-AM-2 kiểm hoàn cọc 1.800.000, giữ phí 138.000), mã nạp cọc `TP`+12 số, chia lại sau phản đối nối `revise_acceptance_after_objection` (GD-04 lại có `resubmit_acceptance`). TH-R2-CANLAI đạt 7/7 sau khi DB sửa đồng hồ tranh chấp (de-xuat-csdl mục 16) và backend cho người bán đồng ý bản chia lại (các phần mới ở `disputed` do `agree_acceptance` đóng).
- Lượt giao diện 3: phụ lục giảm giá trả 501 rõ (DB thiếu căn cứ hoàn phí, TH-AM-2); gói đọc theo đồng hồ nghiệp vụ (GD-05 thêm kiểm đọc lại); cân lại khi tranh chấp mở trả 501 thay 403 và không quảng cáo `resubmit_acceptance` (TH-R2-CANLAI, GD-04 đổi kỳ vọng vì trước quảng cáo hành động không làm được). Đề xuất DB mục 15.
- Người giúp: login riêng actor `helper`, DB kiểm ủy quyền đúng thao tác (`require_lot_editor`, 0048). API mới `GET|POST /v1/org/delegations`, `POST /v1/org/delegations/{id}/revoke` (delegate_helper/revoke_delegation). Ủy quyền seed chỉ có `lot.draft`; đặt giá/đăng lô cần `lot.update`, nên TH-003/061 cho chủ hộ cấp thêm qua API trước (bước dựng, không đổi kiểm).
- Lời chào dưới giá kín: `send_offer`/`reply_offer` (0048) tự `auto_rejected`/`rejected`, không tạo hạn, không lộ số; bỏ chặn 501.
- Báo chưa nhận tiền: `report_payment_not_received` (mismatch + việc V08 + sự kiện), body tùy chọn `reason`.
- Đăng ký: auth worker `record_registration` → điều phối `register_organization` → `create_task` V01. Tổ chức pending, không vai; chủ đầu tiên vẫn qua xác minh hai người. `/v1/ops/orgs/{id}/verify` một người trả 501 rõ (DB không có đường một người cho tổ chức mới); TH-001 đổi sang luồng hai người.
- Gói: `change_subscription` dưới điều phối; gói có phí cần biên nhận billing, môi trường thử ghi biên nhận mô phỏng bằng `record_subscription_payment` (đúng giá tháng như DB đòi); `tien_thang_dau_vnd` theo ngày còn lại chỉ để hiển thị. Vượt thành viên trả `GOI_HET_THANH_VIEN` trước khi gọi DB.
- Nghiệm thu: `submit_acceptance(..., accept_overage)` 5 đối số (0050) cho nhận phần vượt trong dung sai; gửi lại được khi đợt `disputed`; rút phần tranh chấp: người bán chọn `rut_phan` kèm PIN → `prepare_dispute_withdrawal` + ký; bên mua gửi lại với `withdrawn_g` → ký biên bản rút → `revise_acceptance_after_withdrawal` → ký bản mới + `send_acceptance`. Hành động `resubmit_acceptance` hiện cả khi đợt `disputed`.
- Tại nguồn: BBNT hai chữ ký chốt lượng ngay (`finalize_acceptance_quantity`), nên lô con hàng trả lại tạo ngay khi người bán đồng ý (đợt `in_transit`).
- Bất khả kháng: API kiểm chứng cứ của bên xin trước, thiếu trả 422 có hướng dẫn; TH-046 tải ảnh thật vào đơn trước khi xin.
- Bộ đệm ghép AI: `cache_match_candidates` (0049) dưới điều phối, giao dịch riêng sau khi gọi AI, lý do theo danh sách trắng.
- Đăng lô phát lại sự kiện API `lo.da_dang`; người giúp có ủy quyền lô xem được lô nháp của tổ chức.
- Đổi kiểm thử do định dạng mã nay DB cấp (không phải lỗi): nội dung chuyển khoản trước bốc `AGV <mã đơn> BEFORE` (thay TT1), mã bổ sung cọc `TOPUP-<uuid>` (thay COCBS), mã việc `TASK-<uuid>` (thay VIEC-). `test:commands`: ba kiểm từng mong 501 nay kiểm hành vi command mới (helper thiếu quyền 403, giá dưới kín auto_rejected, đăng ký pending không vai).

## Chạy

Biến môi trường production: `AGV_MOI_TRUONG=production`, `DATABASE_URL=postgres://agv_backend_gateway:<mật khẩu>@<host>:5432/agiviet`, `AGV_PG_POOL_MAX`, `AGV_SESSION_SECRET`, `AGV_OTP_PEPPER`, `AGV_FALLBACK_SECRET`, `AGV_QR_PRIVATE_PEM`, `AGV_PDF_PRIVATE_PEM`, `AGV_WEBHOOK_SECRET`, `AGV_DOC_DIR`, `AI_URL`, `AGV_AI_API_KEY`, `PORT`, `HOST`. Trình tự: owner chạy db/migrations + seed (công cụ DB), rồi `psql "$DATABASE_URL_OWNER" -v gateway_password=... -f backend/scripts/cap-quyen-postgres.sql`, rồi `npm start`. Cấp quyền dùng `db/scripts/cap-quyen-cong.sql` (thay script cũ của backend). Đã chạy đủ bộ tình huống trên Postgres 17 thật (`npm run test:pg`).

```sh
cd backend
npm start
npm test
npx tsc -p .
npm run test:commands
AGV_TEST_AI_URL=http://127.0.0.1:8093 npm test
```

Dịch vụ AI dùng venv có sẵn; đợt này chạy bản sao mã/dữ liệu dưới `backend/.tmp/ai-runtime` để audit không ghi ngoài phạm vi. Cổng 8093 chỉ là cổng thử trong phiên, không phải dịch vụ đã triển khai.

## Kết quả kiểm thật

- Không AI: **72/72 tình huống, 544/544 bước (PGlite và Postgres thật)** (`npm test`, test/ket-qua.json).
- Có AI thật (`AGV_TEST_AI_URL`, uvicorn cục bộ cổng 18091 trong phiên, đã tắt): **53/53, 393/393** (trước 2 ca mới; chưa chạy lại bản AI); TH-004ai 7/7 gồm ghi bộ đệm qua command.
- `npm run test:commands`: **11/11**.
- `npx tsc -p .` sạch.

## Đã thay

- `src/db/co-so-du-lieu.ts`: runtime mặc định login reader; owner chỉ lúc migration/nạp/đặt lại/import fixture. Auth/bank/clock/broker/meta có login và quyền riêng, không DML nghiệp vụ. Một kết nối PGlite giả lập các kết nối riêng; production vẫn chưa hỗ trợ pool PostgreSQL thật.
- `src/db/command.ts`, `dang-nhap-rieng.ts`: dựng login từ danh tính đã xác thực, command lấy actor theo session_user; không impersonate chủ để né quyền.
- `nghiep-vu/lo.ts`, `nhu-cau.ts`, `loi-chao.ts`, `don.ts`: command thị trường/giữ/đơn/ký; statements giá bất thường không INSERT chữ ký tay; nhu cầu mở nguyên tử, endpoint publish cũ không publish lần hai.
- `tien.ts`, `quyet-toan.ts`: activation, report/confirm, hoàn thừa, gửi/đối soát lệnh, kết thúc đơn qua command. **create_settlement là nơi duy nhất tính/phân tiền quyết toán**; backend chỉ đọc snapshot. Statement_line từ adapter phải khớp mã/số/đích; không UPDATE reconciled.
- `giao-nhan.ts`: command người nhận/QR/xe/ready/xuất/kiểm/kết quả/ký/thiếu/đến/chốt. Receipt PIN do auth worker ghi sau kiểm PIN thật trong môi trường mô phỏng. Nhánh nhận vượt/withdrawn_g cũ bị chặn khi command chưa giữ đúng sổ.
- `huy.ts`, `de-nghi.ts`, `tranh-chap.ts`: command hủy/hạch toán/phụ lục/kiểm định, không tự INSERT sổ tiền/lượng/chữ ký/phiên bản.
- `to-chuc.ts`, `truy-van.ts`, `van-hanh.ts`: lời mời/OTP đúng số/thu hồi vai/tài khoản nhận/cấp chủ/nhận việc/cuộc gọi bằng command.
- `hen-gio.ts`, `outbox.ts`: expire_deadline_result và claim_outbox/finish_outbox, gửi sau COMMIT, không tự UPDATE hạn/outbox.
- `pdf/tai-lieu-pdf.ts`: chuẩn bị PDF và payload, metadata do command chèn. Quyết toán chưa có command metadata system nên lưu bản trình bày riêng, không giả fully_signed. GET/list kiểm quyền trên đơn và settlement đã commit.
- `ghep.ts`: AI và dự phòng còn chạy, không DML cache thiếu command.
- OpenAPI: 117 path/127 operation, thêm 501 và yêu cầu PIN khi gửi BBNT. Giữ URL/envelope, **chưa tương thích hoàn toàn hành vi cũ**; xem tài liệu chuyển command.

## Owner còn ở đâu

**0 bước nghiệp vụ chế độ thường.** Ba ngữ cảnh quản trị được giữ: nạp migrations/seed/cache; khởi tạo/đặt lại môi trường (tạo các vai runtime); import fixture qua `nhapDuLieuThu` chỉ cho test. Mỗi giao dịch thử ghi đồng hồ bằng login clock, không owner. Idempotency/sự kiện là vai meta riêng; tạo login là vai broker riêng, đều không có quyền tiền/lượng.

Bản kiểm quyền không chứng minh BYPASSRLS reader là mô hình production đúng. Phân quyền truy vấn vẫn do backend thực thi, phiên/OTP login còn bộ nhớ. Không có production pool/many-session/load test.

## Còn dở và bước kế chính xác

1. Mục 13 đã xong nhờ 0048–0050 (phiên 6). Còn đề nghị DB ở `de-xuat-csdl.md` mục 14: giá gói tháng đầu, seed ủy quyền người giúp, endpoint /verify một người, mời người chưa có danh tính (`create_invitee`), mã chuyển khoản ngắn.
2. Chạy lại `npm test`, `npm run test:commands`, `npx tsc -p .` và bản AI sau mỗi migration mới.
3. Các hạng mục phiên 5 chưa làm (driver PostgreSQL, session bền vững, khung/nhóm, bao tiêu, lô gộp, tôm/lúa, tin nhắn che, uy tín, bảng kê...) vẫn chưa hoàn tất; DB có command không đồng nghĩa backend đã có API/E2E.

Chi tiết: `docs/backend/chuyen-command.md` và `docs/backend/danh-gia-thanh-that.md`. Không deploy, không chờ vòng lặp.

Bản sao source trước chuyển command (để đối chiếu vì checkout không có .git): `backend/.tmp/source-truoc-command.tar.gz`. Không tự khôi phục owner từ bản này.
