#!/usr/bin/env bash
# Chạy sudo trên VM mới. Không tạo tài nguyên OCI, không xóa cấu hình firewall có sẵn.
set -euo pipefail
umask 077
here="$(cd "$(dirname "$0")" && pwd)"
[[ "$EUID" == 0 ]] || { echo 'Chạy bằng sudo trên VM OCI mới' >&2; exit 2; }
[[ "$(uname -m)" == aarch64 || "$(uname -m)" == arm64 ]] || { echo 'Cần ARM64' >&2; exit 2; }
case "${OCI_SIZE:-12}" in
  6) swap_mib=2048;;
  12|24) swap_mib=4096;;
  *) echo 'OCI_SIZE chỉ nhận 6, 12 hoặc 24' >&2; exit 2;;
esac
DEPLOY_USER="${DEPLOY_USER:-agiviet}"
[[ "$DEPLOY_USER" =~ ^[a-z][a-z0-9_-]*$ && "$DEPLOY_USER" != root ]] || exit 2
source /etc/os-release
case "$ID:$VERSION_ID" in
  ubuntu:22.04|ubuntu:24.04)
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ca-certificates curl openssl gnupg git jq python3 iptables unattended-upgrades rclone age dnsutils
    install -m 0755 -d /etc/apt/keyrings
    curl --fail --silent --show-error --max-time 60 https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    cat > /etc/apt/sources.list.d/agiviet-docker.sources <<APT
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $VERSION_CODENAME
Components: stable
Architectures: arm64
Signed-By: /etc/apt/keyrings/docker.asc
APT
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    cat > /etc/apt/apt.conf.d/52agiviet-security <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
Unattended-Upgrade::Automatic-Reboot "false";
APT
    systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
    ;;
  ol:9|ol:9.*)
    # Docker CE dùng repo CentOS 9 tương thích; đây không phải Docker được Oracle hỗ trợ.
    # Không tự gỡ Podman/runc nếu có xung đột: dnf dừng để operator xử lý trên VM mới.
    dnf install -y ca-certificates curl openssl git jq python3 iptables dnf-automatic bind-utils
    cat > /etc/yum.repos.d/agiviet-docker.repo <<'REPO'
[agiviet-docker-ce-stable]
name=Docker CE Stable - aarch64
baseurl=https://download.docker.com/linux/centos/9/aarch64/stable
enabled=1
gpgcheck=1
gpgkey=https://download.docker.com/linux/centos/gpg
REPO
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    # age/rclone không đảm bảo có trong repo OL mặc định. Cài từ EPEL Oracle tương ứng.
    dnf install -y oracle-epel-release-el9
    dnf install -y age rclone
    cat > /etc/dnf/automatic.conf <<'DNF'
[commands]
upgrade_type = security
download_updates = yes
apply_updates = yes
reboot = never
[emitters]
emit_via = stdio
DNF
    systemctl enable --now dnf-automatic-install.timer
    ;;
  *) echo 'Hỗ trợ Ubuntu 22.04/24.04 hoặc Oracle Linux 9. Khuyên dùng Ubuntu 24.04 ARM64.' >&2; exit 2;;
esac
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
deploy_home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
# Giữ tài khoản SSH gốc; chỉ copy public authorized_keys, không đọc private key.
key_source="${SSH_PUBLIC_KEY_FILE:-}"
if [[ -z "$key_source" && -n "${SUDO_USER:-}" && "$SUDO_USER" != root ]]; then
  admin_home="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
  key_source="$admin_home/.ssh/authorized_keys"
fi
if [[ -n "$key_source" && -f "$key_source" && ! -e "$deploy_home/.ssh/authorized_keys" ]]; then
  install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$deploy_home/.ssh"
  install -m 0600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$key_source" "$deploy_home/.ssh/authorized_keys"
fi
# Không đổi owner đệ quy của checkout hoặc dữ liệu đã có khi chạy lại.
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/agiviet /var/lib/agiviet /var/lib/agiviet/backups
install -d -m 0750 -o root -g "$DEPLOY_USER" /etc/agiviet
install -d -m 0755 /etc/docker
python3 - <<'PY'
import json, os
from pathlib import Path
p=Path('/etc/docker/daemon.json')
v=json.loads(p.read_text()) if p.exists() else {}
v.setdefault('log-driver','json-file')
if v['log-driver']=='json-file':
    opts=v.setdefault('log-opts',{})
    opts.setdefault('max-size','10m'); opts.setdefault('max-file','3')
