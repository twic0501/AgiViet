import fs from 'node:fs';import {createRequire} from 'node:module';const {chromium}=createRequire('/home/twictrn/rnd idea/package.json')('playwright');
const out=new URL('../',import.meta.url).pathname,origin='http://127.0.0.1:18990';
const {token}=await(await fetch('http://127.0.0.1:18980/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'0918000421'})})).json();
const b=await chromium.launch({args:['--no-sandbox']});const results=[];
for(const width of [390,1280])for(const motion of ['no-preference','reduce']){
 const c=await b.newContext({viewport:{width,height:844},httpCredentials:{username:'pilot',password:process.env.PILOT_PASS||''},reducedMotion:motion,serviceWorkers:'block'});
 await c.addInitScript(t=>{sessionStorage.setItem('agv-session-ban',JSON.stringify({token:t}));for(const k of ['home','offer','order','post','order-payments','ledger'])localStorage.setItem('agv-ban-da-xem-'+k,'1');},token);
 const p=await c.newPage();await p.goto(origin+'/ban/#/lots');await p.waitForFunction(()=>document.querySelector('#app')?.dataset.renderedRoute===location.hash);await p.waitForTimeout(500);
 for(const target of ['offers','lots/ben-mua','lots']){
  await p.evaluate(()=>{window.auditFrames=[];const start=performance.now();function frame(){const el=document.querySelector('#content'),r=el?.getBoundingClientRect(),row=document.querySelector('.sl-dg'),rr=row?.getBoundingClientRect();window.auditFrames.push({ms:performance.now()-start,hash:location.hash,x:r?.x,width:r?.width,rowX:rr?.x,transform:el?getComputedStyle(el).transform:'',anim:el?.getAnimations().map(a=>({frames:a.effect.getKeyframes(),time:a.currentTime}))});if(performance.now()-start<2200)requestAnimationFrame(frame)};requestAnimationFrame(frame)});
  const a=p.locator('.sl-tab a').filter({has:p.locator(':scope')});
  await p.locator(`.sl-tab a[href="#/${target}"]`).click();
  await p.waitForTimeout(2300);
  const frames=await p.evaluate(()=>window.auditFrames);const filename=`danh-sach-${width}-${motion}-${target.replaceAll('/','_')}.png`;await p.screenshot({path:out+'anh/'+filename});
  results.push({width,motion,target,filename,frames});
 }
 await c.close();
}
fs.writeFileSync(out+'du-lieu/do-danh-sach.json',JSON.stringify(results,null,2));console.log(results.map(x=>({width:x.width,motion:x.motion,target:x.target,minX:Math.min(...x.frames.map(f=>f.x).filter(Number.isFinite)),maxX:Math.max(...x.frames.map(f=>f.x).filter(Number.isFinite)),animations:x.frames.filter(f=>f.anim?.length).length})));await b.close();
