# 07 · Tài liệu PDF: loại, trường, bố cục, ký, phiên bản, mã băm

## 1. Nguyên tắc

1. Mọi tài liệu sinh từ **dữ liệu có cấu trúc** trên server (không cho sửa tự do văn bản). PDF là **bản trình bày** của một bản ghi `tai_lieu` có phiên bản.
2. Mỗi phiên bản có **mã băm SHA-256** của **nội dung chuẩn hóa** (JSON chuẩn, khóa xếp thứ tự, số tiền số nguyên, thời gian ISO UTC) và mã băm của tệp PDF. Ký là ký vào mã băm nội dung chuẩn hóa.
3. **Chuỗi phiên bản**: mỗi phiên bản ghi `ma_bam_phien_ban_truoc`. Phụ lục không ghi đè; bản cũ chuyển trạng thái "đã thay bởi phiên bản N".
4. Mọi PDF trong v2 có **dải nhãn "DỮ LIỆU THỬ · không có giá trị pháp lý"** ở đầu mỗi trang và watermark chéo.
5. Chân mỗi trang: mã tài liệu, phiên bản, 16 ký tự đầu của mã băm, số trang, **QR xác minh** (QR-06).
6. Không xóa tài liệu; hủy tài liệu là chuyển trạng thái `da_huy` kèm lý do, vẫn xem và xác minh được.

## 2. Danh mục tài liệu

| Mã loại | Tên | Sinh khi | Ai ký | Phiên bản |
|---|---|---|---|---|
| `HD` | Hợp đồng mua bán có đặt cọc | Bên mua bấm "Ký và gửi" | Bên mua (người có quyền ký), người bán (chủ) | 1; tăng khi có phụ lục |
| `PL` | Phụ lục điều chỉnh hợp đồng | Đề nghị sửa được đồng ý | Hai bên | Mỗi phụ lục là một tài liệu, đồng thời nâng phiên bản hiệu lực của `HD` |
| `HDK` | Hợp đồng khung giao định kỳ | Ký khung | Hai bên | Như `HD` |
| `HDBT` | Hợp đồng bao tiêu theo vụ | Ký bao tiêu | Hai bên | Như `HD` |
| `BBGN` | Biên bản giao nhận (xuất hàng, ký nhận tại nơi đến) | Bốc xong / ký nhận | Bên giao, bên nhận (tài xế ký chứng kiến nếu có) | 1 |
| `BBNT` | Biên bản nghiệm thu 3 phần | Người bán đồng ý kết quả (hoặc chốt phần không tranh chấp) | Bên mua (người kiểm), người bán | 1 mỗi phiên bản kết quả; phiên bản sau khi tranh chấp kết luận |
| `BBKD` | Kết quả kiểm định (tệp của đối tác) + phiếu tiếp nhận | Kiểm định trả kết quả | Kiểm định đối tác (ký số mô phỏng) | 1 |
| `BBTH` | Biên bản trả hàng / tiêu hủy | Xử lý hàng trả lại ở nơi đến | Người giữ hàng, chủ hàng hoặc người chứng kiến | 1 |
| `BQT` | Bảng quyết toán | Đơn sang `cho_quyet_toan` | Hệ thống (ký số mô phỏng của AgiViet); hai bên bấm "Đã xem" | 1; phiên bản mới nếu quyết toán từng phần rồi kết luận |
| `CTTT` | Chứng từ thanh toán / biên lai | Mỗi khoản: cọc ngân hàng xác nhận, người bán xác nhận trả thẳng, lệnh chi/hoàn thành công, người bán hoàn ngoài app được xác nhận, tiền mặt | Hệ thống; với tiền mặt: hai bên | 1 |
| `BK01` | Bảng kê thu mua hàng nông sản không có hóa đơn (mẫu 01/TNDN, mô phỏng) | Bên mua xuất theo kỳ | Bên mua | 1 mỗi kỳ; kỳ đã xuất mà có điều chỉnh thì bản điều chỉnh |
| `BBHUY` | Biên bản thỏa thuận hủy | Yêu cầu hủy được đồng ý | Hai bên | 1 |
| `HDPHI` | Phiếu phí dịch vụ (không phải hóa đơn pháp định) | Phí thu / hoàn | Hệ thống | 1 |

