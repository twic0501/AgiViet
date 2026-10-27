# Kiểm chứng Oracle — lịch sử và lượt tiếp 26/10/2026

**Trạng thái mới nhất:** xem mục “Hoàn tất hồ sơ 6 GB” cuối file: **14/14 kiểm infra đạt**, chưa Docker/OCI thật. Backend đã báo PG thật 56/56 sau 0054–0055; phần chặn mục 17 ở lượt trước bên dưới là lịch sử, không còn là chặn hiện tại.

Phạm vi ghi: `infra/`, `docs/ha-tang/`. Kế thừa Compose/Dockerfile/scripts lượt trước, không triển khai cloud. Checkout không có Git hoạt động để lấy commit/diff; bản nguồn infra trước sửa được giữ tại `infra/.local/oracle-check/source-before/`. Tệp runtime/log/DB thử nằm trong `.local/` đã ignore, không đưa vào gói phát hành.

## Môi trường và kết quả

| Kiểm | Kết quả / giới hạn |
|---|---|
| Docker Compose | 5.6.0, `config` cho cả 12/24 GB đạt; kiểm 6 service, ARM64, build paths và cổng nội bộ |
| Docker Engine | Không có `/var/run/docker.sock`; **không build hoặc chạy container** |
| Bash / ShellCheck | `bash -n` từng script và ShellCheck 0.11.0 sạch toàn bộ `infra/oracle/*.sh` |
| Caddy | Binary x64 2.10.2 tải vào infra/.local; adapt + validate nguồn HTTPS đạt; bản HTTP loopback chạy routing/auth thật |
| Registry | 4 image có ARM64; [manifest/digest](arm64-manifests.json); chưa chứng minh dependency build |
| PostgreSQL | Server nhúng 17.10 x64, client 17.11; cluster mới cổng 55435, SCRAM TCP; 53 migrations và seed thật đạt |
| Provision | Dùng nguồn backend, bỏ đúng dòng grant gây vòng; transaction, gateway NOINHERIT; broker tạo/cấp principal mới được |
| Lặp setup | Migration checksum giữ nguyên, seed không nhân; 53 migration, 50 user, 0 order, 6 ledger entry |
| Backend | Source thật, Node 24.18.0, `AGV_MOI_TRUONG=production`, gateway; HTTP health/catalog 200, test clock 404; owner URL bị chặn |
| Frontend | `node frontend/server.mjs`, hai app 200, proxy API/health 200 |
| AI | Source sao chép vào infra, venv Python 3.14 x64 có sẵn; TestClient health 401/200 theo key, STT tắt và audit ghi được. **Chưa test Python3.11/ARM image đích** |
| SQL dump/restore | `pg_dump -Fc`, `pg_restore --single-transaction --exit-on-error` vào DB mới; cùng count migration/user/order/entry/principal = `53/50/0/6/1` |
| Nghiệp vụ gateway | **Bị chặn** mục 17, đối chứng bên dưới |
| Oracle/ACME/remote backup | **Chưa kiểm**: không tài khoản/VM/cloud resource; không age/rclone/IAM/timer/restore volume/secrets thực tế |

Caddy ở HTTP loopback dùng bản sao nguồn chỉ đổi địa chỉ/cổng và tắt admin. Kết quả:

```text
/ban/                  không Basic Auth -> 401
/ban/, /mua/           có Basic Auth    -> 200
/v1/products           Bearer thử       -> 200 (route công khai, không bị Basic chặn)
/v1/orders             phiên sai        -> 401 (backend)
/v1/test/clock         có Basic Auth    -> 404
/v1/sim/bank/state     có Basic Auth    -> 404
```

Đây không phải TLS/ACME, browser E2E, phiên thật hoặc xác nhận luồng tiền. Hai app có HTTP 200 chỉ chứng minh server trả shell. Không đo tải/sức chứa ARM hoặc SLA.

## Hai lỗi phát hiện khi dùng PostgreSQL thật

