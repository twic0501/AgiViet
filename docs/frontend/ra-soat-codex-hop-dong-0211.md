# Codex rà soát màn Hợp đồng người bán (02/11/2026)

Đã đọc hai màn, backend, brief V1, tài liệu tổng hợp `index.html` và bài test. **Chưa đủ để dùng trọn luồng thật.** Không sửa file; không chạy E2E vì test dựng lại dữ liệu demo và ghi ảnh.

1. **Nặng — [ban-don.html:332](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:332): Xác nhận tiền lần sau sai số.** `reported_vnd` là **tổng mọi lần báo chuyển**, nhưng nút “Đã nhận đủ” gửi nguyên tổng đó như khoản nhận mới. Ví dụ đã nhận 20 triệu, mua báo thêm 12,2 triệu: màn gửi 32,2 triệu và bị backend chặn. **Sửa:** hiện Phải nhận / Đã xác nhận / Còn thiếu; xác nhận đúng khoản mới, phân biệt “nhận đủ lần chuyển” với “đủ nghĩa vụ”.

2. **Nặng — [ban-don.html:327](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:327): Tiền mặt không thể hoàn thành.** UI gửi `method: "cash"` nhưng không có bước tải biên nhận và không gửi `receipt_document_id`; [tien.ts:187](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/tien.ts:187) bắt buộc ảnh biên nhận hai bên ký. **Sửa:** bổ sung chụp/tải biên nhận trước OTP, gửi ID chứng từ.

3. **Nặng — [ban-don.html:122](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:122): Khóa chống lặp đổi mỗi lần thử lại; OTP dễ mắc kẹt.** Backend chỉ trả lại kết quả cũ khi giữ nguyên khóa. Hơn nữa, OTP được xác minh trong giao dịch riêng: lệnh nghiệp vụ thất bại sau đó thì OTP cũ vẫn không dùng lại được. UI không có gửi lại mã. **Sửa:** giữ khóa và payload cho cùng thao tác; tra lại trạng thái khi mất phản hồi; cho cấp OTP mới khi hết hạn/đã dùng.

4. **Nặng — [ban-don.html:309](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:309), [ban-don.html:338](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:338): Có race và nhấn lặp.** Khi có ảnh chứng từ, màn chờ tải ảnh rồi mới gắn sự kiện; đóng màn trong lúc chờ làm `r(...)` thành `null`. Nút “Tiếp tục” nhận thiếu cũng không khóa khi xin OTP; các nhánh đủ/thiếu/chưa nhận có thể chạy chồng. **Sửa:** gắn sự kiện ngay, khóa toàn bộ lựa chọn khi gửi, dùng tham chiếu riêng cho từng tấm và hủy tác vụ khi đóng.

5. **Nặng — [ban-don.html:236](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:236): Tấm ký thiếu các cam kết quyết định.** Không nêu rõ mặt hàng/loại, ngày giao, ai lo xe, mốc chuyển rủi ro, giá hạ cấp và số trả thẳng theo thời điểm; phần lớn chỉ nằm trong điều khoản đang gập. Đơn có `gia_bat_thuong` còn bị chặn vì UI không gửi `abnormal_price_ack` mà [don.ts:223](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:223) yêu cầu. **Sửa:** tóm tắt đủ O4 bằng số thật, hiện phiên bản/bản đầy đủ và xác nhận riêng giá bất thường.

6. **Nặng — [ban-don.html:137](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:137), [ban-don.html:197](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:197): Người bán không thực hiện được bàn giao.** Backend trả `start_check`/`dispatch`, nhưng màn chỉ xử lý ký, tiền, cân. Không có quét QR/nhập sáu số, tên người nhận, biển số/chuyến xe hay thao tác xuất hàng. **Sửa:** nối các hành động backend, hiển thị người nhận và chuyến, xác minh mã/biển số trước giao; bổ sung hồ sơ bốc hàng theo G2–G4.

