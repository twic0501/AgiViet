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


def bo_phan(g, ke):
    gx, gy = map(float, g.get('data-goc', '256 256').split())
    a = thuoc_tinh(g, ke)
    con = [c for c in g if c.tag.replace(NS, '') in ('path', 'ellipse', 'rect', 'g')]
    phan = []
    for k, c in enumerate(con):
        if c.tag.replace(NS, '') == 'g':
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
    nhom = [g for g in svg.iter(NS + 'g') if g.get('id') and g.get('data-goc') and g.get('id') != 'khuon-mat-clip']
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
        return f'<Node x="{gx - goc[0]:.2f}" y="{gy - goc[1]:.2f}" name="{ten}" id="{ids[ten]}">{them}{noi[ten]}{rb}</Node>'

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
        k.append(khung(ids['tai-trai'], 'rotation', [(0, 0), (20, -0.14), (40, 0.05), (55, 0), (150, 0)]))
    if co('tai-phai'):
        k.append(khung(ids['tai-phai'], 'rotation', [(0, 0), (70, 0), (90, 0.14), (110, -0.05), (125, 0), (150, 0)]))
    hoat.append(('Tai', 150, ''.join(k)))
    if co('duoi'):
        hoat.append(('Đuôi', 120, khung(ids['duoi'], 'rotation', [(0, -0.18), (60, 0.22), (120, -0.18)])))
    # Chuyển động phụ cho bớt cứng: đầu khăn đu đưa từ nút khăn, hai tay đung đưa ngược pha.
    k = []
    if co('khan-dai'):
        k.append(khung(ids['khan-dai'], 'rotation', [(0, -0.045), (100, 0.05), (200, -0.045)]))
    if co('tay-trai'):
        k.append(khung(ids['tay-trai'], 'rotation', [(0, 0.035), (100, -0.03), (200, 0.035)]))
    if co('tay-phai'):
        k.append(khung(ids['tay-phai'], 'rotation', [(0, -0.035), (100, 0.03), (200, -0.035)]))
    hoat.append(('Khăn và tay', 200, ''.join(k)))
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
    ngang.append(khung(dau_id, 'rotation', [(0, -.075), (30, 0), (60, .075)], '0 0 1 1'))
    ngang.append(khung(dau_id, 'x', [(0, hx - 5), (30, hx), (60, hx + 5)], '0 0 1 1'))
    doc = [  # khung 0 = ngước lên, 60 = cúi xuống
        tu_the('mat-trai', 'y', -6, 5), tu_the('mat-phai', 'y', -6, 5),
        tu_the('long-may-trai', 'y', -6, 4), tu_the('long-may-phai', 'y', -6, 4),
        tu_the('mom', 'y', -2, 2),
        tu_the('tai-trai', 'rotation', -.06, .06), tu_the('tai-phai', 'rotation', .06, -.06),
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
<StateMachine name="trau" id="{smid}"><StateMachineTrigger name="cham" id="{kich_hoat}"/><StateMachineBool name="co_tro" id="{co_tro}"/>{''.join(lop_xml)}{nghe}</StateMachine>
{''.join(anim_xml)}
</Artboard>
</Rive>''')


if __name__ == '__main__':
    main()
