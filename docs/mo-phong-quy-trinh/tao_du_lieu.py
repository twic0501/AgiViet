# Sinh quy-trinh.json — BẢN 3 (27/10/2026), làm lại theo chỉ đạo người sáng lập + sửa lỗi Codex rà bản 2 (ra-soat-codex.md):
# - Cọc: CHỈ bên mua đặt 30% vào tài khoản ngân hàng giữ riêng từng đơn; tài khoản này không nhận gì khác (phí, tiền xe trả riêng).
#   Cọc xử lý theo điều khoản vi phạm trong hợp đồng.
# - Trả sau: chỉ qua ngân hàng cho bên mua vay. Không có cọc tiền mặt: ngân hàng khoanh 100% giá trị trong hạn mức,
#   nghiệm thu xong chuyển thẳng toàn bộ giá trị nghiệm thu cho người bán; vi phạm thì chi bồi thường theo hợp đồng.
# - Phí bên mua theo từng doanh nghiệp (chờ chốt). Thẩm định 2 cửa. Người bán phân hạng. Bỏ người giúp, HTX/điểm gom.
# - Tách nhân viên / quản trị; ngoài giờ có hệ thống + trợ lý AI. Dịch vụ đã dùng không hoàn, bên có lỗi bồi hoàn.
# - Ví dụ chính: thanh long Bình Thuận → kho Long An. Thời gian, giá dịch vụ là GIẢ ĐỊNH cần thay bằng số thật.
# - Sửa từ rà soát Codex: không trừ cọc hai lần khi tính nợ; người bán phải chốt số trước mọi quyết toán; tách "đã báo trả"
#   với "đã xác nhận"; hàng tươi hạn cọc 12 giờ; "Đang giao" từ lúc bốc; dịch vụ làm đổi điều khoản (ai lo xe) chọn trong phiếu nghĩa vụ.
# loai_nguon: goc = tài liệu 24/10 · phong_van = phỏng vấn · sang_lap = chỉ đạo người sáng lập 27/10 · mau_thuan = chờ chốt
import json, os

GOC, PV, SL, MT = "goc", "phong_van", "sang_lap", "mau_thuan"

def B(vai, viec, o_dau="app", luong=(), dieu_kien="", han="", chi_tiet="", nguon=(), loai=GOC, tt=None, so=None, trich="", nv="", moc=""):
    return {"vai": vai, "viec": viec, "o_dau": o_dau, "luong": [dict(zip(("loai", "den", "nhan", "tu"), l)) for l in luong],
            "dieu_kien": dieu_kien, "han": han, "chi_tiet": chi_tiet, "nguon": list(nguon), "loai_nguon": loai,
            "trang_thai": tt, "so": so or {}, "trich": trich, "nv": nv, "moc": moc}
def TH(id, ten, nhom, mo_ta, buoc, nguon=(), vi_du=None, trang_thai=None, vai=None, loai=GOC):
    d = {"id": id, "ten": ten, "nhom": nhom, "mo_ta": mo_ta, "nguon": list(nguon), "loai_nguon": loai, "buoc": buoc, "vi_du": vi_du or {}}
    if trang_thai: d["trang_thai"] = trang_thai
    if vai: d["vai_tham_gia"] = vai
    return d
tien = lambda n: f"{n:,}".replace(",", ".") + " đ"

TT = ["Thẩm định lô", "Thỏa thuận nghĩa vụ", "Hợp đồng chờ ký", "Chờ cọc", "Đã cọc, chờ giao", "Đang giao", "Chờ nghiệm thu",
      "Chờ người bán xác nhận", "Chờ thanh toán", "Quyết toán cọc", "Hoàn tất"]
TT_NO = TT + ["Đã giao xong · còn công nợ"]

