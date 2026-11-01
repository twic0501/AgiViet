#!/usr/bin/env bash
# Nạp dữ liệu ảo (chỉ cho môi trường phát triển/thử) vào DB vừa migrate.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
# AGV_DU_LIEU=cho → chợ mẫu 5 bán + 5 mua (seed-cho/)
THU_MUC=seed; [[ "${AGV_DU_LIEU:-}" == cho ]] && THU_MUC=seed-cho
for f in "$HERE"/$THU_MUC/*.sql; do
  echo "-> $THU_MUC/$(basename "$f")"
  { echo "BEGIN;"; cat "$f"; echo "COMMIT;"; } | "$HERE/scripts/_psql.sh" -f -
done
