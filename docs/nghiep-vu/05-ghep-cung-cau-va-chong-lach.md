# 05 · Ghép cung cầu, giá tham khảo và các luật chống ép giá, khai thấp, lách, ép loại

## 1. Nguyên tắc

1. **Giấu giá khi ghép.** Bên mua không thấy giá từng hộ khi tìm; người bán không thấy giá tối đa của bên mua; các hộ không thấy giá của nhau. Số giá của một hộ chỉ hiện với bên mua khi hộ đó trả lời lời chào (đồng ý hoặc trả giá).
2. **Không xếp theo giá.** Xếp theo độ khớp. Bộ lọc giá không có ở màn tìm nguồn.
3. **App không định giá, không chặn người bán tự bán thấp.** Chỉ cảnh báo, buộc xác nhận thêm, và đưa giá trị cọc/phí về mức không còn lợi khi khai thấp.
4. **Chống lách bằng giá trị trước, cấm đoán sau.** Cọc ngân hàng, hợp đồng PDF, bảng kê, kiểm định, uy tín, kho xe giá đối tác chỉ có trên app; mối quen phí thấp hoặc 0%.
5. **Phát hiện → đánh dấu → người xem.** Không khóa tài khoản tự động vì một dấu hiệu đơn lẻ; mọi biện pháp nặng (giảm hiển thị dài hạn, khóa) do vận hành quyết định có lý do (`08`).

## 2. Thuật toán ghép

### 2.1 Đầu vào

**Dòng nhu cầu** (một nhu cầu có thể nhiều dòng loại): mặt hàng, dạng, tập loại chấp nhận, lượng cần, lượng tối thiểu mỗi nguồn (mặc định 20 kg; xuất khẩu 1.000 kg), cửa sổ ngày `[ngay_tu, ngay_den]`, nơi nhận (tọa độ), bán kính tối đa (mặc định 150 km; nhà hàng 50 km qua đầu mối), giấy tờ bắt buộc, **giá tối đa kín** `P_max`, kênh (`thuong` / `kem_loai`), phân khúc, người bán bị loại (danh sách chặn của bên mua).

**Lô**: mặt hàng, dạng, loại, `kha_dung`, ước tính/đã cân, ngày có hàng, vị trí, giấy tờ (mỗi giấy có trạng thái `da_xac_minh` / `tu_khai` / `het_han`), ngày hết cách ly thuốc, **giá thấp nhất kín** `P_min`, uy tín người bán, cờ `ban_gap`, `khoa_an_toan`, trạng thái lô.

### 2.2 Điều kiện cứng (không đạt thì loại)

| Mã | Điều kiện |
|---|---|
| H1 | Cùng mặt hàng và dạng |
| H2 | Loại của lô ∈ tập loại của dòng nhu cầu |
| H3 | Lô ở `dang_ban` hoặc `sap_co_hang` (chỉ khi dòng nhu cầu là trước mùa); không `khoa_an_toan`; người bán không bị khóa |
| H4 | Giấy tờ bắt buộc của nhu cầu có trạng thái `da_xac_minh` và còn hiệu lực ở `ngay_den` (giấy tự khai không qua bộ lọc cứng) |
| H5 | Ngày hết cách ly thuốc ≤ ngày giao sớm nhất có thể |
| H6 | Khoảng cách đường chim bay từ lô tới nơi nhận (hoặc điểm gom được chỉ định) ≤ bán kính |
| H7 | Ngày có hàng ≤ `ngay_den` + 3 ngày |
| H8 | Lô loại L2, L3, dạt, hoặc lô con trả lại: chỉ ghép khi dòng nhu cầu là kênh `kem_loai` **hoặc** chứa đúng loại đó |
| H9 | Người bán và bên mua không cùng tổ chức (vựa hai vai không tự ghép); cặp không bị chặn |
| H10 | Mặt hàng ở cấp mở cho phép giao dịch; với xuất khẩu cấp 2 phải có đối tác kiểm định phủ vùng |
| H11 | `P_min ≤ 1,10 × P_max` (xa hơn thì không hiện, chỉ tính vào số cung cầu) |

