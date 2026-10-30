#!/usr/bin/env bash
# Soi từng dáng TRONG RIVE: dựng scene thử với dáng khởi đầu = từng dáng, chụp sau 40 khung (đã trộn xong),
# ghép build/kiem-rive-dang.png. Trả scene app về khi xong. Dùng: kiem-khop-rive.sh [DANG1,DANG2,...]
set -euo pipefail
cd "$(dirname "$0")"
DANG=${1:-NGHI,T01,T02,T03,T04,T07,T09,T10,T11,T14,T15,T17,T18,T19,T20,T21,T25,T26,T29,T31,DI_A,DI_B}
cp scene.rml /tmp/agv-scene-app.rml
trap 'cp /tmp/agv-scene-app.rml scene.rml' EXIT
python3 -I tay-khop.py nguon/trau.svg /dev/stdin build/rive-goc >/dev/null <<'J'
{"NGHI": {"tay-trai": [34, 0, 0], "tay-phai": [34, 0, 0], "chan-trai": [0, 0, 0], "chan-phai": [0, 0, 0], "_rive": true}}
J
IFS=',' read -ra DS <<< "$DANG"
for i in "${!DS[@]}"; do
  AGV_DANG="$DANG" AGV_DANG_DAU="$i" python3 -I tao-canh.py build/rive-goc/NGHI.svg > scene.rml
  "$HOME/.rive/bin/rive" . --screenshot="build/rd-$i.png" --advance=40 >/dev/null 2>&1
done
python3 -I - "$DANG" <<'P'
import sys
from PIL import Image, ImageDraw
ds = sys.argv[1].split(','); W = 220; cot = 6
o = Image.new('RGB', (W * cot, (W + 16) * ((len(ds) + cot - 1) // cot)), (30, 30, 30)); d = ImageDraw.Draw(o)
for i, m in enumerate(ds):
    x, y = (i % cot) * W, (i // cot) * (W + 16)
    o.paste(Image.open(f'build/rd-{i}.png').convert('RGB').resize((W, W)), (x, y)); d.text((x + 4, y + W + 1), f'{i} {m}', fill=(255, 210, 0))
o.save('build/kiem-rive-dang.png')
P
