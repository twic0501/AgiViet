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
| H1 | Hạ tầng: Firebase Hosting (miễn phí) + Supabase (miễn phí); AI OpenAI API có trần chi tiêu; tên miền agiviet.id.vn | Người sáng lập | 28/10 |

## Diễn biến

### 28/10/2026
- **0058** (commit 70611c2): E1, E2, chặn hoàn tất khi còn hồ sơ mở, ngừng tạo mới thương lái/tổ hợp gom/người giúp, mở liên lạc theo cọc đủ + ngoại lệ khảo sát. 616/616.
- Codex rà 70611c2: 4 lệch (E1 chưa qua lệnh thật; chính sách chưa gắn theo đơn; liên lạc khảo sát sai phạm vi; ký thay bên mua).
- **0059** (commit d37991a): sửa đủ 4 lệch, kiểm thử hồi quy qua lệnh thật. 632/632. Đã gửi Codex kiểm lại.
- Codex rà d37991a: E1 qua lệnh thật **đã hết**, ký thay **đã hết**; 3 lệch P1 mới: (1) 0059 hạ nhầm đơn đã áp E1 về chính sách cũ — **Codex quyết: giữ chính sách đã cam kết, không chia theo thời điểm chạy migration**; (2) NULL trong danh sách người đến làm lọt quyền; (3) tài khoản bị khóa vẫn đọc liên lạc khảo sát.
- **0060**: sửa 3 lệch (trả đơn E1 về chính sách 23 + chặn hạ chính sách khi đã có quyết toán E1; cấm NULL, kiểm quyền mặc định từ chối; kiểm tài khoản bị khóa cả người gọi lẫn người được tra). 636/636.
- **0061** giao ngay C1–C6: nhãn "Đã quyết toán mua bán · còn hồ sơ mở" + người phụ trách/hạn từng hồ sơ (ops.v_open_dossiers = hộp việc); phân bổ phí kiểm định bằng quyết định hai người, tổng = phí, tự tạo khoản hoàn; nguồn xác minh mỗi khoản tiền; chờ đối soát cọc ≤ 6 giờ không đóng đơn/không nhả lượng; hạn khiếu nại (mặc định 12 giờ, trong extra_terms), tiêu chí kiểm sau giao, phản ánh muộn chỉ ghi nhận. 658/658. Gửi Codex rà.
- Ghi chú kỹ thuật: thêm cột vào order_versions làm gãy lệnh tạo đơn (whitelist) → hạn khiếu nại đặt trong extra_terms.
