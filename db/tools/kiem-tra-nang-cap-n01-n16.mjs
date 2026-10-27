#!/usr/bin/env node
// Nâng cấp thực từ 0029 có tiền thiếu/thừa; không sửa SQL migration cũ.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const db=new PGlite({extensions:{btree_gist,pgcrypto}});
await db.exec("SET timezone='Asia/Ho_Chi_Minh'");
const migrations=readdirSync(new URL('migrations/',root)).filter(n=>n.endsWith('.sql')).sort();
for(const name of migrations.filter(n=>n<'0030')) await db.exec('BEGIN;'+read('migrations/'+name)+'COMMIT;');
// Seed mới nhập policy/bank lịch sử: 0029 chưa có hai trigger mới cần tạm tắt.
const seed=read('seed/000_du_lieu_ao.sql').replace(/^ALTER TABLE (?:core\.policy_versions|pii\.bank_accounts) (?:DISABLE|ENABLE) TRIGGER (?:a_policy_approval|a_activation_clock);\n/gm,'');
await db.exec('BEGIN;'+seed+'COMMIT;');
for(const file of ['000_khung.sql','005_ho_tro_bang_chung.sql','010_du_lieu_va_khung.sql','030_luong_tien_th006.sql','070_ho_tro_ls.sql']) await db.exec('BEGIN;'+read('tests/'+file)+'COMMIT;');
await db.exec(`BEGIN;
 SELECT test.make_order('UP-PART','TC-M01','Trần Thu Hà','spot');
 SELECT test.sign_order('UP-PART','TC-M01','Trần Thu Hà');
 SELECT test.apply_bank_event(test.bank_receipt('UP-PART:ev',1000000,'AGV TEST-UP-PART COC'));
 SELECT test.make_order('UP-RETURN','TC-M01','Trần Thu Hà','spot');
 SELECT test.sign_order('UP-RETURN','TC-M01','Trần Thu Hà');
 SELECT test.apply_bank_event(test.bank_receipt('UP-RETURN:ev',2000000,'AGV TEST-UP-RETURN COC'));
 SELECT test.make_order('UP-EXCESS','TC-M01','Trần Thu Hà','spot');
 SELECT test.sign_order('UP-EXCESS','TC-M01','Trần Thu Hà');
 SELECT test.apply_bank_event(test.bank_receipt('UP-EXCESS:ev',14938000,'AGV TEST-UP-EXCESS COC'));
 CREATE TABLE test.before_upgrade_entries AS SELECT * FROM ledger.entries;
 CREATE TABLE test.before_upgrade_settlements AS SELECT * FROM core.settlements;
 COMMIT;`);
for(const name of migrations.filter(n=>n>='0030')) await db.exec('BEGIN;'+read('migrations/'+name)+'COMMIT;');
const checks=[];
const check=async(name,sql)=>{const {rows}=await db.query(sql); const passed=rows[0].ok===true; checks.push({name,passed});console.log(`${passed?'ĐẠT':'HỎNG'} ${name}`);};
await check('Entries trước nâng cấp không đổi',`SELECT NOT EXISTS(SELECT * FROM test.before_upgrade_entries EXCEPT SELECT * FROM ledger.entries) ok`);
await check('Quyết toán cũ giữ nguyên cột tiền và inputs',`SELECT NOT EXISTS(SELECT to_jsonb(b) FROM test.before_upgrade_settlements b EXCEPT SELECT to_jsonb(s)-ARRAY['additional_hold_vnd','hold_formula_version'] FROM core.settlements s) ok`);
await check('Cọc thiếu cũ chuyển 1 triệu sang ngăn treo',`SELECT (SELECT balance_vnd=1000000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-PART') AND account_type='deposit_pending') AND (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('UP-PART') AND account_type='deposit_escrow') ok`);
await check('Tiền thừa cũ tách khỏi C, giữ nguyên F',`SELECT (SELECT balance_vnd=1000000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-EXCESS') AND account_type='excess_held') AND (SELECT balance_vnd=13800000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-EXCESS') AND account_type='deposit_escrow') AND (SELECT balance_vnd=138000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-EXCESS') AND account_type='fee_held') ok`);
await db.exec(`BEGIN; SELECT test.apply_bank_event(test.bank_receipt('UP-PART:top',12938000,'AGV TEST-UP-PART COC')); COMMIT;`);
await check('Nộp bù sau nâng cấp phân bổ đủ C và F',`SELECT (SELECT balance_vnd=13800000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-PART') AND account_type='deposit_escrow') AND (SELECT balance_vnd=138000 FROM ledger.v_account_balances WHERE order_id=test.id('UP-PART') AND account_type='fee_held') AND (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('UP-PART') AND account_type='deposit_pending') ok`);
await db.exec(`BEGIN;
 SELECT test.context(NULL,NULL,'system');
 UPDATE core.orders SET status='closed',close_reason='deposit_expired' WHERE id=test.id('UP-RETURN');
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload) VALUES('bank_sim','UP-RETURN-PROOF','statement_line',true,'{"simulator":true}');
 INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,occurred_at,requeried_at,requery_status,requery_evidence)
 SELECT test.id('UP-RETURN:proof'),'bank_sim','UP-RETURN-PROOF',id,'statement_line',2000000,now(),now(),'confirmed',jsonb_build_object('simulator',true,'source_event_id',test.id('UP-RETURN:ev'),'direction','debit','target_bank_code','TEST','target_account_hash',encode(digest('TEST-PAYER','sha256'),'hex'))
 FROM evt.inbound_webhooks WHERE provider_event_id='UP-RETURN-PROOF';
 SELECT set_config('test.up_source',test.id('UP-RETURN:ev')::text,true),set_config('test.up_proof',test.id('UP-RETURN:proof')::text,true);
 SET LOCAL ROLE agiviet_bank_worker;
 SELECT cmd.complete_bank_return(current_setting('test.up_source')::uuid,current_setting('test.up_proof')::uuid);
 RESET ROLE; COMMIT;`);
await check('Tiền thiếu lịch sử sau nâng cấp đóng đơn và hoàn nguồn được',`SELECT (SELECT status='returned' FROM ops.bank_return_tasks WHERE bank_event_id=test.id('UP-RETURN:ev')) AND (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('UP-RETURN') AND account_type='deposit_pending') ok`);
const passed=checks.filter(c=>c.passed).length;
console.log(`Nâng cấp 0029 → 0032: ${passed}/${checks.length} đạt.`);
writeFileSync(new URL('upgrade-n01-n16-results.json',root),JSON.stringify({checked_at:new Date().toISOString(),from:'0029',to:'0032',checks:checks.length,passed,results:checks},null,2)+'\n');
await db.close();
process.exit(passed===checks.length?0:1);
