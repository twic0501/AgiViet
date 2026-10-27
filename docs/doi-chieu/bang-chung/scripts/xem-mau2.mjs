import fs from 'node:fs';import {createRequire} from 'node:module';const {chromium}=createRequire('/home/twictrn/rnd idea/package.json')('playwright');const out=new URL('../',import.meta.url).pathname;
const b=await chromium.launch({args:['--no-sandbox']});const rows=[];
for(const file of ['AgiViet_app_ban.html','AgiViet_app_mo_phong.html','bo-cuc-app-ban/index.html','bo-cuc-app-mua/index.html','thiet-ke-lai/index.html']){
 const c=await b.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file:///home/twictrn/Documents/AgiViet/'+file);await p.waitForTimeout(800);
 const data=await p.evaluate(()=>({title:document.title,text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(e=>({text:e.innerText,title:e.title,aria:e.getAttribute('aria-label')})),links:[...document.querySelectorAll('a')].map(e=>({text:e.innerText,href:e.getAttribute('href')})),headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.innerText)}));
 const filename='mau2-'+file.replaceAll('/','_').replace('.html','.png');await p.screenshot({path:out+'anh/'+filename,fullPage:true});rows.push({file,filename,errors,...data});await c.close();console.log(file,data.text.slice(0,1300));
}
fs.writeFileSync(out+'du-lieu/mau2-render.json',JSON.stringify(rows,null,2));await b.close();
