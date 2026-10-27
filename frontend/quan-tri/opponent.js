import {actor, saveCase} from './case-engine.js';
import {ApiError} from '../shared/api.js';
import {decision} from './profiles.js';
export class Opponent {
  constructor(api, record, side, report=()=>{}, persist=saveCase) { this.api=api;this.record=record;this.side=side;this.other=side==='seller'?'buyer':'seller';this.report=report;this.persist=persist; }
  async start() {this.who=await actor(this.api,this.record[this.other]);}
  note(event,action) {
    const r=this.record;r.opponentLog ||= [];
    if(!r.opponentLog.some(l=>l.event===event)) r.opponentLog.push({event,action,at:new Date().toISOString()});
    this.persist(r);this.report(action);
  }
  async file(entity,id) {
    const data=await fetch('/quan-tri/fixture.png.base64').then(r=>r.text());
    return this.who.api.command('/v1/files',{mime:'image/png',data_base64:data.trim(),entity,entity_id:id,captured_in_app:false});
  }
  async tick() {
    const r=this.record,a=this.who.api,seed=r.seed || 'agiviet-27';
    if(!r.orderId) {
      const offer=await a.get('/v1/offers/'+r.offerId);
      if(offer.status==='sent' && offer.toi_luot===this.other) {
        const last=offer.rounds.at(-1),event='offer-'+last.round_no;
        const action=offer.rounds.length>2?'accept':decision(seed,event,['accept','counter']);
        await a.command(`/v1/offers/${offer.id}/${action}`,action==='accept'?{expected_revision:offer.revision}:{price_vnd:String(BigInt(last.price_vnd)*(this.other==='buyer'?98n:102n)/100n),qty_g:last.qty_g});
        this.note(event,action==='accept'?'Đối ứng đồng ý lời chào':'Đối ứng trả giá trong biên độ 2%');return;
      }
      if(offer.hold?.order_id) {r.orderId=offer.hold.order_id;this.persist(r);return;}
      if(offer.status==='accepted' && this.other==='buyer') {
        const now=new Date((await this.api.get('/v1/test/clock')).now);
        const order=await a.command('/v1/orders',{offer_id:offer.id,downgrade_price_vnd:String(BigInt(offer.rounds.at(-1).price_vnd)*7n/10n),delivery_mode:'at_farm',site_kind:'tai_vuon',transport_by:'buyer',delivery_from:now.toISOString(),delivery_to:new Date(+now+86400000).toISOString(),payment_timing:'before_loading',seal_sample_required:true,silent_accept_hours:null});
        r.orderId=order.id;this.note('order','Đối ứng lập hợp đồng từ lời chào đã đồng ý');return;
      }
      return;
    }
    const o=await a.get('/v1/orders/'+r.orderId);
    r.currentStatus=o.status;this.persist(r);
    if(o.status==='completed') {this.report('Đã quyết toán; ngân hàng ảo xác nhận và tài chính đã đối soát. Bấm cập nhật để xem tiền.');return;}
    if(o.hanh_dong.includes('sign')) {
      const doc=o.tai_lieu.find(d=>d.doc_type==='contract');
      const otp=await a.post('/v1/otp/challenges',{purpose:'contract_sign',document_id:doc.id});
      await a.command(`/v1/orders/${o.id}/sign`,{challenge_id:otp.challenge_id,code:'123456',commitment_ack:true,abnormal_price_ack:true,expected_revision:o.revision});
      this.note('sign-'+this.other,'Đối ứng ký hợp đồng bằng OTP thử');return;
    }
    if(o.status==='awaiting_deposit' && this.other==='buyer') {
      const d=await a.get(`/v1/orders/${o.id}/deposit-instruction`);
      await this.api.post('/v1/sim/bank/transfers',{payment_ref:d.payment_ref,amount_vnd:String(BigInt(d.total_vnd)-BigInt(d.received_vnd)),virtual_account_no:d.virtual_account_no,payer:{bank_code:'AGV_VIRTUAL',account_no:'AGV-AO-'+r.id,name:'BEN MUA AO'}});
      await this.api.post('/v1/sim/bank/deliver',{});this.note('deposit','Ngân hàng ảo đã giao webhook cọc');return;
    }
    if(o.status==='awaiting_settlement') {await this.bank(o.id);return;}
    if(o.status!=='active') return;
    if(r.profile==='inspection') {this.report('Tranh chấp mở, chờ người xử lý và kiểm định có quyền. Đối ứng không tự cân lại hoặc tạo kết luận.');return;}
    const cancellations=await a.get(`/v1/orders/${o.id}/cancellation-requests`);
    const cancel=cancellations.find(x=>x.hanh_dong?.includes('accept'));
    if(cancel) {const action=decision(seed,'cancel',['accept','reject']);await a.command(`/v1/cancellation-requests/${cancel.id}/${action}`);this.note('cancel-'+cancel.id,'Đối ứng '+(action==='accept'?'đồng ý':'từ chối')+' đề nghị hủy');return;}
    const amendments=await a.get(`/v1/orders/${o.id}/amendments`);
    const amendment=amendments.find(x=>x.status==='open' && !x.la_cua_toi);
    if(amendment) {const action=decision(seed,'amendment',['accept','reject']);await a.command(`/v1/amendments/${amendment.id}/${action}`);this.note('amendment-'+amendment.id,'Đối ứng '+(action==='accept'?'đồng ý lập phụ lục':'từ chối đề nghị sửa'));return;}
    for(const m of amendments.filter(x=>x.status==='accepted' && x.annex_document_id)) {
      const doc=await a.get('/v1/documents/'+m.annex_document_id);
      if((doc.signatures||[]).some(s=>s.party===this.other)) continue;
      const otp=await a.post('/v1/otp/challenges',{purpose:'amendment_sign',document_id:m.annex_document_id});
      await a.command(`/v1/amendments/${m.id}/sign`,{challenge_id:otp.challenge_id,code:'123456'});this.note('annex-'+m.id+'-'+this.other,'Đối ứng ký phụ lục bằng OTP thử');return;
    }
    if(amendments.some(m=>m.status==='open' || m.status==='accepted' && m.resulting_version_no>o.effective_version_no) || o.co?.dang_xin_huy) {this.report('Chờ hai bên trả lời / ký xong đề nghị đang mở trước khi trả tiền hoặc giao hàng.');return;}
    const payments=await a.get(`/v1/orders/${o.id}/payments`);
    for(const p of payments.filter(x=>x.kind==='goods_before_loading' && !['fully_received','cancelled'].includes(x.status))) {
      if(this.other==='buyer' && ['due','not_due','partially_received'].includes(p.status)) {
        if(r.profile==='late' && !this.delayed) {this.delayed=true;this.report('Đối ứng chậm trả một lượt quan sát; chưa được bốc hàng.');return;}
        const evidence=await this.file('payment',p.id);
        await a.command(`/v1/payments/${p.id}/report`,{amount_vnd:p.amount_due_vnd,method:'bank_transfer',evidence_document_id:evidence.id});this.note('report-'+p.id,'Đối ứng báo trả tiền ảo kèm chứng từ giả');return;
      }
      if(this.other==='seller' && ['payer_reported','reported_paid'].includes(p.status)) {
        const otp=await a.post('/v1/otp/challenges',{purpose:'money_received',payment_id:p.id,amount_vnd:p.reported_vnd});
        await a.command(`/v1/payments/${p.id}/confirm`,{amount_vnd:p.reported_vnd,method:'bank_transfer',result:'full',bank_txn_ref:'AGV-AO-'+r.id,challenge_id:otp.challenge_id,code:'123456'});this.note('confirm-'+p.id,'Đối ứng xác nhận tiền ảo bằng OTP thử');return;
      }
    }
    if(payments.some(p=>p.kind==='goods_before_loading' && p.status!=='cancelled' && BigInt(p.confirmed_vnd)<BigInt(p.amount_due_vnd))) {this.report('Chờ người bán xác nhận đã nhận tiền ảo; chưa bốc hàng.');return;}
    const did=o.dot_giao[0]?.id;if(!did)return;r.deliveryId=did;
    const d=await a.get('/v1/deliveries/'+did);
    if(r.profile==='arrival' && this.other==='buyer' && d.status==='arrival_check') {
      const evidence=await this.file('order',o.id);
      const dispute=await a.command(`/v1/deliveries/${did}/arrival/complaint`,{line_no:1,qty_g:String(BigInt(d.planned_qty_g)/10n),reason:'Tình huống giả: 10% hàng khác mẫu niêm phong khi tới nơi.',seal_code:'MAU-AO',inspection_fee_vnd:'300000',evidence_document_id:evidence.id});
      r.disputeId=dispute.id;r.evidenceId=evidence.id;this.note('arrival-complaint','Đối ứng khiếu nại 10% hàng kèm ảnh giả; backend đặt kiểm định, chưa có kết luận.');return;
    }
    if(this.other==='buyer' && d.status==='disputed') {
      const disputes=await a.get(`/v1/orders/${o.id}/disputes`);
      const open=disputes.find(x=>x.status==='open' && x.hanh_dong?.includes('resubmit_acceptance'));
      if(!open) {this.report('Tranh chấp cần người xử lý / kiểm định; đối ứng không tự kết luận.');return;}
      const evidence=await this.file('order',o.id),last=d.ket_qua.at(-1);
      await a.command(`/v1/deliveries/${did}/acceptance`,{pin:'2468',weighed_g:last.weighed_g,seal_code:'MAU-AO-CAN-LAI',evidence_document_id:evidence.id,lines:last.lines.map(l=>({kind:l.kind,qty_g:l.qty_g,...(l.reason_code?{reason_code:l.reason_code}:{}),evidence_document_id:evidence.id}))});
      this.note('reweigh-'+last.version_no,'Đối ứng gửi lại biên bản với ảnh cân lại giả, giữ phần không tranh chấp');return;
    }
    if(this.other==='buyer' && ['preparing','ready'].includes(d.status)) {
      if(!d.receiver_user_id) {await a.command(`/v1/deliveries/${did}/receiver`,{user_id:this.who.user.user_id});this.note('receiver','Đối ứng chỉ định người nhận ảo');return;}
      if(d.the_san_sang?.some(x=>!x.ok && /xe|chuyến/i.test(x.ten))) {await a.command(`/v1/deliveries/${did}/trip`,{plate_no:r.plate||'66C-123.45',freight_vnd:'0'});this.note('trip','Đối ứng lưu chuyến xe thử');return;}
      const qr=await a.command(`/v1/deliveries/${did}/receipt-qr`);this.receiptCode=qr.data.ma_6_so;this.report('Mã nhận hàng ảo: '+this.receiptCode+'. Người bán nhập mã trên app để bắt đầu cân.');return;
    }
    if(this.other==='buyer' && d.status==='checking') {
      const mode=decision(seed,'acceptance',['accepted','downgraded']),qty=BigInt(d.planned_qty_g),lines=[{kind:'accepted',qty_g:String(qty)}];
      if(mode==='downgraded') {const evidence=await this.file('order',o.id);const profile=await a.get('/v1/products/'+r.product+'/profile');lines[0].qty_g=String(qty-qty/10n);lines.push({kind:'downgraded',qty_g:String(qty/10n),reason_code:profile.reject_reasons[0].reason_code,evidence_document_id:evidence.id});}
      await a.command(`/v1/deliveries/${did}/acceptance`,{pin:'2468',weighed_g:String(qty),seal_code:'MAU-AO',lines});this.note('acceptance','Đối ứng gửi biên bản '+(mode==='downgraded'?'hạ cấp 10% kèm ảnh giả':'nhận đủ'));return;
    }
    if(this.other==='seller' && d.status==='ready' && this.receiptCode) {
      await a.command(`/v1/deliveries/${did}/start-check`,{ma_6_so:this.receiptCode,plate_no:r.plate||'66C-123.45'});this.note('start-check','Đối ứng bán nhận mã từ QR trên app mua, bắt đầu cân');return;
    }
    if(this.other==='seller' && d.status==='awaiting_seller') {
      await a.command(`/v1/deliveries/${did}/acceptance/agree`,{pin:'2468',expected_sha256:d.ket_qua.at(-1).content_sha256,...(BigInt(d.ket_qua.at(-1).weighed_g)<BigInt(d.planned_qty_g)?{shortfall:{choice:'end',notice:'none'}}:{})});this.note('agree-'+d.ket_qua.length,'Đối ứng ký kết quả nghiệm thu');return;
    }
    if(this.other==='buyer' && d.status==='in_transit') {await a.command(`/v1/deliveries/${did}/arrival`,{weighed_g:d.ket_qua.at(-1).weighed_g});this.note('arrival','Đối ứng ghi cân nơi đến');return;}
    if(this.other==='buyer' && d.status==='arrival_check') {await a.command(`/v1/deliveries/${did}/arrival/confirm`);this.note('arrival-confirm','Đối ứng xác nhận nơi đến');return;}
    await this.bank(o.id);
  }
  async bank(id) {
    const money=await this.who.api.get(`/v1/orders/${id}/money`);
    for(const i of money.lenh_ngan_hang.filter(i=>['created','sent','sent_to_bank'].includes(i.status))) {await this.api.post('/v1/sim/bank/process-instructions',{code:i.code});await this.api.post('/v1/sim/bank/deliver',{});this.note('bank-'+i.code,'Ngân hàng ảo xử lý và giao webhook '+i.code);}
    const after=await this.who.api.get(`/v1/orders/${id}/money`);
    const settledCodes=after.lenh_ngan_hang.map(i=>i.code).sort().join(',');
    if(this.reconciled!==settledCodes && after.lenh_ngan_hang.length && after.lenh_ngan_hang.every(i=>['succeeded','reconciled'].includes(i.status))) {
      const accounts=await this.api.get('/v1/test/accounts'),finance=accounts.find(x=>(x.staff_roles||'').split(',').includes('finance'));
      const staff=await actor(this.api,finance);
      try {await staff.api.command('/v1/ops/reconcile');this.reconciled=settledCodes;this.note('reconcile-'+settledCodes,'Tài chính thử đối soát sau webhook ngân hàng ảo');}finally {await staff.api.post('/v1/auth/logout').catch(()=>{});}
    }
  }
  async deliverInspectionResult(result) {
    const r=this.record;
    if(r.profile!=='arrival' || !['passed','failed','inconclusive'].includes(result)) throw new Error('Chỉ hồ sơ khác mẫu tại nơi đến có kiểm định giả đã được đặt.');
    const disputes=await this.who.api.get(`/v1/orders/${r.orderId}/disputes`);
    const dispute=disputes.find(d=>d.status==='awaiting_inspection' && d.inspections?.some(i=>!i.result));
    const inspection=dispute?.inspections.find(i=>!i.result);
    if(!inspection) throw new Error('Chưa có yêu cầu kiểm định đang chờ kết quả. Gửi khiếu nại đúng phần hàng trong app trước.');
    // Quyết toán tạm phải nhận phản hồi ngân hàng trước khi chia cọc theo kết luận.
    await this.bank(r.orderId);
    const money=await this.who.api.get(`/v1/orders/${r.orderId}/money`);
    if(money.lenh_ngan_hang.some(i=>!['succeeded','reconciled'].includes(i.status))) throw new Error('Chưa xử lý xong lệnh quyết toán tạm tại ngân hàng ảo; chưa giao kết quả kiểm định.');
    const response=await this.api.post('/v1/sim/inspection/result',{inspection_id:inspection.id,result,sample_code:'MAU-AO',measurements:{du_lieu_gia:true,nguon:'quan-tri-local',seed:r.seed}});
    if(response.http<200 || response.http>=300) throw new ApiError(response.http,response.body);
    const after=await this.who.api.get('/v1/disputes/'+dispute.id);
    if(!after.inspections?.some(i=>i.id===inspection.id && i.result===result)) throw new Error('Webhook chưa được ghi nhận; chưa chứng minh có kết quả.');
    r.disputeId=dispute.id;this.note('inspection-'+inspection.id,'Đối tác kiểm định giả giao kết quả '+({passed:'Đạt',failed:'Không đạt',inconclusive:'Chưa kết luận'})[result]+' qua webhook; hồ sơ '+({resolved:'đã giải quyết',inconclusive:'chưa có kết luận'}[after.status]||'đang xử lý')+'.');
    return after;
  }
  async stop() {if(this.who) await this.who.api.post('/v1/auth/logout').catch(()=>{});}
}
