**1. CHẤM TỪNG KỊCH BẢN**

**Backend đã chứng minh được nhiều bước giao dịch thật trong môi trường thử; chưa chứng minh hai app hoàn thành toàn bộ hành trình.** App mua được chỉ định vẫn là mô phỏng. BAN-01 đi tới xác nhận **16.310.000 đồng trả thẳng**, còn cọc **6.990.000 đồng** chưa được chứng minh đã quyết toán.

Tôi chấm theo [nhật ký bán](/home/twictrn/.claude/jobs/d88082d5/tmp/kq-nguoi-ban.json), [nhật ký mua](/home/twictrn/.claude/jobs/d88082d5/tmp/kq-nguoi-mua.json), đối chiếu quy trình và mã hiện tại. **Sai** gồm cả trạng thái sau bước sai; **Không rõ** khi nhật ký thiếu bằng chứng cho một phần quan trọng của `mong_doi`. Nhãn **KỊCH BẢN SAI** bao gồm thiếu tiền đề, chọn sai đối tượng hoặc thiếu phép kiểm.

Bảng dưới chấm **hai nhật ký gốc**; các sửa đổi và lần chạy lại được ghi riêng, không sửa điểm hồi tố.

| Kịch bản | Bước | Kết quả thực tế | Đúng/Sai/Không rõ so với mong_doi + quy-trinh | Nguyên nhân |
|---|---:|---|---|---|
| BAN-02 | 1 | Đăng xoài L2 bị 422 `MAT_HANG_CHUA_XAC_MINH`. | **Sai kỳ vọng đăng thành công; app chặn đúng.** Chưa chuẩn bị nguồn L2 đã được xác minh. | **KỊCH BẢN SAI** |
| BAN-02 | 3 | `http:0`, lỗi đọc `id` của lô chưa được tạo. | **Sai.** Không có báo giá nguồn 2; đây là lỗi trình chạy tiếp tục sau bước phụ thuộc thất bại. | **KỊCH BẢN SAI** |
| BAN-02 | 4 | Chỉ thấy một báo giá được trả xuống 16.500 đ/kg. | **Sai** kỳ vọng “trả giá cả hai”: nguồn 2 chưa tồn tại. | **KỊCH BẢN SAI** |
| BAN-02 | 7 | Nhật ký chỉ ghi đã chờ; chỉ nguồn 1 được đồng ý. | **Sai.** Không đủ tiền đề để có hai hợp đồng: nguồn 2 chưa có báo giá và chưa đồng ý. | **KỊCH BẢN SAI** |
| BAN-02 | 8–9 | Chọn `HD-3001` đang giao, kèm tin nhắn của BAN-01. | **Sai.** Đang kiểm hợp đồng cũ, không phải hợp đồng mới 500 kg của nguồn 1. | **LỖI APP** thiếu liên kết trong API danh sách; **KỊCH BẢN SAI** tự chọn hợp đồng dự phòng |
| BAN-03 | 2 | Tin `z.a.l.o anh Tư: khong chin bay…` lưu nguyên văn. | **Sai.** Lọt liên lạc trước cọc. | **LỖI APP — đã sửa trong mã hiện tại** |
| BAN-03 | 4 | STK thành `••• ••• •••10`. | **Sai.** Che không hết chuỗi tài khoản. | **LỖI APP — đã sửa trong mã hiện tại** |
| BAN-03 | 7 | Đọc lại vẫn thấy STK còn đuôi `10`. | **Sai** với yêu cầu tin có liên lạc phải được che đầy đủ. Sửa bộ quét không tự sửa tin đã lưu. | **LỖI APP**, cùng nguyên nhân bước 4 |
| BAN-04 | 8 | Thiếu kiểm kháng sinh nhưng đợt giao `ready`, hiện “Sẵn sàng giao”. | **Sai nghiêm trọng** trong nhật ký gốc. | **LỖI APP — đã sửa đường kế thừa nhu cầu bằng migration 0079** |
| BAN-05 | 7 | Đơn đã đóng; không ghi số dư lượng của lô. | **Không rõ** phần “lô trả lại lượng”; phần đóng đơn đúng. | **KỊCH BẢN SAI** — thiếu kiểm sổ lượng |
| MUA-02 | 5 | Số toàn chiều rộng được chuẩn hóa nhưng còn `•••·000·510`. | **Sai.** Che chưa hết các nhóm số sau dấu `·`. | **LỖI APP — còn tái hiện ở mã hiện tại** |
| MUA-02 | 7 | Tin đã lưu vẫn còn `000·510`. | **Sai** về bảo vệ liên lạc; giá lời chào vẫn giữ đúng 19.600 đ/kg. | **LỖI APP**, cùng nguyên nhân bước 5 |
| MUA-03 | 9 | Đơn đóng vì quá hạn cọc; có sự kiện hết hạn giữ lượng. | **Không rõ** toàn bộ yêu cầu hoàn tiền và giải phóng lượng: chưa ghi lệnh hoàn, kết quả ngân hàng hoặc số dư lượng. | **KỊCH BẢN SAI** — thiếu bằng chứng kiểm |
| MUA-03 | 10 | Chỉ đọc lại đơn `closed`. | **Không rõ** tiền đang chờ hoàn, đã gửi lệnh hay đã hoàn thành. | **KỊCH BẢN SAI** — không đọc khối tiền |
| MUA-05 | 8 | `xem` chỉ lưu trạng thái nháp, không lưu điều khoản. | **Không rõ** phần “đọc rõ” giá hạ cấp 4.800 đ/kg, thời điểm trả và điểm nhận đã lưu. Payload trình chạy có các giá trị này. | **KỊCH BẢN SAI** — thiếu kiểm điều khoản |
| MUA-05 | 12 | Khoản tiền thành `payer_reported`, nhưng `toi_luot` vẫn yêu cầu **bên mua trả trước bốc**. | **Sai ở hướng dẫn bước tiếp theo.** Lúc này phải chờ người bán kiểm tiền/xác nhận. Việc chưa tính là đã nhận thì đúng. | **LỖI APP** |
| MUA-05 | 16 | Vẫn `preparing`, tới lượt bên mua chỉ định người nhận/đặt xe. | **Sai** khi quy điểm dừng thành “chờ người bán bắt đầu cân”: bước đặt xe đã thất bại do vượt tải. | **KỊCH BẢN SAI**; đối tác ảo cũng chưa có thao tác bắt đầu cân |
| MUA-05 | 17 | Chưa có nghiệm thu, chưa có kết quả hạ cấp hay nghĩa vụ hoàn. | **Không rõ** nhánh hạ cấp 90% và hoàn tiền vượt giá trị. Dừng chưa nghiệm thu là đúng, nhưng chưa kiểm được nhánh tài chính dự kiến. | **KỊCH BẢN SAI / GIỚI HẠN ĐỐI TÁC ẢO** |
| MUA-06 | 18, 20 | Chọn đúng lời chào nhưng đều trả `don:null`. | **Sai** kỳ vọng mở lại hợp đồng tương ứng, dù hai hợp đồng đã được tạo và cọc trước đó. | **LỖI APP** — API danh sách đơn bỏ `offer_id` |
| MUA-06 | 19, 21 | Chỉ xem lời chào, không xem lại hai hợp đồng hoặc khối tiền. | **Không rõ** phép kiểm cuối về hai hợp đồng còn tồn tại, không ghi đè và đủ cọc riêng. Các bước tạo/cọc trước đó có bằng chứng tốt. | **KỊCH BẢN SAI** — phép kiểm cuối không tới đúng đối tượng |
| MUA-07 | 10 | Một hợp đồng đã cọc; không đọc nhu cầu hoặc độ phủ nguồn. | **Không rõ** trạng thái gom ở cấp nhu cầu. Phép tính 1.500 − 1.200 = 300 kg đúng, nhưng chưa phải số thiếu do app tính. | **KỊCH BẢN SAI** — chưa gắn nhu cầu, thiếu kiểm độ phủ |

