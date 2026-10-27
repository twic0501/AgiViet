# 07. Đánh giá thành thật

## Kết quả đã chạy

Kiểm chứng bổ sung ngày 26/10/2026 bằng Node v24.18.0 và `@electric-sql/pglite@0.3.16`. Engine tự báo:

```text
PostgreSQL 17.5 on aarch64-unknown-linux-gnu, compiled by emcc, 32-bit
```

Đây là PostgreSQL biên dịch sang WASM chạy trong PGlite, không phải PostgreSQL server/container. Báo cáo ban đầu ghi Docker CLI có trên máy nhưng `docker info` thất bại vì thiếu socket `/var/run/docker.sock`. Đợt sửa này không kiểm lại Docker/psql; chỉ chạy PGlite, không khởi động hay giả lập PostgreSQL server.

| Hạng mục | Kết quả thực |
|---|---|
| SQL migrations | 32 file liên tục 0001–0032, chạy thành công trên DB trống; 0001–0029 giữ nguyên |
| Số bảng nghiệp vụ/tham chiếu | 125 bảng BASE TABLE trong ref/core/ledger/pii/ops/evt/mkt |
| Không tính vào 125 | test.*, cmd.login_principals, public.schema_migrations, view và materialized view |
| Migrations và seed lần hai | Bỏ qua bản đã áp, seed không sinh thêm người, bút toán, chuyển lượng, lịch sử hoặc sự kiện |
| SQL checks trước/sau đợt N | 205/205 → 285/285 đạt (282 SQL assertions + 3 đối chiếu Node) |
| Nâng cấp có tiền từ 0029 | 6/6 đạt; giữ entries/quyết toán cũ, chuyển thiếu/thừa, nộp bù và hoàn nguồn sau nâng cấp |
| Constraint hoãn | Có kiểm tại COMMIT và SET CONSTRAINTS ALL IMMEDIATE, kể cả header rỗng và thiếu vế tách lô |
| RLS/quyền | Có SET LOCAL ROLE agiviet_app thực chạy, thử đọc chéo tổ chức, giá kín, PII, ghi tiền và TRUNCATE |
| Bảo mật trước đợt 0024–0029 ngày 25/10 | 29/41 ca nguy hiểm bị chặn, 12 lỗ hổng; 4/4 ca hợp lệ qua; 21/21 bất biến đạt |
| Bảo mật sau 0032 với adapter fixture | 41/41 ca nguy hiểm bị chặn, 0 lỗ hổng; 4/4 hợp lệ qua; 21/21 bất biến đạt |
| Lệnh security gốc trước/sau đợt N | Cả hai exit 2 tại fixture OTP bịa SEC-OTP-B; không có tổng đạt/tổng hợp lệ |
| Script shell/Node | bash -n và node --check đạt; đường thực thi psql/Docker chưa kiểm |

Bằng chứng máy đọc: `db/test-results.json`; log hiện tại: `db/n01-n16-test-run.log`; baseline: `db/baseline-n01-n16.log`. Chạy lại bằng `npm --prefix db test`. Runner tạo DB bộ nhớ mới, không dùng dữ liệu đã có để che lỗi migrations. Các số trên là kết quả bộ hiện tại, không phải chứng nhận toàn hệ thống.

## Kiểm tra quan trọng đã có

