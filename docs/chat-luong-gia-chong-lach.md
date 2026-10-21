# Chất lượng, giá và chống lách

Tài liệu cơ chế của AgiViet (bản HTML, nhánh `lam-lai-html`). Phần đầu trả lời câu hỏi nền tảng: ai dùng, ai trả tiền, giải quyết gì. Phần sau là các cơ chế cho bốn rủi ro vận hành: hàng xấu không ai mua, thị trường ép giá, khai giá thấp để né cọc, và tranh chấp lúc giao nhận.

## 1. Ai dùng, ai trả tiền, giải quyết gì

**Người dùng hằng ngày**
- Phía bán: hộ nhà vườn, chủ ao nuôi, hợp tác xã, tổ hợp tác ở Đồng bằng sông Cửu Long. Phần lớn 35–60 tuổi, đọc chữ chậm, quen bán qua thương lái và dùng Zalo. Con cháu thường thao tác thay (vai "người giúp").
- Phía mua: nhân viên mua hàng, kế toán, quản lý kho của nhà máy chế biến, doanh nghiệp xuất khẩu, vựa đầu mối.

**Người trả tiền (customer)**
- Bên mua là tổ chức. Họ trả phí giới thiệu (đơn đầu với một người bán) hoặc phí mối quen (các đơn sau) khi đặt cọc, và trả gói Business.
- Người bán dùng miễn phí. App giữ chân họ bằng giá trị: bán được giá, tiền về chắc.
- Về sau có thêm nguồn thu phụ: phí dịch vụ đối tác (kiểm định, xe, kho lạnh, sơ chế) và ứng tiền trước.

**Insight**
- Người bán sợ bán xong không được trả tiền, sợ bị ép cân, ép loại lúc giao, không biết giá thật, và cần tiền sớm.
- Bên mua khó tìm nguồn đủ lượng, đúng loại, đều đặn; sợ mất cọc khi trả cho người lạ; thiếu chứng từ cho thuế khi mua không hóa đơn.
- Lần đầu, hai bên không tin nhau. Niềm tin hiện nằm ở thương lái, và thương lái ăn chênh lệch.

**Giải pháp: "sổ làm ăn có chợ ở giữa"**
- AgiViet là bên trung gian trung lập:
  - ẩn liên lạc tới khi cọc;
  - tiền đi qua tài khoản đảm bảo của ngân hàng;
  - mọi bước (cân, đổi điều kiện, hủy) có luật và lịch sử.
- Sổ vườn và sổ kho làm dữ liệu niềm tin: nhật ký, cách ly thuốc, truy xuất, uy tín hai chiều.
- App không định giá, không mua bán thay và không phân xử thay tòa. App chỉ ghi nhận, đối chiếu và giữ tiền qua ngân hàng.

## 2. Hàng xấu không ai mua: ai nhận, ai cứu

Hàng loại 2, loại 3 và hàng dạt vẫn có giá trị, chỉ là người mua khác: nhà máy sấy, nước ép, đông lạnh, chợ đầu mối, thức ăn chăn nuôi. App không tự mua hàng, nhưng bảo đảm hàng xấu luôn có đường đi:

| Cơ chế | Nghiệp vụ | Thử ở đâu |
|---|---|---|
| Lô có loại (loại 1, 2, 3, hàng dạt). Từ loại 2 trở xuống tự là hàng cho chế biến | `Lo.loai`, `loaiHang` khi `dang_lo` / `sua_lo` | App bán: Đăng hàng, bước Kiểm tra |
| Tách một lần hái thành lô theo loại, để hàng xấu không kéo giá hàng đẹp | lệnh `tach_lo` | App bán: Chi tiết lô → Tách theo loại |
| Bán gấp 3 ngày: lô lên đầu danh sách, báo bên mua nhận hàng kém loại | `bat_ban_gap`, `tat_ban_gap`, `chinhSach.hanBanGap` | App bán: màn Bán gấp, ai nhận |
| Gợi ý bán gấp khi lô kém loại sau 24 giờ chưa ai hỏi | `loNenBanGap` | App bán: Hôm nay |
| Bên mua đăng ký nhận hàng kém loại (mặt hàng, lượng tối thiểu, tỉnh) và được báo khi có lô khớp | `cap_nhat_nhan_hang_kem_loai`, `loKemLoaiKhop` | App mua: Hàng kém loại; Nguồn hàng (lọc) |
| Đối tác bao tiêu: nhà máy ký thỏa thuận khung với AgiViet, cam kết giá sàn hàng dạt. Đây là người nhận cuối cùng | `dat_bao_tieu` (vận hành), `nguoiNhanHangKemLoai` | App bán: màn Bán gấp (lời chào giá sàn); mẫu: Nhà máy chế biến Mekong |
| Giữ hàng chờ giá, hoặc sơ chế thay vì bán đổ | dịch vụ `kho_lanh`, `so_che` | App bán: màn Bán gấp → Thuê kho lạnh / sấy, cấp đông |
| Hàng bên mua trả lại lúc giao thành lô loại dưới, bán gấp | `tra_hang_ve_lo` | App bán: Chi tiết đơn → Bán gấp phần bị trả lại |

Lô gốc giữ nguyên lượng đã hứa. Phần bị trả lại tách thành lô mới, đúng như hàng thật quay về tay người bán.

## 3. Hợp đồng cọc: giao nhận và chất lượng

Mỗi đơn là một hợp đồng cọc (`Don.hopDong`). Toàn văn hợp đồng do `banHopDong` sinh và dùng chung cho hai app.

