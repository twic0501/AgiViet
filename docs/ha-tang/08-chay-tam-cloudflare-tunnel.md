# 08 — Chạy tạm trên laptop qua Cloudflare Tunnel

Ngày kiểm: **26/10/2026**. Nguồn chạy là checkout **`/home/twictrn/agiviet-production-v2`**. Không có Docker daemon, không dùng sudo. Bộ mới ở `infra/local-tunnel/`; **giữ nguyên `infra/oracle/`, backend, frontend, db, ai, security**.

Đây là môi trường **trình diễn có dữ liệu ảo**, không phải production. Laptop ngủ, đóng nắp, mất mạng hoặc thoát tài khoản có thể ngắt trình diễn. Không có HA, PITR hay RPO/RTO cam kết. Chưa đưa `agiviet.id.vn` lên mạng trong lượt này.

## 1. Chế độ mặc định và ranh giới truy cập

Chọn **tách cổng**, giữ backend `AGV_MOI_TRUONG=thu`, seed ảo và OTP thử. Cả hai cổng Caddy có khóa pilot:

| Đường truy cập | Chức năng | Test/sim |
| --- | --- | --- |
| `http://127.0.0.1:18888` → tunnel → `https://agiviet.id.vn` và `https://www.agiviet.id.vn` | Giao diện hai vai, API thông thường, OTP thử, health; tất cả cần pilot | `/v1/test*`, `/v1/sim*` trả **404**, kể cả có pilot |
| `http://127.0.0.1:18889` trên laptop | Trình diễn có công cụ đóng vai, tài khoản mẫu, ngân hàng mô phỏng | Chỉ sau khóa pilot; **không cấu hình tunnel tới cổng này** |

**OTP cố định `123456` công khai nghĩa là ai cũng có thể đăng nhập tài khoản ảo nếu API không có khóa pilot.** Ở đây API cũng bị khóa, không chỉ HTML. Chỉ chia sẻ mật khẩu pilot cho người dự buổi trình diễn; người đã có pilot vẫn có thể đăng nhập mọi tài khoản ảo bằng OTP thử. Không nhập số điện thoại, hồ sơ, tiền hay tài liệu thật. Ngân hàng, SMS và AI luật là mô phỏng/gợi ý, không chứng minh giao dịch thật.

Basic Auth và Bearer cùng dùng header Authorization. `pilot.mjs` xử lý Basic user **`pilot`** khi mở trang và cấp cookie HMAC có hạn 8 giờ, HttpOnly, SameSite=Strict. Tên miền công khai dùng cookie `__Host-agv_pilot`, Secure, host-only. Sau đó API dùng cookie pilot **cùng** Bearer token của backend. Bearer đơn lẻ không vượt được khóa; không dùng Basic thay token ứng dụng. Cookie cổng operator và cổng ngoài được ràng buộc riêng. Đổi `PILOT_PASSWORD` **và** `PILOT_COOKIE_SECRET` trong cấu hình khi cần thu hồi toàn bộ truy cập, rồi stop/start; không đổi các khóa DB/ứng dụng tùy tiện.

Để đóng vai đầy đủ: mở `http://127.0.0.1:18889/ban/` và `/mua/` bằng hai hồ sơ trình duyệt khác nhau, đăng nhập pilot rồi chọn tài khoản mẫu/OTP. Hai số ảo đã kiểm: `0909000210` và `0918000421`, OTP `123456`. Truy cập từ xa qua tên miền không có công cụ test/sim; các thao tác UI gọi những endpoint đó sẽ bị chặn. Không đổi ingress sang operator để né chặn.

**Giới hạn ứng dụng còn nguyên:** reset/import fixture của backend PG cần owner URL/template, nên bộ này không truyền chúng vào runtime. Nút reset/import chưa dùng được; công cụ tua giờ cũng chưa được chứng nhận đồng bộ giờ SQL trên PG17 khi không có template kiểm thử. Đã kiểm đọc clock/accounts/bank state và đăng nhập hai vai; chưa kiểm toàn bộ nghiệp vụ/sim hoặc browser E2E. Không cấp owner hay nới RLS để làm các nút đó chạy. Nếu cần phiên trình diễn sạch khác, dừng stack và chọn **STATE mới ngoài repo**, giữ STATE cũ.

