"""Chatbot đối tác (/doi-tac/tra-loi): không hứa theo con số người kia đề nghị (rà soát 04/11 #9)."""
import os
import unittest
from unittest import mock

os.environ.setdefault("AGV_STT_TAT", "1")
os.environ.pop("AGV_AI_API_KEY", None)

from fastapi.testclient import TestClient  # noqa: E402

from agiviet_ai import dich_vu  # noqa: E402
from agiviet_ai.nha_cung_cap import NhaCungCap, KetQua  # noqa: E402

TT = "Lời chào LC-1: giá gần nhất 136.000 đ/kg do bạn đưa; đang chờ người kia trả lời. Mức cao nhất bạn chịu: 140.100 đ/kg."
TIN = "Nâng lên 150.000 được không"


def hoi(cau_mo_hinh: str):
    with mock.patch.object(NhaCungCap, "goi", lambda self, *a, **k: KetQua(cau_mo_hinh, "gia:lap", 1.0, [])):
        return TestClient(dich_vu.app).post("/doi-tac/tra-loi", json={"vai": "buyer", "ten": "Nhà máy X", "tinh_trang": TT, "tin": TIN})


class KhongHuaTheoSoNguoiKia(unittest.TestCase):
    def test_hua_theo_so_nguoi_kia_bi_bo(self):
        self.assertEqual(hoi("Dạ bác chào 150.000 đ/kg là em đồng ý luôn ạ.").status_code, 503)

    def test_nhac_lai_de_tu_choi_van_duoc(self):
        r = hoi("Giá 150.000 đ/kg cao quá bác ạ, em không theo được.")
        self.assertEqual(r.status_code, 200)

    def test_hua_dung_muc_chiu_duoc(self):
        r = hoi("Bác chào 140.100 đ/kg là em đồng ý ngay ạ.")
        self.assertEqual(r.status_code, 200)


if __name__ == "__main__":
    unittest.main()
