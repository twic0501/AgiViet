"""Nhạc nền tự soạn cho video giới thiệu (không dùng nhạc có bản quyền).

Rê trưởng, 92 nhịp/phút, vòng D–A–Bm–G. Các đoạn bám theo cảnh trong lich.json:
mở đầu chỉ có nền; “vấn đề” trầm (Bm–G–D–A); từ “giới thiệu” thêm tiếng gảy rải hợp âm, bass, nhịp nhẹ;
cảnh chốt đơn thêm tiếng lắc; cảnh kết một hợp âm dài rồi nhỏ dần.
Chạy: python video/nhac.py <thư mục có lich.json>   → <thư mục>/nhac.wav
"""
import json, sys, wave
from pathlib import Path
import numpy as np

RA = Path(sys.argv[1])
L = json.loads((RA / 'lich.json').read_text())
SR = 44100
T = float(L['tong_giay'])
N = int(T * SR)
moc = {c['id']: (c['bat_dau'], c['bat_dau'] + c['dai']) for c in L['canh']}
rng = np.random.default_rng(7)

BPM = 92
nhip = 60 / BPM
o_nhip = 4 * nhip
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
# hợp âm (MIDI): D, A, Bm, G
HOP = {'D': [50, 54, 57], 'A': [45, 49, 52], 'Bm': [47, 50, 54], 'G': [43, 47, 50]}
VONG_SANG = ['D', 'A', 'Bm', 'G']
VONG_TRAM = ['Bm', 'G', 'D', 'A']

trai = np.zeros(N); phai = np.zeros(N)

def them(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    trai[i:i + len(sig)] += sig * gain * (1 - pan) / 2 ** .5
    phai[i:i + len(sig)] += sig * gain * (1 + pan) / 2 ** .5

def loc_thap(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); s = 0.0
    # một cực, chạy theo khối cho nhanh
    b = 1 - a
    for k in range(len(x)):
        s = b * x[k] + a * s
        y[k] = s
    return y

def pad(nots, dai, sang=1.0):
    t = np.arange(int(dai * SR)) / SR
    s = np.zeros_like(t)
    for m in nots:
        for lech in (-0.12, 0.0, 0.11):          # 3 dao động lệch nhẹ cho dày
            f = hz(m + 12) * 2 ** (lech / 12)
            for h, a in ((1, 1), (2, .45 * sang), (3, .22 * sang), (4, .1 * sang)):
                s += a * np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28))
    vao, ra = min(1.2, dai / 3), min(1.6, dai / 3)
    env = np.minimum(1, t / vao) * np.minimum(1, (dai - t) / ra)
    return s * env / (len(nots) * 3 * 1.8)

def gay(m, dai=1.4, sang=1.0):
    t = np.arange(int(dai * SR)) / SR
    f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + .5 * sang * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + .25 * sang * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 9))
    return s * np.exp(-t * 3.2) * np.minimum(1, t / .004)

def bass(m, dai):
    t = np.arange(int(dai * SR)) / SR
    s = np.sin(2 * np.pi * hz(m - 12) * t) + .3 * np.sin(2 * np.pi * hz(m) * t)
    return s * np.minimum(1, t / .02) * np.exp(-t * .9) * np.minimum(1, (dai - t) / .15)

def trong():
    t = np.arange(int(.35 * SR)) / SR
    f = 45 + 80 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)

def xa(dai=.06, doc=60):
    t = np.arange(int(dai * SR)) / SR
    n = rng.standard_normal(len(t)); n = n - np.concatenate([[0], n[:-1]])   # bỏ trầm
    return n * np.exp(-t * doc)

def doan(t_bd, t_kt, vong, lop):
    """Rải nhạc từ t_bd tới t_kt theo ô nhịp; lop: tập các lớp nhạc cụ bật."""
    k = int(np.floor(t_bd / o_nhip))
    while k * o_nhip < t_kt:
        t0 = k * o_nhip
        ten = vong[k % 4]; nots = HOP[ten]
        if t0 >= t_bd - 1e-6:
            if 'pad' in lop: them(pad(nots, o_nhip + .8, lop.get('pad', 1)), t0, .5)
            if 'bass' in lop: them(bass(nots[0], o_nhip), t0, .34)
            if 'gay' in lop:
                mau = [nots[0] + 12, nots[1] + 12, nots[2] + 12, nots[0] + 24, nots[2] + 12, nots[1] + 12, nots[0] + 12, nots[2] + 12]
                for j, m in enumerate(mau):
                    tj = t0 + j * nhip / 2
                    if tj < t_kt: them(gay(m, sang=lop['gay']), tj, .16 if j % 2 else .2, pan=-.35 if j % 2 else .35)
            if 'trong' in lop:
                for j in (0, 2): them(trong(), t0 + j * nhip, .42)
            if 'xa' in lop:
                for j in range(8):
                    tj = t0 + j * nhip / 2
                    if tj < t_kt: them(xa(), tj, .05 if j % 2 else .025, pan=.3)
        k += 1

bd = lambda i: moc[i][0]; kt = lambda i: moc[i][1]
doan(0, bd('van-de'), VONG_SANG, {'pad': .6})
doan(bd('van-de'), bd('gioi-thieu'), VONG_TRAM, {'pad': .8, 'bass': 1})
doan(bd('gioi-thieu'), bd('chot-don'), VONG_SANG, {'pad': 1, 'bass': 1, 'gay': 1, 'trong': 1})
doan(bd('chot-don'), bd('ve-tay'), VONG_SANG, {'pad': 1, 'bass': 1, 'gay': 1, 'trong': 1, 'xa': 1})
doan(bd('ve-tay'), bd('ket'), VONG_SANG, {'pad': 1, 'bass': 1, 'gay': .7})
doan(bd('ket'), T - 5.5, VONG_SANG, {'pad': 1, 'bass': 1, 'gay': .8, 'trong': 1})
# hợp âm kết: D ngân dài
t_ket = T - 5.5
them(pad(HOP['D'] + [62], 5.5, 1), t_ket, .6)
them(bass(50, 5.5), t_ket, .3)
for j, m in enumerate([62, 66, 69, 74]): them(gay(m, 2.5), t_ket + j * .12, .18, pan=(j - 1.5) / 3)

# tiếng vang đơn giản (hai đường trễ phản hồi), lọc tối bớt, chuẩn hóa, mở/đóng
def vang(x, tre, fb, mix):
    d = int(tre * SR); y = x.copy()
    for i in range(1, 6):
        if d * i >= len(x): break
        y[d * i:] += x[:-d * i] * (fb ** i)
    return x * (1 - mix) + y * mix
trai = vang(trai, .31, .35, .35); phai = vang(phai, .37, .35, .35)
trai = loc_thap(trai, 7000); phai = loc_thap(phai, 7000)
t = np.arange(N) / SR
env = np.minimum(1, t / 2.0) * np.minimum(1, (T - t) / 3.0)
st = np.stack([trai * env, phai * env], axis=1)
st = st / np.max(np.abs(st)) * .85
with wave.open(str(RA / 'nhac.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('Đã tạo', RA / 'nhac.wav', f'{T:.1f}s')
