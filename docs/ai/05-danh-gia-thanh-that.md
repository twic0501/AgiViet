# AI · 05 Đánh giá thành thật

Bản 25/10/2026. Máy đo: laptop RTX 4080 Laptop 12 GB, Ollama 0.30.6, Python 3.14 (dịch vụ) và 3.11 (STT). Mọi số dưới đây lấy từ tệp trong `ai/ket_qua/` và chạy lại được bằng lệnh ở `ai/README.md`.

## 1. Đã chạy thật và đo được

| Hạng mục | Số đo | Tệp |
|---|---|---|
| Ghép H1–H11 + điểm trên dữ liệu ảo của đặc tả | 42/42 kỳ vọng (16 tình huống); 0 lộ giá; 0/300 đổi thứ tự khi đổi giá kín; tất định; 1.000 lô 7,3 ms | `ghep.json` |
| Trích xuất luật, 25 câu độc lập (viết sau khi chỉnh, chạy một lần) | 96,8% ô trường; 20/25 câu đúng hết; 0 số tiền sai | `trich_xuat_cau_noi_doc_lap.json` |
| Trích xuất luật, 52 câu dùng để chỉnh | 93,8% trước chỉnh → 100% sau chỉnh (số sau chỉnh **không** chứng minh tổng quát) | `trich_xuat_luat_v0_truoc_chinh.json`, `trich_xuat.json` |
| LLM qwen3.5:9b một mình | 81,6% / 82,2% ô; 4 / 8 số tiền sai hoặc bịa | như trên |
| Luật + LLM có kiểm chéo | 97,2% (độc lập), 0 tiền sai; trễ 3,3 s trung vị, 3,8 s p95; 2–4 lần LLM lỗi/quá hạn trong ~150 lượt (đã rơi về luật) | như trên |
| STT large-v3-turbo + luật, giọng **tổng hợp** | 84,9% ô (sạch), 79,9% (ồn); 5/50 giá sai; 0,18 s/câu; HTTP 0,22 s ấm, 1,17 s lần đầu | `stt.json` |
| Giá tham khảo | Xoài L1 = 25.000 đ, 14 đơn, khớp đặc tả 10 mục 7 | `khac.json` |
| Bất thường | Bắt KT-02/03/04/06 trên giao dịch tự tạo, không tự khóa | `khac.json` |
| Quét liên lạc | 12/12 câu tự viết | `khac.json` |
| Dịch vụ HTTP | `/match` ~3 ms (30 lô), `/voice/extract` luật ~1,6 ms; LLM quá hạn → luật trong 80 ms; đầu vào sai → 422 không lộ giá | `khac.json` |
| Kiểm thử đơn vị | 7 bất biến (số nói, tiền luôn xác nhận, lượng mơ hồ không bịa, ngoài phạm vi, không lộ giá, tất định) | `ai/tests/` |

## 2. Chỉ là thiết kế (chưa có mã chạy)

- Phân loại ảnh hàng (03 mục 5).
- Nạp danh mục từ backend (đang chép tay 8 mặt hàng trong `danh_muc.py`).
- Đẩy nhật ký kiểm toán vào `evt.audit_log`; giữ snapshot theo `phien_ban_du_lieu` (việc của backend).
- Phát hiện thông đồng nhiều bên mua (EG-14), tài khoản liên quan (LA-10), ép loại (EL-06): cần dữ liệu thiết bị/tài khoản mà snapshot không có.
- So sánh PhoWhisper; TTS máy chủ; LLM diễn đạt câu hỏi.
- Embedding chuẩn hóa mô tả tự do: đã tải bge-m3 (1,2 GB) nhưng **không dùng** — luật đủ cho 8 mặt hàng. Có thể xóa (`ollama rm bge-m3`) nếu cần chỗ.

## 3. Còn mô phỏng / giả lập

