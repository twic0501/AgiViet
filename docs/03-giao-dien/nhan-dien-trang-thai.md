# Nhận diện trạng thái

Người dùng cần biết ngay: **tới lượt ai?** Mọi đơn được xếp vào một trong năm nhóm, tính riêng cho người đang xem (hàm `nhom()` trong tầng nghiệp vụ).

| Nhóm | Mã | Khi nào | Màu | Hình dấu |
|---|---|---|---|---|
| Bạn cần làm | `lam` | Người xem có bước chính làm được ngay | Mật ong | Hình thoi đặc |
| Có vấn đề | `loi` | Đang đối soát tiền; quá hạn cọc chưa đóng | Gạch nung | Tam giác |
| Chờ bên kia | `cho` | Người xem đã làm xong phần mình | Sông trầm | Vòng tròn rỗng |
| Đã xong | `xong` | Người bán đã nhận đủ tiền | Rêu đồng | Chấm tròn đặc |
| Đã kết thúc | `het` | Hủy, từ chối, quá hạn | Xám | Gạch ngang |

Việc phụ (rút đơn, hủy, gửi chứng từ, ghi đối soát) không làm đơn thành "Bạn cần làm".

## Quy tắc bốn tín hiệu

Mỗi trạng thái hiện cùng lúc bằng **màu + hình dấu + chữ + vị trí** (nhãn luôn ở đầu thẻ). Người mù màu và người xem ngoài nắng vẫn đọc được nhờ hình dấu và chữ.

## Thanh chặng

Sáu chặng: Kết nối · Đơn · Cọc · Giao và cân · Chốt · Tiền về. Chặng đã qua tô rêu đồng, chặng đang ở tô mật ong và in đậm, chặng chưa tới để xám. Đơn đã kết thúc giữ chặng lúc dừng, tô xám. Thành phần: `ThanhChang` trong `giao-dien/thanh-phan`.

## Danh sách mã trạng thái

Xem [bảng luật đơn](../01-nghiep-vu/bang-luat-don.md). Tên mã trạng thái cũng là tên input trong file Rive khi có animation.
