# 04 · Tổ chức dịch vụ theo ngành hàng

Ngày nghiên cứu: **27/10/2026**. Trạng thái: **đề xuất để chủ dự án xem xét**, không thay thế đặc tả, không xác nhận tính năng đã được xây dựng và không xác nhận đã có đối tác cung ứng thật. Tài liệu đi cùng [03 · Mặt hàng và vận hành](03-mat-hang-va-van-hanh.md).

**Đề xuất triển khai theo ba cấu hình vận hành:** mua lô tại nguồn; đầu mối gom và giao giỏ nhiều mặt hàng; liên kết vùng nguyên liệu với nhà máy. Khởi đầu thương mại nên ưu tiên xoài Cát Chu, chanh không hạt và bưởi da xanh cho vựa/đơn vị phân phối nội địa; lúa tươi là ứng viên thứ tư khi có bên mua, xe và cửa nhận sấy được xác nhận. Rau giao sáng cho bếp, tôm, cá tra, sầu riêng xuất khẩu và thủy sản sống cần những cổng năng lực riêng trước khi nhận giao dịch. Danh mục dài hạn vẫn có thể bao phủ hàng thô nông sản, thủy hải sản; loại gỗ và tiếp tục hạn chế thịt công nghiệp theo phạm vi người sáng lập.

## 1. Phân biệt năng lực của app với trách nhiệm cung ứng

### 1.1 Căn cứ có nguồn và ý nghĩa đề xuất

