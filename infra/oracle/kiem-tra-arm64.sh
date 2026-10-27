#!/usr/bin/env bash
# Chỉ đọc manifest registry công khai; không cần daemon, không gọi OCI.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
dc --profile setup config --format json | python3 -c 'import json,sys; print("\n".join(sorted({s["image"] for s in json.load(sys.stdin)["services"].values() if "image" in s and "build" not in s})))' > "$stage/images.txt"
# Cả base image của các dịch vụ build tại chỗ.
awk 'toupper($1)=="FROM" {print $2}' "$ORACLE_HERE/backend.Dockerfile" "$ORACLE_HERE/frontend.Dockerfile" "$ORACLE_HERE/ai.Dockerfile" "$ORACLE_HERE/caddy.Dockerfile" >> "$stage/images.txt"
sort -u "$stage/images.txt" > "$stage/unique.txt"
while IFS= read -r image; do
  timeout 60 docker manifest inspect "$image" > "$stage/manifest.json"
  python3 - "$image" "$stage/manifest.json" <<'PY'
import json, sys
m=json.load(open(sys.argv[2]))
arm=[x for x in m.get('manifests',[]) if x.get('platform',{}).get('os')=='linux' and x.get('platform',{}).get('architecture')=='arm64']
if not arm: raise SystemExit('Khong tim thay linux/arm64: '+sys.argv[1])
print(sys.argv[1]+' -> '+arm[0]['digest'])
PY
done < "$stage/unique.txt"
