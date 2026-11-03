# App mua dựng lại — Claude chấm SAU (03/11/2026)

Bản chấm: `frontend/thiet-ke/mua-moi.html` (5 tab + 4 tấm trượt). Tiêu chí ở `01-tieu-chi-va-cham-truoc.md`.
**Lưu ý trung thực:** bản dựng lại dùng bộ dữ liệu mẫu trong tệp, chưa nối API thật. Điểm T10 phản ánh điều đó.

| # | Trước | Sau | Căn cứ |
|---|---:|---:|---|
| T1 Chắc nguồn | 3 | 8 | Hôm nay mở đầu bằng "170 / 200 kg đã chắc", thanh từng món (khung / đơn lẻ / thiếu), nút "Tìm 30 kg xoài còn thiếu" dẫn thẳng sang Nguồn đã lọc. |
| T2 Tìm & so sánh | 3 | 8 | Ô tìm, lọc theo món, nguồn "Hợp nhất cho bạn" lên đầu, chọn tối đa 3 nguồn để so sánh bảng (tô xanh ô tốt nhất), gửi nhu cầu cho 5 người bán. |
| T3 Tin người bán | 3 | 7 | Mỗi nguồn có "Đã kiểm vườn / tự khai", số đơn giao đủ, % hàng đạt, "đang có khung với bạn". Chưa có trang hồ sơ người bán. |
| T4 Quyết định giá | 6 | 7 | Giá chợ tuần trên từng nguồn; duyệt giá tuần có vạch neo giá chợ. Tấm chào giá có neo chưa dựng (đang là thông báo). |
| T5 Việc tới lượt | 4 | 8 | "Tới lượt bạn · 3 việc", vạch đỏ cho việc gấp, mỗi việc bấm thẳng vào nơi xử lý; chấm đỏ trên tab. |
| T6 Tiền minh bạch | 5 | 8 | Số lớn "còn phải trả", theo người bán + hạn, tấm trả tiền có ngân hàng / số tài khoản / nội dung + nút chép + cảnh báo lừa đổi tài khoản; tách cọc khung / cọc đơn. |
| T7 Giao nhận | 7 | 6 | Thanh 5 bước + kết quả nghiệm thu từng món; luồng đặt xe / QR / nghiệm thu chi tiết chưa chuyển sang bản mới (bản cũ vẫn có). |
| T8 Điều hướng | 2 | 9 | 5 tab cố định (Hôm nay · Nguồn · Đơn · Tiền · Thêm), tin nhắn ở đầu trang; mọi chức năng ≤ 2 chạm; nút ≥ 44px; Esc đóng tấm, trả tiêu điểm. |
| T9 Công cụ doanh nghiệp | 2 | 6 | Có mục kế hoạch tuần, gửi nhu cầu, lập khung, người bán quen, thành viên & duyệt chi, xuất bảng kê; phần lớn mới là lối vào (thông báo), chưa có màn đầy đủ. Dịch vụ đối tác ghi rõ "Mô phỏng". |
| T10 Tin cậy kỹ thuật | 4 | 3 | Toàn bộ là dữ liệu mẫu, chưa nối API, chưa bật theo phiên đăng nhập. Tiếp cận: focus thấy rõ, aria-label, giảm chuyển động. |
| **Tổng** | **39** | **70/100** | |

**Việc để lên 85+:** nối API thật cho 5 tab (T10), dựng tấm chào giá có neo (T4), trang hồ sơ người bán (T3), chuyển luồng giao nhận chi tiết sang bản mới (T7), màn kế hoạch tuần + bảng kê thật (T9).
