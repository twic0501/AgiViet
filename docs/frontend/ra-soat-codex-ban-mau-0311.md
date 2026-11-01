**Chưa đủ để người sáng lập duyệt toàn bộ nghiệp vụ.** Bản mẫu có **đủ 80 mã màn trong danh mục, cộng 5 màn bổ sung**, nhưng nhiều màn mới có nội dung minh họa; nút chưa tạo kết quả, thiếu nhánh ngoại lệ và có lỗi xác nhận tiền nghiêm trọng.

**Phạm vi kiểm chứng:** tôi chỉ đọc, không sửa tệp. Đã dựng thử đầu ra của 85 màn và chạy một số hàm xử lý bằng dữ liệu trong bộ nhớ. Trình duyệt bị từ chối quyền truy cập, nên đây là **thẩm định mã, đường điều hướng và logic mô phỏng; chưa phải kiểm thử bấm thực tế hoặc kiểm tra bố cục 360/390 px**.

Căn cứ: [quy trình v23 — viết tắt QT](/home/twictrn/Documents/AgiViet/mo-phong-quy-trinh-v23-chot-2026-10-28/quy-trinh.json), [brief bán — viết tắt Brief](/home/twictrn/Documents/AgiViet/AgiViet_brief_app_ban_chot_V1.md), [danh mục 80 màn](/home/twictrn/Documents/AgiViet/AgiViet_danh_muc_man.csv), [prompt mua V2](/home/twictrn/Documents/AgiViet/AgiViet_prompt_app_mua_V2.md).

Lưu ý: ngay trong QT, nhiều mục `can_chot` vẫn ghi **“Chưa chốt”**. Tôi dùng logic tình huống v23 để đối chiếu, nhưng các tỷ lệ, thời hạn hoặc sản phẩm ngân hàng đang đề xuất phải giữ đúng nhãn đó.

**A. Tình huống → mức phủ**

“Thiếu bước” nghĩa là có màn hoặc nội dung liên quan, nhưng chưa đi được hết quy trình. “Thiếu hẳn” nghĩa là chưa có nhánh riêng để người bán thao tác; màn hỗ trợ chung không được tính là đã phủ.

QT có **53 tình huống ghi người bán tham gia**:

