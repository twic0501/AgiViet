# Giao việc: dịch vụ đi kèm của chuỗi cung ứng + cách quản lý danh mục mở đa dạng (Codex gpt-6.1-sol)

Chuyên gia chuỗi cung ứng và sàn B2B. Tiếng Việt có dấu, không emoji. Có mạng: nguồn thật, link + ngày truy cập; tách **sự thật có nguồn** với **suy luận/đề xuất**; không chắc ghi "chưa kiểm được".

## Bối cảnh
Đọc `docs/nghiep-vu/00-tong-quan.md`, `01-mat-hang.md`, `11-mo-hinh-kinh-doanh.md`, và `docs/quy-trinh/index.html` (mục 8 dịch vụ sau tất toán). Người sáng lập lo hai điều:
1. Không biết các bên chuỗi cung ứng/phân phối hiện **cung cấp dịch vụ gì kèm theo** cho từng ngành hàng (để AgiViet biết mình phải có dịch vụ gì).
2. Người bán đa dạng, không kiểm soát được: một hộ có thể bán điều tươi, vừa rang muối, vừa đóng hộp xuất khẩu; khô cá, hải sản khô cho quán nhậu và xuất khẩu; bên mua cần nhiều mặt hàng. AgiViet không thể biết trước mọi mặt hàng và quy trình.

Hướng thiết kế tạm (cần kiểm chứng bằng case): mô tả hàng theo 3 lớp mặt hàng × dạng hàng (tươi/sơ chế/khô/chế biến đóng gói) × quy cách; quy trình gắn theo họ đặc tính (dễ hư, tươi vừa, khô, chế biến đóng gói, xuất khẩu); hai mức hỗ trợ (ngành hàng hỗ trợ đầy đủ / ngành hàng mở có nhân viên duyệt); ghi nhận nhu cầu chưa đáp ứng để mở rộng danh mục theo dữ liệu; giai đoạn đầu chỉ hàng thô + sơ chế đơn giản.

## Việc cần làm
1. **Dịch vụ đi kèm hiện có trên thị trường**: liệt kê theo ngành hàng (rau quả tươi, trái cây xuất khẩu, lúa gạo, điều và nông sản khô, thủy sản tươi, thủy hải sản khô) các dịch vụ mà thương lái, vựa, đầu mối, nhà phân phối, đơn vị logistics/kho lạnh, công ty xuất khẩu, sàn B2B (VN và nước ngoài) đang cung cấp: gom hàng, phân loại, sơ chế, đóng gói, kho, chuỗi lạnh, vận chuyển theo khung giờ, ứng vốn/trả trước, công nợ, kiểm nghiệm, hồ sơ xuất khẩu, truy xuất, bao tiêu, cho thuê thiết bị, đào tạo kỹ thuật, bảo hiểm, xử lý hàng trả lại. Ai làm, thu phí thế nào (nếu có nguồn). Kết luận: dịch vụ nào AgiViet **tự làm**, **qua đối tác**, **không làm**, ở giai đoạn đầu.
2. **Quản lý danh mục mở**: các sàn/chuẩn thực tế làm thế nào (ví dụ Tridge, Alibaba/1688 nông sản, IndiaMART, Ninjacart, chuẩn GS1 GPC, mã HS, UNSPSC, danh mục sản phẩm của Bộ Nông nghiệp/ Tổng cục Thống kê VN — tự kiểm): cấu trúc thuộc tính theo họ hàng, đồng nghĩa và tên địa phương, mẫu quy cách, cách xử lý mặt hàng mới chưa có mẫu, kiểm duyệt. Đề xuất **mô hình dữ liệu danh mục** cho AgiViet (bảng họ đặc tính → mẫu thuộc tính → quy trình mặc định; mặt hàng; dạng hàng; quy cách; tên đồng nghĩa) và **quy trình mở rộng danh mục** dựa trên nhu cầu chưa đáp ứng.
3. **Hàng sơ chế/chế biến**: điều kiện pháp lý VN để bán (giấy chứng nhận cơ sở đủ điều kiện ATTP hoặc cam kết, tự công bố sản phẩm, nhãn hàng hóa, hạn dùng; khác biệt hộ kinh doanh vs doanh nghiệp; xuất khẩu cần gì thêm) — ghi rõ văn bản và mức chắc chắn, khuyến nghị kiểm lại với luật sư. Đề xuất ranh giới giai đoạn đầu.
4. **Ghép khi bên mua cần nhiều mặt hàng**: đơn giỏ, đầu mối gom, cách phân trách nhiệm; case thực tế.

## Đầu ra
`docs/nghien-cuu/05-dich-vu-di-kem-chuoi-cung-ung.md`, `docs/nghien-cuu/06-danh-muc-mo-va-hang-che-bien.md`. Chỉ ghi `05-*`, `06-*` trong `docs/nghien-cuu/` (các Codex khác đang ghi 01–04, không đụng). Không chờ vòng lặp. Xong in tóm tắt 10 dòng rồi dừng.


## Làm tiếp
Lượt trước bị ngắt (hết hạn mức). Đọc các tệp đầu ra đã có trong `docs/nghien-cuu/` (nếu có) và `docs/nghien-cuu/ghi-chu/`, làm tiếp phần còn thiếu, không làm lại.
