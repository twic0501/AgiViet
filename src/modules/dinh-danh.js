// Danh tính, tổ chức, người thân dự phòng, tài khoản nhận tiền (BR-01..08), báo mất quyền truy cập.
import { randomInt, randomBytes } from 'node:crypto';
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, sha256, loi, khongThay, audit, notify, nextCode, HOUR, DAY } from '../lib/core.js';
import { THOI_HAN } from '../lib/rules.js';
import { canQuyen, goiCua } from '../lib/chung.js';

const DEMO = process.env.AGIVIET_DEMO !== '0';
const chuanHoaSdt = s => String(s || '').replace(/\D/g, '').replace(/^84/, '0');
const boDau = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

function taoPhien(ctx, userId, orgId) {
  const token = randomBytes(24).toString('base64url');
  insert('sessions', { token_hash: sha256(token), user_id: userId, org_id: orgId, created_at: nowIso(), expires_at: addMs(nowIso(), 30 * DAY) });
  ctx.datCookie = `av_phien=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`;
  return token;
}
export function hoSoToi(userId, orgId) {
  const user = one('select id, phone, name, recovered_at from users where id = ?', userId);
  const org = one('select * from organizations where id = ?', orgId);
  const m = one('select roles from memberships where user_id = ? and org_id = ?', userId, orgId);
  const toChuc = all("select o.id, o.name, o.can_sell, o.can_buy from memberships m join organizations o on o.id = m.org_id where m.user_id = ? and m.status <> 'revoked'", userId);
  return { user, org: { ...org, goi: org.can_buy ? goiCua(org.id) : null }, roles: m.roles.split(','), to_chuc: toChuc };
}

/* ---------- OTP ---------- */
route('POST', '/api/auth/otp', ctx => {
  const phone = chuanHoaSdt(ctx.body.phone);
  if (phone.length < 9) throw loi('E02', 'Số điện thoại chưa đúng.', 'phone');
  const code = DEMO ? '123456' : String(randomInt(0, 1e6)).padStart(6, '0');
  run('insert into otp_codes (phone, code_hash, expires_at, attempts) values (?,?,?,0) on conflict(phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0', phone, sha256(phone + code), addMs(nowIso(), 5 * 60e3));
  // Không log mã OTP (v4 mục 13). Bản demo trả mã để thử, có nhãn rõ.
  return { da_gui: true, het_han_sau_giay: 300, ...(DEMO ? { ma_demo: code, nhan: 'Chế độ demo: mã hiện trên màn hình, không gửi SMS thật' } : {}) };
}, { moi: true });

route('POST', '/api/auth/verify', ctx => tx(() => {
  const phone = chuanHoaSdt(ctx.body.phone);
  const o = one('select * from otp_codes where phone = ?', phone);
  if (!o || o.expires_at < nowIso()) throw loi('E02', 'Mã đã hết hạn, bấm gửi lại.');
  if (o.attempts >= 5) throw loi('E02', 'Nhập sai quá 5 lần. Chờ gửi lại mã mới.');
  if (sha256(phone + String(ctx.body.code || '')) !== o.code_hash) { run('update otp_codes set attempts = attempts + 1 where phone = ?', phone); throw loi('E02', 'Mã chưa đúng.', 'code'); }
  run('delete from otp_codes where phone = ?', phone);
  let user = one('select * from users where phone = ?', phone);
  const moi = !user;
  if (moi) {
    // Đăng ký: tạo người dùng + tổ chức theo vai trò chọn ở màn đầu
    const b = ctx.body;
    if (!b.name || !b.app) throw loi('E05', 'Người mới cần tên và vai trò (ban hoặc mua).', 'name');
    user = insert('users', { id: newId('u_'), phone, name: String(b.name).slice(0, 80), created_at: nowIso() });
    const org = insert('organizations', { id: newId('o_'), kind: b.kind || (b.app === 'mua' ? 'doanh_nghiep' : 'ca_nhan'), name: b.org_name || b.name, province: b.province || null, commune: b.commune || null, can_sell: b.app === 'ban' ? 1 : 0, can_buy: b.app === 'mua' ? 1 : 0, seller_type: b.app === 'ban' ? (b.seller_type || 'tu_trong') : null, phone_verified_at: nowIso(), created_at: nowIso() });
    insert('memberships', { id: newId('m_'), user_id: user.id, org_id: org.id, roles: 'administer,create,approve,sign,receive,reconcile,manage_payout', status: 'active' });
    audit({ user, org }, 'organizations', org.id, 'dang_ky');
  }
  const ms = all("select m.org_id, o.can_sell, o.can_buy from memberships m join organizations o on o.id = m.org_id where m.user_id = ? and m.status <> 'revoked'", user.id);
  const muon = ctx.body.app;
  const chon = ms.find(m => m.org_id === ctx.body.org_id) || ms.find(m => (muon === 'ban' ? m.can_sell : muon === 'mua' ? m.can_buy : 1)) || ms[0];
  taoPhien(ctx, user.id, chon.org_id);
  return { moi, ...hoSoToi(user.id, chon.org_id) };
}), { moi: true });

