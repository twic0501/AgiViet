#!/usr/bin/env bash
set -euo pipefail
[[ "${SEED_DEMO:-0}" == 0 || "${SEED_DEMO:-0}" == 1 ]] || exit 2
if [[ "${SEED_DEMO:-0}" == 1 && "${AGV_MOI_TRUONG:-production}" != thu ]]; then
  echo 'Seed ảo chỉ dành DB thử, AGV_MOI_TRUONG=thu' >&2; exit 2
fi
db_repo="${DB_REPO_DIR:-/repo/db}"
oracle_dir="${ORACLE_SCRIPT_DIR:-/oracle}"
bash "$db_repo/scripts/migrate.sh"
if [[ "${SEED_DEMO:-0}" == 1 ]]; then bash "$db_repo/scripts/seed.sh"; fi
bash "$oracle_dir/provision-runtime.sh"
