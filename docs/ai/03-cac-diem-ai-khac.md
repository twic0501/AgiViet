# AI · 03 Các điểm AI khác

Chọn ít mà chắc: bốn điểm có mã chạy được, một điểm chỉ thiết kế. Không điểm nào dùng LLM. Số đo: `ai/ket_qua/khac.json` (`ai/danh_gia/danh_gia_khac.py`).

## 1. Giá tham khảo có khoảng (`POST /prices/reference`)

- Công thức đúng 05 mục 3 / Q18: trung vị đơn nghiệm thu đã chốt 30 ngày, cùng mặt hàng + loại, quy về tại vườn (trừ cước nếu có dòng cước), loại đơn giá bất thường, cặp bị đánh dấu, đơn ngoài app, khung nhà hàng, lọc IQR khi ≥ 5 đơn; tỉnh đủ dữ liệu thì dùng tỉnh, không thì ĐBSCL; cần ≥ 3 đơn từ ≥ 2 cặp, thiếu thì `chua_du_du_lieu`.
- Thêm so với DB: `khoang_vnd_kg` = [Q1, Q3] ("khoảng thường gặp") và nhãn độ tin cậy quy ước (`vua` khi ≥ 10 đơn, ≥ 5 cặp, (Q3−Q1)/trung vị ≤ 30%; còn lại `thap`). Đây **không** phải khoảng tin cậy thống kê đã hiệu chuẩn; ghi rõ trong trường `giai_thich_tin_cay`.
- **Nguồn sự thật là DB** (`mkt.reference_prices`, migration 0012) — cùng công thức. Endpoint AI dùng để đối chiếu và để tính khoảng; backend không nên có hai giá tham khảo khác nhau. Nếu hai bên lệch, lấy DB và báo lỗi.
- Không bao giờ là "giá nên bán". Hiển thị kèm số đơn, vùng, khoảng thời gian (05 mục 3.2).

Đo: xoài cát Chu L1 trên 14 đơn nền → **25.000 đ/kg, 14 đơn, 4 cặp, khoảng 24.500–25.500** (khớp 10 mục 7). Thử kéo giá: một cặp thêm 5 đơn 12.000 đ chưa gắn cờ → trung vị còn 24.500 (−2%); khi 5 đơn đó đã gắn cờ giá bất thường (dưới 60%, KT-03 tự gắn) → 25.000. Xoài L2 (không có đơn nền) → `chua_du_du_lieu`.

## 2. Bất thường giá và cặp giao dịch (`POST /anomalies/check`)

Phối hợp với chống lách (05 mục 6), chỉ gắn cờ, `tu_khoa_tai_khoan: false`:

| Mã | Điều kiện | Việc (08) |
|---|---|---|
| KT-02 | Giá < 80% tham khảo | Cảnh báo giao diện |
| KT-03 | Giá < 60% tham khảo | Bắt xác nhận thêm; đơn không vào giá tham khảo |
| KT-04 | Cặp ≥ 3 đơn bất thường trong 90 ngày, hoặc ≥ 50% đơn bất thường (≥ 4 đơn) | V15, P2, gọi người bán trước |
| KT-06 | Cùng cặp, cùng lô, ≥ 3 đơn trong 7 ngày, mỗi đơn < 3.000.000 đ | P3 |

Đo trên giao dịch tự tạo: bắt đủ KT-02, 03, 04, 06; không tự khóa. **Chưa làm** (cần dữ liệu backend không có trong snapshot): EG-14 thông đồng nhiều bên mua (cùng thiết bị/tài khoản), LA-10 tài khoản liên quan, EL-06 tỷ lệ hạ cấp bất thường của bên mua (công thức đơn giản, backend làm bằng SQL được). Không đề xuất mô hình học máy phát hiện gian lận trước khi có ≥ vài trăm ca đã được vận hành kết luận.

## 3. Quét liên lạc lách trong tin nhắn (`POST /messages/scan`)

