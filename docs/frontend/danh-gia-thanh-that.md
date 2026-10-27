# Đánh giá thành thật · quản trị local và hồ sơ thử

## Bàn giao tiếp sau ngắt · kết quả kiểm mới 27/10

Bốn mẫu offer/sign/deposit/active tạo mới qua UI **18889 chính: 4/4**, đúng phiên hai app, 0 lỗi JS/HTTP. Unit cuối **62/62**, branches **10/10**, round2 **14/14** (42 ảnh), E2E **15/15** (60 ảnh). Bước bắt đầu cân và chuẩn bị xe/xuất kho bán mới vẫn là API fixture được nêu rõ; không tuyên bố E2E thuần UI toàn vòng đời. Checksum seller.js/CSS bán không đổi.

Đã nối thêm hồ sơ **khác mẫu tại nơi đến**: tạo ở arrival_check; phía mua thật gửi khiếu nại kèm ảnh giả, backend đặt kiểm định; phía bán có đối ứng gửi khiếu nại. Panel quản trị xử lý/ngân hàng giao webhook/đối soát phần tạm trước khi gọi sim kiểm định. Lượt đầu bỏ qua bước tiền tạm bị `ck_settlement_pending` là chặn đúng của backend, không phải API chưa có; đã sửa thứ tự. Kết quả `passed` được đọc lại thành `resolved` và nhìn thấy trong cả hai app, sau đó xử lý lệnh ngân hàng/đối soát cuối, đơn `completed`, **2/2 phía**. [Kết quả cuối](anh-kiem-dinh-ket-thuc-27/ket-qua.json). Kết quả `failed`/`inconclusive`, hết hạn, lựa chọn đơn vị/báo giá/đặt dịch vụ theo B36 gốc **chưa chứng minh**. Hồ sơ tranh chấp tại vườn cũ chỉ chứng minh mở, không suy từ luồng nơi đến thành có API đặt kiểm định tại vườn.

**HTTPS kiểm mới:** 78 phép kiểm ranh giới đạt (quản trị và mọi tệp 404 công khai, operator sau pilot 200; test/sim vẫn 404 công khai). OTP bán/mua 2/2, 0 lỗi JS/console/HTTP và 0 test/sim request của app. **`test:public` vẫn exit 1 vì gốc `/` live trả 403**, không đổi kỳ vọng để làm xanh. Nguyên nhân đã sửa ở server.mjs: `path.resolve` bỏ slash cuối làm root không qua phép kiểm startsWith. Caddy/pilot/frontend khởi động mới trên fixture kiểm root 200, chỉ bán/mua. Frontend chính vẫn là tiến trình cũ; không chứng nhận bản sửa server đã vào live.

Đã thử đúng stop/start STATE chính; sandbox chỉ đọc `~/.local/share/agiviet`, stop lỗi operation.lock/start lỗi chmod. Cần người điều phối restart thường và kiểm lại; cloudflared giữ nguyên. Reset PG17/bank UI ở phần dưới là bằng chứng từ lượt trước cùng ngày, **không chạy lại reset DB chính** trong lượt tiếp này. [Bàn giao và ảnh](ban-giao-quan-tri-27.md), [biên bản tổng](kiem-thu-quan-tri-27.json).

---

## Kết quả lượt trước · quản trị local và tình huống thử 27/10

Nguồn `/home/twictrn/agiviet-production-v2`; chỉ ghi frontend/, docs/frontend/, infra/local-tunnel/. Không sửa backend, seed, dong-co mẫu, seller.js hoặc seller.css; checksum hai tệp bán giữ nguyên. Phần lịch sử phía dưới mô tả các lượt trước, không thay kết quả mới này. Bảng đối chiếu mẫu đã hoàn tất trước lượt này.

