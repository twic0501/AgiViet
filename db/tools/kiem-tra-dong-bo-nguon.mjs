#!/usr/bin/env node
// Hồi quy đồng bộ phân bổ nguồn ↔ hợp đồng (Codex rà 3d49bc0, 2f4517e, 492b9bf; giữ làm kiểm thử tự động).
// Chạy toàn bộ lệnh thật trên PGlite: gắn đơn single_product, phụ lục giảm lượng, hủy hoàn tất,
// báo thiếu rồi hủy (chưa nghiệm thu / nghiệm thu một phần). Dữ liệu dựng trên tests < 265, mỗi ca rollback.
// Chạy: cd db && npm run test:dong-bo-nguon
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = join(here, '..');
const pgliteDir = process.env.PGLITE_DIR || join(dbDir, 'node_modules/@electric-sql/pglite');
const mod = (p) => import(pathToFileURL(join(pgliteDir, 'dist', p)).href);
const { PGlite } = await mod('index.js');
const { btree_gist } = await mod('contrib/btree_gist.js');
const { pgcrypto } = await mod('contrib/pgcrypto.js');

const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone = 'Asia/Ho_Chi_Minh'`);
const ver = await db.query('SELECT version()');
console.log(ver.rows[0].version);

const applied = [];
await db.exec('CREATE TABLE public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
const { createHash } = await import('node:crypto');
const run = async (folder) => {
  const dir = join(dbDir, folder);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && (folder!=='tests'||f<'265')).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    const t = Date.now();
    const sha = createHash('sha256').update(sql).digest('hex');
    if (folder === 'migrations') {
      const old = await db.query('SELECT sha256 FROM public.schema_migrations WHERE name=$1', [f]);
      if (old.rows.length) {
        if (old.rows[0].sha256 !== sha) throw new Error('Checksum migration đổi: ' + f);
        continue;
      }
    }
    try {
      await db.exec('BEGIN;\n' + sql + '\nCOMMIT;');
      if (folder === 'migrations') {
        await db.query('INSERT INTO public.schema_migrations(name,sha256) VALUES($1,$2)',[f,sha]);
        applied.push(f);
      }
      
    } catch (e) {
      console.error(`  LỖI ${folder}/${f}: ${e.message}`);
      if (e.position) {
        const pos = Number(e.position) + 0 - 'BEGIN;\n'.length;
        const line = sql.slice(0, pos).split('\n').length;
        console.error(`       tại dòng ~${line}: ${sql.split('\n')[line - 1]?.trim()}`);
      }
      if (e.where) console.error(`       ${e.where}`);
      process.exit(1);
    }
  }
};

console.log('Migrations:');
await run('migrations');
console.log('Seed:');
await run('seed');
const snapshot = async () => (await db.query(`SELECT
 (SELECT count(*)::int FROM core.users) users,
 (SELECT count(*)::int FROM ledger.entries) entries,
 (SELECT count(*)::int FROM ledger.qty_movements) movements,
 (SELECT count(*)::int FROM evt.state_history) history,
 (SELECT count(*)::int FROM evt.domain_events) events`)).rows[0];
const before = await snapshot();
await run('migrations');
await run('seed');
if (JSON.stringify(before) !== JSON.stringify(await snapshot())) throw new Error('Migrate/seed lần hai làm thay đổi số bản ghi');
console.log('Migrate/seed lần hai: không ghi trùng.');
console.log('Tests:');
await run('tests');


const out={probes:{}};
async function tx(name,fn){await db.exec('BEGIN');try{out.probes[name]=await fn();await db.exec('ROLLBACK');}catch(e){out.probes[name]={error:e.message,hint:e.hint,constraint:e.constraint};await db.exec('ROLLBACK');}}
async function login(who,sql){return (await db.query('SELECT test.as_login($1::name,$2) result',[who,sql])).rows[0].result;}
async function attempt(sql){await db.exec('SAVEPOINT probe_step');try{await db.exec(sql);await db.exec('RELEASE SAVEPOINT probe_step');return {accepted:true};}catch(e){await db.exec('ROLLBACK TO SAVEPOINT probe_step');return {accepted:false,message:e.message,hint:e.hint,constraint:e.constraint};}}
async function setup(budget=40000000){
 await db.exec("DELETE FROM cmd.test_clock; SELECT set_config('app.test_time','',true)");
 const x=(await db.query("SELECT test.org('TC-M01') buyer,test.org('TC-B01') seller,(SELECT id FROM core.products WHERE code='XOAI_CAT_CHU') product,core.pair_exposure(test.org('TC-M01'),test.org('TC-B01')) base,(current_date+3)::text delivery_day,test.id('R59A') order_id")).rows[0];
 x.agreement=await login('db_test_buyer',`SELECT cmd.create_sourcing_agreement('REVIEW-63','${x.product}','{"loai":"L1"}','{}',false,NULL,NULL,NULL)`);
 x.day_id=await login('db_test_buyer',`SELECT cmd.confirm_sourcing_day('${x.agreement}','${x.delivery_day}',5000000)`);
 await login('db_test_seller',`SELECT cmd.set_credit_terms('${x.buyer}',3,${Number(x.base)+budget})`);
 x.alloc=await propose(x,2000000);
 await login('db_test_seller',`SELECT cmd.commit_allocation('${x.alloc}')`);
 return x;
}
async function propose(x,qty){const a=await login('db_test_approve',`SELECT cmd.propose_allocation('${x.day_id}','${x.seller}',${qty},20000)`);await login('db_test_buyer',`SELECT cmd.approve_allocation('${a}')`);return a;}
async function exposure(x){return (await db.query('SELECT core.pair_exposure($1,$2) exposure',[x.buyer,x.seller])).rows[0].exposure;}

async function linkedExact(){
 await db.exec("DELETE FROM cmd.test_clock; SELECT set_config('app.test_time','',true)");
 const x=(await db.query("SELECT test.org('TC-M01') buyer,test.org('TC-B01') seller,(SELECT id FROM core.products WHERE code='XOAI_CAT_CHU') product,core.pair_exposure(test.org('TC-M01'),test.org('TC-B01')) base,(SELECT (lower(delivery_window) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text FROM core.order_versions WHERE order_id=test.id('order') AND version_no=1) delivery_date")).rows[0];
 x.agreement=await login('db_test_buyer',`SELECT cmd.create_sourcing_agreement('EXACT69','${x.product}','{}',NULL,false,NULL,NULL,NULL)`);
 x.day_id=await login('db_test_buyer',`SELECT cmd.confirm_sourcing_day('${x.agreement}','${x.delivery_date}',5000000)`);
 await login('db_test_seller',`SELECT cmd.set_credit_terms('${x.buyer}',3,${Number(x.base)+46000000})`);
 x.alloc=await login('db_test_approve',`SELECT cmd.propose_allocation('${x.day_id}','${x.seller}',2000000,23000)`);
 await login('db_test_buyer',`SELECT cmd.approve_allocation('${x.alloc}')`);
 await login('db_test_seller',`SELECT cmd.commit_allocation('${x.alloc}')`);
 await db.exec("SELECT test.command_order('EXACT69','TC-M01','Trần Thu Hà','spot'); SELECT test.sign_order('EXACT69','TC-M01','Trần Thu Hà'); SELECT test.fund_order('EXACT69')");
 x.oid=(await db.query("SELECT test.id('EXACT69') id")).rows[0].id;
 await db.exec("INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id) SELECT 'EXACT69-D1',test.id('EXACT69'),1,1,qty_min,delivery_window,test.person('Trần Thu Hà') FROM core.order_versions WHERE order_id=test.id('EXACT69') AND version_no=1");
 await login('db_test_approve',`SELECT cmd.link_allocation_order('${x.alloc}','${x.oid}')`);
 return x;
}

async function cancelFully(x,partial=false){
 const c=await login('db_test_buyer',`SELECT cmd.request_cancel('${x.oid}','buyer_request','Review actual cancellation',${partial})`);
 await login('db_test_seller',`SELECT cmd.answer_cancel('${c}',true)`);
 const payload=(await db.query("SELECT test.command_doc('CANCEL70') doc")).rows[0].doc;
 await login('db_test_system',`SELECT cmd.process_cancellation('${c}','${JSON.stringify(payload)}')`);
 const ins=(await db.query('SELECT id,code,amount_vnd FROM core.bank_instructions WHERE basis_id=$1',[c])).rows;
 for(let i=0;i<ins.length;i++){
  const b=ins[i];await login('db_test_system',`SELECT cmd.send_instruction('${b.id}')`);
  await db.query("SELECT test.instruction_event($1,$2,'instruction_succeeded',$3)",['CANCEL70-PAID-'+i,b.code,b.amount_vnd]);
  const proof=(await db.query('SELECT test.command_statement($1,$2) id',['CANCEL70-STMT-'+i,b.id])).rows[0].id;
  await login('db_test_system',`SELECT cmd.reconcile_instruction('${b.id}','${proof}')`);
 }
 const debts=(await db.query("SELECT id,amount_due_vnd,direction FROM core.direct_payments WHERE order_id=$1 AND status NOT IN ('fully_received','cancelled')",[x.oid])).rows;
 for(let i=0;i<debts.length;i++){
  const d=debts[i]; const sellerReceives=d.direction==='buyer_to_seller';
  const receiver=(await db.query(`SELECT test.person('${sellerReceives?'Nguyễn Thị Năm':'Lê Thị Lan'}') id`)).rows[0].id;
  const otp=(await db.query('SELECT test.payment_otp($1,$2,$3) otp',[d.id,d.amount_due_vnd,receiver])).rows[0].otp;
  await login(sellerReceives?'db_test_seller':'db_test_payer',`SELECT cmd.confirm_direct_payment('${d.id}',${d.amount_due_vnd},'full','PARTIAL72-PAY-${i}','${otp}','bank_transfer',NULL)`);
 }
 const finish=await login('db_test_system',`SELECT cmd.finish_cancellation('${c}')`);
 return finish;
}


await tx('P1_valid_single_product_link',async()=>{
 const x=await linkedExact();
 const order=(await db.query('SELECT v.value_basis,v.qty_min,v.unit_price_vnd,(SELECT count(*) FROM core.order_lines WHERE order_id=o.id) line_count FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=$1',[x.oid])).rows[0];
 const allocation=(await db.query('SELECT qty_g,unit_price_vnd_per_kg,order_id,status FROM core.sourcing_allocations WHERE id=$1',[x.alloc])).rows[0];
 return {accepted:true,via_runtime_link_command:true,order,allocation,matched:allocation.order_id===x.oid&&allocation.qty_g===2000000&&allocation.unit_price_vnd_per_kg===23000};
});
await tx('P2_signed_reduction_sync',async()=>{
 const x=await linkedExact(); const before=await exposure(x);
 const a=await login('db_test_seller',`SELECT cmd.propose_amendment('${x.oid}','decrease_qty','{"qty_g":1000000,"reason":"Review actual signed reduction"}')`);
 const payload=(await db.query("SELECT test.command_doc('ANNEX71') doc")).rows[0].doc;
 const doc=await login('db_test_buyer',`SELECT cmd.answer_amendment('${a}','accept','${JSON.stringify(payload)}')`);
 const otpB=(await db.query("SELECT test.otp($1,test.person('Trần Thu Hà')) otp",[doc])).rows[0].otp;
 await login('db_test_buyer',`SELECT cmd.sign_document('${doc}','buyer','${otpB}','TEST')`);
 const otpS=(await db.query("SELECT test.otp($1,test.person('Nguyễn Thị Năm')) otp",[doc])).rows[0].otp;
 await login('db_test_seller',`SELECT cmd.sign_document('${doc}','seller','${otpS}','TEST')`);
 const apply=await attempt(`SELECT test.as_login('db_test_system',$q$ SELECT cmd.apply_signed_amendment('${a}') $q$)`);
 const order=(await db.query('SELECT o.effective_version_no,v.qty_min,v.contract_value_vnd FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=$1',[x.oid])).rows[0];
 const allocation=(await db.query('SELECT qty_g,status FROM core.sourcing_allocations WHERE id=$1',[x.alloc])).rows[0];
 const coverage=(await db.query('SELECT committed_qty_g,missing_qty_g FROM core.v_sourcing_coverage WHERE day_id=$1',[x.day_id])).rows[0];
 return {via_runtime_link_command:true,apply,order,allocation,coverage,exposure_before:before,exposure_after:await exposure(x),matched:apply.accepted&&order.effective_version_no===2&&order.qty_min===1000000&&allocation.qty_g===1000000&&Number(coverage.committed_qty_g)===1000000};
});
await tx('P3_complete_cancellation_sync',async()=>{
 const x=await linkedExact();const finish=await cancelFully(x);
 const order=(await db.query('SELECT status FROM core.orders WHERE id=$1',[x.oid])).rows[0];
 const allocation=(await db.query('SELECT status,qty_g FROM core.sourcing_allocations WHERE id=$1',[x.alloc])).rows[0];
 const coverage=(await db.query('SELECT committed_qty_g,missing_qty_g FROM core.v_sourcing_coverage WHERE day_id=$1',[x.day_id])).rows[0];
 return {via_runtime_link_command:true,finish,order,allocation,coverage,matched:finish==='done'&&order.status==='closed'&&allocation.status==='cancelled'&&Number(coverage.committed_qty_g)===0};
});
await tx('zeroAcceptedShortfallCancellation',async()=>{
 const x=await linkedExact();
 await login('db_test_seller',`SELECT cmd.report_shortfall('${x.alloc}',1000000)`);
 const finish=await cancelFully(x);
 const accepted=(await db.query('SELECT core.order_accepted_qty($1) qty',[x.oid])).rows[0].qty;
 const allocation=(await db.query('SELECT status,delivered_qty_g FROM core.sourcing_allocations WHERE id=$1',[x.alloc])).rows[0];
 const coverage=(await db.query('SELECT committed_qty_g,missing_qty_g FROM core.v_sourcing_coverage WHERE day_id=$1',[x.day_id])).rows[0];
 return {finish,accepted_qty:accepted,allocation,coverage,matched:finish==='done'&&Number(accepted)===0&&allocation.status==='cancelled'&&Number(coverage.committed_qty_g)===0};
});
await tx('partialAcceptedShortfallCancellation',async()=>{
 const x=await linkedExact();
 await login('db_test_seller',`SELECT cmd.report_shortfall('${x.alloc}',1000000)`);
 await db.query(`INSERT INTO cmd.test_clock(singleton,at) SELECT true,lower(delivery_window)+interval '30 minutes' FROM core.order_versions WHERE order_id=$1 AND version_no=1`,[x.oid]);
 // Delivery fixtures follow existing test.start_delivery/test.close_delivery, with triggers enabled.
 await db.exec("SELECT test.context(NULL,NULL,'system'); UPDATE core.deliveries SET planned_qty=1500000 WHERE code='EXACT69-D1'; SELECT test.start_delivery('EXACT69',2,500000,'TC-M01','Võ Hoàng Phúc')");
 await db.exec("INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd) VALUES(test.id('EXACT69:accept:2'),1,test.id('EXACT69:lot'),'accepted',500000,500000,23000,11500000); SELECT test.close_delivery('EXACT69',2,'TC-M01','Võ Hoàng Phúc',500000)");
 await db.exec('SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED');
 const finish=await cancelFully(x,true);
 const accepted=(await db.query('SELECT core.order_accepted_qty($1) qty',[x.oid])).rows[0].qty;
 const allocation=(await db.query('SELECT status,qty_g,delivered_qty_g FROM core.sourcing_allocations WHERE id=$1',[x.alloc])).rows[0];
 const coverage=(await db.query('SELECT committed_qty_g,missing_qty_g FROM core.v_sourcing_coverage WHERE day_id=$1',[x.day_id])).rows[0];
 return {reported_shortfall_delivered_qty:1000000,finish,accepted_qty:accepted,allocation,coverage,order:(await db.query('SELECT status FROM core.orders WHERE id=$1',[x.oid])).rows[0],matched:finish==='done'&&Number(accepted)===500000&&allocation.status==='shortfall'&&allocation.delivered_qty_g===500000&&Number(coverage.committed_qty_g)===500000};
});

let hong=0;
for (const [ten,kq] of Object.entries(out.probes)) {
  const ok = kq && kq.matched === true;
  if (!ok) hong++;
  console.log(`  ${ok ? 'ĐẠT ' : 'HỎNG'} ${ten}${ok ? '' : ' — ' + JSON.stringify(kq)}`);
}
console.log(`Đồng bộ nguồn: ${Object.keys(out.probes).length - hong}/${Object.keys(out.probes).length} đạt.`);
await db.close();
process.exit(hong ? 1 : 0);
