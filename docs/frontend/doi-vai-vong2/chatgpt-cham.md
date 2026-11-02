Đã đối chiếu bốn nhật ký với kịch bản, chính sách và mã hiện tại; **không sửa repo, không chạy lại giao dịch**. Điểm hôm nay phản ánh mã đang có; migration mới có trong repo chưa đồng nghĩa đã áp dụng thành công.

**A. Chấm từng bộ**

ĐÚNG gồm chặn đúng nghiệp vụ. KHÔNG RÕ gồm bước không tới được nhánh cần thử hoặc thiếu bằng chứng tiền/lượng/điều khoản. `http:0` là lỗi trình chạy, không phải mã HTTP của app.

| Bộ kết quả | ĐÚNG | SAI | KHÔNG RÕ | Tổng |
|---|---:|---:|---:|---:|
| Claude BÁN | **44** | **1** | **4** | 49 |
| Claude MUA | **51** | **2** | **17** | 70 |
| ChatGPT BÁN | **82** | **1** | **9** | 92 |
| ChatGPT MUA | **77** | **0** | **13** | 90 |
| **Tổng** | **254** | **4** | **43** | **301** |

Đây là số bước đúng theo phạm vi quan sát, **không phải tỷ lệ hoàn thành giao dịch hoặc sẵn sàng phát hành**.

Các bước SAI:

| Kịch bản · bước | App/trình chạy làm gì | Lẽ ra | Phân loại |
|---|---|---|---|
| **BAN-02 · 3** | `http:0`, đọc `id` của lô nguồn 2 chưa tạo được. | Dừng nhánh phụ thuộc; chuẩn bị nguồn L2 đã xác minh trước khi báo giá. Bước 1 chặn đăng lô là đúng. | **KỊCH BẢN SAI** |
| **CMUA-01 · 12** | HTTP 200, tạo biên bản hạ cấp; đối chiếu mã thấy **ID ảnh gửi lên không được giữ trên dòng nghiệm thu**, thay bằng ID biên bản PDF. | Dòng hạ cấp phải liên kết đúng ảnh chứng cứ, người bán mở xem được. | **LỖI APP**, xác định từ đường ghi mã |
| **CMUA-03 · 11** | HTTP 200, nhận biên bản trả lại 90 kg; cùng lỗi liên kết ảnh nêu trên. | Lưu đúng ảnh của phần trả lại, tách khỏi tài liệu biên bản. | **LỖI APP**, cùng nguyên nhân |
| **GPTBAN-04 · 15** | `http:0`: “Không có khoản nào bên mua đã báo trả”; đơn vẫn `preparing`. | Chưa có nghiệm thu/báo trả thì không chạy xác nhận tiền; phải giải quyết điều kiện xe trước. | **KỊCH BẢN SAI** |

Căn cứ lỗi ảnh: [giao-nhan.ts:286](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/giao-nhan.ts:286) bỏ `evidence_document_id` khi truyền dòng; [0046:91](/home/twictrn/agiviet-production-v2/db/migrations/0046_hoan_thien_cac_nhanh_command.sql:91) ghi trường này bằng ID biên bản. Màn bán lại dựa vào trường đó để ghi “có ảnh”.

Các bước KHÔNG RÕ, để kiểm lại được số đếm:

