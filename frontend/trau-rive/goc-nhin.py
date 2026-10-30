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
UON = pchip([-1.15, -1.0, -0.5, 0.0, 0.5, 1.0, 1.15], [-1.12, -0.97, -0.84, -0.55, -0.06, 1.0, 1.15])


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
        return -26 * mem(212, 246, y) * (1 - mem(292, 312, y)) * (1 - mem(200, 250, x))
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
            u = 30 + (u - 30) * 1.14  # neo ở gót (mép phải móng)
            return (x1 - 12 + (tam - x0) * sx + u, y1 + (y - y0))
        return lambda e: 'mong' in e.get('data-role', '') and f
    def xien(f):  # ống quần xiên nhẹ về trái theo hướng quay (gấu lệch 6 px so với hông)
        return lambda x, y: (f(x, y)[0] - 6 * mem(400, 470, y), f(x, y)[1])
    g.append(nhom('chan-xa', (226, 401), 'Chân xa: hẹp hơn, lùi sau', lay('chan-trai', xien(cung(212, 405, 226, 401, 0.9)),
                                                                        rieng=mong_lech(212, 405, 226, 401, 0.9))))
    g.append(nhom('chan-gan', (286, 405), 'Chân gần', lay('chan-phai', xien(cung(298, 405, 286, 405)), rieng=mong_lech(298, 405, 286, 405, lat=True))))
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


def xoay(cx, cy, goc, sx=1.0, sy=1.0, tx=None, ty=None):
    """Xoay quanh (cx,cy) góc độ (chiều kim đồng hồ trên màn hình), co theo trục mới, rồi đặt (cx,cy) về (tx,ty)."""
    a = math.radians(goc); ca, sa = math.cos(a), math.sin(a)
    tx = cx if tx is None else tx; ty = cy if ty is None else ty

    def f(x, y):
        u, v = x - cx, y - cy
        u, v = u * ca - v * sa, u * sa + v * ca
        return (tx + u * sx, ty + v * sy)
    return f


