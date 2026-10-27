# AgiViet v2: đối chiếu hai bản mẫu bằng bằng chứng

Ngày kiểm **27/10/2026**, tại `/home/twictrn/agiviet-production-v2`. Đây là báo cáo đối chiếu; **không sửa mã app, không deploy, không reset dữ liệu pilot**. Các lần tạo/đổi trạng thái đơn và tua đồng hồ phục vụ kiểm thử chạy trong PGlite cô lập. Trên pilot chỉ đọc, tạo phiên đăng nhập thử và mở màn. SHA256 trước/sau được lưu để kiểm lại phạm vi thay đổi.

## Kết luận để quyết định giữ / chuyển / bỏ

**Phản ánh mất tính năng có cơ sở.** V2 chưa có chat, uy tín hai chiều, tách loại, luồng gộp lô/chia tiền HTX, kho thương mại và đặt dịch vụ theo đối tác. Nhật ký, bán gấp, đặt trước và bao tiêu đã có phần xử lý API nhưng màn bán vẫn ghi “Đang làm, sắp có”. Chúng không được tính là luồng người dùng đã dùng được.

**Không có cơ sở nói v2 chưa kiểm chứng bất kỳ luồng nào ở mọi tầng.** Chạy lại bộ API v2 đạt **65/65 tình huống, 475/475 điểm kiểm**; bộ máy mẫu 1 đạt **76/76 ca B*/M*, 183 điểm kiểm**. Đây là kiểm trong bộ nhớ/PGlite, chưa chứng minh chạy giao diện hoặc chạy PostgreSQL đồng thời. [Kết quả v2](bang-chung/du-lieu/kiem-thu-v2.json), [kết quả mẫu 1](bang-chung/du-lieu/kiem-thu-mau1.json).

**Luồng giao diện chính chưa đạt.** Lượt chạy giao diện cô lập đi qua chào giá → hai bên ký OTP → ngân hàng mô phỏng nhận cọc → báo/nhận tiền trả thẳng → chuẩn bị QR, rồi dừng vì ô người bán nhập mã bắt đầu cân bị ẩn sai quyền. Có **9 bước đạt, bước thứ 10 không đạt**. Chạy chẩn đoán tiếp được tới đơn hoàn tất sau khi gọi API thay đúng bước bị chặn: con số “15/15” trong log chẩn đoán **không được báo thành E2E thuần đạt**. [Log lỗi trên selector hiện hành](bang-chung/du-lieu/e2e-v2-hien-hanh.log), [ảnh lỗi](bang-chung/anh-e2e-chan-doan/LOI-quyen-bat-dau-can.png), [quyền và trạng thái lúc bỏ qua UI](bang-chung/anh-e2e-chan-doan/bo-qua-ui.json), [log chẩn đoán](bang-chung/du-lieu/e2e-chan-doan.log).

Chuyển riêng 5 nhóm kỳ vọng gốc sang API v2 để kiểm bổ sung: **3 nhóm đạt, 2 nhóm không đạt; 19/21 điểm kiểm đạt**. B08 không tự ẩn sau 14 ngày; B18 đóng/trả lượng nhưng mất lý do từ chối cụ thể ở dữ liệu nghiệp vụ trả ra. B16/M09 chặn giữ quá lượng tuần tự, B17 không giữ lượng hai lần, B44 đạt đúng phép tính `850×25.000 + 50×15.000 = 22.000.000` và điều kiện ảnh. Đây là adapter một phần, không thay tất cả 76 ca hoặc kiểm concurrency. [Kết quả và phạm vi từng adapter](bang-chung/du-lieu/ca-chuyen-v2.json).

Các lỗi chặn phải xử lý trước khi gọi bản v2 dùng được: sai quyền bắt đầu cân; API không trả cờ ký nghiệm thu mà UI đang đọc; hợp đồng bao tiêu demo lỗi 500; thiếu tự ẩn tin 14 ngày; người bán chỉ truy cập đợt giao đầu; các luồng cốt lõi còn màn giữ chỗ. Xem các dòng NV11, NV22, NV24–NV26, B08, B18. Không chuyển nguyên engine localStorage hoặc state viết cứng của prototype vào v2 để chữa những lỗi này.

