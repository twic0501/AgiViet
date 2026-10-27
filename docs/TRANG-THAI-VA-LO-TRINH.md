# AgiViet production v2 · Trạng thái và lộ trình

Cập nhật: 27/10/2026, 05:30 (Claude). Đây là tệp để người sáng lập theo dõi và chỉnh. Mỗi dòng có trạng thái thật, không làm đẹp:
**XONG** = chạy và đã kiểm · **DỞ** = có một phần · **CHƯA** = chưa làm · **CHỜ BẠN** = cần quyết định.

Đường dẫn gốc: `~/agiviet-production-v2/`. Bản chạy công khai: https://agiviet.id.vn (laptop + Cloudflare Tunnel).

---

## 1. Đã có gì (thống kê)

| Phần | Trạng thái | Số kiểm thật | Ở đâu |
|---|---|---|---|
| Đặc tả nghiệp vụ (13 tài liệu, 63 tình huống) | XONG | — | `docs/nghiep-vu/` |
| Cơ sở dữ liệu (55 migration, sổ cái kép, máy trạng thái, `cmd.*`, RLS) | XONG | 550/550; tấn công 45/45 bị chặn | `db/` |
| Backend (Fastify, chạy được PostgreSQL thật) | XONG | 59/59 tình huống, 430 bước (PGlite); 56/56 trên PostgreSQL thật | `backend/` |
| Thời tiết, tin tức, lịch sử người bán (API) | XONG | 3 ca mới đạt | `backend/src/nghiep-vu/tien-ich.ts` |
| Bảo mật (thư viện, kiểm thử) | XONG | 79/79 unit | `security/` |
| Dịch vụ AI ghép cung cầu (có dự phòng bằng luật) | XONG | — | `ai/` |
| Hạ tầng Oracle (đóng gói ARM, Caddy, sao lưu, chặn tràn chi phí) | DỞ: chưa có máy Oracle | 14/14 kiểm cục bộ | `infra/oracle/`, `docs/ha-tang/` |
| Chạy tạm qua Cloudflare Tunnel | XONG | /ban, /mua chạy; /quan-tri và API thử bị chặn từ ngoài | `infra/local-tunnel/` |
| App mua | DỞ: chạy đủ luồng, giao diện kiểu cũ | unit 50/50, luồng thuận 15/15 | `frontend/mua/` |
| App bán (thiết kế "Sổ làm ăn") | DỞ: xem mục 2 | | `frontend/shared/seller.js`, `frontend/ban/seller.css` |
| Quản trị chỉ chạy trên laptop | DỞ: có màn, tạo case chưa xong | | `frontend/quan-tri/` (http://127.0.0.1:18889/quan-tri/) |
| Tài liệu quy trình HTML | XONG (bản 1) | | `docs/quy-trinh/index.html` |
| Nghiên cứu (xác minh người bán; mặt hàng) | XONG 01–04 | | `docs/nghien-cuu/` |
| Nghiên cứu (dịch vụ đi kèm, danh mục mở, mạng lưới) | DỞ: 05–07 | | Codex chạy tiếp lúc 05:46 |

## 2. App bán: từng màn (cập nhật 27/10 05:30)

Cấu trúc: Hôm nay · Bán hàng (Hàng của tôi / Lời chào / Bên mua cần) · + Đăng · Đơn hàng · Tiền · menu ảnh đại diện. Chi tiết ở `docs/frontend/kien-truc-app-ban.md`.

| Màn | Trạng thái | Ghi chú |
|---|---|---|
| Vào app, OTP (tick "Mã đúng") | XONG | |
| Hôm nay (tiền, 4 lối tắt vườn/thông tin, Cần làm ≤3, thẻ Vườn) | XONG | |
| Bán hàng · Hàng của tôi / Lời chào / Bên mua cần | XONG | lô 0 kg tự vào "Đã đóng" |
| Chi tiết lô (Xác nhận còn hàng, Bán gấp, Đóng lô, chụp ảnh, hồ sơ xác minh) | XONG | Bán gấp mở màn "đang làm" tới khi có API |
| Lời chào (chi tiết) | XONG | |
| Đăng hàng | XONG | mặt hàng tạm lấy từ lô cũ, chờ API mặt hàng đã xác minh |
| Đơn hàng (danh sách, tổng quan đơn) | XONG | |
| Hợp đồng + ký OTP | XONG | |
| Cọc | XONG | |
| Xác nhận tiền về (thiết kế mục 4) | XONG | |
| Giao nhận, QR, nghiệm thu | DỞ: nội dung cũ trong khung mới | lượt sau |
| Tính tiền cuối, Giấy tờ, Sự cố, Sửa, Hủy | DỞ: nội dung cũ trong khung mới | |
| Tiền | XONG | |
| Thời tiết, Tin giá, Lịch sử, Thông báo | XONG | |
| Tổ chức | DỞ: chỉ sửa danh sách vai mời | |
| Nhật ký vườn, Bán trước mùa (đặt trước, bao tiêu), Bán gấp | CHƯA: CSDL Codex xong 0056–0057, chờ API backend | |
| Hướng dẫn rọi đèn (trang chủ, lời chào, đơn, tiền, đăng hàng) + dòng nhắc 1 lần | XONG | |
| Khung app (đầu trang dính, thanh dưới Material 3, bàn phím) | XONG trên web; chưa kiểm bàn phím trên iPhone thật | |
| PWA (cài vào máy, mở khi mất mạng) | XONG | |

## 3. Hiệu ứng (`Documents/AgiViet/hieu-ung-asset/index.html`, 39 mục)

Đã gắn: **4/24** hiệu ứng app, **trâu dùng 6/12 tư thế** (ảnh tĩnh ở dòng nhắc, chuyển động ở hướng dẫn).

| Hiệu ứng | Trạng thái | Gắn vào đâu |
|---|---|---|
| Vào màn / quay lại | XONG | mọi màn |
| Đang gửi → Đã lưu (tick xanh) | XONG | mọi nút gửi lệnh thành công |
| Báo nhanh | XONG | thông báo sau mỗi thao tác |
| Số tiền vừa được xác nhận (đếm số) | XONG | trang chủ, lời chào |
| Danh sách nổi lần lượt | CHƯA | danh sách việc, đơn |
| Đổi tab | CHƯA | (app bán không còn tab) |
| Chọn thẻ | CHƯA | chọn loại hàng, cân/ước |
| Nhập chưa đúng | CHƯA | lỗi form |
| Mở khóa nút | CHƯA | nút ký khi đã tick đọc hợp đồng |
| Tiền về ví (xu bay) | CHƯA | khi ngân hàng chi cọc |
| Dòng bước tiến lên | CHƯA | dải 5 bước khi đơn sang chặng mới |
| Đổi trạng thái | CHƯA | chip trạng thái đơn |
| Hạn trả lời (đếm ngược) | CHƯA | thẻ "tới lượt" |
| Kết quả nghiệm thu 3 phần | CHƯA | màn nghiệm thu |
| Điều kiện đã đủ | CHƯA | thẻ "sẵn sàng giao" |
| Lời chào mới tới | CHƯA | trang chủ |
| Bên kia đang gõ | CHƯA | (chưa có tin nhắn) |
| Mã ký OTP (ô số hiện lần lượt) | CHƯA | màn ký |
| Ký và đóng dấu | CHƯA | sau khi ký, biên bản |
| Mở liên lạc sau cọc | CHƯA | khi cọc vào |
| Mất / có lại kết nối | CHƯA | thanh trên cùng |
| Đang tải | CHƯA | khung chờ |
| Xe trên tuyến | CHƯA | giao nhận |
| Giá tham khảo 30 ngày | CHƯA | đăng hàng, lời chào |
| Đang nghe giọng nói | CHƯA | (chưa có đăng bằng giọng nói) |
| Kịch bản: Đăng lô bằng giọng nói / Ký hợp đồng và cọc / Nghiệm thu đến hoàn tất | CHƯA | dùng cho phòng thử |

## 4. Đang chờ bạn quyết

1. Hộp đăng nhập pilot trên agiviet.id.vn: (a) bạn tự cho phép bỏ khóa, hoặc (b) giữ khóa, đổi mật khẩu dễ nhớ. Claude bị chặn tự bỏ vì là thao tác làm yếu bảo mật.
2. Danh mục thí điểm theo chấm điểm (`docs/nghien-cuu/03`): chanh không hạt 82, bưởi da xanh 78, xoài cát Chu 77, lúa tươi 68; hoãn tôm, cá tra, rau giao đêm. Có đổi đặc tả theo không?
3. 3 bổ sung từ phỏng vấn: mẫu thử trước đơn đầu, trả sau trong hạn mức, hồ sơ năng lực có nhãn "đã kiểm / tự khai".
4. 8 câu hỏi chính sách cũ (thang phạt thiếu lượng, giá gói, vùng thí điểm…), cách tính tháng đầu của gói, quyền mặc định người giúp, dữ liệu ảo Sáu → Tư Hùng.

## 5. Lộ trình (thứ tự làm, ai làm)

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| 1 | Làm lại các màn app bán còn kiểu cũ: xác nhận tiền về, hợp đồng + ký OTP, cọc, giao nhận + QR + nghiệm thu, danh sách hàng/đơn | Claude | Đang làm |
| 2 | Gắn 20 hiệu ứng còn lại vào đúng màn (bảng mục 3) | Claude | Đang làm cùng #1 |
| 3 | CSDL: nhật ký canh tác, mặt hàng đã xác minh, đặt trước khi hái, bao tiêu, bán gấp, thêm xe ảo | Codex | Hẹn 05:47 |
| 4 | Backend cho #3 | Claude | Sau #3 |
| 5 | Giao diện cho #3 (thay các màn "đang làm") | Claude | Sau #4 |
| 6 | Quản trị: tạo tình huống thử, ngân hàng ảo; dọn dữ liệu rác, đặt lại dữ liệu sạch | Codex | Hẹn 05:46 |
| 7 | Phòng thử riêng cho từng người dùng (chọn vai, chọn tình huống, thị trường giả, AI đóng vai bên kia bằng model nhẹ chạy trên máy) | Backend Claude + giao diện Codex | Chưa bắt đầu |
| 8 | Nghiên cứu 05–07 → bản quyết định ngắn cho bạn chốt | Codex rồi Claude tổng hợp | Hẹn 05:46 |
| 9 | App mua làm lại theo thiết kế "Sổ làm ăn" | Codex | Chưa |
| 10 | Landing page agiviet.id.vn (dùng tài liệu quy trình) | Sau cùng | Chưa |
| 11 | Đưa lên máy chủ thật (Oracle / Azure / Google Cloud) | Bạn tạo máy, Claude/Codex triển khai | Chờ máy |

## 6. Vấn đề đã biết

- Dữ liệu thử có nhiều đơn và lời chào rác từ các lượt kiểm tự động; chưa đặt lại được vì bộ chạy cục bộ thiếu cấu hình đặt lại PostgreSQL.
- Tình huống "đang nghiệm thu" và "tiền đã về" của chị Năm chưa tạo được do kẹt lịch 2 xe ảo.
- Giới hạn gửi OTP: một số điện thoại thử bị chặn 5 phút sau vài lần đăng nhập. Nhiều người cùng thử một tài khoản sẽ bị chặn, cần phòng thử riêng (#7).
- Bộ kiểm thử bảo mật gốc trong `security/` dừng ở dữ liệu OTP mẫu, chưa ra số đạt/tổng.
- Trâu chuyển động (WebGL) chưa kiểm trên điện thoại thật.
