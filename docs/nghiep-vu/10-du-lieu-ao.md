# 10 · Dữ liệu ảo

Bộ dữ liệu nền để chạy mọi tình huống ở `09`. Tên người, tổ chức, mã số thuế, số tài khoản đều **hư cấu**. Số điện thoại theo dạng `09xx000xxx`. Tài khoản ngân hàng là số giả ở "Ngân hàng TMCP Thử Nghiệm" hoặc mang tên ngân hàng thật nhưng **số không tồn tại** và có tiền tố `THU-`. Bản máy đọc: `du-lieu-ao.json` cùng thư mục.

## 1. Quy ước

- **Đồng hồ nền**: `T0 = 2026-11-02T08:00:00+07:00` (thứ Hai). Môi trường thử có đồng hồ tua được (trang vận hành).
- **Mỗi tình huống chạy trên dữ liệu nền vừa nạp lại** cộng các "tiền điều kiện" ghi trong tình huống. Không nối tiếp dữ liệu giữa các tình huống trừ khi tình huống ghi rõ "tiếp từ TH-xxx".
- **OTP thử**: `123456` luôn đúng; `000000` luôn sai. Mã QR nhận hàng thử có mã 6 số dự phòng hiện trên màn.
- Mã: người dùng `ND-xxx`, tổ chức `TC-Bxx` (bán) / `TC-Mxx` (mua), lô `L-04xx`, nhu cầu `NC-30xx`, đơn `HĐ-20xx`, đơn nhóm `ĐN-20xx`, khung `KH-20xx`, bao tiêu `BT-20xx`.

## 2. Người bán

