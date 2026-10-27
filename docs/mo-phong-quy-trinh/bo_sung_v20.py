# BẢN 20 (28/10/2026), chạy SAU bo_sung_v19.py. Theo rà bản 19: phương án dự phòng chỉ trong ủy quyền đã duyệt
# ("chờ xác nhận" = chờ đối soát chi phí thực tế); dừng định kỳ ghi đủ số bảo đảm.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, sua, tim
C.NG[:] = ["Góp ý 28/10 (rà bản 19)"]

sua("khong-con-doi-tac", "Chưa ai duyệt: giữ hàng tại chỗ",
    chi_tiet="Thanh long giữ bóng mát tối đa 12 giờ (thông số minh họa, xác nhận theo hàng thực tế trước pilot). Người bán kiểm tình trạng mỗi 3 giờ, gửi ảnh. Hạn quyết định của hai bên: 6 giờ trước khi hết thời gian giữ. "
             "Hết hạn mà chưa có phương án được duyệt: chỉ thực hiện phương án đã được ủy quyền trước trong hợp đồng (ví dụ giao một phần bằng xe nhỏ), trong phạm vi và mức chi tối đa đã duyệt. "
             "\"Chờ xác nhận\" là chờ đối soát chi phí thực tế, không phải tạo chi phí rồi xin duyệt sau; vượt giới hạn phải xin người có quyền chấp thuận. Mặt hàng không giữ được tại chỗ thì không dùng phương án này.")

# Dừng định kỳ: số bảo đảm (giả định)
t = TH["dung-dinh-ky"]
t["mo_ta"] = ("Bên mua báo dừng từ tuần sau. Bảo đảm ban đầu 100.000.000 (tiền nộp ngân hàng giữ). Đang phân bổ: nợ A chưa đến hạn 30.000.000 + chuyến đã chốt 40.000.000 = 70.000.000; "
              "phần chưa phân bổ 30.000.000. Dừng lịch không xóa nghĩa vụ cũ.")
sua("dung-dinh-ky", "Hàng đã chuẩn bị cho chuyến bị hủy", viec="C báo chi phí hàng đã chuẩn bị 1.500.000 có chứng cứ; bên mua xác nhận",
    chi_tiet="Theo điều khoản thay đổi sau hạn chốt (Q26). Đây là nghĩa vụ mới của bên mua với C.")
sua("dung-dinh-ky", "Trả hết nợ còn lại theo từng hạn", viec="Bên mua trả A 30.000.000 và chuyến cuối 40.000.000 đúng hạn; chưa trả C 1.500.000 quá hạn",
    chi_tiet="Trả xong khoản nào thì phần bảo đảm phân bổ cho khoản đó được giải phóng: 70.000.000.")
k = tim("dung-dinh-ky", "Đối chiếu phần bảo đảm được hoàn")
t["buoc"][k]["viec"] = "Đối chiếu: 100.000.000 − chi C 1.500.000 (khoản quá hạn, lệnh ngoại lệ có duyệt) = hoàn 98.500.000"
t["buoc"][k]["chi_tiet"] = "Bảo đảm ban đầu 100.000.000 = đã giải phóng sau khi trả 70.000.000 + chưa phân bổ 30.000.000. Còn nghĩa vụ: C 1.500.000 quá hạn → chi từ bảo đảm (người duyệt khác người đề xuất). Thực hoàn: 98.500.000. Kiểm: 1.500.000 + 98.500.000 = 100.000.000."
k = tim("dung-dinh-ky", "Ngân hàng thực hiện")
t["buoc"][k]["luong"] = [{"loai": "tien", "den": "ban", "nhan": "1.500.000 đ → C"}, {"loai": "tien", "den": "mua", "nhan": "98.500.000 đ"}]

D["phien_ban"] = "20 · 28/10/2026"
D["nguon_chinh"] += " Bản 20: phương án dự phòng chỉ trong ủy quyền đã duyệt; dừng định kỳ ghi đủ số bảo đảm (100 = 1,5 chi C + 98,5 hoàn)."
C.luu("20")
