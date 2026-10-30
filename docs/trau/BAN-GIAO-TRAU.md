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
| **Bộ góc nhìn** (nghiêng, ¾, sau lưng) để xoay người tự nhiên | **¾ trái + nghiêng trái: chờ duyệt T1** (Codex soi 3 vòng: ĐẠT để gửi duyệt) · sau lưng chưa làm | `frontend/trau-rive/nguon/goc/`, ảnh duyệt `docs/trau/goc-nhin/`; xem mục 4 |
| Dáng ngồi / cầm đồ | Chưa đạt | Ghế bị thân che, thúng nhỏ |

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
- **Nghiêng trái**: vẽ lại theo dáng nghiêng Higgsfield, dùng màu và nét V4g. Mõm cao ≈ V4g, mắt/mày cùng tầng V4g. Sừng gần và tai gần có gốc chìm trong lông (viền hở ở gốc); sừng xa gần như khuất. Khăn caro 3 màu như V4g; đầu khăn buông quá gấu áo. Tay gần rủ dọc thân, cổ tay cắt phẳng. Tay xa khuất sau thân (vẫn có nhóm để dựng xương). Chân trước/sau chồng nhau.
- **Codex** soi 3 vòng (`codex exec`, effort high, chỉ đọc). Vòng 1: cả hai CHƯA ĐẠT. Vòng 2: nghiêng ĐẠT, ¾ còn móng chân và túi áo. Vòng 3: ¾ ĐẠT.
- **Tự soi, lỗi/điểm còn cần người sáng lập quyết:** (1) góc nghiêng chỉ thấy rõ 1 lỗ mũi, lỗ xa chỉ hé ở chóp mõm (đúng phối cảnh; luật 2 ghi "đúng 2 lỗ mũi"); (2) tai nghiêng cụp ra sau như Higgsfield, trong khi tai V4g chĩa ngang; (3) ¾: viền đầu gần như giữ nguyên chính diện, độ quay đọc chủ yếu qua nét mặt và mảng má; ống quần vẫn dáng V4g, hướng chân chỉ thể hiện ở móng; (4) mõm, sừng, tai góc nghiêng là hình vẽ mới, không lấy từ đường V4g.
- **Chưa làm (thuộc T2):** tách khớp khuỷu/cổ tay/gối/cổ chân, cha "đầu" và xương. `tao-canh.py` đã gom `*-gan`/`*-xa` vào nhóm đầu (đầu ra V4g không đổi).

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
