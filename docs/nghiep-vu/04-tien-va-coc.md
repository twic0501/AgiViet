# 04 · Tiền, cọc, phí, quyết toán, hoàn

## 1. Mô hình tiền (kế thừa K01–K06)

| Loại tiền | Ai trả → ai nhận | Đi qua đâu | App làm gì |
|---|---|---|---|
| **Cọc** | Bên mua → tài khoản cọc tại ngân hàng đối tác | Ngân hàng (mô phỏng) | Phát VietQR, nhận sự kiện ngân hàng, gửi lệnh chi/hoàn khi đủ điều kiện |
| **Phí giới thiệu** | Bên mua → AgiViet | Chuyển cùng cọc, ngân hàng tách sang tài khoản doanh thu AgiViet | Lưu chính sách phí lúc ký; hoàn theo bảng mục 9 |
| **Trả thẳng** | Bên mua → người bán | Ngoài app (chuyển khoản tới tài khoản trong hợp đồng, hoặc tiền mặt có biên nhận) | Ghi nghĩa vụ, nhận báo của bên mua, nhận xác nhận số của người bán, đối soát khi lệch |
| **Hoàn ngoài app** | Người bán → bên mua (khi đã trả thẳng nhiều hơn giá trị nghiệm thu), hoặc khoản phạt | Ngoài app | Ghi nghĩa vụ; bên nhận xác nhận |
| **Phí kiểm định, xe, kho** | Bên đặt dịch vụ → đối tác | Ngoài app (v2 chỉ ghi nhận) | Ghi khoản, ai trả, bên sai hoàn cho bên đã ứng |
| **Vật tư đối trừ** (bao tiêu) | Bên mua ứng vật tư, trừ dần vào tiền đợt | Ghi nhận | Dòng trừ riêng trên bảng tiền mỗi đợt |

Không có số dư ví chung. Mỗi màn tiền hiện **từng khoản và trạng thái của nó**.

Bằng chứng tiền (theo `docs/bao-mat/01` mục 1): chỉ **ngân hàng** (sự kiện đúng chữ ký **và** tra lại API khớp) hoặc **bên nhận tiền** (xác nhận trên máy mình, kèm số, OTP `money_received`) tạo được "sự thật tiền". Ảnh ủy nhiệm chi, ảnh màn hình, lời báo, cuộc gọi chỉ là đầu mối. Mọi khoản hoàn đi về **tài khoản nguồn** đã nộp.

**Tiền mặt** (N-14): cho phép với biên nhận hai bên ký và OTP của bên nhận; từ 20.000.000 đ một lần app hiện cảnh báo vàng "Nên chuyển khoản để có chứng từ ngân hàng" và gắn cờ cho VH-RR xem; trần tiền mặt theo quy định hiện hành chờ luật sư chốt.

## 2. Đơn vị và làm tròn

1. Tiền: số nguyên **đồng**, không dùng số thực.
2. Lượng: lưu số nguyên **gam**; hiển thị kg với tối đa 1 chữ số thập phân.
3. Tiền của một dòng = làm tròn nửa lên (gam × giá đồng/kg ÷ 1.000) tới đồng. Tổng tiền = tổng các dòng đã làm tròn (không làm tròn lại tổng).
4. **Cọc** làm tròn nửa lên tới **nghìn đồng**.
5. **Phí** làm tròn nửa lên tới đồng, sau đó áp sàn, trần.
6. Phân bổ một khoản cho nhiều phần (phí đơn nhóm, cọc theo tỷ lệ lượng): chia theo tỷ lệ, làm tròn từng phần xuống tới đồng (cọc: tới nghìn), phần dư cộng vào phần có lượng lớn nhất (cùng lượng thì phần tạo trước). Tổng các phần luôn bằng tổng gốc.

## 3. Giá tham khảo và giá tính cọc

- `P_tk`: giá tham khảo của **cùng mặt hàng + cùng loại** (+ vùng khi vùng đủ dữ liệu), tại lúc lập đơn (`05` mục 3). Có thể "chưa đủ dữ liệu".
- `P`: giá đơn (đ/kg).
- **Giá tính cọc** `P_coc = P` nếu chưa đủ dữ liệu; ngược lại `P_coc = max(P, làm tròn lên tới đồng (0,7 × P_tk))`.
- Với giá theo công thức (đặt trước, bao tiêu): `P` dùng giá sàn của công thức cho tới khi chốt.
- Với bảng cỡ (tôm, cá) và độ ẩm (lúa): `P` là giá của khoảng mục tiêu.
- `P_tk` và `P_coc` được **ghi vào hợp đồng** (không đổi khi giá tham khảo đổi sau đó).

## 4. Cọc và phí lúc ký

Ký hiệu: `Q` lượng hợp đồng (kg; với lượng khoảng thì lượng tối thiểu), `r_coc` tỷ lệ cọc (mặc định 0,30), `r_phi` tỷ lệ phí theo gói và quan hệ cặp.

