#!/usr/bin/env bash
# Một phiên hữu hạn: bật dịch vụ riêng, đo, dọn. Không đụng cổng/DB của nhóm DB.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGROOT_LOCAL="$PWD/infra/.local/pg-sre" PGPORT_LOCAL=55434
export DATABASE_URL=postgres://agiviet_owner@127.0.0.1:55434/agiviet_bench
export BASE=http://127.0.0.1:8180 AI_URL=http://127.0.0.1:8190
export DOC_DIR="$PWD/infra/.local/do-sre/docs" UPLOAD_DIR="$PWD/infra/.local/do-sre/uploads"
export WORKERS=1 PG_POOL_MAX=10
mkdir -p infra/.local/do-sre
[[ -x "$PWD/infra/.local/pg-client/postgresql-client-17/usr/lib/postgresql/17/bin/pg_dump" ]] || { echo "Chạy python3 infra/scripts/cai-pg-client.py trước khi đo"; exit 2; }
pids=()
cleanup() {
  for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done
  for p in "${pids[@]}"; do wait "$p" 2>/dev/null || true; done
  infra/scripts/pg-cuc-bo.sh tat || true
}
trap cleanup EXIT INT TERM
CPUS=0-3 infra/scripts/pg-cuc-bo.sh bat
node infra/stub/db-setup.mjs > infra/.local/do-sre/seed.log
PORT=8190 taskset -c 4-5 node infra/stub/ai.mjs > infra/.local/do-sre/ai.log 2>&1 & pids+=($!)
PORT=8180 taskset -c 4-5 node infra/stub/server.mjs > infra/.local/do-sre/api.log 2>&1 & pids+=($!)
taskset -c 6-7 node infra/stub/worker.mjs > infra/.local/do-sre/worker.log 2>&1 & pids+=($!)
# Chờ sẵn sàng có hạn, không polling vô hạn.
node -e 'for(let i=0;i<40;i++){try{const r=await fetch(process.env.BASE+"/ready");if(r.ok)process.exit(0)}catch{}await new Promise(r=>setTimeout(r,250))}process.exit(1)'
node infra/load/khoi.mjs > infra/load/ket-qua/20-khoi.txt
run() { taskset -c 8-9 node infra/load/tai.mjs "$@"; }
reset() { node infra/stub/db-setup.mjs --dat-lai > /dev/null; }
reset
run --kich-ban doc-nang --thoi-gian 0.5 --nhan 21-doc-truoc
reset
run --kich-ban webhook-don --thoi-gian 0.67 --nhan 22-webhook-truoc
reset
node infra/stub/db-setup.mjs --toi-uu
node infra/scripts/kiem-sql.mjs > infra/load/ket-qua/23-sql.json
run --kich-ban doc-nang --thoi-gian 0.5 --ref mv --nhan 24-doc-sau
reset
run --kich-ban webhook-don --thoi-gian 0.67 --nhan 25-webhook-sau
reset
run --kich-ban smoke --thoi-gian 0.5 --ref mv --pdf queue --nhan 26-smoke
reset
run --kich-ban load --thoi-gian 0.5 --ref mv --pdf queue --nhan 27-load
reset
run --kich-ban stress --thoi-gian 0.42 --ref mv --pdf queue --nhan 28-stress
reset
run --kich-ban spike --thoi-gian 0.34 --ref mv --pdf queue --nhan 29-spike
reset
run --kich-ban dang-lo-don --ref mv --pdf queue --nhan 30-dang-lo
reset
run --kich-ban qr-sang-som --thoi-gian 0.5 --ref mv --pdf queue --nhan 31-qr
reset
run --kich-ban pdf-tron --thoi-gian 0.5 --ref mv --pdf sync --nhan 32-pdf-sync
reset
run --kich-ban pdf-tron --thoi-gian 0.5 --ref mv --pdf queue --nhan 33-pdf-queue
reset
run --kich-ban soak --ref mv --pdf queue --nhan 34-soak
node infra/scripts/ket-thuc-do.mjs > infra/load/ket-qua/35-ket-thuc.json
infra/scripts/thu-khoi-phuc.sh > infra/load/ket-qua/36-khoi-phuc.txt
