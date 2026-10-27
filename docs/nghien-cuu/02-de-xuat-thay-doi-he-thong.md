# Bổ sung hồ sơ nguồn có kiểm chứng

Ngày đối chiếu tệp: **27/10/2026**. Đây là đề xuất thay đổi, **không sửa mã, không chạy kiểm thử ứng dụng và không xác nhận deployment**. Phạm vi đọc là các tệp được dẫn dưới đây; “chưa kiểm thấy” không khẳng định đã rà hết mọi nhánh mã. Căn cứ nghiệp vụ gồm [tổng quan](../nghiep-vu/00-tong-quan.md), [ghép cung cầu](../nghiep-vu/05-ghep-cung-cau-va-chong-lach.md), [vận hành thủ công](../nghiep-vu/08-van-hanh-thu-cong.md) và [báo cáo nghiên cứu chính](01-xac-minh-nguoi-ban-co-nhan-vien.md).

**Đề xuất ưu tiên:** trước cuộc thi làm một lát cắt đầy đủ trên dữ liệu thử: nhận đăng ký → khảo sát → duyệt độc lập bằng chứng → đối chiếu yêu cầu hai bên mua → lấy mẫu trước đơn → bên mua duyệt nguồn. Nhánh trả sau không cọc trình diễn riêng như phương án đề xuất, không bỏ cọc trong luồng hiện có để giả tính năng đã hoàn chỉnh. Sau cuộc thi mới thử quy trình thật theo cụm, hoàn thiện quyền truy cập, đối tác xác minh/kiểm nghiệm và nhánh hợp đồng công nợ. Nền hiện có đủ một số cấu trúc để kế thừa, nhưng chưa đủ căn cứ gọi là hệ thống thẩm định nhà cung cấp theo từng bên mua hoặc cấp tín dụng.

## 1. Hiện trạng đọc được khác với tính năng đầu cuối đã kiểm chứng

### 1.1. Nền có thể kế thừa nhưng không được đổi nghĩa nhãn cũ

| Lớp | Sự thật kiểm thấy trong tệp | Khoảng trống liên quan đến mô hình mới |
|---|---|---|
| Định vị/phạm vi | [Đặc tả 00](../nghiep-vu/00-tong-quan.md), mục 2–4: trung gian, seller miễn phí, tám mặt hàng/bốn phân khúc, đối tác tiền/kiểm định và chữ ký số là mô phỏng | Không mở rộng phạm vi sang hàng khác hoặc tự sở hữu hàng/đảm bảo thanh toán chỉ vì thêm nhân viên |
| Đăng ký người bán | [app.js](../../frontend/shared/app.js), dòng 279, 318: người bán được mời; [README frontend](../../frontend/README.md), phần đăng nhập/quản trị | Chưa có căn cứ coi app bán đã có luồng tự đăng ký sơ bộ → hẹn hiện trường |
| Đăng ký bên mua | [enrollment.js](../../frontend/shared/enrollment.js), dòng 8–26 có OTP, doanh nghiệp/MST và chờ xác minh | Form thiên về doanh nghiệp; mở seller phải phân loại hộ/HTX/tổ hợp tác/phân phối, không ép mọi chủ thể có cùng giấy tờ |
| Xác minh chủ tổ chức | [to-chuc.ts](../../backend/src/nghiep-vu/to-chuc.ts), dòng 65–97; [migration 0034](../../db/migrations/0034_lenh_danh_tinh_va_chu_ky.sql), dòng 32–70 có hai người cấp chủ | Là xác minh chủ, không là xác minh sản lượng, kho, GAP hay năng lực giao hàng |
| Level cũ | [migration 0002](../../db/migrations/0002_to_chuc_nguoi_dung.sql), dòng 38–61 có `verification_level` 0–2; migration 0034 dòng 57 đặt level 2 khi duyệt chủ | Không tái nghĩa level 2 thành S2 hiện trường hoặc “đủ xuất khẩu”; các ký hiệu S0–S3 trong báo cáo 01 là thiết kế mới |
| Route xác minh tổ chức | [to-chuc.ts](../../backend/src/nghiep-vu/to-chuc.ts), dòng 59–61: `/v1/ops/orgs/:id/verify` trả `CHUA_HO_TRO`; [migration 0049](../../db/migrations/0049_lenh_dang_ky_goi_va_tai_lieu_he_thong.sql), dòng 58–74 có command bổ sung | Route hoặc SQL tồn tại không chứng minh backend/UI đã nối đúng và chạy được |
| Địa điểm, giấy chứng nhận | [migration 0003](../../db/migrations/0003_danh_muc_dia_diem.sql), dòng 130–166 có `core.production_sites`, `core.certifications`, phạm vi và hiệu lực/thu hồi | Cần kết nối chuyến thăm, nguồn bằng chứng, phiên bản kết luận; giấy cấp tổ chức không tự phủ mọi hộ/site/sản phẩm |
| Kho/phương tiện | Migration 0003 dòng 171–190 có `core.facilities`; [migration 0009](../../db/migrations/0009_giao_nhan_van_hanh.sql), dòng 142 trở đi có xe/chuyến | Tài sản đăng ký không tự là công suất còn trống, quyền sử dụng hiện tại hay nhiệt độ hành trình |
| Ghép và cache | [ghep.ts](../../backend/src/nghiep-vu/ghep.ts), dòng 18–55 có fallback, dòng 103–158 dựng snapshot AI; [migration 0012](../../db/migrations/0012_thi_truong_su_kien.sql) có `mkt.match_candidates` | Fallback đọc được chưa thấy đầy đủ kiểm giấy/site/thị trường/thời điểm như H4; phải có cổng điều kiện cứng chung cho AI và fallback |
| Hàng việc | Migration 0009 dòng 248–285 có `ops.tasks`, `ops.task_actions`, `ops.calls`, `ops.work_logs`; [van-hanh.ts](../../backend/src/nghiep-vu/van-hanh.ts), dòng 11–24 | Đóng việc bằng ghi chú không đồng nghĩa hồ sơ năng lực đã được duyệt; cần kết quả cấu trúc và quyền chuyển trạng thái |
| Chứng cứ cho người duyệt | [admin.js](../../frontend/quan-tri/admin.js), dòng 68–85 tự báo chưa có quyền mở chứng cứ tổ chức khác | Reviewer phải xem được đúng chứng cứ trong case được giao; không chỉ thấy UUID hoặc tick “đã đọc” |
| Mẫu đang có | Migration 0009 dòng 109–133: `core.sealed_samples`/`core.inspections` gắn `delivery_id NOT NULL`, có custody log | Mẫu trước đơn chưa có delivery; không tạo giao hàng giả để dùng bảng này |
| Cho nợ trong khung | [migration 0005](../../db/migrations/0005_don_hop_dong.sql), dòng 277–315 có `extra_credit_vnd`, `core.framework_credit_grants`; [migration 0043](../../db/migrations/0043_lenh_khung_va_nhom.sql), dòng 58–65 có command cấp thêm | Chưa kiểm thấy HTTP/UI khung nối đầy đủ; đây không phải mô-đun thẩm định khả năng trả tiền của buyer |
| Scope và đăng nhập | [migration 0055](../../db/migrations/0055_phien_ben_cho_dang_ky_va_nguoi_giup.sql), dòng 1–60 có member/pending/helper; [phien.ts](../../backend/src/auth/phien.ts) và README mô tả OTP, đặc tả 08 yêu cầu FIDO2 | Giữ giới hạn quyền chờ/người giúp; không nói passkey vận hành đã được triển khai |

