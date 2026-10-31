# Linh vật trâu AgiViet — trạng thái và bàn giao (30/10/2026)

Tài liệu này để **nhiều người/AI làm song song** (Claude tài khoản 1, Claude tài khoản 2, ChatGPT/Codex). Đọc hết mục "Luật bắt buộc" trước khi vẽ hay sửa gì.

## 1. Trạng thái ngắn

| Phần | Trạng thái | Ghi chú |
|---|---|---|
| Trâu chuẩn chính diện **V4g** (đứng, thở, chớp mắt, tai/khăn động) | **Đạt, đã chốt** | `frontend/trau-rive/nguon/trau.svg` → `frontend/assets/trau/trau.riv` (đang dùng trong app) |
| Quạ đi cùng (Rive, CC BY 4.0, tác giả raivu) | **Đạt, đã chốt** | `frontend/assets/trau/qua.riv` + `qua-LICENSE.txt`; mũ và mắt cố định |
| 13 đạo cụ SVG (giấy chào giá, điện thoại, phiếu cân, biển gỗ, thúng, cân bàn, kho, đòn gánh, đồng hồ cát, đồng xu, nón lá, áo mưa, sổ xanh) + ghế đẩu | Vẽ xong, soi 2 nền | `frontend/trau-rive/nguon/dao-cu/` (có điểm cầm `diem-cam`); thúng đòn gánh còn nhỏ |
| 22 dáng tay khớp nối (chào, cầm giấy, mừng, xin lỗi…) | **BỊ LOẠI** | Người sáng lập: tay gãy ở vai, tay khác V4g đã chốt, đứng cứng. Không dùng tiếp `tay-khop.py`/`trau-khop.riv` làm sản phẩm |
| Uốn đúng nét tay V4g bằng 2 xương (`tay-da.py`) | Dừng, chưa đạt | Dáng nghỉ còn lệch V4g vùng hai tay; không giải quyết xoay người |
| **Bộ góc nhìn** (nghiêng, ¾, sau lưng) để xoay người tự nhiên | **¾ trái + nghiêng trái: ĐÃ CHỐT T1 (31/10)** · sau lưng chưa làm | `frontend/trau-rive/nguon/goc/`, ảnh duyệt `docs/trau/goc-nhin/`; xem mục 4 |
| Dáng ngồi / cầm đồ | Chưa đạt | Ghế bị thân che, thúng nhỏ |

**Quyết định mới (31/10 tối, người sáng lập):** tạm chỉ làm **góc chính diện cơ bản**, bỏ các góc ¾ / nghiêng khỏi bản dựng; còn thời gian thì nâng cấp sau. `dung-v3.py` mặc định chỉ dựng `chinh` (`GOC = GOC[:1]`); input `huong` **vẫn có** trong hợp đồng nối nhưng chưa đổi hình (trâu luôn chính diện). Bật lại đủ 5 góc: `AGV_DU_GOC=1 ./dung-v3.sh` (mã ¾ / nghiêng, tay dò theo Higgsfield vẫn giữ nguyên). `trau-v3.riv` còn ≈254 KB. Ảnh: `docs/trau/chang-2/chinh-dien-5-dong-tac.png`.

**Kết luận của người sáng lập (30/10):** chuyển động phải có xoay người, nghiêng, dồn trọng tâm, nhịp thân nhiều góc cho tự nhiên — "không thì khỏi làm". Bẻ tay trên một hình chính diện phẳng là không đạt.

## 2. Luật bắt buộc (đã chốt nhiều lần — vi phạm là bị loại)

1. **Bám C01 / V4g**, toàn thân. Ảnh chuẩn: `docs/trau/tham-chieu/C01-chuan.png`; vector chuẩn: `frontend/trau-rive/nguon/trau.svg`.
2. **Mặt:** mắt là chấm đen, **không có lòng trắng**; mõm có **đúng 2 lỗ mũi**; **KHÔNG có miệng**; có lông mày.
3. **Hai tay cùng cỡ**, bàn tay, ống tay áo phẳng cắt ngang ở cổ tay (không phải ống tròn), không gãy ở vai, khuỷu liền.
4. Kiểm tra cả: đáy quần, chỗ nối tai và sừng, sừng không quá nhọn so với gốc.
5. Chuyển động phải **mượt bằng Rive** (không đổi ảnh từng khung).
6. **Soi khi chốt:** phóng to từng vùng (mặt, vai, tay, bàn tay, đáy quần, tai/sừng) trên **nền sáng và nền tối**, đặt cạnh C01/V4g, **liệt kê lỗi trước khi báo đạt**. So hình dạng, không chỉ lỗi kỹ thuật.
7. Codex/ChatGPT: chỉ rà soát và vẽ đạo cụ/minh họa; **không vẽ con quạ**, không sửa repo, không commit/push.
8. **NGHIÊM CẤM chuyển động kiểu "đứng yên một tư thế, chỉ tay và mặt cử động"** (người sáng lập, 30/10). Mọi hành động phải là **chuyển động của cả cơ thể, hợp lý về cơ thể học**:
   - Trọng tâm dồn chân này sang chân kia; hông và vai nghiêng ngược chiều nhau khi đứng dồn một chân.
   - Xoay người theo thứ tự: mắt/đầu đi trước → vai → hông → chân theo sau (độ trễ vài khung).
   - Có chuẩn bị và theo đà: trước khi giơ tay thì thân hơi hạ/ngả ngược lại; sau động tác chính, tai, khăn, đuôi và tay còn lắc nhẹ rồi mới dừng.
   - Dáng nghỉ cũng phải sống: thở bằng ngực/vai, đổi chân trụ thỉnh thoảng, nhìn quanh, không đứng như tượng.
   - Mỗi hành động (chào, chỉ đường, cầm giấy, mừng, xin lỗi, đi…) đều phải thấy thân, hông, chân tham gia — không chỉ cánh tay.
   - Kiểm tra: chụp chuỗi khung; nếu che tay và mặt đi mà thân/chân đứng yên suốt hành động → **không đạt**.

