# BẢN 16 (28/10/2026), chạy SAU bo_sung_v15.py. Theo rà bản 15: ba lịch tiền A/B/C tách đúng thứ tự; nguồn thay phải qua
# kiểm điều kiện giao chung; giá tối đa không ép hạ giá; bài chạy 3 ngày (công nợ chồng, mức cho nợ, thay nguồn giá cao,
# giảm lượng sau hạn chốt).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim, them
NGUON = "Góp ý 28/10 (rà bản 15)"
C.NG[:] = [NGUON]

D["he_thong"]["quy_tac"] += [
  ["Điều kiện giao chung", "Mọi nguồn (kể cả nguồn thay) chỉ được giao khi: thỏa thuận có hiệu lực, tiền hoặc bảo đảm theo cách trả đã chọn, hồ sơ và kết quả bên mua yêu cầu trước giao đã có, giao kịp giờ. \"Đủ nguồn cam kết\" chưa phải \"được phép giao\"."],
  ["Mức cho nợ của người bán", "Đồng ý trả sau N ngày không có nghĩa cho nợ không giới hạn. Mỗi người bán đặt mức nợ tối đa; công nợ chồng các đợt chưa trả + đợt mới không vượt mức này. Lập lịch ngày mai không làm mất nghĩa vụ ngày hôm qua."],
  ["Giá tối đa của bên mua", "Chỉ là giới hạn để AgiViet tự tổ chức nguồn không cần xin duyệt; không dùng để buộc người bán hạ giá. Chọn nguồn theo chất lượng, lịch, độ ổn định và tiền ròng người bán chấp thuận."]]

# 1. Ba lịch tiền
t = TH["dinh-ky-tra-tien"]
t["mo_ta"] = "Bên mua muốn trả gộp cuối tháng; từng người bán chọn lịch riêng. Một bảng kê chung không gộp các hạn khác nhau thành một lần chuyển. Tranh chấp một nguồn không khóa tiền các nguồn khác."
t["buoc"] = [
  B("mua", "Đề nghị trả gộp cuối tháng", luong=[("tin", "app", "trả 30 ngày")]),
  B("app", "Hỏi từng người bán chấp thuận kỳ trả, trước khi cam kết", o_dau="he_thong", luong=[("tin", "ban", "kỳ trả đề nghị")], chi_tiet="Không tự áp một kỳ cho mọi nguồn."),
  B("ban", "B: trả trước bàn giao · C: nhận ngay sau nghiệm thu · A: trả trong 3 ngày, nợ tối đa 80 triệu", luong=[("tin", "app", "lịch từng người")],
    chi_tiet="C cần nhận ngay mà bên mua trả 30 ngày: chỉ được khi đã có phương án tài trợ ngân hàng (Q04). Chưa có thì C chọn cách trả khác trước khi cam kết, hoặc không nhận đợt này."),
  B("mua", "6:00 chuyển B 40.000.000 trước bàn giao", o_dau="ngoai_app", luong=[("tien", "ban", "40.000.000 đ → B")]),
  B("ban", "B thấy đủ tiền, xác nhận; mới bàn giao", luong=[("hang", "mua", "2 tấn B")], chi_tiet="Thiếu tiền thì B chưa bàn giao."),
  B("mua", "Nghiệm thu A, B, C đạt", luong=[("tin", "app", "đạt")]),
  B("nh", "C: ngân hàng trả C 20.000.000 sau nghiệm thu; bên mua trả ngân hàng sau 30 ngày", o_dau="ngan_hang", luong=[("tien", "ban", "20.000.000 đ → C")]),
  B("app", "A: ghi khoản 40.000.000, hạn 3 ngày; công nợ A 40/80 triệu", o_dau="he_thong", luong=[("tin", "ban", "hạn trả A")]),
  B("mua", "Ngày thứ 3: chuyển A 40.000.000", o_dau="ngoai_app", luong=[("tien", "ban", "40.000.000 đ → A")], chi_tiet="Bảng kê tháng gộp để đối chiếu; mỗi dòng có hạn và trạng thái riêng."),
  B("mua", "Khiếu nại 200 kg của B bị dập", luong=[("tin", "app", "khiếu nại B")]),
  B("app", "B đã nhận đủ: khoản 4.000.000 thành nghĩa vụ hoàn nếu B sai; A, C không bị khóa", o_dau="he_thong", luong=[("tin", "ban", "B: 36.000.000 công nhận, 4.000.000 đang tranh chấp")],
    chi_tiet="Không giữ tiền kỳ sau của B khi chưa có kết luận. Kết luận B sai: B hoàn có hạn (như nhánh người bán đã nhận nhiều hơn)."),
  B("app", "Bảo đảm dùng chung: ghi phần đã phân bổ, phần còn dùng được", o_dau="he_thong", chi_tiet="Một khoản bảo đảm không tính cho nhiều chuyến cùng lúc.")]

# 2. Nguồn thay qua điều kiện giao chung
t = TH["dinh-ky-thieu-luong"]
k = tim("dinh-ky-thieu-luong", "D xác nhận 0,5 tấn")
t["buoc"][k + 1:k + 1] = [B("app", "Kiểm điều kiện giao chung cho D", o_dau="he_thong", luong=[("tin", "nv", "đạt / chưa đạt")],
  chi_tiet="Thỏa thuận có hiệu lực; cách trả D chấp thuận; hồ sơ và kết quả lô (D đang chờ kết quả mà bên mua yêu cầu có trước thì chưa được giao); giao kịp 8:00. Chưa đạt thì D không tính là hàng sẵn sàng.")]