Các nhận định trên là kết quả đọc mã/tài liệu, không phải bằng chứng API chạy thành công hay DB đang chạy đã áp dụng migration tương ứng. Log/README cũ không được dùng thay kiểm thử hiện tại. Không có số liệu thực tế về chi phí, tỷ lệ đạt hay thu hồi nợ để backfill thành kết quả vận hành.

### 1.2. Trả sau không cọc cần sửa một nhóm chính sách thống nhất

| Quy tắc hiện tại | Điểm xung đột | Sửa đặc tả được đề xuất, chưa áp dụng |
|---|---|---|
| K02 mặc định cọc 30%, K07 hiệu lực/bảo vệ gắn cọc | Không thể chỉ đổi tỷ lệ thành 0 mà giữ điều kiện hiệu lực chờ ngân hàng | Có `payment_mode`: `bank_deposit` hoặc `seller_approved_postpay`; mỗi nhánh có điều kiện có hiệu lực/sẵn sàng giao và thông điệp dịch vụ rõ |
| K14, LA-01/LA-03 che/mở liên lạc gắn cọc | Thẩm định và mẫu xảy ra trước đơn/cọc, cần chia sẻ có mục đích | Quyền thẩm định trước giao dịch theo cặp, mục đích, dữ liệu, người nhận, hạn và đồng ý; không tự mở toàn bộ liên lạc |
| K22 hạn mức khung = cọc + cho nợ thêm | Nhánh 0 cọc không có tài sản bảo đảm từ cọc | Hạn mức do seller/đối tác chịu rủi ro duyệt riêng; tổng phơi nhiễm và giữ hạn mức nguyên tử; không dùng hạng buyer tự động cấp nợ |
| V14 vi phạm thanh toán có chi cọc trừ nợ | 0 cọc không có tiền để chi; không được tạo lệnh chi 0 rồi coi đã xử lý nợ | Quá hạn tạo việc thu hồi/chứng cứ nợ, chặn cam kết mới đúng chính sách; thanh toán thực nhận vẫn phải đối soát |
| Phí giới thiệu/hoàn phí thu cùng cọc | Nhánh không cọc không còn điểm thu này | Billing riêng theo gói/việc/kỳ, nêu nghĩa vụ và hoàn phí; giữ snapshot phí đã ký |
| Luồng mẫu hiện gắn giao hàng; QR/sẵn sàng giao liên quan trạng thái đơn | Mẫu trước đơn không có giao hàng, kết quả mẫu không là nghiệm thu hàng tương lai | Thực thể mẫu trước đơn độc lập, có liên kết sang đơn sau; rà mọi điều kiện mở liên lạc, hiệu lực, QR, thu phí và thông điệp |

