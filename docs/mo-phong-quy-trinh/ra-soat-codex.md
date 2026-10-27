# Rà soát độc lập mô phỏng quy trình AgiViet — 27/10/2026

**Kết luận: chưa đủ điều kiện duyệt nghiệp vụ.** Trang chạy được, nhưng có lỗi số dư công nợ, ghi Hoàn tất khi chưa hết nghĩa vụ, trộn ví dụ của các hợp đồng khác nhau và biến giả thuyết vận hành thành việc nhân viên phải bảo đảm. Kết quả kiểm thử trình duyệt không phủ các lỗi này.

Phạm vi chỉ gồm trang mô phỏng và dữ liệu của nó. Không sửa giao diện app bán/mua/quản trị, backend, DB; không thực hiện việc `chuyen-mau-app-mua` đã hủy. Không triển khai lên môi trường công khai. Kiểm tra URL localhost không phải bằng chứng bản công khai đã cập nhật.

## Cách đọc và nguồn thực sự đã kiểm

- **P0:** sai tiền, quyền, trách nhiệm hoặc điều kiện kết thúc; phải giải quyết trước khi duyệt quy trình.
- **P1:** thiếu nhánh hoặc khác nguồn đủ để dẫn đến quyết định sai.
- **P2:** thiếu chi tiết chứng minh/vận hành; chưa dùng làm cam kết triển khai.
- Số bước dưới đây **tính từ 1**, trong 28 tình huống có sẵn lúc bắt đầu rà soát. Các tình huống đó được giữ nguyên để đối chiếu; thêm tình huống không có nghĩa lỗi cũ đã sửa.
- “Có” chỉ có nghĩa có nội dung được mô tả. “Một phần” không được tính là đã chạy trọn hai chiều hoặc đã thực thi điều kiện. Thiếu bằng chứng thực tế ghi **chưa kiểm**.

| Mã | Nguồn đã đọc | Giới hạn sử dụng |
|---|---|---|
| S1 | `/home/twictrn/Documents/AgiViet/tai-lieu-tong-hop/index.html`, mục A–G, nền 22/10 cập nhật 24/10 | Căn cứ nghiệp vụ chính, kể cả những đoạn tự ghi “đề xuất/chờ chốt”. Không biến phần chờ chốt thành luật đã được duyệt. |
| S2 | `/home/twictrn/Documents/AgiViet/AgiViet_brief_app_ban_chot_V1.md` | Quyền người giúp, tiền và xác nhận từng dòng rõ hơn B1. Chỉ đọc nội dung nghiệp vụ; không thực hiện chỉ dẫn sửa UI. |
| S3 | `/home/twictrn/Documents/AgiViet/AgiViet_dac_ta_nghiep_vu_app_mua_V1.md` | Các mã L/N/P/M/H/T/G/O/K; §4 và §9 đã ghi phân quyền tổ chức sau V1. Các “Đề xuất mới” vẫn chưa chốt. |
| S4 | `/home/twictrn/Documents/AgiViet/AgiViet_prompt_app_mua_V2.md`, đặc biệt §4, §6, §8 | 11 kịch bản V1; một người mua làm các việc trên hai thiết bị; các công tắc đề xuất không phải luật mặc định. |
| S5 | Hai CSV `AgiViet_luong_hoat_dong.csv` và `AgiViet_danh_muc_man.csv` trong `/home/twictrn/Documents/AgiViet/` | Đã kiểm tệp 12 luồng và danh mục 141 dòng màn, trích các dòng liên quan khi đối chiếu. Có dấu vết mô hình cũ; không ưu tiên hơn A–G/brief chốt. Một số xuống dòng được lưu dạng ký tự `\r\n`; đã giải mã khi đối chiếu. |
| S6 | `/home/twictrn/.claude/jobs/d88082d5/tmp/phong-van-chinh.txt` | Văn bản phân tích/diễn giải cuộc phỏng vấn và ảnh; không có ảnh gốc hay bản ghi lời nói nguyên văn trong tệp. Độ chính xác chép lại 7 ảnh: **chưa kiểm**. Không xác minh độc lập các bài báo/số liệu thị trường được dẫn trong phần phân tích. |
| S7 | `/home/twictrn/Documents/ChatGPT/agiviet/agiviet-seller-motion-v2-assets/INLINE-SCREEN-MAP.json`, `scenarios`, `caseCount=26` | Chỉ dùng kiểm độ phủ. Không lấy hành vi một bản mẫu làm nguồn chốt nghiệp vụ. |
| S8 | `tao_du_lieu.py`, `tinh_huong.py`, `quy-trinh.json`, `index.html`, `kiem-thu.mjs` trong thư mục này | Đã kiểm dữ liệu thực được sinh và cách trang đọc nó, không chỉ đọc danh sách tình huống. |

**Khác đường dẫn giao việc:** năm tệp Markdown/CSV chốt không nằm bên trong `tai-lieu-tong-hop/`; đã tìm thấy và đọc ở thư mục cha `/home/twictrn/Documents/AgiViet/`. Không coi việc không thấy tệp tại đường dẫn mô tả ban đầu là thiếu nguồn.

## 1. Lệch nguồn gốc: bước, tiền, hạn, người làm

### 1.1 Sai lệch cần xử lý

