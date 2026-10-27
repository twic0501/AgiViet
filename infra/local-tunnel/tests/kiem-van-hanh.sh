#!/usr/bin/env bash
# PostgreSQL thật + archive restore; dùng STATE kiểm riêng ngoài repo, không cloud.
set -euo pipefail
# shellcheck source=infra/local-tunnel/chung.sh
source "$(dirname "$0")/../chung.sh"
export ENABLE_AI=0
[[ -n "${AGV_LOCAL_STATE:-}" ]] || fail 'Cần AGV_LOCAL_STATE riêng cho phép kiểm này'
trap '"$HERE/dung.sh"' EXIT
"$HERE/khoi-dong.sh"
load_config
owner_env
counts() { psql -d "$1" -Atqc 'SELECT (SELECT count(*) FROM schema_migrations),(SELECT count(*) FROM core.users),(SELECT count(*) FROM cmd.login_principals);'; }
original="$(counts agiviet)"
keysum="$(sha256sum "$ENV_FILE")"
manager alive ai && fail 'ENABLE_AI=0 vẫn có AI'
printf 'artifact-check\n' > "$STATE/artifacts/restore-probe.txt"
for n in 1 2 3; do KEEP_BACKUPS=2 "$HERE/sao-luu.sh"; done
[[ "$(find "$STATE/backups" -maxdepth 1 -name 'local-*.tar' | wc -l)" == 2 ]] || fail 'Rotation không giữ đúng 2 bản'
echo 'PASS: ba backup thật, retention giữ hai bản'
# Budget thấp phải fail trước dừng app và giữ mọi bản cũ.
before="$(find "$STATE/backups" -maxdepth 1 -name 'local-*.tar' | sort)"
if MAX_BACKUP_BYTES=1 "$HERE/sao-luu.sh"; then fail 'Budget thấp chưa bị chặn'; fi
[[ "$before" == "$(find "$STATE/backups" -maxdepth 1 -name 'local-*.tar' | sort)" ]] || fail 'Đã xóa bản cũ lúc hết budget'
wait_http "http://127.0.0.1:$BACKEND_PORT/health/ready" 5
echo 'PASS: hết budget giữ bản cũ và không dừng backend'
archive="$(find "$STATE/backups" -maxdepth 1 -name 'local-*.tar' | sort | tail -1)"
(cd "$STATE/backups" && sha256sum -c "$(basename "$archive").sha256")
stage="$(mktemp -d "$STATE/restore-check-XXXXXX")"
tar -xf "$archive" -C "$stage"
createdb agiviet_local_restore_probe
timeout 90 pg_restore --single-transaction --exit-on-error -d agiviet_local_restore_probe "$stage/agiviet.dump"
[[ "$original" == "$(counts agiviet_local_restore_probe)" ]] || fail 'Counts sau restore khác'
tar -xf "$stage/files.tar" -C "$stage"
cmp "$stage/artifacts/restore-probe.txt" "$STATE/artifacts/restore-probe.txt"
dropdb agiviet_local_restore_probe
rm -r "$stage"
printf 'PASS: restore DB và artifact thật; migrations/users/principals=%s\n' "$original"
"$HERE/dung.sh"
"$HERE/khoi-dong.sh"
owner_env
[[ "$original" == "$(counts agiviet)" && "$keysum" == "$(sha256sum "$ENV_FILE")" ]] || fail 'Restart đã đổi seed/khóa'
echo 'PASS: restart giữ dữ liệu và bí mật, không seed lại'
[[ ! -f "$STATE/run/ai.json" ]] || fail 'AI vẫn chạy'
"$HERE/dung.sh"
trap - EXIT
