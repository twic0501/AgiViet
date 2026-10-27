# AI · 01 Ghép cung cầu giải thích được

Mã: `ai/agiviet_ai/ghep.py` (phiên bản luật `2026-10-25.2`). Đánh giá: `ai/danh_gia/danh_gia_ghep.py` → `ai/ket_qua/ghep.json`.
Căn cứ: `docs/nghiep-vu/05` mục 2, `02` mục 2 và 5, `09` TH-001, TH-004.

## 1. Vì sao không dùng mô hình học máy để xếp hạng

- Chưa có dữ liệu thật về đơn hoàn tất/hủy để học; học trên dữ liệu ảo là học lại chính luật người viết ra.
- Đặc tả đã chốt công thức điểm (05 mục 2.4) và cấm xếp theo giá; một bộ xếp hạng học máy khó chứng minh là không dùng giá gián tiếp.
- Luật tất định cho phép giải thích từng điểm, kiểm thử bằng tình huống, và tranh chấp được ("vì sao lô tôi không hiện").

Học máy chỉ nên thêm sau pilot, ở dạng **xếp lại trong cùng nhóm** với đặc trưng không chứa giá, và phải qua phép thử thứ tự không đổi khi đổi giá (mục 6).

Embedding (bge-m3, đã tải 1,2 GB qua Ollama) **không dùng** trong bản này: danh mục chỉ 8 mặt hàng với tên gọi địa phương liệt kê được; luật khớp tên + bảng loại theo trọng lượng (ví dụ "xoài cát chu loại 1 cỡ 350–450 g" → `XOAI_CAT_CHU`/`L1`) đúng 100% trên các câu thử. Embedding đáng làm khi danh mục mở rộng (≥ 50 mặt hàng, nhiều tên vùng), và luôn trả "gợi ý, cần chọn lại" chứ không tự gán.

## 2. Luật cứng (lọc, không đạt thì không hiện)

| Mã | Điều kiện | Ghi chú triển khai |
|---|---|---|
| H1 | Cùng mặt hàng và dạng | |
| H2 (gồm H8) | Loại lô ∈ tập loại của dòng nhu cầu | Không tự thay loại |
| H3 | `dang_ban`, hoặc `sap_co_hang` khi nhu cầu trước mùa; không khóa an toàn; người bán không bị khóa | |
| H4 | Giấy bắt buộc `da_xac_minh`, còn hiệu lực tới ngày giao | Mã có hậu tố thị trường (`ma_vung_trong:TQ`) |
| H5 | Hết cách ly ≤ ngày giao sớm nhất | Thay cho giấy "nhật ký cách ly" khi lô có ngày hết cách ly |
| H6 | Khoảng cách đường chim bay ≤ bán kính (150 km; nhà hàng 50 km) | |
| H7 | Ngày có hàng ≤ ngày cuối + 3 | |
| H9 | Không cùng tổ chức, không bị chặn | Vựa hai vai không tự ghép |
| H10 | Mặt hàng mở; xuất khẩu cấp 2 cần kiểm định phủ vùng; **xuất khẩu cần người bán đã xác minh** (TH-001) | |
| H11 | `P_min ≤ 1,10 × P_max` | Lý do trả app: "Chưa phù hợp điều kiện giao dịch" (không nói là giá) |
| thêm | Lượng tối thiểu mỗi nguồn (20 kg; xuất khẩu 1.000 kg); xác nhận còn hàng ≤ 14 ngày (CG-02); hạn hàng; nhu cầu còn mở; nhà hàng chỉ HTX/vựa đã xác minh | |

**Kiểm định không phải lọc cứng.** Kết quả kiểm định (cadimi, kháng sinh) là điều kiện *trước khi bốc*, mẫu chỉ lấy khi đã có đơn; nếu lọc cứng thì NC-3003, NC-3004 không bao giờ có nguồn. Bản này ghi vào `ghi_chu`: "Cần kiểm định trước khi bốc: …". Mã cơ sở đóng gói là của bên mua, không đòi ở lô.

## 3. Nhóm và điểm

Nhóm: **khớp đủ** / **khớp một phần** (có dòng "thiếu") / **gần khớp giá** ("Cần thương lượng", không số). Trong nhóm xếp theo điểm; hòa thì lô xác nhận còn hàng gần nhất, rồi mã lô.

| Thành phần | Tối đa | Công thức |
|---|---|---|
| Lượng | 25 | 25 × min(1, khả dụng cam kết được / lượng cần) |
| Uy tín | 25 | 25 × uy tín/100; người mới (< 3 đơn) 15 |
| Khoảng cách | 15 | 15 × (1 − km/bán kính) |
| Ngày | 10 | 10 − 3 × số ngày trễ |
| Loại ưu tiên | 10 | Loại đầu danh sách 10, khác 5 |
| Đã cân | 5 | |
| Giấy ưu tiên | 5 | +2,5 mỗi giấy ưu tiên đã xác minh |
| Mối quen | 5 | Cặp có ≥ 1 đơn hoàn tất |
| Hành vi xấu | −20 | Cờ vi phạm 90 ngày |
| Bán gấp (ẩn) | +10 | Chỉ dùng xếp; **không** có trong `diem`/`diem_thanh_phan` trả ra (EG-08) |

Khả dụng cam kết được = khai × (1 nếu đã cân, 0,8 nếu ước tính) − đã cam kết − đang giữ (K21, CG-03).

Đầu ra mỗi lô: `nhom`, `nhan_gia`, `kha_dung_cam_ket_kg`, `khoang_cach_km`, `ngay_giao_du_kien`, `diem`, `diem_thanh_phan`, `ly_do_khop[]`, `thieu[]`, `ghi_chu[]`. Không có trường giá.

