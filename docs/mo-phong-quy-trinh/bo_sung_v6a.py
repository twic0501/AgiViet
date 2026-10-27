# BẢN 6 phần A (28/10/2026), chạy SAU bo_sung_v5.py: quy tắc quyết toán, hoàn tất khi hết nghĩa vụ,
# bất khả kháng ký bản sửa, giữ lượng 3 giai đoạn, cọc sai tách đường, nghiệm thu thấp hơn cọc, cân lệch, hạn nghiệm thu.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v6_chung import *

D["he_thong"]["quy_tac"] = [
 ["Quyết toán theo phần", "Phần hai bên đã công nhận được quyết toán ngay. Phần còn tranh chấp tách riêng."],
 ["Cọc khi còn tranh chấp", "Người bán chọn: (a) giữ lại phần cọc bằng khoản tranh chấp làm bảo đảm, chuyển phần còn lại; hoặc (b) chuyển toàn bộ cọc ngay và bấm chấp thuận khoản tranh chấp không còn cọc bảo đảm."],
 ["Cọc khi còn nghĩa vụ", "Giữ phần cọc tương ứng nghĩa vụ của bên mua chưa xong; nghĩa vụ của người bán (không có cọc) thành công nợ có hạn."],
 ["Hoàn tất", "Chỉ khi hết mọi nghĩa vụ tiền, hàng, phí dịch vụ. Còn nghĩa vụ thì \"Đã chốt kết quả · còn nghĩa vụ\", ghi ai nợ ai, bao nhiêu, hạn."],
 ["Không có số âm", "Nghiệm thu thấp hơn cọc thì cọc chia (người bán nhận đúng giá trị, dư hoàn bên mua); người bán đã nhận nhiều hơn giá trị thì thành nghĩa vụ hoàn."],
 ["Giữ lượng 3 giai đoạn", "Giữ để thẩm định (≤ 7 ngày) → giữ để thương lượng, ký (≤ 48 giờ) → cam kết trong hợp đồng. Người bán đồng ý gia hạn; tổng giữ + cam kết không vượt lượng giao được."],
 ["Loại bất đồng → cách đối chiếu", "Khối lượng: cân, bì, phiếu cân, cân lại, điểm cân độc lập. Chất lượng: tiêu chí, mẫu đối chứng, ảnh, kiểm định. Hao hụt vận chuyển: số bàn giao, số nhận, niêm phong, nhật ký chuyến."],
] + D["he_thong"]["quy_tac"]

sua("chinh", "Đủ điều kiện: gửi lệnh chuyển cọc", dieu_kien="Phần quyết toán đã được hai bên công nhận; đã nhận đủ phần còn lại; không còn nghĩa vụ của bên mua cần cọc bảo đảm",
    chi_tiet="Theo quy tắc quyết toán chung. Đơn này không còn tranh chấp nên chuyển toàn bộ cọc.")
sua("chinh", "Đồng ý giữ 5 tấn", chi_tiet="Giai đoạn 1, giữ để thẩm định: tối đa 7 ngày. Đạt thì sang giai đoạn 2, giữ để thương lượng và ký: tối đa 48 giờ, gia hạn cần người bán đồng ý. Ký đủ thì thành lượng đã cam kết. Hết hạn, không đạt, bên mua bỏ thì lượng về lô.")
i = tim("chinh", "Kho ký nhận, QC nghiệm thu 3 phần")
TH["chinh"]["buoc"][i]["chi_tiet"] = ("Hạn 2 giờ từ lúc người nhận ký nhận: QC phải gửi kết quả. Mọi thay đổi lượng, loại, giá phải có căn cứ; trả lại trên 5% cần thêm bằng chứng. "
  "150 kg hạ cấp, 50 kg trả lại do không đạt so mẫu lúc bốc. Hư do đường thì bên mua vẫn trả đủ người bán.")
sua("chinh", "Người được ủy quyền chấp thuận hạ cấp", han="12 giờ sau khi QC gửi",
    chi_tiet="Kho/QC chỉ nhập. Người có quyền duyệt trong 12 giờ (đề xuất). QC đã báo vấn đề đúng hạn mà chưa duyệt thì không tự thành \"đạt\": chuyển cấp, rồi hòa giải.")

