# 12 · Yêu cầu cho kỹ sư backend và kỹ sư giao diện

Tài liệu này tóm tắt những gì phải dựng. Chi tiết luật ở `03` (trạng thái), `04` (tiền), `05` (ghép, chống lách), `06` (kho, xe, QR), `07` (PDF), `08` (thủ công). Không thiết kế bảng SQL ở đây; kỹ sư backend tự chọn lược đồ miễn giữ đủ thực thể, quan hệ và bất biến dưới đây.

---

# Phần A · Backend

## A1. Kiến trúc tối thiểu

| Thành phần | Vai trò |
|---|---|
| API nghiệp vụ | Nhận **lệnh** (có `idempotency_key`, `expected_revision`), kiểm quyền, kiểm điều kiện, chuyển trạng thái trong một giao dịch CSDL, ghi sự kiện vào **outbox** |
| Bộ hẹn giờ | Chạy các `het_han_*` theo bảng hạn; đọc đồng hồ hệ thống (môi trường thử: đồng hồ tua được) |
| Bộ ghép | Chạy thuật toán `05` theo sự kiện và định kỳ 6 giờ |
| Bộ sinh tài liệu | Sinh PDF, mã băm, chữ ký số mô phỏng (chạy nền, có trạng thái) |
| Cổng đối tác mô phỏng | Ngân hàng, kiểm định, nhà xe, kho, SMS/OTP, tổng đài gọi che số: nhận yêu cầu từ backend, phát sự kiện lại qua webhook có chữ ký, có màn điều khiển cho kiểm thử (thành công, thất bại, trễ, lặp, sai thứ tự) |
| Trang vận hành | Hàng việc, đối soát, xác minh, rủi ro, danh mục, cài đặt, đồng hồ thử (`08` mục 8) |
| Thông báo | Trong app + SMS mô phỏng; mọi thông báo có đường dẫn sâu tới đúng đối tượng và bước |

## A2. Thực thể