Hai bên phải được thấy rõ nhánh trả sau có hồ sơ và dịch vụ hỗ trợ nào, rủi ro nào do bên nào nhận. Không tiếp tục dùng câu “đã được bảo vệ bằng cọc” cho giao dịch không cọc. Việc AgiViet đánh giá hồ sơ không tự là bảo lãnh, cho vay hoặc bảo hiểm. Hiệu lực pháp lý mô hình hợp đồng cụ thể **chưa kiểm được**, cần rà trước mở thật.

## 2. Trước cuộc thi ưu tiên một luồng đầy đủ trên dữ liệu thử

**Toàn bộ mục 2–6 là đề xuất.** “Trước cuộc thi” là mức ưu tiên phạm vi, chưa phải lịch cam kết vì chưa có ngày thi và nguồn lực kỹ sư. P0 là các phần cần cho tuyên bố đã trình diễn được luồng xác minh; P1 là phần tiếp theo khi đủ P0. Nếu chỉ có màn tĩnh hoặc quy trình chưa nối backend, phải ghi đúng mức đó trong phần trình bày.

### 2.1. Các gói công việc có đầu ra và người chịu trách nhiệm

| Ưu tiên/lớp | Thay đổi cụ thể | Phụ thuộc và người phụ trách đề xuất | Điều kiện nghiệm thu trước trình diễn |
|---|---|---|---|
| **P0 — đặc tả** | Mô tả đăng ký, case khảo sát, bằng chứng, duyệt độc lập, hồ sơ thiếu/hết hạn, yêu cầu từng buyer và mẫu trước đơn | Chủ nghiệp vụ + vận hành; dùng phạm vi tám mặt hàng hiện tại | Không có nhãn “đã kiểm toàn bộ”; mô tả được ai quyết định và phạm vi của từng nhãn |
| **P0 — DB** | Thêm case, chuyến thăm, phiên bản nhận định, yêu cầu buyer và qualification; liên kết bảng site/certification/task có sẵn | Kỹ sư DB/backend; sau thống nhất từ điển trạng thái | Ràng buộc người lập khác duyệt, provenance và version; dữ liệu cũ thiếu proof không tự thành đạt |
| **P0 — backend** | API case có command rõ; đọc chứng cứ theo case; dịch vụ điều kiện cứng chung, tái kiểm lúc chào/ký/cam kết | Backend + phụ trách bảo mật; cần schema và phân vai | Gọi API thẳng không tự duyệt/đọc ngoài quyền; AI lỗi không làm lọt nguồn sai điều kiện |
| **P0 — app bán** | “Nhờ nhân viên đăng ký”, khai tối thiểu, đồng ý thu thập, xem lịch/nhân viên/phần thiếu; chủ tự xác nhận dữ liệu | Frontend bán + vận hành; cần receipt/scope chờ | CTV không giữ OTP hoặc ký hộ; người bán thấy đúng tiêu chí/ngày/phạm vi, không chỉ huy hiệu |
| **P0 — app mua** | Yêu cầu nguồn theo sản phẩm/thị trường, hard/preferred; xem vì sao khớp/thiếu; xin thẩm định/mẫu và ghi preference trả sau | Frontend mua + nghiệp vụ; cần requirement/eligibility | Một nguồn có thể phù hợp buyer A, thiếu buyer B; không làm lộ giá kín hay giấy tờ nhạy cảm |
| **P0 — quản trị** | Case theo vùng/SLA, checklist, ảnh, bản gốc có quyền, hàng chờ duyệt, trả bổ sung/thu hồi, sắp hết hạn, giờ công | Frontend quản trị + VH-QL/VH-RR; cần endpoint chứng cứ | Reviewer thực sự mở được tài liệu cần; log đọc và quyết định theo phiên bản; người lập không tự duyệt |
| **P0 — mẫu trước đơn** | Tạo yêu cầu, protocol/phí, package/niêm phong/QR, custody, kết quả và buyer chấp thuận nguồn | Backend + hai app + điều phối; độc lập delivery | Chưa có đơn vẫn chạy được mẫu; không kết luận/timeout không thành đạt; đổi site/vụ thì xem lại |
| **P1 — hồ sơ buyer** | KYB, tham chiếu thanh toán có đồng ý, nhận định tín dụng có hạn, mẫu số lịch sử; tách tự khai/đối soát | VH-RR/VH-DS + backend; cần quyền dữ liệu tài chính | Buyer mới hiện “chưa có dữ liệu”; không có huy hiệu tự cấp hạn mức |
| **P1 — demo trả sau riêng** | Reviewer xem hồ sơ, seller tự chấp thuận hạn mức, mô phỏng giữ/chuyển nợ/trả/quá hạn | Nghiệp vụ + backend; chỉ dữ liệu thử, chưa bật nhánh đơn chính | Nhãn “kịch bản đề xuất”; không bypass cọc hiện tại, không giả đã có hợp đồng/tiền thật |
| **P1 — đo và theo dõi** | Chi phí hồ sơ/chuyến, lịch cập nhật, mẫu được chấp thuận, đơn lặp, nợ đến hạn/quá hạn với mẫu số | Vận hành + phân tích dữ liệu | Số demo tách số pilot; không đưa chỉ tiêu giả thành thành tích |

