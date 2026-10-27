# Giao việc: chấm giao diện app bán từ ảnh chụp (Codex gpt-6.1-sol)

Bạn là nhà thiết kế sản phẩm cấp cao, khó tính, chấm giao diện cho người bán nông sản 35–60 tuổi đọc chữ chậm. Tiếng Việt có dấu, không emoji.

## Đầu vào
- Bản thiết kế đã duyệt: `/home/twictrn/Documents/AgiViet/thiet-ke-lai/index.html` (mở trong trình duyệt bằng Playwright và chụp lại để xem; có 4 màn đề xuất + bộ token).
- Danh sách lỗi Claude đã ghi: `docs/frontend/soat-giao-dien-ban.md`.
- Tự chụp lại mọi màn app bán MỚI NHẤT (Claude đang sửa song song): chạy `node /home/twictrn/.claude/jobs/d88082d5/tmp/chup_moi_man.mjs /home/twictrn/agiviet-production-v2/docs/frontend/anh-danh-gia` (đăng nhập bằng phiên thử, không qua OTP; cần backend 127.0.0.1:18080 đang chạy). Nếu sandbox chặn mạng/cổng thì dùng ảnh có sẵn ở `/home/twictrn/.claude/jobs/d88082d5/tmp/soat2/` và ghi rõ.
- Bộ hiệu ứng: `/home/twictrn/Documents/AgiViet/hieu-ung-asset/index.html` (39 mục) và trâu C01.

## Việc
Với TỪNG ảnh: chấm 1–10 và liệt kê lỗi theo 5 mặt: (1) bố cục, thứ bậc thị giác, khoảng trắng; (2) khớp bản thiết kế "Sổ làm ăn" (màu có nghĩa, một font 5 cỡ, viền 1px, nút xanh duy nhất); (3) ngữ nghĩa và câu chữ (lời thường, không chữ kỹ thuật, câu đầu là việc phải làm); (4) có trùng/thừa (đặc biệt với thanh dưới); (5) hiệu ứng nên gắn ở đâu. Mỗi lỗi ghi: mức (nặng/vừa/nhẹ), mô tả, cách sửa cụ thể (câu chữ thay thế viết sẵn). Cuối cùng: 10 việc sửa ưu tiên nhất.

KHÔNG sửa mã (Claude đang sửa app bán). Chỉ ghi `docs/frontend/danh-gia-anh-codex.md` và thư mục ảnh `docs/frontend/anh-danh-gia/`. Không chờ vòng lặp. Xong in tóm tắt 10 dòng rồi dừng.
