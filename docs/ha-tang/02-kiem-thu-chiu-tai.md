# 02 · Kiểm thử chịu tải thực tế

> Phạm vi lịch sử 25/10/2026: khảo sát/bộ đo stub. Stack ứng dụng thật trên Oracle cập nhật ở [06](06-trien-khai-oracle-free.md), kết quả tiếp phiên ở [05](05-danh-gia-thanh-that.md). Không dùng Compose stub để triển khai app thật.

## Máy đo, dữ liệu và cách chạy

Ngày 25/10/2026, laptop Intel i9-13950HX, 32 CPU logic, RAM 15,3 GiB, NVMe; Node v24.18.0, PostgreSQL 17.10. Docker daemon không hoạt động. Chạy trực tiếp qua `infra/scripts/do-cuc-bo.sh`, PG cổng 55434, API 8180, AI 8190, không dùng DB ứng dụng cổng 55432. Một API process, pool 10; một worker PDF; AI 4 slot/queue 50. PostgreSQL shared_buffers 512 MB, work_mem 8 MB, max_connections 200. Ghim PG 0–3, API+AI 4–5, worker 6–7, generator 8–9; affinity không phải quota VPS.

Seed riêng trong bench: 22.001 tổ chức, 300.000 lô (~60.000 mở), 30.000 nhu cầu, 440.000 đơn (400.000 hoàn tất + 20.000 chờ cọc + 20.000 giao), 1.680.000 bút toán và khoảng 862.000 tài khoản. DB ban đầu 968 MB; sau thao tác/index khoảng 1,1 GB (`23-sql.json`). Không thay hoặc nạp đè dữ liệu nghiệp vụ ảo của nhóm DB.

Bộ tạo tải mô hình mở: phát theo tốc độ đến đều, bước timer 10 ms, không chờ response trước phát lượt mới; timeout client 30 giây, trần in-flight 4.000, cuối lượt chờ xả tối đa 35 giây. Không phải Poisson hoặc browser test. Timestamp kết quả là lúc ghi cuối lượt theo UTC; giờ Việt Nam cộng 7. Percentile đo từ lúc client phát fetch tới khi đọc hết response; lỗi cũng nằm trong percentile. Error gồm HTTP ngoài 2xx/timeout. DROP báo riêng, không đưa latency 0 giả vào percentile.

Tải 50/s là **giả định mùa vụ**, không phải thống kê người dùng: 4.000 người bán hoạt động/giờ × khoảng 4 thao tác API ≈ 4,4/s; 600 bên mua × 40 lượt đọc/giờ ≈ 6,7/s; webhook/QR/PDF/AI khoảng 5/s; cộng khoảng 16–17/s rồi dự phòng 3 lần. Phân bổ để thử cả đường ghi và việc nặng: duyệt lô 15/s, ghép 6/s, giá 7,5/s, đăng lô 4/s, webhook 4/s, QR 5/s, PDF 2/s, voice 1,5/s, ảnh 5/s. Ảnh 250 KiB; đăng lô/webhook có khoảng 10% request lặp. Không suy ra tất cả người đăng đều gửi đúng tỷ lệ ảnh này; đây là tải tổng hợp để tìm bottleneck.

Các bài dùng chung tiến trình AI, reset bench nhưng không reset hàng chờ AI; backlog sau stress có thể ảnh hưởng nền đầu spike. Tệp ảnh/PDF không bị xóa giữa bài.

Bài trước/sau giữ nguyên cấu hình, reset phần dữ liệu phát sinh và VACUUM ANALYZE giữa lượt. Sau đó dùng MV + PDF queue cho tải trộn, trừ cặp PDF sync/queue. Mỗi cặp mới chạy một lần, chưa có confidence interval. Smoke chức năng có assertion riêng ở `20-khoi.txt`.

## Kết quả HTTP

Đơn vị latency: ms. “Phát/xả” là thời gian phát tải / tổng thời gian tới khi đọc xong response cuối. “RPS pha” lấy số response thuộc pha chia thời gian pha; throughput hoàn tất thực ở bảng tiếp theo tính cả xả, gồm cả lỗi. 202 chỉ xác nhận nhận việc PDF.

