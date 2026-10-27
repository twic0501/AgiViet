# BẢN 18 (28/10/2026), chạy SAU bo_sung_v17.py. Theo rà bản 17: (1) nhánh con không đóng toàn đơn; (2) điều kiện nhả
# lượng sau hạn cọc; (3) điều kiện tiếp nhận khiếu nại muộn; (4) nợ quá hạn trong định kỳ; (5) bảng kiểm phủ đủ (kiem_tien.py);
# năm nhóm vận hành: AgiViet làm sai, mẫu hỏng/kết quả trễ, không còn đối tác, phát hiện sau xuất dùng, dừng định kỳ.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, them, sua
C.NG[:] = ["Góp ý 28/10 (rà bản 17)"]
XONG = "Đã xử lý xong nhánh · xem hồ sơ đơn"

# 1. Nhánh con không đóng toàn đơn
for id, ghi in [("da-nhan-nhieu-hon", "Tiền đã xong; 3.800 kg không được nhận xử lý ở hồ sơ hàng (như nhánh nghiệm thu thấp hơn cọc)."),
                ("khong-xac-nhan-hoan", "Tiền hoàn đã xong; hàng, phí, tranh chấp khác kiểm ở hồ sơ đơn."),
                ("lenh-ngan-hang-loi", "Mới xong lệnh chuyển cọc; các nghĩa vụ khác của đơn kiểm ở hồ sơ đơn.")]:
    t = TH[id]; b = [x for x in t["buoc"] if x.get("trang_thai")][-1]
    assert b["trang_thai"] == "Hoàn tất", id
    b["trang_thai"] = XONG; b["chi_tiet"] = ((b.get("chi_tiet") or "") + " " + ghi).strip()
    t["trang_thai"] = [x for x in t["trang_thai"] if x != "Hoàn tất"] + [XONG]
D["he_thong"]["quy_tac"].append(["Kết thúc nhánh", "Nhánh chỉ xử lý một nghĩa vụ (một lệnh tiền, một khoản hoàn) kết thúc ở \"" + XONG + "\", ghi dữ kiện kế thừa và phạm vi đã xong. Hoàn tất toàn bộ chỉ khi hàng, tiền, phí, tranh chấp đều đã đóng."])

# 2. Điều kiện nhả lượng sau hạn cọc
for r in D["han_gio"]:
    if r[0] == "Chuyển cọc":
        r[2] = "Ngân hàng xác minh không có cọc hợp lệ: đóng đơn, lượng về lô. Kết quả chưa rõ: \"Chờ đối soát cọc\", giữ lượng tối đa 6 giờ. Tiền tới sau khi đóng: hoàn, không tự khôi phục đơn."
sua("qua-han-coc", "Đóng đơn, lượng về lô", chi_tiet="Chỉ đóng khi ngân hàng xác minh không có khoản cọc hợp lệ tới hạn. Kết quả còn chưa rõ: xem \"Tiền vào trước hạn nhưng ngân hàng báo trễ\". Tiền tới sau khi đóng: xem \"Tiền cọc tới sau khi đơn đã đóng\" (hoàn, không khôi phục).")

# 3. Khiếu nại muộn
sua("dinh-ky-tra-tien", "Khiếu nại 200 kg", viec="Khiếu nại 200 kg của B bị dập (gửi 6 giờ sau nhận, trong hạn 12 giờ)",
    chi_tiet="Chỉ tiếp nhận khi: gửi trong hạn khiếu nại từ lúc nhận; hoặc là khuyết tật được phép kiểm sau theo thỏa thuận. Quá hạn và không thuộc loại kiểm sau: ghi phản ánh, không mở nghĩa vụ hoàn. Đối chiếu thời điểm phát hiện, điều kiện bảo quản của bên mua, tiêu chí đã chốt, chứng cứ (ảnh có giờ, biên bản).")
D["he_thong"]["quy_tac"].append(["Khiếu nại sau nghiệm thu", "Phản ánh sau hạn không tự thành khoản người bán phải hoàn. Chỉ mở nghĩa vụ khi trong hạn, hoặc khuyết tật thuộc loại kiểm sau đã thỏa thuận, và có chứng cứ. Bảo vệ người bán khỏi bị hạ giá sau giao."])

