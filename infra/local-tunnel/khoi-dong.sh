#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
for tool in node python3 openssl curl flock timeout psql pg_dump pg_restore; do command -v "$tool" >/dev/null || fail "Thiếu $tool"; done
[[ "$(node -p 'Number(process.versions.node.split(".")[0])>=24')" == true ]] || fail 'Cần Node >=24'
[[ -x "$PG_BIN/postgres" && -x "$PG_BIN/initdb" && -x "$CADDY_BIN" ]] || fail 'Thiếu PG17/Caddy custom ở infra/.local; xem tài liệu 08'
"$PG_BIN/postgres" --version | grep -Eq ' 17\.' || fail 'Cần PostgreSQL 17'
"$CADDY_BIN" list-modules | grep -Fxq http.handlers.rate_limit || fail 'Caddy thiếu rate_limit; từ chối mở ingress'
[[ -x "$REPO/backend/node_modules/.bin/tsx" ]] || fail 'Thiếu dependency backend (npm ci tại backend trước)'
python3 "$HERE/tao-bi-mat.py" "$STATE"
load_config
RESET_ON_START="${AGV_RESET_ON_START:-0}"
[[ "$RESET_ON_START" == 0 || "$RESET_ON_START" == 1 ]] || fail 'AGV_RESET_ON_START chỉ nhận 0|1'
unset PGHOST PGUSER PGDATABASE PGPASSWORD DATABASE_URL AGV_TEST_PG_OWNER_URL AGV_TEST_PG_TEMPLATE
mkdir -p "$STATE/"{run,logs,artifacts,backups,socket}
chmod 700 "$STATE/"{run,logs,artifacts,backups,socket}
lock_operation
# Không ghi đè process đang chạy; để operator quyết định stop/start.
if [[ -n "$(find "$STATE/run" -maxdepth 1 -name '*.json' -print -quit)" ]]; then fail 'Có state tiến trình; chạy trang-thai.sh rồi dung.sh trước'; fi
manager check-ports "$PGPORT" "$BACKEND_PORT" "$FRONTEND_PORT" "$PILOT_PORT" "$AI_PORT" "$CADDY_PORT" "$OPERATOR_PORT"
# Bounded log growth qua mỗi lần start, không đụng dữ liệu/artifact.
for log in "$STATE/logs/"*.log; do
  [[ -f "$log" ]] || continue
  if (( $(stat -c %s "$log") > 10485760 )); then mv -f "$log" "$log.1"; fi
done
cleanup() {
  status=$?;trap - EXIT
  if ((status)); then
    echo "Khởi động lỗi; dừng các tiến trình vừa bật. Log: $STATE/logs" >&2
    manager stop caddy pilot frontend backend ai || true
    if manager alive postgres; then LD_LIBRARY_PATH="$PG_BIN/../lib" "$PG_BIN/pg_ctl" -D "$STATE/pg" -m fast -w -t 20 stop >/dev/null 2>&1 || true; fi
    manager stop postgres || true
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ ! -f "$STATE/pg/PG_VERSION" ]]; then
  [[ ! -e "$STATE/pg" ]] || fail 'PGDATA tồn tại nhưng chưa init xong; kiểm tra thủ công, không tự xóa'
  printf '%s\n' "$DB_PASSWORD" > "$STATE/run/init-password"
  LD_LIBRARY_PATH="$PG_BIN/../lib" "$PG_BIN/initdb" -D "$STATE/pg" -U agiviet_owner --pwfile="$STATE/run/init-password" --auth-local=scram-sha-256 --auth-host=scram-sha-256 --encoding=UTF8 --locale=C > "$STATE/logs/initdb.log" 2>&1
  rm "$STATE/run/init-password"
