# 01 · Môi trường cục bộ

> Phạm vi lịch sử 25/10/2026: khảo sát/bộ đo stub. Stack ứng dụng thật trên Oracle cập nhật ở [06](06-trien-khai-oracle-free.md), kết quả tiếp phiên ở [05](05-danh-gia-thanh-that.md). Không dùng Compose stub để triển khai app thật.

## Trạng thái và ranh giới

Đã đọc các file của kỹ sư trước trong `infra/`; `ci/`, `proxy/`, `giam-sat/` ban đầu rỗng. Giữ stub PostgreSQL, PDFKit, AI có hàng chờ, bộ tạo tải và kết quả cũ; sửa kiểm tra QR lặp, tạo lại request giống nhau khi retry, thống kê lỗi, chỉ mục materialized view và bổ sung vận hành.

Nguồn nghiệp vụ: `00-tong-quan.md`, `03-vong-doi-don.md`, `06-kho-van-chuyen-qr.md`, `du-lieu-ao.json` trong `docs/nghiep-vu/`; tham chiếu `docs/database/00-nguyen-tac.md` và migrations 0001–0008, 0010. `12-yeu-cau-cho-ky-su.md` chưa có tại thời điểm đọc. Chưa có backend ứng dụng để chạy tích hợp. Thư mục `ai/` có công việc của nhóm khác; lần đo này dùng `infra/stub/ai.mjs`, không tích hợp hay sửa `ai/`.

**Tất cả API ở đây là giả lập.** Schema `bench` ở database riêng `agiviet_bench`; không chạy migration thay thế schema thật. Có sổ cái kép/trigger, khóa dòng, outbox, PDFKit sinh tệp và HMAC thật; không có xác thực người dùng/RLS/máy trạng thái đầy đủ. Dữ liệu nghiệp vụ ảo gốc có 50 người dùng, 20 lô, 8 nhu cầu và 15 đơn nền; bộ seed tải trong infra tự tạo quy mô lớn hơn để thử truy vấn, không thay dữ liệu nghiệp vụ đó. Không dùng tài khoản chủ schema của bộ đo cho backend production.

## Compose

Yêu cầu Docker daemon và Compose hỗ trợ `!override` (bản máy đo: 5.6.0). Ngày đo daemon không chạy; `docker compose config --quiet` đã đạt, chưa build/pull/chạy container. Không cài gói hệ thống, không dùng sudo. Giới hạn CPU/RAM trong Compose là mức bảo vệ môi trường cục bộ, không trùng cấu hình chạy trực tiếp đã đo; không suy số đo thành capacity của Compose.

`infra/docker-compose.yml` tham chiếu dịch vụ `db` bằng `extends` từ `db/docker-compose.yml`, giữ PostgreSQL 17/cổng 55432, chỉ ghi đè bind sang loopback và giới hạn CPU/RAM. Không sửa file DB. Volume mặc định `db_agiviet_v2_pgdata` là tên do Compose DB gốc tạo; nếu trước đó dùng project name khác, đặt `AGV_PG_VOLUME` đúng tên. Xem `docker volume ls`, `docker inspect agiviet-v2-db`; không đoán và không xóa volume.

Nếu DB gốc đang chạy, dùng chính DB đó hoặc dừng container theo kế hoạch của nhóm DB trước khi để stack infra quản lý lại cùng tên container. Không chạy hai Compose project tranh chấp `agiviet-v2-db`. Các lệnh dưới giả định không có container cũ xung đột.

```sh
docker compose -f infra/docker-compose.yml config --quiet
docker compose -f infra/docker-compose.yml up -d db ai --build
docker compose -f infra/docker-compose.yml --profile setup run --rm setup
docker compose -f infra/docker-compose.yml --profile setup run --rm setup node db-setup.mjs --toi-uu
docker compose -f infra/docker-compose.yml up -d --build --wait api pdf-worker proxy prometheus postgres-exporter alertmanager
curl -f http://127.0.0.1:8088/ready
```