route('POST', '/api/auth/logout', ctx => { ctx.datCookie = 'av_phien=; Path=/; Max-Age=0'; return {}; }, { moi: true });
route('GET', '/api/me', ctx => (ctx.user ? { dang_nhap: true, ...hoSoToi(ctx.user.id, ctx.org.id) } : { dang_nhap: false }), { moi: true });

route('PUT', '/api/org/profile', ctx => tx(() => {
  canQuyen(ctx, 'administer', 'create');
  const b = ctx.body;
  const cho = ['name', 'province', 'commune', 'seller_type', 'kind'].filter(k => b[k] !== undefined);
  for (const k of cho) run(`update organizations set ${k} = ? where id = ?`, b[k], ctx.org.id);
  audit(ctx, 'organizations', ctx.org.id, 'sua_ho_so', Object.fromEntries(cho.map(k => [k, b[k]])));
  return hoSoToi(ctx.user.id, ctx.org.id);
}));

/* ---------- Thành viên: Free 1 tài khoản, Business 3; người giúp và khách mời ký không chiếm chỗ (BR-33, BR-37) ---------- */
route('GET', '/api/org/members', ctx => ({ items: all('select m.id, m.roles, m.status, u.name, u.phone from memberships m join users u on u.id = m.user_id where m.org_id = ?', ctx.org.id) }));
route('POST', '/api/org/members', ctx => tx(() => {
  canQuyen(ctx, 'administer');
  const phone = chuanHoaSdt(ctx.body.phone);
  const roles = String(ctx.body.roles || 'create').split(',').map(s => s.trim()).filter(Boolean);
  const khongChiemCho = roles.includes('helper') || roles.includes('guest_signer');
  if (ctx.org.can_buy && !khongChiemCho) {
    const tran = goiCua(ctx.org.id) === 'business' ? 3 : 1;
    const dang = one("select count(*) n from memberships where org_id = ? and status = 'active' and roles not like '%helper%' and roles not like '%guest_signer%'", ctx.org.id).n;
    if (dang >= tran) throw loi('E11', `Gói hiện có ${tran} tài khoản thao tác, đã dùng ${dang}. Người ký có thể mời qua link, không chiếm chỗ.`);
  }
  let u = one('select * from users where phone = ?', phone);
  if (!u) u = insert('users', { id: newId('u_'), phone, name: ctx.body.name || phone, created_at: nowIso() });
  if (one('select 1 from memberships where user_id = ? and org_id = ?', u.id, ctx.org.id)) throw loi('E05', 'Người này đã là thành viên.');
  const m = insert('memberships', { id: newId('m_'), user_id: u.id, org_id: ctx.org.id, roles: roles.join(','), status: 'active' });
  audit(ctx, 'memberships', m.id, 'them', { roles });
  return { __status: 201, item: m };
}));

/* ---------- Vận hành AgiViet: ghi đã đối chiếu hồ sơ, năng lực nhận hàng (BR-07, BR-43) ---------- */
route('POST', '/api/ops/orgs/:id/verify', ctx => tx(() => {
  if (ctx.org.id !== 'org_agiviet') throw loi('E01', 'Chỉ nhân viên vận hành.');
  const o = one('select * from organizations where id = ?', ctx.params.id); if (!o) throw khongThay('Tổ chức');
  run('update organizations set org_checked_at = coalesce(org_checked_at, ?), capability_note = coalesce(?, capability_note), capability_checked_at = case when ? is null then capability_checked_at else ? end where id = ?', nowIso(), ctx.body.capability_note || null, ctx.body.capability_note || null, nowIso(), o.id);
  audit(ctx, 'organizations', o.id, 'doi_chieu');
  return { item: one('select * from organizations where id = ?', o.id) };
}));

