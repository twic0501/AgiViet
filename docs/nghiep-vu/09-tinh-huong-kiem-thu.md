# 09 · Tình huống kiểm thử chéo hai bên

63 tình huống TH-001 … TH-063. Mỗi tình huống chạy trên **dữ liệu nền vừa nạp lại** (`10`, `du-lieu-ao.json`) cộng tiền điều kiện ghi trong tình huống. Đồng hồ bắt đầu `T0 = 02/11/2026 08:00 (+07)`, tua bằng đồng hồ thử. OTP thử `123456`.

Quy ước chung (theo soát bảo mật N-01, N-02, N-03): mọi sự kiện **[NH]** chỉ được ghi sau khi hệ thống tra lại API ngân hàng mô phỏng; mọi "Đã nhận [số]" của bên nhận tiền kèm OTP `money_received` (thử: `123456`) và, nếu là chuyển khoản, mã giao dịch ngân hàng; mọi ký biên bản tại chỗ qua QR kèm PIN app (thử: `2468`) hoặc OTP. Các bước dưới không nhắc lại.

Ký hiệu bên: **[B]** app bán, **[M]** app mua (kèm vai), **[NH]** ngân hàng mô phỏng, **[KD]** kiểm định mô phỏng, **[XE]** nhà xe mô phỏng, **[KHO]** kho mô phỏng, **[VH]** trang vận hành, **[HT]** hệ thống (hẹn giờ).

Mỗi kết quả mong đợi phải kiểm **trên cả hai app** (cùng số, cùng trạng thái hiển thị) và bằng API. Bất biến ở `04` mục 10 và `03` mục 1.2 phải đúng sau mọi bước.

## Mục lục

| Nhóm | Tình huống |
|---|---|
| A. Tài khoản, đăng, ghép | TH-001 … TH-005 |
| B. Luồng chính theo cách trả | TH-006 … TH-009 |
| C. Giá và chống ép, chống lách | TH-010 … TH-018 |
| D. Tiền | TH-019 … TH-026 |
| E. Giao nhận, chất lượng, lượng | TH-027 … TH-041 |
| F. Hủy | TH-042 … TH-047 |
| G. Hàng kém loại, kho, xe | TH-048 … TH-050 |
| H. Hợp đồng đặc biệt và phân khúc | TH-051 … TH-059 |
| I. Hệ thống, tài liệu, gói | TH-060 … TH-063 |

---

## A. Tài khoản, đăng, ghép

### TH-001 · Đăng ký người bán, người giúp, tài khoản nhận tiền
- **Tiền điều kiện:** xóa TC-B04 (Út Lan) khỏi dữ liệu nền để đăng ký lại.
- **Bước:**
  1. [B] Số 0939000140 → OTP 123456 → "Hộ nhà vườn" → mặt hàng xoài cát Chu (lưới ảnh) → xã Mỹ Xương → bỏ qua khai vườn.
  2. [B] Xác minh căn cước (mô phỏng so khuôn mặt **không đạt**) → chọn "Đăng ký có hỗ trợ tại chỗ".
  3. [VH] Việc V01 (P3) cho ND-302 Khoa; Khoa xác minh tại chỗ → `da_xac_minh`.
  4. [B] Thêm tài khoản nhận tiền Agribank THU-7300000001400 tên "Võ Thị Lan" → khớp tên → `pending` → sau 24 giờ (tua) → chủ bấm kích hoạt → `active`.
  5. [B] Mời người giúp 0939000141 (QR-09) với quyền "Bấm thay".
- **Mong đợi:** tài khoản ở trạng thái đã xác minh; tài khoản nhận tiền `active` sau đúng 24 giờ, không sớm hơn; người giúp có vai `nguoi_giup`; lịch sử ghi "đăng ký có hỗ trợ". Trước khi xác minh, nút "Đăng lô" hoạt động nhưng lô chỉ hiện nhãn "Chưa xác minh" và không ghép với nhu cầu xuất khẩu.

### TH-002 · Đăng ký bên mua, thành viên, hạn mức
- **Tiền điều kiện:** xóa TC-M01 khỏi dữ liệu nền.
- **Bước:**
  1. [M] ND-104 Thịnh đăng nhập 0909000213 → nhập MST 0319990001 → app tự điền "Nhà máy sấy Đồng Xanh" (mô phỏng tra MST).
  2. [M] Hỏi "Tổ chức chủ yếu mua để làm gì?" → chọn "Chế biến" → gợi ý gói Thu mua → chọn Thu mua (tháng đầu tính theo ngày: 29/30 × 1.500.000 = 1.450.000).
  3. [M] Mời Hà (mua hàng, hạn mức 50.000.000), Lan (kế toán), Phúc (kho) bằng QR-09.
  4. [M] Mời thêm 2 người nữa (tổng 6, tính cả quản lý) → người thứ 6 bị chặn: gói Thu mua tối đa 5 thành viên. Lỗi `GOI_HET_THANH_VIEN`.
- **Mong đợi:** tổ chức `da_xac_minh`; phân khúc `che_bien`; 5 thành viên; Hà ký đơn ≤ 50.000.000 không cần duyệt, đơn lớn hơn phải chờ Thịnh duyệt (kiểm ở TH-052).

### TH-003 · Đăng lô có giá kín, cảnh báo giá, chặn cách ly
- **Bước:**
  1. [B] Năm (hoặc người giúp Tèo) tạo lô xoài L1 1.000 kg, ngày hái 31/10 → **chặn**: "Vườn còn cách ly thuốc tới 01/11".
  2. Sửa ngày hái 02/11. Thước giá hiện tham khảo 25.000 (14 đơn, ĐBSCL, 30 ngày), gợi ý 23.000–27.000.
  3. Nhập giá mong muốn 24.000, giá thấp nhất kín 19.000 → cảnh báo vàng "Thấp hơn mặt bằng 24%" (19.000 < 20.000 = 80%). Không chặn.
  4. Thêm ảnh từ thư viện → ảnh gắn nhãn "ảnh tải lên"; phải có ≥ 1 ảnh chụp trong app mới đăng được.
  5. Đăng.
- **Mong đợi:** lô `dang_ban`; `P_min` 19.000 không xuất hiện trong bất kỳ API nào trả cho bên mua (kiểm bằng cách gọi API tìm nguồn với vai bên mua); sự kiện `lo.da_dang`; ghép chạy.

### TH-004 · Ghép ba nhóm, giấu giá, chiều người bán
- **Tiền điều kiện:** thêm lô L-0432 (cô Hai) xoài L1 2.000 kg đã cân, `P_min` 25.800.
- **Bước:**
  1. [M] Hà mở NC-3001 (2.000 kg L1, giá tối đa kín 24.000) → xem kết quả ghép.
  2. [B] Năm mở "Bên mua đang cần hàng của chị".
- **Mong đợi:**
  - Khớp đủ: L-0414 (Năm vườn 2, đã cân 2.000, `P_min` 22.000) xếp trên L-0412 (Năm, ước tính 4.000 → cam kết được 3.200 ≥ 2.000; `P_min` 21.500 ≤ 25.200) vì có điểm "đã cân".
  - Khớp một phần: L-0420 (Sáu, "thiếu 500 kg"), L-0430 (Út Lan, "thiếu 1.000 kg"), L-0431 (cô Hai, "thiếu 1.500 kg"); có gợi ý gom (ví dụ L-0420 + L-0430 = 2.500).
  - Gần khớp giá: L-0432 ("Cần thương lượng") vì 25.200 < 25.800 ≤ 26.400.
  - Không hiện: L-0413 (loại L2, điều kiện H2).
  - Không thẻ nào có số giá; xếp theo điểm, không theo giá.
  - App bán của Năm thấy NC-3001 và NC-3008 của Đồng Xanh (lượng, ngày, nơi nhận, 4 chỉ số uy tín bên mua), **không** thấy giá tối đa; thấy "2 bên mua đang cần xoài L1 ở Đồng Tháp tuần này" (NC-3001, NC-3008 cùng tổ chức đếm là 2 nhu cầu).

