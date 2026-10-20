# fe-nongdan — Giao diện app Nhà sản xuất (AgiViet)

Bản giao diện HTML/CSS/JS thuần cho **người bán** (nông dân, chủ ao, tổ hợp tác), bám theo
*Quy trình vận hành v3* và *Đặc tả kiến trúc v4* (~/Downloads/AgriMatch_*_v3.md, _v4.md). Chỉ là giao diện: số liệu là mẫu, không có
máy chủ hay dữ liệu thật.

## Mở xem

- Mở `index.html` (mục lục 63 màn) trong trình duyệt, không cần cài gì. Hoặc chạy
  `python3 -m http.server 8080` rồi vào http://localhost:8080.
- `bat-dau.html#chao-mung`: đi từ đầu như người dùng mới.
- `nhan-dien.html`: bảng nhận diện.
- `GOP-Y-NGHIEP-VU.md`: các điểm nghiệp vụ/vận hành cần quyết định, ghi lại trong lúc thiết kế.
- `DOI-CHIEU-QUY-TAC.md`: đối chiếu từng quy tắc BR-01–46 của Quy trình vận hành v3 với màn hình.
- Trên máy tính app hiện trong khung điện thoại 430px; trên điện thoại chiếm toàn màn hình.

## Các trang

| Trang | Màn |
|---|---|
| `bat-dau.html` | chào mừng, số điện thoại, mã OTP, vai trò, **mặt hàng (bạn có hàng gì để bán?)**, hồ sơ, xác minh, trợ giúp đăng nhập |
| `hang.html` | trang Hàng, chi tiết lô, cập nhật lượng, sắp có hàng, chứng từ, lô gộp nhiều hộ |
| `dang.html` | chọn cách đăng, chọn mặt hàng, chụp ảnh, đang nghe, kiểm tra, xem lại, đăng xong |
| `khach.html` | khách hỏi / cần mua / chờ kết nối, nhu cầu mua, yêu cầu kết nối, chat, báo giá, hẹn xem hàng, báo cáo |
| `giao-dich.html` | so tiền về tay, chọn cách giao dịch, hứa bán bao nhiêu, ký 5 bước, ký giấy, các bản, tiền cọc |
| `lich.html` | S03 đơn và lịch giao, C03 chi tiết giao dịch, kết quả cân, giao một phần, đối soát, đổi lịch, xin thay đổi, xin hủy |
| `tien.html` | tiền hàng, quyết toán, lịch sử tiền |
| `toi.html` | tôi, thông báo, dịch vụ đối tác, đặt kiểm nghiệm, cài đặt, trung tâm hỗ trợ, cần hỗ trợ, người giúp, tài khoản nhận tiền, bảo mật, quyền riêng tư, C04 phần hàng của hộ, lỗi mẫu |

Link `#id` trỏ sang màn ở trang khác được `js/app.js` tự đổi thành `trang.html#id`
(bảng `TRANG` trong `app.js`). Thêm màn mới thì thêm id vào bảng đó.
Bên bán **không có gói cước** (chỉ bên mua có Business).

## Nguyên tắc cho người ít biết chữ

1. Hình đi trước, chữ đi sau: mỗi nút có icon vẽ riêng, chữ 1–3 từ.
2. Màn nào cũng có nút **Nghe** ở góc phải trên (dùng giọng đọc tiếng Việt của máy, `speechSynthesis`, lời đọc viết sẵn trong `data-read`).
3. Nói hoặc chụp thay vì gõ; không bắt nhập số chưa đo (ghi "ước tính").
4. Mỗi màn một câu hỏi, thanh bước có số và dấu tích.
5. Số to, tiền đọc thành lời; so tiền bằng thanh dài ngắn.
6. Không có gì tự xảy ra: đăng, ký, đồng ý kết quả đều do người dùng bấm; im lặng không phải đồng ý.

Trạng thái luôn có **hình dạng + màu + chữ**: tròn = xong/đồng ý, vuông = chờ/ước tính,
tam giác = cần xem/đối soát. Viền liền = số đã cân, viền đứt = số ước tính.

## Cấu trúc

```
index.html        mục lục 51 màn
*.html            8 trang app, mỗi trang nhiều màn, chuyển bằng #hash
nhan-dien.html    bảng nhận diện
css/app.css       hệ màu, chữ, thành phần
css/fonts.css     Be Vietnam Pro + Baloo 2 (tự lưu, OFL)
js/app.js         chuyển màn, thanh điều hướng, icon nét, đọc to, OTP, chọn/bật tắt, mất mạng, cài đặt
assets/           SVG vẽ riêng
fonts/            WOFF2 + giấy phép
```

### Asset vẽ riêng (`assets/`)

- `linh-vat-*.svg`: bé Mầm (hạt vàng nảy mầm) — `chao`, `nghe`, `mung`.
- `ic-*.svg`: 13 icon màu (nét 2,5, chấm vàng là dấu hiệu riêng).
- `sp-*.svg`: hình mặt hàng (xoài, thanh long, sầu riêng, tôm, lúa, cà phê, heo, gà, cá) — chỉ để chọn mặt hàng, không thay ảnh thật của lô.
- `mark.svg`: logo AgiViet (mặt trời vàng, hai lá xanh lá/xanh ngọc, lấy từ nhận diện AgiViet cũ của ~/rnd idea); `mark-trang.svg`: bản trên nền tối; `mark-mam-cu.svg`: dấu Mầm kết nối cũ, giữ để tham khảo. `hoa-tiet-luong.svg`: họa tiết luống đồng.
- `anh/mh/*.jpg` (78 mặt hàng, 320px) và `anh/linh-vuc/*.jpg` (4 lĩnh vực): ảnh Wikimedia Commons chép từ ~/rnd idea, nguồn và giấy phép ở `nguon-anh.html` (`anh/nguon.json`).

### Bộ chọn mặt hàng

`js/chon-hang.js` + `js/danh-muc.js` (danh mục chép từ `~/rnd idea/src/core/catalog.js`). Đặt `<div data-chon-hang="ten" data-che-do="nhieu|mot" data-mac-dinh="mango">` vào màn; lựa chọn lưu ở localStorage `am.hang.<ten>`, phần tử `[data-hang-tom-tat="ten"]` hiện tóm tắt. Đang dùng ở `bat-dau.html#mat-hang` (chọn nhiều) và `dang.html#chon-mat-hang` (chọn một).