# 4. Nợ quá hạn
D["he_thong"]["quy_tac"].append(["Nợ quá hạn và cam kết mới", "Còn hạn mức không có nghĩa khoản trả chậm được chấp thuận. Có khoản quá hạn: dừng nhận cam kết mới với người bán đó (hoặc toàn bộ nếu quá hạn với nhiều người); chuyến đã chốt hỏi người bán giao tiếp hay dừng; mở lại khi trả hết khoản quá hạn. Khóa đơn mới không xóa nghĩa vụ đã có."])
them("dinh-ky-no-qua-han", "Định kỳ: bên mua có khoản quá hạn", "dinh_ky",
  "Tiếp bài 3 ngày: 17:00 ngày 5 bên mua chưa trả A khoản ngày 2 (30 triệu). Khoản ngày 3 (40 triệu) đã trả sớm; ngày 4 A giao 1 tấn (20 triệu, hạn 17:00 ngày 7). Tổng nợ A 30 + 20 = 50/80, nhưng có khoản quá hạn.",
  [B("app", "17:00 ngày 5: khoản 30 triệu của A quá hạn", o_dau="he_thong", luong=[("tin", "mua", "quá hạn"), ("tin", "ban", "chưa được trả")], tt="Quá hạn thanh toán"),
   B("app", "Dừng nhận cam kết mới của A cho bên mua này", o_dau="he_thong", chi_tiet="Còn 30 triệu hạn mức nhưng không dùng được khi có khoản quá hạn."),
   B("app", "Chuyến ngày 6 đã chốt: hỏi A giao tiếp hay dừng", o_dau="he_thong", luong=[("tin", "ban", "A tự chọn")], chi_tiet="A chọn dừng: không bị tính vi phạm vì bên mua đang quá hạn. Thiếu hàng ngày 6 xử lý như nhánh thiếu lượng."),
   B("ban", "A chọn dừng chuyến ngày 6", luong=[("tin", "app", "dừng")]),
   B("nv", "Nhắc bên mua; theo nhánh chậm thanh toán nếu quá 48 giờ", o_dau="nhan_vien", nv="Đối soát tài chính."),
   B("mua", "Ngày 6: trả 30 triệu", o_dau="ngoai_app", luong=[("tien", "ban", "30.000.000 đ → A")]),
   B("ban", "A xác nhận; mở lại nhận cam kết từ chuyến ngày 8", luong=[("tin", "app", "mở lại")], tt="Đã chốt nhu cầu", chi_tiet="Ghi lịch sử quá hạn của bên mua.")],
  vi_du={}, tt=["Quá hạn thanh toán", "Đã chốt nhu cầu"], vai=["app", "ban", "mua", "nv"], sau="dinh-ky-3-ngay")

# Năm nhóm vận hành
D["ten_nhom"]["van_hanh_su_co"] = "Vận hành: khi AgiViet, dịch vụ, mẫu gặp sự cố"
them("agiviet-lam-sai", "AgiViet làm sai: đặt nhầm xe", "van_hanh_su_co",
  "Nhân viên đặt xe thường thay vì xe lạnh cho đơn hàng tươi. Lỗi của chính AgiViet: ai tiếp nhận, chặn lỗi, báo hai bên, khắc phục, xác định trách nhiệm.",
  [B("ban", "Báo xe đến không có lạnh", luong=[("tin", "app", "ảnh xe")], tt="Đã cọc, chờ giao"),
   B("nv", "Người trực nhận việc; xác nhận lỗi đặt xe của AgiViet", o_dau="nhan_vien", nv="Không đổ lỗi đối tác khi đơn đặt sai."),
   B("nv", "Dừng bốc; đặt xe lạnh thay trong giới hạn chi khẩn", o_dau="nhan_vien", luong=[("tin", "dt", "đặt xe lạnh")]),
   B("app", "Báo hai bên: lỗi do AgiViet, giờ giao mới", o_dau="he_thong", luong=[("tin", "mua", "trễ 4 giờ, lý do"), ("tin", "ban", "lý do")]),
   B("qt", "Chi phí xe sai và chênh lệch: AgiViet chịu; trễ do lỗi này không tính vi phạm cho ai", o_dau="nhan_vien",
     chi_tiet="Hư hỏng do trễ: AgiViet bồi hoàn theo chính sách trách nhiệm (mức chờ chốt). Người duyệt khác người đặt xe."),
   B("qt", "Xem lại: thêm bước kiểm loại xe theo mặt hàng trước khi đặt", o_dau="nhan_vien", chi_tiet="Ghi vào sổ sự cố nội bộ; không gắn thưởng phạt vào việc che lỗi.")],
  vi_du={}, tt=["Đã cọc, chờ giao"], vai=["ban", "nv", "dt", "app", "mua", "qt"])