| Phạm vi kiểm | Đạt / tổng | Giới hạn |
|---|---:|---|
| Unit | 59/59 | Có kiểm seed, QR giả, không tự xử lý hồ sơ cần kiểm định |
| Branches | 10/10 | 18 ảnh; chuẩn bị một số trạng thái bằng API |
| Round2 | 14/14 | 42 ảnh; 6 HTTP 422 đầu vào sai dự kiến; xe/xuất kho bán mới chuẩn bị API |
| Luồng thuận | 15/15 | 60 ảnh; HD-3001 completed; bắt đầu cân bằng API fixture vì form chủ hộ đang bị ẩn |
| Ingress thật HTTPS/18888/18889 | 42/42 | 404 quản trị công khai kể cả pilot; operator 200 sau pilot, 401 khi chưa pilot |
| Tạo case tại operator chính 18889 | 4/4 | Offer/sign/deposit/active, mở đúng người hai app; không reset DB chính |
| Mẫu nâng cao trên PG17 riêng | 4/4 | Đang cân/tranh chấp/hủy sau cọc/quyết toán tiền về |
| Hồ sơ giữa quy trình trên PG17 riêng | 6/6 | Tạo và mở hai app; chưa phải bằng chứng hành động hết luồng |
| Đối ứng qua app thật, seed thu-0 | 10/10 hành trình thao tác | 5 hồ sơ × 2 phía, điểm cuối riêng bên dưới; PGlite cô lập |
| Mở tranh chấp chờ kiểm định | 2/2 | Chỉ mở hồ sơ, **chưa chứng minh** yêu cầu/đặt kiểm định/tới kết luận |
| Ngân hàng/reset UI trên PG17 riêng | 2/2 nhóm | Xử lý → webhook → đối soát, reset hai xác nhận thật |

Không cộng các dòng thành số ca B*/M* đã chuyển. [Danh mục 76 ca nguồn](chuyen-ca-mau.csv) chỉ ánh xạ 17 mã vào hồ sơ, giữ kỳ vọng gốc và ghi khác biệt. Tái dùng cơ chế API v2 hiện có; không đưa công thức tiền cọc 10% của ví dụ cũ vào frontend đang dùng 30%.

Các hành trình đối ứng đã chứng minh: giá thấp hợp lệ → trả giá → hợp đồng đủ chữ ký; mưa giảm lượng → phụ lục hai chữ ký/phiên bản 2; chậm trả trước bốc → chứng từ giả → OTP xác nhận đủ; cân thiếu và hạ cấp → ký kết quả → nơi đến → ngân hàng giao webhook/đối soát → completed. Người thử quyết định phía mình qua app; đối ứng chạy API phía còn lại. Không gọi hai hành trình ký/phụ lục hoặc tiền trước bốc là toàn vòng đời mua bán. Những lỗi ban đầu (trạng thái payer_reported/sent, ảnh chụp app chưa cập nhật, tự cân lại hồ sơ inspection) đã sửa và chạy lại đúng nhóm; biên bản tổng giữ nguồn các lượt thất bại và kết quả sau sửa.

Tiền và ngân hàng là ảo; UI mua/quản trị có nhãn, tài khoản gắn ẢO; QR thanh toán là payload AGIVIET-TEST-ONLY không trỏ BIN/tài khoản thật. Theo yêu cầu sáng lập, app bán không hiện dải môi trường thử hay dòng Tiền ảo. Seed còn bank_code thật, PDF/canonical có thể còn tên đó: **chưa chứng minh toàn bộ PDF sạch tên ngân hàng thật**, đã ghi đề xuất sửa seed. Giá/lượng là giả định vụ ĐBSCL, không lấy báo giá trực tiếp. Nhật ký/cơ sở/giấy tờ dùng seed giả hiện có; ảnh case là ảnh chữ có nhãn, không phải ảnh vườn ngoài đời. Ảnh dòng nghiệm thu xem ở panel quản trị; app bán/mua chưa có lối ảnh đó.

Số dư tổng tài khoản đảm bảo chưa có API; quản trị chỉ hiển thị sổ từng case, không bịa tổng. Dọn dữ liệu rác dùng reset toàn bộ + hai xác nhận, không xóa chọn lọc đơn 50 kg. Metadata case ở localStorage của origin/trình duyệt, không phải kho case chung; tạo hồ sơ lần đầu bằng nút Tạo rồi mới mở giữa quy trình. Đối ứng cần tab quản trị mở/hiện và bấm cập nhật app sau phản hồi; chỉ mở một phía tự động mỗi case. Chưa chứng minh mọi seed, lỗi mạng, đồng thời nhiều tab hay các nhánh đối ứng từ chối hủy/sửa, QR/start-check và cân lại tự động.

