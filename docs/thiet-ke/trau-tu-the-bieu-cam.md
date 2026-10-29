# Trâu C01 · Danh mục tư thế, biểu cảm, đạo cụ theo dữ liệu app (bản đề xuất để duyệt)

Ngày 29/10/2026. Căn cứ: màn Motion v2 (`AgiViet Motion v2.dc.html`), bảng ánh xạ `docs/anh-xa-giao-dien/01-motion-giao-ngay.md`
(S2→T9 + 4 màn chờ), các tab app bán (Hôm nay, Chợ, Đăng hàng, Ví, Trò chuyện, Nhật ký vườn, Giá hôm nay, Tin vụ mùa, Tôi).
Mục đích: chốt **tư thế nào, dạng gì, ở đâu, khi nào** trước khi vẽ; mỗi tư thế là vector có bộ phận tách để chỉnh và làm chuyển động.

## 1. Năm dạng thể hiện (form) — chọn theo chỗ đặt trên màn

| Dạng | Khung | Dùng ở đâu | Vì sao |
|---|---|---|---|
| **F1 · Đầu** (biểu tượng) | 48–72 px, tròn | Tab, thông báo, avatar tin nhắn hỗ trợ, vòng tải nhỏ | Nhận diện, không chiếm chỗ |
| **F2 · Nửa người** (ngực lên) | 120–160 px, góc dưới thẻ | **Mặc định trong luồng**: cạnh bong bóng lời nhắc ở S2→T9, màn chờ | Đủ biểu cảm + tay cầm đồ, không che số tiền/nút |
| **F3 · Toàn thân đứng / đi** | 180–260 px | Màn trống, màn chào, onboarding, cảnh GX (đi/gánh), T9 hoàn tất | Cảnh lớn, có hành động cả người |
| **F4 · Ngồi** | 160–200 px | Chờ lâu (chờ cọc, chờ ngân hàng qua đêm), đọc hợp đồng dài | Truyền cảm giác "kiên nhẫn chờ", không sốt ruột |
| **F5 · Ló từ mép** (peek) | 80–120 px, cạnh màn | Gợi ý lần đầu, chỉ vào nút cần bấm, có tin mới | Gợi ý mà không chen ngang |

Một màn **chỉ một trâu**, kèm tối đa **một con quạ** và **một cảnh phụ**. Trâu luôn nằm **ngoài vùng số tiền và nút chính**.

## 2. Danh mục tư thế theo dữ liệu app

Ký hiệu biểu cảm ở mục 3. "Trạng thái" lấy đúng từ backend (`order.status`, khoản tiền, đợt giao) — trâu không tự suy diễn.

