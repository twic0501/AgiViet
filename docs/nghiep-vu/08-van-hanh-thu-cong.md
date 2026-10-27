# 08 · Vận hành thủ công: con người trong quy trình

## 1. Vì sao có bước thủ công

App không tự làm được: xác minh giấy tờ với nguồn công bố, xác minh vườn có thật, gọi điện cho người đọc chậm, đối chiếu chứng từ ngân hàng khi hai bên khai khác nhau, điều phối khi hàng tươi đang kẹt trên đường, lấy mẫu kiểm định, hòa giải. Những việc này đi vào **hàng việc** (`viec`) có người phụ trách, hạn (SLA), kết quả và nhật ký. Không có bước nào để "treo vô hạn".

Giới hạn của người vận hành (kế thừa BR-03 vận hành v3): **không** hỏi OTP, không ký hộ, không sửa số cân của khách, không tự chuyển tiền một mình, không kết luận gian lận từ một phản ánh.

## 2. Vai trò con người

| Mã | Vai | Ai (dữ liệu ảo) | Làm gì | Quyền trên trang vận hành |
|---|---|---|---|---|
| VH-DP | Điều phối viên vận hành | Ngô Thị Vy | Nhận việc P1–P3, gọi hai bên, theo dõi hạn, đặt kiểm định, điều xe/kho đối tác khi khẩn | Xem đơn được phân công; tạo yêu cầu dịch vụ; ghi kết quả việc; **không** lệnh tiền |
| VH-HT | Nhân viên hiện trường / cộng tác viên địa phương | Trần Văn Khoa (Đồng Tháp), Lâm Thị Thu (Cần Thơ) | Đăng ký giúp hộ tại chỗ, xác minh vườn/ao, chụp ảnh xác minh, có mặt tại điểm giao khi đơn có dịch vụ, chứng kiến tiêu hủy | App hiện trường (điện thoại): danh sách việc theo vùng; chụp ảnh có giờ và vị trí; ký chứng kiến |
| VH-KD | Kiểm định viên (đối tác) | Trung tâm kiểm định Phương Nam (mô phỏng) | Lấy mẫu, niêm phong, kiểm, trả kết quả | Cổng đối tác: nhận lịch, quét QR mẫu, tải kết quả (ký số mô phỏng) |
| VH-TD | Tổng đài hỗ trợ | Ca trực (2 người) | Nhận cuộc gọi, tạo việc, hướng dẫn thao tác, gọi tự động nhắc hạn (mô phỏng) | Tạo việc; xem trạng thái đơn ở mức tóm tắt |
| VH-DS | Đối soát tài chính | Bùi Thị Thảo (lập), Đỗ Minh Trí (duyệt) | Đối soát sự kiện ngân hàng với lệnh; đối soát thủ công khi khai lệch; lập lệnh tiền thủ công (chi cọc khi vi phạm thanh toán, hoàn sai) | Lập lệnh / duyệt lệnh; **người lập ≠ người duyệt** |
| VH-RR | Kiểm soát rủi ro, chống gian lận | Phạm Quốc Bảo | Xem cờ giá bất thường, thông đồng, lách, ép loại; quyết định giảm hiển thị, khóa tạm, khóa an toàn lô | Đổi cờ tài khoản, lô; mọi quyết định cần lý do; khóa > 7 ngày cần người thứ hai duyệt |
| VH-DM | Biên tập danh mục và giá | Lê Minh Châu | Duy trì hồ sơ ngành hàng (phiên bản), giá nguồn ngoài, xác minh giấy tờ (mã vùng trồng, VietGAP) với nguồn công bố | Sửa danh mục (tạo phiên bản mới); đổi trạng thái giấy tờ |
| VH-QL | Trưởng ca / quản lý vận hành | Nguyễn Hữu Tâm | Nhận việc quá SLA, quyết định ngoại lệ, duyệt người thứ hai | **Tách quyền** (N-10): duyệt quyết định nghiệp vụ (chốt theo biên bản, bất khả kháng, khóa); **không** có quyền duyệt lệnh tiền (thuộc VH-DS duyệt) và **không** có quyền mở khóa/kích hoạt tài khoản nhận tiền (thuộc VH-DS + VH-RR cùng duyệt). Không ai giữ cả hai chuỗi "mở khóa tài khoản nhận tiền" và "duyệt chi" |