### TH-005 · Đồng ý giá, giữ lượng hết hạn
- **Bước:**
  1. [M] Hà chào L-0412: 2.000 kg × 23.000 (92% tham khảo).
  2. [B] Năm thấy "23.000 đ/kg · 92% giá tham khảo · trên giá vốn" → Đồng ý. Màn hiện "Đây chưa phải hợp đồng. Đã giữ 2.000 kg cho Đồng Xanh tới 08:00 03/11."
  3. [HT] Tua 24 giờ, bên mua không lập đơn.
- **Mong đợi:** giữ lượng `het_han`; `giu_tam` 2.000 → `kha_dung`; lời chào `da_dong_y` (khóa); không ai bị trừ uy tín; chỉ số "đồng ý rồi bỏ" của Đồng Xanh tăng 1 (EG-15).

---

## B. Luồng chính theo cách trả

### TH-006 · HĐ-2001 luồng thuận: giao tại vườn, nghiệm thu tại vườn, trả thẳng trước bốc
- **Tiền điều kiện:** từ TH-005 bước 2 (giữ lượng còn hạn).
- **Bước và mong đợi từng bước:**

| # | Bên | Thao tác | Trạng thái và số sau bước |
|---|---|---|---|
| 1 | [M] Hà | Lập đơn từ lời chào: giá hạ cấp 15.000; kiểu giao `tai_vuon`, bên mua lo xe; trả thẳng trước bốc; ngày giao 04/11 07:00; người nhận Phúc; điều khoản im lặng 2 giờ ở nơi đến | Đơn `soan_thao`; tính: `P_coc` 23.000, `C` 13.800.000, `F` 138.000, trả thẳng 32.200.000 |
| 2 | [M] Hà | Ký và gửi (OTP) — 46.000.000 ≤ hạn mức 50.000.000 nên không cần duyệt | `cho_nguoi_ban_ky`; PDF `HD` v1 sinh; hạn ký 24 giờ |
| 3 | [B] Năm | Xem 8 thẻ điều khoản, tick "Chắc chắn giao 2.000 kg ngày 04/11", ký OTP | `cho_coc`; hạn cọc **12 giờ** (xoài là hàng tươi); VietQR `AGV HD2001 COC` 13.938.000 |
| 4 | [M] Lan | Chuyển cọc qua VietQR | Chưa đổi gì (chỉ ngân hàng xác nhận mới tính) |
| 5 | [NH] | `coc_da_nhan` 13.938.000 đúng nội dung | `hieu_luc`; cọc `dang_giu` 13.800.000; phí "Đã thu · hoàn hay không tùy kết quả"; liên lạc mở (≥ 3.000.000); giữ lượng → cam kết 2.000; khoản trả thẳng 32.200.000 `den_han` |
| 6 | [M] Lan | Ghi đã trả 32.200.000 kèm ảnh ủy nhiệm chi | Khoản `bm_da_bao`; app bán hiện "Đồng Xanh báo đã chuyển 32.200.000 đ" |
| 7 | [B] Năm | "Đã nhận đủ 32.200.000 đ" | `D` = 32.200.000; câu "Cọc 13.800.000 đ vẫn ở ngân hàng; xử lý khi hai bên chốt số cân và quyết toán." |
| 8 | [M] Lan | Đặt xe đối tác Lộc Phát xe lạnh 66C-123.45 (cước 3.200.000, bên mua trả) | Chuyến `nha_xe_nhan`; thẻ chuyến QR-03 cho anh Lộc |
| 9 | [HT] | Thẻ Sẵn sàng giao đủ 6 dòng | Đợt `san_sang`; QR-02 trên máy Phúc |
| 10 | [B] Năm | 04/11 06:30 quét thẻ chuyến (khớp biển số), quét QR nhận hàng của Phúc | Đợt `dang_nghiem_thu` |
| 11 | [M] Phúc | Kết quả tại vườn: đạt 1.850, hạ cấp 120 (lý do "trầy vỏ"), trả lại 30 (lý do "dập"); 4 ảnh; niêm phong mẫu M-2291 (QR-04) | `cho_nb_xac_nhan`; trả lại 1,5% ≤ 5% nên ảnh không bắt buộc (đã có) |
| 12 | [B] Năm | Quét QR biên bản, xem, "Đồng ý kết quả" | Đợt `dang_van_chuyen`; PDF `BBNT`; lô con L-0412-T1 30 kg L2 (trả lại) tạo; sổ lượng: da_giao 1.970, da_chuyen_lo_con 30; rủi ro sang Đồng Xanh |
| 13 | [XE] | Nhật ký nhiệt độ 10–13°C; tới kho 04/11 11:00 | — |
| 14 | [M] Phúc | Ký nhận (quét thẻ chuyến), cân 1.950 | `cho_kiem_den`; hao hụt 20 kg = 1,02% ≤ 2% → ghi nhận |
| 15 | [M] Phúc | "Xác nhận đến đạt" trong 2 giờ | Đợt `da_chot`; đơn `cho_quyet_toan` |
| 16 | [HT] | Quyết toán | `V` 44.350.000; `C_nb` 12.150.000; `C_bm` 1.650.000; 2 lệnh `da_gui`; PDF `BQT` |
| 17 | [NH] | Hai lệnh thành công rồi đối soát | `hoan_tat`; phí "không hoàn"; uy tín cập nhật |

- **Mong đợi cuối:** Năm nhận 32.200.000 + 12.150.000 = 44.350.000; Đồng Xanh chi cho hàng 44.350.000, phí 138.000; tài liệu: `HD` v1, `BBNT`, `BBGN` (ký nhận nơi đến), `BQT`, 4 `CTTT` (cọc, trả thẳng, chi cọc, hoàn cọc); bảng kê 01/TNDN của Đồng Xanh có dòng 1.850 kg × 23.000 và 120 kg × 15.000. Ví của Năm: "Cọc đã về 12.150.000 (ngân hàng xác nhận)" chỉ sau bước 17.

### TH-007 · Giao tại kho bên mua, trả khi nhận, xử lý 20 kg trả lại tại kho
- **Bước:** [M] Hà chào L-0420 1.000 kg × 24.000; [B] Sáu đồng ý; đơn HĐ-2007 kiểu `tai_kho_ben_mua`, Sáu thuê xe thường 66C-678.90; trả khi nhận. Cọc 7.200.000 + phí 72.000. [NH] xác nhận. [B] Sáu xuất hàng (cân 1.000, ảnh, quét thẻ chuyến). [M] Phúc ký nhận tại kho (QR nhận hàng), nghiệm thu 980 đạt / 20 trả lại (lý do "thối", 2% ≤ 5%). [B] Sáu đồng ý. [M] Lan trả 16.320.000, [B] Sáu xác nhận. [NH] chi cọc 7.200.000.
- **Xử lý 20 kg:** [HT] việc cho Sáu, hạn 4 giờ: chọn "Ủy quyền bán gấp tại chỗ"; app báo Mekong (Cao Lãnh, ngoài 100 km tới kho TP.HCM → không báo) và Đồng Xanh (nhận L2 ≥ 500 → không đạt lượng) → không ai nhận trong 24 giờ → [VH] V20 giám sát tiêu hủy, `BBTH`.
- **Mong đợi:** `V` 23.520.000; Sáu nhận 23.520.000; `C_bm` 0; trả lại không lên quyết toán; uy tín Sáu "đúng loại" ghi 2% trả lại; lô Sáu: da_giao 980, hao_hut_loai_bo 20.

### TH-008 · Kiểm rồi mới trả, trước khi bốc (cặp mới)
- **Bước:** [M] Hà chào L-0430 (Út Lan, chưa có đơn với Đồng Xanh) 1.000 kg × 23.000 → app gợi ý "Cặp mới: chọn Kiểm rồi mới trả". [B] Út Lan đồng ý; HĐ-2008 cách trả `kiem_roi_tra_truoc_boc`; `C` 6.900.000, `F` 69.000. Tại vườn: [M] Phúc nghiệm thu 980 đạt / 20 hạ cấp → [B] Út Lan đồng ý → khoản trả thẳng đến hạn ngay = 22.840.000 − 6.900.000 = 15.940.000 → [M] Lan chuyển → [B] Út Lan "Đã nhận đủ 15.940.000 đ" → thẻ Sẵn sàng giao xanh dòng Tiền → bốc.
- **Mong đợi:** trước khi Út Lan xác nhận, không bốc được (đợt kẹt ở "Đã nghiệm thu · chờ tiền trước bốc"); rủi ro chỉ chuyển sau khi bốc; quyết toán `C_nb` 6.900.000; Út Lan nhận 22.840.000.

