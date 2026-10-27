# 00 · Tổng quan đặc tả nghiệp vụ AgiViet production v2

Bản 25/10/2026. Người viết: nhóm nghiệp vụ. Đối tượng đọc: kỹ sư backend, kỹ sư giao diện, người kiểm thử, chủ dự án.

Bộ tài liệu này là **căn cứ duy nhất** để dựng lại hai app (app bán, app mua) có backend và cơ sở dữ liệu thật, chạy trên **dữ liệu, người dùng và tình huống ảo** để kiểm thử chéo hai bên. Mọi con số tiền và lượng trong bộ tài liệu đã được cộng trừ khớp; nếu kỹ sư thấy chỗ không khớp, coi đó là lỗi tài liệu và báo lại, không tự chọn.

## 1. Danh sách tài liệu

| File | Nội dung | Ai dùng chính |
|---|---|---|
| `00-tong-quan.md` | Định vị, phạm vi, quyết định kế thừa và mới, mâu thuẫn đã giải quyết | Tất cả |
| `01-mat-hang.md` | Danh mục mặt hàng MVP, lý do, hồ sơ ngành hàng | Backend (danh mục), giao diện (form đăng) |
| `02-phan-khuc-ben-mua.md` | 4 phân khúc bên mua, các dạng người bán, mặc định khác nhau | Tất cả |
| `03-vong-doi-don.md` | Máy trạng thái của mọi đối tượng giao dịch, bảng chuyển trạng thái | Backend (bắt buộc), giao diện |
| `04-tien-va-coc.md` | Công thức cọc, phí, quyết toán, hoàn, ví dụ số | Backend (bắt buộc) |
| `05-ghep-cung-cau-va-chong-lach.md` | Thuật toán ghép, giá tham khảo, luật chống ép giá, khai thấp, lách, ép loại | Backend |
| `06-kho-van-chuyen-qr.md` | Kho, xe, giao nhận, chuyển rủi ro, điểm dùng QR | Tất cả |
| `07-tai-lieu-pdf.md` | Các loại tài liệu PDF, trường, bố cục, ký, phiên bản, mã băm | Backend, giao diện |
| `08-van-hanh-thu-cong.md` | Vai trò con người, SLA, khi nào app chuyển việc cho người | Backend (hàng việc), trang vận hành |
| `09-tinh-huong-kiem-thu.md` | 63 tình huống TH-001…TH-063 | Kiểm thử, cả hai kỹ sư |
| `10-du-lieu-ao.md` + `du-lieu-ao.json` | Người dùng, tổ chức, lô, nhu cầu, đơn ảo | Backend (nạp dữ liệu) |
| `11-mo-hinh-kinh-doanh.md` | Gói, nguồn thu, giả thuyết, chỉ số, kịch bản phỏng vấn | Chủ dự án |
| `12-yeu-cau-cho-ky-su.md` | Thực thể, bất biến, sự kiện, API; danh sách màn hai app | Hai kỹ sư |

## 2. Định vị

**AgiViet là "sổ làm ăn có chợ ở giữa"** cho nông sản và thủy sản thô, khởi đầu ở Đồng bằng sông Cửu Long.

- Nối **người bán** (hộ, trang trại, HTX, tổ hợp tác, chủ ao) với **bên mua tổ chức** (doanh nghiệp xuất khẩu, nhà máy chế biến, nhà hàng và quán ăn, vựa và đầu mối).
- AgiViet là **bên trung gian trung lập**:
  - không định giá, không mua bán thay, không sở hữu hàng, không sở hữu kho hay xe;
  - không tự giữ tiền: **chỉ khoản cọc** được giữ tại **tài khoản của ngân hàng đối tác**; AgiViet chỉ gửi lệnh xử lý cọc theo luật trên app;
  - không phân xử thay tòa: kiểm định bên thứ ba là căn cứ chất lượng; vận hành chỉ đối chiếu chứng cứ và làm theo luật đã ký.
- **Người bán dùng miễn phí.** Bên mua trả phí theo gói. Dịch vụ đối tác (xe, kho lạnh, kiểm định, ứng tiền) do bên chọn dùng trả.
- Giá trị cốt lõi:
  - người bán: tiền chắc hơn (cọc ở ngân hàng), số cân và loại công bằng (nghiệm thu 3 phần có chứng cứ, phản đối đúng dòng, kiểm định), biết giá (giá tham khảo), hàng xấu vẫn có đường đi (bán gấp, bao tiêu);
  - bên mua: nguồn đúng loại, đủ lượng, đúng lịch; giảm rủi ro cọc cho người lạ; giấy tờ đủ (hợp đồng, biên bản, bảng kê 01/TNDN, truy xuất).

## 3. Phạm vi MVP v2

### 3.1 Trong phạm vi

1. Hai app chạy trên cùng một backend và một cơ sở dữ liệu; một **trang vận hành** (web) cho nhân viên AgiViet; một **cổng đối tác mô phỏng** (ngân hàng, kiểm định, nhà xe, kho) để phát sự kiện như thật.
2. Danh mục **8 mặt hàng** chia 3 nhóm (chi tiết `01-mat-hang.md`):
   - Trái cây tươi: xoài cát Chu, chanh không hạt, sầu riêng Ri6/Monthong, bưởi da xanh, thanh long;
   - Thủy sản nuôi: tôm thẻ chân trắng, cá tra nguyên liệu;
   - Lương thực: lúa tươi.
