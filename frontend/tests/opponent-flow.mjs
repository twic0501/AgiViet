// Mỗi hành trình bắt đầu ở hồ sơ giữa quy trình. Chuẩn bị case qua UI quản trị;
// quyết định của người thử đi qua iframe app thật, đối ứng qua API có nhật ký.
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {choose,press,skipGuides} from './ui-controls.mjs';
import {decision} from '../quan-tri/profiles.js';
const {chromium}=createRequire(process.env.HOME+'/rnd idea/package.json')('playwright');
const origin=process.env.FRONTEND_URL||'http://127.0.0.1:18889';
const dir=new URL('../../docs/frontend/'+(process.env.AUTO_OUTPUT||'anh-doi-ung-27')+'/',import.meta.url).pathname;await mkdir(dir,{recursive:true});
const password=process.env.AUTO_PILOT_PASSWORD || (await readFile((process.env.AGV_LOCAL_STATE||process.env.HOME+'/.local/share/agiviet')+'/local.env','utf8')).match(/^PILOT_PASSWORD=(.*)$/m)[1];
if(process.env.AUTO_RESET==='1' && new URL(origin).port==='18889') throw new Error('Không reset stack trình diễn chính bằng bộ tự động.');
const browser=await chromium.launch({args:['--no-sandbox']});
const results=[],errors=[],shots=[],httpErrors=[],inspectionResponses=[];
const types={shortfall:'checking',downgrade:'checking',late:'active',harvest:'active',low:'offer',inspection:'dispute',arrival:'checking'};
const selected=(process.env.AUTO_PROFILES||Object.keys(types).join(',')).split(',');
const settle=async f=>f.waitForFunction(()=>{const el=document.querySelector('#app');return el?.dataset.renderedRoute===location.hash && el.getAttribute('aria-busy')!=='true';});
const submit=async(f,name)=>{await press(f.locator(`[data-form="${name}"] button:not([type=button])`));await settle(f);assert.equal(await f.locator('[role=alert]').count(),0,await f.locator('body').innerText());};
let seed='';for(let n=0;n<100;n++){const candidate='thu-'+n;if(decision(candidate,'amendment',['accept','reject'])==='accept'&&decision(candidate,'offer-2',['accept','counter'])==='accept'&&decision(candidate,'offer-1',['accept','counter'])==='counter'){seed=candidate;break;}}
assert.ok(seed);
try {
  for(const profile of selected) for(const side of (process.env.AUTO_SIDES||'seller,buyer').split(',')) {
    const context=await browser.newContext({httpCredentials:{username:'pilot',password},viewport:{width:1440,height:1000},reducedMotion:'reduce'});await skipGuides(context);
    const admin=await context.newPage();admin.setDefaultTimeout(15000);
    context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)httpErrors.push({profile,side,status:r.status(),path:new URL(r.url()).pathname});});});
    let play,record;
    const shot=async(p,suffix)=>{const file=`${profile}-${side}-${suffix}.png`;await p.screenshot({path:dir+file,fullPage:true});shots.push(file);};
    try {
      if(process.env.AUTO_RESET==='1') {
        const reset=await fetch((process.env.API_ORIGIN||'http://127.0.0.1:8080')+'/v1/test/reset',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.ok(reset.ok);
      }
      await admin.goto(origin+'/quan-tri/');await settle(admin);
      await admin.evaluate(async()=>{const res=await fetch('/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:'0901000008'})});if(!res.ok)throw new Error('Impersonate admin HTTP '+res.status);sessionStorage.setItem('agv-session-quan-tri',JSON.stringify({token:(await res.json()).token}));});
      await admin.reload();await settle(admin);await admin.goto(origin+'/quan-tri/#/cases');await settle(admin);
      await admin.locator('[name=profile]').selectOption(profile);await admin.locator('[name=seed]').fill(seed);
      await admin.locator('[name=template]').selectOption(types[profile]);await choose(admin,'[name=plate]','66C-123.45');
      await admin.getByRole('button',{name:'Tạo tình huống',exact:true}).click();
      await admin.waitForFunction(()=>document.querySelector('[data-form=createCase] button:not([type=button])')?.disabled===false,null,{timeout:120000});
      record=await admin.evaluate(()=>JSON.parse(localStorage.getItem('agv-local-test-cases-v1'))[0]);assert.equal(record.phase,'ready',record.error);
      const popup=context.waitForEvent('page');await admin.locator(`[data-case-id="${record.id}"]`).getByRole('link',{name:side==='seller'?'Thử bán · đối ứng tự động':'Thử mua · đối ứng tự động',exact:true}).click();play=await popup;play.setDefaultTimeout(20000);
      await play.locator('#app-frame').waitFor({state:'visible'});const frame=play.frames().find(f=>f.url().includes(side==='seller'?'/ban/':'/mua/'));assert.ok(frame);await settle(frame);await shot(play,'mo-ho-so');
      const api=async path=>frame.evaluate(async path=>{const app=document.body.dataset.app;const session=JSON.parse(sessionStorage.getItem('agv-session-'+app));const res=await fetch(path,{headers:{Authorization:'Bearer '+session.token}});if(!res.ok)throw new Error('GET '+path+' '+res.status);return res.json();},path);
      const wait=async predicate=>{for(let n=0;n<35;n++){const status=await play.locator('#status').innerText();if(status.includes('đã dừng ở lỗi'))throw new Error(status);if(await predicate())return;await play.waitForTimeout(1000);}throw new Error('Chưa tới đích · '+await play.locator('#status').innerText());};
      const refresh=async route=>{if(route){const url=origin+(side==='seller'?'/ban/':'/mua/')+'#/'+route;if(frame.url()===url)await Promise.all([frame.waitForNavigation({waitUntil:'domcontentloaded'}),frame.evaluate(()=>location.reload())]);else await frame.goto(url);}else await Promise.all([frame.waitForNavigation({waitUntil:'domcontentloaded'}),play.locator('#refresh').click()]);await settle(frame);};
      let endpoint;
      if(profile==='low') {
        if(side==='seller') {await frame.getByRole('button',{name:'Trả giá',exact:true}).click();await settle(frame);await frame.locator('[data-form=counter] [name=price]').fill('19000');await submit(frame,'counter');}
        else {await wait(async()=>{const o=await api('/v1/offers/'+record.offerId);return o.toi_luot==='buyer';});await refresh();await press(frame.locator('[data-action=accept]'));await settle(frame);await frame.goto(origin+'/mua/#/create-order/'+record.offerId);await settle(frame);for(const [name,value] of Object.entries({mode:'at_farm',site:'tai_vuon',transport:'buyer',timing:'before_loading'}))await choose(frame,'[name='+name+']',value);await frame.locator('[name=downgrade]').fill('14000');const clock=await api('/v1/test/clock');const from=new Date(new Date(clock.now).getTime()+7*3600000).toISOString().slice(0,16);const to=new Date(new Date(clock.now).getTime()+8*3600000).toISOString().slice(0,16);await frame.locator('[name=from]').fill(from);await frame.locator('[name=to]').fill(to);await submit(frame,'createOrder');}
        await wait(async()=>{const r=await play.evaluate(id=>JSON.parse(localStorage.getItem('agv-local-test-cases-v1')).find(x=>x.id===id),record.id);if(r.orderId){record=r;return true;}return false;});
        if(side==='seller')await wait(async()=>(await api('/v1/orders/'+record.orderId)).status==='awaiting_seller');
        await refresh('order/'+record.orderId+'/terms');await frame.locator('[name=commitment]').check();if(await frame.locator('[name=abnormal]').count())await frame.locator('[name=abnormal]').check();await submit(frame,side==='seller'?'chuanBiKy':'prepareSign');await frame.locator('[name=code]').fill('123456');await submit(frame,side==='seller'?'ky':'sign');
        await wait(async()=>!['drafting','awaiting_seller'].includes((await api('/v1/orders/'+record.orderId)).status));endpoint='Lời chào trả giá → hợp đồng đủ chữ ký';
      } else if(profile==='harvest') {
        if(side==='buyer'){await press(frame.getByRole('button',{name:'Đồng ý lập phụ lục',exact:true}));await settle(frame);}
        await wait(async()=> (await api(`/v1/orders/${record.orderId}/amendments`))[0].status==='accepted');await refresh();
        const a=(await api(`/v1/orders/${record.orderId}/amendments`))[0];await frame.locator(`[data-form="amendPrepare-${a.id}"] [type=checkbox]`).check();await submit(frame,'amendPrepare-'+a.id);await frame.locator('[name=code]').fill('123456');await submit(frame,'amendSign-'+a.id);
        await wait(async()=>(await api('/v1/orders/'+record.orderId)).effective_version_no===2);endpoint='Xin giảm lượng → phụ lục hai bên ký, phiên bản 2';
      } else if(profile==='late') {
        if(side==='buyer') {const pay=(await api(`/v1/orders/${record.orderId}/payments`)).find(p=>p.kind==='goods_before_loading');await frame.locator('details.rule summary').filter({hasText:'Ghi số tiền đã chuyển'}).click();await frame.locator('[name=amount]').fill(pay.amount_due_vnd);await frame.locator('[name=evidence]').setInputFiles({name:'chung-tu-ao.png',mimeType:'image/png',buffer:Buffer.from((await readFile(new URL('../quan-tri/fixture.png.base64',import.meta.url),'utf8')).trim(),'base64')});await submit(frame,'report-'+pay.id);}
        else {await wait(async()=>(await api(`/v1/orders/${record.orderId}/payments`)).some(p=>['payer_reported','reported_paid'].includes(p.status)));await refresh();const pay=(await api(`/v1/orders/${record.orderId}/payments`)).find(p=>p.kind==='goods_before_loading');await press(frame.locator(`[data-action="du-${pay.id}"]`));await settle(frame);await frame.locator('[name=ref]').fill('AGV-AO-DOI-UNG');await submit(frame,'chuanBi-'+pay.id);await frame.locator('[name=code]').fill('123456');await submit(frame,'xacNhan-'+pay.id);}
        await wait(async()=>(await api(`/v1/orders/${record.orderId}/payments`)).find(p=>p.kind==='goods_before_loading').status==='fully_received');endpoint='Chậm trả → báo trả có chứng từ → OTP xác nhận đủ';
      } else if(profile==='arrival') {
        assert.equal(record.deliveryStatus,'arrival_check'); // Đã đọc lại lúc tạo; phía mua đối ứng có thể đã khiếu nại ngay.
        if(side==='buyer') {
          await choose(frame,'[data-form=complaint] [name=line]','1');
          await frame.locator('[data-form=complaint] [name=qty]').fill('120');
          await frame.locator('[data-form=complaint] [name=seal]').fill('MAU-AO');
          await frame.locator('[data-form=complaint] [name=fee]').fill('300000');
          await frame.locator('[data-form=complaint] [name=reason]').fill('Dữ liệu giả: 120 kg khác mẫu tại nơi đến, đề nghị kiểm định.');
          await frame.locator('[data-form=complaint] [name=evidence]').setInputFiles({name:'khac-mau-gia.png',mimeType:'image/png',buffer:Buffer.from((await readFile(new URL('../quan-tri/fixture.png.base64',import.meta.url),'utf8')).trim(),'base64')});
          await submit(frame,'complaint');
        }
        let dispute;
        await wait(async()=>{dispute=(await api(`/v1/orders/${record.orderId}/disputes`)).find(d=>d.status==='awaiting_inspection');return dispute?.inspections.length;});
        await refresh('dispute/'+dispute.id);assert.match(await frame.locator('body').innerText(),/Đang giải quyết/);
        await play.locator('#inspection-form [name=result]').selectOption('passed');
        const webhookResponse=play.waitForResponse(r=>new URL(r.url()).pathname==='/v1/sim/inspection/result');
        await play.locator('#inspection-form button').click();
        const webhook=await(await webhookResponse).json();inspectionResponses.push({profile,side,...webhook});assert.ok(webhook.http>=200&&webhook.http<300,JSON.stringify(webhook));
        await wait(async()=>{const message=await play.locator('#inspection-status').innerText();if(message.startsWith('Chưa giao'))throw new Error(message);return (await api('/v1/disputes/'+dispute.id)).status==='resolved';});
        const after=await api('/v1/disputes/'+dispute.id);assert.ok(after.inspections.some(i=>i.result==='passed'));
        await refresh('dispute/'+dispute.id);assert.match(await frame.locator('body').innerText(),/Đã giải quyết/);assert.ok(await frame.getByText('Đạt',{exact:true}).count());
        await shot(play,'ket-luan-kiem-dinh');
        await wait(async()=>(await api('/v1/orders/'+record.orderId)).status==='completed');
        await refresh('order/'+record.orderId+'/money');assert.match(await frame.locator('body').innerText(),/Tiền đã về|Đã đối soát/);
        endpoint='Khác mẫu tại nơi đến → đặt kiểm định → webhook giả → kết luận hiện trong app → quyết toán cuối, đơn completed';
      } else if(profile==='inspection') {
        assert.equal((await api('/v1/disputes/'+record.disputeId)).status,'open');await play.locator('#toggle').click();endpoint='Mở hồ sơ tranh chấp đúng người; kiểm định tới kết luận chưa chứng minh';
      } else {
        if(side==='seller') {
          if(profile==='shortfall') {await press(frame.getByRole('button',{name:'Không đúng',exact:true}));await settle(frame);const details=frame.locator('details.rule').filter({hasText:'Thiếu lượng ngoài dung sai'});await details.locator('summary').click();await choose(frame,'[name=shortfall]','end');await frame.locator('[data-form=agree] [type=checkbox]').check();await frame.locator('[data-form=agree] [name=pin]').fill('2468');await submit(frame,'agree');}
          else {await frame.locator('[data-form=dongY] [name=pin]').fill('2468');await submit(frame,'dongY');}
        }
        await wait(async()=>['in_transit','arrival_check','completed'].includes((await api('/v1/deliveries/'+record.deliveryId)).status));
        if(side==='buyer') {await refresh();await frame.locator('[data-form=arrival] [name=weighed]').fill(profile==='shortfall'?'1080':'1200');await submit(frame,'arrival');await frame.locator('[data-form=confirmArrival] [type=checkbox]').check();await submit(frame,'confirmArrival');}
        await wait(async()=>(await api('/v1/orders/'+record.orderId)).status==='completed');endpoint='Biên bản giữa quy trình → ký → nơi đến → ngân hàng xác nhận tiền';
      }
      if(profile==='harvest') {await refresh('order/'+record.orderId+'/amendments');assert.match(await frame.locator('body').innerText(),/Đã có hiệu lực/);}
      if(profile==='low') await refresh('order/'+record.orderId+'/deposit');
      if(profile==='late') {await refresh('order/'+record.orderId+'/payments');assert.match(await frame.locator('body').innerText(),/Đã nhận đủ/);}
      if(['shortfall','downgrade'].includes(profile)) {await refresh('order/'+record.orderId+'/money');assert.match(await frame.locator('body').innerText(),/Tiền đã về|Hoàn tất|Đã đối soát/);}
      await shot(play,'dat-dich');const log=await play.locator('#log').textContent();if(profile!=='inspection')assert.ok(log.length>0);results.push({profile,side,pass:true,endpoint,seed,log});console.log('ĐẠT',profile,side,endpoint);
    } catch(error) {results.push({profile,side,pass:false,error:error.stack});console.error('KHÔNG ĐẠT',profile,side,error.message);if(play)await shot(play,'LOI');else await shot(admin,'LOI');}
    finally {await context.close();}
    // Giữ ngân sách ingress nguyên vẹn; không nới rate limit.
    if(Number(process.env.AUTO_PAUSE_MS ?? 65000))for(let left=Number(process.env.AUTO_PAUSE_MS??65000);left>0;left-=30000)await new Promise(r=>setTimeout(r,Math.min(left,30000)));
  }
} finally {await browser.close();await writeFile(dir+'ket-qua.json',JSON.stringify({at:new Date().toISOString(),origin,seed,results,errors,httpErrors,inspectionResponses,shots},null,2));}
console.log(results.filter(r=>r.pass).length+'/'+results.length+' hành trình giữa quy trình'+(selected.includes('inspection')?'; hồ sơ kiểm định tại vườn chỉ chứng minh mở, chưa có kết luận.':''));
if(results.some(r=>!r.pass)||errors.length||httpErrors.length)process.exitCode=1;
