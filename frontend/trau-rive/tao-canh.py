#!/usr/bin/env python3
"""Sinh scene.rml (Rive) cho trâu C01 từ trau.svg vector có bộ phận tách sẵn (Codex vẽ).

Dùng: python3 tao-canh.py nguon/trau.svg > scene.rml
- Mỗi <g id=...> của SVG thành một Node đặt tại điểm xoay data-goc; hình bên trong tính tương đối với điểm xoay,
  nên xoay/co giãn Node là xoay quanh khớp (vai, hông, gốc tai, cổ...).
- Đường SVG (M L H V C Q Z, tuyệt đối/tương đối) đổi thành PointsPath với CubicDetachedVertex/StraightVertex.
- Rive vẽ phần tử khai báo TRƯỚC nằm TRÊN (ngược SVG) nên thứ tự bộ phận được đảo.
- Nền caro (pattern) tạm tô màu nền khăn; lớp bóng mờ (gradient) bỏ qua ở bản thử.
- Chuyển động nghỉ: thở, chớp mắt, tai, đuôi, nhìn qua lại kiểu giả 3D (mắt+mõm trượt nhiều, tai ít và trễ).
"""
import copy
import json
import os
import math
import re
import sys
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/2000/svg}'
_id = [100]


def moi_id():
    _id[0] += 1
    return f'0:{_id[0]}'


def mau(hex_, alpha=1.0):
    h = hex_.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return f'{round(alpha * 255):02X}{h.upper()}'


def doc_duong(d):
    """Trả danh sách đường con; mỗi đường con = (các nút [điểm, tay_vào, tay_ra], đóng?)."""
    tok = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    i, cmd = 0, None
    cur = (0.0, 0.0)
    batdau = (0.0, 0.0)
    cac, nut, dong = [], [], False

    def so():
        nonlocal i
        v = float(tok[i]); i += 1
        return v

    def ket_thuc():
        nonlocal nut, dong
        if nut:
            cac.append((nut, dong))
        nut, dong = [], False

    while i < len(tok):
        if re.match(r'[A-Za-z]', tok[i]):
            cmd = tok[i]; i += 1
            if cmd in 'Zz':
                if nut and len(nut) > 1 and math.dist(nut[-1][0], nut[0][0]) < 0.01:
                    nut[0][1] = nut[-1][1]; nut.pop()
                dong = True; cur = batdau
                ket_thuc()
                continue
        tg = cmd in 'mlhvcqs' if cmd else False
        ox, oy = cur if tg else (0.0, 0.0)
        C = cmd.upper()
        if C == 'M':
            ket_thuc()
            p = (ox + so(), oy + so()); cur = batdau = p
            nut.append([p, None, None])
            cmd = 'l' if tg else 'L'
        elif C == 'L':
            p = (ox + so(), oy + so()); nut.append([p, None, None]); cur = p
        elif C == 'H':
            x = so() + (cur[0] if tg else 0); p = (x, cur[1]); nut.append([p, None, None]); cur = p
        elif C == 'V':
            y = so() + (cur[1] if tg else 0); p = (cur[0], y); nut.append([p, None, None]); cur = p
        elif C == 'C':
            c1 = (ox + so(), oy + so()); c2 = (ox + so(), oy + so()); p = (ox + so(), oy + so())
            nut[-1][2] = c1; nut.append([p, c2, None]); cur = p
        elif C == 'Q':
            q = (ox + so(), oy + so()); p = (ox + so(), oy + so()); p0 = cur
            c1 = (p0[0] + 2 / 3 * (q[0] - p0[0]), p0[1] + 2 / 3 * (q[1] - p0[1]))
            c2 = (p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1]))
            nut[-1][2] = c1; nut.append([p, c2, None]); cur = p
        else:
            raise ValueError('lệnh SVG chưa hỗ trợ: ' + cmd)
    ket_thuc()
    return cac


def dinh(p, vao, ra, gx, gy):
    x, y = p[0] - gx, p[1] - gy
    if vao is None and ra is None:
        return f'<StraightVertex x="{x:.2f}" y="{y:.2f}"/>'

    def goc(c):
        if c is None:
            return 0.0, 0.0
        return math.atan2(c[1] - p[1], c[0] - p[0]), math.dist(c, p)
    ir, idist = goc(vao)
    orr, odist = goc(ra)
    return (f'<CubicDetachedVertex x="{x:.2f}" y="{y:.2f}" inRotation="{ir:.5f}" inDistance="{idist:.2f}" '
            f'outRotation="{orr:.5f}" outDistance="{odist:.2f}"/>')


def thuoc_tinh(el, ke):
    """Gộp thuộc tính trình bày kế thừa từ nhóm."""
    a = dict(ke)
    for k in ('fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity'):
        if el.get(k) is not None:
            a[k] = el.get(k)
    return a