| # | Tình huống trong QT | Mức phủ | Đường hiện có → phần thiếu/sai |
|---|---|---|---|
| 1 | `chinh` — đơn chính | Thiếu bước | `chat → ký → kiểm tiền → bàn giao → kết quả`. Thiếu giữ lô để thẩm định, phiếu nghĩa vụ, đối soát và xử lý hàng trả lại. |
| 2 | `lay-tai-vuon` | Thiếu bước | Có `ban-giao`; thiếu hai số cân, trừ bì, chốt ngoại quan tại vườn, tiêu chí kiểm sau và biên bản bàn giao. |
| 3 | `vuon-du-luong-khong-dat` | Thiếu hẳn | Thiếu yêu cầu kiểm lại, cách ly hàng, hoàn tiền hàng, hoàn phí và xử lý hàng riêng biệt. |
| 4 | `hai-ket-qua-khac` | Thiếu hẳn | Thiếu phòng trọng tài, chia phí ứng, kết luận chất lượng và trách nhiệm gây sai lệch riêng. |
| 5 | `vuon-bien-the` | Thiếu bước | Có màn nhập mã nhưng không kiểm mã; thiếu sai người/xe, thiếu tải, dừng bốc, hạ giá tại chỗ, khiếu nại sau giao. |
| 6 | `den-xem-hang` | Thiếu bước | `chat → hen-xem → chat`; không lưu lịch, người đến, phạm vi mở liên lạc hoặc kết quả “xem rồi không mua”. |
| 7 | `tra-sau-ngan-hang` | Thiếu hẳn | Không có cam kết thanh toán theo đơn thay cọc, điều kiện/hạn hiệu lực và tiền ngân hàng trả toàn bộ. |
| 8 | `tra-sau-mua-vi-pham` | Thiếu hẳn | Thiếu từ chối nhận, kiểm định đạt, bồi thường theo cam kết và bán lại lô. |
| 9 | `tien-mat` | Thiếu hẳn | Không chọn tiền mặt, người được ủy quyền, biên nhận và chặn dỡ trước khi đếm đủ. |
| 10 | `chua-tra` | Thiếu bước | Có lựa chọn “Chưa thấy tiền” nhưng xử lý thành nhận đủ; thiếu quá hạn, đối soát 48 giờ, cọc trừ nợ. |
| 11 | `ung-tien` | Thiếu bước | Có màn `ung-tien`, nhưng chỉ báo chưa mở; thiếu đơn đủ điều kiện, phí, khoản ứng và thu hồi gốc. |
| 12 | `ban-vi-pham` | Thiếu bước | Có `huy-don`; thiếu ghi nhận không giao, hoàn phí mua và nghĩa vụ bồi hoàn dịch vụ có chứng từ. |
| 13 | `mua-huy` | Thiếu hẳn | Không có yêu cầu hủy từ bên mua để người bán đồng ý/từ chối và xem cách chia cọc. |
| 14 | `bat-kha-khang` | Thiếu bước | Có lý do mất mùa; thiếu xác minh ảnh hưởng, thương lượng giảm lượng, ký bản sửa và hoàn cọc phần thiếu. |
| 15 | `can-khong-dung` | Thiếu hẳn | Màn đối soát chỉ nói hạ cấp; thiếu hai phiếu cân, bì, cân lại và điểm cân độc lập. |
| 16 | `khac-mau` | Thiếu bước | Có nhắc video/mẫu; thiếu đối chiếu mẫu, nguyên nhân hư do đường và hồ sơ chi phí riêng. |
| 17 | `qua-han-coc` | Thiếu hẳn | Không có hết hạn, xác minh ngân hàng, đóng đơn và nhả đúng lượng. |
| 18 | `de-nghi` | Thiếu bước | Có form đổi lịch/thay đổi; nút gửi chưa xử lý, thiếu chờ trả lời, từ chối, hết hạn và ký lại. |
| 19 | `dat-truoc` | Thiếu bước | `sap-co-hang` mới mô tả lô; thiếu khoảng lượng, công thức giá, cập nhật vườn và tính lại cọc. |
| 20 | `bao-tieu` | Thiếu hẳn | Thiếu hợp đồng vụ, vật tư ứng, nhật ký bắt buộc, trả từng đợt và quyết toán vụ. |
| 21 | `khung` | Thiếu bước | Có thẻ HĐ-0011 và `giao-mot-phan`; thiếu mức bảo đảm, cam kết sắp giao và chặn gọi mới vượt mức. |
| 22 | `nhieu-trang-trai` | Thiếu hẳn | `lo-gop` hiện là HTX ký rồi chia tiền; chưa có mỗi trang trại một hợp đồng, cân và trả riêng. |
| 23 | `kem-loai` | Thiếu bước | Có lô loại 2; thiếu tách lô, bán gấp kín, giá sàn và lựa chọn kho/sơ chế. |
| 24 | `dang-ky` | Thiếu bước | Có đăng ký và chụp giấy; thiếu xác minh hiện trường trước khi mở quyền bán và ba mục phân hạng riêng. |
| 25 | `ngoai-gio` | Thiếu hẳn | Thiếu báo sự cố khẩn, AI tiếp nhận, nhân viên trực và cập nhật chuyến. |
| 26 | `coc-thieu-khong-bu` | Thiếu hẳn | Không thể hiện cọc nhận thiếu, hạn bù, hoàn khoản đã vào và đóng đơn. |
| 27 | `coc-bao-tre` | Thiếu hẳn | Thiếu “Chờ đối soát cọc”, giữ lượng tối đa 6 giờ theo giả định QT và xét giờ tiền thực vào. |
| 28 | `tra-mot-phan` | Thiếu bước | Có ô số tiền nhưng không dùng; thiếu nhiều khoản thanh toán, trả trùng và nghĩa vụ hoàn phần trùng. |
| 29 | `tranh-chap-mot-dong` | Thiếu bước | `ket-qua → tranh-chap` luôn là dòng hạ cấp; không chọn dòng, nhập số đúng hoặc tách khoản đòi thêm. |
| 30 | `thang-tranh-chap-khong-tra` | Thiếu hẳn | Thiếu kết luận thắng, khoản phải trả thêm, hạn 48 giờ và hồ sơ còn mở khi bên mua không trả. |
| 31 | `nghiem-thu-thap` | Thiếu hẳn | Không chia cọc theo giá trị thấp hơn cọc; thiếu hồ sơ lượng hàng bị từ chối. |
| 32 | `da-nhan-nhieu-hon` | Thiếu hẳn | Không có “chị cần hoàn”, chứng từ hoàn và xác nhận của bên mua. |
| 33 | `khong-xac-nhan-hoan` | Thiếu hẳn | Không có nhắc bên mua, đối soát có căn cứ và quyền yêu cầu xem lại. |
| 34 | `ket-hop` | Thiếu hẳn | Không mô phỏng được cân lệch + giao hai đợt + trả thiếu + cọc trừ đợt cuối. |
| 35 | `hang-tra-lai` | Thiếu hẳn | Không ghi người/nơi giữ, hạn xử lý, lấy về/bán tại chỗ/tiêu hủy và chi phí. |
| 36 | `nghiem-thu-im-lang` | Thiếu bước | Có câu “im lặng không đồng ý”; thiếu gia hạn kiểm, nhắc ba lần và chuyển người đối chiếu. |
| 37 | `lenh-ngan-hang-loi` | Thiếu hẳn | Thiếu mã lệnh, đang xử lý/chưa rõ/từ chối, hỏi trạng thái và lệnh thay. |
| 38 | `ngan-hang-bao-sau-huy` | Thiếu hẳn | Không có đối chiếu kết quả đến trễ, hủy yêu cầu hoàn và nghĩa vụ trả lại phát sinh. |
| 39 | `theo-sat-don` | Thiếu hẳn | Thiếu người phụ trách, phạm vi theo sát, mốc tiếp theo, bàn giao ca và hồ sơ bảo hiểm. |
| 40 | `theo-sat-thieu-nguoi` | Thiếu hẳn | Thiếu người bán chấp thuận phạm vi mới và thông báo người tiếp quản. |
| 41 | `nhieu-de-nghi` | Thiếu bước | Có `so-sanh` nhưng chưa có lối vào; không tính tiền ròng, chi phí xe hoặc chọn đề nghị. |
| 42 | `de-nghi-bo-cuoc` | Thiếu hẳn | Không nhả lượng theo hạn ký/cọc, phân biệt chờ đối soát và hỏi lại đề nghị còn hiệu lực. |
| 43 | `khong-co-dau-ra` | Thiếu hẳn | Thiếu nhân viên can thiệp, đề nghị tách lô và rút riêng phần chưa bị ràng buộc. |
| 44 | `dinh-ky` | Thiếu hẳn | Thiếu lời mời nguồn, lượng phần mình, kỳ trả riêng và xác nhận cam kết từng chuyến. |
| 45 | `dinh-ky-thieu-luong` | Thiếu hẳn | Thiếu báo lượng giao được, nguồn thay và giữ nguyên tiền các nguồn giao đúng. |
| 46 | `dinh-ky-thieu-giay-to` | Thiếu hẳn | Thiếu giấy sắp hết hạn, chặn giao, gửi giấy mới và chờ duyệt lại. |
| 47 | `dinh-ky-tra-tien` | Thiếu hẳn | Thiếu chấp thuận kỳ trả, tiền từng nguồn và khiếu nại sau giao có điều kiện. |
| 48 | `dinh-ky-3-ngay` | Thiếu hẳn | Thiếu công nợ chồng, hạn mức nợ và chấp thuận giảm lượng sau hạn chốt. |
| 49 | `dinh-ky-no-qua-han` | Thiếu hẳn | Thiếu dừng cam kết mới dù còn hạn mức; hỏi người bán về chuyến đã chốt. |
| 50 | `dung-dinh-ky` | Thiếu hẳn | Thiếu tách dự báo/chuyến cam kết/nợ/chi phí chuẩn bị và quyết toán bảo đảm. |
| 51 | `agiviet-lam-sai` | Thiếu hẳn | Thiếu báo xe sai, dừng bốc, nhận lỗi, phương án thay và chi phí AgiViet chịu. |
| 52 | `mau-hong` | Thiếu hẳn | Thiếu mẫu không hợp lệ, kiểm mẫu lưu, hạn bảo quản và phí khắc phục chờ xác định lỗi. |
| 53 | `khong-con-doi-tac` | Thiếu hẳn | Thiếu lựa chọn phương án, chi phí tối đa, hai bên chấp thuận và giới hạn giữ hàng. |

