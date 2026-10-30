#!/usr/bin/env python3
"""Đồ vector một góc trâu từ ảnh tham chiếu (Higgsfield) → SVG màu/nét V4g, tách bộ phận.

Thư viện cho do-goc.py. Quy trình:
1. Xếp mỗi điểm ảnh vào lớp màu gần nhất (lông, mõm, sừng, áo, quần, khăn, nét tối); xoá đường đất,
   chỉ giữ khối liền lớn nhất (bỏ mẩu của hình bên cạnh).
2. Mảng màu: mỗi mảng liền → bộ phận (hàm `chia` của từng góc) → potrace → tô màu V4g, không viền.
   Mảng nở ra tới giữa nét để các mảng khít nhau dưới lớp nét.
3. Nét: lấy nét tối của chính ảnh gốc, làm dày tới cỡ nét V4g (~5,6 px ở khung 512), chia về bộ phận
   theo mảng màu gần nhất → giữ đủ nét trong (ống tay, nếp tai, chân sừng, mắt, mày, lỗ mũi).
Khung ra 512: điểm cao nhất y=58 (chóp sừng V4g), đáy chân y=490, canh giữa x=256.
"""
import os
import re
import subprocess
import tempfile
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

VIEN = '#24190f'
# lớp: màu mẫu trong ảnh → màu V4g
LOP = {
    'nen': ((255, 255, 255), None),
    'toi': ((40, 28, 20), VIEN),
    'long': ((126, 112, 106), '#84736b'),
    'mom': ((253, 198, 167), '#fdcdb0'),
    'sung': ((255, 240, 219), '#fff1dd'),
    'ao': ((187, 134, 94), '#c48f65'),
    'quan': ((68, 65, 60), '#45423d'),
    'khan-sang': ((240, 238, 234), '#f8f6ef'),
    'khan-vua': ((160, 156, 152), '#a09e99'),
}
MAU_KHAN_DAM = '#3b3935'


def gan_nhan(m):
    """Nhãn mảng liền 4 hướng cho mặt nạ bool → (nhãn, số mảng)."""
    h, w = m.shape
    nhan = np.zeros((h, w), np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if nhan[y0, x0]:
            continue
        n += 1
        q = deque([(y0, x0)]); nhan[y0, x0] = n
        while q:
            y, x = q.popleft()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not nhan[yy, xx]:
                    nhan[yy, xx] = n; q.append((yy, xx))
    return nhan, n


def no(m, r):
    """Nở mặt nạ bán kính r điểm ảnh, hình bát giác (luân phiên ô vuông / chữ thập) → góc tròn, đúng bán kính
    cả với mảng mảnh (cách làm mờ rồi lấy ngưỡng bị loãng ở mảng mảnh như đuôi)."""
    m = m.copy()
    for k in range(int(r)):
        p = np.pad(m, 1)
        n = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        if k % 2 == 0:
            n |= p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
        m = n
    return m


def lap_lo(m):
    """Lấp lỗ kín bên trong mặt nạ (loang nền từ góc, phần không tới được là lỗ)."""
    im = Image.fromarray(np.pad((m * 255).astype(np.uint8), 1)).copy()  # copy: ảnh riêng, loang mới ghi được
    ImageDraw.floodfill(im, (0, 0), 128)
    a = np.asarray(im)[1:-1, 1:-1]
    return a != 128


def tuyet_doi(d, f):
    tok = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d)
    i, cmd, cur, bd, out = 0, None, (0.0, 0.0), (0.0, 0.0), []
    n = {'m': 2, 'l': 2, 'c': 6}
    while i < len(tok):
        if tok[i].isalpha():
            cmd = tok[i]; i += 1
            if cmd in 'zZ':
                out.append('Z'); cur = bd; continue
        rel = cmd.islower(); c = cmd.lower()
        v = [float(t) for t in tok[i:i + n[c]]]; i += n[c]
        pts = [(v[k] + (cur[0] if rel else 0), v[k + 1] + (cur[1] if rel else 0)) for k in range(0, len(v), 2)]
        cur = pts[-1]
        if c == 'm':
            bd = cur; cmd = 'l' if rel else 'L'
        out.append({'m': 'M', 'l': 'L', 'c': 'C'}[c] + ' '.join('%.2f %.2f' % f(*p) for p in pts))
    return ''.join(out)


