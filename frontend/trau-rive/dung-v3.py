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
- cham: ngẫu nhiên nhún nhắm mắt / cười khúc khích / giật mình nhẹ. nhin_x/nhin_y: đầu và mắt nhìn theo.
- hanh_dong 1 chào, 2 chỉ đường, 3 cầm giấy, 4 mừng, 5 xin lỗi, 6 chờ, 7 đi, 8 suy nghĩ: lớp 'Hành động', lặp;
  Nghịch tự tắt khi hanh_dong ≠ 0.
  Bản xem thử: bấm dải trên cùng — nửa trái = chào, nửa phải = nghỉ.
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

# Tay biến hình (morph) theo bảng tư thế Higgsfield cho cả 3 góc (docs/trau/tham-chieu/higgsfield-tay-{chinh,34,
# nghieng-2}.png, đã duyệt 31/10): 3 dáng buông / dang ngang / giơ cao, cùng 8 đỉnh ống tay theo thứ tự
# 0 gốc · 1–3 mép A (mép ngoài lúc buông → mép trên lúc dang) · 4–6 mép B · 7 gốc. Đoạn 3→4 là cổ tay (cắt phẳng).
# Toạ độ đọc trên lưới khung 512 (catbang.py căn chân/chóp sừng như các góc đã chốt). Chính diện: tay trái, tay phải
# lật gương. ¾ / nghiêng: tay gần. Bàn tay V4g bám đoạn cổ tay.
TAY_MORPH = {
    'chinh': {'buong': [(178, 310), (164, 311), (140, 334), (117, 358), (150, 376), (158, 355), (166, 334), (178, 334)],
              'ngang': [(178, 304), (165, 303), (135, 305), (104, 305), (104, 353), (135, 353), (165, 353), (178, 350)],
              'cao': [(176, 305), (163, 302), (146, 284), (126, 267), (102, 298), (125, 326), (150, 356), (172, 350)]},
    '34': {'buong': [(300, 300), (305, 306), (309, 335), (311, 366), (250, 366), (252, 345), (258, 325), (290, 305)],
           'ngang': [(290, 302), (300, 299), (320, 297), (342, 296), (342, 350), (315, 348), (290, 346), (278, 330)],
           'cao': [(292, 312), (289, 305), (299, 272), (310, 240), (341, 262), (325, 300), (307, 338), (296, 330)]},
    'ng': {'buong': [(258, 304), (243, 312), (235, 340), (227, 372), (297, 386), (293, 350), (284, 312), (276, 304)],
           'ngang': [(252, 296), (230, 292), (190, 291), (146, 291), (146, 347), (190, 346), (235, 341), (256, 336)],
           'cao': [(178, 300), (168, 295), (150, 280), (132, 264), (113, 308), (140, 322), (165, 334), (178, 325)]},
}
V4G_CO_TAY = ((124.5, 366.5), (159.6, 393.3))     # cổ tay trái V4g: mép ngoài A, mép trong B
# góc tay (rad) trong hoạt ảnh → vị trí joystick: 0 buông (−1), 1,1 ngang (0), 1,9 cao (1)
def goc_sang_x(th):
    th = max(0.0, th)
    return -1 + th / 1.1 if th <= 1.1 else min(1.0, (th - 1.1) / 0.8)


GOC = [  # (tên, tệp, lật gương)
    ('chinh', 'nguon/trau.svg', False),
    # ¾ / nghiêng: bản thân áo không tay (do-goc.py với AGV_KHONG_TAY=1); tay gần biến hình gắn vào (tay_morph)
    ('34t', 'nguon/goc/trau-34-trai-khongtay.svg', False),
    ('ngt', 'nguon/goc/trau-nghieng-trai-khongtay.svg', False),
    ('34p', 'nguon/goc/trau-34-trai-khongtay.svg', True),
    ('ngp', 'nguon/goc/trau-nghieng-trai-khongtay.svg', True),
]
# Tạm thời (31/10, người sáng lập chốt): chỉ dựng góc CHÍNH DIỆN; ¾ / nghiêng để nâng cấp sau.
# Input huong vẫn giữ trong hợp đồng nối nhưng chưa đổi hình. Bật lại cả 5 góc: AGV_DU_GOC=1.
if os.environ.get('AGV_DU_GOC') != '1':
    GOC = GOC[:1]
# huong: khoảng của từng góc; nấc chuẩn để đặt joystick
NAC = [(-1.0, 'ngt'), (-0.5, '34t'), (0.0, 'chinh'), (0.5, '34p'), (1.0, 'ngp')]
NGUONG = [-0.75, -0.25, 0.25, 0.75]
CHAN_DAT = 490
V4 = os.environ.get('AGV_V4') == '1'     # bản v4 (bảng hanh_dong 0–9 mới, đầu vào vao, artboard nhỏ)
NHO = os.environ.get('AGV_NHO') == '1'   # artboard 'trau_nho' (đầu + vai, cho cỡ 48–64 px)
BUOC_KHOA = int(os.environ.get("AGV_BUOC_KHOA", "30" if os.environ.get('AGV_NHO') == '1' else "20"))   # bước khoá đỉnh tay biến hình


