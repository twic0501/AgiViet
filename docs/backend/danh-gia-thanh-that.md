# Đánh giá thành thật: backend sau chuyển command

Cập nhật 26/10/2026, Claude phiên 6 (sau Codex); 50 migrations. Bộ hồi quy xanh lại, runtime không chạy owner. **Chưa sẵn sàng production** (mục 2, 5).

## 1. Kết quả thực tế

| Lệnh | Tình huống | Bước | Nguồn |
|---|---:|---:|---|
| npm test, không AI (PGlite) | 72/72 | 544/544 |
| npm run test:pg (PostgreSQL 17 nhúng thật, login cổng) | 72/72 | 544/544 | backend/test/ket-qua.json |
| AGV_TEST_AI_URL, dịch vụ AI cục bộ | 53/53 | 393/393 | trước 2 ca lượt giao diện 3, chưa chạy lại |
| npm run test:commands | 11/11 | 11 kiểm quyền | backend/test/ket-qua-quyen-command.json |
| npx tsc -p . | sạch | — | mã hiện tại |

Kiểm qua fastify.inject trên PGlite một kết nối. Chưa kiểm nhiều phiên PostgreSQL, tải, ngân hàng/SMS/billing thật hoặc triển khai.

Những chỗ kiểm thử đã đổi ở phiên 6 và lý do (để người đọc tự đánh giá, không phải che lỗi):
- TH-001: xác minh một người → luồng hai người (DB không cho mở tổ chức mới bằng một người); vẫn kiểm `/verify` cũ trả lỗi rõ.
- TH-003/TH-061: chủ hộ cấp thêm `lot.update` cho người giúp qua API mới trước khi người giúp đặt giá/đăng (seed chỉ có `lot.draft`).
- TH-027: lệnh phản đối `rut_phan` của người bán gửi kèm PIN (ký biên bản rút là bắt buộc).
- TH-046: tải ảnh chứng cứ vào đơn trước khi xin hủy bất khả kháng; thêm kiểm thiếu chứng cứ trả 422.
- GD-03, TH-AM-1, GD-05: định dạng mã do DB cấp (BEFORE, TOPUP-, TASK-).
- test:commands: ba kiểm “mong 501” đổi sang hành vi command mới.

## 2. Owner: đếm thật

**0 bước ghi nghiệp vụ còn chạy owner trong runtime thường, kể cả chế độ thử.**

- src/nghiep-vu và src/pdf không còn câu INSERT/UPDATE/DELETE nghiệp vụ, ledger.move_qty, core.issue_qr/core.scan_qr trực tiếp.
- Reader mặc định không có DML. DML và CTE ghi bị kiểm quyền DB chặn. Helper chuyển trạng thái/tạo/đóng hạn cũ ném CHUA_HO_TRO. sync_document không có dự phòng owner.
- Mọi command nghiệp vụ chạy dưới login app/ops/system riêng; auth, bank, inspector đúng login/worker. DB lấy danh tính từ session_user; kiểm mới chứng minh đổi GUC không thay tổ chức chủ command.
- Owner chỉ dùng nạp migrations/seed/cache, khởi tạo/đặt lại và import fixture thử có tên rõ. Không có API nhập SQL/owner. Session recovery có thể reset authorization trên kết nối vật lý nhưng không chạy nghiệp vụ bằng owner.
- Hạ tầng còn SQL trực tiếp dưới **vai không owner**: broker quản lý role/login_principals; meta quản lý idempotency/phát sự kiện; clock ghi cmd.test_clock chỉ thử. Không vai nào trong số đó có DML sổ tiền/lượng.

Reader dùng BYPASSRLS + SELECT để phục vụ truy vấn API hiện có; đây là quyền rộng và vẫn cần kiểm quyền ở API. Chưa coi đây là phương án production đúng. PGlite dùng một kết nối vật lý đổi session authorization; production vẫn từ chối khởi động vì chưa có pool PostgreSQL thật.

## 3. Phần chạy được bằng command