| Bộ | Bước | Thiếu bằng chứng |
|---|---|---|
| Claude BÁN | BAN-02: **4, 7, 9**; BAN-05: **7** | Nhánh hai nguồn không đủ tiền đề; chưa đọc tiền riêng từng nguồn hoặc sổ lượng sau đóng đơn. |
| Claude MUA | CMUA-01: **8, 14, 17**; CMUA-05: **2, 5–6, 8, 10–17**; CMUA-06: **8, 10** | Chưa đọc danh sách khoản tiền/nghĩa vụ hoàn; CMUA-05 không có hợp đồng để thử tiếp; chưa chứng minh hoàn cọc qua ngân hàng. |
| ChatGPT BÁN | GPTBAN-01: **7**; GPTBAN-02: **7**; GPTBAN-03: **11**; GPTBAN-04: **8, 12, 14, 16**; GPTBAN-06: **8–9** | Thiếu điều khoản thực lưu, lý do chặn chi tiết; nhánh lúa chưa qua chuẩn bị xe; chưa thử ký vượt kiểm soát giá hạ cấp. |
| ChatGPT MUA | MUA-03: **9–10**; MUA-05: **8–17**; MUA-07: **10** | Thiếu lệnh hoàn/đối soát; nhánh sau lập đơn bị chặn không được thực hiện; chưa đọc độ phủ nhu cầu thực tế. |

Ba điểm cần phân xử rõ:

- **CMUA-02 bước 5–6 và MUA-05 bước 7 là ĐÚNG:** chặn trả sau/trả trước chưa kiểm theo chính sách mới.
- **CMUA-03 bước 12–13 chưa chứng minh app tự chốt khi người bán im lặng.** [Bot người bán:157](/home/twictrn/agiviet-production-v2/backend/src/demo/doi-tac-ao.ts:157) chủ động gọi `acceptance/agree`. Trạng thái chuyển sau lựa chọn đó là hợp lệ; bài thử chưa kiểm được việc giữ nguyên trạng thái khi người bán không chọn.
- **70%/20% vẫn là CHÍNH SÁCH CHƯA LÀM**, không được tính là đã đạt nhờ có `awaiting_seller` hoặc một ô tích chung. UI bán đã có ô tích giá hạ cấp, nhưng backend chưa ràng buộc xác nhận riêng theo phiên bản/ngưỡng và chưa có cơ chế tăng kiểm soát >20%.

**B. Tám tiêu chí**

Điểm hai cột đầu lấy từ hai bản chấm bạn chỉ định; cột cuối chấm độc lập hôm nay.

| Tiêu chí | 02/11 → chấm lại → nay | Vì sao |
|---|---:|---|
| **Luồng chính** | **6,5 → 7 → 7,5** | BAN-01/GPTBAN-01 tới xác nhận **16,31 triệu trả thẳng**, sau đó `in_transit`; MUA-06 mở lại đúng hai hợp đồng. Chưa chứng minh kết thúc quyết toán trong bốn nhật ký; nhánh lúa lớn còn dừng. |
| **Nhắn tin + chặn liên lạc** | **6,5 → 7 → 7,5** | BAN-03, MUA-02 và CMUA-04 che được chữ, số toàn chiều rộng, STK dấu `·`; sau cọc mở số đúng. Chat trong app mua vẫn thuộc màn mô phỏng. |
| **Tiền + cọc** | **6 → 6,5 → 6,5** | Đã có trả tiền, hoàn hai chiều và chuyển đúng lượt xác nhận. Tuy nhiên công thức số dư phía mua còn sai ở nhánh hoàn cọc; bốn nhật ký thiếu bằng chứng quyết toán/ngân hàng cuối. |
| **Hỗ trợ + hướng dẫn** | **7,5 → 7,5 → 8** | [chung.js:267](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:267) đã gửi hỗ trợ kèm đơn, màn và bước; có Nghe/cỡ chữ. Chưa có thử nghiệm người dùng chứng minh họ tự xử lý được chỗ vướng. |
| **Chống ép giá/lừa** | **5,5 → 6 → 6** | Chặn giá kín, sửa giá muộn, thiếu hồ sơ đều tốt hơn. Chưa có 70%/20%; liên kết ảnh nghiệm thu sai; hồ sơ vẫn kiểm chủ yếu theo tổ chức. |
| **Giao diện cho nông dân** | **7,5 → 7,5 → 8** | Chữ điều kiện ký tại [ban-don.html:113](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-don.html:113) đã lên **16px**, có xác nhận từng điều kiện và hướng dẫn kiểm tiền. Chưa kiểm trực tiếp với nông dân đọc chậm. |
| **App mua** | **4 → 6 → 7** | Mã đã nối cọc, xe, nghiệm thu, trả tiền, nhận kho, hoàn tiền. Nhưng [mua-that.js:5](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-that.js:5) vẫn chỉ bật thật bằng `?thu=`; kế hoạch tuần và nhiều màn phụ còn mẫu. |
| **Độ gọn, nhất quán** | **6 → 6 → 6,5** | Đã bỏ lô mẫu khi tải thật lỗi và gắn cảnh báo màn mô phỏng. Vẫn phân mảnh giữa chi tiết đơn thật với chat/tiền tổng/kế hoạch mẫu; nhãn trạng thái ngân hàng hai app chưa thống nhất. |

