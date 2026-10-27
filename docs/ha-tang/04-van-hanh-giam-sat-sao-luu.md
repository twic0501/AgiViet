# 04 · Vận hành, giám sát, sao lưu

> Phạm vi lịch sử 25/10/2026: khảo sát/bộ đo stub. Stack ứng dụng thật trên Oracle cập nhật ở [06](06-trien-khai-oracle-free.md), kết quả tiếp phiên ở [05](05-danh-gia-thanh-that.md). Không dùng Compose stub để triển khai app thật.

## Mức sẵn sàng hiện tại

Đã có cấu hình health check, Prometheus, exporter PostgreSQL, quy tắc cảnh báo, Alertmanager lưu trên giao diện, script backup/restore và workflow CI mẫu. Đã kiểm tra cú pháp JS/shell và Compose. Docker daemon không hoạt động nên chưa chạy exporter, proxy, Prometheus, Alertmanager hay workflow container thực tế. Chưa có người trực/kênh cảnh báo thật; không xem bộ này là production ready.

`/health` là liveness của tiến trình; `/ready` kiểm tra DB và bảng orders của bộ đo. Readiness không phụ thuộc AI: AI hỏng thì người bán vẫn nhập tay. Production cần kiểm tra migration version phù hợp, quyền DB và khả năng nhận việc; tránh health check nặng hoặc kiểm tra toàn bảng. Worker không được nhận việc mới khi SIGTERM, để xong việc đang làm trong thời gian dừng 35 giây.

## Chỉ số và cảnh báo

| Chỉ số / ngưỡng đề xuất | Triệu chứng / hành động |
|---|---|
| `up == 0` 1 phút | Kiểm tra tiến trình, readiness, mạng; kiểm tra độc lập từ ngoài máy để phát hiện mất VPS |
| 5xx > 1% 5 phút | Tách theo route; xem DB timeout, provider timeout, phiên triển khai; rollback nếu lỗi bắt đầu theo release |
| p95 API ngắn > 800 ms 5 phút | Xem pool chờ, SQL chậm, locks; không tính AI vào cùng histogram đánh giá API ngắn |
| `pg_pool_waiting > 5` 1 phút | Giảm tải đọc nặng, xem slow SQL; không tự tăng pool vô hạn |
| PDF chờ/running lâu nhất > 60 giây | Worker treo/thiếu sức chứa; tạm dừng nhận thêm PDF khi quá ngưỡng, giữ API tiền hoạt động |
| PDF failed > 0 | Xem lỗi tệp, font, phiên bản; retry có khóa chống lặp; không ghi đè tệp đã ký |
| Disk < 20%, connections > 70%, replication/WAL lag > 5 phút | Cần node exporter + DB rules và remote monitoring, **chưa có đầy đủ trong cấu hình hiện tại** |
| Backup mới nhất > 26 giờ, WAL archive thất bại | Cảnh báo critical qua kênh độc lập; marker backup chỉ cập nhật sau khi upload và kiểm hash thành công |

API xuất histogram theo tên route cố định, không gắn mã đơn/người dùng vào label. Một tiến trình API trong Compose giúp scrape không thiếu worker cluster; khi nhân bản, scrape riêng từng replica, cộng bucket ở PromQL. `/metrics` không công khai qua proxy. `/v1/_bench/*` bị chặn ở proxy nhưng API vẫn phải đặt trong mạng riêng. Không đưa token QR, webhook body, số điện thoại, giá kín vào access log. Proxy log `$uri` không có query string; slow-query log PostgreSQL của môi trường đo có thể chứa tham số, cần hạn chế truy cập/retention ở môi trường thật.

`giam-sat/alertmanager.yml` chỉ có receiver xem trên UI. Cần cấu hình email/chat theo cơ chế của đội rồi thử một cảnh báo có kiểm soát; hiện chưa gửi tin nhắn nào. Cần heartbeat worker, tuổi outbox pending, webhook received/processed/failed, jobs retry, deadlock, queue AI và synthetic check hai app trước phát hành. Sổ cái lệch hoặc một đơn ghi cọc hai lần phải cảnh báo ngay, không chờ tỷ lệ lỗi HTTP tăng.

## Sao lưu PostgreSQL và tệp

`infra/scripts/sao-luu.sh` chạy `pg_dump -Fc` vào `infra/.local/backups`, dùng file `.partial`, kiểm archive đọc được rồi đổi tên và tạo SHA-256. `DB_NAME=agiviet_bench` để thử; mặc định DB ứng dụng `agiviet`. Script không dump global roles, không upload/mã hóa/rotation; phải bổ sung quản lý roles/GRANT từ migration và kho secrets khi chuyển sang production. `pg_restore --list` chỉ kiểm archive có danh mục, không chứng minh phục hồi được.

```sh
DB_NAME=agiviet infra/scripts/sao-luu.sh
infra/scripts/khoi-phuc.sh infra/.local/backups/ten-ban-dump.dump agiviet_restore
```

Script restore bắt buộc DB mới có hậu tố `_restore`, `createdb` thất bại nếu đã tồn tại; không drop hay ghi đè DB đang dùng. Có lỗi giữa chừng thì giữ DB chưa hoàn tất để điều tra, không chuyển kết nối tới nó. Sau restore phải kiểm tra tài khoản, RLS, số dư tiền/lượng, phiên bản/hash tài liệu và chạy smoke trước chuyển API.

