Tôi đã đối chiếu ảnh với mã trong `agiviet-production-v2`, nghiệp vụ tại `~/Documents/AgiViet` và quy trình v23. **Đây là nhập vai từ ảnh và đọc mã, chưa phải quan sát nông dân thật sử dụng.** Ảnh thuộc worktree khác nên có vài câu chữ khác mã hiện tại; tôi không sửa hay chạy thao tác ghi dữ liệu.

**1. NHẬT KÝ NHẬP VAI**

- **Ảnh 17 — Tôi, hồ sơ và giấy tờ:** “Có tên tui, tên hộ là tui biết vô đúng chỗ rồi. Mà ‘Mức 2/2’ là được bán hết các loại hàng chưa, sao VietGAP cũng có dấu xanh mà lại ghi chưa có số?”
- **Ảnh 18 — Nộp VietGAP:** “Chụp tờ giấy thì tui làm được như gửi hình Zalo. Còn số giấy nằm chỗ nào, ngày nào là ngày hết hạn, tui sợ nhìn nhầm; chụp xong cũng chưa thấy hình để coi có mất góc không.”
- **Ảnh 19 — Sau khi nộp:** “Có báo đã nhận, chờ một hai ngày thì tui đỡ lo. Nhưng giờ có hai dòng VietGAP, một cái xanh một cái vàng, tui không biết giấy mới có thay giấy cũ chưa.”
- **Ảnh 20 — Thời tiết:** “Coi hình mưa với lời nhắc đem bạt thì tui hiểu. Mưa 95% là chắc mưa hay mưa lớn, rồi sáng mai mấy giờ hái xoài được?”
- **Ảnh 21 — Giá và tin tức:** “Tui vô coi xoài hôm nay bao nhiêu mà lại chưa có giá. Tin thì nhiều chữ, có cả cà phê với trứng gà, tui không biết tin nào giúp bán xoài của tui.”
- **Ảnh 22 — Thông báo:** “Chữ ‘Cần bác làm’ dễ hiểu, tui bấm vô đó trước. Hai lời chào giống nhau quá, phải ghi ai mua, mua bao nhiêu ký thì tui mới phân biệt được.”
- **Ảnh 23 — Tiện ích:** “Nhiều mục quá, tui chưa biết việc nào cần làm bữa nay. Thấy tên nhà máy với số hợp đồng sẵn, tui tưởng đó là khách và đơn của tui.”
- **Ảnh 24 — Sổ hợp đồng trống:** “Bữa trước tui đi tới hợp đồng rồi mà giờ trống trơn, tui sợ mình bấm mất. Có nút xem lời chào thì còn biết đường đi tiếp, nhưng tui vẫn muốn biết hợp đồng cũ đâu.”
- **Ảnh 25 — Chi tiết lô thiếu mã:** “‘Thiếu mã lô’ là thiếu cái gì, tui đâu có biết kiếm mã ở đâu. Có nút ‘Chọn lại lô xoài của bác’ ngay đây thì tui làm được.”
- **Ảnh 26 — Nhu cầu bên mua thiếu mã:** “Tui muốn coi người ta cần mua gì mà vô đây bị đứng. Tui sẽ bấm mũi tên trở lại, chứ không biết sửa cái mã này.”
- **Ảnh 29 — Cài đặt, người giúp, hỗ trợ:** “Có chữ lớn với đọc chậm là hợp tui, nhưng phải kéo xuống xa mới thấy. Thằng Tèo làm được những việc gì tui muốn nghe giải thích; cái hạn tới 00 giờ ngày 1/1 thì tui không hiểu.”
- **Ảnh 30 — Đăng bài:** “Có sẵn hình xoài nhà tui, lại được nói để đăng thì tiện. Hai cách phía dưới mờ đi, tui tưởng chưa làm xong; nếu cần chọn loại trước thì app nói giùm.”
- **Ảnh 31 — Trợ lý giải thích tiền cọc:** “Tui hiểu sơ là ngân hàng giữ, chưa phải tiền đã về túi tui. Nhưng tui hỏi tiền của tui đang ở đâu thì muốn thấy đơn nào, bao nhiêu tiền, còn chờ ai; đoạn trả lời này dài quá mà không có nút nghe.”

