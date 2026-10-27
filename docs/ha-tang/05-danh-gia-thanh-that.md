# 05 · Đánh giá thành thật

**Hiện tại (lượt tiếp tên miền/chi phí và hồ sơ 6 GB, 26/10):** xem phần cuối. Kiểm infra mới nhất **14/14 đạt**; chưa chạy OCI/Docker ARM64. Backend đã có mốc PG thật 56/56 từ nhóm backend; các mô tả chặn mục 17 phía dưới là lịch sử lượt trước.

**Phạm vi:** các kết quả ngày 25/10 bên dưới là bộ đo stub được giữ nguyên. Trạng thái ứng dụng thật/Oracle cập nhật ngày 26/10 ở phần cuối; không suy capacity của backend thật từ stub.

## Đã đo thật trên máy này

Ngày 25/10/2026: Node 24.18.0, PostgreSQL 17.10 chạy trực tiếp trên laptop i9-13950HX, RAM vật lý khoảng 15,3 GiB, NVMe. Chạy trong phiên riêng: PG affinity CPU logic 0–3, API+AI 4–5, worker 6–7, generator 8–9; không có giới hạn RAM/cgroup tương đương VPS. Không dùng sudo hay cài gói hệ thống. Bộ PG nhúng đã có từ kỹ sư trước, phiên này tái dùng. Riêng client pg_dump/pg_restore 17.11 được tải từ PGDG và giải nén trong infra/.local để thử backup, không cài vào hệ thống.

Có HTTP thật, SQL/transaction/trigger thật, PDFKit tạo tệp thật và ghi ảnh buffer thật. Đã kiểm tra smoke có assertion: đăng lô lặp trả cùng mã, webhook chữ ký sai bị từ chối, webhook lặp không ghi tiền thêm, QR lặp/đồng thời chỉ một lượt đầu, QR bị sửa bị từ chối, worker tạo PDF xong. Thống kê p50/p95/p99, HTTP codes, throughput và tài nguyên ở `infra/load/ket-qua/20-*` trở đi là của lần chạy tiếp này. File 02 ghi bảng chi tiết từng kịch bản và kết quả dump/restore.

Hai cải thiện đã đo, trên cùng cấu hình dữ liệu: đọc nặng p95 5352,8 → 18,6 ms (lỗi 19% → 0%); webhook p95 5393,8 → 5,8 ms (lỗi 83,73% → 0%). Không diễn giải đây là mức tăng tốc chắc chắn của sản phẩm thật. Before chịu chờ pool tới timeout, nên độ trễ giảm rất lớn; tải dưới ngưỡng sẽ có tỷ lệ cải thiện khác. Nhóm đọc gộp nhiều thay đổi, chưa tách đóng góp của từng index/MV. MV refresh concurrently đã thực thi khoảng 233 ms.

Bốn file `01`, `02`, `10`, `11` là kết quả kỹ sư trước để lại, được giữ nguyên làm dấu vết; không dùng làm so sánh chính vì khác lần chạy/cấu hình và cách tính lỗi. Không coi mọi con số cũ là đã được xác minh lại.

## Số nào chỉ là ước tính hoặc mục tiêu

Chi phí cloud/VPS/AI hàng tháng, người dùng và tỷ lệ hoạt động mùa vụ, RTT Việt Nam/Singapore, ảnh truyền hàng tháng, API SLO, RPO/RTO production, sức chứa sau khi tăng máy đều là giả định/ngân sách/mục tiêu. Giá tham chiếu được đối chiếu trang nhà cung cấp trong ngày, chưa đặt tài nguyên và chưa có hóa đơn. Không đo tốc độ mạng đến nhà cung cấp từ người dùng nông thôn.

Các latency AI là phân phối ngẫu nhiên được lập trình, không phải kết quả STT/LLM/Piper trong `ai/`. Không dùng số đó để đánh giá độ chính xác hay năng lực mô hình. Cọc/webhook là mô phỏng, không có tiền hoặc ngân hàng thật.

## Giới hạn laptop và phương pháp