Lịch đích: dump hàng đêm 02:00 giờ Việt Nam; giữ 7 bản ngày, 4 bản tuần, 3 bản tháng; sao chép mã hóa sang bucket khác tài khoản/máy, quyền ghi của job backup không có quyền xóa mọi phiên bản cũ. Đặt lịch theo `Asia/Ho_Chi_Minh`; nếu scheduler dùng UTC thì 19:00 ngày hôm trước. Lưu manifest: DB version, migration version, thời điểm snapshot, checksum, object keys tương ứng. Không backup raw PG data bằng `tar` khi DB đang chạy.

Ảnh và PDF: object storage versioning, checksum khi tải lên, bucket riêng tư, lifecycle dựa trên yêu cầu lưu bằng chứng; không xóa theo lịch ngắn của ảnh nháp. DB chỉ trỏ tới tệp đã upload xong; cần phát hiện tệp mồ côi hoặc thiếu tệp. Snapshot VPS cùng máy không bảo vệ khỏi mất tài khoản hoặc mất vùng. Với mã hóa, kiểm tra phục hồi được cả khóa KMS/secrets theo thủ tục được phân quyền.

## RPO/RTO và diễn tập

| Mức | RPO mục tiêu | RTO mục tiêu | Điều kiện |
|---|---:|---:|---|
| Thi/pilot, dump ngoài máy mỗi đêm | 24 giờ | 2 giờ | Diễn tập restore, đối soát và người có quyền truy cập backup |
| Có dữ liệu quan trọng | ≤ 5 phút | ≤ 60 phút | Base backup + WAL/PITR, archive lag được báo động, máy phục hồi sẵn |
| HA managed/máy standby | Theo chế độ replication và hợp đồng | Không mặc định bằng 0 | Đo failover, kiểm fencing/split brain, phát lại webhook/outbox an toàn |

Đây là mục tiêu chưa được chứng nhận. Phép thử local ở file 02/05: dump 14 giây, restore 11 giây (archive khoảng 241 MiB), chỉ là dump + restore DB bộ đo khoảng 1 GB, không phải diễn tập thảm họa hay toàn bộ tệp/secrets/DNS. Chưa cài pgBackRest/WAL-G, chưa cấu hình WAL archive, chưa kiểm PITR hoặc failover.

Trình tự sự cố: đóng các lệnh ghi tiền cần thiết, lưu hiện trạng và thời điểm hỏng; chọn snapshot + WAL theo RPO; restore vào máy/DB mới; kiểm migration, đối soát tiền/lượng, file hash, trạng thái lệnh ngân hàng; khóa bên cũ trước mở bên mới; đổi kết nối API, chạy smoke; phát lại outbox/webhook có chống lặp; giữ lịch sử sự cố. Không đổi một trạng thái sang “đã đối soát” chỉ vì HTTP webhook trả 200.

Mỗi tháng restore ngẫu nhiên một backup vào môi trường cách ly và lập biên bản thời gian. Với dữ liệu thử của phiên này, `thu-khoi-phuc.sh` tạo DB `agiviet_restore_bench`, kiểm đếm và tổng sổ cái, xóa DB restore khi kết thúc; bản dump giữ ở `.local/do-sre` để kiểm tra lại.

## CI/CD tối giản

`infra/ci/kiem-tra.sh` kiểm cú pháp và Compose không cần daemon. `infra/ci/github-actions.yml` là mẫu workflow: npm ci với lockfile, build, DB+AI, seed `bench`, áp tối ưu, bật API/worker/proxy, smoke và thu log, dọn container. File chưa nằm trong `.github/workflows/` vì phạm vi ghi chỉ cho infra/docs; chưa có CI nào được kích hoạt. Đội repo cần gắn mẫu và pin image/action theo digest/SHA trước dùng cho release.

Quy trình production đề xuất: build một image bất biến theo commit, scan phụ thuộc; migration kiểu expand trước (thêm cột nullable/chỉ mục concurrently), backup và kiểm recovery point; chạy ứng dụng mới ở cổng riêng; smoke `/ban/`, `/mua/`, API và webhook thử ở môi trường test; đổi upstream; quan sát 5xx/p95/queue; giữ image cũ để rollback. Trên VPS một máy vẫn có khoảng gián đoạn khi host hỏng. Rollback ứng dụng chỉ an toàn nếu schema tương thích; không tự rollback DB tiền bằng migration xóa dữ liệu. Stub không được phép mang sang public dưới nhãn backend thật.

Ngân sách kết nối ban đầu: API 2 replica × 10 + PDF 2 × 2 + LISTEN 2 + tác vụ/monitoring dự phòng 10 ≈ 36 kết nối, giữ dự phòng trong max_connections 100–200 theo RAM. Khi autoscale, đặt max instances từ ngân sách này. PgBouncer transaction pooling là bước tiếp theo; kết nối LISTEN cần session/direct connection, và tenant context phải đặt `SET LOCAL` trong transaction. Chưa chạy PgBouncer trong bài đo.
