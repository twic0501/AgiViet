# security/ · Mã và kiểm thử bảo mật AgiViet production v2

Không phụ thuộc gói ngoài (Node 20+, chỉ `node:crypto`, `node:test`). Kiểm thử DB dùng PGlite đã ghim trong `db/package.json`.

## Chạy

```
node --test security/tests/unit/*.test.mjs          # 79 bài, chạy ngay
node security/tests/dot-bien-vong-doi.mjs           # kiểm đột biến: 7/7 đột biến phải bị bắt
(cd db && npm ci) && node security/tests/db/kiem-tra-db.mjs [--chi-bao-cao] [--chi-tiet]
AGV_API_URL=... AGV_API_CONFIG=security/tests/api/cau-hinh.json node --test security/tests/api/*.test.mjs
```

## Thư viện (`lib/`)

| Tệp | Làm gì |
|---|---|
| `webhook.mjs` | Ký/xác minh webhook HMAC-SHA256 + timestamp + nonce + kid; khớp khoản báo có với lệnh cọc |
| `nonce-store.mjs` | Kho nonce dùng một lần (bộ nhớ) + SQL mẫu cho Postgres |
| `qr.mjs` | QR có chữ ký Ed25519, hạn, ràng người nhận, dùng một lần; mã 6 số dự phòng |
| `vietqr.mjs` | Dựng, phân tích, kiểm CRC VietQR; đối chiếu với lệnh đã chụp (phát hiện thay số tài khoản) |
| `pdf-hash.mjs` | Băm PDF, niêm phong manifest Ed25519, chuỗi phiên bản, phát hiện nối thêm sau khi ký |
| `otp.mjs`, `rate-limit.mjs` | OTP gắn ngữ cảnh (mục đích, người, băm nội dung, số tiền), giới hạn tần suất |
| `four-eyes.mjs`, `evidence.mjs` | Phê duyệt hai người; thang bằng chứng (ảnh UNC không phải bằng chứng) |
| `payout-account.mjs` | Đổi tài khoản nhận tiền, thời gian chờ, kiểm lệnh chi trước khi gửi |
| `anomaly.mjs` | Luật giám sát R1–R8 (giao dịch vòng, tài khoản dùng chung, cọc–hủy lặp...) |
| `settlement.mjs` | Oracle quyết toán theo `docs/nghiep-vu/04` mục 5–6 |
| `money-lifecycle.mjs` | Máy trạng thái tiền dạng dữ liệu (văn bản: `docs/bao-mat/01`) |

## Kiểm thử

- `tests/unit/`: 79 bài, đạt. Gồm fuzz 20.000 ca công thức quyết toán.
- `tests/dot-bien-vong-doi.mjs`: cố tình thêm chuyển sai vào vòng đời tiền; lần đầu bắt 6/7 (thiếu luật "hẹn giờ không cộng tiền"), đã bổ sung, nay 7/7.
- `tests/db/kiem-tra-db.mjs`: áp `db/migrations` + `db/seed` + `db/tests/000,010`, nạp `sql/fixture.sql`, chạy 45 ca tấn công + 21 bất biến (`sql/bat-bien-so-cai.sql`). Lần chạy 25/10 trên 23 migration: 29/41 ca nguy hiểm bị chặn đúng, **12 lỗ hổng**, 4/4 ca hợp lệ qua, bất biến 21/21. Chi tiết và đề xuất: `docs/bao-mat/06`. Giới hạn: PGlite một kết nối (không kiểm đua điều kiện thật), chạy bằng owner (không kiểm RLS/GRANT).
- `tests/api/`: 13 bài hộp đen, **bỏ qua** tới khi có backend; đường dẫn trong `cau-hinh.mau.json` phần lớn là giả định.
- `sql/bat-bien-so-cai.sql`: câu chỉ đọc, chạy được bằng psql trên production để giám sát mỗi giờ.

Tài liệu: `docs/bao-mat/00` đến `07`.