| Tổ chức | Loại | Người dùng (vai) | Điện thoại | Địa bàn | Mặt hàng | Tài khoản nhận tiền | Xác minh | Uy tín |
|---|---|---|---|---|---|---|---|---|
| TC-B01 Hộ Nguyễn Thị Năm | Hộ | ND-001 Nguyễn Thị Năm (chủ); ND-002 Nguyễn Văn Tèo (người giúp, con) | 0918000421; 0918000422 | Mỹ Xương, Cao Lãnh, Đồng Tháp | Xoài cát Chu (2,4 ha) | Agribank THU-7300000002186, chủ: Nguyễn Thị Năm | Căn cước đã xác minh; VietGAP đã xác minh; mã vùng trồng MVT-DT-0412 (giả) đã xác minh | 92; 18 đơn hoàn tất |
| TC-B02 Hộ Trần Văn Sáu | Hộ | ND-003 Trần Văn Sáu | 0939000160 | Mỹ Xương | Xoài cát Chu | Vietcombank THU-0110000001606 | Đã xác minh | 85; 6 đơn |
| TC-B03 HTX Mỹ Xương | HTX | ND-004 Lê Văn Hòa (chủ nhiệm); ND-005 Phạm Thị Mai (kế toán); ND-006 Đỗ Văn Lợi (nhân viên điểm gom) | 0907000300; 0907000301; 0907000302 | Mỹ Xương | Xoài, thanh long (đầu mối nhà hàng) | BIDV THU-6500000003000, chủ: HTX Mỹ Xương | Giấy chứng nhận HTX đã xác minh | 88; 25 đơn |
| TC-B04 Hộ Võ Thị Lan (Út Lan) | Hộ, xã viên HTX | ND-007 Võ Thị Lan | 0939000140 | Mỹ Xương | Xoài | Agribank THU-7300000001400 | Đã xác minh | Mới |
| TC-B05 Hộ Lê Thị Hai (cô Hai) | Hộ, xã viên HTX | ND-008 Lê Thị Hai | 0939000120 | Mỹ Xương | Xoài | Agribank THU-7300000001200 | Đã xác minh | 70; 3 đơn |
| TC-B06 Hộ Lý Văn Tư | Trang trại | ND-009 Lý Văn Tư | 0977000610 | Cai Lậy, Đồng Tháp | Sầu riêng Ri6 (6 ha) | Sacombank THU-0600000006100 | Đã xác minh; mã vùng trồng MVT-DT-0610 đã xác minh | 90; 9 đơn |
| TC-B07 Hộ Đặng Thị Bích | Hộ | ND-010 Đặng Thị Bích | 0966000520 | Bến Lức, Tây Ninh | Chanh không hạt (3 ha) | Agribank THU-7300000005200 | Đã xác minh | 87; 11 đơn |
| TC-B08 Hộ Huỳnh Văn Bảy | Hộ | ND-011 Huỳnh Văn Bảy | 0988000770 | Mỏ Cày Nam, Vĩnh Long | Bưởi da xanh (2 ha) | Vietinbank THU-1080000007700 | Đã xác minh | 83; 5 đơn |
| TC-B09 Hộ Châu Văn Lực | Hộ | ND-012 Châu Văn Lực | 0945000880 | Mỹ Xuyên, Cần Thơ | Tôm thẻ (ao 0,8 ha) | Agribank THU-7300000008800 | Đã xác minh; nhật ký ao đủ | 89; 7 đơn |
| TC-B10 Tổ hợp tác Tôm sạch Hòa Tú | Tổ hợp tác | ND-013 Lâm Văn Đức (tổ trưởng) | 0945000890 | Mỹ Xuyên | Tôm thẻ | Agribank THU-7300000008900, chủ: Lâm Văn Đức | Giấy ủy quyền 4 hộ (đã xác minh) | 80 |
| TC-B11 Hộ Nguyễn Văn Chín | Hộ | ND-014 Nguyễn Văn Chín | 0919000950 | Tháp Mười, Đồng Tháp | Lúa OM18 (5 ha) | Agribank THU-7300000009500 | Đã xác minh | 86; 8 đơn |
| TC-B12 Hộ Phan Thị Hồng | Hộ | ND-015 Phan Thị Hồng | 0916000330 | Chợ Gạo, Đồng Tháp | Thanh long ruột đỏ (2 ha) | Agribank THU-7300000003300 | Đã xác minh | 81; 4 đơn |
| TC-B13 Hộ Thạch Sơn | Trang trại | ND-016 Thạch Sơn | 0977000620 | Cai Lậy | Sầu riêng Ri6 | Sacombank THU-0600000006200 | Mã vùng MVT-DT-0620 đã xác minh | 84 |
| TC-B14 Hộ Trịnh Văn Mười | Hộ | ND-017 Trịnh Văn Mười | 0917000101 | Châu Phú, An Giang | Cá tra (ao 1,5 ha) | Agribank THU-7300000001010 | Đã xác minh | 82 |
| TC-B15 Hộ Huỳnh Thị Nga | Hộ | ND-018 | 0977000630 | Cai Lậy | Sầu riêng Ri6 | THU-0600000006300 | Mã vùng MVT-DT-0630 | 86 |
| TC-B16 Hộ Lê Văn Phát | Hộ | ND-019 | 0977000640 | Cai Lậy | Sầu riêng Ri6 | THU-0600000006400 | Mã vùng MVT-DT-0640 | 88 |
| TC-B17 Hộ Ngô Văn Hậu | Hộ | ND-020 | 0977000650 | Cai Lậy | Sầu riêng Ri6 | THU-0600000006500 | Mã vùng MVT-DT-0650 | 85 |
| TC-B18 Hộ Trần Thị Kim | Hộ | ND-021 | 0977000660 | Cai Lậy | Sầu riêng Ri6 | THU-0600000006600 | Mã vùng MVT-DT-0660 | 87 |
| TC-B19 Hộ Đinh Văn Toàn | Hộ | ND-022 | 0977000670 | Cai Lậy | Sầu riêng Ri6 | THU-0600000006700 | Mã vùng MVT-DT-0670 | 83 |

## 3. Bên mua

