#!/usr/bin/env python3
"""Tổng hợp lại file 02 từ JSON, không tạo số đo giả khi thiếu kết quả."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
R=ROOT/'infra/load/ket-qua'
labels=['21-doc-truoc','22-webhook-truoc','24-doc-sau','25-webhook-sau','26-smoke','27-load','28-stress','29-spike','30-dang-lo','31-qr','32-pdf-sync','33-pdf-queue','34-soak']
data=[json.loads((R/(n+'.json')).read_text()) for n in labels]
f=lambda x: str(x).replace('.',',')
lines=['''# 02 · Kiểm thử chịu tải thực tế

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
|---|---|---:|---:|---:|---:|---:|---:|''']
for n,d in zip(labels,data):
 for p in d['pha']:
  lines.append('| '+ ' | '.join([n,p['pha'],str(p['so_yc']),f(p['yc_giay']),f(p['p50']),f(p['p95']),f(p['p99']),f(p['loi_pct'])])+' |')
lines += ['\n| File | Phát/xả (s) | Throughput hoàn tất /s | DROP | In-flight tối đa | Lag timer max (ms) |','|---|---:|---:|---:|---:|---:|']
for n,d in zip(labels,data):
 # Tổng thời gian phát đọc từ scenario hiện tại và hệ số được lưu, không đoán theo kết quả.
 durations={'21-doc-truoc':30,'22-webhook-truoc':20,'24-doc-sau':30,'25-webhook-sau':20,'26-smoke':30,'27-load':105,'28-stress':125,'29-spike':60,'30-dang-lo':30,'31-qr':30,'32-pdf-sync':45,'33-pdf-queue':45,'34-soak':180}
 lines.append(f"| {n} | {durations[n]}/{f(d['thoi_gian_giay'])} | {f(d['throughput_hoan_tat'])} | {d['bo_lo_do_qua_dong_thoi']} | {d['dong_thoi_toi_da']} | {f(d['generator_lag_max_ms'])} |")
lines+=['''
## Tài nguyên

Lấy mẫu /proc mỗi giây; 100% CPU = một CPU logic. Cột bộ nhớ có tên rss trong JSON nhưng ưu tiên PSS (chia trang dùng chung); không cộng RSS mọi backend PG để kết luận RAM vật lý. AI ở file 21–25 bị nhận nhầm thêm generator, không sử dụng; đã sửa từ file 26. Không đo IOPS/WAN hay cgroup memory limit.

| File | PG CPU TB % / bộ nhớ max MiB | API CPU TB % / max MiB | Worker CPU TB % / max MiB | AI CPU TB % / max MiB |
|---|---:|---:|---:|---:|''']
for n,d in zip(labels,data):
 cells=[]
 for k in ['postgres','backend','worker','ai']:
  a=d['tai_nguyen'][k];cells.append('không dùng' if k=='ai' and int(n[:2])<=25 else f"{a['cpu_tb_pct']} / {a['rss_max_mb']}")
 lines.append('| '+n+' | '+' | '.join(cells)+' |')
lines+=['''
## Các luồng chính và ngữ nghĩa kết quả

| File | Pha / luồng | Số request | p50 | p95 | p99 | HTTP codes |
|---|---|---:|---:|---:|---:|---|''']
for n in ['27-load','28-stress','29-spike','30-dang-lo','31-qr','32-pdf-sync','33-pdf-queue','34-soak']:
 d=data[labels.index(n)]
 for a in d['luong']:
  selected=(n in ['27-load','34-soak'] and a['luong'] in ['mua_ghep','webhook','qr_quet','pdf','giong_noi']) or (n=='28-stress' and a['pha'] in ['x8','x12'] and a['luong'] in ['mua_ghep','giong_noi','pdf']) or (n=='29-spike' and a['pha']=='dot_bien' and a['luong'] in ['webhook','mua_ghep']) or (n=='30-dang-lo' and a['luong']=='ban_dang_lo') or (n=='31-qr' and a['luong']=='qr_quet') or (n in ['32-pdf-sync','33-pdf-queue'] and a['luong'] in ['pdf','mua_ghep'])
  if selected:lines.append(f"| {n} | {a['pha']} / {a['luong']} | {a['so_yc']} | {f(a['p50'])} | {f(a['p95'])} | {f(a['p99'])} | `{json.dumps(a['ma'])}` |")
lines += ['\nKết quả nghiệp vụ (đếm chung QR/webhook trong mỗi lượt, không đồng nghĩa giao dịch thương mại hoàn tất):\n']
for n in ['25-webhook-sau','28-stress','29-spike','31-qr']:
 d=data[labels.index(n)];lines.append(f"- `{n}`: `{json.dumps(d['ket_qua_nghiep_vu'],ensure_ascii=False)}`.")
lines += ['''
Quét lại đúng token trả already_scanned là đáp ứng hợp lệ; lần đầu trong cửa sổ mới đổi dấu trạng thái. Chưa xác thực người quét hay nghiệm thu/chuyển rủi ro của backend thật. Smoke thử 10 lượt đồng thời trên cùng token: 1 ok + 9 already_scanned.

## PDF hoàn thành và toàn vẹn
''']
for n in ['33-pdf-queue','34-soak']:
 d=data[labels.index(n)];lines.append(f"`{n}`: cuối lượt PDF `{json.dumps(d.get('pdf_cuoi_luot'),ensure_ascii=False)}`. `end_to_end_ms` là p50/p95/p99 từ created_at đến done_at; chỉ bao gồm việc đã done, phải đọc cùng số pending/failed.\n")
for n,d in zip(labels,data):
 bad={k:v for k,v in d['toan_ven'].items() if k in ['tong_but_toan','gd_lech','so_du_lech','don_coc_hai_lan','viec_pdf_hong'] and int(v)!=0}
 if bad:lines.append(f"Cần xử lý `{n}`: `{bad}`.\n")
lines += ['''Mỗi lượt kiểm tổng bút toán, giao dịch lệch tổng, số dư hiện tại so với tổng bút toán, đơn có hai giao dịch deposit_in, số jobs queued/failed. Xem trường toan_ven trong JSON cho kết quả chính xác. Đây chưa là bộ kiểm mọi bất biến của schema thật; truy vấn số dư hiện tại chỉ kiểm các tài khoản có trong bảng tổng hợp, không chứng minh không thiếu dòng tổng hợp.

Kết quả kiểm cuối phiên:

```json''',(R/'35-ket-thuc.json').read_text().strip(),'```\n\n## Sao lưu và khôi phục thật\n\n```text',(R/'36-khoi-phuc.txt').read_text().strip(),'''```

Dump định dạng custom và restore vào DB mới trên cùng laptop/SSD, kiểm số đơn/giao dịch và tổng ledger; đã xóa DB restore sau phép thử. Thời gian trên không bao gồm tải backup ngoài máy, DNS, secrets, kiểm toàn bộ số dư/ảnh/PDF hoặc người vận hành. Không dùng kết quả này để cam kết RTO production.

## Giới hạn kết luận

Ở 50/s, xem riêng các route ngắn và AI để đánh giá: AI là sleep ngẫu nhiên nên p99 tổng có thể cao dù SQL nhanh. Tải stress có thể vượt sức chứa AI mà API đọc/ghi vẫn phục vụ được; không gọi mức đó là capacity sản phẩm. Spike là 300 webhook/s + 50 ghép/s + 100 giá/s kèm nền, không phải đồng thời tất cả người dùng thực. Soak 3 phút không chứng minh không rò bộ nhớ trong nhiều ngày. Các file JSON lưu đủ pha, flow, HTTP codes, tài nguyên và top SQL để đối chiếu. Đánh giá chi tiết ở file 05.
''']
(ROOT/'docs/ha-tang/02-kiem-thu-chiu-tai.md').write_text('\n'.join(lines))
print('Đã tổng hợp docs/ha-tang/02-kiem-thu-chiu-tai.md từ kết quả thực.')
