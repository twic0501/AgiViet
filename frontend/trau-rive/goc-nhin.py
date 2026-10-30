#!/usr/bin/env python3
"""Sinh bộ góc nhìn trâu từ V4g (nguon/trau.svg) → nguon/goc/*.svg.

Dùng: python3 goc-nhin.py            → nguon/goc/trau-34-trai.svg, nguon/goc/trau-nghieng-trai.svg

Quy ước "trái" = mặt trâu quay về phía TRÁI màn hình (huong < 0). Lật gương là có góc phải.
Tên bộ phận theo gần/xa người xem: *-gan (phía thân trâu bên trái, gần người xem), *-xa (bị che một phần).
Mỗi nhóm giữ quy ước V4g: id, data-goc (điểm xoay), transform-origin → tao-canh.py đọc được.

- ¾ trái: lấy NGUYÊN hình học V4g, uốn trục ngang bằng hàm đơn điệu (thân tròn xoay ~30°):
  mặt/mõm/cúc dồn trái, phía xa co lại, phía gần giãn; mõm nhô qua viền má trái.
  Sừng, tai, tay, chân là bộ phận V4g dời + co ngang cứng (không méo nét).
- Nghiêng trái: vẽ lại theo dáng nghiêng (tham khảo Higgsfield bảng a), màu và nét V4g.
Nét luôn nướng thẳng vào toạ độ (không dùng transform) để độ dày nét giữ 5,6 / 3,6 như V4g.
"""
import copy
import math
import os
import re
import xml.etree.ElementTree as ET

DIR = os.path.dirname(os.path.abspath(__file__))
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
VIEN = '#24190f'
LONG, LONG_TOI = '#84736b', '#6b5d5b'
AO, AO_TOI, AO_MAY = '#c48f65', '#aa7652', '#986b4c'
QUAN, MONG, MOM, MUI = '#45423d', '#807169', '#fdcdb0', '#401a02'
SUNG, SUNG_TOI, TAI_HONG, CUC = '#fff1dd', '#dbc1a2', '#c49a94', '#513a25'
CARO = ('#3b3935', '#a09e99', '#f8f6ef')


# ---------- đường SVG: đọc, biến đổi điểm, ghi ----------
def doc(d):
    tok = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    out, i, cmd, cur = [], 0, None, (0, 0)
    while i < len(tok):
        if tok[i].isalpha():
            cmd = tok[i]; i += 1
            if cmd == 'Z':
                out.append(('Z', [])); continue
        n = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'Q': 4}[cmd]
        v = [float(t) for t in tok[i:i + n]]; i += n
        if cmd == 'H':
            out.append(('L', [(v[0], cur[1])]))
        elif cmd == 'V':
            out.append(('L', [(cur[0], v[0])]))
        else:
            out.append((cmd, [(v[k], v[k + 1]) for k in range(0, n, 2)]))
            if cmd == 'M':
                cmd = 'L'
        if out[-1][1]:
            cur = out[-1][1][-1]
    return out


def ghi(cs):
    return ''.join(c + ' '.join(f'{x:.2f} {y:.2f}' for x, y in p) for c, p in cs)


def bien_d(d, f):
    return ghi([(c, [f(x, y) for x, y in p]) for c, p in doc(d)])


def ellipse_d(cx, cy, rx, ry, goc=0.0):
    k = 0.5523
    a = math.radians(goc); ca, sa = math.cos(a), math.sin(a)

    def P(x, y):
        return (cx + x * ca - y * sa, cy + x * sa + y * ca)
    def diem(t):
        return (rx * math.cos(t), ry * math.sin(t))

    def tiep(t):
        return (-rx * math.sin(t), ry * math.cos(t))
    s = [('M', [P(rx, 0)])]
    for j in range(4):
        t0, t1 = j * math.pi / 2, (j + 1) * math.pi / 2
        p0, p1, d0, d1 = diem(t0), diem(t1), tiep(t0), tiep(t1)
        c1 = (p0[0] + k * d0[0], p0[1] + k * d0[1])
        c2 = (p1[0] - k * d1[0], p1[1] - k * d1[1])
        s.append(('C', [P(*c1), P(*c2), P(*p1)]))
    s.append(('Z', []))
    return ghi(s)