## Nguồn và giới hạn baseline

| Ký hiệu | Nguồn dùng để so | Kiểm được trong lần này |
|---|---|---|
| **M1-src** | `/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4/` | Chỉ đọc. `cau-hinh.js` đăng ký **85 màn bán, 53 màn mua**; 44 ca B + 32 ca M. Đã đọc các renderer và luật liên quan, chạy lại toàn bộ 76 ca trên engine mẫu. Số màn khác ước lượng 82 trong giao việc. |
| **M1-live** | [agiviet-23a94.web.app](https://agiviet-23a94.web.app/) | **Không đồng nhất M1-src.** HTML `ban/bat-dau.html`, JS bán `app.js` và JS mua `app.js` khác SHA256 local; `he-thong.js` bán trùng; live có `kho-mau.js` mà local không có. Sáu đường JS của khung/engine mới trả 404. Chưa chứng minh TS engine đã deploy. [Hash, URL và bản tải](bang-chung/du-lieu/live-mau1-so-file.json), [các đường 404](bang-chung/du-lieu/doi-chieu-live-mau1.json). Bảng “mẫu 1” mặc định là **M1-src**, không đánh tráo thành kết quả live. |
| **M2** | `/home/twictrn/Documents/AgiViet/` | CSV có **141 dòng**: 80 bán, 49 mua, 11 vận hành, 1 web; 12 luồng. `AgiViet_app_ban.html` có registry 82 màn. Đã render 5 HTML gồm hai app, hai bố cục và `thiet-ke-lai`; không pageerror trong lượt mở. [Registry HTML](bang-chung/du-lieu/man-mau2-html.json), [ảnh và nội dung render](bang-chung/du-lieu/mau2-render.json). Không coi danh mục/brief là bằng chứng hoàn thành tính năng; các đánh giá motion ngày 22/10 là ghi nhận lịch sử, chưa chứng minh mọi lỗi ấy còn trong tất cả HTML hiện tại. |
| **V2-live** | `http://127.0.0.1:18888`, quản trị `:18889` | Phiên thử Năm / Thịnh, quản trị Tâm. Basic pilot đúng thông tin giao việc. Health báo `moi_truong=thu`, DB `pg:57`; đồng hồ nghiệp vụ ở 02/11/2026, khác ngày kiểm thật. 18888 cố ý chặn test/sim/quản trị; không tính chặn này là mất công cụ. [Health](bang-chung/du-lieu/health.json). |
| **V2-cô lập** | API/UI `:18980/:18990`, fixture tranh chấp `:19080/:19090` | Cùng mã app; PGlite trong bộ nhớ, tài liệu trong `/tmp/agv-audit-*`. Có reset/tua/chuyển tiền ảo riêng cho kiểm thử. Không phải ngân hàng thật, microphone thật hay bằng chứng triển khai công khai. |
| **PV/NC** | `docs/nghien-cuu/` và `docs/nghiep-vu/` của v2 | Tìm được một đầu vào phỏng vấn doanh nghiệp được tóm tắt rõ tại `01-xac-minh-nguoi-ban-co-nhan-vien.md:11`; tách thành 7 nhu cầu. Không có bản ghi âm/biên bản gốc để kiểm độc lập, không coi bài phỏng vấn doanh nghiệp nước ngoài trong nghiên cứu là khách AgiViet. Đề xuất nghiên cứu được đánh dấu riêng. |

M2 có nhiều thế hệ điều hướng: mẫu 1 bán có **6 mục Hôm nay / Vườn / Đăng / Bán / Đơn / Tiền**; brief mẫu 2 có **5 mục Trang chủ / Bán hàng / Đăng / Tin nhắn / Ví**; v2 là **Hôm nay / Bán hàng / Đăng / Đơn hàng / Tiền**. Mẫu 1 Đơn là đơn/lịch, chat ở Khách; mẫu 2 Tin nhắn gồm thông báo và hội thoại. Không có bằng chứng cho giả định “Đơn hàng của cả hai mẫu đều chứa tin nhắn, thông báo và lời chào”. Đối chiếu nằm ở UX01–UX03, không tự chọn lại shell trong audit.

Đặc tả v2 `docs/nghiep-vu/00-tong-quan.md:57` chủ động loại ứng tiền, sổ vườn đầy đủ và một số tiện ích khỏi MVP; tin tức/thời tiết đã được bổ sung sau đó. Vì vậy một số mất mát là thay đổi phạm vi được ghi trong tài liệu, **vẫn là thiếu so với mẫu**, không tự động là lỗi lập trình. Người sáng lập cần quyết định phục hồi phạm vi nào; audit không thực hiện quyết định ấy. Tương tự, cọc 30%, tiền trả thẳng và tranh chấp theo dòng là khác chính sách, không được đánh dấu sai chỉ vì khác mẫu 1.

## Cách đọc bảng và bằng chứng

- Mỗi dòng là một màn, quy tắc, ca kiểm, nhu cầu hoặc lượt ảnh/header. Các lớp có giao nhau; tổng dòng **không** là tổng tính năng độc lập hoặc phần trăm hoàn thành.
- **Có**: thấy phần được mô tả với bằng chứng nêu tại dòng; không suy ra E2E. **Thiếu**: chưa có phần UI/luồng cần thiết trong phạm vi route/renderer/API đã đối chiếu; nếu có backend/schema, dòng ghi rõ. **Khác**: khác cấu trúc hoặc chính sách. **Làm sai**: có mâu thuẫn được tái hiện hoặc chỉ ra bằng hai phía mã/API. **Chưa kiểm**: thiếu bằng chứng để kết luận. Không dùng “chưa kiểm” như đồng nghĩa “thiếu”.
- `fe-*` và `dong-co/*` là đường dẫn dưới M1-src; `AgiViet_*`, `bo-cuc-*`, `thiet-ke-lai` dưới M2; `frontend/`, `backend/`, `db/`, `docs/` dưới v2. Số sau `:` là dòng tệp tại thời điểm kiểm. [Danh mục SHA256](bang-chung/du-lieu/nguon-truoc.json).
- Ca B*/M* ghi nguyên kỳ vọng mẫu, luồng v2 gần nhất, các TH/GD đã chạy và phần chưa chuyển. TH đạt không được tự đổi thành B*/M* đạt. Một số adapter nêu rõ đủ hay một phần kỳ vọng.
- Ảnh có URL, chữ màn, lỗi HTTP/JS, form, vị trí header trước/sau cuộn trong [manifest ảnh](bang-chung/du-lieu/man-v2.json). Ảnh lỗi/403–404/429, route thử sai hoặc giả token không được tính là màn nghiệp vụ đã hoạt động. Lượt chụp có điều tiết tạo ra timeout ở danh sách nguồn; đã chụp lại **không tiết lưu** thành công, không quy timeout do bộ chụp thành lỗi mất màn. Các lượt 429 được giữ riêng trong log.
- “Header cố định” trong bảng là **tiêu đề màn**, không chỉ logo thương hiệu; sticky được coi là đúng nếu bám `top:0` sau khoảng đệm đầu. Màn không đủ cao để cuộn ghi chưa thử sticky bằng cuộn. Mỗi dòng ghi Nghe là icon/chữ/không có; các nhánh OTP/PDF/biên bản trong luồng cô lập có album E2E riêng.

[CSV để lọc](bang-doi-chieu.csv) · [Chỉ mục ảnh và trạng thái](chi-muc-anh.html) · [Độ phủ route](do-phu-route.csv) · [Cách chạy lại, các cổng và giới hạn](bang-chung/README.md)