Bổ sung cho bộ lọc regex LA-01 của backend ở chỗ regex hay sót: số điện thoại **đọc bằng chữ** ("không chín một tám…"), viết tách bằng dấu chấm/cách, "+84", số tài khoản cạnh tên ngân hàng/"stk", "zalo/dê lô/zl", đường dẫn, email, và cụm "ck riêng/chuyển thẳng/khỏi qua app" (LA-04). Theo LA-02: chuỗi có đơn vị tiền ("đ", "nghìn", "k"…) hoặc dấu chấm ngăn nghìn là **tiền**, không che, chỉ nhắc EG-10.

Đo: 12/12 câu tự viết (7 phải che, 5 không). **Mẫu quá nhỏ**, chưa đo trên tin nhắn thật; dễ bỏ sót cách lách sáng tạo (gửi ảnh có số, viết "khôg chín…", tách số ra nhiều tin). Quét ảnh (QR, số trong ảnh) chưa làm.

## 4. Tóm tắt hợp đồng bằng lời dễ hiểu (`POST /contracts/summarize`)

- Đầu vào là **trường có cấu trúc** của phiên bản hợp đồng (07 mục 1: tài liệu sinh từ dữ liệu có cấu trúc) kèm `phien_ban`, `ma_bam`. Không đọc PDF tự do.
- Đầu ra: các dòng `noi_dung` (hiển thị) và `loi_doc` (số viết bằng chữ cho nút "Nghe" ở màn ký, 07 mục 3), mỗi dòng ghi `nguon` là trường nào; liệt kê điều khoản còn thiếu; câu cố định "Im lặng không bao giờ là đã nhận tiền".
- **Không dùng LLM** vì mọi con số phải đúng tuyệt đối và truy được nguồn. Kiểm tra tự động: mọi số trong lời tóm tắt đều có trong đầu vào (chỉ khác định dạng "2.000", "02/11/2026").
- Không thay thế hợp đồng; `can_doc_ban_goc: true`. AI không xác minh mã băm với kho tài liệu (backend làm).

Ví dụ đầu ra thật: "Cọc mười lăm triệu đồng, chuyển qua ngân hàng, hạn hai mươi giờ ngày hai tháng mười một."

## 5. Phân loại ảnh hàng (chỉ thiết kế, chưa làm)

- Mục đích: **gợi ý** loại khi đăng lô (ảnh trái trên nền, có vật chuẩn kích thước) và gợi ý mã lý do trả lại khi nghiệm thu (dập, thối, nám). **Không tự nghiệm thu, không tự hạ cấp**, không là chứng cứ trong tranh chấp (chứng cứ là ảnh gốc + kiểm định, 08).
- Cách làm đề xuất: mô hình thị giác nhỏ (họ SigLIP/CLIP, ~400 MB, chạy CPU được) zero-shot với nhãn tiếng Việt, rồi tinh chỉnh khi có ≥ 200 ảnh có nhãn mỗi loại do kiểm định viên gán. Kiểm tra ảnh chụp trong app (CG-01) dựa vào metadata app, không dựa vào AI.
- Vì sao chưa làm: không có ảnh thật có nhãn; zero-shot trên trái cây Việt Nam (xoài cát Chu loại 1 vs 2 khác nhau vài chục gam, vết nám) gần như chắc chắn không đủ tin cậy, làm demo dễ gây hiểu nhầm là "AI chấm loại".
- Điều kiện bật: độ chính xác ≥ 90% trên tập kiểm tra độc lập của từng mặt hàng, và chỉ hiện dưới dạng "Ảnh có vẻ giống loại 2 — anh chị kiểm lại".

## 6. Không làm (và vì sao)

| Ý tưởng | Lý do không làm |
|---|---|
| AI gợi ý "giá nên bán" | Trái nguyên tắc không định giá; giá tham khảo có nguồn đã đủ |
| Chatbot tự trả lời bên mua thay người bán | Rủi ro hứa hẹn thay người bán; lách liên lạc |
| Dự báo giá | Không đủ dữ liệu; dễ bị hiểu là khuyến nghị |
| Chấm điểm tín dụng / ứng tiền | Ngoài phạm vi v2 (00 mục 3.2) |
