# 03 · Vòng đời: máy trạng thái của mọi đối tượng giao dịch

Tài liệu này để **code theo**. Mỗi đối tượng có: danh sách trạng thái, bảng chuyển trạng thái, hạn và hệ quả khi hết hạn, sự kiện phát ra.

Quy ước bảng chuyển:
- **Lệnh** là việc người dùng hoặc đối tác gửi lên (tên lệnh dạng `dong_tu`). **Hẹn giờ** là việc hệ thống tự chạy khi tới hạn (tên `het_han_...`).
- **Ai**: `NB` người bán (chủ), `NG` người giúp, `BM.<vai>` vai trong tổ chức bên mua, `NH` ngân hàng đối tác (mô phỏng), `KD` kiểm định đối tác, `VH` vận hành AgiViet, `HT` hệ thống.
- **Điều kiện**: phải đúng hết mới chuyển; sai thì trả lỗi có mã (`12` mục 6).
- **Hệ quả**: thay đổi lượng (sổ lượng của lô) và tiền (sổ tiền của đơn). Công thức tiền ở `04`.
- Mọi chuyển trạng thái ghi một dòng **lịch sử** (ai, lúc nào, từ máy nào, lệnh, khóa chống lặp, phiên bản trước và sau) và phát **sự kiện** cùng tên.

## 0. Bản đồ đối tượng

```
Lô ──< Lô con (tách loại, trả lại)
Nhu cầu ──< Lời chào >── Lô
Lời chào (đồng ý) ──> Giữ lượng ──> Đơn
Đơn ──< Phiên bản (phụ lục) ──< Chữ ký
Đơn ──< Đề nghị sửa
Đơn ──< Đợt giao ──< Chuyến
Đợt giao ──1 Kết quả nghiệm thu ──< Dòng (đạt / hạ cấp / trả lại / hư do đường)
Dòng ──0..1 Tranh chấp ──0..1 Yêu cầu kiểm định
Đơn ──1 Cọc ──< Lệnh ngân hàng
Đơn ──< Khoản trả thẳng (nghĩa vụ) ──< Xác nhận nhận tiền
Đơn ──1 Quyết toán ──< Lệnh ngân hàng (chi cọc NB, hoàn BM), Khoản NB phải hoàn
Đơn ──0..1 Yêu cầu hủy
Hợp đồng khung ──< Lần gọi hàng (mỗi lần là một Đơn con 1 đợt)
Đơn nhóm ──< Phần (mỗi phần là một Đơn)
Bao tiêu ──< Đợt (mỗi đợt là Đợt giao của cùng Đơn bao tiêu)
```

## 1. Lô (`lo`)

### 1.1 Trạng thái

| Trạng thái | Nghĩa |
|---|---|
| `nhap` | Đang soạn, chưa công khai |
| `sap_co_hang` | Hàng trên cây/ao, lượng **ước tính**; ghép được với nhu cầu đặt trước |
| `dang_ban` | Công khai, ghép được |
| `tam_an` | Quá 14 ngày không xác nhận còn hàng; không ghép |
| `het_hang` | Khả dụng = 0 và không còn giữ tạm |
| `da_dong` | Người bán đóng hoặc hết vòng đời |
| `khoa_an_toan` | Cờ (song song): không đạt chỉ tiêu an toàn; chặn ghép, bán gấp, kênh kém loại (Q17) |
| `ban_gap` | Cờ (song song), có hạn `ban_gap_den`; không lộ cho bên mua |

### 1.2 Sổ lượng của lô (sửa F01)

Mỗi kg của lô nằm đúng một ngăn. **Bất biến**: `luong_lo = kha_dung + giu_tam + cam_ket + dang_giao + da_giao + tra_lai_cho_xu_ly + da_chuyen_lo_con + hao_hut_loai_bo`.

| Sự kiện | Chuyển kg |
|---|---|
| Đồng ý giá (tạo giữ lượng) | kha_dung → giu_tam |
| Giữ lượng hết hạn / hủy | giu_tam → kha_dung |
| Đơn có hiệu lực (cọc xác nhận) | giu_tam → cam_ket |
| Đợt giao bắt đầu nghiệm thu tại điểm | cam_ket → dang_giao (lượng đợt) |
| Nghiệm thu chốt | dang_giao → da_giao (đạt + hạ cấp + hư do đường), dang_giao → tra_lai_cho_xu_ly (trả lại) |
| Trả lại thành lô con | tra_lai_cho_xu_ly → da_chuyen_lo_con (và lô con mới có lượng tương ứng) |
| Tiêu hủy có biên bản | tra_lai_cho_xu_ly → hao_hut_loai_bo |
| Đơn hủy trước giao | cam_ket → kha_dung (hoặc giu_tam → kha_dung) |
| Giảm lượng đơn (đề nghị đã đồng ý) | cam_ket → kha_dung (phần giảm) |
| Tách lô theo loại | kha_dung → da_chuyen_lo_con |
| Người bán sửa lượng ước tính | chỉ đổi `luong_lo` và `kha_dung`; không được làm `kha_dung` âm |

Lượng **ước tính** chỉ được cam kết tối đa 80% (người bán đã giao thiếu 2 lần trong 180 ngày thì phải "đã cân" mới cam kết). Mọi chuyển ngăn chạy trong một giao dịch cơ sở dữ liệu có khóa dòng lô (hai bên mua giữ cùng lúc thì chỉ một bên thành công, TH-041).

### 1.3 Bảng chuyển

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| (mới) | `tao_lo` | NB, NG | Mặt hàng cấp mở ≥ 1; nếu ngày hái < ngày hết cách ly thuốc thì chặn | `nhap` | — | `lo.tao` |
| `nhap` | `dang_lo` | NB, NG | Đủ trường tối thiểu (mặt hàng, loại, lượng, ước tính/đã cân, vị trí, ảnh ≥ 1 chụp tại chỗ, giá mong muốn, giá thấp nhất kín) | `dang_ban` hoặc `sap_co_hang` (nếu ước tính và ngày có hàng > hôm nay) | `kha_dung = luong`; tính cảnh báo giá | `lo.da_dang` |
| `dang_ban`, `sap_co_hang` | `xac_nhan_con_hang` | NB, NG | — | giữ nguyên | `xac_nhan_luc = now` | `lo.xac_nhan_con_hang` |
| `dang_ban` | `het_han_hien_thi` (14 ngày từ lần xác nhận cuối) | HT | — | `tam_an` | Không ghép mới; giữ tạm, cam kết không đổi | `lo.tam_an` |
| `tam_an` | `xac_nhan_con_hang` | NB, NG | — | `dang_ban` | — | `lo.hien_lai` |
| `dang_ban` | `sua_gia` | NB | Lần sửa trước ≥ 24 giờ (trừ khi đang bán gấp) | giữ nguyên | Không đổi giá của lời chào/đơn đã có | `lo.sua_gia` |
| `dang_ban` | `tach_lo` | NB, NG | Tổng phần tách ≤ kha_dung; mỗi phần có loại | giữ nguyên | Tạo lô con mỗi loại; kg chuyển ngăn | `lo.da_tach` |
| `dang_ban` | `bat_ban_gap` | NB | Không `khoa_an_toan`; giá thấp nhất kín ≥ giá sàn bao tiêu của mặt hàng+loại (nếu có) | giữ nguyên + cờ `ban_gap` (hạn 3 ngày) | Lô lên đầu kết quả ghép; báo người nhận hàng kém loại và đối tác bao tiêu trong bán kính | `lo.bat_ban_gap` |
| cờ `ban_gap` | `tat_ban_gap` / `het_han_ban_gap` | NB / HT | — | bỏ cờ | — | `lo.tat_ban_gap` |
| `dang_ban` (lô L2/L3/dạt hoặc lô con trả lại, hàng tươi) | `het_han_khong_ai_hoi` (24 giờ không có lời chào) | HT | — | giữ nguyên | Việc cần làm cho NB: "Bật bán gấp?" + lời chào bao tiêu nếu có | `lo.goi_y_ban_gap` |
| bất kỳ | `khoa_an_toan` | VH, KD (kết quả kiểm không đạt) | Có kết quả kiểm hoặc quyết định VH có lý do | + cờ `khoa_an_toan` | Chặn ghép mới; lời chào đang mở tự hết hiệu lực | `lo.khoa_an_toan` |
| cờ `khoa_an_toan` | `mo_khoa_an_toan` | VH (người thứ hai duyệt) | Có kết quả kiểm mới đạt | bỏ cờ | — | `lo.mo_khoa_an_toan` |
| `dang_ban` | tự động khi `kha_dung = 0` và `giu_tam = 0` | HT | — | `het_hang` | — | `lo.het_hang` |
| `het_hang` | giữ lượng hết hạn / hủy đơn trả kg về | HT | `kha_dung > 0` | `dang_ban` | — | `lo.hien_lai` |
| bất kỳ trừ khi còn `giu_tam` hoặc `cam_ket` > 0 | `dong_lo` | NB | — | `da_dong` | — | `lo.dong` |