- **Không có giọng người thật.** Âm thanh STT là Piper đọc câu tự viết (giọng chuẩn, rõ), bản "ồn" là nhiễu nhân tạo. Giọng nông dân miền Tây thật sẽ kém hơn, chưa biết kém bao nhiêu.
- **Câu nói là tự viết** bởi kỹ sư AI (77 câu). Người viết câu cũng viết luật: tập 52 câu bị "học thuộc"; chỉ tập 25 câu độc lập là số đáng tin hơn, và vẫn cùng một người viết.
- **Kỳ vọng ghép**: 41/42 do người viết luật suy ra từ luật (kiểm *đúng đặc tả*, không kiểm *gợi ý có ích*). Tọa độ, thời điểm xác nhận còn hàng, cờ "trước mùa" là giả định (ghi trong `danh_gia_ghep.py`).
- Dữ liệu giá, đơn, uy tín là dữ liệu ảo của đặc tả.

## 4. Giới hạn với tiếng Việt địa phương

- Bộ đọc số xử lý được các lối nói phổ biến (rưỡi, chục, tạ, yến, hai lăm, trăm hai, tấn ba, mốt/một, tư/từ) nhưng là **danh sách tay**; lối nói chưa gặp sẽ bị bỏ sót (an toàn: hỏi lại) hoặc đọc sai (nguy hiểm, xem DL-022 "một ký hai một con" → 1 kg).
- "Chục" khi đếm trái ở chợ miền Tây có thể là 12–14 trái; hệ thống hiểu là 10. App chỉ nhận ký/tạ/tấn nên phải hỏi lại khi nghe "chục trái" (chưa có luật này).
- Whisper hay nghe nhầm phụ âm đầu Nam Bộ và tên riêng: "chừng" → "trừng", "dạt" → "sạt", "Ri6" → "di sáu", "xổ" → "sổ", và **"sáu ngàn tám" → "6.008"**.
- Âm lịch không tự đổi; người lớn tuổi hay hẹn theo âm lịch → thêm một lượt hỏi.
- Chưa xét người nói tiếng Khmer/Hoa, người khiếm thính, giọng run.

## 5. Rủi ro

| Rủi ro | Mức | Đang chặn bằng | Còn hở |
|---|---|---|---|
| **Sai số tiền** (STT nghe nhầm, luật đọc sai, LLM bịa) | Cao | Tiền luôn `can_xac_nhan`; đọc lại bằng chữ; lệch luật/LLM thì bỏ trống; giá ngoài 0,3–3× tham khảo cảnh báo; production không dùng LLM cho số | Sai trong khoảng hợp lý (6.008 vs 6.800) chỉ được bắt khi người bán nghe kỹ; cần hiện số lớn trên màn + nút xác nhận riêng cho giá |
| Sai lượng (DL-022: 30 tấn → 1 kg) | Trung bình | Đọc lại; lượng rất nhỏ so với đơn vị nói không được kiểm | Thêm kiểm "lượng < 10 kg mà câu có chữ tấn/tạ" |
| Người bán quen nói "đúng rồi" mà không nghe | Cao | Không có giải pháp kỹ thuật đầy đủ | Thử nghiệm với người dùng; nút bấm riêng cho giá |
| Thiên vị ghép: người mới, hộ xa, hộ nhỏ, không có mối quen | Trung bình | Điểm mặc định 15 cho người mới; gom nguồn; nhóm khớp một phần vẫn hiện | Chưa đo tỷ lệ hiển thị thật; cần chỉ số công bằng hằng tháng (01 mục 7) |
| Ghép lộ giá kín gián tiếp | Thấp–trung bình | Không trả số giá; điểm không dùng giá; lý do H11 trung tính | Nhóm "gần khớp giá" vốn tiết lộ "giá kín ở trong 5–10%" (đặc tả chấp nhận); bán gấp có thể suy ra từ thứ tự |
| LLM chậm/lỗi lúc tải đầu (đã gặp 1 lần quá 4,5 s khi mô hình chưa nạp) | Thấp | Rơi về luật | — |
| Nhật ký lộ dữ liệu nhạy cảm | Thấp | Không ghi câu nói, không ghi giá; lỗi 422 không trả giá trị | `input_sha256` của câu ngắn đoán lại được |
| Danh mục AI lệch danh mục backend | Trung bình | — | Cần nạp từ backend (04 mục 6) |

## 6. Chi phí và độ trễ khi lên production

