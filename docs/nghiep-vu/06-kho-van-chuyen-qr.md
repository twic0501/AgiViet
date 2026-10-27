# 06 · Kho, vận chuyển, giao nhận, chuyển rủi ro và QR

## 1. Nguyên tắc

1. AgiViet **không sở hữu kho, xe**. Kho lạnh, điểm gom, xe là **đối tác** hoặc do các bên tự lo. App ghi nhận ai làm gì, ai chịu rủi ro, ai trả tiền.
2. **Điểm nghiệm thu = điểm chuyển rủi ro** (Q02). Hợp đồng phải chọn một trong bốn kiểu giao; không suy rủi ro từ việc quét mã.
3. **Hàng tươi không chở ngược.** Hàng không đạt ở nơi đến xử lý tại chỗ.
4. Hao hụt đường trong mức cho phép của mặt hàng không ai đền.
5. Mọi chuyển giao vật lý có **biên bản điện tử** (PDF) với ảnh, giờ, vị trí, số cân, chữ ký.

## 2. Bốn kiểu giao (trường `kieu_giao` của hợp đồng)

| Kiểu | Ai lo xe | Điểm nghiệm thu = chuyển rủi ro | Rủi ro đường | Hao hụt vượt mức | Nơi đến làm gì | Mặc định cho |
|---|---|---|---|---|---|---|
| `tai_vuon` (vườn, ao, ruộng) | Bên mua (tự lo hoặc thuê xe đối tác) | Tại vườn, trước khi bốc | Bên mua | Bên mua đòi nhà xe / bảo hiểm | Ký nhận, cân đo hao hụt, khiếu nại **khác mẫu** trong 2 giờ | Xuất khẩu, vựa, lúa, tôm |
| `tai_kho_ben_mua` | Người bán (tự lo hoặc thuê xe đối tác) | Tại kho bên mua, khi ký nhận và nghiệm thu | Người bán | Người bán chịu (trừ vào lượng giao); đòi nhà xe | Nghiệm thu 3 phần | Chế biến |
| `tai_diem_gom` | Mỗi người bán tự chở tới điểm gom; bên mua lo xe từ điểm gom | Tại điểm gom | Từ vườn tới điểm gom: người bán; từ điểm gom: bên mua | Theo đoạn | Như `tai_vuon` | Đơn nhóm, lô gộp HTX |
| `tai_cua_ben_mua` (giao lẻ) | Đầu mối | Tại cửa nhà hàng, khi người nhận ký | Đầu mối | Đầu mối | Kiểm nhanh, nghiệm thu từng dòng | Hợp đồng khung nhà hàng |

## 3. Xe

### 3.1 Ba cách lo xe

| Cách | Ghi nhận trên app | Rủi ro |
|---|---|---|
| Bên tự lo (xe nhà, xe quen) | Biển số, tên và số điện thoại tài xế, loại xe (thường/lạnh), tải; app phát **thẻ chuyến QR** | Theo kiểu giao |
| **Xe đối tác thuê theo chuyến** (qua app) | Yêu cầu báo giá → nhà xe báo giá (tuyến, loại xe, giờ, phí chờ, phí bốc) → bên đặt chấp thuận → nhà xe nhận chuyến → tài xế nhận thẻ chuyến → theo dõi trạng thái → giao → nhà xe xác nhận hoàn thành | Bên lo xe chịu với bên kia; nhà xe chịu với bên lo xe theo biên bản và điều khoản vận chuyển (nhiệt độ, giờ) |
| Ghép chuyến | Nhiều đợt giao trên một chuyến (đơn nhóm, nhiều đơn cùng tuyến); cước chia theo kg nếu các bên đồng ý | Mỗi đợt riêng; hư hỏng xác định theo tem kiện |

### 3.2 Chuyến (`chuyen`)

Trường: mã chuyến, nhà xe, biển số, tài xế, loại xe, nhiệt độ cài đặt, giờ dự kiến bốc và tới, danh sách đợt giao, niêm phong xe (số), cước và ai trả, phí chờ.

Trạng thái: `da_dat` → `nha_xe_nhan` → `toi_diem_boc` → `dang_boc` → `dang_chay` → `toi_noi_den` → `da_giao` → `hoan_thanh` / `su_co` / `huy`.

Sự cố trong chuyến (`su_co_van_chuyen`): trễ, hỏng xe, sai nhiệt độ, tai nạn. Tài xế hoặc bên lo xe báo trên app (ảnh, vị trí). Sự cố P1 (hàng tươi đang trên đường) chuyển cho vận hành (`08`).