| Tổ chức | Phân khúc | Gói | MST (giả) | Địa chỉ nhận | Thành viên (vai, hạn mức ký) | Điện thoại |
|---|---|---|---|---|---|---|
| TC-M01 Nhà máy sấy Đồng Xanh | Chế biến | Thu mua | 0319990001 | KCN Hiệp Phước, TP.HCM (cách Mỹ Xương 180 km) | ND-101 Trần Thu Hà (mua hàng, 50.000.000); ND-102 Lê Thị Lan (kế toán); ND-103 Võ Hoàng Phúc (kho, người nhận); ND-104 Nguyễn Đức Thịnh (quản lý) | 0909000210; 0909000211; 0909000212; 0909000213 |
| TC-M02 Công ty XNK Sông Tiền | Xuất khẩu | Doanh nghiệp | 0319990002 | Kho đóng gói Mỹ Tho, Đồng Tháp (mã cơ sở đóng gói CSĐG-DT-02 giả) | ND-105 Phạm Minh Quân (quản lý); ND-106 Nguyễn Thị Ngọc (kho, QA); ND-107 Huỳnh Văn Bình (kế toán) | 0903000410; 0903000411; 0903000412 |
| TC-M03 Công ty Thủy sản Cửu Long Xanh | Xuất khẩu (tôm) | Doanh nghiệp | 0319990003 | Nhà máy Trà Nóc, Cần Thơ | ND-108 Lý Thanh Tùng (mua hàng, 300.000.000); ND-109 Trương Thị Hạnh (kho, QA) | 0902000810; 0902000811 |
| TC-M04 Nhà máy chế biến Mekong | Chế biến; **đối tác bao tiêu** | Thu mua | 0319990004 | Cao Lãnh, Đồng Tháp | ND-110 Đặng Quốc Việt (quản lý); ND-111 Mai Thị Thủy (kế toán) | 0901000710; 0901000711 |
| TC-M05 Nhà hàng Bếp Sen | Nhà hàng | Bếp | 0319990005 | TP Cao Lãnh | ND-112 Võ Thanh Sen (quản lý); ND-113 Lê Văn Tài (người nhận) | 0908000510; 0908000511 |
| TC-M06 Quán Cơm Nhà Mười | Nhà hàng (quán nhỏ) | Miễn phí | 8099990006 (hộ kinh doanh) | TP Cao Lãnh | ND-114 Nguyễn Thị Mười (một người làm hết) | 0906000105 |
| TC-M07 Vựa trái cây Tư Hùng | Đầu mối; **hai vai** (mua và bán) | Miễn phí | 0319990007 | Cao Lãnh | ND-115 Tạ Văn Hùng | 0938000610 |
| TC-M08 Vựa lúa Ba Thành | Đầu mối | Miễn phí | 0319990008 | Tháp Mười | ND-116 Trần Văn Thành | 0937000910 |

Hồ sơ "nhận hàng kém loại":
- TC-M04 Mekong: xoài L2 ≥ 300 kg, xoài L3/dạt ≥ 300 kg, thanh long L2 ≥ 500 kg, thanh long dạt ≥ 500 kg; bán kính 100 km. Bảng giá sàn bao tiêu: xoài L2 9.000, xoài L3/dạt 5.000, thanh long L2 6.000, chanh L2 6.000, cá tra ngoài cỡ 26.000.
- TC-M01 Đồng Xanh: xoài L2 ≥ 500 kg, bán kính 200 km.

## 4. Đối tác và nhân viên

| Mã | Tên | Người | Điện thoại | Ghi chú |
|---|---|---|---|---|
| DT-NH | Ngân hàng TMCP Thử Nghiệm (mô phỏng) | — | — | Tài khoản cọc ảo theo đơn: `THU-COC-<madon>`; tài khoản doanh thu AgiViet `THU-AGV-DOANHTHU` |
| DT-KD | Trung tâm kiểm định Phương Nam (mô phỏng) | ND-201 Phan Văn Lâm (kiểm định viên) | 0913000444 | Phí: kiểm cảm quan và cân lại 280.000/lần; cadimi + vàng O 1.500.000/mẫu (48 giờ); test nhanh kháng sinh tôm 450.000/lần (2 giờ); đo ẩm lúa 200.000 |
| DT-XE | Nhà xe Lộc Phát | ND-202 Hồ Văn Lộc (xe lạnh 66C-123.45, 2,5 tấn); ND-203 Trần Văn Nghĩa (xe thường 66C-678.90, 5 tấn) | 0912000123; 0912000124 | Cước Cao Lãnh → TP.HCM xe lạnh 2,5 tấn: 3.200.000/chuyến; xe thường 5 tấn: 2.400.000 |
| DT-KHO | Kho lạnh Tân Phú Lạnh, Cao Lãnh | ND-204 Võ Thị Diễm | 0909000920 | 300 đ/kg/ngày; nhập/xuất miễn phí; 2–8°C và 10–13°C |
| ĐG-01 | Điểm gom HTX Mỹ Xương | ND-006 Đỗ Văn Lợi | 0907000302 | Phí gom 300 đ/kg |
| VH | Nhân viên AgiViet | ND-301 Ngô Thị Vy (điều phối); ND-302 Trần Văn Khoa (hiện trường Đồng Tháp); ND-303 Lâm Thị Thu (hiện trường Cần Thơ); ND-304 Bùi Thị Thảo (đối soát lập); ND-305 Đỗ Minh Trí (đối soát duyệt); ND-306 Phạm Quốc Bảo (rủi ro); ND-307 Lê Minh Châu (danh mục); ND-308 Nguyễn Hữu Tâm (trưởng ca) | 0901000001 … 0901000008 | Theo thứ tự mã |

## 5. Lô nền

