# 02 · Phân khúc bên mua, người bán và mặc định khác nhau

## 1. Nguyên tắc

1. **Một app mua, bốn phân khúc.** Phân khúc chỉ đổi **mặc định**: mẫu phiếu nhu cầu, loại hợp đồng gợi ý, cách trả tiền gợi ý, giấy tờ bắt buộc, công cụ hiện trên màn Tổng quan, gói gợi ý. Mọi luật bảo vệ (giá kín, cọc, nghiệm thu, phản đối, kiểm định) **giống nhau** cho mọi phân khúc và mọi gói.
2. **Phân khúc suy ra dần** (K24). Lúc đăng ký chỉ hỏi "Tổ chức của anh chị chủ yếu mua để làm gì?" với 4 lựa chọn và "Để sau". Sau 2 phiếu nhu cầu, app gợi ý xác nhận ("Có vẻ anh chị là nhà máy chế biến. Đúng không?"). Một tổ chức có thể có nhiều phân khúc; **mỗi phiếu và mỗi đơn mang phân khúc riêng** (trường `phan_khuc` trên phiếu và đơn).
3. **"Mua thử" là trạng thái, không phải phân khúc**: đơn đầu tiên giữa một cặp bên mua – người bán (chưa có đơn hoàn tất) bật gợi ý đơn thử nhỏ và cách "kiểm rồi mới trả".
4. Bán lẻ, chuỗi siêu thị (có trong tài liệu cũ) không là phân khúc riêng ở v2: nếu mua để bán lại thì dùng mặc định **đầu mối**; nếu cần khung định kỳ thì dùng mẫu khung như nhà hàng.

## 2. Bốn phân khúc bên mua

### 2.1 Bảng so sánh

| | **Xuất khẩu** (`xuat_khau`) | **Chế biến** (`che_bien`) | **Nhà hàng, quán ăn** (`nha_hang`) | **Vựa, đầu mối** (`dau_moi`) |
|---|---|---|---|---|
| Ví dụ trong dữ liệu ảo | Công ty XNK Sông Tiền; Công ty Thủy sản Cửu Long Xanh | Nhà máy sấy Đồng Xanh; Nhà máy chế biến Mekong (đối tác bao tiêu) | Nhà hàng Bếp Sen; Quán Cơm Nhà Mười | Vựa trái cây Tư Hùng; Vựa lúa Ba Thành |
| Nhu cầu chính | Lượng lớn, đúng chuẩn thị trường đích, đủ giấy tờ, kịp lịch tàu | Nguyên liệu đều theo kế hoạch tháng, nhận cả loại 2, 3 | Ít mỗi lần (5–50 kg), nhiều món, đều đặn, đúng giờ | Nhanh, giao ngay, theo giá ngày, bán lại |
| Quy mô lô điển hình | 3–20 tấn/đơn, gom nhiều nguồn cho một container | 1–10 tấn/đơn | 10–60 kg/lần giao; 0,5–3 triệu đ/lần | 0,5–30 tấn/đơn |
| Loại hợp đồng mặc định | Đặt trước khi hái; đơn nhóm nhiều nguồn | Bao tiêu theo vụ; giao ngay; khung theo tháng | **Hợp đồng khung với đầu mối** (HTX, vựa) | Giao ngay |
| Loại hàng mặc định trên phiếu | L1 / A, cỡ chuẩn xuất khẩu | L1 + L2 + L3/dạt (phiếu nhiều loại, giá theo loại) | L1 hoặc L2 tùy món | Theo phiếu |
| Nơi giao mặc định | Tại vườn hoặc điểm gom, bên mua lo xe lạnh | Tại kho nhà máy, người bán hoặc xe đối tác chở | Tại cửa nhà hàng, đầu mối giao | Tại vườn, vựa lo xe |
| Nghiệm thu mặc định | **Kiểm định trước khi bốc bắt buộc** (dư lượng, mã vùng); mẫu lưu | Theo bảng loại có giá hạ cấp; tại kho | Kiểm nhanh từng lần, tại cửa | Tự kiểm tại vườn |
| Cách trả phần còn lại mặc định | Trả theo đợt, sau khi kiểm định đạt và trước khi bốc | Trả khi nhận hoặc sau 7 ngày | Trả theo kỳ (tuần) cho đầu mối, gộp chứng từ | Trước khi bốc hoặc tiền mặt tại vườn |
| Cọc | 30% từng phần đơn nhóm | 30% từng đơn; cọc vụ khi bao tiêu | **Cọc khung** ≥ một kỳ thanh toán | 30% từng đơn |
| Giấy tờ bắt buộc (bộ lọc cứng) | Mã số vùng trồng còn hiệu lực cho thị trường; nhật ký cách ly; kết quả kiểm định | Không bắt buộc; bảng kê 01/TNDN sinh tự động | Không; hóa đơn hoặc chứng từ gộp kỳ do đầu mối lập | Không |
| Nỗi lo lớn nhất | Bị trả hàng ở nước nhập; trễ tàu | Thiếu nguyên liệu dừng máy; người bán bỏ hợp đồng khi giá lên | Thiếu món giữa chừng | Mua hớ, vốn quay chậm |
| Công cụ nổi trên Tổng quan | Tiến độ gom container, lô chờ kiểm định, hồ sơ giấy tờ theo lô, truy xuất | Kế hoạch nguyên liệu tháng (đã có nguồn / còn thiếu), hàng kém loại khớp, lịch nhận kho | Lịch giao tuần, bốn số hợp đồng khung, gọi thêm / bớt | Lô mới trong vùng, lời chào đang chờ, công nợ |
| Gói gợi ý (`11`) | Doanh nghiệp | Thu mua | Bếp (nhà hàng) / Miễn phí (quán nhỏ) | Miễn phí → Thu mua |