**Chưa hoàn tất so với toàn bộ yêu cầu mở rộng:** bán gấp/bao tiêu trọn vẹn hai app, luồng kiểm định tới kết luận và chuyển nguyên mọi ca B*/M* còn chưa chứng minh. Form bắt đầu cân cho chủ hộ/xe/xuất kho app bán cần người phụ trách bán nối lại, theo phạm vi không sửa của lượt này. Không suy bộ kiểm xanh thành đã khôi phục đủ 76 ca hoặc mọi luồng đi hết chỉ bằng app bán.

Đã thử restart STATE chính nhưng sandbox chặn ghi ~/.local/share/agiviet; giữ nguyên stack/cloudflared hiện có. Đã kiểm trực tiếp public 404/operator 200. Các thao tác reset/start thật ở STATE chính còn cần người điều phối chạy lệnh opt-in đã ghi trong [hướng dẫn](quan-tri-local.md); PG riêng /tmp đã kiểm thành công, không chứng minh độ bền qua reboot. [Biên bản tổng, ảnh và báo cáo nguồn](kiem-thu-quan-tri-27.json).

---

Ngày kiểm **27/10/2026**. Làm tiếp nguồn `/home/twictrn/agiviet-production-v2`; chỉ sửa `frontend/`, `docs/frontend/`, `infra/local-tunnel/`. Giữ tài nguyên tham khảo và thiết kế Sổ làm ăn. Dùng backend thử thật: cục bộ 8080/PGlite cho các bộ nghiệp vụ; tên miền qua ingress đang chạy/PG riêng 18080. Không sửa mã backend/DB, không reset dữ liệu công khai, không đụng cloudflared. Backend cục bộ có **55 migrations**, dấu vân tay `9aa00c5cfb0abc96`.

## Kết quả và giới hạn chính

**Lỗi mở app công khai đã sửa và kiểm qua HTTPS thật.** `/ban/`, `/mua/`, `/quan-tri/` đều hiện form đăng nhập trực tiếp; OTP 123456 vào được màn chính, không có pageerror/console error/HTTP lỗi và không có request test/sim của app trong lượt kiểm đạt. Bảy màn quản trị mở được. Không coi việc mở màn trống là đã kiểm xong nghiệp vụ quản trị.

**Chưa thực hiện được restart stack STATE thật.** Đã gọi đúng hai lệnh theo tài liệu 08: stop bị filesystem chỉ đọc tại `~/.local/share/agiviet/operation.lock`; start bị chặn chmod các thư mục state. Đây là giới hạn filesystem của sandbox. Frontend mới được server tĩnh đang chạy đọc trực tiếp nên vẫn kiểm được HTTPS; Caddy và bridge mới chỉ được validate/kiểm fixture, chưa chạy thay tiến trình thật. Vì thế chưa có bằng chứng “sau restart”, và công cụ thử tại 18889 có thể còn ẩn tới khi restart bằng terminal có quyền ghi STATE. Tunnel hiện hữu vẫn chạy.

| Bộ kiểm | Kết quả thật | Bằng chứng |
|---|---|---|
| Unit | **48/48**, exit 0 | [log](kiem-thu-luot-5-test.log) |
| test:branches | **10/10 nhóm**, 18 ảnh, exit 0 | [log](kiem-thu-luot-5-test-branches.log) |
| test:round2 | **14/14 nhóm**, 41 ảnh, exit 0 | [log](kiem-thu-luot-5-test-round2.log) |
| test:e2e | **15/15 nhóm**, 61 ảnh; HD-3001 completed, exit 0 | [log](kiem-thu-luot-5-test-e2e.log) |
| HTTPS thật | **3/3 app OTP → màn chính**, thêm 7 màn quản trị | [JSON](anh-cong-khai-luot-5/ket-qua.json), [ảnh](anh-cong-khai-luot-5/index.html) |
| Cô lập công cụ | **7/7**: 403/404 ở 3 app vẫn đăng nhập, ẩn công cụ; bán deep link register không mở đăng ký | [JSON](kiem-thu-luot-5-co-lap.json) |
| Quản trị thao tác | **8 nhóm đạt, 1 nhóm bị chặn thật** bởi backend resolve 409 | [JSON](anh-quan-tri-luot-5/ket-qua.json), [ảnh](anh-quan-tri-luot-5/index.html) |
| Ranh giới công khai | Ba app không pilot 401; test/accounts và sim/bank/state có pilot vẫn 404; capability false | [JSON](kiem-thu-luot-5-ranh-gioi.json) |
| Ingress source mới | Caddy validate exit 0; bridge fixture thật kiểm khóa quản trị/capability/test-sim external/operator đạt | [log fixture](kiem-thu-luot-5-ingress.log) |

