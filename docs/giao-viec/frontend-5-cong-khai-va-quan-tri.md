# Giao việc: app chạy được qua tên miền + màn đăng nhập thẳng + app quản trị (Codex gpt-6.1-sol)

Đọc `docs/giao-viec/frontend.md` (giữ mọi yêu cầu thiết kế "Sổ làm ăn"), `frontend/TIEN-DO.md`, `docs/ha-tang/08-chay-tam-cloudflare-tunnel.md`. Làm tiếp, không làm lại.

## Lỗi nghiêm trọng đang xảy ra (sửa trước tiên)
Hệ thống đang chạy công khai tại https://agiviet.id.vn (laptop + Cloudflare Tunnel, Caddy ingress 127.0.0.1:18888 có Basic Auth `pilot` cho giao diện; cổng 18889 chỉ trên laptop có công cụ thử). Ingress công khai CHẶN `/v1/test*` và `/v1/sim*` (404) có chủ đích. Nhưng cả `/ban/` và `/mua/` gọi `/v1/test/accounts` lúc tải, nhận 404 và toàn app chỉ hiện "Không thực hiện được. Vui lòng thử lại." — người dùng không thấy màn đăng nhập. Tái hiện: `node /home/twictrn/.claude/jobs/d88082d5/tmp/chup_cong_khai.mjs <thư-mục-ra>`.
- Công cụ thử chỉ hiện khi API thử thật sự dùng được (thử gọi, 404/403 thì ẩn hoàn toàn, không báo lỗi). Lỗi của công cụ thử không bao giờ được chặn màn chính.
- Không mở `/v1/test*` ra công khai.

## Yêu cầu của người dùng
1. Mở app là vào thẳng **màn đăng nhập** (số điện thoại → OTP), không qua trang giới thiệu/đăng ký.
   - **App bán (`/ban/`)**: chỉ có **Đăng nhập**. Không có nút đăng ký (người bán được mời/tạo bởi vận hành hoặc tổ chức).
   - **App mua (`/mua/`)**: có hai lựa chọn **Đăng nhập** và **Đăng ký doanh nghiệp** (dùng API đăng ký tổ chức đã có, trạng thái chờ xác minh).
   - Môi trường thử: dưới ô số điện thoại có danh sách gợi ý vài số ảo để bấm điền nhanh (lấy từ dữ liệu tĩnh trong frontend hoặc tài liệu, KHÔNG gọi `/v1/test/accounts` ở cổng công khai), ghi "OTP thử: 123456".
2. **App quản trị** mới tại `frontend/quan-tri/` (đường dẫn `/quan-tri/`), máy tính trước, cùng thiết kế: đăng nhập bằng tài khoản vận hành ảo (vai ops/finance/risk/supervisor/support trong seed), các màn: tổng quan (số đơn theo trạng thái, việc tới hạn), hàng việc vận hành (V01…: nhận, xử lý, SLA), xác minh chủ tổ chức hai người (`/v1/ops/owner-verifications`), tổ chức và người dùng, đơn hàng và tra cứu, tranh chấp, đối soát ngân hàng/lệnh chi chờ gọi lại, tài liệu PDF. Dùng API có sẵn trong `docs/backend/openapi.yaml`; thiếu API thì hiện "chưa có" và ghi `docs/frontend/de-xuat-backend.md` (không bịa dữ liệu).
3. Thêm route `/quan-tri/` vào `frontend/server.mjs` và Caddy `infra/local-tunnel/Caddyfile` (sau Basic Auth pilot như `/ban/`, `/mua/`); trang gốc `/` chuyển tới một trang chọn nhỏ (App bán · App mua · Quản trị) hoặc tới `/mua/`.

## Kiểm chứng (bắt buộc, trên đường công khai)
- Sau khi sửa, khởi động lại cục bộ theo 08 (`AGV_LOCAL_STATE=$HOME/.local/share/agiviet infra/local-tunnel/dung.sh` rồi `khoi-dong.sh`; tunnel cloudflared đang chạy riêng, không đụng) và chạy lại `chup_cong_khai.mjs` + thêm chụp `/quan-tri/`: cả ba phải ra màn đăng nhập, không lỗi JS, không gọi `/v1/test*`.
- Playwright qua https://agiviet.id.vn (httpCredentials pilot từ `~/.local/share/agiviet/local.env`, không in mật khẩu): đăng nhập bằng số ảo + OTP 123456 ở app bán, app mua, app quản trị; thấy màn chính.
- Chạy lại unit, `test:branches`, `test:round2`, `test:e2e` (backend cục bộ như cũ) — giữ xanh.

Chỉ ghi `frontend/`, `docs/frontend/`, `infra/local-tunnel/`. Cập nhật `TIEN-DO.md`, `danh-gia-thanh-that.md`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.