### 2.2 Ghi chú riêng từng phân khúc

**Xuất khẩu**
- Kế hoạch ngược từ ngày tàu: app tính ngày bốc cuối cùng = ngày đóng container − thời gian kiểm định − thời gian xe.
- Một nhu cầu container (ví dụ 18 tấn) tạo **đơn nhóm**: mỗi người bán một phần hợp đồng độc lập; nguồn rớt kiểm định không làm hỏng nguồn khác; nguồn bù phải qua kiểm định mới tính đủ lượng.
- Rủi ro sau nghiệm thu (bị trả ở nước nhập) thuộc bên mua; app cung cấp hồ sơ truy xuất tới vườn để làm việc ngoài app.
- Tôm cho nhà máy xuất khẩu dùng mặc định của xuất khẩu (test kháng sinh bắt buộc trước thu).

**Chế biến**
- Phiếu nhu cầu **nhiều dòng loại** (L1 giá X, L2 giá Y, dạt giá Z) trong cùng phiếu.
- Hồ sơ "Nhận hàng kém loại" (mặt hàng, lượng tối thiểu, bán kính, giá chào sẵn) để được báo khi có lô kém loại hoặc lô bán gấp khớp.
- Có thể là **đối tác bao tiêu**: ký thỏa thuận khung với AgiViet, cam kết giá sàn theo mùa cho hàng L2/L3/dạt; app đưa lời chào của đối tác khi lô kém loại không ai hỏi.

**Nhà hàng, quán ăn**
- Không mua trực tiếp từ hộ nhỏ (hộ không giao lẻ 15 kg mỗi ngày được). App nối với **người bán dạng đầu mối** (HTX, vựa đã xác minh) qua **hợp đồng khung**.
- Hai mức: nhà hàng có tổ chức (Bếp Sen: nhiều món, gói Bếp) và **quán nhỏ** (Quán Cơm Nhà Mười: 2 món, gói Miễn phí, trả tiền mặt cuối tuần).
- Thiếu một món: đầu mối đề nghị món thay hoặc bỏ món; nhà hàng đồng ý **từng dòng**; phần còn lại vẫn giao.
- Đơn của đầu mối không lộ danh tính hộ gốc với nhà hàng, chỉ hiện vùng nguồn gốc và mã lô (QR truy xuất).

