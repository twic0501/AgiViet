# 01 · Mặt hàng MVP và hồ sơ ngành hàng

## 1. Kết luận

Mở **8 mặt hàng, 3 nhóm, 3 cấp mở**:

| Cấp | Ý nghĩa | Mặt hàng |
|---|---|---|
| **Cấp 1 · mở ngay** | Giao dịch đầy đủ, mọi loại hợp đồng | Xoài cát Chu · Chanh không hạt · Tôm thẻ chân trắng · Lúa tươi |
| **Cấp 2 · mở khi có đối tác kiểm định** | Chỉ nhận đơn khi cấu hình được kiểm định trước khi bốc (bắt buộc với đơn xuất khẩu) | Sầu riêng Ri6/Monthong · Bưởi da xanh |
| **Cấp 3 · mở nhánh hàng kém loại và chế biến** | Giao dịch đầy đủ, nhưng mặc định gợi ý tới bên mua chế biến; dùng để kiểm thử bán gấp, bao tiêu | Thanh long ruột trắng/đỏ · Cá tra nguyên liệu |

Cấp mở là một trường cấu hình của mặt hàng (`cap_mo`), vận hành đổi được. Mặt hàng ngoài danh sách vẫn chọn được ở màn đăng với nhãn "Chưa hỗ trợ giao dịch trên app" (chỉ ghi sổ, không ghép, không cọc).

**Ba nhóm:**
1. **Trái cây tươi**: xoài cát Chu, chanh không hạt, sầu riêng, bưởi da xanh, thanh long.
2. **Thủy sản nuôi**: tôm thẻ chân trắng, cá tra.
3. **Lương thực**: lúa tươi.

**Không mở trong v2** (đã chốt phạm vi): rau ăn lá và rau gia vị (hư trong 1–2 ngày, lô nhỏ, giao trong ngày; để giai đoạn sau qua đầu mối), heo, gà, vịt, trứng, sữa (dịch bệnh, kiểm dịch, chuỗi khép kín; người dùng đã chốt hạn chế thịt công nghiệp), lâm sản gỗ (đã loại khỏi phạm vi 29/09), dược liệu, mật ong, yến (hàng giả nhiều, cần kiểm nghiệm riêng), giống cây con (là vật tư, cần điều kiện kinh doanh riêng). Căn cứ đánh giá từng mặt hàng: `/home/twictrn/Documents/AgiViet/AgiViet_danh_sach_mat_hang.csv` (385 dòng; 247 "Nên bán", 73 "Bán có điều kiện", 65 "Không nên bán").

## 2. Cách chọn

Mỗi mặt hàng chấm 1–5 điểm theo 7 tiêu chí (5 là tốt nhất cho AgiViet). Rủi ro chấm ngược (5 = rủi ro thấp).

| Tiêu chí | Câu hỏi |
|---|---|
| Quy mô | Giá trị thị trường, xuất khẩu, diện tích ở ĐBSCL có đủ lớn? |
| Tần suất | Bao lâu có một giao dịch? Quanh năm hay một vụ? |
| Đau người bán | Bị ép giá, ép loại, bẻ kèo, thiếu đầu ra ở mức nào? |
| Đau người mua | Thiếu nguồn đúng chuẩn, sai giấy tờ, thiếu lượng ở mức nào? |
| Chuẩn hóa | Có chỉ tiêu đo được (cỡ, trọng lượng, độ ẩm, con/kg) để viết hợp đồng? |
| Hợp 4 phân khúc | Bao nhiêu trong 4 phân khúc (xuất khẩu, chế biến, nhà hàng, vựa) mua mặt hàng này? |
| Rủi ro (ngược) | An toàn thực phẩm, dịch bệnh, giấy phép, hư nhanh |

