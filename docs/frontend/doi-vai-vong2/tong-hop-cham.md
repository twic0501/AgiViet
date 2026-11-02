# Đóng vai vòng 2 — tổng hợp chấm (02/11/2026)

Cả Claude và ChatGPT mỗi bên đóng **cả hai vai** (4 bộ, 31 kịch bản, 301 bước) trên backend thử 18981 với chính sách người sáng lập chốt 02/11: không trả sau, không trả trước khi chưa kiểm, không bao tiêu, chỉ nội địa. Đối tác ảo (bot) đóng phía bên kia. Bản chấm đầy đủ của ChatGPT: `chatgpt-cham.md`.

## Kết quả bước (ChatGPT đếm)
| Bộ | Đúng | Sai | Không rõ |
|---|---:|---:|---:|
| Claude bán | 44 | 1 | 4 |
| Claude mua | 51 | 2 | 17 |
| ChatGPT bán | 82 | 1 | 9 |
| ChatGPT mua | 77 | 0 | 13 |
| **Tổng** | **254** | **4** | **43** |

"Đúng" gồm cả chặn đúng (chính sách mới, lời chào tự đóng/quá hạn, thiếu ảnh/hồ sơ). "Không rõ" phần lớn là nhánh không chạy tới (thiếu tiền đề) — không phải lỗi app.

## Điểm 8 tiêu chí (thang 10)
| Tiêu chí | 02/11 | Chấm lại | ChatGPT nay | Claude nay | Lý do chính |
|---|---:|---:|---:|---:|---|
| Luồng chính | 6,5 | 7 | 7,5 | 7,5 | Đi tới trả tiền + giao; đơn 15 tấn nay đi nhiều xe (0081) nhưng nhật ký chạy trước khi sửa |
| Nhắn tin + chặn liên lạc | 6,5 | 7 | 7,5 | 7,5 | Che chữ/số/STK xen dấu, mở sau cọc đúng; chat app mua còn mẫu |
| Tiền + cọc | 6 | 6,5 | 6,5 | 7 | Hoàn hai chiều có; lỗi công thức app mua đã sửa sau khi chấm |
| Hỗ trợ + hướng dẫn | 7,5 | 7,5 | 8 | 8 | Hỗ trợ kèm đơn/bước, Nghe, cỡ chữ |
| Chống ép giá/lừa | 5,5 | 6 | 6 | 6,5 | Ngưỡng 20% đã làm SAU khi ChatGPT chấm; 70% và ảnh đúng dòng còn thiếu |
| Giao diện nông dân | 7,5 | 7,5 | 8 | 8 | Chữ quyết định 16px, giao diện theo bản mẫu |
| App mua | 4 | 6 | 7 | 7 | Trọn vòng giao dịch; vẫn bật bằng `?thu=`, khung tuần còn mẫu |
| Độ gọn, nhất quán | 6 | 6 | 6,5 | 6,5 | Còn trộn màn thật/mẫu ở app mua |

Claude chấm cao hơn ChatGPT ở hai mục vì tính cả các bản sửa làm sau khi ChatGPT chấm (ngưỡng 20%, công thức tiền).

## Lỗi thật tìm được và đã sửa trong vòng 2
1. **0080** — trigger sẵn sàng giao: biến `market` trùng cột → lỗi 500 khi nhu cầu đòi mã vùng trồng theo thị trường.
2. **0081** — một đợt chỉ một chuyến xe → đơn 15 tấn (người dùng phổ thông) kẹt; nay nhiều chuyến tới khi đủ lượng.
3. Mã sai dạng → 404 thay vì 500.
4. Câu báo lời chào đã đóng/đang chờ bên kia rõ lý do.
5. **Ngưỡng 20%**: quá 20% xuống loại + trả lại thì không chốt nếu người bán chưa chấp nhận riêng (backend + app bán).
6. Đặt trước khi hái cũng không được trả sau (lỗ do ChatGPT tìm).
7. App mua hiện sai bên đang nợ ở ca hoàn (ChatGPT tìm) → lấy thẳng t_bm/t_nb từ quyết toán.

## Còn lại (theo thứ tự ChatGPT đề xuất)
1. **Ngưỡng 70%** giá hạ cấp: xác nhận riêng gắn phiên bản hợp đồng (backend chưa ràng buộc).
2. **Ảnh chứng cứ nghiệm thu bị thay bằng ID biên bản PDF** (giao-nhan.ts + 0046) — người bán thấy "có ảnh" nhưng không mở được ảnh thật.
3. Hồ sơ đúng nguồn–cơ sở–lô.
4. App mua chạy thật từ phiên đăng nhập (bỏ phụ thuộc `?thu=`), nối chat cùng đơn.
5. Hợp đồng khung theo tuần (ưu tiên của người sáng lập) bằng dữ liệu thật.
6. UI danh sách xe/lượng còn thiếu cho đơn lớn; hủy một chuyến phải mất trạng thái sẵn sàng.
7. Bộ thử phải chứng minh kết thúc (tiền/lượng đối soát), không chỉ HTTP 200; có ca không có bot người bán.
