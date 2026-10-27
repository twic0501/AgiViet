# Chấm ảnh app bán AgiViet theo thiết kế “Sổ làm ăn”

Ngày 27/10/2026. Đối tượng: người bán nông sản 35–60 tuổi, đọc chữ chậm. Người chấm: Codex. Đây là đánh giá giao diện tại thời điểm chụp, không phải kết quả thử sử dụng với người thật.

## Nguồn và giới hạn của lượt chấm

- Đã chạy đúng lệnh `node /home/twictrn/.claude/jobs/d88082d5/tmp/chup_moi_man.mjs /home/twictrn/agiviet-production-v2/docs/frontend/anh-danh-gia`. Backend `127.0.0.1:18080` truy cập được; đăng nhập bằng phiên thử của chị Năm, không gửi OTP. Không dùng ảnh dự phòng `soat2`.
- 24 ảnh chính chụp trực tiếp `https://agiviet.id.vn/ban/` khoảng 5 giờ 21–5 giờ 22, giờ Việt Nam; 11 ảnh bổ sung chụp sau đó trong cùng lượt đánh giá, trước khi viết báo cáo. Thời điểm từng quan sát nằm trong [kiem-tra-bo-sung.json](anh-danh-gia/kiem-tra-bo-sung.json). Vì Claude sửa song song, nhận xét chỉ khẳng định những gì hiện trên ảnh đính kèm, không khẳng định bản triển khai về sau vẫn giống ảnh.
- Khung máy 390 × 844. Ảnh `04-dang-hang.png` thực tế rộng 529 px do phần giao diện tràn khi hướng dẫn mở. Các ảnh app còn lại rộng 390 px. App cuộn bên trong: `fullPage` không đồng nghĩa đã chụp hết nội dung; vì vậy đã chụp thêm phần cuối các màn quan trọng và trạng thái đóng hướng dẫn.
- 24 đường dẫn theo script tương ứng 23 nội dung khác nhau: `02b-ben-mua` và `16-ben-mua-can` dẫn tới cùng nội dung. Chấm cả hai ảnh, không coi đây là hai tính năng riêng. Không suy diễn đã kiểm tra mọi hộp thoại, mọi bước đăng hàng, ký hay xác nhận tiền từ 24 đường dẫn này.
- Đã mở bản duyệt bằng Chromium qua Playwright và xem ảnh của cả 4 màn đề xuất: [chào mừng](anh-danh-gia/tham-chieu-1.png), [trang chủ](anh-danh-gia/tham-chieu-2.png), [lời chào](anh-danh-gia/tham-chieu-3.png), [xác nhận tiền](anh-danh-gia/tham-chieu-4.png), cùng [bộ token](anh-danh-gia/tham-chieu-token.png). [Toàn bản thiết kế](anh-danh-gia/tham-chieu-thiet-ke.png) lấy từ `/home/twictrn/Documents/AgiViet/thiet-ke-lai/index.html`.
- Đã đọc `docs/frontend/soat-giao-dien-ban.md`; chỉ giữ lại lỗi còn có bằng chứng trong lượt mới, không chép nguyên kết luận vòng trước.
- Đã mở [bộ hiệu ứng](anh-danh-gia/tham-chieu-hieu-ung.png) và [trâu C01](anh-danh-gia/tham-chieu-trau-c01.png). Trang hiện có 25 ô hiệu ứng app, 11 ô động tác trâu, 3 ví dụ ghép luồng, cộng 39 mục. Tên hàm trong báo cáo là tên thật trong bộ này.
- Lượt chụp chính ghi nhận `loi: {}` trong [chu.json](anh-danh-gia/chu.json): không bắt được lỗi JavaScript hoặc phản hồi HTTP từ 400 trở lên. Điều này không chứng minh thao tác nghiệp vụ hay chuyển động đã chạy đúng. Các hiệu ứng bên dưới là đề xuất gắn, không phải kết luận hiệu ứng đang thiếu hoặc đang hỏng chỉ từ ảnh tĩnh.
- Chỉ ghi báo cáo này và tài liệu ảnh trong `docs/frontend/anh-danh-gia/`. Không sửa mã, không gửi lời chào, không ký, không xác nhận tiền, không tạo lời mời hay yêu cầu hỗ trợ.

## Cách chấm và kết luận chung

Điểm tổng hợp 1–10 xét đồng đều 5 mặt: bố cục; khớp thiết kế; câu chữ; trùng/thừa; vị trí và ý nghĩa phản hồi. 9–10: rõ việc, ít phải nhớ, sẵn sàng đưa đi thử với người dùng; 7–8: khá, còn lỗi cục bộ; 5–6: dùng được nhưng dễ lạc hoặc đọc mệt; 3–4: cản trở việc chính hoặc gây hiểu sai đáng kể; 1–2: không đọc hoặc không thao tác được. Đây là điểm đánh giá chuyên môn, không phải số đo khả năng sử dụng thực tế.

Mức **nặng**: hiểu sai tiền, sai việc cần làm, che thao tác, quá tải đến mức không tìm được việc. **Vừa**: tăng đáng kể số lần đọc, cuộn, đoán. **Nhẹ**: lỗi nhất quán hoặc diễn đạt cục bộ. “Giữ” nghĩa là mặt đó chưa thấy lỗi riêng trên ảnh; không bịa lỗi để đủ cột.

**Kết luận: 24 ảnh chính đạt trung bình 5,3/10; chưa ảnh nào đạt 8/10.** Hệ màu và danh sách đã tiến bộ rõ so với danh sách lỗi cũ. Điểm yếu lớn nhất nằm ở ý nghĩa trạng thái tiền, hướng dẫn che màn, chữ bị cắt và sự không thống nhất giữa màn mới với màn còn kiểu cũ.

### Quy tắc chung áp dụng khi đọc từng ảnh

| Mã | Mức | Bằng chứng và cách sửa cụ thể |
|---|---|---|
| G1 | Vừa | Một font đã đạt: các mẫu DOM có chữ đều dùng Be Vietnam Pro. Nhưng cỡ chữ chưa về 5 mức: có 11, 12, 14, 16, 20, 28 bên cạnh 13, 15, 17, 22, 32 px. Trang chủ có 9 cỡ chữ trong vùng nội dung. Quy về 32 cho số chính, 22 cho tiêu đề màn, 17 cho tên việc, 15 cho nội dung, 13 cho chú thích. Riêng mẫu duyệt cũng có ngoại lệ 11/12 px ở bước và nhãn; đề xuất nâng lên 13 là để đáp ứng bộ token và người đọc chậm, không coi mọi ngoại lệ đó là lỗi mới của Claude. |
| G2 | Vừa | Nhiều đầu màn chỉ còn loa và dấu hỏi. Nút loa hình tròn 40 px đòi hỏi đoán. Dùng chữ “Nghe” và “Hướng dẫn”, vùng chạm ít nhất 44 × 44 px; chỉ đọc đúng nội dung cần làm của màn. |
| G3 | Vừa; nặng ở biểu mẫu và tiền | Nút cộng xanh ở thanh dưới không có nhãn nhìn thấy và cạnh tranh với nút chính. Bổ sung nhãn “Đăng hàng”. Ở màn con đang nhập, ký hoặc xác nhận tiền, dùng đầu màn có “Trở lại” và một dải hành động riêng; tạm ẩn thanh dưới để tránh rời việc. Đây là lựa chọn cụ thể cho luồng nhiều rủi ro, không đề nghị bỏ thanh dưới khỏi các màn danh sách. |
| G4 | Vừa | Nhiều ngày giờ còn “01:18 27/10/2026”, “28-10”, “Thứ 4”, tiền viết “tr”. Dùng “1 giờ 18, ngày 27/10”, “thứ Tư”, “46 triệu đồng”; tiền chi tiết vẫn ghi đầy đủ “46.000.000 đ”. Không bỏ năm khi xem lịch sử khác năm. |
| G5 | Nặng ở 04, 08, 15 | Hướng dẫn tối nền che việc chính. C01 xuất hiện cạnh cọc và số tiền, trái quy tắc bộ asset. Chỉ mời “Xem hướng dẫn” khi người dùng chọn; hướng dẫn tiền dùng chữ và đánh dấu vùng, không trâu. C01 chỉ dành cho hướng dẫn không có tiền, đang nghe thực sự hoặc hỗ trợ. |
| G6 | Vừa | Dòng danh sách bị cắt bằng dấu ba chấm đúng ở phần quyết định: người mua, hạn, việc cần làm. Giữ tên hàng một dòng, cho dòng người mua và hạn xuống dòng; cột số rộng cố định. Thà hiện ít dòng hơn nhưng đủ nghĩa. |
| G7 | Nặng ở giao dịch thử | “Ngân hàng ảo AgiViet · ẢO” nằm trong thông tin nhận tiền trong khi các màn khác nói như tiền thật. Với bản thử, đặt một dải cố định “Bản thử — không dùng tiền thật”; trường ngân hàng ghi “Tài khoản thử •••• 2186”. Nếu là giao dịch thật thì lấy đúng ngân hàng từ hồ sơ, không đổi thành tên ngân hàng thật tự đặt. Không chỉ xóa chữ “ảo” rồi giữ lời hứa tiền thật. |
| G8 | Vừa | Thẻ trắng, nền giấy, viền mảnh và nút xanh đã khá đúng. Chưa thấy nút chính vàng trong 24 ảnh; không lặp lại kết luận cũ về nút vàng. Nhưng xanh đang dùng cho cả “Đang chờ” và “Đến hạn trả”. Chờ bình thường dùng xám; tới lượt/sắp hạn dùng vàng; thiếu tiền hoặc lỗi dùng đỏ; xanh cho hành động chính và dữ kiện đã xác nhận. |