/* ---------- Người thân dự phòng ---------- */
route('GET', '/api/backup-contacts', ctx => ({ items: all('select * from backup_contacts where org_id = ?', ctx.org.id) }));
route('POST', '/api/backup-contacts', ctx => tx(() => {
  canQuyen(ctx, 'administer', 'manage_payout');
  const { kind = 'nguoi_than', label, value } = ctx.body;
  if (!label || !value) throw loi('E05', 'Cần tên và số hoặc email người thân.', 'label');
  const v = String(value);
  const bc = insert('backup_contacts', { id: newId('bc_'), org_id: ctx.org.id, kind, label, value_masked: '•••• ' + v.slice(-4), verified_at: DEMO ? nowIso() : null });
  audit(ctx, 'backup_contacts', bc.id, 'them');
  return { item: bc };
}));

/* ---------- Tài khoản nhận tiền (BR-08) ---------- */
export function taiKhoanDangDung(orgId) {
  return one("select * from payout_accounts where org_id = ? and status = 'dang_dung' order by activated_at desc limit 1", orgId);
}
function moTaTaiKhoan(a) {
  const yc = one('select * from payout_change_requests where payout_account_id = ?', a.id);
  return { ...a, number_hash: undefined, yeu_cau: yc || null, doi_gan_day: a.activated_at && Date.parse(nowIso()) - Date.parse(a.activated_at) < THOI_HAN.canh_bao_tai_khoan_moi };
}
route('GET', '/api/payout-accounts', ctx => ({
  items: all("select * from payout_accounts where org_id = ? order by created_at desc", ctx.org.id).map(moTaTaiKhoan),
  lop_bao_ve: ['Xác thực thêm một lớp', 'Báo số cũ và người thân dự phòng', 'Chờ 24 giờ (72 giờ sau khôi phục)', 'So tên chủ tài khoản'],
  gioi_han: 'App không chặn được tiền chuyển theo hướng dẫn ngoài app.',
}));
route('POST', '/api/payout-accounts', ctx => tx(() => {
  canQuyen(ctx, 'manage_payout');
  if (ctx.roles.includes('helper') && !ctx.roles.includes('administer')) throw loi('E01', 'Người giúp nhập liệu không được đổi tài khoản nhận tiền.');
  if (one("select 1 from org_restrictions where org_id = ? and kind = 'ky_va_doi_tai_khoan' and (until_at is null or until_at > ?)", ctx.org.id, nowIso())) throw loi('E01', 'Tài khoản đang bị khóa đổi tài khoản nhận tiền sau báo mất quyền truy cập. Liên hệ hỗ trợ để xác minh.');
  const { bank, number, holder_name } = ctx.body;
  const factors = [...new Set(ctx.body.factors || [])];
  if (!bank || !number || !holder_name) throw loi('E05', 'Cần ngân hàng, số tài khoản và tên chủ tài khoản.', 'number');
  // Xác thực tăng cường: OTP + ít nhất một yếu tố khác, không chỉ dựa vào phiên đăng nhập
  if (!factors.includes('otp') || factors.length < 2) throw loi('E15', 'Cần mã OTP và thêm một lớp: gọi lại người thân dự phòng, xác minh trực tiếp hoặc video với người trực.', 'factors');
  const soSach = String(number).replace(/\s/g, '');
  const vuaKhoiPhuc = ctx.user.recovered_at && Date.parse(nowIso()) - Date.parse(ctx.user.recovered_at) < THOI_HAN.khoi_phuc_gan_day;
  const cho = vuaKhoiPhuc ? THOI_HAN.tai_khoan_cho_sau_khoi_phuc : THOI_HAN.tai_khoan_cho;
  // Tra tên chủ tài khoản: bản demo so với tên tổ chức và tên người dùng; lệch → xác minh thủ công
  const khop = [ctx.org.name, ctx.user.name].some(t => boDau(t) === boDau(holder_name)) ? 1 : 0;
  const a = insert('payout_accounts', { id: newId('pa_'), org_id: ctx.org.id, bank, number_masked: '•••• ' + soSach.slice(-4), number_hash: sha256(soSach), holder_name, status: 'cho_xac_minh', created_at: nowIso() });
  const kenh = ['so_cu', ...all('select label from backup_contacts where org_id = ? and verified_at is not null', ctx.org.id).map(b => b.label)];
  insert('payout_change_requests', { id: newId('pc_'), payout_account_id: a.id, requested_by: ctx.user.id, factors_used: factors.join(','), name_match: khop, cooldown_until: addMs(nowIso(), cho), notified: JSON.stringify(kenh), status: khop ? 'cho' : 'xac_minh_thu_cong', created_at: nowIso() });
  notify(ctx.org.id, `Có yêu cầu thêm tài khoản nhận tiền ${a.number_masked}. Không phải bạn? Bấm “Không phải tôi” để khóa ngay.`, '/ban/toi.html#tai-khoan-nhan');
  audit(ctx, 'payout_accounts', a.id, 'yeu_cau_them', { cooldown_gio: cho / HOUR, name_match: khop });
  return { __status: 201, item: moTaTaiKhoan(a), ma: 'E15', thong_bao: 'Tài khoản mới đang chờ xác minh, chưa hiện trên hướng dẫn chuyển tiền.' };
}));
// "Không phải tôi": khóa ngay, không cần người trực; mở ticket P0
route('POST', '/api/payout-change-requests/:id/deny', ctx => tx(() => {
  const yc = one('select r.*, a.org_id from payout_change_requests r join payout_accounts a on a.id = r.payout_account_id where r.id = ?', ctx.params.id);
  if (!yc || yc.org_id !== ctx.org.id) throw khongThay('Yêu cầu');
  run("update payout_change_requests set status = 'khoa', denied_at = ? where id = ?", nowIso(), yc.id);
  run("update payout_accounts set status = 'da_khoa' where id = ?", yc.payout_account_id);
  insert('org_restrictions', { id: newId('rs_'), org_id: ctx.org.id, kind: 'ky_va_doi_tai_khoan', reason: 'Chủ tài khoản báo không phải mình yêu cầu đổi tài khoản nhận tiền', from_at: nowIso() });
  const t = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: 'Tài khoản nhận tiền', priority: 'P0', category: 'truy_cap', description: 'Yêu cầu đổi tài khoản nhận tiền bị chủ tài khoản từ chối', status: 'moi', created_at: nowIso() });
  audit(ctx, 'payout_change_requests', yc.id, 'khoa_boi_chu');
  return { da_khoa: true, ticket: t.code };
}));
// Kích hoạt tài khoản đủ thời gian chờ và khớp tên (việc nền gọi)
export function kichHoatTaiKhoanDenHan() {
  const den = all("select r.*, a.org_id from payout_change_requests r join payout_accounts a on a.id = r.payout_account_id where r.status = 'cho' and r.cooldown_until <= ?", nowIso());
  for (const yc of den) tx(() => {
    run("update payout_accounts set status = 'da_thay' where org_id = ? and status = 'dang_dung'", yc.org_id);
    run("update payout_accounts set status = 'dang_dung', activated_at = ? where id = ?", nowIso(), yc.payout_account_id);
    run("update payout_change_requests set status = 'duyet' where id = ?", yc.id);
    audit(null, 'payout_accounts', yc.payout_account_id, 'kich_hoat');
    // Bên mua có khoản chưa trả thấy cảnh báo ở hướng dẫn thanh toán (không tự đổi hướng dẫn cũ)
    for (const o of all('select distinct payer_org from obligations where beneficiary_org = ?', yc.org_id)) notify(o.payer_org, 'Một người bán vừa đổi tài khoản nhận tiền. Gọi hỏi lại qua số đã biết trước khi chuyển.');
  });
  return den.length;
}

