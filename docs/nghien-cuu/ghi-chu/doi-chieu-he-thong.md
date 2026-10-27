# Đối chiếu hệ thống cho mô hình xác minh có nhân viên

Ngày kiểm tệp: 27/10/2026. Đây là nghiên cứu nội bộ trên mã và đặc tả; không chạy ứng dụng, không kiểm lại các bộ test, không kiểm deployment. Mọi mục “đề xuất” dưới đây chưa phải tính năng đã triển khai. Ghi chú bổ sung cho hai ghi chú khu vực; không lặp lại nghiên cứu case. Đường dẫn tương đối tính từ thư mục gốc dự án.

## 1. Hệ thống đã có gì và còn thiếu gì?

### Takeaway

Đã có nền tổ chức, địa điểm, chứng nhận, hàng việc và phê duyệt hai người cho chủ tổ chức. Chưa thể coi nền này là hồ sơ năng lực được xác minh theo nhu cầu của từng bên mua; cũng chưa có căn cứ coi quy trình mẫu trước đơn và giao dịch không cọc đã được hỗ trợ đầu cuối.

### Cited Findings

| Phạm vi | Kiểm thấy trong tệp | Giới hạn quan trọng |
|---|---|---|
| Phạm vi sản phẩm | [Đặc tả tổng quan](../../nghiep-vu/00-tong-quan.md), dòng 27–64: trung gian, người bán miễn phí, 8 mặt hàng, bốn phân khúc; ngân hàng/kiểm định/chữ ký số là mô phỏng | Không gọi báo cáo này là bằng chứng vận hành với tiền/người dùng thật |
| Người bán đăng ký | [App dùng chung](../../../frontend/shared/app.js), dòng 279, 318: người bán được mời, không có đăng ký tự do; [README giao diện](../../../frontend/README.md), phần “Đăng nhập trực tiếp và quản trị” | Quy trình app sơ bộ → hẹn nhân viên cần được bổ sung; không nói giao diện bán hiện có form này |
| Bên mua đăng ký | [enrollment.js](../../../frontend/shared/enrollment.js), dòng 8–26: nhập OTP, doanh nghiệp và MST; có trạng thái chờ xác minh; vai chủ sau 24 giờ | Form hiện thiên về doanh nghiệp; cần hỗ trợ đúng loại hộ/HTX/tổ hợp tác khi mở cho người bán |
| Hai người cấp chủ | [to-chuc.ts](../../../backend/src/nghiep-vu/to-chuc.ts), dòng 65–97; [routes](../../../backend/src/routes/v1.ts), dòng 131–135; [migration 0034](../../../db/migrations/0034_lenh_danh_tinh_va_chu_ky.sql), dòng 32–70 | Đây là xác minh chủ tổ chức, không tự chứng minh diện tích, kho, sản lượng, GAP hay khả năng giao hàng |
| Level xác minh cũ | [migration 0002](../../../db/migrations/0002_to_chuc_nguoi_dung.sql), dòng 38–61: `verification_level` 0–2; [migration 0034](../../../db/migrations/0034_lenh_danh_tinh_va_chu_ky.sql), dòng 57: duyệt chủ đặt level 2 | Không dùng level 2 làm “đủ xuất khẩu”; cần tách danh tính và năng lực |
| Xác minh tổng quát | [to-chuc.ts](../../../backend/src/nghiep-vu/to-chuc.ts), dòng 59–61: route `/v1/ops/orgs/:id/verify` trả `CHUA_HO_TRO`; [migration 0049](../../../db/migrations/0049_lenh_dang_ky_goi_va_tai_lieu_he_thong.sql), dòng 58–74 có command đề xuất/xác minh tổ chức bổ sung | Có command trong tệp SQL không đồng nghĩa backend/app đã nối đầy đủ; không quảng bá endpoint này hoạt động |
| Địa điểm sản xuất | [migration 0003](../../../db/migrations/0003_danh_muc_dia_diem.sql), dòng 130–149: `core.production_sites` có tọa độ, diện tích và loại vườn/ao/ruộng | Chưa có hồ sơ chuyến thăm, phiên bản kết luận năng lực và provenance theo từng nhận định trong cấu trúc này |
| Chứng nhận | [migration 0003](../../../db/migrations/0003_danh_muc_dia_diem.sql), dòng 152–166: `core.certifications` có tổ chức, địa điểm, sản phẩm, loại, số, thị trường, khoảng hiệu lực, người/ngày kiểm, thu hồi | Cần kết nối bằng chứng và lịch sử kiểm với bên phát hành; một hồ sơ cấp tổ chức không bao phủ mọi vườn hoặc mọi sản phẩm |
| Kho và phương tiện | [migration 0003](../../../db/migrations/0003_danh_muc_dia_diem.sql), dòng 171–190 có `core.facilities` gồm dung tích/nhiệt kho; [migration 0009](../../../db/migrations/0009_giao_nhan_van_hanh.sql), dòng 142 trở đi có xe/chuyến | Đăng ký tài sản không chứng minh quyền sử dụng, công suất rảnh hay nhiệt độ được duy trì |
| Ghép | [Đặc tả 05](../../nghiep-vu/05-ghep-cung-cau-va-chong-lach.md), dòng 19–33 có H1–H11; [ghep.ts](../../../backend/src/nghiep-vu/ghep.ts), dòng 18–55 có fallback luật; dòng 103–158 dựng snapshot AI | Fallback đọc được chưa có đủ kiểm giấy tờ/thị trường/site/time như H4; AI không được là cổng quyết định điều kiện cứng. Cần kiểm cả nhánh khi AI mất kết nối |
| Bộ đệm ghép | [migration 0012](../../../db/migrations/0012_thi_truong_su_kien.sql), dòng 35 có `mkt.match_candidates`; [ghep.ts](../../../backend/src/nghiep-vu/ghep.ts), hàm `ghiBoDem` | Tái kiểm điều kiện lúc gửi chào/ký/cam kết, không tin cache cũ khi chứng nhận vừa bị thu hồi |
| Hàng việc | [migration 0009](../../../db/migrations/0009_giao_nhan_van_hanh.sql), dòng 248–285 có `ops.tasks`, `ops.task_actions`, `ops.calls`, `ops.work_logs`; [van-hanh.ts](../../../backend/src/nghiep-vu/van-hanh.ts), dòng 11–24 và [routes](../../../backend/src/routes/v1.ts), dòng 364–368 | Tận dụng cấu trúc hiện có, bổ sung kết quả xác minh có schema; đóng việc bằng ghi chú không tự tạo qualification |
| Chứng cứ cho người duyệt | [admin.js](../../../frontend/quan-tri/admin.js), dòng 68–85: giao diện tự thông báo chưa có quyền mở chứng cứ tổ chức khác, phải kiểm kênh vận hành trước khi duyệt | Đây là thiếu sót trực tiếp cần ưu tiên: người duyệt phải mở được đúng chứng cứ có kiểm soát quyền, không chỉ thấy UUID rồi tick đã đọc |
| Mẫu hiện tại | [migration 0009](../../../db/migrations/0009_giao_nhan_van_hanh.sql), dòng 109–133: `core.sealed_samples`, `core.inspections` đều gắn `delivery_id NOT NULL`; có custody log bất biến | Mẫu trước đơn đầu không có delivery; không dựng giao hàng giả để tái sử dụng bảng. Phải có thực thể mẫu trước đơn riêng hoặc nguồn mẫu tổng quát có ràng buộc |
| Trả sau hiện tại | [migration 0005](../../../db/migrations/0005_don_hop_dong.sql), dòng 277–315: khung có cọc và `extra_credit_vnd`, lịch sử `core.framework_credit_grants`; [migration 0043](../../../db/migrations/0043_lenh_khung_va_nhom.sql), dòng 58–65 có `cmd.grant_framework_credit` | Có nền “người bán cho nợ thêm” trong DB, chưa kiểm thấy API HTTP và UI khung nối hoàn chỉnh ở `backend/src`; không coi là hệ thống thẩm định tín dụng người mua |
| Phiên người chờ | [migration 0055](../../../db/migrations/0055_phien_ben_cho_dang_ky_va_nguoi_giup.sql), dòng 1–60 phân scope member/pending_registration/helper | Giữ scope chờ: cho bổ sung hồ sơ/xem lịch, không tự mở quyền ký hay giao dịch |
| Đăng nhập vận hành | [Đặc tả 08](../../nghiep-vu/08-van-hanh-thu-cong.md), mục 8 yêu cầu FIDO2; [phien.ts](../../../backend/src/auth/phien.ts), dòng 1 và [README giao diện](../../../frontend/README.md), phần quản trị mô tả OTP | Có khoảng cách giữa đặc tả và mã được đọc; trước vận hành thật cần giải quyết, không nói passkey đã có |