### 2.2. Những tài liệu cần sửa trước khi kỹ sư triển khai

| Tài liệu nghiệp vụ hiện có | Nội dung bổ sung/chỉnh đề xuất |
|---|---|
| [00-tong-quan.md](../nghiep-vu/00-tong-quan.md) | Định nghĩa S0–S3 là độ sâu hồ sơ; phù hợp buyer là kết luận riêng; giới hạn trách nhiệm; phiên bản chính sách nhánh không cọc, không đổi ngầm K02/K07/K14/K22 |
| [01-mat-hang.md](../nghiep-vu/01-mat-hang.md), [02-phan-khuc-ben-mua.md](../nghiep-vu/02-phan-khuc-ben-mua.md) | Checklist theo cây/ao/phân phối; yêu cầu theo mặt hàng/thị trường và buyer, không một hạng xuất khẩu chung |
| [03-vong-doi-don.md](../nghiep-vu/03-vong-doi-don.md) | Máy trạng thái case/mẫu/chấp thuận nguồn và điều kiện tạo cam kết; không dùng delivery giả; sau này thêm nhánh hiệu lực trả sau |
| [04-tien-va-coc.md](../nghiep-vu/04-tien-va-coc.md) | Nhánh cọc hiện tại giữ nguyên đến khi policy mới duyệt; thiết kế hạn mức/exposure, thu phí không cọc và xử lý quá hạn không có chi cọc |
| [05-ghep-cung-cau-va-chong-lach.md](../nghiep-vu/05-ghep-cung-cau-va-chong-lach.md) | H4 đúng site/product/market/nhóm thành viên/thời điểm; qualification theo requirement version; mở liên lạc thẩm định có quyền; hard gate không bị điểm mềm bù |
| [06-kho-van-chuyen-qr.md](../nghiep-vu/06-kho-van-chuyen-qr.md), [07-tai-lieu-pdf.md](../nghiep-vu/07-tai-lieu-pdf.md) | QR mẫu trước đơn/chuỗi giữ mẫu; snapshot kết luận, mẫu, yêu cầu và payment mode; giữ nguyên tài liệu đã ký |
| [08-van-hanh-thu-cong.md](../nghiep-vu/08-van-hanh-thu-cong.md) | Mở rộng V01–V04/V24: phân công, nội dung kiểm, duyệt độc lập, tái kiểm, giờ công; sửa V14 theo mode; SLA chờ cơ quan/khách và mốc cập nhật rõ; không làm P3 treo vô hạn |
| [09-tinh-huong-kiem-thu.md](../nghiep-vu/09-tinh-huong-kiem-thu.md), [10-du-lieu-ao.md](../nghiep-vu/10-du-lieu-ao.md) | Thêm tình huống ở mục 5; fixture chứng nhận giả lập có nhãn, không sao giả giấy cơ quan thật; lưu thời gian thử rõ |
| [11-mo-hinh-kinh-doanh.md](../nghiep-vu/11-mo-hinh-kinh-doanh.md), [12-yeu-cau-cho-ky-su.md](../nghiep-vu/12-yeu-cau-cho-ky-su.md) | Seller miễn phí cơ bản; buyer/chương trình trả thẩm định/aftercare; dữ liệu và API mới, RBAC, invariants, acceptance và chỉ số pilot |

### 2.3. Hợp đồng dữ liệu được đề xuất, không phải tên bảng đã triển khai

Các tên dưới đây là **tên đề xuất** để kỹ sư rà với schema hiện tại trước khi tạo migration. Tận dụng tổ chức/site/certification/task có sẵn; không tạo một boolean `verified` để thay toàn bộ mô hình. Mỗi thực thể có ID, thời gian UTC, actor, version và liên kết audit; tiền dùng số nguyên VND. Hồ sơ nộp duyệt phải có snapshot/hash hoặc tập version được cố định, không cho sửa ngầm sau khi reviewer đã xem.