| File | Pha | Số request | RPS pha | p50 | p95 | p99 | Lỗi % |
|---|---|---:|---:|---:|---:|---:|---:|
| 21-doc-truoc | doc | 1800 | 60 | 5002,1 | 5352,8 | 5481,1 | 19 |
| 22-webhook-truoc | webhook | 4001 | 200,1 | 5001,8 | 5393,8 | 5540,5 | 83,73 |
| 24-doc-sau | doc | 1800 | 60 | 4,6 | 18,6 | 22,1 | 0 |
| 25-webhook-sau | webhook | 4001 | 200,1 | 4,2 | 5,8 | 7,8 | 0 |
| 26-smoke | pilot | 149 | 5 | 3,8 | 21,3 | 1031,1 | 0 |
| 27-load | tang | 373 | 24,9 | 9,8 | 26,8 | 1863,3 | 0 |
| 27-load | cao_diem | 4500 | 50 | 3,2 | 17,5 | 1506,4 | 0 |
| 28-stress | x1 | 1249 | 50 | 3,4 | 17,5 | 1322,2 | 0 |
| 28-stress | x2 | 2500 | 100 | 3,2 | 16 | 1482 | 0 |
| 28-stress | x4 | 5000 | 200 | 3 | 14,3 | 8001,8 | 2,14 |
| 28-stress | x8 | 10000 | 400 | 2,9 | 12,8 | 21,6 | 3 |
| 28-stress | x12 | 15000 | 600 | 2,9 | 13,9 | 21 | 3 |
| 29-spike | nen | 1000 | 50 | 3,3 | 15,9 | 2240,5 | 0 |
| 29-spike | dot_bien | 9651 | 482,6 | 3,8 | 12 | 18,3 | 0 |
| 29-spike | hoi_phuc | 1000 | 50 | 3,2 | 15,8 | 1528,4 | 0 |
| 30-dang-lo | dang_lo | 3600 | 120 | 3,6 | 17 | 52,6 | 0 |
| 31-qr | qr | 1874 | 62,5 | 3,8 | 10,6 | 1050,7 | 0 |
| 32-pdf-sync | pdf_tron | 2609 | 58 | 11,3 | 29 | 1537,4 | 0 |
| 33-pdf-queue | pdf_tron | 2609 | 58 | 3,4 | 14,5 | 1491,3 | 0 |
| 34-soak | ngam | 9000 | 50 | 3,3 | 22,8 | 1403 | 0 |

| File | Phát/xả (s) | Throughput hoàn tất /s | DROP | In-flight tối đa | Lag timer max (ms) |
|---|---:|---:|---:|---:|---:|
| 21-doc-truoc | 30/35,229 | 51,1 | 0 | 312 | 18,8 |
| 22-webhook-truoc | 20/25,433 | 157,3 | 0 | 1018 | 28,6 |
| 24-doc-sau | 30/30,22 | 59,6 | 0 | 3 | 17,8 |
| 25-webhook-sau | 20/20,222 | 197,9 | 0 | 6 | 16,7 |
| 26-smoke | 30/30,226 | 4,9 | 0 | 9 | 16,9 |
| 27-load | 105/106,441 | 45,8 | 0 | 12 | 26,7 |
| 28-stress | 125/132,47 | 254,8 | 0 | 58 | 20,8 |
| 29-spike | 60/61,238 | 190,3 | 0 | 22 | 22,6 |
| 30-dang-lo | 30/30,223 | 119,1 | 0 | 38 | 19,9 |
| 31-qr | 30/31,228 | 60 | 0 | 12 | 19,2 |
| 32-pdf-sync | 45/46,031 | 56,7 | 0 | 12 | 20,8 |
| 33-pdf-queue | 45/46,028 | 56,7 | 0 | 12 | 21,8 |
| 34-soak | 180/181,231 | 49,7 | 0 | 12 | 29,4 |

## Tài nguyên

Lấy mẫu /proc mỗi giây; 100% CPU = một CPU logic. Cột bộ nhớ có tên rss trong JSON nhưng ưu tiên PSS (chia trang dùng chung); không cộng RSS mọi backend PG để kết luận RAM vật lý. AI ở file 21–25 bị nhận nhầm thêm generator, không sử dụng; đã sửa từ file 26. Không đo IOPS/WAN hay cgroup memory limit.

