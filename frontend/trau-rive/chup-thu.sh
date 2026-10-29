#!/usr/bin/env bash
# Chụp kiểm chuyển động trâu Rive không cần cửa sổ: thở (hơi mũi), nhìn theo con trỏ trái/phải, chạm.
# Kết quả: build/tuong-tac.png (ghép 4 khung, phóng vùng mặt).
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
"$RIVE" . --screenshot=build/tho.png --advance=140 >/dev/null 2>&1
"$RIVE" . --screenshot=build/nhin-trai.png --advance=30 --pointer=move@40,200 >/dev/null 2>&1
"$RIVE" . --screenshot=build/nhin-phai.png --advance=30 --pointer=move@480,200 >/dev/null 2>&1
"$RIVE" . --screenshot=build/cham.png --advance=12 --pointer=click@256,300 >/dev/null 2>&1
python3 - <<'E'
from PIL import Image, ImageDraw
fs = ['tho', 'nhin-trai', 'nhin-phai', 'cham']
s = Image.new('RGB', (320 * 4, 340), (40, 40, 40)); d = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    im = Image.open(f'build/{f}.png').convert('RGB').crop((96, 90, 416, 410)); s.paste(im, (i * 320, 0))
    d.text((i * 320 + 6, 322), f, fill=(255, 200, 0))
s.save('build/tuong-tac.png')
E
echo "đã ghi build/tuong-tac.png"
