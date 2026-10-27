# BẢN 12 (28/10/2026), chạy SAU bo_sung_v11.py. Theo rà bản 11: theo sát đơn đồng bộ ở Dịch vụ, bảng nhân sự, hồ sơ đơn;
# Q10 tách nguyên tắc đã chốt / mức chờ chốt; nhánh theo sát có phạm vi từ đầu và điều kiện kết thúc; nhánh thiếu người
# theo sát; hai tình huống tìm đầu ra (nhiều đề nghị so tiền ròng, không tìm được đầu ra).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, them
C.NG[:] = ["Góp ý 28/10 (rà bản 11)"]
PHAM_VI = "từ xác nhận người đến điểm bốc tới khi người bán nhận đủ tiền hàng; hồ sơ bảo hiểm theo tới khi nộp đủ giấy tờ"

# 1. Một định nghĩa ở ba nơi
D["dich_vu"]["ds"].append(["Theo sát đơn", "Người phụ trách chính + người thay ca, chủ động kiểm mốc bốc, giao, nghiệm thu, tiền; giữ chứng cứ, hỗ trợ hồ sơ bảo hiểm; điều phối khẩn trong giới hạn chi đã duyệt. Phạm vi: " + PHAM_VI + ".",
                           "Đơn đạt điều kiện (lớn, dễ hỏng, nhiều điểm, chuyến đêm, bảo hiểm phức tạp)", "Nhân viên AgiViet",
                           "Nằm trong phí giới thiệu. Ngoài phạm vi: báo giá, khách chấp thuận trước. Xe, kho, kiểm nghiệm, bảo hiểm của đối tác tính riêng.",
                           "Xác nhận đủ người trước khi cam kết; chạy theo phạm vi đã ghi", "sang_lap"])
D["van_hanh"]["bang_vai"].append(["Người phụ trách đơn (theo sát)", "Kiểm mốc chủ động, liên hệ hai bên và đối tác, giữ chứng cứ, chuyển cấp; bàn giao ca có xác nhận",
                                  "Trang vận hành: hồ sơ đơn theo sát, sổ bàn giao ca", "Không (chỉ đề xuất lệnh ngoại lệ)", "Xuyên ca trong thời gian dịch vụ; ca trước giữ trách nhiệm tới khi ca sau nhận"])
D["van_hanh"]["quy_tac"].append(["Nhận ca theo sát", "Ca trước còn trách nhiệm tới khi ca sau xác nhận nhận ca hoặc người dự phòng tiếp quản. 15 phút ca sau chưa nhận: báo trưởng ca. Mất liên lạc giữa sự cố: trưởng ca tiếp quản ngay."])
D["van_hanh"]["quy_tac"].append(["Năng lực trước cam kết", "Chỉ nhận theo sát khi đã có người chính, người thay ca, người dự phòng cho cả thời gian dịch vụ. Không đủ người: báo khách trước khi ký, đề nghị đổi ngày hoặc phạm vi; không đợi tới lúc bốc hàng."])

# Q10: tách nguyên tắc đã chốt / mức chờ chốt
for c in D["can_chot"]:
    if c["ma"] == "Q10":
        c["trang_thai"] = "Đã chốt nguyên tắc · chờ chốt mức"
        c["de_xuat"] = ("ĐÃ CHỐT (người sáng lập): theo sát nằm trong phí giới thiệu; có người chính + thay ca, luôn có đầu mối trong thời gian cam kết; chỉ thu thêm cho yêu cầu ngoài phạm vi đã chấp thuận; chi phí đối tác tính riêng. "
                        "CHỜ CHỐT: ngưỡng đơn được theo sát, thời gian phản hồi (đang giả định 15 phút), giới hạn chi khẩn, mức báo giá ngoài phạm vi.")