| File | PG CPU TB % / bộ nhớ max MiB | API CPU TB % / max MiB | Worker CPU TB % / max MiB | AI CPU TB % / max MiB |
|---|---:|---:|---:|---:|
| 21-doc-truoc | 237 / 609 | 3 / 88 | 0 / 58 | không dùng |
| 22-webhook-truoc | 389 / 595 | 5 / 137 | 0 / 58 | không dùng |
| 24-doc-sau | 29 / 597 | 2 / 79 | 0 / 58 | không dùng |
| 25-webhook-sau | 19 / 582 | 6 / 129 | 0 / 39 | không dùng |
| 26-smoke | 1 / 588 | 1 / 141 | 3 / 64 | 0 / 23 |
| 27-load | 8 / 593 | 2 / 150 | 6 / 219 | 0 / 25 |
| 28-stress | 39 / 600 | 7 / 178 | 24 / 219 | 0 / 31 |
| 29-spike | 31 / 600 | 3 / 178 | 4 / 219 | 0 / 31 |
| 30-dang-lo | 5 / 598 | 4 / 199 | 0 / 219 | 0 / 31 |
| 31-qr | 5 / 599 | 2 / 202 | 2 / 217 | 0 / 29 |
| 32-pdf-sync | 8 / 600 | 24 / 302 | 0 / 217 | 0 / 29 |
| 33-pdf-queue | 9 / 597 | 2 / 309 | 21 / 218 | 0 / 30 |
| 34-soak | 8 / 598 | 2 / 320 | 4 / 218 | 0 / 30 |

## Các luồng chính và ngữ nghĩa kết quả

| File | Pha / luồng | Số request | p50 | p95 | p99 | HTTP codes |
|---|---|---:|---:|---:|---:|---|
| 27-load | tang / mua_ghep | 45 | 15,4 | 29,3 | 34,1 | `{"200": 45}` |
| 27-load | tang / qr_quet | 37 | 14 | 22,9 | 299,2 | `{"200": 37}` |
| 27-load | tang / webhook | 30 | 16,6 | 24 | 24 | `{"200": 30}` |
| 27-load | tang / pdf | 15 | 12,7 | 19,5 | 19,5 | `{"202": 15}` |
| 27-load | tang / giong_noi | 11 | 1224,3 | 2735,1 | 2735,1 | `{"200": 11}` |
| 27-load | cao_diem / mua_ghep | 540 | 12,2 | 21,3 | 23,9 | `{"200": 540}` |
| 27-load | cao_diem / qr_quet | 450 | 4,3 | 5,7 | 7,4 | `{"200": 450}` |
| 27-load | cao_diem / webhook | 360 | 6,6 | 9,2 | 14,5 | `{"200": 360}` |
| 27-load | cao_diem / pdf | 180 | 3,1 | 3,6 | 4,1 | `{"202": 180}` |
| 27-load | cao_diem / giong_noi | 135 | 1324 | 2583,6 | 3278,7 | `{"200": 135}` |
| 28-stress | x8 / mua_ghep | 1200 | 11,1 | 18,1 | 21,3 | `{"200": 1200}` |
| 28-stress | x8 / pdf | 400 | 2,9 | 4,1 | 6,6 | `{"202": 400}` |
| 28-stress | x8 / giong_noi | 300 | 3,4 | 8002,5 | 8003,2 | `{"503": 223, "504": 77}` |
| 28-stress | x12 / mua_ghep | 1800 | 11,2 | 19,6 | 25,4 | `{"200": 1800}` |
| 28-stress | x12 / pdf | 600 | 2,9 | 7,9 | 12,9 | `{"202": 600}` |
| 28-stress | x12 / giong_noi | 450 | 3,1 | 8002,2 | 8003,3 | `{"503": 374, "504": 76}` |
| 29-spike | dot_bien / webhook | 6001 | 4,1 | 6,1 | 10,1 | `{"200": 6001}` |
| 29-spike | dot_bien / mua_ghep | 1000 | 11,1 | 18,2 | 20,9 | `{"200": 1000}` |
| 30-dang-lo | dang_lo / ban_dang_lo | 3000 | 3,8 | 17,3 | 52,6 | `{"200": 289, "201": 2711}` |
| 31-qr | qr / qr_quet | 1200 | 3,9 | 5 | 10,6 | `{"200": 1200}` |
| 32-pdf-sync | pdf_tron / pdf | 450 | 24 | 29,8 | 36 | `{"201": 450}` |
| 32-pdf-sync | pdf_tron / mua_ghep | 270 | 13,9 | 24,1 | 26,9 | `{"200": 270}` |
| 33-pdf-queue | pdf_tron / pdf | 450 | 3,3 | 4,1 | 4,9 | `{"202": 450}` |
| 33-pdf-queue | pdf_tron / mua_ghep | 270 | 11,6 | 17,7 | 19,4 | `{"200": 270}` |
| 34-soak | ngam / mua_ghep | 1080 | 11,5 | 25,1 | 29,8 | `{"200": 1080}` |
| 34-soak | ngam / qr_quet | 900 | 4,6 | 5,8 | 24,1 | `{"200": 900}` |
| 34-soak | ngam / webhook | 720 | 6,5 | 22,9 | 27,7 | `{"200": 720}` |
| 34-soak | ngam / pdf | 360 | 3,1 | 7 | 24,7 | `{"202": 360}` |
| 34-soak | ngam / giong_noi | 270 | 1175,6 | 2384,4 | 3223,4 | `{"200": 270}` |

