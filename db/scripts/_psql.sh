#!/usr/bin/env bash
# Gọi psql trong container (không cần cài psql trên máy).
# Đặt DATABASE_URL nếu muốn dùng một Postgres 17 khác và có psql cục bộ.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -n "${DATABASE_URL:-}" ]]; then
  exec psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q "$@"
else
  exec docker compose -f "$HERE/docker-compose.yml" exec -T db psql -U agiviet_owner -d agiviet -v ON_ERROR_STOP=1 -X -q "$@"
fi