- Generator, API, DB, AI và PDF chung một máy, đi loopback; CPU affinity không phải vCPU quota hay tốc độ CPU VPS. Có turbo, shared cache, OS page cache, ứng dụng desktop và áp lực bộ nhớ từ tác vụ khác. Không chia thời gian laptop để suy capacity production.
- Giữa các bài đặt lại dữ liệu bench nhưng không khởi động lại AI hay xóa tệp ảnh/PDF; backlog AI sau stress có thể kéo sang đầu spike. Đây là chuỗi tải có trạng thái, không phải mọi bài đều có khởi đầu lạnh độc lập.
- Bài stress tăng tải theo bậc ngắn, bài soak chỉ 180 giây. Không chứng minh ổn định 24 giờ, không phát hiện đầy đủ memory leak, vacuum bloat, WAL/disk đầy, cloud cold start, thermal throttling kéo dài.
- Tải đến đều ở bộ hẹn giờ 10 ms, không phải Poisson, không phải trình duyệt. Có đo độ trễ timer generator và số request bị bỏ do giới hạn đồng thời; không có mạng yếu/TLS/CDN/PWA/session người dùng. Khi generator bị chậm nó bắn bù thành cụm; cần đối chiếu lag trong JSON.
- Error gồm mọi HTTP ngoài 2xx và lỗi mạng/timeout; 202 PDF tính là API nhận việc thành công. HTTP 200 QR lặp là kết quả nghiệp vụ hợp lệ, được đếm riêng; 200 không chứng minh toàn bộ vòng đời giao nhận đúng.
- CPU lấy từ `/proc` mỗi giây, 100% là một CPU logic. Trường tên `rss_max_mb` ưu tiên PSS để chia trang nhớ dùng chung của PostgreSQL; có fallback RSS nếu không đọc được PSS. Không đo IOPS/disk latency/băng thông bằng thiết bị chuyên dụng.
- Đã phát hiện bộ đếm AI cũ nhận nhầm `tai.mjs` vì chuỗi con `ai.mjs`; đã sửa từ file 26 trở đi. Không dùng số AI/memory trong 21–25 để kết luận tài nguyên AI. SQL time, HTTP latency và số CPU PostgreSQL của các lượt đó không phụ thuộc cách nhóm AI.
- Percentile chưa có khoảng tin cậy hoặc nhiều lần lặp. Dữ liệu seed có cùng scale nhưng UUID/ngẫu nhiên HTTP thay đổi; một lần trước/sau có thể chịu ảnh hưởng cache nóng. p99 smoke ít mẫu chỉ mang tính quan sát.

## Chưa đo vì chưa có backend hoặc môi trường tương ứng

Backend thật với RLS, auth/OTP, nhiều tổ chức, state machine, triggers đầy đủ, giao dịch một phần, đối soát ngân hàng nhiều đợt, contract hash chain/chữ ký và quyền người giúp. Chưa kiểm an toàn hoặc tính đúng của schema nghiệp vụ từ đầu tới cuối. Lược đồ bench chỉ mô phỏng hình dạng tải, không dùng trực tiếp `du-lieu-ao.json` làm seed. Có 440.000 đơn và 1,68 triệu bút toán trong bộ đo, không phải từng ấy đơn thật.

Chưa chạy toàn bộ Compose do daemon không chạy; proxy/TLS/rate limit, Prometheus rules/exporter/Alertmanager chưa được kiểm trên container. Chưa tích hợp app bán/mua hay AI thật. Workflow nằm ở infra/ci là mẫu, chưa kích hoạt trong repository. Chưa chạy cloud deploy, autoscale, HA/failover, PgBouncer, object storage/CDN, PITR hoặc phục hồi khóa bí mật. Không có chứng cứ production SLA/RPO/RTO.

## Rủi ro lớn nhất và điều kiện bàn giao backend

Stress đã xuất hiện lỗi AI từ 200 request/s tổng; ở 600/s toàn bộ voice lỗi dù các luồng khác vẫn 2xx trong 25 giây. Không công bố capacity 600/s. p95 tổng thấp khi dịch vụ từ chối nhanh có thể che lỗi, cần đọc tỷ lệ lỗi theo luồng.

Rủi ro lớn nhất là đưa bản mô phỏng thiếu quyền và thiếu ngữ nghĩa tiền/giao nhận ra public như backend hoàn chỉnh. Hạ tầng nhanh không bù được ghi nhầm tiền, lộ giá kín hay quét QR sai người. Trước public phải có auth/RLS, kiểm quyền từng lệnh, idempotency theo actor+payload, trạng thái và transaction với outbox; giữ cọc tại ngân hàng mô phỏng, không xác nhận tiền bằng thao tác client.

Rủi ro vận hành tiếp theo là VPS đơn và backup chỉ có ở cùng máy. Script dump cục bộ chưa có lịch tự động/remote upload/encryption. Phần OCI bổ sung bên dưới có mã triển khai các bước này nhưng chưa chạy trên cloud; chưa đạt RPO 5 phút. Queue PDF có thể để job ở running vĩnh viễn khi worker chết, thiếu khóa order+version và có thể đụng version khi nhiều worker cùng đơn; cần lease/reclaim và cấp version nguyên tử, rồi test crash/replay. AI có thể vượt sức chứa và gây timeout; phải hạn mức và có nhập tay.

Backend cần thay stub bằng API chuẩn, dùng schema/migrations của kỹ sư DB và tài khoản không phải owner, bổ sung queue bền vững, webhook partial/overpayment/suspense, QR xoay/gắn người nhận/OTP lockout, object storage, metrics không lộ thông tin. Sau đó chạy lại bộ tải từ máy khác qua proxy/TLS, có kiểm bất biến tiền/lượng và phiên bản tài liệu; chỉ công nhận mức tải đạt SLO trên backend đó.

