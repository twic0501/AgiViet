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
import copy
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
        self.bien = {}                                     # (bên, tư thế) → (id hiện, id xoay)
        if ten == 'chinh':
            self.nach_theo_tay(svg)
            self.khop_vai()
            self.tay_gio()
        dk = self.bp.get('dau-khoi')
        self.co_xy = (dk[0], dk[1]) if dk else (256, 300)  # điểm xoay đầu = cổ
        self.id = {k: moi_id() for k in ('goc', 'nghich', 'nhun', 'hong', 'vai', 'than', 'dau', 'dau-quanh',
                                          'dau-nghich', 'dau-nhin')}
        # Nút bọc trong bộ phận (mỗi lớp hoạt ảnh một nút riêng → không giành nhau một thuộc tính):
        # tai: ngoài = Phụ (đung đưa) → giat (Giật tai) → nghich (Nghịch); tay, đuôi: ngoài = Phụ → nghich.
        self.boc = {}
        self.mat_cuoi = {}                                 # mắt → nội dung hình cung "^" (mắt cười)
        for g in nhom:
            t = g.get('id')
            if t.startswith('mat-'):
                xs, ys = [], []
                for e in g.iter():
                    if e.get('d'):
                        v = [float(x) for x in __import__('re').findall(r'-?\d+\.?\d*', e.get('d'))]
                        xs += v[0::2]; ys += v[1::2]
                    if e.get('cx'):
                        cx_, cy_, rx, ry = (float(e.get(a)) for a in ('cx', 'cy', 'rx', 'ry'))
                        xs += [cx_ - rx, cx_ + rx]; ys += [cy_ - ry, cy_ + ry]
                cx_, cy_ = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
                w, h = max(xs) - min(xs), max(ys) - min(ys)
                ew = max(w * 0.95, 9.0)
                el = ET.Element(NS + 'path', {
                    'd': f'M{cx_ - ew:.2f} {cy_ + h * 0.12:.2f}Q{cx_:.2f} {cy_ - h * 0.55:.2f} {cx_ + ew:.2f} {cy_ + h * 0.12:.2f}',
                    'fill': 'none', 'stroke': '#24190f', 'stroke-width': '3.8', 'stroke-linecap': 'round'})
                gx, gy = self.bp[t][0], self.bp[t][1]
                self.mat_cuoi[t] = tc.hinh(el, {}, gx, gy, f'{t}-cuoi-hinh')
        for t in self.thu_tu:
            if t.startswith('mat-'):
                self.boc[t] = {'cx': moi_id(), 'cham': moi_id(), 'vui': moi_id()}
            elif t.startswith('long-may-'):
                self.boc[t] = {'cx': moi_id()}
            elif t.startswith('tai-'):
                self.boc[t] = {'giat': moi_id(), 'nghich': moi_id()}
            elif t.startswith('tay-') or t == 'duoi':
                self.boc[t] = {'nghich': moi_id()}

    def nach_theo_tay(self, svg):
        """Viền nách (vien-nach-thuot-*) V4g nằm trong thân áo, cố định → khi tay đưa ra lộ thành vệt đen lạc trên áo.
        Tách thành 'tay-<bên>-nach': cùng điểm xoay vai, tên bắt đầu bằng tay- nên nhận mọi hoạt ảnh tay và bị ẩn
        khi đổi sang tay tư thế giơ; vẫn nằm trên thân áo như cũ."""
        than = next(g for g in svg.iter(NS + 'g') if g.get('id') == 'than')
        for ben in ('trai', 'phai'):
            el = next((e for e in than if e.get('data-role') == f'vien-nach-thuot-{ben}'), None)
            if el is None or f'tay-{ben}' not in self.bp:
                continue
            gx, gy, _, _ = self.bp[f'tay-{ben}']
            ten = f'tay-{ben}-nach'
            self.bp[ten] = (gx, gy, tc.hinh(el, {}, gx, gy, ten + '-h'), moi_id())
            self.thu_tu.insert(self.thu_tu.index('than') + 1, ten)
            # bỏ viền nách khỏi nội dung thân (dựng lại thân không có nó)
        g2 = copy.deepcopy(than)
        for e in list(g2):
            if (e.get('data-role') or '').startswith('vien-nach-thuot'):
                g2.remove(e)
        x, y, _, nid = self.bp['than']
        _, _, ruot = tc.bo_phan(g2, {})
        self.bp['than'] = (x, y, ruot, nid)

    def khop_vai(self):
        """Bắp vai phình (chính diện, nơi tay giơ cao): tay V4g là khối cứng nằm sau thân, giơ lên thì ống tay mỏng
        đều, sườn áo cắt ngang → trông như bị chặt. Thêm "tay-*-vai": bầu dục màu áo có viền ở gốc ống tay, nằm TRÊN
        thân áo (dưới khăn), cùng điểm xoay và nhận cùng mọi hoạt ảnh của tay (tên bắt đầu bằng tay-) → vai tròn
        liền ống tay ở mọi góc giơ."""
        for t in [x for x in self.thu_tu if x in ('tay-trai', 'tay-phai')]:
            gx, gy, _, _ = self.bp[t]
            s = -1 if t == 'tay-trai' else 1
            goc = math.atan2(53, 34 * s)                     # hướng ống tay lúc buông
            cx, cy = gx + 11 * math.cos(goc), gy + 11 * math.sin(goc)
            quay = f'rotate({math.degrees(goc):.1f} {cx:.2f} {cy:.2f})'
            # viền: bầu dục đen to hơn 2,8 nằm DƯỚI tay và thân → chỉ lộ ở mép ngoài hình bóng
            vien = ET.Element(NS + 'ellipse', {'cx': f'{cx:.2f}', 'cy': f'{cy:.2f}', 'rx': '23.8', 'ry': '20.3',
                                               'transform': quay, 'fill': '#24190f', 'stroke': 'none'})
            # mảng áo không viền nằm TRÊN thân → che đường cắt sườn áo / gốc ống tay
            ao = ET.Element(NS + 'ellipse', {'cx': f'{cx:.2f}', 'cy': f'{cy:.2f}', 'rx': '21', 'ry': '17.5',
                                             'transform': quay, 'fill': '#c48f65', 'stroke': 'none'})
            self.bp[f'{t}-vaivien'] = (gx, gy, tc.hinh(vien, {}, gx, gy, f'{t}-vaivien-h'), moi_id())
            self.bp[f'{t}-vai'] = (gx, gy, tc.hinh(ao, {}, gx, gy, f'{t}-vai-h'), moi_id())
            self.thu_tu.insert(self.thu_tu.index(t), f'{t}-vaivien')
            self.thu_tu.insert(self.thu_tu.index('than') + 1, f'{t}-vai')

    def tay_gio(self):
        """Tay tư thế giơ (nguon/goc/tay-chinh.svg, đồ từ Higgsfield): nằm trên thân áo, dưới khăn; ẩn mặc định.
        Cây: nút bộ phận (Xoay thân bật/tắt theo góc) → 'hien' (động tác bật) → 'xoay' (đi nốt đoạn xoay quanh vai)."""
        svg = ET.parse(os.path.join(DIR, 'nguon/goc/tay-chinh.svg')).getroot()
        for g in svg.iter(NS + 'g'):
            t = g.get('id') or ''
            if not t.startswith('tay-'):
                continue
            gx, gy, ruot = tc.bo_phan(g, {})
            ben, tu = t.split('-')[1], t.split('-')[2]
            hien, xoay = moi_id(), moi_id()
            ruot = node(f'{t}-hien', hien, 0, 0, node(f'{t}-xoay', xoay, 0, 0, ruot), ' opacity="0"')
            ten = f'gio-{ben}-{tu}'                      # không bắt đầu bằng tay- → không nhận hoạt ảnh tay buông
            self.bp[ten] = (gx, gy, ruot, moi_id())
            self.thu_tu.insert(self.thu_tu.index('than') + 1, ten)
            self.bien[(ben, tu)] = (hien, xoay)

    def tai(self):
        """[(id giat, id nghich, chiều 'vểnh lên')]: tai chĩa trái (tai-trai V4g) vểnh lên = xoay dương."""
        return [(self.boc[t]['giat'], self.boc[t]['nghich'], 1 if t == 'tai-trai' else -1)
                for t in self.thu_tu if t.startswith('tai-')]

    def tay(self):
        """[(id nghich, chiều 'dang ra')]: tay bên trái màn hình / tay góc nghiêng dang ra = xoay dương."""
        def chieu(t):
            if t.startswith('tay-phai'):
                return -1
            # ¾ và nghiêng: tay vẽ cho dáng buông, giơ cao sẽ lộ ống tay phẳng → chỉ vung vừa (≈ 40 %);
            # giơ cao ở các góc này cần vẽ thêm tư thế tay giơ (làm ở chặng hành động).
            if t == 'tay-gan' and self.ten.startswith('34'):
                return -0.25       # ¾: tay gần nằm bên phải thân → dang ra = xoay ngược (quá → mép sau lòi khỏi áo)
            if self.ten.startswith('ng'):
                return 0.28        # nghiêng: tay đưa ra trước mặt (quá → nét đỉnh vai tách đôi)
            return 1
        return [(self.boc[t]['nghich'], chieu(t)) for t in self.thu_tu if t.startswith('tay-')]

    def tay_ben(self, ben):
        """Các nút bọc 'nghich' của mọi phần tay (ống tay, bắp vai, viền vai) một bên: trai/phai/gan/xa."""
        return [self.boc[t]['nghich'] for t in self.thu_tu if t.startswith(f'tay-{ben}')]

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
                b = self.boc.get(t, {})
                if t.startswith('mat-'):  # chấm mắt và mắt cười là anh em, bật/tắt bằng opacity
                    ruot = node(f'{t}-cuoi', b['vui'], 0, 0, self.mat_cuoi[t], ' opacity="0"') + \
                        node(f'{t}-cham', b['cham'], 0, 0, ruot)
                    ruot = node(f'{t}-cx', b['cx'], 0, 0, ruot)
                else:
                    for ten_boc, bid in reversed(list(b.items())):
                        ruot = node(f'{t}-{ten_boc}', bid, 0, 0, ruot)
                out.append(node(t, nid, x - cha[0], y - cha[1], ruot))
            return ''.join(out)
        dau_nhin = node('dau-nhin', self.id['dau-nhin'], 0, 0, ve(self.dau_bp(), (cox, coy)))
        dau_nghich = node('dau-nghich', self.id['dau-nghich'], 0, 0, dau_nhin)
        dau_quanh = node('dau-quanh', self.id['dau-quanh'], 0, 0, dau_nghich)
        dau = node('dau', self.id['dau'], cox - hong[0], coy - hong[1], dau_quanh)
        than = node('than-tren', self.id['than'], 0, 0, dau + ve(self.than_bp(), hong))
        vai = node('vai', self.id['vai'], 0, 0, than)
        hong_xml = node('hong', self.id['hong'], hong[0] - cx, hong[1] - CHAN_DAT, vai)
        nhun = node('nhun', self.id['nhun'], 0, 0, hong_xml + ve(self.chan_bp(), (cx, CHAN_DAT)))
        lat = ' scaleX="-1"' if self.lat else ''
        nghich = node('nghich', self.id['nghich'], 0, 0, nhun)  # gốc ở bàn chân: vươn vai, nhún nhảy
        return node(f'goc-{self.ten}', self.id['goc'], cx, CHAN_DAT, nghich, lat)

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
                k.append(khung(g.k(t), 'rotation', [(f, s * song(f, 300, 0.08, 20 if 'trai' in t or 'xa' in t else 60))
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

    # ---------- Giật tai: thỉnh thoảng một tai giật nhanh (có lúc 2 cái liền), nhịp không đều ----------
    def giat(f0, d, bien=0.32):
        return [(f0, 0), (f0 + 4, bien * d), (f0 + 9, -0.10 * d), (f0 + 14, 0.12 * d), (f0 + 21, 0)]
    k = []
    for g in goc:
        ds = g.tai()
        for j, (gid, _, d) in enumerate(ds):
            ks = [(0, 0)]
            lich = [130, 760] if j == 0 else [410, 452, 1040]
            if len(ds) == 1:
                lich = [130, 410, 452, 760, 1040]
            for f0 in lich:
                ks += giat(f0, d)
            ks.append((1200, 0))
            k.append(khung(gid, 'rotation', sorted(set(ks)), '0.2 0 0.4 1'))
    lop_mot('Giật tai', ani('Giật tai', 1200, k))

    # ---------- Nghịch: cứ vài giây chọn ngẫu nhiên một động tác toàn thân ----------
    def nghich(ten, dai, fn):
        k = []
        for g in goc:
            k += fn(g)
        return ani(ten, dai, k, lap=False)

    def tai_theo(g, cac):  # cac: [(khung, mức)] mức > 0 = vểnh lên
        return [khung(nid, 'rotation', [(f, v * d) for f, v in cac]) for _, nid, d in g.tai()]

    def duoi_theo(g, cac):
        return [khung(g.boc['duoi']['nghich'], 'rotation', cac)] if 'duoi' in g.boc else []

    def mat(g, prop, cac):  # cảm xúc mắt (nút cx: co giãn, không đụng chớp mắt / nhìn theo)
        return [khung(g.boc[t]['cx'], prop, cac) for t in g.thu_tu if t.startswith('mat-')]

    def mat_cuoi(g, bat, tat):  # bật mắt cười ^^ từ khung bat đến tat
        out = []
        for t in g.thu_tu:
            if t.startswith('mat-'):
                out.append(khung(g.boc[t]['vui'], 'opacity', [(0, 0), (bat, 0), (bat + 4, 1), (tat, 1), (tat + 4, 0)]))
                out.append(khung(g.boc[t]['cham'], 'opacity', [(0, 1), (bat, 1), (bat + 4, 0), (tat, 0), (tat + 4, 1)]))
        return out

    def may(g, prop, cac_trai, cac_phai=None):  # mày: trái/xa và phải/gần có thể khác nhau
        out = []
        for t in g.thu_tu:
            if t.startswith('long-may-'):
                cac = cac_trai if (t.endswith('trai') or t.endswith('xa')) or cac_phai is None else cac_phai
                out.append(khung(g.boc[t]['cx'], prop, cac))
        return out

    def doi_tay(g, ben, tu, f_vao, f_ra, xoay):
        """Đổi tay buông (V4g) bên `ben` sang tay tư thế `tu` từ f_vao đến f_ra; xoay = [(khung, góc)] cho tay mới
        (0 = đúng dáng vẽ). Chỉ góc có tay tư thế giơ (chính diện)."""
        if (ben, tu) not in g.bien:
            return []
        hien, xid = g.bien[(ben, tu)]
        out = [khung(hien, 'opacity', [(0, 0), (f_vao, 0), (f_vao + 1, 1), (f_ra, 1), (f_ra + 1, 0)]),
               khung(xid, 'rotation', xoay)]
        for nid in g.tay_ben(ben):
            out.append(khung(nid, 'opacity', [(0, 1), (f_vao, 1), (f_vao + 1, 0), (f_ra, 0), (f_ra + 1, 1)]))
        return out

    def co_gio(g):
        return bool(g.bien)

    lac_dau = nghich('Nghịch: lắc đầu đuổi ruồi', 80, lambda g: [
        khung(g.id['dau-nghich'], 'rotation', [(0, 0), (6, .10), (13, -.12), (20, .09), (27, -.06), (34, .03), (44, 0)]),
        khung(g.id['nghich'], 'rotation', [(0, 0), (8, -.012), (15, .014), (22, -.01), (30, .005), (44, 0)]),
        *tai_theo(g, [(0, 0), (9, .30), (16, -.28), (23, .24), (30, -.16), (38, .08), (50, 0)]),
        *duoi_theo(g, [(0, 0), (10, .35), (22, -.3), (34, .18), (48, -.06), (62, 0)])])
    vuon_vai = nghich('Nghịch: vươn vai', 160, lambda g: [
        khung(g.id['nghich'], 'scaleY', [(0, 1), (16, .95), (46, 1.07), (100, 1.07), (120, .98), (136, 1.01), (160, 1)]),
        khung(g.id['nghich'], 'scaleX', [(0, 1), (16, 1.03), (46, .97), (100, .97), (120, 1.015), (136, 1), (160, 1)]),
        khung(g.id['dau-nghich'], 'y', [(0, 0), (16, 2), (46, -5), (100, -5), (124, 1), (160, 0)]),
        khung(g.id['dau-nghich'], 'rotation', [(0, 0), (46, -.06), (100, -.06), (128, .015), (160, 0)]),
        *([khung(nid, 'rotation', [(0, 0), (16, -.08 * d), (24, .45 * d), (114, .45 * d), (126, .2 * d), (140, -.04 * d),
                                   (160, 0)]) for nid, d in g.tay()] if co_gio(g) else
          [khung(nid, 'rotation', [(0, 0), (16, -.08 * d), (50, .5 * d), (100, .5 * d), (126, -.08 * d), (140, .03 * d),
                                   (160, 0)]) for nid, d in g.tay()]),
        *doi_tay(g, 'trai', 'cao', 24, 114, [(0, -.7), (24, -.7), (40, .04), (48, 0), (100, 0), (114, -.7)]),
        *doi_tay(g, 'phai', 'cao', 24, 114, [(0, .7), (24, .7), (40, -.04), (48, 0), (100, 0), (114, .7)]),
        *mat(g, 'scaleY', [(0, 1), (40, .45), (104, .45), (124, 1), (160, 1)]),
        *may(g, 'y', [(0, 0), (46, -2), (100, -2), (124, 0), (160, 0)]),
        *tai_theo(g, [(0, 0), (20, -.1), (50, .25), (100, .25), (124, -.08), (160, 0)]),
        *duoi_theo(g, [(0, 0), (50, .3), (100, .3), (130, -.1), (160, 0)])])
    to_mo = nghich('Nghịch: nghiêng đầu tò mò', 170, lambda g: [
        khung(g.id['dau-nghich'], 'rotation', [(0, 0), (26, .17), (112, .17), (142, -.025), (170, 0)]),
        khung(g.id['dau-nghich'], 'x', [(0, 0), (26, 3), (112, 3), (170, 0)]),
        khung(g.id['nghich'], 'rotation', [(0, 0), (32, .022), (112, .022), (152, 0), (170, 0)]),
        *[khung(nid, 'rotation', [(0, 0), (30, (.2 if j == 0 else -.16) * d), (112, (.2 if j == 0 else -.16) * d),
                                  (140, 0), (170, 0)]) for j, (_, nid, d) in enumerate(g.tai())],
        *duoi_theo(g, [(0, 0), (40, .15), (112, .15), (150, 0), (170, 0)])])
    nhay = nghich('Nghịch: nhún nhảy hai nhịp', 72, lambda g: [
        khung(g.id['nghich'], 'y', [(0, 0), (7, 0), (15, -9), (23, 0), (30, 0), (38, -7), (46, 0), (72, 0)], '0.3 0 0.7 1'),
        khung(g.id['nghich'], 'scaleY', [(0, 1), (6, .94), (12, 1.05), (19, 1.04), (23, .93), (29, 1.03), (35, 1.04),
                                         (42, 1.02), (46, .94), (54, 1.01), (64, 1), (72, 1)]),
        khung(g.id['nghich'], 'scaleX', [(0, 1), (6, 1.04), (12, .97), (23, 1.05), (29, .98), (46, 1.04), (54, .995),
                                         (64, 1), (72, 1)]),
        khung(g.id['dau-nghich'], 'y', [(0, 0), (10, 2), (17, -2), (24, 3), (32, 0), (40, -2), (47, 3), (56, 0), (72, 0)]),
        *tai_theo(g, [(0, 0), (14, -.18), (22, .28), (30, -.08), (38, -.18), (46, .28), (56, -.08), (66, 0), (72, 0)]),
        *[khung(nid, 'rotation', [(0, 0), (15, .12 * d), (24, -.04 * d), (38, .1 * d), (47, -.04 * d), (60, 0), (72, 0)])
          for nid, d in g.tay()],
        *duoi_theo(g, [(0, 0), (16, -.3), (26, .3), (40, -.25), (50, .25), (64, 0), (72, 0)])])
    vay_tai = nghich('Nghịch: vẫy tai gật đầu', 70, lambda g: [
        *tai_theo(g, [(0, 0), (4, .35), (9, -.1), (14, .12), (20, 0), (26, .35), (31, -.1), (36, .12), (44, 0), (70, 0)]),
        khung(g.id['dau-nghich'], 'y', [(0, 0), (10, 3), (20, -1), (30, 2), (42, 0), (70, 0)]),
        khung(g.id['dau-nghich'], 'rotation', [(0, 0), (10, .03), (22, -.02), (34, .01), (44, 0), (70, 0)]),
        khung(g.id['nghich'], 'scaleY', [(0, 1), (10, .985), (22, 1.012), (34, .995), (46, 1), (70, 1)])])
    # Cảm xúc (tính cách: hiền, chăm, tò mò, hay vui, thỉnh thoảng ngái ngủ)
    def vui_fn(g):  # vui hớn hở: mắt cười ^^, lắc lư trái phải theo nhịp, hai tay vung lên xen kẽ, tai vểnh, đuôi vẫy
        nhip = [(f, math.sin(2 * math.pi * f / 40)) for f in range(0, 161, 10)]
        out = [*mat_cuoi(g, 6, 150),
               khung(g.id['nghich'], 'rotation', [(f, .035 * v) for f, v in nhip] + [(170, 0), (180, 0)]),
               khung(g.id['nghich'], 'y', [(f, -3 * abs(v)) for f, v in nhip] + [(170, 0), (180, 0)]),
               khung(g.id['dau-nghich'], 'rotation', [(f, -.05 * v) for f, v in nhip] + [(170, 0), (180, 0)]),
               *may(g, 'y', [(0, 0), (8, -3), (150, -3), (162, 0), (180, 0)]),
               *tai_theo(g, [(0, 0), (10, .28), (150, .28), (166, 0), (180, 0)]),
               *duoi_theo(g, [(f, .3 * math.sin(2 * math.pi * f / 20)) for f in range(0, 161, 5)] + [(170, 0), (180, 0)])]
        for j, (nid, d) in enumerate(g.tay()):
            pha = 0 if j == 0 else 20
            out.append(khung(nid, 'rotation', [(0, 0)] + [(f, d * (.28 + .22 * math.sin(2 * math.pi * (f - pha) / 40)))
                                                         for f in range(10, 151, 10)] + [(166, 0), (180, 0)]))
        return out
    vui = nghich('Cảm xúc: vui hớn hở', 180, vui_fn)

    def ngu_fn(g):  # ngái ngủ: mắt lim dim, đầu gật gù chúi xuống, tai cụp, người chùng → giật mình tỉnh, lắc đầu
        return [*mat(g, 'scaleY', [(0, 1), (20, .55), (60, .3), (100, .15), (128, .12), (134, 1.25), (150, 1), (200, 1)]),
                khung(g.id['dau-nghich'], 'y', [(0, 0), (40, 3), (70, 1), (110, 7), (128, 9), (134, -3), (146, 0), (200, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (60, .04), (128, .08), (134, -.03), (150, .06), (162, -.04),
                                                       (174, .02), (186, 0), (200, 0)]),
                khung(g.id['nghich'], 'scaleY', [(0, 1), (100, .975), (128, .97), (134, 1.04), (146, .99), (160, 1), (200, 1)]),
                *tai_theo(g, [(0, 0), (60, -.22), (128, -.3), (134, .3), (146, -.1), (160, .1), (176, 0), (200, 0)]),
                *may(g, 'y', [(0, 0), (60, 2), (128, 3), (134, -4), (150, 0), (200, 0)]),
                *[khung(nid, 'rotation', [(0, 0), (100, -.05 * d), (128, -.06 * d), (136, .2 * d), (156, 0), (200, 0)])
                  for nid, d in g.tay()],
                *duoi_theo(g, [(0, 0), (120, -.1), (136, .35), (150, -.2), (166, 0), (200, 0)])]
    ngu = nghich('Cảm xúc: ngái ngủ', 200, ngu_fn)

    def giat_minh_fn(g):  # giật mình: mắt mở to, mày nhướng, tai dựng, người bật lùi rồi thở phào
        return [*mat(g, 'scaleY', [(0, 1), (4, 1.3), (40, 1.3), (60, 1), (110, 1)]),
                *mat(g, 'scaleX', [(0, 1), (4, 1.2), (40, 1.2), (60, 1), (110, 1)]),
                *may(g, 'y', [(0, 0), (4, -6), (44, -6), (64, 0), (110, 0)]),
                *tai_theo(g, [(0, 0), (4, .4), (40, .4), (52, -.1), (64, .05), (80, 0), (110, 0)]),
                khung(g.id['nghich'], 'y', [(0, 0), (5, -8), (12, 0), (16, 0), (110, 0)], '0.3 0 0.7 1'),
                khung(g.id['nghich'], 'rotation', [(0, 0), (6, .04), (40, .03), (70, -.008), (90, 0), (110, 0)]),
                khung(g.id['nghich'], 'scaleY', [(0, 1), (3, .95), (6, 1.06), (13, .95), (20, 1.02), (60, 1.01),
                                                 (72, .97), (90, 1), (110, 1)]),
                *[khung(nid, 'rotation', [(0, 0), (5, .45 * d), (40, .38 * d), (68, -.05 * d), (86, 0), (110, 0)])
                  for nid, d in g.tay()],
                # hạ tay ngang chỉ một đoạn ngắn rồi đổi về tay buông (hạ sâu thì mép dưới ống tay quét qua mặt áo)
                *doi_tay(g, 'trai', 'ngang', 5, 40, [(0, -.6), (5, -.6), (9, .05), (14, 0), (34, -.03), (40, -.16)]),
                *doi_tay(g, 'phai', 'ngang', 5, 40, [(0, .6), (5, .6), (9, -.05), (14, 0), (34, .03), (40, .16)]),
                *duoi_theo(g, [(0, 0), (6, .5), (40, .4), (70, -.1), (90, 0), (110, 0)])]
    giat_minh = nghich('Cảm xúc: giật mình', 110, giat_minh_fn)

    # Tay chỉ xoay tối đa ~30° (0,5 rad): tay V4g vẽ cho dáng buông, quá 40° ống tay thành thanh dẹt cứng.
    # Tay giơ cao thật cần hình vẽ riêng cho tư thế tay giơ (đổi hình), chưa có.
    def chao_fn(g):  # vẫy tay chào: tay phải (chính diện) / tay gần giơ cao vẫy, người nghiêng, mắt cười, đầu nghiêng
        ben = 'phai' if co_gio(g) else ('gan' if g.tay_ben('gan') else 'phai')
        d = -1 if ben == 'phai' else (dict(g.tay()).get(g.tay_ben(ben)[0], 1) if g.tay_ben(ben) else 1)
        out = [*mat_cuoi(g, 24, 120),
               khung(g.id['nghich'], 'rotation', [(0, 0), (10, .01 * d), (28, -.03 * d), (128, -.03 * d), (156, .005 * d),
                                                  (176, 0)]),
               khung(g.id['dau-nghich'], 'rotation', [(0, 0), (28, .09), (128, .09), (160, 0), (176, 0)]),
               *may(g, 'y', [(0, 0), (24, -3), (128, -3), (150, 0), (176, 0)]),
               *tai_theo(g, [(0, 0), (26, .25), (126, .25), (150, -.05), (170, 0), (176, 0)]),
               *duoi_theo(g, [(f, .25 * math.sin(2 * math.pi * f / 24)) for f in range(0, 145, 6)] + [(160, 0), (176, 0)])]
        if co_gio(g):  # đổi sang tay giơ cao, vẫy quanh vai
            for nid in g.tay_ben('phai'):
                out.append(khung(nid, 'rotation', [(0, 0), (8, .1), (16, -.45), (132, -.45), (146, -.2), (160, .03),
                                                   (176, 0)]))
            # tay phải: hình vẫy (bảng Higgsfield hình 2), vẫy quanh vai; tay trái: hình buông thả sát thân
            vay = [(26 + 10 * i, (.14 if i % 2 else -.1)) for i in range(0, 10)]
            out += doi_tay(g, 'phai', 'vay', 16, 132, [(0, .65), (16, .65), (26, 0)] + vay[1:] + [(122, 0), (132, .65)])
            for nid in g.tay_ben('trai'):
                out.append(khung(nid, 'rotation', [(0, 0), (16, -.12), (132, -.12), (150, 0), (176, 0)]))
            out += doi_tay(g, 'trai', 'tha', 18, 130, [(0, .22), (18, .22), (30, -.03), (38, 0), (120, 0), (130, .22)])
        else:
            for nid in g.tay_ben(ben):
                out.append(khung(nid, 'rotation', [(0, 0), (10, -.1 * d), (28, .48 * d)] +
                                 [(28 + 10 * i, (.48 + (.1 if i % 2 else -.06)) * d) for i in range(1, 9)] +
                                 [(128, .48 * d), (148, -.08 * d), (160, .03 * d), (176, 0)]))
        for b2 in (() if co_gio(g) else ('trai', 'xa')):
            if b2 != ben:
                for nid in g.tay_ben(b2):
                    out.append(khung(nid, 'rotation', [(0, 0), (28, .1 * (1 if b2 == 'trai' else d)), (128, .1),
                                                       (156, 0), (176, 0)]))
        return out
    chao = nghich('Cảm xúc: vẫy tay chào', 176, chao_fn)

    # Lớp: Chờ (5 s) → chọn ngẫu nhiên 1 trong 5 động tác hoặc chờ thêm (4 s) → xong động tác thì về Chờ.
    a_cho1, a_cho2 = ani('Nghịch: chờ', 300, [], lap=False), ani('Nghịch: chờ thêm', 240, [], lap=False)
    s_cho1, s_cho2 = moi_id(), moi_id()
    dong = [(a, moi_id()) for a in (lac_dau, vuon_vai, to_mo, nhay, vay_tai, vui, ngu, giat_minh, chao)]
    if os.environ.get('AGV_THU'):  # kiểm thử: chỉ một động tác, chờ 10 khung (dùng khi chụp soi)
        dong = [dong[int(os.environ['AGV_THU'])]]
        a_cho1 = ani('Nghịch: chờ (thử)', 10, [], lap=False)
    het = 'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"'
    # vào động tác trộn 200 ms; riêng giật mình vào ngay (động tác bật đột ngột, đổi tay ở khung 5 —
    # trộn sẽ thấy cả tay cũ lẫn tay mới mờ chồng nhau)
    chon = ''.join(f'<StateTransition stateToId="{sid}" duration="{0 if aid == giat_minh else 200}" {het}/>'
                   for aid, sid in dong) + \
        ('' if os.environ.get('AGV_THU') else f'<StateTransition stateToId="{s_cho2}" {het}/>')
    ve_cho = f'<StateTransition stateToId="{s_cho1}" duration="250" {het}/>'
    lop.append(f'<StateMachineLayer name="Nghịch" id="{moi_id()}"><AnyState/><ExitState/>'
               f'<EntryState><StateTransition stateToId="{s_cho1}"/></EntryState>'
               f'<AnimationState animationId="{a_cho1}" id="{s_cho1}" random="true">{chon}</AnimationState>'
               f'<AnimationState animationId="{a_cho2}" id="{s_cho2}">{ve_cho}</AnimationState>'
               + ''.join(f'<AnimationState animationId="{aid}" id="{sid}">{ve_cho}</AnimationState>' for aid, sid in dong)
               + '</StateMachineLayer>')

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