v.setdefault('live-restore',True)
tmp=p.with_suffix('.json.agiviet-tmp')
tmp.write_text(json.dumps(v,indent=2)+'\n'); os.chmod(tmp,0o644); tmp.replace(p)
PY
# Không tự restart Docker đang chạy để tránh gián đoạn lần cài lại.
systemctl enable --now docker
# Swap là cứu hộ host khi build, dịch vụ đã khóa memswap_limit bằng mem_limit.
if [[ ! -e /swap-agiviet ]]; then
  dd if=/dev/zero of=/swap-agiviet bs=1M count="$swap_mib" status=none
  chmod 0600 /swap-agiviet
  mkswap /swap-agiviet
fi
[[ "$(blkid -p -s TYPE -o value /swap-agiviet)" == swap ]] || { echo 'File swap có sẵn không hợp lệ, không ghi đè' >&2; exit 2; }
if ! swapon --noheadings --raw --show=NAME | grep -Fxq /swap-agiviet; then swapon /swap-agiviet; fi
if ! grep -Eq '^/swap-agiviet[[:space:]]' /etc/fstab; then echo '/swap-agiviet none swap sw 0 0' >> /etc/fstab; fi
echo 'vm.swappiness=10' > /etc/sysctl.d/90-agiviet-swap.conf
sysctl -p /etc/sysctl.d/90-agiviet-swap.conf >/dev/null
# Chèn trước REJECT trên image OCI. Không flush INPUT/FORWARD, giữ SSH và 169.254.0.0/16.
cat > /usr/local/sbin/agiviet-firewall <<'FW'
#!/usr/bin/env bash
set -euo pipefail
for port in 80 443; do
  iptables -w 10 -C INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null ||
    iptables -w 10 -I INPUT 1 -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
done
FW
chmod 0755 /usr/local/sbin/agiviet-firewall
if command -v firewall-cmd >/dev/null && firewall-cmd --state >/dev/null 2>&1; then
  nic="$(ip -4 route show default | awk 'NR==1 {print $5}')"
  zone="$(firewall-cmd --get-zone-of-interface="$nic")"
  [[ "$zone" != 'no zone' && -n "$zone" ]] || zone="$(firewall-cmd --get-default-zone)"
  firewall-cmd --zone="$zone" --permanent --add-service=http
  firewall-cmd --zone="$zone" --permanent --add-service=https
  firewall-cmd --zone="$zone" --add-service=http
  firewall-cmd --zone="$zone" --add-service=https
fi
cat > /etc/systemd/system/agiviet-firewall.service <<'UNIT'
[Unit]
Description=Mo INPUT 80 443 cho Caddy OCI
Wants=network-online.target
After=network-online.target docker.service firewalld.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/agiviet-firewall
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
UNIT
# Đăng ký lịch, chưa bật trước khi có backup ngoài máy được thử thành công.
cat > /etc/systemd/system/agiviet-backup.service <<UNIT
[Unit]
Description=Sao luu AgiViet OCI ma hoa ra ngoai may
After=docker.service network-online.target
[Service]
Type=oneshot
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=/opt/agiviet
ExecStart=/bin/bash /opt/agiviet/infra/oracle/sao-luu.sh
UMask=0077
TimeoutStartSec=2h
UNIT
cat > /etc/systemd/system/agiviet-backup.timer <<'UNIT'
[Unit]
Description=Sao luu moi ngay 02 gio Viet Nam
[Timer]
OnCalendar=*-*-* 02:00:00 Asia/Ho_Chi_Minh
Persistent=true
RandomizedDelaySec=300
Unit=agiviet-backup.service
[Install]
WantedBy=timers.target
UNIT
install -m 0644 "$here/systemd/agiviet-resources.service" "$here/systemd/agiviet-resources.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable agiviet-firewall.service
/usr/local/sbin/agiviet-firewall
systemctl start agiviet-firewall.service
docker compose version
# Kiểm cú pháp Compose bằng config --quiet sau khi tạo oracle.env.
echo "Đã chuẩn bị VM; mở phiên SSH mới bằng $DEPLOY_USER. Chưa bật timer backup/resources, chưa triển khai ứng dụng."
echo 'Tự cập nhật bảo mật OS không cập nhật image Docker; lên lịch pull/build/kiểm lại riêng.'
