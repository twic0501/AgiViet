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
    nhom = [g for g in svg.iter(NS + 'g') if g.get('id') and g.get('data-goc')]
    # Nhìn theo con trỏ kiểu Muza: mỗi bộ phận kéo về "điểm nhìn" với độ mạnh riêng; phần càng ở trước trượt càng nhiều.
    NHIN = {'mat-trai': .07, 'mat-phai': .07, 'long-may-trai': .06, 'long-may-phai': .06, 'mom': .05,
            'sung-trai': .015, 'sung-phai': .015, 'tai-trai': .02, 'tai-phai': .02, 'dau-khoi': .01}
    diem_nhin, vung_cham, kich_hoat = moi_id(), moi_id(), moi_id()
    nodes, vi_tri, ids = [], {}, {}
    for g in nhom:
        gx, gy, noi_dung = bo_phan(g, ke)
        nid = moi_id(); ids[g.get('id')] = nid; vi_tri[g.get('id')] = (gx, gy)
        rb = (f'<TranslationConstraint targetId="{diem_nhin}" strength="{NHIN[g.get("id")]}" name="Nhìn"/>'
              if g.get('id') in NHIN else '')
        nodes.append(f'<Node x="{gx:.2f}" y="{gy:.2f}" name="{g.get("id")}" id="{nid}">{noi_dung}{rb}</Node>')
    nodes.reverse()  # bộ phận khai báo trước nằm trên
    # Hơi thở: hai làn hơi trắng mờ ở lỗ mũi (203,262) và (307,262), hiện lúc thở ra.
    hoi = {}
    for ten, x0 in (('hoi-trai', 205), ('hoi-phai', 305)):
        hoi[ten] = moi_id()
        cum = ''.join(f'<Shape x="{dx}" y="{dy}" name="{ten}-{k}"><Ellipse width="{w}" height="{w * .8:.1f}" name="P"/>'
                      f'<Fill name="F"><SolidColor colorValue="D8FFFFFF" name="C"/></Fill></Shape>'
                      for k, (dx, dy, w) in enumerate(((0, 0, 14), (-7 if x0 < 256 else 7, 6, 10), (3 if x0 < 256 else -3, 10, 8))))
        nodes.insert(0, f'<Node x="{x0}" y="272" scaleX="0.4" scaleY="0.4" opacity="0" name="{ten}" id="{hoi[ten]}">{cum}</Node>')
    nodes.insert(0, f'<Node x="256" y="215" name="diem-nhin" id="{diem_nhin}"/>')
    # Vùng nhận chạm phủ cả khung, gần như trong suốt; khai báo đầu tiên để nằm trên cùng.
    nodes.insert(0, f'<Shape x="256" y="256" name="vung-cham" id="{vung_cham}"><Rectangle width="512" height="512" name="P"/>'
                    f'<Fill name="F"><SolidColor colorValue="01FFFFFF" name="C"/></Fill></Shape>')

    def co(ten):
        return ten in ids
    hoat = []  # (tên, thời lượng, keyed)
    # Thở: thân co giãn dọc quanh hông, đầu nhấp nhô theo.
    k = []
    if co('than'):
        k.append(khung(ids['than'], 'scaleY', [(0, 1), (90, 1.02), (180, 1)]))
    for p in ('dau-khoi', 'sung-trai', 'sung-phai', 'tai-trai', 'tai-phai', 'mom', 'mat-trai', 'mat-phai',
              'long-may-trai', 'long-may-phai', 'khan-co', 'khan-dai'):
        if co(p):
            y = vi_tri[p][1]
            k.append(khung(ids[p], 'y', [(0, y), (90, y - 2.2), (180, y)]))
    for ten, (x0, x1) in (('hoi-trai', (205, 192)), ('hoi-phai', (305, 318))):
        h = hoi[ten]
        k.append(khung(h, 'opacity', [(0, 0), (96, 0), (112, .8), (168, 0), (180, 0)]))
        k.append(khung(h, 'x', [(0, x0), (96, x0), (170, x1), (180, x0)], '0.2 0.6 0.4 1'))
        k.append(khung(h, 'y', [(0, 272), (96, 272), (170, 290), (180, 272)], '0.2 0.6 0.4 1'))
        for tr in ('scaleX', 'scaleY'):
            k.append(khung(h, tr, [(0, .4), (96, .4), (170, 1.15), (180, .4)], '0.2 0.6 0.4 1'))
    hoat.append(('Thở', 180, ''.join(k)))
    # Chớp mắt: co mắt theo chiều dọc rất nhanh.
    k = [khung(ids[m], 'scaleY', [(0, 1), (196, 1), (202, 0.08), (209, 1), (240, 1)]) for m in ('mat-trai', 'mat-phai') if co(m)]
    hoat.append(('Chớp mắt', 240, ''.join(k)))
    # Tai vẫy nhẹ, so le hai bên.
    k = []
    if co('tai-trai'):
        k.append(khung(ids['tai-trai'], 'rotation', [(0, 0), (20, -0.14), (40, 0.05), (55, 0), (150, 0)]))
    if co('tai-phai'):
        k.append(khung(ids['tai-phai'], 'rotation', [(0, 0), (70, 0), (90, 0.14), (110, -0.05), (125, 0), (150, 0)]))
    hoat.append(('Tai', 150, ''.join(k)))
    # Đuôi đung đưa.
    if co('duoi'):
        hoat.append(('Đuôi', 120, khung(ids['duoi'], 'rotation', [(0, -0.18), (60, 0.22), (120, -0.18)])))
    # Nhìn qua lại giả 3D: mặt trượt nhiều, tai ít + trễ, khuôn đầu gần như yên.
    lech = {'mat-trai': 9, 'mat-phai': 9, 'long-may-trai': 8, 'long-may-phai': 8, 'mom': 7, 'sung-trai': 2, 'sung-phai': 2,
            'dau-khoi': 1.5}
    k = []
    for p, dx in lech.items():
        if co(p):
            x = vi_tri[p][0]
            k.append(khung(ids[p], 'x', [(0, x), (60, x - dx), (150, x - dx), (240, x + dx), (330, x + dx), (420, x)]))
    for p, dau in (('tai-trai', 1), ('tai-phai', 1)):
        if co(p):
            x = vi_tri[p][0]
            k.append(khung(ids[p], 'x', [(0, x), (75, x - 3), (165, x - 3), (255, x + 3), (345, x + 3), (420, x)]))
    hoat.append(('Nhìn qua lại', 420, ''.join(k)))

    anim_xml, lop_xml = [], []
    for j, (ten, dai, keyed) in enumerate(hoat):
        aid, sid, lid = moi_id(), moi_id(), moi_id()
        anim_xml.append(f'<LinearAnimation loopValue="loop" fps="60" duration="{dai}" name="{ten}" id="{aid}">{keyed}</LinearAnimation>')
        lop_xml.append(f'<StateMachineLayer name="{ten}" id="{lid}"><AnyState/><ExitState/>'
                       f'<EntryState><StateTransition stateToId="{sid}"/></EntryState>'
                       f'<AnimationState animationId="{aid}" id="{sid}"/></StateMachineLayer>')
    # Lớp "Chạm" (đặt cuối để đè lớp chớp mắt): chạm → nheo mắt + nhún kiểu squash & stretch, chạy hết rồi về nghỉ.
    dau = [p for p in ('dau-khoi', 'sung-trai', 'sung-phai', 'tai-trai', 'tai-phai', 'mom', 'mat-trai', 'mat-phai',
                       'long-may-trai', 'long-may-phai', 'khan-co', 'khan-dai') if co(p)]
    k = [khung(ids['than'], 'scaleY', [(0, 1), (8, .93), (20, 1.05), (32, .99), (42, 1)])] if co('than') else []
    k += [khung(ids[p], 'y', [(0, vi_tri[p][1]), (8, vi_tri[p][1] + 6), (20, vi_tri[p][1] - 9), (32, vi_tri[p][1] + 1),
                               (42, vi_tri[p][1])]) for p in dau]
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
            f'<ListenerTriggerChange inputId="{kich_hoat}"/></StateMachineListenerSingle>')
    smid = moi_id()
    print(f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="{smid}" styleId="0:5" width="512" height="512" name="trau" id="0:2">
<LayoutComponentStyle name="Kiểu" id="0:5"/>
{''.join(nodes)}
<StateMachine name="trau" id="{smid}"><StateMachineTrigger name="cham" id="{kich_hoat}"/>{''.join(lop_xml)}{nghe}</StateMachine>
{''.join(anim_xml)}
</Artboard>
</Rive>''')


if __name__ == '__main__':
    main()