**Số bước đúng/tổng:**

- Bán: BAN-01 **15/15**; BAN-02 **3/9**; BAN-03 **4/7**; BAN-04 **7/8**; BAN-05 **6/7**; BAN-06 **3/3**.
- Mua: MUA-01 **9/9**; MUA-02 **6/8**; MUA-03 **8/10**; MUA-04 **8/8**; MUA-05 **13/17**; MUA-06 **17/21**; MUA-07 **9/10**; MUA-08 **7/7**.
- **Tổng: 115/139 đúng; 16 sai; 8 không rõ.** Có tính các bước chờ/tua giờ, nên đây không phải tỷ lệ sẵn sàng phát hành.

MUA-05 bước 14 **chặn xe vượt tải là đúng**; MUA-01 chặn đổi giá sau đồng ý và MUA-08 chặn đồng ý quá hạn cũng đúng. MUA-04 đúng ở việc dừng bản nháp trả khi nhận, **chưa kiểm được nhánh trả sau 30 ngày có cam kết ngân hàng**.

Đọc thêm [kết quả chạy lại BAN-04](/home/twictrn/.claude/jobs/d88082d5/tmp/kq-ban04.json): đợt giao giữ ở `preparing`, không còn “Sẵn sàng giao”. Tôi cũng gọi riêng hàm quét thuần trong bộ nhớ: hai mẫu lỗi BAN-03 đã che được; mẫu MUA-02 vẫn lọt đuôi số.

