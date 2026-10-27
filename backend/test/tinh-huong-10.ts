// Phiên 5: chủ đầu tiên qua xác minh hai người (0034), ảnh lô công khai cho bên mua, kiểm đầu vào nhu cầu.
import { SDT } from './khung.ts';
import type { May } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG } from './luong.ts';

async function otp(may: May, phone: string) {
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/otp/send', payload: { phone } });
  return r.json().challenge_id as string;
}

them('TH-001B', 'Tổ chức mới: chủ đầu tiên qua xác minh hai người, vai chủ hiệu lực sau 24 giờ', async (may, th) => {
  const sdt = '0939000198';
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { challenge_id: await otp(may, sdt), phone: sdt, code: '123456', name: 'Lê Văn Mười', org: { side: 'sell', kind: 'household', display_name: 'Hộ Lê Văn Mười', province_code: 'DT' } } });
  th.bang('Đăng ký', r.statusCode, 200);
  const orgId = r.json().org_id as string;
  const thao = await may.dangNhap('0901000002'); const tam = await may.dangNhap(SDT.tam); // field + supervisor const tam = await may.dangNhap(SDT.tam);
  const anh = await thao.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'organization', entity_id: orgId, captured_in_app: true });
  const thieu = await thao.post(`/v1/ops/orgs/${orgId}/owner-verifications`, { evidence_document_id: anh.id });
  th.bang('Thiếu lý do: 422', thieu.status, 422);
  const dx = await thao.ok(`/v1/ops/orgs/${orgId}/owner-verifications`, { evidence_document_id: anh.id, reason: 'Đối chiếu CCCD và sổ hộ khẩu tại nhà' });
  th.bang('Đề xuất xác minh', dx.status, 'proposed');
  const tuDuyet = await thao.post(`/v1/ops/owner-verifications/${dx.id}/approve`, {});
  th.kiem('Người lập không tự duyệt', tuDuyet.status >= 400, tuDuyet.json);
  const ds = (await tam.get('/v1/ops/owner-verifications')).json;
  th.kiem('Danh sách có đề xuất', Array.isArray(ds) && ds.some((x: any) => x.id === dx.id), ds);
  const dy = await tam.ok(`/v1/ops/owner-verifications/${dx.id}/approve`, {});
  th.bang('Tổ chức hoạt động', dy.status, 'active');
  th.kiem('Có quyết định và vai chủ', !!dy.data.decision_id && !!dy.data.owner_grant_id, dy.data);
  const cho = await may.v<number>(`SELECT extract(epoch FROM effective_at - ref.clock_at())::int FROM core.membership_role_grants WHERE id=$1`, [dy.data.owner_grant_id]);
  th.kiem('Vai chủ chờ 24 giờ', cho >= 24 * 3600 - 60, cho);
  const lai = await tam.post(`/v1/ops/owner-verifications/${dx.id}/approve`, {});
  th.kiem('Không cấp chủ lần hai', lai.status >= 400, lai.json);
});

them('TH-API-ANH', 'Bên mua đọc được ảnh của lô công khai, không đọc được chứng từ riêng', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam); const ha = await may.dangNhap(SDT.ha);
  const lot = await may.v<string>(`SELECT l.id FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id WHERE o.code='TC-B01' AND l.status='on_sale' ORDER BY l.code LIMIT 1`);
  const anh = await nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'lot', entity_id: lot, captured_in_app: true });
  const f = await ha.get(`/v1/documents/${anh.id}/file`);
  th.bang('Bên mua tải ảnh lô: 200', f.status, 200);
  th.kiem('Tên tệp .png', String(f.headers['content-disposition']).includes('.png'), f.headers['content-disposition']);
  const rieng = await may.v<string>(`SELECT id FROM core.documents WHERE doc_type='evidence' AND entity='organization' LIMIT 1`);
  if (rieng) th.bang('Chứng cứ tổ chức khác vẫn 404', (await ha.get(`/v1/documents/${rieng}/file`)).status, 404);
});

