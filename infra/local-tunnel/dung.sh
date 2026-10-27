#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
[[ -d "$STATE" ]] || { echo 'Chưa có state; đã dừng.'; exit 0; }
load_config
lock_operation
status=0
manager stop caddy pilot frontend backend ai || status=1
# pg_ctl dừng nhanh nhưng sạch WAL; có deadline, không đụng cluster khác.
if manager alive postgres; then
  LD_LIBRARY_PATH="$PG_BIN/../lib" "$PG_BIN/pg_ctl" -D "$STATE/pg" -m fast -w -t 20 stop || status=1
fi
manager stop postgres || status=1
rm -f "$STATE/run/init-password"
if [[ "$status" == 0 ]]; then echo 'Đã dừng sạch stack local; giữ nguyên PGDATA, khóa và backup.'; fi
exit "$status"