**2. LỖI APP THẬT CẦN SỬA — NẶNG ĐẾN NHẸ**

**① P0 — Kiểm hồ sơ giao hàng chưa thống nhất và chưa đủ phạm vi áp dụng.**

BAN-04 đã được sửa việc mất `demand_id`, nhưng [thẻ sẵn sàng giao](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:87) chỉ kiểm tổ chức, loại giấy, đã xác minh và chưa thu hồi. Nó chưa kiểm hạn, thị trường, mặt hàng hoặc địa điểm. Trong khi đó, [chốt chặn DB](/home/twictrn/agiviet-production-v2/db/migrations/0036_lenh_dieu_phoi_tien_va_thoi_han.sql:298) có kiểm hạn/thị trường nhưng vẫn chưa ràng buộc mặt hàng/địa điểm; riêng kết quả kiểm kháng sinh đang được tìm như giấy chung của tổ chức.

**Sửa:** dùng cùng điều kiện cho thẻ và chốt chặn; kiểm đúng cơ sở, mặt hàng, thị trường và thời hạn giao. Kết quả thử nghiệm phải gắn đúng lô/mẫu được giao. Kiểm thêm các đơn cũ vì [0079](/home/twictrn/agiviet-production-v2/db/migrations/0079_don_ghi_nhu_cau_goc.sql:14) cho phép bỏ qua lỗi điền bù; chưa thể coi mọi đơn cũ đã được sửa.

**② P1 — App mua chưa thực hiện giao dịch thật.**

Hai bộ test gọi backend, không đi qua `frontend/thiet-ke/mua.js`. [App mua](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:35) dùng kho trạng thái cục bộ, danh sách lô/nhu cầu viết sẵn và các bước mô phỏng đối tác/ngân hàng. Vì vậy, kết quả API không chứng minh người thu mua bấm được cùng hành trình trên app này.

**Sửa:** nối một luồng hoàn chỉnh trước: nhu cầu → báo giá → điều khoản → ký → cọc → nhận hàng → thanh toán → quyết toán. Các thao tác phải hiển thị kết quả backend vừa lưu.

**③ P1 — Đề nghị sửa hợp đồng có nút xử lý nhưng điều kiện hiển thị sai.**

Đây là lỗi tìm thêm bằng đọc mã, chưa được hai bộ test bao phủ. [Backend](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/de-nghi.ts:153) trả trạng thái đề nghị `open`, sau đồng ý là `accepted`. [UI](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:596) chỉ hiện nút trả lời khi trạng thái khớp `await|pending|proposed`, và hiện nút ký khi trạng thái chứa `sign`. Hai trạng thái thực đều không khớp.

**Sửa:** xử lý rõ `open`, `accepted` và phiên bản phụ lục chưa có hiệu lực; tốt hơn là backend trả hành động được phép. Kiểm cả hai bên ký và phiên bản điều khoản thực sự đổi.

**④ P1 — Mất liên kết lời chào → hợp đồng, gây chọn sai đơn và trùng hội thoại.**