| Nhóm bản ghi đề xuất | Trường/quan hệ chính | Ràng buộc nghiệp vụ |
|---|---|---|
| `ops.verification_cases` | org/subject, scope, requester, checklist_version, người lập/đi thăm/duyệt, lịch, status, submitted_version, submitted/approved/expires_at, reason | `draft → scheduled → in_progress → submitted → approved/needs_information/rejected`; sau duyệt có expired/suspended/revoked. Người duyệt khác người lập và người khảo sát; nộp lại khi đổi nội dung |
| `ops.site_visits` | case/site, visited_by, thời gian chụp khai báo/nhận server, tọa độ/accuracy, thiết bị, ảnh/bằng chứng, phương pháp, sai lệch và phần chưa quan sát | Ảnh thư viện gắn nhãn tải lên; offline không tự đổi EXIF thành giờ server; vị trí thiếu/sai cần đánh giá, không tự pass/fail |
| `core.supplier_claim_versions` | subject org/site/product/season, criterion, value/unit, provenance, source/issuer/document, phương pháp/người kiểm, issued/checked/valid_until/revoked_at, supersedes | Phân biệt `self_declared`, `agiviet_checked`, `third_party_certified`; có trạng thái đối chiếu riêng. Lab result giữ loại kết quả thử nghiệm, không ép thành chứng nhận |
| Mở rộng liên kết `core.certifications` hiện có | certification → claim/evidence/issuer check history, phạm vi thành viên/site/product/market và phiên bản tiêu chuẩn | Chứng chỉ tổ chức chỉ phủ phạm vi được cấp; thu hồi không xóa lịch sử. Hạn chứng chỉ khác hạn AgiViet cần cập nhật |
| `core.buyer_requirement_versions` + items | buyer, product, market, site/delivery profile, mùa/thời gian giao, hard/preferred, acceptable evidence, rule/source version, valid period | Chỉnh yêu cầu tạo version mới; người chịu trách nhiệm quy tắc thị trường rõ; không để AI tự tạo nghĩa vụ pháp lý |
| `core.supplier_qualifications` | seller/site/product/season, requirement_version/market, input claim versions, kết quả từng tiêu chí, trạng thái tổng, reviewed_by, valid_until, buyer approval riêng | Các kết quả `eligible_for_shortlist`, `conditional`, `insufficient_evidence`, `not_met`, `suspended`; thiếu hard gate không thành khớp đủ nhờ điểm cao |
| `core.preorder_sample_requests/packages/events/results` | buyer/seller, requirement/site/lot/season, protocol, phí/người trả, lịch; niêm phong/QR; custody; method/lab/result; buyer decision, validity scope | Không cần delivery để tồn tại; event chỉ ghi thêm; kết quả không kết luận hoặc im lặng không tự thành đạt; liên kết đơn khi có đơn |
| `ops.buyer_credit_reviews` | KYB/ref/financial evidence hạn chế quyền, người lập/duyệt, nhận định/rủi ro, checked/valid_until, source count | Không phải hạn mức do AgiViet bảo lãnh; tự khai không thành lịch sử đã đối soát; đọc/sửa có quyền riêng |
| `core.trade_credit_agreements` | seller–buyer, payment mode, limit/tenor/currency, hiệu lực, review_version, seller acceptance, policy_version, approvers, reason | Người chịu rủi ro ký; tăng/giảm/thu hồi lưu lịch sử. Bắt buộc đủ điều kiện trước mở mode trả sau thật |
| Sổ `credit_reservations`/exposure | agreement/order/đợt, reserved/receivable/settled/released, số tiền, sự kiện nguồn, idempotency key | Giữ nguyên tử khi cam kết; chuyển reserved thành receivable không đếm đôi; thu/hoàn/hủy không release hai lần; không xóa nợ khi hạn mức hết hạn |
| `pretrade_due_diligence_access` và nhật ký đọc | cặp, mục đích, fields/files được chia sẻ, người nhận, consent, expires/revoked_at, actor access log | Quyền xem hồ sơ không là quyền tải mọi bản gốc; URL có hạn, không công khai CCCD, sổ đất, tài chính hoặc tọa độ chính xác |

### 2.4. Backend phải giữ cùng kết luận khi AI, cache hay giao diện thay đổi

API đề xuất gồm `/v1/onboarding/requests`, `/v1/ops/verification-cases` và thao tác `assign/visits/submit/approve/return/revoke`; nhóm yêu cầu buyer/qualification, mẫu trước đơn và credit review có endpoint riêng. Đây là hợp đồng API cần thiết kế, không nói route đã hoạt động. Không âm thầm đổi handler `/v1/ops/orgs/:id/verify` đang chưa hỗ trợ thành lối cấp hạng tổng quát.

Mỗi command phải kiểm actor/role/case assignment, phiên bản dự kiến, khóa chống lặp và người lập khác người duyệt tại backend/DB, không chỉ ẩn nút giao diện. `approve` phải kiểm lại bộ version reviewer đã đọc; hồ sơ thay đổi sau submit trả lỗi yêu cầu nộp lại. Chứng cứ đọc qua dịch vụ có kiểm quyền theo case/mục đích và URL có hạn, ghi audit đọc; reviewer được phân công có quyền cần thiết nhưng không được mở mọi hồ sơ trong tổ chức khác.

Dịch vụ eligibility chạy **trước cả nhánh AI và fallback**, với cùng nguồn quy tắc. Nó đối chiếu danh tính cần thiết, site/product/market, thành viên nhóm, hiệu lực ít nhất đến ngày giao cuối, nhật ký/cách ly và cờ an toàn liên quan; AI chỉ giải thích/xếp sau cổng này. Giữ H1–H11 và các bất biến hiện hành, không thay bằng điểm S0–S3. Điều kiện tùy chọn thiếu có thể ra “khớp một phần”; điều kiện bắt buộc chưa có proof thì không lọt vào nhóm đủ giao dịch.