| Đại lượng | Công thức |
|---|---|
| Giá trị hợp đồng `G` | `Q × P` |
| Giá trị tính cọc `G_coc` | `Q × P_coc` |
| **Cọc** `C` | `min(G, làm tròn tới nghìn (r_coc × G_coc))` (Q07) |
| **Phí** `F` | Nếu `r_phi = 0` thì 0; ngược lại `min(trần, max(sàn, làm tròn(r_phi × G_coc)))` |
| Số bên mua chuyển qua app | `C + F` (một mã nội dung; ngân hàng tách) |
| Khoản trả thẳng (nếu "trước bốc" hoặc "kiểm rồi trả trước bốc") | `max(0, G − C)` |

`r_phi` theo gói (`02` mục 6, `11`): Miễn phí 1,0% đơn đầu với người bán đó, 0,5% đơn sau; Thu mua 0,3% đơn đầu, 0% đơn sau với cùng người bán; Doanh nghiệp 0,2%; Bếp 0%. "Đơn đầu" = cặp tổ chức mua – người bán chưa có đơn nào ở `hoan_tat`.

**Tính lại khi phụ lục đổi lượng hoặc giá** (đặt trước chốt lượng giá, giảm lượng, tăng lượng): tính `C_moi` theo công thức với lượng, giá mới (giá tính cọc dùng `P_tk` đã ghi lúc ký).
- `C_moi > C_cu`: tạo khoản **bổ sung cọc** `C_moi − C_cu`, hạn 24 giờ, là một dòng của thẻ Sẵn sàng giao.
- `C_moi < C_cu`: tạo lệnh **hoàn cọc chênh** `C_cu − C_moi` cho bên mua ngay khi phụ lục được hai bên ký.
- Phí: tăng lượng thì thu thêm phần phí tương ứng; giảm lượng có căn cứ (bất khả kháng, người bán thiếu) thì hoàn phần phí tương ứng; phí tính lại cũng áp sàn, trần trên tổng.

## 5. Quyết toán

Chạy khi mọi đợt của đơn đã chốt (hoặc từng phần khi tranh chấp, mục 6). Ký hiệu:

| Ký hiệu | Nghĩa |
|---|---|
| `V` | Giá trị nghiệm thu đã chốt = Σ đạt × P + Σ hạ cấp × P_hc + Σ hư do đường × P (rủi ro thuộc bên mua) + Σ điều chỉnh theo bảng (cỡ, ẩm) |
| `D` | Tổng trả thẳng **người bán đã xác nhận** (không tính số bên mua chỉ báo) |
| `C` | Cọc ngân hàng đã xác nhận (sau mọi lần bổ sung, hoàn chênh) |
| `X_nb` | Tổng khoản người bán phải trả bên mua theo hợp đồng: phạt thiếu lượng (Q04), phí kiểm định khi người bán sai |
| `X_bm` | Tổng khoản bên mua phải trả người bán ngoài giá trị hàng: phí kiểm định khi bên mua sai và người bán đã ứng |

**Bước 1 · Số người bán được nhận ròng**: `N = V − X_nb + X_bm`.

**Bước 2 · Chia cọc:**

| Trường hợp | Cọc chi người bán `C_nb` | Cọc hoàn bên mua `C_bm` | Bên mua còn phải trả `T_bm` | Người bán còn phải hoàn `T_nb` |
|---|---|---|---|---|
| `N ≥ D + C` | `C` | 0 | `N − D − C` | 0 |
| `D ≤ N < D + C` | `N − D` | `C − (N − D)` | 0 | 0 |
| `N < D` | 0 | `C` | 0 | `D − N` |

**Bước 3 · Tạo lệnh và nghĩa vụ:** lệnh `chi_coc_nb` (nếu > 0), lệnh `hoan_coc_bm` (nếu > 0), nghĩa vụ `T_bm` (hạn 72 giờ, trả thẳng), nghĩa vụ `T_nb` (hạn 72 giờ, người bán hoàn ngoài app, bên mua xác nhận).

**Bất biến sau quyết toán:**
- `C_nb + C_bm = C`.
- Khi mọi nghĩa vụ xong: tiền người bán thực nhận `= D + C_nb + T_bm − T_nb = N`.
- Tiền bên mua chi cho hàng `= D + C − C_bm + T_bm − T_nb = N` (đúng bằng số người bán nhận ròng).

## 6. Quyết toán từng phần khi có tranh chấp

Khi một số dòng đang tranh chấp:
1. `V_kt` = giá trị các dòng đã chốt **cộng các dòng đang tranh chấp tính theo mức bên mua đề xuất** (mức thấp hơn mà bên mua đã thừa nhận). Ví dụ người bán phản đối 80 kg hạ cấp (bên mua nói hạ cấp, người bán nói đạt): tính 80 kg × giá hạ cấp. Bên mua khiếu nại 100 kg đã chốt đạt là khác mẫu (đòi trả lại): tính 100 kg × 0.
2. Khoản trả thẳng "khi nhận" / "sau N ngày" đến hạn tính trên `V_kt`: `max(0, V_kt − C − D_da_xac_nhan)`.
3. Chi ngay cho người bán: `C_nb_tam = max(0, min(C, max(0, V_kt − D)) − G_them)`, với **`G_them` = phí kiểm định bên mua đã ứng cho tranh chấp đang mở + mức phạt tối đa người bán có thể chịu theo hợp đồng (Q04) cho phần đang tranh chấp** (N-08). Mục đích: người bán thua tranh chấp thì khoản phải hoàn đã nằm sẵn trong phần giữ, không thành nợ ngoài app.
4. Giữ lại: `C − C_nb_tam` tới khi tranh chấp kết luận.
5. Khi kết luận: chạy lại mục 5 với `V` đầy đủ. Phần `C_nb` cuối vượt `C_nb_tam` thì chi thêm từ phần giữ; phần giữ còn lại hoàn bên mua; nếu `N` vượt `D + C` thì phần vượt là `T_bm`; nếu `C_nb` cuối nhỏ hơn `C_nb_tam` (thường do khoản phạt hoặc phí kiểm định người bán phải chịu) thì không thu hồi từ ngân hàng, chênh lệch thành `T_nb`.

