# AI · 04 Hợp đồng API cho backend

Dịch vụ: `ai/agiviet_ai/dich_vu.py` (FastAPI). Lược đồ đầu vào chặt: `ai/agiviet_ai/mo_hinh.py` (Pydantic, `extra='forbid'`, trường lạ → 422). OpenAPI tự sinh tại `GET /openapi.json` khi chạy.

## 1. Nguyên tắc nối

1. **Chỉ gọi từ backend, mạng nội bộ.** App không gọi trực tiếp. Khi đặt `AGV_AI_API_KEY`, mọi yêu cầu phải có header `x-ai-key` (so sánh hằng thời gian). Cổng mặc định đề xuất **8090** (khớp `infra/docker-compose.yml`, `AI_URL=http://ai:8090`).
2. **AI không đọc/ghi DB.** Backend gửi ảnh chụp dữ liệu đã lọc quyền (snapshot) kèm `phien_ban_du_lieu`; AI trả gợi ý; backend ghi DB, áp RLS, áp giá kín.
3. **Kết quả AI không bao giờ là lệnh.** Mọi phản hồi là gợi ý (`chi_goi_y: true`) hoặc nháp. Backend vẫn kiểm lại mọi bất biến (lượng, giá kín, quyền) khi người dùng bấm.
4. **Tiền**: số nguyên đồng; lượng: kg thập phân trong API AI (DB lưu gam: nhân 1.000 và làm tròn khi ghi). Thời gian: ISO 8601 **có múi giờ** (thiếu múi giờ → 422).
5. **Mỗi phản hồi có header `X-Request-ID`**; backend lưu ID này cùng bản ghi nghiệp vụ để tra kiểm toán.

## 2. Danh sách endpoint

| Endpoint | Việc | Thời gian chờ backend nên đặt | Khi lỗi/quá hạn |
|---|---|---|---|
| `GET /health` | Sẵn sàng, có STT không | 1 s | Coi như AI tắt: dùng luật SQL/ẩn tính năng |
| `POST /match` | Nhu cầu + lô → 3 nhóm gợi ý có lý do | **2 s** (đo: ~3 ms/30 lô, 7 ms/1.000 lô) | Hiện danh sách lọc cứng từ SQL (`mkt.search_lots`) không điểm, nhãn "chưa xếp" |
| `POST /match/reverse` | Lô → nhu cầu khớp (chiều người bán) | 2 s | Ẩn khối "Bên mua đang cần" |
| `POST /voice/extract` | Câu nói (chữ) → trường nháp + câu hỏi tiếp + câu đọc lại | `che_do=luat`: **0,5 s**; `ket_hop`: `timeout_llm_s` + 1 s (mặc định 4,5 + 1) | Mở form nhập tay, giữ nguyên câu đã nghe |
| `POST /voice/stt` (bí danh `/voice/transcribe`) | WAV → chữ | **25 s** (đo: 0,2 s ấm, 1,2 s lần đầu) | Dùng Web Speech hoặc gõ tay; 503 có mã lỗi |
| `POST /prices/reference` | Đơn đã chốt → giá tham khảo + khoảng Q1–Q3 | 2 s | Dùng `mkt.reference_prices` (nguồn chính) |
| `POST /anomalies/check` | Giao dịch 90 ngày → cờ KT-02/03/04/06 | 10 s (chạy nền) | Bỏ qua lượt; chạy lại lần sau |
| `POST /messages/scan` | Tin nhắn → vị trí cần che | **0,3 s** | Dùng regex backend (LA-01) |
| `POST /contracts/summarize` | Trường hợp đồng → lời tóm tắt + lời đọc | 1 s | Hiện 8 thẻ điều khoản từ dữ liệu gốc |
| `GET /thu-giong-noi` | Trang thử nội bộ | — | Không dùng ở production |

Giới hạn tải: thân yêu cầu ≤ 2 MB; một lượt LLM và một lượt STT cùng lúc (`LLM_DANG_BAN` → tự rơi về luật; STT bận → 429 `STT_DANG_BAN`). Mở rộng: chạy nhiều bản dịch vụ luật (rẻ, CPU), STT/LLM tách máy GPU.

## 3. Chi tiết

### 3.1 `POST /match`

Đầu vào (rút gọn; đủ trường xem `MatchRequest`):