### 3.3 Nhiệt độ

- v2 mô phỏng **nhật ký nhiệt độ**: nhà xe (cổng đối tác mô phỏng) gửi điểm đo mỗi 30 phút; app vẽ dải và đánh dấu điểm vượt ngưỡng của mặt hàng (ví dụ xoài xe lạnh 10–13°C; tôm ướp đá ≤ 4°C).
- Vượt ngưỡng > 60 phút liên tục: sự kiện `chuyen.sai_nhiet`, gắn vào biên bản giao nhận, làm căn cứ đòi nhà xe. Không tự đổi tiền người bán.

### 3.4 Xe trễ

| Ai trễ | Luật |
|---|---|
| Xe bên mua (giao tại vườn) | Trễ quá 4 giờ (tươi 2 giờ) so với giờ hẹn mà không báo: người bán bấm "Đã sẵn hàng" (ảnh hàng đã hái, có giờ) → hư hỏng do chờ thuộc bên mua. Quá 24 giờ: người bán được hủy, giữ cọc; app gợi ý bán gấp |
| Xe người bán (giao tại kho) | Báo trễ qua app; trễ quá 12 giờ không báo: ghi "giao trễ" vào uy tín; bên mua được chọn chờ hoặc hủy, cọc hoàn bên mua và áp phạt thiếu lượng nếu không giao |

## 4. Kho và điểm gom

### 4.1 Kho lạnh thuê (đối tác)

Dùng khi: giữ hàng chờ giá (bán gấp không muốn bán rẻ), giữ hàng đang tranh chấp chờ kiểm định, giữ hàng trả lại ở nơi đến.

Luồng: **Yêu cầu** (mặt hàng, lượng, nhiệt độ, số ngày, ai trả) → **Báo giá** của kho (đ/kg/ngày, phí nhập, phí xuất) → **Đặt chỗ** → **Nhập kho** (quét QR lô, cân, ảnh, nhiệt độ) → **Lưu** (nhật ký nhiệt độ mô phỏng) → **Xuất kho** (quét QR lô, cân, người nhận) → **Quyết toán phí kho**.

Quy tắc:
- Kho chỉ nhận hàng có **QR lô** (hoặc tem lô con) để truy được chủ hàng.
- Hao hụt trong kho cho phép theo mặt hàng (mặc định 0,5%/ngày cho trái tươi); vượt mức kho chịu theo hợp đồng kho.
- Quyền xuất kho: chủ hàng ghi trên phiếu nhập; chuyển quyền khi hàng được bán (đơn mới) thì chủ mới được xuất, có QR nhận hàng của đơn mới.
- Giữ hàng tranh chấp: phiếu nhập ghi "đang tranh chấp đơn [mã]"; chỉ xuất khi tranh chấp kết luận hoặc hai bên cùng đồng ý; phí kho tính vào bên sai (cộng vào `X_nb` hoặc `X_bm`).

Ví dụ (TH-049): chị Hồng gửi 1.200 kg thanh long L2 vào kho lạnh Tân Phú Lạnh 3 ngày, 300 đ/kg/ngày → phí 1.080.000 đ; nhiệt độ 5–8°C; hao hụt cho phép 1,5% (0,5%/ngày × 3) = 18 kg; xuất 1.190 kg (hao hụt 10 kg, trong mức).

### 4.2 Điểm gom

Điểm gom là HTX hoặc vựa có hợp đồng điểm gom với AgiViet (hoặc với bên mua của đơn nhóm).

| Việc tại điểm gom | Ai | App ghi |
|---|---|---|
| Nhận hàng từng hộ | Nhân viên điểm gom | Quét QR lô / phần đóng góp, cân, gắn **tem kiện QR** mang mã hộ |
| Chia loại, nghiệm thu (nếu kiểu giao `tai_diem_gom`) | Nhân viên điểm gom và người của bên mua (hoặc kiểm định viên) | Kết quả theo tem hộ |
| Đóng gói, xếp xe | Điểm gom | Danh sách kiện theo chuyến |
| Phí gom | Theo thỏa thuận (ví dụ 300 đ/kg nhận) | Dòng phân bổ của lô gộp; đơn nhóm: bên mua trả nếu hợp đồng ghi |

## 5. Hàng trả lại ở nơi đến (khi điểm nghiệm thu là nơi đến)

