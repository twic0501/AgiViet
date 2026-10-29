#!/usr/bin/env bash
# Kiểm tai vẫy: chụp các khung quanh cú vẫy tai trái (~48–62) và tai phải (~118–132), có con trỏ lệch trái để lớp Nhìn cùng chạy. Ghép build/kiem-tai.png.
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
for f in 30 48 62 118 132; do
  "$RIVE" . --screenshot=build/tai-$f.png --advance=$f --pointer=move@120,200 >/dev/null 2>&1
done
python3 - <<'E'
from PIL import Image, ImageDraw
fs = [30, 48, 62, 118, 132]
s = Image.new('RGB', (300 * len(fs), 220), (40, 40, 40)); d = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    s.paste(Image.open(f'build/tai-{f}.png').convert('RGB').crop((40, 60, 472, 260)).resize((300, 200)), (i * 300, 0))
    d.text((i * 300 + 6, 204), f'khung {f}', fill=(255, 200, 0))
s.save('build/kiem-tai.png')
E
