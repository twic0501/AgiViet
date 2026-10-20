# Đối chiếu app bên mua với Quy trình vận hành v3 và Đặc tả kiến trúc v4 (30/9/2026)

Tài liệu gốc: `~/Downloads/AgriMatch_Quy_trinh_van_hanh_v3.md` và `~/Downloads/AgriMatch_Dac_ta_kien_truc_v4.md` (BR-01–46, E01–16, T01–44).
App có 30 màn trên 12 trang, xem được ở gói Miễn phí (`?goi=free`) và Business (`?goi=bus`). Tên thương hiệu **AgiViet**. Chỉ là giao diện, số liệu mẫu.

## Bản đồ màn (mục 3)

| Mã | Tên trong quy trình | Ở app |
|---|---|---|
| B01 | Nhu cầu mua | `nhu-cau.html`, `ke-hoach.html` |
| B02 | Nguồn hàng | `nguon-hang.html`, `moi-quen.html` |
| B03 | Đơn và lịch nhận | `don-hang.html` |
| B04 | Thanh toán | `cong-no.html` (+ hóa đơn phí dịch vụ) |
| C01 | Tin nhắn | `tin-nhan.html` |
| C02 | Tôi · gói | `to-chuc.html` (thành viên, gói và thanh toán, hồ sơ tổ chức) |
| C03 | Chi tiết giao dịch | `don-hang.html#chi-tiet-don`, `#thoa-thuan`, `#nghiem-thu`, `#doi-soat` |

## Quy tắc v3 đã thể hiện

| Quy tắc | Thể hiện trên giao diện |
|---|---|
| Mục 4 · ba lớp | Bảng so sánh gói: đơn, xác nhận trên app, ghi cân đo, phản đối, lưu bằng chứng **miễn phí ở cả hai gói**; Business là công cụ quản lý; dịch vụ hỗ trợ theo đơn là **tự chọn**, Business được ưu đãi 0,3%. |
| **BR-05** | Thanh lượt hiện **đã dùng + đang tạm giữ** (vd. 3 đã dùng, 2 đang giữ = 5/5). Hộp thoại hết lượt giải thích: gửi lời mời/hỏi giá tạm giữ 1 lượt, từ chối/hết hạn 7 ngày/rút thì trả lại; không gửi được quá số lượt còn. Mọi thông báo “đã gửi lời mời” nói tạm giữ. |
| BR-06, **BR-41** | Thỏa thuận mới: bảng phí 3 phần (kích hoạt [chưa chốt] trừ vào phí thành công, mốc ký qua đối tác [chưa chốt], phí thành công 0,8%/0,3% có trần); mỗi bên thấy một con số tối đa; ai trả có thêm “Người bán trả hết (người bán đề nghị)”. |
| **BR-08** | Ghi thanh toán: cảnh báo **“Tài khoản nhận tiền đổi ngày 2/10”**, nhắc gọi hỏi lại qua số đã biết; nói rõ app không chặn được tiền chuyển theo hướng dẫn ngoài app. |
| BR-10 | Chi tiết lô có dòng **“Xác nhận còn hàng: lần cuối …”**. |
| BR-12 | Giá tham khảo có nguồn; “chưa đủ dữ liệu để so cùng quy cách, điểm giao, kỳ trả”; báo giá riêng không gộp thành giá công khai (bỏ ngưỡng “3 đơn trong 30 ngày”). |
| BR-13 | Sau cuộc gọi chỉ hỏi có đổi giá/lượng/lịch không; không AI tóm tắt. |
| BR-15 | Người ký: Miễn phí nhận link ký, không chiếm tài khoản. |
| BR-18, BR-19 | Nhập kết quả: số nhập mang nhãn **Tự khai** tới khi người bán xác nhận; số trái đo theo quy trình QT-1 đã ký. |
| BR-21, BR-23 | Không tự trừ tiền, không tự phạt. |
| BR-22 | “Chưa xác nhận” là **Chờ đối chiếu**, nhắc theo hạn trong đơn (bỏ “48 giờ”), không tự coi là nợ quá hạn. |
| BR-33 | Miễn phí 1 tài khoản, Business 3 tài khoản; người ký khách mời không chiếm chỗ. |
| BR-34 | Tổng quan Business: **“Phí dịch vụ tháng này thấp hơn tối đa 664.000 đ”** kèm giải thích đây là mức tối đa, so với 1,5 triệu tiền gói; trang gói ghi tương tự. |
| Mục 25 · kỳ | Kỳ lượt và kỳ thanh toán Business theo **tháng dương lịch**, tháng đầu tính theo ngày; hết Business thì về hạn mức Miễn phí ngay (lượt còn = 5 − đã dùng); dịch vụ đã chốt giữ 0,3% trong phạm vi. |
| **BR-35** | Kế hoạch mua tính **mọi đơn, kể cả tự giao dịch** (Đ-0247), tách cam kết / thực hiện. |
| **BR-39** | Danh sách đơn có đơn **tự giao dịch không phí**; thỏa thuận mới có **cửa sổ giao (tối đa 90 ngày)**, **thuộc hợp đồng khung**, bỏ “± 3%” tự thêm (dung sai do hai bên ghi). |
| **BR-40** | Thỏa thuận mới có khối **Phạm vi hỗ trợ đủ 7 mục**; chi tiết đơn ghi phí khóa trong phạm vi (≤ 12 tấn, giao tới 15/10, phục vụ tới 14/11); danh sách kiểm tra có mục phạm vi và cửa sổ giao. |
| **BR-43** | Hồ sơ tổ chức: **“Người bán thấy gì về bạn”** (đơn đã quyết toán, đúng hạn 19/21 đợt, thời gian trả, năng lực), nút xem dữ liệu gốc và **yêu cầu sửa**; dưới 3 đơn hiện “chưa đủ dữ liệu”. |
| **BR-44** | Lớp 3 thỏa thuận: phí đo lại “nhà máy ứng trước, chịu cuối theo kết quả” (bỏ “bên sai trả”), thêm hòa giải và cơ chế tiếp theo, giải thích trạng thái cuối. Màn đối soát ghi đủ các bước và trạng thái **“Chưa giải quyết được, đã chuyển cơ chế tiếp theo”**. |
| **BR-45** | Công nợ có bảng **Hóa đơn phí dịch vụ** (phát hành theo đợt, hạn 7 ngày, phần tranh chấp chưa tính); quá 15 ngày chỉ tạm dừng bật hỗ trợ đơn mới. |
| **BR-46** | Chi tiết lô có nút **Hỏi giá riêng lô này**: không đăng tin công khai, không tốn lượt tin mua, tạm giữ 1 lượt kết nối. |
| Mặt hàng khác | Tạo nhu cầu: lựa chọn **“Mặt hàng khác, tự nhập…”**, tin mua mang nhãn “Tự nhập”. |

## Chưa làm

- Tab/nhãn nguồn chi tiết từng dòng ở màn đơn (hiện ghi ở màn nhập kết quả).
- A01 và phần hệ thống (khóa nguyên tử, idempotency, tra tên tài khoản).
- Các **trường phải điền** trước pilot giữ trong ngoặc vuông.
