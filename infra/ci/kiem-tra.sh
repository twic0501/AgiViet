#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
for f in infra/scripts/*.sh infra/ci/*.sh; do bash -n "$f"; done
for f in infra/stub/*.mjs infra/stub/lib/*.mjs infra/load/*.mjs infra/scripts/*.mjs; do node --check "$f"; done
docker compose -f infra/docker-compose.yml config --quiet
# Không build/chạy nếu không được yêu cầu; có daemon thì dùng bản workflow mẫu.
echo 'Đạt: cú pháp shell/JS và cấu hình Compose.'
