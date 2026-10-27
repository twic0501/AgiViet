#!/usr/bin/env bash
# Postgres 17 cục bộ KHÔNG cần Docker và không cần sudo (dùng bản dựng sẵn @embedded-postgres/linux-x64).
# Dùng khi Docker daemon không chạy (trường hợp của máy đo ngày 25/10/2026).
# Dữ liệu nằm ở infra/.local/pg (đã .gitignore). Cổng 55433 để không trùng db/docker-compose.yml (55432).
#
#   infra/scripts/pg-cuc-bo.sh cai      # tải bản dựng PG 17 vào infra/.local/tools (một lần)
#   infra/scripts/pg-cuc-bo.sh bat      # initdb nếu chưa có, rồi khởi động
#   infra/scripts/pg-cuc-bo.sh tat
#   infra/scripts/pg-cuc-bo.sh trang-thai
#   CPUS=0-3 infra/scripts/pg-cuc-bo.sh bat   # ghim vào 4 lõi đầu (mô phỏng VPS 4 vCPU)
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL="$HERE/.local"
PKG="$LOCAL/tools/node_modules/@embedded-postgres/linux-x64"
BIN="$PKG/native/bin"
PGROOT="${PGROOT_LOCAL:-$LOCAL/pg}"
DATA="$PGROOT/data"
PORT="${PGPORT_LOCAL:-55433}"
SHARED_BUFFERS="${SHARED_BUFFERS:-512MB}"

cmd="${1:-trang-thai}"
case "$cmd" in
  cai)
    mkdir -p "$LOCAL/tools"
    [[ -f "$LOCAL/tools/package.json" ]] || echo '{"name":"agv-local-tools","private":true}' > "$LOCAL/tools/package.json"
    npm install --prefix "$LOCAL/tools" --no-audit --no-fund @embedded-postgres/linux-x64@17.10.0-beta.17
    # gói có symlink thư viện được lưu dạng JSON; tạo lại (tương đương postinstall của gói)
    (cd "$PKG" && node scripts/hydrate-symlinks.js)
    ;;
  bat)
    [[ -x "$BIN/postgres" ]] || { echo "Chưa cài. Chạy: $0 cai"; exit 1; }
    (cd "$PKG" && node scripts/hydrate-symlinks.js)
    if [[ ! -f "$DATA/PG_VERSION" ]]; then
      mkdir -p "$PGROOT"
      "$BIN/initdb" -D "$DATA" -U agiviet_owner --auth=trust -E UTF8 --locale=C >/dev/null
      echo "đã initdb ở $DATA (auth=trust, CHỈ cho máy phát triển)"
    fi
    PREFIX=()
    [[ -n "${CPUS:-}" ]] && PREFIX=(taskset -c "$CPUS")
    "${PREFIX[@]}" "$BIN/pg_ctl" -D "$DATA" -l "$PGROOT/postgres.log" -w -o "-p $PORT -k $PGROOT \
      -c listen_addresses=127.0.0.1 -c timezone=Asia/Ho_Chi_Minh \
      -c shared_preload_libraries=pg_stat_statements -c log_min_duration_statement=200 \
      -c shared_buffers=$SHARED_BUFFERS -c max_connections=200 -c work_mem=8MB" start
    ;;
  tat)
    "$BIN/pg_ctl" -D "$DATA" -m fast stop
    ;;
  trang-thai)
    "$BIN/pg_ctl" -D "$DATA" status || true
    ;;
  *) echo "lệnh: cai | bat | tat | trang-thai"; exit 2 ;;
esac
