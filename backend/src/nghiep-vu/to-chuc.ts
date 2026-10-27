import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Tổ chức, thành viên, tài khoản nhận tiền (12 A7 nhóm Tổ chức / Tài khoản tiền; 06 QR-09; TH-001, 002, 023).
// Giới hạn DB hiện tại: vai đặc quyền (owner, purchaser, accountant, coop_board) chỉ cấp được bởi CHỦ hiện hành của tổ chức
// và hiệu lực sau 24 giờ; tổ chức mới đăng ký chưa có chủ nên KHÔNG tự cấp được vai owner (đề xuất CSDL #9).
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { loi } from '../loi.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, maMoi, phat } from './chung.ts';
import { taoViec } from './tien.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';

const VAI_HOP_LE = new Set(['owner', 'purchaser', 'accountant', 'warehouse', 'site_receiver', 'coop_board', 'collection_staff', 'coop_member']);
const che = (sdt: string) => sdt.slice(0, 4) + '***' + sdt.slice(-3);

function laChuToChuc(nd: NguoiDung) {
  return !nd.thanhVien.nguoiGiup && nd.thanhVien.vai.some((v) => v === 'owner' || v === 'coop_board');
}

async function datVai(t: GiaoDich, actor: string, userId?: string | null, orgId?: string | null) {
  await t.q(`SELECT set_config('app.actor_kind',$1,true), set_config('app.user_id',$2,true), set_config('app.org_id',$3,true)`, [actor, userId ?? '', orgId ?? '']);
}


export interface DangKy {
  challenge_id: string; phone: string; code: string; name: string;
  org: { side: 'sell' | 'buy' | 'both'; kind: 'household' | 'cooperative' | 'coop_group' | 'enterprise' | 'trader'; display_name: string; tax_code?: string; province_code?: string; segment_code?: string; plan_code?: string };
}

/** Đăng ký tài khoản + tổ chức (chờ xác minh). Bên mua cần MST; gói mặc định Miễn phí. */
export async function dangKy(ht:HeThong,d:DangKy){
 if(!/^0\d{9}$/.test(d.phone)||!d.name||!d.org?.display_name)throw loi('DU_LIEU_KHONG_HOP_LE');
 if(d.org.side!=='sell'&&!d.org.tax_code)throw loi('DU_LIEU_KHONG_HOP_LE','Bên mua cần mã số thuế.');
 ht.phien.kiemOtpDangNhap(d.challenge_id,d.code,d.phone);
 // 0049: auth worker ghi receipt sau OTP thật (record_registration), điều phối hệ thống lập user/tổ chức (register_organization),
 // việc V01 xác minh qua create_task. Không ghi bảng trực tiếp.
 const { createHash, randomBytes: rb } = await import('node:crypto');
 const { systemCmd } = await import('../db/command.ts');
 const hex = (b: Buffer) => '\\x' + b.toString('hex');
 const ban = d.org.side === 'sell' || d.org.side === 'both'; const mua = d.org.side === 'buy' || d.org.side === 'both';
 const payload = {
  name: d.name.trim(),
  organization: { code: `TC-N${rb(4).toString('hex').toUpperCase()}`, kind: d.org.kind, display_name: d.org.display_name.trim(), legal_name: null,
   tax_code: d.org.tax_code ?? null, province_code: d.org.province_code ?? null, commune_code: null, can_buy: mua, can_sell: ban, segment_code: mua ? (d.org.segment_code ?? 'wholesaler') : null },
  contact: { phone_enc: hex(Buffer.from('TEST-PLAINTEXT:' + d.phone)), phone_hash: hex(createHash('sha256').update(d.phone).digest()), phone_masked: d.phone.slice(0, 4) + '***' + d.phone.slice(-3), key_id: 'TEST-NOT-ENCRYPTED' },
 };
 return ht.db.tx({ actor: 'system', lenh: 'dang_ky' }, async (t) => {
  if (await t.mot(`SELECT 1 FROM pii.user_contacts WHERE phone_hash=digest($1,'sha256')`, [d.phone])) throw loi('DU_LIEU_KHONG_HOP_LE', 'Số này đã đăng ký: đăng nhập hoặc nhận lời mời.');
  const receipt = await t.voiVai('agiviet_auth_worker', () => t.gtri<string>(`SELECT cmd.record_registration($1::jsonb,$2)`, [payload, `otp:${d.challenge_id}`]));
  const kq = await systemCmd<any>(t, 'register_organization', [receipt]);
  await systemCmd(t, 'create_task', ['V01', 2, 'organization', kq.org_id, null, 'field', `verify:${kq.org_id}`, 'Xác minh tổ chức mới đăng ký']);
  return { user_id: kq.user_id, org_id: kq.org_id, org_status: kq.status, thong_bao: 'Đã đăng ký. Nhân viên xác minh rồi cấp vai chủ (hai người duyệt, hiệu lực sau 24 giờ).' };
 });
}