- Mọi transaction tiền có ít nhất hai dòng và tổng bằng 0; số dư đệm khớp tổng entries.
- Chặn giao dịch rỗng, không cân, ngăn cọc âm và thêm entries vào transaction đã COMMIT. Bút toán đảo kiểm cùng tài khoản/ngược dấu.
- Khóa chống lặp tiền, lượng và webhook; cùng key khác nội dung bị chặn. UNIQUE bổ sung theo bank_event, confirmation, settlement và bước lệnh.
- Giữ lượng trước khi có đơn, hết hạn trả đủ, chặn lượng âm/vượt khả dụng/vượt 80%, tách lô phải có hai vế; đối chiếu toàn bộ bộ đệm lượng với chuyển động.
- Chuyển trạng thái sai/vai sai bị chặn; trạng thái đơn có lịch sử, event và outbox trong cùng transaction.
- Ký sai hash, người giúp ký/nhận tiền/đổi tài khoản, tài liệu bị sửa và ký lại bản kết thúc bị chặn.
- Bên trả báo tiền chưa sinh dòng tiền; bên trả không tự xác nhận thay bên nhận; nhận một phần, đủ và mã giao dịch trùng được kiểm.
- Chặn ready thiếu QR/xe; có chuẩn bị và quét QR trước bước nghiệm thu. Xe không nhận hai chuyến chồng giờ.
- TH-006 thực ghi từ ký, nhận cọc thiếu/bổ sung, trả thẳng hai lần, nghiệm thu 1.850/120/30 kg, tách lô con, quyết toán, hai lệnh ngân hàng, callback muộn và hoàn tất. Người bán nhận 44.350.000; cọc chi 12.150.000, hoàn 1.650.000; phí 138.000.
- Kiểm công thức các nhánh TH-024/025/029/031/037/038/055, phép cỡ tôm/ẩm lúa, phân bổ cước và 500 bộ đầu vào xác định. Đây là kiểm SQL/số học, không phải toàn bộ các luồng thao tác của những tình huống này.
- Lần gọi khung nhiều món kiểm tổng 780.000 + 380.000 = 1.160.000, chặn thiếu dòng hoặc thêm dòng sau khi chốt cấu trúc.
- Giá tham khảo xoài tính thực 25.000 từ 14 đơn thuộc 4 cặp; bảng/cột nghiệp vụ đều có COMMENT.

## Dữ liệu ảo đã nạp và phần không được suy diễn

Nguồn JSON có SHA-256 `b3f13865269747601b70aa80a3f79d3d33d8a175a4cb28a0d8c5e3d731025c45`. Generator đọc JSON, nạp 50 users, 32 organizations, 8 products, 20 lots, 8 demands/9 lines, 15 historical trades, 2 frameworks, đối tác/xe/kho và 1 kế hoạch bao tiêu/3 đợt. Toàn bộ 13 mục nguồn giữ nguyên trong `ops.seed_sources`.

Các giới hạn nguồn được xử lý rõ:

1. Số “18 đơn hoàn tất”, uy tín 92 trong hồ sơ không chứa chi tiết 18 đơn. Không tạo thêm hợp đồng, xác nhận tiền hay chữ ký quá khứ từ các số tổng đó.
2. `don_nen` nhập riêng, không dựng sổ tiền quá khứ thiếu chứng từ. Chỉ 14 đơn nền hợp lệ tạo giá tham khảo xoài; 11 giá mặt hàng/loại còn lại là giả định có nhãn nguồn ngoài, không tự biến số so_don thành giao dịch.
3. Cọc khung và dư nợ đầu kỳ được ghi bằng bút toán nhập khẩu có nhãn nguồn; seed không tạo callback ngân hàng giả. Lịch đã chốt sắp giao nhập snapshot. Không tạo các đơn con, PDF hay biên bản giả để lấp lịch sử còn thiếu.
4. Bao tiêu BT-2005 trong seed chỉ là imported_offtake_plans/batches, không có tiền. Bài 090 tạo đơn thử 9.000 kg, hai bên ký OTP, ngân hàng mô phỏng xác nhận/tra lại cọc vụ 9 triệu, giao và chốt đợt 1 (3.000 kg), đối trừ vật tư 5 triệu, xác nhận trả thẳng 49 triệu. Đợt 2–3 TH-055 chưa chạy xuyên suốt; bài 050 vẫn chỉ kiểm công thức đợt cuối.
5. Seed không có tọa độ đủ tin cậy. Mã tỉnh và một số thông số hồ sơ là tham số thử, không mạo nhận xác minh hành chính/kỹ thuật.
6. PII seed là bytes thử có nhãn rõ, chưa mã hóa. Metadata PDF trong tests dùng chuỗi băm kiểm chứng, không phải tệp PDF thật đã sinh/lưu.

## Chỗ chưa khớp hoàn toàn đặc tả hoặc còn thuộc backend

