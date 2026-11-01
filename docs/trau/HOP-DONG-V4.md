# Trâu v4 — hợp đồng nối với giao diện (1/11, ĐÃ DUYỆT)

Tệp: `frontend/assets/trau/trau-v4.riv` (≈641 KB, hai artboard; 60 khung/giây khi CPU giả lập chậm ×4). Vào hành động tức thì — tay chỉ ra sau ~0,15 s, chỉ hẳn sau ~0,3 s. `trau-v3.riv` vẫn giữ nguyên cho tới khi giao diện chuyển xong.

## Artboard
| Tên | Khung | Dùng |
|---|---|---|
| `trau` | 512×512, chân y≈490 | Trang chủ, màn chào lần đầu |
| `trau_nho` | 128×128, đầu + vai, nét dày hơn | bong bóng feed, nút "?" (hiển thị 48–64 px). Không có hành động 10, 11, 13–15, 25–28, 32–35 (đồ cầm / chân) — đặt số đó thì trâu nhỏ đứng nghỉ |

Cả hai có state machine `trau` với cùng đầu vào.

## Đầu vào
| Tên | Kiểu | Ý nghĩa |
|---|---|---|
| `hanh_dong` | số | bảng dưới |
| `huong` | số −1…1 | giữ chỗ (chưa đổi hình — chỉ góc chính diện) |
| `cham` | trigger | giật mình rồi cười; chạm lần 2 trong lúc đó → khúc khích; lần 3 → "trứng" nhảy xoay vòng |
| `nhin_x`, `nhin_y` | số −1…1 | đầu + mắt nhìn theo |
| `vao` | bool, mặc định true | false → trâu nhảy ra khỏi khung (mép phải); true → nhảy vào giữa |

## `hanh_dong`
| Số | Hành động | Dùng ở |
|---|---|---|
| 0 | nghỉ (thở, chớp mắt, vẫy đuôi; tự làm 12 động tác vặt) | mọi nơi |
| 1 | chào (gật + giơ tay) | lần đầu vào app, đăng nhập |
| 2 | chỉ tay sang phải màn hình | tour hướng dẫn |
| 3 | nói (mõm nhấp nhô, gật — **trâu không có miệng** theo thiết kế V4g) | bong bóng có chữ |
| 4 | vui, nhảy | đăng bài xong, tiền về, đơn xong |
| 5 | lo (mày chau, hai tay xoắn trước ngực) | lỗi mạng, lệch tiền, sắp quá hạn |
| 6 | suy nghĩ + "…" | đang tải, AI đang soạn |
| 7 | ngủ gật + "Zzz" | màn trống, chưa có đơn |
| 8 | cầm giấy đọc | nhắc ký thoả thuận, kiểm tiền |
| 9 | vẫy tạm biệt | đóng tour, đăng xuất |
| 10 | chờ (ngó quanh) | chờ bên kia |
| 11 | đi tại chỗ | — |
| 12 | xin lỗi / lỗi: cúi đầu sâu, chắp tay, dấu "?" | lỗi, thử lại |
| 13 | bê thúng rau (ôm trước ngực) | đăng hàng |
| 14 | cầm điện thoại | nhắc mở app ngân hàng, kiểm tiền |
| 15 | ghi sổ (cầm sổ mở) | nhật ký vườn, sổ tiền |
| 16 | vui dang tay (mắt cười, lắc lư) | đăng bài xong |
| 17 | chỉ sang trái (tay trái ngón trỏ, đầu + mắt theo) | tour rọi đèn |
| 18 | chỉ xuống (tay ngón trỏ chéo xuống) | tour: thanh tab dưới, nút Đăng bài |
| 19 | chỉ lên (tay ngón trỏ chéo lên) | tour: chuông thông báo, nút hỗ trợ |
| 20 | cầm phong bì tiền, mắt cười, nhún | tiền đã về, ngân hàng chuyển cọc |
| 21 | cầm giấy + bút ký | ký thoả thuận, ký bản sửa |
| 22 | cảnh báo: bàn tay dựng đứng "dừng" cạnh má, mày chau, biển "!" đỏ trên đầu | chống lừa |
| 23 | ngủ gật cạnh chuông | chưa có thông báo |
| 24 | ngạc nhiên (mắt to, mày nhướng) | bong bóng nhỏ |
| 25 | đứng cạnh cân, tay trái chỉ mặt cân | kết quả cân, cân lại |
| 26 | vẫy xe tải (xe chở trái cây đậu bên phải) | bàn giao, xe tới vườn |
| 27 | cầm túi mẫu niêm phong | mẫu đối chứng, kiểm định |
| 28 | tay trái cầm lịch, tay phải cầm bình xịt | nhật ký thuốc, ngày hết cách ly |
| 29 | đeo tai nghe, đang nói | hỗ trợ, tổng đài |
| 30 | giơ ngón cái, mắt cười | đánh giá, đơn xong |
| 31 | hai tay xin bình tĩnh | tranh chấp, lệch tiền |
| 32 | cầm đồng hồ cát, gõ chân | chờ bên mua ký, chờ ngân hàng |
| 33 | đội nón lá (không quai), mắt nheo | thời tiết nắng |
| 34 | (đã bỏ — người sáng lập 1/11) | — |
| 35 | so sánh 2 quả xoài (to / nhỏ) cầm thấp trước ngực | chọn loại hàng |

