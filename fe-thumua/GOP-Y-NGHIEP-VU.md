# Góp ý nghiệp vụ và vận hành — phía bên mua

Ghi lại khi thiết kế 30 màn của app Thu mua theo *Đặc tả AgriMatch v2.1*, trên 2 gói Miễn phí và Business.
Đây là góp ý thiết kế sản phẩm, không phải ý kiến pháp lý.

---

## A. Cần quyết định trước khi làm tiếp

### 1. Nếu chỉ tính tiền phí, Business ít khi có lợi
- **Phép tính:** Business rẻ hơn Miễn phí 0,5% phí trên mỗi đơn có hỗ trợ. Để bù 1.500.000 đ thuê bao mỗi tháng, tổng đơn có hỗ trợ phải đạt **từ 300 triệu/tháng** trở lên.
- **Đặc tả mục 11 tự giả định:** mỗi khách dùng 2 đơn × 100 triệu, và chỉ 50% khách có dùng. Tính ra mỗi khách chỉ đỡ khoảng 0,5 triệu tiền phí mỗi tháng, thấp hơn nhiều so với 1,5 triệu thuê bao.
- **Hệ quả:** giá trị của Business phải đến từ công cụ: mối quen, kế hoạch mua, phân quyền, công nợ, AI. Người mua sẽ tự tính ra điều này, nên trang giá cần nói thẳng. Màn "Business có lợi khi nào?" đã có sẵn thanh kéo để họ tự tính.
- **Đề xuất cần kiểm chứng:** hoặc thuê bao bao gồm luôn vài đơn có hỗ trợ, hoặc tính giá theo số tài khoản, hoặc có mức giá thấp hơn cho vựa nhỏ.

### 2. Người bán chủ động liên hệ thì có trừ lượt của bên mua không?
- **Vấn đề:** Đặc tả chỉ nói "kết nối chủ động mới" và "tính khi đối tác chấp nhận". Chưa rõ trường hợp người bán nhắn trước, bên mua chấp nhận thì có bị trừ lượt không.
- **Giao diện đang giả định:** không trừ, có dòng "2 người bán chủ động liên hệ · không tính lượt".
- **Rủi ro:** bên mua có thể nhờ người bán nhắn trước để né hạn mức. Có thể chấp nhận được vì cách này có lợi cho người bán, nhưng cần ghi rõ vào đặc tả.

### 3. Gói Miễn phí chỉ có một người, trong khi đặc tả đòi tách quyền ký
- **Vấn đề:** Đặc tả mục 10 yêu cầu tách riêng quyền ký, phê duyệt và kế toán. Nhưng gói Miễn phí chỉ có một người quản lý. Với doanh nghiệp, người ký thường là giám đốc, không phải người mua hàng.
- **Giao diện đang giả định:** người ký được mời ký **từng thỏa thuận qua đường link**, không chiếm tài khoản. Nếu không cho làm vậy thì doanh nghiệp dùng gói Miễn phí không ký đúng thẩm quyền được.
- **Cần chốt:** có cho phép cách này không, và xác thực người ký qua link như thế nào.

### 4. Hết thời gian dùng thử Business thì các thứ đã tạo ra sao?
- **Giao diện đang giả định:**
  - Tài khoản thứ 2 và 3 chuyển sang chỉ xem.
  - Mối quen vẫn xem được nhưng không thêm mới.
  - Các kết nối đã có vẫn giữ.
  - Đơn đã ký giữ mức phí 0,3%.
  - Hạn mức Miễn phí áp dụng từ kỳ sau.
- **Cần chốt:** đặc tả mới nói "không xóa tin hay hồ sơ cũ", chưa nói gì về tài khoản thành viên và mối quen.

---

## B. Nên sửa trước khi thí điểm

### 5. Kế hoạch mua dễ tính lượng quá lên
- **Vấn đề:** Thỏa thuận đã ký nhưng lượng vẫn là **ước tính** của người bán, khi cân thật có thể hụt. Nếu tính lượng này là "đã chắc chắn" thì kế hoạch bị lạc quan hơn thực tế.
- **Giao diện đang làm:** tách 4 mức: đã ký và đã cân / đã ký nhưng còn ước tính / chờ ký / chưa có nguồn. Đặc tả nên ghi rõ quy tắc này.