## 2. Nhu cầu mua (`nhu_cau`)

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| (mới) | `tao_nhu_cau` | BM.mua_hang, quan_ly | Tổ chức đã xác minh MST; còn hạn mức nhu cầu của gói | `nhap` | — | `nhu_cau.tao` |
| `nhap` | `dang_nhu_cau` | BM.mua_hang | Mặt hàng, dòng loại (≥ 1), lượng, một lần/định kỳ, ngày cần, nơi nhận, giấy tờ, **giá tối đa kín** cho từng dòng | `dang_mo` | Tính dạng nhu cầu (lô một lần / cần gom / định kỳ / trước mùa); chạy ghép (`05`) | `nhu_cau.da_dang` |
| `dang_mo` | `sua_nhu_cau` | BM.mua_hang | Không đổi lời chào và đơn đã có; giá tối đa chỉ tăng | `dang_mo` | Chạy lại ghép | `nhu_cau.sua` |
| `dang_mo` | tự động khi lượng đã có đơn hiệu lực ≥ lượng cần | HT | — | `du_luong` | — | `nhu_cau.du_luong` |
| `dang_mo` | `het_han_ngay_can` | HT | Hết ngày cần | `het_han` | Lời chào đang mở của phiếu hết hiệu lực | `nhu_cau.het_han` |
| `dang_mo` | `dong_nhu_cau` | BM | — | `da_dong` | Lời chào đang mở rút; không được mở phiếu mới cùng mặt hàng + loại với giá thấp hơn trong 7 ngày | `nhu_cau.dong` |

Lượng còn thiếu của phiếu = lượng cần − Σ lượng đơn có hiệu lực từ phiếu. Phiếu 2.500 kg mua 2.000 kg thì còn thiếu 500 kg.

## 3. Lời chào (`loi_chao`)

Hai chiều: `chao_gia` (bên mua chào một lô) và `bao_gia` (người bán trả lời một nhu cầu, kín). Cùng máy trạng thái.

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| (mới) | `gui_loi_chao` | BM.mua_hang (chao_gia) / NB (bao_gia) | Lô hoặc nhu cầu đang mở; giá ≥ 60% giá tham khảo (dưới thì chặn gửi, chỉ chiều bên mua chào); tổng lượng các lời chào đang mở của phiếu ≤ 2 × lượng cần (Q12); cùng loại trong cùng phiếu phải cùng giá (K12) | `da_gui` hoặc `tu_tu_choi` | Nếu chào_gia < giá thấp nhất kín của lô → `tu_tu_choi` ngay, bên mua chỉ thấy "Chưa tới mức người bán chấp nhận" (không số); không tốn lượt trả giá | `loi_chao.gui` / `loi_chao.tu_tu_choi` |
| `da_gui` | `dong_y` | bên nhận (NB với chao_gia; BM với bao_gia) | Lô còn kha_dung ≥ lượng chào; người bán không bị khóa | `da_dong_y` | Tạo **giữ lượng** 24 giờ; lời chào khóa, không rút được | `loi_chao.dong_y` |
| `da_gui` | `tra_gia` | bên nhận | Bên đó còn lượt (tối đa 2 lần mỗi bên); giá mới trong giới hạn | `da_gui` (lượt mới, chiều ngược) | Hạn 24 giờ mới | `loi_chao.tra_gia` |
| `da_gui` | `tu_choi` | bên nhận | — | `tu_choi` | — | `loi_chao.tu_choi` |
| `da_gui` | `rut` | bên gửi | Chưa có trả lời; tối đa 2 lần rút mỗi phiếu | `da_rut` | — | `loi_chao.rut` |
| `da_gui` | `het_han_tra_loi` (24 giờ; vựa 6/12 giờ) | HT | — | `het_han` | — | `loi_chao.het_han` |
| `da_gui` | `nang_gia_nhom` | BM | Giá mới > giá cũ | `da_gui` | Mọi lời chào cùng loại trong cùng phiếu tự nâng lên giá mới | `loi_chao.nang_gia` |

Câu bắt buộc khi đồng ý giá: "Đây chưa phải hợp đồng."

## 4. Giữ lượng (`giu_luong`)

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| (mới) | do `loi_chao.dong_y` | HT | Khóa dòng lô; kha_dung ≥ lượng | `dang_giu` (hạn 24 giờ) | kha_dung → giu_tam | `giu_luong.tao` |
| `dang_giu` | `het_han_giu` | HT | Đơn chưa ở `cho_coc` trở đi | `het_han` | giu_tam → kha_dung; không ai bị ghi uy tín | `giu_luong.het_han` |
| `dang_giu` | đơn chuyển sang `cho_coc` | HT | — | `dang_giu` (gia hạn tới hết hạn cọc) | — | `giu_luong.gia_han` |
| `dang_giu` | cọc xác nhận | HT | — | `da_chuyen_cam_ket` | giu_tam → cam_ket | `giu_luong.cam_ket` |
| `dang_giu` | đơn đóng (từ chối, quá hạn ký, quá hạn cọc, hủy trước cọc) | HT | — | `da_huy` | giu_tam → kha_dung | `giu_luong.huy` |

## 5. Đơn (`don`) · cấp hợp đồng

### 5.1 Trạng thái

| Mã | Tên hiển thị (dùng đúng) | Nhóm màu |
|---|---|---|
| `soan_thao` | Đang soạn hợp đồng | Tới lượt bên mua |
| `cho_duyet_noi_bo` | Chờ quản lý duyệt | Tới lượt bên mua |
| `cho_nguoi_ban_ky` | Chờ người bán ký | Tới lượt người bán |
| `cho_coc` | Chờ cọc | Tới lượt bên mua |
| `hieu_luc` | Đã cọc · đang thực hiện (trạng thái chi tiết lấy từ đợt giao, mục 6) | theo đợt |
| `cho_quyet_toan` | Chờ quyết toán | Chờ hệ thống / ngân hàng |
| `con_cong_no` | Đã giao xong · còn công nợ | Có vấn đề |
| `hoan_tat` | Hoàn tất | Hoàn tất |
| `da_dong` | Đã đóng (kèm lý do: `tu_choi`, `qua_han_ky`, `qua_han_coc`, `huy_truoc_coc`, `huy_sau_coc`, `huy_bat_kha_khang`, `nguoi_ban_khong_giao`, `ben_mua_khong_nhan`) | Đã đóng |

**Cờ song song trên đơn** (không phải trạng thái): `co_de_nghi_mo` (chặn ký, cọc, bốc), `co_tranh_chap` (chặn hoàn tất), `dang_xin_huy`, `gia_bat_thuong` (đánh dấu vận hành), `vi_pham_thanh_toan`, `cap_moi` (đơn đầu giữa cặp).

