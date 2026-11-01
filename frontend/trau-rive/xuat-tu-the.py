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


# Thêm 1/11 (docs/trau/YEU-CAU-THEM-0111.md): (thư mục con, tên, hanh_dong, khung, cỡ px, nhỏ?, định dạng)
VIEC_THEM = [
    ('tu-the', '13-chi-trai', 17, 60, 800, False, 'webp'), ('tu-the', '14-chi-xuong', 18, 60, 800, False, 'webp'),
    ('tu-the', '15-chi-len', 19, 60, 800, False, 'webp'), ('tu-the', '16-cam-tien', 20, 80, 800, False, 'webp'),
    ('tu-the', '17-ky-giay', 21, 80, 800, False, 'webp'), ('tu-the', '18-canh-bao', 22, 80, 800, False, 'webp'),
] + [('tu-the', ten, hd, f, 800, False, 'webp') for ten, hd, f in (
    ('19-can', 25, 60), ('20-xe-tai', 26, 60), ('21-tui-mau', 27, 80), ('22-binh-xit-lich', 28, 80), ('23-tai-nghe', 29, 40),
    ('24-ngon-cai', 30, 80), ('25-binh-tinh', 31, 80), ('26-dong-ho', 32, 80), ('27-non-la', 33, 80),
    ('29-so-sanh', 35, 110))] + [('anh', f'trong-{ten}@{k}x', hd, f, 200 * k, False, 'webp png') for ten, hd, f in
     (('chua-co-nhat-ky', 15, 80), ('chua-co-thong-bao', 23, 100), ('loi', 12, 50)) for k in (2, 3)] \
  + [('anh', f'dau-{ten}@{k}x', hd, f, 48 * k, True, 'webp png toi') for ten, hd, f in
     (('vui', 16, 50), ('lo', 5, 60), ('ngac-nhien', 24, 40), ('ngu', 7, 100)) for k in (2, 3)]


def chup(viec):
    if len(viec) == 3:
        viec = ('tu-the',) + tuple(viec) + (800, False, 'webp')
    thu_muc, ten, hd, f, co, nho, dinh_dang = viec
    env = {**os.environ, 'AGV_V4': '1', 'AGV_CO': str(co), **({'AGV_THU': str(-hd)} if hd < 0 else {'AGV_HD': str(hd)})}
    if nho:
        env.update({'AGV_NHO': '1', 'AGV_ID0': '500000'})
    sc = subprocess.run(['python3', os.path.join(DIR, 'dung-v3.py')], env=env, capture_output=True, text=True, cwd=DIR).stdout
    if nho:   # như dung-v4.sh: nét dày ×1,7 cho cỡ nhỏ
        sc = re.sub(r'thickness="([\d.]+)"', lambda m: f'thickness="{float(m.group(1)) * 1.7:.2f}"', sc)
    nen_ = NEN.replace('x="400" y="400"', f'x="{co / 2}" y="{co / 2}"').replace('width="900" height="900"', f'width="{co * 1.2}" height="{co * 1.2}"')
    anh = []
    for nen, rml in (('toi', sc), ('trang', sc.replace('<StateMachine name="trau"', nen_ + '<StateMachine name="trau"', 1))):
        d = f'{TMP}/{ten}-{nen}'; os.makedirs(d, exist_ok=True)
        open(f'{d}/rive.yaml', 'w').write('name: p\n'); open(f'{d}/scene.rml', 'w').write(rml)
        subprocess.run([R, d, f'--screenshot={d}.png', f'--advance={f}', f'--viewport={co}x{co}'], capture_output=True)
        anh.append(np.asarray(Image.open(f'{d}.png').convert('RGB')).astype(float))
    D, W = anh
    bg = D[1, 1]
    a = np.clip(1 - ((W - D).mean(-1) / (255 - bg.mean())), 0, 1)
    c = np.where(a[..., None] > 1e-3, (D - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-3), 0)
    im = Image.fromarray(np.dstack([np.clip(c, 0, 255), a * 255]).astype(np.uint8), 'RGBA')
    ra = os.path.join(DIR, '../assets/trau', thu_muc); os.makedirs(ra, exist_ok=True)
    cac = [(ten, im)]
    if 'toi' in dinh_dang:   # bản nền tối: viền ngà quanh hình
        from PIL import ImageFilter
        k = max(2, co // 48)
        vien = im.split()[3].filter(ImageFilter.MaxFilter(2 * k + 1))
        nen2 = Image.new('RGBA', im.size, (253, 246, 232, 0)); nen2.putalpha(vien); nen2.alpha_composite(im)
        cac.append((ten.replace('@', '-toi@'), nen2))
    for ten_, im_ in cac:
        if 'webp' in dinh_dang:
            im_.save(f'{ra}/{ten_}.webp', 'WEBP', quality=92, method=6)
        if 'png' in dinh_dang:
            im_.save(f'{ra}/{ten_}.png', optimize=True)
    return ten


if __name__ == '__main__':
    os.makedirs(RA, exist_ok=True)
    with ThreadPoolExecutor(6) as ex:
        print(list(ex.map(chup, TU_THE + VIEC_THEM)))