t = TH["tranh-chap-mot-dong"]
i = tim("tranh-chap-mot-dong", "Quyết toán phần công nhận")
t["buoc"][i:i] = [B("ban", "Chọn chuyển toàn bộ cọc; chấp thuận 900.000 không còn bảo đảm", luong=[("tin", "app", "chấp thuận")],
                    chi_tiet="Lựa chọn khác: giữ 900.000 làm bảo đảm, chuyển 21.600.000 trước.", loai=MT)]
k = tim("tranh-chap-mot-dong", "Kết luận: giữ giá 9.000")
t["buoc"][k].update(trang_thai=DONG_NO, chi_tiet="Giữ giá 9.000. Còn nghĩa vụ: người bán trả phí kiểm định bên mua đã ứng. Nếu kết luận ngược lại: bên mua trả thêm 900.000 + phí kiểm định trong 48 giờ.")
t["buoc"][k + 1:] = [B("ban", "Hoàn bên mua phí kiểm định đã ứng", o_dau="ngoai_app", luong=[("tien", "mua", "phí kiểm định (theo hóa đơn)")], han="7 ngày"),
                     B("mua", "Xác nhận đã nhận lại phí", luong=[("tin", "app", "đã nhận")], tt="Hoàn tất")]
t["trang_thai"] = ["Chờ người bán xác nhận", "Chờ thanh toán", "Quyết toán cọc", "Đã quyết toán phần công nhận · còn tranh chấp 900.000", DONG_NO, "Hoàn tất"]
t = TH["tra-sau-mua-vi-pham"]
k = tim("tra-sau-mua-vi-pham", "Hết hiệu lực cam kết")
t["buoc"][k:k] = [B("app", "Ghi nghĩa vụ: bên mua trả phí kiểm định", o_dau="he_thong", luong=[("giay", "mua", "hóa đơn kiểm định")], tt=DONG_NO),
                  B("mua", "Trả phí kiểm định", o_dau="ngoai_app", luong=[("tien", "dt", "phí kiểm định")])]
t["trang_thai"] = ["Đã cọc, chờ giao", "Đang giao", DONG_NO, "Đã hủy"]

t = TH["bat-kha-khang"]
k = tim("bat-kha-khang", "Chọn: nhận 3 tấn")
t["buoc"][k]["viec"] = "Bên mua đề nghị: nhận 3 tấn + tìm nguồn bù 2 tấn"
t["buoc"][k + 1:k + 1] = [B("app", "Đối chiếu điều kiện miễn trách đã xác minh", o_dau="he_thong", chi_tiet="Sự kiện có thật (biên bản nhân viên), ảnh hưởng 40% vườn, báo trước 5 ngày, đã cố giảm thiệt hại: không phạt."),
                          B("ban", "Người bán đồng ý đề nghị", luong=[("tin", "app", "đồng ý")])]
sua("bat-kha-khang", "Hợp đồng bản mới 3 tấn", viec="Soạn bản sửa 3 tấn; hai bên ký", so={"gia_tri": 45_000_000},
    chi_tiet="Bản cũ hiệu lực tới khi bản sửa ký đủ. Cọc mới 30% × 3 tấn × 15.000 = 13.500.000; lệnh hoàn 9.000.000 chỉ gửi sau khi ký đủ.")
t["buoc"][tim("bat-kha-khang", "Tìm nguồn bù 2 tấn")]["chi_tiet"] = "Nguồn bù là đơn mới riêng. Không tìm được trong 3 ngày: bên mua tự tìm ngoài, không ai bị phạt; hợp đồng 3 tấn chạy tiếp."
t["vi_du"] = {"ma": "HĐ-0101 (sửa đổi)", "gia_tri": GT, "ghi": "Sau khi ký bản sửa, giá trị đơn còn 45.000.000 đ."}

