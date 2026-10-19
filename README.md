# AgiViet

**Tìm đúng mối, chốt đúng giá.** Sổ làm ăn của nhà vườn và bàn làm việc thu mua của doanh nghiệp, có chợ nông sản ở giữa.

Kho này gồm ba phần độc lập, chia tầng rõ ràng:

| Thư mục | Là gì | Chạy |
|---|---|---|
| [`packages/nghiep-vu`](packages/nghiep-vu) | Tầng nghiệp vụ: luật đơn hàng, cọc, phí, liên lạc. Hàm thuần, không giao diện, không lưu trữ | `npm test -w @agiviet/nghiep-vu` |
| [`apps/app-mo-phong`](apps/app-mo-phong) | App mô phỏng hai vai: Nhà sản xuất (điện thoại) và Thu mua (máy tính) | `npm run app` → http://localhost:5173 |
| [`apps/web-gioi-thieu`](apps/web-gioi-thieu) | Trang web giới thiệu, dữ liệu riêng, chỉ liên kết sang app | `npm run web` → http://localhost:5174 |

## Bắt đầu

```bash
npm install
npm run kiem-tra     # kiểm kiểu + chạy toàn bộ test
npm run app          # app mô phỏng
npm run web          # trang giới thiệu
npm run build        # build cả hai app
```

Cần Node 22.18 trở lên (script sinh tài liệu chạy thẳng TypeScript).

## Tài liệu

Bắt đầu từ [`docs/README.md`](docs/README.md):

- [Tổng quan sản phẩm](docs/00-tong-quan.md): định vị, người dùng, phạm vi, cách thu tiền
- [Nghiệp vụ](docs/01-nghiep-vu/): vai trò, luồng giao dịch, bảng trạng thái đơn, cọc và phí, liên lạc, mặt hàng
- [Kiến trúc](docs/02-kien-truc/): các tầng, cấu trúc thư mục, quyết định kỹ thuật
- [Giao diện](docs/03-giao-dien/): danh mục màn, bố cục hai app, nhận diện trạng thái, trang giới thiệu
- [Kế hoạch giai đoạn](docs/04-ke-hoach.md)
- [Kiểm thử](docs/05-kiem-thu.md)
- [Quy ước làm việc](docs/06-quy-uoc.md)

## Hiện trạng

Giai đoạn 0 (nền móng): tầng nghiệp vụ đầy đủ và có test; app mô phỏng có khung 129 màn theo danh mục, 8 màn đã nối dữ liệu; trang giới thiệu có khung 12 khu, chữ chưa chốt hiện ô chờ. Chưa có dữ liệu mẫu. Xem [kế hoạch](docs/04-ke-hoach.md).