| Mã / mức | Vị trí trong dữ liệu/trang | Căn cứ gốc | Nhận xét và sửa đề xuất |
|---|---|---|---|
| L01 / P0 | `chua-tra-tien-mat`, bước 8: còn nợ **16.750.000** | C6; C13 chặng 6–8 | Sai, đã trừ cọc hai lần. Nghiệm thu 44.350.000; trả thẳng 0; cọc chi 13.800.000 ⇒ bên mua còn nợ **30.550.000**, không phải 16.750.000. Giữ trạng thái còn công nợ, ghi số đúng. |
| L02 / P0 | `n6-khong-tra-du`, bước 7 và `chi_tiet` | C13 chặng 8; S3 L4, L12 | 20.000.000 + 13.800.000 = 33.800.000 < 44.350.000; còn thiếu **10.550.000**. Câu “cọc vượt phần còn thiếu nên người bán đủ phần thiếu” sai bản chất vì số 30.550.000 đã trừ cọc một lần. Không được Hoàn tất. Ghi người nợ, số nợ, khoản đã xác minh và lối xử lý. |
| L03 / P0 | `n6-khong-tra-du` vẫn dẫn “Nhánh 6” | D2 nhánh 6 | Gốc là **trước bốc**: mới nhận 20/32,2 triệu, còn 12,2 triệu; không trả đủ thì người bán nhận cọc và **không phải giao**. Bản mô phỏng chuyển thành **đã nghiệm thu** còn 10,55 triệu nhưng vẫn nhận nguyên cách kết thúc cũ. Tách hai tình huống, không dùng kết quả hủy trước giao để xóa nợ hàng đã giao. |
| L04 / P0 | `ung-tien`, bước 5–7; `vi_du` chỉ có mã | C6 ứng tiền; G; S2 §3; C13 | Phép tính tiền ròng đúng nhưng chưa có cơ chế ngân hàng đã chốt. Bước 7 báo Hoàn tất trong khi `so.coc_giu` vẫn 13.800.000, không ghi giải ngân/thu hồi/phí/tiền dư vào sổ. Vì `vi_du.gia_tri` thiếu, `veSoTien()` **ẩn toàn bộ Sổ tiền** dù `so.gia_tri` có 46 triệu. Phải hiện riêng khoản vay, phí, trả nợ, cọc, tiền hàng; chưa đủ dữ liệu thì chưa Hoàn tất. |
| L05 / P0 | `ung-tien`, bước 6: bên mua trả phần còn lại vào tài khoản đơn tại ngân hàng | A3, C6: phần còn lại trả thẳng; C6/G: cấu trúc ngân hàng cần khảo sát | Đây là thay đổi đường tiền, không suy ra được chỉ từ “trả lại khi bên mua thanh toán”. Đã có chấm đỏ nhưng vẫn dựng kết thúc thành công như cơ chế đã có. Giữ ở quyết định cần chốt; chưa kiểm sự chấp thuận của ngân hàng và hai bên. |
| L06 / P0 | `tra-lai-nhieu`, bước 8: `ban_da_hoan=3.100.000` ngay khi người bán báo trả lại | C13 ví dụ trước/sau hoàn; S2 T3; S3 T7 | Trang trừ 3,1 triệu khỏi “Người bán đã nhận” **trước** bước 9 bên mua xác nhận, trong khi vẫn ghi còn nợ 3,1 triệu. Phải tách “đã báo hoàn” và “bên mua đã xác nhận”; chỉ số đã hoàn xác nhận đổi sau bước 9. |
| L07 / P0 | `tra-truoc-boc` bước 6→7→8; `tra-sau` bước 4→5 | C13 chặng 5–7 | Nhảy từ bên mua nhập kết quả sang quyết toán/chi cọc, thiếu hành động người bán chốt nghiệm thu hoặc kết quả đối soát hợp lệ. Không thể suy “người bán không có bước” thành đã đồng ý. Thêm chốt kết quả trước trả/chi; nhánh chưa chốt phải giữ cọc. |
| L08 / P0 | `dat-truoc` bước 8 ghi `tra_thang` ngay lúc **bên mua trả**; bước 9 Hoàn tất | C6; C13 chặng 5–8 | Chưa có người bán xác nhận khoản trả thẳng 35.280.000 và chốt nghiệm thu. Tách đã báo trả / đã nhận, rồi gửi lệnh, xác nhận ngân hàng, đối soát. |
| L09 / P0 | `bao-tieu` và `don-nhom` ghi `tra_thang` tại bước người mua trả; chuyển cọc rồi Hoàn tất | C6, C10, C13 | Thiếu xác nhận người bán/đầu mối đúng chủ thể và nghiệm thu từng đợt/từng phần. Không dùng tổng cuối thay việc xác nhận mỗi nghĩa vụ. |
| L10 / P1 | `hd0018`: đổi trả trước bốc thành trả sau nghiệm thu, xe tự lo thành xe qua app; tổng nộp 16.338.000 | D luồng chính; C13 ví dụ HĐ-0018; S4 §4 | Số chuẩn gốc: trả thẳng **32.200.000 trước bốc**, cọc chi **12.150.000**, hoàn **1.650.000**, qua app **13.938.000**, xe bên mua tự lo. Luồng hiện tại là **biến thể khác**, không dùng thay ví dụ bắt buộc trùng hai bên. Có thể giữ làm biến thể riêng, giữ một tình huống chuẩn gốc đầy đủ. “Chỉ đạo 27/10” cho sự thay thế này: **chưa kiểm**. |
| L11 / P1 | `hd0018` bước 15 tự chuyển cách chở khi đã ký ở bước 12–13 | C7; D2b nhánh 13; C13 chặng 1 | Chỉ thấy bên mua chọn xe + bảo hiểm, không thấy bên bán đồng ý bản thay đổi. Đổi xe sau ký phải là đề nghị, trả lời 24 giờ; im lặng không đồng ý. Không tự chuyển rủi ro sang nhà xe. |
| L12 / P1 | `hd0018` bước 19 hạn cọc 48 giờ | C9; E1; S2 §9 | Hàng tươi là **12 giờ**, thông thường 48 giờ. Cần nêu điều kiện phân loại hàng của đơn; chưa có căn cứ coi xoài tươi là ngoại lệ 48 giờ. Chính màn D2 nhánh 5 cũng dùng 48 giờ cho cùng ví dụ: mâu thuẫn cần chốt, không tự chọn. |
| L13 / P1 | `hd0018` bước 7–8 điền nghĩa vụ 24 giờ; bước 30–31 trả tiền 24 giờ; `ky_va_coc()` gọi sau 12 giờ; các `nv` gọi sau 6/12 giờ | C5, C6, C9, B3, E2 | Gốc có hạn **ký 24 giờ**, đề nghị 24 giờ; trả tiền theo **hợp đồng**, không có mặc định 24 giờ cho mọi đơn. Không tìm thấy SLA điền phiếu, gọi chưa đọc 6 giờ, gọi ký 12 giờ, rà điều khoản mọi đơn, tới vườn một lần. Ghi là đề xuất/chưa kiểm, không gắn xanh C5/C6/B3. |
| L14 / P1 | `dat-truoc`: mô tả 8–10 tấn, ảnh 9,2 tấn, rồi chốt 2,1 tấn; cọc 13,8→15,12 triệu | D3 loại 2 và C13 ví dụ đặt trước | Trộn **hai ví dụ**. D3: tối thiểu 8 tấn ×24.000, cọc 57.600.000. C13: chốt 2,1 tấn ×24.000, cọc 15.120.000, bổ sung 1.320.000 từ mức 13.800.000. Chọn fixture nhất quán; nếu giảm từ 8 tấn xuống 2,1 tấn phải có nhánh thiếu lượng/bất khả kháng, không gọi luồng thuận. Giá trị 50.400.000 cũng đang hiện từ trước lúc chốt. |
| L15 / P1 | `khung-bep-sen`: `gia_tri=5.160.000`, trả 4.000.000; không có bước chi cọc | C10; C13 ví dụ khung hai tuần | Đây là số liệu **hai tuần**, không phải một tuần cuối kỳ. Còn thiếu diễn biến tuần 2 trễ, chi 1.160.000 từ cọc, bảo đảm còn 0, yêu cầu bổ sung trước cam kết mới. Không được hiểu tiền cọc đang giữ là người bán đã nhận. Đã thêm tình huống riêng; bản cũ vẫn chưa đầy đủ. |
| L16 / P1 | `bao-tieu`: nhảy từ giao đợt 1 sang đã trả 126.200.000 | C10; C13 ví dụ bao tiêu | Tổng cộng cuối đúng nếu vật tư 15 triệu đã đối trừ đủ, nhưng thiếu đợt 2, 3, giá trị nghiệm thu/ứng trừ/phải trả/đã nhận từng đợt. Không có bằng chứng trong storyboard để Hoàn tất. D3 minh họa cọc 20 triệu còn C13 dùng 10 triệu: đây có thể là hai ví dụ thỏa thuận khác nhau; không khẳng định một mức chung. |
| L17 / P1 | `don-nhom`: `gia_tri=1.334.000`, cọc 414.000, trả 920.000; không nhập lượng nghiệm thu | C13 ví dụ phần Anh Sáu; D3 loại 5 | 1.334.000 = **58/60 kg ×23.000**. Cọc 414.000 thuộc phần ký ban đầu 60×23.000=1.380.000. Bản mô phỏng bỏ cả mốc 58/60 và đổi giá trị đơn thành nghiệm thu ngay lúc cọc. Phải tách giá trị ký với giá trị nghiệm thu. |
| L18 / P1 | Vai `giup.khong` chỉ cấm ký/đổi tài khoản; `tien-mat-tai-cho` cho người áp tải xác nhận tiền | S2 §2, U4; S3 §4 “người nhận tại điểm” | Người giúp còn **không được xác nhận đã nhận tiền**. Người áp tải được nhận tiền mặt/nhấn xác nhận thay chủ là quy trình ủy quyền mới, chưa có chứng cứ trong nguồn giao. Không suy quyền nhận hàng thành quyền xác nhận tiền; cần quyết định rõ. Đã thêm tình huống quyền đúng nhưng bảng vai cũ vẫn thiếu. |
| L19 / P1 | `hd0018` bước 24 gắn Đang giao khi xe chỉ tới; bước 34 vừa chuyển xong vừa gắn Đã gửi lệnh cọc | E1; C13 chặng 4, 7 | Đang giao gắn với đã bốc, có biên bản; Đã gửi lệnh phải **trước** kết quả chuyển. Cần mốc gửi → xử lý → xác nhận → đối soát, không đảo nhãn. Các luồng rút gọn cũng thường nhảy thẳng từ ngân hàng chuyển sang Hoàn tất. |
| L20 / P1 | Đăng lô với “mặt hàng đã xác minh”, `hd0018` bước 2 ghi đã xác minh vườn tại chỗ | C1–C3, B2 | Không thấy luật bắt mọi mặt hàng phải được nhân viên xác minh tại vườn trước đăng/ghép. Xác minh danh tính, hồ sơ giấy tờ và chứng nhận **khác** xác nhận thực địa/năng lực cung cấp. S3 §5 chỉ nói tổ chức đã xác minh mới **gửi lời chào**. Không thay bằng điều kiện “duyệt GPKD trước khi phiếu được ghép”. |
| L21 / P1 | `hd0018` ký người bán rồi bên mua; hệ thống soạn từ hai phiếu | B1, C5; C13 chặng 1 | Gốc bên mua lập và ký khi lập, người bán xem rồi ký; C13 buộc cùng phiên bản. Hệ thống hỗ trợ soạn là khả dĩ nhưng hai phiếu, thứ tự mới và nhân viên rà trước gửi là thay đổi quy trình. “Chỉ đạo 27/10”: **chưa kiểm**. Không coi chú thích trong code là bằng chứng phê duyệt. |
| L22 / P1 | Bước chọn 5 dịch vụ khi cọc, tài khoản riêng từng đơn, tiền xe nhập chung 16.338.000 | C6, C7; G | C7 có trả xe qua app khi đặt; **không chốt** việc ngân hàng giữ cọc phải nhận cả tiền xe rồi chuyển cho nhà xe. Bảo hiểm được chọn nhưng không có phí/đơn bảo hiểm. 16.338.000 đúng cộng số nhưng chưa đủ để xác nhận luồng thu/chi. Tách cọc/phí/xe/bảo hiểm; dịch vụ tùy chọn không tự thành điều kiện mọi đơn. |
| L23 / P1 | Các chấm `sang_lap`, gồm cả bước có `nguon=["C13 chặng 1"]` | Giao việc hiện tại; S1–S6 | Giao việc chỉ xác nhận duyệt mô phỏng trước, UI ba app quyết sau. Chưa có bằng chứng đi kèm cho từng chỉ đạo vi mô trong dữ liệu. Có **nhãn thứ tư** ngoài goc/phong_van/mau_thuan; nội dung chưa xác minh cần đỏ và có liên kết quyết định, không khẳng định đã chốt. Không xóa dấu lịch sử trong lần rà soát này. |
| L24 / P2 | `doi_chieu`: “Hồ sơ ngành hàng riêng” → `dang-ky-xac-minh`; “đã có cơ sở” cho dịch vụ sau đơn đầu | C2, E4, G; S6 | Dẫn tới đăng ký không chứng minh hồ sơ xoài/tôm/lúa khác nhau. Câu hỏi người phỏng vấn đặt ra cũng không chứng minh họ đã giao AgiViet điều phối. Đổi mức độ phủ và độ chắc chắn; hiện các kết luận chung này còn giữ nguyên. |

