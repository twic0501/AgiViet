# 09. Kết quả nhật ký, hợp đồng vụ và bán gấp

Kiểm ngày **27/10/2026**, nối tiếp 0055. Thay đổi mã CSDL trong `db/`, hướng dẫn trong `docs/database/`; không chỉnh nguồn backend/security, không deploy hoặc thay dữ liệu PostgreSQL đang phục vụ ứng dụng.

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Toàn bộ migrations + seed + SQL tests trên PGlite | **57 migrations, 157 bảng, 602/602 đạt**, exit 0; migrate/seed lần hai không nhân dữ liệu | [Log](../../db/0057-pglite.log), [JSON](../../db/0057-test-results.json) |
| Backend `npm test`, nguyên bộ tình huống | **59/59 tình huống, 431/431 bước**, exit 0, đã nạp 57 migrations | [Log](../../db/0057-backend.log), [JSON](../../db/0057-backend-results.json) |
| Security `node security/tests/db/kiem-tra-db.mjs --chi-tiet`, nguyên bản | **Chưa chạy được tập tấn công**, exit 2 tại fixture OTP | [Log](../../db/0057-security.log) |

Security dừng khi `sec.make_order` ghi chữ ký buyer với `SEC-OTP-B` chưa có challenge verified đúng binding; DB trả `ck_otp_verified_binding`. Đây là lỗi đã được lưu ở [biên bản 0055](08-ket-qua-cong-postgres.md) và [log 0055](../../db/0055-security.log). Không sửa fixture, không nới OTP và không coi runner này đã đạt. Các kiểm login/RLS/ủy quyền mới nằm trong bộ SQL của DB, không thay cho runner security chưa hoàn tất.

## Phần đã thêm

- **0056**: cơ sở sản xuất qua command, nhật ký chỉ thêm/sửa bằng bản mới, tham chiếu ảnh, actor thật, nhãn nguồn do vai quyết định, quyền `diary.write`; hồ sơ mặt hàng × cơ sở × loại/tiêu chí có người duyệt độc lập, nguồn kiểm, hạn và thu hồi; đăng/xác nhận lô kiểm hiệu lực và cách ly từ nhật ký; bán gấp có thời điểm/lý do/deadline, gợi ý riêng sau 24h, lời chào hàng dạt theo mùa.
- **0057**: hợp đồng đặt trước/bao tiêu nối sổ lượng, chữ ký và tiền hiện có; khoảng lượng/giá cố định hoặc công thức; lịch đợt/vật tư; dự báo sản lượng và hạn ảnh 7 ngày; chốt đặt trước bằng phụ lục hai chữ ký và cọc chênh 24h; snapshot giá đợt bao tiêu, nhật ký thu hoạch bắt buộc, tiền đợt trừ vật tư và đến hạn N ngày, giữ cọc vụ; cờ P2 nghi giao ngoài khi dưới 80% nhật ký không lý do.
- **Lịch xe**: bốn xe ảo bổ sung; tất cả đợt kết thúc thì chuyến tự `completed`, có mốc `ref.clock_at()`. Chuyến gộp còn đợt mở vẫn giữ xe. Ràng buộc loại xe đã completed/cancelled khỏi lịch bận nhưng tiếp tục chặn xe đang phục vụ bị đặt trùng; không xóa lịch sử khoảng chuyến.
- **Seed bổ sung**: chị Năm đúng số băm `0918000421`, 15 việc một vụ, vườn xoài Cát Chu xác minh ảo hai người; `DEMO56-PRE_HARVEST` và `DEMO56-OFFTAKE` là dự thảo mô phỏng chưa ký/cọc, ba đợt bao tiêu. Không phát sinh tiền hoặc chữ ký giả trong seed. Bốn xe `DEMO-66C-001`…`004`, mỗi xe thường 10 tấn, cùng nhà xe seed. Không đổi 50 người dùng và 20 lô nền.

## Bằng chứng hành vi mới

`tests/230_nhat_ky_va_xac_minh_mat_hang.sql`, `235_dat_truoc_bao_tieu_va_lich_xe.sql`, `240_ngoai_le_vu_va_ban_gap.sql` bổ sung **52 kiểm tra** trên 550 kiểm tra trước:

