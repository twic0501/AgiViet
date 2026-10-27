#!/usr/bin/env bash
# Bật/tắt bộ GIẢ LẬP (backend stub + AI stub + worker PDF) không qua Docker.
#   infra/scripts/stub.sh bat     # WORKERS=2 PDF_WORKERS=1 CPUS=2-3 infra/scripts/stub.sh bat
#   infra/scripts/stub.sh tat
# Nhật ký: infra/.local/log/*.log
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HERE/.local/log"; mkdir -p "$LOG"
PIDS="$HERE/.local/stub.pids"
export DATABASE_URL="${DATABASE_URL:-postgres://agiviet_owner@127.0.0.1:55433/agiviet_bench}"
PREFIX=()
[[ -n "${CPUS:-}" ]] && PREFIX=(taskset -c "$CPUS")

case "${1:-}" in
  bat)
    cd "$HERE/stub"
    PORT=8090 nohup "${PREFIX[@]}" node ai.mjs > "$LOG/ai.log" 2>&1 & echo $! >> "$PIDS"
    PORT=8080 nohup "${PREFIX[@]}" node server.mjs > "$LOG/stub.log" 2>&1 & echo $! >> "$PIDS"
    for i in $(seq 1 "${PDF_WORKERS:-1}"); do
      WORKER_ID="w$i" nohup "${PREFIX[@]}" node worker.mjs > "$LOG/worker-$i.log" 2>&1 & echo $! >> "$PIDS"
    done
    for _ in $(seq 1 50); do curl -sf localhost:8080/ready >/dev/null && break; sleep 0.2; done
    curl -s localhost:8080/ready && echo
    ;;
  tat)
    [[ -f "$PIDS" ]] && while read -r p; do kill "$p" 2>/dev/null || true; done < "$PIDS"
    rm -f "$PIDS"
    ;;
  *) echo "lệnh: bat | tat"; exit 2 ;;
esac
