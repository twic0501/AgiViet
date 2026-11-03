**(1) Truy cập trực tiếp và phạm vi kiểm chứng**

Không truy cập trực tiếp được từ sandbox. `curl` tới landing, hai cửa đăng nhập, hai đường dẫn mô phỏng và ba domain dự kiến đều báo:

```text
curl: (6) Could not resolve host
```

Đây **không phải bằng chứng website bị sập**. Báo cáo dưới đây dựa trên 22 ảnh bạn cung cấp và mã nguồn đọc tại workspace. Tôi không sửa tệp, không chạy thao tác ghi dữ liệu.

Giới hạn đáng chú ý:

- Cả sáu ảnh `dt/pc-mua-{hom-nay,nguon,tien}` đều đang ở **hướng dẫn bước 1/4**; chưa thấy các màn nghiệp vụ bên mua.
- Ảnh landing có nhiều vùng trắng tương ứng nội dung `.len` chờ cuộn. Chưa đủ bằng chứng kết luận trang thật bị mất nội dung.
- Hai ảnh `chon-vai` chưa thấy danh sách vai, nhưng có thể chụp giữa hiệu ứng mở tấm; chưa kết luận lỗi cắt màn.
- Trong lúc soát, `frontend/index.html` thay đổi từ bên ngoài: **3 → 5 tài khoản**, câu tính phí cũng được sửa. Mã đọc cuối đã cập nhật; **chưa xác nhận bản deploy đã nhận thay đổi**.
- Số đo tải là kết quả bạn cung cấp, tôi không đo lại.

Nhập vai ba nhóm: giám khảo có thể hiểu ngay cơ chế “cọc + mã đơn chung”, nhưng dễ hiểu nhầm ngân hàng đã tích hợp thật; nông dân có nút lớn và chữ chính khá rõ, song lời nhắc che nội dung; với người thu mua, các điểm đáng lo nhất nằm ở tổng tiền và bảng giá khác nhau giữa hai lớp giao diện.

**(2) Bảng lỗi**

“Mã” nghĩa là xác nhận từ mã nguồn, chưa tái hiện trực tiếp trên host.