**Sáu tình huống còn lại không ghi vai `ban`**, nên không yêu cầu dựng giao diện nội bộ lên app bán:

| Tình huống | Phần cần phản ánh cho người bán |
|---|---|
| `sau-don` | Gợi ý hợp tác tiếp; chưa có nhánh cụ thể. |
| `quan-tri` | Chỉ cần thấy kết quả áp dụng và trạng thái chờ xử lý; thiếu hiện tại. |
| `coc-sai` | Thấy cọc thiếu/chờ bù/đã đủ, không mở giao dịch sớm; thiếu. |
| `coc-sau-dong` | Đơn vẫn đóng, không tự sống lại hoặc khóa lại lượng; chưa mô phỏng. |
| `dang-ky-mua` | Phải phân biệt khách hỏi với bên mua đã đủ quyền cam kết. |
| `phat-hien-sau-xuat` | QT chưa chỉ rõ bước người bán tham gia; **chưa có căn cứ** tự thêm quyền kết luận hoặc buộc hoàn tiền. |

Ngoài các ID trên, Brief còn yêu cầu **hủy trước cọc, xe trễ, thiếu lượng do ước sai/không báo, người giúp và đổi tài khoản 24 giờ**. Các nhánh này đều chưa chạy đầy đủ.

**B. Lỗi nghiệp vụ, từ Nặng → Nhẹ**

1. **Xác nhận “chưa nhận” vẫn thành nhận đủ — nghiêm trọng nhất.**  
   [man-3.js:132](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/man-3.js:132): hàm `kiem-tien` không đọc lựa chọn hoặc số tiền nhập; luôn báo **“Đã xác nhận nhận đủ 32.200.000 đ”**, chuyển bước 6 → 7. Đúng phải ghi số thực nhận; nhận 20 triệu thì còn thiếu 12,2 triệu và chưa cho bốc. Căn cứ: QT `tra-mot-phan`, `vuon-bien-the` bước 5; Brief §3.5, §13.7.

2. **Mã nhận hàng sai vẫn được chấp nhận.**  
   [man-3.js:138](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/man-3.js:138): không đọc/so mã; chạy hàm với mã sai vẫn chuyển sang đã bàn giao. Thiếu kiểm người nhận, xe, quyền nhận và điều kiện sẵn sàng giao. Căn cứ: QT `lay-tai-vuon` bước 4–5, `vuon-bien-the` bước 1.

3. **Có thể bỏ qua quy trình bằng màn mở thẳng.**  
   `ky-otp` cho bước 0 → 3; `danh-gia` cho bước 0 → 15. Đã kiểm được trong bộ nhớ. Đúng phải kiểm điều kiện tại hành động, kể cả khi vào bằng hash. Đánh giá không được làm phát sinh trạng thái hoàn tất. Căn cứ: QT `chinh` bước 17–21, 44–48; Brief §17.

4. **Đóng đơn khi còn 30 kg trả lại chưa xử lý.**  
   `danh-gia`, `viecDon`: sau đánh giá báo hoàn tất, không có hồ sơ hàng. QT yêu cầu tách **đã quyết toán mua bán / hồ sơ còn mở / hoàn tất toàn bộ**. Căn cứ: QT `chinh` bước 45–48; `he_thong.quy_tac` — “Hoàn tất”.

5. **Báo ngân hàng đã giữ cọc trước khi ngân hàng xác nhận.**  
   [man-3.js:7](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/man-3.js:7): `b >= 4` đã hiện giữ 13,8 triệu, trong khi bước 4 đang chờ ngân hàng. Chỉ được xác nhận giữ sau bước ngân hàng hoàn thành. Căn cứ: QT `chinh` bước 26–28; Brief §13.4.

6. **Gộp phí giới thiệu vào khoản chuyển tới ngân hàng giữ cọc.**  
   `BUOC[3]`, `ky-xong` gọi **13.938.000 đ là cọc**, hướng dẫn chuyển vào ngân hàng. V23 chỉ cho tài khoản cọc nhận **13.800.000 đ**; **138.000 đ là hóa đơn phí riêng của bên mua**. Căn cứ: QT `chinh` bước 24, 29; `dong_chay`. Tổng chi theo ví dụ mua vẫn giữ nguyên, nhưng phải tách đường tiền.