### TH-009 · Trả sau 7 ngày (bưởi, vựa), đúng hạn và quá hạn
- **Bước:** [M] Tư Hùng chào L-0460 3.000 kg × 30.000 (94% tham khảo) → [B] Bảy đồng ý → HĐ-2009 trả sau 7 ngày, `tai_vuon`. Màn ký của Bảy: "Anh chịu rủi ro 63.000.000 đ trong 7 ngày". Cọc 27.000.000 + phí 900.000. Nghiệm thu tại vườn 2.950 đạt / 50 hạ cấp → `V` 89.500.000 → khoản 62.500.000 hạn 7 ngày.
  - **Nhánh A:** ngày 6, [M] Tư Hùng trả 62.500.000; [B] Bảy xác nhận → chi cọc 27.000.000 → hoàn tất.
  - **Nhánh B:** không trả; [HT] nhắc 48/24/6 giờ trước hạn; quá hạn → `qua_han`; sau 72 giờ cờ `vi_pham_thanh_toan`, việc V14; [VH] Thảo lập, Trí duyệt lệnh chi cọc 27.000.000 cho Bảy; đơn `con_cong_no` "Bên mua còn phải trả 62.500.000 đ".
- **Mong đợi:** nhánh A tổng Bảy nhận 89.500.000; nhánh B Bảy nhận 27.000.000 qua ngân hàng, công nợ 62.500.000 hiện ở hai app, uy tín Tư Hùng "trả đúng hạn" giảm; không có trạng thái nào coi 62.500.000 là đã nhận.

---

## C. Giá và chống ép, chống lách

### TH-010 · Trả giá tối đa 2 lượt mỗi bên
- **Bước:** [M] Hà chào L-0412 22.000 → [B] Năm trả 24.500 → [M] Hà trả 23.000 → [B] Năm trả 23.800 → [M] Hà thử trả 23.200 → [B] Năm thử trả thêm.
- **Mong đợi:** Hà trả giá được 1 lần (lời chào đầu không tính là trả giá), lần trả giá thứ 2 (23.200) được; Năm trả 2 lần xong thì nút Trả giá ẩn, chỉ còn Đồng ý / Không bán; mỗi lượt có hạn 24 giờ.

### TH-011 · Lời chào dưới giá kín tự từ chối, không lộ số
- **Bước:** [M] Hà chào L-0412 21.000 (< `P_min` 21.500).
- **Mong đợi:** lời chào `tu_tu_choi` ngay; app mua hiện "Chưa tới mức người bán chấp nhận", không số; app bán của Năm **không** nhận thông báo; không tiêu lượt trả giá; gọi API lấy lời chào với vai bên mua không có trường nào lộ 21.500.

### TH-012 · Ngưỡng 80% và 60% khi bên mua chào
- **Bước:** [M] Hà soạn lời chào L-0413 (L2, tham khảo 15.000) giá 11.500 → cảnh báo "Thấp hơn mặt bằng 23%"; sửa 8.500 → nút Gửi bị khóa "Dưới 60% giá tham khảo, không gửi được".
- **Mong đợi:** 11.500: hiện cảnh báo, gửi được, rồi **tự từ chối** vì dưới giá thấp nhất kín 12.000 của L-0413 (như TH-011); 8.500: không gửi được; chỉ số nội bộ "tỷ lệ chào dưới 80%" của Đồng Xanh tăng 1; app bán không có nhãn "hay chào thấp".

### TH-013 · Một giá cùng loại trong cùng phiếu; giá chỉ tăng
- **Bước:** [M] Hà chào L-0420 và L-0430 cho NC-3008 cùng 22.500; thử sửa riêng L-0430 lên 23.000 → app hỏi "Nâng cho mọi hộ cùng loại trong phiếu?" → đồng ý → cả hai thành 23.000. Thử hạ lời chào L-0420 về 22.500 → chặn.
- **Mong đợi:** hai lời chào luôn cùng giá; sự kiện `loi_chao.nang_gia`; đóng NC-3008 rồi mở phiếu mới cùng mặt hàng + loại với giá tối đa thấp hơn trong 7 ngày → chặn.

### TH-014 · Chào vượt lượng
- **Bước:** NC-3001 cần 2.000 kg. [M] Hà chào L-0412 2.000, L-0420 1.500, L-0430 1.000 (tổng 4.500 > 4.000).
- **Mong đợi:** lời chào thứ ba bị chặn: "Đang chào 3.500 kg cho nhu cầu 2.000 kg (tối đa 4.000 kg)"; nếu chào 500 kg cho L-0430 thì gửi được (tổng 4.000).

### TH-015 · Giá bất thường do người bán chịu bán thấp
- **Bước:** [M] Tư Hùng chào L-0420 (Sáu) 14.000; [B] Sáu đồng ý; lập HĐ-2015.
- **Mong đợi:** đơn cờ `gia_bat_thuong`; màn ký của Sáu có thêm bước tick câu cố định; ký thiếu tick → API trả `CAN_XAC_NHAN_GIA_BAT_THUONG`; `P_coc` 17.500; `C` 5.250.000; `F` 175.000; trả thẳng 8.750.000; đạt hết → Sáu nhận 14.000.000; đơn không vào giá tham khảo (giá tham khảo xoài L1 vẫn 25.000 với 14 đơn).

### TH-016 · Cặp lặp giá bất thường
- **Tiền điều kiện:** thêm 2 đơn hoàn tất Sáu → Tư Hùng giá 14.500 và 13.800 trong 60 ngày qua (cờ bất thường).
- **Bước:** chạy TH-015 tới khi ký.
- **Mong đợi:** [VH] việc V15 (P2) cho Bảo; hướng dẫn gọi Sáu trước; Bảo ghi "cảnh cáo" → cờ trên cặp; nếu ghi "giảm hiển thị" thì lô của Sáu tụt cuối nhóm trong 30 ngày với mọi bên mua (kiểm bằng TH-004).

### TH-017 · Che liên lạc trong tin nhắn, không che số tiền
- **Bước (trước cọc HĐ-2001):** [B] Năm nhắn "số em 0918 000 421 zalo nha"; [M] Hà nhắn "chị bán 23.500đ được không"; [B] Năm nhắn "chuyển thẳng cho em stk Agribank 7300000002186 khỏi qua app".
- **Mong đợi:** tin 1: số và chữ "zalo" bị che, hiện nhắc "Liên lạc mở khi đặt cọc"; tin 2: không che, hiện nhắc "Số tiền trong tin nhắn không có giá trị. Dùng nút Chào giá."; tin 3: che số tài khoản, cảnh báo cả hai "Cọc chỉ được bảo vệ khi chuyển qua app"; bộ đếm LA-01 của Năm = 2.

### TH-018 · Liên lạc mở theo ngưỡng đơn nhỏ
- **Bước:** [M] Quán Nhà Mười chào L-0450 (Bích) 160 kg × 14.000; [B] Bích đồng ý; HĐ-2018: `G` 2.240.000; `C` 672.000; `F` 1% = 22.400; cọc xác nhận.
- **Mong đợi:** sau cọc, hai bên **không** thấy số thật, chỉ nút "Gọi qua app" (số che); đơn ≥ 3.000.000 hoặc khi cặp có 2 đơn hoàn tất thì mới hiện số.

---

## D. Tiền

### TH-019 · Trả thẳng một phần, chặn bốc, bổ sung
- **Tiền điều kiện:** TH-006 tới bước 5.
- **Bước:** [M] Lan ghi đã trả 32.200.000; [B] Năm "Nhận một phần" nhập 20.000.000; [M] Lan chuyển thêm 12.200.000; [B] Năm xác nhận 12.200.000.
- **Mong đợi:** sau xác nhận một phần: khoản `nhan_mot_phan`, "Còn thiếu 12.200.000 đ", thẻ Sẵn sàng giao đỏ dòng Tiền, thanh 5 chặng giữ ở Thanh toán (không nhảy Giao nhận); quét QR nhận hàng bị chặn `CHUA_DU_TIEN_TRUOC_BOC`; sau bổ sung → `da_nhan_du`, `D` 32.200.000, đi tiếp như TH-006.