Bằng chứng trực tiếp: BAN-02 bước 8–9; MUA-06 bước 18–21. Truy vấn có lấy `offer_id`, nhưng [hàm trả danh sách đơn](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:387) bỏ trường này. Trong khi [chat](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/tro-chuyen-that.js:28) và trình chạy dùng nó để nối lời chào với đơn.

**Sửa:** trả quan hệ chính thức trong API; mở đơn bằng ID liên kết. Đồng thời bỏ cách chọn `ds.at(-1)` ở [trình chạy](/home/twictrn/agiviet-production-v2/backend/scripts/chay-kich-ban-ai.mjs:90): không tìm thấy đúng đơn phải dừng, không lấy một hợp đồng khác.

**⑤ P1 — Màn tiền chưa khép kín nghĩa vụ hoàn và dùng sai một số mã trạng thái ngân hàng.**

[Khối tiền hợp đồng](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:254) chỉ liệt kê khoản `buyer_to_seller`; chưa có luồng tương ứng cho người bán báo đã hoàn khoản `seller_to_buyer`. Bảng quyết toán có thể hiện tổng phải hoàn nhưng chưa đủ để thực hiện và theo dõi nghĩa vụ.

Ngoài ra, [bảng nhãn lệnh](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:269) dùng `draft/accepted/settled`, trong khi [DB](/home/twictrn/agiviet-production-v2/db/migrations/0006_tien_nghiep_vu.sql:93) dùng `created/sent/processing/succeeded/reconciled`. Cọc `fully_processed` cũng chưa được map trong màn chi tiết.

**Sửa:** hiện từng khoản phải hoàn, hạn, tài khoản, chứng từ và xác nhận của bên nhận; dùng đúng mã trạng thái. Lệnh hoàn do quá hạn cọc phải hiện ngay cả khi chưa có bản quyết toán.

**⑥ P1 — Bộ che liên lạc vẫn bỏ sót dấu phân cách Unicode.**

MUA-02 bước 5 và 7 còn `000·510`. [Bộ quét](/home/twictrn/agiviet-production-v2/security/lib/lien-lac.mjs:73) có chuẩn hóa chữ số toàn chiều rộng nhưng các mẫu che chưa bao phủ dấu `·`.

**Sửa:** chuẩn hóa nhóm dấu phân cách nhất quán cho cả phát hiện và che; che trọn chuỗi gốc. Kiểm hồi quy cả số điện thoại, STK và các câu giá/kg/ngày hợp lệ để tránh che nhầm.

**⑦ P1 — Chỉ sai người cần làm tiếp sau báo trả trước bốc.**

MUA-05 bước 12: khoản đã `payer_reported` nhưng vẫn giục bên mua trả. [Hàm trạng thái đơn](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:288) kiểm “chưa nhận đủ” mà chưa tách “đã báo chuyển, chờ bên bán xác nhận”.

**Sửa:** phân biệt chưa báo trả → chờ bên mua; đã báo trả → chờ người bán; người bán báo chưa thấy → đối soát. Không dùng chung một lời nhắc cho ba trạng thái.

**⑧ P1 — Một số tiện ích báo thành công dù không lưu nghiệp vụ.**

Ở [ban-them.html](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-them.html:178), các nút “Đã lưu lượng hứa giao”, “Đã xác nhận tiền về”, “Đã báo AgiViet” chỉ chạy hiệu ứng. Đây là vấn đề đáng kể khi đặt cạnh các màn đã nối API thật.

**Sửa:** ghi rõ mô phỏng ngay trên màn và thao tác, hoặc nối nghiệp vụ trước khi báo thành công. Ưu tiên bỏ hiểu nhầm ở xác nhận tiền và cam kết giao.

**⑨ P2 — Giao diện quyết định giao dịch còn chữ nhỏ và nhãn hướng dẫn chưa đủ cụ thể.**

[Thông tin phụ của hợp đồng](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:113) vẫn có nhiều chữ 13–14 px, trong đó có giải thích điều kiện và rủi ro. “Hỗ trợ”, tai nghe trợ lý và nhân viên thật cũng cần được phân biệt rõ tại điểm người dùng cần giúp.

