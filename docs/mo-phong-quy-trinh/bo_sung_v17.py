# BẢN 17 (28/10/2026), chạy SAU bo_sung_v16.py. Theo rà bản 16: bài chạy 3 ngày đưa trả sớm, cam kết và giảm lượng về
# ngày 2 (trước/sau hạn chốt 14:00 cho chuyến ngày 3); hạn trả A tính 3 ngày từ lúc chốt nghiệm thu, đến hạn 17:00.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, sua
C.NG[:] = ["Góp ý 28/10 (rà bản 16)"]
TH_ = "dinh-ky-3-ngay"
HAN = "Hạn trả A: 3 ngày tính từ lúc chốt nghiệm thu, đến hạn 17:00. Khoản ngày 1 → ngày 4; ngày 2 → ngày 5; ngày 3 → ngày 6."

sua(TH_, "Ngày 1: giao đủ", chi_tiet="Giao trước 8:00. B nhận 40 triệu trước bàn giao; C nhận 20 triệu từ ngân hàng sau nghiệm thu; A ghi nợ 40 triệu, hạn 17:00 ngày 4. Công nợ A: 40/80. " + HAN)
sua(TH_, "Lập ngày 3", viec="Ngày 2, 13:00 (trước hạn chốt 14:00): lập chuyến ngày 3; A muốn 2 tấn nhưng chỉ còn 10 triệu mức nợ")
sua(TH_, "trả A khoản ngày 1", viec="Ngày 2, 13:20: bên mua trả A khoản ngày 1 (40 triệu), sớm 2 ngày so với hạn ngày 4")
sua(TH_, "A xác nhận đã nhận", viec="Ngày 2, 13:40: A xác nhận đã nhận; công nợ 30/80; cam kết 2 tấn cho ngày 3 trước hạn chốt")
sua(TH_, "giảm từ 5 xuống 3 tấn", viec="Ngày 2, 16:00 (sau hạn chốt): bên mua xin giảm chuyến ngày 3 từ 5 xuống 3 tấn")
sua(TH_, "Hỏi B và C", viec="Ngày 2, 16:05: hỏi B và C (đề nghị cắt B 1 tấn, C 1 tấn)")
sua(TH_, "C đã hái 1 tấn", viec="Ngày 2, 17:00: C đã hái 1 tấn, báo chi phí hái, bốc 1.500.000 kèm ảnh; B chưa hái, đồng ý giảm")
sua(TH_, "Chọn: vẫn nhận 1 tấn", viec="Ngày 2, 18:00: bên mua chọn vẫn nhận 1 tấn của C, chỉ giảm B 1 tấn")
sua(TH_, "Ngày 3 giao 4 tấn", viec="Ngày 3: giao 4 tấn trước 8:00; A còn nợ 70/80",
    chi_tiet="Lịch mới không xóa nghĩa vụ cũ. Bảng của A: đã giao 5,5 tấn (110 triệu), đã nhận 40 triệu, còn nợ 30 triệu (khoản ngày 2, hạn 17:00 ngày 5) + 40 triệu (khoản ngày 3, hạn 17:00 ngày 6). " + HAN)

D["phien_ban"] = "17 · 28/10/2026"
D["nguon_chinh"] += " Bản 17: sửa mốc giờ bài chạy 3 ngày (cam kết và giảm lượng ở ngày 2 theo hạn chốt), hạn trả A ngày 4/5/6 lúc 17:00."
C.luu("17")
