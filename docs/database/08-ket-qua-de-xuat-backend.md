# Kết quả xử lý đề xuất backend 0033–0037

Báo cáo này giữ mốc lịch sử 340/340. Phần tiếp nối 0038–0047 và kết quả mới nhất xem [09](09-ket-qua-boc-dieu-phoi-command.md).

## Trước và sau

| Lần kiểm | Migrations | Đạt/tổng | Ghi chú |
|---|---:|---:|---|
| Mốc trước lượt bị ngắt, theo giao việc | 32 | 285/285 | Mốc bàn giao, không phải kết quả chạy lại với schema mới |
| Lần chạy đầu khi tiếp tục | 34 | Chưa chạy hết | 0033–0034 nạp được; test 130 dừng vì timestamp tạo tài khoản bị ghi đè |
| Cuối lượt này, PGlite/PostgreSQL 17 | 37 | **340/340** | 285 ca cũ và 55 ca bổ sung; migrate/seed chạy lại không ghi trùng |
| Security nguyên bản, `--chi-tiet` | 37 | Chưa vào 45 ca | Exit 2 tại fixture: SEC-OTP-B không có challenge verified; giữ nguyên nguồn security |
| Security adapter có sẵn trong db/ | 37 | **45/45** | 41 SQL tấn công giữ nguyên đều bị chặn; 4 ca hợp lệ qua; 21 bất biến đạt, không bỏ qua |

Lệnh đã chạy:

```sh
node db/tools/kiem-tra-pglite.mjs
node security/tests/db/kiem-tra-db.mjs --chi-tiet
node db/tools/kiem-tra-bao-mat-tuong-thich.mjs --chi-tiet
```

Chi tiết máy đọc: [test-results.json](../../db/test-results.json), [backend-proposal-results.json](../../db/backend-proposal-results.json). Log: [PGlite](../../db/backend-proposal-test-run.log), [security nguyên bản](../../db/backend-proposal-security-original.log), [security tương thích](../../db/backend-proposal-security-compatible.log).

SHA256 nguồn security trùng báo cáo trước lượt này:

- `security/tests/db/kiem-tra-db.mjs`: `95bec25e97d76117592f511909bde4f75aae494b407a8801e908d597b9d49a5a`.
- `security/sql/fixture.sql`: `eeeaa54f715a9be7ecd769c27c6db2f85028b3608cc1374286f79db625cac22d`.

## Thay đổi và chứng cứ

- Hoàn thiện 0033–0034 chưa triển khai: chủ đầu tiên qua chứng cứ đúng tổ chức, người xác minh/người duyệt độc lập, quyết định dùng một lần, vai chờ 24h; thu hồi giữ lịch sử và bảo vệ chủ cuối cùng.
- Hoàn chênh C theo delta của phụ lục đã ký và hiệu lực, có adjustment làm căn cứ, chia nguồn hoàn và giới hạn cộng dồn. Bài kiểm thực thi hoàn 3.450.000đ cọc và 34.500đ phí của phụ lục giảm lượng, kiểm sai căn cứ/vượt delta/adjustment trùng và gọi lại.
- Đồng hồ thử do owner cấp ở bảng cmd.test_clock; runtime không ghi/bật bằng app.test_time. Kiểm kích hoạt đúng 24h dưới login system và chặn trước hạn. Production khi bảng rỗng dùng giờ thật; auth/session/OTP giữ giờ thật.
- 0035–0037 có nhóm cmd cho lô/nhu cầu/lời chào/giữ lượng/đơn spot/giao nhận/BBNT/quyết toán/lệnh/sao kê/hạn/task/lô con. Runtime không DML, không gọi helper ghép hàng/hoàn nguồn, không chọn actor bằng request.
- Bài xuyên suốt dùng login thật: tạo đơn + tài liệu + bản v1, chữ ký OTP và statements giá bất thường, chốt cọc qua event ngân hàng, active/commit hold, xuất hàng tới kho không ép QR từ xa, quét tại kho, nghiệm thu, receipt PIN sai thiết bị bị chặn, ký hai bên, chốt lượng, báo tiền chỉ ghi report, xác nhận có OTP, quyết toán 6.900.000đ, outbox gửi một lần, callback/sao kê rồi hoàn tất và fully_processed.
- Sửa guard cọc trong migration mới: sau phụ lục giảm C, việc đổi status không đem expected_* bất biến của bản gốc so lại với điều khoản bản mới. Trường kinh tế gốc vẫn không sửa được. Sửa xác nhận giá bất thường chỉ thuộc hợp đồng/phụ lục, không ép lại ở BBNT.
- QR chỉ bắt quét người nhận khi nghiệm thu/kiểm đến hoặc nghiệm thu tại nguồn; xuất hàng giao tại kho giữ điều kiện giờ/tiền/chuyến/receiver/token nhưng không ép người nhận đọc mã từ xa.
- Có kiểm phiên đăng nhập bền vững, thu hồi token, thu hồi vai khác tổ chức bị chặn, chủ cuối cùng không tự mất vai, hết hạn không chạy sớm và thử lại không nhân lịch sử.
- Giữ nguyên seed và nghĩa TH-015/051. [Hướng dẫn backend](06-huong-dan-cho-backend.md) ghi rõ phương án tách phí đơn đầu trên app và quan hệ từ lịch sử nhập khẩu; không tự đánh dấu lại bốn historical_trades Sáu → Tư Hùng.

## Phạm vi và giới hạn

Không sửa 0001–0032, backend, security hoặc seed. Chỉ sửa hai migration dở 0033–0034, thêm 0035–0037; bổ sung tests 140/145/150, cập nhật timestamp fixture/kỳ vọng của test 130, kết quả và tài liệu trong db/ và docs/database/.

Các command mới và thứ tự gọi được ghi trong [06](06-huong-dan-cho-backend.md). Đây là API cho luồng spot và các chức năng liệt kê; chưa thay toàn bộ điều phối của các nhánh khung/nhóm/tổ hợp tác, duyệt chính sách, phụ lục tổng quát, phân xử tranh chấp hoặc hạch toán hủy đầy đủ. Những endpoint đó phải từ chối tới khi có command chuyên biệt; không được dùng kết nối owner để ghép nốt. answer_cancel=true ghi đồng ý xử lý tiền, chưa tự chia tiền hủy. Hạn cần đánh giá chứng cứ tạo task, không tự suy đã nhận tiền/hàng.

Chưa triển khai. PGlite một kết nối không chứng minh khóa nhiều phiên, SERIALIZABLE retry trên PostgreSQL server hoặc tích hợp API ngân hàng/SMS/PIN thật. Mọi bằng chứng mạng trong test đều mô phỏng; không báo security nguyên bản đạt 45/45 khi fixture đã dừng.
