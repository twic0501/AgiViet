# AI · 02 Trợ lý giọng nói cho người bán

Mã: `ai/agiviet_ai/so_noi.py` (đọc số nói), `ngay.py` (đọc ngày), `danh_muc.py`, `trich_xuat.py`, `stt.py`, `doc_so.py` (số → chữ).
Đánh giá: `ai/danh_gia/danh_gia_trich_xuat.py`, `danh_gia_stt.py`. Trang thử: `GET /thu-giong-noi`.

## 1. Người dùng và nguyên tắc

Người bán 35–60 tuổi, đọc chậm, quen Zalo và nhắn thoại. Mục tiêu: **nói một hai câu là có nháp lô**, máy hỏi lại từng chỗ thiếu bằng một câu ngắn, rồi **đọc lại toàn bộ**, người bán nói "đúng rồi" và **bấm nút** mới lưu. Theo 00 mục 7: không chọn sẵn ô xác nhận tiền, mất mạng chỉ lưu nháp.

Luật an toàn (cứng trong mã):
1. Kết quả luôn là **nháp**; câu đọc lại kết thúc bằng "Em chỉ lưu nháp, chưa đăng."
2. Giá mong muốn và giá thấp nhất **luôn** nằm trong `can_xac_nhan` (dù chắc chắn).
3. Hai cách đọc số tiền lệch nhau (luật vs LLM) → **bỏ trống và hỏi lại**, không chọn.
4. Giá lệch xa mặt bằng (< 30% hoặc > 300% giá tham khảo) → cảnh báo "có thể nghe nhầm số", độ tin cậy hạ.
5. Giá thấp nhất > giá mong muốn, lượng âm/quá lớn, ngày đã qua → hỏi lại.
6. Lượng nói mơ hồ ("mấy chục ký", "vài tạ") → **không ghi số**, hỏi lại. "Hai ba tấn" → ghi cận dưới (2 tấn), cờ ước tính, hỏi lại (phù hợp K21: ước tính chỉ hứa 80%).
7. Ngày âm lịch ("rằm", "tháng chạp") → **không tự đổi**, hỏi ngày dương.
8. Mặt hàng ngoài danh mục (heo, khoai lang…) → nói rõ "app chưa mở mua bán, vẫn ghi sổ được".
9. Người giúp được dùng giọng nói để soạn nháp (đăng lô là việc người giúp được làm), nhưng không có lệnh giọng nói nào để ký/xác nhận tiền.

## 2. Nhận dạng giọng nói (STT)

| Phương án | Ưu | Nhược | Dùng khi |
|---|---|---|---|
| **Web Speech API** (`vi-VN`, Chrome Android) | Không tốn máy chủ, trễ thấp, đã dùng ở bản mẫu (`voice-dialogue.js`) | Âm thanh đi tới máy chủ nhà cung cấp trình duyệt (phải xin đồng ý); không chạy ở mọi trình duyệt; không đo được chất lượng | **Mặc định** |
| **faster-whisper `large-v3-turbo`** cục bộ (GPU) | Chạy trên máy mình, có độ tin cậy từng đoạn | Cần GPU (~1,6 GB mô hình, ~2,7 GB thư viện CUDA); viết số thành chữ số ("25.000") | Dự phòng / trình duyệt không hỗ trợ / cần lưu bằng chứng |
| faster-whisper `small` | Nhẹ (464 MB) | Kém hơn rõ (bảng dưới) | Không khuyên |
| PhoWhisper (VinAI) | Huấn luyện riêng tiếng Việt, kỳ vọng tốt hơn với giọng địa phương | **Chưa thử**: cần đổi sang CTranslate2 | Việc tiếp theo nên làm |

Gợi ý ngữ cảnh (`initial_prompt`) liệt kê mặt hàng và đơn vị giúp tăng ô trường đúng 3–6 điểm (đo dưới).

