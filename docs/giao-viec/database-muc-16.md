# Giao việc: sửa đồng hồ tranh chấp (Codex gpt-6.1-sol)

Kiến trúc sư CSDL AgiViet v2. Làm tiếp: `db/` 52 migrations, 495/495 đạt. Đọc `docs/backend/de-xuat-csdl.md` mục 16: `open_dispute` ghi `disputes.created_at` bằng `now()` (giờ thật) nhưng `revise_acceptance_after_objection`/`ck_dispute_scope` so với `ref.clock_at()` (đồng hồ thử) → ở môi trường thử mọi phản đối trông như quá 24 giờ. Sửa để mọi mốc thời gian nghiệp vụ của tranh chấp dùng cùng một đồng hồ (`ref.clock_at()`, production vẫn là giờ thật), hoặc so với `due_at` của hạn. Rà nhanh các bảng khác có cùng kiểu lệch `now()` vs `ref.clock_at()` và sửa luôn nếu có.

Migration mới; thêm kiểm thử; chạy lại toàn bộ PGlite, `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ chạy) và `cd backend && npm test` (chỉ chạy; mục tiêu TH-R2-CANLAI đạt, tổng 54/54). Chỉ ghi `db/` và `docs/database/`. Không chờ vòng lặp. Xong in tóm tắt đạt/tổng rồi dừng.