## 3. Mức ưu tiên và SLA

| Mức | Ví dụ | Phản hồi đầu | Cập nhật | Hạn xử lý mục tiêu | Quá hạn |
|---|---|---|---|---|---|
| **P0** | Nghi chiếm tài khoản, đổi tài khoản nhận tiền trái phép, chủ bấm "Không phải tôi" | Hệ thống **tự khóa ngay** thay đổi nhạy cảm (24/7); người trực 15 phút trong ca | 30 phút | 4 giờ | Tự chuyển VH-QL, gọi điện |
| **P1** | Hàng tươi đang chờ hoặc đang trên đường gặp sự cố (xe hỏng, sai nhiệt, người bán không xác nhận kết quả tại vườn 60 phút, xe tới mà người nhận không có mặt) | 15 phút (trong ca) | 30 phút | Theo thời gian sống của lô (mục 5) | Chuyển VH-QL |
| **P2** | Tiền lệch chờ đối soát; người bán không xác nhận số cân 24 giờ; tranh chấp cần đặt kiểm định; vi phạm thanh toán; giá bất thường lặp; bất khả kháng cần xét bằng chứng | 4 giờ làm việc | 1 ngày | 2 ngày làm việc | Chuyển VH-QL |
| **P3** | Xác minh giấy tờ, xác minh vườn lô lớn, hướng dẫn, liên hệ HTX chưa chi phần hộ | 1 ngày làm việc | 2 ngày | 5 ngày làm việc | Báo cáo tuần |

Ca trực mặc định v2: 05:00–20:00 hằng ngày (mùa vụ). Ngoài ca: việc P1 hiện "Ngoài giờ trực, người trực tiếp theo bắt đầu lúc 05:00; kênh khẩn: [số tổng đài]". Không hiện "đang có người xử lý" khi chưa có người nhận việc.

## 4. Danh mục việc (khi nào app chuyển việc cho người)

