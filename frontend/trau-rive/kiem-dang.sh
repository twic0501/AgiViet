#!/usr/bin/env bash
# Chụp hoạt ảnh "Đổi dáng thử" ở nhiều khung (kể cả giữa hai dáng) để soi giật / hở khớp / xuyên lớp. Ghép build/kiem-dang.png.
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
KHUNG="0 20 50 70 85 105 140 155 175 210 225 245 280"
for f in $KHUNG; do "$RIVE" . --screenshot=build/dang-$f.png --advance=$f >/dev/null 2>&1; done
python3 -I - $KHUNG <<'P'
import sys
from PIL import Image, ImageDraw
fs = sys.argv[1:]; W = 220
o = Image.new('RGB', (W * 7, (W + 16) * 2), (30, 30, 30)); d = ImageDraw.Draw(o)
for i, f in enumerate(fs):
    x, y = (i % 7) * W, (i // 7) * (W + 16)
    o.paste(Image.open(f'build/dang-{f}.png').convert('RGB').resize((W, W)), (x, y)); d.text((x + 4, y + W + 1), f'khung {f}', fill=(255, 210, 0))
o.save('build/kiem-dang.png')
P