def bien_phan_tu(e, f):
    """Trả bản sao phần tử với hình học đã biến đổi; ellipse → path."""
    e = copy.deepcopy(e)
    tag = e.tag.split('}')[1]
    if tag == 'ellipse':
        g = 0.0
        m = re.match(r'rotate\(([-\d.]+)', e.get('transform', ''))
        if m:
            g = float(m.group(1))
        d = ellipse_d(float(e.get('cx')), float(e.get('cy')), float(e.get('rx')), float(e.get('ry')), g)
        a = {k: v for k, v in e.attrib.items() if k not in ('cx', 'cy', 'rx', 'ry', 'transform')}
        e = ET.Element(f'{{{NS}}}path', a)
        e.set('d', d)
    e.set('d', bien_d(e.get('d'), f))
    return e


# ---------- hàm uốn trục ngang (nội suy đơn điệu PCHIP) ----------
def pchip(xs, ys):
    h = [xs[i + 1] - xs[i] for i in range(len(xs) - 1)]
    dl = [(ys[i + 1] - ys[i]) / h[i] for i in range(len(h))]
    m = [dl[0]] + [0.0] * (len(xs) - 2) + [dl[-1]]
    for i in range(1, len(xs) - 1):
        if dl[i - 1] * dl[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i])

    def f(x):
        if x <= xs[0]:
            return ys[0] + m[0] * (x - xs[0])
        if x >= xs[-1]:
            return ys[-1] + m[-1] * (x - xs[-1])
        i = max(j for j in range(len(xs) - 1) if xs[j] <= x)
        t = (x - xs[i]) / h[i]
        h00, h10, h01, h11 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t, -2 * t**3 + 3 * t**2, t**3 - t**2
        return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    return f


# u = (x - tâm)/bán kính, chính diện → ¾ trái (~30°). Viền hai bên gần giữ nguyên, đường giữa dời về −0,42.
UON = pchip([-1.15, -1.0, -0.5, 0.0, 0.5, 1.0, 1.15], [-1.12, -0.97, -0.81, -0.48, 0.04, 1.0, 1.15])


def uon(cx, R, them=None):
    def f(x, y):
        x2 = cx + R * UON((x - cx) / R)
        if them:
            x2 += them(x, y)
        return (x2, y)
    return f


