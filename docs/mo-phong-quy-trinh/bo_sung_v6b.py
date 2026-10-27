# BẢN 6 phần B (28/10/2026), chạy SAU bo_sung_v6a.py: bên mua đến lấy tại vườn (xe riêng, cân riêng) + biến thể,
# tình huống kết hợp, quy tắc bổ sung, mã việc cần chốt hiện trên từng tình huống.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v6_chung import *

NT_V = 4_950 * 15_000; CON_V = NT_V - COC
them("lay-tai-vuon", "Bên mua đến lấy tại vườn: xe riêng, cân riêng", "thuan",
  "Ba quyết định tách riêng trong phiếu nghĩa vụ. Ai chở: xe bên mua. Chốt ở đâu: kết hợp (cân, ngoại quan chốt tại vườn; dư lượng chờ phòng thử nghiệm). Trả khi nào: trước bàn giao. Mã nhận hàng chỉ xác minh quyền nhận.",
  [B("app", "Phiếu nghĩa vụ: xe bên mua · chốt tại vườn · trả trước bàn giao", o_dau="he_thong", luong=[("giay", "mua", "hợp đồng"), ("giay", "ban", "hợp đồng")], tt="Hợp đồng chờ ký",
     chi_tiet="Ghi rõ: cân quyết toán (cân bên mua đã kiểm định, độ chia 0,1 kg), cân từng sọt, bì 1,2 kg/sọt, ngưỡng lệch theo cách cân; điểm cân độc lập dự phòng; tiêu chí còn kiểm sau và hạn; ai bốc xếp; mốc chuyển rủi ro là bàn giao xong."),
   B("ban", "Hai bên ký", luong=[("tin", "app", "đã ký")], tt="Chờ cọc"),
   B("nh", "Xác nhận cọc", o_dau="ngan_hang", so={"coc_giu": COC}, tt="Đã cọc, chờ giao"),
   B("mua", "Khai người đến, biển số, quyền từng người", luong=[("giay", "app", "danh sách + quyền")],
     chi_tiet="Tài xế: nhận, chở. Người kiểm: ghi kết quả. Đổi lượng, hạ cấp, đổi giá: chỉ người có thẩm quyền (duyệt qua app). Đổi người, xe phải bên mua xác nhận trên đơn."),
   B("ban", "Quét mã, đối chiếu người và biển số", o_dau="ngoai_app", luong=[("tin", "app", "khớp")], moc="6:00", chi_tiet="Mã chỉ xác minh quyền nhận; không xác nhận chất lượng, tiền, hay chuyển rủi ro."),
   B("ban", "Cân của người bán: 5.000 kg", o_dau="ngoai_app", luong=[("tin", "app", "5.000 kg")]),
   B("mua", "Cân của bên mua: 4.850 kg", o_dau="ngoai_app", luong=[("tin", "app", "4.850 kg")]),
   B("app", "Ghi hai kết quả đang lệch; không tự chọn, không lấy trung bình", o_dau="he_thong", luong=[("tin", "ban", "lệch 150 kg"), ("tin", "mua", "lệch 150 kg")]),
   B("ban", "Hai bên kiểm bì, cân lại từng sọt: 4.950 kg", o_dau="ngoai_app", luong=[("tin", "app", "4.950 kg, phiếu cân, ảnh")]),
   B("mua", "Người kiểm ghi ngoại quan đạt; niêm mẫu dư lượng", luong=[("hang", "dt", "mẫu niêm phong")], tt="Chờ người bán xác nhận", so={"phai_tra": NT_V}),
   B("mua", "Người có thẩm quyền xác nhận 4.950 kg đạt", luong=[("tin", "app", "xác nhận")]),
   B("ban", "Chốt số", luong=[("tin", "app", "đã chốt")]),
   B("app", "Tính trả trước bàn giao: " + tien(NT_V) + " − cọc = " + tien(CON_V), o_dau="he_thong", luong=[("tin", "mua", tien(CON_V))], tt="Chờ thanh toán"),
   B("mua", "Chuyển khoản " + tien(CON_V), o_dau="ngoai_app", luong=[("tien", "ban", tien(CON_V))]),
   B("ban", "Thấy đủ tiền, xác nhận; cho bốc", so={"tra_thang": CON_V}, chi_tiet="Thiếu tiền thì chưa bàn giao."),
   B("mua", "Đội bên mua bốc, ký biên bản bàn giao", o_dau="ngoai_app", luong=[("hang", "mua", "4.950 kg"), ("giay", "app", "biên bản bàn giao")], tt="Đang giao",
     chi_tiet="Từ đây rủi ro vận chuyển thuộc bên mua (xe riêng). Hư do đội bốc của bên mua: bên mua chịu."),
   B("dt", "Kết quả dư lượng đạt", o_dau="ngoai_app", luong=[("giay", "app", "đạt")], han="5 ngày (giả định)", chi_tiet="Không đạt thì khiếu nại theo điều khoản tiêu chí còn kiểm, đối chiếu mẫu niêm phong."),
   B("app", "Hết tiêu chí còn kiểm: lệnh chuyển cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh")], tt="Quyết toán cọc"),
   B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Hoàn tất")],
  vi_du={"ma": "HĐ-0103", "gia_tri": GT, "ghi": f"Người bán nhận {tien(CON_V)} + {tien(COC)} = {tien(NT_V)} (4.950 kg × 15.000)."},
  vai=["mua", "ban", "app", "nh", "dt"], sau="chinh")
