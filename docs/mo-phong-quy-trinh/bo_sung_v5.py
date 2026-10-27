# BẢN 5 (28/10/2026): chạy SAU bo_sung_v4.py. Sửa theo rà bản 4:
# tách tiền tranh chấp một dòng; khoản chưa bảo đảm theo giá trị hợp đồng; sổ tiền tách tiền thực vào / phải hoàn / ứng / phí;
# tạm dừng hạn có giới hạn; hàng trả lại không tự tiêu hủy; giữ lô sau khi người bán đồng ý; đồng bộ quy tắc giữa các mục.
import json, os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quy-trinh.json")
D = json.load(open(P, encoding="utf-8"))
GY = "gop_y"
tien = lambda n: f"{n:,}".replace(",", ".") + " đ"
COC, NT, CON, GT = 22_500_000, 73_350_000, 50_850_000, 75_000_000
TH = {t["id"]: t for t in D["tinh_huong"]}
def B(vai, viec, o_dau="app", luong=(), chi_tiet="", han="", tt=None, so=None, nv="", dieu_kien=""):
    return {"vai": vai, "viec": viec, "o_dau": o_dau, "luong": [dict(zip(("loai", "den", "nhan"), l)) for l in luong], "dieu_kien": dieu_kien, "han": han,
            "chi_tiet": chi_tiet, "nguon": ["Góp ý 28/10 (rà bản 4)"], "loai_nguon": GY, "trang_thai": tt, "so": so or {}, "trich": "", "nv": nv, "moc": ""}
def tim(th, chu):
    for i, b in enumerate(TH[th]["buoc"]):
        if chu in b["viec"]: return i
    raise SystemExit(f"Không thấy '{chu}' trong {th}")
def sua(th, chu, **k):
    if "tt" in k: k["trang_thai"] = k.pop("tt")
    b = TH[th]["buoc"][tim(th, chu)]; b.update(k); b["loai_nguon"] = k.get("loai_nguon", GY)
    b["nguon"] = list(dict.fromkeys(b.get("nguon", []) + ["Góp ý 28/10 (rà bản 4)"]))

# 1. Tranh chấp một dòng: phần thống nhất 73.350.000, tranh chấp chỉ 900.000 chênh giá
TH["tranh-chap-mot-dong"]["mo_ta"] = ("Người bán đồng ý 4.800 kg đạt và 50 kg trả lại; chỉ phản đối giá của 150 kg (bên mua tính 9.000, người bán đòi 15.000). "
  "Phần cả hai công nhận là 73.350.000 đ: trả ngay phần còn lại 50.850.000 và chuyển toàn bộ cọc. Chỉ chênh lệch 900.000 đ xử lý riêng sau kiểm định.")
TH["tranh-chap-mot-dong"]["buoc"] = [
  B("mua", "Nghiệm thu: 4.800 đạt, 150 hạ cấp, 50 trả lại", luong=[("tin", "ban", "kết quả")], tt="Chờ người bán xác nhận", so={"coc_giu": COC, "phai_tra": NT}),
  B("ban", "Đồng ý mọi dòng, chỉ phản đối giá 150 kg", luong=[("giay", "app", "ảnh 150 kg")]),
  B("app", "Tách: công nhận 73.350.000; tranh chấp 900.000", o_dau="he_thong", luong=[("giay", "mua", "bảng tách"), ("giay", "ban", "bảng tách")],
    chi_tiet="Công nhận = 4.800 × 15.000 + 150 × 9.000 = 73.350.000. Tranh chấp = 150 × (15.000 − 9.000) = 900.000, là khoản người bán có thể được thêm."),
  B("mua", "Trả ngay 50.850.000 (công nhận − cọc)", o_dau="ngoai_app", luong=[("tien", "ban", "50.850.000 đ")], tt="Chờ thanh toán"),
  B("ban", "Xác nhận đã nhận", so={"tra_thang": CON}),
  B("app", "Quyết toán phần công nhận: chuyển toàn bộ cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh " + tien(COC))], tt="Quyết toán cọc",
    chi_tiet="Cọc là một phần tiền hàng đã công nhận nên chuyển ngay; tranh chấp 900.000 không nằm trong cọc."),
  B("nh", "Chuyển cọc", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Đã quyết toán phần công nhận · còn tranh chấp 900.000"),
  B("dt", "Kiểm định 150 kg", o_dau="ngoai_app", han="48 giờ", luong=[("giay", "app", "kết luận: đúng hạ cấp")]),
  B("app", "Kết luận: giữ giá 9.000; người bán chịu phí kiểm định", o_dau="he_thong", tt="Hoàn tất",
    chi_tiet="Nếu kết luận ngược lại: bên mua trả thêm 900.000 + phí kiểm định trong 48 giờ. Khoản này không có cọc bảo đảm (cọc đã quyết toán).")]