### 5.2 Bảng chuyển

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả tiền / lượng | Hạn mới | Sự kiện |
|---|---|---|---|---|---|---|---|
| (mới) | `lap_don` (từ lời chào đã đồng ý) | BM.mua_hang | Giữ lượng còn hạn; điều khoản lấy từ lời chào (lượng, giá, ngày, cách trả, nơi giao); đủ điều khoản bắt buộc (mục 5.3) | `soan_thao` | Tính giá tính cọc, cọc, phí (`04`); lưu ảnh chụp chính sách phí | — | `don.tao` |
| `soan_thao` | `gui_duyet` | BM.mua_hang | Giá trị > hạn mức của người lập | `cho_duyet_noi_bo` | — | — (hạn ngoài vẫn chạy) | `don.gui_duyet` |
| `cho_duyet_noi_bo` | `duyet` / `tu_choi_duyet` | BM.quan_ly (khác người lập) | — | `soan_thao` (đã duyệt) / `soan_thao` (có lý do) | — | — | `don.duyet` |
| `soan_thao` | `ky_va_gui` | BM có quyền ký | Đã duyệt nếu cần; OTP đúng; ký đúng mã băm phiên bản 1 | `cho_nguoi_ban_ky` | Sinh PDF hợp đồng phiên bản 1 | Người bán ký: 24 giờ | `don.ben_mua_ky` |
| `cho_nguoi_ban_ky` | `ky` | NB (không phải NG) | Tick cam kết "chắc chắn giao [lượng] ngày [ngày]"; OTP đúng; ký đúng mã băm phiên bản hiện hành; không có đề nghị mở; nếu `gia_bat_thuong` thì đã xác nhận bước thêm | `cho_coc` | Phát hướng dẫn chuyển cọc + phí (VietQR, chụp tài khoản nhận) | Cọc: 48 giờ (hàng tươi 12 giờ) | `don.nguoi_ban_ky` |
| `cho_nguoi_ban_ky` | `tu_choi_ky` | NB | — | `da_dong` (`tu_choi`) | Giữ lượng hủy | — | `don.dong` |
| `cho_nguoi_ban_ky` | `het_han_ky` | HT | — | `da_dong` (`qua_han_ky`) | Giữ lượng hủy | — | `don.dong` |
| `soan_thao`, `cho_nguoi_ban_ky` | `rut_don` | BM | — | `da_dong` (`huy_truoc_coc`) | Giữ lượng hủy; chưa thu phí | — | `don.dong` |
| `cho_coc` | sự kiện `ngan_hang.coc_da_nhan` khớp số tiền và mã nội dung | NH + HT | Webhook đúng chữ ký **và** HT đã **tra lại API ngân hàng** theo mã giao dịch, khớp tài khoản ảo của đơn, mã nội dung, số tiền (tổng các lần nộp) = cọc + phí; ghi tài khoản nguồn (băm, che, tên) (N-01) | `hieu_luc` | Cọc vào `dang_giu`; phí ghi nhận "đã thu, hoàn hay không tùy kết quả"; giữ lượng → cam kết; **mở liên lạc** (theo ngưỡng Q11) | Tạo các hạn của đợt giao | `don.hieu_luc` |
| `cho_coc` | `ngan_hang.coc_da_nhan` lệch số (đã tra lại) | NH + HT | Thiếu hoặc thừa | `cho_coc` | Khoản thiếu nằm ở **tiền treo theo đơn** (chưa gọi là đã cọc), báo số còn thiếu; đủ số (cộng các lần) mới vào cọc; thừa thì phần thừa tạo lệnh `hoan_thua` **về tài khoản nguồn** | Hạn cọc không đổi | `coc.lech_so` |
| `da_dong` (bất kỳ lý do) | `ngan_hang.coc_da_nhan` đến muộn | NH + HT | — | giữ `da_dong` | Đơn **không** sống lại; tiền vào tiền treo, việc V09 cho VH hoàn về tài khoản nguồn | — | `coc.den_muon` |
| `cho_coc` | `het_han_coc` | HT | — | `da_dong` (`qua_han_coc`) | Giữ lượng hủy; tiền lẻ đã chuyển (nếu thiếu) hoàn đủ | — | `don.dong` |
| `cho_coc` | `huy_truoc_coc` | BM hoặc NB | — | `da_dong` (`huy_truoc_coc`) | Như trên | — | `don.dong` |
| `hieu_luc` | mọi đợt giao ở trạng thái cuối và không còn tranh chấp mở | HT | — | `cho_quyet_toan` | Chạy phép quyết toán (`04` mục 5) | — | `don.cho_quyet_toan` |
| `cho_quyet_toan` | các lệnh ngân hàng của quyết toán `da_doi_soat` và không còn khoản phải trả/phải hoàn | HT | — | `hoan_tat` | Phí chuyển "không hoàn"; uy tín cập nhật; bảng kê sinh | — | `don.hoan_tat` |
| `cho_quyet_toan` | lệnh đối soát xong nhưng còn khoản NB phải hoàn hoặc BM còn phải trả | HT | — | `con_cong_no` | — | Hạn trả khoản đó: 72 giờ | `don.con_cong_no` |
| `con_cong_no` | `xac_nhan_da_nhan_lai` (BM xác nhận khoản NB hoàn) / `xac_nhan_da_nhan` (NB xác nhận khoản BM trả thêm) | bên nhận tiền | Số khớp | `hoan_tat` khi hết công nợ | — | — | `don.hoan_tat` |
| `con_cong_no` | `het_han_cong_no` | HT | — | giữ nguyên + cờ `vi_pham_thanh_toan` | Việc thủ công P2 cho VH (`08`) | — | `don.qua_han_cong_no` |
| `hieu_luc` | yêu cầu hủy được chấp thuận (mục 11) | HT | — | `da_dong` (lý do theo hủy) sau khi mọi khoản tiền hủy xong | Theo `04` mục 8 | — | `don.dong` |

### 5.3 Điều khoản bắt buộc của hợp đồng (thiếu thì không ký được)

1. Hàng: mặt hàng, giống, dạng, **loại theo phiên bản bảng loại**, lượng, dung sai lượng.
2. Giá: giá đơn, giá hạ cấp (hoặc bảng cỡ, công thức độ ẩm), **giá tham khảo lúc ký và nguồn**, **giá tính cọc**.
3. Tiền: tỷ lệ cọc, số cọc; cách và lúc trả phần còn lại (`truoc_boc` / `kiem_roi_tra_truoc_boc` / `khi_nhan` / `sau_n_ngay`); tài khoản nhận tiền của người bán (chụp lúc ký); phí của bên mua và bảng hoàn phí.
4. Giao: nơi giao, **điểm nghiệm thu = điểm chuyển rủi ro**, ai lo xe, ai trả bốc xếp, bao bì, kiểm định (từng khoản có "ai trả"), ngày giờ giao, người nhận được chỉ định.
5. Nghiệm thu: lỗi cho phép (trả lại không cần ảnh), hao hụt đường cho phép, mẫu đối chứng, điều khoản im lặng ở nơi đến (có/không, số giờ).
6. Thiếu lượng: thang phạt Q04, bất khả kháng.
7. Tranh chấp: kiểm định bên thứ ba, bên sai chịu phí, hạn.
8. Câu bắt buộc: "Hợp đồng chỉ được app bảo vệ khi cọc qua app. Giao dịch ngoài app hai bên tự chịu."

## 6. Đợt giao (`dot_giao`)

Mỗi đơn có ≥ 1 đợt. Đơn giao ngay tạo 1 đợt bằng toàn bộ lượng. Giao bù, bao tiêu, đặt trước nhiều lứa tạo nhiều đợt.

### 6.1 Trạng thái và tên hiển thị