| Mã việc | Kích hoạt (sự kiện / điều kiện) | Mức | Vai | Việc phải làm | Kết quả ghi vào app |
|---|---|---|---|---|---|
| V01 Xác minh danh tính người bán | Người bán gửi xác minh căn cước mà so khuôn mặt tự động không đạt, hoặc chọn "đăng ký tại chỗ" | P3 | VH-HT / VH-DM | Gặp hoặc gọi video, đối chiếu giấy tờ | `xac_minh.dat` / `khong_dat` + lý do |
| V02 Xác minh HTX, tổ hợp tác, ủy quyền hộ | Tạo tổ chức HTX; lô gộp có hộ không có tài khoản | P3 | VH-DM, VH-HT | Kiểm giấy chứng nhận HTX; giấy ủy quyền từng hộ | Trạng thái tổ chức, ủy quyền từng phần lô |
| V03 Xác minh giấy tờ lô | Người bán tải mã vùng trồng, VietGAP | P3 | VH-DM | Tra nguồn công bố (cơ quan BVTV, tổ chức chứng nhận) | `da_xac_minh` (kèm nguồn, ngày) / `khong_khop` |
| V04 Xác minh vườn lô lớn | CG-06 (tài khoản mới, lô > 200 triệu) | P3 | VH-HT | Tới vườn, chụp ảnh có giờ vị trí, ước sản lượng | Ghi chú xác minh trên lô |
| V05 Đổi tài khoản nhận tiền bất thường / P0 | Chủ bấm "Không phải tôi"; đổi tài khoản trong 7 ngày sau khôi phục; tên chủ tài khoản không khớp | P0 / P2 | VH-QL, VH-DS | Gọi kênh dự phòng đã xác minh; không đổi theo yêu cầu qua chat | Duyệt / từ chối; khóa |
| V06 Người bán không xác nhận kết quả tại vườn | `dot.qua_han_xac_nhan` (60 phút) | P1 | VH-DP | Gọi người bán (và người giúp), giải thích kết quả, hỏi có phản đối dòng nào | Ghi cuộc gọi; người bán tự bấm trên app. **Không** bấm thay |
| V07 Người bán không xác nhận số cân (tại kho) | 24 giờ sau gửi kết quả | P2 | VH-DP | Gọi 2 lần cách 4 giờ; gửi SMS tóm tắt; đối chiếu biên bản (ảnh cân, chữ ký nhận) | Sau 72 giờ không liên lạc được: VH-DP đề xuất + VH-QL duyệt "chốt theo biên bản", ghi lý do; người bán vẫn được mở tranh chấp trong 7 ngày sau đó |
| V08 Lệch tiền trả thẳng | `khoan.lech` hoặc 48 giờ người bán chưa xác nhận | P2 | VH-DS | Thu đầu mối (ủy nhiệm chi có mã giao dịch, ảnh sao kê, cuộc gọi tới **số đã xác minh** của người bán); kết luận chỉ dựa trên **xác nhận có OTP của người bán** hoặc **kết quả tra soát của ngân hàng** (N-06) | `ket_luan_doi_soat`: số đã nhận thực, hạng bằng chứng; người lập ≠ người duyệt |
| V09 Cọc lệch số | Ngân hàng báo số khác | P2 | VH-DS | Hướng dẫn bổ sung hoặc tạo lệnh hoàn phần thừa | Lệnh |
| V10 Sự kiện ngân hàng lạ | Sự kiện không khớp lệnh nào, đến muộn sau đối soát, thất bại lặp | P2 | VH-DS | Tra trạng thái chính thức (cổng ngân hàng mô phỏng); tạo lệnh mới nếu cần | Ghi đối soát |
| V11 Tranh chấp cần kiểm định | `tranh_chap.tu_dong_kiem_dinh` hoặc yêu cầu kiểm định | P2 | VH-DP | Đặt kiểm định (báo giá, lịch), đảm bảo mẫu niêm phong được bàn giao đúng (QR-04) | Mã yêu cầu kiểm định |
| V12 Kiểm định quá hạn / không kết luận | 48 giờ chưa kết quả; kết quả `khong_ket_luan` | P2 | VH-DP | Liên hệ đối tác; mời hai bên thỏa thuận; nhắc mốc 14 ngày | Thỏa thuận hai bên (họ tự bấm) hoặc `chuyen_co_che_khac` |
| V13 Bất khả kháng | Đề nghị giảm lượng có bằng chứng, bên mua không trả lời hoặc không đồng ý | P2 | VH-DP + VH-HT (nếu cần xác minh) | Xét bằng chứng (ảnh, xác nhận HTX/khuyến nông, thông báo thiên tai); có thể cử hiện trường | Chấp nhận / không chấp nhận + lý do; hệ thống áp hệ quả |
| V14 Vi phạm thanh toán | Khoản sau nhận quá hạn 72 giờ | P2 | VH-DS + VH-QL | Gọi bên mua; nếu không trả: lập lệnh chi cọc cho người bán như khoản trừ nợ (2 người); xuất hồ sơ nợ | Lệnh; cờ uy tín |
| V15 Giá bất thường lặp theo cặp | KT-04 | P2 | VH-RR | Gọi **người bán trước**, giải thích quyền lợi; xem lịch sử cặp | Không vi phạm / cảnh cáo / giảm hiển thị / khóa tạm |
| V16 Lách liên lạc lặp | LA-01 ≥ 5 lần / 30 ngày | P2 | VH-RR | Xem tin bị che | Như trên |
| V17 Ép loại bất thường | EL-06 | P3 | VH-RR | Xem ảnh, lịch sử bên mua | Ghi chú; có thể bắt buộc kiểm tại điểm cho đơn sau |
| V18 Khóa an toàn lô | Kết quả kiểm không đạt (cadimi, kháng sinh, dư lượng) | P1 (hàng tươi) | VH-RR + VH-DP | Khóa lô; báo người bán hướng xử lý hợp lệ (không bán gấp) | `khoa_an_toan`; mở khóa cần người thứ hai |
| V19 Sự cố xe hàng tươi | `chuyen.su_co`, `chuyen.sai_nhiet`, xe trễ > 4 giờ | P1 | VH-DP | Liên hệ nhà xe, tìm xe thay (xe đối tác), gợi ý kho lạnh gần nhất; không tự thuê chỗ đắt hơn khi chưa có chấp thuận của bên lo xe | Đặt dịch vụ thay thế (khi bên lo xe đồng ý trên app) |
| V20 Hàng trả lại ở nơi đến không ai xử lý | 24 giờ sau mặc định "bán gấp tại chỗ" không bán được | P2 | VH-DP + VH-HT | Giám sát tiêu hủy có biên bản | `BBTH` |
| V21 Hộ chưa nhận phần tiền từ HTX | Hộ bấm "Chưa nhận" hoặc 7 ngày chưa xác nhận | P3 | VH-DP | Liên hệ HTX | Ghi kết quả; không chi thay |
| V22 Nghi bán ra ngoài (bao tiêu) | Giao < 80% nhật ký thu hoạch không lý do | P2 | VH-DP | Gọi người bán, đối chiếu nhật ký; hiện trường nếu cần | Áp phạt theo hợp đồng (hệ thống) hoặc chấp nhận lý do |
| V23 Tổng đài: yêu cầu trợ giúp | Người dùng bấm "Gọi hỗ trợ" | P3 (tự nâng nếu liên quan tiền/hàng đang chờ) | VH-TD | Hướng dẫn | Ghi việc |
| V24 Đăng ký giúp tại chỗ | HTX hoặc hộ yêu cầu | P3 | VH-HT | Cầm máy của **chính người bán**, hướng dẫn họ tự nhập OTP | Tài khoản tạo, ghi "đăng ký có hỗ trợ" |