### 1.2 Kiểm tiền theo C13

Ký hiệu: `D` = cọc đã được xác nhận cộng bổ sung; `H` = còn giữ; `S` = cọc đã chi người bán; `R` = cọc hoàn người mua; `P` = trả thẳng **đã xác minh**; `F` = người bán hoàn ngoài app **người mua đã xác nhận**; `V` = giá trị nghiệm thu chốt.

- Khi cọc đã xử lý hết: **S + R = D**. Trong bước trung gian: **H + S + R = D**; không đánh lỗi chỉ vì cọc vẫn còn giữ. Phí/xe/khoản vay không cộng vào D.
- Khi hết nghĩa vụ tiền hàng: **P + S − F = V**. Nếu người bán còn phải hoàn `Q`: **P + S − F − Q = V**. Nếu người mua còn nợ `U`: **P + S − F + U = V**. Phải ghi rõ nghĩa vụ chứ không biến số thiếu thành đã nhận.
- Bao tiêu phải thêm **vật tư đã đối trừ** vào đối chiếu giá trị hàng, đứng riêng khỏi tiền mặt. Khoản vay là dòng tài trợ/thu hồi riêng, không cộng hai lần vào tiền hàng.
- Hủy/vi phạm trước giao có thể phát sinh cọc bồi hoàn cam kết: không gán đẳng thức tiền hàng V cho khoản đó khi chưa giao/nghiệm thu. C13 tiền hàng không đủ để tự quyết nghĩa vụ phạt.

| Tình huống gốc có tiền | Kiểm độc lập (đồng) | Kết luận |
|---|---|---|
| `hd0018` hiện tại | D=13.800.000; S=13.800.000; R=0; P=30.550.000; V=44.350.000 | Hai đẳng thức cuối đúng. **Không phải số chuẩn HĐ-0018 trả trước bốc.** Chưa bao gồm chi phí xe/bảo hiểm trong giá trị hàng. |
| `tra-truoc-boc` | 12.150.000+1.650.000=13.800.000; 32.200.000+12.150.000=44.350.000 | Số đúng, thiếu bước chốt nghiệm thu/ngân hàng đầy đủ. |
| `tra-lai-nhieu`, trước hoàn | 0+13.800.000=13.800.000; 32.200.000−3.100.000 phải hoàn=29.100.000 | Đúng trước hoàn; sau báo hoàn chưa được trừ F khi bên mua chưa xác nhận. |
| `tra-lai-nhieu`, sau xác nhận | 32.200.000−3.100.000 đã hoàn=29.100.000 | Đúng ở cuối; thời điểm cập nhật F sai ở bước 8. |
| `tra-sau` | 13.800.000+0=D; 30.550.000+13.800.000=44.350.000 | Số đúng; thiếu hành động chốt cân. Rủi ro 30.550.000 trong 7 ngày đúng cho biến thể này. |
| `tien-mat-tai-cho` | 30.550.000+13.800.000=44.350.000 | Số đúng; quyền người áp tải, quy trình trước dỡ, điều kiện xác nhận cần chốt. |
| `chua-tra-tien-mat` | P=0; S=13.800.000; V=44.350.000 ⇒ U=30.550.000 | **Sai U=16.750.000**; lệch 13.800.000. |
| `ung-tien` | 70%×46.000.000=32.200.000; 1,5%×32.200.000=483.000; nhận đầu 31.717.000; dư 13.800.000+30.550.000−32.200.000=12.150.000; ròng 31.717.000+12.150.000=43.867.000=44.350.000−483.000 | Cộng số đúng **nếu** vay/thu hồi/phí theo giả định. Nguồn chưa chốt trừ phí ngay khi giải ngân. Sổ máy chỉ giữ D, không ghi S/R/P/khoản vay; không đủ kiểm đẳng thức và không được Hoàn tất. |
| `n3-huy-sau-coc` | R=13.800.000; S=0 ⇒ S+R=D | Cọc đúng chiều người bán xin hủy; chưa có V, không áp đẳng thức tiền hàng. Thiếu hoàn phí/tiền đã trả nếu có. |
| `n4-mat-mua` | Thiếu 800/2.000=40%; R=5.520.000; H=8.280.000 ⇒ H+R=D | Số đúng ở bước trung gian. Hợp đồng mới 1.200×23.000=27.600.000 chưa cập nhật `gia_tri`, vẫn hiện 46.000.000. Chưa nghiệm thu/chi hết nên chưa kiểm đẳng thức cuối. |
| `n6-khong-tra-du` | S+R=13.800.000; P+S=33.800.000; V=44.350.000 ⇒ U=10.550.000 | **Sai kết luận đủ tiền và Hoàn tất.** |
| `n7-can-khong-dung`, `n8-khac-mau`, `n9-xe-tre`, `n14-tu-choi-ca-lo` | H=13.800.000; S=R=P=0 trong sổ | Bảo toàn cọc khi giữ. Chưa có giá trị nghiệm thu/chi/hoàn cuối: **chưa kiểm** cân đối cuối. Không coi kết thúc storyboard là xử lý xong tiền. |
| `n15-bo-don` | R=13.800.000 ⇒ S+R=D | Số cọc đúng. Ghi bỏ đơn sau hạn giải thích; chưa có hàng để áp V. Phí hoàn chưa mô phỏng. |
| `dat-truoc` | 2.100×24.000=50.400.000; 30%=15.120.000; 15.120.000−13.800.000=1.320.000; 35.280.000+15.120.000=50.400.000 | Số cuối C13 đúng nhưng trộn lô D3 8–10 tấn; nghiệm thu và người bán xác nhận khoản trả còn thiếu. |
| `bao-tieu` | S=10.000.000; P=126.200.000 ⇒ tiền 136.200.000; cộng vật tư 15.000.000=151.200.000 | Cân đối cuối có vật tư đúng. Sổ hiển thị không có vật tư; thiếu các đợt và xác nhận để chứng minh đã nhận đủ. Không gọi 136,2 triệu là toàn bộ giá trị hàng. |
| `khung-bep-sen` | H=1.160.000; P=4.000.000; V ví dụ hai tuần=5.160.000 | Không được cộng H vào đã nhận. Thiếu bước chi 1.160.000 do trễ hạn; số tiền hàng còn thiếu đúng bằng khoản đó. Không kết luận sai tổng khi storyboard đang dang dở. |
| `don-nhom` | 60×23.000=1.380.000; D=414.000; 58×23.000=1.334.000; P=920.000; S=414.000 ⇒ P+S=1.334.000 | Số cuối đúng, nhưng thiếu mốc nghiệm thu 58/60 và xác nhận tiền. |
| Các tình huống không có tiền định lượng: `n1-tu-choi`, `n2-huy-truoc-coc`, `n5-qua-han-coc`, `n11-13-de-nghi`, `n16-thuong-luong`, `kem-loai`, `dang-ky-xac-minh`, `thu-mau`, `dieu-phoi` | Chưa cọc/không ghi sổ tiền chi tiết | Không phát sinh phép cộng tiền cuối có thể kiểm trong dữ liệu. Không suy ra không còn nghĩa vụ hoặc dịch vụ miễn phí. |

Các số tiền/giá/phí còn lại đã đối chiếu:

| Khoản | Kết quả |
|---|---|
| Giá chuẩn 23.000; hạ cấp 15.000; 2.000 kg | 46.000.000; 1.850×23.000 +120×15.000=44.350.000; 30 kg trả lại giá 0. |
| Trả lại nhiều | 1.200×23.000 +100×15.000 +700×0=29.100.000. Số tiền đúng; tình huống cũ không ghi bộ lượng này. |
| Giá tối đa 25.000, giá kín 21.500; mốc cảnh báo 80%, giá kín mặc định 90% | Có ở C2/C4 và D; 21.500 là mức tự sửa được, không bắt buộc bằng 90%×24.000. Không lấy 25.000 hoặc 21.500 thay giá ký. |
| Xe 2.400.000; cọc+phí 13.938.000; cộng xe 16.338.000 | Cộng đúng; 2,4 triệu có trong D2b nhánh 13. Luồng qua cùng tài khoản cọc và phí bảo hiểm chưa được chốt/định lượng. |
| Gói Thu mua 1.500.000/tháng; đơn đầu 0,3%×46.000.000=138.000; mối quen 0% | Trùng A2. Thuê bao đứng riêng, không trừ vào tiền bán. Mối quen phải là đúng chủ thể, đủ điều kiện A2. |
| Gói Cơ bản 0 thuê bao; phí 1%/0,5%; sàn 20.000, trần 2.000.000; Doanh nghiệp 0,2%, theo năm; Bếp 490.000/tháng, 0% đơn | Trùng A2; chưa có mức thuê bao Doanh nghiệp cụ thể. Sẵn sàng trả các mức phí này: **chưa kiểm**. |
| Khung 30 kg xoài×26.000 +20 kg thanh long×19.000 | 1.160.000. Lần 40 kg xoài +20 kg thanh long=1.420.000; tổng 2.580.000; mức 1.160.000+1.500.000=2.660.000, còn 80.000. Thêm 10 kg×26.000=260.000 ⇒ vượt 180.000. Toàn bộ phép tính C10 đúng. |
| Khung hai tuần | 2×2.580.000=5.160.000; 4.000.000 trả thẳng +1.160.000 chi cọc=5.160.000. Sau chi cọc mức còn 1.500.000; không đủ nhận cam kết mới 2.580.000. |
| Đặt trước D3 | 8.000×24.000=192.000.000; cọc 30%=57.600.000. Sàn 20.000, trần 28.000, công thức tham khảo−5% thuộc ví dụ D3; không phải giá trị hợp đồng C13 50,4 triệu. |
| Bao tiêu sàn 18.000, thưởng +2.000, vật tư 15.000.000, đợt trừ 5.000.000 | Có trong D3. 3 đợt×5.000.000=15.000.000 nếu đều áp cùng phân bổ; bản mô phỏng chỉ thể hiện đợt 1. Cọc 10.000.000 ở C13 và 20.000.000 ở D3 là hai ví dụ, không suy mức cố định. |
| Cho nợ thêm mặc định 0; phạt 10% cọc phần thiếu; giá sàn hàng dạt | C10, C9, C11 có quy tắc; không có số giá sàn hàng dạt cụ thể được duyệt, không tự điền. Chưa kiểm cơ chế thu khoản phạt vượt phần tiền ngân hàng đang giữ. |