```json
{
  "nhu_cau": {"id": "NC-3001", "ben_mua_id": "TC-M01", "phan_khuc": "che_bien", "mat_hang": "XOAI_CAT_CHU",
    "dang": "tuoi", "loai": ["L1"], "luong_kg": 2000, "toi_thieu_nguon_kg": null,
    "ngay_tu": "2026-11-03", "ngay_den": "2026-11-05", "vi_tri": {"vi_do": 10.62, "kinh_do": 106.76},
    "ban_kinh_km": null, "giay_to_bat_buoc": [], "giay_to_uu_tien": [], "gia_toi_da_kin": 24000,
    "truoc_mua": true, "can_gom": false, "kenh": "thuong", "ben_ban_chan": [], "kieu_giao": "tu_lay", "trang_thai": "dang_mo"},
  "lo": [{"id": "L-0412", "ben_ban_id": "TC-B01", "mat_hang": "XOAI_CAT_CHU", "dang": "tuoi", "loai": "L1",
    "luong_khai_kg": 4000, "da_can": false, "da_cam_ket_kg": 0, "dang_giu_kg": 0,
    "ngay_co_hang": "2026-11-02", "han_su_dung": "2026-11-12", "het_cach_ly": "2026-11-01",
    "vi_tri": {"vi_do": 10.405, "kinh_do": 105.7},
    "giay_to": [{"ma": "ma_vung_trong:TQ", "trang_thai": "da_xac_minh", "tu_ngay": "2026-01-01", "den_ngay": "2027-06-30"}],
    "gia_thap_nhat_kin": 21500, "uy_tin": 92, "so_don_hoan_tat": 18, "so_don_voi_ben_mua": 0,
    "xac_nhan_luc": "2026-11-01T08:00:00+07:00", "trang_thai": "dang_ban", "khoa_an_toan": false,
    "nguoi_ban_bi_khoa": false, "cap_mo_cho_phep": true, "co_kiem_dinh_phu_vung": true, "vi_pham_90_ngay": false,
    "ban_gap": false, "giao_duoc": null, "loai_nguoi_ban": "ho", "nguoi_ban_da_xac_minh": true, "diem_gom_id": "ĐG-01"}],
  "thoi_diem": "2026-11-02T08:00:00+07:00",
  "phien_ban_du_lieu": "snap-2026-11-02T08:00:00Z-abc123"
}
```

Backend phải tính trước, từ nguồn chính: `da_cam_ket_kg`, `dang_giu_kg` (sổ lượng `ledger.qty_balances`), `han_su_dung` (thu hoạch + thời gian sống của hồ sơ ngành hàng), trạng thái giấy tờ, uy tín (05 mục 5.1), `so_don_voi_ben_mua`, `vi_tri` của lô (vườn) và của điểm nhận/điểm gom. **Hai giá kín chỉ đi một chiều vào AI**; AI không trả lại.

Đầu ra: `khop_du[]`, `khop_mot_phan[]`, `gan_khop_gia[]`, mỗi phần tử `{lo_id, nhom, nhan_gia, kha_dung_cam_ket_kg, khoang_cach_km, ngay_giao_du_kien, diem, diem_thanh_phan, ly_do_khop[], thieu[], ghi_chu[]}`; `goi_y_gom` (hoặc null); `so_cung_cau`; `phien_ban_luat`; `phien_ban_du_lieu`; `chi_goi_y: true`. Không có tên hộ: backend ghép tên/vùng theo quyền (05 mục 2.9, 02 mục 2.2 nhà hàng không thấy hộ gốc).

**Ghi vào DB** (`mkt.match_candidates`, migration 0012):

| Cột | Lấy từ |
|---|---|
| `demand_line_id`, `lot_id` | id nội bộ tương ứng `nhu_cau.id`, `lo_id` |
| `match_group` | `khop_du`→`full`, `khop_mot_phan`→`partial`, `gan_khop_gia`→`near_price` |
| `score_bps` | `round(diem × 100)`; nếu backend muốn giữ phần bán gấp để xếp, cộng 1.000 khi lô bán gấp (cột cho tới 11.000) |
| `distance_m` | `round(khoang_cach_km × 1000)` |
| `promiseable_qty` | `round(kha_dung_cam_ket_kg × 1000)` (gam) |
| `algorithm_version` | `phien_ban_luat` |
| `reasons` | `{ly_do_khop, thieu, ghi_chu, diem_thanh_phan, request_id}` |
| `expires_at` | `thoi_diem` + 6 giờ, hoặc sớm hơn khi có sự kiện ở 05 mục 2.8 |

