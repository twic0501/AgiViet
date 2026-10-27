#!/usr/bin/env bash
# Chạy hữu hạn; mã mặc định đã được đưa tới máy. --pull là tùy chọn.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
[[ "${1:-}" == '' || "${1:-}" == --local || "${1:-}" == --pull || "${1:-}" == --db-only ]] || fail 'Cách dùng: trien-khai.sh [--local|--pull|--db-only]'
[[ "$(uname -m)" == aarch64 || "$(uname -m)" == arm64 ]] || fail 'Cần VM ARM64 thật'
operation_lock
if [[ "${1:-}" == --pull ]]; then
  git -C "$REPO_DIR" diff --quiet
  git -C "$REPO_DIR" diff --cached --quiet
  [[ "$(git -C "$REPO_DIR" branch --show-current)" == "${DEPLOY_BRANCH:-main}" ]] || fail 'Sai nhánh'
  git -C "$REPO_DIR" pull --ff-only origin "${DEPLOY_BRANCH:-main}"
  # Nạp lại script mới, giữ file descriptor khóa qua exec (không lấy khóa lần hai).
  exec 9>&-
  exec bash "$ORACLE_HERE/trien-khai.sh" --local
fi
# --db-only chuẩn bị DB hữu hạn, không bật app/ingress.
mode="${1:---local}"
# Kiểm hữu hạn, dừng trước khởi động HTTPS/xin chứng chỉ nếu DNS chưa đúng.
if [[ "$mode" != --db-only ]]; then bash "$ORACLE_HERE/kiem-tra-dns.sh"; fi
dc --profile setup config --quiet
dc pull db migrate
# Không chạy nhiều build cùng lúc, đặc biệt máy 1 OCPU/6 GB.
build_services=(https backend frontend)
app_services=(backend frontend)
if [[ "$ENABLE_AI" == 1 ]]; then build_services+=(ai); app_services=(ai backend frontend); fi
for service in "${build_services[@]}"; do dc build "$service"; done
# DB có sẵn (kể cả container đã dừng): yêu cầu sao lưu trước migration.
existing="$(docker volume ls -q --filter "name=^${AGV_PG_VOLUME:-agiviet_oracle_v2_pgdata}$")"
if [[ -n "$existing" ]]; then
  dc up -d --wait --wait-timeout 180 db
  # Dùng cùng operation lock để không có writer bật chen vào snapshot.
  ORACLE_LOCK_HELD=1 bash "$ORACLE_HERE/sao-luu.sh"
fi
# Tắt ingress và mọi writer trước migration; lỗi giữ ứng dụng dừng để điều tra.
dc stop https frontend backend ai
dc up -d --wait --wait-timeout 180 db
dc --profile setup run --rm --no-deps migrate
if [[ "$mode" == --db-only ]]; then
  dc --profile setup run --rm --no-deps --entrypoint bash migrate /oracle/kiem-tra-db.sh --acl-only
  echo 'Đã chuẩn bị DB; app/ingress vẫn dừng. Chưa nghiệm thu cloud/HTTPS.'
  exit 0
fi
dc --profile setup run --rm --no-deps --entrypoint bash migrate /oracle/kiem-tra-db.sh
dc run --rm --no-deps https caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
dc up -d --wait --wait-timeout 180 "${app_services[@]}"
dc up -d https
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8080/health/ready >/dev/null
for route in /ban/ /mua/; do
  curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:8090$route" >/dev/null
done
# ACME có thể chưa xong ngay; không tự lặp vô hạn. Log là nơi chẩn đoán.
http_code="$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/ban/")"
[[ "$http_code" == 401 ]] || fail "HTTPS chưa sẵn sàng/khóa pilot (HTTP $http_code), xem dc logs https; kiểm lại thủ công"
dc ps
printf 'Stack đã qua smoke nội bộ. Cần kiểm HTTPS có mật khẩu, DB driver và hai app từ mạng ngoài theo tài liệu 06.\n'