## Kết quả chốt phiên

Soak 180 giây/9.000 lượt: p50 3,3 ms, p95 22,8 ms, p99 1.403 ms, 0% lỗi; 360/360 PDF done, end-to-end p95 khoảng 27,8 ms. PSS trung bình 30 mẫu đầu/cuối: PostgreSQL 597,6/597,6 MiB, worker 217,8/217,7 MiB, API 308,9/320,4 MiB. API tăng khoảng 11,5 MiB trong cửa sổ ngắn; chưa đủ để kết luận do cache/allocator hay rò bộ nhớ, phải ngâm dài và đo heap trên backend thật.

Dump bằng client PG17.11 mất 14 giây, archive khoảng 241 MiB; restore vào database mới mất 11 giây trên cùng máy. Sau restore kiểm 440.000 đơn, 841.314 giao dịch, tổng ledger = 0; chưa đối soát toàn bộ ảnh/PDF/secrets ở kho ngoài máy. Database restore được drop, PostgreSQL bộ đo và các API/AI/worker do phiên đo bật đã được dừng. Tệp runtime, log và dump giữ trong infra/.local để kiểm tra lại.

Kiểm API mã cuối phiên đạt readiness, metrics đọc được số PDF/DB, JSON sai/QR sai trả 400 và nội dung quá lớn trả 413 (`37-api-cuoi.txt`). Cấu hình Compose và cú pháp shell/JS/YAML đạt; các dịch vụ container và kênh cảnh báo thật vẫn chưa được chạy.

## Lượt Oracle trước ngày 26/10/2026 — ứng dụng thật, migrations 0001–0053

Đã tiếp tục bộ `infra/oracle/` của lượt trước, chỉ sửa `infra/` và `docs/ha-tang/`. Không sửa backend/frontend/AI/DB và không tạo tài khoản, tài nguyên OCI hay dùng credit. Hướng dẫn [06](06-trien-khai-oracle-free.md) đã thay phần stub lỗi thời bằng stack độc lập PG17 + backend Fastify + frontend hai app + AI luật + Caddy. Mặc định RAM 12 GB, override 24 GB cần quota xác nhận. Hạn mức tham khảo được mở lại từ [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) ngày 26/10, không cam kết miễn phí cho tài nguyên chưa kiểm trong Console.

### Đã kiểm trong phiên này

- Compose 5.6.0 chuẩn hóa cấu hình 12 và 24 GB, đủ 6 service kể cả migrate; tất cả ARM64, không publish DB/AI, chỉ publish backend/frontend ở loopback. Runtime URL là **agv_backend_gateway**, đúng `AGV_PG_POOL_MAX`; không truyền owner hoặc URL worker cũ. Docker daemon không chạy, vì vậy đây là kiểm cấu hình, chưa build image.
- Đọc registry manifest cho **4 image thực dùng**: `postgres:17-bookworm`, `node:24.18.0-bookworm-slim`, `python:3.11-slim-bookworm`, `caddy:2.10.2-alpine`, đều có Linux ARM64. Digest/thời điểm mới thay danh sách 7 image stub cũ ở `infra/oracle/arm64-manifests.json`.
- `bash -n` và ShellCheck 0.11.0 sạch cho toàn bộ script Oracle. Caddy 2.10.2 adapt/validate cấu hình HTTPS đạt. Chạy Caddy thật với bản cấu hình HTTP loopback: giao diện không mật khẩu 401, có Basic Auth `/ban/` và `/mua/` 200; Bearer tới API không bị Basic chặn; API protected không có phiên trả 401; test/sim routes 404. **Không xin chứng chỉ ACME**, không thử HTTPS thật.
- PostgreSQL nhúng **17.10 x64**, client **17.11**, cluster mới ở `infra/.local/oracle-check/pg`, cổng 55435, TCP SCRAM. Không dùng hay reset cluster bench cũ. Chạy nguyên 53 migration + seed của DB, provision runtime; chạy lại không nhân seed và giữ checksum. ACL đạt: gateway LOGIN NOINHERIT không superuser/BYPASSRLS/CREATEROLE; không DML tiền/mapping trực tiếp, reader không UPDATE, app không gọi helper nội bộ. Đăng nhập TCP gateway và SET ROLE được.
- Có lỗi PostgreSQL thật mới phát hiện trong `backend/scripts/cap-quyen-postgres.sql`: grant broker → gateway rồi gateway → broker tạo **vòng thành viên**, SQL lỗi và transaction rollback. Infra giữ nguồn backend nguyên vẹn, tạo bản tạm chỉ bỏ đúng `GRANT agv_backend_gateway TO agv_backend_broker WITH ADMIN OPTION;`. Không thay bằng quyền rộng khác; đã kiểm **broker CREATE ROLE + cấp principal TO gateway** trên PG17. Backend cần tiếp nhận sửa này; bản infra có thông báo tương thích rõ khi áp dụng.
- Bổ sung SELECT duy nhất trên `public.schema_migrations` cho gateway/reader, vì driver truy vấn bảng metadata trước SET ROLE. Reader/meta BYPASSRLS và broker CREATEROLE vẫn theo hợp đồng backend, không được diễn giải thành RLS hoàn chỉnh. Gateway có thể SET ROLE sang các vai đặc quyền đó: backend là ranh giới tin cậy, chưa đạt mô hình chia worker thành tiến trình/credential độc lập.
- Chạy **backend thật ở production**, kết nối gateway: `/health/ready` và `/v1/products` HTTP 200; URL owner bị cấu hình production từ chối; `/v1/test/clock` 404. Chạy `frontend/server.mjs` thật: `/ban/`, `/mua/` 200, proxy `/v1/products` và `/health/ready` 200. Đây là HTTP, chưa kiểm bằng trình duyệt, đăng nhập hai vai hoặc nghiệp vụ E2E.
- AI: bản sao source dưới infra dùng venv có sẵn **Python 3.14 x64** (khác image đích Python 3.11); TestClient kiểm không key → 401, key đúng → 200, STT tắt, ghi audit được. Không sửa source/venv AI, không gọi model hay tải model. Không chứng minh wheel/dependency hoặc runtime ARM64.
- Dump custom DB thật rồi `pg_restore --single-transaction --exit-on-error` vào DB mới: số migration/users/orders/ledger entries/principals cùng **53/50/0/6/1**. Seed nền không có đơn, nên phép đếm này không chứng minh vòng đời tiền/giao nhận. Đây là phục hồi SQL local, **chưa chạy** `oracle/sao-luu.sh`/`oracle/khoi-phuc.sh` qua Docker, age/rclone/remote hay khôi phục volume tệp/khóa. Không lấy kết quả dump stub 14 giây/11 giây phía trên làm RTO của ứng dụng thật.