### TH-020 · Bên mua báo đã chuyển, người bán chưa nhận, đối soát thủ công
- **Tiền điều kiện:** TH-006 tới bước 6.
- **Bước:** [B] Năm "Chưa nhận" → [HT] việc V08 → [VH] Thảo yêu cầu chứng từ; [M] Lan tải ủy nhiệm chi: tài khoản đích Agribank THU-7300000002168 (sai 2 số cuối) → Thảo kết luận "chuyển nhầm tài khoản", Trí duyệt.
- **Mong đợi:** khoản về `den_han` với ghi chú; app mua hiện "Chuyển nhầm tài khoản: chưa tính là đã trả. Chỉ chuyển vào Agribank •••• 2186 (Nguyễn Thị Năm)"; không bước nào cộng `D`; hạn cọc, hạn giao không đổi; nếu tới giờ giao vẫn chưa đủ tiền thì không bốc.

### TH-021 · Cọc sai số tiền
- **Bước:** [M] Lan chuyển 13.000.000 với nội dung `AGV HD2001 COC`.
- **Mong đợi:** [NH] `coc_da_nhan` 13.000.000 → cọc `nhan_mot_phan`, app mua "Còn thiếu 938.000 đ (cọc + phí 13.938.000)"; đơn vẫn `cho_coc`, hạn 12 giờ chạy tiếp; chuyển thêm 938.000 → `hieu_luc`. Biến thể: chuyển 14.000.000 → `hieu_luc` + lệnh `hoan_thua` 62.000 tự tạo. Biến thể: chuyển thiếu nội dung → [NH] sự kiện không khớp → việc V09/V10.

### TH-022 · Sự kiện ngân hàng lặp, sai thứ tự, thất bại
- **Tiền điều kiện:** TH-006 tới bước 16 (lệnh `chi_coc_nb` 12.150.000 và `hoan_coc_bm` 1.650.000 đã gửi).
- **Bước:** [NH] gửi `thanh_cong` cho lệnh chi 2 lần cùng mã sự kiện; gửi `that_bai` cho lệnh hoàn; [VH] tạo lệnh hoàn mới; [NH] `thanh_cong` lệnh mới; [NH] đối soát; [NH] gửi muộn một sự kiện `dang_xu_ly` cũ của lệnh chi.
- **Mong đợi:** tiền chi Năm cộng **một lần** 12.150.000; lệnh hoàn cũ `that_bai`, không cộng; lệnh mới (mã khác) thành công 1.650.000; sự kiện muộn không đảo `da_doi_soat`, ghi cảnh báo; BT-T1, BT-T7, BT-T8 đúng.

### TH-023 · Đổi tài khoản nhận tiền: người giúp bị chặn, chờ 24 giờ, lệnh cũ giữ đích (F03, F05)
- **Tiền điều kiện:** TH-022 có lệnh `chi_coc_nb` ở `dang_xu_ly`, đích Agribank THU-7300000002186.
- **Bước:**
  1. [B] Tèo (người giúp) thử "Đổi tài khoản nhận tiền" → chặn; gọi thẳng API `tai_khoan.kich_hoat` với phiên của Tèo → `KHONG_CO_QUYEN`.
  2. [B] Năm yêu cầu đổi sang Vietcombank THU-0110000009999 (OTP + câu hỏi xác minh) → `pending`; thông báo SMS tới số cũ; Đồng Xanh nhận cảnh báo.
  3. [B] Năm thử kích hoạt ngay → chặn "Còn 23 giờ 59 phút".
  4. [HT] Tua 24 giờ; [B] Tèo thử kích hoạt → chặn; [B] Năm kích hoạt → `active`.
  5. Mở lại lệnh `chi_coc_nb` cũ ở cả hai app và trang vận hành.
- **Mong đợi:** lệnh cũ vẫn hiện Agribank •••• 2186; khoản trả thẳng mới (đơn sau) phát VietQR tới tài khoản mới; màn VietQR của Đồng Xanh có cảnh báo vàng "Tài khoản nhận tiền của người bán vừa đổi ngày …"; nhánh "Không phải tôi": Năm bấm trong 24 giờ → khóa ngay, việc V05 P0.

### TH-024 · Trả lại nhiều, người bán phải hoàn ngoài app
- **Tiền điều kiện:** TH-006 tới bước 10.
- **Bước:** [M] Phúc nghiệm thu 1.200 / 100 / 700 (bắt buộc ảnh vì 35% > 5%) → [B] Năm thấy cảnh báo EL-06 "Tỷ lệ hạ cấp/trả lại cao hơn thường lệ của bên mua" → Năm "Đồng ý kết quả".
- **Mong đợi:** `V` 29.100.000; `C_bm` 13.800.000; `T_nb` 3.100.000; đơn `con_cong_no` "Chị còn phải hoàn 3.100.000 đ"; [B] Năm "Đã hoàn 3.100.000 đ" → [M] Lan "Đã nhận lại 3.100.000 đ" → `hoan_tat`; Năm thực nhận 29.100.000; 700 kg thành lô con L-0412-T1 (L2) ở lại vườn; phí 138.000 không hoàn.

### TH-025 · Trả lại toàn bộ
- **Bước:** như TH-024 với 0 / 0 / 2.000.
- **Mong đợi:** `V` 0; `C_bm` 13.800.000; `T_nb` 32.200.000; không bốc gì; lô con 2.000 kg; khi Lan xác nhận nhận lại 32.200.000 → `hoan_tat` giá trị 0; uy tín Năm "đúng loại" giảm mạnh, trừ khi Năm phản đối và kiểm định kết luận khác (xem TH-032).

### TH-026 · Mã giao dịch trùng khi xác nhận trả thẳng
- **Bước:** HĐ-2001 trả thẳng hai lần 16.100.000 (Lan chia đôi). [B] Năm xác nhận lần 1 kèm mã giao dịch `FT2611040001`; xác nhận lần 2 nhập lại cùng mã → chặn `MA_GIAO_DICH_TRUNG`; nhập mã `FT2611040002` → nhận.
- **Mong đợi:** `D` 32.200.000 sau hai xác nhận khác mã; không cộng trùng (BT-T3).

---

## E. Giao nhận, chất lượng, lượng

### TH-027 · Phản đối dòng tại vườn, người bán rút phần tranh chấp
- **Tiền điều kiện:** TH-006 tới bước 11.
- **Bước:** [B] Năm "Có phần không đúng" ở dòng hạ cấp 120 kg → chọn "Không bán phần này, giữ lại" → [M] Phúc gửi lại kết quả 1.850 / 0 / 30 + 120 "người bán rút" → [B] Năm đồng ý.
- **Mong đợi:** bốc 1.850; không áp phạt thiếu lượng (rút phần tranh chấp); `V` 42.550.000; `C_nb` 10.350.000; `C_bm` 3.450.000; lô con: 120 kg (L2, chủ Năm) và 30 kg (trả lại); phí không đổi (Q05).

### TH-028 · Hư do đường và hao hụt vượt mức (rủi ro bên mua)
- **Tiền điều kiện:** TH-006 tới bước 13; [XE] mô phỏng sai nhiệt 2 giờ (18°C).
- **Bước:** [M] Phúc cân tại kho 1.900 (hao hụt 70 kg = 3,55% > 2%); ghi 60 kg dập do nóng (giống mẫu đối chứng).
- **Mong đợi:** tạo `su_co_van_chuyen` "hao hụt vượt mức 30 kg, sai nhiệt"; biên bản giao nhận có nhật ký nhiệt độ; **tiền Năm không đổi**: `V` 44.350.000; app mua gợi ý "Đòi nhà xe Lộc Phát theo biên bản"; uy tín Năm không bị trừ.