def la_dau(t):
    return t in ('dau-khoi', 'mom', 'vien-cam-truoc', 'ba-cham', 'zzz') or t.startswith(('sung-', 'tai-', 'mat-', 'long-may-'))


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
        self.xuong = {}                                    # tay da bọc xương: tên → (gx, gy, id nút hình, id xương thân)
        self.tren_dau = []                                 # bộ phận thân vẽ TRÊN đầu (tay ¾ khi giơ cao)
        self.morph = {}                                    # tay chính diện: bên → (id joystick-anim đỉnh, …)
        # Tay: biến hình theo 3 dáng Higgsfield ở cả 3 góc (tay_morph). Các cách cũ (uốn xương, đổi hình) không dùng.
        self.morph_bs, self.bs_id, self.giay = {}, {}, None
        if ten == 'chinh':
            self.tay_chinh(svg)
            if V4:
                self.them_v4()
        else:
            self.tay_morph(svg)
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
        for t, (_, _, _, id_c, _) in self.xuong.items():   # tay da: nút 'nghich' là xương con
            self.boc[t] = {'nghich': id_c}

    def nach_vao_tay(self, svg):
        """Viền nách V4g (trong thân áo) chuyển sang nhóm tay cùng bên → khi tay đung đưa không lộ vệt đen trên áo."""
        than = next(g for g in svg.iter(NS + 'g') if g.get('id') == 'than')
        nach = {e.get('data-role').rsplit('-', 1)[1]: e for e in than
                if (e.get('data-role') or '').startswith('vien-nach-thuot')}
        g2 = copy.deepcopy(than)
        for e in list(g2):
            if (e.get('data-role') or '').startswith('vien-nach-thuot'):
                g2.remove(e)
        x, y, _, nid = self.bp['than']
        self.bp['than'] = (x, y, tc.bo_phan(g2, {})[2], nid)
        for ben, e in nach.items():
            t = f'tay-{ben}'
            if t in self.bp:
                gx, gy, ruot, nid = self.bp[t]
                self.bp[t] = (gx, gy, tc.hinh(e, {}, gx, gy, f'{t}-nach') + ruot, nid)

    def tay_morph(self, svg):
        """Tay biến hình theo đường bao dò từ bảng tư thế Higgsfield (nguon/goc/tay-morph.json, tach-tay.py):
        3 lớp tô — viền (đen), ống tay (nâu), bàn tay (xám) — cùng số điểm ở 3 dáng buông / ngang / cao.
        Hoạt ảnh 'Dáng tay' khoá đỉnh mỗi 10 khung, nội suy QUAY quanh vai (góc + bán kính) để tay không co ngắn
        giữa chừng. Nút 'tay-<bên>' (Phụ) → 'nghich' (góc trong động tác → vị trí joystick, xem remap)."""
        import json as _js
        du = _js.load(open(os.path.join(DIR, 'nguon/goc/tay-morph.json')))
        v = 'chinh' if self.ten == 'chinh' else self.ten[:2]
        if self.ten == 'chinh':               # bỏ tay V4g + viền nách trong thân áo
            than = next(g for g in svg.iter(NS + 'g') if g.get('id') == 'than')
            g2 = copy.deepcopy(than)
            for e in list(g2):
                if (e.get('data-role') or '').startswith('vien-nach-thuot'):
                    g2.remove(e)
            x, y, _, nid = self.bp['than']
            self.bp['than'] = (x, y, tc.bo_phan(g2, {})[2], nid)
            cac_ben = ('trai', 'phai')
        else:
            cac_ben = ('gan',)
        MAU = {'vien': 'FF24190F', 'ong': 'FFC48F65', 'ban': 'FF84736B'}
        for kk in list(du):
            if '-' in kk:
                du[kk]['vien'] = du[kk]['ong']        # nét viền ống tay: cùng điểm, đường hở ở gốc vai
        du['goc'] = {kk: du[kk]['goc'] for kk in du if '-' in kk}
        NET = du.get('vien', 5.6)
        KHUNG = (0, 60, 120)
        for ben in cac_ben:
            t = f'tay-{ben}'
            X = (lambda x: x) if ben != 'phai' else (lambda x: 512 - x)
            dang = [{ly: [(X(a), b) for a, b in du[f'{v}-{k}'][ly]] for ly in MAU} for k in range(3)]
            goc_ = [(X(du['goc'][f'{v}-{k}'][0]), du['goc'][f'{v}-{k}'][1]) for k in range(3)]
            px, py = goc_[0]

            def noi(k0, k1, tt, ly, j):
                """điểm j của lớp ly giữa dáng k0→k1 (tt 0..1): quay quanh gốc vai (gốc cũng trượt tuyến tính)"""
                P0, P1 = goc_[k0], goc_[k1]
                a0 = (dang[k0][ly][j][0] - P0[0], dang[k0][ly][j][1] - P0[1])
                a1 = (dang[k1][ly][j][0] - P1[0], dang[k1][ly][j][1] - P1[1])
                g0, g1 = math.atan2(a0[1], a0[0]), math.atan2(a1[1], a1[0])
                while g1 - g0 > math.pi: g1 -= 2 * math.pi
                while g1 - g0 < -math.pi: g1 += 2 * math.pi
                r = math.hypot(*a0) * (1 - tt) + math.hypot(*a1) * tt
                g = g0 * (1 - tt) + g1 * tt
                return (P0[0] * (1 - tt) + P1[0] * tt + r * math.cos(g), P0[1] * (1 - tt) + P1[1] * tt + r * math.sin(g))

            def dung(ten_):
                ruot_, keyed_ = '', []
                for ly in ('vien', 'ong', 'ban'):          # Rive: khai báo trước nằm trên
                    ids = [moi_id() for _ in dang[0][ly]]
                    dinh = ''.join(f'<StraightVertex x="{a - px:.2f}" y="{b - py:.2f}" id="{i}"/>'
                                   for (a, b), i in zip(dang[0][ly], ids))
                    net = (f'<Stroke thickness="{NET}" cap="round" join="round" name="V">'
                           f'<SolidColor colorValue="{MAU["vien"]}" name="C"/></Stroke>')
                    if ly == 'vien':
                        to = net
                    else:
                        to = f'<Fill name="F"><SolidColor colorValue="{MAU[ly]}" name="C"/></Fill>' + (net if ly == 'ban' else '')
                    ruot_ += (f'<Shape x="0" y="0" name="{ten_}-{ly}"><PointsPath isClosed="{"false" if ly == "vien" else "true"}" '
                              f'name="P">{dinh}</PointsPath>{to}</Shape>')
                    for j, vid in enumerate(ids):
                        ks = []
                        for f in range(0, 121, 10):
                            k0 = 0 if f < 60 else 1
                            tt = (f - KHUNG[k0]) / 60
                            ks.append((f, noi(k0, k0 + 1, tt, ly, j) if tt > 0 else dang[k0][ly][j]))
                        for prop, c in (('x', 0), ('y', 1)):
                            off = px if c == 0 else py
                            kf = ''.join(f'<KeyFrameDouble value="{q[c] - off:.2f}" frame="{f}" interpolationType="linear"/>'
                                         for f, q in ks)
                            keyed_.append(f'<KeyedObject objectId="{vid}"><KeyedProperty property="{prop}">{kf}'
                                          f'</KeyedProperty></KeyedObject>')
                return ruot_, keyed_
            ruot, keyed = dung(t)
            if self.ten == 'chinh' and ben == 'phai':
                ruot += self.giay_trong_tay(dang[1]['ban'], px, py)
            nid = self.bp[t][3] if t in self.bp else moi_id()
            if self.ten.startswith('34'):
                # ¾: giơ cao thì tay nằm TRƯỚC má (bảng Higgsfield) → bản thứ hai vẽ trên đầu, đổi ở khung 85
                ruot2, keyed2 = dung(t + '-tren')
                h1, h2 = moi_id(), moi_id()
                ruot = node(f'{t}-duoi-dau', h1, 0, 0, ruot)
                self.bp[t + '-tren'] = (px, py, node(f'{t}-tren-dau', h2, 0, 0, ruot2, ' opacity="0"'), moi_id())
                self.tren_dau = [t + '-tren']
                keyed += keyed2 + [
                    f'<KeyedObject objectId="{h1}"><KeyedProperty property="opacity"><KeyFrameDouble value="1" frame="0"/>'
                    f'<KeyFrameDouble value="0" frame="85"/></KeyedProperty></KeyedObject>',
                    f'<KeyedObject objectId="{h2}"><KeyedProperty property="opacity"><KeyFrameDouble value="0" frame="0"/>'
                    f'<KeyFrameDouble value="1" frame="85"/></KeyedProperty></KeyedObject>']
            self.bp[t] = (px, py, ruot, nid)
            if t in self.thu_tu:
                self.thu_tu.remove(t)
            if self.ten.startswith('ng'):     # nghiêng: tay vung ra trước nằm TRÊN đuôi khăn, dưới khăn quấn cổ
                self.thu_tu.insert(self.thu_tu.index('khan-co'), t)
            else:
                self.thu_tu.insert(self.thu_tu.index('than') + 1, t)
            if self.ten.startswith('34'):
                self.thu_tu.insert(self.thu_tu.index(t) + 1, t + '-tren')
            self.morph[ben] = keyed

    def them_v4(self):
        """v4: ba chấm '…' trên đầu (suy nghĩ / AI đang soạn) và chữ 'Zzz' (ngủ gật); ẩn, hành động bật."""
        mau = 'FF24190F'
        self.ba_cham_id, self.cham_id = moi_id(), [moi_id() for _ in range(3)]
        ruot = ''.join(f'<Node x="{-26 + 26 * i}" y="0" name="cham-{i}" id="{c}"><Shape x="0" y="0" name="c"><Ellipse width="15" '
                       f'height="15" name="P"/><Fill name="F"><SolidColor colorValue="{mau}" name="C"/></Fill></Shape></Node>'
                       for i, c in enumerate(self.cham_id))
        self.bp['ba-cham'] = (256, 58, node('ba-cham', self.ba_cham_id, 0, 0, ruot, ' opacity="0"'), moi_id())
        self.zzz_id, self.z_id = moi_id(), [moi_id() for _ in range(3)]
        ruot = ''
        for i, (w, ox, oy) in enumerate(((10, 0, 0), (13, 15, -15), (16, 33, -30))):
            h = w / 2
            dinh = ''.join(f'<StraightVertex x="{x:.1f}" y="{y:.1f}"/>' for x, y in ((-h, -h), (h, -h), (-h, h), (h, h)))
            ruot += (f'<Node x="{ox}" y="{oy}" opacity="0" name="z-{i}" id="{self.z_id[i]}"><Shape x="0" y="0" name="z">'
                     f'<PointsPath isClosed="false" name="P">{dinh}</PointsPath><Stroke thickness="3.6" cap="round" join="round" '
                     f'name="V"><SolidColor colorValue="{mau}" name="C"/></Stroke></Shape></Node>')
        self.bp['zzz'] = (292, 68, node('zzz', self.zzz_id, 0, 0, ruot, ' opacity="0"'), moi_id())
        self.thu_tu += ['ba-cham', 'zzz']

    def tay_chinh(self, svg):
        """Tay chính diện (31/10 tối): dò theo bảng Higgsfield, tay PHẢI màn hình lật gương (nguon/goc/hf/chinh-dang).
        Mỗi bên tay có nhiều BẢN, cùng một dáng buông ở đầu → đổi bản lúc tay buông không lộ:
        - 'co' (nút tay-<bên>): buông → ngang → cao (joystick 'Dáng tay <bên>', động tác Nghịch dùng qua remap)
        - 'chi' (cùng nút, ẩn): buông → dang tay ngón trỏ chỉ
        - 'giay', 'nghi' (nút tay-<bên>-tren, vẽ TRÊN đầu/khăn, ẩn): buông → cầm giấy trước ngực / chống má
        Bản riêng: joystick 'Dáng tay <bên> <bản>' (x −1 buông … 1 dáng đích), hành động khoá trực tiếp."""
        import json as _js
        du = _js.load(open(os.path.join(DIR, 'nguon/goc/tay-morph.json')))
        than = next(g for g in svg.iter(NS + 'g') if g.get('id') == 'than')   # bỏ tay V4g + viền nách trong thân
        g2 = copy.deepcopy(than)
        for e in list(g2):
            if (e.get('data-role') or '').startswith('vien-nach-thuot'):
                g2.remove(e)
        x, y, _, nid = self.bp['than']
        self.bp['than'] = (x, y, tc.bo_phan(g2, {})[2], nid)
        MAU = {'vien': 'FF24190F', 'ong': 'FFC48F65', 'ban': 'FF84736B'}
        NET = du.get('vien', 5.6)

        import importlib.util as _iu
        _sp = _iu.spec_from_file_location('xuong_tay', os.path.join(DIR, 'xuong_tay.py'))
        xt = _iu.module_from_spec(_sp); _sp.loader.exec_module(xt)

        def bien_hinh(ten_, dang, goc_, khung, px, py, thang=False, xuong=None):
            def noi(k0, k1, tt, ly, j):
                if xuong:     # tay gập khuỷu: nội suy theo khung xương (vai, khuỷu, cổ tay) → như tay thật đang gập
                    return xt.noi_xuong(dang[k0][ly][j], dang[k1][ly][j], xuong[k0], xuong[k1], tt, ly == 'ban')
                if (thang[k0] if isinstance(thang, tuple) else thang):   # nội suy thẳng (tay gập khuỷu: quay quanh vai làm ống tay bẹp)
                    a_, b_ = dang[k0][ly][j], dang[k1][ly][j]
                    return (a_[0] * (1 - tt) + b_[0] * tt, a_[1] * (1 - tt) + b_[1] * tt)
                P0, P1 = goc_[k0], goc_[k1]
                a0 = (dang[k0][ly][j][0] - P0[0], dang[k0][ly][j][1] - P0[1])
                a1 = (dang[k1][ly][j][0] - P1[0], dang[k1][ly][j][1] - P1[1])
                g0, g1 = math.atan2(a0[1], a0[0]), math.atan2(a1[1], a1[0])
                while g1 - g0 > math.pi: g1 -= 2 * math.pi
                while g1 - g0 < -math.pi: g1 += 2 * math.pi
                r = math.hypot(*a0) * (1 - tt) + math.hypot(*a1) * tt
                g = g0 * (1 - tt) + g1 * tt
                return (P0[0] * (1 - tt) + P1[0] * tt + r * math.cos(g), P0[1] * (1 - tt) + P1[1] * tt + r * math.sin(g))
            ruot_, keyed_ = '', []
            for ly in ('vien', 'ong', 'ban'):          # Rive: khai báo trước nằm trên
                ids = [moi_id() for _ in dang[0][ly]]
                dinh = ''.join(f'<StraightVertex x="{a - px:.2f}" y="{b - py:.2f}" id="{i}"/>' for (a, b), i in zip(dang[0][ly], ids))
                net = f'<Stroke thickness="{NET}" cap="round" join="round" name="V"><SolidColor colorValue="{MAU["vien"]}" name="C"/></Stroke>'
                to = net if ly == 'vien' else \
                    f'<Fill name="F"><SolidColor colorValue="{MAU[ly]}" name="C"/></Fill>' + (net if ly == 'ban' else '')
                ruot_ += (f'<Shape x="0" y="0" name="{ten_}-{ly}"><PointsPath isClosed="{"false" if ly == "vien" else "true"}" '
                          f'name="P">{dinh}</PointsPath>{to}</Shape>')
                for j, vid in enumerate(ids):
                    ks = []
                    for f in range(0, khung[-1] + 1, BUOC_KHOA if xuong else (60 if NHO else 30)):   # khoá đỉnh (tay thẳng 30 khung, gập khuỷu 20) — nhẹ tệp
                        k0 = max(i for i in range(len(khung) - 1) if khung[i] <= f) if f < khung[-1] else len(khung) - 2
                        tt = (f - khung[k0]) / (khung[k0 + 1] - khung[k0])
                        ks.append((f, dang[k0][ly][j] if tt == 0 else dang[k0 + 1][ly][j] if tt == 1 else noi(k0, k0 + 1, tt, ly, j)))
                    for prop, c in (('x', 0), ('y', 1)):
                        off = px if c == 0 else py
                        kf = ''.join(f'<KeyFrameDouble value="{q[c] - off:.2f}" frame="{f}" interpolationType="linear"/>' for f, q in ks)
                        keyed_.append(f'<KeyedObject objectId="{vid}"><KeyedProperty property="{prop}">{kf}</KeyedProperty></KeyedObject>')
            return ruot_, keyed_

        for ben in ('trai', 'phai'):
            t = f'tay-{ben}'
            X = (lambda x: x) if ben == 'trai' else (lambda x: 512 - x)

            def lay(k):
                d = du[f'chinh-{k}']
                dg = {ly: [(X(a), b) for a, b in d[ly if ly in d else 'ong']] for ly in MAU}
                return dg, (X(d['goc'][0]), d['goc'][1])
            D = {k: lay(k) for k in ('buong', 'ngang', 'cao', 'chi', 'giay', 'nghi')}
            px, py = D['buong'][1]

            # khung xương (vai, khuỷu, giữa cổ tay) của từng dáng, toạ độ tay trái màn hình (bên phải lật gương)
            XUONG = {'buong': ((178, 318), (160, 352), (147, 381)), 'giay': ((178, 318), (148, 368), (209, 361)),
                     'nghi': ((180, 332), (136, 366), (163, 303))}

            def ban_sao(kieu, cac, khung, thang=False, xuong=False):
                xg = [tuple((X(a), b) for a, b in XUONG[k]) for k in cac] if xuong else None
                return bien_hinh(f'{t}-{kieu}', [D[k][0] for k in cac], [D[k][1] for k in cac], khung, px, py, thang, xg)
            r_co, k_co = ban_sao('co', ('buong', 'ngang', 'cao'), (0, 60, 120))
            ids = {k: moi_id() for k in ('co', 'chi', 'giay', 'nghi')}
            ruot = node(f'{t}-co', ids['co'], 0, 0, r_co)
            tren = ''
            # vùng che (đầu + khăn quấn + đuôi khăn): bản tay vẽ TRÊN đầu, lúc còn gần dáng buông phải nằm SAU khăn/đầu
            # như tay chính (không lộ gốc vai trên khăn) → che bằng ClippingShape, bật khi dáng < 1/3, tắt khi đưa lên
            nguon_che = moi_id()
            lo = [(130, 150), (382, 150), (382, 300), (344, 305), (343, 330), (300, 350), (205, 348), (200, 440),
                  (148, 440), (165, 330), (172, 305), (130, 300)]
            ngoai = [(-400, -400), (900, -400), (900, 900), (-400, 900)]
            lo2 = [(130, 150), (382, 150), (382, 300), (344, 305), (343, 332), (310, 346), (305, 312), (207, 312),
                   (202, 346), (172, 332), (172, 305), (130, 300)]
            nguon_che2 = moi_id()

            def nguon(nid_, lo_):
                return (f'<Shape x="0" y="0" name="{t}-nguon-che" id="{nid_}">'
                        + ''.join(f'<PointsPath isClosed="true" name="P">'
                                  + ''.join(f'<StraightVertex x="{a_ - px:.2f}" y="{b_ - py:.2f}"/>' for a_, b_ in vg)
                                  + '</PointsPath>' for vg in (ngoai, lo_)) + '</Shape>')
            tren = nguon(nguon_che, lo) + nguon(nguon_che2, lo2)
            for kieu in (() if NHO else ('chi', 'giay', 'nghi') if ben == 'phai' else ('giay',)):   # tay trái chỉ cần ôm ngực; artboard nhỏ chỉ tay chính
                if kieu == 'nghi':   # lên má qua dáng ôm trước ngực (không quét ngang)
                    r_, k_ = ban_sao(kieu, ('buong', 'giay', 'nghi'), (0, 60, 120), xuong=True)
                else:
                    r_, k_ = ban_sao(kieu, ('buong', kieu), (0, 120), xuong=(kieu == 'giay'))
                if kieu != 'chi':
                    # che 1 (đầu + khăn + đuôi khăn) lúc gần buông; che 2 (đầu + hai đầu khăn quấn) lúc ôm trước ngực
                    # → đỉnh vai luôn dưới khăn; chống má (cuối 'nghi') bỏ che để bàn tay nằm trên má
                    c1, c2 = moi_id(), moi_id()
                    f1, f2 = (11, 70) if kieu == 'nghi' else (22, 999)
                    r_ = (f'<ClippingShape sourceId="{nguon_che}" fillRule="evenOdd" name="che" id="{c1}"/>'
                          f'<ClippingShape sourceId="{nguon_che2}" fillRule="evenOdd" isVisible="false" name="che2" id="{c2}"/>' + r_)
                    k2 = f'<KeyFrameBool value="false" frame="0"/><KeyFrameBool value="true" frame="{f1}"/>' + \
                        (f'<KeyFrameBool value="false" frame="{f2}"/>' if f2 < 999 else '')
                    k_ = k_ + [f'<KeyedObject objectId="{c1}"><KeyedProperty property="isVisible">'
                               f'<KeyFrameBool value="true" frame="0"/><KeyFrameBool value="false" frame="{f1}"/>'
                               f'</KeyedProperty></KeyedObject>',
                               f'<KeyedObject objectId="{c2}"><KeyedProperty property="isVisible">{k2}'
                               f'</KeyedProperty></KeyedObject>']
                n_ = node(f'{t}-{kieu}', ids[kieu], 0, 0, r_, ' opacity="0"')
                if kieu == 'chi':
                    ruot = n_ + ruot
                else:
                    tren += n_
                self.morph_bs[(ben, kieu)] = k_
            self.bs_id.update({(ben, k): v for k, v in ids.items() if k == 'co' or (ben, k) in self.morph_bs})
            nid = self.bp[t][3] if t in self.bp else moi_id()
            self.bp[t] = (px, py, ruot, nid)
            self.bp[t + '-tren'] = (px, py, tren, moi_id())
            if t in self.thu_tu:
                self.thu_tu.remove(t)
            self.thu_tu.insert(self.thu_tu.index('than') + 1, t)
            self.thu_tu.append(t + '-tren')
            self.morph[ben] = k_co
        # đồ cầm trước ngực bằng hai tay (bản tay 'giay'): giấy chào giá; v4 thêm thúng rau, điện thoại, sổ xanh.
        # (tệp SVG, tâm đặt giữa hai bàn tay, cỡ) — điểm cầm của đạo cụ khớp khoảng cách hai bàn tay (~94 px)
        DO = {'giay': ('giay-chao-gia', '49 62', 256, 352, .82)}
        if V4 and not NHO:
            # thúng: nhóm ngoài có transform → gốc nằm ở (0,0) của tệp, đặt nút ở tâm − (78, 79)·k
            DO.update({'thung': ('thung-trai-cay', '78 79', 187, 304, .88), 'dien-thoai': ('dien-thoai', '45 70', 256, 350, .62),
                       'so': ('so-xanh', '80 92', 256, 362, .75)})
        self.do_cam, ruot_do, ruot_tren = {}, '', ''   # thúng ôm trước ngực vẽ TRÊN hai tay
        for ten_do, (tep_, goc_, dx, dy, k_) in DO.items():
            sv = ET.parse(os.path.join(DIR, f'nguon/dao-cu/{tep_}.svg')).getroot()
            g = ET.Element(NS + 'g', dict(sv.attrib, id=ten_do, **{'data-goc': goc_}))
            for kk in ('viewBox', 'width', 'height'):
                g.attrib.pop(kk, None)
            for e in sv:
                if e.tag in (NS + 'title', NS + 'desc', NS + 'defs') or e.get('clip-path') or (e.get('id') or '').startswith('diem-cam'):
                    continue
                e2 = copy.deepcopy(e)
                for cha in list(e2.iter()):          # bỏ nhóm con có clip-path (Rive không cắt → lộ mảng vuông)
                    for con in list(cha):
                        if con.get('clip-path'):
                            cha.remove(con)
                g.append(e2)
            _, _, rg = tc.bo_phan(g, {})
            self.do_cam[ten_do] = moi_id()
            nut_ = node(ten_do, self.do_cam[ten_do], dx - 256, dy - 352, rg, f' opacity="0" scaleX="{k_}" scaleY="{k_}"')
            if ten_do == 'thung':
                ruot_tren += nut_
            else:
                ruot_do += nut_
        self.giay = self.do_cam['giay']
        self.bp['giay-truoc'] = (256, 352, ruot_do, moi_id())
        self.thu_tu.append('giay-truoc')
        self.bp['do-tren'] = (256, 352, ruot_tren, moi_id())
        self.thu_tu.append('do-tren')
        self.tren_dau = ['giay-truoc', 'tay-trai-tren', 'tay-phai-tren', 'do-tren']

    def giay_trong_tay(self, ban, px, py):
        """Giấy chào giá (nguon/dao-cu) cầm dựng đứng trên bàn tay ở dáng ngang; ẩn, bật trong hành động 3."""
        sv = ET.parse(os.path.join(DIR, 'nguon/dao-cu/giay-chao-gia.svg')).getroot()
        g = ET.Element(NS + 'g', {'id': 'giay', 'data-goc': '49 112', 'stroke': '#24190f', 'stroke-width': '4.2',
                                  'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'fill': 'none'})
        for e in sv:
            if e.tag == NS + 'path' and not e.get('clip-path'):
                g.append(copy.deepcopy(e))
        _, _, ruot = tc.bo_phan(g, {})
        hx = sum(p[0] for p in ban) / len(ban); hy = min(p[1] for p in ban) + 6
        self.giay = moi_id()
        return node('giay', self.giay, hx - px, hy - py, ruot, ' opacity="0" scaleX="0.8" scaleY="0.8"')

    def tay_da(self, svg):
        """Tay chính diện = chính nét tay V4g, uốn bằng xương (skinning) thay vì xoay cứng / đổi hình.
        Mỗi đỉnh của đường tay (kể cả viền nách) gắn vào 2 xương: xương thân (đi theo áo, không xoay) và xương tay
        (xoay). Trọng số theo vị trí dọc trục vai→cổ tay: gốc ống tay dính áo, phần ngoài xoay hẳn, đoạn giữa uốn.
        Dưới tay có khối vai tròn (màu áo + viền) lấp khoảng trống giữa đỉnh tay và khăn khi giơ cao; lúc buông nó
        bị tay/thân/khăn che kín (so V4g lệch 1 điểm ảnh).
        Id của xương tay gốc = id cũ của nút tay (lớp Phụ), xương con = nút 'nghich' (lớp Nghịch) → hoạt ảnh giữ nguyên."""
        import re as _re
        # tay kiểu Higgsfield (người sáng lập: tay V4g "chả giống Higgsfield"): nguon/goc/tay-chinh-hf.svg
        S0, W0, T0, T1 = (170.0, 320.0), (137.0, 386.0), float(os.environ.get('AGV_T0', '-0.05')), float(os.environ.get('AGV_T1', '0.7'))
        tay_hf = ET.parse(os.path.join(DIR, 'nguon/goc/tay-chinh-hf.svg')).getroot()
        than = next(g for g in svg.iter(NS + 'g') if g.get('id') == 'than')
        nach = {e.get('data-role').rsplit('-', 1)[1]: e for e in than
                if (e.get('data-role') or '').startswith('vien-nach-thuot')}
        g2 = copy.deepcopy(than)                       # thân không còn viền nách (viền nách thuộc tay)
        for e in list(g2):
            if (e.get('data-role') or '').startswith('vien-nach-thuot'):
                g2.remove(e)
        x, y, _, nid = self.bp['than']
        self.bp['than'] = (x, y, tc.bo_phan(g2, {})[2], nid)
        for ben in ('trai', 'phai'):
            t = f'tay-{ben}'
            if t not in self.bp:
                continue
            g = next(e for e in tay_hf.iter(NS + 'g') if e.get('id') == t)
            gx, gy, ruot = tc.bo_phan(g, {})   # viền nách V4g bỏ: tay mới có nếp trong riêng
            s0 = S0 if ben == 'trai' else (512 - S0[0], S0[1])
            w0 = W0 if ben == 'trai' else (512 - W0[0], W0[1])
            self.boc_xuong(t, gx, gy, ruot, s0, w0, T0, T1)
            # khối vai: viền đen + mảng áo, gắn thân, nằm dưới tay
            c = (168.0, 332.0) if ben == 'trai' else (344.0, 332.0)
            for ten, r_, mau_ in ((f'vai-vien-{ben}', 17.8, '#24190f'), (f'vai-ao-{ben}', 15.0, '#c48f65')):
                el = ET.Element(NS + 'ellipse', {'cx': str(c[0]), 'cy': str(c[1]), 'rx': str(r_), 'ry': str(r_),
                                                 'fill': mau_, 'stroke': 'none'})
                self.bp[ten] = (c[0], c[1], tc.hinh(el, {}, c[0], c[1], ten + '-h'), moi_id())
                self.thu_tu.insert(self.thu_tu.index(t), ten)

    # tay V4g đặt vào góc ¾ / nghiêng: (nhóm V4g, điểm xoay đích, góc xoay độ, tỉ lệ, nằm dưới thân?)
    TAY_V4G = {'34': ('tay-phai', (330.0, 326.0), 8.0, 0.95, os.environ.get('AGV_34_DUOI', '0') == '1'),
               'ng': ('tay-trai', (290.0, 320.0), -14.0, 0.95, False)}

    def tay_v4g(self, ten):
        """Người sáng lập: tay mọi góc phải là dáng tay V4g ban đầu. Thay tay đồ-từ-ảnh của góc ¾ / nghiêng bằng
        nhóm tay V4g (xoay + co quanh vai, dời tới vai của góc), rồi bọc xương như chính diện.
        ¾: tay nằm dưới thân áo (gốc tay khuất sau áo) + khối vai tròn; nghiêng: tay nằm trên áo, dưới khăn cổ
        (gốc tay khuất dưới khăn) + khối vai tròn dưới tay."""
        import importlib.util as _iu
        sp_ = _iu.spec_from_file_location('goc_nhin', os.path.join(DIR, 'goc-nhin.py'))
        gn = _iu.module_from_spec(sp_); sp_.loader.exec_module(gn)
        nhom, (px, py), deg, k, duoi_than = self.TAY_V4G[ten[:2]]
        v4g = ET.parse(os.path.join(DIR, 'nguon/goc/tay-chinh-hf.svg')).getroot()   # cùng kiểu tay với chính diện
        g = next(e for e in v4g.iter(NS + 'g') if e.get('id') == nhom)
        ox, oy = map(float, g.get('data-goc').split())
        a = math.radians(deg); ca, sa = math.cos(a), math.sin(a)

        def f(x, y):
            u, v = (x - ox) * k, (y - oy) * k
            return (px + u * ca - v * sa, py + u * sa + v * ca)
        g2 = ET.Element(NS + 'g', {**g.attrib, 'id': 'tay-gan', 'data-goc': f'{px} {py}'})
        g2.attrib.pop('style', None)
        for e in g:
            g2.append(gn.bien_phan_tu(e, f))
        gx, gy, ruot = tc.bo_phan(g2, {})
        s0v, w0v = ((170.0, 320.0), (137.0, 386.0)) if nhom == 'tay-trai' else ((342.0, 320.0), (375.0, 386.0))
        nid = self.bp['tay-gan'][3] if 'tay-gan' in self.bp else moi_id()
        self.bp['tay-gan'] = (gx, gy, ruot, nid)
        # ¾: tay nằm trên áo, gần như xoay cả khối (gốc uốn nhẹ) → ống tay đầy, không thắt; nghiêng: uốn mềm
        mac = '-1.0,0.3' if ten.startswith('34') else '-0.05,0.7'
        t0, t1 = (float(v) for v in os.environ.get('AGV_T34' if ten.startswith('34') else 'AGV_TNG', mac).split(','))
        self.boc_xuong('tay-gan', gx, gy, ruot, f(*s0v), f(*w0v), t0, t1)
        # nghiêng: đầu to nằm trên cùng che phía trước-trên → tay chỉ đưa ra trước tới ngang ngực (×1,5)
        self.dau_tay = -2.6 if nhom == 'tay-phai' else 1.5
        # thứ tự vẽ
        if 'tay-gan' in self.thu_tu:
            self.thu_tu.remove('tay-gan')
        self.thu_tu.insert(self.thu_tu.index('than') if duoi_than else self.thu_tu.index('khan-co'), 'tay-gan')
        c = f(*(s0v[0] + (2 if nhom == 'tay-trai' else -2), s0v[1] - 1))
        for ten_, r_, mau_ in (('vai-vien-gan', 17.8 * k, '#24190f'), ('vai-ao-gan', 15.0 * k, '#c48f65')):
            el = ET.Element(NS + 'ellipse', {'cx': str(c[0]), 'cy': str(c[1]), 'rx': str(r_), 'ry': str(r_),
                                             'fill': mau_, 'stroke': 'none'})
            self.bp[ten_] = (c[0], c[1], tc.hinh(el, {}, c[0], c[1], ten_ + '-h'), moi_id())
            self.thu_tu.insert(self.thu_tu.index('tay-gan'), ten_)

    def boc_xuong(self, t, gx, gy, ruot, s0, w0, T0, T1):
        """Bọc nét tay `ruot` (toạ độ tương đối gx, gy) vào 2 xương tại vai s0: xương thân (đi theo áo) và xương tay
        (xoay). Trọng số theo vị trí dọc trục s0→w0: <T0 dính thân, >T1 theo tay hẳn, giữa uốn mượt.
        Góc lật gương (lat): toạ độ thế giới bị lật quanh x = 256 → mọi phép bind (Skin, Tendon) lật theo."""
        import re as _re
        ax = (w0[0] - s0[0], w0[1] - s0[1]); L2 = ax[0] ** 2 + ax[1] ** 2

        def tg(px, py):
            u = ((px - s0[0]) * ax[0] + (py - s0[1]) * ax[1]) / L2
            u = min(1.0, max(0.0, (u - T0) / (T1 - T0)))
            k = round(255 * u * u * (3 - 2 * u))
            if k <= 0:
                return 255, 1
            if k >= 255:
                return 255, 2
            return (255 - k) | (k << 8), 1 | (2 << 8)

        def gan(m):
            tag, attrs = m.group(1), m.group(2)
            a = dict(_re.findall(r'(\w+)="([^"]*)"', attrs))
            px, py = float(a['x']) + gx, float(a['y']) + gy
            v, i = tg(px, py)
            if tag == 'StraightVertex':
                return f'<StraightVertex{attrs}><Weight values="{v}" indices="{i}"/></StraightVertex>'
            h = {}
            for k2 in ('in', 'out'):
                r_, d_ = float(a[f'{k2}Rotation']), float(a[f'{k2}Distance'])
                h[k2] = tg(px + d_ * math.cos(r_), py + d_ * math.sin(r_))
            return (f'<CubicDetachedVertex{attrs}><CubicWeight values="{v}" indices="{i}" inValues="{h["in"][0]}" '
                    f'inIndices="{h["in"][1]}" outValues="{h["out"][0]}" outIndices="{h["out"][1]}"/>'
                    f'</CubicDetachedVertex>')
        id_than_x, id_goc, id_con = moi_id(), self.bp[t][3], moi_id()
        if self.lat:
            sx, X = -1, (lambda x: 512 - x)
        else:
            sx, X = 1, (lambda x: x)
        skin = (f'<Skin xx="{sx}" tx="{X(gx):.2f}" ty="{gy:.2f}" name="Skin">'
                f'<Tendon boneId="{id_than_x}" xx="{sx}" tx="{X(s0[0]):.2f}" ty="{s0[1]:.2f}" name="Than"/>'
                f'<Tendon boneId="{id_con}" xx="{sx}" tx="{X(s0[0] + 0.01):.2f}" ty="{s0[1]:.2f}" name="Tay"/></Skin>')
        ruot = _re.sub(r'<(StraightVertex|CubicDetachedVertex)((?: \w+="[^"]*")*)/>', gan, ruot)
        ruot = ruot.replace('</PointsPath>', skin + '</PointsPath>')
        self.xuong[t] = (s0, id_than_x, id_goc, id_con, moi_id())   # id cuối: nút chứa hình (bật/tắt theo góc)
        self.bp[t] = (gx, gy, ruot, id_goc)
        if self.ten == 'chinh':   # ¾ / nghiêng: gốc tay khuất sau áo / dưới khăn, bắp vai làm mất nét viền ống tay
            self.bap_vai(t, s0, w0)

    def bap_vai(self, t, s0, w0):
        """Bắp vai phình xoay cứng theo tay (người sáng lập: tay dang ngang trông như dải dẹt cắm dưới khăn).
        Tay da uốn quanh vai nên gốc ống tay bị bóp nhọn khi giơ ngang. Thêm bầu dục màu áo nằm TRÊN thân/tay
        (dưới khăn) che chỗ bóp + bầu dục viền đen nằm DƯỚI tay và thân (chỉ lộ ở mép ngoài) — tên bắt đầu bằng
        `t` nên nhận cùng mọi hoạt ảnh xoay của tay, điểm xoay = vai s0."""
        L = math.hypot(w0[0] - s0[0], w0[1] - s0[1])
        ux, uy = (w0[0] - s0[0]) / L, (w0[1] - s0[1]) / L
        dv = float(os.environ.get('AGV_DV', '12'))
        cx, cy = s0[0] + dv * ux, s0[1] + dv * uy
        quay = f'rotate({math.degrees(math.atan2(uy, ux)):.1f} {cx:.2f} {cy:.2f})'
        kv = float(os.environ.get('AGV_KV', '1'))
        for ten, rx, ry, mau_ in ((f'{t}-vaivien', 21.0 * kv + 2.8, 16.5 * kv + 2.8, '#24190f'),
                                  (f'{t}-vai', 21.0 * kv, 16.5 * kv, '#c48f65')):
            el = ET.Element(NS + 'ellipse', {'cx': f'{cx:.2f}', 'cy': f'{cy:.2f}', 'rx': str(rx), 'ry': str(ry),
                                             'transform': quay, 'fill': mau_, 'stroke': 'none'})
            self.bp[ten] = (s0[0], s0[1], tc.hinh(el, {}, s0[0], s0[1], ten + '-h'), moi_id())
        if t in self.thu_tu:
            self.thu_tu.insert(self.thu_tu.index(t), f'{t}-vaivien')
        self.thu_tu.insert(self.thu_tu.index('khan-co') if 'khan-co' in self.thu_tu else len(self.thu_tu), f'{t}-vai')

    def tai(self):
        """[(id giat, id nghich, chiều 'vểnh lên')]: tai chĩa trái (tai-trai V4g) vểnh lên = xoay dương."""
        return [(self.boc[t]['giat'], self.boc[t]['nghich'], 1 if t == 'tai-trai' else -1)
                for t in self.thu_tu if t.startswith('tai-')]

    def tay(self):
        """[(id nghich, chiều 'dang ra')]: tay bên trái màn hình / tay góc nghiêng dang ra = xoay dương."""
        def chieu(t):
            if self.xuong:                 # ¾ / nghiêng: tay V4g bọc xương
                return self.dau_tay
            if self.morph:                 # tay biến hình: góc lớn (×2,6) → vị trí dáng tay (goc_sang_x)
                return -2.6 if t.startswith('tay-phai') else 2.6
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

    def hien(self, t):
        """Nút để bật/tắt bộ phận theo góc (tay da: nút chứa hình, vì id của bộ phận là xương — xương không có độ mờ)."""
        return self.xuong[t][4] if t in self.xuong else self.bp[t][3]

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
                if t in self.xuong:              # tay da: hình đã bọc xương; nút chứa chỉ để bật/tắt theo góc
                    out.append(node(t, self.xuong[t][4], x - cha[0], y - cha[1], ruot))
                    continue
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
        xuong = ''
        for t, (s0, id_t, id_g, id_c, _) in self.xuong.items():
            bx, by = s0[0] - hong[0], s0[1] - hong[1]
            xuong += (f'<RootBone x="{bx:.2f}" y="{by:.2f}" length="0.01" name="xuong-than-{t}" id="{id_t}"/>'
                      f'<RootBone x="{bx:.2f}" y="{by:.2f}" length="0.01" name="xuong-{t}" id="{id_g}">'
                      f'<Bone length="0.01" name="xuong-{t}-nghich" id="{id_c}"/></RootBone>')
        than = node('than-tren', self.id['than'], 0, 0, xuong + ve(self.tren_dau, hong) + dau
                    + ve([t for t in self.than_bp() if t not in self.tren_dau], hong))
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

    REMAP = {}   # id nút 'nghich' tay chính diện → (id joystick, dấu)

    def remap(keyed):
        import re as _re
        out = []
        for k in keyed:
            m = _re.match(r'<KeyedObject objectId="([^"]+)"><KeyedProperty property="rotation">(.*)</KeyedProperty></KeyedObject>$',
                          k, _re.S)
            if m and m.group(1) in REMAP and REMAP[m.group(1)] is None:
                continue                  # bản tay ¾ vẽ trên đầu: đã theo dáng tay, không xoay thêm
            if m and m.group(1) in REMAP:
                jid, dau = REMAP[m.group(1)]
                kfs = _re.sub(r'value="([-\d.]+)"', lambda mm: f'value="{goc_sang_x(dau * float(mm.group(1))):.4f}"',
                              m.group(2))
                out.append(f'<KeyedObject objectId="{jid}"><KeyedProperty property="x">{kfs}</KeyedProperty></KeyedObject>')
            else:
                out.append(k)
        return out

    def ani(ten, dai, keyed, lap=True):
        keyed = remap(keyed)
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
        if len(goc) == 1:
            return goc[0].ten
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
    a_than = ani('Xoay thân', 120, tat_bat(lambda g: [g.hien(t) for t in g.than_bp()]) + bop, lap=False)
    a_chan = ani('Xoay chân', 120, tat_bat(lambda g: [g.k(t) for t in g.chan_bp()]), lap=False)
    a_rong = ani('Rỗng', 120, [], lap=False)
    joy = {}
    joy_xml = []
    a_rong_tay = ani('Dáng tay: rỗng', 120, [], lap=False)
    dang_tay_vao_nghi = []      # khoá về buông khi Nghịch đang chờ
    for g in goc:
        for ben, keyed in g.morph.items():
            jid = moi_id()
            a_dt = ani(f'Dáng tay {ben}', 120, keyed, lap=False)
            joy_xml.append(f'<Joystick posX="256" posY="256" width="512" height="512" x="-1" xId="{a_dt}" '
                           f'yId="{a_rong_tay}" name="Dáng tay {ben}" id="{jid}"/>')
            REMAP[g.boc[f'tay-{ben}']['nghich']] = (jid, -1 if ben == 'phai' else 1)
            if f'tay-{ben}-tren' in g.boc:
                REMAP[g.boc[f'tay-{ben}-tren']['nghich']] = None
        g.joy_bs = {}
        for (ben, kieu), keyed in g.morph_bs.items():
            jid = moi_id()
            a_dt = ani(f'Dáng tay {ben} {kieu}', 120, keyed, lap=False)
            joy_xml.append(f'<Joystick posX="256" posY="256" width="512" height="512" x="-1" xId="{a_dt}" '
                           f'yId="{a_rong_tay}" name="Dáng tay {ben} {kieu}" id="{jid}"/>')
            g.joy_bs[(ben, kieu)] = jid
            dang_tay_vao_nghi.append(f'<KeyedObject objectId="{jid}"><KeyedProperty property="x">'
                                     f'<KeyFrameDouble value="-1" frame="0"/></KeyedProperty></KeyedObject>')
        for (ben, kieu), bid in g.bs_id.items():   # Nghịch đang chờ: hiện bản tay chính, ẩn bản riêng
            dang_tay_vao_nghi.append(f'<KeyedObject objectId="{bid}"><KeyedProperty property="opacity">'
                                     f'<KeyFrameDouble value="{1 if kieu == "co" else 0}" frame="0"/></KeyedProperty></KeyedObject>')
            dang_tay_vao_nghi.append(f'<KeyedObject objectId="{jid}"><KeyedProperty property="x">'
                                     f'<KeyFrameDouble value="-1" frame="0"/></KeyedProperty></KeyedObject>')
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

    # đơn vị tay: 0 = buông, .42 = dang ngang, .73 = giơ cao (× hệ số tay → joystick 'Dáng tay', xem remap)
    def tay_k(g, ben, cac):
        if not g.tay_ben(ben) and g.tay_ben('gan'):
            if ben == 'trai':
                return []
            ben = 'gan'                      # ¾ / nghiêng: tay gần đóng vai tay phải chính diện
        hs = dict(g.tay())
        return [khung(nid, 'rotation', [(f, a * hs[nid]) for f, a in cac]) for nid in g.tay_ben(ben)]

    def chan_k(g, ben, cac_y, cac_r=None):  # cac_y: [(khung, nhấc lên px)]; cac_r: xoay
        out = []
        for t in g.chan_bp():
            if t == f'chan-{ben}':
                lx, ly = g.vi_tri_dau(t)
                out.append(khung(g.k(t), 'y', [(f, ly - v) for f, v in cac_y]))
                if cac_r:
                    out.append(khung(g.k(t), 'rotation', cac_r))
        return out

    def mat_vui_luon(g):
        out = []
        for t in g.thu_tu:
            if t.startswith('mat-'):
                out += [khung(g.boc[t]['vui'], 'opacity', [(0, 1)]), khung(g.boc[t]['cham'], 'opacity', [(0, 0)])]
        return out

    # ---- 8 hành động dựng lại theo nhận xét Codex (docs/trau/chang-2/danh-gia-codex-hanh-dong.md):
    # mỗi động tác: chuẩn bị → tư thế chính → giữ → thu về; làm MỘT lần rõ ràng; đầu dẫn, thân/hông theo 3–5 khung,
    # tai/đuôi theo đà; chân trụ không rời đất (trừ khi nhảy). Bản tay riêng: bs(g, bên, bản, [(khung, 0..1)]).
    def bs(g, ben, kieu, cac):
        if (ben, kieu) not in g.bs_id and g.tay_ben('gan'):
            if ben == 'trai':
                return []                    # ¾ / nghiêng: chỉ tay gần (bên phải chính diện) diễn
            ben = 'gan'
        if (ben, kieu) not in getattr(g, 'joy_bs', {}):
            return []                        # góc này chưa có bản tay riêng
        return [khung(g.joy_bs[(ben, kieu)], 'x', [(f, -1 + 2 * t) for f, t in cac]),
                khung(g.bs_id[(ben, kieu)], 'opacity', [(0, 1)]), khung(g.bs_id[(ben, 'co')], 'opacity', [(0, 0)])]

    def hong(g, prop, cac):
        base = hong_y if prop == 'y' else 0
        return [khung(g.id['hong'], prop, [(f, base + v) for f, v in cac])]

    def chao_hd_fn(g):  # 1 chào: nhún + gật → đầu hướng người nhận → tay giơ cao, nhấn 1 lần → hạ → nghỉ
        return [khung(g.id['nghich'], 'scaleY', [(0, 1), (8, .965), (18, 1.01), (26, 1), (144, 1)]),
                khung(g.id['dau-nghich'], 'y', [(0, 0), (8, 3), (18, -1), (26, 0), (144, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (14, 0), (24, .08), (88, .08), (104, 0), (144, 0)]),
                khung(g.id['nghich'], 'rotation', [(0, 0), (18, 0), (28, -.02), (88, -.02), (108, 0), (144, 0)]),
                *hong(g, 'x', [(0, 0), (14, 0), (28, -3), (88, -3), (108, 0), (144, 0)]),
                *tay_k(g, 'phai', [(0, 0), (14, 0), (30, .73), (44, .73), (56, .67), (68, .73), (76, .73), (90, 0), (144, 0)]),
                *tay_k(g, 'trai', [(0, 0), (30, .05), (88, .05), (104, 0), (144, 0)]),
                *mat_cuoi(g, 24, 92),
                *may(g, 'y', [(0, 0), (24, -3), (92, -3), (104, 0), (144, 0)]),
                *tai_theo(g, [(0, 0), (20, 0), (32, .25), (90, .25), (100, -.05), (110, 0), (144, 0)]),
                *duoi_theo(g, [(0, 0), (30, 0)] + [(30 + f, .25 * math.sin(2 * math.pi * f / 24)) for f in range(6, 61, 6)]
                           + [(100, 0), (144, 0)])]

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
        *[khung(nid, 'rotation', [(0, 0), (16, -.08 * d), (50, (.72 if (g.xuong or g.morph) else .5) * d),
                                   (100, (.72 if (g.xuong or g.morph) else .5) * d), (126, -.08 * d), (140, .03 * d),
                                   (160, 0)]) for nid, d in g.tay()],
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
    def vui_fn(g):  # vui hớn hở: hai tay chụm trước ngực (bản tay ôm ngực, không giấy), nhún 2 nhịp, lắc lư, mắt cười
        nhip = [(0, 0), (30, 0), (45, 1), (60, 0), (75, -1), (90, 0), (105, 1), (120, 0), (180, 0)]
        return [*mat_cuoi(g, 14, 140),
                *bs(g, 'phai', 'giay', [(0, 0), (10, 0), (26, .8), (130, .8), (150, 0), (180, 0)]),
                *bs(g, 'trai', 'giay', [(0, 0), (12, 0), (28, .8), (132, .8), (152, 0), (180, 0)]),
                khung(g.id['nghich'], 'rotation', [(f, .03 * v) for f, v in nhip]),
                khung(g.id['nghich'], 'y', [(0, 0), (30, 0), (38, -4), (46, 0), (68, 0), (76, -4), (84, 0), (180, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(f, -.05 * v) for f, v in nhip]),
                *may(g, 'y', [(0, 0), (14, -3), (140, -3), (152, 0), (180, 0)]),
                *tai_theo(g, [(0, 0), (16, .28), (140, .28), (156, 0), (180, 0)]),
                *duoi_theo(g, [(0, 0), (20, 0)] + [(20 + f, .3 * math.sin(2 * math.pi * f / 20)) for f in range(5, 121, 5)]
                           + [(156, 0), (180, 0)])]
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

    def giat_minh_fn(g):  # giật mình: hai tay giật về ôm trước ngực, mắt mở to, mày nhướng, tai dựng, người bật lùi → thở phào
        return [*mat(g, 'scaleY', [(0, 1), (4, 1.3), (40, 1.3), (60, 1), (110, 1)]),
                *mat(g, 'scaleX', [(0, 1), (4, 1.2), (40, 1.2), (60, 1), (110, 1)]),
                *may(g, 'y', [(0, 0), (4, -6), (44, -6), (64, 0), (110, 0)]),
                *tai_theo(g, [(0, 0), (4, .4), (40, .4), (52, -.1), (64, .05), (80, 0), (110, 0)]),
                khung(g.id['nghich'], 'y', [(0, 0), (5, -8), (12, 0), (16, 0), (110, 0)], '0.3 0 0.7 1'),
                khung(g.id['nghich'], 'rotation', [(0, 0), (6, .04), (40, .03), (70, -.008), (90, 0), (110, 0)]),
                khung(g.id['nghich'], 'scaleY', [(0, 1), (3, .95), (6, 1.06), (13, .95), (20, 1.02), (60, 1.01),
                                                 (72, .97), (90, 1), (110, 1)]),
                *bs(g, 'phai', 'giay', [(0, 0), (6, .65), (44, .65), (74, 0), (110, 0)]),
                *bs(g, 'trai', 'giay', [(0, 0), (7, .65), (45, .65), (76, 0), (110, 0)]),
                *duoi_theo(g, [(0, 0), (6, .5), (40, .4), (70, -.1), (90, 0), (110, 0)])]
    giat_minh = nghich('Cảm xúc: giật mình', 110, giat_minh_fn)

    chao = nghich('Cảm xúc: vẫy tay chào', 144, chao_hd_fn)   # giống hành động 1 đã duyệt: giơ tay một lần

    # Lớp: Chờ (5 s) → chọn ngẫu nhiên 1 trong 5 động tác hoặc chờ thêm (4 s) → xong động tác thì về Chờ.
    a_cho1, a_cho2 = (ani('Nghịch: chờ', 300, dang_tay_vao_nghi, lap=False),
                      ani('Nghịch: chờ thêm', 240, dang_tay_vao_nghi, lap=False))
    s_cho1, s_cho2 = moi_id(), moi_id()
    # thêm (1/11): ngáp che miệng (bản tay chống má), chỉnh khăn (một tay lên ngực), chợt thấy rồi chỉ (bản ngón trỏ)
    def ngap_fn(g):
        return [khung(g.id['nghich'], 'scaleY', [(0, 1), (20, 1.03), (90, 1.03), (110, .99), (126, 1), (170, 1)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (20, -.06), (90, -.06), (108, 0), (122, .05), (134, -.04),
                                                       (146, .02), (158, 0), (170, 0)]),
                khung(g.id['dau-nghich'], 'y', [(0, 0), (20, -3), (90, -3), (108, 0), (170, 0)]),
                *bs(g, 'phai', 'nghi', [(0, 0), (18, 0), (34, 1), (92, 1), (110, 0), (170, 0)]),
                *mat(g, 'scaleY', [(0, 1), (16, .5), (26, .08), (92, .08), (104, .6), (112, .6), (116, .1), (122, 1), (170, 1)]),
                *may(g, 'y', [(0, 0), (20, -3), (90, -3), (104, 0), (170, 0)]),
                *tai_theo(g, [(0, 0), (24, -.18), (92, -.18), (110, .1), (124, 0), (170, 0)]),
                *duoi_theo(g, [(0, 0), (40, .12), (90, -.1), (130, 0), (170, 0)])]
    ngap = nghich('Nghịch: ngáp che miệng', 170, ngap_fn)

    def chinh_khan_fn(g):
        k_ = [khung(g.id['dau-nghich'], 'y', [(0, 0), (14, 4), (110, 4), (126, 0), (150, 0)]),
              khung(g.id['dau-nghich'], 'rotation', [(0, 0), (14, .03), (110, .03), (126, 0), (150, 0)]),
              *bs(g, 'phai', 'giay', [(0, 0), (10, 0), (28, .95), (44, .8), (56, 1), (70, .82), (84, 1), (106, 1), (124, 0),
                                      (150, 0)]),
              *mat(g, 'scaleY', [(0, 1), (16, .8), (110, .8), (124, 1), (150, 1)]),
              *may(g, 'y', [(0, 0), (96, 0), (104, -3), (120, 0), (150, 0)]),
              *duoi_theo(g, [(0, 0), (60, .1), (110, 0), (150, 0)])]
        for t, (cid, cx, cy) in g.long.items():
            if t.startswith('khan-dai-'):
                k_.append(khung(cid, 'rotation', [(0, 0), (44, .1), (56, -.08), (70, .08), (84, -.05), (100, 0), (150, 0)]))
        return k_
    chinh_khan = nghich('Nghịch: chỉnh khăn', 150, chinh_khan_fn)

    def thay_gi_fn(g):
        return [*mat(g, 'scaleY', [(0, 1), (4, 1.25), (30, 1.25), (44, 1), (140, 1)]),
                *may(g, 'y', [(0, 0), (4, -5), (34, -5), (50, -2), (110, -2), (124, 0), (140, 0)]),
                khung(g.id['dau-nghich'], 'x', [(0, 0), (8, 5), (104, 5), (122, 0), (140, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (8, .07), (104, .07), (122, 0), (140, 0)]),
                *mat(g, 'x', [(0, 0), (6, 3), (104, 3), (118, 0), (140, 0)]),
                khung(g.id['nghich'], 'rotation', [(0, 0), (14, .02), (104, .02), (126, 0), (140, 0)]),
                *bs(g, 'phai', 'chi', [(0, 0), (16, 0), (28, 1), (100, 1), (120, 0), (140, 0)]),
                *tai_theo(g, [(0, 0), (6, .3), (100, .3), (118, 0), (140, 0)]),
                *duoi_theo(g, [(0, 0), (10, .3), (24, -.2), (40, .15), (60, 0), (140, 0)])]
    thay_gi = nghich('Nghịch: chợt thấy rồi chỉ', 140, thay_gi_fn)
    dong = [(a, moi_id()) for a in (lac_dau, vuon_vai, to_mo, nhay, vay_tai, vui, ngu, giat_minh, chao,
                                    ngap, chinh_khan, thay_gi)]
    if os.environ.get('AGV_THU'):  # kiểm thử: chỉ một động tác, chờ 10 khung (dùng khi chụp soi)
        dong = [dong[int(os.environ['AGV_THU'])]]
        a_cho1 = ani('Nghịch: chờ (thử)', 10, dang_tay_vao_nghi, lap=False)
    het = 'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"'
    # vào động tác trộn 200 ms; riêng giật mình vào ngay (động tác bật đột ngột, đổi tay ở khung 5 —
    # trộn sẽ thấy cả tay cũ lẫn tay mới mờ chồng nhau)
    chon = ''.join(f'<StateTransition stateToId="{sid}" duration="{0 if aid == giat_minh else 200}" {het}/>'
                   for aid, sid in dong) + \
        ('' if os.environ.get('AGV_THU') else f'<StateTransition stateToId="{s_cho2}" {het}/>')
    ve_cho = f'<StateTransition stateToId="{s_cho1}" duration="250" {het}/>'
    # có hành động (hanh_dong ≠ 0) → Nghịch tắt (đứng ở trạng thái rỗng); động tác đang chạy thì làm nốt rồi mới tắt
    a_tat, s_tat = ani('Nghịch: tắt', 1, []), moi_id()
    hd = vao['hanh_dong']
    sang_tat = (f'<StateTransition stateToId="{s_tat}" duration="200">'
                f'<TransitionNumberCondition inputId="{hd}" opValue="notEqual" value="0"/></StateTransition>')
    lop.append(f'<StateMachineLayer name="Nghịch" id="{moi_id()}"><AnyState/><ExitState/>'
               f'<EntryState><StateTransition stateToId="{s_cho1}"/></EntryState>'
               f'<AnimationState animationId="{a_tat}" id="{s_tat}"><StateTransition stateToId="{s_cho1}">'
               f'<TransitionNumberCondition inputId="{hd}" opValue="equal" value="0"/></StateTransition></AnimationState>'
               f'<AnimationState animationId="{a_cho1}" id="{s_cho1}" random="true">{sang_tat}{chon}</AnimationState>'
               f'<AnimationState animationId="{a_cho2}" id="{s_cho2}">{sang_tat}{ve_cho}</AnimationState>'
               + ''.join(f'<AnimationState animationId="{aid}" id="{sid}">{ve_cho}</AnimationState>' for aid, sid in dong)
               + '</StateMachineLayer>')

    # ---------- Hành động (hanh_dong 1–8, chặng 3). Mỗi hành động một trạng thái lặp; 0 = rỗng (nghỉ sống chạy) ----------
    def chi_duong_fn(g):  # 2 chỉ đường: đầu nhìn hướng → thân, hông theo → tay ngón trỏ chỉ, giữ → đầu về người xem → thu
        return [khung(g.id['dau-nghich'], 'x', [(0, 0), (6, 0), (16, 5), (96, 5), (110, 1), (180, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (6, 0), (16, .07), (96, .07), (110, .01), (126, 0), (180, 0)]),
                khung(g.id['nghich'], 'rotation', [(0, 0), (10, 0), (22, .022), (100, .022), (124, 0), (180, 0)]),
                *hong(g, 'x', [(0, 0), (14, 0), (26, 3), (100, 3), (128, 0), (180, 0)]),
                *bs(g, 'phai', 'chi', [(0, 0), (12, 0), (26, 1), (108, 1), (128, 0), (180, 0)]),
                *may(g, 'y', [(0, 0), (14, -2), (100, -2), (120, 0), (180, 0)]),
                *mat(g, 'x', [(0, 0), (4, 0), (12, 3), (96, 3), (106, 0), (180, 0)]),
                *tai_theo(g, [(0, 0), (12, 0), (22, .2), (100, .2), (120, 0), (180, 0)]),
                *duoi_theo(g, [(0, 0), (20, .15), (40, -.08), (60, 0), (180, 0)])]

    def cam_giay_fn(g):  # 3 cầm giấy: chuyển trụ → hai tay đưa giấy lên trước ngực → cúi đọc → gật → ngẩng → hạ
        out = [*hong(g, 'x', [(0, 0), (12, 2), (150, 2), (170, 0), (200, 0)]),
               *bs(g, 'phai', 'giay', [(0, 0), (12, 0), (28, 1), (146, 1), (164, 0), (200, 0)]),
               *bs(g, 'trai', 'giay', [(0, 0), (14, 0), (30, 1), (146, 1), (166, 0), (200, 0)]),
               khung(g.id['dau-nghich'], 'y', [(0, 0), (28, 0), (36, 5.5), (100, 5.5), (108, 9), (114, 5.5), (126, 0), (200, 0)]),
               *mat(g, 'y', [(0, 0), (30, 0), (36, 2.5), (114, 2.5), (126, 0), (200, 0)]),
               khung(g.id['dau-nghich'], 'x', [(0, 0), (36, -2), (100, 2), (126, 0), (200, 0)]),
               *mat(g, 'scaleY', [(0, 1), (30, 1), (36, .82), (100, .82), (108, .7), (114, .82), (126, 1), (200, 1)]),
               *tai_theo(g, [(0, 0), (40, .06), (126, 0), (200, 0)]),
               *duoi_theo(g, [(0, 0), (60, .1), (120, -.1), (170, 0), (200, 0)])]
        if g.giay:
            out.append(khung(g.giay, 'opacity', [(0, 0), (20, 0), (28, 1), (144, 1), (152, 0), (200, 0)]))
        return out


    def cam_do(ten_do):   # như cầm giấy nhưng hiện đồ khác (thúng rau, điện thoại, sổ)
        def fn(g):
            out = [k_ for k_ in cam_giay_fn(g) if not (g.giay and f'objectId="{g.giay}"' in k_)]
            if ten_do in getattr(g, 'do_cam', {}):
                out.append(khung(g.do_cam[ten_do], 'opacity', [(0, 0), (20, 0), (28, 1), (144, 1), (152, 0), (200, 0)]))
            return out
        return fn
    def mung_fn(g):  # 4 mừng: hạ người lấy đà → bật, hai tay lên cao → đỉnh → tiếp đất nén → hồi → hạ tay
        return [khung(g.id['nghich'], 'scaleY', [(0, 1), (8, .93), (16, 1.06), (24, 1.03), (34, .94), (40, .95), (52, 1), (110, 1)]),
                khung(g.id['nghich'], 'scaleX', [(0, 1), (8, 1.04), (16, .97), (34, 1.04), (52, 1), (110, 1)]),
                khung(g.id['nghich'], 'y', [(0, 0), (8, 0), (16, -6), (24, -13), (34, 0), (110, 0)], '0.3 0 0.7 1'),
                *tay_k(g, 'phai', [(0, 0), (8, .1), (16, .5), (24, .73), (52, .73), (68, 0), (110, 0)]),
                *tay_k(g, 'trai', [(0, 0), (9, .1), (17, .5), (25, .73), (53, .73), (69, 0), (110, 0)]),
                *mat_cuoi(g, 14, 62),
                *may(g, 'y', [(0, 0), (16, -4), (62, -4), (72, 0), (110, 0)]),
                *tai_theo(g, [(0, 0), (8, -.1), (26, .32), (52, .3), (70, 0), (110, 0)]),
                *duoi_theo(g, [(0, 0), (16, 0)] + [(16 + f, .32 * math.sin(2 * math.pi * f / 14)) for f in range(4, 49, 4)]
                           + [(72, 0), (110, 0)])]

    def xin_loi_fn(g):  # 5 xin lỗi: thu người → đầu cúi → thân khom → giữ → hồi thân → ngẩng chậm; tai cụp trễ
        return [khung(g.id['dau-nghich'], 'y', [(0, 0), (8, 0), (18, 10), (36, 13), (64, 13), (100, 0), (150, 0)]),
                *mat(g, 'y', [(0, 0), (14, 0), (24, 2.5), (64, 2.5), (96, 0), (150, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (18, 0), (36, -.02), (64, -.02), (100, 0), (150, 0)]),
                khung(g.id['nghich'], 'scaleY', [(0, 1), (20, 1), (26, .97), (36, .96), (64, .96), (88, 1), (150, 1)]),
                *mat(g, 'scaleY', [(0, 1), (12, 1), (24, .55), (64, .55), (96, 1), (150, 1)]),
                *may(g, 'rotation', [(0, 0), (10, -.28), (70, -.28), (96, 0), (150, 0)],
                     [(0, 0), (10, .28), (70, .28), (96, 0), (150, 0)]),
                *tai_theo(g, [(0, 0), (22, 0), (40, -.32), (68, -.32), (104, 0), (150, 0)]),
                *tay_k(g, 'trai', [(0, 0), (150, 0)]), *tay_k(g, 'phai', [(0, 0), (150, 0)]),
                *duoi_theo(g, [(0, 0), (30, -.18), (70, -.18), (104, 0), (150, 0)])]

    def cho_fn(g):  # 6 chờ: thở → đầu ngó sang → thân theo → dồn trụ, giữ → nhấc chân nghỉ 1 lần → về
        return [khung(g.id['dau-nghich'], 'x', [(0, 0), (70, 0), (82, -4), (150, -4), (210, 0), (300, 0)]),
                khung(g.id['dau-nghich'], 'rotation', [(0, 0), (70, 0), (82, -.05), (150, -.05), (210, 0), (300, 0)]),
                khung(g.id['nghich'], 'rotation', [(0, 0), (76, 0), (88, -.012), (150, -.012), (230, 0), (300, 0)]),
                *hong(g, 'x', [(0, 0), (88, 0), (104, -4), (170, -4), (230, 0), (300, 0)]),
                *chan_k(g, 'phai', [(0, 0), (156, 0), (162, 4), (168, 0), (300, 0)], [(0, 0), (156, 0), (162, .05), (168, 0), (300, 0)]),
                *tay_k(g, 'trai', [(0, 0), (300, 0)]), *tay_k(g, 'phai', [(0, 0), (300, 0)]),
                *tai_theo(g, [(0, 0), (84, .1), (96, 0), (300, 0)]),
                *duoi_theo(g, [(f, .15 * math.sin(2 * math.pi * f / 150)) for f in range(0, 301, 25)])]

    def di_fn(g):  # 7 đi tại chỗ (48 khung): dồn → nhấc trái → đặt → chuyển tải → nhấc phải → đặt; hông nhấp 2–3 px
        return [*chan_k(g, 'trai', [(0, 0), (6, 0), (12, 16), (20, 0), (48, 0)], [(0, 0), (6, 0), (12, -.08), (20, 0), (48, 0)]),
                *chan_k(g, 'phai', [(0, 0), (30, 0), (36, 16), (44, 0), (48, 0)], [(0, 0), (30, 0), (36, .08), (44, 0), (48, 0)]),
                *hong(g, 'x', [(0, 0), (6, 3), (20, 3), (24, 0), (30, -3), (44, -3), (48, 0)]),
                *hong(g, 'y', [(0, 0), (12, -2.5), (20, 0), (36, -2.5), (44, 0), (48, 0)]),
                *hong(g, 'rotation', [(0, 0), (6, .015), (20, .015), (24, 0), (30, -.015), (44, -.015), (48, 0)]),
                khung(g.id['dau-nghich'], 'y', [(0, 0), (14, -1.5), (22, 0), (38, -1.5), (46, 0), (48, 0)]),
                *tay_k(g, 'trai', [(0, .02), (12, .06), (36, 0), (48, .02)]),
                *tay_k(g, 'phai', [(0, .02), (12, 0), (36, .06), (48, .02)]),
                *tai_theo(g, [(0, 0), (14, -.06), (24, .03), (38, -.06), (48, 0)]),
                *duoi_theo(g, [(0, 0), (12, .15), (36, -.15), (48, 0)])]

    def suy_nghi_fn(g):  # 8 suy nghĩ: đầu nghiêng, mày nhướng → thân theo → tay chống má, giữ (chớp) → "à" nhận ra → gật → về
        return [khung(g.id['dau-nghich'], 'rotation', [(0, 0), (10, .07), (104, .07), (116, 0), (200, 0)]),
                khung(g.id['dau-nghich'], 'y', [(0, 0), (120, 0), (126, 3), (134, 0), (200, 0)]),
                khung(g.id['nghich'], 'rotation', [(0, 0), (18, .015), (104, .015), (150, 0), (200, 0)]),
                *hong(g, 'x', [(0, 0), (18, 2), (104, 2), (150, 0), (200, 0)]),
                *bs(g, 'phai', 'nghi', [(0, 0), (16, 0), (32, 1), (128, 1), (150, 0), (200, 0)]),
                *may(g, 'y', [(0, 0), (10, -6), (104, -6), (110, -9), (122, -9), (134, -3), (156, 0), (200, 0)],
                     [(0, 0), (10, 2), (104, 2), (110, -9), (122, -9), (134, -3), (156, 0), (200, 0)]),
                *mat(g, 'scaleY', [(0, 1), (10, .85), (66, .85), (70, .1), (74, .85), (104, .85), (110, 1.12), (122, 1.12), (134, 1), (200, 1)]),
                *[khung(nid, 'rotation', [(0, 0), (12, (.2 if j == 0 else -.12) * d), (104, (.2 if j == 0 else -.12) * d),
                                          (118, .15 * d), (140, 0), (200, 0)]) for j, (_, nid, d) in enumerate(g.tai())],
                *duoi_theo(g, [(0, 0), (40, .1), (100, -.1), (150, 0), (200, 0)])]

    def gom(fn):
        k_ = []
        for g in goc:
            k_ += fn(g)
        return k_
    HANH_DONG = {1: ('Hành động 1: chào', 144, gom(chao_hd_fn)),
                 2: ('Hành động 2: chỉ đường', 180, gom(chi_duong_fn)),
                 3: ('Hành động 3: cầm giấy', 200, gom(cam_giay_fn)),
                 4: ('Hành động 4: mừng', 110, gom(mung_fn)),
                 5: ('Hành động 5: xin lỗi', 150, gom(xin_loi_fn)),
                 6: ('Hành động 6: chờ', 300, gom(cho_fn)),
                 7: ('Hành động 7: đi', 48, gom(di_fn)),
                 8: ('Hành động 8: suy nghĩ', 200, gom(suy_nghi_fn))}
    BAN_SAO = {2: [('phai', 'chi')], 3: [('phai', 'giay'), ('trai', 'giay')], 8: [('phai', 'nghi')]}
    if V4:
        # ---- bảng v4 (1/11, danh sách giao diện): 0 nghỉ · 1 chào · 2 chỉ (kèm huong) · 3 nói · 4 vui/nhảy · 5 lo/gãi
        #      · 6 suy nghĩ "…" · 7 ngủ gật · 8 cầm giấy · 9 vẫy tạm biệt; giữ thêm 10 chờ · 11 đi · 12 xin lỗi (từ v3)
        def noi_fn(g):   # 3 nói: KHÔNG có miệng (luật V4g) → mõm nhấp nhô theo âm tiết, gật nhẹ, mày nhấn, tay phải điệu bộ nhỏ
            mom = [(0, 1)]
            for f0, a in ((4, .05), (14, .04), (24, .06), (36, .035), (48, .055), (62, .04), (74, .06), (86, .035)):
                mom += [(f0, 1 + a), (f0 + 6, 1 - a * .6)]
            mom += [(98, 1), (120, 1)]
            return [khung(g.k('mom'), 'scaleY', mom),
                    khung(g.id['dau-nghich'], 'y', [(0, 0), (8, 1.5), (16, 0), (28, 1.5), (36, 0), (52, 1.5), (60, 0), (78, 1.5),
                                                    (86, 0), (120, 0)]),
                    khung(g.id['dau-nghich'], 'rotation', [(0, 0), (30, .03), (60, -.02), (90, .025), (120, 0)]),
                    *may(g, 'y', [(0, 0), (22, 0), (26, -4), (40, -1), (70, -1), (74, -4), (90, 0), (120, 0)]),
                    *tay_k(g, 'phai', [(0, 0), (20, .18), (40, .1), (64, .2), (90, .1), (110, 0), (120, 0)]),
                    *tai_theo(g, [(0, 0), (26, .12), (50, 0), (74, .12), (98, 0), (120, 0)]),
                    *duoi_theo(g, [(f, .12 * math.sin(2 * math.pi * f / 60)) for f in range(0, 121, 15)])]

        def lo_fn(g):    # 5 lo / gãi: mày chau, mắt liếc, tai cụp → tay lên má xoa xoa 3 lần → hạ; người lắc nhẹ
            return [*may(g, 'rotation', [(0, 0), (10, -.26), (170, -.26), (186, 0), (200, 0)],
                         [(0, 0), (10, .26), (170, .26), (186, 0), (200, 0)]),
                    *may(g, 'y', [(0, 0), (10, 2), (170, 2), (186, 0), (200, 0)]),
                    *mat(g, 'scaleY', [(0, 1), (10, .85), (170, .85), (186, 1), (200, 1)]),
                    *mat(g, 'x', [(0, 0), (12, -3), (60, -3), (70, 2), (120, 2), (130, -3), (170, -3), (186, 0), (200, 0)]),
                    *bs(g, 'phai', 'nghi', [(0, 0), (14, 0), (32, 1), (44, .86), (56, 1), (68, .86), (80, 1), (92, .86), (104, 1),
                                            (150, 1), (170, 0), (200, 0)]),
                    khung(g.id['dau-nghich'], 'rotation', [(0, 0), (16, -.05), (150, -.05), (172, 0), (200, 0)]),
                    khung(g.id['nghich'], 'rotation', [(0, 0), (40, .012), (80, -.012), (120, .012), (160, 0), (200, 0)]),
                    *tai_theo(g, [(0, 0), (16, -.25), (160, -.25), (180, 0), (200, 0)]),
                    *duoi_theo(g, [(0, 0), (40, -.12), (120, .08), (170, 0), (200, 0)])]

        def suy_nghi_v4(g):   # 6 suy nghĩ / đang tải: như suy nghĩ đã duyệt + ba chấm "…" sáng lần lượt trên đầu
            out = suy_nghi_fn(g)
            if getattr(g, 'ba_cham_id', None):
                out.append(khung(g.ba_cham_id, 'opacity', [(0, 0), (14, 0), (22, 1), (150, 1), (160, 0), (200, 0)], '0 0 1 1'))
                for i, c in enumerate(g.cham_id):
                    ks = [(0, .25)]
                    for f0 in range(22, 150, 30):
                        ks += [(f0 + 8 * i, .25), (f0 + 8 * i + 8, 1), (f0 + 8 * i + 18, .25)]
                    ks.append((200, .25))
                    out.append(khung(c, 'opacity', sorted(dict(ks).items()), '0 0 1 1'))
            return out

        def ngu_gat_fn(g):    # 7 ngủ gật: mắt nhắm, đầu gục dần → giật nhẹ → gục lại, thở sâu, tai cụp, "Zzz" bay lên
            out = [*mat(g, 'scaleY', [(0, .12), (240, .12)]),
                   khung(g.id['dau-nghich'], 'y', [(0, 6), (70, 9), (110, 11), (116, 4), (140, 6), (240, 6)]),
                   khung(g.id['dau-nghich'], 'rotation', [(0, .04), (110, .07), (116, .01), (140, .04), (240, .04)]),
                   khung(g.id['nghich'], 'scaleY', [(0, 1), (120, .975), (240, 1)]),
                   khung(g.id['nghich'], 'scaleX', [(0, 1), (120, 1.012), (240, 1)]),
                   *tai_theo(g, [(0, -.3), (110, -.34), (116, -.1), (140, -.3), (240, -.3)]),
                   *may(g, 'y', [(0, 2), (240, 2)]),
                   *tay_k(g, 'trai', [(0, 0), (240, 0)]), *tay_k(g, 'phai', [(0, 0), (240, 0)]),
                   *duoi_theo(g, [(f, .08 * math.sin(2 * math.pi * f / 240)) for f in range(0, 241, 40)])]
            if getattr(g, 'zzz_id', None):
                out.append(khung(g.zzz_id, 'opacity', [(0, 1), (240, 1)]))
                for i, z in enumerate(g.z_id):
                    op, yy = [], []
                    for f in range(0, 241, 20):
                        ph = ((f - 80 * i) % 240) / 240
                        op.append((f, round(math.sin(math.pi * ph) ** .6, 3)))
                        yy.append((f, -12 * ph))
                    out.append(khung(z, 'opacity', op, '0 0 1 1'))
                    out.append(khung(z, 'y', [(f, [0, -15, -30][i] + v) for f, v in yy], '0 0 1 1'))
                    out.append(khung(z, 'scaleX', [(f, .7 + .5 * (((f - 80 * i) % 240) / 240)) for f in range(0, 241, 20)], '0 0 1 1'))
                    out.append(khung(z, 'scaleY', [(f, .7 + .5 * (((f - 80 * i) % 240) / 240)) for f in range(0, 241, 20)], '0 0 1 1'))
            return out

        def tam_biet_fn(g):   # 9 vẫy tạm biệt: đầu nghiêng, mắt cười → tay giơ cao vẫy 4 nhịp → hạ; người nghiêng theo
            return [*mat_cuoi(g, 22, 128),
                    khung(g.id['dau-nghich'], 'rotation', [(0, 0), (20, .08), (126, .08), (146, 0), (200, 0)]),
                    khung(g.id['nghich'], 'rotation', [(0, 0), (18, -.02), (126, -.02), (150, 0), (200, 0)]),
                    *hong(g, 'x', [(0, 0), (18, -3), (126, -3), (150, 0), (200, 0)]),
                    *tay_k(g, 'phai', [(0, 0), (12, 0), (28, .73), (40, .63), (52, .73), (64, .63), (76, .73), (88, .63), (100, .73),
                                       (118, .73), (138, 0), (200, 0)]),
                    *tay_k(g, 'trai', [(0, 0), (28, .05), (126, .05), (146, 0), (200, 0)]),
                    *may(g, 'y', [(0, 0), (22, -3), (128, -3), (140, 0), (200, 0)]),
                    *tai_theo(g, [(0, 0), (24, .22), (126, .22), (142, 0), (200, 0)]),
                    *duoi_theo(g, [(0, 0), (24, 0)] + [(24 + f, .25 * math.sin(2 * math.pi * f / 24)) for f in range(6, 97, 6)]
                               + [(140, 0), (200, 0)])]

        HANH_DONG = {1: ('Hành động 1: chào', 144, gom(chao_hd_fn)),
                     2: ('Hành động 2: chỉ', 180, gom(chi_duong_fn)),
                     3: ('Hành động 3: nói', 120, gom(noi_fn)),
                     4: ('Hành động 4: vui', 110, gom(mung_fn)),
                     5: ('Hành động 5: lo, gãi', 200, gom(lo_fn)),
                     6: ('Hành động 6: suy nghĩ', 200, gom(suy_nghi_v4)),
                     7: ('Hành động 7: ngủ gật', 240, gom(ngu_gat_fn)),
                     8: ('Hành động 8: cầm giấy', 200, gom(cam_giay_fn)),
                     9: ('Hành động 9: tạm biệt', 200, gom(tam_biet_fn)),
                     10: ('Hành động 10: chờ', 300, gom(cho_fn)),
                     11: ('Hành động 11: đi', 48, gom(di_fn)),
                     12: ('Hành động 12: xin lỗi', 150, gom(xin_loi_fn)),
                     13: ('Hành động 13: bê thúng rau', 200, gom(cam_do('thung'))),
                     14: ('Hành động 14: cầm điện thoại', 200, gom(cam_do('dien-thoai'))),
                     15: ('Hành động 15: ghi sổ', 200, gom(cam_do('so')))}
        BAN_SAO = {2: [('phai', 'chi')], 5: [('phai', 'nghi')], 6: [('phai', 'nghi')],
                   **{n_: [('phai', 'giay'), ('trai', 'giay')] for n_ in (8, 13, 14, 15)}}
    # 'Về nghỉ': mọi thuộc tính các hành động đã khoá đưa về giá trị gốc (hành động giữ dáng — xin lỗi, cầm giấy…
    # — không để trâu kẹt ở dáng cuối khi hanh_dong về 0), xong mới sang trạng thái rỗng cho nghỉ sống chạy.
    import re as _re
    goc_y, goc_mo = {}, {}
    for g in goc:
        for t in g.chan_bp():
            goc_y[g.k(t)] = g.vi_tri_dau(t)[1]
        for t in g.thu_tu:
            if t.startswith('mat-'):
                goc_mo[g.boc[t]['vui']] = 0
                goc_mo[g.boc[t]['cham']] = 1
        for d_ in getattr(g, 'do_cam', {}).values():
            goc_mo[d_] = 0
        for nid_ in [getattr(g, 'ba_cham_id', None), getattr(g, 'zzz_id', None)] + list(getattr(g, 'z_id', [])):
            if nid_:
                goc_mo[nid_] = 0
        for c_ in getattr(g, 'cham_id', []):
            goc_mo[c_] = 1
        for (ben, kieu), bid in g.bs_id.items():
            goc_mo[bid] = 1 if kieu == 'co' else 0
        goc_y[g.id['hong']] = hong_y
    goc_x = {jid: -1 for g in goc for jid in getattr(g, 'joy_bs', {}).values()}
    nghi_k, da, nghi_cua = [], set(), {}
    for _, _, keyed in HANH_DONG.values():
        for kk in keyed:
            m = _re.match(r'<KeyedObject objectId="([^"]+)"><KeyedProperty property="([^"]+)">', kk)
            if not m or m.groups() in da:
                continue
            da.add(m.groups())
            oid, prop = m.groups()
            v = {'scaleX': 1, 'scaleY': 1, 'opacity': goc_mo.get(oid, 1),
                 'y': goc_y.get(oid, 0), 'x': goc_x.get(oid, 0)}.get(prop, 0)
            nghi_k.append(khung(oid, prop, [(0, v)]))
            nghi_cua[(oid, prop)] = nghi_k[-1]
    # mỗi hành động tự khoá các thuộc tính nó không dùng về giá trị gốc (đổi thẳng 3 → 5 không để sót tờ giấy…)
    for so, (ten, dai, keyed) in list(HANH_DONG.items()):
        co = {tuple(_re.match(r'<KeyedObject objectId="([^"]+)"><KeyedProperty property="([^"]+)">', kk).groups())
              for kk in keyed}
        HANH_DONG[so] = (ten, dai, keyed + [v for kp, v in nghi_cua.items() if kp not in co])
    # về nghỉ RIÊNG từng hành động: bản tay riêng còn hiện tới khung 22 (tay đang hạ về buông theo trộn 300 ms),
    # rồi mới trả lại bản tay chính — hai bản trùng nhau ở dáng buông nên không lộ chỗ đổi
    co_hd = {so: {tuple(_re.match(r'<KeyedObject objectId="([^"]+)"><KeyedProperty property="([^"]+)">', kk).groups())
                  for kk in keyed if 'opacity">' in kk and '<KeyFrameDouble value="1"' in kk}
             for so, (ten, dai, keyed) in HANH_DONG.items()}
    a_ve = {}
    for so in HANH_DONG:
        doi = {}
        for g in goc:
            for ben, kieu in BAN_SAO.get(so, []):
                if (ben, kieu) not in g.bs_id and g.tay_ben('gan'):
                    ben = 'gan'
                if (ben, kieu) not in g.bs_id:
                    continue
                doi[(g.bs_id[(ben, kieu)], 'opacity')] = khung(g.bs_id[(ben, kieu)], 'opacity', [(0, 1), (22, 1), (24, 0)])
                doi[(g.bs_id[(ben, 'co')], 'opacity')] = khung(g.bs_id[(ben, 'co')], 'opacity', [(0, 0), (22, 0), (24, 1)])
            for d_ in getattr(g, 'do_cam', {}).values():
                if (d_, 'opacity') in co_hd[so]:
                    doi[(d_, 'opacity')] = khung(d_, 'opacity', [(0, 1), (10, 0)])
        a_ve[so] = ani(f'Hành động: về nghỉ {so}', 30, [doi.get(kp, v) for kp, v in nghi_cua.items()], lap=False)
    sid_hd = {so: moi_id() for so in HANH_DONG}

    def ra_hd_cho(so):  # từ hành động 'so' sang hành động khác
        return ''.join(f'<StateTransition stateToId="{sid_hd[n]}" duration="300">'
                       f'<TransitionNumberCondition inputId="{hd}" opValue="equal" value="{n}"/></StateTransition>'
                       for n in HANH_DONG if n != so)
    s_khong = moi_id()
    s_ve = {so: moi_id() for so in HANH_DONG}
    tt_hd, ra_hd = '', ''
    for so, (ten, dai, keyed) in HANH_DONG.items():
        aid, sid = ani(ten, dai, keyed), sid_hd[so]
        ra_hd += (f'<StateTransition stateToId="{sid}" duration="300">'
                  f'<TransitionNumberCondition inputId="{hd}" opValue="equal" value="{so}"/></StateTransition>')
        # đổi sang bất kỳ giá trị khác (0 hoặc hành động khác) → về nghỉ của chính hành động này trước (tay hạ về buông,
        # bản tay riêng mới tắt) → trạng thái rỗng → vào hành động mới: không bao giờ hai bản tay mờ chồng nhau
        tt_hd += (f'<AnimationState animationId="{aid}" id="{sid}">'
                  f'<StateTransition stateToId="{s_ve[so]}" duration="300">'
                  f'<TransitionNumberCondition inputId="{hd}" opValue="notEqual" value="{so}"/></StateTransition>'
                  f'</AnimationState>')
    lop.append(f'<StateMachineLayer name="Hành động" id="{moi_id()}"><AnyState/><ExitState/>'
               f'<EntryState><StateTransition stateToId="{s_khong}"/></EntryState>'
               f'<AnimationState animationId="{ani("Hành động: không", 1, [])}" id="{s_khong}">{ra_hd}</AnimationState>'
               + ''.join(f'<AnimationState animationId="{a_ve[so]}" id="{s_ve[so]}">'
                         f'<StateTransition stateToId="{s_khong}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>'
                         f'</AnimationState>' for so in HANH_DONG)
               + f'{tt_hd}</StateMachineLayer>')

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

    # ---------- Chạm: ngẫu nhiên 1 trong 3 phản ứng ngắn (không đụng tay → không giành bản tay với hành động) ----------
    #   nhún nhắm mắt (squash & stretch từ bàn chân) · cười khúc khích (mắt cười, lắc, tai vểnh) · giật mình nhẹ (mắt to, bật)
    def mat_cham(g, cac):          # mắt (nút chớp) co giãn
        return [khung(g.k(t), 'scaleY', cac) for t in g.thu_tu if t.startswith('mat-')]
    k1, k2, k3 = [], [], []
    for g in goc:
        dy = g.co_xy[1] - 412
        k1 += [khung(g.id['nhun'], 'scaleY', [(0, 1), (8, .93), (20, 1.05), (32, .985), (44, 1)]),
               khung(g.id['nhun'], 'scaleX', [(0, 1), (8, 1.045), (20, .97), (32, 1.008), (44, 1)]),
               khung(g.id['dau'], 'y', [(0, dy), (8, dy + 3), (20, dy - 4), (32, dy + 1), (44, dy)]),
               *mat_cham(g, [(0, 1), (6, .25), (34, .25), (44, 1)])]
        k2 += [khung(g.id['nhun'], 'rotation', [(0, 0), (6, .03), (14, -.03), (22, .025), (30, -.02), (40, .01), (54, 0), (60, 0)]),
               khung(g.id['nhun'], 'scaleY', [(0, 1), (6, .97), (14, 1.02), (22, .98), (30, 1.01), (44, 1), (60, 1)]),
               khung(g.id['dau'], 'y', [(0, dy), (8, dy + 2), (16, dy - 1), (24, dy + 2), (32, dy), (60, dy)]),
               *[khung(g.boc[t]['vui'], 'opacity', [(0, 0), (4, 1), (50, 1), (56, 0), (60, 0)]) for t in g.thu_tu if t.startswith('mat-')],
               *[khung(g.boc[t]['cham'], 'opacity', [(0, 1), (4, 0), (50, 0), (56, 1), (60, 1)]) for t in g.thu_tu if t.startswith('mat-')]]
        k3 += [khung(g.id['nhun'], 'scaleY', [(0, 1), (3, .95), (7, 1.06), (14, .97), (22, 1.01), (40, 1)]),
               khung(g.id['nhun'], 'y', [(0, 0), (6, -7), (13, 0), (40, 0)], '0.3 0 0.7 1'),
               khung(g.id['dau'], 'y', [(0, dy), (6, dy - 3), (14, dy + 1), (24, dy), (40, dy)]),
               *mat_cham(g, [(0, 1), (3, 1.3), (24, 1.3), (34, 1), (40, 1)])]
    a_cho = ani('Chờ chạm', 1, [])
    pu = [(ani('Chạm: nhún nhắm mắt', 44, k1, lap=False), moi_id()), (ani('Chạm: cười khúc khích', 60, k2, lap=False), moi_id()),
          (ani('Chạm: giật mình nhẹ', 40, k3, lap=False), moi_id())]
    s_cho = moi_id()
    lop.append(f'<StateMachineLayer name="Chạm" id="{moi_id()}"><AnyState/><ExitState/>'
               f'<EntryState><StateTransition stateToId="{s_cho}"/></EntryState>'
               f'<AnimationState animationId="{a_cho}" id="{s_cho}" random="true">'
               + ''.join(f'<StateTransition stateToId="{sid}"><TransitionTriggerCondition inputId="{vao["cham"]}"/></StateTransition>'
                         for _, sid in pu) + '</AnimationState>'
               + ''.join(f'<AnimationState animationId="{aid}" id="{sid}"><StateTransition stateToId="{s_cho}" '
                         f'enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/></AnimationState>' for aid, sid in pu)
               + '</StateMachineLayer>')

    if V4:
        # Chạm v4: giật mình rồi cười; chạm lần 2 trong lúc đó → nhảy khúc khích; lần 3 → "trứng": nhảy cao, xoay một vòng
        lop.pop()   # bỏ lớp Chạm v3 (3 phản ứng ngẫu nhiên)
        q1, q2, q3 = [], [], []
        for g in goc:
            dy = g.co_xy[1] - 412
            vui_ = [t for t in g.thu_tu if t.startswith('mat-')]
            q1 += [khung(g.id['nhun'], 'scaleY', [(0, 1), (3, .95), (7, 1.06), (14, .97), (22, 1.01), (36, 1), (42, .97), (50, 1.02),
                                                  (58, .98), (66, 1.01), (80, 1), (96, 1)]),
                   khung(g.id['nhun'], 'y', [(0, 0), (6, -7), (13, 0), (96, 0)], '0.3 0 0.7 1'),
                   khung(g.id['nhun'], 'rotation', [(0, 0), (36, 0), (42, .03), (50, -.03), (58, .025), (66, -.02), (76, .01),
                                                    (90, 0), (96, 0)]),
                   khung(g.id['dau'], 'y', [(0, dy), (6, dy - 3), (14, dy + 1), (24, dy), (38, dy + 2), (46, dy - 1), (54, dy + 2),
                                            (62, dy), (96, dy)]),
                   *[khung(g.k(t), 'scaleY', [(0, 1), (3, 1.3), (24, 1.3), (32, 1), (96, 1)]) for t in vui_],
                   *[khung(g.boc[t]['vui'], 'opacity', [(0, 0), (32, 0), (36, 1), (86, 1), (92, 0), (96, 0)]) for t in vui_],
                   *[khung(g.boc[t]['cham'], 'opacity', [(0, 1), (32, 1), (36, 0), (86, 0), (92, 1), (96, 1)]) for t in vui_]]
            q2 += [khung(g.id['nhun'], 'y', [(0, 0), (6, -6), (12, 0), (18, -4), (24, 0), (50, 0)], '0.3 0 0.7 1'),
                   khung(g.id['nhun'], 'rotation', [(0, 0), (8, .03), (16, -.03), (24, .02), (34, 0), (50, 0)]),
                   *[khung(g.boc[t]['vui'], 'opacity', [(0, 1), (44, 1), (50, 0)]) for t in vui_],
                   *[khung(g.boc[t]['cham'], 'opacity', [(0, 0), (44, 0), (50, 1)]) for t in vui_]]
            q3 += [khung(g.id['nhun'], 'y', [(0, 0), (8, 0), (20, -28), (32, 0), (40, -6), (46, 0), (100, 0)], '0.3 0 0.7 1'),
                   khung(g.id['nhun'], 'scaleY', [(0, 1), (8, .9), (14, 1.08), (32, .92), (40, 1.03), (52, 1), (100, 1)]),
                   khung(g.id['nhun'], 'scaleX', [(0, 1), (12, 1), (17, -1), (22, 1), (27, -1), (32, 1), (100, 1)], '0 0 1 1'),
                   *tay_k(g, 'phai', [(0, 0), (10, .73), (60, .73), (76, 0), (100, 0)]),
                   *tay_k(g, 'trai', [(0, 0), (12, .73), (62, .73), (78, 0), (100, 0)]),
                   *tai_theo(g, [(0, 0), (12, .35), (64, .35), (80, 0), (100, 0)]),
                   *duoi_theo(g, [(f, .35 * math.sin(2 * math.pi * f / 12)) for f in range(0, 73, 3)] + [(84, 0), (100, 0)]),
                   *[khung(g.boc[t]['vui'], 'opacity', [(0, 1), (90, 1), (96, 0), (100, 0)]) for t in vui_],
                   *[khung(g.boc[t]['cham'], 'opacity', [(0, 0), (90, 0), (96, 1), (100, 1)]) for t in vui_]]
        a0 = ani('Chờ chạm', 1, [])
        a1, a2, a3 = (ani('Chạm: giật mình rồi cười', 96, q1, lap=False), ani('Chạm 2: khúc khích', 50, q2, lap=False),
                      ani('Chạm 3: trứng — nhảy xoay vòng', 100, q3, lap=False))
        s0, s1, s2, s3 = moi_id(), moi_id(), moi_id(), moi_id()
        cv = vao['cham']
        tg = lambda d: f'<StateTransition stateToId="{d}"><TransitionTriggerCondition inputId="{cv}"/></StateTransition>'
        het_ = f'<StateTransition stateToId="{s0}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>'
        lop.append(f'<StateMachineLayer name="Chạm" id="{moi_id()}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{s0}"/></EntryState>'
                   f'<AnimationState animationId="{a0}" id="{s0}">{tg(s1)}</AnimationState>'
                   f'<AnimationState animationId="{a1}" id="{s1}">{tg(s2)}{het_}</AnimationState>'
                   f'<AnimationState animationId="{a2}" id="{s2}">{tg(s3)}{het_}</AnimationState>'
                   f'<AnimationState animationId="{a3}" id="{s3}">{het_}</AnimationState></StateMachineLayer>')
        # Vào / ra (đầu vào bool 'vao', mặc định true): false → nhảy lò cò trượt ra mép phải; true → nhảy vào giữa
        vao['vao'] = moi_id()
        kin, kout, kra, kvao = [], [], [], []
        for g in goc:
            gid = g.id['goc']
            kin += [khung(gid, 'x', [(0, 256)]), khung(gid, 'y', [(0, CHAN_DAT)]), khung(gid, 'rotation', [(0, 0)])]
            kout += [khung(gid, 'x', [(0, 700)]), khung(gid, 'y', [(0, CHAN_DAT)]), khung(gid, 'rotation', [(0, 0)])]
            kra += [khung(gid, 'x', [(0, 256), (8, 250), (44, 700)], '0.5 0 0.9 0.6'),
                    khung(gid, 'y', [(0, CHAN_DAT), (8, CHAN_DAT), (16, CHAN_DAT - 10), (24, CHAN_DAT), (32, CHAN_DAT - 10),
                                     (40, CHAN_DAT), (44, CHAN_DAT)], '0.3 0 0.7 1'),
                    khung(gid, 'rotation', [(0, 0), (8, -.04), (14, .08), (44, .08)])]
            kvao += [khung(gid, 'x', [(0, 700), (40, 256), (48, 252), (56, 256)], '0.2 0.6 0.4 1'),
                     khung(gid, 'y', [(0, CHAN_DAT), (8, CHAN_DAT - 12), (16, CHAN_DAT), (24, CHAN_DAT - 12), (32, CHAN_DAT),
                                      (40, CHAN_DAT - 6), (46, CHAN_DAT), (60, CHAN_DAT)], '0.3 0 0.7 1'),
                     khung(gid, 'rotation', [(0, -.08), (34, -.08), (44, .04), (52, -.015), (60, 0)])]
        b_in, b_out = ani('Vào: trong khung', 1, kin), ani('Vào: ngoài khung', 1, kout)
        b_ra, b_vao = ani('Vào: đi ra', 44, kra, lap=False), ani('Vào: đi vào', 60, kvao, lap=False)
        t_in, t_out, t_ra, t_vao = moi_id(), moi_id(), moi_id(), moi_id()
        vv = vao['vao']
        dk_ = lambda d, op: (f'<StateTransition stateToId="{d}"><TransitionBoolCondition inputId="{vv}" opValue="{op}"/>'
                             f'</StateTransition>')
        xong = lambda d: f'<StateTransition stateToId="{d}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>'
        lop.append(f'<StateMachineLayer name="Vào ra" id="{moi_id()}"><AnyState/><ExitState/>'
                   f'<EntryState><StateTransition stateToId="{t_in}"/></EntryState>'
                   f'<AnimationState animationId="{b_in}" id="{t_in}">{dk_(t_ra, "notEqual")}</AnimationState>'
                   f'<AnimationState animationId="{b_ra}" id="{t_ra}">{dk_(t_vao, "equal")}{xong(t_out)}</AnimationState>'
                   f'<AnimationState animationId="{b_out}" id="{t_out}">{dk_(t_vao, "equal")}</AnimationState>'
                   f'<AnimationState animationId="{b_vao}" id="{t_vao}">{dk_(t_ra, "notEqual")}{xong(t_in)}</AnimationState>'
                   f'</StateMachineLayer>')

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
    if XEM:
        # dải 9 ô trên cùng: 0 nghỉ, 1 chào … 8 suy nghĩ (ô chẵn/lẻ đậm nhạt khác nhau để dễ thấy)
        so_o = max(HANH_DONG) + 1
        for v in range(so_o):
            ten, sid, w = str(v), moi_id(), 512 / so_o
            mau = '22FFFFFF' if v % 2 else '44FFFFFF'
            vung.append(f'<Shape x="{w * v + w / 2:.1f}" y="18" name="dai-{ten}" id="{sid}"><Rectangle width="{w:.1f}" '
                        f'height="36" name="P"/><Fill name="F"><SolidColor colorValue="{mau}" name="C"/></Fill></Shape>')
            nghe += (f'<StateMachineListenerSingle targetId="{sid}" listenerTypeValue="down" name="Hành động {ten}" '
                     f'id="{moi_id()}"><ListenerNumberChange inputId="{vao["hanh_dong"]}" value="{v}"/>'
                     f'</StateMachineListenerSingle>')
    if XEM and V4:   # dải dưới: nửa trái = ra khỏi khung, nửa phải = vào
        for j_, v_ in enumerate((0, 1)):
            sid = moi_id()
            vung.append(f'<Shape x="{128 + 256 * j_}" y="500" name="vao-{v_}" id="{sid}"><Rectangle width="256" height="24" name="P"/>'
                        f'<Fill name="F"><SolidColor colorValue="{"33FF8080" if v_ == 0 else "3380FF80"}" name="C"/></Fill></Shape>')
            nghe += (f'<StateMachineListenerSingle targetId="{sid}" listenerTypeValue="down" name="Vào {v_}" id="{moi_id()}">'
                     f'<ListenerBoolChange inputId="{vao["vao"]}" value="{v_}"/></StateMachineListenerSingle>')
    smid = moi_id()
    goc_xml = ''.join(g.xml() for g in reversed(goc))
    CO_XUAT = int(os.environ.get('AGV_CO', '0'))   # xuất ảnh: phóng cả cảnh lên artboard CO×CO (nét vẫn sắc)
    if CO_XUAT and not NHO:
        goc_xml = f'<Node x="0" y="0" scaleX="{CO_XUAT / 512}" scaleY="{CO_XUAT / 512}" name="khung-xuat" id="{moi_id()}">{goc_xml}</Node>'
    if NHO:   # artboard nhỏ 128: khung đầu + vai (tâm 256, 205), nét dày ×1,7 để rõ ở 48–64 px
        goc_xml = f'<Node x="{64 - 256 * .33:.2f}" y="{64 - 205 * .33:.2f}" scaleX="0.33" scaleY="0.33" name="khung-nho" id="{moi_id()}">{goc_xml}</Node>'
    dau_vao = (f'<StateMachineNumber name="hanh_dong" value="{os.environ.get("AGV_HD", "0")}" id="{vao["hanh_dong"]}"/>'
               f'<StateMachineNumber name="huong" value="{os.environ.get("AGV_HUONG", "0")}" id="{vao["huong"]}"/>'
               f'<StateMachineTrigger name="cham" id="{vao["cham"]}"/>'
               f'<StateMachineNumber name="nhin_x" value="{os.environ.get("AGV_NHIN_X", "0")}" id="{vao["nhin_x"]}"/>'
               f'<StateMachineNumber name="nhin_y" value="0" id="{vao["nhin_y"]}"/>')
    if V4:
        dau_vao += f'<StateMachineBool name="vao" value="true" id="{vao["vao"]}"/>'
    ID_AB, ID_KIEU = ('0:900002', '0:900005') if NHO else ('0:2', '0:5')
    CO, TEN_AB = (128, 'trau_nho') if NHO else (int(os.environ.get('AGV_CO', '0')) or 512, 'trau')
    print(f'''<Rive version="1" kind="fragment">
<Artboard defaultStateMachineId="{smid}" styleId="{ID_KIEU}" width="{CO}" height="{CO}" name="{TEN_AB}" id="{ID_AB}">
<LayoutComponentStyle name="Kiểu" id="{ID_KIEU}"/>
{''.join(vung)}{''.join(joy_xml)}{goc_xml}
<StateMachine name="trau" id="{smid}">{dau_vao}{''.join(lop)}{nghe}</StateMachine>
{''.join(anim)}
</Artboard>
</Rive>''')


if __name__ == '__main__':
    main()
