Đã rà 4 commit chỉ định, không sửa tệp repo. Các kiểm tra bổ sung chạy trên CSDL trong bộ nhớ và giao diện dùng dữ liệu giả ở 360/390px; chưa phải kiểm thử toàn luồng trên hệ thống thật. Có **18 lỗi**:

1. **Nặng — Quyết toán tạm giải phóng sai hạn mức cọc.**  
   **Tệp:dòng:** [0020_lan_goi_nhieu_mat_hang.sql:69](/home/twictrn/agiviet-production-v2/db/migrations/0020_lan_goi_nhieu_mat_hang.sql:69), được dùng tại [khung.ts:117](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/khung.ts:117).  
   **Kịch bản:** Buổi chưa quyết toán cuối có quyết toán tạm → điều kiện `NOT EXISTS(settlements)` loại toàn bộ giá trị buổi khỏi phần dự phòng, chỉ giữ số N tạm. Đã tái hiện hạn mức đang dùng **230.000đ → 0đ**. Gọi thêm hàng có thể khiến nghĩa vụ thực vượt cọc.  
   **Sửa:** Giữ dự phòng phần chưa quyết toán cuối, trừ đúng phần đã ghi nhận công nợ.

2. **Nặng — Lô bị khóa an toàn vẫn được giao.**  
   **Tệp:dòng:** [giao-nhan.ts:79](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:79), [0081_mot_dot_nhieu_chuyen_xe.sql:36](/home/twictrn/agiviet-production-v2/db/migrations/0081_mot_dot_nhieu_chuyen_xe.sql:36).  
   **Kịch bản:** Gọi hàng xong, một lô trong buổi bị khóa an toàn → đơn khung có `o.lot_id=NULL`, nên cả thẻ sẵn sàng và chốt chặn DB bỏ qua lô đó. Đã tái hiện delivery chuyển sang `ready` khi lô vẫn bị khóa.  
   **Sửa:** Kiểm tra và khóa tất cả lô trong `order_lines`.

3. **Nặng — Không nghiệm thu được buổi gọi hàng trên app mua.**  
   **Tệp:dòng:** [mua.js:1195](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1195), [giao-nhan.ts:220](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:220).  
   **Kịch bản:** Mở buổi từ màn khung → nhập cân → gửi kết quả. UI không gửi `order_line_no`, trong khi backend bắt buộc trường này cho **mọi** `framework_calloff`, kể cả một món → bị từ chối. UI còn hiện giá chung tượng trưng **1đ/kg**.  
   **Sửa:** Render nghiệm thu theo từng dòng món và gửi đúng số dòng, lượng, giá tương ứng.

4. **Nặng — Cân thiếu dù rất ít cũng không chốt được buổi.**  
   **Tệp:dòng:** [giao-nhan.ts:336](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:336), [0045_lenh_giao_nhan_bo_sung_va_dong_khung.sql:37](/home/twictrn/agiviet-production-v2/db/migrations/0045_lenh_giao_nhan_bo_sung_va_dong_khung.sql:37).  
   **Kịch bản:** Gọi 30kg, thực cân 29,9kg → dung sai khung bằng 0 nên backend yêu cầu chọn xử lý thiếu. Chọn kết thúc/giao bù/bất khả kháng đều đi vào `resolve_shortfall`, nhưng command này từ chối mọi đơn có `framework_id` → không thể hoàn tất buổi và quyết toán tuần.  
   **Sửa:** Bổ sung xử lý thiếu cho khung theo từng lô/món.

5. **Nặng — Có hàng trả lại tại vườn làm thao tác đồng ý nghiệm thu lỗi và rollback.**  
   **Tệp:dòng:** [giao-nhan.ts:346](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:346), [giao-nhan.ts:374](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:374).  
   **Kịch bản:** Buổi khung có một phần `rejected`, người bán đồng ý → `taoLoConTraLai` tìm lô cha bằng `o.lot_id=NULL`, rồi đọc `cha.id` → lỗi.  
   **Sửa:** Gom phần trả theo `acceptance_lines.lot_id`, tạo/xử lý lô trả riêng cho từng lô nguồn.