## 5. SLA theo thời gian sống của hàng (P1)

Với việc P1 liên quan hàng đang chờ, hạn xử lý = min(4 giờ, 25% thời gian sống còn lại của lô theo hồ sơ mặt hàng). Ví dụ: tôm ướp đá còn 24 giờ → hạn 4 giờ; xoài nhiệt thường còn 5 ngày → hạn 4 giờ; rau (không mở v2) sẽ ngắn hơn.

## 6. Quy trình mẫu

### 6.1 Đối soát thủ công khi lệch tiền (V08)

1. Hệ thống tạo việc P2 khi người bán bấm "Chưa nhận" sau khi bên mua báo, hoặc 48 giờ chưa xác nhận.
2. VH-DS (Thảo) nhận việc, gửi yêu cầu chứng từ cho hai bên trên app (thông báo + SMS): bên mua tải ủy nhiệm chi có mã giao dịch ngân hàng; người bán được mời mở app và xác nhận số thật (có OTP), hoặc chọn "Gọi lại cho tôi" (VH chỉ gọi ra số đã xác minh, không nhận số mới qua cuộc gọi). Ảnh sao kê, ủy nhiệm chi, nội dung cuộc gọi là **đầu mối**, không phải căn cứ; nếu người bán không xác nhận được qua app thì VH gửi yêu cầu **tra soát** tới ngân hàng bên trả (bằng chứng hạng C).
3. Thảo đối chiếu: số tiền, thời gian, tài khoản đích **so với tài khoản chụp trong hợp đồng**.
4. Kết luận đề xuất: "Đã nhận [số]" / "Chưa nhận, chuyển nhầm tài khoản" / "Chưa đủ căn cứ".
5. Trí duyệt. Hệ thống ghi `ket_luan_doi_soat` với căn cứ; khoản trả thẳng chuyển trạng thái theo kết luận.
6. Chuyển nhầm tài khoản: không tính là đã trả; hướng dẫn bên mua làm việc với ngân hàng; bên mua vẫn phải trả đúng.

### 6.2 Chốt theo biên bản khi người bán im lặng (V07)

Chỉ áp cho nghiệm thu tại kho, khi: biên bản ký nhận có chữ ký người được chỉ định, có ảnh cân, kết quả có ảnh cho phần trả lại. Sau 72 giờ, 3 lần nhắc và 2 cuộc gọi không được: VH-DP đề xuất, VH-QL duyệt, kết quả chuyển `chot` với lý do "chốt theo biên bản do người bán không phản hồi". Người bán vẫn mở tranh chấp được trong 7 ngày; nếu kiểm định sau đó cho người bán đúng thì bên mua bù theo kết luận.