### Điểm chặn đã xác nhận, không chờ vòng lặp

**Mục 17 của backend còn đúng trên migrations 0001–0053:** cùng một principal hệ thống đã ánh xạ hợp lệ, command `cmd.claim_outbox('infra-probe-no-destination',1)` chạy trực tiếp bằng principal trả thành công 0 dòng; qua gateway + `SET LOCAL ROLE` cùng principal trả **KHONG_CO_QUYEN**. Chỉ test fixture dùng owner để đổi session kiểm đối chứng; backend runtime hoàn toàn dùng gateway. `session_user` của gateway không đổi khi SET ROLE, còn command tra login bằng `session_user`.

`trien-khai.sh --db-only` chỉ migrate/seed có điều kiện/provision/kiểm ACL rồi thoát, giữ app/ingress dừng. Deploy đầy đủ gọi `kiem-tra-cong.sql`, đã kiểm từ chối lỗi danh tính trước bật ứng dụng. Guard dò định nghĩa lỗi đã biết, không phải chứng nhận bản DB tương lai; sau khi nhóm DB sửa cần bộ kiểm command trên PostgreSQL thật, negative authorization và tranh chấp đa phiên. **Không dùng owner, tắt RLS hoặc ánh xạ gateway thành một người dùng chung để vượt chặn.**

### Vận hành đã chuẩn bị nhưng chưa xác nhận cloud

Mẫu env không có bí mật thật; cài đặt sinh Ed25519 QR/PDF riêng và các mật khẩu/HMAC độc lập, file mới ngoài checkout, không ghi đè. Backup dừng backend/AI lúc chụp DB–artifacts–audit, mã hóa age, đọc lại remote kiểm SHA-256 rồi mới rotation. Restore chỉ DB mới hậu tố `_restore`, giữ ACL/owner, cấp CONNECT gateway, giữ tệp riêng; verifier từ chối thiếu role principal sau phục hồi. Roles dump không kèm password, cấu hình/khóa phải giữ độc lập. Timer có mã đăng ký nhưng chưa bật trên máy này, chưa có kênh cảnh báo backup thật.

Chưa kiểm: build dependency ARM64 và Docker volume ownership/restart/health; cài OS/firewall/SELinux/reboot trên OCI; SSH/VCN/NSG, DNS/ACME/renewal và hai app qua mạng ngoài; khoản miễn phí/capacity/thẻ/thu hồi VM; command gateway hoàn chỉnh, pool đa phiên/SERIALIZABLE retry/soak; age/rclone/IAM/remote hash/retention/timer và phục hồi đầy đủ DB–file–secrets trên máy mất dữ liệu. Chưa có HA/PITR/SLA hay RPO/RTO production. Mặc định DB production không seed demo; bootstrap tổ chức/nhân sự nền tảng và tích hợp ngân hàng/SMS thật còn cần nhóm phụ trách, infra không tự tạo danh tính/biên nhận thay thế.

