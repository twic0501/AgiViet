#!/usr/bin/env bash
# Chụp khung hoạt ảnh đổi dáng của bản khớp nối (dựng tạm scene thử, chụp, rồi trả scene app về). Dùng: kiem-khop-rive.sh DANG1,DANG2,...
set -euo pipefail
cd "$(dirname "$0")"
DANG=${1:-NGHI,T01,T18,T20,NGHI}
cp scene.rml /tmp/agv-scene-app.rml
trap 'cp /tmp/agv-scene-app.rml scene.rml' EXIT
python3 -I tay-khop.py nguon/trau.svg /dev/stdin build/rive-goc >/dev/null <<'J'
{"NGHI": {"tay-trai": [34, 0, 0], "tay-phai": [34, 0, 0], "chan-trai": [0, 0, 0], "chan-phai": [0, 0, 0], "_rive": true}}
J
AGV_DANG_THU="$DANG" python3 -I tao-canh.py build/rive-goc/NGHI.svg > scene.rml
"$HOME/.rive/bin/rive" . --verify >/dev/null
bash kiem-dang.sh