| # | Tư thế | Dạng | Màn / trạng thái app kích hoạt | Tay · chân · đầu · sừng/tai · đuôi | Biểu cảm | Đạo cụ / bạn đồng hành |
|---|---|---|---|---|---|---|
| T01 | Chào | F3 → F2 | Màn chào, đăng nhập thành công, lần đầu mở app | Tay phải giơ vẫy (khuỷu cong), tay trái thả; đầu nghiêng nhẹ; tai vểnh | Vui (E2) | Quạ đậu sừng phải vẫy cánh |
| T02 | Đứng nghỉ | F3/F2 | Hôm nay khi không có việc; màn trống | Hai tay thả; đứng thẳng; tai thả lỏng; đuôi đung đưa | Bình thường (E1) | Quạ nhảy lò cò trên sừng |
| T03 | Nghe / chú ý | F2 | Đăng hàng bằng giọng nói (đang nghe), nút "Nghe" | Một tay khum sau tai; đầu nghiêng về phía người dùng; tai vểnh cao | Chú ý (E4) | — |
| T04 | Xem lời chào giá | F2 | **S2** lời chào mới | Hai tay cầm tờ giấy nhỏ; đầu cúi đọc | Suy nghĩ (E5) | Quạ ngó qua vai |
| T05 | Chờ thỏa thuận | F4 | **S4** đã đồng ý giá, chờ bên mua lập hợp đồng | Ngồi trên thúng, tay để gối; đầu ngước | Kiên nhẫn (E6) | Đồng hồ nhỏ; quạ đậu đầu gối |
| T06 | Đọc hợp đồng | F4/F2 | **O4** ký hợp đồng (đọc/nghe từng điều) | Ngồi, hai tay cầm sổ xanh mở; đầu cúi | Tập trung (E3) | Sổ xanh; kính? (không) |
| T07 | Nhập mã | F2 | **O6** nhập OTP; mọi ô nhập số | Hai tay cầm điện thoại; nhìn xuống | Tập trung (E3); **đứng yên khi người dùng đang gõ** | Điện thoại |
| T08 | Chờ cọc | F4 | **O8** `awaiting_deposit`; màn chờ cọc | Ngồi; một tay chống cằm; chân đung đưa | Kiên nhẫn (E6) | Quạ đi đi lại lại; cảnh ngân hàng + đồng hồ cát |
| T09 | Xác nhận tiền | F2 | **G1** bên mua báo đã chuyển | Cầm điện thoại, tay kia chỉ vào màn hình điện thoại | Tập trung (E3) | Điện thoại |
| T10 | Nhận thiếu tiền | F2 | Khoản `partially_received` | Gãi sau đầu; tai cụp nhẹ | Lo (E7) | — |
| T11 | Sẵn sàng giao | F3 | **G2** thẻ sẵn sàng | Đứng, một tay giơ ngón cái? (móng: giơ nắm tay), thúng hàng cạnh chân | Tự tin (E2 nhẹ) | Thúng nông sản; xe tải đỗ chờ |
| T12 | Đang kiểm hàng | F3 | Sau `start-check` | Đứng cạnh cân, cúi nhìn kim cân | Tập trung (E3) | Cảnh cân + thúng |
| T13 | Đang giao | F3 (đi) | **GX** đợt `in_transit` | Gánh đòn tre hai thúng, bước đi; đuôi lắc theo nhịp | Vui (E2) | Xe tải chạy phía sau; quạ bay theo |
| T14 | Kết quả nghiệm thu | F2 | **G6** chờ người bán xác nhận | Cầm phiếu cân, tay kia chỉ vào dòng | Suy nghĩ (E5) | Phiếu cân |
| T15 | Tới kho | F3 | Xác nhận nơi đến | Đứng trước kho, một tay chỉ vào cửa kho đang kéo lên | Chú ý (E4) | Cảnh nhà kho |
| T16 | Quyết toán / chờ ngân hàng | F4 | **T2**, lệnh ngân hàng chưa đối soát | Ngồi; nhìn đồng hồ cát | Kiên nhẫn (E6) | Ngân hàng + đồng hồ cát; quạ ngủ gật |
| T17 | Tiền đã về | F3 | **T5** — CHỈ khi `thuc_nhan.da_xac_minh` | Hai tay ôm điện thoại sát ngực rồi giơ lên | Mừng (E8) | Tiền bay vào ví; quạ vỗ cánh |
| T18 | Hoàn tất | F3 | **T9** đơn `completed` | Nhảy, hai tay giơ cao | Mừng (E8) | Quạ bay vòng; cầu vồng (thời tiết) |
| T19 | Chỉ dẫn | F5 | Gợi ý lần đầu; nút cần bấm tiếp | Ló từ mép, tay chỉ về phía nút (tay xoay theo vị trí nút) | Bình thường (E1) | — |
| T20 | Xin lỗi / lỗi | F2 | Lỗi hệ thống, `TRANG_THAI_KHONG_CHO_PHEP`, thao tác hỏng | Gãi sau đầu; tai cụp; đầu cúi nhẹ | Ngại (E7) | Quạ nghiêng đầu khó hiểu |
| T21 | Mất mạng | F2 | `CAN_MANG` | Cầm điện thoại giơ cao tìm sóng | Lo (E7) | Cột sóng nhỏ |
| T22 | Ngủ / ngoài giờ | F4 (nằm/ngồi gục) | Chờ qua đêm (ngân hàng làm việc sáng mai), app mở lúc khuya | Ngồi gục đầu, mắt nhắm | Ngủ (E9) | Quạ ngủ trên sừng; trăng |
| T23 | Vườn / nhật ký | F3 | Nhật ký vườn, Đăng hàng (chụp lô) | Đứng cạnh cây xoài, tay cầm thúng | Bình thường (E1) | Cảnh vườn xoài |
| T24 | Thời tiết | F2/F3 | Tin vụ mùa, giao hàng gặp mưa | Mưa: che nón lá/áo mưa; nắng: lau mồ hôi; gió: giữ khăn | Theo thời tiết (E1/E7) | Cảnh thời tiết |

Không làm tư thế cho: số tiền cụ thể, so sánh giá, tranh chấp (giữ trung tính — chỉ dùng T20/T14), nội dung pháp lý.

## 3. Biểu cảm (không có miệng — chỉ mắt, lông mày, tai, đuôi, hơi thở)

| Mã | Biểu cảm | Mắt | Lông mày | Tai | Đuôi | Hơi thở / phụ | Dùng khi |
|---|---|---|---|---|---|---|---|
| E1 | Bình thường | Chấm đen đứng | Cong nhẹ | Ngang | Đung đưa chậm | Thở đều | Mặc định |
| E2 | Vui | Chấm, hơi nheo | Nhướn nhẹ | Vểnh | Vẫy nhanh | — | Chào, sẵn sàng, đang giao |
| E3 | Tập trung | Chấm, nhìn xuống | Hạ thẳng | Ngang | Yên | Thở chậm | Đọc, nhập mã, kiểm hàng |
| E4 | Chú ý | Chấm to hơn 10% | Nhướn cao | Vểnh cao | Dựng | — | Nghe, có tin mới, tới kho |
| E5 | Suy nghĩ | Chấm nhìn lên/ngang | Một bên nhướn | Một tai nghiêng | Cuộn | — | Xem giá, xem kết quả |
| E6 | Kiên nhẫn chờ | Chớp chậm | Cong mềm | Thả | Đung đưa chậm | **Phả hơi dài** (thở dài nhẹ) | Mọi màn chờ |
| E7 | Lo / ngại | Chấm nhỏ hơn | Đầu trong nhướn (hình mái) | Cụp xuống | Cụp | — | Lỗi, thiếu tiền, mất mạng |
| E8 | Mừng | **Nheo cong lên (cung)** | Nhướn | Vểnh, vẫy | Vẫy mạnh | Hai làn hơi ngắn | Tiền về (đã đối soát), hoàn tất |
| E9 | Ngủ | Vạch ngang cong xuống | Thả | Cụp | Yên | Hơi thở chậm "zz" bằng hơi | Chờ qua đêm |