7. **Nặng — [ban-don.html:159](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:159): Thiếu đề nghị sửa và hủy.** Backend đã trả `cancel`, `request_cancel`, cờ đề nghị/hủy; UI chỉ có “Không ký”. Thậm chí cam kết bảo “báo qua nút Đề nghị” nhưng không có nút. **Sửa:** hiện đề nghị đang chờ, nội dung cũ → mới, hạn và phản hồi; thêm hủy đúng giai đoạn với bảng hậu quả hàng/cọc/tiền trả thẳng theo O3, X2–X6.

8. **Nặng — [ban-don.html:183](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:183): Thiếu quyết toán và nghĩa vụ hoàn tiền.** Màn bỏ toàn bộ khoản `seller_to_buyer`, `quyet_toan`, `lenh_ngan_hang` mà API đã trả. Người bán có thể đang phải hoàn nhưng không thấy số hoặc cách làm; cũng không biết cọc đang gửi lệnh hay đã về. **Sửa:** dựng bảng T1–T3, tách phải hoàn/đã hoàn/bên mua xác nhận và tiến trình ngân hàng.

9. **Nặng — [ban-don.html:367](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:367): Xử lý thiếu hàng chưa đủ dữ liệu.** “Bất khả kháng” không có tải chứng cứ nên DB từ chối; “Giao bù” không hỏi lịch, backend tự đặt sau 24–30 giờ; “Kết thúc” không hiện số phạt trước ký. **Sửa:** thu chứng cứ, chọn lịch bù và xem tiền phạt; gửi đủ dữ liệu, rồi hiện đợt bù/nghĩa vụ còn lại.

10. **Nặng — [ban-don.html:380](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:380), [giao-nhan.ts:353](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:353): “Mời kiểm định” chưa thực hiện đúng lời nút.** Backend chỉ xử lý riêng `rut_phan`; `kiem_dinh` và `chia_lai` cùng mở tranh chấp chung, không tạo yêu cầu kiểm định tương ứng. PIN nhập cho hai lựa chọn này cũng không được backend kiểm. **Sửa:** nối lựa chọn tới nghiệp vụ thật; xác thực PIN nếu yêu cầu nhập; phản hồi đúng hành động đã thực hiện.

11. **Vừa — [ban-don.html:362](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:362), [ban-don.html:375](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:375): Không đủ căn cứ kiểm và phản đối kết quả.** Chỉ ghi “có ảnh” nhưng không mở được; loại bỏ dòng `accepted` khỏi lựa chọn phản đối, nên kết quả toàn “Đạt” nhưng cân sai không chọn được dòng. Không có số người bán cho là đúng/chứng cứ; phản đối không gắn phiên bản như đồng ý ký. **Sửa:** cho xem ảnh, chọn mọi dòng hợp lệ, gửi chứng cứ và ID/hash phiên bản; giữ bảng kết quả xem lại sau ký/tranh chấp.

12. **Vừa — [ban-don.html:109](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:109), [chung.js:44](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:44): Map trạng thái/chặng sai.** Thiếu `fully_received`, `partially_received`, `due`, `closed`, `arrival_check`; dùng nhãn loại khoản `goods_after_acceptance` trong khi backend có `goods_on_receipt`, `goods_after_days`. “Thanh toán” không được map: đã kiểm hàm, đơn `outstanding` bị tô chặng **Ký**. **Sửa:** dùng bộ mã chuẩn backend và kiểm đủ từng trạng thái.

13. **Vừa — [ban-don.html:132](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:132): Lỗi tải bị biến thành dữ liệu có vẻ hợp lệ.** `/money` lỗi bị nuốt thành `null`, sau đó hiện thực nhận **0 đ** và “Chưa chuyển cọc”. API chi tiết đợt lỗi cũng bị thay bằng bản thiếu thông tin. Câu “kéo xuống tải lại” chưa có cơ chế tương ứng. **Sửa:** đánh dấu từng khối tải lỗi, không suy ra số 0/trạng thái chưa trả; thêm nút thử lại/làm mới.