| Phần | Tình trạng và hệ quả |
|---|---|
| API ghi và phân quyền | Có command hạn quyền ký/nhận tiền/điều chỉnh/ngân hàng/OTP, ánh xạ session_user; kiểm login app thật trên PGlite. Chưa có trọn bộ command tạo đơn/điều phối/vận hành và broker pool chung; endpoint còn thiếu phải từ chối, không dùng owner |
| 63 tình huống 09 | Chưa chạy đủ 63 luồng hai app/API. Một luồng tiền TH-006 chạy sâu bằng SQL, các nhánh khác có kiểm bất biến/số học chọn lọc |
| Tự điều phối đơn/cọc/đợt | Hold và ghi sổ tiền có trigger; backend còn phải gói cập nhật trạng thái đơn, lượng giao, tạo hạn và nghĩa vụ trong cùng command |
| Matching H1–H11 | Có bảng cache điểm, lý do, hạn, giá kín/RLS và hàm tìm nguồn an toàn. Chưa có bộ chạy thuật toán khoảng cách, giấy tờ, ghép gom, chống dò giá, cùng giá trong phiếu và cooldown 7 ngày |
| Giá tham khảo | Đã có rolling median/IQR, đủ số đơn/cặp, loại cờ/khung và nguồn giả định. Chưa có quy cước giao kho; chưa tổng hợp dòng bảng cỡ/ẩm theo nhóm kỹ thuật đầy đủ; vùng DBSCL cần cấu hình trước mở rộng |
| Cờ chống lách | Có anomaly_flags, blocks, contact_grants. Chưa có bộ lọc chat/OCR ảnh, máy tính uy tín/vi phạm 90–180 ngày, phát hiện quan hệ thiết bị/tài khoản và scheduler xử lý |
| Nhóm/lô gộp | Tổ hợp tác bị chặn nhận tiền chung, dùng đơn con từng hộ; HTX giữ mô hình pháp nhân. Có cấu trúc phần, phân bổ và hàm chia tiền. Chưa có command chốt nhóm đồng loạt và kiểm tổng phân bổ toàn nhóm/phần hộ ở mọi tình huống; chưa kiểm nghiệm thu lô gộp xuyên suốt |
| TH-047 sửa sau quyết toán | LS-1 đã có phiên bản liên tục, một bản hiệu lực, nghĩa vụ và bút toán delta; kiểm lệnh cũ đang xử lý giữ nguyên, delta +800.000 rồi −1 triệu, nhận tiền và hoàn tất lại. Chưa có endpoint/UI revision |
| QR | DB có hash token/jti, khóa chống quét lặp, nhận hàng/biên bản một lần, lời mời gắn hash số + OTP. **Chưa có payload chuẩn tắc ký Ed25519/xác minh offline theo N-04**, mã phụ/chống dò hoặc VietQR NAPAS; không còn lấy HMAC ngắn làm mục tiêu |
| OTP/PDF/ký số | Có bảng challenge, receipt auth worker, binding người/tiền/phiên bản, hạn/lần sai/dùng một lần; hash chữ ký đối chiếu helper security. Chưa tích hợp SMS/HMAC thật, sinh PDF, kiểm bytes storage hay ký số bên ngoài |
| Kho/xe/kiểm định | Có dữ liệu, khóa lịch xe, nhiệt độ, custody, giới hạn lượng kho và chuyển rủi ro. Chưa có đủ máy trạng thái đặt dịch vụ, kiểm quyền xuất kho đang tranh chấp, công suất kho theo thời gian hoặc phát cảnh báo sai nhiệt liên tục 60 phút |
| SLA | Có cấu hình, vai, hạn, công việc, quyết định và audit. Chưa có lịch ca/ngày làm việc, tính tuổi sống còn lại và worker escalations |
| Hoàn thừa/hoàn chênh/hoàn phí | Có nguồn tiền, excess_vnd, căn cứ Q06, snapshot tài khoản ký; ngăn thừa và trong lệnh riêng. Hoàn tiền treo kiểm API đúng nguồn, có ca tiền muộn và tiền thiếu hết hạn. Chưa chạy mọi kết hợp phụ lục/callback và sao kê thật; worker chuyển khoản ngoài DB chưa tích hợp |
| Ngoại lệ bất khả kháng | LS-3 có chữ ký quyết định vận hành đúng TH-040b và các ca chặn khác loại/chưa hết hạn/đã trả lời/thiếu chứng cứ. Chưa có UI và khóa ký số thật |