3. **4 phân khúc bên mua**: xuất khẩu, chế biến, nhà hàng và quán ăn, vựa và đầu mối. Cùng một app mua, khác mặc định.
4. **6 loại hợp đồng**: giao ngay, đặt trước khi hái, bao tiêu theo vụ, hợp đồng khung định kỳ, đơn nhóm (nhiều người bán), lô gộp HTX (một người bán đại diện nhiều hộ).
5. Tiền: cọc qua ngân hàng đối tác (mô phỏng), khoản trả thẳng ngoài app được ghi nhận và đối soát, quyết toán tự động theo nghiệm thu, hoàn, phạt, phí.
6. Kho, xe, điểm gom; chuyển rủi ro; hao hụt đường.
7. QR: lô và truy xuất, nhận hàng, thẻ chuyến (tài xế, xe), niêm phong mẫu đối chứng, biên bản tại chỗ, xác minh tài liệu, VietQR.
8. Tài liệu PDF có phiên bản, mã băm SHA-256, ký OTP và ký số mô phỏng.
9. Hàng việc thủ công cho con người, có SLA.
10. Ghép cung cầu giấu giá, giá tham khảo, các luật chống ép giá, khai thấp, lách, ép loại.

### 3.2 Ngoài phạm vi v2

- Tiền thật, ngân hàng thật, chữ ký số thật của tổ chức chứng thực, hóa đơn điện tử thật (chỉ mô phỏng có nhãn "DỮ LIỆU THỬ").
- Ứng tiền, bảo hiểm, vật tư trả sau ở mức nghiệp vụ đầy đủ (chỉ có vật tư đối trừ trong bao tiêu ở dạng khoản ghi nhận).
- Sổ vườn đầy đủ (nhật ký canh tác chỉ giữ phần cần cho: ngày cách ly thuốc, nhật ký thu hoạch của bao tiêu).
- Tin tức, thời tiết, học kỹ thuật (giữ chỗ trên giao diện, không có nghiệp vụ).
- Phân quyền nhiều người trong tổ chức bên mua **có** trong v2 (khác V1), vì kiểm thử chéo cần vai kế toán, kho; nhưng chỉ 5 vai cố định (mục 9 của `02`).
- Rau ăn lá, gia súc, gia cầm, thịt, trứng, sữa, lâm sản: không mở giao dịch.

## 4. Quyết định kế thừa từ tài liệu đã chốt

Các quyết định dưới đây đã được người dùng duyệt ở các phiên trước. v2 giữ nguyên, chỉ chuẩn hóa cách viết.

| Mã | Quyết định | Nguồn |
|---|---|---|
| K01 | AgiViet **chỉ giữ cọc** qua ngân hàng đối tác; phần còn lại hai bên **trả thẳng**, app ghi nhận và đối soát. Mô hình "ký quỹ toàn phần" đã bỏ | Brief app bán chốt V1 mục 3; đặc tả app mua V1 mục 2 và mục 8 (cấm dùng "ký quỹ toàn phần") |
| K02 | Cọc mặc định **30%** giá trị tính cọc, do bên mua chuyển, ngân hàng xác nhận mới tính | Brief app bán 13.4 |
| K03 | Người bán không trả phí giao dịch; bên mua trả phí theo gói, phí lưu vào hợp đồng lúc ký | Brief app bán 3.9; co_che_production 0.3 |
| K04 | Bốn loại tiền tách riêng: cọc, trả thẳng, ứng tiền, vật tư đối trừ. Không có đường nào "coi như đã nhận tiền" | Brief app bán 3.3, 13.7 |
| K05 | Xác nhận tiền luôn kèm số: "Đã nhận đủ [số]", "Nhận một phần [số]", "Chưa nhận" | Brief app bán 3.5 |
| K06 | Lệnh cọc đi 4 chặng: Đã gửi lệnh → Ngân hàng đang xử lý → Ngân hàng đã xác nhận (hoặc thất bại) → Đã đối soát | Brief app bán 3.7; đặc tả mua (mục E bản đánh giá) |
| K07 | Hợp đồng cọc: chỉ có hiệu lực và được app bảo vệ khi cọc qua app | mighty-waddling-sutton Vấn đề 4 |
| K08 | Nghiệm thu 3 phần: đạt (giá đơn), hạ cấp (giá hạ cấp đã ký), trả lại (0 đ). Trả lại quá 5% phải có ảnh | mighty-waddling-sutton; brief 13.6 |
| K09 | Giá tham khảo = trung vị đơn đã chốt 30 ngày theo mặt hàng và loại (và vùng khi đủ dữ liệu); tối thiểu 3 đơn, ghi nguồn và số đơn; thiếu thì "chưa đủ dữ liệu" | mighty-waddling-sutton Vấn đề 2 |
| K10 | Giá tính cọc, tính phí = max(giá khai, 70% giá tham khảo). Giá dưới 60% tham khảo là **giá bất thường**: người bán xác nhận thêm, đơn được đánh dấu cho vận hành | mighty-waddling-sutton Vấn đề 3 |
| K11 | Cảnh báo (không chặn) khi giá dưới 80% tham khảo hoặc dưới giá vốn | mighty-waddling-sutton; brief 13.1 |
| K12 | Giá thấp nhất chịu bán là **kín**; ghép hàng giấu giá; một giá cho cùng loại trong một phiếu; giá chào chỉ tăng; tối đa 2 lần trả giá, mỗi lượt 24 giờ; chào dưới 60% tham khảo không gửi được | co_che 4.3 |
| K13 | Bán gấp không lộ cho bên mua; có sàn bằng giá bao tiêu; tách lô theo loại; người nhận hàng kém loại; đối tác bao tiêu | mighty-waddling-sutton Vấn đề 1; co_che 4.4 |
| K14 | Che số điện thoại, Zalo, số tài khoản, đường dẫn trong tin nhắn và ảnh **tới khi cọc** | Brief 13.12; co_che 5.2 |
| K15 | Mọi bước có hạn; im lặng ở **đề nghị** = không đồng ý; im lặng ở **nghiệm thu giao xa có điều khoản** = đạt (tính từ lúc người được chỉ định ký nhận); im lặng **không bao giờ** = đã nhận tiền | Brief mục 9; đặc tả mua L6 |
| K16 | Phản đối đúng dòng; phần không tranh chấp được chốt và xử lý tiền ngay | Đặc tả mua L11 |
| K17 | Người giúp (con cháu) không ký, không xác nhận tiền, không đổi tài khoản nhận tiền | Brief mục 2 |
| K18 | Đổi tài khoản nhận tiền: xác thực tăng cường, chờ 24 giờ, báo bên mua | Đặc tả mua M7; kiến trúc v4 mục 13 |
| K19 | Hàng tươi không chở ngược: hàng không đạt xử lý tại chỗ (hạ cấp, bán gấp gần đó, kho lạnh, tiêu hủy có biên bản) | co_che 3.6 bước 4 |
| K20 | Kiểm định 3 cấp (tự kiểm, kiểm tại điểm giao, kiểm định độc lập); bên sai chịu phí | co_che 3.5 |
| K21 | Thiếu lượng: bất khả kháng có bằng chứng báo trước thì không phạt; ước sai có phạt nhẹ; không báo thì nặng hơn; lượng "ước tính" chỉ hứa tối đa 80% | co_che 3.4; brief 13.8 |
| K22 | Hợp đồng khung: cọc khung giữ suốt hợp đồng; mức được phép = cọc khung + cho nợ thêm; vượt thì dừng cam kết mới, không hủy lần đã chốt | Brief 13.10 |
| K23 | Đơn nhóm: pha gom và pha thực hiện; mỗi người bán một phần hợp đồng độc lập | co_che 3.3 |
| K24 | Phân khúc bên mua **suy ra dần** từ phiếu nhu cầu và hỏi xác nhận một lần; một tổ chức có thể nhiều phân khúc | Đặc tả mua 3.1 |
| K25 | Dữ liệu kỹ thuật: tiền dùng số nguyên đồng (không dùng số thực), thời gian lưu UTC hiển thị giờ Việt Nam, lệnh thay đổi có khóa chống lặp và số phiên bản, sự kiện đối tác chống lặp, nhật ký chỉ ghi thêm | Kiến trúc v4 mục 11, 12 |
| K26 | Lệnh thanh toán và hướng dẫn thanh toán **chụp lại tài khoản đích lúc lập**, không đổi theo tài khoản mặc định mới | Kiến trúc v4 mục 8 (PaymentInstruction) |

