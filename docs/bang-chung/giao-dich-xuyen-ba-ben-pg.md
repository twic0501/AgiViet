# Bằng chứng: giao dịch xuyên bên mua – bên bán – vận hành trên PostgreSQL 17 thật

Ngày chạy: 28/10/2026. Lệnh: `cd backend && npm run test:pg -- TH-006` (PostgreSQL 17 nhúng, migrate 0001–0073 + seed,
backend gọi DB qua vai cổng `agv_backend_gateway`; ngân hàng giả lập). Kết quả: **ĐẠT 43/43 bước**.

Các bên: bên mua Trần Thu Hà (TC-M01) · người bán Nguyễn Thị Năm (TC-B01) · người nhận Võ Hoàng Phúc · ngân hàng giả lập · tài chính AgiViet Đỗ Minh Trí (đối soát).

| # | Bước kiểm | Kết quả |
|---|---|---|
| 1 | Lời chào gửi = sent | đạt |
| 2 | Đồng ý giá = accepted | đạt |
| 3 | Câu "Đây chưa phải hợp đồng." | đạt |
| 4 | Đơn soạn thảo = drafting | đạt |
| 5 | Bên mua ký và gửi = awaiting_seller | đạt |
| 6 | Người bán ký = awaiting_deposit | đạt |
| 7 | P_coc = 23000 | đạt |
| 8 | Cọc C = 13800000 | đạt |
| 9 | Phí F = 138000 | đạt |
| 10 | Trả thẳng trước bốc = 32200000 | đạt |
| 11 | PDF hợp đồng tải được, bắt đầu %PDF | đạt |
| 12 | SHA-256 tệp PDF khớp metadata = 9cc7194249be3ca51fbd6cc6e179a27d4dd24c865d3835e1a53913b3c882fe2b | đạt |
| 13 | Hai chữ ký trên hợp đồng = 2 | đạt |
| 14 | Hạn cọc hàng tươi 12 giờ = 12 | đạt |
| 15 | VietQR tổng chuyển = 13938000 | đạt |
| 16 | Nội dung chuyển = AGV HD3001 COC | đạt |
| 17 | Webhook ngân hàng được áp | đạt |
| 18 | Đơn hiệu lực sau cọc = active | đạt |
| 19 | Liên lạc mở đầy đủ = full | đạt |
| 20 | Cọc đang giữ (sổ) = 13800000 | đạt |
| 21 | Phí đang giữ (sổ) = 138000 | đạt |
| 22 | Khoản trả thẳng đến hạn = due | đạt |
| 23 | Người bán nhận đủ trả thẳng = fully_received | đạt |
| 24 | Đợt sẵn sàng sau khi có xe = ready | đạt |
| 25 | Kết quả gửi: chờ người bán xác nhận = awaiting_seller | đạt |
| 26 | Giá trị nghiệm thu = 44350000 | đạt |
| 27 | Đợt đang vận chuyển sau chốt tại vườn = in_transit | đạt |
| 28 | Lô con trả lại 30 kg = 30000 | đạt |
| 29 | Lô con loại L2 = L2 | đạt |
| 30 | Sổ lượng đã giao 1.970 kg = 1970000 | đạt |
| 31 | Sổ lượng chuyển lô con 30 kg = 30000 | đạt |
| 32 | Hao hụt 20 kg = 20000 | đạt |
| 33 | Hao hụt trong mức cho phép | đạt |
| 34 | Đợt đã chốt = closed | đạt |
| 35 | Quyết toán V = 44350000 | đạt |
| 36 | Quyết toán N = 44350000 | đạt |
| 37 | Chi cọc người bán = 12150000 | đạt |
| 38 | Hoàn cọc bên mua = 1650000 | đạt |
| 39 | Đơn chờ quyết toán = awaiting_settlement | đạt |
| 40 | Đơn hoàn tất = completed | đạt |
| 41 | Người bán thực nhận (sổ cái) = 44350000 | đạt |
| 42 | Có BBNT và BQT | đạt |
| 43 | Phí không hoàn khi hoàn tất = Không hoàn | đạt |
