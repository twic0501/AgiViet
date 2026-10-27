import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
const origin=process.env.FRONTEND_URL || 'http://127.0.0.1:8090';
const base=process.env.API_ORIGIN || 'http://127.0.0.1:8080';
const dir=new URL('../../docs/frontend/anh-quan-tri-luot-5/',import.meta.url).pathname;
await mkdir(dir,{recursive:true});
const results=[],blockers=[],shots=[],errors=[];
async function request(path,body,token){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;
}
const cmd=(path,body,token)=>request(path,{...body,idempotency_key:crypto.randomUUID()},token);
const impersonate=async phone=>(await request('/v1/test/impersonate',{phone})).token;
const browser=await chromium.launch({args:['--no-sandbox']});
async function settle(p,allowError=false){
  await p.waitForFunction(()=>{const a=document.querySelector('#app');return a?.dataset.renderedRoute===location.hash&&a.getAttribute('aria-busy')!=='true';});
  if(!allowError)assert.equal(await p.locator('[role=alert]').count(),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
async function login(phone){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/quan-tri/');await settle(p);
  await p.locator('input[name=phone]').fill(phone);const sent=p.waitForResponse(r=>r.url().endsWith('/v1/auth/otp/send'));await p.locator('form[data-form=loginPhone] button:not([type=button])').click();const sentResponse=await sent;assert.equal(sentResponse.status(),200,JSON.stringify(await sentResponse.json()));await settle(p);
  await p.locator('input[name=code]').fill('123456');const verified=p.waitForResponse(r=>r.url().endsWith('/v1/auth/otp/verify'));await p.locator('form[data-form=loginOtp] button').click();const verifiedResponse=await verified;assert.equal(verifiedResponse.status(),200,JSON.stringify(await verifiedResponse.json()));await p.getByRole('heading',{name:'Tổng quan vận hành',exact:true}).waitFor();await settle(p);
  return p;
}
async function go(p,view){await p.goto(origin+'/quan-tri/#/'+view);await settle(p);}
async function shot(p,name){const file=name+'.png';await p.screenshot({path:dir+file,fullPage:true});shots.push({file,name,role:'quan-tri',width:1280});}
async function token(p){return JSON.parse(await p.evaluate(()=>sessionStorage.getItem('agv-session-quan-tri'))).token;}
try {
  // Reset riêng backend thử 8080; không đụng DB của ingress công khai 18080.
  await request('/v1/test/reset',{});
  // Chuẩn bị hồ sơ pending bằng API đăng ký thật.
  const phone='098'+String(Date.now()).slice(-7),otp=await request('/v1/auth/otp/send',{phone});
  const reg=await request('/v1/auth/register',{phone,challenge_id:otp.challenge_id,code:'123456',name:'Chủ doanh nghiệp kiểm quản trị',org:{side:'buy',kind:'enterprise',display_name:'Doanh nghiệp kiểm hai người',tax_code:phone}});
  assert.equal(reg.org_status,'pending');
  const risk=await login('0901000006');
  await risk.getByRole('heading',{name:'Tổng quan vận hành',exact:true}).waitFor();
  await go(risk,'owners');await risk.getByText('Lập hồ sơ xác minh',{exact:true}).click();
  await risk.locator('[name=org]').fill(reg.org_id);
  await risk.locator('[name=evidence]').setInputFiles(new URL('../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg',import.meta.url).pathname);
  await risk.locator('[name=reason]').fill('Chứng cứ fixture để kiểm tra quy trình hai người độc lập.');
  const proposedResponse=risk.waitForResponse(r=>r.url().endsWith(`/orgs/${reg.org_id}/owner-verifications`)&&r.request().method()==='POST');
  await risk.locator('form[data-form=proposeOwner] button').click();const proposed=await proposedResponse;assert.equal(proposed.status(),200,JSON.stringify(await proposed.json()));await settle(risk);
  let proposals=await request('/v1/ops/owner-verifications',null,await token(risk));
  const proposal=proposals.find(x=>x.org_id===reg.org_id);assert.ok(proposal);
  assert.equal(await risk.locator(`form[data-form="approveOwner:${proposal.id}"]`).count(),0);
  await shot(risk,'01-lap-ho-so-khong-tu-duyet');
  results.push({name:'Tải chứng cứ, đề xuất xác minh, người lập không có nút tự duyệt',pass:true});
  const supervisor=await login('0901000008');await go(supervisor,'owners');
  const approval=supervisor.locator(`form[data-form="approveOwner:${proposal.id}"]`);
  await approval.locator('[type=checkbox]').check();
  const response=supervisor.waitForResponse(r=>r.url().endsWith(`/owner-verifications/${proposal.id}/approve`)&&r.request().method()==='POST');
  await approval.locator('button').click();const approvedResponse=await response;const approved=await approvedResponse.json();
  assert.equal(approvedResponse.status(),200,JSON.stringify(approved));await settle(supervisor);
  assert.equal(approved.data.status,'active');assert.ok(approved.data.owner_effective_at);
  proposals=await request('/v1/ops/owner-verifications',null,await token(supervisor));
  assert.ok(proposals.find(x=>x.id===proposal.id).decision_id);
  await shot(supervisor,'02-nguoi-khac-duyet-cap-vai-cho-24h');
  results.push({name:'Giám sát khác người lập duyệt; server trả active, quyết định và thời điểm vai chủ',pass:true,owner_effective_at:approved.data.owner_effective_at});
  // Tạo việc V05 thật từ nút Không phải tôi của tài khoản nhận tiền ảo.
  const seller=await impersonate('0918000421');
  const accounts=await request('/v1/payout-accounts',null,seller);
  const account=accounts.find(x=>x.status==='active');assert.ok(account);
  await cmd(`/v1/payout-accounts/${account.id}/not-me`,{},seller);
  const tasks=await request('/v1/ops/tasks',null,await token(risk));
  const task=tasks.find(t=>t.entity_id===account.id&&t.kind==='V05');assert.ok(task);
  await go(risk,'tasks/'+task.id);await shot(risk,'03-v05-chi-tiet-sla');
  const claimedResponse=risk.waitForResponse(r=>r.url().endsWith(`/tasks/${task.id}/claim`)&&r.request().method()==='POST');
  await risk.getByRole('button',{name:'Nhận việc',exact:true}).click();assert.equal((await claimedResponse).status(),200);await risk.locator('form[data-form=resolveTask]').waitFor();await settle(risk);
  const assigned=(await request('/v1/ops/tasks',null,await token(risk))).find(t=>t.id===task.id);
  assert.ok(assigned.assigned_to);assert.equal(assigned.status,'claimed');
  await shot(risk,'04-v05-da-nhan');
  results.push({name:'Việc V05 P0 thật có SLA; nhận việc đọc lại claimed và người nhận',pass:true});
  await risk.locator('[name=result_code]').fill('da_kiem_tra');await risk.locator('[name=note]').fill('Kiểm fixture tài khoản bị khóa; chưa mở lại tài khoản.');await risk.locator('form[data-form=resolveTask] [type=checkbox]').check();
  const resolvedResponse=risk.waitForResponse(r=>r.url().endsWith(`/tasks/${task.id}/resolve`)&&r.request().method()==='POST');
  await risk.locator('form[data-form=resolveTask] button').click();const resolveResponse=await resolvedResponse;const resolveBody=await resolveResponse.json();await settle(risk,true);
  if(resolveResponse.ok()){
    assert.equal((await request('/v1/ops/tasks',null,await token(risk))).find(t=>t.id===task.id).status,'done');
    results.push({name:'Hoàn tất việc',pass:true});
  } else {
    assert.equal(resolveResponse.status(),409);
    await risk.getByRole('heading',{name:'Hoàn tất việc · chưa có',exact:true}).waitFor();
    assert.equal((await request('/v1/ops/tasks',null,await token(risk))).find(t=>t.id===task.id).status,'claimed');
    blockers.push({name:'Hoàn tất việc API thất bại',status:resolveResponse.status(),body:resolveBody});
  }
  await shot(risk,'05-ket-qua-hoan-tat-viec');
  await go(supervisor,'bank');await supervisor.locator('form[data-form=reconcile] [type=checkbox]').check();
  const reconcileResponse=supervisor.waitForResponse(r=>r.url().endsWith('/v1/ops/reconcile')&&r.request().method()==='POST');
  await supervisor.locator('form[data-form=reconcile] button').click();assert.equal((await reconcileResponse).status(),200);await settle(supervisor);await shot(supervisor,'06-doi-soat-api-that');
  results.push({name:'Đối soát bằng vai giám sát gọi API thật',pass:true});
  for (const [phone,role] of [['0901000001','dispatcher'],['0901000002','field'],['0901000005','finance']]){
    const p=await login(phone);await p.getByRole('heading',{name:'Tổng quan vận hành',exact:true}).waitFor();
    assert.ok((await request('/v1/auth/session',null,await token(p))).staff_roles.includes(role));
    results.push({name:'Đăng nhập OTP vai '+role,pass:true});await p.context().close();
  }
  assert.deepEqual(errors,[]);
  results.push({name:'Không lỗi JavaScript; không tràn ngang các màn đã kiểm',pass:true});
  console.log(JSON.stringify({results,blockers},null,2));
} finally {
  await browser.close();
  await writeFile(dir+'ket-qua.json',JSON.stringify({at:new Date().toISOString(),results,blockers,errors,shots},null,2));
}
