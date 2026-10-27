# Bàn giao quản trị local · 27/10/2026

Đã làm tiếp nguồn `/home/twictrn/agiviet-production-v2` sau phần đối chiếu. Giữ quản trị có sẵn, Caddy và app bán; chỉ sửa trong frontend/, docs/frontend/, infra/local-tunnel/. Không sửa backend/db, seller.js, seller.css hoặc cloudflared.

| Phạm vi | Đạt / tổng | Bằng chứng / giới hạn |
|---|---:|---|
| Unit cuối | 62/62 | [Log](kiem-thu-tiep-quan-tri-test-final.log) |
| Branches | 10/10 | [Log](kiem-thu-tiep-quan-tri-test-branches.log), 18 ảnh |
| Round2 | 14/14 | [Log](kiem-thu-tiep-quan-tri-test-round2.log), 42 ảnh; giữ 6 HTTP 422 cố ý |
| E2E luồng thuận | 15/15 | [Log](kiem-thu-tiep-quan-tri-test-e2e.log), 60 ảnh, HD-3001 completed; bắt đầu cân bằng API fixture |
| Operator chính 18889 | 4/4 mẫu | [JSON + danh sách ảnh](anh-18889-ban-giao-27/ket-qua.json); offer/sign/deposit/active, đúng người ở cả hai app, 0 pageerror/HTTP lỗi |
| Đối ứng 6 hồ sơ cũ | 12/12 điểm cuối | [JSON](anh-doi-ung-ban-giao-27/ket-qua.json); **10 hành trình thao tác + 2 chỉ mở hồ sơ kiểm định tại vườn**, 0 pageerror/HTTP lỗi |
| Hồ sơ kiểm định tại nơi đến mới | 2/2 phía | [JSON](anh-kiem-dinh-ket-thuc-27/ket-qua.json); khiếu nại → kiểm định giả passed → kết quả hiện trong app → ngân hàng/đối soát cuối → completed |
| Ranh giới live HTTPS/18888/18889 | 78/78 | [JSON](anh-cong-khai-quan-tri-local/ket-qua.json); quản trị/mọi tệp 404 công khai, operator sau pilot 200; test/sim 404 công khai |
| OTP HTTPS bán/mua | 2/2 | Cùng JSON; 0 JS/console/HTTP lỗi và 0 request test/sim của app |
| Gốc `/` live | **Chưa đạt: 403** | `test:public` exit 1; mã server đã sửa, cần restart tiến trình chính |
| Caddy/pilot/frontend mới cô lập | Đạt | [JSON](kiem-thu-quan-tri-ingress.json); root 200 chỉ hai app, quản trị external 404/operator 200 |
| Bank controls + reset PG17 | Bằng chứng lượt trước | [JSON](anh-ngan-hang-reset-27/ket-qua.json), [reset PG](kiem-thu-reset-pg.json); không chạy lại reset DB chính |

Không cộng các hàng thành số tính năng hoặc số ca B*/M* đã chuyển. [Danh mục nguồn 76 ca](chuyen-ca-mau.csv) giữ kỳ vọng gốc; mới ánh xạ 17 mã vào nhóm hồ sơ, không có cơ sở báo 76/76 UI. Các điểm bắt đầu giữa quy trình do API thật chuẩn bị, sau đó người thử thao tác trên iframe app bán/mua thật, đối ứng thao tác phía kia qua API.

## Dùng ngay

Mở `http://127.0.0.1:18889/quan-tri/`, đăng nhập pilot rồi nhân viên ảo; OTP `123456`. Vào **Tạo tình huống thử** để chọn 8 mẫu trạng thái hoặc 7 hồ sơ giữa quy trình; có seed, bên bán/mua, mặt hàng, lượng, giá và xe. Tạo lỗi giữ hồ sơ dở; không đổi lỗi thành trạng thái đạt. Case lưu metadata trên trình duyệt/origin đang dùng, không lưu token trong URL/localStorage.

Trong case, mở **Thử bán / Thử mua · đối ứng tự động**. Panel quan sát khi tab hiện; tạm dừng được, nhật ký có seed, người thử tự quyết định phía mình. Sau phản hồi bấm cập nhật app để đọc lại. [Hướng dẫn chi tiết](quan-tri-local.md).