Vì dòng tranh chấp được tính ở mức bên mua thừa nhận, `V_kt ≤ V` cuối trong mọi kết luận, trừ khi kiểm định kết luận hàng còn tệ hơn bên mua khai (khi đó chênh lệch thành `T_nb`).

## 7. Ví dụ số (dùng làm kỳ vọng của kiểm thử)

Tất cả số là dữ liệu ảo (`10`). Mỗi ví dụ ghi mã tình huống ở `09`.

### 7.1 HĐ-2001 luồng thuận (TH-006)

Chị Năm → Nhà máy sấy Đồng Xanh (gói Thu mua, đơn đầu): 2.000 kg xoài cát Chu L1, `P` = 23.000, `P_hc` = 15.000, `P_tk` = 25.000 (14 đơn), giao tại vườn, trả thẳng trước bốc.

| Bước | Tính | Số |
|---|---|---|
| Giá tính cọc | max(23.000; 0,7 × 25.000 = 17.500) | 23.000 |
| `G` | 2.000 × 23.000 | 46.000.000 |
| Cọc `C` | 30% × 46.000.000 | 13.800.000 |
| Phí `F` | 0,3% × 46.000.000 = 138.000 (sàn 20.000, trần 1.500.000) | 138.000 |
| Bên mua chuyển qua app | 13.800.000 + 138.000 | 13.938.000 |
| Trả thẳng trước bốc | 46.000.000 − 13.800.000 | 32.200.000 |
| Nghiệm thu tại vườn | đạt 1.850 × 23.000 = 42.550.000; hạ cấp 120 × 15.000 = 1.800.000; trả lại 30 kg = 0 | `V` = 44.350.000 |
| `N` | không phạt, không phí kiểm định | 44.350.000 |
| Chia cọc | `D` = 32.200.000 ≤ `N` < `D + C` = 46.000.000 → `C_nb` = 12.150.000; `C_bm` = 1.650.000 | |
| Người bán nhận tổng | 32.200.000 + 12.150.000 | 44.350.000 |
| Bên mua chi cho hàng | 32.200.000 + 13.800.000 − 1.650.000 | 44.350.000 |
| Phí (không hoàn, đơn hoàn tất) | | 138.000 |
| Lượng | Bốc 1.970 kg; tới kho 1.950 kg; hao hụt 20 kg = 1,02% ≤ 2% → không ai đền | Lô con L2 30 kg (bán gấp) |

### 7.2 Nhận một phần trả thẳng (TH-019)

Bên mua báo 32.200.000, chị Năm thấy 20.000.000 → "Nhận một phần 20.000.000" → còn thiếu 12.200.000 → thẻ Sẵn sàng giao đỏ dòng Tiền, không bốc. Bên mua chuyển thêm 12.200.000, chị Năm xác nhận → `D` = 32.200.000 → đi tiếp như 7.1.

### 7.3 Trả lại nhiều (TH-024)

Như 7.1 nhưng nghiệm thu: đạt 1.200, hạ cấp 100, trả lại 700.
- `V` = 1.200 × 23.000 + 100 × 15.000 = 27.600.000 + 1.500.000 = 29.100.000.
- `N` = 29.100.000 < `D` = 32.200.000 → `C_nb` = 0; `C_bm` = 13.800.000; `T_nb` = 3.100.000.
- Trả lại 700 kg = 35% > 5% → bắt buộc ảnh; ghi tỷ lệ trả lại vào uy tín người bán (nếu không tranh chấp) — nếu người bán phản đối thì đi tranh chấp (TH-032).
- Đơn ở "Đã giao xong · còn công nợ (chị còn phải hoàn 3.100.000 đ)" tới khi bên mua bấm "Đã nhận lại 3.100.000 đ".
- Kết thúc: người bán thực nhận 32.200.000 − 3.100.000 = 29.100.000. Bên mua chi 32.200.000 + 13.800.000 − 13.800.000 − 3.100.000 = 29.100.000.

### 7.4 Trả lại toàn bộ (TH-025)

Nghiệm thu 0 / 0 / 2.000 → `V` = 0 → `C_bm` = 13.800.000, `T_nb` = 32.200.000. Hàng không rời vườn (Q02). Phí 138.000: đơn không hủy mà hoàn tất với giá trị 0 → **không hoàn** theo Q05; nếu tranh chấp kết luận bên mua sai (kiểm định nói đạt) thì đổi `V` và bên mua chịu phí kiểm định.