VAI = [
 {"id": "ban", "ten": "Người bán (nơi sản xuất)", "ten_ngan": "Người bán", "mau": "#1d5a42", "dung": "App bán, điện thoại",
  "mo": "Chỉ người trực tiếp làm ra hàng: hộ nông dân, ngư dân, trang trại, doanh nghiệp nông nghiệp, HTX sản xuất (bán hàng của chính thành viên). Không có người thu gom bán lại.",
  "loai_to_chuc": ["Hộ sản xuất", "Trang trại", "Doanh nghiệp nông nghiệp", "HTX sản xuất"],
  "vai_con": [["Chủ tài khoản", "Ký hợp đồng, xác nhận tiền, đổi tài khoản nhận tiền, ủy quyền nhận tiền mặt. Đúng người đã xác minh."],
              ["Quản lý sản xuất", "Ghi nhật ký, đăng lô, chuẩn bị và bốc hàng, lập biên bản. Không ký, không xác nhận tiền, không đổi tài khoản."],
              ["Kế toán (trang trại, doanh nghiệp, HTX)", "Xem tiền, tải chứng từ; xác nhận đã nhận chỉ khi chủ ủy quyền."]],
  "lam": ["Đăng lô từ mặt hàng đã xác minh", "Điền phiếu nghĩa vụ bên bán", "Ký mã", "Giao, lập biên bản bốc", "Chốt số cân", "Xác nhận đã nhận tiền"],
  "khong": "đặt cọc, trả phí giới thiệu; bán hàng không do mình làm ra"},
 {"id": "mua", "ten": "Bên mua (doanh nghiệp B2B)", "ten_ngan": "Bên mua", "mau": "#2b5f8a", "dung": "App mua, máy tính trước",
  "mo": "Doanh nghiệp mua để chế biến, xuất khẩu, bán lẻ, phục vụ bếp ăn. Có mã số thuế.",
  "loai_to_chuc": ["Nhà máy chế biến", "Doanh nghiệp xuất khẩu", "Chuỗi bán lẻ, siêu thị", "Nhà hàng, bếp ăn công nghiệp"],
  "vai_con": [["Giám đốc / chủ doanh nghiệp", "Duyệt chi, ký hợp đồng, chọn gói, ký hồ sơ vay với ngân hàng."], ["Thu mua", "Phiếu nhu cầu, chào giá, phiếu nghĩa vụ, yêu cầu thẩm định."],
              ["Kế toán", "Chuyển cọc, trả phần còn lại, lấy chứng từ, bảng kê."], ["Kho / kiểm chất lượng (QC)", "Ký nhận hàng, nghiệm thu 3 phần, mở mẫu đối chứng."]],
  "lam": ["Phiếu nhu cầu", "Yêu cầu thẩm định lô", "Phiếu nghĩa vụ bên mua", "Đặt cọc 30% (chỉ bên mua) hoặc dùng hạn mức ngân hàng", "Nghiệm thu", "Trả phần còn lại"],
  "khong": "thấy giá kín người bán; liên lạc người bán trước khi cọc"},
 {"id": "nv", "ten": "Nhân viên vận hành AgiViet", "ten_ngan": "Nhân viên", "mau": "#6b4c9a", "dung": "Trang vận hành + app hiện trường",
  "mo": "Làm việc hằng ngày với người bán, bên mua, đối tác. Không sửa chính sách, không duyệt tiền vượt ngưỡng.",
  "vai_con": [["Xác minh hiện trường", "Xác minh đăng ký, thẩm định lô, kiểm nhật ký. App hiện trường: ảnh có giờ, vị trí; biên bản."],
              ["Hỗ trợ khách hàng", "Hướng dẫn, nhắc hạn, tiếp nhận sự cố, gọi điện. Trang vận hành: hàng việc, hội thoại."],
              ["Điều phối dịch vụ", "Đặt xe, kho lạnh, kiểm định; theo dõi chuyến."],
              ["Đối soát tài chính", "Đối chiếu cọc, lệnh ngân hàng, khoản trả thẳng khi báo lệch; phiếu bồi hoàn."],
              ["Hòa giải", "Hồ sơ tranh chấp, mời kiểm định, đề xuất kết luận (vượt ngưỡng chờ quản trị)."],
              ["Nhân viên trực", "Ngoài giờ, nhận việc khẩn do trợ lý AI chuyển."]],
  "lam": ["Làm theo hàng việc có hạn", "Ghi mọi quyết định vào lịch sử đơn"], "khong": "ký thay, xác nhận tiền thay, đổi phí hay chính sách"},
 {"id": "qt", "ten": "Quản trị AgiViet (admin)", "ten_ngan": "Quản trị", "mau": "#3f2c5e", "dung": "Trang quản trị, chỉ máy nội bộ",
  "mo": "Kiểm soát, không làm việc hằng ngày.",
  "vai_con": [["Chính sách và phí", "Mức phí riêng từng doanh nghiệp, hạn giờ, ngưỡng duyệt, bảng mẫu điều khoản vi phạm."],
              ["Phân quyền", "Cấp, thu hồi quyền nhân viên; khóa, mở tài khoản."], ["Duyệt", "Lệnh tiền vượt ngưỡng, kết luận hòa giải lớn, ngoại lệ."],
              ["Kiểm toán", "Nhật ký mọi thao tác, báo cáo, cảnh báo gian lận."]],
  "lam": ["Đặt luật cho hệ thống và nhân viên"], "khong": "xử lý đơn thay nhân viên, sửa lịch sử đơn"},
 {"id": "app", "ten": "Hệ thống AgiViet (tự động, gồm trợ lý AI)", "ten_ngan": "Hệ thống", "mau": "#4b5a52", "dung": "Máy chủ, 24/7",
  "mo": "Làm phần lặp lại và kiểm điều kiện; không tự quyết thay con người ở tiền và tranh chấp.",
  "vai_con": [["Ghép hàng", "Ghép phiếu với lô, giấu giá, hiện hạng người bán."], ["Hợp đồng", "Phiếu nghĩa vụ, kiểm khớp, soạn, quản phiên bản, nhận ký mã."],
              ["Tiền", "Ra lệnh ngân hàng theo điều kiện; đối chiếu kết quả; tính công nợ."], ["Hạn giờ", "Nhắc, chuyển nhánh quá hạn, tạo việc cho nhân viên."],
              ["Hạng, uy tín", "Phân hạng người bán; uy tín hai bên theo giao dịch."], ["Che liên lạc, chứng từ", "Che số trước cọc; biên bản, bảng kê."],
              ["Trợ lý AI ngoài giờ", "Trả lời, hướng dẫn, ghi nhận sự cố, gọi nhân viên trực. Không duyệt tiền, không kết luận tranh chấp."]],
  "lam": ["Chạy 24/7"], "khong": "coi im lặng là đã nhận tiền; tự quyết tranh chấp"},
 {"id": "nh", "ten": "Ngân hàng đối tác", "ten_ngan": "Ngân hàng", "mau": "#1f4e79", "dung": "Kết nối hệ thống",
  "mo": "Giữ tiền và cho vay theo thỏa thuận AgiViet – ngân hàng (cấu trúc pháp lý cần khảo sát).",
  "vai_con": [["Giữ cọc", "Tài khoản giữ riêng từng đơn, chỉ nhận cọc 30% bên mua; chuyển hoặc hoàn theo lệnh hợp lệ."],
              ["Cho bên mua vay trả sau", "Duyệt hạn mức; khoanh 100% giá trị đơn khi ký; nghiệm thu xong chuyển thẳng toàn bộ cho người bán; vi phạm thì chi bồi thường theo hợp đồng."],
              ["Ứng tiền cho người bán", "Ứng một phần đơn đã cọc, thu lại khi bên mua trả."], ["Xác nhận giao dịch", "Báo kết quả từng lệnh."]],
  "lam": ["Chỉ làm theo lệnh hợp lệ"], "khong": "nhận phí hay tiền dịch vụ vào tài khoản cọc"},
 {"id": "dt", "ten": "Đối tác dịch vụ (xe, kho lạnh, kiểm định, bảo hiểm)", "ten_ngan": "Đối tác", "mau": "#b7791f", "dung": "Kết nối đặt dịch vụ",
  "mo": "Người dùng trả thẳng đối tác qua app đặt, không qua tài khoản cọc. Dịch vụ đã làm không hoàn.",
  "vai_con": [["Nhà xe", "Xe thường, xe lạnh; vị trí, nhiệt độ; đền theo hợp đồng vận chuyển."], ["Kho lạnh, sơ chế", "Giữ hàng, sấy, cấp đông."],
              ["Phòng thử nghiệm, kiểm định", "Lấy mẫu, kiểm dư lượng, chất lượng."], ["Bảo hiểm", "Hàng trên đường; thực hiện hợp đồng."]],
  "lam": ["Báo giá, làm dịch vụ, xuất hóa đơn"], "khong": "hoàn tiền phần đã làm"},
]
DONG_CHAY = [
 {"tu": "mua", "den": "app", "loai": "tin", "nhan": "phiếu nhu cầu, yêu cầu thẩm định, phiếu nghĩa vụ"},
 {"tu": "ban", "den": "app", "loai": "tin", "nhan": "lô hàng, phiếu nghĩa vụ"},
 {"tu": "app", "den": "mua", "loai": "giay", "nhan": "hợp đồng do hệ thống soạn"},
 {"tu": "app", "den": "ban", "loai": "giay", "nhan": "hợp đồng do hệ thống soạn"},
 {"tu": "mua", "den": "nh", "loai": "tien", "nhan": "chỉ cọc 30% (hoặc hạn mức vay được khoanh)"},
 {"tu": "mua", "den": "dt", "loai": "tien", "nhan": "tiền dịch vụ, trả riêng"},
 {"tu": "mua", "den": "app", "loai": "tien", "nhan": "phí giới thiệu, hóa đơn riêng"},
 {"tu": "ban", "den": "mua", "loai": "hang", "nhan": "hàng, biên bản bốc"},
 {"tu": "mua", "den": "ban", "loai": "tien", "nhan": "phần còn lại sau nghiệm thu"},
 {"tu": "nh", "den": "ban", "loai": "tien", "nhan": "cọc khi đủ điều kiện, hoặc toàn bộ tiền đơn (trả sau qua ngân hàng)"},
 {"tu": "nh", "den": "mua", "loai": "tien", "nhan": "cọc hoàn khi người bán vi phạm"},
 {"tu": "nv", "den": "ban", "loai": "giay", "nhan": "biên bản xác minh, thẩm định"},
 {"tu": "qt", "den": "nv", "loai": "tin", "nhan": "chính sách, ngưỡng duyệt, phân quyền"},
]
DICH_VU = [
 ["Xác minh người bán khi đăng ký", "Nhân viên đến tận nơi kiểm người, diện tích, mặt hàng, giấy tờ; lập biên bản. Xong mới mở tài khoản bán.", "Người bán", "Nhân viên AgiViet", "Miễn phí cho người bán", "Lúc đăng ký; kiểm lại định kỳ", SL],
 ["Phân hạng người bán", "Hạng theo giấy tờ (VietGAP, mã vùng trồng…), nhật ký sản xuất, lịch sử giao dịch. Bên mua thấy hạng, phần đã kiểm và phần tự khai.", "Bên mua xem", "Hệ thống + nhân viên", "Miễn phí", "Liên tục", SL],
 ["Tìm và sàng lọc nguồn theo yêu cầu", "Hệ thống ghép giấu giá; phiếu khó thì nhân viên chọn 2–3 nguồn.", "Bên mua", "Hệ thống + nhân viên", "Trong phí giới thiệu", "Khi có phiếu nhu cầu", PV],
 ["Thẩm định lô trước hợp đồng", "Nhân viên lấy mẫu đúng lô; phòng thử nghiệm kiểm dư lượng khi cần. Có kết quả mới làm hợp đồng; lô được giữ trong lúc thẩm định.", "Bên mua (bắt buộc đơn đầu, đề xuất)", "Nhân viên + phòng thử nghiệm", "Bên mua trả theo báo giá (chờ chốt)", "Trước hợp đồng; giả định 3–5 ngày làm việc", SL],
 ["Soạn hợp đồng điện tử", "Hệ thống gửi phiếu nghĩa vụ, kiểm khớp, soạn hợp đồng có điều khoản vi phạm và bồi hoàn chi phí dịch vụ; hai bên sửa hoặc ký mã cùng một phiên bản.", "Hai bên", "Hệ thống", "Miễn phí", "Sau khi đồng ý giá", SL],
 ["Giữ cọc qua ngân hàng", "Tài khoản giữ riêng từng đơn, chỉ nhận cọc 30% bên mua; chuyển hoặc hoàn theo điều khoản.", "Bên mua đặt", "Ngân hàng đối tác", "Theo thỏa thuận AgiViet – ngân hàng (chờ chốt)", "Sau khi ký", SL],
 ["Trả sau qua ngân hàng", "Ngân hàng cho bên mua vay: khoanh 100% giá trị đơn trong hạn mức thay cho cọc; nghiệm thu xong chuyển thẳng toàn bộ giá trị nghiệm thu cho người bán; bên mua trả ngân hàng gốc + lãi sau.", "Bên mua", "Ngân hàng đối tác", "Bên mua trả lãi; ngân hàng trả hoa hồng AgiViet (chờ đàm phán)", "Chọn trong phiếu nghĩa vụ", SL],
 ["Ứng tiền cho người bán", "Ngân hàng ứng một phần đơn đã cọc, thu lại khi bên mua trả.", "Người bán", "Ngân hàng đối tác", "Người bán trả phí ứng (tài liệu 24/10 đề xuất 1,5%)", "Sau khi cọc", GOC],
 ["Xe đối tác", "Xe thường hoặc xe lạnh; theo dõi vị trí, nhiệt độ; nhà xe chịu rủi ro đường. Chọn trong phiếu nghĩa vụ vì đổi điều khoản ai lo xe.", "Bên lo xe", "Nhà xe", "Bên đặt trả thẳng nhà xe (giả định 4–5 triệu đ xe lạnh 5 tấn Bình Thuận → Long An)", "Phiếu nghĩa vụ", GOC],
 ["Kiểm định khi giao, khi tranh chấp", "Lấy mẫu, so mẫu đối chứng, kết luận.", "Hai bên", "Phòng thử nghiệm, kiểm định", "Bên yêu cầu trả; tranh chấp thì bên sai chịu", "Lúc bốc, lúc nhận, khi tranh chấp", GOC],
 ["Kho lạnh tạm", "Giữ hàng chờ bốc, chờ kiểm định, chờ bán gấp.", "Bên đang giữ hàng", "Kho lạnh", "Bên dùng trả theo ngày; cuối cùng bên có lỗi chịu", "Khi cần", GOC],
 ["Bảo hiểm", "Hàng trên đường; thực hiện hợp đồng (bù khi người bán vi phạm mà chưa bồi hoàn).", "Bên mua (thường)", "Công ty bảo hiểm", "Theo báo giá", "Khi cọc", SL],
 ["Chứng từ và xuất dữ liệu", "Bảng kê 01/TNDN, biên bản, chứng từ; xuất Excel cho phần mềm kế toán.", "Hai bên", "Hệ thống", "Miễn phí", "Sau khi xong đơn", PV],
 ["Đối soát, hòa giải, bồi hoàn", "Đối chiếu khi báo lệch; hòa giải; phiếu bồi hoàn chi phí dịch vụ cho bên có lỗi.", "Hai bên", "Nhân viên AgiViet", "Miễn phí; kiểm định bên sai chịu", "Khi lệch, tranh chấp", GOC],
 ["Điều phối định kỳ sau đơn đầu", "Hợp đồng khung, báo thiếu hàng sớm, nguồn thay thế cùng hạng, báo cáo nhà cung cấp.", "Bên mua", "Hệ thống + nhân viên", "Gói theo doanh nghiệp (chờ chốt)", "Sau đơn đầu", PV],
 ["Trợ lý ngoài giờ", "Trả lời, hướng dẫn, ghi nhận sự cố khi nhân viên nghỉ; việc khẩn gọi nhân viên trực.", "Hai bên", "Hệ thống (AI)", "Miễn phí", "Ngoài giờ", SL],
]
VAN_HANH = {
 "mo_ta": "Nhân viên làm việc hằng ngày trên trang vận hành và app hiện trường. Quản trị đặt luật, duyệt ngoại lệ trên trang quản trị (chỉ máy nội bộ). Ngoài giờ, hệ thống và trợ lý AI giữ máy.",
 "bang_vai": [
  ["Xác minh hiện trường", "Xác minh đăng ký, thẩm định lô, kiểm nhật ký", "App hiện trường (ảnh giờ + vị trí, biên bản)", "Không", "Theo lịch hẹn, ban ngày"],
  ["Hỗ trợ khách hàng", "Hướng dẫn, nhắc hạn, sự cố, gọi điện", "Trang vận hành: hàng việc, hội thoại", "Không", "7:00–21:00 (giả định)"],
  ["Điều phối dịch vụ", "Đặt xe, kho lạnh, kiểm định; theo dõi chuyến", "Trang vận hành: chuyến, đối tác", "Không", "5:00–21:00 theo lịch bốc (giả định)"],
  ["Đối soát tài chính", "Đối chiếu cọc, lệnh ngân hàng, trả thẳng; phiếu bồi hoàn", "Trang vận hành: tiền, sao kê", "Đề xuất lệnh; dưới ngưỡng tự duyệt", "Giờ hành chính"],
  ["Hòa giải", "Hồ sơ tranh chấp, kiểm định, đề xuất kết luận", "Trang vận hành: tranh chấp", "Đề xuất; vượt ngưỡng chờ quản trị", "Giờ hành chính"],
  ["Nhân viên trực", "Việc khẩn ngoài giờ do AI chuyển", "Điện thoại + trang vận hành", "Không", "21:00–7:00 xoay ca (giả định)"],
  ["Quản trị (admin)", "Chính sách, phí theo doanh nghiệp, phân quyền, duyệt vượt ngưỡng, kiểm toán", "Trang quản trị (máy nội bộ)", "Duyệt vượt ngưỡng", "Giờ hành chính + khi có việc duyệt"]],
 "ngoai_gio": [
  ["Trợ lý AI làm được", "Trả lời, hướng dẫn, nhắc hạn, ghi nhận sự cố kèm ảnh và vị trí, tạo việc cho ca sáng"],
  ["Trợ lý AI không làm", "Duyệt tiền, xác nhận tiền, kết luận tranh chấp, đổi tài khoản nhận tiền, sửa hợp đồng"],
  ["Hạn giờ ban đêm", "Hạn của người dùng vẫn chạy; hạn \"chờ nhân viên\" chỉ tính trong giờ làm"],
  ["Việc khẩn gọi nhân viên trực", "Xe hỏng giữa đường, hàng tươi bị từ chối tại kho, nghi lừa đảo tài khoản, mất mạng lúc bốc"],
  ["Sáng hôm sau", "Ca sáng nhận việc AI tạo, xếp theo hạn gần nhất"]],
 "cot": [
  {"ten": "Xác minh", "viec": [{"ten": "Xác minh đăng ký người bán", "han": "hẹn trong 3 ngày (giả định)", "dau_ra": "Biên bản, hạng ban đầu", "loai_nguon": SL}, {"ten": "Thẩm định lô", "han": "lấy mẫu 1–2 ngày", "dau_ra": "Kết quả gửi bên mua", "loai_nguon": SL}]},
  {"ten": "Hỗ trợ", "viec": [{"ten": "Gọi người bán chưa đọc hợp đồng", "han": "sau 12 giờ", "dau_ra": "Ghi kết quả"}, {"ten": "Việc AI tạo đêm qua", "han": "ca sáng", "dau_ra": "Đóng hoặc chuyển", "loai_nguon": SL}]},
  {"ten": "Điều phối", "viec": [{"ten": "Đặt xe theo hợp đồng", "han": "trước ngày giao 1 ngày", "dau_ra": "Biển số, giờ tới"}, {"ten": "Theo dõi chuyến", "han": "suốt chuyến", "dau_ra": "Báo trễ, nhiệt độ"}]},
  {"ten": "Tiền", "viec": [{"ten": "Đối chiếu cọc ngân hàng báo", "han": "trong ngày", "dau_ra": "Khớp / lệch"}, {"ten": "Phiếu bồi hoàn chi phí dịch vụ", "han": "48 giờ sau kết luận", "dau_ra": "Công nợ bên có lỗi", "loai_nguon": SL}]},
  {"ten": "Hòa giải", "viec": [{"ten": "Hồ sơ tranh chấp", "han": "24 giờ", "dau_ra": "Đề xuất kết luận"}, {"ten": "Chờ quản trị duyệt", "han": "24 giờ", "dau_ra": "Lệnh tiền", "loai_nguon": SL}]}],
}
HE_THONG = {
 "viec_thuong": [
  ["Mỗi phút", "Xét hạn giờ mọi đơn: nhắc, chuyển nhánh quá hạn, tạo việc cho nhân viên"],
  ["Khi có phiếu hoặc lô mới", "Ghép giấu giá, báo bên mua có nguồn phù hợp"],
  ["Khi có kết quả ngân hàng", "Đối chiếu lệnh, cập nhật cọc và công nợ, báo hai bên"],
  ["Sáng hằng ngày", "Thời tiết, cảnh báo theo vùng; nhắc lô sắp tự ẩn (14 ngày); nhắc hạn trả"],
  ["Tối hằng ngày", "Giá tham khảo, hạng, uy tín; sao lưu"],
  ["Khi xong đơn", "Biên bản, bảng kê, chứng từ; mời đánh giá; gợi ý dịch vụ sau đơn"],
  ["Liên tục", "Che số điện thoại, Zalo, số tài khoản trong tin nhắn trước cọc"],
  ["Ngoài giờ", "Trợ lý AI trả lời; việc khẩn gọi nhân viên trực"]],
 "tinh_nang": [
  ["Nhật ký sản xuất", "Bón phân, phun thuốc, thu hoạch; tự tính ngày hết cách ly; dùng để phân hạng", "Người bán"],
  ["Giá tham khảo", "Giá đơn đã chốt cùng mặt hàng, loại, vùng; chỉ cảnh báo", "Hai bên"],
  ["Thời tiết, tin vụ mùa, học kỹ thuật", "Theo vùng và mặt hàng", "Người bán"],
  ["Tin nhắn trong đơn", "Che liên lạc trước cọc; số tiền trong tin không có giá trị", "Hai bên"],
  ["Thông báo", "Mỗi thông báo dẫn thẳng tới việc cần làm", "Hai bên"],
  ["Hạng và uy tín", "Người bán: giấy tờ, nhật ký, giao đủ, đúng hẹn. Bên mua: trả đúng hạn, tỷ lệ trả hàng", "Hai bên"],
  ["Chứng từ thuế", "Bảng kê 01/TNDN, biên bản; xuất Excel", "Bên mua"],
  ["Kho và truy xuất bên mua", "Nhập kho từ biên bản nhận; truy về lô, vườn, nhật ký", "Bên mua"],
  ["Nhà cung cấp quen, mua lại", "Người bán đã giao tốt; lập đơn lại nhanh; vẫn kiểm hàng", "Bên mua"],
  ["Hỗ trợ", "Gọi nhân viên, trợ lý ngoài giờ, câu hỏi thường gặp", "Hai bên"]],
}
CAN_CHOT = [
 {"chu_de": "Cọc của bên mua đi đâu khi có vi phạm", "loai": SL,
  "lua_chon": [["Người bán vi phạm (không giao, giao thiếu không báo, sai mẫu theo kiểm định)", "Hoàn cọc bên mua (toàn bộ hoặc theo phần thiếu)"],
               ["Bên mua hủy sau cọc, trước ngày giao", "Đề xuất: người bán hưởng 50% cọc"], ["Bên mua không nhận hàng không căn cứ", "Đề xuất: người bán hưởng 100% cọc"],
               ["Bất khả kháng có bằng chứng", "Không phạt; hoàn cọc phần không giao; hai bên thương lượng"]],
  "de_xuat": "Phần trăm hai bên chọn trong phiếu nghĩa vụ từ bảng mẫu quản trị đặt; hợp đồng ghi rõ.", "can_cu": "Chỉ đạo 27/10; tài liệu 24/10 phần Tiền, Ngoại lệ"},
 {"chu_de": "Đã giao hàng mà bên mua không trả: cọc là phạt hay là trừ nợ", "loai": MT,
  "lua_chon": [["Cọc trừ vào tiền hàng, bên mua còn nợ phần còn lại", "Ví dụ chính: nợ 50.850.000 đ sau khi cọc 22.500.000 đ chuyển người bán"], ["Cọc là khoản phạt riêng, nợ tiền hàng vẫn nguyên", "Bên mua nợ đủ 73.350.000 đ, cọc tính riêng"]],
  "de_xuat": "Cọc trừ vào tiền hàng (giống luồng thuận); phạt chậm trả nếu có ghi riêng.", "can_cu": "Rà soát Codex Q02; tài liệu 24/10 phần Tiền"},
 {"chu_de": "Chi phí dịch vụ đã dùng khi đơn hỏng", "loai": SL,
  "lua_chon": [["Dịch vụ đã làm", "Không hoàn từ đối tác"], ["Bên có lỗi", "Bồi hoàn chi phí dịch vụ bên kia đã trả"],
               ["Người bán có lỗi (không có cọc để trừ)", "Phiếu bồi hoàn, hạn 7 ngày; không trả thì trừ hạng, khóa đơn mới, cấp hồ sơ; bảo hiểm thực hiện hợp đồng nếu bên mua mua"],
               ["Phí giới thiệu", "Hoàn khi lỗi người bán hoặc bất khả kháng; không hoàn khi lỗi bên mua"]],
  "de_xuat": "Điều khoản \"bên có lỗi chịu chi phí dịch vụ đã phát sinh\" bắt buộc.", "can_cu": "Chỉ đạo 27/10"},
 {"chu_de": "Trả sau qua ngân hàng", "loai": SL,
  "lua_chon": [["Thay cọc", "Ngân hàng khoanh 100% giá trị đơn trong hạn mức vay"], ["Khi xong", "Ngân hàng chuyển thẳng toàn bộ giá trị nghiệm thu cho người bán"],
               ["Bên mua vi phạm", "Ngân hàng chi bồi thường theo hợp đồng cho người bán, ghi vào nợ bên mua"], ["Người bán vi phạm", "Nhả khoanh; người bán bồi hoàn chi phí dịch vụ"],
               ["Lãi, hoa hồng", "Bên mua trả lãi; ngân hàng trả hoa hồng AgiViet"]],
  "de_xuat": "Chỉ mở khi có ngân hàng đối tác đồng ý cơ chế khoanh hạn mức theo đơn.", "can_cu": "Chỉ đạo 27/10"},
 {"chu_de": "Bất khả kháng theo thời điểm báo", "loai": MT,
  "lua_chon": [["≥ 7 ngày trước giao", "Hai bên thương lượng; nhân viên tìm nguồn bù"], ["3–7 ngày", "Thương lượng có nhân viên hỗ trợ"], ["< 3 ngày hoặc tại chỗ", "Cần bằng chứng; nhân viên hòa giải"]],
  "de_xuat": "Mốc ngày chốt theo mặt hàng.", "can_cu": "Chỉ đạo 27/10"},
 {"chu_de": "Phí bên mua theo doanh nghiệp", "loai": SL,
  "lua_chon": [["Mức riêng từng doanh nghiệp", "Quản trị đặt, lưu vào hợp đồng lúc ký"], ["Bảng gói cố định 24/10", "Bỏ"]],
  "de_xuat": "Định giá sau khi làm việc với bên mua thật.", "can_cu": "Chỉ đạo 27/10"},
 {"chu_de": "Thẩm định lô trước hợp đồng", "loai": SL,
  "lua_chon": [["Bắt buộc đơn đầu với người bán mới", "Đề xuất"], ["Ai trả", "Bên mua (đề xuất) hoặc chia đôi"], ["Thời gian", "Giả định 3–5 ngày làm việc; cần số thật"]],
  "de_xuat": "Bắt buộc đơn đầu, bên mua trả, lô được giữ trong lúc thẩm định.", "can_cu": "Chỉ đạo 27/10; phỏng vấn"},
 {"chu_de": "Tiền mặt với bên mua chưa quen", "loai": MT,
  "lua_chon": [["Chỉ dỡ hàng khi đếm đủ tiền", "Bảo vệ người bán"], ["Cho dỡ trước", "Người bán chịu rủi ro 70%"]],
  "de_xuat": "Bắt buộc \"trả trước khi dỡ\" khi tiền mặt và chưa có đơn hoàn tất với nhau; người nhận tiền mặt phải được chủ tài khoản ủy quyền trong hợp đồng.", "can_cu": "Chỉ đạo 27/10; rà soát Codex Q05"},
 {"chu_de": "Tuyến, mặt hàng thử nghiệm và số thật", "loai": MT,
  "lua_chon": [["Thanh long Bình Thuận → kho Long An", "Giả định trong mô phỏng"], ["Cần thu", "Thời gian chở, kiểm kho, hao hụt, giá xe, giá kiểm nghiệm"]],
  "de_xuat": "Thay mọi số giả định bằng số thật trước khi duyệt.", "can_cu": "Chỉ đạo 27/10"},
 {"chu_de": "Giờ làm nhân viên, trực đêm, ngưỡng duyệt", "loai": MT,
  "lua_chon": [["Hỗ trợ 7:00–21:00, trực khẩn 21:00–7:00", "Giả định"], ["Ngưỡng tiền nhân viên tự duyệt", "Chờ chốt"]],
  "de_xuat": "Chốt theo số đơn thử nghiệm.", "can_cu": "Chỉ đạo 27/10"},
]

