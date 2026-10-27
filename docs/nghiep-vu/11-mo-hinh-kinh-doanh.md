# 11 · Mô hình kinh doanh: gói, nguồn thu, giả thuyết, chỉ số, kịch bản kiểm định

## 1. Ai dùng, ai trả, ai hưởng

| Vai | Ví dụ | Trả gì |
|---|---|---|
| Người dùng hưởng lợi chính | Hộ, HTX, tổ hợp tác | **0 đ** (đã chốt). Chỉ trả dịch vụ đối tác tự chọn (xe, kho, kiểm định), trả trực tiếp đối tác |
| Khách trả phí | Tổ chức bên mua | Phí giới thiệu theo đơn và/hoặc thuê bao gói |
| Đối tác | Ngân hàng, kiểm định, nhà xe, kho lạnh | Hoa hồng hoặc phí giới thiệu (chỉ khi có thỏa thuận thật) |

Nguyên tắc giữ sứ mệnh (kế thừa nghiên cứu): gói trả phí **không** mua quyền ép giá, không mua quyền thấy giá kín, không mua ưu tiên thắng tranh chấp, không mua quyền thấy người bán đang bán gấp. Mọi bảo vệ cốt lõi (giá kín, cọc, nghiệm thu 3 phần, phản đối, kiểm định, hồ sơ) **như nhau** ở mọi gói.

## 2. Gói bên mua (giá thử, kiểm định bằng pilot)

| | **Miễn phí** | **Thu mua** | **Doanh nghiệp** | **Bếp** |
|---|---|---|---|---|
| Dành cho | Vựa nhỏ, quán ăn, mua thử | Nhà máy chế biến, vựa lớn | Xuất khẩu | Nhà hàng có tổ chức |
| Giá | 0 đ | 1.500.000 đ/tháng (tháng đầu theo ngày) | 4.000.000 đ/tháng, ký năm (48.000.000 đ) | 490.000 đ/tháng |
| Phí giới thiệu mỗi đơn | 1,0% đơn đầu với người bán đó; 0,5% đơn sau | 0,3% đơn đầu; **0% mối quen** | 0,2% mọi đơn | 0% (đơn qua đầu mối); hợp đồng khung theo kỳ 0% |
| Sàn / trần mỗi đơn | 20.000 / 2.000.000 | 20.000 / 1.500.000 | 20.000 / 3.000.000 | — |
| Thành viên (tính cả quản lý) | 1 | 5 | 10 | 2 |
| Nhu cầu mới / tháng | 5 | 30 | 100 | 10 |
| Kết nối người bán mới / tháng | 5 | 50 | 200 | 10 |
| Kế hoạch nguyên liệu tháng/vụ | — | Có | Có | — |
| Duyệt chi nhiều cấp, hạn mức theo người | — | Có | Có | — |
| Gom container, kế hoạch ngược từ ngày tàu, hồ sơ giấy tờ theo lô | — | — | Có | — |
| Lịch tuần, gọi thêm/bớt, nhiều điểm nhận | Khung 1 đầu mối | Có | Có | Có |
| Kho, tồn, truy xuất QR | Xem | Có | Có | Có |
| Bảng kê 01/TNDN | Có | Có | Có | Có |
| Xuất dữ liệu, kết nối kế toán (API) | — | Xuất Excel | API | Xuất Excel |
| Điều phối kiểm định có hỗ trợ | Trả theo lần | Trả theo lần | 2 lần/tháng kèm gói | — |

Hết gói hoặc hạ gói: đơn đã ký giữ chính sách phí lúc ký; không khóa xem, khiếu nại, tải hồ sơ.

Hợp đồng khung (nhà hàng, quán): phí theo kỳ = tỷ lệ gói × giá trị nghiệm thu của kỳ, không sàn (Q10). Đơn nhóm: phí một lần trên tổng, sàn/trần áp trên tổng (Q09).

## 3. Nguồn thu

| Nguồn | Ai trả | Khi nào ghi doanh thu | Ghi chú |
|---|---|---|---|
| Phí giới thiệu | Bên mua | Khi đơn kết thúc không hoàn phí (đã thu lúc cọc; trước đó là khoản chờ) | Hoàn theo bảng `04` mục 9 |
| Thuê bao | Bên mua | Theo kỳ cung cấp | Tách khỏi phí đơn khi đo |
| Điều phối kiểm định, có mặt hiện trường | Bên đặt | Khi dịch vụ hoàn thành | Giá cố định theo phạm vi |
| Hoa hồng đối tác (xe, kho, kiểm định) | Đối tác | Khi đủ điều kiện theo thỏa thuận | Không ưu tiên gợi ý chỉ vì hoa hồng |
| Chia phí ứng tiền với ngân hàng | Ngân hàng | Sau v2 | Ngoài phạm vi v2 |

