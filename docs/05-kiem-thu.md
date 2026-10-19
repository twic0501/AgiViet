# Kiểm thử

```bash
npm run kiem-tra    # kiểm kiểu + mọi test (chạy trên GitHub mỗi lần đẩy code)
npm test -w @agiviet/nghiep-vu
npm test -w @agiviet/app-mo-phong
npm test -w @agiviet/web-gioi-thieu
```

## Tầng nghiệp vụ (`packages/nghiep-vu/test`)

| Tệp | Ca kiểm thử |
|---|---|
| `luong-don.test.ts` | Luồng tài khoản đảm bảo trọn vẹn (cọc 10%, phí 1%, trừ cọc, chuyển đúng số, giải ngân một lần); luồng trả trực tiếp (trả thiếu không đóng được, nhận một phần, đối soát, chứng từ); lỗi cũ: bán lố, xác nhận hai lần, màn còn nút cũ; sai vai; sai chủ (người bán khác, bên mua khác); chưa được đồng ý kết nối; hủy trước và sau cọc, ai giữ cọc; quá hạn cọc; phí sàn, phí mối quen, trần; tiền hàng nhỏ hơn cọc |
| `bat-bien.test.ts` | **Ma trận** 20 bước × 13 trạng thái × 3 vai = 780 trường hợp: chỉ chạy đúng chỗ bảng luật cho phép, bị chặn thì sổ không đổi, thành công thì phiên bản tăng. **5.000 bước ngẫu nhiên** (bộ sinh có hạt cố định) kiểm bất biến sau mỗi bước và phải đi qua đủ 13 trạng thái |

Bất biến luôn đúng:

1. Lượng đã hứa của lô = tổng lượng các đơn đã xác nhận còn giữ hàng; không vượt lượng lô.
2. Số dòng lịch sử của đơn = phiên bản đơn.
3. Liên lạc không bao giờ mở khi chưa cọc.
4. Không âm tiền; đã trả không vượt tiền hàng; đơn đóng "đã nhận tiền" thì đã trả = tiền hàng.

## App mô phỏng (`apps/app-mo-phong/test`)

| Tệp | Ca kiểm thử |
|---|---|
| `dich-vu.test.ts` | Lệnh đi qua dịch vụ → nghiệp vụ → kho; lỗi không ghi kho; tab khác ghi chen giữa đọc và ghi (tự áp dụng lại trên dữ liệu mới); hai tab cùng xác nhận một đơn (một lần thành công); liên lạc bên kia chỉ có sau cọc; mô phỏng ngân hàng giải ngân và đóng đơn quá hạn, nhịp sau không làm lại |
| `danh-muc.test.ts` | 129 màn, không trùng mã, màn nào cũng có khu vực; mục điều hướng nào cũng mở được màn có thật; trang nào cũng có mục điều hướng |

Kiểm trên trình duyệt (làm tay hoặc bằng Playwright, giai đoạn 1 đưa vào kiểm tra tự động): mở cả 129 màn không lỗi JS; hai vai ở hai tab chạy hết một giao dịch.

## Trang giới thiệu (`apps/web-gioi-thieu/test`)

Đủ khu theo đúng thứ tự; mọi nút vào app dùng đường dẫn cấu hình; khẩu hiệu là chữ thật, chữ chưa chốt hiện ô chờ; nội dung được thoát ký tự HTML.

## Khi thêm quy tắc mới

1. Viết quy tắc vào `docs/01-nghiep-vu`.
2. Thêm vào bảng luật hoặc `apDung`.
3. Thêm ca kiểm thử (kịch bản trong `luong-don.test.ts`; nếu là bước mới, ma trận tự phủ).
4. Chạy `npm run tai-lieu` và `npm run kiem-tra`.