## 3. Cách ký

| Phương thức | Dùng cho | Cơ chế v2 | Lưu |
|---|---|---|---|
| **Ký OTP** (chữ ký điện tử đơn giản) | Người bán, bên mua ký `HD`, `PL`, `HDK`, `HDBT`, `BBHUY`; ký biên bản khi ở xa | Người ký xem bản tóm tắt dạng thẻ (có nút Nghe) và toàn văn; tick cam kết; nhận OTP 6 số qua SMS mô phỏng (hạn 5 phút, tối đa 5 lần sai); server kiểm OTP, quyền, phiên bản hiện hành, không có đề nghị mở | `chu_ky`: người ký, vai, tổ chức, phương thức `otp`, số điện thoại (che), thời điểm, IP/thiết bị, **mã băm nội dung đã ký**, mã yêu cầu OTP |
| **Ký tại chỗ qua QR biên bản** | `BBNT`, `BBGN`, `BBTH` khi hai bên đứng cùng chỗ | Bên còn lại quét QR-05 bằng app **trên máy của chính mình**, xem bản, rồi **xác thực lại ngay trước khi ký bằng PIN app hoặc sinh trắc**; máy không có PIN/sinh trắc thì OTP tới số người ký. Phiên đăng nhập + quét mã **không** được coi là hai yếu tố vì cùng nằm trên một máy (N-03) | Như trên, phương thức `qr_tai_cho_pin` hoặc `qr_tai_cho_otp`, kèm vị trí GPS hai máy |
| **Ký tay trên màn** | Tài xế chứng kiến, người nhận không có tài khoản (chỉ chứng kiến, không mang quyền chấp thuận) | Nét ký lưu ảnh PNG + vị trí, giờ | Phương thức `ky_tay_chung_kien`; không thay chữ ký của bên giao dịch |
| **Ký số mô phỏng** | Hệ thống (`BQT`, `CTTT`, `HDPHI`), kiểm định đối tác (`BBKD`) | Cặp khóa thử Ed25519 (khóa của AgiViet môi trường thử; mỗi đối tác mô phỏng một khóa); chữ ký trên mã băm nội dung; khóa công khai công bố ở trang xác minh. **Ghi rõ: không phải chữ ký số công cộng do tổ chức chứng thực cấp** | Phương thức `ky_so_mo_phong`, mã khóa |

Luật:
- Người giúp không ký được bất kỳ tài liệu nào thuộc nhóm hợp đồng, phụ lục, hủy, và không ký `BBNT` thay chủ (chỉ được chụp ảnh, nhập nháp).
- Một phiên bản chỉ "có hiệu lực ký" khi **đủ chữ ký các bên bắt buộc trên cùng mã băm**. Ký trên mã băm cũ (người dùng mở màn lâu, bản đã đổi) → server từ chối, mã lỗi `PHIEN_BAN_DA_DOI`.
- Hợp đồng `HD` ký đủ chưa có nghĩa có hiệu lực bảo vệ: trạng thái pháp lý trên app chuyển "có hiệu lực" **khi ngân hàng xác nhận cọc** (K07). Trang xác minh hiển thị đúng điều này.

## 4. Trạng thái tài liệu

`nhap` → `cho_ky` → `da_ky_mot_phan` → `da_ky_du` → (`co_hieu_luc` với hợp đồng sau khi cọc) → `da_thay_the` (bởi phụ lục) / `da_ket_thuc` (đơn hoàn tất) / `da_huy`.

## 5. Trường và bố cục từng tài liệu

