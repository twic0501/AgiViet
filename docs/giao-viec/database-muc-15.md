# Giao việc: sửa DB theo đề xuất mục 14–15 của backend (Codex gpt-6.1-sol)

Kiến trúc sư CSDL AgiViet production v2. Làm tiếp, không làm lại: `db/` có 50 migrations, 468/468 đạt; backend 54/54. Đọc `docs/backend/de-xuat-csdl.md` mục 14 và 15.

Việc:
1. Phụ lục GIẢM GIÁ: `refund_deposit_reduction` (0036) hoàn cả phí chênh nhưng guard `ck_instruction_fee_refund` (0040) chỉ cho `decrease_qty`/`force_majeure_reduction` → ký phụ lục giảm giá bị rollback. Chọn một trong hai cách ở mục 15, sửa cho khớp đặc tả `docs/nghiep-vu/04-tien-va-coc.md`.
2. Thêm command cho bên mua cân lại sau khi người bán phản đối kiểu `chia_lai` (đợt `disputed`), đúng `docs/nghiep-vu/` về cân lại/chia lại.
3. Các mục 14 nếu làm được: mời người chưa có danh tính (`create_invitee`), mã nạp cọc ngắn thay `TOPUP-<uuid>`. Billing tháng đầu (đủ giá hay tính theo ngày) và quyền người giúp mặc định là chính sách CHƯA CHỐT: không đổi, chỉ ghi lại.

Migration mới, không sửa cũ; thêm kiểm thử; chạy lại toàn bộ PGlite và `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy); chạy thêm `cd backend && npm test` để chắc không làm hỏng backend (chỉ chạy, không sửa backend). Cập nhật `docs/database/06-huong-dan-cho-backend.md`. Chỉ ghi `db/` và `docs/database/`. Không chờ vòng lặp. Xong in tóm tắt đạt/tổng rồi dừng.
