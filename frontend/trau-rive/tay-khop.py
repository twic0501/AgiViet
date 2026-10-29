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


def canh_tay(ten, vai, goc_vai, goc_khuyu, goc_co, ban, guong=False, keo=1.0, keo_duoi=None):
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
    ban_tay_lop = chuoi('', '', '', ban)
    vien = chuoi('-vien', vien_ong(lt, R_VAI, R_KHUYU), vien_ong(ld, R_KHUYU, R_CO))
    mau = chuoi('-mau', ong(lt, R_VAI, R_KHUYU), ong(ld, R_KHUYU, R_CO, nep=True))
    return (f'<g id="{ten}" data-goc="{vai[0]} {vai[1]}" transform="translate({vai[0]} {vai[1]}) scale({sx} 1)">'
            f'{ban_tay_lop}{vien}{mau}</g>')


def dung(svg_path, tu_the, ra):
    goc = ET.parse(svg_path)
    root = goc.getroot()
    ban = ban_tay(root)
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
            moi = ET.fromstring(f'<g xmlns="{NS}">' + canh_tay(side, vai, q[0], q[1], q[2], ban, guong, keo, keo_duoi) + '</g>')[0]
            pa.remove(g)
            # Tay đưa ra trước thân (ôm/cầm đồ trước ngực) thì vẽ sau thân.
            if p.get(side + '-truoc'):
                pa.append(moi)
            else:
                pa.insert(i, moi)
        t.write(os.path.join(ra, f'{ma}.svg'), encoding='unicode')
    print('đã dựng', len(tu_the), 'tư thế →', ra)


if __name__ == '__main__':
    dung(sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8')), sys.argv[3])
