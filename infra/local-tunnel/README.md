# AgiViet — laptop + Cloudflare Tunnel

Hướng dẫn đầy đủ và kết quả kiểm: [08-chay-tam-cloudflare-tunnel.md](../../docs/ha-tang/08-chay-tam-cloudflare-tunnel.md).

```bash
export AGV_LOCAL_STATE="$HOME/.local/share/agiviet"
infra/local-tunnel/khoi-dong.sh
infra/local-tunnel/trang-thai.sh
# Kết thúc:
infra/local-tunnel/sao-luu.sh
infra/local-tunnel/dung.sh
```

Pilot bảo vệ cả UI/API. Cổng ngoài `127.0.0.1:18888` chặn test/sim; cổng trình diễn `127.0.0.1:18889` chỉ ở laptop. Dữ liệu ảo, OTP thử `123456`, không dùng production. Khóa/PGDATA/backup ở STATE ngoài repo. Không tự login, đổi DNS hoặc chạy cloudflared. `ENABLE_AI=0` để bỏ AI.

## Giao diện đăng nhập và quản trị (27/10/2026)

Ba đường `/ban/`, `/mua/`, `/quan-tri/` và trang chọn `/` đều qua pilot. Không đổi ingress tunnel, không mở `/v1/test*` hoặc `/v1/sim*` ở cổng 18888.

`/frontend-capabilities.json` được bridge trả sau pilot: external `test_tools:false`, operator `true`, không cache. Frontend chỉ thử gọi tài khoản thử khi capability cho phép; 403/404/lỗi mạng ẩn công cụ, không chặn màn chính. Danh sách số đăng nhập thử là tài nguyên tĩnh trong frontend, chỉ hiện khi health xác nhận môi trường thử.

File tĩnh frontend có mặc định `false` để ingress đang chạy bridge cũ vẫn an toàn khi cập nhật source mà chưa restart. Khi chạy trực tiếp server mới trên laptop, route capability trả `true`; công cụ vẫn phải qua probe API thực tế. Không dùng capability làm phân quyền API: Caddy và bridge tiếp tục chặn test/sim độc lập.

Kiểm bridge bằng fixture (không dùng khóa thật): `node infra/local-tunnel/tests/kiem-giao-dien.mjs`.

Lượt cập nhật này đã kiểm HTTPS thật cả ba app nhưng **chưa restart được stack STATE thật**: sandbox chỉ cho đọc `~/.local/share/agiviet`, stop lỗi tại operation.lock, start lỗi chmod các thư mục state. Source được server tĩnh đang chạy đọc trực tiếp; bridge/Caddy mới cần restart bằng terminal có quyền ghi STATE. Không đụng cloudflared:

```bash
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/dung.sh
AGV_LOCAL_STATE="$HOME/.local/share/agiviet" infra/local-tunnel/khoi-dong.sh
```
