// Tài khoản, thành viên, tài khoản nhận tiền (09: TH-001, TH-002, TH-023 phần làm được).
import { SDT } from './khung.ts';
import { ANH_PNG } from './luong.ts';
import { them } from './tinh-huong.ts';
import type { May } from './khung.ts';

async function otp(may: May, phone: string) {
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/otp/send', payload: { phone } });
  return r.json().challenge_id as string;
}

them('TH-001', 'Đăng ký người bán mới, xác minh, tài khoản nhận tiền chờ 24 giờ', async (may, th) => {
  const sdt = '0939000199';
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { challenge_id: await otp(may, sdt), phone: sdt, code: '123456', name: 'Võ Thị Út', org: { side: 'sell', kind: 'household', display_name: 'Hộ Võ Thị Út', province_code: 'DT' } } });
  th.bang('Đăng ký thành công', r.statusCode, 200);
  const j = r.json();
  th.bang('Tổ chức chờ xác minh', j.org_status, 'pending');
  const viec = await may.v<number>(`SELECT count(*)::int FROM ops.tasks WHERE kind='V01' AND entity_id=$1`, [j.org_id]);
  th.bang('Việc V01 xác minh', viec, 1);
  const lai = await may.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { challenge_id: await otp(may, sdt), phone: sdt, code: '123456', name: 'X', org: { side: 'sell', kind: 'household', display_name: 'X' } } });
  th.kiem('Đăng ký lại cùng số bị chặn', lai.statusCode >= 400, lai.json());
  const khoa = await may.dangNhap(SDT.tam);
  // 0034/0049: tổ chức mới chỉ hoạt động qua quyết định hai người (người lập field, người duyệt supervisor); /verify một người trả 501.
  const motNguoi = await khoa.post(`/v1/ops/orgs/${j.org_id}/verify`, { verification_level: 2, note: 'Xác minh tại chỗ' });
  th.bang('Xác minh một người bị từ chối rõ', motNguoi.json.errors?.[0]?.code, 'CHUA_HO_TRO');
  const field = await may.dangNhap('0901000002');
  const anh = await field.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'organization', entity_id: j.org_id, captured_in_app: true });
  const dx = await field.ok(`/v1/ops/orgs/${j.org_id}/owner-verifications`, { evidence_document_id: anh.id, reason: 'Xác minh tại chỗ, đối chiếu CCCD' });
  const xm = await khoa.ok(`/v1/ops/owner-verifications/${dx.id}/approve`, {});
  th.bang('Vận hành xác minh: hoạt động', xm.status, 'active');
  const muaKhongMst = await may.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { challenge_id: await otp(may, '0909000299'), phone: '0909000299', code: '123456', name: 'Ai đó', org: { side: 'buy', kind: 'enterprise', display_name: 'Công ty thử' } } });
  th.kiem('Bên mua thiếu MST bị chặn', muaKhongMst.statusCode === 422, muaKhongMst.json());
});

them('TH-002', 'Mời thành viên theo gói (Thu mua tối đa 5), nhận lời mời bằng OTP đúng số', async (may, th) => {
  const thinh = await may.dangNhap(SDT.thinh);
  const ha = await may.dangNhap(SDT.ha);
  const k = await ha.post('/v1/org/members/invitations', { phone: '0909000250', name: 'Người thử', roles: ['warehouse'] });
  th.bang('Người không phải chủ không mời được', k.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const m1 = await thinh.ok('/v1/org/members/invitations', { phone: '0909000214', name: 'Phạm Văn Kho', roles: ['site_receiver'] });
  th.bang('Mời người thứ 5', m1.status, 'invited');
  const m2 = await thinh.post('/v1/org/members/invitations', { phone: '0909000215', name: 'Người thứ sáu', roles: ['warehouse'] });
  th.bang('Người thứ 6 bị chặn theo gói', m2.json.errors?.[0]?.code, 'GOI_HET_THANH_VIEN');
  const sai = await may.app.inject({ method: 'POST', url: '/v1/invitations/accept', payload: { token: m1.data.invitation_token, phone: '0909000216', challenge_id: await otp(may, '0909000216'), code: '123456' } });
  th.kiem('Số khác không nhận được lời mời', sai.statusCode >= 400, sai.json());
  const ok = await may.app.inject({ method: 'POST', url: '/v1/invitations/accept', payload: { token: m1.data.invitation_token, phone: '0909000214', challenge_id: await otp(may, '0909000214'), code: '123456' } });
  th.bang('Nhận lời mời', ok.statusCode, 200);
  th.kiem('Vai người nhận tại điểm hiệu lực ngay', (ok.json().user_roles_effective ?? []).includes('site_receiver'), ok.json());
  const lai = await may.app.inject({ method: 'POST', url: '/v1/invitations/accept', payload: { token: m1.data.invitation_token, phone: '0909000214', challenge_id: await otp(may, '0909000214'), code: '123456' } });
  th.kiem('Lời mời dùng một lần', lai.statusCode >= 400, lai.json());
});

them('TH-023', 'Đổi tài khoản nhận tiền: người giúp bị chặn, chờ 24 giờ, không phải tôi', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam); const teo = await may.dangNhap(SDT.teo);
  await may.he('/v1/test/clock', { advance_minutes: 2 });
  const t1 = await teo.post('/v1/payout-accounts', { bank_code: 'VCB', account_no: '0110000009999', holder_name: 'Nguyễn Thị Năm', challenge_id: await otp(may, SDT.teo), code: '123456' });
  th.bang('Người giúp không đổi được', t1.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const y = await nam.ok('/v1/payout-accounts', { bank_code: 'VCB', account_no: '0110000009999', holder_name: 'Nguyễn Thị Năm', challenge_id: await otp(may, SDT.nam), code: '123456' });
  th.bang('Khớp tên: đang chờ', y.data.status, 'cooling_down');
  const kh = await nam.post(`/v1/payout-accounts/${y.id}/activate`, {});
  th.bang('Kích hoạt sớm bị chặn', kh.json.errors?.[0]?.code, 'TAI_KHOAN_DANG_CHO');
  const ds = (await nam.get('/v1/payout-accounts')).json;
  th.kiem('Tài khoản cũ vẫn hoạt động', ds.some((a: any) => a.status === 'active' && a.account_masked === '****2186'), ds);
  const np = await nam.ok(`/v1/payout-accounts/${y.id}/not-me`, {});
  th.bang('Không phải tôi: khóa', np.status, 'locked');
  const v = await may.v<number>(`SELECT count(*)::int FROM ops.tasks WHERE kind='V05' AND priority=0 AND entity_id=$1`, [y.id]);
  th.bang('Việc V05 P0', v, 1);
});
