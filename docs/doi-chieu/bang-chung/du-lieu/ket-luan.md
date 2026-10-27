
## Những kết luận header và danh sách có thể tái hiện

- App bán: tiêu đề ở **Tổ chức (`organization`), Gói dịch vụ (`plans`), Tài khoản nhận tiền (`payout`), Sổ tiền chi tiết (`ledger/chi-tiet`), Báo giá từ nhu cầu (`quote/:lot/:line`)** đã cuộn khỏi vị trí. Cùng app, các màn seller dùng `.sl-dau` bám top; các màn shared dùng `.page-heading` và chữ “Nghe” khác khung. `support`/`messages` cũng dùng khung shared nhưng màn ngắn nên chưa chứng minh bằng cuộn trong mẫu dữ liệu này.
- App mua và quản trị: các tiêu đề `.page-heading` ở những màn đủ cao để cuộn đều trôi; logo/thanh thương hiệu có quy tắc riêng. Đây là quan sát khác khung, chưa có quyết định chung buộc quản trị dùng khung điện thoại của app bán.
- Đo 12 lần đổi tab danh sách, tại 390 và 1280 px, với chuyển động bật/tắt: khi bật, `#content.x` đi **0→28→0** trên điện thoại, **400→428→400** trên desktop; khi giảm chuyển động, giữ **0** hoặc **400**. Hàm `vaoMan` dùng `translateX(+28px)` trong 260 ms, được gọi mặc định cả khi trở lại. Khung bán rộng tối đa 480 px và `margin:0 auto`; không có bằng chứng chữ bị đổi `text-align` gây hiện tượng này. **Đã tái hiện lệch phải rồi về giữa; lệch trái chưa tái hiện.** [Số đo từng frame](bang-chung/du-lieu/do-danh-sach.json), [script](bang-chung/scripts/do-danh-sach.mjs). Đo này chạy cùng mã v2 ở UI cô lập 18990 để tránh giới hạn pilot, không phải thao tác sửa CSS app.

## Danh sách chuyển ưu tiên: 20 mục đầu

Đây là đề xuất theo bằng chứng, chưa triển khai. Trước khi chuyển, xử lý các lỗi chặn NV11/NV22/NV24–NV26/B18; không dùng việc thêm màn mới để che các lỗi đó. “Chuyển” ở đây là lấy lại thiết kế, nghiệp vụ và oracle kiểm thử có sẵn; gắn chúng với giao dịch/ledger/quyền v2. **Không chép nguyên engine localStorage, % cọc 10%, toàn tiền hàng qua đảm bảo hoặc số tiền viết cứng.**