## 5. Quyết định mới của v2

| Mã | Quyết định | Lý do ngắn | Chi tiết |
|---|---|---|---|
| Q01 | Danh mục MVP 8 mặt hàng, 3 cấp mở (mở ngay 4, mở khi có kiểm định 2, mở nhánh kém loại 2) | Tập trung nơi có cầu rõ, chuẩn hóa được, phù hợp 4 phân khúc | `01` |
| Q02 | **Điểm nghiệm thu chất lượng trùng điểm chuyển rủi ro** (giải quyết HĐ-0018, mục 6.2) | Một mốc vừa chốt loại vừa chốt ai chịu; không chở hàng trả lại | `03`, `06` |
| Q03 | Lượng giao tính theo **cân tại điểm nghiệm thu**; cân ở điểm đến chỉ dùng để đo hao hụt đường | Theo bản đánh giá C1 | `06` |
| Q04 | Thang phạt thiếu lượng theo **phần trăm cọc của phần thiếu**: 0% (bất khả kháng), 10% (ước sai báo ≥ 3 ngày), 50% (báo < 3 ngày), 100% (không báo); phạt trả cho bên mua, cấn vào tiền quyết toán của người bán | Chuẩn hóa "mất cọc phần thiếu" thành khoản tính được; cần luật sư rà theo Điều 328 BLDS và NQ 03/2026 | `04` |
| Q05 | Phí giới thiệu tính trên **giá trị tính phí lúc ký** (lượng hợp đồng × giá tính cọc), thu cùng cọc; không điều chỉnh theo kết quả nghiệm thu; chỉ hoàn theo bảng hoàn phí khi hủy hoặc giảm lượng có căn cứ | Không tạo động cơ trả lại hàng để giảm phí; tính được ngay lúc cọc | `04` |
| Q06 | Bảng hoàn phí khi hủy (trước đây "đề xuất chờ chốt") được áp dụng làm luật v2 | Cần để kiểm thử; vẫn chỉnh được trong cài đặt | `04` |
| Q07 | Cọc không vượt giá trị hợp đồng: cọc = min(giá trị hợp đồng, 30% × giá trị tính cọc) | Trường hợp giá khai rất thấp làm giá tính cọc cao hơn giá khai | `04` |
| Q08 | Đơn giao nhiều đợt (giao bù): phần còn nợ là **đợt giao** mới của cùng đơn; đơn chỉ hoàn tất khi mọi đợt đã nghiệm thu hoặc đã được hai bên kết thúc | Sửa F04 | `03` |
| Q09 | Đơn nhóm tính phí **một lần trên tổng nhóm**, phân bổ theo phần | Tránh phí sàn nhân nhiều lần trên đơn nhỏ | `04` |
| Q10 | Hợp đồng khung tính phí theo **kỳ thanh toán**, không áp phí sàn | Đơn nhà hàng rất nhỏ | `04` |
| Q11 | Mở liên lạc theo ngưỡng: đơn dưới 3.000.000 đ chỉ "Gọi qua app" (số che); số thật hiện khi đơn đủ ngưỡng hoặc đã có 2 đơn hoàn tất | Chống tạo đơn nhỏ để lấy số (N2 trước đây là đề xuất) | `05` |
| Q12 | Giới hạn chào vượt lượng: tổng lượng các lời chào đang mở ≤ 2 lần lượng cần của phiếu | P3 trước đây là đề xuất | `05` |
| Q13 | Bên mua có 5 vai cố định trong tổ chức (chủ, mua hàng, kế toán, kho, người nhận tại điểm); duyệt chi khi vượt hạn mức | Kiểm thử chéo cần vai kế toán và kho | `02` |
| Q14 | Mọi PDF có mã băm SHA-256, chuỗi phiên bản (mã băm bản trước), QR xác minh; ký OTP là chữ ký điện tử đơn giản; "ký số mô phỏng" dùng cặp khóa thử của AgiViet, ghi rõ không phải chữ ký số công cộng | Kiểm thử như thật mà không giả mạo pháp lý | `07` |
| Q15 | QR nhận hàng **động**, gắn đơn + đợt + người nhận, hết hạn theo cửa sổ giao; mã 6 số đi kèm làm dự phòng khi không quét được | Thay mã tĩnh 482 917 | `06` |
| Q16 | Hàng việc thủ công có 4 mức ưu tiên (P0–P3), mỗi việc có hạn, người phụ trách, lý do, kết quả; người lập và người duyệt lệnh tiền thủ công phải khác nhau | Kế thừa vận hành v3 mục 18, chuẩn hóa | `08` |
| Q17 | Lô không đạt chỉ tiêu an toàn (dư lượng, kháng sinh, cadimi) bị **khóa bán gấp và khóa kênh hàng kém loại**; chỉ chào lại khi có kết quả kiểm mới và vận hành duyệt | Không hợp thức hóa hàng không an toàn bằng giá rẻ (nghiên cứu vận hành, FAO) | `05`, `08` |
| Q18 | Giá tham khảo chỉ tính từ đơn đã nghiệm thu chốt, loại trừ: đơn giá bất thường, đơn của cặp bị đánh dấu, đơn ngoài app; cần ≥ 3 đơn từ ≥ 2 cặp mua bán khác nhau | Chống kéo giá bằng vài đơn rẻ (P14) | `05` |
| Q19 | Lúa tươi quy đổi khối lượng theo độ ẩm chuẩn ghi trong hợp đồng; tôm theo bảng giá cỡ (con/kg) ghi trong hợp đồng; điều chỉnh theo bảng là **luồng thuận**, không phải tranh chấp | Mặt hàng có chỉ tiêu đo, không chia loại 1/2 kiểu trái cây | `01` |
| Q20 | Gói bên mua theo phân khúc: Miễn phí, Thu mua, Doanh nghiệp, Bếp (giá thử, kiểm định bằng pilot) | Yêu cầu 8 của người dùng | `11` |