## 3. Tệp và công cụ

| Đường dẫn | Là gì |
|---|---|
| `frontend/trau-rive/nguon/trau.svg` | Trâu V4g gốc, đã tách nhóm: `tay-trai`, `tay-phai`, `chan-*`, `than`, `co`, `khan-*`, `sung-*`, `tai-*`, `mat-*`, `long-may-*`, `mom`… |
| `frontend/trau-rive/tao-canh.py` | Chuyển SVG → RML (Rive). Nhóm có `transform` thành chuỗi Node xoay được |
| `frontend/trau-rive/dung.sh` | Dựng `trau.riv` của app từ `scene.rml` |
| `frontend/trau-rive/soi-tu-the.py` | Soi tự động bằng OpenCV: lỗ hở, cắt mép, lệch nền sáng/tối |
| `frontend/trau-rive/kiem-*.sh` | Chụp khung Rive bằng CLI để soi chuyển động |
| `frontend/ban/trau-rive.html`, `trau-khop.html` | Trang xem thử trong trình duyệt |
| `docs/trau/tham-chieu/goc-nhin-higgsfield-{a,b}.png` | 2 bảng góc nhìn do Higgsfield vẽ thử (chỉ để tham khảo, xem mục 4) |
| `frontend/trau-rive/goc-nhin.py` | Sinh bộ góc nhìn → `nguon/goc/trau-34-trai.svg`, `trau-nghieng-trai.svg`. "Trái" = mặt quay về trái màn hình; bộ phận đặt tên `*-gan` / `*-xa` (gần/xa người xem), giữ quy ước `data-goc` của V4g |
| `frontend/trau-rive/soi-goc.py` | Ảnh duyệt góc: C01 \| V4g \| góc mới trên nền sáng/tối + phóng to mặt, vai-tay, đáy quần-chân, tai-sừng (luật 6) |
| `frontend/trau-rive/xem-goc/{34,nghieng}/` | Dự án Rive xem trực tiếp từng góc (`rive frontend/trau-rive/xem-goc/34`); `scene.rml` dựng bằng `tao-canh.py` từ SVG góc |
| `~/Documents/AgiViet/trau-v2`, `trau-tu-the`, `trau-lop`, `trau-chuyen-dong`, `trau-3d` | Các vòng thử cũ (chỉ trên máy chính, không có trong repo) |

Công cụ: Rive CLI 1.8.0 (`~/.rive/bin/rive`, đọc `rive docs`, `rive schema` — RML mới hơn dữ liệu huấn luyện, **không đoán tên kiểu**); `@rive-app/canvas` 2.21.6 vendored ở `frontend/assets/vendor/rive/`; OpenCV; `rsvg-convert`; Playwright.

## 4. Việc tiếp theo: bộ góc nhìn (chờ người sáng lập đồng ý)

Mục tiêu: cùng một con trâu V4g nhìn ở **chính diện (có sẵn), ¾ trái, nghiêng trái, ¾ sau/sau lưng**; mỗi góc **tách sẵn bộ phận** (đầu, tai, sừng, khăn, thân, tay trên/dưới, bàn tay, đùi/cẳng/móng) để Rive xoay và trộn.

Đánh giá 2 bảng Higgsfield (`tham-chieu/goc-nhin-higgsfield-*.png`):
- **Dùng tham khảo được:** góc nghiêng (bảng a, hàng dưới trái/giữa) và sau lưng — dáng tổng đúng.
- **Không dùng được:** góc ¾ gần như chính diện (bảng a lệch ~10°; bảng b là chính diện lần hai); tay ở góc nghiêng là mẩu ngắn không có vai/khuỷu; màu áo nhạt hơn V4g, khăn kẻ ô đen trắng, nét mảnh → đồ lại phải sơn lại theo màu/nét V4g.

Quy trình đề xuất:
1. Đồ vector góc nghiêng + sau lưng theo màu và độ dày nét V4g (nét viền `#24190f` 5,6 px).
2. Vẽ tay góc ¾ từ bộ phận V4g (dời/hẹp theo góc xoay; tai xa nhỏ lại, sừng xa che một phần, một tay khuất).
3. Gửi người sáng lập duyệt **từng góc** (ảnh phóng to 2 nền, đặt cạnh C01).
4. Duyệt xong mới dựng Rive: lớp xoay người theo góc, lớp nghiêng/dồn trọng tâm, lớp thở/nhún, lớp tai/khăn trễ nhịp; dáng hành động đặt trên các góc đó.