### TH-029 · Khiếu nại khác mẫu ở kho, kiểm định, hai kết quả
- **Tiền điều kiện:** TH-006 tới bước 14.
- **Bước:** [M] Phúc trong 2 giờ: "Khác mẫu lúc bốc" 100 kg, ảnh cắt trái, mở túi mẫu M-2291 (quét QR-04); ứng phí kiểm định 280.000. [HT] chi tạm. [KD] Lâm lấy mẫu (quét QR-04 cả hai túi), trả kết quả.
- **Mong đợi:** chi tạm `C_nb_tam` 9.570.000 (đã giữ thêm 280.000 phí kiểm định bên mua ứng, N-08), giữ 4.230.000; trạng thái "Đã chốt phần không tranh chấp · đang xử lý phần còn lại" ở hai app.
  - Kết quả A (người bán sai): không chi thêm; `C_bm` 4.230.000 (gồm bù phí kiểm định); `T_nb` 0; Năm thực nhận 41.770.000; không phát sinh nợ ngoài app.
  - Kết quả B (người bán đúng): chi thêm 2.580.000 cho Năm (tổng 12.150.000); `C_bm` 1.650.000; Đồng Xanh chịu 280.000; uy tín Đồng Xanh "hạ loại không căn cứ" +1.

### TH-030 · Phản đối đúng dòng ở kho, cân lại, chi phần không tranh chấp
- **Tiền điều kiện:** TH-007 tới khi Phúc nghiệm thu.
- **Bước:** [M] Phúc gửi 900 đạt / 80 hạ cấp / 20 trả lại. [B] Sáu phản đối dòng hạ cấp. [HT] tính `V_kt` = 22.800.000 (80 kg tính giá hạ cấp). [M] Lan trả khoản khi nhận 15.600.000; [B] Sáu xác nhận; [HT] chi tạm cọc 7.200.000. [M] Phúc cân lại trong 24 giờ: 40 kg thực ra đạt → gửi 940 / 40 / 20. [B] Sáu đồng ý.
- **Mong đợi:** `V` 23.160.000; `T_bm` 360.000 → Lan trả, Sáu xác nhận → hoàn tất; Sáu thực nhận 23.160.000; hai dòng đạt và trả lại chốt ngay từ đầu (không chờ dòng hạ cấp).

### TH-031 · Kiểm định không kết luận, quá 14 ngày
- **Tiền điều kiện:** TH-029, [KD] trả `khong_ket_luan` (mẫu hỏng).
- **Bước:** [HT] tua 14 ngày, hai bên không thỏa thuận.
- **Mong đợi:** tranh chấp `chuyen_co_che_khac`; 4.230.000 vẫn giữ ở ngân hàng; [VH] xuất hồ sơ (PDF các biên bản, ảnh, kết quả kiểm); không bên nào bị kết luận sai; đơn không hoàn tất; nhánh thỏa thuận: hai bên cùng bấm chia 50/50 phần 100 kg → `V` = 42.050.000 + 50 × 23.000 = 43.200.000; phí kiểm định 280.000 chia đôi nên `X_nb` = 140.000, `N` = 43.060.000 → `C_nb` cuối 10.860.000: chi thêm 1.290.000 cho Năm, hoàn 2.940.000 cho Đồng Xanh (kiểm: 9.570.000 + 1.290.000 + 2.940.000 = 13.800.000); không có khoản ngoài app.

### TH-032 · Ép loại tại vườn, kiểm định viên tại chỗ nói đạt
- **Tiền điều kiện:** TH-006 tới bước 10.
- **Bước:** [M] Phúc gửi 1.200 / 100 / 700. [B] Năm phản đối dòng trả lại → chọn "Gọi kiểm định viên" (Năm ứng 280.000). [KD] Lâm kiểm tại vườn: 650 kg trong 700 đạt. [M] Phúc gửi lại 1.850 / 100 / 50. [B] Năm đồng ý.
- **Mong đợi:** `V` = 1.850 × 23.000 + 100 × 15.000 = 44.050.000; `X_bm` 280.000 → `N` 44.330.000; `C_nb` 12.130.000; `C_bm` 1.670.000; Năm nhận 44.330.000 (gồm hoàn phí kiểm định); uy tín Đồng Xanh "hạ loại không căn cứ" +1; nếu đây là lần thứ 2 trong 90 ngày → cờ EL-07 "đơn sau bắt buộc kiểm tại điểm".

### TH-033 · Hạn kiểm ở nơi đến: gia hạn đúng hạn, im lặng = đạt (F02)
- **Tiền điều kiện:** TH-006 tới bước 14, ký nhận lúc 04/11 14:00 (sửa giờ trong tiền điều kiện).
- **Bước:** 15:30 [M] Phúc "Chưa kiểm được" (lý do "thiếu cân sàn") → 16:00 thử "Chưa kiểm được" lần 2 → [HT] tua tới 17:31.
- **Mong đợi:** sau lần 1 hạn kiểm đến = 17:30 (15:30 + 2 giờ), các hạn khác (hạn quyết toán, hạn công nợ) không đổi; lần 2 bị chặn; 17:30 hết hạn với điều khoản im lặng → đợt `da_chot` "coi như không khiếu nại khác mẫu". Biến thể không có điều khoản: 17:30 tạo việc P2; 18:00 [VH] gia hạn → hạn mới 20:00 (> giờ xử lý).

### TH-034 · Người bán không xác nhận số cân (nghiệm thu tại kho)
- **Tiền điều kiện:** TH-007 tới khi Phúc gửi kết quả.
- **Bước:** [HT] tua 8, 16, 22, 24 giờ; Sáu không bấm. [VH] V07: Vy gọi 2 lần không được. Tua 72 giờ. Vy đề xuất, Tâm duyệt "chốt theo biên bản".
- **Mong đợi:** nhắc đúng 3 lần; sau 24 giờ việc P2; không chi cọc trước khi chốt; sau 72 giờ kết quả `chot` với lý do; lịch sử đơn ở app bán ghi dòng quyết định vận hành; Sáu còn mở tranh chấp được tới +7 ngày.

### TH-035 · QR nhận hàng và thẻ chuyến sai
- **Bước:** [B] Năm quét QR nhận hàng của một đơn khác → `QR_KHONG_DUNG_DOT`; quét QR đã hết hạn (ảnh chụp từ hôm trước) → `QR_HET_HAN`; nhập mã 6 số sai 3 lần → khóa 15 phút; quét thẻ chuyến của xe 66C-678.90 thay vì 66C-123.45 → cảnh báo "Xe không khớp hợp đồng"; người nhận là Lan (kế toán, không được chỉ định) mở màn ký nhận → chặn.
- **Mong đợi:** không bước nào mở nghiệm thu; ghi nhật ký từng lần quét sai; Đồng Xanh đổi người nhận trước giờ giao → Năm được báo.

### TH-036 · Xe bên mua trễ quá 24 giờ
- **Tiền điều kiện:** TH-006 tới bước 9; giờ hẹn 04/11 07:00.
- **Bước:** 09:00 [B] Năm "Đã sẵn hàng" kèm ảnh; [HT] tua tới 05/11 07:01; [B] Năm "Hủy, giữ cọc".
- **Mong đợi:** đơn `da_dong` (`ben_mua_khong_nhan`); cọc 13.800.000 chi Năm; Năm hoàn 32.200.000 trả thẳng (nghĩa vụ `T_nb`, Lan xác nhận); phí 138.000 không hoàn; lượng 2.000 về khả dụng; app gợi ý bán gấp; uy tín Đồng Xanh ghi "không nhận hàng".

### TH-037 · Giao trong dung sai và giao vượt
- **Bước:** (a) [M] Phúc cân tại vườn 1.960, đạt hết; (b) cân 2.100, Phúc "Nhận phần vượt 100 kg", đạt hết.
- **Mong đợi:** (a) `V` 45.080.000, `C_nb` 12.880.000, `C_bm` 920.000, không phạt; (b) `V` 48.300.000, `C_nb` 13.800.000, `T_bm` 2.300.000 hạn 24 giờ, Năm nhận tổng 48.300.000. Biến thể (b) "Không nhận phần vượt": 100 kg ở lại, như TH-006 với 2.000 kg đạt (`V` 46.000.000, `C_nb` 13.800.000, `C_bm` 0).

