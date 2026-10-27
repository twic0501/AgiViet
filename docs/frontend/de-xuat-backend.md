# Đề xuất backend · cập nhật lượt 5 (27/10/2026)

Không sửa backend/CSDL. Giao diện mới ở `/quan-tri/`; dùng đúng OpenAPI hiện có. Kết quả: [quản trị](anh-quan-tri-luot-5/ket-qua.json), [HTTPS thật](anh-cong-khai-luot-5/ket-qua.json).

## Chặn hoàn tất việc: lệch khóa kết quả giữa API và command

Đã tái hiện bằng UI trên backend 8080: V05 P0 từ hành động Không phải tôi → risk nhận việc → status `claimed` → POST `/v1/ops/tasks/{id}/resolve` với `result_code`, `note`, `idempotency_key` trả **409 TRANG_THAI_KHONG_CHO_PHEP**, constraint `ck_command_payload`, thông báo DB “Hành động việc không hợp lệ”. Đọc lại việc vẫn `claimed`, không có thành công giả.

`nghiep-vu/van-hanh.ts:xongViec` truyền detail `{result_code, note}` vào `cmd.act_on_task(...,'finish',...)`; command migration 0044 đọc `p_detail->>'result'`. Đề nghị đồng bộ khóa ở backend với hợp đồng API hiện hành; kiểm transaction rollback, đúng người nhận/đúng vai, kết quả/note có audit và đọc lại `done`. UI đã gọi endpoint thật, nhận đúng lỗi và chuyển thành “Hoàn tất việc · chưa có”; không báo việc xong. Không đổi kỳ vọng bộ cũ để che lỗi này; biên bản quản trị có mục blocker riêng.

## Truy vấn quản trị còn thiếu

| Nhu cầu | Hiện có / giới hạn | Đề nghị |
|---|---|---|
| Số đơn theo trạng thái | GET `/v1/orders` lọc theo tổ chức đăng nhập; không phải toàn sàn. | GET tổng quan ops gồm số theo trạng thái, phạm vi, mốc thống kê. |
| Tổ chức và người dùng | Chỉ phiên hiện tại, `/v1/org/members` theo tổ chức; xác minh chỉ trả đề xuất đã lập. | Tìm/lọc tổ chức pending/active, người đăng ký, thành viên, vai hiện hành/chờ; quyền ops rõ ràng, PII che. |
| Đơn hàng/tra cứu | API chi tiết đơn kiểm bên mua/bán; ops khác tổ chức không có quyền. | Tìm mã/ID và chi tiết đơn theo quyền ops, đọc tiền/tài liệu/lịch sử; không dùng impersonate để vượt phạm vi. |
| Tranh chấp | GET theo đơn và chi tiết phục vụ hai bên; chưa có kho hồ sơ ops/command quyết định trong OpenAPI. | Danh sách/lọc/trạng thái/chứng cứ, người xử lý, thời hạn và quyết định hai người. |
| Sao kê/lệnh chi | Chỉ POST reconcile và callback; GET money theo phía đơn, không có GET danh sách lệnh ops. | GET sao kê/kết quả đối soát và lệnh đang chờ callback, số tiền/tài khoản che, người gọi/số đã xác minh/trạng thái; GET kết quả reconcile để mở lại sau reload. |
| Kho PDF | GET tài liệu/file kiểm bên đơn/tổ chức sở hữu; GET verify mã chỉ trả metadata. | GET tài liệu theo hồ sơ ops; quyền đọc chứng cứ phục vụ xác minh chủ bởi người duyệt độc lập, audit tải file; không mở công khai chứng cứ. |
| Chi tiết hàng việc | GET danh sách và claim/resolve; chưa có GET audit/ghi chú/cuộc gọi chi tiết. | Đọc lịch sử việc và kết quả/note; tùy loại nối quy trình xử lý thay vì chỉ đánh dấu xong. |

UI hiển thị “chưa có” ở những mục trên, chỉ tham chiếu đơn/tranh chấp/lệnh từ hàng việc; không coi danh sách rỗng của tổ chức AgiViet là số đơn toàn sàn bằng 0. Form callback đã nối API nhưng chưa có fixture đủ điều kiện để kiểm gửi lệnh; không suy từ kiểm reconcile sang callback thành công.

## Vai hỗ trợ và xác minh chủ

Seed hiện có dispatcher/field/finance/risk/supervisor; chưa tìm thấy tài khoản seed vai `support`. Backend cho support đề xuất xác minh nhưng bảng hành động chưa cấp `ops.view` cho support. Giao diện nhận vai do session trả, không tự gán quyền/số ảo hỗ trợ. Đề nghị đồng bộ seed, tài liệu vai và quyền trước khi kiểm support.

Hai người xác minh **đã kiểm đạt bằng UI**: risk tải chứng cứ organization, lập đề xuất và không có nút tự duyệt; supervisor khác người lập duyệt, GET có decision, backend trả active và owner_effective_at. Chưa kiểm chủ dùng quyền sau 24 giờ hoặc người duyệt đọc trực tiếp chứng cứ tổ chức khác, do quyền file hiện có giới hạn nêu trên.

