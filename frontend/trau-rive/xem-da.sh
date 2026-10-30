#!/usr/bin/env bash
# Dựng các dáng tay da bọc xương, render nền tối + sáng, ghép bảng, đo lệch dáng nghỉ so với V4g.
set -euo pipefail
cd "$(dirname "$0")"
J=${1:-build/da/thu.json}; O=${2:-build/da}
mkdir -p "$O"
python3 -I tay-da.py nguon/trau.svg "$J" "$O"
for f in "$O"/*.svg; do
  rsvg-convert -w 512 -h 512 -b '#233c31' "$f" -o "${f%.svg}.png"
  rsvg-convert -w 512 -h 512 -b '#f7f8f2' "$f" -o "${f%.svg}-sang.png"
done
rsvg-convert -w 512 -h 512 -b '#233c31' nguon/trau.svg -o "$O/_goc.png"
python3 -I - "$O" <<'P'
import sys, glob, os
from PIL import Image, ImageChops, ImageDraw
o = sys.argv[1]
a, b = Image.open(f'{o}/_goc.png').convert('RGB'), Image.open(f'{o}/NGHI.png').convert('RGB')
print('lech NGHI vs V4g (bbox khac):', ImageChops.difference(a, b).getbbox())
ds = sorted(p for p in glob.glob(f'{o}/*.png') if not p.endswith('-sang.png') and '/_' not in p and 'bang' not in p)
W = 300; out = Image.new('RGB', (W * len(ds), W * 2 + 16), (20, 20, 20)); d = ImageDraw.Draw(out)
for i, p in enumerate(ds):
    out.paste(Image.open(p).convert('RGB').resize((W, W)), (i * W, 0))
    out.paste(Image.open(p[:-4] + '-sang.png').convert('RGB').resize((W, W)), (i * W, W))
    d.text((i * W + 4, 2 * W + 2), os.path.basename(p)[:-4], fill=(255, 210, 0))
out.save(f'{o}/bang.png')
P