them("mau-hong", "Mẫu hỏng, mất niêm phong, kết quả quá trễ", "van_hanh_su_co",
  "Mẫu dư lượng gửi phòng thử nghiệm bị mất niêm phong khi vận chuyển; kết quả lần lấy lại sẽ trễ. Không tự suy ra người bán sai vì thiếu kết quả.",
  [B("dt", "Phòng thử nghiệm báo mẫu tới mất niêm phong", o_dau="ngoai_app", luong=[("giay", "app", "biên bản")], tt="Chờ kết quả kiểm còn lại"),
   B("app", "Mẫu này không dùng làm căn cứ; báo hai bên", o_dau="he_thong", luong=[("tin", "mua", "mẫu không hợp lệ"), ("tin", "ban", "mẫu không hợp lệ")]),
   B("nv", "Kiểm mẫu lưu: còn niêm, còn đại diện lô?", o_dau="nhan_vien", chi_tiet="Còn: gửi mẫu lưu. Hết mẫu lưu, hàng còn nguyên lô: lấy mẫu mới có hai bên chứng kiến. Hàng đã trộn, đã dùng: không lấy lại được mẫu đại diện."),
   B("app", "Hàng giữ cách ly tới khi có kết quả, tối đa theo hạn bảo quản", o_dau="he_thong",
     chi_tiet="Hạn bảo quản sắp hết mà chưa có kết quả: hai bên chọn (nhận có điều kiện, bán cho mục đích không cần chỉ tiêu này, hoặc dừng). Không ai chọn thay."),
   B("dt", "Kết quả mẫu lưu: đạt", o_dau="ngoai_app", luong=[("giay", "app", "đạt")]),
   B("app", "Theo luồng đạt; phí gửi lại do bên làm mất niêm chịu", o_dau="he_thong", chi_tiet="Mất niêm trong vận chuyển của đối tác: đối tác chịu theo hợp đồng dịch vụ. Không xác định được: chia theo điều khoản kết quả trái nhau.")],
  vi_du={}, tt=["Chờ kết quả kiểm còn lại"], vai=["dt", "app", "nv", "mua", "ban"])
them("khong-con-doi-tac", "Không còn xe, kho, phòng thử nghiệm phù hợp", "van_hanh_su_co",
  "Xe lạnh bỏ chuyến, không tìm được xe thay đúng giờ; kho lạnh gần đã đầy.",
  [B("dt", "Nhà xe hủy chuyến lúc 20:00", o_dau="ngoai_app", luong=[("tin", "nv", "hủy")], tt="Đã cọc, chờ giao"),
   B("nv", "Tìm xe thay 2 giờ: không có xe lạnh phù hợp; kho gần đầy", o_dau="nhan_vien"),
   B("app", "Đưa phương án cho hai bên, kèm chi phí tối đa", o_dau="he_thong", luong=[("tin", "mua", "phương án"), ("tin", "ban", "phương án")],
     chi_tiet="(1) Giao một phần bằng xe nhỏ còn trống; (2) đổi giờ giao sang sáng mai, hàng giữ tại vườn trong bóng mát; (3) đổi điểm nhận gần hơn; (4) dừng đơn theo điều khoản sự cố dịch vụ."),
   B("mua", "Bên mua chọn (2) đổi giờ", luong=[("tin", "app", "chọn 2")]),
   B("ban", "Người bán đồng ý (2)", luong=[("tin", "app", "đồng ý")], chi_tiet="Hai bên phải cùng đồng ý vì đổi giờ ảnh hưởng chất lượng hàng."),
   B("app", "Chưa ai duyệt trước hạn: chỉ làm việc không tốn thêm chi phí", o_dau="he_thong",
     chi_tiet="Giữ hàng tại chỗ, không đặt dịch vụ mới vượt giới hạn đã duyệt; ghi giờ từng lần hỏi."),
   B("nv", "Đặt xe sáng mai; ghi chi phí đối tác bỏ chuyến", o_dau="nhan_vien", luong=[("tin", "dt", "đặt xe")], nv="Đối tác bỏ chuyến chịu theo hợp đồng dịch vụ.")],
  vi_du={}, tt=["Đã cọc, chờ giao"], vai=["dt", "nv", "app", "mua", "ban"])