**Không phải doanh thu:** tiền hàng, cọc, giá trị giao dịch (GMV).

## 4. Kinh tế minh họa theo phân khúc (giả định, để thấy độ nhạy)

| Phân khúc | Giả định một tháng | Chi phí cho bên mua | AgiViet thu | Ghi chú |
|---|---|---|---|---|
| Chế biến (Đồng Xanh) gói **Miễn phí** | 3 đơn với người bán mới × 46.000.000 + 5 đơn mối quen × 46.000.000 | 3 × 460.000 + 5 × 230.000 = 2.530.000 | 2.530.000 | — |
| Chế biến gói **Thu mua** | Như trên | 1.500.000 + 3 × 138.000 = 1.914.000 | 1.914.000 | Bên mua tiết kiệm 616.000 → động cơ chuyển gói; AgiViet thu ít hơn nhưng giữ khách lặp |
| Xuất khẩu (Sông Tiền) gói Doanh nghiệp | 1 container 6 nguồn × 216.000.000 | 4.000.000 + 6 × 432.000 = 6.592.000 | 6.592.000 + hoa hồng kiểm định | Giá trị chính: kiểm định, giấy tờ, gom |
| Nhà hàng (Bếp Sen) gói Bếp | 8 lần giao × 1.160.000 | 490.000 | 490.000 | Lỗ đóng góp nếu cần > 1 giờ hỗ trợ/tháng (giả định 100.000 đ/giờ + chi phí khác); cần đo |
| Quán nhỏ (Nhà Mười) Miễn phí | 8 lần × 430.000 | 1% × 3.440.000 = 34.400 | 34.400 | Không tự nuôi chi phí; giá trị là giữ đầu mối (vựa) trên app |
| Vựa lúa (Ba Thành) Miễn phí | 2 đơn đầu × 198.000.000 | 2 × 1.980.000 = 3.960.000 | 3.960.000 | Gói Thu mua: 1.500.000 + 2 × 594.000 = 2.688.000 → chuyển gói hợp lý |

Phép tính kinh tế phải trừ: giờ công vận hành (`08` mục 7, `gio_cong`), chi phí đối tác ngân hàng, SMS/OTP, tổng đài, kiểm định trợ giá, chi phí tìm khách. Không dùng GMV làm thước đo thành công.

## 5. Giả thuyết cần kiểm định

| Mã | Giả thuyết | Chỉ số chính | Ngưỡng "tiếp tục" (đề xuất, chỉnh theo nguồn lực) | Cách đo |
|---|---|---|---|---|
| G1 | Bên mua **chịu trả phí giới thiệu** để được cọc qua ngân hàng, hợp đồng, nghiệm thu có chứng cứ | Tỷ lệ đơn đã đồng ý giá → cọc thành công; lý do bỏ ở màn phí | ≥ 60% đơn đồng ý giá đi tới cọc; < 20% lý do bỏ là "phí" | Sự kiện `don.tao` → `don.hieu_luc`; câu hỏi 1 chạm khi rút đơn |
| G2 | Nhà máy chế biến **chuyển sang Thu mua** khi có đơn lặp | Tỷ lệ tổ chức chế biến có ≥ 3 đơn/tháng chuyển gói trong 60 ngày; gia hạn tháng 2, 3 | ≥ 30% chuyển; ≥ 70% gia hạn | `goi.nang`, `goi.gia_han`; phân biệt **mua vì công cụ hay vì giảm phí**: so "mức tiết kiệm tối đa" với giá gói (vận hành v3 mục 31.1) |
| G3 | Doanh nghiệp xuất khẩu trả gói năm vì **giấy tờ, kiểm định, gom** | Số DN ký năm / số DN dùng thử 30 ngày; số container gom qua app | ≥ 2/5 DN ký | Hợp đồng gói; phỏng vấn sau dùng thử |
| G4 | Nhà hàng có tổ chức trả 490.000/tháng cho **lịch tuần + đầu mối tin được** | Tỷ lệ nhà hàng dùng thử chuyển trả; số tuần giữ lịch liên tục | ≥ 40% chuyển; ≥ 8 tuần liên tục | `goi.nang`; số lần gọi hàng/tuần |
| G5 | Vựa, quán nhỏ dùng Miễn phí đều đặn; một phần vựa lớn chuyển Thu mua | Số đơn/tháng của vựa; tỷ lệ vựa ≥ 4 đơn/tháng chuyển gói | ≥ 20% chuyển | Như G2 |
| G6 | Người bán **có lợi thật** và quay lại ở vụ sau | Tiền ròng/kg so với đề nghị thay thế tốt nhất (người bán ghi lúc nhận lời chào); tỷ lệ lô có ≥ 2 lời chào độc lập; người bán quay lại đăng ở lần thu hoạch tiếp | ≥ 50% lô có ≥ 2 lời chào; ≥ 60% quay lại | Trường "giá thương lái trả" tùy chọn ở màn nhận lời chào; `lo.da_dang` theo vụ |
| G7 | **Che liên lạc tới khi cọc** không làm bên mua bỏ đi | Tỷ lệ bỏ giữa "đồng ý giá" và "cọc"; số phàn nàn về che liên lạc; tỷ lệ dùng "Gọi qua app" | Tỷ lệ bỏ không cao hơn nhóm đơn có liên lạc mở sớm quá 10 điểm (nếu thử A/B được trên đơn nhỏ) | Thử có kiểm soát: không tước bảo vệ của nhóm nào |
| G8 | Rò rỉ sau đơn đầu ở mức chấp nhận được | Tỷ lệ cặp có đơn đầu hoàn tất và có đơn thứ hai trên app trong 90 ngày | ≥ 40% với gói Thu mua (mối quen 0%) | Chỉ số LA-09 theo vùng, mặt hàng |
| G9 | Chi phí phục vụ thủ công **giảm theo thời gian** | Phút vận hành / đơn (8 nhóm việc); tỷ lệ làm thay | Giảm ≥ 30% sau 3 tháng; tỷ lệ làm thay < 50% | `gio_cong` |
| G10 | Hai bên chọn dịch vụ đối tác (xe, kho, kiểm định) qua app | Tỷ lệ đơn có đặt dịch vụ; doanh thu hoa hồng thực | ≥ 15% đơn giao xa đặt xe qua app | `dich_vu.dat` |