---

# Đề xuất backend sau lượt giao diện 4

Kiểm ngày 26/10/2026 trên HTTP backend 8080, 53 migrations, dấu vân tay `f1a24e43cbd4cd76`. Không sửa backend/CSDL. [Biên bản bốn bộ chạy tuần tự](kiem-thu-luot-4.json), [kết quả round2](anh-luot-2/ket-qua.json).

## Đã kiểm lại đạt

- Cân lại sau phản đối: UI tải chứng cứ mới vào đúng đơn, gửi `evidence_document_id` và PIN; API trả `chia_lai=true`. Ca nhiều dòng giữ nguyên 100 kg hạ cấp/lý do/giá trị; người bán ký bản mới rồi tranh chấp `resolved`. Không còn lỗi 403 cũ.
- Phụ lục giảm giá 2.000 kg: đủ chữ ký, hoàn cọc chênh 1.800.000 đ, phí giữ nguyên 138.000 đ, `hoan_phi_vnd=0`; đơn 50 kg hoàn 45.000 đ, phí 20.000 đ. GET money sau reload có lệnh đúng; phản hồi ngân hàng thử đưa lệnh sang succeeded. Không còn lỗi 409 hoàn phí cũ. Chưa kiểm quyết toán cuối để chứng minh không hoàn hai lần.
- Đổi gói: POST và GET nhất quán; nhóm gói/hỗ trợ/thông báo đạt.
- Ảnh lô công khai cho bên mua trả 200 ảnh thật; nhu cầu sai đầu vào trả 422 đúng trường, sửa rồi tạo được. Giữ kết quả lượt trước trong log lịch sử.

## Cần API đọc lại điều chỉnh cọc bổ sung

Phản hồi chữ ký cuối của phụ lục tăng giá có `he_qua.bo_sung_coc_ref` dạng TP + 12 số và `chenh_coc_vnd`. UI đã hiện và sao chép đúng mã nguyên văn; kiểm clipboard thật trong Chromium.

Tuy nhiên GET đơn, danh sách phụ lục, tiền của đơn và hướng dẫn cọc hiện không trả `deposit_adjustments` hoặc mã TP. Vì vậy bên mua ký trước sẽ không nhận mã khi bên bán ký sau; sau reload bên ký cuối cũng không đọc lại được mã. UI hiện chưa có mã, yêu cầu hỗ trợ trước khi chuyển; không cache một trạng thái tiền có thể lệch hoặc tự suy mã MOD97.

Đề nghị thêm danh sách điều chỉnh vào GET tiền/hướng dẫn cọc: mã phụ lục/phiên bản, mã chuyển nguyên văn, số cọc/phí phải bổ sung, đã nhận/còn thiếu, trạng thái, tài khoản đảm bảo và QR nếu có. Quyền đọc theo bên mua/người có quyền tiền; mã giữ nguyên từ DB. Cần kiểm UI hai thứ tự ký, reload, nhận khoản bổ sung và xác nhận ngân hàng sau khi có GET.

## Tài liệu cần đồng bộ

- PDF/canonical phụ lục đổi giá có thể ghi phí dự tính khác phí giữ nguyên sau hiệu lực: ca 2.000 kg tăng 23.000 → 25.000 ghi 138.000 → 150.000, nhưng `chenh_phi_vnd=0` và GET money vẫn 138.000. UI hiển thị phí hiện hành từ GET money và giải thích giữ theo Q06; nên đồng bộ phần tính trước/PDF với hệ quả thật.
- Summary OpenAPI nghiệm thu còn ghi vượt/rút phần chưa hỗ trợ, mô tả sau đã nêu `withdrawn_g`/PIN. UI vẫn chưa công bố đầy đủ nhận vượt/rút phần. Không coi việc có PIN là đã kiểm cả nhánh.
- Đăng ký trả biên nhận pending không token; UI chờ xác minh, có đăng nhập OTP mới, không tự cấp chủ. Giới hạn gửi OTP mới 60 giây và hành trình vận hành hai người chưa được kiểm UI.

SMS/ngân hàng/billing thật, thiết bị thật, kiểm định viên tại vườn, kho tồn, thuế và tin nhắn/gọi vẫn ngoài bằng chứng kiểm hiện tại. Lượt 4 dừng sau kiểm và bàn giao.

## Dữ liệu trình diễn bị kẹt lịch xe (27/10/2026, Claude)
- `POST /v1/deliveries/{id}/trip` lỗi `trips_vehicle_id_scheduled_during_excl` với cả hai xe seed (`66C-123.45`, `66C-678.90`), kể cả sau khi tua đồng hồ thử +3 ngày. Có thể `scheduled_during` tính theo giờ thật hoặc chuyến cũ không có mốc kết thúc. Vì vậy không tạo được tình huống "đang nghiệm thu" và "tiền đã về" bằng `frontend/scripts/tao-du-lieu-trinh-dien.mjs`.
- Đề xuất: seed thêm vài xe ảo; chuyến kết thúc khi đợt giao xong/đóng; `scheduled_during` dùng đồng hồ nghiệp vụ.
- `POST /v1/test/reset` trên Postgres cục bộ (local-tunnel) báo cần `AGV_TEST_PG_OWNER_URL` + `AGV_TEST_PG_TEMPLATE`; hạ tầng local-tunnel nên cấu hình để đặt lại dữ liệu sạch trước khi trình diễn.

