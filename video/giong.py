"""Tạo lời dẫn từ video/kich-ban.json bằng edge-tts, rồi lập thời gian biểu cho cả video.

Chạy: python video/giong.py <thư mục ra>   (cần: pip install edge-tts; ffprobe)
Ra: <thư mục>/cau-XX.mp3 và <thư mục>/lich.json: mỗi cảnh có bắt đầu, độ dài; mỗi câu có mốc bắt đầu,
độ dài và mốc từng từ (để hiện phụ đề đúng nhịp). Tổng độ dài đúng bằng tong_giay trong kịch bản.
"""
import asyncio, json, subprocess, sys
from pathlib import Path
import edge_tts

GOC = Path(__file__).resolve().parent
RA = Path(sys.argv[1] if len(sys.argv) > 1 else GOC / 'ra')
RA.mkdir(parents=True, exist_ok=True)
kb = json.loads((GOC / 'kich-ban.json').read_text())

def dai(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]).decode())

async def doc(i, cau):
    for lan in range(4):                      # dịch vụ đôi khi trả rỗng: thử lại
        try:
            return await doc1(i, cau)
        except edge_tts.exceptions.NoAudioReceived:
            print(f'câu {i}: chưa nhận được âm thanh, thử lại', file=sys.stderr)
            await asyncio.sleep(2 + lan * 3)
    raise SystemExit(f'Không đọc được câu {i}: {cau["t"]}')

async def doc1(i, cau):
    g = kb['giong'][cau['g']]
    tep = RA / f'cau-{i:02d}.mp3'
    tu = []
    c = edge_tts.Communicate(cau['t'], g['voice'], rate=cau.get('toc', g['rate']), pitch=g['pitch'], boundary='WordBoundary')
    with open(tep, 'wb') as f:
        async for m in c.stream():
            if m['type'] == 'audio':
                f.write(m['data'])
            elif m['type'] == 'WordBoundary':
                tu.append({'bd': m['offset'] / 1e7, 'd': m['duration'] / 1e7, 'chu': m['text']})
    return tep, tu

async def chinh():
    k = 0
    for canh in kb['canh']:
        for cau in canh['cau']:
            tep, tu = await doc(k, cau)
            cau.update(tep=tep.name, dai=round(dai(tep), 3), tu=tu)
            k += 1
    # Lập lịch: trong cảnh, câu nối nhau cách 0,45 giây; cảnh dài ít nhất toi_thieu; phần dư chia đều cho các cảnh
    nghi = 0.45
    for canh in kb['canh']:
        t = 0.0
        for cau in canh['cau']:
            t += cau.get('tre', 0.6 if t == 0 else nghi)
            cau['bd'] = round(t, 3)
            t += cau['dai']
        canh['can'] = max(canh['toi_thieu'], t + 0.8)
    du = kb['tong_giay'] - sum(c['can'] for c in kb['canh'])
    for c in kb['canh']: print(f"{c['id']:<14} cần {c['can']:6.2f}s (tối thiểu {c['toi_thieu']}, lời {sum(x['dai'] for x in c['cau']):5.1f}s)")
    if du < 0:
        print(f'LỜI DẪN DÀI HƠN {kb["tong_giay"]}s: thừa {-du:.1f}s, cần rút bớt câu', file=sys.stderr)
        sys.exit(1)
    them = du / len(kb['canh'])
    t0 = 0.0
    nua_phach = 60 / 92 / 2          # nhạc nền 92 nhịp/phút (video/nhac.py)
    for canh in kb['canh']:
        canh['bat_dau'] = round(t0, 3)
        canh['dai'] = round(canh['can'] + them, 3)
        # Canh đầu câu vào nửa phách (chỉ lùi, không chồng câu trước, không tràn cảnh)
        het = 0.0
        for cau in canh['cau']:
            tuyet = t0 + max(cau['bd'], het + 0.2)
            canh_phach = -(-tuyet // nua_phach) * nua_phach
            bd = canh_phach - t0
            if bd + cau['dai'] < canh['dai'] - 0.3:
                cau['bd'] = round(bd, 3)
            het = cau['bd'] + cau['dai']
        t0 += canh['dai']
        print(f"{canh['id']:<14} {canh['bat_dau']:7.2f}s  dài {canh['dai']:6.2f}s  (lời {sum(c['dai'] for c in canh['cau']):5.1f}s)")
    (RA / 'lich.json').write_text(json.dumps(kb, ensure_ascii=False, indent=1))
    print('Tổng', round(t0, 2), 's')

asyncio.run(chinh())
