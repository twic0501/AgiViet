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
# Ống tay: điểm chấm tay theo tâm nét viền trên bảng mẫu (toạ độ khung 512).
# Thứ tự: R1 (gốc vai, phía ngoài) → cạnh A (cạnh ngoài: buông = phía ngoài thân, ngang = trên, cao = phía đầu)
# → C1, cổ tay → C2 → cạnh B → R2. Cạnh gốc R2→R1 không có viền (hoà vào áo như bảng Higgsfield).
ONG = {
 # chính diện buông (người sáng lập 31/10): tay to bằng lúc dang, gốc rộng ở vai, thả dọc hông ĐÈ lên áo
 # (không vẽ kiểu mảnh tách cạnh thân như bảng mẫu) → cùng một form tay ở mọi dáng, giơ lên vẫn liền vai
 ('chinh', 0): [[(166,292),(146,298),(132,318),(125,350),(122,382)], [(166,388)], [(170,360),(175,330),(182,312)]],
 ('chinh', 1): [[(165,304),(130,304),(105,305),(88,306)], [(89,359)], [(120,361),(150,362),(166,362)]],
 ('chinh', 2): [[(166,312),(150,292),(138,282),(128,272)], [(90,300)], [(115,325),(140,348),(165,365)]],
 ('34', 0): [[(288,309),(296,338),(302,367)], [(252,367)], [(247,345),(245,330)]],
 ('34', 1): [[(292,300),(318,299),(342,298)], [(342,350)], [(310,348),(272,345)]],
 ('34', 2): [[(280,330),(284,280),(288,241)], [(338,262)], [(325,295),(310,332)]],
 ('ng', 0): [[(240,318),(232,345),(224,371)], [(296,385)], [(290,345),(282,307)]],
 ('ng', 1): [[(250,296),(200,293),(143,292)], [(150,345)], [(200,342),(248,338)]],
 ('ng', 2): [[(203,310),(170,288),(150,275),(131,262)], [(117,307)], [(140,320),(164,331),(197,353)]],
}
# cổ tay trên ẢNH mẫu khi ONG đã vẽ lại khác ảnh: bàn tay lấy từ ảnh được xoay + dời từ cổ tay ảnh sang cổ tay mới
CO_TAY_ANH = {('chinh', 0): ((121, 363), (156, 389))}
# Chính diện (31/10 tối, người sáng lập duyệt bảng dáng mục đích): dò từ nguon/goc/hf/chinh-dang/d-<dáng>.png —
# tay PHẢI màn hình của bảng Higgsfield lật gương (không bị đuôi khăn che) → đúng form mẫu cả cạnh trong.
# buong/ngang/cao: bản tay chính (3 dáng); chi (ngón trỏ), giay (cầm giấy trước ngực), nghi (chống má): bản tay riêng.
ONG_CHINH = {
 'buong': [[(176,312),(160,326),(142,343),(129,362)], [(165,400)], [(170,375),(177,343),(181,325)]],
 'ngang': [[(176,303),(140,304),(110,305),(94,306)], [(94,358)], [(120,360),(150,361),(178,362)]],
 'cao': [[(174,300),(155,285),(133,268)], [(98,302)], [(120,322),(150,345),(176,364)]],
 'chi': [[(176,300),(150,298),(130,296),(115,295)], [(110,345)], [(135,352),(155,357),(176,362)]],
 'giay': [[(178,306),(158,318),(144,340),(146,362),(160,380),(185,386),(208,379)], [(210,343)], [(192,338),(180,334)]],
 # chống má: chấm theo chiều cẳng tay xoay từ dáng cầm giấy (mép dưới cẳng tay → mép phải, cổ tay dưới → cổ tay phải)
 # để nội suy giay → nghi không xoắn; cánh tay trên khuất sau cẳng tay nên gốc dồn về khuỷu
 'nghi': [[(130,369),(150,371),(166,366),(178,350),(187,331),(187,313)], [(140,293)], [(122,320),(119,340),(124,358),(128,367)]],
}
HAT_CHINH = {'buong': (132, 388), 'ngang': (78, 330), 'cao': (110, 270), 'chi': (97, 320), 'giay': (220, 357),
             'nghi': (173, 280)}
HOP_CHINH = {'chi': (50, 282, 117, 352)}   # khung giới hạn bàn tay (ngón trỏ sát tai → vùng xám dính lông đầu)
SAU_GOC = {'buong': 16, 'ngang': 20, 'cao': 20, 'chi': 20}   # kéo gốc ống tay vào thân (px) — giay/nghi gốc đã sâu
# điểm nằm giữa bàn tay (vùng xám) để lấy đúng mảng bàn tay
HAT = {('chinh', 0): (135, 392), ('chinh', 1): (70, 330), ('chinh', 2): (100, 270),
       ('34', 0): (275, 382), ('34', 1): (358, 320), ('34', 2): (318, 236),
       ('ng', 0): (255, 392), ('ng', 1): (120, 315), ('ng', 2): (105, 285)}
NA, NC, NB, NBAN = 10, 4, 10, 36   # 31/10: giảm điểm cho tệp nhẹ (đủ mịn ở khung 512)
DAI_GOC = 20
P = 4
VIEN = 5.6


def lop(im):
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    nen = (a.sum(-1) > 690)
    toi = a.sum(-1) < 260
    nau = (r - b > 60) & ~toi & ~nen
    xam = (~nen) & (~toi) & (~nau) & (abs(r - g) < 30) & (r < 170)
    return nen, toi, nau, xam


