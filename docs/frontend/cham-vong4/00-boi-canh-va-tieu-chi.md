# Vòng 4 — chấm chéo đổi vai bản ĐI THI (03/11/2026)

## Bối cảnh (đọc trước khi chấm — bắt buộc)
- AgiViet đang làm **bản trình diễn để đi thi**. Chỉ chấm **những gì sẽ show ở buổi thi** (danh sách bên dưới). Không đề xuất tính năng mới cho sau buổi thi, không trừ điểm vì thiếu thứ nằm ngoài danh sách.
- Các mục bấm vào báo **"… đang phát triển, sẽ có ở bản sau"** là cố ý (người sáng lập đã loại khỏi buổi thi): **không chấm, không tính là lỗi** (vd. Xe/kho lạnh/kiểm định ở app mua; lấy vị trí, chụp căn cước ở màn bắt đầu app bán).
- **Đối tác là AI mô phỏng**: khi người xem cầm một vai (1 trong 10 người bán / 10 bên mua mẫu), AI đóng mọi bên còn lại qua đúng API nghiệp vụ — bên kia trả giá, đồng ý, ký, chuyển cọc (ngân hàng giả lập), đặt xe, nghiệm thu, trả tiền; **ngân hàng giữ hộ** chi cọc / hoàn tiền thừa; **nhân viên AgiViet** đối soát. Đây là chủ ý cho buổi thi, không phải thiếu sót.
- **Đăng nhập buổi thi** = chọn người mẫu (không nhập số, không OTP). Bản thật vẫn OTP. Mã người nhận hàng ở bản thử hiện ngay trên màn người bán (vì bên mua là AI) — cũng là chủ ý.
- Chính sách đã chốt (không chấm lại): không trả sau; cọc ngân hàng giữ, tiền hàng bên mua trả thẳng; tiền thừa trong cọc **ngân hàng tự hoàn**; ngưỡng hạ cấp 70% / trả lại 20%; chỉ nội địa; trâu chỉ ở app bán, chỉ chính diện.
- Người dùng: **người bán** = nông dân lớn tuổi / HTX trên điện thoại 360–390px; **người mua** = phụ trách mua nhà hàng, vựa, nhà máy, XNK (bên trả tiền).

## Tính năng sẽ show (người sáng lập chọn, `frontend/thiet-ke/chon-tinh-nang-demo.html`)
- **App bán:** đăng nhập/đăng ký OTP (buổi thi: chọn vai), bắt đầu (khai vườn, xác minh), tour + trâu, Trang chủ Hôm nay, đăng bài lô, Chợ/hàng của tôi, chi tiết lô, nhu cầu bên mua, tin nhắn + lời chào giá, sổ hợp đồng, ký OTP, giao nhận + nghiệm thu, hợp đồng khung tuần, tranh chấp/kiểm định, tiền của bác, xác nhận đã nhận tiền, tài khoản nhận tiền, vườn + nhật ký, thời tiết, giá & tin tức, trợ lý AI, nghe đọc to/cỡ chữ, thông báo.
- **App mua:** màn chờ tải, đăng nhập/đăng ký, màn chào 4 bước, Hôm nay, nguồn hàng (tìm, lọc, giá tham khảo), chào giá kín, lời chào đã gửi, gửi nhu cầu, so sánh nguồn (≤3), danh sách đơn, ký OTP + cọc VietQR, đặt xe + QR nhận hàng, nghiệm thu từng món, khung tuần, khoản phải trả + trả tiền, nhận tiền hoàn (ngân hàng hoàn), tin nhắn theo đơn, kế hoạch mua tuần, người bán quen.
- **Chung:** ngân hàng giữ cọc (giả lập), hợp đồng/biên bản PDF + mã kiểm chứng, che số điện thoại/tài khoản trong chat, luật 02/11, chợ mô phỏng + AI điều phối.

## Tiêu chí
### A. App bán — 8 tiêu chí cũ (mỗi mục 10, tổng 80; như vòng 3)
Luồng chính · Nhắn tin + chặn liên lạc · Tiền + cọc · Hỗ trợ + hướng dẫn · Chống ép giá/lừa · Giao diện nông dân · (bỏ "App mua" — chấm riêng ở B) · Độ gọn, nhất quán → **7 mục / 70**.
### B. App mua — 10 tiêu chí cũ (mỗi mục 10, tổng 100; `docs/frontend/app-mua-tieu-chi/01-tieu-chi-va-cham-truoc.md`)
T1 Chắc nguồn · T2 Tìm & so sánh · T3 Tin người bán · T4 Quyết định giá · T5 Việc tới lượt · T6 Tiền minh bạch · T7 Giao nhận & chất lượng · T8 Điều hướng điện thoại · T9 Công cụ doanh nghiệp · T10 Tin cậy kỹ thuật & tiếp cận.
### C. MỚI cho buổi thi — 5 tiêu chí (mỗi mục 10, tổng 50; chấm cho cả hệ hai app)
- **D1 Vào vai nhanh**: từ màn quả cầu tới đúng app/đúng tổ chức ≤ 2 chạm, rõ mình đang là ai.
- **D2 Chợ sống**: bên kia (AI) phản hồi tự nhiên, đúng luật (chào giá kín, giá tham khảo hợp lý), người dùng được báo đúng việc của mình, không lộ giao dịch người khác.
- **D3 Trọn luồng không kẹt**: một đơn đi được từ chào giá tới hoàn tất cả hai chiều (người thật là bên bán, hoặc là bên mua) mà không cần người ngoài can thiệp.
- **D4 Tiền qua ngân hàng minh bạch**: cọc ngân hàng giữ, chi cọc, hoàn tiền thừa, đối soát — mỗi bên thấy tiền đang ở đâu, số khớp quyết toán.
- **D5 Phạm vi trình diễn sạch**: không lẫn số mẫu với số thật, mục chưa làm báo "đang phát triển", không mã nội bộ, không lỗi hiển thị (360–390px).

Thang mỗi mục: 0–2 chưa có · 3–4 có nhưng hỏng/khó dùng · 5–6 dùng được, còn lỗ · 7–8 tốt · 9–10 xuất sắc, có bằng chứng.

## Cách chấm chéo đổi vai
- **Lượt 1:** Claude nhập vai **người bán** → chấm A + C; ChatGPT nhập vai **bên mua** → chấm B + C.
- **Lượt 2 (đổi vai):** Claude chấm **B**; ChatGPT chấm **A** (+ phản biện điểm C của bên kia).
- Bên chấm trước ghi điểm vào tệp và commit trước; mỗi điểm có căn cứ ảnh (`anh/*.png`) hoặc tệp:dòng; "dùng được" phải có bằng chứng làm được (kịch bản E2E), không chỉ nhìn thấy.

## Bằng chứng
- Ảnh 390px `anh/`: B00–B15 (app bán: chị Năm có 2 đơn hoàn tất; HTX có 2 lời chào đang chờ), M00–M09 (app mua: Nhà máy sấy Đồng Xanh).
- E2E: `backend/scripts/kiem-cho-ai.mjs` (người bán thật, 2 đơn hoàn tất trong 10 vòng), `backend/scripts/kiem-cho-ai-ben-mua.mjs` (bên mua chào → người bán ảo → hoàn tất); backend 76/76, test:cho 43/43; soát giao diện `frontend/tests/soat-giao-dien.mjs`.
- Nhật ký thay đổi: `frontend/TIEN-DO.md` E96–E106.