def mem(a, b, v):
    t = min(1, max(0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------- nhóm ----------
def nhom(id_, goc, nhan, con, rieng=False):
    a = {'id': id_, 'data-goc': f'{goc[0]:.2f} {goc[1]:.2f}', 'aria-label': nhan,
         'stroke': VIEN, 'stroke-width': '5.6', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
         'style': f'transform-box:view-box;transform-origin:{goc[0]:.2f}px {goc[1]:.2f}px'}
    g = ET.Element(f'{{{NS}}}g', a)
    for c in con:
        g.append(c)
    return g


def P(d, fill='none', stroke=None, w=None, **kw):
    a = {'d': d, 'fill': fill}
    a['stroke'] = stroke if stroke else ('none' if fill != 'none' and w is None else VIEN)
    if w is not None:
        a['stroke-width'] = str(w)
    for k, v in kw.items():
        a[k.replace('_', '-')] = str(v)
    return ET.Element(f'{{{NS}}}path', a)


def svg_moi(tieu_de, mo_ta, nhoms):
    s = ET.Element(f'{{{NS}}}svg', {'viewBox': '0 0 512 512', 'width': '512', 'height': '512', 'role': 'img'})
    ET.SubElement(s, f'{{{NS}}}title').text = tieu_de
    ET.SubElement(s, f'{{{NS}}}desc').text = mo_ta
    for g in nhoms:
        s.append(g)
    return s


def luu(s, ten):
    ET.indent(s, '  ')
    p = os.path.join(DIR, 'nguon', 'goc', ten)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    ET.ElementTree(s).write(p, encoding='utf-8', xml_declaration=True)
    print(p)


V4G = {g.get('id'): g for g in ET.parse(os.path.join(DIR, 'nguon', 'trau.svg')).getroot().iter(f'{{{NS}}}g') if g.get('id')}


def lay(id_, f, bo=(), rieng=None):
    """Mọi phần tử con (kể cả nhóm con khăn) của nhóm V4g, đã biến đổi, phẳng hoá.
    rieng(e) → hàm biến đổi riêng cho phần tử đó (None = dùng f)."""
    out = []
    for e in V4G[id_]:
        if e.tag.endswith('}g'):  # nhóm con (chuỗi khớp khăn dài) giữ nguyên, điểm xoay đi theo biến đổi
            con = ET.Element(e.tag, {k: v for k, v in e.attrib.items()})
            gx, gy = f(*map(float, e.get('data-goc').split()))
            con.set('data-goc', f'{gx:.2f} {gy:.2f}')
            for c in lay(e.get('id'), f, bo, rieng):
                con.append(c)
            out.append(con)
        elif e.get('data-role') not in bo:
            out.append(bien_phan_tu(e, (rieng and rieng(e)) or f))
    return out


def theo_tam(f, x0, y0, x1, y1):
    """Nét thon (viền nách): đường tâm (x0,y0)→(x1,y1) đi theo hàm uốn, bề dày giữ nguyên."""
    def g(x, y):
        t = (y - y0) / (y1 - y0)
        xc = x0 + (x1 - x0) * t
        return (f(xc, y)[0] + (x - xc), y)
    return g


def cung_tam(f, tam, sx=1.0, sy=1.0):
    """Dời nguyên khối: tâm đi theo hàm uốn f, hình giữ dạng (chỉ co ngang sx) → mắt, mày, lỗ mũi không méo."""
    m = f(*tam)
    return cung(tam[0], tam[1], m[0], m[1], sx, sy)


def cung(x0, y0, x1, y1, sx=1.0, sy=1.0):
    """Biến đổi cứng: điểm (x0,y0) → (x1,y1), co theo trục."""
    return lambda x, y: (x1 + (x - x0) * sx, y1 + (y - y0) * sy)


# ====================== ¾ TRÁI ======================
def goc_34():
    TX = 256
    # thân, cổ, khăn: tâm 256, bán kính 95
    f_than = uon(TX, 95)
    # đầu: bán kính 111; mõm và má dưới bên trái nhô ra (gò mõm phá viền má)
    def go_mom(x, y):
        return -20 * mem(212, 250, y) * (1 - mem(292, 312, y)) * (1 - mem(200, 250, x))
    f_dau = uon(TX, 111, go_mom)

    def f_dau_ngoai(x, y):  # dời cả đầu lên trên trục thân một chút sang trái
        x2, y2 = f_dau(x, y)
        return (x2 - 4, y2)

    g = []
    g.append(nhom('duoi', (334, 406), 'Đuôi phía sau', lay('duoi', cung(328, 406, 334, 406))))
    # tay xa: sau thân, co ngang
    # Tay: ống tay xô dọc — ở vai dời theo vai áo đã uốn, ở cổ tay theo mép ngoài thân áo (không hở vai);
    # bàn tay dời nguyên khối theo cổ tay → giữ đúng cỡ V4g, hai tay cùng cỡ. Tay xa thụt 6 px vào sau thân.
    def xo(vai, mep, them=0.0):
        d0 = f_than(*vai)[0] - vai[0] + them
        d1 = f_than(*mep)[0] - mep[0] + them

        def f(x, y):
            t = min(1, max(0, (y - vai[1]) / (mep[1] - vai[1])))
            return (x + d0 + (d1 - d0) * t, y)

        def rieng(e):
            return e.get('data-role') in ('mong-tay', 'bong-tay') and cung(0, 0, d1, 0)
        return f, rieng
    xo_xa, ban_xa = xo((173, 313), (161, 407), 6)
    xo_gan, ban_gan = xo((339, 313), (351, 407))
    vai_xa = xo_xa(181, 327)
    g.append(nhom('tay-xa', vai_xa, 'Tay xa sau thân; khớp vai', lay('tay-trai', xo_xa, rieng=ban_xa)))
    def mong_lech(x0, y0, x1, y1, sx=1.0, lat=False):
        """Móng chĩa trái: lệch trái 8 px so với ống quần, mũi móng kéo dài 8 % về trái (neo gót bên phải);
        lat=True lật gương móng chân gần để khe móng nằm phía trái như chân xa."""
        tam = x0 + 10  # tâm móng V4g lệch ra ngoài điểm xoay chân ~10 px
        def f(x, y):
            u = (x - tam) * sx
            if lat:
                u = -u
            u = 30 + (u - 30) * 1.08  # neo ở gót (mép phải móng)
            return (x1 - 8 + (tam - x0) * sx + u, y1 + (y - y0))
        return lambda e: 'mong' in e.get('data-role', '') and f
    g.append(nhom('chan-xa', (226, 401), 'Chân xa: hẹp hơn, lùi sau', lay('chan-trai', cung(212, 405, 226, 401, 0.9),
                                                                        rieng=mong_lech(212, 405, 226, 401, 0.9))))
    g.append(nhom('chan-gan', (286, 405), 'Chân gần', lay('chan-phai', cung(298, 405, 286, 405), rieng=mong_lech(298, 405, 286, 405, lat=True))))
    vai_gan = xo_gan(330, 327)
    dem_vai = P(bien_d('M322 310L346 314L354 352L326 352Z', xo_gan), AO, w=5.6, stroke='none', data_role='dem-vai')
    g.append(nhom('tay-gan', vai_gan, 'Tay gần; khớp vai (đệm vai kín khe khi thân uốn)',
                  [dem_vai] + lay('tay-phai', xo_gan, rieng=ban_gan)))
    def rieng_than(e):
        vai = e.get('data-role', '')
        if vai == 'tui-trai':  # túi giữ dáng V4g, chỉ co theo mặt áo đã xoay
            return cung_tam(f_than, (207, 385), 0.62)
        if vai == 'tui-phai':
            return cung_tam(f_than, (323, 384), 0.95)
        return vai.startswith('vien-nach') and (xo_xa if vai.endswith('trai') else xo_gan)
    g.append(nhom('than', f_than(256, 420), 'Thân áo ¾: nẹp cúc dồn trái, túi xa co, túi gần gần đủ cỡ',
                  lay('than', f_than, rieng=rieng_than)))
    g.append(nhom('co', f_than(256, 337), 'Cổ lông sau đầu và khăn', lay('co', f_than)))
    g.append(nhom('khan-dai', f_than(184, 312), 'Đầu khăn dài buông phía xa (bên phải trâu)', lay('khan-dai', cung_tam(f_than, (184, 312), 0.8))))
    g.append(nhom('khan-co', f_than(256, 322), 'Khăn caro quấn cổ', lay('khan-co', f_than)))
    # sừng, tai phía xa: ngay trước khuôn đầu trong thứ tự vẽ (vẫn nằm sau đầu) → tao-canh gom cả cụm đầu đúng lớp
    g.append(nhom('sung-xa', (184, 147), 'Sừng xa; gốc sau khuôn đầu',
                  lay('sung-trai', cung(162, 143, 184, 147, 0.68, 0.96))))
    g.append(nhom('tai-xa', (170, 188), 'Tai xa cụp ngang, khuất một phần sau đầu',
                  lay('tai-trai', cung(152, 182, 170, 188, 0.72, 0.96))))
    g.append(nhom('sung-gan', (334, 143), 'Sừng gần; gốc sau khuôn đầu',
                  lay('sung-phai', cung(350, 143, 334, 143, 0.95, 1.0))))
    g.append(nhom('tai-gan', (348, 183), 'Tai gần cụp ngang',
                  lay('tai-phai', cung(360, 182, 348, 183, 0.92, 1.0))))
    g.append(nhom('dau-khoi', f_dau_ngoai(256, 295), 'Khuôn đầu ¾, gò mõm nhô trái', lay('dau-khoi', f_dau_ngoai) + [
        P(bien_d('M330 116Q350 136 355 168L367 238Q370 272 350 290Q336 302 316 307Q344 282 345 242L337 170Q335 140 330 116Z',
                 f_dau_ngoai), LONG_TOI, w=5.6, stroke='none', opacity='.16', data_role='ma-gan')]))
    mep = f_dau_ngoai(158, 265)[0]

    def f_mom(x, y):  # mõm thu hẹp 0,86 neo ở mép gò mõm bên trái: phần mõm xa nhô, phần gần lùi vào má
        x2, y2 = f_dau_ngoai(x, y)
        return (mep + (x2 - mep) * 0.86, y2)
    g.append(nhom('mom', f_mom(256, 267), 'Mõm ¾; đúng hai lỗ mũi (xa co hẹp), không có miệng', lay('mom', f_mom, rieng=lambda e:
                      e.get('data-role') == 'lo-mui' and cung_tam(f_mom, (float(e.get('cx')), float(e.get('cy'))),
                                                                 0.72 if float(e.get('cx')) < 256 else 1.0))))
    g.append(nhom('vien-cam-truoc', f_dau_ngoai(256, 295), 'Viền cằm và gò mõm', lay('vien-cam-truoc', f_dau_ngoai)))
    for v, ten in (('trai', 'xa'), ('phai', 'gan')):
        gx = 200 if v == 'trai' else 312
        sx = 0.72 if ten == 'xa' else 1.0
        g.append(nhom(f'long-may-{ten}', f_dau_ngoai(gx, 166), f'Lông mày {ten}',
                      lay(f'long-may-{v}', cung_tam(f_dau_ngoai, (gx, 166), sx))))
        g.append(nhom(f'mat-{ten}', f_dau_ngoai(gx, 202), f'Mắt {ten}: chấm đen, không tròng trắng',
                      lay(f'mat-{v}', cung_tam(f_dau_ngoai, (gx, 202), sx))))
    return svg_moi('Trâu V4g — góc ¾ trái', 'Uốn từ V4g: mặt quay về trái màn hình khoảng 30°. Bộ phận tách sẵn để dựng Rive.', g)


# ====================== NGHIÊNG TRÁI ======================
def qb(p0, p1, p2):
    return lambda t: ((1 - t)**2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0],
                      (1 - t)**2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1])


