# Góp ý nghiệp vụ và vận hành — phía người bán

Ghi lại trong lúc thiết kế đủ 51 màn app Nhà sản xuất, đối chiếu với *Đặc tả AgriMatch v2.1*.
Mỗi mục gồm: vấn đề, vì sao đáng lo, đề xuất, và giao diện hiện đang xử lý thế nào.
Đây là góp ý thiết kế sản phẩm, không phải ý kiến pháp lý.

---

## A. Cần quyết định trước khi làm tiếp

### 1. Bên bán không có gói — đặc tả đang ghi khác
- **Vấn đề:** Mục 2 đặc tả vẫn tính hạn mức Free cho *tổ chức* (5 tin/tháng gồm cả tin bán, 5 kết nối chủ động), và đưa "nhiều hộ/lô, phân bổ đơn, nhân viên" vào Business của HTX/trang trại. Theo quyết định mới, bên bán không có gói nào.
- **Vì sao đáng lo:**
  - Bỏ hạn mức thì không còn gì chặn tin rác và tin cũ.
  - Chi phí tạo tin bằng AI (ảnh, giọng nói) và chi phí gọi thoại/video trong app không có trần.
  - Tính năng HTX nhiều hộ, vốn tốn công vận hành nhất, trở thành miễn phí.
- **Đề xuất:**
  - Sửa mục 2 và mục 22 của đặc tả cho khớp quyết định.
  - Thay hạn mức bằng quy tắc chống lạm dụng:
    - tin tự ẩn sau 14 ngày nếu người bán không báo còn hàng;
    - giới hạn số tin mới mỗi ngày;
    - bắt buộc xác minh số điện thoại;
    - đặt trần số lần dùng AI mỗi ngày.
  - Chốt riêng: lô gộp nhiều hộ miễn phí luôn, hay chỉ miễn phí trong giai đoạn thí điểm.
- **Giao diện:**
  - Đã bỏ dòng "tin thứ 2/5 tháng 10" và thêm ghi chú "tin tự ẩn sau 14 ngày".
  - Trang Tôi ghi "Bên bán dùng app miễn phí".

### 2. Tỷ lệ phí dịch vụ theo gói của ai?
- **Vấn đề:** Phí dịch vụ là 0,8% (Free) hoặc 0,3% (Business), nhưng bên bán không có gói. Khi bên mua là Business thì áp 0,3% hay 0,8%? Khi người bán muốn "có hỗ trợ" mà bên mua không chịu trả thì sao?
- **Đề xuất:**
  - Tỷ lệ tính theo gói của **bên trả phí**.
  - Người bán tự trả thì luôn áp mức 0,8%, trần 3 triệu.
  - Màn hình phải ghi con số cụ thể trước khi hai bên đồng ý.
- **Giao diện:** Màn "Chọn cách giao dịch" đang giả định Bên mua B trả mức 0,8%, tức 536.000 đ. Cần sửa khi chốt quy tắc.

### 3. Người ít biết chữ ký thỏa thuận
- **Vấn đề:** Ký bằng OTP và tick "đã đọc" không chứng minh được người ký hiểu nội dung. Ở nông thôn, nhiều nhà dùng chung một điện thoại, hoặc dùng số của con cháu, nên khó biết ai thực sự bấm ký.
- **Vì sao đáng lo:** Khi có tranh chấp, người bán có thể nói "tôi không biết mình ký gì". Thỏa thuận lập với người không đọc được chữ thường cần người làm chứng.
- **Đề xuất:**
  - Với "giao dịch có hỗ trợ": bắt buộc nghe hết bản đọc, có người làm chứng hoặc cán bộ hỗ trợ, và xác thực bằng căn cước.
  - Lưu lại bằng chứng "đã nghe đọc" (thời lượng nghe, người làm chứng).
  - Nhờ luật sư rà soát.
- **Giao diện:**
  - Đã khóa nút ký cho tới khi bật "Tôi đã nghe hết và hiểu".
  - Đã thêm công tắc "Có người làm chứng ký cùng", nút nghe đọc cả bản, và luồng ký giấy.

### 4. Lượng ước tính lại ký thành cam kết cứng
- **Vấn đề:** Lô đăng "10 tấn ước tính" nhưng thỏa thuận ghi 10 tấn, chỉ được lệch ±5%. Mưa bão làm rụng trái là chuyện thường, và khi đó người bán vi phạm hợp đồng.
- **Đề xuất:**
  - Khi lô còn là ước tính, mẫu thỏa thuận nên có lựa chọn "theo sản lượng thực tế trong khoảng X–Y" hoặc "bên mua được ưu tiên mua trước".
  - Có điều khoản riêng cho hụt sản lượng do thời tiết.
  - Cảnh báo người bán ngay trước khi ký một lượng cứng dựa trên số ước tính.
- **Giao diện:** Đã có màn "Còn lại bao nhiêu" (cảnh báo khi thấp hơn lượng đã hứa, không tự sửa thỏa thuận) và màn "Giao đợt 2" (giao bù hoặc bớt khỏi đơn, phải chờ bên mua đồng ý).

---

## B. Nên sửa trước khi thí điểm

### 5. Giờ hỗ trợ không khớp giờ giao hàng
- **Vấn đề:** Người hỗ trợ làm 7–19 giờ, nhưng giao nông sản thường bắt đầu lúc 5–6 giờ sáng. Lúc cân tại vườn là lúc dễ phát sinh bất đồng nhất.
- **Đề xuất:** Trực theo ca của từng đợt giao đã hẹn, ví dụ từ 1 giờ trước giờ giao, hoặc trực sớm trong mùa vụ.
- **Giao diện:** Màn chọn phương thức đang ghi "chị Hạnh · 7–19 giờ". Cần sửa khi chốt ca trực.

