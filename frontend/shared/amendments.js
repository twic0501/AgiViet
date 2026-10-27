import { bankName, accountName } from "./virtual-money.js";
import { money, quantity, date, grams, escapeHtml as e } from './format.js';
import { field, select, line, button, amount, notice, badge, fraud, link, copyReference } from './ui.js';
import { upload } from './market.js';
const kinds=[['change_date','Đổi ngày giao'],['increase_qty','Tăng lượng'],['decrease_qty','Giảm lượng'],['force_majeure_reduction','Giảm lượng do bất khả kháng'],['change_price','Đổi giá'],['change_receiver','Đổi người nhận']];
export async function amendments(c,o) {
  const list=await c.api.get(`/v1/orders/${o.id}/amendments`), can=c.can('order.sign.'+c.side);
  const members=c.seller?[]:await c.api.get('/v1/org/members');
  const moneyData = !c.user.helper_of ? await c.api.get(`/v1/orders/${o.id}/money`) : null;
  const receivers=members.filter(m=>m.status==='active'&&m.roles_effective.some(r=>['owner','warehouse','site_receiver'].includes(r)));
  c.change.kind = async (form) => {
    const kind=form.elements.kind.value;
    const group=kind==='change_date'?'date':kind==='change_price'?'price':kind==='change_receiver'?'receiver':'qty';
    for(const part of form.querySelectorAll('[data-amend-fields]')) {
      const show=part.dataset.amendFields===group;
      part.hidden=!show;
      for(const input of part.querySelectorAll('input,select')) {input.disabled=!show;input.required=show&&input.name!=='notice';}
    }
    const evidence=form.elements.evidence;
    evidence.required=kind==='force_majeure_reduction';
  };
  c.forms.amendment=async f=>{
    const kind=f.get('kind'); let payload;
    if(kind==='change_date') {if(!f.get('from')||!f.get('to')) throw new Error('Nhập khoảng ngày giao mới.');payload={delivery_from:new Date(f.get('from')+'+07:00').toISOString(),delivery_to:new Date(f.get('to')+'+07:00').toISOString()};}
    else if(kind==='change_price') payload={unit_price_vnd:f.get('price')};
    else if(kind==='change_receiver') payload={receiver_user_id:f.get('receiver')};
    else payload={qty_g:grams(f.get('qty'))};
    const evidence=f.get('evidence')?.size?[ (await upload(c,f.get('evidence'),'order',o.id)).id ]:[];
    await c.command(`/v1/orders/${o.id}/amendments`,{kind,payload,reason:f.get('reason'),evidence_document_ids:evidence,notice_days_before_delivery:f.get('notice')?Number(f.get('notice')):undefined});
  };
  const cards=[];
  for(const a of list) {
    for(const op of ['accept','reject','withdraw']) c.on[`amend-${op}-${a.id}`]=async()=>{const r=await c.command(`/v1/amendments/${a.id}/${op}`);if(r.data?.tinh) c.state.amendmentCalculation={id:a.id,...r.data.tinh};};
    const doc=a.annex_document_id?await c.api.get('/v1/documents/'+a.annex_document_id):null;
    const signed=doc?.signatures?.some(s=>s.party===c.side);
    const content=doc?.canonical_content;
    const newValue=content?.moi?.gia_tri;
    const aboveLimit=!c.seller&&!c.user.roles.includes('owner')&&c.user.approval_limit_vnd!=null&&newValue!=null&&BigInt(newValue)>BigInt(c.user.approval_limit_vnd);
    c.forms['amendPrepare-'+a.id]=async()=>{c.state.otp={kind:'amend',id:a.id,challenge:await c.api.post('/v1/otp/challenges',{purpose:'amendment_sign',document_id:a.annex_document_id})};};
    c.forms['amendSign-'+a.id]=async f=>{const r=await c.command(`/v1/amendments/${a.id}/sign`,{challenge_id:c.state.otp.challenge.challenge_id,code:f.get('code')});delete c.state.otp;if(r.data.he_qua)c.state.amendmentEffect={id:a.id,...r.data.he_qua};};
    const pending=a.status==='accepted'&&a.resulting_version_no>o.effective_version_no;
    const p=a.payload||{};
    cards.push(`<section class="card form"><h2>${e(kinds.find(k=>k[0]===a.kind)?.[1]||'Đề nghị sửa')}</h2>${badge(a.status==='open'?'Chờ trả lời':a.status==='accepted'?(pending?'Chờ đủ chữ ký':'Đã có hiệu lực'):a.status==='withdrawn'?'Đã rút':'Không đồng ý')}${line('Bên gửi',a.la_cua_toi?'Tổ chức bạn':'Bên kia')}${line('Lý do',p.reason || p.ly_do)}${p.qty_g?line('Lượng mới',quantity(p.qty_g)):''}${p.unit_price_vnd?amount(p.unit_price_vnd,'Giá mới / kg'):''}${p.delivery_from?line('Ngày giao mới',date(p.delivery_from,{time:true})+' – '+date(p.delivery_to,{time:true})):''}${content?.ngay_giao_moi?line('Ngày giao theo phụ lục',date(content.ngay_giao_moi.tu,{time:true})+' – '+date(content.ngay_giao_moi.den,{time:true})):''}${a.han?line('Hạn trả lời',date(a.han,{time:true})):''}${content?.moi?`<h3>Hệ quả phụ lục</h3>${line('Giá trị cũ → mới',money(content.cu.gia_tri)+' → '+money(content.moi.gia_tri))}${line('Cọc cũ → mới',money(content.cu.coc)+' → '+money(content.moi.coc))}${a.kind==='change_price'?amount(moneyData?.phi?.so_tien_vnd,'Phí giữ nguyên theo hợp đồng')+notice('Đổi giá giữ nguyên phí theo quy định phí của hợp đồng.'):line('Phí cũ → mới',money(content.cu.phi)+' → '+money(content.moi.phi))}`:''}${doc?button('Xem PDF phụ lục','pdf:'+doc.id,true):''}${can&&a.status==='open'?`<div class="actions">${a.la_cua_toi?button('Rút đề nghị','amend-withdraw-'+a.id,true):button('Đồng ý lập phụ lục','amend-accept-'+a.id)+button('Không đồng ý sửa','amend-reject-'+a.id,true)}</div>`:''}${can&&pending?(signed?notice('Bạn đã ký phụ lục. Chờ bên kia ký.'):aboveLimit?notice('Giá trị phụ lục vượt hạn mức của bạn. Chủ tổ chức cần ký.'):c.state.otp?.id===a.id?`<form data-form="amendSign-${a.id}">${notice(fraud)}${field('Mã OTP ký phụ lục','code','text','','pattern="[0-9]{6}" required')}<button>Ký phụ lục bằng OTP</button></form>`:`<form data-form="amendPrepare-${a.id}"><label class="check"><input type="checkbox" required>Tôi đã đọc phụ lục và hệ quả tiền, lượng, ngày giao.</label><button>Nhận mã ký phụ lục</button></form>`):''}${c.state.amendmentEffect?.id===a.id?effect(c.state.amendmentEffect):!pending&&a.status==='accepted'&&content?.moi&&BigInt(content.moi.coc)>BigInt(content.cu.coc)?notice('Chưa có mã chuyển cọc bổ sung trong lượt xem này. Liên hệ hỗ trợ trước khi chuyển tiền.'):''}</section>`);
  }
  return notice('Mỗi đề nghị sửa một mục. Im lặng 24 giờ là không đồng ý. Chỉ khi đủ chữ ký, phụ lục mới thay thỏa thuận hiện hành.')+cards.join('')+refundInstructions(c, moneyData?.lenh_ngan_hang || [], o.id)+`${can&&['active','awaiting_deposit'].includes(o.status)&&!list.some(a=>a.status==='open'||a.status==='accepted'&&a.resulting_version_no>o.effective_version_no)?`<section class="card form"><h2>Gửi đề nghị sửa</h2><form data-form="amendment">${select('Nội dung cần sửa','kind',kinds.filter(k=>!c.seller||k[0]!=='change_receiver'))}<div data-amend-fields="date">${field('Giao từ mới (giờ Việt Nam)','from','datetime-local')}${field('Giao đến mới (giờ Việt Nam)','to','datetime-local')}</div><div data-amend-fields="qty" hidden>${field('Tổng lượng mới (kg)','qty','number','','min="0.001" step="0.001" disabled')}${field('Báo trước ngày giao bao nhiêu ngày','notice','number','','min="0" disabled')}</div><div data-amend-fields="price" hidden>${field('Đơn giá mới (đ/kg)','price','number','','min="1" disabled')}</div>${!c.seller?`<div data-amend-fields="receiver" hidden>${select('Người nhận mới','receiver',receivers.map(m=>[m.user_id,m.name]),'', 'disabled')}</div>`:''}<label>Lý do<textarea name="reason" required></textarea></label>${field('Bằng chứng (bắt buộc khi bất khả kháng)','evidence','file','','accept="image/png,image/jpeg,application/pdf"')}<button>Gửi đề nghị sửa</button></form></section>`:''}<div data-pdf-host></div>`;
}
function effect(r) {
  const names={chenh_coc_vnd:'Chênh cọc',chenh_phi_vnd:'Chênh phí',hoan_coc_vnd:'Cọc chênh được hoàn về nguồn',hoan_phi_vnd:'Phí được hoàn',tra_thang_moi_vnd:'Trả thẳng mới',phat_vnd:'Phạt thiếu lượng'};
  return Object.entries(names).filter(([k])=>r[k]!=null).map(([k,n])=>amount(r[k],n)).join('')+(r.bo_sung_coc_ref&&BigInt(r.chenh_coc_vnd||0)>0?`<section data-topup>${amount(r.chenh_coc_vnd,'Cọc cần bổ sung')}${copyReference(r.bo_sung_coc_ref,'Nội dung chuyển cọc bổ sung')}${notice('Chỉ ngân hàng xác nhận mới tính là đã nạp cọc bổ sung.')}</section>`:'')+(r.lenh_hoan?line('Mã lệnh hoàn',r.lenh_hoan)+notice('Đã tạo lệnh hoàn khi phụ lục có hiệu lực. Xem trạng thái ngân hàng bên dưới để biết tiền đã về hay chưa.'):'');
}

