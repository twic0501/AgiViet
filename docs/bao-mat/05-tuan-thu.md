# 05 · Pháp lý và tuân thủ ở mức kỹ thuật

Bản 25/10/2026. **Đây không phải ý kiến pháp lý.** Tài liệu chuyển các yêu cầu pháp luật thành việc kỹ thuật, và ghi rõ chỗ nào cần luật sư hoặc ngân hàng đối tác xác nhận. Nguồn đối chiếu chính: nghiên cứu `payments_contracts_vn.md` (22/10/2026) và hiểu biết của người viết; số hiệu văn bản cần luật sư kiểm lại bản hiện hành trước khi dùng ra ngoài.

## 1. Dữ liệu cá nhân

**Điểm cần sửa trong yêu cầu ban đầu:** yêu cầu nêu Nghị định 13/2023/NĐ-CP. Theo nghiên cứu ngày 22/10/2026, **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 có hiệu lực từ 01/01/2026** và Nghị định 356/2025/NĐ-CP hướng dẫn. NĐ 13/2023 nhiều khả năng đã bị thay thế toàn bộ hoặc một phần. **Luật sư phải xác nhận văn bản đang áp dụng.** Thiết kế dưới đây đáp ứng các nhóm yêu cầu chung của cả hai khung (cơ sở xử lý, đồng ý theo mục đích, dữ liệu nhạy cảm, quyền chủ thể, đánh giá tác động, chuyển ra nước ngoài, thông báo vi phạm).

| Yêu cầu | Việc kỹ thuật | Nơi | Trạng thái |
|---|---|---|---|
| Phân loại dữ liệu | Cơ bản: tên, SĐT, xã. **Nhạy cảm** (theo khung NĐ 13, cần xác nhận với Luật 91): CCCD, ảnh mặt eKYC, thông tin tài khoản ngân hàng, vị trí chính xác của vườn | Schema `pii` tách riêng, mã hóa phong bì | Lược đồ có; mã hóa là việc backend |
| Đồng ý theo mục đích | Màn đồng ý tách từng mục đích: giao dịch (cần cho hợp đồng), eKYC, chia sẻ với đối tác (xe, kiểm định, ngân hàng), tiếp thị (mặc định tắt). Lưu bản ghi đồng ý có phiên bản văn bản, thời điểm, kênh | Backend + app | Đề xuất (chưa có bảng đồng ý trong lược đồ) |
| Tối thiểu hóa | Bên kia chỉ thấy liên lạc sau cọc (`contact_grants`), trang công khai không có tên hộ, địa chỉ chi tiết | DB + API | Lược đồ có |
| Quyền chủ thể (xem, sửa, xóa, rút đồng ý) | Màn "Dữ liệu của tôi"; xóa = xóa/ẩn danh bản ghi `pii`, **giữ** hợp đồng, bút toán, chứng từ trong thời hạn lưu kế toán; giải thích rõ phần phải giữ | Backend | Đề xuất; chưa có job ẩn danh (`docs/database/04` đã ghi) |
| Đánh giá tác động xử lý dữ liệu | Lập hồ sơ đánh giá tác động trước khi chạy thật: luồng dữ liệu, bên xử lý (SMS, eKYC, ngân hàng, đám mây), biện pháp ở `03` | Pháp chế | Chưa làm |
| Chuyển dữ liệu ra nước ngoài | Nếu dùng đám mây/SMS/eKYC đặt ngoài Việt Nam: hồ sơ đánh giá chuyển dữ liệu; ưu tiên vùng lưu trữ tại Việt Nam. Luật An ninh mạng và NĐ 53/2022 có yêu cầu lưu trữ trong nước với một số loại dữ liệu và doanh nghiệp | Hạ tầng + pháp chế | Cần luật sư |
| Thông báo vi phạm | Quy trình sự cố: phát hiện, khoanh vùng, thông báo cơ quan quản lý và chủ thể trong thời hạn luật định (NĐ 13 là 72 giờ; kiểm lại theo Luật 91) | Vận hành | Đề xuất |
| Bên xử lý dữ liệu | Hợp đồng xử lý dữ liệu với nhà cung cấp SMS, eKYC, lưu trữ, ngân hàng | Pháp chế | Chưa làm |
| Người giúp | Ủy quyền ghi rõ phạm vi xem dữ liệu; người giúp không xem CCCD, số tài khoản đầy đủ | DB `delegations` | Lược đồ có phạm vi hành động; phạm vi xem PII cần kiểm ở API |

