# 03. Trạng thái và sự kiện

## Cơ chế chung

`ref.statuses(entity, code)` liệt kê trạng thái. `ref.state_transitions` lưu cạnh hợp lệ, tập vai thực hiện và yêu cầu lý do. Trigger `evt.guard_status` kiểm INSERT trạng thái đầu, UPDATE cạnh/vai/lý do, rồi ghi `evt.state_history` cùng transaction. Không có cạnh ra khỏi trạng thái cuối nếu không được khai báo.

Ngữ cảnh chuẩn: `app.user_id`, `app.org_id`, `app.actor_kind`, `app.request_id`, `app.reason`, `app.device_id`, `app.command`. Backend dùng `set_config(..., true)` để chỉ có hiệu lực trong transaction. Không dùng các tên `current_user_id/current_org_id` còn nhắc trong tài liệu nháp trước đây.

Mỗi lịch sử lưu ai, tổ chức, vai, từ, tới, thời điểm, lý do, thiết bị, lệnh và request. Trigger sau lịch sử phát `evt.domain_events` và hai hàng outbox `notify`, `sync_apps`. Bản ghi trạng thái thất bại kéo theo rollback lịch sử, sự kiện và tiền/lượng trong cùng transaction.

`app.allow_any_initial=on` chỉ được owner schema dùng để nhập seed. Không phải quyền mà backend chuyển cho người dùng. Vai app hiện không có INSERT vào các bảng vòng đời.

## Những điều kiện đã cưỡng chế ngoài bảng cạnh

| Điểm chốt | Kiểm tra |
|---|---|
| Ký hợp đồng | Đúng mã băm, đúng phiên bản, đúng bên, thành viên có quyền ký; hạn mức hoặc quản lý khác người lập duyệt; không người giúp |
| Phiên bản hiệu lực | Có đủ chữ ký; không lùi phiên bản; lần gọi hàng có thể kế thừa hợp đồng khung đã ký |
| Đơn active | Có phiên bản hiệu lực, không đề nghị mở; đơn thường cần cọc held |
| Nhận đủ tiền | Có xác nhận đúng số, không chỉ dựa vào status do client gửi |
| Đợt ready | Đơn/phiên bản, lượng cam kết, an toàn, tiền trước bốc, người nhận, QR, xe, kiểm định và hồ sơ bắt buộc |
| Bắt đầu tại điểm | Trong cửa sổ giao, đã có quét QR đúng người nhận |
| Chờ quyết toán | Mọi đợt cuối, không tranh chấp mở |
| Hoàn tất | Có quyết toán cuối, không nợ, lệnh đã đối soát, cọc/quyền đòi hết, lượng cam kết/đang giao hết |

Có bảng trạng thái cho lô, nhu cầu, offer, hold, đơn, framework, nhóm, tài liệu, cọc, lệnh ngân hàng, nghĩa vụ trực tiếp, đề nghị, xin hủy, hạn, đợt, dòng nghiệm thu, tranh chấp, chuyến, hàng việc, tổ chức, thành viên và tài khoản nhận tiền. Phiếu kho hiện lưu booking + chuyển động, chưa có một máy trạng thái dịch vụ kho đầy đủ.

## Sự kiện và tên nghiệp vụ

Mã bảng/cột và trạng thái là tiếng Anh. `spec_code` giữ mã tương ứng của đặc tả khi có. Sự kiện tự động dùng `entity.to_status`, ví dụ `order.active`, `delivery.ready`; payload có trạng thái cũ/mới và history_id. Backend cần adapter sang tên lệnh nghiệp vụ như `don.hieu_luc`, `dot.san_sang` khi tích hợp API/thông báo. Các hành động không đổi status, ví dụ sửa giá, gọi nhắc, gia hạn người nhận, phải gọi `evt.emit` trong chính transaction hành động. Chưa có bộ phát đầy đủ toàn bộ danh sách mục 15 của đặc tả 03.

Domain events, audit và lịch sử là append-only. ID/seq identity giúp phân trang nhưng không bảo đảm thứ tự COMMIT giữa hai transaction. Worker và consumer phải chịu được sự kiện lặp, sai thứ tự; khi nghi thiếu dữ liệu, đọc lại hiện trạng từ DB theo quyền.

## Ngân hàng và khóa chống lặp

