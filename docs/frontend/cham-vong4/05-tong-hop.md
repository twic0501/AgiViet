# Vòng 4 — tổng hợp chấm chéo đổi vai (bản đi thi, 03/11/2026)

| Phần | Claude | ChatGPT | Ghi chú |
|---|---:|---:|---|
| A. App bán (70) | 53 (L1, vai người bán) | 50 (L2, vai người bán) | Lệch 3: ChatGPT trừ thêm ở luồng chính (cần tua giờ), tiền (cọc khung), độ gọn (số tiền chính xác nằm trong `title`). |
| B. App mua (100) | 58 (L2, vai bên mua, sau E108) | 57 (L1, trước E108) | Gần như trùng. Lần trước: 49. |
| C. Tiêu chí buổi thi (50) | 37 → **32** | 29 → **32** | Hai bên hội tụ ở 32. Claude nhận D3 chấm cao ở L1 (chỉ đúng chiều người bán). |

## Đã sửa ngay trong vòng chấm (commit)
- E107: AI hành xử theo tính cách người mẫu; thẻ chọn vai không hứa quá hành vi.
- E108: bên mua chọn vai **chuyển cọc giả lập được** (trước bị chặn vì đòi `?thu=`); AI chạy cả màn sâu `mua.html`; app mua đọc đúng `confirmed_vnd`.
- E109: lời chào bị trả giá lại / đã chốt chưa lập đơn vào "Tới lượt bạn" (app mua).
- E110: bộ đọc số `docSo` dùng chung — "12.5" kg không còn thành 125 (đăng bài, nhật ký vườn, xuất hàng).
- Trước đó trong vòng: Hôm nay app bán không ghi "chưa có hợp đồng" khi đã xong đơn; giá trong thông báo AI có dấu chấm.

## Còn lại (từ danh sách hai bên, trong phạm vi buổi thi), nặng trước
1. **Thời gian giao trong buổi thi**: đơn hẹn giao sau 15 phút; cần cách tua giờ có ghi rõ ở bản thử (hoặc người trình diễn chờ) — bên bán và bên mua đều chạm.
2. **Sổ Tiền app bán tính cọc khung tuần** (HTX): `backend/src/nghiep-vu/trung-binh.ts:18`.
3. **Xem ảnh nghiệm thu trước khi người bán ký** (ca hạ loại/trả lại): `ban-don.html:747`.
4. **Hôm nay app mua trả lời đủ/thiếu kg theo món** (T1).
5. Màn sâu `mua.html` còn lối quay về Hôm nay/Tiền/Tin nhắn mẫu cũ (D5).
6. Tiền tuần có nút "Chưa thấy tiền" (`ban-khung.html:113`); hiện số đồng đầy đủ ở các khoản cần đối chiếu (`ban-tien.html`).
7. Kịch bản E2E bên mua: gọi vòng bằng tài khoản mua, bám đúng đơn vừa tạo, hết vòng chưa xong thì báo thất bại.
8. Ca có tiền thừa trong cọc để show "ngân hàng tự hoàn"; một kịch bản ngoại lệ (giao thiếu / hạ cấp).

Tệp: `01-claude-luot1-ban.md`, `02-chatgpt-luot1-mua.md`, `03-claude-luot2-mua.md`, `04-chatgpt-luot2-ban.md`.