**2. NÔNG DÂN SỐ ĐÔNG KHÓ DÙNG Ở ĐÂU**

Các điểm dưới đây là **rào cản có khả năng gặp ở nhóm giống chị Năm**, chưa có căn cứ để khẳng định tỷ lệ trong toàn bộ nông dân.

**a. Chữ nhỏ, đọc chậm, mắt kém**

- **Đang hỗ trợ:** Nút tương đối lớn, hình mặt hàng, biểu tượng kèm chữ; ba cỡ chữ và ba tốc độ đọc. `chung.js` có chọn giọng Việt và đọc từng câu. ([Cỡ chữ](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:19), [giọng đọc](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:77))
- **Còn thiếu:** Nhiều ghi chú, hạn giấy tờ, nguồn tin chỉ khoảng 12–14 px. Các màn Tôi, thời tiết, tin tức và câu trả lời trợ lý chưa có nút Nghe tương ứng. Cài đặt nằm sâu trong trang Tôi; phóng chữ bằng `zoom` chưa chứng minh bố cục vẫn thuận tiện trên điện thoại nhỏ.
- **Đề xuất:** Đưa “Chữ lớn · Nghe” ra vị trí dễ thấy từ lần đầu; đọc phần chính và việc cần làm trước. Khi chọn cỡ chữ, hiện ngay một đoạn mẫu. Brief đã yêu cầu chữ thân từ 17 px và hỗ trợ nghe trên mọi màn. ([Brief](/home/twictrn/Documents/AgiViet/AgiViet_brief_app_ban_chot_V1.md:106))

**b. Gõ phím, nhập số và ngày**

- **Đang hỗ trợ:** Đăng bài điền sẵn mặt hàng/vườn, có đường lấy dữ liệu nhật ký. Nộp giấy cho phép chụp ảnh; số giấy và hạn là trường tùy chọn.
- **Còn thiếu:** Sửa hồ sơ và gửi hỗ trợ vẫn cần viết đoạn văn. Nộp giấy vẫn phải tự tìm, chép số và hạn; chưa thấy xem trước ảnh hoặc tự nhận thông tin từ ảnh trong luồng này. ([Form giấy tờ và sửa hồ sơ](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-toi.html:173))
- **Đề xuất:** Cho nói hoặc chọn sẵn “Sai tên / Sai địa chỉ / Thêm diện tích”. Chụp giấy xong hiện ảnh lớn; nếu nhận dạng được số/ngày thì đọc lại để bác xác nhận, đánh dấu phần chưa chắc.

**c. Khái niệm khó: cọc, hợp đồng, xác minh, mã vùng**

- **Đang hỗ trợ:** Giấy mới nộp được ghi rõ “Chờ nhân viên đối chiếu”; sổ hợp đồng hiện tại giải thích còn bước bên mua gửi điều kiện. Quy trình tách giấy tờ, nhật ký và lịch sử giao dịch, không coi nhật ký là chứng nhận hàng đạt. ([Quy trình](/home/twictrn/agiviet-production-v2/docs/mo-phong-quy-trinh/quy-trinh.json:15169))
- **Còn thiếu:** “Mức 2/2”, xác minh hộ và xác minh từng giấy dễ bị hiểu là một. TQ/HQ là chữ viết tắt; không có hướng dẫn nhìn mẫu giấy. Trợ lý giải thích cơ chế cọc nhưng chưa trả lời trạng thái tiền của một đơn cụ thể.
- **Đề xuất:** Ghi “Đã kiểm người và vườn” riêng với “Giấy VietGAP đã đối chiếu”; giải thích mã vùng bằng ảnh giấy mẫu. Câu hỏi về tiền phải dẫn tới đúng hợp đồng và cho thấy **số tiền – trạng thái – ai làm tiếp – mốc cập nhật**. Dữ liệu gửi cho trợ lý hiện chỉ có một số thông tin lô và trạng thái đơn, chưa có chi tiết cọc. ([Backend trợ lý](/home/twictrn/agiviet-production-v2/backend/src/routes/v1.ts:425))