7. **Liên lạc không gắn với trạng thái cọc.**  
   T1 giữ `moLienLac:false` dù đã chạy qua ngân hàng; màn `mo-lien-lac` lại hiện số thật vô điều kiện khi mở trực tiếp. Đúng phải dựa trên cọc đã xác nhận hoặc cam kết ngân hàng hợp lệ, với ngoại lệ khảo sát có phạm vi riêng. Căn cứ: QT `chinh` bước 28, `tra-sau-ngan-hang` bước 5, `den-xem-hang`.

8. **Không có phân quyền hành động thực sự trong mô phỏng.**  
   `nguoi-giup` chỉ có lời giải thích; ký, chốt cân, xác nhận tiền và đổi tài khoản không nhận biết người đang thao tác. V23 còn phân biệt người tạo tài khoản, đại diện ký và chủ tài khoản ngân hàng. Căn cứ: QT `quyen`, Brief §16.

9. **Cho thương lái gom hàng đi vào app bán.**  
   [man-1.js:27](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/man-1.js:27): lựa chọn “Tôi gom hàng của nhiều nhà — Thương lái, vựa đầu mối” vẫn đi tiếp. QT `vai[id=ban]` chỉ nhận nơi trực tiếp sản xuất, HTX bán hàng thành viên; không nhận thu gom bán lại.

10. **Thiếu cửa xác minh hiện trường trước khi mở quyền bán.**  
    `xac-minh` cho vào tài khoản đã có sẵn trạng thái xác minh và đăng bán. Chụp căn cước chưa thay thế xác minh nơi sản xuất. Căn cứ: QT `dang-ky`, `dich_vu.ds` — xác minh người bán.

11. **Chọn cách trả tiền nhưng không thay đổi hợp đồng; còn gán sai rủi ro đường.**  
    `phuong-thuc`: lựa chọn không được lưu, hợp đồng vẫn trả trước bốc. Câu “Trả khi nhận tại kho — bác chịu rủi ro đường đi” sai vì rủi ro còn phụ thuộc ai chở và mốc bàn giao. Căn cứ: QT `lay-tai-vuon` bước 1, `chinh` phiếu nghĩa vụ; Brief §13.5.

12. **Không quản lý lượng đã giữ/đã cam kết.**  
    Đồng ý giá không trừ lượng khả dụng; `cap-nhat-luong` cho lưu thấp hơn nghĩa vụ đã hứa; `chon-luong` không đọc lượng hoặc chặn vượt 80%. Căn cứ: QT `he_thong.quy_tac` — giữ lượng ba giai đoạn, đăng lô; Brief §13.1.

13. **Hợp đồng và sửa đổi không có một phiên bản thống nhất.**  
    `ky` là bản 1 giao 28/10; `so-ban` báo bản 2 hiệu lực giao 29/10; đổi lịch không tạo đề nghị hoặc khóa ký. Bản cũ phải giữ hiệu lực tới khi bản sửa được ký đủ. Căn cứ: QT `de-nghi`, `bat-kha-khang` bước 11; Brief §13.3.

14. **Chỉ lời cảnh báo cách ly, chưa có điều kiện chặn.**  
    `kiem-tra → xem-lai → xong` vẫn đi được với ngày hái 27/10 trong khi màn vườn báo cách ly tới 09/11. Không được chỉ yêu cầu người bán tự nhớ. Căn cứ: Brief §13.1; QT quy tắc “Ngày hết cách ly”.

15. **Phản đối luôn bị gán thành một tranh chấp có sẵn.**  
    `ket-qua → tranh-chap` luôn phản đối toàn bộ 120 kg hạ cấp; không cho chọn cân, lượng, giá hay dòng trả lại. Đúng phải lưu phần công nhận và phần đòi thêm riêng. Căn cứ: QT `tranh-chap-mot-dong`, `can-khong-dung`.

16. **Tiền “còn chờ” không hết sau khi đã nhận cọc.**  
    Ở bước 13–14, bảng tiền hiện đã nhận **44.350.000 đ**, nhưng vẫn còn chờ **12.150.000 đ**. Sau ngân hàng xác nhận trả thành công, khoản còn chờ này phải bằng 0; hồ sơ hàng/phí còn mở được hiển thị riêng.

17. **Hủy/mất mùa diễn đạt như kết luận tự động.**  
    `huy-don`, `quyen`: “có giấy xã” chưa đủ để tự miễn trách; phải xét sự kiện, ảnh hưởng, thông báo và giảm thiệt hại. Thiếu bồi hoàn dịch vụ có căn cứ và khoản đã trả thẳng. Căn cứ: QT `bat-kha-khang`, Q05, `ban-vi-pham`; Brief §13.11.

18. **Hợp đồng khung bị biến thành “trả đợt trước mới giao đợt sau”.**  
    `giao-mot-phan` áp quy tắc này tuyệt đối, trong khi QT kiểm tổng nợ + cam kết với mức bảo đảm. Đồng thời Brief cho “nợ thêm”, nhưng v23 nói phần vượt qua ngân hàng: cần thống nhất tài liệu trước khi dựng. Căn cứ: QT `khung` bước 4, Q12; Brief §13.10.

19. **Đăng hàng, nhật ký và báo giá báo xong nhưng không lưu kết quả tương ứng.**  
    `xong` báo L-0415 nhưng “Xem lô” mở L-0412; nhật ký chỉ toast; “Gửi chào hàng” chỉ mở T1; nhiều nhu cầu khác nhau đều mở hồ sơ Đồng Xanh. Đây là thiếu của mô phỏng, không phải yêu cầu nối backend.

20. **UX chưa đạt brief cho người đọc chậm.**  
    [ban.css:58](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/ban.css:58): nút chính 52 px, chữ 16 px; nhiều nội dung 13–15 px. Brief yêu cầu nút chính ≥56 px, chữ thân ≥17 px. Thiếu “Nghe” dùng được, chỉnh cỡ chữ thật; dùng “bác” thay xưng hô theo hồ sơ. Chưa kiểm chứng tràn ngang bằng trình duyệt.