def son(a):
    out = []
    f = a.get('fill', '#000000')
    if f and f != 'none':
        if f.startswith('url(#caro'):
            f = '#f8f6ef'
        if not f.startswith('url('):
            al = float(a.get('fill-opacity', 1)) * float(a.get('opacity', 1))
            out.append(f'<Fill name="Fill"><SolidColor colorValue="{mau(f, al)}" name="Màu"/></Fill>')
    s = a.get('stroke')
    if s and s != 'none' and not s.startswith('url('):
        cap = {'round': 'round', 'square': 'square'}.get(a.get('stroke-linecap', 'butt'), 'butt')
        join = {'round': 'round', 'bevel': 'bevel'}.get(a.get('stroke-linejoin', 'miter'), 'miter')
        out.append(f'<Stroke thickness="{float(a.get("stroke-width", 1)):.2f}" cap="{cap}" join="{join}" name="Viền">'
                   f'<SolidColor colorValue="{mau(s, float(a.get("opacity", 1)))}" name="Màu"/></Stroke>')
    return ''.join(out)  # trong một Shape: khai báo sau nằm trên → viền sau fill


def hinh(el, ke, gx, gy, ten):
    a = thuoc_tinh(el, ke)
    tag = el.tag.replace(NS, '')
    if tag == 'path':
        cac = doc_duong(el.get('d'))
        duong = ''.join(
            f'<PointsPath isClosed="{"true" if dong else "false"}" name="P{k}">'
            + ''.join(dinh(p, vao, ra, gx, gy) for p, vao, ra in nut) + '</PointsPath>'
            for k, (nut, dong) in enumerate(cac))
        return f'<Shape x="0" y="0" name="{ten}">{duong}{son(a)}</Shape>'
    if tag == 'ellipse':
        cx, cy = float(el.get('cx')), float(el.get('cy'))
        rx, ry = float(el.get('rx')), float(el.get('ry'))
        rot = 0.0
        m = re.match(r'rotate\(([-\d.]+)', el.get('transform', ''))
        if m:
            rot = math.radians(float(m.group(1)))
        return (f'<Shape x="{cx - gx:.2f}" y="{cy - gy:.2f}" rotation="{rot:.5f}" name="{ten}">'
                f'<Ellipse width="{2 * rx:.2f}" height="{2 * ry:.2f}" name="P"/>{son(a)}</Shape>')
    if tag == 'rect':
        x, y = float(el.get('x', 0)), float(el.get('y', 0))
        w, h = float(el.get('width')), float(el.get('height'))
        return (f'<Shape x="{x + w / 2 - gx:.2f}" y="{y + h / 2 - gy:.2f}" name="{ten}">'
                f'<Rectangle width="{w:.2f}" height="{h:.2f}" name="P"/>{son(a)}</Shape>')
    return ''


LONG = {}  # nhóm con có id + data-goc (vd khan-dai-1 > khan-dai-2) → (id Rive, x, y tuyệt đối) để làm chuỗi xoay


KHOP = {}  # nhóm có transform và id (khớp tay/chân) → id Rive, để làm hoạt ảnh xoay


def bien_doi(t):
    """'translate(a b) rotate(r) scale(sx sy)' → danh sách (loai, so...) theo thứ tự (ngoài → trong)."""
    out = []
    for ten, so in re.findall(r'(translate|rotate|scale)\(([^)]*)\)', t or ''):
        v = [float(x) for x in re.split(r'[ ,]+', so.strip()) if x]
        out.append((ten, v))
    return out


def nhom_bien_doi(c, a, ten, ruot_fn):
    """Một <g transform> → chuỗi Node lồng nhau; Node trong cùng mang id của nhóm (nếu có)."""
    bd = bien_doi(c.get('transform'))
    if not bd:
        bd = [('translate', [0, 0])]
    mo, dong = '', ''
    for i, (loai, v) in enumerate(bd):
        trong_cung = i == len(bd) - 1
        nid = moi_id()
        if trong_cung and c.get('id'):
            KHOP[c.get('id')] = nid
        if loai == 'translate':
            if c.get('id'):  # nút dời của khớp (khuỷu/cổ tay) — dời theo độ dài ống khi kéo dài tay
                KHOP[c.get('id') + '#dich'] = nid
            thuoc = f'x="{v[0]:.2f}" y="{(v[1] if len(v) > 1 else 0):.2f}"'
        elif loai == 'rotate':
            thuoc = f'rotation="{math.radians(v[0]):.5f}"'
        else:
            thuoc = f'scaleX="{v[0]:.4f}" scaleY="{(v[1] if len(v) > 1 else v[0]):.4f}"'
        mo += f'<Node {thuoc} name="{(c.get("id") if trong_cung and c.get("id") else ten)}" id="{nid}">'
        dong = '</Node>' + dong
    return mo + ruot_fn(thuoc_tinh(c, a)) + dong