6. **Nặng — Có thể kéo dài hạn trả bằng cách chốt tuần muộn.**  
   **Tệp:dòng:** [0085_ky_tuan_theo_ngay_giao.sql:18](/home/twictrn/agiviet-production-v2/db/migrations/0085_ky_tuan_theo_ngay_giao.sql:18).  
   **Kịch bản:** Tuần đã kết thúc, nhưng tới thứ Sáu mới bấm chốt khoản → hạn trả thành thứ Hai kế tiếp vì dùng `clock_at()+72 hours`, thay vì 72 giờ sau cuối kỳ. Không gọi chốt thì chưa có khoản phải trả.  
   **Sửa:** Tính hạn từ `upper(p_period)` và tự lập khoản khi tuần đủ điều kiện quyết toán.

7. **Nặng — Người bán đề nghị giá dưới ngưỡng 70% không cần xác nhận riêng.**  
   **Tệp:dòng:** [khung.ts:143](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/khung.ts:143), [khung.ts:152](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/khung.ts:152).  
   **Kịch bản:** Người bán đề nghị giá 23.000đ, xuống loại 1.000đ → bên mua đồng ý → bảng giá thành `agreed`, không có xác nhận riêng của người bán. Chốt chặn hiện chỉ áp khi **người bán trả lời** đề nghị. Đã tái hiện ở DB.  
   **Sửa:** Bắt xác nhận riêng cả lúc người bán đề nghị giá thấp và lưu dấu xác nhận.

8. **Vừa — Mã giao dịch trùng vẫn được cộng tiền nhiều lần.**  
   **Tệp:dòng:** [tien.ts:195](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/tien.ts:195), [0006_tien_nghiep_vu.sql:283](/home/twictrn/agiviet-production-v2/db/migrations/0006_tien_nghiep_vu.sql:283).  
   **Kịch bản:** Khoản tuần có `order_id=NULL` → kiểm tra trùng bằng `order_id=$1` không tìm thấy; UNIQUE cũng cho phép nhiều NULL. Đã tái hiện ba xác nhận cùng `SAME-REF`, tổng 230.000đ, khoản vẫn thành `fully_received`.  
   **Sửa:** Chống trùng theo phạm vi khoản/khung và tài khoản nhận, có ràng buộc DB tương ứng.

9. **Vừa — Hết 72 giờ không chuyển khoản tuần sang quá hạn.**  
   **Tệp:dòng:** [0085_ky_tuan_theo_ngay_giao.sql:17](/home/twictrn/agiviet-production-v2/db/migrations/0085_ky_tuan_theo_ngay_giao.sql:17).  
   **Kịch bản:** Lập khoản tuần rồi không trả → chỉ có `due_at`, không tạo deadline `direct_payment_due` để bộ xử lý hạn chuyển trạng thái. Đã kiểm tra khoản mới có **0 deadline trả tiền**.  
   **Sửa:** Tạo deadline cùng transaction lập khoản; xử lý đóng deadline khi nhận đủ.

10. **Vừa — Màn trả tiền tuần không cung cấp tài khoản để chuyển.**  
    **Tệp:dòng:** [mua.js:1562](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1562), [truy-van.ts:57](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/truy-van.ts:57).  
    **Kịch bản:** Khoản tuần tới hạn → màn chỉ cho tải biên lai và báo đã chuyển, không hiện tài khoản nhận. Gọi API hướng dẫn thanh toán hiện có cũng không tìm thấy vì INNER JOIN với đơn, trong khi khoản tuần không có `order_id`.  
    **Sửa:** Hỗ trợ hướng dẫn thanh toán theo `framework_terms`, hiển thị tài khoản đã chốt trong khung.

11. **Vừa — Luồng tiền tuần không xử lý được nhận thiếu.**  
    **Tệp:dòng:** [ban-khung.html:109](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-khung.html:109), [ban-khung.html:112](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-khung.html:112), [mua.js:1567](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1567).  
    **Kịch bản:** Phải trả 1 triệu nhưng thực nhận 600.000đ → người bán chỉ có nút xác nhận đủ 1 triệu. Nếu xác nhận một phần qua API, trạng thái `partially_received` khiến app mua mất nút báo trả bổ sung, app bán mất nút xác nhận.  
    **Sửa:** Cho nhập số thực nhận; hiển thị phần còn thiếu và thao tác tiếp tục theo số dư.