## 4. Gợi ý gom và chiều người bán

- **Gom** (nhu cầu `can_gom`, không lô nào khớp đủ): tham lam theo điểm trong các lô chỉ thiếu lượng; mỗi nguồn ≥ lượng tối thiểu; tối đa 6 nguồn (xuất khẩu 8); các nguồn cách nhau ≤ 30 km hoặc cùng điểm gom. Trả `can_xac_nhan: true`, chưa giữ lượng.
- **Chiều người bán** (`POST /match/reverse`, 05 mục 2.6): một lô → các nhu cầu khớp, kèm `so_nhu_cau_dang_can` (đếm cả nhu cầu bị H11 loại). Không trả giá tối đa.

## 5. Mâu thuẫn đặc tả đã gặp và cách chọn (cần nhóm nghiệp vụ xác nhận)

| # | Mâu thuẫn | Chọn |
|---|---|---|
| A1 | 05 mục 2.3 coi "lượng còn ước tính" là thiếu (→ khớp một phần), nhưng 09 TH-004 xếp L-0412 (ước tính, cam kết được 3.200 ≥ 2.000) vào **khớp đủ** | Theo TH-004: ước tính chỉ là thiếu khi phần 80% không đủ; nếu đủ thì là ghi chú |
| A2 | H4 đòi giấy tờ "kết quả kiểm định" đã xác minh, nhưng luồng NC-3003 (09) gom 6 nguồn rồi mới kiểm định | Kiểm định không lọc cứng, ghi "cần kiểm định trước khi bốc" |
| A3 | H3 chỉ nhận lô `sap_co_hang` khi nhu cầu "trước mùa", nhưng dữ liệu ảo không đánh dấu NC-3003/3004/3006 là trước mùa (mọi lô của chúng đều `sap_co_hang`) | Giả định trong bộ đánh giá: cửa sổ bắt đầu sau hôm nay = trước mùa. Backend cần một trường rõ ràng |
| A4 | Mẫu đầu ra 05 mục 2.9 có lô cách 182 km dù bán kính mặc định 150 km | Hiểu 182 km là đường bộ; H6 dùng đường chim bay (Mỹ Xương → Hiệp Phước ≈ 120 km) |
| A5 | 09 nêu 6 nguồn gom NC-3003 gồm anh Toàn (L-0445); thuật toán chọn anh Sơn (L-0447, uy tín 84 > 83) thay anh Toàn | Giữ thuật toán; ví dụ 09 không ràng buộc thứ tự |

## 6. Đánh giá (số đo thật, `ai/ket_qua/ghep.json`)

Dữ liệu: `docs/nghiep-vu/du-lieu-ao.json` (19 người bán, 8 bên mua, 19 lô, 8 nhu cầu). **Giả định** thêm: tọa độ tâm xã/huyện, mọi lô xác nhận còn hàng 01/11 08:00, thời điểm ghép 02/11 08:00.

| Phép thử | Kết quả |
|---|---|
| 16 tình huống, 42 kỳ vọng (TH-004 nguyên văn; 7 nhu cầu nền; 7 tình huống biên mỗi luật một lô; nhà hàng qua đầu mối) | **42/42** |
| Lộ số giá kín trong đầu ra (16 tình huống) | 0 |
| Đổi ngẫu nhiên giá kín của lô trong vùng khớp, 300 lần | Thứ tự trong nhóm đổi **0/300** lần |
| Tất định (chạy 2 lần) | Giống hệt |
| Điểm uy tín người bán mới (Út Lan, 0 đơn) | 15/25 (không bị 0) |
| Chiều người bán L-0412 | Thấy NC-3007, NC-3001, NC-3008 |
| Độ trễ hàm ghép, 10 / 100 / 1.000 lô | 0,09 / 0,73 / 7,3 ms (trung vị) |
| `POST /match` qua HTTP (30 lô, cùng tiến trình) | ~3 ms |

**Giới hạn của phép đo:** 41/42 kỳ vọng do chính người viết luật suy ra từ luật, nên đây là kiểm tra *đúng đặc tả*, không phải bằng chứng gợi ý *có ích* ngoài đời. Chỉ TH-004 là kỳ vọng độc lập do nhóm nghiệp vụ viết.

## 7. Thiên vị và cách giữ công bằng

| Nguy cơ | Hiện trạng | Biện pháp |
|---|---|---|
| Người mới bị chìm (uy tín) | Người mới nhận 15/25 cố định; ở NC-3001 lô Út Lan (mới) đứng sau lô Sáu chủ yếu vì lượng | Theo dõi tỷ lệ hiển thị top-3 của người mới; nếu < 50% tỷ lệ người cũ cùng điều kiện thì xem lại mức 15 |
| Mối quen +5 làm giàu thêm người đã có khách | Ở NC-3007, lô có mối quen với Tư Hùng lên đầu | Giữ +5 (đặc tả), nhưng báo cáo hằng tháng tỷ lệ đơn mới đi tới người chưa có mối quen |
| Hộ xa (vùng sâu) bị trừ điểm khoảng cách | 15 điểm tuyến tính | Gợi ý gom/điểm gom giúp hộ xa gộp nguồn |
| Hộ nhỏ (ít lượng) bị trừ điểm lượng | 25 điểm theo tỷ lệ | Gom nhiều nguồn; nhóm "khớp một phần" vẫn hiện |
| Lộ bán gấp qua điểm | Bán gấp không có trong `diem` trả ra | Bên mua vẫn có thể suy luận nếu so thứ tự với điểm; chấp nhận được ở MVP, ghi nhận |
| Dò giá kín bằng cách tạo nhiều nhu cầu | Không chặn ở AI | Backend chặn theo EG-06 (rút lời chào), giới hạn số phiếu |
