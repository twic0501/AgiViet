#!/usr/bin/env bash
# Chạy các kiểm tra bất biến trong db/tests rồi in kết quả. Trả mã 1 nếu có kiểm tra hỏng.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="$HERE/scripts/_psql.sh"
for f in "$HERE"/tests/*.sql; do
  { echo "BEGIN;"; cat "$f"; echo "COMMIT;"; } | "$PSQL" -f -
done
"$PSQL" -c "SELECT CASE WHEN passed THEN 'ĐẠT' ELSE 'HỎNG' END AS kq, name, detail FROM test.results ORDER BY id"
fails="$("$PSQL" -At -c "SELECT count(*) FROM test.results WHERE NOT passed")"
if [[ "$fails" != "0" ]]; then
  echo "Có $fails kiểm tra hỏng." >&2
  exit 1
fi
