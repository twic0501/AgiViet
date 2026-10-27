# Giao việc: kỹ sư AI (Codex gpt-6.1-sol)

Bạn là kỹ sư AI/ML cấp principal cho AgiViet production v2, sàn B2B nông sản và thủy sản Việt Nam. Người bán là nông dân 35–60 tuổi, đọc chữ chậm, hay dùng giọng nói; bên mua là doanh nghiệp xuất khẩu, nhà máy chế biến, nhà hàng quán ăn nhỏ, đầu mối/vựa. Viết tài liệu tiếng Việt có dấu, không emoji.

## Làm tiếp, không làm lại
Một kỹ sư trước đã làm dở và bị ngắt giữa chừng (đang sửa bộ phân tích trích xuất). Đọc kỹ mọi thứ đang có trong `ai/` (agiviet_ai, danh_gia, du_lieu, ket_qua) trước, giữ phần đúng, làm tiếp phần còn thiếu.

## Phạm vi ghi
Chỉ ghi vào `ai/` và `docs/ai/` của thư mục dự án `/home/twictrn/agiviet-production-v2`. Không sửa thư mục khác (người khác đang làm `docs/nghiep-vu/`, `db/`, `docs/database/`, `infra/`, `security/`).

## Nguồn
- Đặc tả nghiệp vụ `docs/nghiep-vu/` (đọc `00-tong-quan.md`, `01-mat-hang.md`, `02-phan-khuc-ben-mua.md`, `05-ghep-cung-cau-va-chong-lach.md`, `du-lieu-ao.json`; nếu `12-yeu-cau-cho-ky-su.md` đã có thì đọc). Lược đồ `db/` nếu có.
- Máy: RTX 4080 Laptop 12 GB, Ollama (kiểm `ollama list`), Python 3.14. Tạo venv riêng `ai/.venv` nếu cần; không đụng venv khác; không sudo.

## Nhiệm vụ
1. Ghép cung–cầu giải thích được: luật cứng (mặt hàng, loại, lượng, ngày, vùng, giấy tờ theo phân khúc) + điểm mềm (khoảng cách, uy tín, lịch sử, giá trong khung tham khảo, khả năng giao); mỗi gợi ý có lý do khớp/thiếu. AI không ấn định giá, không xếp theo giá rẻ nhất.
2. Trợ lý giọng nói tiếng Việt: nhận dạng (faster-whisper/PhoWhisper cục bộ hoặc Web Speech API làm phương án nhẹ), trích trường (mặt hàng, lượng, đơn vị, ngày, giá, loại) bằng quy tắc + LLM Ollama dự phòng, đọc lại xác nhận. AI không bao giờ tự đăng, ký, xác nhận tiền.
3. Vài điểm AI có giá trị thật: phát hiện giá/cặp giao dịch bất thường, khoảng giá tham khảo có độ tin cậy, tóm tắt hợp đồng dễ hiểu.
4. Dịch vụ chạy được trong `ai/`: `POST /match`, `POST /voice/extract`, nếu khả thi `POST /voice/stt`. Bài đánh giá: ≥40 câu nói mẫu (giọng Nam Bộ, số nói "hai tấn rưỡi", "ba chục ký"), chất lượng xếp hạng matching trên các tình huống, độ trễ đo thật.
5. Hợp đồng API cho backend: định dạng, thời gian chờ, dự phòng khi AI lỗi (rơi về luật), log kiểm toán.

## Sản phẩm
`docs/ai/00-tong-quan.md`, `01-ghep-cung-cau.md`, `02-giong-noi.md`, `03-cac-diem-ai-khac.md`, `04-api-cho-backend.md`, `05-danh-gia-thanh-that.md`; `ai/README.md` + mã + kết quả đo thật.

## Đánh giá thành thật (file 05, bắt buộc)
Cái gì chạy thật và số đo; cái gì chỉ thiết kế/mô phỏng; giới hạn với tiếng Việt địa phương; chi phí và độ trễ khi lên production; rủi ro (sai số tiền, thiên vị matching); điều kiện để dùng thật. Không phóng đại.

## Tiết kiệm hạn mức
Không chờ vòng lặp. Thiếu tài liệu nào thì ghi giả định rồi làm tiếp. Xong thì in một bản tóm tắt ngắn (đã chạy gì, số đo chính, đánh giá thành thật tóm gọn) ra cuối và dừng.