/** Vận hành xác minh tổ chức: pending → active. */
export async function xacMinhToChuc(t:GiaoDich,nd:NguoiDung,orgId:string,b:{verification_level?:number;note?:string}){
 if(!nd.vaiVanHanh.some(v=>['field','risk','supervisor'].includes(v)))throw loi('KHONG_CO_QUYEN');
 throw loi('CHUA_HO_TRO','DB chưa có command xác minh tổ chức tổng quát. Cấp chủ đầu tiên qua xác minh hai người.');
}

/** Bước 1 chủ đầu tiên: nhân viên lập đề xuất xác minh, dưới login riêng của chính nhân viên (cmd.propose_owner_verification). */
export async function deXuatChuDauTien(t: GiaoDich, nd: NguoiDung, orgId: string, b: { user_id?: string; evidence_document_id?: string; reason?: string }) {
  if (!nd.vaiVanHanh.some((v) => ['field', 'risk', 'supervisor', 'support'].includes(v))) throw loi('KHONG_CO_QUYEN');
  if (!b?.evidence_document_id || !b?.reason || String(b.reason).trim().length < 5) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần evidence_document_id (chứng cứ entity=organization) và reason.');
  // Mặc định: người đã đăng ký tổ chức (thành viên active duy nhất chưa có vai).
  const userId = b.user_id ?? await t.gtri<string>(`SELECT user_id FROM core.memberships WHERE org_id=$1 AND status='active' ORDER BY created_at LIMIT 1`, [orgId]);
  if (!userId) throw loi('KHONG_TIM_THAY', 'Tổ chức chưa có thành viên.');
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, 'ops');
  const id = await t.voiDangNhap(login, () => t.gtri<string>(`SELECT cmd.propose_owner_verification($1,$2,$3,$4)`, [orgId, userId, b.evidence_document_id, b.reason]));
  await phat(t, 'organization', orgId, 'to_chuc.de_xuat_chu', { verification_id: id });
  return { id, status: 'proposed', org_id: orgId, user_id: userId };
}

/** Bước 2+3: người duyệt (khác người lập) duyệt và cấp vai chủ trong cùng giao dịch; vai hiệu lực sau 24 giờ. */
export async function duyetChuDauTien(t: GiaoDich, nd: NguoiDung, verificationId: string) {
  if (!nd.vaiVanHanh.some((v) => ['risk', 'supervisor'].includes(v))) throw loi('KHONG_CO_QUYEN', 'Chỉ risk/supervisor duyệt.');
  const v = await t.mot<any>(`SELECT org_id, user_id FROM ops.owner_verifications WHERE id=$1`, [verificationId]);
  if (!v) throw loi('KHONG_TIM_THAY');
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, 'ops');
  const kq = await t.voiDangNhap(login, async () => {
    const decision = await t.gtri<string>(`SELECT cmd.approve_owner_verification($1)`, [verificationId]);
    const grant = await t.gtri<string>(`SELECT cmd.bootstrap_owner($1,$2,$3)`, [v.org_id, v.user_id, decision]);
    return { decision, grant };
  });
  const g = await t.mot<any>(`SELECT effective_at FROM core.membership_role_grants WHERE id=$1`, [kq.grant]);
  await phat(t, 'organization', v.org_id, 'to_chuc.cap_chu', { decision_id: kq.decision, grant_id: kq.grant });
  return { id: v.org_id, status: 'active', decision_id: kq.decision, owner_grant_id: kq.grant, owner_effective_at: g?.effective_at ?? null, user_id: v.user_id };
}