12. **Vừa — API “chưa nhận tiền” hỏng với khoản tuần.**  
    **Tệp:dòng:** [tien.ts:222](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/tien.ts:222).  
    **Kịch bản:** Bên mua báo chuyển nhưng người bán chưa thấy tiền → gọi `/payments/:id/not-received`. Hàm vẫn tìm phía người dùng qua `core.orders` với `p.order_id=NULL` → không xác định được login để gọi command.  
    **Sửa:** Lấy phía từ khung khi khoản không gắn đơn, như `phiaKhoan` và `baoDaTra`.

13. **Vừa — Người bán không đọc được PDF khung do bên mua lập.**  
    **Tệp:dòng:** [v1.ts:343](/home/twictrn/agiviet-production-v2/backend/src/routes/v1.ts:343), [v1.ts:360](/home/twictrn/agiviet-production-v2/backend/src/routes/v1.ts:360).  
    **Kịch bản:** Người bán lấy `document_id` của chính khung mình tham gia rồi mở metadata/PDF → bị từ chối vì tài liệu không có `order_id`, còn `owner_org_id` là bên mua. Chứng từ thanh toán gắn khung cũng gặp vấn đề chia sẻ tương tự.  
    **Sửa:** Với tài liệu `entity='framework'`, kiểm tra hai bên tham gia khung.

14. **Vừa — Không đề nghị được tuần giảm giá thấp hơn giá xuống loại ban đầu.**  
    **Tệp:dòng:** [mua.js:1535](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1535).  
    **Kịch bản:** Khung ban đầu giá 23.000đ, xuống loại 15.000đ. Tuần mới muốn giá 14.000đ, xuống loại 9.000đ → UI chỉ cho sửa giá chính và luôn gửi xuống loại 15.000đ → DB từ chối, tuần không chốt được.  
    **Sửa:** Cho sửa cả giá xuống loại của từng tuần, kèm xác nhận 70% tương ứng.

15. **Vừa — Lập khung trùng món được nhưng sau đó không gọi hàng được.**  
    **Tệp:dòng:** [mua.js:1468](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1468), [0084_gia_khung_chot_moi_tuan.sql:85](/home/twictrn/agiviet-production-v2/db/migrations/0084_gia_khung_chot_moi_tuan.sql:85).  
    **Kịch bản:** Bấm “Thêm món”, giữ hai dòng cùng sản phẩm/loại → lập khung và đề nghị giá tuần đều được. Khi gọi hàng, truy vấn lấy giá cho lô trả về hai dòng trong biểu thức scalar → lỗi, không tạo được buổi.  
    **Sửa:** Gộp hoặc từ chối món trùng theo sản phẩm–phiên bản–loại trước khi ký.

16. **Vừa — Ô giá quá hẹp để kiểm tra số tiền trên điện thoại.**  
    **Tệp:dòng:** [mua.js:1450](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1450).  
    **Kịch bản:** Mở lập khung ở 360/390px → vẫn giữ năm cột trên một hàng. Đo thực tế ô giá rộng khoảng **43/49px**, phần chứa chữ chỉ **17/23px**; giá `23000` chỉ thấy khoảng 1–2 chữ số.  
    **Sửa:** Chuyển dòng món thành nhiều hàng ở màn nhỏ; dành đủ chiều rộng cho lượng và giá.

17. **Vừa — Nhãn tiền tuần bên bán làm hỏng bố cục 360–390px.**  
    **Tệp:dòng:** [ban-khung.html:108](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-khung.html:108).  
    **Kịch bản:** Khoản ở `payer_reported` → nhãn “Bên mua báo đã chuyển · tới lượt bác” không xuống dòng, hàng flex không wrap. Đã đo phần ngày/số tiền bị ép còn **71px**, cao **120px**; ở 360px nội dung còn tràn ngang.  
    **Sửa:** Cho hàng wrap hoặc đặt nhãn trạng thái xuống hàng riêng.

18. **Vừa — Nhập kg thập phân bị đổi thành lượng lớn gấp 10 lần.**  
    **Tệp:dòng:** [mua.js:1456](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1456), [mua.js:1469](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1469).  
    **Kịch bản:** Nhập `12,5` hoặc `12.5` kg mỗi buổi → `replace(/\D/g,"")` biến thành `125` → lập khung 125kg và tính cọc theo lượng sai.  
    **Sửa:** Parse số thập phân riêng cho kg; nếu chỉ cho số nguyên thì báo lỗi, không âm thầm xóa dấu.