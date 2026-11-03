# Lượt 2 (đổi vai) — Claude nhập vai BÊN MUA (Nhà máy sấy Đồng Xanh) — chấm B + C

Chấm sau khi đã sửa 3 lỗi ChatGPT nêu ở lượt 1 (E108, commit 2822f94). Ghi rõ chỗ đồng ý / khác ChatGPT.

## Nhật ký nhập vai (ngắn)
- M00: "Chọn 'Nhà máy sấy Đồng Xanh' là vào; dòng tính cách nói tôi trả giá một lần."
- M01: "Biết ngay ngân hàng đang giữ 2.730.000 đ cọc của mình, còn phải trả 0 đ. Nhưng tôi không biết tuần này đã đủ bao nhiêu kg xoài cho xưởng."
- M02–M04: "Tìm được xoài, so 3 nguồn cạnh nhau, chào giá có neo 'giá giao dịch trên AgiViet' — biết mình đang rẻ hay đắt."
- M05: "Đơn với HTX đang 'sẵn sàng giao', đơn với chị Năm 'hoàn tất' — rõ."
- Màn đơn chờ cọc (kiểm lại sau E108): "Đăng nhập chọn vai, vào đơn chờ cọc, bấm giả lập ngân hàng — cọc vào, đơn chuyển sang đặt xe."

## B. App mua (10 / 100)
| # | Claude | ChatGPT L1 | Căn cứ / chỗ khác |
|---|---:|---:|---|
| T1 Chắc nguồn | 4 | 4 | Đồng ý: Hôm nay chỉ đếm khung/đơn/nhu cầu, chưa có kg cần / đã chắc theo món (M01). |
| T2 Tìm & so sánh | 7 | 7 | Đồng ý (M02–M03, so ≤3 nguồn). |
| T3 Tin người bán | 4 | 4 | Đồng ý: chỉ 'ước tính / chưa có ảnh trong app', chưa có số đơn giao đủ của người bán. |
| T4 Quyết định giá | 7 | 7 | Đồng ý (M04 neo giá giao dịch, chênh lệch). |
| T5 Việc tới lượt | 5 | 5 | Đồng ý: lời chào bên bán trả giá chưa vào 'Tới lượt bạn' (M01 '0 việc' dù có lời chào đang chạy). |
| T6 Tiền minh bạch | 6 | 5 | +1: lỗi `confirmed_vnd` đã sửa (E108); M01 tách cọc ngân hàng giữ / còn phải trả. |
| T7 Giao nhận & chất lượng | 6 | 6 | Màn sâu có đặt xe, QR, nghiệm thu từng món; cọc qua giả lập nay chạy với đăng nhập chọn vai (kiểm trình duyệt E108). Chưa kiểm hết đặt xe → nghiệm thu bằng tay trên giao diện. |
| T8 Điều hướng | 7 | 7 | Đồng ý: 5 tab gọn; màn sâu vẫn sang thiết kế `mua.html` cũ. |
| T9 Công cụ DN | 6 | 6 | Đồng ý (kế hoạch tuần, người bán quen, CSV). |
| T10 Tin cậy & tiếp cận | 6 | 6 | Đồng ý. |
| **Tổng B** | **58/100** | **57/100** | Chênh 1 điểm (T6 sau sửa). |

## C. Tiêu chí buổi thi — nhìn từ bên mua (sau E108)
| Mục | Claude L2 | ChatGPT L1 | Claude L1 (bán) | Ghi chú |
|---|---:|---:|---:|---|
| D1 Vào vai nhanh | 7 | 7 | 8 | Đồng ý ChatGPT: lần đầu bên mua còn màn chào 4 bước trước Hôm nay. |
| D2 Chợ sống | 7 | 7 | 6 | ChatGPT đúng: lúc ChatGPT đọc mã thì bảng KIEU đã có (E107) — điểm 6 của Claude L1 chấm trước khi sửa. |
| D3 Trọn luồng không kẹt | 6 | 4 | 8 | Nhận lỗi: điểm 8 ở L1 chỉ đúng cho chiều người bán thật. Chiều bên mua thật bị chặn ở cọc (đã sửa) và AI không chạy ở màn sâu (đã sửa); vẫn chưa có kịch bản người mua tự bấm hết giao diện. |
| D4 Tiền qua ngân hàng | 7 | 6 | 8 | Đối soát + chi cọc chạy; ca tiền thừa chưa show. |
| D5 Phạm vi sạch | 5 | 5 | 7 | Đồng ý ChatGPT: màn sâu `mua.html` còn lối quay về Hôm nay/Tiền/Tin nhắn mẫu cũ. |
| **Tổng C** | **32/50** | **29/50** | **37/50** | |