t = TH["coc-sai"]
t["ten"] = "Cọc thiếu rồi chuyển bù thừa"
t["mo_ta"] = "Mốc phân xử là lúc ngân hàng ghi nhận tiền vào. Thiếu thì chưa hiệu lực; bù thừa thì hoàn phần thừa."
t["buoc"] = [b for b in t["buoc"] if "báo trễ" not in b["viec"]]
them("coc-thieu-khong-bu", "Cọc thiếu, không bù tới hạn", "giao_ngay_bien", "Ngân hàng nhận 20 triệu, không bù trước hạn: đơn đóng, hoàn đủ 20 triệu, lượng về lô.",
  [B("mua", "Chuyển 20.000.000 (thiếu 2.500.000)", o_dau="ngoai_app", luong=[("tien", "nh", "20.000.000 đ")], tt="Chờ cọc"),
   B("nh", "Ghi nhận 20.000.000", o_dau="ngan_hang", luong=[("tin", "app", "thiếu")], so={"coc_giu": 20_000_000}),
   B("app", "Nhắc bù trước hạn", o_dau="he_thong", luong=[("tin", "mua", "bù 2.500.000")], han="12 giờ (hàng tươi)"),
   B("app", "Hết hạn: đóng đơn, lệnh hoàn 20.000.000", o_dau="he_thong", luong=[("giay", "nh", "lệnh hoàn")], tt="Đã đóng · quá hạn cọc"),
   B("nh", "Hoàn 20.000.000", o_dau="ngan_hang", luong=[("tien", "mua", "20.000.000 đ")], so={"coc_giu": 0, "hoan_mua": 20_000_000}),
   B("app", "Lượng về lô", o_dau="he_thong", luong=[("tin", "ban", "5 tấn về lô")])],
  tt=["Chờ cọc", "Đã đóng · quá hạn cọc"], vai=["mua", "nh", "app", "ban"], sau="coc-sai")
them("coc-bao-tre", "Tiền vào trước hạn nhưng ngân hàng báo trễ", "giao_ngay_bien",
  "Hết hạn chưa có báo: \"Chờ đối soát cọc\", lượng vẫn giữ tối đa 6 giờ (đề xuất). Tiền vào trước hạn thì hiệu lực; sau hạn hoặc quá 6 giờ chưa rõ thì đóng và hoàn.",
  [B("mua", "Chuyển cọc 23:50, hạn 24:00", o_dau="ngoai_app", luong=[("tien", "nh", tien(COC))], tt="Chờ cọc", moc="23:50"),
   B("app", "Chưa có báo: \"Chờ đối soát cọc\", giữ lượng", o_dau="he_thong", luong=[("tin", "ban", "đang đối soát"), ("tin", "mua", "đang đối soát")], tt="Chờ đối soát cọc", moc="24:00"),
   B("nh", "Báo: tiền vào lúc 23:52", o_dau="ngan_hang", luong=[("tin", "app", "ghi nhận 23:52")], so={"coc_giu": COC}, moc="2:10"),
   B("app", "Tiền vào trước hạn: hợp đồng hiệu lực", o_dau="he_thong", luong=[("tin", "ban", "đã có cọc")], tt="Đã cọc, chờ giao",
     chi_tiet="Tiền vào sau hạn, hoặc quá 6 giờ chưa rõ: đóng đơn, lượng về lô, tiền tới sau thì hoàn toàn bộ."),
   B("nv", "Ca sáng: ghi sự cố báo trễ với ngân hàng", o_dau="nhan_vien", nv="Đối soát tài chính.")],
  tt=["Chờ cọc", "Chờ đối soát cọc", "Đã cọc, chờ giao"], vai=["mua", "app", "nh", "ban", "nv"], sau="coc-thieu-khong-bu")
them("coc-sau-dong", "Tiền cọc tới sau khi đơn đã đóng", "giao_ngay_bien", "Đơn đã đóng, lượng có thể đã bán. Tiền tới sau: hoàn toàn bộ, không khôi phục đơn.",
  [B("app", "Đơn đã đóng, lượng đã bán", o_dau="he_thong", tt="Đã đóng · quá hạn cọc"),
   B("nh", "Báo nhận " + tien(COC), o_dau="ngan_hang", luong=[("tin", "app", "tiền tới")], so={"coc_giu": COC}),
   B("app", "Lệnh hoàn toàn bộ", o_dau="he_thong", luong=[("giay", "nh", "lệnh hoàn")]),
   B("nh", "Hoàn " + tien(COC), o_dau="ngan_hang", luong=[("tien", "mua", tien(COC))], so={"coc_giu": 0, "hoan_mua": COC})],
  tt=["Đã đóng · quá hạn cọc"], vai=["app", "nh", "mua"], sau="coc-bao-tre")

