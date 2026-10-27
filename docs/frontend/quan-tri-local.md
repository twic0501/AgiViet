# Quản trị trên máy và dữ liệu thử · 27/10/2026

Nguồn chạy: `/home/twictrn/agiviet-production-v2`. Công khai chỉ App bán và App mua. `/quan-tri` cùng mọi tệp con bị 404 trước pilot ở 18888/tên miền; chỉ 127.0.0.1:18889 có quản trị sau pilot. Không đổi cloudflared.

## Tạo và xem case

Mở `http://127.0.0.1:18889/quan-tri/`, pilot từ `~/.local/share/agiviet/local.env`; đăng nhập nhân viên ảo, OTP 123456. Vào **Tạo tình huống thử**, chọn mẫu, bên bán/mua, mặt hàng/phẩm cấp, xe nếu giao hàng, lượng và giá. Mặc định xoài 1.200 kg × 23.000 đ/kg thay cho các đơn 50 kg lặp.

Tám mẫu dùng API thật: lời chào; hợp đồng chờ ký; ký đủ chờ cọc; cọc đã vào; đang nghiệm thu; tranh chấp mở; hủy sau cọc chờ hoàn; quyết toán ngân hàng đã xác nhận. Hồ sơ ghi từng bước API và trạng thái đọc lại. Lỗi giữ case tạo dở và mã hỗ trợ, không báo đạt. Hủy hai bên đồng ý còn chờ tiền thì đơn có thể vẫn `active`; chỉ khi lệnh hoàn xong mới `closed`.

Case lưu metadata trong localStorage của **cùng origin/trình duyệt**; không lưu token. Nút mở app tạo phiên đóng vai trong tab mới, không đưa token vào URL. Danh sách không phải kho case dùng chung giữa trình duyệt/máy. Reset DB ở nơi khác có thể làm metadata cũ mất hiệu lực; nút Kiểm tra trạng thái đọc lại API và báo rõ.

Dữ liệu nguồn seed là giả: tên hộ/HTX/doanh nghiệp, vùng sản xuất, nhật ký, giấy tờ. Giá/lượng gợi ý chỉ là giả định buổi trình diễn vụ ĐBSCL, không phải báo giá cập nhật. Ảnh case ghi dữ liệu thử; chứng từ sinh qua API chỉ có giá trị trong thử nghiệm. Seed nguồn còn tên ngân hàng thật: giao diện thay bằng **Ngân hàng ảo AgiViet**, tài khoản gắn ẢO. QR thanh toán thử là chuỗi `AGIVIET-TEST-ONLY`, không phải VietQR chuyển khoản. QR giao nhận vẫn dùng token nghiệp vụ thật của môi trường thử.

## Ngân hàng ảo

Xem **Ngân hàng ảo**: số dư sổ đảm bảo và lệnh từng case được đọc từ GET money bằng đúng phía; không cộng thành số dư toàn ngân hàng. API chưa có số dư tổng nên mục đó ghi **chưa có**.

1. Chọn case chờ cọc, bấm nhận cọc: ngân hàng ghi giao dịch và xếp sự kiện; ứng dụng chưa tự ghi đủ cọc.
2. Bấm **Giao webhook**; đọc kết quả và số dư sổ cái của đơn.
3. Khi giao/hoàn tạo lệnh, nhập mã lệnh và bấm **Xử lý lệnh đang chờ**.
4. Giao webhook, rồi đối soát bằng vai tài chính thử. Chỉ trạng thái API succeeded/reconciled mới được mô tả tiền đã về.

Các thao tác ngân hàng và đồng hồ dùng chung môi trường. Cổng operator có giới hạn request; tránh tạo nhiều case và mở nhiều tab đồng thời. Bộ test case nghỉ 65 giây giữa mẫu, không nới quota ingress.

## Đặt lại sạch trên PostgreSQL

**Restart thường giữ DB.** Chỉ khi operator chủ động đặt `AGV_RESET_ON_START=1`, launcher mới dựng/kiểm mẫu `agiviet_clean`, lưu dump DB hiện tại trong `STATE/backups/truoc-reset-*.dump`, rồi khởi động backend có `AGV_TEST_PG_OWNER_URL` và `AGV_TEST_PG_TEMPLATE`. Backend hiện tự reset ngay lúc khởi động khi có hai biến này: mỗi lần start có cờ đó sẽ đặt lại. Không lưu cờ vào local.env nếu không muốn hành vi này.

```bash
cd /home/twictrn/agiviet-production-v2
export AGV_LOCAL_STATE="$HOME/.local/share/agiviet"
infra/local-tunnel/dung.sh
AGV_RESET_ON_START=1 infra/local-tunnel/khoi-dong.sh
```

Không đụng tiến trình cloudflared đang chạy riêng. Lượt Codex này không có quyền ghi STATE thật; người điều phối chạy lệnh trên khi muốn thay dữ liệu hiện hữu bằng mẫu sạch. Stack mới được kiểm ở STATE riêng trong `/tmp`, không chứng minh độ bền qua reboot.

