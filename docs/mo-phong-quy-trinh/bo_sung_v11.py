# BẢN 11 (28/10/2026), chạy SAU bo_sung_v10.py. Theo hai góp ý về thị trường: nông dân được lợi gì (bảng khó khăn →
# đã có → còn thiếu), cơ chế chống ép giá, 6 quyết định thị trường, chỉ số pilot; Q10 viết lại: theo sát đơn nằm trong
# phí giới thiệu, bàn giao xuyên ca; nhánh theo sát đơn lớn.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, B, them
C.NG[:] = ["Góp ý 28/10 (thị trường, theo sát đơn)"]
NGUON = "Góp ý 28/10 (thị trường, theo sát đơn)"

# ---------- Phần thị trường (hiện đầu khung Việc cần chốt) ----------
D["thi_truong"] = {
 "y_chinh": "Nông dân phải có lựa chọn đầu ra thật và biết mình thực nhận bao nhiêu. Giá tham khảo, giá kín, hợp đồng rõ chỉ hỗ trợ việc đó. Bản này mới giải thích rõ giao dịch diễn ra thế nào; chưa chứng minh vì sao hai bên chọn AgiViet.",
 "bang": [
  ["Ít người mua, phụ thuộc một đầu mối", "Ghép nguồn, gợi ý 2–3 bên", "Số lựa chọn mua được thật trong thời gian hàng còn bán được; không có bên phù hợp thì ai xử lý tiếp"],
  ["Không biết giá nào có lợi", "Giá tham khảo, giá thấp nhất kín", "So tiền ròng sau vận chuyển, phân loại, hao hụt, phí, thời gian nhận tiền"],
  ["Bị hạ loại, trừ cân để giảm giá", "Tiêu chí, cân đối chứng, kiểm định", "Chuẩn từng mặt hàng; theo dõi bên mua hay điều chỉnh bất hợp lý; đưa kết quả về hệ thống ghép"],
  ["Hàng nhỏ lẻ không đủ đơn lớn", "Nhiều trang trại cùng đáp ứng", "Điều kiện đồng đều, chi phí ghé nhiều điểm, thay phần thiếu không ảnh hưởng phần đã đạt"],
  ["Cần bán gấp, dễ bị ép giá", "Bán gấp, kho lạnh, sơ chế", "Nguồn mua dự phòng, năng lực dịch vụ thật; so tiền bán ngay với chi phí giữ hàng"],
  ["Được mùa, nhiều nơi cùng dư", "Tin vụ mùa, nhu cầu mua", "Nhu cầu trước thu hoạch, thời điểm cần, lượng đã cam kết, lượng còn thiếu"],
  ["Giao dịch xong rồi ra ngoài", "Mua lại, báo cáo, điều phối định kỳ", "Giá trị đủ rõ để khách tiếp tục trả phí: bớt công tìm nguồn, bớt thiếu hàng, bớt tranh chấp"]],
 "chong_ep_gia": [
  ["Không biến gợi ý thành cuộc đua giá thấp", "Không công khai ai đang rẻ nhất; không thúc người bán hạ giá để được hiển thị."],
  ["Giá thấp nhất là lựa chọn riêng của người bán", "App cảnh báo, giải thích; không tự đặt một giá sàn chung thay người bán."],
  ["So đề nghị bằng tiền thực nhận", "Khác điều kiện lấy hàng, loại, cách trả thì không so chỉ bằng đ/kg."],
  ["Trả phí không mua được quyền gây bất lợi", "Gói cao hơn có thêm dịch vụ, điều phối; không được ưu tiên ép giá, hạ loại hay thắng tranh chấp."]],
 "luu_y": "Giá giảm do dư cung khác với ép giá bằng thông tin sai, trừ cân, hạ loại không căn cứ. Mục tiêu: giảm bất lợi khi thương lượng, tăng cơ hội bán; không hứa \"hết được mùa mất giá\". Thông tin giá riêng lẻ chưa đủ cải thiện tiền bán (nghiên cứu ở Ấn Độ, chưa kiểm cho Việt Nam).",
 "chi_so": ["Tiền ròng/kg ở điều kiện tương đương", "Thời gian tìm được người mua", "Tỷ lệ lượng bán được", "Khoản bị giảm sau kiểm hàng", "Thời gian nhận tiền",
            "Khách quay lại trả phí", "Chi phí phục vụ mỗi đơn (giờ nhân viên, chuyến hiện trường, ca đêm) so với phí thu"]}