export async function danhSachXacMinhChu(t: GiaoDich, nd: NguoiDung) {
  if (!nd.vaiVanHanh.some((v) => ['field', 'risk', 'supervisor', 'support'].includes(v))) throw loi('KHONG_CO_QUYEN');
  return t.q(`SELECT v.id, v.org_id, o.display_name org_name, o.status org_status, v.user_id, v.proposed_by, v.evidence_document_id, v.reason, v.created_at,
      (SELECT d.id FROM ops.decisions d WHERE d.kind='owner_bootstrap' AND d.detail->>'verification_id'=v.id::text LIMIT 1) decision_id
    FROM ops.owner_verifications v JOIN core.organizations o ON o.id=v.org_id ORDER BY v.created_at DESC LIMIT 200`);
}

/** Mời thành viên (QR-09): gắn số điện thoại người được mời; vai đặc quyền hiệu lực sau 24 giờ (DB). Kiểm số thành viên theo gói. */
export async function moiThanhVien(ht:HeThong,t:GiaoDich,nd:NguoiDung,b:{phone:string;name:string;roles:string[];approval_limit_vnd?:unknown}){
 if(!laChuToChuc(nd))throw loi('KHONG_CO_QUYEN');if(!/^0\d{9}$/.test(b.phone)||!b.name||!Array.isArray(b.roles)||!b.roles.length||b.roles.some(r=>!VAI_HOP_LE.has(r)))throw loi('DU_LIEU_KHONG_HOP_LE');
 const side=nd.thanhVien.canSell?'seller':'buyer';
 const uid=await appCmd<string>(t,nd,side,'create_invitee',[b.name,Buffer.from('TEST-PLAINTEXT:'+b.phone),createHash('sha256').update(b.phone).digest(),che(b.phone),'TEST-NOT-ENCRYPTED']);
 const r=await appCmd<any>(t,nd,side,'invite_member',[uid,b.roles,b.approval_limit_vnd==null?null:String(b.approval_limit_vnd)]);
 const q=await t.mot<any>(`SELECT expires_at FROM core.qr_tokens WHERE id=$1`,[r.invitation_id]);
 const roles=await t.q(`SELECT role_code,effective_at FROM core.membership_role_grants WHERE membership_id=$1`,[r.membership_id]);
 return {id:r.membership_id,status:'invited',invitation_token:r.token,invitation_id:r.invitation_id,expires_at:new Date(q.expires_at).toISOString(),roles};
}