Mẫu sạch dựng trong cluster PostgreSQL tạm chỉ mở Unix socket 0700, migrate + seed + provision, dump/restore vào DB mẫu của cluster laptop. Không clone dữ liệu rác từ DB hiện hữu. Migration tạo role toàn cụm nên không chạy lại migration vào một DB thứ hai cùng cluster. Mẫu được đóng dấu checksum; đổi source/seed thì script từ chối dùng mẫu cũ, cần STATE mới hoặc người điều phối dựng lại mẫu có kiểm soát. Không tự xóa DB mẫu/PGDATA cũ.

Chỉ chế độ reset thử cấp role đồng hồ và owner URL cho backend; credentials không vào argv, frontend, pilot hoặc kết quả kiểm thử. Đây là ngoại lệ chủ đích cho môi trường giả trên loopback. Chế độ thường không nhận owner URL. Backend cần bổ sung cấu hình reset không reset lúc startup nếu muốn giữ cả chức năng reset và khả năng restart không mất dữ liệu trong cùng một chế độ.

Trong quản trị, cả **Dọn dữ liệu rác bằng đặt lại sạch** và **Đặt lại toàn bộ dữ liệu thử** dùng API reset hiện có. Hai bước xác nhận: checkbox lần 1, rồi nhập `XOA DU LIEU THU` và checkbox lần 2. Xóa toàn bộ nghiệp vụ/case, giữ seed nền; không phải xóa chọn lọc những đơn 50 kg. Chưa có API xóa chọn lọc nên không suy một giao dịch là rác chỉ từ khối lượng. Chỉ xóa metadata/phiên trình duyệt sau phản hồi reset thành công; API chưa cấu hình thì giữ dữ liệu và báo lỗi.

## Kiểm lại

- `npm --prefix frontend test`, `test:branches`, `test:round2`, `test:e2e`: backend thử riêng 8080 và frontend 8090, chạy tuần tự; các bộ này reset DB.
- `npm --prefix frontend run test:cases`: mặc định operator 18889, tạo bốn mẫu, mở hai app, chụp ảnh; không reset DB hiện hữu. `CASE_ADMIN_IMPERSONATE=1` dùng API đóng vai admin khi OTP thử bị khóa vì các lượt trước đổi đồng hồ; báo cáo ghi cách đăng nhập.
- `CASE_OUTPUT`, `CASE_TEMPLATES`, `CASE_PLATES`, `FRONTEND_URL`, `AGV_LOCAL_STATE` dùng cho stack kiểm riêng. `CASE_BANK_STEPS=1 CASE_RESET=1` chỉ dùng trên stack có thể xóa; thực hiện xử lý lệnh + webhook + đối soát và reset thật qua hai lần xác nhận.
- Xem JSON/ảnh tại `anh-quan-tri-case/`, `anh-case-pg-sach/`, biên bản `kiem-thu-reset-pg.json` và tiến độ/đánh giá thành thật.

## Hồ sơ giữa quy trình và bên đối ứng tự động

Sau khi tạo một hồ sơ trong mục **Tạo tình huống thử**, thẻ có hai lối **Thử bán · đối ứng tự động** / **Thử mua · đối ứng tự động**. Mở lối của phía muốn thử: panel quản trị ở cạnh app thật; giữ tab đó mở. Mỗi lần chỉ mở một phía tự động của một case. Các lối “Mở app … đúng người” vẫn mở app độc lập, không chạy đối ứng.

Sáu hồ sơ ban đầu giữ mã B*/M* mẫu 1: cân thiếu có phiếu cân giả; hạ cấp và trả lại một phần; chậm tiền trước bốc; mưa rụng trái xin giảm lượng; giá thấp hợp lệ; tranh chấp chờ người có quyền xử lý/kiểm định. Chọn hồ sơ rồi bấm Tạo để chuẩn bị đúng điểm giữa quy trình. Các hồ sơ dùng tài khoản seed thật của môi trường giả, không tự gán quyền. Cùng seed + cùng sự kiện cho cùng lựa chọn; seed kiểm là `thu-0`. Giá/lượng mặc định có thể sửa; các tỷ lệ phần trăm của hồ sơ là dữ liệu tình huống, không phải chính sách tiền.

Đối ứng quan sát mỗi 8 giây khi tab đang mở/hiện: trả lời đúng lượt, ký phía bên kia, báo/xác nhận tiền ảo, phản hồi phụ lục, nghiệm thu, nơi đến và ngân hàng. Nút tạm dừng giữ nguyên hồ sơ. Sau thông báo phản hồi, bấm **Cập nhật app sau phản hồi** để app đọc trạng thái mới; không tự tải lại khi người thử đang nhập form. Nhật ký giữ trong metadata case; token chỉ trong phiên tab. Lỗi API tạm dừng và hiện mã hỗ trợ; không suy lỗi là thành công. Một số thao tác sim giao toàn bộ webhook/đối soát dùng chung môi trường, vì vậy dùng stack riêng khi kiểm hàng loạt.