| Mã | Tên hiển thị | Ai đang làm |
|---|---|---|
| `cho_chuan_bi` | Đã cọc, chờ giao | NB, BM |
| `san_sang` | Sẵn sàng giao | — (đủ thẻ) |
| `dang_nghiem_thu` | Đang nghiệm thu tại [điểm] | BM.kho hoặc người nhận, NB chứng kiến |
| `cho_nb_xac_nhan` | Chờ người bán xác nhận kết quả | NB |
| `dang_van_chuyen` | Đang giao | Nhà xe |
| `da_den` | Đã tới nơi, chờ ký nhận | BM.nguoi_nhan |
| `cho_kiem_den` | Đang kiểm tại nơi đến (hao hụt, khác mẫu) | BM.kho, hạn 2 giờ |
| `tranh_chap` | Đã chốt phần không tranh chấp · đang xử lý phần còn lại | VH, KD |
| `da_chot` | Đã chốt nghiệm thu | — |
| `da_ket_thuc_phan_thieu` | Đã kết thúc phần không giao | — |
| `da_huy` | Đợt đã hủy | — |

### 6.2 Thẻ "Sẵn sàng giao" (điều kiện để `san_sang`)

Mọi dòng phải xanh, đọc từ dữ liệu (không tick tay):
1. **Hàng**: lượng đợt ≤ cam kết còn lại; lô không `khoa_an_toan`; nếu có kiểm định trước bốc thì kết quả **đạt**.
2. **Tiền**: cọc đã ngân hàng xác nhận; các khoản trả thẳng có hạn "trước bốc" đã được NB xác nhận đủ số.
3. **Người nhận**: BM đã chỉ định người nhận (vai `nguoi_nhan` hoặc `kho`) và QR nhận hàng đã phát.
4. **Xe**: nếu bên mua lo xe hoặc xe đối tác: biển số, tài xế, thẻ chuyến QR đã có.
5. **Hồ sơ**: giấy tờ bắt buộc của đơn đã đính kèm (mã vùng, nhật ký cách ly…).
6. **Không có đề nghị mở** và không có yêu cầu hủy đang chờ.

### 6.3 Bảng chuyển · nghiệm thu tại điểm giao (vườn, ao, ruộng, điểm gom)

Dùng khi `diem_nghiem_thu ∈ {tai_vuon, tai_ao, tai_ruong, tai_diem_gom}` (bên mua lo xe hoặc xe đối tác do bên mua thuê).

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| `cho_chuan_bi` | tự động khi đủ thẻ | HT | Mục 6.2 | `san_sang` | — | `dot.san_sang` |
| `san_sang` | `bat_dau_nghiem_thu` | BM.kho / nguoi_nhan tại chỗ | Quét **QR nhận hàng** của đợt (hoặc mã 6 số dự phòng) từ máy NB; nếu xe bên mua: quét **thẻ chuyến** khớp biển số; trong cửa sổ giao | `dang_nghiem_thu` | cam_ket → dang_giao | `dot.bat_dau_nghiem_thu` |
| `dang_nghiem_thu` | `gui_ket_qua` | BM.kho / nguoi_nhan | Ba dòng ≥ 0; tổng = lượng cân thực tại điểm; trả lại > lỗi cho phép thì có ảnh; mỗi dòng hạ cấp, trả lại có mã lý do; mẫu đối chứng niêm phong (QR niêm phong) | `cho_nb_xac_nhan` | Sinh **biên bản nghiệm thu nháp** | `dot.gui_ket_qua` |
| `cho_nb_xac_nhan` | `dong_y_ket_qua` | NB (tại chỗ, quét QR biên bản bằng máy mình hoặc OTP) | — | `dang_van_chuyen` (nếu nơi đến khác điểm) hoặc `da_chot` | dang_giao → da_giao (đạt + hạ cấp); dang_giao → tra_lai_cho_xu_ly (trả lại) → tạo **lô con** loại dưới cho phần trả lại; **rủi ro chuyển sang bên mua** với phần đã bốc; ký biên bản nghiệm thu (PDF) | `dot.nghiem_thu_chot` |
| `cho_nb_xac_nhan` | `phan_doi_dong` | NB | Chọn dòng và lý do | `cho_nb_xac_nhan` (dòng đó mở) | Ba lựa chọn tại chỗ: (a) **chia lại** cùng nhau (BM gửi lại kết quả); (b) **gọi kiểm định viên** (nếu đơn đã có dịch vụ hoặc đồng ý phí), dòng đó chờ, các dòng khác vẫn chốt và được bốc; (c) **người bán rút phần tranh chấp**: không bốc phần đó, tính như trả lại, không phạt thiếu lượng | `dot.phan_doi_dong` |
| `cho_nb_xac_nhan` | `het_han_xac_nhan_tai_cho` (60 phút) | HT | NB không bấm gì | giữ nguyên | Việc P1 cho VH gọi NB; **không** tự chốt | `dot.qua_han_xac_nhan` |
| `dang_van_chuyen` | `ky_nhan_tai_noi_den` | BM.nguoi_nhan / kho được chỉ định | Quét thẻ chuyến; người ký đúng người được chỉ định | `cho_kiem_den` | Bắt đầu hạn 2 giờ | `dot.ky_nhan` |
| `cho_kiem_den` | `ghi_can_noi_den` | BM.kho | Lượng cân nơi đến | `cho_kiem_den` | Tính hao hụt = lượng bốc − lượng đến; trong mức cho phép: ghi nhận; vượt: tạo **sự cố vận chuyển** (bên lo xe đòi nhà xe), không đổi tiền người bán | `dot.ghi_hao_hut` |
| `cho_kiem_den` | `khieu_nai_khac_mau` | BM.kho | Trong 2 giờ; có ảnh; mở mẫu niêm phong theo xe | `tranh_chap` | Tạo tranh chấp cho lượng khiếu nại; phần còn lại chốt | `dot.khieu_nai_khac_mau` |
| `cho_kiem_den` | `chua_kiem_duoc` | BM.kho | Lần đầu; có lý do | `cho_kiem_den` | **Chỉ hạn kiểm đến** được gia hạn: hạn mới = giờ xử lý + 2 giờ (sửa F02) | `han.gia_han` |
| `cho_kiem_den` | `xac_nhan_den_dat` | BM.kho | — | `da_chot` | — | `dot.da_chot` |
| `cho_kiem_den` | `het_han_kiem_den` | HT | Hợp đồng có điều khoản im lặng | `da_chot` | Coi như không khiếu nại khác mẫu | `dot.da_chot` |
| `cho_kiem_den` | `het_han_kiem_den` | HT | Hợp đồng **không** có điều khoản im lặng | giữ nguyên | Việc P2 cho VH mời BM xác nhận | `dot.qua_han_kiem_den` |

