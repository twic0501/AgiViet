// Kiểm script provision + giao thức gateway bằng chính ngữ nghĩa role PostgreSQL
// của PGlite. Không thay mã/assertion backend hoặc security. Không phải kiểm PG thật.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '../node_modules/@electric-sql/pglite/dist/index.js';
import { btree_gist } from '../node_modules/@electric-sql/pglite/dist/contrib/btree_gist.js';
import { pgcrypto } from '../node_modules/@electric-sql/pglite/dist/contrib/pgcrypto.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
const results = [];
const check = (name, ok) => { results.push({ name, passed: Boolean(ok) }); console.log(`${ok ? 'ĐẠT' : 'HỎNG'} ${name}`); };
const one = async (sql, args=[]) => (await db.query(sql,args)).rows[0];
const rejected = async (sql, code) => {
  await db.exec('SAVEPOINT attack');
  try { await db.exec(sql); await db.exec('ROLLBACK TO SAVEPOINT attack'); return false; }
  catch (e) { await db.exec('ROLLBACK TO SAVEPOINT attack'); return e.code === code; }
};
try {
 await db.exec('CREATE TABLE public.schema_migrations(name text PRIMARY KEY)');
 const migrations = readdirSync(join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort();
 const apply = async (file) => {
  await db.exec('BEGIN;'+readFileSync(join(root,'migrations',file),'utf8')+'COMMIT;');
  await db.query('INSERT INTO public.schema_migrations VALUES($1)',[file]);
 };
 for(const file of migrations.filter(f=>f<'0054')) await apply(file);
 for(const file of readdirSync(join(root,'seed')).filter(f=>f.endsWith('.sql')).sort())
  await db.exec('BEGIN;'+readFileSync(join(root,'seed',file),'utf8')+'COMMIT;');
 // Dữ liệu phiên đã có ở 0053: một đăng ký pending và một thành viên active.
 await db.exec(`BEGIN; SET LOCAL app.allow_any_initial='on'; SET LOCAL app.actor_kind='system';
  INSERT INTO core.users(id,display_name) VALUES('00550000-0000-0000-0000-000000000001','Người đăng ký trước nâng cấp');
  INSERT INTO core.organizations(id,code,kind,display_name,can_sell)
   VALUES('00550000-0000-0000-0000-000000000002','UPGRADE-PENDING','household','Hộ trước nâng cấp',true);
  INSERT INTO core.memberships(org_id,user_id,status)
   VALUES('00550000-0000-0000-0000-000000000002','00550000-0000-0000-0000-000000000001','active');
  INSERT INTO app_auth.registration_receipts(id,payload,payload_sha256,provider_reference)
   VALUES('00550000-0000-0000-0000-000000000003','{}',digest('legacy','sha256'),'UPGRADE-LEGACY');
  INSERT INTO core.registration_results(receipt_id,user_id,org_id)
   VALUES('00550000-0000-0000-0000-000000000003','00550000-0000-0000-0000-000000000001','00550000-0000-0000-0000-000000000002');
  INSERT INTO app_auth.sessions(user_id,org_id,device_id,token_hash,expires_at)
   VALUES('00550000-0000-0000-0000-000000000001','00550000-0000-0000-0000-000000000002','LEGACY',digest('UPGRADE-PENDING','sha256'),now()+interval '1 day');
  INSERT INTO app_auth.sessions(user_id,org_id,device_id,token_hash,expires_at)
   SELECT m.user_id,m.org_id,'LEGACY',digest('UPGRADE-MEMBER','sha256'),now()+interval '1 day' FROM core.memberships m
   JOIN core.users u ON u.id=m.user_id JOIN core.organizations o ON o.id=m.org_id
   WHERE u.display_name='Nguyễn Thị Năm' AND o.code='TC-B01'; COMMIT;`);
 const oldSessions = (await db.query('SELECT to_jsonb(s) body FROM app_auth.sessions s ORDER BY id')).rows;
 for(const file of migrations.filter(f=>f>='0054')) await apply(file);
 const newSessions = (await db.query(`SELECT to_jsonb(s)-ARRAY['session_kind','delegation_id'] body FROM app_auth.sessions s ORDER BY id`)).rows;
 check('upgrade 0053 → 0055 giữ token, ID và thời hạn phiên cũ',JSON.stringify(oldSessions)===JSON.stringify(newSessions));
 check('upgrade phân loại lại pending, giữ member và lookup cả hai',
  (await one(`SELECT (SELECT session_kind='pending_registration' FROM app_auth.sessions WHERE token_hash=digest('UPGRADE-PENDING','sha256'))
   AND (SELECT session_kind='member' FROM app_auth.sessions WHERE token_hash=digest('UPGRADE-MEMBER','sha256'))
   AND (SELECT count(*)=1 FROM cmd.lookup_session(digest('UPGRADE-PENDING','sha256')))
   AND (SELECT count(*)=1 FROM cmd.lookup_session(digest('UPGRADE-MEMBER','sha256'))) ok`)).ok);
 const provision = readFileSync(join(root,'scripts/cap-quyen-cong.sql'),'utf8').replaceAll(":'gateway_password'",'NULL');
 // Bản backend hiện hành có GRANT tạo chu trình; chỉ chạy rồi rollback để ghi bằng chứng.
 const original = readFileSync(join(root,'../backend/scripts/cap-quyen-postgres.sql'),'utf8').replaceAll(":'gateway_password'",'NULL');
 await db.exec('BEGIN');
 try { await db.exec(original); check('script backend nguyên bản bị vòng membership',false); }
 catch(e) { check('script backend nguyên bản bị vòng membership', e.code==='0LP01' && /member/.test(e.message)); }
 await db.exec('ROLLBACK');
 await db.exec('BEGIN;'+provision+'COMMIT;');
 await db.exec('BEGIN;'+provision+'COMMIT;');
 check('provision sửa chạy hai lần không lỗi',true);
 const owner = (await one('SELECT session_user u')).u;
 const surface = await one(`SELECT 'cmd.create_lot(jsonb)'::regprocedure::oid f,'core.orders'::regclass::oid t`);
 const actor = await one(`SELECT m.user_id,m.org_id FROM core.memberships m JOIN core.users u ON u.id=m.user_id
 JOIN core.organizations o ON o.id=m.org_id WHERE u.display_name='Nguyễn Thị Năm' AND o.code='TC-B01'`);
 const staff = await one(`SELECT m.user_id,m.org_id FROM core.memberships m JOIN core.organizations o ON o.id=m.org_id
 JOIN ops.staff_assignments s ON s.user_id=m.user_id AND s.active WHERE o.is_platform AND m.status='active' ORDER BY m.id LIMIT 1`);
 const lot = await one(`SELECT jsonb_build_object('code','PROVISION-GW-LOT','product_id',product_id,'profile_version',profile_version,
 'grade_code',grade_code,'site_id',site_id,'facility_id',facility_id,'qty_basis','weighed','declared_qty',2000000) payload FROM core.lots WHERE code='L-0412'`);
 await db.exec('BEGIN; SET LOCAL SESSION AUTHORIZATION agv_backend_gateway');
 check('gateway đọc metadata trước SET ROLE',Number((await one('SELECT count(*) n FROM public.schema_migrations')).n)===migrations.length);
 check('gateway trần không có EXECUTE/DML nghiệp vụ',
  !(await one(`SELECT has_function_privilege(current_user,$1::oid,'EXECUTE') OR has_table_privilege(current_user,$2::oid,'SELECT') p`,[surface.f,surface.t])).p);
 check('gateway trần bị chặn command',await rejected(`SELECT cmd.create_lot('{}')`,'42501'));
 await db.exec('SET LOCAL ROLE agv_backend_broker');
 check('broker không sửa cấu hình cổng',await rejected(`UPDATE cmd.trusted_gateways SET enabled=false`,'42501'));
 for (const [login, role, identity, kind] of [
  ['agv_u_0000000000000054','agiviet_app',actor,'seller'],
  ['agv_s_0000000000000054','agiviet_orchestrator',staff,'system'],
 ]) {
  await db.exec(`CREATE ROLE ${login} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
   GRANT ${role} TO ${login}; GRANT ${login} TO agv_backend_gateway;`);
  await db.query('INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind) VALUES($1,$2,$3,$4)',[login,identity.user_id,identity.org_id,kind]);
 }
 check('broker provision principal + GRANT gateway theo backend',true);
 await db.exec('SET LOCAL ROLE agv_backend_read');
 check('reader hiện hành đọc lô qua cùng phiên',Number((await one('SELECT count(*) n FROM core.lots')).n)>0);
 await db.exec('SET LOCAL ROLE agv_u_0000000000000054');
 const created = (await one('SELECT cmd.create_lot($1::jsonb) id',[JSON.stringify(lot.payload)])).id;
 check('command seller qua script provision',Boolean(created));
 check('session_user cố định, current_user là principal',
  (await one(`SELECT session_user='agv_backend_gateway' AND current_user='agv_u_0000000000000054' ok`)).ok);
 await db.exec('SET LOCAL ROLE agv_backend_auth');
 const payload = { name:'Đăng ký thử gateway',organization:{ code:'PROVISION-GW-ORG',kind:'household',display_name:'Hộ thử cổng',can_sell:true },
  contact:{ phone_enc:'\\xaa',phone_hash:'\\x'+'c5'.repeat(32),phone_masked:'090***055',key_id:'TEST' } };
 const receipt = (await one('SELECT cmd.record_registration($1::jsonb,$2) id',[JSON.stringify(payload),'PROVISION-GW-SMS'])).id;
 await db.exec('SET LOCAL ROLE agv_s_0000000000000054');
 const registered = (await one('SELECT cmd.register_organization($1) result',[receipt])).result;
 check('auth rồi system đăng ký nguyên tử cùng phiên',registered.status==='pending');
 await db.exec('SET LOCAL ROLE agv_backend_meta');
 await db.query(`SELECT evt.emit('organization',$1,'gateway.provision_test','{}',ARRAY['notify'])`,[registered.org_id]);
 check('meta phát event trong cùng giao dịch',true);
 await db.exec('COMMIT');
 check('COMMIT trả current_user về gateway',(await one(`SELECT session_user='agv_backend_gateway' AND current_user=session_user ok`)).ok);
 await db.exec(`SET SESSION AUTHORIZATION ${owner}; RESET ROLE`);
 check('lô commit ghi đúng principal',(await one('SELECT created_by=$2::uuid ok FROM core.lots WHERE id=$1',[created,actor.user_id])).ok);
 check('event metadata giữ actor điều phối',(await one(`SELECT actor_user_id=$1::uuid ok FROM evt.domain_events WHERE event_type='gateway.provision_test'`,[staff.user_id])).ok);
 check('mọi membership trực tiếp của gateway không kế thừa',(await one(`SELECT NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='agv_backend_gateway' AND m.inherit_option) ok`)).ok);
 // ROLLBACK cũng phải xóa vai chọn và mọi ghi nghiệp vụ.
 await db.exec('BEGIN; SET LOCAL SESSION AUTHORIZATION agv_backend_gateway; SET LOCAL ROLE agv_u_0000000000000054');
 await db.query('SELECT cmd.create_lot($1::jsonb)',[JSON.stringify({...lot.payload,code:'PROVISION-ROLLED-BACK'})]);
 await db.exec('ROLLBACK');
 check('ROLLBACK trả role về owner của harness',(await one('SELECT current_user=session_user ok')).ok);
 check('ROLLBACK không giữ dữ liệu command',!(await one(`SELECT EXISTS(SELECT 1 FROM core.lots WHERE code='PROVISION-ROLLED-BACK') p`)).p);
} catch(e) { console.error(e.message,e.where||''); check('chạy harness không phát sinh lỗi',false); }
finally {
 await db.close();
 const report = {engine:'PGlite (không phải PostgreSQL native)',checks:results.length,passed:results.filter(r=>r.passed).length,results};
 writeFileSync(join(root,'0055-provision-results.json'),JSON.stringify(report,null,2)+'\n');
 process.exitCode=report.passed===report.checks?0:1;
}