### TH-038 · Giao thiếu, không báo trước
- **Bước:** [M] Phúc cân 1.850, đạt hết. [B] Năm chọn "Kết thúc phần thiếu"; [M] Hà đồng ý.
- **Mong đợi:** phạt 100% cọc phần thiếu = 1.035.000; `N` 41.515.000; `C_nb` 9.315.000; `C_bm` 4.485.000; phí hoàn 10.350; uy tín Năm "giao đủ" giảm. Biến thể đã gửi đề nghị giảm lượng 5 ngày trước (Hà không đồng ý): phạt 10% = 103.500 → `C_nb` 10.246.500, `C_bm` 3.553.500.

### TH-039 · Giao bù 150 kg (F04)
- **Bước:** [M] Phúc cân 1.850; [B] Năm chọn "Giao bù" 150 kg ngày 07/11; [M] Hà đồng ý (phụ lục, hai bên ký). Đợt 1 chốt. [HT] tua 07/11; đợt 2 nghiệm thu 150 đạt.
- **Mong đợi:** sau đợt 1: đơn vẫn `hieu_luc`, **không** quyết toán, hiện "Đợt 2/2 · 150 kg · 07/11"; sổ lượng: cam kết còn 150; khoản trả thẳng đợt 2 = 0; sau đợt 2: `V` 46.000.000, `C_nb` 13.800.000; không phạt; uy tín ghi "giao trễ có đồng ý". Biến thể đợt 2 không giao tới hạn → áp TH-038.

### TH-040 · Bất khả kháng giảm lượng
- **Bước:** 03/11 [B] Năm gửi đề nghị giảm còn 1.500 kg, lý do "mưa đá", ảnh + xác nhận HTX Mỹ Xương. (a) [M] Hà đồng ý. (b) Hà im lặng 24 giờ → [VH] V13 Vy chấp nhận bằng chứng.
- **Mong đợi:** phụ lục 2 (`PL`), hai bên ký (nhánh b: quyết định VH thay chữ ký bên mua cho mục này, ký số mô phỏng); lệnh hoàn cọc chênh 3.450.000; phí hoàn 34.500; trả thẳng trước bốc 24.150.000; không phạt, không trừ uy tín; app mua gợi ý nguồn bù 500 kg (L-0420 Sáu).

### TH-041 · Sổ lượng sau hoàn tất và giữ đồng thời (F01)
- **Tiền điều kiện:** L-0412 cập nhật "đã cân 4.000"; HĐ-2001 hoàn tất như TH-006.
- **Bước:**
  1. [M] Hà chào 1.000 kg cho L-0412 → [B] Năm đồng ý (giữ lượng cho HĐ-2002).
  2. [M] Hà rút đơn HĐ-2002 trước khi ký (lượng về lô).
  3. Hai phiên khác nhau: Tư Hùng và Mekong mỗi bên chào L-0412 1.500 kg cùng giá; [B] Năm bấm Đồng ý cả hai lời chào gần như cùng lúc (hai yêu cầu cách nhau < 100 ms).
- **Mong đợi:** sau HĐ-2001: khả dụng 2.000, đã giao 1.970, đã chuyển lô con 30 (tổng 4.000), **không** trừ lần hai; bước 1: giữ thành công, khả dụng 1.000; bước 2: khả dụng về 2.000; bước 3: đúng một lời chào `da_dong_y` (giữ 1.500), lời chào kia lỗi `KHONG_DU_LUONG` "Chỉ còn 500 kg"; không ngăn nào âm; tổng ngăn luôn = 4.000.

---

## F. Hủy

### TH-042 · Hủy trước khi người bán ký
- **Bước:** (a) [M] Hà rút đơn ở `cho_nguoi_ban_ky`; (b) đơn khác: Năm không ký, tua 24 giờ.
- **Mong đợi:** (a) `da_dong` (`huy_truoc_coc`), giữ lượng về lô, không tiền; (b) `da_dong` (`qua_han_ky`), không ai bị ghi uy tín.

### TH-043 · Quá hạn cọc hàng tươi
- **Bước:** Năm ký HĐ-2001 lúc 10:00; Lan không chuyển; tua tới 22:01.
- **Mong đợi:** `da_dong` (`qua_han_coc`) lúc 22:00 (12 giờ); 2.000 kg về khả dụng; nhắc trước 6 giờ đã gửi (16:00); phí không thu.

### TH-044 · Bên mua xin hủy sau cọc
- **Tiền điều kiện:** TH-006 tới bước 5.
- **Bước:** [M] Hà "Xin hủy" (lý do "giá thị trường giảm") → màn ảnh hưởng ghi: hàng về lô, cọc 13.800.000 về chị Năm, phí 138.000 không hoàn, chưa có trả thẳng → [B] Năm "Đồng ý hủy".
- **Mong đợi:** lệnh chi cọc 13.800.000 cho Năm; `BBHUY`; đơn `da_dong` (`huy_sau_coc`) sau khi lệnh đối soát; uy tín Đồng Xanh "hủy sau cọc" +1. Biến thể: Năm im lặng 24 giờ → `bi_tu_choi`, đơn tiếp tục.

### TH-045 · Người bán xin hủy sau cọc
- **Bước:** [B] Năm "Xin hủy" (Tèo bấm thử → chặn) → [M] Hà đồng ý.
- **Mong đợi:** cọc 13.800.000 hoàn Đồng Xanh; phí 138.000 hoàn (lệnh `hoan_phi`); uy tín Năm "không hủy sau cọc" giảm; lượng về lô.

### TH-046 · Hủy do bất khả kháng sau khi đã trả thẳng
- **Tiền điều kiện:** TH-006 tới bước 7.
- **Bước:** 03/11 lũ cắt đường; [B] Năm xin hủy lý do bất khả kháng + ảnh; [M] Hà đồng ý và tick "bất khả kháng".
- **Mong đợi:** cọc 13.800.000 hoàn Đồng Xanh; phí hoàn đủ; `T_nb` 32.200.000 Năm hoàn, Lan xác nhận; ròng hai bên 0; không ai bị trừ uy tín.

### TH-047 · Lệnh đang chạy, phát hiện nhập nhầm kết quả
- **Tiền điều kiện:** TH-006 tới bước 16 (lệnh chi 12.150.000 và hoàn 1.650.000 `dang_xu_ly`).
- **Bước:** [M] Phúc phát hiện nhập nhầm: hạ cấp thực là 20 kg, đạt 1.950 → gửi "Yêu cầu điều chỉnh kết quả" → [B] Năm đồng ý.
- **Mong đợi:** hai lệnh **không** bị hủy (vẫn chạy tới thành công); bản ghi điều chỉnh tham chiếu kết quả cũ; `V` mới = 1.950 × 23.000 + 20 × 15.000 = 45.150.000; chênh +800.000 thành `T_bm` (Lan trả thẳng, Năm xác nhận); `BBNT` phiên bản 2 với mã băm bản 1 trong chuỗi; `BQT` phiên bản 2.

---

## G. Hàng kém loại, kho, xe

### TH-048 · Tách loại, bán gấp, sàn bao tiêu, lời chào bao tiêu
- **Bước:**
  1. [B] Hồng tách L-0490: L1 3.800 (L-0491), L2 1.200 (L-0492). L2 tự gắn "hàng cho chế biến".
  2. [HT] Tua 24 giờ, không ai hỏi L-0492 → việc cần làm "Bật bán gấp?" + "Mekong nhận 6.000 đ/kg tại Cao Lãnh".
  3. [B] Hồng bật bán gấp với giá thấp nhất 5.500 → chặn (dưới sàn 6.000); sửa 6.200 → bật.
  4. [M] Mekong nhận thông báo "Thanh long L2 1.200 kg cách 38 km" (không chữ "bán gấp"); Tư Hùng (không đăng ký kém loại) không nhận thông báo nhưng vẫn tìm thấy lô ở đầu kết quả nếu tìm L2.
  5. [M] Tư Hùng chào 5.800 → tự từ chối. [M] Mekong chào 6.500 → [B] Hồng đồng ý → HĐ-2048 tại kho Mekong.