## 2. Dữ liệu bền và phụ thuộc

Mặc định STATE: `${XDG_DATA_HOME:-$HOME/.local/share}/agiviet`; lệnh dưới cố định rõ `~/.local/share/agiviet`. **Không dùng `/tmp` cho buổi trình diễn thực**, vì có thể mất khi reboot/dọn máy. Dừng rồi chạy lại với cùng STATE sẽ giữ DB/khóa. Script từ chối STATE trong repo, owner/mode sai, cổng bận và cluster khác phiên bản.

| Tệp/thư mục ngoài repo | Quyền/chức năng |
| --- | --- |
| `$AGV_LOCAL_STATE/pg/` | PGDATA **0700**, không tự xóa/reset |
| `$AGV_LOCAL_STATE/local.env` | **0600**: mật khẩu owner, gateway, pilot; HMAC; hai khóa Ed25519 QR/PDF riêng |
| `$AGV_LOCAL_STATE/artifacts/` | Tài liệu ứng dụng, giữ qua restart |
| `$AGV_LOCAL_STATE/ai/` | Bản sao code AI và audit ngoài nguồn `ai/`; không sửa AI gốc |
| `$AGV_LOCAL_STATE/logs/`, `run/`, `backups/` | **0700**; tệp sinh với umask 077 |
| `$AGV_LOCAL_STATE/cloudflared.yml` | **0600**, cấu hình tunnel sau khi người dùng tạo |
| `~/.cloudflared/cert.pem`, `<UUID>.json` | Credential Cloudflare ngoài repo; giữ **0600**, không gửi qua chat/commit |

Khóa sinh đúng lần đầu bằng bộ ngẫu nhiên hệ điều hành/OpenSSL; không ghi đè khi restart. Có PGDATA nhưng mất cấu hình thì script từ chối sinh khóa mới. Giữ một bản `local.env` an toàn ngoài laptop để có thể khôi phục; archive backup không chứa file này.

Máy hiện có:

- Node **24.18.0**, Bash, Python3, OpenSSL, curl, flock, timeout, công cụ GNU/Linux.
- PG server nhúng **17.10 x64**: `infra/.local/tools/node_modules/@embedded-postgres/linux-x64/native/bin`. PG client **17.11**: `infra/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin`. Dùng libpq đi kèm bản nhúng qua `LD_LIBRARY_PATH`; không cài package hệ thống.
- Backend dependency/tsx đã có ở `backend/node_modules`; script chỉ chạy, không cài/sửa backend. Nếu thiếu, dừng với lỗi rõ để chủ dự án chuẩn bị dependency riêng.
- Caddy custom **2.10.2** ở `infra/.local/oracle-guard/bin/caddy`, có `http.handlers.rate_limit`, plugin ghim commit `5625512f24f6f59d6f64fb3aafe5eecff0b286db`. Script từ chối bản stock thiếu plugin. Có thể trỏ `CADDY_BIN` sang binary custom khác, không tự thay bộ Oracle.
- AI dùng `ai/.venv/bin/python` hiện có (Python 3.14), chỉ import/chạy bản sao code ngoài repo, STT tắt, Ollama trỏ loopback cổng không dùng để không gọi model. Thiếu dependency hoặc readiness không đạt trong thời hạn thì tắt AI và để backend dùng luật/nhập tay. `ENABLE_AI=0` bỏ hẳn tiến trình AI; không cần tải model.

Có thể ghi đè `PG_BIN`, `PG_CLIENT_BIN`, `AI_PYTHON`, `CADDY_BIN` bằng đường dẫn đúng trên máy khác. Bản binary x64 hiện tại chưa chứng nhận ARM64. `infra/.local` là công cụ cục bộ đã ignore, không phải gói source có thể clone là chạy trên mọi máy.

## 3. Chạy theo thứ tự

Trong terminal trên laptop:

```bash
cd /home/twictrn/agiviet-production-v2
export AGV_LOCAL_STATE="$HOME/.local/share/agiviet"
infra/local-tunnel/khoi-dong.sh
infra/local-tunnel/trang-thai.sh
sed -n 's/^PILOT_PASSWORD=//p' "$AGV_LOCAL_STATE/local.env"
```

