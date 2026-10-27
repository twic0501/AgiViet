#!/usr/bin/env bash
# Dump logic cục bộ. Production: thêm mã hóa, sao chép sang kho độc lập, WAL/PITR.
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${DB_NAME:-agiviet}"
[[ "$DB_NAME" =~ ^[a-z][a-z0-9_]*$ ]] || exit 2
DEST="$ROOT/.local/backups"
mkdir -p "$DEST"
FILE="$DEST/$DB_NAME-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$FILE.partial"' EXIT
docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_dump -U agiviet_owner -d "$DB_NAME" -Fc > "$FILE.partial"
docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_restore --list < "$FILE.partial" > /dev/null
mv "$FILE.partial" "$FILE"
sha256sum "$FILE" > "$FILE.sha256"
echo "$FILE"