# 3. Bài chạy 3 ngày
them("dinh-ky-3-ngay", "Định kỳ chạy 3 ngày: công nợ chồng, thay nguồn, giảm lượng sau hạn chốt", "dinh_ky",
  "Mỗi ngày 5 tấn (A 2 · B 2 · C 1, 20.000 đ/kg). A nhận tiền sau 3 ngày, nợ tối đa 80 triệu; B trước bàn giao; C qua ngân hàng sau nghiệm thu. Số giả định.",
  [B("app", "Ngày 1: giao đủ 5 tấn, nghiệm thu đạt", o_dau="he_thong", tt="Đang giao",
     chi_tiet="B nhận 40 triệu trước bàn giao; C nhận 20 triệu từ ngân hàng sau nghiệm thu; A ghi nợ 40 triệu, hạn ngày 4. Công nợ A: 40/80."),
   B("ban", "Ngày 2, 5:00: A báo chỉ có 1,5 tấn", luong=[("tin", "app", "thiếu 0,5 tấn")], tt="Thiếu nguồn"),
   B("ban", "D nhận bù 0,5 tấn giá 20.500 (trong giới hạn 21.000)", luong=[("tin", "app", "cam kết")],
     chi_tiet="Phần tăng 0,5 tấn × 500 = 250.000: bên mua chịu, vì nằm trong phạm vi giá đã giao. A không bị phạt tiền phần thiếu vì đã báo trước giờ hạn; ghi lịch sử."),
   B("app", "Kiểm điều kiện giao chung cho D: đạt", o_dau="he_thong", tt="Đủ nguồn cam kết"),
   B("app", "Ngày 2 giao xong: A ghi nợ 30 triệu (1,5 tấn)", o_dau="he_thong", chi_tiet="Công nợ A: 40 + 30 = 70/80. D trả trước bàn giao 10.250.000."),
   B("app", "Lập ngày 3: A muốn giao 2 tấn (40 triệu) nhưng chỉ còn 10 triệu mức nợ", o_dau="he_thong", luong=[("tin", "mua", "A chỉ nhận được 0,5 tấn nếu chưa trả")],
     chi_tiet="70 + 40 = 110 > 80: chưa được cam kết đủ. Hoặc bên mua trả trước khoản ngày 1, hoặc A giao 0,5 tấn, hoặc A tự nâng mức nợ."),
   B("mua", "Ngày 3, 7:00: trả A khoản ngày 1 (40 triệu) sớm 1 ngày", o_dau="ngoai_app", luong=[("tien", "ban", "40.000.000 đ → A")]),
   B("ban", "A xác nhận đã nhận; công nợ A 30/80; cam kết 2 tấn ngày 3", luong=[("tin", "app", "cam kết 2 tấn")]),
   B("mua", "Ngày 3, 16:00 (sau hạn chốt 14:00): giảm từ 5 xuống 3 tấn", luong=[("tin", "app", "giảm 2 tấn")], tt="Đã chốt nhu cầu",
     chi_tiet="Sau hạn chốt nên không tự sửa: cần người bán bị ảnh hưởng đồng ý; chi phí đã phát sinh bên mua chịu theo Q26."),
   B("app", "Hỏi B và C (đề nghị cắt B 1 tấn, C 1 tấn)", o_dau="he_thong", luong=[("tin", "ban", "đề nghị giảm + chi phí")]),
   B("ban", "C đã hái 1 tấn: báo chi phí hái, bốc 1.500.000 kèm ảnh; B chưa hái: đồng ý giảm", luong=[("giay", "app", "chi phí có chứng cứ")]),
   B("mua", "Chọn: vẫn nhận 1 tấn của C (đã hái), chỉ giảm B 1 tấn", luong=[("tin", "app", "nhận C")],
     chi_tiet="Cách khác: không nhận, trả C 1.500.000 chi phí đã xác nhận; nhân viên giúp C bán 1 tấn nơi khác. C không đồng ý cả hai: giữ đơn như đã chốt."),
   B("app", "Ngày 3 giao 4 tấn; ngày 4 đến hạn trả A khoản ngày 2", o_dau="he_thong", tt="Đang giao",
     chi_tiet="Lịch ngày 4 không xóa nghĩa vụ ngày 2, 3. Bảng của A: đã giao 5,5 tấn, đã nhận 40 triệu, còn nợ 30 + 40 = 70/80.")],
  vi_du={}, tt=["Đang giao", "Thiếu nguồn", "Đủ nguồn cam kết", "Đã chốt nhu cầu"], vai=["app", "ban", "mua"], sau="dinh-ky-tra-tien")
for c in D["can_chot"]:
    if c["chu_de"] in ("Hạn chốt và hạn thay đổi nhu cầu định kỳ", "Tìm nguồn định kỳ: phạm vi AgiViet được tự tổ chức"):
        c["tinh_huong"] = list(dict.fromkeys(c["tinh_huong"] + ["dinh-ky-3-ngay"]))

D["phien_ban"] = "16 · 28/10/2026"
D["nguon_chinh"] += " Bản 16: ba lịch tiền tách đúng thứ tự, điều kiện giao chung cho nguồn thay, mức cho nợ, bài chạy 3 ngày, giảm lượng sau hạn chốt."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("16")