### Inferences

- **Đề xuất:** mô hình dữ liệu nên bổ sung vào nền hiện có thay vì tạo thêm một hệ “đã xác minh” boolean rồi bỏ qua các điều kiện cứng hiện tại.
- **Đề xuất:** phân biệt trạng thái tài khoản, xác minh danh tính, nhận định năng lực, chứng nhận độc lập, đánh giá đủ điều kiện theo bộ yêu cầu người mua và thành tích giao dịch. Đây là sáu loại thông tin khác nhau.
- **Đề xuất:** ghi rõ đánh giá `seller × site × product × mùa vụ × buyer_requirement_version × thị trường`, trong đó một người bán có thể phù hợp chế biến nhưng chưa đủ điều kiện thị trường X.

### Gaps

- Chưa đọc toàn bộ mọi migration để chứng minh tính năng hoàn toàn không tồn tại; kết luận “chưa kiểm thấy” giới hạn trong phạm vi tệp/hàm nêu trên.
- Chưa kiểm database đang chạy đã áp dụng migration nào, dữ liệu thật, deployment, API end-to-end hoặc test pass hiện tại. Log/README cũ chỉ là tự báo cáo lịch sử.
- Các viện dẫn pháp luật trong đặc tả không được xác minh trong nhiệm vụ nội bộ này; không chuyển thành kết luận pháp lý trong báo cáo.

