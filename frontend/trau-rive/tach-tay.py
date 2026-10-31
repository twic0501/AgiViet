#!/usr/bin/env python3
"""Tách tay từ bảng tư thế Higgsfield (đã căn khung 512 bằng cat-bang-tay.py) → nguon/goc/tay-morph.json.

Mỗi góc × dáng (buông 0 / dang ngang 1 / giơ cao 2): trong đa giác thô VUNG, tách 3 lớp theo màu
— 'vien' (cả bóng tay, tô đen = viền), 'ong' (ống tay nâu), 'ban' (bàn tay xám) — rồi lấy đường bao,
lấy mẫu N điểm theo độ dài, bắt đầu ở điểm gần mốc (gốc tay / cổ tay) và cùng chiều → tương ứng điểm–điểm giữa
các dáng để Rive biến hình. GOC_TAY: điểm gốc vai từng dáng (dùng làm tâm quay khi nội suy).
Dùng: python3 tach-tay.py <thư mục ảnh dáng>  (ảnh <goc>-<k>.png do cat-bang-tay.py tạo)
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DIR = os.path.dirname(os.path.abspath(__file__))
TEP = {'chinh': 'chinh', '34': '34', 'ng': 'nghieng-2'}
VUNG = {
 ('chinh', 0): [(178,296),(136,288),(84,322),(64,372),(74,432),(156,432),(160,372),(166,330),(178,320)],
 ('chinh', 1): [(176,296),(68,294),(54,312),(52,364),(163,366),(163,300)],
 ('chinh', 2): [(176,300),(150,300),(136,292),(132,262),(128,232),(68,234),(62,300),(100,310),(148,366),(164,366),(164,330)],
 ('34', 0): [(296,296),(305,300),(306,370),(310,412),(252,414),(246,370),(244,330),(262,310),(290,298)],
 ('34', 1): [(282,294),(345,290),(378,292),(380,356),(344,354),(300,350),(278,348)],
 ('34', 2): [(284,345),(284,300),(290,262),(298,244),(302,216),(318,205),(352,207),(354,262),(332,302),(312,345)],
 ('ng', 0): [(240,306),(286,304),(300,330),(302,392),(292,412),(228,412),(222,376),(232,330)],
 ('ng', 1): [(256,292),(232,290),(146,288),(106,286),(102,352),(146,354),(236,348),(258,342)],
 ('ng', 2): [(176,302),(172,292),(150,276),(134,256),(96,234),(80,252),(94,318),(140,328),(166,340),(178,332)],
}
GOC_TAY = {('chinh', 0): (176, 318), ('chinh', 1): (172, 330), ('chinh', 2): (170, 330),
           ('34', 0): (295, 305), ('34', 1): (283, 320), ('34', 2): (292, 334),
           ('ng', 0): (262, 308), ('ng', 1): (254, 318), ('ng', 2): (176, 318)}
N = {'vien': 72, 'ong': 64, 'ban': 56}
P = 4  # phóng ảnh khi tách


def lop(im):
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    nen = (a.sum(-1) > 690)
    toi = a.sum(-1) < 260
    nau = (r - b > 60) & ~toi & ~nen
    xam = (~nen) & (~toi) & (~nau) & (abs(r - g) < 30) & (r < 170)
    return nen, toi, nau, xam


def thanh_phan_lon(m):
    from collections import deque
    h, w = m.shape; seen = np.zeros_like(m); best = None; bn = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for yy, xx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; q.append((yy, xx))
        if len(pts) > bn: bn, best = len(pts), pts
    o = np.zeros_like(m)
    if best:
        ys, xs = zip(*best); o[list(ys), list(xs)] = True
    return o


def lap_lo(m):
    im = Image.fromarray(np.pad((m * 255).astype(np.uint8), 1)).copy()
    ImageDraw.floodfill(im, (0, 0), 128)
    return np.asarray(im)[1:-1, 1:-1] != 128


def tron(m, r):
    """đóng rồi mở (làm trơn mép) bằng mờ + ngưỡng"""
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im) > 127


def bao(m):
    """Đường bao ngoài của mặt nạ bằng potrace (đường con lớn nhất), làm phẳng thành chuỗi điểm pixel."""
    import re, subprocess, tempfile
    with tempfile.TemporaryDirectory() as td:
        Image.fromarray(((~m) * 255).astype(np.uint8)).convert('1').save(os.path.join(td, 'a.pbm'))
        subprocess.run(['potrace', '-s', '-t', '4', '-a', '1.0', '--flat', '-o', os.path.join(td, 'a.svg'),
                        os.path.join(td, 'a.pbm')], check=True)
        sv = open(os.path.join(td, 'a.svg')).read()
    tx, ty, sx, sy = map(float, re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', sv).groups())
    best = []
    for d in re.findall(r'<path d="([^"]+)"', sv):
        tok = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d); i, cmd, cur, sub, subs = 0, None, (0.0, 0.0), [], []
        while i < len(tok):
            if tok[i].isalpha():
                cmd = tok[i]; i += 1
                if cmd in 'zZ':
                    subs.append(sub); sub = []; continue
            rel = cmd.islower(); c = cmd.lower(); n = {'m': 2, 'l': 2, 'c': 6}[c]
            v = [float(t) for t in tok[i:i + n]]; i += n
            pts = [(v[k] + (cur[0] if rel else 0), v[k + 1] + (cur[1] if rel else 0)) for k in range(0, n, 2)]
            if c == 'm':
                if sub: subs.append(sub)
                sub = [pts[0]]; cmd = 'l' if rel else 'L'
            elif c == 'l':
                sub.append(pts[0])
            else:
                p0 = cur
                for k in range(1, 9):
                    t = k / 8
                    q = [p0] + pts
                    while len(q) > 1:
                        q = [((1 - t) * q[a][0] + t * q[a + 1][0], (1 - t) * q[a][1] + t * q[a + 1][1]) for a in range(len(q) - 1)]
                    sub.append(q[0])
            cur = pts[-1]
        if sub: subs.append(sub)
        for sb in subs:
            if len(sb) > len(best): best = sb
    return [(tx + sx * x, ty + sy * y) for x, y in best]


def lay_mau(pts, n, moc, ccw=True):
    p = np.array(pts, float)
    if len(p) < 3: return [(0, 0)] * n
    area = 0.5 * np.sum(p[:-1, 0] * p[1:, 1] - p[1:, 0] * p[:-1, 1])
    if (area < 0) != (not ccw): p = p[::-1]
    i0 = int(np.argmin(((p - np.array(moc)) ** 2).sum(1)))
    p = np.vstack([p[i0:], p[:i0], p[i0:i0+1]])
    seg = np.hypot(*np.diff(p, axis=0).T); L = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, L[-1], n, endpoint=False)
    x = np.interp(t, L, p[:, 0]); y = np.interp(t, L, p[:, 1])
    return list(zip(x.round(2), y.round(2)))


def tach(thu_muc):
    out = {}
    for (v, k), poly in VUNG.items():
        im = Image.open(os.path.join(thu_muc, f'{TEP[v]}-{k}.png')).convert('RGB')
        im = im.resize((512 * P, 512 * P), Image.LANCZOS)
        vm = Image.new('L', (512 * P, 512 * P), 0)
        ImageDraw.Draw(vm).polygon([(x * P, y * P) for x, y in poly], fill=255)
        vm = np.asarray(vm) > 0
        nen, toi, nau, xam = lop(im)
        vien = tron(lap_lo(thanh_phan_lon(vm & ~nen)), 2 * P / 4)
        ong = tron(lap_lo(thanh_phan_lon(vm & nau)), 1.5 * P / 4)
        ban = tron(lap_lo(thanh_phan_lon(vm & xam)), 1.5 * P / 4)
        goc = GOC_TAY[(v, k)]
        ys, xs = np.nonzero(ban); cb = (xs.mean() / P, ys.mean() / P)
        moc_ban = (goc[0], goc[1])          # điểm bàn tay gần vai nhất = phía cổ tay
        r = {}
        for ten, m, moc in (('vien', vien, goc), ('ong', ong, goc), ('ban', ban, moc_ban)):
            pts = [(x / P, y / P) for x, y in bao(m)]
            r[ten] = lay_mau(pts, N[ten], moc)
        out[f'{v}-{k}'] = r
    out['goc'] = {f'{v}-{k}': p for (v, k), p in GOC_TAY.items()}
    p = os.path.join(DIR, 'nguon/goc/tay-morph.json')
    json.dump(out, open(p, 'w'))
    print(p)


if __name__ == '__main__':
    tach(sys.argv[1])
