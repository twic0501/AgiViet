#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
fail() { echo "Lỗi: $*" >&2; exit 2; }
STATE="$(realpath -m "${AGV_LOCAL_STATE:-${XDG_DATA_HOME:-$HOME/.local/share}/agiviet}")"
case "$STATE/" in "$REPO/"*|/|/tmp/) fail 'STATE phải là thư mục riêng ngoài repo';; esac
ENV_FILE="$STATE/local.env"
PG_BIN="${PG_BIN:-$REPO/infra/.local/tools/node_modules/@embedded-postgres/linux-x64/native/bin}"
PG_CLIENT_BIN="${PG_CLIENT_BIN:-$REPO/infra/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin}"
export PATH="$PG_CLIENT_BIN:$PG_BIN:$PATH"
export LD_LIBRARY_PATH="$PG_BIN/../lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
CADDY_BIN="${CADDY_BIN:-$REPO/infra/.local/oracle-guard/bin/caddy}"
AI_PYTHON="${AI_PYTHON:-$REPO/ai/.venv/bin/python}"
PGPORT="${AGV_PG_PORT:-55436}"
BACKEND_PORT="${AGV_BACKEND_PORT:-18080}"
FRONTEND_PORT="${AGV_FRONTEND_PORT:-18090}"
PILOT_PORT="${AGV_PILOT_PORT:-18091}"
AI_PORT="${AGV_AI_PORT:-18092}"
CADDY_PORT="${AGV_CADDY_PORT:-18888}"
OPERATOR_PORT="${AGV_OPERATOR_PORT:-18889}"
ENABLE_AI="${ENABLE_AI:-1}"
export PGPORT BACKEND_PORT FRONTEND_PORT PILOT_PORT AI_PORT CADDY_PORT OPERATOR_PORT STATE
[[ "$ENABLE_AI" == 0 || "$ENABLE_AI" == 1 ]] || fail 'ENABLE_AI chỉ nhận 0|1'
load_config() {
  [[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] || fail "Thiếu $ENV_FILE; chạy khoi-dong.sh"
  [[ "$(stat -c %u "$STATE")" == "$EUID" && "$(stat -c %a "$STATE")" == 700 ]] || fail 'STATE phải thuộc người chạy, quyền 0700'
  [[ "$(stat -c %u "$ENV_FILE")" == "$EUID" && "$(stat -c %a "$ENV_FILE")" == 600 ]] || fail 'local.env phải thuộc người chạy, quyền 0600'
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  export -n DB_PASSWORD AGV_GATEWAY_PASSWORD AGV_SESSION_SECRET AGV_OTP_PEPPER AGV_WEBHOOK_SECRET AGV_FALLBACK_SECRET AGV_AI_API_KEY PILOT_COOKIE_SECRET PILOT_PASSWORD AGV_QR_PRIVATE_PEM_B64 AGV_PDF_PRIVATE_PEM_B64
}
lock_operation() {
  exec 9>"$STATE/operation.lock"
  flock -n 9 || fail 'Đang có thao tác start/stop/backup khác'
}
manager() { python3 "$HERE/tien-trinh.py" "$STATE" "$@"; }
owner_env() {
  export PGHOST=127.0.0.1 PGUSER=agiviet_owner PGDATABASE=agiviet PGPASSWORD="$DB_PASSWORD" PGCONNECT_TIMEOUT=5
  # _psql.sh cần DATABASE_URL; mật khẩu nằm trong PGPASSWORD, không trong argv.
  export DATABASE_URL="postgresql://agiviet_owner@127.0.0.1:$PGPORT/agiviet"
}
wait_http() {
  local url="$1" tries="${2:-30}"
  for ((n=0;n<tries;n++)); do
    if curl -fsS --connect-timeout 1 --max-time 2 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo "Hết thời gian đợi $url" >&2; return 1
}
