#!/usr/bin/env python3
"""Đồ bộ góc nhìn từ ảnh Higgsfield (docs/trau/tham-chieu/higgsfield-v4g-*.png) → nguon/goc/*.svg.

Dùng: python3 do-goc.py nghieng   (hoặc: 34)
Ảnh nguồn đã cắt sẵn ở nguon/goc/hf/ (cắt từ docs/trau/tham-chieu/higgsfield-v4g-*.png). Toạ độ vùng là khung 512.
"""
import importlib.util

import numpy as np
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('do_anh', os.path.join(DIR, 'do-anh.py'))
do = importlib.util.module_from_spec(sp); sp.loader.exec_module(do)


def trong(tam, x0, y0, x1, y1):
    return x0 <= tam[0] <= x1 and y0 <= tam[1] <= y1


def nghieng():
    """Nghiêng trái theo thiết kế Higgsfield người sáng lập chọn: bảng docs/trau/tham-chieu/goc-nhin-higgsfield-a.png,
    hàng dưới, hình giữa (có đầu khăn dài); đuôi lấy từ hình trái (hình giữa bị che đuôi)."""
    anh = do.Anh(os.path.join(DIR, 'nguon/goc/hf/nghieng-hf-a-giua.png'))
    LONG, KHAN_VUA = '#84736b', '#a09e99'
    svg = os.path.join(DIR, 'nguon/goc/trau-nghieng-trai.svg')
    tay = anh.da_giac([(248, 298), (324, 298), (324, 382), (248, 382)])
    khan_co = anh.da_giac(phang(KHAN_CO_A)[0])
    khan_dai = anh.da_giac(phang(KHAN_DAI_A)[0])
    vung_khan = khan_co | khan_dai

    def chia(t, tam, khung, m):
        (ax, ay), (bx, by) = khung
        if (m & vung_khan).sum() > 0.4 * m.sum():
            return None                                          # khăn đồ tay
        if t == 'sung':
            return 'sung-gan' if tam[1] < 175 else None
        if trong(khung[0], 266, 156, 354, 228) and trong(khung[1], 266, 156, 354, 228):
            return [('tai-gan', m, LONG)] if t == 'long' else [('tai-gan', m, '#9a8079')]
        if t == 'mom':
            if tam[1] < 175:
                return [('sung-gan', m, '#ecd3b6')]
            return 'mom' if trong(tam, 135, 190, 235, 290) and m.sum() > 2000 else None
        if trong(tam, 244, 362, 328, 416) and t in ('long', 'khan-vua', 'khan-sang'):
            return [('tay-gan', m, LONG)]
        if t == 'ao':
            return [('tay-gan', m & tay, None), ('than', m, None)]
        if t == 'long':
            if 270 < tam[1] < 320 and m.sum() < 3000:
                return None
            if tam[1] < 290:
                return 'dau-khoi'
            return None
        if t == 'quan' and tam[1] < 290:
            return [('dau-khoi', m, '#7a6b66')]
        if t in ('quan', 'khan-vua') and trong(tam, 205, 320, 240, 380) and m.sum() < 1500:
            return [('than', m, '#513a25')]                      # cúc áo
        return None

    def toi_rieng(tam, khung):
        if trong(tam, 202, 172, 226, 202):
            return 'mat-gan'
        if trong(tam, 158, 212, 184, 238):
            return 'mom'                                         # lỗ mũi
        if trong(tam, 205, 320, 240, 380):
            return 'than'                                        # cúc áo (mảng tối nhỏ)
        return None

    thu_tu = ['duoi', 'chan-gan', 'than', 'khan-dai', 'tay-gan', 'khan-co', 'dau-khoi', 'mom', 'tai-gan', 'sung-gan',
              'mat-gan']
    goc = {'duoi': (335, 405), 'chan-gan': (284, 405), 'than': (270, 400), 'khan-dai': (205, 312),
           'tay-gan': (285, 302), 'khan-co': (272, 290), 'dau-khoi': (255, 280), 'mom': (180, 240),
           'tai-gan': (280, 180), 'sung-gan': (290, 150), 'mat-gan': (213, 186)}
    do.do_goc(anh, lambda *a: (lambda r: [r] if isinstance(r, tuple) else r)(chia(*a)), thu_tu, goc, svg,
              'Trâu V4g — góc nghiêng trái (đồ từ bảng Higgsfield a)',
              'Đồ từ docs/trau/tham-chieu/goc-nhin-higgsfield-a.png (hàng dưới, hình giữa; đuôi theo hình trái); '
              'màu V4g, nét #24190f ~5,6.', toi_rieng=toi_rieng,
              lot={'dau-khoi': LONG, 'tai-gan': LONG, 'sung-gan': '#fff1dd', 'mom': '#fdcdb0',
                   'khan-co': KHAN_VUA, 'khan-dai': KHAN_VUA},
              them_vung=[('khan-co', khan_co, KHAN_VUA), ('khan-dai', khan_dai, KHAN_VUA),
                         ('chan-gan', anh.da_giac(phang(CHAN_GAN_A['ong'])[0]), '#45423d')],
              bo_net=do.no(vung_khan, 6) | anh.da_giac([(214, 404), (352, 404), (352, 500), (214, 500)]))
    thay_nhom(svg, {'khan-co': khan_tay(KHAN_CO_A), 'khan-dai': khan_tay(KHAN_DAI_A, TUA_A),
                    'chan-gan': chan_tay(**CHAN_GAN_A)})
    chen_nhom(svg, 'than', 'co', (272, 285), [
        '<path d="M214 258Q276 248 338 256Q346 280 338 300Q276 310 216 304Q208 280 214 258Z" fill="#84736b" '
        'stroke="none" data-role="co-lien"/>'], 'Cổ lông sau đầu và khăn: che khe khi đầu nhún')
    chen_nhom(svg, 'mat-gan', 'long-may-gan', (213, 163), [
        '<path d="M204 168Q213 159 223 164" fill="none" stroke="#24190f" stroke-width="3.7" stroke-linecap="round" '
        'data-role="long-may"/>'], 'Lông mày (luật 2; ảnh nguồn không vẽ, thêm theo V4g)')
    chen_nhom(svg, 'chan-gan', 'duoi', (338, 408), [
        f'<path d="{DUOI_A}" fill="none" stroke="#24190f" stroke-width="6.2" stroke-linecap="round" data-role="vien-duoi"/>',
        f'<path d="{DUOI_A}" fill="none" stroke="#84736b" stroke-width="2.3" stroke-linecap="round" data-role="long-duoi"/>',
        f'<path d="{CHUM_DUOI_A}" fill="#292b27" stroke="#24190f" stroke-width="5.0" stroke-linejoin="round" '
        'data-role="chum-long-duoi"/>'], 'Đuôi phía sau (theo hình trái của bảng a)')
    them_vao_nhom(svg, {'than': [
        '<path d="M226 365L254 365L255 383Q240 386 227 383Z" fill="none" stroke="#aa7652" stroke-width="1.9" '
        'stroke-linejoin="round" data-role="tui"/>']})


