#!/bin/bash
# Chạy HỆ THỐNG THẬT (không dữ liệu mẫu): backend chỉ nạp danh mục + nhân viên AgiViet, frontend tắt công cụ thử
# (không ?thu=, không nút giả lập ngân hàng). Người bán / người mua thật tự đăng ký bằng OTP.
# Cổng mặc định: backend 18780, frontend 18790 (khác stack thử 18980/18990 và stack trình diễn).
# shortcut: SMS OTP vẫn dùng bộ gửi thử của AGV_MOI_TRUONG=thu (đọc mã qua /v1/test/sms); khi có nhà cung cấp SMS thật thì đổi sang production.
set -e
GOC=$(cd "$(dirname "$0")/.." && pwd)
BE=${BE_PORT:-18780}; FE=${FE_PORT:-18790}
DIR=${AGV_PGLITE_DIR:-$HOME/.local/share/agiviet/he-thong-that-db}
mkdir -p "$DIR" /tmp/agv-that-tai-lieu
cd "$GOC/backend" && AGV_DU_LIEU=that AGV_MOI_TRUONG=thu AGV_PGLITE_DIR="$DIR" PORT=$BE HOST=127.0.0.1 LOG_LEVEL=warn AGV_DOC_DIR=/tmp/agv-that-tai-lieu npx tsx src/server.ts > /tmp/agv-that-be.log 2>&1 &
cd "$GOC/frontend" && PORT=$FE API_ORIGIN=http://127.0.0.1:$BE node server.mjs > /tmp/agv-that-fe.log 2>&1 &
echo "Hệ thống thật: app mua http://127.0.0.1:$FE/thiet-ke/mua-app.html · app bán http://127.0.0.1:$FE/thiet-ke/dang-nhap.html"
wait