them('TH-API-NC', 'Tạo nhu cầu thiếu min_source_qty_g trả 422, không 500', async (may, th) => {
  const ha = await may.dangNhap(SDT.ha);
  const g = await may.v<any>(`SELECT json_build_object('code',p.code,'segment_code',d.segment_code) FROM core.demands d JOIN core.products p ON p.id=d.product_id WHERE d.code='NC-3001'`);
  const goc = { product_code: g.code, segment_code: g.segment_code, needed_from: '2026-11-10', needed_to: '2026-11-20', delivery_mode: 'self_pickup' };
  const r1 = await ha.post('/v1/demands', { ...goc, lines: [{ grade_code: 'L1', qty_g: '500000', max_price_vnd: '26000' }] });
  th.bang('Thiếu min_source_qty_g: 422', r1.status, 422);
  th.bang('Mã lỗi', r1.json.errors?.[0]?.code, 'DU_LIEU_KHONG_HOP_LE');
  const r2 = await ha.post('/v1/demands', { ...goc, lines: [{ grade_code: 'L1', qty_g: '500000', max_price_vnd: '26000', min_source_qty_g: '0' }] });
  th.bang('min_source_qty_g = 0: 422', r2.status, 422);
  const r3 = await ha.post('/v1/demands', { ...goc, lines: [{ grade_code: 'L1', qty_g: '500000', max_price_vnd: '26000', min_source_qty_g: '100000' }] });
  th.bang('Đủ trường: tạo được', r3.status, 200);
});

them('TH-PHIEN-BEN', 'Phiên đăng nhập OTP lưu bền ở auth.sessions: khởi động lại vẫn dùng được, đăng xuất thu hồi', async (may, th) => {
  const sdt = SDT.nam;
  const ch = await otp(may, sdt);
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challenge_id: ch, phone: sdt, code: '123456' } });
  th.bang('Đăng nhập OTP', r.statusCode, 200);
  const token = r.json().token as string;
  const n = await may.v<number>(`SELECT count(*)::int FROM auth.sessions WHERE token_hash=digest($1,'sha256')`, [token]);
  th.bang('Có bản ghi auth.sessions (chỉ SHA-256 token)', n, 1);
  (may.ht.phien as any).phien.clear(); // giả lập khởi động lại tiến trình
  const s1 = await may.app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: `Bearer ${token}` } });
  th.bang('Sau khởi động lại vẫn đăng nhập', s1.statusCode, 200);
  await may.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { authorization: `Bearer ${token}` }, payload: {} });
  const thuHoi = await may.v<boolean>(`SELECT revoked_at IS NOT NULL FROM auth.sessions WHERE token_hash=digest($1,'sha256')`, [token]);
  th.bang('Đăng xuất thu hồi phiên bền', thuHoi, true);
  (may.ht.phien as any).phien.clear();
  const s2 = await may.app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: `Bearer ${token}` } });
  th.bang('Sau đăng xuất + khởi động lại: 401', s2.statusCode, 401);
});

them('TH-PHIEN-BEN-2', 'Phiên bền cho người giúp (ủy quyền) và người đăng ký tổ chức đang chờ (0055)', async (may, th) => {
  const dn = async (sdt: string) => {
    const ch = await otp(may, sdt);
    const r = await may.app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challenge_id: ch, phone: sdt, code: '123456' } });
    return r.json().token as string;
  };
  const tk = await dn(SDT.teo);
  th.bang('Người giúp: phiên loại helper', await may.v<string>(`SELECT session_kind FROM auth.sessions WHERE token_hash=digest($1,'sha256')`, [tk]), 'helper');
  const sdt = '0939000197';
  const ch = await otp(may, sdt);
  const r = await may.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { challenge_id: ch, phone: sdt, code: '123456', name: 'Trần Văn Chín', org: { side: 'sell', kind: 'household', display_name: 'Hộ Trần Văn Chín', province_code: 'DT' } } });
  th.bang('Đăng ký', r.statusCode, 200);
  await may.he('/v1/test/clock', { advance_minutes: 2 }); // giới hạn gửi OTP cùng số
  const tk2 = await dn(sdt);
  th.bang('Người đăng ký chờ duyệt: phiên pending_registration', await may.v<string>(`SELECT session_kind FROM auth.sessions WHERE token_hash=digest($1,'sha256')`, [tk2]), 'pending_registration');
  (may.ht.phien as any).phien.clear();
  for (const [ten, t] of [['người giúp', tk], ['người đăng ký', tk2]] as const) {
    const s = await may.app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: `Bearer ${t}` } });
    th.bang(`Sau khởi động lại vẫn đăng nhập (${ten})`, s.statusCode, 200);
  }
});
