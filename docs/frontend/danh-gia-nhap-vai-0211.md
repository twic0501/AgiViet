# Đánh giá nhập vai lần đầu dùng app (02/11/2026)

Hai người thử, bên kia giao dịch là **đối tác ảo** (AI đóng vai, gọi API thật):
- **ChatGPT (Codex, high, chỉ đọc)** nhập vai **chị Năm** — 52 tuổi, trồng xoài Cao Lãnh, mắt kém, lần đầu dùng **app bán** (dữ liệu thật, stack thử). Ảnh hành trình 31 màn.
- **Claude** nhập vai **chị Hạnh** — phụ trách thu mua Nhà máy sấy Đồng Xanh, lần đầu dùng **app mua** (`thiet-ke/mua.html`, máy tính 1280 px).

## 1. App bán — ChatGPT nhập vai chị Năm

Bản đầy đủ (nhật ký từng màn + 20 lỗi): `docs/frontend/danh-gia-nhap-vai-0211-chatgpt-ban.md`.

**Tóm tắt cảm giác:** hiểu được giá, lượng, thành tiền; chat giống Zalo nên dùng được; sợ nhất là **bấm nhầm thành ký**, **không biết tiền đang ở đâu** (màn Tiền toàn số 0 không giải thích), và **không rõ bước tiếp theo** sau khi đồng ý giá.

**Đã sửa ngay (commit 02/11):**
| # | Lỗi | Sửa |
|---|---|---|
| 4 | "AgiViet giữ cọc" mâu thuẫn "ngân hàng giữ cọc" | Thống nhất: ngân hàng đối tác giữ cọc của bên mua; liên lạc mở khi ngân hàng nhận cọc |
| 7, 8 | Đã đồng ý giá vẫn hiện "Tới lượt bác trả lời" | Bỏ nhắc cũ, hiện trâu mừng + việc tiếp theo |
| 9 | Câu trống bỏ qua bước chốt điều kiện | "Sau khi bác đồng ý giá và bên mua gửi điều kiện giao, trả tiền…" |
| 10 | Dấu "Đã xác minh" gắn sẵn mọi dòng chat | Bỏ (chưa có căn cứ) |
| 12 | Tấm lời chào không có nút đóng rõ | Nút "Đóng ✕" góc phải |
| 15 | Lời trâu màn Tiền sai cách cộng tiền | Ghi rõ ai xác nhận khoản nào |
| 16 | Hai dòng chat cùng tên nhà máy khó phân biệt | Dòng phụ: lượng · giá · trạng thái · lô |
| 20 | Lời nhắc chat trống | "Bác nhắn ngày hái, hỏi lịch xe và cách trả tiền" |
| — | Bên ảo trả lời lặp 102 tin (tin lời chào và hợp đồng tách nhóm) | Gom tin lời chào vào hợp đồng; mỗi tin trả lời một lần |
| — | Chuyển tab Trò chuyện khi tấm lời chào đang mở → tấm đè chặn | Đóng tấm khi chuyển tab |
| — | Không vào được trang cá nhân (người sáng lập báo) | Bấm ảnh đại diện → trang Tôi; thêm **Hồ sơ và giấy tờ**, nộp giấy tờ có ảnh (chờ nhân viên đối chiếu, migration 0077), đề nghị sửa thông tin |
| — | Mở `ban-them.html` trống hiện "Không có màn" | Danh mục tiện ích + trâu |

