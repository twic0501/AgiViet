# BẢN 4 (28/10/2026): chạy SAU tao_du_lieu.py. Áp hai bản góp ý người sáng lập gửi (rà bản 3):
# tình huống giao ngay (mức bảo vệ khi trả sau, một mốc nghiệm thu, tách giá trị hàng với bồi hoàn, hợp đồng khung một cách,
# cam kết ngân hàng theo đơn, giữ lô có hạn, trạng thái đúng sự kiện, sổ tiền, thu phí, ứng tiền) + 6 tình huống thiếu;
# bảng quyền theo hành động; vòng đời dịch vụ; quy tắc nhân viên, hệ thống; việc cần chốt chia 3 nhóm.
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "quy-trinh.json")
D = json.load(open(P, encoding="utf-8"))
GOC, PV, SL, MT = "goc", "phong_van", "sang_lap", "mau_thuan"
GY = "gop_y"  # theo góp ý rà bản 3 (28/10)
tien = lambda n: f"{n:,}".replace(",", ".") + " đ"
COC, NT, CON, GT = 22_500_000, 73_350_000, 50_850_000, 75_000_000

def B(vai, viec, o_dau="app", luong=(), dieu_kien="", han="", chi_tiet="", nguon=("Góp ý 28/10",), loai=GY, tt=None, so=None, nv="", moc=""):
    return {"vai": vai, "viec": viec, "o_dau": o_dau, "luong": [dict(zip(("loai", "den", "nhan", "tu"), l)) for l in luong],
            "dieu_kien": dieu_kien, "han": han, "chi_tiet": chi_tiet, "nguon": list(nguon), "loai_nguon": loai,
            "trang_thai": tt, "so": so or {}, "trich": "", "nv": nv, "moc": moc}
TH = {t["id"]: t for t in D["tinh_huong"]}
def tim(th, chu):
    for i, b in enumerate(TH[th]["buoc"]):
        if chu in b["viec"]: return i
    raise SystemExit(f"Không thấy bước '{chu}' trong {th}")
def chen_sau(th, chu, *buoc):
    i = tim(th, chu); TH[th]["buoc"][i + 1:i + 1] = list(buoc)
def sua(th, chu, **k):
    if "tt" in k: k["trang_thai"] = k.pop("tt")  # tên trường trong dữ liệu là trang_thai
    b = TH[th]["buoc"][tim(th, chu)]; b.update(k)
    if "loai_nguon" not in k: b["loai_nguon"] = GY
    b["nguon"] = list(dict.fromkeys(b.get("nguon", []) + ["Góp ý 28/10"]))

# ---------- Đơn chính ----------
chen_sau("chinh", "Giữ lô, tạo việc thẩm định",
  B("ban", "Đồng ý giữ 5 tấn, tối đa 7 ngày", luong=[("tin", "app", "đồng ý giữ")], han="12 giờ",
    chi_tiet="Không đồng ý thì không thẩm định. Lô tự nhả khi: kết quả không đạt, bên mua bỏ, hoặc quá 7 ngày chưa chào giá. Phí thẩm định bên mua trả dù kết quả thế nào.",
    nv="Hỗ trợ: báo người bán hạn giữ và lúc nhả."))
sua("chinh", "Điền nghĩa vụ: 5 tấn chắc giao",
    chi_tiet="Người bán điền lượng chắc giao, ngày hái, đóng gói, tài khoản nhận tiền; người đại diện ký và chủ tài khoản ngân hàng có thể khác người tạo tài khoản (cần ủy quyền).")
chen_sau("chinh", "Điền nghĩa vụ: 5 tấn chắc giao",
  B("ban", "Chọn cách được trả, thấy mức bảo vệ", luong=[("tin", "app", "chấp nhận khoản chưa bảo đảm")],
    chi_tiet=f"Ba lựa chọn hiện cạnh nhau: (1) Trả trước khi dỡ: được bảo vệ. (2) Trả sau có ngân hàng cam kết theo đơn: được bảo vệ theo điều kiện ngân hàng. (3) Trả sau nghiệm thu, không có cam kết: chỉ cọc {tien(COC)} bảo vệ; tối đa {tien(CON)} chưa được bảo đảm. Đơn này người bán tự chọn (3) và bấm chấp thuận riêng.",
    dieu_kien="Chọn (3) phải bấm \"Tôi hiểu khoản chưa được bảo đảm\"", loai=GY, nv="Hỗ trợ: gọi giải thích rủi ro khi người bán chọn (3) lần đầu."))
chen_sau("chinh", "Hợp đồng hiệu lực: mở liên lạc",
  B("app", "Gửi hóa đơn phí giới thiệu cho bên mua", o_dau="he_thong", luong=[("giay", "mua", "hóa đơn phí (mức riêng doanh nghiệp)")], han="7 ngày",
    chi_tiet="Thu khi hợp đồng có hiệu lực, hóa đơn riêng, không qua tài khoản cọc. Quá hạn: chặn tạo đơn mới, không chặn đơn đang chạy. Hoàn hay không theo điều khoản khi hủy.", loai=MT))