### 6. Nhập danh sách mối quen từ Excel đụng tới dữ liệu cá nhân
- **Vấn đề:** Số điện thoại của những người chưa dùng app là dữ liệu cá nhân. Cần có cơ sở hợp pháp để lưu và dùng; cần luật sư đối chiếu với quy định bảo vệ dữ liệu cá nhân hiện hành.
- **Giao diện đang làm:**
  - Bắt tích "tổ chức có quyền dùng dữ liệu" trước khi nhập.
  - App **không tự nhắn, không tự mời**. Bên mua chỉ tạo đường link để tự gửi.
  - Chỉ lưu mối quen thì không phát sinh phí.

### 7. Bên mua là bên nhập kết quả cân và đo
- **Vấn đề:** Đây là chỗ dễ lệch quyền nhất, vì cân và máy đo thường là của bên mua. Đặc tả mục 21 đã yêu cầu ghi đủ phương pháp.
- **Giao diện đang làm:**
  - Bắt nhập 10 lần đo, thiết bị, người đo, người chứng kiến.
  - Bằng chứng gồm phiếu cân, ảnh máy đo, ảnh hàng bị loại, số niêm phong mẫu lưu.
  - Sửa số sau khi gửi thì tạo bản kết quả mới và phải xác nhận lại.

### 8. Chưa định nghĩa "bên sai" khi đo lại
- **Vấn đề:** Phí đo lại do "bên có kết quả sai" trả, nhưng chưa có ngưỡng để nói ai sai.
- **Đề xuất:** ghi ngưỡng ngay trong quy trình nghiệm thu. Ví dụ: kết quả đo lại lệch quá 0,3 °Bx so với số của bên nào thì bên đó sai.

### 9. "Đã trả" phụ thuộc vào việc người bán bấm xác nhận
- **Vấn đề:** Người bán ít dùng điện thoại có thể quên bấm. Khi đó công nợ bên mua hiện "chưa khớp" mãi.
- **Giao diện đang làm:** có cột "Khớp với người bán", và app nhắc cả hai bên sau 48 giờ.
- **Đề xuất sau này:** đối soát qua ngân hàng hoặc qua đối tác thanh toán.

### 10. Thời điểm chốt mức phí khi đổi gói
- Đơn giữ biểu phí tại lúc ký (đặc tả đã có). Giao diện ghi rõ điều này ở chi tiết đơn, màn nâng cấp và màn "về Miễn phí thì sao".
- **Cần chốt thêm:** đơn đã tạo nhưng chưa ký tại thời điểm đổi gói thì áp mức nào.

---

## C. Lưu ý thêm

11. **Thuế GTGT của thuê bao** chưa có trong đặc tả. Giao diện đang ghi "chưa gồm thuế, tính theo quy định khi xuất hóa đơn".
12. **Ưu đãi đối tác kiểm định** trên giao diện đang dùng "[Đối tác A]" làm chỗ giữ tên. Chỉ hiển thị khi đã ký thỏa thuận với đối tác, đúng như đặc tả.
13. **AI tính "tổng chi phí nhận hàng"** phụ thuộc vào các giả định (tiền xe, tỷ lệ loại 1, giá bán lại loại 2). Giao diện cho sửa giả định và ghi rõ AI không quyết định giá công bằng. Nếu AI tự điền giả định thì dễ làm lệch lựa chọn.
14. **Giá tham khảo:** chỉ hiện "giá đã giao dịch" khi có từ 3 đơn trong 30 ngày, còn lại ghi "chưa đủ dữ liệu". Giá chào mua và giá đã giao dịch luôn tách riêng.
15. **Đã sửa luôn ở app người bán:** nhãn thứ trong tuần bị lệch một ngày. Ví dụ app ghi "Thứ Tư 8/10" nhưng 8/10/2026 là thứ Năm.
