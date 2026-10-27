# Giao việc: bọc nốt điều phối thành cmd.* (Codex gpt-6.1-sol)

Bạn là kiến trúc sư CSDL AgiViet production v2. Làm tiếp, không làm lại: trước lượt này `db/` có 37 migrations, 340/340 đạt. Lượt trước bị ngắt (đổi tài khoản) sau khi đã viết `0038`–`0047` nhưng chưa chạy lại kiểm thử đầy đủ; đọc các tệp đó, chạy thử, sửa nếu lỗi (chưa triển khai nên được sửa các tệp 0038–0047), rồi làm phần còn thiếu. Đọc `docs/database/08-ket-qua-de-xuat-backend.md`, `docs/database/06-huong-dan-cho-backend.md`, và mục "phiên 5" cùng 3 đề nghị mới trong `docs/backend/de-xuat-csdl.md`.

Việc: viết `cmd.*` SECURITY DEFINER cho mọi bước backend còn chạy bằng owner (xem `docs/backend/danh-gia-thanh-that.md` mục 4): lô, nhu cầu, lời chào/giữ lượng, lập đơn, kích hoạt đơn sau cọc, khoản trả thẳng, giao nhận, quyết toán, đối soát, hết hạn, hủy (kể cả hạch toán hủy đầy đủ), tranh chấp, đề nghị sửa, thành viên/vai, việc vận hành, khung/nhóm. Danh tính lấy từ login đã ánh xạ, không nhận actor từ tham số.

Migration mới, không sửa cũ; thêm kiểm thử; chạy lại toàn bộ trên PGlite và `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy). Ghi bảng "bước backend → hàm cmd.*" vào `06-huong-dan-cho-backend.md`. Chỉ ghi `db/` và `docs/database/`. Không chờ vòng lặp. Xong in tóm tắt (đạt/tổng trước–sau) rồi dừng.