**Sửa:** tăng chữ của lượng, hạn, tiền và hậu quả; đọc thành tiếng phần cần quyết định. Cho mở hỗ trợ gắn sẵn đúng đơn và bước đang vướng.

**Kẽ hở chống ép giá cần chốt riêng:** [backend lập đơn](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:88) chưa có chính sách sàn giá hạ cấp. UI hiện đã cảnh báo và yêu cầu tích riêng, nhưng **MUA-05 chỉ nhắn đề nghị 500 đồng/kg; hợp đồng do trình chạy lập dùng 4.800 đồng/kg**, nên bài này chưa thử việc ký mức 500. Cần chốt cơ chế bảo vệ giá hạ cấp và chứng cứ hạ loại; chưa có căn cứ để tự chọn một sàn bắt buộc 50%.

Tôi không giữ nguyên danh sách lỗi cũ: mã hiện tại đã có cải thiện về tiền nhiều lần, biên nhận tiền mặt, gửi lại OTP, bàn giao bằng mã và bảng quyết toán. Thông báo lỗi DB cụ thể cũng đã có sửa trong `backend/src/loi.ts`; chưa có bằng chứng các thay đổi này đều đã chạy trên backend của nhật ký.

**3. BÁN GỘP — MUA-06, MUA-07, BAN-02**

| Kịch bản | Đã chứng minh được | Chưa chứng minh được |
|---|---|---|
| **MUA-06** | Hai nguồn, hai hợp đồng: 1.200 + 800 = **2.000 kg**, cùng 24.000 đ/kg. Hai khoản cọc riêng **8.640.000 + 5.760.000 đồng** được nhận và kích hoạt hai đơn. | Chưa gắn với dòng NC-3001; chưa có phép kiểm độ phủ nhu cầu; mở lại đơn lỗi; chưa giao, nghiệm thu hoặc quyết toán từng nguồn. |
| **MUA-07** | Một hợp đồng **1.200 kg L2**, cọc riêng đúng phần đã ký. Không biến L1 thành L2 hoặc thu cọc cho phần chưa có hợp đồng. | “Còn 300 kg” là phép tính của bài test. L-0413 ban đầu có 1.500 kg, nên chưa thể kết luận thiếu 300 kg hàng vật lý; điều được biết là chưa có nguồn L2 thứ hai được chốt. |
| **BAN-02** | Nguồn 1 báo giá và đồng ý giữ **500 kg**. | Nguồn 2 không đăng được lô, không báo giá; không kiểm được hai hợp đồng. Ngay cả kế hoạch 500 + 600 cũng chỉ **1.100/1.500 kg**, còn thiếu 400 kg so với NC-3002. |

Theo [nhánh `nhieu-trang-trai`](/home/twictrn/agiviet-production-v2/docs/mo-phong-quy-trinh/quy-trinh.json:6955), mô hình đúng là **một mục tiêu mua, nhiều hợp đồng riêng**, cọc/nghiệm thu/trả tiền riêng; có thể điều phối một xe ghé nhiều vườn. AgiViet tổ chức nguồn và điều phối, không mặc định mua hàng vào rồi bán lại.

**Backend đã có nền cho định kỳ**, gồm thỏa thuận tìm nguồn, chốt ngày, đề xuất/duyệt/cam kết nguồn, báo thiếu và [API độ phủ](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/ban-23.ts:77). Vì vậy, không đúng nếu kết luận “backend chưa hỗ trợ bán gộp”. Nhưng ba bài trên chưa kiểm các nghiệp vụ này; [Kế hoạch mua trên UI](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:845) vẫn hiện số viết sẵn.

Để dùng thật còn cần:

- **Nối xuyên suốt:** nhu cầu/ngày cần → dòng hàng → nguồn/lô → lời chào → hợp đồng → đợt giao.
- **Bảng gom thật:** cần, đang thương lượng, đã cam kết, đủ điều kiện giao, đã nhận đạt, còn thiếu. Không cộng gợi ý hoặc báo giá thành hàng đã có.
- **Điều kiện từng nguồn:** đúng loại, lịch, hồ sơ, kết quả lô; cùng loại không mặc nhiên thay thế được nhau.
- **Điều phối và xử lý thiếu:** tuyến ghé vườn, tải xe, nguồn dự phòng, xin duyệt thay loại/giá/giờ; nguồn giao đúng vẫn tiếp tục.
- **Định kỳ theo ngày:** hạn chốt, lịch nhiều kỳ, công nợ và hạn trả riêng từng người bán; tranh chấp một nguồn không khóa các nguồn khác.