**C. Màn/trạng thái cần thêm**

**1. Kết quả soát từng màn trong danh mục 80**

Ngoài nơi ghi **“lệch mục đích”**, màn đã có nội dung nền đúng hướng, nhưng còn thiếu phần ghi bên dưới.

**Thiếu chung:** chưa có bộ trạng thái thực sự cho từng màn: trống, tải, lỗi, mất mạng, bị chặn, chờ, hết hạn và hoàn thành. `trang-thai` chỉ trưng bày vài ví dụ; chưa áp các trạng thái đó vào quy trình. Nhiều bộ lọc chỉ đổi màu nút, không lọc dữ liệu.

| STT | Mã màn | Thiếu hoặc lệch mục đích |
|---|---|---|
| 1 | `chao-mung` | Lối vào cho người mới; đăng nhập lại phải tách đăng ký. |
| 2 | `dang-nhap` | Số không hợp lệ, đang gửi, gửi lỗi. |
| 3 | `otp` | Mã sai/hết hạn, gửi lại thật, gọi đọc mã. |
| 4 | `vai-tro` | Loại tổ chức đúng v23; chặn người bán lại. |
| 5 | `mat-hang` | Lưới ảnh/tìm kiếm; chọn nhiều hiện bị xử lý như chọn một. |
| 6 | `ho-so` | Lưu thông tin; tổ chức, đại diện và ủy quyền. |
| 7 | `khai-bao-vuon` | Bỏ qua, nhiều vườn/ao, năm trồng và vụ. |
| 8 | `xac-minh` | Chờ hiện trường, hỏi thêm, từ chối, duyệt. |
| 9 | `tro-giup-truy-cap` | Mất máy; kết quả đổi số/khôi phục. |
| 10 | `hom-nay` | Người mới, nhiều việc, hạn cụ thể, ví và cảnh báo cách ly. |
| 11 | `tong-ket-tuan` | Đã bán/chi/lời, so tuần trước; đúng khoảng ngày. |
| 12 | `thong-bao` | Mã bước, gửi/đọc/đã làm, dữ liệu theo tiến trình. |
| 13 | `vuon` | **Thiếu lối vào bình thường**; danh sách vườn/ao và mức đầy đủ. |
| 14 | `mua-vu` | Sản lượng toàn vụ, đậu trái, bán và đăng từ vụ. |
| 15 | `nhat-ky` | Lọc vườn/tháng, xem lịch sử, thêm ảnh được. |
| 16 | `thu-chi` | Theo vụ, lời/lỗ, tiền mới tự vào và giá vốn. |
| 17 | `ghi` | Nhận dạng/lỗi mic; gõ hoặc chụp hóa đơn. |
| 18 | `xac-nhan-ghi` | Sửa từng trường và lưu thật vào dữ liệu mô phỏng. |
| 19 | `cach-ly` | Tính theo vườn/lô; thiếu thông tin thuốc; chặn ngày hái. |
| 20 | `ho-so-vuon` | QR, phạm vi chia sẻ, liên kết từng nhật ký/chứng từ. |
| 21 | `hang` | Lượng giữ/hứa/giao, bốn nhóm, xác nhận còn hàng. |
| 22 | `chi-tiet-lo` | Đơn liên quan, nguồn gốc, sửa tin, bán bớt. |
| 23 | `cap-nhat-luong` | Lưu kiểu ước/cân; cảnh báo thấp hơn cam kết. |
| 24 | `sap-co-hang` | Form đăng trước và nhánh hợp đồng đặt trước. |
| 25 | `chung-tu` | Xem/tải giấy, ngày hết hạn, lô áp dụng và trạng thái duyệt. |
| 26 | `lo-gop` | Thêm hộ, giấy tờ, cân/chia tiền và trạng thái từng hộ. |
| 27 | `dang` | Đăng từ mùa vụ; đường “Gõ” đang dẫn qua chụp. |
| 28 | `chon-mat-hang` | Danh mục ảnh, tìm kiếm, lưu lựa chọn, hàng chưa xác minh. |
| 29 | `chup` | Chụp/chọn/xóa ảnh; giờ, vị trí, ảnh mờ. |
| 30 | `nghe` | Nói lại/Nói xong; ghi nhận thay đổi. |
| 31 | `kiem-tra` | Kiểm dữ liệu, cách ly, thước giá và cảnh báo giá. |
| 32 | `xem-lai` | Dùng dữ liệu vừa nhập; ẩn giá người bán trong tìm nguồn. |
| 33 | `xong` | Tạo đúng lô mới và mở đúng lô. |
| 34 | `khach` | Lọc thật; phân biệt chưa đọc với cần trả lời. |
| 35 | `nhu-cau` | Truyền đúng mã bên mua/nhu cầu/lô sang màn sau. |
| 36 | `ket-noi` | Thiếu lối vào; từ chối/báo cáo có kết quả. |
| 37 | `ho-so-ben-mua` | Hồ sơ đúng bên; số đơn, năm hoạt động, mẫu số uy tín. |
| 38 | `chat` | Luật liên lạc đầy đủ, khóa có hạn, gọi, trạng thái gửi lỗi. |
| 39 | `bao-gia` | Gửi thẻ giá thật, hạn/lượt, lượng còn bán. |
| 40 | `hen-xem` | Đổi giờ, chấp thuận, hủy, mở liên lạc riêng chuyến. |
| 41 | `bao-cao` | Ảnh, mã yêu cầu, đã gửi/đang xử lý/kết quả. |
| 42 | `lich` | Bốn nhóm, lịch thật, mở được mọi đơn. |
| 43 | `chi-tiet-don` | Lịch sử sự kiện thật, hồ sơ còn mở, điều kiện từng bước. |
| 44 | `xac-nhan-don` | Thiếu lối vào; kiểm lượng, từ chối có lý do. |
| 45 | `so-sanh` | Thiếu lối vào; tiền ròng, chi phí và chọn đề nghị. |
| 46 | `phuong-thuc` | Thiếu lối vào; lưu cách trả, mức bảo vệ, cam kết ngân hàng. |
| 47 | `chon-luong` | Lưu lượng và chặn vượt giới hạn. |
| 48 | `ky` | Đủ nghĩa vụ, rủi ro, người ký, mục đang đề nghị và khóa ký. |
| 49 | `quyen` | Điều khoản có số thật, đúng loại đơn; nghe được. |
| 50 | `ban-day-du` | Toàn văn thật; hiện tại chỉ sáu đoạn có dấu “…”. |
| 51 | `ky-otp` | Kiểm OTP, quyền ký, phiên bản, điều kiện và lỗi. |
| 52 | `ky-xong` | Tách đã ký với có hiệu lực; cọc/phí riêng. |
| 53 | `ky-giay` | Thiếu lối vào; bản in/ảnh từng trang, kiểm đủ chữ ký. |
| 54 | `so-ban` | Thiếu lối vào; lịch sử từ dữ liệu, bản chờ ký/hiệu lực. |
| 55 | `coc` | Thiếu lối vào; chưa/thiếu/đủ/chờ đối soát/chuyển/hoàn. |
| 56 | `mo-lien-lac` | Thiếu lối vào; điều kiện mở, địa chỉ, lưu liên hệ. |
| 57 | `ket-qua` | Lý do/ảnh từng dòng, nguồn duyệt, phản đối từng dòng. |
| 58 | `giao-mot-phan` | **Lệch mục đích:** đang là đợt khung, chưa xử lý thiếu/giao bù. |
| 59 | `doi-lich` | Gửi đề nghị, ảnh, chờ/đồng ý/từ chối/hết hạn. |
| 60 | `yeu-cau-thay-doi` | Giá trị cũ/mới, hệ quả tiền, ký lại. |
| 61 | `huy-don` | Trước/sau cọc, bên nào xin, tiền/hàng/phí riêng. |
| 62 | `tranh-chap` | Chọn loại bất đồng, dòng, số đúng, người xử lý và kết luận. |
| 63 | `tien` | Tổng đúng sổ, mọi đơn, khoản phải hoàn và nguồn xác nhận. |
| 64 | `tien-ve` | “Chưa thấy” có xử lý; đúng giờ/kết quả ngân hàng. |
| 65 | `quyet-toan` | Theo số đã chốt; bồi hoàn/phí tách riêng; nghe được. |
| 66 | `lich-su-tien` | Khoản HĐ-0018, lọc đơn, chứng từ và trạng thái. |
| 67 | `ung-tien` | Đủ nội dung minh họa khoản vay; nhãn đang đề xuất. |
| 68 | `toi` | Sửa hồ sơ, hồ sơ công khai và đăng xuất. |
| 69 | `uy-tin` | Ba mục riêng, cách tính, nhận xét gắn đơn. |
| 70 | `dich-vu` | Đơn dịch vụ đang chạy, phân biệt xe/kho/kiểm nghiệm. |
| 71 | `dat-dich-vu` | **Sai khi vào từ xe/kho:** luôn đặt kiểm dư lượng. |
| 72 | `cai-dat` | Cỡ chữ/tốc độ đọc thực sự đổi; âm thanh/rung/ngôn ngữ. |
| 73 | `ho-tro` | Hướng dẫn theo loại trả tiền, đường hỗ trợ khẩn. |
| 74 | `can-ho-tro` | Đính kèm, mã yêu cầu, người nhận và tiến độ xử lý. |
| 75 | `trang-thai` | Thiếu lối vào kiểm thử; phải áp trạng thái lên màn thật. |
| 76 | `nguoi-giup` | Mời/nhận/thu hồi, quyền Xem/Bấm thay, nhật ký hành động. |
| 77 | `tai-khoan-nhan` | Nhập mới, kiểm tên, OTP, chờ 24 giờ, hủy yêu cầu. |
| 78 | `bao-mat` | Danh sách thiết bị, báo mất máy, kết quả thu hồi phiên. |
| 79 | `rieng-tu` | Ngoại lệ khảo sát; phần nào chia sẻ trước/sau giao dịch. |
| 80 | `phan-cua-toi` | **Lệch hẳn mục đích:** đang là giấy tờ; phải là lượng/tiền của hộ trong lô gộp. |