[Biên bản tổng](kiem-thu-luot-5.json). Không cộng unit/nhóm UI/mở màn thành số hành trình độc lập. Bộ round2 giữ ca 422 đầu vào sai được dự kiến và ghi riêng, không gọi những HTTP 422 có chủ đích là lỗi ngoài dự kiến. Bộ quản trị ghi riêng HTTP 409 và không đổi thành đạt. `test:admin` reset riêng DB thử cục bộ để chuẩn bị fixture, không trỏ vào 18080. Một lần chạy lặp OTP công khai gặp 429 giới hạn số đã dùng; lượt cuối dùng các số ảo khác qua UI, không reset/tua đồng hồ công khai hoặc bỏ rate limit.

## Các phần đã nối và đã kiểm

- **Đăng nhập:** bỏ yêu cầu test/accounts trong render bắt buộc. Capability và probe tài khoản thử chạy riêng, mọi lỗi trả danh sách rỗng. Cổng công khai nhận false nên hoàn toàn không thăm dò test/sim. Gợi ý số ảo lấy tĩnh từ seed/tài liệu, chỉ hiện khi health là thử; không cache phản hồi giao dịch.
- **App bán:** chỉ đăng nhập, không nút đăng ký; đường register cũ cũng về đăng nhập. Lời mời thành viên vẫn giữ.
- **App mua:** đăng nhập hoặc Đăng ký doanh nghiệp (loại enterprise); API trả biên nhận pending, không tự cấp phiên/quyền. Round2 đã chuyển ca đăng ký từ bán sang mua và kiểm không có phiên mua sau đăng ký, kể cả reload.
- **Quản trị:** phiên riêng, chặn tài khoản không phải nhân viên; quyền đọc/hành động theo session. Đã OTP các vai dispatcher/field/finance/risk/supervisor. Seed chưa có support, không tạo số/quyền giả.
- **Xác minh hai người:** UI tải chứng cứ organization, lập đề xuất bằng risk; người lập không có nút tự duyệt. Supervisor khác người lập duyệt, GET có decision, phản hồi active và owner_effective_at. Chưa kiểm chủ thực sự thao tác sau 24 giờ. Chứng cứ dùng ảnh fixture, không phải hồ sơ xác minh ngoài đời.
- **Hàng việc:** danh sách, lọc trạng thái/loại/người nhận, P0–P3, SLA phản hồi/xử lý/cập nhật; so hạn với giờ backend. Tạo việc V05 thật từ khóa tài khoản nhận tiền ảo, risk nhận và đọc lại claimed/người nhận đúng. Hoàn tất trả 409 do lỗi backend, giao diện giữ chưa xong và hiện “Hoàn tất việc · chưa có”.
- **Đối soát:** supervisor xác nhận và gọi POST reconcile qua UI thành công. Chưa kiểm lệnh chờ callback vì chưa có fixture đủ điều kiện; form callback đã nối endpoint, yêu cầu thời lượng/nội dung/xác nhận thực tế và server tự kiểm trạng thái. Không lấy ghi chú gọi điện làm bằng chứng tiền đã về.
- **Đơn/tranh chấp/tổ chức/PDF:** các màn và form đã có; phần thiếu API ops hiện “chưa có”. Chỉ tham chiếu từ hàng việc và hồ sơ phiên hiện tại, không bịa danh sách/số đếm toàn sàn. Tra metadata theo mã tài liệu và tải file theo ID có quyền đã nối; chưa kiểm bằng UI quản trị một PDF hợp lệ xuyên tổ chức do API file hiện giới hạn bên đơn/tổ chức sở hữu. Không tuyên bố đã làm được kho PDF toàn sàn.

## Thiếu API và lỗi backend còn chặn

POST resolve dùng `result_code` theo OpenAPI nhưng backend đưa detail.result_code, DB đọc detail.result: **409 ck_command_payload**, transaction rollback, việc vẫn claimed. Cần backend đồng bộ; không sửa ngoài phạm vi. Thiếu GET thống kê đơn theo trạng thái toàn sàn, tổ chức/người dùng, tra cứu đơn ops, tranh chấp ops, sao kê/lệnh chờ callback, kho PDF và quyền đọc chứng cứ cho người duyệt. Xem [đề xuất chi tiết](de-xuat-backend.md).