them("nghiem-thu-thap", "Nghiệm thu thấp hơn cọc", "giao_ngay_bien", "Nghiệm thu chỉ 18 triệu < cọc 22,5 triệu: cọc chia 18 triệu người bán, 4,5 triệu hoàn bên mua; không có số phải trả âm.",
  [B("ban", "Giao 5 tấn", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", so={"coc_giu": COC}),
   B("mua", "Nghiệm thu: chỉ 1.200 kg đạt = 18.000.000", luong=[("tin", "ban", "kết quả + ảnh")], tt="Chờ người bán xác nhận", so={"phai_tra": 18_000_000}),
   B("ban", "Chốt số", luong=[("tin", "app", "đã chốt")]),
   B("app", "Bên mua không trả thêm; cọc chia 18.000.000 / 4.500.000", o_dau="he_thong", tt="Quyết toán cọc"),
   B("nh", "Chuyển và hoàn", o_dau="ngan_hang", luong=[("tien", "ban", "18.000.000 đ"), ("tien", "mua", "4.500.000 đ")], so={"coc_giu": 0, "coc_chi_ban": 18_000_000, "hoan_mua": 4_500_000}, tt="Hoàn tất")],
  vai=["ban", "mua", "app", "nh"], sau="tranh-chap-mot-dong")
them("da-nhan-nhieu-hon", "Người bán đã nhận trước nhiều hơn giá trị nghiệm thu", "giao_ngay_bien",
  "Trả trước khi bốc 52,5 triệu, nghiệm thu chỉ 18 triệu: cọc hoàn hết bên mua; người bán phải hoàn 34,5 triệu, bên mua xác nhận mới hoàn tất.",
  [B("mua", "Trả trước khi bốc 52.500.000", o_dau="ngoai_app", luong=[("tien", "ban", "52.500.000 đ")], so={"coc_giu": COC}, tt="Chờ thanh toán"),
   B("ban", "Xác nhận đã nhận; bốc hàng", so={"tra_thang": 52_500_000}, tt="Đang giao"),
   B("mua", "Nghiệm thu chỉ 18.000.000", luong=[("tin", "ban", "kết quả + ảnh")], tt="Chờ người bán xác nhận", so={"phai_tra": 18_000_000}),
   B("ban", "Chốt số", luong=[("tin", "app", "đã chốt")]),
   B("nh", "Hoàn toàn bộ cọc cho bên mua", o_dau="ngan_hang", luong=[("tien", "mua", tien(COC))], so={"coc_giu": 0, "hoan_mua": COC, "con_no": "Người bán phải hoàn 34.500.000 đ"}, tt=DONG_NO),
   B("ban", "Hoàn 34.500.000 trong hạn", o_dau="ngoai_app", luong=[("tien", "mua", "34.500.000 đ")], han="7 ngày (đề xuất)"),
   B("mua", "Xác nhận đã nhận lại", so={"ban_da_hoan": 34_500_000, "con_no": ""}, tt="Hoàn tất", nv="Đối soát: quá hạn thì trừ hạng, khóa đơn mới, cấp hồ sơ.")],
  tt=D["trang_thai_don"] + [DONG_NO], vai=["mua", "ban", "nh"], sau="nghiem-thu-thap")

t = TH["can-khong-dung"]
t["ten"] = "Cân lệch khối lượng"
t["mo_ta"] = "Bất đồng khối lượng giải bằng cân, bì, phiếu cân, cân lại hoặc điểm cân độc lập; không dùng kiểm định chất lượng để giải chênh lệch cân."
t["buoc"] = [
  B("ban", "Bốc, biên bản ghi 5.000 kg", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", so={"coc_giu": COC}),
  B("mua", "Cân kho: 4.850 kg", luong=[("tin", "ban", "4.850 kg + phiếu cân")], tt="Chờ người bán xác nhận"),
  B("app", "Ghi hai kết quả đang lệch, không tự chọn số", o_dau="he_thong", luong=[("tin", "ban", "đang lệch"), ("tin", "mua", "đang lệch")]),
  B("nv", "Đối chiếu bì, cách cân, độ chia cân, ảnh", o_dau="nhan_vien", nv="Hòa giải."),
  B("mua", "Cân lại có người bán chứng kiến", luong=[("tin", "app", "4.950 kg")], chi_tiet="Không thống nhất thì cân ở điểm cân độc lập ghi trong hợp đồng; phí cân bên sai chịu."),
  B("ban", "Đồng ý 4.950 kg", luong=[("tin", "app", "đồng ý")], tt="Chờ thanh toán"),
  B("app", "Chốt khối lượng; chất lượng nghiệm thu như thường", o_dau="he_thong")]
t["vi_du"] = {"ma": "HĐ-0101", "gia_tri": GT}
luu("6a")
