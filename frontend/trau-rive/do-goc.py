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
    anh = do.Anh(os.path.join(DIR, 'nguon/goc/hf/nghieng-hf-trai.png'))
    tay = anh.da_giac([(224, 316), (294, 316), (296, 388), (224, 388)])

    LONG, KHAN_DAM, KHAN_VUA = '#84736b', '#3b3935', '#a09e99'

    def chia(t, tam, khung, m):
        if t == 'sung':
            return 'sung-gan'
        if trong(khung[0], 245, 160, 322, 234) and trong(khung[1], 245, 160, 322, 234):  # tai: cả mảng nằm trong vùng tai
            return [('tai-gan', m, None)] if t == 'long' else None
        if trong(tam, 232, 374, 302, 418) and t in ('long', 'khan-vua', 'khan-sang'):
            return [('tay-gan', m, LONG)]                        # bàn tay (lông sáng dễ lẫn màu khăn)
        if t == 'mom':
            return 'mom' if tam[0] < 240 and tam[1] < 300 else None
        if t == 'ao':
            return [('tay-gan', m & tay, None), ('than', m, None)]  # thân giữ mảng đủ (nằm dưới), ống tay chồng lên
        if trong(tam, 182, 284, 338, 432) and t in ('khan-sang', 'khan-vua', 'quan', 'long') and \
                not (t == 'long' and tam[1] < 300) and not (t == 'quan' and tam[1] > 412):
            mau = {'quan': KHAN_DAM, 'long': KHAN_VUA}.get(t)
            bo = 'khan-dai' if tam[1] > 336 and tam[0] < 236 else 'khan-co'
            return [(bo, m, mau)]
        if t == 'long':
            if 283 < tam[1] < 335 and m.sum() < 4000:
                return None                                      # mảnh lông vụn sát khăn
            if tam[1] < 300:
                return 'dau-khoi'
            if tam[0] > 288 and 400 < tam[1] < 470:
                return 'duoi'
            if tam[1] > 455:
                return 'chan-gan'
            return None
        if t == 'quan':
            if tam[0] > 330 and tam[1] < 470:
                return [('duoi', m, '#292b27')]                  # chùm lông đuôi
            return 'chan-gan'
        return None                                              # đốm khăn lạc ngoài vùng khăn

    def chia2(t, tam, khung, m):  # gói kết quả 3 phần tử thành danh sách
        r = chia(t, tam, khung, m)
        return [r] if isinstance(r, tuple) else r

    def toi_rieng(tam, khung):
        if trong(tam, 180, 175, 205, 200):
            return 'mat-gan'
        if trong(tam, 180, 150, 215, 172):
            return 'long-may-gan'
        return None

    thu_tu = ['duoi', 'chan-gan', 'than', 'khan-dai', 'tay-gan', 'khan-co', 'dau-khoi', 'mom', 'tai-gan', 'sung-gan',
              'long-may-gan', 'mat-gan']
    goc = {'duoi': (300, 412), 'chan-gan': (255, 420), 'than': (262, 412), 'khan-dai': (205, 338),
           'tay-gan': (258, 326), 'khan-co': (258, 315), 'dau-khoi': (245, 290), 'mom': (180, 245),
           'tai-gan': (262, 180), 'sung-gan': (282, 150), 'long-may-gan': (196, 160), 'mat-gan': (192, 187)}
    do.do_goc(anh, chia2, thu_tu, goc, os.path.join(DIR, 'nguon/goc/trau-nghieng-trai.svg'),
              'Trâu V4g — góc nghiêng trái (đồ từ Higgsfield)',
              'Đồ từ bảng xoay Higgsfield sinh từ V4g (docs/trau/tham-chieu/higgsfield-v4g-xoay-1.png, hình 3, lật gương); '
              'màu V4g, nét #24190f ~5,6.', toi_rieng=toi_rieng,
              net_rong={'duoi': 44}, caro={'khan-co': 12, 'khan-dai': 12}, lot={'dau-khoi': LONG, 'tai-gan': LONG, 'sung-gan': '#fff1dd', 'khan-co': KHAN_VUA, 'khan-dai': KHAN_VUA})


def ba_tu():
    """¾ trái, từ ảnh 3d_jutsu_angles (docs/trau/tham-chieu/higgsfield-v4g-34-trai-1.png)."""
    anh = do.Anh(os.path.join(DIR, 'nguon/goc/hf/34-hf-trai.png'))
    LONG, KHAN_DAM, KHAN_VUA = '#84736b', '#3b3935', '#a09e99'
    tay = anh.da_giac([(262, 318), (340, 318), (342, 410), (262, 410)])
    # khăn ¾ vỡ mảnh trong ảnh → bao khăn = mọi điểm không phải nền/áo/lông/mõm/sừng trong đa giác cổ khăn, đầu khăn
    la_khan = ~np.isin(anh.lop, [anh.ten.index(t) for t in ('nen', 'ao', 'long', 'mom', 'sung')])
    khan_co = la_khan & anh.da_giac([(174, 280), (330, 280), (334, 300), (326, 312), (280, 322), (240, 334),
                                     (205, 346), (180, 348), (172, 320)])
    khan_dai = la_khan & anh.da_giac([(172, 318), (198, 318), (198, 345), (190, 428), (158, 430), (156, 380)])
    vung_khan = khan_co | khan_dai
    chan_xa = anh.da_giac([(150, 395), (243, 395), (243, 500), (150, 500)])

    def chia(t, tam, khung, m):
        (ax, ay), (bx, by) = khung
        if t == 'sung':
            return 'sung-xa' if tam[0] < 230 else 'sung-gan'
        if t == 'mom':
            return 'mom' if trong(tam, 120, 195, 265, 300) else None
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
              bo_net=do.no(vung_khan, 6))


if __name__ == '__main__':
    {'nghieng': nghieng, '34': ba_tu}[sys.argv[1]]()
