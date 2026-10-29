# Tiến độ giao diện AgiViet production v2

## Tự làm ban đêm · 30/10/2026

Lộ trình: A trâu → B chuyển động Rive → C AI + API → D offline → E giao diện mới. Mỗi bước có kiểm rồi mới sang bước sau.

- [x] Backend + DB đạt hết: DB 732/732 (PGlite), 729/729 (PostgreSQL 17); backend 74/74 tình huống, 561/561 bước; kiểm quyền 11/11; đồng thời 3×20/20.
- [x] A0 Tay khớp nối dùng chung từ tay V4g (`trau-rive/tay-khop.py`), số đo dò bằng OpenCV khớp V4g; viền dưới màu nên khuỷu liền. 21 dáng đứng (`tu-the-khop.json`), tự kiểm đủ lông mày/mắt/mõm (`xem-khop.sh`).
- [ ] A1 Đạo cụ gắn bàn tay (Codex vẽ, mức high) — đang chạy, kết quả về `~/Downloads/trau-vector/dao-cu/`.
- [x] A2 Khớp chân (hông-gối-cổ chân, viền dưới màu) + hạ thân khi ngồi; dáng đi A/B, ngồi, ngồi chống cằm (`tu-the-chan.json`). Còn: đặt lên đạo cụ ghế/thúng.
- [ ] A3 Soi kỹ toàn bộ dáng.
- [ ] B Rive: xương tay/chân, trạng thái dáng, điểm chạm, soi khung.
- [ ] C AI + API (khóa đã kiểm: Gemini, NIM gemma-4-31b-it, nemotron lightning, deepseek-v4.1-flash có trong danh mục).
- [ ] D Offline.
- [ ] E Giao diện mới.

## Bàn giao tiếp lượt bị ngắt · 27/10/2026

- Đọc và giữ phần đã làm sau `doi-chieu-ban-mau`; không dựng lại quản trị/Caddy. Bốn mẫu mới **offer/sign/deposit/active** trên **18889 chính** đạt, mở đúng cả hai app; 14 ảnh, 0 pageerror/HTTP lỗi. [Kết quả](../docs/frontend/anh-18889-ban-giao-27/ket-qua.json).
- **Đối ứng kiểm mới:** 10/10 hành trình thao tác + 2/2 mở tranh chấp tại vườn; hồ sơ kiểm định nơi đến mới **2/2 phía tới kết luận và quyết toán cuối, đơn completed**. 0 pageerror/HTTP lỗi; xem [bàn giao](../docs/frontend/ban-giao-quan-tri-27.md).
- Thêm hồ sơ **Khác mẫu tại nơi đến** bằng cơ chế khiếu nại/kiểm định API v2 đã có: bắt đầu sau cân nơi đến, bên mua gửi ảnh giả; quản trị xử lý lệnh quyết toán tạm và webhook ngân hàng rồi mới giao kết quả kiểm định giả. Đọc HTTP nội bộ của sim, không coi HTTP ngoài 200 là webhook đã thành công. Đối soát theo từng tập lệnh, không bỏ qua đợt cuối vì đã đối soát tạm.
- Unit cuối **62/62**; branches **10/10**, round2 **14/14**, E2E **15/15**, HD-3001 completed. Giữ 6 HTTP 422 cố ý của round2 và phân biệt các bước chuẩn bị bằng API ở app bán. Không sửa `shared/seller.js`, `ban/seller.css`, không ép dải thử/dòng tiền ảo trở lại app bán.
- `test:public` đã sửa theo app bán mới và quản trị chỉ local: **78 kiểm ranh giới đạt**, OTP bán/mua HTTPS **2/2**, 0 test/sim request của app. **Trang gốc live còn 403**: phát hiện lỗi `server.mjs` từ chối chính thư mục root (dấu slash cuối). Đã sửa và kiểm Caddy/pilot/frontend mới với root 200 chỉ hai app; tiến trình frontend chính cần restart mới nhận mã server.
- Đã gọi lại cả stop/start STATE chính: filesystem sandbox chỉ đọc, chặn `operation.lock`/`chmod`. **Không tự khởi động lại được**, không đụng cloudflared. Người điều phối cần restart thường theo [bàn giao](../docs/frontend/ban-giao-quan-tri-27.md), sau đó chạy lại `test:public`. Không dùng cờ reset nếu muốn giữ dữ liệu.
- Biên bản tổng trước đây bị thiếu đã bổ sung tại [kiem-thu-quan-tri-27.json](../docs/frontend/kiem-thu-quan-tri-27.json). Kết quả thử và giới hạn cuối ở [bàn giao](../docs/frontend/ban-giao-quan-tri-27.md), [đánh giá thành thật](../docs/frontend/danh-gia-thanh-that.md); không coi mọi ca B*/M* gốc đã chuyển xong.

