# Đối chiếu app người bán với Quy trình vận hành v3 và Đặc tả kiến trúc v4 (30/9/2026)

Tài liệu gốc: `~/Downloads/AgriMatch_Quy_trinh_van_hanh_v3.md` và `~/Downloads/AgriMatch_Dac_ta_kien_truc_v4.md` (BR-01–46, E01–16, T01–44).
Bản trước (đối chiếu Quy tắc v1) đã được thay. App hiện có **63 màn trên 8 trang**, tên thương hiệu **AgiViet**.
Mọi chỗ đều **chỉ là giao diện**: không có máy chủ, tiền hay chữ ký thật.

## Bản đồ màn (mục 3)

| Mã | Tên trong quy trình | Ở app |
|---|---|---|
| S01 | Hàng của tôi | `hang.html#hang`, `#chi-tiet-lo`, `#cap-nhat-luong`, `#sap-co-hang`, `#lo-gop` |
| S02 | Khách hỏi mua | `khach.html` (tin, cần mua, chờ kết nối + **hỏi giá riêng**, báo giá, hẹn xem) |
| S03 | Đơn và lịch giao | `lich.html#lich`: đơn **có hỗ trợ** và đơn **tự giao dịch** (Đ-0244) |
| S04 | Tiền hàng | `tien.html` |
| C01 | Tin nhắn | `khach.html#chat` (gọi thoại, **gọi video** mối đã kết nối) |
| C02 | Tôi | `toi.html#toi`, `#tai-khoan-nhan`, `#bao-mat`, `#rieng-tu`, `#ho-tro` |
| C03 | Chi tiết giao dịch | `lich.html#chi-tiet-don`: Điều kiện (gồm thẻ **Dịch vụ hỗ trợ**), Giao, Tiền, Hồ sơ, Hỗ trợ |
| C04 | Phần hàng của tôi | `toi.html#phan-cua-toi` |
| — | Chọn mặt hàng | `bat-dau.html#mat-hang` (chọn nhiều) và `dang.html#chon-mat-hang` (chọn một), có **Mặt hàng khác** tự nhập |

## Quy tắc v3 đã thể hiện

