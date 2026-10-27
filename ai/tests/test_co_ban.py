"""Kiểm thử bất biến an toàn. Chạy: .venv/bin/python -m unittest discover -s tests -t ."""
import datetime as dt
import json
import unittest

from agiviet_ai.so_noi import tim_cum_so
from agiviet_ai.trich_xuat import trich
from danh_gia.danh_gia_ghep import chay, tinh_huong

HN = dt.date(2026, 10, 25)


def so(cau):
    return [(c.kieu, c.gia_tri) for c in tim_cum_so(cau)[1]]


class SoNoi(unittest.TestCase):
    def test_cach_noi(self):
        self.assertEqual(so("hai tấn rưỡi"), [("luong", 2500)])
        self.assertEqual(so("ba chục ký"), [("luong", 30)])
        self.assertEqual(so("hai tấn ba"), [("luong", 2300)])
        self.assertEqual(so("ba tạ rưỡi"), [("luong", 350)])
        self.assertEqual(so("hai mươi mốt nghìn năm trăm"), [("tien", 21500)])
        self.assertEqual(so("sáu triệu rưỡi một tấn")[0][1], 6_500_000)

    def test_khong_doan_khi_mo_ho(self):
        c = tim_cum_so("hai ba tấn")[1][0]
        self.assertTrue(c.mo_ho)

    def test_chuoi_la_khong_vo(self):
        tim_cum_so("ngày 20.8.10 giao")  # không được ném lỗi


class AnToanGiongNoi(unittest.TestCase):
    def test_tien_luon_phai_xac_nhan(self):
        kq = trich("xoài cát chu loại một hai tấn giá hai lăm nghìn thấp nhất hai mốt", HN, che_do="luat")
        self.assertIn("gia_mong_muon", kq.can_xac_nhan)
        self.assertIn("gia_thap_nhat", kq.can_xac_nhan)
        self.assertIn("chưa đăng", kq.cau_doc_lai)

    def test_luong_mo_ho_khong_bia(self):
        kq = trich("có mấy chục ký xoài dạt", HN, che_do="luat")
        self.assertIsNone(kq.phang().get("luong_kg"))

    def test_ngoai_pham_vi(self):
        kq = trich("bán heo hơi hai tạ", HN, che_do="luat")
        self.assertIsNone(kq.phang().get("mat_hang"))
        self.assertIn("chưa mở", kq.cau_hoi_tiep)


class GhepKhongTheoGia(unittest.TestCase):
    def test_khong_lo_gia_va_tat_dinh(self):
        t = tinh_huong()[0][0]
        a, b = chay(t["nc"], t["lo"]), chay(t["nc"], t["lo"])
        self.assertEqual(a, b)
        a.pop("_loai_bo")
        s = json.dumps(a)
        for x in t["lo"]:
            self.assertNotIn(f": {x.gia_thap_nhat_kin},", s)
        self.assertNotIn("gia_thap_nhat", s)


if __name__ == "__main__":
    unittest.main()