**d. Điều hướng, lạc đường**

- **Đang hỗ trợ:** Có năm mục chính, mũi tên quay lại, màn trống kèm bước tiếp theo. Hai màn chi tiết đã có nội dung nghiệp vụ khi nhận đúng `id`.
- **Còn thiếu:** Hồ sơ/cài đặt ẩn sau ảnh đại diện; biểu tượng tai nghe mở trợ lý có thể khiến bác tưởng sẽ gọi được nhân viên. Danh mục Tiện ích trộn nhiều việc và dữ liệu mẫu. Khi thiếu mã, màn lỗi không có nút chọn lại ngay trong nội dung.
- **Đề xuất:** Thêm nhãn dễ thấy “Tôi và cài đặt”, “Hỏi trợ lý”, “Nhờ nhân viên”. Màn lỗi có “Về Chợ, chọn lại lô/nhu cầu”. **Không kết luận liên kết từ Chợ đang hỏng:** mã hiện tại có truyền `id` cho cả lô và nhu cầu. ([Liên kết lô](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:397), [nhu cầu](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:493))
- Riêng hợp đồng trống sau hành trình trước: **không chắc** do phiên khác, dữ liệu được đặt lại hay nguyên nhân khác; ảnh không chứng minh hợp đồng bị mất.

**e. Sợ mất tiền, bị lừa**

- **Đang hỗ trợ:** Có giải thích riêng tư, che liên lạc trước cọc; đổi tài khoản nhận tiền đi qua hỗ trợ và xác minh. Sổ tiền phân biệt cọc đang giữ, tiền trả thẳng đã xác nhận và khoản đang chuyển. ([Trang Tôi](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-toi.html:127), [sổ tiền](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-tien.html:105))
- **Còn thiếu:** Trợ lý chưa đưa bằng chứng cụ thể cho câu “tiền của tôi ở đâu”. Màn Tiện ích có nút xác nhận tiền với hiệu ứng mô phỏng, dễ tạo niềm tin rằng đã ghi nhận giao dịch.
- **Đề xuất:** Cho mở đúng khoản tiền từ câu trả lời; giải thích “bên mua báo chuyển” khác “đã nhận”. Nhãn “đã xác minh” phải nói rõ đã kiểm gì, không được hiểu thành bảo đảm mọi giao dịch. Các nút mô phỏng cần ghi rõ trạng thái trước khi người thử bấm. ([Tương tác mô phỏng](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-them.html:178))
- Tài liệu repo ghi tiền/ngân hàng đang là môi trường thử; có API không chứng minh đã kết nối ngân hàng thật. ([Giới hạn đã ghi nhận](/home/twictrn/agiviet-production-v2/docs/frontend/danh-gia-thanh-that.md:37))

**f. Mạng yếu, đang làm thì mất mạng**

- **Đang hỗ trợ:** Có dải báo mất mạng; đăng bài tạo lô nháp trước khi tải ảnh, có khóa chống lặp và báo tiến độ ảnh. ([Báo mạng](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:323), [đăng bài](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:748))
- **Còn thiếu:** Chưa thấy lưu bền nội dung đang điền của đăng bài, nhật ký, giấy tờ và hỗ trợ trong các màn được đọc. Lô nháp trên máy chủ chỉ xuất hiện khi đã tới bước gửi; chưa bảo vệ toàn bộ công sức trước đó. Có khóa chống lặp cũng chưa đồng nghĩa gửi lại được sau khi đóng app.
- **Đề xuất:** Lưu nháp ngay khi nhập, có “Làm tiếp bản nháp”; giữ ảnh đã chọn và trạng thái từng tệp. Với ký/xác nhận tiền, khi kết quả chưa rõ phải tra lại trạng thái trước khi cho làm tiếp. Brief đã nêu lưu nháp và hạn chế thao tác quan trọng lúc mất mạng. ([Yêu cầu trạng thái mạng](/home/twictrn/Documents/AgiViet/AgiViet_brief_app_ban_chot_V1.md:686))