them("vuon-bien-the", "Lấy tại vườn: sai người, thiếu tải, trả thiếu, về kho báo hỏng", "thuan",
  "Các biến thể gộp để duyệt nhanh; mỗi bước là một nhánh độc lập của luồng lấy tại vườn.",
  [B("ban", "Người đến không có tên trong danh sách", o_dau="ngoai_app", chi_tiet="Không giao; bên mua xác nhận người mới trên đơn thì mới giao."),
   B("mua", "Người kiểm đòi hạ giá tại chỗ", chi_tiet="Người kiểm chỉ ghi đề nghị; người có thẩm quyền duyệt qua app, người bán đồng ý thì soạn bản sửa."),
   B("app", "Hai cân lệch, không có cân độc lập gần", o_dau="he_thong", chi_tiet="Cân lại từng sọt có video; vẫn lệch thì tạm giao theo số thấp hơn, phần chênh ghi tranh chấp, cân đối chứng ở điểm cân độc lập (nếu hợp đồng có)."),
   B("mua", "Xe thiếu tải, chỉ lấy 4 tấn", chi_tiet="Đề nghị giao tiếp 1 tấn sau 2 ngày (giữ lượng) hoặc giảm hợp đồng còn 4 tấn (ký bản sửa, cọc tính lại). Im lặng 24 giờ là không đồng ý."),
   B("mua", "Duyệt chi không liên lạc được, chuyển thiếu", o_dau="ngoai_app", chi_tiet="Chưa đủ tiền thì chưa bàn giao; quá giờ hẹn thì theo điều khoản chờ xe, chờ tiền."),
   B("ban", "Bốc một phần thì phát hiện sai hàng", o_dau="ngoai_app", chi_tiet="Dừng bốc, ghi biên bản phần đã bốc; phần sai trả lại tại chỗ; tính lại số cân trước khi trả tiền."),
   B("mua", "Về kho báo thiếu, hỏng", chi_tiet="Đối chiếu biên bản bàn giao, niêm phong, tiêu chí còn kiểm. Tiêu chí đã chốt tại vườn thì không hạ cấp lại; chỉ khuyết tật không thể phát hiện tại chỗ mới được khiếu nại trong hạn.")],
  vi_du={}, tt=["Các biến thể"], vai=["ban", "mua", "app"], sau="lay-tai-vuon")
them("den-xem-hang", "Đến xem hàng rồi chưa mua", "thuan", "Khảo sát khác thực hiện hợp đồng: chưa có hợp đồng thì không có cọc, không giữ lượng (trừ giữ để thẩm định đã đồng ý).",
  [B("mua", "Hẹn xem vườn", luong=[("tin", "ban", "lịch hẹn")]),
   B("ban", "Đồng ý lịch", luong=[("tin", "app", "đồng ý")]),
   B("mua", "Xem, chụp, không mua", chi_tiet="Không phát sinh nghĩa vụ; chi phí đi lại tự chịu; không ghi uy tín xấu.")],
  vi_du={}, tt=["Khảo sát"], vai=["mua", "ban", "app"], sau="vuon-bien-the")
them("ket-hop", "Kết hợp: cân lệch + nhận một phần + trả thiếu", "giao_ngay_bien",
  "Lấy tại vườn: cân lệch được chốt lại, xe chỉ lấy 4 tấn, lần đầu trả thiếu. Đợt 2 lấy 1 tấn. Cọc trừ ở đợt cuối, phần dư hoàn bên mua.",
  [B("app", "Hợp đồng 5 tấn, trả trước bàn giao từng đợt; cọc trừ ở đợt cuối", o_dau="he_thong", tt="Đã cọc, chờ giao", so={"coc_giu": COC}),
   B("app", "Đợt 1: cân lại chốt 4.000 kg", o_dau="he_thong", luong=[("tin", "mua", "4.000 kg")], chi_tiet="Xe chở được 4 tấn; 1 tấn giữ cho đợt 2 sau 2 ngày (hai bên đồng ý)."),
   B("mua", "Chuyển 50.000.000 / cần 60.000.000", o_dau="ngoai_app", luong=[("tien", "ban", "50.000.000 đ")], tt="Chờ thanh toán"),
   B("ban", "Báo thiếu 10.000.000; chưa bàn giao", luong=[("tin", "app", "thiếu")], so={"tra_thang": 50_000_000}),
   B("mua", "Chuyển bù 10.000.000", o_dau="ngoai_app", luong=[("tien", "ban", "10.000.000 đ")]),
   B("ban", "Đủ 60.000.000; bàn giao 4 tấn", o_dau="ngoai_app", luong=[("hang", "mua", "4.000 kg")], so={"tra_thang": 60_000_000}, tt="Đang giao"),
   B("ban", "Đợt 2: bàn giao 1.000 kg (15.000.000)", o_dau="ngoai_app", luong=[("hang", "mua", "1.000 kg")], so={"phai_tra": GT}, chi_tiet="Đợt 2 nhỏ hơn cọc: bên mua không trả thêm, cọc bù."),
   B("app", "Quyết toán: cọc 15.000.000 người bán, hoàn 7.500.000 bên mua", o_dau="he_thong", tt="Quyết toán cọc"),
   B("nh", "Chuyển và hoàn", o_dau="ngan_hang", luong=[("tien", "ban", "15.000.000 đ"), ("tien", "mua", "7.500.000 đ")], so={"coc_giu": 0, "coc_chi_ban": 15_000_000, "hoan_mua": 7_500_000}, tt="Hoàn tất")],
  vi_du={"ma": "HĐ-0104", "gia_tri": GT, "ghi": "Người bán nhận 60.000.000 + 15.000.000 = 75.000.000 = 5.000 kg × 15.000."}, vai=["app", "mua", "ban", "nh"], sau="da-nhan-nhieu-hon")