Cache lưu requirement version, claim versions và hạn đánh giá. Đổi/thu hồi/hết hạn phát sự kiện làm vô hiệu hóa kết quả và tạo việc nếu ảnh hưởng đơn mở. Vẫn tái kiểm lúc đọc nhạy cảm, gửi chào, ký và cam kết; không dựa duy nhất sự kiện hoặc chu kỳ ghép sáu giờ. Hết hạn giữa shortlist và ký phải được chặn đúng bước. Đơn đã ký giữ snapshot; thay đổi nguy cơ tạo cảnh báo và công việc xử lý, không viết lại quá khứ hay tự hủy mọi đơn.

Nhánh trả sau sau này cần giữ hạn mức và lượng trong giao dịch nguyên tử tại điểm cam kết, với idempotency cho webhook/command. Phải xác định chính xác lúc chuyển cam kết thành khoản phải thu và lúc khoản đó đến hạn theo hợp đồng. Tranh chấp được đánh dấu riêng nhưng không tự xóa tổng rủi ro. Thay hạn mức hoặc thu tiền phải đối soát theo bằng chứng hiện hành, không đọc ảnh chuyển khoản như xác nhận đã nhận.

### 2.5. Quyền ứng dụng và vận hành cần tách theo công việc

| Vai | Được làm trong mô hình đề xuất | Giới hạn cần kiểm tại server |
|---|---|---|
| Chủ hộ/HTX/seller | Xác nhận dữ liệu, consent, yêu cầu sửa, ký bán và chấp thuận công nợ | Không tự sửa provenance/duyệt kết luận; người giúp không có quyền ký/xác nhận tiền/đổi tài khoản |
| VH-HT/CTV | Lịch/case được giao, ghi khảo sát, ảnh, đề xuất nhận định | Không tự duyệt, không xin OTP/ký hộ; không xem tài chính buyer ngoài nhiệm vụ |
| VH-DM | Tra mã/chứng chỉ, xác định phạm vi, quản lý checklist/nguồn yêu cầu có version | Không tự cấp chứng nhận của bên thứ ba hoặc suy mọi thị trường đều chấp nhận |
| VH-RR/reviewer | Xem chứng cứ cần, duyệt độc lập, treo/tái kiểm có lý do | Không sửa dữ liệu gốc sau nộp, không duyệt hồ sơ mình lập/khảo sát, không cấp nợ thay seller |
| VH-QL | Phân công, SLA, ngoại lệ đúng chuỗi phê duyệt | Không nhận luôn quyền tài chính chỉ vì là quản lý hồ sơ; giữ tách mở tài khoản nhận tiền và duyệt chi |
| VH-DS | Kiểm/đối soát bằng chứng thanh toán và công nợ được giao | Không tự suy đã thu tiền từ cuộc gọi/ảnh; không nâng hạng năng lực hoặc hạn mức thay chủ thể |
| Buyer và các vai tổ chức | Đặt yêu cầu, xem phần được chia sẻ, yêu cầu/thử mẫu, duyệt nguồn; kế toán/kho theo vai hiện có | Không đọc toàn bộ tài chính/căn cước seller, không sửa kết luận reviewer/certifier, không vượt thẩm quyền chi |

App bán cần dòng “đã kiểm ngày nào, về điều gì, còn thiếu gì”, lịch hẹn và nút sửa/giải trình. App mua cần màn so sánh yêu cầu–bằng chứng, phần bị chặn/được bổ sung và lý do; phí gói không được đổi kết luận chất lượng. Quản trị cần nhìn cả proof, phạm vi và version trước duyệt; ngoài SLA còn đo công/chuyến và trạng thái chờ khách/cơ quan. Đăng nhập vận hành FIDO2/passkey là yêu cầu đặc tả cần hoàn thiện, chưa được xác nhận có trong runtime hiện tại.

## 3. Sau cuộc thi mở nhánh thật theo cụm và có đối tác chịu trách nhiệm

| Thứ tự sau cuộc thi | Kết quả cần hoàn thành | Căn cứ quyết định mở tiếp |
|---|---|---|
| **S1 — quy trình và quyền dữ liệu** | Đào tạo checklist theo nhóm hàng, hợp đồng CTV/khai quan hệ, phân công độc lập, quyền chứng cứ, đăng nhập vận hành và xử lý thiết bị offline | Kiểm truy cập và hai người duyệt đạt; xác định căn cứ/phạm vi lưu/chia sẻ dữ liệu nhạy cảm và thời hạn lưu theo mô hình thật |
| **S2 — nguồn xác minh/kiểm nghiệm** | Đầu mối tra chứng chỉ/mã thực, quy trình xử lý nguồn không tra được, đối tác lấy mẫu/lab phù hợp, cập nhật quy tắc từng thị trường có version | Không dùng huy hiệu AgiViet thay chứng nhận; mẫu/phương pháp/phạm vi chứng chỉ và giới hạn trách nhiệm được hợp đồng hóa |
| **S3 — pilot có cầu** | Ước thử 1–2 cụm, 12–20 hồ sơ và 2–3 buyer; gom tuyến, ghi mọi công/chi phí, đi lại và kết quả buyer dùng hồ sơ | Các con số chỉ là phạm vi thử. Chốt go/no-go theo chi phí quan sát và ngân sách; không giả một ngưỡng tỷ lệ thành công từ mẫu nhỏ |
| **S4 — trả sau không cọc có kiểm soát** | Rà hợp đồng/chính sách, seller tự nhận hạn mức, exposure nguyên tử, công nợ/thu hồi, billing riêng và kiểm tra end-to-end | Không mở chỉ từ xếp hạng buyer. AgiViet không tự tài trợ/bảo lãnh; nếu có tài trợ/bảo hiểm thì đối tác và hợp đồng riêng rõ |
| **S5 — aftercare và kinh tế** | Lịch cung, mẫu/kiểm lại, giao bù/mua thay thế, báo giá tương lai, đối soát; gói thuê bao/công việc có phạm vi | Buyer chấp nhận trả cho công việc sau giới thiệu; lãi góp trừ công trực tiếp, không dùng GMV/số tài khoản thay lợi nhuận |
| **S6 — mở rộng theo rủi ro** | Luân chuyển, kiểm lại ngẫu nhiên kết hợp rủi ro, kênh phản ánh, thống kê sai lệch theo người/vùng, kiểm dữ liệu gốc độc lập | Tỷ lệ kiểm lại 5–10% nếu dùng chỉ là chính sách thử; ngân sách và khả năng phát hiện phải được đánh giá, không bảo đảm hết thông đồng |

