# Kiến trúc

## Ba dự án, một kho

```
AgiViet/
├── packages/nghiep-vu/     @agiviet/nghiep-vu      tầng nghiệp vụ, dùng chung
├── apps/app-mo-phong/      @agiviet/app-mo-phong   app mô phỏng hai vai (React)
├── apps/web-gioi-thieu/    @agiviet/web-gioi-thieu trang giới thiệu (TypeScript thuần)
├── scripts/                sinh tài liệu từ code
└── docs/                   tài liệu
```

- **Web giới thiệu** không phụ thuộc gói nào khác trong kho; chỉ liên kết sang app bằng `VITE_DUONG_DAN_APP`. Hai app chạy ở hai cổng (5173, 5174) và khi triển khai ở hai tên miền, nên không thể đọc dữ liệu của nhau.
- **App mô phỏng** phụ thuộc `@agiviet/nghiep-vu`. Máy chủ thật sau này cũng dùng chính gói này, nên luật chạy giống hệt ở trình duyệt và máy chủ.

## Bốn tầng của app mô phỏng

```
giao-dien  ──▶  dich-vu  ──▶  du-lieu
    │              │
    └──────────────┴──────▶  @agiviet/nghiep-vu
```

| Tầng | Thư mục | Được làm | Không được làm |
|---|---|---|---|
| **Nghiệp vụ** | `packages/nghiep-vu/src` | Kiểu dữ liệu, bảng luật, tính phí, cọc, nhóm hiển thị. Hàm thuần: cùng đầu vào cho cùng đầu ra | Đọc giờ hệ thống, đọc/ghi lưu trữ, biết giao diện |
| **Dữ liệu** | `src/du-lieu` | Lưu và đọc sổ giao dịch, hồ sơ người dùng; kiểm phiên bản khi ghi | Biết luật nghiệp vụ |
| **Dịch vụ** | `src/dich-vu` | Nhận lệnh, đọc kho, gọi `apDung`, ghi kho; truy vấn theo vai; mô phỏng ngân hàng, đồng hồ; quyết định đưa liên lạc ra hay không | Vẽ giao diện |
| **Giao diện** | `src/giao-dien`, `src/phan-he`, `src/ung-dung` | Vẽ màn, nhận thao tác, gọi dịch vụ, hiện lời báo | Gọi thẳng kho hoặc `apDung`, tự quyết luật |

Trong giao diện:

- `giao-dien/nen-tang`: bộ mã thiết kế (màu, chữ, khoảng cách, chuyển động).
- `giao-dien/thanh-phan`: thành phần dùng chung (nút, thẻ, nhãn nhóm, thanh chặng, màn trống, khung bố cục). Chỉ nhận props, không gọi dịch vụ.
- `giao-dien/bo-cuc`: khung hai vai (điện thoại, máy tính).
- `phan-he/<vai>`: màn của từng vai; `phan-he/chung`: màn dùng chung (đơn); `phan-he/danh-muc-man.ts`: danh mục màn.

## Một lệnh đi qua các tầng

Ví dụ người bán bấm "Xác nhận đơn":

1. **Giao diện** (`phan-he/chung/don.tsx`) gọi `dv.thucHien(nguoi, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] })`.
2. **Dịch vụ** (`dich-vu/giao-dich.ts`) đọc kho → `{ so, phienBan }`, gọi `apDung(so, lenh, nguoi, bayGio)`.
3. **Nghiệp vụ** kiểm: đơn có không, đúng chủ không, vai được làm không, đúng trạng thái không, lô còn đủ lượng không. Trả sổ mới (sổ cũ không đổi) hoặc lỗi.
4. **Dịch vụ** ghi sổ mới với `phienBan` đã đọc. Nếu tab khác vừa ghi (phiên bản lệch), đọc lại và áp dụng lại một lần; nghiệp vụ tự chặn nếu bước không còn hợp lệ.
5. **Dữ liệu** báo thay đổi → giao diện vẽ lại (`useSyncExternalStore`), kể cả ở tab khác (sự kiện `storage`).

## Dữ liệu mô phỏng

| Khóa localStorage | Nội dung |
|---|---|
| `agiviet.mo-phong.so.v1` | `{ so: SoGiaoDich, phienBan }` |
| `agiviet.mo-phong.ho-so.v1` | Danh sách hồ sơ (tên, vùng, xác minh, liên lạc) |
| `agiviet.mo-phong.phien.v1` (sessionStorage) | Người đang dùng mỗi vai trong tab này |

Đổi cấu trúc dữ liệu thì tăng hậu tố `.v1` → `.v2`; dữ liệu cũ tự bỏ.

## Thay mô phỏng bằng máy chủ

Viết thêm một bản cài đặt `KhoGiaoDich` gọi API (ví dụ `du-lieu/kho-may-chu.ts`), đổi một dòng trong `giao-dien/ngu-canh.tsx`. Máy chủ chạy `apDung` của cùng gói nghiệp vụ, nên trình duyệt chỉ còn gửi lệnh. Tầng giao diện và dịch vụ không đổi.

Quyết định kỹ thuật và lý do: [quyet-dinh.md](quyet-dinh.md).