fi
[[ "$(cat "$STATE/pg/PG_VERSION")" == 17 ]] || fail 'Sai PGDATA version'
chmod 700 "$STATE/pg"
manager spawn postgres env LD_LIBRARY_PATH="$PG_BIN/../lib" "$PG_BIN/postgres" -D "$STATE/pg" -h 127.0.0.1 -p "$PGPORT" -k "$STATE/socket" -c shared_buffers=128MB -c max_connections=32 -c work_mem=4MB -c log_statement=none -c log_min_error_statement=panic -c timezone=Asia/Ho_Chi_Minh
owner_env
for ((n=0;n<30;n++)); do
  if psql -d postgres -Atqc 'SELECT 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
psql -d postgres -Atqc 'SELECT 1' >/dev/null
psql -d postgres -Atqc "SELECT 'CREATE DATABASE agiviet' WHERE NOT EXISTS(SELECT FROM pg_database WHERE datname='agiviet')" | psql -d postgres > "$STATE/logs/create-db.log" 2>&1
# Idempotent migrations luôn kiểm checksum; seed đúng một lần sau lần đầu hoàn tất.
timeout 300 bash "$REPO/db/scripts/migrate.sh" > "$STATE/logs/migrate.log" 2>&1
if [[ ! -f "$STATE/seed.done" ]]; then
  timeout 120 bash "$REPO/db/scripts/seed.sh" > "$STATE/logs/seed.log" 2>&1
  touch "$STATE/seed.done"
fi
export AGV_GATEWAY_PASSWORD
timeout 60 psql -v ON_ERROR_STOP=1 -X -q -v provision_sql="$REPO/db/scripts/cap-quyen-cong.sql" -f "$REPO/infra/oracle/runtime-roles.sql" > "$STATE/logs/provision.log" 2>&1
timeout 30 psql -v ON_ERROR_STOP=1 -X -q -f "$REPO/infra/oracle/kiem-tra-cong.sql" > "$STATE/logs/guard.log" 2>&1
# Mặc định giữ dữ liệu qua restart. Chế độ reset phải được operator chọn rõ ràng.
if [[ "$RESET_ON_START" == 1 ]]; then
  timeout 600 bash "$HERE/chuan-bi-mau-thu.sh"
  # Backend hiện reset NGAY KHI KHỞI ĐỘNG nếu có template: giữ dump trước khi cho phép.
  timeout 180 pg_dump -Fc -f "$STATE/backups/truoc-reset-$(date -u +%Y%m%dT%H%M%S)-$$.dump"
  echo 'Đã sao lưu DB hiện tại. Đang khởi động phiên thử sạch; restart với AGV_RESET_ON_START=1 sẽ đặt lại lần nữa.'
fi
runtime_url="postgresql://agv_backend_gateway:$AGV_GATEWAY_PASSWORD@127.0.0.1:$PGPORT/agiviet"
unset PGHOST PGUSER PGDATABASE PGPASSWORD DATABASE_URL AGV_GATEWAY_PASSWORD AGV_TEST_PG_OWNER_URL AGV_TEST_PG_TEMPLATE
export PYTHONDONTWRITEBYTECODE=1
AI_URL=''
if [[ "$ENABLE_AI" == 1 && -x "$AI_PYTHON" ]] && "$AI_PYTHON" -c 'import fastapi,uvicorn' >/dev/null 2>&1; then
  mkdir -p "$STATE/ai/ket_qua"
  cp -R "$REPO/ai/agiviet_ai" "$STATE/ai/"
  export AGV_AI_API_KEY AGV_STT_TAT=1 AGV_OLLAMA_URL=http://127.0.0.1:1
  ( cd "$STATE/ai"; manager spawn ai "$AI_PYTHON" -m uvicorn agiviet_ai.dich_vu:app --host 127.0.0.1 --port "$AI_PORT" --no-access-log )
  ready=0
  for ((n=0;n<15;n++)); do
    if curl -fsS --max-time 2 -H "x-ai-key: $AGV_AI_API_KEY" "http://127.0.0.1:$AI_PORT/health" >/dev/null 2>&1; then ready=1;break;fi
    sleep 1
  done
  if [[ "$ready" == 1 ]]; then AI_URL="http://127.0.0.1:$AI_PORT"; else manager stop ai; echo 'AI không sẵn sàng; dùng luật backend/nhập tay.' >&2; fi