**Sự thật có nguồn:** case Freshket phân biệt gom/chuẩn bị qua đêm với giao nhà hàng ban ngày. Lịch cụ thể và mô hình mua theo đặt trước được trình bày tại mục 3.2.1 của [tài liệu 03](03-mat-hang-va-van-hanh.md). ([The Story Thailand, 19/10/2020](https://www.thestorythailand.com/freshket-%E0%B8%88%E0%B8%B2%E0%B8%81-%E0%B8%A1%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%95%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA-%E0%B8%AA%E0%B8%B9%E0%B9%88-%E0%B9%81%E0%B8%9E/); [NIA, 26/04/2023](https://agtech.nia.or.th/2023/freshket/); truy cập 27/10/2026.)

**Sự thật có nguồn:** MM và ABA công bố dịch vụ phân phối có hạ tầng vật lý, được phân tích tại mục 3.1 của tài liệu 03. **Giới hạn:** báo giá, lượng tối thiểu và khung giờ phù hợp tuyến thử tại Đồng Tháp **chưa kiểm được**. ([MM, trang 11/05/2021, sự kiện 07/01/2021](https://mmvietnam.com/tin-tuc/mo-rong-khu-vuc-hoat-dong-kinh-doanh-tai-da-lat/); [ABA, trang dịch vụ không ghi ngày cập nhật](https://aba.com.vn/vn/); truy cập 27/10/2026.)

**Suy luận/đề xuất:** AgiViet cần ghi rõ đơn vị chịu trách nhiệm từng chặng, thay vì suy từ việc có tên kho/nhà xe trên app thành năng lực đã được đặt chỗ. Mỗi tuyến phải có người có quyền quyết định khi thiếu hàng, chậm xe, sai loại hoặc kết quả kiểm nghiệm chưa về. Phí của đối tác và phí AgiViet cần được tách để bên mua biết ai cung cấp dịch vụ và ai xử lý khiếu nại.

### 1.2 Ba cấu hình nên dùng để tổ chức thí điểm

| Cấu hình đề xuất | Bên mua và hàng phù hợp | Ai thực hiện việc vật lý | AgiViet phụ trách | Điều kiện nhận đơn |
|---|---|---|---|---|
| Mua lô tại nguồn | Vựa/phân phối mua xoài, chanh, bưởi; vựa/trạm sấy mua lúa | Hộ/HTX chuẩn bị; bên mua hoặc đơn vị được thuê cân, phân loại, bốc và vận tải | Hồ sơ lô, thỏa thuận quy cách, lịch hẹn, chứng cứ cân/loại, đối soát | Bên mua xác nhận quy cách và xe; điểm nghiệm thu/chuyển rủi ro rõ; lúa phải có cửa sấy |
| Đầu mối giao giỏ | Nhà hàng, bếp ăn, khách sạn mua nhiều rau củ/trái cây | Một đầu mối nhận trách nhiệm gom, sơ chế, chia đơn, giao và đổi bù; có thể thuê vận tải | Đơn nhiều dòng, lịch lặp, đồng ý thay hàng từng dòng, ghi nhận giao/thiếu/công nợ | Đầu mối đã chứng minh ca làm, nguồn thay thế, tuyến và năng lực lạnh; không ghép nhiều hộ độc lập rồi hứa một giỏ hoàn chỉnh |
| Vùng nguyên liệu–nhà máy | Nhà máy mua lúa, tôm, cá tra hoặc trái cây chế biến | Bộ phận nguyên liệu/QA nhà máy, HTX/trang trại, đội thu hoạch và phương tiện chuyên dụng | Kế hoạch vụ, sản lượng dự kiến, đợt gọi hàng, hồ sơ kiểm, công nợ và thay đổi hợp đồng | Nhà máy đã chấp nhận nguồn; có người duyệt chất lượng, lịch nhận và năng lực thanh toán |

**Ranh giới đề xuất:** nhân viên AgiViet điều phối và ghi nhận chứng cứ; không mặc nhiên là người kiểm nghiệm, người giữ kho, chủ hàng, người bảo lãnh thanh toán hoặc bên bao tiêu. Nếu thuê nhân viên hiện trường đo/cân, phải mô tả nghiệp vụ, dụng cụ, đào tạo, chi phí và phạm vi trách nhiệm riêng. Việc tổ chức này phù hợp định vị trung gian trong ba tài liệu nghiệp vụ đã đọc; chưa phải quyết định sửa đặc tả.

## 2. Quy trình khác nhau theo ngành hàng

Toàn bộ mốc giờ, ngưỡng và tình huống trong mục này là **đề xuất thiết kế vận hành để thử**, trừ phần được đánh dấu có nguồn. Không đưa nguyên các giá trị này thành cam kết hợp đồng thật trước khi đối tác xác nhận.

### 2.1 Xoài, chanh, bưởi nội địa: chốt quy cách trước chuyến xe

| Chặng đề xuất | Nội dung cần thống nhất | Người thực hiện và chứng cứ |
|---|---|---|
| Xác nhận nhu cầu lặp | Mặt hàng/giống, cỡ, độ chín phù hợp cách sử dụng, số lượng mỗi đợt, ngày nhận và điểm giao | Bên mua xác nhận; AgiViet ghi lịch và người có quyền nhận |
| Xác minh nguồn và mẫu | Vườn/HTX, ngày dự kiến hái, ảnh mẫu, phân biệt lỗi ngoại quan với thối/hỏng hoặc nghi không an toàn | Người bán cung cấp; nhân viên hiện trường/QA đối tác kiểm theo phạm vi được thuê |
| Chốt lô và xe | Khối lượng tối thiểu, sai số được đồng ý, bì/thùng, phí bốc xếp, bên lo xe, thời gian chờ, nơi cân | Hai bên chốt; vận tải xác nhận chuyến, không chỉ báo “có xe” |
| Nghiệm thu | Cân tịnh và bì; lấy mẫu rải đều; đạt/hạ cấp/trả lại theo quy cách đã ký | Hai bên hoặc đại diện được ủy quyền chứng kiến; ảnh/mẫu/biên bản gắn đúng lô |
| Giao và quyết toán | Ghi thời gian bốc/đến, tổn thất đường nếu có, số tiền đến hạn và ai xác nhận tiền | Người nhận/nhà xe ghi sự kiện; AgiViet đối chiếu theo thỏa thuận |

**Ví dụ minh họa đề xuất:** chanh bán theo hợp đồng khung cho đơn vị phân phối đồ uống, mỗi đợt 300 kg; bưởi bán 500 kg cho vựa nội địa, kiểm cỡ và cắt mẫu thống nhất; xoài bán một lô cho vựa, tách phần trầy vỏ còn phù hợp chế biến. Các lượng trên là giả định để dựng tình huống, không phải MOQ thị trường đã xác minh. Nhà máy chế biến chỉ là đầu ra khi đã có người mua chấp nhận loại, lượng, lịch nhận và tiêu chí an toàn; không gắn nhãn “dạt” rồi mặc định nhà máy sẽ nhận.

**Căn cứ có nguồn:** case Kim Nhung ghi nhận giá trị của nâng cấp sơ chế/lạnh; chi tiết tại mục 3.1.4 tài liệu 03. **Suy luận:** ưu tiên vựa có năng lực đó, không dùng kết quả dự án làm cam kết hao hụt của AgiViet. ([UN Việt Nam/UNIDO, 28/05/2018](https://vietnam.un.org/en/21372-innovative-technology-improve-quality-mango-mekong-river-delta-export-markets-and-increase); truy cập 27/10/2026.)

### 2.2 Rau ăn lá và rau củ cho bếp: cần đầu mối nhận trách nhiệm cả giỏ

**Căn cứ có nguồn:** Thủ Đức và Phước An có nhịp gom/xử lý khác nhau; xem giờ cụ thể tại mục 3.1.1–3.1.2 của tài liệu 03. **Suy luận:** không áp một giờ cho mọi rau/nhà cung cấp. ([CAND, 01/02/2019](https://cand.com.vn/Thi-truong/Siet-chat-quan-ly-cac-mat-hang-tu-cho-dau-moi-i509464/); [Phụ Nữ, bài phản ánh tình hình 2023–2024, ngày đăng chính xác chưa kiểm được](https://tuoitre.vn/phunuonline/cac-hop-tac-xa-trong-rau-o-tphcm-thoi-thop-vi-sao-1101517972.htm); truy cập 27/10/2026.)

**Lịch thử đề xuất cho tuyến có khách cần nhận sáng sớm**, không phải lịch của hai case trên:

| Thời điểm theo giờ Việt Nam | Công việc đề xuất | Trách nhiệm |
|---|---|---|
| Ngày D−1, 14:00–17:00 | Bếp xác nhận giỏ ngày D, lượng từng dòng, quy cách sơ chế và khoảng nhận; đầu mối xác nhận khả năng cung ứng | Bếp và đầu mối; AgiViet theo dõi ngoại lệ |
| D−1, trước giờ chốt riêng của tuyến | Xác nhận phần thiếu, món thay và giá chênh lệch; chốt xe và người nhận | Đầu mối đề nghị; bếp đồng ý từng dòng; im lặng không được xem là đồng ý thay |
| D−1 buổi chiều hoặc D từ 00:00–03:00 | Thu hoạch/nhập nguồn tùy mặt hàng, giảm nhiệt khi cần, kiểm và sơ chế theo quy trình của cơ sở | Hộ/HTX và đầu mối; không để AgiViet tự suy lịch thu hoạch |
| D, 02:00–04:30 | Chia giỏ, cân, đóng gói, xếp xe theo tuyến và nhóm nhiệt độ | Đầu mối/đối tác kho và xe; ghi số lô cho từng dòng |
| D, 04:30–07:00 | Giao cho khách thực sự cần nhận khung này; kiểm nhanh và xử lý phần thiếu | Tài xế và người nhận đã hẹn; người trực đầu mối có quyền điều xe/đổi bù |
| Sau từng đợt | Chốt lượng thực nhận, hàng thay, hàng trả và nghĩa vụ tiền; ghi nguyên nhân thiếu/trễ | Đầu mối và bếp; AgiViet hỗ trợ đối soát |

Khung trên chỉ được đưa vào thí điểm thật sau khi người mua xác nhận giờ nhận và đối tác xác nhận đủ ca. Khách cần nhận 08:00–10:00 phải có tuyến riêng; không ép giao 05:00 vì giả định “HORECA luôn nhận rất sớm”. Một ca giao đêm có người trực, số gọi khẩn và phương án khi mất liên lạc; việc có ứng dụng hoạt động 24 giờ không chứng minh có dịch vụ hỗ trợ 24 giờ.

**Đề xuất riêng về giỏ:** một đơn bán từ đầu mối có nhiều dòng hàng; mỗi dòng giữ mặt hàng, quy cách, nguồn lô, lượng đặt, lượng chốt, lượng nhận, lượng thay và giá. Đơn đầu mối mua từ các hộ là các giao dịch riêng, không tự động kéo giá bán hay danh tính hộ sang đơn nhà hàng. Có thể thay rau cải bằng loại khác chỉ khi bếp đồng ý rõ; dị ứng, công thức món và định lượng suất ăn khiến việc thay không thể do tài xế tự quyết. Nếu chỉ thiếu một dòng thì giao phần đã xác nhận được; phần thiếu không được coi là hoàn thành.

**Đề xuất riêng về sơ chế:** phân biệt rau nguyên bó, nhặt/cắt rễ, rửa, cắt sẵn và đóng gói. Đây là các mức dịch vụ có hao hụt, lao động, nước và kiểm soát vệ sinh khác nhau. Chốt khối lượng thanh toán trước hay sau sơ chế; không thu đủ tiền khối lượng rau nguyên liệu khi hợp đồng bán theo kg thành phẩm nếu chưa có thỏa thuận tỷ lệ hao hụt. Chưa có dữ liệu chi phí/kg và tỷ lệ hao hụt tại đối tác thử: **chưa kiểm được**.

### 2.3 Lúa tươi: điều phối gặt–xe–sấy, không tạo tồn chờ bán

| Cổng đề xuất | Nội dung phải có trước khi gặt | Xử lý khi không đạt |
|---|---|---|
| Nhu cầu và giống | Bên mua đã chấp nhận giống, vụ, vùng, ước lượng sản lượng và tiêu chí tạp chất/ẩm | Không lên lịch thu hoạch chỉ dựa vào tin đăng |
| Chỗ nhận/sấy | Trạm sấy xác nhận lượng nhận, cửa thời gian, công suất trống và thời gian chờ dự kiến | Dời gặt hoặc đổi trạm đã chấp thuận; không đổ lúa ra điểm gom không có xử lý |
| Phương tiện | Xe/ghe, đường vào ruộng, điểm bốc, đội gặt và phương án khi mưa | Điều phối lại trước khi mở lô; ghi ai chịu chi phí chờ |
| Đo và tính tiền | Thiết bị đo ẩm, cách lấy mẫu, tạp chất, cân bì và công thức quy đổi được hai bên chấp nhận | Đo lại bằng phương pháp đối chứng; không tự áp “ẩm chuẩn 25%” cho mọi hợp đồng |
| Thanh toán | Người trả tiền, hạn trả, số tiền còn thiếu, năng lực thanh toán và khoản đã đến hạn | Dừng cam kết đợt mới khi quá hạn theo thỏa thuận; không giả định cọc bảo vệ toàn bộ |

**Ví dụ minh họa đề xuất:** HTX dự kiến 20 tấn lúa, chia hai đợt theo giờ nhận của trạm sấy; mưa làm đợt hai dời sang hôm sau, điều chỉnh lịch máy gặt và xe trước khi cắt. Lượng 20 tấn là giả định. Thời gian chất lượng còn chấp nhận được phụ thuộc độ ẩm, nhiệt độ và điều kiện chứa; xem ma trận và nguồn kỹ thuật trong tài liệu 03, không lấy một hạn giờ chung làm bảo đảm.

**Căn cứ có nguồn:** sự cố trả chậm của Lộc Trời năm 2024 được phân tích tại mục 3.1.6 tài liệu 03. **Suy luận:** cần kiểm thanh khoản, công nợ và điều kiện ngừng giao mới; cọc một phần không thay thế việc đó. ([VnExpress, 21/05/2024](https://vnexpress.net/loc-troi-tra-hon-470-ty-dong-tien-no-mua-lua-cho-nong-dan-4748922.html); truy cập 27/10/2026.)

### 2.4 Tôm: duyệt ao và kết quả kiểm trước khi điều đội thu

**Đề xuất quy trình:** nhà máy/đại lý được nhà máy chấp nhận duyệt ao và kế hoạch thu; QA lấy mẫu theo danh mục chỉ tiêu phù hợp, ghi nhận chuỗi bàn giao và thời gian dự kiến có kết quả; chỉ điều đội thu khi cửa chất lượng được duyệt theo quy trình bên mua. Trước thu phải xác nhận cỡ, phương pháp đếm mẫu, bảng giá theo cỡ, khuyết tật, phương pháp cân trừ nước/đá, đá sạch, dụng cụ và xe. Trong thu hoạch phải theo dõi thời gian từ kéo tới cấp lạnh và tới nơi nhận; giao đúng cửa nhà máy, nghiệm thu và quyết toán theo bảng cỡ đã ký.

Không đưa “test nhanh âm tính” thành bảo đảm đáp ứng toàn bộ chỉ tiêu dư lượng hoặc mọi thị trường xuất khẩu. Kết quả phải gắn đúng ao/lô, chỉ tiêu, phương pháp, phòng thử/đơn vị thực hiện, người lấy mẫu và thời điểm; hạn trả kết quả do đơn vị kiểm và bên mua xác nhận, không mặc định hai giờ. Nếu kết quả chưa có hoặc không đạt, phải có quyết định của QA có thẩm quyền; không tự thu rồi tìm người mua khác để né yêu cầu an toàn. Cỡ nhỏ hơn dự kiến nhưng an toàn là vấn đề quy cách; dương tính chất cấm/nghi không an toàn là nhánh cách ly và xử lý riêng.

**Ví dụ minh họa đề xuất:** ao dự kiến thu tôm cỡ 50 con/kg; mẫu thực tế rơi sang khoảng cỡ khác đã có bảng giá, hai bên áp bảng trước khi bốc. Nếu kết quả kiểm chưa về, người điều phối báo nhà máy, đội thu và xe; không tự coi hết hạn chờ là đạt. AgiViet ghi nhận tình trạng và bên có quyền duyệt, không ký thay kết luận QA. Căn cứ lịch sử về đại lý, kiểm ao và nhịp thu tôm được nêu trong tài liệu 03; SLA hiện hành của đối tác thí điểm **chưa kiểm được**.

### 2.5 Cá tra: bắt đầu từ kế hoạch nguyên liệu của nhà máy

**Căn cứ có nguồn:** Vĩnh Hoàn công bố kiểm soát nguồn nguyên liệu năm 2024; xem chi tiết và giới hạn tại mục 3.1.7 tài liệu 03. ([Vĩnh Hoàn, 19/06/2024](https://www.vinhhoan.com/vinh-hoan-sustainable-practices/); truy cập 27/10/2026.)

**Đề xuất:** tạo kế hoạch nguồn theo ao và đợt nhận; nhà máy duyệt nguồn, hồ sơ nuôi, kết quả kiểm, cỡ/màu thịt theo phương pháp thống nhất và lịch thu. Đơn vị thu hoạch và ghe/xe chuyên dụng xác nhận thời gian, mật độ, điều kiện duy trì cá sống và cửa nhận nhà máy; chỉ tiêu vận chuyển phải được chuyên gia/đối tác chốt theo tuyến. Mỗi đợt đối chiếu lượng tại điểm đã ký, cá chết và nguyên nhân, bảng giá, khoản ứng/vật tư nếu có và khoản còn phải trả. Không gom cá từ nhiều ao rồi làm mất liên kết giữa kết quả kiểm và nguồn. Chỉ nhận lô nhỏ ngoài kế hoạch khi bộ phận nguyên liệu của nhà máy xác nhận; có nguồn cung địa phương lớn không đồng nghĩa có sẵn thị trường mua lẻ trên app.

### 2.6 Trái cây xuất khẩu: duyệt cả tuyến hồ sơ và năng lực đóng gói

**Đề xuất:** bên xuất khẩu xác nhận nước/thị trường đích, sản phẩm, dạng hàng và yêu cầu đang áp dụng; đơn vị đủ chuyên môn kiểm mã vùng/mã cơ sở đóng gói khi tuyến yêu cầu, hồ sơ canh tác, chỉ tiêu dư lượng/kiểm nghiệm, xử lý kiểm dịch và thời gian vận chuyển. Mọi yêu cầu phải có căn cứ và ngày kiểm, phân biệt nghĩa vụ pháp lý, điều kiện nước nhập và điều khoản riêng bên mua. Không dùng một bộ “giấy tờ xuất khẩu” giống nhau cho xoài, sầu riêng và thanh long hoặc cho mọi nước.

| Tình huống đề xuất | Cổng bổ sung trước khi chốt lịch cắt/đóng hàng |
|---|---|
| Xoài theo tuyến có yêu cầu xử lý kiểm dịch | Cơ sở xử lý được chấp nhận, lịch xử lý, yêu cầu độ già/quy cách và hồ sơ gắn lô |
| Sầu riêng | Người kiểm độ già, lấy mẫu theo quy trình phù hợp, chỉ tiêu và phòng thử được tuyến chấp nhận, lịch đóng gói; cadimi/vàng O phải xác nhận theo yêu cầu đang hiệu lực của thị trường đích |
| Thanh long | Quy cách cỡ/tai/vỏ theo người mua, kế hoạch xử lý khi tuyến yêu cầu, kho và nhiệt độ phù hợp giống/trạng thái; không mặc định quả dạt có nhà máy nhận |

**Ví dụ minh họa đề xuất:** lô sầu riêng đủ quy cách ngoại quan nhưng chưa có kết quả kiểm cần thiết được giữ ở trạng thái chưa đủ điều kiện chốt giao cho tuyến đó; không đổi sang nhãn “chế biến” để giải phóng hàng nghi không an toàn. Lô thanh long an toàn nhưng sai cỡ có thể đề nghị bên mua khác sau khi bên đó xác nhận quy cách, lượng và lịch nhận. Thời gian trả kết quả, năng lực phòng thử và thủ tục cụ thể hiện hành cho từng tuyến **chưa kiểm được đầy đủ**; chưa nên mở thương mại chỉ vì đã có tên một đối tác kiểm định.

### 2.7 Thủy sản sống và hải sản nhà hàng: quản lý theo loài và trạng thái

**Đề xuất:** tách cá nước ngọt sống, tôm sống, cua/ghẹ, nhuyễn thể hai mảnh vỏ và hải sản đã làm lạnh; không dùng chung một cấu hình “hải sản”. Đối tác phải chốt theo loài các điều kiện oxy, nước/độ mặn khi áp dụng, nhiệt độ, mật độ, thời gian vận chuyển và cách hồi sức/giữ tại bếp. Khách phải có người nhận và khả năng tiếp nhận tương ứng. Lô hàng cần nguồn khai thác/nuôi và hồ sơ liên quan theo loại, địa bàn, tuyến; không áp thủ tục kiểm dịch giống nhau cho mọi chuyến nội địa. Với loài có nguy cơ độc tố, histamine hoặc vùng thu hoạch bị hạn chế, kiểm cảm quan không thay thế kiểm soát nguy cơ chuyên biệt.

Đếm/cân phải quy định rõ sống/yếu/chết, bì/nước/dây buộc, cách chốt tại điểm giao và thời điểm chuyển rủi ro. Cơ chế đổi bù và xử lý con chết cần người trực có thẩm quyền. Không tự chuyển con chết sang bán ăn được; cần đánh giá an toàn và xử lý theo quy trình phù hợp. Các thông số vận chuyển theo loài và báo giá đối tác thử **chưa kiểm được**, vì vậy hoãn mở đại trà.

## 3. Dịch vụ và vai trò cần bổ sung nếu được phê duyệt

### 3.1 Ma trận trách nhiệm theo ngành

| Ngành/tuyến | Nhân viên AgiViet đề xuất làm | Người bán/HTX/đầu mối phải làm | Bên mua và đối tác chuyên môn phải làm |
|---|---|---|---|
| Xoài, chanh, bưởi nội địa | Xác minh người giao dịch; hỗ trợ quy cách, hẹn kiểm/cân; ghi chứng cứ và công nợ | Khai nguồn, chuẩn bị hàng, phân loại và bao bì; HTX giữ phân bổ từng hộ | Bên mua duyệt mẫu/loại; nhà xe nhận trách nhiệm chuyến; người nhận có quyền ký |
| Rau ăn lá/rau củ cho bếp | Theo dõi giờ chốt, ngoại lệ thiếu/trễ và đồng ý thay từng dòng; hỗ trợ đối soát | Đầu mối có ca sơ chế, nguồn thay, chia giỏ, ghi lô, đổi bù và người trực | Bếp chốt lượng/giờ nhận; kho/xe thực hiện điều kiện bảo quản đã ký |
| Lúa tươi | Khớp lịch gặt–xe–trạm sấy; theo dõi cửa nhận và thanh toán | Hộ/HTX khai ruộng/giống/sản lượng; đội gặt và bốc đúng lịch | Vựa/trạm sấy xác nhận công suất; hai bên đo/cân; bên mua bảo đảm nghĩa vụ tiền |
| Tôm | Kiểm trạng thái hồ sơ, lịch QA/thu/xe; chuyển ngoại lệ tới đúng người | Chủ ao cung cấp nhật ký; đội thu, đại lý và xe thực hiện quy trình | QA bên mua/phòng thử lấy mẫu và kết luận trong phạm vi; nhà máy chốt cửa nhận |
| Cá tra | Theo dõi nguồn đã được duyệt, các đợt vụ nuôi, công nợ và thay đổi lịch | Chủ ao/HTX giữ nguồn từng ao; đơn vị thu và ghe/xe thực hiện vận chuyển | Nhà máy duyệt nguồn/QA và kế hoạch nguyên liệu; xác nhận lượng nhận/giá |
| Trái cây xuất khẩu | Kiểm sự hiện diện/hiệu lực hồ sơ theo checklist của tuyến; nhắc hạn; không cấp chứng nhận | Nguồn trồng, điểm gom, cơ sở đóng gói giữ truy xuất và quy trình | Nhà xuất khẩu, phòng thử, đơn vị xử lý/kiểm dịch xác nhận yêu cầu và kết quả |
| Thủy sản sống/hải sản nhà hàng | Theo dõi lịch, người nhận, chứng cứ; điều phối ngoại lệ | Đầu mối chuyên loài có nguồn và thiết bị, phân cỡ, giữ sống, đổi bù | Đơn vị vận chuyển chịu điều kiện chuyên dụng; nhà hàng đủ khả năng tiếp nhận |

### 3.2 Các dịch vụ dùng chung phải có nội dung kiểm được

| Dịch vụ đề xuất | Nội dung tối thiểu cần chốt | Nguyên tắc trách nhiệm/chi phí |
|---|---|---|
| Khung giao qua nửa đêm | Ngày của từng chặng, giờ chốt đơn, ca thu/sơ chế/bốc/giao, người nhận, thời gian chờ và người trực dự phòng | Không chỉ ghi “giao đêm”; ai yêu cầu ca và ai trả phụ phí phải rõ |
| Kho/xe lạnh thuê ngoài | Tuyến, lượng nhận tối thiểu, nhiệt độ hàng và khí, thời gian kéo nhiệt, phương pháp ghi nhiệt, xử lý mất lạnh | Báo giá đối tác; nhiệt độ đặt máy không thay thế bằng chứng nhiệt độ hàng |
| Ghép chuyến | Tương thích nhiệt độ, mùi/ethylene, vệ sinh, rủi ro nhiễm chéo và thứ tự giao | Không ghép thủy sản sống/ướp đá với rau/trái cây chỉ vì cùng tuyến; đối tác xác nhận phương án tách phù hợp |
| Kiểm nghiệm và mẫu | Chỉ tiêu, phương pháp, người lấy mẫu, niêm phong, lưu mẫu, chuỗi bàn giao, thời gian kết quả, quy tắc khi không đạt | Phí và người chịu phí thỏa thuận; AgiViet không biến ảnh chụp kết quả thành chứng nhận chung |
| Sơ chế/phân loại | Mức sơ chế, hao hụt, khối lượng tính tiền, bao bì và vệ sinh | Báo riêng giá dịch vụ và vật tư; người thực hiện chịu quy trình đã cam kết |
| Cân/đo tại điểm giao | Dụng cụ, kiểm tra dụng cụ, lấy mẫu, trừ bì, độ ẩm/cỡ, người chứng kiến và cách đo lại | Bảng giá/phương pháp được đồng ý trước khi phát sinh kết quả |
| Công nợ và thanh toán | Đợt/kỳ, thời điểm đến hạn, số tiền thực trả, người nhận tiền và điều kiện dừng đợt mới | Phân biệt cọc, tiền hàng, phí dịch vụ; không coi im lặng là đã nhận tiền |
| Hàng bị từ chối | Lỗi quy cách hay nguy cơ an toàn; quyền quyết định, thời hạn và nơi xử lý | Hàng nghi không an toàn phải cách ly/xử lý phù hợp; không tự đưa sang bán gấp |

**Đề xuất lô gộp HTX:** liên kết hộ–vườn/ruộng/ao–ngày thu–kết quả kiểm–phần đóng góp–đợt giao phải còn truy ra được. Gom thương mại không đồng nghĩa trộn vật lý tùy ý; kết quả kiểm của một nguồn không được gán cho toàn bộ phần ghép mới. Cần cân đầu vào/đầu ra, phân loại, tổn thất, phân bổ tiền và quyền xác nhận phần của hộ. Theo đặc tả hiện tại, tổ hợp tác đang dùng đơn con từng hộ và không nhận tiền chung qua tổ trưởng; đề xuất này không thay quyết định đó.

**Đề xuất bao tiêu theo vụ:** thay một lời hứa “mua hết” bằng diện tích/ao/vùng đã duyệt, dải sản lượng, dự báo cập nhật, lịch gọi hàng từng đợt, tiêu chí chấp nhận và công thức giá hoặc giá được thống nhất, cam kết đầu tư/vật tư nếu có, điều khoản biến động sản lượng và vi phạm. Nhà máy cần xác nhận lượng tối thiểu mỗi đợt, tổng lượng theo kỳ và cửa nhận; các mức này là thỏa thuận riêng, không được suy từ quy mô nhà máy. Theo dõi ứng tiền và đối trừ tách khỏi giá hàng, không làm mất khả năng người bán hiểu số tiền còn được nhận. Rủi ro thanh khoản phải được xem xét cả khi doanh nghiệp đã có tên tuổi.

## 4. Chia ưu tiên trước cuộc thi và sau cuộc thi

### 4.1 Trước cuộc thi: chứng minh hiểu vận hành bằng tình huống có giới hạn

Đây là **đề xuất nội dung cần chuẩn bị**, không xác nhận đã sửa app hoặc đã chạy các tình huống. Cổng ngân hàng, xe, kho, kiểm nghiệm, dữ liệu khách và số tiền nếu dùng mô phỏng phải được ghi rõ. Một đối tác có tên trong ví dụ không phải đối tác đã ký hợp đồng.

| Ưu tiên đề xuất | Nội dung chuẩn bị trước cuộc thi | Kết quả có thể trình bày | Giới hạn phải nói rõ |
|---|---|---|---|
| P0 | Chốt ba cấu hình vận hành và ba mặt hàng nội địa; lúa là tuyến có điều kiện | Sơ đồ ai mua, ai gom, ai giao, ai kiểm và ai trả | Chưa đồng nghĩa đã có người mua lặp lại hoặc dịch vụ thật |
| P0 | Bốn minh họa trộn hàng: chanh định kỳ, bưởi kiểm mẫu, lúa đổi lịch sấy, tôm chờ QA | Cho thấy bảng cỡ/độ ẩm và lịch khác với phân loại trái cây | Thông số, giá và lượng giả định không được gọi là tiêu chuẩn thị trường |
| P0 | Một tình huống giỏ rau qua đầu mối: thiếu một dòng, đề nghị thay và giao phần còn lại | Giải thích cut-off, ca đêm, đồng ý từng dòng và vai đầu mối | Chưa hứa AgiViet tự sơ chế/giao rau đêm |
| P0 | Tình huống hàng không an toàn và hàng chỉ lỗi ngoại quan | Thể hiện khác nhau giữa cách ly và hạ cấp/bán cho mục đích phù hợp | Không trình diễn đổi kênh để hợp thức hóa lô không an toàn |
| P0 | Phiếu năng lực đối tác và bảng câu hỏi phỏng vấn | Có bằng chứng hoặc trạng thái “chưa kiểm được” cho kho/xe/QA/nhà máy | Không gắn nhãn “đã xác minh” chỉ từ thông tin trên website |
| P1 | Bảng chi phí mẫu và công nợ; gắn nguồn vào đề xuất ngành | Cho thấy vì sao cần gộp tuyến/khung và vì sao đơn lớn chưa chắc sinh lời | Không dùng tiền gọi vốn, doanh số hoặc GMV làm lợi nhuận |

Các minh họa nên lấy ví dụ đa dạng nhưng không biến mỗi ví dụ thành một ngành được mở thương mại. Sầu riêng có thể minh họa hồ sơ chưa đạt; cá tra minh họa kế hoạch ao theo nhà máy; rau thể hiện giới hạn ca đêm. Điều này giữ khả năng trình bày phạm vi dài hạn mà vẫn trung thực về năng lực khởi đầu.

### 4.2 Sau cuộc thi: mở từng tuyến khi có bằng chứng đối tác

| Ngành/tuyến | Điều kiện đề xuất trước đơn thật | Dịch vụ cần thử và đo | Quyết định mở rộng |
|---|---|---|---|
| Xoài, chanh, bưởi nội địa | Có bên mua chấp nhận quy cách và lịch, người bán/HTX, chuyến xe, điểm cân, giá dịch vụ và hạn trả | Số đợt mua lặp, tỷ lệ đạt/thiếu, chi phí xác minh/điều phối, trả tiền đúng hạn | Chỉ mở thêm nguồn/tuyến sau khi kết quả ổn định; chọn hai mặt hàng nếu chưa đủ năng lực cả ba |
| Lúa tươi | Bên mua có năng lực trả, trạm sấy đặt được cửa nhận, đội gặt/xe và phương pháp đo đã chốt | Thời gian chờ, đổi lịch do mưa, sai lệch cân/ẩm, chi phí và tiền đến hạn | Không mở vùng không có phương án sấy; không dùng kho thường làm phương án dự phòng |
| Rau giỏ cho bếp | Đầu mối đã có ca gom/sơ chế, nguồn thay, kho/xe và người trực; bếp xác nhận khung nhận | Đủ từng dòng, đúng giờ, hao hụt, lần đổi bù, chi phí mỗi giỏ/điểm giao, nợ theo kỳ | Mở sau khi đầu mối đáp ứng được tuyến cụ thể; rau củ và rau lá có thể có điều kiện riêng |
| Tôm | Nhà máy/đại lý chấp nhận ao, QA và kiểm nghiệm, đội thu/cấp lạnh, xe và cửa nhận | Từ thu tới cấp lạnh/nhà máy, lệch cỡ, lô chờ/rớt kiểm, chi phí mẫu và thời hạn trả | Mở theo cặp ao–bên mua/tuyến; không mở toàn vùng chỉ vì có phòng thử |
| Cá tra | Nhà máy chấp nhận nguồn ngoài, đợt nhận và phương tiện chuyên dụng | Tỷ lệ nguồn được duyệt, tuân thủ lịch, sống/chết, cân và công nợ | Mở theo hợp đồng vùng nguyên liệu; không lấy sản lượng toàn ngành làm dự báo cầu app |
| Xuất khẩu trái cây | Tuyến hồ sơ đang hiệu lực, cơ sở đóng gói/xử lý, kiểm nghiệm, vận tải và người mua đủ năng lực | Thời gian chờ kết quả, hồ sơ sai/hết hạn, loại bỏ, chậm chuyến và chi phí | Mở từng mặt hàng–thị trường–đối tác; chưa đủ thì giữ nội địa hoặc hoãn |
| Thủy sản sống/hải sản nhà hàng | Đầu mối chuyên loài, phương tiện và điểm tiếp nhận đủ điều kiện | Sống/yếu/chết, điều kiện vận chuyển, đổi bù và phần đóng góp sau chi phí | Chỉ mở các loài/tuyến đã thử; không mở một danh mục chung “hải sản sống” |

**Ngưỡng quyết định đề xuất để khảo sát, không phải kết quả đã đạt:** mỗi tuyến đầu tiên có ít nhất hai bên mua độc lập đồng ý thử, một đơn vị chịu trách nhiệm gom/giao chính và một phương án thay thế khả dụng. Ghi trọn chi phí và kết quả của 5–10 đợt đầu trước khi kết luận. Đối với lúa/cá tra có tính vụ, đo các đợt trong kế hoạch và khả năng quay lại vụ sau; không dùng tiêu chí “mua hằng tuần” để loại sai một ngành theo mùa. Một khách đủ mạnh có thể chạy thử nhỏ, nhưng phải ghi rủi ro phụ thuộc khách đó.

### 4.3 Chỉ tiêu đánh giá cần phản ánh công việc thật

| Chỉ tiêu đề xuất | Cách ghi/đọc kết quả |
|---|---|
| Mua lặp | Bên mua quay lại và có đợt giao nghiệm thu/thanh toán; phân biệt cam kết thử với đơn hoàn tất |
| Đúng và đủ | Theo dòng hàng, lượng và cửa thời gian đã xác nhận; với giỏ cần đo tỷ lệ giỏ đủ toàn bộ dòng |
| Thời gian tồn/chờ | Từ thu, nhập gom, sơ chế, bốc, đến nhận; lúa thêm giờ nhận sấy, tôm thêm giờ cấp lạnh |
| Chất lượng/an toàn | Tách lỗi ngoại quan/quy cách, hư do vận chuyển và lô bị cách ly; không cộng chung để che rủi ro |
| Chi phí | Người-phút điều phối, đi hiện trường, lấy mẫu, kiểm, sơ chế, bì/sọt, kho, xe, đêm/chờ, đổi bù và tổn thất |
| Tiền và công nợ | Hạn trả so với ngày thực nhận, dư nợ, cọc, chi phí đối soát và nghĩa vụ còn mở |
| Phần đóng góp | Doanh thu AgiViet thực ghi nhận trừ chi phí AgiViet thực chịu; theo dõi riêng hiệu quả của đầu mối/nhà xe |

## 5. Tính phần đóng góp trước khi hứa dịch vụ

**Dữ kiện nội bộ, không phải giá đã được thị trường chấp nhận:** tài liệu `02-phan-khuc-ben-mua.md` đang ghi gói Thu mua 1,5 triệu đồng/tháng, 0,3% đơn đầu với người bán đó và 0% từ đơn thứ hai; gói Bếp 490.000 đồng/tháng, không có phí giao dịch qua đầu mối. Vì vậy giá trị đơn lớn và mua lặp chỉ tạo cơ hội hiệu quả, không tự tạo doanh thu theo đơn. Phí thuê xe, kho, kiểm và sơ chế do bên chọn dùng trả theo định vị hiện tại, nhưng vẫn cần kiểm tổng chi phí để biết khách có muốn dùng.

**Công thức đề xuất:** phần đóng góp trực tiếp của AgiViet = phí giao dịch thực thu + phần thuê bao phân bổ cho hoạt động phục vụ − chi phí nhân sự/đi hiện trường/đối soát và trợ giá mà AgiViet thực chịu. Tiền hàng chuyển cho người bán, tiền cọc giữ qua ngân hàng và cước chuyển trả nguyên cho nhà xe không được coi là doanh thu dịch vụ của AgiViet. Phần thuê bao phân bổ là cách tính quản trị, không phải doanh thu mới được tạo thêm mỗi đơn.

| Minh họa hoàn toàn giả định | Tính toán | Cách diễn giải |
|---|---|---|
| Đơn chanh 300 kg × 15.000 đồng = 4,5 triệu đồng, gói Thu mua, đơn đầu | 0,3% = 13.500 đồng; theo sàn phí 20.000 đồng trong tài liệu nội bộ thì thu 20.000 đồng. Nếu điều phối trực tiếp tốn 60.000 đồng thì phần trực tiếp trước phân bổ thuê bao là −40.000 đồng | Đơn nhỏ có thể cần khung/gộp tuyến và phục vụ ít công; giá 15.000 và chi phí 60.000 là giả định, không phải khảo sát thị trường |
| Đơn bưởi 500 kg × 30.000 đồng = 15 triệu đồng, gói Thu mua, đơn đầu | Phí 45.000 đồng. Nếu AgiViet tự đi kiểm tốn 150.000 đồng thì phần trực tiếp là −105.000 đồng trước thuê bao | Cần xác định bên nào mua dịch vụ kiểm; không tự gánh kiểm tại chỗ vì nghĩ đơn trái cây có giá trị cao |
| Đơn lúa 20 tấn × 6.000 đồng = 120 triệu đồng, gói Thu mua, đơn đầu | Phí 360.000 đồng; nếu điều phối tốn 200.000 đồng thì còn 160.000 đồng trước chi phí chung. Đơn lặp cùng người bán có phí giao dịch bằng 0 theo giả định gói hiện tại | Không dự báo lợi nhuận lúa bằng cách nhân 0,3% với mọi đợt; điều kiện sấy và thanh khoản vẫn là cổng độc lập |
| Một khách gói Bếp giao 20 giỏ/tháng | Phân bổ 490.000/20 = 24.500 đồng/giỏ; nếu AgiViet tốn 30.000 đồng hỗ trợ mỗi giỏ thì thiếu 5.500 đồng/giỏ trước chi phí chung | Đây không phải tiền trả cho đầu mối để mua, sơ chế và giao; hiệu quả của đầu mối phải tính riêng từ giá bán và chi phí của họ |

Không có nguồn đủ chắc cho biên lợi nhuận từng tuyến của đối tác Việt Nam hoặc chi phí thật của AgiViet: **chưa kiểm được**. Cần xin báo giá và ghi nhận thời gian làm thật, kể cả công người sáng lập. Nếu thử nghiệm có hỗ trợ miễn phí hoặc trợ giá, phải tách ra để không nhầm dịch vụ được tài trợ với mô hình tự cân đối.

**Căn cứ có nguồn về giới hạn tăng trưởng:** Frubana ngừng thị trường cuối tại Brazil, chuyến giao cuối 30/07/2025 theo Forbes; Sayurbox gộp kho B2C và thay dịch vụ tức thời bằng same-day năm 2023. **Suy luận:** không nên dùng số khách, tốc độ giao hoặc số vốn huy động làm bằng chứng đủ cho hiệu quả kinh tế; phải kiểm mật độ tuyến, tồn hàng và chu kỳ tiền. Không suy từ hai trường hợp này rằng mọi nền tảng đều thất bại. ([Forbes Colombia, 14/08/2025](https://forbes.co/negocios/frubana-pone-fin-a-sus-operaciones); [Bisnis, 18/04/2023](https://teknologi.bisnis.com/read/20230418/266/1647838/sayurbox-pastikan-pengiriman-lancar-meski-ada-phk-dan-penutupan-gudang); truy cập 27/10/2026.)

## 6. Những thông tin cần xác minh khi chuyển sang giao dịch thật

Đây là khoảng trống của nghiên cứu, không phải yêu cầu chờ người sáng lập trả lời trước khi hoàn thành hai báo cáo. Cần hỏi từng bên mua lượng nhỏ nhất có thể nhận mỗi đợt, tổng lượng theo kỳ, cách phân loại, khung giờ và người có quyền nghiệm thu; hỏi HTX/đầu mối nguồn thực có thể cam kết, ca làm, mức sơ chế và chi phí; hỏi nhà xe/kho MOQ, tuyến, nhiệt độ, phụ phí và xử lý chờ; hỏi phòng thử chỉ tiêu/phương pháp, lượng mẫu, lịch kết quả và phạm vi được tuyến chấp nhận. Với nhà máy, hỏi riêng nguồn mới có được duyệt không, kế hoạch vùng nguyên liệu và năng lực thanh toán.

Danh mục giấy tờ cần rà soát theo cơ sở, mặt hàng, dạng hàng, tuyến và thời điểm. Chứng nhận VietGAP/GlobalGAP/ASC/BAP có thể là yêu cầu hợp đồng; không được mô tả chung là bắt buộc cho mọi giao dịch. Miễn một loại giấy chứng nhận cơ sở không đồng nghĩa miễn điều kiện an toàn hoặc trách nhiệm truy xuất. Bộ hồ sơ pháp lý hiện hành đầy đủ tại ngày khởi chạy từng tuyến **chưa kiểm được** trong nghiên cứu này; phải được người có chuyên môn xác nhận trước vận hành thật. Đề xuất rà soát không sửa các bộ lọc hoặc thông số đang có trong đặc tả.

Kết quả cần đưa về quyết định mở **tuyến giao dịch có người chịu trách nhiệm và đủ dịch vụ**, thay vì chỉ bật một mặt hàng trong danh mục. Trước cuộc thi, điều cần chứng minh là hiểu sự khác nhau đó bằng các tình huống đa ngành có giới hạn rõ; sau cuộc thi, điều kiện mở là đơn mua và năng lực đối tác được kiểm trên thực tế.