Áp cho giao tại kho bên mua và giao lẻ. Ngay khi nghiệm thu chốt có dòng trả lại, app tạo **việc xử lý hàng trả lại** cho người bán, hạn chọn: 4 giờ (hàng tươi) / 24 giờ (hàng khác).

| Lựa chọn của người bán | Điều kiện | Hệ quả |
|---|---|---|
| Nhận lại | Người bán (hoặc xe của mình) tới lấy trong hạn | Biên bản trả hàng (QR nhận lại); kg → lô con trả lại của người bán; cước người bán chịu |
| Ủy quyền bán gấp tại chỗ | Hàng còn bán được, không `khoa_an_toan` | App báo người nhận hàng kém loại và đối tác bao tiêu **gần nơi hàng đang đứng**; bên mua đang giữ hàng (kho) chỉ giữ hộ tối đa 24 giờ; tiền bán là của người bán |
| Gửi kho lạnh gần đó | Có kho đối tác trong 30 km | Phí kho người bán trả (hoặc bên sai nếu đang tranh chấp) |
| Tiêu hủy có biên bản | Hàng hư hẳn | Biên bản tiêu hủy (ảnh, cân, người chứng kiến); chi phí tiêu hủy bên có lỗi chịu |
| Không chọn trong hạn | — | Mặc định theo hợp đồng: hàng tươi → "Ủy quyền bán gấp tại chỗ"; nếu sau 24 giờ không bán được → tiêu hủy có biên bản, việc P2 cho vận hành giám sát |

Giao tại vườn: phần trả lại không lên xe nên không có việc này (Q02).

## 6. Hao hụt đường

- `hao_hut = luong_boc − luong_den`; `ty_le = hao_hut / luong_boc`.
- So với `hao_hut_duong` của hồ sơ mặt hàng theo loại xe và thời gian chuyến (`01`).
- Trong mức: ghi nhận, không ai đền; tiền người bán tính theo lượng tại điểm nghiệm thu.
- Vượt mức: tạo `su_co_van_chuyen` loại "hao hụt vượt mức" với phần vượt; bên lo xe đòi nhà xe/bảo hiểm ngoài app (app cung cấp biên bản và nhật ký nhiệt độ). Không đổi tiền người bán khi rủi ro thuộc bên mua.
- Giao tại kho (rủi ro người bán): lượng giao chính là lượng cân tại kho; hao hụt chỉ là thông tin cho người bán đòi nhà xe.

Ví dụ: HĐ-2001 bốc 1.970 kg, tới 1.950 kg → 20 kg = 1,02% ≤ 2% (xoài, xe thường, ≤ 24 giờ).

## 7. Mã QR: chỗ dùng và nội dung

Nguyên tắc chung:
- QR chứa **payload chuẩn tắc** `{v, loai, aud, ma, exp, jti}` (không có dữ liệu nhạy cảm: số điện thoại, giá, số tài khoản) và **chữ ký Ed25519 đầy đủ** của máy chủ AgiViet (N-04; thư viện tham chiếu `security/lib/qr.mjs`). App xác minh offline bằng **khóa công khai** (không phát khóa bí mật xuống máy); quyết định cuối luôn do server (`scan_qr`): đúng loại, đúng `aud` (đơn/đợt/người nhận), chưa hết hạn, `jti` chưa dùng.
- QR nhận hàng (QR-02) và QR biên bản (QR-05) **dùng một lần**: quét thành công thì `jti` bị tiêu thụ. Không còn dạng chuỗi `AGV1:...:<chu_ky_8_ky_tu>` của bản trước.
- Quét bằng camera ngoài app (máy thường) thì mở **trang công khai** tương ứng (chỉ với QR lô và QR tài liệu).

