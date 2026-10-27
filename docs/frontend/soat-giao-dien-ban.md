# Soát giao diện app bán · vòng 1 (27/10/2026, Claude)

So với bản thiết kế `Documents/AgiViet/thiet-ke-lai/index.html` ("Sổ làm ăn"). Chụp 23 màn ở 390×844 qua https://agiviet.id.vn/ban/, tài khoản chị Năm. Ảnh: `~/.claude/jobs/d88082d5/tmp/soat/`.
Mức: **N** = nặng (sai mục đích màn, người dùng lạc), **V** = vừa (rối, khó hiểu), **N2** = nhẹ (thẩm mỹ, chữ).

## Lỗi chung
| # | Mức | Lỗi | Sửa |
|---|---|---|---|
| C1 | N | Danh sách không giới hạn, mỗi mục một thẻ to: Lời chào 12.500px, Hàng 12.000px, Đơn hàng 9.000px | Dòng gọn (ảnh nhỏ, tên hàng, số chính, chip trạng thái), nhóm "Cần làm / Đang chạy / Đã xong", mỗi nhóm hiện vài dòng + "Xem thêm" |
| C2 | N | Chi tiết đơn còn kiểu cũ: 9 tab (Thỏa thuận, Cọc, Trả thẳng, Giao nhận, Quyết toán, Giấy tờ, Hủy, Tranh chấp, Sửa/phụ lục) cùng lúc | Một màn đơn theo dải 5 bước; chỉ hiện việc của chặng hiện tại; các mục khác vào "Thêm" |
| C3 | V | Chữ kỹ thuật lọt ra người dùng: "khoản HD-3021-BEFORE", "Trả thẳng", "Quyết toán", "Sổ lượng", "Mức xác minh tổ chức 2", "DT", "lô L-0525" | Lời thường: "tiền trước khi bốc hàng", "tiền bên mua trả thẳng cho mình", "tính tiền cuối", tên tỉnh đầy đủ, mã lô để nhỏ |
| C4 | V | Câu lỗi kiểu lập trình viên: "Chưa tới lượt bạn ký, hoặc vai của bạn không có quyền ký" | Nói rõ đang chờ ai: "Đang chờ bên mua chuyển cọc. Chị chưa cần làm gì." |
| C5 | N2 | Ngày giờ "13:18 27/10/2026" | "13 giờ 18, thứ Ba 27/10" |

## Từng màn
| Màn | Mức | Lỗi | Sửa |
|---|---|---|---|
| Trang chủ | N | 7 thẻ "Trả lời lời chào giá" giống hệt nhau, dài | Gom thành một thẻ "7 lời chào đang chờ" với 3 dòng gọn theo hạn gần nhất + "Xem tất cả" |
| Trang chủ | V | Tiêu đề thẻ việc là tên việc chung chung, không phải hàng | Tiêu đề = hàng + lượng; dòng phụ = ai chào, giá, tổng |
| Trang chủ | V | 11 lối tắt, 3 hàng | 8 lối tắt (2 hàng), phần còn lại vào "Thêm" |
| Trang chủ | N2 | "Đang chờ bên kia" ghi "Chờ cọc · Chuyển cọc" lặp | "Đồng Xanh chưa chuyển cọc" |
| Lời chào (chi tiết) | N2 | "Bên mua đã được AgiViet xác minh" nhưng không có tên bên mua; mã "lô L-0525" | Ghi loại bên mua ("Nhà máy chế biến, đã xác minh"); mã lô nhỏ cuối |
| Đăng hàng | N2 | "Loại L2 (hàng dạt)" sai nghĩa: L2 là hàng loại dưới, không phải hàng dạt | "Loại L2 · hàng loại dưới" |
| Hàng của tôi | N | Như C1 | Dòng gọn theo nhóm Đang bán / Sắp có / Đã đóng |
| Chi tiết lô | V | "Sổ lượng" 8 dòng toàn 0 kg; "Mức xác minh tổ chức 2"; "DT" | Chỉ hiện dòng khác 0; "Còn bán được 4.000 kg"; hồ sơ nguồn bằng lời |
| Đơn hàng | N | Như C1 | Dòng gọn theo nhóm Cần mình làm / Đang chờ bên mua / Xong |
| Chi tiết đơn, Hợp đồng, Cọc, Giao nhận, Tiền đơn | N | Như C2, C3, C4; "Phí bên mua 0 đ" không liên quan người bán | Làm lại theo thiết kế mục 3–4 |
| Xác nhận tiền | V | Đúng ý nhưng còn kiểu cũ; thiếu cảnh báo lừa đảo đỏ nhạt và số đọc thành chữ to | Làm lại theo thiết kế mục 4 |
| Bên mua đang cần | V | Hiện cả tôm, lúa, sầu riêng dù chị Năm không bán | Mặt hàng của mình lên trước, mặt hàng khác thu gọn |
| Thông báo | V | Nhiều dòng y hệt "Tổ chức có cập nhật mới" | Gom trùng; nói việc gì, đơn nào |
| Tổ chức | V | Mời thành viên cho chọn cả vai bên mua (Mua hàng, Kế toán, Kho) cho hộ bán | Chỉ vai hợp với người bán: người giúp, thành viên HTX, thu gom |

## Thứ tự sửa
1. C1 danh sách + trang chủ gom việc + lối tắt 8.
2. C2–C5 chi tiết đơn (hợp đồng, cọc, giao nhận, xác nhận tiền) theo thiết kế.
3. Chi tiết lô, bên mua cần, thông báo, tổ chức.
4. Chụp lại toàn bộ, soát vòng 2, ghi kết quả vào tệp này.