| Ưu tiên | Phần lấy lại từ mẫu | Điểm nối v2 và điều kiện để xong |
|---:|---|---|
| 1 | **Bộ ca B01–B44 / M01–M32**: `dong-co/packages/may-chu/src/ca-kiem-thu*.ts` | Giữ ID/kỳ vọng, port fixture và assertion; ghi riêng thay đổi chính sách. B08 phải ẩn đúng ngày; B16 chống bán lố; B17 chỉ giữ một lần; B18 giữ lý do. Chạy API và đường người dùng hai app, không chỉ đếm test hiện có. |
| 2 | **Khung màn/Nghe và điều hướng**: `fe-nongdan/js/khung.js`, `app.js`; brief bán mục 6, `bo-cuc-app-ban/index.html:279` | Dùng chung header cho màn seller và shared; thử cuộn, lùi, focus, Nghe, bàn phím. Chốt shell 6/5 mục từ nguồn trước sửa; giữ lối vào công cụ thử qua cổng nội bộ. |
| 3 | **Hồ sơ/cài đặt/hỗ trợ**: `fe-nongdan/js/man/toi.js`; brief mục 10.14 | Chuyển menu chữ lớn/tốc độ đọc/trợ giúp vào avatar; giữ API thành viên, payout, yêu cầu hỗ trợ v2. Mọi lối tắt có đích thật, không chỉ báo “sắp có”. |
| 4 | **Hội thoại trong app và che liên lạc**: `fe-*/js/man/*khach*`, `tin-nhan.js`, `lenh/trao-doi.ts`, B12/M06 | Thay route `messages` giữ chỗ bằng hội thoại theo cặp/đơn; kiểm số viết cách, Zalo, chữ và số tiền; không che nhầm lượng/giá. Gửi/nhận và quyền đọc được kiểm cả hai bên. |
| 5 | **Thông báo vào đúng việc**: `fe-nongdan/js/man/hom-nay.js`, brief mục 6/10.13; bố cục bán màn Tin nhắn | Giữ outbox v2; thêm hộp thông báo/nhãn bước/đã đọc và route đúng đơn/đợt/dòng. Kiểm từ lúc có sự kiện tới khi mở đúng bước, không tự sinh thông báo cứng. |
| 6 | **Nhật ký canh tác → cách ly**: `fe-nongdan/js/man/vuon.js`, B06/B32; brief mục 10.10 | Nối `farm-diary` đã có, hiển thị tự ghi/nhân viên, sửa bằng bản mới, ảnh và `clear_on`. Kiểm ghi phun→lô bị chặn→hết cách ly→đăng được. ASR/microphone thật cần lượt riêng. |
| 7 | **Thu chi vụ và giá vốn**: `gia.ts:48`, `tong-hop.ts`, màn thu-chi mẫu 1; B33 | Chuyển đúng công thức chi/sản lượng ước và sổ vụ, không lấy tiền đơn thay tổng chi canh tác. Hiển thị căn cứ ước tính; thử ví dụ 3 triệu chi/25 triệu thu. Đây là phục hồi phạm vi đã bị cắt trong MVP. |
| 8 | **Màn giá hôm nay và cảnh báo giá vốn/tham khảo**: `man/dang.js:111`, `gia.ts`, brief mục 13.1 | Nối `reference-prices` v2, giữ 3 đơn/2 cặp và loại dữ liệu thao túng; tách khỏi RSS “Tin giá”. Không đủ mẫu phải ghi chưa đủ; giá dưới vốn hiện ngay trước đăng/báo giá. |
| 9 | **Bán gấp và đầu nhận hàng kém loại**: `man/hang.js`, `tong-hop.ts:202`, B40/M31/M32 | Nối API urgent-sale đã có; phục hồi hồ sơ người nhận, min kg, đối tác được vận hành công nhận và giá sàn. Kiểm an toàn khóa lô; không đưa hàng mất an toàn vào cứu hàng. |
| 10 | **Tách lô theo loại**: `lenh/lo.ts:130`, B39 | Thêm luồng tách gắn lô cha/con vào ledger v2; tổng lượng bảo toàn, không tách hết/đã cam kết, loại/giá/lối tới buyer chế biến rõ. |
| 11 | **Phần bị trả lại → lô con**: `lenh/lo.ts`, B41 | Gắn lượng và ảnh nghiệm thu, nguồn đơn/đợt/dòng; mỗi phần chỉ chuyển một lần. Không tạo lô tự do làm tăng lượng tồn. |
| 12 | **Lô gộp HTX và phần của hộ**: `man/hang.js`, `chiaTienLoGop`, B07/B34, luồng CSV số 12 | Nối `core.lot_contributions` với giao dịch/tiền thực nhận; tổng phần bằng lượng, tổng chia bằng tiền NH xác nhận, hộ xem/xác nhận phần mình. |
| 13 | **Uy tín hai chiều và đánh giá**: `tong-hop.ts:32`, B35/B37/M21; brief/app mua phần chống ép giá | Tính từ hành vi giao/trả tiền/hủy, hiện mẫu số và kỳ quan sát, không thay bằng sao mẫu. Chỉ đánh giá khi hoàn tất, mỗi bên mỗi đơn một lần; bỏ `uy_tin:null` khi thật sự triển khai. |
| 14 | **Đặt trước khi hái/chốt lượng**: bố cục bán `:819`, brief mục 13.10 | Nối API TH-NV-04/05: lượng ước, lượng thật, công thức giá, cọc chênh, đề nghị và ký. Thử đồng ý/từ chối/im lặng, cập nhật cùng đơn sau reload hai app. |
| 15 | **Bao tiêu theo vụ nhiều đợt**: bố cục bán `:872`, brief mục 13.10, tài liệu production mục 3.1 | Nối TH-NV-06, hiển thị/chọn được **từng đợt**, vật tư đối trừ, mất mùa/phụ lục, tiền thực nhận. Tách sản phẩm này khỏi “đối tác cứu hàng dạt giá sàn” của mẫu 1. |
| 16 | **Nghiệm thu thiếu/hạ cấp/trả lại có bằng chứng**: `don/luat.ts:140`, B44/M30; bố cục mua `:646` | Giữ API 3 phần/hash/PIN đã chạy; chuyển trình bày ảnh từng dòng, thiếu kg khác trả lại, không reset phần đúng. Thử có/không ảnh, cân lại, đổi người ký, reload sau ký, không cho ký lại. |
| 17 | **Lịch giao/giao bù/đổi lịch**: `fe-nongdan/js/man/lich.js:13`, M14/B23, brief thiếu lượng | Chuyển lịch theo ngày/đợt và hậu quả đổi lịch, nối phụ lục/hẹn giờ v2. Đợt bù phải truy cập được từ seller, chưa quyết toán khi còn nghĩa vụ. |
| 18 | **Kho thương mại và truy xuất**: `fe-thumua/js/man/kho.js`, M22/M23 | Chuyển nhập/xuất/tồn/QR gắn phiếu nhận, kiểm nhập không vượt đã nhận, xuất không vượt tồn, lần về lô/đơn/nhật ký phun. Hàng gộp/tách không mất nguồn. |
| 19 | **Đặt dịch vụ đối tác**: `man/dich-vu.js`, B36/M27, tài liệu production mục 8 | Luồng yêu cầu→đối tác báo giá→đặt→nghiệm thu có người/phí/trách nhiệm; nối hàng việc vận hành v2. Không thay bằng form hỗ trợ chung. |
| 20 | **Mối quen và mua lại**: `fe-thumua/js/man/nha-cung-cap.js`, M11, luồng CSV số 11 | Chuyển danh sách quan hệ và lập đơn lại, dùng phí theo gói/cặp v2; không tự mở liên lạc hay giảm kiểm chất lượng chỉ vì là mối quen. Đơn ngoài app phải có nhãn và nghĩa vụ tách rõ. |