i = tim("chinh", "Kho ký nhận, QC nghiệm thu 3 phần")
TH["chinh"]["buoc"][i]["chi_tiet"] = "Hạn 2 giờ tính từ lúc người nhận được chỉ định ký nhận trên app (không phải giờ xe tới). 150 kg hạ cấp, 50 kg trả lại do không đạt so mẫu đối chứng lúc bốc (lỗi chất lượng). Nếu hư do đường thì bên mua vẫn trả đủ người bán, tự đòi nhà xe/bảo hiểm."
TH["chinh"]["buoc"][i + 1:i + 1] = [B("mua", "Người được ủy quyền chấp thuận hạ cấp, trả lại", luong=[("tin", "app", "chấp thuận kết quả")],
    chi_tiet="Kho/QC chỉ nhập kết quả. Hạ cấp, nhận thiếu, từ chối lô đổi nghĩa vụ tiền nên cần trưởng thu mua hoặc giám đốc chấp thuận.")]
TH["chinh"]["mo_ta"] += " Bản 4: người bán chọn rõ cách được trả và mức bảo vệ; một mốc nghiệm thu; người có quyền mới chấp thuận hạ cấp."

# ---------- Mốc nghiệm thu thống nhất ----------
sua("ngoai-gio", "Hạn nghiệm thu tính theo giờ xe thực tới", viec="Hạn nghiệm thu vẫn tính từ lúc người nhận ký nhận",
    chi_tiet="Một mốc duy nhất: người nhận được chỉ định ký nhận trên app. Xe tới trễ chỉ cập nhật lịch vận chuyển.")

# ---------- Khác mẫu: tách giá trị hàng với bồi hoàn ----------
sua("khac-mau", "Trừ 300 kg khỏi giá trị", viec="Kết luận nguyên nhân: sai từ lúc bốc (lỗi người bán)",
    chi_tiet="Hai số tách riêng. Giá trị hàng bên mua nhận: chỉ phần đạt. Khoản bồi hoàn: chi phí kho, kiểm định có chứng từ, hợp lý, liên quan trực tiếp. Bên mua ứng trước phí kho, kiểm định; người bán bồi hoàn sau kết luận. Nếu kết luận hư do đường: bên mua trả đủ, đòi nhà xe/bảo hiểm.")

# ---------- Hợp đồng khung: một cách ----------
TH["khung"]["mo_ta"] = "Bếp ăn đặt thanh long thứ 2 và thứ 5. Cọc khung bảo đảm trong giới hạn: hàng đã giao chưa trả + cam kết sắp giao không vượt cọc khung. Muốn vượt giới hạn thì qua ngân hàng."
sua("khung", "Đã giao chưa trả vượt cọc khung", viec="Kiểm mức: đã giao chưa trả + sắp giao ≤ cọc khung",
    chi_tiet="Kiểm trước mỗi lần gọi hàng, tính cả các chuyến đã cam kết để nhiều chuyến không cùng vượt. Vượt thì dừng cam kết mới; phần vượt chỉ qua cam kết ngân hàng.")

# ---------- Ngân hàng: cam kết theo đơn, không phải hạn mức ----------
T2 = TH["tra-sau-ngan-hang"]
T2["ten"] = "Trả sau: ngân hàng cam kết thanh toán theo đơn"
T2["mo_ta"] = "Bên mua có hạn mức vay; khi ký, ngân hàng phát hành cam kết thanh toán cho đúng đơn (có điều kiện, thời hạn). Không có cọc tiền mặt. Nghiệm thu xong ngân hàng chuyển thẳng giá trị nghiệm thu cho người bán. Cơ chế phải được ngân hàng xác nhận."
sua("tra-sau-ngan-hang", "trong hạn mức (thay cọc)", viec="Phát hành cam kết thanh toán theo đơn", loai_nguon=MT,
    chi_tiet="Khác hạn mức vay: cam kết ghi đơn, số tiền tối đa, điều kiện giải ngân (nghiệm thu đã chốt), hạn hiệu lực, xử lý khi tranh chấp. Chưa giải ngân, chưa tính lãi. Cần ngân hàng xác nhận.")
sua("tra-sau-ngan-hang", "ngân hàng đã bảo đảm đủ", viec="Báo người bán: đã có cam kết thanh toán có điều kiện",
    chi_tiet="Hiện điều kiện và hạn của cam kết; không ghi \"bảo đảm 100%\".")
T3 = TH["tra-sau-mua-vi-pham"]
T3["vi_du"] = {"ma": "HĐ-0101 (trả sau)", "gia_tri": GT, "ghi": "Ví dụ bồi thường 30% giá trị đơn = 22.500.000 đ (đề xuất, chờ chốt)."}
sua("tra-sau-mua-vi-pham", "Chi bồi thường cho người bán", so={"tra_thang": 22_500_000}, loai_nguon=MT)
sua("tra-sau-mua-vi-pham", "Đang khoanh", viec="Đang có cam kết thanh toán theo đơn")

# ---------- Trạng thái đúng sự kiện ----------
TH["ban-vi-pham"]["trang_thai"] = ["Hợp đồng chờ ký", "Chờ cọc", "Đã cọc, chờ giao", "Quyết toán cọc", "Đã hủy · còn nghĩa vụ bồi hoàn", "Đã hủy"]
sua("ban-vi-pham", "Không trả bồi hoàn", tt="Đã hủy · còn nghĩa vụ bồi hoàn")
TH["qua-han-coc"]["trang_thai"] = ["Chờ cọc", "Đã đóng · quá hạn cọc"]
sua("qua-han-coc", "Đóng đơn, lượng về lô", tt="Đã đóng · quá hạn cọc")
TH["mua-huy"]["trang_thai"] = ["Hợp đồng chờ ký", "Chờ cọc", "Đã cọc, chờ giao", "Quyết toán cọc", "Đã hủy"]
sua("mua-huy", "Chuyển 50% cho người bán", tt="Đã hủy", loai_nguon=MT)
TH["tra-sau-mua-vi-pham"]["trang_thai"] = ["Đã cọc, chờ giao", "Đang giao", "Đang kiểm định", "Đã hủy"]
sua("tra-sau-mua-vi-pham", "Nhả phần khoanh còn lại", viec="Hết hiệu lực cam kết, đóng đơn", tt="Đã hủy")