## 2. Nên đề xuất thay đổi trước cuộc thi như thế nào?

### Takeaway

Trước cuộc thi nên trình diễn quy trình xác minh và ghép có giải thích trên dữ liệu thử bằng một lát cắt hoàn chỉnh. Ghi nhận nhu cầu trả sau và mô phỏng thẩm định là cần thiết; không âm thầm đổi luồng cọc hiện hành thành 0 cọc khi các bất biến và hợp đồng chưa đổi đồng bộ.

### Cited Findings

- [Tổng quan](../../nghiep-vu/00-tong-quan.md), K02/K07/K14/K22: cọc mặc định 30%, hiệu lực/bảo vệ gắn cọc, liên lạc mở sau cọc, khung có cọc + cho nợ thêm. [Đặc tả 05](../../nghiep-vu/05-ghep-cung-cau-va-chong-lach.md), LA-01/LA-03: chống lách và mở liên lạc gắn cọc. [Đặc tả 08](../../nghiep-vu/08-van-hanh-thu-cong.md), V14: vi phạm thanh toán dùng cọc trừ nợ.
- [Đặc tả 08](../../nghiep-vu/08-van-hanh-thu-cong.md), V01–V04/V24 và mục 7–8 đã có vai hiện trường, kiểm giấy, đăng ký hỗ trợ, hàng việc và người lập khác người duyệt.
- [Đặc tả 11](../../nghiep-vu/11-mo-hinh-kinh-doanh.md), mục 2–3: người bán miễn phí, bên mua trả gói, mối quen có phí thấp/0; phí hiện thu cùng cọc theo [Đặc tả 04](../../nghiep-vu/04-tien-va-coc.md), mục 1. Đây là chính sách hiện được đặc tả, không phải kết quả kiểm chứng sức sẵn lòng trả.

