# BẢN 21 (28/10/2026), chạy SAU bo_sung_v20.py. Theo rà năm mục: Q24 thành quyết định phương pháp đo chi phí phục vụ;
# phần "Chi phí phục vụ" (đơn vị đo, khoản mục, phân bổ trực, ví dụ, ước tính 3 nhóm đơn); vai trò ≠ số người;
# "miễn phí" = không thu riêng; công suất ca; hướng xử lý theo nhóm Q.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, tien
NGUON = "Góp ý 28/10 (rà năm mục, Q24)"
C.NG[:] = [NGUON]

# ---------- Bản trước của các Q đã viết lại (người sáng lập đối chiếu nếu có cách khác) ----------
def luu_cu(c, nhan):
    c.setdefault("ban_cu", []).append({"nhan": nhan, "chu_de": c["chu_de"], "lua_chon": [list(x) for x in c["lua_chon"]], "de_xuat": c["de_xuat"]})
for c in D["can_chot"]:
    if c["ma"] == "Q10" and not c.get("ban_cu"):
        c["ban_cu"] = [
          {"nhan": "Bản gốc (bản 3)", "chu_de": "Giờ làm nhân viên, trực đêm, ngưỡng duyệt",
           "lua_chon": [["Hỗ trợ 7:00–21:00, trực khẩn 21:00–7:00", "Giả định"], ["Ngưỡng tiền nhân viên tự duyệt", "Chờ chốt"]], "de_xuat": "Chốt theo số đơn thử nghiệm."},
          {"nhan": "Bản 8", "chu_de": "Giờ làm nhân viên, trực đêm, ngưỡng phân cấp người duyệt",
           "lua_chon": [["Hỗ trợ 7:00–21:00, trực khẩn 21:00–7:00", "Giả định"], ["Ngưỡng phân cấp người duyệt", "Lệnh ngoại lệ: người duyệt khác người đề xuất; số tiền càng lớn người duyệt càng cao"]],
           "de_xuat": "Chốt theo số đơn thử nghiệm."}]
    if c["ma"] == "Q18" and not c.get("ban_cu"):
        c["ban_cu"] = [{"nhan": "Bản 6", "chu_de": "Quyết toán khi còn tranh chấp",
          "lua_chon": [["Giữ phần cọc bằng khoản tranh chấp", "An toàn cho người bán"], ["Chuyển toàn bộ cọc, người bán chấp thuận khoản tranh chấp không còn bảo đảm", "Người bán nhận tiền sớm"]],
          "de_xuat": "Mặc định giữ phần cọc bằng khoản tranh chấp; người bán được chọn cách thứ hai."}]

# ---------- Q24: giữ "Chưa chốt", nội dung mới là đề xuất, lưu bản trước ----------
for c in D["can_chot"]:
    if c["chu_de"] == "Chi phí phục vụ mỗi đơn":
        luu_cu(c, "Bản 11")
        c.update(chu_de="Phương pháp quản trị chi phí phục vụ", nhom="V1", can_cu=NGUON,
          de_xuat=("Chốt phương pháp: đo theo giao dịch và theo khách định kỳ (tháng); ghi công việc, hiện trường, trực ca, hệ thống và chi phí sự cố AgiViet thực chịu. "
                   "Theo sát trong phạm vi cam kết nằm trong phí giới thiệu. Lập dự toán trước pilot, đối chiếu số thực khi vận hành. Mức phí, công suất, mục tiêu lợi nhuận chờ dữ liệu."),
          lua_chon=[["Đo theo giao dịch + khách định kỳ", "Đề xuất"], ["Chỉ đo theo chuyến", "Không thấy chi phí tìm nguồn, trực dùng chung"]],
          bang_chung="Bảng \"Chi phí phục vụ\" ở khung Việc cần chốt (số dự toán, giả định).")

