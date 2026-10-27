# BẢN 8 (28/10/2026), chạy SAU bo_sung_v7.py. Theo hai bản rà bản 7: đồng bộ câu cũ (sơ đồ Các bên, Q10, Q16),
# tách trách nhiệm khi bên mua dùng hàng trước kết quả, ví dụ đủ số phí kiểm định (hồ sơ phí tách khỏi tiền hàng),
# 4 tình huống đối nghịch. Bảng kết quả kiểm thử giao ngay do kiem_tien.py ghi vào dữ liệu.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim, sua, them, tien, COC, GT
C.NG[:] = ["Góp ý 28/10 (rà bản 7)"]
DONG_NO = "Đã chốt kết quả · còn nghĩa vụ"
NT_V = 4_950 * 15_000; CON_V = NT_V - COC
PHI1, PHI2 = 1_500_000, 1_800_000   # phí thử nghiệm lần đầu, kiểm lại (giả định)

# 1. Đồng bộ câu cũ
for d in D["dong_chay"]:
    if "khoanh" in d["nhan"]: d["nhan"] = "chỉ cọc 30% (hoặc cam kết thanh toán theo đơn của ngân hàng thay cọc)"
for c in D["can_chot"]:
    if c["chu_de"].startswith("Giờ làm nhân viên"):
        c["chu_de"] = "Giờ làm nhân viên, trực đêm, ngưỡng phân cấp người duyệt"
        c["lua_chon"] = [["Hỗ trợ 7:00–21:00, trực khẩn 21:00–7:00", "Giả định"],
                         ["Ngưỡng phân cấp người duyệt", "Lệnh theo điều kiện: hệ thống gửi. Lệnh ngoại lệ: người duyệt khác người đề xuất; số tiền càng lớn người duyệt càng cao (mức cụ thể chờ chốt)"]]
    if c["chu_de"] == "Tạm dừng hạn khi đang chờ hỗ trợ":
        c["pham_vi"] = "Chỉ hạn nghiệm thu, hạn xác nhận số cân, hạn giao khi có sự cố đã liệt kê. Không áp: ký, giữ lô, chuyển cọc, trả tiền."

# 2. Dùng hàng trước kết quả
sua("vuon-du-luong-khong-dat", "Hàng về kho: cách ly",
    chi_tiet=("Điều khoản: hàng chờ tiêu chí còn kiểm phải giữ riêng. Nếu bên mua dùng sớm: người bán vẫn chịu trách nhiệm chất lượng hàng mình giao; "
              "bên mua chịu phần thiệt hại tăng thêm do dùng trái điều kiện chờ kiểm; hàng đã dùng hoặc trộn lẫn thì đối chiếu bằng mẫu lưu niêm phong, không bằng hàng còn lại."))

# 3. Phí kiểm định đủ số (hồ sơ phí tách khỏi tiền hàng)
t = TH["vuon-du-luong-khong-dat"]
sua("vuon-du-luong-khong-dat", "Mẫu đại diện (lấy theo phương pháp đã ghi) không đạt", so={"phi_mua_ung": PHI1},
    chi_tiet="Phí lần đầu " + tien(PHI1) + " (giả định) bên mua ứng khi đặt. Kết quả áp cho cả lô 4.950 kg theo phương pháp lấy mẫu đã ký. Mẫu lưu vẫn niêm phong.")
sua("vuon-du-luong-khong-dat", "Kiểm lại: vẫn không đạt", so={"phi_ban_ung": PHI2}, chi_tiet="Phí kiểm lại " + tien(PHI2) + " (giả định) người bán ứng vì người bán yêu cầu.")
sua("vuon-du-luong-khong-dat", "Kết luận: người bán có lỗi", so={"phi_ben_chiu": "Người bán chịu cả hai lần: " + tien(PHI1 + PHI2), "phi_con_thieu": PHI1},
    chi_tiet="Hàng: nhận lại để tiêu hủy có biên bản. Tiền hàng: giá trị chấp nhận 0; người bán hoàn " + tien(CON_V) + "; cọc hoàn bên mua. Phí: người bán đã ứng " + tien(PHI2) + " (tự chịu), còn phải hoàn bên mua " + tien(PHI1) + ".")
k = tim("vuon-du-luong-khong-dat", "Hoàn " + tien(CON_V) + " và phí")
t["buoc"][k].update(viec="Hoàn tiền hàng " + tien(CON_V), luong=[{"loai": "tien", "den": "mua", "nhan": tien(CON_V)}])
k = tim("vuon-du-luong-khong-dat", "Xác nhận đã nhận lại")
t["buoc"][k].update(viec="Bên mua xác nhận đã nhận tiền hàng", trang_thai="Đã quyết toán tiền hàng · còn hồ sơ phí",
                    chi_tiet="Hoàn xong tiền hàng nhưng hồ sơ phí kiểm định vẫn mở: còn thiếu " + tien(PHI1) + ".")