### Chặng 1 — ¾ trái và nghiêng trái (30/10, Claude 2, chờ chốt T1)
- **¾ trái**: dựng thẳng từ hình học V4g. Trục ngang được uốn bằng hàm đơn điệu (thân tròn quay ~30°), nên mặt, mõm, nẹp cúc dồn trái, phía xa co lại, phía gần giãn ra. Mõm nhô qua viền má trái và có mảng má gần. Mắt, mày, lỗ mũi, túi áo, bàn tay **dời nguyên khối** (không méo, hai tay cùng cỡ V4g). Ống tay xô theo vai/mép áo, có đệm vai nên không hở. Sừng/tai gần ×0,95/0,92, xa ×0,68/0,72 lùi sau đầu. Chân xa hẹp 0,9; móng cả hai chân chĩa trái. Giữ chuỗi khớp `khan-dai-1/2`.
- **Nghiêng trái (bản 2, 30/10)**: bản 1 vẽ lại theo Higgsfield bị người sáng lập **loại** ("lỗi đồng nhất thiết kế dáng, sai tạo hình nhân vật": đầu tròn trứng, mõm quả bóng kiểu heo, thân chữ nhật, tay dài/mảnh, tai mẩu). Bản 2 **dựng từ bộ phận V4g**. Khuôn đầu V4g co theo chiều sâu, trán dựng đứng, có bậc vào gò mõm. Mảng hồng mõm V4g thu 0,66 neo mép trước, có bóng khối. Lỗ mũi nằm ở mép trước (lỗ xa hé). Tai V4g xoay chĩa ra sau. Áo chữ A V4g uốn trục kiểu quay 90°: nẹp, cúc, khe xẻ ở mép trước, túi gần thành túi hông, có viền mép trước/sau. Tay trái V4g xoay rủ, rút 0,85 (cổ tay phẳng, khuỷu liền). Ống quần, móng, đuôi đều lấy từ V4g. Sừng nhìn cạnh đúng mốc chóp sừng, mọc ra từ vòng lông; sừng xa nấp sau sừng gần. Bảng xoay có đường mốc: `docs/trau/goc-nhin/bang-xoay.png`.
- **Codex** soi (`codex exec`, effort high, chỉ đọc). Bản 1: sau 3 vòng thì ĐẠT nhưng người sáng lập loại góc nghiêng. Bản 2: thêm 3 vòng (áo, trán–mõm, gốc đuôi, ¾ quay thêm một nấc), vòng cuối kết luận ¾ và nghiêng ĐẠT để gửi lại, bộ ba đồng nhất thiết kế ở mức hình tĩnh. Bài học: góc mới phải dựng từ bộ phận V4g và soi bằng bảng xoay có đường mốc, không vẽ lại theo ảnh AI.
- **Tự soi, lỗi/điểm còn cần người sáng lập quyết:** (1) góc nghiêng chỉ thấy rõ 1 lỗ mũi, lỗ xa chỉ hé ở chóp mõm (đúng phối cảnh; luật 2 ghi "đúng 2 lỗ mũi"); (2) tai nghiêng là tai V4g xoay chĩa ra sau; (3) ¾: viền đầu gần như giữ nguyên chính diện, độ quay đọc chủ yếu qua nét mặt và mảng má; ống quần vẫn dáng V4g, hướng chân chỉ thể hiện ở móng; (4) chỉ sừng nhìn cạnh và khăn là hình vẽ mới, còn lại lấy từ V4g; Codex còn lưu ý nhẹ: mép sau mảng hồng hơi cứng, chân ¾ quay ít hơn đầu.
- **Chưa làm (thuộc T2):** tách khớp khuỷu/cổ tay/gối/cổ chân, cha "đầu" và xương. `tao-canh.py` đã gom `*-gan`/`*-xa` vào nhóm đầu (đầu ra V4g không đổi).

### Bản 3 — đồ từ Higgsfield (30/10, theo yêu cầu người sáng lập)
Người sáng lập: bản tự dựng "logic không hợp lí, vẽ chưa ưng", nên chuyển sang **dùng Higgsfield sinh hướng xoay rồi đồ lại**.
- **Kết nối:** Higgsfield qua MCP (`claude mcp add --scope user --transport http higgsfield https://mcp.higgsfield.ai/mcp`, đăng nhập bằng `/mcp`). Tài khoản dùng thử chỉ tạo ảnh được qua MCP, lệnh CLI `higgsfield` bị chặn. Đã dùng 4,5/10 credit.
- **Ảnh nguồn** (sinh từ ảnh V4g):
  - `docs/trau/tham-chieu/higgsfield-v4g-xoay-1.png`: bảng xoay 5 góc bằng Nano Banana Pro. Lấy hình nghiêng (hình 3), lật gương.
  - `higgsfield-v4g-34-trai-1.png`: ¾ trái bằng 3D Jutsu Angles.
  - Bản cắt dùng để đồ: `frontend/trau-rive/nguon/goc/hf/`.
- **Đồ vector tự động:** `do-anh.py` là thư viện, `do-goc.py nghieng|34` cho từng góc.
  1. Phân lớp màu, lọc trội.
  2. Mảng màu đồ bằng potrace và tô màu V4g.
  3. Nét lấy từ nét gốc làm dày ~5,6.
  4. Mắt, mày, lỗ mũi đồ nguyên hình.
  5. Khăn: lấy bao khăn từ ảnh, bên trong là caro đều 3 màu V4g (ô 12).
  6. Ống quần viền bằng nét V4g (ảnh gốc có vân vải).
  7. Chia bộ phận theo vùng khung 512 (`*-gan`/`*-xa`).
  Đồ lại ra kết quả giống hệt; Rive `--verify` 0 lỗi.
- **Còn mở, chờ người sáng lập quyết:**
  1. Cổ tay ở cả hai góc bo tròn theo ảnh Higgsfield, trong khi luật 3 yêu cầu cắt phẳng.
  2. Góc nghiêng chỉ có 1 lỗ mũi (luật 2).
  3. Tỉ lệ đầu–thân, tay, tai lấy theo Higgsfield nên hơi khác V4g.
  4. Góc ¾ không có mày xa.
  5. Góc nghiêng chưa tách tai thành nhóm riêng; tay xa, chân xa khuất hẳn.
- **Sửa theo người sáng lập (¾ "lỗi chân và khăn"):** chân và khăn góc ¾ chuyển sang **đồ tay bằng đường cong** theo toạ độ đọc trên lưới 10 đơn vị phủ ảnh nguồn (`KHAN_CO_34`, `KHAN_DAI_34`, `CHAN_XA_34`, `CHAN_GAN_34` trong `do-goc.py`). Phần này gồm đường háng, nếp quần, móng có khe, dải khăn ôm cổ, đầu khăn thon có tua, caro cắt theo hình, túi áo. Codex: chân và khăn ĐẠT.
- **Sửa theo người sáng lập (xem Rive: "lỗi cổ, áo thiếu viền tà, nhún thì áo tụt có viền đen, khăn đứng yên, tay với áo tách rời"):**
  - `tao-canh.py` nhận ra bộ góc nhìn (tên `*-gan`/`*-xa`). Khi đó tay, khăn, cổ co giãn **cùng điểm tựa của thân** lúc thở và lúc nhún khi chạm, nên luôn dính áo.
  - Bỏ mẹo riêng của V4g (kéo giãn vòng khăn 1,16 lần và đẩy lên 3 px) ở các góc mới. Mẹo này làm khăn cổ bị dày.
  - Thêm nhóm `co` (lông cổ, nằm dưới áo, sau khăn và đầu) để che khe khi đầu nhún.
  - Giữ viền tà áo; bo tròn đầu khăn ở cổ.
  - Đầu ra V4g của `tao-canh.py` không đổi (đã so byte). Khung nghỉ và nhún: `docs/trau/goc-nhin/rive-nghi-nhun.png`.