## Quản trị local + hồ sơ thử + ngân hàng ảo · tiếp sau đối chiếu (27/10/2026)

- Đã đọc `doi-chieu-ban-mau` hoàn tất trước khi làm tiếp; giữ mã và nguồn **76 ca B*/M*** trong [danh mục chuyển](../docs/frontend/chuyen-ca-mau.csv), ánh xạ 17 mã vào hồ sơ. **Không tuyên bố 76 ca đã chuyển/đạt**; các phần chưa có bằng chứng UI ghi chưa chứng minh.
- Giữ ingress đã sửa: công khai `/quan-tri` và mọi tệp 404 trước pilot; operator 18889 sau pilot vào được; gốc chỉ bán/mua. Kiểm trực tiếp HTTPS/18888/18889 **42/42**, thêm kiểm Caddy/pilot thật với đường mã hóa/giả scope và các tệp đối ứng mới. Không đụng cloudflared.
- Hoàn thiện 8 mẫu trạng thái và 6 hồ sơ giữa quy trình: cân thiếu có phiếu giả; hạ cấp/trả lại có ảnh; chậm tiền trước bốc; mưa rụng trái xin giảm lượng; giá thấp hợp lệ; tranh chấp mở chờ kiểm định. Có bên bán/mua chọn được, mặt hàng/phẩm cấp, lượng/giá/xe, bước API, kiểm trạng thái, mở đúng người và giữ phiên quản trị. Tạo lỗi giữ hồ sơ dở, không bịa trạng thái.
- Đối ứng nằm hoàn toàn ở quản trị local, panel cạnh iframe **app thật**, có seed/nhật ký/tạm dừng và cập nhật app sau phản hồi. Không sửa `shared/seller.js`, `ban/seller.css` hoặc giao diện bán. Cân thiếu/hạ cấp đi từ biên bản chờ ký qua nơi đến, webhook ngân hàng ảo và đối soát tới `completed`; ký/phụ lục/tiền vẫn cần người thử quyết định phía mình.
- Dọn rác và đặt lại sạch có **hai xác nhận**, dùng API reset thật; chưa có xóa chọn lọc test_run_id. Opt-in `AGV_RESET_ON_START=1` dựng PG template sạch, sao lưu trước startup và cấp owner/template chỉ cho chế độ thử. **Đã kiểm PG17 reset qua UI thật**, xóa metadata và quay về đăng nhập sau thành công.
- Ngân hàng ảo xem sổ đảm bảo/lệnh theo case, xử lý lệnh, giao webhook, đối soát đã kiểm UI trên PG17. Số dư tổng ngân hàng chưa có API → ghi “chưa có”. Nhãn mua/quản trị, tài khoản ẢO và QR thanh toán giả được giữ; app bán **không** có dải thử/dòng Tiền ảo theo quyết định sáng lập. Seed/PDF còn tên ngân hàng thật đã ghi đề xuất, không sửa DB/backend.
- Kiểm hồi quy cuối: unit **59/59**, branches **10/10**, round2 **14/14**, E2E **15/15**, HD-3001 completed. Round2 giữ 6 HTTP 422 cố ý cho đầu vào sai. Luồng thuận hiện **60 ảnh**; branches 18 ảnh, round2 42 ảnh. Bước bắt đầu cân và chuẩn bị xe/xuất kho thiếu UI bán được ghi là **API fixture**, không nhận là chứng minh toàn luồng chỉ qua app bán.
- **18889 thật:** 4/4 mẫu cơ bản (offer/sign/deposit/active), mở đúng cả hai app, 0 pageerror/HTTP lỗi. **PG riêng:** 4/4 mẫu nâng cao (checking/dispute/cancel/completed), 6/6 hồ sơ mở hai app, bank controls và reset qua hai xác nhận đều đạt. Đối ứng: **10/10 hành trình thao tác giữa quy trình**, **2/2 mở hồ sơ tranh chấp**; luồng đặt kiểm định tới kết luận và bán gấp/bao tiêu trọn vẹn **chưa chứng minh**. Các nhánh từ chối hủy/sửa, QR/start-check và cân lại tự động chưa nằm trong điểm cuối đã kiểm cũng ghi rõ.
- Đã thử stop/start STATE chính theo yêu cầu: sandbox chặn operation.lock/chmod (read-only); không restart được STATE chính trong lượt này. Người điều phối đã restart ingress ở lượt trước; kết quả 404 công khai/200 operator được kiểm mới trực tiếp. Nếu muốn bật reset chính, người điều phối dùng lệnh opt-in ở [hướng dẫn](../docs/frontend/quan-tri-local.md), vì start với cờ đó **đặt lại dữ liệu ngay**. Các stack `/tmp` chỉ là kiểm thử, không chứng minh qua reboot.
- Xem [biên bản tổng](../docs/frontend/kiem-thu-quan-tri-27.json), [hướng dẫn mở và thử](../docs/frontend/quan-tri-local.md), [đánh giá thành thật](../docs/frontend/danh-gia-thanh-that.md). Lượt này kết thúc sau kiểm/bàn giao, không chờ vòng lặp.