**2. Những màn/nhánh cần thêm ngoài việc hoàn thiện 80 màn**

| Màn/nhánh | Nội dung chính | Vào từ |
|---|---|---|
| Giữ lô và thẩm định | Lượng, hạn, đồng ý giữ, lịch lấy mẫu, kết quả, nhả lượng | Lời mời mua/chi tiết lô |
| Phiếu nghĩa vụ bên bán | Lượng chắc giao, đóng gói, người ký, nhận tiền, mốc rủi ro | Sau đồng ý giá |
| Sẵn sàng giao | Tiền, hàng, người, xe, hồ sơ, mẫu; chỉ rõ dòng đang thiếu | Chi tiết đơn |
| Biên bản cân/bốc/bàn giao | Cân cả bì, bì, cân tịnh, thùng, ảnh, niêm mẫu, chữ ký | Sẵn sàng giao |
| Xe trễ/đã sẵn hàng | Chứng cứ, giờ sẵn hàng, giờ trễ, đề nghị xử lý | Sẵn sàng giao |
| Chị cần hoàn tiền | Đã nhận, giá trị chấp nhận, phải hoàn, đã hoàn được xác nhận | Quyết toán |
| Theo dõi lệnh ngân hàng | Mã lệnh, gửi/xử lý/chưa rõ/từ chối/thành công/đối soát | Cọc, quyết toán |
| Xử lý hàng trả lại | Nơi/người giữ, hạn, lựa chọn xử lý, chi phí, biên bản | Kết quả nghiệm thu |
| Kiểm định và kết luận | Mẫu, đơn vị, phí ứng, hạn, kết quả, quyền xem lại | Phản đối |
| Hợp đồng đặc biệt | Đặt trước; bao tiêu; khung; phần hợp đồng từng nguồn | Đơn |
| Định kỳ — phần của tôi | Lời mời, cam kết, hạn mức nợ, từng khoản đến hạn | Hôm nay/Đơn |
| Sự cố và theo sát | Người phụ trách, ca trực, phương án, ai duyệt chi | Chi tiết đơn/Hỗ trợ |
| Thử trạng thái mô phỏng | Chọn tình huống và sự kiện bên kia/ngân hàng | Bàn thiết kế |