# 2. Nhánh theo sát: phạm vi từ đầu, có mốc tiền, điều kiện kết thúc
t = TH["theo-sat-don"]
t["mo_ta"] = "Đơn 20 tấn, chuyến đêm, hàng dễ hỏng. Phạm vi ghi từ đầu: " + PHAM_VI + ". Nằm trong phí giới thiệu; tiền xe, kho, bảo hiểm của đối tác tính riêng."
t["buoc"] = [
  B("app", "Trước khi ký: kiểm đủ người chính, thay ca, dự phòng", o_dau="he_thong", luong=[("tin", "nv", "lịch trực")], tt="Hợp đồng chờ ký",
    chi_tiet="Không đủ người: xem nhánh \"Theo sát: thiếu người, ca sau chưa nhận\"."),
  B("app", "Hồ sơ đơn ghi: người phụ trách, số liên hệ, mốc tiếp theo, phạm vi", o_dau="he_thong", luong=[("tin", "mua", "người phụ trách + phạm vi"), ("tin", "ban", "người phụ trách + phạm vi")], tt="Đã cọc, chờ giao",
    chi_tiet="Phạm vi: " + PHAM_VI + ". Thời gian phản hồi 15 phút (giả định)."),
  B("nv", "Người chính có mặt điểm bốc; kiểm mốc bốc", o_dau="nhan_vien", nv="Liên hệ hai bên, nhà xe, kho, kiểm định."),
  B("nv", "22:00 đổi ca: bàn giao; người thay ca xác nhận nhận ca", o_dau="nhan_vien", luong=[("giay", "nv", "hàng, tiền, sự cố, việc tiếp theo")], nv="Hồ sơ đơn đổi người phụ trách; hai bên thấy người mới."),
  B("dt", "2:00 nhà xe báo hỏng giữa đường", o_dau="ngoai_app", luong=[("tin", "nv", "sự cố")]),
  B("nv", "Điều xe thay trong giới hạn chi khẩn đã duyệt; giữ chứng cứ", o_dau="nhan_vien", luong=[("tin", "mua", "báo trễ 3 giờ"), ("tin", "ban", "báo sự cố")],
    nv="Không được: ký thay, đổi giá, xác nhận tiền không căn cứ, tự quyết bồi thường.", chi_tiet="Tiền xe thay là chi phí đối tác, tính theo hợp đồng vận chuyển."),
  B("nv", "Gửi thông báo bảo hiểm đúng hạn", o_dau="nhan_vien", luong=[("giay", "dt", "thông báo tổn thất")], chi_tiet="Bảo đảm làm đúng việc giám sát; không bảo đảm bảo hiểm sẽ chi trả."),
  B("mua", "Nhận hàng, nghiệm thu đạt", luong=[("tin", "app", "đạt")], tt="Đang giao"),
  B("nv", "Theo mốc tiền: nhắc bên mua trả phần còn lại trong hạn", o_dau="nhan_vien", luong=[("tin", "mua", "nhắc")], tt="Chờ thanh toán"),
  B("ban", "Xác nhận đã nhận đủ tiền hàng", luong=[("tin", "app", "đã nhận")], tt="Quyết toán cọc"),
  B("nv", "Nộp đủ giấy tờ bảo hiểm (biên bản, ảnh, hóa đơn xe thay)", o_dau="nhan_vien", luong=[("giay", "dt", "hồ sơ đủ")]),
  B("app", "Kiểm điều kiện kết thúc theo sát", o_dau="he_thong", luong=[("tin", "mua", "kết thúc theo sát"), ("tin", "ban", "kết thúc theo sát")],
    chi_tiet="Đủ cả: mọi mốc trong phạm vi đã xong (bốc, giao, nghiệm thu, tiền, nộp hồ sơ bảo hiểm); không còn sự cố khẩn đang mở (còn thì chưa kết thúc); hồ sơ còn lại (chờ bảo hiểm trả lời) có người tiếp nhận xác nhận, hạn tiếp theo, đã báo hai bên.")]
t["trang_thai"] = ["Hợp đồng chờ ký", "Đã cọc, chờ giao", "Đang giao", "Chờ thanh toán", "Quyết toán cọc"]

# 3. Thiếu người theo sát
them("theo-sat-thieu-nguoi", "Theo sát: thiếu người, ca sau chưa nhận, mất liên lạc", "giao_ngay_bien",
  "Các nhánh khi không bố trí được người. Quy tắc: ca trước còn trách nhiệm tới khi ca sau nhận hoặc dự phòng tiếp quản; năng lực xác nhận trước khi cam kết.",
  [B("app", "Ba đơn cùng cần người hiện trường đêm thứ 6; chỉ đủ người cho hai", o_dau="he_thong", luong=[("tin", "qt", "thiếu người")], tt="Hợp đồng chờ ký"),
   B("qt", "Báo khách đơn thứ ba trước khi ký: đổi ngày, hoặc theo sát từ xa (không hiện trường)", o_dau="nhan_vien", luong=[("tin", "mua", "đề nghị"), ("tin", "ban", "đề nghị")],
     chi_tiet="Không cam kết phạm vi không làm được."),
   B("mua", "Chọn theo sát từ xa; phạm vi ghi lại", luong=[("tin", "app", "đồng ý")]),
   B("nv", "22:00 ca trước bàn giao; ca sau chưa xác nhận", o_dau="nhan_vien", chi_tiet="Ca trước vẫn là người phụ trách trên hồ sơ đơn."),
   B("app", "15 phút chưa nhận ca: báo trưởng ca", o_dau="he_thong", luong=[("tin", "qt", "chưa nhận ca")]),
   B("qt", "Giao người dự phòng; dự phòng xác nhận nhận ca", o_dau="nhan_vien", luong=[("tin", "nv", "nhận ca")], nv="Từ đây ca trước mới hết trách nhiệm."),
   B("nv", "1:30 sự cố; người phụ trách không trả lời 15 phút", o_dau="nhan_vien"),
   B("qt", "Trưởng ca tiếp quản ngay, báo hai bên người mới", o_dau="nhan_vien", luong=[("tin", "mua", "người phụ trách mới"), ("tin", "ban", "người phụ trách mới")],
     chi_tiet="Ghi giờ từng lần chuyển; xem lại vì sao mất liên lạc ở họp ca sáng.")],
  vi_du={}, tt=["Hợp đồng chờ ký"], vai=["app", "qt", "mua", "ban", "nv"], sau="theo-sat-don")

