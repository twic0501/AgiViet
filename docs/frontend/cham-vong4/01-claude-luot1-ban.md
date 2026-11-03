# Lượt 1 — Claude nhập vai NGƯỜI BÁN (chị Năm, HTX Tân Thuận) — chấm A + C

Chấm theo `00-boi-canh-va-tieu-chi.md`. "Làm được" dựa trên kịch bản E2E chạy thật (`backend/scripts/kiem-cho-ai.mjs`: 2 đơn hoàn tất trong 10 vòng), không chỉ nhìn ảnh.

## Nhật ký nhập vai (ngắn)
- B00: "Bấm Đăng nhập là thấy 10 người, mỗi người một dòng tính cách. Tôi chọn chị Năm là vào ngay." 
- B01: "Trang chủ có giá hôm nay 23.550 đ/kg, 4 giao dịch — biết chừng giá. Nhưng tôi vừa xong 2 hợp đồng mà đầu trang ghi 'Chưa có hợp đồng nào'" → **đã sửa** (d35eaff): 'Đã xong 2 hợp đồng, chưa có việc mới'.
- B14: "Có bên mua chào giá là app báo ngay trên đầu, bấm Xem. Danh sách ghi rõ việc tới lượt tôi: giao hàng, quét QR."
- B06: "Hợp đồng xong ghi rõ: tiền hàng 7,75 triệu = 5,425 triệu bên mua trả thẳng + 2,325 triệu ngân hàng chuyển cọc; 'Tiền đã về, đã đối soát'. Tôi tin số này."
- B07: "Đã nhận tháng này 20 triệu = 14 + 6; từng đơn cộng lại đúng; cọc 0 vì đã xử lý xong."
- Bàn giao: "Ô mã 6 số có dòng 'Môi trường thử · mã người nhận' — hiểu đây là bản thi."

## A. App bán (7 mục / 70)
| Mục | Điểm | Căn cứ |
|---|---:|---|
| Luồng chính | 8 | E2E trọn: chào giá → ký OTP → cọc → xe → giao bằng mã người nhận → nghiệm thu → xác nhận tiền → đối soát → hoàn tất (kiem-cho-ai.mjs, 2 đơn). Trừ: ngoại lệ (giao thiếu, hạ cấp, tranh chấp) chưa có kịch bản AI. |
| Nhắn tin + chặn liên lạc | 7 | Tin nhắn hai chiều thật (E37/E99); backend che liên lạc trước cọc. AI trả lời theo từ khóa, câu còn đơn điệu. |
| Tiền + cọc | 8 | B06/B07 số khớp quyết toán; tách trả thẳng / ngân hàng / chờ xác nhận. Đường hoàn tiền thừa chưa được chạy trong E2E (tiền thừa = 0). |
| Hỗ trợ + hướng dẫn | 8 | Tour + Nghe + cỡ chữ + trợ lý (như vòng 3); nút Nghe đã bỏ emoji (E101). |
| Chống ép giá/lừa | 7 | Giá sàn kín tự từ chối, xác nhận riêng dưới 70%, giá tham khảo 4 giao dịch hiện ngay trang chủ. |
| Giao diện nông dân | 8 | Soát 360/390: 0 tràn, 0 gãy nút, chữ ≥12px (E101); trâu Rive động 25 dáng (E100). |
| Độ gọn, nhất quán | 7 | Sửa lỗi đầu trang khi đã xong đơn; còn: tổ chức không ai cầm thì AI làm thay (HTX tự có đơn khi người xem là chị Năm) — đúng thiết kế nhưng cần nói rõ khi trình diễn. |
| **Tổng A** | **53/70** | |

## C. Tiêu chí buổi thi (5 / 50)
| Mục | Điểm | Căn cứ |
|---|---:|---|
| D1 Vào vai nhanh | 8 | 2 chạm (Đăng nhập → người mẫu), đầu trang ghi tên tổ chức (B00, B01). |
| D2 Chợ sống | 6 | Bên mua ảo chào theo giá tham khảo, phản hồi ~8 s, báo chỉ việc của mình (E102). **Trừ:** thẻ người mẫu ghi tính cách nhưng AI chưa dùng tính cách (ai cũng trả giá 3% một lần rồi đồng ý) → hứa hơn làm. |
| D3 Trọn luồng không kẹt | 8 | Hai chiều đều hoàn tất (E105, E106) sau khi sửa 6 chỗ kẹt (mã người nhận, cửa sổ giao, nơi đến, ngân hàng, đối soát). Ngoại lệ chưa có. |
| D4 Tiền qua ngân hàng minh bạch | 8 | Ngân hàng giả lập chi cọc, nhân viên AI đối soát, app hiện 'Tiền đã về, đã đối soát'; app mua hiện 'Ngân hàng đã hoàn'. Chưa chứng minh ca có tiền thừa. |
| D5 Phạm vi sạch | 7 | 'Đang phát triển' chạy cả hai app (E98); 0 mã nội bộ trong màn hợp đồng/tiền. Trừ: lời hứa tính cách ở D2; app mua còn mở vài màn sâu ở `mua.html` cũ. |
| **Tổng C** | **37/50** | |

## Việc nên sửa trước buổi thi (theo thứ tự)
1. AI hành xử theo tính cách người mẫu (giữ giá, trả giá 2 lần, chốt nhanh…) hoặc bỏ dòng tính cách khỏi thẻ.
2. Một kịch bản ngoại lệ tối thiểu do AI tạo: giao thiếu hoặc hạ cấp có ảnh → hai bên thấy cách xử lý tiền.
3. Một ca có tiền thừa trong cọc để show 'ngân hàng tự hoàn'.
