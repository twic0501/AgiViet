#!/usr/bin/env python3
"""Tay da bọc xương: uốn ĐÚNG các nét tay V4g (không vẽ lại) bằng 2 xương vai→khuỷu→cổ tay, trộn tuyến tính quanh khuỷu.
Dáng nghỉ (0,0) = V4g nguyên bản. Dùng: tay-da.py nguon/trau.svg tu-the.json thu_muc_ra
tu-the.json: {"TEN": {"tay-trai": [vai_do, khuyu_do, co_tay_do], "tay-phai": [...]}}"""
import json, math, re, sys

# Xương tay trái (tọa độ V4g): vai S, khuỷu E, cổ tay W. Tay phải đối xứng qua x = 256.
S, E, W = (172.0, 318.0), (150.0, 352.0), (140.0, 382.0)
VUNG = (0.30, 0.62)   # khoảng t trên trục vai→cổ tay nơi trộn xương trên → xương dưới


def doi(p, ben):
    return p if ben == 'tay-trai' else (512.0 - p[0], p[1])


def quay(p, c, deg):
    a = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


def tron(t):
    t = min(1.0, max(0.0, (t - VUNG[0]) / (VUNG[1] - VUNG[0]))); return t * t * (3 - 2 * t)


def bien(p, ben, vai, khuyu, co, la_ban):
    s, e, w = doi(S, ben), doi(E, ben), doi(W, ben)
    dau = 1 if ben == 'tay-trai' else -1   # tay phải gương → góc ngược chiều
    vai, khuyu, co = vai * dau, khuyu * dau, co * dau
    tren = quay(p, s, vai)
    w2 = quay(quay(w, e, khuyu), s, vai)
    duoi = quay(quay(p, e, khuyu), s, vai)
    if la_ban:   # bàn tay theo xương dưới + xoay cổ tay
        return quay(duoi, w2, co)
    ax, ay = w[0] - s[0], w[1] - s[1]
    t = ((p[0] - s[0]) * ax + (p[1] - s[1]) * ay) / (ax * ax + ay * ay)
    k = tron(t)
    return (tren[0] * (1 - k) + duoi[0] * k, tren[1] * (1 - k) + duoi[1] * k)


def uon_duong(d, f):
    tok = re.findall(r'[MCQLZmclqz]|-?\d*\.?\d+', d); out = []; i = 0
    while i < len(tok):
        c = tok[i]; i += 1
        if c in 'Zz':
            out.append('Z'); continue
        n = {'M': 1, 'L': 1, 'Q': 2, 'C': 3}[c.upper()]
        out.append(c.upper())
        while i < len(tok) and not tok[i].isalpha():
            for _ in range(n):
                x, y = f((float(tok[i]), float(tok[i + 1]))); i += 2
                out.append(f'{x:.2f} {y:.2f}')
    return ' '.join(out)


def uon_nhom(svg, ben, q):
    vai, khuyu, co = (list(q) + [0, 0, 0])[:3]
    i = svg.find(f'id="{ben}"'); i = svg.rfind('<g', 0, i); j = svg.find('</g>', i)

    def thay(m):
        tag = m.group(0); vt = re.search(r'data-role="([^"]+)"', tag)
        la_ban = bool(vt) and vt.group(1) in ('mong-tay', 'bong-tay')
        return re.sub(r' d="([^"]+)"', lambda d: ' d="' + uon_duong(d.group(1), lambda p: bien(p, ben, vai, khuyu, co, la_ban)) + '"', tag)
    return svg[:i] + re.sub(r'<path[^>]*/>', thay, svg[i:j]) + svg[j:]


def ve(svg, tt):
    for ben in ('tay-trai', 'tay-phai'):
        if ben in tt:
            svg = uon_nhom(svg, ben, tt[ben])
    return svg


if __name__ == '__main__':
    goc = open(sys.argv[1], encoding='utf-8').read()
    for ten, tt in json.load(open(sys.argv[2], encoding='utf-8')).items():
        open(f'{sys.argv[3]}/{ten}.svg', 'w', encoding='utf-8').write(ve(goc, tt))
