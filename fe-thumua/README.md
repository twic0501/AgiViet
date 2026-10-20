# fe-thumua — Giao diện app Thu mua (AgiViet)

Giao diện HTML/CSS/JS thuần cho **bên mua** (doanh nghiệp, nhà máy, vựa), bám theo
*Quy trình vận hành v3* và *Đặc tả kiến trúc v4* (~/Downloads/AgriMatch_*_v3.md, _v4.md); đối chiếu ở `DOI-CHIEU-QUY-TAC.md`. Chỉ là giao diện: số liệu mẫu, không có máy chủ.
Dự án tách riêng, bên bán ở `~/fe-nongdan`.

## Mở xem

- Mở `index.html`: mục lục 30 màn, mỗi màn có nút xem ở gói **Miễn phí** và **Business**.
- Trong app, thanh trên cùng có công tắc "Xem gói" để đổi qua lại (bản mẫu).
  Thêm `?goi=free` hoặc `?goi=bus` vào đường dẫn để mở thẳng một gói; lựa chọn được nhớ trong trình duyệt.
- Máy tính là chính (thanh bên trái). Dưới 960px chuyển sang thanh điều hướng dưới.
- `GOP-Y-NGHIEP-VU.md`: các điểm nghiệp vụ/vận hành cần quyết định.

## Hai gói thể hiện thế nào

| | Miễn phí | Business |
|---|---|---|
| Thanh bên | thẻ lượt tháng (kết nối 5/5 hết, tin 4/5, AI 8/10) + nút Nâng Business | thẻ Thử Business, lượt 18/50, 7/30, video 45/120 phút, tài khoản 3/3 |
| Hết lượt | hộp thoại giải thích cách tính lượt, việc vẫn làm được, ngày mở lại, ưu đãi Business | làm được, báo số lượt còn |
| Tính năng Business | màn khóa có xem trước mờ + danh sách ưu đãi | mở đầy đủ, gắn nhãn Business |
| Phí giao dịch có hỗ trợ | 0,8% · trần 3 triệu | 0,3% · trần 1,5 triệu |

Trong HTML: `.chi-free` chỉ hiện ở Miễn phí, `.chi-bus` chỉ hiện ở Business.
Nút cần lượt dùng `data-luot="ket-noi|tin|ai|video|thanh-vien|excel|ke-hoach"`: ở Miễn phí mở hộp thoại,
ở Business hiện `data-ok` (và đi tới `data-den` nếu có). Nội dung hộp thoại ở bảng `HOP` trong `js/app.js`.

## Các trang

| Trang | Màn |
|---|---|
| `tong-quan.html` | tổng quan |
| `nhu-cau.html` | nhu cầu mua, tạo nhu cầu, chi tiết + nguồn phù hợp |
| `nguon-hang.html` | tìm nguồn (bộ lọc cứng), chi tiết lô, hồ sơ người bán |
| `bao-gia.html` | báo giá, so báo giá (AI ở Business), gửi báo giá |
| `tin-nhan.html` | tin nhắn hai khung |
| `don-hang.html` | đơn, chi tiết đơn, soạn thỏa thuận + nghiệm thu 3 lớp, nhập kết quả cân đo, đối soát, lịch tháng |
| `cong-no.html` | công nợ, ghi thanh toán |
| `moi-quen.html` | mối quen, nhập Excel (Business) |
| `ke-hoach.html` | kế hoạch mua, thiếu hàng (Business) |
| `dich-vu.html` | kiểm định, xe, kho; yêu cầu → báo giá → đặt |
| `to-chuc.html` | thành viên và quyền, gói và thanh toán, hồ sơ tổ chức |
| `goi.html` | so sánh gói, dùng thử Business, đã bật |

Link `#id` sang trang khác được `js/app.js` tự đổi thành `trang.html#id` (bảng `TRANG`).
Khung (thanh bên, thanh trên, điều hướng điện thoại) do `js/app.js` dựng quanh `<main>`.

## Cấu trúc

```
index.html      mục lục
*.html          12 trang, mỗi trang nhiều màn (.man), chuyển bằng #hash
css/app.css     hệ giao diện (màu Sông trầm #315C60, Be Vietnam Pro)
css/fonts.css   font tự lưu (OFL)
js/app.js       khung, gói, hạn mức, hộp thoại, chọn/bật tắt, icon nét
assets/         dấu Mầm kết nối, icon, hình mặt hàng (dùng chung với fe-nongdan)
```