### 6.4 Bảng chuyển · nghiệm thu tại kho bên mua (người bán lo xe)

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| `san_sang` | `xuat_hang` | NB | Cân lúc bốc (ghi số, ảnh); niêm phong mẫu; quét thẻ chuyến | `dang_van_chuyen` | cam_ket → dang_giao; rủi ro vẫn ở người bán | `dot.xuat_hang` |
| `dang_van_chuyen` | `ky_nhan_tai_noi_den` | BM.kho / nguoi_nhan | Quét QR nhận hàng đúng đợt; người được chỉ định | `dang_nghiem_thu` | Hạn gửi kết quả: 2 giờ (giao xa có điều khoản) hoặc 12 giờ hàng tươi / 24 giờ hàng khác (giao gần) | `dot.ky_nhan` |
| `dang_nghiem_thu` | `gui_ket_qua` | BM.kho | Như 6.3; thêm dòng `hu_do_duong` không áp vì rủi ro thuộc NB | `cho_nb_xac_nhan` | — | `dot.gui_ket_qua` |
| `dang_nghiem_thu` | `chua_kiem_duoc` | BM.kho | Lần đầu | `dang_nghiem_thu` | Hạn nghiệm thu = giờ xử lý + 2 giờ | `han.gia_han` |
| `dang_nghiem_thu` | `het_han_nghiem_thu` | HT | Có điều khoản im lặng (giao xa) | `cho_nb_xac_nhan` | Kết quả = toàn bộ lượng ký nhận là **đạt** | `dot.coi_nhu_dat` |
| `dang_nghiem_thu` | `het_han_nghiem_thu` | HT | Không có điều khoản (giao gần) | giữ nguyên | Số trong biên bản xuất hàng chỉ là số tạm; việc P2 cho VH | `dot.qua_han_nghiem_thu` |
| `cho_nb_xac_nhan` | `dong_y_ket_qua` | NB | — | `da_chot` | dang_giao → da_giao / tra_lai_cho_xu_ly; phần trả lại nằm ở kho bên mua: tạo **việc xử lý hàng trả lại** (`06` mục 5) | `dot.nghiem_thu_chot` |
| `cho_nb_xac_nhan` | `phan_doi_dong` | NB | — | `tranh_chap` | Dòng khác chốt ngay | `dot.phan_doi_dong` |
| `cho_nb_xac_nhan` | `het_han_xac_nhan` (24 giờ) | HT | — | giữ nguyên | Nhắc 3 lần (8, 16, 22 giờ), gọi tự động; sau 24 giờ việc P2 cho VH đối chiếu biên bản; sau 72 giờ không liên lạc được NB, VH (2 người) chốt theo biên bản có chữ ký nhận (`08`) | `dot.qua_han_xac_nhan` |

### 6.5 Thiếu và vượt lượng tại điểm nghiệm thu

| Tình huống | Điều kiện | Xử lý |
|---|---|---|
| Trong dung sai | lượng thực trong [lượng đợt × (1 − dung sai), lượng đợt × (1 + dung sai)] và lượng thực ≤ lượng đợt | Luồng thuận; tiền theo lượng thực |
| Vượt, trong dung sai | lượng thực > lượng đợt và ≤ +dung sai | BM bấm "Nhận phần vượt" hoặc "Không nhận phần vượt" tại chỗ; nhận thì tạo khoản trả thẳng bổ sung hạn 24 giờ sau chốt; không nhận thì phần vượt ở lại NB |
| Vượt ngoài dung sai | — | Phần vượt ngoài dung sai không mua trừ khi BM gửi đề nghị tăng lượng và NB đồng ý (phụ lục) |
| Thiếu ngoài dung sai | lượng thực < lượng đợt × (1 − dung sai) | NB chọn tại chỗ, BM đồng ý: (a) **giao bù**: tạo đợt mới cho phần thiếu, có ngày, đơn chưa hoàn tất (F04); (b) **kết thúc phần thiếu**: áp thang phạt Q04 theo việc NB đã báo trước hay chưa; (c) **bất khả kháng** đã được chấp thuận trước đó: không phạt |

## 7. Kết quả nghiệm thu (`ket_qua_nghiem_thu`) và dòng

- Mỗi đợt có **một** kết quả hiện hành, có phiên bản (gửi lại thì phiên bản mới; bản cũ giữ).
- Dòng: `dat`, `ha_cap`, `tra_lai`, `hu_do_duong` (chỉ khi điểm nghiệm thu ≠ nơi đến và rủi ro thuộc BM; tính tiền như đạt), `dieu_chinh_bang` (tôm, cá: khoảng cỡ; lúa: quy đổi ẩm, tạp chất).
- Mỗi dòng có trạng thái: `de_xuat` → `chot` hoặc `tranh_chap` → `chot`.
- **Chỉ dòng `chot` sinh tiền.** Phần tranh chấp không sinh tiền tới khi chốt.

## 8. Tranh chấp (`tranh_chap`)

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả | Sự kiện |
|---|---|---|---|---|---|---|
| (mới) | `phan_doi_dong` / `khieu_nai_khac_mau` | NB / BM | Dòng chưa chốt hoặc trong 2 giờ kiểm đến | `mo` | Phần không tranh chấp được phép quyết toán từng phần (`04` mục 6) | `tranh_chap.mo` |
| `mo` | `can_lai` | BM.kho | Trong 24 giờ; ảnh mới | `cho_nb_tra_loi` | — | `tranh_chap.can_lai` |
| `cho_nb_tra_loi` | `dong_y` | NB | — | `da_ket_luan` | Dòng chốt theo số mới | `tranh_chap.ket_luan` |
| `mo`, `cho_nb_tra_loi` | `yeu_cau_kiem_dinh` | NB hoặc BM | Bên yêu cầu trả trước phí (hoặc VH ghi nợ) | `cho_kiem_dinh` | Đặt lịch KD; hạn 48 giờ | `tranh_chap.cho_kiem_dinh` |
| `mo` | `het_han_can_lai` (24 giờ không cân lại, không yêu cầu) | HT | — | `cho_kiem_dinh` | VH đặt KD (P2), phí tạm ghi cho bên mua | `tranh_chap.tu_dong_kiem_dinh` |
| `cho_kiem_dinh` | `ket_qua_kiem_dinh` | KD (qua kênh có chữ ký: webhook ký hoặc tệp ký số mô phỏng của đối tác) | Mẫu niêm phong khớp mã QR; chữ ký kênh hợp lệ (N-11) | `da_ket_luan` hoặc `khong_ket_luan` | Kết luận: dòng chốt theo KD; **bên sai chịu phí** (khoản phải trả cho bên đã ứng phí); BM sai và dòng là hạ cấp/trả lại → ghi "hạ loại không căn cứ" vào uy tín BM | `tranh_chap.ket_luan` |
| `khong_ket_luan` | `thoa_thuan_chia` | NB và BM cùng đồng ý | Số chia | `da_ket_luan` | Dòng chốt theo thỏa thuận | `tranh_chap.ket_luan` |
| `khong_ket_luan` | `kiem_dinh_lan_2` | bên muốn | Bên yêu cầu trả phí | `cho_kiem_dinh` | — | — |
| `khong_ket_luan` | `het_han_thoa_thuan` (14 ngày) | HT → VH | — | `chuyen_co_che_khac` | Phần tiền tranh chấp **tiếp tục giữ** ở ngân hàng; VH xuất hồ sơ cho hòa giải, trọng tài, tòa; không tự phân xử | `tranh_chap.chuyen_co_che` |
| `chuyen_co_che_khac` | `nhap_quyet_dinh_ben_ngoai` | VH (2 người) | Có văn bản thỏa thuận hai bên hoặc quyết định có hiệu lực | `da_ket_luan` | Dòng chốt | `tranh_chap.ket_luan` |

## 9. Tiền: cọc, khoản trả thẳng, lệnh ngân hàng

### 9.1 Cọc (`coc`)

| Từ | Sự kiện / lệnh | Ai | Sang | Ghi chú |
|---|---|---|---|---|
| `cho_chuyen` | `ngan_hang.coc_da_nhan` đủ, đã tra lại API | NH + HT | `dang_giu` | Chỉ ngân hàng làm được bước này; webhook một mình không đủ |
| `cho_chuyen` | `ngan_hang.coc_da_nhan` thiếu | NH + HT | `nhan_mot_phan` | Số đã nộp nằm ở tiền treo theo đơn; báo số còn thiếu; hạn cọc vẫn chạy; hết hạn vẫn thiếu thì hoàn đủ về tài khoản nguồn |
| `nhan_mot_phan` | bổ sung đủ | NH | `dang_giu` | — |
| `dang_giu` | quyết toán / hủy tạo lệnh | HT | `dang_xu_ly` | Lệnh ngân hàng (9.3) |
| `dang_xu_ly` | mọi lệnh `da_doi_soat` | HT | `da_xu_ly_het` | Bất biến BT-T1 tính trên **cọc C**; phí F theo dõi ở sổ phí riêng (N-13) |

