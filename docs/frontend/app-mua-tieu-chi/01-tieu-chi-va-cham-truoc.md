# App mua — bộ tiêu chí riêng và điểm TRƯỚC khi dựng lại (03/11/2026, Claude chấm)

**Việc người mua "thuê" app làm (Jobs to be done):** *"Bảo đảm tuần nào cũng đủ hàng đúng chất lượng, giá hợp lý, và không rủi ro tiền — mà tốn ít thời gian nhất."*
Người dùng mẫu: chị Hà, phụ trách mua nhà hàng Bếp Sen (mua định kỳ); anh Tuấn, đại lý/XNK (mua lô lớn, cần chứng từ). Bên mua là bên trả tiền, nên app phải phục vụ họ ngang với app bán.

## 10 tiêu chí (mỗi tiêu chí 10 điểm, tổng 100)
| # | Tiêu chí | Câu hỏi kiểm | Mô hình tâm lý/UX căn cứ |
|---|---|---|---|
| T1 | **Chắc nguồn** | Mở app trong 5 giây có biết tuần này đủ/thiếu bao nhiêu kg, thiếu món gì? | Sợ mất (loss aversion), North Star = kg đã chắc / kg cần |
| T2 | **Tìm & so sánh nguồn** | Tìm được người bán món đang thiếu và so 2–3 nguồn cạnh nhau không? | Hick's Law, paradox of choice (gợi ý 1 nguồn tốt nhất) |
| T3 | **Tin người bán** | Mỗi nguồn có bằng chứng thật (đã kiểm vườn, số đơn giao đủ, tỉ lệ đạt, ảnh mới)? | Social proof, authority, pratfall (nói thật điểm yếu) |
| T4 | **Quyết định giá** | Khi chào giá, duyệt giá tuần có giá neo (giá chợ, giá tuần trước) và biết rẻ/đắt? | Anchoring, contrast, framing |
| T5 | **Việc tới lượt** | Có hàng đợi "tới lượt bạn", việc gấp nổi bật, mỗi việc 1 nút? | Zeigarnik, BJ Fogg (prompt + ability), goal-gradient |
| T6 | **Tiền minh bạch** | Biết tiền đang ở đâu (ngân hàng giữ / còn nợ / đã xác nhận), nợ ai, hạn nào, chuyển vào đâu? | Mental accounting, regret aversion |
| T7 | **Giao nhận & chất lượng** | Theo được buổi giao (xe, kiểm, nghiệm thu từng món), xử lý thiếu/hạ loại rõ? | Peak-end (lúc nhận hàng là đỉnh trải nghiệm) |
| T8 | **Điều hướng điện thoại** | ≤ 5 tab cố định; mọi chức năng chính tới được trong ≤ 2 chạm; không menu ẩn? | Bottom nav ≤5, nav-hierarchy (UI/UX Pro Max §9) |
| T9 | **Công cụ doanh nghiệp** | Kế hoạch mua tuần, xuất bảng kê cho kế toán, nhiều thành viên/duyệt chi, lịch nhận? | Status-quo bias (thay sổ/Excel phải dễ hơn), switching cost |
| T10 | **Tin cậy kỹ thuật & tiếp cận** | Dữ liệu thật (không lẫn mẫu), bật theo phiên đăng nhập, chữ ≥ 14px, nút ≥ 44px, tương phản 4.5:1? | UI/UX Pro Max ưu tiên 1–2 (a11y, touch) |

Thang: 0–2 chưa có · 3–4 có nhưng hỏng/khó dùng · 5–6 dùng được, còn lỗ · 7–8 tốt · 9–10 xuất sắc, có bằng chứng.

## Điểm app mua HIỆN TẠI (`frontend/thiet-ke/mua.js`, nhánh production-test 395b7ce)
| # | Điểm | Căn cứ |
|---|---:|---|
| T1 | 3 | Tổng quan là mô phỏng (số Đồng Xanh 27/10); không có chỉ số "đã chắc / cần" theo dữ liệu thật. |
| T2 | 3 | Nguồn hàng có lọc nhóm nhưng ở vòng 3 hiện trống; không so sánh nguồn. |
| T3 | 3 | Thẻ lô chỉ có "Người bán tự khai"; chưa có số đơn giao đủ, tỉ lệ đạt. |
| T4 | 6 | Bảng giá tuần có giá lúc lập, cảnh báo dưới 70%; chào giá chưa có giá chợ neo. |
| T5 | 4 | Đơn sắp "tới lượt bạn" lên đầu, nhưng không có hàng đợi chung ở màn đầu. |
| T6 | 5 | Trả tiền tuần, nhận thiếu, cọc chạy thật; công nợ là mô phỏng; màn trả tuần thiếu tài khoản. |
| T7 | 7 | Đặt xe, QR, nghiệm thu từng món, xử lý thiếu, hàng trả lại chạy thật. |
| T8 | 2 | Trên điện thoại menu trái ẩn; không vào được Khung, Báo giá, Nhu cầu, Công nợ (vòng 3). |
| T9 | 2 | Kế hoạch mua, bảng kê, thành viên đều là mô phỏng. |
| T10 | 4 | Chỉ bật dữ liệu thật khi URL có `?thu=`; nhiều màn trộn số mẫu (có dải cảnh báo). |
| **Tổng** | **39/100** | |
