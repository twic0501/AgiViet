# Luồng giao dịch

## Vai trò

| Vai | Làm gì | Không được làm |
|---|---|---|
| **Người bán** (nhà vườn, ao nuôi, hợp tác xã) | Đăng lô, sửa lượng, trả lời lời mời kết nối, xác nhận hoặc từ chối đơn, xác nhận số cân, xác nhận tiền | Tạo đơn, đặt cọc, nhập số cân, thao tác lô và đơn của người bán khác |
| **Bên mua** (nhà máy, doanh nghiệp, vựa) | Gửi lời mời kết nối, tạo đơn, rút đơn, đặt cọc, nhập số cân, trả tiền, gửi chứng từ | Đăng lô, xác nhận thay người bán, thao tác đơn của bên mua khác |
| **Hệ thống** (ngân hàng đối tác, đồng hồ) | Đóng đơn quá hạn cọc, chuyển tiền từ tài khoản đảm bảo cho người bán | Mọi bước của người dùng |

Mỗi lệnh đều kiểm **vai** và **chủ sở hữu** (đúng người bán của lô, đúng bên mua của đơn).

## Sáu chặng của một giao dịch

```
Kết nối → Đơn → Cọc → Giao và cân → Chốt → Tiền về
```

| Chặng | Người bán | Bên mua | Kết quả |
|---|---|---|---|
| 1. Kết nối | Đồng ý hoặc từ chối lời mời | Thấy lô (tên, vùng, uy tín; không có số điện thoại), gửi lời mời | Được nhắn tin và tạo đơn với lô này |
| 2. Đơn | Xác nhận (lượng bị giữ) hoặc từ chối | Tạo đơn: lượng ≤ còn bán được, giá > 0; rút được trước khi người bán xác nhận | Đơn chờ cọc, tính sẵn cọc và phí |
| 3. Cọc | Chờ | Đặt cọc + trả phí trong 48 giờ | **Mở liên lạc hai bên**; quá hạn thì đơn đóng, trả lượng |
| 4. Giao và cân | Giao hàng | Cân, nhập số nhận và không nhận | Số cân "tự khai" chờ người bán |
| 5. Chốt | Bấm Đúng (chốt) hoặc Không đúng (bên mua nhập lại) | Chờ | Tiền hàng = kg nhận × giá; còn phải trả = tiền hàng − cọc |
| 6. Tiền về | Xác nhận đã nhận (nếu trả trực tiếp) | Chuyển vào tài khoản đảm bảo, hoặc trả trực tiếp rồi ghi trả | Đơn đóng khi người bán nhận đủ |

Ở mỗi chặng, app cho mỗi bên biết **tới lượt ai**: *Bạn cần làm*, *Chờ bên kia*, *Có vấn đề*, *Đã xong*, *Đã kết thúc* ([nhận diện trạng thái](../03-giao-dien/nhan-dien-trang-thai.md)).

## Các nhánh rẽ

| Tình huống | Xử lý |
|---|---|
| Hai đơn cùng tranh một lô | Người bán xác nhận đơn nào trước thì đơn đó giữ lượng; đơn sau vượt lượng còn bán bị chặn khi xác nhận |
| Bấm hai lần, hai tab cùng bấm | Bước chỉ chạy được từ đúng trạng thái; lần sau bị từ chối, không ghi gì |
| Người bán đổi ý trước cọc | Hủy ngay, trả lượng, không ai mất gì |
| Một bên muốn hủy sau cọc | Xin hủy → bên kia đồng ý (cọc thuộc về bên không xin hủy) hoặc không đồng ý (đơn tiếp tục) |
| Quá 48 giờ chưa cọc | Hệ thống đóng đơn, trả lượng |
| Số cân sai | Người bán bấm Không đúng; bên mua nhập lại |
| Trả thiếu (trả trực tiếp) | Người bán không bấm "Đã nhận đủ" được; bấm "Nhận một phần", đơn quay về chờ trả phần còn lại |
| Chưa thấy tiền | Mở đối soát: bên mua gửi chứng từ, hai bên ghi chú; người bán thấy tiền thì đóng. App không kết luận bên nào sai |
| Tiền hàng nhỏ hơn cọc | Đơn đóng ngay khi chốt, cọc dư hoàn bên mua |

## Ngoài đơn

- **Lô hàng:** người bán đăng (tên, lượng, ước tính hay đã cân, giá hoặc nhận báo giá, ngày hái). Sửa lượng được, kể cả thấp hơn lượng đã hứa (mưa bão rụng trái): app cảnh báo, thỏa thuận cũ giữ nguyên.
- **Lượng còn bán được** = lượng lô − tổng lượng các đơn người bán đã xác nhận (trừ đơn đã hủy, quá hạn).
- **Lời mời kết nối:** mỗi bên mua một lời mời cho mỗi lô; trả lời một lần.

## Sẽ thêm ở các giai đoạn sau

Chào giá cạnh tranh (nhiều bên mua trả giá một lô), giá theo loại (A/B/C, cỡ, độ ngọt), hợp đồng bao tiêu cả mùa, giao nhiều đợt, điểm uy tín, lô gộp hợp tác xã, ứng tiền trước. Xem [kế hoạch](../04-ke-hoach.md).