else
  echo 'AI tắt hoặc thiếu dependency; dùng luật backend/nhập tay.'
fi
export AGV_SESSION_SECRET AGV_OTP_PEPPER AGV_WEBHOOK_SECRET AGV_FALLBACK_SECRET AGV_AI_API_KEY AI_URL
AGV_QR_PRIVATE_PEM="$(printf '%s' "$AGV_QR_PRIVATE_PEM_B64" | base64 -d)"
AGV_PDF_PRIVATE_PEM="$(printf '%s' "$AGV_PDF_PRIVATE_PEM_B64" | base64 -d)"
export AGV_QR_PRIVATE_PEM AGV_PDF_PRIVATE_PEM
export AGV_MOI_TRUONG=thu HOST=127.0.0.1 PORT="$BACKEND_PORT" LOG_LEVEL=warn
export AGV_DOC_DIR="$STATE/artifacts" AGV_PG_POOL_MAX=4 AI_TIMEOUT_MS=2000
export DATABASE_URL="$runtime_url"
if [[ "$RESET_ON_START" == 1 ]]; then
  # Ngoại lệ chủ đích chỉ môi trường thử loopback; owner URL không vào argv/log/frontend/pilot.
  AGV_TEST_PG_OWNER_URL="postgresql://agiviet_owner:$DB_PASSWORD@127.0.0.1:$PGPORT/postgres"
  export AGV_TEST_PG_OWNER_URL AGV_TEST_PG_TEMPLATE=agiviet_clean
fi
manager spawn backend node --import "$REPO/backend/node_modules/tsx/dist/loader.mjs" "$REPO/backend/src/server.ts"
wait_http "http://127.0.0.1:$BACKEND_PORT/health/ready" 45
unset AGV_TEST_PG_OWNER_URL AGV_TEST_PG_TEMPLATE
unset DATABASE_URL AGV_QR_PRIVATE_PEM AGV_PDF_PRIVATE_PEM AGV_SESSION_SECRET AGV_OTP_PEPPER AGV_WEBHOOK_SECRET AGV_FALLBACK_SECRET AGV_AI_API_KEY
export PORT="$FRONTEND_PORT" API_ORIGIN="http://127.0.0.1:$BACKEND_PORT"
manager spawn frontend node --import "$HERE/loopback.mjs" "$REPO/frontend/server.mjs"
wait_http "http://127.0.0.1:$FRONTEND_PORT/ban/" 15
export PILOT_PASSWORD PILOT_COOKIE_SECRET
manager spawn pilot node "$HERE/pilot.mjs"
unset PILOT_PASSWORD PILOT_COOKIE_SECRET
"$CADDY_BIN" validate --config "$HERE/Caddyfile" --adapter caddyfile > "$STATE/logs/caddy-validate.log" 2>&1
manager spawn caddy env XDG_DATA_HOME="$STATE/xdg-data" XDG_CONFIG_HOME="$STATE/xdg-config" "$CADDY_BIN" run --config "$HERE/Caddyfile" --adapter caddyfile
# Readiness qua cổng ngoài: 401 là pilot đã khóa, không dùng mật khẩu trên argv.
ready=0
for ((n=0;n<15;n++)); do
  code="$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$CADDY_PORT/ban/" || true)"
  if [[ "$code" == 401 ]]; then ready=1;break;fi
  sleep 1
done
[[ "$ready" == 1 ]] || fail 'Caddy/pilot không sẵn sàng hoặc cổng ngoài chưa khóa'
printf 'Sẵn sàng (dữ liệu ảo): ingress http://127.0.0.1:%s/ban/ ; công cụ trên laptop http://127.0.0.1:%s/ban/\n' "$CADDY_PORT" "$OPERATOR_PORT"
printf 'Tài khoản pilot; mật khẩu xem tại %s/local.env (0600). Không tự chạy tunnel.\n' "$STATE"