| Nhóm | Thực thể | Trường cốt lõi (không đầy đủ) |
|---|---|---|
| Danh tính | `nguoi_dung` | id, điện thoại (duy nhất), họ tên, trạng thái xác minh, thiết bị, phiên |
| | `to_chuc` | id, phía (`ban`/`mua`, vựa có thể cả hai), loại (hộ, trang trại, HTX, tổ hợp tác, doanh nghiệp, hộ kinh doanh), MST/định danh, địa bàn, trạng thái xác minh, gói (bên mua), phân khúc[] |
| | `thanh_vien` | người dùng × tổ chức × vai × hạn mức ký; duy nhất (người, tổ chức) |
| | `uy_quyen` | tổ hợp tác/HTX ↔ hộ, phạm vi lô, hiệu lực, bằng chứng |
| | `tai_khoan_nhan_tien` | tổ chức, ngân hàng, số (mã hóa), chủ tài khoản, trạng thái (`pending`/`active`/`replaced`/`locked`), hiệu lực từ |
| | `yeu_cau_doi_tai_khoan` | người yêu cầu, yếu tố xác thực, khớp tên, chờ tới, kênh đã báo, người kích hoạt |
| Danh mục | `ho_so_nganh_hang` (có phiên bản) | `01` mục 3 |
| | `gia_tham_khao_snapshot` | mặt hàng, loại, vùng, giá, số đơn, số cặp, khoảng thời gian, nguồn (`don_app`/`nguon_ngoai`) |
| | `chinh_sach` (có phiên bản) | tỷ lệ, ngưỡng, hạn, gói |
| Nguồn hàng | `lo` | người bán, mặt hàng, dạng, loại, lô cha, ước tính/đã cân, vị trí, ngày, cách ly, giá mong muốn, **giá thấp nhất kín**, trạng thái, cờ `ban_gap`/`khoa_an_toan` |
| | `so_luong_lo` (các ngăn) | `03` mục 1.2 |
| | `phan_dong_gop` | lô gộp × hộ × lượng × tem kiện |
| | `giay_to` | chủ (lô/tổ chức), loại, mã, thị trường, hiệu lực, trạng thái (`tu_khai`/`da_xac_minh`/`het_han`/`khong_khop`), nguồn xác minh |
| | `nhat_ky_canh_tac` (tối thiểu) | lô/vườn, ngày phun thuốc, ngày hết cách ly, thu hoạch (bao tiêu) |
| Cầu | `nhu_cau`, `dong_nhu_cau` | `05` mục 2.1 |
| | `ho_so_kem_loai` | bên mua × mặt hàng × loại × lượng tối thiểu × bán kính × giá chào sẵn |
| Thương lượng | `loi_chao` | chiều, lô, nhu cầu, lượng, giá, lượt, hạn, trạng thái |
| | `giu_luong` | lô, lượng, hạn, trạng thái |
| Hợp đồng | `don` | loại hợp đồng, hai bên, phân khúc, trạng thái, cờ, phiên bản hiện hành, ảnh chụp chính sách, ảnh chụp tài khoản nhận tiền |
| | `phien_ban_don` | số, điều khoản (JSON có cấu trúc), `ma_bam_noi_dung`, `ma_bam_truoc` |
| | `chu_ky` | phiên bản, người, vai, phương thức, mã băm đã ký, thời điểm |
| | `de_nghi` | đơn, loại, mục cũ → mới, hạn, trạng thái |
| | `yeu_cau_huy` | đơn, bên, lý do, hệ quả tính trước, trạng thái |
| | `don_nhom`, `hop_dong_khung`, `lan_goi_hang`, `bao_tieu` | `03` mục 12 |
| Giao nhận | `dot_giao` | đơn, số, lượng, ngày, kiểu giao, điểm nghiệm thu, người nhận, trạng thái |
| | `chuyen` | `06` mục 3.2 |
| | `ket_qua_nghiem_thu` (có phiên bản), `dong_ket_qua` | `03` mục 7 |
| | `tranh_chap`, `yeu_cau_kiem_dinh`, `ket_qua_kiem_dinh` | `03` mục 8 |
| | `su_co_van_chuyen`, `xu_ly_hang_tra_lai` | `06` |
| | `bang_chung` | mã băm, loại tệp, người tạo, giờ, tọa độ, nguồn (camera app / tải lên) |
| | `ma_qr` | loại, mã, hạn, chữ ký, đối tượng, số lần quét, lịch sử quét |
| Tiền | `coc` | đơn, số phải nộp, số ngân hàng xác nhận, trạng thái |
| | `nghia_vu` | đơn hoặc hợp đồng khung, loại (`tra_thang`, `bo_sung_coc`, `t_bm`, `t_nb`, `phat`, `phi_kiem_dinh`, `phi_kho`), bên trả, bên nhận, số, hạn, trạng thái |
| | `bao_tra`, `xac_nhan_nhan` | nghĩa vụ, số, chứng từ, mã giao dịch (duy nhất trong đơn) |
| | `huong_dan_thanh_toan` | nghĩa vụ, **tài khoản đích chụp**, VietQR, nội dung, hạn |
| | `lenh_ngan_hang` | loại, căn cứ (quyết toán/hủy), **đích chụp**, số, trạng thái, mã lệnh |
| | `su_kien_ngan_hang` | mã sự kiện (duy nhất theo đối tác), lệnh/cọc, loại, số, thời điểm, chữ ký webhook |
| | `quyet_toan` (có phiên bản) | `04` mục 5 |
| | `phi` | đơn, chính sách áp dụng, số thu, số hoàn, trạng thái |
| | `dieu_chinh` | tham chiếu bản ghi cũ, lý do, hai bên đồng ý |
| Tài liệu | `tai_lieu`, `phien_ban_tai_lieu` | `07` |
| Vận hành | `viec`, `nhat_ky_viec`, `quyet_dinh_van_hanh`, `cuoc_goi`, `gio_cong` | `08` mục 7 |
| Uy tín | `uy_tin_snapshot` | tổ chức, các thành phần `05` mục 5, thời điểm |
| Rủi ro | `co_rui_ro` | đối tượng (người, cặp, đơn, lô), loại (giá bất thường, lách, thông đồng, ép loại), mức, quyết định |
| Hệ thống | `lich_su` (chỉ ghi thêm), `outbox`, `han` | `han`: đối tượng, loại hạn, đến lúc, trạng thái, nguồn gia hạn |
| Gói | `dang_ky_goi` | tổ chức, gói, kỳ, số tiền theo ngày, trạng thái |
| Tin nhắn | `cuoc_tro_chuyen`, `tin_nhan` | bản gốc (mã hóa), bản hiển thị đã che, cờ che, bộ đếm |

## A3. Ràng buộc toàn vẹn (kiểm ở server, trong giao dịch)