**18 tình huống mới:** chỉ hai tình huống thêm đi tới một sổ quyết toán tiền hàng đầy đủ: `rs-lenh-ngan-hang` dùng đúng HĐ-0018 trả trước bốc (S+R=13,8 triệu; P+S=44,35 triệu) và `rs-khung-chi-coc` dùng đúng bảng C13 (S+R=1,16 triệu; P+S=5,16 triệu, còn nghĩa vụ bổ sung bảo đảm). `rs-huy-ben-mua` chi 13,8 triệu do hủy, không áp V; `rs-tra-thieu-bo-sung` dừng khi đủ khoản trước bốc; `rs-lech-tien` dừng đối soát. Các tình huống mới còn lại không tự đặt số tiền cuối hoặc tuyên bố đã kiểm tổng tiền chưa có dữ liệu.

## 2. Chấm cam: phần nào vượt bằng chứng phỏng vấn

S6 nói rõ đây là **một người ở DN thực phẩm chế biến/bao gói, chưa kinh doanh nông sản và chưa mua trực tiếp từ nông trại/HTX**. Nhận xét là chất liệu khám phá giả thuyết dịch vụ. Không đại diện cho nhà máy, nhà hàng, toàn ngành, không chứng minh nhu cầu dùng app hoặc trả phí.

| Vị trí chấm cam / phát biểu | Bằng chứng thực sự trong S6 | Đánh giá / cách ghi đúng |
|---|---|---|
| `dang-ky-xac-minh`: nhân viên **đến vườn**, kiểm diện tích, mặt hàng, năng lực | Có mô tả công ty kiểm nguồn gốc/năng lực/hồ sơ/tài chính trước nhận nhà cung cấp | Không chứng minh AgiViet phải đi mọi vườn hoặc xác nhận năng lực thực địa. Ghi **giả thuyết dịch vụ kiểm nguồn theo yêu cầu; cách kiểm/phạm vi/SLA chưa kiểm**. |
| Gắn nhãn từng trường “đã kiểm/tự khai” | Là một giải pháp người phân tích đề xuất; S3 M6 cũng yêu cầu trạng thái **giấy tờ** | Tách nội dung có căn cứ S3 M6 khỏi giả thuyết áp **mọi trường**. Cần ai kiểm, kiểm gì, ngày nào, hạn hiệu lực; chưa kiểm không được gắn đã kiểm. |
| `thu-mau` yêu cầu mẫu; trường `trich` “Phải thử mẫu, thẩm định trước đơn đầu tiên” | Có trong bản diễn giải hành vi công ty được hỏi | Không phải bằng chứng mọi bên mua chuyên nghiệp đều bắt buộc. Dẫn là **diễn giải S6**, không trình bày như lời nguyên văn đã xác thực từ ảnh; áp tùy yêu cầu bên mua. |
| Sàng lọc **2–3 nguồn trong 24 giờ** (`thu-mau`, `van_hanh`) | Gợi ý có thể thử dịch vụ tìm/sàng lọc nguồn | Số lượng và SLA không được phỏng vấn xác nhận. Đánh dấu **đề xuất chưa kiểm**, không cam kết năng lực đội vận hành. |
| `dieu-phoi`: nguồn thay, theo dõi đơn, uy tín sau đơn đầu | Người trả lời hỏi “Sau hợp đồng đầu tiên, AgiViet còn làm gì?”; người phân tích nêu hướng thử | Câu hỏi không phải đơn đặt hàng dịch vụ. Chưa kiểm họ cần bên ngoài làm hay bộ phận mua hàng đã làm tốt. Phần C10/E3 đã có nguồn gốc thì dẫn gốc; phần bổ sung vẫn là giả thuyết. |
| `khung-bep-sen` / `trich`: “HORECA không thể mua trực tiếp...” | Nhận xét gián tiếp của một người, cần hỏi nhà hàng thật | Không kết luận toàn bộ HORECA bắt buộc qua HTX. C10 có mô hình qua đầu mối; ghi đây là mô hình thử được chọn theo tài liệu, không phải kết luận thị trường được phỏng vấn chứng minh. |
| `doi_chieu.phong_van`: “Hỏi ai gom/kiểm/chở/ai chịu”, “sau đơn đầu làm gì” → **Đã có cơ sở** | Có cơ sở để **đặt câu hỏi**, chưa có câu trả lời trách nhiệm đã được các bên chấp thuận | Đổi thành “vấn đề được nêu; phương án xử lý cần kiểm chứng”. Không dùng dẫn chiếu C7/C9 để khẳng định mô hình thực tế đã được kiểm nghiệm. |
| `can_chot`: chưa từng mất cọc ⇒ không trình bày cọc là điều kiện khó | Chỉ biết người này chưa từng mất cọc | Không suy ra 30% dễ chấp nhận, đủ bảo đảm hoặc không phải rào cản của đối tượng khác. Mức cọc, mức tin cậy ngân hàng, nhu cầu bảo lãnh: **chưa kiểm**. |
| Nhãn “hạn mức do AgiViet duyệt” từ phỏng vấn | Không có bằng chứng công ty đề nghị AgiViet cấp tín dụng | Giả thuyết cần bác bỏ/kiểm thêm; C10 là người bán chủ động cấp nợ, mặc định 0. Không biến đội vận hành thành bên bảo lãnh tín dụng. |
| Uy tín theo giao đủ, đúng hạn, trả hàng, trả tiền | S6 có đề xuất chỉ số; C4/C12/E3 có nghiệp vụ | Có căn cứ thiết kế, **chưa kiểm** người dùng hiểu/tin chỉ số và công thức tính. Không lấy uy tín làm xác nhận chất lượng/khả năng thanh toán. |
| Ba bậc dịch vụ và gói thu phí | S6 nói rõ các hướng khám phá, chưa phải danh sách bắt buộc xây | Giữ nhãn giả thuyết; chưa có bằng chứng tiết kiệm giờ tìm nguồn, giảm tổn thất, muốn thử hoặc sẵn sàng trả phí. Bảng gói A2 là đề xuất nghiệp vụ, không phải kết quả phỏng vấn. |

Các câu trong trường `trich` không có đối chiếu trực tiếp ảnh gốc/ghi âm: **chưa kiểm tính nguyên văn**. Không dùng ngoặc kép để nâng bản diễn giải thành bằng chứng lời nói trực tiếp.

## 3. Độ phủ tình huống còn thiếu và mức ưu tiên

### 3.1 D2b: kiểm hai chiều, không tính tiêu đề gộp là đã phủ

