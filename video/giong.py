"""Tạo lời dẫn từ video/kich-ban.json bằng VieNeu-TTS v3 Turbo (chạy trên máy, không gửi đi đâu),
rồi lập thời gian biểu cho cả video.

Chạy: python video/giong.py <thư mục ra>   (cần: pip install vieneu; ffmpeg/ffprobe)
Ra: <thư mục>/cau-XX.wav và <thư mục>/lich.json: mỗi cảnh có bắt đầu, độ dài; mỗi câu có mốc bắt đầu, độ dài
và mốc từng chữ (ước lượng: tách cụm theo dấu câu, khớp vào các khoảng lặng thật trong tiếng, chia đều theo
số tiếng trong cụm). Tổng độ dài đúng bằng tong_giay; đầu câu canh vào nửa phách nhạc nền (92 nhịp/phút).
"""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

GOC = Path(__file__).resolve().parent
RA = Path(sys.argv[1] if len(sys.argv) > 1 else GOC / 'ra')
RA.mkdir(parents=True, exist_ok=True)
kb = json.loads((GOC / 'kich-ban.json').read_text())
MO_HINH = Path.home() / '.cache' / 'vieneu-local'


def nap_vieneu():
    # onnxruntime mới từ chối tệp .data nằm qua liên kết tượng trưng của bộ đệm HuggingFace:
    # tải mô hình về thư mục thật rồi mới nạp.
    from huggingface_hub import snapshot_download
    from vieneu._v3_turbo_engine import onnx_runtime_lite as orl
    def tai(self, repo, files, subfolder=None, *a, **k):
        dich = MO_HINH / repo.replace('/', '__')
        snapshot_download(repo, local_dir=dich, allow_patterns=[(f'{subfolder}/' if subfolder else '') + f for f in files])
        return dich / subfolder if subfolder else dich
    orl.OnnxV3LiteEngine._fetch = tai
    from vieneu import Vieneu
    return Vieneu()


def cat_lang(a, sr, nguong=0.012):
    """Bỏ khoảng lặng đầu/cuối (giữ 60 ms)."""
    muc = np.convolve(np.abs(a), np.ones(480) / 480, mode='same')
    co = np.where(muc > nguong)[0]
    if not len(co): return a
    d, c = max(0, co[0] - int(.06 * sr)), min(len(a), co[-1] + int(.06 * sr))
    return a[d:c]


def khoang_lang(a, sr, nguong=0.012, toi_thieu=0.14):
    """Các khoảng lặng giữa câu: [(bắt đầu, kết thúc)] theo giây."""
    muc = np.convolve(np.abs(a), np.ones(480) / 480, mode='same') < nguong
    ds, i, n = [], 0, len(muc)
    while i < n:
        if muc[i]:
            j = i
            while j < n and muc[j]: j += 1
            if (j - i) / sr >= toi_thieu and i > 0 and j < n: ds.append((i / sr, j / sr))
            i = j
        else: i += 1
    return ds


def moc_tu(text, dai, lang):
    """Ước lượng mốc từng chữ: cụm theo dấu câu, ranh giới cụm khớp vào khoảng lặng gần nhất."""
    chu = text.split()
    cum, ht = [], []
    for w in chu:
        ht.append(w)
        if re.search(r'[.,?!;:]$', w): cum.append(ht); ht = []
    if ht: cum.append(ht)
    tong = sum(len(c) for c in cum)
    # ranh giới dự kiến theo tỉ lệ số tiếng, rồi kéo về khoảng lặng gần nhất
    ranh, da_tinh = [], 0
    con_lang = list(lang)
    for c in cum[:-1]:
        da_tinh += len(c)
        du = dai * da_tinh / tong
        if con_lang:
            k = min(range(len(con_lang)), key=lambda i: abs((con_lang[i][0] + con_lang[i][1]) / 2 - du))
            if abs((con_lang[k][0] + con_lang[k][1]) / 2 - du) < 1.2:
                ranh.append(con_lang.pop(k)); continue
        ranh.append((du, du))
    ranh.sort()
    ds, bd = [], 0.0
    for i, c in enumerate(cum):
        kt = ranh[i][0] if i < len(ranh) else dai
        buoc = (kt - bd) / len(c)
        for j, w in enumerate(c):
            ds.append({'bd': round(bd + j * buoc, 3), 'd': round(buoc * .92, 3), 'chu': re.sub(r'[.,?!;:“”"]', '', w)})
        bd = ranh[i][1] if i < len(ranh) else dai
    return ds