### 7.5 Giao trong dung sai: 1.960 kg (TH-037)

Lượng thực 1.960 (−2%, trong ±5%): luồng thuận, đạt hết. `V` = 45.080.000; `C_nb` = 45.080.000 − 32.200.000 = 12.880.000; `C_bm` = 920.000. Không phạt.

### 7.6 Giao vượt: 2.100 kg (TH-037)

Lượng thực 2.100 (+5%, trong dung sai). Bên mua bấm "Nhận phần vượt 100 kg" tại chỗ, đạt hết. `V` = 48.300.000. `N` ≥ `D + C` = 46.000.000 → `C_nb` = 13.800.000, `T_bm` = 2.300.000 (hạn 24 giờ sau chốt). Người bán nhận 32.200.000 + 13.800.000 + 2.300.000 = 48.300.000. Nếu bên mua chọn "Không nhận phần vượt": 100 kg ở lại người bán, như 7.1 với 2.000 kg đạt.

### 7.7 Giao thiếu 1.850 kg, không báo trước (TH-038)

Thiếu 150 kg = 7,5% > 5%. Người bán chọn "Kết thúc phần thiếu", không có đề nghị giảm lượng trước đó → mức phạt 100% cọc phần thiếu.
- Cọc phần thiếu = 13.800.000 × 150 / 2.000 = 1.035.000 → `X_nb` = 1.035.000.
- `V` = 1.850 × 23.000 = 42.550.000; `N` = 42.550.000 − 1.035.000 = 41.515.000.
- `C_nb` = 41.515.000 − 32.200.000 = 9.315.000; `C_bm` = 13.800.000 − 9.315.000 = 4.485.000.
- Người bán nhận 32.200.000 + 9.315.000 = 41.515.000. Bên mua chi cho hàng 32.200.000 + 9.315.000 = 41.515.000 (= 42.550.000 tiền hàng − 1.035.000 phạt nhận được).
- Phí: hoàn phần tương ứng lượng thiếu do người bán: 0,3% × 150 × 23.000 = 10.350 → hoàn 10.350; phí giữ 127.650.
- Nếu người bán đã gửi đề nghị giảm lượng ≥ 3 ngày trước ngày giao (ước sai): phạt 10% = 103.500; báo < 3 ngày: 50% = 517.500; bất khả kháng được chấp thuận: 0.

### 7.8 Giao bù 150 kg (TH-039, sửa F04)

Đợt 1 giao 1.850 kg đạt hết; hai bên chọn "Giao bù" 150 kg ngày 04/11 (đợt 2). Đơn **không** quyết toán ở đợt 1.
- Khoản trả thẳng trước bốc đợt 2 = `G − C − D` = 46.000.000 − 13.800.000 − 32.200.000 = 0 → không cần trả thêm.
- Đợt 2 nghiệm thu 150 kg đạt → `V` = 46.000.000 → `C_nb` = 13.800.000, `C_bm` = 0. Không phạt; uy tín ghi "giao trễ 1 đợt có đồng ý".
- Nếu đợt 2 không giao tới hạn: đợt 2 chuyển "kết thúc phần thiếu" và áp 7.7.

### 7.9 Bất khả kháng: giảm 2.000 → 1.500 kg (TH-040)

Mưa đá ngày 01/11, chị Năm gửi đề nghị giảm lượng kèm ảnh và xác nhận HTX trước ngày giao; Đồng Xanh đồng ý; phụ lục 2, hai bên ký.
- `C_moi` = 30% × 1.500 × 23.000 = 10.350.000 → hoàn chênh 3.450.000.
- Phí mới = 0,3% × 34.500.000 = 103.500 → hoàn 34.500.
- Trả thẳng trước bốc = 34.500.000 − 10.350.000 = 24.150.000.
- Biến thể: nếu bên mua đã trả thẳng 32.200.000 trước khi có phụ lục, thì với `V` = 34.500.000: `C_nb` = 34.500.000 − 32.200.000 = 2.300.000; `C_bm` = 10.350.000 − 2.300.000 = 8.050.000; không phát sinh khoản hoàn ngoài app. Bên mua chi ròng 32.200.000 + 13.800.000 − 3.450.000 − 8.050.000 = 34.500.000.
- Không phạt, không trừ uy tín. App gợi ý nguồn bù 500 kg (đơn riêng với anh Sáu).

### 7.10 Giao tại kho, trả khi nhận (TH-007)

Anh Sáu → Đồng Xanh (Thu mua, đơn đầu với anh Sáu): 1.000 kg xoài L1, `P` = 24.000, `P_hc` = 15.000, giao tại kho Đồng Xanh, anh Sáu thuê xe đối tác.
- `G` = 24.000.000; `C` = 7.200.000; `F` = 72.000; chuyển qua app 7.272.000.
- Nghiệm thu tại kho: đạt 980, trả lại 20 (2% ≤ 5%, không cần ảnh). `V` = 23.520.000.
- Khoản trả khi nhận = `max(0, V − C − D)` = 23.520.000 − 7.200.000 = 16.320.000 → anh Sáu xác nhận → `D` = 16.320.000.
- `C_nb` = 7.200.000; `C_bm` = 0. Anh Sáu nhận 23.520.000.
- 20 kg trả lại nằm ở kho Đồng Xanh: anh Sáu chọn "Ủy quyền bán gấp tại chỗ" hoặc "Nhận lại trong 24 giờ" (`06` mục 5).