- **Góc nghiêng làm lại (người sáng lập: "nghiêng thì tệ quá").** Bản cắt từ bảng xoay có đầu quá to, chân cụt, tai dẹt. Đã sinh riêng góc nghiêng bằng 3D Jutsu Angles từ V4g + góc ¾ đã duyệt (`docs/trau/tham-chieu/higgsfield-v4g-nghieng-trai-2.png`, 2,5 credit; tổng đã dùng 7/10, còn 3). Đồ như góc ¾: đầu và áo đồ tự động; chân và khăn đồ tay (`*_NG` trong `do-goc.py`); lòng tai vẽ liền; bóng má nhạt như V4g.
- **Luật 3, cổ tay phẳng (cả hai góc):** ảnh Higgsfield có cổ tay là cung vòm. `co_tay_phang()` tô màu áo phần giữa cung và đường cắt, rồi kẻ đường cắt thẳng nét V4g (`CO_TAY_34`, `CO_TAY_NG`).
- **Góc nghiêng chốt theo thiết kế Higgsfield (người sáng lập: bản 3D Jutsu "khác V4g", hình nghiêng của bảng a "đúng hơn với thiết kế Higgsfield"):** đồ lại từ `docs/trau/tham-chieu/goc-nhin-higgsfield-a.png`, hàng dưới, hình giữa (có đầu khăn dài); đuôi theo hình trái. Nguồn cắt: `nguon/goc/hf/nghieng-hf-a-giua.png`, `nghieng-hf-a-trai.png`; toạ độ đồ tay `*_A` trong `do-goc.py`. Ảnh nguồn không có lông mày nên vẽ thêm theo V4g (luật 2). Ảnh 3D Jutsu nghiêng giữ trong tham chiếu, không dùng.
- **Chốt T1 (31/10):** người sáng lập duyệt góc ¾ trái và góc nghiêng trái ("oke") khi xem trực tiếp trong Rive. Góc nghiêng giữ 1 lỗ mũi (lỗ xa khuất theo phối cảnh), người sáng lập duyệt nguyên trạng. Bước tiếp theo: Chặng 2, khung xương và dáng nghỉ sống (`hanh_dong=0`), chốt T2.
- Bộ sinh cũ `goc-nhin.py` (bản 1–2, dựng tay) giờ ghi ra `nguon/goc/cu/`, không còn dùng.

### Chặng 2 — khung xương, xoay theo `huong`, nghỉ sống (ĐÃ CHỐT T2, 31/10)
- **Dựng:** `frontend/trau-rive/dung-v3.sh` chạy `dung-v3.py` và ra hai bản:
  - `frontend/assets/trau/trau-v3.riv` (bản giao app, 467 KB);
  - `xem-v3/` (bản xem thử: bấm 5 cột để đổi hướng và nhún, rê chuột để nhìn theo).
- **Hợp đồng nối:** artboard `trau` 512×512, chân chạm y≈490. State machine `trau` có các đầu vào `hanh_dong`, `huong`, `cham`, `nhin_x`, `nhin_y`. Đã nạp thử bằng `@rive-app/canvas@2.21.6` (đúng bản app dùng): 0 lỗi, đặt `huong` thì xoay đúng.
- **5 góc:** chính diện V4g, ¾ trái, nghiêng trái, và ¾ phải, nghiêng phải (lật gương). `huong` chia nấc: < −0,75 nghiêng trái · < −0,25 ¾ trái · chính diện · ≤ 0,75 ¾ phải · nghiêng phải.
- **Khung xương mỗi góc:** gốc ở bàn chân → nhún → hông → vai → thân trên (áo, tay, khăn, cổ) → đầu → đầu quanh → đầu nhìn → bộ phận đầu. Chân và đuôi gắn vào lớp nhún, nên đứng yên khi hông dồn.
- **Xoay (luật 8):** 3 Joystick bật/tắt bộ phận theo góc cho đầu, thân và chân. Đổi nấc thì đầu trộn trong 220 ms, thân 420 ms, chân 600 ms, nên đầu quay trước, rồi vai, rồi hông và chân. Thân bóp ngang nhẹ lúc đổi góc.
- **Nghỉ sống (`hanh_dong = 0`),** 5 lớp chạy song song với nhịp lệch nhau:
  - thở (ngực giãn, 3 s);
  - dồn chân (hông lệch và nghiêng, vai nghiêng ngược, đầu bù, chân nghỉ hơi nhấc, 10 s);
  - nhìn quanh (đầu dẫn, vai theo sau trễ, 12 s);
  - phụ (tai, khăn, đuôi, tay đung đưa lệch pha);
  - chớp mắt.
  Đo khi che mặt và tay: thân và chân vẫn đổi 2–3 nghìn điểm ảnh qua các khung, tâm thân lệch ±2,5 px. Tức là không đứng như tượng.
