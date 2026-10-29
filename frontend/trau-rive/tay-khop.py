"""Dựng cánh tay trâu theo khớp (vai → khuỷu → cổ tay) từ đúng cánh tay V4g, để mọi tư thế dùng CHUNG một cánh tay.

Mỗi tay = 3 đoạn: bắp tay (ống áo trên), cẳng tay (ống áo dưới + cổ tay áo loe), bàn tay (lấy nguyên path móng V4g).
Tư thế chỉ là góc xoay vai/khuỷu/cổ tay (độ, theo chiều kim đồng hồ, 0 = buông thẳng xuống) → không bao giờ lệch cỡ.
Dùng: python3 tay-khop.py nguon/trau.svg tu-the.json thu-muc-ra/   (xuất <ma>.svg cho từng tư thế)
"""
import json, math, os, re, sys, copy
import xml.etree.ElementTree as ET

NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
VIEN, NET = '#24190f', 5.6
MAU_AO, MAU_BONG, MAU_MAY = '#c48f65', '#aa7652', '#986b4c'

# Số đo đọc từ tay trái V4g (khung 512): vai (181,327) data-goc; tâm cổ tay áo ~ (142,381); ống áo rộng ~34 ở vai, loe ~44 ở cổ tay.
L_TREN, L_DUOI = 30.0, 36.0          # bắp tay, cẳng tay (vai→khuỷu→cổ tay áo)
R_VAI, R_KHUYU, R_CO = 17.5, 16.0, 22.0  # nửa bề rộng ống áo
NGHI = 36.0                          # góc buông tự nhiên của tay trái V4g
VAI_TRAI, VAI_PHAI = (172.0, 322.0), (340.0, 322.0)
# Bộ số đo đã dò khớp V4g (do-tay-khop.py) — ghi đè các giá trị mặc định ở trên.
_ts = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tham-so-tay.json')
if os.path.exists(_ts):
    for _k, _v in json.load(open(_ts)).items():
        globals()[_k] = tuple(_v) if isinstance(_v, list) else _v
    if 'VAI' in globals():
        VAI_TRAI, VAI_PHAI = (VAI[0], VAI[1]), (512 - VAI[0], VAI[1])


def hinh_ong(l, r0, r1):
    """Đường bao một đoạn ống áo dọc trục +y dài l, nửa rộng r0 → r1, đầu tròn ở gốc (khớp), đáy hơi cong."""
    return (f'M {-r0:.2f} 0 A {r0:.2f} {r0:.2f} 0 0 1 {r0:.2f} 0 '
            f'C {r0:.2f} {l * .45:.2f} {r1:.2f} {l * .7:.2f} {r1:.2f} {l:.2f} '
            f'Q 0 {l + r1 * .28:.2f} {-r1:.2f} {l:.2f} '
            f'C {-r1:.2f} {l * .7:.2f} {-r0:.2f} {l * .45:.2f} {-r0:.2f} 0 Z')


def vien_ong(l, r0, r1):
    """Lớp viền: nét gấp đôi, nằm DƯỚI mọi lớp màu của cánh tay → chỉ còn nửa ngoài lộ ra = viền bao liền mạch ở khuỷu."""
    return f'<path d="{hinh_ong(l, r0, r1)}" fill="{VIEN}" stroke="{VIEN}" stroke-width="{NET * 2:.2f}" stroke-linejoin="round"/>'


def ong(l, r0, r1, nep=False):
    """Lớp màu + chi tiết (không viền) của một đoạn ống áo."""
    g = f'<path d="{hinh_ong(l, r0, r1)}" fill="{MAU_AO}" stroke="none"/>'
    if nep:  # cổ tay áo: vạt bóng + đường may
        g += (f'<path d="M {-r1 + 3:.2f} {l - 7:.2f} Q 0 {l - 1:.2f} {r1 - 3:.2f} {l - 7:.2f} L {r1 - 2:.2f} {l - 2:.2f} '
              f'Q 0 {l + r1 * .22:.2f} {-r1 + 2:.2f} {l - 2:.2f} Z" fill="{MAU_BONG}" opacity=".18"/>'
              f'<path d="M {-r1 + 4:.2f} {l - 8:.2f} Q 0 {l - 2:.2f} {r1 - 4:.2f} {l - 8:.2f}" fill="none" stroke="{MAU_MAY}" '
              f'stroke-width="1.35" opacity=".55"/>')
    else:    # nếp khuỷu nhẹ
        g += (f'<path d="M {-r0 * .45:.2f} {l * .62:.2f} q {r0 * .35:.2f} {l * .14:.2f} {r0 * .8:.2f} {l * .1:.2f}" '
              f'fill="none" stroke="{MAU_BONG}" stroke-width="1.35" opacity=".45"/>')
    return g


