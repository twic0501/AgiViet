# Vòng 5 — Claude chấm (cả hai vai), commit trước khi ChatGPT chấm

So với vòng 4 (A 53, B 58, C 32). Chỉ cộng điểm ở chỗ có bằng chứng làm được (E2E hoặc trình duyệt), không cộng vì "đã có code".

## A. App bán — vai chị Năm / HTX (70)
| Mục | V4 | V5 | Căn cứ |
|---|---:|---:|---|
| Luồng chính | 8 | 9 | Tới giờ giao không còn chờ (nút bản thử, E111); ngoại lệ trả lại 80% đi trọn tới quyết toán (E117, kiem-cho-ai-hoan.mjs). Chưa lên 10: tranh chấp/kiểm định chưa có kịch bản AI. |
| Nhắn tin + chặn liên lạc | 7 | 7 | Không đổi trong vòng này. |
| Tiền + cọc | 8 | 9 | B06 quyết toán khớp từng đồng, hai lệnh 'đã đối soát'; B14 cọc khung đúng (E112); B15 'Chưa thấy tiền' (E116); số đồng đầy đủ (E116). |
| Hỗ trợ + hướng dẫn | 8 | 8 | Không đổi. |
| Chống ép giá/lừa | 7 | 8 | Xem được ảnh bằng chứng từng dòng trước khi ký (E113) — đúng chỗ người bán dễ bị ép nhất; xác nhận riêng khi vượt 20% vẫn bắt buộc. |
| Giao diện nông dân | 8 | 9 | 53/53 màn + tấm sạch 360/390 với bộ soát đã hết báo nhầm (E118); bong bóng trâu không che nút. |
| Độ gọn, nhất quán | 7 | 8 | Lỗi 'chưa có hợp đồng', số đếm nhỏ, ô ngày gãy dòng, emoji đều đã sửa. Còn: tổ chức không ai cầm thì AI làm thay — cần nói rõ khi trình diễn. |
| **Tổng A** | **53** | **58/70** | |

## B. App mua — vai Nhà máy sấy (100)
| # | V4 | V5 | Căn cứ |
|---|---:|---:|---|
| T1 Chắc nguồn | 4 | 7 | M01: mỗi món cần / đã chắc / thiếu (E114). Chưa tính theo ngày giao trong tuần. |
| T2 Tìm & so sánh | 7 | 7 | Không đổi. |
| T3 Tin người bán | 4 | 4 | Không đổi (chưa có hồ sơ/số đơn giao đủ của người bán — ngoài danh sách show). |
| T4 Quyết định giá | 7 | 7 | Không đổi. |
| T5 Việc tới lượt | 5 | 7 | Lời chào bị trả giá lại / đã chốt chưa lập đơn vào hàng việc (E109). |
| T6 Tiền minh bạch | 6 | 8 | M06 'Ngân hàng đã hoàn 1.170.000' từ ca thật; đọc đúng confirmed_vnd (E108); cọc khung không cộng lặp (E112). |
| T7 Giao nhận & chất lượng | 6 | 7 | Cọc giả lập chạy với chọn vai (E108); ca trả lại có ảnh đi trọn. |
| T8 Điều hướng | 7 | 8 | Màn sâu không còn đưa về màn số mẫu (E115). |
| T9 Công cụ DN | 6 | 6 | Không đổi. |
| T10 Tin cậy & tiếp cận | 6 | 7 | Soát 5 tab + 3 tấm ở 360/390 sạch (E118). |
| **Tổng B** | **58** | **68/100** | |

## C. Tiêu chí buổi thi (50)
| Mục | V4 | V5 | Căn cứ |
|---|---:|---:|---|
| D1 Vào vai nhanh | 7 | 8 | 2 chạm; kịch bản chọn ngay trên màn chọn vai (B00). |
| D2 Chợ sống | 7 | 8 | Tính cách khác nhau có hiệu lực (E107), kịch bản ngoại lệ (E117), báo việc của mình. |
| D3 Trọn luồng không kẹt | 6 | 8 | Ba kịch bản E2E hoàn tất (người bán thật, AI hai phía, trả lại 80%); bên mua chọn vai qua được bước cọc trên trình duyệt. Chưa có một lượt người mua tự bấm toàn giao diện từ đầu tới cuối. |
| D4 Tiền qua ngân hàng | 7 | 9 | Ca tiền thừa chạy thật: ngân hàng chi 2.340.000 + hoàn 1.170.000, đối soát, hai app cùng hiện (B06, M06). |
| D5 Phạm vi sạch | 5 | 8 | Màn sâu hết số mẫu (E115); hai app soát sạch (E118). |
| **Tổng C** | **32** | **41/50** | |
