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


---

# Nhánh "Sổ làm ăn" — app MUA và trang VẬN HÀNH (02/11/2026)

Tệp gốc: `thiet-ke/so-lam-an.css` + `so-lam-an.js` (khung, menu, kho trạng thái chung giữa khung máy tính và điện thoại). Màn: `mua.js` (49), `van-hanh.js` (11). Tiền tố lớp **`sl-`**, không nạp chung với `so-vuon.css`.

## Hướng
- Người dùng: người phụ trách mua ở văn phòng (máy tính) và tại kho (điện thoại); nhân viên vận hành ở bàn làm việc. Cảm giác: sổ cái của vựa — dày thông tin, chắc, đọc nhanh.
- Cùng thế giới màu Sổ vườn: giấy ngà; lá xoài = nút, đã xong; vàng chín `--chin` = tiền, ngân hàng giữ; đỏ `--do` = tới lượt bạn, quá hạn; xanh biển `--bien` = ngân hàng và người vận hành (bên thứ ba).
- Độ sâu: chỉ đổi sắc nền + vòng kẻ mảnh `0 0 0 1px var(--ke)`. Không đổ bóng.

## Số đo
- Be Vietnam Pro, gốc 14px, thang 1.2: 12 · 14 · 16 · 18 · 22 · 28. Không dưới 12px.
- Lưới 4px. Trang đệm 24/28px (máy), 16px (điện thoại). Thẻ đệm 18px, bo 14. Nút 40px máy / 44px điện thoại, bo 10. Nút lọc 36/40px.
- Menu trái 232px cùng nền trang, kẻ phải 1px; mục 36px; mục đang mở nền lá xoài.
- Dưới 720px: menu thành thanh tab dưới 5 mục; lưới về 1 cột (`.sl-hai-cot` cho lưới cột cố định); bảng thành thẻ (nhãn cột tự gắn `data-nhan`).

## Mẫu
- Thẻ việc tiếp theo `.sl-viec` là tiêu điểm màn, đúng một nút vàng. Biến thể: `.sl-cho` (chờ bên kia, không có nút làm thay), `.sl-chan-lai` (bị chặn, nói rõ thiếu gì), `.sl-xong`.
- Việc của bên kia trong bản mẫu: nút `.sl-mp` "Mô phỏng: …" dạng viên thuốc xanh biển, khác hẳn nút của người dùng.
- Dòng bước `.sl-buoc`: vòng 28px; xong = lá xoài có tích; đang = vàng có quầng; bị chặn = đỏ + dòng lý do; mỗi bước ghi ai, hạn, tiền đang ở đâu.
- Tiền đang ở đâu `.sl-tien-o`: 3 ô Bạn / Ngân hàng / Người bán; nháy vàng 700ms khi đổi.
- Dải số liệu `.sl-dai`: một khung, cột ngăn kẻ mảnh, số 22px. KHÔNG dùng 4 ô thẻ rời giống nhau (kiểu bảng điều khiển mặc định); dải nhẹ để nhường tiêu điểm cho bảng việc.
- Nhãn trạng thái `.sl-nhan` (24px, chấm màu): `sl-n-ban` tới lượt bạn · `sl-n-tien` · `sl-n-xong` · `sl-n-nh` ngân hàng/vận hành · mặc định = đang chờ.
- Chữ trên nút theo prompt app mua V2 mục 9; không dùng "ví ký quỹ", "rẻ nhất", "coi như đã nhận".

## Soát
Chụp 1280 + 390 mỗi màn, bắt: lỗi JS, tràn ngang, nút thấp, nút gãy dòng, chữ nhỏ, undefined/NaN. Rồi nhìn ảnh.
