#!/usr/bin/env python3
"""Ảnh duyệt góc nhìn: C01 | V4g | góc mới, trên nền sáng và nền tối, kèm phóng to từng vùng (luật 6).

Dùng: python3 soi-goc.py nguon/goc/trau-34-trai.svg   → build/soi-goc/<ten>-duyet.png, <ten>-vung.png
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw

DIR = os.path.dirname(os.path.abspath(__file__))
SANG, TOI = (245, 239, 226), (33, 53, 45)
C01 = os.path.join(DIR, '..', '..', 'docs', 'trau', 'tham-chieu', 'C01-chuan.png')
VUNG = {'mặt': (110, 40, 410, 330), 'vai-tay': (90, 280, 430, 440), 'đáy quần-chân': (150, 370, 420, 500),
        'tai-sừng': (40, 30, 472, 260)}


def ve(svg, nen, w=512):
    out = os.path.join(DIR, 'build', 'soi-goc', '_tmp.png')
    subprocess.run(['rsvg-convert', '-w', str(w), '-h', str(w), '-b', '#%02x%02x%02x' % nen, '-o', out, svg], check=True)
    return Image.open(out).convert('RGB')


def chinh(svg):
    ten = os.path.splitext(os.path.basename(svg))[0]
    ra = os.path.join(DIR, 'build', 'soi-goc'); os.makedirs(ra, exist_ok=True)
    v4g = os.path.join(DIR, 'nguon', 'trau.svg')
    c01 = Image.open(C01).convert('RGBA')
    tam = Image.new('RGB', (512 * 3, 512 * 2 + 30), (60, 60, 60)); d = ImageDraw.Draw(tam)
    for hang, nen in enumerate((SANG, TOI)):
        y = hang * 512
        nc = Image.new('RGBA', c01.size, nen + (255,)); nc.alpha_composite(c01)
        tam.paste(nc.convert('RGB').resize((512, 512)), (0, y))
        tam.paste(ve(v4g, nen), (512, y))
        tam.paste(ve(svg, nen), (1024, y))
    for i, t in enumerate(('C01 chuẩn', 'V4g chính diện', ten)):
        d.text((i * 512 + 8, 1030), t, fill=(255, 210, 0))
    p1 = os.path.join(ra, f'{ten}-duyet.png'); tam.save(p1)
    # phóng to vùng ×2 ở cả hai nền
    to = {n: (ve(svg, n, 1024)) for n in (SANG, TOI)}
    hangs = []
    for ten_v, (x0, y0, x1, y1) in VUNG.items():
        o = [to[n].crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2)) for n in (SANG, TOI)]
        h = Image.new('RGB', (o[0].width * 2 + 10, o[0].height + 24), (60, 60, 60))
        h.paste(o[0], (0, 24)); h.paste(o[1], (o[0].width + 10, 24))
        ImageDraw.Draw(h).text((6, 4), ten_v, fill=(255, 210, 0))
        hangs.append(h)
    W = max(h.width for h in hangs)
    vung = Image.new('RGB', (W, sum(h.height for h in hangs)), (60, 60, 60)); y = 0
    for h in hangs:
        vung.paste(h, (0, y)); y += h.height
    p2 = os.path.join(ra, f'{ten}-vung.png'); vung.save(p2)
    print(p1); print(p2)


if __name__ == '__main__':
    for s in sys.argv[1:]:
        chinh(s)
