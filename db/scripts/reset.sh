#!/usr/bin/env bash
# Xóa sạch DB cục bộ rồi migrate + seed + test. CHỈ dùng trên máy phát triển.
set -euo pipefail
if [[ "${AGIVIET_ALLOW_RESET:-}" != "1" ]]; then
  echo "Chỉ xóa DB thử: đặt AGIVIET_ALLOW_RESET=1 sau khi kiểm tra DATABASE_URL/container." >&2
  exit 2
fi
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="$HERE/scripts/_psql.sh"
"$PSQL" -c "DROP SCHEMA IF EXISTS ref, core, ledger, pii, ops, evt, mkt, cmd, test CASCADE; DROP TABLE IF EXISTS public.schema_migrations;"
"$PSQL" -c "DO \$\$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('agiviet_app','agiviet_worker','agiviet_readonly','agiviet_pii_reader','agiviet_bank_worker','agiviet_auth_worker','agiviet_test_seller') LOOP EXECUTE format('DROP OWNED BY %I', r); EXECUTE format('DROP ROLE %I', r); END LOOP; END \$\$;"
"$HERE/scripts/migrate.sh"
"$HERE/scripts/seed.sh"
"$HERE/scripts/test.sh"
