#!/usr/bin/env bash
# Tái dùng quy trình dump custom + pg_restore --list của infra/scripts/sao-luu.sh.
# Thêm Compose OCI, snapshot tệp khi ngừng ghi, age, remote verification và rotation.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
remote_check
operation_lock
for tool in age rclone python3 timeout; do command -v "$tool" >/dev/null || fail "Thiếu $tool"; done
dc config --quiet
stage="$(mktemp -d "$BACKUP_DIR/.stage-XXXXXXXX")"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="oracle-$stamp-$(date -u +%N)-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n').tar.age"
resume_services=()
cleanup() {
  status=$?
  trap - EXIT
  if ((${#resume_services[@]})); then
    dc start "${resume_services[@]}" || { echo 'Không bật lại được API/worker sau backup' >&2; status=1; }
  fi
  rm -rf -- "$stage"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Kho có sẵn: liệt kê thành công trước khi ngừng ghi; không coi lỗi xác thực là kho rỗng.
rc lsjson "$REMOTE_BACKUP" --files-only --max-depth 1 > "$stage/remote.json"
# Kể cả AI cũ còn chạy khi env vừa chuyển ENABLE_AI=0: phải đóng writer đó.
running="$(dc --profile ai ps --status running --services)"
for service in backend ai; do
  if grep -Fxq "$service" <<< "$running"; then resume_services+=("$service"); fi
done
if ((${#resume_services[@]})); then dc stop "${resume_services[@]}"; fi
dc exec -T db pg_dump -U agiviet_owner -d agiviet -Fc > "$stage/agiviet.dump.partial"
dc exec -T db pg_restore --list < "$stage/agiviet.dump.partial" >/dev/null
mv "$stage/agiviet.dump.partial" "$stage/agiviet.dump"
dc exec -T db pg_dumpall -U agiviet_owner --roles-only --no-role-passwords > "$stage/roles.sql"
# Snapshot artifacts cùng khoảng ngừng ghi; không tar raw PGDATA đang chạy.
dc run --rm --no-deps --user 0 --entrypoint tar backend -C /data -cf - . > "$stage/artifacts.tar"
# Dùng image backend có tar, không cần build/start AI khi ENABLE_AI=0.
# Giữ audit cũ nếu có; chưa có volume thì chỉ tạo tar rỗng, không tạo volume root.
audit_volume="${ORACLE_AI_VOLUME:-agiviet_oracle_v2_ai_audit}"
audit_volumes="$(docker volume ls -q)"
if grep -Fxq "$audit_volume" <<< "$audit_volumes"; then
  dc run --rm --no-deps --user 0 --volume "$audit_volume:/ai-audit:ro" --entrypoint tar backend -C /ai-audit -cf - . > "$stage/ai-audit.tar"
else
  tar -cf "$stage/ai-audit.tar" --files-from /dev/null
fi
if ((${#resume_services[@]})); then dc start "${resume_services[@]}"; resume_services=(); fi
{
  echo "snapshot_utc=$stamp"
  echo 'format=oracle-v2; databases=agiviet; artifacts=/data; ai_audit=/opt/ai/ket_qua; writers_paused=backend,ai'
  printf 'git_commit='; git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo 'khong-co-git'
  dc exec -T db psql -U agiviet_owner -d agiviet -v ON_ERROR_STOP=1 -X -Atq <<'SQL'
SELECT version();
SELECT to_regclass('public.schema_migrations') IS NOT NULL AS has_migrations \gset
\if :has_migrations
SELECT name||':'||sha256 FROM public.schema_migrations ORDER BY name;
\endif
SQL
} > "$stage/manifest.txt"
(cd "$stage" && sha256sum agiviet.dump artifacts.tar ai-audit.tar roles.sql manifest.txt > SHA256SUMS)
tar -C "$stage" -cf - agiviet.dump artifacts.tar ai-audit.tar roles.sql manifest.txt SHA256SUMS |
  age -r "$BACKUP_AGE_RECIPIENT" -o "$stage/$name"
# Tính cả đối tượng khác trong prefix, để không lách trần dung lượng bằng tên khác.
python3 - "$stage/remote.json" "$stage/$name" "$MAX_REMOTE_BYTES" <<'PY'
import json, os, sys
used=sum(max(0,int(x.get('Size',0))) for x in json.load(open(sys.argv[1])))
size=os.path.getsize(sys.argv[2]); budget=int(sys.argv[3])
if used+size>budget:
    raise SystemExit(f'Vuot budget remote: {used}+{size}>{budget}. Khong xoa ban cu truoc khi co ban moi da kiem.')
PY
rc copyto "$stage/$name" "$REMOTE_BACKUP/$name.partial"
local_hash="$(sha256sum "$stage/$name" | cut -d' ' -f1)"
remote_hash="$(rc cat "$REMOTE_BACKUP/$name.partial" | sha256sum | cut -d' ' -f1)"
[[ "$local_hash" == "$remote_hash" ]] || fail 'Hash remote khác, giữ các bản cũ, không cập nhật marker'
rc moveto "$REMOTE_BACKUP/$name.partial" "$REMOTE_BACKUP/$name"
mv "$stage/$name" "$BACKUP_DIR/$name"
# Chỉ xóa file do script này tạo; không sync --delete, không xóa mọi thứ ở bucket.
rc lsjson "$REMOTE_BACKUP" --files-only --max-depth 1 > "$stage/remote-after.json"
python3 - "$stage/remote-after.json" "$KEEP_BACKUPS" > "$stage/old.txt" <<'PY'
import json, re, sys
names=sorted(x['Path'] for x in json.load(open(sys.argv[1])) if re.fullmatch(r'oracle-\d{8}T\d{6}Z-\d{9}-[a-f0-9]{8}\.tar\.age',x['Path']))
for name in names[:-int(sys.argv[2])]: print(name)
PY
while IFS= read -r old; do rc deletefile "$REMOTE_BACKUP/$old"; done < "$stage/old.txt"
python3 - "$BACKUP_DIR" "$KEEP_BACKUPS" <<'PY'
from pathlib import Path
import re, sys
files=sorted(p for p in Path(sys.argv[1]).iterdir() if re.fullmatch(r'oracle-\d{8}T\d{6}Z-\d{9}-[a-f0-9]{8}\.tar\.age',p.name))
for p in files[:-int(sys.argv[2])]: p.unlink()
PY
printf '%s %s %s\n' "$stamp" "$name" "$local_hash" > "$STATE_DIR/backup-last-success.partial"
mv "$STATE_DIR/backup-last-success.partial" "$STATE_DIR/backup-last-success"
printf 'Đã sao lưu, xác minh SHA-256 ngoài máy: %s/%s\n' "$REMOTE_BACKUP" "$name"