## Chấm từng ảnh chính

### 01 — Trang chủ: 6/10

[Xem ảnh](anh-danh-gia/01-trang-chu.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Thẻ tiền xanh đậm hút mắt hơn “Cần làm”; tổng tiền không ghi khoảng thời gian. Đổi thẻ trắng như bản duyệt; giữ một số lớn, thêm “Tiền đã nhận từ trước đến nay” nếu đúng phạm vi dữ liệu. Đưa việc gần hạn lên ngay sau thẻ tiền. |
| 2. Khớp thiết kế | Vừa | Nền tiền đậm và nhiều cỡ chữ lệch mẫu trang chủ; 220 triệu là số làm tròn quá mạnh so với 220.355.000 ở sổ tiền. Ghi “220,355 triệu đồng” hoặc số đầy đủ; áp dụng G1, không biến số gần đúng thành số chính xác. |
| 3. Câu chữ | Vừa | “Lời chào xoài cát chu” thiếu ai chào; hạn bị cắt. Dòng đầu “Chị có 4 lời chào cần trả lời”; mỗi dòng “Xoài cát Chu · 2.000 kg”, dưới là tên bên mua và “Trả lời trước 1 giờ 12, ngày 28/10”. |
| 4. Trùng/thừa | Vừa | Lối tắt Thời tiết và Nhật ký vườn lặp ngay với thẻ Vườn của mình/nhật ký phía dưới. Giữ lối tắt công cụ; thẻ vườn chỉ hiện khi có việc cụ thể, chẳng hạn “Ngày mai dễ mưa, chuẩn bị bạt”. Thẻ tổng tiền dẫn vào Tiền là đường tắt có lý do, không cần xóa vì trùng thanh dưới. |
| 5. Hiệu ứng | Vừa | Bong bóng trâu che một phần thẻ vườn. Chuyển mẹo thành dòng có thể đóng trong bố cục. `hienDong` cho lời chào thật mới; `noiLen` tối đa ba dòng đầu. Không đếm lại tổng tiền mỗi lần vào trang; không đặt C01 cạnh thẻ tiền. |

### 02 — Danh sách lời chào: 6/10

[Xem ảnh](anh-danh-gia/02-loi-chao-ds.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Các dòng đã gọn nhưng mắt phải đi từ tên sang số rồi xuống hạn rất nhỏ. Dùng tên hàng 17 px, tên người mua/hạn 15 px, tổng tiền bên phải. Giữ phân nhóm và “Xem thêm”. |
| 2. Khớp thiết kế | Vừa | Nhãn trạng thái 12 px, dòng phụ 13 px chứa thông tin chính; áp dụng G1 và G6. Nhãn vàng “Trả lời” đúng ý tới lượt, nên giữ. |
| 3. Câu chữ | Nặng | Không thấy người chào trong các dòng; hai lời chào cùng hàng và cùng tổng tiền khó phân biệt. Ghi “Đồng Xanh · 23.000 đ/kg”, dòng kế “Hạn 1 giờ 12, ngày 28/10”. Đổi “46 tr” thành “46 triệu”. |
| 4. Trùng/thừa | Vừa | “Đã đồng ý giá” có 23 mục còn lưu sau khi đã thành đơn, dễ nhầm nơi theo dõi. Chỉ hiện chào chưa thành đơn; mục đã có đơn chuyển thành liên kết “Xem đơn với Đồng Xanh”. Thanh dưới vẫn giữ Đơn hàng làm nơi theo dõi chính. |
| 5. Hiệu ứng | Giữ/đề xuất | `gachTab` cho ba thẻ đầu; `hienDong` khi có lời chào mới, không đẩy dòng người dùng đang đọc. `demNguoc` chỉ hiện phút/giờ gần hạn, không vòng đếm giây trên mọi hàng. Không C01 vì có giá tiền. |

### 02b — Bên mua trong khu Bán hàng: 7/10

[Xem ảnh](anh-danh-gia/02b-ben-mua.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Khoảng trắng dưới danh sách là chấp nhận được; lỗi là cột lượng làm tên người mua/ngày bị cắt. Cho dòng phụ đủ hai dòng, lượng ở góc phải hàng đầu. |
| 2. Khớp thiết kế | Nhẹ | Thẻ trắng, viền và ảnh hàng đúng hướng. Chuẩn hóa chữ 14/12 về 15/13; thêm dấu mở ở “Mặt hàng khác” để biết có thể chạm. |
| 3. Câu chữ | Vừa | “Cần đúng hàng của mình” dễ bị hiểu là đã khớp mọi điều kiện. Đổi “5 nhu cầu cùng mặt hàng chị bán”; ghi “Loại 1”, “Loại 2” kèm mã L1/L2 nếu cần. Câu đầu “Chọn bên mua để xem loại hàng và ngày nhận”. |
| 4. Trùng/thừa | Nhẹ | Trùng nội dung với ảnh 16 nhưng thanh dưới không có mục này, nên vị trí dưới Bán hàng hợp lý. Duy trì một trang chuẩn cho hai đường dẫn. Hai dòng Đồng Xanh giống hàng cần thêm “Nhận ngày 03/11” và điều kiện phân biệt thật có. |
| 5. Hiệu ứng | Giữ/đề xuất | `gachTab` khi đổi mục; `noiLen` năm dòng một lần; `hienDong` khi có nhu cầu mới. Chỉ dùng `tickLanLuot` sau khi mở chi tiết và đối chiếu từng điều kiện; không hoạt họa như đã được bên mua chấp nhận. |

### 03 — Chi tiết lời chào: 7/10

[Xem ảnh](anh-danh-gia/03-loi-chao.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Số nhận về nổi bật, ba nút rõ. Nhưng khối đầu đặt tên hàng thay vị trí người chào, mất ngữ cảnh quyết định. Bổ sung tên bên mua dưới tên hàng, đưa mã lô xuống phần chi tiết. |
| 2. Khớp thiết kế | Nhẹ | Đã gần mẫu duyệt về số lớn và nút xanh. Dòng bước 11 px, nhãn 12 px khó đọc; nâng theo G1. Nút chính hiện vẫn dùng chung với nút cộng của thanh dưới, áp dụng G3. |
| 3. Câu chữ | Nặng | “Bên mua đã được AgiViet xác minh” không có tên bên mua. Ghi “Nhà máy sấy Đồng Xanh” nếu đúng người chào thực tế, dưới là “Đã xác minh thông tin”. Mở đầu “Xem lời chào rồi chọn đồng ý, trả giá hoặc không bán”. Đổi “Ngày có hàng” thành “Ngày nhận hàng” chỉ khi đây thật sự là ngày hai bên hẹn nhận. |
| 4. Trùng/thừa | Vừa | Lượng xuất hiện cả dưới tổng và bảng. Giữ phép tính 1.500 kg × 14.000 đ/kg; bảng chỉ giữ ngày nhận, cách trả tiền, cọc. Mã lô không nằm cạnh lời xác minh. |
| 5. Hiệu ứng | Giữ/đề xuất | `dangGui` rồi `thanhCong` sau máy chủ xác nhận lựa chọn; `nhayNen` nếu giá vừa đổi; `buocTien` sau chuyển bước thật. Không tự chạy đếm tiền và không trâu ở quyết định giá. |

### 04 — Đăng hàng, hướng dẫn đang mở: 4/10

[Xem ảnh](anh-danh-gia/04-dang-hang.png). Hai ảnh không hướng dẫn và cuối trang được chấm riêng ở phần bổ sung.

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Ảnh tràn tới 529 px; hướng dẫn che biểu mẫu và kéo mắt khỏi câu hỏi. Giới hạn hộp vào bề rộng màn trừ lề 16 px mỗi bên; cho hướng dẫn nằm trong luồng, không tự tối toàn màn. Nút lưu đang nổi trên vùng nhập lượng ở ảnh không hướng dẫn. |
| 2. Khớp thiết kế | Vừa | Viền vàng bao vùng hướng dẫn mang nghĩa khác “tới lượt/sắp hạn”; nhiều lựa chọn có kiểu viền khác nhau. Dùng viền trung tính hoặc xanh nhạt cho vùng được chỉ; chuẩn hóa viền 1 px và chữ theo G1. |
| 3. Câu chữ | Nặng | “Không cần chọn lại” mâu thuẫn ba nút đổi mặt hàng phía dưới. “L2 (hàng dạt)” vẫn sai như lỗi Claude đã ghi. Đổi thành “Chọn mặt hàng chị muốn đăng”, “Loại 1”, “Loại 2 · hàng loại dưới”; chỉ gọi hàng dạt khi quy cách thật sự định nghĩa vậy. |
| 4. Trùng/thừa | Vừa | Tên mặt hàng và “đã xác minh” lặp trong thẻ, nhãn và nút chọn. Một vùng “Mặt hàng” với giá trị đang chọn là đủ. Tạm ẩn nút cộng của thanh dưới khi đang ở chính màn đăng. |
| 5. Hiệu ứng | Vừa | C01 dùng ở đăng hàng là đúng vai trò nhưng đang tạo chặn đường đọc. Dùng C01 nhỏ trong thẻ hướng dẫn tự mở theo yêu cầu. `chonThe` cho mặt hàng/loại; `loiTruong` chỉ rõ ô còn thiếu; `dangGui` và `thanhCong` sau lưu thật. |

### 05 — Hàng của tôi: 6/10

[Xem ảnh](anh-danh-gia/05-hang.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | “Bán trước mùa” đứng trước hàng đang bán dù không phải việc chính hiện tại. Chuyển xuống sau danh sách hoặc thành liên kết nhỏ “Có hàng cho vụ sau?”. Giữ giới hạn năm dòng và “Xem thêm 5”. |
| 2. Khớp thiết kế | Nhẹ | Ảnh hàng thật và dòng gọn là tiến bộ. Tên 15 px và nhãn 12 px chưa đúng mức tên việc 17/nhãn 13; áp dụng G1. |
| 3. Câu chữ | Vừa | Bốn lô xoài loại 1 nhìn gần giống nhau; hai dòng 50 kg không phân biệt được. Thêm ngày có hàng hoặc tên vườn thực có: “Có từ 02/11 · vườn Mỹ Xương”. Không thay bằng mã lô lớn. |
| 4. Trùng/thừa | Vừa | Nhóm đã tên “Đang bán” nhưng mỗi dòng lại mang nhãn “Đang bán”. Bỏ nhãn chung, dành chỗ cho ngày có hàng; chỉ giữ nhãn ngoại lệ “Sắp hết hàng” nếu dữ liệu xác nhận. |
| 5. Hiệu ứng | Giữ/đề xuất | `doiTrangThai` khi ẩn/mở lô thành công; `hienDong` cho hàng vừa đăng. Không bắt cả danh sách nổi lại mỗi lần quay về từ chi tiết; giữ vị trí cuộn. Không cần C01. |

### 06 — Chi tiết lô: 5/10

[Xem ảnh](anh-danh-gia/06-lo.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Nhiều khối dài; thông tin hành động “Xác nhận còn hàng” nằm sau sổ lượng. Đầu màn nên là “Lô này còn bán được 4.000 kg”, kèm “Cập nhật hàng”; số giá mong muốn đứng sau, không chiếm vai trò duy nhất. |
| 2. Khớp thiết kế | Vừa | Đầu màn kiểu cũ: “Trở lại” và “Nghe” xếp dọc, khác mẫu mới. Dùng cùng đầu màn một hàng; tên hàng 22 px, mã nhỏ. Viền/thẻ đã khá đúng, không cần đổi toàn bộ vỏ màn. |
| 3. Câu chữ | Vừa | Nội dung còn “Sổ lượng”, “Khả dụng”, “Mức xác minh tổ chức 2”, “DT”. Thay “Lượng hàng”, “Còn bán được”, “Thông tin hộ bán đã được kiểm tra” khi đúng dữ kiện, “Đồng Tháp”. “Chưa có” ngày hái đổi “Chưa ghi ngày hái”. |
| 4. Trùng/thừa | Nặng | Toàn nội dung có bảy dòng lượng 0 kg, hai dòng “Mã số vùng trồng” giống nhau. Mặc định chỉ hiện lượng còn bán và lượng đã có cam kết; mục “Xem các lượng khác” mở thêm. Gộp chứng nhận trùng sau khi so đúng mã, không xóa hai mã khác nhau chỉ vì cùng nhãn. |
| 5. Hiệu ứng | Giữ/đề xuất | `doiTrangThai` sau xác nhận còn hàng; `dangGui` rồi `thanhCong` khi lưu ảnh. `veDuong` chỉ dùng khi thật sự có biểu đồ giá theo thời gian, không thêm biểu đồ để lấp chỗ. Không C01 cạnh giá. |

### 07 — Danh sách đơn hàng: 6/10

[Xem ảnh](anh-danh-gia/07-don-hang.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Đã có năm dòng và xem thêm, tốt hơn ảnh cũ dài. Nhưng ba dòng Sông Tiền cùng tên, cùng việc, cùng tổng 46 triệu khó nhận diện. Dòng chính lấy hàng và lượng, dòng phụ người mua + ngày giao. |
| 2. Khớp thiết kế | Vừa | Nhãn xanh “Cọc”, “Thanh toán”, “Giao nhận” chỉ là tên bước, dễ nhầm đã hoàn thành. Dùng nhãn xám “Chờ cọc”, “Chờ trả tiền”, “Chờ bên mua đặt xe”; xanh chỉ khi đã xác nhận. |
| 3. Câu chữ | Vừa | “Chuyển cọc”, “Trả khoản trước bốc” không rõ ai làm; “Chỉ định người nhận, đặt…” bị cắt. Viết “Đồng Xanh chưa chuyển cọc”, “Sông Tiền chưa trả tiền trước khi bốc”. Mã HD để nhỏ cuối dòng. |
| 4. Trùng/thừa | Nhẹ | Nhóm “Đang chờ bên mua” đã rõ, không lặp danh từ bước trên mọi dòng nếu không giúp quyết định. Việc tab Đơn hàng và tiêu đề cùng tên là định hướng cần thiết, không tính là lỗi thừa. |
| 5. Hiệu ứng | Giữ/đề xuất | `doiTrangThai` đúng dòng có cập nhật; `hienDong` cho đơn mới, kèm chữ “Có 1 cập nhật” nếu người dùng đang cuộn. Không tự chuyển sang đơn khác. |

### 08 — Đơn chờ cọc, hướng dẫn đang mở: 4/10

[Xem ảnh](anh-danh-gia/08-don-cho-coc.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Hướng dẫn 1/3 che đúng ô “ai làm tiếp”; người dùng chưa đọc việc đã phải học dải bước. Không tự mở ở đơn; đầu màn hiện ngay “Đang chờ Đồng Xanh chuyển cọc”. |
| 2. Khớp thiết kế | Nặng | Cọc chưa chuyển nhưng dưới tổng ghi “7.200.000 đ cọc ngân hàng giữ”; đây là sai ý nghĩa, không phải lỗi trang trí. Đổi “Cọc cần bên mua chuyển: 7.200.000 đ”; chỉ dùng “Ngân hàng đã nhận cọc…” sau xác nhận. |
| 3. Câu chữ | Vừa | Tiêu đề là người mua, thiếu hàng. Ghi “Xoài cát Chu · 1.000 kg”; dưới “Đồng Xanh · HĐ-3022”. Mở đầu “Chị chưa cần làm gì. Đang chờ Đồng Xanh chuyển cọc.” |
| 4. Trùng/thừa | Vừa | Sáu liên kết chi tiết vẫn tạo một menu thứ hai; đưa hai mục cần ở bước này “Xem hợp đồng”, “Xem cọc”, còn lại vào “Thông tin khác”. Thanh dưới nút cộng không giúp việc theo dõi cọc, áp dụng G3. |
| 5. Hiệu ứng | Nặng | C01 đứng ngay dưới bước Cọc, gần số tiền, trái quy tắc. Bỏ trâu khỏi hướng dẫn đơn. `doiTrangThai` và `buocTien` sau ngân hàng xác nhận; không đếm lên 7.200.000 khi chỉ mở màn. |

### 09 — Hợp đồng: 5/10

[Xem ảnh](anh-danh-gia/09-hop-dong.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Hợp đồng đã ở bước Cọc nhưng phần “Trước khi ký” vẫn chiếm chỗ. Đầu màn đưa tình trạng ký thật: “Hai bên đã ký” chỉ nếu dữ liệu chứng minh; nếu chưa đủ thì nói rõ đang chờ ai. Sau đó mới tới bản hợp đồng để đọc. |
| 2. Khớp thiết kế | Vừa | Số lớn và đọc thành chữ tốt; “Phí bên mua 0 đ” và ngân hàng “ẢO” lẫn vào màn người bán. Bỏ phí bên mua khỏi tóm tắt; xử lý môi trường thử theo G7. |
| 3. Câu chữ | Nặng | “Chưa tới lượt bạn ký, hoặc vai của bạn không có quyền ký” vẫn còn trong nội dung. Phải phân biệt nguyên nhân: “Đang chờ bên mua ký. Chị chưa cần làm gì.” hoặc “Chỉ chủ hộ được ký. Nhờ chủ hộ mở đơn này.” Không chọn một câu khi chưa biết nguyên nhân thật. |
| 4. Trùng/thừa | Vừa | Hai câu báo không ký được và tám thẻ điều khoản kéo dài khoảng 2.549 px nội dung. Một thông báo tình trạng; điều khoản thành danh sách thu gọn có tên rõ. Giữ nút xem toàn văn và bản đã ký. |
| 5. Hiệu ứng | Giữ/đề xuất | `nhayNen` ở đúng điều khoản vừa sửa, nêu “Giá vừa thay đổi”. `kyTen`/`dongDau` chỉ sau ký hợp lệ; không đóng dấu khi chỉ mở PDF. Không C01. |

### 10 — Cọc: 6/10

[Xem ảnh](anh-danh-gia/10-coc.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Ba đoạn giải thích và một dòng phí bao quanh số, trong khi việc hiện tại chỉ là chờ. Đặt trạng thái trước số: “Đang chờ Đồng Xanh chuyển cọc”; số cần chuyển 7.200.000 đ; phần giải thích còn lại vào “Cọc được giữ thế nào?”. |
| 2. Khớp thiết kế | Vừa | Hai hộp viền xanh nhìn như xác nhận tốt trong trạng thái chưa có cọc. Dùng một thẻ trung tính; bỏ “Phí bên mua 0 đ”. Nếu có hạn thật mới tô vàng hạn, không tự tạo hạn. |
| 3. Câu chữ | Vừa | “30% giá tính cọc” và “Xem trạng thái cọc ở trên” khó đọc. Thay “Bên mua cần gửi cọc 7.200.000 đ”; “Chị chưa cần làm gì. App sẽ báo khi ngân hàng xác nhận.” |
| 4. Trùng/thừa | Vừa | “Cọc đang giữ không phải tiền đã về” và “Chỉ ngân hàng xác nhận…” lặp lời giải thích của nhiều màn. Giữ một dòng “Tiền cọc nằm ở ngân hàng, chưa vào tài khoản chị”; luật chi tiết trong mục mở thêm. |
| 5. Hiệu ứng | Giữ/đề xuất | `doiTrangThai` chuyển từ chờ sang đã nhận, kèm thời điểm xác nhận. `demSo` chỉ chạy sau xác nhận mới, giá trị cuối đứng yên cho đọc. Không xu bay, không trâu, không tự tạo tín hiệu có tiền. |

### 11 — Đơn đã cọc, chờ khoản trước bốc: 7/10

[Xem ảnh](anh-danh-gia/11-don-da-coc.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nhẹ | Ô việc đã rõ hơn phiên bản cũ; tên người mua dài chiếm hai dòng, không có hàng. Đặt “Xoài cát Chu · 800 kg” làm tiêu đề; tên Sông Tiền nhỏ phía dưới. |
| 2. Khớp thiết kế | Vừa | Nhãn xanh “Đang chờ bên mua” dễ hiểu là đã xong. Đổi sang xám; dòng tiền cọc xanh chỉ cho phần đã được xác nhận. Dải bước còn 11 px và tên bước dài, áp dụng G1. |
| 3. Câu chữ | Vừa | “Trả khoản trước bốc” không phải lời thường. Đổi “Đang chờ Sông Tiền trả 13.160.000 đ trước khi bốc hàng”; dòng sau “Chị chưa cần làm gì. Khi có thông báo chuyển tiền, chị kiểm tra tài khoản.” |
| 4. Trùng/thừa | Vừa | Giá trị hợp đồng 18,8 triệu nổi nhất nhưng việc cần theo dõi là 13,16 triệu. Đưa số còn chờ trả vào ô việc; tổng hợp đồng vẫn giữ trong chi tiết. Không sao chép cả thẻ tổng Tiền của thanh dưới vào đây. |
| 5. Hiệu ứng | Giữ/đề xuất | `hienDong` khi bên mua báo chuyển, rồi yêu cầu người bán kiểm tra; `buocTien` sau đủ điều kiện thật. Không dùng hiệu ứng tiền về ở thời điểm “báo chuyển”. |

### 12 — Giao nhận: 5/10

[Xem ảnh](anh-danh-gia/12-giao-nhan.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Mở bằng thời gian và lượng rồi trải dài danh sách cản trở; không có câu kết luận ngay đầu. Đưa “Chưa giao hàng: còn thiếu tiền, người nhận và xe” lên trước; nhóm ba việc còn thiếu, mục đã đủ thu gọn. |
| 2. Khớp thiết kế | Vừa | Tiền thiếu dùng đỏ đúng. Nhưng Người nhận và Xe chưa chuẩn bị cũng đỏ rực, lẫn lỗi với việc còn chờ. Dùng xám cho bên mua chưa làm, vàng nếu tới hạn; chỉ đỏ khi thật sự quá hạn/lỗi. |
| 3. Câu chữ | Nặng | “Khoản HD-3021-BEFORE” lộ mã kỹ thuật. Thay “Chưa nhận đủ 13.160.000 đ trước khi bốc hàng”. “Chưa có chuyến xe nhận chở” thành “Bên mua chưa đặt xe”. Định dạng ngày giờ theo G4. |
| 4. Trùng/thừa | Vừa | Dòng bước đang Thanh toán, tiêu đề Giao nhận, nhưng chưa giải thích quan hệ. Thêm “Chỉ bốc hàng khi đã nhận đủ khoản trước bốc”; không cần lặp toàn bộ chính sách hợp đồng. Dùng liên kết có mục đích “Xem tiền trước khi bốc”. |
| 5. Hiệu ứng | Giữ/đề xuất | `tickLanLuot` chỉ khi từng điều kiện vừa được kiểm tra xong; `moNut` khi thật sự đủ điều kiện bốc. `tuyenGiao` chỉ nếu có vị trí xe thật; hiện chưa có xe thì không vẽ xe đang chạy. Không C01 ở danh sách tiền/điều kiện. |

### 13 — Tiền bên mua trả: 4/10

[Xem ảnh](anh-danh-gia/13-thanh-toan.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Đoạn luật 6 dòng nằm trước số tiền; hành động xác nhận ở dưới màn. Câu đầu thay bằng “Mở ứng dụng ngân hàng, kiểm tra đã nhận đủ 13.160.000 đ chưa.” Đặt số, tài khoản, cảnh báo và nút xác nhận trong cùng vùng đọc như bản duyệt 4. |
| 2. Khớp thiết kế | Nặng | Chưa có hộp cảnh báo đỏ nhạt như mẫu; “Đến hạn trả” lại xanh. Đổi nhãn theo hạn thật, dùng cảnh báo “Chỉ xác nhận khi chính chị thấy tiền trong tài khoản. Ảnh biên lai chưa phải tiền về.” Xử lý ngân hàng thử theo G7. |
| 3. Câu chữ | Vừa | “Trả thẳng”, “xác nhận OTP”, “Đã xác nhận nhận” khó đọc. Đổi “Bên mua chuyển vào tài khoản chị”, “nhập mã xác nhận”, “Chị đã nhận”. Chưa báo chuyển thì nói rõ “Bên mua chưa báo đã chuyển tiền”. |
| 4. Trùng/thừa | Nặng | Nút cộng xanh của thanh dưới cạnh tranh với nhiệm vụ xác nhận. Có hai dòng 0 đ và nhiều chi tiết làm chìm việc. Tóm tắt “Chưa ghi nhận khoản đã nhận”; đưa chi tiết dưới “Xem các lần chuyển”. Nút theo mẫu: “Đã thấy đủ 13.160.000 đ”, “Mới nhận một phần”, “Chưa thấy”. Việc hỗ trợ một phần cần khớp nghiệp vụ, không chỉ đổi chữ. |
| 5. Hiệu ứng | Giữ/đề xuất | `loiTruong` khi nhập số không khớp; `dangGui` khi gửi xác nhận; `thanhCong` khi hệ thống nhận xong. Không xu bay khi bên mua chỉ báo trả; không trâu và không hoạt họa thúc bấm xác nhận. |

### 14 — Tính tiền cuối: 5/10

[Xem ảnh](anh-danh-gia/14-tien-don.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Chưa đến tính tiền cuối nhưng đưa tổng và “Lệnh ngân hàng” thành hai khối lớn. Mở đầu “Chưa tính tiền cuối vì chưa chốt lượng nhận”; hiển thị một tóm tắt tiền, thu gọn phần chưa có dữ liệu. |
| 2. Khớp thiết kế | Vừa | Tổng hợp đồng lớn nhất không phải số thực nhận cuối; dòng phí chưa rõ ai trả. Ghi “Giá trị hợp đồng, chưa phải tiền thực nhận”; chỉ hiện phí người bán chịu hoặc hoàn về người bán. Giữ số tiền lớn khi có kết quả cuối thực. |
| 3. Câu chữ | Vừa | “Xem khoản trả thẳng”, “Lệnh ngân hàng”, “Bảng quyết toán” vẫn kỹ thuật. Thay “Xem tiền bên mua chuyển”, “Tiền ngân hàng sẽ chuyển”, “Bảng tính tiền cuối”. Không tự diễn giải lại công thức nếu chưa biết khoản nào thuộc người bán. |
| 4. Trùng/thừa | Vừa | Hai khối “Chưa có lệnh…” và “Chưa có quyết toán” nói cùng ý chưa đến bước. Gom “Chưa có kết quả tính tiền cuối. App sẽ báo khi chốt lượng nhận”; chi tiết chỉ mở khi cần. Thanh Tiền dưới là tổng các đơn, cần ghi “Tiền của đơn này” ở đây. |
| 5. Hiệu ứng | Giữ/đề xuất | `buocTien` khi chốt nhận, `doiTrangThai` khi có lệnh thực; `demSo` chỉ khi giá trị đã xác nhận đổi. Không C01 và không mừng khi vẫn còn nghĩa vụ tiền/hàng. |

### 15 — Sổ tiền, hướng dẫn đang mở: 4/10

[Xem ảnh](anh-danh-gia/15-tien.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Hướng dẫn che phần so sánh ba con số; người đọc chỉ thấy số đầu rồi phải tắt. Bỏ tự mở; khi muốn giải thích, mở “Ba khoản này khác nhau thế nào?” bằng chữ trong luồng. |
| 2. Khớp thiết kế | Vừa | Cả ba số đều lớn 32 px và mô tả dài khiến không có thứ bậc. Giữ tiền đã nhận 32 px; tiền đang giữ và còn phải trả 22 px, cùng hàng nhãn rõ. Vàng không dành cho mọi khoản chưa nhận nếu chưa tới lượt/hạn. |
| 3. Câu chữ | Nặng | “Giao hàng xong, ngân hàng chuyển cho mình” hứa chắc thời điểm chuyển dù còn kiểm nhận/tranh chấp. Thay “Ngân hàng chuyển theo kết quả nhận hàng và thỏa thuận của đơn.” Ghi rõ phạm vi tổng “Từ trước đến nay” nếu dữ liệu là lũy kế. |
| 4. Trùng/thừa | Vừa | Danh sách cọc từng đơn dài khoảng 2.311 px, lặp nhiều người mua; chưa có phân trang ngắn như Hàng/Đơn hàng. Hiện năm dòng + “Xem thêm 9 đơn”; kèm hàng, lượng hoặc ngày để phân biệt. |
| 5. Hiệu ứng | Nặng | Trâu đứng ngay dưới số tiền 220.355.000 đ. Bỏ C01 khỏi sổ tiền. `demSo` sau cập nhật đã xác nhận, số cuối đứng yên; chỉ dùng `xuBay` nếu có bằng chứng khoản tiền thực về, và ưu tiên phản hồi tĩnh cho nhóm đọc chậm. |

### 16 — Bên mua đang cần, đường dẫn demands: 7/10

[Xem ảnh](anh-danh-gia/16-ben-mua-can.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Giống ảnh 02b: cột lượng làm ngày/người mua bị cắt. Cho dòng phụ hai dòng; không ép vừa năm dòng bằng cách giấu điều kiện. |
| 2. Khớp thiết kế | Nhẹ | Thẻ trắng, viền 1 px và nút không vàng đã đúng hướng. Chuẩn hóa tên hàng 17, nội dung 15, nhãn 13; “Mặt hàng khác” thêm chỉ báo mở. |
| 3. Câu chữ | Vừa | Đổi “Cần đúng hàng của mình” thành “Nhu cầu cùng mặt hàng chị bán”; mở đầu “Chọn nhu cầu để xem giá, lượng và ngày nhận”. Không gọi là “đúng hàng” khi chưa so đủ quy cách. |
| 4. Trùng/thừa | Nhẹ | Đây là cùng nội dung ảnh 02b, không phải lỗi lặp trong chính màn. Hợp nhất tên trang và hành vi quay lại của hai đường dẫn; không thêm một lối tắt nữa vào thanh dưới. |
| 5. Hiệu ứng | Giữ/đề xuất | `gachTab`, `hienDong` cho cập nhật thực; giữ nguyên chỗ đang đọc. Không hiệu ứng mừng khớp thành công chỉ vì cùng loại hàng. Không cần C01. |

### 17 — Thời tiết: 7/10

[Xem ảnh](anh-danh-gia/17-thoi-tiet.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nhẹ | Bảng 7 ngày gọn và có nguồn là tốt. Đưa lời khuyên việc làm lên đầu, sau đó số hiện tại; nguồn còn hai dòng chữ tương đối dài có thể mở thêm. |
| 2. Khớp thiết kế | Vừa | Hộp vàng đang cho cảnh báo mưa, vượt nghĩa vàng chỉ tới lượt/sắp hạn. Dùng thẻ trung tính có nhãn “Lưu ý khi hái”; chỉ dùng vàng khi gắn một việc cụ thể có hạn của người bán. Chuẩn hóa số nhiệt độ 32/700. |
| 3. Câu chữ | Vừa | “Mưa 57%” không rõ xác suất hay diện tích; “0.8 mm” dấu thập phân kiểu Anh. Ghi “Khả năng mưa 57%”, “Lượng mưa 0,8 mm”, “Thứ Tư 28/10”. Đầu màn “Ngày mai dễ mưa, chuẩn bị bạt che khi hái và chờ xe.” theo đúng dữ liệu đang hiển thị. |
| 4. Trùng/thừa | Nhẹ | Hôm nay lặp ở thẻ và dòng đầu bảng nhưng có ích khi so tuần; không cần bỏ ép buộc. Phần lấy lúc chỉ cần “Cập nhật 5 giờ 21, ngày 27/10”; tên miền để trong “Nguồn dự báo”. |
| 5. Hiệu ứng | Giữ/đề xuất | `khungCho` giữ chỗ khi lấy dự báo; đổi số nhẹ sau dữ liệu mới. Không mưa rơi/trời chớp lặp trang trí và không C01 chiếm phần bảng. |

### 18 — Tin tức: 5/10

[Xem ảnh](anh-danh-gia/18-tin-tuc.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Thẻ tin dài 3–4 dòng tiêu đề khiến luồng khoảng 3.553 px. Chia “Tin về mặt hàng của chị”, “Tin Đồng Tháp”, “Tin khác”; hiện ba tin đầu mỗi nhóm, có “Xem thêm”. Không cắt tiêu đề đến mất nghĩa. |
| 2. Khớp thiết kế | Nhẹ | Vỏ thẻ và màu đã ổn; tiêu đề màn và cỡ tin còn lệch G1. Dùng 17 cho tiêu đề tin, 13 cho nguồn/ngày; giữ một dấu mở thống nhất. |
| 3. Câu chữ | Vừa | Mở đầu báo không có tin là thành thật nhưng dài; nguồn còn tên chuyên mục “Kinh doanh”. Đổi “Chưa có tin mới về xoài. Chị có thể xem tin nông nghiệp Đồng Tháp.” Không tự tóm tắt tin thành lời khuyên bán nếu chưa đọc nguồn. |
| 4. Trùng/thừa | Nặng | Tin bến xe gửi tiết kiệm không phục vụ người bán xoài, nhưng ngang hàng tin nông nghiệp. Đưa xuống Tin khác hoặc loại khỏi bộ lọc nông nghiệp; giữ nguồn/ngày, không cần tạo thêm mục Tin tức ở thanh dưới. |
| 5. Hiệu ứng | Giữ/đề xuất | `khungCho` lúc tải, `noiLen` tối đa ba tin đầu. C01 `lodau` chỉ có thể dùng ở một thẻ hướng dẫn đọc tin theo yêu cầu, không chen giữa mọi bài. Không hiệu ứng làm tin cũ trông như vừa có. |

### 19 — Lịch sử làm ăn: 4/10

[Xem ảnh](anh-danh-gia/19-lich-su.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Luồng khoảng 4.848 px, mỗi sự kiện một thẻ với ngày giờ lớn phía trên. Gom theo ngày, dòng gọn; bộ lọc “Đơn hàng”, “Tiền”, “Hàng đã đăng”; hiện mười sự kiện rồi “Xem thêm”. |
| 2. Khớp thiết kế | Vừa | Mật độ thẻ trái tinh thần sổ rõ hàng, rõ việc. Giữ thẻ trắng chung theo ngày, đường phân cách 1 px; tên việc 17, ngày 13. Không cần sửa bằng tăng bóng/đổi màu. |
| 3. Câu chữ | Nặng | “Đăng/tạo lô”, “Việc HD-3020-BEFORE” là nhật ký kỹ thuật. Đổi “Đã đăng xoài cát Chu · loại 2”; “Chị đã xác nhận nhận 17.920.000 đ từ Sông Tiền”. Ngày 02/11/2026 đang nằm trong lịch sử khi ngày chụp là 27/10: nếu là kế hoạch phải ghi “Dự kiến”, nếu sự kiện thật thì sửa nguồn thời gian; không đổi chữ để che dữ liệu sai. |
| 4. Trùng/thừa | Vừa | Nhiều bản ghi nhận chào rồi tạo lô nối nhau không giúp nhớ giao dịch. Gom theo đơn/hàng, cho “Xem các lần thay đổi” để truy đủ. Thanh Đơn hàng là hiện trạng; Lịch sử là việc đã xảy ra, cần nêu khác biệt bằng nội dung này. |
| 5. Hiệu ứng | Giữ/đề xuất | `hienDong` cho sự kiện mới thực sự, không phát lại cả lịch sử. Tiền trong lịch sử để tĩnh; không đếm số cũ hoặc C01 mừng ở sự kiện còn dang dở. |

### 20 — Nhật ký vườn, chưa có tính năng: 5/10

[Xem ảnh](anh-danh-gia/20-nhat-ky.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Một đoạn hơn mười dòng về tính năng tương lai; việc duy nhất làm được là nhờ hỗ trợ lại ở cuối. Đưa “Nhật ký vườn chưa dùng được. Chị có thể nhờ nhân viên ghi giúp.” lên đầu, nút ngay sau. |
| 2. Khớp thiết kế | Vừa | Nhãn vàng “Đang làm, sắp có” không phải việc đến lượt và “sắp” không có ngày. Dùng nhãn xám “Chưa dùng được”; một thẻ ngắn, nội dung 15 px. |
| 3. Câu chữ | Nặng | “Ngày hết cách ly thuốc tự lấy…” và “Ghi một việc trong 3 lần chạm” mô tả khả năng chưa có như lời hứa sẵn dùng. Đổi thành “Dự kiến sẽ có: ghi việc chăm vườn, lưu ảnh, nhắc ngày hết cách ly”; không hứa thời hạn hoặc số lần chạm chưa kiểm chứng. |
| 4. Trùng/thừa | Vừa | Nhật ký được đẩy ở lối tắt và thẻ trang chủ nhưng mở vào màn chưa làm. Trên lối tắt ghi rõ “Nhật ký vườn · chưa dùng được” hoặc chỉ đưa vào mục công cụ sắp có; không làm mục đang hoạt động và mục tương lai trông giống nhau. |
| 5. Hiệu ứng | Nhẹ | C01 ở màn trống có thể hợp, nhưng giữ nhỏ và đứng yên, không mừng. `binhtinh` khi hỗ trợ theo yêu cầu; không làm hoạt họa giả như đã lưu nhật ký. |

### 21 — Thông báo: 3/10

[Xem ảnh](anh-danh-gia/21-thong-bao.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Khoảng 12.409 px nội dung, trên màn chỉ ba thẻ gần giống nhau. Gom theo giao dịch/ngày; mỗi dòng một cập nhật có hành động; phân “Chị cần làm” và “Để chị biết”. |
| 2. Khớp thiết kế | Vừa | Đầu màn cũ với hai nút chữ xếp dọc, thẻ tiêu đề 22 px ngang cấp tiêu đề màn. Dùng đầu màn mới, tên thông báo 17, nội dung 15, giờ 13; nút Tải lại thành hành động phụ có vị trí ổn định. |
| 3. Câu chữ | Nặng | “Tổ chức có cập nhật mới. Mở hồ sơ để xem trạng thái hiện hành” không nói gì đã xảy ra. Dùng sự kiện thật, ví dụ “Đồng Xanh chưa chuyển cọc cho đơn xoài 1.000 kg” chỉ khi đó là cập nhật thật; nếu nguồn không đủ thì ghi “Có thay đổi ở đơn HĐ-3022” và liên kết đúng đơn, không tự bịa trạng thái. |
| 4. Trùng/thừa | Nặng | Nhiều thẻ cùng câu và cùng phút. Gộp theo nguồn sự kiện/đơn; không gộp mù các việc khác nhau chỉ vì cùng chữ. “3 cập nhật của đơn HĐ-3022” mở chi tiết; thông báo chưa đọc có phân biệt tĩnh. |
| 5. Hiệu ứng | Giữ/đề xuất | `hienDong` cho cập nhật mới, đổi huy hiệu sau khi đã đọc; không rung chuông lặp hay liên tục thêm đầu danh sách đang xem. C01 không phù hợp vì đa số liên quan tiền/đơn. |

### 22 — Hỗ trợ: 6/10

[Xem ảnh](anh-danh-gia/22-ho-tro.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Vừa | Có một ô nhập và một nút nên đơn giản, nhưng khoảng trắng trước biểu mẫu lớn, thiếu gợi ý bắt đầu. Đưa form sát câu đầu; thêm ví dụ chữ 13 px dưới nhãn. |
| 2. Khớp thiết kế | Nhẹ | Một nút xanh đã đúng, viền mảnh và thẻ trắng tốt. Đầu màn còn kiểu cũ; dùng cùng đầu màn có Trở lại/Nghe và cỡ 22/17/15/13 chuẩn. |
| 3. Câu chữ | Vừa | “Theo dõi người phụ trách và cập nhật của từng yêu cầu” mở bằng chức năng. Thay “Chị đang vướng việc gì? Ghi lại để nhân viên hỗ trợ.” Gợi ý “Ví dụ: chưa nhận tiền đơn xoài với Đồng Xanh”. Chưa có thời gian xử lý thì không hứa sẽ gọi ngay. |
| 4. Trùng/thừa | Nhẹ | “Chưa có yêu cầu hỗ trợ” đứng trong hộp nhấn riêng bên dưới, tốn chỗ. Thay nhãn nhỏ “Yêu cầu đã gửi” và trạng thái trống một dòng; không thêm mục Hỗ trợ vào thanh dưới khi chỉ cần đường vào từ dấu hỏi. |
| 5. Hiệu ứng | Vừa/đề xuất | Chưa chứng minh được phản hồi sau gửi qua ảnh. Cần `dangGui` chống gửi hai lần rồi `thanhCong` kèm “Đã gửi yêu cầu”, giữ mã/theo dõi trong danh sách. C01 `binhtinh` có thể nhỏ cạnh câu hỗ trợ, tránh che ô nhập. |

### 23 — Hộ bán và thành viên: 4/10

[Xem ảnh](anh-danh-gia/23-to-chuc.png)

| Mặt | Mức | Lỗi và sửa cụ thể |
|---|---|---|
| 1. Bố cục | Nặng | Chữ “Chưa có” phóng thành số liệu chính trong khi người dùng cần biết ai đang giúp mình. Đầu màn “Người trong hộ của chị”; tên và quyền chính, nút “Mời người giúp”; hạn mức để trong phần quyền nâng cao. |
| 2. Khớp thiết kế | Vừa | Dùng kiểu 32 px cho dữ liệu vắng, cả ba nút phụ cao ngang nhau; ý nghĩa thị giác sai. Không phóng to giá trị trống; nhóm các liên kết phụ thành ba dòng có dấu mở. |
| 3. Câu chữ | Nặng | “Vai hiệu lực”, “Hạn mức duyệt”, “Vai mua hàng…” áp ngôn ngữ quản trị lên người bán. Thay “Được làm việc gì”, “Số tiền được phép duyệt” khi cần thật; thông báo theo cá nhân “Quyền mới của [tên] dùng được từ [giờ, ngày]” sau khi có mời, không dán luật 24 giờ cho mọi người. |
| 4. Trùng/thừa | Nặng | Tài khoản nhận tiền, Hỗ trợ, Thông báo và danh sách vai bên mua làm màn này thành menu tổng. Giữ quản lý người trong hộ; liên kết tài khoản ở Tiền, hỗ trợ dưới Hướng dẫn. Form mời chỉ hiển thị quyền phù hợp hộ bán, không mặc định cả Mua hàng/Kế toán/Kho. |
| 5. Hiệu ứng | Giữ/đề xuất | `chonThe` khi chọn quyền có giải thích, `dangGui`/`thanhCong` sau tạo lời mời thật; `doiTrangThai` khi người được mời nhận. Không dùng hiệu ứng mở khóa ngay nếu quyền còn chờ 24 giờ. Không C01 cạnh quyền tiền. |

## Chấm riêng 11 ảnh bổ sung

Điểm dưới đây là điểm của chính ảnh bổ sung. Các mã G1–G8 vẫn áp dụng. Cột hiệu ứng là đề xuất, không suy ra chuyển động từ ảnh tĩnh.

| Ảnh và điểm | 1. Bố cục | 2. Khớp thiết kế | 3. Câu chữ | 4. Trùng/thừa | 5. Hiệu ứng |
|---|---|---|---|---|---|
| [04 không hướng dẫn](anh-danh-gia/04-dang-hang-khong-huong-dan.png) — **5/10** | **Nặng:** nút lưu nằm trên vùng nhập lượng, mẹo nổi che ô. Chuyển dải nút sát trên đáy; tự ẩn khi bàn phím mở, dành chỗ để thấy trọn ô đang nhập. | **Vừa:** thẻ xác minh và lựa chọn có cỡ/viền khác; G1. | **Nặng:** thay “L2 (hàng dạt)” bằng “Loại 2 · hàng loại dưới”; câu đầu “Chọn hàng chị muốn đăng”. | **Vừa:** tên xoài lặp trong thẻ và nút; giữ một bộ chọn, ẩn nút cộng khi đang đăng. | **Vừa:** bỏ bong bóng trâu nổi; `chonThe` khi chọn, `loiTruong` tại ô sai. |
| [04 cuối trang](anh-danh-gia/04-dang-hang-cuoi.png) — **5/10** | **Vừa:** ô giá và nhãn cách nhau nhiều; giữ nhãn, ô và đơn vị thành một nhóm; nút rộng đủ. | **Vừa:** ô ngày hiện `mm/dd/yyyy` trong môi trường thử; hiển thị rõ “ngày/tháng/năm”, dùng định dạng Việt kể cả khi máy tiếng Anh. | **Vừa:** “Giá thấp nhất chịu bán” đổi “Giá thấp nhất chị đồng ý bán”; ghi “Chỉ chị thấy giá này”. | **Vừa:** mẹo nổi nhắc lại điều đã hỏi, nút cộng thừa; bỏ mẹo ở cuối biểu mẫu. | **Giữ/đề xuất:** `loiTruong` ở giá trống/sai; `dangGui` và `thanhCong` sau lưu, không mừng hoàn tất đơn. |
| [06 cuối trang](anh-danh-gia/06-lo-cuoi.png) — **4/10** | **Vừa:** nhiều khối rỗng trước khu ảnh; đặt khu ảnh ngay sau tóm tắt hàng, một vùng xem trước. | **Vừa:** “Chọn tệp” là ô tải tệp kiểu cũ; thay bằng nút phẳng “Chụp hoặc chọn ảnh”, viền 1 px. | **Vừa:** “Tôi vừa chụp ảnh này tại lô hàng” đổi “Ảnh này chụp tại lô hàng của chị”; chỉ xác nhận khi đúng, không tự chọn. | **Nặng:** hai dòng mã vùng trồng trùng nhìn thấy trực tiếp; đối chiếu mã rồi gộp. “Ảnh lô hàng”/“Ảnh hàng”/“Chưa có ảnh” thu về một khối. | **Giữ/đề xuất:** `khungCho` khi ảnh tải, `thanhCong` sau lưu; giữ ảnh xem trước để người dùng kiểm. Không C01. |
| [08 không hướng dẫn](anh-danh-gia/08-don-cho-coc-khong-huong-dan.png) — **5/10** | **Vừa:** ô việc đã đọc được; chuyển tổng hợp đồng xuống sau số cọc cần chờ. | **Nặng:** vẫn ghi cọc “ngân hàng giữ” khi đang chờ. Đổi “Cọc cần chuyển: 7.200.000 đ”. | **Vừa:** đầu màn “Đang chờ Đồng Xanh chuyển cọc. Chị chưa cần làm gì.” | **Vừa:** chi tiết thành menu thứ hai; ưu tiên Hợp đồng/Cọc, còn lại trong “Thông tin khác”. | **Giữ/đề xuất:** bỏ trâu; `doiTrangThai` khi ngân hàng xác nhận, không trước. |
| [09 cuối trang](anh-danh-gia/09-hop-dong-cuoi.png) — **4/10** | **Vừa:** mỗi điều khoản một thẻ lớn, đọc nối dài. Gộp danh sách mở từng điều. | **Nhẹ:** thẻ/viền ổn; dùng tên điều 17, nội dung 15. | **Nặng:** “im lặng ở nơi đến: không”, “0% / 10% / 50% / 100%” không đủ để hiểu hậu quả. Đổi “Bên mua phải xác nhận kết quả nhận hàng”; từng mức phạt phải kèm điều kiện thật từ hợp đồng, không tự đoán. | **Vừa:** câu “phí theo bảng hoàn” bắt đi tìm bảng khác; liên kết đúng bảng và chỉ hiện khi đọc điều hủy. | **Giữ/đề xuất:** chỉ `nhayNen` điều vừa đổi; văn bản điều khoản để tĩnh, không C01. |
| [12 cuối trang](anh-danh-gia/12-giao-nhan-cuoi.png) — **5/10** | **Vừa:** điều đã đủ chiếm nửa dưới; gom “Đã đủ 3 điều kiện” mở thêm, giữ ba việc thiếu ở trên. | **Vừa:** đỏ ở xe/người nhận chưa làm là quá mạnh; xám chờ, vàng có hạn, đỏ lỗi/tiền thiếu. | **Nặng:** bỏ “HD-3021-BEFORE”; ghi “Chưa nhận đủ 13.160.000 đ trước khi bốc”. Đổi “Không có đề nghị/hủy đang chờ” thành “Không có yêu cầu tạm dừng giao hàng” nếu bao đúng dữ kiện. | **Vừa:** bỏ mã khoản và câu điều kiện chung lặp; liên kết “Xem khoản tiền này” trong dòng thiếu tiền. | **Giữ/đề xuất:** `tickLanLuot` theo kiểm tra thật; không làm xe chạy khi chưa có chuyến. |
| [13 cuối trang](anh-danh-gia/13-thanh-toan-cuoi.png) — **4/10** | **Nặng:** hành động chính là dòng mở thu gọn nhỏ, thấp hơn nhiều thông tin. Đặt nút “Đã thấy đủ 13.160.000 đ” trong dải hành động. | **Nặng:** ngân hàng thử xen như ngân hàng thật; G7. “Đến hạn trả” không xanh. | **Vừa:** “Đã xác nhận nhận” thành “Chị đã nhận”; hạn “1 giờ 18, ngày 27/10”; dùng “Chưa thấy tiền” thay câu quá dài. | **Vừa:** hai dòng 0 đ có thể gom “Chưa có khoản nào được xác nhận”; cho mở xem chi tiết. Thanh dưới không cạnh tranh nút tiền. | **Giữ/đề xuất:** sau người dùng chọn mới mở bước kiểm tra và mã xác nhận; `dangGui`/`thanhCong` theo kết quả thật, không xu bay trước. |
| [14 cuối trang](anh-danh-gia/14-tien-don-cuoi.png) — **5/10** | **Vừa:** hai khối trống lớn không tạo thêm hiểu biết. Gom một khối chưa đến bước. | **Nhẹ:** viền nét đứt và hộp xanh tạo hai kiểu trạng thái trống; dùng một thẻ trung tính. | **Vừa:** “Chưa có quyết toán” thành “Chưa tính tiền cuối”; tiếp “Chờ chốt lượng hàng bên mua đã nhận”. | **Vừa:** “Chưa có lệnh…” và “Chưa có quyết toán” lặp chờ; chỉ giữ một lời giải thích, chi tiết mở thêm. | **Giữ/đề xuất:** không hiệu ứng khi chưa có dữ liệu; `doiTrangThai` sau kết quả thật, không C01. |
| [15 không hướng dẫn](anh-danh-gia/15-tien-khong-huong-dan.png) — **5/10** | **Vừa:** ba số cùng 32 px và ba đoạn dài chiếm gần cả màn. Một số chính, hai số phụ 22 px, lời giải thích mở thêm. | **Vừa:** “Còn chờ nhận” viền vàng dù không nêu hạn; dùng trung tính, chỉ đánh vàng khoản đến hạn. | **Nặng:** bỏ hứa “Giao hàng xong, ngân hàng chuyển”; thay “Ngân hàng chuyển theo kết quả nhận hàng và thỏa thuận của đơn”. | **Vừa:** lời giải thích từng khoản không cần lặp đầy đủ ở mọi thẻ; một mục “Ba khoản khác nhau thế nào?”. | **Giữ/đề xuất:** `demSo` sau cập nhật đã xác nhận; tuyệt đối không trâu cạnh ba tổng. |
| [15 cuối trang](anh-danh-gia/15-tien-cuoi.png) — **5/10** | **Vừa:** danh sách đơn giữ cọc vẫn nhiều thẻ; năm dòng gọn, có “Xem thêm”. | **Nhẹ:** thẻ và viền ổn; số tiền từng dòng 17 px, không cạnh tranh tổng ở đầu. | **Vừa:** “Xem bảng chi tiết cho kế toán” thành “Xem bảng chi tiết tiền”; không gọi người bán là kế toán. | **Vừa:** cùng Sông Tiền nhiều lần; bổ sung hàng/đợt giao để phân biệt, giữ mã đơn nhỏ. | **Giữ/đề xuất:** chỉ nhấn nền đúng dòng tiền vừa xác nhận; không đếm lại mọi khoản lịch sử. |
| [23 cuối trang](anh-danh-gia/23-to-chuc-cuoi.png) — **4/10** | **Nặng:** tám ô vai như cấu hình nội bộ; chọn “Người giúp” trước, phần quyền nâng cao mở riêng. | **Vừa:** khung fieldset vuông khác thẻ bo 14; dùng nhóm lựa chọn viền 1 px, mỗi dòng chạm được. | **Nặng:** thay “Vai được mời” bằng “Người này được giúp chị việc gì?”; lựa chọn “Ghi việc chăm vườn”, “Đăng và sửa hàng”, “Theo dõi giao hàng” chỉ nếu hệ thống thật sự hỗ trợ các quyền đó. | **Nặng:** bỏ các vai chỉ dành bên mua khỏi hộ bán; hạn mức tiền chỉ hỏi khi quyền được chọn cần tới. | **Giữ/đề xuất:** `chonThe` rồi `dangGui`/`thanhCong`; thông báo rõ lời mời đã gửi hay quyền đã có hiệu lực. Không C01 cạnh quyền tiền. |

## Đối chiếu các lỗi Claude đã ghi

| Hạng mục cũ | Bằng chứng lượt mới | Kết luận |
|---|---|---|
| Danh sách lời chào/hàng/đơn quá dài | 02, 05, 07 đã gộp dòng, có Xem thêm | Đã cải thiện rõ; còn tên trùng, chữ phụ bị cắt, trạng thái khó phân biệt. Không yêu cầu làm lại toàn bộ danh sách. |
| Trang chủ nhiều thẻ lời chào và 11 lối tắt | 01 có nhóm ba dòng và bốn lối tắt | Phần gom đã làm; vẫn lặp thẻ vườn với công cụ, việc bị thẻ tiền lấn. |
| Chi tiết đơn có 9 tab | 08/11 có dải 5 bước và nhóm liên kết | Đã thay cách điều hướng; nhóm liên kết vẫn quá rộng nhưng không còn 9 tab đồng thời. |
| Mã kỹ thuật, ngày giờ, lời báo quyền | 06, 09, 12, 19 còn thấy trực tiếp | Chưa dứt điểm. Đặc biệt mã BEFORE và thông báo không phân biệt nguyên nhân vẫn cần sửa. |
| L2 gọi hàng dạt | 04 và 04 không hướng dẫn | Còn nguyên. |
| Sổ lượng toàn 0, DT, mức xác minh tổ chức | Toàn văn 06 và ảnh cuối | Còn; đồng thời thấy hai chứng nhận cùng nhãn/hiệu lực. |
| Bên mua cần không liên quan mặt hàng | 02b/16 đã đưa cùng mặt hàng lên trước, khác thu gọn | Đã cải thiện; cần tránh khẳng định đã khớp tất cả điều kiện. |
| Thông báo trùng | 21 và nội dung cao 12.409 px | Chưa sửa được về nghĩa; đây vẫn là một trong những màn tệ nhất. |
| Vai bên mua lẫn hộ bán | 23 cuối trang | Còn cả Mua hàng, Kế toán, Kho. |
| Xác nhận tiền thiếu cảnh báo và đọc chữ | 13 đã có số tiền bằng chữ, cảnh báo còn đoạn xanh đầu trang | Số đọc chữ đã có; bố cục hành động và cảnh báo chưa đạt mẫu duyệt. |

## Quy tắc gắn hiệu ứng cho lượt sửa này

Không cần dùng đủ 39 mục. Chỉ chọn hiệu ứng có việc thật để báo. `vaoMan` dùng ngắn 120–260 ms và không làm người đọc chờ; `noiLen` chỉ vài dòng đầu; không phát lại khi quay về. Tôn trọng giảm chuyển động: đứng yên, đổi nhãn và giữ phản hồi bằng chữ.

`dangGui` đi cùng khóa gửi lặp, `thanhCong` chỉ sau kết quả lưu thật. `loiTruong` nêu đúng ô và một câu sửa được ngay, ví dụ “Chị nhập lượng hàng lớn hơn 0 kg”. Nếu lỗi mạng, giữ nguyên nội dung đã nhập; `matKetNoi` ghi “Chưa gửi được. Nội dung vẫn còn”, không tự gửi lại giao dịch khi mạng trở lại.

Tiền và ký dùng xác nhận rõ, không tạo hưng phấn: `demSo` chỉ sau giá trị đã được xác nhận đổi, không chạy lại khi mở màn; `dongDau` chỉ sau ký hợp lệ. Không mặc định sao chép bóng nút, font Baloo hay xu bay từ trang trưng bày asset sang “Sổ làm ăn”. Với người đọc chậm, phản hồi tĩnh “Đã nhận xác nhận lúc…” có giá trị hơn hoạt họa dài.

C01 hợp nhất ở hướng dẫn đăng hàng tự chọn, ghi chép và hỗ trợ. `nghe`/`songAm` chỉ khi micro đang thu thật; `gat` sau câu trả lời đã nhận; `binhtinh` trong hỗ trợ; `mung` chỉ khi đơn hết nghĩa vụ hàng và tiền. Không đặt trâu cạnh giá, cọc, số dư, nút ký, mã xác nhận hay hủy. Không thêm trâu vào các màn đang thiếu chỗ đọc.

## 10 việc sửa ưu tiên nhất

| Ưu tiên | Mức | Việc sửa cụ thể | Đạt khi |
|---|---|---|---|
| 1 | Nặng | Sửa ý nghĩa trạng thái tiền trên đơn chờ cọc: “Cọc cần bên mua chuyển: 7.200.000 đ”; chỉ ghi “Ngân hàng đã nhận cọc” khi có xác nhận. Đồng thời bỏ lời hứa “giao hàng xong là tiền về”. | 08 không còn tự mâu thuẫn với 10; 15 không hứa chuyển tiền vô điều kiện. |
| 2 | Nặng | Làm màn 13 đúng mẫu xác nhận tiền: việc cần làm đầu tiên, số phải kiểm, tài khoản, cảnh báo đỏ nhạt, nút “Đã thấy đủ 13.160.000 đ”, lối nhận một phần/chưa thấy theo nghiệp vụ. | Người bán đọc đủ số, cảnh báo và lựa chọn trong một vùng; không cần mở dòng nhỏ để tìm việc chính; dữ liệu thử được phân biệt theo G7. |
| 3 | Nặng | Dừng tự mở hướng dẫn che màn; sửa tràn 529 px ở Đăng hàng; bỏ C01 ở đơn và sổ tiền. | Khung 390 px không tràn; 04/08/15 hiện việc chính ngay; hướng dẫn mở theo yêu cầu và không che ô/nút. |
| 4 | Nặng | Giải quyết thanh dưới và dải nút trong luồng con: có chữ “Đăng hàng”; tạm ẩn thanh dưới khi nhập/xác nhận; dải nút không phủ ô lượng hay bàn phím. | 04 nhìn thấy trọn ô đang nhập; 13 chỉ có một hành động xanh chính theo việc; người dùng vẫn có Trở lại rõ. |
| 5 | Nặng | Viết lại dữ liệu Thông báo thành sự kiện có nghĩa và gộp theo đơn/nguồn, chỉ hiện số ít rồi xem thêm. | 21 không còn ba thẻ đầu cùng một câu; mỗi dòng trả lời được ai, việc gì, mở đâu; không bịa thông tin khi nguồn thiếu. |
| 6 | Nặng | Dọn mã và câu kỹ thuật ở 06/09/12/14/19: BEFORE, DT, mức xác minh, lỗi quyền, trả thẳng; đặt câu đầu thành việc cần làm/chờ ai. | Không có mã kỹ thuật trong lời hướng dẫn; nguyên nhân không được ký được nói chính xác; ngày tương lai trong Lịch sử được phân loại/sửa nguồn. |
| 7 | Vừa | Cho đủ tên người mua, ngày/hạn, hàng và lượng trong các dòng 01/02/02b/05/07; bỏ nhãn trạng thái trùng nhóm. | Hai lô 50 kg và các đơn Sông Tiền phân biệt được; hạn không bị dấu ba chấm che; dùng “triệu” thay “tr”. |
| 8 | Vừa | Gom chi tiết lô và các màn dài: bỏ dòng 0 mặc định, so/gộp chứng nhận trùng, thu gọn điều khoản, giới hạn danh sách cọc/lịch sử/tin. | 06 đọc được lượng còn bán trước; 09/15/18/19 có đường xem thêm rõ; không bắt cuộn hàng nghìn px để tìm việc. |
| 9 | Vừa | Chuẩn hóa token và từ ngữ riêng: Be Vietnam Pro 5 cỡ; màu đúng nghĩa; nút Nghe có chữ; ngày giờ Việt; sửa L2; vai người giúp đúng hộ bán; ghi rõ Nhật ký chưa dùng được. | Không còn nhãn xanh cho trạng thái chưa trả, không còn “L2 (hàng dạt)” hay vai mua hàng trong hộ bán; nhật ký không giống tính năng đã có. |
| 10 | Vừa | Gắn phản hồi theo sự kiện sau khi bố cục/câu chữ đã đúng: lưu, gửi, đổi trạng thái, điều kiện giao; ưu tiên thông báo tĩnh, có chế độ giảm chuyển động. | Không có hiệu ứng báo tiền/đã ký/đã lưu trước kết quả thật; không C01 cạnh tiền; trạng thái cuối luôn đọc lại được. |

Lượt chấm kết thúc tại đây. Không chờ Claude sửa xong, không chạy vòng duyệt tiếp và không chỉnh mã app.
