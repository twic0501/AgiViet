# 06 · Mở danh mục theo năng lực phục vụ

Ngày nghiên cứu và kiểm tra nối tiếp: **27/10/2026**. Nguồn kế thừa giữ ngày truy cập ghi nhận trong bản trước là 27/10/2026; không phải mọi nguồn đều được mở lại ở lượt nối tiếp. Phạm vi mở lại và giới hạn được ghi tại mục 6. Trạng thái: mô hình khái niệm và đề xuất nghiệp vụ; chưa sửa lược đồ, API, phạm vi giao dịch hoặc đặc tả. Phần pháp lý phục vụ thiết kế, cần luật sư kiểm lại trước giao dịch thật.

**Đề xuất:** giữ ba lớp mặt hàng × dạng hàng × quy cách, nhưng tách thêm công đoạn xử lý, trạng thái bảo quản, bao gói và yêu cầu thị trường. “Xuất khẩu” là lớp yêu cầu theo nước đến chồng lên hàng tươi/khô/chế biến; “đóng hộp” có thể chỉ là bao bì. Danh mục được mở để nhận thông tin, còn quyền giao dịch phải theo năng lực đã duyệt cho đúng hàng, dạng, vùng và kênh. Một hộ có thể có nhiều sản phẩm, cơ sở và vai trò; hồ sơ duyệt hàng thô không tự bao phủ điều rang muối hoặc cá khô ăn ngay. Giai đoạn đầu giữ hàng thô và công đoạn sơ chế đơn giản đã được duyệt, ghi nhận nhu cầu ngoài phạm vi để quyết định mở tiếp.

## 1. Sàn và chuẩn công khai phân loại, thuộc tính và cách thay đổi đến đâu?

### 1.1. Bằng chứng thực tế hỗ trợ mô hình nhiều lớp

**Sự thật có nguồn:**

