# Giao việc: xác định lại mặt hàng triển khai ban đầu theo đặc thù vận hành (Codex gpt-6.1-sol)

Chuyên gia chuỗi cung ứng nông sản, thủy sản Việt Nam. Tiếng Việt có dấu, không emoji. Có mạng: tra nguồn thật (báo chính thống VN, báo cáo FAO/World Bank/IFC, case doanh nghiệp), ghi link + ngày truy cập; tách **sự thật có nguồn** với **suy luận/đề xuất**; không chắc ghi "chưa kiểm được".

## Bối cảnh
Đọc `docs/nghiep-vu/01-mat-hang.md`, `02-phan-khuc-ben-mua.md`, `00-tong-quan.md`. Danh mục MVP hiện tại: tầng 1 xoài cát Chu, chanh không hạt, tôm thẻ, lúa tươi; tầng 2 sầu riêng, bưởi da xanh; tầng 3 thanh long, cá tra. Phạm vi người sáng lập muốn: mọi hàng thô nông sản + thủy hải sản, không gỗ, hạn chế thịt công nghiệp.

Phỏng vấn một doanh nghiệp thu mua thực phẩm cho thấy mỗi ngành hàng có vận hành riêng: HORECA lấy trái cây từ đơn vị chuyên trái cây; **rau tươi phải có quy trình thu mua, sơ chế, bảo quản, giao đặc thù, giờ xử lý và giao từ giữa đêm tới sáng sớm** để kịp bán lẻ buổi sáng và nấu ăn; chất lượng không đều, nguồn cung theo mùa vụ, thời tiết, khâu bảo quản và vận chuyển chưa đạt. Nhà máy chế biến không mua lô nhỏ lẻ; cần vùng nguyên liệu, hợp đồng dài hạn, bao tiêu.

## Việc cần làm
1. **Ma trận vận hành theo ngành hàng** (ít nhất: rau ăn lá, rau củ, trái cây tiêu thụ nội địa, trái cây xuất khẩu như sầu riêng/thanh long/xoài, lúa gạo, tôm, cá tra, thủy sản sống/hải sản cho nhà hàng): thời gian sống sau thu hoạch, khung giờ thu hoạch–sơ chế–giao, chuỗi lạnh, quy cách và phân loại, kiểm nghiệm/hồ sơ bắt buộc, lô tối thiểu theo từng loại bên mua, ai thường gom (thương lái, vựa, HTX, đầu mối), kiểu thanh toán phổ biến, rủi ro chính.
2. **Case thực tế** (Việt Nam trước, rồi nước ngoài) giải quyết đúng các đặc thù đó: ví dụ HTX/đơn vị cung ứng rau cho bếp ăn, siêu thị giao đêm; đầu mối HORECA; vựa trái cây; mô hình cold chain, sơ chế tập trung, kho đầu mối; nền tảng nước ngoài làm rau quả cho nhà hàng (Ninjacart, Frubana, Twiga, Kasikorn/ Freshket Thái Lan, Sayurbox Indonesia, Pinduoduo nông sản, v.v. — tự kiểm, bỏ cái sai). Mỗi case: làm gì, giờ giấc, ai gom và giao, chi phí/biên lợi nhuận nếu có nguồn, bài học và thất bại.
3. **Đề xuất lại mặt hàng triển khai ban đầu** cho AgiViet: chấm điểm từng mặt hàng theo (a) có người mua đặt lặp lại, (b) nguồn cung tập trung ở vùng thử (Đồng Tháp/ĐBSCL), (c) quy cách dễ thống nhất, (d) giao nhận nằm trong khả năng kiểm soát khi chưa có kho/xe riêng, (e) giá trị đơn đủ bù chi phí xác minh và vận hành, (f) rủi ro. Kết luận 2–4 mặt hàng thí điểm + loại bên mua đi kèm, và mặt hàng nên hoãn (ví dụ rau giao đêm cho HORECA nếu cần đầu mối gom). Giữ nguyên tắc minh họa không chỉ xoài: phải trộn nhiều loại.
4. **Quy trình và dịch vụ cần thêm theo ngành hàng** cho hệ thống: ví dụ khung giờ giao đêm, đơn giỏ nhiều mặt hàng qua đầu mối gom, chuỗi lạnh, kiểm nghiệm bắt buộc, lô gộp HTX, hợp đồng bao tiêu theo vụ cho nhà máy; vai trò nhân viên AgiViet và đối tác ở từng ngành. Chia ưu tiên **trước cuộc thi** / **sau cuộc thi**. Chỉ đề xuất, không sửa mã hay đặc tả.

## Đầu ra
`docs/nghien-cuu/03-mat-hang-va-van-hanh.md` (ma trận, case, chấm điểm, kết luận) và `docs/nghien-cuu/04-de-xuat-theo-nganh-hang.md`. Chỉ ghi trong `docs/nghien-cuu/03-*` và `04-*` (một Codex khác đang ghi `01`, `02` cùng thư mục — không đụng). Không chờ vòng lặp. Xong in tóm tắt 10 dòng rồi dừng.