Bất biến cọc: `coc_da_chi_nb + coc_da_hoan_bm + coc_dang_giu + coc_dang_trong_lenh = coc_ngan_hang_da_xac_nhan` (chỉ phần cọc C; số bên mua nộp = C + F, F tách sang sổ phí).

### 9.2 Khoản trả thẳng (`khoan_tra_thang`, một nghĩa vụ)

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả |
|---|---|---|---|---|---|
| `chua_den_han` | tới mốc (trước bốc: khi đơn hiệu lực; khi nhận: khi nghiệm thu chốt; sau N ngày: chốt + N ngày) | HT | — | `den_han` | Phát hướng dẫn trả (VietQR tới tài khoản NB **đã chụp** trong hợp đồng, nội dung mã đơn) |
| `den_han` | `bao_da_tra` | BM.ke_toan | Số tiền; chứng từ (ảnh ủy nhiệm chi hoặc biên nhận tiền mặt) | `bm_da_bao` | Hiển thị "Bên mua báo đã chuyển [số] · chờ chị kiểm tài khoản". Không cộng vào "đã nhận" |
| `den_han`, `bm_da_bao` | `xac_nhan_nhan_du [số]` | NB (không NG), trên máy của NB | Số = số còn phải trả; **OTP mục đích `money_received` gắn mã khoản và số tiền** gửi tới số của NB; chuyển khoản thì **mã giao dịch ngân hàng bắt buộc**; tiền mặt thì ảnh biên nhận hai bên ký (N-02) | `da_nhan_du` | Cộng "đã nhận"; mã giao dịch chống trùng trong đơn |
| `den_han`, `bm_da_bao` | `xac_nhan_nhan_mot_phan [số]` | NB | 0 < số < còn phải trả; OTP và mã giao dịch như dòng trên | `nhan_mot_phan` | "Còn thiếu [số]"; vẫn chặn bốc nếu là khoản trước bốc |
| `bm_da_bao` | `bao_chua_nhan` | NB | — | `lech_doi_soat` | Việc P2 cho VH (đối soát thủ công) |
| `bm_da_bao` | `het_han_xac_nhan` (48 giờ) | HT | — | `lech_doi_soat` | Nhắc 48/24/6 giờ trước; **không bao giờ coi như đã nhận** |
| `nhan_mot_phan` | báo và xác nhận phần còn lại | BM, NB | — | `da_nhan_du` | — |
| `den_han` | `het_han_tra` | HT | — | `qua_han` | Cờ đơn `vi_pham_thanh_toan` nếu > 72 giờ; ghi uy tín "trả đúng hạn" |
| `lech_doi_soat` | `ket_luan_doi_soat` | VH (người lập ≠ người duyệt) | Căn cứ chỉ là: xác nhận có OTP của bên nhận, hoặc kết quả tra soát của ngân hàng (bằng chứng hạng C). Ảnh ủy nhiệm chi, ảnh sao kê, cuộc gọi chỉ là đầu mối (N-06) | `da_nhan_du` / `nhan_mot_phan` / `den_han` | Ghi căn cứ |

Xác nhận vượt số BM đã báo: chặn (mã lỗi `TIEN_VUOT_SO_BAO`), mở đối soát.

### 9.3 Lệnh ngân hàng (`lenh_ngan_hang`)

Loại: `chi_coc_nb`, `hoan_coc_bm`, `hoan_thua`, `hoan_phi`, `chuyen_phi`. Mỗi lệnh **chụp** tài khoản đích, số tiền, căn cứ (mã quyết toán) lúc tạo; bất biến (F05). Đích **không** lấy theo tài khoản đang dùng lúc tạo lệnh: `chi_coc_nb` = tài khoản nhận tiền ghi trong **phiên bản hợp đồng hiện hành** (muốn đổi phải có phụ lục hai bên ký); mọi lệnh `hoan_*` = **tài khoản nguồn** của khoản đã nộp, lấy từ sự kiện ngân hàng, không bao giờ theo tài khoản do người dùng gõ (D-07, D-18). Trước khi gửi, lệnh chi tới tài khoản kích hoạt dưới 72 giờ và số ≥ 20.000.000 đ được giữ chờ VH gọi lại số đã xác minh. Thành công và thất bại chỉ ghi khi đã tra lại API ngân hàng; "thất bại" chỉ là cuối cùng khi tra lại xác nhận, rồi mới lập lệnh thay.

| Từ | Sự kiện | Sang | Ghi chú |
|---|---|---|---|
| `da_tao` | HT gửi (khóa chống lặp = mã lệnh) | `da_gui` | Một quyết toán chỉ gửi mỗi lệnh một lần |
| `da_gui` | NH `dang_xu_ly` | `dang_xu_ly` | — |
| `dang_xu_ly` | NH `thanh_cong` | `thanh_cong` | Chỉ lúc này mới hiện "Cọc đã về" |
| `dang_xu_ly` | NH `that_bai` | `that_bai` | Không cộng tiền; VH hoặc HT tạo **lệnh mới** (mã mới) |
| `thanh_cong` | đối soát sao kê NH khớp | `da_doi_soat` | — |
| bất kỳ | sự kiện NH lặp (cùng `ma_su_kien_nh`) | không đổi | Bỏ qua, ghi nhật ký |
| `da_doi_soat` | sự kiện NH cũ đến muộn | không đổi | Không đảo trạng thái đã đối soát; ghi cảnh báo cho VH |

Hủy lệnh đã gửi: **không được**. Nếu tiền đã đi sai, tạo **nghĩa vụ hoàn riêng** (TH-047).

## 10. Đề nghị sửa (`de_nghi`)

Áp cho: đổi ngày giao, đổi lượng (tăng/giảm), đổi giá, đổi cách chở, đổi người nhận (chỉ thông báo, không cần đồng ý), giảm lượng do bất khả kháng, giao bù.

| Từ | Lệnh / hẹn giờ | Ai | Điều kiện | Sang | Hệ quả |
|---|---|---|---|---|---|
| (mới) | `gui_de_nghi` | NB hoặc BM có quyền | Đơn chưa đóng; một mục mỗi đề nghị | `dang_mo` | Cờ đơn `co_de_nghi_mo`; chặn ký, cọc, bốc |
| `dang_mo` | `dong_y` | bên kia | — | `da_dong_y` | Tạo **phụ lục** (phiên bản mới, mã băm mới); **hai bên phải ký** phiên bản mới; nếu đơn đã có hiệu lực thì đơn vẫn hiệu lực trong lúc chờ ký, nhưng đợt giao không `san_sang` tới khi ký xong; tính lại cọc nếu lượng hoặc giá đổi (`04` mục 4) |
| `dang_mo` | `khong_dong_y` | bên kia | — | `bi_tu_choi` | Đơn giữ nguyên |
| `dang_mo` | `het_han_tra_loi` (24 giờ) | HT | — | `bi_tu_choi` | **Im lặng = không đồng ý** |
| `dang_mo` | `rut` | bên gửi | — | `da_rut` | — |

Đề nghị giảm lượng do bất khả kháng: kèm bằng chứng (ảnh, xác nhận HTX hoặc khuyến nông, thông báo thiên tai). Nếu BM không đồng ý trong 24 giờ, NB được chuyển cho VH (P2) xét bằng chứng; VH chấp nhận thì áp "bất khả kháng" (không phạt) dù BM im lặng. Đây là ngoại lệ duy nhất mà im lặng không giữ nguyên đơn.

## 11. Yêu cầu hủy (`yeu_cau_huy`)

