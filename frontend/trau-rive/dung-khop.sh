#!/usr/bin/env bash
# Dựng bản trâu KHỚP NỐI (tay/chân theo khớp, đổi dáng) ra file riêng ../assets/trau/trau-khop.riv để xem thử.
# Không đụng scene.rml / trau.riv đang dùng cho app.
set -euo pipefail
cd "$(dirname "$0")"
DANG=${1:-NGHI,T01,T02,T03,T04,T07,T09,T10,T11,T14,T15,T17,T18,T19,T20,T21,T25,T26,T29,T31,DI_A,DI_B}
cp scene.rml /tmp/agv-scene-app.rml
trap 'cp /tmp/agv-scene-app.rml scene.rml' EXIT
python3 -I tay-khop.py nguon/trau.svg /dev/stdin build/rive-goc >/dev/null <<'J'
{"NGHI": {"tay-trai": [34, 0, 0], "tay-phai": [34, 0, 0], "chan-trai": [0, 0, 0], "chan-phai": [0, 0, 0], "_rive": true}}
J
AGV_DANG="$DANG" python3 -I tao-canh.py build/rive-goc/NGHI.svg > scene.rml
"$HOME/.rive/bin/rive" . --verify
"$HOME/.rive/bin/rive" . --once >/dev/null
cp build/trau-rive.riv ../assets/trau/trau-khop.riv
# Bảng ảnh các dáng (SVG) cho trang xem
bash xem-khop.sh >/dev/null
mkdir -p ../assets/trau/xem && cp build/khop/bang.png ../assets/trau/xem/bang-dang.png
ls -la ../assets/trau/trau-khop.riv ../assets/trau/xem/bang-dang.png
