# 0053 — Đồng hồ nghiệp vụ tranh chấp

Ngày kiểm: 26/10/2026. Chỉ sửa/ghi `db/` và `docs/database/`.

## Thay đổi

Hoàn thiện migration `0053_dong_ho_nghiep_vu_tranh_chap.sql` đã có trong workspace. Không đổi 0001–0052, dữ liệu lịch sử hoặc quyền runtime. Các mốc tranh chấp, tài liệu/chứng cứ nghiệp vụ, bản/dòng nghiệm thu, chia lại, rút/kết luận tranh chấp, mẫu niêm phong/bàn giao mẫu và kiểm định dùng `ref.clock_at()`. Các INSERT ghi timestamp tường minh trong `open_dispute`, `revise_acceptance_after_objection`, `revise_acceptance_after_withdrawal` cũng dùng cùng clock.

Rà các mốc có hạn thấy QR có CHECK `expires_at > created_at`; lời chào/vòng chào/giữ lượng có hạn tính bằng clock nhưng default tạo bằng `now()`. 0053 đồng bộ các default này và deadline. `guard_member_cap` đọc gói tại `ref.clock_at()` vì `change_subscription` kích hoạt gói theo clock. OTP/phiên/receipt xác thực, quyết định, audit/state history, status_changed_at/updated_at, sổ cái/ngân hàng vẫn giữ giờ thật.

Production giữ `cmd.test_clock` rỗng; runtime dùng giờ thật. Không thêm command bật đồng hồ thử.

## Kiểm thử

`db/tests/215_dong_ho_nghiep_vu_tranh_chap.sql` thêm 17 kiểm tra: clock tương lai cách giờ thật 3 ngày; chứng cứ trước phản đối; trước/đúng/sau 24 giờ ở mức microsecond; không ghi bản khi bị từ chối; retry sau hạn; hai chữ ký rồi đóng tranh chấp; hạn kiểm định 48 giờ và thương lượng 14 ngày; QR tua lùi; cap thành viên theo thời điểm nâng gói; trở về giờ thật. Các luồng command vẫn chạy bằng SESSION AUTHORIZATION runtime, không cấp quyền hay sửa timestamp lịch sử để vượt chốt chặn.

| Bộ kiểm | Đạt/tổng | Kết quả |
|---|---:|---|
| Toàn bộ PGlite migrations/seed/SQL tests và audit | 512/512 | 53 migrations, 147 bảng; migrate/seed lần hai không ghi trùng. |
| Backend `npm test` | 53/54 tình huống, 397/399 bước | TH-R2-CANLAI đạt 5/7 bước; còn lỗi tầng backend mô tả dưới đây. |
| Security nguyên bản `node security/tests/db/kiem-tra-db.mjs --chi-tiet` | Chưa đến các ca tấn công | Exit 2 khi nạp `security/sql/fixture.sql`: OTP chưa xác minh, hết hạn, đã dùng hoặc sai binding tiền/phiên bản. Không sửa fixture, không chạy adapter thay cho lệnh yêu cầu. |

Log: `db/0053-pglite.log`, `db/0053-backend.log`, `db/0053-security.log`. Kết quả JSON: `db/test-results.json`, `db/0053-backend-results.json`.

## TH-R2-CANLAI còn vướng ở backend

Lỗi đồng hồ đã được gỡ: backend chia lại được 120 kg hạ cấp thành đạt, V mới 45.310.000, tranh chấp chuyển `awaiting_seller`. Bước người bán đồng ý nhận lỗi `TRANG_THAI_KHONG_CHO_PHEP` tại `backend/src/nghiep-vu/giao-nhan.ts:305`: truy vấn chặn mọi dòng `status='disputed'`, kể cả các dòng mới có ánh xạ `acceptance_revision_lines` của bản chia lại 0052. Do đó backend chưa gọi được `cmd.agree_acceptance`, tranh chấp chưa đóng. SQL test gọi command dưới login thật, đủ hai chữ ký, đã đóng được tranh chấp; không đổi trạng thái dòng/giá trị quyết toán để né chốt chặn của backend.

Mục tiêu 54/54 **chưa đạt**. Phần cần sửa tiếp ở backend là phân biệt dòng phản đối gốc với dòng đề xuất chia lại hợp lệ đang chờ seller; command vẫn phải kiểm bản hiện hành, chữ ký và mọi tranh chấp liên quan. Đợt này giữ nguyên backend theo phạm vi được giao.

## Chạy lại trong phạm vi ghi được giao

```sh
node db/tools/kiem-tra-pglite.mjs > db/0053-pglite.log 2>&1
node security/tests/db/kiem-tra-db.mjs --chi-tiet > db/0053-security.log 2>&1
cd backend
NODE_OPTIONS='--import=/home/twictrn/agiviet-production-v2/db/tools/bao-cao-backend-trong-db.mjs' TSX_DISABLE_CACHE=1 npm test > ../db/0053-backend.log 2>&1
```

Preload chỉ chuyển cache, tài liệu thử và báo cáo từ đường dẫn backend sang `db/0053-backend-artifacts/` và `db/0053-backend-results.json`; không thay SQL, nguồn backend, assertion, clock hoặc kết quả. PGlite một kết nối không chứng minh được đua khóa trên PostgreSQL server nhiều phiên.
