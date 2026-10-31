# Hệ thiết kế "Sổ vườn" — app bán AgiViet (cập nhật 02/11/2026 theo các lần người sáng lập chốt)

Tệp gốc: `frontend/thiet-ke/so-vuon.css` (+ `chung.js`). Màn chuẩn để đối chiếu: Trang chủ, Đăng bài, Hợp đồng (`ban-don.html`).
**Mọi màn mới đọc tệp này trước khi viết CSS; xong chạy `node tests/kiem-trung-lop.mjs` và soi ảnh từng trạng thái.**

## Hướng
- Người dùng: nhà vườn/HTX lớn tuổi, ngoài nắng, ngón tay to, đọc chậm. Mỗi màn trả lời: *việc của bác bây giờ là gì, đang chờ ai, tiền ở đâu*.
- Cảm giác: cuốn sổ của vựa — chắc, ấm, chững chạc; lời thân ("bác"), hình nghiêm. Có nét vàng lúa / nâu đất cho đỡ chán, không lòe loẹt.
- Màu (một nền sáng duy nhất):
  - Giấy ngà `--giay` (trang), `--giay-noi` (thẻ nổi), `--giay-lot` (ô nhập, vùng lõm).
  - Lá xoài `--la` / `--la-dam` / `--la-nhat`: thương hiệu, nút chính, đã xong/an toàn.
  - Vàng lúa `--vang-lua` / `--vang-lua-nhat`, nâu đất `--nau-dat` / `--nau-dat-nhat`: điểm nhấn nhà nông, việc của bác, mùa vụ.
  - Vàng xoài chín `--chin` / `--chin-nen`: tiền, ngân hàng giữ, cảnh báo nhẹ.
  - Dấu đỏ `--dau-do` / `--dau-do-nen`: chỉ việc gấp/bị chặn/quá hạn.
  - Xám chờ `--cho`: đang chờ bên khác.

## Bố cục (luật cứng)
- **Header**: luôn `.dau.dau-xanh.nen-xanh`, bo góc dưới 22px (Trang chủ phẳng vì khối xanh chạy liền). Màn phụ: nút quay lại tròn + dòng nhỏ (`.chao`) + tên màn (`h1`).
- **Khoảng dưới header 20px** do `.noi` lo — KHÔNG đặt `padding-top` riêng trong màn (trừ Trang chủ/Chợ đã canh riêng).
- Lề trang 16px. Khoảng giữa khối 16–18px; trong thẻ 12px; dòng trong thẻ tối thiểu 44px.
- **Một tiêu điểm mỗi màn**: thẻ "Việc của bác" (nền vàng lúa nhạt, viền vàng) + **đúng một nút vàng** `#f4c84e` chữ `#1f1503` cho việc chính. Các nút khác xanh (chính phụ) hoặc viền (lùi). Đỏ nhạt cho hành động hủy/không.
- Thẻ thông tin: nền `--giay-noi`, viền mờ `0 0 0 1px var(--ke)`, bo 18; tiêu đề thẻ 15–16px đậm + chấm vàng lúa 8px.
- Dòng dữ liệu trong thẻ: nhãn trái (`--muc-phu`, 14.5px) – số phải (đậm, chữ số đều); ghi chú dưới cả dòng 13px `--muc-nhat`.
- Thanh 5 chặng hợp đồng `.chang` / `.chang-ten` (dùng chung, không vẽ lại).
- Tấm thao tác (bottom sheet): nền mờ `rgba(15,22,17,.45)`, tấm `--giay` bo trên 22, thân cuộn riêng, đáy dính có viền trên; Escape đóng; trả focus; lớp `man-che` để ẩn thanh tab; `aria-labelledby` vào tiêu đề.
- Thanh tab nổi 5 mục, Đăng bài giữa nhô lên; màn phụ (chi tiết, đăng bài) không có thanh tab.

## Chữ
- Be Vietnam Pro. Thang 1.25 từ 16: 13 · 16 · 18 · 20 · 25 · 32. Tiêu đề màn 20–22px/700; số tiền lớn 24–34px/700 chữ số đều.
- Phân tầng bằng đậm + màu mực trước, cỡ sau. Không chữ dưới 12px.
- Lời: nói rõ ai làm, bao giờ, hậu quả. Không lộ mã nội bộ (offer.sent, order…); không "undefined/NaN"; không hứa thao tác chưa có API.

## Tên lớp (nguồn lỗi lặp lại)
- `so-vuon.css` có lớp tên chung (`.vong`, `.dong`, `.can`, `.thanh-tien`, `.so`…). **Màn mới phải dùng tiền tố riêng** (`hd-` hợp đồng, `vu-` vườn, `to-` tôi, `db-` đăng bài, `lc-` lời chào, `nc-` nhu cầu…). `tests/kiem-trung-lop.mjs` chặn trùng.
- Nút làm bằng `<a class="nut">`: không gạch chân (đã có trong `so-vuon.css`).

## Trạng thái bắt buộc
- Đang tải (`.khung-tai`), rỗng (câu nói vì sao + một nút làm tiếp), lỗi (khối đỏ nhạt + **Tải lại**, không giả số 0), bị chặn (nói rõ thiếu gì, ai làm), đã xong (thông báo xanh đầu trang).
- Mọi nút ≥44px (chính 52–56px); khóa khi đang gửi; khóa chống lặp theo thao tác.

## Cấm (Impeccable craft floor)
- Emoji làm biểu tượng → SVG vẽ tay, nét 1.9, màu theo nghĩa.
- Dòng chữ nhỏ viết hoa đặt trên tiêu đề (kicker/eyebrow) → bỏ, tiêu đề tự đứng; trạng thái nói bằng màu nền.
- Vạch màu dày > 1px bên trái thẻ → dùng nền nhạt + viền mảnh.
- Nút chữ gãy 2 dòng → nút chính có số tiền chiếm trọn hàng; hàng có "Quay lại" thì nút lùi gọn (`auto 1fr`); lựa chọn dài dùng thẻ chọn xếp dọc, không ép 2 nút ngang.
- Tấm có hàng nút dính đáy: tấm KHÔNG chừa đệm dưới (`padding-bottom: 0`), hàng nút tự lo `calc(14px + env(safe-area-inset-bottom))`; nội dung khác đổi vào tấm cũng phải dùng lại hàng nút đáy đó.
- Bề mặt trình duyệt theo hệ: `::selection` vàng lúa nhạt, `:focus-visible` viền vàng lúa 3px (đã có trong `so-vuon.css`).

## Tự soát trước khi báo
1. `node tests/kiem-trung-lop.mjs` sạch; `node tests/soat-giao-dien.mjs <thư mục ảnh>` sạch (mọi màn + mọi tấm ở 360/390: nút gãy dòng, đáy tấm sát mép, vùng chạm, chữ < 12px, tương phản, emoji, mã nội bộ).
2. E2E `kiemChung` (tràn, ép, nút nhỏ, mã thô) trên mọi trạng thái mới.
3. Chụp **từng trạng thái** 390 và 360 (cả tấm thao tác, cả dữ liệu dài/nhiều vòng), **nhìn bằng mắt**: dính header? lệch tông? chữ gãy vô lý? hai nút vàng? gạch chân? màu không có nghĩa?