### 2.3 Ba nhóm kết quả

| Nhóm | Điều kiện | Nhãn hiện cho bên mua |
|---|---|---|
| **Khớp đủ** | H1–H11 và `P_min ≤ 1,05 × P_max` và `kha_dung_cam_ket_duoc ≥ luong_can_con_thieu` và ngày có hàng trong cửa sổ | "Giá trong khoảng bạn chấp nhận" |
| **Khớp một phần** | H1–H11 và `P_min ≤ 1,05 × P_max`, thiếu ≥ 1 tiêu chí mềm: thiếu lượng, ngày lệch ≤ 3 ngày, chỉ có giấy tờ tự khai ở mục không bắt buộc, lượng còn ước tính | "Giá trong khoảng bạn chấp nhận" + dòng thiếu cụ thể ("thiếu 40 kg", "giao chậm 2 ngày", "lượng ước tính") |
| **Gần khớp giá** | H1–H11 và `1,05 × P_max < P_min ≤ 1,10 × P_max` | "Cần thương lượng" (không số) |

`kha_dung_cam_ket_duoc` = `kha_dung` nếu đã cân; `0,8 × luong_uoc_tinh − cam_ket_hien_co` nếu ước tính (K21).

### 2.4 Điểm phù hợp (0–100, chỉ để xếp trong nhóm; không dùng giá)

| Thành phần | Điểm tối đa | Cách tính |
|---|---|---|
| Lượng | 25 | `25 × min(1, kha_dung_cam_ket_duoc / luong_can_con_thieu)` |
| Uy tín người bán | 25 | `25 × diem_uy_tin_nb / 100` (mục 5.1); người mới chưa có đơn: 15 |
| Khoảng cách | 15 | `15 × (1 − khoang_cach / ban_kinh)` |
| Ngày | 10 | Trong cửa sổ: 10; lệch 1–3 ngày: 10 − 3 × số ngày lệch |
| Loại khớp ưu tiên | 10 | Loại đầu tiên trong danh sách loại của dòng: 10; loại khác: 5 |
| Đã cân | 5 | Đã cân: 5; ước tính: 0 |
| Giấy tờ thêm | 5 | Mỗi giấy tờ không bắt buộc nhưng bên mua đánh dấu "ưu tiên" và đã xác minh: +2,5, tối đa 5 |
| Mối quen | 5 | Cặp đã có ≥ 1 đơn hoàn tất: 5 |
| Bán gấp (ẩn) | +10 | Cộng thêm, có thể vượt 100; **không lộ nhãn** (bên mua chỉ thấy "giao được trong 48 giờ" nếu đúng) |
| Hành vi xấu gần đây | −20 | Người bán có cờ vi phạm (hủy sau cọc, giao thiếu không báo) trong 90 ngày |

Hòa điểm: lô xác nhận còn hàng gần nhất trước, rồi mã lô tăng dần (ổn định, không ngẫu nhiên).

### 2.5 Gợi ý gom (dạng nhu cầu "cần gom")

Khi không lô nào khớp đủ lượng:
1. Lấy các lô **khớp đủ** và **khớp một phần chỉ vì thiếu lượng**, sắp theo điểm.
2. Tham lam: cộng dần từ lô điểm cao nhất, mỗi nguồn ≥ lượng tối thiểu mỗi nguồn, tối đa 6 nguồn (xuất khẩu 8), ưu tiên các lô cách nhau ≤ 30 km hoặc cùng một điểm gom.
3. Trả về tổ hợp + "đã gom [x]/[y] kg" + điểm gom gợi ý (điểm gom có hợp đồng gần trọng tâm các lô nhất).
4. Bên mua chọn "Mời cả nhóm" → tạo **đơn nhóm** (`03` mục 12.4) với giá chung bên mua nhập (một giá cho cùng loại).

### 2.6 Chiều người bán: "Bên mua đang cần hàng của chị"

