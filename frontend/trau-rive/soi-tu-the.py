"""Soi tự động mọi dáng đã dựng (build/khop/*.svg) bằng OpenCV.
Chạy: <cv-env>/bin/python soi-tu-the.py build/khop  → build/khop/soi/<ma>.png + soi.json
Kiểm:
- lo_ho: vùng màu nền bị bao kín bên trong hình (khớp hở, khe giữa mảnh). Lỗ nhỏ < NGUONG_LO px bỏ qua.
- cat_mep: hình chạm mép khung (bị cắt).
- lech_nen: hình bóng (alpha) trên nền sáng và nền tối phải trùng; lệch = có phần tô bán trong suốt lòi ra.
"""
import json, os, subprocess, sys
import cv2, numpy as np

NGUONG_LO = 40      # px trên khung 512 (khe nhỏ giữa ngón tay/đuôi là bình thường)
d = sys.argv[1]; ra = os.path.join(d, 'soi'); os.makedirs(ra, exist_ok=True)


def ve(svg, nen):
    out = os.path.join(ra, '_tmp.png')
    subprocess.run(['rsvg-convert', '-w', '512', '-h', '512', '-b', nen, '-o', out, svg], check=True)
    return cv2.imread(out)


def mat_na(img, nen_bgr):
    return (np.abs(img.astype(int) - np.array(nen_bgr)).sum(axis=2) > 18).astype(np.uint8)


ket = {}
for f in sorted(x for x in os.listdir(d) if x.endswith('.svg')):
    ma = f[:-4]; svg = os.path.join(d, f)
    toi = ve(svg, '#233c31'); sang = ve(svg, '#f7f8f2')
    m_toi = mat_na(toi, (49, 60, 35)); m_sang = mat_na(sang, (242, 248, 247))
    hinh = ((m_toi + m_sang) > 0).astype(np.uint8)
    # lỗ: phần nền không nối ra mép khung
    nen = (1 - hinh).astype(np.uint8)
    n, nhan, tk, _ = cv2.connectedComponentsWithStats(nen, connectivity=4)
    lo = []
    for i in range(1, n):
        x, y, w, h, s = tk[i]
        cham_mep = x == 0 or y == 0 or x + w >= 512 or y + h >= 512
        if not cham_mep and s >= NGUONG_LO:
            lo.append({'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h), 'dien_tich': int(s)})
    cat = int(hinh[0, :].sum() + hinh[-1, :].sum() + hinh[:, 0].sum() + hinh[:, -1].sum())
    lech = int(np.logical_xor(m_toi, m_sang).sum())
    ket[ma] = {'lo_ho': lo, 'cat_mep_px': cat, 'lech_nen_px': lech}
    anh = toi.copy()
    for l in lo:
        cv2.rectangle(anh, (l['x'] - 3, l['y'] - 3), (l['x'] + l['w'] + 3, l['y'] + l['h'] + 3), (0, 0, 255), 2)
    cv2.imwrite(os.path.join(ra, ma + '.png'), anh)
json.dump(ket, open(os.path.join(ra, 'soi.json'), 'w'), ensure_ascii=False, indent=1)
for ma, k in ket.items():
    co = []
    if k['lo_ho']: co.append(f"{len(k['lo_ho'])} lỗ (lớn nhất {max(l['dien_tich'] for l in k['lo_ho'])}px)")
    if k['cat_mep_px']: co.append(f"cắt mép {k['cat_mep_px']}px")
    if k['lech_nen_px'] > 400: co.append(f"lệch nền {k['lech_nen_px']}px")
    print(f'{ma:6}', '; '.join(co) if co else 'sạch')
