# Kết quả đề xuất backend mục 14–15 · 26/10/2026

Phạm vi thay đổi: migration mới 0051–0052, `db/tests/210_phi_gia_va_chia_lai.sql`, tài liệu database và báo cáo trong `db/`. Không sửa migration 0001–0050, backend, security, seed delegation hoặc chính sách billing gói.

| Bộ kiểm tra | Đạt/tổng | Kết quả |
|---|---:|---|
| Toàn bộ PGlite | **495/495** | 52 migrations, 147 bảng; chạy lại migration/seed không nhân dữ liệu. |
| Backend `npm test` | **52/54** tình huống; **388/391** bước | Hai tình huống còn kỳ vọng hành vi cũ, chi tiết dưới đây. |
| `node security/tests/db/kiem-tra-db.mjs --chi-tiet` | **Chưa có đạt/tổng; 0 ca được chạy** | Exit 2 khi nạp `security/sql/fixture.sql`, trước vòng kiểm tra. |

Backend được chạy bằng `npm test` trên bản sao nguyên trạng trong `/tmp/agiviet-backend-14-15/backend`, đọc cùng `db/`, `docs/`, `security/` qua symlink. Test runner tự ghi cache, PDF và `test/ket-qua.json` ở bản sao; source/backend gốc không bị sửa. Không thay kỳ vọng kiểm thử để làm xanh báo cáo.

Hai tình huống backend cần bên backend cập nhật khi tích hợp:

- **TH-AM-1:** 7/8 bước đạt, duy nhất bước kiểm cứng `TOPUP-` không khớp mã mới `TP000000000195`. Tạo phụ lục, chặn giao khi thiếu cọc và ngân hàng nhận bổ sung vẫn qua các bước còn lại. Đọc `payment_ref` từ DB, chấp nhận mã ngắn đã mô tả ở hướng dẫn 06.
- **TH-AM-2:** ca cũ đòi giảm giá trả `CHUA_HO_TRO` và giữ phiên bản 1. Nay ký/áp thành công, đơn sang phiên bản 2, nên hai kỳ vọng cũ đều sai. Kiểm thử DB mới xác minh số thật: cọc 13.800.000 → 12.000.000, hoàn 1.800.000 về nguồn, giữ phí 138.000; retry không nhân lệnh. Không còn lỗi `ck_instruction_fee_refund` hoặc `ck_ov_fee` trong luồng này.

Lệnh bảo mật được chạy nguyên trạng. Fixture ký hợp đồng bằng OTP không khớp binding/chưa được xác minh theo cơ chế hiện tại, gây lỗi `OTP chưa xác minh, hết hạn, đã dùng hoặc sai binding tiền/phiên bản` tại `evt.consume_otp` → `core.consume_signature_otp` → `sec.make_order`. Kiểm riêng với đúng migrations 0001–0050 cũng lỗi cùng fixture; không phải kết quả phát sinh từ 0051–0052. Không sửa hoặc chạy một bản security đã nới guard; **không tuyên bố bộ bảo mật đạt**.

Các kiểm thử DB thêm bao phủ phí khác 0, giảm lượng sau đổi giá, cơ sở phí bất biến, callback mã ngắn/MOD97, quyền sequence/helper, tạo và mời danh tính mới, retry theo số không ghi đè, chia 80 kg thành 40/40, giữ dòng chốt và lịch sử, sai người nhận/chứng cứ/giá/lượng, hai chữ ký, retry khác thân, V_kt khi chờ ký, kiểm định sau chia lại, nhiều tranh chấp với kết luận nối phiên bản và mốc 24 giờ. Luồng nhận lời mời bằng OTP và luồng giảm lượng hoàn phí cũ vẫn nằm trong toàn bộ 495 ca đạt.

Mã mới `revise_acceptance_after_objection` có ở DB; backend vẫn cần nối endpoint đang 501 sang command và quy trình ký/gửi/đồng ý mô tả ở hướng dẫn 06. Chưa thay endpoint hoặc quảng cáo tính năng mới ở API/UI trong lần giao việc chỉ sửa DB này. Billing tháng đầu và quyền người giúp mặc định tiếp tục **CHƯA CHỐT**, giữ nguyên.

Bằng chứng tại thư mục `db/`:

- `backend-14-15-pglite.log`, `test-results.json`.
- `backend-14-15-backend.log`.
- `backend-14-15-security.log`, `backend-14-15-security-baseline.log`.
- `backend-14-15-results.json`: tổng hợp và SHA256 hai migration mới.

PGlite một kết nối chưa chứng minh xử lý cạnh tranh nhiều phiên PostgreSQL thật. Tiếp tục SERIALIZABLE và retry toàn transaction theo hướng dẫn hiện có.
