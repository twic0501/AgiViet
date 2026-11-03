# App mua — phân tích tâm lý người dùng và hướng thiết kế lại (03/11/2026)

Bản mẫu chạy được: `frontend/thiet-ke/mua-moi.html` (5 tab, khổ điện thoại, số liệu mẫu).
Căn cứ: chấm vòng 3 (`docs/frontend/doi-vai-vong3/chatgpt-cham.md`, App mua 5,5/10), chính sách 02/11, chân dung bên mua (đại lý, XNK, chế biến, nhà hàng mua định kỳ).

## Người dùng là ai
**Chị Hà, phụ trách mua của nhà hàng Bếp Sen.** Dùng điện thoại giữa giờ bếp, mỗi lần mở app chỉ vài phút. Chị chịu trách nhiệm với chủ quán về hai việc: **đủ hàng mỗi tuần** và **không mất tiền oan**.

| Nỗi lo trong đầu | Hành vi thật | Hệ quả thiết kế |
|---|---|---|
| "Tuần này có đủ hàng không?" (sợ đứt nguồn) | Mở app để kiểm chứ không để "lướt chợ" | Màn đầu trả lời ngay: đã chắc bao nhiêu kg / cần bao nhiêu, thiếu gì |
| "Người bán này có đáng tin?" (rủi ro chất lượng) | Mua lại người quen, ngại người lạ | Mỗi lô hiện bằng chứng thật: đã kiểm vườn, số đơn đã giao đủ, ảnh chụp mới |
| "Cọc của mình có an toàn?" (sợ mất tiền) | Do dự khi chuyển cọc cho người lạ | Luôn nói rõ tiền đang ở đâu: ngân hàng giữ / còn phải trả / người bán đã xác nhận |
| "Mình đang nợ ai, hạn nào?" (sợ trễ hạn, mất uy tín) | Kế toán hỏi cuối tuần | Màn Tiền gom theo người bán, hạn gần nhất đứng đầu |
| "Việc nào đang chờ mình?" (quá tải) | Bỏ sót bước nếu phải tự tìm | Hàng đợi "Tới lượt bạn", việc gấp màu đỏ, mỗi việc một nút |

## Nguyên lý tâm lý áp dụng
1. **Sợ mất hơn ham được (loss aversion):** nói "Thiếu 30 kg xoài" thay vì "Đã có 170 kg". Nút chính là hành động lấp chỗ thiếu.
2. **Việc dở dang day dứt (Zeigarnik):** "Tới lượt bạn · 3 việc" với chấm đỏ trên tab. Xong thì biến mất, người dùng có cảm giác hoàn tất.
3. **Neo giá (anchoring):** khi chào giá hay duyệt giá tuần luôn kèm giá chợ tuần này và giá tuần trước ("Rẻ hơn 500").
4. **Bằng chứng xã hội có thật:** "12 đơn giao đủ", "Đã kiểm vườn" lấy từ giao dịch thật, không dùng sao đánh giá mơ hồ.
5. **Giảm tải nhận thức:** mỗi màn trả lời một câu hỏi; 5 tab cố định trên điện thoại (Hôm nay · Nguồn hàng · Đơn · Tiền · Nhắn). Bỏ menu trái ẩn, vốn làm vòng 3 không vào được khung, báo giá, công nợ.
6. **Mặc định có lợi (default effect):** khung tuần là đường mua chính. Đơn lẻ dùng để lấp thiếu.
7. **Minh bạch tạo tin (trust through transparency):** tiền tách 3 ô "ngân hàng giữ / còn phải trả / người bán đã xác nhận", kèm một câu vì sao an toàn.

## Kiến trúc mới (5 tab thay 49 màn)
- **Hôm nay:** nguồn tuần (đã chắc / cần / thiếu) → Tới lượt bạn → Tiền đang ở đâu.
- **Nguồn hàng:** lọc theo mặt hàng đang thiếu; thẻ lô có bằng chứng tin cậy + giá chợ; Chào giá / Gọi thêm (nếu đã có khung).
- **Đơn:** khung tuần ở trên (còn gọi được bao nhiêu, giá tuần chờ ai), đơn lẻ dưới với thanh 5 bước và "ai đang giữ việc".
- **Tiền:** còn phải trả (số lớn) → theo người bán → ngân hàng đang giữ.
- **Nhắn:** gom theo đơn/khung, không tách khỏi giao dịch.
- Màn mô phỏng (kho, báo cáo, mối quen, dịch vụ) gom vào một mục "Thêm" có nhãn mô phỏng, không nằm trên đường chính.

## Việc tiếp theo nếu duyệt hướng
Nối 5 tab vào dữ liệu thật đã có (`/v1/frameworks`, `/v1/orders`, `/v1/lots`, khoản trả, tin nhắn), app tự bật dữ liệu thật theo phiên đăng nhập, rồi chạy lại vòng chấm chéo.
