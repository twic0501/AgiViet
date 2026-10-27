# BẢN 23 (28/10/2026), chạy SAU bo_sung_v22.py. Theo rà bản 22: kiểm tải sau khi nhận thêm (chặn khi vượt 20), mốc 18 chỉ là cảnh báo.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D
C.NG[:] = ["Góp ý 28/10 (rà bản 22)"]

for r in D["van_hanh"]["quy_tac"]:
    if r[0] == "Công suất phục vụ":
        r[1] = ("Tính bằng điểm tải (cấu hình minh họa, chờ số pilot): một ca 20 điểm; đơn thường 1 điểm; đơn theo sát 6 điểm. Người đi hiện trường tính riêng, không trừ vào điểm ca. "
                "Trước mỗi cam kết: tải đang giữ cho các đơn + tải đơn mới phải ≤ 20, vượt thì chặn. Mốc 18 chỉ là cảnh báo. "
                "Ví dụ: 14 + theo sát 6 = 20 được; 15 + theo sát 6 = 21 chặn (dù chưa tới 18); 18 + thường 1 = 19 được; 20 + thường 1 = 21 chặn. "
                "Có thể chia người phụ trách riêng cho từng nhóm.")
D["van_hanh"]["vi_du_tai"] = [[14, "Một đơn theo sát", 20, "Được"], [15, "Một đơn theo sát", 21, "Chặn (chưa tới cảnh báo 18 vẫn chặn)"],
                              [18, "Một đơn thường", 19, "Được"], [20, "Một đơn thường", 21, "Chặn"]]
for a, _, tong, kq in D["van_hanh"]["vi_du_tai"]:
    assert (tong <= 20) == kq.startswith("Được")

D["phien_ban"] = "23 · 28/10/2026"
D["nguon_chinh"] += " Bản 23: kiểm tải sau khi nhận thêm, chặn khi vượt công suất ca; mốc 18 là cảnh báo."
C.luu("23")
