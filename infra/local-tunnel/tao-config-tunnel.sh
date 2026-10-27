#!/usr/bin/env bash
# Chỉ viết config ngoài repo sau khi người dùng đã tự login/create.
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
load_config
uuid="${1:?Cách dùng: tao-config-tunnel.sh UUID (lấy từ tunnel create)}"
python3 - "$HERE/config.yml" "$STATE/cloudflared.yml" "${AGV_CLOUDFLARED_DIR:-$HOME/.cloudflared}" "$uuid" "$CADDY_PORT" "$REPO" <<'PY'
import json,os,sys,uuid
from pathlib import Path
src,out,folder,raw,port,repo=sys.argv[1:]
u=str(uuid.UUID(raw));credential=(Path(folder)/(u+'.json')).resolve()
if credential.is_relative_to(Path(repo)):raise SystemExit('Credential phải nằm ngoài repo')
if credential.stat().st_uid!=os.getuid():raise SystemExit('Sai owner credential')
if json.loads(credential.read_text()).get('TunnelID')!=u:raise SystemExit('TunnelID không khớp')
credential.chmod(0o600)
text=Path(src).read_text().replace('REPLACE_WITH_TUNNEL_UUID',u)
text='\n'.join('credentials-file: '+json.dumps(str(credential)) if line.startswith('credentials-file:') else line for line in text.splitlines())+'\n'
text=text.replace('127.0.0.1:18888',f'127.0.0.1:{int(port)}')
fd=os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write(text)
print('Đã tạo '+out+'; chưa chạy tunnel hoặc đổi DNS.')
PY
