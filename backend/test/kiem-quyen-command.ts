// Kiểm quyền runtime thật; không bỏ qua ca nghiệp vụ lỗi khi command DB còn lệch.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {dungApp} from '../src/app.ts';
import {docCauHinh} from '../src/cau-hinh.ts';
import {ANH_PNG} from './luong.ts';
import {May,SDT} from './khung.ts';
import {damBaoDangNhap} from '../src/db/dang-nhap-rieng.ts';
const cfg=docCauHinh();cfg.logLevel='silent';const {app,ht}=await dungApp(cfg);const may=new May(app,ht);
const results:{name:string;pass:boolean;error?:string}[]=[];
async function check(name:string,fn:()=>Promise<void>){try{await fn();results.push({name,pass:true});}catch(e:any){results.push({name,pass:false,error:e.message});}}
try{
 await check('Giao dịch đọc/ghi thường dùng session_user không phải owner',async()=>{
  for(const mode of ['doc','tx']){
   const fn=async(t:any)=>{const r=await t.mot(`SELECT current_user u,session_user s,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) super`);assert.equal(r.u,'agv_backend_read');assert.equal(r.s,'agv_backend_read');assert.equal(r.super,false);};
   if(mode==='doc')await ht.db.doc(fn);else await ht.db.tx({actor:'system'},fn);
  }
 });
 await check('DML trực tiếp bị chặn và rollback; phiên sau vẫn reader',async()=>{
  await assert.rejects(ht.db.tx({actor:'system'},t=>t.q(`UPDATE core.orders SET status='completed'`)),(e:any)=>e.ma==='CHUA_HO_TRO');
  assert.equal(await may.v(`SELECT session_user`),'agv_backend_read');
 });
 await check('WITH chứa DML không vượt quyền DB',async()=>{
  await assert.rejects(ht.db.tx({actor:'system'},t=>t.q(`WITH x AS (UPDATE core.orders SET flag_abnormal_price=true RETURNING id) SELECT * FROM x`)),(e:any)=>e.ma==='CHUA_HO_TRO');
 });
 await check('SQL helper nội bộ không cấp runtime',async()=>{
  await assert.rejects(ht.db.tx({actor:'system'},t=>t.q(`SELECT cmd.insert_row('core.lots','{}','{}')`)),(e:any)=>e.ma==='CHUA_HO_TRO');
 });
 const nam=await may.dangNhap(SDT.nam);const teo=await may.dangNhap(SDT.teo);const ha=await may.dangNhap(SDT.ha);
 await check('Login command lấy tổ chức từ session_user dù GUC bị sửa',async()=>{
  await ht.db.tx({actor:'seller',userId:nam.userId},async t=>{
   const org=await t.gtri<string>(`SELECT org_id FROM core.memberships WHERE user_id=$1 AND status='active' LIMIT 1`,[nam.userId]);
   const login=await damBaoDangNhap(t,nam.userId,org,'seller');
   const lot=await t.mot<any>(`SELECT product_id,profile_version,grade_code,site_id FROM core.lots WHERE seller_org_id=$1 LIMIT 1`,[org]);
   const id=await t.voiDangNhap(login,async()=>{
    await t.q(`SELECT set_config('app.org_id',gen_random_uuid()::text,true),set_config('app.actor_kind','ops',true)`);
    return t.gtri<string>(`SELECT cmd.create_lot($1::jsonb)`,[JSON.stringify({...lot,code:'CMD-ISOLATION',qty_basis:'weighed',declared_qty:'100000'})]);
   });assert.equal(await t.gtri(`SELECT seller_org_id FROM core.lots WHERE id=$1`,[id]),org);
   assert.equal(await t.gtri(`SELECT session_user`),'agv_backend_read');
  });
 });
 // 0048–0049 đã có command: kiểm hành vi mới thay cho 501 cũ.
 await check('Helper chỉ có lot.draft: DB từ chối đặt giá, không còn lô nào được thêm',async()=>{
  const before=await may.v(`SELECT count(*) FROM core.lots`);
  const r=await teo.post('/v1/lots',{product_code:'XOAI_CAT_CHU',grade_code:'L1',qty_basis:'weighed',qty_g:100000,ask_price_vnd:24000,floor_price_vnd:21000});
  assert.equal(r.status,403);assert.equal(r.json.errors[0].code,'KHONG_CO_QUYEN');assert.equal(await may.v(`SELECT count(*) FROM core.lots`),before);
 });
 await check('Giá dưới kín: DB tự từ chối, không lộ giá kín, không tạo hạn trả lời',async()=>{
  const lot=await may.v(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const r=await ha.post('/v1/offers',{direction:'buyer_bid',lot_id:lot,qty_g:100000,price_vnd:21000});
  assert.equal(r.status,200);assert.equal(r.json.status,'auto_rejected');assert.ok(!JSON.stringify(r.json).includes('21500'));
  assert.equal(Number(await may.v(`SELECT count(*) FROM core.deadlines WHERE entity='offer' AND entity_id=$1`,[r.json.id])),0);
 });
 await check('Đăng ký qua command: tổ chức pending, chưa có vai nào',async()=>{
  const phone='0939555555';
  const otp=await app.inject({method:'POST',url:'/v1/auth/otp/send',payload:{phone}});
  const r=await app.inject({method:'POST',url:'/v1/auth/register',payload:{phone,code:'123456',challenge_id:otp.json().challenge_id,name:'Người thử',org:{side:'sell',kind:'household',display_name:'Hộ thử'}}});
  assert.equal(r.statusCode,200);assert.equal(r.json().org_status,'pending');
  assert.equal(Number(await may.v(`SELECT count(*) FROM core.membership_role_grants g JOIN core.memberships m ON m.id=g.membership_id WHERE m.org_id=$1`,[r.json().org_id])),0);
 });
 await check('API tạo/đăng lô chạy command, khai lượng một lần',async()=>{
  const lot=await nam.ok('/v1/lots',{product_code:'XOAI_CAT_CHU',grade_code:'L1',qty_basis:'weighed',qty_g:100000,ask_price_vnd:25000,floor_price_vnd:23000});
  await nam.ok('/v1/files',{mime:'image/png',data_base64:ANH_PNG,entity:'lot',entity_id:lot.id,captured_in_app:true});
  const r=await nam.ok(`/v1/lots/${lot.id}/publish`,{expected_revision:lot.revision});assert.equal(r.status,'on_sale');
  const qty=await may.v(`SELECT sum(qty)::text FROM ledger.qty_balances WHERE lot_id=$1 AND bucket='available'`,[lot.id]);assert.equal(qty,'100000');
 });
 await check('Tạo nhu cầu mở nguyên tử; endpoint publish cũ giữ trạng thái',async()=>{
  const r=await ha.ok('/v1/demands',{product_code:'XOAI_CAT_CHU',segment_code:'processor',needed_from:'2026-11-02',needed_to:'2026-11-04',delivery_mode:'self_pickup',lines:[{grade_code:'L1',qty_g:100000,min_source_qty_g:50000,max_price_vnd:25000}]});
  assert.equal(r.status,'open');const pub=await ha.ok(`/v1/demands/${r.id}/publish`,{expected_revision:r.revision});assert.equal(pub.status,'open');
  const lines=await may.v(`SELECT count(*) FROM core.demand_lines WHERE demand_id=$1`,[r.id]);assert.equal(lines,1);
 });
 await check('Không role runtime nào có DML lên sổ tiền/lượng',async()=>{
  const rows=await may.q(`SELECT rolname,rolsuper,has_table_privilege(rolname,'ledger.entries','INSERT') money,has_table_privilege(rolname,'ledger.qty_movements','INSERT') qty FROM pg_roles WHERE rolname LIKE 'agv_%'`);
  assert.ok(rows.length>0);assert.ok(rows.every((r:any)=>!r.rolsuper&&!r.money&&!r.qty));
 });
}finally{await app.close();await ht.db.dong();}
const pass=results.filter(r=>r.pass).length;writeFileSync('test/ket-qua-quyen-command.json',JSON.stringify({pass,total:results.length,results},null,2));
for(const r of results)console.log(`${r.pass?'ĐẠT':'HỎNG'} ${r.name}${r.error?': '+r.error:''}`);
console.log(`Kiểm quyền command ${pass}/${results.length}`);process.exitCode=pass===results.length?0:1;