def ban_tay(svg_root):
    """Lấy path bàn tay (móng) + bóng của tay trái V4g, đưa về toạ độ cổ tay (0,0), trục tay +y."""
    goc = next(g for g in svg_root.iter(f'{{{NS}}}g') if g.get('id') == 'tay-trai')
    phan = [c for c in goc if c.get('data-role') in ('mong-tay', 'bong-tay')]
    # cổ tay V4g ≈ (142,381); tay buông lệch NGHI độ → xoay ngược để trục thẳng xuống.
    cx, cy = 142.0, 381.0
    out = []
    for c in phan:
        a = {k: v for k, v in c.attrib.items() if k in ('fill', 'stroke', 'stroke-width', 'opacity')}
        thuoc = ' '.join(f'{k}="{v}"' for k, v in a.items())
        out.append(f'<path d="{c.get("d")}" {thuoc}/>')
    return f'<g transform="rotate({-NGHI} 0 0) translate({-cx} {-cy})">' + ''.join(out) + '</g>'


THU_DAO_CU = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nguon', 'dao-cu')
LONG_BAN_TAY = (0.0, 12.0)   # tâm lòng bàn tay trong hệ cổ tay (đo trên tay V4g đã xoay thẳng)


def dao_cu(ten, ti_le=0.5, xoay=0.0, lech=(0.0, 0.0), guong=False):
    """Nội dung SVG đạo cụ, đặt sao cho `diem-cam` trùng lòng bàn tay; nằm DƯỚI bàn tay (ngón đè mép đồ).
    `guong`: tay phải đã lật gương cả cánh tay → lật lại đạo cụ để chữ/hình không bị ngược."""
    goc = ET.parse(os.path.join(THU_DAO_CU, ten + '.svg')).getroot()
    cam = next((c for c in goc.iter(f'{{{NS}}}circle') if c.get('id') == 'diem-cam'), None)
    cx, cy = (float(cam.get('cx')), float(cam.get('cy'))) if cam is not None else (0.0, 0.0)
    mac_dinh = ' '.join(f'{k}="{v}"' for k, v in goc.attrib.items() if k in ('fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap'))
    ben_trong = ''.join(ET.tostring(c, encoding='unicode') for c in goc if c.tag.split('}')[-1] not in ('title', 'desc'))
    ben_trong = re.sub(r'\sxmlns(:\w+)?="[^"]*"', '', ben_trong)
    lat = ' scale(-1 1)' if guong else ''
    return (f'<g id="do-{ten}" {mac_dinh} transform="translate({LONG_BAN_TAY[0] + lech[0]} {LONG_BAN_TAY[1] + lech[1]}) '
            f'rotate({xoay}){lat} scale({ti_le}) translate({-cx} {-cy})">{ben_trong}</g>')


def canh_tay(ten, vai, goc_vai, goc_khuyu, goc_co, ban, guong=False, keo=1.0, keo_duoi=None, chi_ban=False, ban_noi=False, do=''):
    """Trả về <g> cánh tay. Góc độ theo chiều kim đồng hồ (tay trái); tay phải lật gương.
    keo: hệ số kéo dài ống tay (co giãn hoạt hình khi giơ tay) — chỉ đổi độ dài, giữ nguyên bề rộng và bàn tay."""
    sx = -1 if guong else 1
    lt, ld = L_TREN * keo, L_DUOI * (keo if keo_duoi is None else keo_duoi)
    # Ba chuỗi cùng một bộ khớp (cùng góc): bàn tay → viền ống áo → màu ống áo (sau nằm trên).
    # Màu đè lên viền nên chỗ hai đoạn chồng nhau ở khuỷu không còn nét giữa: tay liền một ống.
    def chuoi(lop, phan_tren, phan_duoi, phan_ban=''):
        tay = (f'<g id="{ten}-ban{lop}" transform="translate(0 {ld:.2f}) rotate({goc_co})">{phan_ban}</g>') if phan_ban else ''
        duoi = f'<g id="{ten}-duoi{lop}" transform="translate(0 {lt:.2f}) rotate({goc_khuyu})">{tay}{phan_duoi}</g>'
        return f'<g id="{ten}-tren{lop}" transform="rotate({goc_vai})">{phan_tren}{duoi}</g>'
    ban_tay_lop = chuoi('', '', '', do + ban)
    mo = f'<g id="{ten}{"-ban-noi" if chi_ban else ""}" data-goc="{vai[0]} {vai[1]}" transform="translate({vai[0]} {vai[1]}) scale({sx} 1)">'
    if chi_ban:  # chỉ bàn tay, đặt ở lớp trên đầu (gãi đầu, khum tai): cùng bộ khớp nên dính đúng cổ tay
        return mo + ban_tay_lop + '</g>'
    vien = chuoi('-vien', vien_ong(lt, R_VAI, R_KHUYU), vien_ong(ld, R_KHUYU, R_CO))
    mau = chuoi('-mau', ong(lt, R_VAI, R_KHUYU), ong(ld, R_KHUYU, R_CO, nep=True))
    return mo + (ban_tay_lop if not ban_noi else '') + vien + mau + '</g>'