### 3.2 `POST /voice/extract`

```json
{"van_ban": "Dạ tui có hai tấn rưỡi xoài cát Chu loại một, mốt giao, giá hai lăm nghìn",
 "hom_nay": "2026-10-25", "che_do": "luat", "timeout_llm_s": 4.5,
 "da_co": {"noi_giao": "tai_vuon"}, "xung_ho": "anh chị"}
```

Đầu ra:

```json
{"truong": {"mat_hang": {"gia_tri": "XOAI_CAT_CHU", "nguon": "luat", "tin_cay": 0.95, "doan_goc": "xoai cat chu", "ghi_chu": ""},
            "luong_kg": {"gia_tri": 2500.0, "nguon": "luat", "tin_cay": 0.7, "doan_goc": "hai tấn rưỡi", "ghi_chu": ""},
            "gia_mong_muon": {"gia_tri": 25000, "nguon": "luat", "tin_cay": 0.85, "doan_goc": "hai lăm nghìn", "ghi_chu": ""}, "...": {}},
 "thieu": [], "can_xac_nhan": ["gia_mong_muon"], "canh_bao": [],
 "cau_hoi_tiep": "", "cau_doc_lai": "Dạ em đọc lại cho anh chị nghe. ... Em chỉ lưu nháp, chưa đăng.",
 "che_do": "luat", "llm_ms": null, "loi_mo_hinh": null}
```

Quy tắc cho backend/app:
- `nguon = "luot_truoc"` là trường backend gửi trong `da_co`. AI **không lưu phiên**; backend giữ nháp theo người dùng (bảng nháp lô, xóa mềm được).
- Chỉ ghi vào nháp các trường `nguon` khác `mac_dinh`; trường `mac_dinh` (ví dụ hình thức suy từ ngày) phải hiện để người bán chọn.
- Mọi trường trong `can_xac_nhan` phải được người bán xác nhận rõ (nói "đúng rồi" sau câu đọc lại **và** bấm nút). Không đăng khi `thieu` khác rỗng.
- `gia_thap_nhat` là giá kín: chỉ lưu vào lô của người bán, không vào nhật ký chung, không gửi đi đâu khác.
- `che_do` có thể là `luat`, `ket_hop`, `luat(llm_loi)`, `luat(du_phong)`; khuyên production dùng `luat`.

### 3.3 `POST /voice/stt`

`Content-Type: audio/wav`, PCM16 mono 16 kHz, ≤ 30 giây (app ghi bằng MediaRecorder rồi đổi định dạng, hoặc backend dùng ffmpeg). Đầu ra `{van_ban, ngon_ngu, thoi_luong_giay, tin_cay_tb, ms, chi_luu_nhap: true}`. Mã lỗi: 415 `CAN_WAV_PCM16_MONO_16000HZ`, 422 `WAV_KHONG_HOP_LE_HOAC_QUA_30_GIAY`, 429 `STT_DANG_BAN`, 503 `STT_CHUA_CAU_HINH_DUNG_WEB_SPEECH_HOAC_NHAP_TAY` / `STT_LOI_DUNG_NHAP_TAY`. Tệp âm thanh tạm bị xóa ngay sau khi nhận dạng; AI không lưu âm thanh.

### 3.4 Các endpoint còn lại

- `/prices/reference`: `{mat_hang, loai, vung, mien, ngay, don[]}` → `{trang_thai, gia_vnd_kg, khoang_vnd_kg, so_don, so_cap, vung, do_tin_cay, don_nguon[]}`.
- `/anomalies/check`: `{ngay, giao_dich[]}` → `{canh_bao[{ma, don_id|cap, ly_do, can_nguoi_xem}], tu_khoa_tai_khoan: false}`. Backend tạo việc V15 (P2) / P3 theo 08.
- `/messages/scan`: `{noi_dung}` → `{can_che[{loai, vi_tri:[bat_dau, ket_thuc]}], phat_hien[], canh_bao[]}`. Backend che theo vị trí, đếm lần theo LA-01.
- `/contracts/summarize`: trường của phiên bản hợp đồng + `ma_bam` → `{dong[{nguon, noi_dung, loi_doc}], dieu_khoan_chua_co[], can_doc_ban_goc: true}`.