Với mỗi lô `dang_ban`, chạy ghép ngược (đổi vai đầu vào), trả danh sách nhu cầu khớp với: tên tổ chức, phân khúc, lượng cần, ngày cần, nơi nhận, uy tín bên mua (mục 5.2). **Không hiện giá tối đa.** Người bán có thể gửi **báo giá kín** tới nhu cầu.

Kèm số cung cầu: "N bên mua đang cần [mặt hàng loại] ở [tỉnh] tuần này" (đếm nhu cầu mở trong 7 ngày, kể cả nhu cầu bị loại bởi H11).

### 2.7 Kênh hàng kém loại

Hồ sơ bên mua `nhan_hang_kem_loai`: danh sách {mặt hàng, loại, lượng tối thiểu, bán kính, giá chào sẵn (tùy chọn)}. Khi có lô kém loại mới, lô con trả lại, hoặc lô bật bán gấp: chạy ghép với các hồ sơ này như các dòng nhu cầu kênh `kem_loai`, gửi thông báo "Có lô [mặt hàng loại] [lượng] cách [km]" (không nêu lý do, không nêu "bán gấp").

Đối tác bao tiêu: luôn có một "nhu cầu thường trực" với giá sàn; app đưa **lời chào bao tiêu** cho người bán khi lô kém loại 24 giờ không ai hỏi.

### 2.8 Khi chạy lại

Sự kiện kích hoạt ghép: `lo.da_dang`, `lo.hien_lai`, `lo.da_tach`, `lo.bat_ban_gap`, `nhu_cau.da_dang`, `nhu_cau.sua`, giấy tờ đổi trạng thái, `giu_luong.het_han` (lượng trở lại), mỗi 6 giờ chạy toàn bộ (uy tín, ngày đổi).

### 2.9 Đầu ra API (mẫu)

```json
{
  "nhu_cau_id": "NC-3001",
  "dong_id": "NC-3001-1",
  "luong_can_con_thieu_kg": 2000,
  "khop_du": [
    {"lo_id": "L-0412", "nguoi_ban": "Nguyễn Thị Năm", "vung": "Cao Lãnh, Đồng Tháp", "loai": "L1",
     "kha_dung_kg": 4000, "da_can": false, "khoang_cach_km": 182, "ngay_co_hang": "2026-11-02",
     "uy_tin": 92, "diem": 86.5, "nhan_gia": "trong_khoang", "ghi_chu": []}
  ],
  "khop_mot_phan": [
    {"lo_id": "L-0415", "nhan_gia": "trong_khoang", "thieu": ["thiếu 1.200 kg"], "diem": 71.0}
  ],
  "gan_khop_gia": [
    {"lo_id": "L-0418", "nhan_gia": "can_thuong_luong", "diem": 64.0}
  ],
  "goi_y_gom": null,
  "so_cung_cau": {"lo_khop_trong_tuan": 7}
}
```

Không trường nào chứa `P_min`, `P_max`, giá lô.

## 3. Giá tham khảo

### 3.1 Công thức (Q18, K09)

`P_tk(mặt hàng, loại, vùng, thời điểm t)` = **trung vị** giá đơn của dòng "đạt" trong các đơn thỏa:
- nghiệm thu đã chốt trong `[t − 30 ngày, t]`;
- cùng mặt hàng, cùng loại (với bảng cỡ: cùng khoảng cỡ mục tiêu; với lúa: cùng giống và cùng ẩm chuẩn);
- cùng **cơ sở giá**: tại vườn/ao/ruộng; đơn giao tại kho chỉ được dùng nếu hợp đồng ghi riêng dòng cước, khi đó quy về tại vườn = giá − cước/kg;
- **loại trừ**: đơn có cờ `gia_bat_thuong`; đơn của cặp đang bị đánh dấu thông đồng hoặc bên liên quan; đơn ngoài app (tự khai); đơn của hợp đồng khung nhà hàng (giá bán lẻ có giao tận cửa); giá nằm ngoài [Q1 − 1,5 × IQR, Q3 + 1,5 × IQR] khi có ≥ 5 đơn.