Đã nối lô/nhu cầu/chào/giữ/đơn/ký, cọc và khoản trả, chuẩn bị/xuất/nhận/nghiệm thu/thiếu lượng, quyết toán/chi/hoàn/đối soát, hủy sau cọc, phụ lục, kiểm định, thành viên/vai/tài khoản/chủ đầu tiên, việc/cuộc gọi/outbox/hẹn giờ. Bảng tên command cụ thể và phạm vi từng login ở [chuyen-command.md](chuyen-command.md).

Quyết toán gọi **cmd.create_settlement**; không còn backend tự chia C_nb/C_bm, ghép sổ cái, tạo lệnh hoặc khoản công nợ. Số hiển thị và PDF đọc từ snapshot core.settlements. Các ca kiểm định người bán đúng/sai, không kết luận, giảm phụ lục, hoàn thừa, hủy sau cọc, trả sau, duyệt nội bộ, OTP/idempotency tiếp tục đạt trong bộ kiểm hiện tại.

PDF hợp đồng/phụ lục/nghiệm thu/kiểm định/biên bản hủy được tạo bytes/hash trước rồi đưa payload vào command; chữ ký qua command có OTP hoặc receipt PIN đúng bản/người/thiết bị. Không INSERT metadata/chữ ký bằng owner.

PDF quyết toán hiện là **bản trình bày riêng của backend**, draft/presentation_only, đọc lại quyền đơn và settlement đã commit trước khi trả file. Không giả chữ ký hoặc metadata core.documents. Chưa có command system đăng metadata loại này; chứng từ lệnh ngân hàng tự sinh phiên trước cũng chưa có đường metadata tương ứng. Đây là giảm chức năng phải nêu rõ, không gọi hoàn thiện PDF production.

Giữ URL/envelope/tên trường response, nhưng không thể tuyên bố API hoàn toàn tương thích: các nhánh thiếu command trả 501, gửi BBNT cần PIN mới, một số vai bị DB kiểm chặt hơn và mã khoản/reference do DB cấp khác mẫu cũ. OpenAPI đã cập nhật phần này.

## 4. Những ca chưa đạt

10 số demo 0001–0010 (chỉ môi trường thử): bí danh đăng nhập, `npm run demo:10-so` dựng bằng API thật (src/demo/dung-demo.ts), kiểm DEMO-10-SO; đã dựng trên 18080.

Lỗi chặn bảng đối chiếu (DC-NV11, DC-NV26, DC-NV24, DC-B08, DC-NV22, DC-B18 trong test/tinh-huong-13.ts): thêm hành động `delivery.record` và `hanh_dong` theo đợt; cờ ký `seller_agreed_at/buyer_agreed_at`; điều khoản dự thảo dựng từ DB thay vì 500; tìm nguồn ẩn lô quá 14 ngày theo giờ yêu cầu; `dot_hien_hanh_id`; lý do từ chối giữ ở sự kiện `don.dong_truoc_coc` và trả `ly_do_dong`. Phần UI (seller.js đọc `dot_giao[0]`) thuộc frontend.

App bán 0056–0057: `GET /v1/seller/verified-products`, chặn lô chưa xác minh từ bản nháp (422 `MAT_HANG_CHUA_XAC_MINH`), `GET|POST /v1/production-sites`, `GET|POST /v1/farm-diary`, ảnh vườn qua `/v1/files entity=production_site`, `POST /v1/lots/{id}/urgent-sale` (bên mua thấy cờ + xếp đầu), `GET|POST /v1/seasonal-orders`, `GET /v1/seasonal-orders/{id}`, `POST …/production-updates`, `POST …/harvest-fix` (+ accept/reject/sign phụ lục `fix_qty_price` qua API phụ lục hiện có), `POST /v1/deliveries/{id}/batch-price`; mất mùa qua amendments `force_majeure_reduction`. Kiểm TH-NV-01..06. Chưa có ca kiểm giá công thức và tiền từng đợt bao tiêu tới nghiệm thu.