`setup` mặc định **tạo lại schema bench**, chỉ chạy trong DB thử; lần nạp đầu tạo khoảng 1 GB DB. Không đặt URL về `agiviet`. Các mật khẩu/khóa mặc định là giá trị phát triển công khai. Chưa có TLS cục bộ; production cần HTTPS ingress, secret store và DB user riêng.

| Dịch vụ | Địa chỉ | Tác dụng |
|---|---|---|
| proxy | localhost:8088 | API qua giới hạn tần suất; `/ban/`, `/mua/` chỉ là thông báo chờ build app |
| API | api:8080 nội bộ | Stub, readiness và metrics; không publish cổng riêng |
| AI | ai:8090 nội bộ | Độ trễ ngẫu nhiên, 4 slot, chờ tối đa 50; không chạy STT thật |
| PDF worker | nội bộ | Đọc bảng jobs, tạo PDF trên volume artifacts |
| PostgreSQL | localhost:55432 | DB gốc được tham chiếu; `agiviet_bench` tách khỏi `agiviet` |
| Prometheus / Alertmanager | localhost:9090 / 9093 | Thu chỉ số, hiển thị cảnh báo; chưa cấu hình kênh gửi |
| PostgreSQL exporter | nội bộ:9187 | Chỉ số DB; user owner chỉ cho môi trường thử |

Có health check DB, AI, API. Worker được theo dõi gián tiếp qua tuổi hàng chờ; chưa có heartbeat worker, node exporter, Grafana hoặc kiểm tra web từ bên ngoài. PDF/ảnh hiện là volume file system, chưa là object storage/CDN. Redis không bắt buộc; queue dùng PostgreSQL, cache giá dùng MV.

Smoke qua mạng nội bộ Compose để tránh công khai endpoint `_bench`:

```sh
docker compose -f infra/docker-compose.yml run --rm --no-deps -e BASE=http://api:8080 -v "$PWD/infra/load:/load:ro" api node /load/khoi.mjs
docker compose -f infra/docker-compose.yml down
```

Không thêm `-v` vào `down`; không xóa dữ liệu DB. Vòng đời volume và bản dump độc lập với container.

## Chạy trực tiếp khi không có daemon

Kỹ sư trước đã để bản dựng PG17 trong `infra/.local/tools`; không phải PostgreSQL cài hệ thống. `pg-cuc-bo.sh cai` là phương án tải npm vào infra, chỉ cần khi chưa có binary, không tự cài Docker. Bộ PG nhúng không có pg_dump/pg_restore; `cai-pg-client.py` tải client PG17.11 từ kho PGDG qua HTTPS, kiểm SHA-256 cố định và giải nén vào `infra/.local/pg-client` (không dùng apt/dpkg install), liên kết libpq từ bộ nhúng. Chỉ dùng trên Linux x64 với thư viện hệ thống tương thích. Bộ đo mới dùng cổng 55434, API 8180, AI 8190; dữ liệu/tệp/log ở `infra/.local/pg-sre` và `infra/.local/do-sre`.

```sh
npm ci --prefix infra/stub --no-audit --no-fund
python3 infra/scripts/cai-pg-client.py
infra/scripts/do-cuc-bo.sh
python3 infra/scripts/tong-hop.py
```

Lệnh là một phiên hữu hạn khoảng 15 phút tùy máy, seed dữ liệu riêng, chạy kiểm tra và dừng dịch vụ bằng trap. Tham số ghim CPU chỉ hợp lệ trên Linux có ít nhất 10 CPU logic; sửa affinity khi chạy máy nhỏ hơn. Đây không phải quota VPS: PG dùng CPU 0–3, API+AI 4–5, worker 6–7, generator 8–9; không giới hạn RAM bằng cgroup. Không chạy cạnh bài đo khác. Chạy lại sẽ thay schema trong `agiviet_bench` trên cổng riêng.

PDF nhúng Liberation Sans từ `infra/stub/fonts/`, có giấy phép kèm theo; tệp mang nhãn dữ liệu thử, chưa phải mẫu hợp đồng đầy đủ. Kết quả công khai trong `infra/load/ket-qua/`, tệp runtime trong `.local/` được ignore.