- **Mong đợi:** app mua thấy "giao được trong 48 giờ"; HĐ-2048: `G` 7.800.000; `P_coc` 6.500 (70% × 9.000 = 6.300); `C` 2.340.000; `F` 23.400. Biến thể không ai chào trong 3 ngày: Hồng bấm "Nhận lời chào bao tiêu 6.000" → đơn với Mekong `G` 7.200.000.

### TH-049 · Kho lạnh thuê giữ chờ giá
- **Bước:** [B] Hồng chọn "Gửi kho lạnh" L-0492 → [KHO] báo giá 300 đ/kg/ngày → Hồng chấp thuận 3 ngày → nhập kho (quét QR lô, cân 1.200, 6°C) → 3 ngày sau bán cho Mekong → [KHO] xuất 1.190 kg cho người nhận của Mekong (quét QR nhận hàng của đơn mới).
- **Mong đợi:** phí kho 1.080.000 Hồng trả (ghi nhận); hao hụt 10 kg ≤ 18 kg cho phép; quyền xuất kho chuyển sang Mekong theo đơn; người không có QR đơn không xuất được.

### TH-050 · Ghép chuyến hai đơn, tem kiện
- **Tiền điều kiện:** HĐ-2001 (Năm, bốc 1.970) và HĐ-2050 (Út Lan → Đồng Xanh 530 kg) cùng ngày, cùng xe lạnh 66C-123.45.
- **Bước:** [M] Lan đặt một chuyến cho hai đợt; tại mỗi vườn dán tem kiện QR-01 theo đơn; tới kho, Phúc ký nhận từng đợt.
- **Mong đợi:** cước 3.200.000 phân bổ theo kg: HĐ-2001 2.521.600; HĐ-2050 678.400; hư hỏng ở kho truy đúng đơn theo tem; mỗi đợt có `BBGN` riêng cùng mã chuyến.

---

## H. Hợp đồng đặc biệt và phân khúc

### TH-051 · Đơn nhóm 200 kg, một người rớt trong pha gom
- **Bước:** [M] Tư Hùng tạo ĐN-2007 từ NC-3007 (chỉ nhận khi đủ, chốt nhóm 03/11 18:00, điểm gom ĐG-01) → mời Năm 100, Sáu 60, cô Hai 40 → ba người ký phần mình → [B] cô Hai "Xin rút phần của tôi" → app gợi ý Út Lan 40 kg → [M] Tư Hùng mời → [B] Út Lan ký → 18:00 đủ 200.
- **Mong đợi:** cô Hai không bị ghi; ba đơn con sang `cho_coc` cùng lúc; cọc 690.000 / 414.000 / 276.000; phí nhóm 34.500 (11.500 / 13.800 / 9.200); thanh "đã gom 200/200 kg". Biến thể không tìm được người thay tới 18:00: đóng nhóm, các đơn con `da_dong`, không phạt.

### TH-052 · Lô gộp HTX, duyệt nội bộ bên mua
- **Bước:** [B] HTX Mỹ Xương (Hòa) tạo lô gộp 5.000 kg từ 4 hộ (L-0414 của Năm 2.000, Sáu 1.500, Út Lan 1.000, cô Hai 500); [M] Hà chào 23.500 → Hòa đồng ý → Hà lập đơn 117.500.000 > hạn mức 50.000.000 → `cho_duyet_noi_bo` → Thịnh duyệt → ký. Cọc 35.250.000, phí 352.500; trả thẳng 82.250.000 (Mai xác nhận). Nghiệm thu tại điểm gom theo tem hộ.
- **Mong đợi:** số như `04` mục 7.21: `V` 116.605.000; `C_nb` 34.355.000; `C_bm` 895.000; bảng phân bổ: Năm 45.936.000, Sáu 34.800.000, Út Lan 22.775.000, cô Hai 11.600.000; mỗi hộ chỉ thấy dòng mình; Đồng Xanh thấy "4 hộ · Mỹ Xương", không thấy tên hộ; Hà không tự duyệt được đơn của mình; hạn người bán ký vẫn chạy khi chờ duyệt.

### TH-053 · Hợp đồng khung nhà hàng vượt mức
- **Bước:** [M] Bếp Sen (Sen) mở KH-2003 → "Gọi thêm 10 kg xoài cho thứ 5".
- **Mong đợi:** bốn số: mức được phép 2.660.000; đang dùng 2.580.000; còn 80.000; yêu cầu 260.000 → "Vượt 180.000 đ. Chờ bổ sung cọc khung hoặc HTX cho nợ thêm"; lần thứ 5 đã chốt vẫn giao. [B] Hòa (ban điều hành) "Cho nợ thêm 200.000" → mức 2.860.000 → gọi thêm chốt được (đang dùng 2.840.000). Mai (kế toán HTX) bấm "Cho nợ thêm" → chặn (không phải ban điều hành).

### TH-054 · Quán nhỏ đặt định kỳ lô nhỏ qua đầu mối, đổi món, tiền mặt
- **Bước:** KH-2006. Thứ 3 [B] Tư Hùng giao 430.000 (Mười ký nhận tại cửa). Thứ 6 06:00 [B] Tư Hùng đề nghị thay 15 kg xoài L2 bằng xoài L1 22.000 → [M] Mười đồng ý dòng → giao 490.000. Thứ 7 Mười trả tiền mặt 920.000 → [B] Tư Hùng "Đã nhận 920.000 đ" + ảnh biên nhận.
- **Mong đợi:** đang dùng trước thứ 6 = 920.000 ≤ 1.060.000 → chốt được; `CTTT` tiền mặt hai bên ký; phí kỳ 9.200 (không sàn); biến thể Mười im lặng tới giờ giao → món xoài bị bỏ, chỉ giao chanh 160.000.

### TH-055 · Bao tiêu theo vụ, vật tư đối trừ, nghi bán ra ngoài
- **Bước:** BT-2005 đợt 2: [B] Năm giao 2.800 kg tại kho Mekong; nghiệm thu đạt hết; tham khảo 19.000. Đợt 3: nhật ký thu hoạch 3.200, giao 2.700, không lý do; tham khảo 22.000.
- **Mong đợi:** đợt 2: giá 18.000, tiền đợt 45.400.000 hạn 7 ngày, Mekong trả, Năm xác nhận. Đợt 3: [HT] việc V22; Vy gọi, Năm không giải thích được → áp phạt 500.000; giá 19.800; giá trị đợt 53.460.000 − 5.000.000 vật tư = 48.460.000; quyết toán vụ: cọc vụ 9.000.000 chi Năm, Mekong trả thẳng 38.960.000; Năm nhận đợt 3 tổng 47.960.000.

### TH-056 · Đặt trước khi hái, giá công thức, bổ sung cọc
- **Tiền điều kiện:** HĐ-2001 đã hoàn tất (để HĐ-2004 là mối quen, phí 0).
- **Bước:** HĐ-2004 ký với khoảng 1.800–2.200, công thức sàn 20.000 trần 26.000; cọc 10.800.000. 10/11 [B] Năm "Gửi đề nghị chốt 2.100 kg" (giá công thức hôm đó 24.000) → [M] Hà đồng ý → phụ lục → bổ sung cọc 4.320.000 (hạn 24 giờ) → [NH] xác nhận.
- **Mong đợi:** phí 0 (mối quen Thu mua); `G` 50.400.000; cọc 15.120.000; trả thẳng trước bốc 35.280.000; thẻ Sẵn sàng giao có dòng "Bổ sung cọc 4.320.000" tới khi ngân hàng xác nhận; nếu giá tham khảo hôm chốt là 27.000 thì giá áp trần 26.000.

