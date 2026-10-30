#!/usr/bin/env python3
"""Dựng trâu v3 (Chặng 2): khung xương toàn thân, xoay người theo `huong`, dáng nghỉ sống (luật 8).

Dùng: python3 dung-v3.py [--xem] > scene.rml
  --xem: thêm vùng bấm để xem thử trong cửa sổ Rive (bấm theo 5 cột → đổi `huong` + nhún; rê → `nhin_x`).
         Bản giao app (frontend/assets/trau/trau-v3.riv) KHÔNG có vùng bấm: app tự đặt đầu vào.

Hợp đồng nối (docs/KE-HOACH-SONG-SONG.md): artboard `trau` 512×512, chân chạm y≈490; state machine `trau`;
đầu vào hanh_dong (số), huong (số −1…1), cham (trigger), nhin_x, nhin_y (số −1…1).

Cách dựng:
- 5 góc: chính diện V4g, ¾ trái, nghiêng trái (nguon/goc/*.svg) và ¾ phải, nghiêng phải (lật gương).
- Mỗi góc là một cây nút (khung xương): gốc ở bàn chân → nhún → hông → vai → thân trên (áo, tay, khăn, cổ)
  → đầu → đầu quanh → đầu nhìn → các bộ phận đầu. Chân và đuôi gắn vào "nhún" nên đứng yên khi hông dồn.
- Xoay: 3 Joystick tua 3 dòng thời gian bật/tắt bộ phận theo góc — đầu, thân, chân. Đầu vào `huong` chia nấc;
  mỗi nấc là trạng thái đặt x của joystick, chuyển nấc trộn mượt; đầu trộn nhanh nhất, thân chậm hơn, chân chậm
  nhất → đầu quay trước, rồi vai, rồi hông và chân (luật 8). Lúc đổi góc thân bóp ngang nhẹ cho đỡ giật.
- Nghỉ sống (hanh_dong = 0): 5 lớp chạy song song, mỗi lớp một nhịp riêng (không lặp đều):
  thở (ngực, vai), dồn chân (hông lệch, vai nghiêng ngược, đầu giữ thăng bằng), nhìn quanh (đầu dẫn, vai theo trễ),
  phụ (tai, khăn, đuôi, tay đung đưa trễ nhịp), chớp mắt.
- cham: nhún cả người (squash & stretch từ bàn chân). nhin_x/nhin_y: đầu và mắt nhìn theo.
- hanh_dong 1–8 (chào, chỉ đường…): chưa có, giữ dáng nghỉ (làm từng hành động ở chặng 3).
"""
import importlib.util
import math
import os
import sys
import xml.etree.ElementTree as ET

DIR = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('tao_canh', os.path.join(DIR, 'tao-canh.py'))
tc = importlib.util.module_from_spec(sp); sp.loader.exec_module(tc)
moi_id, khung, NS = tc.moi_id, tc.khung, tc.NS
XEM = '--xem' in sys.argv

GOC = [  # (tên, tệp, lật gương)
    ('chinh', 'nguon/trau.svg', False),
    ('34t', 'nguon/goc/trau-34-trai.svg', False),
    ('ngt', 'nguon/goc/trau-nghieng-trai.svg', False),
    ('34p', 'nguon/goc/trau-34-trai.svg', True),
    ('ngp', 'nguon/goc/trau-nghieng-trai.svg', True),
]
# huong: khoảng của từng góc; nấc chuẩn để đặt joystick
NAC = [(-1.0, 'ngt'), (-0.5, '34t'), (0.0, 'chinh'), (0.5, '34p'), (1.0, 'ngp')]
NGUONG = [-0.75, -0.25, 0.25, 0.75]
CHAN_DAT = 490


def la_dau(t):
    return t in ('dau-khoi', 'mom', 'vien-cam-truoc') or t.startswith(('sung-', 'tai-', 'mat-', 'long-may-'))


def la_chan(t):
    return t.startswith('chan-') or t == 'duoi'


def node(ten, nid, x, y, ruot, them=''):
    return f'<Node x="{x:.2f}" y="{y:.2f}"{them} name="{ten}" id="{nid}">{ruot}</Node>'