Panel có ảnh phiếu cân/chứng từ **giả có nhãn**, đọc từ file API bằng phiên có quyền. App bán mới và GET delivery chưa có lối ảnh trên dòng nghiệm thu; xem được ảnh trong panel quản trị không đồng nghĩa app bán đã có tính năng đó. Hồ sơ kiểm định giữ tranh chấp mở, không tự cân lại hay tạo kết luận. Bán gấp/bao tiêu ghi “chưa có” cho luồng hai app trọn vẹn. Những nhánh đối ứng từ chối hủy/sửa, QR/start-check và cân lại tự động ngoài các đích được JSON ghi rõ vẫn **chưa chứng minh**.

`npm --prefix frontend run test:opponent` chạy Playwright trên operator chính, mặc định không reset. Kiểm cô lập: `node infra/local-tunnel/tests/kiem-doi-ung.mjs` dựng backend PGlite/frontend/pilot/Caddy riêng, reset từng ca, không dùng PostgreSQL/tunnel chính. `AUTO_PROFILES`, `AUTO_SIDES`, `AUTO_OUTPUT`, `AUTO_BASE_PORT` giới hạn lượt kiểm. Bộ này tạo hồ sơ qua UI quản trị rồi thao tác trong iframe app thật; phản hồi đối ứng dùng API. Bằng chứng và điểm cuối từng hành trình nằm trong các thư mục `anh-doi-ung-*-27/`. Không cộng các nhóm hồi quy, các lượt mở màn và hành trình giữa quy trình thành số ca B/M gốc đã đạt.


## Hồ sơ mới: khác mẫu tại nơi đến

Chọn **Khác mẫu tại nơi đến · kiểm định giả có kết luận** và tạo case. Hợp đồng/tiền trước bốc/biên bản đã được API chuẩn bị tới cân nơi đến (arrival_check); đây là điểm bắt đầu giữa quy trình, không phải toàn bộ luồng được thao tác bằng UI từ đầu.

- **Thử mua:** ở app mua mở sẵn khiếu nại nơi đến, chọn dòng 1, lượng có vấn đề (ví dụ 120 kg), mã niêm phong `MAU-AO`, phí giả 300.000 đ, lý do và ảnh giả; bấm gửi khiếu nại. API thực sự đặt kiểm định.
- **Thử bán:** đối ứng mua gửi khiếu nại 10% lượng kèm ảnh giả, giữ phần còn lại không tranh chấp. Bấm cập nhật app để đọc hồ sơ.
- Panel có **Đối tác kiểm định giả**: chọn Đạt / Không đạt / Chưa kết luận (gợi ý từ seed), bấm giao kết quả. Công cụ xử lý lệnh ngân hàng tạm và đối soát trước; chỉ sau đó gọi webhook kiểm định. HTTP ngoài 200 không đủ: đọc cả HTTP nội bộ và GET hồ sơ.
- Bấm cập nhật để xem kết quả trong app thật. Kết luận có thể tạo đợt lệnh tiền cuối; đối ứng xử lý ngân hàng/đối soát thêm đợt đó, không dừng vì trước đó đã đối soát tạm.

Đã kiểm UI hai phía với kết quả **Đạt**, rồi ngân hàng/đối soát cuối đưa đơn về **completed**. Hai kết quả còn lại và quy trình chọn đơn vị/báo giá/đặt dịch vụ B36 gốc chưa chứng minh. Hồ sơ **Hai bên bất đồng** cũ tại vườn vẫn giữ giới hạn chưa có hành trình đặt kiểm định; không dùng kết quả nơi đến để chứng nhận hồ sơ đó. Chi tiết và ảnh trong [bàn giao](ban-giao-quan-tri-27.md).

## Khởi động lại để áp dụng bản sửa server.mjs

Nguồn mới sửa trang gốc bị 403; file server chạy trong bộ nhớ nên không cập nhật như JS tĩnh. Sandbox Codex không ghi được STATE chính. Người điều phối chạy **restart thường** (giữ DB) sau khi nhận bàn giao:

```bash
cd /home/twictrn/agiviet-production-v2
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/dung.sh
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/khoi-dong.sh
npm --prefix frontend run test:public
```

Giữ tiến trình cloudflared riêng đang có. Không thêm `AGV_RESET_ON_START=1` vào restart thường; cờ reset ở phần trên chỉ dùng khi chủ động xóa dữ liệu thử. Trước restart, bộ public báo 78 phép ranh giới + OTP hai app đạt nhưng vẫn exit 1 vì gốc `/` 403. Sau restart phải kiểm gốc 200 chỉ hai app và quản trị vẫn 404 công khai / 200 operator sau pilot.