t["buoc"][k + 1:] = [B("ban", "Hoàn bên mua phí lần đầu " + tien(PHI1), o_dau="ngoai_app", luong=[("tien", "mua", tien(PHI1))], han="7 ngày"),
                     B("mua", "Xác nhận đã nhận phí", so={"phi_da_hoan": PHI1, "phi_con_thieu": 0}, tt="Hoàn tất")]
t["trang_thai"] = ["Chờ kết quả kiểm còn lại", DONG_NO, "Đã quyết toán tiền hàng · còn hồ sơ phí", "Hoàn tất"]

# 4. Tình huống đối nghịch
them("hai-ket-qua-khac", "Hai lần thử nghiệm cho kết quả khác nhau", "giao_ngay_bien",
  "Lần đầu không đạt, kiểm lại đạt. Không tự kết luận bên nào sai: dùng phòng thử nghiệm trọng tài đã ghi trong hợp đồng; hàng vẫn cách ly.",
  [B("dt", "Lần 1 (phòng A): không đạt", o_dau="ngoai_app", luong=[("giay", "app", "không đạt")], tt="Chờ kết quả kiểm còn lại", so={"coc_giu": COC}),
   B("dt", "Lần 2 (phòng B, mẫu lưu): đạt", o_dau="ngoai_app", luong=[("giay", "app", "đạt")]),
   B("app", "Hai kết quả trái nhau: chưa kết luận, hàng tiếp tục cách ly", o_dau="he_thong", luong=[("tin", "mua", "chờ trọng tài"), ("tin", "ban", "chờ trọng tài")], tt="Đang kiểm định"),
   B("nv", "Gửi mẫu lưu thứ hai tới phòng trọng tài đã thỏa thuận", o_dau="nhan_vien", nv="Hòa giải: kiểm chuỗi giữ mẫu (niêm phong, người giữ)."),
   B("dt", "Phòng trọng tài: đạt", o_dau="ngoai_app", luong=[("giay", "app", "kết luận cuối")], chi_tiet="Kết quả trọng tài là căn cứ theo điều khoản đã ký; bên sai (ở đây bên mua) chịu phí lần 1 và phí trọng tài."),
   B("app", "Kết luận: hàng đạt; lệnh chuyển cọc; mở hồ sơ phí cho bên mua", o_dau="he_thong", luong=[("giay", "nh", "lệnh cọc")], tt="Quyết toán cọc"),
   B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Đã quyết toán mua bán · còn hồ sơ mở")],
  vi_du={"ma": "HĐ-0103", "gia_tri": GT}, tt=["Chờ kết quả kiểm còn lại", "Đang kiểm định", "Quyết toán cọc", "Đã quyết toán mua bán · còn hồ sơ mở"],
  vai=["dt", "app", "nv", "nh", "ban", "mua"], sau="vuon-du-luong-khong-dat")
them("thang-tranh-chap-khong-tra", "Người bán thắng 900.000 nhưng bên mua không trả", "giao_ngay_bien",
  "Phần công nhận đã quyết toán. Kiểm định kết luận người bán đúng: bên mua phải trả thêm 900.000 + phí kiểm định. Bên mua không trả: nghĩa vụ còn mở, có hạn, không hoàn tất.",
  [B("app", "Phần công nhận đã quyết toán (73.350.000)", o_dau="he_thong", tt="Đã quyết toán mua bán · còn hồ sơ mở", so={"phai_tra": 73_350_000, "tra_thang": 50_850_000, "coc_chi_ban": COC}),
   B("dt", "Kiểm định: hàng đạt loại 1, người bán đúng", o_dau="ngoai_app", luong=[("giay", "app", "kết luận")]),
   B("app", "Ghi nghĩa vụ: bên mua trả 900.000 + phí kiểm định trong 48 giờ", o_dau="he_thong", luong=[("tin", "mua", "nghĩa vụ")], tt=DONG_NO, so={"phai_tra": 74_250_000, "con_no": "Bên mua còn nợ 900.000 đ + phí kiểm định"}),
   B("app", "Quá 48 giờ chưa trả: nhắc 3 lần", o_dau="he_thong", luong=[("tin", "mua", "nhắc")]),
   B("nv", "Gọi bên mua; ghi kết quả", o_dau="nhan_vien", nv="Đối soát tài chính."),
   B("app", "Vẫn chưa trả: trừ uy tín bên mua, khóa đơn mới, cấp hồ sơ cho người bán", o_dau="he_thong", luong=[("giay", "ban", "hồ sơ đòi")],
     chi_tiet="Khoản này chưa được bảo đảm (theo Q18). Hồ sơ vẫn mở, không tự đóng; AgiViet không đòi nợ thay.")],
  vi_du={"ma": "HĐ-0101", "gia_tri": GT}, tt=["Đã quyết toán mua bán · còn hồ sơ mở", DONG_NO], vai=["app", "dt", "mua", "nv", "ban"], sau="tranh-chap-mot-dong")
them("khong-xac-nhan-hoan", "Bên mua không xác nhận đã nhận tiền hoàn", "giao_ngay_bien",
  "Người bán báo đã hoàn 34.500.000 kèm chứng từ, bên mua im lặng. Im lặng không phải đã nhận: nhắc, rồi nhân viên đối soát chứng từ chuyển khoản.",
  [B("app", "Người bán còn phải hoàn 34.500.000", o_dau="he_thong", tt=DONG_NO, so={"coc_giu": 0, "hoan_mua": COC, "tra_thang": 52_500_000, "phai_tra": 18_000_000, "con_no": "Người bán phải hoàn 34.500.000 đ"}),
   B("ban", "Chuyển hoàn, báo đã hoàn + ủy nhiệm chi", o_dau="ngoai_app", luong=[("tien", "mua", "34.500.000 đ")]),
   B("app", "Bên mua 48 giờ chưa xác nhận: nhắc 3 lần", o_dau="he_thong", luong=[("tin", "mua", "nhắc xác nhận")], han="48 giờ"),
   B("nv", "Đối soát: xin sao kê bên mua hoặc xác nhận ngân hàng chuyển", o_dau="nhan_vien", nv="Đối soát tài chính; ảnh ủy nhiệm chi chưa đủ."),
   B("nv", "Có bằng chứng tiền đã vào tài khoản bên mua: ghi đã hoàn", o_dau="nhan_vien", so={"ban_da_hoan": 34_500_000, "con_no": ""}, tt="Hoàn tất",
     chi_tiet="Quyết định đối soát có căn cứ, ghi người quyết, bên mua được yêu cầu xem lại trong 7 ngày. Không có bằng chứng thì hồ sơ vẫn mở.")],
  vi_du={"ma": "HĐ-0101", "gia_tri": GT}, tt=[DONG_NO, "Hoàn tất"], vai=["app", "ban", "mua", "nv"], sau="da-nhan-nhieu-hon")
them("ngan-hang-bao-sau-huy", "Ngân hàng báo thành công sau khi đã yêu cầu hủy, hoàn", "giao_ngay_bien",
  "Lệnh chuyển cọc L-1 chưa rõ kết quả; hai bên thống nhất hoàn cọc nên hệ thống lập yêu cầu hủy L-1. Sau đó ngân hàng báo L-1 đã thành công. Đối chiếu theo mã lệnh, không chi hoặc hoàn hai lần.",
  [B("app", "Gửi L-1: chuyển cọc cho người bán", o_dau="he_thong", luong=[("giay", "nh", "L-1 · " + tien(COC))], tt="Quyết toán cọc", so={"coc_giu": COC}),
   B("app", "Có thay đổi: yêu cầu hủy L-1 (chưa lập lệnh hoàn)", o_dau="he_thong", luong=[("giay", "nh", "hủy L-1")], chi_tiet="Chưa lập lệnh hoàn L-2 khi L-1 chưa có kết quả cuối."),
   B("nh", "Báo L-1 đã thành công trước khi nhận yêu cầu hủy", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}),
   B("app", "Đối chiếu mã: L-1 thành công là kết quả cuối; bỏ yêu cầu hủy, không lập L-2", o_dau="he_thong", luong=[("tin", "nv", "ngoại lệ")]),
   B("nv", "Xử lý chênh: người bán phải trả lại bên mua theo thỏa thuận hoàn", o_dau="nhan_vien", luong=[("giay", "ban", "nghĩa vụ trả lại")], tt=DONG_NO,
     so={"con_no": "Người bán trả lại bên mua " + tien(COC) + " theo thỏa thuận"}, nv="Đối soát tài chính; lệnh ngoại lệ do người khác duyệt.")],
  vi_du={"ma": "HĐ-0101", "gia_tri": GT}, tt=["Quyết toán cọc", DONG_NO], vai=["app", "nh", "nv", "ban"], sau="lenh-ngan-hang-loi")

D["phien_ban"] = "8 · 28/10/2026"
D["nguon_chinh"] += " Bản 8: đồng bộ câu cũ (Q10, Q16, sơ đồ), trách nhiệm khi dùng hàng trước kết quả, ví dụ đủ số phí kiểm định, 4 tình huống đối nghịch, bảng kết quả kiểm thử."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("8")