## Thiết kế và tự xem ảnh

Đã tự xem các bảng ảnh mới công khai/quản trị, bảng đăng nhập/luồng thuận và đăng ký/422 trong bộ cũ; mở ảnh gốc đăng nhập bán 390px, tổng quan/xác minh/quản trị 1280px và thông báo chưa hoàn tất việc. Sửa tên đối tượng vận hành từ mã kỹ thuật sang tiếng Việt sau rà ảnh. Các phép đo viewport trong test không phát hiện tràn ngang; chưa đánh giá toàn bộ màn dài trên thiết bị thật. Giữ Be Vietnam Pro, xanh #1d5a42, viền 1px, bo 14px, linh vật C01 ở màn chính, không emoji/nút 3D. Tổng 120 ảnh từ ba bộ nghiệp vụ và 21 ảnh công khai/quản trị mới (gồm hai ảnh từ script bàn giao); mục lục cho phép mở từng ảnh gốc.

Giới hạn cũ về camera/micro/PWA/Safari/Firefox/thiết bị thật/ngân hàng/SMS/billing thật và các nhánh nghiệp vụ chưa kiểm vẫn giữ trong lịch sử dưới. Đây là môi trường thử sau khóa pilot, không phải chứng nhận production. Lượt này kết thúc sau bàn giao, không chờ vòng lặp.

---

# Đánh giá thành thật · giao diện AgiViet v2 · lượt 4

Ngày kiểm: 26/10/2026. Làm tiếp hai app hiện có, giữ Sổ làm ăn, không sửa tài nguyên `frontend/tham-khao/` hay mã backend/CSDL. Kiểm trên HTTP API thật của backend cục bộ với 53 migrations, dấu vân tay `f1a24e43cbd4cd76`. Dữ liệu/tài khoản/ngân hàng là môi trường thử; chưa triển khai production hoặc thử thiết bị thật.

## Kết quả cuối

| Bộ kiểm | Đạt / tổng | Ảnh | Kết quả tiến trình |
|---|---:|---:|---|
| `npm test` | **41/41** | — | exit 0 |
| `npm run test:branches` | **10/10 nhóm** | 18 | exit 0 |
| `npm run test:round2` | **14/14 nhóm** | 41 | exit 0 |
| `npm run test:e2e` | **15/15 nhóm** | 61 | exit 0; HD-3001 `completed` |

Tổng **120 ảnh**, gồm 3 ảnh viewport 390×844 khi cuộn. Không cộng unit và nhóm UI thành số hành trình nghiệp vụ. `round2` giữ 13 nhóm cũ và thêm một nhóm mã cọc bổ sung/sao chép, thành 14 nhóm. Nhóm cân lại bổ sung ca nhiều dòng để đối chiếu dòng không tranh chấp. Không có nhóm bị skip hay đổi kỳ vọng sang chấp nhận lỗi backend để làm xanh.

[Biên bản chạy cuối](kiem-thu-luot-4.json) có thời điểm, health và exit code của cả bốn lệnh. Log: [unit](kiem-thu-luot-4-test.log), [branches](kiem-thu-luot-4-test-branches.log), [round2](kiem-thu-luot-4-test-round2.log), [e2e](kiem-thu-luot-4-test-e2e.log). Kết quả/ảnh: [nhánh cũ](anh-bo-sung/index.html), [lượt 2 mở rộng](anh-luot-2/index.html), [luồng thuận](anh-kiem-thu/index.html).

Cả ba bộ Playwright có **0 pageerror**. Nhánh cũ có **0 console error, 0 HTTP lỗi**. Luồng thuận có **0 lỗi JS/console**; bộ này không ghi danh sách HTTP riêng. `round2` có **6 HTTP 422 và 6 console thông báo HTTP tương ứng**, đều là đầu vào sai cố ý kiểm trong nhóm nhu cầu; không có lỗi ngoài dự kiến. Nhóm không lỗi JavaScript/console/HTTP **đạt theo kiểm loại trừ sáu 422 dự kiến có ghi rõ URL/status**; không tuyên bố tổng số HTTP lỗi bằng 0.

## Việc lượt 4 đã hoàn tất