def ba_tu():
    """¾ trái, từ ảnh 3d_jutsu_angles (docs/trau/tham-chieu/higgsfield-v4g-34-trai-1.png)."""
    anh = do.Anh(os.path.join(DIR, 'nguon/goc/hf/34-hf-trai.png'))
    LONG, KHAN_DAM, KHAN_VUA = '#84736b', '#3b3935', '#a09e99'
    tay = anh.da_giac([(262, 318), (340, 318), (342, 410), (262, 410)])
    # khăn ¾ vỡ mảnh trong ảnh → bao khăn = mọi điểm không phải nền/áo/lông/mõm/sừng trong đa giác cổ khăn, đầu khăn
    la_khan = ~np.isin(anh.lop, [anh.ten.index(t) for t in ('nen', 'ao', 'long', 'mom', 'sung')])
    khan_co = anh.da_giac(phang(KHAN_CO_34)[0])
    khan_dai = anh.da_giac(phang(KHAN_DAI_34)[0])
    vung_khan = khan_co | khan_dai
    chan_xa = anh.da_giac([(150, 395), (243, 395), (243, 500), (150, 500)])

    def chia(t, tam, khung, m):
        (ax, ay), (bx, by) = khung
        if t == 'sung':
            if tam[1] > 200:
                return None                                      # đốm sáng lạc (dưới cằm)
            return 'sung-xa' if tam[0] < 230 else 'sung-gan'
        if t == 'mom':
            return 'mom' if trong(tam, 120, 195, 265, 300) and m.sum() > 3000 else None
        if t == 'long' and ((m & vung_khan).sum() > 0.4 * m.sum() or (283 < tam[1] < 330 and m.sum() < 4000)):
            return None                                          # mảnh lông vụn nằm trong / sát khăn
        if t == 'long':
            if trong(khung[0], 125, 170, 172, 222) and trong(khung[1], 125, 170, 172, 222):
                return 'tai-xa'
            if trong(khung[0], 285, 160, 385, 240) and trong(khung[1], 285, 160, 385, 240):
                return 'tai-gan'
            if tam[1] < 300:
                return 'dau-khoi'
            if trong(tam, 262, 355, 345, 412):
                return 'tay-gan'
            if tam[1] > 455:
                return 'chan-xa' if tam[0] < 243 else 'chan-gan'
            if tam[0] > 318 and 395 < tam[1] < 450:
                return 'duoi'
            if 395 < tam[1] < 480:
                return [('chan-xa' if tam[0] < 243 else 'chan-gan', m, '#45423d')]  # đốm sáng trên ống quần
            return None
        if trong(tam, 262, 360, 345, 412) and t in ('khan-vua', 'khan-sang'):
            return [('tay-gan', m, LONG)]
        if t == 'ao':
            return [('tay-gan', m & tay, None), ('than', m, None)]
        if trong(tam, 150, 278, 345, 330) or trong(tam, 150, 320, 195, 432):
            if t in ('khan-sang', 'khan-vua', 'quan'):
                return None                                      # khăn lấy theo đa giác (them_vung)
        if t in ('khan-sang', 'khan-vua') and trong(tam, 240, 340, 345, 400):
            return [('than', m, '#aa7652')]                      # viền túi áo
        if t == 'quan':
            if tam[0] > 330 and tam[1] < 450:
                return [('duoi', m, '#292b27')]
            if tam[1] > 390:
                return [('chan-xa', m & chan_xa, None), ('chan-gan', m & ~chan_xa, None)]
        return None

    def toi_rieng(tam, khung):
        if trong(tam, 212, 172, 238, 202):
            return 'mat-gan'
        if trong(tam, 150, 172, 180, 202):
            return 'mat-xa'
        if trong(tam, 212, 148, 250, 172):
            return 'long-may-gan'
        if trong(tam, 140, 148, 180, 172):
            return 'long-may-xa'
        return None

    thu_tu = ['duoi', 'chan-xa', 'chan-gan', 'than', 'khan-dai', 'tay-gan', 'khan-co', 'sung-xa', 'tai-xa', 'dau-khoi',
              'mom', 'tai-gan', 'sung-gan', 'long-may-xa', 'mat-xa', 'long-may-gan', 'mat-gan']
    goc = {'duoi': (325, 410), 'chan-xa': (212, 400), 'chan-gan': (280, 400), 'than': (250, 410),
           'khan-dai': (175, 322), 'tay-gan': (300, 330), 'khan-co': (255, 305), 'sung-xa': (178, 150),
           'tai-xa': (165, 190), 'dau-khoi': (245, 290), 'mom': (190, 248), 'tai-gan': (300, 185),
           'sung-gan': (300, 150), 'long-may-xa': (160, 160), 'mat-xa': (165, 187), 'long-may-gan': (231, 160),
           'mat-gan': (225, 187)}
    do.do_goc(anh, lambda *a: (lambda r: [r] if isinstance(r, tuple) else r)(chia(*a)), thu_tu, goc,
              os.path.join(DIR, 'nguon/goc/trau-34-trai.svg'), 'Trâu V4g — góc ¾ trái (đồ từ Higgsfield)',
              'Đồ từ ảnh 3D Jutsu Angles sinh từ V4g (docs/trau/tham-chieu/higgsfield-v4g-34-trai-1.png); '
              'màu V4g, nét #24190f ~5,6.', toi_rieng=toi_rieng,
              lot={'dau-khoi': LONG, 'tai-gan': LONG, 'tai-xa': LONG, 'sung-gan': '#fff1dd', 'sung-xa': '#fff1dd',
                   'khan-co': KHAN_VUA, 'khan-dai': KHAN_VUA, 'chan-xa': '#45423d',
                   'chan-gan': '#45423d', 'mom': '#fdcdb0'}, net_rong={'duoi': 44},
              net_chi_vien=('chan-xa', 'chan-gan'), caro={'khan-co': 12, 'khan-dai': 12},
              them_vung=[('khan-co', khan_co, KHAN_VUA), ('khan-dai', khan_dai, KHAN_VUA)],
              bo_net=do.no(vung_khan, 6) | anh.da_giac([(150, 419), (340, 419), (340, 500), (150, 500)]))
    # khăn và chân: ảnh nguồn vỡ mảnh / có vân vải → đồ tay theo toạ độ đọc trên lưới
    thay_nhom(os.path.join(DIR, 'nguon/goc/trau-34-trai.svg'), {
        'khan-co': khan_tay(KHAN_CO_34), 'khan-dai': khan_tay(KHAN_DAI_34, TUA_34),
        'chan-xa': chan_tay(**CHAN_XA_34), 'chan-gan': chan_tay(**CHAN_GAN_34)})
    chen_nhom(os.path.join(DIR, 'nguon/goc/trau-34-trai.svg'), 'than', 'co', (256, 300), [
        '<path d="M198 262Q260 250 326 256Q336 280 328 304Q260 326 200 318Q192 290 198 262Z" fill="#84736b" '
        'stroke="none" data-role="co-lien"/>'], 'Cổ lông sau đầu và khăn: che khe khi đầu nhún')
    them_vao_nhom(os.path.join(DIR, 'nguon/goc/trau-34-trai.svg'), {'tay-gan': co_tay_phang(*CO_TAY_34)})
    them_vao_nhom(os.path.join(DIR, 'nguon/goc/trau-34-trai.svg'), {'than': [
        '<path d="M234 364L266 363L267 383Q251 388 235 385Z" fill="none" stroke="#aa7652" stroke-width="1.9" '
        'stroke-linejoin="round" data-role="tui"/>']})