Phụ lục thực hiện cần thỏa thuận cách giao bù và bằng chứng chi phí mua thay thế, người có quyền duyệt, giới hạn và cơ chế tranh chấp; không để một hóa đơn buyer tự tải lên thành khoản tự động khấu trừ. Lịch báo giá trước 15–30 ngày là đầu vào phỏng vấn để đàm phán, chỉ áp kỳ/đơn tương lai, không sửa giá đã ký. Tính pháp lý của các nghĩa vụ này **chưa kiểm được** cho hợp đồng thực tế.

Chỉ số pilot phải có số tuyệt đối, mẫu số và kỳ đo: công/hồ sơ hoàn tất, công/nguồn buyer thực sự dùng, số hồ sơ phải đi lại, quá hạn tái kiểm, chênh lệch tự khai–kiểm lại, mẫu được chấp thuận, đơn đầu/lặp, giao đủ/đúng hạn, khoản đến hạn/quá hạn và đóng góp sau chi trực tiếp. Tách nợ tranh chấp với nợ không tranh chấp, tách dữ liệu thử với quan sát thật. Chưa có dữ liệu để chốt mức phí VND, hạn mức tín dụng hoặc tỷ lệ chuyển đổi tối ưu.

## 4. Migration phải bổ sung dữ liệu, không làm hồ sơ cũ tự thành đã kiểm

| Nguyên tắc triển khai được đề xuất | Hệ quả cần giữ |
|---|---|
| Migration bổ sung trước, rà tên bảng/constraint và dữ liệu thật rồi mới bật UI | Không đổi nghĩa `organizations.verification_level`; cấp chủ cũ vẫn là cấp chủ cũ, không backfill S2/S3 |
| Backfill thận trọng | Thiếu proof/scope/version để `unknown` hoặc `insufficient_evidence`; tài liệu tự khai không thành `agiviet_checked` chỉ vì tồn tại trong DB |
| Phiên bản chỉ ghi thêm | Requirement, claim, qualification, review, consent và credit grant có lịch sử; sửa tạo phiên bản mới; thu hồi không xóa nguồn gốc |
| Giữ chứng nhận đúng bản chất | `core.certifications` tiếp tục là dữ liệu chứng nhận; liên kết proof/issuer checks, không coi lab result hoặc mã hành chính đều là chứng nhận |
| Snapshot khi ký | Đơn/khung giữ yêu cầu, claim/qualification tham chiếu, mẫu, policy, fee và payment mode tại thời điểm ký; cập nhật tạo cảnh báo không viết lại PDF cũ |
| Thay chính sách theo cơ chế hiện tại | Đặc tả 08 yêu cầu hai người duyệt, hiệu lực sau 24 giờ và thông báo; đơn cũ giữ chính sách cũ. Nhánh không cọc phải có version riêng |
| Feature flag theo cụm/môi trường | Đo rồi mới bật hard gate hàng loạt; UI cũ không coi null là đạt. Rollback dừng tạo mới nhưng không xóa nghĩa vụ, exposure hoặc audit |
| Ranh giới thử và thật | Bảng/API phát sự kiện đối tác, đồng hồ thử và chứng chỉ giả lập chỉ ở môi trường thử; bản thật không được cung cấp các lối phát kết quả giả |

## 5. Nghiệm thu cần chứng minh các chỗ dễ bị hiểu sai

Các tình huống sau là **đề xuất kiểm thử khi triển khai**, chưa được chạy trong nhiệm vụ viết báo cáo này. Cần kiểm ở API/DB và hai app khi phù hợp, không chỉ chụp màn hình.

