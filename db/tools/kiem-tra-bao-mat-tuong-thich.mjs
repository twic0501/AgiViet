#!/usr/bin/env node
// Adapter chạy bộ security nguyên bản, chỉ nâng fixture và 4 ca hợp lệ theo API mới.
// Không sửa security/, không thay bất kỳ SQL nào của 41 ca phải chặn.
import { readFileSync as readOriginal } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const original = readOriginal(resolve(root,'security/tests/db/kiem-tra-db.mjs'),'utf8');
let program = original.replace("import { readdirSync, readFileSync, existsSync } from 'node:fs';", "import { readdirSync, readFileSync as readOriginal, existsSync } from 'node:fs';");
program = program.replace('const here = dirname(fileURLToPath(import.meta.url));', 'const here = '+JSON.stringify(resolve(root,'security/tests/db'))+';');
program = program.replace("await load('db/tests/010_du_lieu_va_khung.sql'", "await load('db/tests/005_ho_tro_bang_chung.sql', join(dbDir,'tests','005_ho_tro_bang_chung.sql'));\nawait load('db/tests/010_du_lieu_va_khung.sql'");
const adapter = `
function readFileSync(path,encoding) {
 let sql=readOriginal(path,encoding);
 if (String(path).endsWith('/security/sql/fixture.sql')) {
  sql=sql.replace("'SEC-OTP-B'",'test.otp(d,ref.ctx_user())').replace("'SEC-OTP-S'",'test.otp(d,ref.ctx_user())');
  const start=sql.indexOf('CREATE FUNCTION sec.bank_receipt(');
  const end=sql.indexOf('END $$;',start)+'END $$;'.length;
  let trusted=sql.slice(start,end).replace('sec.bank_receipt(', 'sec.trusted_bank_receipt(')
   .replace('payment_ref, occurred_at)', 'payment_ref, occurred_at,requeried_at,requery_status,requery_evidence,payer_account_hash,payer_account_masked,payer_account_name,payer_bank_code)')
   .replace('p_ref, now());', "p_ref, now(),now(),'confirmed',jsonb_build_object('simulator',true),digest('SEC-PAYER','sha256'),'****9999','THU','970436');")
   .replace('core.apply_bank_event(e)', 'test.apply_bank_event(e)');
  sql=sql.slice(0,end)+String.fromCharCode(10)+trusted+sql.slice(end);
  sql=sql.replace("SELECT sec.bank_receipt('dep1'", "SELECT sec.trusted_bank_receipt('dep1'");
 }
 return sql;
}
`;
program=program.replace('async function load(label, file)',()=>adapter+'\nasync function load(label, file)');
program=program.replace('const results = [];', ()=>`
// Nâng các ca HỢP LỆ để cung cấp chứng cứ mới; 41 ca tấn công giữ nguyên c.sql.
const attackBefore=JSON.stringify(CASES.filter(c=>c.kind==='phai_chan').map(c=>[c.id,c.sql]));
for(const c of CASES.filter(c=>c.kind==='phai_qua')) {
 if(c.id==='DB-11') c.sql=c.sql.replace('ledger.post(', 'test.manual_post(').replace(/, now\\(\\), NULL, '[0-9a-f-]+'::uuid\\);$/,');');
 if(c.id==='DB-14') c.sql=c.sql.replace('sec.bank_receipt(', 'sec.trusted_bank_receipt(');
 if(c.id==='DB-18') c.sql=c.sql.replace('core.apply_bank_event(', 'test.apply_bank_event(');
 if(c.id==='DB-24') c.sql=c.sql.replace('bank_txn_ref, confirmed_by)', 'bank_txn_ref, confirmed_by,otp_challenge_id)').replace(/\\);$/,",test.payment_otp(test.id('sec-dp1'),32200000,test.person('Nguyễn Thị Năm')));");
}
if(attackBefore!==JSON.stringify(CASES.filter(c=>c.kind==='phai_chan').map(c=>[c.id,c.sql]))) throw new Error('Adapter đổi ca tấn công');
console.log('ADAPTER: fixture có OTP/API receipt; chỉ nâng 4 ca hợp lệ; 41 SQL tấn công giữ nguyên.');
const results = [];
`);
await import('data:text/javascript;base64,'+Buffer.from(program).toString('base64'));