D["he_thong"]["quy_tac"].append(["Gợi ý công bằng", "Gợi ý theo phù hợp (mặt hàng, loại, lượng, thời điểm, khoảng cách, uy tín, tiền thực nhận); không xếp chỉ theo giá thấp, không theo mức phí khách trả. Không công khai người bán rẻ nhất."])

# ---------- Q10 viết lại ----------
for c in D["can_chot"]:
    if c["ma"] == "Q10":
        c.update(chu_de="Phân công theo sát đơn và trực xuyên ca", loai="sang_lap", nhom="V1", can_cu=NGUON, tinh_huong=["theo-sat-don", "ngoai-gio", "quan-tri"],
          lua_chon=[["Đơn thông thường", "Hệ thống theo dõi, nhân viên hỗ trợ theo việc, có trực khẩn. Trong phí giới thiệu."],
                    ["Đơn lớn hoặc cần theo sát", "Người phụ trách chính + người thay ca, bàn giao xuyên ca, chủ động theo mốc. Bao gồm trong phí giới thiệu."],
                    ["Yêu cầu vượt phạm vi", "Thêm người hiện trường, thêm điểm kiểm ngoài kế hoạch: báo giá, khách chấp thuận trước."],
                    ["Ngưỡng phân cấp người duyệt", "Lệnh ngoại lệ: người duyệt khác người đề xuất; tiền càng lớn người duyệt càng cao."]],
          de_xuat=("Đơn đạt điều kiện được bố trí người phụ trách chính và người thay ca, luôn có đầu mối theo dõi trong thời gian đã cam kết. Chi phí theo sát nằm trong phí giới thiệu. "
                   "Xác định trước phạm vi hiện trường, mức theo dõi, thời gian phản hồi, đầu mối chuyển cấp. Chỉ thu thêm cho yêu cầu ngoài phạm vi khách đã chấp thuận. "
                   "Tiền xe, kiểm nghiệm, kho, bảo hiểm của đối tác tính riêng. Mức tiền, ngưỡng đơn để phần định giá."),
          bang_chung="Điều kiện không chỉ là đơn lớn: hàng dễ hỏng, nhiều điểm lấy, chuyến đêm, bảo hiểm phức tạp.")

# ---------- 6 quyết định thị trường ----------
n = len(D["can_chot"])
for i, (chu, lc, dx) in enumerate([
  ("Vùng và nhóm hàng khởi đầu", [["Thanh long Bình Thuận → Long An (đang mô phỏng)", "Cần xác nhận đủ bên mua, người vận hành, đối tác"]], "Chọn theo nơi có đủ bên mua thật và đối tác xe, kiểm định."),
  ("Người bán khó nhất mà AgiViet phục vụ được", [["Lượng nhỏ", ""], ["Thiếu đầu ra", ""], ["Thiếu tiêu chuẩn", ""], ["Thiếu khả năng thương lượng", ""]], "Chọn một nhóm chính cho pilot."),
  ("Bên mua trả tiền để bớt việc gì", [["Tìm nguồn", ""], ["Xác minh", ""], ["Điều phối", ""], ["Theo sát đơn", ""]], "Phỏng vấn bên mua trước pilot."),
  ("Không ghép được thì xử lý ra sao", [["Mở rộng vùng", ""], ["Đổi quy cách khi người bán đồng ý", ""], ["Nguồn chế biến", ""], ["Dừng tìm, báo người bán", ""]], "Có hạn rõ để người bán còn kịp bán chỗ khác."),
  ("Quy tắc gợi ý công bằng", [["Theo phù hợp + tiền thực nhận", "Không chỉ theo giá thấp hay phí khách trả"]], "Ghi thành quy tắc hệ thống (đã thêm, chờ duyệt)."),
  ("Chi phí phục vụ mỗi đơn", [["Phí thu − nhân sự, chuyến hiện trường, ca đêm = phần còn lại", "Đơn lớn phí cao chưa chắc lãi cao"]], "Đo trong pilot trước khi đặt mức phí.")], 1):
    D["can_chot"].append({"ma": f"Q{n + i:02d}", "chu_de": chu, "loai": "gop_y", "nhom": "PILOT", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập",
      "han": "", "pham_vi": "Thị trường, pilot", "tinh_huong": [], "bang_chung": "", "lua_chon": lc, "de_xuat": dx, "can_cu": NGUON})

