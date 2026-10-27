# BẢN 7 (28/10/2026), chạy SAU bo_sung_v6b.py. Theo rà bản 6: sửa Q18 (giữ cọc không bảo đảm khoản đòi thêm),
# ba mức đóng (đã quyết toán mua bán → hồ sơ còn mở → hoàn tất toàn bộ), hàng còn lại sau nghiệm thu thấp,
# dư lượng không đạt khi lấy tại vườn, sửa hai biến thể tại vườn, khảo sát vườn khớp quy tắc liên lạc.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim, sua, them, tien, COC, GT, MT
C.NG[:] = ["Góp ý 28/10 (rà bản 6)"]
QT_MB = "Đã quyết toán mua bán · còn hồ sơ mở"

# ---------- Ba mức đóng + Q18 trong quy tắc chung ----------
for r in D["he_thong"]["quy_tac"]:
    if r[0] == "Cọc khi còn tranh chấp":
        r[1] = ("Phần đã công nhận được trả đủ, kể cả bằng cọc. Giữ lại một phần cọc không bảo đảm được khoản đòi thêm (chỉ làm chậm tiền của phần đã công nhận). "
                "Khoản đòi thêm ghi rõ \"chưa được bảo đảm\"; muốn bảo đảm thì bên mua nộp thêm khoản giữ riêng bằng số tranh chấp.")
    if r[0] == "Hoàn tất":
        r[1] = ("Ba mức đóng: (1) Đã quyết toán mua bán: tiền hàng phần công nhận xong. (2) Hồ sơ còn mở: hàng trả lại, tranh chấp, phí dịch vụ, bồi hoàn, mỗi hồ sơ có người phụ trách và hạn. "
                "(3) Hoàn tất toàn bộ: mọi hồ sơ đã đóng.")
D["he_thong"]["quy_tac"].append(["Liên lạc trước giao dịch", "Che số chỉ là hỗ trợ kết nối, không chặn tuyệt đối giao dịch ngoài. Khảo sát vườn: người bán đồng ý thì chỉ người đến được nhận địa chỉ và số liên hệ cho chuyến đó."])
for v in D["vai"]:
    if v["id"] == "mua":
        v["khong"] = "thấy giá kín người bán; nhận số người bán trước khi cọc / có cam kết ngân hàng (trừ chuyến khảo sát người bán đã đồng ý)"

# ---------- 1. Q18: tranh chấp một dòng ----------
t = TH["tranh-chap-mot-dong"]
i = tim("tranh-chap-mot-dong", "Chọn chuyển toàn bộ cọc")
t["buoc"][i].update(viec="Trả đủ phần công nhận; khoản đòi thêm 900.000 chưa được bảo đảm",
  chi_tiet="Cọc là một phần tiền hàng đã công nhận nên chuyển hết. Giữ 900.000 trong cọc không bảo đảm được khoản đòi thêm: người bán chỉ nhận 72.450.000, thiếu chính phần đã công nhận. Muốn bảo đảm 900.000 thì bên mua nộp thêm khoản giữ riêng 900.000 (nếu hai bên đồng ý).",
  loai_nguon="gop_y", nguon=["Góp ý 28/10 (rà bản 6)"])
for c in D["can_chot"]:
    if c["chu_de"] == "Quyết toán khi còn tranh chấp":
        c["lua_chon"] = [["Trả đủ phần công nhận; khoản đòi thêm ghi chưa bảo đảm", "Người bán nhận đủ 73.350.000 ngay"],
                         ["Bên mua nộp thêm khoản giữ riêng bằng số tranh chấp", "Bảo đảm cả khoản đòi thêm; cần bên mua đồng ý"],
                         ["Giữ lại một phần cọc", "Không dùng: không bảo đảm được khoản đòi thêm, làm chậm phần đã công nhận"]]
        c["de_xuat"] = "Mặc định cách thứ nhất; cách thứ hai khi khoản tranh chấp lớn và bên mua đồng ý."