T = []
GT, COC = 75_000_000, 22_500_000            # 5 tấn × 15.000 đ; cọc 30% chỉ bên mua
NT = 4_800 * 15_000 + 150 * 9_000            # nghiệm thu 73.350.000
CON = NT - COC                               # còn phải trả 50.850.000
VD = {"ma": "HĐ-0101", "gia_tri": GT}
FRESH = "12 giờ (hàng tươi)"

def ky_coc():
    "Đoạn chung từ đồng ý giá tới khi ngân hàng giữ cọc (rút gọn)."
    return [
     B("app", "Gửi phiếu nghĩa vụ, soạn hợp đồng", o_dau="he_thong", luong=[("giay", "mua", "hợp đồng"), ("giay", "ban", "hợp đồng")], tt="Hợp đồng chờ ký", loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Rút gọn: xem đủ bước ở đơn chính."),
     B("ban", "Hai bên ký mã cùng một bản", luong=[("tin", "app", "đã ký")], tt="Chờ cọc", nguon=["Hợp đồng và ký"]),
     B("mua", "Chuyển cọc 30% vào tài khoản giữ của đơn", o_dau="ngoai_app", luong=[("tien", "nh", tien(COC))], han=FRESH, loai=SL, nguon=["Chỉ đạo 27/10"]),
     B("nh", "Xác nhận đã giữ cọc", o_dau="ngan_hang", luong=[("tin", "app", "đã giữ")], so={"coc_giu": COC}, tt="Đã cọc, chờ giao", nguon=["Điều kiện chuyển bước"], nv="Đối soát tài chính: khớp số, khớp đơn.")]
def giao_chot():
    "Đoạn chung: bốc, chở, nghiệm thu, người bán chốt số."
    return [
     B("ban", "Bốc 5.000 kg, biên bản bốc, mẫu đối chứng", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", nguon=["Giao nhận"]),
     B("mua", "Kho nhận, nghiệm thu 3 phần", luong=[("tin", "ban", "4.800 đạt · 150 hạ cấp · 50 trả lại")], tt="Chờ người bán xác nhận", so={"phai_tra": NT}, nguon=["Giao nhận"]),
     B("ban", "Chốt số: \"Đúng\"", han="24 giờ", luong=[("tin", "app", "đã chốt")], nguon=["Ngoại lệ"], nv="Hòa giải nếu \"Không đúng\"; cọc vẫn giữ.")]

# 1. Đơn chính đủ bước
T.append(TH("chinh", "Đơn chính: thanh long Bình Thuận → kho Long An", "thuan",
  "Trang trại anh Tư (Hàm Thuận Nam, Bình Thuận) bán 5 tấn thanh long ruột trắng loại 1 cho Công ty XNK Phương Nam (kho Bến Lức, Long An), 15.000 đ/kg. Bên mua mới nên thẩm định lô trước. Chỉ bên mua đặt cọc 30%. Xe lạnh đối tác (chọn trong phiếu nghĩa vụ). Phần còn lại chuyển khoản sau nghiệm thu và đối soát. Thời gian, giá dịch vụ là giả định.",
  [B("ban", "Đăng lô từ mặt hàng đã xác minh", luong=[("tin", "app", "6 tấn · giá thấp nhất kín")], moc="Ngày 1", nguon=["Người bán đăng lô"], dieu_kien="Hạng người bán hiện kèm lô"),
   B("mua", "Tạo phiếu nhu cầu, giá tối đa kín", luong=[("tin", "app", "5 tấn loại 1, giao Bến Lức")], moc="Ngày 1", nguon=["Phiếu nhu cầu"]),
   B("app", "Ghép giấu giá, hiện hạng người bán", o_dau="he_thong", luong=[("tin", "mua", "3 nguồn, không có giá")], nguon=["Ghép hàng giấu giá"]),
   B("mua", "Chọn trang trại anh Tư, yêu cầu thẩm định lô", luong=[("tin", "app", "yêu cầu thẩm định")], tt="Thẩm định lô", moc="Ngày 2", loai=SL, nguon=["Chỉ đạo 27/10", "Phỏng vấn"], trich="Phải thử mẫu, thẩm định trước đơn đầu tiên",
     chi_tiet="Bên mua thấy trước phí và thời gian dự kiến; lô được giữ trong lúc thẩm định."),
   B("app", "Giữ lô, tạo việc thẩm định", o_dau="he_thong", luong=[("tin", "nv", "lịch lấy mẫu"), ("tin", "ban", "lô đang được giữ")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Đến vườn lấy mẫu, chụp, cân thử", o_dau="nhan_vien", luong=[("hang", "dt", "mẫu niêm phong")], moc="Ngày 3", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Xác minh hiện trường: ảnh có giờ, vị trí; kiểm nhật ký phun thuốc."),
   B("dt", "Phòng thử nghiệm kiểm dư lượng", o_dau="ngoai_app", luong=[("giay", "app", "kết quả đạt")], han="giả định 3–5 ngày làm việc", moc="Ngày 3–7", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Gửi kết quả thẩm định cho bên mua", o_dau="he_thong", luong=[("giay", "mua", "biên bản + kết quả")], moc="Ngày 7", loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Phí thẩm định bên mua trả riêng theo báo giá."),
   B("mua", "Chào giá 15.000 đ/kg", luong=[("tin", "ban", "lời chào")], han="24 giờ / lượt", nguon=["Chào giá kín"]),
   B("ban", "Đồng ý giá", luong=[("tin", "app", "chốt 15.000")], moc="Ngày 8", nguon=["Chào giá kín"]),
   B("app", "Gửi phiếu nghĩa vụ cho hai bên", o_dau="he_thong", luong=[("tin", "mua", "nghĩa vụ bên mua"), ("tin", "ban", "nghĩa vụ bên bán")], tt="Thỏa thuận nghĩa vụ", loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Bên mua: nơi nhận, ai lo xe (xe đối tác / tự lo / người bán chở), lúc và cách trả (chuyển khoản, tiền mặt, trả sau qua ngân hàng), tiêu chí nghiệm thu, giá hạ cấp. Bên bán: lượng chắc giao, ngày hái, đóng gói, tài khoản nhận tiền. Cả hai: mức xử lý cọc khi vi phạm, điều khoản bên có lỗi chịu chi phí dịch vụ."),
   B("mua", "Điền nghĩa vụ: xe lạnh đối tác, CK sau nghiệm thu 24 giờ", luong=[("giay", "app", "phiếu bên mua")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Điền nghĩa vụ: 5 tấn chắc giao, hái ngày 10", luong=[("giay", "app", "phiếu bên bán")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Hỗ trợ khách hàng: gọi nếu 12 giờ chưa điền."),
   B("app", "Kiểm khớp, soạn hợp đồng bản 1", o_dau="he_thong", luong=[("giay", "mua", "bản 1"), ("giay", "ban", "bản 1")], tt="Hợp đồng chờ ký", dieu_kien="Hai phiếu không mâu thuẫn", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Đề nghị sửa: hái ngày 11", luong=[("tin", "app", "đề nghị")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("mua", "Đồng ý đề nghị", luong=[("tin", "app", "đồng ý")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Soạn bản 2", o_dau="he_thong", luong=[("giay", "mua", "bản 2"), ("giay", "ban", "bản 2")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Nghe điều khoản, ký mã bản 2", luong=[("tin", "app", "đã ký")], han="24 giờ", moc="Ngày 9", nguon=["Hợp đồng và ký"]),
   B("mua", "Ký mã bản 2", luong=[("tin", "app", "đã ký")], tt="Chờ cọc", chi_tiet="Hợp đồng chỉ có hiệu lực khi ngân hàng xác nhận cọc.", nguon=["Hợp đồng và ký"]),
   B("app", "Yêu cầu ngân hàng mở tài khoản giữ cọc HĐ-0101", o_dau="he_thong", luong=[("giay", "nh", "mở tài khoản")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nh", "Trả số tài khoản giữ cọc + mã VietQR", o_dau="ngan_hang", luong=[("giay", "app", "TK giữ cọc")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Gửi bên mua hướng dẫn: chỉ chuyển cọc", o_dau="he_thong", luong=[("tin", "mua", tien(COC))], han=FRESH, loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Tài khoản giữ cọc chỉ nhận đúng khoản cọc. Phí giới thiệu thu bằng hóa đơn riêng; tiền xe trả nhà xe."),
   B("mua", "Chuyển cọc vào tài khoản giữ", o_dau="ngoai_app", luong=[("tien", "nh", tien(COC))], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nh", "Xác nhận đã nhận đúng số, đúng đơn", o_dau="ngan_hang", luong=[("tin", "app", "đã giữ")], so={"coc_giu": COC}, nguon=["Điều kiện chuyển bước"], nv="Đối soát tài chính: khớp số, khớp nội dung."),
   B("app", "Hợp đồng hiệu lực: mở liên lạc, báo người bán", o_dau="he_thong", luong=[("tin", "ban", "ngân hàng đang giữ cọc"), ("tin", "mua", "số người bán")], tt="Đã cọc, chờ giao", moc="Ngày 9", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Hỗ trợ: gọi người bán nếu 6 giờ chưa xem."),
   B("mua", "Chọn dịch vụ thêm: bảo hiểm hàng trên đường", luong=[("tien", "dt", "phí bảo hiểm (trả riêng)")], loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Dịch vụ không đổi điều khoản thì chọn lúc này: bảo hiểm, kiểm định lúc bốc, kho lạnh tạm. Người bán xem được ứng tiền (ngân hàng). Trả thẳng đối tác."),
   B("nv", "Đặt xe lạnh theo hợp đồng", o_dau="nhan_vien", luong=[("tin", "dt", "đặt chuyến ngày 11")], nguon=["Vận chuyển"], nv="Điều phối dịch vụ."),
   B("mua", "Trả tiền xe cho nhà xe", o_dau="ngoai_app", luong=[("tien", "dt", "giả định 4–5 triệu đ")], nguon=["Vận chuyển"]),
   B("ban", "Hái, phân loại, đóng 250 thùng", o_dau="ngoai_app", moc="Ngày 11, 4:00", nguon=["Giao nhận"]),
   B("dt", "Xe lạnh tới vườn, đưa mã nhận hàng", o_dau="ngoai_app", luong=[("tin", "ban", "mã 6 số + biển số")], moc="Ngày 11, 6:00", nguon=["Vận chuyển"]),
   B("ban", "Quét mã, cân 5.000 kg, chụp, niêm mẫu, bốc", o_dau="ngoai_app", luong=[("hang", "dt", "5.000 kg"), ("giay", "app", "biên bản bốc")], tt="Đang giao", moc="Ngày 11, 6:00–7:30", dieu_kien="Giao xa > 100 km: biên bản bốc + mẫu đối chứng", nguon=["Giao nhận"]),
   B("mua", "Xem video bốc, bấm \"Đạt khi bốc\"", nguon=["Giao nhận"], chi_tiet="Từ đây rủi ro đường thuộc nhà xe."),
   B("dt", "Chở ~230 km, ghi vị trí, nhiệt độ", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], moc="Ngày 11, 7:30–12:30 (giả định)", nguon=["Vận chuyển"], nv="Điều phối: báo nếu trễ, nhiệt độ vượt."),
   B("mua", "Kho ký nhận, QC nghiệm thu 3 phần", luong=[("tin", "ban", "4.800 đạt · 150 hạ cấp · 50 trả lại")], han="2 giờ từ lúc ký nhận", moc="Ngày 11, 12:30–14:30", tt="Chờ người bán xác nhận", so={"phai_tra": NT}, nguon=["Giao nhận"], dieu_kien="So mẫu đối chứng; trả lại > 5% phải có ảnh"),
   B("ban", "Chốt số: \"Đúng\"", han="24 giờ", luong=[("tin", "app", "đã chốt")], nguon=["Ngoại lệ"], nv="Hòa giải nếu \"Không đúng\"; cọc vẫn giữ."),
   B("app", "Đối soát theo hợp đồng", o_dau="he_thong", luong=[("giay", "mua", "bảng đối soát"), ("giay", "ban", "bảng đối soát")], tt="Chờ thanh toán", loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet=f"Giá trị nghiệm thu {tien(NT)} (4.800 × 15.000 + 150 × 9.000). Hao hụt đường do nhà xe/bảo hiểm chịu. Còn phải trả = {tien(NT)} − cọc {tien(COC)} = {tien(CON)}, hạn 24 giờ."),
   B("mua", "Chuyển khoản thẳng phần còn lại, báo đã trả", o_dau="ngoai_app", luong=[("tien", "ban", tien(CON))], moc="Ngày 12", nguon=["Tiền"]),
   B("ban", "Kiểm tài khoản, xác nhận \"Đã nhận\"", so={"tra_thang": CON}, dieu_kien="Chính chủ tài khoản thấy tiền", nguon=["Tiền"], nv="Đối soát: báo lệch thì đối chiếu sao kê."),
   B("app", "Đủ điều kiện: gửi lệnh chuyển cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh " + tien(COC))], tt="Quyết toán cọc", dieu_kien="Đã chốt số, đã nhận đủ, không tranh chấp", nguon=["Điều kiện chuyển bước"]),
   B("nh", "Chuyển cọc, báo kết quả", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, nguon=["Điều kiện chuyển bước"]),
   B("app", "Hoàn tất: chứng từ, đánh giá, cập nhật hạng", o_dau="he_thong", luong=[("giay", "mua", "bảng kê, Excel"), ("giay", "ban", "lịch sử tiền")], tt="Hoàn tất", moc="Ngày 12", nguon=["Tiền"],
     chi_tiet="50 kg trả lại: gợi ý bán gấp. Gợi ý dịch vụ sau đơn đầu.")],
  nguon=["Tài liệu 24/10", "Chỉ đạo 27/10", "Phỏng vấn"], vi_du={**VD, "ghi": f"Người bán nhận {tien(CON)} + {tien(COC)} = {tien(NT)} = giá trị nghiệm thu. Tài khoản cọc chỉ có {tien(COC)} của bên mua."},
  trang_thai=TT, vai=["ban", "mua", "app", "nv", "dt", "nh"], loai=SL))

T.append(TH("tra-sau-ngan-hang", "Trả sau qua ngân hàng: không có cọc tiền mặt", "thuan",
  "Bên mua chọn trả sau 30 ngày. Ngân hàng khoanh 100% giá trị đơn trong hạn mức vay thay cho cọc. Nghiệm thu xong, ngân hàng chuyển thẳng toàn bộ giá trị nghiệm thu cho người bán một lần. AgiViet không cho vay, nhận hoa hồng từ ngân hàng.",
  [B("mua", "Có hạn mức vay đã duyệt ở ngân hàng đối tác", luong=[("giay", "nh", "hồ sơ vay")], loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Bên mua ký hợp đồng vay riêng với ngân hàng; lãi, phí do ngân hàng quy định."),
   B("app", "Phiếu nghĩa vụ: chọn \"trả sau qua ngân hàng\"; soạn hợp đồng", o_dau="he_thong", luong=[("giay", "mua", "hợp đồng"), ("giay", "ban", "hợp đồng")], tt="Hợp đồng chờ ký", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Hai bên ký mã", luong=[("tin", "app", "đã ký")], nguon=["Hợp đồng và ký"]),
   B("nh", "Khoanh " + tien(GT) + " trong hạn mức (thay cọc)", o_dau="ngan_hang", luong=[("tin", "app", "đã khoanh")], tt="Đã cọc, chờ giao", loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Chưa giải ngân, chưa tính lãi. Không có bước bên mua chuyển cọc.", nv="Đối soát: khoanh đúng số, đúng đơn."),
   B("app", "Hợp đồng hiệu lực: báo người bán \"ngân hàng đã bảo đảm đủ\"", o_dau="he_thong", luong=[("tin", "ban", "đã bảo đảm 100%")], loai=SL, nguon=["Chỉ đạo 27/10"])] + giao_chot() + [
   B("app", "Gửi lệnh giải ngân theo giá trị nghiệm thu", o_dau="he_thong", luong=[("giay", "nh", "lệnh " + tien(NT))], tt="Chờ thanh toán", dieu_kien="Đã chốt số, không tranh chấp", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nh", "Chuyển thẳng toàn bộ cho người bán", o_dau="ngan_hang", luong=[("tien", "ban", tien(NT))], so={"tra_thang": NT}, loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Nhả phần khoanh còn lại (" + tien(GT - NT) + ")."),
   B("ban", "Xác nhận đã nhận", luong=[("tin", "app", "đã nhận")], tt="Hoàn tất", nguon=["Tiền"]),
   B("nh", "Trả hoa hồng cho AgiViet", o_dau="ngan_hang", luong=[("tien", "app", "hoa hồng (chờ đàm phán)")], loai=MT, nguon=["Chỉ đạo 27/10"]),
   B("mua", "Sau 30 ngày trả ngân hàng gốc + lãi", o_dau="ngoai_app", luong=[("tien", "nh", "gốc + lãi")], loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Nợ của bên mua với ngân hàng; không liên quan người bán.")],
  nguon=["Chỉ đạo 27/10"], vi_du={**VD, "ghi": f"Người bán nhận một lần {tien(NT)} từ ngân hàng. Không có cọc tiền mặt."}, trang_thai=TT, vai=["mua", "app", "ban", "nh"], loai=SL))
T.append(TH("tra-sau-mua-vi-pham", "Trả sau qua ngân hàng: bên mua từ chối hàng không căn cứ", "nhanh",
  "Hàng đạt nhưng bên mua từ chối nhận. Kiểm định kết luận hàng đạt. Ngân hàng chi khoản bồi thường theo hợp đồng cho người bán từ hạn mức, ghi vào nợ bên mua; nhả phần khoanh còn lại.",
  [B("nh", "Đang khoanh " + tien(GT), o_dau="ngan_hang", tt="Đã cọc, chờ giao", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Giao tới kho", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", nguon=["Giao nhận"]),
   B("mua", "Từ chối cả lô", luong=[("giay", "app", "lý do + ảnh")], han="2 giờ", nguon=["Ngoại lệ"]),
   B("dt", "Kiểm định: hàng đạt", o_dau="ngoai_app", luong=[("giay", "app", "kết luận")], han="24 giờ", nguon=["Giao nhận"]),
   B("qt", "Duyệt lệnh bồi thường (vượt ngưỡng)", o_dau="nhan_vien", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nh", "Chi bồi thường cho người bán, ghi nợ bên mua", o_dau="ngan_hang", luong=[("tien", "ban", "khoản bồi thường theo hợp đồng")], loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Mức bồi thường ghi trong phiếu nghĩa vụ (ví dụ tương đương 30% giá trị). Phí kiểm định bên mua chịu."),
   B("nh", "Nhả phần khoanh còn lại", o_dau="ngan_hang", tt="Hoàn tất", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Gợi ý người bán bán gấp lô hàng", o_dau="he_thong", luong=[("tin", "ban", "bên mua khác")], nguon=["Hàng kém loại"])],
  nguon=["Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["nh", "ban", "mua", "dt", "qt", "app"], loai=SL))

T.append(TH("tien-mat", "Tiền mặt khi nhận, ở xa", "thuan", "Hợp đồng ghi tiền mặt, trả trước khi dỡ. Người nhận tiền là chủ tài khoản hoặc người được chủ ủy quyền trong hợp đồng; đếm đủ mới dỡ.",
  ky_coc() + [
   B("ban", "Tự chở tới kho, người được ủy quyền đi theo", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", chi_tiet="Người bán tự chở thì chịu rủi ro tới lúc cân tại kho.", nguon=["Vận chuyển"]),
   B("mua", "Cân, nghiệm thu 3 phần", luong=[("tin", "ban", tien(NT))], tt="Chờ người bán xác nhận", so={"phai_tra": NT}, nguon=["Giao nhận"]),
   B("ban", "Chốt số: \"Đúng\"", luong=[("tin", "app", "đã chốt")], nguon=["Ngoại lệ"]),
   B("mua", "Trả tiền mặt trước khi dỡ, hai bên ký biên nhận", o_dau="ngoai_app", luong=[("tien", "ban", tien(CON) + " tiền mặt")], tt="Chờ thanh toán", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Đếm đủ, xác nhận \"Đã nhận\", mới dỡ", so={"tra_thang": CON}, loai=SL, nguon=["Chỉ đạo 27/10"], nv="Hỗ trợ: kiểm người nhận đúng người được ủy quyền."),
   B("app", "Gửi lệnh chuyển cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh")], tt="Quyết toán cọc", nguon=["Điều kiện chuyển bước"]),
   B("nh", "Chuyển cọc cho người bán", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC}, tt="Hoàn tất", nguon=["Tiền"])],
  nguon=["Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["ban", "mua", "app", "nh"], loai=SL))
T.append(TH("chua-tra", "Đã dỡ hàng nhưng bên mua chưa trả", "nhanh", "Hàng đã vào kho, quá hạn trả 24 giờ. Cọc 30% là bảo đảm duy nhất; cọc trừ vào tiền hàng, bên mua vẫn nợ phần còn lại.",
  ky_coc() + giao_chot() + [
   B("ban", "Quá hạn, bấm \"Chưa nhận\"", luong=[("tin", "app", "chưa nhận")], tt="Chờ thanh toán", nguon=["Ngoại lệ"]),
   B("app", "Báo bên mua: 48 giờ trả hoặc gửi chứng từ", o_dau="he_thong", luong=[("tin", "mua", "còn " + tien(CON))], han="48 giờ", nguon=["Ngoại lệ"]),
   B("nv", "Gọi hai bên, đối chiếu", o_dau="nhan_vien", nguon=["Ngoại lệ"], nv="Đối soát tài chính; ảnh ủy nhiệm chi chưa đủ."),
   B("nh", "Chuyển cọc cho người bán (trừ vào tiền hàng)", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC))], so={"coc_giu": 0, "coc_chi_ban": COC, "con_no": "Bên mua còn nợ " + tien(CON)}, tt="Đã giao xong · còn công nợ", loai=MT, nguon=["Chỉ đạo 27/10", "Rà soát Codex"]),
   B("app", "Trừ uy tín bên mua, khóa đơn mới, cấp hồ sơ đòi nợ", o_dau="he_thong", luong=[("giay", "ban", "hồ sơ")], chi_tiet="AgiViet không đòi nợ thay, không cho vay. Muốn tránh: trả trước khi dỡ, hoặc bên mua dùng trả sau qua ngân hàng.", loai=SL, nguon=["Chỉ đạo 27/10"])],
  nguon=["Chỉ đạo 27/10"], vi_du={**VD, "ghi": f"Người bán đã nhận {tien(COC)} (cọc); bên mua còn nợ {tien(CON)}. Không trừ cọc hai lần."}, trang_thai=TT_NO, vai=["ban", "mua", "app", "nv", "nh"], loai=SL))
T.append(TH("ung-tien", "Người bán ứng tiền từ ngân hàng", "dich_vu", "Người bán cần tiền trước ngày giao. Ngân hàng ứng một phần đơn đã cọc; thu lại khi bên mua trả. Đường tiền cụ thể cần ngân hàng xác nhận.",
  ky_coc() + [
   B("ban", "Đề nghị ứng tiền", luong=[("tin", "nh", "đề nghị ứng")], nguon=["Tiền (ứng tiền)"], nv="Đối soát: đúng chủ tài khoản."),
   B("nh", "Ứng tiền, trừ phí ứng", o_dau="ngan_hang", luong=[("tien", "ban", "khoản ứng − phí")], nguon=["Tiền (ứng tiền)"], chi_tiet="Mức ứng, phí do ngân hàng quy định (tài liệu 24/10 đề xuất tới 70%, phí 1,5%).")] + giao_chot() + [
   B("mua", "Trả phần còn lại vào tài khoản đơn ở ngân hàng", o_dau="ngoai_app", luong=[("tien", "nh", tien(CON))], tt="Chờ thanh toán", loai=MT, nguon=["Chỉ đạo 27/10"], chi_tiet="Có ứng tiền thì phần còn lại trả vào ngân hàng để trừ khoản ứng (chờ chốt với ngân hàng)."),
   B("nh", "Thu khoản ứng, chuyển phần dư + cọc cho người bán", o_dau="ngan_hang", luong=[("tien", "ban", "phần dư + cọc")], so={"coc_giu": 0, "coc_chi_ban": COC, "tra_thang": CON}, loai=MT, nguon=["Tiền (ứng tiền)"],
     chi_tiet=f"Tổng người bán nhận = khoản ứng + phần dư + cọc = {tien(NT)}; phí ứng người bán trả ngân hàng, trừ ở lúc ứng."),
   B("ban", "Xác nhận đã nhận phần dư", luong=[("tin", "app", "đã nhận")], tt="Hoàn tất", nguon=["Tiền"])],
  nguon=["Tài liệu 24/10", "Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["ban", "nh", "mua", "app"], loai=MT))

T.append(TH("ban-vi-pham", "Người bán không giao: hoàn cọc, bồi hoàn chi phí dịch vụ", "nhanh", "Xe lạnh tới vườn, không có hàng, người bán không báo. Cọc hoàn bên mua; tiền xe đã trả không lấy lại từ nhà xe nên người bán bồi hoàn.",
  ky_coc() + [
   B("dt", "Xe lạnh tới vườn, chờ 2 giờ, không có hàng", o_dau="ngoai_app", luong=[("tin", "app", "không có hàng")], nguon=["Vận chuyển"]),
   B("nv", "Gọi người bán", o_dau="nhan_vien", han="12 giờ", nguon=["Ngoại lệ"], nv="Hỗ trợ: có lý do thì hướng dẫn đề nghị dời lịch."),
   B("app", "Ghi vi phạm, gửi lệnh hoàn cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh hoàn")], tt="Quyết toán cọc", nguon=["Ngoại lệ"]),
   B("nh", "Hoàn cọc cho bên mua", o_dau="ngan_hang", luong=[("tien", "mua", tien(COC))], so={"coc_giu": 0, "hoan_mua": COC}, nguon=["Tiền"]),
   B("app", "Hoàn phí giới thiệu cho bên mua", o_dau="he_thong", luong=[("tien", "mua", "phí giới thiệu")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Phiếu bồi hoàn tiền xe + phí thẩm định", o_dau="nhan_vien", luong=[("giay", "ban", "phiếu bồi hoàn, hạn 7 ngày")], loai=SL, nguon=["Chỉ đạo 27/10"], nv="Đối soát tài chính: kèm hóa đơn nhà xe.", so={"con_no": "Người bán nợ bên mua chi phí dịch vụ"}),
   B("ban", "Không trả bồi hoàn: trừ hạng, khóa đơn mới", luong=[("giay", "mua", "hồ sơ đòi")], tt="Đã giao xong · còn công nợ", loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Có bảo hiểm thực hiện hợp đồng thì bảo hiểm trả bên mua rồi tự đòi người bán.")],
  nguon=["Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT_NO, vai=["dt", "nv", "app", "nh", "ban", "mua"], loai=SL))
T.append(TH("mua-huy", "Bên mua xin hủy sau cọc", "nhanh", "Bên mua hủy trước ngày giao không do lỗi người bán. Người bán hưởng phần trăm cọc theo hợp đồng (đề xuất 50%).",
  ky_coc() + [
   B("mua", "Xin hủy, ghi lý do", luong=[("tin", "app", "khách nước ngoài lùi đơn")], nguon=["Ngoại lệ"]),
   B("app", "Báo người bán kèm hệ quả theo hợp đồng", o_dau="he_thong", luong=[("tin", "ban", "hưởng 50% cọc nếu đồng ý")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Đồng ý hủy", luong=[("tin", "app", "đồng ý")], nguon=["Ngoại lệ"]),
   B("app", "Gửi lệnh chia cọc", o_dau="he_thong", luong=[("giay", "nh", "lệnh")], tt="Quyết toán cọc", nguon=["Ngoại lệ"]),
   B("nh", "Chuyển 50% cho người bán, hoàn 50% bên mua", o_dau="ngan_hang", luong=[("tien", "ban", tien(COC // 2)), ("tien", "mua", tien(COC // 2))], so={"coc_giu": 0, "coc_chi_ban": COC // 2, "hoan_mua": COC // 2}, tt="Hoàn tất", loai=MT, nguon=["Chỉ đạo 27/10"]),
   B("app", "Không hoàn phí giới thiệu; dịch vụ bên mua đã đặt bên mua chịu", o_dau="he_thong", loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Lượng trả về lô; gợi ý khách khác.")],
  nguon=["Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["mua", "app", "ban", "nh"], loai=SL))
T.append(TH("bat-kha-khang", "Bất khả kháng: báo trước, thương lượng", "nhanh", "Mưa lớn hỏng 40% vườn, người bán báo trước 5 ngày. Không phạt; hai bên thương lượng, nhân viên hỗ trợ theo chính sách.",
  ky_coc() + [
   B("ban", "Báo thiệt hại, ảnh vườn, chỉ giao được 3 tấn", luong=[("giay", "app", "bằng chứng")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Đến vườn xác nhận thiệt hại", o_dau="nhan_vien", luong=[("giay", "app", "biên bản")], loai=SL, nguon=["Chỉ đạo 27/10"], nv="Phân biệt bất khả kháng với ước sai."),
   B("app", "Mở thương lượng: giảm lượng, dời lịch, nguồn bù", o_dau="he_thong", luong=[("tin", "mua", "lựa chọn"), ("tin", "ban", "lựa chọn")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("mua", "Chọn: nhận 3 tấn + nguồn bù 2 tấn", luong=[("tin", "app", "đồng ý")], nguon=["Ngoại lệ"]),
   B("app", "Hợp đồng bản mới 3 tấn; lệnh hoàn cọc phần thiếu", o_dau="he_thong", luong=[("giay", "nh", "lệnh hoàn 9.000.000")], loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Cọc mới = 30% × 3 tấn × 15.000 = 13.500.000; hoàn 9.000.000."),
   B("nh", "Hoàn 9.000.000 cho bên mua", o_dau="ngan_hang", luong=[("tien", "mua", "9.000.000 đ")], so={"coc_giu": COC - 9_000_000, "hoan_mua": 9_000_000}, nguon=["Ngoại lệ"]),
   B("nv", "Tìm nguồn bù 2 tấn cùng hạng", o_dau="nhan_vien", luong=[("tin", "mua", "2 nguồn")], nguon=["Ngoại lệ"], nv="Không trừ uy tín người bán.")],
  nguon=["Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["ban", "nv", "app", "mua", "nh"], loai=SL))
T.append(TH("can-khong-dung", "Người bán báo số cân không đúng", "nhanh", "Cân lại 24 giờ; vẫn lệch thì kiểm định. Cọc giữ tới khi có kết quả; bên sai chịu phí kiểm định.",
  ky_coc() + [
   B("ban", "Bốc, biên bản", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", nguon=["Giao nhận"]),
   B("mua", "Gửi kết quả: trả lại 200 kg", luong=[("tin", "ban", "kết quả")], tt="Chờ người bán xác nhận", nguon=["Ngoại lệ"]),
   B("ban", "\"Không đúng\" + ảnh", luong=[("giay", "app", "bằng chứng")], nguon=["Ngoại lệ"]),
   B("nv", "Hòa giải: mời cân lại", o_dau="nhan_vien", han="24 giờ", nguon=["Ngoại lệ"], nv="Giữ cọc."),
   B("dt", "Kiểm định lấy mẫu, kết luận", o_dau="ngoai_app", han="48 giờ", luong=[("giay", "app", "kết quả")], nguon=["Giao nhận"]),
   B("qt", "Duyệt kết luận (vượt ngưỡng)", o_dau="nhan_vien", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Chốt số theo kết quả; bên sai chịu phí kiểm định", o_dau="he_thong", tt="Chờ thanh toán", nguon=["Ngoại lệ"])],
  nguon=["Tài liệu 24/10"], vi_du=VD, trang_thai=TT, vai=["mua", "ban", "nv", "dt", "qt", "app"]))
T.append(TH("khac-mau", "Giao xa: hàng tới khác mẫu lúc bốc", "nhanh", "Mở mẫu đối chứng: 300 kg thối ruột. Hư do đường thì nhà xe/bảo hiểm chịu; khác mẫu thì kiểm định. Hàng tươi không chở ngược.",
  ky_coc() + [
   B("ban", "Bốc, niêm mẫu", o_dau="ngoai_app", luong=[("hang", "mua", "5.000 kg")], tt="Đang giao", nguon=["Giao nhận"]),
   B("mua", "Mở mẫu đối chứng, báo khác mẫu", luong=[("giay", "app", "ảnh")], tt="Chờ nghiệm thu", nguon=["Giao nhận"]),
   B("dt", "Kho lạnh tạm giữ 300 kg", o_dau="ngoai_app", nguon=["Giao nhận"], chi_tiet="Bên giữ hàng trả phí kho trước; cuối cùng bên có lỗi chịu."),
   B("dt", "Kiểm định so mẫu niêm phong", o_dau="ngoai_app", han="24 giờ", luong=[("giay", "app", "khác mẫu")], nguon=["Giao nhận"]),
   B("app", "Trừ 300 kg khỏi giá trị; người bán chịu phí kho, kiểm định", o_dau="he_thong", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Chốt số theo kết luận", luong=[("tin", "app", "đã chốt")], tt="Chờ người bán xác nhận", nguon=["Ngoại lệ"]),
   B("nv", "Phiếu bồi hoàn chi phí dịch vụ", o_dau="nhan_vien", luong=[("giay", "ban", "phiếu")], tt="Chờ thanh toán", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Đối soát tài chính.")],
  nguon=["Tài liệu 24/10", "Chỉ đạo 27/10"], vi_du=VD, trang_thai=TT, vai=["ban", "mua", "dt", "app", "nv"]))
T.append(TH("qua-han-coc", "Quá hạn cọc", "nhanh", "Hàng tươi 12 giờ (thường 48 giờ) chưa cọc thì đơn đóng; chưa có tiền nên không ai mất gì.",
  [B("app", "Gửi hướng dẫn chuyển cọc", o_dau="he_thong", luong=[("tin", "mua", "TK giữ cọc")], tt="Chờ cọc", nguon=["Ngoại lệ"]),
   B("app", "Nhắc trước hạn", o_dau="he_thong", luong=[("tin", "mua", "nhắc")], han=FRESH, nguon=["Ngoại lệ"], nv="Hỗ trợ: gọi khi còn 3 giờ."),
   B("app", "Đóng đơn, lượng về lô", o_dau="he_thong", luong=[("tin", "ban", "lượng về lô")], nguon=["Ngoại lệ"])],
  nguon=["Tài liệu 24/10"], vai=["app", "mua", "ban"]))
T.append(TH("de-nghi", "Đề nghị đổi lịch, lượng, cách chở", "nhanh", "Đề nghị đi qua hệ thống; 24 giờ, im lặng là không đồng ý. Đồng ý thì hệ thống soạn bản mới, hai bên ký lại.",
  [B("mua", "Đề nghị dời ngày giao", luong=[("tin", "app", "đề nghị")], nguon=["Ngoại lệ"]),
   B("app", "Gửi người bán kèm hệ quả", o_dau="he_thong", luong=[("tin", "ban", "đề nghị")], han="24 giờ", nguon=["Ngoại lệ"]),
   B("ban", "Đồng ý", luong=[("tin", "app", "đồng ý")], nguon=["Ngoại lệ"]),
   B("app", "Soạn bản mới", o_dau="he_thong", luong=[("giay", "mua", "bản mới"), ("giay", "ban", "bản mới")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("ban", "Hai bên ký lại", luong=[("tin", "app", "đã ký")], nguon=["Hợp đồng và ký"])],
  nguon=["Tài liệu 24/10"], vai=["mua", "app", "ban"]))

T.append(TH("dat-truoc", "Đặt trước khi hái", "hop_dong", "Đặt trước 8–10 tấn thanh long, hái sau 6 tuần, giá có sàn và trần. Cọc 30% trên mức tối thiểu (bên mua); chốt lượng gần ngày hái thì cọc tính lại.",
  [B("app", "Soạn hợp đồng đặt trước từ nghĩa vụ hai bên", o_dau="he_thong", luong=[("giay", "mua", "8–10 tấn, sàn 12.000, trần 18.000"), ("giay", "ban", "như trên")], tt="Hợp đồng chờ ký", loai=SL, nguon=["Loại hợp đồng"]),
   B("ban", "Hai bên ký", luong=[("tin", "app", "đã ký")], tt="Chờ cọc", nguon=["Hợp đồng và ký"]),
   B("mua", "Cọc 30% × 8 tấn × 15.000 = 36.000.000", o_dau="ngoai_app", luong=[("tien", "nh", "36.000.000 đ")], so={"coc_giu": 36_000_000, "gia_tri": 120_000_000}, tt="Đã cọc, chờ giao", nguon=["Loại hợp đồng"]),
   B("ban", "Cập nhật vườn 2 tuần/lần", luong=[("giay", "mua", "ảnh, ước 9 tấn")], nguon=["Loại hợp đồng"], nv="Xác minh hiện trường: một lần trước ngày hái."),
   B("app", "Gần ngày hái: đề nghị chốt 9 tấn × 15.000", o_dau="he_thong", luong=[("tin", "mua", "chốt"), ("tin", "ban", "chốt")], han="24 giờ", nguon=["Điều kiện chuyển bước"]),
   B("mua", "Bổ sung cọc chênh 4.500.000", o_dau="ngoai_app", luong=[("tien", "nh", "4.500.000 đ")], so={"coc_giu": 40_500_000, "gia_tri": 135_000_000}, nguon=["Điều kiện chuyển bước"]),
   B("ban", "Giao, nghiệm thu, chốt số", o_dau="ngoai_app", luong=[("hang", "mua", "9 tấn")], tt="Chờ thanh toán", so={"phai_tra": 135_000_000}, nguon=["Loại hợp đồng"]),
   B("mua", "Trả thẳng 94.500.000", o_dau="ngoai_app", luong=[("tien", "ban", "94.500.000 đ")], nguon=["Tiền"]),
   B("ban", "Xác nhận đã nhận", so={"tra_thang": 94_500_000}, nguon=["Tiền"]),
   B("nh", "Chuyển cọc 40.500.000", o_dau="ngan_hang", luong=[("tien", "ban", "40.500.000 đ")], so={"coc_giu": 0, "coc_chi_ban": 40_500_000}, tt="Hoàn tất", nguon=["Tiền"])],
  nguon=["Tài liệu 24/10"], vi_du={"ma": "HĐ-0102", "gia_tri": 120_000_000, "ghi": "Ví dụ giả định cùng mặt hàng; giả định nghiệm thu đủ 9 tấn đạt."}, trang_thai=TT, vai=["app", "mua", "ban", "nh"]))
T.append(TH("bao-tieu", "Bao tiêu theo vụ", "hop_dong", "Ký trước khi trồng; bên mua có thể ứng vật tư; giá sàn + thưởng; mỗi đợt nghiệm thu, người bán chốt, trả riêng.",
  [B("app", "Soạn hợp đồng vụ", o_dau="he_thong", luong=[("giay", "mua", "hợp đồng vụ"), ("giay", "ban", "hợp đồng vụ")], tt="Hợp đồng chờ ký", nguon=["Loại hợp đồng"]),
   B("mua", "Cọc vụ (bên mua), ứng vật tư", o_dau="ngoai_app", luong=[("tien", "nh", "cọc vụ"), ("hang", "ban", "vật tư")], tt="Đã cọc, chờ giao", nguon=["Loại hợp đồng"]),
   B("ban", "Ghi nhật ký sản xuất bắt buộc", luong=[("giay", "mua", "nhật ký")], nguon=["Loại hợp đồng"], nv="Xác minh hiện trường: kiểm định kỳ."),
   B("ban", "Mỗi đợt: giao, nghiệm thu, chốt số, trừ vật tư", o_dau="ngoai_app", luong=[("hang", "mua", "đợt")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("mua", "Trả từng đợt; người bán xác nhận", o_dau="ngoai_app", luong=[("tien", "ban", "tiền đợt")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("nh", "Cuối vụ: chuyển cọc vụ", o_dau="ngan_hang", luong=[("tien", "ban", "cọc vụ")], tt="Hoàn tất", nguon=["Loại hợp đồng"])],
  nguon=["Tài liệu 24/10"], vai=["app", "mua", "ban", "nh"]))
T.append(TH("khung", "Hợp đồng khung giao định kỳ", "hop_dong", "Bếp ăn đặt thanh long thứ 2 và thứ 5 từ trang trại. Bên mua giữ cọc khung; trả theo kỳ. Muốn nhận trước trả sau thì dùng trả sau qua ngân hàng.",
  [B("app", "Soạn hợp đồng khung", o_dau="he_thong", luong=[("giay", "mua", "lịch lặp"), ("giay", "ban", "lịch lặp")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("mua", "Cọc khung (bên mua)", o_dau="ngoai_app", luong=[("tien", "nh", "cọc khung")], tt="Đã cọc, chờ giao", nguon=["Đơn nhóm, hợp đồng khung"]),
   B("ban", "Giao theo lịch, bên mua xác nhận từng lần", o_dau="ngoai_app", luong=[("hang", "mua", "mỗi lần")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("app", "Đã giao chưa trả vượt cọc khung: dừng cam kết mới", o_dau="he_thong", luong=[("tin", "mua", "nộp thêm cọc hoặc trả sau qua ngân hàng")], loai=SL, nguon=["Chỉ đạo 27/10"], chi_tiet="Bỏ \"người bán cho nợ thêm\": cho nợ chỉ qua ngân hàng."),
   B("mua", "Trả cuối kỳ; người bán xác nhận", o_dau="ngoai_app", luong=[("tien", "ban", "tiền kỳ")], nguon=["Đơn nhóm, hợp đồng khung"])],
  nguon=["Tài liệu 24/10", "Chỉ đạo 27/10"], vai=["app", "mua", "ban", "nh"]))
T.append(TH("nhieu-trang-trai", "Một đơn lớn từ nhiều trang trại", "hop_dong", "Bên mua cần 20 tấn; hệ thống gợi ý 3 trang trại gần nhau. Mỗi trang trại một hợp đồng, cọc từng phần; một xe ghé từng vườn (không có điểm gom).",
  [B("mua", "Phiếu 20 tấn, \"nhận từng phần\"", luong=[("tin", "app", "phiếu")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("app", "Gợi ý 3 trang trại, soạn 3 hợp đồng", o_dau="he_thong", luong=[("giay", "ban", "phần của mình")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("mua", "Cọc 30% từng hợp đồng", o_dau="ngoai_app", luong=[("tien", "nh", "3 khoản cọc")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("nv", "Điều phối một xe ghé 3 vườn theo tuyến", o_dau="nhan_vien", luong=[("tin", "dt", "lịch ghé")], loai=SL, nguon=["Chỉ đạo 27/10"], nv="Điều phối dịch vụ."),
   B("ban", "Mỗi vườn bốc, biên bản riêng", o_dau="ngoai_app", luong=[("hang", "mua", "phần từng vườn")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("mua", "Nghiệm thu từng phần; mỗi người bán chốt số", luong=[("tin", "ban", "kết quả từng phần")], nguon=["Đơn nhóm, hợp đồng khung"]),
   B("mua", "Trả riêng; mỗi người bán xác nhận", o_dau="ngoai_app", luong=[("tien", "ban", "từng phần")], tt="Hoàn tất", nguon=["Đơn nhóm, hợp đồng khung"])],
  nguon=["Tài liệu 24/10", "Chỉ đạo 27/10"], vai=["mua", "app", "ban", "nv", "dt", "nh"]))
T.append(TH("kem-loai", "Hàng kém loại, bán gấp", "hop_dong", "Hàng loại 2, dạt, bị trả lại có người mua khác. Lô bán gấp có giá sàn; bên mua chỉ thấy \"giao được trong 48 giờ\".",
  [B("ban", "Tách lô loại 1 và loại 2, dạt", luong=[("tin", "app", "2 lô")], nguon=["Hàng kém loại"]),
   B("app", "24 giờ chưa ai hỏi: gợi ý bán gấp", o_dau="he_thong", luong=[("tin", "ban", "gợi ý")], nguon=["Hàng kém loại"]),
   B("app", "Báo bên mua nhận hàng kém loại", o_dau="he_thong", luong=[("tin", "mua", "lô khớp")], nguon=["Hàng kém loại"]),
   B("dt", "Hoặc: kho lạnh, sấy, cấp đông", o_dau="ngoai_app", nguon=["Hàng kém loại"])],
  nguon=["Tài liệu 24/10"], vai=["ban", "app", "mua", "dt"]))

T.append(TH("dang-ky", "Đăng ký người bán: xác minh và phân hạng", "dich_vu", "Cửa 1: tài khoản bán chỉ mở sau khi nhân viên xác minh tại chỗ. Hạng tính theo giấy tờ, nhật ký; bên mua thấy hạng và phần đã kiểm / tự khai.",
  [B("ban", "Đăng ký: số điện thoại, căn cước, loại tổ chức", luong=[("giay", "app", "hồ sơ")], nguon=["Đăng ký, hồ sơ"]),
   B("app", "Tạo việc xác minh tại chỗ", o_dau="he_thong", luong=[("tin", "nv", "lịch hẹn")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Đến nơi sản xuất: người, diện tích, mặt hàng, giấy tờ", o_dau="nhan_vien", luong=[("giay", "app", "biên bản")], han="giả định trong 3 ngày", loai=SL, nguon=["Chỉ đạo 27/10", "Phỏng vấn"], nv="Xác minh hiện trường."),
   B("app", "Mở tài khoản bán, xếp hạng ban đầu", o_dau="he_thong", luong=[("tin", "ban", "hạng + mặt hàng được bán")], loai=SL, nguon=["Chỉ đạo 27/10"],
     chi_tiet="Ví dụ hạng: Đã xác minh (người, nơi sản xuất) → Có hồ sơ (VietGAP, mã vùng trồng) → Nhật ký đều → Giao dịch tốt. Tên, tiêu chí chờ chốt."),
   B("ban", "Ghi nhật ký sản xuất để lên hạng", luong=[("giay", "app", "nhật ký")], loai=PV, nguon=["Phỏng vấn"]),
   B("mua", "Xem hạng, phần đã kiểm / tự khai", loai=PV, nguon=["Phỏng vấn"])],
  nguon=["Chỉ đạo 27/10", "Phỏng vấn"], vai=["ban", "app", "nv", "mua"], loai=SL))
T.append(TH("sau-don", "Sau đơn đầu: AgiViet còn làm gì", "dich_vu", "Đơn hoàn tất hợp lệ thì hệ thống gợi ý gói và dịch vụ tiếp theo theo doanh nghiệp.",
  [B("app", "Gợi ý hợp đồng khung với người bán đã giao tốt", o_dau="he_thong", luong=[("tin", "mua", "gợi ý")], loai=PV, nguon=["Phỏng vấn"]),
   B("app", "Báo thiếu hàng sớm, nguồn thay thế cùng hạng", o_dau="he_thong", luong=[("tin", "mua", "2 nguồn")], loai=PV, nguon=["Phỏng vấn"]),
   B("app", "Báo cáo nhà cung cấp, xuất Excel", o_dau="he_thong", luong=[("giay", "mua", "báo cáo")], loai=PV, nguon=["Phỏng vấn"]),
   B("qt", "Đặt gói, mức phí riêng cho doanh nghiệp", o_dau="nhan_vien", luong=[("tin", "mua", "đề xuất gói")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("mua", "Chọn gói hoặc dùng theo từng đơn", luong=[("tin", "app", "chọn")], loai=MT, nguon=["Chỉ đạo 27/10"])],
  nguon=["Phỏng vấn", "Chỉ đạo 27/10"], vai=["app", "mua", "qt"], loai=PV))
T.append(TH("ngoai-gio", "21:30 xe hỏng giữa đường: hệ thống và trợ lý AI", "dich_vu", "Nhân viên hỗ trợ đã nghỉ. Trợ lý AI tiếp nhận, việc khẩn gọi nhân viên trực; AI không quyết tiền hay tranh chấp.",
  [B("dt", "Tài xế báo xe hỏng, hàng tươi", o_dau="ngoai_app", luong=[("tin", "app", "ảnh, vị trí")], moc="21:30", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Trợ lý AI ghi nhận, báo hai bên", o_dau="ai", luong=[("tin", "mua", "báo trễ"), ("tin", "ban", "báo trễ")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Khẩn: gọi nhân viên trực", o_dau="ai", luong=[("tin", "nv", "việc khẩn")], moc="21:35", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Nhân viên trực điều xe thay", o_dau="nhan_vien", luong=[("tin", "dt", "xe thay")], moc="22:30", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Nhân viên trực."),
   B("app", "Hạn nghiệm thu tính theo giờ xe thực tới", o_dau="he_thong", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Ca sáng: rà việc AI tạo, ghi hồ sơ đòi nhà xe", o_dau="nhan_vien", moc="7:00", loai=SL, nguon=["Chỉ đạo 27/10"], nv="Hỗ trợ + điều phối.")],
  nguon=["Chỉ đạo 27/10"], vai=["dt", "app", "nv", "mua", "ban"], loai=SL))
T.append(TH("quan-tri", "Quản trị đặt chính sách, duyệt vượt ngưỡng", "dich_vu", "Quản trị không làm việc hằng ngày: phí riêng doanh nghiệp, mẫu điều khoản vi phạm, ngưỡng duyệt; duyệt lệnh tiền lớn; xem nhật ký kiểm toán.",
  [B("qt", "Đặt mức phí riêng cho Công ty Phương Nam", o_dau="nhan_vien", luong=[("tin", "app", "mức phí")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("qt", "Đặt bảng mẫu xử lý cọc khi vi phạm", o_dau="nhan_vien", luong=[("tin", "app", "mẫu điều khoản")], loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("nv", "Đề xuất lệnh hoàn cọc " + tien(COC) + " (vượt ngưỡng)", o_dau="nhan_vien", luong=[("tin", "qt", "chờ duyệt")], loai=SL, nguon=["Chỉ đạo 27/10"], nv="Đối soát tài chính."),
   B("qt", "Duyệt lệnh", o_dau="nhan_vien", luong=[("giay", "app", "đã duyệt")], han="24 giờ", loai=SL, nguon=["Chỉ đạo 27/10"]),
   B("app", "Gửi lệnh ngân hàng, ghi nhật ký kiểm toán", o_dau="he_thong", luong=[("giay", "nh", "lệnh")], loai=SL, nguon=["Chỉ đạo 27/10"])],
  nguon=["Chỉ đạo 27/10"], vai=["qt", "nv", "app", "nh"], loai=SL))

D = {
 "phien_ban": "3 · 27/10/2026",
 "nguon_chinh": "Nền: tài liệu tổng hợp ~/Documents/AgiViet (24/10/2026). Bản 3 làm lại theo chỉ đạo người sáng lập 27/10 và sửa lỗi tiền Codex rà bản 2. Thời gian và giá dịch vụ trong ví dụ là giả định, cần thay bằng số thật.",
 "ten_nhom": {"thuan": "Đơn chính và cách trả", "nhanh": "Vi phạm, sự cố", "hop_dong": "Loại hợp đồng", "dich_vu": "Đăng ký, dịch vụ, vận hành"},
 "trang_thai_don": TT, "vai": VAI, "dong_chay": DONG_CHAY, "tinh_huong": T,
 "dich_vu": {"mo_ta": "AgiViet là bên trung gian trung lập: không mua bán thay, không giữ hàng, không cho vay. Dịch vụ của đối tác trả thẳng đối tác, không qua tài khoản cọc.", "ds": DICH_VU},
 "van_hanh": VAN_HANH, "he_thong": HE_THONG,
 "han_gio": [["Điền phiếu nghĩa vụ", "24 giờ", "Nhắc, rồi đơn tự rút"], ["Ký hợp đồng", "24 giờ", "Đơn tự rút"], ["Chuyển cọc", "48 giờ (tươi 12 giờ)", "Đơn đóng, lượng về lô"],
   ["Nghiệm thu giao xa", "2 giờ từ lúc kho ký nhận", "Coi như đạt theo điều khoản"], ["Người bán chốt số cân", "24 giờ", "Nhắc, rồi hòa giải; cọc giữ"],
   ["Trả phần còn lại", "Theo hợp đồng", "Người bán báo chưa nhận; 48 giờ gửi chứng từ; không có thì cọc trừ vào tiền hàng, ghi công nợ"],
   ["Đề nghị thay đổi", "24 giờ", "Coi như không đồng ý"], ["Phiếu bồi hoàn chi phí dịch vụ", "7 ngày (đề xuất)", "Trừ hạng, khóa đơn mới, cấp hồ sơ"]],
 "can_chot": CAN_CHOT,
}
assert len({t["id"] for t in T}) == len(T)
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quy-trinh.json")
json.dump(D, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok", len(T), "tình huống,", sum(len(t["buoc"]) for t in T), "bước")
