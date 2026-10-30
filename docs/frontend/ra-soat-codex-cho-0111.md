# Codex rà Chợ + chi tiết lô/nhu cầu (01/11/2026, high, chỉ đọc)

Tôi ghi nhận **22 lỗi**, xếp theo mức nghiêm trọng. Đã đối chiếu cả các migration bổ sung ghi đè `cmd.*`; một số lỗi JS được tái hiện bằng mock trong RAM. Không thay đổi tệp, không gọi API ghi hay chạy E2E.

1. **NẶNG — Rút/sửa được lời chào sau khi bên mua đã trả giá.**  
   **Vị trí:** [ban-hang-hoa.html:457](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:457), [0048…sql:264](/home/twictrn/agiviet-production-v2/db/migrations/0048_sua_nhanh_tich_hop_command.sql:264).  
   UI chỉ xét bên gửi vòng cuối; sau vòng 3 của người bán, nút sửa/hủy xuất hiện lại. Backend cũng chỉ kiểm tra người khởi tạo, không kiểm tra đã có trả lời, nên có thể rút rồi tạo mới để đặt lại số lượt trả giá.  
   **Tái hiện:** Người bán chào → bên mua trả giá → người bán trả giá → quay lại Chợ, sửa/hủy.  
   **Sửa:** Chặn rút ở backend khi đã có vòng trả lời; UI dùng quyền thao tác do backend trả về.

2. **NẶNG — Sửa lời chào có thể làm mất bản cũ nhưng báo đã giữ lại.**  
   **Vị trí:** [ban-hang-hoa.html:588](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:588).  
   Luồng rút cũ, gửi mới và khôi phục là ba lệnh riêng. Lỗi khôi phục bị nuốt, nhưng thông báo luôn khẳng định “Lời chào cũ đã được giữ lại”.  
   **Tái hiện:** Cho lệnh rút thành công, rồi làm cả gửi mới và khôi phục thất bại; đã tái hiện bằng mock.  
   **Sửa:** Thay lời chào nguyên tử ở backend, có kiểm tra revision; không báo khôi phục thành công khi chưa xác nhận.

3. **NẶNG — Đường trả lời lời chào dẫn tới màn không có thao tác trả lời.**  
   **Vị trí:** [ban-hang-hoa.html:461](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:461), [ban-tin-nhan.html:92](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-tin-nhan.html:92).  
   Nút “Trả lời ở Tin nhắn” mở danh sách chung; các thẻ ở đó dùng `href="#"`, không có handler đồng ý/trả giá/từ chối. Người bán không hoàn tất được bước B3 từ đường dẫn được hướng dẫn.  
   **Tái hiện:** Bên mua trả giá → bấm “Trả lời ở Tin nhắn” → bấm cuộc chào.  
   **Sửa:** Nối tới chi tiết lời chào theo ID và triển khai các hành động theo quyền, hạn và số lượt còn lại.

4. **NẶNG — `accepted` bị coi là giữ hàng vô thời hạn.**  
   **Vị trí:** [ban-hang-hoa.html:451](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:451), [ban-nhu-cau.html:56](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-nhu-cau.html:56).  
   Hai màn coi mọi lời chào `accepted` là đang giữ hàng và chặn chào thêm, không xét `hold.status`, thời hạn hay hợp đồng liên quan. Backend kết thúc lượt giữ mà vẫn giữ trạng thái lời chào `accepted`.  
   **Tái hiện:** Đồng ý giá, để lượt giữ hết 24 giờ, tải lại khi nhu cầu còn mở.  
   **Sửa:** Phân biệt đã đồng ý giá, đang giữ, giữ đã hết và đã chuyển sang hợp đồng.

5. **VỪA — Lô `upcoming` và `hidden` biến mất khỏi danh sách quản lý.**  
   **Vị trí:** [ban-hang-hoa.html:220](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:220), [ban-hang-hoa.html:360](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:360).  
   Hai trạng thái thật này thiếu trong `TT`; nhóm “Bên mua không thấy” lại chỉ nhận `on_sale`. Lô đã chuyển sang `hidden` cũng không được đưa vào danh sách nhắc xác nhận.  
   **Tái hiện:** Có lô sắp có hàng hoặc lô được bộ hẹn giờ chuyển sang `hidden`; mở Hàng của tôi.  
   **Sửa:** Nhóm đầy đủ trạng thái backend; cho lô `hidden` đường xác nhận còn hàng.

