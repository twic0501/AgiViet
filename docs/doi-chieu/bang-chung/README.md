# Bằng chứng đối chiếu, 27/10/2026

Đọc [bảng chính](../bang-doi-chieu.md), [CSV](../bang-doi-chieu.csv), [chỉ mục ảnh](../chi-muc-anh.html) và [album thao tác/mẫu 2](album-bo-sung.md). Bảng có các lớp chồng nhau; số dòng không là số tính năng độc lập.

## Phạm vi an toàn dữ liệu

- Mẫu 1 và mẫu 2 chỉ đọc. Không sửa mã frontend/backend/SQL, không build/deploy.
- Pilot 18888/operator 18889: GET và tạo phiên thử qua API loopback 18080; không reset, không ký/hủy/chuyển tiền/tua đồng hồ pilot.
- API suite và ca chuyển dùng `dungApp`, ép `databaseUrl=null`, PGlite bộ nhớ và tài liệu `/tmp/agv-audit-*`. Không dùng DATABASE_URL của pilot. Cache PGlite là dữ liệu chạy kiểm thử, không là sửa mã app.
- UI suite dùng backend riêng 18980/frontend 18990. Runner có guard đúng cặp cổng trước khi gọi `/v1/test/reset`. Phiên tranh chấp TH-031 dùng 19080/19090. Tất cả số tiền, OTP, PIN, ảnh upload là dữ liệu thử.
- Các script chụp có thể tạo phiên auth và làm cache thời tiết/tin cập nhật khi GET; không coi đó là hoàn toàn không có tác động runtime. Không có thao tác thay đổi nghiệp vụ pilot.

## Nội dung

| Tệp | Ý nghĩa |
|---|---|
| `du-lieu/nguon-truoc.json`, `nguon-sau.json` | Hash tệp nguồn được dùng ở 3 thư mục; đối chiếu để xác nhận không sửa mã trong audit. Không thay thế Git audit đầy đủ của mọi tệp máy. |
| `du-lieu/man-mau1-{ban,mua}.json` | 85/53 màn đăng ký từ cấu hình mẫu 1. Bảng có nguồn renderer khi tìm đúng registration. |
| `du-lieu/man-mau2-html.json`, `mau2-render.json` | Registry 82 màn trong app bán HTML; lần mở/render 5 HTML mẫu 2. |
| `du-lieu/ca-mau.json`, `kiem-thu-mau1.json` | 76 ca/kỳ vọng/dòng mã và 183 điểm kiểm engine mẫu 1, không là UI/live. |
| `du-lieu/ca-v2.json`, `kiem-thu-v2.json`, `kiem-thu-v2.log` | 66 định nghĩa tĩnh tìm thấy; runner thực chạy 65 (nhánh AI thật điều kiện không bật). 65/65, 475/475 API; không nói 66 đã chạy. |
| `du-lieu/ca-chuyen-v2.json`, `.log` | 5 adapter kiểm bổ sung, 3 nhóm đạt/2 nhóm thất bại; 19/21 điểm kiểm. B08/B18 giữ thất bại. M09/M30 chỉ phủ một phần/kỳ vọng theo v2. |
| `du-lieu/e2e-v2-hien-hanh.log`, `anh-e2e/ket-qua.json` | 9 bước UI đạt rồi dừng; runner đã sửa selector cho đúng form hiện tại, vẫn không có form vì sai quyền. `e2e-v2.log` là lần đầu còn selector cũ; không dùng nó để quy riêng lỗi app. |
| `du-lieu/e2e-chan-doan.log`, `anh-e2e-chan-doan/bo-qua-ui.json` | Đi tiếp bằng API thay bước UI lỗi rồi còn lại qua UI; có 60 ảnh và đơn tới completed. Log “15/15” có bypass, không là E2E thuần đạt. |
| `du-lieu/man-v2.json` | 307 lượt màn/trạng thái với URL, ảnh, header, Nghe, form, lỗi HTTP, đo cuộn. Hai lượt cuối dùng fixture TH-031 cô lập; quản trị dùng 18889. |
| `anh/`, `anh-e2e/`, `anh-e2e-chan-doan/` | Ảnh trước/cuộn, album thao tác. App bán cuộn trong `#app`, nên `fullPage` không có nghĩa chụp toàn chiều dài nội dung trong container; ảnh cuộn đi kèm để kiểm header. |
| `du-lieu/chup-nhanh-bi-429.*` | Lượt crawl trước khi điều tiết; giữ bằng chứng tần suất và lỗi, không dùng ảnh cũ đã bị ghi đè làm chứng cứ trạng thái. |
| `du-lieu/nguon-hang-khong-tiet-luu.json`, `chup-nguon-hang.log` | Lần chụp nguồn hàng không delay từng request đã render thành công. Delay của crawler làm timeout ở hai lượt trước; không quy đó là mất màn. |
| `du-lieu/do-danh-sach.json`, `.log` | 12 lượt đo chuyển tab từng frame ở 390/1280px, bật/tắt giảm chuyển động. Chạy UI cô lập 18990. |
| `du-lieu/loi-terms-500.json`, `loi-terms-documents.json` | API terms 500 của DEMO56-OFFTAKE và canonical_content dự thảo chỉ 3 thuộc tính. Không sửa fixture pilot. |
| `du-lieu/nghiem-thu-sau-ky.json` | Sau ký, dòng nghiệm thu đã closed nhưng response không có seller_agreed_at mà UI đang kiểm. |
| `du-lieu/live-mau1-*.json`, `live-mau1/`, `doi-chieu-live-mau1.json` | URL/hash/tệp Firebase: bằng chứng baseline local khác live; không khẳng định mọi tệp đều khác. |
| `../do-phu-route.csv`, `../chi-muc-anh.html` | Nhóm template route và chỉ mục lọc ảnh; kể cả thử sai route/quyền, không cộng chúng thành tính năng. |