def ruot_nhom(g, a, gx, gy, tien_to):
    """Nội dung con của một nhóm (đệ quy cho nhóm có transform), toạ độ tương đối (gx, gy)."""
    phan = []
    for k, c in enumerate(x for x in g if x.tag.replace(NS, '') in ('path', 'ellipse', 'rect', 'g')):
        if c.tag.replace(NS, '') == 'g' and c.get('transform'):
            phan.append(nhom_bien_doi(c, a, f'{tien_to}-{k}', lambda a2, c=c, k=k: ruot_nhom(c, a2, 0.0, 0.0, f'{tien_to}-{k}')))
        elif c.tag.replace(NS, '') == 'g':
            phan.append(ruot_nhom(c, thuoc_tinh(c, a), gx, gy, f'{tien_to}-{k}'))
        else:
            phan.append(hinh(c, a, gx, gy, f'{tien_to}-{k}'))
    return ''.join(reversed(phan))


def bo_phan(g, ke):
    gx, gy = map(float, g.get('data-goc', '256 256').split())
    a = thuoc_tinh(g, ke)
    if g.get('transform'):  # bộ phận khớp nối (tay/chân từ tay-khop.py): toạ độ con đã tương đối theo transform
        bd = bien_doi(g.get('transform'))
        # bỏ translate ngoài cùng (vị trí đã là data-goc), giữ các bước còn lại (scale lật gương…)
        g2 = copy.copy(g); g2.attrib = dict(g.attrib)
        g2.set('transform', ' '.join(f'{l}({" ".join(str(x) for x in v)})' for l, v in bd if l != 'translate') or 'translate(0 0)')
        # giữ id: nút trong cùng được ghi vào KHOP (bật/tắt cả nhóm, vd bàn tay nổi)
        return gx, gy, nhom_bien_doi(g2, a, g.get('id') + '-goc', lambda a2: ruot_nhom(g, a2, 0.0, 0.0, g.get('id')))
    con = [c for c in g if c.tag.replace(NS, '') in ('path', 'ellipse', 'rect', 'g')]
    phan = []
    for k, c in enumerate(con):
        if c.tag.replace(NS, '') == 'g' and c.get('transform'):
            phan.append(nhom_bien_doi(c, a, f'{g.get("id")}-{k}', lambda a2, c=c, k=k: ruot_nhom(c, a2, 0.0, 0.0, f'{g.get("id")}-{k}')))
        elif c.tag.replace(NS, '') == 'g' and c.get('id') and c.get('data-goc'):
            cx, cy, ruot = bo_phan(c, a)
            cid = moi_id(); LONG[c.get('id')] = (cid, cx, cy)
            phan.append(f'<Node x="{cx - gx:.2f}" y="{cy - gy:.2f}" name="{c.get("id")}" id="{cid}">{ruot}</Node>')
        elif c.tag.replace(NS, '') == 'g':
            a2 = thuoc_tinh(c, a)
            phan += [hinh(cc, a2, gx, gy, f'{g.get("id")}-{k}-{j}') for j, cc in enumerate(c)]
        else:
            phan.append(hinh(c, a, gx, gy, f'{g.get("id")}-{k}'))
    return gx, gy, ''.join(reversed(phan))  # đảo: SVG vẽ sau nằm trên, Rive khai báo trước nằm trên


def khung(obj, prop, cac, ease='0.42 0 0.58 1'):
    x1, y1, x2, y2 = ease.split()
    kf = ''.join(
        f'<KeyFrameDouble value="{v:.4f}" frame="{f}" interpolationType="cubic">'
        f'<CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/></KeyFrameDouble>'
        for f, v in cac)
    return f'<KeyedObject objectId="{obj}"><KeyedProperty property="{prop}">{kf}</KeyedProperty></KeyedObject>'


