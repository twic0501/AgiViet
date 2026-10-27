import { Api } from '../shared/api.js';
import { demoProvenance } from './demo-data.js';
import { profileById } from './profiles.js';
import { grams } from '../shared/format.js';

export const templates = [
  ['offer', 'Lời chào chờ người bán trả lời'],
  ['sign', 'Hợp đồng chờ ký'],
  ['deposit', 'Đã ký chờ cọc'],
  ['active', 'Cọc đã vào chờ giao'],
  ['checking', 'Đang giao / nghiệm thu'],
  ['dispute', 'Tranh chấp mở'],
  ['cancel', 'Hủy sau cọc'],
  ['completed', 'Đã quyết toán tiền về'],
];
export const caseKey = 'agv-local-test-cases-v1';
export function readCases() {
  try { return JSON.parse(localStorage.getItem(caseKey) || '[]'); } catch { return []; }
}
export function saveCase(record) {
  const list = readCases(), index = list.findIndex(r => r.id === record.id);
  if (index < 0) list.unshift(record); else list[index] = record;
  localStorage.setItem(caseKey, JSON.stringify(list));
}
export async function testAccess(api) {
  const capability = await api.get('/frontend-capabilities.json');
  if (!capability.test_tools) throw new Error('Chỉ cổng operator trên máy có công cụ thử. Cần khởi động lại stack nếu capability chưa bật.');
  const health = await api.get('/health');
  if (health.moi_truong !== 'thu') throw new Error('Chỉ tạo tình huống trong môi trường thử.');
  return capability;
}
export async function actor(api, account) {
  const result = await api.post('/v1/test/impersonate', {phone:account.phone, org_code:account.org_code});
  const client = new Api({base:api.base, fetcher:api.fetcher, token:result.token, deviceId:api.deviceId, storage:api.storage});
  client.setActor(result.user.user_id);
  return {api:client, user:result.user};
}
// Mỗi case dùng lô riêng, không tiêu thụ lượng của case khác. Chỉ lưu metadata, không lưu token.
export async function createCase(api, input, report = () => {}) {
  const capability=await testAccess(api);
  if (!templates.some(([id]) => id === input.template)) throw new Error('Chọn mẫu có sẵn.');
  const profile=profileById(input.profile);
  if(input.profile && (!profile || profile.unavailable)) throw new Error('Hồ sơ mẫu này chưa có luồng đã nối.');
  const qty = grams(input.qty);
  if (BigInt(qty) <= 0n || !/^[1-9]\d*$/.test(input.price)) throw new Error('Lượng và giá phải lớn hơn 0.');
  if (input.seller.org_code === input.buyer.org_code) throw new Error('Hai bên phải thuộc hai tổ chức khác nhau.');
  const record = {id:crypto.randomUUID(), createdAt:new Date().toISOString(), ...input, qty_g:qty, phase:'creating', provenance:demoProvenance, steps:[]};
  const progress = () => { saveCase(record); report(record); };
  progress();
  const step = async (name, fn) => {
    record.step = name; progress();
    const result = await fn(); record.steps.push({name, at:new Date().toISOString()}); progress(); return result;
  };
  const sessions = [];
  try {
    const health=await api.get('/health');
    if(!capability.database_test_clock && String(health.dau_van_tay_db).startsWith('pg:') && Math.abs(Date.parse(health.gio)-Date.now())>60000) {
      await step('Đồng bộ đồng hồ thử PostgreSQL về giờ máy operator',()=>api.post('/v1/test/clock',{set:new Date().toISOString()}));
    }
    const s = await step('Đóng vai người bán', () => actor(api,input.seller));
    sessions.push(s.api);
    const b = await step('Đóng vai bên mua', () => actor(api,input.buyer));
    sessions.push(b.api);
    const now = new Date((await api.get('/v1/test/clock')).now);
    const day = new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
    // Giao ở mốc hiện tại để không tua lùi và làm hết hạn các case đã tạo.
    const from = now.toISOString(), to = new Date(+now+24*3600000).toISOString();
    const lot = await step('Tạo lô dữ liệu thử', () => s.api.command('/v1/lots', {
      product_code:input.product, grade_code:input.grade, qty_basis:'weighed', qty_g:qty,
      ask_price_vnd:input.price, floor_price_vnd:input.price, available_from:day, harvest_on:day, spray_clear_on:day,
    }));
    record.lotId = lot.id; progress();
    const img = await fetch('/quan-tri/fixture.png.base64').then(r => r.text());
    await step('Gắn ảnh giả có nhãn dữ liệu thử', () => s.api.command('/v1/files', {
      mime:'image/png', data_base64:img.trim(), entity:'lot', entity_id:lot.id, captured_in_app:true,
    }));
    const detailLot = await s.api.get('/v1/lots/'+lot.id);
    await step('Đăng lô thử', () => s.api.command(`/v1/lots/${lot.id}/publish`, {expected_revision:detailLot.revision}));
    const offer = await step('Gửi lời chào mua', () => b.api.command('/v1/offers', {direction:'buyer_bid',lot_id:lot.id,qty_g:qty,price_vnd:input.price}));
    record.offerId = offer.id; progress();
    if (input.template !== 'offer') {
      const o = await s.api.get('/v1/offers/'+offer.id);
      await step('Người bán đồng ý giá', () => s.api.command(`/v1/offers/${offer.id}/accept`,{expected_revision:o.revision}));
      const order = await step('Lập hợp đồng', () => b.api.command('/v1/orders', {
        offer_id:offer.id, downgrade_price_vnd:(BigInt(input.price)*7n/10n || 1n).toString(),
        delivery_mode:'at_farm',site_kind:'tai_vuon',transport_by:'buyer',delivery_from:from,delivery_to:to,
        payment_timing:'before_loading',seal_sample_required:true,silent_accept_hours:null,
      }));
      record.orderId=order.id; progress();
      if (input.template !== 'sign') {
        for (const [name, who] of [['Bên mua', b], ['Người bán', s]]) {
          const d = await who.api.get('/v1/orders/'+order.id);
          const challenge = await who.api.post('/v1/otp/challenges',{purpose:'contract_sign',document_id:d.tai_lieu.find(x=>x.doc_type==='contract').id});
          await step(name+' ký OTP thử', () => who.api.command(`/v1/orders/${order.id}/sign`,{
            challenge_id:challenge.challenge_id,code:'123456',commitment_ack:true,abnormal_price_ack:true,expected_revision:d.revision,
          }));
        }
        if (input.template !== 'deposit') {
          const d = await b.api.get(`/v1/orders/${order.id}/deposit-instruction`);
          await step('Ngân hàng ảo nhận cọc', () => api.post('/v1/sim/bank/transfers', {
            payment_ref:d.payment_ref, amount_vnd:d.total_vnd, virtual_account_no:d.virtual_account_no,
            payer:{bank_code:'AGV_VIRTUAL',account_no:'AGV-AO-'+record.id,name:'BEN MUA THU'},
          }));
          await step('Giao webhook cọc', () => api.post('/v1/sim/bank/deliver',{}));
          if (input.template === 'cancel') {
            const request = await step('Bên mua đề nghị hủy sau cọc', () => b.api.command(`/v1/orders/${order.id}/cancellation-requests`,{reason_kind:'buyer_request',reason_text:'Tình huống thử hủy sau cọc; không có tiền thật.'}));
            record.cancellationId=request.id; progress();
            await step('Người bán đồng ý hủy', () => s.api.command(`/v1/cancellation-requests/${request.id}/accept`));
          } else if (['checking','dispute','completed'].includes(input.template)) {
            const payments = await b.api.get(`/v1/orders/${order.id}/payments`);
            const payment = payments.find(x=>x.kind==='goods_before_loading');
            const evidence = await step('Tạo chứng từ trả thẳng giả', () => b.api.command('/v1/files', {
              mime:'image/png',data_base64:img.trim(),entity:'payment',entity_id:payment.id,captured_in_app:false,
            }));
            await step('Bên mua báo trả tiền ảo', () => b.api.command(`/v1/payments/${payment.id}/report`, {amount_vnd:payment.amount_due_vnd,method:'bank_transfer',evidence_document_id:evidence.id}));
            const otp = await s.api.post('/v1/otp/challenges',{purpose:'money_received',payment_id:payment.id,amount_vnd:payment.amount_due_vnd});
            await step('Người bán xác nhận tiền ảo', () => s.api.command(`/v1/payments/${payment.id}/confirm`, {
              amount_vnd:payment.amount_due_vnd,method:'bank_transfer',result:'full',bank_txn_ref:'AGV-AO-'+record.id,challenge_id:otp.challenge_id,code:'123456',
            }));
            const d = await b.api.get('/v1/orders/'+order.id), did=d.dot_giao[0].id;
            record.deliveryId=did; progress();
            await step('Chỉ định người nhận', () => b.api.command(`/v1/deliveries/${did}/receiver`,{user_id:b.user.user_id}));
            await step('Lưu chuyến xe trong seed thử', () => b.api.command(`/v1/deliveries/${did}/trip`,{plate_no:input.plate || '66C-123.45',freight_vnd:'0'}));
            await step('Đặt đồng hồ thử tại mốc giao hiện tại', () => api.post('/v1/test/clock',{set:from}));
            const qr = await b.api.command(`/v1/deliveries/${did}/receipt-qr`);
            await step('Bắt đầu nghiệm thu', () => s.api.command(`/v1/deliveries/${did}/start-check`,{ma_6_so:qr.data.ma_6_so,plate_no:input.plate || '66C-123.45'}));
            if (['shortfall','downgrade'].includes(input.profile)) {
              const evidence=await step('Tải phiếu cân / ảnh hư cấu có nhãn',()=>b.api.command('/v1/files',{mime:'image/png',data_base64:img.trim(),entity:'order',entity_id:order.id,captured_in_app:false}));
              record.evidenceId=evidence.id;
              const profileData=await b.api.get('/v1/products/'+input.product+'/profile');
              const reason=profileData.reject_reasons[0].reason_code;
              const weighed=input.profile==='shortfall'?BigInt(qty)*9n/10n:BigInt(qty);
              const lines=input.profile==='shortfall'?[{kind:'accepted',qty_g:String(weighed),evidence_document_id:evidence.id}]:[{kind:'accepted',qty_g:String(BigInt(qty)*85n/100n)},{kind:'downgraded',qty_g:String(BigInt(qty)/10n),reason_code:reason,evidence_document_id:evidence.id},{kind:'rejected',qty_g:String(BigInt(qty)-BigInt(qty)*85n/100n-BigInt(qty)/10n),reason_code:reason,evidence_document_id:evidence.id}];
              await step('Bên mua gửi biên bản chờ người bán',()=>b.api.command(`/v1/deliveries/${did}/acceptance`,{pin:'2468',weighed_g:String(weighed),seal_code:'MAU-AO',lines}));
            }
            if (input.template !== 'checking' || input.profile==='arrival') {
              await step('Bên mua ký nghiệm thu thử', () => b.api.command(`/v1/deliveries/${did}/acceptance`,{pin:'2468',weighed_g:qty,seal_code:'MAU-AO',lines:[{kind:'accepted',qty_g:qty}]}));
              if (input.template === 'dispute') {
                const dispute = await step('Người bán phản đối, mở tranh chấp', () => s.api.command(`/v1/deliveries/${did}/acceptance/dispute`,{line_no:1,reason:'Tình huống thử: yêu cầu cân lại.',option:'chia_lai'}));
                record.disputeId=dispute.id; progress();
              } else {
                const delivery = await s.api.get('/v1/deliveries/'+did);
                await step('Người bán ký PIN thử', () => s.api.command(`/v1/deliveries/${did}/acceptance/agree`,{pin:'2468',expected_sha256:delivery.ket_qua.at(-1).content_sha256}));
                await step('Ghi cân nơi đến', () => b.api.command(`/v1/deliveries/${did}/arrival`,{weighed_g:qty}));
                if(input.profile!=='arrival') {
                await step('Xác nhận nơi đến', () => b.api.command(`/v1/deliveries/${did}/arrival/confirm`));
                const money = await b.api.get(`/v1/orders/${order.id}/money`);
                for (const instruction of money.lenh_ngan_hang) await step('Ngân hàng ảo xử lý '+instruction.code, () => api.post('/v1/sim/bank/process-instructions',{code:instruction.code}));
                await step('Giao webhook tiền về', () => api.post('/v1/sim/bank/deliver',{}));
                const accounts=await api.get('/v1/test/accounts'), finance=accounts.find(x=>(x.staff_roles||'').split(',').includes('finance'));
                const ops=await actor(api,finance);
                try { await step('Đối soát tiền ảo', () => ops.api.command('/v1/ops/reconcile')); }
                finally { await ops.api.post('/v1/auth/logout').catch(()=>{}); }
                }
              }
            }
          }
        }
      }
    }
    if(input.profile==='harvest') {
      const img=await fetch('/quan-tri/fixture.png.base64').then(r=>r.text());
      const evidence=await step('Tải ảnh thiệt hại giả có nhãn',()=>s.api.command('/v1/files',{mime:'image/png',data_base64:img.trim(),entity:'order',entity_id:record.orderId,captured_in_app:false}));
      record.evidenceId=evidence.id;
      const amendment=await step('Xin giảm lượng do mưa cuối vụ',()=>s.api.command(`/v1/orders/${record.orderId}/amendments`,{kind:'force_majeure_reduction',payload:{qty_g:String(BigInt(qty)*8n/10n)},reason:'DỮ LIỆU GIẢ: mưa làm rụng trái; xin giảm lượng, chờ bên mua quyết định.',evidence_document_ids:[evidence.id]}));
      record.amendmentId=amendment.id;
    }
    await step('Đọc lại và kiểm tra trạng thái đích', () => verifyCase(record,b.api));
    record.phase='ready'; record.step='Đã kiểm trạng thái qua API'; progress(); return record;
  } catch (error) {
    record.phase='failed'; record.failure={status:error.status,code:error.code,details:error.details}; record.error=`${error.message}${error.code ? ' · '+error.code : ''}${error.requestId ? ' · Mã hỗ trợ: '+error.requestId : ''}`;
    progress(); throw error;
  } finally {
    for (const session of sessions) await session.post('/v1/auth/logout').catch(()=>{});
  }
}
export async function verifyCase(record, api) {
  if (record.template === 'offer') {
    const offer=await api.get('/v1/offers/'+record.offerId);
    if (offer.status!=='sent' || offer.rounds.at(-1).from_side!=='buyer') throw new Error('Lời chào chưa ở trạng thái chờ người bán.');
    record.actualStatus=offer.status; return;
  }
  const order=await api.get('/v1/orders/'+record.orderId);
  record.actualStatus=order.status;
  const expected={sign:'drafting',deposit:'awaiting_deposit',active:'active',checking:'active',dispute:'active',cancel:['active','closed'],completed:'completed'}[record.template];
  if(!(Array.isArray(expected)?expected:[expected]).includes(order.status)) throw new Error(`Trạng thái thật ${order.status}; mẫu cần ${expected}.`);
  if(record.template==='cancel') {
    const requests=await api.get(`/v1/orders/${record.orderId}/cancellation-requests`);
    const request=requests.find(r=>r.id===record.cancellationId);
    record.cancellationStatus=request?.status;
    if(!request || !['processing_money','completed'].includes(request.status)) throw new Error('Yêu cầu hủy sau cọc chưa được hai bên đồng ý.');
  }
  if(record.template==='checking') {
    const delivery=await api.get('/v1/deliveries/'+record.deliveryId);
    record.deliveryStatus=delivery.status;
    const expected=record.profile==='arrival'?'arrival_check':['shortfall','downgrade'].includes(record.profile)?'awaiting_seller':'checking';
    if(delivery.status!==expected) throw new Error('Đợt giao chưa ở trạng thái '+expected);
    if(expected==='awaiting_seller' && !record.evidenceId) throw new Error('Chưa có ảnh/phiếu cân giả.');
  }
  if(record.template==='dispute') {
    const dispute=await api.get('/v1/disputes/'+record.disputeId);
    record.disputeStatus=dispute.status;
    if(dispute.status!=='open') throw new Error('Tranh chấp chưa mở.');
  }
  if(record.profile==='harvest') {
    const list=await api.get(`/v1/orders/${record.orderId}/amendments`);
    if(!list.some(a=>a.id===record.amendmentId && a.status==='open')) throw new Error('Đề nghị giảm lượng chưa mở.');
  }
  if(record.template==='completed') {
    const money=await api.get(`/v1/orders/${record.orderId}/money`);
    if(!money.lenh_ngan_hang.length || money.lenh_ngan_hang.some(i=>!['succeeded','reconciled'].includes(i.status))) throw new Error('Lệnh tiền chưa được ngân hàng xác nhận.');
  }
}
export function casePath(record) {
  if(['completed','awaiting_settlement','closed'].includes(record.currentStatus) && record.orderId) return `order/${record.orderId}/money`;
  if(record.profile==='harvest') return `order/${record.orderId}/amendments`;
  if(record.profile==='arrival') return `order/${record.orderId}/disputes`;
  if(record.profile==='late') return `order/${record.orderId}/payments`;
  if(record.template==='offer') return record.orderId?`order/${record.orderId}/${record.currentStatus==='active'?'payments':record.currentStatus==='awaiting_deposit'?'deposit':'terms'}`:'offers/'+record.offerId;
  return `order/${record.orderId}/${({sign:'terms',deposit:'deposit',active:'deposit',checking:'delivery',dispute:'disputes',cancel:'cancel',completed:'money'})[record.template] || 'terms'}`;
}
