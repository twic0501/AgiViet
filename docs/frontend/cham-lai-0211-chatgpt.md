Đã đọc bản chấm cũ, E62–E68 và đối chiếu mã. **App mua tiến bộ rõ, nhưng mới nối tới ký OTP; chưa khép hành trình giao dịch.** Đây là chấm mã hiện tại, chưa chạy lại E2E hay xác nhận các migration đã được áp dụng. Không sửa file.

**A. Chấm lại từng mục**

| Mục | Cũ → mới | Lý do |
|---|---:|---|
| Luồng chính | **6,5 → 7** | Đã sửa liên kết đơn, phụ lục và lượt xác nhận tiền; phía mua vẫn thiếu thao tác sau ký. |
| Nhắn tin + chặn liên lạc | **6,5 → 7** | Mẫu Unicode cũ đã che hết và liên kết hội thoại tốt hơn, nhưng STK xen dấu `·` vẫn lọt, chat app mua còn mô phỏng. |
| Tiền + cọc | **6 → 6,5** | Nhãn ngân hàng/cọc đúng hơn; luồng người bán hoàn tiền và theo dõi hoàn khi chưa có quyết toán vẫn thiếu. |
| Hỗ trợ + hướng dẫn | **7,5 → 7,5** | Có nghe, cỡ chữ và gọi nhân viên; yêu cầu hỗ trợ chưa tự kèm đúng đơn/bước đang vướng. |
| Chống ép giá/lừa | **5,5 → 6** | Kiểm hồ sơ đã thêm hạn/thị trường, nhưng chưa đúng lô/cơ sở và chưa chốt bảo vệ giá hạ cấp. |
| Giao diện cho nông dân | **7,5 → 7,5** | Cải thiện điện thoại chủ yếu ở app mua; chữ nhỏ tại màn ký, tiền và tranh chấp của người bán còn nguyên. |
| App mua | **4 → 6** | Đã có nguồn hàng → thương lượng → lập đơn → ký OTP thật, nhưng chỉ bật bằng `?thu=` và phần sau ký chưa nối. |
| Độ gọn, nhất quán | **6 → 6** | Tiện ích bán đã ghi rõ mô phỏng, nhưng app mua vẫn đặt màn thật cạnh tiền, chat và kế hoạch mẫu. |

**B. Các lỗi/thiếu cũ: đã sửa đến đâu**

| Mã | Kết luận theo mã hiện tại |
|---|---|
| **① Hồ sơ giao hàng** | **Một phần.** Đã thêm hạn/thị trường tại [giao-nhan.ts:89](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:89); vẫn chỉ tìm giấy theo tổ chức, chưa ràng buộc lô/cơ sở/mặt hàng. Điền bù đơn cũ vẫn có thể bị bỏ qua tại [0079:18](/home/twictrn/agiviet-production-v2/db/migrations/0079_don_ghi_nhu_cau_goc.sql:18). |
| **② App mua mô phỏng** | **Một phần lớn đã sửa.** Có API thương lượng, lập đơn, ký tại [mua.js:989](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:989); chưa có cọc–giao–nghiệm thu–quyết toán thật. |
| **③ Nút phụ lục sai trạng thái** | **Đã sửa phía bán:** xử lý `open`, `accepted`, phiên bản chưa hiệu lực và ký OTP tại [ban-don.html:597](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:597). Chưa chứng minh hai bên hoàn tất qua UI. |
| **④ Mất liên kết lời chào–đơn** | **Đã sửa:** API trả `offer_id` tại [don.ts:393](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:393); trình chạy bỏ lấy đơn cuối, không tìm thấy thì báo lỗi tại [chay-kich-ban-ai.mjs:90](/home/twictrn/agiviet-production-v2/backend/scripts/chay-kich-ban-ai.mjs:90). |
| **⑤ Hoàn tiền/trạng thái ngân hàng** | **Một phần.** Nhãn lệnh và `fully_processed` đã bổ sung; màn vẫn lọc riêng `buyer_to_seller` tại [ban-don.html:255](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:255), và không có quyết toán thì ẩn luôn phần chứa lệnh ngân hàng tại dòng 274. |
| **⑥ Che Unicode** | **Mẫu MUA-02 cũ đã sửa**, kiểm hàm thuần không còn đuôi số. Nhưng `STK VCB 1234·5678·9010` vẫn trả `sach:true`; mẫu STK chưa nhận dấu này tại [lien-lac.mjs:55](/home/twictrn/agiviet-production-v2/security/lib/lien-lac.mjs:55). Tin đã lưu cũng chưa được tự che lại. |
| **⑦ Sai người làm tiếp sau báo trả** | **Đã sửa nhánh trước bốc:** phân biệt chưa trả, `payer_reported`, `mismatch` tại [don.ts:300](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:300). |
| **⑧ Tiện ích báo thành công giả** | **Đã giảm hiểu nhầm**, có dải “chưa lưu thật” và thông báo mô phỏng tại [ban-them.html:173](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-them.html:173); nghiệp vụ vẫn chưa nối. |
| **⑨ Chữ nhỏ/hỗ trợ thiếu ngữ cảnh** | **Chưa hoàn tất.** Điều kiện ký còn 13 px tại [ban-don.html:113](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:113); hỗ trợ chỉ gửi nội dung tại [chung.js:271](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:271). |

Các thiếu ngoài ①–⑨: **sàn giá hạ cấp chưa chốt; bảng gom nguồn vẫn số mẫu** tại [mua.js:846](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:846). Ngày giao đã sửa tại [don.ts:318](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/don.ts:318). E68 ghi nhận thử điện thoại tới ký; chưa thay thế bằng chứng giao dịch trọn vòng, sổ lượng, hoàn tiền và độ phủ nguồn.