# ---------- 6. Đơn chính: ba mức đóng ----------
t = TH["chinh"]
k = tim("chinh", "Chuyển cọc, báo kết quả")
t["buoc"][k]["trang_thai"] = QT_MB
k = tim("chinh", "Hoàn tất: chứng từ")
t["buoc"][k:k + 1] = [
  B("app", "Mở hồ sơ 50 kg trả lại (người phụ trách, hạn 48 giờ)", o_dau="he_thong", luong=[("tin", "ban", "chọn: lấy về / bán gấp / tiêu hủy")]),
  B("ban", "Chọn bán gấp tại chỗ; bán xong, hồ sơ đóng", luong=[("tin", "app", "đã xử lý")], chi_tiet="Xem nhánh Hàng bị trả lại cho các lựa chọn khác và chi phí giữ."),
  B("app", "Hoàn tất toàn bộ: chứng từ, đánh giá, cập nhật hạng", o_dau="he_thong", luong=[("giay", "mua", "bảng kê, Excel"), ("giay", "ban", "lịch sử tiền")], tt="Hoàn tất")]
t["trang_thai"] = [x for x in t["trang_thai"] if x != "Hoàn tất"] + [QT_MB, "Hoàn tất"]

# ---------- 2. Nghiệm thu thấp: 3.800 kg còn lại ----------
t = TH["nghiem-thu-thap"]
k = tim("nghiem-thu-thap", "Chuyển và hoàn")
t["buoc"][k]["trang_thai"] = QT_MB
t["buoc"][k + 1:] = [
  B("mua", "Biên bản: 3.800 kg bị từ chối, giữ tại kho bên mua", luong=[("giay", "ban", "nơi giữ, người giữ, hạn 48 giờ")]),
  B("ban", "Chọn nhận lại 3.800 kg, tự lo xe", luong=[("tin", "app", "nhận lại")], chi_tiet="Lựa chọn khác: bán gấp tại chỗ, tiêu hủy có biên bản theo điều khoản."),
  B("ban", "Nhận lại hàng, ký biên bản", o_dau="ngoai_app", luong=[("hang", "ban", "3.800 kg")], chi_tiet="Phí giữ kho, xe về: người bán chịu nếu từ chối đúng căn cứ (giữ trong hạn thì không tính phí giữ, đề xuất)."),
  B("app", "Đóng hồ sơ hàng; hoàn tất toàn bộ", o_dau="he_thong", tt="Hoàn tất")]
t["trang_thai"] = ["Đang giao", "Chờ người bán xác nhận", "Quyết toán cọc", QT_MB, "Hoàn tất"]
t["mo_ta"] += " Sau khi chia cọc, hồ sơ 3.800 kg bị từ chối vẫn mở tới khi xử lý xong."

# ---------- 3. Lấy tại vườn: dư lượng không đạt ----------
NT_V = 4_950 * 15_000; CON_V = NT_V - COC
them("vuon-du-luong-khong-dat", "Lấy tại vườn: kết quả dư lượng không đạt", "thuan",
  "Cùng đơn lấy tại vườn: đã trả trước bàn giao 51,75 triệu, hàng đã về kho bên mua. Kết quả mẫu dư lượng sau 5 ngày không đạt.",
  [B("mua", "Hàng về kho: cách ly, chờ kết quả, không bán, không chế biến", luong=[("giay", "app", "biên bản cách ly")], tt="Chờ kết quả kiểm còn lại", so={"coc_giu": COC, "tra_thang": CON_V},
     chi_tiet="Điều khoản hợp đồng: hàng chờ tiêu chí còn kiểm phải giữ riêng; dùng trước khi có kết quả thì bên mua tự chịu."),
   B("dt", "Mẫu đại diện (lấy theo phương pháp đã ghi) không đạt", o_dau="ngoai_app", luong=[("giay", "app", "kết quả không đạt")],
     chi_tiet="Kết quả áp cho cả lô 4.950 kg vì mẫu lấy đại diện toàn lô theo phương pháp đã ký. Mẫu lưu vẫn niêm phong."),
   B("ban", "Yêu cầu kiểm lại mẫu lưu", luong=[("tin", "app", "kiểm lại")], han="48 giờ", chi_tiet="Kiểm lại ở phòng thử nghiệm khác; phí bên yêu cầu ứng, bên sai chịu."),
   B("dt", "Kiểm lại: vẫn không đạt", o_dau="ngoai_app", luong=[("giay", "app", "kết luận")]),
   B("app", "Kết luận: người bán có lỗi; mở hồ sơ hàng và tiền", o_dau="he_thong", tt="Đã chốt kết quả · còn nghĩa vụ",
     chi_tiet="Hàng: người bán nhận lại hoặc tiêu hủy có biên bản (không đưa vào sử dụng). Tiền: giá trị chấp nhận 0; người bán hoàn " + tien(CON_V) + "; cọc hoàn bên mua; phí thử nghiệm hai lần người bán chịu."),
   B("nh", "Hoàn cọc cho bên mua", o_dau="ngan_hang", luong=[("tien", "mua", tien(COC))], so={"coc_giu": 0, "hoan_mua": COC, "phai_tra": 0, "con_no": "Người bán phải hoàn " + tien(CON_V)}),
   B("ban", "Nhận lại hàng để tiêu hủy có biên bản", o_dau="ngoai_app", luong=[("hang", "ban", "4.950 kg")]),
   B("ban", "Hoàn " + tien(CON_V) + " và phí thử nghiệm", o_dau="ngoai_app", luong=[("tien", "mua", tien(CON_V))], han="7 ngày (đề xuất)"),
   B("mua", "Xác nhận đã nhận lại", so={"ban_da_hoan": CON_V, "con_no": ""}, tt="Hoàn tất", nv="Đối soát: quá hạn thì trừ hạng, khóa đơn mới, cấp hồ sơ.")],
  vi_du={"ma": "HĐ-0103 (dư lượng)", "gia_tri": GT}, tt=["Chờ kết quả kiểm còn lại", "Đã chốt kết quả · còn nghĩa vụ", "Hoàn tất"],
  vai=["mua", "dt", "ban", "app", "nh"], sau="lay-tai-vuon")