Bằng chứng, phiên bản và lệnh kiểm: [`infra/oracle/kiem-chung.md`](../../infra/oracle/kiem-chung.md). PostgreSQL/frontend/backend/Caddy do kiểm thử bật đều đã dừng; log/DB thử giữ trong infra/.local, cấu hình thử ngoài checkout sẽ được dọn. Không chờ nhóm khác sửa trong lượt này.


## Lượt tiếp 26/10/2026 — agiviet.id.vn và chống tràn chi phí

Chỉ sửa `infra/` và `docs/ha-tang/`; không tạo tài nguyên OCI, không đổi DNS, không xin chứng chỉ hay gọi SMS/AI trả phí. Người dùng tự trỏ DNS. Mốc **PostgreSQL 17 thật, gateway 56/56 tình huống / 410 bước** kế thừa từ [backend/TIEN-DO.md](../../backend/TIEN-DO.md) sau migrations 0054–0055; phiên này **không chạy lại bộ nghiệp vụ**. Mục 17 không còn là điểm chặn đang mở.

### Đã làm và kiểm trong lượt tiếp

- Điền `agiviet.id.vn` vào env/Caddyfile/tài liệu. Thêm preflight DNS so A/AAAA chính xác trên resolver máy, 1.1.1.1 và 8.8.8.8; lỗi trả về hữu hạn trước khi deploy bật Caddy. Hướng dẫn nhà đăng ký .id.vn, IPv6 end-to-end, CAA/DNSSEC, staging với volume riêng và dừng Caddy khi ACME lỗi ở [06](06-trien-khai-oracle-free.md).
- Bản chuẩn Caddy không có rate limit. Thêm Dockerfile xcaddy với **Caddy 2.10.2 + caddy-ratelimit commit 5625512f24f6f59d6f64fb3aafe5eecff0b286db**. Đã build **binary x64 cục bộ bằng Go 1.25.1**, thấy module `http.handlers.rate_limit`, validate nguồn HTTPS đạt. Không dùng kết quả validate binary stock làm chứng cứ cho plugin.
- Chạy Caddy custom thật trên **HTTP loopback**, giữ nguyên routing/rate/body từ nguồn, thay địa chỉ site/upstream và tắt ACME/admin trong bản thử. Giao diện không Basic 401, có Basic 200; test/sim 404. Auth 10 lượt đầu 200 từ HTTP sink, lượt 11 trả **429 + Retry-After** dù đổi X-Forwarded-For; `/v1/auth-extra` cũng chịu matcher auth. API thông thường vượt 120/phút trả 429. Đây là kiểm proxy với sink HTTP, **không phải kiểm backend xác thực/nghiệp vụ**.
- Proxy nhận body đúng **12 MiB**, trả **413** khi hơn 1 byte với cả Content-Length và stream chunked. Backend hiện khai báo bodyLimit 12 MiB và file bằng chứng giải mã 8 MiB; không thay backend. Chưa kiểm file 8 MiB bằng chứng qua tài khoản thật trên HTTPS.
- Compose 5.6.0 chuẩn hóa được cấu hình; tự kiểm tổng CPU **2,00**, RAM **5,75 GiB** kể cả migrate, mọi service có memswap bằng mem_limit. Thường trực 1,75 CPU / 5,25 GiB. Build từng image, PID/log có giới hạn. Override 24 GB giữ CPU, chỉ tăng RAM DB. Đây là kiểm cấu hình; chưa đo/ép OOM/cgroup trên VM.
- Script canh disk/inode/RAM/PG volume/uploads/audit/image+cache/tmp và systemd oneshot/timer 15 phút. Ngưỡng vượt chỉ dọn dangling image/cache >7 ngày, file tmp/part riêng >48 giờ; không tự xóa DB/uploads/audit/backup. Fixture đã kiểm chế độ chỉ đọc, dưới ngưỡng không prune, ngưỡng cao gọi đúng lệnh an toàn, không theo symlink, giữ backup/DB/uploads, từ chối backup nằm trong tmp và không chạy chen khi operation lock bận. Các lệnh Docker trong fixture là **giả lập**, không prune daemon/volume thật.
- `bash -n`, **ShellCheck 0.11.0** toàn bộ script Oracle và `systemd-analyze verify` hai unit đều đạt. Bộ kiểm `infra/oracle/tests/kiem-chong-tran.py --caddy ...` đạt **9/9**; có kiểm Compose, DNS fixture, cleanup fixture và HTTP Caddy thật. Không gọi DNS thật vì chưa có IP VM do người dùng cung cấp; không chứng nhận DNS đã lan truyền.
- Đọc manifest mới của `caddy:2.10.2-builder`, có ARM64; bổ sung `arm64-manifests.json` với thời điểm riêng. Không có Docker Engine trên workspace, **chưa build Dockerfile/khởi động container ARM64**. Binary build ban đầu bằng Go hệ thống 1.27.3 gặp lỗi reflection trong Caddy khi validate; đã dùng Go 1.25.1 cho binary kiểm cuối. Kết quả không chứng nhận toolchain/image builder đích.
- Provision đổi sang nguyên `db/scripts/cap-quyen-cong.sql` theo bàn giao backend, bỏ mount/lọc SQL backend lỗi thời; guard thêm kiểm migration 0055 và trusted gateway. Đã kiểm đường dẫn/cấu hình Compose và cú pháp shell; **chưa chạy lại provision/guard SQL mới trên PostgreSQL** trong lượt này, không lấy mốc 56/56 làm chứng cứ cho thay đổi wrapper infra.