**Quyết định theo kết quả** (kế thừa vận hành v3 mục 31.3): tạm dừng luồng nếu có sự cố nghiêm trọng về người nhận tiền, quyền ký, dữ liệu, khoản trừ trái quy trình; điều chỉnh nếu khách chỉ dùng khi được trợ giá hoặc tỷ lệ làm thay > 50%; chưa mở rộng nếu chưa chứng minh được lợi ích cho người bán (G6).

## 6. Phễu và sự kiện đo (backend phải ghi)

| Phễu | Bước (sự kiện) |
|---|---|
| Kết nối | `nhu_cau.da_dang` → có kết quả khớp → `loi_chao.gui` → `loi_chao.dong_y` |
| Giao dịch | `don.tao` → `don.nguoi_ban_ky` → `don.hieu_luc` → `dot.nghiem_thu_chot` → `don.hoan_tat` |
| Chuyển đổi gói | `goi.xem_so_sanh` (màn so phí) → `goi.dung_thu` → `goi.nang` → `goi.gia_han` / `goi.ha` |
| Lặp | Đơn thứ 2, 3 của cùng cặp trong 90 ngày |
| Người bán | Số lời chào độc lập mỗi lô; thời gian tới lời chào đầu; tiền ròng/kg; số ngày từ giao tới nhận đủ tiền; khoản bị trừ có phản đối và kết quả |

Báo cáo dạng **số đếm kèm cỡ mẫu** ("2/3 đơn"), không suy thành tỷ lệ thị trường khi mẫu nhỏ. Ghi cả nhu cầu không tìm được hàng, đơn bị hủy, khách từ chối.

## 7. Kịch bản phỏng vấn và khảo sát ngắn

Nguyên tắc: hỏi về **lần giao dịch gần nhất có thật**, không hỏi "anh có thích không". Mỗi buổi 25–30 phút. Không hứa giá, không thu dữ liệu ngân hàng.

### 7.1 Bên mua (dùng chung, thêm câu theo phân khúc)

