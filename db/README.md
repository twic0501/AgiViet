# Cơ sở dữ liệu AgiViet production v2

PostgreSQL 17; tiền nguyên đồng VND, lượng nguyên gam. Bộ này có SQL migrations, seed sinh từ đặc tả, kiểm thử thực trên engine và tài liệu tiếng Việt tại `docs/database/`.

## Chạy kiểm chứng không cần Docker

Từ gốc repository:

```sh
cd db
npm ci --cache /tmp/agiviet-npm-cache
npm test
```

PGlite ghim `@electric-sql/pglite@0.3.16`, engine trả PostgreSQL 17.5 WASM. Runner tạo DB tạm trong bộ nhớ, chạy migrations, seed, chạy lại để kiểm chống trùng, rồi chạy toàn bộ SQL tests. Mỗi file một transaction; lỗi SQL, lỗi COMMIT hoặc kiểm tra hỏng đều trả exit code khác 0. Không có test nào cũng là lỗi. Không đụng DB bên ngoài.

Kết quả chi tiết ghi `db/test-results.json`. Có thể lưu log bằng `npm test > test-run.log 2>&1`. Kết quả command mới nhất: [09. Điều phối cmd.*](../docs/database/09-ket-qua-boc-dieu-phoi-command.md). Đánh giá nền và giới hạn: [07. Đánh giá thành thật](../docs/database/07-danh-gia-thanh-that.md).

## PostgreSQL 17 qua Docker

```sh
# Từ gốc repository
 docker compose -f db/docker-compose.yml up -d
 bash db/scripts/migrate.sh
 bash db/scripts/seed.sh
 bash db/scripts/test.sh
```

Cổng host `55432`, database `agiviet`, owner `agiviet_owner`. Mật khẩu trong compose chỉ cho phát triển. Kiểm health container trước khi chạy các script. Có `DATABASE_URL` và psql cục bộ thì script dùng kết nối đó thay Docker:

```sh
DATABASE_URL='postgresql://agiviet_owner:agiviet_dev_only@localhost:55432/agiviet' bash db/scripts/migrate.sh
```

Trong sandbox lần này không có Docker daemon; các lệnh Docker/psql chưa được chạy thành công. Không coi kết quả PGlite là đã kiểm thử nhiều kết nối PostgreSQL server.

## Migrations và reset

`0001` đến `0047` liên tục, SQL thuần. `migrate.sh` quản lý `public.schema_migrations` bằng SHA-256, khóa advisory cho từng migration, ghi tracking cùng transaction. Chạy lại script bỏ qua bản đã áp và từ chối checksum thay đổi. Không chạy lặp từng file CREATE TABLE trực tiếp vào DB đã có schema.

Phần nền cũ được giữ; 0009 bổ sung phần còn thiếu, 0011 trở đi sửa/củng cố và mở rộng. DB đã áp một bản nháp khác checksum cần quy trình chuyển đổi riêng, không sửa tracking để ép qua.

Reset xóa các schema nghiệp vụ của DB đích, chỉ dùng DB thử đã kiểm tra:

```sh
AGIVIET_ALLOW_RESET=1 bash db/scripts/reset.sh
```

Reset rồi migrate + seed + test. Không chạy tests trên production hoặc DB cần giữ dữ liệu. Test suite giả định seed mới, không phải bộ kiểm toán chỉ đọc để chạy lại tùy ý trên dữ liệu đang dùng.

## Seed

```sh
python3 db/tools/tao-seed.py
```

Generator dùng Decimal, UUID ổn định, đọc `docs/nghiep-vu/du-lieu-ao.json`, sinh `db/seed/000_du_lieu_ao.sql`. File SQL sinh sẵn dùng được bằng psql, không cần Python ở môi trường nạp. Snapshot giữ toàn bộ JSON + hash; cùng nguồn nạp lại không ghi trùng, nguồn thay đổi thì yêu cầu DB thử mới.