Các phần này không được mô tả như đã hoàn tất tự động chỉ vì có bảng tương ứng. Mô hình khung nhiều món đã sửa bất cập của bản nháp một giá/một mặt hàng; tích hợp lịch gọi, thay từng món và đóng nợ theo kỳ vẫn cần backend.

## Đợt sửa LS và bảo mật 25/10/2026

Giữ nguyên migrations đã có 0001–0023. Sửa lỗi cột trùng trong bài LS-1 đang dở, hoàn tất kiểm thử, thêm 6 migrations:

| Migration | Nội dung |
|---|---|
| 0024 | Phạm vi sổ cái, quyết định điều chỉnh, cửa sổ ngày, đích chi/hoàn, cấp vai và helper |
| 0025 | Vai bank/auth tách web; command SECURITY DEFINER, kiểm role DB, API requery, tiền muộn vào suspense |
| 0026 | Challenge OTP và command ký/nhận tiền; view vai có cooling |
| 0027 | Audit chain, payload UTC, backfill chuỗi lịch sử; nhãn số dư khung nhập khẩu |
| 0028 | Danh tính app lấy theo login, không tin user/org/actor GUC; đồng hồ runtime bỏ test_time |
| 0029 | Căn cứ/phần thừa hoàn tiền, Q06, ngân hàng nguồn, command điều chỉnh, backup notification, bảo vệ membership/chứng cứ phụ lục/biên nhận |

Bộ security gốc đã chạy trước và sau, không ghi vào security/. Lần sau dừng khi sec.make_order ký bằng SEC-OTP-B tự đặt, vì không có challenge verified. Bằng chứng: db/security-original-after.log (exit 2). Không đổi kiểm soát production để nhận OTP bịa.

Adapter db/tools/kiem-tra-bao-mat-tuong-thich.mjs đọc source bộ security, nâng fixture sang receipt OTP/API hợp lệ và bank role, nâng **4 ca hợp lệ** theo giao diện mới. **41 câu SQL tấn công giữ nguyên** (adapter tự so sánh trước/sau, từ chối nếu khác). Kết quả adapter: 41/41 chặn, 4/4 qua, 21/21 bất biến; db/security-compat-after.log. Đây là kết quả có adapter fixture, không gọi nó là lần chạy nguyên bản đã đạt. Một số ca gốc bị chặn sớm bởi bằng chứng bắt buộc mới; db/tests/110–115 kiểm riêng đúng HINT của D-03/04/07/09/10/11/14/15/17/18 với đầy đủ điều kiện khác.

| Mục | Tình trạng DB và bằng chứng |
|---|---|
| D-01 | App không DML, command lấy session_user, bank/auth có role riêng; thử giả GUC và chạy command với login không owner |
| D-03 | Constraint hoãn phạm vi đơn/khung, external đúng hai bên; ca thử có đủ quyết định vẫn bị chặn đúng phạm vi |
| D-04 | Correction bắt decision_id đúng transaction, đủ hai vai finance/supervisor khác người; có ca hợp lệ qua |
| D-07 | Đích chi bắt buộc bằng tài khoản phiên bản hiệu lực; lệnh cũ giữ snapshot |
| D-08 | Cọc muộn thành suspense + bank_return_tasks; không tăng cọc hoặc kích hoạt lại đơn |
| D-09 | CHECK webhook applied, receipt API và proof event; bank role thiếu API vẫn bị chặn |
| D-10 | Mã chuyển khoản bắt buộc; tiền mặt có biên nhận đúng đơn/khung |
| D-11 | ±7 ngày; quyết định backdate có hai người được thử cả chặn lẫn qua |
| D-14 | Chặn helper kiêm vai đặc quyền hai chiều; owner cấp, cooling 24h, outbox báo backup; chặn chuyển danh tính membership |
| D-15 | FK OTP, verified/binding/hạn/lần sai/dùng một lần; SHA256 chữ ký khớp helper security |
| D-17 | Phần thừa riêng event, số hoàn không vượt; phí theo căn cứ Q06, có ca hợp lệ và ca bịa/vượt bị chặn |
| D-18 | Lưu tài khoản nguồn, mọi hoàn trùng hash/ngân hàng/số che/tên, giới hạn tổng theo nguồn; chưa có bộ chống rửa tiền hoàn chỉnh |
| D-19 | **Một phần**: chuỗi SHA256 serialize khóa, payload UTC ổn định, xuất JSONL và kiểm độc lập bytes/checkpoint. **Chưa có kho WORM/lịch xuất/checkpoint ngoài DB**; owner vẫn là trust root |
| D-02/05/06/12/13/16 | Giữ các kiểm soát đã đóng trước đó, adapter và bộ DB tiếp tục đạt |