def thanh_phan(m, hat):
    im = Image.fromarray((m * 255).astype(np.uint8)).copy()
    ImageDraw.floodfill(im, hat, 128)
    return np.asarray(im) == 128


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


def catmull(pts, n):
    """đường cong qua các điểm, lấy n điểm đều theo độ dài (gồm cả 2 đầu)"""
    p = np.array(pts, float)
    if len(p) == 2:
        dense = np.linspace(p[0], p[1], 50)
    else:
        q = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]]); dense = []
        for a in range(1, len(q) - 2):
            p0, p1, p2, p3 = q[a - 1], q[a], q[a + 1], q[a + 2]
            for t in np.linspace(0, 1, 20, endpoint=False):
                dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                                    + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
        dense.append(p[-1]); dense = np.array(dense)
    L = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(dense, axis=0).T))])
    t = np.linspace(0, L[-1], n)
    return list(zip(np.interp(t, L, dense[:, 0]).round(2), np.interp(t, L, dense[:, 1]).round(2)))


def mot_tay(im, A, C, B, hat, sau=0, co_tay_anh=None, hop=None, to_ban=1.0):
    """Ống tay (chấm tay A/C/B) + bàn tay (vùng xám quanh hat) trên ảnh 512 → dict ong/ban/goc."""
    c1, c2 = A[-1], C[0]
    A0, B0 = list(A), list(B)        # nét viền dừng ở chỗ tay nối vai (phần kéo sâu vào thân chỉ tô, không viền)
    if sau:
        mx, my = (c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2
        rx, ry = (A[0][0] + B[-1][0]) / 2, (A[0][1] + B[-1][1]) / 2
        L = math.hypot(rx - mx, ry - my); ux, uy = (rx - mx) / L, (ry - my) / L
        A = [(A[0][0] + ux * sau, A[0][1] + uy * sau)] + A
        B = B + [(B[-1][0] + ux * sau, B[-1][1] + uy * sau)]
    ong = catmull(A, NA) + catmull([c1, c2], NC + 2)[1:-1] + catmull([c2] + B, NB)
    vien = catmull(A0, NA) + catmull([c1, c2], NC + 2)[1:-1] + catmull([c2] + B0, NB)
    im = im.resize((512 * P, 512 * P), Image.LANCZOS)
    nen, toi, nau, xam = lop(im)
    if hop:
        m = np.zeros_like(xam); m[hop[1] * P:hop[3] * P, hop[0] * P:hop[2] * P] = True
        ban = tron(xam & m | (toi & m & tron(xam & m, 3 * P)), 2 * P)   # mọi mảng xám trong khung + nét trong
        ban = tron(lap_lo(thanh_phan(ban, (hat[0] * P, hat[1] * P)) if ban[hat[1] * P, hat[0] * P] else ban), 1.5 * P)
    else:
        ban = thanh_phan(xam, (hat[0] * P, hat[1] * P))
        ban = tron(lap_lo(ban), 1.5 * P)
    im2 = Image.fromarray((ban * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * int(VIEN / 2 * P) + 1))
    ban = np.asarray(im2) > 127
    pts = [(x / P, y / P) for x, y in bao(ban)]
    if co_tay_anh:
        (a1, a2) = co_tay_anh
        g0 = math.atan2(a2[1] - a1[1], a2[0] - a1[0]); g1 = math.atan2(c2[1] - c1[1], c2[0] - c1[0])
        co, si = math.cos(g1 - g0), math.sin(g1 - g0)
        am = ((a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2); nm = ((c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2)
        pts = [(nm[0] + co * (x - am[0]) - si * (y - am[1]), nm[1] + si * (x - am[0]) + co * (y - am[1])) for x, y in pts]
    mc = ((c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2)
    if to_ban != 1:   # phóng bàn tay quanh giữa cổ tay (Codex vòng 2: bàn tay nhỏ hơn mẫu)
        pts = [(mc[0] + (x - mc[0]) * to_ban, mc[1] + (y - mc[1]) * to_ban) for x, y in pts]
    return {'ong': ong, 'vien': vien, 'ban': lay_mau(pts, NBAN, mc), 'goc': [(A[0][0] + B[-1][0]) / 2, (A[0][1] + B[-1][1]) / 2]}


def tach(thu_muc):
    out = {}
    for (v, k), (A, C, B) in ONG.items():
        if v == 'chinh':
            continue
        im = Image.open(os.path.join(thu_muc, f'{TEP[v]}-{k}.png')).convert('RGB')
        out[f'{v}-{k}'] = mot_tay(im, A, C, B, HAT[(v, k)])
    for k, (A, C, B) in ONG_CHINH.items():
        im = Image.open(os.path.join(DIR, f'nguon/goc/hf/chinh-dang/d-{k}.png')).convert('RGB')
        out[f'chinh-{k}'] = mot_tay(im, A, C, B, HAT_CHINH[k], SAU_GOC.get(k, 0), hop=HOP_CHINH.get(k), to_ban=1.1)
    out['vien'] = VIEN; out['so'] = [NA, NC, NB]
    p = os.path.join(DIR, 'nguon/goc/tay-morph.json')
    json.dump(out, open(p, 'w'))
    print(p)


if __name__ == '__main__':
    tach(sys.argv[1])