# ---------- đồ tay những vùng ảnh nguồn không đồ tự động được (khăn ¾, chân ¾) ----------
import re
from PIL import Image, ImageDraw

VIEN = '#24190f'


def phang(d, buoc=12):
    """Đường M/L/Q/C/Z tuyệt đối → danh sách đa giác (điểm khung 512)."""
    tok = re.findall(r'[MLQCZ]|-?\d*\.?\d+', d)
    out, cur, i, cmd = [], [], 0, None
    while i < len(tok):
        if tok[i] in 'MLQCZ':
            cmd = tok[i]; i += 1
            if cmd == 'Z':
                out.append(cur); cur = []
            continue
        n = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[cmd]
        v = [float(t) for t in tok[i:i + n]]; i += n
        if cmd in 'ML':
            if cmd == 'M' and cur:
                out.append(cur); cur = []
            cur.append((v[0], v[1]))
        else:
            p0 = cur[-1]
            pts = [p0] + [(v[k], v[k + 1]) for k in range(0, n, 2)]
            for k in range(1, buoc + 1):
                t = k / buoc
                q = pts[:]
                while len(q) > 1:
                    q = [((1 - t) * q[j][0] + t * q[j + 1][0], (1 - t) * q[j][1] + t * q[j + 1][1]) for j in range(len(q) - 1)]
                cur.append(q[0])
    if cur:
        out.append(cur)
    return out