| Mã | Loại (`loai`) | Gắn ở đâu | Ai tạo | Ai quét | Quét để làm gì | Hết hạn | Dự phòng khi không quét được |
|---|---|---|---|---|---|---|---|
| QR-01 | `LO` lô / truy xuất | Tem dán thùng, kiện; thẻ lô trên app; PDF hợp đồng, bảng kê | HT khi đăng lô; tem kiện khi điểm gom nhận | Bên mua, kho, kiểm định, người tiêu dùng cuối (trang công khai) | Xem nguồn gốc: mặt hàng, loại, vùng (xã), ngày thu hoạch, mã vùng trồng, chứng nhận đã xác minh, kết quả kiểm định, chuỗi lô cha–con. **Không** hiện tên hộ trừ khi chủ lô cho phép | Không | Mã lô in chữ |
| QR-02 | `NHAN` nhận hàng (động) | Máy của người nhận được chỉ định (bên mua) | HT khi đợt giao `san_sang`, gắn đơn + đợt + người nhận | Người bán (bằng app của mình) khi giao; hoặc người nhận quét QR của người bán (hai chiều đều được) | Chứng minh **giao đúng người, đúng đợt**; mở bước nghiệm thu tại điểm hoặc ký nhận. Không tự chuyển rủi ro | Cửa sổ giao + 12 giờ; làm mới mỗi 5 phút (mã xoay) | **Mã 6 số** kèm theo (đổi theo QR), nhập tay; quá 3 lần sai khóa 15 phút |
| QR-03 | `CHUYEN` thẻ chuyến (tài xế, xe) | Máy tài xế; in dán kính xe | HT khi chuyến `nha_xe_nhan` hoặc khi bên tự lo xe nhập biển số | Người bán khi bốc; kho khi xe tới; điểm gom | Đối chiếu biển số, tài xế (ảnh, tên), chuyến, các đợt trên xe; ghi giờ tới, giờ đi | Hết chuyến + 24 giờ | Nhập biển số; app so khớp |
| QR-04 | `NIEM_PHONG` mẫu đối chứng | Túi niêm phong mẫu (2 phần: người bán giữ, theo xe); niêm phong xe | Người lập biên bản khi niêm phong | Bên mua ở nơi đến, kiểm định viên | Mở đúng mẫu, đúng đơn; lưu ai mở, lúc nào; kiểm định đối chiếu mã mẫu | Đến khi đơn hoàn tất + 30 ngày | Mã in chữ trên túi |
| QR-05 | `BIEN_BAN` xác nhận tại chỗ | Màn biên bản trên máy bên lập | HT khi biên bản nháp sẵn sàng ký | Bên còn lại bằng app của mình | Bên còn lại xem đúng bản (mã băm) trên **máy của chính mình** rồi ký: phải qua **PIN app hoặc sinh trắc ngay trước khi ký**, không có thì OTP tới số của người ký (N-03); dùng cho biên bản nghiệm thu tại vườn, giao nhận, trả hàng, tiêu hủy | 30 phút, dùng một lần | OTP gửi SMS tới bên còn lại |
| QR-06 | `TAI_LIEU` xác minh tài liệu | In ở chân mỗi trang PDF | HT khi sinh PDF | Bất kỳ ai | Mở trang xác minh: mã tài liệu, phiên bản, mã băm SHA-256, người ký, thời điểm, trạng thái (hiệu lực / đã thay bởi phụ lục / đã hủy); **không** trả bản gốc; chỉ có ô tải tệp lên để so (N-05). Bản gốc chỉ tải trong app theo quyền (`07` mục 7) | Không | Nhập mã tài liệu ở trang xác minh |
| QR-07 | VietQR (chuẩn NAPAS) | Màn chuyển cọc, màn trả thẳng | HT | Ứng dụng ngân hàng của người trả | Điền sẵn ngân hàng, số tài khoản, số tiền, **nội dung = mã khoản** (ví dụ `AGV HD2001 COC`, `AGV HD2001 TT1`) | Theo hạn khoản | Hiện chữ số tài khoản, nội dung để gõ tay |
| QR-08 | `KHO` phiếu kho | Phiếu nhập kho, xuất kho | Kho đối tác | Chủ hàng, người nhận | Nhập/xuất đúng lô, đúng chủ, đúng người nhận | Đến khi xuất | Mã phiếu |
| QR-09 | `MOI` lời mời | Lời mời vào tổ chức (thành viên bên mua, hộ vào HTX, người giúp) | Chủ tổ chức | Người được mời | Gia nhập đúng tổ chức với đúng vai; lời mời **gắn số điện thoại** người được mời, nhận lời mời phải OTP đúng số đó (N-12); vai có quyền tiền mới hiệu lực sau 24 giờ | 72 giờ | Đường dẫn mời (cùng ràng buộc số điện thoại) |

### 7.1 VietQR chi tiết (QR-07)