1. Mọi chuyển trạng thái phải là một dòng hợp lệ trong bảng chuyển của `03`; không có cập nhật trạng thái tự do.
2. `don.phien_ban_hien_hanh` chỉ đổi khi **đủ chữ ký** các bên bắt buộc trên cùng mã băm.
3. Không ký, không cọc, không bốc khi `co_de_nghi_mo` hoặc yêu cầu hủy đang chờ.
4. Giữ lượng và cam kết dùng khóa dòng lô; `kha_dung` không âm.
5. Một `ma_giao_dich` chỉ xác nhận một lần trong một đơn; một `su_kien_ngan_hang` chỉ áp một lần.
6. `lenh_ngan_hang` bất biến sau `da_gui` (trừ trạng thái); thử lại bằng lệnh mới.
7. `tai_khoan_nhan_tien` mới không ảnh hưởng `huong_dan_thanh_toan` và `lenh_ngan_hang` đã tạo.
8. Quyền kiểm theo **hành động** (không theo màn): bảng A6.
9. Người lập ≠ người duyệt cho: đơn vượt hạn mức (bên mua), lệnh tiền thủ công, chốt theo biên bản, mở khóa an toàn, khóa tài khoản > 7 ngày.
10. Giá thấp nhất kín, giá tối đa kín: không có trong bất kỳ phản hồi API nào cho bên còn lại hoặc cho vai không phải chủ.
11. Tin nhắn trước cọc trả về bản đã che cho người nhận; bản gốc chỉ vận hành rủi ro xem, có nhật ký.
12. Tiền là số nguyên đồng; lượng là số nguyên gam; thời gian UTC.
13. Không xóa vật lý bản ghi nghiệp vụ; sửa bằng `dieu_chinh`.

## A4. Bất biến phải luôn đúng (kiểm sau mỗi giao dịch và bằng bộ kiểm toàn cục mỗi đêm)

| Mã | Bất biến |
|---|---|
| BT-L1 | Tổng các ngăn của lô = lượng lô (`03` mục 1.2) |
| BT-L2 | Σ giữ + cam kết trên lô ước tính ≤ 80% lượng ước tính (trừ khi đã chuyển "đã cân") |
| BT-L3 | Lô con: lượng ≤ phần chuyển từ lô cha; chuỗi cha–con không vòng |
| BT-L4 | Kết quả nghiệm thu: Σ dòng = lượng cân tại điểm nghiệm thu; mọi dòng ≥ 0 |
| BT-L5 | Đơn hoàn tất ⇒ mọi đợt ở trạng thái cuối; đợt giao bù còn mở ⇒ đơn chưa hoàn tất |
| BT-T1 … BT-T11 | `04` mục 10 |
| BT-D1 | Đơn `hieu_luc` ⇒ cọc ngân hàng xác nhận ≥ cọc phải nộp |
| BT-D2 | Phiên bản hiện hành của đơn có đủ chữ ký; mã băm khớp nội dung |
| BT-D3 | Mỗi hạn đang mở thuộc đúng một đối tượng và một loại; gia hạn tạo bản ghi mới |
| BT-Q1 | Mỗi chuyển trạng thái có đúng một dòng lịch sử và một sự kiện outbox |

## A5. Sự kiện

Tên chuẩn ở `03` mục 15. Mỗi sự kiện có: `id`, `loai`, `doi_tuong`, `phien_ban_doi_tuong`, `nguoi_thuc_hien` (hoặc `HT`), `luc`, `du_lieu`, `idempotency_key` nguồn. Bên tiêu thụ: thông báo, bộ ghép, bộ sinh tài liệu, uy tín, đo lường (`11` mục 6), hàng việc (`08` mục 4).

## A6. Quyền theo hành động (rút gọn)

| Hành động | NB chủ | Người giúp | HTX ban điều hành | HTX kế toán | BM quản lý | BM mua hàng | BM kế toán | BM kho | BM người nhận | Vận hành |
|---|---|---|---|---|---|---|---|---|---|---|
| Đăng, sửa lô | x | x | x | | | | | | | |
| Gửi lời chào / báo giá | x | x | x | | x | x | | | | |
| Ký hợp đồng, phụ lục | x | | x | | x | x (≤ hạn mức) | | | | |
| Duyệt đơn vượt hạn mức | | | | | x (≠ người lập) | | | | | |
| Chuyển cọc, ghi đã trả | | | | | x | | x | | | |
| Xác nhận đã nhận tiền (OTP `money_received` gắn số và mã khoản) | x | | | x | x | | x | | | |
| Bắt đầu nghiệm thu, gửi kết quả | | | | | x | | | x | x (tại điểm) | |
| Đồng ý / phản đối kết quả | x | | x | | | | | | | |
| Ký nhận tại nơi đến | | | | | x | | | x | x | |
| Xin hủy, đồng ý hủy | x | | x | | x | x | | | | |
| Đổi tài khoản nhận tiền | x | | x | | x (tài khoản của BM) | | | | | |
| Cho nợ thêm (khung) | | | x | | | | | | | |
| Lệnh tiền thủ công, chốt theo biên bản, khóa | | | | | | | | | | x (2 người) |

## A7. API cần có (tối thiểu)

Mọi lệnh: `POST`, thân có `idempotency_key`, `expected_revision`; phản hồi `{id, revision, trang_thai, su_kien[], loi[]}`. Truy vấn: `GET`, lọc theo quyền.