| Mã lô | Người bán | Mặt hàng · loại | Lượng (kg) | Ước tính / đã cân | Ngày có hàng | Cách ly hết | Giá mong muốn | Giá thấp nhất kín | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| L-0412 | TC-B01 Năm | Xoài cát Chu L1 | 4.000 | Ước tính (cam kết tối đa 3.200) | 02/11 | 01/11 | 24.000 | 21.500 | dang_ban |
| L-0413 | TC-B01 Năm | Xoài cát Chu L2 | 600 | Đã cân | 02/11 | 01/11 | 15.000 | 12.000 | dang_ban |
| L-0414 | TC-B01 Năm (vườn 2) | Xoài cát Chu L1 | 2.000 | Đã cân | 05/11 | 03/11 | 24.000 | 22.000 | dang_ban (dùng cho lô gộp) |
| L-0420 | TC-B02 Sáu | Xoài cát Chu L1 | 1.500 | Đã cân | 02/11 | 30/10 | 24.000 | 21.000 | dang_ban |
| L-0430 | TC-B04 Út Lan | Xoài cát Chu L1 | 1.000 | Đã cân | 03/11 | 30/10 | 24.000 | 21.000 | dang_ban |
| L-0431 | TC-B05 cô Hai | Xoài cát Chu L1 | 500 | Đã cân | 03/11 | 30/10 | 23.500 | 21.000 | dang_ban |
| L-0440 | TC-B06 Tư | Sầu riêng Ri6 A | 4.000 | Ước tính (cam kết tối đa 3.200) | 06/11 | 25/10 | 75.000 | 70.000 | sap_co_hang |
| L-0441 … L-0445 | TC-B15…B19 | Sầu riêng Ri6 A | 3.800 mỗi lô | Ước tính (cam kết tối đa 3.040) | 06/11 | 25/10 | 74.000 | 70.000 | sap_co_hang |
| L-0447 | TC-B13 Sơn | Sầu riêng Ri6 A | 3.800 | Ước tính (cam kết tối đa 3.040) | 07/11 | 25/10 | 74.000 | 70.000 | sap_co_hang |
| L-0450 | TC-B07 Bích | Chanh không hạt L1 | 2.000 | Đã cân | 02/11 | 28/10 | 14.000 | 12.500 | dang_ban |
| L-0451 | TC-B07 Bích | Chanh không hạt L2 | 400 | Đã cân | 02/11 | 28/10 | 9.000 | 7.000 | dang_ban |
| L-0460 | TC-B08 Bảy | Bưởi da xanh L1 | 3.000 | Đã cân | 02/11 | 20/10 | 31.000 | 28.000 | dang_ban |
| L-0470 | TC-B09 Lực | Tôm thẻ 48–52 con/kg | 1.500 | Ước tính | 05/11 | 22/10 (ngừng thuốc) | 120.000 | 112.000 | sap_co_hang |
| L-0480 | TC-B11 Chín | Lúa tươi OM18 (ẩm chuẩn 25%) | 30.000 | Ước tính | 04/11 | — | 6.700 | 6.400 | sap_co_hang |
| L-0490 | TC-B12 Hồng | Thanh long ruột đỏ (chưa tách) | 5.000 | Đã cân | 02/11 | 28/10 | — | — | nhap |
| L-0495 | TC-B14 Mười | Cá tra 0,8–1,2 kg/con | 20.000 | Ước tính | 10/11 | 25/10 | 30.000 | 28.000 | sap_co_hang |

## 6. Nhu cầu nền

