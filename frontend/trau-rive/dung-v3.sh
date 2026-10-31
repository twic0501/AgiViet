#!/usr/bin/env bash
# Dựng trâu v3 (Chặng 2): góc nhìn + khung xương + nghỉ sống → frontend/assets/trau/trau-v3.riv (bản giao app)
# và xem-v3/ (bản xem thử có vùng bấm: bấm 5 cột để đổi hướng, rê để nhìn theo).
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
python3 dung-v3.py > v3/scene.rml
python3 dung-v3.py --xem > xem-v3/scene.rml
"$RIVE" v3 --verify
"$RIVE" xem-v3 --verify
"$RIVE" v3 --once >/dev/null
cp v3/build/trau-v3.riv ../assets/trau/trau-v3.riv
ls -la ../assets/trau/trau-v3.riv