### Inferences

Toàn bộ bảng dưới đây là **đề xuất**, không sửa mã trong đợt nghiên cứu.

| Ưu tiên | Lớp | Thay đổi cụ thể | Điều kiện xong để kiểm |
|---|---|---|---|
| P0 | Đặc tả | Bổ sung tiểu luồng đăng ký sơ bộ, hẹn, khảo sát, thiếu hồ sơ, nộp, duyệt độc lập, sửa/bác/thu hồi; bổ sung chính sách nhãn theo phạm vi | Không có nhãn “đã kiểm toàn bộ”; xác định rõ ai được duyệt nội dung nào |
| P0 | DB | `ops.verification_cases` gắn org, người yêu cầu, scope, lịch hẹn, nhân viên, reviewer, status, checklist_version, submitted_at, approved_at, expires_at, version, lý do | Hai người độc lập; không duyệt bản hồ sơ đã thay sau khi nộp; thiếu bằng chứng trả `needs_information` |
| P0 | DB | `ops.site_visits`: site, người đi, thời gian chụp và nhận server, lat/lng/accuracy, chứng cứ, sai lệch vị trí, kết luận và hạn cập nhật | GPS không phải bằng chứng tuyệt đối; vắng GPS chuyển kiểm thủ công; ảnh tải thư viện không được gọi là ảnh vừa chụp |
| P0 | DB | `core.supplier_claim_versions`: subject_type/id, tiêu chí, value/unit, provenance (`self_declared`, `agiviet_checked`, `third_party_certified`), người kiểm, phương pháp, source_document, issued/checked/valid_until, revoked_at, supersedes | Giấy tờ bên thứ ba vẫn cần AgiViet đối chiếu trạng thái/phạm vi; hai chiều provenance không bị ghi đè mất lịch sử |
| P0 | DB | `core.buyer_requirement_versions` và items có product, market, delivery profile, hard/preferred, bằng chứng chấp nhận, hiệu lực | Không mặc định mọi thị trường chung một bộ tiêu chí; ràng buộc quy tắc thị trường có người phụ trách cập nhật |
| P0 | DB/backend | `core.supplier_qualifications` gắn người bán/site/product/mùa và requirement_version, kết quả (`eligible_for_shortlist`, `conditional`, `insufficient_evidence`, `not_met`, `suspended`), lý do từng tiêu chí, hạn, reviewed_by | “Đủ đưa vào danh sách xem xét” khác người mua đã duyệt nguồn và khác hàng chắc chắn đạt |
| P0 | Backend | API đề xuất: `/v1/onboarding/requests`, `/v1/ops/verification-cases`, `/:id/assign`, `/visits`, `/submit`, `/approve`, `/return`, `/revoke`; chứng cứ đọc qua URL có hạn, theo case và quyền | DB command kiểm role/độc lập, khóa chống lặp, optimistic version; không chỉ ẩn nút UI |
| P0 | Backend | Dịch vụ kiểm eligibility chung trước AI/fallback, lúc chào/ký/cam kết; cache phải mang requirement/claim version và hết hạn | Cert hết hạn trước ngày giao cuối hoặc sai site/product/market không qua bộ lọc cứng; lỗi AI vẫn giữ cùng kết quả hard gates |
| P0 | App bán | Nút “Nhờ nhân viên đăng ký”, sơ bộ tối thiểu, đồng ý thu thập và cho liên hệ; xem lịch, nhân viên, giấy còn thiếu, từng tiêu chí và ngày kiểm; chủ tự OTP/xác nhận | Nếu form sơ bộ chưa tạo login thì chỉ cấp biên nhận và kênh theo dõi, không giả tài khoản đã xác thực |
| P0 | App mua | Form yêu cầu nguồn theo sản phẩm/thị trường; ba nhóm kết quả kèm lý do, tài liệu thiếu/hết hạn; “Yêu cầu mẫu”, “Xin AgiViet thẩm định nguồn”; ghi preference không cọc/trả sau và kỳ hạn | Không biến phí gói thành ưu tiên chất lượng hoặc quyền xem giá kín; không cho tự nâng hạng nguồn |
| P0 | Quản trị | Hồ sơ khảo sát theo checklist, ảnh và bản gốc kiểm có quyền; hàng duyệt hai người; lý do từ chối; danh sách sắp hết hạn; giờ công/chi phí chuyến | Người duyệt đọc được chứng cứ đúng phạm vi; không thể tự duyệt dù gọi API trực tiếp |
| P0 | Mẫu trước đơn | `core.preorder_sample_requests`, `core.preorder_sample_packages`, `core.preorder_sample_events`, `core.preorder_sample_results` gắn seller, buyer, product, source lot/site, protocol_version, điều kiện bảo quản, phương pháp, người nhận, phí, due_at, kết luận | Không tạo delivery giả; đạt mẫu chỉ mở bước buyer đánh giá nguồn, không bảo đảm tất cả lô sau |
| P0 | Bên mua | Hồ sơ KYB cơ bản và thẩm định trả sau thử: người đại diện/người có thẩm quyền, kho nhận, tham chiếu thanh toán có đồng ý, tài liệu tài chính hạn chế quyền; đề xuất `buyer_credit_reviews` | Kết quả là nhận định có hạn, không phải bảo lãnh; không công khai sao kê hoặc thông tin tài chính thô |
| P0 | Demo trả sau | Trước thi trình diễn riêng “kịch bản đề xuất trả sau không cọc”: reviewer xem hồ sơ, người bán chấp thuận hạn mức, hệ thống mô phỏng chặn vượt/quá hạn; hoặc chỉ thu payment preference nếu chưa đủ nguồn lực | Dải dữ liệu thử, không gọi là giao dịch đã chạy tiền thật/đã được bảo vệ bằng cọc; không bypass trạng thái hiện có trong demo chính |