1. `backend/scripts/cap-quyen-postgres.sql` bản 26/10: `GRANT agv_backend_broker TO agv_backend_gateway` rồi cấp ngược `GRANT agv_backend_gateway TO agv_backend_broker WITH ADMIN OPTION` tạo vòng, PostgreSQL báo `role "agv_backend_gateway" is a member of role "agv_backend_broker"`. Không sửa file backend. [`provision-runtime.sh`](provision-runtime.sh) tạo bản tạm chỉ bỏ đúng dòng cấp ngược, ghi thông báo. PG17 tự cấp ADMIN cho role creator trên principal mới, nên đường broker tạo role + GRANT principal TO gateway vẫn được kiểm thành công. Không thêm quyền rộng để thay vòng grant. Khi upstream bỏ dòng lỗi, không lọc gì nữa.
2. DB 0001–0053 dùng `cmd.enter_actor` tra `cmd.login_principals.login_name = session_user`. Đối chứng trên cùng một principal hệ thống tạo từ user/tổ chức/staff active trong seed:

   ```text
   Backend production /health/ready: HTTP 200
   Direct principal: SELECT * FROM cmd.claim_outbox('infra-probe-no-destination',1) -> 0 rows, OK
   Gateway + SET LOCAL ROLE same principal -> KHONG_CO_QUYEN
   kiem-tra-db.sh --acl-only -> exit 0
   kiem-tra-db.sh            -> exit 3, CHẶN TRIỂN KHAI ... session_user
   ```

   Đối chứng direct chỉ dùng owner trong **fixture kiểm thử** để đổi session; không cấp credential owner cho runtime. [`kiem-tra-cong.sql`](kiem-tra-cong.sql) chặn lỗi đã biết trước bật app; không sửa DB từ infra, không đợi migration tương lai và không tuyên bố guard tĩnh thay thế E2E. Xem [đề xuất backend mục 17](../../docs/backend/de-xuat-csdl.md).

Provision còn cấp SELECT `public.schema_migrations` cho gateway/reader vì driver đọc metadata trước SET ROLE. Không cấp DML bảng nghiệp vụ cho gateway. Reader/meta BYPASSRLS, broker CREATEROLE và khả năng SET ROLE của gateway giữ theo backend, là ranh giới tin cậy cần audit riêng, không phải chứng nhận RLS hoàn chỉnh.

## Lệnh kiểm đã dùng

Cấu hình thử được sinh bằng `tao-cau-hinh.sh` ra `/tmp`, thay hostname/email/hash bằng fixture thử, giữ mode 0600. Không in Compose JSON chứa secret; chương trình Python chỉ đọc JSON trong pipe để assert URL/login/cổng/build paths rồi in trạng thái. Không dùng cấu hình thử để deploy.

```sh
# Không cần daemon; ORACLE_ENV_FILE phải là file đã sinh/điền, ngoài checkout:
ORACLE_ENV_FILE=/duong-dan-ngoai-repo/oracle.env bash -c '
  source infra/oracle/chung.sh
  dc --profile setup config --quiet
'
# ShellCheck dùng -P để tìm chung.sh khi chạy từ gốc checkout:
infra/.local/oracle-check/bin/shellcheck -x -P infra/oracle infra/oracle/*.sh
# Với môi trường cấu hình đã nạp:
infra/.local/oracle-check/bin/caddy adapt --config infra/oracle/Caddyfile --adapter caddyfile --validate
# Không dùng lệnh adapt để chia sẻ JSON: có thể chứa hash/site config.
```

Với PostgreSQL mới/cách ly và công cụ client trong PATH, các hook dưới đây cho phép dùng cùng script setup như container (không sửa `db/`):

```sh
# PGHOST/PGPORT/PGUSER=agiviet_owner/PGDATABASE/PGPASSWORD và DATABASE_URL owner
# lấy từ môi trường bảo vệ; AGV_GATEWAY_PASSWORD đã được sinh, không echo.
export DB_REPO_DIR="$PWD/db"
export ORACLE_SCRIPT_DIR="$PWD/infra/oracle"
export BACKEND_PROVISION_SQL="$PWD/backend/scripts/cap-quyen-postgres.sql"
AGV_MOI_TRUONG=thu SEED_DEMO=1 bash infra/oracle/db-setup.sh
bash infra/oracle/kiem-tra-db.sh --acl-only
bash infra/oracle/kiem-tra-db.sh  # hiện cố ý dừng vì mục 17
```

Seed chỉ dùng DB thử. Bộ chạy của phiên giữ ở `.local/oracle-check/run-db-checks.sh`, `probe.mts`, `ai-check.py`; log `db-setup.log`, `rerun.log`, `check.log`, `gate.log`, bản dump và counts. Đây là dấu vết workspace cục bộ, không phải dependencies của deploy. Tất cả tiến trình PG/backend/frontend/Caddy của phép kiểm đã dừng; không đụng DB bench cũ. Cấu hình bí mật thử ngoài checkout được xóa sau kiểm, không có secret thật trong báo cáo.

## Bước tiếp theo có chủ sở hữu