## Lượt 5 · Đăng nhập công khai và app quản trị (27/10/2026)

- Đã sửa lỗi nghiêm trọng: tải công cụ thử không còn ở chuỗi khởi tạo bắt buộc. Form đăng nhập luôn mở; số ảo lấy từ dữ liệu tĩnh, không gọi test/accounts trên đường công khai. Probe capability và API thử có catch độc lập; 403/404 ẩn công cụ hoàn toàn.
- `/ban/` chỉ đăng nhập, kể cả link đăng ký cũ quay về đăng nhập. `/mua/` có đăng nhập và Đăng ký doanh nghiệp qua API thật, giữ pending/chờ xác minh; bộ round2 đã chuyển fixture đăng ký sang mua và kiểm không có phiên mua tự cấp.
- Thêm `frontend/quan-tri/` dùng chung Sổ làm ăn và phiên riêng. Có tổng quan/hạn theo giờ backend; V01… ưu tiên/SLA/lọc/nhận việc/form kết quả; xác minh chủ hai người/chứng cứ; tổ chức/người dùng; tham chiếu đơn/tranh chấp; reconcile/callback; tra metadata/tải tài liệu có quyền. Thiếu API/quyền hiện “chưa có”, không dựng thống kê toàn sàn.
- Thêm server route quản trị/chuẩn hóa dấu slash, trang chọn ba app; Caddy route quản trị sau pilot. Bridge cấp capability external=false/operator=true sau auth; file tĩnh mặc định false bảo vệ trường hợp bridge cũ chưa restart. Không mở test/sim, không đụng cloudflared.
- **HTTPS thật đạt:** script `chup_cong_khai.mjs` bán/mua, Playwright ba app OTP → màn chính và bảy màn quản trị; 0 pageerror/console/HTTP lỗi, 0 test/sim request của app. Kiểm riêng không pilot 401 cả ba; test/sim có pilot vẫn 404. Xem [kết quả công khai](../docs/frontend/anh-cong-khai-luot-5/ket-qua.json).
- Kiểm cục bộ: unit **48/48**, branches **10/10**, round2 **14/14**, E2E **15/15**, 120 ảnh, HD-3001 completed. Kiểm cô lập công cụ/deep link **7/7**. Quản trị **8 nhóm đạt, 1 blocker thật**: API hoàn tất việc trả 409 do backend truyền result_code nhưng command đọc result; UI giữ việc chưa xong và báo chưa có. Xác minh độc lập hai người, nhận V05 và reconcile đã kiểm API thật qua UI; không coi mở màn là hoàn tất mọi nghiệp vụ.
- **Chưa làm được restart STATE thật:** đã gọi cả dung.sh và khoi-dong.sh theo 08; sandbox chỉ đọc `~/.local/share/agiviet`, lỗi operation.lock/chmod. Stack/tunnel đang có vẫn chạy và phục vụ frontend mới trực tiếp. Caddy/bridge source mới cần terminal có quyền ghi STATE để restart; công cụ tại 18889 có thể còn ẩn trước restart. Không tuyên bố đã nghiệm thu sau restart.
- Đã cập nhật đánh giá, đề xuất backend và README. Chỉ ghi frontend/, docs/frontend/, infra/local-tunnel/; không sửa tham-khao/backend/db. **Lượt này kết thúc, không chờ vòng lặp.** Bước còn lại cụ thể: restart stack bằng terminal có quyền ghi STATE; backend sửa resolve và bổ sung GET ops còn thiếu, rồi kiểm lại các thao tác phụ thuộc.

