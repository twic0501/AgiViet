import { choose, skipGuides, press } from './ui-controls.mjs';
// Chỉ tạo dữ liệu thử; không reset DB operator hiện hữu.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
const origin=process.env.FRONTEND_URL || 'http://127.0.0.1:18889';
const dir=new URL('../../docs/frontend/'+(process.env.CASE_OUTPUT || 'anh-quan-tri-case')+'/',import.meta.url).pathname;
await mkdir(dir,{recursive:true});
const env=await readFile((process.env.AGV_LOCAL_STATE || process.env.HOME+'/.local/share/agiviet')+'/local.env','utf8');
const password=env.match(/^PILOT_PASSWORD=(.*)$/m)[1];
const browser=await chromium.launch({args:['--no-sandbox']});
const context=await browser.newContext({httpCredentials:{username:'pilot',password},viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],results=[],shots=[],httpErrors=[];
context.on('page',p=>{
  p.on('pageerror',err=>errors.push(err.message));
  p.on('response',r=>{if(r.status()>=400)httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
});
await skipGuides(context);
const p=await context.newPage();p.setDefaultTimeout(15000);
const settle=async page=>page.waitForFunction(()=>{const a=document.querySelector('#app');return a?.dataset.renderedRoute===location.hash&&a.getAttribute('aria-busy')!=='true';});
const shot=async(page,name)=>{await page.screenshot({path:dir+name+'.png',fullPage:true});shots.push(name+'.png');};
try {
  await p.goto(origin+'/quan-tri/');await settle(p);
  if(process.env.CASE_ADMIN_IMPERSONATE==='1') {
    await p.evaluate(async()=>{
      const r=await fetch('/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'0901000008'})});
      if(!r.ok) throw new Error('Chưa tạo được phiên admin thử: HTTP '+r.status);
      sessionStorage.setItem('agv-session-quan-tri',JSON.stringify({token:(await r.json()).token}));
    });
    await p.reload();await settle(p);
  } else {
    await p.locator('[name=phone]').fill(process.env.CASE_ADMIN_PHONE || '0901000008');
    const sent=p.waitForResponse(r=>r.url().endsWith('/v1/auth/otp/send'));
    await p.locator('[data-form=loginPhone] button:not([type=button])').click();await settle(p);
    const response=await sent;assert.equal(response.status(),200,JSON.stringify(await response.json()));
    await p.locator('[name=code]').fill('123456');await p.locator('[data-form=loginOtp] button').click();await settle(p);
  }
  await p.getByRole('heading',{name:'Tổng quan vận hành',exact:true}).waitFor();
  const profileIds=process.env.CASE_PROFILES?.split(',');
  const cases=(process.env.CASE_TEMPLATES||'offer,sign,deposit,active').split(',');
  let adminToken;
  for(const [index,template] of cases.entries()){
    if(index && Number(process.env.CASE_PAUSE_MS ?? 65000)>0) {console.log('Chờ ngân sách ingress trước mẫu kế tiếp');for(let ms=Number(process.env.CASE_PAUSE_MS ?? 65000);ms>0;ms-=30000) await new Promise(r=>setTimeout(r,Math.min(ms,30000)));}
    await p.goto(origin+'/quan-tri/#/cases');await settle(p);
    await p.locator('[name=template]').selectOption(template);
    if(profileIds) await p.locator('[name=profile]').selectOption(profileIds[index]);
    await p.locator('[name=seller]').selectOption({label:await p.locator('[name=seller] option').filter({hasText:'0918000421'}).innerText()});
    await p.locator('[name=buyer]').selectOption({label:await p.locator('[name=buyer] option').filter({hasText:'0909000213'}).innerText()});
    await p.locator('[name=product]').selectOption('XOAI_CAT_CHU|L1');
    await p.locator('[name=qty]').fill('1200');await p.locator('[name=price]').fill(profileIds?.[index]==='low'?'18000':'23000');
    await choose(p,'[name=plate]',process.env.CASE_PLATES?.split(',')[index] || process.env.CASE_PLATE || '66C-123.45');
    adminToken=await p.evaluate(()=>sessionStorage.getItem('agv-session-quan-tri'));
    await p.getByRole('button',{name:'Tạo tình huống',exact:true}).click();
    await settle(p);
    await p.waitForFunction(()=>document.querySelector('[data-form=createCase] button:not([type=button])')?.disabled===false,{},{timeout:120000});
    const record=await p.evaluate(()=>JSON.parse(localStorage.getItem('agv-local-test-cases-v1'))[0]);
    assert.equal(record.template,template);if(profileIds)assert.equal(record.profile,profileIds[index]);assert.equal(record.phase,'ready',record.step+': '+record.error+' · '+JSON.stringify(record.failure || {}));
    await shot(p,'admin-'+(record.profile||template));
    const card=p.locator(`[data-case-id="${record.id}"]`);
    const opened=[];
    for(const [side,app] of [['bán','ban'],['mua','mua']]) {
      const openedPage=context.waitForEvent('page');
      await card.getByRole('link',{name:'Mở app '+side+' đúng người',exact:true}).click();
      const child=await openedPage;
      try {await child.waitForURL('**/'+app+'/**');await settle(child);}
      catch(err) {throw new Error(err.message+' · Tab mới: '+await child.locator('body').innerText());}
      assert.equal(await child.locator('[role=alert]').count(),0,await child.locator('body').innerText());
      const expected=app==='ban'?record.seller:record.buyer;
      const session=await child.evaluate(async()=>{const token=JSON.parse(sessionStorage.getItem('agv-session-'+document.body.dataset.app)).token;return (await(await fetch('/v1/auth/session',{headers:{Authorization:'Bearer '+token}})).json());});
      assert.equal(session.name,expected.display_name);assert.equal(session.org.code,expected.org_code);
      if(app==='mua') assert.match(await child.locator('body').innerText(),/Tiền ảo để xem quy trình, không chuyển tiền thật/);
      else { assert.equal(await child.locator('.test-strip:visible').count(),0); assert.equal(await child.locator('.virtual-money-notice:visible').count(),0); }
      const actual=await child.evaluate(async r=>{
        const token=JSON.parse(sessionStorage.getItem('agv-session-'+document.body.dataset.app)).token;
        const path=r.template==='offer'?'/v1/offers/'+r.offerId:'/v1/orders/'+r.orderId;
        return (await(await fetch(path,{headers:{Authorization:'Bearer '+token}})).json()).status;
      },record);
      assert.equal(actual,record.actualStatus);
      for(const qr of await child.locator('[data-qr]').all()) {
        const payload=await qr.getAttribute('data-qr');
        if(await qr.getAttribute('aria-label')!=='QR người nhận hàng') assert.match(payload,/^AGIVIET-TEST-ONLY/);
      }
      await shot(child,app+'-'+(record.profile||template));opened.push({app,status:actual,phone:expected.phone});await child.close();
    }
    assert.equal(await p.evaluate(()=>sessionStorage.getItem('agv-session-quan-tri')),adminToken);
    results.push({template,pass:true,record,opened});console.log('ĐẠT',template,record.actualStatus,'hai app đúng người');
  }
  await p.goto(origin+'/quan-tri/#/virtual-bank');await settle(p);await shot(p,'ngan-hang-ao');
  assert.match(await p.locator('body').innerText(),/Số dư toàn bộ tài khoản đảm bảo · chưa có/);
  if(cases.includes('active')) assert.match(await p.locator('body').innerText(),/Cọc đang giữ|deposit_held/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.CASE_BANK_STEPS==='1') {
    // Chỉ stack riêng có case hủy; không xử lý tất cả lệnh của môi trường trình diễn hiện hữu.
    await new Promise(r=>setTimeout(r,33000));await new Promise(r=>setTimeout(r,32000));
    const cancelled=results.find(r=>r.template==='cancel').record;
    const money=await p.evaluate(async r=>{
      const session=await(await fetch('/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:r.buyer.phone,org_code:r.buyer.org_code})})).json();
      try{return await(await fetch('/v1/orders/'+r.orderId+'/money',{headers:{Authorization:'Bearer '+session.token}})).json();}
      finally{await fetch('/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+session.token,'content-type':'application/json'},body:'{}'});}
    },cancelled);
    assert.ok(money.lenh_ngan_hang.length);
    await p.locator('[data-form=bankProcess] [name=code]').fill(money.lenh_ngan_hang[0].code);
    await press(p.locator('[data-form=bankProcess] button'));await settle(p);
    await shot(p,'ngan-hang-da-xu-ly-cho-webhook');
    await press(p.locator('[data-form=bankDeliver] button'));await settle(p);
    await shot(p,'ngan-hang-da-giao-webhook');
    await press(p.locator('[data-form=bankReconcile] button'));await settle(p);
    const bank=await p.evaluate(async()=>await(await fetch('/v1/sim/bank/state')).json());
    assert.ok(bank.lenh.some(i=>i.code===money.lenh_ngan_hang[0].code&&i.status==='succeeded'));
    results.push({bankControls:true,pass:true,instruction:money.lenh_ngan_hang[0].code});
  }
  await p.goto(origin+'/quan-tri/#/cases');await settle(p);
  await p.locator('[data-form=resetFirst] [type=checkbox]').check();await press(p.locator('[data-form=resetFirst] button'));await settle(p);
  await p.locator('[data-form=resetFinal]').waitFor();await shot(p,'reset-xac-nhan-hai-lan');
  await press(p.getByRole('button',{name:'Giữ dữ liệu',exact:true}));await settle(p);
  assert.equal(await p.locator('[data-form=resetFinal]').count(),0);
  if(process.env.CASE_RESET==='1') {
    await p.locator('[data-form=cleanupFirst] [type=checkbox]').check();await press(p.locator('[data-form=cleanupFirst] button'));await settle(p);
    await p.locator('[data-form=resetFinal] [name=phrase]').fill('XOA DU LIEU THU');
    await p.locator('[data-form=resetFinal] [type=checkbox]').check();
    await p.locator('[data-form=resetFinal] button:not([type=button])').click();
    await p.locator('[data-form=loginPhone]').waitFor();await settle(p);
    assert.equal(await p.evaluate(()=>localStorage.getItem('agv-local-test-cases-v1')),null);
    await shot(p,'don-sach-da-reset-ve-dang-nhap');results.push({cleanupReset:true,pass:true});
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(httpErrors,[], 'Không được coi case đạt khi còn HTTP lỗi ngoài dự kiến.');
} catch(err) {
  results.push({pass:false,error:err.stack});await shot(p,'LOI');process.exitCode=1;console.error(err.message);
} finally {
  await writeFile(dir+'ket-qua.json',JSON.stringify({at:new Date().toISOString(),origin,adminAuth:process.env.CASE_ADMIN_IMPERSONATE==='1'?'test/impersonate':'OTP UI',results,errors,httpErrors,shots},null,2));await browser.close();
}