**4. ĐÁNH GIÁ TOÀN THỂ BỐ TRÍ / LOGIC / ĐỘ GỌN**

Điểm dưới đây dựa trên mã hiện tại và ảnh có sẵn trong repo; chưa phải thử trực tiếp với nông dân hoặc kiểm lại bố cục trên thiết bị thật.

| Mục | Điểm /10 | Nhận xét |
|---|---:|---|
| **Luồng chính** | **6,5** | Phân biệt đồng ý giá, ký, cọc và giao nhận khá rõ; BAN-01 cho thấy backend đi được xa. Liên kết đơn, phụ lục và một số chỉ dẫn lượt còn làm đứt hành trình. |
| **Nhắn tin + chặn liên lạc** | **6,5** | Chat thật gắn lời chào/hợp đồng, lưu bằng chứng và mở liên lạc sau cọc là nền tốt. Còn lọt dấu `·`, thiếu liên kết để gom hội thoại và chưa thể coi bộ quét là chống lừa hoàn chỉnh. |
| **Tiền + cọc** | **6** | Tách ngân hàng giữ cọc, bên mua báo chuyển và người bán xác nhận là đúng. Hoàn tiền, mã trạng thái ngân hàng và bằng chứng quyết toán cuối còn thiếu hoặc lệch. |
| **Hỗ trợ + hướng dẫn** | **7,5** | Tour hiện tại đã có Nghe, chọn cỡ chữ, bỏ qua và xem lại; tiến bộ so với đánh giá trước. Cần phân biệt hỏi trợ lý với nhờ nhân viên, và đưa hỗ trợ tới đúng đơn đang vướng. |
| **An toàn chống ép giá/lừa** | **5,5** | Có giá kín, chặn giá dưới mức nhận, khóa sửa giá sau đồng ý và hạn phản hồi. Hồ sơ đúng lô, giá hạ cấp, chứng cứ hạ loại và chống hiểu nhầm tiền vẫn cần tăng bảo vệ. |
| **Giao diện cho nông dân** | **7,5** | Trang chủ có việc chính, nút vàng nổi, năm mục dưới và hình trâu giúp nhận biết; khoảng cách, màu sắc khá nhất quán. Màn giao dịch còn nhiều chữ nhỏ và điều kiện phải đọc liên tiếp. |
| **App mua** | **4** | Bố cục desktop, bảng so giá và nhóm công việc phù hợp nghề thu mua; riêng thiết kế khoảng **8/10**. Điểm sử dụng thực tế thấp vì các hành động chính vẫn chạy dữ liệu mô phỏng. |
| **Độ gọn, nhất quán** | **6** | Hệ hình ảnh và thành phần khá thống nhất. Nhiều tiện ích, số mẫu và hai cơ chế trạng thái thật/mô phỏng khiến người dùng khó biết việc nào đã được thực hiện. |

**Năm việc nên làm tiếp quan trọng nhất:**

1. **Khép điều kiện an toàn giao:** hồ sơ đúng nguồn/lô/hạn, hồi quy BAN-04 và che trọn các mẫu liên lạc còn lọt.
2. **Sửa các điểm đứt hợp đồng–tiền:** liên kết lời chào/đơn, trạng thái phụ lục, lượt xác nhận tiền, khoản phải hoàn và trạng thái ngân hàng.
3. **Nối app mua vào backend cho một hành trình hoàn chỉnh**, đi từ tìm hàng tới quyết toán qua giao diện hai bên.
4. **Làm bảng gom nguồn thật cho một nhu cầu**, sau đó chạy nhiều ngày bằng các API tìm nguồn định kỳ đã có.
5. **Chạy lại kiểm thử với bằng chứng đầy đủ:** đúng ID, điều khoản, sổ lượng, khoản tiền, lệnh ngân hàng và độ phủ; đồng thời thử tác vụ với nông dân đọc chậm để giảm chữ và thao tác ở các màn quyết định.