| Sàn/chuẩn | Cấu trúc hoặc cách làm đã kiểm được | Giới hạn bằng chứng |
|---|---|---|
| Tridge | Trang điều có cây Agriculture & Food → Nuts & Seeds → Nuts → Cashew Nut Kernel; các trường Processed Style, Form & Cut, Shell, Grade, Packaging Type. | Dữ liệu người bán hiển thị không phải kết quả kiểm lô; có grade là từ quảng cáo. Chưa kiểm schema nội bộ. [Tridge · Cashew Nut Kernel Nigeria, không ghi ngày](https://dir.tridge.com/products/product-country/cashew-nut-nigeria). |
| Tridge | Hướng dẫn yêu cầu xác minh rồi thêm sản phẩm; báo giá tách specifications, packaging, logistics và payment terms. | Không chứng minh mọi sản phẩm mới được duyệt thủ công, hoặc có từ điển tên địa phương đầy đủ. [Tutorial for Product Sales, không ghi ngày](https://www.tridge.com/ko/help-center-user-guides/HEE-e6f7f456). |
| Alibaba.com | Hướng dẫn có thuộc tính hệ thống, thuộc tính người bán tự định nghĩa và dùng thuộc tính để lọc tìm kiếm. | Trang cũ, footer 1999–2016; giới hạn “10 cột” chưa kiểm hiện hành nên không lấy làm yêu cầu sản phẩm. Không đồng nhất Alibaba.com với 1688. [Alibaba · Product Attributes](https://activity.alibaba.com/ggs/product_attributes.html). |
| IndiaMART | Tài liệu công ty nộp NSE mô tả product specifications, tìm kiếm đa ngôn ngữ, RFQ theo ngành, ghép theo sản phẩm/địa điểm/giá/lượng. | Báo cáo FY2025 là bằng chứng chức năng công bố, không cho biết schema, alias hoặc quy trình duyệt category mới. [IndiaMART · Investor presentation Q4/FY2025, trang 15–16, 21–23](https://nsearchives.nseindia.com/corporate/INDIAMART_29042025161920_Investor_PresentationQ4FY25Signed.pdf). |
| Ninjacart | Ninja Mandi giới thiệu mạng thương nhân và các nhóm trái cây, rau, staples cùng dịch vụ thương mại. | Chưa kiểm thuộc tính chi tiết, quy tắc thêm hàng, tên đồng nghĩa hoặc thời gian duyệt. [Ninja Mandi, không ghi ngày](https://ninjacart.com/ninja-mandi/). |
| GS1 GPC | Phân loại dựa vào bản chất sản phẩm, tránh dựa vào kênh bán/mục đích dùng; tên/định nghĩa rõ, một Brick gom hàng có bộ loại thuộc tính phù hợp. | Không phải mẫu thu mua hay chứng nhận an toàn. [Hierarchy Principles](https://support.gs1.org/support/solutions/articles/43000733391-what-are-the-gpc-hierarchy-principles-), [Generic Business Rules](https://support.gs1.org/support/solutions/articles/43000734310-what-are-the-gpc-generic-business-rules-), cập nhật 30/08/2024. |
| GS1 GPC và dữ liệu mặt hàng | Brick Attributes là câu hỏi/danh sách giá trị cho nhóm phân loại; Trade Item Attributes mô tả mặt hàng thương mại cụ thể. | Mã GPC không thay quy cách hợp đồng, thông tin cơ sở hoặc phép đo lô. [GS1 · Phân biệt hai loại thuộc tính, cập nhật 30/08/2024](https://support.gs1.org/support/solutions/articles/43000734162-what-is-the-difference-between-gpc-brick-attributes-and-gds-trade-item-attributes-). |
| GS1 quản lý thay đổi | Cộng đồng gửi Work Request; quy trình SMG/GSMP phân định yêu cầu thuộc dữ liệu Trade Item hay GPC. | Học cách tiếp nhận–phân loại–duyệt thay đổi không đồng nghĩa AgiViet được chứng nhận GS1. [GPC developed and maintained, cập nhật 30/08/2024](https://support.gs1.org/support/solutions/articles/43000734258-how-is-gpc-developed-and-maintained-). |
| HS | WCO mô tả danh pháp quốc tế với mã sáu chữ số, dùng cho biểu thuế/thống kê thương mại. | Không là SKU, tiêu chuẩn chất lượng hay giấy đủ điều kiện xuất khẩu. Không tự gán mã cụ thể khi thiếu thành phần/công đoạn. [WCO · What is HS?, không ghi ngày](https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx). |
| UNSPSC | Tài liệu cơ quan mua sắm mô tả bốn cấp lõi Segment–Family–Class–Commodity, mã tám chữ số; mức chi tiết triển khai có thể khác theo mục đích. | Chưa kiểm codeset/licensing mới nhất. Nguồn Commerce đọc qua chỉ mục do mở trực tiếp 403; tài liệu NC đọc đầy đủ. [US Commerce, cập nhật 12/06/2024](https://www.commerce.gov/oam/resources/united-nations-standard-products-and-services-codes-unspsc), [NC eProcurement, 04/2020](https://eprocurement.nc.gov/epro-newsletter/ncep-april-2020-newsletter-state-agencies/open). |

**Sự thật có nguồn, bổ sung 27/10/2026:** kho phiên bản GS1 đang công bố GPC **2026-05** và xác định bản chuẩn bằng Oxford English. Đã kiểm trang lưu trữ và gói tải, chưa rà mã từng sản phẩm. ([GS1 · Archive](https://ref.gs1.org/standards/gpc/archive), [gói GPC 2026-05](https://ref.gs1.org/standards/gpc/2026-05/), truy cập 27/10/2026.) **Đề xuất:** mỗi ánh xạ giữ hệ mã, phiên bản, mã, quan hệ tương ứng và ngày/người duyệt; giữ tên chuẩn nguồn bên cạnh tên tiếng Việt/alias. Khi đổi phiên bản, duyệt lại ánh xạ bị tác động trước giao dịch mới; không sửa ảnh chụp đơn cũ.

**Việt Nam có thay đổi năm 2026:** QĐ 32/2026/QĐ-TTg ngày 29/06/2026 ban hành Hệ thống ngành sản phẩm Việt Nam; Điều 3 quy định bảy cấp, Điều 4 quy định hiệu lực 14/08/2026 và QĐ 43/2018/QĐ-TTg hết hiệu lực cùng ngày. Đã đọc phần quyết định trong bản ký Công báo; chưa rà toàn bộ phụ lục để xác nhận mã từng loại điều/cá khô. Đây là danh mục ngành **sản phẩm**, không phải mã ngành kinh doanh và không phải một danh mục thương mại riêng do Bộ Nông nghiệp ban hành. ([QĐ 32 · Hồ sơ Công báo](https://congbao.chinhphu.vn/van-ban/quyet-dinh-so-32-2026-qd-ttg-469912.htm), [bản ký, phần Điều 3–4](https://congbaocdn.chinhphu.vn/180507251028987904/2026/7/14/469912-1783932281_v1_1784023174_signed.pdf).)

**Chưa kiểm được:** tài liệu sơ cấp đủ để xác nhận quy trình thêm thuộc tính/category, kiểm duyệt thực phẩm và SLA hiện hành của 1688. Không dùng bài ERP, scraper hoặc tư vấn để điền khoảng trống này. Cũng chưa kiểm được thuật toán đồng nghĩa địa phương, gộp category và duyệt mặt hàng mới nội bộ của Tridge/Alibaba/IndiaMART/Ninjacart. Chưa xác minh một danh mục Bộ NN&MT duy nhất thay được toàn bộ mẫu thương mại đa ngành; danh mục quản lý chuyên ngành cần ánh xạ theo đúng mục đích.

### 1.2. Kết luận thiết kế rút ra từ bằng chứng

**Suy luận/đề xuất:** cây danh mục giúp tìm và thống kê; mẫu thuộc tính giúp mô tả hàng; quy cách giao dịch quyết định đo/nhận gì; quy trình quyết định làm gì khi đạt, thiếu hoặc không đạt. Bốn việc có liên hệ nhưng không nên nhét vào một tên hàng. Mã ngoài chỉ hỗ trợ trao đổi, hải quan/mua sắm hoặc báo cáo; AgiViet vẫn cần mã nội bộ ổn định và dữ liệu có phiên bản.

Không tạo hai mặt hàng chỉ vì “cho quán nhậu” và “xuất khẩu”. Cũng không gộp mọi dạng vào một mã quy cách: cùng một nguyên liệu có thể thành hàng khác đáng kể sau rang, tẩm, phối trộn hoặc xử lý nhiệt. Quyết định tách phải dựa trên bản chất, thành phần, công đoạn và khả năng dùng chung mẫu, không dựa riêng vào người mua.

## 2. Mô hình dữ liệu phải tách hàng, quy cách, cơ sở và bằng chứng

### 2.1. Kế thừa hồ sơ hiện tại, không tự mở mọi ngành hàng

**Sự thật từ tài liệu nội bộ:** [01 · Mặt hàng](../nghiep-vu/01-mat-hang.md), mục 1 và 3, đã có hồ sơ ngành hàng theo phiên bản, tên địa phương, giống/dạng, loại/cỡ/độ ẩm, bảo quản và giấy tờ theo kênh. Ngoài tám mặt hàng chỉ ghi sổ, không ghép/cọc. Ba cấp mở hiện tại là: mở ngay; mở có kiểm định; mở nhánh hàng kém loại/nguyên liệu cho chế biến. Cấp 3 không có nghĩa mọi hàng chế biến được bán.

[00 · Tổng quan](../nghiep-vu/00-tong-quan.md), [11 · Mô hình kinh doanh](../nghiep-vu/11-mo-hinh-kinh-doanh.md) và [mục 8 Quy trình](../quy-trinh/index.html#sau) giữ vai trò trung gian và nhiều dịch vụ đang đề xuất. Nghiên cứu này không chứng minh những thực thể dưới đây đã có trong cơ sở dữ liệu. Các ngưỡng nhiệt độ/độ ẩm/hạn giờ trong hồ sơ hiện tại là tham số thử, không được nâng thành chuẩn pháp lý hoặc kỹ thuật đã kiểm chứng.

### 2.2. Các thực thể đề xuất

Toàn bộ bảng này là **đề xuất mô hình khái niệm**; tên bảng minh họa, chưa phải migration.

| Thực thể | Dữ liệu tối thiểu | Bất biến cần giữ |
|---|---|---|
| catalog_categories | Mã, cha, tên chuẩn, định nghĩa bao gồm/loại trừ, trạng thái | Cây cho tìm kiếm; không trộn loài, bao gói và thị trường vào mọi cấp. |
| products | Mã ổn định, loại/loài, giống liên quan, nhóm, phần nguyên liệu khi cần | Không tạo sản phẩm mới chỉ vì đổi bên mua hoặc kích thước hộp; không gộp quả điều với hạt điều. |
| product_forms và product_form_rules | Phần hàng: nguyên vỏ/nhân, nguyên con/phi lê; thao tác rửa/cắt/sấy/rang/tẩm; tổ hợp được phép | Dạng, công đoạn, sống/chín, ăn ngay/cần nấu, trạng thái nhiệt là các trường rõ; “sơ chế” một mình chưa đủ. |
| handling_families | Điều kiện áp dụng; đặc tính dễ hư, lạnh/khô, phép đo chính, nguy cơ và mức xử lý | Là các luật có thể kết hợp, khác cây phân loại GPC; xung đột chưa giải quyết thì chuyển duyệt. |
| attribute_definitions | Mã, tên/đơn vị, kiểu dữ liệu, chiều đo, enum, min/max và cách so sánh, có cho unknown không | Giá trị số có đơn vị; phân biệt con/kg, g/con và khối lượng tịnh; không so mọi trường như chuỗi. |
| attribute_template_versions | Phạm vi hàng/dạng/họ, trường và điều kiện bắt buộc, nguồn ngưỡng, cách xác thực, phiên bản/người duyệt/ngày kiểm lại | Mẫu chung có phần bổ sung ngành; không tự đặt ngưỡng an toàn hoặc hạn dùng. |
| specification_versions | Bộ giá trị cần mua/chào bán, dung sai, phương pháp lấy mẫu/đo, điểm nghiệm thu, bảng giá theo cỡ/ẩm nếu có | “Loại 1”, W320 hoặc “hàng xuất” chỉ ghép được khi đã rõ định nghĩa phù hợp. |
| packaging_specs và seller_skus | Vật liệu, tịnh/bì/cả bì, lượng mỗi gói, gói/thùng, cách hàn kín, nhãn/brand, mã người bán/GTIN nếu có | Đóng hộp không tự nghĩa tiệt trùng; SKU người bán không phải mã lô. |
| sites và seller_offerings | Người bán, cơ sở làm/thuê làm, vai sản xuất/thương mại/gia công, hàng/dạng/spec, khả năng cung ứng | Một tài khoản có nhiều hàng/cơ sở/vai; năng lực không suy từ nhãn ngành nghề chung. |
| lots và lot_measurements | Lô nguồn, ngày thu/sản xuất/đóng gói, hạn dùng nếu áp dụng, số lượng, điều kiện kho; phép đo/mẫu/thời gian/người đo | Tách khai báo với lượng khả dụng và phép đo thực; chia lô không mất nguồn. |
| compliance_evidence và evidence_scopes | Chủ thể/cơ sở/sản phẩm/lô/thị trường, bên cấp, tài liệu, hiệu lực/thu hồi, nguồn và người kiểm | Giấy cơ sở không thay hồ sơ sản phẩm; kết quả một mẫu không chứng minh mọi lô sau. |
| market_requirement_versions | Nước đến, sản phẩm/dạng/mục đích, hồ sơ/phép thử/nhãn, nguồn và thời hiệu | “Xuất khẩu” không là một cờ đủ điều kiện toàn cầu. |
| workflow_template_versions | Điều kiện chọn, lấy mẫu, nghiệm thu/chuyển rủi ro, xử lý thiếu/không đạt/an toàn, đối tác bắt buộc | Chọn từ toàn bộ đặc tính và kênh; không sao quy trình hàng khô sang cá sống. |
| product_aliases | Tên gốc, tên chuẩn hóa, vùng/ngôn ngữ, loại alias, đối tượng đích/candidate, nguồn/người duyệt | Giữ chữ có dấu; không dấu chỉ là chỉ mục, alias mơ hồ không ép về một hàng. |
| external_classification_links | GPC/HS/UNSPSC/VN, phiên bản, mã, thị trường, quan hệ ánh xạ, nguồn/độ chắc/người duyệt | Có thể nhiều–nhiều; không ép HS tương ứng duy nhất với một tên bán hàng. |
| catalog_change_requests và unmet_demand_items | Loại thay đổi, tên/ảnh gốc, nhu cầu dòng, người yêu cầu, lượng/đơn vị/lịch/vùng, lý do, kết quả duyệt | Thiếu hàng, thiếu xe và thiếu danh mục là ba bài toán khác nhau. |
| support_capabilities | Hàng × dạng × vùng × kênh, mức hỗ trợ, template/workflow/evidence/partner, hiệu lực/người duyệt | Duyệt tên trong danh mục không tự mở ghép/cọc. |

**Nguồn của mỗi giá trị:** lưu provenance gồm người bán tự khai, yêu cầu bên mua, AgiViet quan sát, lab đo hoặc bên thứ ba chứng nhận; kèm tài liệu, người xác nhận, phương pháp, thời điểm, lô/cơ sở và hiệu lực. Tách required_value, declared_value và measured_value. Yêu cầu “độ ẩm tối đa X” không là kết quả đo “lô có độ ẩm X”; lời khai hữu cơ không là chứng nhận. Thiếu thuộc tính bắt buộc là chưa đủ bằng chứng, không tự điền “đạt”.

**Phiên bản và truy xuất:** khi ký giữ ảnh chụp product/spec/template/workflow/market-requirement/policy. Đổi tên hoặc alias không sửa loài/quy cách đã cam kết. Gộp mã giữ redirect và nhật ký; thay luật mới tạo cảnh báo/việc kiểm lại cho đơn mở, không xóa lịch sử. Về sau nếu quản lý rang, sấy, bóc vỏ hoặc phối trộn, cần lot_transformations nối nhiều lô đầu vào–đầu ra với cơ sở, công đoạn, lượng và hao hụt; không dùng nguyên mã lô hạt còn vỏ cho hộp điều rang. Chưa có module này thì chỉ nhận hồ sơ lô đầu ra và chứng từ nguồn, không hứa truy xuất chế biến toàn chuỗi.

### 2.3. Họ đặc tính → mẫu thuộc tính → quy trình mặc định

Toàn bộ bảng là **đề xuất**, chưa ấn định nhiệt độ, hoạt độ nước, chỉ tiêu kiểm nghiệm hay hạn giờ chung. Giá trị cụ thể cần nguồn kỹ thuật, chuyên gia và đối tác phù hợp.

| Họ hoặc lớp bổ sung | Mẫu thuộc tính trọng tâm | Quy trình mặc định đề xuất |
|---|---|---|
| Tươi rất dễ hư | Giờ thu/đánh bắt, loài/giống/cỡ, điều kiện bảo quản, khung nhận, lỗi hư, hạn chất lượng theo profile | Xác nhận xe/điểm nhận trước thu; chứng cứ thời gian/nhiệt; xử lý ngoại lệ nhanh, không mặc định chờ lab 48 giờ. |
| Trái tươi có profile riêng | Giống, độ già/cỡ, Brix nếu phù hợp, khuyết tật, bao gói, thuốc/cách ly khi áp dụng | Mẫu và phân loại theo hợp đồng; điểm nghiệm thu rõ; kho/xe theo trái và độ già, không áp chung nhiệt độ. |
| Lúa/hạt đo độ ẩm | Dạng tươi/khô, giống, độ ẩm/phương pháp đo, tạp, cân bì, công thức quy đổi | Mẫu đại diện/đối chứng, cân–đo, lịch sấy khi cần; không áp công thức lúa cho mọi hạt. |
| Thủy sản sống/tươi/ướp đá | Loài, trạng thái, cỡ, nguồn nuôi/khai thác, thời điểm thu, phương tiện/nhiệt và phép thử theo mục đích | Duyệt nguồn và lịch thu; bố trí phương tiện đúng trạng thái; không trộn lô làm mất liên hệ kết quả mẫu. |
| Hàng khô, gồm thủy sản khô | Loài, phương pháp phơi/sấy, độ ẩm/hoạt độ nước khi cần, muối/phụ gia, ăn ngay/cần nấu, bảo quản/hạn | Kiểm nguồn và quy trình; lấy mẫu theo nguy cơ; “khô” không tự nghĩa ổn định ở nhiệt thường. |
| Rang/tẩm/nấu/chế biến bao gói | Thành phần/dị ứng, công đoạn, cơ sở, bao bì, lô/NSX/HSD, nhãn, hồ sơ áp dụng | Duyệt cơ sở/sản phẩm/nhãn trước giao dịch; truy lô và thu hồi; không chỉ kiểm danh tính người bán. |
| Lớp thị trường xuất khẩu | Nước đến, nhà xuất/nhập, quy cách khách, mã cơ sở/vùng khi yêu cầu, lab/chứng thư/nhãn và hiệu lực | Cổng hồ sơ theo sản phẩm–thị trường trước cam kết; đầu mối xuất khẩu nhận trách nhiệm rõ. |

Một mặt hàng có thể đồng thời thuộc họ khô, chế biến và lớp xuất khẩu. Luật an toàn bắt buộc không bị bỏ qua để tăng tỷ lệ ghép; ràng buộc vận hành xung đột phải được giải quyết theo profile thực tế hoặc chuyển người, không tự chọn một luật thuận tiện.

### 2.4. Tên đồng nghĩa và mẫu quy cách phải tránh ghép nhầm

**Đề xuất:** giữ chuỗi gốc có dấu, chỉ mục không dấu/lỗi gõ và phạm vi vùng. “Thơm/dứa/khóm” là ứng viên từ điển để chuyên gia xác nhận; không suy giống từ alias. “Điều tươi” cần hỏi quả hay hạt, còn vỏ hay nhân; “khô cá” cần hỏi loài. Tên không đủ rõ trả vài candidate và câu hỏi, không tự hợp nhất.

Người bán được thêm thuộc tính tự do trong bản nháp, nhưng trường đó chưa thành bộ lọc cứng. Nhân viên phân loại thành alias, giá trị enum, thuộc tính có kiểu, dạng mới hoặc sản phẩm mới; lưu nguồn và reviewer. “Loại 1”, “hàng xuất”, “khô một nắng” phải có mô tả đo/nhận và bảo quản; không dùng danh xưng làm bằng chứng an toàn.

| Mẫu minh họa, không phải tiêu chuẩn đã phê duyệt | Các trường cần chốt trước giao dịch |
|---|---|
| Hạt điều nguyên liệu | Hạt còn vỏ hay nhân, vụ/nguồn, công đoạn đã làm, độ ẩm và phương pháp, cỡ/nguyên-vỡ khi phù hợp, tạp/mốc, tịnh/bì, bảo quản. |
| Nhân điều rang muối đóng gói | Thành phần, công đoạn, muối/phụ gia, nguyên-vỡ/cỡ, bao gói/khối lượng, cơ sở thực hiện, lô/NSX/HSD, hồ sơ sản phẩm và nhãn. |
| Cá khô cho bếp | Loài, nguyên con/phi lê, phơi/sấy/một nắng, muối/tẩm, sống/chín, ăn ngay/cần nấu, bảo quản, quy cách cân, lô và hạn có căn cứ. |
| Các hàng trên xuất khẩu | Giữ mẫu hàng tương ứng, thêm nước đến, importer, yêu cầu hồ sơ/phép thử/nhãn và điều kiện logistics theo tuyến. |

Một hộ có thể có cả các offering trên bằng cùng tài khoản; mỗi offering trỏ tới cơ sở, dạng và bộ hồ sơ riêng. Hộp xuất khẩu có thể chỉ là quy cách bao gói mới, nhưng rang/tẩm tạo yêu cầu công đoạn và thành phần khác. Với khô cá cho quán và xuất khẩu, cùng hàng/dạng có thể có hai spec; không cần tạo hai loài sản phẩm theo tên khách mua.

## 3. Mở danh mục phải bắt đầu từ nhu cầu chưa đáp ứng

### 3.1. Hai mức hỗ trợ không thay ba cấp mở hiện hành

**Đề xuất tương lai:** “hỗ trợ đầy đủ” nghĩa là có mẫu/quy trình/hồ sơ/đối tác đã kiểm theo vùng/kênh. “Mở có nhân viên duyệt” trước hết là tiếp nhận và đánh giá thủ công; không có nghĩa duyệt tên xong được thu cọc mọi hàng. Mức hỗ trợ là trục khác với cap_mo 1/2/3 hiện tại.

**Ranh giới hiện hành vẫn giữ:** ngoài tám hàng chỉ ghi sổ, không ghép/cọc. Muốn thí điểm giao dịch mặt hàng mới phải có quyết định phạm vi, điều kiện, người chịu trách nhiệm và quy trình đủ cổng; tài liệu nghiên cứu không tự tạo ngoại lệ. Người duyệt danh mục không thay luật sư, lab, người mua chấp nhận nguồn hoặc ngân hàng.

### 3.2. Quy trình mở rộng đề xuất

| Bước | Công việc và dữ liệu giữ lại | Điều kiện chuyển bước |
|---|---|---|
| Nhận thông tin | Tên gốc/ảnh, dạng/công đoạn, nguồn, ăn ngay/cần nấu, bảo quản, lượng/đơn vị, lịch/vùng/mục đích; cho chọn chưa rõ | Chưa báo đã nhận đơn; người dùng không cần biết HS/GPC. |
| Làm rõ/ánh xạ | Tìm candidate bằng alias; người dùng xác nhận; phân biệt alias mới, giá trị mới, dạng mới và sản phẩm mới | Mơ hồ loài/phần hàng/công đoạn thì hỏi tiếp, không ghép bằng tên gần giống. |
| Ghi nhu cầu chưa đáp ứng | Theo từng dòng, người mua xác nhận, tần suất, mức cần và lý do | Tách tìm kiếm tò mò khỏi RFQ thực; chống đếm lặp cùng bên. |
| Xếp ưu tiên | Số bên mua độc lập, lặp lại, nguồn đủ điều kiện, vùng tập trung, mẫu dùng lại được, công/chi phí đối tác và rủi ro | Không chọn chỉ theo lượt tìm kiếm hoặc GMV tự khai; ngưỡng là giả thuyết pilot. |
| Soạn hồ sơ nháp | Định nghĩa bao gồm/loại trừ, alias, template/spec/workflow phiên bản, pháp lý và đối tác | Có cách đo/nhận, người chịu trách nhiệm, xử lý thiếu/không đạt/an toàn và báo giá khả thi. |
| Duyệt thí điểm | Người ngành/vận hành và reviewer độc lập, có chuyên gia ATTP/pháp lý khi cần | Đúng hàng × dạng × vùng × kênh; mở giao dịch chỉ sau quyết định phạm vi và cổng bắt buộc. |
| Đánh giá/mở đầy đủ | Tỷ lệ đáp ứng đúng spec, thời gian tìm nguồn, thiếu/thay/trả, sự cố, tái mua, công và đóng góp | Đạt ngưỡng nội bộ đã thống nhất; không đạt thì tạm dừng/thu hẹp, không giấu nhu cầu thất bại. |
| Bảo trì | Changelog, hiệu lực, hết hạn/thu hồi bằng chứng, kiểm lại mẫu và năng lực đối tác | Đơn đã ký giữ bản chụp; rủi ro an toàn mới kích hoạt xử lý riêng. |

Mã lý do tối thiểu: unknown_product, missing_template, compliance_unverified, no_qualified_supplier, insufficient_quantity, schedule_or_location_mismatch, price_gap, partner_unavailable. Thiếu xe không chữa bằng mở category; thiếu alias có thể giải quyết bằng ánh xạ, không cần sản phẩm mới.

Trạng thái đề xuất: received → needs_information hoặc mapped_existing → risk_review → template_ready → pilot_approved → supported; có rejected, paused, deprecated. Một sự kiện mapped_existing chỉ xác định tên, chưa chứng minh hồ sơ/lô đạt. Sửa hoặc gộp danh mục cần nhật ký, người duyệt và liên kết với nhu cầu gốc.

### 3.3. Ghép nhiều mặt hàng ở cấp dòng, không ở tên “giỏ”

**Đề xuất:** giỏ nhu cầu → dòng → phân bổ nguồn → đơn con → đợt giao → dòng nghiệm thu. Dòng giữ product/form/spec version, lượng/đơn vị, hồ sơ, khung nhận và quyền thay thế. Giỏ tổng hợp mức đáp ứng; không cộng kg cá với chai dầu thành một tỷ lệ khối lượng giả. Một dòng có nhiều nguồn; một chuyến có nhiều dòng nếu tương thích bảo quản.

Nếu bên mua cần 20 hàng mà mới sáu hàng được hỗ trợ, chỉ sáu hàng được xét giao dịch theo điều kiện hiện tại; 14 dòng còn lại tạo nhu cầu mở/việc thủ công. Không báo giỏ hoàn tất vì tìm được một nhà cung cấp. Cấu hình đầu mối bán lại cả giỏ và đầu mối chỉ gom phải hiển thị đúng người bán hợp đồng; trách nhiệm, cọc, giữ lượng và case thực tế được trình bày đầy đủ tại [05, mục 4](05-dich-vu-di-kem-chuoi-cung-ung.md#4-giỏ-nhiều-mặt-hàng-cần-rõ-người-bán-và-người-gom).

## 4. Pháp lý hàng sơ chế/chế biến phải kiểm theo bốn lớp độc lập

### 4.1. Văn bản năm 2026 có thay đổi và chuyển tiếp

**Sự thật có nguồn; mức chắc chắn cao về điều khoản đã đọc, chưa khẳng định đã rà mọi sửa đổi đến ngày mở giao dịch:**

| Văn bản, điều khoản | Mốc/trạng thái kiểm được | Hệ quả cần dùng |
|---|---|---|
| NQ 15/2026/NQ-CP ngày 06/04/2026, Điều 1–2, 4–5 | Bản ký xác nhận hiệu lực từ ngày ký, thay NQ 09/2026; tạm ngưng NĐ 46/2026 và NQ 66.13/2026 cho đến khi Luật ATTP sửa đổi và nghị định hướng dẫn có hiệu lực. | Trong thời gian ngưng tiếp tục NĐ 15/2018 và hướng dẫn; hồ sơ chuyển tiếp xử lý theo Điều 4. Đây là tạm ngưng có điều kiện, không bãi bỏ vĩnh viễn. [Bản ký](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/4/15-nqcp.signed.pdf), [hồ sơ Chính phủ](https://chinhphu.vn/?classid=0&docid=217667&pageid=27160). |
| NĐ 15/2018/NĐ-CP, Điều 3–6, 11–12 | Đã đọc phần định nghĩa, tự công bố và ngoại lệ giấy cơ sở trong bản ký, dùng theo cơ chế NQ 15 nêu trên. | Tách nghĩa vụ cơ sở khỏi hồ sơ sản phẩm; miễn một lớp không miễn mọi lớp. [NĐ 15 bản ký](https://datafiles.chinhphu.vn/cpp/files/vbpq/2018/02/15.signed.pdf). |
| TT 17/2018/TT-BNNPTNT, Điều 2–5 | CSDL VBPL đánh dấu còn hiệu lực; quy định phạm vi cơ sở nông lâm thủy sản không thuộc diện giấy và cơ chế quản lý bằng cam kết. | Chỉ áp đúng nhóm/hoạt động, kiểm phân công quản lý địa phương; không phải cam kết tự tạo trên app. [Thuộc tính VBPL](https://vbpl.vn/bonongnghiep/Pages/vbpq-van-ban-goc.aspx?ItemID=133273), [bản Công báo](https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2018/10/27861/24804-1-20181153-115417-2018-tt-bnnptnt.pdf). |
| TT 38/2018/TT-BNNPTNT và chuỗi sửa đổi, tra qua Văn bản hợp nhất 88/2026/VBHN-TT-BNNMT ngày 21/09/2026 | Bản hợp nhất liệt kê TT 17/2024, TT 17/2025 và TT 22/2026; đã kiểm phần đầu, Điều 5–6 và chú thích 26. Chú thích này ghi khoản 1 Điều 19 bị bãi bỏ dù phần thân vẫn in nội dung cũ. | Tra cả chú thích và văn bản sửa đổi; kiểm cơ quan được phân công tại địa phương. Văn bản hợp nhất không thay thế TT 38; ngày hợp nhất không phải ngày mọi quy định bắt đầu hiệu lực. [Hồ sơ Chính phủ](https://chinhphu.vn/?docid=219564&pageid=27160), [bản ký](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/9/88-vbhn-bnnmt.signed.pdf), truy cập 27/10/2026. |
| NĐ 37/2026/NĐ-CP ngày 23/01/2026, Điều 97–98 | Điều 97.1 hiệu lực từ ký; 97.4 b,c làm NĐ 43/2017 và 111/2021 hết hiệu lực. Điều 98.3 cho hàng nhãn cũ hợp lệ trước hiệu lực tiếp tục đến hạn dùng; 98.4 cho nhãn/bao bì đã in hợp lệ trước đó dùng không quá hai năm. | Dùng NĐ 37 cho khung nhãn hiện tại; 43/111 là lịch sử/chuyển tiếp, không viện dẫn như chưa bị thay. [Công báo số 93, bản gốc](https://congbaocdn.chinhphu.vn/180507251028987904/2026/2/10/cong-bao-so-93-ngay-09-02-46991signed-17707184340321150294299.pdf). |
| TT 29/2023/TT-BYT, Điều 1 và lộ trình/chuyển tiếp | Phạm vi nhãn dinh dưỡng thực phẩm bao gói sẵn có ngoại lệ; từ 01/01/2026 áp mốc nhãn theo quy định, hàng cũ hợp lệ có chuyển tiếp. | Không coi ngoại lệ nhãn dinh dưỡng là miễn toàn bộ nhãn hàng hóa. Cần y tế xác nhận sản phẩm cụ thể. [Bản ký](https://datafiles.chinhphu.vn/cpp/files/vbpq/2024/01/29-byt.signed.pdf), [giải thích chính thức của Bộ KH&CN](https://mst.gov.vn/hoi-dap/ghi-nhan-san-pham-hang-hoa-17087.htm). |

Thông tin Quốc hội và cổng HĐND TP.HCM ngày **24/10/2026** vẫn ghi nhận tờ trình/thảo luận **dự án** Luật ATTP sửa đổi. Đã đọc nội dung lập chỉ mục Quốc hội và toàn bài trên cổng HĐND; đây là tin diễn biến lập pháp, không thay bản luật. ([Quốc hội, 24/10/2026](https://quochoi.vn/tintuc/Pages/su-kien-noi-bat.aspx?ItemID=102434), [HĐND TP.HCM, 24/10/2026](https://hdnd.hochiminhcity.gov.vn/tin-tuc/tin-tong-hop/sua-luat-an-toan-thuc-pham-ro-trach-nhiem-xu-ly-nghiem-vi-pham), truy cập 27/10/2026.) **Đề xuất:** không dùng các phương án trong dự án làm điều kiện hiện hành. Đã mở lại NQ 15 và phần hiệu lực/chuyển tiếp của NĐ 37; **chưa kiểm được toàn bộ văn bản phát sinh sau các mốc đã dẫn**, kể cả diễn biến 25–27/10, nên trước giao dịch thật cần luật sư kiểm lại hiệu lực và chuyển tiếp.

### 4.2. Giấy cơ sở, cam kết, hồ sơ sản phẩm và nhãn là bốn câu hỏi khác nhau

**Sự thật có nguồn:**

| Lớp nghĩa vụ | Nội dung pháp lý đã kiểm | Mức chắc chắn và giới hạn |
|---|---|---|
| Giấy chứng nhận cơ sở đủ điều kiện ATTP | NĐ 15 Điều 11 yêu cầu giấy trừ các trường hợp Điều 12. Ngoại lệ gồm sản xuất ban đầu/sơ chế/kinh doanh nhỏ lẻ, kinh doanh thực phẩm bao gói sẵn và cơ sở có chứng nhận hệ thống được liệt kê còn hiệu lực; Điều 12.2 vẫn yêu cầu điều kiện ATTP tương ứng. | Cao về khung; trung bình khi xếp cơ sở thực tế. Không có giấy chưa chắc vi phạm, nhưng phải xác định căn cứ ngoại lệ. [NĐ 15, Điều 11–12](https://datafiles.chinhphu.vn/cpp/files/vbpq/2018/02/15.signed.pdf). |
| Cam kết ATTP | TT 17 áp các nhóm tại điểm a,b,c,d,đ khoản 1 Điều 12 trong phạm vi nông nghiệp, có ngoại lệ/phạm vi riêng. Điều 3–5 quy định ký cam kết, kiểm tra, xử lý; Điều 4.3 nêu ký ba năm/lần. | Cao về điều khoản; cần kiểm cơ quan địa phương. Không suy “mọi cơ sở miễn giấy đều phải cam kết”, cũng không coi cam kết là lựa chọn thay giấy tùy ý. [TT 17 bản Công báo](https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2018/10/27861/24804-1-20181153-115417-2018-tt-bnnptnt.pdf). |
| Tự công bố sản phẩm | NĐ 15 Điều 4.1 áp thực phẩm đã qua chế biến bao gói sẵn thông thường; Điều 4.2 có ngoại lệ riêng sản xuất/gia công xuất khẩu hoặc nội bộ không tiêu thụ trong nước. Điều 5 yêu cầu bản tự công bố và phiếu kiểm nghiệm trong 12 tháng từ phòng được chỉ định/được công nhận ISO 17025; chủ thể tự chịu trách nhiệm. | Cao về khung; cần chuyên gia xác định hàng/công đoạn thực tế. B2B không là ngoại lệ chung; thời hạn phiếu trong hồ sơ không phải bảo đảm mọi lô an toàn 12 tháng. [NĐ 15, Điều 4–5](https://datafiles.chinhphu.vn/cpp/files/vbpq/2018/02/15.signed.pdf). |
| Đăng ký bản công bố | NĐ 15 Điều 6 có nhóm riêng như thực phẩm bảo vệ sức khỏe, dinh dưỡng y học/ăn đặc biệt, sản phẩm dinh dưỡng cho trẻ nhỏ và một số phụ gia. | Không gọi mọi thực phẩm chế biến là phải đăng ký bản công bố. Phải rà nếu thay loại/công dụng sản phẩm. [NĐ 15, Điều 6](https://datafiles.chinhphu.vn/cpp/files/vbpq/2018/02/15.signed.pdf). |
| Nhãn, hạn dùng và nội dung kèm hàng | NĐ 37 Điều 35, 42, 46 và Phụ lục I điều chỉnh theo nhóm hàng và cách lưu thông; hàng bán rời/B2B không tự được miễn mọi thông tin. | Cao về điều khoản; áp dụng bao gói, trường thông tin và ngoại lệ phải xem sản phẩm. [NĐ 37 bản gốc](https://congbaocdn.chinhphu.vn/180507251028987904/2026/2/10/cong-bao-so-93-ngay-09-02-46991signed-17707184340321150294299.pdf), [Phụ lục I](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/37-pl.pdf). |

**Hộ kinh doanh khác doanh nghiệp thế nào?** NĐ 15 dùng tổ chức, cá nhân và phân biệt hoạt động/quy mô nhỏ lẻ tại Điều 3.8–10. Riêng định nghĩa **sản xuất ban đầu nhỏ lẻ/sơ chế nhỏ lẻ**, Điều 3.8–9 còn xét quy mô hộ và việc không có giấy chứng nhận đăng ký doanh nghiệp. Tự công bố theo Điều 4 không được miễn chỉ vì chủ thể là hộ. ([NĐ 15, Điều 3–4 và 12](https://datafiles.chinhphu.vn/cpp/files/vbpq/2018/02/15.signed.pdf), kiểm lại 27/10/2026.)

**Diễn giải áp dụng, cần luật sư/cơ quan quản lý xác định cơ sở cụ thể:** không xếp doanh nghiệp vào hai ngoại lệ nhỏ lẻ trên chỉ vì sản lượng ít; phải kiểm căn cứ miễn khác nếu có. Doanh nghiệp chỉ kinh doanh lại bao gói sẵn khác hộ trực tiếp rang/chế biến: không lấy ngoại lệ của hoạt động bán lại để che hoạt động sản xuất. Đăng ký hộ/doanh nghiệp không tự thay giấy/hồ sơ ATTP; phải đánh giá từng hoạt động và sản phẩm. **Chưa kiểm được** toàn bộ nghĩa vụ đăng ký, thuế/hóa đơn và điều kiện của mỗi chủ thể dự kiến.

Luật ATTP 55/2010/QH12, Điều 2 phân biệt sơ chế, chế biến và bao gói sẵn; bao gói sẵn có thể dùng chế biến tiếp hoặc ăn ngay. Điều 19, 25 yêu cầu điều kiện cơ sở và kiểm soát nhiễm chéo; Điều 54–55 đặt truy xuất/thu hồi thực phẩm không an toàn. Vì vậy bán rời hoặc bán cho nhà máy không xóa nghĩa vụ an toàn. ([Luật ATTP · Toàn văn Chính phủ](https://chinhphu.vn/?docid=96032&pageid=27160).)

### 4.3. Nhãn và hạn dùng phải theo thực tế bao gói, không theo tên quảng cáo

**Sự thật có nguồn:** NĐ 37 Điều 35.2 e có ngoại lệ thực phẩm không bao bì bán trực tiếp người tiêu dùng, không phải miễn chung cho mọi lô B2B. Điều 35.3 có cơ chế tài liệu kèm hàng dạng rời không bao bì thương phẩm. Điều 42.1 và Phụ lục I yêu cầu tên, chủ thể chịu trách nhiệm/địa chỉ, xuất xứ và nội dung theo nhóm thực phẩm như định lượng, ngày/hạn, thành phần, cảnh báo, hướng dẫn và dinh dưỡng khi áp dụng. Điều 46.3 ràng buộc ngày/hạn khi đóng gói lại với nhãn gốc; không bắt đầu lại hạn dùng chỉ bằng ngày đóng gói mới. ([NĐ 37, Điều 35, 42, 46](https://congbaocdn.chinhphu.vn/180507251028987904/2026/2/10/cong-bao-so-93-ngay-09-02-46991signed-17707184340321150294299.pdf), [Phụ lục I](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/37-pl.pdf).)

TT 29 có ngoại lệ nhãn dinh dưỡng như nguyên liệu/thực phẩm không bán trực tiếp người tiêu dùng và sản phẩm một thành phần theo phạm vi văn bản. Không suy ngoại lệ này thành miễn tên, lô, chủ thể hoặc mọi nội dung nhãn khác. ([TT 29, Điều 1](https://datafiles.chinhphu.vn/cpp/files/vbpq/2024/01/29-byt.signed.pdf).)

**Đề xuất:** lưu riêng manufactured_at, packed_at, expiry_at, hạn gốc, điều kiện kho, lượng tịnh, mã lô, nhãn phiên bản và chủ thể chịu trách nhiệm. Cơ sở phải có căn cứ chuyên môn cho hạn dùng; AgiViet không tự cấp một hạn chung cho cá khô hoặc điều rang. QR chỉ cung cấp dữ liệu và lịch sử, không tự thay nội dung bắt buộc, chứng thư hay hồ sơ thu hồi. **Chưa kiểm được** phép thử, phương pháp xác lập hạn dùng, điều kiện dùng nhãn điện tử và nghĩa vụ định danh/truy xuất số mới cho từng sản phẩm.

### 4.4. Xuất khẩu cần lớp thị trường và người nhận trách nhiệm

**Sự thật có nguồn:** Luật ATTP Điều 41–42 yêu cầu đáp ứng quy định Việt Nam và yêu cầu nước nhập/hợp đồng, giấy chứng nhận tương ứng theo yêu cầu. Không có một bộ giấy chung đủ cho mọi mặt hàng. ([Luật ATTP](https://chinhphu.vn/?docid=96032&pageid=27160).)

| Trường hợp | Bằng chứng pháp lý/thủ tục đã kiểm | Điều cần rà thêm |
|---|---|---|
| Hàng thực vật thuộc diện kiểm dịch xuất khẩu | Tài liệu thủ tục QĐ 1000/QĐ-BNNMT năm 2025, mục 16, mô tả kiểm và cấp giấy theo yêu cầu nước nhập; không đạt thì không cấp. [Cục Trồng trọt và BVTV, trang 150 trở đi](https://www.ppd.gov.vn/FileUpload/Documents/250423_tthc_qd1000.pdf). | Chưa rà hết sửa đổi thủ tục năm 2026; không dùng thời hạn cũ làm SLA. Mã vùng/đóng gói, xử lý và phép thử theo đúng hàng/nước, không áp chung mọi nông sản khô. |
| Thủy sản vào EU | EC mô tả điều kiện nước/cơ sở được phép và danh sách cơ sở theo nhóm tại TRACES; Access2Markets nêu yêu cầu y tế và kiểm soát theo sản phẩm. [EC · Authorised establishments](https://food.ec.europa.eu/food-safety/biological-safety/food-hygiene/non-eu-countries-authorised-establishments_en), [EC · Health requirements](https://trade.ec.europa.eu/access-to-markets/en/content/health-and-consumer-protection-animal-and-plant-product). | Kiểm loài/dạng/nguồn/cơ sở/chứng thư/nhà nhập khẩu cho lô thật; giấy trên website cũ không chứng minh còn hiệu lực. |
| Chứng từ thương mại, xuất xứ và vận tải | Luật ATTP không làm các giấy ATTP thay mọi hồ sơ nước nhập/hợp đồng. | C/O theo chế độ xuất xứ/yêu cầu liên quan, không là chứng nhận an toàn; HS phải theo hàng thực tế. Chưa kiểm checklist hải quan/thuế đầy đủ của từng tuyến. |
| Nguyên liệu thủy sản nuôi hoặc khai thác | Phải xác định nguồn trước khi lập bộ yêu cầu. | Chưa kiểm được bản ký sơ cấp QĐ 3885/QĐ-BNNMT được báo cáo 03 dẫn qua VASEP, nên không dùng làm nghĩa vụ mới chắc chắn. Không áp IUU/SC/CC đồng loạt cho cả thủy sản nuôi và khai thác. |

**Đề xuất:** mỗi bộ yêu cầu lưu nước đến, sản phẩm/dạng, mục đích, bên xuất/nhập, cơ sở/vùng khi áp dụng, chứng thư/phép thử, hiệu lực và nguồn luật; phân biệt yêu cầu pháp luật, yêu cầu nước nhập và tiêu chí riêng người mua. Giấy phù hợp sản phẩm/site này không tự phủ mọi hàng của cùng người bán. AgiViet điều phối và lưu hồ sơ; doanh nghiệp xuất khẩu và cơ quan/đơn vị chuyên ngành chịu phần việc của mình. Không gọi đăng ký hoặc chứng nhận một khâu là “được mọi nước phê duyệt”.

## 5. Ranh giới đầu kỳ và cổng mở hàng chế biến

Toàn bộ phần này là **đề xuất quản trị rủi ro của AgiViet**, không khẳng định pháp luật cấm các hàng/công đoạn bị hoãn.

| Tình huống | Cổng hồ sơ và kỹ thuật cần có | Đề xuất đầu kỳ |
|---|---|---|
| Hàng thô trong tám mặt hàng đã chốt | Nguồn/cơ sở, công đoạn, quy cách, điều kiện giữ tươi, hồ sơ áp dụng, cách nghiệm thu/không đạt và đối tác | Chỉ giao dịch theo phạm vi và các cấp mở hiện tại; đủ điều kiện mô phỏng không đồng nghĩa sẵn sàng vận hành thật. |
| Phân loại, loại bỏ phần hỏng, làm sạch/đóng thùng phù hợp | Danh sách thao tác theo hàng/cơ sở, vệ sinh, lượng tính tiền trước/sau, hồ sơ đúng hoạt động | Cho trong phạm vi sơ chế đơn giản đã duyệt; không duyệt chung chỉ bằng từ “sơ chế”. |
| Điều tươi, điều nhân ngoài danh mục | Làm rõ quả/hạt/còn vỏ/nhân, nguồn và công đoạn | Nhận nhu cầu/ghi sổ, chưa ghép/cọc; không tự mở ngoài tám hàng. |
| Điều rang muối túi/hũ/hộp | Công thức, rang/tẩm, cơ sở, tự công bố nếu thuộc diện, kiểm nghiệm, nhãn/lô/hạn | Hoãn giao dịch đầu kỳ; duyệt tên không thay cổng sản phẩm/cơ sở. |
| Cá khô bán rời cho quán hoặc túi hút chân không | Loài, phơi/sấy, sống/chín, thành phần, ăn ngay/cần nấu, nguồn/quy trình, hồ sơ và bảo quản/hạn | Nhận nhu cầu để xây mẫu/đối tác; không mặc định khô hay hút chân không là sơ chế đơn giản/giữ nhiệt thường. |
| Đồ hộp kín đã xử lý nhiệt để ổn định thương mại | Khác bỏ điều rang vào hộp: cần quy trình/năng lực và đánh giá chuyên môn đúng sản phẩm | Không hỗ trợ giao dịch ban đầu; AgiViet không xác nhận tiệt trùng hoặc tự gia công. |
| Mổ/cắt/phi lê, tẩm, lên men, ăn sống/ăn ngay, sấy/rang hoặc quy trình mới | Cổng riêng theo sản phẩm, nguy cơ, cơ sở và pháp lý | Không tự mở vì template gần giống; đây là cổng đánh giá, không kết luận mọi thao tác có cùng phân loại pháp lý. |
| Các hàng trên bán xuất khẩu | Giữ cổng sản phẩm, thêm lớp thị trường và đơn vị chịu trách nhiệm | Giới thiệu/điều phối có điều kiện, không tự đứng tên xuất khẩu hay bảo đảm thông quan. |

**Trước mở thật, luật sư và chuyên gia cần kiểm cụ thể:** hiệu lực/chuyển tiếp ATTP và nhãn; căn cứ nhỏ lẻ/ngoại lệ giấy/cam kết; công đoạn và hồ sơ tự công bố/đăng ký; cơ quan thẩm quyền tại địa phương; phép thử/nhãn/hạn dùng/thu hồi; cơ sở và thị trường xuất khẩu; vai trò sàn, hợp đồng, thanh toán, thuế/chứng từ. Đã kiểm được chuỗi sửa đổi TT 38/2018 qua Văn bản hợp nhất số 88; **chưa kiểm được** đầy đủ thủ tục, biểu mẫu, phân kỳ hiệu lực của TT 22/2026 và mọi sửa đổi tiếp theo. Vì vậy chưa đưa tên cơ quan cụ thể hoặc thời hạn cấp giấy cố định vào app.

Tách đánh giá pháp lý theo hộ/pháp nhân × cơ sở × hoạt động × hàng/dạng × kênh, lưu nguồn/điều khoản/ngày kiểm/người duyệt/hiệu lực. Lô không đạt an toàn phải khóa và truy các lô chia/gộp/người nhận; không chuyển thành “hàng kém loại” để bán gấp. Quy tắc K19 xử lý hàng tươi tại chỗ không cấm thu hồi hợp pháp theo Điều 54–55 Luật ATTP.

**Đề xuất kiểm lại hồ sơ:** khi chuyển/đổi cơ sở, thay hệ thống quản lý hoặc mở công đoạn mới, tạo việc đánh giá lại phạm vi cơ sở và sản phẩm; không suy giấy của địa điểm cũ bao phủ địa điểm mới. Tham chiếu Điều 6 trong Văn bản hợp nhất số 88 nêu ở mục 4.1; đây là cổng kiểm nội bộ, không phải giấy phép do AgiViet cấp.

Khả năng mở danh mục được chứng minh bằng số nhu cầu có nguồn hợp lệ, giao đúng quy cách và tái mua với chi phí phục vụ chấp nhận được. Một danh mục dài hoặc nút “khác” chỉ chứng minh đã nhận thông tin, chưa chứng minh AgiViet biết thực hiện giao dịch ấy.

## 6. Phạm vi kiểm nguồn ở lượt nối tiếp

**Đã mở lại hoặc bổ sung ngày 27/10/2026:** Tridge, hướng dẫn thuộc tính Alibaba, báo cáo IndiaMART FY2025, Ninja Mandi, WCO HS, NC eProcurement, GS1 Hierarchy Principles và quy trình Work Request; bổ sung kho/gói GPC 2026-05. Đã kiểm lại phần quyết định QĐ 32, chưa rà toàn bộ phụ lục mã hàng. Về pháp lý, đã đọc phần hiệu lực/chuyển tiếp NQ 15 và NĐ 37, định nghĩa nhỏ lẻ/ngoại lệ cơ sở của NĐ 15; bổ sung các phần nêu tại mục 4.1 của Văn bản hợp nhất số 88 và tin dự án luật 24/10. Các link đặt tại nhận định; tin Quốc hội đọc qua chỉ mục, tin HĐND đọc đầy đủ.

**Kế thừa, chưa mở lại đầy đủ ở lượt này:** GS1 Generic Business Rules và phân biệt Brick/Trade Item Attributes; US Commerce về UNSPSC; TT 17/2018, TT 29/2023, Luật ATTP; các điều nhãn 35/42/46 và phụ lục NĐ 37; thủ tục kiểm dịch, nguồn EC và các nội dung xuất khẩu tại mục 4.4. Giữ ngày truy cập ghi nhận từ bản trước và các cảnh báo tương ứng. **Chưa kiểm được** quy trình nội bộ 1688/các sàn, toàn bộ mã GPC/HS/UNSPSC/VN của từng hàng, bản ký TT 22/2026 đầy đủ và mọi thay đổi pháp lý sau các mốc đã kiểm. Danh mục và checklist đề xuất chưa đủ làm căn cứ mở giao dịch thật.