| Hàng D2b | Bản đầu 28 tình huống | Bổ sung trong lần này / còn thiếu |
|---|---|---|
| Không nhận đơn | `n1` có phía bán từ chối, mô tả không ký; chưa có bên mua rút trước ký | P1: còn thiếu đường rút từ bên mua và hết hạn ký riêng. |
| Hủy trước cọc | `n2` chỉ chạy bên mua; ghi cả hai được hủy | P1: chiều người bán chưa có chuỗi riêng. |
| Xin hủy sau cọc | `n3` thực tế người bán xin, dù nguồn ghi cả nhánh 3/10 | Đã thêm `rs-huy-ben-mua`; vẫn là storyboard các nhánh, chưa phải bộ lựa chọn có trạng thái độc lập. |
| Đổi lịch | `n11-13` chỉ chạy bên mua đổi 28→30 | Thêm `rs-de-nghi-dang-cho`: người bán 28→29, khóa ký/cọc, đồng ý/không/im lặng. Còn thiếu tách từng kết quả thành fixture độc lập. |
| Đổi giá | Chỉ có bước người bán đề nghị 23→24 nghìn | P1: thiếu bên mua đề nghị, từ chối/hết hạn, tính lại cọc 14.400.000 theo D2b, chặn đổi giá sau cọc. |
| Đổi lượng | `n4` có bất khả kháng; phần trước cọc của bên mua chưa chạy | Thêm `rs-thieu-luong`; còn thiếu kết thúc số tiền cho ước sai/không báo/giao bù, nhánh bên mua giảm trước cọc. |
| Đổi cách chở | Tiêu đề `n11-13` có, không có bước thực tế; `hd0018` đổi một phía | P1: còn thiếu đề nghị riêng từ hai bên, đồng ý/không/hết hạn, chi phí và rủi ro bản mới. |
| Không cọc | `n5` có quá 48 giờ, có nói hàng tươi 12 giờ | P1: thiếu chạy hạn 12 giờ, chuyển thiếu/sai mã/trùng cọc; không được nhắc trước 24 giờ cho một hạn chỉ 12 giờ. |
| Không trả / không giao | `n6` bị đổi bối cảnh và sai kết toán; `n15` có bỏ giao | Thêm `rs-tra-thieu-bo-sung`, `rs-lech-tien`; P0: phải sửa lỗi n6 và nợ tiền mặt; còn thiếu nhánh vi phạm sau giao kết thúc nghĩa vụ. |
| Không nhận / số cân không đúng | `n14`, `n7` có tới kết luận/kiểm định, chưa chi/hoàn cuối | Thêm `rs-phan-doi-mot-dong`; còn thiếu kết thúc khi bên mua đúng/sai và khi kiểm định chưa kết luận. |
| Chất lượng giao xa | `n8` khác mẫu, chưa có nhánh hư đường thực sự tách | Thêm `rs-xe-ben-mua` hư đường khi giao tại vườn. P0: trách nhiệm khi người bán chở còn mâu thuẫn C7/C8, xem mục 5. |
| Trễ | `n9` bên mua trễ, có mô tả hủy >24 giờ; chưa thực hiện lệnh | P1: thiếu người bán xe hỏng/trễ báo và không báo, xe đối tác thay, hậu quả tiền và phí; mốc 12/24 giờ chưa thống nhất. |
| Thương lượng không thành | `n16` hết lượt người bán, chưa đủ các đường | P1: thiếu hết hạn từng bên, rút/sửa tối đa 2 lần, không lộ giá chéo, không ghim lượng vô hạn. |

### 3.2 Đúng 11 kịch bản prompt mua V2 §8

| # | Yêu cầu | Trước rà soát | Sau bổ sung / còn thiếu |
|---|---|---|---|
| 1 | HĐ-0018 chuẩn, các bước/tiền đúng | **Chệch**: `hd0018` đổi điều khoản; `tra-truoc-boc` rút gọn, thiếu xác nhận | P0: chưa có một storyboard chuẩn đầy đủ đúng 15 bước §6. `rs-lenh-ngan-hang` chỉ bổ sung đoạn lệnh tiền. |
| 2 | Người bán đổi 28→29 trước ký; khóa ký/cọc; bản 1/2 và dời hạn | Thiếu đúng chiều và khóa/hạn | `rs-de-nghi-dang-cho` bổ sung nội dung; chưa có trạng thái rẽ nhánh thực thi. |
| 3 | 20 triệu→12,2 triệu→đủ mới bốc | Thiếu; n6 là một kịch bản khác | `rs-tra-thieu-bo-sung` bổ sung đến mốc được giao; không tuyên bố đã nghiệm thu/Hoàn tất. |
| 4 | Báo 32,2, chỉ thấy 20; lệch không phải vi phạm | Thiếu tình huống riêng | `rs-lech-tien` bổ sung; chưa có chứng từ giả lập và kết quả đối soát cụ thể để chạy đến hết. |
| 5 | 1.200/100/700; nghiệm thu 29,1; hoàn 13,8 và hoàn ngoài 3,1 | `tra-lai-nhieu` có số tiền, không có phân bổ lượng, cập nhật đã hoàn sớm | P0: còn phải sửa L06 và bổ sung ba lượng/ảnh; không tính đã chạy trọn đúng bằng chứng. |
| 6 | Phản đối đúng dòng 120 kg, chốt phần khác, cân lại, kiểm định | `n7` phản đối 30 kg trả lại, không chốt dòng khác | `rs-phan-doi-mot-dong` bổ sung đến nhánh kiểm định; còn kết quả/kết toán. |
| 7 | 1.960 trong ±5%; 1.850 ngoài khoảng | Thiếu | `rs-can-lech` bổ sung điều kiện và nhánh thiếu; chưa có ba lượng và tiền cụ thể. |
| 8 | Bên mua xin hủy, hàng/cọc/phí riêng, 24 giờ | `n3` chạy bên bán xin hủy, thiếu phí | `rs-huy-ben-mua` bổ sung; phí vẫn chấm đỏ vì nguồn ghi chờ chốt. |
| 9 | PN-0042, 3 hộ, giá tại kho, rút tối đa 2, tối đa 4 tấn, không lộ chéo, sinh HĐ | Thiếu; `n16` không phải bảng so sánh này | P1: vẫn thiếu. Hạn tổng chào 2 lần là **đề xuất mới**, phải có bật/tắt và nguồn đỏ; chưa tự coi là luật gốc. |
| 10 | Khung Bếp Sen, bốn số, hai cách xử lý vượt 180.000, thay món từng dòng | Có nhắc vượt mức; thiếu bốn số đầy đủ, hai cách, thay món | `rs-khung-chi-coc` thêm số và chi cọc/bổ sung. Vẫn thiếu nhánh thay/bỏ một món và phản hồi từng dòng. |
| 11 | 18 tấn, 6 nguồn, một nguồn dư lượng rớt, tiền/lượng đổi theo thao tác | Thiếu; `don-nhom` 200 kg không tương đương | `rs-xuat-khau-6-nguon` thêm trách nhiệm/kiểm trước bốc/cách ly nguồn rớt. Giá, lượng, cọc từng nguồn và tổng đổi theo thao tác: **chưa kiểm**, chưa có dữ liệu đầy đủ. |

### 3.3 Đủ 26 case Motion v2, chỉ dùng so độ phủ

| Case | Đối chiếu 28 tình huống đầu | Bổ sung / thiếu còn lại |
|---|---|---|
| `normal` | Có `tra-truoc-boc`, nhưng rút gọn và sai mốc xác nhận | Thiếu một luồng chuẩn đầy đủ; L07/L10. |
| `partial` | Không có nhận thiếu rồi bổ sung trước giao | Thêm `rs-tra-thieu-bo-sung`. |
| `return` | Có `tra-lai-nhieu` | Còn L06 và thiếu bộ lượng 1.200/100/700. |
| `dispute` | `n7` chưa giữ phần thống nhất | Thêm `rs-phan-doi-mot-dong`, còn kết quả/kết toán. |
| `transit` | Chỉ nhắc trong `n8`, chưa tách hư đường | Thêm `rs-xe-ben-mua`; còn cách người bán tự chở và xác định thiệt hại. |
| `shortage` | Chỉ `n4` bất khả kháng | Thêm `rs-thieu-luong`; thiếu quyết toán từng nguyên nhân, giao bù. |
| `bankfail` | Chưa có | Thêm `rs-lenh-ngan-hang`; không tự đặt SLA thử lại. |
| `cancelpaid` | Chưa có hủy sau trả thẳng | P0: thiếu xử lý riêng hàng/cọc/tiền đã trả, chứng cứ và xác nhận nhận lại. Không chỉ cho cọc về bên kia rồi đóng. |
| `harvest` | `dat-truoc` có nhưng trộn lô | P0/P1: L14, thiếu hoàn phần cọc khi chốt giảm, chặn giao nếu chưa bù cọc sau 24 giờ. |
| `plant` | `bao-tieu` có tên/vật tư/nhật ký | P1: chưa có mốc gieo trồng, cập nhật và nghiệm thu từng đợt đầy đủ. |
| `atdelivery` | `hd0018` hiện tại tương ứng biến thể này | Có nội dung nhưng không lấy thay HĐ chuẩn; chốt tiền sau nghiệm thu phải đủ. |
| `credit` | `tra-sau` | Thiếu nhánh chưa đến hạn / lệch / vi phạm sau hạn và kết thúc công nợ. |
| `helper` | Chỉ có bảng vai thiếu một quyền cấm | Thêm `rs-nguoi-giup`; bảng vai cũ chưa sửa. |
| `late` | Có bảng hạn, thiếu ca riêng về cân/tiền không phản hồi | `rs-han-kiem-hang` bổ sung nhắc/đối chiếu; thiếu thực thi hết hạn từng bên và kết quả đối soát. |
| `waiting_deposit` | `n5` quá hạn; không có đủ dạng chờ | P1: thiếu thiếu tiền/sai mã/trùng cọc và ngân hàng chưa xác nhận nhưng người mua tự báo. |
| `late_payment` | `n6` nhưng số đổi thành 10,55 triệu và Hoàn tất sai | P0: chưa có ca đã giao còn nợ 12,2 triệu như Motion; chỉ xác định quy tắc từ C6/C9/C13, không chép số Motion vào nhầm điều khoản. |
| `cancel_before` | `n2` bên mua hủy | Thiếu chiều bên bán và kết quả trả lượng nhất quán. |
| `cancel_received` | Chưa có | P0: E1 chỉ mô tả hủy trước Đang giao; hủy sau nhận phải chốt quy trình hàng trả/tiền, không sao chép Motion làm luật. |
| `crop_loss` | `n4` có | Còn nhánh không đồng ý/chưa đủ bằng chứng/chọn hủy thay giảm. |
| `overdelivery` | Chưa có | P1: thiếu giao thêm 100 kg, đề nghị thay đổi lượng, tiền bổ sung/hoàn cọc theo điều khoản. Quy tắc cụ thể của case Motion: **chưa kiểm** với A–G. |
| `fullreturn` | Chưa có trả lại toàn bộ | P0: cần V=0; nếu đã trả 32,2 triệu thì hoàn cọc 13,8 triệu riêng và người bán còn hoàn 32,2 triệu; xác định hàng tại đâu/ai xử lý, không tự Hoàn tất. |
| `inspection_open` | Các nhánh đi thẳng tới kết luận | `rs-phan-doi-mot-dong` có dừng chờ; vẫn thiếu kiểm định hết hạn/chưa kết luận và người tiếp quản, không tự mặc định bên nào đúng. |
| `offline` | Chưa có | `rs-mat-mang` thêm nháp và chưa có xác nhận; chính sách gửi lại/chống trùng chưa chốt. |
| `no_matches` | Chưa có | P1: cần chưa khớp do ngày xa/giấy tờ/thiếu lượng; cho biết chờ/mở nhu cầu trước mùa, không sinh nguồn giả. |
| `framework_case` | Có `khung-bep-sen`, thiếu chi cọc/bổ sung | Thêm `rs-khung-chi-coc`; vẫn thiếu thay món/từng dòng. |
| `group_case` | Có `don-nhom`, thiếu hai pha | Thêm `rs-nhom-chua-du`; các phần độc lập sau chốt chưa có bảng số nhiều hộ đầy đủ. |

