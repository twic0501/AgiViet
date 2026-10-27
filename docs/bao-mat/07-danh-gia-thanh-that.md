# 07 · Đánh giá thành thật

Bản 25/10/2026. Viết để chủ dự án và ban giám khảo biết chính xác cái gì đã được chứng minh, cái gì chỉ là thiết kế.

## 1. Đã kiểm chứng bằng chạy thật

| Gì | Cách | Kết quả | Giới hạn |
|---|---|---|---|
| Thư viện webhook HMAC + timestamp + nonce, khớp khoản báo có | `node --test security/tests/unit/*.test.mjs` | 14 bài đạt (giả mạo, sửa thân, phát lại, đổi timestamp/nonce, xoay khóa, chữ ký giả không đốt nonce) | Kiểm thư viện, không kiểm backend dùng nó đúng |
| QR Ed25519 có hạn, ràng người nhận, dùng một lần; mã 6 số | như trên | 10 bài đạt | Định dạng khác `06` mục 7 và `core.issue_qr` của DB (N-04) |
| VietQR: CRC, phát hiện thay số tài khoản, chèn trường lặp | như trên | 7 bài đạt, CRC đúng vector chuẩn `123456789 → 29B1` | Chưa đối chiếu tài liệu NAPAS bản hiện hành; chưa thử với app ngân hàng thật |
| PDF: băm, niêm phong, phát hiện sửa và nối thêm sau khi ký, chuỗi phiên bản | như trên | 6 bài đạt | PDF tối giản tự dựng; chưa thử bộ sinh PDF thật |
| OTP gắn ngữ cảnh, giới hạn tần suất; hai người duyệt; thang bằng chứng; đổi tài khoản; giám sát R1–R7 | như trên | 9 + 8 + 6 bài đạt | Dữ liệu giả lập, ngưỡng chưa hiệu chỉnh |
| Công thức quyết toán `04` mục 5–6 | oracle + fuzz 20.000 ca | Ví dụ 7.1, 7.3, 7.6, 7.7, 7.12 khớp; bất biến luôn đúng; **phát hiện** rủi ro chi tạm (N-08) | Kiểm đặc tả, không kiểm backend |
| Tính chất an toàn của vòng đời tiền (người giúp không có bước tiền; bên trả không tự ghi tiền; hẹn giờ không cộng tiền; không chờ vô hạn; điểm không quay lại) | 11 bài đồ thị + kiểm đột biến | 79/79 bài đơn vị đạt; **7/7 đột biến bị bắt**. Lần đầu chỉ bắt 6/7: bài kiểm thử thiếu luật "hẹn giờ không cộng tiền", đã bổ sung | Kiểm mô hình dữ liệu của chính tôi, không kiểm mã backend |
| Lược đồ DB đã chốt chống tấn công | `security/tests/db/kiem-tra-db.mjs` trên PGlite 17.5 với migrations + seed thật | 45 ca: **29/41 bị chặn đúng lý do, 12 lỗ hổng, 4/4 thao tác hợp lệ qua**; 21/21 bất biến đạt | PGlite **một kết nối**: không chứng minh chống đua điều kiện; chạy bằng owner: RLS/GRANT không được thử; Docker/psql không có trong môi trường |

## 2. Chỉ là thiết kế (chưa có mã chạy hoặc chưa có hệ thống để thử)

- Mọi thứ ở backend và app: kiểm quyền theo hành động, tra lại API ngân hàng, khóa đơn khi quyết toán, mã hóa PII, nhật ký WORM, FIDO2 trang vận hành, PIN app. 13 bài kiểm thử API đã viết nhưng **bỏ qua** vì chưa có backend; đường dẫn API phần lớn là giả định.
- Đối soát ba chiều với sao kê ngân hàng: mới có câu SQL bất biến và quy trình trên giấy.
- Chống đua điều kiện quyết toán: lược đồ có UNIQUE và ràng buộc không âm (đã thử một kết nối); chưa thử hai kết nối đồng thời trên Postgres thật.
- Giám sát bất thường: luật đã có mã, chưa có dữ liệu thật để biết tỷ lệ báo nhầm.
- Toàn bộ phần pháp lý (`05`).

## 3. Phụ thuộc ngân hàng đối tác thật (bản mô phỏng không chứng minh được)