Có 50 người dùng, 32 tổ chức gồm đối tác/nền tảng, 8 sản phẩm, 20 lô, 8 nhu cầu/9 dòng, 15 đơn lịch sử chi tiết, 2 khung và 1 kế hoạch bao tiêu/3 đợt. Lô nháp chưa khai nguồn giao dịch. Giá giả định tách với giá tham khảo từ đơn nền. Tọa độ, hồ sơ kỹ thuật chi tiết và chứng từ lịch sử không được tự bịa để biến snapshot thành giao dịch đã xác minh.

PII seed có nhãn `TEST-NOT-ENCRYPTED`; số tài khoản/điện thoại đều thử. Metadata tài liệu trong tests không trỏ PDF thật. Không sử dụng seed làm cấu hình tiền thật.

## Bố cục

| Đường dẫn | Nội dung |
|---|---|
| `migrations/` | Bảng, FK, CHECK, chỉ mục, trigger, quyền |
| `seed/` | SQL sinh từ dữ liệu ảo |
| `tests/000_khung.sql` | Hàm assertion, kiểm lỗi trong subtransaction |
| `tests/005–135` | Bằng chứng OTP/API, nền/lượng/quyền, TH006, quyết toán phiên bản, LS2–LS4 và bảo mật |
| `tools/kiem-tra-pglite.mjs` | Kiểm chứng PGlite và đối chiếu OTP/audit bằng Node |
| `scripts/` | migrate/seed/test/reset qua psql hoặc compose |
| `test-results.json` | Báo cáo lần chạy gần nhất |

Hướng dẫn tích hợp: [06. Backend](../docs/database/06-huong-dan-cho-backend.md). Vai app đọc qua RLS và có command ký/nhận tiền/điều chỉnh hạn quyền; bank/auth có vai riêng. Chưa có broker pool chung hoặc trọn bộ command điều phối; không dùng owner cho backend.

## Kiểm chứng sau 0032

```sh
npm --prefix db test
node security/tests/db/kiem-tra-db.mjs --chi-tiet
node db/tools/kiem-tra-bao-mat-tuong-thich.mjs --chi-tiet
node db/tools/kiem-tra-nang-cap-n01-n16.mjs
```

Baseline 205/205 → **285/285** PGlite đạt, 32 migrations/125 bảng nghiệp vụ; kiểm nâng cấp có tiền từ 0029 đạt **6/6**. Log hiện tại `n01-n16-test-run.log`, `upgrade-n01-n16.log`, báo cáo `test-results.json`, `upgrade-n01-n16-results.json`.

Bộ security nguyên bản trước/sau đợt N đều dừng ở fixture OTP bịa (exit 2); không sửa security/. Adapter sẵn có, giữ nguyên 41 SQL tấn công, đạt 41/41 chặn, 4/4 hợp lệ qua, 21/21 bất biến đạt, exit 0. Logs `security-n01-n16-before.log`, `security-n01-n16-after.log`, `security-n01-n16-compat.log`. Chi tiết và giới hạn trong docs/database/07.

0030–0032 tách tiền treo/thừa khỏi C và F, giữ thêm phí/phạt khi chi tạm, policy hai người +24h, invitation theo số +OTP, QR một lần, cảnh báo tiền mặt, chặn tổ hợp tác nhận tiền chung, giữ lệnh >=20 triệu tới tài khoản <72h tới khi gọi lại và xác nhận hoàn nguồn bằng API. Nếu hoàn thừa lịch sử đang chạy, migration dừng để đối soát; không sửa lệnh/bút toán cũ. QR ký Ed25519 offline và các tích hợp bên ngoài chưa được triển khai tại DB.

Seed chỉ nạp BT-2005 như kế hoạch chưa có tiền. Bài 090 tạo tiền điều kiện bằng ký/nhận cọc ngân hàng/chốt đợt 1; KH-2003 giữ số dư có nhãn nhập khẩu. Seed owner tạm tắt riêng trigger cấp vai/thông báo để nhập vai lịch sử. Chỉ dùng trên DB thử trống.

Migrations mới 0024–0029 không sửa nội dung 0001–0023. FK OTP/chứng cứ tiền dùng NOT VALID với lịch sử và kiểm hàng mới; cần kiểm kê dữ liệu cũ trước validate. Audit có chuỗi băm và công cụ xuất/kiểm JSONL, chưa cấu hình kho WORM ngoài DB.
