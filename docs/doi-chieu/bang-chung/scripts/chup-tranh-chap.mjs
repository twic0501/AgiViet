// Audit read-only browser crawl. Only POST allowed is test impersonation (session creation).
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire('/home/twictrn/rnd idea/package.json')('playwright');
const out=new URL('../',import.meta.url).pathname;
let origin=process.env.AUDIT_ORIGIN||'http://127.0.0.1:19090';
const apiOrigin=process.env.AUDIT_API_ORIGIN||'http://127.0.0.1:19080';
const basic='Basic '+Buffer.from('pilot:'+(process.env.PILOT_PASS||'')).toString('base64');
async function request(path,body,token){
 const r=await fetch(apiOrigin+path,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,data:await r.json()};
}
const health=await request('/health');
const accounts=(await request('/v1/test/accounts')).data;
fs.writeFileSync(out+'du-lieu/health-phien-tranh-chap.json',JSON.stringify({at:new Date().toISOString(),...health},null,2));
console.log('accounts',JSON.stringify(accounts).slice(0,2500));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const records=JSON.parse(fs.readFileSync(out+'du-lieu/man-v2.json','utf8'));
let nextRequest=Date.now();
let nextAuth=Date.now();
async function capture(p,role,route,tag=''){
 const index=String(records.length+1).padStart(3,'0'),filename=role+'-'+index+'-'+route.replace(/[^a-z0-9-]/gi,'_').slice(0,95)+(tag?'-'+tag:'')+'.png';
 const r={index,role,route,tag,filename}; const errors=[];
 const err=e=>errors.push(e.message);p.on('pageerror',err);
 const response=r=>{if(r.status()>=400)errors.push(r.status()+' '+new URL(r.url()).pathname)};p.on('response',response);
 try{
  await p.goto(origin+'/'+role+'/#/'+route,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#app')?.dataset.renderedRoute===location.hash && document.querySelector('#app')?.getAttribute('aria-busy')!=='true',{},{timeout:60000});
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



const fixture=JSON.parse(fs.readFileSync(out+'du-lieu/phien-tranh-chap.json','utf8'));
for(const [role,phone] of [['ban','0918000421'],['mua','0909000210']]){
 const sess=await request('/v1/test/impersonate',{phone});const token=sess.data.token;
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.addInitScript(({token,role})=>{sessionStorage.setItem('agv-session-'+role,JSON.stringify({token}));for(const k of ['home','offer','order','post','order-payments','ledger'])localStorage.setItem('agv-ban-da-xem-'+k,'1');},{token,role});const p=await ctx.newPage();
 for(const d of fixture.disputes)await capture(p,role,'dispute/'+d.id,'co-lap-TH031');await ctx.close();
}
await browser.close();