them("phat-hien-sau-xuat", "Phát hiện vấn đề sau khi hàng đã xuất dùng", "van_hanh_su_co",
  "Bên mua đã chế biến một phần, chuyển một phần cho khách của họ; sau đó cơ quan báo lô cùng vùng có vấn đề dư lượng.",
  [B("mua", "Báo vấn đề với lô HĐ-0103", luong=[("tin", "app", "cảnh báo")]),
   B("app", "Truy lô: phần đã chế biến, phần chuyển tiếp, phần còn ở kho", o_dau="he_thong", luong=[("tin", "mua", "danh sách phần cùng lô")]),
   B("mua", "Dừng dùng phần còn lại; báo bên đang giữ phần đã chuyển", o_dau="ngoai_app", chi_tiet="Bên mua chịu trách nhiệm với khách của mình; AgiViet cung cấp dữ liệu truy xuất."),
   B("nv", "Giữ chứng cứ: mẫu lưu, phiếu cân, kết quả kiểm khi giao", o_dau="nhan_vien"),
   B("dt", "Kiểm mẫu lưu niêm phong của lô", o_dau="ngoai_app", luong=[("giay", "app", "kết quả")]),
   B("app", "Mở hồ sơ xử lý theo kết quả mẫu lưu", o_dau="he_thong",
     chi_tiet="Mẫu lưu đạt: không mở nghĩa vụ với người bán. Không đạt: theo nhánh dư lượng không đạt cho phần còn kiểm được; phần đã dùng đối chiếu bằng mẫu lưu.")],
  vi_du={}, tt=[], vai=["mua", "app", "nv", "dt"])
them("dung-dinh-ky", "Dừng mua định kỳ, chấm dứt thỏa thuận", "dinh_ky",
  "Bên mua báo dừng từ tuần sau. Dừng lịch không xóa nghĩa vụ cũ; tách từng phần.",
  [B("mua", "Báo dừng định kỳ từ thứ Hai tuần sau", luong=[("tin", "app", "dừng")]),
   B("app", "Tách: dự báo chưa cam kết · chuyến đã chốt · hàng đã chuẩn bị · nợ chưa trả · bảo đảm đã phân bổ", o_dau="he_thong", luong=[("tin", "ban", "phần của từng người")]),
   B("app", "Dự báo chưa cam kết: hủy, không phát sinh nghĩa vụ", o_dau="he_thong"),
   B("app", "Chuyến đã chốt trước hạn dừng: vẫn giao, hoặc bên mua xin giảm như sau hạn chốt", o_dau="he_thong"),
   B("ban", "Hàng đã chuẩn bị cho chuyến bị hủy: báo chi phí có chứng cứ", luong=[("giay", "app", "chi phí")], chi_tiet="Theo điều khoản thay đổi sau hạn chốt (Q26)."),
   B("mua", "Trả hết nợ còn lại theo từng hạn", o_dau="ngoai_app", luong=[("tien", "ban", "từng khoản")]),
   B("app", "Hoàn phần bảo đảm chưa dùng; đóng thỏa thuận khi mọi nghĩa vụ đã xong", o_dau="he_thong", luong=[("tien", "mua", "bảo đảm còn lại")])],
  vi_du={}, tt=[], vai=["mua", "app", "ban"], sau="dinh-ky-no-qua-han")

D["thi_truong"]["luu_y"] += " Phạm vi hiện tại: người sản xuất trực tiếp và bên mua B2B đã xác minh; chưa áp cho mọi loại thương lái, hộ kinh doanh, mọi mặt hàng."
D["phien_ban"] = "18 · 28/10/2026"
D["nguon_chinh"] += " Bản 18: nhánh con không đóng toàn đơn, điều kiện nhả lượng sau hạn cọc, khiếu nại muộn, nợ quá hạn định kỳ, năm nhóm vận hành, bảng kiểm phủ đủ."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("18")
