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


## Rà soát lần 1 bản giao (Claude 1, 01/11 tối — PR #1 c6a7d2d)

Đã kiểm: `trau-v4.riv` 794 KB nạp 0 lỗi trong Chromium, đặt được `hanh_dong` 17–35; 17/18/19 chỉ đúng hướng nhưng **phải ~2 giây mới bắt đầu chỉ** (tour sẽ trễ). 24 ảnh mới soi 640 px hai nền.

**Đạt:** 13 chỉ trái · 14 chỉ xuống · 15 chỉ lên · 16 cầm tiền · 17 ký giấy · 19 cạnh cân · 20 xe tải · 24 ngón cái · 26 đồng hồ cát · trong-chua-co-nhat-ky · trong-chua-co-thong-bao (đã gắn vào Sổ vườn + Thông báo).

**Cần sửa (gửi lại Claude 2):**
| Ảnh | Mức | Lỗi | Gợi ý |
|---|---|---|---|
| 28 áo mưa | Cao | Áo mưa bán trong suốt, thấy áo nâu bên dưới như bóng ma; **chân và bàn chân bị cắt ở mép dưới khung** | Áo mưa đặc (không trong suốt), hạ khung để thấy đủ chân |
| 23 tai nghe | Cao | Đầu micro đỏ nằm sát lỗ mũi trái → nhìn như thêm lỗ mũi / miệng (lỗi người sáng lập bắt nặng) | Đưa micro ra ngoài mõm, đầu micro ở cạnh má, không chạm vùng mõm |
| 25 xin bình tĩnh | Vừa | Hai tay duỗi thẳng ngang, lòng bàn tay úp — cứng như tấm ván | Tay hạ thấp ~30°, lòng bàn tay hướng ra trước, nhấn nhẹ xuống |
| 29 so sánh | Vừa | Tay duỗi ngang cứng; trái tròn cam có lá trông như **cam/quýt**, không phải xoài | Trái xoài thuôn dài vàng-xanh; tay cầm thấp trước ngực |
| 27 nón lá | Vừa | Nón quá nhỏ, đậu chênh vênh giữa hai sừng, không có quai | Nón lớn hơn, ôm đầu, có quai dưới cằm (không che mõm) |
| 18 cảnh báo | Vừa | Tay ngang lòng bàn tay úp trông như chỉ đường; cần biển "!" mới hiểu | Bàn tay dựng đứng lòng bàn tay ra trước (cử chỉ "dừng") |
| 21 túi mẫu | Thấp | Túi nhỏ, tay che gần hết, không thấy tem niêm phong | Túi to hơn, tem đỏ "niêm phong" lộ rõ |
| 22 bình xịt + lịch | Thấp | Lịch bị tay che, không đọc ra là lịch | Lịch to hơn, thấy lưới ngày; bình xịt cầm tay kia |
| trong-loi | Vừa | Không thấy "cúi xin lỗi" — chỉ đứng thường, mày hơi chau | Cúi đầu rõ, tay gãi đầu hoặc chắp tay; có thể thêm dấu "?" nhỏ |
| trong-chua-co-thong-bao | Thấp | "Zzz" xám đậm mờ trên nền tối | Màu ngà viền sẫm như đã sửa cho "…" |
| dau-vui / dau-lo / dau-ngac-nhien / dau-ngu | Vừa | Tai/sừng **chạm mép trái-phải khung 96 px** (đo: 3/4 ảnh cắt cạnh); lo và ngạc nhiên khác thường quá ít | Thu nhỏ hoặc nới khung để thấy trọn tai sừng; lo: mày chau rõ; ngạc nhiên: mắt tròn to + tai vểnh |

**Hiệu năng:** `trau-v4.riv` 595 KB → 794 KB. App hiện vẫn dùng bản 595 KB ở Trang chủ (chỉ cần 0/1/8). Đề xuất tách đạo cụ nặng (xe tải, cân) thành ảnh tĩnh, giữ `.riv` dưới ~600 KB.