## 2. Giữ tiền, thanh toán

| Vấn đề | Kỹ thuật làm gì | Cần ai xác nhận |
|---|---|---|
| AgiViet không phải tổ chức cung ứng dịch vụ thanh toán; tự nhận tiền mua hàng vào tài khoản công ty có thể là hoạt động trung gian thanh toán cần giấy phép (NĐ 52/2024/NĐ-CP; TT 40/2024 sửa bởi TT 22/2026/TT-NHNN theo nghiên cứu) | Sổ cái và luồng tiền thiết kế để **tiền cọc không bao giờ vào tài khoản chi phí AgiViet**; chỉ ghi lệnh và đối soát. Tài khoản đảm bảo do ngân hàng mở theo sản phẩm của ngân hàng | Luật sư + ngân hàng: cấu trúc pháp lý của tài khoản đảm bảo, ai là chủ tài khoản, ai có quyền ra lệnh, cơ sở hợp đồng ba bên |
| Ngân hàng tách phí (F) sang tài khoản doanh thu AgiViet từ một lần chuyển C + F | Sổ cái ghi riêng `fee_held`; đối soát R5 | Ngân hàng: có hỗ trợ tách khoản? Nếu không: hai lần chuyển riêng |
| Chữ "ký quỹ", "bảo đảm", "escrow" trên giao diện | Theo bảng chữ cấm ở `00` mục 7; chỉ ghi "tiền đang do [ngân hàng] giữ theo [điều kiện]" khi có hợp đồng thật | Luật sư |
| Hoàn tiền về tài khoản nguồn, chặn nộp hộ | D-18 | Ngân hàng: API có trả tài khoản nguồn và tên? |
| Phòng chống rửa tiền (Luật 14/2022/QH15, NĐ 19/2023/NĐ-CP) | Giám sát R1–R8 (`anomaly.mjs`), lưu hồ sơ giao dịch, chuyển cờ nghi vấn cho ngân hàng đối tác (bên có nghĩa vụ báo cáo); không tự kết luận | Luật sư: AgiViet có thuộc đối tượng báo cáo không; ngưỡng giao dịch giá trị lớn (QĐ 11/2023/QĐ-TTg, 400 triệu đồng tiền mặt) |
| Tiền mặt trong trả thẳng | Cảnh báo ≥ 20 triệu/lần (N-14) | Kế toán/luật sư: điều kiện chứng từ không dùng tiền mặt để bên mua được khấu trừ thuế theo luật thuế hiện hành |
| Người bán chỉ dùng tài khoản thanh toán của mình (Luật TMĐT 122/2025/QH15 Điều 21) | Tài khoản nhận tiền phải **đúng tên** chủ tổ chức/hộ (`name_match`, lược đồ có kiểm); HTX/tổ hợp tác nhận thay hộ cần xem lại (N-15) | Luật sư |
| Xác thực điện tử danh tính người bán từ 01/01/2027 (thông báo Cục TMĐT 14/10/2026 theo nghiên cứu) | eKYC qua nhà cung cấp được phép hoặc VNeID; lưu kết quả, không lưu dư ảnh | Luật sư + nhà cung cấp eKYC |

## 3. Hợp đồng điện tử, chữ ký, OTP