# ---------- Nhánh theo sát đơn lớn ----------
D["van_hanh"]["quy_tac"].append(["Bàn giao ca theo sát", "Luôn có người nhận trách nhiệm theo dõi, không bắt một người thức cả đêm. Đổi ca phải ghi: tình trạng hàng, tiền, sự cố, việc tiếp theo, người nhận ca xác nhận. Thưởng nhân viên không gắn với ép giá hay kết quả tranh chấp."])
them("theo-sat-don", "Đơn lớn được theo sát xuyên ca", "giao_ngay_bien",
  "Đơn 20 tấn, chuyến đêm, hàng dễ hỏng: đạt điều kiện theo sát. Việc theo sát nằm trong phí giới thiệu; tiền xe, kho, bảo hiểm của đối tác tính riêng.",
  [B("app", "Đơn đạt điều kiện theo sát: phân công người chính + người thay ca", o_dau="he_thong", luong=[("tin", "nv", "phân công")], tt="Đã cọc, chờ giao",
     chi_tiet="Ghi phạm vi: theo mốc bốc, giao, kiểm, tiền, bảo hiểm; hiện trường ở điểm bốc; thời gian phản hồi 15 phút; đầu mối chuyển cấp."),
   B("nv", "Người chính có mặt điểm bốc; chủ động kiểm mốc", o_dau="nhan_vien", nv="Theo sát: liên hệ hai bên, nhà xe, kho, kiểm định."),
   B("nv", "22:00 đổi ca: bàn giao hồ sơ", o_dau="nhan_vien", luong=[("giay", "nv", "hàng, tiền, sự cố, việc tiếp theo")], nv="Người thay ca xác nhận nhận ca; từ đây là đầu mối."),
   B("dt", "2:00 nhà xe báo hỏng giữa đường", o_dau="ngoai_app", luong=[("tin", "nv", "sự cố")], chi_tiet="Đêm vẫn có đầu mối đang nhận trách nhiệm."),
   B("nv", "Điều xe thay trong giới hạn chi khẩn đã duyệt; giữ chứng cứ", o_dau="nhan_vien", luong=[("tin", "mua", "báo trễ 3 giờ"), ("tin", "ban", "báo sự cố")],
     nv="Không được: ký thay, đổi giá, xác nhận tiền không căn cứ, tự quyết bồi thường.", chi_tiet="Ảnh, giờ, vị trí, biên bản nhà xe; tiền xe thay là chi phí đối tác, tính theo hợp đồng vận chuyển."),
   B("nv", "Gửi thông báo bảo hiểm đúng hạn", o_dau="nhan_vien", luong=[("giay", "app", "hồ sơ bảo hiểm")], chi_tiet="Dịch vụ bảo đảm làm đúng việc giám sát; không bảo đảm bảo hiểm sẽ chi trả."),
   B("mua", "Nhận hàng, nghiệm thu theo luồng thường", luong=[("tin", "app", "đã nhận")], tt="Đang giao"),
   B("app", "Hết mốc đã cam kết: kết thúc dịch vụ theo sát", o_dau="he_thong", chi_tiet="Hồ sơ sự cố, bảo hiểm còn mở thì chuyển hàng việc thường có người phụ trách.")],
  vi_du={}, tt=["Đã cọc, chờ giao", "Đang giao"], vai=["app", "nv", "dt", "mua", "ban"], sau="ngan-hang-bao-sau-huy")

D["phien_ban"] = "11 · 28/10/2026"
D["nguon_chinh"] += " Bản 11: phần thị trường (lợi ích nông dân, chống ép giá, chỉ số pilot), Q10 theo sát đơn trong phí giới thiệu, 6 quyết định thị trường, nhánh theo sát xuyên ca."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("11")
