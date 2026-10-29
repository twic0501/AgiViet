"""Tự dò số đo tay khớp sao cho tư thế nghỉ trùng tay V4g nhất (so điểm ảnh vùng tay bằng OpenCV).
Chạy bằng python có cv2: cv-env/bin/python do-tay-khop.py nguon/trau.svg → in bộ số tốt nhất + ghi tham-so-tay.json"""
import importlib.util, itertools, json, os, subprocess, sys, tempfile
import cv2, numpy as np

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('tk', os.path.join(here, 'tay-khop.py'))
tk = importlib.util.module_from_spec(spec); spec.loader.exec_module(tk)
svg = sys.argv[1]
tmp = tempfile.mkdtemp()


def ve(path):
    out = path + '.png'
    subprocess.run(['rsvg-convert', '-w', '512', '-b', '#233c31', '-o', out, path], check=True)
    return cv2.imread(out)


goc = ve(svg)
# Vùng hai tay (gồm vai, cổ tay áo, bàn tay) trên khung 512.
VUNG = [(95, 300, 200, 425), (312, 300, 417, 425)]


def lech(img):
    s = 0.0
    for x0, y0, x1, y1 in VUNG:
        a = goc[y0:y1, x0:x1].astype(np.int16); b = img[y0:y1, x0:x1].astype(np.int16)
        s += float(np.mean(np.abs(a - b)))
    return s / len(VUNG)


def thu(p):
    for k, v in p.items():
        setattr(tk, k, v)
    vai = p['VAI']
    tk.VAI_TRAI, tk.VAI_PHAI = (vai[0], vai[1]), (512 - vai[0], vai[1])
    d = os.path.join(tmp, 'x'); os.makedirs(d, exist_ok=True)
    tk.dung(svg, {'NGHI': {'tay-trai': [p['NGHI'], 0, 0], 'tay-phai': [p['NGHI'], 0, 0]}}, d)
    return lech(ve(os.path.join(d, 'NGHI.svg')))


tot = None
luoi = {
    'VAI': [(174, 326), (176, 328), (178, 330)],
    'R_VAI': [15.0, 17.5], 'R_KHUYU': [21.0, 23.0, 25.0], 'R_CO': [23.0, 25.0],
    'L_TREN': [24.0, 28.0], 'L_DUOI': [30.0, 34.0], 'NGHI': [28.0, 31.0, 34.0],
}
keys = list(luoi)
import contextlib, io
for combo in itertools.product(*(luoi[k] for k in keys)):
    p = dict(zip(keys, combo))
    with contextlib.redirect_stdout(io.StringIO()):
        e = thu(p)
    if tot is None or e < tot[0]:
        tot = (e, p); print(f'{e:.3f}', p, flush=True)
json.dump({k: list(v) if isinstance(v, tuple) else v for k, v in tot[1].items()}, open(os.path.join(here, 'tham-so-tay.json'), 'w'), indent=1)
print('tốt nhất', tot)