def goc_nghieng():
    """Nghiêng trái dựng TỪ bộ phận V4g (đồng nhất thiết kế): khuôn đầu, áo chữ A, ống quần, móng, tay, tai, đuôi
    đều là hình V4g biến đổi; chỉ vẽ mới phần bắt buộc đổi theo góc (mảng hồng mõm bên hông, sừng nhìn cạnh, khăn)."""
    g = []
    # --- đầu: khuôn V4g co ngang theo chiều sâu 0,9; nửa dưới phía trước nhô thành gò mõm ---
    def go(x, y):
        truoc = (1 - mem(190, 236, x)) * (1 - mem(296, 314, y))
        return (12 * mem(140, 214, y) - 24 * mem(214, 230, y)) * truoc  # trán dựng đứng, bậc rõ vào gò mõm

    def f_dau(x, y):
        return (256 + (x - 256) * 0.9 - 8 + go(x, y), y)

    def sung(dx, dy, ten, nhan, chan_long=True):
        def T(x, y):  # sừng nhìn cạnh: phần chĩa ngang nằm theo trục nhìn, chỉ thấy gốc tròn r≈24 và cung dựng
            return (x + dx, 146 + (y - 146) * 0.74 + dy)
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
            P(bien_d('M264 130Q292 116 320 130Q322 144 292 148Q262 144 264 130Z', T), LONG, w=5.6, stroke='none',
              data_role='long-chan-sung'),
            P(bien_d('M270 129Q292 119 314 129', T), w=2.4, stroke=LONG_TOI, opacity='.30', data_role='bong-chan-sung')]
            [:None if chan_long else -2])

    # --- đuôi V4g, gốc dời ra sau lưng ---
    g.append(nhom('duoi', (324, 410), 'Đuôi phía sau', lay('duoi', cung(328, 406, 324, 410))))
    # --- tay V4g xoay rủ thẳng dưới vai (35°) và rút ngắn 0,85 theo phối cảnh; cổ tay phẳng, khuỷu liền giữ nguyên ---
    def tay(ten, nhan, vai):  # tay trái V4g (bàn tay hướng ra) xoay về trước → bàn tay hướng về phía mặt
        f = xoay(181, 327, -35.3, 1.0, 0.85, *vai)
        vien_trong = P(bien_d('M170.48 363.14C172.5 356 174 348 174.89 341.52C175.4 331.8 178.4 319.2 174.32 313.18', f),
                       w=5.6, stroke_linecap='butt', data_role='vien-trong-tay')
        return nhom(ten, vai, nhan, lay('tay-trai', f) + [vien_trong])
    g.append(tay('tay-xa', 'Tay xa sau thân (khuất); khớp vai', (276, 324)))
    # --- chân: ống quần + móng V4g; móng lật gương để khe móng phía trước, mũi kéo dài 15 % về trái ---
    def chan(ten, nhan, dx, dy, toi=False):
        def f(x, y):
            return (x + dx, y + dy)

        def mong(x, y):
            u = -(x - 307)  # lật quanh tâm móng V4g chân phải
            u = 30 + (u - 30) * 1.15
            return (307 + dx - 6 + u, y + dy)
        c = lay('chan-phai', f, rieng=lambda e: 'mong' in e.get('data-role', '') and mong)
        if toi:
            c.append(P(bien_d('M260 391Q297 386 334 391L337 422L334 468Q301 473 268 468L263 435L252 433L252 418Z', f),
                       VIEN, w=5.6, stroke='none', opacity='.16', data_role='bong-xa'))
        return nhom(ten, f(298, 405), nhan, c)
    g.append(chan('chan-xa', 'Chân xa (sau), tối hơn', -24, -2, toi=True))
    g.append(chan('chan-gan', 'Chân gần (trước)', -46, 0))
    # --- thân: áo chữ A V4g co ngang 0,8 (chiều sâu), bỏ chi tiết mặt trước; nẹp cúc ở mép trước, một túi hông ---
    # áo: uốn trục ngang kiểu quay 90° — nửa trước bên phải trâu ép thành dải mỏng ở mép trước, đường giữa trước
    # (nẹp cúc, khe xẻ gấu x≈264) về sát mép trước, nửa bên trái trâu thành mặt hông
    u90 = pchip([140, 161, 264, 351, 372], [181, 189, 200, 334, 355])
    f_than = lambda x, y: (u90(x), y)
    bo = ('day-quan', 'may-day-quan', 'co-ao', 'cuc-ao', 'tui-trai', 'tui-phai', 'vien-nach-thuot-trai',
          'vien-nach-thuot-phai', 'bong-vat')
    than = lay('than', f_than, bo=bo)
    than += [P(ellipse_d(u90(275.2) + 3, 366.5, 3.4, 5.1), CUC, w=5.6, stroke='none', data_role='cuc-ao'),
             P(ellipse_d(u90(275.2) + 3, 393.9, 3.4, 5.1), CUC, w=5.6, stroke='none', data_role='cuc-ao')]
    than += lay('than', cung_tam(f_than, (323, 384), 0.85), bo=tuple(
        r for r in ('day-quan', 'may-day-quan', 'ao-than', 'vien-ngoai-ao', 'bong-vat', 'co-ao', 'nep-cuc', 'cuc-ao',
                    'tui-trai', 'may-gau', 'vien-nach-thuot-trai', 'vien-nach-thuot-phai')))
    than += [
             P(bien_d('M173 312Q173 328 174.89 341.52C168.31 363.14 163.68 384.77 161.01 406.39', f_than), w=5.6,
               data_role='vien-mep-truoc'),
             P(bien_d('M339 312Q339 328 337.11 341.52C343.69 363.14 348.32 384.77 350.99 406.39', f_than), w=5.6,
               data_role='vien-mep-sau')]
    g.append(nhom('than', f_than(256, 420), 'Thân áo chữ A V4g nhìn ngang: nẹp cúc + khe xẻ ở mép trước, túi hông', than))
    # --- đầu khăn dài buông trước ngực (nhìn cạnh nên hẹp), dài quá gấu áo như V4g ---
    g.append(nhom('khan-dai', (190, 330), 'Đầu khăn dài buông trước ngực (nhìn cạnh)',
                  dai_caro(qb((170, 330), (167, 380), (172, 432)), qb((198, 330), (196, 380), (199, 432)), 7, 2, 3.6) +
                  [P('M176 434L175 443M182 434L181 444M188 434L188 444M194 434L194 443', w=3.4, data_role='tua-vien'),
                   P('M176 435L175 442M182 435L181 443M188 435L188 443M194 435L194 442', w=1.4, stroke=CARO[2],
                     data_role='tua')]))
    g.append(nhom('co', (256, 337), 'Cổ lông sau đầu và khăn', lay('co', lambda x, y: (256 + (x - 256) * 0.85, y))))
    g.append(tay('tay-gan', 'Tay V4g rủ dọc thân; khớp vai, khuỷu liền, cổ tay cắt phẳng', (262, 326)))
    g.append(nhom('khan-co', (262, 322), 'Khăn caro quấn cổ (nhìn ngang)',
                  dai_caro(qb((186, 302), (262, 312), (334, 296)), qb((190, 346), (262, 356), (332, 336)), 7, 3)))
    g.append(sung(5, -1, 'sung-xa', 'Sừng xa nấp sau sừng gần (nhìn ngang đúng trục); vẫn có nhóm để xoay', chan_long=False))
    g.append(nhom('dau-khoi', f_dau(256, 295), 'Khuôn đầu V4g nhìn ngang (vuông bo góc, đỉnh phẳng, chỏm lông)',
                  lay('dau-khoi', f_dau)))
    # mõm: mảng hồng V4g thu theo chiều sâu (0,66, neo mép trước) → mép sau là cung mõm V4g; lỗ mũi ở mặt trước mõm
    neo = f_dau(158, 265)[0]

    def f_mom(x, y):
        x2, y2 = f_dau(x, y)
        return (neo + (x2 - neo) * 0.66, y2)
    mom = lay('mom', f_mom, bo=('lo-mui',))
    mom.insert(2, P(bien_d('M335 235Q356 246 352 265Q349 288 322 296Q330 286 334 266Q338 248 322 238Z', f_mom), AO_TOI,
                    w=5.6, stroke='none', opacity='.16', data_role='bong-khoi-mom'))
    # nhìn ngang lỗ mũi nằm ở mặt trước mõm: lỗ gần hẹp sát mép trước, lỗ xa chỉ hé một vệt ở mép
    x0 = f_mom(160, 259)[0]
    mom += [P(ellipse_d(x0 + 4, 256, 1.9, 6.0, 12), MUI, w=5.6, stroke='none', data_role='lo-mui'),
            P(ellipse_d(x0 + 12, 260, 3.4, 8.0, 14), MUI, w=5.6, stroke='none', data_role='lo-mui')]
    g.append(nhom('mom', f_mom(256, 267), 'Mõm V4g nhìn ngang; hai lỗ mũi (lỗ xa hé ở mép), không có miệng', mom))
    g.append(nhom('vien-cam-truoc', f_dau(256, 295), 'Viền gò mõm và cằm', lay('vien-cam-truoc', f_dau)))
    g.append(sung(0, 0, 'sung-gan', 'Sừng gần, gốc tròn nằm trên mặt bên đầu'))
    # tai V4g (vốn cụp ~25°) xoay ngược 8° cho chĩa ra sau, co 0,8; viền hở ở gốc để chân tai chìm vào đầu
    f_tai = xoay(360, 182, -8, 0.8, 0.95, 302, 188)
    tai = lay('tai-phai', f_tai)
    tai[0].set('stroke', 'none')
    tai.insert(1, P(bien_d('M360 200Q367 223 391 233Q416 245 443 229Q454 218 432 203Q402 181 362 165', f_tai), w=5.6,
                    data_role='vien-tai'))
    g.append(nhom('tai-gan', (302, 190), 'Tai V4g cụp rủ ra sau', tai))
    g.append(nhom('long-may-gan', (190, 166), 'Lông mày', lay('long-may-trai', cung(200, 166, 190, 166))))
    g.append(nhom('mat-gan', (190, 202), 'Mắt: chấm đen, không tròng trắng', lay('mat-trai', cung(200, 202, 190, 202, 0.9))))
    return svg_moi('Trâu V4g — góc nghiêng trái', 'Dựng từ bộ phận V4g; mặt quay về trái màn hình.', g)


if __name__ == '__main__':
    luu(goc_34(), 'trau-34-trai.svg')
    luu(goc_nghieng(), 'trau-nghieng-trai.svg')
