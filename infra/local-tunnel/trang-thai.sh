#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
[[ -d "$STATE" ]] || { echo 'Chưa khởi tạo.'; exit 0; }
load_config
manager status
printf 'PGDATA: %s/pg\nIngress: http://127.0.0.1:%s\nOperator: http://127.0.0.1:%s\n' "$STATE" "$CADDY_PORT" "$OPERATOR_PORT"
curl -s --max-time 3 -o /dev/null -w 'Ingress /ban/ không khóa: HTTP %{http_code} (mong đợi 401)\n' "http://127.0.0.1:$CADDY_PORT/ban/" || true
# Không in secrets, command line hoặc environment của tiến trình.