- **Thêm sau góp ý "tai thêm sinh động, đứng yên trông ngố" (31/10):**
  - **Giật tai:** thỉnh thoảng một bên tai giật nhanh, có lúc giật 2 cái liền, nhịp lặp 20 s nhưng các lần giật không đều. Biên độ đung đưa tai tăng từ 0,05 lên 0,08.
  - **Nghịch:** chờ 5 s, rồi **chọn ngẫu nhiên** 1 trong 5 động tác hoặc chờ thêm 4 s:
    - lắc đầu đuổi ruồi (tai và đuôi quất theo, thân nghiêng ngược);
    - vươn vai (có lấy đà; thân giãn, tay dang, ngửa đầu, tai vểnh);
    - nghiêng đầu tò mò (thân ngả theo, một tai cụp một tai vểnh);
    - nhún nhảy 2 nhịp (squash & stretch, tai, tay, đuôi theo đà);
    - vẫy tai và gật đầu.
  - Mỗi lớp chuyển động có nút bọc riêng (`*-giat`, `*-nghich`, `dau-nghich`, `nghich`), nên các lớp không ghi đè lên nhau.
- **Tính cách và cảm xúc (người sáng lập: "cho nó cảm xúc, tính cách, tay quơ cao", 31/10):**
  - **Tính cách:** hiền lành, chăm chỉ, tò mò, hay vui, thỉnh thoảng ngái ngủ.
  - **Khung mặt:** mắt và mày có nút cảm xúc riêng (`*-cx`), nên biểu cảm không đè lên chớp mắt và nhìn theo. Mỗi mắt có sẵn **mắt cười ^^** (`*-cuoi`), bật hoặc tắt bằng độ mờ.
  - **4 cảm xúc mới** trong lớp Nghịch, nâng tổng số động tác ngẫu nhiên lên 9:
    - **vui hớn hở:** mắt cười, lắc lư theo nhịp, hai tay vung xen kẽ, tai vểnh, đuôi vẫy;
    - **ngái ngủ:** mắt lim dim, đầu gật gù chúi xuống, tai cụp, rồi giật mình tỉnh và lắc đầu;
    - **giật mình:** mắt mở to, mày nhướng, tai dựng, người bật lùi rồi thở phào;
    - **vẫy tay chào:** một tay giơ cao vẫy, mắt cười, đầu nghiêng.
  - **Vươn vai:** tay giơ cao (66°), mắt nheo, mày nhướng.
  - **Tay:** góc chính diện vung cao hết cỡ. Ở góc ¾ và nghiêng, tay vẽ cho dáng buông nên giơ cao sẽ lộ ống tay phẳng, vì vậy hiện chỉ cho vung khoảng 40 %. **Muốn giơ cao ở ¾ và nghiêng phải vẽ thêm tư thế tay giơ** (làm ở chặng hành động).
  - Góc nghiêng: đã đồ thêm phần áo và đường gấu sau bàn tay (`chen_dau_nhom`), góc ¾ và nghiêng có lót áo (`lot['than']`), nên khi tay vung không còn lộ lỗ.
  - **Bắp vai phình** (người sáng lập: "tay phải phình, cắt lộ liễu không logic"): ở góc chính diện, tay V4g là khối cứng nằm sau thân, giơ lên thì sườn áo cắt ngang ống tay. Mình thêm `tay-*-vai`, là bầu dục màu áo nằm trên thân, và `tay-*-vaivien`, là viền đen nằm dưới tay và thân. Cả hai cùng điểm xoay và nhận mọi hoạt ảnh của tay. Kết quả: vai tròn liền ống tay khi giơ; lúc buông tay không hiện thêm viền (`khop_vai()` trong `dung-v3.py`).
  - **Giới hạn tay khoảng 30°** (người sáng lập: "vẫn lỗi cánh tay" khi tay dang ngang). Tay V4g vẽ cho dáng buông, xoay quá khoảng 40° thì ống tay thành thanh dẹt cứng, bắp vai cũng không cứu được. Vì vậy mọi động tác đều giữ tay ≤ 0,5 rad. **Muốn tay giơ cao phải có hình vẽ riêng cho tư thế tay giơ** (đổi hình khi giơ, giống cách đổi góc nhìn); việc này chưa làm.
  - **Tay chính diện uốn bằng xương (skinning)**, thay cho cách đổi hình tay Higgsfield trước đó. Người sáng lập yêu cầu tay lúc nào cũng là dáng V4g ban đầu; cách đổi hình làm hai tay chồng mờ lúc chuyển và dáng tay không thống nhất.
    - Mỗi đỉnh của nét tay V4g, kể cả viền nách, gắn vào 2 xương: **xương thân** (đi theo áo, không xoay) và **xương tay** (xoay). Trọng số tính theo vị trí dọc trục vai (166,333) → cổ tay (138,388): gốc ống tay dính áo, phần ngoài xoay hẳn, đoạn giữa uốn cong dần (`tay_da()` trong `dung-v3.py`).
    - Dưới mỗi tay có **khối vai tròn** (màu áo, có viền), lấp khoảng trống giữa đỉnh tay và khăn khi giơ cao. Lúc buông, khối này bị che kín; so với V4g chỉ lệch 1 điểm ảnh.
    - Xương tay dùng lại id cũ của nút tay, nên mọi hoạt ảnh vẫn chạy như trước, chỉ thêm hệ số ×2,6 vì tay uốn được nên giơ cao được. Riêng phần bật/tắt theo góc phải đặt lên **nút chứa hình** (`g.hien()`), vì xương không có độ mờ.
    - Vươn vai giơ khoảng 1,7 rad, vẫy chào khoảng 1,6 rad (bàn tay ngang tai), giật mình và vui khoảng 1,2–1,3 rad.
    - Đã xoá phần đổi hình (`do-tay.py`, `nguon/goc/tay-chinh.svg`, các ảnh cắt tay). Ảnh mẫu `docs/trau/tham-chieu/higgsfield-v4g-tay-1.png` giữ lại để tham khảo dáng.
    - **Bản 3 (31/10): ống tay chấm điểm theo nét viền + viền hở ở vai.** Người sáng lập chụp lỗi: ở góc ¾ và nghiêng, tay đè lên áo nên bản 2 (tách theo màu) lẫn ống tay vào áo, mất viền, bàn tay xám trôi giữa áo. Sửa:
      - `tach-tay.py`: bảng `ONG` chấm tay tâm nét viền ống tay của 9 dáng (gốc vai → cạnh ngoài → cổ tay → cạnh trong), nội suy cong, 14/6/14 điểm. Bàn tay lấy vùng xám tính từ điểm `HAT` giữa bàn tay, nới nửa nét viền rồi dò đường bao, 52 điểm.
      - Rive: ống tay tô nâu, viền là nét 5.6 HỞ ở cạnh gốc vai (hoà vào áo như bảng mẫu); bàn tay tô xám kèm nét viền kín; ống tay nằm trên bàn tay.
      - Góc nghiêng: tay nằm trên đuôi khăn, dưới khăn quấn cổ (bảng mẫu). Gốc tay giơ cao kéo dài vào dưới khăn để không hở.
      - Sửa lỗi góc ¾: bản tay vẽ trên đầu (`tay-gan-tren`) vẫn nhận góc quay của động tác → khi giơ cao bị xoay lệch ~110°, thành tay chéo xuống hông. Giờ `remap()` bỏ khoá xoay của bản này, nó chỉ đi theo dáng tay. Ảnh: `tay-34-dong-tac.png`.
    - **Bản 2 (31/10): dò nguyên đường bao tay từ bảng Higgsfield.** Người sáng lập nhận xét bản 8 điểm "chưa đúng" ở cả 3 góc và cả lúc chuyển động. Đã làm lại:
      - `tach-tay.py`: trong đa giác thô của từng dáng, tách theo màu 3 lớp (viền đen = cả bóng tay, ống tay nâu, bàn tay xám), dò đường bao bằng potrace, lấy mẫu 72, 64, 56 điểm theo chiều dài, bắt đầu ở điểm gần gốc vai, cùng chiều → `nguon/goc/tay-morph.json`. Nhờ vậy ống tay và bàn tay (xoè, chỉ, nắm) đúng hình bảng mẫu.
      - `tay_morph()`: khoá đỉnh mỗi 10 khung, nội suy quay quanh gốc vai (góc + bán kính), nên tay không co ngắn giữa chừng.
      - Ảnh: so với Higgsfield `tay-so-sanh-higgsfield.png`, chuỗi chuyển dáng `tay-chuyen-dang.png`, 5 góc × 5 động tác `tay-gio-3-goc.png`.
      - Đoạn mô tả bên dưới là bản 1 (8 điểm), đã thay.
    - **Tay giơ theo bảng tư thế Higgsfield cho cả 3 góc (31/10, sau khi người sáng lập duyệt ảnh tĩnh).** Bảng nguồn: `docs/trau/tham-chieu/higgsfield-tay-{chinh,34,nghieng-2}.png`. `cat-bang-tay.py` cắt từng hình theo cặp móng chân và căn về khung 512. Mỗi góc có 3 dáng (buông, dang ngang, giơ cao), mỗi dáng 8 đỉnh, lưu trong `TAY_MORPH` (`dung-v3.py`).
      - `tay_morph()` dựng ống tay (fill), viền hở ở gốc và bàn tay V4g bám theo đoạn cổ tay, tự lật để bàn tay nằm ngoài ống tay.
      - Hoạt ảnh `Dáng tay <bên>` khoá đỉnh ở khung 0, 60, 120. Joystick tua hoạt ảnh này, nên tay biến hình mượt.
      - Góc xoay tay trong các động tác được tự đổi thành vị trí joystick (`goc_sang_x`, `remap`).
      - Góc ¾ và nghiêng dùng thân áo không tay (`*-khongtay.svg`).
      - Góc ¾ có thêm bản tay vẽ **trên đầu**, đổi sang bản này ở khung 85, nên khi giơ cao tay nằm trước má.
      - Ảnh so sánh: `docs/trau/chang-2/tay-so-sanh-higgsfield.png` (trái là Higgsfield, phải là Rive). Ảnh 5 góc × 5 động tác: `tay-gio-3-goc.png`.
    - **31/10, quay về tay ổn định.** Người sáng lập nhận xét "càng ngày càng lỗi, góc nào tay cũng lỗi", và chọn quay về tay ổn định rồi làm lại bài bản. Cả 5 góc dùng tay đã duyệt (chính diện V4g, ¾ và nghiêng theo T1), chỉ xoay cứng biên độ nhỏ (≤ ~30°). Viền nách chính diện đi theo tay (`nach_vao_tay()`). Các cách giơ tay cao bên dưới (uốn xương, đổi hình, biến hình) **đã tắt**, mã giữ lại để tham khảo. Ảnh: `docs/trau/chang-2/tay-on-dinh-5-goc.png`.
    - **Kế hoạch làm tay giơ cho đúng:**
      1. Higgsfield sinh bảng tư thế tay (buông, dang ngang, giơ cao, vẫy) cho **cả 3 góc** (chính diện, ¾, nghiêng) từ bản đã duyệt.
      2. Đồ cùng một kiểu tay, màu và nét V4g.
      3. Người sáng lập **duyệt ảnh tĩnh từng góc**.
      4. Rồi mới đưa vào Rive bằng cách biến hình đỉnh cùng cấu trúc, rồi soi toàn bộ khung ở 5 góc.
    - **Tay chính diện biến hình theo 3 dáng Higgsfield** (người sáng lập: "không đúng… giơ tay đối xứng vẽ chuẩn lên"). Uốn xương không cho ra đúng dáng giơ, nên đổi sang cách khác: vẽ 3 dáng ống tay **cùng 8 đỉnh**, đối xứng hai bên (`TAY_DANG`, `TAY_NEP` trong `dung-v3.py`):
      - buông: theo hình chính diện bảng xoay;
      - dang ngang: theo bảng tư thế tay, hình 1;
      - giơ cao: theo hình 3.
      Hoạt ảnh `Dáng tay <bên>` khoá toạ độ các đỉnh ở khung 0, 60, 120. Joystick `Dáng tay <bên>` tua hoạt ảnh này, nên tay biến hình mượt mà vẫn là một tay, không chồng mờ. Bàn tay V4g đi theo giữa cổ tay (xoay theo mép cổ tay, phóng ×1,22 khi giơ). Góc xoay tay trong các động tác được tự đổi thành vị trí joystick (`goc_sang_x`: 0 rad là buông, 1,1 rad là ngang, 1,9 rad là cao; `remap()` trong `main`). Lớp Nghịch khi chờ khoá tay về buông. Bảng so sánh với Higgsfield: `docs/trau/chang-2/tay-so-sanh-higgsfield.png`. Góc ¾ và nghiêng vẫn dùng tay uốn xương bên dưới.
    - **Tay kiểu Higgsfield cho cả 5 góc** (người sáng lập: tay V4g "chả giống Higgsfield"). Tay vẽ lại theo hình chính diện của `docs/trau/tham-chieu/higgsfield-v4g-xoay-1.png`: vai áo liền xuống ống tay loe, có nếp trong, cổ tay phẳng; bàn tay giữ nguyên V4g. Màu và nét theo V4g (`nguon/goc/tay-chinh-hf.svg`). Mỗi tay là một hình liền, uốn bằng xương, không đổi hình.
      - Chính diện: vai (170,320) → cổ tay (137,386), vùng uốn −0,05…0,7, có bắp vai.
      - ¾: tay phải, nằm trên áo, gần như xoay cả khối (−1,0…0,3).
      - Nghiêng: tay trái, nằm trên áo dưới khăn (−0,05…0,7).
      - Viền nách V4g không dùng nữa.
    - **Bắp vai cho tay uốn xương (chính diện)** (người sáng lập: "nhìn cái tay kìa", tay dang ngang như dải dẹt cắm dưới khăn). Khi uốn, gốc ống tay bị bóp nhọn. `bap_vai()` thêm `tay-*-vai` (bầu dục màu áo, nằm trên thân, dưới khăn) và `tay-*-vaivien` (viền đen, nằm dưới tay và thân); cả hai xoay cứng quanh vai cùng hoạt ảnh của tay, nên vai tròn liền ống tay. Góc ¾ và nghiêng không dùng: gốc tay đã khuất sau áo hoặc dưới khăn, thêm vào lại làm mất nét viền ống tay.
    - **Góc ¾ và nghiêng dùng tay V4g (người sáng lập chọn, 31/10).** Thay tay đồ từ ảnh bằng chính nhóm tay V4g: góc ¾ dùng tay phải (xoay 8°, nằm dưới thân áo), góc nghiêng dùng tay trái (xoay −14°, nằm trên áo, dưới khăn). Cả hai góc thu nhỏ 0,95, bọc xương bằng `boc_xuong()` (đã xử lý góc lật gương) và có khối vai tròn (`tay_v4g()` trong `dung-v3.py`). Thân áo không tay lấy từ `AGV_KHONG_TAY=1 python3 do-goc.py 34|nghieng` → `nguon/goc/*-khongtay.svg`: xoá nét tay in trên áo, lót kín chỗ tay cũ, thêm đường gấu. SVG đã chốt T1 không đổi. Hệ số tay: ¾ ×2,6, nghiêng ×1,5 (đầu to che phía trên nên tay chỉ đưa ra trước tới ngang ngực). Soi 180 khung (6 động tác × 3 góc): `docs/trau/chang-2/tay-v4g-3-goc.png`.
  - **Soi tay toàn bộ** (người sáng lập: "đôi lúc vài khúc cánh tay vẫn lỗi form"): chụp 6 động tác có tay × 3 góc, cứ 8 khung một ảnh (351 khung, `docs/trau/chang-2/soi-tay-351-khung.png`). Đã sửa: viền nách đi theo tay (nay nằm trong tay uốn xương); `do-anh.py` thêm `net_toi_thieu` để bỏ mẩu nét rời;
    - ¾ và nghiêng: biên độ vung tay giảm còn 0,25 và 0,28, vì lớn hơn thì mép sau ống tay lòi khỏi áo hoặc nét đỉnh vai tách đôi.
  - **Kiểm thử:** `AGV_THU=<0–8> AGV_HUONG=<h> python3 dung-v3.py` ép chạy một động tác ngay. Bảng cảm xúc ở 3 góc: `docs/trau/chang-2/cam-xuc-3-goc.png`.
