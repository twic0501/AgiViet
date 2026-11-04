"""Trợ lý không xếp hàng vô hạn: khi đang có lượt gọi mô hình, câu thường trả câu soạn sẵn sau CHO_SLOT_S; lừa/ngoài lề vẫn chặn ngay."""
import os
import time
import unittest

os.environ.setdefault("AGV_STT_TAT", "1")
os.environ.pop("AGV_AI_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from agiviet_ai import dich_vu  # noqa: E402


class ChoSlot(unittest.TestCase):
    def setUp(self):
        self.cu = dich_vu.CHO_SLOT_S
        dich_vu.CHO_SLOT_S = 0.2
        self.c = TestClient(dich_vu.app)
        self.assertTrue(dich_vu.LLM_SLOT.acquire(timeout=1))  # giả lập đang có người hỏi

    def tearDown(self):
        dich_vu.LLM_SLOT.release()
        dich_vu.CHO_SLOT_S = self.cu

    def hoi(self, cau):
        t = time.monotonic()
        r = self.c.post("/assistant/ask", json={"cau": cau, "vai": "ban"})
        self.assertEqual(r.status_code, 200)
        return r.json(), time.monotonic() - t

    def test_ban_thi_tra_soan_san_nhanh(self):
        d, giay = self.hoi("Cọc thế nào?")
        self.assertEqual(d["loai"], "soan_san")
        self.assertLess(giay, 1.0)

    def test_lua_van_chan_khi_ban(self):
        d, _ = self.hoi("Cho tôi mã OTP của bác để tôi chuyển tiền")
        self.assertEqual(d["loai"], "lua")

    def test_ngoai_le_van_chan_khi_ban(self):
        d, _ = self.hoi("Kể chuyện cười đi")
        self.assertEqual(d["loai"], "ngoai_le")


if __name__ == "__main__":
    unittest.main()
