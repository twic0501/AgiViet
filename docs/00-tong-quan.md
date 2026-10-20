# Tổng quan sản phẩm

## Định vị

**AgiViet là sổ làm ăn có chợ ở giữa.**

- **Nhà vườn, ao nuôi, hợp tác xã** dùng app như sổ tay làm vườn: ghi nhật ký canh tác, thu chi bằng giọng nói, biết lời lỗ từng vụ. Tới mùa, bấm một nút để đăng bán lô hàng đã có sẵn ảnh, sản lượng ước và hồ sơ nguồn gốc.
- **Doanh nghiệp thu mua** (nhà máy chế biến, doanh nghiệp xuất khẩu, vựa lớn) dùng app như bàn làm việc: tìm nguồn, đặt cọc, nghiệm thu, trả tiền, nhập kho, lập bảng kê thuế, truy xuất nguồn gốc.
- **Chợ** ở giữa nối hai bên: *Tìm đúng mối, chốt đúng giá*.

Phần quản lý giải bài toán khởi đầu của mọi sàn (chưa có người bán thì người mua không vào và ngược lại): người dùng có lý do mở app hằng ngày ngay cả khi chưa có ai để mua bán, và app có dữ liệu thật về sản lượng, mùa vụ, giá.

## Người dùng

| Vai | Ai | Thiết bị | Điều quan trọng nhất |
|---|---|---|---|
| Nhà sản xuất | Nhà vườn 40–65 tuổi ở Đồng bằng sông Cửu Long, ít gõ chữ, mắt kém dần, dùng điện thoại tầm trung ngoài nắng | Điện thoại | Bán được giá, tiền về chắc chắn |
| Thu mua | Nhân viên thu mua của doanh nghiệp, dùng máy tính cả ngày | Máy tính | Nguồn đúng loại, đúng ngày, giấy tờ đủ |
| Vận hành (giai đoạn 3) | Đội AgiViet | Máy tính | Duyệt xác minh, xử lý tranh chấp, theo dõi tiền |

## Nguyên tắc giao dịch đã chốt

1. **Hiện danh tính, ẩn liên lạc.** Lúc tìm hàng và thương lượng, hai bên thấy tên, vùng, đã xác minh, điểm uy tín; số điện thoại, Zalo, địa chỉ chính xác chỉ mở sau khi bên mua **đặt cọc**. Lý do: tránh bị hai bên "đi đường vòng" ngay từ lần đầu, mà không làm mất lòng tin (cách Airbnb, Upwork đang làm).
2. **Thanh toán đảm bảo.** Cọc và tiền hàng đi qua tài khoản đảm bảo ở ngân hàng đối tác (app không tự giữ tiền). Cân xong, hai bên xác nhận thì tiền tự về người bán. Vẫn cho phép trả trực tiếp phần còn lại, người bán xác nhận đã nhận.
3. **Mọi bước đi qua bảng luật.** Ai được làm gì, ở bước nào, với điều kiện gì nằm trong một bảng duy nhất ([01-nghiep-vu/bang-luat-don.md](01-nghiep-vu/bang-luat-don.md)). Giao diện không tự quyết.
4. **AI gợi ý, người xác nhận.** Con số liên quan tới tiền luôn cần người bấm xác nhận.

## Cách thu tiền

| Nguồn | Khi nào thu | Ghi chú |
|---|---|---|
| Phí giới thiệu | Lúc bên mua đặt cọc đơn đầu tiên với một người bán | 1% giá trị đơn, sàn 50.000 đ, trần 3 triệu (mức mô phỏng) |
| Phí mối quen | Lúc đặt cọc các đơn sau với cùng người bán | 0,3%, cùng sàn và trần |
| Gói Business | Hằng tháng, bên mua | Bán bằng công cụ doanh nghiệp cần: công nợ, kho, bảng kê 01/TNDN, nhiều tài khoản |
| Hoa hồng dịch vụ đối tác | Theo từng dịch vụ | Kiểm định, vận chuyển, bảo hiểm, ứng tiền trước cho người bán |

Người bán dùng miễn phí. Mức phí chính thức do trang vận hành cấu hình (`ChinhSach` trong tầng nghiệp vụ).

## Phạm vi mặt hàng

Hàng **thô, bán theo lô cho doanh nghiệp**: trái cây, lúa gạo, hạt, củ, cây công nghiệp (cà phê, tiêu, điều, cao su), rau củ, nấm, thủy sản nuôi, hải sản đánh bắt. Không bán: gia súc, gia cầm sống và thịt (kiểm dịch, dịch bệnh), động vật hoang dã, hàng đã chế biến bán lẻ, gỗ và lâm sản. Chi tiết: [01-nghiep-vu/mat-hang.md](01-nghiep-vu/mat-hang.md).

## Các sản phẩm trong kho này

- **App Nhà sản xuất** (`apps/app-ban`) và **app Thu mua** (`apps/app-mua`, giai đoạn 2): hai app riêng, chạy luồng giao dịch thật trên máy chủ mô phỏng chung (`packages/may-chu`) nằm trong trình duyệt. Dùng để thiết kế, thử với người dùng, trình bày; giai đoạn 4 thay máy chủ mô phỏng bằng máy chủ thật.
- **Trang giới thiệu** (`apps/web-gioi-thieu`): trang thương mại giới thiệu sản phẩm, dẫn người xem sang app. Không đọc dữ liệu của app.

Các sản phẩm dùng chung nhận diện thương hiệu nhưng không dùng chung mã nguồn giao diện hay dữ liệu.
