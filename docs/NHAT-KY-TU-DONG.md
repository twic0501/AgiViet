# Nhật ký làm việc tự động

Người sáng lập giao (đêm 28/10/2026): Claude tự làm tiếp database → backend → giao diện; việc cần chốt gửi Codex
(luồng "Rà soát hồ sơ Track Idea", project agiviet) quyết; mọi thứ ghi vào tài liệu này. Căn cứ nghiệp vụ: mô phỏng
quy trình bản 23 (đã khóa). Nhánh git: `production-test`.

Cách đọc: mỗi mục có **giờ**, **việc**, **ai quyết** (Người sáng lập / Codex / Claude theo bản 23), **commit**.

## Quyết định đã chốt

| # | Quyết định | Ai quyết | Ngày |
|---|---|---|---|
| E1 | Còn tranh chấp: trả đủ phần đã công nhận; khoản đòi thêm ghi chưa bảo đảm | Người sáng lập | 28/10 |
| E2 | Lệnh tiền ngoại lệ: người thứ hai duyệt, là người khác thật | Người sáng lập | 28/10 |
| C1 | Chính sách đơn: giữ chính sách đã cam kết với đơn (đơn đã chạy E1 không bị hạ về luật cũ) | Codex | 28/10 |
| Q25 | Tìm nguồn định kỳ: mặc định duyệt từng phương án; khách được chủ động ủy quyền trong phạm vi rõ ràng | Codex | 28/10 |
| Q26 | Hạn chốt 14:00 hôm trước, cấu hình theo mặt hàng/lịch nhận, lưu trong thỏa thuận; đổi sau hạn cần người bán bị ảnh hưởng đồng ý, bên mua chịu chi phí thực tế có chứng cứ | Codex | 28/10 |
| Q27 | Thỏa thuận dịch vụ với AgiViet + mua bán giữa bên mua và từng người bán; mỗi nguồn mỗi đợt là một core.orders | Codex | 28/10 |
| Q28 | 2 đợt giao thiếu trong 30 ngày → mở rà soát (không tự trừ uy tín/lượng mời); có giải trình; chỉ giảm lượng mời sau rà soát | Codex | 28/10 |
| CN | Mức cho nợ mặc định 0 đ ngoài khoản bảo đảm hợp lệ; người bán tự cấp từng bên mua; nợ quá hạn chặn cam kết mới | Codex | 28/10 |
| C2 | Chính sách đơn phân loại theo lúc cam kết (ký), không theo công thức đã chạy; lịch sử tiền đã chi giữ nguyên | Codex | 28/10 |
| C3 | Một khoản phí chỉ thu một lần: đơn 23 ưu tiên hồ sơ hoàn riêng, đối chiếu phần đã thu/trừ | Codex | 28/10 |
| C4 | Khiếu nại còn hạn vẫn nhận sau quyết toán: hiện trong hộp việc, đơn chuyển "còn hồ sơ", không tự đảo tiền đã chi | Codex | 28/10 |
| C5 | Mọi lần tăng nghĩa vụ (kể cả sửa cam kết) đều kiểm lại mức cho nợ, quá hạn, bảo đảm | Codex | 28/10 |
| C6 | Giao thiếu: giữ phần giao được và nghĩa vụ tương ứng, chỉ thay phần thiếu | Codex | 28/10 |
| C7 | Một phần hàng không được hoàn giá trị hai lần; kiểm lại/kháng nghị điều chỉnh hồ sơ cũ | Codex | 28/10 |
| C8 | Thỏa thuận dừng thì chặn cam kết mới; chi phí đổi lượng phải xác nhận và thành khoản phải trả | Codex | 28/10 |
| C9 | Giữ hàng tại chỗ phải có ủy quyền trong hợp đồng và hạn theo đơn; bồi hoàn AgiViet chỉ đóng khi tiền được xác minh | Codex | 28/10 |
| H1 | Hạ tầng: Firebase Hosting (miễn phí) + Supabase (miễn phí); AI OpenAI API có trần chi tiêu; tên miền agiviet.id.vn | Người sáng lập | 28/10 |

## Diễn biến