### TH-057 · Xuất khẩu 6 nguồn, giấy tờ, một nguồn rớt cadimi, nguồn bù
- **Bước:** [M] Quân (Sông Tiền) từ NC-3003 chọn gợi ý gom 6 nguồn (Tư, Nga, Phát, Hậu, Kim, Toàn) × 3.000 kg × 72.000 → đơn nhóm; mỗi đơn con: cọc 64.800.000, phí 432.000. Kiểm định trước bốc bắt buộc (phí 1.500.000/mẫu, Sông Tiền ứng). [KD] nguồn của anh Tư (L-0440) cadimi vượt ngưỡng; 5 nguồn còn lại đạt.
- **Mong đợi:** lô Tư `khoa_an_toan`, không bán gấp, không vào kênh kém loại; đơn con của Tư `da_dong` (`nguoi_ban_khong_giao`): cọc 64.800.000 hoàn, phí 432.000 hoàn, Tư hoàn 1.500.000 phí kiểm định, không phạt cọc; 5 nguồn còn lại `san_sang` khi đã trả thẳng 151.200.000 mỗi nguồn; gợi ý nguồn bù Sơn (L-0447, mã vùng MVT-DT-0620) → đơn mới cùng giá → kiểm định đạt mới tính vào "đã gom" (thanh 15.000 → 18.000/18.000); nguồn có mã vùng `tu_khai` không xuất hiện trong gợi ý (H4).

### TH-058 · Tôm theo bảng cỡ; biến thể kháng sinh dương tính
- **Bước:** HĐ-2058 Lực → Cửu Long Xanh 1.500 kg cỡ 48–52 × 118.000; cọc 53.100.000, phí 354.000. 05/11 [KD] test kháng sinh tại ao âm tính. [M] Hạnh đếm 3 mẫu: 57, 58, 59 → trung bình 58 → khoảng 53–60 giá 105.000; cân 1.480. [B] Lực đồng ý. [M] trả 102.300.000 tại ao; [B] Lực xác nhận.
- **Mong đợi:** `V` 155.400.000; `C_nb` 53.100.000; không mở tranh chấp vì áp bảng; `BBNT` ghi số đếm từng mẫu. Biến thể: test dương tính → lô `khoa_an_toan`, đợt hoãn, việc V18 (P1). Kháng sinh thuộc trách nhiệm người bán, không phải bất khả kháng: nếu trong cửa sổ giao không có kết quả kiểm lại âm tính thì đơn đóng lý do `nguoi_ban_khong_giao`: cọc 53.100.000 hoàn bên mua, phí 354.000 hoàn, Lực hoàn phí test 450.000 (`T_nb`), không phạt cọc (như TH-057); lô không được bán gấp hay chào kênh kém loại.

### TH-059 · Lúa tươi quy đổi độ ẩm, tranh cãi máy đo
- **Bước:** HĐ-2059 Chín → Ba Thành 30.000 kg OM18, ẩm chuẩn 25%, 6.600; cọc 59.400.000; phí 1.980.000. 04/11 tại ruộng: cân xe 30.000; [M] Thành đo 3 mẫu 27,2 / 26,9 / 26,9 → trung bình 27,0%. [B] Chín phản đối dòng quy đổi (cho rằng máy đo cao) → niêm phong 1 kg mẫu (QR-04) → [KD] đo lại 27,0% → kết luận đúng. Ba Thành trả tại ruộng: 100.000.000 chuyển khoản + 33.320.000 tiền mặt (biên nhận).
- **Mong đợi:** quy đổi 29.200 kg; `V` 192.720.000; trong lúc chờ đo lại: chi tạm theo `V_kt` (mức bên mua) = 192.720.000 → khoản khi nhận 133.320.000 không phải chờ; Chín xác nhận hai khoản (chuyển khoản có mã, tiền mặt có ảnh biên nhận, `CTTT` hai bên ký); phí đo lại 200.000 do Chín yêu cầu và ứng, kết luận Chín sai nên tự chịu (không phát sinh khoản giữa hai bên); `C_nb` 59.400.000; Chín nhận tổng 192.720.000.

---

## I. Hệ thống, tài liệu, gói

### TH-060 · Mất kết nối lúc ký và lúc xác nhận tiền
- **Bước:** [B] Năm bấm "Ký bằng mã" → mạng rớt sau khi gửi → app hiện "Chưa rõ kết quả, đang kiểm lại" → có mạng → app gửi lại **cùng khóa chống lặp**. [B] Năm bấm "Đã nhận đủ 32.200.000 đ" khi máy đang ngoại tuyến.
- **Mong đợi:** server có đúng 1 chữ ký; lần gửi lại trả đúng kết quả cũ; khi ngoại tuyến nút xác nhận tiền, ký, chốt số cân bị khóa ("Cần có mạng"); nháp biên bản và ảnh vẫn lưu cục bộ và đồng bộ khi có mạng; biên bản đồng bộ muộn mang giờ chụp gốc và giờ đồng bộ.

### TH-061 · Người giúp bị chặn đúng chỗ
- **Bước:** [B] Tèo thử: ký HĐ-2001, xác nhận nhận tiền, "Đã hoàn", đồng ý hủy, đồng ý kết quả nghiệm thu, yêu cầu/kích hoạt đổi tài khoản; Tèo đăng lô, trả lời tin nhắn, chụp biên bản nháp.
- **Mong đợi:** 6 hành động đầu bị chặn ở **API** (`KHONG_CO_QUYEN`) và giao diện hiện "Chỉ chủ tài khoản làm được việc này"; 3 hành động sau thành công, lịch sử ghi "Tèo bấm thay".

### TH-062 · PDF: mã băm, phụ lục, sửa tệp
- **Bước:** từ TH-040 nhánh a (có `HD` v1 và `PL` 2). Tải `HD` v1; quét QR-06 → trang xác minh; tải lên bản gốc; sửa 1 byte trong PDF rồi tải lên; thử ký `HD` v1 sau khi `PL` 2 đã có.
- **Mong đợi:** trang xác minh `HD` v1: "Đã được thay bởi phiên bản 2 ngày 03/11", chuỗi mã băm v1 → v2; bản gốc: "Khớp bản gốc"; bản sửa: "Không khớp: tài liệu đã bị sửa"; ký bản cũ → `PHIEN_BAN_DA_DOI`; PDF có dải "DỮ LIỆU THỬ".

### TH-063 · Chuyển từ Miễn phí sang Thu mua; hết gói giữa đơn
- **Bước:** sau TH-059 (Ba Thành trả phí 1.980.000 gói Miễn phí). [M] Thành xem "Nếu dùng gói Thu mua, phí đơn này là 594.000 (tiết kiệm 1.386.000)" → nâng gói 02/11 → trả 1.450.000 (29/30 tháng). Đơn thứ hai với Chín (HĐ-2063, 20.000 kg × 6.700) → phí 0 (mối quen). Sau đó Thành hạ gói về Miễn phí khi HĐ-2063 đang `hieu_luc`.
- **Mong đợi:** HĐ-2059 giữ phí cũ (ảnh chụp chính sách lúc ký); HĐ-2063 giữ phí 0 dù đã hạ gói; đơn mới sau khi hạ gói tính 0,5% (đơn sau với Chín); sự kiện đo lường: `goi.nang` (nguồn: màn so phí), `goi.ha`; báo cáo "mức tiết kiệm tối đa" của Ba Thành = 1.386.000 trên tập đơn thực.

---

## Ma trận bao phủ yêu cầu

| Yêu cầu của người dùng | Tình huống |
|---|---|
| Luồng thuận | 006, 007, 008, 009 |
| Thiếu hàng | 038, 039, 040 |
| Giao trễ | 036, 039 |
| Giá bất thường | 015, 016 |
| Hàng kém loại | 048, 049, 007 |
| Trả lại | 024, 025, 027, 007 |
| Tranh chấp | 029, 030, 031, 032 |
| Kiểm định bên thứ ba | 029, 031, 032, 057, 058, 059 |
| Hủy từng bước | 042, 043, 044, 045, 046, 047, 036 |
| Mất kết nối | 060 |
| Thanh toán một phần | 019, 021 |
| Bao tiêu | 055, 048 |
| Gom HTX | 052, 051, 050 |
| Hợp đồng khung định kỳ | 053, 054 |
| Nhà hàng đặt định kỳ lô nhỏ | 054 |
| Xuất khẩu cần giấy tờ | 057, 058 |
| F01–F05 | 041, 033, 023, 039, 023 |
| Ép giá / khai thấp / lách / ép loại | 010–018, 024, 032 |
| QR | 006, 035, 049, 050, 062 |
| PDF | 006, 047, 052, 062 |
| Thủ công | 001, 009, 016, 020, 031, 034, 040, 055 |
| Kho, xe | 028, 036, 049, 050 |