Bộ thử mô phỏng nên giữ nguyên các nút mô phỏng hiện có, bổ sung nhánh ngoại lệ và cho đặt lại **toàn bộ dữ liệu liên quan**, thay vì chỉ đặt `hd.buoc = 0`.

**D. Dữ liệu mô phỏng cần sửa/thêm**

1. **Các số cốt lõi HĐ-0018 đang tính đúng:**

   `1.850 × 23.000 + 120 × 15.000 = 44.350.000 đ`  
   `44.350.000 − 32.200.000 = 12.150.000 đ`  
   `13.800.000 − 12.150.000 = 1.650.000 đ`

   Giữ các số này; tách phí **138.000 đ** khỏi cọc.

2. **Ví tháng 10 đang thành 73.110.000 đ, không phải 62.750.000 đ.**  
   Mã tính `28.760.000 + 32.200.000 + 12.150.000`. Để khớp Brief, tổng đã nhận trước HĐ-0018 phải là **18.400.000 đ**. Cần dựng sổ chi tiết cộng đúng con số này; không chỉ thay tổng trên thẻ.

3. **HĐ-0009 không khớp cọc 30%.**  
   Thu 27,6 triệu nhưng cọc 7,2 triệu. Nếu giữ giá trị hợp đồng **27.600.000 đ**, cọc chuẩn là **8.280.000 đ**, trả thẳng **19.320.000 đ**; nếu giữ cọc 7,2 triệu phải bổ sung lịch sử điều chỉnh hợp đồng có căn cứ.

4. **Sửa thứ theo năm 2026:**  
   26/10 **thứ Hai**; 27/10 **thứ Ba**; 28/10 **thứ Tư**; 29/10 **thứ Năm**; 30/10 **thứ Sáu**. Mẫu đang dùng nhiều thứ của năm 2025.

5. **Chọn một đồng hồ mô phỏng.**  
   Trang chủ đang 27/10, nhật ký đã có lần phun 02/11, cách ly báo “7 ngày nữa”, tuần 20–26 lại tính tiền về 28/10. Đề xuất khởi đầu **26/10/2026 09:06**, các sự kiện sau chỉ xuất hiện khi tiến thời gian; lần phun 02/11 là tình huống tương lai riêng.

6. **Chuẩn hóa mùa vụ và lượng.**  
   Mùa vụ ghi hái đầu 27/10, nhật ký ghi 29/10; cả hai chỉ 350 kg, chưa giải thích nguồn 2.000 kg giao 28/10. Đề xuất bổ sung bản ghi thu hoạch đủ **2.000 kg trước 5:30 ngày 28/10**, cùng liên kết lô; 350 kg là đợt khác có mã riêng.

7. **3.200 trái chưa giải thích được lượng toàn vụ.**  
   Với cỡ mẫu 350–550 g, 3.200 trái tương ứng khoảng **1.120–1.760 kg**. Phải ghi đây là một đợt bao trái hoặc bổ sung số trái các đợt khác. **Chưa có căn cứ** kết luận năng suất/ha phi thực tế chỉ từ các số hiện có.

8. **Hồ sơ khác Brief mà không có lịch sử:**  
   1,2 ha ↔ **2,4 ha**; 31 đơn ↔ **18 đơn**; “VietGAP chưa có” ↔ “VietGAP”. Đề xuất dùng đúng bộ Brief cho chị Năm, hoặc ghi rõ hồ sơ đã được thay đổi có chủ đích.

9. **Chứng từ tự mâu thuẫn.**  
   Kiểm dư lượng 15/10 ở `chung-tu` là đã xác minh, ở `phan-cua-toi` là chờ duyệt. Dùng cùng mã giấy, trạng thái, ngày lấy mẫu và **lô được áp dụng**.

10. **Bếp Sen đang bị rút thành 50 kg xoài/tuần.**  
    Nếu giữ ví dụ Brief, phải là **30 kg xoài ×26.000 + 20 kg thanh long ×19.000 = 1.160.000 đ**. Phần hạn mức cho nợ thêm phải đánh dấu đang mâu thuẫn v23, chưa coi là đã duyệt.

11. **Cọc đặt trước trong chính Brief cần làm rõ.**  
    Khoảng 1,8–2,2 tấn, sàn 20.000 đ: cọc tối thiểu là **10.800.000 đ**. Chốt 2,1 tấn ×24.000 → cọc **15.120.000 đ**, bổ sung **4.320.000 đ**. Con số bổ sung **1.320.000 đ** chỉ đúng nếu cọc cũ là 13,8 triệu; tài liệu chưa giải thích cơ sở cọc cũ.

12. **Bổ sung ba bộ số để duyệt ngoại lệ:**

    | Biến thể | Số phải hiện |
    |---|---|
    | Nhận thiếu | Nhận **20.000.000**, thiếu **12.200.000**, chưa bốc |
    | Nhận thừa so nghiệm thu | Giá trị **29.100.000**, đã nhận **32.200.000**, hoàn cọc mua **13.800.000**, chị phải hoàn **3.100.000** |
    | Phản đối 60/120 kg hạ cấp | Khoản đòi thêm **60 ×(23.000−15.000) = 480.000 đ**, ghi chưa được bảo đảm theo logic v23 |