/* ---------- Báo mất quyền truy cập: tự khóa, kể cả ngoài ca ---------- */
route('POST', '/api/security/report-lost', ctx => tx(() => {
  insert('org_restrictions', { id: newId('rs_'), org_id: ctx.org.id, kind: 'ky_va_doi_tai_khoan', reason: 'Báo mất quyền truy cập', from_at: nowIso() });
  run("update payout_change_requests set status = 'khoa', denied_at = ? where status in ('cho','xac_minh_thu_cong') and payout_account_id in (select id from payout_accounts where org_id = ?)", nowIso(), ctx.org.id);
  run("update payout_accounts set status = 'da_khoa' where org_id = ? and status = 'cho_xac_minh'", ctx.org.id);
  const t = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: 'Tài khoản', priority: 'P0', category: 'truy_cap', description: 'Báo mất quyền truy cập', status: 'moi', created_at: nowIso() });
  audit(ctx, 'organizations', ctx.org.id, 'bao_mat_quyen');
  return { da_khoa: ['ky', 'doi_tai_khoan_nhan_tien'], van_duoc: ['ho_tro', 'xem_ho_so', 'nhan_tien_hop_le'], ticket: t.code };
}));
// Khôi phục tài khoản (đổi SIM): đánh dấu để thay đổi nhạy cảm chờ 72 giờ
route('POST', '/api/security/recovered', ctx => tx(() => {
  run('update users set recovered_at = ? where id = ?', nowIso(), ctx.user.id);
  audit(ctx, 'users', ctx.user.id, 'khoi_phuc');
  return { cho_doi_tai_khoan_gio: 72 };
}));