/** Người được mời nhận lời mời: OTP đúng số được mời (N-12), quét QR một lần, thành viên active. Không cần phiên. */
export async function nhanLoiMoi(ht: HeThong, b: { token: string; phone: string; challenge_id: string; code: string }) {
  ht.phien.kiemOtpDangNhap(b.challenge_id, b.code, b.phone);
  const kq = await ht.db.tx({ actor: 'system', lenh: 'nhan_loi_moi' }, async (t) => {
    const q = await t.mot<any>(`SELECT * FROM core.qr_tokens WHERE token_hash=digest($1,'sha256') AND kind='invitation'`, [b.token]);
    if (!q) throw loi('QR_KHONG_DUNG_DOT', 'Lời mời không tồn tại.');
    const u = await t.mot<any>(`SELECT user_id FROM pii.user_contacts WHERE phone_hash=digest($1,'sha256')`, [b.phone]);
    if (!u || u.user_id !== q.designated_user_id) throw loi('NGUOI_NHAN_KHONG_CHI_DINH', 'Lời mời gắn với số điện thoại khác.');

    // Biên nhận OTP mục đích invitation_accept gắn đúng lời mời (auth worker ghi; DB tiêu thụ khi quét).
    const binding = await t.gtri(`SELECT core.invitation_binding($1)`, [q.id]);
    const id = randomBytes(16).toString('hex');
    const bh = await t.gtri<string>(`SELECT encode(evt.otp_hash('invitation_accept',$1,$2::jsonb),'hex')`, [u.user_id, JSON.stringify(binding)]);
    const mac = createHmac('sha256', ht.cfg.otpPepper).update(`${id}|${b.code}|${bh}`).digest();
    await t.voiVai('agiviet_auth_worker', async () => { await t.q(`SELECT cmd.record_otp($1,$2,'invitation_accept',$3::jsonb,$4)`, [id, u.user_id, JSON.stringify(binding), mac]); await t.q(`SELECT cmd.otp_verification($1,true)`, [id]); });
    await t.voiVai('agiviet_auth_worker',()=>t.q(`SELECT cmd.verify_invitation_contact($1)`,[id]));
 const side=await t.gtri<boolean>(`SELECT can_sell FROM core.organizations WHERE id=$1`,[q.invitation_org_id])?'seller':'buyer';
 const login=await damBaoDangNhap(t,u.user_id,q.invitation_org_id,side);
 const membership=await loginCmd<string>(t,login,'accept_invitation',[b.token,'thiet-bi-nguoi-duoc-moi',id]);const m={id:membership};
    const org = await t.gtri<string>(`SELECT code FROM core.organizations WHERE id=$1`, [q.invitation_org_id]);
    return { user_id: u.user_id, org_code: org, membership_id: m.id };
  });
  const p = await ht.phien.taoPhien(kq.user_id, kq.org_code, null);
  return { ...kq, token: p.token, user_roles_effective: p.nguoi_dung.thanhVien.vai };
}

export async function danhSachThanhVien(t: GiaoDich, nd: NguoiDung) {
  return t.q(`SELECT m.id membership_id, m.user_id, u.display_name name, c.phone_masked, m.status, m.approval_limit_vnd::text approval_limit_vnd,
      coalesce((SELECT array_agg(r.role_code ORDER BY r.role_code) FROM core.membership_roles r WHERE r.membership_id=m.id),'{}') roles_effective,
      coalesce((SELECT json_agg(json_build_object('role',g.role_code,'effective_at',g.effective_at) ORDER BY g.role_code) FROM core.membership_role_grants g WHERE g.membership_id=m.id),'[]') role_grants
      FROM core.memberships m JOIN core.users u ON u.id=m.user_id LEFT JOIN pii.user_contacts c ON c.user_id=u.id WHERE m.org_id=$1 ORDER BY m.created_at`, [nd.thanhVien.orgId]);
}

// ---------------- Tài khoản nhận tiền ----------------

function chuanTen(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/^(HO|HTX|CONG TY)\s+/, '').replace(/\s+/g, ' ').trim(); }