| Nhóm | Lệnh / truy vấn |
|---|---|
| Xác thực | `auth/otp/gui`, `auth/otp/xac_nhan`, `auth/phien`, `auth/khoi_phuc` |
| Tổ chức | `to_chuc/tao`, `to_chuc/xac_minh/gui`, `thanh_vien/moi` (QR-09), `thanh_vien/chap_nhan`, `thanh_vien/doi_vai`, `han_muc/dat` |
| Tài khoản tiền | `tai_khoan/yeu_cau_doi`, `tai_khoan/kich_hoat`, `tai_khoan/khong_phai_toi`, `GET tai_khoan` |
| Danh mục | `GET mat_hang`, `GET mat_hang/{ma}/ho_so`, `GET gia_tham_khao?mat_hang&loai&vung` |
| Lô | `lo/tao`, `lo/dang`, `lo/xac_nhan_con_hang`, `lo/sua_gia`, `lo/tach`, `lo/ban_gap/bat`, `lo/ban_gap/tat`, `lo/dong`, `GET lo/{id}` (theo quyền), `GET lo/{id}/so_luong`, `GET lo/{id}/khop` (chiều người bán) |
| Nhu cầu | `nhu_cau/tao`, `nhu_cau/dang`, `nhu_cau/sua`, `nhu_cau/dong`, `GET nhu_cau/{id}/khop` (`05` mục 2.9), `GET nhu_cau/{id}/goi_y_gom`, `ho_so_kem_loai/cap_nhat` |
| Lời chào | `loi_chao/gui`, `loi_chao/dong_y`, `loi_chao/tra_gia`, `loi_chao/tu_choi`, `loi_chao/rut`, `loi_chao/nang_gia_nhom`, `GET nhu_cau/{id}/so_sanh` (chỉ lời chào đã có trả lời) |
| Đơn | `don/lap`, `don/gui_duyet`, `don/duyet`, `don/ky` (OTP), `don/tu_choi_ky`, `don/rut`, `GET don/{id}` (trạng thái hiển thị, tới lượt ai, các khoản, hạn, lịch sử), `GET don/{id}/tom_tat_dieu_khoan` (8 thẻ) |
| Đề nghị, hủy | `de_nghi/gui`, `de_nghi/dong_y`, `de_nghi/khong_dong_y`, `de_nghi/rut`, `huy/xin`, `huy/dong_y`, `huy/khong_dong_y`, `GET huy/{id}/he_qua` |
| Giao nhận | `dot/chi_dinh_nguoi_nhan`, `chuyen/dat`, `chuyen/tu_lo`, `qr/quet`, `dot/bat_dau_nghiem_thu`, `dot/xuat_hang`, `ket_qua/gui`, `ket_qua/dong_y`, `ket_qua/phan_doi_dong`, `ket_qua/rut_phan`, `ket_qua/yeu_cau_dieu_chinh`, `dot/ky_nhan`, `dot/ghi_can_den`, `dot/khieu_nai_khac_mau`, `dot/chua_kiem_duoc`, `dot/xac_nhan_den_dat`, `dot/nhan_phan_vuot`, `dot/xu_ly_thieu`, `hang_tra_lai/chon` |
| Tranh chấp | `tranh_chap/can_lai`, `tranh_chap/yeu_cau_kiem_dinh`, `tranh_chap/thoa_thuan`, `GET tranh_chap/{id}` |
| Tiền | `GET don/{id}/tien`, `GET huong_dan/{nghia_vu}` (VietQR), `bao_tra`, `xac_nhan_nhan` (đủ / một phần / chưa nhận), `xac_nhan_nhan_lai`, `GET quyet_toan/{don}` |
| Tài liệu | `GET tai_lieu/{id}`, `GET xac_minh/{ma}` (công khai), `POST xac_minh/so_tep` |
| Kho, dịch vụ | `dich_vu/yeu_cau_bao_gia`, `dich_vu/chap_thuan`, `kho/nhap`, `kho/xuat` |
| Khung, nhóm, bao tiêu | `khung/goi_hang`, `khung/doi_mon`, `khung/cho_no_them`, `nhom/moi`, `nhom/rut_phan`, `nhom/chot`, `bao_tieu/nhat_ky_thu_hoach` |
| Tin nhắn | `tin_nhan/gui`, `GET cuoc_tro_chuyen/{id}` (bản đã che), `goi_qua_app` |
| Gói | `GET goi/so_sanh` (mức tiết kiệm tối đa trên đơn thật), `goi/nang`, `goi/ha` |
| Vận hành | `viec/*`, `doi_soat/*`, `xac_minh/*`, `rui_ro/*`, `chinh_sach/*`, `dong_ho_thu/tua`, `du_lieu_thu/nap_lai` |
| Webhook đối tác | `wh/ngan_hang`, `wh/kiem_dinh`, `wh/xe`, `wh/kho` (kiểm chữ ký, timestamp, nonce; webhook ngân hàng **luôn tra lại API** theo mã giao dịch trước khi ghi tiền, không chỉ khi sai thứ tự; kiểm định chỉ nhận qua kênh có chữ ký) (N-01, N-11) |

