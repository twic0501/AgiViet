#!/usr/bin/env bash
# Kiểm code API cuối phiên trên database bộ đo đã tạo. Không seed lại dữ liệu.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGROOT_LOCAL="$PWD/infra/.local/pg-sre" PGPORT_LOCAL=55434
export DATABASE_URL=postgres://agiviet_owner@127.0.0.1:55434/agiviet_bench
export DOC_DIR="$PWD/infra/.local/do-sre/docs" UPLOAD_DIR="$PWD/infra/.local/do-sre/uploads"
export PORT=8280 AI_URL=http://127.0.0.1:8190
pid=''
cleanup() { if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; timeout 10 tail --pid="$pid" -f /dev/null || kill -KILL "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi; infra/scripts/pg-cuc-bo.sh tat; }
trap cleanup EXIT INT TERM
CPUS=0-3 infra/scripts/pg-cuc-bo.sh bat
node infra/stub/server.mjs > infra/.local/do-sre/api-cuoi.log 2>&1 & pid=$!
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8280';
const checkedFetch=(url,opts={})=>fetch(url,{...opts,signal:AbortSignal.timeout(5000)});
for(let i=0;i<40;i++){
 try {if((await checkedFetch(base+'/ready')).ok)break;}catch{}
 if(i===39)throw new Error('API chưa sẵn sàng');
 await new Promise(r=>setTimeout(r,250));
}
const metric=await checkedFetch(base+'/metrics'); assert.equal(metric.status,200);
const text=await metric.text(); assert.match(text,/pdf_failed_jobs 0/); assert.match(text,/pdf_oldest_pending_seconds/);
console.log('Đạt: readiness, metrics PDF/DB trả được số thật từ bench.');
let r=await checkedFetch(base+'/v1/qr/scan',{method:'POST',headers:{'content-type':'application/json'},body:'{'}); assert.equal(r.status,400); await r.arrayBuffer();
r=await checkedFetch(base+'/v1/qr/scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'khong-hop-le'})}); assert.equal(r.status,400); await r.arrayBuffer();
r=await checkedFetch(base+'/v1/uploads/photo',{method:'POST',body:Buffer.alloc(7*1024*1024)}); assert.equal(r.status,413); await r.arrayBuffer();
console.log('Đạt: JSON sai 400, QR sai 400, body quá lớn 413.');
JS