| Mức | Ở đâu | Thấy gì | Vì sao là lỗi | Cách sửa trong phạm vi bản thi |
|---|---|---|---|---|
| **NẶNG** | [mua-app.js:63](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua-app.js:63), dòng 195 | **Mã:** lỗi tải `/orders/:id/payments` bị đổi thành danh sách rỗng; tổng tiền vẫn có thể hiện **0 đ**, “Không có khoản nào tới hạn”. | Mất dữ liệu bị diễn giải thành hết nghĩa vụ thanh toán. | Giữ trạng thái lỗi từng đơn; khi thiếu dữ liệu, ghi “Chưa tính đủ khoản phải trả”, có tải lại. |
| **NẶNG** | `/thiet-ke/mua.html?man=so-sanh-goi`; [mua.js:906](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mua.js:906) | **Mã:** màn gói cũ còn **Business 990.000 đ/tháng**, Miễn phí thu 0,3%/0,3%. Landing và DB dùng bốn gói, Miễn phí **1%/0,5%**. Menu cũ vẫn có mục Gói. | Giám khảo đi sâu từ app mua có thể gặp hai bảng giá trái nhau. Đây vẫn là phần được app mới liên kết tới qua `mua.html`. | Đồng bộ màn gói cũ với `ref.plans`, hoặc bỏ đường dẫn tới màn giá cũ trong luồng thi. |
| **NẶNG** | [index.html:306](/home/twictrn/agiviet-production-v2/frontend/index.html:306), dòng 369, 480 | Màn đầu khẳng định ngân hàng giữ cọc; quy trình nói PDF có chữ ký số. Thông tin **ngân hàng mô phỏng, chưa chuyển tiền thật** nằm trong FAQ đóng ở gần cuối; mã PDF cũng ghi niêm phong mô phỏng. | Trong 5 giây đầu dễ tin rằng đã có ngân hàng và chữ ký số vận hành thật. Ảnh minh họa lại trông như bằng chứng giao dịch thật. | Đặt nhãn ngay cạnh CTA/phiếu tiền: “Bản thi · dữ liệu mẫu · ngân hàng mô phỏng · chưa chuyển tiền thật”; ghi rõ phần ký đang mô phỏng. |
| **VỪA** | [index.html:525](/home/twictrn/agiviet-production-v2/frontend/index.html:525) | **Mã:** bỏ công tắc ảnh sẽ tính như nhận đủ 100%; có ảnh thì thanh kéo lập tức cho kết quả chia cọc. | Thiếu ảnh không đồng nghĩa đã nhận đủ. Có ảnh cũng chưa thay thế việc người bán chấp nhận, đặc biệt trả lại trên 20%. | Hiện trạng thái “Chưa đủ điều kiện chốt”; ghi rõ phép tính chỉ áp dụng **sau khi hai bên xác nhận**. |
| **VỪA** | `pc-ban-hang-hoa.png`; [lo.ts:166](/home/twictrn/agiviet-production-v2/backend/src/nghiep-vu/lo.ts:166) | Ảnh có lô **Đang bán, còn 0 kg**, vẫn gợi ý bật bán nhanh. Truy vấn nguồn bên mua chưa loại lô có lượng khả dụng bằng 0. | Trái lời hứa landing “Lô hết lượng tự rời khỏi kết quả”; người mua có thể thấy nguồn không chào mua được. | Lọc lượng khả dụng > 0 ở nguồn mua; phía bán ghi “Hết lượng còn bán” và bỏ gợi ý bán nhanh không phù hợp. |
| **VỪA** | [dang-nhap.html:192](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/dang-nhap.html:192), dòng 211 | **Mã:** sau khi chọn vai, `ds-vai` bị ẩn, `tep` hiện; mở lại chọn vai không đặt lại hai trạng thái này. | Đóng rồi mở lại có thể vẫn thấy đối tác cũ, không chọn được vai khác. | Khi mở chọn vai, hiện lại danh sách, ẩn tệp đối tác và đặt lại nút/trạng thái chọn. |
| **VỪA** | [index.html:397](/home/twictrn/agiviet-production-v2/frontend/index.html:397); [chinh-sach.ts:9](/home/twictrn/agiviet-production-v2/backend/src/chinh-sach.ts:9) | Landing dùng ví dụ **trả sau 7 ngày**; backend mặc định tắt trả sau, chỉ mở nếu có `AGV_TRA_SAU=1`. | Ví dụ khiến người xem tưởng đây là phương án giao dịch đang dùng được. Chưa kiểm được biến môi trường Render. | Với bản thi đang tắt, thay ví dụ bằng phương án được hỗ trợ, hoặc ghi rõ đây là tình huống tham khảo. |
| **VỪA** | [vercel.json:7](/home/twictrn/agiviet-production-v2/frontend/vercel.json:7); [index.html:308](/home/twictrn/agiviet-production-v2/frontend/index.html:308) | Redirect **gốc** hai subdomain đúng ý định. Tuy nhiên CTA landing vẫn dùng đường dẫn tương đối trên domain hiện tại; đăng nhập chỉ nhận vai mua qua `?ben=mua`. | Khi gắn domain, bấm từ landing vẫn ở `agiviet.id.vn/thiet-ke/...`; mở trực tiếp `mua.agiviet.id.vn/thiet-ke/dang-nhap.html` thiếu query lại vào vai bán. | Chuyển CTA sang đúng subdomain khi đưa domain vào dùng; chuẩn hóa cửa đăng nhập theo host. Giữ URL Vercel dùng được cho thi. |
| **VỪA** | [huong-dan.js:74](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/huong-dan.js:74) | **Mã:** tour bán khai báo modal và đưa focus vào nút Tiếp, nhưng không vô hiệu nền hoặc giữ vòng Tab trong tour. | Người dùng bàn phím có thể đi vào các nút bị lớp tối che; khai báo modal không khớp hành vi. | Khóa tương tác nền khi tour mở, giữ focus trong tour và trả focus khi đóng. |
| **VỪA** | [index.html:400](/home/twictrn/agiviet-production-v2/frontend/index.html:400), dòng 476 | Hứa **“Nút Nghe ở mọi màn”**. Các màn Hàng hóa, danh sách Hợp đồng không có nút đọc nội dung màn; nút tai nghe chung mở trợ lý. | Trợ lý hỏi đáp và đọc toàn màn là hai hành vi khác nhau; người lớn tuổi khó tìm đúng chức năng đã hứa. | Đổi thành mô tả đúng: “Có trợ lý giọng nói, nút Nghe ở các bước hướng dẫn và quyết toán”. |
| **NHẸ** | `pc-ban-hom-nay.png`; [ban-hom-nay.html:221](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hom-nay.html:221) | `/v1/weather` đã đo trả 503; giao diện ghi “Chưa có dữ liệu”. | Người dùng không phân biệt chưa có dự báo với lỗi tải dịch vụ. Không chặn giao dịch. | Ghi “Tạm chưa tải được thời tiết”, cho thử lại hoặc thu gọn ô khi lỗi. |
| **NHẸ** | `dt-ban-tien.png`, `pc-ban-tien.png`; [chung.js:398](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:398) | Bong bóng trâu cố định che một phần nội dung Tiền; trên điện thoại chiếm khoảng 180 px chiều cao. | Muốn đọc tiếp phải đóng hoặc chờ tự ẩn; phần dưới khó quan sát ngay. | Đặt lời nhắc trong luồng nội dung hoặc rút gọn thành nút mở giải thích. |
| **NHẸ** | [index.html:465](/home/twictrn/agiviet-production-v2/frontend/index.html:465) | Dòng chung nói “Phí mỗi đơn có mức sàn 20.000 đ”, nhưng gói Bếp không phí, đơn mối quen gói Thu mua cũng 0%. | Người đọc không biết mức sàn có áp dụng cho các đơn miễn phí không. | Ghi “Đơn có thu phí áp dụng mức sàn 20.000 đ; đơn miễn phí không áp dụng”. |
| **NHẸ** | [index.html:491](/home/twictrn/agiviet-production-v2/frontend/index.html:491), dòng 574 | Chọn mặt hàng ở câu “Mùa này nhà mình có…” rồi Đăng bán; JavaScript bỏ lựa chọn và chỉ chuyển tới đăng nhập. | Người dùng tưởng mặt hàng đã được chuyển sang bước đăng tin. | Giữ lựa chọn tới màn đăng bài, hoặc bỏ bộ chọn và dùng lời mời vào bản mẫu rõ ràng. |