13. **Thuốc và dịch vụ cần nhãn giả định rõ.**  
    “Abamectin → 7 ngày” chưa có tên thương phẩm, chế phẩm và hướng dẫn áp dụng; **chưa có căn cứ** xác nhận ngày cách ly. Giá kiểm nghiệm 850.000–1.100.000 đ, hẹn 12–24 giờ, tên đơn vị, tuyến 180 km và hotline cũng chưa có bằng chứng dịch vụ thật. Nên ghi “minh họa”, không trình bày như lịch/báo giá được bảo đảm.

14. **Hạn cọc và giờ tiền về đang khác nguồn.**  
    HĐ-0018 dùng 48 giờ theo prompt mua; QT mặc định hàng tươi 12 giờ. Giữ 48 giờ cho ví dụ này theo yêu cầu, nhưng ghi rõ điều khoản riêng. Tiền cọc về **15:42** trong mẫu khác **12:05** trong Brief; chọn một mốc và dùng xuyên suốt.

**E. Lỗ hổng chặn liên lạc**

Đã gọi trực tiếp `quetLienLac()` trong [man-2.js:7](/home/twictrn/agiviet-production-v2/frontend/thiet-ke/mau/man-2.js:7), có các kết quả sau:

| Chuỗi thử | Kết quả hiện tại | Vấn đề |
|---|---|---|
| `https://example.com/lienhe` | Cho qua | Không bắt đường dẫn |
| `example.vn` | Cho qua | Không bắt tên miền |
| `0/9/1/8/2/3/4/4/2/1` | Cho qua | Dấu `/` lách nhận diện số |
| `khong chin mot tam hai ba bon bon hai mot` | Cho qua | Không chuẩn hóa đủ chữ không dấu |
| `không,chín,một,tám,hai,ba,bốn,bốn,hai,một` | Cho qua | Chỉ tách theo khoảng trắng |
| `za lo namvuon` | Cho qua | Tách từ lách tên kênh |
| `Zalo: namvuon0918` | Chỉ che “Zalo” | Tên tài khoản vẫn còn |
| `32.200.000 đ` | Bị tính vi phạm | Nhầm số tiền thành liên lạc |
| Số đọc bằng chữ kèm `fb` | Số chữ còn nguyên | Che `fb` làm nhánh che cả số chữ không chạy |

Các lỗi khác:

1. **Ảnh chưa được kiểm:** nút chỉ chèn ảnh xoài cố định; lời nhắc “ảnh có số/QR sẽ bị chặn” chưa có mô phỏng đạt/bị chặn/chờ kiểm.
2. **Khóa 24 giờ không có giờ kết thúc:** chỉ lưu `viPham >= 3`; không có thời điểm khóa hoặc mở lại.
3. **Khóa không bao phủ hành động:** vẫn gửi được ảnh và thẻ trả giá sau khi khóa nhắn chữ.
4. **Bộ đếm dùng chung nhưng thiếu ngữ cảnh:** không có hồ sơ lần vi phạm, nội dung, người vi phạm, giải trình hoặc cảnh báo nhầm.
5. **Không ghép các tin để nhận diện số chia nhỏ**, ví dụ gửi từng cụm số trong nhiều tin.
6. **Mở liên lạc không đồng bộ cọc**, như lỗi B7; cũng thiếu ngoại lệ khảo sát có chấp thuận.
7. **“Ba lần khóa 24 giờ” chưa có căn cứ là chính sách đã chốt.** Brief chỉ nói lặp lại thì giảm hiển thị/khóa tạm; QT nhấn mạnh che số là hỗ trợ, không chặn tuyệt đối giao dịch ngoài.

Đề xuất cho bản mẫu: có sẵn ca **tin sạch / số tiền hợp lệ / liên lạc bị che / ảnh chờ kiểm / khóa tới giờ cụ thể / khiếu nại chặn nhầm**, thay vì giả định bộ lọc hiện tại đã đúng.

**F. Kết luận và năm việc sửa trước**

Bản mẫu **đủ để xem hướng giao diện và diễn giải luồng thuận HĐ-0018**, nhưng **chưa đủ duyệt từng màn như một quy trình bán hoàn chỉnh**. Có đủ tên màn không đồng nghĩa đủ hành vi hoặc trạng thái.

Năm việc nên sửa trước:

1. **Sửa điều kiện xác nhận:** tiền đúng số, mã nhận hàng, quyền người thao tác, điều kiện ký và điều kiện hoàn tất.
2. **Làm trọn HĐ-0018 cùng ba biến thể bắt buộc:** nhận thiếu, hoàn 3,1 triệu, phản đối từng dòng; bổ sung hồ sơ 30 kg trả lại.
3. **Đồng bộ tiền–lượng–thời gian–phiên bản:** cọc/phí riêng, sổ tiền đúng tổng, lượng giữ/cam kết, ngày giờ thống nhất.
4. **Nối các màn và trạng thái còn đứt:** gửi đề nghị phải có chờ/kết quả/hết hạn; mọi nút chính phải tạo kết quả mô phỏng có thể kiểm tra.
5. **Hoàn thiện khả năng dùng cho người lớn tuổi và chặn liên lạc:** chữ/nút đúng Brief, Nghe hoạt động, thông báo rõ ai làm gì; kiểm lại bộ lọc và khóa có thời hạn.

Giới hạn kiểm chứng còn lại: quyền truy cập trình duyệt đã bị từ chối, nên tôi chưa xác nhận thao tác trực tiếp, bố cục hoặc khả năng đọc trên điện thoại.


