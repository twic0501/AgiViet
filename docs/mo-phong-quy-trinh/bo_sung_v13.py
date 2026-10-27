# BẢN 13 (28/10/2026), chạy SAU bo_sung_v12.py. Theo rà bản 12: hai bên xác nhận phạm vi theo sát mới; chọn đề nghị
# chưa là đã bán (B bỏ cuộc thì giải phóng lượng giữ, hỏi lại A nếu còn hiệu lực); tách lượng có đề nghị / chưa bán.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import v6_chung as C
from v6_chung import D, TH, B, tim, them
C.NG[:] = ["Góp ý 28/10 (rà bản 12)"]

# 1. Hai bên xác nhận phạm vi mới
t = TH["theo-sat-thieu-nguoi"]
k = tim("theo-sat-thieu-nguoi", "Chọn theo sát từ xa")
t["buoc"][k:k + 1] = [B("mua", "Bên mua chọn theo sát từ xa", luong=[("tin", "app", "đồng ý")]),
                      B("ban", "Hai bên xác nhận phạm vi mới trước khi ký", luong=[("tin", "app", "người bán đồng ý")],
                        chi_tiet="Bỏ người hiện trường ảnh hưởng việc cân, lấy mẫu, bàn giao của người bán nên người bán cũng phải chấp thuận. Một bên không đồng ý: giữ phạm vi cũ và đổi ngày, hoặc không nhận theo sát.")]

# 2. Chọn đề nghị chưa là đã bán
t = TH["nhieu-de-nghi"]
k = tim("nhieu-de-nghi", "Báo A không được chọn")
t["buoc"][k]["chi_tiet"] = "Đề nghị A có hạn hiệu lực riêng (ví dụ 48 giờ); app không giữ A chờ, không hứa với A."
k = tim("nhieu-de-nghi", "Sang luồng hợp đồng")
t["buoc"][k]["viec"] = "Giữ 4 tấn cho B trong hạn ký và cọc; báo người bán: chọn chưa là đã bán"
t["buoc"][k]["chi_tiet"] = "Lượng giữ có hạn (ký 24 giờ, cọc theo hợp đồng). B ký và cọc đúng hạn: sang nhánh \"Bên mua đến lấy tại vườn\"."
them("de-nghi-bo-cuoc", "Đã chọn B nhưng B không ký, không cọc", "tim_dau_ra",
  "Tiếp nhánh nhiều đề nghị: B quá hạn. Giải phóng đúng lượng đang giữ, mở tìm lại; hỏi lại A chỉ khi đề nghị A còn hiệu lực.",
  [B("app", "Giữ 4 tấn cho B, hạn ký 24 giờ", o_dau="he_thong", luong=[("tin", "ban", "đang giữ cho B")]),
   B("app", "Quá hạn, B không ký: hủy giữ, ghi uy tín B", o_dau="he_thong", luong=[("tin", "mua", "hết hạn")], chi_tiet="Không cọc nên không có tiền phải xử lý; ghi lý do vào uy tín B."),
   B("app", "Báo người bán: 4 tấn đã mở lại", o_dau="he_thong", luong=[("tin", "ban", "mở lại, còn bao lâu bán được")]),
   B("app", "A còn hiệu lực: hỏi A có còn mua không", o_dau="he_thong", luong=[("tin", "mua", "hỏi lại A")], chi_tiet="A hết hiệu lực thì không hỏi; mở tìm lại như lô mới, ghi ưu tiên vì thời gian đã mất."),
   B("mua", "A xác nhận còn mua theo đề nghị cũ", luong=[("tin", "app", "còn mua")]),
   B("ban", "Người bán chọn A (hoặc chờ đề nghị mới)", luong=[("tin", "app", "chọn A")], chi_tiet="Sang luồng hợp đồng như thường; lượng giữ cho A có hạn riêng.")],
  vi_du={}, tt=[], vai=["app", "ban", "mua"], sau="nhieu-de-nghi")

# 3. Tách lượng
t = TH["khong-co-dau-ra"]
t["mo_ta"] += " Lượng chưa ràng buộc thì người bán được bán nơi khác bất cứ lúc nào, không phải chờ AgiViet."
t["buoc"][0]["chi_tiet"] = "Không độc quyền: lượng chưa có cam kết người bán được bán nơi khác ngay, chỉ cần cập nhật lượng còn lại."
k = tim("khong-co-dau-ra", "Nơi chế biến nhận 2 tấn")
t["buoc"][k].update(viec="Nơi chế biến gửi đề nghị 2 tấn loại 2; giữ 2 tấn trong hạn thương lượng",
                    chi_tiet="Có đề nghị chưa là đã bán: 2 tấn giữ theo hạn thương lượng, rồi hạn ký và cọc riêng. 4 tấn còn lại không bị khóa.")
k = tim("khong-co-dau-ra", "Không có phương án khả thi")
t["buoc"][k].update(viec="4 tấn loại 1: báo người bán chọn dừng tìm hay tìm tiếp",
                    chi_tiet="Chỉ áp cho 4 tấn chưa có đầu ra; không gỡ 2 tấn đang thương lượng. Báo khi người bán còn 3 ngày; ghi lý do (thiếu nhu cầu vùng, quy cách) để cải thiện ghép.")
t["buoc"][k + 1:] = [
  B("ban", "Chọn dừng tìm 4 tấn, tự bán nơi khác", luong=[("tin", "app", "dừng 4 tấn")]),
  B("app", "Lô còn: 2 tấn đang thương lượng; 4 tấn đã rút", o_dau="he_thong", luong=[("tin", "ban", "lượng từng phần")],
    chi_tiet="2 tấn: ký và cọc đúng hạn thì sang hợp đồng; quá hạn thì cũng tự mở lại cho người bán.")]

D["phien_ban"] = "13 · 28/10/2026"
D["nguon_chinh"] += " Bản 13: hai bên xác nhận phạm vi theo sát mới; chọn đề nghị chưa là đã bán, B bỏ cuộc; tách lượng có đề nghị / chưa bán."
for t in D["tinh_huong"]: t["ma_chot"] = [c["ma"] for c in D["can_chot"] if t["id"] in c.get("tinh_huong", [])]
C.luu("13")
