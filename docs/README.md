# Tài liệu AgiViet

Tài liệu chia theo câu hỏi người đọc cần trả lời. Mỗi tài liệu có một chủ đề; khi code đổi thì sửa tài liệu trong cùng commit.

| Tài liệu | Trả lời câu hỏi | Ai đọc |
|---|---|---|
| [00-tong-quan.md](00-tong-quan.md) | Sản phẩm là gì, cho ai, thu tiền thế nào, làm gì và không làm gì | Mọi người |
| [01-nghiep-vu/](01-nghiep-vu/) | Giao dịch đi qua những bước nào, ai được làm gì, tiền và liên lạc xử lý ra sao | Sản phẩm, lập trình, kiểm thử |
| [02-kien-truc/](02-kien-truc/) | Code chia tầng thế nào, thư mục nào làm gì, vì sao chọn công nghệ này | Lập trình |
| [03-giao-dien/](03-giao-dien/) | Có những màn nào, bố cục ra sao, trạng thái hiện thế nào | Thiết kế, lập trình |
| [04-ke-hoach.md](04-ke-hoach.md) | Làm theo giai đoạn nào, xong giai đoạn khi nào | Mọi người |
| [05-kiem-thu.md](05-kiem-thu.md) | Test những gì, chạy thế nào, ca kiểm thử nào bắt buộc | Lập trình, kiểm thử |
| [06-quy-uoc.md](06-quy-uoc.md) | Đặt tên, nhánh, commit, viết chữ trong app thế nào | Lập trình, nội dung |

## Nguồn sự thật

Một số tài liệu sinh ra từ code để không lệch nhau:

- Bảng trạng thái và bảng luật đơn: [01-nghiep-vu/bang-luat-don.md](01-nghiep-vu/bang-luat-don.md), sinh từ `packages/nghiep-vu` bằng `npm run tai-lieu`.
- Danh mục màn: [03-giao-dien/danh-muc-man.md](03-giao-dien/danh-muc-man.md), sinh từ `apps/app-mo-phong/src/phan-he/danh-muc-man.ts` cùng lệnh.

Đừng sửa tay hai tệp trên; sửa code rồi chạy lại lệnh.
