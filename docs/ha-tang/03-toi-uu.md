# 03 · Điểm nghẽn và tối ưu

> Phạm vi lịch sử 25/10/2026: khảo sát/bộ đo stub. Stack ứng dụng thật trên Oracle cập nhật ở [06](06-trien-khai-oracle-free.md), kết quả tiếp phiên ở [05](05-danh-gia-thanh-that.md). Không dùng Compose stub để triển khai app thật.

## Đã thay đổi và đo thật

Mọi thay đổi SQL dưới đây chỉ áp dụng cho `bench`, không sửa migration thật của nhóm DB. So sánh trên cùng seed quy mô 1, cùng affinity CPU, API một tiến trình/pool 10, đặt lại dữ liệu phát sinh giữa lượt. Tải mở đến đều; ngẫu nhiên chọn nhu cầu/mặt hàng/người mua, chưa cố định RNG phía HTTP và chưa lặp nhiều lần để tính khoảng tin cậy.

| Phép đo | Tải / thời gian phát | p50 trước → sau (ms) | p95 trước → sau (ms) | p99 trước → sau (ms) | Lỗi trước → sau |
|---|---|---:|---:|---:|---:|
| Ghép + giá tham khảo | 60/s, 30 giây | 5002,1 → 4,6 | 5352,8 → 18,6 | 5481,1 → 22,1 | 19% → 0% |
| Webhook ngân hàng | 200/s, 20 giây | 5001,8 → 4,2 | 5393,8 → 5,8 | 5540,5 → 7,8 | 83,73% → 0% |

Nguồn JSON: `21-doc-truoc`, `24-doc-sau`, `22-webhook-truoc`, `25-webhook-sau` trong `infra/load/ket-qua/`. Tỷ lệ lỗi tính trên HTTP response/timeout; before phần lớn lỗi pool timeout trả HTTP 500 ở stub, không phải mất tiền hoặc hỏng DB. Throughput hoàn tất gồm lỗi, tính cả thời gian xả cuối lượt: đọc 51,1 → 59,6 request/s; webhook 157,3 → 197,9 request/s. Số trả thành công nhỏ hơn throughput khi có lỗi.

### 1. Đọc nặng: chỉ mục + materialized view

Bản trước đọc giá trung vị từ 440.000 đơn và ghép trên 300.000 lô. SQL giá trung bình khoảng 289,34 ms/call, ghép 193,94 ms/call; ở 60 request/s pool 10 đầy và request chờ tới timeout. Bản sau thêm chỉ mục từng phần `lots` đang mở, chỉ mục danh sách theo `(commodity_id, created_at DESC, id DESC)`, chỉ mục nguồn giá và đọc MV. SQL ghép còn trung bình 9,98 ms, đọc MV 0,02 ms trong lượt đo. Đây là tác động **của gói thay đổi**, chưa tách riêng mức đóng góp từng chỉ mục hay MV.

Giá MV giữ điều kiện tối thiểu 3 đơn và 2 cặp, loại đơn bất thường/cặp bị đánh dấu/đơn ngoài app. Khi backend thật chốt hợp đồng phải chụp giá tham khảo và nguồn vào phiên bản hợp đồng, không tính lại rồi đổi hợp đồng đã ký. MV trễ tối đa 5 phút là mức đề xuất cho dữ liệu giá hiển thị; lệnh ghi tiền/lượng vẫn đi vào DB gốc.