class Goc:
    """Một góc nhìn: cây nút + id các nút cần tạo hoạt ảnh."""

    def __init__(self, ten, tep, lat):
        self.ten, self.lat = ten, lat
        svg = ET.parse(os.path.join(DIR, tep)).getroot()
        long_trong = {c.get('id') for g in svg.iter(NS + 'g') if g.get('data-goc') for c in g.iter(NS + 'g') if c is not g}
        nhom = [g for g in svg.iter(NS + 'g') if g.get('id') and g.get('data-goc') and g.get('id') != 'khuon-mat-clip'
                and g.get('id') not in long_trong]
        self.thu_tu = [g.get('id') for g in nhom]          # thứ tự SVG: trước = nằm dưới
        self.bp = {}                                       # tên → (x, y tuyệt đối, nội dung, id)
        tc.LONG.clear()                                    # LONG của tao-canh là biến chung: xoá trước mỗi góc
        for g in nhom:
            gx, gy, ruot = tc.bo_phan(g, {})
            self.bp[g.get('id')] = (gx, gy, ruot, moi_id())
        self.long = dict(tc.LONG)                          # chuỗi khớp khăn dài (V4g)
        dk = self.bp.get('dau-khoi')
        self.co_xy = (dk[0], dk[1]) if dk else (256, 300)  # điểm xoay đầu = cổ
        self.id = {k: moi_id() for k in ('goc', 'nhun', 'hong', 'vai', 'than', 'dau', 'dau-quanh', 'dau-nhin')}

    def k(self, t):
        return self.bp[t][3]

    def co(self, t):
        return t in self.bp

    def dau_bp(self):
        return [t for t in self.thu_tu if la_dau(t)]

    def than_bp(self):
        return [t for t in self.thu_tu if not la_dau(t) and not la_chan(t)]

    def chan_bp(self):
        return [t for t in self.thu_tu if la_chan(t)]

    def xml(self):
        """Cây nút; toạ độ con tính tương đối cha. Rive: con khai báo trước nằm trên → đảo thứ tự SVG."""
        cx = 256.0
        hong = (cx, 412.0)
        cox, coy = self.co_xy

        def ve(ds, cha):
            out = []
            for t in reversed(ds):
                x, y, ruot, nid = self.bp[t]
                out.append(node(t, nid, x - cha[0], y - cha[1], ruot))
            return ''.join(out)
        dau_nhin = node('dau-nhin', self.id['dau-nhin'], 0, 0, ve(self.dau_bp(), (cox, coy)))
        dau_quanh = node('dau-quanh', self.id['dau-quanh'], 0, 0, dau_nhin)
        dau = node('dau', self.id['dau'], cox - hong[0], coy - hong[1], dau_quanh)
        than = node('than-tren', self.id['than'], 0, 0, dau + ve(self.than_bp(), hong))
        vai = node('vai', self.id['vai'], 0, 0, than)
        hong_xml = node('hong', self.id['hong'], hong[0] - cx, hong[1] - CHAN_DAT, vai)
        nhun = node('nhun', self.id['nhun'], 0, 0, hong_xml + ve(self.chan_bp(), (cx, CHAN_DAT)))
        lat = ' scaleX="-1"' if self.lat else ''
        return node(f'goc-{self.ten}', self.id['goc'], cx, CHAN_DAT, nhun, lat)

    def vi_tri_dau(self, t):
        """Toạ độ cục bộ (trong cha) của bộ phận — để cộng dồn khi tạo hoạt ảnh x/y."""
        x, y, _, _ = self.bp[t]
        if la_dau(t):
            return x - self.co_xy[0], y - self.co_xy[1]
        if la_chan(t):
            return x - 256, y - CHAN_DAT
        return x - 256, y - 412


