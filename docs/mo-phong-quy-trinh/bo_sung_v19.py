# BẢN 19 (28/10/2026), chạy SAU bo_sung_v18.py. Theo rà bản 18: mẫu lưu đạt chưa tự đóng cảnh báo; mất niêm có quy tắc phí
# riêng; giữ hàng tại chỗ có giới hạn; hoàn bảo đảm qua ngân hàng.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim, sua
C.NG[:] = ["Góp ý 28/10 (rà bản 18)"]

# 1. Phát hiện sau xuất: tách "chưa chứng minh người bán sai" và "đủ căn cứ đóng cảnh báo"
t = TH["phat-hien-sau-xuat"]
k = tim("phat-hien-sau-xuat", "Mở hồ sơ xử lý theo kết quả mẫu lưu")
t["buoc"][k:] = [
  B("app", "Mẫu lưu đạt: chưa chứng minh người bán sai; chưa tự đóng cảnh báo", o_dau="he_thong",
    chi_tiet="Mẫu lưu không đạt: theo nhánh dư lượng không đạt cho phần còn kiểm được."),
  B("nv", "Đối chiếu chứng cứ khác (thông báo cơ quan, kết quả của khách bên mua)", o_dau="nhan_vien",
    chi_tiet="Cùng lô? Cùng chỉ tiêu, phương pháp? Chuỗi bảo quản sau giao ra sao? Chứng cứ không đúng lô hoặc hàng đã bảo quản sai sau giao: không quy cho người bán."),
  B("qt", "Kết luận có căn cứ: đóng cảnh báo, hoặc mở tranh chấp có kiểm trọng tài", o_dau="nhan_vien", luong=[("tin", "mua", "kết luận + căn cứ"), ("tin", "ban", "kết luận + căn cứ")],
    chi_tiet="Hai bên được xem lại trong 7 ngày. Người kết luận khác người đối chiếu.")]

# 2. Mất niêm: quy tắc phí riêng
sua("mau-hong", "Theo luồng đạt; phí gửi lại", viec="Theo luồng đạt; chi phí khắc phục mẫu theo quy tắc sự cố mẫu",
    chi_tiet="Mất niêm là mẫu không hợp lệ, khác \"kết quả trái nhau\". Bên đặt dịch vụ gửi mẫu ứng trước chi phí lấy/gửi lại. Xác minh: biên bản giao nhận mẫu, ảnh niêm từng chặng. "
             "Đối tác vận chuyển mẫu làm mất: đối tác chịu. Chưa xác định được: khoản phí để \"chờ xử lý\" trong hồ sơ phí, không tự chuyển sang quy tắc khác; quyết theo thỏa thuận sự cố mẫu (chờ chốt).")
D["he_thong"]["quy_tac"].append(["Sự cố mẫu", "Mẫu mất niêm, hỏng, thất lạc: mẫu không hợp lệ. Bên đặt gửi mẫu ứng chi phí khắc phục; trách nhiệm xác minh theo biên bản từng chặng; chưa rõ thì để chờ xử lý. Không áp quy tắc \"kết quả trái nhau\"."])

# 3. Giữ hàng tại chỗ có giới hạn
sua("khong-con-doi-tac", "Chưa ai duyệt trước hạn", viec="Chưa ai duyệt: giữ hàng tại chỗ trong giới hạn của mặt hàng",
    chi_tiet="Thanh long giữ bóng mát tối đa 12 giờ (giả định, theo bảng mặt hàng). Người bán kiểm tình trạng hàng mỗi 3 giờ, gửi ảnh. Hạn quyết định của hai bên: 6 giờ trước khi hết thời gian giữ. "
             "Hết hạn mà chưa có phương án được duyệt: nhân viên báo trưởng ca; thực hiện phương án ít thiệt hại nhất đã ghi sẵn trong hợp đồng (ví dụ giao một phần bằng xe nhỏ), chi phí ghi \"chờ xác nhận\". Mặt hàng không giữ được tại chỗ thì không dùng phương án này.")
D["he_thong"]["quy_tac"].append(["Giữ hàng khi chờ quyết định", "Mỗi mặt hàng có điều kiện và thời gian giữ tối đa. Có người kiểm tình trạng, hạn quyết định, và phương án mặc định ghi trong hợp đồng khi hết hạn; không để hàng hỏng chỉ vì chưa ai duyệt chi phí."])

# 4. Hoàn bảo đảm qua ngân hàng
t = TH["dung-dinh-ky"]
k = tim("dung-dinh-ky", "Hoàn phần bảo đảm chưa dùng")
t["buoc"][k:] = [
  B("app", "Đối chiếu phần bảo đảm được hoàn (ví dụ 30.000.000 còn lại sau khi trừ phần đã phân bổ)", o_dau="he_thong"),
  B("app", "Gửi lệnh hợp lệ cho ngân hàng", o_dau="he_thong", luong=[("giay", "nh", "lệnh hoàn / giải tỏa")],
    chi_tiet="Bảo đảm là tiền đã nộp: lệnh hoàn. Là cam kết ngân hàng: lệnh giải tỏa cam kết tương ứng, không có tiền chuyển."),
  B("nh", "Ngân hàng thực hiện", o_dau="ngan_hang", luong=[("tien", "mua", "30.000.000 đ")]),
  B("app", "Nhận kết quả, đối soát; đóng nghĩa vụ hoàn", o_dau="he_thong", chi_tiet="Chưa có kết quả xác minh thì chưa đóng. Đóng thỏa thuận khi mọi nghĩa vụ đã xong.")]
t["vai_tham_gia"] = list(dict.fromkeys(t.get("vai_tham_gia", []) + ["nh"]))

D["phien_ban"] = "19 · 28/10/2026"
D["nguon_chinh"] += " Bản 19: mẫu lưu đạt chưa tự đóng cảnh báo, quy tắc sự cố mẫu, giới hạn giữ hàng tại chỗ, hoàn bảo đảm qua ngân hàng."
C.luu("19")