### 7.11 Trả sau 7 ngày (TH-009)

Anh Bảy → Vựa Tư Hùng (gói Miễn phí, đơn đầu): 3.000 kg bưởi da xanh L1, `P` = 30.000, `P_hc` = 20.000, `P_tk` = 32.000.
- `G` = 90.000.000; `C` = 27.000.000; `F` = 1% × 90.000.000 = 900.000.
- Màn ký người bán: "Anh chịu rủi ro 63.000.000 đ trong 7 ngày" (= `G − C`).
- Nghiệm thu tại vườn: đạt 2.950, hạ cấp 50 → `V` = 88.500.000 + 1.000.000 = 89.500.000.
- Khoản sau 7 ngày = `V − C` = 62.500.000. Cọc chỉ xử lý khi khoản này được xác nhận đủ.
- Trả đúng hạn → `C_nb` = 27.000.000 → anh Bảy nhận 89.500.000.
- Quá hạn 72 giờ (ngày thứ 10) chưa trả: cờ vi phạm thanh toán; vận hành (2 người) được chi cọc 27.000.000 cho anh Bảy như khoản trừ nợ; còn nợ 62.500.000, app xuất hồ sơ đòi nợ.

### 7.12 Khiếu nại khác mẫu ở kho, kiểm định (TH-029)

Từ 7.1 (đã chốt tại vườn 1.850 / 120 / 30, `D` = 32.200.000). Tại kho, trong 2 giờ, Đồng Xanh khiếu nại 100 kg trong phần đạt "sâu cuống bên trong, khác mẫu M-2291". Đồng Xanh ứng phí kiểm định 280.000.
- Phần không tranh chấp: `V_kt` = 1.750 × 23.000 + 120 × 15.000 = 40.250.000 + 1.800.000 = 42.050.000.
- Chi tạm: `min(C, V_kt − D)` = 9.850.000; `G_them` = 280.000 (phí kiểm định Đồng Xanh đã ứng; không có phạt thiếu lượng) → `C_nb_tam` = 9.570.000; giữ 4.230.000.
- **Kết quả A (lỗi có từ trước, người bán sai):** 100 kg chuyển sang trả lại. `V` = 42.050.000; `X_nb` = 280.000 (phí kiểm định); `N` = 41.770.000. `C_nb` cuối theo mục 5 = 41.770.000 − 32.200.000 = 9.570.000 = đúng phần đã chi tạm → không chi thêm; `C_bm` = 4.230.000 (toàn bộ phần giữ, gồm 280.000 bù phí kiểm định cho bên mua); `T_nb` = 0. Người bán ròng 32.200.000 + 9.570.000 = 41.770.000. Bên mua chi ròng cho hàng 32.200.000 + 13.800.000 − 4.230.000 = 41.770.000 (đã được bù phí kiểm định).
- **Kết quả B (người bán đúng):** `V` = 44.350.000; bên mua tự chịu phí 280.000 (đã trả); `C_nb` cuối = 12.150.000 → chi thêm 2.580.000 từ phần giữ; `C_bm` = 1.650.000 (kiểm: 9.570.000 + 2.580.000 + 1.650.000 = 13.800.000). Uy tín bên mua ghi "hạ loại không căn cứ".

### 7.13 Giá bất thường (TH-015)

Anh Sáu → Vựa Tư Hùng (Miễn phí, đơn đầu): 1.000 kg xoài L1 giá 14.000 (= 56% `P_tk` 25.000, dưới 60%).
- Người bán phải tick thêm "Tôi hiểu tiền trả ngoài app không được bảo vệ, không vào bảng kê, không tính uy tín" trước khi ký. Đơn gắn cờ `gia_bat_thuong`.
- `P_coc` = max(14.000; 17.500) = 17.500. `G` = 14.000.000; `G_coc` = 17.500.000; `C` = min(14.000.000; 5.250.000) = 5.250.000; `F` = 1% × 17.500.000 = 175.000.
- Trả thẳng trước bốc = 14.000.000 − 5.250.000 = 8.750.000. Đạt hết: `C_nb` = 5.250.000; người bán nhận 14.000.000.
- Đơn **không vào** dữ liệu giá tham khảo. Cặp này có 3 đơn bất thường trong 90 ngày → việc P2 cho vận hành.

### 7.14 Đặt trước khi hái, giá công thức (TH-056)

Chị Năm → Đồng Xanh (đơn thứ hai, mối quen: phí 0%). HĐ-2004: 1.800–2.200 kg xoài L1, giá = giá tham khảo L1 ngày chốt, sàn 20.000, trần 26.000.
- Cọc ban đầu = 30% × 1.800 × 20.000 = 10.800.000.
- Ngày 10/11 chốt 2.100 kg; giá tham khảo hôm đó 24.000 (trong sàn–trần) → `G` = 50.400.000.
- Cọc mới = 30% × 50.400.000 = 15.120.000 → bổ sung 4.320.000 (hạn 24 giờ).
- Trả thẳng trước bốc = 50.400.000 − 15.120.000 = 35.280.000.