| Giai đoạn đơn | Ai hủy được | Cần bên kia đồng ý | Tiền (chi tiết `04` mục 8) |
|---|---|---|---|
| `soan_thao`, `cho_nguoi_ban_ky` | BM rút tự do; NB từ chối ký | Không | Chưa có tiền |
| `cho_coc` | Bất kỳ bên | Không | Tiền lẻ đã chuyển hoàn đủ |
| `hieu_luc`, chưa có đợt bắt đầu nghiệm thu | Bên xin hủy | Có (24 giờ, im lặng = không đồng ý) | Cọc về **bên không xin hủy**; phí theo bảng hoàn; khoản trả thẳng đã nhận NB hoàn |
| `hieu_luc`, đã có đợt chốt | Chỉ hủy phần chưa giao | Có | Phần đã giao quyết toán bình thường; phần chưa giao như dòng trên, tính theo tỷ lệ lượng |
| Bất khả kháng (hai bên cùng xác nhận, hoặc VH chấp nhận bằng chứng) | Bất kỳ | Có hoặc VH | Cọc hoàn BM; phí hoàn đủ; trả thẳng NB hoàn |

| Từ | Lệnh / hẹn giờ | Ai | Sang | Hệ quả |
|---|---|---|---|---|
| (mới) | `xin_huy` | NB (không NG) hoặc BM có quyền | `cho_tra_loi` | Cờ `dang_xin_huy`; màn xác nhận ghi rõ: hàng đi đâu, cọc về ai, phí hoàn hay không, khoản trả thẳng xử lý ra sao |
| `cho_tra_loi` | `dong_y_huy` | bên kia | `cho_xu_ly_tien` | Tạo lệnh ngân hàng và nghĩa vụ hoàn |
| `cho_tra_loi` | `khong_dong_y` / `het_han` (24 giờ) | bên kia / HT | `bi_tu_choi` | Đơn tiếp tục; bên xin hủy có thể không thực hiện → xử lý như vi phạm (thiếu lượng / không nhận hàng) |
| `cho_xu_ly_tien` | mọi lệnh đối soát, mọi nghĩa vụ hoàn đã được bên nhận xác nhận, hàng (nếu đã giao) đã nhận lại | HT | `xong` | Đơn → `da_dong` |

## 12. Loại hợp đồng đặc biệt

### 12.1 Đặt trước khi hái (`dat_truoc`)

| Bước | Trạng thái riêng | Luật |
|---|---|---|
| Ký | như giao ngay; lượng là **khoảng** (ví dụ 1.800–2.200 kg), giá chốt cứng **hoặc** công thức "giá tham khảo L1 ngày chốt, sàn X, trần Y" | Cọc ban đầu = 30% × lượng tối thiểu × giá tính cọc (với công thức: giá sàn) |
| Theo dõi | `cho_chot_luong_gia` | NB cập nhật ảnh vườn mỗi 7 ngày (việc cần làm); bên mua xem |
| Chốt | đề nghị "Chốt [lượng] × [giá]" từ NB, BM đồng ý (hoặc ngược lại) | Lượng chốt trong khoảng; giá theo công thức tại ngày chốt; phụ lục |
| Cọc chênh | — | Cọc mới tính lại; chênh bổ sung (BM chuyển trong 24 giờ, là dòng của thẻ Sẵn sàng giao) hoặc hoàn (lệnh ngân hàng) |
| Giao | như giao ngay | — |

### 12.2 Bao tiêu theo vụ (`bao_tieu`)

- Một đơn bao tiêu nhiều đợt; mỗi đợt có lượng cam kết, ngày, giá theo công thức (sàn + chia lợi khi tham khảo cao).
- **Cọc vụ** do bên mua chuyển, giữ suốt vụ, quyết toán ở đợt cuối.
- **Vật tư ứng** (nếu có) là khoản ghi nhận riêng, đối trừ theo lịch mỗi đợt; không phải tiền qua app.
- Mỗi đợt: nghiệm thu, rồi **bên mua trả tiền đợt trong N ngày** (mặc định 7) = giá trị nghiệm thu đợt − vật tư đối trừ đợt. Không giữ tiền tới cuối vụ.
- Nhật ký thu hoạch bắt buộc; lượng giao một đợt thấp hơn 80% lượng thu hoạch nhật ký ghi mà không lý do → cờ "nghi bán ra ngoài" (P2 cho VH).

### 12.3 Hợp đồng khung (`khung`)

| Khái niệm | Định nghĩa |
|---|---|
| Lịch | Các ngày giao lặp (ví dụ thứ 2 và thứ 5), danh mục món, lượng mặc định, giá theo kỳ giá (tuần/tháng, đổi giá phải báo trước 7 ngày bằng đề nghị) |
| Cọc khung | Bên mua chuyển một lần, giữ suốt hợp đồng, ≥ giá trị một kỳ thanh toán (mặc định) |
| Cho nợ thêm | Do người bán (HTX: ban điều hành) cấp, mặc định 0 đ |
| Mức được phép | cọc khung khả dụng + cho nợ thêm |
| Đang dùng | đã giao chưa trả + đã chốt sắp giao |
| Lần gọi hàng | Mỗi lần giao là một **đơn con 1 đợt** (không cọc riêng); chốt lần gọi trước giờ giao 24 giờ; chốt được khi đang dùng sau chốt ≤ mức được phép; vượt thì "Chờ bổ sung cọc khung hoặc người bán cho nợ thêm" (dừng cam kết mới, không hủy lần đã chốt) |
| Thanh toán | Theo kỳ (tuần): BM trả tổng giá trị nghiệm thu của kỳ; NB xác nhận; cọc khung chỉ xử lý khi kết thúc hợp đồng hoặc BM vi phạm thanh toán > 72 giờ (VH duyệt chi cọc khung cho NB phần nợ) |
| Thiếu món | NB gửi đề nghị thay món hoặc bỏ món cho đúng dòng; BM đồng ý từng dòng; im lặng tới giờ giao = bỏ món |

Trạng thái hợp đồng khung: `soan_thao` → `cho_ky` → `cho_coc_khung` → `dang_chay` ↔ `cho_bo_sung_bao_dam` → `ket_thuc` (quyết toán cọc khung) / `da_dong`.

### 12.4 Đơn nhóm (`don_nhom`)

| Pha | Trạng thái | Luật |
|---|---|---|
| Gom | `pha_gom` | BM đặt tiêu chuẩn chung, tổng lượng, giá chung, giờ chốt nhóm, chọn "Chỉ nhận khi đủ tổng" hoặc "Nhận từng phần"; mời người bán (app gợi ý tổ hợp gần nhau, cùng chuẩn); mỗi người bán đồng ý phần mình = một **đơn con** ở `cho_nguoi_ban_ky`; NB rút được phần mình trong pha gom ("Xin rút phần của tôi") không bị ghi |
| Chốt nhóm | tại giờ chốt | Đủ tổng: mọi đơn con sang `cho_coc` cùng lúc. Chưa đủ + "chỉ khi đủ": đóng nhóm, mọi đơn con `da_dong`, không phạt ai. Chưa đủ + "từng phần": các đơn con đã ký đi tiếp |
| Thực hiện | `pha_thuc_hien` | Mỗi đơn con độc lập (cọc, giao, nghiệm thu, tiền); một phần hỏng không ảnh hưởng phần khác; người rớt sau cọc thì áp luật hủy/thiếu lượng của đơn con đó; app gợi ý người thay cùng giá, cùng chuẩn |
| Phí | — | Một lần trên tổng nhóm, phân bổ theo lượng (Q09) |

### 12.5 Lô gộp HTX (`lo_gop`)

- Người bán là HTX (pháp nhân). Tổ hợp tác (không pháp nhân) **không** dùng lô gộp nhận tiền chung ở v2: dùng đơn nhóm, mỗi hộ một đơn con nhận tiền trực tiếp (N-15).
- Lô gộp có các **phần đóng góp** (hộ, lượng, tem kiện QR riêng). Đơn ký giữa HTX và bên mua; bên mua thấy vùng và số hộ, không thấy danh tính hộ (trừ xuất khẩu cần truy xuất: thấy mã vùng trồng của từng phần).
- Nghiệm thu ghi **theo tem hộ** để phân bổ đúng phần đạt/hạ cấp/trả lại của từng hộ.
- Tiền vào tài khoản HTX. App lập **bảng phân bổ** (chỉ hiển thị, không tạo lệnh chi): mỗi hộ = giá trị phần mình − phí gom HTX (nếu có thỏa thuận HTX–hộ). Hộ xác nhận "HTX đã chi cho tôi [số]" hoặc "Chưa nhận"; quá 7 ngày chưa nhận → việc P3 cho VH liên hệ HTX.