## 6. Mâu thuẫn tìm thấy và cách giải quyết

### 6.1 Danh sách

| Mã | Mâu thuẫn | Phương án chọn | Lý do |
|---|---|---|---|
| M01 | `co_che_production` (22/10): bên mua nạp **đủ tiền vào ký quỹ** trước giao 24 giờ, cọc 10–20%. Brief app bán và đặc tả app mua (22–23/10): **chỉ giữ cọc 30%**, phần còn lại trả thẳng; cấm chữ "ký quỹ toàn phần" | Chỉ giữ cọc 30% (K01, K02) | Tài liệu sau, người dùng đã chốt; ít phụ thuộc giấy phép trung gian thanh toán hơn |
| M02 | Kiến trúc v4 và vận hành v3 (30/9): không chặn liên hệ, tự giao dịch miễn phí, phí chỉ khi mua hỗ trợ. Các tài liệu 22–23/10: che liên lạc tới khi cọc, cọc bắt buộc | Theo tài liệu 22–23/10 (K14), thêm "Gọi qua app" (Q11) để không làm app khó dùng | Người dùng chốt sau; nghiên cứu ChatGPT cảnh báo che liên lạc dễ gây khó chịu, nên giữ kênh gọi che số và đo tỷ lệ phàn nàn (giả thuyết G7 ở `11`) |
| M03 | Bảng phí: co_che (Cơ bản 1%/0,5%; Thu mua 1,5 tr/tháng 0,3%; DN 0,2%; Bếp 490.000/tháng 0%); kiến trúc v4 (Free 0,8% trần 3 tr; Business 0,3% trần 1,5 tr); mã động cơ (1%, 0,3%, sàn 50.000, trần 3 tr) | Theo co_che có chỉnh sàn/trần (`11` mục 2) | Co_che gắn với phân khúc; mã động cơ là mô phỏng |
| M04 | Im lặng khi người bán không xác nhận số cân: co_che "24 giờ coi như đúng, giải ngân"; brief "nhắc 3 lần rồi vận hành đối chiếu, cọc vẫn giữ" | Theo brief; thêm SLA vận hành 48 giờ và bước "vận hành chốt theo biên bản có chữ ký hai bên" khi người bán không phản hồi quá 72 giờ (`08`) | Bảo vệ người bán; tránh treo vô hạn |
| M05 | Hạn chờ nghiệm thu: co_che "2 giờ, im lặng = đạt" cho mọi giao xa; đặc tả mua "giao gần 12 giờ (tươi)/24 giờ, số biên bản chỉ là số tạm" | Giữ cả hai, phân biệt theo điều khoản: giao xa có điều khoản 2 giờ thì im lặng = đạt; giao gần thì không có im lặng = đạt, chuyển vận hành | Đúng K15 |
| M06 | HĐ-0018: "Đạt khi bốc" (rủi ro sang bên mua) nhưng ở kho vẫn hạ cấp 120 kg, trả lại 30 kg trừ tiền người bán | Xem 6.2 | |
| M07 | Bản test giao ngay dùng QR/mã 482917 tĩnh; co_che nói mã nhận hàng; không có quy tắc hết hạn | QR động (Q15) | Chống chụp lại mã dùng lần sau |
| M08 | Nhóm phân khúc: co_che 5 phân khúc (gồm bán lẻ); đặc tả mua V1 6 phân khúc (gồm mua thử); người dùng v2 chốt 4 | 4 phân khúc chính; "bán lẻ, chuỗi" gộp vào đầu mối (nếu mua bán lại) hoặc để sau; "mua thử" là **trạng thái** (đơn đầu với người lạ), không phải phân khúc | Quyết định 1 của người dùng |
| M09 | Giá tham khảo dùng "giá chợ" (bản cũ) vs trung vị đơn đã chốt | Trung vị đơn đã chốt; lúc khởi đầu chưa đủ đơn thì hiện **giá công khai có nguồn** (chợ đầu mối, sở nông nghiệp) với nhãn "nguồn ngoài, không dùng tính cọc" | Co_che 1.2 "gà và trứng"; K09 |
| M10 | Phạt thiếu lượng: brief "mất cọc phần thiếu" (cọc là tiền bên mua, người bán không "mất" được); co_che "phạt 10% cọc phần thiếu" | Thang Q04 | Phải tính được thành khoản tiền cụ thể |
| M11 | Mã động cơ `tyLeCoc: 0.1` vs luật 30% | 30% (cấu hình được theo loại hợp đồng) | K02 |
| M12 | Phí "đã trả, không hoàn" hiện ngay khi chuyển cọc | Trạng thái phí: "Đã thu · hoàn hay không tùy kết quả đơn" cho tới khi đơn kết thúc | Bản đánh giá app mua v2 |
| M13 | Đổi ngày sau khi ký: chỉ người bán ký lại bản 2 | Mọi phụ lục cần **hai bên ký** cùng phiên bản | Bản đánh giá app mua v2 |
| M15 | Co_che: người bán thấy cảnh báo "bên mua này thường chào thấp"; brief app bán (bản chốt): cấm gắn nhãn này | Không hiện nhãn; uy tín bên mua chỉ gồm 4 chỉ số hành vi (trả đúng hạn, đồng ý rồi bỏ, hủy sau cọc, hạ loại không căn cứ); tỷ lệ chào thấp là chỉ số nội bộ (`05` mục 4, 5.2) | Bản chốt sau; tránh bôi xấu dựa trên quyền tự do chào giá |
| M14 | Hàng trả lại sau nghiệm thu: không có nghĩa vụ vật lý (GN-41) | Theo Q02, trả lại ở điểm nghiệm thu nên hàng không rời chủ; giao tại kho thì người bán chọn: nhận lại trong hạn, ủy quyền bán gấp tại chỗ, hoặc tiêu hủy có biên bản; quá hạn không chọn thì vận hành xử lý theo điều khoản (`06` mục 5) | |

