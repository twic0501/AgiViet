# BẢN 15 (28/10/2026), chạy SAU bo_sung_v14.py. Người sáng lập + góp ý: bên mua giao AgiViet tìm nguồn định kỳ theo
# tiêu chuẩn (không quan tâm ai bán, cần đủ hàng, chất lượng, giấy tờ). Nhóm tình huống mới + 3 cách mua + việc cần chốt.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, B, them
NGUON = "Người sáng lập 28/10 + góp ý (tìm nguồn định kỳ)"
C.NG[:] = [NGUON]
GIA = 20_000   # đ/kg, giả định

D["thi_truong"]["cach_mua"] = [
  ["Mua từng đợt", "Có nhu cầu thì tìm một lô phù hợp", "Ghép nguồn, xử lý đơn (các nhánh giao ngay)"],
  ["Mua lặp lại từ nguồn quen", "Người bán quen giao theo lịch", "Lịch gọi hàng, lượng cam kết, nghiệm thu và tiền từng đợt (hợp đồng khung)"],
  ["Tìm nguồn định kỳ theo tiêu chuẩn", "Mỗi ngày đủ hàng đạt chuẩn, đủ giấy tờ; nguồn có thể đổi", "Kế hoạch nguồn chính và dự phòng, phân bổ, kiểm điều kiện, xử lý thiếu (nhóm mới)"]]
D["thi_truong"]["y_cach_mua"] = "Phân khúc khách hàng giúp hiểu yêu cầu; cách mua mới quyết định luồng vận hành. Một nhà máy có thể dùng cả ba."

D["ten_nhom"]["dinh_ky"] = "Tìm nguồn định kỳ theo tiêu chuẩn"
D["he_thong"]["quy_tac"] += [
  ["Ba số của nhu cầu định kỳ", "Dự kiến (tuần sau khoảng 30 tấn) ≠ Đã chốt nhu cầu (thứ Hai đúng 5 tấn) ≠ Đã có nguồn cam kết (A 2 + B 2 + C 1). Danh sách gợi ý không phải là đủ hàng; thiếu thì hiện thiếu. Dự báo không là lời hứa với người bán."],
  ["Điều kiện bắt buộc", "Thiếu giấy tờ, kết quả thử nghiệm bắt buộc thì \"chưa đủ điều kiện giao\"; điểm phù hợp cao không bù được. Hồ sơ cơ sở còn hiệu lực ≠ kết quả lô hiện tại ≠ kết quả kiểm khi giao."],
  ["Tiền theo từng người bán", "Bên mua xem một kế hoạch, trả tiền vẫn tách theo người bán và đợt giao; kỳ trả do từng người bán chấp thuận. Tranh chấp một nguồn không khóa tiền các nguồn khác. Bảo đảm dùng chung ghi phần đã phân bổ và phần còn dùng được."]]