### 7.15 Đơn nhóm 200 kg (TH-051)

Vựa Tư Hùng (Miễn phí) cần 200 kg xoài L1 giá 23.000, "chỉ nhận khi đủ tổng", điểm gom HTX Mỹ Xương.
- Phần: chị Năm 100 kg (cặp đã có đơn hoàn tất với Tư Hùng → 0,5%), anh Sáu 60 kg (đơn đầu → 1%), cô Hai 40 kg (đơn đầu → 1%).
- Cô Hai xin rút trong pha gom → không ghi uy tín; app gợi ý Út Lan 40 kg cùng giá, cùng chuẩn; Út Lan đồng ý (đơn đầu → 1%).
- Cọc từng phần: Năm 30% × 2.300.000 = 690.000; Sáu 30% × 1.380.000 = 414.000; Lan 30% × 920.000 = 276.000; tổng 1.380.000.
- Phí nhóm = 11.500 + 13.800 + 9.200 = 34.500 ≥ sàn 20.000 → 34.500 (Năm 11.500, Sáu 13.800, Lan 9.200).

### 7.16 Hợp đồng khung Bếp Sen – HTX Mỹ Xương (TH-053)

Thứ 2 và thứ 5: 30 kg xoài × 26.000 = 780.000 + 20 kg thanh long × 19.000 = 380.000 → 1.160.000 mỗi lần. Gói Bếp: phí 0%.
- Cọc khung 1.160.000; HTX cho nợ thêm 1.500.000 → **mức được phép 2.660.000**.
- Đã giao chưa trả (thứ 2): 1.160.000. Đã chốt sắp giao (thứ 5, đã gọi thêm 10 kg xoài): 1.420.000. **Đang dùng 2.580.000**; còn 80.000.
- Bếp Sen xin thêm 10 kg xoài (260.000) → 2.840.000 vượt 180.000 → "Chờ bổ sung cọc khung hoặc HTX cho nợ thêm"; lần thứ 5 đã chốt vẫn giao.
- Cuối tuần Bếp Sen trả 2.580.000 cho HTX; HTX xác nhận → đang dùng về 0.

### 7.17 Quán nhỏ đặt định kỳ qua đầu mối (TH-054)

Quán Cơm Nhà Mười (Miễn phí) ↔ Vựa Tư Hùng (vai bán): thứ 3 và thứ 6, 10 kg chanh L1 × 16.000 = 160.000 + 15 kg xoài L2 × 18.000 = 270.000 → 430.000 mỗi lần.
- Cọc khung = 1 kỳ (tuần, 2 lần) = 860.000; cho nợ 200.000 → mức 1.060.000.
- Thứ 3 giao 430.000 (chưa trả). Thứ 6 vựa thiếu xoài L2, đề nghị thay xoài L1 × 22.000 = 330.000; quán đồng ý dòng này → lần thứ 6 = 490.000. Đang dùng 920.000 ≤ 1.060.000 → chốt được.
- Thứ 7 quán trả tiền mặt 920.000; vựa xác nhận "Đã nhận 920.000 đ" kèm ảnh biên nhận.
- Phí theo kỳ (Q10): 1% × 920.000 = 9.200, không sàn.

### 7.18 Bao tiêu theo vụ (TH-055)

Nhà máy Mekong ↔ chị Năm, BT-2005, xoài L1 cho sấy. 3 đợt cam kết 3.000 / 2.800 / 3.200 = 9.000 kg. Giá đợt = max(18.000; 90% giá tham khảo L1 ngày giao). Cọc vụ 9.000.000 (= 1.000 đ/kg cam kết). Vật tư ứng 15.000.000, trừ 5.000.000 mỗi đợt.
- Đợt 2: 2.800 kg đạt; tham khảo 19.000 → 90% = 17.100 < 18.000 → giá 18.000. Tiền đợt = 50.400.000 − 5.000.000 = 45.400.000, Mekong trả trong 7 ngày.
- Đợt 3: nhật ký thu hoạch 3.200 kg, chỉ giao 2.700 kg, không báo → cờ "nghi bán ra ngoài"; phạt 100% cọc phần thiếu = 500 × 1.000 = 500.000. Tham khảo 22.000 → 90% = 19.800 → giá 19.800. Giá trị đợt 3 = 53.460.000 − vật tư 5.000.000 = 48.460.000.
- Quyết toán cuối vụ: cọc vụ 9.000.000 chi cho chị Năm (cấn vào tiền đợt 3); Mekong trả thẳng 48.460.000 − 500.000 − 9.000.000 = 38.960.000. Chị Năm nhận cho đợt 3: 9.000.000 + 38.960.000 = 47.960.000 (= 48.460.000 − 500.000).

### 7.19 Tôm theo bảng cỡ (TH-058)