# ---------- Hướng xử lý theo nhóm Q ----------
HUONG = {
 ("Q01", "Q02", "Q03", "Q05", "Q08", "Q11", "Q15", "Q18"): "Xác nhận nguyên tắc đang dùng trong mô phỏng; tách tỷ lệ và điều khoản tiền cần rà trước giao dịch thật.",
 ("Q07", "Q09", "Q13", "Q16", "Q26"): "Dùng cấu hình minh họa để dựng app; lấy thời gian, điều kiện, năng lực thật trước pilot.",
 ("Q10", "Q25", "Q27", "Q28"): "Chốt phạm vi ủy quyền, trách nhiệm, công suất, cách áp dụng; thông số hiệu chỉnh theo dữ liệu.",
 ("Q04",): "Chờ ngân hàng xác nhận sản phẩm thật.",
 ("Q06", "Q14", "Q19", "Q20", "Q21", "Q22", "Q23", "Q24"): "Làm rõ khách hàng, giá trị dịch vụ, cách thu, chi phí phục vụ.",
 ("Q12", "Q17"): "Giữ phạm vi mở rộng đã thống nhất; dùng lại phần chung."}
for c in D["can_chot"]:
    for k, v in HUONG.items():
        if c["ma"] in k: c["huong"] = v
D["can_chot_ghi"] = "Đây là danh sách quyết định, không phải danh sách lỗi luồng. Mỗi mục có \"Hướng xử lý\" theo nhóm."

# ---------- Các bên, Dịch vụ, Nhân viên ----------
D["quyen"]["mo_ta"] += " Vai trò khác số người: một người có thể kiêm nhiều vai (chủ nhà hàng kiêm thu mua, kế toán, nhận hàng; nhân viên AgiViet kiêm nhiều việc), nhưng lệnh tiền ngoại lệ vẫn cần người lập và người duyệt khác nhau."
for r in D["dich_vu"]["ds"]:
    r[4] = r[4].replace("Miễn phí", "Không thu riêng").replace("miễn phí", "không thu riêng")
D["dich_vu"]["mo_ta"] += " \"Không thu riêng\" nghĩa là khách không trả riêng; AgiViet vẫn tính chi phí nhân viên, hệ thống, hỗ trợ vào mô hình kinh doanh (xem Chi phí phục vụ)."
D["van_hanh"]["quy_tac"].append(["Công suất phục vụ", "Một ca theo dõi tối đa 20 đơn thường hoặc 3 đơn theo sát (giả định, chờ số pilot). Đơn cần có mặt hiện trường tính riêng người. Đạt công suất: hệ thống báo \"hết khả năng nhận thêm theo sát\" trước khi cam kết với khách."])