## A8. Mã lỗi nghiệp vụ (tối thiểu)

`KHONG_CO_QUYEN`, `PHIEN_BAN_DA_DOI`, `REVISION_XUNG_DOT`, `DANG_CO_DE_NGHI`, `DANG_XIN_HUY`, `KHONG_DU_LUONG`, `VUOT_80_UOC_TINH`, `CHUA_HET_CACH_LY`, `DUOI_60_THAM_KHAO`, `CHAO_VUOT_LUONG`, `GIA_KHONG_DUOC_GIAM`, `HET_LUOT_TRA_GIA`, `HET_LUOT_RUT`, `CAN_XAC_NHAN_GIA_BAT_THUONG`, `OTP_SAI`, `OTP_HET_HAN`, `CHUA_CO_COC`, `CHUA_DU_TIEN_TRUOC_BOC`, `THE_SAN_SANG_CHUA_DU`, `QR_KHONG_DUNG_DOT`, `QR_HET_HAN`, `QR_BI_KHOA`, `NGUOI_NHAN_KHONG_CHI_DINH`, `KET_QUA_KHONG_KHOP_TONG`, `KET_QUA_AM`, `THIEU_ANH_TRA_LAI`, `THIEU_LY_DO`, `HET_HAN_KHIEU_NAI`, `DA_GIA_HAN`, `TIEN_VUOT_SO_BAO`, `MA_GIAO_DICH_TRUNG`, `TAI_KHOAN_DANG_CHO`, `LO_KHOA_AN_TOAN`, `DUOI_SAN_BAO_TIEU`, `VUOT_MUC_KHUNG`, `GOI_HET_THANH_VIEN`, `GOI_HET_HAN_MUC`, `CAN_DUYET_NOI_BO`, `NGUOI_LAP_KHONG_DUOC_DUYET`, `CAN_MANG`.

Mỗi mã có câu tiếng Việt dễ hiểu, cách khắc phục và nút "Cần hỗ trợ" (tạo việc V23 kèm mã lỗi và `request_id`).

## A9. Môi trường thử

- Nạp `du-lieu-ao.json`; lệnh "nạp lại dữ liệu nền" trên trang vận hành.
- Đồng hồ tua (chỉ môi trường thử); mọi hẹn giờ chạy đúng khi tua. Đồng hồ thử, cổng đối tác mô phỏng, OTP thử `123456` và lệnh nạp lại dữ liệu **không được có trong bản production**: cờ biên dịch riêng, máy chủ kiểm khi khởi động, vai runtime ở DB không đọc đồng hồ thử (N-07, migration 0028).
- Cổng đối tác mô phỏng có nút: thành công, thất bại, trễ N phút, gửi lặp, gửi sai thứ tự, kết quả kiểm định (đạt / không đạt / không kết luận), nhiệt độ vượt ngưỡng.
- Bộ kiểm thử tự động cho 63 tình huống (`09`) chạy qua API hai phía; sau mỗi tình huống chạy bộ kiểm bất biến A4.

---

# Phần B · Giao diện

## B1. Nguyên tắc chung

1. Mọi màn đọc từ backend; không tự tính trạng thái, không tự tính tiền.
2. Mỗi màn đơn có: dòng trạng thái hiển thị (`03` mục 14), thanh 5 chặng, thẻ "Tới lượt ai" (vai + người + hạn), một nút chính.
3. Không chọn sẵn xác nhận tiền, hàng, số cân. Nút xác nhận tiền luôn kèm số.
4. Mọi màn có trạng thái: trống (kèm việc nên làm), đang tải (khung xương), lỗi (câu dễ hiểu + Thử lại + Gọi hỗ trợ), mất mạng (dải báo; khóa ký/tiền/số cân), bị chặn (nói thiếu gì, ai làm), hết hạn.
5. Chữ cấm và câu bắt buộc: `00` mục 7, `05`.
6. App bán: điện thoại 360–390 px, chữ thân ≥ 17 px, nút chính ≥ 56 px, nút Nghe, nhập bằng giọng nói; thanh dưới 5 mục (Trang chủ · Bán hàng · [+ Đăng] · Tin nhắn · Ví).
7. App mua: ưu tiên máy tính (thanh bên), dùng được trên điện thoại cho vai kho và người nhận; Tổng quan đổi theo phân khúc (`02` mục 5).
8. Không emoji, không linh vật ở màn tiền, ký, nghiệm thu.