6. **VỪA — Tấm chào mặc định lượng mà lô ước tính không thể được chấp nhận.**  
   **Vị trí:** [ban-hang-hoa.html:513](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:513).  
   Giới hạn chỉ lấy lượng khả dụng và lượng cần, bỏ trần cam kết 80% cùng lượng đã giữ/cam kết. Lời chào gửi được nhưng lúc đồng ý bị ràng buộc `ck_qty_estimated_cap` từ chối.  
   **Tái hiện:** Lô ước tính 1.000 kg, chưa cam kết; mở chào nhu cầu 1.000 kg, giữ lượng mặc định rồi bên mua đồng ý.  
   **Sửa:** Dùng lượng còn được phép cam kết do backend tính làm giới hạn chào.

7. **VỪA — Bỏ qua lượng tối thiểu khi tối thiểu bằng toàn bộ nhu cầu.**  
   **Vị trí:** [ban-hang-hoa.html:511](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:511).  
   `min_source_qty_g` chỉ được kiểm tra khi nhỏ hơn `qty_g`. Nếu cả hai bằng 1.000 kg, tấm chào lại cho tối thiểu 1 kg.  
   **Tái hiện:** Nhu cầu có `qty_g = min_source_qty_g = "1000000"`; nhập chào 1 kg.  
   **Sửa:** Luôn áp dụng `min_source_qty_g`; cờ “đơn gom” chỉ quyết định phần giải thích.

8. **VỪA — Ngừng bán để lại lời chào mở nhưng không thể đồng ý.**  
   **Vị trí:** [ban-hang-hoa.html:291](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:291).  
   Tấm quản lý khẳng định lời chào mở “không bị ảnh hưởng”. Thực tế đóng lô vẫn để lời chào `sent`, trong khi `accept_offer` bắt buộc lô là `on_sale/upcoming`; lô có lượng giữ/cam kết còn bị cấm đóng hoàn toàn.  
   **Tái hiện:** Tạo lời chào đang chờ, ngừng bán lô, rồi bên kia đồng ý giá.  
   **Sửa:** Thống nhất chính sách đóng lô với backend, xử lý lời chào liên quan nguyên tử và giải thích đúng điều kiện trên UI.

9. **VỪA — Điều kiện giao hàng `delivered` bị hiển thị sai.**  
   **Vị trí:** [ban-hang-hoa.html:507](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:507), [ban-nhu-cau.html:46](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-nhu-cau.html:46).  
   Backend dùng `self_pickup | delivered`, nhưng hai bảng nhãn không có `delivered`. Tấm chào biến điều kiện này thành “Thỏa thuận khi chốt”; màn chi tiết hiện mã thô.  
   **Tái hiện:** Mở nhu cầu có `delivery_mode="delivered"`.  
   **Sửa:** Ánh xạ đúng enum backend, diễn đạt rõ nghĩa vụ giao hàng.

10. **VỪA — Sửa giá làm thay đổi cả lượng hàng lẻ.**  
    **Vị trí:** [ban-hang-hoa.html:572](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:572).  
    `Math.round(qty_g / 1000)` làm mất phần kg lẻ trước khi người dùng sửa. Ví dụ 123.450 g trở thành 123.000 g dù chỉ thay giá.  
    **Tái hiện:** Mở sửa lời chào 123,45 kg, chỉ đổi giá rồi gửi; đã kiểm chứng phép chuyển đổi.  
    **Sửa:** Giữ chính xác số gam, hỗ trợ phần thập phân kg và chuyển đổi bằng số nguyên.