def main():
    goc = [Goc(*g) for g in GOC]
    gmap = {g.ten: g for g in goc}
    anim, lop = [], []
    vao = {t: moi_id() for t in ('hanh_dong', 'huong', 'cham', 'nhin_x', 'nhin_y')}
    hong_y = 412 - CHAN_DAT

    def ani(ten, dai, keyed, lap=True):
        aid = moi_id()
        anim.append(f'<LinearAnimation{" loopValue=\"loop\"" if lap else ""} fps="60" duration="{dai}" name="{ten}" '
                    f'id="{aid}">{"".join(keyed)}</LinearAnimation>')
        return aid

    def lop_mot(ten, aid):
        sid = moi_id()
        lop.append(f'<StateMachineLayer name="{ten}" id="{moi_id()}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{sid}"/></EntryState>'
                   f'<AnimationState animationId="{aid}" id="{sid}"/></StateMachineLayer>')

    def song(f, chu_ky, bien, pha=0.0):
        return bien * math.sin(2 * math.pi * (f - pha) / chu_ky)

    E = '0.37 0 0.63 1'
    # ---------- Xoay: 3 dòng thời gian (đầu, thân, chân); khung 0 = huong −1, 60 = 0, 120 = 1 ----------
    def nhin_thay(ten_goc, f):
        h = (f - 60) / 60
        if h < NGUONG[0]:
            return 'ngt'
        if h < NGUONG[1]:
            return '34t'
        if h <= NGUONG[2]:
            return 'chinh'
        if h <= NGUONG[3]:
            return '34p'
        return 'ngp'
    moc = sorted({0, 120} | {round(60 + 60 * n) for n in NGUONG})

    def tat_bat(ids_cua_goc):
        """Khoá opacity 'hold' cho từng nút theo khoảng huong của góc."""
        out = []
        for g in goc:
            ks = []
            for f in moc:
                h = (f - 60) / 60
                # tại ngưỡng: góc nằm phía trên ngưỡng hiện ra (đổi đúng lúc qua ngưỡng)
                vis = 1 if nhin_thay(g.ten, f + 0.01 if f < 120 else f) == g.ten else 0
                ks.append(f'<KeyFrameDouble value="{vis}" frame="{f}"/>')
            for nid in ids_cua_goc(g):
                out.append(f'<KeyedObject objectId="{nid}"><KeyedProperty property="opacity">{"".join(ks)}'
                           f'</KeyedProperty></KeyedObject>')
        return out
    a_dau = ani('Xoay đầu', 120, tat_bat(lambda g: [g.id['dau']]), lap=False)
    bop = []  # thân bóp ngang nhẹ quanh mỗi ngưỡng (che chỗ đổi hình)
    for g in goc:
        cac = [(0, 1)]
        for n in NGUONG:
            f = 60 + 60 * n
            cac += [(f - 6, 1), (f, 0.93), (f + 6, 1)]
        cac.append((120, 1))
        bop.append(khung(g.id['vai'], 'scaleX', cac, '0.42 0 0.58 1'))
    a_than = ani('Xoay thân', 120, tat_bat(lambda g: [g.k(t) for t in g.than_bp()]) + bop, lap=False)
    a_chan = ani('Xoay chân', 120, tat_bat(lambda g: [g.k(t) for t in g.chan_bp()]), lap=False)
    a_rong = ani('Rỗng', 120, [], lap=False)
    joy = {}
    joy_xml = []
    for ten, aid in (('dau', a_dau), ('than', a_than), ('chan', a_chan)):
        joy[ten] = moi_id()
        joy_xml.append(f'<Joystick posX="256" posY="256" width="512" height="512" xId="{aid}" yId="{a_rong}" '
                       f'name="Xoay {ten}" id="{joy[ten]}"/>')

    def lop_nac(ten, nid, prop, inp, nac, nguong, tre, ease='0.25 0.1 0.25 1'):
        """Lớp chia nấc: mỗi nấc là trạng thái đặt prop của nid; chuyển nấc trộn mượt `tre` ms."""
        sids = [moi_id() for _ in nac]
        bien = [-1e9] + list(nguong) + [1e9]

        def dk(j):
            c = ''
            if j > 0:
                c += f'<TransitionNumberCondition inputId="{inp}" opValue="greaterThan" value="{bien[j]}"/>'
            if j < len(nac) - 1:
                c += f'<TransitionNumberCondition inputId="{inp}" opValue="lessThanOrEqual" value="{bien[j + 1]}"/>'
            return c
        x1, y1, x2, y2 = ease.split()
        tt = []
        for i, (v, sid) in enumerate(zip(nac, sids)):
            aid = ani(f'{ten} {v:+.2f}', 1, [f'<KeyedObject objectId="{nid}"><KeyedProperty property="{prop}">'
                                              f'<KeyFrameDouble value="{v}" frame="0"/></KeyedProperty></KeyedObject>'])
            chuyen = ''.join(f'<StateTransition stateToId="{s2}" duration="{tre}" interpolationType="cubic">'
                             f'<CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>{dk(j)}</StateTransition>'
                             for j, s2 in enumerate(sids) if j != i)
            tt.append(f'<AnimationState animationId="{aid}" id="{sid}">{chuyen}</AnimationState>')
        vao_dau = ''.join(f'<StateTransition stateToId="{s}">{dk(j)}</StateTransition>' for j, s in enumerate(sids))
        lop.append(f'<StateMachineLayer name="{ten}" id="{moi_id()}"><AnyState/><ExitState/>'
                   f'<EntryState>{vao_dau}</EntryState>{"".join(tt)}</StateMachineLayer>')
    nac = [n for n, _ in NAC]
    lop_nac('Xoay đầu', joy['dau'], 'x', vao['huong'], nac, NGUONG, 220)
    lop_nac('Xoay thân', joy['than'], 'x', vao['huong'], nac, NGUONG, 420)
    lop_nac('Xoay chân', joy['chan'], 'x', vao['huong'], nac, NGUONG, 600)

    # ---------- Nghỉ sống ----------
    # Thở (180 khung = 3 s): ngực phồng (thân trên giãn dọc), vai nhô nhẹ; đầu là con nên nhấp nhô theo.
    k = []
    for g in goc:
        k.append(khung(g.id['than'], 'scaleY', [(0, 1), (90, 1.014), (180, 1)], E))
        k.append(khung(g.id['than'], 'scaleX', [(0, 1), (90, 1.006), (180, 1)], E))
    lop_mot('Thở', ani('Thở', 180, k))
    # Dồn chân (600 khung = 10 s): dồn trái — giữ — về — dồn phải — giữ — về. Hông lệch + nghiêng về chân trụ,
    # vai nghiêng ngược hông, đầu bù lại cho thăng bằng; chân nghỉ hơi chùng (nhấc nhẹ). Chân trụ đứng yên.
    nhip = [(0, 0), (70, -1), (230, -1), (300, 0), (370, 1), (530, 1), (600, 0)]
    k = []
    for g in goc:
        s = -1 if g.lat else 1
        k.append(khung(g.id['hong'], 'x', [(f, 3.0 * v) for f, v in nhip], E))
        k.append(khung(g.id['hong'], 'y', [(f, hong_y + 0.8 * abs(v)) for f, v in nhip], E))
        k.append(khung(g.id['hong'], 'rotation', [(f, s * 0.018 * v) for f, v in nhip], E))
        k.append(khung(g.id['vai'], 'rotation', [(f, -s * 0.032 * v) for f, v in nhip], E))
        k.append(khung(g.id['dau'], 'rotation', [(f, s * 0.016 * v) for f, v in nhip], E))
        # chân: bên nghỉ hơi nhấc và xoay nhẹ (chính diện có 2 chân trái/phải; góc khác: chân gần/xa)
        hai = [t for t in g.chan_bp() if t != 'duoi']
        for j, t in enumerate(hai):
            lx, ly = g.vi_tri_dau(t)
            phia = (-1 if j == 0 else 1)  # chân đầu danh sách là chân bên trái màn hình / chân xa
            k.append(khung(g.k(t), 'y', [(f, ly - 1.6 * max(0, phia * v)) for f, v in nhip], E))
            k.append(khung(g.k(t), 'rotation', [(f, s * 0.025 * max(0, phia * v) * phia) for f, v in nhip], E))
        if g.co('duoi'):
            lx, ly = g.vi_tri_dau('duoi')
            k.append(khung(g.k('duoi'), 'x', [(f, lx + 3.0 * v) for f, v in nhip], E))
    lop_mot('Dồn chân', ani('Dồn chân', 600, k))
    # Nhìn quanh (720 khung = 12 s): đầu dẫn, vai theo trễ 14 khung và ít hơn (luật 8: mắt/đầu trước → vai).
    nq = [(0, 0), (90, -1), (200, -1), (290, 0.2), (380, 1), (470, 1), (560, 0), (720, 0)]
    k = []
    for g in goc:
        s = -1 if g.lat else 1
        k.append(khung(g.id['dau-quanh'], 'rotation', [(f, s * 0.055 * v) for f, v in nq], E))
        k.append(khung(g.id['dau-quanh'], 'x', [(f, s * 2.0 * v) for f, v in nq], E))
        # vai đi theo đầu, trễ 14 khung và ít hơn
        k.append(khung(g.id['vai'], 'x', [(0, 0)] + [(f + 14, s * 0.9 * v) for f, v in nq[1:] if f + 14 < 720]
                       + [(720, 0)], E))
    lop_mot('Nhìn quanh', ani('Nhìn quanh', 720, k))
    # Phụ (đung đưa trễ nhịp): tai, khăn, đuôi, tay — mỗi thứ chu kỳ / pha riêng, theo sau dồn chân.
    k = []
    for g in goc:
        s = -1 if g.lat else 1
        for t in g.thu_tu:
            if t.startswith('tai-'):
                k.append(khung(g.k(t), 'rotation', [(f, s * song(f, 300, 0.05, 20 if 'trai' in t or 'xa' in t else 60))
                                                      for f in range(0, 601, 50)], E))
            elif t == 'khan-dai':
                k.append(khung(g.k(t), 'rotation', [(f, s * song(f, 200, 0.05, 30)) for f in range(0, 601, 40)], E))
            elif t == 'duoi':
                k.append(khung(g.k(t), 'rotation', [(f, s * song(f, 150, 0.16, 0)) for f in range(0, 601, 25)], E))
            elif t.startswith('tay-'):
                k.append(khung(g.k(t), 'rotation', [(f, s * song(f, 300, 0.03, 40 if 'phai' in t or 'gan' in t else 190))
                                                      for f in range(0, 601, 50)], E))
        for t, (cid, cx, cy) in g.long.items():
            if t.startswith('khan-dai-'):
                k.append(khung(cid, 'rotation', [(f, s * song(f, 200, 0.07, 50 if t.endswith('1') else 80))
                                                  for f in range(0, 601, 40)], E))
    lop_mot('Phụ', ani('Phụ', 600, k))
    # Chớp mắt (khoảng 4,3 s, hai lần chớp gần nhau thỉnh thoảng)
    k = []
    for g in goc:
        for t in g.thu_tu:
            if t.startswith('mat-'):
                k.append(khung(g.k(t), 'scaleY', [(0, 1), (200, 1), (205, 0.08), (211, 1), (232, 1), (236, 0.08),
                                                   (242, 1), (520, 1)]))
    lop_mot('Chớp mắt', ani('Chớp mắt', 520, k))

    # ---------- Nhìn theo nhin_x / nhin_y: joystick "Nhìn" tua 2 dòng tư thế, đặt bằng lớp chia nấc ----------
    kx, ky = [], []
    for g in goc:
        s = -1 if g.lat else 1
        kx.append(khung(g.id['dau-nhin'], 'rotation', [(0, -s * 0.07), (30, 0), (60, s * 0.07)], '0 0 1 1'))
        kx.append(khung(g.id['dau-nhin'], 'x', [(0, -s * 4), (30, 0), (60, s * 4)], '0 0 1 1'))
        ky.append(khung(g.id['dau-nhin'], 'y', [(0, -4), (30, 0), (60, 3)], '0 0 1 1'))
        for t in g.thu_tu:
            if t.startswith(('mat-', 'long-may-')):
                lx, ly = g.vi_tri_dau(t)
                kx.append(khung(g.k(t), 'x', [(0, lx - s * 5), (30, lx), (60, lx + s * 5)], '0 0 1 1'))
                ky.append(khung(g.k(t), 'y', [(0, ly - 4), (30, ly), (60, ly + 3)], '0 0 1 1'))
    a_nx = ani('Nhìn ngang', 60, kx, lap=False)
    a_ny = ani('Nhìn dọc', 60, ky, lap=False)
    joy['nhin'] = moi_id()
    joy_xml.append(f'<Joystick posX="256" posY="256" width="512" height="512" xId="{a_nx}" yId="{a_ny}" '
                   f'name="Nhìn" id="{joy["nhin"]}"/>')
    lop_nac('Nhìn ngang', joy['nhin'], 'x', vao['nhin_x'], [-1, -0.5, 0, 0.5, 1], [-0.75, -0.25, 0.25, 0.75], 260)
    lop_nac('Nhìn dọc', joy['nhin'], 'y', vao['nhin_y'], [-1, 0, 1], [-0.33, 0.33], 260)

    # ---------- Chạm: nhún cả người từ bàn chân (squash & stretch), tai/khăn theo sau nhờ lớp Phụ ----------
    k = []
    for g in goc:
        k.append(khung(g.id['nhun'], 'scaleY', [(0, 1), (8, .93), (20, 1.05), (32, .985), (44, 1)]))
        k.append(khung(g.id['nhun'], 'scaleX', [(0, 1), (8, 1.045), (20, .97), (32, 1.008), (44, 1)]))
        k.append(khung(g.id['dau'], 'y', [(0, g.co_xy[1] - 412), (8, g.co_xy[1] - 412 + 3), (20, g.co_xy[1] - 412 - 4),
                                          (32, g.co_xy[1] - 412 + 1), (44, g.co_xy[1] - 412)]))
        for t in g.thu_tu:
            if t.startswith('mat-'):
                k.append(khung(g.k(t), 'scaleY', [(0, 1), (6, .25), (34, .25), (44, 1)]))
    a_cho = ani('Chờ chạm', 1, [])
    a_nhun = ani('Nhún khi chạm', 44, k, lap=False)
    s_cho, s_nhun = moi_id(), moi_id()
    lop.append(f'<StateMachineLayer name="Chạm" id="{moi_id()}"><AnyState/><ExitState/>'
               f'<EntryState><StateTransition stateToId="{s_cho}"/></EntryState>'
               f'<AnimationState animationId="{a_cho}" id="{s_cho}"><StateTransition stateToId="{s_nhun}">'
               f'<TransitionTriggerCondition inputId="{vao["cham"]}"/></StateTransition></AnimationState>'
               f'<AnimationState animationId="{a_nhun}" id="{s_nhun}"><StateTransition stateToId="{s_cho}" '
               f'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/></AnimationState></StateMachineLayer>')

    # ---------- Vùng bấm (chỉ bản xem thử) ----------
    vung, nghe = [], ''
    if XEM:
        for i, v in enumerate(nac):
            sid = moi_id()
            vung.append(f'<Shape x="{51.2 + 102.4 * i:.1f}" y="256" name="vung-{i}" id="{sid}">'
                        f'<Rectangle width="102.4" height="512" name="P"/><Fill name="F"><SolidColor colorValue="01FFFFFF" '
                        f'name="C"/></Fill></Shape>')
            nghe += (f'<StateMachineListenerSingle targetId="{sid}" listenerTypeValue="down" name="Đổi hướng {i}" '
                     f'id="{moi_id()}"><ListenerNumberChange inputId="{vao["huong"]}" value="{v}"/>'
                     f'<ListenerTriggerChange inputId="{vao["cham"]}"/></StateMachineListenerSingle>'
                     f'<StateMachineListenerSingle targetId="{sid}" listenerTypeValue="enter" name="Nhìn {i}" '
                     f'id="{moi_id()}"><ListenerNumberChange inputId="{vao["nhin_x"]}" value="{v}"/>'
                     f'</StateMachineListenerSingle>')
    smid = moi_id()
    goc_xml = ''.join(g.xml() for g in reversed(goc))
    dau_vao = (f'<StateMachineNumber name="hanh_dong" value="0" id="{vao["hanh_dong"]}"/>'
               f'<StateMachineNumber name="huong" value="{os.environ.get("AGV_HUONG", "0")}" id="{vao["huong"]}"/>'
               f'<StateMachineTrigger name="cham" id="{vao["cham"]}"/>'
               f'<StateMachineNumber name="nhin_x" value="{os.environ.get("AGV_NHIN_X", "0")}" id="{vao["nhin_x"]}"/>'
               f'<StateMachineNumber name="nhin_y" value="0" id="{vao["nhin_y"]}"/>')
    print(f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="{smid}" styleId="0:5" width="512" height="512" name="trau" id="0:2">
<LayoutComponentStyle name="Kiểu" id="0:5"/>
{''.join(vung)}{''.join(joy_xml)}{goc_xml}
<StateMachine name="trau" id="{smid}">{dau_vao}{''.join(lop)}{nghe}</StateMachine>
{''.join(anim)}
</Artboard>
</Rive>''')


if __name__ == '__main__':
    main()
