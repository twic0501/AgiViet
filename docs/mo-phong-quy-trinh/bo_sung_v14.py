# BẢN 14 (28/10/2026), chạy SAU bo_sung_v13.py. Theo rà bản 13: không ký chỉ ghi lịch sử, không tự trừ uy tín;
# nhánh B bỏ cuộc tách "không ký" và "đã ký chưa cọc" (nối nhánh cọc; chờ đối soát thì chưa nhả lượng).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim
C.NG[:] = ["Góp ý 28/10 (rà bản 13)"]

t = TH["de-nghi-bo-cuoc"]
k = tim("de-nghi-bo-cuoc", "Quá hạn, B không ký")
t["buoc"][k].update(viec="Quá hạn, B không ký: hủy giữ, ghi lịch sử hết hạn và lý do",
  chi_tiet="Không tự trừ uy tín: B có thể không đồng ý bản cuối, chưa được duyệt nội bộ, hoặc gặp lỗi hệ thống. Chỉ khi giữ hàng rồi bỏ nhiều lần mới xét theo tiêu chí riêng, B được giải trình.")
t["buoc"][k + 1:k + 1] = [
  B("app", "Nếu B đã ký nhưng chưa cọc: theo nhánh cọc", o_dau="he_thong",
    chi_tiet="Chưa chuyển → \"Quá hạn cọc\"; chuyển thiếu → \"Cọc thiếu, không bù tới hạn\"; ngân hàng báo trễ → \"Tiền vào trước hạn nhưng ngân hàng báo trễ\". Đang chờ đối soát cọc thì CHƯA nhả lượng cho A, tránh cam kết cùng một lượng cho hai bên. Chỉ nhả khi nhánh cọc kết luận đóng đơn.")]
t["mo_ta"] = "Tiếp nhánh nhiều đề nghị: B quá hạn. Không ký: giải phóng đúng lượng giữ. Đã ký chưa cọc: theo nhánh cọc, chờ đối soát thì chưa nhả. Hỏi lại A chỉ khi đề nghị A còn hiệu lực."
D["he_thong"]["quy_tac"].append(["Hết hạn không ký", "Ghi lịch sử và lý do, không tự trừ uy tín. Hành vi giữ hàng rồi bỏ nhiều lần xét theo tiêu chí riêng, có giải trình."])

D["phien_ban"] = "14 · 28/10/2026"
D["nguon_chinh"] += " Bản 14: không ký chỉ ghi lịch sử; đã ký chưa cọc nối nhánh cọc, chờ đối soát chưa nhả lượng."
C.luu("14")