Hồ sơ mới **Khác mẫu tại nơi đến** dùng API có sẵn: bên mua khiếu nại kèm ảnh giả → backend đặt kiểm định. Panel cho chọn kết quả **giả có nhãn**. Nút giao kết quả xử lý lệnh quyết toán tạm và webhook ngân hàng trước, đọc cả HTTP nội bộ của sim, đọc lại hồ sơ; sau kết luận xử lý thêm đợt lệnh cuối. Hai phía đã thấy “Đã giải quyết / Đạt” rồi đơn completed. Lượt đầu bị chặn đúng `ck_settlement_pending` vì chưa xong lệnh tạm; kết quả lỗi được giữ ở [chẩn đoán](anh-kiem-dinh-chan-doan-27/ket-qua.json), không coi là backend thiếu API. Bản sửa thứ tự được kiểm lại thành công.

**Ngân hàng ảo** đọc số dư sổ từng case/lệnh/hàng đợi, có nút nhận cọc, xử lý lệnh, giao webhook và đối soát. Tổng số dư ngân hàng chưa có API, hiện “chưa có”. Dọn rác dùng reset toàn bộ qua hai xác nhận, không tự đoán đơn 50 kg là rác. Backend PG phải có owner/template trong chế độ reset opt-in; cấu hình đã có, restart thường giữ DB. Xem hướng dẫn trước khi chọn reset.

Mua/quản trị có dòng “Tiền ảo để xem quy trình, không chuyển tiền thật”; bank hiển thị Ngân hàng ảo AgiViet, tài khoản gắn ẢO, QR thanh toán là chuỗi AGIVIET-TEST-ONLY. App bán giữ quyết định bỏ dải thử/dòng tiền ảo. Seed/PDF còn có tên ngân hàng thật: UI che tên, đề nghị đổi seed đã ghi, không sửa tài liệu đã ký. Giá/lượng là giả định vụ ĐBSCL, không phải báo giá trực tiếp; giấy tờ/nhật ký/ảnh là dữ liệu giả.

## Việc người điều phối cần chạy

Đã thử cả stop/start theo giao việc; sandbox chặn ghi `~/.local/share/agiviet` (operation.lock/chmod). Vì vậy **chưa restart được stack chính**, không chứng nhận bản sửa server đã lên live. Trang gốc 403 do root thư mục mất dấu slash khi kiểm đường dẫn; source sửa xong và fixture root 200. JS/CSS tĩnh vẫn được server đang chạy phục vụ, nhưng server.mjs chỉ đổi khi khởi động lại.

Chạy restart thường, không bật reset để giữ dữ liệu:

```bash
cd /home/twictrn/agiviet-production-v2
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/dung.sh
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/khoi-dong.sh
npm --prefix frontend run test:public
```

Giữ nguyên cloudflared chạy riêng. Sau restart, `test:public` phải xanh: root 200 chỉ App bán/App mua; HTTPS `/quan-tri/` và mọi tệp 404; operator sau pilot 200; OTP hai app không gọi test/sim. Không dùng cờ `AGV_RESET_ON_START=1` cho restart này; cờ đó chủ động xóa dữ liệu và chỉ dùng khi muốn thử reset sạch.

## Chưa chứng minh / còn thiếu

- Bán gấp/bao tiêu hai app trọn vẹn vẫn “chưa có”; chưa phục hồi nguyên toàn bộ 76 ca B*/M*. Không đồng nhất 17 mã có ánh xạ với 17 ca gốc đã đạt.
- B36 gốc chọn đối tác → báo giá → người bán đặt chưa chuyển; kiểm định tại vườn chỉ mở hồ sơ. Luồng mới kiểm định nơi đến đã chứng minh **passed**, chưa kiểm failed/inconclusive/hết hạn/nhiều seed.
- App bán còn ẩn sai form bắt đầu cân cho chủ hộ, thiếu form xe/xuất kho ở trạng thái preparing; trong hồi quy các bước đó là API fixture. Không sửa phần Claude đang phụ trách.
- Chưa có xóa rác theo test_run_id, tổng số dư ngân hàng, kho case dùng chung; seed/PDF chưa sạch hết tên ngân hàng thật. Chi tiết [đề xuất backend](de-xuat-backend.md).
- Không kiểm thiết bị thật, Safari/Firefox, nhiều tab đồng thời, mất mạng đúng lúc ký, ngân hàng/SMS thật hoặc độ bền STATE /tmp qua reboot.

[Biên bản tổng](kiem-thu-quan-tri-27.json) · [Ảnh bàn giao](anh-ban-giao-quan-tri-27.html) · [Đánh giá thành thật](danh-gia-thanh-that.md).