### 28/10/2026
- **0058** (commit 70611c2): E1, E2, chặn hoàn tất khi còn hồ sơ mở, ngừng tạo mới thương lái/tổ hợp gom/người giúp, mở liên lạc theo cọc đủ + ngoại lệ khảo sát. 616/616.
- Codex rà 70611c2: 4 lệch (E1 chưa qua lệnh thật; chính sách chưa gắn theo đơn; liên lạc khảo sát sai phạm vi; ký thay bên mua).
- **0059** (commit d37991a): sửa đủ 4 lệch, kiểm thử hồi quy qua lệnh thật. 632/632. Đã gửi Codex kiểm lại.
- Codex rà d37991a: E1 qua lệnh thật **đã hết**, ký thay **đã hết**; 3 lệch P1 mới: (1) 0059 hạ nhầm đơn đã áp E1 về chính sách cũ — **Codex quyết: giữ chính sách đã cam kết, không chia theo thời điểm chạy migration**; (2) NULL trong danh sách người đến làm lọt quyền; (3) tài khoản bị khóa vẫn đọc liên lạc khảo sát.
- **0060**: sửa 3 lệch (trả đơn E1 về chính sách 23 + chặn hạ chính sách khi đã có quyết toán E1; cấm NULL, kiểm quyền mặc định từ chối; kiểm tài khoản bị khóa cả người gọi lẫn người được tra). 636/636.
- **0061** giao ngay C1–C6: nhãn "Đã quyết toán mua bán · còn hồ sơ mở" + người phụ trách/hạn từng hồ sơ (ops.v_open_dossiers = hộp việc); phân bổ phí kiểm định bằng quyết định hai người, tổng = phí, tự tạo khoản hoàn; nguồn xác minh mỗi khoản tiền; chờ đối soát cọc ≤ 6 giờ không đóng đơn/không nhả lượng; hạn khiếu nại (mặc định 12 giờ, trong extra_terms), tiêu chí kiểm sau giao, phản ánh muộn chỉ ghi nhận. 658/658. Gửi Codex rà.
- Codex rà 1614c70: NULL và tài khoản khóa **đã hết**; 6 lệch mới. Codex chốt Q25–Q28 và mức cho nợ (xem bảng quyết định).
- **0062**: sửa 6 lệch — phân loại chính sách theo lúc ký (bỏ trigger cũ, lịch sử tiền giữ nguyên); phân bổ phí có phiên bản (chờ xử lý → kết luận cuối, chỉ lập phần hoàn chênh, có hạn 7 ngày); lệnh khiếu nại sau giao `cmd.open_post_delivery_claim` (trong hạn được; quá hạn chỉ khi gắn đúng tiêu chí kiểm sau không đạt, loại chất lượng); đối soát cọc hạn tuyệt đối 6 giờ từ lần mở đầu + `cmd.expire_deposit_reconciliations`; quét hồ sơ mở tạo việc V25 + `cmd.assign_dossier`. 673/673.
- **0063** tìm nguồn định kỳ C7–C9 (theo Q25–Q28 + mức cho nợ do Codex chốt): thỏa thuận tìm nguồn (mặc định duyệt từng phương án, giá tối đa chỉ khi ủy quyền), dự kiến / đã chốt (hạn 14:00 hôm trước) / đã cam kết từng người bán, bảng độ phủ (cần · cam kết · thiếu); điều khoản trả theo cặp do người bán đặt (mặc định 0), chặn vượt mức và nợ quá hạn; đổi lượng sau cam kết cần người bán đồng ý, chi phí phải có chứng cứ; giao thiếu 2 lần/30 ngày → việc rà soát V26; dừng thỏa thuận hủy dự kiến, giữ cam kết. Kiểm thử tests/265 qua đăng nhập thật. 690/690.
- **0064** vận hành C10–C14: giữ hàng tại chỗ theo thông số mặt hàng (không có thông số thì không giữ), hạn quyết định, hết hạn chạy phương án đã ủy quyền; sự cố mẫu → mẫu không hợp lệ, chặn ghi kết quả trên mẫu đó, bên chịu cần quyết định (chưa rõ = chờ xử lý); bồi hoàn do lỗi AgiViet cần quyết định hai người; ghi công theo đơn/khách định kỳ, chi phí dùng chung tách riêng (ops.v_service_cost cho Q24). 702/702. **Chặng migration DB (C1–C14) xong**; C15 (trang nhân viên) để sau theo người sáng lập.
- Codex rà f73497a: 6 mục cũ **đã hết**, 6 lệch mới; Codex chốt C3 (một phí thu một lần) và C4 (khiếu nại còn hạn nhận sau quyết toán, không đảo tiền đã chi).
- **0065**: sửa 6 lệch (phân bổ phí trừ phần đã thu qua quyết toán; khiếu nại sau giao người bán sai → khoản trừ post_delivery_claim; chính sách chốt lúc ký; cấm tranh chấp trùng qua phiên bản nghiệm thu; hộp việc gồm đơn đã hoàn tất có hồ sơ mới + nhãn hiển thị; không giao việc cho tài khoản khóa). DB 710/710.
- **Backend chạy lại với DB mới**: sửa tên auth → app_auth trong lớp DB, script cấp quyền, kiểm thử phiên; cập nhật kiểm thử theo luật mới (E1: chi tạm 9.850.000, không giữ thêm, người bán hoàn 280.000 khi sai; còn hàng trả lại thì "còn hồ sơ"; bỏ người giúp). **72/72 tình huống, 546/546 bước; kiểm quyền 11/11; tsc sạch.**
- **API bản 23** (`backend/src/nghiep-vu/ban-23.ts`, routes trong `v1.ts`): hộp việc `/v1/ops/dossiers` (+ giao người), hồ sơ của đơn `/v1/orders/:id/dossiers` (gồm khoản đòi thêm chưa bảo đảm), phân bổ phí `/v1/ops/inspections/:id/fee-allocation-proposals` + `/v1/ops/fee-allocations`, khiếu nại sau giao `/v1/acceptance-lines/:id/post-delivery-claim`, tìm nguồn định kỳ (`/v1/sourcing-agreements`, `/days`, `/coverage`, `/stop`, `/v1/ops/sourcing-days/:id/allocations`, `/v1/sourcing-allocations/:id/approve|commit|change|shortfall`, `/v1/allocation-changes/:id/answer`, `/v1/credit-terms`).
- **0066**: hàm công nợ chạy quyền chủ DB (lỗi thật do kiểm thử API bắt được: vai đọc không gọi được ref.div_round).
- Kiểm thử API mới TH-B23-DK (6 bước, đạt), TH-B23-HV (đạt nhưng **nhánh giao người bị bỏ qua khi hộp việc trống** — cần dữ liệu cố định, việc còn lại). Toàn bộ: DB 710/710; backend 74/74 · 554/554; kiểm quyền 11/11; tsc sạch.
- Codex rà e93e590: probe cũ f73497a **đã hết**; 9 lệch mới (phí phân bổ trước kết luận bị thu hai lần; khiếu nại lại cùng phần hàng; tăng cam kết qua đổi lượng lọt mức nợ/quá hạn; giao thiếu một phần xóa cả phần đã giao; thỏa thuận dừng vẫn nhận cam kết; chi phí đổi lượng chưa thành khoản phải trả; giữ tại chỗ không cần ủy quyền và kéo dài được; bồi hoàn dùng quyết định sai loại, đóng không cần chứng từ; ghi công qua việc không vào chi phí đơn). Codex chốt C5–C9.
- **0067**: sửa cả 9 + lệnh `cmd.link_allocation_order` (nối phân bổ sang đơn đúng cặp/mặt hàng), `core.sourcing_cost_claims` + `cmd.answer_sourcing_cost`. Kiểm thử tests/280. DB 723/723; backend 74/74 · 554/554; kiểm quyền 11/11.
- Còn mở theo Codex: bảo đảm dùng chung cho kế hoạch định kỳ (phân bổ/giải phóng/hoàn theo kế hoạch) chưa có — làm khi dựng luồng hợp đồng khung cho định kỳ.
- Ghi chú kỹ thuật: thêm cột vào order_versions làm gãy lệnh tạo đơn (whitelist) → hạn khiếu nại đặt trong extra_terms.