Vùng: dùng tỉnh nếu tỉnh có đủ điều kiện dưới; nếu không thì toàn vùng ĐBSCL; nếu vẫn không thì "chưa đủ dữ liệu".

**Đủ dữ liệu** khi ≥ 3 đơn từ ≥ 2 cặp mua–bán khác nhau.

### 3.2 Hiển thị bắt buộc kèm số

"Giá tham khảo [mặt hàng loại]: [số] đ/kg · [n] đơn đã chốt · [vùng] · 30 ngày đến [ngày]". Thiếu dữ liệu: "Chưa đủ dữ liệu". Lúc khởi đầu có thể hiện thêm **giá nguồn ngoài** (chợ đầu mối, sở nông nghiệp) với nhãn "Nguồn ngoài · [tên nguồn] · [ngày] · không dùng để tính cọc".

### 3.3 Giá vốn ước tính (phía người bán)

`gia_von_uoc = tổng chi của vụ (sổ thu chi) / sản lượng ước của vụ`. Chỉ hiện khi người bán có ghi thu chi cho vụ đó. Chỉ hiện cho chính người bán.

### 3.4 Nơi dùng

| Nơi | Dùng thế nào |
|---|---|
| Đăng lô | Thước giá: vùng mặt bằng, vạch tham khảo, chấm giá của tôi; gợi ý khoảng giá mong muốn = [0,92; 1,08] × `P_tk`; giá thấp nhất kín mặc định = 90% giá mong muốn |
| Lời chào tới người bán | Giá chào, % so với tham khảo, so với giá vốn |
| Bên mua soạn lời chào | % so với tham khảo; cảnh báo/chặn (mục 4) |
| Lập đơn | Ghi `P_tk` và `P_coc` vào hợp đồng |
| So lời chào (app mua) | Cột "so với tham khảo" |

## 4. Luật chống ép giá (bảo vệ người bán)

| Mã | Luật | Cách thực thi | Phát hiện / chỉ số | Xử lý |
|---|---|---|---|---|
| EG-01 | Giá thấp nhất kín | Lời chào < `P_min` tự từ chối; bên mua chỉ thấy "Chưa tới mức người bán chấp nhận" (không số); không tiêu lượt | — | — |
| EG-02 | Một giá cho cùng loại trong một phiếu | Server kiểm khi gửi; nâng giá một hộ tự nâng mọi hộ cùng loại trong phiếu | — | — |
| EG-03 | Giá chào chỉ tăng trong một phiếu | Chặn gửi giá thấp hơn giá đã chào; đóng phiếu thì 7 ngày không mở phiếu mới cùng mặt hàng + loại với giá tối đa thấp hơn | — | — |
| EG-04 | Chào dưới 80% `P_tk`: cảnh báo bên mua; dưới 60%: không gửi được | Server kiểm | Tỷ lệ lời chào < 80% của tổ chức trong 30 ngày | Chỉ số nội bộ, không hiện nhãn "hay chào thấp" (M15) |
| EG-05 | Tối đa 2 lần trả giá mỗi bên, mỗi lượt 24 giờ | Server | — | — |
| EG-06 | Tối đa 2 lần rút lời chào mỗi phiếu (chống dò giá kín) | Server | Số lần rút | Lần 3 bị chặn |
| EG-07 | Chào vượt lượng ≤ 2 × lượng cần (Q12) | Server | — | — |
| EG-08 | Bán gấp không lộ | Bên mua chỉ thấy "giao được trong 48 giờ" | — | — |
| EG-09 | Lô bán gấp có sàn = giá sàn bao tiêu của mặt hàng + loại | Chặn bật bán gấp nếu `P_min` < sàn; lời chào dưới sàn tự từ chối và gợi ý người bán nhận lời chào bao tiêu | — | — |
| EG-10 | Giá chỉ chốt qua nút | Tin nhắn có số tiền trước khi chốt: hiện nhắc "Số tiền trong tin nhắn không có giá trị. Dùng nút Chào giá." | — | — |
| EG-11 | Không ép giá lúc giao | Màn nghiệm thu không có ô sửa giá; hạ cấp chỉ theo giá hạ cấp đã ký; muốn đổi giá phải là đề nghị | — | — |
| EG-12 | Không khấu trừ ngoài hợp đồng | Quyết toán chỉ có các dòng đã ký; khoản mới phải là đề nghị | — | — |
| EG-13 | Hủy vì giá rớt sau cọc | Cọc về người bán | Tỷ lệ hủy sau cọc của bên mua | Uy tín bên mua |
| EG-14 | Thông đồng nhiều bên mua | — | Nhiều tổ chức bên mua có liên quan (cùng thiết bị, cùng người đại diện, cùng tài khoản ngân hàng) chào cùng mức, cùng khung giờ, cùng mặt hàng/vùng | Đơn nghi vấn không vào `P_tk`; việc P2 cho VH |
| EG-15 | Đồng ý rồi bỏ | — | Tỷ lệ lời chào được người bán đồng ý mà bên mua không lập/ký đơn trong 24 giờ | Uy tín bên mua "đồng ý rồi bỏ"; > 30% trong 30 ngày (≥ 5 lần): giảm thứ tự hiển thị nhu cầu của tổ chức đó |

