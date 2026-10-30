#!/usr/bin/env python3
"""Đồ tay tư thế giơ (góc chính diện) từ bảng Higgsfield docs/trau/tham-chieu/higgsfield-v4g-tay-1.png
→ nguon/goc/tay-chinh.svg: 4 nhóm tay-trai-ngang, tay-phai-ngang, tay-trai-cao, tay-phai-cao.

Vì sao: tay V4g vẽ cho dáng buông; xoay quá ~40° ống tay thành thanh dẹt. Tay giơ cao phải là hình vẽ riêng,
có vai áo phình liền ống tay. dung-v3.py đổi hình (buông → ngang → cao) trong các động tác cần giơ tay.
Mỗi tay lấy trong một đa giác (khung 512) quanh ống tay và bàn tay; đầu trong của tay giấu dưới khăn/thân áo V4g.
"""
import importlib.util
import os

import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('do_anh', os.path.join(DIR, 'do-anh.py'))
do = importlib.util.module_from_spec(sp); sp.loader.exec_module(do)

# (tư thế, ảnh cắt, {nhóm: (đa giác, điểm xoay vai)})
TU_THE = [
    ('ngang', 'nguon/goc/hf/tay-ngang.png', {
        'tay-trai-ngang': ([(74, 298), (169, 298), (169, 368), (74, 368)], (172, 332)),
        'tay-phai-ngang': ([(329, 298), (442, 298), (442, 368), (329, 368)], (340, 332)),
    }),
    ('cao', 'nguon/goc/hf/tay-cao.png', {
        'tay-trai-cao': ([(84, 236), (148, 236), (178, 312), (178, 364), (132, 356), (100, 304)], (170, 338)),
        'tay-phai-cao': ([(364, 236), (428, 236), (412, 304), (380, 356), (334, 364), (334, 312)], (342, 338)),
    }),
]


def main():
    out = []
    for ten, anh_tep, nhom in TU_THE:
        anh = do.Anh(os.path.join(DIR, anh_tep))
        vung = {bo: anh.da_giac(poly) for bo, (poly, _) in nhom.items()}
        moi = np.zeros_like(next(iter(vung.values())))
        for m in vung.values():
            moi |= m

        def chia(t, tam, khung, m):
            kq = []
            for bo, v in vung.items():
                mm = m & v
                if mm.sum() > 30 and t in ('ao', 'long', 'quan', 'khan-vua', 'khan-sang'):
                    mau = {'ao': None, 'long': '#84736b'}.get(t, '#84736b')  # vệt sáng/tối trong bàn tay → màu tay
                    kq.append((bo, mm, mau))
            return kq or None
        ra = os.path.join(DIR, f'build/tay-{ten}.svg')
        do.do_goc(anh, chia, list(nhom), {bo: g for bo, (_, g) in nhom.items()}, ra, ten, ten,
                  lot={bo: '#c48f65' for bo in nhom}, bo_net=~do.no(moi, 0))
        s = open(ra).read()
        out.append(s[s.index('  <g '):s.rindex('</svg>')])
    p = os.path.join(DIR, 'nguon/goc/tay-chinh.svg')
    open(p, 'w').write('<?xml version="1.0" encoding="utf-8"?>\n'
                       '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'
                       '  <title>Trâu V4g — tay tư thế giơ (chính diện)</title>\n'
                       '  <desc>Đồ từ docs/trau/tham-chieu/higgsfield-v4g-tay-1.png (hình 1: dang ngang, hình 3: giơ cao); '
                       'màu V4g, nét #24190f ~5,6.</desc>\n' + ''.join(out) + '</svg>\n')
    print(p)


if __name__ == '__main__':
    main()
