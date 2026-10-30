"""Chuỗi dự phòng nhà cung cấp LLM, không gọi mạng thật. Chạy: .venv/bin/python -m unittest tests.test_nha_cung_cap"""
import json
import unittest

import httpx

from agiviet_ai.nha_cung_cap import CAU_SOAN_SAN, LoiNhaCungCap, NhaCungCap

KHOA = {"GEMINI_API_KEY": "g-khoa-bi-mat", "NVIDIA_API_KEY": "n-khoa-bi-mat"}


def may(xu_ly):
    goi = []

    def h(req):
        goi.append(req)
        return xu_ly(req)
    return NhaCungCap(KHOA, httpx.Client(transport=httpx.MockTransport(h))), goi


def gemini_ok(text):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})


def nim_ok(text):
    return httpx.Response(200, json={"choices": [{"message": {"content": text}}]})


class ChuoiDuPhong(unittest.TestCase):
    def test_gemini_tra_loi_truoc(self):
        n, goi = may(lambda r: gemini_ok("Chào bác"))
        kq = n.goi("hệ thống", "xin chào")
        self.assertEqual((kq.van_ban, kq.nguon), ("Chào bác", "gemini:gemini-flash-lite-latest"))
        self.assertEqual(len(goi), 1)

    def test_gemini_loi_thi_qua_nim_gemma(self):
        n, goi = may(lambda r: httpx.Response(429) if "googleapis" in str(r.url) else nim_ok("Dạ"))
        kq = n.goi("hệ thống", "xin chào")
        self.assertEqual(kq.nguon, "nim:google/gemma-4-31b-it")
        self.assertEqual(json.loads(goi[1].content)["model"], "google/gemma-4-31b-it")
        self.assertIn("HTTP 429", kq.loi[0])

    def test_hong_het_truc_tiep_tra_cau_soan_san(self):
        n, _ = may(lambda r: httpx.Response(503))
        kq = n.goi("hệ thống", "xin chào")
        self.assertEqual((kq.van_ban, kq.nguon), (CAU_SOAN_SAN, "soan_san"))

    def test_hong_het_viec_may_thi_bao_loi(self):
        n, _ = may(lambda r: httpx.Response(500))
        with self.assertRaises(LoiNhaCungCap):
            n.goi("hệ thống", "phân loại", loai="may")

    def test_qua_gio_va_tra_rong_deu_rot_bac(self):
        def h(r):
            if "googleapis" in str(r.url):
                raise httpx.ReadTimeout("chậm", request=r)
            return nim_ok("")
        n, _ = may(h)
        self.assertEqual(n.goi("hệ thống", "x").nguon, "soan_san")

    def test_soan_dung_deepseek_truoc(self):
        n, goi = may(lambda r: nim_ok("bản nháp"))
        kq = n.goi("hệ thống", "soạn", loai="soan")
        self.assertEqual(kq.nguon, "nim:deepseek-ai/deepseek-v4.1-flash")

    def test_viec_may_dung_nemotron_khi_gemini_loi(self):
        n, goi = may(lambda r: httpx.Response(500) if "googleapis" in str(r.url) else nim_ok("{}"))
        self.assertEqual(n.goi("h", "x", loai="may").nguon, "nim:nvidia/nemotron-3.5-lightning-30b-a3b")

    def test_nghi_bac_loi_lien_tiep(self):
        n, goi = may(lambda r: httpx.Response(500) if "googleapis" in str(r.url) else nim_ok("ok"))
        for _ in range(3):
            n.goi("h", "x")
        gemini = [g for g in goi if "googleapis" in str(g.url)]
        self.assertEqual(len(gemini), 2)   # lần 3 bỏ qua Gemini vì đang nghỉ

    def test_khong_lo_khoa_trong_loi(self):
        n, _ = may(lambda r: httpx.Response(401, text="bad key g-khoa-bi-mat"))
        kq = n.goi("h", "x")
        self.assertFalse(any("khoa-bi-mat" in l for l in kq.loi))

    def test_khoa_gui_dung_header(self):
        n, goi = may(lambda r: httpx.Response(500) if "googleapis" in str(r.url) else nim_ok("ok"))
        n.goi("h", "x")
        self.assertEqual(goi[0].headers["x-goog-api-key"], "g-khoa-bi-mat")
        self.assertNotIn("khoa", str(goi[0].url))
        self.assertEqual(goi[1].headers["authorization"], "Bearer n-khoa-bi-mat")


if __name__ == "__main__":
    unittest.main()
