#!/usr/bin/env bash
# Chạy bằng owner, ngoài request; dùng provision chuẩn sau migrations 0054–0055.
set -euo pipefail
umask 077
oracle_dir="${ORACLE_SCRIPT_DIR:-/oracle}"
source_sql="${DB_PROVISION_SQL:-${DB_REPO_DIR:-/repo/db}/scripts/cap-quyen-cong.sql}"
[[ -r "$source_sql" ]] || { echo 'Thiếu provision chuẩn db/scripts/cap-quyen-cong.sql' >&2; exit 2; }
# psql đọc mật khẩu qua \getenv, không đưa secret vào argv hoặc log.
psql -v ON_ERROR_STOP=1 -X -q -v provision_sql="$source_sql" -f "$oracle_dir/runtime-roles.sql"
