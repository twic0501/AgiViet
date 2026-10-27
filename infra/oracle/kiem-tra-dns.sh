#!/usr/bin/env bash
# Không khởi động Caddy, không gọi ACME, không chờ DNS bằng vòng lặp.
# Gọi sau `source infra/oracle/chung.sh`, hoặc truyền 3 biến bên dưới.
set -euo pipefail
export DOMAIN="${DOMAIN:-agiviet.id.vn}"
export EXPECTED_IPV4="${EXPECTED_IPV4:?Điền IPv4 public của VM}"
export EXPECTED_IPV6="${EXPECTED_IPV6:-}"
command -v dig >/dev/null || { echo 'Cần dig: Ubuntu dnsutils; Oracle Linux bind-utils' >&2; exit 2; }
python3 - <<'PY'
import ipaddress, os, re, subprocess

domain = os.environ['DOMAIN']
want4 = ipaddress.IPv4Address(os.environ['EXPECTED_IPV4'])
want6 = os.environ['EXPECTED_IPV6']
want6 = ipaddress.IPv6Address(want6) if want6 else None
if not want4.is_global or (want6 and not want6.is_global):
    raise SystemExit('Cần địa chỉ public, không dùng IP nội bộ/loopback')
for resolver in ('system', '1.1.1.1', '8.8.8.8'):
    for kind, expected in (('A', {want4}), ('AAAA', {want6} if want6 else set())):
        cmd = ['dig', '+time=3', '+tries=1', '+noall', '+answer', '+comments', domain, kind]
        if resolver != 'system':
            cmd.append('@' + resolver)
        result = subprocess.run(cmd, check=True, text=True, capture_output=True, timeout=8)
        if not re.search(r'status: NOERROR\b', result.stdout):
            raise SystemExit(f'{resolver} {kind}: DNS không trả NOERROR; chưa được bật HTTPS')
        records = [line.split() for line in result.stdout.splitlines() if line.strip() and not line.startswith(';')]
        if any(len(row) < 5 or row[3] != kind for row in records):
            raise SystemExit(f'{resolver} {kind}: có CNAME/kết quả khác loại; kiểm DNS thủ công')
        try:
            actual = {ipaddress.ip_address(row[4]) for row in records}
        except ValueError:
            raise SystemExit(f'{resolver} {kind}: có CNAME/kết quả không phải IP; kiểm DNS thủ công')
        if actual != expected:
            raise SystemExit(f'CHẶN HTTPS: {resolver} {kind} {domain}: nhận {actual}, cần {expected}')
        print(f'Đạt DNS: {resolver} {kind} {domain}')
print('DNS khớp; còn phải kiểm TCP 80/443 từ mạng ngoài và CAA trước ACME.')
PY