def potrace(mask, f):
    """Đồ mặt nạ bool → chuỗi d (tuyệt đối, đã đổi toạ độ bằng f)."""
    with tempfile.TemporaryDirectory() as td:
        Image.fromarray(((~mask) * 255).astype(np.uint8)).convert('1').save(os.path.join(td, 'a.pbm'))
        subprocess.run(['potrace', '-s', '-t', '8', '-a', '1.15', '-O', '0.8', '--flat', '-o',
                        os.path.join(td, 'a.svg'), os.path.join(td, 'a.pbm')], check=True)
        s = open(os.path.join(td, 'a.svg')).read()
    tx, ty, sx, sy = map(float, re.search(
        r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', s).groups())
    return ''.join(tuyet_doi(d, lambda x, y: f(tx + sx * x, ty + sy * y)) for d in re.findall(r'<path d="([^"]+)"', s))


class Anh:
    """Ảnh tham chiếu đã phân lớp, kèm phép đổi toạ độ điểm ảnh ↔ khung 512."""

    def __init__(self, duong_dan, lat=False, phong=2):
        im = Image.open(duong_dan).convert('RGB')
        if lat:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        im = im.resize((im.width * phong, im.height * phong), Image.LANCZOS)
        a = np.asarray(im).astype(float)
        ten = list(LOP)
        mau = np.array([LOP[t][0] for t in ten], float)
        lop = ((a[:, :, None, :] - mau[None, None]) ** 2).sum(-1).argmin(-1)
        # lọc trội: bỏ lốm đốm do khử răng cưa giữa nét và màu
        lop = np.asarray(Image.fromarray(lop.astype(np.uint8)).filter(ImageFilter.ModeFilter(2 * phong + 1))).astype(int)
        nen = ten.index('nen')
        kn = lop != nen
        h, w = lop.shape
        # xoá đường đất: hàng kín gần hết bề ngang ở 20 % dưới
        for y in range(int(h * 0.8), h):
            if kn[y].mean() > 0.9:
                lop[max(0, y - 2 * phong):y + 2 * phong + 1] = nen
        kn = lop != nen
        nh, n = gan_nhan(kn)
        lon = np.bincount(nh.ravel())[1:].argmax() + 1
        lop[(nh != lon) & kn] = nen
        self.lop, self.ten = lop, ten
        ys, xs = np.nonzero(lop != nen)
        self.y0, y1 = ys.min(), ys.max()
        self.k = (490 - 58) / (y1 - self.y0)
        self.cx = (xs.min() + xs.max()) / 2
        self.phong = phong

    def f(self, x, y):  # điểm ảnh → khung 512
        return (256 + (x - self.cx) * self.k, 58 + (y - self.y0) * self.k)

    def nguoc(self, x, y):  # khung 512 → điểm ảnh
        return ((x - 256) / self.k + self.cx, (y - 58) / self.k + self.y0)

    def mat_na(self, t):
        return self.lop == self.ten.index(t)

    def da_giac(self, pts):
        """Mặt nạ của đa giác cho bằng toạ độ khung 512."""
        h, w = self.lop.shape
        m = Image.new('L', (w, h), 0)
        ImageDraw.Draw(m).polygon([self.nguoc(x, y) for x, y in pts], fill=255)
        return np.asarray(m) > 0


def do_goc(anh, chia, thu_tu, goc, ra, tieu_de, mo_ta, day_net=5.6, toi_rieng=None, lot=None, net_rong=None,
           net_chi_vien=(), caro=None, them_vung=(), bo_net=None):
    """chia(lop, tam512, khung512, mặt nạ) → tên bộ phận | [(bộ phận, mặt nạ, màu)] | None.
    toi_rieng(tam512, khung512) → bộ phận cho mảng tối nhỏ đứng riêng (mắt, mày, lỗ mũi) hoặc None.
    lot: {bộ phận: màu} → thêm lớp lót kín (đã lấp lỗ) dưới cùng bộ phận, tránh lộ nền giữa các mảng vụn.
    bo_net: mặt nạ vùng bỏ hẳn nét gốc (ví dụ trong khăn: khăn đã có caro và viền riêng).
    them_vung: [(bộ phận, mặt nạ, màu)] thêm thẳng (ví dụ bao khăn lấy theo đa giác khi ảnh khăn vỡ mảnh).
    caro: {bộ phận: cỡ ô} → khăn: bao khăn lấy từ ảnh, bên trong tô lưới caro đều 3 màu V4g (ô vuông gọn).
    net_chi_vien: bộ phận không lấy nét gốc mà viền đường bao lớp lót bằng nét V4g 5,6
    (dùng cho ống quần: ảnh gốc có vân vải tối dính vào nét)."""
    caro = caro or {}
    net_chi_vien = tuple(net_chi_vien) + tuple(caro)
    vung = {}      # bộ phận → [(mặt nạ, màu)]
    phu = {}       # bộ phận → mặt nạ hợp (để chia nét)
    for t in anh.ten:
        if t in ('nen', 'toi'):
            continue
        nh, n = gan_nhan(anh.mat_na(t))
        for i in range(1, n + 1):
            mi = nh == i
            if mi.sum() < 40 * anh.phong ** 2 / 4:
                continue
            yy, xx = np.nonzero(mi)
            tam = anh.f(xx.mean(), yy.mean())
            kq = chia(t, tam, (anh.f(xx.min(), yy.min()), anh.f(xx.max(), yy.max())), mi)
            if not kq:
                continue
            for bo, m, mau in (kq if isinstance(kq, list) else [(kq, mi, None)]):
                vung.setdefault(bo, []).append((m, mau or LOP[t][1]))
                phu[bo] = phu.get(bo, np.zeros_like(m)) | m
    for bo, m, mau in them_vung:
        vung.setdefault(bo, []).append((m, mau))
        phu[bo] = phu.get(bo, np.zeros_like(m)) | m
    # nét: nét gốc làm dày tới cỡ nét V4g, chia về bộ phận có mảng màu gần nhất
    toi = anh.mat_na('toi')
    rieng = {}
    if toi_rieng:
        nh, n = gan_nhan(toi)
        for i in range(1, n + 1):
            mi = nh == i
            yy, xx = np.nonzero(mi)
            (ax, ay), (bx, by) = anh.f(xx.min(), yy.min()), anh.f(xx.max(), yy.max())
            if max(bx - ax, by - ay) > 34 or mi.sum() < 6:
                continue
            bo = toi_rieng(anh.f(xx.mean(), yy.mean()), ((ax, ay), (bx, by)))
            if bo:
                rieng[bo] = rieng.get(bo, np.zeros_like(mi)) | mi
                toi = toi & ~mi
            elif mi.sum() < 22 * anh.phong ** 2:  # đốm vân vải / nhiễu, không phải nét
                toi = toi & ~mi
            else:  # mảng tối bị màu quần bao kín = vân vải trên ống quần
                vien = no(mi, anh.phong * 2) & ~mi
                if (anh.lop[vien] == anh.ten.index('quan')).mean() > 0.8:
                    toi = toi & ~mi
    r_net = max(0, int(round((day_net / anh.k - toi_rong(toi)) / 2)))
    net = no(toi, r_net)
    net_goc = net  # đầu và mõm giữ nét gốc cả trong vùng bỏ nét (viền cằm nằm sát khăn)
    if bo_net is not None:
        net = net & ~bo_net
    net_bo = {}
    con_lai = net.copy()
    for bo in thu_tu:
        if bo in phu:
            m = (net_goc if bo in ('dau-khoi', 'mom', 'duoi') else net) & \
                no(phu[bo], int((net_rong or {}).get(bo, 14) * anh.phong / 2) + r_net)
            if bo in net_chi_vien:
                m = np.zeros_like(m)
            net_bo[bo] = m
    h, w = anh.lop.shape
    gx512 = 256 + (np.arange(w)[None, :] - anh.cx) * anh.k
    gy512 = 58 + (np.arange(h)[:, None] - anh.y0) * anh.k
    o = ['<?xml version="1.0" encoding="utf-8"?>',
         '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img">',
         f'  <title>{tieu_de}</title>', f'  <desc>{mo_ta}</desc>']
    nap = int(round(1.2 * anh.phong)) + r_net  # mảng màu nở tới giữa nét
    for bo in thu_tu:
        if bo not in vung and bo not in rieng:
            continue
        gx, gy = goc.get(bo, (256, 256))
        o.append(f'  <g id="{bo}" data-goc="{gx:.2f} {gy:.2f}" '
                 f'style="transform-box:view-box;transform-origin:{gx:.2f}px {gy:.2f}px">')
        if lot and bo in lot and bo in phu:
            vien = f' stroke="{VIEN}" stroke-width="{day_net}" stroke-linejoin="round"' if bo in net_chi_vien else ''
            kin = lap_lo(no(phu[bo], nap))
            if bo in net_chi_vien or bo == 'dau-khoi':  # đóng (nở rồi co): mép trơn, khép khe khuyết hẹp
                r = int(4 / anh.k)
                kin = ~no(~no(kin, r), r)
            o.append(f'    <path d="{potrace(no(kin, 1), anh.f)}" fill="{lot[bo]}"{vien} '
                     f'fill-rule="evenodd" data-role="lot"/>')
            if bo in caro:
                c = caro[bo]
                ix = np.floor(gx512 / c).astype(int) % 2
                iy = np.floor(gy512 / c).astype(int) % 2
                trong_k = ~no(~kin, int(round(day_net / 2 / anh.k)))  # lùi vào trong nửa nét viền
                for ten_o, mau_o in (('o-dam', MAU_KHAN_DAM), ('o-sang', '#f8f6ef')):
                    mo = trong_k & (((ix == 0) & (iy == 0)) if ten_o == 'o-dam' else ((ix == 1) & (iy == 1)))
                    o.append(f'    <path d="{potrace(mo, anh.f)}" fill="{mau_o}" fill-rule="evenodd" '
                             f'data-role="{ten_o}"/>')
                o.append(f'    <path d="{potrace(no(kin, 1), anh.f)}" fill="none" stroke="{VIEN}" '
                         f'stroke-width="{day_net * 0.86:.1f}" stroke-linejoin="round" data-role="vien-khan"/>')
        for m, mau in vung.get(bo, []):
            if bo in net_chi_vien:  # ống quần: chỉ vẽ mảng khác màu lót (móng), có viền; khăn: không vẽ mảng vụn
                if bo in caro or (lot and mau == lot.get(bo)):
                    continue
                o.append(f'    <path d="{potrace(no(m, nap), anh.f)}" fill="{mau}" stroke="{VIEN}" '
                         f'stroke-width="{day_net}" stroke-linejoin="round" fill-rule="evenodd" data-role="mang"/>')
                continue
            o.append(f'    <path d="{potrace(no(m, nap), anh.f)}" fill="{mau}" fill-rule="evenodd" data-role="mang"/>')
        if bo in rieng:  # mắt, mày, lỗ mũi: đồ nguyên hình gốc, không làm dày
            o.append(f'    <path d="{potrace(lap_lo(rieng[bo]), anh.f)}" fill="{VIEN}" fill-rule="evenodd" '
                     f'data-role="net-rieng"/>')  # lấp chấm sáng giữa lỗ mũi / mắt
        if bo in net_bo and net_bo[bo].any():
            o.append(f'    <path d="{potrace(net_bo[bo], anh.f)}" fill="{VIEN}" fill-rule="evenodd" data-role="net"/>')
        o.append('  </g>')
    o.append('</svg>')
    open(ra, 'w').write('\n'.join(o) + '\n')
    print(ra)


def toi_rong(toi):
    """Ước bề dày nét gốc (điểm ảnh): diện tích / (nửa chu vi) của mảng nét lớn nhất."""
    a = toi.sum()
    bien = (toi ^ no(toi, 1)).sum()
    return 2 * a / max(bien, 1)