**C. DANH SÁCH VIỆC SỬA ƯU TIÊN — nặng → nhẹ**

1. **Hồ sơ phải đúng lô/cơ sở.** Giấy của ao/vườn khác có thể làm hàng thiếu điều kiện được giao. **File:** `giao-nhan.ts`, migration mới thay chốt `0036`. **Sửa:** dùng chung điều kiện kiểm cho thẻ và DB; gắn giấy với cơ sở/mặt hàng, kết quả kiểm với lô/mẫu; rà đơn cũ thiếu `demand_id`. **Kiểm:** giấy đúng tổ chức nhưng sai lô, cơ sở, thị trường hoặc hết hạn đều bị chặn.

2. **Chặn lẫn dữ liệu thật–mẫu trong app mua.** [mua-that.js:5](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-that.js:5) chỉ xét `?thu=`; [mua.js:935](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:935) bắt lỗi tải nhưng giữ lô mẫu. Người dùng có thể xem số mẫu giữa hành trình thật. **File:** hai file trên. **Sửa:** nhận diện phiên thật; tải lỗi phải hiện lỗi và khóa thao tác; màn chưa nối phải ghi rõ/khóa. **Kiểm:** đăng nhập không có `?thu=`, mất mạng và API 500 đều không hiện hàng/tiền mẫu như thật.

3. **Khép luồng hoàn tiền hai chiều.** Người bán biết tổng phải hoàn nhưng không thực hiện được; người mua khó biết tiền đang ở đâu. **File:** `ban-don.html`, `ban-tien.html`, `mua.js`, `tien.ts`. **Sửa:** hiện khoản `seller_to_buyer`, hạn, chứng từ, báo hoàn và xác nhận nhận; lệnh hoàn cọc hiển thị độc lập quyết toán. **Kiểm:** trả thừa, trả nhiều lần, chưa nhận tiền, quá hạn cọc; sổ tiền chỉ đổi khi xác nhận hợp lệ.

4. **Bảo vệ giá hạ cấp — [CẦN NGƯỜI SÁNG LẬP CHỐT].** Giá rất thấp có thể khiến nông dân nhận ít tiền dù đã giao đủ. **File:** `don.ts:88`, `ban-don.html:370`, `mua.js:1010`, migration chính sách. **Sửa:** chốt cơ chế theo mặt hàng: cảnh báo, giới hạn hoặc duyệt riêng; yêu cầu chứng cứ hạ loại và đường phản đối. **Kiểm:** ký và nghiệm thu thật mức 500 đ/kg, hạ loại phần lớn hàng, phản đối từng dòng; không tự coi 50% là sàn đã duyệt.

5. **Hoàn thành hành trình mua sau ký.** Hiện người mua tới bước phải cọc/giao nhận nhưng thiếu nút nghiệp vụ. **File:** `mua.js`, `mua-that.js`, các API tiền/giao nhận/phụ lục; `giao-nhan.ts:64` còn chặn đặt xe ngoài môi trường thử. **Sửa:** nối cọc → người nhận/xe → nghiệm thu → trả tiền → quyết toán, chat và phụ lục cùng đơn. **Kiểm:** hai phiên mua/bán hoàn tất một đơn qua UI; đối chiếu đúng ID, lượng và tiền cuối.

6. **Đồng nhất phát hiện và che liên lạc.** STK xen Unicode còn gửi nguyên văn trước cọc. **File:** `security/lib/lien-lac.mjs`, bản tương ứng `frontend/thiet-ke/lien-lac.js`, `tin-nhan.ts`. **Sửa:** chung quy tắc chuẩn hóa dấu, che trọn chuỗi; xử lý hiển thị tin cũ còn lọt. **Kiểm:** mẫu STK vừa tái hiện, MUA-02/BAN-03, đồng thời giữ nguyên giá/kg/ngày hợp lệ.

7. **Bảng gom nguồn bằng dữ liệu thật.** Số “đã có nguồn” mẫu khiến doanh nghiệp tưởng đủ hàng rồi thiếu nguyên liệu. **File:** `mua.js` phần nhu cầu/kế hoạch; dùng `ban-23.ts:77`. **Sửa:** nối nhu cầu–nguồn–đơn–ngày giao; tách dự kiến, cam kết, đủ điều kiện giao và đã nhận. **Kiểm:** hai nguồn, một nguồn hết giữ lượng/hủy/giao thiếu; phần thiếu cập nhật, đơn nguồn còn lại tiếp tục.

8. **Dễ đọc và hỗ trợ đúng giao dịch.** Chữ điều kiện nhỏ làm người lớn tuổi bỏ sót rủi ro; nhân viên phải hỏi lại đơn. **File:** `ban-don.html`, `chung.js`, CSS liên quan. **Sửa:** chữ quyết định ≥16 px, tiền/hạn nổi rõ, đọc thành tiếng; gửi hỗ trợ kèm đơn và bước hiện tại. **Kiểm:** tác vụ ký/xác nhận tiền trên điện thoại với người đọc chậm; kiểm cả cỡ chữ lớn và yêu cầu hỗ trợ nhận đúng ngữ cảnh.

**D. Ba câu hỏi dành cho người sáng lập**

1. Giá hạ cấp được tự thỏa thuận đến đâu; khi hạ loại quá nhiều, người bán có quyền yêu cầu kiểm định độc lập hoặc nhận hàng lại theo cơ chế nào?
2. Trả sau được phép với doanh nghiệp nào, cần bảo đảm gì, và ai chịu phần mất tiền nếu doanh nghiệp không trả?
3. Những mặt hàng/thị trường nào bắt buộc hồ sơ theo cơ sở hoặc kiểm nghiệm theo lô, kể cả giao dịch mua trực tiếp không gắn nhu cầu?
