#!/usr/bin/env python3
"""Xuất 12 ảnh tư thế trâu (cùng tên bộ cũ frontend/tham-khao/hieu-ung-va-linh-vat/trau/) từ trâu v4 → frontend/assets/trau/tu-the/.
Mỗi ảnh: dựng cảnh với hanh_dong, chụp đúng khung bằng Rive CLI hai lần (nền tối mặc định + nền trắng) → tính alpha
(tách nền theo hiệu hai ảnh) → WebP 800×800 nền trong."""
import os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
DIR = os.path.dirname(os.path.abspath(__file__)); R = os.path.expanduser('~/.rive/bin/rive')
RA = os.path.join(DIR, '../assets/trau/tu-the'); TMP = sys.argv[1] if len(sys.argv) > 1 else '/tmp/xuat-tu-the'
TU_THE = [('01-dung', 0, 60), ('02-chop', 0, 206), ('03-chao', 1, 40), ('04-nghe', -2, 50), ('05-nghi', 6, 72),
          ('06-vui', 16, 50), ('07-lo', 5, 60), ('08-chi', 2, 60), ('09-be', 13, 80), ('10-dien-thoai', 14, 80),
          ('11-mung', 4, 24), ('12-ghi-so', 15, 80)]
NEN = ('<Shape x="400" y="400" name="nen-trang" id="0:999999"><Rectangle width="900" height="900" name="P"/><Fill name="F">'
       '<SolidColor colorValue="FFFFFFFF" name="C"/></Fill></Shape>')


def chup(viec):
    ten, hd, f = viec   # hd < 0: động tác Nghịch số −hd (AGV_THU)
    sc = subprocess.run(['python3', os.path.join(DIR, 'dung-v3.py')], env={**os.environ, 'AGV_V4': '1', 'AGV_CO': '800', **({'AGV_THU': str(-hd)} if hd < 0 else {'AGV_HD': str(hd)})},
                        capture_output=True, text=True, cwd=DIR).stdout
    anh = []
    for nen, rml in (('toi', sc), ('trang', sc.replace('<StateMachine name="trau"', NEN + '<StateMachine name="trau"', 1))):
        d = f'{TMP}/{ten}-{nen}'; os.makedirs(d, exist_ok=True)
        open(f'{d}/rive.yaml', 'w').write('name: p\n'); open(f'{d}/scene.rml', 'w').write(rml)
        subprocess.run([R, d, f'--screenshot={d}.png', f'--advance={f}', '--viewport=800x800'], capture_output=True)
        anh.append(np.asarray(Image.open(f'{d}.png').convert('RGB')).astype(float))
    D, W = anh
    bg = D[2, 2]                                                  # màu nền tối của CLI
    a = 1 - ((W - D).mean(-1) / (255 - bg.mean()))
    a = np.clip(a, 0, 1)
    c = np.where(a[..., None] > 1e-3, (D - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3), 0)
    out = np.dstack([np.clip(c, 0, 255), a * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'{RA}/{ten}.webp', 'WEBP', quality=92, method=6)
    return ten


if __name__ == '__main__':
    os.makedirs(RA, exist_ok=True)
    with ThreadPoolExecutor(6) as ex:
        print(list(ex.map(chup, TU_THE)))