Nhóm DB/backend sửa danh tính gateway mục 17, tiếp nhận lỗi vòng grant, rồi kiểm command/negative authorization/đa phiên trên PostgreSQL thật. Người dùng tự tạo tài khoản/VM theo [06](../../docs/ha-tang/06-trien-khai-oracle-free.md). Chỉ sau các kiểm đó mới chạy deploy đầy đủ và nghiệm thu Docker ARM64, HTTPS thật, backup ngoài máy và restore trọn bộ. Phiên infra này kết thúc, không chờ vòng lặp.


## Tên miền và chống tràn — lượt tiếp 26/10/2026

Phạm vi vẫn chỉ `infra/`, `docs/ha-tang/`. Source trước lượt này: `infra/.local/oracle-guard/source-before/`; không có Git hoạt động. Không tạo cloud/DNS/ACME. Mốc backend **56/56, 410/410 PG17 thật qua gateway** kế thừa [TIEN-DO.md](../../backend/TIEN-DO.md), không chạy lại.

| Kiểm mới | Kết quả và giới hạn |
|---|---|
| Custom Caddy | xcaddy 0.4.5, Go 1.25.1 x64, Caddy 2.10.2 + plugin commit `5625512f24f6f59d6f64fb3aafe5eecff0b286db`; module có, validate nguồn HTTPS đạt |
| Caddy HTTP thật | Basic 401/200, private 404; auth 10/phút rồi 429 + Retry-After, đổi XFF không vượt; API vượt 120/phút trả 429; upstream là sink thử, không phải backend |
| Body thật | Đúng 12.582.912 byte qua sink 200; +1 byte Content-Length và chunked đều 413 |
| Compose | 5.6.0 config; CPU 2,00/RAM 5,75 GiB kể migrate, mọi memswap bằng mem_limit; chưa có daemon/cgroup thật |
| DNS fixture | A đúng, dual stack đúng đạt; A sai/AAAA sót/SERVFAIL/CNAME bị chặn. Chưa kiểm DNS công cộng thật, chưa có IP VM |
| Monitor fixture | Không prune dưới ngưỡng; --check không xóa; --clean chỉ đúng dangling image/cache/tmp cũ; giữ DB/uploads/backup/file mới, không theo symlink; khóa bận và backup dưới tmp đều từ chối |
| Shell / units | bash -n, ShellCheck 0.11.0 toàn bộ oracle/*.sh và systemd-analyze verify 2 unit đạt |
| Bộ hồi quy infra | **9/9**, chạy hữu hạn, log `infra/.local/oracle-guard/checks.log` |
| ARM builder | manifest `caddy:2.10.2-builder` có linux/arm64, thêm thời điểm riêng trong arm64-manifests.json; chưa build container |
| Provision mới | Dùng DB_PROVISION_SQL mặc định db/scripts/cap-quyen-cong.sql, không lọc SQL backend; guard yêu cầu 0055/trusted gateway. Chỉ kiểm cấu hình/cú pháp, chưa chạy SQL wrapper mới |

Lần build Caddy bằng Go hệ thống 1.27.3 gặp panic reflection khi validate; binary cuối build lại bằng Go 1.25.1 đã validate/runtime đạt. Chưa kiểm image Docker builder đích; không coi thành công binary host là thành công ARM64/Docker. Không có /var/run/docker.sock.

Lệnh kiểm có thể chạy lại từ gốc repo (không in config/secret):

```sh
for script in infra/oracle/*.sh; do bash -n "$script" || exit; done
infra/.local/oracle-check/bin/shellcheck -x -P infra/oracle infra/oracle/*.sh
systemd-analyze verify infra/oracle/systemd/agiviet-resources.service infra/oracle/systemd/agiviet-resources.timer
python3 infra/oracle/tests/kiem-chong-tran.py --caddy infra/.local/oracle-guard/bin/caddy
# Bỏ --caddy nếu chưa có custom binary; 3 kiểm HTTP được skip, không coi là đầy đủ.
```

Build host dùng GOCACHE/GOMODCACHE/GOPATH dưới `/tmp/agiviet-go-*`, GOFLAGS `-p=2 -buildvcs=false`, GOMAXPROCS=2, GOTOOLCHAIN=go1.25.1; log build ở `.local/oracle-guard/build-caddy.log`. Fixture config ngoài repo sinh bằng tao-cau-hinh.sh rồi hủy, Caddy thử dừng sau suite. Không chạm cluster PG lượt trước.

Hướng dẫn DNS/staging: [06](../../docs/ha-tang/06-trien-khai-oracle-free.md); quota/Budget/timer/checklist: [07](../../docs/ha-tang/07-chong-tran-chi-phi.md); đánh giá hiện tại: [05](../../docs/ha-tang/05-danh-gia-thanh-that.md). Chưa xác nhận quota/Budget email, OCI billing, DNS/ACME/gia hạn, timer/prune/reboot trên Docker thật, backup remote/browser E2E/capacity. Kết thúc lượt này, không chờ vòng lặp.

## Hoàn tất hồ sơ 6 GB — tiếp phần đã sửa, 26/10/2026

Chỉ sửa infra và docs/ha-tang; nguồn trước lượt này trong `infra/.local/oracle-resume/source-before/`. Giữ cấu hình domain/rate limit/body/timer đã có, thêm override 6 GB và chọn AI tùy RAM. Không chạy lại mốc backend PG17 56/56 hoặc sửa provision/SQL ở lượt này.

| Kiểm chạy trong lượt hoàn tất | Kết quả và ranh giới |
|---|---|
| Cú pháp shell / ShellCheck 0.11.0 | Toàn bộ oracle/*.sh đạt, kể cả nhánh size/pool/AI/backup mới |
| systemd-analyze verify | Hai unit resources đạt; không cài hoặc bật timer trên host |
| Caddy custom có sẵn | x64 2.10.2 + plugin commit đã ghim; validate nguồn HTTPS đạt; HTTP loopback routing/Basic/private/rate 429 + Retry-After/body 12 MiB và +1 byte 413 đạt; không ACME |
| Compose 5.6.0, 6 GB | Kể migrate 1,00 CPU / 3456 MiB; thường trực 0,83 CPU / 3200 MiB; memswap bằng memory, restart đúng, pool 4 |
| Compose 12/24 GB | Kể migrate 2,00 CPU / 5888 hoặc 8960 MiB; pool 6; giữ cùng tên project/volume qua resize |
| AI tắt, config 6 GB | Không có service ai trong tập kích hoạt; backend AI_URL rỗng; kể migrate 0,88 CPU / 2944 MiB; thường trực 0,71 CPU / 2688 MiB |
| Guard cấu hình | Size sai, ENABLE_AI sai, 24 GB chưa xác nhận và pool >4 ở 6 GB đều bị từ chối |
| DNS / monitor fixtures | A/AAAA đúng/sai và lỗi DNS; cleanup chỉ đúng image/cache/tmp cũ, giữ DB/uploads/backup, symlink/lock; AI tắt chưa có audit thì bỏ qua, có audit vẫn đo/giữ |
| Deploy AI tắt (Docker giả) | Không build/start AI, vẫn stop AI cũ và bật backend/frontend/HTTPS; không phải kiểm Docker runtime |
| Backup AI tắt (Docker/rclone giả) | Chủ động bao gồm profile ai khi dò writer cũ, đóng backend/AI trước snapshot audit read-only bằng image backend, khôi phục writer; cố ý lỗi trước mã hóa/upload, không phải backup/restore thật |
| Tổng suite | **14/14 đạt**, 4,534 giây; không skip kiểm Caddy. Log `infra/.local/oracle-resume/checks.log` |
| Docker Engine hiện tại | `docker info --format '{{.ServerVersion}}'` báo thiếu `/var/run/docker.sock`; không build/chạy/prune Docker thật |

Lệnh kiểm đã chạy lại:

```sh
for script in infra/oracle/*.sh; do bash -n "$script" || exit; done
infra/.local/oracle-check/bin/shellcheck -x -P infra/oracle infra/oracle/*.sh
systemd-analyze verify infra/oracle/systemd/agiviet-resources.service infra/oracle/systemd/agiviet-resources.timer
python3 infra/oracle/tests/kiem-chong-tran.py --caddy infra/.local/oracle-guard/bin/caddy
```

Suite tự sinh/hủy secrets fixture ngoài checkout, dùng Docker CLI thật cho Compose config nhưng shim Docker cho deploy/monitor/backup; HTTP chỉ loopback với sink. Caddy thử được dừng sau suite. Giữ binary/plugin đã kiểm từ lượt trước, không rebuild image/binary và không suy diễn thành chứng cứ ARM64.

Đối chiếu trực tiếp tài liệu Oracle: [Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [quota Compute](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm), [Block](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Block_Volume_Quotas.htm), [Object Storage](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Object_Storage_Quotas.htm), [quota precedence](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/quota_policy_syntax.htm), [Budget](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm), [resize](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/resizinginstances.htm). 07 dùng quota khởi đầu 1/6, hướng dẫn nới 2/12 khi resize cùng VM; Console/quota admission/Budget email và điều kiện chính tenancy **chưa kiểm**. Không tạo cloud/DNS/ACME, chưa benchmark OOM/soak/build trên A1 6 GB, chưa snapshot/restore remote hoặc thử browser hai vai. Phần còn lại là nghiệm thu trên VM thật theo 06/07; phiên này kết thúc, không chờ vòng lặp.