**g. Dùng giọng nói**

- **Đang hỗ trợ:** Đăng bài có hỏi từng câu, nghe trả lời, đọc lại lượng/giá/ngày để xác nhận, cho nói sai rồi sửa và có nút tạm dừng. Đây đã là mã xử lý, không chỉ có nút micro trang trí. ([Hội thoại đăng bài](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:529))
- **Còn thiếu:** Phụ thuộc khả năng nhận giọng của trình duyệt và dịch vụ AI ở một số bước. Khi máy không hỗ trợ hoặc từ chối micro, phương án còn lại thường là gõ. Trợ lý hỏi–đáp chưa có micro/Nghe; micro nhật ký chỉ nối lời nói vào ghi chú, chưa điền tên thuốc, ngày cách ly hay lượng thu.
- **Đề xuất:** Hướng dẫn bật micro bằng hình; có lựa chọn gửi lời nhắn thoại cho nhân viên. Luôn đọc lại số tiền, đơn vị và ngày; thử trên điện thoại phổ thông, giọng miền Tây và tiếng ồn ngoài vườn trước khi đánh giá là dùng tốt.

**h. Người nhà giúp**

- **Đang hỗ trợ:** Có danh sách người giúp, phạm vi quyền, hạn và thu hồi hai lần bấm. Trang Tôi nói rõ ký và xác nhận tiền do chủ làm; backend có API cấp/thu hồi ủy quyền. ([Trang Tôi](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-toi.html:112), [API](/home/twictrn/agiviet-production-v2/backend/src/routes/v1.ts:92))
- **Còn thiếu:** Trong trang Tôi chưa có luồng tự mời và chọn quyền; khi chưa có người giúp thì hướng dẫn nhờ hỗ trợ. Danh sách quyền dài, hạn hiển thị khó hiểu như ảnh 29; chưa thấy bản tóm tắt “Tèo vừa làm gì giúp bác” tại đây.
- **Đề xuất:** Mời bằng số điện thoại, chọn từng việc bằng câu đơn giản, hạn rõ “đến hết ngày…”, có “Dừng mọi quyền giúp”. Mỗi người dùng tài khoản riêng theo quy trình v23; không hướng dẫn đưa OTP/PIN của chủ cho người nhà. ([Quy trình tài khoản riêng](/home/twictrn/agiviet-production-v2/docs/mo-phong-quy-trinh/quy-trinh.json:14960))

**3. BẢNG TÍNH NĂNG CÒN THIẾU / CHƯA LÀM KỸ**

**P0:** cần xử lý trước thử giao dịch tiền thật. **P1:** cần cho đợt thử nông dân có người hỗ trợ. **P2:** hoàn thiện tiếp. “Có” dưới đây nghĩa là thấy màn/mã/API, không mặc định đã vận hành ngoài thực tế.

