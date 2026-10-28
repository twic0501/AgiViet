#!/usr/bin/env bash
# Đặt lại dữ liệu thử của stack cục bộ về trạng thái ban đầu theo vai.
# 1) sao lưu DB hiện tại (sao-luu.sh: dump + pg_restore --list + checksum);
# 2) khởi động lại với AGV_RESET_ON_START=1: backend đặt lại từ mẫu sạch agiviet_clean (khoi-dong.sh sao lưu thêm trước reset);
# 3) dựng lại 10 tình huống theo vai cho số đăng nhập 0001–0010 bằng API nghiệp vụ thật (backend: npm run demo:10-so).
# Chỉ dùng cho môi trường thử trên laptop. Tunnel cloudflared chạy riêng, không đụng.
set -euo pipefail
HERE_DL="$(cd "$(dirname "$0")" && pwd)"
REPO_DL="$(cd "$HERE_DL/../.." && pwd)"
echo '1/3 Sao lưu DB hiện tại'
timeout 600 "$HERE_DL/sao-luu.sh" | tail -1
echo '2/3 Khởi động lại, đặt lại từ mẫu sạch'
timeout 120 "$HERE_DL/dung.sh" | tail -1
AGV_RESET_ON_START=1 timeout 900 "$HERE_DL/khoi-dong.sh" | tail -2
echo '3/3 Dựng tình huống theo vai'
cd "$REPO_DL/backend"
timeout 600 npx tsx scripts/demo-10-so.ts
echo 'Xong. Danh sách tài khoản: GET http://127.0.0.1:18080/v1/test/accounts ; trang chọn vai: http://127.0.0.1:18889/quan-tri/chon-vai.html'