Đối với “hạng”, ưu tiên bảng đáp ứng theo nhóm xuất khẩu-thị trường X/chế biến/HORECA/đầu mối kèm thiếu gì. Có thể trình bày mức hồ sơ H0 tự khai, H1 danh tính đã kiểm, H2 năng lực đã khảo sát, nhưng đó chỉ là độ sâu kiểm; không phải thang xuất khẩu cao hơn chế biến hay bảo đảm chất lượng hàng. Hạng đủ mua phải thuộc bộ yêu cầu của bên mua có phiên bản.

Luồng mẫu được đề xuất: yêu cầu và thống nhất protocol/phí → đồng ý chia sẻ dữ liệu cần thiết → nhân viên điều phối lấy mẫu/niêm phong → bàn giao có chuỗi giữ mẫu → bên mua thử mẫu và/hoặc lab độc lập → ghi đạt/không đạt/chưa kết luận theo tiêu chí → bên mua chấp thuận nguồn có điều kiện và thời hạn → đơn thử lượng nhỏ. Thời gian thử một tuần là đầu vào từ cuộc phỏng vấn, không suy rộng thành SLA chuẩn mọi ngành hàng.

Mẫu trước cọc xung đột cơ chế che liên lạc hiện tại. Đề xuất kênh điều phối mẫu qua AgiViet trước, chia sẻ địa chỉ/căn cứ cần thiết theo quyền và đồng ý cụ thể; chưa tự mở toàn bộ số tài khoản, điện thoại hay địa chỉ vườn. Nếu cần liên lạc trực tiếp để thẩm định, lập quyền `pretrade_due_diligence_access` theo cặp, mục đích, expiry và nhật ký; phải sửa LA-01/LA-03 cùng đặc tả privacy, không để nhân viên lén gửi số qua kênh ngoài.

### Gaps

- Chưa xác định ngày thi/nguồn lực kỹ sư. “Trước cuộc thi” là thứ tự phạm vi tối thiểu, không phải cam kết hoàn tất trong số ngày nhất định.
- Chưa kiểm tính pháp lý của xử lý dữ liệu tài chính/căn cước/đất, phí giới thiệu khi mở liên lạc sớm, hoặc tín dụng; trước mở thật cần rà theo mô hình hợp đồng cụ thể.