def dai_caro(tren, duoi, ncot, nhang, vien=4.8, dong_dau=True):
    """Dải caro 3 màu như V4g giữa hai mép cong tren(t), duoi(t); ô (chẵn,chẵn) đậm, (lẻ,lẻ) trắng, còn lại xám."""
    out = []

    def pt(t, s):
        a, b = tren(t), duoi(t)
        return (a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s)
    for i in range(ncot):
        for j in range(nhang):
            t0, t1, s0, s1 = i / ncot, (i + 1) / ncot, j / nhang, (j + 1) / nhang
            ts = [t0 + (t1 - t0) * k / 4 for k in range(5)]
            vong = [pt(t, s0) for t in ts] + [pt(t, s1) for t in reversed(ts)]
            mau = CARO[0] if (i % 2, j % 2) == (0, 0) else CARO[2] if (i % 2, j % 2) == (1, 1) else CARO[1]
            out.append(P('M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in vong) + 'Z', mau, w=3.6, stroke='none',
                         data_role=f'caro-{i}-{j}'))
    n = 24
    vien_d = ('M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in [tren(k / n) for k in range(n + 1)] +
                             [duoi(k / n) for k in range(n, -1, -1)]) + 'Z')
    out.append(P(vien_d, w=vien, data_role='vien-khan'))
    return out


