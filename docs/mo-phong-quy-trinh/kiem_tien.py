# Kiểm phép tính tiền, nghĩa vụ và điều kiện chuyển bước trong quy-trinh.json (bổ sung cho kiem-thu.mjs, vốn chỉ kiểm hiển thị),
# rồi ghi bảng kết quả kiểm thử 4 loại vào dữ liệu.
# Chạy: node kiem-thu.mjs (ghi ket-qua-giao-dien.json) rồi python3 docs/mo-phong-quy-trinh/kiem_tien.py
import json, os
TH_MUC = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(TH_MUC, "quy-trinh.json")
D = json.load(open(P, encoding="utf-8"))
loi = 0
LOI_TIEN, LOI_BUOC = set(), set()
def bao(nhom, id, *x):
    global loi
    print(*x, id); loi += 1; nhom.add(id)
ids = [t["id"] for t in D["tinh_huong"]]
if len(ids) != len(set(ids)): print("TRÙNG MÃ TÌNH HUỐNG"); loi += 1
for t in D["tinh_huong"]:
    s, cmax = {}, 0
    for b in t["buoc"]:
        s.update(b["so"] or {}); cmax = max(cmax, s.get("coc_giu", 0) or 0)
    tts = [b["trang_thai"] for b in t["buoc"] if b.get("trang_thai")]
    cuoi = tts[-1] if tts else ""
    chi, hoan, con = s.get("coc_chi_ban", 0), s.get("hoan_mua", 0), s.get("coc_giu", 0)
    # cmax = 0: tình huống bắt đầu sau khi cọc đã quyết toán, không có số giữ để đối chiếu.
    if (chi or hoan) and cmax and chi + hoan + con != cmax and t["id"] != "bat-kha-khang":
        bao(LOI_TIEN, t["id"], "LỆCH CỌC", chi, hoan, con, cmax)
    nhan = (s.get("tra_thang") or 0) + chi + (s.get("ung_nhan") or 0) - (s.get("ban_da_hoan") or 0)
    du_tien = not s.get("phai_tra") or nhan + (s.get("phi_ung") or 0) == s["phai_tra"]
    if cuoi == "Hoàn tất" and not du_tien: bao(LOI_TIEN, t["id"], "HOÀN TẤT NHƯNG NHẬN LỆCH", nhan, s["phai_tra"])
    if cuoi.startswith("Đã quyết toán") and not du_tien: bao(LOI_TIEN, t["id"], "GHI ĐÃ QUYẾT TOÁN NHƯNG NHẬN LỆCH", nhan, s["phai_tra"])
    if cuoi == "Hoàn tất" and s.get("con_no"): bao(LOI_BUOC, t["id"], "HOÀN TẤT KHI CÒN NỢ")
    if cuoi == "Hoàn tất" and (s.get("phi_con_thieu") or 0) > 0: bao(LOI_BUOC, t["id"], "HOÀN TẤT KHI CÒN HỒ SƠ PHÍ")
    if cuoi.startswith(("Đã xong thanh toán nhánh", "Đã xử lý xong nhánh")) and (s.get("con_no") or (s.get("phi_con_thieu") or 0) > 0):
        bao(LOI_BUOC, t["id"], "XONG NHÁNH KHI CÒN NỢ")
    # Phí: tổng ứng = tổng chịu = phi_tong; khoản phải hoàn = phần một bên ứng vượt phần mình chịu.
    if s.get("phi_tong") is not None:
        ung = (s.get("phi_mua_ung") or 0) + (s.get("phi_ban_ung") or 0)
        chiu = (s.get("phi_mua_chiu") or 0) + (s.get("phi_ban_chiu") or 0)
        if ung != s["phi_tong"] or chiu != s["phi_tong"]: bao(LOI_TIEN, t["id"], "PHÍ LỆCH TỔNG", ung, chiu, s["phi_tong"])
        can_hoan = abs((s.get("phi_mua_ung") or 0) - (s.get("phi_mua_chiu") or 0))
        if cuoi == "Hoàn tất" and (s.get("phi_da_hoan") or 0) != can_hoan: bao(LOI_TIEN, t["id"], "PHÍ HOÀN LỆCH", s.get("phi_da_hoan"), can_hoan)
    elif s.get("phi_mua_ung") or s.get("phi_ban_ung"):
        bao(LOI_TIEN, t["id"], "CÓ PHÍ ỨNG NHƯNG CHƯA KHAI TỔNG / BÊN CHỊU")
    for x in tts:
        if x not in t.get("trang_thai", D["trang_thai_don"]): bao(LOI_BUOC, t["id"], "TRẠNG THÁI NGOÀI DANH SÁCH", x)

# Bảng 4 loại: hiển thị (kiem-thu.mjs), tiền và nghĩa vụ, chuyển bước (ở trên), thẩm định nghiệp vụ (người duyệt).
P_GD = os.path.join(TH_MUC, "ket-qua-giao-dien.json")
gd = json.load(open(P_GD, encoding="utf-8")) if os.path.exists(P_GD) else {}
# Đã đối chiếu tay phép tính trong chữ của bước (chưa có sổ tiền nhiều người bán).
DOI_CHIEU_TAY = {"dinh-ky-3-ngay", "dinh-ky-tra-tien", "nhieu-de-nghi", "dinh-ky-no-qua-han", "dung-dinh-ky"}
bang = []
for t in D["tinh_huong"]:
    g = [gd.get(f'{w}px: chạy hết "{t["id"]}"') for w in (390, 1280)]
    hien_thi = "chưa thử" if None in g else ("đạt" if g == ["đạt", "đạt"] else "lỗi")
    co_so = any(b["so"] for b in t["buoc"])
    co_tien = co_so or any(x["loai"] == "tien" for b in t["buoc"] for x in b["luong"])
    if t["id"] in LOI_TIEN: tien = "lỗi"
    elif co_so and t.get("vi_du", {}).get("gia_tri"): tien = "đạt"
    elif t["id"] in DOI_CHIEU_TAY: tien = "đạt phép tính ví dụ (đối chiếu tay)"
    elif co_tien: tien = "chưa kiểm (chưa có sổ tiền)"
    else: tien = "không áp dụng"
    buoc = "lỗi" if t["id"] in LOI_BUOC else "đạt"
    bang.append([t["ten"], hien_thi, tien, buoc, "chờ người duyệt", "chưa thử"])
D["kiem_thu"] = {"cot": ["Tình huống (tất cả)", "Hiển thị (mở được bước, không lỗi bố cục)", "Tiền và nghĩa vụ (số đầu vào, phân bổ, còn thiếu khớp)",
                         "Chuyển bước (chưa đủ điều kiện thì chưa kết thúc)", "Thẩm định nghiệp vụ", "Trên app thật"], "dong": bang,
                 "ghi": "Cột 2–4 là kiểm tự động trên dữ liệu mô phỏng: chứng minh số khớp quy tắc đã viết, không chứng minh quy tắc đúng. "
                        "Cột 5: cách phân bổ trách nhiệm do người duyệt xác nhận. Cột 6: app thật chưa dựng theo quy trình này."}
json.dump(D, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(D["tinh_huong"]), "tình huống · lỗi:", loi)
raise SystemExit(1 if loi else 0)
