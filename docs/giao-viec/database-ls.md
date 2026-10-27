# Giao việc: sửa lược đồ theo các chỗ lệch LS-1…LS-4 (Codex gpt-6.1-sol)

Bạn là kiến trúc sư cơ sở dữ liệu của AgiViet production v2. Lược đồ ở `db/` (20 migrations, PGlite, `db/README.md`) do chính mảng này làm trước đó. Đặc tả nghiệp vụ vừa chốt mục 7b "Lệch giữa đặc tả và lược đồ CSDL" trong `docs/nghiep-vu/00-tong-quan.md`. Đọc mục đó và `docs/database/07-danh-gia-thanh-that.md`.

## Làm tiếp, không làm lại
Lượt trước bị ngắt vì hết hạn mức sau khi đã viết `0021_quyet_toan_phien_ban.sql`, `0022_chu_ky_quyet_dinh_van_hanh.sql`, `0023_nguon_gia_tinh_coc.sql` và đang viết bài kiểm thử LS-1. Đọc các tệp đó, chạy thử, sửa nếu lỗi, rồi làm phần còn thiếu (đặc biệt LS-2, chạy lại toàn bộ kiểm thử, cập nhật tài liệu).

## Việc cần làm
1. LS-1: quyết toán có phiên bản. Đổi ràng buộc "mỗi đơn một quyết toán cuối" thành duy nhất theo (đơn, số phiên bản) và chỉ một phiên bản hiệu lực tại một thời điểm. Lệnh ngân hàng đã gửi giữ nguyên; phần chênh giữa phiên bản cũ và mới thành nghĩa vụ điều chỉnh (có bút toán trong sổ cái kép, không sửa bút toán cũ).
2. LS-2: dữ liệu nền không được tạo tiền giả. Bao tiêu BT-2005 chưa có cọc vụ; tiền điều kiện của TH-055 phải tạo qua quy trình thật (ký → ngân hàng mô phỏng xác nhận cọc vụ → chốt đợt 1). Thêm một bài kiểm thử chạy chuỗi này. Số dư đầu kỳ của hợp đồng khung KH-2003 được giữ vì có nhãn nhập khẩu.
3. LS-3: thêm kiểu chữ ký "quyết định vận hành" (hai người khác nhau: đề xuất và duyệt), chỉ hợp lệ cho phụ lục giảm lượng do bất khả kháng khi bên mua im lặng (TH-040 nhánh b). Chặn ở DB các trường hợp khác.
4. LS-4: giá tham khảo từ nguồn ngoài không được dùng để tính cọc. Kiểm tra lược đồ và view giá tham khảo đã đúng luật này chưa; nếu chưa thì sửa.

5. Lỗ hổng bảo mật do kỹ sư bảo mật tìm thấy trong lược đồ: đọc `docs/bao-mat/06-loi-tim-thay-trong-thiet-ke.md` (các mục D-01…D-19) và sửa theo đề xuất ở đó, ưu tiên mức cao: D-01 (vai DB: tạo vai app hạn chế, hàm lệnh ghi SECURITY DEFINER, không để backend chạy bằng owner; không tin `app.actor_kind` do phiên tự đặt), D-03 (giao dịch sổ cái chỉ chạm cọc của chính đơn và chi đúng tổ chức của đơn), D-04 (điều chỉnh sổ cái thủ công phải có người duyệt khác người lập), D-09 (webhook chữ ký sai không được ở trạng thái đã áp dụng; thêm dấu đã tra lại API), D-14 (người giúp không được kiêm vai chủ cùng hộ), D-15 (bảng OTP thật, chữ ký phải tham chiếu OTP hợp lệ chưa dùng, gắn số tiền và phiên bản). Sau đó các mục trung bình/thấp (D-07, D-08, D-10, D-11, D-17, D-18, D-19). Kiểm chứng: chạy `node security/tests/db/kiem-tra-db.mjs --chi-tiet` (chỉ đọc/chạy, không sửa thư mục `security/`); mỗi mục sửa xong phải chuyển từ "LỖ HỔNG" sang "CHẶN" và các ca hợp lệ vẫn qua. Báo số chặn/tổng trước và sau.

## Yêu cầu
- Viết migration mới (không sửa migration cũ đã chạy), cập nhật seed nếu cần, thêm bài kiểm thử trong `db/tests/`, chạy lại toàn bộ trên PGlite, mọi kiểm tra phải đạt.
- Cập nhật `docs/database/` (phần liên quan và `07-danh-gia-thanh-that.md`).
- Chỉ ghi vào `db/` và `docs/database/`. Không chờ vòng lặp. Xong thì in tóm tắt (migration mới, số kiểm tra đạt/tổng, phần chưa làm được) rồi dừng.