11. **VỪA — Phản hồi lô cũ ghi đè giá gợi ý của lô đang chọn.**  
    **Vị trí:** [ban-hang-hoa.html:556](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:556).  
    `capNhatLo()` không kiểm tra lô còn được chọn sau `await`. Phản hồi A về sau B có thể thay giá thấp nhất và cảnh báo bằng dữ liệu A trong khi biểu mẫu gửi lô B.  
    **Tái hiện:** Chọn A rồi B, cho API B trả trước A; đã tái hiện bằng mock.  
    **Sửa:** Dùng mã thứ tự yêu cầu hoặc hủy yêu cầu cũ; chỉ áp dụng kết quả nếu lô vẫn khớp.

12. **VỪA — Phản hồi của tấm đã đóng có thể sửa tấm mới hoặc gây lỗi JS.**  
    **Vị trí:** [ban-hang-hoa.html:569](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:569), [ban-hang-hoa.html:576](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:576).  
    Các callback truy cập ID toàn tài liệu qua `$()`, trong khi yêu cầu vẫn chạy sau `che.remove()`. Đóng A rồi mở B khiến kết quả A tìm thấy các ID của B; nếu chưa mở B thì gặp `null`.  
    **Tái hiện:** Làm chậm API, mở tấm A, đóng ngay rồi mở tấm B.  
    **Sửa:** Truy vấn trong chính `che`, kiểm tra `isConnected` và hủy yêu cầu khi đóng.

13. **VỪA — Xác nhận gửi thành công có thể khác lượng/giá thực sự đã gửi.**  
    **Vị trí:** [ban-hang-hoa.html:583](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:583), [ban-hang-hoa.html:596](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:596).  
    Khi gửi chỉ khóa nút submit, còn lượng và giá vẫn sửa được. Màn thành công đọc lại các ô sau `await`, thay vì dùng payload đã gửi.  
    **Tái hiện:** Gửi 10 kg × 20.000 đ, đổi thành 99 kg × 90.000 đ trong lúc mạng chậm; xác nhận hiện giá trị mới dù payload là giá trị cũ.  
    **Sửa:** Chụp payload bất biến, khóa các ô trong lúc gửi và xác nhận từ kết quả server.

14. **VỪA — Lỗi tải lời chào bị biến thành “chưa có lời chào”.**  
    **Vị trí:** [ban-hang-hoa.html:341](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:341), [ban-lo.html:66](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-lo.html:66), [ban-nhu-cau.html:54](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-nhu-cau.html:54).  
    API lỗi bị đổi thành mảng rỗng; Chợ mất dữ liệu chống chào trùng và màn chi tiết khẳng định sai rằng chưa có chào. Chào lại cùng lô/bên mua sẽ bị unique index từ chối.  
    **Tái hiện:** Cho `/v1/offers` trả 500 trong khi đã có lời chào mở.  
    **Sửa:** Hiển thị trạng thái chưa tải được, cho thử lại và khóa thao tác phụ thuộc dữ liệu này.

15. **VỪA — Xác nhận còn hàng hàng loạt nuốt toàn bộ kết quả lỗi.**  
    **Vị trí:** [ban-hang-hoa.html:354](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:354).  
    `Promise.allSettled()` được gọi nhưng không kiểm tra kết quả; trang luôn tải lại. Một phần hoặc toàn bộ lô không xác nhận được mà người dùng không biết lý do.  
    **Tái hiện:** Cho một lô bị khóa an toàn hoặc mất xác minh rồi bấm “Vẫn còn hàng” hàng loạt.  
    **Sửa:** Tổng hợp số thành công/thất bại, nêu lô lỗi và cho thử lại riêng.

16. **VỪA — Lỗi tải hồ sơ nguồn bị khẳng định thành không có giấy tờ.**  
    **Vị trí:** [ban-lo.html:66](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-lo.html:66), [ban-lo.html:98](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-lo.html:98).  
    `/source-profile` lỗi được đổi thành `null`, sau đó UI hiện “Lô chưa có giấy tờ”. Đây là kết luận dữ liệu sai, không phải trạng thái tải lỗi.  
    **Tái hiện:** Lô có giấy tờ, cho riêng API hồ sơ nguồn trả 500.  
    **Sửa:** Phân biệt chưa tải được hồ sơ với hồ sơ tải thành công nhưng rỗng.

