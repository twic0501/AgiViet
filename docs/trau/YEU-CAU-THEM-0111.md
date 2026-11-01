# Yêu cầu trâu thêm cho app bán — gửi Claude 2 (01/11/2026)

**Chốt hướng (người sáng lập 01/11):** chỉ góc **chính diện**. Bỏ hẳn ¾, nghiêng, sau lưng (Chặng 4 hủy). Chỉ app bán có trâu.
Giữ chuẩn C01/V4g: mắt chấm đen, mõm 2 lỗ mũi, **không miệng**, khăn rằn, áo nâu. Soi 640 px trên nền sáng `#f7f8f2` và nền tối `#233c31` trước khi bàn giao.

## Đã có và đã gắn vào app (production-test, commit c2a0977)
- `trau-v4.riv` ở Trang chủ (có việc → 8 cầm giấy đọc; sáng → 1 chào; còn lại 0 nghỉ).
- Ảnh màn trống `anh/trong-*` ở Tin nhắn, Chợ, Hợp đồng, Tiền.
- Chưa gắn (chờ giao diện mới): 12 tư thế `tu-the/`, `dau-nut-hoi`, `trong-khong-co-mang`, `trong-khong-tim-thay`.

## Cách giao
- **Hành động cử động:** thêm vào `trau-v4.riv`, nối tiếp số `hanh_dong` từ **17**; ghi vào bảng `HOP-DONG-V4.md`.
- **Ảnh tĩnh tư thế:** WebP 800×800 nền trong vào `frontend/assets/trau/tu-the/` (đặt tên `13-…`, `14-…`).
- **Ảnh màn trống:** `anh/trong-<ten>@2x.webp` + `@3x.webp` (+ `.png` dự phòng), cùng khung với bộ hiện có (trâu ~70% khung, nền trong).
- Đạo cụ cùng nét V4g, cầm trong tay, không che mặt.

## Ưu tiên 1 — app đang cần ngay

| # | Tên | Loại | Dùng ở |
|---|---|---|---|
| 1 | chỉ sang **trái** | hành động 17 + ảnh | tour rọi đèn (hiện chỉ có chỉ phải) |
| 2 | chỉ **xuống** | hành động 18 + ảnh | tour: chỉ thanh tab dưới, nút Đăng bài |
| 3 | chỉ **lên** | hành động 19 + ảnh | tour: chỉ chuông thông báo, nút hỗ trợ |
| 4 | cầm **tiền** / phong bì, vui | hành động 20 + ảnh | Tiền đã về, ngân hàng chuyển cọc |
| 5 | cầm **bút ký** giấy | hành động 21 + ảnh | Ký thỏa thuận, ký bản sửa |
| 6 | **cảnh báo**: một tay giơ chặn, mày chau | hành động 22 + ảnh | chống lừa (chuyển tiền ngoài tài khoản hợp đồng, xin số trước cọc) |
| 7 | màn trống **chưa có nhật ký** (cầm sổ trống) | ảnh `trong-chua-co-nhat-ky` | Sổ vườn |
| 8 | màn trống **chưa có thông báo** (ngủ gật cạnh chuông) | ảnh `trong-chua-co-thong-bao` | Thông báo |
| 9 | màn **lỗi chung / thử lại** (gãi đầu, xin lỗi) | ảnh `trong-loi` | "Không tải được" (Trang chủ, mọi màn) |

## Ưu tiên 2 — theo nghiệp vụ

| # | Tên | Dùng ở |
|---|---|---|
| 10 | đứng cạnh **cân**, tay chỉ mặt cân | Kết quả cân, cân lại hai bên |
| 11 | vẫy **xe tải** / đứng cạnh xe | Bàn giao, xe tới vườn |
| 12 | cầm **túi mẫu niêm phong** | Mẫu đối chứng, kiểm định |
| 13 | cầm **bình xịt + lịch** | Nhật ký thuốc, ngày hết cách ly |
| 14 | **đeo tai nghe** | Hỗ trợ, gọi tổng đài |
| 15 | giơ **ngón cái** | Đánh giá bên mua, đơn xong |
| 16 | hai tay **xin bình tĩnh** (hòa giải) | Tranh chấp, lệch tiền |
| 17 | **đồng hồ / chờ** | Chờ bên mua ký, chờ ngân hàng |
| 18 | đội **nón lá** (nắng) · mặc **áo mưa** (mưa) | Thời tiết |
| 19 | cầm **2 trái so sánh** | Chọn loại hàng (Loại 1 / Loại 2) |

## Ưu tiên 3 — bong bóng nhỏ `trau_nho` (đầu + vai, 48–64 px)
Bốn nét mặt cho bong bóng feed và nút "?": **vui**, **lo**, **ngạc nhiên** (mắt to), **ngủ**. Có bản nền tối như `dau-nut-hoi-toi`.

## Ghi chú
- Bộ ảnh màn trống hiện chưa có bản nền tối (`-toi`): cần kiểm viền trên `#233c31`; nếu mất viền thì xuất thêm bản `-toi`.
- Trái cây minh họa luôn trộn nhiều loại (xoài, chuối, thanh long…), không gỗ.
