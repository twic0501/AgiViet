# Nghiên cứu luồng Đăng bài 3 cách (Codex, 31/10/2026)

**Nên dùng một bộ thông tin lô hàng, ba cách nhập.** Mặt hàng và vườn/ao của hộ được điền sẵn; chỉ hỏi phần còn thiếu hoặc cần xác nhận. Ảnh là bước chung của cả ba cách. Tôi đã đọc các nguồn được chỉ định, không sửa file.

**A. Người mua cần biết gì để quyết mua?**

Không có thứ tự tuyệt đối cho mọi vùng; dưới đây là thứ tự thực dụng để thiết kế, cần kiểm chứng thêm với vựa tại địa bàn thử nghiệm:

**Hàng gì, chất lượng nào → ở đâu → bao nhiêu còn bán → khi nào lấy → giá → ai thu hoạch, vận chuyển, cân và thanh toán.**

| Nhóm | Cần có để đăng tin hữu ích | Có thể bổ sung khi bên mua hỏi/chốt |
|---|---|---|
| **Trái cây** | Loại/giống; bán xô hay tuyển loại; còn trên cây hay đã hái; lượng còn bán; vườn; ngày hái/lấy; ảnh hiện tại | Cỡ trái, độ chín chi tiết, tỷ lệ loại/dạt; ai cắt, sọt/bao; chỉ tiêu và giấy tờ theo thị trường |
| **Lúa** | Giống; đang đứng đồng, lúa tươi hay đã khô; lượng ước/đã cân; ruộng/kho; ngày cắt/lấy | Độ ẩm đo thực tế, tạp chất, lẫn giống, đổ ngã; máy gặt, sấy, ghe/xe, cách trừ hao |
| **Thủy sản** | Loài; cỡ; còn trong ao, sống hay ướp đá; lượng; ao/điểm tập kết; ngày và khung giờ thu | Độ đồng đều, tình trạng sức khỏe/vỏ, cách thu và bảo quản; lấy mẫu, kiểm nghiệm, vận chuyển sống |