User Basic là `pilot`. Mở `http://127.0.0.1:18889/ban/` và `/mua/` để trình diễn đầy đủ tại máy; mở `http://127.0.0.1:18888/ban/` để xem đúng cổng sẽ đưa ra mạng. Chỉ dùng HTTP ở loopback; truy cập tên miền dùng HTTPS của Cloudflare.

Nếu muốn tắt AI ngay từ đầu, thay lệnh start bằng:

```bash
ENABLE_AI=0 infra/local-tunnel/khoi-dong.sh
```

Script migrate có checksum mỗi start; seed chỉ lần đầu thành công; sau đó owner chạy nguyên `db/scripts/cap-quyen-cong.sql` qua wrapper runtime Oracle hiện hữu và guard migration 0054–0055. Backend chỉ nhận URL **`agv_backend_gateway`**, không nhận owner password/URL/template. Gateway NOINHERIT, không superuser/BYPASSRLS/CREATEROLE. Một số role bên trong theo hợp đồng DB/backend vẫn có BYPASSRLS/CREATEROLE; không diễn giải thành RLS tuyệt đối giữa những người biết credential gateway.

Frontend vẫn chạy **`node ... frontend/server.mjs`**; preload `loopback.mjs` chỉ ở launcher ép listen từ hardcode `0.0.0.0` về `127.0.0.1`. Không sửa nguồn frontend. Mọi TCP listener của stack là loopback:

| Dịch vụ | Cổng mặc định |
| --- | --- |
| PostgreSQL | `127.0.0.1:55436` và Unix socket trong STATE 0700 |
| Backend | `127.0.0.1:18080` |
| Frontend | `127.0.0.1:18090` |
| Pilot bridge | `127.0.0.1:18091` |
| AI luật nếu bật | `127.0.0.1:18092` |
| Caddy ingress / operator | `127.0.0.1:18888` / `127.0.0.1:18889` |
| cloudflared metrics khi người dùng chạy | `127.0.0.1:20241` |

Không mở port router, không publish DB. Các cổng backend/frontend trực tiếp là công cụ **nội bộ laptop**, không có lớp pilot; người/tiến trình đang dùng máy thuộc ranh giới tin cậy. Không tạo tunnel tới chúng. Nếu đổi cổng bằng `AGV_PG_PORT`, `AGV_BACKEND_PORT`, `AGV_FRONTEND_PORT`, `AGV_PILOT_PORT`, `AGV_AI_PORT`, `AGV_CADDY_PORT`, `AGV_OPERATOR_PORT`, giữ cùng biến khi start/status/backup/stop; tạo lại config tunnel theo cổng Caddy mới.

Các lần đợi đều hữu hạn: kết nối PG 5 giây, readiness PG 30 lượt; migrate 300 giây, seed 120, provision 60, guard 30; AI 15 lượt, backend 45, frontend/Caddy 15, HTTP probe tối đa 2 giây mỗi lượt. Không có vòng đợi vô hạn hay tự chạy cloudflared. Thao tác start/stop/backup dùng flock không chờ; cổng bận thì fail, không kill chương trình khác. PID/session kèm token riêng trong `/proc`, chỉ dừng tiến trình thuộc stack.

## 4. Caddy, body và rate limit

Caddy tắt admin, auto-HTTPS và persist config; HTTP origin chỉ loopback. TLS công khai do Cloudflare kết thúc. Header scope do Caddy ghi đè; client không thể tự gửi `X-Agv-Scope: operator` để mở test/sim. Pilot thêm lớp chặn đường dẫn đã decode và kiểm Origin/cookie.

Ngân sách chung cho mỗi cổng: auth **30/phút**, API **300/phút**, tổng **600/phút**, vượt trả 429 + Retry-After. Vì cloudflared kết nối từ loopback, dùng key `all`; không tin X-Forwarded-For/CF-Connecting-IP do client cung cấp. Người dùng có thể cùng chạm trần; đây là giới hạn pilot, không phải hệ thống chống DDoS hay quota chi phí.

