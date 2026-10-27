#!/usr/bin/env bash
# Sinh khóa tại máy cài đặt, không in bí mật, không ghi đè khóa cũ.
set -euo pipefail
umask 077
here="$(cd "$(dirname "$0")" && pwd)"
target="${1:-/etc/agiviet/oracle.env}"
repo="$(cd "$here/../.." && pwd)"
case "$(realpath -m "$target")" in "$repo"/*) echo 'Cấu hình thật phải ngoài repo' >&2; exit 2;; esac
python3 - "$here/.env.example" "$target" <<'KEYS'
import base64, os, secrets, subprocess, sys
from pathlib import Path
lines=[]
for line in Path(sys.argv[1]).read_text().splitlines():
    if line.endswith('=GENERATE'):
        line=line.split('=')[0]+'='+secrets.token_hex(32)
    elif line.endswith('=GENERATE_ED25519'):
        key=subprocess.check_output(['openssl','genpkey','-algorithm','ED25519'],stderr=subprocess.DEVNULL)
        line=line.split('=')[0]+'='+base64.b64encode(key).decode()
    lines.append(line)
# O_EXCL: cả hai tiến trình cùng chạy cũng không ghi đè khóa.
fd=os.open(sys.argv[2],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
print('Đã sinh cấu hình 0600 cho agiviet.id.vn. Điền EXPECTED_IPV4, ACME_EMAIL, CADDY_PASSWORD_HASH và backup trước triển khai.')
KEYS