## Lượt 4 · Bàn giao sau kiểm cuối
- Đã thêm bước tải ảnh/phiếu cân lại mới vào đúng đơn (`entity=order`), sau phản đối; chỉ sau tải thành công mới hiện gửi nghiệm thu kèm `evidence_document_id` và PIN. Giữ tổng cân và dòng không tranh chấp; người bán ký bản mới đóng hồ sơ.
- Nhóm cân lại kiểm nhiều dòng: 1.900 kg đạt + 100 kg hạ cấp → 1.850 kg đạt + tổng 150 kg hạ cấp; dòng 100 kg/lý do/giá trị không tranh chấp giữ nguyên. Danh sách tải lại, `awaiting_seller`, PIN và `resolved` đều đạt.
- Phụ lục giảm giá: 2.000 kg hoàn 1.800.000 đ, 50 kg hoàn 45.000 đ; phí giữ theo Q06, hoàn phí 0 đ. Dùng phí từ GET money thay cho phí dự tính trong canonical/PDF khi đổi giá; lệnh hoàn đọc lại qua API và chỉ báo tiền về sau phản hồi ngân hàng.
- Cọc bổ sung: nguyên mã `TP` + 12 số từ server, ô chọn mã/nút Sao chép; đối chiếu clipboard đúng. Ca tăng giá cần bổ sung 1.200.000 đ, phí giữ nguyên. Chưa kiểm ngân hàng nhận khoản bổ sung. API chưa có GET mã điều chỉnh: chỉ hiện mã tại phản hồi ký cuối; sau reload/bên ký trước mở lại hiện chưa có mã, ghi đề xuất backend, không dựng mã.
- Giữ PIN bắt buộc khi chọn rút phần trong phản đối; nhánh cũ kiểm hiện/ẩn PIN. Chưa kiểm hoàn tất `withdrawn_g`, nhận vượt và quyết toán cuối sau hoàn chênh.
- Chạy **tuần tự**, backend 8080 và `node server.mjs` 8090: unit **41/41**, `test:branches` **10/10** (18 ảnh), `test:round2` **14/14** (41 ảnh, thêm một nhóm mã TP/clipboard), `test:e2e` **15/15** (61 ảnh), HD-3001 `completed`. Cả bốn exit 0. [Biên bản](../docs/frontend/kiem-thu-luot-4.json).
- Nhóm round2 không lỗi đạt: 0 pageerror, không lỗi HTTP/console ngoài dự kiến; 6 HTTP 422 và 6 thông báo console tương ứng của nhóm kiểm đầu vào sai được ghi rõ. Nhánh cũ 0 lỗi HTTP/console, luồng thuận 0 lỗi JS/console (bộ này không ghi danh sách HTTP riêng).
- Đã tự xem **12 bảng ảnh** và ảnh gốc cân lại 1280px, hoàn cọc 390px, mã TP 1280px; sửa dòng phí phát hiện từ ảnh rồi chạy lại cả bốn bộ. Tổng **120 ảnh**. Không thấy tràn ngang/nút cuối bị che trong tập đã kiểm; form dài và giới hạn thiết bị thật vẫn ghi thành thật.
- Đã cập nhật đánh giá, đề xuất backend và README. Chỉ ghi `frontend/` và `docs/frontend/`; giữ nguyên `tham-khao/`, backend và CSDL.
- **Lượt 4 đã dừng sau kiểm và bàn giao, không chờ vòng lặp.** Bước kế khi có giao việc mới: bổ sung GET điều chỉnh cọc rồi kiểm hai thứ tự ký/reload/ngân hàng; hoàn tất các nhánh chưa kiểm ghi trong đánh giá.