| # | Tính năng | Hiện trạng (có/thiếu/mô phỏng) | Vì sao nông dân cần | Mức ưu tiên | Đề xuất |
|---|---|---|---|---|---|
| 1 | Trang cá nhân, cập nhật thông tin | **Có** hồ sơ và gửi đề nghị sửa; chưa có chỉnh sửa theo từng trường | Biết sai ở đâu, sửa gì, khi nào xong | P1 | Chọn trường cần sửa, nói nội dung, theo dõi trước/sau và trạng thái duyệt |
| 2 | Nộp giấy tờ | **Có** tải ảnh, gửi thông tin và tạo việc đối chiếu | Bổ sung hồ sơ mà không phải đi lại nhiều | P1 | Xem trước ảnh, hướng dẫn chụp đủ góc, điền hỗ trợ số/ngày |
| 3 | Gia hạn, thay giấy cũ | **Có nộp mới; thiếu luồng thay thế rõ ràng**. Lệnh hiện tại thêm bản ghi | Tránh hai VietGAP cùng hiện mà không biết dùng bản nào | P1 | Chọn “Gia hạn giấy này”; giữ lịch sử, đánh dấu bản đang dùng |
| 4 | Nhắc giấy sắp hết hạn | **Có hiện hạn; chưa thấy nhắc chủ động trong màn đã đọc** | Không bỏ lỡ đơn vì giấy hết hiệu lực | P1 | Nhắc trước hạn, dẫn thẳng tới giấy cần bổ sung; quy trình có nhắc trước 7 ngày cho nhánh định kỳ |
| 5 | Nâng cấp hồ sơ, giấy tờ | **Có nộp bổ sung; thiếu hướng dẫn đạt điều kiện còn thiếu** | Biết cần làm gì để tiếp cận nhóm người mua phù hợp | P1 | Hiện giấy cần cho từng nhu cầu và cách nhờ nhân viên; phân biệt nộp ảnh với được cấp chứng nhận |
| 6 | Xác minh người/vườn/mặt hàng | **Có mức xác minh, kiểm mặt hàng và quy trình tại chỗ; hướng dẫn chưa nhất quán** | Biết vì sao chưa đăng được và ai sẽ tới kiểm | P0 | Thống nhất với v23; hiện lịch hẹn, việc thiếu, kết quả kiểm và quyền được mở |
| 7 | Thời tiết | **Có API Open-Meteo**, lấy tọa độ trung tâm tỉnh; màn chưa hiện nguồn/giờ | Chọn lúc hái, che hàng, hẹn xe | P1 | Hiện phạm vi dự báo, lần cập nhật, lượng mưa; bổ sung theo giờ nếu có dữ liệu |
| 8 | Cách diễn đạt cảnh báo thời tiết | **Có**, nhưng lời khuyên và thông báo dùng ngưỡng “mưa lớn” khác nhau | Tránh hiểu “không mưa lớn” thành không cần chuẩn bị | P1 | Thống nhất cách gọi; tách “dễ mưa” với “nguy cơ mưa lớn” |
| 9 | Giá tham khảo | **Có API; ảnh 21 chưa có giá**. Lỗi lấy giá có thể cũng hiện thành chưa có giá | Có căn cứ thương lượng | P1 | Phân biệt thiếu dữ liệu/lỗi tải; hiện vùng, loại, thời điểm, số giao dịch và nguồn |
| 10 | Tin tức phù hợp | **Có RSS**; màn Giá & tin gọi tin chung, màn Thông báo có lọc mặt hàng | Đọc ít mà đúng việc trồng, bán xoài | P2 | Ưu tiên xoài/địa phương, tiêu đề dễ đọc, mở bài gốc rõ ràng |
| 11 | Cài đặt dễ tiếp cận | **Có** chữ lớn và tốc độ đọc, lưu trên máy | Tự điều chỉnh khi mắt kém | P1 | Đưa lối vào ra ngoài, có xem/nghe thử; kiểm bố cục ở cỡ lớn nhất |
| 12 | Hỗ trợ nhân viên | **Có** gửi yêu cầu, trạng thái và hạn phản hồi; còn dựa vào gõ | Cần người thật khi vướng tiền hoặc giao hàng | P0 | Nút xin gọi lại, lời nhắn thoại, đính kèm ảnh và gắn đúng đơn |
| 13 | Nhật ký vườn | **Có** ghi/sửa, lịch sử, cách ly thuốc, lượng thu; micro chỉ ghi chú | Nhớ việc, ngày được hái và nguồn gốc | P1 | Nói để điền từng trường, thêm ảnh ngay trong form; hỗ trợ nhãn thuốc nhưng yêu cầu xác nhận |
| 14 | Đăng bài bằng giọng nói | **Có xử lý hội thoại/API**; chưa chắc chất lượng trên máy thật | Giảm gõ lượng, giá và ngày | P1 | Thử thiết bị/giọng thực tế; xử lý mất mạng, thiếu micro và hiểu sai số |
| 15 | Hướng dẫn lần đầu | **Có màn mẫu**, một số nút `href="#"`; “Gửi xác minh” đi tới tài khoản thử | Người mới cần biết từng thao tác và giới hạn | P1 | Nối luồng thật; hướng dẫn ngắn ngay lần đầu đăng, xem tiền, nhờ giúp |
| 16 | Người giúp | **Có danh sách, quyền, thu hồi/API; thiếu luồng mời/chọn quyền tại trang Tôi** | Con cháu hỗ trợ mà chủ vẫn kiểm soát tiền | P1 | Mời tài khoản riêng, chọn quyền dễ hiểu, hạn rõ, xem lịch sử người giúp |
| 17 | Thông báo | **Có** phân nhóm, “Cần bác làm”, dấu mới; đã xem lưu cục bộ | Không bỏ lỡ lời chào, ký và tiền | P1 | Hiện tên khách/lượng/hạn; đánh dấu từng tin theo tài khoản, mở đúng lời chào; thông báo khi đóng app **chưa chắc** |
| 18 | Trợ lý về tiền cọc | **Có giải thích**, thiếu dữ liệu cọc cụ thể trong ngữ cảnh gửi AI | Biết tiền mình đang ở bước nào | P0 | Lấy trạng thái tiền từ API nghiệp vụ; dẫn tới đúng đơn, thêm nói/nghe |
| 19 | Sổ hợp đồng, trạng thái trống | **Có danh sách và hướng dẫn**; nguyên nhân trống sau lượt trước **không chắc** | Yên tâm hợp đồng không mất | P1 | Hiện đúng hộ/phiên, nút tải lại, tìm đơn cũ; làm rõ đang chờ bên mua lập hợp đồng |
| 20 | Phục hồi khi mở thiếu mã | **Có bắt lỗi**, thiếu nút chọn lại trong nội dung | Không cần hiểu “mã lô/mã nhu cầu” | P1 | Cho về danh sách và chọn bằng ảnh, tên hàng, tên khách |
| 21 | Nháp và mạng yếu | **Có một phần**: dải mạng, lô nháp, gửi lại ảnh; thiếu lưu bền form đang nhập | Không mất công nhập/chụp ngoài vườn | P1; P0 với tiền/ký | Khôi phục bản nháp, báo gửi/chưa gửi rõ; đối chiếu trạng thái thao tác quan trọng |
| 22 | Tiện ích: thu chi, so sánh khách, ký giấy, dịch vụ, đánh giá | **Nhiều mục mô phỏng**, số liệu viết sẵn và nút báo thành công bằng hiệu ứng | Đây là những việc bác có thể tưởng đã thực hiện | P0 với xác nhận tiền; P2 phần khác | Ghi rõ bản mẫu; chỉ báo thành công sau khi có kết quả nghiệp vụ được lưu |

Các căn cứ cần lưu ý thêm: [nộp giấy đang thêm bản ghi mới](/home/twictrn/agiviet-production-v2/db/migrations/0077_nguoi_ban_nop_giay_to.sql:19), [nguồn và phạm vi thời tiết](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/tien-ich.ts:40), [hướng dẫn lần đầu còn là mẫu](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-bat-dau.html:127), [cách ghi đã xem thông báo](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-thong-bao.html:257).

