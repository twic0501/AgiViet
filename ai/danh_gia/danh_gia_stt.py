"""Đo nhận dạng giọng nói (STT) và chuỗi đầu-cuối STT -> trích xuất luật.

GIỚI HẠN QUAN TRỌNG: âm thanh được TỔNG HỢP bằng Piper (giọng vi_VN-vais1000, giọng đọc chuẩn,
không phải nông dân miền Tây), thêm bản có tiếng ồn. Số đo ở đây là CẬN TRÊN lạc quan, không
thay được thu âm thật.

Chạy bằng venv STT (Python 3.11, có faster-whisper + piper):
  .venv-stt/bin/python -m danh_gia.danh_gia_stt
"""
from __future__ import annotations

import datetime as dt
import json
import re
import statistics
import subprocess
import sys
import time
import unicodedata
import wave
from pathlib import Path

GOC = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from agiviet_ai.trich_xuat import trich  # noqa: E402
from danh_gia.danh_gia_trich_xuat import TRUONG, so_sanh  # noqa: E402

AM = GOC / "ket_qua" / "am_thanh_tong_hop"
GIONG = GOC / "mo_hinh" / "piper" / "vi_VN-vais1000-medium.onnx"


def chuan(s: str) -> list[str]:
    s = unicodedata.normalize("NFC", s.lower())
    s = re.sub(r"[^\w\s]", " ", s)
    return s.split()


def wer(ref: str, hyp: str) -> float:
    r, h = chuan(ref), chuan(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


def tong_hop(cau: list[dict]) -> None:
    from piper import PiperVoice
    AM.mkdir(parents=True, exist_ok=True)
    v = PiperVoice.load(str(GIONG))
    for c in cau:
        sach = AM / f"{c['id']}_sach.wav"
        on = AM / f"{c['id']}_on.wav"
        if sach.exists() and on.exists():
            continue
        tho = AM / f"{c['id']}_tho.wav"
        with wave.open(str(tho), "wb") as w:
            v.synthesize_wav(c["van_ban"], w)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tho), "-ar", "16000", "-ac", "1", str(sach)], check=True)
        # tiếng ồn hồng ~ SNR 10 dB (mô phỏng ngoài vườn, quạt máy), cộng nén điện thoại 8 kHz
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(sach), "-f", "lavfi", "-i",
                        "anoisesrc=color=pink:amplitude=0.06:seed=7", "-filter_complex",
                        "[0][1]amix=inputs=2:duration=first:weights=1 1,aresample=8000,aresample=16000",
                        "-ar", "16000", "-ac", "1", str(on)], check=True)
        tho.unlink()


def main() -> None:
    from faster_whisper import WhisperModel
    cau = [json.loads(x) for x in (GOC / "du_lieu" / "cau_noi_mau.jsonl").read_text().splitlines() if x.strip()]
    tong_hop(cau)
    ket = {}
    goi_y = "Nông dân miền Tây bán xoài cát Chu, chanh không hạt, tôm thẻ, lúa tươi, sầu riêng, bưởi da xanh, thanh long, cá tra; tấn, tạ, ký, nghìn một ký."
    for ten_mh in sys.argv[1:] or ["small", "large-v3-turbo"]:
        t0 = time.perf_counter()
        m = WhisperModel(ten_mh, device="cuda", compute_type="float16")
        tai_ms = (time.perf_counter() - t0) * 1000
        for kieu in ("sach", "on"):
            for dung_goi_y in (False, True):
                ws, tg, dong, dem = [], [], [], {"dung": 0, "tong": 0, "tien_sai": 0, "tien_tong": 0}
                for c in cau:
                    f = AM / f"{c['id']}_{kieu}.wav"
                    t1 = time.perf_counter()
                    seg, info = m.transcribe(str(f), language="vi", beam_size=5, vad_filter=False,
                                             condition_on_previous_text=False,
                                             initial_prompt=goi_y if dung_goi_y else None)
                    hyp = " ".join(s.text.strip() for s in seg)
                    tg.append((time.perf_counter() - t1) * 1000)
                    w = wer(c["van_ban"], hyp)
                    ws.append(w)
                    kq = trich(hyp, dt.date.fromisoformat(c["hom_nay"]), che_do="luat")
                    ph = kq.phang()
                    loi = {}
                    for t in TRUONG:
                        g = kq.truong.get(t)
                        s = so_sanh(t, c["dung"].get(t), ph.get(t), g.nguon if g else None)
                        if s == "bo_qua":
                            continue
                        dem["tong"] += 1
                        dem["dung"] += s == "dung"
                        if t in ("gia_mong_muon", "gia_thap_nhat") and c["dung"].get(t) is not None:
                            dem["tien_tong"] += 1
                            dem["tien_sai"] += s in ("sai", "bia")
                        if s != "dung":
                            loi[t] = [s, c["dung"].get(t), ph.get(t)]
                    dong.append({"id": c["id"], "goc": c["van_ban"], "nghe": hyp, "wer": round(w, 3), "loi_truong": loi})
                khoa = f"{ten_mh}|{kieu}|{'goi_y' if dung_goi_y else 'khong_goi_y'}"
                ket[khoa] = {
                    "wer_trung_binh": round(statistics.mean(ws), 4),
                    "cau_wer_0": sum(1 for x in ws if x == 0),
                    "ty_le_o_truong_dung_sau_stt": round(dem["dung"] / dem["tong"], 4),
                    "gia_sai_hoac_bia": f"{dem['tien_sai']}/{dem['tien_tong']}",
                    "do_tre_ms": {"trung_vi": round(statistics.median(tg)), "p95": round(sorted(tg)[int(.95 * (len(tg) - 1))])},
                    "tai_mo_hinh_ms": round(tai_ms),
                    "chi_tiet": dong,
                }
                print(khoa, {k: v for k, v in ket[khoa].items() if k != "chi_tiet"}, flush=True)
        del m
    out = GOC / "ket_qua" / "stt.json"
    ket["_ghi_chu"] = "Âm thanh tổng hợp Piper vi_VN-vais1000-medium; GPU RTX 4080 Laptop, float16; đo " + dt.datetime.now().isoformat(timespec="seconds")
    out.write_text(json.dumps(ket, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
