#!/usr/bin/env bash
# Smoke thay đổi DB ảo (đăng nhập); không chạy cloudflared. Dùng state riêng nếu cần.
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
trap '"$HERE/dung.sh"' EXIT
"$HERE/dung.sh"
"$HERE/khoi-dong.sh"
python3 "$HERE/kiem-chung.py"
"$HERE/trang-thai.sh"
"$HERE/sao-luu.sh"
python3 - "$STATE" <<'PYTOKENS'
import json,sys
from pathlib import Path
s=Path(sys.argv[1]);(s/'run/tokens-check.json').write_text(json.dumps([json.loads(p.read_text())['token'] for p in (s/'run').glob('*.json')]))
PYTOKENS
"$HERE/dung.sh"
python3 - "$PGPORT" "$BACKEND_PORT" "$FRONTEND_PORT" "$PILOT_PORT" "$AI_PORT" "$CADDY_PORT" "$OPERATOR_PORT" <<'PY'
import socket,sys
for port in map(int,sys.argv[1:]):
 with socket.socket() as s:
  if s.connect_ex(('127.0.0.1',port))==0:raise SystemExit(f'Còn cổng đang nghe: {port}')
print('PASS: tất cả cổng stack đã đóng')
import os,json
from pathlib import Path
s=Path(os.environ['STATE']);tokens=json.loads((s/'run/tokens-check.json').read_text())
for p in Path('/proc').iterdir():
 if not p.name.isdigit():continue
 try:
  env=(p/'environ').read_bytes()
  if any(('AGV_LOCAL_PROCESS_TOKEN='+t).encode()+b'\0' in env for t in tokens):raise SystemExit('Còn tiến trình do stack bật')
 except OSError:pass
(s/'run/tokens-check.json').unlink()
print('PASS: không còn tiến trình mang token của stack')
PY
"$HERE/trang-thai.sh"
trap - EXIT