- **Luật (ghép, trích xuất, giá, bất thường, quét, tóm tắt)**: CPU, vài ms mỗi yêu cầu, bộ nhớ ~100 MB; chạy nhiều bản sau cân bằng tải; gần như không tốn thêm.
- **STT máy chủ**: cần GPU. Đo trên laptop: ~0,18 s cho câu ~6 s, một tiến trình một lượt → khoảng 4–5 câu/giây mỗi GPU cỡ này; đủ cho pilot vài trăm người bán (đăng lô không liên tục). Bộ nhớ GPU ~2–3 GB cho large-v3-turbo. Nếu dùng Web Speech (mặc định) thì không tốn máy chủ nhưng âm thanh đi qua nhà cung cấp trình duyệt (cần đồng ý, ghi trong chính sách dữ liệu).
- **LLM**: ~3,3 s và ~6,6 GB GPU mỗi lượt, không thêm độ chính xác khi đã kiểm chéo → **không khuyên dùng** ở production.
- Ổ đĩa: venv STT 2,7 GB (thư viện CUDA), mô hình Whisper 1,6 GB, giọng Piper 63 MB.

## 7. Điều kiện để dùng thật

1. Thu và gán nhãn ≥ 300 câu nói thật (đồng ý rõ ràng, ẩn danh) ở ít nhất 3 tỉnh; đo lại; đạt: **0 lỗi tiền lọt qua bước xác nhận** trong thử người dùng, ≥ 90% ô trường đúng sau STT.
2. Thử người dùng 10–20 người bán: đo tỷ lệ phát hiện số sai cài sẵn trong câu đọc lại; nếu < 95% thì bắt buộc màn xác nhận giá dạng số lớn + nút riêng.
3. Nhóm nghiệp vụ xác nhận 5 mâu thuẫn ở 01 mục 5 (đặc biệt "ước tính" và "kiểm định không lọc cứng").
4. Backend nạp danh mục cho AI, ghi `mkt.match_candidates`, giữ snapshot kiểm toán, khóa API bằng `AGV_AI_API_KEY` trong mạng nội bộ.
5. Sửa các lỗi đã biết của tập độc lập (DL-012, 013, 015, 016, 022) **rồi viết tập độc lập mới** để đo lại (không đo lại trên tập cũ).
6. Theo dõi sau khi mở: tỷ lệ người bán sửa trường sau đọc lại (theo trường), tỷ lệ rơi về nhập tay, tỷ lệ hiển thị top-3 của người bán mới, số cờ bất thường được vận hành kết luận đúng/sai.

## 8. Việc đã sửa từ phần Codex làm dở

Trong lúc kỹ sư AI dừng, Codex đã thêm dịch vụ FastAPI, lược đồ Pydantic chặt, ghép H1–H11, giá/bất thường/tóm tắt và thay venv. Đã rà và giữ phần đúng (lược đồ chặt, lỗi 422 không lộ giá, nhật ký có băm, rơi về luật, kiểm chéo LLM chặt hơn). Đã sửa:
- Ghép: kiểm định bị lọc cứng (làm NC-3003/3004 không bao giờ có nguồn) → chuyển sang "cần kiểm định trước khi bốc"; đòi "mã cơ sở đóng gói" ở lô (là giấy của bên mua) → bỏ; lô ước tính đủ lượng bị xếp "một phần" trái TH-004 → sửa; gom loại hết lô ước tính → sửa; thêm điểm từng thành phần, chiều người bán, người bán chưa xác minh không ghép xuất khẩu (TH-001).
- Venv mới (Python 3.14) không có faster-whisper → tách `.venv-stt` (3.11); STT đổi sang tiến trình thường trú (trước đó nạp mô hình mỗi yêu cầu, mặc định CPU, cần biến môi trường không có).
- Thời gian chờ LLM mặc định 3 s thấp hơn trung vị đo được (3,3 s) → 4,5 s.
- Tóm tắt hợp đồng in mã mặt hàng và giờ UTC → tên mặt hàng, giờ Việt Nam, thêm lời đọc bằng chữ.
- Bộ đọc số vỡ khi STT trả chuỗi như "20.8.10" → trả "không đọc được" thay vì lỗi.
- Nhật ký kiểm toán thêm tóm tắt đầu ra (không giá).
