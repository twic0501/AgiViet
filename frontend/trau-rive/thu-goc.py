"""Thử nhiều bộ góc cho một cánh tay, xuất lưới ảnh để chọn bằng mắt.
Dùng: python3 thu-goc.py <tay-trai|tay-phai> <truoc:0|1> 'vai1,vai2' 'khuyu1,khuyu2' 'co' 'keo,keo_duoi' ra.png"""
import importlib.util, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('tk', os.path.join(here, 'tay-khop.py'))
tk = importlib.util.module_from_spec(spec); spec.loader.exec_module(tk)
tay, truoc, vais, khuyus, co, keo, ra = sys.argv[1:8]
vais = [float(x) for x in vais.split(',')]; khuyus = [float(x) for x in khuyus.split(',')]
keo = [float(x) for x in keo.split(',')]
khac = 'tay-trai' if tay == 'tay-phai' else 'tay-phai'
tt = {}
for v in vais:
    for k in khuyus:
        p = {khac: [30, 0, 0], tay: [v, k, float(co)] + keo}
        if truoc == '1': p[tay + '-truoc'] = True
        tt[f'{int(v)}_{int(k)}'] = p
d = tempfile.mkdtemp(); tk.dung(os.path.join(here, 'nguon/trau.svg'), tt, d)
W = 260
o = Image.new('RGB', (W * len(khuyus), (W + 16) * len(vais)), (35, 60, 49)); dr = ImageDraw.Draw(o)
for i, v in enumerate(vais):
    for j, k in enumerate(khuyus):
        f = os.path.join(d, f'{int(v)}_{int(k)}.svg'); png = f + '.png'
        subprocess.run(['rsvg-convert', '-w', str(W), '-b', '#233c31', '-o', png, f], check=True)
        o.paste(Image.open(png).convert('RGB'), (j * W, i * (W + 16))); dr.text((j * W + 4, i * (W + 16) + W), f'vai {int(v)} khuyu {int(k)}', fill=(255, 210, 0))
o.save(ra); print(ra)
