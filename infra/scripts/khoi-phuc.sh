#!/usr/bin/env bash
# Luôn restore vào database mới có hậu tố _restore, không ghi đè DB đang dùng.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:?đường dẫn file dump}"; TARGET="${2:-agiviet_restore}"
[[ "$TARGET" =~ ^[a-z][a-z0-9_]*_restore$ ]] || { echo 'Tên đích phải kết thúc _restore'; exit 2; }
[[ ! -f "$FILE.sha256" ]] || sha256sum -c "$FILE.sha256"
DC=(docker compose -f "$ROOT/docker-compose.yml")
"${DC[@]}" exec -T db createdb -U agiviet_owner "$TARGET"
"${DC[@]}" exec -T db pg_restore -U agiviet_owner --exit-on-error --no-owner -d "$TARGET" < "$FILE"
"${DC[@]}" exec -T db vacuumdb -U agiviet_owner --analyze-only "$TARGET"
echo "Đã khôi phục vào $TARGET; đối soát trước khi chuyển kết nối ứng dụng."