**M15 · Mâu thuẫn đã giải quyết:** co_che đề xuất người bán thấy cảnh báo "bên mua này thường chào thấp"; brief app bán (bản chốt) cấm gắn nhãn này. v2 theo brief: uy tín bên mua chỉ đo **hành vi** (đồng ý rồi bỏ, hủy sau cọc, trả đúng hạn, hạ loại không căn cứ); tỷ lệ chào thấp chỉ là chỉ số nội bộ cho vận hành.

**Chiều ngược (bảo vệ bên mua):** người bán trả giá > 130% `P_tk` → bên mua thấy "Giá này cao hơn mặt bằng [x]%"; bên mua gấp không lộ, chỉ hiện ngày cần.

## 5. Uy tín

### 5.1 Người bán (0–100)

| Thành phần | Trọng số | Định nghĩa (180 ngày, chỉ đơn trên app) |
|---|---|---|
| Giao đủ | 30 | Σ lượng giao chốt / Σ lượng cam kết (trừ phần giảm do bất khả kháng được chấp thuận) |
| Đúng loại | 30 | 1 − (Σ trả lại + hạ cấp không bị kiểm định bác) / Σ lượng giao |
| Đúng hẹn | 20 | Tỷ lệ đợt giao không bị ghi "giao trễ" |
| Không hủy sau cọc | 20 | 1 − (số đơn người bán xin hủy sau cọc hoặc không giao) / số đơn có cọc |

Người mới (< 3 đơn hoàn tất): không có điểm, hiện "Mới" và điểm ghép mặc định 15/25.

### 5.2 Bên mua (công khai cho người bán)

Hiện **4 chỉ số rời**, không gộp thành một nhãn: trả đúng hạn (%), đồng ý rồi bỏ (%), hủy sau cọc (số lần), hạ loại không căn cứ (số lần kiểm định kết luận bên mua sai). Kèm số đơn đã hoàn tất.

## 6. Luật chống khai giá thấp để né cọc, né phí