Bố cục chung (A4 dọc, chữ ≥ 10 pt, tiếng Việt có dấu, font nhúng hỗ trợ Unicode):
1. Dải "DỮ LIỆU THỬ".
2. Đầu: logo chữ AgiViet, tên tài liệu, mã tài liệu, phiên bản, ngày giờ sinh (giờ Việt Nam).
3. Thân theo mục dưới.
4. Khối chữ ký: từng bên, tên, vai, phương thức, thời điểm, 16 ký tự mã băm đã ký.
5. Chân: QR-06, mã băm, "Trang x/y".

### 5.1 Hợp đồng mua bán có đặt cọc (`HD`)

| Mục | Trường |
|---|---|
| Đầu | Số hợp đồng (`HĐ-2001`), phiên bản, loại hợp đồng (giao ngay / đặt trước / …), căn cứ: lời chào số, nhu cầu số |
| Các bên | Bên bán: tên, loại (hộ/HTX/tổ hợp tác), số định danh đã xác minh (che giữa), địa chỉ xã, số điện thoại (che tới khi cọc trên bản xem; bản lưu đầy đủ), tài khoản nhận tiền (ngân hàng, •••• 4 số cuối, chủ tài khoản) **chụp lúc ký**. Bên mua: tên tổ chức, MST, người đại diện ký, vai, địa chỉ nhận |
| Điều 1 · Hàng | Mặt hàng, giống, dạng, loại theo **bảng loại phiên bản [x]** (bảng loại in ở phụ lục kỹ thuật cuối hợp đồng), lượng, dung sai, lượng ước tính hay đã cân, mã lô, QR lô |
| Điều 2 · Giá | Giá đơn; giá hạ cấp (hoặc bảng cỡ, công thức ẩm); giá tham khảo lúc ký (số, số đơn, vùng, ngày); giá tính cọc |
| Điều 3 · Tiền | Giá trị hợp đồng; cọc (tỷ lệ, số); phí của bên mua (tỷ lệ, số, bảng hoàn); cách và lúc trả phần còn lại; số trả thẳng dự kiến; câu "Bên mua chỉ trả vào tài khoản ghi tại hợp đồng này"; rủi ro theo lúc trả ("Bên mua chịu rủi ro [số] cho phần trả trước khi bốc" hoặc "Bên bán chịu rủi ro [số] trong [N] ngày") |
| Điều 4 · Giao nhận | Kiểu giao; **điểm nghiệm thu = điểm chuyển rủi ro**; nơi giao (địa chỉ, tọa độ); ngày giờ; ai lo xe; bảng "ai trả": xe, bốc xếp, bao bì, kiểm định, kho |
| Điều 5 · Nghiệm thu | Lỗi cho phép; mẫu đối chứng; hao hụt đường cho phép; điều khoản im lặng (có/không, giờ); người nhận được chỉ định |
| Điều 6 · Thiếu, vượt lượng | Dung sai; thang phạt Q04; bất khả kháng: định nghĩa, bằng chứng, hạn báo |
| Điều 7 · Tranh chấp | Phản đối đúng dòng; cân lại 24 giờ; kiểm định 48 giờ; bên sai chịu phí; không kết luận: 14 ngày rồi chuyển cơ chế khác |
| Điều 8 · Hủy | Bảng hủy theo bước (cọc về ai, phí, trả thẳng) |
| Điều 9 · Hiệu lực | "Hợp đồng chỉ được app bảo vệ khi cọc qua app. Giao dịch ngoài app hai bên tự chịu." Hiệu lực từ khi ngân hàng xác nhận cọc |
| Ký | Bên mua, bên bán |
| Phụ lục kỹ thuật | Bảng loại (chỉ tiêu, ảnh mẫu thu nhỏ), danh mục lý do trả lại |

Bản trình bày trên app (trước khi ký) gồm **8 thẻ tóm tắt** tương ứng Điều 1–8, mỗi thẻ có nút Nghe; toàn văn ở màn riêng.

### 5.2 Phụ lục (`PL`)

Số phụ lục, hợp đồng gốc, phiên bản trước (mã băm), mục thay đổi dạng **"Cũ → Mới"** (chỉ mục đổi), lý do, đề nghị số, hệ quả tiền (cọc bổ sung / hoàn chênh, phí điều chỉnh), ký hai bên.