## B2. App bán: danh sách màn theo luồng

| Mã | Màn | Nội dung chính | QR / PDF / chuyển người | Tình huống |
|---|---|---|---|---|
| A1–A3 | Chào mừng, số điện thoại, OTP | "Nghe mã qua cuộc gọi tự động": máy tự gọi, chỉ đọc mã rồi đọc câu "AgiViet không bao giờ hỏi lại mã này"; không có nhân viên gọi đọc mã (N-16) | — | 001 |
| A4–A7 | Bạn bán thế nào, mặt hàng (lưới ảnh), vùng, vườn/ao | Bỏ qua được | — | 001 |
| A8 | Xác minh | Căn cước, so khuôn mặt, "Đăng ký có hỗ trợ" | Chuyển người V01 | 001 |
| A9 | Tài khoản nhận tiền | Đúng tên; đếm ngược 24 giờ; "Không phải tôi" | Chuyển người V05 | 001, 023 |
| A10 | Người giúp | Mời, quyền | QR-09 | 001, 061 |
| H1 | Trang chủ | Thẻ ví ngắn (đã về / cọc giữ / còn phải nhận), Việc cần làm, Đáng chú ý, lưới 6 ô | — | mọi |
| H4 | Thông báo | Có mã bước, mở đúng đơn và bước | — | mọi |
| D1–D6 | Đăng lô | Chọn cách (nói, chụp, gõ), mặt hàng, **tách loại**, lượng (ước tính/đã cân), ngày hái (chặn cách ly), ảnh chụp trong app, **thước giá** với tham khảo và cảnh báo, giá thấp nhất kín | QR-01 sinh khi đăng | 003, 048 |
| D7 | Lô của tôi | Nhãn ước tính/đã cân, sổ lượng (khả dụng, đang giữ, cam kết, đã giao), xác nhận còn hàng | QR-01 | 041 |
| D8 | Lô kém loại, bán gấp | Bật/tắt bán gấp, sàn, số bên mua đã được báo (không tên), lời chào bao tiêu, gửi kho lạnh | Dịch vụ kho | 048, 049 |
| S1 | Bên mua đang cần hàng của chị | Nhu cầu khớp, 4 chỉ số uy tín bên mua, số cung cầu; gửi báo giá kín | — | 004 |
| S2 | Lời chào giá | Giá, % tham khảo, so giá vốn, tiền ròng, hạn, lượt còn; Đồng ý / Trả giá / Không bán; "Đây chưa phải hợp đồng" | — | 005, 010, 011 |
| O2 | Xem lại thỏa thuận | 8 thẻ có Nghe; Đề nghị sửa từng mục | — | 006 |
| O3 | Đề nghị đang chờ | Cũ → mới, hạn, khóa ký | — | 039, 040 |
| O4 | Ký | Tick cam kết; bước xác nhận giá bất thường; câu bảo vệ; "Chị chịu rủi ro [số]" nếu trả sau | PDF `HD`; OTP | 006, 015, 009 |
| O5 | Toàn văn hợp đồng | PDF xem trong app | PDF, QR-06 | 006, 062 |
| O8 | Chờ cọc / Ngân hàng đang giữ cọc | Khối khiên cọc; liên lạc mở hoặc "Gọi qua app" | — | 006, 018, 043 |
| G1 | Xác nhận tiền | Đã nhận đủ [số] · Nhận một phần (nhập số, mã giao dịch) · Chưa nhận | Chuyển người V08 | 019, 020, 026 |
| G2 | Sẵn sàng giao | 6 dòng đọc từ dữ liệu; "Đã sẵn hàng" khi xe trễ | — | 006, 036 |
| G3 | Quét | Quét thẻ chuyến, QR nhận hàng, nhập mã 6 số | QR-02, QR-03 | 006, 035 |
| G4 | Nghiệm thu tại vườn (phía người bán) | Kết quả bên mua gửi, ảnh, mẫu niêm phong; Đồng ý / Có phần không đúng (chia lại, gọi kiểm định, rút phần) | QR-05 ký tại chỗ; PDF `BBNT` | 006, 027, 032 |
| G5 | Xuất hàng (giao tại kho) | Cân, ảnh, niêm phong mẫu | QR-04; PDF `BBGN` | 007 |
| G6 | Kết quả cân (giao tại kho) | Đồng ý / phản đối đúng dòng; cảnh báo tỷ lệ bất thường | — | 007, 030, 034 |
| G7 | Thiếu / vượt lượng | Giao bù (lịch) / Kết thúc phần thiếu (hiện mức phạt) / Bất khả kháng | — | 037, 038, 039 |
| G8 | Hàng trả lại tại nơi đến | 4 lựa chọn, hạn | PDF `BBTH` | 007 |
| G9 | Tranh chấp | Dòng, đếm ngược cân lại/kiểm định, số chi tạm | — | 029, 031 |
| T1 | Tiền của đơn | Đã nhận / phải hoàn / đã hoàn / giá trị được chấp nhận; lệnh 4 chặng | PDF `CTTT` | mọi |
| T2 | Quyết toán | Bảng `BQT` | PDF `BQT` | 006, 024 |
| T3 | Đã hoàn [số] | Khi có `T_nb` | — | 024, 025 |
| T4 | Ví | Đã về tháng này, cọc đang giữ, còn phải nhận, công nợ | — | mọi |
| X1 | Xin hủy / trả lời hủy | Màn hệ quả (hàng, cọc, phí, trả thẳng) | PDF `BBHUY` | 044–046 |
| K1 | Hợp đồng khung (HTX, vựa) | Lịch, bốn số, cho nợ thêm, đề nghị thay món | — | 053, 054 |
| K2 | Đơn nhóm (phần của tôi) | Pha gom, xin rút phần | — | 051 |
| K3 | Lô gộp HTX | Phần đóng góp, tem kiện, bảng phân bổ; hộ: phần của tôi, "HTX đã chi [số]" | QR-01 tem kiện | 052 |
| K4 | Đặt trước | Cập nhật ảnh vườn, đề nghị chốt lượng giá | — | 056 |
| K5 | Bao tiêu | Đợt, vật tư đối trừ, nhật ký thu hoạch | — | 055 |
| M1 | Tin nhắn | Bản đã che, nhắc số tiền, Gọi qua app | — | 017, 018 |
| P1 | Hồ sơ, uy tín, giấy tờ | Trạng thái từng giấy tờ | — | 003 |
| P2 | Hỗ trợ | Tạo việc, mã việc, người phụ trách, mốc cập nhật | Chuyển người V23 | mọi |