**Vựa, đầu mối**
- **Hai vai trên một tổ chức**: bật vai bán để bán cho nhà hàng, nhà máy; vai mua để mua của hộ. Đơn mua và đơn bán tách hoàn toàn; không dùng giá thấp nhất kín của người bán gốc để bán lại.
- Lời chào có hạn ngắn hơn (người bán chọn 6 hoặc 12 giờ) cho hàng giá biến động trong ngày.
- Lúa: vựa lúa và nhà máy xay xát là bên mua chính; hợp đồng "cọc lúa" (đặt trước khi gặt) là loại đặt trước khi hái.

## 3. Người bán

### 3.1 Bốn dạng người bán

| Dạng | Ví dụ ảo | Đặc điểm | Mặc định trên app |
|---|---|---|---|
| **Hộ** (`ho`) | Chị Năm (xoài), anh Lực (tôm), anh Chín (lúa) | 35–60 tuổi, đọc chậm, dùng Zalo, quen thương lái; 1–3 mặt hàng | Đăng bằng giọng nói, một việc mỗi màn, chữ ≥ 17 px; có **người giúp** |
| **Trang trại, hộ lớn** | Anh Tư (sầu riêng 6 ha) | Nhiều lô, sổ sách | Nhiều lô, lịch giao, đặt trước, bao tiêu |
| **HTX** (`htx`) | HTX Mỹ Xương | Pháp nhân; gom hàng xã viên; có điểm gom; xuất được hóa đơn | **Lô gộp** nhiều hộ, phân bổ phần từng hộ, điểm gom, đầu mối cho nhà hàng (hợp đồng khung), đăng ký giúp hộ |
| **Tổ hợp tác** (`to_hop_tac`) | Tổ hợp tác Tôm sạch Hòa Tú | Không pháp nhân đầy đủ; tổ trưởng đại diện theo **giấy ủy quyền từng hộ, từng lô** | Gom lô, cân và giao chung như HTX, nhưng **tiền không về tài khoản tổ trưởng**: v2 tạm dùng **đơn con từng hộ** (mỗi hộ một hợp đồng phần, cọc và trả thẳng về tài khoản của chính hộ) cho tới khi luật sư xác nhận việc nhận tiền thay hộ không vướng Luật TMĐT 122/2025 Điều 21 (N-15). Tổ trưởng được thao tác điều phối theo giấy ủy quyền từng hộ |

### 3.2 Vai trong tài khoản người bán

| Vai | Được làm | Không được |
|---|---|---|
| Chủ tài khoản (hộ) | Mọi việc | — |
| Người giúp (con cháu) | Xem; "bấm thay" các việc không phải tiền và ký: đăng lô, trả lời tin nhắn, chụp biên bản, nhập số cân nháp | **Ký, xác nhận đã nhận tiền, xác nhận hoàn, yêu cầu/kích hoạt/hủy đổi tài khoản nhận tiền, đồng ý hủy đơn** |
| HTX: chủ nhiệm, ban điều hành | Ký đơn của HTX, cấp "cho nợ thêm" trong hợp đồng khung, duyệt phân bổ | — |
| HTX: kế toán | Xác nhận tiền, lập phân bổ phần hộ | Ký đơn |
| HTX: nhân viên điểm gom | Cân, chia loại, gắn tem hộ, lập biên bản tại điểm gom | Tiền, ký |
| Hộ thành viên HTX | Chỉ xem phần hàng và tiền của mình; báo sai; xác nhận "HTX đã chi cho tôi [số]" | Xem hộ khác |

## 4. Tổ chức bên mua: vai và quyền (Q13)

