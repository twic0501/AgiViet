# BẢN 10 (28/10/2026), chạy SAU bo_sung_v9.py. Theo rà bản 9: sửa số phí nhánh hai kết quả (bên mua chịu 5,3 triệu),
# số phí kiểm được (phi_tong, phi_mua_chiu, phi_ban_chiu), hiện quyền ghi đối soát trên màn Các bên,
# trạng thái cuối của nhánh con còn hàng trả lại chỉ là "đã xong thanh toán nhánh", hồ sơ tổng mới hoàn tất toàn bộ.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, tien
C.NG[:] = ["Góp ý 28/10 (rà bản 9)"]
XONG_NHANH = "Đã xong thanh toán nhánh · xem hồ sơ đơn"

# 1. Phí
def so_buoc(th, chu):
    return next(b for b in TH[th]["buoc"] if chu in b["viec"])
b = so_buoc("hai-ket-qua-khac", "Phân bổ phí")
b["so"].update(phi_tong=5_300_000, phi_mua_chiu=5_300_000, phi_ban_chiu=0, phi_con_thieu=2_800_000,
               phi_ben_chiu="Hàng đạt: bên mua chịu cả ba lần (phòng A 1.500.000 + phòng B 1.800.000 + trọng tài 2.000.000 = 5.300.000), đề xuất chờ chốt")
b["chi_tiet"] = ("Bên mua đã ứng 2.500.000 (phòng A + nửa trọng tài), người bán đã ứng 2.800.000 (phòng B + nửa trọng tài). "
                 "Bên mua chịu cuối cùng 5.300.000 = 2.500.000 đã ứng + hoàn người bán 2.800.000; người bán chịu 0. "
                 "Trách nhiệm gây sai lệch (lấy mẫu, bảo quản, phòng A thử sai): xác minh riêng nếu có nghi vấn, không gộp vào bước này.")
b = so_buoc("vuon-du-luong-khong-dat", "Kết luận: người bán có lỗi")
b["so"].update(phi_tong=3_300_000, phi_mua_chiu=0, phi_ban_chiu=3_300_000)

# 2. Quyền đối soát hiện trên màn
nv = next(v for v in D["vai"] if v["id"] == "nv")
nv["vai_con"].append(["Đối soát tài chính", "Ghi kết quả đối soát tiền khi người nhận không xác nhận: phải có bằng chứng ngân hàng (sao kê, xác nhận chuyển), ghi người xử lý. Ảnh ủy nhiệm chi chưa đủ. Kết quả dẫn tới lệnh ngoại lệ thì người khác duyệt."])
D["quyen"]["hanh_dong"].append(["Ghi kết quả đối soát tiền", "AgiViet", "Hai bên, nhân viên", "Nhân viên đối soát (kèm bằng chứng ngân hàng)",
                               "Người duyệt khác người đề xuất nếu dẫn tới lệnh ngoại lệ", "Người nhận xác nhận, hoặc kết quả đối soát có căn cứ"])
D["he_thong"]["quy_tac"].append(["Trạng thái cuối của nhánh", "Nhánh minh họa một phần của đơn (thanh toán, tranh chấp, ứng tiền) kết thúc ở \"" + XONG_NHANH + "\" khi đơn còn hồ sơ khác (hàng trả lại, phí). Chỉ hồ sơ tổng của đơn mới ghi Hoàn tất toàn bộ."])

# 3. Nhánh con có hàng trả lại
for id in ["tien-mat", "ung-tien", "tranh-chap-mot-dong", "tra-sau-ngan-hang", "tra-mot-phan"]:
    t = TH[id]
    cuoi = [b for b in t["buoc"] if b.get("trang_thai")][-1]
    assert cuoi["trang_thai"] == "Hoàn tất", id
    cuoi["trang_thai"] = XONG_NHANH
    cuoi["chi_tiet"] = ((cuoi.get("chi_tiet") or "") + " Phần thanh toán của nhánh đã xong; hàng trả lại, phí và nghĩa vụ khác kiểm ở hồ sơ đơn (xem đơn chính).").strip()
    ds = t.get("trang_thai") or list(D["trang_thai_don"])
    t["trang_thai"] = [x for x in ds if x != "Hoàn tất"] + [XONG_NHANH]

D["phien_ban"] = "10 · 28/10/2026"
D["nguon_chinh"] += " Bản 10: sửa số phí (bên mua chịu 5,3 triệu), số phí kiểm được, quyền ghi đối soát trên màn, trạng thái cuối nhánh con."
C.luu("10")