Định dạng đầu vào `POST /voice/stt`: WAV PCM16 mono 16 kHz, ≤ 30 giây. Đầu ra: `van_ban`, `tin_cay_tb` (log-xác suất trung bình; < −0,5 nên hỏi lại hoặc cho gõ tay), `ms`.

## 3. Trích trường

Trường: `mat_hang`, `giong`, `loai`, `co_con_kg` (tôm), `do_am` (lúa), `luong_kg`, `uoc_tinh`, `ngay_giao`, `hinh_thuc` (giao ngay / đặt trước khi hái), `noi_giao`, `gia_mong_muon`, `gia_thap_nhat` (kín), `can_trai_g`.

### 3.1 Bộ đọc số nói (luật, là phần quan trọng nhất)

| Cách nói | Đọc ra |
|---|---|
| "hai tấn rưỡi", "ba tạ rưỡi", "nửa tấn", "hai phẩy năm tấn", "2,5 tấn" | 2.500 / 350 / 500 / 2.500 / 2.500 kg |
| "ba chục ký", "năm yến", "hai trăm cân" (Bắc) | 30 / 50 / 200 kg |
| "hai tấn ba", "một tấn hai" | 2.300 / 1.200 kg |
| "hai lăm nghìn một ký", "hai mốt ngàn", "25k" | 25.000 / 21.000 / 25.000 đ/kg ("một ký" là *trên mỗi ký*, không phải lượng) |
| "giá hai lăm", "trăm hai", "trăm rưỡi" | 25.000 / 120.000 / 150.000 (**ngầm nghìn**, đánh dấu để đọc lại) |
| "sáu ngàn sáu", "sáu triệu rưỡi một tấn" | 6.600 / 6.500 đ/kg (giá theo tấn chia 1.000) |
| "hai chục rưỡi một ký" | 25.000 |
| "thấp nhất hai ba" | 23.000 (ngữ cảnh giá: ghép hàng chục) — trong ngữ cảnh lượng "hai ba tấn" là khoảng 2–3 |
| "cỡ năm chục con một ký", "size 40" | cỡ 50, 40 con/kg (chỉ tôm) |
| "trái chừng một ký rưỡi", "350 tới 450 gam" | trọng lượng trái → suy loại theo bảng loại, không phải lượng |
| "OM18", "IR 504", "Ri6" | mã giống, không phải số |
| "mốt" (ngày kia) vs "hai mốt" (21); "tư" (4) vs "từ" | phân biệt bằng dấu và từ đứng trước |

Ngày: "mai", "mốt", "bữa nay", "thứ năm", "ngày hai tám tháng mười", "28/10", "mùng năm tháng mười một", "mười ngày nữa", "cuối tháng" / "tuần sau" (ước, phải hỏi lại).

### 3.2 LLM cục bộ: vai trò bị giới hạn

Mô hình: `qwen3.5:9b` (đã có sẵn trên máy, 6,6 GB, qua Ollama, `temperature 0`, không ràng buộc ngữ pháp JSON vì ràng buộc làm chậm còn ~8 token/s). Chế độ `ket_hop`: LLM đề xuất, **luật kiểm**: một giá trị LLM chỉ được nhận khi đoạn gốc LLM chép ra *có thật trong câu* và luật đọc lại đoạn đó ra *đúng giá trị*. Hệ quả đo được: kết hợp ≈ luật (LLM gần như không thêm được gì mà vẫn an toàn), tốn thêm ~3,3 s.

Chỉ dùng LLM một mình thì **bịa và đọc sai tiền**: trên 52 câu, 8 ô tiền sai/bịa ("bảy lăm ngàn" → 35.000; "năm lăm ngàn" → 38.000; "sáu triệu rưỡi một tấn" → 6.500.000 đ/kg), lượng chỉ đúng 58%, hình thức bán bịa 29 lần. **Quyết định: production chạy `che_do: "luat"`.** LLM để dành cho: diễn đạt lại câu hỏi tự nhiên hơn (không đụng số), hoặc phân loại ý định khi người bán nói lan man — cả hai chưa làm.

### 3.3 Hội thoại nhiều lượt