**Còn lại, cần làm (nặng trước):**
1. **Bước chốt điều kiện trước khi ký** (#1): lượng chắc giao, ngày hái, đóng gói, ai lo xe, tài khoản, cách trả — hai bên xác nhận rồi mới soạn hợp đồng.
2. **Chấp thuận riêng phần trả sau chưa được bảo đảm** (#2) ở màn ký.
3. **Khóa ký khi chưa tải được điều khoản đúng phiên bản** (#3).
4. **Mở liên lạc theo trạng thái cọc** (#5): hiện che mọi lúc; quy trình là che trước cọc, mở sau khi ngân hàng nhận cọc.
5. Chữ quyết định giao dịch (lượng, hạn, tiền) ≥ 16 px; mời chọn chữ lớn lúc mới vào (#6).
6. Hiện số tiền đầy đủ trên thẻ chờ ký (11.550.000 thay vì 11,6 triệu) (#13); tách chi phí chở/phân loại (#14).
7. Hẹn xem vườn thành thẻ lịch có Đồng ý/Đổi lịch (#17); trợ lý hỏi bằng giọng nói, nghe điều khoản trước khi ký (#18).
8. Đăng bài: giải thích vì sao 2 cách đăng bị khóa khi chưa chọn loại (#11).

## 2. App mua — Claude nhập vai chị Hạnh (Đồng Xanh)

**Bối cảnh trung thực:** app mua hiện **chỉ là bản mô phỏng** (dữ liệu dựng sẵn HĐ-0018…, ngày 27/10), **chưa nối backend** — nên chị Hạnh không giao dịch được với người bán thật trong chợ mẫu; đối tác ảo bên mua đang thay chị làm việc đó qua API.

**Nhật ký nhập vai (chị Hạnh):**
- *Tổng quan:* "Bốn ô số trên cùng (tới lượt tôi 3, đơn sắp nhận 3, tiền sắp trả 32,2 triệu, ngân hàng đang giữ 12,78 triệu) là đúng thứ tôi cần mỗi sáng. Bảng việc cần làm có hạn và 'tới lượt ai' — tốt."
- *Nguồn hàng:* "Lọc theo nhóm và 'gần kho trước' hợp ý nhà máy. Nhãn 'Đã kiểm tại vườn' / 'Người bán tự khai' rất quan trọng với tôi. Nhưng ảnh là mảng màu chung chung, tôi không thấy hàng thật."
- *Báo giá:* "Bảng so 3 báo giá có 'giá tại kho' cộng tiền xe — đúng cách tôi so. Thiếu cột hạn trả lời và nút chọn ngay trên dòng."
- *Đơn và lịch:* "Nhóm theo 'Tới lượt bạn / Đang chờ bên kia / Hoàn tất' dễ theo. Nhưng tên người bán ở đây (chị Năm, anh Huỳnh Bảy, chị Mười) không khớp với các nhà vườn trong chợ thật tôi thấy ở chỗ khác."
- *Tin nhắn:* "Danh sách có, nhưng là tin dựng sẵn — tôi nhắn thì người bán thật không nhận."

**Đánh giá logic:** bố cục máy tính, menu trái theo nhóm (Mua · Đơn · Kho · Sổ sách · Tổ chức) đúng nghề thu mua; số liệu tiền tách cọc ngân hàng giữ / trả thẳng rõ ràng; ngôn ngữ chuyên nghiệp phù hợp phân khúc. **Lỗ hổng lớn nhất không nằm ở giao diện mà ở dữ liệu:** mọi màn là mô phỏng, nên luồng hai bên (chào giá → chat → hợp đồng → cọc → nhận hàng → trả tiền) chưa đi được từ phía bên mua.

**Cần làm cho app mua (GĐ3):**
1. Nối backend: nguồn hàng (`/v1/lots`), nhu cầu + so báo giá (`/v1/demands`, `offer-comparison`), chào giá/trả giá, lập + ký hợp đồng, cọc (hướng dẫn chuyển khoản), nhận hàng (QR, nghiệm thu 3 phần), trả tiền, công nợ.
2. Tin nhắn thật: dùng chung `/v1/messages` (đã có, che liên lạc ở backend).
3. Ảnh lô thật thay mảng màu; cột hạn trả lời + nút chọn trong bảng báo giá.
4. Duyệt nội bộ theo hạn mức (người mua hàng ký vượt hạn mức → quản lý duyệt) — backend đã có `submit-approval/approve`.