`health.json` là pilot tại lúc đầu; `health-phien-tranh-chap.json` là fixture riêng, không ghi đè health pilot. Ngày thực ghi trong metadata/log ISO UTC; thời gian nghiệp vụ thử có thể ở tháng 11.

## Chạy lại có chủ đích

Từ thư mục gốc v2, các lệnh chỉ tạo báo cáo/kiểm bộ nhớ:

```sh
backend/node_modules/.bin/tsx docs/doi-chieu/bang-chung/scripts/kiem-thu-mau1.mts
LOG_LEVEL=silent backend/node_modules/.bin/tsx docs/doi-chieu/bang-chung/scripts/kiem-thu-v2.mts
LOG_LEVEL=silent backend/node_modules/.bin/tsx docs/doi-chieu/bang-chung/scripts/ca-chuyen-v2.mts
```

Chụp lại pilot dùng hai script theo thứ tự, không chạy đồng thời vì giới hạn auth/API chung. Chúng tạo phiên thử; ảnh/log cùng tên có thể bị ghi đè. Lượt crawl nhanh đã gặp 429, nên không bỏ bước điều tiết. Danh sách nguồn có N request chi tiết theo số lô; nếu điều tiết từng request làm quá timeout20giây, dùng script chụp nguồn riêng để kiểm lại sau khi ngân sách tần suất đã hồi phục.

```sh
node docs/doi-chieu/bang-chung/scripts/chup-man.mjs
node docs/doi-chieu/bang-chung/scripts/chup-bo-sung.mjs
node docs/doi-chieu/bang-chung/scripts/chup-nguon-hang.mjs
```

UI suite **chỉ khi đã khởi động cặp dịch vụ cô lập** 18980/18990 với PGlite bộ nhớ và `AGV_DOC_DIR=/tmp/agv-audit-ui-tai-lieu`:

```sh
FRONTEND_URL=http://127.0.0.1:18990 API_ORIGIN=http://127.0.0.1:18980 node docs/doi-chieu/bang-chung/scripts/e2e-v2.mjs
```

Lệnh này dự kiến vẫn thất bại ở bắt đầu cân cho đến khi app được sửa trong nhiệm vụ khác. Không đổi nó sang pilot để cố làm đạt. `e2e-chan-doan.mjs` chỉ để theo dõi các bước sau lỗi; phải đọc `bo-qua-ui.json` cùng kết quả.

Tái tạo bảng từ dữ liệu đã lưu:

```sh
python3 docs/doi-chieu/bang-chung/scripts/hang-bo-sung.py
python3 docs/doi-chieu/bang-chung/scripts/chi-muc.py
python3 docs/doi-chieu/bang-chung/scripts/lap-bang.py
```

Không có chủ trương tự mở lại dịch vụ thử sau khi kết thúc audit. Các cổng 18980/18990/19080/19090 đã được đóng sau khi thu bằng chứng; pilot không bị dừng.