# ---------- Ứng tiền: tách gốc, phí, thực nhận ----------
UNG, PHI = 52_500_000, 787_500
sua("ung-tien", "Ứng tiền, trừ phí ứng", luong=[{"loai": "tien", "den": "ban", "nhan": tien(UNG - PHI)}],
    chi_tiet=f"Ứng gốc 70% × 75.000.000 = {tien(UNG)}; phí 1,5% = {tien(PHI)}; người bán thực nhận {tien(UNG - PHI)}. Số liệu đề xuất, chờ ngân hàng.", loai_nguon=MT)
sua("ung-tien", "Thu khoản ứng", viec="Thu khoản ứng gốc, chuyển phần dư cho người bán", luong=[{"loai": "tien", "den": "ban", "nhan": tien(CON + COC - UNG)}],
    so={"coc_giu": 0, "coc_chi_ban": 0, "tra_thang": UNG - PHI + CON + COC - UNG},
    chi_tiet=f"Ngân hàng nhận {tien(CON)} + giữ cọc {tien(COC)} = {tien(NT)}; thu ứng gốc {tien(UNG)}; chuyển người bán {tien(NT - UNG)}. Người bán thực nhận tổng {tien(NT - PHI)} = nghiệm thu − phí ứng.", loai_nguon=MT)

# ---------- 6 tình huống còn thiếu (giao ngay) ----------
TT = D["trang_thai_don"]
def them(id, ten, mo, buoc, vi_du=None, tt=None, vai=None):
    D["tinh_huong"].append({"id": id, "ten": ten, "nhom": "giao_ngay_bien", "mo_ta": mo, "nguon": ["Góp ý 28/10"], "loai_nguon": GY, "buoc": buoc,
                            "vi_du": vi_du or {"ma": "HĐ-0101", "gia_tri": GT}, "trang_thai": tt or TT, "vai_tham_gia": vai or []})
them("coc-sai", "Cọc chuyển thiếu, thừa, trễ, sau khi đơn đóng",
  "Ngân hàng chỉ ghi nhận đúng số, đúng đơn. Thiếu thì chưa hiệu lực; thừa thì hoàn phần thừa; tới sau khi đơn đã đóng thì hoàn toàn bộ; báo trễ thì không đóng đơn khi chưa đối chiếu.",
  [B("mua", "Chuyển cọc thiếu 2.500.000", o_dau="ngoai_app", luong=[("tien", "nh", "20.000.000 đ")], tt="Chờ cọc"),
   B("nh", "Báo nhận 20.000.000 / 22.500.000", o_dau="ngan_hang", luong=[("tin", "app", "thiếu")]),
   B("app", "Hợp đồng chưa hiệu lực; báo bên mua chuyển bù trước hạn", o_dau="he_thong", luong=[("tin", "mua", "chuyển bù 2.500.000")], han="trong hạn cọc"),
   B("mua", "Chuyển bù nhầm 5.000.000 (thừa 2.500.000)", o_dau="ngoai_app", luong=[("tien", "nh", "5.000.000 đ")]),
   B("nh", "Giữ đúng 22.500.000, hoàn phần thừa 2.500.000", o_dau="ngan_hang", luong=[("tien", "mua", "2.500.000 đ")], so={"coc_giu": COC}, tt="Đã cọc, chờ giao",
     chi_tiet="Không giữ tiền thừa trong tài khoản cọc."),
   B("nv", "Ngân hàng báo trễ 3 giờ sau hạn: đối chiếu giờ chuyển", o_dau="nhan_vien", chi_tiet="Tiền vào trước hạn mà báo trễ thì vẫn tính kịp. Tiền vào sau khi đơn đã đóng thì hoàn toàn bộ, không mở lại đơn.", nv="Đối soát tài chính.")],
  vai=["mua", "nh", "app", "nv"])
them("tra-mot-phan", "Bên mua trả một phần, trả trùng",
  "Mỗi khoản trả thẳng là một dòng riêng có số tiền, ngày, chứng từ, người bán xác nhận. Trả trùng thì người bán phải hoàn phần trùng ngoài app.",
  [B("mua", "Trả lần 1: 30.000.000", o_dau="ngoai_app", luong=[("tien", "ban", "30.000.000 đ")], tt="Chờ thanh toán", so={"coc_giu": COC, "phai_tra": NT}),
   B("ban", "Xác nhận đã nhận 30.000.000", so={"tra_thang": 30_000_000}),
   B("mua", "Trả lần 2: 20.850.000", o_dau="ngoai_app", luong=[("tien", "ban", "20.850.000 đ")]),
   B("mua", "Bấm nhầm, chuyển lại 20.850.000 lần nữa", o_dau="ngoai_app", luong=[("tien", "ban", "20.850.000 đ (trùng)")]),
   B("ban", "Xác nhận lần 2; báo có khoản trùng", so={"tra_thang": 50_850_000, "con_no": "Người bán giữ thừa 20.850.000 đ của bên mua"}),
   B("app", "Đủ phần còn lại: chuyển cọc; ghi công nợ trả lại phần trùng", o_dau="he_thong", luong=[("giay", "nh", "lệnh cọc")], tt="Quyết toán cọc"),
   B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}),
   B("ban", "Trả lại 20.850.000; bên mua xác nhận", o_dau="ngoai_app", luong=[("tien", "mua", "20.850.000 đ")], so={"con_no": ""}, tt="Hoàn tất", nv="Đối soát: chưa trả lại thì không Hoàn tất.")],
  tt=TT + ["Đã giao xong · còn công nợ"], vai=["mua", "ban", "app", "nh"])
