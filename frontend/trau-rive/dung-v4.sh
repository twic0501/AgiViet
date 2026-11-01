#!/usr/bin/env bash
# Dựng trâu v4 (1/11): bảng hanh_dong 0–9 mới + 10–12 giữ từ v3, đầu vào `vao`, chạm 3 lần có trứng,
# hai artboard trong một tệp: 'trau' (512) và 'trau_nho' (128, đầu + vai) → frontend/assets/trau/trau-v4.riv
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
gop() {   # $1: thêm --xem cho bản lớn hay không; $2: tệp ra
  AGV_V4=1 python3 dung-v3.py $1 > "$2.lon"
  AGV_V4=1 AGV_NHO=1 AGV_ID0=500000 python3 dung-v3.py > "$2.nho"
  python3 - "$2" <<'PY'
import re, sys
ra = sys.argv[1]
lon, nho = open(ra + '.lon').read(), open(ra + '.nho').read()
ab = re.search(r'<Artboard .*</Artboard>', nho, re.S).group(0)
ab = re.sub(r'thickness="([\d.]+)"', lambda m: f'thickness="{float(m.group(1)) * 1.7:.2f}"', ab)
open(ra, 'w').write(lon.replace('</Rive>', ab + '\n</Rive>'))
PY
  rm -f "$2.lon" "$2.nho"
}
gop "" v4/scene.rml
gop --xem xem-v4/scene.rml
"$RIVE" v4 --verify
"$RIVE" xem-v4 --verify
"$RIVE" v4 --once >/dev/null
cp v4/build/trau-v4.riv ../assets/trau/trau-v4.riv
ls -la ../assets/trau/trau-v4.riv
