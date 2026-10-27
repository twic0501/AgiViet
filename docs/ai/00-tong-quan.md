# AI · 00 Tổng quan

Bản 25/10/2026. Người viết: kỹ sư AI. Đọc cùng `docs/nghiep-vu/` (00–12) và `docs/database/`.
Mã nguồn và số đo: `ai/` (cách chạy ở `ai/README.md`, số đo gốc ở `ai/ket_qua/*.json`).

## 1. Nguyên tắc (không đổi theo mô hình)

1. **AI chỉ gợi ý và soạn nháp.** Không đăng lô, không ký, không xác nhận tiền, không đồng ý giá, không khóa tài khoản. Mọi đầu ra có cờ `chi_goi_y: true` hoặc là nháp chờ người bấm.
2. **AI không định giá, không ép giá.** Không có thành phần điểm nào dùng giá; không xếp theo giá; không trả số giá kín ra bất kỳ phía nào (05 mục 1, 12 bất biến 10).
3. **Giải thích được.** Mỗi gợi ý ghép có lý do "khớp", dòng "thiếu", điểm từng thành phần; mỗi trường trích từ giọng nói có nguồn (`luat`, `llm(xac_minh)`, `luot_truoc`, `mac_dinh`) và độ tin cậy.
4. **Tiền luôn đọc lại và hỏi lại.** Mọi số tiền nghe được đều nằm trong `can_xac_nhan`; hai cách đọc lệch nhau thì bỏ trống và hỏi lại, không chọn hộ.
5. **Lỗi thì rơi về luật.** Mô hình chậm/lỗi/bận → trả kết quả luật tất định, ghi `che_do: "luat(...)"`. Không có chức năng nào *chỉ* chạy được khi có GPU.
6. **Không truy cập DB.** Dịch vụ AI nhận ảnh chụp dữ liệu (snapshot) từ backend, trả kết quả; backend ghi DB, kiểm quyền, kiểm giá kín.

## 2. Đã chọn làm gì (ít mà chắc)

| Điểm AI | Cách làm | Trạng thái |
|---|---|---|
| Ghép cung cầu (01) | Luật cứng H1–H11 + 9 thành phần điểm của 05 mục 2.4, chiều ngược cho người bán, gợi ý gom | **Chạy được, đo trên dữ liệu ảo** |
| Trích trường từ câu nói (02) | Bộ đọc số nói tiếng Việt + luật; LLM cục bộ (qwen3.5:9b qua Ollama) chỉ là tùy chọn, bị luật kiểm lại | **Chạy được, đo trên 52 + 25 câu tự viết** |
| Nhận dạng giọng nói (02) | Web Speech API trên trình duyệt (mặc định); faster-whisper `large-v3-turbo` cục bộ (tùy chọn) | **Chạy được; chỉ đo trên giọng TỔNG HỢP** |
| Đọc lại xác nhận (02) | Sinh câu đọc lại với số viết bằng chữ; đọc bằng `speechSynthesis` vi-VN của trình duyệt | Câu đọc lại chạy; giọng đọc chưa đánh giá với người dùng |
| Giá tham khảo + khoảng (03) | Trung vị + Q1–Q3 theo 05 mục 3 (DB đã có materialized view, đây là bản đối chiếu) | Chạy được |
| Bất thường giá/cặp (03) | KT-02/03/04/06 theo 05 mục 6, chỉ gắn cờ cho người xem | Chạy được |
| Quét liên lạc lách (03) | Bắt số điện thoại/STK đọc bằng chữ, "dê lô", "ck riêng" (LA-01/02/04) | Chạy được, mẫu thử rất nhỏ |
| Tóm tắt hợp đồng dễ hiểu (03) | Mẫu câu từ trường có cấu trúc, số viết bằng chữ cho nút Nghe; **không dùng LLM** | Chạy được |
| Phân loại ảnh hàng (03) | Chỉ thiết kế | **Chưa làm** |

## 3. Kiến trúc

```
App bán / App mua ──> Backend (quyền, RLS, giá kín, sổ) ──HTTP nội bộ──> Dịch vụ AI (ai/, FastAPI :8090)
                         │  snapshot lô/nhu cầu, câu nói, đơn                 ├─ luật (luôn có, < 10 ms)
                         │<─ gợi ý + lý do / nháp trường + câu hỏi tiếp       ├─ Ollama qwen3.5:9b (tùy chọn, ~3,3 s)
                         └─ ghi mkt.match_candidates, nhật ký kiểm toán       └─ tiến trình STT faster-whisper (tùy chọn, GPU)
```

## 4. Số đo chính (đo thật trên máy RTX 4080 Laptop 12 GB, 25/10/2026)

| Hạng mục | Kết quả |
|---|---|
| Trích xuất, tập **độc lập** 25 câu (không dùng để chỉnh) | Luật: 96,8% ô trường đúng, 20/25 câu đúng hết, **0** số tiền sai |
| Trích xuất, tập 52 câu (đã dùng để chỉnh luật) | Luật: 100% (trước khi chỉnh: 93,8%, 31/52 câu) |
| Chỉ dùng LLM qwen3.5:9b | 81,6–82,2% ô; **4–8 số tiền sai/bịa** (ví dụ "bảy lăm ngàn" → 35.000) |
| Độ trễ trích xuất | Luật 0,2 ms; luật + LLM trung vị 3,3 s, p95 3,8 s |
| STT + luật trên giọng tổng hợp | large-v3-turbo: 84,9% ô đúng (sạch), 79,9% (có ồn); 5/50 giá sai; ~0,2 s mỗi câu ~6 s |
| Ghép trên dữ liệu ảo | 42/42 kỳ vọng (gồm TH-004 nguyên văn); 0 lần lộ giá; 0/300 lần đổi thứ tự khi đổi giá kín; 1.000 lô: 7,3 ms |

Chi tiết và giới hạn: `05-danh-gia-thanh-that.md`.

## 5. Danh mục tài liệu

| File | Nội dung |
|---|---|
| `01-ghep-cung-cau.md` | Luật, điểm, nhóm, gom, chiều người bán, thiên vị, đánh giá |
| `02-giong-noi.md` | STT, trích trường, hội thoại, đọc lại, an toàn tiền, phương ngữ |
| `03-cac-diem-ai-khac.md` | Giá tham khảo, bất thường, quét liên lạc, tóm tắt hợp đồng, ảnh (thiết kế) |
| `04-api-cho-backend.md` | Hợp đồng API, thời gian chờ, dự phòng, kiểm toán, ánh xạ DB |
| `05-danh-gia-thanh-that.md` | Cái gì chạy thật, cái gì chỉ thiết kế, rủi ro, chi phí, điều kiện dùng thật |