## Lượt 3 · Đang chốt kiểm chứng trên backend command
- Đã bỏ ảnh minh họa tạm ở lô có mã ảnh; tải ảnh xác thực và đợi giải mã ảnh trước khi hiện, lỗi tải chỉ báo chưa có ảnh.
- Đã gắn 422 nhu cầu vào đúng ô, giữ nội dung và mã hỗ trợ; cập nhật trạng thái tạo nhu cầu đăng ngay/lô tương lai “Sắp có hàng”.
- Đã thêm hoàn cọc chênh/mã lệnh ở phụ lục và đọc lại trạng thái lệnh hoàn qua API tiền của đơn; bổ sung PIN bên mua khi ký biên bản theo hợp đồng mới.
- Unit đạt 41/41; nhánh cũ 10/10, 18 ảnh, xác nhận bytes ảnh thật bên mua; luồng thuận 15/15, 61 ảnh, HD-3001 `completed`.
- Backend hiện thực tế đã chạy đổi gói/đăng ký dù summary OpenAPI còn ghi 501. Đã sửa câu thông báo đổi gói và xử lý biên nhận đăng ký không có token: hiện chờ xác minh, yêu cầu đăng nhập bằng OTP mới thay vì gọi session với token trống.
- Lần chạy lượt 2 đầu bắt được 403 khi cân lại và 409 khi phụ lục có hoàn phí. Kiểm 422 đúng ô và hoàn cọc ở đơn 50 kg đạt. Đang chạy lại sau sửa giao diện; giữ lỗi backend trong kết quả, không đổi thành đạt.
- Bước kế: tự xem ảnh mới, cập nhật đề xuất backend/đánh giá và chốt số thật rồi dừng.

## Phần 1 · Nền tảng
- Đã đọc thiết kế Sổ làm ăn, API và quy tắc nghiệp vụ. Ban đầu chỉ có thư mục tham khảo, chưa có app bán/mua.
- Đã tạo máy chủ tĩnh kiêm chuyển tiếp API cùng nguồn (8090 → 8080), hai điểm vào, manifest và logo SVG.
- Đã có lớp API chung giữ khóa chống lặp khi chưa rõ kết quả, lỗi thống nhất, helper tiền/ngày/đọc số.
- Đang dở: màn đăng nhập và luồng một đơn.
- Bước kế: nối chào giá → ký → cọc → trả thẳng → giao nhận → quyết toán, sau đó bổ sung các màn còn lại và kiểm thử.