- **`cham`:** nhún từ bàn chân (squash & stretch) và nheo mắt. **`nhin_x`, `nhin_y`:** đầu và mắt nhìn theo.
- **Chưa có:** `hanh_dong` 1–8 (để làm ở Chặng 3); `nhin_x`, `nhin_y` đang chia nấc (5×3), chưa liên tục.
- **Ảnh:** `docs/trau/chang-2/` (5 nấc hướng, chuỗi xoay, 8 khung nghỉ).

### Chặng 3 — hành động (từ 31/10, mỗi hành động một lần duyệt)
- **Cơ chế:** lớp `Hành động` trong `dung-v3.py` (`HANH_DONG = {số: (tên, dài, khung)}`). `hanh_dong = n` thì chạy trạng thái n, lặp lại; `0` là trạng thái rỗng, dáng nghỉ sống chạy như cũ. Lớp `Nghịch` (động tác ngẫu nhiên) tự tắt khi `hanh_dong ≠ 0`; động tác đang chạy dở thì làm nốt rồi mới tắt. Trộn khi vào và ra hành động 300 ms.
- **1 chào** (chờ duyệt): nhún lấy đà, cúi đầu, giơ tay vẫy cao (tay uốn xương, góc chính diện), người nghiêng về phía tay kia, mắt cười, đầu nghiêng, tai vểnh, đuôi vẫy; mỗi vòng 216 khung, gồm 40 khung nghỉ. Đo luật 8 với mặt và tay đã che: thân và chân vẫn đổi 4–8 nghìn điểm ảnh. Ảnh: `docs/trau/chang-2/hanh-dong-1-chao.png`.
  - Hạn chế: ở góc ¾ và nghiêng, tay chỉ vung khoảng 0,25 rad nên động tác vẫy nhìn yếu. Cần làm tay uốn xương cho hai góc này.
