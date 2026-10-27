# 06 · Triển khai AgiViet v2 trên Oracle Cloud Always Free

Cập nhật 26/10/2026. **Chưa triển khai cloud.** Người dùng tự đăng ký tài khoản, tạo mạng/VM và giữ khóa SSH. Hạ tầng dùng mã thật ở `backend/`, `frontend/`, `ai/`, PostgreSQL 17 và Caddy; bộ đo `infra/docker-compose.yml`/`infra/stub/` vẫn là môi trường riêng. Không ghép hai stack.

**Trạng thái kế thừa:** DB đã có migrations 0054–0055; [backend](../../backend/TIEN-DO.md) ghi PostgreSQL 17 thật qua `agv_backend_gateway` đạt **56/56 tình huống, 410/410 bước**. Mục 17 đã giải quyết. Phiên hạ tầng này không chạy lại bộ nghiệp vụ; tiếp tục cấu hình tên miền và hàng rào tài nguyên/chi phí. Provision dùng `db/scripts/cap-quyen-cong.sql` chuẩn, không còn lọc bản SQL backend cũ. Guard vẫn chặn DB cũ/chưa đăng ký gateway tin cậy trước bật ingress.

## 1. Hạn mức và vùng

Đối chiếu [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) ngày 26/10: tài khoản Always Free hiện được 1.500 OCPU-giờ + 9.000 GB-giờ A1 mỗi tháng, tương đương 2 OCPU/12 GB chạy liên tục; tổng boot/block volume 200 GB. Phân bổ Object Storage tùy loại tài khoản. Chọn tài nguyên có nhãn miễn phí trong **home region**, đọc Limits/Quotas và Billing của chính tenancy trước Create; không coi credit trial là miễn phí lâu dài.