| Vấn đề | Kỹ thuật làm gì | Cần ai xác nhận |
|---|---|---|
| Luật Giao dịch điện tử 20/2023/QH15: giá trị chứng cứ dựa trên độ tin cậy của cách tạo, gửi, lưu, tính toàn vẹn và xác định người ký | Ký trên băm nội dung chuẩn tắc; chuỗi phiên bản; niêm phong; lưu OTP thử thách gắn băm (D-15); nhật ký thiết bị, IP, thời điểm; kho WORM | Luật sư: OTP là "chữ ký điện tử" (không phải chữ ký số) có đủ cho hợp đồng mua bán hàng hóa giữa doanh nghiệp và hộ không; có cần chữ ký số cho bên mua là doanh nghiệp |
| Chữ ký số công cộng và dịch vụ tin cậy (nghị định hướng dẫn hiện hành về chữ ký điện tử; người viết hiểu là NĐ 23/2025/NĐ-CP, cần kiểm) | v2 chỉ "ký số mô phỏng", ghi rõ trên PDF và trang xác minh | Luật sư trước khi dùng thật |
| Dấu thời gian | v2 dùng giờ máy chủ; production cân nhắc dịch vụ cấp dấu thời gian được cấp phép cho bản hợp đồng và biên bản | Luật sư |
| Điều khoản đặt cọc và phạt cọc (BLDS 2015 Điều 328; NQ 03/2026/NQ-HĐTP hiệu lực 15/10/2026 theo nghiên cứu) | Thang Q04 là tham số chính sách có phiên bản, không cứng trong mã | **Luật sư bắt buộc** rà Q04, "cọc về người bán khi bên mua không trả trước bốc", "im lặng = đạt" |
| OTP qua SMS cho người lớn tuổi, đọc chậm | Tin nhắn có việc + số tiền; cuộc gọi tự động đọc mã (N-16); người giúp không nhận OTP tiền | — |

## 4. Lưu chứng từ điện tử

| Loại | Thời hạn đề xuất | Căn cứ cần xác nhận |
|---|---|---|
| Hợp đồng, phụ lục, biên bản nghiệm thu, giao nhận, bảng quyết toán, chứng từ thanh toán, bảng kê 01/TNDN | ≥ 10 năm (tham số) | Luật Kế toán 2015 và nghị định hướng dẫn về lưu trữ tài liệu kế toán (người viết hiểu là tối thiểu 10 năm với chứng từ dùng ghi sổ) |
| Nhật ký kiểm toán, sự kiện ngân hàng, lịch sử trạng thái | ≥ 10 năm cùng chứng từ | Như trên |
| Ảnh CCCD, ảnh mặt eKYC | Ngắn nhất có thể sau khi xác minh (đề xuất 90 ngày giữ ảnh, giữ kết quả) | Luật dữ liệu cá nhân + yêu cầu định danh TMĐT |
| Tin nhắn trò chuyện | Theo mục đích (tranh chấp): 2 năm sau đơn đóng | Luật sư |

Kỹ thuật: kho đối tượng có khóa đối tượng (Object Lock) chế độ compliance; băm SHA-256 lưu ở DB; sao lưu tách vùng; kiểm khôi phục định kỳ; chuyển định dạng lưu lâu dài (PDF/A) cho bản trình bày.

## 5. Tóm tắt phần chưa có cơ sở, cần xác nhận

1. Văn bản dữ liệu cá nhân đang áp dụng (Luật 91/2025 + NĐ 356/2025 thay NĐ 13/2023?).
2. Cấu trúc tài khoản đảm bảo với ngân hàng, giấy phép, hợp đồng ba bên, năng lực tách phí, hoàn về nguồn, API tra, webhook ký, sao kê.
3. Hiệu lực điều khoản phạt cọc Q04 và các mặc định "im lặng".
4. OTP có đủ làm chữ ký hợp đồng B2B với hộ nông dân; khi nào cần chữ ký số.
5. Nghĩa vụ phòng chống rửa tiền của AgiViet.
6. HTX/tổ hợp tác nhận tiền thay hộ.
7. Thời hạn lưu từng loại chứng từ, yêu cầu lưu trữ dữ liệu trong nước.