TH["tranh-chap-mot-dong"]["trang_thai"] = ["Chờ người bán xác nhận", "Chờ thanh toán", "Quyết toán cọc", "Đã quyết toán phần công nhận · còn tranh chấp 900.000", "Hoàn tất"]

# 2. Khoản chưa bảo đảm theo giá trị hợp đồng lúc chọn
sua("chinh", "Chọn cách được trả, thấy mức bảo vệ",
    chi_tiet=(f"Ba lựa chọn: (1) Trả trước khi dỡ: bảo vệ tiền hàng trước khi giao hàng; vẫn có thể phải hoàn nếu nghiệm thu thấp hơn số đã trả. "
              f"(2) Trả sau có ngân hàng cam kết thanh toán theo đơn: bảo vệ theo điều kiện ghi trong cam kết. "
              f"(3) Trả sau nghiệm thu không có cam kết: chỉ cọc {tien(COC)} bảo vệ; theo giá trị hợp đồng hiện tại {tien(GT)}, phần chưa được bảo đảm là {tien(GT - COC)}, sẽ cập nhật khi nghiệm thu chốt. "
              "Người bán chọn (3) và bấm chấp thuận riêng."))
sua("chinh", "Đối soát theo hợp đồng", chi_tiet=TH["chinh"]["buoc"][tim("chinh", "Đối soát theo hợp đồng")]["chi_tiet"] + f" Phần chưa bảo đảm cập nhật: {tien(CON)}.")

# 6. Giữ lô: yêu cầu → người bán đồng ý → hệ thống giữ
i = tim("chinh", "Giữ lô, tạo việc thẩm định")
TH["chinh"]["buoc"][i].update(viec="Gửi người bán yêu cầu giữ lô", luong=[{"loai": "tin", "den": "ban", "nhan": "5 tấn, tối đa 7 ngày"}], loai_nguon=GY,
                              chi_tiet="Đang chờ trả lời thì lô vẫn bán bình thường, không khóa lượng.")
j = tim("chinh", "Đồng ý giữ 5 tấn")
TH["chinh"]["buoc"][j + 1:j + 1] = [B("app", "Giữ 5 tấn, tạo việc thẩm định", o_dau="he_thong", luong=[("tin", "nv", "lịch lấy mẫu")])]

# 3. Sổ tiền: tiền thực vào, phải hoàn, ứng, phí
sua("coc-sai", "Báo nhận 20.000.000", so={"coc_giu": 20_000_000}, chi_tiet="Ngân hàng đã nhận 20.000.000 nhưng chưa đủ cọc: hợp đồng chưa hiệu lực, tiền vẫn nằm ở tài khoản giữ.")
sua("coc-sai", "Giữ đúng 22.500.000", so={"coc_giu": COC, "hoan_mua": 2_500_000, "tien_vao": 25_000_000})
sua("coc-sai", "Chuyển bù nhầm", so={"coc_giu": 25_000_000})
sua("tra-mot-phan", "Xác nhận lần 2", so={"tra_thang": 71_700_000, "con_no": "Người bán phải hoàn 20.850.000 đ (trả trùng)"},
    chi_tiet="Tiền thực vào người bán 71.700.000; được tính thanh toán 50.850.000; phải hoàn 20.850.000.")
sua("tra-mot-phan", "Trả lại 20.850.000", so={"ban_da_hoan": 20_850_000, "con_no": ""})
UNG, PHI = 52_500_000, 787_500
sua("ung-tien", "Ứng tiền, trừ phí ứng", so={"ung_nhan": UNG - PHI, "phi_ung": PHI}, loai_nguon="mau_thuan")
sua("ung-tien", "Thu khoản ứng gốc", so={"coc_giu": 0, "coc_chi_ban": 0, "tra_thang": NT - UNG}, loai_nguon="mau_thuan",
    chi_tiet=f"Ngân hàng có {tien(CON)} bên mua trả + cọc {tien(COC)} = {tien(NT)}; thu ứng gốc {tien(UNG)}; chuyển người bán {tien(NT - UNG)}. Người bán thực nhận tổng {tien(UNG - PHI)} + {tien(NT - UNG)} = {tien(NT - PHI)} = nghiệm thu − phí ứng.")