- **Xem thử:** `rive frontend/trau-rive/xem-v3`, bấm dải trên cùng: nửa trái là chào, nửa phải là nghỉ. Kiểm bằng ảnh: `AGV_HD=1 AGV_HUONG=<h> python3 dung-v3.py`.
- **Còn:** 2 chỉ đường, 3 cầm giấy đọc, 4 mừng, 5 xin lỗi, 6 chờ, 7 đi, 8 suy nghĩ (theo thứ tự ưu tiên ở `docs/KE-HOACH-SONG-SONG.md`).

#### Hành động 2–8 ở góc chính diện (31/10 tối, chờ duyệt)
Theo yêu cầu "làm lẹ", cả 7 hành động dựng một lượt trong `dung-v3.py` (`HANH_DONG`), mỗi cái là một trạng thái lặp của lớp 'Hành động':
2 chỉ đường (tay phải dang chỉ, nhấn 2 nhịp, người nghiêng + đầu quay theo) · 3 cầm giấy (giấy chào giá trong tay phải, cúi đọc gật gù) · 4 mừng (hai tay giơ cao, nhảy 2 nhịp, mắt cười) · 5 xin lỗi (khom, cúi đầu, mày chau, tai cụp) · 6 chờ (đung đưa, gõ chân, ngó quanh) · 7 đi (bước tại chỗ, chân luân phiên nhấc 14 px, nhấp nhô) · 8 suy nghĩ (ngẩng nghiêng đầu, một mày nhướng, mắt nheo).
- `tay_k(g, bên, [(khung, mức)])`: mức 0 buông · .42 ngang · .73 cao. `chan_k`: nhấc chân.
- 'Hành động: về nghỉ' (20 khung): khi `hanh_dong` về 0, đưa mọi thuộc tính đã khoá về gốc rồi mới trả cho nghỉ sống; mỗi hành động cũng tự khoá gốc các thuộc tính nó không dùng → đổi thẳng 3 → 5 không sót tờ giấy. Kiểm runtime app (đổi 3 → 5 → 4 → 0): sạch, 0 lỗi.
- Ảnh: `docs/trau/chang-2/hanh-dong-1-8.png`, `hanh-dong-doi-qua-lai.png`.
- **Tay chính diện liền thân (31/10, người sáng lập):** tay buông vẽ kiểu bảng mẫu (mảnh tam giác tách cạnh thân) trông rời, khác tay dang. Sửa trong `tach-tay.py`: dáng buông vẽ lại tay to bằng lúc dang, gốc rộng ở vai, thả dọc hông và ĐÈ lên áo (bàn tay lấy từ ảnh rồi xoay + dời theo cổ tay mới, `CO_TAY_ANH`); dáng ngang / cao kéo gốc ống tay sâu vào thân 20 px (`DAI_GOC`), vì tay phải lật gương không có đuôi khăn che nên từng hở khe ở vai. Ảnh: `tay-chinh-dien-lien-than.png`.