Giới hạn payload thực **12 MiB = 12.582.912 byte**. Caddy từ chối Content-Length lớn hơn; stream guard Caddy cho thêm đúng 1 byte sentinel để pilot bắt oversized chunked trước khi gửi body đến backend. Pilot đệm tối đa 12 MiB rồi mới chuyển tiếp. Cả Content-Length/chunked hơn 1 byte đã trả 413 thật. Body đúng trần tới backend và bị từ chối 422 do số điện thoại thử cố ý sai. Có timeout đọc header/body; đệm request vẫn tốn RAM theo số yêu cầu đồng thời. Chưa đo tải/soak hoặc OOM trên laptop.

## 5. Cloudflare Tunnel — người dùng tự login, tạo và route DNS

Điều kiện: người dùng quản lý zone `agiviet.id.vn` trong Cloudflare, nameserver đã hoạt động; có quyền tạo tunnel/DNS. Nếu apex/www đang có A/AAAA/CNAME trùng, xem xét và thay bản ghi cũ trong Dashboard; **không dùng overwrite tự động** khi chưa xác định đích cũ.

Installer đã tải bản chính thức **2026.10.4**, Linux amd64, SHA-256:

```text
ae5e8add7884b0531d66bbca4570d1de491ff6da51e4ebe7eb160cdf241d9e42
```

