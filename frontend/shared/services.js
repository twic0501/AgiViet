import { bankName, accountName } from "./virtual-money.js";
import { money, date, escapeHtml as e } from './format.js';
import { heading, line, field, select, button, link, amount, notice, badge, label, fraud } from './ui.js';
export const roles = [['owner','Quản lý / chủ'],['purchaser','Mua hàng'],['accountant','Kế toán'],['warehouse','Kho'],['site_receiver','Người nhận'],['coop_board','Ban điều hành HTX'],['collection_staff','Thu gom'],['coop_member','Thành viên HTX']];
export const isOwner = c => !c.user.helper_of && c.user.roles.some(r => ['owner','coop_board'].includes(r));
const roleText = r => roles.find(x => x[0] === r)?.[1] || 'Thành viên';
// App bán chỉ mời vai phía bán; app mua chỉ mời vai phía mua.
const VAI_BAN = ['owner','helper','coop_board','collection_staff','coop_member'];
const checks = (name, chosen=[]) => roles.filter(([v]) => document.body.dataset.app !== 'ban' || VAI_BAN.includes(v)).map(([v,t]) => `<label class="check"><input type="checkbox" name="${name}" value="${v}" ${chosen.includes(v)?'checked':''}>${t}</label>`).join('');
export async function organization(c) {
  const members = await c.api.get('/v1/org/members');
  const owner = isOwner(c);
  c.forms.invite = async f => {
    if (!f.getAll('roles').length) throw new Error('Chọn ít nhất một vai.');
    const r = await c.command('/v1/org/members/invitations', {phone:f.get('phone'), name:f.get('name'), roles:f.getAll('roles'), approval_limit_vnd:f.get('limit') || undefined});
    c.state.invitation = r.data;
  };
  for (const m of members) c.forms['roles-'+m.membership_id] = f => {
    const old = m.role_grants.map(x=>x.role), next = f.getAll('roles');
    return c.command(`/v1/org/members/${m.membership_id}/roles`, {add:next.filter(x=>!old.includes(x)),remove:old.filter(x=>!next.includes(x)),approval_limit_vnd:f.get('limit') || null});
  };
  const inv = c.state.invitation;
  const url = inv ? `${location.origin}/${c.app}/#/invitation/${inv.invitation_token}` : '';
  return heading('Tổ chức và thành viên',c.user.org.name) + `<section class="card">${line('Người đang dùng',c.user.name)}${line('Vai',c.user.roles.map(roleText).join(', '))}${amount(c.user.approval_limit_vnd,'Hạn mức của bạn')}<div class="actions">${link('Tài khoản nhận tiền','payout',true)}${link('Hỗ trợ','support',true)}${link('Thông báo','notifications',true)}</div>${c.user.orgs?.length>1?`<form data-form="switchOrg">${select('Tổ chức','org',c.user.orgs.map(o=>[o.org_code||o.code,o.org_name||o.name||o.org_code]))}<button>Chọn tổ chức</button></form>`:''}</section>` + notice('Vai mua hàng, kế toán, chủ và ban điều hành mới được cấp có thời gian chờ 24 giờ. Chỉ vai đã hiệu lực mới có quyền thao tác.') + `<div class="grid two">${members.map(m=>`<section class="card"><h2>${e(m.name)}</h2>${badge(m.status==='invited'?'Đã mời · chờ nhận':'Đang tham gia')}${line('Liên hệ',m.phone_masked)}${line('Vai hiệu lực',m.roles_effective.map(roleText).join(', ')||'Chưa có vai hiệu lực')}${m.role_grants.filter(g=>!m.roles_effective.includes(g.role)).map(g=>line('Vai đang chờ',roleText(g.role)+' · '+date(g.effective_at,{time:true}))).join('')}${m.approval_limit_vnd!=null?amount(m.approval_limit_vnd,'Hạn mức duyệt'):''}${owner?`<details class="rule"><summary>Đổi vai và hạn mức</summary><form data-form="roles-${m.membership_id}">${checks('roles',m.role_grants.map(x=>x.role))}${field('Hạn mức duyệt (đ)','limit','number',m.approval_limit_vnd||'','min="0"')}<button>Lưu quyền thành viên</button></form></details>`:''}</section>`).join('')}</div>${owner?`<section class="card form"><h2>Mời thành viên</h2><form data-form="invite">${field('Tên người được mời','name','text','','required')}${field('Số điện thoại người được mời','phone','tel','','pattern="0[0-9]{9}" required')}<fieldset><legend>Vai được mời</legend>${checks('roles')}</fieldset>${field('Hạn mức duyệt (đ)','limit','number','','min="0"')}<button>Tạo lời mời</button></form>${inv?`<h3>Lời mời đã tạo</h3><canvas class="qr" data-qr="${e(url)}"></canvas><a data-invitation-link href="${e(url)}">Mở liên kết nhận lời mời</a>${line('Hết hạn',date(inv.expires_at,{time:true}))}${notice('Gửi liên kết cho đúng người có số điện thoại được mời. Họ tự nhập OTP để tham gia.')}`:''}</section>`:''}`;
}
export async function plans(c) {
  const [plans, sub] = await Promise.all([c.api.get('/v1/plans'),c.api.get('/v1/org/subscription')]);
  c.forms.subscription = async f => {
    await c.command('/v1/org/subscription',{plan_code:f.get('plan')});
    c.flash('Đã ghi nhận yêu cầu đổi gói. Xem gói hiện hành bên dưới. Chưa thu tiền thật.');
  };
  return heading('Gói dịch vụ',sub?`Đang dùng ${sub.label_vi} · ${sub.so_thanh_vien}/${sub.max_members} thành viên`:'Chưa đăng ký gói')+notice('Bảng giá thử, chưa chốt giá bán. Chưa có thu phí gói qua cổng thanh toán. Phí đơn đã ký giữ theo hợp đồng.')+`<div class="grid two">${plans.map(g=>`<section class="card"><h2>${e(g.label_vi)}</h2>${amount(g.monthly_price_vnd,'Mỗi tháng · giá thử')}${line('Số thành viên tối đa',g.max_members)}${line('Phí đơn đầu',g.first_order_fee_bps/100+'%')}${line('Phí mua lại',g.repeat_fee_bps/100+'%')}${line('Sàn / trần phí',money(g.fee_floor_vnd)+' / '+money(g.fee_cap_vnd))}${isOwner(c)&&sub?.plan_code!==g.code?`<form data-form="subscription"><input type="hidden" name="plan" value="${e(g.code)}"><label class="check"><input type="checkbox" required>Tôi đã xem giá và hạn mức gói.</label><button>Chuyển sang ${e(g.label_vi)}</button></form>`:''}</section>`).join('')}</div>`;
}
export async function ledger(c) {
  c.forms.period = f => { c.state.period={from:f.get('from'),to:f.get('to')}; };
  const p = c.state.period || {}, params = new URLSearchParams();
  if(p.from) params.set('from',p.from+'T00:00:00+07:00');
  if(p.to) params.set('to',p.to+'T23:59:59+07:00');
  const m=await c.api.get('/v1/money/summary?'+params);
  const names={coc_dang_giu:'Cọc ngân hàng đang giữ',tien_treo:'Tiền đang chờ xử lý',da_nhan_truc_tiep:'Đã nhận trực tiếp',da_tra_truc_tiep_duoc_xac_nhan:'Đã trả · người nhận xác nhận',ngan_hang_da_chuyen_den:'Ngân hàng đã chuyển đến',con_phai_nhan:'Còn phải nhận',con_phai_tra:'Còn phải trả',phi_da_thu_chua_chot:'Phí đã thu · chưa chốt'};
  return heading(c.seller?'Sổ tiền hàng':'Tiền và công nợ','Khoản đã xác nhận theo kỳ; số dư và công nợ tại thời điểm xem.')+`<form data-form="period" class="card source-filter">${field('Từ ngày','from','date',p.from||'')}${field('Đến ngày','to','date',p.to||'')}<button>Xem sổ theo kỳ</button></form>`+notice(m.ghi_chu)+`<div class="grid two">${Object.entries(names).map(([k,v])=>`<section class="card">${amount(m.tong[k],v)}</section>`).join('')}</div><h2>Theo hợp đồng</h2><div class="grid two">${m.theo_don.map(o=>`<section class="card"><h3>${e(o.code)}</h3>${amount(o.coc_dang_giu_vnd,'Cọc đang giữ')}${line('Phí',money(o.phi_vnd)+' · '+({chua_thu:'Chưa thu',khong_hoan:'Không hoàn',theo_bang_hoan:'Theo bảng hoàn',da_thu_cho_ket_qua:'Đã thu · chờ kết quả'}[o.phi_trang_thai]||'Đang theo dõi'))}${link('Xem tiền của đơn',`order/${o.id}/money`,true)}</section>`).join('')}</div>`;
}
export async function support(c) {
  const tickets = await c.api.get('/v1/support');
  c.forms.supportTicket = async f => { const r=await c.command('/v1/support',{message:f.get('message'),error_code:c.error?.code,request_id:c.error?.requestId}); c.flash(r.data.cau); };
  return heading('Hỗ trợ','Theo dõi người phụ trách và cập nhật của từng yêu cầu.')+`<form data-form="supportTicket" class="card form"><label>Nội dung cần hỗ trợ<textarea name="message" required>${e(c.error?.message||'')}</textarea></label>${c.error?.requestId?line('Mã hỗ trợ kèm theo',c.error.requestId):''}<button>Gửi yêu cầu hỗ trợ</button></form><div class="stack">${tickets.map(t=>`<section class="card"><h2>${e(t.code)}</h2>${line('Nội dung',t.trigger_reason)}${line('Người phụ trách',t.nguoi_phu_trach||'Chưa có người nhận việc')}${line('Hạn phản hồi',date(t.response_due_at,{time:true}))}${line('Cập nhật tiếp',date(t.next_update_at,{time:true}))}</section>`).join('')||notice('Chưa có yêu cầu hỗ trợ.')}</div>`;
}
export async function notifications(c) {
  const ns=await c.api.get('/v1/notifications');
  return heading('Thông báo','Cập nhật được gửi tới tổ chức của bạn.',button('Tải lại','reload',true))+`<div class="stack">${ns.map(n=>`<section class="card"><h2>${e(eventName(n.event_type))}</h2><p>${e('Tổ chức có cập nhật mới. Mở hồ sơ để xem trạng thái hiện hành.')}</p>${line('Lúc',date(n.occurred_at,{time:true}))}${n.order_id?link('Mở hợp đồng',`order/${n.order_id}`,true):''}</section>`).join('')||notice('Chưa có thông báo được gửi tới tổ chức.')}</div>`;
}
export async function payout(c) {
  const list=await c.api.get('/v1/payout-accounts');
  c.forms.payoutPrepare=async f=>{c.state.payout={bank_code:c.health?.moi_truong==='thu'?'AGV_VIRTUAL':f.get('bank'),account_no:f.get('account'),holder_name:f.get('holder'),...(await c.api.post('/v1/auth/otp/send',{phone:f.get('phone')}))};};
  c.forms.payoutConfirm=async f=>{const {bank_code,account_no,holder_name,challenge_id}=c.state.payout; await c.command('/v1/payout-accounts',{bank_code,account_no,holder_name,challenge_id,code:f.get('code')}); delete c.state.payout;};
  for(const a of list) {
    c.on['activate-'+a.id]=()=>c.command(`/v1/payout-accounts/${a.id}/activate`);
    c.forms['lock-'+a.id]=()=>c.command(`/v1/payout-accounts/${a.id}/not-me`);
  }
  const names={active:'Đang dùng',cooling_down:'Đang chờ 24 giờ',pending_verification:'Chờ xác minh',replaced:'Đã thay',locked:'Đã khóa'};
  return heading('Tài khoản nhận tiền','Hợp đồng đã ký giữ tài khoản của phiên bản hợp đồng.')+`<div class="stack">${list.map(a=>`<section class="card"><h2>${e(bankName(c,a.bank_code))} · ${e(accountName(c,a.account_masked))}</h2>${line('Chủ tài khoản',a.holder_name)}${badge(names[a.status]||'Đang kiểm tra')}${a.cooldown_until?line('Chờ đến',date(a.cooldown_until,{time:true})):''}${isOwner(c)&&a.status==='cooling_down'?button('Kích hoạt sau thời gian chờ','activate-'+a.id,true):''}${isOwner(c)&&['active','cooling_down'].includes(a.status)?`<details class="rule"><summary>Không phải tôi yêu cầu</summary><form data-form="lock-${a.id}"><p>Tài khoản này sẽ bị khóa ngay để xử lý.</p><label class="check"><input type="checkbox" required>Tôi xác nhận cần khóa tài khoản này.</label><button>Khóa và báo AgiViet</button></form></details>`:''}</section>`).join('')}</div>${isOwner(c)?`<section class="card form"><h2>Đổi tài khoản nhận tiền</h2>${notice(fraud)}${c.state.payout?`<form data-form="payoutConfirm">${line('Tài khoản sẽ đổi',bankName(c,c.state.payout.bank_code)+' · '+accountName(c,c.state.payout.account_no))}${field('Mã OTP của chủ tài khoản','code','text','','pattern="[0-9]{6}" required')}<button>Xác nhận yêu cầu đổi</button></form>`:`<form data-form="payoutPrepare">${field('Ngân hàng','bank','text',c.health?.moi_truong==='thu'?'Ngân hàng ảo AgiViet':'',c.health?.moi_truong==='thu'?'readonly':'required')}${field('Số tài khoản mới','account','text','','required')}${field('Tên chủ tài khoản','holder','text','','required')}${field('Số điện thoại chủ tài khoản','phone','tel','','pattern="0[0-9]{9}" required')}<button>Nhận mã xác nhận đổi tài khoản</button></form>`}</section>`:''}`;
}

function eventName(type) { return ({'don.ben_mua_ky':'Bên mua đã ký hợp đồng','don.ben_ban_ky':'Người bán đã ký hợp đồng','don.coc_da_nhan':'Ngân hàng xác nhận cọc','thanh_vien.moi':'Có lời mời thành viên','thanh_vien.nhan':'Thành viên đã tham gia','don.phu_luc_hieu_luc':'Phụ lục đã có hiệu lực','huy.xin':'Có đề nghị hủy','dot.phan_doi_dong':'Có phản đối nghiệm thu'}[type] || 'Cập nhật giao dịch'); }