17. **VỪA — Giấy tờ bị thu hồi được ghi là “Bác tự khai”.**  
    **Vị trí:** [ban-lo.html:97](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-lo.html:97).  
    Mọi trạng thái khác `da_xac_minh` bị gom thành tự khai, bao gồm `het_hieu_luc` mà backend trả cho giấy tờ đã thu hồi. Người bán không được cảnh báo giấy tờ không còn hiệu lực.  
    **Tái hiện:** Mở lô của tổ chức có chứng nhận bị thu hồi.  
    **Sửa:** Ánh xạ riêng trạng thái tự khai, xác minh và hết hiệu lực/thu hồi.

18. **VỪA — Chi tiết nhu cầu đã đóng vẫn mời chào hàng.**  
    **Vị trí:** [ban-nhu-cau.html:80](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-nhu-cau.html:80).  
    Màn không xét `n.status` khi hiển thị CTA và không báo nhu cầu đã đóng. Backend vẫn cho đọc chi tiết nhu cầu đóng, nhưng từ chối gửi lời chào mới.  
    **Tái hiện:** Mở lại URL nhu cầu sau khi bên mua đóng phiếu, với người bán còn lô cùng mặt hàng.  
    **Sửa:** Hiện trạng thái nhu cầu và chỉ mời chào khi còn mở.

19. **VỪA — Hai tấm nghiệp vụ thiếu điều khiển modal bằng bàn phím.**  
    **Vị trí:** [ban-hang-hoa.html:271](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:271), [ban-hang-hoa.html:514](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:514).  
    Có `aria-modal` nhưng không chuyển/giữ focus, không làm nền `inert`, không xử lý Escape hay trả focus khi đóng. Tấm Quản lý lô còn chưa có nút đóng trong thời gian chờ API.  
    **Tái hiện:** Mở tấm bằng Enter, dùng Tab/Shift+Tab và Escape; focus vẫn đi ra nội dung nền.  
    **Sửa:** Dùng `<dialog>` hoặc triển khai đầy đủ vòng đời focus, Escape và nút đóng ngay khi mở.

20. **NHẸ — Cảnh báo sau khi lưu giá bị đọc sai cấu trúc phản hồi.**  
    **Vị trí:** [ban-hang-hoa.html:309](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-hang-hoa.html:309).  
    UI đọc `r.canh_bao`, trong khi `bo.lenh()` đặt kết quả nghiệp vụ tại `r.data`. Vì vậy cảnh báo giá backend trả về không xuất hiện.  
    **Tái hiện:** Lưu mức giá gây cảnh báo so với giá tham khảo.  
    **Sửa:** Đọc `r.data.canh_bao` và hiển thị các câu cảnh báo thực tế.

21. **NHẸ — Ảnh minh họa bị trình bày như ảnh thật của lô.**  
    **Vị trí:** [ban-lo.html:76](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/ban-lo.html:76).  
    Ảnh lớn luôn dùng `ANH_SP()`, nhưng nhãn minh họa biến mất khi `l.photos` có phần tử. UI không hề chuyển sang ảnh của lô.  
    **Tái hiện:** Mở lô đã có ảnh chụp; ảnh danh mục vẫn hiện nhưng không còn nhãn minh họa.  
    **Sửa:** Hiển thị ảnh lô thật; giữ nhãn minh họa khi dùng ảnh danh mục dự phòng.

22. **NHẸ — Nút cuộn nhanh không hoạt động bằng Enter/Space.**  
    **Vị trí:** [chung.js:156](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/chung.js:156).  
    Hành động chỉ gắn với pointer events, không có `click`; kích hoạt `<button>` bằng bàn phím không chạy chức năng lên đầu trang. Nút ẩn bằng opacity cũng vẫn có thể nhận focus.  
    **Tái hiện:** Tab tới nút cuộn nhanh, nhấn Enter hoặc Space.  
    **Sửa:** Xử lý kích hoạt qua `click`, tách thao tác kéo và loại nút khỏi thứ tự Tab khi ẩn.