### 6. Cân và kiểm hàng bằng thiết bị của bên mua
- **Vấn đề:** Cân là cân của bên mua, kết quả cũng do bên mua nhập. Người bán khó phản bác ngay tại chỗ.
- **Đề xuất:**
  - Người bán chụp màn hình cân và nhập số của mình song song.
  - Thỏa thuận ghi rõ ai hiệu chuẩn cân, lấy mẫu thế nào, có giữ mẫu lưu hay không.
- **Giao diện:**
  - Danh sách chuẩn bị có việc "Chụp ảnh lúc cân".
  - Màn kết quả cho người bán trả lời đúng/sai từng dòng và thêm ảnh của mình.
  - Không trả lời thì không tính là đồng ý.

### 7. Hàng dễ hư trong lúc đang tranh chấp
- **Vấn đề:** Đặc tả vừa cho phép "đo lại", vừa cho xử lý hàng dễ hư. Với 200 kg xoài chín nhanh, nếu người bán bán đi thì mất bằng chứng; nếu giữ lại chờ đo thì hàng hư.
- **Đề xuất:**
  - Bắt buộc lấy **mẫu lưu có niêm phong** và ảnh có giờ trước khi xử lý hàng.
  - Hạn đối soát cho hàng tươi rất ngắn, 24–48 giờ.
  - Ghi trước trong thỏa thuận ai được quyết định bán hàng bị trả.
- **Giao diện:** Màn "Đối soát 200 kg" có mục "Hàng dễ hư" (còn 3 ngày, bạn quyết định giữ hay bán, giữ ảnh làm bằng chứng). Chưa có bước mẫu lưu.

### 8. "Đã nhận tiền" hoàn toàn dựa vào người bán bấm
- **Vấn đề:** "Trả khi cân" thường là tiền mặt hoặc chuyển khoản ngay tại vườn. App không đọc được ngân hàng, nên người bán có thể bấm nhầm, hoặc bị ép bấm trước khi thấy tiền. Ngược lại, người bán quên bấm thì bên mua bị kẹt.
- **Đề xuất:**
  - Cho hủy xác nhận trong 24 giờ.
  - Ghi hình thức trả (tiền mặt hay chuyển khoản).
  - Nhắc cả hai bên nếu sau X giờ chưa xác nhận.
  - Bên mua được nộp bằng chứng ngân hàng để người hỗ trợ xem.
- **Giao diện:**
  - Màn cọc cảnh báo "ảnh biên lai chưa chắc tiền đã về" và có nút "Chưa thấy tiền".
  - Màn lịch sử ghi rõ "đã nhận" là số tiền bạn đã bấm xác nhận.

### 9. HTX bán thay nhưng hộ thành viên không thấy phần của mình
- **Vấn đề:** App chưa tự chia tiền. Hộ thành viên không biết HTX bán lô được bao nhiêu và khi nào trả. Mục tiêu "bảo vệ quyền lợi về giá cho nông dân" vì vậy dừng ở HTX, không tới được từng hộ.
- **Đề xuất:** Với các hộ đã ủy quyền, cho họ xem dòng của mình (lượng, giá, ngày trả) ở chế độ chỉ đọc. Đây cũng là bước chuẩn bị cho việc chia tiền sau này.
- **Giao diện:** Màn "Lô gộp nhiều hộ" có giấy tờ của từng hộ và ghi chú "app chưa tự chia tiền". Chưa có góc nhìn của hộ thành viên.

### 10. Người ít biết chữ chốt việc qua điện thoại
- **Vấn đề:** Đặc tả nói cuộc gọi không làm đổi thỏa thuận, nhưng người ít biết chữ chủ yếu thỏa thuận bằng miệng. Họ dễ tin rằng "đã nói là xong".
- **Đề xuất:**
  - Sau mỗi cuộc gọi, app tóm tắt "vừa nói gì" và hỏi có muốn tạo bản mới không.
  - Việc tóm tắt không cần ghi âm. Nếu muốn ghi âm thì phải xin phép cả hai bên.
- **Giao diện:** Trong chat có thẻ nhắc sau cuộc gọi, kèm nút "Tạo bản mới".

---

## C. Lưu ý thêm

11. **Chăn nuôi và thủy sản nghiệm thu khác trái cây.** Ví dụ: cân hơi, cỡ con/kg, tỷ lệ hao hụt. Giao diện hiện chỉ có bảng độ ngọt. Cần mẫu quy trình nghiệm thu cho từng ngành trước khi mở ngành đó.
12. **Nguồn "giá khách chào gần đây".** Nếu lấy từ các báo giá trên app thì có nguy cơ lộ giá riêng của từng bên mua, mà đặc tả cấm điều này. Chỉ nên hiện khi gộp được đủ mẫu ẩn danh (ví dụ từ 3 bên trở lên). Ít mẫu thì ghi "chưa đủ dữ liệu".
13. **Người bán chủ động chào hàng không bị giới hạn.** Bên mua có thể bị chào hàng dồn dập. Nên giới hạn số lần chào hàng mỗi ngày, và cho bên mua tắt nhận chào hàng.
14. **Gọi đọc mã OTP.** Cách này giúp người không đọc được tin nhắn, nhưng kẻ gian có thể giả cuộc gọi của app. Cuộc gọi thật chỉ đọc mã, không bao giờ hỏi mã. Cần nói rõ điều này trong cuộc gọi và trong phần hỏi đáp.
15. **Thí điểm chỉ một nhóm trái cây chế biến.** Nên giữ màn chọn mặt hàng đầy đủ để thiết kế không phải làm lại, nhưng khi thí điểm thì ẩn các ngành chưa có quy trình nghiệm thu.
