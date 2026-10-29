#!/usr/bin/env bash
# Kiểm phản ứng chạm: chụp vùng mặt ở nhiều khung sau khi chạm, và khung không chạm để so.
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
for n in 4 12 24; do
  "$RIVE" . --screenshot=build/cham-$n.png --advance=$n --pointer=click@256,300 >/dev/null 2>&1
  "$RIVE" . --screenshot=build/khong-$n.png --advance=$n >/dev/null 2>&1
done
"$RIVE" . --screenshot=build/hoi.png --advance=135 >/dev/null 2>&1
python3 - <<'E'
from PIL import Image, ImageDraw
fs = ['khong-12', 'cham-4', 'cham-12', 'cham-24', 'hoi']
s = Image.new('RGB', (260 * 5, 210), (40, 40, 40)); d = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    im = Image.open(f'build/{f}.png').convert('RGB').crop((126, 150, 386, 340)); s.paste(im, (i * 260, 0))
    d.text((i * 260 + 6, 194), f, fill=(255, 200, 0))
s.save('build/kiem-cham.png')
E