def chinh():
    import os
    giu = os.environ.get('GIU') == '1'          # GIU=1: dùng lại tệp giọng đã tạo, chỉ lập lại lịch
    v = None if giu else nap_vieneu()
    sr = 48000 if giu else v.sample_rate
    k = 0
    for canh in kb['canh']:
        for cau in canh['cau']:
            g = kb['giong'][cau['g']]
            tep = RA / f'cau-{k:02d}.wav'
            if giu:
                with wave.open(str(tep)) as w:
                    a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32767
                dai = len(a) / sr
                cau.update(tep=tep.name, dai=round(dai, 3), tu=moc_tu(cau['t'], dai, khoang_lang(a, sr)))
                k += 1
                continue
            a = np.asarray(v.infer(cau['t'], voice=g['voice']), dtype=np.float32)
            a = cat_lang(a, sr)
            tep = RA / f'cau-{k:02d}.wav'
            with wave.open(str(tep), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
                w.writeframes((np.clip(a, -1, 1) * 32767).astype('<i2').tobytes())
            nhip = g.get('nhip', 1.0)          # < 1: đọc chậm lại (giữ cao độ)
            if nhip != 1.0:
                tam = tep.with_suffix('.tam.wav')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tep), '-af', f'atempo={nhip}', str(tam)], check=True)
                tam.replace(tep)
                with wave.open(str(tep)) as w:
                    a = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32767
            dai = len(a) / sr
            cau.update(tep=tep.name, dai=round(dai, 3), tu=moc_tu(cau['t'], dai, khoang_lang(a, sr)))
            print(f'câu {k:02d} {dai:5.2f}s  {cau["t"][:60]}')
            k += 1
    # Lập lịch: câu nối nhau (nghỉ 'tre' hoặc 0,45 s); cảnh dài ít nhất toi_thieu; phần dư chia đều
    for canh in kb['canh']:
        t = 0.0
        for cau in canh['cau']:
            t += cau.get('tre', 0.6 if t == 0 else 0.45)
            cau['bd'] = round(t, 3)
            t += cau['dai']
        canh['can'] = max(canh['toi_thieu'], t + canh.get('duoi', 0.8))
    du = kb['tong_giay'] - sum(c['can'] for c in kb['canh'])
    for c in kb['canh']: print(f"{c['id']:<14} cần {c['can']:6.2f}s (tối thiểu {c['toi_thieu']}, lời {sum(x['dai'] for x in c['cau']):5.1f}s)")
    if du < 0:
        print(f'LỜI DẪN DÀI HƠN {kb["tong_giay"]}s: thừa {-du:.1f}s, cần rút bớt câu', file=sys.stderr)
        sys.exit(1)
    them = du / len(kb['canh'])
    t0 = 0.0
    nua_phach = 60 / 92 / 2
    for canh in kb['canh']:
        canh['bat_dau'] = round(t0, 3)
        canh['dai'] = round(canh['can'] + them, 3)
        # Rải lời đều trong cảnh: thời gian dư chia vào các khoảng nghỉ (theo tỉ lệ 'tre'), mỗi khoảng tối đa 3,2 s
        nghi = [c.get('tre', 0.6 if i == 0 else 0.45) for i, c in enumerate(canh['cau'])]
        du_canh = canh['dai'] - canh.get('duoi', 0.8) - sum(c['dai'] for c in canh['cau']) - sum(nghi)
        if du_canh > 0:
            tong_nghi = sum(nghi)
            nghi = [min(3.2, n + du_canh * n / tong_nghi) for n in nghi]
        t = 0.0
        for c, n in zip(canh['cau'], nghi):
            t += n; c['bd'] = round(t, 3); t += c['dai']
        het = 0.0
        for cau in canh['cau']:
            tuyet = t0 + max(cau['bd'], het + 0.2)
            bd = -(-tuyet // nua_phach) * nua_phach - t0
            if bd + cau['dai'] < canh['dai'] - 0.3: cau['bd'] = round(bd, 3)
            het = cau['bd'] + cau['dai']
        t0 += canh['dai']
        print(f"{canh['id']:<14} {canh['bat_dau']:7.2f}s  dài {canh['dai']:6.2f}s")
    (RA / 'lich.json').write_text(json.dumps(kb, ensure_ascii=False, indent=1))
    print('Tổng', round(t0, 2), 's')


chinh()