| Mã | Luật | Thực thi | Phát hiện | Xử lý |
|---|---|---|---|---|
| KT-01 | Giá tính cọc, tính phí = max(giá khai, 70% `P_tk`) | Tự tính lúc lập đơn, ghi hợp đồng | — | — |
| KT-02 | Giá < 80% `P_tk` hoặc < giá vốn: cảnh báo người bán ở màn đăng, màn nhận lời chào, màn ký | Giao diện | — | — |
| KT-03 | Giá < 60% `P_tk` = giá bất thường: người bán phải tick xác nhận thêm (câu cố định) trước khi ký; đơn gắn cờ | Server chặn ký nếu thiếu tham số xác nhận | Cờ trên đơn | Đơn không vào `P_tk` |
| KT-04 | Theo dõi theo cặp | — | Cặp có ≥ 3 đơn giá bất thường trong 90 ngày, hoặc ≥ 50% đơn của cặp là bất thường (≥ 4 đơn) | Việc P2 cho VH: gọi người bán (không gọi bên mua trước), giải thích quyền lợi; nếu xác định khai thấp có trả ngoài: hạ uy tín cả hai, giảm hiển thị 30 ngày; lặp lại: khóa tạm |
| KT-05 | Câu cố định ở màn ký: "Tiền chỉ được bảo vệ theo đúng giá trên đơn." | Giao diện | — | — |
| KT-06 | Chia nhỏ đơn để dưới ngưỡng phí sàn hoặc dưới ngưỡng liên lạc | — | Cùng cặp, cùng lô, ≥ 3 đơn trong 7 ngày, mỗi đơn < 3.000.000 đ | Việc P3; phí tính gộp các đơn của cặp trong 7 ngày nếu VH xác nhận chia nhỏ |

Lưu ý giới hạn (theo nghiên cứu vận hành): giá thấp có thể là thật (hàng xấu, cần tiền, thị trường dư). Không khóa vì một giá thấp; không đòi sao kê ngân hàng cá nhân.

## 7. Luật chống lách ra ngoài app

| Mã | Luật | Thực thi | Phát hiện | Xử lý |
|---|---|---|---|---|
| LA-01 | Che liên lạc tới khi cọc | Bộ lọc tin nhắn: số điện thoại (0 hoặc +84 và 9–10 số, có thể có dấu cách, chấm, gạch), chữ "zalo", "zl", đường dẫn, email, số tài khoản (8–16 chữ số đứng cạnh tên ngân hàng hoặc "stk"), mã QR trong ảnh | Đếm số lần bị che theo người | Lần 1–2: nhắc; lần 3 trong 30 ngày: giảm hiển thị 7 ngày; ≥ 5: việc P2, VH có thể khóa tạm |
| LA-02 | Phân biệt số tiền với liên lạc (sửa L9 cũ) | Chuỗi có "đ", "đồng", "nghìn", "k", "tr", "triệu" hoặc dấu chấm ngăn nghìn theo nhóm 3 → là số tiền: không che, chỉ nhắc EG-10 | — | — |
| LA-03 | Liên lạc mở theo ngưỡng (Q11) | Sau cọc: đơn ≥ 3.000.000 đ hoặc cặp đã có 2 đơn hoàn tất thì hiện số thật; đơn nhỏ hơn chỉ có nút "Gọi qua app" (số che, cuộc gọi qua tổng đài mô phỏng) | — | — |
| LA-04 | "Chuyển cọc thẳng cho em" | Cụm "chuyển thẳng", "khỏi qua app", "ck riêng" + số tài khoản → che, cảnh báo cả hai "Cọc chỉ được bảo vệ khi chuyển qua app" | Đếm | Như LA-01 |
| LA-05 | Bảo vệ chỉ có trên app | Câu bắt buộc ở màn ký, màn liên lạc, PDF hợp đồng | — | — |
| LA-06 | Mối quen không bị phạt | Gói Thu mua phí 0% từ đơn thứ hai; Miễn phí 0,5% | — | — |
| LA-07 | Ghi đơn ngoài app | Bên mua ghi được đơn ngoài vào sổ (kho, công nợ, bảng kê dòng "tự khai"); không cọc, không uy tín, không vào `P_tk` | — | — |
| LA-08 | Hủy sau cọc rồi mua ngoài | Cọc về người bán | Cặp hủy sau cọc, rồi lô đó báo "đã bán hết" trong 7 ngày | Việc P3; uy tín |
| LA-09 | Lô biến mất sau khi có liên lạc | — | Lô của cặp đã mở liên lạc chuyển `het_hang`/`da_dong` không qua đơn trong 7 ngày | Chỉ số "rò rỉ" theo vùng, mặt hàng; không phạt cá nhân |
| LA-10 | Tài khoản liên quan tự mua bán để làm đẹp uy tín | — | Cùng thiết bị, cùng tài khoản ngân hàng, cùng địa chỉ, cùng người đại diện ở hai phía | Đơn không tính uy tín, không vào `P_tk`; việc P2 |
| LA-11 | Đơn nhỏ để mở liên lạc vườn lớn (N2) | Giải bằng LA-03 | — | — |
| LA-12 | Nhân viên bên mua làm ngoài | Quan hệ thuộc tổ chức; nhật ký thao tác; báo cáo giá mua bình quân theo nhân viên | Nhân viên có tỷ lệ phiếu bị bỏ sau khi mở liên lạc cao bất thường | Báo cáo cho quản lý bên mua |