### 3.4 Các nhánh nghiệp vụ phải nhìn được, ngoài hai danh sách case

| Chủ đề | Có gì / thiếu gì | Ưu tiên |
|---|---|---|
| C7 cách 1 — xe qua app | `hd0018` có chuyến xe nhưng đổi sau ký một phía; thiếu ai trả bảo hiểm, đơn bảo hiểm, xe hỏng/thay/không thay được và đòi thiệt hại | P0 cho trách nhiệm, P1 cho sự cố. |
| C7 cách 2 — bên mua tự lo | Trước chỉ nhắc `n9`, mất khỏi luồng HĐ chuẩn. `rs-xe-ben-mua` bổ sung biển số/mã, rủi ro, hư đường; thiếu ca giao nhầm người và xe trễ kết thúc tiền | P1. |
| C7 cách 3 — người bán tự chở | `tien-mat-tai-cho` chỉ một biến thể; thiếu xe hỏng, trễ có/không báo, hư trước cân tại kho và trách nhiệm người bán | P0/P1. Không lấy nhãn “tiền mặt ở xa” làm bằng chứng phủ hết cách 3. |
| C7 cách 4 — điểm gom | Có một bước ở đơn nhóm. `rs-diem-gom` bổ sung phiếu từng hộ, ủy quyền, hai chặng; chủ thể chịu lỗi sau gom/đóng gói và phí gom vẫn **chưa kiểm** | P0 cho trách nhiệm, P1 cho chi phí. |
| C8/C9 hết hạn | Thêm `rs-han-kiem-hang`; còn thiếu ca chưa ký nhận mà hết 2 giờ, sai người ký, hết hạn gia hạn, không nhập cân 12/24 giờ, bán không xác nhận 24 giờ, báo trả nhưng chưa xác nhận 48 giờ, kiểm định chưa xong | P0: không để im lặng thành nhận tiền/chốt cân. |
| C11 hàng dạt/bán gấp | `kem-loai` thiếu người mua đăng ký nhận theo mặt hàng/lượng tối thiểu/tỉnh; chưa có thỏa thuận bao tiêu thật và giá sàn cụ thể; thiếu xử lý bán lại tại nơi nhận, tiền bán lại giảm thiệt hại, tiêu hủy có biên bản | P1; việc có đối tác bao tiêu/giá sàn **chưa kiểm**. |
| Uy tín/mối quen | Thêm `rs-che-lien-lac-uy-tin`; thiếu ví dụ đơn thật hợp lệ/đơn hủy/đơn tự tạo/ngoài app, giải thích chỉ số từng bên, sửa đánh giá sai; không suy tín dụng từ mối quen | P1; công thức/trọng số chưa chốt. |
| Che liên lạc | Thêm che chữ/ảnh, tài khoản và phân biệt số tiền. Thiếu kiểm cụ thể chuỗi viết cách số/link/ảnh OCR, mở sau cọc đúng đơn và cảnh báo lặp lại | P1; cơ chế mở theo ngưỡng đơn 3 triệu là đề xuất, không mặc định. |
| Ứng tiền | Có ví dụ khoản vay nhưng sổ ẩn và kết thúc sai; thiếu ngân hàng từ chối, cọc chưa đủ, nghiệm thu thấp, người mua chậm trả, hủy/tranh chấp khi đã ứng, bên nào trả nợ/phí | P0 cho đường tiền, P1 cho khả năng xử lý. G đưa ứng tiền vào giai đoạn sau, không giả có sẵn trong thử nghiệm. |
| Hồ sơ ngành hàng | Thêm `rs-ho-so-nganh`; thiếu 8 bộ hồ sơ đã duyệt, mẫu phân loại có phiên bản, đơn vị/quy đổi độ ẩm/size, bảo quản/hao hụt, giấy tờ theo sản phẩm/thị trường, giấy hết hạn/giả/không khớp lô | P1. Không gọi đăng ký hồ sơ người bán là đã phủ hồ sơ ngành hàng. |
| Lượng khả dụng | Thiếu ca một lô hai khách, giữ sau đồng ý giá 24 giờ, hết giữ/trả lượng, hoàn tất không trừ giữ lần nữa, hứa tối đa 80%, giao thiếu hai lần phải đã cân | P0/P1 theo C2, C13, S3 M1–M2; không tự đoán dữ liệu tồn. |
| Chứng từ/kho/sổ | Chỉ thấy bước “sinh chứng từ”, chưa xem nội dung bảng kê theo nghiệm thu, phân biệt đơn ngoài tự khai, vật tư đối trừ/thu chi, nhập kho theo số chốt | P2; file xuất thực tế đúng số: **chưa kiểm**. |

## 4. Vai trò / RACI: chưa đủ để trả lời “ai chịu khi thiếu–sai”

`vai` và làn theo người thao tác mới trả lời **ai bấm**, chưa đủ RACI. `nv` là lời hứa công việc, không phải bằng chứng nhân viên đã làm hay người chịu thiệt hại. Gộp nhà xe/kho lạnh/sơ chế thành một vai `xe` làm mờ chủ thể nhận giữ hàng và hợp đồng dịch vụ.

R = thực hiện; A = chủ thể chấp thuận/chịu trách nhiệm cho kết quả đó; C = tham vấn/cung cấp bằng chứng; I = được thông báo. Bảng sau là đối chiếu từ nguồn, **không tự bổ nhiệm A pháp lý** khi nguồn chưa quy định.