1. Có tài khoản đảm bảo/tài khoản ảo theo đơn và cấu trúc pháp lý hợp lệ.
2. Webhook có chữ ký, API tra giao dịch, sao kê ngày có chữ ký.
3. Khóa chống lặp lệnh chi phía ngân hàng; trạng thái thất bại "cuối".
4. Tách phí từ một lần chuyển; hoàn về tài khoản nguồn; trả thông tin tài khoản nguồn.
5. Tra tên chủ tài khoản trước khi kích hoạt tài khoản nhận tiền.
6. Thời gian xử lý lệnh, giờ cắt, ngày nghỉ.

Cổng ngân hàng mô phỏng chỉ chứng minh **logic phía AgiViet** khi giả định ngân hàng hành xử như trên.

## 4. Rủi ro còn lại, xếp hạng (sau biện pháp đã có trong lược đồ)

| Hạng | Rủi ro | Vì sao còn | Việc cần làm trước khi chạy thật |
|---|---|---|---|
| 1 | Backend chạy bằng vai có quyền ghi rộng (owner) ⇒ mọi lỗ hổng D-01/03/04/14/15/17 khai thác được | Chưa có lớp hàm lệnh ghi theo vai | D-01 |
| 2 | Xác nhận tiền/biên bản bằng máy người bán do người khác cầm (tại vườn) | OTP/PIN chưa bắt buộc trong đặc tả | N-02, N-03, D-15 |
| 3 | Lừa đảo xin OTP, SIM swap | Phụ thuộc hành vi người dùng; nhà mạng không cho tín hiệu đổi SIM | Tin nhắn có việc + số tiền, chờ 72 giờ sau khôi phục, giữ lệnh khi tài khoản mới |
| 4 | Webhook giả khi lộ bí mật | Chưa bắt tra lại API | N-01, D-09 |
| 5 | Nhân viên vận hành lạm quyền | Hai người cho lệnh ngân hàng đã có; sổ cái thủ công và vai VH-QL rộng | D-04, N-10 |
| 6 | Hoàn tiền sai nguồn, rửa tiền qua cọc–hủy | Chưa lưu tài khoản nguồn | D-18, D-17, R3 |
| 7 | Mã mô phỏng lọt production | `app.test_time`, cổng đối tác | N-07 |
| 8 | Lộ hợp đồng qua trang xác minh công khai | Đặc tả mâu thuẫn | N-05 |
| 9 | Giả tài xế, QR yếu | Định dạng QR đặc tả còn HMAC 8 ký tự | N-04 |
| 10 | Nợ ngoài app sau chi tạm | Thiết kế công thức | N-08 |

## 5. Không nên tuyên bố với ban giám khảo

- "Tiền được ngân hàng bảo đảm/ký quỹ an toàn": **chưa có ngân hàng đối tác nào xác nhận**; bản v2 dùng ngân hàng mô phỏng.
- "Đã kiểm thử bảo mật/đạt chuẩn OWASP": mới có danh sách kiểm tra; backend và app **chưa tồn tại** nên chưa kiểm.
- "Chống được SIM swap/lừa đảo OTP": chỉ giảm thiệt hại (chờ, giữ lệnh, cảnh báo), không chặn được.
- "Chống rửa tiền": chỉ có luật giám sát chưa hiệu chỉnh; nghĩa vụ pháp lý chưa xác định.
- "Hợp đồng ký OTP có giá trị pháp lý đầy đủ", "tuân thủ Nghị định 13": chưa có ý kiến luật sư; văn bản áp dụng có thể đã đổi (Luật 91/2025).
- "Không thể quyết toán hai lần": đúng ở mức ràng buộc DB một kết nối; chưa thử đồng thời thật.
- "Chữ ký số": v2 là ký số **mô phỏng**, không phải chữ ký số công cộng.

Có thể nói có cơ sở: thiết kế vòng đời tiền với bằng chứng theo hạng và điểm không quay lại; 79 bài kiểm thử đơn vị + kiểm đột biến chạy đạt; 45 ca tấn công trên lược đồ thật cho thấy 29 kiểm soát hoạt động và chỉ ra 12 chỗ còn hở kèm cách sửa; lược đồ đã được nhóm DB sửa nhiều mục sau lần soát đầu (21 lỗ hổng xuống 12).
