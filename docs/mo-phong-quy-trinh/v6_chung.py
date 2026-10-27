# Hàm dùng chung cho bo_sung_v6a.py và bo_sung_v6b.py: nạp quy-trinh.json, tạo/sửa bước, ghi lại.
import json, os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quy-trinh.json")
D = json.load(open(P, encoding="utf-8"))
GY, MT = "gop_y", "mau_thuan"
NG = ["Góp ý 28/10 (rà bản 5)"]
COC, NT, CON, GT = 22_500_000, 73_350_000, 50_850_000, 75_000_000
DONG_NO = "Đã chốt kết quả · còn nghĩa vụ"
TH = {t["id"]: t for t in D["tinh_huong"]}
def tien(n): return f"{n:,}".replace(",", ".") + " đ"
def B(vai, viec, o_dau="app", luong=(), chi_tiet="", han="", tt=None, so=None, nv="", dieu_kien="", loai=GY, moc=""):
    return {"vai": vai, "viec": viec, "o_dau": o_dau, "luong": [dict(zip(("loai", "den", "nhan"), l)) for l in luong], "dieu_kien": dieu_kien, "han": han,
            "chi_tiet": chi_tiet, "nguon": NG, "loai_nguon": loai, "trang_thai": tt, "so": so or {}, "trich": "", "nv": nv, "moc": moc}
def tim(th, chu):
    for i, b in enumerate(TH[th]["buoc"]):
        if chu in b["viec"]: return i
    raise SystemExit(f"Không thấy '{chu}' trong {th}")
def sua(th, chu, **k):
    if "tt" in k: k["trang_thai"] = k.pop("tt")
    b = TH[th]["buoc"][tim(th, chu)]; b.update(k); b["loai_nguon"] = k.get("loai_nguon", GY)
    b["nguon"] = list(dict.fromkeys(b.get("nguon", []) + NG))
def them(id, ten, nhom, mo, buoc, vi_du=None, tt=None, vai=None, sau=None):
    t = {"id": id, "ten": ten, "nhom": nhom, "mo_ta": mo, "nguon": NG, "loai_nguon": GY, "buoc": buoc,
         "vi_du": vi_du if vi_du is not None else {"ma": "HĐ-0101", "gia_tri": GT}, "trang_thai": tt or D["trang_thai_don"], "vai_tham_gia": vai or []}
    if sau in TH: D["tinh_huong"].insert(D["tinh_huong"].index(TH[sau]) + 1, t)
    else: D["tinh_huong"].append(t)
    TH[id] = t
def luu(ten):
    json.dump(D, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"ok {ten}:", len(D["tinh_huong"]), "tình huống,", sum(len(t["buoc"]) for t in D["tinh_huong"]), "bước")
