import { profiles, profileById } from './profiles.js';
import { demoCrops, demoProvenance } from './demo-data.js';
import { heading, button, line, field, select, badge, empty, notice, amount, label } from '../shared/ui.js';
import { escapeHtml as e, date, quantity } from '../shared/format.js';
import { templates, readCases, saveCase, caseKey, createCase, actor, testAccess, verifyCase } from './case-engine.js';
const title = record => profileById(record.profile)?.name || templates.find(([id])=>id===record.template)?.[1] || record.template;
const options = list => list.map(a=>[a.phone+'|'+a.org_code,`${a.display_name} · ${a.org_name} · ${a.phone}`]);
const pick = (list,value) => list.find(a=>a.phone+'|'+a.org_code===value);
async function capability(c) {
  try { await testAccess(c.api); return true; }
  catch(err) { c.state.testUnavailable=err.message; return false; }
}
export async function cases(c) {
  if(!await capability(c)) return heading('Tạo tình huống thử') + empty('Công cụ thử · chưa có',c.state.testUnavailable);
  const [accounts, products] = await Promise.all([c.api.get('/v1/test/accounts'), c.api.get('/v1/products')]);
  const sellers=accounts.filter(a=>a.can_sell && (a.roles||'').split(',').some(r=>['owner','coop_board'].includes(r)));
  const buyers=accounts.filter(a=>a.can_buy && (a.roles||'').split(',').includes('owner'));
  // Ghép mặt hàng và phẩm cấp thành một lựa chọn để không gửi phẩm cấp của mặt hàng khác.
  const productOptions=products.flatMap(p=>p.grades.filter(g=>!g.is_substandard).map(g=>[p.code+'|'+g.grade_code,p.name_vi+' · '+g.label]));
  c.change.profile = form => { const profile=profileById(form.elements.profile.value); if(profile?.price) form.elements.price.value=profile.price; };
  c.forms.createCase = async f => {
    const [product,grade]=f.get('product').split('|');
    const profile=profileById(f.get('profile'));
    const input={profile:profile?.id,seed:f.get('seed')||'agiviet-27',template:profile?.template || f.get('template'),seller:pick(sellers,f.get('seller')),buyer:pick(buyers,f.get('buyer')),product,grade,qty:f.get('qty'),price:f.get('price'),plate:f.get('plate')};
    if(!input.seller || !input.buyer) throw new Error('Chọn tài khoản ảo có quyền chủ / ban điều hành phù hợp.');
    const progress=document.querySelector('[data-case-progress]');
    try {
      const record=await createCase(c.api,input,r=>{ if(progress) {progress.textContent=`Đang tạo: ${r.step || 'Chuẩn bị'} · ${r.steps.length} bước đã xong. Giữ trang mở.`;progress.focus();} });
      c.flash('Đã tạo và kiểm trạng thái: '+title(record));
    } catch(err) {
      c.flash('Tạo dở: '+err.message+'. Xem hồ sơ và bước dừng bên dưới; chưa đạt mẫu yêu cầu.');
    }
  };
  c.forms.resetFirst = () => { c.state.resetStage=2; };
  c.forms.cleanupFirst = () => { c.state.resetStage=2; };
  c.on.cancelReset=()=>{delete c.state.resetStage;};
  c.forms.resetFinal = async f => {
    if(c.state.resetStage!==2 || f.get('phrase')!=='XOA DU LIEU THU') throw new Error('Nhập đúng XOA DU LIEU THU để xác nhận lần hai.');
    try {
      await c.api.post('/v1/test/reset',{});
      localStorage.removeItem(caseKey);
      // Reset vô hiệu hóa mọi phiên; không giữ phiên admin cũ hoặc các thao tác chưa rõ kết quả.
      sessionStorage.clear(); location.reload();
    } catch(err) { c.state.resetError='Chưa đặt lại dữ liệu. API reset chưa dùng được ở stack này: '+err.message; }
  };
  const records=readCases();
  for(const r of records) c.on['verifyCase:'+r.id]=async()=>{
    const buyer=await actor(c.api,r.buyer);
    try { await verifyCase(r,buyer.api); r.lastChecked=new Date().toISOString();r.phase='ready';delete r.error;saveCase(r);c.flash('Đã đọc lại, trạng thái khớp mẫu.'); }
    catch(err) {r.error=err.message;r.phase='changed';saveCase(r);c.flash('Trạng thái đã thay đổi hoặc chưa đọc được: '+err.message);}
    finally {await buyer.api.post('/v1/auth/logout').catch(()=>{});}
  };
  return heading('Tạo tình huống thử','Chỉ trên máy · dữ liệu và tiền đều ảo',button('Làm mới','reload',true)) +
    notice(demoProvenance) +
    notice('Tự chạy API bằng hai tài khoản đã chọn, OTP 123456 và PIN 2468. Tạo lô riêng với ảnh giả có nhãn dữ liệu thử; không phải chứng cứ thật. Với PostgreSQL chưa bật chế độ reset/đồng hồ DB, công cụ đồng bộ giờ thử về giờ máy nếu lệch trên một phút. Chế độ có mẫu DB sạch giữ đồng hồ nghiệp vụ của backend để khớp dữ liệu vụ mẫu. Việc đổi giờ ảnh hưởng toàn môi trường thử. Các mẫu giao hàng dùng giờ hiện tại. Chọn xe seed khác nếu đang có case giao cùng giờ; chưa có API xem lịch xe hoặc thêm xe thử. Webhook và đối soát dùng chung môi trường thử, có thể ảnh hưởng case khác.') +
    `<section class="card"><h2>Tạo một case</h2><form data-form="createCase"><div class="form-grid">${select('Hồ sơ mẫu đã ở giữa tình huống','profile',[['','Dùng mẫu trạng thái bên dưới'],...profiles.filter(p=>!p.unavailable).map(p=>[p.id,p.name])],'')}${field('Seed phản hồi đối ứng','seed','text','agiviet-27','maxlength=100 required')}${select('Mẫu tình huống','template',templates,'offer','required')}${select('Bên bán · tài khoản ảo','seller',options(sellers),'0918000421|TC-B01','required')}${select('Bên mua · tài khoản ảo','buyer',options(buyers),'0909000213|TC-M01','required')}${select('Mặt hàng và phẩm cấp','product',productOptions,'XOAI_CAT_CHU|L1','required')}${select('Xe trong seed thử (mẫu giao / tranh chấp / quyết toán)','plate',[['66C-123.45','Xe thử 66C-123.45'],['66C-678.90','Xe thử 66C-678.90'],...Array.from({length:4},(_,i)=>['DEMO-66C-00'+(i+1),'Xe ảo bổ sung '+(i+1)+' · cần seed mới'])],'66C-123.45')}${field('Khối lượng (kg)','qty','number','1200','min="0.001" step="0.001" required')}${field('Đơn giá (đ/kg)','price','number','23000','min="1" step="1" required')}</div><p class="caption">Gợi ý thử: ${Object.entries(demoCrops).map(([code,d])=>e(d.season+' · '+d.qty+' kg · '+d.price+' đ/kg')).join('; ')}. Có thể nhập lượng và giá khác.</p><button>Tạo tình huống</button><p class="caption" data-case-progress role="status" tabindex="-1"></p></form></section>` +
    `<section class="card"><h2>Nguồn tình huống từ dong-co mẫu 1</h2>${profiles.map(p=>`<p><strong>${e(p.name)}</strong> · ${e(p.refs.join(' / '))} · ${p.unavailable?'chưa có':p.id==='arrival'?'2/2 phía đã kiểm UI tới kết luận kiểm định giả (seed thu-0)':p.id==='inspection'?'mở hồ sơ 2/2 phía · luồng tới kết luận kiểm định chưa chứng minh':'2/2 hành trình giữa quy trình đã kiểm UI trên stack thử riêng (seed thu-0)'}<br>${e(p.story)}</p>`).join('')}</section><div class="section-title"><h2>Case đã tạo trên trình duyệt này</h2><span>${records.length} case</span></div>` +
    notice('Danh sách lưu trên trình duyệt này, không phải danh sách toàn sàn. Mở nhanh sẽ đóng vai đúng người trong tab mới, giữ nguyên phiên quản trị. Sau khi thao tác trong app, bấm Kiểm tra trạng thái để đọc lại; không coi nhãn lưu trước đó là trạng thái mới nhất.') +
    `<div class="grid two">${records.map(r=>`<article class="card" data-case-id="${e(r.id)}"><h2>${e(title(r))}</h2>${badge(({ready:'Đã kiểm đạt mẫu',creating:'Đang tạo / chưa hoàn tất',failed:'Tạo dở · chưa đạt',changed:'Đã thay đổi / cần kiểm tra'})[r.phase] || 'Chưa kiểm',r.phase!=='ready')}${line('Tạo lúc',date(r.createdAt,{time:true}))}${line('Người bán',r.seller.display_name+' · '+r.seller.org_name)}${line('Bên mua',r.buyer.display_name+' · '+r.buyer.org_name)}${line('Hàng',r.product+' · '+r.grade+' · '+quantity(r.qty_g))}${amount(r.price,'Đơn giá ảo / kg')}${line('Trạng thái đã đọc',r.actualStatus || 'Chưa tới bước đọc')}${r.currentStatus?line('Trạng thái đối ứng quan sát gần nhất',r.currentStatus):''}${r.deliveryStatus?line('Đợt giao',label(r.deliveryStatus)):''}${r.disputeStatus?line('Tranh chấp',label(r.disputeStatus)):''}${r.cancellationStatus?line('Yêu cầu hủy sau cọc',label(r.cancellationStatus)):''}${r.orderId?line('Mã hồ sơ đơn',r.orderId):''}${r.error?notice(r.error):''}${line('Bước cuối',r.step)}${r.orderId||r.offerId?`<div class="actions"><a class="button secondary" href="/quan-tri/launch.html?case=${e(r.id)}&side=seller" target="_blank" rel="noopener">Mở app bán đúng người</a><a class="button secondary" href="/quan-tri/launch.html?case=${e(r.id)}&side=buyer" target="_blank" rel="noopener">Mở app mua đúng người</a><a class="button secondary" href="/quan-tri/play.html?case=${e(r.id)}&side=seller" target="_blank" rel="noopener">Thử bán · đối ứng tự động</a><a class="button secondary" href="/quan-tri/play.html?case=${e(r.id)}&side=buyer" target="_blank" rel="noopener">Thử mua · đối ứng tự động</a>${button('Kiểm tra trạng thái','verifyCase:'+r.id,true)}</div>`:''}<details><summary>${r.steps.length} bước API đã xong</summary><ol>${r.steps.map(s=>`<li>${e(s.name)}</li>`).join('')}</ol></details></article>`).join('')||empty('Chưa tạo case','Chọn mẫu và bấm Tạo tình huống.')}</div>` +
    `<section class="card"><h2>Dọn dữ liệu rác</h2><p>Chưa có API xóa chọn lọc đơn/lời chào 50 kg. Nút dưới dùng API đặt lại sạch: xóa toàn bộ nghiệp vụ thử và case, giữ bộ seed nền. Không nhận diện một đơn là rác chỉ vì có lượng 50 kg.</p><form data-form="cleanupFirst"><label class="check"><input type="checkbox" required> Xác nhận lần 1 / 2: dọn bằng đặt lại toàn bộ, tôi chấp nhận xóa cả case đã tạo.</label><button class="secondary">Dọn dữ liệu rác bằng đặt lại sạch</button></form></section>` +
    `<section class="card"><h2>Đặt lại toàn bộ dữ liệu thử</h2><p>Xóa toàn bộ nghiệp vụ thử của môi trường, bao gồm dữ liệu không tạo từ màn này; mọi phiên đăng nhập sẽ hết hiệu lực. Chỉ xóa danh sách case khi máy chủ xác nhận thành công.</p>${c.state.resetError?notice(c.state.resetError):''}${c.state.resetStage===2?`<form data-form="resetFinal"><p><strong>Xác nhận lần 2 / 2</strong></p>${field('Nhập XOA DU LIEU THU','phrase','text','','pattern="XOA DU LIEU THU" required')}<label class="check"><input type="checkbox" required> Tôi xác nhận lần cuối xóa toàn bộ dữ liệu thử.</label><button>Đặt lại dữ liệu thử ngay</button>${button('Giữ dữ liệu','cancelReset',true)}</form>`:`<form data-form="resetFirst"><label class="check"><input type="checkbox" required> Xác nhận lần 1 / 2: tôi hiểu dữ liệu và phiên của mọi người đang thử sẽ bị đặt lại.</label><button class="secondary">Tiếp tục đặt lại dữ liệu thử</button></form>`}</section>`;
}
const instructionStatuses={received:'Ngân hàng ảo đã nhận',succeeded:'Ngân hàng ảo xử lý thành công',failed:'Xử lý thất bại'};
export async function virtualBank(c) {
  if(!await capability(c)) return heading('Ngân hàng ảo') + empty('Ngân hàng ảo · chưa có',c.state.testUnavailable);
  const state=await c.api.get('/v1/sim/bank/state');
  const orderCases=readCases().filter(r=>r.orderId);
  c.forms.bankTransfer = async f => {
    const record=orderCases.find(r=>r.id===f.get('case'));
    if(!record) throw new Error('Chọn case có hợp đồng để thử nhận cọc.');
    const buyer=await actor(c.api,record.buyer);
    try {
      const d=await buyer.api.get(`/v1/orders/${record.orderId}/deposit-instruction`);
      const remaining=BigInt(d.total_vnd)-BigInt(d.received_vnd);
      if(remaining<=0n) throw new Error('Case đã nhận đủ cọc; chọn case Đã ký chờ cọc.');
      await c.api.post('/v1/sim/bank/transfers',{
        payment_ref:d.payment_ref,amount_vnd:remaining.toString(),virtual_account_no:d.virtual_account_no,
        payer:{bank_code:'AGV_VIRTUAL',account_no:'AGV-AO-'+record.id,name:'BEN MUA THU'},
      });
      c.flash('Ngân hàng ảo đã nhận cọc và xếp sự kiện. Bấm Giao webhook để hệ thống ghi nhận; số dư ứng dụng chưa tự thay đổi.');
    } finally {await buyer.api.post('/v1/auth/logout').catch(()=>{});}
  };
  c.forms.bankProcess = async f => { const result=await c.api.post('/v1/sim/bank/process-instructions',{outcome:f.get('outcome'),...(f.get('code')?{code:f.get('code')}:{})}); c.flash('Ngân hàng ảo đã xếp '+result.queued.length+' sự kiện. Chưa giao webhook cho ứng dụng.'); };
  c.forms.bankDeliver = async f => {
    const results=await c.api.post('/v1/sim/bank/deliver',{mode:f.get('mode')});
    c.state.bankResults=results;
    c.flash('Đã giao '+results.length+' webhook. Đọc kết quả và trạng thái đơn; giao webhook không tự chứng minh ghi sổ thành công.');
  };
  c.forms.bankReconcile = async()=>{
    const accounts=await c.api.get('/v1/test/accounts'), finance=accounts.find(x=>(x.staff_roles||'').split(',').includes('finance'));
    const staff=await actor(c.api,finance);
    try { await staff.api.command('/v1/ops/reconcile'); c.flash('Đã chạy đối soát bằng vai tài chính thử.'); }
    finally {await staff.api.post('/v1/auth/logout').catch(()=>{});}
  };
  // Dùng GET money của từng case có quyền; không cộng suy diễn thành số dư toàn ngân hàng.
  const balances=[], sessions=new Map();
  try {
    for(const record of orderCases) {
      try {
        const key=record.buyer.phone+'|'+record.buyer.org_code;
        if(!sessions.has(key)) sessions.set(key,await actor(c.api,record.buyer));
        const m=await sessions.get(key).api.get(`/v1/orders/${record.orderId}/money`);
        balances.push({record,m});
      } catch(err) {balances.push({record,error:err.message});}
    }
  } finally {
    for(const who of sessions.values()) await who.api.post('/v1/auth/logout').catch(()=>{});
  }
  return heading('Ngân hàng ảo','Ngân hàng ảo AgiViet',button('Làm mới','reload',true)) +
    notice('Đường tiền thử: chuyển cọc → giao webhook → sổ đảm bảo của đơn → tạo lệnh chi / hoàn → ngân hàng ảo xử lý → giao webhook → đối soát. Xử lý ngân hàng và giao webhook là hai bước riêng.') +
    empty('Số dư toàn bộ tài khoản đảm bảo · chưa có','API ngân hàng thử chưa trả số dư tổng. Bên dưới là số dư sổ cái từng đơn trong danh sách case của trình duyệt này, đọc từ GET money; không phải tổng ngân hàng.') +
    `<section class="card"><h2>Ngân hàng ảo nhận cọc</h2>${orderCases.length?`<form data-form="bankTransfer">${select('Case cần nhận cọc','case',orderCases.map(r=>[r.id,title(r)+' · '+r.orderId]))}<p>Nhận đúng phần cọc và phí còn thiếu từ hướng dẫn của đơn. Chưa ghi vào sổ đảm bảo trước khi giao webhook.</p><button>Nhận cọc thử tại ngân hàng ảo</button></form>`:notice('Tạo case Đã ký chờ cọc trước để xem từng bước nhận tiền.')}</section>` +
    `<div class="grid two"><section class="card"><h2>Ngân hàng ảo xử lý lệnh</h2><form data-form="bankProcess">${select('Kết quả xử lý thử','outcome',[['succeeded','Thành công'],['failed','Thất bại']],'succeeded')}${field('Mã lệnh (trống: mọi lệnh đủ điều kiện)','code')}<button>Xử lý lệnh đang chờ</button></form><p class="caption">Đẩy lệnh đủ điều kiện từ backend sang ngân hàng ảo rồi xếp webhook; chưa giao webhook.</p></section><section class="card"><h2>Giao webhook cho hệ thống</h2>${line('Sự kiện đang chờ',state.hang_doi.length)}<form data-form="bankDeliver">${select('Cách giao','mode',[['all','Giao tất cả'],['first','Chỉ giao sự kiện đầu'],['reverse','Đảo thứ tự'],['duplicate','Giao lặp để thử chống trùng']],'all')}<button>Giao webhook ngân hàng ảo</button></form><form data-form="bankReconcile"><button class="secondary">Đối soát bằng tài chính thử</button></form></section></div>` +
    `<section class="card"><h2>Lệnh tại ngân hàng ảo</h2>${state.lenh.map(i=>`<article>${line('Mã lệnh',i.code)}${amount(i.amount_vnd,'Số tiền ảo')}${line('Trạng thái',instructionStatuses[i.status]||i.status)}${line('Nơi nhận','Ngân hàng ảo AgiViet · ẢO · '+i.target_account_masked)}</article>`).join('')||notice('Chưa có lệnh được gửi sang ngân hàng ảo.')}</section>` +
    `<section class="card"><h2>Hàng đợi webhook</h2>${state.hang_doi.map(q=>line(q.event_id,q.txn_ref)).join('')||notice('Không có webhook đang chờ.')}${c.state.bankResults?`<h3>Kết quả giao vừa rồi từ API</h3><pre class="bank-result">${e(JSON.stringify(c.state.bankResults,null,2))}</pre>`:''}</section>` +
    `<div class="section-title"><h2>Sổ đảm bảo và lệnh theo case</h2></div><div class="grid two">${balances.map(({record:r,m,error})=>`<section class="card"><h2>${e(title(r))}</h2>${line('Mã đơn',r.orderId)}${error?notice(error):`${(m.so_cai||[]).map(a=>amount(a.balance_vnd,({deposit_escrow:'Cọc đang giữ',deposit_held:'Cọc đang giữ',fee_held:'Phí đang giữ',deposit_pending:'Cọc chờ ghi nhận',fee_pending:'Phí chờ thu',fee_revenue:'Phí đã thu',bank_clearing:'Đối ứng ngân hàng'})[a.account_type]||a.account_type)).join('')||notice('Sổ cái không có tài khoản số dư khác 0.')}${(m.lenh_ngan_hang||[]).map(i=>`<article>${line('Lệnh chi / hoàn',i.code)}${amount(i.amount_vnd,'Tiền ảo')}${line('Trạng thái ứng dụng',label(i.status))}${line('Nơi nhận','Ngân hàng ảo AgiViet · ẢO · '+i.target_account_masked)}</article>`).join('')}`}</section>`).join('')||empty('Chưa có đơn trong danh sách case','Tạo mẫu có hợp đồng để xem sổ đảm bảo.')}</div>` +
    `<section class="card"><h2>Giao dịch ghi tại ngân hàng ảo</h2>${state.giao_dich.map(g=>`<article>${line('Mã giao dịch',g.bank_txn_ref)}${line('Nghiệp vụ',({deposit_received:'Nhận cọc',instruction_succeeded:'Chi / hoàn thành công',instruction_failed:'Chi / hoàn thất bại'})[g.kind]||g.kind)}${amount(g.amount_vnd,'Tiền ảo')}${line('Tham chiếu',g.payment_ref||g.instruction_code)}</article>`).join('')||notice('Chưa có giao dịch.')}</section>`;
}
