# Giao việc: giao diện lượt 4 (Codex gpt-6.1-sol)

Đọc `docs/giao-viec/frontend.md` (giữ mọi yêu cầu), `frontend/TIEN-DO.md`. Làm tiếp, không làm lại. Hiện: unit 41/41, `test:branches` 10/10, `test:e2e` 15/15, `test:round2` 11/13. Backend 54/54.

Backend vừa đổi (xem `docs/backend/huong-dan-giao-dien.md`, `openapi.yaml`):
- Cân lại sau phản đối `chia_lai`: bên mua phải tải ảnh/phiếu cân mới (`POST /v1/files`, entity=order) rồi gửi lại nghiệm thu kèm `evidence_document_id`; dòng không tranh chấp giữ nguyên; người bán ký đồng ý (PIN) thì tranh chấp đóng. Thiếu chứng cứ trả 422.
- Phụ lục giảm giá có hiệu lực: hoàn cọc chênh, phí giữ theo Q06 (xem trường phản hồi mới).
- Mã nạp cọc dạng `TP` + 12 số (MOD97).
- Rút phần tranh chấp cần PIN.

Việc:
1. Sửa màn cân lại để có bước tải chứng cứ, nhóm round2 "Tranh chấp: phản đối, tải lại danh sách, cân lại, ký kết quả mới và đóng hồ sơ" phải đạt; nhóm "Không lỗi JavaScript, console hoặc HTTP" phải đạt.
2. Màn phụ lục hiện số hoàn cọc chênh và phí; màn cọc bổ sung hiện mã `TP…` dễ chép.
3. Chạy lại unit, `test:branches`, `test:round2`, `test:e2e` (không chạy song song; backend 8080 + `node server.mjs` 8090). Mục tiêu tất cả đạt. Tự xem ảnh.

Chỉ ghi `frontend/` và `docs/frontend/`. Cập nhật `TIEN-DO.md`, `danh-gia-thanh-that.md`, báo đạt/tổng thật rồi dừng. Không chờ vòng lặp.