# 4. Tìm đầu ra
D["ten_nhom"]["tim_dau_ra"] = "Tìm đầu ra, quyết định bán"
them("nhieu-de-nghi", "Nhiều đề nghị: so tiền ròng, không chỉ đ/kg", "tim_dau_ra",
  "4 tấn thanh long (giả định). Giá chào cao hơn chưa chắc có lợi hơn: app so tiền ròng, thời điểm nhận tiền, điều kiện kiểm và rủi ro; người bán quyết.",
  [B("ban", "Đăng lô 4 tấn, giá thấp nhất kín", luong=[("tin", "app", "lô")]),
   B("mua", "A: 24.000 đ/kg, người bán chở (≈5 triệu), trả trước bàn giao", luong=[("tin", "app", "đề nghị A")]),
   B("mua", "B: 23.000 đ/kg, tự lấy tại vườn, trả trước bàn giao", luong=[("tin", "app", "đề nghị B")]),
   B("app", "Bảng so: A còn 91 triệu, B còn 92 triệu (trước chi phí khác)", o_dau="he_thong", luong=[("tin", "ban", "bảng so")],
     chi_tiet="A: 96.000.000 − 5.000.000 xe = 91.000.000; hao hụt đường dài người bán chịu tới khi giao. B: 92.000.000; rủi ro chuyển cho bên mua tại vườn. "
              "Cùng hiện: lượng nhận, điều kiện kiểm, nơi chốt kết quả, thời điểm nhận tiền, uy tín bên mua. Không xếp hạng người bán theo giá, không lộ đề nghị bên này cho bên kia."),
   B("ban", "Chọn B", luong=[("tin", "app", "chọn B")], chi_tiet="Người bán quyết; app không tự chọn, không thúc hạ giá."),
   B("app", "Báo A không được chọn (không nêu giá B)", o_dau="he_thong", luong=[("tin", "mua", "không chọn")]),
   B("app", "Sang luồng hợp đồng, lấy tại vườn", o_dau="he_thong", chi_tiet="Xem nhánh \"Bên mua đến lấy tại vườn\".")],
  vi_du={}, tt=[], vai=["ban", "mua", "app"])
them("khong-co-dau-ra", "Không tìm được đầu ra", "tim_dau_ra",
  "Lô 6 tấn, hàng còn bán được khoảng 7 ngày (giả định). Có hạn để nhân viên can thiệp; mọi thay đổi do người bán đồng ý; không mặc định giải pháp là hạ giá; không có phương án thì báo sớm.",
  [B("ban", "Đăng lô 6 tấn, cần bán trong 7 ngày", luong=[("tin", "app", "lô, hạn bán")]),
   B("app", "48 giờ không có đề nghị phù hợp: tạo việc cho nhân viên", o_dau="he_thong", luong=[("tin", "nv", "lô chưa có đầu ra")], han="48 giờ (giả định)"),
   B("nv", "Tìm theo thứ tự: mở rộng vùng mua, đổi quy cách, nguồn chế biến", o_dau="nhan_vien", nv="Gọi bên mua đúng nhóm hàng; không gợi ý hạ giá như bước đầu tiên."),
   B("nv", "Đề xuất người bán: tách 2 tấn loại 2 cho nơi chế biến", o_dau="nhan_vien", luong=[("tin", "ban", "đề xuất + tiền ròng từng phương án")]),
   B("ban", "Đồng ý tách lô", luong=[("tin", "app", "đồng ý")], chi_tiet="Không đồng ý thì giữ nguyên; app không tự đổi quy cách hay giá."),
   B("mua", "Nơi chế biến nhận 2 tấn loại 2", luong=[("tin", "app", "đề nghị")], chi_tiet="Sang luồng hợp đồng thường."),
   B("app", "Ngày 4: 4 tấn loại 1 vẫn chưa có đầu ra", o_dau="he_thong", luong=[("tin", "nv", "sắp hết hạn")]),
   B("nv", "Không có phương án khả thi: báo người bán ngay để bán nơi khác", o_dau="nhan_vien", luong=[("tin", "ban", "dừng tìm, lý do")],
     chi_tiet="Báo khi người bán còn 3 ngày để tự bán; gỡ giữ lô, không ràng buộc. Ghi lý do (thiếu nhu cầu vùng, quy cách) để cải thiện ghép.")],
  vi_du={}, tt=[], vai=["ban", "app", "nv", "mua"], sau="nhieu-de-nghi")

D["phien_ban"] = "12 · 28/10/2026"
D["nguon_chinh"] += " Bản 12: theo sát đơn đồng bộ ba nơi, Q10 tách đã chốt/chờ chốt, điều kiện kết thúc theo sát, thiếu người theo sát, tìm đầu ra (nhiều đề nghị, không có đầu ra)."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("12")