Lưu ý: số 2 hiện chỉ chỉ sang **phải màn hình**; chỉ trái/phải theo `huong` cần góc ¾ (đang gác).

## Ảnh tĩnh — `frontend/assets/trau/anh/` (PNG + WebP, nền trong, @2x/@3x, cỡ gốc 200 px; nút 48 px)
| Tệp | Cảnh |
|---|---|
| `trong-chua-co-don` | ngủ gật |
| `trong-chua-co-tin-nhan` | suy nghĩ "…" |
| `trong-chua-co-lo-hang` | cầm giấy |
| `trong-khong-co-mang` | lo |
| `trong-khong-tim-thay` | chỉ tay |
| `trong-chua-co-tien-ve` | chờ |
| `dau-nut-hoi`, `dau-nut-hoi-toi` | đầu trâu nút "?"; bản tối có viền ngà để nổi trên nền tối |

## Cách gắn (theo rà soát định hướng 1/11)
- **Chỉ app bán có trâu.** App mua giữ kiểu doanh nghiệp, không trâu.
- **KHÔNG chép đè** vào `frontend/tham-khao/hieu-ung-va-linh-vat/trau/` (thư mục đó thuộc giao diện cũ và đang được app mua dùng chung).
- Tour, bong bóng, nút "?" và màn trống **dựng trên giao diện mới** bằng `trau-v4.riv` (cử động liền, không đổi ảnh qua lại), sau khi PR #1 được gộp.
- Ảnh tĩnh dưới đây **chỉ để dự phòng**: máy yếu, người dùng tắt chuyển động (`prefers-reduced-motion`), màn trống tĩnh.

## 12 tư thế tĩnh dự phòng — `frontend/assets/trau/tu-the/`
WebP 800×800 nền trong, đặt tên theo bộ cũ cho dễ đối chiếu.
Tạo lại: `python3 frontend/trau-rive/xuat-tu-the.py`.

| Tệp | Lấy từ | Khi trâu cử động trong hướng dẫn (thay `LinhVatNguyen`) dùng `hanh_dong` |
|---|---|---|
| 01-dung | nghỉ | 0 |
| 02-chop | nghỉ, khung chớp mắt | 0 |
| 03-chao | chào | 1 (`chao`) |
| 04-nghe | nghiêng đầu tò mò | 3 (`nghe` — đang giải thích) |
| 05-nghi | suy nghĩ "…" (chấm ngà viền sẫm, rõ cả trên nền tối) | 6 |
| 06-vui | vui dang tay, mắt cười | 16 (`vui`) |
| 07-lo | lo: mày chau, hai tay xoắn | 5 (`lo`) |
| 08-chi | chỉ tay | 2 (`chi`) |
| 09-be | bê thúng rau trộn (xoài, chuối, thanh long), hai tay bám miệng thúng | 13 |
| 10-dien-thoai | cầm điện thoại | 14 |
| 11-mung | đỉnh cú nhảy, co chân, hai tay giơ | 4 |
| 12-ghi-so | cầm sổ | 15 (`ghi-so`) |
| 13-chi-trai | chỉ trái | 17 |
| 14-chi-xuong | chỉ xuống | 18 |
| 15-chi-len | chỉ lên | 19 |
| 16-cam-tien | cầm phong bì tiền | 20 |
| 17-ky-giay | ký giấy | 21 |
| 18-canh-bao | cảnh báo | 22 |
| 19-can · 20-xe-tai · 21-tui-mau · 22-binh-xit-lich · 23-tai-nghe · 24-ngon-cai · 25-binh-tinh · 26-dong-ho · 27-non-la · 29-so-sanh (28 áo mưa đã bỏ) | ưu tiên 2 | 25 … 35 (trừ 34) |

## Thêm 1/11 (YEU-CAU-THEM-0111) trong `frontend/assets/trau/anh/`
- Màn trống @2x/@3x WebP + PNG: `trong-chua-co-nhat-ky` (cầm sổ), `trong-chua-co-thong-bao` (ngủ cạnh chuông), `trong-loi` (cúi xin lỗi).
- Đầu nhỏ `trau_nho` 48 px @2x/@3x WebP + PNG, mỗi cái có bản `-toi` (viền ngà): `dau-vui`, `dau-lo`, `dau-ngac-nhien`, `dau-ngu`.

Âm thanh: chưa làm.