def main():
    svg = ET.parse(sys.argv[1]).getroot()
    ke = {}
    long_trong = {c.get('id') for g in svg.iter(NS + 'g') if g.get('data-goc') for c in g.iter(NS + 'g') if c is not g}
    nhom = [g for g in svg.iter(NS + 'g') if g.get('id') and g.get('data-goc') and g.get('id') != 'khuon-mat-clip'
            and g.get('id') not in long_trong]
    # --- Khung xương: nhóm "đầu" tại điểm cổ chứa khuôn đầu, sừng, tai, mõm, mắt, lông mày (tai/sừng gắn chết vào đầu).
    DAU_CON = ['dau-khoi', 'sung-trai', 'sung-phai', 'tai-trai', 'tai-phai', 'mom', 'long-may-trai', 'long-may-phai',
               'mat-trai', 'mat-phai', 'vien-cam-truoc']
    # Nhìn theo con trỏ kiểu Muza: chỉ nét mặt trượt trong khuôn đầu (mõm ít nhất để không lòi ra ngoài đầu).
    NHIN = {}  # thay bằng Joystick tư thế (xem 'Nhìn ngang'/'Nhìn dọc')
    diem_nhin, vung_cham, kich_hoat, dau_id = moi_id(), moi_id(), moi_id(), moi_id()
    lo_mui = [(float(e.get('cx')), float(e.get('cy'))) for e in svg.iter(NS + 'ellipse') if e.get('data-role') == 'lo-mui']
    vi_tri, ids, noi = {}, {}, {}
    for g in nhom:
        gx, gy, noi_dung = bo_phan(g, ke)
        ten = g.get('id'); ids[ten] = moi_id(); vi_tri[ten] = (gx, gy); noi[ten] = noi_dung
    for ten, (cid, cx, cy) in LONG.items():
        ids[ten] = cid; vi_tri[ten] = (cx, cy)
    # Vòng khăn kéo giãn lên một chút để mép trên luôn nằm sát dưới cằm, che kín hai bên cổ.
    if 'khan-co' in vi_tri:
        vi_tri['khan-co'] = (vi_tri['khan-co'][0], vi_tri['khan-co'][1] - 3)
    hx, hy = vi_tri.get('dau-khoi', (256, 300))
    hoi = {}

    def nut(ten, goc=(0, 0)):
        gx, gy = vi_tri[ten]
        rb = (f'<TranslationConstraint targetId="{diem_nhin}" strength="{NHIN[ten]}" name="Nhìn"/>' if ten in NHIN else '')
        them = ''
        if ten == 'mom':  # hơi thở là con của mõm → luôn phả ra từ lỗ mũi, kể cả khi mặt trượt theo con trỏ
            for k2, (mx, my) in enumerate(lo_mui[:2]):
                tn = 'hoi-trai' if mx < 256 else 'hoi-phai'; hoi[tn] = (moi_id(), mx - gx, my + 10 - gy, -1 if mx < 256 else 1)
                hid, lx, ly, huong = hoi[tn]
                cum = ''.join(f'<Shape x="{dx}" y="{dy}" name="{tn}-{j}"><Ellipse width="{w}" height="{w * .8:.1f}" name="P"/>'
                              f'<Fill name="F"><SolidColor colorValue="B8C9D6D8" name="C"/></Fill></Shape>'
                              for j, (dx, dy, w) in enumerate(((0, 0, 12), (6 * huong, 6, 9), (-2 * huong, 9, 7))))
                them += f'<Node x="{lx:.2f}" y="{ly:.2f}" scaleX="0.4" scaleY="0.4" opacity="0" name="{tn}" id="{hid}">{cum}</Node>'
        ruot = noi[ten]
        if ten.startswith('tai-'):  # tai lồng 2 lớp: ngoài xoay theo hướng nhìn, trong tự vẫy (không đè nhau)
            ids[ten + '/ve'] = moi_id()
            ruot = f'<Node name="{ten}-ve" id="{ids[ten + "/ve"]}">{ruot}</Node>'
        co_gian = ' scaleX="1.04" scaleY="1.16"' if ten == 'khan-co' else ''
        return f'<Node x="{gx - goc[0]:.2f}" y="{gy - goc[1]:.2f}"{co_gian} name="{ten}" id="{ids[ten]}">{them}{ruot}{rb}</Node>'

    trong_dau = [nut(t, (hx, hy)) for t in [g.get('id') for g in nhom] if t in DAU_CON]
    nodes, da_dat_dau = [], False
    for g in nhom:
        t = g.get('id')
        if t in DAU_CON:
            if not da_dat_dau:
                nodes.append(f'<Node x="{hx:.2f}" y="{hy:.2f}" name="dau" id="{dau_id}">{"".join(reversed(trong_dau))}</Node>')
                da_dat_dau = True
            continue
        nodes.append(nut(t))
    nodes.reverse()  # bộ phận khai báo trước nằm trên
    nodes.insert(0, f'<Node x="256" y="215" name="diem-nhin" id="{diem_nhin}"/>')
    nodes.insert(0, f'<Shape x="256" y="256" name="vung-cham" id="{vung_cham}"><Rectangle width="512" height="512" name="P"/>'
                    f'<Fill name="F"><SolidColor colorValue="01FFFFFF" name="C"/></Fill></Shape>')

    def co(ten):
        return ten in ids

    def cuc(ten):  # vị trí cục bộ (con của đầu thì tính từ cổ)
        gx, gy = vi_tri[ten]
        return (gx - hx, gy - hy) if ten in DAU_CON else (gx, gy)
    hoat = []
    # Thở: thân giãn rất nhẹ; đầu chỉ nhấp nhô 1px để không hở cổ; hơi phả từ mũi lúc thở ra.
    k = [khung(ids['than'], 'scaleY', [(0, 1), (90, 1.015), (180, 1)])] if co('than') else []
    k.append(khung(dau_id, 'y', [(0, hy), (90, hy - 1.2), (180, hy)]))
    for tn, (hid, lx, ly, huong) in hoi.items():
        k.append(khung(hid, 'opacity', [(0, 0), (104, 0), (126, .65), (172, 0), (180, 0)]))
        k.append(khung(hid, 'x', [(0, lx), (96, lx), (172, lx + 18 * huong), (180, lx)], '0.2 0.6 0.4 1'))
        k.append(khung(hid, 'y', [(0, ly), (96, ly), (172, ly + 36), (180, ly)], '0.2 0.6 0.4 1'))
        for tr in ('scaleX', 'scaleY'):
            k.append(khung(hid, tr, [(0, .3), (96, .3), (172, 1.25), (180, .3)], '0.2 0.6 0.4 1'))
    hoat.append(('Thở', 180, ''.join(k)))
    k = [khung(ids[m], 'scaleY', [(0, 1), (196, 1), (202, 0.08), (209, 1), (240, 1)]) for m in ('mat-trai', 'mat-phai') if co(m)]
    hoat.append(('Chớp mắt', 240, ''.join(k)))
    k = []
    if co('tai-trai'):
        k.append(khung(ids['tai-trai/ve'], 'rotation', [(0, 0), (40, 0), (48, -0.26), (56, 0.06), (62, -0.18), (72, 0.03), (84, 0),
                                                        (150, 0), (170, -0.07), (200, 0), (240, 0)]))
    if co('tai-phai'):
        k.append(khung(ids['tai-phai/ve'], 'rotation', [(0, 0), (110, 0), (118, 0.26), (126, -0.06), (132, 0.18), (142, -0.03),
                                                        (154, 0), (190, 0.07), (220, 0), (240, 0)]))
    hoat.append(('Tai', 240, ''.join(k)))
    if co('duoi'):
        hoat.append(('Đuôi', 120, khung(ids['duoi'], 'rotation', [(0, -0.18), (60, 0.22), (120, -0.18)])))
    # Chuyển động phụ cho bớt cứng: đầu khăn đu đưa từ nút khăn, hai tay đung đưa ngược pha.
    k = []
    # Khăn bay phất phơ: chuỗi 3 đoạn, đoạn càng xa càng lệch nhịp và lắc nhiều (như vải trong gió nhẹ).
    for ten, bien, tre in (('khan-dai', 0.06, 0), ('khan-dai-1', 0.08, 22), ('khan-dai-2', 0.17, 44)):
        if co(ten):
            k.append(khung(ids[ten], 'rotation',
                           [(f, bien * math.sin(2 * math.pi * (f - tre) / 200)) for f in range(0, 201, 20)], '0.33 0 0.67 1'))
    if co('tay-trai'):
        k.append(khung(ids['tay-trai'], 'rotation', [(0, 0.035), (100, -0.03), (200, 0.035)]))
    if co('tay-phai'):
        k.append(khung(ids['tay-phai'], 'rotation', [(0, -0.035), (100, 0.03), (200, -0.035)]))
    hoat.append(('Khăn và tay', 200, ''.join(k)))
    # Dáng theo khớp (nguồn SVG khớp nối từ tay-khop.py với "_rive"). Mỗi dáng = một hoạt ảnh giữ tư thế;
    # máy trạng thái lớp "Dáng" chọn theo đầu vào số `dang` (thứ tự trong AGV_DANG), Rive trộn mượt khi đổi.
    # Mọi bản sao của một khớp (bàn tay, viền, màu, bàn tay nổi, tay trước thân) xoay cùng góc → luôn liền.
    DANG_SM = []   # (tên dáng, id hoạt ảnh) cho lớp máy trạng thái
    if KHOP and os.environ.get('AGV_DANG'):
        goc_tm = os.path.dirname(os.path.abspath(__file__))
        tt = json.load(open(os.path.join(goc_tm, 'tu-the-khop.json'), encoding='utf-8'))
        tt.update({m: v for m, v in json.load(open(os.path.join(goc_tm, 'tu-the-chan.json'), encoding='utf-8')).items() if m not in tt})
        ts = json.load(open(os.path.join(goc_tm, 'tham-so-tay.json')))
        L_TREN, L_DUOI = ts.get('L_TREN', 30.0), ts.get('L_DUOI', 36.0)
        L_DUI, L_CANG = ts.get('L_DUI', 30.0), ts.get('L_CANG', 34.0)
        LOP_TAY = ('', '-vien', '-mau', '-noi', '-truoc', '-vien-truoc', '-mau-truoc')

        def giu(nid, prop, v):  # khóa một giá trị suốt hoạt ảnh dáng (2 khung giống nhau)
            return khung(nid, prop, [(0, v), (1, v)])

        def khoa_dang(ma):
            p = tt[ma]; out = []
            for ben in ('tay-trai', 'tay-phai'):
                q = p[ben]
                kt = q[3] if len(q) > 3 else 1.0
                kd = q[4] if len(q) > 4 else kt
                truoc, noi = bool(p.get(ben + '-truoc')), bool(p.get(ben + '-ban-noi'))
                for lop in LOP_TAY:
                    for j, khop in enumerate(('tren', 'duoi', 'ban')):
                        nid = KHOP.get(f'{ben}-{khop}{lop}')
                        if nid is not None:
                            out.append(giu(nid, 'rotation', math.radians(q[j])))
                    for ong, khop, L, kk in (('ongtren', 'duoi', L_TREN, kt), ('ongduoi', 'ban', L_DUOI, kd)):
                        o, d = KHOP.get(f'{ben}-{ong}{lop}'), KHOP.get(f'{ben}-{khop}{lop}#dich')
                        if o is not None:
                            out.append(giu(o, 'scaleY', kk))
                        if d is not None:
                            out.append(giu(d, 'y', L * kk))
                # Bật/tắt bản sao: tay trước thân (cầm đồ trước ngực) / bàn tay nổi trên đầu
                for ten_nhom, bat in ((ben, not truoc), (ben + '-truoc', truoc), (ben + '-noi', noi), (ben + '-ban', not noi)):
                    nid = KHOP.get(ten_nhom)
                    if nid is not None:
                        out.append(giu(nid, 'opacity', 1.0 if bat else 0.0))
            for ben in ('chan-trai', 'chan-phai'):
                q = p.get(ben) or [0, 0, 0]
                for lop in ('', '-vien', '-mau'):
                    for j, khop in enumerate(('dui', 'cang', 'mong')):
                        nid = KHOP.get(f'{ben}-{khop}{lop}')
                        if nid is not None:
                            out.append(giu(nid, 'rotation', math.radians(q[j])))
                    for khop, L, idx in (('cang', L_DUI, 3), ('mong', L_CANG, 4)):
                        d = KHOP.get(f'{ben}-{khop}{lop}#dich')
                        if d is not None:
                            out.append(giu(d, 'y', L * (q[idx] if len(q) > idx else 1.0)))
            return ''.join(out)

        for ma in os.environ['AGV_DANG'].split(','):
            DANG_SM.append((ma, moi_id(), khoa_dang(ma)))
    # Nhìn theo kiểu xoay đầu thật (như Muza 'cat x'/'cat y'): Joystick đọc vị trí "điểm nhìn" (chạy theo con trỏ)
    # và tua hai dòng thời gian tư thế. Mỗi lớp lệch theo độ sâu: mõm nhiều nhất, mắt vừa (mắt phía xa co hẹp),
    # lông mày/trán ít, khuôn đầu nghiêng + co nhẹ, tai/sừng phía nhìn tới thu vào sau đầu, phía kia lộ ra.
    def tu_the(p, prop, trai, phai, giua=None):
        """Khung 0 = quay hẳn sang trái, 30 = thẳng, 60 = quay hẳn sang phải (giá trị cộng vào gốc)."""
        if not co(p):
            return ''
        gx, gy = cuc(p)
        goc = {'x': gx, 'y': gy, 'scaleX': 1, 'scaleY': 1, 'rotation': 0}[prop]
        g = goc if giua is None else giua
        return khung(ids[p], prop, [(0, goc + trai), (30, g), (60, goc + phai)], '0 0 1 1')
    # "Nhìn" chứ không "trượt mặt": mắt + lông mày dẫn hướng (dịch nhiều), mõm gần như yên, cả đầu nghiêng
    # và ngả nhẹ về phía con trỏ như ngoái nhìn; tai/sừng chỉ xoay quanh gốc nên luôn dính đầu.
    ngang = [
        tu_the('mat-trai', 'x', -7, 7), tu_the('mat-phai', 'x', -7, 7),
        tu_the('long-may-trai', 'x', -5, 5), tu_the('long-may-phai', 'x', -5, 5),
        tu_the('mom', 'x', -1.2, 1.2),
        tu_the('tai-trai', 'rotation', .1, -.05), tu_the('tai-phai', 'rotation', .05, -.1),
    ]
    # Cổ + khăn đi theo đầu (ít hơn đầu) để vòng khăn luôn che kín cổ khi đầu nghiêng/ngả.
    ngang += [tu_the('co', 'rotation', -.05, .05), tu_the('co', 'x', -3.5, 3.5),
              tu_the('khan-co', 'rotation', -.04, .04), tu_the('khan-co', 'x', -3, 3), tu_the('khan-dai', 'x', -2.5, 2.5)]
    ngang.append(khung(dau_id, 'rotation', [(0, -.075), (30, 0), (60, .075)], '0 0 1 1'))
    ngang.append(khung(dau_id, 'x', [(0, hx - 5), (30, hx), (60, hx + 5)], '0 0 1 1'))
    doc = [  # khung 0 = ngước lên, 60 = cúi xuống
        tu_the('mat-trai', 'y', -6, 5), tu_the('mat-phai', 'y', -6, 5),
        tu_the('long-may-trai', 'y', -6, 4), tu_the('long-may-phai', 'y', -6, 4),
        tu_the('mom', 'y', -2, 2),
        tu_the('tai-trai', 'rotation', -.06, .06), tu_the('tai-phai', 'rotation', .06, -.06),
        tu_the('co', 'y', -2, 1), tu_the('khan-co', 'y', -2.5, 1.5),
    ]
    a_ngang, a_doc = moi_id(), moi_id()
    nhin_anim = (f'<LinearAnimation fps="60" duration="60" name="Nhìn ngang" id="{a_ngang}">{"".join(ngang)}</LinearAnimation>'
                 f'<LinearAnimation fps="60" duration="60" name="Nhìn dọc" id="{a_doc}">{"".join(doc)}</LinearAnimation>')
    nodes.insert(2, f'<Joystick posX="256" posY="215" width="420" height="360" xId="{a_ngang}" yId="{a_doc}" '
                    f'handleSourceId="{diem_nhin}" name="Nhìn" id="{moi_id()}"/>')
    # Khi không có con trỏ (điện thoại không chạm): điểm nhìn tự ngó qua lại; có con trỏ trong khung thì theo con trỏ.
    co_tro = moi_id()
    tu_do = khung(diem_nhin, 'x', [(0, 256), (70, 150), (170, 150), (250, 362), (350, 362), (420, 256), (480, 256)]) + \
        khung(diem_nhin, 'y', [(0, 215), (70, 205), (170, 230), (250, 205), (350, 225), (420, 215), (480, 215)])

    anim_xml, lop_xml = [], []
    for j, (ten, dai, keyed) in enumerate(hoat):
        aid, sid, lid = moi_id(), moi_id(), moi_id()
        anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="{dai}" name="{ten}" id="{aid}">{keyed}</LinearAnimation>')
        lop_xml.append(f'<StateMachineLayer name="{ten}" id="{lid}"><AnyState/><ExitState/>'
                       f'<EntryState><StateTransition stateToId="{sid}"/></EntryState>'
                       f'<AnimationState animationId="{aid}" id="{sid}"/></StateMachineLayer>')
    a_td, s_td, s_tro, a_rong, l_td = moi_id(), moi_id(), moi_id(), moi_id(), moi_id()
    anim_xml.append(nhin_anim)
    anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="480" name="Nhìn tự do" id="{a_td}">{tu_do}</LinearAnimation>')
    anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="1" name="Theo con trỏ" id="{a_rong}"/>')
    lop_xml.append(f'<StateMachineLayer name="Nhìn tự do" id="{l_td}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{s_td}"/></EntryState>'
                   f'<AnimationState animationId="{a_td}" id="{s_td}"><StateTransition stateToId="{s_tro}">'
                   f'<TransitionBoolCondition inputId="{co_tro}" opValue="equal"/></StateTransition></AnimationState>'
                   f'<AnimationState animationId="{a_rong}" id="{s_tro}"><StateTransition stateToId="{s_td}" duration="400">'
                   f'<TransitionBoolCondition inputId="{co_tro}" opValue="notEqual"/></StateTransition></AnimationState>'
                   f'</StateMachineLayer>')
    # Lớp "Chạm" (cuối để đè chớp mắt): nheo mắt + nhún squash & stretch, chạy hết rồi về nghỉ.
    k = [khung(ids['than'], 'scaleY', [(0, 1), (8, .94), (20, 1.04), (32, .99), (42, 1)])] if co('than') else []
    k.append(khung(dau_id, 'y', [(0, hy), (8, hy + 5), (20, hy - 7), (32, hy + 1), (42, hy)]))
    k += [khung(ids[m], 'scaleY', [(0, 1), (6, .25), (34, .25), (42, 1)]) for m in ('mat-trai', 'mat-phai') if co(m)]
    a_cho, a_nhun, s_cho, s_nhun, l_cham = moi_id(), moi_id(), moi_id(), moi_id(), moi_id()
    anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="1" name="Chờ chạm" id="{a_cho}"/>')
    anim_xml.append(f'<LinearAnimation fps="60" duration="42" name="Nhún khi chạm" id="{a_nhun}">{"".join(k)}</LinearAnimation>')
    lop_xml.append(f'<StateMachineLayer name="Chạm" id="{l_cham}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{s_cho}"/></EntryState>'
                   f'<AnimationState animationId="{a_cho}" id="{s_cho}"><StateTransition stateToId="{s_nhun}">'
                   f'<TransitionTriggerCondition inputId="{kich_hoat}"/></StateTransition></AnimationState>'
                   f'<AnimationState animationId="{a_nhun}" id="{s_nhun}"><StateTransition stateToId="{s_cho}" '
                   f'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/></AnimationState></StateMachineLayer>')
    # Lớp "Dáng": AnyState → dáng i khi `dang` == i, trộn 350 ms (Rive nội suy góc khớp giữa hai dáng).
    vao_dang = moi_id()
    if DANG_SM:
        s_ids = [moi_id() for _ in DANG_SM]
        chuyen = ''.join(f'<StateTransition stateToId="{s}" duration="350"><TransitionNumberCondition inputId="{vao_dang}" '
                         f'opValue="equal" value="{i}"/></StateTransition>' for i, s in enumerate(s_ids))
        trang_thai = ''.join(f'<AnimationState animationId="{aid}" id="{s}"/>' for (ma, aid, _), s in zip(DANG_SM, s_ids))
        anim_xml.extend(f'<LinearAnimation loopValue="loop" fps="60" duration="1" name="Dáng {ma}" id="{aid}">{keyed}</LinearAnimation>'
                        for ma, aid, keyed in DANG_SM)
        lop_xml.insert(0, f'<StateMachineLayer name="Dáng" id="{moi_id()}"><AnyState>{chuyen}</AnyState><ExitState/>'
                          f'<EntryState><StateTransition stateToId="{s_ids[int(os.environ.get('AGV_DANG_DAU', '0'))]}"/></EntryState>{trang_thai}</StateMachineLayer>')
    # Lớp "Nhún thân": cả người lắc nhẹ, chuyển trọng tâm và nhún theo nhịp thở (gốc ở bàn chân) → bớt đứng cứng.
    toan_than = moi_id()
    k = [khung(toan_than, 'rotation', [(f, 0.022 * math.sin(2 * math.pi * f / 300)) for f in range(0, 301, 30)], '0.37 0 0.63 1'),
         khung(toan_than, 'x', [(f, 256 + 2.2 * math.sin(2 * math.pi * f / 300)) for f in range(0, 301, 30)], '0.37 0 0.63 1'),
         khung(toan_than, 'scaleY', [(f, 1 + 0.012 * (1 - math.cos(2 * math.pi * f / 150)) / 2) for f in range(0, 301, 30)], '0.37 0 0.63 1')]
    a_nt = moi_id()
    anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="300" name="Nhún thân" id="{a_nt}">{"".join(k)}</LinearAnimation>')
    s_nt = moi_id()
    lop_xml.append(f'<StateMachineLayer name="Nhún thân" id="{moi_id()}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{s_nt}"/></EntryState><AnimationState animationId="{a_nt}" id="{s_nt}"/></StateMachineLayer>')
    nodes = [f'<Node x="256" y="492" name="toan-than" id="{toan_than}"><Node x="-256" y="-492" name="toan-than-goc">{"".join(nodes)}</Node></Node>']
    nghe = (f'<StateMachineListenerSingle targetId="{vung_cham}" listenerTypeValue="move" name="Nhìn theo" id="{moi_id()}">'
            f'<ListenerAlignTarget targetId="{diem_nhin}"/></StateMachineListenerSingle>'
            f'<StateMachineListenerSingle targetId="{vung_cham}" listenerTypeValue="down" name="Chạm" id="{moi_id()}">'
            f'<ListenerTriggerChange inputId="{kich_hoat}"/></StateMachineListenerSingle>'
            f'<StateMachineListenerSingle targetId="{vung_cham}" listenerTypeValue="enter" name="Con trỏ vào" id="{moi_id()}">'
            f'<ListenerBoolChange inputId="{co_tro}" value="1"/></StateMachineListenerSingle>'
            f'<StateMachineListenerSingle targetId="{vung_cham}" listenerTypeValue="exit" name="Con trỏ ra" id="{moi_id()}">'
            f'<ListenerBoolChange inputId="{co_tro}" value="0"/></StateMachineListenerSingle>')
    smid = moi_id()
    print(f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="{smid}" styleId="0:5" width="512" height="512" name="trau" id="0:2">
<LayoutComponentStyle name="Kiểu" id="0:5"/>
{''.join(nodes)}
<StateMachine name="trau" id="{smid}"><StateMachineTrigger name="cham" id="{kich_hoat}"/><StateMachineBool name="co_tro" id="{co_tro}"/><StateMachineNumber name="dang" value="{os.environ.get('AGV_DANG_DAU', '0')}" id="{vao_dang}"/>{''.join(lop_xml)}{nghe}</StateMachine>
{''.join(anim_xml)}
</Artboard>
</Rive>''')


if __name__ == '__main__':
    main()