export async function yeuCauTaiKhoan(t:GiaoDich,nd:NguoiDung,b:{bank_code:string;account_no:string;holder_name:string;verified_otp?:{id:string;mac:Buffer}}){
 if(!laChuToChuc(nd))throw loi('KHONG_CO_QUYEN');if(!b.verified_otp)throw loi('OTP_SAI');
 if(!/^[0-9A-Z-]{6,24}$/.test(b.account_no??'')||!b.bank_code||!b.holder_name)throw loi('DU_LIEU_KHONG_HOP_LE');
 const so=b.account_no.replace(/-/g,'');const hash=createHash('sha256').update(so).digest();
 const binding={org_id:nd.thanhVien.orgId,bank_code:b.bank_code,account_hash:hash.toString('hex'),holder:b.holder_name};
 await t.voiVai('agiviet_auth_worker',async()=>{await t.q(`SELECT cmd.record_otp($1,$2,'bank_account_change',$3::jsonb,$4)`,[b.verified_otp!.id,nd.userId,JSON.stringify(binding),b.verified_otp!.mac]);await t.q(`SELECT cmd.otp_verification($1,true)`,[b.verified_otp!.id]);});
 const id=await appCmd<string>(t,nd,nd.thanhVien.canSell?'seller':'buyer','request_bank_account',[b.bank_code,Buffer.from('TEST:'+so),hash,'****'+so.slice(-4),b.holder_name,'TEST-NOT-ENCRYPTED',b.verified_otp.id]);
 const org=await t.gtri<string>(`SELECT display_name FROM core.organizations WHERE id=$1`,[nd.thanhVien.orgId]);const khop=[chuanTen(org),chuanTen(nd.ten)].includes(chuanTen(b.holder_name));
 await t.voiVai('agiviet_bank_worker',()=>t.q(`SELECT cmd.verify_bank_account($1,$2,$3::jsonb)`,[id,khop,JSON.stringify({bank_code:b.bank_code,account_hash:hash.toString('hex'),holder:b.holder_name,reference:'bank-sim-name:'+id})]));
 const r=await t.mot<any>(`SELECT status,cooldown_until FROM pii.bank_accounts WHERE id=$1`,[id]);return {id,status:r.status,name_match:khop,cooldown_until:r.cooldown_until,account_masked:'****'+so.slice(-4)};
}

export async function kichHoatTaiKhoan(t: GiaoDich, nd: NguoiDung, id: string) {
  if (!laChuToChuc(nd)) throw loi('KHONG_CO_QUYEN', 'Chỉ chủ tài khoản kích hoạt.');
  const a = await t.mot<any>(`SELECT * FROM pii.bank_accounts WHERE id=$1 FOR UPDATE`, [id]);
  if (!a || a.org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  if (a.status !== 'cooling_down') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  if (new Date(a.cooldown_until).getTime() > t.thoiDiemMs) throw loi('TAI_KHOAN_DANG_CHO', `Còn chờ tới ${new Date(a.cooldown_until).toISOString()}.`);
  // 0036: thay tài khoản cũ + kích hoạt nguyên tử bằng command hệ thống; giờ chờ so theo ref.clock_at.
  await t.voiHeThong(() => t.q(`SELECT cmd.activate_bank_account($1)`, [id]));
  const row = await t.mot<any>(`SELECT status FROM pii.bank_accounts WHERE id=$1`, [id]);
  return { id, status: row.status };
}

/** "Không phải tôi": khóa ngay yêu cầu đổi, việc P0 cho vận hành (V05). */
export async function khongPhaiToi(t:GiaoDich,nd:NguoiDung,id:string){
 const a=await t.mot<any>(`SELECT org_id FROM pii.bank_accounts WHERE id=$1`,[id]);if(!a||a.org_id!==nd.thanhVien.orgId)throw loi('KHONG_TIM_THAY');
 await appCmd(t,nd,nd.thanhVien.canSell?'seller':'buyer','lock_bank_account',[id,'Chủ báo không phải tôi']);return {id,status:'locked'};
}

export async function danhSachTaiKhoan(t: GiaoDich, nd: NguoiDung) {
  return t.q(`SELECT id, bank_code, account_masked, holder_name, name_match, status, cooldown_until, activated_at, created_at FROM pii.bank_accounts WHERE org_id=$1 ORDER BY created_at`, [nd.thanhVien.orgId]);
}
