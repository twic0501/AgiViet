# AgiViet production v2 · Giao diện

Hai app HTML/CSS/JS module thuần, chung lớp API. Không cần cài thư viện hoặc build để mở app.

## Chạy

Từ thư mục dự án:

```sh
cd backend
AGV_DOC_DIR=/tmp/agiviet-v2-frontend-documents npm start
```

Terminal khác:

```sh
cd frontend
npm start
```

- App bán: http://127.0.0.1:8090/ban/
- App mua: http://127.0.0.1:8090/mua/
- Máy chủ frontend chuyển `/v1/*` và `/health*` tới `http://127.0.0.1:8080`. Đổi bằng `API_ORIGIN`, đổi cổng frontend bằng `PORT`.
- Không dùng `file://`: JS module, quyền truy cập và chuyển tiếp API cần HTTP.
- Trong dải Môi trường thử có tài khoản/OTP/PIN và công cụ thử ngân hàng. Công cụ chỉ hiện khi sức khỏe backend xác nhận `moi_truong=thu`; server vẫn kiểm quyền và môi trường.
- Điện thoại cùng mạng có thể mở IP LAN của máy ở cổng 8090. Camera, đọc QR và cài PWA trên thiết bị thật cần môi trường an toàn/HTTPS tương ứng. Chưa thực hiện kiểm thử thiết bị thật trong lượt này.

## Kiểm thử

```sh
npm test
npm run test:branches
npm run test:round2
npm run test:e2e
```

Ba lệnh Playwright đều **đặt lại dữ liệu môi trường thử** trước khi chạy. Không chạy chúng đồng thời. Dùng Playwright từ `createRequire(process.env.HOME + '/rnd idea/package.json')('playwright')` theo yêu cầu, không cài thêm Playwright trong dự án này. Có thể đổi máy chủ bằng `FRONTEND_URL` và `API_ORIGIN`.

- Unit **41/41** đạt; nhánh cũ **10/10** (18 ảnh), round2 **14/14** (41 ảnh), luồng thuận **15/15** (61 ảnh), đơn HD-3001 `completed`. Cả bốn exit 0, chạy tuần tự; tổng 120 ảnh.
- Cân lại tải chứng cứ mới vào đơn, giữ dòng không tranh chấp, người bán ký PIN đóng hồ sơ. Giảm giá hoàn cọc chênh, giữ phí Q06; mã cọc bổ sung TP hiện nguyên văn và sao chép đúng clipboard. Một nhóm round2 mới kiểm mã TP, các nhóm cũ giữ nguyên.
- Nhánh cũ ảnh lô bên mua tải thật 200, không còn ngoại lệ 404/fallback ảnh khi có mã ảnh. Round2 không có lỗi ngoài dự kiến; sáu HTTP 422/console thông báo HTTP là kiểm lỗi đầu vào có ghi rõ. Luồng thuận không có lỗi JS/console, không ghi HTTP riêng.
- API chưa có GET mã cọc bổ sung: mã hiện tại phản hồi ký cuối, sau reload/bên ký trước mở lại hiện chưa có mã; xem đề xuất backend. Chưa kiểm ngân hàng nhận khoản bổ sung, toàn bộ rút phần/vượt lượng hoặc thiết bị thật.
- Có thể chạy cả bốn bộ mặc định theo đúng thứ tự bằng `node scripts/check-round4.mjs`; cần backend 8080 và frontend 8090 đang chạy. Biên bản/log lưu tại `docs/frontend/kiem-thu-luot-4*`.
- Mục lục ảnh: chạy `python3 scripts/screenshot-index.py` sau ba bộ Playwright.

Kết quả và giới hạn: [đánh giá thành thật](../docs/frontend/danh-gia-thanh-that.md), [đề xuất backend](../docs/frontend/de-xuat-backend.md), [tiến độ](TIEN-DO.md).

## Cấu trúc