## 3. Sau cuộc thi cần làm gì để vận hành thật?

### Takeaway

Ưu tiên kiểm kinh tế theo cụm và an toàn dữ liệu/duyệt hồ sơ, rồi mới mở rộng địa bàn. Nhánh không cọc cần mô hình nghĩa vụ, hạn mức và thu phí riêng, với người bán chủ động nhận rủi ro công nợ thay vì AgiViet ngầm bảo lãnh.

### Cited Findings

- [Đặc tả 08](../../nghiep-vu/08-van-hanh-thu-cong.md), mục 7 đã có nhóm giờ công; [Đặc tả 11](../../nghiep-vu/11-mo-hinh-kinh-doanh.md), mục giả thuyết và chỉ số đã coi thu phí/giữ cặp giao dịch là giả thuyết cần đo.
- [migration 0005](../../../db/migrations/0005_don_hop_dong.sql), `core.policy_versions`, `core.order_versions` và `core.framework_credit_grants` cho nền phiên bản chính sách/hợp đồng/hạn mức. Đây là nguồn thiết kế có thể kế thừa, không chứng minh đã có nhánh 0 cọc.
- [Đặc tả 08](../../nghiep-vu/08-van-hanh-thu-cong.md), mục 8 yêu cầu thay chính sách có hai người duyệt, hiệu lực sau 24 giờ, đơn cũ giữ ảnh chụp cũ.

### Inferences

Toàn bộ mục này là **đề xuất**.

1. Chính thức hóa `payment_mode`: `bank_deposit` và `seller_approved_postpay`. Nhánh mới chỉ mở cho cặp được duyệt, kỳ hạn và hạn mức cụ thể, người bán ký chấp nhận rủi ro; tài trợ/bảo hiểm do đối tác có hợp đồng riêng nếu có. Không gán huy hiệu verified thành cấp tín dụng tự động.
2. Tạo `core.trade_credit_agreements` theo seller–buyer, currency VND, limit, tenor, valid period, evidence/review version, seller sign, approver và lý do; lịch sử cấp/giảm/thu hồi chỉ ghi thêm. Nếu AgiViet cấp đánh giá riêng, lưu `ops.buyer_credit_reviews` tách khỏi hạn mức do người bán cấp.
3. Tạo sổ giữ hạn mức/exposure nguyên tử: hàng giao đã phát sinh nợ + cam kết đơn mở có giữ hạn mức, không đếm trùng khi chuyển từ reserved sang receivable. Một buyer có nhiều seller thì mỗi seller một hạn mức; tổng rủi ro toàn sàn là chỉ số vận hành, không phải quỹ chung bảo lãnh. Quá hạn hoặc limit hết hiệu lực thì dừng cam kết mới; không tự hủy các đợt đã cam kết. Người bán duyệt tăng hạn mức, vận hành không ký hộ.
4. Đổi đồng bộ K02, K07, K14, K22, LA-01/03, V14, thời điểm đơn hiệu lực/sẵn sàng giao, QR, lệnh tiền, phí/hoàn phí và thông điệp bảo vệ. Nhánh 0 cọc không được chi “cọc bằng 0” làm bằng chứng nợ đã được xử lý. Quyết toán vẫn ghi tiền thực nhận qua xác nhận có OTP/tra soát; quá hạn mở việc thu hồi/hồ sơ nợ, không tự ghi đã thu.
5. Phí dịch vụ không cọc có nghĩa vụ/hóa đơn/billing riêng theo gói hoặc việc đã bàn giao; không phụ thuộc khoản cọc không tồn tại. Giữ người bán miễn phí cơ bản; người mua/chương trình chuỗi trả thẩm định nâng cao. Không thu phí để cấp kết quả đạt.
6. Chuẩn hóa phụ lục thực hiện: lịch thông báo giá mới 15–30 ngày theo thỏa thuận, chỉ áp kỳ/đơn tương lai; đơn đã ký giữ giá. Thiếu/trễ có yêu cầu giao bù hoặc chi phí mua thay thế có chứng cứ, định mức/trần và người chấp thuận trong hợp đồng; không tự động khấu trừ bất kỳ khoản do người mua tự khai. Tính pháp lý khoản phạt/bồi thường chưa kiểm được.
7. Pilot theo cụm buyer–HTX–mặt hàng, lịch thăm gom nhiều hồ sơ; vận hành ngoại tuyến có mã thiết bị, upload pending, tránh mất dữ liệu nhưng không tự gán thời gian server bằng EXIF. Hạn chế lưu bản chụp gốc trên máy CTV; quyền truy cập bị thu hồi và xóa cache có cơ chế.
8. Tách KPI: giờ công/hồ sơ được duyệt, tỷ lệ phải đi lại, hồ sơ quá hạn chưa tái kiểm, chênh lệch tự khai–kiểm lại, tỷ lệ người mua chấp nhận mẫu, đơn đầu, giao đủ/đúng hạn, nợ đến hạn/quá hạn, đóng góp sau chi phí hiện trường. Các ngưỡng là giả thuyết pilot, không lấy GMV/số tài khoản làm bằng chứng thành công.
9. Quản lý CTV có khai quan hệ liên quan, quản lý vùng duyệt công, luân chuyển auditor, kiểm lại ngẫu nhiên theo rủi ro, gọi đối chiếu trực tiếp hai phía, kênh phản ánh. Không phạt chỉ vì một phản ánh chưa xác minh; giữ bằng chứng gốc và quyền giải trình.
10. Hoàn thiện đăng nhập vận hành bằng FIDO2/passkey theo đặc tả; URL tài liệu có hạn, phân vùng, phân loại nhạy cảm, nhật ký đọc, che số căn cước/sổ đất/tọa độ chính xác trước chia sẻ. Thăm hiện trường và ký xác nhận không làm nhân viên có quyền tài chính.