205/205 gồm kiểm SQL và đối chiếu Node độc lập cho OTP/audit. SQL riêng qua psql có 202 assertions; 3 đối chiếu Node được runner PGlite thêm. Không coi tổng này là 205 workflow ứng dụng. Generator seed và các script Node/shell đã kiểm cú pháp; replay migrate/seed không ghi trùng. 124 bảng nghiệp vụ không tính một bảng ánh xạ trong cmd.

Giới hạn nâng cấp: receipt/OTP lịch sử không được tự bịa. FK OTP chữ ký và CHECK chứng cứ confirmation giữ NOT VALID cho chứng từ cũ, vẫn bắt mọi hàng mới; migration sẽ dừng với dữ liệu sai CHECK khác thay vì âm thầm sửa lịch sử. Chưa chạy nâng cấp trên snapshot production hoặc kiểm sửa dữ liệu lịch sử. Không dùng seed để nâng cấp DB có tiền cần giữ.

## Đối chiếu mục 9 và đợt N-01…N-16, 26/10/2026

Đã đọc mục 9 `docs/nghiep-vu/00-tong-quan.md`, công thức mục 6/7.12 của `04`. Không sửa `security/` hoặc migrations 0001–0029. Ba migration mới:

| Migration | Phần thực hiện |
|---|---|
| 0030 | Tiền thiếu theo đơn/khung chưa là C; đủ C+F mới tách, thừa và phí ở sổ riêng; phân loại số dư cũ bằng bút toán mới; giữ G_them và công thức chi tạm N-08; kiểm held và phạm vi tranh chấp/kiểm định |
| 0031 | Chính sách hai người/chờ 24h, QR một lần/lời mời theo số + OTP, tiền mặt ký hai bên và cảnh báo 20 triệu, tổ hợp tác không nhận tiền chung, giữ lệnh tài khoản mới/gọi lại, chứng cứ API cho đối soát ngoại lệ |
| 0032 | Hoàn tiền treo đúng nguồn qua API và command bank worker; tự xếp task tiền thiếu hết hạn; view BT-T1 chỉ trên C |

Kiểm số: TH-029 chi tạm 9.570.000/giữ 4.230.000; A hoàn 4.230.000, T_nb=0 và người bán ròng 41.770.000; B chi thêm 2.580.000/hoàn 1.650.000; TH-031 chi thêm 1.290.000/hoàn 2.940.000, không tiền ngoài app. Bài 130 thực ghi bản tạm vào DB, ép G_them=0 và hold_formula_version=1 vẫn bị DB tính theo công thức mới, chi cũ 9.850.000 bị chặn; bài 135 phát lệnh/nhận callback 9.570.000 và giữ đúng 4.230.000. Các nhánh kết luận A/B/50-50 hiện kiểm số học, chưa phải cả ba workflow app xuyên suốt.