**Tạo A1 1 OCPU/6 GB trước** khi Singapore thiếu capacity; dùng `OCI_SIZE=6` trong env. Yêu cầu nhỏ hơn có thể dễ có slot hơn, nhưng không bảo đảm capacity. Compose giữ mặc định **12 GB** để tương thích cấu hình đang có; chọn `OCI_SIZE=12` khi VM thật đã đạt 2 OCPU/12 GB. Có thể resize cùng VM sau, không tạo lại (mục 3a). Override 24 GB chỉ bật khi Console và điều kiện tài khoản xác nhận được miễn: `OCI_SIZE=24`, `OCI_24GB_CONFIRMED=1`. [Bảng giá OCI](https://www.oracle.com/cloud/price-list/) phân biệt ưu đãi paid tenancy; không mặc định tài khoản mới được 4 OCPU/24 GB và không cần nâng PAYG để làm hướng dẫn này. Budget alert chỉ báo động, không khóa chi tiêu.

## 2. Tạo tài khoản và chọn đúng vùng

1. Vào [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/), đăng ký bằng email, thông tin thật và số điện thoại. Chuẩn bị thẻ tín dụng hoặc thẻ ghi nợ có chức năng thanh toán như thẻ tín dụng. Oracle có thể giữ khoản xác minh tạm thời; thẻ ảo/trả trước hoặc debit chỉ có PIN có thể không được nhận. Xem [FAQ chính thức](https://www.oracle.com/cloud/free/faq/).
2. Tại **Home region**, chọn **Singapore (Singapore), `ap-singapore-1`**. Đọc lại trước khi xác nhận: [home region không đổi được](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingregions.htm). Singapore West (`ap-singapore-2`) là vùng khác; không chọn nhầm. Nếu Singapore không được cung cấp khi đăng ký, dừng để cân nhắc phương án A; không tạo tài khoản với vùng khác rồi trông chờ chuyển home region.
3. Bật MFA cho tài khoản quản trị, lưu mã khôi phục ngoài máy chủ. Không chụp màn hình chứa thẻ/khóa vào repo.
4. Vào Billing xem trạng thái free/trial và ngày hết trial. Nếu đã là PAYG, đặt budget alert, kiểm Usage định kỳ; budget alert **không phải khóa chặn chi tiêu**. Đừng tạo tài nguyên có phí bằng credit rồi quên xóa khi hết trial.

## 3. Tạo mạng và máy ảo

Trong Console, kiểm vùng góc trên đang là Singapore. Tạo compartment `agiviet-pilot` để gom tài nguyên.

1. **Networking → Virtual Cloud Networks → Start VCN Wizard → VCN with Internet Connectivity**. Ví dụ VCN `10.20.0.0/16`, public subnet `10.20.1.0/24`. Kiểm có Internet Gateway và route `0.0.0.0/0` qua gateway. Với một máy thử, không cần NAT Gateway hay load balancer riêng.
2. Vào public subnet → **Security Lists → Ingress Rules**, thêm rule **stateful**, TCP, source port All:

   | Nguồn IPv4 | Cổng đích | Mục đích |
   |---|---:|---|
   | IP mạng nhà/quản trị của bạn, dạng `x.x.x.x/32` | 22 | SSH bằng khóa |
   | `0.0.0.0/0` | 80 | Chuyển HTTP sang HTTPS, xác minh ACME |
   | `0.0.0.0/0` | 443 | HTTPS |

   Nếu rule 22 mặc định cho toàn Internet đang có, thay bằng IP của bạn sau khi kiểm phiên SSH thứ hai. Nếu dùng NSG, rà cả các rule gắn VNIC. Giữ egress cần thiết cho DNS, NTP, HTTPS, cập nhật gói và backup; ví dụ VCN wizard thường cho egress toàn bộ. Không mở 5432/55432, 8080/8088, 8090, 9090, 9093, 9187, 2019 ra Internet.
3. **Compute → Instances → Create Instance**: tên `agiviet-oracle`, image **Ubuntu 24.04 ARM64**, shape **VM.Standard.A1.Flex**, bắt đầu **1 OCPU, 6 GB RAM**. Khi có capacity có thể chọn/tăng lên **2 OCPU, 12 GB RAM** trong hạn mức toàn tenancy. Chỉ đặt **4 OCPU, 24 GB RAM** nếu tenancy đã xác nhận được miễn mức đó. Không chọn x86 rồi chạy giả lập ARM.
4. Chọn public subnet vừa tạo, gán public IPv4. Boot volume gợi ý **100 GB**, loại/hiệu năng có nhãn được miễn; cộng tất cả boot/block volume còn tồn tại trong tenancy. Đừng bật performance/backup policy có phí mà chưa kiểm giá. Khi xóa VM, volume có thể vẫn còn và tiếp tục chiếm quota.
5. **Add SSH keys**: tốt nhất tạo khóa trên máy cá nhân:

   ```sh
   ssh-keygen -t ed25519 -f ~/.ssh/agiviet_oci -C agiviet-oci
   ```

   Đặt passphrase. Dán nội dung file `~/.ssh/agiviet_oci.pub` vào Console. File không có `.pub` là khóa riêng, không gửi cho ai hoặc đưa lên Git. Nếu Console tạo khóa, tải khóa riêng về ngay và `chmod 600`.
6. Bấm Create khi đã đọc nhãn miễn phí. Ghi lại public IPv4, image, shape và thông tin quota ngoài repo. Nếu **2 OCPU/12 GB** báo **out of host capacity**, giảm yêu cầu về **1 OCPU/6 GB**; nếu vẫn thiếu thì thử availability domain khác nếu vùng có nhiều AD, hoặc thử lại thủ công sau; có thể mất nhiều ngày. Không viết vòng lặp săn máy/API. Không đổi sang shape trả phí để bỏ qua lỗi. [Oracle giải thích lỗi capacity](https://www.oracle.com/cloud/free/faq/).

## 3a. Sau này tăng từ 1 OCPU/6 GB lên 2 OCPU/12 GB, giữ máy và dữ liệu

A1 Flex hỗ trợ thay OCPU/RAM trên **cùng instance**, giữ IP và volume; có gián đoạn/reboot, vẫn phụ thuộc capacity, quota và hạn mức miễn phí. [Hướng dẫn resize Oracle](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/resizinginstances.htm).

1. Kiểm tổng tài nguyên toàn tenancy và quota trước; nếu dùng mẫu 1/6 ở 07, quản trị đổi hai quota A1 sang **2 core / 12 GB**, đúng AD cũ. Không tạo VM thứ hai hoặc tăng boot volume để resize CPU/RAM.
2. Trên VM, dừng lịch để tránh job xen vào; sao lưu ngoài máy thành công, giữ bản secrets mã hóa ngoài OCI. Bằng quản trị: `sudo systemctl stop agiviet-backup.timer agiviet-resources.timer`. Sau đó bằng user `agiviet`:

   ```sh
   cd /opt/agiviet
   bash infra/oracle/sao-luu.sh
   source infra/oracle/chung.sh
   dc stop https frontend backend ai
   dc stop db
   ```

   Nếu backup lỗi thì xử lý trước khi resize. Không xóa volume, không chạy `down -v`.
3. Console → **Compute → Instances → agiviet-oracle → Stop**, dùng dừng thông thường, tránh Force stop. Khi Stopped, **Edit / Edit shape** (có thể trong More actions) → giữ **VM.Standard.A1.Flex**, đặt **2 OCPU / 12 GB**, kiểm cost/Always Free → Save → Start. Nếu thiếu capacity, giữ cấu hình nhỏ; không terminate/recreate. Theo dõi trạng thái rồi thử lại thủ công sau.
4. SSH lại, kiểm `nproc`, `free -h`, `swapon --show`, IP và `docker volume ls`. Sửa `/etc/agiviet/oracle.env`: `OCI_SIZE=12`, để `AGV_PG_POOL_MAX=` trống (tự chọn 6), giữ nguyên mọi khóa và tên volume. Nếu trước tắt AI, có thể để nguyên hoặc chuyển `ENABLE_AI=1` sau khi kiểm còn RAM. Swap 2 GiB cũ vẫn dùng được; không cần chạy lại installer/ghi đè swap.
5. Bằng user `agiviet`, mở shell mới hoặc source lại `chung.sh`, chạy `dc --profile setup config --quiet`, rồi `bash infra/oracle/trien-khai.sh --local`. Kiểm health và `/ban/`, `/mua/` từ mạng ngoài theo mục 6. DNS thường giữ nguyên vì resize giữ IP; preflight vẫn kiểm lại trước Caddy. Chỉ bật lại các timer đã được nghiệm thu trước đó: `sudo systemctl start agiviet-backup.timer agiviet-resources.timer`; xem journal.

Không đổi project/volume khi tăng cấu hình: override chỉ thay trần tài nguyên và thông số PostgreSQL. Nếu resize chưa thành công, tiếp tục dùng `OCI_SIZE=6`; không nới giới hạn container trước khi máy thật có RAM/CPU mới.

## 4. SSH, cài máy và mở tường lửa trong máy

Trên máy cá nhân, thay `IP_PUBLIC` bằng IPv4 vừa nhận:

```sh
chmod 600 ~/.ssh/agiviet_oci
ssh -i ~/.ssh/agiviet_oci ubuntu@IP_PUBLIC
```

Oracle Linux dùng tài khoản mặc định `opc`. Kiểm fingerprint SSH qua Console/trình quản trị khi có thể; không dùng `StrictHostKeyChecking=no`. Khi không vào được SSH, kiểm public IP, route gateway, source `/32` hiện tại và khóa đúng user trước.

Chuyển bản mã đã kiểm duyệt lên máy, hoặc clone repo bằng deploy key chỉ đọc. Ví dụ dưới dùng URL Git của đội, **không gắn token vào URL**:

```sh
# Trên VM, bằng tài khoản ubuntu (hoặc opc):
sudo mkdir -p /opt/agiviet
sudo chown "$USER:$USER" /opt/agiviet
git clone URL_GIT_CUA_DOI /opt/agiviet
cd /opt/agiviet
# VM 1 OCPU/6 GB (VM 12 GB thì dùng OCI_SIZE=12):
sudo OCI_SIZE=6 bash infra/oracle/cai-dat-may.sh
# Chỉ chuyển checkout mã, không chown đệ quy /var/lib/docker hay PGDATA:
sudo chown -R agiviet:agiviet /opt/agiviet
```

Nếu chưa có Git trên image: Ubuntu chạy `sudo apt-get update` rồi `sudo apt-get install -y git`; Oracle Linux chạy `sudo dnf install -y git`. Nếu nhận source dạng archive, giải nén vào `/opt/agiviet` rồi dùng `trien-khai.sh --local` thay pull Git. Checkout hiện tại của phiên soạn không có `.git`; không bịa URL remote.

Installer hỗ trợ Ubuntu 22.04/24.04 và Oracle Linux 9; khuyên dùng Ubuntu 24.04. Docker CE lấy từ [kho Docker Ubuntu](https://docs.docker.com/engine/install/ubuntu/); nhánh OL9 dùng repo CentOS tương thích, **chưa kiểm thực tế và không coi là Oracle hỗ trợ Docker CE**. Installer không tự gỡ Podman/runc khi xung đột, không tắt SELinux. Bind mount OCI thêm nhãn `z` để chia sẻ đúng trên SELinux. Nếu OL9 không cài được gói phụ trợ, dùng image Ubuntu khuyến nghị thay vì đoán lệnh gỡ gói.

Script tạo user `agiviet`, copy **public authorized_keys** của user đang sudo nếu đích chưa có, thêm nhóm Docker; tạo thư mục cấu hình/runtime, swap **2 GiB với OCI_SIZE=6**, **4 GiB với 12/24** (giữ file swap hợp lệ đã có), swappiness 10, giới hạn log, bật bảo mật tự động không tự reboot. Tham số installer không tự sửa env runtime: vẫn chọn `OCI_SIZE=6` trong mục 5. Swap chỉ cứu hộ host/build; container không được dùng thêm swap. Nhóm Docker có quyền tương đương root trên host; chỉ giao tài khoản này cho người triển khai. Backend/frontend chạy user `node`, AI chạy user `agiviet` trong container. Không tự sửa chính sách SSH; giữ phiên quản trị ban đầu đến khi thử thành công phiên mới:

```sh
# Từ máy cá nhân, phiên SSH mới:
ssh -i ~/.ssh/agiviet_oci agiviet@IP_PUBLIC
# Trên VM:
docker compose version
docker info --format '{{.Architecture}}'
```

Dùng Docker Engine **>= 28** (tránh giới hạn bảo vệ loopback của bản cũ) và Compose v2 hiện hành có `up --wait`; bộ kiểm cục bộ dùng Compose 5.6.0. Stack OCI mới không dùng `!override`/`!reset`. Cần thấy kiến trúc ARM/aarch64. OS tự vá không tự pull image mới; lên lịch cập nhật image và reboot kernel riêng.

**Phải mở cả Security List lẫn firewall của hệ điều hành.** Image Oracle có thể có `REJECT` cuối INPUT/FORWARD dù bạn tưởng firewall đã tắt. Installer tạo service `agiviet-firewall`, chèn allow TCP 80/443 trước rule từ chối, không flush rules, không đụng rule SSH hoặc mạng metadata `169.254.0.0/16`. Caddy dùng host network để đi qua INPUT; các cổng Docker còn lại chỉ loopback/nội bộ. Trên OL9 có firewalld đang chạy, script thêm http/https vào zone của NIC cả runtime và permanent.

Kiểm bằng tài khoản quản trị có sudo:

```sh
sudo iptables -L INPUT -n --line-numbers
sudo systemctl status agiviet-firewall.service --no-pager
sudo ss -lntp
```

Nếu image Ubuntu bật UFW riêng, thêm `sudo ufw allow 80/tcp` và `sudo ufw allow 443/tcp`, giữ quyền SSH; **không bật/reset UFW mù quáng khi đang SSH**. Nếu kiểm tra thủ công trên Oracle Linux/Ubuntu dùng iptables, các lệnh tương đương của installer là:

```sh
sudo iptables -C INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT || sudo iptables -I INPUT 1 -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT || sudo iptables -I INPUT 1 -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
```

Service được bật để áp lại sau reboot; thay đổi trực tiếp chỉ trong RAM sẽ mất khi reboot nếu không có cơ chế lưu. Không mở IPv6/AAAA trong lần đầu; muốn dùng IPv6 phải cấu hình cả VCN, ip6tables/firewalld và DNS tương ứng.

## 5. Tên miền, HTTPS và cấu hình bí mật

Tên miền chính thức **agiviet.id.vn** do người dùng sở hữu; người dùng tự thao tác DNS. Không cần chuyển nameserver sang Oracle hay mua OCI DNS. Tại website **nhà đăng ký tên miền .id.vn đang quản lý tên miền** → Tên miền → `agiviet.id.vn` → Quản lý DNS/Bản ghi DNS (tên mục tùy nhà đăng ký):

| Type | Host/Name | Value | TTL |
|---|---|---|---|
| A | `@` (hoặc để trống nếu giao diện quy định) | IPv4 public đang gắn VM Oracle | 300 giây hoặc thấp nhất được hỗ trợ |
| AAAA | `@` | Chỉ thêm IPv6 global của VM nếu đã cấu hình end-to-end | 300 giây |

Không điền `https://`, port hoặc đường dẫn vào Value. Chỉ giữ một A đúng; xóa A/AAAA cũ không còn phục vụ. Nếu giao diện tự thêm hậu tố, không nhập `agiviet.id.vn` vào ô host để tránh tạo `agiviet.id.vn.agiviet.id.vn`. Nếu nameserver thực tế ở đơn vị khác, sửa zone tại đơn vị đang có thẩm quyền; đổi ở registrar nhưng zone không được ủy quyền sẽ không có hiệu lực. `www` chưa thuộc cấu hình này, không tạo/xin chứng chỉ cho `www` tự động.

Mặc định **chưa dùng IPv6**, để `EXPECTED_IPV6=` rỗng và không có AAAA. Chỉ thêm AAAA sau khi IPv6 VCN/subnet/VNIC, route Internet Gateway, NSG/Security List **và** firewall IPv6 của OS đều thông TCP 80/443, Caddy nghe IPv6, đã kiểm từ mạng ngoài. Installer hiện chỉ tự thêm rule iptables IPv4; IPv6 cần thao tác riêng. AAAA sai có thể khiến ACME chọn đường không truy cập được dù A đúng.

Tạo file cấu hình **ngoài checkout**, bằng tài khoản quản trị:

```sh
cd /opt/agiviet
sudo bash infra/oracle/tao-cau-hinh.sh /etc/agiviet/oracle.env
sudo chown root:agiviet /etc/agiviet/oracle.env
sudo chmod 0640 /etc/agiviet/oracle.env
sudoedit /etc/agiviet/oracle.env
```

Mẫu chuẩn: [`infra/oracle/.env.example`](../../infra/oracle/.env.example). Script tạo file mới 0600, từ chối ghi đè và từ chối đường dẫn trong checkout. Sinh riêng mật khẩu owner, gateway, session/OTP/webhook/HMAC dự phòng/AI bằng 32 byte ngẫu nhiên; hai cặp **Ed25519 QR và PDF riêng** lưu PEM base64. Entrypoint giải mã thành `AGV_QR_PRIVATE_PEM`/`AGV_PDF_PRIVATE_PEM` nhiều dòng. Không có khóa thật trong mẫu. Giữ nguyên khóa khi deploy lại; bảo quản bản sao cấu hình mã hóa độc lập với VM, vì backup dữ liệu không kèm secrets.

Giữ `DOMAIN=agiviet.id.vn`; VM nhỏ chọn **`OCI_SIZE=6`**, để `AGV_PG_POOL_MAX=` trống (wrapper tự chọn 4), `ENABLE_AI=1` để chạy AI luật nhẹ hoặc **`ENABLE_AI=0`** để ưu tiên RAM cho nghiệp vụ. Điền `EXPECTED_IPV4`, email `ACME_EMAIL`, hash Basic Auth cho giao diện. Ở user `agiviet`, tạo hash tương tác, không ghi mật khẩu vào dòng lệnh:

```sh
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

Dán vào `CADDY_PASSWORD_HASH='…'` có nháy đơn để giữ `$`. File dùng chung cú pháp Bash/Compose dotenv và được source, chỉ quản trị tin cậy được sửa. Không thêm lệnh shell. Không chia sẻ `docker compose config` đầy đủ hay `docker inspect`; dùng `config --quiet`.

`DB_PASSWORD` chỉ tới owner của job migrate/provision/dump/restore. Backend chỉ nhận URL `postgresql://agv_backend_gateway:…@db:5432/agiviet`, pool tự chọn **4 cho 6 GB, 6 cho 12/24 GB** và các khóa ứng dụng; không nhận credential owner hoặc bộ `DATABASE_URL_AUTH/BANK/SYSTEM` cũ không được driver đọc. Với env cũ có pool 6, khi hạ xuống 6 GB phải để trống hoặc chọn 1–4; wrapper từ chối pool lớn hơn 4. Đổi mật khẩu trong env không đổi role ở volume đã có; bảo trì bằng psql tương tác rồi cập nhật cấu hình đồng bộ, không xóa volume. Nếu tiếp tục env của lượt trước: giữ khóa QR/PDF/HMAC, thêm `AGV_GATEWAY_PASSWORD` ngẫu nhiên và bỏ bộ `APP_DB_PASSWORD/AUTH_DB_PASSWORD/BANK_DB_PASSWORD/SYSTEM_DB_PASSWORD` cũ.


Trước bật Caddy, đặt `EXPECTED_IPV4` trong env bằng IPv4 public thực tế, nạp cấu hình rồi kiểm **một lượt hữu hạn**:

```sh
cd /opt/agiviet
source infra/oracle/chung.sh
bash infra/oracle/kiem-tra-dns.sh
# Đọc thêm CAA và nameserver có thẩm quyền:
dig +short NS agiviet.id.vn
dig +short CAA agiviet.id.vn
```

Script cần `dig` (installer cài dnsutils/bind-utils); so A/AAAA trên resolver máy, **1.1.1.1** và **8.8.8.8** với IP mong đợi, từ chối NXDOMAIN/SERVFAIL, CNAME hoặc record thừa/sai. Chưa lan truyền thì dừng, đợi TTL rồi tự kiểm lại; không restart Caddy để dò DNS. Nếu có CAA ở tên miền hoặc miền cha, phải cho phép `letsencrypt.org`; kiểm DNSSEC/CAA tại nơi quản lý DNS khi có lỗi. DNS đúng chưa chứng minh inbound: kiểm TCP 80/443 từ mạng ngoài VM (`nc -vz agiviet.id.vn 80`/`443` khi listener đã bật), OCI và firewall host phải cùng cho phép. `trien-khai.sh --local/--pull` tự gọi script DNS trước khởi động ingress; `--db-only` không xin chứng chỉ.

Khuyên thử **Let's Encrypt staging một lần** trước chứng chỉ thật. Dùng container tạm, **volume staging riêng**, sau khi DNS đã đạt, cổng 80/443 chưa có Caddy khác chiếm:

```sh
source infra/oracle/chung.sh
bash infra/oracle/kiem-tra-dns.sh
dc build https
# --no-deps: chỉ thử ingress/ACME; upstream chưa chạy có thể trả 502.
dc run -d --no-deps --name agiviet-acme-staging \
  -e ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory \
  -v agiviet_acme_staging_data:/data -v agiviet_acme_staging_config:/config https
# Xem log một lần; chưa thành công thì sửa DNS/firewall/CAA rồi kiểm thủ công.
docker logs --tail 60 agiviet-acme-staging
# Sau khi log xác nhận certificate obtained, dừng và bỏ container thử:
docker stop agiviet-acme-staging
docker rm agiviet-acme-staging
```

Không chạy staging song song Caddy production. Chứng chỉ staging **không được trình duyệt tin cậy**; không coi `curl -k` là nghiệm thu TLS. Sau staging đạt, giữ `ACME_CA=https://acme-v02.api.letsencrypt.org/directory` trong env và chạy deploy đầy đủ. Production dùng volume khác với staging; giữ `caddy_data` để gia hạn/tái triển khai, không xóa nhằm thử lại. Khi ACME lỗi, dừng `dc stop https`, đọc lỗi cụ thể và `Retry-After`, sửa nguyên nhân rồi thử lại có chủ đích; không tạo vòng restart/đổi account để né giới hạn. [Staging chính thức](https://letsencrypt.org/docs/staging-environment/), [rate limits](https://letsencrypt.org/docs/rate-limits/).

Caddy tự cấp/gia hạn HTTPS; không cần certbot, không mở admin 2019 ra public. [Automatic HTTPS](https://caddyserver.com/docs/automatic-https).

**Caddy:** `/ban/`, `/mua/` và tệp giao diện có Basic Auth `pilot`; `/v1/*` dùng xác thực Bearer của backend, không áp Basic vào API vì cùng dùng header Authorization. API đăng nhập/danh mục/health vẫn có phần công khai theo backend. `/v1/test*` và `/v1/sim*` bị chặn 404 tại ingress. Khóa pilot bảo vệ giao diện; rate limit Caddy/IP và giới hạn body được mô tả ở [07](07-chong-tran-chi-phi.md). Không dùng dữ liệu/tiền thật trước nghiệm thu nghiệp vụ và tích hợp nhà cung cấp.

## 6. Stack, provision và triển khai hữu hạn

Chỉ dùng `infra/oracle/docker-compose.oracle.yml`; wrapper `chung.sh` ghép **thêm** `docker-compose.oracle-6gb.yml` nếu chọn 6 GB hoặc `docker-compose.oracle-24gb.yml` nếu chọn 24 GB. File `oracle-12gb.yml` chỉ tương thích lệnh cũ, không bắt buộc. AI có Compose profile `ai`, wrapper bật khi `ENABLE_AI=1`. Luôn thao tác qua `source infra/oracle/chung.sh` rồi `dc ...` để lấy đúng override/pool/profile; không chạy Compose gốc trực tiếp khi VM 6 GB hoặc đã tắt AI. Build context là gốc checkout, đường bind tương đối tính từ `infra/oracle/`. Tất cả service đặt `platform: linux/arm64`; ba Dockerfile dùng base đa kiến trúc, không mang binary PG x64 nhúng của laptop lên VM.

| Dịch vụ | Tiến trình và mạng | RAM tối đa 6 GB / 12 GB / 24 GB |
|---|---|---:|
| db | `postgres:17-bookworm`; không publish 5432 | 1536 / 3072 / 6144 MiB |
| backend | Node 24, `npm start`, `0.0.0.0:8080`; host chỉ `127.0.0.1:8080` | 768 / 1024 / 1024 MiB |
| frontend | `node server.mjs`, 8090; `/v1/*` → backend; host loopback | 192 / 256 / 256 MiB |
| ai | Python 3.11 + FastAPI, 8091 nội bộ, luật thật, một worker | 512 / 768 / 768 MiB |
| https | Caddy 2.10.2 **build kèm plugin rate limit**, host network 80/443 | 192 / 256 / 256 MiB |
| migrate | Job owner PG17, profile setup, chạy xong thoát | 256 / 512 / 512 MiB |

Tổng thường trực **3,125 / 5,25 / 8,25 GiB**; kể cả migrate: **3,375 / 5,75 / 8,75 GiB**. Trần CPU tương ứng 6/12 GB: **1,00 / 2,00**, thường trực **0,83 / 1,75**. Máy 6 GB để khoảng 2,6 GiB RAM danh nghĩa cho OS/cache/daemon/tác vụ; PostgreSQL shared_buffers 384 MiB, work_mem 2 MiB, maintenance 64 MiB, max_connections 32, pool backend 4; Node heap 448 MiB. Đây là ngân sách, chưa đo trên A1; build/daemon/backup là tiến trình host có ngân sách riêng. Build tuần tự, tránh build khi đang có tải, không chạy thêm LLM/STT/Prometheus. Chi tiết [07](07-chong-tran-chi-phi.md). Swap cứu hộ build không thay RAM; các dịch vụ khóa `memswap_limit=mem_limit`. Chưa đưa Prometheus/exporter của stub vào stack mới, không có PDF worker giả lập riêng. PDF do backend thật hiện có xử lý; chưa chứng nhận capacity.

**Nếu AI 512 MiB không đủ hoặc cần dành thêm tài nguyên cho DB:** sửa env `ENABLE_AI=0`, chạy lại deploy sau backup đã kiểm. Deploy dừng AI cũ, bỏ build/start AI, truyền `AI_URL=` rỗng cho backend; backend hiện có `nguon: luat_backend`, ghép bằng luật ngay, không đợi timeout mạng AI. Thường trực 6 GB còn **0,71 CPU / 2,625 GiB**. Không có tính năng AI/giọng nói nặng; nhập tay và ghép luật vẫn phải nghiệm thu hai vai trên cloud. Volume audit cũ vẫn giữ/đo/sao lưu bằng image backend, lần đầu chưa có volume audit thì backup tạo archive audit rỗng, không tạo volume thay thế. Không cần xóa image hay dữ liệu AI để tắt dịch vụ. Muốn bật lại đặt `ENABLE_AI=1`, deploy và kiểm health/log.

Manifest của **4 image cũ** đã đọc từ registry công khai: PG17 Bookworm, Node24, Python3.11, Caddy. Digest ARM64 ở [arm64-manifests.json](../../infra/oracle/arm64-manifests.json). Caddy mới thêm base `caddy:2.10.2-builder`; `kiem-tra-arm64.sh` kiểm cả builder. Manifest builder ARM64 đã được bổ sung vào cùng biên bản, có thời điểm kiểm riêng. Đây chưa là bằng chứng build dependency hay chạy container thành công trên ARM64.

Trình tự DB theo [hướng dẫn DB](../database/06-huong-dan-cho-backend.md) và [tiến độ backend](../../backend/TIEN-DO.md):

1. Owner chạy nguyên `db/scripts/migrate.sh`: mỗi migration transaction, advisory lock và kiểm checksum.
2. **Mặc định `SEED_DEMO=0`, không nạp dữ liệu ảo vào production.** Nếu cần DB thử riêng, đặt `AGV_MOI_TRUONG=thu`, `SEED_DEMO=1`; job chạy nguyên `db/scripts/seed.sh`. Seed hiện có dấu nguồn/hash và chạy lại không nhân dữ liệu. Dùng volume/project riêng để không trộn dữ liệu thử với thật. DB production trống còn cần kế hoạch bootstrap nhân sự/tổ chức nền tảng và dữ liệu đã duyệt của nhóm DB; infra không bịa bản ghi thay seed.
3. `provision-runtime.sh` dùng nguyên `db/scripts/cap-quyen-cong.sql` bên trong transaction owner; file chuẩn đã bỏ vòng grant cũ và đăng ký `cmd.trusted_gateways`. Không sửa nguồn DB/backend và không dùng lại bản SQL backend lỗi thời.
4. Infra thu hồi CONNECT/TEMP từ PUBLIC, cấp CONNECT và SELECT bảng metadata `public.schema_migrations` cho gateway (driver cần đếm trước SET ROLE). Gateway LOGIN **NOINHERIT**, không superuser/BYPASSRLS/CREATEROLE/CREATEDB. Vai danh tính hạn chế theo `agiviet_app`, vai điều phối/worker riêng. Reader và meta giữ BYPASSRLS; broker giữ CREATEROLE theo hợp đồng backend, nên gateway là thành phần tin cậy có khả năng SET ROLE sang các vai này. Không xem gateway là một tài khoản truy vấn ít quyền độc lập với backend.
5. `kiem-tra-db.sh` kiểm ACL, login TCP bằng mật khẩu gateway và SET ROLE; sau đó `kiem-tra-cong.sql` yêu cầu migration 0055/gateway tin cậy và chặn định nghĩa `enter_actor` cũ vẫn tra `session_user`. Guard là kiểm tĩnh trước ingress, không thay bộ E2E 56/56 của backend.

Trên VM ARM64, user `agiviet`:

```sh
cd /opt/agiviet
bash infra/oracle/kiem-tra-arm64.sh
# Chỉ chuẩn bị DB, giữ app/ingress dừng:
bash infra/oracle/trien-khai.sh --db-only
# Sau khi DNS/backup đã kiểm; backend đã có mốc PostgreSQL 56/56:
bash infra/oracle/trien-khai.sh --local
# Chỉ khi dùng Git, muốn pull fast-forward nhánh đã cấu hình:
# bash infra/oracle/trien-khai.sh --pull
```

Lần có volume DB cũ, **phải cấu hình/kiểm backup ngoài máy ở mục 7 trước**: deploy sao lưu, dừng ingress/writer, migrate/provision, kiểm DB rồi mới bật AI/backend/frontend và Caddy. Migration hoặc guard lỗi thì giữ app dừng, không tự rollback DB hoặc mở ingress. `--db-only` chỉ kết thúc sau ACL, không mở dịch vụ và không chứng nhận nghiệp vụ. Script không chờ upstream sửa và không có vòng chờ cloud. Nếu còn stack stub cũ trong cùng project, kiểm container/volume và backup riêng rồi dừng nó theo kế hoạch; không dùng `--remove-orphans` hoặc `down -v` mù quáng.

```sh
cd /opt/agiviet
source infra/oracle/chung.sh
dc --profile setup config --quiet
dc ps
dc logs --tail 60 backend frontend ai https
# Các smoke này chỉ có ý nghĩa khi deploy đầy đủ đã vượt guard:
curl --fail --max-time 10 http://127.0.0.1:8080/health/ready
curl --fail --max-time 10 http://127.0.0.1:8090/ban/
curl --fail --max-time 10 http://127.0.0.1:8090/mua/
```

TLS có thể cần thêm thời gian cấp chứng chỉ; script kiểm một lần, lỗi thì xem log/DNS/firewall rồi kiểm lại thủ công. Từ máy cá nhân/4G: `curl -u pilot https://agiviet.id.vn/ban/` và `/mua/` hỏi mật khẩu, cần 200; không auth giao diện phải 401; `/v1/products` không bị Basic chặn; request Bearer hợp lệ cần đến backend; `/v1/test/clock` phải 404. Không dùng `curl -k` làm bằng chứng TLS đạt. Đăng nhập/thao tác bằng hai app qua HTTPS phải được nghiệm thu riêng trên cloud.

## 7. Sao lưu mã hóa ngoài máy và giữ N bản

Một bản gồm `pg_dump -Fc` của DB **agiviet**, `roles.sql` không kèm mật khẩu, `artifacts.tar` từ volume backend, `ai-audit.tar`, manifest migration/commit và SHA-256. Job dừng backend/AI đang chạy trong lúc dump và chụp tệp để đồng bộ DB–file; có gián đoạn ngắn, chưa đo trên OCI. Trap bật lại đúng dịch vụ trước đó nếu có lỗi. Không tar PGDATA live. Chỉ dùng một writer qua stack này; nếu có writer khác phải đóng cùng lúc. Dump không có WAL/PITR, RPO mục tiêu **24 giờ**, chưa đạt RPO 5 phút.

### Chuẩn bị kho và khóa

1. Trên **máy cá nhân**, cài age từ [dự án chính thức](https://github.com/FiloSottile/age), chạy `age-keygen -o agiviet-recovery.key`. Lưu khóa riêng và bản dự phòng ở nơi an toàn, ngoài tài khoản OCI. Chỉ đưa recipient công khai `age1…` vào `BACKUP_AGE_RECIPIENT` trên VM. Không để private key giải mã trên VM nguồn.
2. Trong Console OCI → Object Storage, tạo bucket **private**, Standard, ví dụ `agiviet-backup`. Tạo prefix riêng `agiviet-oracle-v2/` bằng cách upload đối tượng thử trong Console; xóa tệp thử sau khi xác nhận quyền. Không bật Object Versioning với retention script này: xóa phiên bản hiện tại có thể vẫn giữ bản cũ và vượt quota. Nếu dùng versioning/WORM phải quản lý lifecycle/quota riêng và thử restore.
3. Tạo user backup riêng, **Customer Secret Key** để dùng API S3-compatible; không phải API signing key. Cấp quyền đọc/list/tạo/ghi đè/xóa object **chỉ bucket backup** qua group policy. Ví dụ cho compartment này:

   ```text
   Allow group agiviet-backup to read buckets in compartment agiviet-pilot
   Allow group agiviet-backup to manage objects in compartment agiviet-pilot where target.bucket.name='agiviet-backup'
   ```

   Quyền xóa cần cho giữ N bản, nên khóa này có thể xóa backup trong bucket đó. Không coi đây là chống ransomware/WORM; giữ thêm bản độc lập mà VM không có quyền xóa. Xem [S3 Compatibility API và Customer Secret Keys](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm).
4. Trên VM, bằng tài khoản quản trị, chạy `sudo rclone config --config /etc/agiviet/rclone.conf`. Tạo remote `oci`, loại **S3**, provider **Other**; nhập access key/secret key vừa tạo, region `ap-singapore-1`, endpoint `https://NAMESPACE.compat.objectstorage.ap-singapore-1.oci.customer-oci.com`. Lấy endpoint/namespace chính xác ở Object Storage Console; namespace không phải tên tenancy tùy ý. Chọn path-style (`force_path_style=true`) trong phần advanced của remote. Không bật public ACL. Xem [cấu hình S3 của rclone](https://rclone.org/s3/). Sau đó:

   ```sh
   sudo chown root:agiviet /etc/agiviet/rclone.conf
   sudo chmod 0640 /etc/agiviet/rclone.conf
   sudoedit /etc/agiviet/oracle.env
   ```

   Điền `REMOTE_BACKUP=oci:agiviet-backup/agiviet-oracle-v2`, `RCLONE_CONFIG`, recipient và `KEEP_BACKUPS=7`. Không dùng PAR URL hoặc token trong repo/log. Có thể dùng S3/rclone ở nhà cung cấp khác; giữ cùng mô hình bucket/prefix riêng và kiểm phí.

`MAX_REMOTE_BYTES` mặc định 8 GiB cho prefix này, chừa khoảng trống so với mức Standard miễn phí khi PAYG/trial; **không phải bộ kiểm quota toàn tenancy**. Cộng cả bucket/ảnh/version ở nơi khác bằng Console. Với N=7, chuẩn bị chỗ cho **8 bản** (bản mới được kiểm xong mới xóa bản cũ); tổng phải dưới budget. Nếu mỗi bản quá lớn, giảm N theo RPO đã thống nhất hoặc mua kho ngoài máy, không âm thầm xóa backup cuối cùng. Lưu ý dung lượng tạm local cần đủ dump + artifacts + bundle mã hóa, khoảng vài lần kích thước dữ liệu. Không tạo đầy boot volume.

### Chạy thử rồi bật lịch

```sh
# User agiviet, trên VM:
cd /opt/agiviet
bash infra/oracle/sao-luu.sh
cat /var/lib/agiviet/backup-last-success
# Bằng tài khoản quản trị, chỉ sau khi thử khôi phục được ở mục 8:
sudo systemctl enable --now agiviet-backup.timer
sudo systemctl list-timers agiviet-backup.timer --no-pager
sudo journalctl -u agiviet-backup.service -n 40 --no-pager
```

Installer đăng ký service/timer nhưng **không bật lịch trước khi remote được cấu hình**. Lịch 02:00 Asia/Ho_Chi_Minh (19:00 UTC ngày trước), trễ ngẫu nhiên tối đa 5 phút, `Persistent=true` để bù một lần nếu máy bỏ lỡ lịch. Script lấy khóa chống chạy chồng; không có vòng chờ. File `.partial` được kiểm SHA-256 bằng đọc lại toàn bộ từ remote, rồi mới chuyển sang tên hoàn tất, xoay vòng chính xác N file có mẫu tên của job. Mã hóa trước upload bằng age; checksum không thay mã hóa.

Marker `backup-last-success` chỉ cập nhật sau upload/xác minh/rotation thành công. Lỗi mạng, auth, vượt budget hoặc hash sai làm job thất bại, không xóa backup tốt trước đó. `.partial` remote do lỗi có thể còn, chiếm quota; kiểm và xóa có chọn lọc sau điều tra. Script không tự xóa file không nhận dạng. Dữ liệu staging plaintext cục bộ có quyền 0700/0600 và được dọn bằng trap; mất điện/SIGKILL không chạy trap, cần kiểm thư mục `.stage-*` sau sự cố. Không ghi dump/plaintext vào Git.

Cảnh báo ngoài VM khi service failed, disk <20% hoặc marker cũ quá 26 giờ. Bộ Prometheus cũ **chưa thu marker này**; operator phải gắn kiểm tra độc lập/kênh nhận và diễn tập. Bucket cùng tenancy bảo vệ mất VM, không bảo vệ mất tài khoản/vùng. Tải một bản mã hóa về máy khác định kỳ, giữ private key và cấu hình khôi phục ở ngoài OCI. Kiểm lại [điều kiện Object Storage](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) trước hết trial; vượt mức có thể mất dữ liệu.

## 8. Khôi phục an toàn vào DB mới

Thực hiện trên VM cách ly, không đổi DNS. Giữ bản cấu hình QR/PDF/session/HMAC/DB và khóa age ở kho độc lập; archive không chứa secrets. Cài máy, lấy đúng release, dùng `trien-khai.sh --db-only` để tạo các group role/backend role trên DB mới. Tải archive mã hóa về, đặt private age key ngoài checkout với quyền 0600, user agiviet đọc được:

```sh
cd /opt/agiviet
export BACKUP_AGE_IDENTITY=/var/lib/agiviet/recovery.key
bash infra/oracle/khoi-phuc.sh /var/lib/agiviet/backups/ten.tar.age agiviet agiviet_restore
```

Script giải mã vào staging riêng, kiểm SHA-256 của 5 thành phần, restore custom bằng `--exit-on-error --single-transaction` giữ ownership/ACL. Chỉ nhận DB nguồn `agiviet`, đích mới hậu tố `_restore`; không drop/ghi đè live. Cùng archive/đích đã hoàn tất thì no-op cho DB, vẫn xuất lại archive tệp. Đích dở không có receipt thì dừng, cần điều tra/chọn đích mới. Receipt chỉ xác nhận restore SQL xong, không chứng nhận nghiệp vụ. `GRANT CONNECT` DB đích cho gateway, không cấp các login `agv_web/auth/bank/system` cũ.

`roles.sql` từ `pg_dumpall --roles-only --no-role-passwords` chỉ để đối chiếu, **không tự chạy nguyên văn** vì có role quản trị và role đã tồn tại ở cluster đích. Provisioner rà/tạo principal `agv_u_*`, `agv_s_*` đúng mapping, cấp `agiviet_app` hoặc `agiviet_orchestrator` tương ứng và `GRANT <principal> TO agv_backend_gateway`; không đặt password cho principal. `cap-login.sh user_uuid org_uuid actor` có thể tái cấp thành viên active đã xác minh sau chuyển DB về tên ứng dụng. Người giúp/onboarding chưa có membership cần nhóm DB/backend đối chiếu riêng. Verifier từ chối thiếu role/membership gateway sau restore; không bỏ ACL để ép restore qua.

Artifacts và AI audit ra `/var/lib/agiviet/backups/recovered-SHA256/`, chưa ghi vào volume live. So migration/checksum, quyền/RLS, số dư tiền/lượng, trạng thái lệnh/outbox và hash PDF/ảnh trước chuyển kết nối. Không chạy bộ test ghi dữ liệu lên snapshot cần giữ.

Khôi phục vào **hai volume mới**, dùng tên/thư mục thật của lần phục hồi:

```sh
docker volume create agiviet_oracle_v2_artifacts_restore
docker volume create agiviet_oracle_v2_ai_restore
cat /var/lib/agiviet/backups/recovered-SHA256/artifacts.tar | docker run --rm -i --network none --mount type=volume,src=agiviet_oracle_v2_artifacts_restore,dst=/restore --entrypoint tar node:24.18.0-bookworm-slim -C /restore -xf -
cat /var/lib/agiviet/backups/recovered-SHA256/ai-audit.tar | docker run --rm -i --network none --mount type=volume,src=agiviet_oracle_v2_ai_restore,dst=/restore --entrypoint tar node:24.18.0-bookworm-slim -C /restore -xf -
```

Giữ uid/gid 1000 của tệp cho backend/AI, kiểm quyền ghi trên volume mới. Khóa ingress/writer cả máy cũ và máy mới; trên máy mới `source infra/oracle/chung.sh`, `dc stop https frontend backend ai`. Kết nối owner tới database **postgres**, đổi tên DB rỗng vừa dựng sang tên lưu giữ, DB đã restore sang tên ứng dụng (kiểm không còn kết nối):

```sh
dc exec db psql -U agiviet_owner -d postgres
```

```sql
ALTER DATABASE agiviet RENAME TO agiviet_truoc_phuc_hoi;
ALTER DATABASE agiviet_restore RENAME TO agiviet;
```

Đặt `ORACLE_ARTIFACTS_VOLUME=agiviet_oracle_v2_artifacts_restore`, `ORACLE_AI_VOLUME=agiviet_oracle_v2_ai_restore`, **`SEED_DEMO=0`** trong env; giữ đúng bí mật của snapshot. Re-provision principal, kiểm ACL/command và deploy `--local` (vẫn backup trước migration). Không chỉnh DATABASE_URL thành owner. Cuối cùng mới đổi DNS, kiểm từ 4G và ghi RPO/RTO thực; giữ hệ cũ ngừng ghi. Dọn private age key tạm theo quy trình giữ khóa.

## 9. Rủi ro riêng của Always Free

Theo [chính sách idle compute](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), Oracle có thể thu hồi nếu trong 7 ngày: CPU p95 <20%, mạng <20%, và RAM <20% với A1. Kiểm lại ngưỡng/chính sách chính thức trước dùng. Theo dõi utilization/notification và diễn tập phục hồi; không tạo tải giả hoặc cấp phát RAM giả để né thu hồi. Giảm tài nguyên theo nhu cầu thật không đảm bảo tránh thu hồi.

[FAQ Oracle](https://www.oracle.com/cloud/free/faq/) ghi **không có SLA** cho Free Tier và hỗ trợ kỹ thuật bị giới hạn; tài khoản bỏ không lâu cũng có thể bị đình chỉ. VM đơn, thiếu ARM capacity, IP thay khi dựng lại, hết quota block/object storage hoặc tài khoản bị khóa đều có thể làm mất dịch vụ lâu hơn dự kiến. Không xem Always Free là cam kết production cho giao dịch quan trọng.

Giảm tác động: backup ngoài VM + thêm một bản ngoài tenancy, khóa phục hồi độc lập, mã/manifest release sẵn, DNS TTL thấp, cảnh báo ngoài máy, kiểm dung lượng/quota hằng tuần và thử restore hằng tháng. Không dựa vào snapshot cùng VM làm bản duy nhất. Nếu cần SLA/khôi phục chắc chắn, dự trù dịch vụ trả phí hoặc DB managed.

## 10. Dự phòng và AI

Phương án dự phòng A cũ (Cloudflare Pages + Render/Koyeb + Neon) mới là kế hoạch, **chưa diễn tập chuyển trong 60 phút**. Cần build amd64/đa kiến trúc, kiểm role/extension/SECURITY DEFINER trên DB đích, phục hồi file bền vững và khóa writer cũ trước đổi DNS. Không đưa nguyên migration superuser lên managed PostgreSQL rồi bỏ ACL để ép chạy. Không dùng số đo stub làm capacity backend thật.

AI trong stack mới là `ai/agiviet_ai`, luật ghép/trích xuất thật, dùng chung `AGV_AI_API_KEY`, một uvicorn worker, `AGV_STT_TAT=1`. Không cài Whisper/Piper/Ollama/model LLM trong image này; Ollama trỏ loopback không có daemon. Luôn giữ nhập tay/dự phòng của backend. Chưa kiểm dependency/wheel ARM64, sức chứa hay chất lượng giọng nói trên A1. AI không có credential DB và không được quyết định tiền/quyền.

## 11. Phần đã kiểm và phần phải nghiệm thu

Bằng chứng cục bộ và lệnh kiểm ở [`infra/oracle/kiem-chung.md`](../../infra/oracle/kiem-chung.md), đánh giá ở [05](05-danh-gia-thanh-that.md). Đã kiểm PostgreSQL 17 nhúng mới/cách ly, migrations/seed/provision/ACL, backend production gateway và HTTP frontend; Docker daemon vẫn không chạy. Không tạo tài khoản/VM hay dùng credit.

Còn phải nghiệm thu trên tài khoản thật: quyền/quota/capacity A1; build và dependency ARM64; Docker volumes/health/restart; firewall sau reboot và từ Internet; DNS/ACME/gia hạn; command danh tính gateway/đa phiên; hai app đăng nhập/ghi nghiệp vụ; snapshot DB–tệp; age/rclone upload/hash/retention/restore toàn bộ; timer/cảnh báo ngoài máy. Chưa có SLA, HA, PITR hoặc kết quả RPO/RTO cloud.
