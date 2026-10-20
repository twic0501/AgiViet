# Kiến trúc

## Một kho, gói dùng chung và các app

```
AgiViet/
├── packages/
│   ├── nghiep-vu/        @agiviet/nghiep-vu     luật nghiệp vụ, hàm thuần
│   ├── may-chu/          @agiviet/may-chu       máy chủ mô phỏng: kho, đồng hồ, dịch vụ, hệ thống, truy vấn, kịch bản, giả lập, ca kiểm thử
│   ├── danh-muc/         @agiviet/danh-muc      320 mặt hàng, mẫu chia loại, ảnh, icon nhóm (sinh từ docs/01-nghiep-vu/mat-hang.csv)
│   └── giao-dien/        @agiviet/giao-dien     mã thiết kế, thành phần, icon, nối giao diện với máy chủ mô phỏng
├── apps/
│   ├── app-ban/          @agiviet/app-ban       app Nhà sản xuất (React, điện thoại)
│   ├── app-mua/          (giai đoạn 2)          app Thu mua (React, máy tính)
│   └── web-gioi-thieu/   @agiviet/web-gioi-thieu trang giới thiệu (HTML tĩnh)
├── scripts/              sinh tài liệu, sinh danh mục mặt hàng, đóng gói HTML một tệp
└── docs/
```

- **Web giới thiệu** không phụ thuộc gói nào; chỉ liên kết sang app bằng `VITE_APP_BAN`, `VITE_APP_MUA`.
- **App bán và app mua** không nhập lẫn nhau. Mỗi app giữ phiên đăng nhập và bản nháp riêng (khóa có tiền tố `agiviet.app-ban.` / `agiviet.app-mua.`); dữ liệu giao dịch nằm ở máy chủ mô phỏng chung, nên mở hai app ở hai tab thì thấy cùng một giao dịch.
- Máy chủ thật sau này cũng chạy `@agiviet/nghiep-vu`, nên luật giống hệt ở trình duyệt và máy chủ.

## Các tầng

```
app (màn)  ──▶  giao-dien (useLenh, useSo)  ──▶  may-chu: DichVu  ──▶  KhoGiaoDich
                                                     │
                                                     └──▶  nghiep-vu: apDung(sổ, lệnh, người, giờ)
```

| Tầng | Ở đâu | Được làm | Không được làm |
|---|---|---|---|
| **Nghiệp vụ** | `packages/nghiep-vu` | Kiểu dữ liệu, bảng luật đơn, lệnh (`lenh/*`), phí, cọc, che liên lạc, uy tín, tổng hợp. Hàm thuần | Đọc giờ hệ thống, lưu trữ, DOM |
| **Dữ liệu** | `may-chu/src/kho.ts` | Lưu, đọc sổ giao dịch; kiểm phiên bản khi ghi; báo thay đổi (cả tab khác) | Biết luật |
| **Dịch vụ** | `may-chu/src/dich-vu.ts`, `truy-van.ts`, `he-thong.ts` | Nhận lệnh, gọi `apDung`, ghi kho (thử lại khi lệch phiên bản); truy vấn theo người xem (che liên lạc); nhịp hệ thống: hạn cọc, ngân hàng, đối tác | Vẽ giao diện |
| **Giao diện chung** | `packages/giao-dien` | Mã thiết kế, thành phần chỉ nhận props, `CungCapMayChu`, `useSo`, `useBayGio`, `useLenh` | Tự quyết luật |
| **App** | `apps/app-ban/src` | `danh-muc-man.ts` (danh mục), `ung-dung.tsx` (định tuyến), `bo-cuc.tsx`, `man/*.tsx` (màn theo mục), `phien.ts` (phiên, bản nháp) | Gọi thẳng kho hoặc `apDung` |

Công cụ mô phỏng nằm ngoài luồng thật: `may-chu/src/kich-ban.ts` (dữ liệu mẫu dựng bằng lệnh thật), `gia-lap.ts` (việc bên mua mẫu làm tiếp được), `ca-kiem-thu.ts` (ca kiểm thử dùng chung cho Vitest và màn Phòng thử).

## Một lệnh đi qua các tầng

Người bán bấm "Ký và xác nhận đơn":

1. **Màn** (`app-ban/src/man/ky.tsx`) gọi `lam({ loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] })` (`useLenh` của gói giao diện).
2. **Dịch vụ** đọc kho → `{ so, phienBan }`, gọi `apDung(so, lenh, nguoi, dongHo.bayGio())`.
3. **Nghiệp vụ** kiểm: tài khoản đăng ký đúng vai, không bị khóa; đơn đúng chủ; vai được làm; đúng trạng thái; không có đề nghị đang chờ; lô còn đủ lượng. Trả sổ mới hoặc lỗi viết cho người dùng.
4. **Dịch vụ** ghi sổ mới với `phienBan` đã đọc. Tab khác vừa ghi thì đọc lại và áp dụng lại (tối đa 3 lần); nghiệp vụ tự chặn nếu bước không còn hợp lệ.
5. **Kho** báo thay đổi → mọi màn đang mở (cả app mua ở tab khác) vẽ lại. Lỗi thì `useLenh` hiện đúng lời báo của nghiệp vụ.

## Dữ liệu mô phỏng (trình duyệt)

| Khóa | Nơi | Nội dung |
|---|---|---|
| `agiviet.may-chu-gia.so.v2` | localStorage | `{ so: SoGiaoDich, phienBan }`, dùng chung hai app |
| `agiviet.may-chu-gia.dong-ho.v1` | localStorage | Khoảng đã tua đồng hồ, dùng chung hai app |
| `agiviet.app-ban.phien.v1` | sessionStorage | Người đang dùng app bán ở tab này |
| `agiviet.app-ban.nhap.*` | sessionStorage | Bản nháp màn nhiều bước (đăng ký, đăng lô, ký) |

Đổi cấu trúc dữ liệu thì tăng hậu tố phiên bản; dữ liệu cũ tự bỏ.

## Thay mô phỏng bằng máy chủ (giai đoạn 4)

Viết một bản cài đặt `KhoGiaoDich` gọi API, đổi chỗ tạo kho trong `CungCapMayChu`. Máy chủ chạy `apDung` của cùng gói nghiệp vụ; app và màn không đổi.

Quyết định kỹ thuật và lý do: [quyet-dinh.md](quyet-dinh.md).