them("dinh-ky", "Nhà máy cần 5 tấn/ngày từ nhiều nguồn", "dinh_ky",
  "Giả định: nhà máy chế biến cần 5 tấn/ngày, thứ Hai–thứ Bảy, nhận trước 8:00. Không cần cùng một trang trại, nhưng lô nào cũng đạt chuẩn và truy xuất được. AgiViet tổ chức nguồn và điều phối; không mua vào bán lại.",
  [B("mua", "Lập nhu cầu: loại, kích cỡ, dung sai, giờ nhận, hồ sơ, chỉ tiêu thử nghiệm, có nhận thay thế không", luong=[("giay", "app", "bộ yêu cầu")], tt="Lập nhu cầu",
     chi_tiet="Hàng hóa · lượng và giao nhận · hồ sơ nguồn · kết quả thử nghiệm · chấp nhận thay thế. Ký thỏa thuận dịch vụ tìm nguồn với AgiViet (một lần)."),
   B("mua", "Chọn chế độ: tìm trong phạm vi đã giao (giá tối đa 21.000 đ/kg)", luong=[("tin", "app", "phạm vi")],
     chi_tiet="Cách khác: duyệt từng phương án. Trong phạm vi: AgiViet được tổ chức nguồn đạt tiêu chí, trong giới hạn giá; vượt phạm vi phải xin duyệt."),
   B("mua", "Dự báo tuần sau khoảng 30 tấn; hạn chốt từng ngày là 14:00 hôm trước", luong=[("tin", "app", "dự báo")], chi_tiet="Dự báo không là cam kết mua; chỉ giúp người bán chuẩn bị."),
   B("app", "Mời người bán đủ điều kiện, có lượng phù hợp", o_dau="he_thong", luong=[("tin", "ban", "lời mời cung ứng")],
     chi_tiet="Người bán chỉ thấy phần mình: lượng có thể nhận, lịch giao, yêu cầu, tiền dự kiến. Không thấy toàn bộ hoạt động thu mua của nhà máy."),
   B("mua", "Chủ nhật 14:00: chốt thứ Hai đúng 5 tấn", luong=[("tin", "app", "đã chốt 5 tấn")], tt="Đã chốt nhu cầu"),
   B("ban", "A xác nhận 2 tấn, B 2 tấn, C 1 tấn (20.000 đ/kg)", luong=[("tin", "app", "cam kết")], tt="Đủ nguồn cam kết",
     chi_tiet="Màn bên mua: cần 5 · đã cam kết 5 · thiếu 0. Mỗi nguồn có hồ sơ cơ sở và kết quả lô."),
   B("nv", "Kiểm hồ sơ từng nguồn; lấy mẫu lô", o_dau="nhan_vien", nv="Theo sát định kỳ: kiểm giấy tờ sắp hết hiệu lực trước kỳ sau."),
   B("dt", "Xe gom 3 điểm, giao trước 8:00", o_dau="ngoai_app", luong=[("hang", "mua", "5 tấn, 3 nguồn")], tt="Đang giao", chi_tiet="Mỗi nguồn ghi riêng: lô, cân, ảnh, niêm mẫu."),
   B("mua", "Nghiệm thu từng nguồn: đều đạt", luong=[("tin", "app", "A, B, C đạt")], tt="Chờ thanh toán"),
   B("app", "Lập khoản trả theo từng người bán và kỳ họ đã chấp thuận", o_dau="he_thong", luong=[("tin", "mua", "bảng kê 3 nguồn")],
     chi_tiet="A 40.000.000 (trả trong 3 ngày), B 40.000.000 (trả trước giao, đã nhận), C 20.000.000 (qua ngân hàng đối tác, nhận ngay). Xem nhánh \"Định kỳ: trả tiền từng người bán\"."),
   B("app", "Lập kế hoạch kỳ tiếp: nguồn chính và dự phòng", o_dau="he_thong", luong=[("tin", "mua", "độ phủ tuần sau")], tt="Lập nhu cầu",
     chi_tiet="Màn bên mua: lịch nhu cầu, độ phủ nguồn, hồ sơ chất lượng (đủ / chờ kết quả / sắp hết hiệu lực), ngoại lệ cần quyết, đối soát.")],
  vi_du={}, tt=["Lập nhu cầu", "Đã chốt nhu cầu", "Đủ nguồn cam kết", "Đang giao", "Chờ thanh toán"], vai=["mua", "app", "ban", "nv", "dt"])

them("dinh-ky-thieu-luong", "Định kỳ: một nguồn giao thiếu", "dinh_ky",
  "A cam kết 2 tấn nhưng sáng thứ Ba báo chỉ có 1,5 tấn. Xử lý ở cấp kế hoạch và từng nguồn; không hủy cả kế hoạch, không hứa luôn đủ hàng.",
  [B("ban", "A báo chỉ có 1,5 tấn (5:00)", luong=[("tin", "app", "thiếu 0,5 tấn")], tt="Đủ nguồn cam kết"),
   B("app", "Hiện: cần 5 · cam kết 4,5 · thiếu 0,5; còn 3 giờ", o_dau="he_thong", luong=[("tin", "nv", "thiếu"), ("tin", "mua", "thiếu 0,5 tấn")], tt="Thiếu nguồn"),
   B("nv", "Gọi nguồn dự phòng D (đạt cùng yêu cầu, 20.500 đ/kg)", o_dau="nhan_vien", luong=[("tin", "ban", "mời D")]),
   B("ban", "D xác nhận 0,5 tấn", luong=[("tin", "app", "cam kết")], chi_tiet="Giá trong giới hạn 21.000 nên thay được ngay theo phạm vi bên mua đã giao. Vượt giá, đổi loại, trễ giờ thì phải xin duyệt."),
   B("app", "Đủ 5 tấn; báo bên mua nguồn thay", o_dau="he_thong", luong=[("tin", "mua", "D thay 0,5 tấn")], tt="Đủ nguồn cam kết"),
   B("app", "Nếu không bù được: báo lượng giao được, để bên mua quyết", o_dau="he_thong",
     chi_tiet="Nhận 4,5 tấn, nhận trễ, hoặc đổi loại (nếu đã cho phép thay thế). B, C giao đúng vẫn nghiệm thu, trả tiền riêng."),
   B("app", "Ghi lịch sử giao thiếu của A", o_dau="he_thong", chi_tiet="A báo sớm trước giờ giao: ghi lịch sử, không tự trừ uy tín. Thiếu lặp lại: xét theo tiêu chí, A được giải trình; giảm lượng mời A kỳ sau.")],
  vi_du={}, tt=["Đủ nguồn cam kết", "Thiếu nguồn"], vai=["ban", "app", "nv", "mua"], sau="dinh-ky")

