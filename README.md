# AgiViet

**Tìm đúng mối, chốt đúng giá.** Sổ làm ăn của nhà vườn và bàn làm việc thu mua của doanh nghiệp, có chợ nông sản ở giữa.

Kho chia tầng: gói dùng chung ở `packages/`, mỗi sản phẩm một thư mục riêng ở `apps/`.

| Thư mục | Là gì | Chạy |
|---|---|---|
| [`packages/nghiep-vu`](packages/nghiep-vu) | Tầng nghiệp vụ: luật đơn, cọc, phí, liên lạc, lô, vườn, tiền. Hàm thuần, không giao diện, không lưu trữ | `npm test -w @agiviet/nghiep-vu` |
| [`packages/may-chu`](packages/may-chu) | Máy chủ mô phỏng: kho trình duyệt, đồng hồ tua được, dịch vụ nhận lệnh, ngân hàng và đối tác giả lập, kịch bản dữ liệu mẫu, 38 ca kiểm thử app bán | `npm test -w @agiviet/may-chu` |
| [`packages/danh-muc`](packages/danh-muc) | Danh mục 320 mặt hàng, mẫu chia loại, ảnh, icon nhóm | |
| [`packages/giao-dien`](packages/giao-dien) | Bộ mã thiết kế, thành phần dùng chung, icon, nối giao diện với máy chủ mô phỏng | |
| [`apps/app-ban`](apps/app-ban) | **App Nhà sản xuất** (người bán, điện thoại): 80 màn + Phòng thử + Giả lập bên mua | `npm run app` → http://localhost:5173 |
| `apps/app-mua` | App Thu mua (bên mua, máy tính): giai đoạn 2 | |
| [`apps/web-gioi-thieu`](apps/web-gioi-thieu) | Trang web giới thiệu, dữ liệu riêng, chỉ liên kết sang hai app | `npm run web` → http://localhost:5174 |

## Bắt đầu

```bash
npm install
npm run kiem-tra       # kiểm kiểu + chạy toàn bộ test
npm run app            # app bán
npm run web            # trang giới thiệu
npm run build          # build mọi app
npm run dong-goi-html  # đóng gói thành tệp HTML mở thẳng (dist-html/)
npm run tai-lieu       # sinh lại tài liệu từ code
```

Cần Node 22.18 trở lên (script sinh tài liệu chạy thẳng TypeScript).

## Thử app bán với dữ liệu mô phỏng

1. `npm run app`, mở http://localhost:5173/gia-lap (hoặc mở tệp `AgiViet_app_ban.html` sau khi đóng gói, bấm dải "Mô phỏng" trên cùng).
2. **Nạp kịch bản mẫu**: 20 ngày làm ăn của chị Năm (Cao Lãnh), 4 lô, đơn ở đủ 13 trạng thái, tin nhắn, báo giá, sổ vườn, tiền.
3. Làm phần người bán trong app; phần bên mua bấm ở **Giả lập bên mua** (mỗi nút là một lệnh thật của bên mua mẫu); **tua đồng hồ** để thấy quá hạn cọc, ngân hàng chuyển tiền, tin tự ẩn.
4. **Phòng thử** (`/phong-thu`) chạy 38 ca kiểm thử, xem từng điểm kiểm, bấm "Xem trên app" để mở đúng màn với dữ liệu của ca.

## Tài liệu

Bắt đầu từ [`docs/README.md`](docs/README.md): tổng quan, nghiệp vụ, kiến trúc, giao diện, [kế hoạch giai đoạn](docs/04-ke-hoach.md), [kiểm thử](docs/05-kiem-thu.md), [ca kiểm thử app bán](docs/05-ca-kiem-thu-ban.md), quy ước.

## Hiện trạng

Giai đoạn 1 xong: app bán đủ 80 màn chạy trên máy chủ mô phỏng, có dữ liệu mẫu, giả lập bên mua và Phòng thử 38 ca. Tiếp theo: giai đoạn 2, app Thu mua. Xem [kế hoạch](docs/04-ke-hoach.md).
