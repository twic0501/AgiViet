import { escapeHtml as e } from './format.js';
import { heading, field, select, notice, link, fraud } from './ui.js';
export async function enrollment(c, kind, token) {
  const invitation=kind==='invitation';
  const receiptKey='agv-registration-'+c.side;
  if(!invitation&&!c.state.registration) c.state.registration=JSON.parse(sessionStorage.getItem(receiptKey)||'null');
  c.on.newRegistration=()=>{sessionStorage.removeItem(receiptKey);delete c.state.registration;delete c.state.enroll;};
  c.forms.enrollPhone=async f=>{c.state.enroll={phone:f.get('phone'),...(await c.api.post('/v1/auth/otp/send',{phone:f.get('phone')}))};};
  c.forms.enroll=async f=>{
    const {phone,challenge_id}=c.state.enroll;
    const body={phone,challenge_id,code:f.get('code')};
    const r=invitation?await c.api.post('/v1/invitations/accept',{...body,token}):await c.api.post('/v1/auth/register',{...body,name:f.get('name'),org:{side:c.seller?'sell':'buy',kind:'enterprise',display_name:f.get('org'),tax_code:f.get('tax')||undefined,province_code:f.get('province')||undefined}});
    if (!r.token) {
      // Đăng ký mới chỉ trả biên nhận; người dùng đăng nhập lại bằng OTP mới.
      c.state.registration = {phone, orgId:r.org_id};
      sessionStorage.setItem(receiptKey,JSON.stringify(c.state.registration));
      return;
    }
    c.api.token=r.token;
    const user=await c.api.get('/v1/auth/session');
    await c.setSession({token:r.token,user});
    c.flash(invitation?'Đã nhận lời mời. Chỉ các vai đã hiệu lực được thao tác.':'Đã đăng ký, đang chờ xác minh và cấp vai chủ. Chưa thể đăng lô hoặc ký.');
    c.go('home');
  };
  if (c.state.registration) return heading('Đã đăng ký · chờ xác minh','Tổ chức của bạn đã được ghi nhận.')+`<section class="card form">${notice('Nhân viên lập hồ sơ xác minh, một người khác duyệt cấp vai chủ. Vai chủ chỉ có hiệu lực sau 24 giờ kể từ khi duyệt. Chưa thể đăng lô hoặc ký hợp đồng.')}<p>Đăng nhập bằng số ${e(c.state.registration.phone)} và mã OTP mới để theo dõi tổ chức. Mỗi lần gửi mã cần cách nhau ít nhất 60 giây.</p>${link('Đăng nhập để theo dõi','home')}<button class="quiet" data-action="newRegistration">Đăng ký số khác</button></section>`;
  return heading(invitation?'Nhận lời mời thành viên':'Đăng ký doanh nghiệp',invitation?'Dùng đúng số điện thoại được mời.':'Tổ chức mới cần xác minh và cấp quyền trước khi giao dịch.')+`<section class="card form">${!c.state.enroll?`<form data-form="enrollPhone">${field('Số điện thoại của bạn','phone','tel','','pattern="0[0-9]{9}" required')}<button>Nhận mã xác nhận</button></form>`:`${notice(fraud)}<p>Mã gửi tới ${e(c.state.enroll.phone)}.</p><form data-form="enroll">${!invitation?`${field('Họ tên','name','text','','required')}${field('Tên doanh nghiệp','org','text','','required')}<p class="caption">Loại tổ chức: Doanh nghiệp</p>${field('Mã số thuế','tax','text','',c.seller?'':'required')}${select('Tỉnh / thành','province',[['','Bổ sung sau'],['DT','Đồng Tháp'],['CT','Cần Thơ'],['TN','Tây Ninh'],['VL','Vĩnh Long'],['AG','An Giang'],['HCM','TP. Hồ Chí Minh']])}`:''}${field('Mã OTP xác nhận','code','text','','pattern="[0-9]{6}" required')}<button>${invitation?'Nhận lời mời':'Đăng ký và chờ xác minh'}</button></form>`}${link('Về đăng nhập','home',true)}</section>`;
}