### 6.2 Mâu thuẫn HĐ-0018 "Đạt khi bốc" và hạ cấp, trả lại ở kho

**Tình huống:** HĐ-0018 giao tại vườn, bên mua lo xe 180 km, đã "Đạt khi bốc". Ở kho, bên mua vẫn ghi hạ cấp 120 kg (trầy vỏ) và trả lại 30 kg (dập), trừ tiền người bán. Theo luật chuyển rủi ro, hư do đường thuộc bên mua.

Ba cách đã nêu trước đây: (a) giữ ví dụ, đổi lý do thành "khác mẫu đối chứng"; (b) chuyển chia loại ra lúc bốc tại vườn; (c) đổi sang người bán chở tới kho.

**Chọn (b), mở rộng thành luật chung Q02:**

> Nghiệm thu chất lượng (chia đạt, hạ cấp, trả lại) được thực hiện **tại điểm chuyển rủi ro** ghi trong hợp đồng.
> - Giao tại vườn, ao, ruộng (bên mua lo xe): nghiệm thu 3 phần **tại vườn trước khi bốc**. Phần trả lại **không lên xe**, ở lại với người bán và thành lô con loại dưới. Ký biên bản nghiệm thu tại chỗ = rủi ro chuyển sang bên mua với phần đã bốc.
> - Giao tại kho bên mua (người bán lo xe): nghiệm thu 3 phần **tại kho**; rủi ro đường thuộc người bán.
> - Giao tại điểm gom: nghiệm thu tại điểm gom.
>
> Ở nơi đến (khi điểm nghiệm thu không phải nơi đến), bên mua chỉ còn hai việc:
> 1. đo **hao hụt đường** (cân lại): trong mức cho phép của mặt hàng thì không ai đền; vượt mức thì bên lo xe chịu (đòi nhà xe hoặc bảo hiểm), không trừ tiền người bán;
> 2. khiếu nại **khác mẫu đối chứng** (lỗi ẩn có từ trước khi bốc, ví dụ sâu trong cuống, đánh tráo) trong 2 giờ kể từ khi người được chỉ định ký nhận, kèm mẫu niêm phong; đi thẳng sang kiểm định; kết quả kiểm định quyết định.

