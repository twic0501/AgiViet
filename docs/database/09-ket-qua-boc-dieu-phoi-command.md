# Kết quả bọc điều phối backend thành cmd.*

## Trước và sau

| Mốc | Migrations | Đạt/tổng | Ý nghĩa |
|---|---:|---:|---|
| Mốc bàn giao trước lượt bị ngắt | 37 | **340/340** | Theo giao việc và báo cáo 08, không chạy lại riêng schema 0037 trong lượt này. |
| Lần chạy tiếp đầu tiên | 46 | Chưa chạy hết | Nạp đủ migration/seed, qua test 170; test 175 dùng supervisor để duyệt đối soát cần finance/risk nên dừng. |
| Sau sửa fixture quyền và thêm ca chặn supervisor | 46 | **401/401** | Dùng login finance riêng ánh xạ Đỗ Minh Trí; giữ đúng yêu cầu quyền của command. |
| Kết quả cuối PGlite/PostgreSQL 17.5 | 47 | **423/423** | Tăng 83 kiểm tra so với bàn giao; 136 bảng trong các schema nghiệp vụ; migrate/seed replay không ghi trùng. |
| Security nguyên bản `--chi-tiet` trên schema cuối | 47 | **Chưa vào 45 ca** | Exit 2 ở fixture SEC-OTP-B thiếu OTP verified; không chỉnh nguồn security. |
| Adapter tương thích trong db/ trên schema cuối | 47 | **45/45** | 41 tấn công bị chặn, 4 hợp lệ qua; 21 bất biến đạt, 0 bỏ qua. Đây là kết quả adapter, không phải kết quả runner security nguyên bản. |

Lệnh đã chạy từ thư mục gốc:

```sh
node db/tools/kiem-tra-pglite.mjs
node security/tests/db/kiem-tra-db.mjs --chi-tiet
node db/tools/kiem-tra-bao-mat-tuong-thich.mjs --chi-tiet
```

Chứng cứ: [test-results.json](../../db/test-results.json), [log SQL cuối](../../db/cmd-final-test-run.log), [security nguyên bản](../../db/cmd-security-original.log), [security tương thích](../../db/cmd-security-compatible.log), [tóm tắt máy đọc](../../db/cmd-command-results.json). Lần chạy 46 sau sửa fixture: [cmd-resume-initial.log](../../db/cmd-resume-initial.log).

## Phần hoàn thiện

- Đọc và chạy lại 0038–0046 đang dở; giữ nguyên 0001–0037. Các command có danh tính runtime lấy user/org/actor từ login đã ánh xạ, không nhận người thao tác qua payload và không cấp DML cho app/orchestrator. Helper SQL, chuyển lượng, chia nguồn hoàn và tạo phần nhóm vẫn là nội bộ.
- Hoàn thiện nhóm thị trường, thành viên/vai, tài khoản nhận tiền, việc vận hành/outbox, hủy và hạch toán, phụ lục, tranh chấp/kiểm định/phân xử, khung và nhóm. `sync_document` nhận draft. Hạn trả JSON action/task bất biến; khoản đã nhận trả `already_satisfied`, không tạo đối soát giả.
- Migration mới **0047** bổ sung tăng giá trần nhu cầu, đóng cả lời chào còn mở khi đóng nhu cầu, xử lý hủy trước cọc đủ và người bán rút tranh chấp. Khi hủy với tiền thiếu, đóng đơn trước khi tạo task hoàn nguồn để guard xác nhận đúng căn cứ; giữ tiền ở deposit_pending tới API proof hoàn. Không đổi close_reason thành hủy sau cọc khi kết thúc hủy trước cọc.
- Sửa 0042 chưa triển khai: một đợt có thể mở nhiều dòng tranh chấp; các kết luận nối bản nghiệm thu và giữ trạng thái dòng chưa kết luận. Giá đạt của gọi hàng lấy từ dòng khung đã ký. `open_dispute` yêu cầu lượng bằng cả dòng; muốn tranh chấp một phần phải tách dòng trước, tránh kết luận sai cho toàn bộ lượng.
- Sửa fixture 175: người duyệt đối soát dùng login finance riêng; thêm kiểm supervisor thiếu finance/risk bị chặn. Không nới quyền command để cho fixture đi qua.
- Bảng tích hợp đầy đủ nằm trong [06: bước backend → hàm cmd.*](06-huong-dan-cho-backend.md#bước-backend--hàm-cmd-00380047), bao gồm thứ tự xử lý hủy và quyền login từng bước. Hướng dẫn outbox dùng command claim/ack với lease, không còn hướng dẫn runtime UPDATE trực tiếp.

## Chứng cứ nghiệp vụ bổ sung

- Bộ 155–175 kiểm command dưới SESSION AUTHORIZATION của app/system/ops/inspector, không dùng owner cho thao tác đang kiểm: lời mời OTP đúng số, chống replay, thành viên suspended, chủ cuối cùng, tài khoản OTP/tra tên/chờ 24h/khóa P0, nhận việc và lease outbox; hủy buyer/seller với D đã trả, sổ quyền đòi, chia cọc/phí đúng nguồn, chỉ done sau đối soát và hoàn D; phụ lục giảm/hoàn chênh/phạt và ngoại lệ bất khả kháng ký bằng quyết định hai người; khung và phần nhóm có VA do adapter cấp.
- **180** kiểm giá kín nhu cầu, hủy trước ký và trước cọc đủ (chưa hoàn không done, có proof mới done), rút phần tranh chấp có hai chữ ký, chuyển hàng về lô con không khai trùng lượng.
- **185** kiểm hai dòng tranh chấp, không kết luận 14 ngày không chi tiền, cơ chế khác và quyết định hai người; không đóng đợt khi còn tranh chấp; hai kết luận nối ba phiên bản, bảo toàn 1.000kg đạt + 1.000kg trả, quyết toán đúng 23 triệu.
- **190** chạy khung từ soạn/ký/cọc/gọi hàng/giao nhận/quyết toán 230.000đ tới khoản trả theo kỳ, nhận tiền xóa công nợ, hoàn cọc 1 triệu về nguồn; chỉ ended sau callback và sao kê đối soát. Gọi lại lập kỳ không nhân khoản trả.

SHA256 nguồn security sau chạy giữ nguyên so với báo cáo 08:

- `security/tests/db/kiem-tra-db.mjs`: `95bec25e97d76117592f511909bde4f75aae494b407a8801e908d597b9d49a5a`.
- `security/sql/fixture.sql`: `eeeaa54f715a9be7ecd769c27c6db2f85028b3608cc1374286f79db625cac22d`.

## Giới hạn và phạm vi ghi

Chỉ ghi `db/` và `docs/database/`, không sửa backend/security/seed; chưa triển khai. Có command để backend bỏ owner ở các bước được giao không có nghĩa backend hiện đã đổi sang gọi command. Cấp login/mapping ban đầu vẫn thuộc quản trị DB tin cậy; request web không tự sửa login_principals. Nghiệp vụ chưa tồn tại như bao tiêu, đơn con tổ hợp tác, phụ lục nhiều món không được mở bằng owner.

PGlite một kết nối không chứng minh khóa nhiều phiên, SERIALIZABLE retry trên PostgreSQL server hay tích hợp ngân hàng/SMS/PIN thật. Metadata tài liệu, API receipts và tác nhân trong test là mô phỏng; không có PDF upload hay cuộc gọi thật. Phí kỳ khung được tính/chụp trong framework_periods, không tự coi đã thu phí. Bước hết hạn cần xét chứng cứ tạo task, không suy im lặng thành đã nhận tiền/hàng.