## B3. App mua: danh sách màn theo luồng

| Mã | Màn | Nội dung chính | QR / PDF / chuyển người | Tình huống |
|---|---|---|---|---|
| MA1 | Đăng nhập, MST, phân khúc, gói | Gợi ý gói theo phân khúc | — | 002 |
| MA2 | Tổ chức | Thành viên, vai, hạn mức, mời | QR-09 | 002 |
| MT | Tổng quan theo phân khúc | Xuất khẩu / chế biến / nhà hàng / đầu mối (`02` mục 5) | — | mọi |
| MN1 | Phiếu nhu cầu | Hỏi dần; nhiều dòng loại; giá tối đa kín; giấy tờ là bộ lọc cứng | — | 004 |
| MN2 | Hàng khớp | 3 nhóm, không số giá, gợi ý gom | — | 004, 057 |
| MN3 | Chi tiết lô | Nguồn gốc, giấy tờ (trạng thái), ảnh, uy tín người bán; **không giá** | QR-01 | 004 |
| MN4 | Soạn lời chào | % tham khảo, cảnh báo 80%, chặn 60%, giới hạn vượt lượng, một giá cùng loại | — | 010–014 |
| MN5 | So lời chào | Chỉ lời chào đã trả lời; quy về giá tại kho (giá + xe + hao hụt + kiểm định + hạn trả) | — | 013 |
| MN6 | Hàng kém loại | Hồ sơ nhận kém loại, lô khớp, đối tác bao tiêu | — | 048 |
| MD1 | Lập hợp đồng | Mẫu theo loại hợp đồng và phân khúc; điều khoản bắt buộc; bảng "ai trả"; tính cọc, phí, rủi ro bên mua | — | 006 |
| MD2 | Duyệt nội bộ | Hàng chờ duyệt, người lập ≠ người duyệt, hạn ngoài vẫn chạy | — | 052 |
| MD3 | Ký và gửi | OTP | PDF `HD` | 006 |
| MD4 | Chi tiết đơn | Trạng thái, tới lượt ai (vai, người), các khoản, hạn, lịch sử, tài liệu | PDF | mọi |
| MP1 | Chuyển cọc | VietQR cọc + phí, nội dung mã | QR-07 | 006, 021 |
| MP2 | Trả thẳng | VietQR tới tài khoản trong hợp đồng; cảnh báo tài khoản vừa đổi; Ghi đã trả kèm chứng từ | QR-07; chuyển người V08 | 006, 019, 020, 023 |
| MP3 | Tiền và công nợ | Theo đơn, người bán, hạn; đã báo / đã xác nhận; được hoàn; người bán còn phải hoàn; phí | PDF `CTTT` | mọi |
| MG1 | Chỉ định người nhận, đặt xe | Người nhận; xe tự lo (biển số) hoặc xe đối tác (báo giá) | QR-02, QR-03 | 006, 050 |
| MG2 | Nghiệm thu (điện thoại, tại vườn hoặc tại kho) | Nhận đủ, đúng thỏa thuận (điền sẵn để rà) / Có chênh lệch (từng dòng, lý do, ảnh); bảng cỡ (tôm), độ ẩm (lúa); niêm phong mẫu | QR-04, QR-05; PDF `BBNT` | 006, 024, 058, 059 |
| MG3 | Ký nhận tại nơi đến | Quét thẻ chuyến, cân, hao hụt, đếm 2 giờ, Chưa kiểm được, Khác mẫu lúc bốc, Xác nhận đến đạt | QR-03, QR-04; PDF `BBGN` | 006, 028, 029, 033 |
| MG4 | Tranh chấp | Cân lại, yêu cầu kiểm định, kết quả | Chuyển người V11, V12 | 029–032 |
| MG5 | Thiếu / vượt lượng | Nhận phần vượt; đồng ý giao bù / kết thúc phần thiếu; nguồn thay | — | 037–040 |
| MK1 | Gom nhiều nguồn, đơn nhóm | Bản đồ người bán, thanh "đã gom", giờ chốt, nguồn bù cần kiểm định | — | 051, 057 |
| MK2 | Hợp đồng khung, lịch tuần | Bốn số, gọi thêm/bớt, đồng ý thay món từng dòng | — | 053, 054 |
| MK3 | Bao tiêu | Đợt, giá công thức, vật tư đối trừ, cờ nghi bán ra ngoài | — | 055 |
| MK4 | Đặt trước | Theo dõi vườn, chốt lượng giá, bổ sung cọc | — | 056 |
| MK5 | Hồ sơ xuất khẩu theo lô | Mã vùng, cơ sở đóng gói, kết quả kiểm định, truy xuất | QR-01; PDF `BBKD` | 057 |
| MW1 | Kho, tồn, truy xuất | Nhập kho từ nghiệm thu đã chốt, tồn theo loại, truy QR | QR-01, QR-08 | 006 |
| MW2 | Nhà cung cấp | Điểm giao đủ, đúng loại, đúng hẹn; mối quen | — | — |
| MW3 | Bảng kê 01/TNDN | Theo kỳ, chỉ số nghiệm thu đã chốt | PDF `BK01` | 006 |
| MW4 | Ghi đơn ngoài app | Nhãn "tự khai" | — | — |
| MX1 | Xin hủy / trả lời hủy | Màn hệ quả | PDF `BBHUY` | 044–046 |
| MC1 | Tin nhắn | Bản đã che, Gọi qua app | — | 017, 018 |
| MG0 | Gói | So phí trên đơn thật, nâng, hạ | — | 063 |
| MH | Hỗ trợ | Như app bán | V23 | mọi |