## 8. Luật chống ép loại khi nghiệm thu

| Mã | Luật | Thực thi | Phát hiện | Xử lý |
|---|---|---|---|---|
| EL-01 | Nghiệm thu tại điểm chuyển rủi ro, người bán chứng kiến (Q02) | Màn nghiệm thu tại vườn cần quét QR từ máy người bán | — | — |
| EL-02 | Trả lại > lỗi cho phép phải có ảnh; mỗi dòng hạ cấp/trả lại có mã lý do của mặt hàng | Server chặn gửi | — | — |
| EL-03 | Mẫu đối chứng niêm phong QR | Bắt buộc với giao xa > 100 km hoặc hàng tươi chở > 6 giờ | — | — |
| EL-04 | Phản đối đúng dòng; dòng khác chốt ngay | Server | — | — |
| EL-05 | Kiểm định bên thứ ba; bên sai chịu phí | `03` mục 8 | — | — |
| EL-06 | Tỷ lệ hạ cấp + trả lại bất thường của bên mua | — | Tỷ lệ của đơn > trung bình 90 ngày của chính bên mua đó với cùng mặt hàng + 2 độ lệch chuẩn (≥ 5 đơn lịch sử), hoặc > 20% khi chưa đủ lịch sử | Cảnh báo người bán ở màn kết quả: "Tỷ lệ hạ cấp/trả lại của đơn này cao hơn thường lệ của bên mua"; gợi ý phản đối dòng; việc P3 cho VH |
| EL-07 | Hạ loại không căn cứ | — | Kiểm định kết luận bên mua sai | Uy tín bên mua (chỉ số công khai); ≥ 2 lần trong 90 ngày: đơn tiếp theo của bên mua đó bắt buộc kiểm tại điểm (cấp 2), phí bên mua trả |
| EL-08 | Đổi giá lúc giao bị cấm | EG-11 | — | — |
| EL-09 | Ngược lại: người bán trộn hàng xấu dưới đáy | Ảnh từng lớp khi bốc (giao xa), mẫu ngẫu nhiên | Tỷ lệ "khác mẫu" kiểm định kết luận người bán sai | Uy tín "đúng loại"; ≥ 2 lần/90 ngày: đơn tiếp theo bắt buộc kiểm tại điểm, phí người bán trả |

## 9. Chống cung giả (lô ảo) và hứa vượt

| Mã | Luật |
|---|---|
| CG-01 | Ảnh lô phải chụp trong app, có giờ và vị trí; ảnh tải từ thư viện chỉ được làm ảnh phụ, gắn nhãn "ảnh tải lên" |
| CG-02 | Lô tự ẩn sau 14 ngày không xác nhận còn hàng |
| CG-03 | Lượng ước tính chỉ cam kết tối đa 80%; người bán giao thiếu 2 lần trong 180 ngày phải "đã cân" mới cam kết |
| CG-04 | Một lô không bán cho hai bên: giữ lượng nguyên tử (khóa dòng) |
| CG-05 | Giấy tờ (VietGAP, mã vùng trồng): trạng thái `tu_khai` cho tới khi VH xác minh với nguồn công bố; chỉ `da_xac_minh` mới qua bộ lọc cứng |
| CG-06 | Lô mới của tài khoản mới (< 30 ngày, chưa đơn nào) có giá trị > 200.000.000 đ: việc P3 cho cộng tác viên địa phương xác minh tại vườn trước khi hiện cho bên mua xuất khẩu |
