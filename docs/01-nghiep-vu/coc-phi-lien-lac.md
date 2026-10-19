# Cọc, phí, thanh toán đảm bảo, liên lạc

## Vì sao có cọc và ẩn liên lạc

Một sàn kết nối mất doanh thu khi hai bên tìm thấy nhau rồi giao dịch ngoài app. AgiViet không giấu danh tính (người dùng cần tin nhau) mà **giấu liên lạc tới khi bên mua đặt cọc**, và **thu phí ngay lúc đặt cọc**. Sau đó, lý do để ở lại app là quyền lợi thật: tiền đảm bảo, đối soát, uy tín, bảng kê, phí mối quen thấp.

Các nền tảng đã dùng cách tương tự: Airbnb (ẩn liên lạc tới khi xác nhận đặt chỗ), Upwork (điều khoản không đi vòng 24 tháng), Alibaba Trade Assurance (chỉ bảo vệ đơn trả qua sàn).

## Cọc và phí

Tính khi người bán xác nhận đơn, thu khi bên mua đặt cọc:

| Mục | Cách tính (mô phỏng) |
|---|---|
| Giá trị đơn | lượng × giá thỏa thuận |
| Cọc | 10% giá trị đơn, làm tròn tới nghìn đồng |
| Phí giới thiệu | 1% giá trị đơn, áp cho đơn đầu tiên giữa bên mua và người bán này |
| Phí mối quen | 0,3%, từ đơn thứ hai (đã có đơn đặt cọc trước đó với cùng người bán) |
| Sàn, trần phí | 50.000 đ, 3.000.000 đ |
| Hạn cọc | 48 giờ kể từ khi người bán xác nhận |

Ví dụ: 4.000 kg × 25.000 đ = 100 triệu → cọc 10 triệu, phí giới thiệu 1 triệu. Nhận 3.800 kg → tiền hàng 95 triệu, còn phải trả 85 triệu.

Mức chính thức nằm trong `ChinhSach` (`packages/nghiep-vu/src/chinh-sach.ts`), sau này do trang vận hành cấu hình.

## Thanh toán đảm bảo

- Cọc và tiền hàng chuyển vào **tài khoản đảm bảo ở ngân hàng đối tác**. App không tự giữ tiền (giữ tiền hộ cần giấy phép trung gian thanh toán; cần luật sư xác nhận mô hình trước khi chạy thật).
- Chuyển vào tài khoản đảm bảo phải **đúng số còn phải trả**. Ngân hàng chuyển cho người bán cả cọc và phần còn lại; đơn đóng.
- Bên mua vẫn được **trả trực tiếp** phần còn lại; khi đó người bán xác nhận đã nhận, trả thiếu thì chỉ "nhận một phần".

## Liên lạc

| Thông tin | Trước khi cọc | Sau khi cọc |
|---|---|---|
| Tên người bán / tổ chức mua | Thấy | Thấy |
| Vùng (huyện, tỉnh), đã xác minh, uy tín | Thấy | Thấy |
| Số điện thoại, Zalo | Ẩn | Thấy |
| Địa chỉ chính xác (vườn, kho nhận) | Ẩn (hẹn xem vườn chỉ thấy tới ấp) | Thấy |

Trong tin nhắn, số điện thoại và đường dẫn ngoài bị che kèm lời nhắc (giai đoạn 1). Phát hiện cách viết lách ("zép lào", số viết bằng chữ) bằng AI ở trang vận hành (giai đoạn 3). Không khóa tài khoản nông dân vì lách; chỉ nhắc.

Tầng nghiệp vụ chỉ quyết định **có mở hay không** (`lienLacDaMo`); số điện thoại, địa chỉ nằm ở hồ sơ người dùng (tầng dữ liệu) và chỉ được tầng dịch vụ đưa ra khi đã mở.
