# Vòng 5 — chấm chéo đổi vai SAU KHI xong hết việc (03/11/2026)

Người sáng lập nhắc: vòng 4 chấm khi việc còn dở. Vòng 5 chỉ chấm sau khi mọi việc trong danh sách đã làm và kiểm (E111–E118).

## Bối cảnh và tiêu chí
**Giữ nguyên** `docs/frontend/cham-vong4/00-boi-canh-va-tieu-chi.md`: chỉ chấm tính năng sẽ show ở buổi thi; mục "đang phát triển", đối tác AI, đăng nhập chọn vai, mã người nhận/nút tua giờ ở bản thử là cố ý. Tiêu chí: A app bán 7 mục/70, B app mua T1–T10/100, C buổi thi D1–D5/50.

## Đã làm từ vòng 4 (đều có kiểm)
| Việc | Nhật ký | Bằng chứng |
|---|---|---|
| Nút "Bản thử: tới giờ giao" ở tấm Bàn giao; bong bóng trâu không che nút trong tấm | E111 | trình duyệt: tua → nhập mã → "Đang cân, kiểm" |
| Sổ Tiền tính cọc hợp đồng khung (HTX) | E112 | B14; HTX/Bếp Sen 1.120.000 = cọc KH-2003 |
| Người bán xem ảnh từng dòng nghiệm thu trước khi ký | E113 | ca hạ loại có ảnh, tải được |
| App mua Hôm nay: mỗi món cần / đã chắc / còn thiếu | E114 | M01 (xoài cần 3.500 · chắc 500 · thiếu 3.000) |
| Màn sâu mua.html không còn số mẫu (chuyển về tab app mới), màn thật giữ nguyên | E115 | 7 màn kiểm |
| Khung tuần nút "Chưa thấy tiền" + nhãn "AgiViet đang đối soát"; Tiền hiện đủ số đồng | E116 | B15, B07 |
| Đạo diễn kịch bản (hạ loại 10% / trả lại 80%) trên màn chọn vai; ca cọc thừa ngân hàng tự hoàn | E117 | B00, B06, M06; `backend/scripts/kiem-cho-ai-hoan.mjs` |
| Lời chào bị trả giá lại / đã chốt chưa lập đơn vào "Tới lượt bạn"; bên mua chọn vai chuyển cọc được; AI chạy ở màn sâu | E108–E109 | M01; trình duyệt cọc → active |
| Soát giao diện lần cuối: bộ soát hết báo nhầm; app bán 53/53 sạch 360/390; app mua sạch | E118 | `frontend/tests/soat-giao-dien.mjs` |

## Kiểm tự động
Backend 76/76 (533/533 bước), test:cho 43/43; E2E chợ AI: `kiem-cho-ai.mjs` (người bán thật), `kiem-cho-ai-ben-mua.mjs` (AI hai phía), `kiem-cho-ai-hoan.mjs` (trả lại 80% → hoàn cọc 1.170.000).

## Ảnh `anh/` (390px)
B00 chọn vai + kịch bản · B01–B13 app bán (chị Năm, có đơn hoàn tất và đơn trả lại 80%) · B06 đơn trả lại: cọc 3.510.000 = 2.340.000 cho người bán + 1.170.000 hoàn bên mua, cả hai "đã đối soát" · B14–B15 HTX (cọc khung, chưa thấy tiền) · M00–M09 app mua (Nhà máy sấy: đủ/thiếu, tới lượt, so sánh, chào giá, đơn, "Ngân hàng đã hoàn 1.170.000", kế hoạch, tin nhắn, chi tiết đơn).
