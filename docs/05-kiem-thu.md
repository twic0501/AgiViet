# Kiểm thử

```bash
npm run kiem-tra    # kiểm kiểu + mọi test (chạy trên GitHub mỗi lần đẩy code)
npm test -w @agiviet/nghiep-vu
npm test -w @agiviet/may-chu
npm test -w @agiviet/app-ban
npm test -w @agiviet/web-gioi-thieu
```

## Tầng nghiệp vụ (`packages/nghiep-vu/test`)

| Tệp | Ca kiểm thử |
|---|---|
| `luong-don.test.ts` | Luồng tài khoản đảm bảo trọn vẹn (cọc 10%, phí 1%, trừ cọc, chuyển đúng số, giải ngân một lần); luồng trả trực tiếp (trả thiếu không đóng được, nhận một phần, đối soát, chứng từ); bán lố, xác nhận hai lần; sai vai, sai chủ; chưa được đồng ý kết nối; hủy trước và sau cọc, ai giữ cọc; quá hạn cọc; phí sàn, phí mối quen, trần; tiền hàng nhỏ hơn cọc |
| `bat-bien.test.ts` | **Ma trận** 20 bước × 13 trạng thái × 3 vai = 780 trường hợp. **5.000 bước ngẫu nhiên** (hạt cố định) kiểm bất biến sau mỗi bước và phải đi qua đủ 13 trạng thái |
| `mo-rong.test.ts` | Kết nối, che liên lạc, báo giá, hẹn xem, đề nghị đổi đơn, vườn và cách ly, thu chi, lô gộp, dịch vụ, ứng tiền, hỗ trợ, uy tín |

Bất biến luôn đúng:

1. Lượng đã hứa của lô = tổng lượng các đơn đã xác nhận còn giữ hàng; không vượt lượng lô.
2. Số dòng lịch sử của đơn = phiên bản đơn.
3. Liên lạc không bao giờ mở khi chưa cọc.
4. Không âm tiền; đã trả không vượt tiền hàng; đơn đóng "đã nhận tiền" thì đã trả = tiền hàng.

## Máy chủ mô phỏng (`packages/may-chu/test`)

Kho có kiểm phiên bản (tab khác ghi chen giữa, hai tab cùng bấm), đồng hồ tua, nhịp hệ thống (giải ngân, quá hạn cọc, duyệt ứng tiền, báo giá dịch vụ chỉ làm một lần), kịch bản mẫu có đủ 13 trạng thái đơn, giả lập bên mua chỉ gợi ý lệnh hợp lệ, và **38 ca kiểm thử app bán** (danh sách: [05-ca-kiem-thu-ban.md](05-ca-kiem-thu-ban.md)).

Cùng 38 ca đó chạy trong app bán ở màn **Phòng thử** (`/phong-thu`): xem từng điểm kiểm, bấm "Xem trên app" để nạp dữ liệu của ca và mở đúng màn.

## App bán (`apps/app-ban/test`)

| Tệp | Ca kiểm thử |
|---|---|
| `danh-muc-man.test.ts` | Mọi màn trong danh mục (82) có giao diện; không có giao diện ngoài danh mục |
| `tro-ly.test.ts`, `tach-loi-dang.test.ts` | Tách câu nói thành trường: số tiền ("25 nghìn", "18k"), lượng ("10 tấn", "2,5 tấn", "800 ký"), mặt hàng theo tên đầy đủ |

Kiểm trên trình duyệt (Playwright, làm mỗi khi đổi màn): nạp kịch bản mẫu, mở cả 82 màn không lỗi JS và không tràn ngang ở 390 px; chạy tay một đơn: xác nhận → ký OTP (mã sai bị chặn) → bên mua cọc (Giả lập) → cân → chốt → bên mua chuyển tiền đảm bảo → tua 2 phút → tiền về; Phòng thử 38/38; bản HTML một tệp mở bằng `file://` chạy như trên.

## Trang giới thiệu (`apps/web-gioi-thieu/test`)

Mọi nút vào app trỏ đúng app bán / app mua theo cấu hình; trang nguồn ảnh có liên kết.

## Khi thêm quy tắc mới

1. Viết quy tắc vào `docs/01-nghiep-vu`.
2. Thêm vào bảng luật hoặc lệnh trong `packages/nghiep-vu/src/lenh`.
3. Thêm ca kiểm thử: nghiệp vụ trong `packages/nghiep-vu/test`; ca người dùng trong `packages/may-chu/src/ca-kiem-thu.ts` (tự có trong Phòng thử).
4. Chạy `npm run tai-lieu` và `npm run kiem-tra`.
