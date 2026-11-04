"""/tts gom yêu cầu trùng đang chạy: 4 người cùng xin một câu chưa có trong bộ nhớ → chỉ gọi nhà cung cấp 1 lần."""
import os
import threading
import time
import unittest
from unittest import mock

os.environ.setdefault("AGV_STT_TAT", "1")
os.environ.pop("AGV_AI_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from agiviet_ai import dich_vu  # noqa: E402
from agiviet_ai.nha_cung_cap import NhaCungCap  # noqa: E402

WAV = b"RIFF" + b"\0" * 40


class GomTts(unittest.TestCase):
    def test_bon_yeu_cau_trung_chi_goi_mot_lan(self):
        dem = {"n": 0}

        def cham(self, van_ban, *a, **k):
            dem["n"] += 1
            time.sleep(0.4)  # nhà cung cấp chậm: các yêu cầu khác tới trong lúc này
            return WAV

        c = TestClient(dich_vu.app)
        cau = f"Câu thử gom {time.time()}"
        kq = []
        with mock.patch.object(NhaCungCap, "doc_thanh_tieng", cham):
            ls = [threading.Thread(target=lambda: kq.append(c.post("/tts", json={"van_ban": cau}).status_code)) for _ in range(4)]
            [t.start() for t in ls]
            [t.join() for t in ls]
        self.assertEqual(kq, [200] * 4)
        self.assertEqual(dem["n"], 1)

    def test_cau_khac_nhau_khong_chan_nhau(self):
        dem = {"n": 0}

        def nhanh(self, van_ban, *a, **k):
            dem["n"] += 1
            return WAV

        c = TestClient(dich_vu.app)
        with mock.patch.object(NhaCungCap, "doc_thanh_tieng", nhanh):
            for i in range(3):
                self.assertEqual(c.post("/tts", json={"van_ban": f"Câu riêng {i} {time.time()}"}).status_code, 200)
        self.assertEqual(dem["n"], 3)


if __name__ == "__main__":
    unittest.main()