# ---- Chân: hông → gối → cổ chân, cùng cách làm với tay (ống quần + móng V4g) ----
MAU_QUAN, MAU_NEP_QUAN = '#45423d', '#757166'
HONG_TRAI, HONG_PHAI = (214.0, 404.0), (298.0, 404.0)
L_DUI, L_CANG = 30.0, 34.0
R_HONG, R_GOI, R_GAU = 35.0, 33.5, 33.0


def ong_quan(l, r0, r1, gau=False):
    g = f'<path d="{hinh_ong(l, r0, r1)}" fill="{MAU_QUAN}" stroke="none"/>'
    if gau:
        g += (f'<path d="M {-r1 + 6:.2f} {l - 13:.2f} Q 0 {l - 10:.2f} {r1 - 6:.2f} {l - 13:.2f}" fill="none" stroke="{MAU_NEP_QUAN}" '
              f'stroke-width="1.6" opacity=".28"/>')
    return g


def mong(svg_root):
    """Móng chân trái V4g (móng + bóng + khe), đưa về toạ độ cổ chân (0,0)."""
    goc = next(g for g in svg_root.iter(f'{{{NS}}}g') if g.get('id') == 'chan-trai')
    out = []
    for c in goc:
        if c.get('data-role') in ('mong-chan', 'bong-mong', 'khe-mong'):
            a = {k: v for k, v in c.attrib.items() if k in ('fill', 'stroke', 'stroke-width', 'opacity')}
            out.append(f'<path d="{c.get("d")}" ' + ' '.join(f'{k}="{v}"' for k, v in a.items()) + '/>')
    return '<g transform="translate(-213 -462)">' + ''.join(out) + '</g>'


def chan(ten, hong, goc_hong, goc_goi, goc_co, mong_tay, guong=False, keo_dui=1.0, keo_cang=1.0):
    """Chân 3 đoạn; viền dưới màu → gối liền. keo_dui < 1 = đùi co ngắn (ngồi, nhìn chính diện)."""
    sx = -1 if guong else 1
    ld, lc = L_DUI * keo_dui, L_CANG * keo_cang

    def chuoi(lop, p_dui, p_cang, p_mong=''):
        m = f'<g id="{ten}-mong{lop}" transform="translate(0 {lc:.2f}) rotate({goc_co})">{p_mong}</g>' if p_mong else ''
        cang = f'<g id="{ten}-cang{lop}" transform="translate(0 {ld:.2f}) rotate({goc_goi})">{m}{p_cang}</g>'
        return f'<g id="{ten}-dui{lop}" transform="rotate({goc_hong})">{p_dui}{cang}</g>'
    return (f'<g id="{ten}" data-goc="{hong[0]} {hong[1]}" transform="translate({hong[0]} {hong[1]}) scale({sx} 1)">'
            + chuoi('', '', '', mong_tay)
            + chuoi('-vien', vien_ong(ld, R_HONG, R_GOI), vien_ong(lc, R_GOI, R_GAU))
            + chuoi('-mau', ong_quan(ld, R_HONG, R_GOI), ong_quan(lc, R_GOI, R_GAU, gau=True)) + '</g>')


