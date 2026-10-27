# BẢN 9 (28/10/2026), chạy SAU bo_sung_v8.py. Theo rà bản 8: nhánh hai kết quả thử nghiệm kế thừa tiền HĐ-0103 và
# tách kết luận chất lượng / phân bổ phí / trách nhiệm sai lệch; nguồn xác minh tiền hoàn (người nhận hoặc đối soát);
# quyền đối soát của nhân viên. Bảng kiểm thử 4 loại do kiem_tien.py ghi.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tien, COC
C.NG[:] = ["Góp ý 28/10 (rà bản 8)"]
NT_V = 4_950 * 15_000; CON_V = NT_V - COC
PHI1, PHI2, PHI3 = 1_500_000, 1_800_000, 2_000_000   # phí phòng A, phòng B, trọng tài (giả định)
QT_MB = "Đã quyết toán mua bán · còn hồ sơ mở"

# Quyền đối soát
for v in D["vai"]:
    if v["id"] == "nv":
        v["khong"] = "ký thay; xác nhận tiền thay khi không có bằng chứng; đổi phí hay chính sách"
        v["lam"] = list(dict.fromkeys(v["lam"] + ["Ghi kết quả đối soát dựa trên bằng chứng ngân hàng (ghi người xử lý, bằng chứng; người khác duyệt nếu là lệnh ngoại lệ)"]))
D["he_thong"]["quy_tac"].append(["Nguồn xác minh tiền", "Mỗi khoản đã nhận ghi rõ một trong hai: người nhận xác nhận, hoặc kết quả đối soát có căn cứ (người xử lý + bằng chứng). Không ghi \"bên mua xác nhận\" khi bên mua chưa xác nhận."])

# Mục 3: nhánh không xác nhận hoàn
for b in TH["khong-xac-nhan-hoan"]["buoc"]:
    if (b["so"] or {}).get("ban_da_hoan"):
        b["so"]["xac_minh_hoan"] = "Đối soát: sao kê ngân hàng bên mua, người xử lý NV-02 (bên mua chưa xác nhận)"
for t in D["tinh_huong"]:
    for b in t["buoc"]:
        if (b["so"] or {}).get("ban_da_hoan") and not b["so"].get("xac_minh_hoan") and b["vai"] == "mua":
            b["so"]["xac_minh_hoan"] = "Bên mua xác nhận"

# Mục 1, 2: hai kết quả khác nhau
t = TH["hai-ket-qua-khac"]
t["mo_ta"] = ("Cùng đơn HĐ-0103 lấy tại vườn: đã trả trước bàn giao " + tien(CON_V) + ", cọc " + tien(COC) + " đang giữ. Phòng A không đạt, phòng B (mẫu lưu) đạt. "
              "Tách ba việc: kết luận chất lượng (theo phương pháp, mẫu đã thỏa thuận), phân bổ phí (theo điều khoản kết quả trái nhau), trách nhiệm gây sai lệch (xác minh riêng).")
t["buoc"] = [
  B("app", "Đơn đã trả trước bàn giao; cọc giữ chờ dư lượng", o_dau="he_thong", tt="Chờ kết quả kiểm còn lại", so={"coc_giu": COC, "tra_thang": CON_V, "phai_tra": NT_V}),
  B("dt", "Lần 1 (phòng A, bên mua đặt): không đạt", o_dau="ngoai_app", luong=[("giay", "app", "không đạt")], so={"phi_mua_ung": PHI1}, chi_tiet="Bên mua ứng phí " + tien(PHI1) + "."),
  B("dt", "Lần 2 (phòng B, mẫu lưu, người bán yêu cầu): đạt", o_dau="ngoai_app", luong=[("giay", "app", "đạt")], so={"phi_ban_ung": PHI2}, chi_tiet="Người bán ứng phí " + tien(PHI2) + "."),
  B("app", "Hai kết quả trái nhau: chưa kết luận, hàng tiếp tục cách ly", o_dau="he_thong", luong=[("tin", "mua", "chờ trọng tài"), ("tin", "ban", "chờ trọng tài")], tt="Đang kiểm định"),
  B("nv", "Gửi mẫu lưu thứ hai tới phòng trọng tài đã thỏa thuận; hai bên ứng đôi phí", o_dau="nhan_vien", nv="Hòa giải: kiểm chuỗi giữ mẫu (niêm phong, người giữ).",
    so={"phi_mua_ung": PHI1 + PHI3 // 2, "phi_ban_ung": PHI2 + PHI3 // 2}),
  B("dt", "Phòng trọng tài: đạt", o_dau="ngoai_app", luong=[("giay", "app", "kết luận chất lượng")],
    chi_tiet="Kết luận chất lượng: hàng đạt theo phương pháp, mẫu đã thỏa thuận. Không tự suy ra bên mua làm sai: bên mua có kết quả phòng A để báo vấn đề."),
  B("app", "Phân bổ phí theo điều khoản kết quả trái nhau", o_dau="he_thong",
    so={"phi_ben_chiu": "Hàng đạt: bên mua chịu phí phòng A và phí trọng tài; người bán được hoàn phí phòng B " + tien(PHI2) + " (đề xuất, chờ chốt)", "phi_con_thieu": PHI2 + PHI3 // 2},
    chi_tiet="Phí: bên mua chịu " + tien(PHI1 + PHI3) + ", hoàn người bán " + tien(PHI2 + PHI3 // 2) + " (phí lần 2 và nửa phí trọng tài người bán đã ứng). Trách nhiệm gây sai lệch (lấy mẫu, bảo quản, phòng A thử sai): xác minh riêng nếu có nghi vấn, không gộp vào bước này."),
  B("app", "Lệnh chuyển cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh cọc")], tt="Quyết toán cọc"),
  B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt=QT_MB,
    chi_tiet="Người bán nhận " + tien(CON_V) + " + " + tien(COC) + " = " + tien(NT_V) + ". Hồ sơ phí còn mở."),
  B("mua", "Hoàn người bán " + tien(PHI2 + PHI3 // 2) + " phí", o_dau="ngoai_app", luong=[("tien", "ban", tien(PHI2 + PHI3 // 2))], han="7 ngày"),
  B("ban", "Xác nhận đã nhận phí", so={"phi_da_hoan": PHI2 + PHI3 // 2, "phi_con_thieu": 0}, tt="Hoàn tất")]
t["trang_thai"] = ["Chờ kết quả kiểm còn lại", "Đang kiểm định", "Quyết toán cọc", QT_MB, "Hoàn tất"]
t["vi_du"] = {"ma": "HĐ-0103", "gia_tri": NT_V, "ghi": "Kế thừa đơn lấy tại vườn: 4.950 kg × 15.000."}

D["phien_ban"] = "9 · 28/10/2026"
D["nguon_chinh"] += " Bản 9: nhánh hai kết quả kế thừa tiền và tách kết luận chất lượng / phí / sai lệch; nguồn xác minh tiền hoàn; quyền đối soát; bảng kiểm thử 4 loại."
C.luu("9")
