# App mua — lượt 2: sửa theo phản biện ChatGPT, Claude chấm lại (03/11/2026)

ChatGPT chấm lượt 1 được **41/100** (Claude 70). Claude **chấp nhận** phần lớn phản biện: điểm lượt 1 của Claude đã chấm giao diện "nhìn thấy" mà chưa kiểm "làm được". Điểm lượt 2 dưới đây chấm lại theo chuẩn của ChatGPT (trừ khi thao tác chưa làm thật).

## Đã sửa (mua-moi.html)
1. **Tiền đúng khoản (ChatGPT việc 1):** tấm trả tiền dựng theo `data-khoan`: tiền hàng tuần 2–8/11 1.175.000 đ trả HTX; cọc HĐ-0018 13.800.000 đ vào **tài khoản ngân hàng giữ** (ghi rõ "không phải chị Năm"), không có nút "đã chuyển" giả. Nút Chép chép thật (clipboard).
2. **Bỏ thành công giả (việc 2):** nhãn toàn trang "Bản mẫu… thao tác chưa lưu"; mọi thông báo ghi "Bản mẫu: … chưa lưu". Bảng kê tải **CSV thật** từ dữ liệu khoản.
3. **Hàng đợi khép vòng (việc 5):** việc dựng từ dữ liệu; trả tuần (bắt buộc ảnh biên lai), đồng ý/trả giá tuần, đặt xe (kiểm biển số) → việc biến mất, số việc và chấm đỏ giảm theo. Tổng nguồn tuần, thiếu, nút "Tìm … còn thiếu" tính từ dữ liệu.
4. **Chào giá / trả giá thật (việc 4):** tấm nhập giá + lượng, hiện thành tiền và so với giá chợ (thấp hơn / trong khoảng / cao hơn). Đổi "Thấp hơn giá chợ" sai thành "Trong khoảng giá chợ · thấp hơn tuần trước 500", ghi nguồn giá chợ.
5. **Tìm & so sánh đúng (việc 6):** ô tìm lọc theo tên/người bán/nơi; chỉ so sánh nguồn **cùng món**; xếp hạng có công thức (đủ lượng thiếu, đã kiểm vườn, tỉ lệ giao đủ, khoảng cách) và hiện lý do thay cờ ghi cứng; bảng so sánh có dòng "Đủ 30 kg bạn thiếu?", khoảng cách, ghi chưa tính tiền xe.
6. **Tin người bán (việc 8, một phần):** "12/13 đơn giao đủ" (có mẫu số), "96% hàng đạt khi nghiệm thu… tính trên 13 đơn", ai kiểm vườn, ngày nào.
7. **Tiếp cận (việc 10, một phần):** giữ tiêu điểm trong tấm, khóa nền (`inert`), chữ ghi chú đủ tương phản (`--muc-nhat`).

## Claude chấm lượt 2
| # | L1 Claude | L1 ChatGPT | **L2 Claude** | Còn thiếu |
|---|---:|---:|---:|---|
| T1 | 8 | 7 | 7 | Chưa tách "đã chắc theo buổi đã xác nhận" với "cam kết khung". |
| T2 | 8 | 5 | 7 | Gửi nhu cầu → so báo giá chưa có màn kết quả. |
| T3 | 7 | 4 | 5 | Chưa có trang hồ sơ người bán / hồ sơ lô, tải chứng nhận. |
| T4 | 7 | 4 | 6 | Chưa có giá xuống loại + xác nhận 70% trong tấm chào giá; chưa tính tiền xe. |
| T5 | 8 | 4 | 7 | Đúng vòng trong bản mẫu; chưa lưu thật. |
| T6 | 8 | 3 | 7 | Đúng khoản, chép thật; chưa có dấu vết đối soát (báo → xác nhận → nhận một phần). |
| T7 | 6 | 3 | 4 | Đặt xe có; QR, nhập cân từng món, xử lý thiếu/20% chưa chuyển sang bản mới. |
| T8 | 9 | 7 | 8 | Tin nhắn chưa mở hội thoại; chưa có chi tiết buổi giao. |
| T9 | 6 | 2 | 3 | CSV thật; kế hoạch, thành viên, người bán quen vẫn chưa có màn. |
| T10 | 3 | 2 | 3 | Vẫn dữ liệu mẫu, chưa nối API/phiên. |
| **Tổng** | 70 | 41 | **57/100** | |