Đã sửa lỗi kế thừa: unique index dùng biểu thức `coalesce(province_code,-1)` không đủ điều kiện `REFRESH ... CONCURRENTLY`. Thêm cột kết quả `province_key`, index unique trên cột thường. Đã chạy refresh concurrent thật, mất khoảng 233 ms (`23-sql.json`). Lịch refresh 5 phút chưa được bật tự động; cần job có khóa chống chạy chồng, theo dõi `refreshed_at`, báo khi dữ liệu quá hạn. PostgreSQL yêu cầu index unique phủ mọi dòng, chỉ dùng tên cột để refresh concurrent; xem [tài liệu PG17](https://www.postgresql.org/docs/17/sql-refreshmaterializedview.html).

### 2. Webhook: truy cập tài khoản sổ cái

Dữ liệu có khoảng 862.000 tài khoản sổ cái. Hàm bản trước lọc nhiều điều kiện `IS NOT DISTINCT FROM`, dẫn tới đọc tốn CPU trong đường ghi bút toán. Bản sau rẽ nhánh phạm vi order/org/global, dùng phép bằng trên trường đã biết khác NULL, thêm chỉ mục phù hợp. Không bỏ trigger kiểm cân hay transaction để lấy số nhanh.

SQL chèn bút toán (bao gồm gọi hàm/trigger) giảm trung bình từ 191,90 xuống 0,41 ms; CPU PostgreSQL trung bình từ 389% xuống 19% (100% là một CPU logic). Sau tối ưu, 4.001 webhook đều HTTP 200: 3.599 áp thành công, 402 sự kiện trùng được bỏ qua; tổng tiền và số dư vẫn cân, không đơn nào ghi cọc hai lần. Trong stub, một ngân hàng chuyển đủ cọc+phí được đơn giản hóa thành hai giao dịch. Backend thật phải dùng cơ chế nghiệp vụ `core.bank_events`/`ledger.apply_deposit_receipt` ở migration 0010, không sao chép SQL stub vào production.

Migration 0007 thật có thêm phạm vi `framework_id`, trigger/permissions khác. Kỹ sư DB cần viết nhánh đầy đủ cho cả hợp đồng khung, kiểm kế hoạch truy vấn trên dữ liệu thật, tạo index concurrently theo quy trình migration. Không kết luận mọi phép `IS NOT DISTINCT FROM` đều chậm hay phải bỏ.

### 3. Tách sinh PDF khỏi API

Có hai đường đo: `?mode=sync` tạo PDF trên event loop API; `?mode=queue` ghi bảng jobs, trả 202 và worker độc lập sinh tệp. Hai phép thử `32-pdf-sync.json`, `33-pdf-queue.json` dùng tải nền + PDF 10/s, 45 giây. Số tổng hợp được đưa vào file 02; **202 chỉ là nhận việc**, phải xem số done/failed/pending và thời gian từ tạo việc đến done, không so ack với hoàn thành PDF như cùng một thước đo.

Kết quả đo 450 PDF/lượt: API PDF đồng bộ p95 29,8 ms, nhận việc qua queue p95 4,1 ms; p95 ghép nguồn và webhook giảm theo bảng dưới. Queue hoàn thành 450/450 việc, không pending/failed cuối lượt; end-to-end p95 khoảng 28,0 ms, đo riêng trong JSON, không lấy thời gian 202 thay cho thời gian tạo tệp.

| Chỉ số | Đồng bộ | Hàng đợi |
|---|---:|---:|
| API PDF p95 (ms) | 29.8 | 4.1 |
| Ghép nguồn p95 (ms) | 24.1 | 17.7 |
| Webhook p95 (ms) | 29.7 | 8.4 |
| CPU API trung bình (%) | 24 | 2 |
| CPU worker trung bình (%) | 0 | 21 |

Không có lỗi HTTP trong hai lượt này; worker tăng CPU vì nhận phần việc chuyển từ API. Một PDF đơn giản trên laptop nhanh không đại diện PDF hợp đồng đầy đủ/Chromium/object storage.

PDFKit là sinh PDF thật có nhúng font tiếng Việt, file khoảng vài chục KB, chưa có đầy đủ QR/hash chain/chữ ký OTP/mẫu 6 loại hợp đồng; không đo Chromium render hoặc tải object storage. Queue hiện có claim `SKIP LOCKED`, retry giãn cách tối đa 5 lần. Chưa có khóa job duy nhất theo order+version, lease/heartbeat/reclaim khi worker chết, cấp version tài liệu nguyên tử hay object storage commit. Các điểm này là yêu cầu backend trước khi dùng thật.

## Điểm gãy quan sát được

Stress 5 bậc 50/100/200/400/600 request/s, mỗi bậc 25 giây: lỗi toàn bộ lần lượt 0/0/2,14/3/3%. Lỗi nằm ở voice: khi tới bậc 600/s, cả 450 lượt voice đều thất bại (374 HTTP 503, 76 HTTP 504); các luồng còn lại vẫn 2xx trong pha đó. AI 4 slot mô phỏng khoảng 1,2 giây/lượt không chịu được 18 voice/s. Đây là điểm nghẽn được cố ý mô hình hóa bằng slot và sleep, không phải benchmark GPU.

p99 tổng ở bậc 400–600/s thấp vì nhiều yêu cầu AI bị từ chối ngay, còn lỗi chờ 8 giây chỉ chiếm phần nhỏ. Không kết luận “tăng tải làm nhanh hơn”. 100/s chỉ không thấy lỗi trong 25 giây; chưa phải mức tải bền vững được chứng nhận. `28-stress.json` cho thấy 1.350 việc PDF done, end-to-end p95 khoảng 30,3 ms, không việc failed/queued cuối lượt, nhưng chưa đo restart worker.

## Biện pháp tiếp theo, chưa có số trước/sau

| Hạng mục | Cách áp dụng / điều cần kiểm |
|---|---|
| Phân trang | Keyset `(created_at,id)` đã có trong stub, 20 dòng/trang; dùng cursor opaque ở backend. Không dùng OFFSET sâu cho feed. Chưa đo riêng keyset so với OFFSET |
| Cache | MV giá đã đo; cache danh mục công khai bằng ETag, TTL. Giá trần/sàn kín và quyền xem liên hệ không được đưa vào cache chung thiếu tenant key |
| CDN/ảnh | App resize khoảng 1.600 px, nén WebP/JPEG, thumbnail; upload có URL ký và multipart/resume khi cần. Bài đo gửi buffer 250 KiB vào file system local, chưa đo CDN hay mạng yếu |
| Rate limit | Nginx 30/s theo IP cho API, ngân hàng riêng 350/s + burst 600, trả 429; đây là cấu hình khởi đầu chưa benchmark. IP NAT nông thôn có nhiều người chung: production thêm hạn mức theo user/org/thiết bị đã xác thực |
| Chống lặp | DB unique provider+event, transaction với outbox; đăng lô có khóa chống lặp. Production scope actor+route, lưu hash request và trả 409 nếu cùng khóa khác nội dung; chưa đủ ở stub |
| PgBouncer | Transaction pooling khi nhiều replica; dành direct/session connection cho LISTEN, tenant context `SET LOCAL`; đặt trần tổng kết nối. Chưa bật/đo |
| AI | Queue hữu hạn, timeout 8 giây ở stub, nhập tay dự phòng; đưa yêu cầu dài sang job, giới hạn theo tổ chức, không giữ DB transaction. Phải đo lại STT/LLM thật, GPU/API cost và cancellation |
| Mạng yếu/PWA | Cache app shell/danh mục, nháp IndexedDB, trạng thái “chưa gửi”; retry exponential backoff+jitter và giữ nguyên idempotency key; không hiển thị đã cọc/đã ký trước server xác nhận |
| QR offline | Có thể lưu thao tác chờ đồng bộ và giờ thiết bị, nhưng xác thực cửa sổ/người nhận, chống replay và chuyển nghiệp vụ ở server. Không chốt rủi ro hoặc giải ngân offline; OTP dự phòng đúng đặc tả cần rotation/khóa sau sai |

QR hiện ký HMAC và check hạn, transaction khóa delivery trước đổi scheduled→arrived một lần. Token không đủ ràng buộc order+đợt+người nhận, chưa xoay 5 phút, OTP cố định, chưa khóa sai 3 lần. Nhãn “arrived” chỉ là trạng thái bộ đo; chưa phải API giao nhận chính thức. Cần kiểm tra quyền người quét trước đọc dữ liệu, không dùng kết quả matching như xác minh chất lượng/uy tín.

## Ưu tiên bàn giao

1. Giữ bất biến tiền/lượng bằng transaction/unique/trigger; triển khai xác thực/RLS và ngữ nghĩa nghiệp vụ trước tăng tải.
2. Áp tối ưu truy vấn có kế hoạch thực thi, index thật và MV refresh; giới hạn kết nối và admission control cho từng loại việc.
3. Hoàn thiện queue PDF/AI với lease, retry, idempotency, timeout, đo thời gian hoàn thành và backlog; kiểm worker crash/replay.
4. Dùng object storage/CDN và test điện thoại mạng yếu; đo lại API thật qua proxy/TLS từ generator máy khác.
