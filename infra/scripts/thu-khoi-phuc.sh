#!/usr/bin/env bash
# Chỉ dùng bộ đo riêng. Tạo DB agiviet_restore_bench, xóa DB này khi xong.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${PG_CLIENT_BIN:-$ROOT/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin}"
export LD_LIBRARY_PATH="$ROOT/.local/tools/node_modules/@embedded-postgres/linux-x64/native/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
[[ -x "$BIN/pg_dump" ]] || { echo "Thiếu công cụ: chạy python3 infra/scripts/cai-pg-client.py"; exit 2; }
export PGHOST=127.0.0.1 PGPORT=55434 PGUSER=agiviet_owner
trap '"$BIN/dropdb" --if-exists agiviet_restore_bench' EXIT
start=$SECONDS
"$BIN/pg_dump" -Fc -d agiviet_bench -f "$ROOT/.local/do-sre/backup.dump"
echo "dump_seconds=$((SECONDS-start))"
"$BIN/createdb" agiviet_restore_bench
start=$SECONDS
"$BIN/pg_restore" --exit-on-error --no-owner -d agiviet_restore_bench "$ROOT/.local/do-sre/backup.dump"
echo "restore_seconds=$((SECONDS-start))"
"$BIN/psql" -d agiviet_restore_bench -c "SELECT count(*) AS orders FROM bench.orders; SELECT count(*) AS transactions FROM bench.ledger_txns; SELECT coalesce(sum(amount_vnd),0) AS ledger_sum FROM bench.ledger_entries;"
ls -lh "$ROOT/.local/do-sre/backup.dump"