- **Cân lại:** bắt buộc chọn và tải ảnh/phiếu cân mới qua `POST /v1/files` với `entity=order`, đúng mã đơn, sau phản đối. Chỉ sau tải thành công mới hiện form gửi lại; gửi `evidence_document_id` cấp cao nhất và PIN. Khóa tổng cân theo bản cũ; giữ từng dòng không tranh chấp và lý do, gắn chứng cứ cân lại mới nếu API không trả chứng cứ cũ, chỉ tách phần thay thế từ số nhập. Kiểm UI đầu vào 1.900 kg đạt + 100 kg hạ cấp, phản đối phần đạt, chia lại thành 1.850 kg đạt + tổng 150 kg hạ cấp; GET bản mới vẫn có nguyên dòng 100 kg hạ cấp với lý do/giá trị cũ. Hồ sơ chuyển `awaiting_seller`, người bán nhập PIN ký bản mới rồi GET `resolved`. Reload danh sách trước cân lại và reload sau gửi lại đều kiểm được. Không ký bản cũ đang bị phản đối.
- **Phụ lục giảm giá:** 2.000 kg hoàn cọc **1.800.000 đ**, 50 kg hoàn **45.000 đ**; cả hai `hoan_phi_vnd=0`. Hiện số/số chữ, mã lệnh và phí đang giữ lấy từ GET money; hai app reload vẫn đọc được lệnh. Sau phản hồi ngân hàng thử mới hiện Tiền đã về. Giữ phí theo Q06, bỏ số phí dự tính của PDF khỏi dòng phí hiện hành khi đổi giá.
- **Cọc bổ sung:** phụ lục tăng giá 23.000 → 25.000 đ/kg có hiệu lực; API cấp **1.200.000 đ**, `chenh_phi_vnd=0`, mã `TP000000000195` trong lần reset này. Hiện nguyên mã trong ô chỉ đọc có thể chọn, nút Sao chép, đã đối chiếu clipboard với phản hồi API. Có cách chọn mã thủ công nếu clipboard không được phép. Không tự sinh hay đổi mã. Chưa kiểm ngân hàng nhận/áp dụng khoản bổ sung.
- **Giới hạn đọc lại mã cọc bổ sung:** backend hiện chỉ trả `bo_sung_coc_ref` trong phản hồi chữ ký cuối, các GET đơn/phụ lục/tiền/hướng dẫn cọc không trả danh sách điều chỉnh. Card mã dùng được ngay tại kết quả ký; sau reload hoặc bên ký trước mở lại, UI nói rõ chưa có mã và cần hỗ trợ, không dựng mã hoặc lấy mã cọc gốc. Đã kiểm trạng thái chưa có sau reload; đề nghị GET trong [đề xuất backend](de-xuat-backend.md).
- **Rút phần:** giữ PIN bắt buộc khi chọn `rut_phan`, PIN bị vô hiệu khi chuyển về `chia_lai`; kiểm trong bộ nhánh. Không tính đây là đã kiểm toàn bộ rút phần/gửi lại `withdrawn_g`.

## Phần lượt trước tiếp tục giữ

- **Ảnh lô:** có mã ảnh thì chỉ tải ảnh thật qua API xác thực; đợi giải mã rồi hiện và đổi nhãn thành ảnh lô. Nếu lỗi tải, hiện chưa tải được ảnh và đề nghị tải lại; không thay bằng minh họa. Chỉ lô không có ảnh API mới giữ minh họa ghi rõ không phải ảnh lô. Bộ nhánh đối chiếu 200, MIME ảnh, bytes khớp tệp đã tải và ảnh UI có kích thước tự nhiên; bỏ toàn bộ ngoại lệ 404 cũ.
- **422 nhu cầu:** gắn lỗi cạnh ô đúng, có `aria-invalid`, mô tả lỗi và focus. Sáu đầu vào thật kiểm ô lượng cần, tối thiểu, giá, ngày, loại; giữ dữ liệu và request ID, có Cần hỗ trợ, sửa rồi tạo thành công `open`. Không hiện tên trường kỹ thuật. Unit bao gồm ánh xạ trường, lỗi không biết và đường dẫn `details`.
- **Hoàn chênh phụ lục:** hiện số tiền/số chữ, mã lệnh từ `he_qua`, GET money để giữ danh sách sau reload. Đơn 50 kg giảm giá hoàn **45.000 đ**, phí hoàn **0 đ**; đúng một lệnh, hai app đọc lại được. Chỉ sau phản hồi ngân hàng mới hiện Tiền đã về. Lượt 4 kiểm lại đơn 2.000 kg đã hiệu lực và không hoàn phí theo Q06.
- **Đổi điều phối:** bổ sung PIN bên mua lúc ký/gửi nghiệm thu theo API mới; dùng nguyên mã do server cấp. Câu 501 kỹ thuật đổi thành chưa sẵn sàng và không giữ lệnh 501 ở trạng thái chưa rõ.
- **Đăng ký:** backend trả biên nhận không token; bỏ gọi session với token trống. Hiện chờ xác minh hai người và chờ vai chủ 24 giờ, lưu biên nhận qua reload, có đăng nhập OTP mới và đăng ký số khác. Không tự cấp chủ hoặc báo có quyền giao dịch. Chưa kiểm đăng nhập số mới sau giới hạn gửi mã 60 giây; nhận lời mời có token vẫn đạt.
- **Gói:** bỏ thông báo “Billing là mô phỏng” do API trả khỏi nội dung người dùng, đọc lại gói hiện hành. Không ghi đè GET bằng lựa chọn người dùng khi backend trả lệch.

