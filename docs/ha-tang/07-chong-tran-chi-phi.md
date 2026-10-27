# 07 · Chống tràn tài nguyên và chi phí

Cập nhật 26/10/2026 cho **agiviet.id.vn**: khởi đầu một VM A1 **1 OCPU/6 GB**, có thể resize lên 2 OCPU/12 GB trên cùng VM khi có capacity. Người dùng sở hữu tên miền và tự trỏ DNS theo [06, mục 5](06-trien-khai-oracle-free.md#5-tên-miền-https-và-cấu-hình-bí-mật). Các ngưỡng dưới đây là cấu hình vận hành, chưa phải số đo sức chứa trên OCI. Chưa tạo quota, budget hay tài nguyên cloud từ phiên này.

## 1. Vì sao tài khoản Free không tự bị thu tiền

Oracle ghi rõ thẻ không bị thu phí sử dụng nếu người dùng chưa nâng cấp tài khoản trả phí. Trial có credit và thời hạn; Always Free có hạn mức riêng. Khi hết trial, tài nguyên trả phí có thể bị thu hồi nếu không nâng cấp. Khoản xác minh thẻ và phí gia hạn tên miền ở nhà đăng ký là việc riêng. Xem [Free Tier](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm), [FAQ](https://www.oracle.com/cloud/free/faq/).

Sau khi nâng **Pay As You Go (PAYG)**, phần vượt ưu đãi có thể bị tính tiền. Tại thời điểm đối chiếu, A1 Free là 1.500 OCPU-giờ/9.000 GB-giờ tháng; boot + block tổng 200 GB ở home region; outbound miễn 10 TB/tháng. Phải cộng tài nguyên toàn tenancy, không tính riêng máy AgiViet. Chọn nhãn **Always Free-eligible**, kiểm estimated cost và điều kiện của chính tài khoản; không tự chọn 24 GB chỉ vì tài liệu cũ nói 4 OCPU. [Hạn mức Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

## 2. Các đường có thể phát sinh phí khi đã PAYG

| Thao tác / tài nguyên | Cách tránh |
|---|---|
| Nâng PAYG để vượt lỗi thiếu capacity; mở thêm VM, tăng OCPU/RAM, chọn image/shape không miễn phí | Giữ Free nếu mục tiêu là không có hóa đơn. PAYG cần quota và kiểm Billing trước khi tạo/resize |
| Tạo ngoài home region; thêm Load Balancer, database quản lý, GPU hoặc dịch vụ Marketplace trả phí | Dùng đúng stack trên một VM; chỉ cấp IAM tạo dịch vụ cần thiết |
| Boot/block volume bị bỏ lại khi terminate VM, clone/restore tạo volume thứ hai; nâng hiệu năng lưu trữ | Storage → kiểm cả Boot Volumes, Block Volumes và backup ở mọi region/compartment. VM dừng không giải phóng dung lượng cấp phát; phải kiểm nhãn/cost, không chỉ số GB đang chứa file |
| Outbound vượt 10 TB/tháng do tải ảnh/PDF, bot hoặc backup liên vùng/ra ngoài | Theo dõi usage tổng; xử lý trước 8 TB. Rate limit API không phải trần byte tải xuống và không tự giới hạn outbound toàn tenancy |
| Object Storage vượt dung lượng/request miễn phí; versioning giữ bản cũ, replication, thao tác Archive/IA | Bucket private Standard, prefix riêng, tắt versioning cho script hiện tại; kiểm phiên bản cũ và multipart chưa hoàn tất. Dự trù phí API/retrieval/retention theo tier, không chỉ kích thước bản mới nhất |
| Logging/Monitoring/SMS/AI hoặc dịch vụ ngoài OCI được bật thêm | Đặt hạn mức riêng ở nhà cung cấp. OTP hiện là mô phỏng; giới hạn proxy không bảo đảm hóa đơn SMS bằng 0 khi tích hợp thật |

Oracle phân bổ Object Storage khác nhau giữa Free-only và PAYG/trial: Free-only có 20 GB gộp các tier; PAYG/trial có 10 GB mỗi tier, cùng hạn mức request được nêu trong [Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). Stack dùng `MAX_REMOTE_BYTES=8589934592` (8 GiB) cho **prefix backup** để chừa chỗ; không phải quota cả bucket/tenancy, không bao gồm prefix khác, phiên bản cũ hoặc phí API. Script backup vẫn quản lý retention do người vận hành cấu hình; script canh tài nguyên tuyệt đối không xóa backup.

## 3. Đặt quota cứng nếu đã PAYG

Quota chặn yêu cầu tài nguyên vượt số lượng/dung lượng được hỗ trợ. Nó không phải trần tiền chung, không dừng tài nguyên đang tính phí, và không hồi tố sửa tài nguyên đã tồn tại. Budget cũng không khóa chi tiêu. Dùng compartment riêng `agiviet-pilot`, tài khoản vận hành chỉ có quyền trong compartment đó; quản trị giữ quyền thay quota, tạo ngoài compartment và nâng tài khoản.

1. Console → tìm **Quota Policies** (thường trong Governance & Administration → Limits, Quotas and Usage / Quota Policies) → **Create quota** bằng quản trị.
2. Tên `agiviet-free-guard`, chọn đúng compartment quản lý policy. Dán mẫu dưới, thay `TENANCY:AP-SINGAPORE-1-AD-1` bằng **tên AD đầy đủ của VM** trong Compute → Instance details → Availability domain. Nếu home region khác, thay `ap-singapore-1` đồng bộ. Đây là mẫu cho compartment AgiViet, không dán chính sách `zero ... in tenancy` lên tài khoản đang có ứng dụng khác.
3. Create, đọc lại từng statement; hiệu lực có thể mất tới 10 phút. Kiểm lại Limits/Quotas của từng service, region và AD; không tạo VM trả phí để thử quota. [Thao tác Console](https://docs.oracle.com/en-us/iaas/Content/Quotas/Tasks/create-quota.htm).

```text
zero compute-core quotas in compartment agiviet-pilot
zero compute-memory quotas in compartment agiviet-pilot
zero compute quotas in compartment agiviet-pilot
set compute-core quota standard-a1-core-count to 1 in compartment agiviet-pilot where request.ad = 'TENANCY:AP-SINGAPORE-1-AD-1'
set compute-memory quota standard-a1-memory-count to 6 in compartment agiviet-pilot where request.ad = 'TENANCY:AP-SINGAPORE-1-AD-1'
zero block-storage quotas in compartment agiviet-pilot
set block-storage quota total-storage-gb to 100 in compartment agiviet-pilot where request.ad = 'TENANCY:AP-SINGAPORE-1-AD-1'
set block-storage quota backup-count to 5 in compartment agiviet-pilot where request.region = 'ap-singapore-1'
zero object-storage quotas in compartment agiviet-pilot
set object-storage quota storage-bytes to 8589934592 in compartment agiviet-pilot where request.region = 'ap-singapore-1'
```

Mẫu khóa ở **1 OCPU/6 GB**, tối đa 100 GB boot+block (đúng VM dự kiến trong 06), 5 volume backup và 8 GiB Object Storage. Khi resize máy hiện có lên 2 OCPU/12 GB, sửa hai dòng `set compute-core ... to 2` và `set compute-memory ... to 12` trước khi resize, sau khi kiểm tài nguyên **toàn tenancy** và ưu đãi. Không tăng quota storage cho thao tác chỉ tăng CPU/RAM. Dòng `zero compute quotas` khóa nhóm shape cũ; A1 dùng hai family core/memory riêng. Các dịch vụ chưa nêu vẫn cần IAM/quota riêng, không được xem mẫu là khóa mọi SKU có thể thu phí. [Tên quota Compute](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm), [Block Volume](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Block_Volume_Quotas.htm), [Object Storage](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Object_Storage_Quotas.htm).

Trong **cùng policy**, đặt `zero` trước rồi `set` ngoại lệ sau; policy khác có giới hạn chặt hơn vẫn thắng. Quota theo AD được cấp riêng cho từng AD; điều kiện tên AD đầy đủ (đã gồm region) cho Compute/volume và region cho Object Storage/backup tránh nhân hạn mức ở vùng khác. Compartment khác vẫn có thể tiêu tiền nếu người dùng có quyền tạo ở đó. [Cú pháp và phạm vi quota](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/quota_policy_syntax.htm).

Không có cấu hình quota trong bộ này khóa chi tiêu outbound/SMS/AI theo số tiền. Muốn bảo đảm không bị thu phí OCI thì duy trì tài khoản chưa nâng PAYG. Với PAYG, cần theo dõi usage, hạn quyền và ngừng nguồn tạo phí khi có cảnh báo; không dựa riêng vào Budget.

## 4. Budget alert nếu đã PAYG

1. Console → **Billing & Cost Management → Budgets → Create Budget**. Scope **Compartment**, target **root compartment** để bao gồm tài nguyên bỏ sót ở các compartment con.
2. Schedule **Monthly**, bắt đầu ngày 1, amount **1 USD** nếu tài khoản dùng USD (hoặc mức nhỏ hợp lệ theo đơn vị tiền của tài khoản; minimum là 1). Nếu đã có budget thì thêm alert rule vào đó. [Tạo Budget](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/create-budget.htm).
3. Thêm rule **Actual spend**, threshold **1%** và **100%**; thêm **Forecast spend 100%**. Nhập email người vận hành, lưu và kiểm lại địa chỉ/rules.
4. Kiểm Last evaluated và email nhận cảnh báo. Budget được đánh giá định kỳ khoảng 24 giờ, có thể trễ so với chi phí đang phát sinh; **không tự cắt dịch vụ hoặc khóa thẻ**. [Cách Budget hoạt động](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm).

## 5. Hàng rào kỹ thuật trên VM

### Proxy và upload

`caddy.Dockerfile` build Caddy **2.10.2** bằng xcaddy với `github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db`. Đây là plugin cộng đồng, **không có trong image Caddy chuẩn**. Không thay image custom bằng stock khi chạy Caddyfile này. `trien-khai.sh` build lần lượt, validate rồi mới mở ingress; kiểm module qua `dc run --rm --no-deps https caddy list-modules`. Xem [plugin và cú pháp](https://github.com/mholt/caddy-ratelimit).

| Phạm vi | Cửa sổ trượt |
|---|---|
| `/v1/auth*`, mỗi IP | 10 lượt/phút **và** 60 lượt/giờ |
| `/v1/auth*`, toàn site | 120 lượt/phút |
| `/v1` và `/v1/*`, mỗi IP | 120 lượt/phút (bao gồm auth) |
| `/v1` và `/v1/*`, toàn site | 1.200 lượt/phút |

Vượt giới hạn trả **429 + Retry-After**. IPv4 theo IP, IPv6 gộp `/64`; khóa là địa chỉ TCP `{remote_host}`, không tin `X-Forwarded-For` client gửi. Caddy phải nhận trực tiếp từ Internet như thiết kế; nếu thêm CDN/LB, cần thiết kế lại trust/IP trước khi dùng. Nhiều người chung NAT chia cùng hạn mức; webhook ngân hàng cũng nằm trong `/v1/*`, nhà cung cấp phải retry có backoff. Đếm trong RAM của một Caddy, qua reload giữ trạng thái theo plugin, restart thì mất; không coi đây là chống DDoS hay trần SMS bền vững. Backend còn hạn mức OTP theo số điện thoại và lockout; chưa cấu hình nhà cung cấp SMS thật.

Body tối đa ở proxy: **12.582.912 byte = 12 MiB**, đúng `bodyLimit` trong `backend/src/app.ts`; Content-Length lớn và body stream vượt hạn trả 413. Bằng chứng ảnh/PDF tải lên hiện là **JSON base64**, backend kiểm file giải mã tối đa **8 MiB** tại `backend/src/nghiep-vu/tai-lieu.ts`; base64 8 MiB khoảng 10,67 MiB nên vừa trong 12 MiB. Caddy không giải mã JSON để kiểm file 8 MiB: kiểm này thuộc backend. Endpoint `/v1/verify/:code/file` cũng chịu body 12 MiB; chưa có multipart upload khác trong stack. Không đặt proxy 8 MiB làm hỏng file base64 hợp lệ. [Giới hạn body của Caddy](https://caddyserver.com/docs/caddyfile/directives/request_body).

### CPU, RAM và restart

| Container | CPU tối đa 6 / 12 GB | RAM tối đa 6 / 12 GB |
|---|---:|---:|
| db | 0,30 / 0,65 | 1536 / 3072 MiB |
| backend | 0,25 / 0,55 | 768 / 1024 MiB |
| frontend | 0,08 / 0,15 | 192 / 256 MiB |
| ai (có thể tắt) | 0,12 / 0,25 | 512 / 768 MiB |
| https | 0,08 / 0,15 | 192 / 256 MiB |
| migrate (tạm thời) | 0,17 / 0,25 | 256 / 512 MiB |
| **Tổng kể cả migrate** | **1,00 / 2,00** | **3,375 / 5,75 GiB** |

Thường trực **0,83 CPU / 3,125 GiB** ở máy 6 GB; **1,75 CPU / 5,25 GiB** ở máy 12 GB, chừa RAM cho OS/page cache/build/backup. Profile 6 GB: pool backend 4 (wrapper chặn >4), PG max_connections 32, shared_buffers 384 MiB/work_mem 2 MiB/maintenance 64 MiB, Node heap 448 MiB. Installer `sudo OCI_SIZE=6 bash infra/oracle/cai-dat-may.sh` tạo swap host 2 GiB, 12/24 GB tạo 4 GiB, swappiness 10; giữ swap hợp lệ có sẵn. Container **không dùng thêm swap** vì `memswap_limit=mem_limit`. Đây là **trần**, không phải CPU được đảm bảo hay benchmark A1. Override 24 GB chỉ tăng RAM DB, không tăng CPU.

Để tắt AI, đặt **`ENABLE_AI=0`** trong env ngoài repo và deploy lại qua wrapper sau khi đã cấu hình backup. AI cũ được dừng, không build/start lại, `AI_URL` backend rỗng nên đi thẳng luật dự phòng đã có. Máy 6 GB khi ấy thường trực **0,71 CPU / 2,625 GiB**; audit AI vẫn giữ và sao lưu, không xóa volume. Không cài Ollama/Whisper/Piper/model nặng trong hồ sơ này. Xem cách bật lại và resize cùng VM tại [06](06-trien-khai-oracle-free.md).

PID 256/container (migrate 128), Docker log 10 MiB × 3/container. Dịch vụ thường trực `unless-stopped`: tự lên sau daemon reboot, giữ trạng thái khi operator chủ động stop; Docker tăng khoảng nghỉ khi crash. Job migrate `restart: no`, thất bại phải xử lý nguyên nhân. Không lặp deploy/restart để chữa OOM. Healthcheck chỉ đánh dấu unhealthy, không tự restart container còn chạy; xem log, xử lý nguyên nhân và khởi động lại có chủ đích.

Giới hạn Compose không áp cho Docker daemon/BuildKit/backup hay tiến trình host. Deploy build từng image để giảm đỉnh đồng thời; nên build trước trên máy ARM khác khi production đã có tải. Chưa đo đỉnh build trên A1; không diễn giải tổng container thành trần toàn host. Timer kiểm dùng CPUQuota 10%/MemoryMax 256 MiB cho tiến trình kiểm; lệnh Docker prune chạy ở daemon nên cgroup của timer không khống chế daemon.

### Timer kiểm tài nguyên và dọn phần an toàn

Installer đăng ký hai unit trong `infra/oracle/systemd/`, **chưa tự bật** trước khi có env/stack. Sau triển khai, bằng quản trị:

```sh
cd /opt/agiviet
# Kiểm một lần, chỉ đọc; exit 1=có cảnh báo, 2=lỗi kiểm/thiếu dữ liệu.
sudo bash infra/oracle/canh-tai-nguyen.sh --check
sudo systemctl enable --now agiviet-resources.timer
sudo systemctl list-timers agiviet-resources.timer --no-pager
sudo journalctl -u agiviet-resources.service -n 60 --no-pager
```

Timer chạy sau boot 5 phút, rồi mỗi 15 phút (jitter tối đa 60 giây), `Type=oneshot`, timeout 10 phút, không vòng lặp chờ và không chạy chồng với chính nó. Dùng chung operation lock với deploy/backup/restore; nếu khóa bận thì lượt kiểm báo lỗi và timer chạy lại kỳ sau. Unit chạy root để đọc host mountpoint của Docker; dùng đúng `/etc/agiviet/oracle.env` ngoài repo. Nếu nâng từ installer cũ, cài unit trước khi bật timer, không cần chạy lại cả installer:

```sh
sudo install -m 0644 infra/oracle/systemd/agiviet-resources.service infra/oracle/systemd/agiviet-resources.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

| Mục kiểm | Ngưỡng mặc định trong env |
|---|---|
| Disk và inode ở `/`, state, Docker root và từng volume | 80% |
| RAM host, theo `MemAvailable` | 85% |
| Volume PostgreSQL, gồm dữ liệu/WAL | 20 GiB |
| Volume backend (uploads + PDF/tài liệu) | 10 GiB |
| Volume AI audit (kể cả AI tắt, nếu volume đã có) | 1 GiB |
| Tổng Docker images + build cache | 5 GiB |
| `STATE_DIR/tmp` riêng | 1 GiB |

Khi một ngưỡng vượt, timer ghi **WARNING** vào journal, rồi chỉ thử `docker image prune --filter until=168h` (dangling, **không `-a`**), `docker builder prune --filter until=168h --keep-storage 2GB` (dangling cache cũ) và file `*.tmp`/`*.part` trên 48 giờ trong `STATE_DIR/tmp` thật, không theo symlink/qua filesystem khác. Các lệnh có timeout. Image gắn tag rollback được giữ; cache bị dọn có thể phải build lại. Dọn áp dụng cho daemon trên **VM riêng AgiViet**, không chạy khi có build từ công cụ khác không dùng operation lock.

**Không dùng** `docker system prune`, `volume prune`, `container prune`, `down -v`, xóa PGDATA/WAL/uploads/audit/backup, hoặc tự VACUUM FULL. Không xóa backup kể cả ổ gần đầy. Kiểm sau dọn vẫn giữ exit 1 để người vận hành xem; service đỏ trong systemd khi có cảnh báo là có chủ đích. Chưa cấu hình gửi email/điện thoại từ journal. Không tạo file tạm với tên khác rồi kỳ vọng timer tự xóa.

Nếu DB/uploads vượt ngưỡng hoặc đĩa vẫn cao: xem `journalctl`, `docker stats --no-stream`, `docker system df`; kiểm backup ngoài máy, tìm nguyên nhân tăng WAL/file, tạm dừng nhận upload nếu cần. Chỉ thay retention/xóa dữ liệu nghiệp vụ khi có quyết định rõ của người vận hành; giữ tổng volume trong ngân sách Console. Ngưỡng là cảnh báo, không phải filesystem quota cứng; ổ vẫn có thể đầy giữa hai lượt kiểm.

## 6. Checklist mỗi tháng trên Console (5–10 phút)

1. **Billing & Cost Management → Cost Analysis**: khoảng thời gian tháng này, tất cả compartment/region, group theo Service/SKU. Kiểm charge thực tế và forecast; nếu có phí lạ, mở chi tiết tài nguyên trước khi tiếp tục tạo mới.
2. **Compute → Instances**: chọn từng region đã subscribe và compartment; chỉ giữ máy đã định dùng, A1 **1 OCPU/6 GB** (hoặc máy đã resize **2 OCPU/12 GB**), image miễn phí và env khớp máy. Kiểm trạng thái tài khoản Free/PAYG; không bấm Upgrade để giải quyết capacity.
3. **Storage → Boot Volumes / Block Volumes / Backups**: duyệt mọi compartment/region, ghi tổng GB **cấp phát**, volume không gắn VM và số backup. Xác định bản đang dùng/đã sao lưu trước khi tự tay xóa tài nguyên dư; tổng boot+block miễn phí là ngân sách chung của tenancy.
4. **Object Storage → Buckets**: kiểm tổng size, versions/delete markers, multipart và lifecycle/replication; prefix backup dưới 8 GiB, kiểm còn chỗ cho bản backup kế tiếp và thử tải/giải mã một bản. Kiểm usage request/outbound trong báo cáo Usage/Cost theo service; xử lý khi gần 8 TB, trước mốc miễn phí 10 TB.
5. **Quota Policies / Limits, Quotas and Usage**: mở `agiviet-free-guard`, đúng region/AD/compartment; không có policy/IAM mới mở đường tạo tài nguyên ngoài phạm vi.
6. Nếu PAYG: **Budgets** → target root, rules/email và Last evaluated còn đúng. Xem email cảnh báo. Trên VM chạy `systemctl list-timers`, xem journal resource/backup; kiểm hạn gia hạn **agiviet.id.vn** tại nhà đăng ký và HTTPS còn hợp lệ.

Kết quả kiểm cục bộ và những phần chưa chạy thực tế được ghi ở [05](05-danh-gia-thanh-that.md) và [biên bản infra](../../infra/oracle/kiem-chung.md).