### 5.3 Biên bản giao nhận (`BBGN`)

Đơn, đợt, chuyến; bên giao, bên nhận, tài xế (tên, biển số, mã thẻ chuyến); nơi, giờ tới, giờ đi; lượng cân (tổng, bì, tịnh; số kiện); niêm phong xe số; mẫu đối chứng mã; nhiệt độ lúc bốc và lúc tới; ảnh (mã ảnh, mã băm từng ảnh, giờ, tọa độ); hao hụt (nếu ký nhận ở nơi đến); ghi chú sự cố; chữ ký.

### 5.4 Biên bản nghiệm thu 3 phần (`BBNT`)

| Mục | Trường |
|---|---|
| Đầu | Đơn, đợt, điểm nghiệm thu (tại vườn / tại kho / tại điểm gom), thời điểm, người kiểm (vai), người chứng kiến |
| Bảng kết quả | Dòng: loại kết quả (đạt / hạ cấp / trả lại / hư do đường / điều chỉnh bảng), lượng, đơn giá, thành tiền, mã lý do, số ảnh; tổng lượng = lượng cân tại điểm |
| Đo | Với tôm: số mẫu đếm, con/kg từng mẫu, trung bình, khoảng áp dụng; với lúa: ẩm từng mẫu, trung bình, tạp chất, công thức quy đổi và kết quả |
| Tranh chấp | Dòng nào đang tranh chấp, lý do, lựa chọn (chia lại, kiểm định, rút phần) |
| Tiền | Giá trị nghiệm thu đã chốt (`V_kt`), phần đang tranh chấp |
| Chuyển rủi ro | "Rủi ro với [lượng] kg đã bốc chuyển sang bên mua từ [giờ]" (giao tại vườn) |
| Hàng trả lại | Lượng, nơi đang giữ, mã lô con mới |
| Ký | Bên mua (người kiểm), người bán |

### 5.5 Bảng quyết toán (`BQT`)

| Dòng | Ví dụ HĐ-2001 |
|---|---|
| Giá trị nghiệm thu `V` | 44.350.000 |
| Trừ: khoản người bán phải trả theo hợp đồng `X_nb` | 0 |
| Cộng: khoản bên mua phải trả ngoài giá trị hàng `X_bm` | 0 |
| Người bán được nhận ròng `N` | 44.350.000 |
| Đã trả thẳng, người bán đã xác nhận `D` | 32.200.000 |
| Cọc ngân hàng giữ `C` | 13.800.000 |
| Chuyển cọc cho người bán `C_nb` | 12.150.000 |
| Hoàn cọc cho bên mua `C_bm` | 1.650.000 |
| Bên mua còn phải trả `T_bm` | 0 |
| Người bán còn phải hoàn `T_nb` | 0 |
| Kiểm tra | `C_nb + C_bm = C` · `D + C_nb + T_bm − T_nb = N` |
| Lệnh ngân hàng | Mã lệnh, loại, tài khoản đích (chụp), số tiền, trạng thái |
| Phí của bên mua (không thuộc tiền hàng) | 138.000 · trạng thái |

### 5.6 Chứng từ thanh toán / biên lai (`CTTT`)

Mã chứng từ, đơn, loại khoản (cọc, trả thẳng lần n, chi cọc, hoàn cọc, hoàn ngoài app, tiền mặt), người trả, người nhận, tài khoản (che), số tiền bằng số và chữ, nội dung chuyển khoản, nguồn xác nhận (`ngan_hang` với mã sự kiện / `nguoi_ban_xac_nhan` / `ben_mua_xac_nhan` / `hai_ben_tien_mat` kèm ảnh biên nhận), thời điểm. Với tiền mặt: chữ ký hai bên.

### 5.7 Bảng kê 01/TNDN (`BK01`, mô phỏng)

