"""Thu sẵn giọng đọc cho nút Nghe của app Nhà sản xuất bằng VieNeu-TTS (chạy trên máy).

Chạy: python scripts/tao-giong-app.py <cau-doc.json> <thư mục ra> [giọng]
  cau-doc.json: từ `node scripts/gom-cau-doc.mjs`
  thư mục ra  : ~/fe-nongdan/assets/giong  → <mã>.mp3 + ds.json (danh sách mã có sẵn)
  giọng       : tên giọng VieNeu, mặc định "Thục Đoan" (nữ miền Nam, ấm, chậm rãi)
Chỉ thu câu mới hoặc câu đổi chữ/đổi giọng (so với ds.json cũ).
"""
import json, re, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np

VAO, RA = Path(sys.argv[1]), Path(sys.argv[2])
GIONG = sys.argv[3] if len(sys.argv) > 3 else 'Thục Đoan'
NHIP = 0.96          # chậm nhẹ cho dễ nghe
RA.mkdir(parents=True, exist_ok=True)
MO_HINH = Path.home() / '.cache' / 'vieneu-local'

# Chữ viết tắt → cách đọc (chỉ dùng khi tạo tiếng, không đổi chữ trên app)
DOC = [(r'\bHTX\b', 'hợp tác xã'), (r'\bSĐT\b', 'số điện thoại'), (r'\bOTP\b', 'ô tê pê'), (r'đ/kg', ' đồng một ký'),
       (r'°Bx', ' độ ngọt'), (r'\bHĐ\b', 'mã'), (r'\bHT\b', 'số'), (r'\bkg\b', 'ký'), (r'\bAI\b', 'trợ lý tự động')]
def cach_doc(t):
    for a, b in DOC: t = re.sub(a, b, t)
    return re.sub(r'\s+', ' ', t).strip()


def nap():
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
    muc = np.convolve(np.abs(a), np.ones(480) / 480, mode='same')
    co = np.where(muc > nguong)[0]
    return a if not len(co) else a[max(0, co[0] - int(.08 * sr)): co[-1] + int(.15 * sr)]


cu = {}
if (RA / 'ds.json').exists():
    d = json.loads((RA / 'ds.json').read_text())
    if d.get('giong') == GIONG: cu = d.get('cau', {})
ds = json.loads(VAO.read_text())
can = [c for c in ds if cu.get(c['id']) != c['t'] or not (RA / f"{c['id']}.mp3").exists()]
print(f'{len(ds)} câu, cần thu {len(can)} · giọng {GIONG}', flush=True)
v = nap() if can else None
for i, c in enumerate(can):
    a = np.asarray(v.infer(cach_doc(c['t']), voice=GIONG), dtype=np.float32)
    a = cat_lang(a, v.sample_rate)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tam:
        with wave.open(tam.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(v.sample_rate)
            w.writeframes((np.clip(a, -1, 1) * 32767).astype('<i2').tobytes())
        # chậm nhẹ, chuẩn hóa độ lớn cho điện thoại, mp3 đơn kênh 24 kHz 48 kbps
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tam.name, '-af', f'atempo={NHIP},highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=24000',
                        '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', str(RA / f"{c['id']}.mp3")], check=True)
    cu[c['id']] = c['t']
    print(f'{i + 1}/{len(can)} {c["id"]} {len(a) / v.sample_rate:5.1f}s  {c["t"][:50]}', flush=True)
    (RA / 'ds.json').write_text(json.dumps({'giong': GIONG, 'cau': cu}, ensure_ascii=False))
# bỏ câu không còn dùng
con = {c['id'] for c in ds}
for k in [k for k in cu if k not in con]:
    cu.pop(k); (RA / f'{k}.mp3').unlink(missing_ok=True)
(RA / 'ds.json').write_text(json.dumps({'giong': GIONG, 'cau': cu}, ensure_ascii=False))
print('Xong:', len(cu), 'câu có giọng thu sẵn')
