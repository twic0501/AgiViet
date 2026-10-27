import { cases, virtualBank } from './test-pages.js';
import { escapeHtml as e, date } from '../shared/format.js';
import { heading, link, button, line, field, select, badge, empty, notice, label } from '../shared/ui.js';
import { upload } from '../shared/market.js';

export const navigation = [
  ['home', 'Tổng quan'], ['cases', 'Tạo tình huống thử'], ['virtual-bank', 'Ngân hàng ảo'], ['tasks', 'Hàng việc vận hành'], ['owners', 'Xác minh chủ tổ chức'],
  ['organizations', 'Tổ chức và người dùng'], ['orders', 'Đơn hàng và tra cứu'],
  ['disputes', 'Tranh chấp'], ['bank', 'Đối soát ngân hàng'], ['documents', 'Tài liệu PDF'],
];
export const staffNames = { dispatcher: 'Điều phối', field: 'Xác minh', finance: 'Tài chính', risk: 'Rủi ro', supervisor: 'Giám sát', support: 'Hỗ trợ', catalog: 'Danh mục', inspector: 'Kiểm định' };
const taskStates = { new: 'Mới', claimed: 'Đã nhận', working: 'Đang xử lý', waiting_customer: 'Chờ khách', overdue: 'Quá hạn', escalated: 'Chuyển cấp', done: 'Đã xong', cancelled: 'Đã hủy' };
const taskKinds = { V01: 'Xác minh người bán', V02: 'Xác minh tổ chức', V03: 'Giấy tờ lô', V04: 'Xác minh vườn', V05: 'Tài khoản nhận tiền', V06: 'Xác nhận tại vườn', V07: 'Xác nhận tại kho', V08: 'Lệch tiền trả thẳng', V09: 'Cọc lệch số' };
const uuidAttrs = 'pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" required';
const roles = c => c.user.staff_roles || [];
const hasRole = (c, allowed) => roles(c).some(r => allowed.includes(r));
const unavailable = (title, text) => empty(title + ' · chưa có', text);
const knownError = err => {
  if ([403, 404, 501].includes(err.status)) return notice(err.status === 403 ? 'Vai hiện tại chưa được cấp quyền đọc mục này.' : 'Chưa có dữ liệu hoặc chức năng này chưa sẵn sàng.');
  throw err;
};
export const activeTask = t => !['done', 'cancelled'].includes(t.status);
export function taskDue(t, now) {
  if (!activeTask(t)) return false;
  const due = t.status === 'new' ? t.response_due_at : t.resolution_due_at;
  return t.status === 'overdue' || (!!due && +new Date(due) <= +new Date(now));
}
const canWork = (c, t) => c.can('ops.task') && hasRole(c, [t.required_role, 'supervisor']);
const canClaim = (c, t) => canWork(c, t) && !t.assigned_to && ['new', 'overdue'].includes(t.status);
const canResolve = (c, t) => canWork(c, t) && t.assigned_to === c.user.user_id && activeTask(t);
async function tasks(c) {
  if (!c.can('ops.view')) return null;
  return c.api.get('/v1/ops/tasks');
}
function taskCard(c, t, detail = false) {
  const late = c.health?.gio && taskDue(t, c.health.gio);
  return `<article class="card ops-task">${badge(t.priority, late)} ${badge(taskStates[t.status] || 'Đang theo dõi', late)}<h2>${e(t.kind)} · ${e(taskKinds[t.kind] || t.trigger_reason || 'Việc vận hành')}</h2><p class="caption">${e(t.code)}</p><p>${e(t.trigger_reason)}</p>${line('Người phụ trách', t.assigned_name || 'Chưa nhận')}${line('Vai phụ trách', staffNames[t.required_role] || t.required_role)}${line('Hạn phản hồi', date(t.response_due_at, {time:true}))}${line('Hạn xử lý', date(t.resolution_due_at, {time:true}))}${line('Cập nhật kế tiếp', date(t.next_update_at, {time:true}))}${t.order_code ? line('Đơn liên quan', t.order_code) : ''}${detail ? `${line('Đối tượng', ({organization:'Tổ chức',user:'Người dùng',order:'Đơn hàng',lot:'Lô hàng',dispute:'Tranh chấp',bank_instruction:'Lệnh ngân hàng',payout_account:'Tài khoản nhận tiền',delivery:'Đợt giao'})[t.entity] || 'Hồ sơ liên quan')}${line('Mã đối tượng', t.entity_id)}${t.result_code ? line('Kết quả', t.result_code) : ''}` : ''}<div class="actions">${!detail ? link('Mở việc', 'tasks/' + t.id, true) : ''}${canClaim(c, t) ? button('Nhận việc', 'claim:' + t.id) : ''}</div>${detail && c.state.taskResolveUnavailable === t.id ? unavailable('Hoàn tất việc', 'Chức năng hoàn tất chưa nhận được kết quả xử lý. Việc vẫn chưa xong; giữ hồ sơ và chuyển hỗ trợ vận hành.') : detail && canResolve(c,t) ? `<form data-form="resolveTask">${field('Mã kết quả xử lý', 'result_code', 'text', '', 'required')}${field('Ghi chú xử lý', 'note', 'text', '', 'required')}<label class="check"><input type="checkbox" name="confirmed" required> Tôi đã kiểm tra hồ sơ và ghi đúng kết quả thực tế.</label><button>Hoàn tất việc</button></form>` : ''}</article>`;
}
async function home(c) {
  const list = await tasks(c);
  const active = list?.filter(activeTask);
  const due = c.health?.gio ? active?.filter(t => taskDue(t, c.health.gio)) : null;
  return heading('Tổng quan vận hành', roles(c).map(r => staffNames[r] || r).join(' · '), button('Làm mới', 'reload', true)) + `<div class="guide"><div class="mascot" data-mascot></div><p>Nhận đúng việc được giao. Kiểm tra chứng cứ trước khi duyệt; người lập và người duyệt phải độc lập.</p></div><div class="grid two"><section class="card"><h2>Hàng việc đang mở</h2>${list ? `<div class="amount">${active.length} việc</div>${line('Đã tới hạn', c.health?.gio ? due.length : 'Chưa đọc được giờ hệ thống')}${line('Mốc giờ hệ thống', date(c.health?.gio, {time:true}))}${link('Mở hàng việc', 'tasks', true)}` : notice('Vai hiện tại chưa có quyền xem hàng việc.')}</section><section class="card"><h2>Đơn theo trạng thái</h2>${unavailable('Thống kê toàn sàn', 'Chưa có chức năng đọc tổng số đơn theo trạng thái dành cho vận hành.')}</section></div><div class="section-title"><h2>Việc tới hạn</h2></div><div class="grid two">${due?.slice(0,8).map(t => taskCard(c,t)).join('') || empty('Chưa có việc tới hạn trong danh sách đọc được', 'Hạn được so với giờ hệ thống, không dùng giờ trên máy.')}</div>`;
}
async function taskPage(c, id) {
  const list = await tasks(c);
  if (!list) return heading('Hàng việc vận hành') + notice('Vai hiện tại chưa có quyền xem hàng việc.');
  for (const t of list) if (canClaim(c,t)) c.on['claim:' + t.id] = () => c.command(`/v1/ops/tasks/${t.id}/claim`);
  if (id) {
    const t = list.find(x => x.id === id);
    if (!t) return heading('Hàng việc vận hành') + empty('Không tìm thấy việc', 'Làm mới danh sách để kiểm tra.');
    c.forms.resolveTask = async f => {
      try {
        await c.command(`/v1/ops/tasks/${t.id}/resolve`, {result_code:f.get('result_code').trim(), note:f.get('note').trim()});
      } catch (err) {
        if (err.details?.db !== 'ck_command_payload') throw err;
        c.state.taskResolveUnavailable = t.id;
        c.flash('Chưa hoàn tất việc. Chức năng ghi kết quả hiện chưa sẵn sàng.');
      }
    };
    return heading('Xử lý việc ' + t.kind, t.code, link('Về hàng việc', 'tasks', true)) + taskCard(c,t,true);
  }
  c.forms.filterTasks = f => {c.state.taskFilter = Object.fromEntries(f);};
  const filter = c.state.taskFilter || {};
  const shown = list.filter(t => (!filter.status || t.status === filter.status) && (!filter.kind || t.kind === filter.kind) && (!filter.mine || t.assigned_to === c.user.user_id));
  return heading('Hàng việc vận hành', 'Ưu tiên P0–P3 và hạn phản hồi, xử lý', button('Làm mới', 'reload', true)) + `<form class="card ops-filters" data-form="filterTasks">${select('Trạng thái', 'status', [['','Tất cả'], ...Object.entries(taskStates)], filter.status)}${select('Loại việc', 'kind', [['','Tất cả'], ...[...new Set(list.map(t=>t.kind))].sort().map(k=>[k,k])], filter.kind)}${select('Người nhận','mine',[['','Tất cả'],['yes','Việc của tôi']],filter.mine)}<button>Lọc hàng việc</button></form><p class="caption">${shown.length} / ${list.length} việc</p><div class="grid two">${shown.map(t=>taskCard(c,t)).join('') || empty('Chưa có việc phù hợp','Đổi bộ lọc hoặc làm mới danh sách.')}</div>`;
}
async function owners(c) {
  if (!hasRole(c,['field','risk','supervisor','support'])) return heading('Xác minh chủ tổ chức') + notice('Cần vai xác minh, rủi ro, giám sát hoặc hỗ trợ.');
  let list;
  try { list = await c.api.get('/v1/ops/owner-verifications'); } catch(err) { return heading('Xác minh chủ tổ chức') + knownError(err); }
  c.forms.proposeOwner = async (f, form) => {
    const orgId = f.get('org').trim();
    let evidence = c.state.ownerEvidence;
    if (!evidence || evidence.orgId !== orgId || evidence.file !== form.elements.evidence.files[0]) {
      const r = await upload(c,form.elements.evidence.files[0],'organization',orgId);
      evidence = c.state.ownerEvidence = {orgId, file:form.elements.evidence.files[0], id:r.data.id};
    }
    await c.command(`/v1/ops/orgs/${orgId}/owner-verifications`, {evidence_document_id:evidence.id, reason:f.get('reason').trim(), ...(f.get('user') ? {user_id:f.get('user').trim()} : {})});
    delete c.state.ownerEvidence;
  };
  for (const v of list) if (v.org_status === 'pending' && !v.decision_id && v.proposed_by !== c.user.user_id && hasRole(c,['risk','supervisor'])) {
    c.forms['approveOwner:' + v.id] = () => c.command(`/v1/ops/owner-verifications/${v.id}/approve`);
  }
  return heading('Xác minh chủ tổ chức', 'Hai người độc lập · vai chủ có hiệu lực sau 24 giờ', button('Làm mới','reload',true)) + notice('Người lập tải chứng cứ và đề xuất. Người khác có vai rủi ro hoặc giám sát đọc hồ sơ rồi duyệt. Chưa có quyền mở chứng cứ tổ chức khác trong app này; cần kiểm hồ sơ qua kênh vận hành trước khi xác nhận.') + `<details class="card"><summary>Lập hồ sơ xác minh</summary><form data-form="proposeOwner">${field('Mã tổ chức', 'org', 'text', '', uuidAttrs)}${field('Mã người dùng (để trống dùng người đăng ký)', 'user')}${field('Chứng cứ tổ chức', 'evidence', 'file', '', 'accept="image/jpeg,image/png,image/webp,application/pdf" required')}${field('Lý do xác minh', 'reason', 'text', '', 'minlength="5" required')}<button>Tải chứng cứ và lập đề xuất</button></form></details><p class="caption">${list.length} hồ sơ gần nhất (tối đa 200)</p><div class="grid two">${list.map(v => `<article class="card"><h2>${e(v.org_name)}</h2>${badge(v.decision_id ? 'Đã có quyết định' : 'Chờ duyệt', !v.decision_id)}${line('Mã tổ chức',v.org_id)}${line('Mã người đăng ký',v.user_id)}${line('Người lập',v.proposed_by)}${line('Lập lúc',date(v.created_at,{time:true}))}${line('Lý do',v.reason)}${line('Mã chứng cứ',v.evidence_document_id)}${v.decision_id ? line('Quyết định',v.decision_id) : ''}${c.forms['approveOwner:' + v.id] ? `<form data-form="approveOwner:${e(v.id)}"><label class="check"><input type="checkbox" required> Tôi đã đọc chứng cứ và xác nhận đúng chủ tổ chức; tôi không phải người lập.</label><button>Duyệt và cấp vai chủ sau 24 giờ</button></form>` : v.proposed_by === c.user.user_id && !v.decision_id ? notice('Bạn là người lập. Cần một người khác duyệt hồ sơ này.') : ''}</article>`).join('') || empty('Chưa có đề xuất xác minh', 'Lập đề xuất khi đã có mã tổ chức và chứng cứ.')}</div>`;
}
async function organizations(c) {
  return heading('Tổ chức và người dùng') + unavailable('Danh sách toàn sàn', 'Chưa có chức năng tìm tổ chức, người dùng và thành viên toàn sàn dành cho vận hành.') + `<section class="card"><h2>Tài khoản đang đăng nhập</h2>${line('Họ tên',c.user.name)}${line('Số điện thoại',c.user.phone_masked)}${line('Tổ chức',c.user.org.name)}${line('Mã tổ chức',c.user.org.id)}${line('Vai vận hành',roles(c).map(r=>staffNames[r]||r).join(', '))}${link('Mở xác minh chủ tổ chức','owners',true)}</section>`;
}
async function orders(c) {
  const list = await tasks(c);
  const refs = [...new Map((list || []).filter(t=>t.order_id).map(t=>[t.order_id,t])).values()];
  c.forms.findOrder = f => { c.state.orderQuery = f.get('query').trim().toLowerCase(); };
  const query = c.state.orderQuery || '';
  const shown = refs.filter(t=>(t.order_code + ' ' + t.order_id).toLowerCase().includes(query));
  return heading('Đơn hàng và tra cứu') + unavailable('Sổ đơn toàn sàn', 'Chưa có chức năng đọc chi tiết đơn dành cho vận hành. Danh sách bên dưới chỉ là tham chiếu từ hàng việc, không phải toàn bộ đơn.') + `<form class="card" data-form="findOrder">${field('Tìm mã đơn trong hàng việc', 'query', 'search', query)}<button>Tra cứu</button></form><div class="grid two">${shown.map(t=>`<article class="card"><h2>${e(t.order_code || 'Đơn liên quan')}</h2>${line('Mã hồ sơ',t.order_id)}${link('Mở việc liên quan','tasks/'+t.id,true)}</article>`).join('') || empty('Chưa tìm thấy tham chiếu','Thử mã khác hoặc mở hàng việc.')}</div>`;
}
async function disputes(c) {
  const list = await tasks(c);
  const refs = (list || []).filter(t=>t.entity === 'dispute');
  return heading('Tranh chấp') + unavailable('Hồ sơ tranh chấp toàn sàn', 'Chưa có danh sách, chi tiết, chứng cứ và quyết định tranh chấp dành cho vận hành.') + `<div class="grid two">${refs.map(t=>taskCard(c,t)).join('') || empty('Chưa có việc gắn trực tiếp tranh chấp', 'Đây chỉ là tham chiếu từ hàng việc đọc được.')}</div>`;
}
async function bank(c) {
  const list = await tasks(c);
  const refs = (list || []).filter(t=>t.entity === 'bank_instruction' && activeTask(t));
  c.forms.reconcile = () => c.command('/v1/ops/reconcile');
  for (const t of refs) if(hasRole(c,['finance','risk'])) c.forms['callback:' + t.entity_id] = f => c.command(`/v1/ops/instructions/${t.entity_id}/callback`,{duration_seconds:Number(f.get('duration')),summary:f.get('summary').trim()});
  return heading('Đối soát ngân hàng') + unavailable('Sao kê và sổ lệnh chi', 'Chưa có chức năng đọc toàn bộ lệnh, số tiền, trạng thái và tài khoản nhận cho vận hành. Không xác nhận tiền đã về từ ghi chú cuộc gọi.') + `${c.can('ops.reconcile') ? `<form class="card" data-form="reconcile"><h2>Đối soát với ngân hàng</h2><p>Đọc kết quả ngân hàng cho các lệnh đủ điều kiện. Chỉ chuyển trạng thái sau khi có kết quả từ máy chủ.</p><label class="check"><input type="checkbox" required> Tôi xác nhận thực hiện đối soát ngân hàng.</label><button>Đối soát ngay</button></form>` : notice('Vai hiện tại chưa có quyền đối soát ngân hàng.')}<div class="section-title"><h2>Việc liên quan lệnh ngân hàng</h2></div><div class="grid two">${refs.map(t=>`<section class="card"><h2>${e(t.code)}</h2><p>${e(t.trigger_reason)}</p>${line('Mã lệnh',t.entity_id)}${line('Đơn',t.order_code)}${link('Mở việc','tasks/'+t.id,true)}${c.forms['callback:'+t.entity_id] ? `<details><summary>Ghi nhận cuộc gọi xác minh trước chi</summary><p>Chỉ gửi sau khi gọi chủ tài khoản qua số đã xác minh. Máy chủ kiểm tra lệnh còn chờ gọi lại trước khi gửi ngân hàng.</p><form data-form="callback:${e(t.entity_id)}">${field('Thời lượng thực tế (giây)','duration','number','','min="1" step="1" required')}${field('Tóm tắt cuộc gọi','summary','text','','required')}<label class="check"><input type="checkbox" required> Tôi đã gọi đúng chủ tài khoản và kiểm chứng thông tin.</label><button>Xác nhận cuộc gọi và gửi lệnh</button></form></details>` : ''}</section>`).join('') || empty('Chưa có việc liên quan lệnh đang mở', 'Chưa có danh sách chuyên biệt để xác định đầy đủ các lệnh chờ gọi lại.')}</div>`;
}
async function documents(c) {
  c.forms.verifyDocument = async f => { c.state.documentMetadata = await c.api.get('/v1/verify/' + encodeURIComponent(f.get('code').trim())); };
  c.forms.openDocument = async f => {
    const id=f.get('id').trim();
    c.state.document = await c.api.get('/v1/documents/' + encodeURIComponent(id));
  };
  const d = c.state.documentMetadata, doc = c.state.document;
  return heading('Tài liệu PDF') + unavailable('Kho tài liệu toàn sàn', 'Chưa có danh sách PDF và quyền đọc hồ sơ tổ chức khác dành cho vận hành. Chỉ mở tài liệu khi máy chủ cho phép.') + `<div class="grid two"><section class="card"><h2>Xác minh theo mã tài liệu</h2><form data-form="verifyDocument">${field('Mã tài liệu','code','text',d?.code||'','required')}<button>Kiểm tra thông tin</button></form>${d ? `${line('Mã',d.code)}${line('Phiên bản',d.version_no)}${line('Trạng thái',label(d.status))}${line('Tạo lúc',date(d.created_at,{time:true}))}${line('Mã băm nội dung',d.content_sha256)}${line('Mã băm tệp',d.file_sha256)}${(d.signatures||[]).map(s=>line(s.party === 'buyer' ? 'Bên mua ký' : 'Bên bán ký',date(s.signed_at,{time:true}))).join('')}` : ''}</section><section class="card"><h2>Mở tài liệu có quyền đọc</h2><form data-form="openDocument">${field('Mã hồ sơ tài liệu','id','text',doc?.id||'',uuidAttrs)}<button>Tra cứu tài liệu</button></form>${doc ? `${line('Mã tài liệu',doc.code)}${line('Phiên bản',doc.version_no)}${button('Xem và tải PDF','pdf:'+doc.id,true)}` : ''}</section></div><div data-pdf-host></div>`;
}
export async function route(c, view, id) {
  if (!c.user.is_staff || !roles(c).length) return heading('Quản trị') + notice('Tài khoản này chưa có vai vận hành. Đăng xuất và dùng tài khoản được cấp quyền.');
  try {
    switch(view) {
      case 'home': return await home(c);
      case 'cases': return await cases(c);
      case 'virtual-bank': return await virtualBank(c);
      case 'tasks': return await taskPage(c,id);
      case 'owners': return await owners(c);
      case 'organizations': return await organizations(c);
      case 'orders': return await orders(c);
      case 'disputes': return await disputes(c);
      case 'bank': return await bank(c);
      case 'documents': return await documents(c);
      default: return heading('Không tìm thấy màn') + link('Về tổng quan','home');
    }
  } catch(err) { return heading(navigation.find(([v])=>v===view)?.[1] || 'Quản trị') + knownError(err); }
}
