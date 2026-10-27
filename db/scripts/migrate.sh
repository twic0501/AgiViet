#!/usr/bin/env bash
# Mỗi migration một transaction và khóa chống hai runner chạy đồng thời.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="$HERE/scripts/_psql.sh"
"$PSQL" -c "BEGIN; SELECT pg_advisory_xact_lock(768503210); CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()); COMMIT;"
for f in "$HERE"/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  name="$(basename "$f")"
  sum="$(sha256sum "$f" | cut -d' ' -f1)"
  echo "Kiểm tra $name"
  {
    echo 'BEGIN;'
    echo 'SELECT pg_advisory_xact_lock(768503210);'
    echo "SELECT NOT EXISTS(SELECT 1 FROM public.schema_migrations WHERE name='$name') AS apply_migration \\gset"
    echo '\if :apply_migration'
    cat "$f"
    echo "INSERT INTO public.schema_migrations(name,sha256) VALUES('$name','$sum');"
    echo '\else'
    echo "DO \$\$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.schema_migrations WHERE name='$name' AND sha256='$sum') THEN RAISE EXCEPTION 'Checksum migration $name đã đổi; viết migration mới'; END IF; END \$\$;"
    echo '\endif'
    echo 'COMMIT;'
  } | "$PSQL" -f -
done