them("dinh-ky-thieu-giay-to", "Định kỳ: nguồn thiếu giấy tờ hoặc kết quả", "dinh_ky",
  "C có lượng, giá tốt, điểm phù hợp cao, nhưng chứng nhận vùng trồng hết hạn tuần này và kết quả lô chưa có.",
  [B("app", "Kiểm hồ sơ C: chứng nhận hết hạn thứ Tư", o_dau="he_thong", luong=[("tin", "ban", "cần gia hạn")], chi_tiet="Báo trước 7 ngày khi giấy tờ sắp hết hiệu lực."),
   B("app", "Thứ Năm: C \"chưa đủ điều kiện giao\"; không đưa vào phân bổ", o_dau="he_thong", luong=[("tin", "nv", "C loại khỏi kế hoạch")],
     chi_tiet="Điểm phù hợp cao không bù được điều kiện bắt buộc."),
   B("nv", "Thay C bằng nguồn dự phòng đủ hồ sơ", o_dau="nhan_vien", luong=[("tin", "ban", "mời nguồn dự phòng")]),
   B("dt", "Kết quả lô của nguồn mới: chờ, có sau 2 ngày", o_dau="ngoai_app", luong=[("giay", "app", "đang chờ")]),
   B("app", "Báo bên mua: hồ sơ cơ sở đủ, kết quả lô đang chờ", o_dau="he_thong", luong=[("tin", "mua", "chờ kết quả")],
     chi_tiet="Bên mua đã yêu cầu kết quả trước khi giao thì chưa giao; nếu cho phép giao rồi kiểm sau thì hàng giữ cách ly như nhánh lấy tại vườn."),
   B("ban", "C gia hạn xong, gửi giấy mới", luong=[("giay", "app", "chứng nhận mới")]),
   B("nv", "Kiểm giấy mới; C đủ điều kiện từ kỳ sau", o_dau="nhan_vien", nv="Không áp ngược cho lô đã giao khi giấy cũ hết hạn.")],
  vi_du={}, tt=[], vai=["app", "ban", "nv", "dt", "mua"], sau="dinh-ky-thieu-luong")

them("dinh-ky-tra-tien", "Định kỳ: trả tiền từng người bán", "dinh_ky",
  "Bên mua muốn trả gộp cuối tháng; người bán không chịu chờ. Một bảng kê tổng vẫn phải phân bổ được đến từng nguồn; tranh chấp một nguồn không khóa phần các nguồn khác.",
  [B("mua", "Đề nghị trả gộp cuối tháng", luong=[("tin", "app", "trả 30 ngày")]),
   B("app", "Hỏi từng người bán chấp thuận kỳ trả", o_dau="he_thong", luong=[("tin", "ban", "kỳ trả đề nghị")], chi_tiet="Không tự áp một kỳ cho mọi nguồn."),
   B("ban", "A đồng ý 3 ngày; B đòi trả trước giao; C cần tiền ngay", luong=[("tin", "app", "kỳ trả từng người")]),
   B("nh", "C: ngân hàng đối tác trả người bán sau nghiệm thu; bên mua trả ngân hàng sau 30 ngày", o_dau="ngan_hang", luong=[("tien", "ban", "20.000.000 đ")],
     chi_tiet="Chỉ khi đã có thỏa thuận tài trợ phù hợp (Q04)."),
   B("mua", "Chuyển một lần cho đợt: A + B", o_dau="ngoai_app", luong=[("tien", "ban", "80.000.000 đ")]),
   B("app", "Đối soát phân bổ: A 40.000.000, B 40.000.000", o_dau="he_thong", luong=[("tin", "ban", "phần của từng người")],
     chi_tiet="Mỗi người bán thấy: đã cam kết, đã giao, nghiệm thu, khoản được bảo đảm, ngày được trả."),
   B("mua", "Khiếu nại 200 kg của B bị dập", luong=[("tin", "app", "khiếu nại B")]),
   B("app", "B đã nhận đủ trước giao: khoản tranh chấp 4.000.000 thành nghĩa vụ hoàn nếu B sai; A, C không bị khóa", o_dau="he_thong", luong=[("tin", "ban", "B: 36.000.000 công nhận, 4.000.000 đang tranh chấp")],
     chi_tiet="Không trừ vào tiền của A, C, không giữ tiền kỳ sau của B khi chưa có kết luận. Kết luận B sai: B hoàn 4.000.000 có hạn (như nhánh người bán đã nhận nhiều hơn). Với nguồn chưa được trả: chỉ chưa trả phần tranh chấp, phần công nhận trả đủ (Q18)."),
   B("app", "Bảo đảm dùng chung: ghi phần đã phân bổ cho đợt này, phần còn dùng được", o_dau="he_thong",
     chi_tiet="Một khoản bảo đảm không tính cho nhiều chuyến cùng lúc.")],
  vi_du={}, tt=[], vai=["mua", "app", "ban", "nh"], sau="dinh-ky-thieu-giay-to")

