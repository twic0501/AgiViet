"""Ghép hình (hinh.mp4) + lời dẫn (cau-XX.mp3 đúng mốc) + nhạc nền (nhac.wav, tự hạ khi có lời) → mp4.
Chạy: python video/ghep.py <thư mục có lich.json> <tệp ra.mp4>
"""
import json, subprocess, sys
from pathlib import Path

RA = Path(sys.argv[1]); DICH = Path(sys.argv[2])
L = json.loads((RA / 'lich.json').read_text())
vao = ['-i', str(RA / 'hinh.mp4'), '-i', str(RA / 'nhac.wav')]
loc, nhan = [], []
k = 2
for c in L['canh']:
    for cau in c['cau']:
        ms = int(round((c['bat_dau'] + cau['bd']) * 1000))
        vao += ['-i', str(RA / cau['tep'])]
        loc.append(f'[{k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{k}]')
        nhan.append(f'[v{k}]'); k += 1
T = L['tong_giay']
loc.append(f"{''.join(nhan)}amix=inputs={len(nhan)}:normalize=0,apad,atrim=0:{T}[loi]")
loc.append('[loi]asplit=2[loi1][loi2]')
loc.append(f'[1:a]volume=0.30,atrim=0:{T}[nhac]')
loc.append('[nhac][loi1]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=500:makeup=1[nhacha]')
loc.append(f'[nhacha][loi2]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:{T}[tieng]')
lenh = ['ffmpeg', '-y', '-loglevel', 'error', *vao, '-filter_complex', ';'.join(loc), '-map', '0:v', '-map', '[tieng]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(T), '-movflags', '+faststart', str(DICH)]
subprocess.run(lenh, check=True)
print('Đã xuất', DICH)
