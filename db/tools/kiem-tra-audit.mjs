#!/usr/bin/env node
// node db/tools/kiem-tra-audit.mjs audit.jsonl [checkpoint_sha256_from_WORM]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [file, checkpoint] = process.argv.slice(2);
if (!file) throw new Error('Cần tệp JSONL xuất bởi xuat-audit.sql');
let previous = '00'.repeat(32), lastSeq = 0, count = 0;
for (const line of readFileSync(file==='-'?0:file, 'utf8').split('\n').filter(Boolean)) {
 const r = JSON.parse(line);
 if (!/^[0-9a-f]{64}$/.test(r.previous_sha256) || r.previous_sha256 !== previous || r.seq <= lastSeq) throw new Error('Chuỗi đứt tại '+r.seq);
 const hash = createHash('sha256').update(Buffer.from(previous, 'hex')).update(r.row_json,'utf8').digest('hex');
 if (hash !== r.row_sha256 || JSON.parse(r.row_json).id !== r.audit_id) throw new Error('Nội dung đổi tại '+r.seq);
 previous = hash; lastSeq = r.seq; count++;
}
if (!count) throw new Error('Không có bản ghi để kiểm');
if (checkpoint && checkpoint !== previous) throw new Error('Khác checkpoint WORM');
console.log(JSON.stringify({records:count,last_seq:lastSeq,sha256:previous,external_checkpoint_checked:Boolean(checkpoint)}));
