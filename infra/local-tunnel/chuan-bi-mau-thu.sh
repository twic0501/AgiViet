#!/usr/bin/env bash
# Chỉ gọi khi operator chọn AGV_RESET_ON_START=1. DB mẫu riêng, không sao dữ liệu rác từ DB đang dùng.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
load_config
owner_env
sample=agiviet_clean
# Role toàn cụm và grant của cả DB mẫu được kiểm lại khi bật chế độ thử.
psql -v ON_ERROR_STOP=1 -X -q -f "$HERE/quyen-dong-ho-thu.sql" > "$STATE/logs/test-clock-grants.log" 2>&1
# Mỗi bản source/seed có một mẫu tương ứng. Không tự thay mẫu cũ.
fingerprint="$(cat "$REPO"/db/migrations/*.sql "$REPO"/db/seed/*.sql "$REPO/db/scripts/cap-quyen-cong.sql" | sha256sum | cut -d' ' -f1)"
if [[ -f "$STATE/test-template.sha256" ]]; then
  [[ "$(cat "$STATE/test-template.sha256")" == "$fingerprint" ]] || fail 'Mẫu sạch khác source hiện tại; giữ mẫu cũ, xem docs/frontend/quan-tri-local.md để dựng STATE mới'
  [[ "$(psql -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname='$sample'")" == 1 ]] || fail 'Mất DB mẫu sạch; kiểm STATE thủ công'
  psql -d "$sample" -v ON_ERROR_STOP=1 -X -q -f "$HERE/quyen-dong-ho-thu.sql" >> "$STATE/logs/test-clock-grants.log" 2>&1
  psql -d "$sample" -v ON_ERROR_STOP=1 -X -q -f "$HERE/chuan-hoa-mau-thu.sql" >> "$STATE/logs/test-clock-grants.log" 2>&1
  exit 0
fi
[[ "$(psql -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname='$sample'")" == 0 ]] || fail 'DB mẫu tồn tại nhưng chưa có dấu hoàn tất; không tự ghi đè'
# Migrations tạo role toàn cụm nên không chạy lần hai trong cluster đang dùng.
# Dựng seed trong cluster tạm riêng, dump DB rồi restore mẫu vào cluster hiện tại.
build="$STATE/test-template-build"
[[ ! -e "$build" ]] || fail 'Còn thư mục dựng mẫu dở; kiểm thủ công trước khi dựng lại'
mkdir -m 700 "$build" "$build/socket"
printf '%s\n' "$DB_PASSWORD" > "$build/password"
"$PG_BIN/initdb" -D "$build/pg" -U agiviet_owner --pwfile="$build/password" --auth-local=scram-sha-256 --auth-host=scram-sha-256 --encoding=UTF8 --locale=C > "$STATE/logs/test-template-init.log" 2>&1
rm "$build/password"
# Chỉ Unix socket riêng 0700, không chiếm cổng TCP khác.
"$PG_BIN/pg_ctl" -D "$build/pg" -l "$STATE/logs/test-template-pg.log" -o "-h '' -k $build/socket -p $PGPORT -c log_statement=none -c log_min_error_statement=panic" -w -t 30 start >/dev/null
trap '"$PG_BIN/pg_ctl" -D "$build/pg" -m fast -w -t 20 stop >/dev/null 2>&1 || true' EXIT
(
  export PGHOST="$build/socket" PGDATABASE=agiviet
  export DATABASE_URL="postgresql://agiviet_owner@/agiviet?host=$build/socket&port=$PGPORT"
  psql -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE agiviet' >/dev/null
  timeout 300 bash "$REPO/db/scripts/migrate.sh" > "$STATE/logs/test-template-migrate.log" 2>&1
  timeout 120 bash "$REPO/db/scripts/seed.sh" > "$STATE/logs/test-template-seed.log" 2>&1
  export AGV_GATEWAY_PASSWORD
  timeout 60 psql -v ON_ERROR_STOP=1 -X -q -v provision_sql="$REPO/db/scripts/cap-quyen-cong.sql" -f "$REPO/infra/oracle/runtime-roles.sql" > "$STATE/logs/test-template-provision.log" 2>&1
  timeout 120 pg_dump -Fc -f "$build/clean.dump"
)
psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $sample" >/dev/null
timeout 120 pg_restore --exit-on-error --single-transaction -d "$sample" "$build/clean.dump" > "$STATE/logs/test-template-restore.log" 2>&1
psql -d postgres -v ON_ERROR_STOP=1 -X -q -c "REVOKE CONNECT,TEMPORARY ON DATABASE $sample FROM PUBLIC; GRANT CONNECT ON DATABASE $sample TO agv_backend_gateway;" >/dev/null
psql -d "$sample" -v ON_ERROR_STOP=1 -X -q -f "$HERE/quyen-dong-ho-thu.sql" >> "$STATE/logs/test-clock-grants.log" 2>&1
psql -d "$sample" -v ON_ERROR_STOP=1 -X -q -f "$HERE/chuan-hoa-mau-thu.sql" >> "$STATE/logs/test-clock-grants.log" 2>&1
printf '%s\n' "$fingerprint" > "$STATE/test-template.sha256"
"$PG_BIN/pg_ctl" -D "$build/pg" -m fast -w -t 20 stop >/dev/null
trap - EXIT
# Giữ dump sạch để tra lỗi; không để cluster dựng mẫu chạy sau khi hoàn tất.
echo 'Đã dựng mẫu dữ liệu sạch riêng; log và dump ở STATE/test-template-build.'