def caro_trong(d, o=12, phong=8):
    """Ô caro đậm / sáng (V4g) cắt theo hình d → hai chuỗi d (đồ bằng potrace trên lưới phóng 8 lần)."""
    import numpy as np
    W = 512 * phong
    m = Image.new('L', (W, W), 0)
    for poly in phang(d):
        ImageDraw.Draw(m).polygon([(x * phong, y * phong) for x, y in poly], fill=255)
    m = np.asarray(m) > 0
    ys, xs = np.mgrid[0:W, 0:W]
    ix = (xs // (o * phong)) % 2
    iy = (ys // (o * phong)) % 2
    f = lambda x, y: (x / phong, y / phong)
    dam = do.potrace(m & (ix == 0) & (iy == 0), f)
    sang = do.potrace(m & (ix == 1) & (iy == 1), f)
    return dam, sang


def khan_tay(d, tua=None):
    dam, sang = caro_trong(d)
    o = [f'<path d="{d}" fill="#a09e99" stroke="none" data-role="vai-nen"/>',
         f'<path d="{dam}" fill="#3b3935" stroke="none" data-role="o-dam"/>',
         f'<path d="{sang}" fill="#f8f6ef" stroke="none" data-role="o-sang"/>']
    if tua:
        o += [f'<path d="{tua}" fill="none" stroke="{VIEN}" stroke-width="3.4" stroke-linecap="round" data-role="tua-vien"/>',
              f'<path d="{tua}" fill="none" stroke="#f8f6ef" stroke-width="1.4" stroke-linecap="round" data-role="tua"/>']
    o.append(f'<path d="{d}" fill="none" stroke="{VIEN}" stroke-width="4.8" stroke-linejoin="round" data-role="vien-khan"/>')
    return o


def chan_tay(ong, nep, mong, khe, bong_mong, them=()):
    return [f'<path d="{ong}" fill="#45423d" stroke="{VIEN}" stroke-width="5.6" stroke-linejoin="round" data-role="ong-quan"/>',
            f'<path d="{nep}" fill="none" stroke="#757166" stroke-width="1.6" opacity=".28" data-role="nep-quan"/>',
            *[f'<path d="{t}" fill="none" stroke="{VIEN}" stroke-width="4.6" stroke-linecap="round" data-role="duong-hang"/>'
              for t in them],
            f'<path d="{mong}" fill="#807169" stroke="{VIEN}" stroke-width="5.6" stroke-linejoin="round" data-role="mong-chan"/>',
            f'<path d="{bong_mong}" fill="#6b5d5b" stroke="none" opacity=".20" data-role="bong-mong"/>',
            f'<path d="{khe}" fill="none" stroke="{VIEN}" stroke-width="3.6" stroke-linecap="round" data-role="khe-mong"/>']


def them_vao_nhom(svg, them):
    """Thêm phần đồ tay vào cuối các nhóm (ví dụ túi áo)."""
    s = open(svg).read()
    for bo, con in them.items():
        s, n = re.subn(rf'(<g id="{bo}"[^>]*>.*?)(\n  </g>)', lambda m: m.group(1) + ''.join('\n    ' + c for c in con)
                       + m.group(2), s, count=1, flags=re.S)
        assert n == 1, bo
    open(svg, 'w').write(s)


def chen_nhom(svg, truoc, bo, goc, con, nhan):
    """Chèn nhóm mới ngay trước nhóm `truoc` (thứ tự vẽ: nằm dưới nhóm đó)."""
    s = open(svg).read()
    g = (f'  <g id="{bo}" data-goc="{goc[0]:.2f} {goc[1]:.2f}" aria-label="{nhan}" '
         f'style="transform-box:view-box;transform-origin:{goc[0]:.2f}px {goc[1]:.2f}px">'
         + ''.join('\n    ' + c for c in con) + '\n  </g>\n')
    i = s.index(f'  <g id="{truoc}"')
    open(svg, 'w').write(s[:i] + g + s[i:])


def co_tay_phang(trai, dinh, phai, cat_trai, cat_phai):
    """Luật 3: ống tay cắt phẳng ở cổ tay. Ảnh nguồn có cổ tay là cung vòm (đỉnh bàn tay) → tô màu áo phần
    giữa cung và đường cắt, rồi kẻ đường cắt thẳng bằng nét V4g."""
    (x0, y0), (xd, yd), (x1, y1) = trai, dinh, phai
    cy = 2 * yd - (y0 + y1) / 2 - 3  # điểm điều khiển để cung phủ hết nét vòm cũ
    return [f'<path d="M{x0} {y0}Q{xd} {cy:.1f} {x1} {y1}Z" fill="#c48f65" stroke="none" data-role="lap-vom-co-tay"/>',
            f'<path d="M{cat_trai[0]} {cat_trai[1]}L{cat_phai[0]} {cat_phai[1]}" fill="none" stroke="{VIEN}" '
            f'stroke-width="5.6" stroke-linecap="round" data-role="co-tay-phang"/>']


def thay_nhom(svg, moi):
    """Thay nội dung các nhóm <g id=...> trong tệp SVG bằng phần đồ tay."""
    s = open(svg).read()
    for bo, con in moi.items():
        s, n = re.subn(rf'(<g id="{bo}"[^>]*>).*?(\n  </g>)', lambda m: m.group(1) + ''.join('\n    ' + c for c in con)
                       + m.group(2), s, count=1, flags=re.S)
        assert n == 1, bo
    open(svg, 'w').write(s)


# ¾ trái — toạ độ đọc trên lưới 10 đơn vị phủ ảnh 3D Jutsu (khung 512)
KHAN_CO_34 = ('M184 292Q188 288 198 288L300 281Q316 279 325 275Q335 282 334 292Q333 303 329 308Q312 305 293 307'
              'Q262 314 232 326Q212 334 194 335Q178 332 174 318Q173 300 184 292Z')
KHAN_DAI_34 = ('M174 322L190 326Q191 358 189 384Q187 400 183 410L161 410Q155 378 162 352'
               'Q166 336 174 322Z')
TUA_34 = 'M164 411L163 425M169 411L168 426M174 411L174 425M179 410L179 423'
CO_TAY_34 = ((276, 374), (305, 363), (333, 370), (274, 374), (333, 370))
CHAN_XA_34 = dict(ong='M190 408L245 408L246 432L247 458Q220 462 194 459Q191 434 190 408Z',
                  nep='M197 444Q210 446 223 445',
                  mong='M192 459Q216 456 240 460Q246 467 244 473Q241 479 226 479Q205 481 189 478Q181 475 184 467Q186 461 192 459Z',
                  bong_mong='M186 472Q212 478 242 472Q240 478 226 479Q205 481 189 478Z',
                  khe='M198 466L193 474')
CHAN_GAN_34 = dict(ong='M243 408L325 408Q322 440 320 466Q285 471 249 467L246 440Q245 433 243 430Z',
                   nep='M262 452Q284 454 306 452',
                   mong='M252 467Q282 464 312 467Q320 472 318 480Q315 488 300 489Q272 491 250 488Q241 485 243 477Q245 470 252 467Z',
                   bong_mong='M244 481Q280 488 317 481Q314 488 300 489Q272 491 250 488Z',
                   khe='M262 476L259 484', them=('M218 424Q232 427 243 430',))

# nghiêng trái — toạ độ đọc trên lưới phủ ảnh 3D Jutsu nghiêng (khung 512)
KHAN_CO_NG = ('M186 290Q186 278 200 276L318 273Q328 274 327 290Q327 300 323 305Q306 298 292 297'
              'Q262 297 240 318Q224 328 200 329Q188 326 185 315Z')
KHAN_DAI_NG = 'M183 326L193 330Q192 370 189 408L170 411Q168 380 175 345Q178 334 183 326Z'
TUA_NG = 'M172 412L171 425M176 412L175 426M180 412L180 425M185 411L185 423'
LONG_TAI_NG = 'M256 196Q266 208 280 216Q296 224 308 216Q304 207 290 205Q270 202 256 196Z'
CO_TAY_NG = ((235, 372), (263, 362), (292, 369), (233, 372), (294, 369))
CHAN_XA_NG = dict(ong='M201 406L232 406L232 430L231 460Q220 462 209 460Q205 434 201 406Z',
                  nep='M210 445Q218 446 225 445',
                  mong='M203 458Q218 455 233 458Q236 464 234 469Q231 472 220 472Q205 473 198 470Q193 467 196 462Q198 459 203 458Z',
                  bong_mong='M197 467Q215 471 234 467Q231 472 220 472Q205 473 198 470Z',
                  khe='M207 465L202 471')
CHAN_GAN_NG = dict(ong='M211 406L306 406Q304 440 300 467Q266 470 231 467L223 428L211 421Z',
                   nep='M238 452Q256 454 273 452',
                   mong='M228 467Q262 463 296 467Q302 474 299 481Q296 487 280 487Q250 489 226 486Q218 483 220 476Q222 469 228 467Z',
                   bong_mong='M220 480Q258 487 298 480Q296 487 280 487Q250 489 226 486Z',
                   khe='M236 476L231 483', them=('M211 421Q217 425 223 428',))

# nghiêng trái theo bảng Higgsfield a (hình giữa) — toạ độ đọc trên lưới (khung 512)
DUOI_A = 'M332 414C344 426 358 430 374 423'
CHUM_DUOI_A = 'M371 421Q372 407 385 401Q393 398 397 400Q396 412 388 420Q380 427 371 424Z'
KHAN_CO_A = 'M207 278Q206 268 216 266L332 262Q342 262 341 272L340 292Q300 294 270 300Q236 308 212 310Q205 300 207 278Z'
KHAN_DAI_A = 'M200 312L210 312Q207 350 205 398L185 400Q186 360 192 335Q195 320 200 312Z'
TUA_A = 'M188 401L187 412M193 401L192 413M198 401L198 413M203 400L203 411'
CHAN_GAN_A = dict(ong='M218 400L348 400Q340 412 330 424Q325 440 322 458Q286 462 250 458Q246 440 241 425Q228 414 218 400Z',
                  nep='M262 446Q290 448 316 446',
                  mong='M250 460Q285 457 320 460Q324 470 321 478Q318 485 300 485Q270 486 246 484Q237 481 240 472Q243 463 250 460Z',
                  bong_mong='M239 476Q280 484 322 476Q318 485 300 485Q270 486 246 484Z',
                  khe='M262 469L258 479')


if __name__ == '__main__':
    {'nghieng': nghieng, '34': ba_tu}[sys.argv[1]]()