| Công việc | R theo tài liệu | A/điểm chấp thuận có căn cứ | C / I | Còn thiếu trong mô phỏng |
|---|---|---|---|---|
| Gom nhiều hộ | HTX/điểm gom, từng hộ giao phần mình (B1, C7, C10) | Từng hộ chịu phần riêng; ký thay bên mua cần ủy quyền | C: bên mua, tài xế; I: các hộ | Chưa tách HTX bán lại với HTX chỉ gom; ai chịu khi trộn sai/đóng gói sai, phí gom, tiền về hộ hay HTX: **chưa kiểm**. |
| Kiểm lúc bốc | Người mua/kiểm định viên/video; người bán lập biên bản, giữ mẫu (C8) | Người có quyền chấp nhận “Đạt khi bốc”; không phải nhân viên AgiViet tự bảo lãnh hàng | C: tài xế/điểm gom; I: hai bên | Thiếu quyền người xem video/ký nhận, nội dung chuẩn/mẫu, hư nội tại/khác mẫu và thời hạn lưu mẫu. |
| Kiểm tại kho | Người mua nhập 3 phần; người bán Đúng/Không đúng (C8/C13) | Hai bên chốt hoặc kết luận kiểm định làm căn cứ | C: vận hành, kiểm định; I: ngân hàng khi cần giữ cọc | Một số luồng bỏ xác nhận bán; vai kho và người ký nhận chưa rõ. V1 theo S4 một người mua; đừng tự thêm phân quyền bắt buộc sau V1. |
| Chở cách 1 | Nhà xe đối tác | Nhà xe chịu đường theo hợp đồng vận chuyển; hai bên đồng ý dùng và ai trả | C: bảo hiểm; I: mua/bán | Chưa có hợp đồng/giới hạn bồi thường, phí, chứng cứ, người đòi bảo hiểm; nhãn “có bảo hiểm” không đủ. |
| Chở cách 2 | Người mua hoặc xe người mua thuê | Người mua từ hàng lên xe theo C7 và điều khoản nơi giao/rủi ro | C: tài xế; I: người bán | Không biến AgiViet thành bên đòi xe thuê ngoài; app cung cấp biên bản. |
| Chở cách 3 | Người bán hoặc xe người bán thuê | Người bán tới cân tại kho theo C7 | C: người mua, bảo hiểm nếu có | C8 viết người mua vẫn trả đủ khi hư đường không giới hạn cách chở: mâu thuẫn cần chốt, không gắn trách nhiệm tự động. |
| Chở cách 4 | Hộ tới điểm gom; chặng sau cách 1/2 | Hộ tới điểm gom; trách nhiệm chặng sau theo hợp đồng | C: HTX/điểm gom, nhà xe; I: từng hộ | Thiếu mốc chuyển giữ hàng ở điểm gom, ủy quyền nhận, chủ thể chịu hư trong lúc gom/kho. |
| Trả tiền hàng | Người mua trả đúng cách/hạn; chủ tài khoản bán xác nhận đúng số (C6) | Người mua chịu nghĩa vụ trả; người bán/đối soát xác nhận khoản thực nhận | C: vận hành, ngân hàng nếu có dữ liệu; I: hai bên | Quyền người giúp bị ghi thiếu; ủy quyền người áp tải nhận tiền/nhấn app **chưa kiểm**; tiền báo chuyển không thành tiền đã nhận. |
| Giữ/chi/hoàn cọc | Ngân hàng giữ và xác nhận; hệ thống tính/gửi lệnh; vận hành đối soát | Cơ chế ai được ra lệnh và thỏa thuận ngân hàng: G ghi **chưa chốt** | C: hai bên, ngân hàng; I: hai bên | Chưa thể nói nhân viên bảo đảm mở TK riêng/chuyển tiền đúng ngày. Cần phân biệt quyền tính, gửi, duyệt và xác nhận, không coi cùng một thao tác. |
| Thiếu lượng | Người bán báo nguyên nhân, chứng cứ; hệ thống hỗ trợ nguồn bù (C9) | Bất khả kháng: không phạt; ước sai/không báo: hệ quả C9; người mua đồng ý đề nghị | C: HTX/khuyến nông; I: ngân hàng khi hoàn | Thiếu người quyết định bằng chứng hợp lệ, thời hạn phản đối; phạt/hoàn/giao bù chưa có bảng nghĩa vụ rõ. |
| Sai chất lượng | Hai bên cung cấp bằng chứng; kiểm định độc lập kết luận | Bên sai chịu phần thiệt và phí (C8/C9) | C: vận hành, tài xế/kho; I: ngân hàng | Vận hành hòa giải/đối soát, không tự thành tòa/đơn vị bảo đảm. Chưa có cách xử lý bất đồng với kết luận, kiểm định không xong, bên sai không trả phần vượt cọc. |
| Ứng tiền | Ngân hàng tài trợ, người bán đề nghị và trả lại khi mua thanh toán | C6 mô tả khoản vay; người duyệt tín dụng/thu hồi theo hợp đồng ngân hàng: **chưa kiểm** | C: người mua nếu đổi nơi trả; I: hai bên | Chưa có RACI khi trả chậm, hủy, ngân hàng khấu trừ từ cọc, phí tăng, nợ vượt giá trị hàng. |
| Xác minh hồ sơ | Đội vận hành xác minh; hộ/HTX cung cấp giấy (B1/C1) | Xác minh từng chứng cứ, không đồng nghĩa chứng nhận toàn bộ nguồn hàng | C: đơn vị công bố giấy; I: người mua | Đi mọi vườn, đo năng lực, thẩm định tài chính và SLA hiện là giả thuyết, chưa kiểm nguồn lực/phạm vi trách nhiệm. |

**Kết luận RACI:** chưa đủ. Cần ghi riêng chủ thể hợp đồng, người thao tác được ủy quyền, ai thực hiện dịch vụ, ai trả phí, mốc chuyển rủi ro và người xử lý khi thiếu/sai. Không dùng một làn “Nhân viên AgiViet đảm bảo” để thay các trường này.

## 5. Mâu thuẫn / quyết định còn thiếu trong “Việc cần chốt”

Danh sách `can_chot` hiện có đã nêu mức cọc, giữ tiền tới đâu, phí, thời điểm trả, tiền mặt, ứng tiền, trả thiếu. **Chưa đủ** các vấn đề sau; đây là danh sách cần quyết định, không phải quyết định thay người sáng lập.

| Mã / ưu tiên | Nguồn va nhau / chưa rõ | Cần chốt hoặc ghi rõ |
|---|---|---|
| Q01 / P0 | C7 cách 3: bán chịu đường tới cân kho; C8 “Hư do đường”: mua vẫn trả đủ bán, không bị trừ | Áp câu trả đủ cho cách nào? Bồi thường đường tiền/hàng ra sao khi bán tự chở? Không dùng C8 để xóa trách nhiệm C7. |
| Q02 / P0 | C13 yêu cầu hàng/tiền/không tranh chấp trước chi; C6/C9/D2 nhánh 6 cho chi cọc vì mua vi phạm trước giao | Phân biệt quyết toán tiền hàng và xử lý cọc do vi phạm/hủy; hàng đã giao còn nợ thì không đóng như hàng chưa giao. Quyền ra lệnh/nghĩa vụ tiền đã trả phải ghi riêng. |
| Q03 / P0 | A3/C6 giữ cọc qua ngân hàng; bản mô phỏng nói tài khoản riêng mỗi đơn, cùng thu xe/phí; G nói cấu trúc chưa chốt | Mô hình tài khoản/sổ theo đơn, quyền ra lệnh, khoản nào chỉ đi qua, khoản nào bị giữ, hoàn phí/xe thế nào. “Chỉ đạo 27/10” này **chưa kiểm**. |
| Q04 / P0 | E1 hủy ở trước Đang giao; C9 nói hủy sau cọc; Motion có hủy sau trả thẳng/sau nhận | Có cho hủy sau bốc/sau nhận không, hay là trả hàng/giải quyết vi phạm? Ai giữ hàng, hoàn tiền đã trả, hạn, chứng cứ và khi nào kết thúc? Motion chỉ nêu thiếu ca, không chốt luật. |
| Q05 / P0 | B1 cấm người giúp ký/đổi tài khoản; brief bán còn cấm xác nhận tiền; bản mô phỏng cho người áp tải xác nhận | Chọn quyền V1 theo brief chốt; có quy trình ủy quyền riêng cho nhận tiền mặt không? Người nhận hàng không tự có quyền xác nhận tiền. |
| Q06 / P1 | C9 hàng tươi cọc 12 giờ; D bước 5, D2 nhánh 5 và mô phỏng HĐ xoài dùng 48 giờ | Đơn nào áp 12/48 giờ, lúc bắt đầu tính, nhắc trước hạn thế nào khi hạn dưới 24 giờ? |
| Q07 / P1 | A3/C9 tranh chấp 48 giờ; C8 khác mẫu/D2 nhánh 8 nói kiểm định 24 giờ; D2b nhánh 14 nói **lấy mẫu** trong 24 giờ | Phân biệt hạn lấy mẫu, cân lại, hạn có kết luận; 24 giờ là ngoại lệ gì; quá hạn kiểm định thì ai tiếp quản, cọc/hàng xử lý sao? Không gộp “lấy mẫu” thành “đã kết luận”. |
| Q08 / P1 | D2b dòng “Trễ” nói quá 24 giờ cọc về bên kia; nhánh 15 và S3 M9 cho bán 12 giờ giải thích | Mốc mua trễ xe 24 giờ khác mốc bán không giao 12 giờ; cần ghi chính xác từng trigger và kết quả, không áp 24 giờ cho mọi bên. |
| Q09 / P1 | C1 hồ sơ công khai có “hay chào thấp”; E3 uy tín còn đầu vào chào thấp; C4/C12 đã nói không gắn nhãn chỉ vì hay chào thấp | Uy tín là hành vi vi phạm/hạ loại không căn cứ/trả chậm; giá chào thấp hợp lệ có tính phạt không? Cần loại mệnh đề cũ hoặc nêu rõ chỉ là tín hiệu để xem xét, không kết tội. |
| Q10 / P1 | C4 khớp khi giá kín ≤ giá tối đa×1,05; E3 nói khớp ±5%, gần khớp ±10% | Ranh giới ba nhóm, mức ngoài 5% được hiển thị hay bị loại, “giá kín” nào dùng. Không suy đủ công thức từ một dòng điều kiện trong mô phỏng. |
| Q11 / P1 | D3 đặt trước 8–10 tấn/cọc 57,6 triệu và C13 đặt trước 2,1 tấn/cọc 15,12 triệu; D3 bao tiêu cọc 20 triệu và C13 10 triệu | Là các fixture khác nhau, không tự đồng nhất chỉ vì cùng tên/mã. Chọn dữ liệu chuẩn theo từng kịch bản; nguồn nào dùng cho số ban đầu, số chốt và số nghiệm thu. |
| Q12 / P1 | CSV luồng 12: tiền về HTX rồi chia; C10 đơn nhóm: ký/cọc/trả riêng từng hộ | Tách **HTX là người bán mua lại từ hộ** với **HTX chỉ làm dịch vụ gom, từng hộ bán trực tiếp**. Nếu cùng một loại đơn thì xung đột người nhận tiền; chưa thể gộp hai mô hình. |
| Q13 / P1 | CSV màn bán `quyet-toan`: lượng×giá−phí; A2/C6/brief: bán không trả phí giao dịch | Xác định CSV đã cũ ở dòng nào; phí dịch vụ người bán tự chọn phải tách khỏi phí giới thiệu người mua. Không lấy CSV làm phép quyết toán mới. |
| Q14 / P1 | B1 và CSV có tổ chức nhiều vai; S3 §4 cập nhật 23/10 và S4 §2 để sau V1 | V1 một người mua, vẫn ghi actor nghiệp vụ từng việc; phân quyền tổ chức là giai đoạn sau. RACI trách nhiệm không đồng nghĩa phải xây UI phân quyền ngay. |
| Q15 / P1 | S3 N5 dùng max(giá khai,70% giá tham khảo) làm căn cứ cọc/phí; C2/C4/C12 nói giá tham khảo chỉ cảnh báo, không định giá | Cơ chế N5 có được duyệt không? Đây là can thiệp căn cứ tiền chứ không chỉ cảnh báo; chưa đưa vào mô phỏng như luật. |
| Q16 / P1 | S3 P5 cho đổi giá qua đề nghị khi giao; C4 giá cam kết đổi bằng đề nghị; D2b nhánh 12 nói sau cọc giá không đổi | Phân biệt sửa giá đơn, hạ cấp theo bảng ký, và khấu trừ ngoài hợp đồng. Chỉ áp thay đổi lúc nào? Không tự mở sửa giá sau cọc. |
| Q17 / P1 | S3/S4 còn đề xuất kiểm rồi trả, đổi tài khoản chờ 24 giờ, liên lạc theo ngưỡng, giới hạn chào 2 lần lượng, bán ngoài bao tiêu | Cần đưa đủ vào danh sách chờ chốt, có nguồn và bật/tắt. Nhất là 2 lần rút là luật C4, **2 lần lượng đang chào** là đề xuất khác, không nhầm. |
| Q18 / P1 | A2 mối quen chỉ sau đơn hợp lệ, không theo nhân viên/SĐT; CSV luồng 11 nói liên lạc đã mở từ đơn trước; S3 N2 đề xuất mở theo từng đơn/ngưỡng | Trước cọc đơn mới, mối quen thấy liên lạc gì; quan hệ thuộc tổ chức hay cá nhân; ngưỡng đơn nhỏ được duyệt chưa? Phí mối quen 0% chỉ thuộc gói Thu mua, không mọi gói. |
| Q19 / P1 | C11 nói ứng tiền trên lô; C6/S2 T7 nói đơn **đã cọc** mới được ứng | Có sản phẩm ứng trên lô chưa có hợp đồng không, hay chỉ gợi ý tìm đơn đã cọc? Điều kiện, người tài trợ, trách nhiệm khi không bán được: **chưa kiểm**. |
| Q20 / P2 | G thử 3 tháng: giao ngay/đặt trước, cách chở 2/3, xe đối tác một tuyến; mô phỏng cho chọn ngay bảo hiểm/ứng tiền/bao tiêu/khung/nhóm | Cần nhãn giai đoạn: tình huống để duyệt tầm nhìn khác dịch vụ đã sẵn sàng thử. Không dùng một storyboard thành công để tuyên bố năng lực vận hành hiện có. |