- Login riêng không owner thực hiện ghi/đọc, chặn bên mua ghi/đọc nhật ký bán, helper giữ user thật và bị chặn khi thu hồi, chủ không tự gắn nhãn nhân viên, UPDATE/DELETE và rẽ nhánh bản sửa bị chặn, retry đúng nội dung trả cùng ID.
- Cơ sở mới chưa duyệt không đăng lô; người lập không tự duyệt; sau duyệt độc lập mới đăng được; thu hồi ngăn xác nhận lại. Client khai ngày cách ly cũ vẫn bị nhật ký chặn, sau đủ 7 ngày đăng được và chụp đúng mốc.
- Đặt trước giữ khoảng 1.000–1.200 kg, cọc 6.900.000đ; dự báo không tự đổi hợp đồng; chốt 1.100 kg qua hai chữ ký mới tạo cọc chênh 690.000đ với hạn 24h. Chưa chốt không thể sẵn sàng giao.
- Công thức chặn thiếu sàn/giá sai; không chốt từ snapshot giá cũ, sau refresh đúng ngày thì lưu giá trong sàn/trần và nguồn tham khảo. Bao tiêu phải ghi nhật ký thu hoạch trước nghiệm thu; giá đợt retry không nhân snapshot.
- Bao tiêu một đợt 1.000 kg × 23.000đ tạo nghĩa vụ **22.000.000đ** sau trừ 1.000.000đ vật tư, hạn 7 ngày; **2.000.000đ cọc vụ vẫn giữ**. Nhật ký 1.500 kg nhưng giao 1.000 kg, chưa lý do, tạo đúng một việc P2. Chưa hết vụ không được quyết toán chi tạm cọc.
- Mất mùa 2.000 → 1.800 kg phải có chứng cứ, bên kia đồng ý và hai chữ ký; áp dụng mới giảm đợt chưa giao cuối xuống 800 kg, hoàn 200.000đ cọc chênh, không phát phạt thiếu. Lịch cam kết ban đầu bất biến.
- Hết hạn bán gấp tắt cờ, gợi ý 24h không nhân khi retry và không lộ cho buyer; đối tác tạo/rút lời chào hàng dạt mà không xóa lịch sử.
- Chuyến gộp hai đợt chỉ hoàn thành khi cả hai đã chốt; đang phục vụ vẫn chặn lịch trùng, completed đặt lại cùng khoảng được.

## Chạy lại

Từ gốc repo, dùng dependency đã ghim trong `db/`:

```sh
(cd db && npm test) > db/0057-pglite.log 2>&1
node security/tests/db/kiem-tra-db.mjs --chi-tiet > db/0057-security.log 2>&1
(cd backend && DB_REPORT_PREFIX=0057 \
  NODE_OPTIONS='--import=../db/tools/bao-cao-backend-trong-db.mjs' npm test) \
  > db/0057-backend.log 2>&1
```

Preload báo cáo backend đã có từ trước, chỉ chuyển nơi lưu báo cáo/cache/tài liệu thử sang `db/0057-backend-*`; không đổi tình huống, SQL, vai, đồng hồ hay assertion. Hướng dẫn chữ ký hàm và payload: [06, mục 0056–0057](06-huong-dan-cho-backend.md#nhật-ký-mặt-hàng-xác-minh-hợp-đồng-vụ-và-bán-gấp--00560057).

## Giới hạn và tích hợp tiếp

Chưa thêm endpoint/UI mới, chưa chạy trên PostgreSQL native, chưa kiểm khóa cạnh tranh nhiều phiên hoặc triển khai công khai. Backend hiện tại vẫn xanh nhưng chưa có tình huống API riêng cho các command mới; cần tích hợp theo hướng dẫn 06, không gọi owner để thay command còn thiếu. Các luồng mới đã được kiểm trực tiếp ở DB qua login riêng và cơ chế OTP/ngân hàng mô phỏng.

Ảnh/PDF trong seed là tham chiếu có nhãn ảo, không phải tệp hiện trường thật hoặc PDF đã ký; `is_test_data` giữ rõ ranh giới. Hồ sơ xác minh ảo chỉ thuộc dữ liệu trình diễn; migration production không tự phê duyệt mặt hàng đang có. Nhãn xác nhận nhật ký/hạng không phải bảo lãnh mọi lô an toàn hoặc khả năng thanh toán. Reader BYPASSRLS hiện hữu vẫn cần kiểm quyền phía backend; các bảng mới có RLS cho principal, không tuyên bố reader đã được cô lập theo người dùng.

Worker cần quét deadline/gợi ý và refresh tham khảo giá đúng ngày. Bảng lịch vụ là lịch ban đầu; phụ lục đổi lượng áp lên các đợt chưa giao, không chỉnh bằng DML. Nếu giảm lượng khiến vật tư đối trừ vượt giá trị đợt, DB chặn; không xóa khoản vật tư hoặc tự dồn sang đợt khác. Cọc bao tiêu giữ tới cuối, nghĩa vụ tiền mỗi đợt vẫn cần report/confirm hoặc đối soát đủ bằng chứng.