[07-chong-tran-chi-phi.md](07-chong-tran-chi-phi.md) đối chiếu tài liệu Oracle chính thức ngày 26/10: Free chưa nâng PAYG không tự thu phí sử dụng; PAYG có thể tính phần vượt. Có mẫu quota cứng theo compartment/AD/region, Budget root + Actual/Forecast alert, checklist Console ngắn. **Budget chỉ cảnh báo**, quota chỉ giới hạn loại tài nguyên được hỗ trợ, không phải hard cap tiền/outbound toàn tenancy; chưa áp quota/Budget lên tài khoản thật. Các con số/ngưỡng phải kiểm lại trên tenancy của người dùng.

### Chưa kiểm và bàn giao cụ thể

Chưa triển khai OCI, chạy timer/prune trên Docker thật, thử reboot/OOM, đo sức chứa A1, kiểm DNS/CAA/firewall IPv6/ACME thật/gia hạn, quota admission/Budget email, backup remote đầy đủ hoặc browser hai vai. Journal cảnh báo có mã, **chưa có kênh báo từ xa**. Ngưỡng dung lượng là cảnh báo theo lịch, không chặn upload bằng filesystem quota; đĩa vẫn có thể đầy giữa hai lượt.

Người dùng tự trỏ A (chưa IPv6 thì bỏ AAAA), điền EXPECTED_IPV4 và cấu hình ngoài repo, chạy DNS preflight theo 06 trước ACME; sau deploy bật timer theo 07. Bằng chứng/lệnh ở [infra/oracle/kiem-chung.md](../../infra/oracle/kiem-chung.md); log build/check mới dưới `infra/.local/oracle-guard/` đã ignore. Caddy HTTP thử đã dừng, cấu hình bí mật thử trong /tmp được dọn sau kiểm. Không chờ vòng lặp.

## Hoàn tất lượt bị dừng — hồ sơ A1 1 OCPU/6 GB, 26/10/2026

Giữ phần đã làm về **agiviet.id.vn**, DNS preflight/staging, Caddy custom rate limit/body và timer kiểm/dọn an toàn. Chỉ bổ sung trong `infra/`, `docs/ha-tang/`; không sửa backend/frontend/AI/DB. Bản nguồn trước lượt tiếp giữ tại `infra/.local/oracle-resume/source-before/` để đối chiếu vì workspace không có Git hoạt động.

- **`OCI_SIZE=6`** ghép override cho đủ PostgreSQL + backend + frontend + AI luật nhẹ + Caddy. Tổng trần kể cả migrate **1 CPU / 3456 MiB (3,375 GiB)**, thường trực **0,83 CPU / 3200 MiB (3,125 GiB)**. Pool DB mặc định 4, từ chối >4 ở hồ sơ nhỏ; PG max_connections 32, shared_buffers 384 MiB, work_mem 2 MiB, maintenance 64 MiB; Node heap 448 MiB. Installer chọn swap host 2 GiB khi truyền OCI_SIZE=6 (12/24 GB: 4 GiB), giữ swap cũ hợp lệ. Container không dùng thêm swap. Các con số là ngân sách cấu hình, **chưa đo đỉnh RSS/build/OOM hoặc tải trên A1**.
- **`ENABLE_AI=0`** bỏ build/start AI, dừng container AI cũ trong deploy, backend nhận AI_URL rỗng để dùng luật sẵn có ngay. Hồ sơ 6 GB còn thường trực **0,71 CPU / 2688 MiB (2,625 GiB)**. Backup dùng image backend chụp audit cũ read-only; chưa có volume thì tar audit rỗng, không tạo volume thay thế. Backup vẫn phát hiện/dừng writer AI cũ khi env vừa tắt AI. Monitor bỏ qua audit chưa từng có khi AI tắt, vẫn đo/giữ audit đã có.
- [06](06-trien-khai-oracle-free.md) hướng dẫn tạo **1 OCPU/6 GB trước** ở Singapore thiếu capacity, sau đó resize **cùng VM** lên 2 OCPU/12 GB, giữ IP/volume/khóa. Có thứ tự backup, dừng lịch/writer/DB, Stop/Edit shape/Start, đổi env và nghiệm thu lại. Khối tạo env được đặt trước lệnh DNS/staging để có thể làm theo tuần tự. Yêu cầu nhỏ hơn có thể dễ có slot hơn, **không bảo đảm capacity**.
- [07](07-chong-tran-chi-phi.md) giữ giải thích Free/PAYG, các nguồn phí, quota cứng và Budget alert/checklist. Mẫu quota khởi đầu **1 core / 6 GB**, hướng dẫn đổi sang **2 / 12** trước resize; không tăng quota storage chỉ để tăng CPU/RAM. Đối chiếu lại tài liệu chính thức Oracle về Always Free, quota Compute/Block/Object Storage và precedence, Budget, resize; **chưa áp policy hay tạo budget trên Console**. Budget là cảnh báo, không phải khóa tiền; quota cũng không khóa outbound toàn tenancy.