Sau 20 mục: bảng kê/báo cáo/nhập Excel, kế hoạch mua tháng, học kỹ thuật, quy trình duyệt hồ sơ năng lực theo từng buyer và mẫu trước đơn. Bảy nhu cầu phỏng vấn vẫn phải theo dõi độc lập; không biến hạn mức duyệt nội bộ thành hạn mức tín dụng, phạt theo cọc thành bồi chi phí mua thay thế, hay phụ lục đổi giá thành cơ chế báo trước 15–30 ngày.

**Đề xuất bỏ khỏi nội dung chuyển nguyên:** state `flowAt/reset`, số tiền/hạn/nhóm “tới lượt ai” viết cứng, tự chuyển thành đã nhận tiền/đạt khi bốc sau thời gian chờ, cam kết bảo vệ toàn tiền hàng khi chỉ giữ cọc. Ứng tiền/bảo hiểm nghiệp vụ đầy đủ đang ngoài phạm vi MVP theo đặc tả v2; ghi rõ chưa cung cấp thay vì đưa nút mời dùng. Chưa có quyết định bỏ một nhu cầu người dùng chỉ vì v2 hiện chưa làm.

## Điều chưa kiểm được và giới hạn của kết luận

1. Chưa xác nhận toàn bộ M1-src là bản deploy Firebase; đã xác nhận một số file khác. Chưa chạy lại 76 ca trên UI Firebase hoặc UI HTML mẫu 1. Kết quả 76/76 là engine TypeScript ở worktree.
2. Chưa port đủ mọi assertion của 76 ca sang v2. Bảng nêu ca liên quan, adapter đủ/một phần và ca chưa chạy. Không dùng 65/65 hiện có để lấp các ca ấy. Một số yêu cầu bị đổi chính sách phải chốt oracle trước kiểm, đặc biệt cọc/phí, contact, nghiệm thu vượt lượng và toàn tiền qua đảm bảo.
3. Ảnh bao phủ các route chính/chi tiết/tab được liệt kê trong **độ phủ route**, kể cả màn giữ chỗ, màn lỗi và quyền bị chặn. Không thể gọi là đã chạy tất cả tổ hợp trạng thái/nhân sự/điện thoại. Fixture pilot không có đủ mọi trạng thái đơn; album E2E và fixture TH-031 bổ sung màn có dữ liệu cô lập. Màn/phân nhánh chưa có ảnh hợp lệ phải giữ “chưa kiểm”.
4. Chưa chạy concurrency trên PostgreSQL thật, hai thiết bị ký/cọc/cân đồng thời, lỗi mạng giữa commit và phản hồi, hoặc đầy đủ các vai HTX/người giúp qua UI. Kiểm API PGlite không thay bằng chứng đó.
5. Chưa thử microphone/camera/QR trực tiếp trên điện thoại thật, giọng Việt hệ điều hành, offline/reconnect thực địa, push/SMS thật. Ảnh kiểm API là PNG fixture; việc tệp tồn tại không chứng minh ảnh thật của hàng/cân hoặc tính xác thực vật lý.
6. Chưa ngân hàng, lab/kiểm định, logistics, tiền, chữ ký chứng thực hay tài liệu thuế thật. Chưa rà pháp lý hiện hành của cọc/phạt/bồi thường/hồ sơ dữ liệu. Không dùng nhận xét audit này như xác nhận pháp lý hoặc bảo đảm giao dịch thật.
7. Phỏng vấn chỉ có phần tóm tắt trong tài liệu; chưa đối chiếu biên bản gốc, chưa biết các khách hàng khác có cùng nhu cầu không. Các đề xuất NC không tự trở thành kết quả phỏng vấn.
8. Đã tái hiện dịch phải→giữa; phần lệch trái được phản ánh **chưa tái hiện**. Chưa kết luận lỗi trình duyệt/thiết bị khác nếu không có số đo.

Không có mã app nào được sửa để làm các kiểm tra đạt. Các thất bại được giữ lại; sau audit, triển khai và nghiệm thu là công việc tiếp theo, cần bám các dòng/case trong bảng này.