## Quản trị local và hồ sơ giữa quy trình · kiểm lại 27/10

- Seed còn Agribank/Vietcombank và tài khoản thử kiểu số thật. UI mua/quản trị thay nhãn **Ngân hàng ảo AgiViet**, số gắn ẢO, QR thanh toán đổi thành chuỗi `AGIVIET-TEST-ONLY`; không dùng BIN/tài khoản thật trong QR. Đề nghị đổi seed cả bank_code, bank directory và nội dung PDF/canonical thử sang AGV_VIRTUAL đồng bộ. Không thay mã trong dữ liệu đã ký từ frontend. Chưa chứng minh tất cả PDF seed đã hết tên ngân hàng thật.
- API ngân hàng thử chưa trả số dư tổng của tài khoản đảm bảo. Quản trị đọc sổ cái từng case từ GET money theo quyền, không tự cộng thành số dư toàn ngân hàng; mục tổng ghi “chưa có”. Cần endpoint tổng có nguồn đối soát và mốc giờ.
- Chưa có API xóa chọn lọc artifact do test tạo. Dọn rác hiện dùng reset toàn bộ + hai xác nhận, không đoán mọi đơn/lời chào 50 kg là rác. Cần test_run_id/created_by_fixture và API cleanup theo mã lượt, vẫn bảo toàn sổ cái/giấy tờ theo chính sách.
- PostgreSQL reset/đồng hồ đã nối opt-in ở infra/local-tunnel (`AGV_RESET_ON_START=1`), có dump trước startup và DB mẫu sạch. Backend hiện reset ngay lúc khởi động khi cấu hình template; cần tách enable_reset và reset_on_start để restart giữ dữ liệu nhưng vẫn có nút reset. Không tự cấp owner cho chế độ chạy thường.
- Xe thử có lịch trùng vẫn có thể chặn case; chưa có API xem lịch/giải phóng chuyến hoặc thêm xe thử. PG riêng/mẫu sạch đã kiểm dùng DEMO-66C-001…004. Không bỏ ràng buộc lịch xe ở UI.
- Hồ sơ bán gấp/bao tiêu từ B39–B41/M31–M32: backend đã có urgent-sale, nhận loại dưới và hợp đồng theo vụ nhưng chưa có luồng đối ứng app mua trọn vẹn đã kiểm. Hồ sơ quản trị ghi “chưa có”, không tự tạo lời chào bao tiêu hay kết luận giao dịch. Cần phối hợp app mua và các API hiện hữu; không khẳng định backend hoàn toàn chưa có cơ chế.
- Tranh chấp tại vườn: hiện tạo được hồ sơ open nhưng chưa có endpoint đặt kiểm định tương ứng như khiếu nại tại nơi đến; cần bổ sung API theo quyền để chuyển hồ sơ đó sang kiểm định, chọn đơn vị/phí/mẫu/chứng cứ. Không dùng đối ứng tự kết luận. **Cập nhật lượt tiếp:** khiếu nại nơi đến đã dùng API hiện hữu để đặt kiểm định và nhận kết quả giả qua UI hai phía; không cần bịa API mới cho luồng nơi đến. Lượt đầu bị `ck_settlement_pending` do chưa nhận kết quả lệnh tạm, đã sửa đúng thứ tự ngân hàng trước webhook kiểm định. Sim trả HTTP 200 ngoài dù nội bộ 409; UI đọc cả trường `http`, không báo thành công nhầm. Quy trình chọn đối tác/báo giá/đặt dịch vụ theo B36 gốc vẫn chưa chứng minh.
- App bán mới: `manGiao` kiểm `delivery.record` để hiện form bắt đầu cân, trong khi chủ hộ có quyền delivery.ship; form xe/xuất kho cũng không hiện ở trạng thái preparing. Không sửa seller.js/CSS theo phạm vi giao việc. Bộ E2E ghi rõ bước bắt đầu cân/chuẩn bị xuất kho bằng API fixture, không nhận là thao tác UI. Cần người phụ trách app bán nối lại trước khi chứng nhận toàn luồng chỉ dùng app bán.
- GET delivery hiện không trả evidence_document_id trong từng dòng acceptance; UI chưa có lối mở ảnh phiếu cân đó. Case có ảnh thật trong kho tài liệu thử, được chỉ rõ ở panel quản trị; cần bổ sung metadata ảnh có quyền và UI ảnh trong app bán/mua. Không suy ảnh tồn tại thành ảnh đã hiển thị trong app.