def dung(svg_path, tu_the, ra):
    goc = ET.parse(svg_path)
    root = goc.getroot()
    ban = ban_tay(root)
    mong_chan = mong(root)
    os.makedirs(ra, exist_ok=True)
    for ma, p in tu_the.items():
        t = copy.deepcopy(goc); r = t.getroot()
        cha = {c: pa for pa in r.iter() for c in pa}
        for side, vai, guong in (('tay-trai', VAI_TRAI, False), ('tay-phai', VAI_PHAI, True)):
            g = next(x for x in r.iter(f'{{{NS}}}g') if x.get('id') == side)
            pa = cha[g]; i = list(pa).index(g)
            q = p[side]
            keo = q[3] if len(q) > 3 else 1.0
            keo_duoi = q[4] if len(q) > 4 else None
            noi = bool(p.get(side + '-ban-noi'))
            # "do": {"tay-phai": ["dien-thoai", ti_le, xoay, lech_x, lech_y]}
            d = (p.get('do') or {}).get(side)
            do_svg = dao_cu(d[0], d[1] if len(d) > 1 else 0.5, d[2] if len(d) > 2 else 0.0,
                            (d[3] if len(d) > 3 else 0.0, d[4] if len(d) > 4 else 0.0), guong) if d else ''
            moi = ET.fromstring(f'<g xmlns="{NS}">' + canh_tay(side, vai, q[0], q[1], q[2], ban, guong, keo, keo_duoi, ban_noi=noi, do=do_svg) + '</g>')[0]
            if noi:  # bàn tay nổi lên trên đầu: thêm nhóm chỉ-bàn-tay ở cuối gốc SVG (cùng bộ khớp)
                r.append(ET.fromstring(f'<g xmlns="{NS}">' + canh_tay(side, vai, q[0], q[1], q[2], ban, guong, keo, keo_duoi, chi_ban=True) + '</g>')[0])
            pa.remove(g)
            # Tay đưa ra trước thân (ôm/cầm đồ trước ngực) thì vẽ sau thân.
            if p.get(side + '-truoc'):
                pa.append(moi)
            else:
                pa.insert(i, moi)
        # Chân chỉ thay khi tư thế có khai báo (dáng đứng giữ nguyên chân V4g).
        for side, hong, guong in (('chan-trai', HONG_TRAI, False), ('chan-phai', HONG_PHAI, True)):
            if side not in p:
                continue
            g = next(x for x in r.iter(f'{{{NS}}}g') if x.get('id') == side)
            pa = cha[g]; i = list(pa).index(g)
            q = p[side]
            moi = ET.fromstring(f'<g xmlns="{NS}">' + chan(side, hong, q[0], q[1], q[2], mong_chan, guong,
                                                        q[3] if len(q) > 3 else 1.0, q[4] if len(q) > 4 else 1.0) + '</g>')[0]
            pa.remove(g); pa.insert(i, moi)
        # Đồ cầm trước ngực bằng hai tay: nằm lớp trên cùng, hai bàn tay ló ở hai mép.
        # "do-truoc": [ten, ti_le, x, y, xoay] — toạ độ khung 512 của điểm cầm.
        if p.get('do-truoc'):
            dt = p['do-truoc']
            g = ET.fromstring(f'<g xmlns="{NS}" transform="translate({dt[2]} {dt[3]})">' + dao_cu(dt[0], dt[1], dt[4] if len(dt) > 4 else 0, (0, -LONG_BAN_TAY[1])) + '</g>')
            r.append(g)
        # Ngồi: hạ cả phần trên (mọi thứ trừ hai chân) xuống `ha_than` px, móng vẫn chạm đất.
        if p.get('ha_than'):
            boc = ET.SubElement(r, f'{{{NS}}}g', {'id': 'than-tren', 'transform': f'translate(0 {p["ha_than"]})'})
            for c in list(r):
                if c is boc or c.tag.split('}')[-1] in ('title', 'desc', 'defs'):
                    continue
                if c.get('id') in ('chan-trai', 'chan-phai'):
                    continue
                r.remove(c); boc.append(c)
            # giữ hai chân nằm dưới thân: đưa nhóm thân-trên lên cuối (vẽ sau)
            r.remove(boc); r.append(boc)
        t.write(os.path.join(ra, f'{ma}.svg'), encoding='unicode')
    print('đã dựng', len(tu_the), 'tư thế →', ra)


if __name__ == '__main__':
    dung(sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8')), sys.argv[3])