def goc_nghieng():
    g = []
    # --- sừng (dựng đứng: phần chĩa ngang của sừng V4g nằm theo trục nhìn nên khuất) ---
    def sung(dx, dy, ten, nhan):
        def T(x, y):  # ép dọc quanh gốc: chóp sừng chỉ cao hơn đỉnh đầu chừng như V4g
            return (x + dx, 146 + (y - 146) * 0.8 + dy)
        d = ('M316 128C322 100 318 70 302 48C294 36 284 28 276 26C266 24 261 32 267 42C275 56 278 74 274 92'
             'C272 104 268 114 268 124C270 134 282 138 292 138C302 138 314 134 316 128Z')
        return nhom(ten, T(292, 128), nhan, [
            P(bien_d(d, T), SUNG, w=5.6, stroke='none', data_role='sung-chinh'),
            P(bien_d('M268 129C268 127 268 126 268 124C268 114 272 104 274 92C278 74 275 56 267 42C261 32 266 24 276 26'
                     'C284 28 294 36 302 48C318 70 322 100 316 128L316 130', T), w=5.6, data_role='vien-sung'),
            P(bien_d('M272 118C274 132 284 141 296 141C308 140 314 132 314 122C306 132 290 134 272 118Z', T), SUNG_TOI,
              w=5.6, stroke='none', opacity='.30', data_role='bong-sung'),
            P(bien_d('M284 42Q300 62 300 96M281 66Q290 84 288 110M302 72Q310 96 306 124', T), w=1.1, stroke=SUNG_TOI,
              opacity='.46', data_role='van-sung'),
            P(bien_d('M264 126Q292 142 320 126Q320 142 292 146Q264 142 264 126Z', T), LONG, w=5.6, stroke='none',
              data_role='long-chan-sung'),
            P(bien_d('M270 130Q292 142 314 130', T), w=2.4, stroke=LONG_TOI, opacity='.22', data_role='bong-chan-sung')])
    # --- đuôi ---
    dd = 'M326 412C342 430 350 446 370 446C386 446 396 438 402 430'
    g.append(nhom('duoi', (326, 412), 'Đuôi phía sau', [
        P(dd, w=6.2, data_role='vien-duoi'), P(dd, w=2.3, stroke=LONG_TOI.replace('6b5d5b', '84736b'), data_role='long-duoi'),
        P('M396 434Q398 420 414 415Q419 430 404 439Z', '#292b27', VIEN, 5.0, data_role='chum-long-duoi'),
        P('M403 431L409 423', w=1.5, stroke='#4b4b45')]))

    # --- tay (nhìn ngang): ống tay rủ dọc thân, cổ tay cắt phẳng, bàn tay nghiêng ---
    def tay(dx, dy, ten, nhan):
        def T(x, y):
            return (x + dx, y + dy)
        return nhom(ten, T(270, 326), nhan, [
            P(bien_d('M250 386Q272 381 295 386Q302 399 298 411Q295 420 287 418Q283 425 274 422Q267 427 259 420'
                     'Q250 418 248 407Q246 396 250 386Z', T), LONG, VIEN, 5.6, data_role='mong-tay'),
            P(bien_d('M252 400Q272 404 296 400L296 408Q290 414 284 412Q276 418 268 414Q258 416 252 410Z', T),
              LONG_TOI, w=5.6, stroke='none', opacity='.34', data_role='bong-tay'),
            P(bien_d('M246 320Q270 312 294 321Q302 356 297 393L247 393Q239 356 246 320Z', T), AO, w=5.6,
              stroke='none', data_role='ao-tay'),
            P(bien_d('M282 330Q294 360 291 388L297 393Q302 356 294 321Z', T), AO_TOI, w=5.6, stroke='none',
              opacity='.18', data_role='bong-tay-ao'),
            P(bien_d('M244 330Q239 360 247 393L297 393Q302 356 295 330', T), w=5.6, stroke_linecap='butt',
              data_role='vien-ngoai-tay'),
            P(bien_d('M252 386Q272 389 292 386', T), w=1.35, stroke=AO_MAY, opacity='.55', data_role='duong-may-tay'),
            P(bien_d('M291 352Q283 357 279 366', T), w=1.35, stroke=AO_TOI, opacity='.45', data_role='nep-khuyu')])
    g.append(tay(10, -2, 'tay-xa', 'Tay xa sau thân (khuất); khớp vai'))

    # --- chân (nhìn ngang): mũi móng chĩa trái ---
    def chan(dx, dy, ten, nhan, toi=False):
        def T(x, y):
            return (x + dx, y + dy)
        c = [P(bien_d('M204 466Q238 460 274 466Q282 476 279 485Q277 491 262 491L214 491Q200 490 199 480Q199 470 204 466Z', T),
               MONG, VIEN, 5.6, data_role='mong-chan'),
             P(bien_d('M204 480Q238 487 277 480Q276 488 262 489L214 489Q203 488 204 480Z', T), LONG_TOI, w=5.6,
               stroke='none', opacity='.20', data_role='bong-mong'),
             P(bien_d('M212 398L272 398L274 470Q244 474 214 470Z', T), QUAN, w=5.6, stroke='none', data_role='ong-quan'),
             P(bien_d('M213 410L214 470Q244 474 274 470L272 410', T), w=5.6, data_role='vien-quan'),
             P(bien_d('M216 462Q244 466 272 462L272 467Q244 470 216 467Z', T), VIEN, w=5.6, stroke='none',
               opacity='.10', data_role='bong-gau'),
             P(bien_d('M220 452Q240 454 262 452', T), w=1.6, stroke='#757166', opacity='.28', data_role='nep-quan')]
        if toi:
            c.append(P(bien_d('M212 398L272 398L274 470Q244 474 214 470Z', T), VIEN, w=5.6, stroke='none',
                       opacity='.16', data_role='bong-xa'))
        return nhom(ten, T(243, 405), nhan, c)
    g.append(chan(22, -2, 'chan-xa', 'Chân xa (sau)', toi=True))
    g.append(chan(0, 0, 'chan-gan', 'Chân gần (trước)'))

    # --- thân áo ---
    than = 'M203 312Q264 302 326 310Q339 360 343 410Q306 424 264 424Q222 424 191 414Q187 384 191 356Q195 330 203 312Z'
    g.append(nhom('than', (262, 420), 'Thân áo nhìn ngang: nẹp cúc ở mép trước, một túi bên hông', [
        P(than, AO, VIEN, 5.6, data_role='ao-than'),
        P('M326 316Q337 362 339 408Q324 415 308 418Q322 364 312 316Z', AO_TOI, w=5.6, stroke='none', opacity='.13',
          data_role='bong-lung'),
        P('M205 336L199 410', w=1.7, opacity='.68', data_role='nep-cuc'),
        P(ellipse_d(208, 366, 3.8, 5.1), CUC, w=5.6, stroke='none', data_role='cuc-ao'),
        P(ellipse_d(206, 394, 3.8, 5.1), CUC, w=5.6, stroke='none', data_role='cuc-ao'),
        P('M214 377L238 380L238 394Q226 398 215 395Z', w=1.9, stroke=AO_TOI, data_role='tui'),
        P('M198 410Q262 420 336 406', w=1.1, stroke=AO_TOI, opacity='.45', data_role='may-gau')]))
    # --- đầu khăn dài: buông trước ngực, nhìn cạnh nên hẹp ---
    g.append(nhom('khan-dai', (196, 326), 'Đầu khăn dài buông trước ngực (nhìn cạnh)',
                  dai_caro(qb((176, 330), (173, 380), (178, 432)), qb((204, 330), (202, 380), (205, 432)), 7, 2, 3.6) +
                  [P('M182 434L181 443M188 434L187 444M194 434L194 444M200 434L200 443', w=3.4, data_role='tua-vien'),
                   P('M182 435L181 442M188 435L187 443M194 435L194 443M200 435L200 442', w=1.4, stroke=CARO[2],
                     data_role='tua')]))
    g.append(nhom('co', (264, 337), 'Cổ lông sau đầu và khăn', [
        P('M210 290Q262 280 318 290Q326 312 316 334Q262 344 210 334Q200 312 210 290Z', LONG, w=5.6, stroke='none',
          data_role='co-lien')]))
    g.append(tay(0, 0, 'tay-gan', 'Tay gần rủ dọc thân; khớp vai, khuỷu liền, cổ tay cắt phẳng'))
    g.append(nhom('khan-co', (262, 318), 'Khăn caro quấn cổ (nhìn ngang)',
                  dai_caro(qb((190, 300), (262, 308), (334, 292)), qb((194, 348), (262, 358), (332, 336)), 7, 3)))
    g.append(sung(13, -3, 'sung-xa', 'Sừng xa, khuất gần hết sau sừng gần'))
    # --- đầu: hộp bo tròn, gò mõm nhô trước-dưới, chỏm lông trên đỉnh ---
    dau = ('M196 114Q204 108 212 105Q216 98 224 98Q218 92 214 90Q228 89 237 94Q241 85 250 81Q250 89 247 95'
           'Q260 87 274 85Q270 93 264 98Q276 97 286 100Q340 104 352 140Q364 186 358 240Q352 288 312 304'
           'Q262 318 206 312Q160 308 142 290Q126 270 134 248Q144 224 176 218Q181 180 184 150Q188 124 196 114Z')
    g.append(nhom('dau-khoi', (262, 295), 'Khuôn đầu nhìn ngang, chỏm lông trên đỉnh', [
        P(dau, LONG, VIEN, 5.6),
        P('M338 128Q356 180 352 240Q346 286 306 302Q338 280 340 240Q344 180 326 132Z', LONG_TOI, w=5.6, stroke='none',
          opacity='.12')]))
    g.append(nhom('mom', (190, 266), 'Mõm hồng nhìn ngang; hai lỗ mũi (lỗ xa chỉ hé ở chóp), không có miệng', [
        P('M176 218Q144 224 134 248Q126 270 142 290Q160 308 206 312Q238 312 244 294Q250 268 234 244Q214 220 176 218Z',
          MOM, w=5.6, stroke='none'),
        P('M140 278Q154 300 202 305Q232 306 242 296Q236 312 206 312Q160 308 140 278Z', AO_TOI, w=5.6, stroke='none',
          opacity='.10'),
        P(ellipse_d(141, 259, 2.9, 6.4, 8), MUI, w=5.6, stroke='none', data_role='lo-mui'),
        P(ellipse_d(160, 263, 5.2, 8.4, -14), MUI, w=5.6, stroke='none', data_role='lo-mui')]))
    g.append(nhom('vien-cam-truoc', (206, 290), 'Viền gò mõm và cằm, vẽ đè lên mõm', [
        P('M176 218Q144 224 134 248Q126 270 142 290Q160 308 206 312Q262 318 312 304', w=5.6,
          data_role='vien-cam-truoc')]))
    g.append(sung(0, 0, 'sung-gan', 'Sừng gần, gốc tròn nằm trên mặt bên đầu'))
    g.append(nhom('tai-gan', (290, 184), 'Tai gần cụp ra sau, phá viền gáy', [
        P('M286 176Q306 166 334 174Q364 184 373 208Q364 229 334 224Q302 218 288 200Q280 186 286 176Z', LONG, w=5.6,
          stroke='none', data_role='tai-chinh'),
        P('M299 170Q316 166 334 174Q364 184 373 208Q364 229 334 224Q311 220 297 209', w=5.6, data_role='vien-tai'),
        P('M300 199Q322 192 354 208Q361 216 350 219Q322 218 300 199Z', TAI_HONG, w=5.6, stroke='none', opacity='.34',
          data_role='long-tai-hong'),
        P('M292 186Q322 196 356 211', w=2.5, data_role='nep-tai'),
        P('M292 185Q302 198 318 205Q302 207 292 191Z', VIEN, w=5.6, stroke='none', opacity='.10', data_role='bong-goc-tai')]))
    g.append(nhom('long-may-gan', (210, 166), 'Lông mày', [P('M200 170Q209 161 220 167', w=3.7)]))
    g.append(nhom('mat-gan', (212, 196), 'Mắt: chấm đen, không tròng trắng',
                  [P(ellipse_d(212, 196, 6.4, 13.6), VIEN, w=5.6, stroke='none', data_role='mat')]))
    return svg_moi('Trâu V4g — góc nghiêng trái', 'Vẽ lại theo dáng nghiêng, màu và nét V4g; mặt quay về trái màn hình.', g)


if __name__ == '__main__':
    luu(goc_34(), 'trau-34-trai.svg')
    luu(goc_nghieng(), 'trau-nghieng-trai.svg')