### Mô hình quyền đề xuất

| Vai | Được làm | Không được làm |
|---|---|---|
| Chủ hộ/HTX | Đồng ý thu thập, xác nhận dữ liệu, yêu cầu sửa, ký/chấp thuận công nợ | Tự đánh dấu AgiViet đã kiểm hoặc sửa kết luận đã duyệt |
| VH-HT/CTV | Lịch theo vùng được giao, ảnh, biên bản, đề xuất claim | Duyệt hồ sơ do mình lập, OTP/ký/nhận tiền hộ, xem tài chính buyer ngoài việc được giao |
| VH-DM | Đối chiếu mã/chứng nhận với nguồn phát hành, quản lý danh mục yêu cầu có phiên bản | Tự cấp chứng nhận bên thứ ba, bảo đảm mọi thị trường |
| VH-RR/reviewer | Đọc chứng cứ cần thiết, duyệt độc lập/treo/tái kiểm có lý do | Sửa ảnh/dữ liệu người lập sau nộp, tự nâng hạn mức thay seller |
| VH-QL | Phân công, ngoại lệ, giám sát SLA, người duyệt thứ hai đúng phạm vi | Tự mở tài khoản nhận tiền hoặc duyệt chi ngoài chuỗi quyền tài chính |
| VH-DS | Thu thập/đối soát bằng chứng thanh toán, công nợ theo quyền | Suy ra tiền đã nhận từ ảnh sao kê/cuộc gọi; sửa provenance năng lực |
| Bên mua | Đặt bộ yêu cầu, xem hồ sơ được chia sẻ, thử mẫu, duyệt nguồn và điều khoản | Sửa kết luận AgiViet/certifier; xem số liệu tài chính seller không được phép |

### Nghiệm thu được đề xuất

