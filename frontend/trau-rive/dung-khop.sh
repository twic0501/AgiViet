#!/usr/bin/env bash
# Dựng bản trâu KHỚP NỐI (tay/chân theo khớp, đổi dáng) ra file riêng ../assets/trau/trau-khop.riv để xem thử.
# Không đụng scene.rml / trau.riv đang dùng cho app.
set -euo pipefail
cd "$(dirname "$0")"
DANG=${1:-NGHI,T01,T18,T20,T04,T07,T21,NGHI}
cp scene.rml /tmp/agv-scene-app.rml
trap 'cp /tmp/agv-scene-app.rml scene.rml' EXIT
python3 -I tay-khop.py nguon/trau.svg /dev/stdin build/rive-goc >/dev/null <<'J'
{"NGHI": {"tay-trai": [34, 0, 0], "tay-phai": [34, 0, 0], "_rive": true}}
J
AGV_DANG_THU="$DANG" python3 -I tao-canh.py build/rive-goc/NGHI.svg > scene.rml
"$HOME/.rive/bin/rive" . --verify
"$HOME/.rive/bin/rive" . --once >/dev/null
cp build/trau-rive.riv ../assets/trau/trau-khop.riv
# Bảng ảnh các dáng (SVG) cho trang xem
bash xem-khop.sh >/dev/null
mkdir -p ../assets/trau/xem && cp build/khop/bang.png ../assets/trau/xem/bang-dang.png
ls -la ../assets/trau/trau-khop.riv ../assets/trau/xem/bang-dang.png
