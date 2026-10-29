#!/usr/bin/env bash
# Kiểm cổ + khăn: hàng trên = vùng cổ khi nhìn trái/phải/lên/xuống (khăn che kín cổ?), hàng dưới = đầu khăn ở 4 thời điểm (có bay?). Ghép build/kiem-khan.png.
set -euo pipefail
cd "$(dirname "$0")"
RIVE="$HOME/.rive/bin/rive"
"$RIVE" . --screenshot=build/n-trai.png --advance=20 --pointer=move@30,215 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-phai.png --advance=20 --pointer=move@482,215 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-len.png --advance=20 --pointer=move@256,40 >/dev/null 2>&1
"$RIVE" . --screenshot=build/n-xuong.png --advance=20 --pointer=move@256,390 >/dev/null 2>&1
for f in 0 50 100 150; do "$RIVE" . --screenshot=build/k-$f.png --advance=$f >/dev/null 2>&1; done
python3 - <<'E'
from PIL import Image
a = [Image.open(f'build/{f}.png').convert('RGB').crop((150, 230, 370, 350)).resize((440, 240)) for f in ('n-trai', 'n-phai', 'n-len', 'n-xuong')]
b = [Image.open(f'build/k-{f}.png').convert('RGB').crop((150, 280, 300, 470)).resize((220, 280)) for f in (0, 50, 100, 150)]
o = Image.new('RGB', (1790, 530), (0, 0, 0))
for i, x in enumerate(a): o.paste(x, (i * 450, 0))
for i, x in enumerate(b): o.paste(x, (i * 230, 250))
o.save('build/kiem-khan.png')
E
