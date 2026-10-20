# Kế hoạch giai đoạn

Mỗi giai đoạn làm trọn một sản phẩm, có tiêu chí xong rõ ràng. Hai app (bán, mua) dùng chung tầng nghiệp vụ và máy chủ mô phỏng nhưng là hai dự án riêng, phiên đăng nhập và bản nháp riêng.

## Giai đoạn 0 · Nền móng (xong)

| Việc | Trạng thái |
|---|---|
| Kho mã chung, dự án tách rời, kiểm kiểu nghiêm, kiểm tra tự động trên GitHub | Xong |
| Tầng nghiệp vụ v2: bảng luật 20 bước, 13 trạng thái; kết nối, trao đổi, báo giá, hẹn xem, đề nghị đổi đơn; vườn, mùa vụ, nhật ký, cách ly, thu chi; dịch vụ, ứng tiền, hỗ trợ, báo cáo, uy tín | Xong, 58 test (ma trận 780 trường hợp, 5.000 bước ngẫu nhiên) |
| Máy chủ mô phỏng dùng chung hai app: kho có kiểm phiên bản, đồng hồ tua được, ngân hàng và đối tác giả lập | Xong |
| Danh mục 320 mặt hàng, ảnh, icon nhóm; bộ giao diện dùng chung | Xong |
| Trang giới thiệu: giữ bản cũ, nút vào app bán và app mua | Xong |

## Giai đoạn 1 · App bán, mô phỏng trọn vẹn (xong)

Mục tiêu: mọi chức năng của app Nhà sản xuất chạy được trên máy chủ mô phỏng, có dữ liệu mẫu để xem mọi trạng thái và ca kiểm thử để thao tác lại.

| Việc | Trạng thái |
|---|---|
| 80 màn theo danh mục: Bắt đầu (9), Hôm nay (3), Vườn (8), Bán hàng (21), Đơn và ký (21), Tiền (5), Tôi (13) | Xong; bài thử bảo đảm màn nào cũng có giao diện |
| Ký thỏa thuận khi xác nhận đơn: chọn cách giao dịch → lượng hứa → tóm tắt, nghe đọc, bản đầy đủ → mã OTP hoặc ký giấy | Xong |
| Kịch bản mẫu: 20 ngày làm ăn, đơn ở đủ 13 trạng thái | Xong |
| Giả lập bên mua: ba bên mua mẫu làm tiếp được mọi bước của họ bằng lệnh thật; tua đồng hồ | Xong |
| Phòng thử: 38 ca (tài khoản, lô, khách, đơn, tiền, vườn, khác), xem điểm kiểm, mở kết quả trên app | Xong, 38/38 đạt |
| Đóng gói một tệp HTML mở thẳng | Xong (`AgiViet_app_ban.html`) |

**Tiêu chí xong (đã đạt):** `npm run kiem-tra` sạch; mở cả 82 màn không lỗi JS, không tràn ngang ở 390 px; chạy tay một đơn từ xác nhận, ký, cọc, cân, chốt tới tiền về; 38/38 ca đạt cả trong Vitest và trong Phòng thử.

**Còn phải làm ngoài code:** thay ảnh, icon, chuyển động bằng bộ asset mới; thử với 5 nhà vườn thật.

## Giai đoạn 2 · App Thu mua (`apps/app-mua`, 49 màn)

- Máy tính trước, điện thoại dùng được. Cổng 5175, nhận diện `data-vai="mua"`.
- Vào app: đăng nhập, thông tin tổ chức, chọn gói (Miễn phí / Business); thành viên và quyền.
- Mua hàng: nguồn hàng có bộ lọc theo mẫu chia loại, lời mời kết nối (hạn mức theo gói), tin cần mua, nhắn tin, báo giá, hẹn xem.
- Giao dịch: tạo đơn (từ báo giá), đặt cọc, nhập kết quả cân, trả tiền (đảm bảo hoặc trực tiếp), đối soát, hủy, đánh giá.
- Quản lý: kho (nhập, xuất, truy xuất về nhật ký vườn), đơn ngoài app, nhà cung cấp, mối quen, kế hoạch mua, công nợ, bảng kê 01/TNDN.
- Giả lập người bán và Phòng thử phía mua, giống giai đoạn 1.

**Tiêu chí xong:** hai app mở ở hai tab chạy hết một giao dịch trên cùng máy chủ mô phỏng; ca kiểm thử phía mua đạt hết.

## Giai đoạn 3 · App vận hành (`apps/van-hanh`, 11 màn)

Duyệt xác minh, kiểm duyệt tin và báo cáo, xem nguyên văn tin bị che khi có báo cáo, kết luận tranh chấp, theo dõi tiền đảm bảo và ứng tiền, cấu hình phí và hạn mức, trả lời hỗ trợ.

## Giai đoạn 4 · Hệ thống thật

Máy chủ (`apps/may-chu`) chạy `@agiviet/nghiep-vu`; bộ nối `KhoGiaoDich` gọi API thay kho trình duyệt (các app không đổi); ngân hàng đối tác cho tài khoản đảm bảo; luật sư rà mô hình giữ tiền; thử ở một huyện với hai mặt hàng.
