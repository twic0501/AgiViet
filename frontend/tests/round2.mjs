import { choose, signedIn, skipGuides, press, horizontalOverflow } from './ui-controls.mjs';
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")(
  "playwright",
);
const origin = process.env.FRONTEND_URL || "http://127.0.0.1:8090";
const base = process.env.API_ORIGIN || "http://127.0.0.1:8080";
const dir = new URL("../../docs/frontend/anh-luot-2/", import.meta.url)
  .pathname;
await mkdir(dir, { recursive: true });
const results = [],
  shots = [],
  errors = [],
  pageErrors = [], deniedImages = [], expectedValidation = [];
let active;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
async function make(role, width) {
  const context = await browser.newContext({
    viewport: { width, height: role === "ban" ? 844 : 900 },
    reducedMotion: "reduce",
  });
  await skipGuides(context);
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  p.setDefaultTimeout(10000);
  p.role = role;
  p.on("pageerror", (e) => {
    errors.push(e.message);
    pageErrors.push(e.message);
  });
  p.on("response", async r => { if(r.status()>=400) { const entry={url:r.url(),status:r.status()}; deniedImages.push(entry); try {entry.payload=await r.json();} catch {} } });
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return p;
}
async function settle(p, allowAlert = false) {
  await p.waitForFunction(() => {
    const app = document.getElementById('app');
    return app?.dataset.renderedRoute === location.hash && app.getAttribute('aria-busy') !== 'true';
  });
  await p.locator("[aria-busy=true]").waitFor({ state: "hidden" });
  await p.locator(".skeleton").waitFor({ state: "hidden" });
  if (!allowAlert && await p.locator("[role=alert]").count())
    throw new Error(await p.locator("[role=alert]").innerText());
}
async function go(p, path) {
  active = p;
  const url = `${origin}/${p.role}/#/${path}`;
  if (p.url() === url) await p.reload();
  else await p.goto(url);
  await p.locator("h1").waitFor();
  await settle(p);
}
async function submit(p, name) {
  await press(p.locator(`form[data-form="${name}"] button:not([type=button])`));
  await settle(p);
}
async function click(p, name) {
  await press(p.getByRole("button", { name, exact: true }));
  await settle(p);
  if(name === "Không đúng" && p.role === "ban" && await p.locator("[data-action=disagree]").count()) await press(p.locator("[data-action=disagree]"));
  await settle(p);
}
async function login(p, phone) {
  await go(p, "home");
  await p.locator('form[data-form=loginPhone] input[name=phone]').fill(phone);
  await submit(p, "loginPhone");
  await p.locator("input[name=code]").fill("123456");
  await submit(p, "loginOtp");
  await signedIn(p,p.role);
}
async function role(p, phone) {
  // App bán mới ẩn công cụ thử; đổi vai là chuẩn bị fixture bằng API, không giả thao tác UI.
  const response=await fetch(base+'/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone})});
  const session=await response.json();assert.ok(response.ok,JSON.stringify(session));
  await p.evaluate(({role,token})=>sessionStorage.setItem('agv-session-'+role,JSON.stringify({token})),{role:p.role,token:session.token});
  await go(p,'home');await p.reload();await settle(p);
}
async function shot(p, name, allowAlert = false) {
  await settle(p, allowAlert);
  assert.equal(
    await horizontalOverflow(p),
    false,
    "Tràn ngang " + name,
  );
  const txt=await p.locator('#content').innerText();
  assert.doesNotMatch(txt,/mô phỏng|idempotency|expected_revision|undefined|\bNaN\b/i);
  assert.equal(await p.locator('.test-strip:visible').count(),p.role==='ban'?0:1);
  const file = `${p.role}-${String(shots.length + 1).padStart(2, "0")}-${name}.png`;
  await p.screenshot({ path: dir + file, fullPage: p.role !== "ban" });
  shots.push({ file, name, role: p.role, width: p.viewportSize().width });
}
async function token(p) {
  return JSON.parse(
    await p.evaluate(
      (role) => sessionStorage.getItem("agv-session-" + role),
      p.role,
    ),
  ).token;
}
async function api(p, path, body) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + (await token(p)),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
async function step(name, fn, continueOnFailure = false) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("ĐẠT", name);
  } catch (e) {
    results.push({ name, pass: false, error: e.stack });
    console.error("KHÔNG ĐẠT",name,e.message);
    if(active) {
      const file=`LOI-${results.length}.png`;
      await active.screenshot({ path: dir + file, fullPage: active.role !== "ban" });
      shots.push({file,name:'Lỗi nhóm '+results.length,role:active.role,width:active.viewportSize().width});
    }
    if (!continueOnFailure) throw e;
  }
}
const cmd=(p,path,body={})=>api(p,path,{...body,idempotency_key:crypto.randomUUID()});
const picture=(await readFile(new URL('../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg',import.meta.url))).toString('base64');
let s=await make('ban',390),b=await make('mua',1280);
const orderEvidence=[];
async function adopt(p,phone) {
  const r=await fetch(base+'/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone})});
  const session=await r.json(); assert.ok(r.ok,JSON.stringify(session));
  if(!p.url().startsWith(origin)) {await p.goto(origin+'/'+p.role+'/'); await settle(p);}
  await p.goto(origin+'/'+p.role+'/#/home'); await settle(p);
  await p.evaluate(({role,token})=>sessionStorage.setItem('agv-session-'+role,JSON.stringify({token})),{role:p.role,token:session.token});
  await p.goto(origin+'/'+p.role+'/#/home'); await p.reload(); await settle(p);
}
async function fresh(mode='at_farm',timing='before_loading',qty='2000000') {
  await s.context().close();await b.context().close();
  s=await make('ban',390);b=await make('mua',1280);
  await fetch(base+'/v1/test/reset',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  await adopt(s,'0918000421'); await adopt(b,'0909000213');
  const l=(await api(b,'/v1/lots')).find(l=>l.code==='L-0412');
  const offer=await cmd(b,'/v1/offers',{direction:'buyer_bid',lot_id:l.id,qty_g:qty,price_vnd:'23000'});
  await cmd(s,`/v1/offers/${offer.id}/accept`);
  const created=await cmd(b,'/v1/orders',{offer_id:offer.id,downgrade_price_vnd:'15000',delivery_mode:mode,transport_by:mode==='at_buyer_warehouse'?'seller':'buyer',delivery_from:'2026-11-05T00:00:00Z',delivery_to:'2026-11-05T06:00:00Z',payment_timing:timing,seal_sample_required:true});
  let o=await api(b,'/v1/orders/'+created.id);
  const doc=o.tai_lieu.find(d=>d.doc_type==='contract');
  for(const p of [b,s]) {
    const ch=await api(p,'/v1/otp/challenges',{purpose:'contract_sign',document_id:doc.id});
    await cmd(p,`/v1/orders/${o.id}/sign`,{challenge_id:ch.challenge_id,code:'123456',commitment_ack:true});
  }
  const dep=await api(b,`/v1/orders/${o.id}/deposit-instruction`);
  await api(b,'/v1/sim/bank/transfers',{payment_ref:dep.payment_ref,amount_vnd:dep.total_vnd}); await api(b,'/v1/sim/bank/deliver',{});
  o=await api(b,'/v1/orders/'+o.id);assert.equal(o.status,'active');
  orderEvidence.push({test:results.length+1,order:o.id,code:o.code,mode});
  return o;
}
async function payBefore(o) {
  const p=(await api(b,`/v1/orders/${o.id}/payments`)).find(p=>p.kind==='goods_before_loading');
  const file=await cmd(b,'/v1/files',{mime:'image/jpeg',data_base64:picture,entity:'payment',entity_id:p.id,captured_in_app:false});
  await cmd(b,`/v1/payments/${p.id}/report`,{amount_vnd:p.amount_due_vnd,method:'bank_transfer',evidence_document_id:file.id});
  const ch=await api(s,'/v1/otp/challenges',{purpose:'money_received',payment_id:p.id,amount_vnd:p.amount_due_vnd});
  await cmd(s,`/v1/payments/${p.id}/confirm`,{challenge_id:ch.challenge_id,code:'123456',amount_vnd:p.amount_due_vnd,result:'full',bank_txn_ref:'R2-'+crypto.randomUUID(),method:'bank_transfer'});
}
async function prepareDelivery(o) {
  const d=o.dot_giao[0],u=await api(b,'/v1/auth/session');
  await cmd(b,`/v1/deliveries/${d.id}/receiver`,{user_id:u.user_id});
  await cmd(b,`/v1/deliveries/${d.id}/trip`,{plate_no:'66C-123.45',freight_vnd:'3200000'});
  await api(b,'/v1/test/clock',{set:d.window_from});
  const qr=await cmd(b,`/v1/deliveries/${d.id}/receipt-qr`);
  return {d,code:qr.data.ma_6_so};
}
async function fillAcceptance(p,qty,parts={}) {
  const form=p.locator('form[data-form=acceptance]');
  for(const [name,value] of Object.entries({weighed:String(qty),seal:'R2-NIEM-PHONG',accepted:String(qty),downgraded:'0',rejected:'0',pin:'2468',...parts})) {
    const input=form.locator(`[name=${name}]`);
    if(await input.evaluate(el=>el.readOnly)) continue;
    if(await input.first().evaluate(el=>el.tagName==='SELECT'||el.type==='radio')) await choose(p,'form[data-form=acceptance] [name='+name+']',value);else await input.fill(value);
  }
  await submit(p,'acceptance');
}
async function agree(p) {
  if(p.role==='ban' && await p.locator('form[data-form=dongY]').count()) {await p.locator('form[data-form=dongY] [name=pin]').fill('2468');await submit(p,'dongY');return;}
  const f=p.locator('form[data-form=agree]');await f.locator('input[type=checkbox]').check();await f.locator('[name=pin]').fill('2468');await submit(p,'agree');
}
async function each(name,fn) {if(process.env.ROUND2_ONLY && !name.includes(process.env.ROUND2_ONLY))return;await step(name,fn,true); await writeFile(dir+'dang-chay.json',JSON.stringify({results,errors,pageErrors,deniedImages},null,2));}
try {
  await each('Hủy hai bên: bên mua xin, bên bán từ chối; bên bán xin, bên mua đồng ý (UI)',async()=>{
    const o=await fresh();
    await go(b,`order/${o.id}/cancel`);let f=b.locator('form[data-form=cancel]');await f.locator('[name=reason]').fill('Nhà máy đổi lịch, xin hủy theo hệ quả đã xem.');await f.locator('[type=checkbox]').check();await submit(b,'cancel');
    let req=(await api(b,`/v1/orders/${o.id}/cancellation-requests`))[0];assert.equal(req.requested_by_side,'buyer');assert.deepEqual(req.hanh_dong,[]);
    await go(s,`order/${o.id}/cancel`);let reply=s.locator(`form[data-form="cancel-reject-${req.id}"]`);await reply.locator('[type=checkbox]').check();await submit(s,'cancel-reject-'+req.id);
    assert.equal((await api(s,`/v1/orders/${o.id}/cancellation-requests`))[0].status,'rejected');
    await go(s,`order/${o.id}/cancel`);f=s.locator('form[data-form=cancel]');await f.locator('[name=reason]').fill('Người bán xin hủy và chấp nhận hệ quả.');await f.locator('[type=checkbox]').check();await submit(s,'cancel');
    req=(await api(s,`/v1/orders/${o.id}/cancellation-requests`))[0];assert.equal(req.requested_by_side,'seller');
    await go(b,`order/${o.id}/cancel`);await shot(b,'ben-kia-tra-loi-huy');reply=b.locator(`form[data-form="cancel-accept-${req.id}"]`);await reply.locator('[type=checkbox]').check();await submit(b,'cancel-accept-'+req.id);
    assert.ok(['processing_money','completed'].includes((await api(b,`/v1/orders/${o.id}/cancellation-requests`))[0].status));
    assert.equal((await api(b,'/v1/orders/'+o.id)).co.dang_xin_huy,false);await shot(b,'da-dong-y-huy');
    await api(b,'/v1/sim/bank/process-instructions',{});await api(b,'/v1/sim/bank/deliver',{});const staff=await api(b,'/v1/test/impersonate',{phone:'0901000005'});const r=await fetch(base+'/v1/ops/reconcile',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+staff.token},body:JSON.stringify({idempotency_key:crypto.randomUUID()})});assert.ok(r.ok,await r.text());assert.equal((await api(b,'/v1/orders/'+o.id)).status,'closed');
  });
  await each('Tranh chấp: phản đối, tải lại danh sách, cân lại, ký kết quả mới và đóng hồ sơ (UI)',async()=>{
    const o=await fresh();await payBefore(o);const {d,code}=await prepareDelivery(o);
    await cmd(s,`/v1/deliveries/${d.id}/start-check`,{ma_6_so:code,plate_no:'66C-123.45'});
    await go(b,`order/${o.id}/delivery`);
    const reason=(await api(b,'/v1/products/XOAI_CAT_CHU/profile')).reject_reasons[0].reason_code;
    await fillAcceptance(b,2000,{accepted:'1900',downgraded:'100',downgradedReason:reason});
    const originalFixed=(await api(b,`/v1/deliveries/${d.id}`)).ket_qua.at(-1).lines.find(l=>l.kind==='downgraded');
    await go(s,`order/${o.id}/delivery`);await click(s,'Không đúng');await choose(s,'[name=line]','1');await s.locator('[name=reason]').fill('Đề nghị cân lại số lượng thực tế.');await choose(s,'[name=option]','chia_lai');
    assert.deepEqual(await s.locator('form[data-form=disagree]').evaluate(f=>[...f.elements].filter(x=>x.willValidate&&!x.validity.valid).map(x=>({name:x.name,type:x.type,value:x.value,message:x.validationMessage}))),[]);
    if(process.env.ROUND2_ONLY) {s.on('request',r=>console.log('REQ',r.method(),new URL(r.url()).pathname));s.on('console',m=>console.log('BROWSER',m.text()));await s.evaluate(()=>{document.addEventListener('click',ev=>console.log('CLICK',ev.target.tagName,ev.target.closest('button')?.outerHTML,ev.target.closest('button')?.form?.dataset.form),true);document.addEventListener('submit',ev=>console.log('SUBMIT',ev.target.dataset.form,JSON.stringify([...new FormData(ev.target)])),true)});}
    await submit(s,'disagree');
    if(process.env.ROUND2_ONLY) console.log('AFTER',await s.locator('form[data-form=disagree]').evaluate(f=>({html:f.outerHTML,valid:f.checkValidity()})));
    await s.waitForURL('**/#/dispute/**');
    await go(s,`order/${o.id}/delivery`);assert.equal(await s.locator('form[data-form=agree]').count(),0);
    await go(b,`order/${o.id}/disputes`);const pending=await api(b,`/v1/orders/${o.id}/disputes`);orderEvidence.push({test:'can-lai',order:o.id,disputes:pending});assert.equal(await b.getByRole('link',{name:'Cân lại / chia lại',exact:true}).count(),1,JSON.stringify(pending));await shot(b,'danh-sach-tranh-chap');
    await b.getByRole('link',{name:'Cân lại / chia lại',exact:true}).click();await settle(b);
    assert.equal(await b.locator('form[data-form=acceptance]').count(),0);
    const evidenceForm=b.locator('form[data-form=reweighEvidence]');
    await evidenceForm.locator('[name=evidence]').setInputFiles({name:'phieu-can-lai.jpg',mimeType:'image/jpeg',buffer:Buffer.from(picture,'base64')});
    const uploaded=b.waitForResponse(r=>r.url().endsWith('/v1/files')&&r.request().method()==='POST');
    await submit(b,'reweighEvidence');const uploadResponse=await uploaded;assert.equal(uploadResponse.status(),200);
    const uploadRequest=uploadResponse.request().postDataJSON();assert.equal(uploadRequest.entity,'order');assert.equal(uploadRequest.entity_id,o.id);
    const file=await uploadResponse.json();
    await shot(b,'can-lai-da-tai-chung-cu');
    const submitted=b.waitForResponse(r=>r.url().endsWith(`/v1/deliveries/${d.id}/acceptance`)&&r.request().method()==='POST');
    await fillAcceptance(b,2000,{accepted:'1850',downgraded:'150',downgradedReason:reason});const revised=await submitted;assert.equal(revised.status(),200);assert.equal((await revised.json()).data.chia_lai,true);
    assert.equal(revised.request().postDataJSON().evidence_document_id,file.id);
    const newResult=(await api(b,`/v1/deliveries/${d.id}`)).ket_qua.at(-1);
    assert.equal(newResult.weighed_g,'2000000');
    const fixed=newResult.lines.find(l=>l.kind==='downgraded'&&l.qty_g===originalFixed.qty_g);
    assert.ok(fixed,'Dòng hạ cấp không tranh chấp được giữ nguyên');
    assert.equal(fixed.reason_code,originalFixed.reason_code);assert.equal(fixed.value_vnd,originalFixed.value_vnd);
    assert.equal(newResult.lines.filter(l=>l.kind==='accepted').reduce((n,l)=>n+BigInt(l.qty_g),0n),1850000n);
    orderEvidence.push({test:'giu-dong-khong-tranh-chap',order:o.id,originalFixed,newResult});
    assert.equal((await api(b,`/v1/orders/${o.id}/disputes`))[0].status,'awaiting_seller');
    await b.reload();await settle(b);assert.equal(await b.locator('form[data-form=reweighEvidence]').count(),0);
    await go(s,`order/${o.id}/delivery`);await agree(s);
    const records=await api(s,`/v1/orders/${o.id}/disputes`);assert.equal(records.length,1);assert.equal(records[0].status,'resolved');
    await go(s,`order/${o.id}/disputes`);await shot(s,'tranh-chap-da-giai-quyet');
  });
  await each('Phụ lục: đề nghị đổi ngày, đồng ý, PDF và OTP hai bên có hiệu lực (UI)',async()=>{
    const o=await fresh();await go(s,`order/${o.id}/amendments`);
    await choose(s,'[name=kind]','change_date');await s.locator('[name=from]').fill('2026-11-06T07:00');await s.locator('[name=to]').fill('2026-11-06T13:00');await s.locator('[name=reason]').fill('Hai bên đổi ngày giao theo lịch thu hoạch.');await submit(s,'amendment');
    let a=(await api(s,`/v1/orders/${o.id}/amendments`))[0];await go(b,`order/${o.id}/amendments`);await click(b,'Đồng ý lập phụ lục');
    a=(await api(b,`/v1/orders/${o.id}/amendments`))[0];assert.ok(a.annex_document_id);
    await click(b,'Xem PDF phụ lục');await b.locator('iframe').waitFor();await shot(b,'phu-luc-pdf');
    for(const p of [b,s]) {
      await go(p,`order/${o.id}/amendments`);await p.locator(`form[data-form="amendPrepare-${a.id}"] [type=checkbox]`).check();await submit(p,'amendPrepare-'+a.id);await p.locator('[name=code]').fill('123456');await submit(p,'amendSign-'+a.id);
    }
    const now=await api(b,'/v1/orders/'+o.id);assert.equal(now.effective_version_no,2);assert.equal(now.dot_giao[0].window_from,'2026-11-06T00:00:00.000Z');
    const doc=await api(b,'/v1/documents/'+a.annex_document_id);assert.equal(doc.signatures.length,2);
    await go(s,`order/${o.id}/amendments`);await shot(s,'phu-luc-hieu-luc');
  });
  await each('Giao tại kho thiếu lượng: chuẩn bị xe/xuất bằng API; nhận kho, cân và chọn giao bù qua UI',async()=>{
    const o=await fresh('at_buyer_warehouse','on_receipt'),d=o.dot_giao[0];
    await go(b,`order/${o.id}/delivery`);await choose(b,'form[data-form=receiver] [name=receiver]',(await api(b,'/v1/auth/session')).user_id);await submit(b,'receiver');
    // App bán mới chưa có form xe/xuất kho; chuẩn bị fixture bằng API thật, không nhận là UI.
    await cmd(s,`/v1/deliveries/${d.id}/trip`,{plate_no:'66C-123.45',freight_vnd:'3200000'});
    await api(b,'/v1/test/clock',{set:d.window_from});await go(b,`order/${o.id}/delivery`);await click(b,'Mở QR nhận hàng');const code=await b.locator('[data-receipt-code]').innerText();
    await cmd(s,`/v1/deliveries/${d.id}/ship`,{loaded_g:'1800000',ma_6_so:code,plate_no:'66C-123.45',seal_code:'KHO-R2'});
    assert.equal((await api(s,'/v1/deliveries/'+d.id)).status,'in_transit');
    await go(b,`order/${o.id}/delivery`);await b.locator('form[data-form=receive] [name=plate]').fill('66C-123.45');await submit(b,'receive');await fillAcceptance(b,1800);
    await go(s,`order/${o.id}/delivery`);await click(s,'Không đúng');await s.getByText('Thiếu lượng ngoài dung sai: chọn cách xử lý',{exact:true}).click();await choose(s,'[name=shortfall]','backfill');await s.locator('[name=backFrom]').fill('2026-11-06T07:00');await s.locator('[name=backTo]').fill('2026-11-06T13:00');await shot(s,'thieu-luong-chon-giao-bu');await agree(s);
    const now=await api(s,'/v1/orders/'+o.id);assert.equal(now.dot_giao.length,2);assert.equal(now.dot_giao[1].planned_qty_g,'200000');
    await choose(s,'form[data-form=chooseDelivery] [name=delivery]',now.dot_giao[1].id);await submit(s,'chooseDelivery');assert.ok((await s.locator('#content').innerText()).includes('200 kg'));await shot(s,'dot-giao-bu');
  });
  await each('Mời thành viên, nhận OTP đúng số, đổi vai và phân biệt vai chờ hiệu lực (UI)',async()=>{
    await fresh();await go(b,'organization');const f=b.locator('form[data-form=invite]');await f.locator('[name=name]').fill('Nhân viên kho mới');await f.locator('[name=phone]').fill('0909123999');await f.locator('[name=roles][value=warehouse]').check();await submit(b,'invite');
    const href=await b.locator('[data-invitation-link]').getAttribute('href');assert.ok(href);await shot(b,'moi-thanh-vien');
    const guest=await make('mua',390);await guest.goto(href);await settle(guest);await guest.locator('input[name=phone]').fill('0909123999');await submit(guest,'enrollPhone');await guest.locator('[name=code]').fill('123456');await submit(guest,'enroll');
    const me=await api(guest,'/v1/auth/session');assert.ok(me.roles.includes('warehouse'));await shot(guest,'thanh-vien-da-nhan-loi');
    await go(b,'organization');const members=await api(b,'/v1/org/members'),m=members.find(m=>m.user_id===me.user_id);assert.equal(m.status,'active');
    const form=b.locator(`form[data-form="roles-${m.membership_id}"]`);await form.locator('..').locator('summary').click();await form.locator('[value=accountant]').check();await form.locator('[name=limit]').fill('25000000');await submit(b,'roles-'+m.membership_id);
    const changed=(await api(b,'/v1/org/members')).find(x=>x.user_id===me.user_id);assert.ok(changed.role_grants.some(r=>r.role==='accountant'));assert.ok(!changed.roles_effective.includes('accountant'));assert.equal(changed.approval_limit_vnd,'25000000');await shot(b,'vai-moi-dang-cho');await guest.context().close();
  });
  await each('VietQR trả thẳng và sổ tiền theo kỳ đọc số xác nhận từ API',async()=>{
    const o=await fresh();await go(b,`order/${o.id}/payments`);await b.locator('.transfer-instruction canvas').waitFor();const p=(await api(b,`/v1/orders/${o.id}/payments`))[0];const i=await api(b,`/v1/payments/${p.id}/instruction`);assert.ok((await b.locator('.transfer-instruction').innerText()).includes(i.tai_khoan.so_tai_khoan));await shot(b,'vietqr-tra-thang');
    await payBefore(o);await go(s,'ledger');
    const summary=await api(s,'/v1/money/summary');assert.equal(summary.tong.da_nhan_truc_tiep,'32200000');
    assert.ok((await s.locator('#content').innerText()).includes('32.200.000'));await shot(s,'so-tien-app-ban-moi');
    await go(b,'ledger');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());await b.locator('[name=from]').fill(today);await b.locator('[name=to]').fill(today);await submit(b,'period');
    const params=new URLSearchParams({from:today+'T00:00:00+07:00',to:today+'T23:59:59+07:00'});const period=await api(b,'/v1/money/summary?'+params);assert.equal(period.tong.da_tra_truc_tiep_duoc_xac_nhan,'32200000');await shot(b,'so-tien-theo-ky');
  });
  await each('Đổi gói, tạo/theo dõi hỗ trợ và đọc thông báo sau worker (UI + API)',async()=>{
    await fresh();await go(b,'plans');const plans=await api(b,'/v1/plans'),sub=await api(b,'/v1/org/subscription');const next=plans.find(g=>g.code!==sub.plan_code&&g.max_members>=4);const form=b.locator(`form[data-form=subscription]`).filter({has:b.locator(`input[value="${next.code}"]`)});await form.locator('[type=checkbox]').check();const changed=b.waitForResponse(r=>r.url().endsWith('/v1/org/subscription')&&r.request().method()==='POST');await press(form.locator('button'));const changeResponse=await changed;const changeReceipt=await changeResponse.json();let planError;try {await settle(b);const current=await api(b,'/v1/org/subscription');orderEvidence.push({test:'doi-goi',before:sub,requested:next.code,status:changeResponse.status(),receipt:changeReceipt,after:current});assert.equal(changeResponse.status(),200);assert.equal(current.plan_code,next.code);await shot(b,'goi-da-doi');}catch(e){planError=e;await shot(b,'doi-goi-chua-san-sang',true);}
    await go(b,'support');await b.locator('[name=message]').fill('Cần hướng dẫn đối chiếu cọc và công nợ.');await submit(b,'supportTicket');assert.equal((await api(b,'/v1/support')).length,1);assert.ok((await b.locator('#content').innerText()).includes('Chưa có người nhận việc'));await shot(b,'ho-tro-chua-nguoi-nhan');
    await api(b,'/v1/test/outbox/run',{});await go(b,'notifications');assert.ok((await api(b,'/v1/notifications')).length>0);assert.ok(await b.locator('#content .card').count());await shot(b,'thong-bao');if(planError)throw planError;
  });
  await each('Tài khoản nhận tiền: OTP yêu cầu đổi, chờ 24 giờ, Không phải tôi khóa thật (UI)',async()=>{
    await fresh();await go(s,'payout');assert.equal(await s.locator('[name=bank]').inputValue(),'Ngân hàng ảo AgiViet');for(const [n,v] of Object.entries({account:'012345678999',holder:'Nguyễn Thị Năm',phone:'0918000421'})) await s.locator(`form[data-form=payoutPrepare] [name=${n}]`).fill(v);await submit(s,'payoutPrepare');await s.locator('[name=code]').fill('123456');await submit(s,'payoutConfirm');let a=(await api(s,'/v1/payout-accounts')).find(x=>x.account_masked==='****8999');assert.equal(a.status,'cooling_down');assert.equal(a.bank_code,'AGV_VIRTUAL');await shot(s,'doi-tai-khoan-dang-cho');const f=s.locator(`form[data-form="lock-${a.id}"]`);await f.locator('..').locator('summary').click();await f.locator('[type=checkbox]').check();await submit(s,'lock-'+a.id);a=(await api(s,'/v1/payout-accounts')).find(x=>x.id===a.id);assert.equal(a.status,'locked');await shot(s,'khong-phai-toi-da-khoa');
  });
  await each('Hồ sơ nguồn, so lời chào theo nhu cầu, ảnh thẻ và đăng ký chờ cấp quyền',async()=>{
    await fresh();await go(b,'lots');const imgs=await b.locator('article .lot-photo img').all();assert.ok(imgs.length>=1);for(const img of imgs) assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>0));assert.ok(await b.getByText('Ảnh minh họa · không phải ảnh lô',{exact:true}).count());await shot(b,'nguon-hang-co-anh');
    const sources=await api(b,'/v1/lots'),lot=sources.find(l=>l.code==='L-0414');await go(b,'lots/'+lot.id);const profile=await api(b,`/v1/lots/${lot.id}/source-profile`);assert.ok((await b.locator('#content').innerText()).includes(profile.nguoi_ban.ten));await shot(b,'ho-so-nguon');
    const demand=await cmd(b,'/v1/demands',{product_code:'XOAI_CAT_CHU',segment_code:'processor',needed_from:'2026-11-05',needed_to:'2026-11-06',delivery_mode:'self_pickup',lines:[{grade_code:'L1',qty_g:'500000',max_price_vnd:'35000',min_source_qty_g:'100000'}]});await cmd(b,`/v1/demands/${demand.id}/publish`);const demandLine=(await api(b,'/v1/demands/'+demand.id)).lines[0];const quote=await cmd(b,'/v1/offers',{direction:'buyer_bid',lot_id:lot.id,demand_line_id:demandLine.id,qty_g:'500000',price_vnd:'30000'});await cmd(s,`/v1/offers/${quote.id}/accept`);await go(b,'offers');const comparison=await api(b,`/v1/demands/${demand.id}/offer-comparison`);assert.equal(comparison.length,1);assert.equal(comparison[0].gia_tai_kho_vnd,null);assert.ok((await b.locator('#content').innerText()).includes(comparison[0].ghi_chu));await shot(b,'so-chao-theo-nhu-cau');
    const guest=await make('mua',1280);await go(guest,'register');await guest.locator('input[name=phone]').fill('0918123999');await submit(guest,'enrollPhone');for(const [n,v] of Object.entries({name:'Người đăng ký mới',org:'Doanh nghiệp đăng ký mới',tax:'1401234567',code:'123456'}))await guest.locator(`[name=${n}]`).fill(v);const registered=guest.waitForResponse(r=>r.url().endsWith('/v1/auth/register')&&r.request().method()==='POST');await submit(guest,'enroll');const registration=await registered;assert.equal(registration.status(),200);const receipt=await registration.json();assert.ok(receipt.user_id&&receipt.org_id);assert.equal(receipt.org_status,'pending');assert.ok((await guest.locator('#content').innerText()).includes('chờ xác minh'));await shot(guest,'dang-ky-bien-nhan-chua-co-phien');
    await guest.reload();await settle(guest);assert.ok((await guest.locator('#content').innerText()).includes('chờ xác minh'));assert.ok(await guest.getByRole('link',{name:'Đăng nhập để theo dõi',exact:true}).isVisible());assert.equal(await guest.evaluate(()=>sessionStorage.getItem('agv-session-mua')),null);await shot(guest,'dang-ky-cho-xac-minh');await guest.context().close();
  });
  await each('422 nhu cầu thật: đúng ô, giữ nội dung, sửa rồi tạo thành công (UI)',async()=>{
    await fresh(); await go(b,'demand-new');
    await choose(b,'[name=segment]','processor');await choose(b,'[name=mode]','self_pickup');
    const form=b.locator('form[data-form=demand]');
    const valid={from:'2026-11-05',to:'2026-11-06',qty:'2000',min:'500',max:'26000'};
    for(const [n,v] of Object.entries(valid)) await form.locator(`[name=${n}]`).fill(v);
    await form.evaluate(el=>el.noValidate=true);
    const cases=[['min','2500'],['min','0'],['qty','0'],['max','0'],['to','2026-11-04'],['grade','']];
    for(let n=0;n<cases.length;n++) {
      const [name,value]=cases[n],input=form.locator(`[name=${name}]`);
      if(name==='grade') await input.evaluateAll(els=>{for(const el of els)el.checked=false;els[0].checked=true;els[0].value='';});
      else await input.fill(value);
      const response=b.waitForResponse(r=>r.url().endsWith('/v1/demands')&&r.request().method()==='POST');
      await form.locator('button:not([type=button])').click();
      const r=await response, payload=await r.json();assert.equal(r.status(),422);assert.equal(payload.errors[0].code,'DU_LIEU_KHONG_HOP_LE');
      expectedValidation.push({url:r.url(),status:r.status(),payload});
      await b.locator(`[name=${name}][aria-invalid=true]`).waitFor({state:'attached'});
      assert.equal(await b.locator('[aria-invalid=true]').count(),1);
      const hint=b.locator('#'+await input.first().getAttribute('aria-describedby'));
      assert.ok(await hint.isVisible());assert.doesNotMatch(await b.locator('#content').innerText(),/min_source_qty_g|qty_g|max_price_vnd|grade_code/);
      assert.ok((await b.locator('[data-form-error]').innerText()).includes(payload.request_id));
      assert.equal(await form.locator('[name=from]').inputValue(),valid.from);
      await shot(b,'422-dung-o-'+name+'-'+n,true);
      if(name==='grade') {await input.first().evaluate(el=>el.value='L1');await choose(b,'[name=grade]','L1');} else await input.fill(valid[name]);
    }
    await submit(b,'demand'); await b.getByRole('heading',{name:/^NC-/}).waitFor();
    const id=await b.evaluate(()=>location.hash.split('/')[2]);assert.equal((await api(b,'/v1/demands/'+id)).status,'open');
    await shot(b,'nhu-cau-sua-loi-da-dang');
  });
  for(const qty of ['2000000','50000']) await each(`Phụ lục giảm giá ${Number(qty)/1000} kg: hoàn cọc chênh ngay, xem lại lệnh sau reload (UI + API)`,async()=>{
    const o=await fresh('at_farm','before_loading',qty);await go(s,`order/${o.id}/amendments`);
    await choose(s,'[name=kind]','change_price');await s.locator('[name=price]').fill('20000');await s.locator('[name=reason]').fill('Hai bên đồng ý giảm giá và hoàn phần cọc chênh.');await submit(s,'amendment');
    let a=(await api(s,`/v1/orders/${o.id}/amendments`))[0];await go(b,`order/${o.id}/amendments`);await click(b,'Đồng ý lập phụ lục');
    a=(await api(b,`/v1/orders/${o.id}/amendments`))[0];
    let effect;
    for(const p of [b,s]) {
      await go(p,`order/${o.id}/amendments`);await p.locator(`form[data-form="amendPrepare-${a.id}"] [type=checkbox]`).check();await submit(p,'amendPrepare-'+a.id);await p.locator('[name=code]').fill('123456');
      const response=p.waitForResponse(r=>r.url().endsWith(`/v1/amendments/${a.id}/sign`));await submit(p,'amendSign-'+a.id);const r=await response;assert.equal(r.status(),200);effect=(await r.json()).data.he_qua;
    }
    assert.ok(BigInt(effect.hoan_coc_vnd)>0);assert.ok(effect.lenh_hoan);assert.equal(effect.hoan_phi_vnd,'0');assert.equal((await api(b,`/v1/orders/${o.id}/money`)).phi.so_tien_vnd,o.dieu_khoan.fee_vnd);assert.ok((await s.locator('#content').innerText()).includes('Phí giữ nguyên theo hợp đồng'));
    assert.ok((await s.locator('#content').innerText()).includes('Cọc chênh được hoàn về nguồn'));
    await shot(s,'phu-luc-hoan-chenh-vua-ky-'+qty);
    const m=await api(b,`/v1/orders/${o.id}/money`),refunds=m.lenh_ngan_hang.filter(i=>i.kind.includes('refund'));
    assert.equal(refunds.filter(i=>i.kind==='refund_deposit_to_buyer').reduce((sum,i)=>sum+BigInt(i.amount_vnd),0n).toString(),effect.hoan_coc_vnd);
    assert.equal(refunds.filter(i=>i.kind==='refund_fee').reduce((sum,i)=>sum+BigInt(i.amount_vnd),0n).toString(),effect.hoan_phi_vnd);
    assert.deepEqual(new Set(effect.lenh_hoan.split(',')),new Set(refunds.map(i=>i.code)));
    for(const p of [b,s]) {
      await go(p,`order/${o.id}/amendments`); await p.reload();await settle(p);
      const section=p.locator('[data-annex-refunds]');assert.ok(await section.isVisible());
      for(const i of refunds) assert.ok((await section.innerText()).includes(i.code));
      assert.equal(await section.getByText('Tiền đã về',{exact:true}).count(),0);
      await shot(p,'phu-luc-lenh-hoan-sau-reload-'+qty);
    }
    await api(b,'/v1/sim/bank/process-instructions',{});await api(b,'/v1/sim/bank/deliver',{});
    await go(b,`order/${o.id}/amendments`);assert.ok(await b.locator('[data-annex-refunds]').getByText('Tiền đã về',{exact:true}).count());
    const now=await api(b,`/v1/orders/${o.id}/money`);assert.equal(now.lenh_ngan_hang.length,refunds.length);await shot(b,'phu-luc-ngan-hang-da-hoan');
    orderEvidence.push({test:'hoan-chenh',order:o.id,effect,refunds:now.lenh_ngan_hang});
  });
  await each('Phụ lục tăng giá: hiện mã TP nguyên văn và sao chép cọc bổ sung (UI + API)',async()=>{
    const o=await fresh();await go(s,`order/${o.id}/amendments`);
    await choose(s,'[name=kind]','change_price');await s.locator('[name=price]').fill('25000');await s.locator('[name=reason]').fill('Hai bên thống nhất tăng giá theo chất lượng.');await submit(s,'amendment');
    let a=(await api(s,`/v1/orders/${o.id}/amendments`))[0];await go(b,`order/${o.id}/amendments`);await click(b,'Đồng ý lập phụ lục');a=(await api(b,`/v1/orders/${o.id}/amendments`))[0];
    let effect;
    for(const p of [s,b]) {
      await go(p,`order/${o.id}/amendments`);await p.locator(`form[data-form="amendPrepare-${a.id}"] [type=checkbox]`).check();await submit(p,'amendPrepare-'+a.id);await p.locator('[name=code]').fill('123456');
      const response=p.waitForResponse(r=>r.url().endsWith(`/v1/amendments/${a.id}/sign`));await submit(p,'amendSign-'+a.id);const r=await response;assert.equal(r.status(),200);effect=(await r.json()).data.he_qua;
    }
    assert.match(effect.bo_sung_coc_ref,/^TP[0-9]{12}$/);assert.ok(BigInt(effect.chenh_coc_vnd)>0);assert.equal(effect.chenh_phi_vnd,'0');assert.ok((await b.locator('#content').innerText()).includes('Phí giữ nguyên theo hợp đồng'));assert.equal((await api(b,`/v1/orders/${o.id}/money`)).phi.so_tien_vnd,o.dieu_khoan.fee_vnd);
    const input=b.getByRole('textbox',{name:'Nội dung chuyển cọc bổ sung',exact:true});assert.equal(await input.inputValue(),effect.bo_sung_coc_ref);
    await b.context().grantPermissions(['clipboard-read','clipboard-write']);await click(b,'Sao chép mã chuyển tiền');
    assert.equal(await b.evaluate(()=>navigator.clipboard.readText()),effect.bo_sung_coc_ref);await shot(b,'coc-bo-sung-ma-TP');orderEvidence.push({test:'coc-bo-sung',order:o.id,effect});await b.reload();await settle(b);assert.equal(await b.locator('[data-topup]').count(),0);assert.ok((await b.locator('#content').innerText()).includes('Chưa có mã chuyển cọc bổ sung trong lượt xem này.'));await shot(b,'coc-bo-sung-chua-co-ma-sau-reload');
  });
  await each('Không lỗi JavaScript, console hoặc HTTP trong bộ mới',async()=>{
    assert.deepEqual(pageErrors,[]);assert.deepEqual(deniedImages.filter(r=>!expectedValidation.some(x=>x.url===r.url&&x.status===r.status)),[]);assert.equal(errors.filter(e=>!/422 \(Unprocessable (?:Entity|Content)\)/.test(e)).length,0,JSON.stringify(errors));
  });
} finally {
  await writeFile(dir+'ket-qua.json',JSON.stringify({date:new Date().toISOString(),setup:'Mỗi nhóm reset; chuẩn bị hợp đồng/ký/cọc và một số tiền/giao nhận bằng API thật; các hành động được nêu UI thao tác qua app.',results,shots,errors,pageErrors,deniedImages,expectedValidation,orderEvidence},null,2));await rm(dir+'dang-chay.json',{force:true});await browser.close();if(results.some(r=>!r.pass)) process.exitCode=1;console.log(`${results.filter(r=>r.pass).length}/${results.length} nhóm lượt 2; ${shots.length} ảnh.`);
}