**Lý do chọn:**
1. Một mốc vừa chốt loại vừa chốt rủi ro, không còn câu hỏi "hư lúc nào, do ai".
2. Hàng trả lại không rời vườn: không phát sinh cước chở ngược và không có nghĩa vụ vật lý treo (giải luôn GN-41 cho giao tại vườn).
3. Người bán chứng kiến việc chia loại, đúng nguyên tắc FAO về chứng kiến phân hạng.
4. Phù hợp thực tế thương lái ĐBSCL: chọn hàng, cắt loại tại vườn rồi mới cân bốc.
5. Bất lợi: phải vẽ lại màn nghiệm thu ở hai app (màn nghiệm thu dùng được cả tại vườn và tại kho, khác nhau ở điểm). Chấp nhận vì v2 làm lại giao diện.

**Ví dụ HĐ-0018 viết lại trong v2 (mã HĐ-2001):** tại vườn chị Năm, nhân viên thu mua của Đồng Xanh chia: đạt 1.850 kg, hạ cấp 120 kg (trầy vỏ), trả lại 30 kg (dập). Bốc 1.970 kg. Tới kho cân 1.950 kg: hao hụt 20 kg = 1,02%, trong mức 2% của xoài cho chuyến dưới 24 giờ, không ai đền. Tiền không đổi so với bản cũ: giá trị nghiệm thu 44.350.000 đ (chi tiết `04` mục 7.1).

### 6.3 Năm lỗi F01–F05 và luật v2 để không tái diễn

| Lỗi | Hiện tượng | Luật v2 | Bất biến kiểm tra | Tình huống |
|---|---|---|---|---|
| F01 | Tồn lô bị trừ hai lần sau đơn hoàn tất | **Sổ lượng một nguồn**: mỗi kg của lô nằm đúng một ngăn (khả dụng, giữ tạm, cam kết, đang giao, đã giao, trả lại chờ xử lý, đã chuyển lô con, hao hụt/loại bỏ). Hoàn tất đơn chuyển kg từ "đang giao" sang "đã giao" đúng một lần | Tổng các ngăn = lượng lô; mọi chuyển ngăn là sự kiện có khóa chống lặp | TH-041 |
| F02 | Gia hạn sau quá hạn không đổi hạn nghiệm thu | **Hạn là thực thể riêng** có loại (hạn ký, hạn cọc, hạn trả, hạn nghiệm thu, hạn xác nhận số cân, hạn trả lời đề nghị…). Gia hạn chỉ tác động đúng một hạn đã chọn: hạn mới = giờ xử lý + thời lượng gia hạn; ghi ai gia hạn, lý do; hạn khác giữ nguyên | Sau gia hạn: hạn mới > giờ xử lý | TH-033 |
| F03 | Người giúp kích hoạt được tài khoản nhận mới | **Quyền kiểm theo từng hành động** ở server: `tai_khoan.yeu_cau_doi`, `tai_khoan.kich_hoat`, `tai_khoan.huy_yeu_cau` chỉ chủ tài khoản; người giúp bị chặn ở API, không chỉ ẩn nút | API trả lỗi quyền với vai người giúp cho cả ba hành động | TH-023 |
| F04 | Chọn giao bù nhưng đơn lại xử lý như dừng phần thiếu | Giao bù tạo **đợt giao mới** cho phần còn nợ, có lịch, lượng; đơn không hoàn tất khi còn đợt mở; "kết thúc phần thiếu" là lựa chọn khác, có hệ quả tiền khác | Đơn hoàn tất ⇒ mọi đợt ở trạng thái cuối | TH-039 |
| F05 | Lệnh cũ hiện tài khoản mới sau khi đổi | Lệnh thanh toán, hướng dẫn trả thẳng, VietQR **chụp tài khoản đích lúc lập**, bất biến | Đọc lại lệnh cũ sau khi đổi tài khoản: tài khoản đích không đổi | TH-023 |

## 7. Nguyên tắc chung cho kỹ sư

1. **Một sự thật duy nhất:** mọi màn và mọi chỉ số đọc từ backend. Không màn nào tự tính trạng thái từ dữ liệu cục bộ.
2. **Trạng thái do server quyết:** client chỉ gửi lệnh; server kiểm điều kiện, quyền, hạn, phiên bản, rồi phát sự kiện.
3. **Lệnh có khóa chống lặp** (`idempotency_key`) và số phiên bản mong đợi (`expected_revision`). Gửi lặp trả lại đúng kết quả cũ.
4. **Không xóa:** sửa sai bằng bản ghi điều chỉnh tham chiếu bản ghi cũ.
5. **Không chọn sẵn** ô xác nhận về tiền, hàng, số cân.
6. **Mất mạng:** cho lưu nháp (đăng lô, biên bản, ảnh); **không** cho ký, xác nhận tiền, chốt số cân khi chưa có phản hồi server.
7. **Chữ cấm dùng** (kế thừa): "ký quỹ toàn phần", "escrow", "giải ngân", "coi như đã nhận", "Xong" khi còn nghĩa vụ, "đấu giá", "rẻ nhất" làm nhãn xếp hạng, nhãn "cần bán gấp" hiện cho bên mua.
8. Mọi dữ liệu thử gắn nhãn "DỮ LIỆU THỬ" trên PDF và trên màn tiền.

## 7b. Lệch giữa đặc tả và lược đồ CSDL (đối chiếu `docs/database/07-danh-gia-thanh-that.md`, 25/10/2026)