### Cách làm việc với Rive CLI (rút từ tài liệu Rive "Build Prototypes with AI Agents and the Rive CLI")
- **Bật xem trực tiếp cho người sáng lập:** chạy `rive frontend/trau-rive` trong một terminal riêng — mỗi lần lưu là cửa sổ cập nhật, người sáng lập xem và góp ý ngay, không đợi cuối vòng.
- **Làm theo tầng, mỗi lần một thứ:** góc nhìn → tách bộ phận → khung xương → 1 hành động → duyệt → hành động tiếp. Không làm cả loạt rồi mới đưa xem.
- Tự kiểm bằng `rive <thư mục> --verify`, `rive inspect --summary`, `--screenshot --advance=N` (chuỗi khung).
- Chỉnh xương/nhịp tinh bằng **Rive Editor** (người sáng lập tự đăng nhập tài khoản Rive để mở tệp CLI trong Editor). Đo hiệu năng trên điện thoại tầm trung: một thử nghiệm công khai cho thấy tệp dựng bằng CLI tốn gấp >3 lần thời gian vẽ mỗi khung so với dựng trong Editor.

## 5. Chia việc khi chạy song song (đã chốt 30/10)

| Ai | Làm | Không đụng |
|---|---|---|
| **Claude tài khoản 1** | Thiết kế từng màn giao diện cùng người sáng lập (bước E): hệ "Sổ vườn", 80 màn bán + 49 màn mua, hiệu ứng mở app quả cầu nông sản | `frontend/trau-rive/`, `docs/trau/` (tránh xung đột) |
| **Claude tài khoản 2** | Trâu: bộ góc nhìn (mục 4), tách bộ phận, dựng Rive chuyển động **toàn thân** theo luật 8; xuất `.riv` để Claude 1 gắn vào giao diện | `frontend/thiet-ke/`, `frontend/shared/`, `frontend/ban/`, `frontend/mua/`, backend |
| **ChatGPT / Codex** (`codex exec`, `-c model_reasoning_effort=high`, không fast) | Rà soát độc lập từng góc trâu và từng màn giao diện theo luật mục 2; vẽ đạo cụ, minh họa | Không sửa repo, không vẽ quạ |

Mỗi bên làm trên **nhánh riêng** tách từ `production-test` (ví dụ `trau-goc-nhin`, `giao-dien-moi`) rồi mở PR vào `production-test`; không push `main`, không force-push. Ghi tiến độ vào `frontend/TIEN-DO.md` mục của mình.
