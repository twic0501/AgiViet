# 00. Nguyên tắc cơ sở dữ liệu AgiViet v2

Đích triển khai là PostgreSQL 17. Nguồn nghiệp vụ là `docs/nghiep-vu/00–10` và `du-lieu-ao.json`. Tại lần thực hiện này có tài liệu 09, chưa có 11 và 12. Các đường dẫn trong bộ tài liệu này tính từ gốc repository.

Đây là lược đồ và bộ kiểm chứng database cho hệ thống thử có người dùng, ngân hàng, OTP và ký số mô phỏng. Nó chưa phải một backend đã triển khai, cũng chưa chứng minh đủ điều kiện giao dịch tiền thật. Kết quả và phần còn thiếu nằm ở [07-danh-gia-thanh-that.md](07-danh-gia-thanh-that.md).

## Quyết định nền tảng

1. Tiền là `bigint` đồng VND, lượng là `bigint` gam; giá là đồng/kg. Không dùng số thực cho hai loại này. `numeric` chỉ làm số trung gian khi nhân, chia và tổng để không tràn `bigint`; kết quả lưu nguyên. GPS dùng `double precision`, nhiệt độ dùng số nguyên phần mười độ C.
2. Mỗi dòng tiền xác nhận có một giao dịch sổ cái với ít nhất hai bút toán, tổng bằng 0. Số dư gốc suy ra từ `ledger.entries`; `account_balances` là bộ đệm có đối chiếu. Ngân hàng đối tác giữ cọc; không có ví tiền chung của AgiViet.
3. Sổ lượng chuyển giữa các ngăn; không trừ lần nữa khi kết thúc đơn. Giữ tạm khóa theo `hold_id` vì lúc đồng ý giá chưa có đơn; cam kết và giao khóa theo `order_id`.
4. Bút toán, chuyển lượng, phiên bản điều khoản, chữ ký, lịch sử và chứng cứ không sửa/xóa. Tiền sai dùng giao dịch đảo đúng các tài khoản, đổi dấu; nội dung sai dùng phiên bản mới có liên kết bản trước.
5. Mọi bảng có vòng đời dùng danh mục trạng thái, bảng chuyển hợp lệ và trigger ghi lịch sử. Một cạnh hợp lệ vẫn có thể bị điều kiện tiền, lượng, chữ ký hoặc giao nhận chặn.
6. Trạng thái và sự kiện/outbox ghi cùng transaction. Bên trả báo chuyển tiền không đồng nghĩa bên nhận đã nhận. Hết hạn không tự cộng tiền.
7. Khóa ngoại không đủ thay cho kiểm tra tổ chức. Các điểm chốt ký, tiền, tài khoản nhận và nghiệm thu kiểm thêm quan hệ giữa các bảng.
8. Tách `pii`; không cấp đọc thẳng cho vai ứng dụng. Giá kín tách bảng, RLS theo tổ chức; tìm nguồn dùng hàm trả danh sách cột cố định.
9. Ghi tiền, lượng và thay đổi trạng thái là thao tác trực tuyến có transaction, khóa và idempotency. Không gọi mạng trong transaction đang giữ khóa.
10. Chủ schema là ranh giới tin cậy có thể thay trigger/quyền; không dùng làm tài khoản web. RLS đọc đã có, bộ API ghi quyền hạn hẹp còn phải xây trước triển khai.

## Tổ chức schema

| Schema | Trách nhiệm |
|---|---|
| `ref` | Danh mục, trạng thái, chuyển hợp lệ, vai, gói, SLA, hàm số học |
| `core` | Tổ chức, nguồn hàng, nhu cầu, hợp đồng, tiền nghiệp vụ, giao nhận, QR |
| `ledger` | Giao dịch, bút toán, số dư tiền và sổ lượng |
| `pii` | Liên hệ, giấy tờ định danh, tài khoản ngân hàng |
| `evt` | Lịch sử, event log, outbox, idempotency, webhook, kiểm toán |
| `ops` | Nhân viên, việc, quyết định hai người, cuộc gọi, giờ công, cờ bất thường, nguồn seed |
| `mkt` | Quan sát giá, materialized view tham khảo và bộ đệm kết quả ghép |

UUID định danh nội bộ sinh bằng `gen_random_uuid()`; seed dùng UUID ổn định. Mã hiển thị có UNIQUE riêng. Bảng/cột dùng tiếng Anh `snake_case`, COMMENT tiếng Việt. Mốc thời gian là `timestamptz`; ngày lịch dùng `date`; khoảng thường dùng `[)`. Đầu vào khoảng ngày kết thúc bao gồm ngày đó được chuyển thành cận trên ngày kế tiếp.

## Giữ lại và sửa phần cũ

Giữ migrations 0001–0008 và 0010 làm nền. Bổ sung 0009 còn thiếu cùng 0011–0029 để củng cố và mở rộng. Trong 0009 mới đã sửa lỗi qua chạy engine. Không xóa rồi dựng một bộ bảng khác. Nếu DB nào đã áp bản nháp với checksum khác thì không ép ghi đè; dùng DB thử mới hoặc viết migration chuyển đổi riêng sau kiểm kê.

Lỗi sổ lượng cũ đã sửa: không chèn số dư âm rồi trông chờ `ON CONFLICT`, vì CHECK có thể chặn trước xung đột. Khóa dòng lô, UPDATE ngăn nguồn, sau đó ghi ngăn đích trong một transaction.

## Giả định và giới hạn có chủ ý

- Mọi mặt hàng v2 lưu gam, kể cả tôm/cá định cỡ theo con/kg. Bỏ lựa chọn `piece` còn sót trong bản nháp bằng CHECK bổ sung.
- Mã tỉnh seed là mã thử, không mạo nhận danh mục hành chính chính thức. Không tự bịa tọa độ; vì vậy chưa thể chạy ghép khoảng cách đầy đủ trên seed.
- Các số uy tín và số đơn thống kê trong JSON được giữ trong snapshot, không sinh đơn hoặc tiền giả để đủ số thống kê. Có 15 đơn nền chi tiết; 14 đơn dùng tham khảo xoài.
- Khung có dư nợ đầu kỳ được ghi sổ quyền đòi; phần đã chốt sắp giao nhập riêng vì JSON không có đủ từng đơn con. Bao tiêu nhập thành kế hoạch và các đợt, chưa tự biến thành hợp đồng đã ký hay cọc vụ đã nhận.
- Token QR là token ngẫu nhiên 256 bit, DB giữ SHA-256. Lớp biểu diễn `AGV1`, HMAC, mã 6 số và VietQR thuộc backend; chưa có trong DB runner.
- Ngày giờ thử chỉ owner được đặt `app.test_time` cho `ref.clock_at()`. Đây chưa phải dịch vụ đồng hồ thử dùng chung giữa nhiều worker.
- Không diễn giải tài liệu này như kết luận pháp lý. Giữ nguyên ranh giới mô phỏng trong đặc tả, không mở rộng sang chính sách tiền thật.