**Kiểm chứng cục bộ mới nhất:** `bash -n` và **ShellCheck 0.11.0** toàn bộ `infra/oracle/*.sh` đạt; `systemd-analyze verify` hai unit resources đạt. Suite `infra/oracle/tests/kiem-chong-tran.py` với custom Caddy có sẵn đạt **14/14** trong khoảng 4,5 giây: validate Caddy nguồn HTTPS; routing/rate 429 + Retry-After/body đúng 12 MiB và quá 1 byte 413 trên HTTP loopback thật; Compose 5.6.0 cho 6/12/24 GB, budget CPU/RAM/swap/restart/pool và cùng tên volume; từ chối cấu hình sai; DNS fixture; cleanup/operation lock fixture; deploy tắt AI; backup chụp audit và đóng writer AI cũ; monitor audit có/không khi AI tắt. Docker/deploy/backup trong các fixture là **giả lập**, không chứng nhận snapshot/restore cloud hoặc cgroup thật. Kiểm backup cố ý dừng trước mã hóa/upload, chỉ xác minh việc đóng/mở writer và chọn volume/image an toàn.

Log cuối: `infra/.local/oracle-resume/checks.log`; custom binary dùng lại từ lượt trước `infra/.local/oracle-guard/bin/caddy` (x64 2.10.2 + plugin ghim commit), không build lại và không gọi ACME. Đã kiểm hiện tại **không có Docker socket**; chưa chạy container, timer thật, reboot/resize, quota admission/Budget email, DNS public/HTTPS/gia hạn, backup remote hoặc browser hai vai. Không có IP VM thực để xác nhận DNS. Caddy HTTP thử đã dừng, fixture secrets trong /tmp được dọn tự động. Mốc backend PG17 56/56 vẫn là bàn giao của nhóm backend, không chạy lại trong lượt này. Không tạo cloud/đổi DNS/tiêu credit, không chờ vòng lặp.

## Laptop + Cloudflare Tunnel — 26/10/2026

Bổ sung riêng `infra/local-tunnel/` và [08 — chạy tạm Cloudflare Tunnel](08-chay-tam-cloudflare-tunnel.md). Đối chiếu SHA-256 **956 file nguồn** trước/sau: không đổi hoặc thêm nguồn trong `backend/`, `frontend/`, `db/`, `ai/`, `security/`, `infra/oracle/`. Workspace không có Git hoạt động, nên bằng chứng là manifest hash, không phải git diff. Không dùng sudo/Docker, không tạo cloud, không đổi DNS, không login hay chạy tunnel.

**Mặc định an toàn cho trình diễn:** backend môi trường `thu`, dữ liệu ảo, OTP `123456`; cả HTML/API cần pilot. Basic pilot cấp cookie HMAC riêng, để Bearer backend vẫn dùng được. Caddy ingress `127.0.0.1:18888` chặn mọi `/v1/test*`, `/v1/sim*`; cổng operator `127.0.0.1:18889` mở công cụ sau khóa nhưng không nằm trong tunnel ingress. OTP cố định công khai đồng nghĩa ai có đường tới API không khóa đều đăng nhập được tài khoản ảo; người có mật khẩu pilot vẫn có quyền đó. Không dùng hồ sơ hay tiền thật. Reset/import fixture cần owner không được bật; tua giờ SQL và toàn bộ mô phỏng chưa được chứng nhận. Không truyền owner vào backend để vượt giới hạn đó.

### Đã kiểm thật trên máy này