1. Lần gần nhất anh chị mua [mặt hàng] từ một nguồn **mới** là khi nào? Tìm bằng cách nào, mất mấy ngày, mấy cuộc gọi, ai đi xem vườn?
2. Lần đó có gì sai lệch (thiếu lượng, sai loại, trễ, ép loại, mất cọc)? Thiệt bao nhiêu tiền hoặc bao nhiêu giờ máy dừng?
3. Hiện anh chị đặt cọc cho người lạ thế nào? Có bao giờ không dám mua vì sợ mất cọc?
4. Anh chị cần những giấy tờ gì sau khi mua (bảng kê 01/TNDN, biên bản, truy xuất, mã vùng)? Ai làm, mất bao lâu?
5. Ai trong tổ chức quyết định chi tiền cho một công cụ như thế này? Ngân sách năm ngoái cho phần mềm/dịch vụ mua hàng là bao nhiêu?
6. (Cho xem màn so phí) Với [số đơn] mỗi tháng, gói Thu mua 1.500.000 đ/tháng thì anh chị thấy: rẻ đến mức nghi ngờ / hợp lý / đắt nhưng vẫn cân nhắc / quá đắt — ở mức giá nào cho từng ý?
7. Nếu chỉ được giữ **một** thứ trên app: cọc qua ngân hàng, hợp đồng và biên bản, bảng kê, nguồn hàng mới, kiểm định — anh chị giữ gì? Vì sao?
8. Sau khi đã quen một nhà vườn, anh chị có còn mua qua app không? Điều gì làm anh chị ở lại?
9. (Cam kết thật) Anh chị có đồng ý chạy thử 30 ngày với 2 đơn thật và ký thư ý định nếu đạt [tiêu chí] không?

Câu thêm theo phân khúc:
- Xuất khẩu: lần gần nhất một lô bị trả về hoặc trễ tàu vì giấy tờ, kiểm định; chi phí kiểm định mỗi container; số nguồn mỗi container.
- Chế biến: tháng nào thiếu nguyên liệu; tỷ lệ hàng loại 2, 3 cần; nhà vườn bỏ hợp đồng khi giá lên bao nhiêu lần.
- Nhà hàng, quán: món nào hay thiếu; ai đi chợ; trả tiền nhà cung cấp theo ngày hay tuần; có cần hóa đơn không.
- Vựa: vốn quay vòng mấy ngày; có sẵn lòng để người bán thấy uy tín trả tiền của mình không.

### 7.2 Người bán (hộ, HTX)

1. Lần bán gần nhất: bán cho ai, giá bao nhiêu, ai cân, ai chia loại, trừ bao nhiêu, bao lâu mới nhận đủ tiền?
2. Có lần nào bị ép loại, ép cân, hoặc thương lái bỏ cọc? Lần đó làm gì?
3. Hàng loại 2, hàng dạt anh chị bán cho ai? Giá so với loại 1?
4. Nếu có một bên mua mới trả cao hơn [x] đồng nhưng phải ký trên điện thoại và nhận cọc qua ngân hàng, anh chị có bán không? Cần ai giúp bấm?
5. Ai trong nhà dùng điện thoại giỏi nhất? Anh chị có cho người đó bấm thay không, trừ việc ký và xác nhận tiền?
6. (HTX) Chia tiền cho xã viên hiện làm thế nào? Có cần bảng phân bổ không?

### 7.3 Khảo sát ngắn trong app (sau sự kiện)

| Thời điểm | Câu (1 chạm) |
|---|---|
| Bên mua rút đơn trước cọc | "Vì sao anh chị chưa cọc?" Phí cao / Chưa tin người bán / Tìm được chỗ khác / Liên lạc bị che / Khác |
| Sau đơn hoàn tất (bên mua) | "Đơn này giúp anh chị tiết kiệm bao nhiêu thời gian so với cách cũ?" Không / < 1 giờ / 1–4 giờ / > 4 giờ |
| Sau đơn hoàn tất (người bán) | "So với bán cho thương lái, lần này chị nhận được:" Ít hơn / Như nhau / Nhiều hơn [ô nhập số tùy chọn] |
| Màn so phí gói | "Điều gì làm anh chị chưa nâng gói?" Chưa đủ đơn / Giá / Chưa thấy công cụ cần / Cần người duyệt |

### 7.4 Cỡ mẫu và thử

| Giai đoạn | Mẫu | Cửa đi tiếp |
|---|---|---|
| Phỏng vấn | 12 người bán (gồm 2 HTX) và 8 bên mua (2 mỗi phân khúc) | ≥ 5 người bán và ≥ 3 bên mua đồng ý chạy thử với đơn thật |
| Thử có hỗ trợ | 10 lô thật, ≥ 5 người bán, 3–5 bên mua; vận hành làm thủ công công khai | ≥ 5 lô có lời chào đủ điều kiện, ≥ 3 lô có 2 lời chào độc lập; ≥ 1 bên mua trả phí thật |
| Pilot giới hạn | 20–30 lô, 4–6 tuần, 1 vùng (Đồng Tháp), 3 mặt hàng cấp 1 | G1, G6 đạt; G2 hoặc G4 có tín hiệu; chi phí phục vụ có đường giảm |

Số mẫu là đề xuất để phát hiện sai giả thuyết, không phải chuẩn thống kê.