AI không giữ phiên. Backend gửi `da_co` (các trường đã xác nhận ở lượt trước) cùng câu mới; AI trả trường mới + `thieu` + `cau_hoi_tiep` (một câu, một việc) + `cau_doc_lai` (khi đủ). Thứ tự hỏi: mặt hàng → lượng → loại (tôm: cỡ; lúa: bỏ qua) → ngày → nơi giao → giá mong muốn. Giá thấp nhất kín không bắt buộc hỏi; nếu hỏi thì nhắc "chỉ anh chị thấy".

Ví dụ thật (đầu ra hệ thống, câu CN-001):
> "Dạ em đọc lại cho anh chị nghe. Xoài cát Chu, loại một. hai tấn rưỡi. Giao ngày hai mươi bảy tháng mười, giao ngay. Lấy tại vườn. Giá mong muốn hai mươi lăm nghìn đồng một ký. Giá thấp nhất hai mươi mốt nghìn đồng, giữ kín, bên mua không thấy. Đúng thì anh chị nói "đúng rồi". Sai chỗ nào anh chị nói chỗ đó, ví dụ "sửa giá". Em chỉ lưu nháp, chưa đăng."

### 3.4 Đọc lại bằng giọng (TTS)

Câu đọc lại viết **mọi số bằng chữ** ("hai mươi lăm nghìn") để TTS không đọc "hai mươi lăm chấm không không không". Mặc định dùng `speechSynthesis` vi-VN của trình duyệt (tốc độ 0,85–0,92). Piper `vi_VN-vais1000-medium` (63 MB, chạy CPU) có thể làm TTS máy chủ khi máy không có giọng Việt, nhưng nghe thử khi tổng hợp dữ liệu thấy giọng Bắc, đọc sai vài từ Nam Bộ — **chưa đánh giá với người dùng, chưa khuyên dùng**.

## 4. Kết quả đo (thật, 25/10/2026)

### 4.1 Trích xuất từ văn bản

| Tập | Chế độ | Ô trường đúng | Câu đúng hết | Tiền sai/bịa | Trễ trung vị / p95 |
|---|---|---|---|---|---|
| 52 câu mẫu (đã dùng để chỉnh luật) — trước khi chỉnh | luật v0 | 93,8% | 31/52 | 2 | 0,2 ms |
| 52 câu mẫu — sau khi chỉnh | luật | 100% | 52/52 | 0 | 0,2 / 0,3 ms |
| 52 câu mẫu | luật + LLM | 100% | 52/52 | 0 | 3.347 / 3.825 ms |
| 52 câu mẫu | chỉ LLM | 82,2% | 7/52 | 8 | 3.345 / 3.724 ms |
| **25 câu độc lập** (viết sau, chạy một lần, không chỉnh) | **luật** | **96,8%** | **20/25** | **0** | 0,2 / 0,4 ms |
| 25 câu độc lập | luật + LLM | 97,2% | 20/25 | 0 | 3.306 / 3.529 ms |
| 25 câu độc lập | chỉ LLM | 81,6% | 6/25 | 4 | 3.291 / 3.524 ms |

Lỗi còn lại của luật trên tập độc lập (để sửa ở vòng sau, **chưa sửa** để giữ số đo thật):
- DL-022 "Cá tra cỡ một ký hai một con, ba mươi tấn" → lượng đọc ra **1 kg** (đúng: 30.000). Sai nguy hiểm; câu đọc lại sẽ nói "một ký" nên người bán nghe ra được, nhưng cần thêm luật "kg/con".
- DL-015 "…ba tấn rưỡi, giao tại vườn, giá mười chín ngàn, dưới mười bảy là không bán" → bỏ sót lượng và hai giá (an toàn: sẽ hỏi lại).
- DL-012 "trăm mốt một ký" → bỏ sót giá (hỏi lại).
- DL-013, DL-016: cờ "ước tính" bật sai (từ "đặt trước", "ai lấy").

