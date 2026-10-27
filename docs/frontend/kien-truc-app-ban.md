# Kiến trúc thông tin app bán (v4, 27/10/2026)

## Nhận xét thẳng về các bản trước
1. Ghép tính năng vào màn mà không có kiến trúc: lưới "lối tắt" trộn việc bán (Bán gấp, Bên mua cần, Đặt trước, Bao tiêu), việc vườn (Nhật ký, Thời tiết) và việc tài khoản (Hỗ trợ, Cài app). Người dùng không đoán được thứ gì ở đâu.
2. Trùng với thanh dưới (Đăng, Tiền) và lặp nội dung (7 thẻ lời chào giống hệt).
3. Đặt trước khi hái, bao tiêu là **cách bán**, không phải tiện ích.
4. Chưa kiểm luồng đầu cuối trên giao diện mới: sửa từng màn rời, chỗ nối giữa các màn không được bảo đảm.
5. Dữ liệu thử là rác từ kiểm thử tự động (hàng chục đơn, lô 0 kg), làm mọi màn trông sai.

## Cấu trúc (theo mẫu app người bán quốc tế: Trang chủ · Sản phẩm · Đơn · Tài chính · Tôi)
| Chỗ | Nội dung | Không đặt ở đây |
|---|---|---|
| **Hôm nay** | Thẻ tiền; "Cần làm" (≤3, gấp trước); thẻ **Vườn** (thời tiết hôm nay + cảnh báo, nhật ký, lô sắp có hàng); một gợi ý bên mua đang cần | Lưới tiện ích |
| **Bán hàng** | 3 tab: Hàng của tôi · Lời chào (số chờ) · Bên mua cần; mục "Bán trước mùa" (đặt trước, bao tiêu); mỗi lô có thao tác Bán gấp, Đóng lô | Đơn hàng, tiền |
| **+ Đăng** | Đăng hàng (mặt hàng lấy từ hồ sơ đã xác minh) | |
| **Đơn hàng** | Danh sách theo nhóm; chi tiết đơn: dải bước, ô "Bây giờ", số chính, điều khoản, Chi tiết, Gặp vấn đề? | |
| **Tiền** | Ba con số; tiền ngân hàng giữ theo đơn | |
| **Ảnh đại diện** | Thông báo, tổ chức và người giúp, lịch sử, gọi nhân viên, hướng dẫn, cài app, đăng xuất | |

## Nguyên tắc
- Mỗi màn trả lời một câu hỏi của người bán; tối đa 1 nút xanh chính.
- Danh sách ≤ 5 dòng mỗi nhóm, phần còn lại "Xem thêm"; nhóm đã xong thu gọn.
- Không giải thích dài; luật để sau "Vì sao?".
- Không mặc định người dùng ít đọc chữ: câu ngắn, rõ, nhưng đủ thông tin.
- Hướng dẫn: kiểu rọi đèn, một lần mỗi màn, gọi lại bằng nút "?".

## Còn phải làm
1. Nội dung màn con của đơn (hợp đồng + ký OTP, cọc, giao nhận + QR + nghiệm thu, xác nhận tiền) theo thiết kế.
2. Chi tiết lô: thao tác Bán gấp, Đóng lô; sổ lượng chỉ hiện dòng khác 0.
3. Bán trước mùa (đặt trước, bao tiêu), nhật ký vườn: chờ CSDL Codex.
4. Kiểm luồng đầu cuối trên giao diện mới: chào giá → đồng ý → ký → cọc → giao → xác nhận tiền → xong (Playwright, sau khi dọn dữ liệu sạch).