Anh Lực → Cửu Long Xanh (Doanh nghiệp): 1.500 kg tôm thẻ cỡ 48–52 con/kg giá 118.000; bảng: 53–60 giá 105.000; 61–70 giá 95.000; giao tại ao, trả khi cân xong tại ao.
- `C` = 30% × 177.000.000 = 53.100.000; `F` = 0,2% × 177.000.000 = 354.000.
- Test kháng sinh âm tính. Đếm mẫu trung bình 58 con/kg → khoảng 53–60 → 105.000 (luồng thuận, không tranh chấp). Cân 1.480 kg (−1,3%, trong dung sai).
- `V` = 1.480 × 105.000 = 155.400.000. Khoản khi nhận = 155.400.000 − 53.100.000 = 102.300.000 → anh Lực xác nhận → `C_nb` = 53.100.000. Tổng 155.400.000.

### 7.20 Lúa tươi quy đổi độ ẩm (TH-059)

Anh Chín → Vựa lúa Ba Thành (Miễn phí, đơn đầu): 30.000 kg lúa OM18 tươi, ẩm chuẩn 25%, 6.600 đ/kg, trả tại ruộng sau cân.
- `G` = 198.000.000; `C` = 59.400.000; `F` = 1% × 198.000.000 = 1.980.000 (dưới trần 2.000.000).
- Cân 30.000 kg; ẩm đo trung bình 27%; tạp chất 1% (≤ 2%). Quy đổi = 30.000 × (100 − 27) / (100 − 25) = 30.000 × 73 / 75 = 29.200 kg.
- `V` = 29.200 × 6.600 = 192.720.000. Khoản khi nhận = 192.720.000 − 59.400.000 = 133.320.000 → `C_nb` = 59.400.000.
- Nếu Ba Thành ở gói Thu mua: phí 0,3% × 198.000.000 = 594.000 (dùng trong TH-063 để so tiết kiệm).

### 7.21 Lô gộp HTX (TH-052)

HTX Mỹ Xương → Đồng Xanh (Thu mua, đơn đầu với HTX): 5.000 kg xoài L1 × 23.500, `P_hc` = 15.000. Phần: Năm 2.000, Sáu 1.500, Út Lan 1.000, cô Hai 500.
- `G` = 117.500.000; `C` = 35.250.000; `F` = 0,3% × 117.500.000 = 352.500; trả thẳng trước bốc 82.250.000.
- Nghiệm thu tại điểm gom theo tem hộ: Năm 1.980 đạt / 20 trả lại; Sáu 1.500 đạt; Lan 950 đạt / 50 hạ cấp; Hai 500 đạt.
- `V` = 4.930 × 23.500 + 50 × 15.000 = 115.855.000 + 750.000 = 116.605.000.
- `C_nb` = 116.605.000 − 82.250.000 = 34.355.000; `C_bm` = 35.250.000 − 34.355.000 = 895.000.
- Bảng phân bổ (hiển thị, HTX tự chi): giá trị phần — phí gom 300 đ/kg giao được nhận:

| Hộ | Giá trị phần | Phí gom | HTX chi |
|---|---|---|---|
| Năm | 1.980 × 23.500 = 46.530.000 | 1.980 × 300 = 594.000 | 45.936.000 |
| Sáu | 35.250.000 | 450.000 | 34.800.000 |
| Út Lan | 22.325.000 + 750.000 = 23.075.000 | 1.000 × 300 = 300.000 | 22.775.000 |
| Cô Hai | 11.750.000 | 150.000 | 11.600.000 |
| **Tổng** | **116.605.000** | **1.494.000** | **115.111.000** |

### 7.22 Xuất khẩu nhiều nguồn, một nguồn rớt kiểm định (TH-057)

Công ty XNK Sông Tiền (Doanh nghiệp) cần 18.000 kg sầu riêng Ri6 loại A cho 1 container, 6 nguồn × 3.000 kg, `P` = 72.000 (`P_tk` = 75.000), trả thẳng sau kiểm định đạt, trước bốc.
- Mỗi nguồn: `G` = 216.000.000; `C` = 64.800.000; `F` = 0,2% × 216.000.000 = 432.000; trả thẳng = 151.200.000.
- Nguồn 4 (anh Tư) kiểm cadimi **không đạt**: lô gắn `khoa_an_toan`; đơn nguồn 4 đóng lý do `nguoi_ban_khong_giao` (không đạt điều kiện bắt buộc): cọc 64.800.000 hoàn Sông Tiền; phí 432.000 hoàn; anh Tư hoàn phí kiểm định 1.500.000 Sông Tiền đã ứng (`T_nb`); **không phạt cọc** vì có kết quả kiểm khách quan và không có dấu hiệu gian dối (VH có thể đổi kết luận nếu phát hiện nhúng hóa chất); trả thẳng chưa phát sinh vì chưa đạt kiểm định.
- Nguồn bù: anh Thạch Sơn (NB13 trong dữ liệu ảo) 3.000 kg, có mã vùng, kiểm định đạt → đơn mới cùng giá.

## 8. Hủy ở từng bước (căn cứ HĐ-2001)