| Quy tắc | Thể hiện trên giao diện |
|---|---|
| BR-03, BR-04 | Như trước: không hỏi OTP; nút Cần hỗ trợ tự điền mã hồ sơ. |
| Mục 4 · ba lớp | Bên bán không có gói. `giao-dich.html#phuong-thuc` tách **Tự giao dịch** (miễn phí, vẫn có đơn, xác nhận, ghi cân, phản đối khoản trừ) và **Có hỗ trợ** (thêm người trực, điều phối, ký qua đối tác). |
| BR-05 (phía bán) | Người bán chủ động chào không trừ lượt bên mua; trả lời hỏi giá, nhận khách không tốn gì. |
| BR-06, BR-41 | Màn chọn cách giao dịch hiện **một con số “phần bạn trả, tối đa”**; chi tiết mở ra: phí kích hoạt [chưa chốt] trừ vào phí thành công, mốc ký qua đối tác [chưa chốt], phí thành công 0,8% (≈ 536.000 đ trên 67 triệu). Ai trả: Bên mua / Chia đôi (268.000 đ) / **Tôi trả hết** (người bán đề nghị, bên mua vẫn có quyền không tham gia). |
| BR-07 | Huy hiệu cụ thể; chỉ báo bên mua ghi rõ không phải bảo đảm thanh toán. |
| **BR-08** | `toi.html#tai-khoan-nhan` viết lại: áp mọi thời điểm; yêu cầu mới ở trạng thái **Chờ xác minh**; 4 bước (xác thực thêm lớp, báo số cũ + **người thân dự phòng**, chờ 24 giờ / 72 giờ sau khôi phục, **so tên chủ tài khoản**); nút **“Không phải tôi, khóa ngay”** khóa cả ngoài ca; hướng dẫn chuyển tiền cũ không tự đổi; bên mua thấy cảnh báo 30 ngày; nói rõ app không chặn được tiền chuyển ngoài app. |
| BR-09 | Chi tiết lô tách dự kiến, giữ chỗ, đã hứa, đã giao, còn trống. |
| **BR-10** | “Xác nhận lần cuối: …”; nút **Vẫn còn** một chạm; nhắc sau 24 giờ (mùa tới 7 ngày); quên thì **vẫn nhận đề nghị**, khách thấy “chưa xác nhận gần đây”; chỉ ngừng khi quá **7 ngày** (mùa tới **30 ngày**). Ví dụ tôm thẻ 32 ngày chưa xác nhận. Người giúp/HTX được xác nhận thay. |
| BR-12 | Giá tham khảo có nguồn; báo giá riêng không thành giá công khai. |
| BR-13 | Sau cuộc gọi hỏi “có đổi gì không”; không ghi âm, không tự tóm tắt. |
| Mục 8 · đề nghị thay thế | Màn báo giá có ô tùy chọn **“Nơi khác đang trả bạn bao nhiêu?”**, phân biệt lời hỏi / có giấy; không hiện cho bên mua. |
| Mục 8 · video | Người bán **gọi video** mối đã kết nối (còn 52/60 phút). |
| BR-14 | Hợp đồng mua bán, dịch vụ AgiViet, dịch vụ đối tác tách riêng; không hồi tố. |
| BR-15 | Màn xác nhận ký phân biệt **Xác nhận trên app** (miễn phí, OTP + nhật ký, “không phải chữ ký số”) và **Ký qua đối tác** (mốc có giá). |
| **BR-16** | Màn “Hứa bán bao nhiêu” có **giữ hàng cần cả hai bên đồng ý** và hạn giữ; quá hạn mà chưa ký đủ thì app kiểm lại lượng. |
| BR-18, BR-19 | Im lặng không phải đồng ý; số trái đo, máy đo lấy theo **quy trình đã ký**, không phải chuẩn chung. |
| BR-20, BR-21 | Đối soát tách thời hạn giữ hàng và làm rõ trách nhiệm; không tự phạt. |
| BR-22 | Tiền tách 4 trạng thái. **Nhận một phần** giờ có ô nhập số tiền và mở đối soát phần thiếu (việc còn dở ở bản trước). |
| BR-23, BR-24 | Xin thay đổi/hủy; khoảng lượng hoặc số cố định kèm cảnh báo; không tự ±5%. |
| BR-25, BR-26 | Lô gộp và C04 ghi rõ số tiền từng hộ là **phân bổ để xem**, app không chia tiền. |
| BR-28 | Trung tâm hỗ trợ: P0 tự khóa khi bấm “Không phải tôi” kể cả ngoài ca; P1 15 phút **chỉ trong ca** của đơn có hỗ trợ. |
| BR-31 | Không xóa sự kiện gốc; “Báo sai xác nhận” mở đối soát. |
| BR-32 | Màn Quyền riêng tư. |
| **BR-39** | Màn “Hứa bán bao nhiêu” và C03: một đơn giao tối đa **90 ngày**; bán thêm là **đơn mới** (mục “Bán thêm cho khách này” trong Xin thay đổi). |
| **BR-40** | Thẻ **Phạm vi hỗ trợ** đủ 7 mục (hai bên, mặt hàng, lượng tối đa, ngày giao, việc AgiViet làm, phục vụ tới, hạn chấp nhận giá); thiếu thì chưa bật. |
| **BR-42** | Kết quả cân có nhãn nguồn: **Bên mua tự khai**, **Bạn đã chứng kiến**, số của bạn là **Tự khai**; ghi chú giải thích ba nhãn. Đơn tự giao dịch vẫn ghi cân và phản đối được. |
| **BR-43** | `khach.html#ket-noi` hiện **chỉ báo bên mua có nguồn**: số đơn đã quyết toán, đúng hạn 7/8 đợt theo xác nhận người bán, thời gian trả, năng lực nhận hàng; ghi rõ không phải bảo đảm. |
| **BR-44** | Chọn hỗ trợ phải chấp nhận/sửa **phương án bất đồng mẫu** (đối chiếu [X] giờ → đo lại → hòa giải [N] ngày → trọng tài/tòa). Vụ đối soát hiện đủ 6 bước và giải thích trạng thái **“Chưa giải quyết được, đã chuyển cơ chế tiếp theo”**: phần đã xác nhận vẫn chốt, phần tranh chấp giữ riêng, không phí, không chuyển cọc, quyền khiếu nại vẫn còn. |
| **BR-45** | Quyết toán ghi phí dịch vụ là **hóa đơn riêng**, hạn 7 ngày; quá 15 ngày chỉ tạm dừng bật hỗ trợ đơn mới. |
| **BR-46** | Tab “Chờ kết nối” có thẻ **Bên mua F hỏi giá riêng**, chỉ người bán thấy, trả lời bằng báo giá. |
| E01–E16 | Màn lỗi mẫu thêm **E15** (tài khoản nhận tiền chờ xác minh) và **E16** (phí phần bạn chịu quá hạn); E05 nói rõ thiếu phạm vi / phương án bất đồng / người trả. |

## Chọn mặt hàng

- Bộ chọn hai tầng (4 lĩnh vực có ảnh → tab nhóm → lưới 78 ảnh), tìm không dấu, khay đã chọn.
- **Mặt hàng khác:** ô “+ Mặt hàng khác” cuối mỗi nhóm; tìm không ra thì có nút “Thêm “…””. Nhập tên, chọn lĩnh vực, lưu; mặt hàng mang nhãn **Tự nhập** và được chọn ngay. Ghi chú: đội AgiViet xem để thêm vào danh mục.
- Góp ý tài liệu: v3 chưa nói gì về mặt hàng tự nhập. Nên thêm một dòng vào mục 6 (đăng lô): tin có mặt hàng tự nhập hiện nhãn “Tự nhập” và vào hàng đợi duyệt danh mục, không bị chặn đăng.

## Chưa làm, hoặc nằm ngoài giao diện người bán

- A01 Hàng đợi hỗ trợ (màn nhân viên vận hành).
- Hệ thống: tạm giữ lượt, khóa nguyên tử, idempotency, tra tên tài khoản (BR-29, 30; mục 12 kiến trúc). Giao diện chỉ hiện đúng trạng thái.
- Các **trường phải điền** trước pilot (phí kích hoạt, giá mốc ký, X/N trong phương án bất đồng, đơn vị kiểm định, hotline) hiện trong ngoặc vuông.
- Đo lường pilot (mục 31): đã có ô “đề nghị thay thế” ở báo giá; nhật ký công việc là việc của đội vận hành, không thuộc app bán.