**Hiệu lực**
- Hợp đồng chỉ có hiệu lực và được app bảo vệ khi cọc đi qua tài khoản đảm bảo (`hieuLucHopDong`).
- Chưa cọc thì chưa ràng buộc. Giao dịch ngoài app thì hai bên tự chịu.
- App nhắc điều này ở màn ký, màn lập đơn và màn liên lạc.

**Điều khoản bên mua chọn khi lập đơn, người bán ký khi xác nhận**
- **Tiêu chuẩn nghiệm thu:** loại hàng của lô và tỷ lệ trả lại không cần ảnh (mặc định 5%, `loiChoPhepMacDinh`).
- **Giá hạ cấp:** phần đạt loại dưới thì bên mua nhận với giá này thay vì trả lại.
- **Nơi giao và chuyển rủi ro:**
  - giao tại vườn: bên mua kiểm trước khi bốc, bốc lên xe rồi thì bên mua chịu;
  - giao tại kho bên mua: người bán chịu rủi ro tới lúc cân.
- **Giá tính cọc:** xem mục 5.

**Nghiệm thu 3 phần** (`nhapKetQua(nhan, tuChoi, haCap, anh)`)
- Bên mua nhập ba phần: đạt (tính theo giá đơn), hạ cấp (tính theo giá hạ cấp), trả lại (không tính tiền).
- Trả lại vượt tỷ lệ cho phép thì bắt buộc kèm ảnh.
- Người bán vẫn có quyền bấm "Không đúng". Khi tranh chấp, kiểm định bên thứ ba là căn cứ và bên sai chịu phí.

**Giao trễ**
- Quá ngày giao mà chưa cân, không có đề nghị đổi lịch hay giảm lượng, thì hệ thống ghi giao trễ (`Don.giaoTre`).
- Giao trễ được tính vào uy tín người bán.

**Uy tín**
- `uyTin` có thêm tỷ lệ bị trả lại (`tyLeTraLai`) và số lần giao trễ (`soGiaoTre`).
- Bậc "Tốt" đòi hỏi tỷ lệ trả lại không quá 10% và không có lần giao trễ nào.

## 4. Thị trường ép giá

App không ấn định giá (rủi ro pháp lý về cạnh tranh), nhưng làm thị trường minh bạch hơn cho nông dân:

**Giá tham khảo** (`giaThamKhao`)
- Là trung vị giá các đơn đã chốt cân trong 30 ngày, theo mặt hàng và theo loại.
- Bỏ qua đơn giá bất thường, để giá thấp không kéo mặt bằng xuống.
- Cần ít nhất 3 đơn; chưa đủ thì app ghi "chưa đủ dữ liệu".

**Cảnh báo, không chặn** (`danhGiaGia`)
- Giá dưới 80% giá tham khảo thì báo "thấp hơn mặt bằng X%".
- Giá dưới giá vốn ước tính thì báo riêng. Giá vốn = chi của vụ / sản lượng ước (`giaVonUoc`, `giaVonCuaVuon`).
- Cảnh báo hiện ở màn đăng lô, xác nhận đơn, lập đơn và cột "So giá tham khảo" khi so báo giá.

**Tăng sức mặc cả cho người bán**
- Nhiều bên mua cùng thấy một lô.
- Bán trước mùa, lô gộp hợp tác xã.
- Kênh hàng kém loại riêng.
- Số tin cần mua đang mở cùng mặt hàng.

## 5. Khai giá cực thấp để giảm cọc

Cọc và phí do bên mua trả, nên khai giá thấp có lợi cho bên mua và thiệt cho nông dân: tài khoản đảm bảo chỉ bảo vệ đúng số đã khai. Rủi ro thật là hai bên thông đồng khai giá thấp, rồi trả phần chênh bằng tay ngoài app để né phí và cọc.

**Giá tính cọc, tính phí**
- Bằng max(giá đơn, 70% giá tham khảo) (`tyLeGiaTinhCoc`), ghi vào hợp đồng.
- Khai giá thấp không làm giảm cọc và phí đáng kể. Phí sàn 50.000 đ vẫn áp dụng.

**Giá bất thường** (dưới 60% giá tham khảo, `nguongGiaBatThuong`)
- Người bán phải bật xác nhận "Tôi hiểu, vẫn bán đúng giá ghi trên đơn": tiền trả ngoài app không được bảo vệ, không vào bảng kê, không tính uy tín.
- Bước xác nhận đơn chặn nếu thiếu tham số này.
- Đơn được đánh dấu cho vận hành xem.

**Còn chờ làm:** theo dõi theo cặp mua–bán lặp lại đơn giá bất thường, rồi cảnh báo vận hành, hạ uy tín hoặc khóa.

## 6. Thử trên bản mô phỏng

Dữ liệu mẫu đã có sẵn các tình huống sau:
- một đơn giá bất thường chờ chị Năm ký;
- một đơn có giá hạ cấp, đang chờ xác nhận kết quả cân 3 phần;
- một đơn đã chốt có hàng bị trả lại;
- lô xoài loại 2 của chị Năm đang bán gấp;
- một lô thanh long dạt 2 ngày chưa ai hỏi;
- Nhà máy chế biến Mekong là đối tác bao tiêu;
- Đồng Xanh đã đăng ký nhận xoài và thanh long kém loại.

Phòng thử có các ca:
- B39–B44 (app bán): tách lô, bán gấp và người nhận, hàng trả lại, cọc theo giá sàn, giá bất thường, nghiệm thu 3 phần;
- M28–M32 (app mua): hợp đồng cọc, giá tham khảo, nghiệm thu kèm ảnh, nhận hàng kém loại, bao tiêu.
