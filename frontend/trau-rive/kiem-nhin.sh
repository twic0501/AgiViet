#!/usr/bin/env bash
# Kiểm quay đầu bằng Joystick: con trỏ trái/phải/trên/dưới + tự ngó khi không có con trỏ. Ghép build/kiem-nhin.png.
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
"$RIVE" . --screenshot=build/n-trai.png --advance=20 --pointer=move@30,215 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-phai.png --advance=20 --pointer=move@482,215 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-len.png --advance=20 --pointer=move@256,40 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-xuong.png --advance=20 --pointer=move@256,390 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-tudo.png --advance=120 >/dev/null 2>&1
python3 - <<'E'
from PIL import Image, ImageDraw
fs = ['n-trai', 'n-phai', 'n-len', 'n-xuong', 'n-tudo']
s = Image.new('RGB', (300 * 5, 320), (40, 40, 40)); d = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    s.paste(Image.open(f'build/{f}.png').convert('RGB').crop((70, 40, 442, 412)).resize((300, 300)), (i * 300, 0))
    d.text((i * 300 + 6, 304), f, fill=(255, 200, 0))
s.save('build/kiem-nhin.png')
E