Nguồn: [Cloudflare GitHub release 2026.10.4](https://github.com/cloudflare/cloudflared/releases/tag/2026.10.4), digest asset và bảng SHA-256 của release. Script pin cả version/hash, tải HTTPS có deadline, kiểm checksum trước chmod/đổi tên. Hỗ trợ asset ARM64 với hash riêng; lượt này chỉ tải/chạy `--version` bản x64. Binary nằm tại `infra/.local/cloudflared-2026.10.4/cloudflared`; metadata `source.txt`, `SHA256SUMS` cạnh binary. Installer không login, không đổi DNS, không chạy connector.

Các lệnh dưới **người dùng tự thực hiện**, theo [hướng dẫn tunnel locally managed của Cloudflare](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/):

```bash
# Có thể chạy lại để tải/kiểm đúng bản ghim; không tự đăng nhập.
infra/local-tunnel/cai-cloudflared.sh
CF="$PWD/infra/.local/cloudflared-2026.10.4/cloudflared"

# Lệnh này mở URL: tự đăng nhập trình duyệt, chọn zone agiviet.id.vn.
"$CF" tunnel login
"$CF" tunnel create agiviet-laptop

# Lấy UUID được in bởi tunnel create, thay giá trị dưới.
TUNNEL_UUID='THAY-BANG-UUID-THAT'
infra/local-tunnel/tao-config-tunnel.sh "$TUNNEL_UUID"

# Tạo DNS cho cả apex và www; không chạy nếu chưa xác định bản ghi đang tồn tại.
"$CF" tunnel route dns agiviet-laptop agiviet.id.vn
"$CF" tunnel route dns agiviet-laptop www.agiviet.id.vn

# Chỉ kiểm config/rule, chưa chạy connector.
"$CF" tunnel --config "$AGV_LOCAL_STATE/cloudflared.yml" ingress validate
"$CF" tunnel --config "$AGV_LOCAL_STATE/cloudflared.yml" ingress rule https://agiviet.id.vn/ban/
"$CF" tunnel --config "$AGV_LOCAL_STATE/cloudflared.yml" ingress rule https://www.agiviet.id.vn/mua/
"$CF" tunnel --config "$AGV_LOCAL_STATE/cloudflared.yml" ingress rule https://khong-khop.example/

# Chạy foreground ở terminal riêng, sau khi stack local đã sẵn sàng.
"$CF" tunnel --config "$AGV_LOCAL_STATE/cloudflared.yml" run agiviet-laptop
```

`tao-config-tunnel.sh` đọc mẫu **`infra/local-tunnel/config.yml`**, kiểm UUID khớp credential JSON, tạo **file mới 0600 ngoài repo**, không ghi đè cấu hình cũ. Mặc định tìm credential ở `~/.cloudflared/<UUID>.json`; nếu login/create dùng thư mục khác, chỉ định `AGV_CLOUDFLARED_DIR=/duong/dan/ngoai/repo`. Mẫu ingress chỉ apex/www → `http://127.0.0.1:18888`; catch-all **`http_status:404`**. Không mở operator. Không tắt TLS verification, không dùng Quick Tunnel hoặc hostname ngẫu nhiên thay tên miền đã giao.

Sau khi connector chạy, tự thử trên điện thoại qua mạng di động: không pilot → 401; pilot đúng `/ban/`, `/mua/` → 200; OTP hai vai; `/v1/test/clock` và `/v1/sim/bank/state` → 404; hostname không khớp → rule 404. Cookie Secure cần HTTPS thật. Kiểm chứng localhost không chứng minh DNS/TLS/Cloudflare account, propagation, kết nối ISP hoặc trải nghiệm trình duyệt ngoài mạng. **Chưa login, tạo tunnel, route DNS hay chạy tunnel trong lượt này.**

## 6. Sao lưu có giới hạn

```bash
infra/local-tunnel/sao-luu.sh
# Ví dụ giữ 5 bản, tối đa 1 GiB kho backup và chừa ít nhất 512 MiB đĩa:
KEEP_BACKUPS=5 MAX_BACKUP_BYTES=1073741824 MIN_FREE_BYTES=536870912 \
  infra/local-tunnel/sao-luu.sh
```

Tái dùng **cách** của `infra/oracle/sao-luu.sh`, không gọi Docker wrapper đó: dừng backend/AI sạch, `pg_dump -Fc`, `pg_restore --list`, `pg_dumpall --roles-only --no-role-passwords`, chụp artifacts và AI audit, manifest SHA-256, archive mới rồi mới rotation. Restart đúng writer đã chạy, giữ env trong RAM, kiểm backend ready. Trong khoảng backup Caddy có thể trả 502; chọn lúc không trình diễn.

Kho `$AGV_LOCAL_STATE/backups` 0700, archive 0600. Dump/tar có giới hạn file size, tổng budget, disk reserve và deadline 180 giây; thiếu chỗ thì fail và giữ bản cũ. Chỉ xóa tên archive do script tạo khi đã có bản mới; không xóa PGDATA, artifacts, khóa hoặc file khác. Budget tính cả stage và archive, nên có thể cần gần hai lần kích thước bản mới. `KEEP_BACKUPS` không bảo đảm tạo bản mới khi budget đã hết: giảm dữ liệu/tăng budget hoặc chuyển bản cũ đã kiểm sang ổ khác trước. Không có lịch backup tự bật.

**Backup cục bộ chưa mã hóa, không phải bản ngoài máy**. Giữ riêng `local.env`, credential Cloudflare và các khóa; dùng thiết bị/kho mã hóa khác nếu cần chống mất laptop. Không tar raw PGDATA đang chạy. Log chỉ xoay khi start nếu >10 MiB, không áp quota filesystem cho DB/artifacts/audit/log đang chạy; operator vẫn phải theo dõi dung lượng. Trần backup không bảo đảm toàn ổ không đầy do dữ liệu ứng dụng khác.

Khôi phục: dừng writer, xác minh `.tar.sha256`, giải archive vào thư mục riêng, kiểm `manifest.json`, chuẩn bị role bằng `roles.sql` trên cluster đích mới, restore custom dump vào **database mới** bằng `pg_restore --single-transaction --exit-on-error`, đối chiếu dữ liệu rồi phục hồi artifacts/audit và khóa đã giữ riêng. Roles không có password; cần provision lại gateway từ khóa đúng trước mở ingress. Không tự ghi đè DB đang dùng. Lượt kiểm đã restore SQL vào DB phụ và so migration/users/principals, cùng tệp artifact; chưa diễn tập mất máy/khôi phục role+secret hoàn chỉnh.

## 7. Kiểm chứng đã chạy và bằng chứng

Vì sandbox của phiên làm việc chỉ cho ghi repo và `/tmp`, đã dùng **STATE riêng ngoài repo tại `/tmp/agiviet-local-tunnel-verification` và `/tmp/agiviet-local-noai`**. Chúng giữ qua stop/start trong phiên nhưng là tmpfs, **không xác nhận độ bền qua reboot**. Đường dẫn mặc định HOME là cấu hình giao cho người dùng chạy ngoài sandbox; không âm thầm đặt PGDATA vào checkout.

```bash
# Có đăng nhập hai tài khoản ảo và backup; tự stop ở cuối.
AGV_LOCAL_STATE=/tmp/agiviet-local-tunnel-verification \
  infra/local-tunnel/kiem-chung.sh

# Cần STATE kiểm riêng mới, ENABLE_AI=0; tạo/restore DB phụ và 3 backup.
AGV_LOCAL_STATE=/tmp/agiviet-local-noai \
  infra/local-tunnel/tests/kiem-van-hanh.sh
```

Kết quả thật:

- Init PG17 bằng SCRAM, migrate **55/55**, seed **50 users**, provision chuẩn/guard đạt. Backend dùng gateway; `/proc` xác nhận không có owner password/test-owner URL. Restart giữ khóa/checksum `local.env` và số bản ghi, không seed lại.
- Caddy + pilot + frontend/backend thật: `/ban/`, `/mua/`, `/health`, `/health/ready` 200 sau khóa, chưa khóa 401. OTP send/verify/session cả hai vai 200. Bearer không cookie 401; cookie giả 401, Origin ngoài 403, header scope giả không mở công cụ.
- External `/v1/test*`, `/v1/sim*` kể cả biến thể prefix/encoded path 404. Operator test accounts/clock/bank state: trước khóa 401, sau khóa 200. Host `agiviet.id.vn` qua Caddy đạt và có cookie Secure host-only; **đây là HTTP với Host giả lập, chưa phải HTTPS/tunnel thật**.
- AI luật Python hiện có chạy thật: không key 401, đúng key health 200, audit ghi ngoài repo; không gọi model/STT. `ENABLE_AI=0` chạy không có AI process.
- Listener PostgreSQL/backend/frontend/bridge/AI/Caddy đều **127.0.0.1**. Body đúng trần 12 MiB tới backend, hơn 1 byte Content-Length/chunked 413; auth vượt ngân sách 429 + Retry-After dù đổi XFF.
- Backup thật kiểm list dump, tạo ba bản/giữ hai; budget thấp từ chối, không xóa bản cũ, backend vẫn ready. Restore DB phụ cùng artifact đạt, migrations/users/principals **55/50/0** của fixture chưa đăng nhập. Không có nghiệp vụ tiền trong fixture đó, không suy ra bất biến ledger từ phép đếm.
- `dung.sh` dừng sạch, mọi cổng stack đóng; quét `/proc` không còn process token của stack. Không kill dịch vụ sẵn có của người dùng. Bash syntax, ShellCheck 0.11.0, Python compile và Node syntax đạt; Caddy custom validate đạt.
- Cloudflared tải chính thức, SHA-256 đúng; chỉ chạy `--version`. Config helper được kiểm với credential giả ngoài repo, không dùng tài khoản Cloudflare thật.

Log không chứa token/mật khẩu ở `infra/.local/local-tunnel-check/` (đã ignore): `http-smoke.log`, `operations.log`, `static-checks.log`, `source-integrity.txt`, `cloudflared-source.txt`. Nguồn các thư mục bị cấm và Oracle được đối chiếu SHA-256 trước/sau. Xem thêm [05 — đánh giá thành thật](05-danh-gia-thanh-that.md).

## 8. Kết thúc buổi và chuyển Oracle

1. Ctrl-C trong terminal đang chạy cloudflared; connector là tiến trình người dùng tự chạy nên script local không tự kill nó.
2. Chạy backup nếu cần, rồi stop/status:

```bash
infra/local-tunnel/sao-luu.sh
infra/local-tunnel/dung.sh
infra/local-tunnel/trang-thai.sh
```

Giữ nguyên STATE, không xóa `pg/` hay sinh lại `local.env`. Bộ kiểm của lượt này đã dừng mọi process do nó bật.

Khi có VM Singapore: dùng nguyên quy trình [06 — Oracle](06-trien-khai-oracle-free.md), giữ `infra/oracle/` làm đích deploy. Bộ local không tự đổi DNS hoặc chuyển dữ liệu sang production. Dữ liệu/OTP pilot không được đưa nguyên vào môi trường thật; chuyển dump/artifacts/khóa chỉ sau khi xác định môi trường đích, cấp role runtime và nghiệm thu riêng. Không lấy kết quả x64 localhost làm chứng nhận Docker/ARM64/ACME hoặc vận hành Oracle.
