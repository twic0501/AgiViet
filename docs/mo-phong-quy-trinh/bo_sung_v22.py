# BẢN 22 (28/10/2026), chạy SAU bo_sung_v21.py. Theo rà bản 21: không tính trùng công sự cố với ca trực; điểm tải chung
# cho ca nhận lẫn đơn thường và đơn theo sát; chức năng nội bộ ghi công và chi phí phục vụ (nguồn số liệu cho Q24).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, tien
C.NG[:] = ["Góp ý 28/10 (rà bản 21)"]

# 1. Sự cố trong ca đã nằm trong chi phí ca
cp = D["chi_phi"]
for u in cp["uoc"]:
    if u["ten"] == "Đơn cần theo sát":
        for r in u["viec"]:
            if r[0] == "Xử lý một sự cố":
                r[0] = "Xử lý sự cố trong ca (đã nằm trong ca phân bổ)"; r[3] = tien(0)
        u["viec"].append(["Tăng ca hoặc thêm người cho sự cố: cộng riêng khi có", "Người trực thêm", "—", tien(0)])
        u["tong_so"] = sum(int(r[3].replace(".", "").replace(" đ", "")) for r in u["viec"])
        u["tong"] = tien(u["tong_so"])
TL, TS, TB = (u["tong_so"] for u in cp["uoc"])
cp["phan_bo"].insert(1, "Không tính một giờ công hai lần: sự cố do người đang trực xử lý trong ca đã nằm trong chi phí ca. Chỉ cộng thêm khi tăng ca hoặc dùng thêm người. Muốn biết công trực tiếp của đơn: tách công đó ra, rồi phân bổ phần ca còn lại cho các đơn khác.")
cp["ghi_uoc"] = (f"Dự toán giả định (giờ nhân viên 60.000 đ). Đơn thuận lợi {tien(TL)}; đơn cần theo sát {tien(TS)}; đơn thất bại {tien(TB)}. "
                 f"Đơn thất bại không thu phí: ví dụ cứ 3 đơn thuận lợi có 1 đơn thất bại, mỗi đơn thuận lợi cần gánh {tien(TL)} + {tien(TB)} ÷ 3 ≈ {tien(TL + round(TB / 3))}. "
                 "Thay bằng số thật khi pilot; theo dõi phí đã thu, không chỉ phí đã xuất hóa đơn.")

# 2. Điểm tải chung
for r in D["van_hanh"]["quy_tac"]:
    if r[0] == "Công suất phục vụ":
        r[1] = ("Tính bằng điểm tải (cấu hình minh họa, chờ số pilot): một ca 20 điểm; đơn thường 1 điểm; đơn theo sát 6 điểm. "
                "Ví dụ ca đã có 2 đơn theo sát (12 điểm) thì nhận thêm tối đa 8 đơn thường. Người đi hiện trường tính riêng, không trừ vào điểm ca. "
                "Sắp đầy (≥ 18 điểm): hệ thống báo \"hết khả năng nhận thêm theo sát\" trước khi cam kết với khách; có thể chia người phụ trách riêng cho từng nhóm.")

# 3. Chức năng nội bộ ghi công, chi phí
D["he_thong"]["tinh_nang"].append(["Ghi nhận công việc và chi phí phục vụ (nội bộ)",
  "Theo mã đơn hoặc khách định kỳ: người làm, việc, thời gian; chi phí trực tiếp và phần dùng chung (ca trực); khoản AgiViet chịu / bên khác chịu; phí được hưởng, đã thu, hoàn hoặc giảm. "
  "Nhân viên ghi công, người phụ trách kiểm, đối soát xác nhận khoản chi. Nguồn số liệu cho Q24. Không hiện trên app người bán, bên mua.",
  "Nhân viên, quản trị"])
for c in D["can_chot"]:
    if c["ma"] == "Q24":
        c["bang_chung"] = "Bảng \"Chi phí phục vụ\" ở khung này (dự toán giả định); số thật lấy từ tính năng nội bộ \"Ghi nhận công việc và chi phí phục vụ\"."

D["phien_ban"] = "22 · 28/10/2026"
D["nguon_chinh"] += " Bản 22: không tính trùng công sự cố với ca trực, điểm tải ca, tính năng ghi công và chi phí phục vụ."
C.luu("22")
print(tien(TL), tien(TS), tien(TB), tien(TL + round(TB / 3)))
