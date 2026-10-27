// Kiểm tên miền thật theo ranh giới quản trị local; không ghi credential/cookie/token.
import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {press,skipGuides,signedIn,horizontalOverflow} from './ui-controls.mjs';
const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
const origin=process.env.PUBLIC_URL || 'https://agiviet.id.vn';
const operator=process.env.OPERATOR_URL || 'http://127.0.0.1:18889';
const dir=new URL('../../docs/frontend/'+(process.env.PUBLIC_OUTPUT || 'anh-cong-khai-quan-tri-local')+'/',import.meta.url).pathname;
await mkdir(dir,{recursive:true});
const env=await readFile((process.env.AGV_LOCAL_STATE || process.env.HOME+'/.local/share/agiviet')+'/local.env','utf8');
const password=env.match(/^PILOT_PASSWORD=(.*)$/m)[1];
const authorization='Basic '+Buffer.from('pilot:'+password).toString('base64');
const results=[],boundary=[];
const browser=await chromium.launch({args:['--no-sandbox']});
async function settle(p){
  await p.waitForFunction(()=>{const a=document.querySelector('#app');return a?.dataset.renderedRoute===location.hash && a.getAttribute('aria-busy')!=='true';});
  assert.equal(await p.locator('[role=alert]').count(),0,await p.locator('body').innerText());
  assert.equal(await horizontalOverflow(p),false);
}
try {
  const files=await readdir(new URL('../quan-tri/',import.meta.url));
  const paths=['/quan-tri','/quan-tri/',...files.map(f=>'/quan-tri/'+f),'/%71uan-tri/admin.js','/quan-tri%2fadmin.js','//quan-tri/admin.js'];
  for(const base of [...new Set([origin,'http://127.0.0.1:18888'])]) {
    for(const path of paths) for(const pilot of [false,true]) {
      const r=await fetch(base+path,{headers:pilot?{authorization,'X-Agv-Scope':'operator'}:{},signal:AbortSignal.timeout(15000)});
      assert.equal(r.status,404,base+path);assert.equal(r.headers.get('www-authenticate'),null);
      boundary.push({origin:base,path,pilot,status:r.status});await r.body?.cancel();
    }
    for(const path of ['/v1/test/accounts','/v1/sim/bank/state']) {
      const r=await fetch(base+path,{headers:{authorization},signal:AbortSignal.timeout(15000)});assert.equal(r.status,404);boundary.push({origin:base,path,pilot:true,status:r.status});await r.body?.cancel();
    }
    const root=await fetch(base+'/',{headers:{authorization},signal:AbortSignal.timeout(15000)});
    const rootHtml=await root.text(),rootPass=root.status===200&&!/quan-tri/.test(rootHtml);
    results.push({name:'Trang gốc chỉ có App bán và App mua',origin:base,status:root.status,pass:rootPass});
    if(!rootPass){process.exitCode=1;console.error('CHƯA ĐẠT trang gốc',base,root.status,'· cần restart frontend nếu đang giữ server.mjs cũ');}
  }
  for(const pilot of [false,true]) {
    const r=await fetch(operator+'/quan-tri/',{headers:pilot?{authorization}:{},signal:AbortSignal.timeout(15000)});
    assert.equal(r.status,pilot?200:401);boundary.push({origin:operator,path:'/quan-tri/',pilot,status:r.status});await r.body?.cancel();
  }
  for(const [app,phone,width] of [['ban',process.env.PUBLIC_SELLER_PHONE || '0918000421',390],['mua',process.env.PUBLIC_BUYER_PHONE || '0909000210',1280]]) {
    const ctx=await browser.newContext({viewport:{width,height:app==='ban'?844:900},httpCredentials:{username:'pilot',password},reducedMotion:'reduce'});await skipGuides(ctx);
    try {
      const p=await ctx.newPage(),errors=[],httpErrors=[],testCalls=[],consoleErrors=[];
      p.on('pageerror',err=>errors.push(err.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
      p.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});
      p.on('request',r=>{if(/\/v1\/(test|sim)/.test(r.url()))testCalls.push(r.url());});
      await p.goto(origin+'/'+app+'/');await settle(p);await p.locator('form[data-form=loginPhone]').waitFor();
      assert.equal(await p.getByText('Công cụ thử',{exact:true}).count(),0);
      assert.equal(await p.getByRole('link',{name:'Đăng ký doanh nghiệp',exact:true}).count(),app==='mua'?1:0);
      await p.screenshot({path:dir+app+'-dang-nhap.png',fullPage:app!=='ban'});
      await p.locator(`[data-phone="${phone}"]`).click();assert.equal(await p.locator('input[name=phone]').inputValue(),phone);
      await press(p.locator('form[data-form=loginPhone] button:not([type=button])'));await settle(p);
      await p.locator('input[name=code]').fill('123456');await press(p.locator('form[data-form=loginOtp] button'));await settle(p);await signedIn(p,app);
      if(app==='ban'){assert.equal(await p.locator('.test-strip:visible,.virtual-money-notice:visible').count(),0);}
      else assert.equal(await p.locator('.virtual-money-notice:visible').count(),1);
      await p.screenshot({path:dir+app+'-man-chinh.png',fullPage:app!=='ban'});
      assert.deepEqual(errors,[]);assert.deepEqual(testCalls,[]);assert.deepEqual(httpErrors,[]);assert.deepEqual(consoleErrors,[]);
      results.push({app,phone,pass:true,login:true,home:true,pageErrors:errors,httpErrors,consoleErrors,testCalls});console.log('ĐẠT',app,'OTP → màn chính, không gọi test/sim');
    } finally {await ctx.close();}
  }
  console.log('ĐẠT',boundary.length,'kiểm ranh giới; quản trị công khai 404/operator sau pilot 200');
} catch(error) {results.push({pass:false,error:error.stack});process.exitCode=1;console.error(error.message);}
finally {await browser.close();await writeFile(dir+'ket-qua.json',JSON.stringify({origin,operator,at:new Date().toISOString(),boundary,results},null,2));}
