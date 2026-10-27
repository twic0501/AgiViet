# 08. Kết quả gateway PostgreSQL và phiên bền · 26/10/2026

Đã xử lý đề xuất backend mục 17 trong phạm vi `db/` và `docs/database/`. Có **55 migrations**, giữ nguyên 0001–0053. Không sửa mã nguồn, assertion hay fixture backend/security.

| Thay đổi | Kết quả |
|---|---|
| 0054 | Bảng cổng do owner quản lý; helper lấy vai gọi đúng qua SECURITY DEFINER; thay mọi tra mapping/kiểm worker dùng session_user trong các định nghĩa đang hoạt động. |
| Danh tính | enter_actor, context RLS, accept_invitation, record_registration, apply_bank_event, complete_bank_return, verify_bank_account nhận đúng login hiệu lực. Các so sánh session_user/current_user trong clock/guard ngân hàng chỉ phân biệt owner import với runtime, được giữ nguyên. |
| Tấn công | Chặn login thường SET ROLE sang principal khác, giả gateway bằng GUC, ghi cấu hình cổng, vai chưa có mapping, gateway cấu hình INHERIT và gateway chưa SET ROLE/đã RESET ROLE. Không hưởng quyền worker bắc cầu của gateway. |
| Provision | `db/scripts/cap-quyen-cong.sql` bỏ GRANT vòng, cấp metadata lúc mở pool, đặt membership cổng INHERIT FALSE. Broker tạo/cấp principal thành công qua đúng vai runtime. |
| 0055 | Phiên member/pending_registration/helper dùng chung API cũ, OTP đúng binding và một lần; lookup kiểm quyền sống, gắn helper với delegation cố định. Upgrade giữ token/ID/thời hạn phiên trước 0054. |
| Reader RLS | Chưa bỏ BYPASSRLS; thiếu chính sách/cột đọc và principal cho reader trước xác thực. Lý do, rủi ro và điều kiện chuyển đổi ghi trong hướng dẫn 06. |

## Kiểm chứng

| Bộ kiểm | Kết quả | Bằng chứng |
|---|---|---|
| Toàn bộ PGlite, migrations + seed + replay + SQL tests | **550/550**, không hỏng; 38 kiểm mới so với 512 | [Log](../../db/0055-pglite.log), [JSON](../../db/test-results.json) |
| Provision và upgrade 0053 → 0055, giao thức cổng | **20/20** | [Log](../../db/0055-provision.log), [JSON](../../db/0055-provision-results.json) |
| `cd backend && npm test` nguyên bộ | **55/55 tình huống, 405/405 bước** | [Log](../../db/0055-backend.log), [JSON](../../db/0055-backend-results.json) |
| `node security/tests/db/kiem-tra-db.mjs --chi-tiet` nguyên bản | **Không hoàn tất**, exit 2 tại fixture, chưa chạy tập tấn công của runner này | [Log](../../db/0055-security.log) |

Security dừng tại `sec.make_order` khi ghi chữ ký với OTP sai binding: `OTP chưa xác minh, hết hạn, đã dùng hoặc sai binding tiền/phiên bản`, hint `ck_otp_verified_binding`. Log lỗi trùng lỗi đã lưu ở [lần 0053](../../db/0053-security.log). Không nới kiểm OTP để chạy qua và không sửa fixture/security. Các ca tấn công gateway mới chạy trong SQL tests của DB, không thay thế kết quả runner security chưa hoàn tất.

Harness provision thực thi script cấp quyền bằng role PostgreSQL của PGlite; thay biến psql password bằng NULL, không dùng mật khẩu thật. Kiểm cả script backend nguyên bản bị lỗi vòng membership, bản sửa chạy hai lần, broker cấp login mới, gateway đọc metadata trước SET ROLE, reader → principal seller → auth → principal system → meta trong cùng transaction, actor event, COMMIT, ROLLBACK và nâng cấp phiên cũ. SQL tests còn kiểm nhiều principal buyer/seller/system, bank worker và nhận lời mời với OTP qua gateway.

Lệnh tái kiểm từ gốc repo:

```sh
(cd db && npm test) > db/0055-pglite.log 2>&1
node db/tools/kiem-tra-provision-cong.mjs > db/0055-provision.log 2>&1
node security/tests/db/kiem-tra-db.mjs --chi-tiet > db/0055-security.log 2>&1
(cd backend && DB_REPORT_PREFIX=0055 \
  NODE_OPTIONS='--import=../db/tools/bao-cao-backend-trong-db.mjs' npm test) \
  > db/0055-backend.log 2>&1
```

Preload backend có sẵn chỉ đổi nơi lưu báo cáo/cache/PDF sang `db/0055-backend-*`; bổ sung tùy chọn prefix để không ghi đè báo cáo 0053. Không thay SQL, kiểm quyền, đồng hồ, tình huống hay assertion. Vì test backend mặc định tự ghi `backend/test/ket-qua.json` và `.du-lieu`, preload này giữ toàn bộ ghi mới trong phạm vi được giao.

## Giới hạn và triển khai

**Chưa kiểm trên PostgreSQL native.** Máy không tìm thấy `psql`, `postgres`, `pg_ctl`; lệnh Docker báo không có socket `/var/run/docker.sock`. Không cài hoặc khởi động dịch vụ ngoài phạm vi. PGlite có session_user/current_user/SET ROLE, kiểm được phân quyền và vai trong cùng giao dịch; không thay thế pg.Pool thực, kết nối TCP, nhiều phiên chạy đồng thời hoặc đua khóa SERIALIZABLE.

Trước triển khai, provisioner áp 0054–0055 rồi dùng **db/scripts/cap-quyen-cong.sql**, không dùng script backend cũ. Hạ tầng phải đổi DATABASE_URL owner sang gateway. Cần kiểm lại trên PostgreSQL 17: khởi động backend qua pool không owner, broker tạo principal, các bước đa danh tính nguyên tử, reset vai khi COMMIT/ROLLBACK, thử lại 40001/40P01 và chạy đồng thời nhiều connection. Không sửa hạ tầng hoặc deploy trong đợt này.

Phiên bền của pending/helper đã có đường DB và ca kiểm DB; bộ backend hiện chỉ có tình huống restart cho phiên thành viên thường. OTP trước xác minh và giới hạn gửi OTP vẫn là bộ nhớ của backend. Reader tiếp tục có quyền SELECT rộng và backend chịu trách nhiệm kiểm quyền/ẩn trường nhạy cảm như đã ghi trong hướng dẫn 06.