function refundInstructions(c, instructions, orderId) {
  const refunds=instructions.filter(i=>i.kind.includes('refund'));
  if(!refunds.length) return '';
  const states={created:'Đã tạo lệnh',sent:'Đã gửi ngân hàng',processing:'Ngân hàng đang xử lý',succeeded:'Tiền đã về',reconciled:'Đã đối soát',failed:'Lệnh chưa thành công',awaiting_callback:'Chờ xác minh chủ tài khoản'};
  return `<section class="card" data-annex-refunds><h2>Lệnh hoàn của đơn</h2>${notice('Trạng thái được đọc lại từ hệ thống. Chỉ trạng thái Tiền đã về hoặc Đã đối soát mới xác nhận tiền đã được chuyển.')}<div class="stack">${refunds.map(i=>`<article>${amount(i.amount_vnd,i.kind==='refund_fee'?'Hoàn phí':'Hoàn cọc về nguồn')}${line('Mã lệnh',i.code)}${line('Trạng thái',states[i.status]||'Đang theo dõi')}${line('Tài khoản nhận',bankName(c,i.target_bank_code)+' · '+accountName(c,i.target_account_masked))}</article>`).join('')}</div>${link('Xem toàn bộ tiền của đơn',`order/${orderId}/money`,true)}</section>`;
}
