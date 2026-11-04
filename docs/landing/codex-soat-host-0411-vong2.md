**1. Truy cập trực tiếp được không?**

**Không truy cập được từ môi trường kiểm tra này.** `curl` tới cả ba tên miền đều báo `Could not resolve host`; công cụ web dự phòng cũng không mở được. Điều này **không chứng minh website đang ngừng hoạt động**.

Kết quả dưới đây là đối chiếu mã hiện tại với vòng 1 và E149–E157, kèm giả lập. Chưa xác nhận bản deploy trùng repo; chưa kiểm được giao diện, micro, âm thanh và OTP trên thiết bị thật.

Tôi không sửa tệp repo, không tạo đơn/giao dịch, **không gọi `/v1/tts` lần nào**. Kiểm tra cú pháp đạt 47 khối JavaScript/module và hai tệp Python; **31 kiểm thử AI thuần đạt**. Kiểm HTTP FastAPI trong sandbox chưa hoàn tất; các nhánh hàng đợi được kiểm thêm bằng gọi hàm trực tiếp.

**2. Kiểm lại 16 lỗi**

“Đạt” dưới đây nghĩa là đạt trong phạm vi mã đã kiểm. **9 đạt; 7 chưa khép hết các trường hợp.**

| Mã lỗi | Đạt/chưa | Ghi chú |
|---|---|---|
| N1 | **Đạt** | [khung-dt.html:30](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/khung-dt.html:30): chuẩn hóa URL, kiểm origin và đường dẫn. Giả lập chặn được `/\example.org`, URL ngoài, lồng khung và đường dẫn thoát thư mục. |
| N2 | **Chưa hết** | [chung.js:111](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:111): hủy Audio đang phát trả `false` đúng. Nhưng toàn bộ việc hủy phụ thuộc bọc `speechSynthesis.cancel`; khi không có API này, giả lập hai lượt đọc tạo **hai Audio không bị dừng**. Yêu cầu TTS đang chờ cũng chưa được abort. |
| N3 | **Chưa hết** | [mua-app.js:197](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:197): đã thêm dòng chờ xác nhận. Tuy nhiên khoản 1 triệu `payer_reported` vẫn cho **“Bạn còn phải trả 0 đ”**; ô Hôm nay tại dòng 119 cũng bỏ khoản này. Nên tách “công nợ chưa xác nhận tất toán” và “cần chuyển thêm”. |
| V1 | **Chưa hết** | [chung.js:134](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:134): lỗi Audio đã chuyển sang giọng máy đúng; không có giọng đã kết thúc Promise. Nhưng Audio không phát `ended/error` thì **không có timeout**, `docTo()` vẫn treo. Timeout của `noiRa()` lại trả `true` mà không dừng Audio. |
| V2 | **Chưa hết** | [nha_cung_cap.py:87](/home/twictrn/agiviet-production-v2/ai/agiviet_ai/nha_cung_cap.py:87): đã thêm 6 giây/mô hình, ngân sách 12 giây; backend 14 giây, app 15 giây. Nhưng [dich_vu.py:173](/home/twictrn/agiviet-production-v2/ai/agiviet_ai/dich_vu.py:173) chưa gom yêu cầu đang chạy hay giới hạn TTS riêng theo tài khoản. Giả lập hai câu giống nhau đồng thời vẫn gọi nhà cung cấp **hai lần**. |
| V3 | **Đạt** | [ban-dang-bai.html:268](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:268): thước giá dùng `thuoc-gia`; nhóm trả lời thuốc giữ `thuoc`; bộ chọn đã cập nhật đúng. |
| V4 | **Đạt** | [dich_vu.py:159](/home/twictrn/agiviet-production-v2/ai/agiviet_ai/dich_vu.py:159): chờ slot tối đa 4 giây; câu lừa/ngoài lề trả ngay. Kiểm trực tiếp với slot bị giữ đạt. Chưa đo thời gian toàn yêu cầu trên host. |
| V5 | **Chưa hết** | [khung-dt.html:35](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/khung-dt.html:35): polling 0,5 giây xử lý được đổi hash/tab. Nhưng `anToan()` **không nhận `mua.html`**, trong khi app mua mở đơn/khung tại đó. Địa chỉ khung dừng đồng bộ khi vào màn sâu; tải lại mất màn đang xem. |
| V6 | **Chưa hết** | [chung.js:169](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:169): token lưu sẵn và header object thông thường được xử lý đúng. Nhưng token tạo bằng `?thu` **không được lưu** ở `phien()`/`layPhien()`, nên wrapper không nhận diện được phiên này. `Headers`/`Request` cũng chưa được đọc đúng; cờ chặn tải lại tự xóa sau 8 giây. |
| V7 | **Đạt** | [mua-app.js:254](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:254): giả lập lỗi cả hai API chi tiết cho thông báo “chưa tải được…” và nút Tải lại, không còn giả thành `0 kg`. Lỗi tương tự tại Hôm nay được ghi riêng bên dưới. |
| V8 | **Đạt** | [index.html:476](/home/twictrn/agiviet-production-v2/frontend/index.html:476): đã phân biệt ngân hàng hoàn cọc với người bán hoàn tiền hàng trả thẳng thừa; khớp nhánh hoàn trong app bán. |
| V9 | **Đạt** | [index.html:564](/home/twictrn/agiviet-production-v2/frontend/index.html:564): cả đổi gói và lần tải đầu đều qua `cuaVao()`, giữ đúng tên miền app. |
| V10 | **Đạt theo mã** | [ban-dang-bai.html:284](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:284): input ảnh dùng `.an-tg`, không còn `hidden`; có viền focus trên label. Ô gõ đã nối `aria-labelledby`. Chưa thử bộ chọn ảnh bằng bàn phím thật. |
| V11 | **Chưa hết** | [chung.js:480](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:480): inert nền, vòng Tab, hủy micro và `henChao` đã có. Nhưng **không hủy yêu cầu trợ lý đang chờ**. Giả lập đóng hộp trước khi phản hồi tới vẫn phát câu trả lời muộn một lần. |
| L1 | **Đạt ở mua-app** | [mua-app.js:279](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:279): chọn loại theo `grades`, nhãn qua `tenLoai()`, gửi mã gốc; đổi sản phẩm cập nhật loại trước handler lấy giá. |
| L2 | **Đạt theo mã** | [so-vuon.css:300](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/so-vuon.css:300): viền xanh đậm trên nền sáng, vàng sáng trên nền xanh. Chưa đo ảnh render thật. |