Phần lớn mục "chưa khớp" trong bản đánh giá lược đồ là việc backend còn phải làm (lệnh, bộ ghép, bộ lọc tin nhắn, định dạng QR, sinh PDF, worker SLA). Đặc tả không đổi vì chúng. Bốn chỗ dưới đây cần chốt ở mức nghiệp vụ; phương án ghi ở đây là quyết định của đặc tả:

| Mã | Chỗ lệch | Chốt |
|---|---|---|
| LS-1 | Lược đồ giữ UNIQUE "một quyết toán cuối mỗi đơn"; đặc tả cần quyết toán **có phiên bản** (TH-047, TH-029/031 quyết toán từng phần rồi kết luận) | Theo đặc tả: quyết toán là bản ghi có phiên bản, UNIQUE (đơn, số phiên bản) và chỉ **một phiên bản hiệu lực**; phiên bản sau tham chiếu phiên bản trước; lệnh ngân hàng đã gửi giữ nguyên, chênh lệch thành nghĩa vụ điều chỉnh (`T_bm`/`T_nb`) |
| LS-2 | Bao tiêu BT-2005 trong dữ liệu nền chỉ nạp thành kế hoạch, chưa là đơn có cọc vụ 9.000.000 được ngân hàng xác nhận | Dữ liệu nền **không** tạo tiền giả. Tiền điều kiện của TH-055 phải chạy qua workflow: tạo đơn bao tiêu, hai bên ký, ngân hàng mô phỏng xác nhận cọc vụ, chốt đợt 1 (3.000 kg) bằng lệnh thật; sau đó mới chạy đợt 2, 3. Tương tự, số dư "đã giao chưa trả / đã chốt sắp giao" của KH-2003 là **số dư đầu kỳ** có nhãn nhập khẩu, chấp nhận cho TH-053 |
| LS-3 | Phụ lục giảm lượng do bất khả kháng khi bên mua im lặng (TH-040 nhánh b): lược đồ chưa có cách thay chữ ký bên mua | Thêm phương thức chữ ký `quyet_dinh_van_hanh` (hai người: đề xuất + duyệt, ký số mô phỏng của AgiViet), chỉ hợp lệ cho phụ lục loại "giảm lượng do bất khả kháng"; phụ lục ghi rõ "ký thay bằng quyết định vận hành [mã]" |
| LS-4 | Chỉ giá tham khảo xoài L1 tính từ 14 đơn nền thật; 11 giá còn lại là nguồn ngoài có nhãn, theo M09 **không dùng tính cọc** | Giữ luật M09. Với các mặt hàng đó, `P_coc = P`. Mọi số kỳ vọng ở `04` và `09` không đổi vì trong các ví dụ giá đơn đều ≥ 70% giá tham khảo; riêng ghi chú "70% × giá tham khảo" ở TH-048 chỉ là thông tin hiển thị |

Ghi chú khác: lược đồ đếm 32 tổ chức vì tính cả đối tác (ngân hàng, kiểm định, nhà xe, kho) và AgiViet; `10` đếm 19 bán + 8 mua. Hai cách đếm khớp nhau.

## 8. Thuật ngữ

| Từ | Nghĩa trong v2 |
|---|---|
| Lô | Một lượng hàng của một người bán, một mặt hàng, một loại, tại một nơi, có nguồn gốc (vườn, ao, ruộng). Lô có thể có lô con (tách loại, trả lại) |
| Nhu cầu (phiếu nhu cầu) | Yêu cầu mua của bên mua: mặt hàng, loại, lượng, lịch, nơi nhận, giấy tờ, giá tối đa kín |
| Lời chào | Đề nghị giá có hạn từ bên mua tới một lô (hoặc báo giá kín từ người bán tới một nhu cầu) |
| Giữ lượng | Lượng của lô được giữ có hạn sau khi đồng ý giá, trước khi thành hợp đồng có hiệu lực |
| Đơn (hợp đồng cọc) | Thỏa thuận mua bán có phiên bản, hai bên ký; có hiệu lực bảo vệ khi cọc đã được ngân hàng xác nhận |
| Phụ lục | Phiên bản mới của đơn sau khi hai bên đồng ý một đề nghị sửa |
| Đợt giao | Một lần giao trong đơn (đơn giao ngay thường có 1 đợt; giao bù, bao tiêu, khung có nhiều đợt) |
| Chuyến | Một xe chạy, có thể chở hàng của một hoặc nhiều đợt (ghép chuyến) |
| Điểm nghiệm thu | Nơi chia đạt / hạ cấp / trả lại, trùng điểm chuyển rủi ro |
| Giá trị nghiệm thu (V) | Σ lượng đạt × giá đơn + Σ lượng hạ cấp × giá hạ cấp (+ điều chỉnh theo bảng cỡ, độ ẩm nếu có) |
| Trả thẳng | Tiền bên mua chuyển trực tiếp cho người bán (ngoài tài khoản cọc), người bán xác nhận số |
| Quyết toán | Phép tính chia cọc cho người bán, hoàn bên mua, khoản còn phải trả hoặc còn phải hoàn |
| Đối soát | Đối chiếu sự kiện ngân hàng với lệnh; hoặc (thủ công) đối chiếu chứng từ khi hai bên khai khác nhau |
| Vận hành | Nhân viên AgiViet trên trang vận hành |

## 9. Sửa theo soát bảo mật (`docs/bao-mat/06` N-01…N-16, `docs/bao-mat/01`), 25/10/2026

Đồng ý cả 16 mục; không mục nào bị bác. Một mục (N-14) chỉ sửa một phần, có lý do ghi bên dưới. Đặc tả cũng khớp với migration 0024–0029: hoàn tiền về tài khoản nguồn, đích lệnh chi theo phiên bản hợp đồng, OTP có ràng buộc, vai runtime không đọc đồng hồ thử.