Không cần coi các diễn đạt sau là mâu thuẫn: “người bán mất cọc phần thiếu” ở C9 và “hoàn cọc phần thiếu cho người mua” ở C6/D2 nhánh 4 cùng chiều; “năm loại hợp đồng” ở A3 và C5 mô tả đơn nhóm như một trục nguồn hàng có thể diễn giải thống nhất. Vấn đề là cách mô phỏng từng phần, không phải tự đặt thêm một khoản phạt hay loại hợp đồng.

## 6. Thay đổi đã thực hiện và giới hạn kiểm chứng

### 6.1 Tệp và nội dung thay đổi

- Chỉ sửa `tao_du_lieu.py`: thêm **18 tình huống**, giữ cấu trúc TH/B và khóa JSON; thêm nhóm hiển thị, đổi phiên bản thành `2-rs1 · 27/10/2026` để dữ liệu mới không bị bản lưu trình duyệt phiên bản 2 che mất.
- Dùng đúng `goc / phong_van / mau_thuan` cho phần thêm. Không đưa nội dung giả định thành phỏng vấn hay chỉ đạo. Chưa có tình huống mới nào đủ bằng chứng phỏng vấn để cần nhãn `phong_van` riêng.
- **Giữ nguyên 28 tình huống cũ**, `tinh_huong.py`, HTML và `kiem-thu.mjs`. Các lỗi L01–L24 là tồn tại chưa sửa, không được bỏ qua vì có ca bổ sung.
- Đã sinh lại `quy-trinh.json`, chép đúng `index.html` và `quy-trinh.json` sang `frontend/mo-phong-quy-trinh/`. Không thay đổi mã app/DB/backend hay các tệp nguồn bên ngoài workspace.
- `tao_du_lieu.py` ban đầu xây một bộ T rồi **ghi đè bằng `T=xay(...)` từ `tinh_huong.py`**. Phần thêm được đặt sau lần ghi đè, tránh sửa nhầm dữ liệu không được xuất. Chạy lại generator sẽ ghi đè JSON; chỉnh tay JSON không tự cập nhật vào generator.

Danh sách ca mới: `rs-tra-thieu-bo-sung`, `rs-lech-tien`, `rs-phan-doi-mot-dong`, `rs-can-lech`, `rs-thieu-luong`, `rs-huy-ben-mua`, `rs-de-nghi-dang-cho`, `rs-han-kiem-hang`, `rs-lenh-ngan-hang`, `rs-nhom-chua-du`, `rs-khung-chi-coc`, `rs-xuat-khau-6-nguon`, `rs-xe-ben-mua`, `rs-diem-gom`, `rs-che-lien-lac-uy-tin`, `rs-nguoi-giup`, `rs-ho-so-nganh`, `rs-mat-mang`.

### 6.2 Kiểm tra đã chạy

```text
python3 docs/mo-phong-quy-trinh/tao_du_lieu.py
ok 46 tình huống, 290 bước

node docs/mo-phong-quy-trinh/kiem-thu.mjs http://127.0.0.1:18888/mo-phong-quy-trinh/
ĐẠT 109/109
```

Đã kiểm thêm bằng đọc/so dữ liệu: ID không trùng; 28 ca đầu bằng nguyên bản trước sửa; nhãn nguồn mới hợp lệ; HTML, `tinh_huong.py`, test không đổi; bản docs/frontend khớp byte. Đã xem ảnh kiểm thử điện thoại `n6-khong-tra-du` cuối: chính trang đồng thời hiển thị **Hoàn tất**, **đã nhận 33.800.000** và **phải trả sau nghiệm thu 44.350.000**, xác nhận L02 có trên giao diện mô phỏng, không chỉ trong JSON.

Đã GET riêng cả `index.html` và `quy-trinh.json` từ URL localhost: HTTP 200, nội dung khớp byte/hash với bản docs/frontend bên dưới. Đã tính lại độc lập các phép cộng/nhân trong bảng tiền, không dùng lời mô tả làm giá trị mong đợi. Lỗi L01/L02 vẫn được tái hiện từ số máy tại bước cuối, không bị kết quả kiểm thử trình duyệt che mất.

Hash sau khi chép, SHA-256:

```text
index.html    904f1db6a2759a60faa5b6dbcdd9c92f6d43a2dc63be434cc37b12b478a9f6e4
quy-trinh.json 448524fd1b0ff9bcab2da5d87000292aeecc2b2b802d72af1eda037dab97daab
```

**Giới hạn của 109/109:** test duyệt hết thẻ ở 390×844 và 1280×900, kiểm số thứ tự/thẻ đang chạy, tràn ngang, lỗi JS, mở khung, lưu/tải ghi chú, sửa và xuất JSON. Mặc dù comment đầu test ghi “sổ tiền cân đối”, **không có assertion nào tính cân đối cọc/tiền hàng/công nợ**, không kiểm quyền, hạn thực, thứ tự nghiệm thu hay điều kiện cho chuyển bước. Trang dùng nút tiến/lùi để duyệt storyboard; trường `dieu_kien` là chữ hiển thị, không phải guard nghiệp vụ được thực thi. Vì vậy 109/109 không phải chứng nhận 46 quy trình đều đúng nghiệp vụ hoặc đã xử lý mọi nhánh.

### 6.3 Thứ tự xử lý trước buổi duyệt

1. Sửa L01/L02/L06 và sổ ứng tiền; chặn cách gọi Hoàn tất khi tiền/hàng còn nghĩa vụ. Chọn một bộ HĐ-0018 chuẩn để hai bên đối chiếu.
2. Chốt Q01–Q05: trách nhiệm hư đường, xử lý cọc do vi phạm, cấu trúc ngân hàng, hủy sau giao/trả thẳng, quyền xác nhận tiền. Không để một dòng “nhân viên đảm bảo” thay quyết định của các bên.
3. Chuẩn hóa fixture đặt trước/bao tiêu/khung/nhóm; bổ sung chứng cứ và từng mốc xác nhận, hạn đúng. Đánh dấu giả thuyết dịch vụ và chỉ đạo chưa có bằng chứng.
4. Duyệt các tình huống thiếu P0/P1 ở mục 3; bổ sung phép kiểm tiền/điều kiện có ý nghĩa cho trang mô phỏng. Nghiệp vụ được duyệt rồi mới bàn giao thiết kế UI ba app theo quyết định riêng của người sáng lập.