- Cùng nhân viên nộp và duyệt bị DB từ chối; gọi thẳng API vẫn bị từ chối; sửa hồ sơ sau submit bắt nộp lại và reviewer xác nhận phiên bản mới.
- Chứng nhận có thật nhưng sai site/sản phẩm/thị trường hoặc hết hạn trước ngày giao cuối: không qua hard gate; không tự hạ thành “khớp một phần” nếu thiếu điều kiện bắt buộc.
- Có GPS và ảnh đẹp nhưng thiếu nguồn phát hành: claim vẫn đúng provenance, chưa được gắn chứng nhận hợp lệ.
- AI timeout hoặc bộ đệm cũ sau thu hồi chứng nhận: kết quả eligibility giống kiểm server tại thời điểm thao tác, không lọt điều kiện cứng.
- Nguồn phù hợp chế biến nhưng thiếu điều kiện thị trường X: hiện đúng khác biệt theo bộ yêu cầu; người bán không bị gắn hạng thấp toàn sàn.
- Mẫu thử trước đơn không tạo giao hàng giả; mẫu không kết luận không tự duyệt; đổi ao/vườn/mùa/phương pháp phải đánh giá lại phạm vi.
- Buyer chưa có lịch sử: hiện “chưa có dữ liệu” cùng số quan sát, không hiện 100% trả đúng hạn từ số 0. Lịch sử tự khai không nhập như giao dịch đã đối soát.
- Hai lệnh đồng thời giữ hạn mức không vượt trần; khoản đã giữ chuyển thành nợ không đếm hai lần; đối soát tiền thu một lần không giải phóng hạn mức hai lần.
- Quá hạn chặn cam kết mới đúng chính sách, không hủy chuyến đã chốt hoặc tự ghi đã trả; giảm hạn mức giữa chừng không xóa nghĩa vụ cũ.
- Thu hồi claim treo qualification tương lai nhưng không viết lại PDF/snapshot đơn đã ký; tạo cảnh báo việc cho đơn mở và cho người phụ trách quyết định tiếp theo.
- CTV không đọc được hồ sơ ngoài vùng/case; buyer không đọc được bản gốc nhạy cảm khi chưa được cấp quyền; reviewer mở được chứng cứ cần để duyệt và có log.
- Chế độ mô phỏng được gắn nhãn, không có API phát kết quả kiểm định/tiền ảo trong production thật.

### Migration và tương thích đề xuất

- Chỉ bổ sung bảng/khóa ngoại/chỉ mục; không tái nghĩa `organizations.verification_level` thành rank chất lượng. Dữ liệu cũ mang nhãn phạm vi cũ, chưa đủ thông tin thì `insufficient_evidence`, không backfill thành AgiViet đã kiểm thực địa.
- `certifications` hiện có giữ vai trò chứng nhận, thêm liên kết claim/source; không mất lịch sử thu hồi. Kiểm issuer/scope/validity có revision riêng.
- Bộ yêu cầu, kết quả đánh giá, payment mode, policy và phí được snapshot khi ký. Tái kiểm/thu hồi phát sự kiện và invalidation cache, không sửa quá khứ. Đơn cũ vẫn theo policy cũ.
- Triển khai có feature flag theo cụm/môi trường; đo dữ liệu trước khi bật hard gate hàng loạt; rollback không xóa log/nghĩa vụ/snapshot. UI cũ không được tự coi trường mới null là đã đạt.
- Trước mở thật cần kiểm pháp lý theo ngành hàng/thị trường/loại chủ thể và mô hình thanh toán cụ thể; ghi rõ phần nào là AgiViet tự quan sát và phần nào do certifier/đối tác có thẩm quyền kết luận.

### Gaps

- Chưa có dữ liệu để đề xuất hạn mức VND hoặc tỷ lệ phí tối ưu; các số vận hành cần gắn giả định và đo pilot.
- Chưa kiểm đủ nhu cầu của nhiều buyer; thời gian thẩm định 1–2 tuần, thử mẫu một tuần, báo giá 15–30 ngày và ít cọc là thông tin người dùng cung cấp về một cuộc phỏng vấn, chưa đại diện toàn thị trường.