Câu thử gồm phương ngữ Nam Bộ (tui, hổng, bữa, mấy ổng, nhiêu), câu gõ không dấu, câu không dấu câu như ASR, một câu Bắc ("cân"), câu ngoài phạm vi, âm lịch. Danh sách: `ai/du_lieu/cau_noi_mau.jsonl`, `cau_noi_doc_lap.jsonl`.

### 4.2 STT + trích xuất (âm thanh TỔNG HỢP)

52 câu mẫu được đọc bằng Piper (giọng chuẩn, không phải nông dân), bản "ồn" thêm nhiễu hồng ~10 dB và nén 8 kHz như điện thoại. GPU float16, beam 5.

| Mô hình | Âm thanh | Gợi ý ngữ cảnh | WER thô* | Ô trường đúng sau luật | Giá sai/bịa | Trễ/câu (trung vị) |
|---|---|---|---|---|---|---|
| small | sạch | không / có | 60% / 50% | 69,3% / 74,9% | 6 / 8 trên 50 | 130–136 ms |
| small | ồn | không / có | 64% / 52% | 64,2% / 71,4% | 7 / 8 | 133–141 ms |
| large-v3-turbo | sạch | không / **có** | 52% / 42% | 81,4% / **84,9%** | 2 / 5 | 177–184 ms |
| large-v3-turbo | ồn | không / **có** | 55% / 48% | 75,1% / **79,9%** | 6 / 5 | 178–185 ms |

\* WER thô bị thổi phồng vì Whisper viết số bằng chữ số ("2 tấn", "25.000") còn câu gốc viết bằng chữ; chỉ số đáng tin là **ô trường đúng sau luật**.

Qua HTTP (`/voice/stt`, tiến trình STT thường trú): lần đầu 1,17 s (nạp mô hình), sau đó ~0,22 s cho câu 6,5 giây.

Lỗi STT tiêu biểu (thật, từ `ai/ket_qua/stt.json`): "sáu ngàn tám" → **"6.008"** (giá sai, lọt qua kiểm tra hợp lý vì vẫn gần giá lúa); "loại hai" → "loại hay"; "xổ ao" → "sổ ảo"; "sầu riêng Ri6" → "sầu dinh di sáu"; "chừng" → "trừng"; "hàng dạt" → "hàng sạt". Đây là lý do **bước đọc lại và người bán nói "đúng rồi" là bắt buộc**, và nên hiện số lớn trên màn cùng lúc đọc.

## 5. Giới hạn với tiếng Việt địa phương

- Chưa có một giây ghi âm thật nào của nông dân. Giọng Nam Bộ thật (nuốt âm, "dz", "h"/"g" đầu, nói nhanh, tiếng máy bơm, gió) chắc chắn kém hơn giọng tổng hợp. Số STT ở trên là **cận trên lạc quan**.
- Từ địa phương chưa phủ: "chục" trái cây (một chục = 12–14 trái ở chợ miền Tây) — hiện hiểu "chục" là 10, **sai nếu người bán đếm trái**; app chỉ nhận đơn vị ký/tạ/tấn nên phải hỏi lại khi nghe "chục trái". "Lít" (100 nghìn) chỉ nhận sau số; "xị", "củ" có hỗ trợ nhưng chưa thử với người thật.
- Tên giống, tên vùng mới ngoài danh sách → không nhận (an toàn: hỏi lại).
- Khmer, Hoa (Sóc Trăng, Trà Vinh) chưa xét.

## 6. Việc cần để dùng thật

1. Thu 300–500 câu thật (có đồng ý, ẩn danh) ở 3 tỉnh, ghi nhãn tay, đo lại cả STT và trích xuất; mục tiêu: 0 lỗi tiền lọt qua đọc lại, ≥ 90% ô trường đúng.
2. So Web Speech vs large-v3-turbo vs PhoWhisper trên cùng tập thật.
3. Thử với người dùng: người bán có nghe và sửa được số sai trong câu đọc lại không (đo tỷ lệ phát hiện lỗi cài sẵn).