| Mục | Đã sửa ở đâu | Nội dung |
|---|---|---|
| N-01 | `03` mục 5.2, 9.1, 9.3; `12` A7 | Ghi cọc chỉ sau khi **tra lại API ngân hàng**; nộp thiếu vào tiền treo theo đơn; tiền đến sau khi đơn đóng không làm đơn sống lại, mà hoàn về tài khoản nguồn; "thất bại" của lệnh phải được tra lại xác nhận |
| N-02 | `03` mục 9.2; `12` A6; `09` quy ước chung | "Đã nhận [số]" cần OTP `money_received` gắn số tiền và mã khoản, trên máy bên nhận. Chuyển khoản bắt buộc mã giao dịch; tiền mặt cần biên nhận hai bên ký |
| N-03 | `07` mục 3; `06` QR-05 và luồng mục 8 | Ký biên bản tại chỗ phải có PIN app hoặc sinh trắc ngay trước khi ký, không có thì OTP. Đăng nhập cộng quét mã không còn được coi là hai yếu tố |
| N-04 | `06` mục 7 | QR dùng payload chuẩn tắc có chữ ký Ed25519 đầy đủ, xác minh offline bằng khóa công khai, server quyết cuối. QR nhận hàng và QR biên bản dùng một lần (`jti`). Bỏ dạng HMAC 8 ký tự |
| N-05 | `06` QR-06; `07` mục 6.2 | Trang xác minh công khai không trả bản gốc; chỉ cho tải lên để so, có giới hạn cỡ tệp, tần suất, xử lý cách ly |
| N-06 | `08` V08, mục 6.1; `03` 9.2 | Kết luận đối soát chỉ dựa trên xác nhận có OTP của bên nhận hoặc tra soát ngân hàng; ảnh và cuộc gọi chỉ là đầu mối; chỉ gọi ra số đã xác minh |
| N-07 | `08` mục 8; `12` A9 | Đồng hồ thử, cổng mô phỏng, OTP thử và nạp lại dữ liệu chỉ có ở môi trường thử: cờ biên dịch, kiểm khi khởi động, DB runtime không đọc đồng hồ thử |
| N-08 | `04` mục 6 và ví dụ 7.12; `09` TH-029, TH-031 | Khi chi tạm, giữ thêm `G_them` = phí kiểm định bên mua đã ứng + mức phạt tối đa của phần tranh chấp. Số mới ở dưới bảng |
| N-09 | `08` mục 8 | Đổi chính sách cần người lập khác người duyệt, hiệu lực sau 24 giờ |
| N-10 | `08` mục 2 (VH-QL), mục 8 | Tách quyền: VH-QL không duyệt lệnh tiền, không mở khóa tài khoản nhận tiền. Vai vận hành đăng nhập bằng FIDO2 |
| N-11 | `03` mục 8; `12` A7 | Kết quả kiểm định chỉ nhận qua kênh có chữ ký, đối chiếu QR niêm phong |
| N-12 | `06` QR-09 | Lời mời gắn số điện thoại, nhận bằng OTP đúng số; vai có quyền tiền hiệu lực sau 24 giờ |
| N-13 | `03` mục 9.1 | Bất biến cọc tính trên C; số nộp là C + F, phí F theo dõi ở sổ riêng (khớp BT-T1) |
| N-14 | `04` mục 1 | Cảnh báo và gắn cờ khi tiền mặt từ 20.000.000 đ một lần. **Chưa đặt trần cứng**: trần phải theo quy định hiện hành, chờ luật sư; chặn cứng lúc này có thể chặn giao dịch lúa hợp lệ (TH-059 có 33.320.000 tiền mặt, nay hiện cảnh báo) |
| N-15 | `02` mục 3.1; `03` mục 12.5 | Tổ hợp tác không nhận tiền chung; v2 dùng đơn con từng hộ cho tới khi luật sư xác nhận. HTX (pháp nhân) giữ lô gộp |
| N-16 | `12` B2 A1–A3 | Thay "Gọi đọc mã cho tôi" bằng cuộc gọi tự động chỉ đọc mã kèm câu cảnh báo; không có nhân viên đọc mã |
| D-07, D-18 | `03` mục 9.3 | Đích `chi_coc_nb` là tài khoản ghi trong phiên bản hợp đồng hiện hành, không phải tài khoản đang dùng lúc tạo lệnh; mọi lệnh hoàn về tài khoản nguồn. Lệnh tới tài khoản kích hoạt dưới 72 giờ, số từ 20 triệu trở lên, được giữ chờ gọi lại |

**Số tiền thay đổi do N-08** (mọi số khác trong `04` và `09` giữ nguyên):

| Ví dụ | Trước | Sau |
|---|---|---|
| 7.12 / TH-029, chi tạm | 9.850.000, giữ 3.950.000 | 9.570.000, giữ 4.230.000 |
| 7.12A (người bán sai) | `C_bm` 3.950.000, `T_nb` 280.000 ngoài app | `C_bm` 4.230.000, `T_nb` 0; người bán ròng 41.770.000 (không đổi) |
| 7.12B (người bán đúng) | Chi thêm 2.300.000 | Chi thêm 2.580.000; `C_bm` 1.650.000 (không đổi) |
| TH-031, thỏa thuận chia 50/50 | Chi thêm 1.150.000, hoàn 2.800.000, người bán hoàn 140.000 ngoài app | `X_nb` 140.000, `N` 43.060.000; chi thêm 1.290.000, hoàn 2.940.000, không có khoản ngoài app |