| Mặt hàng | Quy mô | Tần suất | Đau bán | Đau mua | Chuẩn hóa | Hợp phân khúc | Rủi ro (ngược) | Tổng /35 | Cấp |
|---|---|---|---|---|---|---|---|---|---|
| Xoài cát Chu | 4 | 4 | 5 | 4 | 4 | 4 (cả 4) | 4 | **29** | 1 |
| Chanh không hạt | 3 | 5 | 4 | 4 | 4 | 4 (cả 4) | 4 | **28** | 1 |
| Tôm thẻ chân trắng | 5 | 4 | 4 | 4 | 5 | 3 (XK, CB, NH) | 3 | **28** | 1 |
| Lúa tươi | 5 | 3 | 5 | 3 | 5 | 2 (vựa, XK gạo qua nhà máy) | 4 | **27** | 1 |
| Sầu riêng Ri6/Monthong | 5 | 3 | 4 | 5 | 3 | 3 (XK, vựa, CB đông lạnh) | 2 | **25** | 2 |
| Bưởi da xanh | 3 | 4 | 3 | 3 | 4 | 4 (cả 4) | 4 | **25** | 2 |
| Thanh long | 3 | 4 | 5 | 2 | 4 | 3 (CB, vựa, NH) | 4 | **25** | 3 |
| Cá tra nguyên liệu | 4 | 4 | 4 | 3 | 4 | 1 (CB) | 3 | **23** | 3 |

### 2.1 Căn cứ từng mặt hàng (có nguồn)

