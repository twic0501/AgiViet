#!/usr/bin/env bash
# Cùng cách Oracle: dừng writer, dump custom, pg_restore --list, roles không password,
# snapshot artifact/audit, checksum; chỉ rotation sau khi có bản mới đã kiểm.
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/chung.sh"
load_config
lock_operation
owner_env
export KEEP_BACKUPS="${KEEP_BACKUPS:-5}" MAX_BACKUP_BYTES="${MAX_BACKUP_BYTES:-1073741824}" MIN_FREE_BYTES="${MIN_FREE_BYTES:-536870912}"
python3 "$HERE/sao-luu.py"
wait_http "http://127.0.0.1:$BACKEND_PORT/health/ready" 30