## 13. Tổng hợp hạn (mặc định, chỉnh trong cài đặt)

| Hạn | Thời lượng | Khi hết hạn |
|---|---|---|
| Trả lời lời chào / trả giá | 24 giờ (vựa 6 hoặc 12 giờ) | Lời chào hết hiệu lực |
| Giữ lượng | 24 giờ (gia hạn theo hạn cọc khi đơn tới `cho_coc`) | Lượng về lô |
| Người bán ký | 24 giờ | Đơn đóng `qua_han_ky` |
| Cọc | 48 giờ; hàng tươi (thời gian sống ≤ 10 ngày) 12 giờ | Đơn đóng `qua_han_coc` |
| Trả lời đề nghị, xin hủy | 24 giờ | Không đồng ý |
| Xác nhận khoản trả thẳng sau khi BM báo | 48 giờ | Đối soát thủ công (không coi như đã nhận) |
| NB xác nhận kết quả tại điểm giao | 60 phút | Việc P1 cho VH |
| NB xác nhận kết quả (nghiệm thu tại kho) | 24 giờ | Nhắc 3 lần → P2 → sau 72 giờ VH chốt theo biên bản |
| Kiểm tại nơi đến (giao xa có điều khoản) | 2 giờ từ ký nhận, gia hạn 1 lần +2 giờ | Coi như đạt (không khiếu nại khác mẫu) |
| Gửi kết quả nghiệm thu tại kho (giao gần) | 12 giờ (tươi) / 24 giờ | P2 cho VH |
| Cân lại khi tranh chấp | 24 giờ | Tự sang kiểm định |
| Kiểm định trả kết quả | 48 giờ (sầu riêng cadimi: theo phòng thử, tối đa 5 ngày) | P2 cho VH |
| Thỏa thuận khi kiểm định không kết luận | 14 ngày | Chuyển cơ chế khác |
| Xe bên mua trễ | 4 giờ (tươi 2 giờ) không báo: NB được ghi "đã sẵn hàng"; quá 24 giờ | NB được hủy, giữ cọc; app gợi ý bán gấp |
| Bên mua trả khoản sau nhận / sau N ngày | theo hợp đồng | Quá 72 giờ: cờ vi phạm thanh toán; VH có thể chi cọc cho NB như khoản trừ nợ |
| Khoản công nợ sau quyết toán | 72 giờ | Cờ vi phạm, P2 |
| Tin lô hiển thị | 14 ngày từ lần xác nhận còn hàng | Tạm ẩn |
| Bán gấp | 3 ngày | Tắt cờ |
| Lô kém loại tươi không ai hỏi | 24 giờ | Gợi ý bán gấp |
| Đổi tài khoản nhận tiền | chờ 24 giờ (72 giờ nếu trong 7 ngày sau khôi phục tài khoản) | Mới kích hoạt được |
| Hợp đồng khung: chốt lần gọi | 24 giờ trước giờ giao | Lần gọi theo mặc định của lịch |

Nhắc trước hạn: 48, 24, 6 giờ với hạn tiền; 8, 16, 22 giờ với hạn xác nhận số cân; 1 lần lúc còn 25% thời lượng với hạn khác.

## 14. Trạng thái hiển thị của đơn (ánh xạ cho giao diện)

Giao diện hiện **một** dòng trạng thái và thanh 5 chặng (Ký · Cọc · Giao nhận · Thanh toán · Xong), tính như sau (ưu tiên từ trên xuống):

| Điều kiện dữ liệu | Tên hiển thị | Chặng đang chạy |
|---|---|---|
| `da_dong` | Đã đóng · [lý do] | — |
| `hoan_tat` | Hoàn tất | Xong |
| cờ `co_tranh_chap` | Đã chốt phần không tranh chấp · đang xử lý phần còn lại | Giao nhận |
| `con_cong_no` | Đã giao xong · còn công nợ ([ai] còn phải [trả/hoàn] [số]) | Thanh toán |
| `cho_quyet_toan`, có lệnh `da_gui`/`dang_xu_ly` | Đã gửi lệnh cọc | Thanh toán |
| `cho_quyet_toan` | Quyết toán | Thanh toán |
| `hieu_luc`, có khoản trả thẳng `den_han` chưa đủ, sau chốt | Chờ thanh toán | Thanh toán |
| `hieu_luc`, đợt đang ở `cho_nb_xac_nhan` | Chờ xác nhận số cân | Giao nhận |
| `hieu_luc`, đợt `dang_nghiem_thu` / `cho_kiem_den` | Chờ nghiệm thu | Giao nhận |
| `hieu_luc`, đợt `dang_van_chuyen` | Đang giao | Giao nhận |
| `hieu_luc`, đợt `san_sang` | Sẵn sàng giao | Giao nhận |
| `hieu_luc`, đợt `cho_chuan_bi` | Đã cọc, chờ giao | Giao nhận (hoặc Thanh toán nếu đang chờ khoản trước bốc) |
| `cho_coc` | Chờ cọc | Cọc |
| `cho_nguoi_ban_ky` | Chờ người bán ký | Ký |
| `cho_duyet_noi_bo`, `soan_thao` | Đang soạn hợp đồng (chỉ app mua) | Ký |

"Tới lượt ai" lấy từ cột Ai của chuyển trạng thái đang chờ, ghi kèm vai và người cụ thể ("Kế toán · chị Lan · chuyển cọc trước 09:30 03/11").

## 15. Danh sách sự kiện (tên chuẩn)

`lo.*`: tao, da_dang, xac_nhan_con_hang, tam_an, hien_lai, sua_gia, da_tach, bat_ban_gap, tat_ban_gap, goi_y_ban_gap, khoa_an_toan, mo_khoa_an_toan, het_hang, dong.
`nhu_cau.*`: tao, da_dang, sua, du_luong, het_han, dong.
`loi_chao.*`: gui, tu_tu_choi, dong_y, tra_gia, tu_choi, rut, het_han, nang_gia.
`giu_luong.*`: tao, het_han, gia_han, cam_ket, huy.
`don.*`: tao, gui_duyet, duyet, ben_mua_ky, nguoi_ban_ky, hieu_luc, cho_quyet_toan, con_cong_no, qua_han_cong_no, hoan_tat, dong.
`dot.*`: san_sang, bat_dau_nghiem_thu, xuat_hang, gui_ket_qua, phan_doi_dong, nghiem_thu_chot, ky_nhan, ghi_hao_hut, khieu_nai_khac_mau, coi_nhu_dat, qua_han_xac_nhan, qua_han_kiem_den, qua_han_nghiem_thu, da_chot.
`tranh_chap.*`: mo, can_lai, cho_kiem_dinh, tu_dong_kiem_dinh, ket_luan, chuyen_co_che.
`coc.*`: lech_so, dang_giu, da_xu_ly_het. `khoan.*`: den_han, bm_bao, nb_xac_nhan, lech, qua_han. `lenh.*`: da_gui, dang_xu_ly, thanh_cong, that_bai, da_doi_soat.
`de_nghi.*`: gui, dong_y, tu_choi, rut. `huy.*`: xin, dong_y, tu_choi, xong. `han.*`: tao, nhac, het, gia_han.
`tai_khoan.*`: yeu_cau_doi, kich_hoat, huy_yeu_cau, khoa. `tai_lieu.*`: sinh, ky, xac_minh. `viec.*` (hàng việc thủ công): tao, nhan, xong, qua_sla.