1. Xác thực callback ở tầng tích hợp, chèn nguyên thân vào `evt.inbound_webhooks`, UNIQUE theo provider/event_id.
2. Chèn bản chuẩn hóa `core.bank_events` cùng provider/event_id và liên kết webhook.
3. Worker đặt vai bank rồi gọi `core.apply_bank_event`; hàm kiểm chữ ký đã xác thực, khóa event, sau đó khóa cọc/lệnh.
4. Cọc nhận vào sổ, phí tách khi đủ. Backend tiếp tục các hành động đơn/hold trong cùng transaction được thiết kế cho command đó.
5. Lệnh thành công ghi tiền đi; `statement_line` cần bộ đối soát riêng, không mặc nhiên coi webhook thành công là sao kê đối soát.
6. `reconciled` hoặc `failed` không bị sự kiện muộn đảo lại. Lặp event đã áp trả `duplicate_ignored`.

Không tự gọi hàm ghi sổ cấp thấp để bỏ qua xác thực webhook. UNIQUE ở event, nguồn bút toán và idempotency là các lớp chống lặp bổ sung nhau.

## Hạn và SLA

`core.deadlines` có mỗi loại hạn một hàng open/đối tượng, cận thời gian phải sau lúc tạo. Gia hạn tạo hàng mới, đóng hàng cũ, FK `extended_from_id`; không kéo các hạn khác theo. Worker lấy hạn đến giờ, phát sự kiện và command có idempotency. Đặc tả chỉ cho gia hạn một lần ở một số hạn; backend vẫn cần kiểm đúng giới hạn từng loại.

Hàng việc có vai, người nhận, hạn phản hồi/xử lý/cập nhật, kết quả, nhật ký và quyết định hai người. `sla_policies.business_hours` chỉ là cấu hình; lịch ca 05:00–20:00, ngày làm việc, escalations và P1 theo tuổi sống còn lại cần scheduler tính. Không báo “đang xử lý” nếu `assigned_to` còn NULL.

## Phiên bản và ngoại lệ sau 0021

Quyết toán mới chuyển hiệu lực nguyên tử theo đơn. Nếu đơn `completed` phát sinh nghĩa vụ điều chỉnh, chỉ trigger hệ thống mở lại `outstanding`. Lịch sử hoàn tất cũ vẫn giữ; chỉ hết nợ và đối soát mới hoàn tất lại.

Chữ ký `quyet_dinh_van_hanh` chỉ trên phụ lục `force_majeure_reduction`: giảm lượng, giữ các điều khoản khác, bên bán đề xuất, bên mua chưa phản hồi sau tối thiểu 24 giờ. Quyết định trỏ đúng phụ lục/chứng cứ, hai nhân viên đang hoạt động khác nhau, người duyệt thuộc risk/supervisor; người duyệt ký mô phỏng phía buyer bằng tổ chức AgiViet. Nội dung phụ lục phải ghi `ký thay bằng quyết định vận hành [UUID]`. Sau ký, đề nghị bất biến. Bên bán vẫn ký; không dùng ngoại lệ cho hợp đồng thường hoặc phụ lục đổi giá.

Cấp vai tiền/chữ ký tạo sự kiện `membership.privilege_cooling` với người nhận `backup_contact` và outbox notify. Đây là yêu cầu giao thông báo trong DB; worker giao SMS thật vẫn cần tích hợp.


## Các điểm chốt sau N-01…N-16

`partially_received` là đã nhận tiền treo, chưa nhận cọc. `held` bị kiểm số C và F ở sổ riêng; tiền treo không cho đơn `active`. Đóng đơn chờ cọc có tiền thiếu tự tạo task hoàn; callback đến muộn không đổi trạng thái đơn. Task chỉ chuyển `pending → returned` khi có chứng cứ API đúng số tiền/nguồn, ghi sổ cùng transaction.

Lệnh chi lớn tới tài khoản mới vẫn ở `created`, tiền đã được đưa vào ngăn trong lệnh. `callback_required=true` chặn mọi bước ra khỏi `created` tới khi có `payout_callbacks` hợp lệ, kể cả callback đến không đúng thứ tự. Không tự nhả chỉ vì sau đó đã qua 72 giờ. Phiên bản hợp đồng quyết định đích lúc tạo lệnh; thay tài khoản đang dùng không đổi lệnh cũ.

OTP nhận tiền và lời mời được tiêu thụ cùng transaction ghi kết quả; lỗi kiểm tiền hoặc binding sẽ rollback việc dùng OTP. QR nhận hàng/biên bản/lời mời dùng một lần, khóa dòng khi quét; scan log bất biến. `payment.cash_warning` và `instruction.callback_required` đi qua outbox notify, không đồng nghĩa thông báo/gọi điện thật đã gửi.
