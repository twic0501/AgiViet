# 00 · Tổng quan bảo mật AgiViet production v2

Bản 25/10/2026. Người viết: kỹ sư bảo mật thanh toán. Đối tượng đọc: chủ dự án, kỹ sư backend, kỹ sư DB, kỹ sư app, vận hành.

## 1. Mục tiêu

"Thắt chặt vòng đời trao đổi dòng tiền": mỗi khoản tiền (cọc, phí, trả thẳng, hoàn, phạt, quyết toán, hoàn một phần) có máy trạng thái rõ, mỗi bước biết **ai được bấm, cần bằng chứng gì, ghi sổ gì, khi nào không quay lại được**, và có kiểm chứng tự động.

## 2. Tài liệu

| File | Nội dung |
|---|---|
| `01-vong-doi-dong-tien.md` | Máy trạng thái từng khoản (Mermaid), thang bằng chứng A/B/C, điểm không quay lại, đối soát hai chiều, xử lý lệch số, ma trận ai được làm gì |
| `02-mo-hinh-de-doa.md` | STRIDE, 24 mối đe dọa, 10 rủi ro lớn nhất |
| `03-bien-phap-va-vi-tri.md` | 22 biện pháp, đặt ở DB / backend / app / vận hành, cách kiểm, trạng thái |
| `04-checklist-backend-app.md` | Danh sách kiểm tra theo OWASP ASVS (mức 2, mức 3 cho tiền) + MASVS cho app |
| `05-tuan-thu.md` | Dữ liệu cá nhân, thanh toán, hợp đồng điện tử, lưu chứng từ; phần cần luật sư/ngân hàng |
| `06-loi-tim-thay-trong-thiet-ke.md` | Lỗ hổng trong đặc tả và lược đồ của nhóm khác, kèm đề xuất sửa và ca kiểm chạy thật |
| `07-danh-gia-thanh-that.md` | Đã chứng minh gì, chỉ là thiết kế gì, rủi ro còn lại, điều không nên tuyên bố |

Mã và kiểm thử: `security/` (xem `security/README.md`).

## 3. Bảy luật nền của dòng tiền (chi tiết `01` mục 1)

1. Chỉ **ngân hàng** (chữ ký đúng + tra lại API) hoặc **bên nhận tiền** (xác nhận có OTP, chỉ cho tiền ngoài tài khoản đảm bảo) tạo được sự thật "tiền đã vào". Mọi đường khác qua vận hành hai người với bằng chứng hạng C.
2. Ảnh ủy nhiệm chi, ảnh màn hình, lời báo, cuộc gọi **không phải bằng chứng**.
3. Người giúp không có bước tiền nào.
4. Tiền ra chỉ tới tài khoản đã chụp (chi người bán: tài khoản trong hợp đồng; hoàn bên mua: tài khoản nguồn).
5. Mỗi sự thật tiền ghi đúng một lần.
6. Im lặng không bao giờ là "đã nhận tiền".
7. Không sửa, chỉ ghi bù, qua hai người.

## 4. Kết quả chính

- Vòng đời tiền 7 máy trạng thái, có bản dữ liệu `security/lib/money-lifecycle.mjs` và 11 bài kiểm tính chất + 7 đột biến.
- 79 bài kiểm thử đơn vị đạt (webhook, QR, VietQR, PDF, OTP, hai người duyệt, tài khoản nhận tiền, giám sát, quyết toán).
- 45 ca tấn công chạy trên lược đồ DB đã chốt: 29 bị chặn đúng, 12 lỗ hổng còn mở (`06`), 4 thao tác hợp lệ qua; 21 bất biến tiền đạt.
- 16 vấn đề trong đặc tả nghiệp vụ, 3 mức cao: thiếu tra lại API ngân hàng, xác nhận tiền không có OTP, ký biên bản tại chỗ không xác thực người cầm máy.

## 5. Giả định

- Ngân hàng đối tác có tài khoản ảo/mã tham chiếu, webhook ký, API tra, sao kê, khóa chống lặp lệnh, hoàn về nguồn (chưa xác nhận).
- Backend sẽ theo `docs/database/06` và kết nối DB bằng vai hẹp, không bằng owner.
- Người bán dùng Android tầm thấp, có thể dùng chung máy trong gia đình; bên mua làm việc trên máy tính.
- Không có tín hiệu "SIM vừa đổi" từ nhà mạng.