Độ ẩm quan trọng với lúa; cỡ `con/kg` quan trọng với tôm. Đây là những khác biệt có cơ sở kỹ thuật, nhưng **ảnh không thay phép đo**. [Khuyến nông về lúa](https://khuyennongvn.gov.vn/1-trieu-hecta-chuyen-canh-lua-chat-luong-cao/quan-ly-thu-hoach-va-xu-ly-lua-sau-thu-hoach-31686.html), [khuyến nông về tôm](https://khuyennongvn.gov.vn/khoa-hoc-cong-nghe/khcn-trong-nuoc/kinh-nghiem-tu-thanh-cong-cua-mo-hinh-nuoi-tom-the-tham-canh-bang-cong-nghe-biofloc-o-nghe-an-18004.html).

**Không cần hỏi lại:** danh tính, mặt hàng quen bán, địa bàn và cơ sở đã lưu. Phải xác nhận đúng vườn/ao nếu có nhiều cơ sở; vị trí điện thoại hiện tại không mặc nhiên là nơi có hàng. Nhật ký và ảnh chỉ gợi ý, không tự chứng nhận giống, loại hay độ an toàn.

**Ràng buộc API hiện tại:** tạo nháp cần `product_code`, `grade_code`, `qty_g`, `qty_basis`, `ask_price_vnd`, `floor_price_vnd`, cùng `idempotency_key`. Lượng và giá phải dương; giá kín không vượt giá mong muốn. `site_id` có thể được backend tự chọn nhưng cơ sở × mặt hàng × loại phải có xác minh còn hiệu lực. Đăng công khai cần ít nhất một ảnh mang cờ chụp trong app. Ngày thu hoạch và giống hiện là trường tùy chọn. [Nguồn tạo lô](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/lo.ts:11).

Về nghiệp vụ, “chưa biết giá, mời chào” là lựa chọn hợp lý; **API hiện chưa hỗ trợ**, không được điền số giả để vượt bước.

**B. Kịch bản giọng nói: tối đa sáu câu chính**

Mỗi lượt chỉ phát một câu. Luôn hiện kết quả ngắn với **Đúng rồi / Sửa**; chỉ hỏi lại phần nghe chưa chắc.

| Câu nói ra | Ví dụ trả lời → dữ liệu bóc ra | Xác nhận sai / khi bỏ qua |
|---|---|---|
| **1. Hỏi đặc điểm định giá theo hàng:** “Xoài bác bán xô hay đã lựa?” / “Lúa đang ngoài đồng hay đã cắt?” / “Tôm cỡ mấy con một ký?” | “Xoài cát Chu, bán xô”; “OM18, lúa tươi”; “Tôm thẻ năm chục con một ký” → giống, trạng thái, cách phân loại/cỡ | “Tôm 50 con/kg, đúng không?” Bỏ qua phần đã biết; không tự gán “loại 1”. |
| **2. “Đợt này bác còn bán bao nhiêu?”** | “Chừng tám tạ, chưa cân”; “Hai trăm giạ”; “Năm công chưa cắt” → lượng, đơn vị gốc, `qty_basis`; diện tích riêng | Đọc lại “800 ký, ước tính”. Với giạ phải xác nhận kg/giạ; công chỉ là diện tích, chưa đủ tạo lượng hàng. Không bỏ qua lượng. |
| **3. “Khi nào bên mua tới lấy được?”** | “Mốt hái, chiều lấy”; “Sáng thứ Hai kéo tôm” → `harvest_on`, `available_from`, khung giờ | Đọc ngày đầy đủ, tránh chỉ nhắc lại “mốt”. Nhật ký có ngày thì xác nhận nhanh; ngày hái và ngày lấy có thể khác nhau. |
| **4. “Lần gần nhất bác dùng thuốc là khi nào?”** | “Hôm kia, chai này nè”; “Từ lần ghi trong sổ tới giờ không dùng thêm” → ngày dùng, ảnh nhãn, xác nhận có phát sinh mới | Đối chiếu thuốc và thời gian cách ly; không đoán theo tên nghe gần giống. Bỏ phần khai lại khi nhật ký đủ và người bán xác nhận không dùng thêm. |
| **5. “Bác muốn bán bao nhiêu một ký?”** | “Hai mươi bốn ngàn”; “Tám ngàn hai” → `ask_price_vnd = 24000/8200` | Hiện và đọc đủ “8.200 đồng/kg”. Giá theo giạ phải xác nhận quy đổi; giá cả vườn không tự chuyển thành giá/kg. |
| **6. “Giá thấp nhất giữ kín là …, bác đồng ý không?”** | “Ừ”; “Thấp nhất hai mươi hai ngàn” → xác nhận hoặc sửa `floor_price_vnd` | Gợi ý 90% theo brief, nhưng phải được đồng ý. Mặc định hiện chữ, chỉ đọc khi người bán yêu cầu để tránh lộ với người đứng cạnh. |

Sau đó hướng dẫn **“Chụp hàng hiện tại”**. Khi đang lái xe, ồn hoặc mạng yếu: lưu nháp, chuyển sang nút chọn/gõ mà không mất câu đã trả lời.

Các thông tin cỡ, độ ẩm, bán xô/tuyển là nhu cầu nghiệp vụ; cấu trúc `TaoLo` hiện chưa có đầy đủ trường riêng để lưu chúng.

**C. Đăng từ nhật ký/mùa vụ**

| Nguồn hiện có | Dùng được đến đâu |
|---|---|
| Cơ sở và hồ sơ mặt hàng xác minh | Điền vườn/ao, mặt hàng, loại hợp lệ; địa chỉ lấy thêm từ hồ sơ cơ sở |
| Nhật ký hoạt động | Lấy ngày làm việc, thuốc, ngày hết cách ly, ảnh và lượng đã ghi khi thu hoạch |
| Ghi chú tự do | Có thể bóc giống/ngày dự kiến, nhưng phải cho người bán xác nhận |
| Hợp đồng vụ và cập nhật sản lượng | Có thể gợi ý thời gian, lượng dự kiến; phải kiểm tra phần đã cam kết |

**Khoảng trống hiện tại:** `/v1/farm-diary` chưa có trường cấu trúc riêng cho giống, ngày hái dự kiến, sản lượng ước. `theo_vu` đang nhóm theo hợp đồng vụ hoặc năm, chưa tương đương hồ sơ mùa vụ hoàn chỉnh. Lượng “đã thu hoạch” cũng chưa chứng minh “đã cân” hay “còn chưa bán”. [Nguồn nhật ký](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/nha-vuon.ts:55).

Quy tắc nên chốt:

- **Chặn thu hoạch trước ngày hết cách ly**; ngày được lấy phải phù hợp với ngày thu hoạch. Tính phía server từ nhật ký, không tin riêng dữ liệu client.
- Cho đăng **“sắp có hàng”** khi còn cách ly nếu lịch thu hoạch nằm sau mốc cho phép; không cho nhận ngay. **Database hiện chặn cả trường hợp còn cách ly hôm nay**, nên đang mâu thuẫn với luồng này. [Quy tắc hiện tại](/home/twictrn/agiviet-production-v2/db/migrations/0056_nhat_ky_xac_minh_mat_hang_va_ban_gap.sql:140).
- Nhật ký thiếu/cũ: hiện **“Chưa đủ thông tin cách ly; lần ghi gần nhất…”**, hỏi có dùng thuốc sau đó không. Không có dòng phun không đồng nghĩa không dùng thuốc.
- Biết có dùng thuốc nhưng chưa xác định được mốc ngừng: lưu nháp, bổ sung nhãn/hỗ trợ trước khi cho bán ngay. Thời gian ngừng thuốc phải theo sản phẩm và hướng dẫn chuyên môn. [Khuyến nông về ngừng thuốc thủy sản](https://khuyennongvn.gov.vn/thien-tai-dich-hai/bo-nnptnt-trien-khai-cac-bien-phap-cap-bach-phong-chong-dich-benh-tren-tom-9905.html).
- V8 chỉ chia sẻ phần nguồn gốc người bán chọn; ghi rõ **tự ghi / nhân viên xác nhận**. Không biến nhật ký thành chứng nhận không dư lượng.

**D. Rủi ro nghiệp vụ và chống gian**

- **Ảnh cũ/ảnh mạng:** hiện màn chọn cả ảnh thư viện nhưng mọi ảnh đều gửi `captured_in_app: true`; cờ này chưa chứng minh ảnh vừa chụp. Cần phân biệt nguồn ảnh, thời điểm chụp/tải; đối chiếu ảnh trùng, yêu cầu chụp lại khi nghi ngờ. GPS và EXIF là tín hiệu hỗ trợ, không phải bằng chứng tuyệt đối. [Luồng gửi ảnh](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:359).
- **Khai lượng ảo:** đối chiếu diện tích, lịch sử thu hoạch, ảnh và lượng đã đăng/cam kết cùng nguồn. Lệch lớn thì yêu cầu xác nhận, không áp một định mức năng suất cứng cho mọi hộ.
- **Ước tính:** mặc định cho hàng chưa thu hoạch. Trần 80% áp dụng **tổng lượng giữ/cam kết của cả lô**, không phải mỗi người mua được đặt 80%. Ước 10 tấn thì tổng tối đa 8 tấn, trừ phần đã phân bổ. Trần này không xác minh được sản lượng.
- **Đã cân:** cần ngày cân và căn cứ; không đổi nhãn chỉ để vượt trần. Theo brief, giao thiếu hai lần thì phải đã cân mới được hứa tiếp.
- **Hộ gom:** không gán nhật ký một vườn cho hàng gom nhiều nguồn; cần tách nguồn hoặc giữ các phần nguồn có thể truy lại.
- **Giá kín:** bảo vệ từ API, thông báo, chia sẻ và quyền người giúp. Không báo bên mua “thiếu 500 đồng là đạt sàn”, vì sẽ lộ ngưỡng.

**E. Màn hình 360–390 px và thứ tự chung**

Màn đầu có thẻ **“Xoài cát Chu · Vườn nhà”**, nút nhỏ **Đổi**, rồi ba hàng dọc: **Nói để đăng / Từ nhật ký, mùa vụ / Điền thông tin**. Không mở lưới chọn hàng mặc định. Nhiều cơ sở thì xác nhận đúng nguồn; không tự lấy cơ sở đầu tiên như backend đang dự phòng.

Thứ tự thông tin chung:

**Nguồn hàng điền sẵn → Đặc điểm hàng → Lượng còn bán → Ngày thu/lấy → Kiểm tra cách ly → Giá mong muốn → Giá kín → Chụp ảnh → Xem lại & đăng.**

Đây là thứ tự xử lý; màn đã đủ dữ liệu được bỏ qua:

- **Nói:** mỗi câu trong B là một màn; mic lớn, chữ kết quả, nút xác nhận.
- **Nhật ký:** chọn vụ/nguồn, thấy dữ liệu kèm “lấy từ dòng ngày…”, chỉ bổ sung phần thiếu.
- **Gõ:** mỗi màn một việc; lượng, ngày và hai mức giá tách riêng.

Mọi màn dùng chữ **≥17 px**, nút chính **≥56 px**, nút phụ **≥46 px**, icon kèm chữ, nút **Nghe**, một cột và nút đáy không che bàn phím.

**“Xem lại & đăng”** là màn riêng: hàng, nguồn, lượng kèm nhãn ước/đã cân, ngày, ảnh; mỗi dòng có **Sửa**. Giá kín nằm trong phần riêng, không tự đọc. Cần chốt thêm việc hiển thị giá mong muốn: bản xem trước hiện cho bên mua thấy, nhưng API xem lô hiện che cả hai mức giá.

Mất sóng phải báo **“Đã lưu nháp — chưa đăng”**; nén và gửi tiếp ảnh, giữ khóa chống tạo trùng. Chỉ hiện **“Đã đăng”** sau khi server xác nhận publish.