- **Sầu riêng**: xuất khẩu 9 tháng 2026 khoảng 3,5 tỷ USD, tăng 52%, Trung Quốc chiếm khoảng 3,3 tỷ USD; dự báo cả năm khoảng 4 tỷ USD ([Trung tâm WTO, 15/10/2026](https://trungtamwto.vn/tin-tuc/33662-xuat-khau-rau-qua-tang-toc-moc-ky-luc-10-ty-usd-da-rat-gan); [Tạp chí Kinh tế Tài chính](https://tapchikinhtetaichinh.vn/sau-rieng-viet-huong-toi-muc-tieu-xuat-khau-tren-4-ty-usd-nam-2026-165077.html)). Đến 7/2026 có trên 1.200 mã số vùng trồng và 120 mã cơ sở đóng gói đang hoạt động cho Trung Quốc, còn hơn 1.100 mã chờ duyệt; 50 phòng kiểm nghiệm được GACC chấp thuận (47 cadimi, 39 vàng O); có ách tắc ở khâu kiểm nghiệm và hậu kiểm cadimi ([Trung tâm WTO](https://trungtamwto.vn/tin-tuc/33217-yeu-cau-bao-dam-hoat-dong-san-xuat-tieu-thu-xuat-khau-sau-rieng); [Thuế Hải quan, 8/2026](https://thuehaiquan.tapchikinhtetaichinh.vn/go-nut-that-kiem-nghiem-cac-tinh-phia-nam-cuu-dau-ra-cho-sau-rieng-xuat-khau-155472.html)). → Cầu rõ nhất, giá trị đơn lớn (phí cao), nhưng cần kiểm định bắt buộc nên để cấp 2.
- **Rau quả nói chung**: 9 tháng 2026 đạt gần 7,35 tỷ USD, tăng 19,9% ([Trung tâm WTO](https://trungtamwto.vn/tin-tuc/33662-xuat-khau-rau-qua-tang-toc-moc-ky-luc-10-ty-usd-da-rat-gan)).
- **Tôm**: xuất khẩu thủy sản 9 tháng 2026 khoảng 9,1 tỷ USD (tăng 11,4%); tôm khoảng 3,75 tỷ USD, chiếm khoảng 41% ([Báo Thanh tra, dẫn VASEP](https://thanhtra.com.vn/tieu-dung-AA9F50895/xuat-khau-thuy-san-vuot-9-ty-usd-tom-va-ca-tra-vung-vai-tro-chu-luc-98015f6b5.html)). Cần xác minh lại kỳ của số tôm với bản công bố VASEP. Tôm có chỉ tiêu đo rất rõ (cỡ con/kg), nhà máy chế biến mua liên tục theo mùa thả.
- **Cá tra**: 9 tháng 2026 khoảng 1,7–1,74 tỷ USD, tăng khoảng 11% ([Báo Thanh tra](https://thanhtra.com.vn/tieu-dung-AA9F50895/xuat-khau-thuy-san-vuot-9-ty-usd-tom-va-ca-tra-vung-vai-tro-chu-luc-98015f6b5.html); [Doanh nghiệp hội nhập](https://doanhnghiephoinhap.vn/thi-truong&by-date=2026-10-20T08-15)). Bên mua gần như chỉ là nhà máy chế biến, nhiều nhà máy tự nuôi một phần, nên chỉ hợp 1 phân khúc → cấp 3.
- **Lúa gạo**: 6 tháng đầu 2026 xuất khoảng 5,2 triệu tấn gạo, 2,38 tỷ USD; giá lúa tươi OM18 ngày 10/7/2026 khoảng 6.400–6.700 đ/kg ([Doanh nghiệp hội nhập, 10/7/2026](https://doanhnghiephoinhap.vn/gia-lua-gao-hom-nay-1072026-thi-truong-trong-nuoc-binh-on-thi-truong-xuat-khau-bien-dong-nhe-142794.html); [VOV](https://vov.vn/kinh-te/xuat-khau-gao-doi-mat-thu-thach-lon-gia-giam-sau-ap-luc-canh-tranh-de-nang-post1340511.vov)). Lượng giao dịch rất lớn, giá biến động làm hai bên "bẻ kèo" cọc lúa; chỉ tiêu độ ẩm, tạp chất đo được → hợp đồng cọc có giá trị thật.
- **Xoài**: ĐBSCL có 9 chủ vựa lớn và 7 công ty chuyên xuất khẩu xoài cát Hòa Lộc và cát Chu; nghịch lý xoài rớt giá mà doanh nghiệp vẫn thiếu nguyên liệu đúng chuẩn ([Znews](https://znews.vn/gia-xoai-rot-tham-doanh-nghiep-lai-keu-thieu-hang-xuat-khau-post411588.html)). Đồng Tháp có khoảng 10.030 ha xoài đăng ký mã số vùng trồng với 353 mã (kế hoạch ngành hàng xoài của tỉnh). Đây cũng là mặt hàng xuyên suốt của mọi bản mẫu trước (chị Năm, Đồng Xanh), giữ để nối dữ liệu.
- **Chanh không hạt**: riêng Bến Lức có khoảng 7.137 ha chanh, trong đó hơn 6.564 ha chanh không hạt, xuất khẩu gần 90%, chủ yếu Trung Đông ([Bộ Công Thương](https://moit.gov.vn/tin-tuc/bo-cong-thuong-voi-dia-phuong/long-an-mong-muon-duoc-ho-tro-lien-ket-tieu-thu-mot-so-mat-h.html)); có HTX xuất 8–10 container 24 tấn mỗi tháng đi Dubai ([SGGP](https://www.sggp.org.vn/chanh-khong-hat-o-long-an-co-mat-tai-trung-dong-post761589.html)). Thu hoạch quanh năm, nhà hàng nào cũng dùng → mặt hàng tốt nhất để kiểm thử **đặt định kỳ lô nhỏ**.
- **Bưởi da xanh**: đã có chương trình xuất khẩu sang Mỹ; bưởi đạt chuẩn có thể bảo quản tới 2 tháng; có doanh nghiệp cho biết nguồn nhà vườn chỉ đáp ứng 30–40% đơn xuất khẩu ([Saigon Times](https://thesaigontimes.vn/co-hoi-cho-xuat-khau-buoi-da-xanh-dua-xiem-xanh/); [VnBusiness](https://vnbusiness.vn/thi-truong/hom-nay-lo-buoi-dau-tien-cua-viet-nam-duoc-xuat-khau-sang-hoa-ky-1089634.html)). Một phần số liệu có thể của năm cũ; dùng như căn cứ định tính. Thời gian sống dài giúp kiểm thử trả sau, kho.
- **Thanh long**: xuất khẩu 11 tháng 2025 khoảng 485,2 triệu USD, mức thấp nhất từ 2014; giá tại vườn có lúc xuống khoảng 18.000 đ/kg làm nông dân lỗ; Tiền Giang (cũ) có khoảng 8.500 ha, chủ yếu ruột đỏ ([Trung tâm WTO](https://trungtamwto.vn/tin-tuc/31535-thanh-long-viet-roi-khoi-dinh-vang-xuat-khau)). → Đau người bán rất cao, đầu ra cần nhất là chế biến và hàng kém loại: đặt ở cấp 3 để kiểm thử bán gấp, bao tiêu.

**Lưu ý dữ liệu:** các số trên là tham khảo công khai ở thời điểm 25/10/2026, một số nguồn có ngày đăng không khớp nội dung. Trước pilot phải đối chiếu với Cục Hải quan hoặc Bộ Nông nghiệp và Môi trường. Giá dùng trong dữ liệu ảo (`10`) là **giả định**, không phải giá thị trường.

### 2.2 Vì sao mỗi phân khúc có đủ hàng

| Phân khúc | Mặt hàng chính trong danh mục |
|---|---|
| Xuất khẩu | Sầu riêng, xoài, chanh không hạt, bưởi (trái); tôm (qua nhà máy xuất khẩu) |
| Chế biến | Xoài loại 2, 3 (sấy), thanh long kém loại (nước ép, sấy), chanh dạt (nước cốt), tôm, cá tra, sầu riêng loại B, C (cơm đông lạnh) |
| Nhà hàng, quán ăn | Chanh, xoài, bưởi, thanh long, tôm (qua đầu mối) |
| Vựa, đầu mối | Mọi mặt hàng; lúa tươi gần như chỉ qua vựa và nhà máy xay xát |

## 3. Hồ sơ ngành hàng: cấu trúc dữ liệu chung

Mỗi mặt hàng là một bản ghi cấu hình có phiên bản (`ho_so_nganh_hang`). Hợp đồng dẫn tới **đúng phiên bản** hồ sơ lúc ký; sửa hồ sơ không làm đổi hợp đồng cũ.

| Trường | Ý nghĩa |
|---|---|
| `ma`, `ten`, `ten_dia_phuong[]`, `nhom`, `cap_mo` | Định danh, tên tìm kiếm (không dấu, tên vùng) |
| `giong[]` | Giống hoặc loài cho phép chọn |
| `dang_san_pham[]` | Ví dụ tôm: `song`, `tuoi_uop_da`; lúa: `lua_tuoi`, `lua_kho` |
| `don_vi_gia` | `kg` cho mọi mặt hàng v2 (lúa ghi kg quy đổi; tôm ghi kg nhưng giá theo bảng cỡ) |
| `kieu_chat_luong` | `loai` (chia loại 1/2/3/dạt, trái cây), `bang_co` (tôm, cá tra: giá theo khoảng cỡ), `do_am` (lúa: quy đổi khối lượng) |
| `bang_loai[]` | Mỗi loại: mã, tên, chỉ tiêu (khoảng trọng lượng, khuyết tật cho phép), ảnh mẫu |
| `ly_do_tra_lai[]` | Danh mục lý do có mã (dập, thối, sâu đục, sai giống…) |
| `dung_sai_luong` | Mặc định ±5% (trong khoảng là luồng thuận) |
| `loi_cho_phep` | Tỷ lệ trả lại không cần ảnh, mặc định 5% |
| `hao_hut_duong[]` | Mức hao hụt cho phép theo điều kiện chuyến (thường/lạnh, ≤ 24 giờ / > 24 giờ) |
| `bao_quan` | Nhiệt độ khuyến nghị, thời gian sống từ lúc thu hoạch theo điều kiện |
| `han_nghiem_thu_im_lang` | Số giờ cho điều khoản im lặng ở nơi đến (nếu có) |
| `mau_doi_chung` | Số đơn vị mẫu niêm phong (ví dụ 5 trái, 1 kg tôm) |
| `giay_to[]` | Giấy tờ theo kênh: nội địa / xuất khẩu theo thị trường; trường nào là bộ lọc cứng |
| `kiem_dinh[]` | Chỉ tiêu có thể kiểm, đối tác, thời gian trả kết quả, giá tham khảo |
| `hop_dong_goi_y[]` | Loại hợp đồng hay dùng |
| `dau_ra_kem_loai[]` | Bên mua điển hình cho hàng loại dưới (sấy, nước ép, thức ăn chăn nuôi…) |
| `rui_ro_dac_thu[]` | Ví dụ "hái non", "nhúng thuốc", "tôm chết" |

**Tất cả ngưỡng kỹ thuật bên dưới là tham số thử để chạy hệ thống**, lấy theo tập quán phổ biến; phải được chuyên gia ngành, HTX và đối tác kiểm định xác nhận trước khi dùng cho giao dịch thật. Không coi đây là tiêu chuẩn quốc gia.

## 4. Hồ sơ từng mặt hàng

### 4.1 Xoài cát Chu (`XOAI_CAT_CHU`) · cấp 1

| Trường | Giá trị v2 |
|---|---|
| Giống | Cát Chu (cho phép thêm cát Hòa Lộc, Đài Loan, keo ở giai đoạn sau, cùng cấu trúc) |
| Đơn vị | kg tịnh, cân tại điểm nghiệm thu; thùng nhựa trừ bì theo bì cân thử 3 thùng |
| Chia loại | **L1**: 300–450 g/trái, vỏ không vết đen quá 5% diện tích, không dập, già 80–85%. **L2**: 220–299 g hoặc vết vỏ 5–20%. **L3/dạt**: dưới 220 g, trầy nặng, chín ép (bán cho sấy, nước ép). **Trả lại**: dập, thối, ruồi đục trái, nứt |
| Dung sai lượng | ±5% |
| Lỗi cho phép | 5% |
| Hao hụt đường | Xe thường ≤ 24 giờ: 2%; xe lạnh 10–13°C: 1%; > 24 giờ: thêm 1% mỗi ngày |
| Bảo quản, thời gian sống | Nhiệt thường 5–7 ngày từ khi hái; 10–13°C khoảng 2–3 tuần |
| Mẫu đối chứng | 5 trái, niêm phong 2 phần (người bán giữ 1, theo xe 1) |
| Giấy tờ nội địa | Không bắt buộc; VietGAP là bộ lọc nếu bên mua chọn |
| Giấy tờ xuất khẩu | Mã số vùng trồng còn hiệu lực cho thị trường; mã cơ sở đóng gói (do bên mua); nhật ký cách ly thuốc; kiểm dư lượng theo thị trường; kiểm dịch thực vật (bên mua làm) |
| Kiểm định hay dùng | Dư lượng thuốc (xuất khẩu); độ Brix khi chế biến yêu cầu |
| Hợp đồng gợi ý | Giao ngay; đặt trước khi hái; bao tiêu (chế biến); khung (nhà hàng qua đầu mối) |
| Đầu ra kém loại | Nhà máy sấy, nước ép, chợ đầu mối |
| Rủi ro đặc thù | Mưa làm nứt trái, thán thư; hái trước ngày hết cách ly thuốc (app chặn) |

### 4.2 Chanh không hạt (`CHANH_KHONG_HAT`) · cấp 1

| Trường | Giá trị v2 |
|---|---|
| Đơn vị | kg tịnh; bao lưới hoặc thùng |
| Chia loại | **L1** (xuất khẩu): đường kính 45–60 mm, vỏ xanh láng, không đốm, không ngả vàng. **L2** (chợ, nhà hàng): lệch cỡ 38–44 hoặc 61–70 mm, đốm nhẹ. **Dạt**: dưới 38 mm, ngả vàng (nước cốt, tinh dầu). **Trả lại**: thối, dập, khô vỏ |
| Dung sai lượng | ±5% |
| Lỗi cho phép | 5% |
| Hao hụt đường | 1% chuyến ≤ 24 giờ |
| Bảo quản | Nhiệt thường 7–10 ngày; 8–10°C khoảng 3 tuần |
| Mẫu đối chứng | 1 kg |
| Giấy tờ xuất khẩu | Mã số vùng trồng (khi thị trường yêu cầu), kiểm dư lượng (EU, Trung Đông theo yêu cầu bên mua) |
| Hợp đồng gợi ý | Giao ngay (vựa, xuất khẩu); **khung định kỳ** (nhà hàng, quán); bao tiêu (chế biến nước cốt) |
| Đặc điểm | Thu hoạch quanh năm, tần suất cao: mặt hàng chuẩn cho tình huống nhà hàng đặt định kỳ |

### 4.3 Tôm thẻ chân trắng (`TOM_THE`) · cấp 1

| Trường | Giá trị v2 |
|---|---|
| Dạng | `tuoi_uop_da` (mặc định v2), `song` (để sau) |
| Đơn vị | kg tịnh tại ao, trừ đá và nước theo cách hai bên ký (mặc định: để ráo 5 phút trước cân) |
| Kiểu chất lượng | **Bảng cỡ** (con/kg). Hợp đồng ghi cỡ mục tiêu, khoảng dung sai cỡ (mặc định ±3 con/kg) và **bảng giá theo khoảng cỡ** (ví dụ 48–52 con/kg giá đơn; 53–60 giá A; 61–70 giá B). Kết quả đếm mẫu rơi vào khoảng nào thì áp giá khoảng đó cho toàn bộ lượng: là **luồng thuận**, không phải tranh chấp |
| Khuyết tật | Mềm vỏ, đốm đen, cong thân, đứt đầu: tỷ lệ ≤ 5% không trừ; vượt thì phần vượt tính giá hạ cấp đã ký |
| Mẫu | Đếm 3 mẫu 1 kg ngẫu nhiên, lấy trung bình; 1 kg niêm phong |
| Dung sai lượng | ±5% (lượng ao là ước tính tới khi thu) |
| Hao hụt đường | 1% (rút nước) chuyến ≤ 12 giờ |
| Bảo quản | Ướp đá 0–4°C: 24–36 giờ phải vào nhà máy |
| Giấy tờ | Nhật ký ao (ngày thả, thuốc, ngừng thuốc); kết quả test nhanh kháng sinh trước thu (bắt buộc khi bên mua là chế biến xuất khẩu); chứng nhận ASC/BAP nếu bên mua yêu cầu |
| Kiểm định | Test nhanh kháng sinh tại ao (kiểm định viên đối tác hoặc QA bên mua), kết quả trong 2 giờ. **Dương tính thì hoãn thu, khóa lô, không cho bán gấp** (Q17) |
| Hợp đồng gợi ý | Giao ngay theo ngày thu; bao tiêu theo vụ nuôi |
| Rủi ro | Tôm chết do môi trường, cỡ lệch dự kiến, kháng sinh |

### 4.4 Lúa tươi (`LUA_TUOI`) · cấp 1

| Trường | Giá trị v2 |
|---|---|
| Giống | OM18, Đài Thơm 8, OM5451, ST25, IR50404 |
| Đơn vị | kg **quy đổi** theo độ ẩm chuẩn |
| Kiểu chất lượng | **Độ ẩm**: hợp đồng ghi độ ẩm chuẩn (mặc định 25% cho lúa tươi tại ruộng). Khối lượng quy đổi = khối lượng cân × (100 − độ ẩm đo) / (100 − độ ẩm chuẩn), làm tròn tới kg. Tạp chất cho phép ≤ 2%, vượt thì trừ phần vượt theo khối lượng. Hạt lép, xanh: ghi nhận, không trừ trừ khi hợp đồng có bảng trừ |
| Đo | Máy đo ẩm của bên mua, đo 3 mẫu lấy trung bình; 1 kg mẫu niêm phong để kiểm lại khi tranh chấp |
| Dung sai lượng | ±10% (sản lượng ruộng biến động); trong khoảng là luồng thuận |
| Hao hụt đường | Không áp (nghiệm thu tại ruộng, bên mua chịu từ lúc cân) |
| Bảo quản | Lúa tươi phải vào sấy trong 24 giờ; quá hạn dễ hấp, nóng |
| Giấy tờ | Không bắt buộc nội địa; nhà máy xuất khẩu gạo có thể yêu cầu nhật ký ruộng, giống |
| Hợp đồng gợi ý | **Cọc lúa** = đặt trước khi gặt (giá chốt cứng); giao ngay |
| Rủi ro | Bẻ kèo khi giá lên/xuống; mưa ngã đổ; tranh cãi máy đo ẩm |

### 4.5 Sầu riêng Ri6 / Monthong (`SAU_RIENG`) · cấp 2

| Trường | Giá trị v2 |
|---|---|
| Giống | Ri6, Monthong (Dona) |
| Đơn vị | kg tịnh |
| Chia loại | **A**: 2–5 kg/trái, đủ múi (≥ 4 múi đầy), không sâu, không nứt. **B**: 1,5–2 kg hoặc thiếu 1 múi. **C/kem**: dưới 1,5 kg, méo, thiếu múi (bán cơm đông lạnh, chế biến). **Trả lại**: non, sượng, sâu, thối múi |
| Độ già | Ngày từ đậu trái ghi trong lô (Ri6 khoảng 90–100 ngày, Monthong 105–120 ngày); kiểm cắt mẫu; chất khô theo yêu cầu bên mua |
| Dung sai lượng | ±5% |
| Lỗi cho phép | 3% (mặc định thấp hơn vì giá trị cao) |
| Hao hụt đường | 0,5% |
| Bảo quản | Nhiệt thường 3–5 ngày; container lạnh khoảng 15°C |
| Giấy tờ xuất khẩu Trung Quốc | Mã số vùng trồng còn hiệu lực; cơ sở đóng gói có mã; **kiểm cadimi và vàng O** tại phòng thử được chấp thuận; kiểm dịch thực vật. Thiếu một mục thì lô không ghép với nhu cầu xuất khẩu (bộ lọc cứng) |
| Kiểm định | Bắt buộc trước khi bốc với đơn xuất khẩu; kết quả 24–48 giờ |
| Hợp đồng gợi ý | Đặt trước khi hái (cọc vườn, cắt theo lứa); giao ngay |
| Rủi ro | Hái non, nhúng hóa chất, cadimi; giá trị cao nên tranh chấp lớn |
| Điều kiện mở | Có ít nhất 1 đối tác kiểm định cấu hình trong hệ thống cho vùng đó |

### 4.6 Bưởi da xanh (`BUOI_DA_XANH`) · cấp 2

| Trường | Giá trị v2 |
|---|---|
| Đơn vị | kg tịnh |
| Chia loại | **L1**: 1,2–2,2 kg/trái, vỏ xanh, không sẹo lớn. **L2**: 0,8–1,19 kg hoặc sẹo. **Dạt**: dưới 0,8 kg. **Trả lại**: thối, sâu đục, khô múi |
| Dung sai lượng | ±5% |
| Lỗi cho phép | 5% |
| Hao hụt đường | 0,5% |
| Bảo quản | Nhiệt thường 3–4 tuần; lạnh tới khoảng 2 tháng |
| Giấy tờ xuất khẩu | Theo chương trình kiểm dịch của nước nhập (ví dụ Mỹ: vùng trồng, cơ sở xử lý theo chương trình); phải do đối tác xác nhận cho từng tuyến |
| Hợp đồng gợi ý | Giao ngay, **trả sau 7 ngày** (vựa), khung (nhà hàng) |
| Điều kiện mở | Đơn xuất khẩu chỉ mở khi có đối tác kiểm định; đơn nội địa mở ngay |

### 4.7 Thanh long ruột trắng / ruột đỏ (`THANH_LONG`) · cấp 3

| Trường | Giá trị v2 |
|---|---|
| Đơn vị | kg tịnh |
| Chia loại | **L1**: ≥ 380 g (trắng) hoặc ≥ 350 g (đỏ), tai xanh, vỏ không nám. **L2**: 250–379 g hoặc nám nhẹ. **Dạt**: dưới 250 g, nám nặng (nước ép, sấy). **Trả lại**: thối, nứt, dập |
| Dung sai lượng | ±5% |
| Hao hụt đường | 1% |
| Bảo quản | Nhiệt thường 5–7 ngày; 5–8°C khoảng 3–4 tuần |
| Hợp đồng gợi ý | Giao ngay; **bao tiêu hàng kém loại**; khung (nhà hàng) |
| Mặc định ghép | L2 và dạt tự gắn "hàng cho chế biến", chỉ hiện cho bên mua đã đăng ký nhận hàng kém loại |

### 4.8 Cá tra nguyên liệu (`CA_TRA`) · cấp 3

| Trường | Giá trị v2 |
|---|---|
| Dạng | Cá sống, vận chuyển bằng ghe đục |
| Đơn vị | kg cá sống cân tại bến nhà máy hoặc tại ao (theo hợp đồng) |
| Kiểu chất lượng | **Bảng cỡ** theo kg/con: chuẩn 0,8–1,2 kg/con giá đơn; ngoài khoảng giá A. Màu thịt (trắng, hồng, vàng) theo mẫu cắt: thịt vàng vượt 10% thì phần vượt tính giá hạ cấp đã ký |
| Khuyết tật | Dị hình, xuất huyết, cá chết khi tới bến: trả lại (cá chết bên lo ghe chịu) |
| Dung sai lượng | ±10% |
| Hao hụt đường | Cá chết ≤ 1% |
| Giấy tờ | Nhật ký ao, ngừng thuốc; test kháng sinh (nhà máy làm) |
| Hợp đồng gợi ý | Bao tiêu theo vụ nuôi; giao ngay |
| Lý do cấp 3 | Chỉ một phân khúc mua (chế biến); dùng để kiểm thử bao tiêu và bảng cỡ |

## 5. Xử lý hàng kém loại theo nhóm

| Nhóm | Hàng loại dưới đi đâu | Cách app xử lý |
|---|---|---|
| Trái cây | L2: chợ, nhà hàng, vựa; L3/dạt: nhà máy sấy, nước ép, mứt, thức ăn chăn nuôi | Tách lô theo loại khi đăng; L2/L3 gợi ý tới bên mua đã đăng ký "nhận hàng kém loại"; 24 giờ không ai hỏi → gợi ý bán gấp; đối tác bao tiêu có giá sàn; kho lạnh để giữ chờ giá; phần trả lại khi nghiệm thu thành lô con loại dưới |
| Tôm, cá | Cỡ nhỏ, lệch cỡ: nhà máy khác, chợ, nhà hàng; cá thịt vàng: chế biến nội địa | Không chia "loại 2" mà áp **bảng cỡ**; lệch cỡ ngoài bảng thì tái thương lượng (đề nghị giá mới), không tự gán giá |
| Lúa | Ẩm cao, tạp chất: không phải "kém loại" mà là **quy đổi** | Áp công thức; lúa nảy mầm, hấp nóng: trả lại, người bán tự xử lý |
| Mọi nhóm | Hàng không đạt **an toàn** (dư lượng, kháng sinh, cadimi) | **Không** đưa vào bán gấp hay kênh kém loại; khóa lô; chỉ mở lại khi có kết quả kiểm mới đạt và vận hành duyệt (Q17) |

## 6. Giá tham khảo khởi đầu (dữ liệu ảo)

Bảng dưới là **giả định** để nạp dữ liệu ảo (`10`), đơn vị đ/kg. Khi hệ thống đủ đơn thật thì tự chuyển sang trung vị đơn đã chốt (`05`).

| Mặt hàng · loại | Giá tham khảo ảo | Số đơn ảo nền | Giá sàn bao tiêu (đối tác Mekong) |
|---|---|---|---|
| Xoài cát Chu L1 | 25.000 | 14 | — |
| Xoài cát Chu L2 | 15.000 | 6 | 9.000 |
| Xoài cát Chu L3/dạt | 6.000 | 4 | 5.000 |
| Chanh không hạt L1 | 14.000 | 9 | — |
| Chanh không hạt L2 | 9.000 | 5 | 6.000 |
| Tôm thẻ 48–52 con/kg | 120.000 | 7 | — |
| Lúa tươi OM18 (ẩm 25%) | 6.600 | 12 | — |
| Sầu riêng Ri6 A | 75.000 | 8 | — |
| Bưởi da xanh L1 | 32.000 | 6 | — |
| Thanh long ruột đỏ L1 | 18.000 | 5 | — |
| Thanh long ruột đỏ L2 | 9.000 | 4 | 6.000 |
| Cá tra 0,8–1,2 kg/con | 30.000 | 5 | 26.000 |