n = len(D["can_chot"])
for i, (chu, lc, dx, th) in enumerate([
  ("Tìm nguồn định kỳ: phạm vi AgiViet được tự tổ chức", [["Duyệt từng phương án", "Bên mua duyệt mỗi nguồn"], ["Trong phạm vi đã giao", "Tiêu chí, giá tối đa, danh sách điều kiện; vượt phải xin duyệt"]],
   "Cho bên mua chọn một trong hai; mặc định duyệt từng phương án cho khách mới.", ["dinh-ky", "dinh-ky-thieu-luong"]),
  ("Hạn chốt và hạn thay đổi nhu cầu định kỳ", [["Chốt 14:00 hôm trước", "Giả định"], ["Đổi sau hạn chốt", "Bên mua chịu chi phí phát sinh đã báo trước"]],
   "Chốt theo mặt hàng và giờ thu hoạch thực tế.", ["dinh-ky"]),
  ("Thỏa thuận cho mua định kỳ", [["Một thỏa thuận dịch vụ tìm nguồn với AgiViet + thỏa thuận mua bán và lệnh giao từng đợt giữa bên mua và người bán", "Không cần hợp đồng dài mỗi ngày"]],
   "Cần người am hiểu pháp lý soát mẫu.", ["dinh-ky", "dinh-ky-tra-tien"]),
  ("Giao thiếu lặp lại", [["Ghi lịch sử, báo sớm không trừ uy tín", ""], ["Thiếu lặp lại: giảm lượng mời, có giải trình", ""]],
   "Tiêu chí cụ thể chờ số liệu pilot.", ["dinh-ky-thieu-luong"])], 1):
    D["can_chot"].append({"ma": f"Q{n + i:02d}", "chu_de": chu, "loai": "sang_lap", "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập",
      "han": "", "pham_vi": "Tìm nguồn định kỳ", "tinh_huong": th, "bang_chung": "", "lua_chon": lc, "de_xuat": dx, "can_cu": NGUON})
# Gắn Q22, Q23 vào nhánh tìm đầu ra (chỗ hở đã nêu)
for c in D["can_chot"]:
    if c["chu_de"] == "Không ghép được thì xử lý ra sao": c["tinh_huong"] = ["khong-co-dau-ra"]
    if c["chu_de"] == "Quy tắc gợi ý công bằng": c["tinh_huong"] = ["nhieu-de-nghi"]
    if c["chu_de"] == "Trả sau qua ngân hàng": c["tinh_huong"] = list(dict.fromkeys(c["tinh_huong"] + ["dinh-ky-tra-tien"]))
    if c["chu_de"] == "Quyết toán khi còn tranh chấp": c["tinh_huong"] = list(dict.fromkeys(c["tinh_huong"] + ["dinh-ky-tra-tien"]))

D["phien_ban"] = "15 · 28/10/2026"
D["nguon_chinh"] += " Bản 15: nhóm tìm nguồn định kỳ theo tiêu chuẩn (luồng chính + thiếu lượng, thiếu giấy tờ, trả tiền từng người bán), 3 cách mua, Q25–Q28."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("15")