### 6.3 Sự cố hàng tươi trên đường (V19)

1. Tài xế hoặc nhiệt độ mô phỏng báo sự cố → việc P1.
2. VH-DP gọi tài xế, bên lo xe. Đề xuất phương án trên app: xe thay (báo giá đối tác), kho lạnh gần nhất (báo giá), tiếp tục chạy.
3. Bên lo xe chọn và chấp thuận chi phí trên app. Vận hành **không tự thuê** khi chưa có chấp thuận, trừ khi hợp đồng dịch vụ đơn có điều khoản "khẩn cấp tới [số tiền]".
4. Ghi mọi mốc vào biên bản giao nhận; rủi ro theo kiểu giao không đổi.

## 7. App ghi nhận việc thủ công thế nào

| Bản ghi | Trường |
|---|---|
| `viec` | mã, loại (V01–V24), mức, đối tượng (đơn/lô/tài khoản), lý do kích hoạt (sự kiện nguồn), người phụ trách, trạng thái (`moi`, `da_nhan`, `dang_xu_ly`, `cho_khach`, `xong`, `qua_sla`, `chuyen_cap`), hạn phản hồi, hạn xử lý, kết quả (mã), ghi chú, tệp đính kèm |
| `nhat_ky_viec` | mỗi hành động: ai, lúc nào, gì (gọi, nhắn, đặt dịch vụ, đề xuất, duyệt) |
| `cuoc_goi` | ai gọi ai, thời lượng, tóm tắt do người gọi nhập (không ghi âm mặc định) |
| `quyet_dinh_van_hanh` | quyết định có hệ quả (chốt theo biên bản, khóa, chấp nhận bất khả kháng, lệnh tiền thủ công): người đề xuất, người duyệt (khác nhau), lý do, căn cứ |
| `gio_cong` | ngày, việc, phút, chi phí ngoài, có trợ giá không, nhóm (8 nhóm của vận hành v3: hướng dẫn, xác minh, tìm nguồn, chuẩn bị thỏa thuận, điều phối/nhắc, trực chờ, ngoại lệ, đối soát) — dùng cho đo kinh tế (`11`) |

Khách thấy: mã việc, trạng thái, người phụ trách (tên) hoặc "Chờ phân công", mốc cập nhật tiếp theo. Mọi quyết định vận hành có hệ quả lên đơn đều hiện thành một dòng lịch sử đơn ở cả hai app.

## 8. Trang vận hành: các màn tối thiểu

1. Hàng việc (lọc theo mức, vai, vùng, quá SLA).
2. Chi tiết việc (đối tượng, lịch sử đơn, tài liệu, nút hành động theo loại việc).
3. Đối soát tiền (lệnh, sự kiện ngân hàng, khoản lệch) — hai cột lập/duyệt.
4. Xác minh (danh tính, tổ chức, giấy tờ).
5. Rủi ro (cờ giá bất thường, lách, thông đồng, ép loại; quyết định).
6. Danh mục và giá (hồ sơ ngành hàng có phiên bản, giá nguồn ngoài).
7. Đối tác (ngân hàng, kiểm định, xe, kho mô phỏng: bảng điều khiển phát sự kiện cho kiểm thử).
8. Cài đặt chính sách (tỷ lệ cọc, hạn, ngưỡng, gói) có phiên bản; mỗi thay đổi cần **người lập và người duyệt khác nhau**, **có hiệu lực sau 24 giờ** và báo trước trên trang vận hành (N-09); đơn đã ký giữ ảnh chụp chính sách cũ.
9. Đồng hồ thử và bảng phát sự kiện đối tác: **chỉ tồn tại ở môi trường thử** (N-07). Bản production không biên dịch các màn/API này; máy chủ kiểm khi khởi động và từ chối chạy nếu cờ thử bật ở production; hàm DB không đọc đồng hồ thử ở vai runtime (khớp migration 0028).
10. Mọi vai vận hành đăng nhập bằng khóa bảo mật phần cứng hoặc passkey (FIDO2), không dùng OTP SMS (N-10).