Một lỗi tiền cụ thể ngoài những bước đã tới trong nhật ký: [mua.js:1289](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:1289) cộng `refund_vnd` vào số còn phải trả. Với **giá trị 3 triệu, đã trả thẳng 4,2 triệu, cọc hoàn 1,8 triệu**, công thức hiện ra **bên mua còn trả 600.000**, trong khi người bán phải hoàn **1,2 triệu**.

**C. So sánh VAI**

**Hiện app phục vụ người bán tốt hơn về khả năng sử dụng thực tế.** Phía bán có màn hợp đồng, tiền, phản đối, hỗ trợ và chữ dễ đọc tương đối liền mạch. Phía mua đã có phần lớn thao tác giao dịch nhưng luồng thật còn phụ thuộc `?thu=`, chat và kế hoạch tuần chưa thật.

Ngược lại, **quyền định hình giao dịch vẫn nghiêng về bên mua**: bên mua lập điều khoản và ghi kết quả phân hạng; người bán phải phát hiện điều khoản bất lợi rồi phản đối. Thiếu kiểm soát 70%/20% và ảnh đúng dòng khiến bên bán yếu thế ở chính thời điểm hàng đã tập kết.

MUA-06 chứng minh **hai hợp đồng/cọc riêng** khá tốt; chưa chứng minh vận hành nhu cầu định kỳ. CMUA-03 có chữ “định kỳ” trong tên nhưng thực tế chỉ thử **một đơn**, chưa phải hợp đồng khung tuần.

**D. Cải thiện — nặng → nhẹ**

Mức tăng dưới đây là ước lượng sau khi triển khai **và kiểm chứng đạt**, không cộng cơ học giữa các mục.