- PostgreSQL nhúng **17.10 x64**, client **17.11**, Node **24.18.0**. Init cluster mới SCRAM, migrate **55/55**, seed **50 users**, chạy nguyên `db/scripts/cap-quyen-cong.sql` qua wrapper Oracle hiện hữu và guard 0054–0055. Backend đăng nhập `agv_backend_gateway`; kiểm environment runtime không có owner password/URL/template. Startup không tự seed lại khi có marker; restart giữ dữ liệu và SHA-256 `local.env`.
- **53 assertion HTTP/lifecycle đạt** trong `kiem-chung.sh`: frontend/server.mjs, backend, Caddy custom thật; `/ban/`, `/mua/`, `/health`, readiness có pilot 200, thiếu pilot 401. OTP send/verify + Bearer session cho hai số ảo đại diện hai vai 200; Bearer thiếu cookie 401. Cookie giả 401, Origin ngoài 403, spoof scope không mở test. Prefix/encoded test/sim qua ingress ngoài 404; operator accounts/clock/bank state sau khóa 200.
- Mọi listener stack là **127.0.0.1**, kể cả frontend vốn hardcode wildcard được ép loopback bằng preload riêng trong infra. Caddy custom **2.10.2 + rate_limit** đang có sẵn, body payload thực 12 MiB: đúng trần tới backend (422 vì phone cố ý sai); hơn 1 byte Content-Length/chunked 413. Auth vượt 30/phút trả **429 + Retry-After** dù đổi XFF; dùng ngân sách chung vì cloudflared đi từ loopback, không tin IP header client.
- AI luật Python 3.14 dùng venv có sẵn, source sao ra STATE; health thiếu key 401, đúng key 200, audit ở ngoài repo. Không gọi LLM/STT, không tải model. **ENABLE_AI=0** đã chạy thật, không có AI process.
- Backup cục bộ dùng cùng cách Oracle: dừng writer, custom dump + `pg_restore --list`, roles không password, artifacts/audit + manifest/hash, archive rồi rotation; restart writer và kiểm ready. Ba backup thật giữ **2** bản; budget 1 byte bị từ chối trước dừng writer, giữ nguyên bản cũ và backend vẫn ready. Restore custom dump vào DB phụ + phục hồi tệp artifact đạt; migration/users/principals **55/50/0** của fixture chưa đăng nhập. Chỉ chứng minh restore fixture, không phải E2E tiền/đơn hàng hoặc phục hồi đầy đủ sau mất máy.
- `dung.sh` dừng sạch, tất cả cổng stack đóng và không còn process token trong `/proc`. Không kill tiến trình sẵn có. Bash syntax, ShellCheck **0.11.0**, Node syntax, Python compile và Caddy validate đạt. Helper config tunnel kiểm với credential giả ngoài repo: mode 0600, apex/www → Caddy, catch-all 404, không operator, không ghi đè file cũ.
- Tải **cloudflared 2026.10.4** Linux amd64 từ [release chính thức Cloudflare](https://github.com/cloudflare/cloudflared/releases/tag/2026.10.4), kiểm SHA-256 `ae5e8add7884b0531d66bbca4570d1de491ff6da51e4ebe7eb160cdf241d9e42`, chạy `--version` đạt. Mẫu config và lệnh login/create/route DNS/run để người dùng tự làm theo 08; chưa dùng Cloudflare account thật.

### Giới hạn của kết quả

Sandbox chỉ cho ghi ngoài repo tại `/tmp`, nên hai cluster kiểm nằm ở **STATE riêng dưới `/tmp`**, giữ qua stop/start nhưng là tmpfs, chưa chứng minh bền qua reboot. Script mặc định lưu **`~/.local/share/agiviet/pg` 0700**, bí mật **`local.env` 0600**, ngoài repo; người dùng cần chạy lệnh 08 trong terminal thực để dùng vị trí bền. Không lấy kết quả `/tmp` làm xác nhận dữ liệu laptop đã được cài bền ở HOME.

Host `agiviet.id.vn` qua Caddy đã kiểm bằng HTTP Host header; cookie HTTPS có Secure/host-only đúng cấu hình, **chưa kiểm trình duyệt/HTTPS thật, DNS/nameserver, Cloudflare login/tunnel/route, ISP hoặc thiết bị ngoài mạng**. Chưa chạy lại bộ nghiệp vụ 56/56 của backend, tải/soak, OOM/reboot, giả lập đầy đủ hoặc restore role/secrets trên máy mất dữ liệu. Backup cục bộ chưa mã hóa, không ngoài máy, không có lịch tự bật; có retention/budget/deadline/disk reserve nhưng dữ liệu ứng dụng, audit và log đang chạy chưa có filesystem quota. Không có HA, SLA, PITR hoặc RPO/RTO production.

Bằng chứng đã ignore tại `infra/.local/local-tunnel-check/`: `http-smoke.log`, `operations.log`, `config-test.log`, `static-checks.log`, `source-integrity.txt`, metadata release/hash cloudflared. Stack kiểm đã dừng; dữ liệu/khóa thử ngoài repo giữ riêng, không đưa lên mạng. Bộ Oracle giữ nguyên để chuyển khi có slot Singapore. **Không chờ vòng lặp**, không tiêu credit.