# 4. Tạm dừng hạn: có giới hạn, đồng bộ hai bảng
QT = D["van_hanh"]["quy_tac"]
for r in QT:
    if r[0] == "Hạn khi chờ hỗ trợ ban đêm":
        r[0] = "Tạm dừng hạn khi có sự cố"
        r[1] = ("Chỉ cho sự cố đã liệt kê: xe hỏng, lỗi app hoặc mất mạng hệ thống, hàng tươi bị từ chối tại kho. Có bằng chứng (ảnh, vị trí, nhật ký lỗi). "
                "Tạm dừng tối đa 12 giờ (đề xuất); chạy lại khi nhân viên xác nhận đã xử lý hoặc hết mức tối đa. Báo AI chỉ là tiếp nhận, không tự gia hạn. "
                "Không áp cho hạn ký, giữ lô, chuyển cọc, trả tiền.")
for r in D["van_hanh"]["ngoai_gio"]:
    if r[0] == "Hạn giờ ban đêm":
        r[1] = "Hạn vẫn chạy. Chỉ sự cố đã liệt kê, có bằng chứng, được nhân viên trực xác nhận mới tạm dừng (tối đa 12 giờ); hạn \"chờ nhân viên xử lý\" chỉ tính trong giờ làm."
for c in D["can_chot"]:
    if c["chu_de"] == "Tạm dừng hạn khi đang chờ hỗ trợ":
        c["lua_chon"] = [["Sự cố đã liệt kê, có bằng chứng, nhân viên xác nhận", "Tạm dừng tối đa 12 giờ"], ["Chỉ báo AI", "Không tự gia hạn"], ["Hạn ký, giữ lô, cọc, trả tiền", "Không tạm dừng"]]
        c["de_xuat"] = "Như trên, báo cả hai bên khi dừng và khi chạy lại."

# 5. Hàng trả lại: không tự tiêu hủy
sua("hang-tra-lai", "Hết 48 giờ chưa xử lý", viec="Hết 48 giờ: báo trước 24 giờ, rồi xử lý theo điều khoản",
    chi_tiet=("Bên mua chỉ tiêu hủy khi hợp đồng có điều khoản cho phép, đã báo trước 24 giờ, nhân viên xác nhận lô không còn cần làm chứng cứ tranh chấp. "
              "Chưa đủ điều kiện thì chuyển kho lạnh, phí giữ theo kết luận lỗi. Người quyết định: người bán, hoặc theo điều khoản đã ký."))
TH["hang-tra-lai"]["mo_ta"] = "50 kg trả lại nằm ở kho bên mua. Biên bản ghi nơi giữ, người giữ, hạn xử lý; người bán chọn lấy về, bán gấp hay tiêu hủy. Hết hạn không tự tạo quyền định đoạt hàng của người bán."

# 7. Đồng bộ các mục
for r in D["van_hanh"]["bang_vai"]:
    if r[0] == "Đối soát tài chính": r[3] = "Lệnh theo điều kiện: hệ thống gửi. Ngoại lệ: chỉ đề xuất, người khác duyệt (mọi mức tiền)"
    if r[0] == "Hòa giải": r[3] = "Đề xuất; hiệu lực theo căn cứ đã ký"
for v in D["vai"]:
    if v["id"] == "nh":
        v["vai_con"] = [["Giữ cọc", "Tài khoản giữ riêng từng đơn, chỉ nhận cọc 30% bên mua; chuyển hoặc hoàn theo lệnh hợp lệ."],
                        ["Cam kết thanh toán theo đơn", "Bên mua có hạn mức vay; khi ký, ngân hàng phát hành cam kết cho đúng đơn (số tối đa, điều kiện giải ngân, hạn hiệu lực, xử lý tranh chấp). Nghiệm thu chốt thì chuyển thẳng cho người bán; vi phạm thì chi bồi thường theo hợp đồng."],
                        ["Ứng tiền cho người bán", "Ứng một phần đơn đã cọc, thu lại khi bên mua trả."], ["Xác nhận giao dịch", "Báo kết quả từng lệnh theo mã lệnh."]]
    if v["id"] == "mua":
        v["khong"] = "thấy giá kín người bán; liên lạc người bán trước khi cọc hoặc trước khi có cam kết ngân hàng hợp lệ"
        v["lam"] = [x.replace("dùng hạn mức ngân hàng", "dùng cam kết thanh toán của ngân hàng") for x in v["lam"]]