## Phần 2 · Luồng và màn
- Đã nối các màn: đăng nhập OTP, hôm nay/tổng quan, lô/ảnh/sổ lượng, nhu cầu/ghép 3 nhóm, chào/trả giá, lập hợp đồng, điều khoản/PDF, duyệt/ký OTP, cọc, báo trả/xác nhận tiền, giao nhận/mã 6 số, 3 phần nghiệm thu/PIN, nơi đến, quyết toán, hủy, khiếu nại nơi đến.
- Dùng trạng thái và hành động từ API, đọc lại sau lệnh. Đổi vai, tác động ngân hàng và đồng hồ chỉ xuất hiện khi `/health` trả môi trường thử.
- Đã có kiểu sinh từ schema OpenAPI, QR cục bộ, PNG icon PWA, giới hạn cache chỉ tài nguyên công khai.
- Đang dở: chưa kiểm chứng các màn bằng Playwright; các chức năng thiếu API chưa thể hoàn tất (sẽ ghi cụ thể trong đề xuất backend).
- Bước kế: unit helper/API, luồng thuận trên backend thật, chụp và tự xem ảnh 390/1280, sửa lỗi rồi ghi số kiểm thử thật.

## Phần 3 · Kiểm chứng luồng thuận lần đầu
- Unit đạt 28/28 ở lượt đầu; Playwright đạt 15/15 nhóm, 61 ảnh; HD-3001 chuyển tới `completed` trên backend HTTP thật, không lỗi JS/console.
- Đã tự xem 6 bảng ảnh và các màn tiền, nghiệm thu ở kích thước gốc. Sửa tab bán để hiện đủ 8 mục, bỏ viền focus khỏi tiêu đề, nút chọn tệp tiếng Việt, thêm lọc nguồn và lưới chọn mặt hàng.
- Bổ sung gửi lại đúng thao tác khi mạng gián đoạn và làm mới khi quay lại tab nếu chưa nhập dở.
- Đang dở: kiểm bổ sung đăng lô/nhu cầu/duyệt và xác minh lại với mã backend hiện tại (mã trên đĩa đã thay đổi sau khi tiến trình thử được mở).

## Phần 4 · Bàn giao đã kiểm
- Đã hoàn tất lượt kiểm cuối: unit **33/33**; luồng thuận UI **15/15 nhóm**, **61 ảnh**, HD-3001 `completed`, không lỗi JS/console.
- Nhánh bổ sung **9/10 nhóm**, **14 ảnh**: nhu cầu/ghép, lọc nguồn, duyệt hạn mức, người giúp, phản đối từng phần và đọc hồ sơ, kho 390px. Một nhánh không đạt là publish lô với revision do lỗi backend đã tái hiện. Test không bỏ qua lỗi này.
- Có đánh giá thành thật, đề xuất backend và README chạy app/kiểm thử. Phần “Không đúng” đã nối và kiểm với backend hiện tại; thông tin thiếu API ở tiến độ ban đầu đã được làm rõ trong báo cáo cuối.
- Đã tự xem ảnh, sửa tràn/khó thấy tab và nút chọn tệp. Các hành động tiền cần nhập thực tế và xác nhận, không chọn sẵn.
- Còn dở: các mục thiếu API/luồng chưa nối ghi trong `docs/frontend/danh-gia-thanh-that.md`; chưa triển khai production, chưa thử thiết bị thật.
- Bước kế cụ thể: backend sửa thứ tự kiểm revision của publish và bổ sung truy vấn thành viên/yêu cầu hủy/tranh chấp/gói; sau đó chạy `npm run test:branches` và hoàn tất các màn phụ thuộc. Không sửa backend trong lượt giao diện này.

