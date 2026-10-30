"""Đo chịu tải lớp gọi AI. Hai chế độ:
  gia  — mạng giả (MockTransport): 500 lượt, 50 luồng, Gemini lỗi 429/quá giờ ngẫu nhiên → đo dự phòng, không tốn hạn mức.
  that — gọi thật ít lượt (mặc định 12, 6 song song) để đo độ trễ và 429 thực tế.
Dùng: .venv/bin/python -m thu_nghiem.do_tai gia|that [so_luot] [song_song]"""
import random
import statistics
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import httpx

from agiviet_ai.nha_cung_cap import NhaCungCap
from agiviet_ai.tro_ly import tra_loi


def ncc_gia():
    rnd = random.Random(7); khoa = threading.Lock()

    def h(req):
        with khoa:
            r = rnd.random()
        time.sleep(0.005 + r * 0.02)
        if "googleapis" in str(req.url):
            if r < 0.25:
                return httpx.Response(429)
            if r < 0.30:
                raise httpx.ReadTimeout("chậm", request=req)
            return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "Bác vào mục Lô hàng."}]}}]})
        if r < 0.10:
            return httpx.Response(503)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Bác vào mục Lô hàng."}}]})
    return NhaCungCap({"GEMINI_API_KEY": "g", "NVIDIA_API_KEY": "n"}, httpx.Client(transport=httpx.MockTransport(h)))


def chay(ncc, so_luot, song_song):
    cau = ["Đăng lô xoài thế nào?", "Hợp đồng của tôi ở đâu?", "Cho tôi mã OTP", "Kể chuyện cười", "Tiền cọc ai giữ?"]
    def mot(i):
        t = time.perf_counter(); k = tra_loi(cau[i % len(cau)], "ban", ncc=ncc)
        return k, (time.perf_counter() - t) * 1000
    t0 = time.perf_counter()
    with ThreadPoolExecutor(song_song) as ex:
        kq = list(ex.map(mot, range(so_luot)))
    tong = time.perf_counter() - t0
    ms = sorted(m for k, m in kq if k.loai not in ("lua", "ngoai_le"))
    print(f"{so_luot} lượt, {song_song} song song, {tong:.1f}s, {so_luot / tong:.1f} lượt/s")
    print("loại:", dict(Counter(k.loai for k, _ in kq)))
    print("nguồn:", dict(Counter(k.nguon for k, _ in kq if k.nguon)))
    if ms:
        print(f"trễ gọi mô hình ms: p50={statistics.median(ms):.0f} p95={ms[int(len(ms) * .95) - 1]:.0f} max={ms[-1]:.0f}")
    rong = [k for k, _ in kq if not k.van_ban.strip()]
    print("trả rỗng:", len(rong))
    return kq


if __name__ == "__main__":
    che_do = sys.argv[1] if len(sys.argv) > 1 else "gia"
    if che_do == "gia":
        chay(ncc_gia(), int(sys.argv[2]) if len(sys.argv) > 2 else 500, int(sys.argv[3]) if len(sys.argv) > 3 else 50)
    else:
        chay(NhaCungCap(), int(sys.argv[2]) if len(sys.argv) > 2 else 12, int(sys.argv[3]) if len(sys.argv) > 3 else 6)