| Khoản | Tài khoản đích | Nội dung | Ghi chú |
|---|---|---|---|
| Cọc + phí | Tài khoản cọc của đơn tại ngân hàng đối tác (mô phỏng, số ảo theo đơn) | `AGV <madon> COC` | Ngân hàng tách phí sang tài khoản doanh thu |
| Bổ sung cọc | Như trên | `AGV <madon> COCBS` | — |
| Trả thẳng | Tài khoản nhận tiền của người bán **chụp trong hợp đồng** (F05) | `AGV <madon> TT<so thu tu>` | App không biết tiền tới; người bán xác nhận số |
| Người bán hoàn ngoài app | Tài khoản bên mua ghi trong hợp đồng | `AGV <madon> HOAN` | Bên mua xác nhận |
| Hợp đồng khung theo kỳ | Tài khoản đầu mối | `AGV <makhung> K<ky>` | — |

Màn VietQR luôn có câu: "Chỉ chuyển vào tài khoản ghi trong hợp đồng: [ngân hàng] •••• [4 số cuối], đúng tên [chủ tài khoản]." Nếu tài khoản nhận của người bán đổi trong 30 ngày qua: thêm cảnh báo vàng "Tài khoản nhận tiền của người bán vừa đổi ngày [ngày]".

## 8. Luồng giao nhận chuẩn có QR (giao tại vườn, HĐ-2001)

| # | Ai | Làm | QR |
|---|---|---|---|
| 1 | Đồng Xanh (kế toán) | Chỉ định người nhận: anh Phúc (kho), đặt xe đối tác Lộc Phát, xe lạnh 66C-123.45, tài xế anh Lộc | Thẻ chuyến QR-03 phát cho anh Lộc |
| 2 | HT | Thẻ Sẵn sàng giao đủ (đã nhận 32.200.000, cọc giữ, người nhận, xe, hồ sơ) | QR nhận hàng QR-02 hiện trên máy anh Phúc |
| 3 | Chị Năm | Xe tới vườn: quét thẻ chuyến của anh Lộc → khớp biển số | QR-03 |
| 4 | Chị Năm | Quét QR nhận hàng trên máy anh Phúc → mở nghiệm thu tại vườn | QR-02 |
| 5 | Anh Phúc | Chia loại, cân: đạt 1.850 / hạ cấp 120 / trả lại 30; ảnh; niêm phong mẫu M-2291 hai phần | QR-04 trên hai túi mẫu |
| 6 | Chị Năm | Quét QR biên bản trên máy anh Phúc bằng **máy của chị** → xem đúng bản → mở khóa bằng PIN/vân tay (hoặc OTP) → ký | QR-05 |
| 7 | HT | Sinh PDF biên bản nghiệm thu; tạo lô con L-0412-T1 30 kg L2; rủi ro sang Đồng Xanh với 1.970 kg | QR-06 trên PDF; QR-01 cho lô con |
| 8 | Anh Lộc | Bốc, niêm phong xe, chạy; nhật ký nhiệt độ | — |
| 9 | Kho Đồng Xanh | Xe tới: quét thẻ chuyến, anh Phúc ký nhận, cân 1.950 kg | QR-03 |
| 10 | Anh Phúc | Trong 2 giờ: "Xác nhận đến đạt" (không khiếu nại khác mẫu) | — |
| 11 | HT | Quyết toán, lệnh ngân hàng | — |

## 9. Chuyển rủi ro: bảng tra nhanh cho tình huống hư hỏng

| Hư hỏng phát hiện ở | Kiểu giao | Nguyên nhân | Ai chịu | Tiền người bán |
|---|---|---|---|---|
| Điểm nghiệm thu | mọi kiểu | Hàng không đạt | Người bán (hạ cấp/trả lại theo hợp đồng) | Theo kết quả 3 phần |
| Nơi đến | `tai_vuon` | Dập, úng, nóng do đường (giống mẫu đối chứng) | Bên mua (đòi nhà xe) | Không đổi |
| Nơi đến | `tai_vuon` | Khác mẫu đối chứng (lỗi ẩn, đánh tráo) | Theo kiểm định | Theo kết luận |
| Nơi đến | `tai_kho_ben_mua` | Bất kỳ | Người bán (hàng chưa chuyển rủi ro) | Theo nghiệm thu tại kho |
| Trong kho lạnh thuê | — | Vượt hao hụt kho, sai nhiệt | Kho (theo hợp đồng kho) | Không đổi |
| Do xe bên mua tới trễ (đã ghi "Đã sẵn hàng") | `tai_vuon` | Hàng chờ bị héo, chín ép | Bên mua | Hạ cấp do chờ không được trừ người bán; ghi lý do "do chờ xe" |