Các đối chiếu **không phát hiện sai số**:

- HĐ-3001: **500 × 23.400 = 11.700.000 đ**; cọc **3.510.000 đ**; nhận 100 kg thì **2.340.000 + 1.170.000 = 3.510.000 đ**.
- Sổ tiền bán: **4.424.000 + 4.236.000 = 8.660.000 đ**. Số lớn làm tròn 8,7 triệu không phải lỗi cộng.
- JSON mô phỏng có đúng **59 tình huống**; `1/48` trong ảnh là bước 1 của tình huống 48 bước.
- Các `href/src` tĩnh kiểm trong landing, đăng nhập và những màn bán chính đều có đích trong nguồn. Chưa kiểm được HTTP, liên kết động và thao tác thực tế.
- Bảng giá landing đọc cuối đã khớp giá tháng, tỷ lệ phí và số thành viên của migration/chính sách. `ref.plans` hiện tại trên Neon chưa truy vấn được.
- “Transition was skipped” không cần ưu tiên sửa trước thi theo bằng chứng hiện có.

**(3) Tối đa 8 việc nên sửa trước buổi thi**

1. **Chặn tổng nợ giả bằng 0 khi API lỗi**; hiện rõ dữ liệu thanh toán chưa đầy đủ.
2. **Thống nhất bảng giá ở toàn bộ đường đi app mua**, xử lý màn Business 990.000 đ còn sót.
3. **Đặt nhãn mô phỏng ngay màn đầu**, gồm ngân hàng, tiền và phần ký.
4. **Sửa phiếu chia cọc tương tác** để thiếu ảnh/chưa xác nhận không bị diễn giải thành kết quả đã chốt.
5. **Loại nguồn hết lượng khỏi app mua**, đồng thời bỏ gợi ý bán nhanh cho lô 0 kg.
6. **Sửa trạng thái mở lại chọn vai và bàn phím tour**; đây là cửa vào trải nghiệm thi.
7. **Đồng bộ lời giới thiệu với tính năng đang bật**: trả sau 7 ngày, phạm vi nút Nghe, ngoại lệ mức sàn phí.
8. **Chốt lại bản deploy sau cập nhật**: kiểm CTA ba domain, chụp sau khi hiệu ứng ổn định và bỏ qua hướng dẫn để thực sự thấy ba màn mua. Hiện bộ ảnh chưa chứng minh được các màn đó.