sua("lay-tai-vuon", "Kết quả dư lượng đạt", chi_tiet="Trong lúc chờ, hàng giữ cách ly ở kho bên mua. Không đạt: xem nhánh \"Lấy tại vườn: kết quả dư lượng không đạt\".")

# ---------- 4. Hai biến thể tại vườn ----------
sua("vuon-bien-the", "Hai cân lệch, không có cân độc lập gần",
    chi_tiet="Cân lại từng sọt có video. Vẫn lệch thì chỉ tạm giao khi cả hai bên đồng ý: ghi lượng tạm tính (4.850), lượng tranh chấp (150 kg) và cách đối chiếu tiếp (cân độc lập trên đường, hạn). Không tự áp số thấp hơn.")
sua("vuon-bien-the", "Bốc một phần thì phát hiện sai hàng",
    chi_tiet="Tiền đã trả đủ trước khi bốc. Dừng bốc; hai bên kiểm phần đã bốc; ghi kết quả điều chỉnh. Phần sai: người bán thay hàng đúng loại, hoặc ghi khoản hoàn cho bên mua có hạn. Biên bản ký lại trước khi bốc tiếp.")

# ---------- 5. Đến xem hàng ----------
t = TH["den-xem-hang"]
t["mo_ta"] = "Khảo sát khác thực hiện hợp đồng. Liên lạc chỉ mở cho chuyến khảo sát người bán đã đồng ý; che số là hỗ trợ, không chặn tuyệt đối giao dịch ngoài."
t["buoc"] = [
  B("mua", "Gửi yêu cầu khảo sát: ngày, người đến", luong=[("tin", "app", "yêu cầu")]),
  B("app", "Chuyển người bán (chưa lộ số hai bên)", o_dau="he_thong", luong=[("tin", "ban", "yêu cầu khảo sát")]),
  B("ban", "Đồng ý, chọn giờ", luong=[("tin", "app", "đồng ý 8:00 thứ 5")]),
  B("app", "Xác nhận lịch, người đến; gửi địa chỉ và số liên hệ chỉ cho chuyến này", o_dau="he_thong", luong=[("tin", "mua", "địa chỉ, số người bán"), ("tin", "ban", "tên, số người đến")]),
  B("mua", "Xem, chụp, không mua", chi_tiet="Không phát sinh nghĩa vụ, không cọc, không giữ lượng; chi phí đi lại tự chịu; không ghi uy tín xấu.")]
t["vai_tham_gia"] = ["mua", "app", "ban"]

D["phien_ban"] = "7 · 28/10/2026"
D["nguon_chinh"] += " Bản 7: sửa Q18 (khoản đòi thêm chưa bảo đảm, không giữ cọc), ba mức đóng, xử lý hàng còn lại, dư lượng không đạt, biến thể tại vườn, khảo sát vườn."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("7")
