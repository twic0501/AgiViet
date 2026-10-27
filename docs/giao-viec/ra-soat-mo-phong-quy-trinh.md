# Giao việc: Rà soát độc lập trang mô phỏng quy trình (KHÔNG sửa app, backend, DB)

Người sáng lập (27/10) đã chốt: quy trình nghiệp vụ phải được mô phỏng trực quan và duyệt trước; giao diện ba app để người sáng lập quyết sau; **không đụng giao diện app**. Việc `chuyen-mau-app-mua` đã HỦY.

## Đối tượng rà soát
- `docs/mo-phong-quy-trinh/quy-trinh.json` (sinh từ `tao_du_lieu.py`) và trang `docs/mo-phong-quy-trinh/index.html` (đăng ở `/mo-phong-quy-trinh/`).
- Căn cứ chính: `/home/twictrn/Documents/AgiViet/tai-lieu-tong-hop/index.html` (24/10, mục A–G). Tài liệu chốt cùng thư mục: `AgiViet_brief_app_ban_chot_V1.md`, `AgiViet_dac_ta_nghiep_vu_app_mua_V1.md`, `AgiViet_prompt_app_mua_V2.md`, `AgiViet_luong_hoat_dong.csv`, `AgiViet_danh_muc_man.csv`.
- Phỏng vấn: `/home/twictrn/.claude/jobs/d88082d5/tmp/phong-van-chinh.txt` (4 bài phân tích + mô tả 7 ảnh).
- Motion v2: `/home/twictrn/Documents/ChatGPT/agiviet/agiviet-seller-motion-v2-assets/INLINE-SCREEN-MAP.json` (26 case) — chỉ để kiểm độ phủ tình huống.

## Cần trả lời (ghi vào `docs/mo-phong-quy-trinh/ra-soat-codex.md`)
1. **Lệch tài liệu gốc:** bước/số tiền/hạn/ai làm nào sai so với A–G. Ghi mục gốc và sửa đề xuất. Kiểm mọi số tiền với ví dụ C13 (cọc chi + hoàn = cọc; người bán đã nhận − phải hoàn = giá trị nghiệm thu).
2. **Suy diễn vượt phỏng vấn:** chấm cam nào nói mạnh hơn bằng chứng (phỏng vấn 1 người, DN thực phẩm đóng gói).
3. **Thiếu tình huống:** so với D2b, 11 kịch bản app mua (prompt V2 §8), 26 case Motion v2, nhánh C7 (4 cách chở), C9, C11, uy tín, che liên lạc, ứng tiền, hồ sơ ngành hàng. Liệt kê tình huống còn thiếu, ưu tiên.
4. **Vai trò:** RACI ai gom / kiểm / chở / trả / chịu khi thiếu–sai có đủ chưa.
5. **Việc cần chốt:** còn mâu thuẫn nào giữa các tài liệu chưa đưa vào.
Được phép sửa `tao_du_lieu.py` để thêm tình huống còn thiếu (giữ nguyên cấu trúc dữ liệu, chấm nguồn đúng: goc / phong_van / mau_thuan), chạy lại `python3 docs/mo-phong-quy-trinh/tao_du_lieu.py`, rồi `node docs/mo-phong-quy-trinh/kiem-thu.mjs http://127.0.0.1:18888/mo-phong-quy-trinh/` phải đạt hết. Sau khi sửa, chép `index.html` và `quy-trinh.json` sang `frontend/mo-phong-quy-trinh/`.
Không làm mềm nhận xét, không đoán: thiếu bằng chứng thì ghi "chưa kiểm".
