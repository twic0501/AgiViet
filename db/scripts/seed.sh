#!/usr/bin/env bash
# Nạp dữ liệu ảo (chỉ cho môi trường phát triển/thử) vào DB vừa migrate.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
for f in "$HERE"/seed/*.sql; do
  echo "-> seed/$(basename "$f")"
  { echo "BEGIN;"; cat "$f"; echo "COMMIT;"; } | "$HERE/scripts/_psql.sh" -f -
done