D["van_hanh"]["quy_tac"] += [
 ["Đăng ký không đạt", "Ghi lý do, yêu cầu bổ sung có hạn; giấy tờ hết hạn thì khóa phần liên quan; thay đại diện, ủy quyền phải xác minh lại."],
 ["Hiệu lực bản hợp đồng", "Bản cũ hiệu lực tới khi bản sửa ký đủ. Sửa lượng, giá thì tính lại cọc, báo nhà xe, xin lại cam kết ngân hàng nếu có."],
 ["Dịch vụ thất bại", "Đặt thất bại hoặc đối tác bỏ: đổi đối tác; chi phí khẩn chỉ trong giới hạn đã duyệt trước; trả trước cho đối tác phải có biên nhận."],
 ["Người trực không phản hồi", "15 phút chưa nhận việc khẩn thì chuyển người trực dự phòng, rồi trưởng ca; ghi giờ từng lần chuyển."],
 ["Xem lại quyết định", "Người xem lại khác người quyết; hạn 7 ngày; kết quả ghi vào lịch sử đơn."]]
D["he_thong"]["quy_tac"] += [
 ["Khôi phục sau lỗi", "Yêu cầu đã gửi không mất: lưu trước, xử lý sau; gửi lại cùng mã không tạo việc trùng."],
 ["Đối soát tối đa", "Kết quả ngân hàng chưa rõ quá 24 giờ thì chuyển nhân viên đối soát, báo hai bên."],
 ["Đăng lô, nhu cầu", "Đơn vị, quy cách theo mặt hàng; lượng còn lại = có − giữ − cam kết; nhu cầu có hạn; sửa tin khi đã có cam kết không đổi nghĩa vụ đã ký."]]

for n, c in enumerate(D["can_chot"], 1): c["ma"] = f"Q{n:02d}"
gan = {"Cách được trả và mức bảo vệ người bán": ["lay-tai-vuon", "da-nhan-nhieu-hon"], "Giữ lô khi thẩm định": ["lay-tai-vuon"],
       "Người có quyền chấp thuận nghiệm thu bên mua": ["lay-tai-vuon", "vuon-bien-the"], "Cọc của bên mua đi đâu khi có vi phạm": ["coc-thieu-khong-bu", "coc-sau-dong"]}
for c in D["can_chot"]: c["tinh_huong"] = list(dict.fromkeys(c.get("tinh_huong", []) + gan.get(c["chu_de"], [])))
D["can_chot"].append({"ma": f"Q{len(D['can_chot']) + 1:02d}", "chu_de": "Quyết toán khi còn tranh chấp", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập",
  "han": "", "pham_vi": "Mọi đơn", "tinh_huong": ["tranh-chap-mot-dong", "chinh", "ket-hop"], "bang_chung": "",
  "lua_chon": [["Giữ phần cọc bằng khoản tranh chấp", "An toàn cho người bán"], ["Chuyển toàn bộ cọc, người bán chấp thuận khoản tranh chấp không còn bảo đảm", "Người bán nhận tiền sớm"]],
  "de_xuat": "Mặc định giữ phần cọc bằng khoản tranh chấp; người bán được chọn cách thứ hai.", "can_cu": "Góp ý 28/10 (rà bản 5)"})
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
ids = {t["id"] for t in D["tinh_huong"]}
for c in D["can_chot"]: assert all(x in ids for x in c["tinh_huong"]), c["chu_de"]
D["phien_ban"] = "6 · 28/10/2026"
D["nguon_chinh"] += " Bản 6: quy tắc quyết toán chung, lấy tại vườn (xe riêng, cân riêng), bất khả kháng ký bản sửa, giữ lượng 3 giai đoạn, cọc sai tách đường, nghiệm thu thấp hơn cọc, cân lệch, tình huống kết hợp, mã việc cần chốt."
luu("6b")