## B4. App hiện trường và trang vận hành

- App hiện trường (điện thoại, cho cộng tác viên và kiểm định viên): danh sách việc theo vùng, chụp ảnh có giờ vị trí, quét QR mẫu (QR-04), ký chứng kiến, nhập kết quả kiểm. Tình huống: 001, 029, 032, 040, 057, 058, 059.
- Trang vận hành: `08` mục 8. Tình huống: 009, 016, 020, 022, 031, 034, 040, 055.

## B5. Chỗ app chuyển việc cho người (câu trên giao diện)

| Nơi | Câu | Việc |
|---|---|---|
| Xác minh không đạt | "Nhân viên AgiViet sẽ gọi hoặc tới giúp chị trước [mốc]" | V01 |
| Người bán chưa xác nhận tiền 48 giờ / bấm Chưa nhận | "Đang đối soát · cọc vẫn giữ · người phụ trách: [tên] · cập nhật trước [giờ]" | V08 |
| Người bán chưa xác nhận số cân 24 giờ | "Người vận hành đang đối chiếu biên bản" | V07 |
| Tranh chấp quá 24 giờ không cân lại | "Đang đặt kiểm định" | V11 |
| Sự cố xe hàng tươi | "Đang tìm phương án: xe thay / kho lạnh gần nhất" | V19 |
| Bất khả kháng, bên mua không trả lời | "Đang xét bằng chứng của chị" | V13 |
| Ngoài giờ trực | "Ngoài giờ trực. Người trực tiếp theo bắt đầu lúc 05:00. Kênh khẩn: [số]" | — |

Không bao giờ hiện "đang có người xử lý" khi việc chưa có người nhận.
