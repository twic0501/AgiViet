# Giao việc: Chuyển app MUA từ bản mẫu sang v2 (không dựng mới)

Người sáng lập chốt 27/10: v2 phải **chuyển** từ bản mẫu, không dựng lại. Căn cứ: `docs/doi-chieu/bang-doi-chieu.md` (bảng Codex đã lập, mục "Danh sách chuyển ưu tiên"). Claude đang chuyển app BÁN; việc này là app MUA. Chỉ sửa `frontend/` (app mua và phần dùng chung **không** làm hỏng app bán) — nếu cần API mới, ghi đề xuất vào `docs/frontend/de-xuat-backend.md`, không tự sửa backend.

## Nguồn mẫu
- `/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4/fe-thumua/` (chỉ đọc): `js/man/*.js`, `js/cau-hinh.js`, `scripts/tao-trang-mua.mjs`.
- `/home/twictrn/Documents/AgiViet/bo-cuc-app-mua/index.html`, `AgiViet_dac_ta_nghiep_vu_app_mua_V1.md`, `AgiViet_prompt_app_mua_V2.md`, `AgiViet_danh_gia_app_mua_v2.md`, `AgiViet_danh_gia_app_mua_multi_segment.md`.

## Quy tắc người sáng lập (bắt buộc)
- Gói dịch vụ KHÔNG nằm trong app (thuộc bước đăng ký trên website) — đã bỏ khỏi menu, giữ nguyên như vậy.
- Mọi nút là chữ (không icon thay chữ); không có ô "Vì sao?"; header cố định mọi màn.
- Không lộ công cụ thử ở app mua (dải môi trường thử, số ảo/OTP, đóng vai) — chỉ quản trị.
- Không chép engine localStorage, số tiền viết cứng hay state `flowAt/reset` của bản mẫu; nối vào API v2.

## Phạm vi (theo thứ tự)
1. **Khung và điều hướng app mua** đúng bố cục mẫu (`bo-cuc-app-mua`): thanh/menu, đầu màn, Tổng quan theo việc tới lượt.
2. **Nguồn hàng**: bỏ gọi `/v1/lots/{id}` từng lô (N+1, hiện 70 lần gọi cho 70 lô); bộ lọc mặt hàng/loại/vùng, nhãn "Bán gấp" (API đã trả `ban_gap`, `ban_gap_den`), lô kém loại.
3. **So báo giá** có cột giá tham khảo (`GET /v1/reference-prices`) và cảnh báo giá bất thường theo bảng đối chiếu.
4. **Hợp đồng/nghiệm thu** trình bày 3 phần (đạt/hạ cấp/trả lại) có ảnh từng dòng, theo mẫu `bo-cuc-app-mua:646`.
5. **Mối quen và mua lại** (`fe-thumua/js/man/nha-cung-cap.js`, M11).
6. **Kho và truy xuất** (`fe-thumua/js/man/kho.js`, M22/M23) — nếu thiếu API thì ghi đề xuất backend, làm phần giao diện đọc được.

## Bằng chứng xong
- Mỗi mục có kiểm thử Playwright trên giao diện thật trong `frontend/tests/e2e-*-mua.mjs`, chạy trên cặp cô lập (backend `PORT=18980 AGV_DOC_DIR=/tmp/agv-e2e-codex npx tsx backend/src/server.ts`, frontend `PORT=18990 API_ORIGIN=http://127.0.0.1:18980 node frontend/server.mjs` — nếu cổng đã có người dùng thì dùng lại, không tắt).
- Chạy lại `frontend/tests/e2e-luong-chinh.mjs` (15/15) và `frontend/tests/e2e-tien-ich-ban.mjs` (15/15): phải vẫn đạt. `npm test` trong frontend xanh.
- Chụp lại các màn app mua ở 390 và 1280 px, tự soát, ghi kết quả vào `docs/frontend/chuyen-mau-app-mua-ket-qua.md` (mục nào xong / còn thiếu / chưa chứng minh).