# ---------- Chi phí phục vụ ----------
GIO = 60_000            # chi phí 1 giờ nhân viên (giả định, gồm lương + bảo hiểm)
CA = 8 * GIO // 20      # trực ca chia cho 20 đơn thường đang theo dõi
CA_SAT = 2 * 8 * GIO // 3  # hai ca theo sát chia cho 3 đơn
HE = 20_000             # hệ thống, tin nhắn, AI mỗi đơn (giả định)
def p(phut): return phut * GIO // 60
nhom = {
 "Đơn thuận lợi": [["Tìm nguồn, gọi điện", "Nhân viên", 60, p(60)], ["Hướng dẫn, hợp đồng", "Nhân viên", 30, p(30)], ["Đối soát tiền", "Đối soát", 20, p(20)],
                   ["Trực ca phân bổ (8 giờ ÷ 20 đơn)", "Người trực", None, CA], ["Hệ thống, tin nhắn, AI", "Hệ thống", None, HE]],
 "Đơn cần theo sát": [["Tìm nguồn nhiều điểm", "Nhân viên", 120, p(120)], ["Hiện trường: 4 giờ + đi lại", "Nhân viên hiện trường", 240, p(240) + 300_000],
                      ["Theo sát 2 ca phân bổ (÷ 3 đơn)", "Người chính + thay ca", None, CA_SAT], ["Xử lý một sự cố", "Người trực", 60, p(60)],
                      ["Đối soát nhiều nguồn", "Đối soát", 40, p(40)], ["Hệ thống, tin nhắn, AI", "Hệ thống", None, HE]],
 "Đơn thất bại, hủy": [["Tìm nguồn không thành", "Nhân viên", 90, p(90)], ["Hướng dẫn, trả lời", "Nhân viên", 30, p(30)], ["Hệ thống", "Hệ thống", None, HE // 2]]}
uoc = []
for ten, ds in nhom.items():
    tong = sum(x[3] for x in ds)
    uoc.append({"ten": ten, "viec": [[a, b, f"{m} phút" if m else "—", tien(v)] for a, b, m, v in ds], "tong": tien(tong), "tong_so": tong})
TL, TS, TB = (u["tong_so"] for u in uoc)
D["chi_phi"] = {
 "y": "Q24 đo chi phí phục vụ để kiểm phí giới thiệu có đủ trả cho phạm vi đã hứa không. Không đòi thu thêm phí theo sát.",
 "don_vi": [["Mua từng đợt", "Một giao dịch, gồm công tìm nguồn trước ký và việc phát sinh sau giao"],
            ["Đơn lớn, nhiều nguồn, nhiều chuyến", "Cả giao dịch và từng nguồn, từng chuyến"],
            ["Tìm nguồn định kỳ", "Một khách trong tháng, đồng thời xem từng đợt giao"]],
 "khoan": ["Công tìm nguồn, gọi điện, hướng dẫn, sửa thỏa thuận, đối soát", "Xác minh ban đầu, hiện trường, lấy mẫu, đi lại",
           "Theo sát, bàn giao ca, duy trì người trực", "Hệ thống, tin nhắn, cuộc gọi, AI, kết nối đối tác",
           "Công cho yêu cầu không thành đơn, đơn hủy, xử lý sự cố (không bỏ quên)", "Phí xe, kiểm nghiệm, kho, bảo hiểm khách trả thẳng đối tác: KHÔNG tính, trừ phần AgiViet thực chịu, hỗ trợ hoặc bồi hoàn"],
 "phan_bo": ["Một người trực 8 giờ theo dõi nhiều đơn: chia chi phí ca, không tính 8 giờ cho từng đơn.", "Đi hiện trường riêng cho một đơn: ghi công và chi phí riêng của đơn đó.",
             "Giờ không có sự cố vẫn là chi phí duy trì năng lực trực.", "Phí chưa đủ: điều chỉnh báo giá hoặc phạm vi TRƯỚC khi nhận cam kết; giữ nguyên nghĩa vụ đã hứa."],
 "vi_du": "Phí AgiViet hưởng 1.000.000 − chi phí phục vụ và trực phân bổ 700.000 = còn 300.000 góp vào chi phí chung. Chưa phải lợi nhuận: còn tìm khách, xác minh ban đầu, phát triển nền tảng, quản lý. Tiền hàng, cọc không phải doanh thu AgiViet; hoa hồng ngân hàng chưa thỏa thuận không đưa vào doanh thu cơ sở.",
 "uoc": uoc,
 "ghi_uoc": (f"Dự toán giả định (giờ nhân viên {tien(GIO)}). Đơn thất bại không thu phí: chi phí của nó phải phân bổ vào đơn thành. Ví dụ cứ 3 đơn thuận lợi có 1 đơn thất bại: "
             f"mỗi đơn thuận lợi cần gánh {tien(TL)} + {tien(TB)} ÷ 3 = {tien(TL + TB // 3)}. Thay bằng số thật khi pilot; theo dõi phí đã thu, không chỉ phí đã xuất hóa đơn.")}

D["phien_ban"] = "21 · 28/10/2026"
D["nguon_chinh"] += " Bản 21: Q24 thành phương pháp đo chi phí phục vụ, bảng dự toán 3 nhóm đơn, vai trò ≠ số người, \"không thu riêng\", công suất ca, hướng xử lý từng nhóm Q."
C.luu("21")
print({u["ten"]: u["tong"] for u in uoc})