## Lượt 2 · Nối API bổ sung
- Đã bỏ xử lý tạm khóa publish; backend hiện đăng lô với revision đúng.
- Đã nối thành viên/mời/nhận lời mời/đổi vai; đăng ký chờ xác minh; tài khoản nhận tiền; gói; hỗ trợ; thông báo; hồ sơ nguồn; so chào theo nhu cầu; sổ tiền theo kỳ; cờ ký và VietQR trả thẳng.
- Đã nối yêu cầu hủy hai bên, danh sách tranh chấp, phụ lục/PDF/OTP, giao tại kho, cân lại/rút phần, vượt lượng, thiếu lượng và chọn đợt giao bù.
- Đang kiểm Playwright: kiểm nhánh cũ đã bắt được cập nhật từ 8 lên 9 tab. Phát hiện API tải ảnh lô trả 404 cho bên mua dù mã ảnh có trong GET lô; đã có ảnh minh họa có nhãn khi tải không được, sẽ ghi đề xuất sửa quyền đọc ảnh.
- Bước kế: kiểm nhánh mới và luồng thuận, tự xem ảnh viewport 390×844 khi cuộn, sửa rồi ghi số đạt/tổng thật.

## Lượt 2 · Bàn giao sau kiểm cuối
- Hoàn tất nối các API mới đã liệt kê ở phần trước; xóa ghi chú thiếu API/lỗi publish đã cũ trong `docs/frontend/de-xuat-backend.md`. Giữ nguồn/shell hiện có, không sửa `tham-khao/` hoặc mã backend/CSDL.
- Kết quả cuối: unit **33/33**; `test:branches` **10/10 nhóm**, 17 ảnh; `test:round2` **10/10 nhóm**, 22 ảnh; luồng thuận **15/15 nhóm**, 61 ảnh, HD-3001 `completed`. Tổng **100 ảnh**. Không cộng nhóm E2E với unit thành số tình huống nghiệp vụ.
- Năm nhánh mới chạy bằng UI: hủy hai bên; tranh chấp/cân lại rồi ký kết quả mới; phụ lục đổi ngày/PDF/OTP hai bên; giao tại kho thiếu 200 kg tạo đợt bù; mời thành viên/nhận OTP/đổi vai. Dữ liệu chuẩn bị hợp đồng/ký/cọc của bộ mới dùng API, ghi rõ trong JSON và đánh giá thành thật.
- Đã kiểm tab dưới bán đúng viewport **390×844 khi cuộn** ở đầu/giữa/cuối, kiểm vị trí/điểm bấm và nút cuối; tự mở ba ảnh gốc. Đã rà bảng ảnh và sửa việc chụp ảnh quá sớm: đợi app hoàn tất đúng tuyến/hydrate trước khi chụp.
- Đã sửa form phụ lục chỉ hiện trường liên quan; màn hủy chỉ hiện hệ quả đúng yêu cầu; đang chờ cân lại thì ẩn ký; tài khoản chưa có vai hiện hướng dẫn chờ xác minh/cấp quyền sau reload. Ảnh minh họa có nhãn cho toàn bộ 8 mặt hàng.
- Giới hạn thật: **ảnh lô bên mua bị backend trả 404** dù GET lô có mã ảnh. Bộ nhánh cũ ghi riêng 2 lỗi HTTP đúng mã ảnh đó, không có pageerror; bộ mới/luồng thuận không có console error. Không tuyên bố ảnh thật bên mua đã đạt. UI dùng minh họa có nhãn khi không tải được.
- Phát hiện thêm API nhu cầu thiếu `min_source_qty_g` trả 500, gửi 0 trả 422; UI yêu cầu nhập dương. Hai điểm được ghi trong đề xuất backend, không sửa backend.
- Còn dở: backend cần mở quyền đọc đúng ảnh lô công khai và chuẩn hóa ràng buộc nhu cầu; chưa hoàn tất đợt giao bù/tiền tại kho, biến thể phụ lục tăng/giảm tiền, camera/PWA/thiết bị thật. Đánh giá ghi cụ thể từng phần đã kiểm và chưa kiểm.
- Bước kế nếu có lượt giao mới: backend xử lý hai điểm trên, rồi kiểm ảnh thật bên mua và các biến thể chưa phủ. **Lượt này đã dừng sau kiểm và bàn giao, không chờ vòng lặp.**