14. **Vừa — [ban-don.html:105](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:105), [chung.js:28](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:28): Giờ và lượng chưa đủ chính xác.** Giờ phụ thuộc múi giờ thiết bị; cuối khung giao chỉ có giờ nên qua ngày bị hiểu sai. Hàm lượng làm tròn: **500 g hiện 1 kg**, 10.049,999 kg hiện 10 tấn. **Sửa:** cố định giờ Việt Nam, hiện đủ hai ngày khi cần; giữ độ chính xác lượng tại màn ký/cân.

15. **Vừa — [ban-hop-dong.html:49](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hop-dong.html:49): Danh sách chưa giúp ưu tiên việc gấp.** Không có hạn, không nhóm “Có vấn đề”; tranh chấp/đối soát bị lẫn vào “chờ bên kia”. API danh sách cũng chưa trả hạn. **Sửa:** bổ sung hạn và cờ vấn đề từ backend, ưu tiên quá hạn/sắp hết hạn; tách hoàn tất với đã đóng theo O1.

16. **Vừa — [ban-don.html:32](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:32), [ban-don.html:221](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:221): Chưa đạt UX người đọc chậm.** Nhiều chữ nghiệp vụ 12,5–14,5 px, nút chính 52–54 px, thiếu Nghe; dialog thiếu tên truy cập và giữ focus, Tab có thể ra nền. Cảnh báo “chưa tiền thì chưa bốc” áp dụng chung cả đơn trả sau, sai thời điểm. **Sửa:** chữ thân ≥17 px, nút chính ≥56 px, Nghe; quản lý focus/nền và câu hướng dẫn theo `payment_timing`.

17. **Vừa — [ban-don.html:165](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:165), [don.ts:325](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:325): Chưa thể hiện biến thể L1–L8.** Màn trình bày một lượng × một giá, không có khoảng lượng/công thức giá đặt trước, vật tư đối trừ bao tiêu hay mức bảo đảm khung. DTO chi tiết cũng thiếu dữ liệu để dựng đủ. **Sửa:** bổ sung loại hợp đồng và khối riêng tương ứng; chỉ rõ giá/lượng tạm hay đã chốt.

18. **Nặng — [thiet-ke-ban.mjs:401](/home/twictrn/agiviet-production-v2/frontend/tests/thiet-ke-ban.mjs:401): Test chưa chứng minh hoàn thành luồng.** Phần ký nghiệm thu chỉ kiểm **bị chặn vì thiếu tiền**, chưa đi tới ký thành công; phản đối có thể bị bỏ qua theo dữ liệu cũ. Chưa kiểm tiền mặt, nhận thiếu rồi bổ sung, OTP hết hạn/lệnh lỗi, mất phản hồi, nhấn kép, QR, thiếu hàng, quyết toán/hoàn tiền. **Sửa:** fixture độc lập, kiểm trạng thái và số tiền chính xác sau từng bước; chỉ cho phép đúng lỗi 409 dự kiến.

Về XSS: `esc()` đã mã hóa đủ ký tự phá HTML/thuộc tính tại các điểm đã đọc; **chưa thấy lỗi XSS trực tiếp qua `esc`**.

**5 việc ưu tiên nhất:**

1. Sửa tiền nhiều lần và tiền mặt; kiểm đúng số tiền sau mỗi xác nhận.
2. Hoàn thiện OTP, khóa chống lặp và xử lý tác vụ khi đóng tấm.
3. Bổ sung bàn giao QR/người nhận/chuyến xe, điều kiện trước bốc.
4. Hiện quyết toán, cọc ngân hàng và luồng người bán hoàn tiền.
5. Khép kín ký–đề nghị/hủy–thiếu hàng–phản đối; thêm test hoàn thành từng nhánh.