Phần cuộn tại [chung.js:261](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:261) có cập nhật `.da-cuon` và `--tien`, giới hạn tiến độ trong khoảng 0–1 và gom cập nhật bằng `requestAnimationFrame`. Chưa thấy lỗi tính toán trong nhánh này; chưa kiểm được hiệu ứng thực tế.

**3. Lỗi MỚI**

Các lỗi sau được phát hiện trong mã; trường hợp đã tái hiện đều dùng dữ liệu giả lập.

| Mức | Ở đâu | Thấy gì | Vì sao | Cách sửa |
|---|---|---|---|---|
| **NẶNG — M1** | [ban-dang-bai.html:652](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:652), dòng 614 | **“Có xịt nhưng không nhớ ngày”**, **“Không phải, tôi có xịt hôm qua”** đều bị hiểu thành `thuoc: "khong"` rồi tự xác nhận. Đã tái hiện. | Chỉ cần câu chứa “không/chưa” là ưu tiên kết luận không xịt, bất kể phần còn lại. Làm sai xác nhận an toàn trong luồng đăng bài. | Chỉ nhận câu phủ định rõ, ngắn; câu có cả khẳng định/phủ định phải hỏi lại. Yêu cầu người dùng xác nhận kết quả về thuốc trước khi đi tiếp. |
| **NẶNG — M2** | [mua.js:1047](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1047), [so-lam-an.js:68](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/so-lam-an.js:68), [mua-that.js:6](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-that.js:6) | Mở bằng `?thu=0909000213` trong tab chưa lưu token → vào màn sâu → các liên kết như **“mở đơn để bạn ký trước”**, Đơn, Nguồn làm mất `thu`. Giả lập cho **`THAT=true → false`**, chuyển sang dữ liệu mẫu. | Liên kết chỉ dựng `?man=…`; phiên thử chưa được lưu. Cờ dữ liệu thật tính lại khi tải trang. Đây là chỗ có thể đứt luồng chấm thi dù thao tác trước đó thành công. | Lưu token phiên thử khi nhận được; giữ tham số qua mọi liên kết/redirect. Có định danh đơn thật mà thiếu phiên thì yêu cầu đăng nhập, không chuyển sang dữ liệu mẫu. |
| **VỪA — M3** | [ban-hom-nay.html:171](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hom-nay.html:171), dòng 179 | Nút **“Làm ngay”** và **“Đăng hàng”** hiện nhưng không có hành động. | Chỉ nhánh “Xem chào giá” được gắn `onclick`; nút HTML không có hành vi mặc định. | “Làm ngay” mở hợp đồng đầu tiên tới lượt bác; “Đăng hàng” mở đăng bài và giữ phiên thử. |
| **VỪA — M4** | [mua-app.js:333](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:333) | API impersonate lỗi mạng khi khởi động làm app dừng ở **“Đang mở sổ mua…”**, không có nút thử lại. Đã giả lập. | `await layPhien()` nằm **ngoài `try`**; lỗi thoát khỏi toàn bộ hàm khởi động. | Đưa lấy phiên vào `try`; đóng splash và hiện lỗi mạng cùng nút thử lại. |
| **VỪA — M5** | [mua-app.js:83](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:83) | Hôm nay: chi tiết nhu cầu lỗi nhưng đơn tải được thì ô Tuần này chỉ hiện **“đã chắc 500 kg”**, mất phần cần/thiếu và không báo lỗi. Đã tái hiện. | `veDuThieu()` bỏ qua kết quả `null`, biến dữ liệu chưa tải thành không có nhu cầu. Sửa V7 chưa phủ nhánh này. | Theo dõi nhu cầu/đơn chưa tải đủ; hiện “chưa tính đủ”, cho tải lại và chỉ kết luận đủ/thiếu khi đủ dữ liệu. |
| **VỪA — M6** | [ban-dang-bai.html:765](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-dang-bai.html:765), [migration:142](/home/twictrn/agiviet-production-v2/db/migrations/0012_thi_truong_su_kien.sql:142) | Tạo nháp thành công → gửi ảnh thất bại → quay lại sửa lượng/giá → Đăng bán lại vướng **`IDEMPOTENCY_CONFLICT`**. Giả lập frontend và đối chiếu luật DB xác nhận nhánh này. | Luôn gọi lại tạo lô bằng `khoa.tao` cũ nhưng nội dung đã đổi; DB từ chối cùng khóa khác nội dung. | Giữ ID/revision của nháp đã tạo; các lần sau cập nhật nháp đó và tiếp tục gửi ảnh/đăng. Giữ khóa riêng cho từng thao tác không đổi nội dung. |

Chưa ghi nhận thêm lỗi mới mức **NHẸ** đủ bằng chứng để đưa vào bảng.

**4. Sáu việc nên sửa trước buổi thi**

1. **Khép luồng mua bằng `?thu`**: lưu phiên, giữ tham số qua liên kết/redirect, cho khung đồng bộ `mua.html`; bắt lỗi lấy phiên lúc khởi động.
2. **Sửa nhận câu trả lời về thuốc**, thêm xác nhận rõ trước khi cho đăng.
3. **Khép luồng bán**: gắn nút “Làm ngay”/“Đăng hàng”; sửa tiếp tục đăng từ lô nháp sau lỗi ảnh.
4. **Hoàn tất đọc–dừng–nghe**: hàm hủy độc lập với `speechSynthesis`, timeout Audio có dừng thật; đóng trợ lý phải hủy/bỏ phản hồi đang chờ.
5. **Sửa cách trình bày công nợ và dữ liệu thiếu**: tổng chưa tất toán vẫn phải thấy; Hôm nay không kết luận từ nhu cầu tải lỗi.
6. **Gom TTS đồng thời và giới hạn lượt**, tránh nhiều giám khảo hỏi cùng câu làm tiêu hạn mức lặp.

