#!/usr/bin/env bash
# Dựng trâu Rive: SVG nguồn → scene.rml → kiểm (verify) → .riv → chép vào assets dùng cho app.
set -euo pipefail
cd "$(dirname "$0")"
python3 tao-canh.py nguon/trau.svg > scene.rml
"$HOME/.rive/bin/rive" . --verify
"$HOME/.rive/bin/rive" . --once >/dev/null
cp build/trau-rive.riv ../assets/trau/trau.riv
ls -la ../assets/trau/trau.riv