| Bước | Ai hủy | Cọc | Phí 138.000 | Trả thẳng | Hàng | Kết quả ròng |
|---|---|---|---|---|---|---|
| Trước khi người bán ký | BM rút / NB từ chối | — | Chưa thu | — | Giữ lượng về lô | 0 |
| Chờ cọc | Bất kỳ / quá hạn cọc | Chưa có (tiền lẻ hoàn đủ) | Chưa thu (tiền lẻ hoàn) | — | Về lô | 0 |
| Sau cọc, chưa trả thẳng | BM xin, NB đồng ý | 13.800.000 → NB | Không hoàn | — | Về lô | NB +13.800.000 |
| Sau cọc, chưa trả thẳng | NB xin, BM đồng ý | 13.800.000 → BM | Hoàn 138.000 | — | Về lô | 0; uy tín NB "hủy sau cọc" |
| Sau khi NB đã nhận trả thẳng 32.200.000 | BM xin, NB đồng ý | → NB | Không hoàn | NB hoàn 32.200.000, BM xác nhận | Về lô | NB +13.800.000 |
| Sau khi NB đã nhận trả thẳng | NB xin, BM đồng ý | → BM | Hoàn | NB hoàn 32.200.000 | Về lô | 0 |
| Bất khả kháng (đường bị lũ cắt), cả hai xác nhận hoặc VH chấp nhận | Bất kỳ | → BM | Hoàn | NB hoàn phần đã nhận | Về lô | 0; không ai bị trừ uy tín |
| NB không giao, không báo, quá ngày giao 12 giờ | HT mở việc, BM chọn "Kết thúc đơn" | → BM | Hoàn | NB hoàn phần đã nhận | — | NB phạt 100% cọc phần thiếu = 13.800.000 (`T_nb`) theo Q04; cần luật sư rà |
| BM không trả khoản trước bốc quá hạn, hoặc xe BM trễ > 24 giờ | NB chọn "Hủy, giữ cọc" | → NB | Không hoàn | — | Về lô, gợi ý bán gấp | NB +13.800.000 |
| Đã chốt một phần (giao bù chưa giao) | Hủy phần chưa giao | Theo tỷ lệ lượng chưa giao | Theo bảng mục 9 | Quyết toán phần đã giao trước | — | Như dòng tương ứng, tính trên phần chưa giao |
| Lệnh cọc đang chạy | Không hủy được lệnh | Lệnh giữ nguyên; nếu tiền đã đi sai so với quyết định hủy, tạo nghĩa vụ hoàn riêng giữa hai bên | | | | TH-047 |

## 9. Bảng hoàn phí (Q06)

| Tình huống | Phí |
|---|---|
| Hủy trước cọc | Chưa thu |
| Người bán không giao, người bán xin hủy, bất khả kháng, người bán không đạt kiểm định bắt buộc | Hoàn đủ |
| Giảm lượng có căn cứ (bất khả kháng, người bán thiếu) | Hoàn phần tương ứng lượng giảm (tính lại có sàn trên phần còn lại) |
| Bên mua xin hủy, không nhận hàng, không trả khoản trước bốc, xe trễ > 24 giờ | Không hoàn |
| Đơn hoàn tất (kể cả có trả lại hàng) | Không hoàn |

Phí hoàn bằng lệnh `hoan_phi` từ tài khoản doanh thu AgiViet (không lấy từ cọc). Trước khi đơn kết thúc, trạng thái phí hiện "Đã thu · hoàn hay không tùy kết quả đơn".

## 10. Bất biến tiền (backend kiểm sau mỗi giao dịch, kiểm thử tự động kiểm toàn bộ dữ liệu)

| Mã | Bất biến |
|---|---|
| BT-T1 | `coc_da_chi_nb + coc_da_hoan_bm + coc_dang_giu + coc_trong_lenh_chua_doi_soat = coc_ngan_hang_xac_nhan` |
| BT-T2 | `coc_ngan_hang_xac_nhan ≤ G` (Q07) và ≥ 0 |
| BT-T3 | `D` (đã xác nhận) ≤ tổng bên mua đã báo cho các khoản đó; mỗi xác nhận có mã giao dịch không trùng trong cùng đơn |
| BT-T4 | Chỉ dòng nghiệm thu `chot` vào `V`; `V` = Σ dòng chốt (tính theo mục 2) |
| BT-T5 | Đơn `hoan_tat` ⇒ `T_bm = 0` đã xác nhận, `T_nb = 0` đã xác nhận, mọi lệnh `da_doi_soat`, không tranh chấp mở, mọi đợt cuối |
| BT-T6 | Đơn `hoan_tat` ⇒ tiền người bán thực nhận = `N` |
| BT-T7 | Mỗi lệnh ngân hàng có đích chụp lúc tạo; không có hai lệnh `thanh_cong` cùng căn cứ và cùng loại |
| BT-T8 | Sự kiện ngân hàng cùng `ma_su_kien_nh` chỉ được áp một lần |
| BT-T9 | Không có trạng thái nào cộng tiền vào "đã nhận" của người bán từ một khai báo của bên mua hoặc từ hết hạn |
| BT-T10 | Phí đã thu − phí đã hoàn ≥ 0; phí không bao giờ trừ vào tiền người bán |
| BT-T11 | Tổng phân bổ (phí đơn nhóm, phần hộ lô gộp) = tổng gốc |
