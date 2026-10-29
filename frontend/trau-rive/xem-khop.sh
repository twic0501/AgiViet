#!/usr/bin/env bash
# Dựng các tư thế tay khớp từ tu-the-khop.json rồi ghép bảng xem build/khop/bang.png (nền tối).
set -euo pipefail
cd "$(dirname "$0")"
D=build/khop; rm -rf "$D"; mkdir -p "$D"
python3 -I tay-khop.py nguon/trau.svg tu-the-khop.json "$D" >/dev/null
# Mặt phải đủ: hai lông mày, hai mắt, mõm (ảnh dáng tham chiếu có khi thiếu lông mày — mặt luôn lấy từ V4g).
for f in "$D"/*.svg; do
  for id in long-may-trai long-may-phai mat-trai mat-phai mom; do
    grep -q "id=\"$id\"" "$f" || { echo "THIẾU $id trong $(basename "$f")" >&2; exit 1; }
  done
done
for f in "$D"/*.svg; do rsvg-convert -w 300 -b '#233c31' -o "${f%.svg}.png" "$f"; done
python3 -I - "$D" <<'P'
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; fs = sorted(f for f in os.listdir(d) if f.endswith('.png'))
o = Image.new('RGB', (5 * 300, ((len(fs) + 4) // 5) * 320), (35, 60, 49)); dr = ImageDraw.Draw(o)
for i, f in enumerate(fs):
    x, y = (i % 5) * 300, (i // 5) * 320
    o.paste(Image.open(os.path.join(d, f)).convert('RGB'), (x, y)); dr.text((x + 6, y + 302), f[:-4], fill=(255, 210, 0))
o.save(os.path.join(d, 'bang.png'))
P
