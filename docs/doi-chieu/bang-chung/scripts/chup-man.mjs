// Audit read-only browser crawl. Only POST allowed is test impersonation (session creation).
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire('/home/twictrn/rnd idea/package.json')('playwright');
const out=new URL('../',import.meta.url).pathname;
const origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:18888';
const apiOrigin=process.env.AUDIT_API_ORIGIN||'http://127.0.0.1:18080';
const basic='Basic '+Buffer.from('pilot:'+(process.env.PILOT_PASS||'')).toString('base64');
async function request(path,body,token){
 const r=await fetch(apiOrigin+path,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,data:await r.json()};
}
const health=await request('/health');
const accounts=(await request('/v1/test/accounts')).data;
fs.writeFileSync(out+'du-lieu/health.json',JSON.stringify({at:new Date().toISOString(),...health},null,2));
console.log('accounts',JSON.stringify(accounts).slice(0,2500));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=[];
let nextRequest=Date.now();
let nextAuth=Date.now();
async function capture(p,role,route,tag=''){
 const index=String(records.length+1).padStart(3,'0'),filename=role+'-'+index+'-'+route.replace(/[^a-z0-9-]/gi,'_').slice(0,95)+(tag?'-'+tag:'')+'.png';
 const r={index,role,route,tag,filename}; const errors=[];
 const err=e=>errors.push(e.message);p.on('pageerror',err);
 const response=r=>{if(r.status()>=400)errors.push(r.status()+' '+new URL(r.url()).pathname)};p.on('response',response);
 try{
  await p.goto(origin+'/'+role+'/#/'+route,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#app')?.dataset.renderedRoute===location.hash && document.querySelector('#app')?.getAttribute('aria-busy')!=='true',{},{timeout:20000});
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
  Object.assign(r,await p.evaluate(()=>{
   const box=el=>{if(!el)return null;const b=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:b.x,y:b.y,width:b.width,height:b.height,position:s.position,top:s.top,text:el.innerText?.slice(0,200)}};
   return {url:location.href,title:document.querySelector('h1')?.innerText,text:document.querySelector('#content')?.innerText,
    headings:[...document.querySelectorAll('h1,h2')].map(e=>e.innerText),
    headers:[...document.querySelectorAll('.sl-dau,.sl-dau-chu,.page-heading,header.top')].map(box),
    listen:[...document.querySelectorAll('[data-action=listen]')].map(e=>({text:e.innerText,aria:e.getAttribute('aria-label'),...box(e)})),
    nav:document.querySelector('.bottom-nav')?.innerText,
    links:[...document.querySelectorAll('a[href^="#/"]')].map(e=>({text:e.innerText,href:e.getAttribute('href').slice(2)})),
    forms:[...document.querySelectorAll('form')].map(e=>({name:e.dataset.form,fields:[...e.querySelectorAll('input,select,textarea')].map(e=>({name:e.name,type:e.type}))})),
    overflow:{window:innerWidth,document:document.documentElement.scrollWidth,app:document.querySelector('#app')?.scrollWidth,content:box(document.querySelector('#content'))}};
  }));
  await p.screenshot({path:out+'anh/'+filename,fullPage:true});
  r.scroll=await p.evaluate(()=>{
   const app=document.querySelector('#app'),h=document.querySelector('.sl-dau,.sl-dau-chu,.page-heading,h1');
   const y0=h?.getBoundingClientRect().y;app.scrollTop=220;window.scrollTo(0,220);
   return {headerYBefore:y0,headerYAfter:h?.getBoundingClientRect().y,appScrollTop:app.scrollTop,windowScrollY:scrollY};
  });
  if(r.scroll.appScrollTop||r.scroll.windowScrollY){r.scrollFilename=filename.replace('.png','-cuon.png');await p.screenshot({path:out+'anh/'+r.scrollFilename,fullPage:false});}
 }catch(e){r.failure=e.message;await p.screenshot({path:out+'anh/'+filename,fullPage:true}).catch(()=>{});}
 p.off('pageerror',err);p.off('response',response);r.errors=errors;records.push(r);
 fs.writeFileSync(out+'du-lieu/man-v2.json',JSON.stringify(records,null,2));
 console.log(index,role,route,r.title||r.failure||'');return r;
}
for(const [role,phone] of [['ban','0918000421'],['mua','0909000213']]){
 const ctx=await browser.newContext({viewport:{width:390,height:844},httpCredentials:{username:'pilot',password:process.env.PILOT_PASS||''},serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.route('**/v1/**',async route=>{const now=Date.now(),auth=route.request().url().includes('/v1/auth'),at=Math.max(now,nextRequest,auth?nextAuth:0);nextRequest=at+350;if(auth)nextAuth=at+2300;await new Promise(r=>setTimeout(r,at-now));await route.continue();});
 const p=await ctx.newPage();
 await capture(p,role,'home','chua-dang-nhap');
 // OTP form only: no request/OTP is sent to the running pilot.
 const sess=await request('/v1/test/impersonate',{phone});if(sess.status!==200)throw Error(JSON.stringify(sess));
 const token=sess.data.token;
 await ctx.addInitScript(({token,role})=>{sessionStorage.setItem('agv-session-'+role,JSON.stringify({token}));for(const k of ['home','offer','order','post','order-payments','ledger'])localStorage.setItem('agv-ban-da-xem-'+k,'1');},{token,role});
 await p.evaluate(({token,role})=>sessionStorage.setItem('agv-session-'+role,JSON.stringify({token})),{token,role});
 await p.reload({waitUntil:'domcontentloaded'});
 const data={};for(const path of ['/v1/orders','/v1/offers','/v1/lots'+(role==='ban'?'?mine=true':''),'/v1/demands','/v1/org','/v1/notifications'])data[path]=await request(path,null,token);
 fs.writeFileSync(out+'du-lieu/'+role+'-api.json',JSON.stringify(data,null,2));
 const orders=data['/v1/orders'].data,offers=data['/v1/offers'].data,lots=data['/v1/lots'+(role==='ban'?'?mine=true':'')].data,demands=data['/v1/demands'].data;
 const routes=new Set(['home','lots','offers','orders','ledger','organization','plans','support','notifications','payout','messages']);
 if(role==='ban')for(const r of ['lots/ben-mua','post','thoi-tiet','tin-tuc','lich-su','nhat-ky','dat-truoc','bao-tieu','ban-gap','ledger/chi-tiet'])routes.add(r);
 else for(const r of ['demand-new','demands','register'])routes.add(r);
 // All record detail routes, all order tabs; capped per status to avoid thousands of duplicate screens.
 for(const l of lots.slice(0,role==='ban'?12:4)){routes.add('lots/'+l.id);if(role==='mua')routes.add('bid/'+l.id);}
 for(const o of offers.slice(0,8)){routes.add('offers/'+o.id);if(role==='mua'&&o.status==='accepted')routes.add('create-order/'+o.id);}
 for(const d of demands.slice(0,4)){routes.add('demands/'+d.id);routes.add('matches/'+d.id);}
 const byStatus=new Map();for(const o of orders)if(!byStatus.has(o.status))byStatus.set(o.status,o);
 for(const o of byStatus.values()){routes.add('order/'+o.id);for(const tab of ['terms','deposit','payments','delivery','money','documents','cancel','disputes','amendments'])routes.add('order/'+o.id+'/'+tab);}
 let count=0;for(const route of routes){const r=await capture(p,role,route);count++;}
 // Crawl additional links hidden in expanded sections too, filtered to this app and not actions.
 const additional=new Set(records.filter(r=>r.role===role).flatMap(r=>(r.links||[]).map(l=>l.href)));
 for(const route of additional)if(!routes.has(route)&&!route.startsWith('them')&&!route.startsWith('order/')){routes.add(route);await capture(p,role,route);}
 await ctx.close();
}
await browser.close();
console.log('DONE',records.length,'screens');