| Mã | Bên mua | Dòng | Lượng | Giá tối đa kín | Cửa sổ | Nơi nhận / kiểu giao | Giấy tờ bắt buộc | Dạng |
|---|---|---|---|---|---|---|---|---|
| NC-3001 | TC-M01 Đồng Xanh | Xoài cát Chu L1 | 2.000 | 24.000 | 03–05/11 | Tại vườn, bên mua lo xe | — | Lô một lần |
| NC-3002 | TC-M01 Đồng Xanh | (1) Xoài L2 · (2) Xoài L3/dạt | 3.000 · 2.000 | 16.000 · 7.000 | 03–15/11 | Tại kho Đồng Xanh | — | Cần gom |
| NC-3003 | TC-M02 Sông Tiền | Sầu riêng Ri6 A (xuất Trung Quốc) | 18.000 | 74.000 | 06–09/11 | Tại vườn, kiểm định trước bốc | Mã vùng trồng TQ, nhật ký cách ly, kết quả cadimi + vàng O | Cần gom |
| NC-3004 | TC-M03 Cửu Long Xanh | Tôm thẻ 48–52 con/kg | 1.500 | 120.000 | 05–06/11 | Tại ao | Nhật ký ao; test kháng sinh | Lô một lần |
| NC-3005 | TC-M07 Tư Hùng | Bưởi da xanh L1 | 3.000 | 31.000 | 02–04/11 | Tại vườn | — | Lô một lần |
| NC-3006 | TC-M08 Ba Thành | Lúa tươi OM18 ẩm chuẩn 25% | 30.000 | 6.800 | 04–05/11 | Tại ruộng | — | Lô một lần |
| NC-3007 | TC-M07 Tư Hùng | Xoài cát Chu L1 | 200 | 23.500 | 04/11 | Điểm gom ĐG-01 | — | Cần gom (đơn nhóm) |
| NC-3008 | TC-M01 Đồng Xanh | Xoài cát Chu L1 | 2.500 | 24.000 | 03–06/11 | Tại vườn | — | Lô một lần (dùng kiểm "còn thiếu 500 kg") |

## 7. Giá tham khảo nền

Lấy từ `01` mục 6. Riêng xoài cát Chu L1 có 14 đơn nền (bảng `don_nen` trong JSON) giá: 23.500; 24.000; 24.000; 24.500; 24.500; 25.000; 25.000; 25.000; 25.000; 25.500; 25.500; 26.000; 26.000; 26.500 → trung vị 25.000 (trung bình phần tử thứ 7 và 8). Các đơn nền thuộc ≥ 4 cặp mua–bán khác nhau, đều chốt trong 30 ngày trước T0.

Đơn lịch sử ảnh hưởng phí:
- HĐ-1015: Năm → Tư Hùng, hoàn tất 15/10 (cặp có mối quen, phí Miễn phí 0,5%). Đơn này gắn `loai_khoi_gia_tham_khao` để bộ 14 đơn nền giữ trung vị 25.000.
- Năm và Đồng Xanh **chưa có** đơn hoàn tất: HĐ-2001 là đơn đầu của cặp (phí 0,3%); sau khi HĐ-2001 hoàn tất, HĐ-2004 là mối quen (0%).

## 8. Hợp đồng khung và bao tiêu nền

| Mã | Hai bên | Nội dung | Số |
|---|---|---|---|
| KH-2003 | HTX Mỹ Xương (bán) ↔ Bếp Sen | Thứ 2, thứ 5: 30 kg xoài L1 × 26.000 + 20 kg thanh long L1 × 19.000 | Cọc khung 1.160.000; cho nợ thêm 1.500.000; đã giao chưa trả (thứ 2, 02/11) 1.160.000; đã chốt sắp giao (thứ 5, 05/11) 1.420.000 (đã gồm thêm 10 kg xoài) |
| KH-2006 | Vựa Tư Hùng (vai bán) ↔ Quán Cơm Nhà Mười | Thứ 3, thứ 6: 10 kg chanh L1 × 16.000 + 15 kg xoài L2 × 18.000 | Cọc khung 860.000; cho nợ 200.000; kỳ thanh toán: thứ 7 |
| BT-2005 | Nhà máy Mekong ↔ chị Năm | Xoài L1 cho sấy, 3 đợt 3.000 / 2.800 / 3.200 kg; giá = max(18.000; 90% tham khảo L1 ngày giao) | Cọc vụ 9.000.000; vật tư ứng 15.000.000 trừ 5.000.000/đợt; đợt 1 đã xong |

## 9. Chính sách nền (cài đặt vận hành)

| Khóa | Giá trị |
|---|---|
| `ty_le_coc` | 0,30 |
| `ty_le_gia_tinh_coc` | 0,70 |
| `nguong_gia_thap` | 0,80 |
| `nguong_gia_bat_thuong` | 0,60 |
| `nguong_gia_cao` | 1,30 |
| `so_don_tham_khao_toi_thieu` | 3 (từ ≥ 2 cặp) |
| `loi_cho_phep_mac_dinh` | 0,05 |
| `dung_sai_luong_mac_dinh` | 0,05 |
| `han_*` | Theo `03` mục 13 |
| `phat_thieu_luong` | {bat_kha_khang: 0; bao_truoc_3_ngay: 0,10; bao_duoi_3_ngay: 0,50; khong_bao: 1,00} × cọc phần thiếu |
| `nguong_mo_lien_lac` | 3.000.000 đ hoặc 2 đơn hoàn tất |
| `goi` | Theo `11` mục 2 |