## Các lỗi cũ đã kiểm lại

Không còn nhóm không đạt trong lần chạy cuối. Cân lại đã nộp được chứng cứ/ký bản mới/đóng hồ sơ. Đổi gói POST/GET nhất quán sau thay đổi backend. Giảm giá 2.000 kg đủ hai chữ ký và hoàn cọc chênh, không còn lỗi `ck_instruction_fee_refund`. Nhóm kiểm lỗi tổng hợp đạt với sáu 422 cố ý đã nêu. Không sửa backend/CSDL hoặc đổi vai vận hành để vượt kiểm quyền.

## Màn đã nối và giới hạn hiện tại

| Màn | Trạng thái với API hiện tại |
|---|---|
| OTP/đăng ký/lời mời | OTP/session/switch-org; đăng ký nhận biên nhận chờ xác minh; mời/nhận lời mời bằng OTP đúng số đạt. API xác minh chủ là nghiệp vụ vận hành; chưa xây/kiểm màn vận hành hai người. |
| Hôm nay/tổng quan | Orders/offers/việc tới lượt và quyền từ session. Công cụ đóng vai/ngân hàng chỉ trong dải Môi trường thử. |
| Lô hàng | Tạo, ảnh thật, publish với revision, trạng thái tương lai Sắp có hàng đạt; số lượng theo ngăn, lọc nguồn. Xác nhận còn hàng/đóng lô có nối, chưa kiểm nhánh riêng. |
| Nguồn/ghép/hồ sơ | Ảnh theo quyền, ba nhóm ghép có lý do; source-profile với tên/xác minh/tỉnh/giấy tờ/số đơn. Không dựng uy tín/khoảng cách hay coi khớp là xác minh. |
| Nhu cầu/lời chào/so chào | Tạo/publish/matches, 422 đúng ô, lời chào gắn nhu cầu và offer-comparison đạt. Giá tại kho `null` có lý do; không xếp theo rẻ nhất. Trả giá/từ chối chưa có E2E riêng. |
| Hợp đồng/duyệt/PDF/OTP | Hai app ký, cờ ký và OTP, duyệt vượt hạn mức đạt; bytes PDF `%PDF-` đạt. Không cache tài liệu xác thực vào service worker. |
| Cọc/trả thẳng | Hướng dẫn 30% và VietQR/tài khoản từ API, báo trả với chứng từ, OTP xác nhận nhận đủ, quyết toán/ngân hàng/đối soát đạt. Nhận một phần/chưa nhận chưa có nhánh UI riêng. |
| Giao nhận | Chọn người nhận, xe, QR/mã 6 số, ba phần nghiệm thu/PIN, nơi đến đạt. Kho thiếu 1.800/2.000 kg tạo đợt bù 200 kg và mở đợt mới đạt; chưa hoàn tất giao/tiền/quyết toán đợt bù. |
| Vượt/rút phần/thiếu | Giao bù có kiểm. Nhận vượt và nhập rút phần ở form cân đang khóa theo giới hạn OpenAPI còn công bố; PIN đề nghị rút phần đã nối và kiểm hiện/ẩn theo lựa chọn, chưa kiểm gửi lệnh rút phần và kết thúc toàn bộ nhánh. Kết thúc/bất khả kháng cũng chưa kiểm riêng. |
| Hủy/tranh chấp | Hủy hai bên đọc lại yêu cầu, từ chối/đồng ý và đóng đơn sau tiền đạt. Phản đối/danh sách đạt; cân lại/chia lại, giữ dòng không tranh chấp, ký bản mới và đóng hồ sơ đạt. Khiếu nại nơi đến có form/tệp, chưa E2E riêng. |
| Phụ lục | Đổi ngày/PDF/OTP hai bên hiệu lực phiên bản 2 đạt. Giảm giá 50 kg/2.000 kg hoàn cọc, giữ phí đạt. Tăng giá/cọc bổ sung/clipboard đạt tại kết quả ký; giới hạn đọc lại mã đã nêu. Tăng lượng/đổi người nhận chưa kiểm riêng. Chưa kiểm quyết toán cuối của đơn đã hoàn chênh để khẳng định không hoàn lần hai. |
| Thành viên/tài khoản nhận | Mời/nhận OTP, đổi vai có thời gian chờ và hạn mức đạt. OTP yêu cầu đổi tài khoản và Không phải tôi khóa thật đạt; chưa kiểm kích hoạt sau 24 giờ. |
| Gói/hỗ trợ/thông báo/sổ | GET gói, hỗ trợ không người nhận, thông báo worker, sổ theo kỳ đạt ở phần tương ứng. Đổi gói POST/GET nhất quán đã đạt trong lượt 4. |