| Ưu tiên | Vì sao, cách làm cụ thể | Kiểm chứng | Điểm có thể tăng |
|---|---|---|---|
| **1. Khép chính sách tại backend** | Ngăn ký giá hạ cấp bất lợi và chốt phần hàng lớn thiếu lựa chọn rõ. Sửa `backend/src/chinh-sach.ts`, `nghiep-vu/don.ts`, `giao-nhan.ts`, migration mới và màn ký/nghiệm thu hai app: lưu xác nhận <70% gắn phiên bản; >20% yêu cầu lựa chọn rõ, giữ phần đang xét. **Chặn trả sau cả đặt trước:** điều kiện `!vu` ở `don.ts:113` hiện bỏ qua nhánh `pre_harvest`. | Gọi API trực tiếp; thử dưới/đúng 70%, đúng/trên 20%; tắt bot người bán; thay phiên bản phải xác nhận lại; đặt trước không nhận `after_days`. | Chống ép giá **+1**; luồng **+0,5** |
| **2. Sửa số tiền còn trả/hoàn** | Chỉ sai bên đang nợ có thể gây chuyển nhầm tiền. Sửa `frontend/thiet-ke/mua.js`: dùng `t_bm_vnd`, `t_nb_vnd` của quyết toán hiệu lực; thống nhất nhãn `processing/succeeded/reconciled/fully_processed`. Cho màn bán hiện lệnh hoàn độc lập với bản quyết toán. | Ca **3/4,2/1,8 triệu** phải hiện người bán hoàn 1,2 triệu; thử lệnh chờ, thành công, đối soát và lỗi. | Tiền **+1**; nhất quán **+0,5** |
| **3. Giữ đúng ảnh chứng cứ nghiệm thu** | Người bán có thể thấy “có ảnh” nhưng chỉ có PDF biên bản. Sửa ánh xạ trong `giao-nhan.ts` và migration thay `submit_acceptance_internal`; kiểm ảnh thuộc đúng đơn/người gửi, lưu riêng ảnh và biên bản. | Đọc lại từng dòng và mở ảnh bằng cả hai vai; ID PDF/ảnh đơn khác phải bị chặn. | Chống ép giá **+0,5**; luồng **+0,5** |
| **4. Hồ sơ đúng nguồn–cơ sở–lô** | Giấy của ao/vườn khác có thể làm lô thiếu điều kiện được giao; đơn mua thẳng không có nhu cầu dễ bỏ mất yêu cầu. Sửa `giao-nhan.ts`, cổng hồ sơ hợp đồng và migration thay chốt `guard_delivery_ready` hiện ở 0081. Chỉ yêu cầu hồ sơ phù hợp giao dịch nội địa/hợp đồng. | Sai cơ sở, sai lô, hết hạn đều chặn; mua thẳng cũng kiểm; không bắt giấy xuất khẩu đại trà. | Chống ép giá **+1** |
| **5. App mua thật từ phiên đăng nhập** | Người mua đăng nhập bình thường vẫn có thể rơi vào bản mẫu. Sửa `mua-that.js`, `mua.js`: nhận phiên/vai thật, nối chat cùng đơn; công cụ thử chỉ theo khả năng máy chủ; màn chưa nối có trạng thái rõ. | Hai phiên OTP không `?thu=` giao dịch và nhắn tin được; mất mạng/500 không hiện số mẫu. | App mua **+1**; chat **+0,5**; nhất quán **+0,5** |
| **6. Hợp đồng khung tuần và độ phủ thật** | Nhà hàng có thể tưởng đã đủ nguồn từ số mẫu. Nối phần kế hoạch/nhu cầu trong `mua.js` với `ban-23.ts:78`, bảng khung và sourcing: tách dự kiến, cam kết, đủ điều kiện giao, đã nhận. Giữ thanh toán từng đợt theo hai cách được phép. | Hai tuần, hai nguồn; một nguồn hủy/giao thiếu thì phần thiếu cập nhật, nguồn còn lại tiếp tục. | App mua **+1**; luồng **+0,5** |
| **7. Hoàn tất vận hành nhiều xe** | Đơn 15 tấn bị kẹt dù có thể chia chuyến. **0081 đã có hướng sửa**, cần hoàn thiện UI danh sách xe/lượng còn thiếu và đường nhà xe xác nhận ngoài môi trường thử trong `giao-nhan.ts`. | 15 tấn đi 10+5 tấn; hủy một chuyến phải mất trạng thái sẵn sàng; kiểm lại lượng, cước, QR và giao nhận. | Luồng **+0,5**; app mua **+0,5** |
| **8. Bộ thử chứng minh kết thúc** | Nhật ký hiện dễ biến bước chờ HTTP 200 thành cảm giác đã đạt nghiệp vụ. Sửa `backend/scripts/chay-kich-ban-ai.mjs`: kiểm tiền đề, dừng nhánh hỏng, ghi điều khoản, readiness, khoản tiền, sổ lượng, lệnh ngân hàng và hành động bot. | Chạy lại bốn bộ; có ca không bot người bán; kết thúc bằng tiền/lượng đối soát, không chỉ `in_transit`. | **Không tự tăng điểm**; cung cấp bằng chứng để công nhận các mức tăng trên. |