## 4. Lỗi chung

| HTTP | `ma_loi` | Ý nghĩa | Backend làm |
|---|---|---|---|
| 401 | `KHONG_DU_QUYEN` | Sai/thiếu `x-ai-key` | Lỗi cấu hình, báo động |
| 413 | `DU_LIEU_QUA_LON` | Thân > 2 MB | Chia lô (≤ 1.000 lô mỗi lần) |
| 422 | `DU_LIEU_KHONG_HOP_LE` | Sai lược đồ; chỉ trả vị trí và loại lỗi, **không trả lại giá trị** (tránh lộ giá kín vào log) | Sửa snapshot |
| 500 | `AI_LOI_NOI_BO` | Lỗi không lường | Dự phòng như bảng mục 2 |
| 503 | `KHONG_GHI_DUOC_KIEM_TOAN` | Không ghi được nhật ký kiểm toán → từ chối trả kết quả | Dự phòng; báo động |

## 5. Nhật ký kiểm toán

Mỗi yêu cầu ghi một dòng JSON (hiện: `ai/ket_qua/kiem_toan.jsonl`, chỉ ghi thêm) gồm: `luc_utc`, `request_id`, `duong_dan`, `http_status`, `ms`, `input_sha256` (băm thân yêu cầu), `phien_ban`, `phien_ban_luat`, `phien_ban_du_lieu`, `che_do`, `du_phong`, và `dau_ra` tóm tắt **không chứa giá**: với `/match` là thứ tự `lo_id` từng nhóm + số lô bị loại theo mã luật; với `/voice/extract` là tên trường, nguồn, độ tin cậy, `can_xac_nhan`, `thieu` (không ghi câu nói, không ghi số tiền).

Đủ để trả lời "vì sao lô X không hiện cho nhu cầu Y lúc T": chạy lại `/match` với snapshot `phien_ban_du_lieu` (backend phải giữ snapshot hoặc dựng lại được từ DB theo thời điểm) và cùng `phien_ban_luat` (tất định).

Production: chuyển dòng nhật ký sang `evt.audit_log` (qua outbox của backend) hoặc kho log chỉ ghi thêm có hạn giữ; `input_sha256` chỉ giúp đối chiếu, không phải ẩn danh (câu nói ngắn có thể đoán lại được từ băm).

## 6. Danh mục và phiên bản

`ai/agiviet_ai/danh_muc.py` đang chép tay tối thiểu 8 mặt hàng (tên gọi địa phương, bảng loại theo trọng lượng, giá tham khảo ảo). Cần backend cung cấp `GET mat_hang/{ma}/ho_so` (12 mục API) để dịch vụ AI nạp khi khởi động và mỗi khi hồ sơ đổi phiên bản; mã luật ghi `phien_ban_luat`, danh mục nên ghi thêm phiên bản hồ sơ vào phản hồi (chưa làm).

## 7. Việc backend cần phối hợp

1. Dựng snapshot cho `/match` từ DB (khả dụng từ sổ lượng, giấy tờ đã xác minh, tọa độ, uy tín, cặp đã mua, cờ bán gấp/khóa) và ghi kết quả vào `mkt.match_candidates` theo bảng 3.1; chạy lại theo sự kiện 05 mục 2.8.
2. Thêm trường rõ ràng "nhu cầu trước mùa" (đang phải giả định, xem 01 mục 5 A3).
3. Giữ trạng thái hội thoại giọng nói (`da_co`) và bắt buộc bấm xác nhận cho mọi trường tiền.
4. Giữ hoặc dựng lại được snapshot theo `phien_ban_du_lieu` cho kiểm toán.
5. Giá tham khảo: một nguồn (DB); endpoint AI chỉ để đối chiếu/khoảng.
6. Hạ tầng: stub `infra/stub/ai.mjs` có `/match/rerank` — dịch vụ thật **không** có endpoint này; dùng `/match` (đã có bí danh `/voice/transcribe` cho STT).