Luồng thuận vẫn thực hiện bằng UI từ OTP → chào mua → hợp đồng/PDF/OTP → cọc → trả thẳng/chứng từ → người bán OTP xác nhận → xe/QR/mã 6 số → nghiệm thu ba phần/PIN → nơi đến → quyết toán/ngân hàng/đối soát. Một đơn cuối **HD-3001 `completed`**, 15 nhóm không phải 15 đơn độc lập.

Các nhóm `round2` reset riêng và chuẩn bị đơn/ký/cọc, một số thanh toán/giao nhận bằng API thật. Chỉ thao tác được ghi “UI” và có ảnh được tính là đã thao tác qua app. Tệp ảnh là fixture từ tài nguyên tham khảo, không phải ảnh ngân hàng/chứng cứ ngoài đời. ID trong JSON thuộc từng lần reset.

## Tự xem ảnh và thiết kế

Đã tự mở **12 bảng ảnh tổng quan của lần chạy cuối**, ảnh gốc màn cân lại ở 1280px (giữ dòng 100 kg), phụ lục hoàn cọc ở 390px và cọc bổ sung mã TP ở 1280px. Phát hiện dòng phí dự tính khi tăng giá khác phí API đang giữ; đã sửa và chạy lại cả bốn bộ. Đã rà ảnh viewport tab đầu/giữa/cuối và số đo [tab-viewport.json](anh-bo-sung/tab-viewport.json). Năm tab bán nằm trong 390px, kiểm nút cuối không bị che. Ảnh chụp sau hydrate/giải mã. Tên tệp chứng cứ dùng fixture trong môi trường thử.

Không thấy tràn ngang toàn trang hay nút cuối bị che trong tập ảnh này; bảng rộng có khung cuộn riêng. Lỗi 422 xuống dòng đúng dưới ô, số tiền/mã lệnh hoàn tự xuống dòng trong card. Khoảng trắng ở trang ngắn là vùng còn lại của viewport; không chèn dữ liệu để lấp. Giữ xanh #1d5a42, Be Vietnam Pro, hệ cỡ chữ, viền/bo 14px, logo/PWA và trâu C01, không thêm miệng hay emoji, không đổi shell.

Chưa đạt đầy đủ: form bán/phụ lục/sổ vẫn dài; chưa có trợ lý giọng nói theo lượt, chưa nghe thử giọng Việt thực tế, chưa đo độ tương phản/a11y chuyên dụng. Chưa thử thiết bị thật/camera/micro/cài PWA, Safari/Firefox, tải lớn hoặc mất mạng đúng lúc OTP bị tiêu thụ. Chưa có đầy đủ kho tồn/thuế/tin nhắn/gọi/bao tiêu khi backend chưa cung cấp. Màn vận hành xác minh chủ và ngân hàng/SMS/billing thật không nằm trong kết quả đã kiểm.

Lượt 4 kết thúc sau kiểm và bàn giao; không chờ backend sửa để chạy vòng tiếp.