Cấm: tròng trắng + con ngươi kiểu người; miệng; nước mắt; giận dữ (trâu không bao giờ giận khách).

## 4. Cấu trúc vector cho chỉnh sửa và chuyển động

Một bộ phận gốc dùng chung cho mọi tư thế; tư thế chỉ đổi **góc xoay, vị trí, biến thể bàn tay/lông mày**.

| Nhóm | Bộ phận (`<g id>`) | Điểm xoay | Cách biến dạng khi chuyển động |
|---|---|---|---|
| Đầu | `dau` (cha) → `dau-khoi`, `sung-trai/phai`, `tai-trai/phai`, `mom`, `mat-*`, `long-may-*` | Cổ | Đầu xoay/nghiêng cả nhóm; sừng gắn chết; tai xoay quanh gốc |
| Mặt | `mat-*` (ellipse), `long-may-*` (path), `mom` + `hoi-*` | Tâm mắt / gốc lông mày | Mắt co dọc (chớp/nheo), đổi biến thể (Solo) theo E1–E9 |
| Cổ | `co` | Gốc cổ | Đứng yên, che khe khi đầu nhấp nhô |
| Thân | `than`, `khan-co` | Hông | Thở = giãn dọc 1–2% |
| Khăn | `khan-dai` | Nút khăn | **Xương 2 đoạn** → đu đưa có độ trễ |
| Tay | `tay-trai/phai` = **cánh tay + cẳng tay + bàn tay** | Vai, khuỷu | **Xương 2 đoạn (IK)**: chỉ tay nhắm đúng vị trí nút; bàn tay đổi biến thể (thả, vẫy, cầm, chỉ, chống cằm, gãi đầu) |
| Chân | `chan-trai/phai` = **đùi + cẳng + móng** | Hông, gối | Xương 2 đoạn: bước đi, ngồi, nhảy |
| Đuôi | `duoi` | Gốc đuôi sau mông | **Chuỗi 3 xương** → lắc có độ trễ |
| Quạ | `qua` (cha) → thân, đầu, mỏ trên/dưới, mắt, 2 cánh, đuôi lông, 2 chân | Chân (khi đậu) | Nhảy lò cò, vỗ cánh, giật mình mắt mở to |

Biến thể (một lúc chỉ hiện một — Rive Solo): bàn tay ×6, lông mày ×5, mắt ×4 (chấm, nheo cung, vạch ngủ, chấm to).
Mỗi tư thế = một **tư thế khóa** (pose) trên cùng bộ xương → chuyển giữa các tư thế bằng nội suy mượt, không đổi ảnh.

## 5. Tương tác với người dùng và giao diện

| Tương tác | Phản ứng của trâu | Phản ứng của quạ |
|---|---|---|
| Chạm vào trâu | E8 ngắn + nhún (squash & stretch) | Giật mình bay lên rồi đáp lại |
| Rê/kéo ngón tay | Đầu nghiêng + mắt nhìn theo | Quay đầu theo |
| Người dùng đang gõ | Đứng yên, không chuyển động lớn | Đậu yên |
| Nút chính xuất hiện | T19 chỉ tay về đúng vị trí nút (IK theo tọa độ nút) | — |
| Tin mới tới | E4, tai vểnh | Quạ ngậm phong thư bay vào |
| Kéo để làm mới | Trâu bị kéo dãn rồi bật lại (vòng tải) | — |
| Giảm chuyển động (hệ điều hành) | Ảnh tĩnh của tư thế | Ảnh tĩnh |

## 6. Quy tắc bắt buộc

1. Không che số tiền, nút, ô nhập. Không nói thay thông tin tiền/pháp lý (lời trâu chỉ nhắc việc, số liệu nằm ở giao diện).
2. Tiền về / mừng (T17, T18, E8) **chỉ** khi backend xác nhận (`da_xac_minh`, `completed`).
3. Màn chờ không làm người dùng sốt ruột: chuyển động chậm, lặp nhẹ.
4. Một màn một trâu, tối đa một quạ, một cảnh phụ.
5. Kích thước tối thiểu: F1 48 px (chỉ đầu), F2 120 px; nhỏ hơn thì bỏ quạ và cảnh.

## 7. Việc cần chốt (người sáng lập)

- Danh mục 24 tư thế ở mục 2: thêm/bớt/đổi gì?
- Dạng mặc định trong luồng là **F2 nửa người**: đồng ý?
- Ngồi (F4) cho màn chờ và nằm/ngủ (T22): giữ hay bỏ?
- Đạo cụ thời tiết: nón lá, áo mưa — đồng ý dùng?