Bộ 120–135 kiểm tiền C còn thiếu F, không mở liên lạc/active, ép held, replay, thừa ngoài C và ngăn trong lệnh, tiền muộn, hoàn đúng/sai nguồn, tiền thiếu hết hạn; OTP sai khoản/purpose/jti, biên nhận thiếu chữ ký/sai khoản; policy thiếu quyết định/tự duyệt/sửa nội dung/chưa 24h/chưa hiệu lực; tiền mặt 19.999.999/20.000.000/33.320.000; giữ lệnh mới, ngưỡng 72h, số chủ đã xác minh và login app thực gọi command nhả lệnh. Seed bỏ tài khoản chung tổ hợp tác, giữ snapshot JSON, không bịa hộ mới.

**Kết quả cuối:** baseline PGlite 205/205; sau sửa **285/285**, 125 bảng nghiệp vụ. Replay migrate/seed không đổi số bản ghi. Nâng cấp 0029 → 0032 **6/6**, trên DB thử đã có bút toán và số dư, không phải schema rỗng. Báo cáo: `db/test-results.json`, `db/upgrade-n01-n16-results.json`; logs `db/baseline-n01-n16.log`, `db/n01-n16-test-run.log`, `db/upgrade-n01-n16.log`.

Lệnh yêu cầu `node security/tests/db/kiem-tra-db.mjs --chi-tiet` đã chạy trước và sau; đều **exit 2 tại fixture SEC-OTP-B chưa verified**, chưa tới 45 ca, nên không báo 45/45 từ lệnh gốc. Logs `db/security-n01-n16-before.log`, `db/security-n01-n16-after.log`. Adapter sẵn có trong db/ cũng chạy lại, không đổi adapter hoặc 41 SQL tấn công: **41/41 chặn, 4/4 hợp lệ qua, 21/21 bất biến đạt**, exit 0; `db/security-n01-n16-compat.log`. Lần kiểm giữa phát hiện mốc kích hoạt seed sớm hơn cooldown; đã sửa mốc thử nhập khẩu thành 02/10 sau ngày tạo 01/10, không thay query security để che lỗi.

**Giới hạn còn rõ:** DB chưa triển khai Ed25519 offline, FIDO2/biometric trên thiết bị, SMS/điện thoại/ngân hàng thật, sandbox xác minh tệp công khai, kênh ký kết quả kiểm định, hay cuộc gọi tự động N-16. N-03/05/07/10/11/16 vẫn có phần triển khai thuộc backend/hạ tầng; không gọi đợt này là đóng toàn bộ N-01…N-16. N-12 command scan yêu cầu danh tính đã ánh xạ và membership; onboarding người được mời mới cần broker riêng. N-09 chưa có command web công bố chính sách. Phí kiểm định ở G_them dựa trên bản ghi ứng phí nghiệp vụ, chưa có tích hợp xác minh khoản ứng bên ngoài. Cờ tiền mặt chưa phải tư vấn pháp lý về trần tiền mặt.

**Nâng cấp:** bút toán lịch sử không UPDATE/DELETE; C thiếu/thừa được phân loại bằng transaction mới có khóa ổn định. Nếu có lệnh hoàn thừa cũ đang created/sent/processing, 0030 dừng để đối soát trước, không đổi nguồn tiền của lệnh đang chạy. Bản tạm lịch sử mang hold_formula_version=1 để không tính lại số đã chi; mọi bản mới bị buộc phiên bản 2. Không chạy seed trên DB production có dữ liệu cần giữ. Snapshot production, đua nhiều kết nối và hệ thống ngân hàng thật chưa được thử.

## Chưa kiểm chứng trên hạ tầng thật

Chưa thử hai kết nối giành cùng lô/cọc/khung, isolation serialization/retry, deadlock, nhiều worker SKIP LOCKED, REFRESH CONCURRENTLY, kế hoạch truy vấn với dữ liệu lớn, p95, crash recovery, PITR/restore, replication, xoay khóa, dịch vụ ngân hàng hay object storage. PGlite không thay thế các kiểm chứng này.

Bộ hiện tại là nền database có kiểm thử thực và ranh giới rõ để tiếp tục xây backend. Chưa đủ bằng chứng để công bố “sẵn sàng nhận tiền thật” hoặc “khớp đầy đủ mọi workflow production”.
