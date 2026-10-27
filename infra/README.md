# Hạ tầng AgiViet production v2

Bộ môi trường và phép đo **giả lập**, tiếp tục từ stub của kỹ sư trước. Chỉ ghi trong `infra/` và `docs/ha-tang/`; không sửa Compose/migrations DB, hai app hoặc dịch vụ AI của nhóm khác.

Đọc [kiến trúc](../docs/ha-tang/00-kien-truc-trien-khai.md), [cục bộ](../docs/ha-tang/01-moi-truong-cuc-bo.md), [số đo tải](../docs/ha-tang/02-kiem-thu-chiu-tai.md), [tối ưu](../docs/ha-tang/03-toi-uu.md), [vận hành](../docs/ha-tang/04-van-hanh-giam-sat-sao-luu.md), [đánh giá thành thật](../docs/ha-tang/05-danh-gia-thanh-that.md).

```sh
bash infra/ci/kiem-tra.sh
# Khi Docker daemon hoạt động:
docker compose -f infra/docker-compose.yml up -d --build db ai
docker compose -f infra/docker-compose.yml --profile setup run --rm setup
docker compose -f infra/docker-compose.yml --profile setup run --rm setup node db-setup.mjs --toi-uu
docker compose -f infra/docker-compose.yml up -d --build --wait api pdf-worker proxy prometheus postgres-exporter alertmanager
curl -f http://127.0.0.1:8088/ready
# Dừng, giữ dữ liệu:
docker compose -f infra/docker-compose.yml down
```

Compose tham chiếu `../db/docker-compose.yml`, dùng cổng 55432 và volume DB gốc; kiểm tên volume/container trước khi chạy chung với Compose của nhóm DB. `setup` tạo lại schema `bench` trong DB riêng `agiviet_bench`. Tuyệt đối không dùng URL DB ứng dụng cho bộ seed. Không dùng `down -v`.

Máy đo 25/10/2026 có Docker CLI nhưng không có daemon. Đã dùng PostgreSQL 17.10 nhúng sẵn + Node 24, không sudo/cài gói hệ thống:

```sh
npm ci --prefix infra/stub --no-audit --no-fund
# Nếu CHƯA có binary PostgreSQL trong infra/.local/tools:
# infra/scripts/pg-cuc-bo.sh cai
python3 infra/scripts/cai-pg-client.py
infra/scripts/do-cuc-bo.sh
python3 infra/scripts/tong-hop.py
```

Script hữu hạn này chạy seed khoảng 1 GB, smoke/assertions, trước/sau tối ưu, smoke/load/stress/spike/soak ngắn, đăng lô, QR, PDF, thử dump/restore; tự dọn tiến trình nó bật. Chỉ phù hợp Linux có CPU affinity 0–9; xem file 01 trước chạy máy khác. Cổng riêng: PostgreSQL 55434/API 8180/AI 8190; không đụng 55432 của nhóm DB. Kết quả ở `load/ket-qua/`; runtime/tệp/log ở `.local/`, được ignore. Không chạy song song các lần đo.

Bố cục: `stub/` API + worker PDF + AI placeholder + schema bench, `load/` bộ tạo tải đến đều, `proxy/` Nginx, `giam-sat/` Prometheus/Alertmanager, `ci/` workflow mẫu chưa kích hoạt, `scripts/` kiểm tra/backup/restore/đo trực tiếp. Hai route app ở proxy hiện chỉ là placeholder; không phải UI sản phẩm.

QR lặp trả `already_scanned`, có ghi log quét; chỉ lượt đầu đổi trạng thái đánh dấu đến trong stub. Không tự chốt nghiệm thu/chuyển rủi ro. Webhook có HMAC + unique event + transaction sổ cái, nhưng chưa mô phỏng đủ partial/overpayment hoặc các vai thật. PDF là tệp thật nhúng font tiếng Việt, mang nhãn thử, chưa phải mẫu pháp lý. AI chỉ sleep với giới hạn song song; số trễ AI không đánh giá mô hình thật.

## Oracle Cloud Always Free: stack ứng dụng thật (26/10/2026)

Đọc [hướng dẫn OCI](../docs/ha-tang/06-trien-khai-oracle-free.md). `oracle/docker-compose.oracle.yml` là stack **độc lập**, mặc định 12 GB: backend Node/Fastify 8080, frontend 8090, AI Python 8091, PostgreSQL 17, Caddy HTTPS cho **agiviet.id.vn**. Singapore thiếu capacity: tạo A1 **1 OCPU/6 GB**, chọn `OCI_SIZE=6` qua `oracle/chung.sh` để ghép override 6 GB, pool DB 4; `ENABLE_AI=0` bỏ build/chạy AI và dùng luật backend. Có thể resize cùng VM lên 2 OCPU/12 GB sau, giữ volume/IP/khóa. Không ghép Compose stub phía trên. Override 24 GB chỉ bật khi tenancy xác nhận hạn mức được miễn. DNS do người dùng trỏ; kiểm trước ACME. Hàng rào tài nguyên, quota/Budget và checklist: [07](../docs/ha-tang/07-chong-tran-chi-phi.md).

Backend dùng `agv_backend_gateway` NOINHERIT qua `DATABASE_URL`; owner chỉ dùng quản trị. Mẫu [`oracle/.env.example`](oracle/.env.example) và `tao-cau-hinh.sh` sinh khóa trên máy cài đặt, ngoài checkout. Provision dùng script backend, loại đúng dòng grant gây vòng trên PostgreSQL 17; xem [báo cáo kiểm](oracle/kiem-chung.md).

**Chưa thể mở nghiệp vụ:** migrations 0001–0053 còn lỗi danh tính qua `session_user` (đề xuất backend mục 17), đã tái hiện trên PostgreSQL thật. Deploy có guard dừng trước bật ingress; không nới runtime thành owner.

```sh
# Chỉ installer trên VM ARM64 mới; người dùng tự tạo tài khoản/VM Oracle.
sudo bash /opt/agiviet/infra/oracle/cai-dat-may.sh
sudo bash /opt/agiviet/infra/oracle/tao-cau-hinh.sh /etc/agiviet/oracle.env
# Điền domain/email/hash và backup theo tài liệu 06, chỉnh quyền root:agiviet 0640.
cd /opt/agiviet
bash infra/oracle/kiem-tra-arm64.sh
bash infra/oracle/trien-khai.sh --db-only  # chuẩn bị DB, giữ app dừng
# Sau khi sửa DB mục 17 và kiểm command/đa phiên:
# bash infra/oracle/trien-khai.sh --local
# bash infra/oracle/sao-luu.sh
```

Đã kiểm Compose 12/24 GB, ShellCheck, Caddy validate/routing HTTP, manifest ARM64 bốn image, migration/seed/provision/ACL/gateway, HTTP thật backend/frontend và dump/restore DB cục bộ. Chưa có Docker daemon, build ARM64, DNS/ACME thật, remote backup hay VM OCI. Xem [đánh giá trung thực](../docs/ha-tang/05-danh-gia-thanh-that.md); kết quả chịu tải stub không áp dụng cho stack thật.