for r in D["dich_vu"]["ds"]:
    if r[0] == "Trả sau qua ngân hàng":
        r[1] = "Ngân hàng phát hành cam kết thanh toán theo đơn thay cho cọc (số tối đa, điều kiện, hạn). Nghiệm thu chốt thì chuyển thẳng giá trị nghiệm thu cho người bán; bên mua trả ngân hàng gốc + lãi sau. Cam kết hợp lệ thì mở liên lạc như khi có cọc."
    if r[0] == "Phân hạng người bán":
        r[1] = "Hiện 3 mục riêng, không gộp thành một thang: Giấy tờ (VietGAP, mã vùng trồng…), Nhật ký sản xuất, Lịch sử giao dịch (giao đủ, đúng hẹn). Mỗi mục ghi phần đã kiểm và phần tự khai."
for t in D["tinh_huong"]:
    for b in t["buoc"]:
        if b["viec"] == "Mở tài khoản bán, xếp hạng ban đầu":
            b["chi_tiet"] = "Hồ sơ hiện 3 mục riêng: Giấy tờ, Nhật ký sản xuất, Lịch sử giao dịch; mỗi mục ghi đã kiểm / tự khai. Không gộp thành một thang hạng nối tiếp."
            b["loai_nguon"] = GY
sua("tra-sau-ngan-hang", "Báo người bán: đã có cam kết", viec="Cam kết hợp lệ: mở liên lạc, báo người bán", luong=[{"loai": "tin", "den": "ban", "nhan": "đã có cam kết có điều kiện"}, {"loai": "tin", "den": "mua", "nhan": "số người bán"}])
for c in D["can_chot"]:
    if c["chu_de"] == "Chi phí dịch vụ đã dùng khi đơn hỏng":
        c["lua_chon"][0] = ["Dịch vụ đã làm đúng thỏa thuận", "Không hoàn; làm sai, thiếu hoặc gây hư hỏng thì khiếu nại theo bảng hoàn phí"]
    if c["chu_de"] == "Trả sau qua ngân hàng":
        c["lua_chon"] = [["Thay cọc", "Cam kết thanh toán theo đơn (không phải hạn mức chung)"], ["Khi xong", "Ngân hàng chuyển thẳng giá trị nghiệm thu cho người bán"],
                         ["Bên mua vi phạm", "Ngân hàng chi bồi thường theo hợp đồng, ghi nợ bên mua"], ["Người bán vi phạm", "Cam kết hết hiệu lực; người bán bồi hoàn chi phí dịch vụ"],
                         ["Liên lạc", "Mở khi cam kết hợp lệ"], ["Lãi, hoa hồng", "Bên mua trả lãi; ngân hàng trả hoa hồng AgiViet"]]
        c["de_xuat"] = "Chỉ mở khi có ngân hàng đồng ý phát hành cam kết theo từng đơn."
    if c["chu_de"] == "Cách được trả và mức bảo vệ người bán":
        c["lua_chon"][0] = ["Trả trước khi dỡ", "Bảo vệ tiền hàng trước khi giao; vẫn có thể phải hoàn nếu nghiệm thu thấp hơn số đã trả"]
        c["lua_chon"][2] = ["Trả sau nghiệm thu không cam kết", f"Chỉ cọc bảo vệ; chưa bảo đảm {tien(GT - COC)} theo giá trị hợp đồng, cập nhật khi nghiệm thu chốt; người bán phải chấp thuận rõ"]
D["phien_ban"] = "5 · 28/10/2026"
D["nguon_chinh"] += " Bản 5 sửa theo rà bản 4: tách tiền tranh chấp một dòng, khoản chưa bảo đảm theo giá trị hợp đồng, sổ tiền tách tiền thực vào / phải hoàn / ứng / phí, tạm dừng hạn có giới hạn, hàng trả lại không tự tiêu hủy, giữ lô sau khi người bán đồng ý, đồng bộ quy tắc."
json.dump(D, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok bản 5:", len(D["tinh_huong"]), "tình huống,", sum(len(t["buoc"]) for t in D["tinh_huong"]), "bước")