them("tranh-chap-mot-dong", "Chỉ tranh chấp một dòng hàng",
  "Người bán đồng ý 4.800 kg đạt, chỉ phản đối 150 kg hạ cấp. Phần thống nhất được trả và quyết toán; chỉ giữ lại phần giá trị đang tranh chấp.",
  [B("mua", "Nghiệm thu: 4.800 đạt, 150 hạ cấp, 50 trả lại", luong=[("tin", "ban", "kết quả")], tt="Chờ người bán xác nhận", so={"coc_giu": COC, "phai_tra": NT}),
   B("ban", "Đồng ý dòng đạt và trả lại; phản đối dòng hạ cấp", luong=[("giay", "app", "ảnh 150 kg")]),
   B("app", "Tách: phần thống nhất 72.000.000; phần tranh chấp 900.000", o_dau="he_thong", luong=[("giay", "mua", "bảng tách")],
     chi_tiet="150 kg × (15.000 − 9.000) = 900.000 đ là chênh lệch đang tranh chấp. Bên mua trả ngay phần thống nhất trừ cọc; giữ lại 900.000 chờ kết luận."),
   B("mua", "Trả 49.500.000 (phần thống nhất 72.000.000 − cọc)", o_dau="ngoai_app", luong=[("tien", "ban", "49.500.000 đ")], tt="Chờ thanh toán"),
   B("ban", "Xác nhận đã nhận", so={"tra_thang": 49_500_000}),
   B("dt", "Kiểm định dòng hạ cấp", o_dau="ngoai_app", han="48 giờ", luong=[("giay", "app", "kết luận: đúng hạ cấp")]),
   B("app", "Chốt dòng theo kết luận: giá 9.000; người bán chịu phí kiểm định", o_dau="he_thong", so={"phai_tra": NT}),
   B("mua", "Trả nốt 1.350.000 (150 × 9.000)", o_dau="ngoai_app", luong=[("tien", "ban", "1.350.000 đ")]),
   B("ban", "Xác nhận; đủ điều kiện chuyển cọc", so={"tra_thang": 50_850_000}, tt="Quyết toán cọc"),
   B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Hoàn tất")],
  vai=["mua", "ban", "app", "dt", "nh"])
them("hang-tra-lai", "Hàng bị trả lại: ở đâu, ai giữ, ai chịu",
  "50 kg trả lại nằm ở kho bên mua. Biên bản ghi nơi giữ, người giữ, hạn xử lý; người bán chọn lấy về, bán gấp tại chỗ hay tiêu hủy có biên bản. Chi phí giữ theo kết luận lỗi.",
  [B("mua", "Ghi biên bản: 50 kg giữ tại kho Bến Lức", luong=[("giay", "ban", "biên bản giữ hộ")], han="giữ tối đa 48 giờ (đề xuất)"),
   B("ban", "Chọn: bán gấp tại chỗ", luong=[("tin", "app", "bán gấp")], chi_tiet="Lựa chọn khác: lấy về (người bán trả xe), tiêu hủy có biên bản."),
   B("app", "Báo bên nhận hàng kém loại gần Long An", o_dau="he_thong", luong=[("tin", "mua", "lô 50 kg")]),
   B("mua", "Hết 48 giờ chưa xử lý: tiêu hủy có biên bản, ảnh", luong=[("giay", "app", "biên bản tiêu hủy")], chi_tiet="Phí giữ, tiêu hủy: người bán chịu nếu trả lại đúng căn cứ; bên mua chịu nếu kiểm định kết luận trả sai."),
   B("nv", "Ghi chi phí vào phiếu bồi hoàn nếu có", o_dau="nhan_vien", nv="Đối soát tài chính.")],
  vi_du={}, tt=["Chờ xử lý hàng trả lại", "Đã xử lý"], vai=["mua", "ban", "app", "nv"])
them("nghiem-thu-im-lang", "Người bán im lặng; bên mua xin gia hạn kiểm",
  "Kho chưa kịp kiểm trong 2 giờ thì bấm \"Chưa kiểm được\" kèm lý do, được gia hạn một lần nếu hợp đồng có điều khoản. Người bán không chốt số thì không tự coi là đồng ý.",
  [B("mua", "Ký nhận 20:00, kho thiếu QC: \"Chưa kiểm được\"", luong=[("tin", "app", "xin gia hạn")], han="trong 2 giờ", moc="20:00"),
   B("app", "Gia hạn một lần tới 8:00 sáng (theo điều khoản)", o_dau="he_thong", luong=[("tin", "ban", "đã gia hạn, lý do")], chi_tiet="Không có điều khoản gia hạn thì quá 2 giờ coi như đạt theo hợp đồng."),
   B("mua", "QC nghiệm thu 7:30", luong=[("tin", "ban", "kết quả")], tt="Chờ người bán xác nhận", moc="7:30"),
   B("app", "24 giờ người bán chưa chốt: nhắc 3 lần", o_dau="he_thong", luong=[("tin", "ban", "nhắc")], han="24 giờ"),
   B("nv", "Gọi người bán, rồi đối chiếu biên bản bốc, ảnh, mẫu", o_dau="nhan_vien", chi_tiet="Im lặng không phải đồng ý; cọc vẫn giữ tới khi chốt bằng xác nhận hoặc đối chiếu.", nv="Hòa giải."),
   B("ban", "Chốt số sau cuộc gọi", luong=[("tin", "app", "đã chốt")], tt="Chờ thanh toán")],
  vai=["mua", "app", "ban", "nv"])
them("lenh-ngan-hang-loi", "Lệnh ngân hàng bị từ chối hoặc chưa rõ kết quả",
  "Mỗi lệnh có mã duy nhất gắn đơn, phiên bản, số tiền, tài khoản nhận tại lúc lập. Chưa rõ kết quả thì hỏi lại trạng thái, không gửi lệnh mới; bị từ chối mới lập lệnh thay.",
  [B("app", "Gửi lệnh chuyển cọc mã L-0101-1", o_dau="he_thong", luong=[("giay", "nh", "L-0101-1 · " + tien(COC))], tt="Quyết toán cọc", so={"coc_giu": COC}),
   B("nh", "Quá 30 phút chưa báo kết quả", o_dau="ngan_hang"),
   B("app", "Hỏi trạng thái L-0101-1 (không gửi lệnh mới)", o_dau="he_thong", luong=[("tin", "nh", "tra cứu")], chi_tiet="Gửi lại cùng mã thì ngân hàng trả kết quả cũ, không chi hai lần."),
   B("nh", "Báo từ chối: tài khoản nhận bị khóa", o_dau="ngan_hang", luong=[("tin", "app", "từ chối")]),
   B("nv", "Liên hệ người bán đổi tài khoản theo quy trình", o_dau="nhan_vien", chi_tiet="Đổi tài khoản cần chủ tài khoản xác nhận; chỉ áp dụng cho lệnh mới, lệnh cũ giữ nguyên thông tin.", nv="Đối soát tài chính."),
   B("app", "Lập lệnh thay L-0101-2 sang tài khoản mới", o_dau="he_thong", luong=[("giay", "nh", "L-0101-2")]),
   B("nh", "Chuyển thành công", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Hoàn tất")],
  vai=["app", "nh", "nv", "ban"])
D["ten_nhom"]["giao_ngay_bien"] = "Giao ngay: các nhánh cần chốt thêm"

# ---------- Bảng quyền theo hành động ----------
D["quyen"] = {
 "mo_ta": "Mỗi hành động ghi ai được xem, lập đề nghị, chấp thuận/ký, xác nhận tiền. Thu hồi quyền không xóa dấu người đã làm trước đó.",
 "dinh_danh": [["Người tạo tài khoản", "Người đăng ký app; có thể chỉ là nhân viên của trang trại hoặc doanh nghiệp."],
               ["Người đại diện ký", "Người có quyền ký hợp đồng (chủ hộ, giám đốc, người được ủy quyền bằng giấy có thời hạn)."],
               ["Chủ tài khoản ngân hàng", "Tên trên tài khoản nhận hoặc trả tiền; phải khớp người bán hoặc tổ chức đã xác minh."]],
 "hanh_dong": [
  # [hành động, bên, xem, lập đề nghị, chấp thuận / ký, xác nhận tiền]
  ["Đăng lô", "Bán", "Mọi vai", "Quản lý sản xuất", "Chủ / đại diện", "—"],
  ["Chấp nhận giá, giữ lượng", "Bán", "Mọi vai", "Quản lý sản xuất", "Chủ / đại diện", "—"],
  ["Ký hợp đồng", "Bán", "Mọi vai", "Hệ thống soạn", "Người đại diện ký", "—"],
  ["Chốt số cân", "Bán", "Mọi vai", "Quản lý sản xuất", "Chủ / đại diện", "—"],
  ["Xác nhận đã nhận tiền", "Bán", "Chủ, kế toán", "—", "—", "Chủ tài khoản hoặc kế toán được ủy quyền"],
  ["Đổi tài khoản nhận tiền", "Bán", "Chủ", "Chủ", "Chủ tài khoản (mã OTP + chờ 24 giờ)", "—"],
  ["Tạo phiếu nhu cầu, chào giá", "Mua", "Mọi vai", "Thu mua", "Thu mua (trong hạn mức) / giám đốc", "—"],
  ["Ký hợp đồng", "Mua", "Mọi vai", "Thu mua", "Giám đốc / người được ủy quyền", "—"],
  ["Chuyển cọc, trả tiền", "Mua", "Kế toán, giám đốc", "Kế toán", "Giám đốc duyệt chi", "Kế toán ghi đã trả"],
  ["Nhập kết quả nghiệm thu", "Mua", "Mọi vai", "Kho / QC", "—", "—"],
  ["Chấp thuận hạ cấp, nhận thiếu, từ chối lô", "Mua", "Mọi vai", "Kho / QC đề nghị", "Trưởng thu mua / giám đốc", "—"],
  ["Lệnh tiền theo điều kiện đã thống nhất", "AgiViet", "Đối soát", "Hệ thống lập", "Hệ thống kiểm điều kiện, gửi", "Ngân hàng"],
  ["Lệnh tiền ngoại lệ", "AgiViet", "Đối soát, quản trị", "Nhân viên đối soát", "Người khác duyệt (không tự lập tự duyệt)", "Ngân hàng"],
  ["Kết luận tranh chấp", "AgiViet", "Hai bên, hòa giải", "Hòa giải đề xuất", "Có hiệu lực khi: hai bên đồng ý, hoặc theo điều khoản đã ký, hoặc kết quả kiểm định/trọng tài", "—"]],
}
# Cửa xác minh bên mua
D["tinh_huong"].append({"id": "dang-ky-mua", "ten": "Đăng ký bên mua: xác minh doanh nghiệp", "nhom": "dich_vu", "loai_nguon": GY, "nguon": ["Góp ý 28/10"],
  "mo_ta": "Trước khi được tạo cam kết, nhân viên kiểm tư cách doanh nghiệp, người đại diện ký, người nhận hàng và tài khoản thanh toán.", "vi_du": {}, "vai_tham_gia": ["mua", "app", "nv", "qt"],
  "buoc": [B("mua", "Đăng ký: mã số thuế, giấy phép, người đại diện", luong=[("giay", "app", "hồ sơ")]),
           B("nv", "Kiểm mã số thuế đang hoạt động, giấy ủy quyền ký", o_dau="nhan_vien", luong=[("giay", "app", "kết quả")], nv="Xác minh (hồ sơ)."),
           B("nv", "Kiểm tài khoản thanh toán đứng tên doanh nghiệp", o_dau="nhan_vien", nv="Đối soát tài chính."),
           B("mua", "Khai người nhận hàng, kho, QC", luong=[("giay", "app", "danh sách người nhận")]),
           B("app", "Mở quyền tạo phiếu và cam kết", o_dau="he_thong", luong=[("tin", "mua", "đã xác minh")])]})

# ---------- Dịch vụ: vòng đời, hoàn phí, quy tắc ----------
D["dich_vu"]["vong_doi"] = ["Yêu cầu", "Báo giá", "Người có quyền chấp thuận", "Đặt thành công", "Thực hiện", "Xác nhận kết quả", "Thanh toán hoặc khiếu nại"]
D["dich_vu"]["hoan_phi"] = [
 ["Dịch vụ làm đúng, nhưng giao dịch hàng hỏng", "Trả phần đã làm và phí hủy theo thỏa thuận; bên có lỗi bồi hoàn"],
 ["Đối tác không đến hoặc không làm", "Hoàn khoản đã trả, đổi đối tác; đối tác chịu theo hợp đồng dịch vụ"],
 ["Làm thiếu, sai hoặc gây hư hỏng", "Khiếu nại dịch vụ; hoàn phí hoặc bồi hoàn theo kết quả"],
 ["Hai bên mua bán cùng đổi kế hoạch", "Báo chi phí thay đổi trước khi đồng ý; ai đề nghị đổi trả phần chênh"]]
D["dich_vu"]["quy_tac"] = [
 ["Ai ký với đối tác", "Bên dùng dịch vụ (mua hoặc bán). AgiViet chỉ đặt hộ khi được ủy quyền; nhân viên không tự tạo chi phí chưa được duyệt."],
 ["Phí phát sinh", "Chờ xe, đổi tuyến, bốc dỡ, lưu kho, lấy mẫu lại: báo trước, có mức tối đa; vượt mức phải người có quyền chấp thuận."],
 ["Chuỗi giữ mẫu", "Mẫu ghi lô, người lấy, người niêm phong, người giữ, nơi giữ, lúc mở; mất niêm phong thì không còn giá trị đối chiếu."],
 ["Bảo hiểm", "Chỉ hiện \"được bảo hiểm\" khi có xác nhận hiệu lực, phạm vi, người thụ hưởng, điều kiện bồi thường."],
 ["Công suất pilot", "Xác minh, thẩm định có giới hạn vùng phục vụ, số lượt mỗi ngày và hàng đợi; hết chỗ thì báo ngày sớm nhất."],
 ["Khoản bồi hoàn", "Chỉ chi phí thực tế có chứng từ, liên quan trực tiếp, hợp lý, đã cố giảm thiểu; không cộng chồng với khoản phạt cọc cho cùng thiệt hại."]]
for r in D["dich_vu"]["ds"]:
    if r[0] == "Giữ cọc qua ngân hàng": pass
    if "không hoàn" in r[4]: r[4] = r[4].replace("không hoàn", "xử lý theo bảng hoàn phí")
D["dich_vu"]["mo_ta"] = "AgiViet là bên trung gian trung lập: không mua bán thay, không giữ hàng, không cho vay. Dịch vụ đối tác trả thẳng đối tác, không qua tài khoản cọc. Dịch vụ đã dùng xử lý theo bảng hoàn phí bên dưới, không mặc định \"không hoàn\"."
for v in D["vai"]:
    if v["id"] == "dt": v["mo"] = "Người dùng trả thẳng đối tác qua app đặt, không qua tài khoản cọc. Hoàn phí theo bảng ở mục Dịch vụ."; v["khong"] = "tự tăng phí ngoài báo giá đã duyệt"

# ---------- Quy tắc nhân viên, quản trị ----------
D["van_hanh"]["quy_tac"] = [
 ["Lệnh tiền", "Lệnh theo điều kiện đã thống nhất: hệ thống lập và gửi. Lệnh ngoại lệ: có căn cứ, người đề xuất và người duyệt khác nhau, không phụ thuộc số tiền nhỏ hay lớn."],
 ["Kết luận tranh chấp", "Có hiệu lực khi hai bên đồng ý, hoặc theo điều khoản đã ký, hoặc theo kiểm định/trọng tài đã thỏa thuận. Quản trị duyệt không thay được căn cứ này."],
 ["Chính sách có phiên bản", "Đổi phí, hạn, bảng xử lý cọc chỉ áp dụng cho đơn ký sau; không sửa nghĩa vụ đã ký."],
 ["Quyền truy cập", "Mỗi người tài khoản riêng, xác thực hai lớp, phạm vi quyền, thu hồi khi nghỉ, nhật ký mọi thao tác."],
 ["Chủ việc", "Mỗi việc có người phụ trách, hạn, người thay ca, điều kiện đóng việc."],
 ["Kháng nghị", "Khóa tài khoản, trừ hạng, kết luận lỗi: ghi lý do, cho yêu cầu xem lại trong 7 ngày (đề xuất), người xem lại khác người quyết."],
 ["Hạn khi chờ hỗ trợ ban đêm", "Người dùng đã báo sự cố cho trợ lý AI trước khi hết hạn thì hạn của việc đó tạm dừng tới khi nhân viên xử lý; hệ thống báo cả hai bên. Không áp cho hạn trả tiền."]]

# ---------- Quy tắc hệ thống ----------
D["he_thong"]["quy_tac"] = [
 ["Lô tự ẩn sau 14 ngày", "Chỉ ngừng gợi ý tin; lượng đã giữ, đã ký, đang giao không bị đụng tới."],
 ["Kho bên mua", "Tách: hàng nhận giữ hộ / chờ kiểm, hàng đạt, hàng bị từ chối. Hàng đang tranh chấp không được xuất dùng."],
 ["Hạng người bán", "Hiện riêng giấy tờ, nhật ký, lịch sử giao dịch; nhật ký đều không chứng minh hàng đạt, thiếu chứng chỉ không chứng minh hàng kém."],
 ["Uy tín bên mua", "Trả hàng chỉ trừ uy tín sau khi xác định trả sai; trả đúng căn cứ không bị trừ."],
 ["Giá tham khảo", "Ghi nền so sánh: loại, thời điểm, lượng, nơi giao, vận chuyển, điều kiện trả; ít hoặc cũ thì báo rõ; không ép thành giá chuẩn."],
 ["Ghép giấu giá", "Cho biết vì sao ghép, tiêu chí bắt buộc nào đạt, phần nào thiếu; không xếp theo giá thấp."],
 ["Ngày hết cách ly", "Thiếu tên thuốc, cây trồng hay số ngày thì báo chưa đủ thông tin, không tự đưa ngày."],
 ["Thông báo", "Tách: gửi thành công, đã đọc, đã làm; việc quan trọng chưa đọc thì gọi hoặc SMS; có đường hỗ trợ khi lỗi."],
 ["Kết quả ngân hàng", "Mỗi lệnh có mã duy nhất gắn đơn, phiên bản, số tiền, tài khoản nhận lúc lập; xử lý được báo trùng, trễ, sai thứ tự, chưa rõ; không gửi lại gây chi hai lần."]]

# ---------- Việc cần chốt: 3 nhóm + thông tin quyết định ----------
NHOM = {"V1": "Chốt để duyệt luồng V1", "PILOT": "Xác nhận trước pilot thật", "SAU": "Có thể để sau"}
gan = {
 "Cọc của bên mua đi đâu khi có vi phạm": ("V1", ["ban-vi-pham", "mua-huy", "tra-sau-mua-vi-pham"], "Rà pháp lý theo loại hợp đồng; không tính chồng với bồi hoàn"),
 "Đã giao hàng mà bên mua không trả: cọc là phạt hay là trừ nợ": ("V1", ["chua-tra"], "Ý kiến luật sư về bản chất khoản cọc"),
 "Chi phí dịch vụ đã dùng khi đơn hỏng": ("V1", ["ban-vi-pham", "khac-mau", "hang-tra-lai"], "Chứng từ chi phí, giới hạn hợp lý, nghĩa vụ giảm thiểu"),
 "Trả sau qua ngân hàng": ("PILOT", ["tra-sau-ngan-hang", "tra-sau-mua-vi-pham"], "Văn bản ngân hàng về cam kết thanh toán theo đơn"),
 "Bất khả kháng theo thời điểm báo": ("V1", ["bat-kha-khang"], "Xác minh sự kiện, ảnh hưởng thực tế, nghĩa vụ thông báo, phương án giảm thiệt hại"),
 "Phí bên mua theo doanh nghiệp": ("PILOT", ["chinh"], "Làm việc với bên mua thật"),
 "Thẩm định lô trước hợp đồng": ("V1", ["chinh"], "Thời gian, giá phòng thử nghiệm thật"),
 "Tiền mặt với bên mua chưa quen": ("V1", ["tien-mat", "chua-tra"], ""),
 "Tuyến, mặt hàng thử nghiệm và số thật": ("PILOT", ["chinh"], "Số liệu chở, kiểm kho, hao hụt, giá"),
 "Giờ làm nhân viên, trực đêm, ngưỡng duyệt": ("PILOT", ["ngoai-gio", "quan-tri"], ""),
}
for c in D["can_chot"]:
    n, th, bc = gan.get(c["chu_de"], ("V1", [], ""))
    c.update({"nhom": n, "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "tinh_huong": th, "bang_chung": bc, "pham_vi": "Đơn ký sau khi chốt"})
    if c["chu_de"] == "Bất khả kháng theo thời điểm báo":
        c["de_xuat"] = "Thời điểm báo là một yếu tố, không tự kết luận miễn trách. Cần: xác minh sự kiện, ảnh hưởng thực tế, đã báo kịp chưa, đã giảm thiệt hại chưa."
    if c["chu_de"] == "Tuyến, mặt hàng thử nghiệm và số thật":
        c["de_xuat"] = "Duyệt logic bằng số giả định được; thay hoặc xác nhận thông số vận hành trước pilot thật."
D["can_chot"] += [
 {"chu_de": "Cách được trả và mức bảo vệ người bán", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Mọi đơn giao ngay",
  "tinh_huong": ["chinh", "tien-mat", "chua-tra", "tra-sau-ngan-hang"], "bang_chung": "",
  "lua_chon": [["Trả trước khi dỡ", "Được bảo vệ"], ["Trả sau có ngân hàng cam kết theo đơn", "Được bảo vệ theo điều kiện ngân hàng"], ["Trả sau nghiệm thu không cam kết", "Chỉ cọc bảo vệ; người bán phải chấp thuận rõ"]],
  "de_xuat": "Mặc định (1) với bên mua mới; (3) chỉ khi người bán chủ động chấp thuận.", "can_cu": "Góp ý 28/10"},
 {"chu_de": "Hợp đồng khung: công nợ bảo đảm thế nào", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Hợp đồng khung", "tinh_huong": ["khung"], "bang_chung": "",
  "lua_chon": [["Cọc khung bảo đảm trong giới hạn (tính cả cam kết sắp giao)", "Đang dùng trong mô phỏng"], ["Mọi giao trước trả sau đều qua ngân hàng", "Chặt hơn"]],
  "de_xuat": "Cách thứ nhất; vượt giới hạn mới qua ngân hàng.", "can_cu": "Góp ý 28/10; tài liệu 24/10"},
 {"chu_de": "Giữ lô khi thẩm định", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Thẩm định lô", "tinh_huong": ["chinh"], "bang_chung": "",
  "lua_chon": [["Người bán đồng ý lượng và hạn giữ", "Bắt buộc"], ["Nhả lô", "Không đạt, bên mua bỏ, quá hạn"], ["Hạn tối đa", "7 ngày (đề xuất)"]],
  "de_xuat": "Như trên; phí thẩm định bên mua trả dù kết quả nào.", "can_cu": "Góp ý 28/10"},
 {"chu_de": "Thu phí giới thiệu", "loai": GY, "nhom": "PILOT", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Bên mua", "tinh_huong": ["chinh"], "bang_chung": "",
  "lua_chon": [["Lúc thu", "Khi hợp đồng có hiệu lực, hóa đơn riêng"], ["Quá hạn", "Chặn đơn mới, không chặn đơn đang chạy"]],
  "de_xuat": "Như trên.", "can_cu": "Góp ý 28/10"},
 {"chu_de": "Người có quyền chấp thuận nghiệm thu bên mua", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Bên mua", "tinh_huong": ["chinh"], "bang_chung": "",
  "lua_chon": [["Kho/QC nhập; trưởng thu mua/giám đốc chấp thuận thay đổi tiền", "Đề xuất"], ["Kho/QC chốt luôn", "Nhanh nhưng rủi ro"]],
  "de_xuat": "Đề xuất thứ nhất.", "can_cu": "Góp ý 28/10"},
 {"chu_de": "Tạm dừng hạn khi đang chờ hỗ trợ", "loai": GY, "nhom": "V1", "trang_thai": "Chưa chốt", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "Mọi hạn trừ hạn trả tiền", "tinh_huong": ["ngoai-gio"], "bang_chung": "",
  "lua_chon": [["Đã báo trợ lý AI trước khi hết hạn", "Tạm dừng tới khi nhân viên xử lý"], ["Không tạm dừng", "Người dùng có thể hết hạn khi đang chờ"]],
  "de_xuat": "Tạm dừng, báo cả hai bên.", "can_cu": "Góp ý 28/10"},
 {"chu_de": "Mở rộng sau V1", "loai": GY, "nhom": "SAU", "trang_thai": "Để sau", "nguoi_chot": "Người sáng lập", "han": "", "pham_vi": "", "tinh_huong": ["dat-truoc", "bao-tieu", "khung"], "bang_chung": "",
  "lua_chon": [["AI nâng cao, tự động phân hạng, báo cáo sâu", "Sau V1"], ["Đặt trước, bao tiêu, khung đầy đủ", "Hiện là mô tả rút gọn, chưa duyệt đầy đủ"]],
  "de_xuat": "Chốt giao ngay trước.", "can_cu": "Góp ý 28/10"}]
D["nhom_chot"] = NHOM
D["phien_ban"] = "4 · 28/10/2026"
D["nguon_chinh"] += " Bản 4 áp hai bản góp ý rà bản 3 (chấm xanh dương): mức bảo vệ khi trả sau, một mốc nghiệm thu, tách giá trị hàng với bồi hoàn, cam kết ngân hàng theo đơn, giữ lô có hạn, quyền theo hành động, vòng đời dịch vụ, quy tắc vận hành, 6 nhánh giao ngay."

ids = {t["id"] for t in D["tinh_huong"]}
for c in D["can_chot"]:
    assert all(x in ids for x in c.get("tinh_huong", [])), c["chu_de"]
json.dump(D, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok bản 4:", len(D["tinh_huong"]), "tình huống,", sum(len(t["buoc"]) for t in D["tinh_huong"]), "bước,", len(D["can_chot"]), "việc cần chốt")