| Vai | Được làm | Không được |
|---|---|---|
| Chủ, quản lý (`quan_ly`) | Mọi việc; đặt hạn mức; duyệt đơn vượt hạn mức; thêm bớt thành viên; ký | — |
| Mua hàng (`mua_hang`) | Phiếu nhu cầu, chào giá, trả giá, soạn hợp đồng, gửi duyệt, ký trong hạn mức | Chuyển tiền, đổi tài khoản thanh toán |
| Kế toán (`ke_toan`) | Chuyển cọc (tạo VietQR), ghi đã trả kèm chứng từ, xác nhận đã nhận lại tiền hoàn, xuất bảng kê | Chào giá, sửa điều khoản |
| Kho, kiểm hàng (`kho`) | Ký nhận, nhập kết quả nghiệm thu 3 phần kèm ảnh, nhập kho | Sửa giá, tiền |
| Người nhận tại điểm (`nguoi_nhan`) | Mang QR nhận hàng, ký nhận tại điểm được chỉ định, chụp ảnh | Mọi việc khác |

Luật nội bộ:
1. Đơn vượt hạn mức của người lập thì chờ quản lý duyệt; **người lập khác người duyệt**; đơn chờ duyệt chưa gửi người bán.
2. Hạn của người bán không chờ việc duyệt nội bộ (hạn cọc vẫn chạy).
3. Quan hệ với người bán thuộc về tổ chức, không thuộc nhân viên.
4. Gói Miễn phí: 1 thành viên (một người làm hết mọi vai); Thu mua: 5; Doanh nghiệp: 10; Bếp: 2 (tính cả quản lý).

## 5. Mặc định theo phân khúc: bảng cấu hình cho backend

Backend lưu bảng `mac_dinh_phan_khuc` (vận hành chỉnh được). Giá trị v2:

| Khóa | xuat_khau | che_bien | nha_hang | dau_moi |
|---|---|---|---|---|
| `loai_hop_dong_goi_y` | dat_truoc, don_nhom | bao_tieu, giao_ngay, khung | khung | giao_ngay |
| `ty_le_coc` | 0,30 | 0,30 | cọc khung = 1 kỳ thanh toán | 0,30 |
| `cach_tra_goi_y` | truoc_boc_sau_kiem_dinh | khi_nhan | theo_ky_tuan | truoc_boc |
| `noi_giao_goi_y` | tai_vuon | tai_kho_ben_mua | tai_cua_nha_hang | tai_vuon |
| `kiem_dinh_bat_buoc` | true (cấp 3 trước bốc) | false | false | false |
| `giay_to_loc_cung` | ma_vung_trong, nhat_ky_cach_ly, ket_qua_kiem_dinh | — | — | — |
| `nhan_hang_kem_loai` | false | true | false | tùy chọn |
| `han_loi_chao_gio` | 24 | 24 | 24 | 6 hoặc 12 (người bán chọn) |
| `goi_goi_y` | doanh_nghiep | thu_mua | bep (tổ chức) / mien_phi (quán) | mien_phi |
| `cong_cu_tong_quan` | tien_do_gom, cho_kiem_dinh, giay_to | ke_hoach_nguyen_lieu, kem_loai, lich_nhan | lich_tuan, bon_so_khung | lo_moi, loi_chao, cong_no |

## 6. Gói giá theo phân khúc (tóm tắt, chi tiết ở `11`)

| Gói | Dành cho | Giá tháng (thử) | Phí giới thiệu mỗi đơn (bên mua trả) | Sàn / trần mỗi đơn |
|---|---|---|---|---|
| Miễn phí | Vựa nhỏ, quán ăn, mua thử | 0 đ | 1,0% đơn đầu với người bán đó; 0,5% các đơn sau | 20.000 / 2.000.000 đ |
| Thu mua | Nhà máy chế biến, vựa lớn | 1.500.000 đ | 0,3% đơn đầu; **0% từ đơn thứ hai với cùng người bán (mối quen)** | 20.000 / 1.500.000 đ |
| Doanh nghiệp | Xuất khẩu | 4.000.000 đ (ký năm) | 0,2% | 20.000 / 3.000.000 đ |
| Bếp | Nhà hàng có tổ chức | 490.000 đ | 0% (đơn qua đầu mối) | — |

Người bán: 0 đ mọi lúc. Hợp đồng khung tính phí theo kỳ, không sàn (Q10). Đơn nhóm tính phí một lần trên tổng (Q09).