Kết quả nghiệp vụ (đếm chung QR/webhook trong mỗi lượt, không đồng nghĩa giao dịch thương mại hoàn tất):

- `25-webhook-sau`: `{"ok": 3599, "trung_lap": 402}`.
- `28-stress`: `{"ok": 4498, "trung_lap": 264, "already_scanned": 1313}`.
- `29-spike`: `{"ok": 5813, "trung_lap": 630, "already_scanned": 18}`.
- `31-qr`: `{"ok": 1036, "trung_lap": 6, "already_scanned": 218}`.

Quét lại đúng token trả already_scanned là đáp ứng hợp lệ; lần đầu trong cửa sổ mới đổi dấu trạng thái. Chưa xác thực người quét hay nghiệm thu/chuyển rủi ro của backend thật. Smoke thử 10 lượt đồng thời trên cùng token: 1 ok + 9 already_scanned.

## PDF hoàn thành và toàn vẹn

`33-pdf-queue`: cuối lượt PDF `{"counts": {"done": 450}, "end_to_end_ms": [24.381, 28.010899999999992, 30.17552999999999]}`. `end_to_end_ms` là p50/p95/p99 từ created_at đến done_at; chỉ bao gồm việc đã done, phải đọc cùng số pending/failed.

`34-soak`: cuối lượt PDF `{"counts": {"done": 360}, "end_to_end_ms": [24.756500000000003, 27.83605, 28.74104]}`. `end_to_end_ms` là p50/p95/p99 từ created_at đến done_at; chỉ bao gồm việc đã done, phải đọc cùng số pending/failed.

Mỗi lượt kiểm tổng bút toán, giao dịch lệch tổng, số dư hiện tại so với tổng bút toán, đơn có hai giao dịch deposit_in, số jobs queued/failed. Xem trường toan_ven trong JSON cho kết quả chính xác. Đây chưa là bộ kiểm mọi bất biến của schema thật; truy vấn số dư hiện tại chỉ kiểm các tài khoản có trong bảng tổng hợp, không chứng minh không thiếu dòng tổng hợp.

Kết quả kiểm cuối phiên:

```json
{
  "jobs": [
    {
      "status": "done",
      "n": 360
    }
  ],
  "pdf": [
    {
      "pdf_end_to_end_ms": [
        24.756500000000003,
        27.83605,
        28.74104
      ]
    }
  ],
  "qr": [
    {
      "dot_quet_hai_lan": "0"
    }
  ],
  "doi_soat_day_du": [
    {
      "so_du_thieu_hoac_lech": "0",
      "giao_dich_thieu_hoac_lech": "0",
      "lo_lech_luong": "0"
    }
  ]
}
```

## Sao lưu và khôi phục thật

```text
dump_seconds=14
restore_seconds=11
 orders 
--------
 440000
(1 row)

 transactions 
--------------
       841314
(1 row)

 ledger_sum 
------------
          0
(1 row)

-rw-r--r-- 1 twictrn twictrn 241M Oct 25 13:22 /home/twictrn/agiviet-production-v2/infra/.local/do-sre/backup.dump
```

Dump định dạng custom và restore vào DB mới trên cùng laptop/SSD, kiểm số đơn/giao dịch và tổng ledger; đã xóa DB restore sau phép thử. Thời gian trên không bao gồm tải backup ngoài máy, DNS, secrets, kiểm toàn bộ số dư/ảnh/PDF hoặc người vận hành. Không dùng kết quả này để cam kết RTO production.

## Giới hạn kết luận

Ở 50/s, xem riêng các route ngắn và AI để đánh giá: AI là sleep ngẫu nhiên nên p99 tổng có thể cao dù SQL nhanh. Tải stress có thể vượt sức chứa AI mà API đọc/ghi vẫn phục vụ được; không gọi mức đó là capacity sản phẩm. Spike là 300 webhook/s + 50 ghép/s + 100 giá/s kèm nền, không phải đồng thời tất cả người dùng thực. Soak 3 phút không chứng minh không rò bộ nhớ trong nhiều ngày. Các file JSON lưu đủ pha, flow, HTTP codes, tài nguyên và top SQL để đối chiếu. Đánh giá chi tiết ở file 05.