| Mã | Tình huống và kết quả phải chứng minh |
|---|---|
| XM-01 | Seller gửi sơ bộ hoặc CTV nhập có ghi người hỗ trợ; chủ tự xác nhận. Scope chờ chỉ xem/bổ sung/lịch, không tự ký/chấp thuận tiền |
| XM-02 | Người lập/khảo sát tự gọi API duyệt bị từ chối. Người khác duyệt bản đã thay sau submit cũng bị từ chối đến khi nộp lại |
| XM-03 | Reviewer được giao mở được proof cần; CTV/buyer ngoài quyền không mở được cùng URL/file; log đọc ghi actor/case/mục đích |
| XM-04 | Một nguồn S2 có thể phù hợp nhà máy A nhưng thiếu yêu cầu thị trường X của buyer B. Giấy tự khai hoặc sai site/product/member không qua điều kiện cứng |
| XM-05 | Chứng chỉ hết hạn trước ngày giao cuối hoặc bị thu hồi sau cache: AI, fallback và thao tác chào/ký cho cùng kết luận cứng, không dùng điểm uy tín bù |
| XM-06 | Ảnh có GPS nhưng không tra được bên cấp chứng chỉ vẫn “chưa kiểm được”; ảnh thư viện không được gọi là ảnh khảo sát vừa chụp |
| XM-07 | Mẫu trước đơn có custody/niêm phong và người trả phí, không tạo delivery giả. Kết quả chưa kết luận hoặc quá hạn không tự đạt; đổi ao/vụ cần xem lại phạm vi |
| XM-08 | Buyer chưa lịch sử hiện “chưa có dữ liệu” và số quan sát 0; tham chiếu tự khai không nhập như thanh toán đã đối soát; mẫu đạt không tự có công nợ |
| XM-09 | Hai cam kết đồng thời không vượt hạn mức; reserved chuyển receivable không đếm đôi; command/webhook lặp không release hạn mức hai lần |
| XM-10 | Quá hạn/hết hạn mức chặn cam kết mới theo policy; không tự hủy đợt đã chốt, tự xóa tranh chấp hoặc ghi đã nhận tiền từ ảnh chuyển khoản |
| XM-11 | Thu hồi claim làm qualification tương lai bị treo và tạo việc cho đơn mở; PDF/snapshot đơn cũ vẫn giữ nguyên, quyết định xử lý tiếp có actor/lý do |
| XM-12 | Mẫu/thẩm định trước cọc chỉ mở dữ liệu theo consent có hạn; luồng đơn cọc hiện tại không bị bỏ qua. Demo trả sau tách nhãn/phạm vi, không giả có tiền bảo đảm |
| XM-13 | Yêu cầu giao bù/mua thay thế hoặc đổi giá tạo đề nghị có bằng chứng và người duyệt; không tự trừ tiền từ số buyer khai, không đổi giá đơn đã ký |
| XM-14 | Hết quyền CTV hoặc dùng môi trường thật không đọc được cache/tài liệu ngoài phạm vi hay API phát kết quả đối tác giả; hồ sơ thử không trở thành xác minh thật |

Kịch bản trình diễn tối thiểu dùng ba nguồn: một nguồn có bằng chứng còn hiệu lực đúng phạm vi; một nguồn chỉ tự khai; một nguồn có chứng chỉ hết hạn. Cho hai buyer đặt yêu cầu khác nhau để thấy kết quả phù hợp khác nhau; nhân viên khảo sát và người duyệt là hai tài khoản. Chạy mẫu trước đơn với thời gian một tuần **được mô phỏng và gắn nhãn**, có thử tình huống không kết luận. Không dùng giấy giả mang hình thức như chứng chỉ thật của cơ quan/certifier, không tuyên bố đã kiểm với cơ quan nhà nước.

Phần công nợ trình diễn riêng với các số tiền ảo và seller tự chấp thuận; nếu chưa làm được sổ nguyên tử/đủ bất biến thì chỉ trình bày hồ sơ, preference và trạng thái “chưa có hạn mức”, không gọi đó là giao dịch trả sau đã hoạt động. Phần này phải thể hiện rõ AgiViet sẽ làm gì sau giới thiệu: lịch giao, công việc ngoại lệ, nhắc nợ và hồ sơ bằng chứng, thay vì dừng ở huy hiệu xác thực.

## 6. Điều cần kiểm tiếp trước khi mở với người dùng thật

Chưa kiểm phiên bản migration đang áp trên DB chạy, toàn bộ route end-to-end, production deploy, FIDO2 thực tế, thời hạn lưu dữ liệu theo mô hình pháp lý, điều kiện nhập khẩu mặt hàng–thị trường cụ thể, đối tác xác minh/lab/tài trợ và mức sẵn lòng trả của nhiều buyer. Các khoảng trống này không ngăn làm demo có nhãn trên dữ liệu thử, nhưng ngăn tuyên bố đã có chứng nhận, bảo lãnh hoặc quy trình tiền thật hoàn chỉnh.

Nghiên cứu tiếp theo nên bắt đầu từ một buyer có nhu cầu thật và một cụm nguồn: chốt checklist, việc nào AgiViet nhận làm, ai trả công, ai chịu nợ, rồi đo một chu kỳ lấy mẫu–đặt hàng–giao–thu tiền. Khi có dữ liệu đó mới chốt giá dịch vụ và mức độ mở rộng; các con số dự toán trong [báo cáo 01](01-xac-minh-nguoi-ban-co-nhan-vien.md) vẫn là giả định cho đến lúc đo được.