Kỳ, bên mua (tên, MST, địa chỉ), từng dòng: ngày mua, tên người bán, địa chỉ, số định danh (theo quyền), mặt hàng, lượng **nghiệm thu đã chốt** (đạt + hạ cấp tách dòng), đơn giá, thành tiền; tổng. Dòng từ đơn ngoài app ghi "tự khai". Ghi chú: "Mẫu mô phỏng, cần kế toán rà theo quy định hiện hành."

### 5.8 Biên bản thỏa thuận hủy (`BBHUY`)

Đơn, bên xin hủy, lý do (mã), thời điểm; hệ quả: hàng (về lô / đã giao xử lý ra sao), cọc về ai bao nhiêu, phí hoàn hay không bao nhiêu, khoản trả thẳng ai hoàn bao nhiêu, phạt (nếu có); ký hai bên (hoặc quyết định vận hành khi bất khả kháng, ký số mô phỏng).

## 6. Mã băm và xác minh

### 6.1 Cách tính

```
noi_dung_chuan = JSON chuẩn hóa (RFC 8785) của {loai, ma, phien_ban, du_lieu, ma_bam_phien_ban_truoc}
ma_bam_noi_dung = SHA-256(noi_dung_chuan) dạng hex
ma_bam_tep = SHA-256(bytes của tệp PDF)
```

- Ảnh đính kèm: lưu mã băm từng ảnh trong `du_lieu`, không nhúng ảnh gốc vào mã băm nội dung.
- Chữ ký (OTP hoặc số) ký trên `ma_bam_noi_dung`.
- PDF sinh lại từ cùng nội dung phải ra **cùng** `ma_bam_noi_dung`; `ma_bam_tep` có thể khác nếu đổi phiên bản bộ sinh PDF — trang xác minh kiểm cả hai: nội dung (bắt buộc), tệp (thông tin).

### 6.2 Trang xác minh (công khai, QR-06)

Nhập hoặc quét mã → hiện: loại, mã, phiên bản, ngày, các bên (tên tổ chức, tên hộ viết tắt), trạng thái, người ký và thời điểm, `ma_bam_noi_dung`, `ma_bam_tep`, chuỗi phiên bản (danh sách mã băm). Có ô **tải tệp PDF lên để so**: server tính `ma_bam_tep` và trích nội dung nhúng (PDF nhúng `noi_dung_chuan` dạng tệp đính kèm) → báo "Khớp bản gốc" hoặc "Không khớp: tài liệu đã bị sửa". Trang công khai **không bao giờ trả bản gốc** hay nội dung điều khoản, giá, số tài khoản (N-05). Tệp tải lên: tối đa 10 MB, chỉ PDF, giới hạn 10 lần/giờ mỗi địa chỉ, xử lý trong môi trường cách ly, không lưu tệp sau khi so.

### 6.3 Chống sửa

- Sửa một byte PDF → `ma_bam_tep` khác → "Không khớp" (TH-062).
- Sửa nội dung nhúng → `ma_bam_noi_dung` khác chữ ký → "Chữ ký không hợp lệ".
- Tài liệu bị thay bởi phụ lục: trang xác minh ghi "Đã được thay bởi phiên bản [n] ngày [ngày]".

## 7. Lưu trữ và quyền xem

| Tài liệu | Ai xem |
|---|---|
| `HD`, `PL`, `BBGN`, `BBNT`, `BQT`, `CTTT`, `BBHUY` | Hai bên của đơn (theo vai trong tổ chức), vận hành được phân công |
| `BK01` | Bên mua (vai kế toán, quản lý) |
| `BBKD` | Hai bên, vận hành |
| Phân bổ lô gộp | HTX; mỗi hộ chỉ thấy dòng của mình |
| Trang xác minh | Công khai, chỉ thông tin tối thiểu |

Tệp lưu ở kho đối tượng với đường dẫn ký ngắn hạn (15 phút). Thời gian lưu: ≥ 10 năm cho hợp đồng và chứng từ (tham số, cần pháp lý xác nhận).