Lối tắt nhà vườn: `GET /v1/weather` (Open-Meteo, tọa độ tỉnh cố định, bộ đệm 1 giờ, lời khuyên mưa/nóng/gió, mạng lỗi trả 503), `GET /v1/news` (RSS 4 báo đã kiểm còn chạy, chỉ tiêu đề/nguồn/ngày/link; Báo Đồng Tháp RSS lỗi 500 nên chưa dùng), `GET /v1/seller/history` (gộp từ bảng sẵn có). Kiểm bằng fixture mạng (TH-TI-01..03), đạt cả trên Postgres thật; đã đọc thử RSS/Open-Meteo thật một lần. Khởi động lại stack tên miền: `AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/dung.sh` rồi `AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/khoi-dong.sh`.

**Postgres thật: đạt 56/56, 410/410** (`npm run test:pg`, PostgreSQL 17 nhúng, một tiến trình backend, pool đăng nhập `agv_backend_gateway`, SET LOCAL ROLE, DB 0054 nhận danh tính qua cổng tin cậy). Chưa kiểm: nhiều tiến trình/tải đồng thời thật, máy ARM của Oracle, TLS. Retry 40001 có trong mã nhưng bộ thử chạy tuần tự nên chưa gặp. Hạ tầng Oracle cần đặt `DATABASE_URL` backend là `agv_backend_gateway`; backend production từ chối URL owner.
Phiên đăng nhập OTP đã lưu bền, kể cả của người giúp và người đăng ký đang chờ (0055). Thử thách OTP chưa kiểm và bộ giới hạn gửi OTP vẫn ở bộ nhớ.
Reader BYPASSRLS được giữ, vì RLS của DB chỉ cho đọc dữ liệu tổ chức mình. Chưa có chính sách cho dữ liệu công khai/vận hành (de-xuat-csdl mục 17).

Sau 0051–0052: phụ lục giảm giá chạy (TH-AM-2 kiểm hoàn cọc 1.800.000, giữ phí 138.000), mã nạp cọc `TP`+12 số, chia lại sau phản đối nối `revise_acceptance_after_objection` (GD-04 lại có `resubmit_acceptance`). TH-R2-CANLAI đạt 7/7 sau khi DB sửa đồng hồ tranh chấp (de-xuat-csdl mục 16) và backend cho người bán đồng ý bản chia lại (các phần mới ở `disputed` do `agree_acceptance` đóng).

Lượt giao diện 3: hai nhánh còn trả 501 do DB (de-xuat-csdl mục 15): phụ lục giảm giá (hoàn phí thiếu căn cứ) và cân lại khi tranh chấp mở. GD-04 đổi kỳ vọng: không quảng cáo `resubmit_acceptance` khi chưa có biên bản rút.

Không còn ca hỏng trong bộ hiện có. Giới hạn còn lại (không có kiểm thử đỏ nhưng cần biết):
- Còn trả 501 rõ: xác minh tổ chức một người (`/v1/ops/orgs/{id}/verify`), đăng nhu cầu nháp nhập ngoài, tạo khoản trả tùy ý, mời người chưa có danh tính (cần `create_invitee`), phản đối dòng tại điểm nghiệm thu ngoài luồng hiện có, nhà xe xác nhận thật.
- Billing gói là mô phỏng; DB đòi biên nhận đúng giá tháng trong khi chính sách 11 tính tháng đầu theo ngày: API trả cả hai số, cần chốt (de-xuat-csdl mục 14).
- Reader BYPASSRLS, phiên/OTP trong bộ nhớ, chưa có pool PostgreSQL thật (như mục 2).

## 5. Mô phỏng và phần chưa làm khác

Ngân hàng, SMS/OTP, PIN 2468, khóa ký thử, nhà xe/kiểm định là mô phỏng; dữ liệu PII TEST-NOT-ENCRYPTED. Sổ tiền/lượng, command, trigger, OTP binding, HMAC webhook và hash PDF có chạy thật trong PGlite, không đồng nghĩa tiền/chữ ký số công cộng thật.

Chưa có production pool/retry đồng thời đã kiểm chứng, phiên đăng nhập bền vững, KMS/eKYC/MST/SMS thật; chưa hoàn thiện API khung/nhóm/bao tiêu/đặt trước/lô gộp, tôm/lúa, uy tín/chống lách/tin nhắn che, bảng kê. Không deploy trong đợt này.