- `ban/`, `mua/`: điểm vào, manifest riêng; `assets/logo.svg`, PNG icon.
- `shared/api.js`: phiên, lỗi thống nhất, khóa chống lặp, gửi lại đúng thân khi chưa rõ kết quả. Thao tác chờ tách theo người, thiết bị và app.
- `shared/format.js`, `ui.js`: hiển thị tiền, số chữ, kg, giờ Việt Nam và thành phần giao diện.
- `shared/app.js`: điều hướng, đăng nhập, tổng quan, dải thử và tải ảnh theo quyền. Dữ liệu nghiệp vụ được đọc lại sau lệnh; không lưu bản sao đơn trong localStorage.
- `shared/market.js`, `orders.js`, `amendments.js`: nguồn hàng, hợp đồng, phụ lục và các nhánh giao nhận.
- `shared/services.js`, `enrollment.js`: sổ tiền, thành viên/gói/hỗ trợ/thông báo/tài khoản nhận tiền; đăng ký và nhận lời mời.
- `assets/products/`: minh họa SVG bưởi/chanh/sầu riêng; các ảnh mặt hàng còn lại dùng tài nguyên tham khảo. Tất cả thẻ minh họa đều ghi rõ nhãn.
- `shared/api-types.d.ts`: sinh từ schema trong OpenAPI; chạy `npm run types` (Python + PyYAML). Không suy diễn kiểu GET mà đặc tả chưa mô tả.
- `assets/qr.js`: bản đóng gói sẵn của `qrcode` đang có trong backend, kèm giấy phép. Chỉ vẽ mã, không tự tạo token giao nhận.
- `sw.js`: chỉ dự phòng logo, CSS, icon công khai. Không lưu API, token, PDF hay chứng từ vào cache.

Đọc tài nguyên thiết kế, font, trâu C01 và hiệu ứng trực tiếp từ `tham-khao/`, không thay đổi nguồn tham khảo. Runtime không phụ thuộc công cụ định dạng mã.

Các tiến trình cục bộ thuộc phiên làm việc, không phải dịch vụ đã cài hay bản triển khai. Nếu đã dừng, chạy lại theo hướng dẫn trên. ID hồ sơ trong JSON là bằng chứng tại thời điểm kiểm; reset tiếp theo sẽ thay dữ liệu và ID.

## Đăng nhập trực tiếp và quản trị

- `/ban/`: đăng nhập OTP, người bán được mời; không có đăng ký tự do (kể cả đường `#/register` cũ).
- `/mua/`: đăng nhập OTP hoặc đăng ký doanh nghiệp chờ xác minh hai người.
- `/quan-tri/`: đăng nhập nhân viên bằng OTP, phiên riêng; tổng quan, hàng việc/SLA, xác minh chủ, tổ chức/người dùng, tham chiếu đơn/tranh chấp, đối soát và tài liệu. Mục thiếu quyền/API hiện rõ chưa có; xem đánh giá và đề xuất backend.
- Danh sách số ảo nằm ở `shared/login-options.js`, chỉ xuất hiện khi health là `thu`. Công cụ thử phụ thuộc capability ingress và probe thành công, hoàn toàn tách khỏi đăng nhập.

Kiểm bổ sung (Playwright đã có trên máy):

```bash
npm run test:login
npm run test:admin
npm run test:public
```

`test:admin` reset **backend thử ở API_ORIGIN mặc định 8080** trước khi tạo fixture hai người/V05; không trỏ bộ này tới backend công khai hoặc dữ liệu cần giữ. `test:public` mặc định kiểm `https://agiviet.id.vn`, đọc pilot từ local.env, không ghi mật khẩu/token vào kết quả; đăng nhập hai app bán/mua trên HTTPS; quản trị và mọi tệp con phải 404 công khai, operator sau pilot phải 200. Bộ kiểm cũng phát hiện trang gốc còn chạy server.mjs cũ (403) và trả exit 1 cho tới khi restart. Xem `docs/frontend/kiem-thu-luot-5.json` ở gốc repo cho kết quả và giới hạn restart.
