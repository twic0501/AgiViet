import { docBanTrinhBay } from '../pdf/ban-trinh-bay.ts';
import { createHash,createHmac } from 'node:crypto';
// Định tuyến API v1. Lệnh: POST, thân có idempotency_key (+ expected_revision tùy chọn); phản hồi {id, revision, status, events, errors, data}.
// Truy vấn: GET, lọc theo quyền. Đường dẫn tiếng Anh; tên lệnh nghiệp vụ tương ứng ghi trong docs/backend/openapi.yaml.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BoLenh, Phia } from '../app.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { hanhDongCua, canQuyen, duocPhep } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import * as Lo from '../nghiep-vu/lo.ts';
import * as NhuCau from '../nghiep-vu/nhu-cau.ts';
import * as LoiChao from '../nghiep-vu/loi-chao.ts';
import * as Don from '../nghiep-vu/don.ts';
import * as Tien from '../nghiep-vu/tien.ts';
import * as GiaoNhan from '../nghiep-vu/giao-nhan.ts';
import { luuBangChung, docTep } from '../nghiep-vu/tai-lieu.ts';
import { giaThamKhao } from '../nghiep-vu/lo.ts';
import { chayHenGio } from '../nghiep-vu/hen-gio.ts';
import { GIO, PHUT } from '../dong-ho.ts';
import * as Huy from '../nghiep-vu/huy.ts';
import * as VanHanh from '../nghiep-vu/van-hanh.ts';

const uuid = z.string().uuid();
const soNguyen = z.union([z.number().int().nonnegative(), z.string().regex(/^\d{1,15}$/)]);
const P = (req: any) => req.params as Record<string, string>;

async function phiaDon(t: GiaoDich, nd: NguoiDung, orderId: string): Promise<Phia> {
  const o = await t.mot<any>(`SELECT buyer_org_id, seller_org_id FROM core.orders WHERE id=$1`, [orderId]);
  if (!o) throw loi('KHONG_TIM_THAY');
  if (o.buyer_org_id === nd.thanhVien.orgId) return 'buyer';
  if (o.seller_org_id === nd.thanhVien.orgId) return 'seller';
  throw loi('KHONG_TIM_THAY');
}
async function phiaDot(t: GiaoDich, nd: NguoiDung, deliveryId: string): Promise<Phia> {
  const id = await t.gtri<string>(`SELECT order_id FROM core.deliveries WHERE id=$1`, [deliveryId]);
  if (!id) throw loi('KHONG_TIM_THAY');
  return phiaDon(t, nd, id);
}
async function phiaKhoan(t: GiaoDich, nd: NguoiDung, paymentId: string): Promise<Phia> {
  const id = await t.gtri<string>(`SELECT order_id FROM core.direct_payments WHERE id=$1`, [paymentId]);
  if (!id) throw loi('KHONG_TIM_THAY');
  return phiaDon(t, nd, id);
}
async function phiaLoiChao(t: GiaoDich, nd: NguoiDung, id: string): Promise<Phia> {
  const o = await t.mot<any>(`SELECT buyer_org_id FROM core.offers WHERE id=$1`, [id]);
  if (!o) throw loi('KHONG_TIM_THAY');
  return o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller';
}

export async function dangKyRoutes(app: FastifyInstance, bo: BoLenh) {
  const { ht } = bo;
  const thu = () => { if (!ht.cfg.tinhNangThu) throw loi('CHI_MOI_TRUONG_THU'); };
  ht.guiWebhook = async (body, headers) => {
    const r = await app.inject({ method: 'POST', url: '/v1/webhooks/bank', payload: body, headers: { ...headers, 'content-type': 'application/json' } });
    return { http: r.statusCode, body: r.json() };
  };

  // ---------------- Xác thực ----------------
  app.post('/v1/auth/otp/send', async (req) => {
    const b = z.object({ phone: z.string() }).parse(req.body);
    return ht.phien.guiOtp(b.phone);
  });
  app.post('/v1/auth/otp/verify', async (req) => {
    const b = z.object({ challenge_id: z.string(), phone: z.string(), code: z.string(), org_code: z.string().optional(), device_id: z.string().optional() }).parse(req.body);
    const r = await ht.phien.xacNhanOtp(b.challenge_id, b.code, b.phone, b.org_code, b.device_id);
    return { token: r.token, user: hoSo(r.nguoi_dung) };
  });
  app.get('/v1/auth/session', async (req) => hoSo(await bo.xacThuc(req)));
  app.get('/v1/me', async (req) => hoSo(await bo.xacThuc(req)));
  app.get('/v1/test/demo-numbers', async () => { thu(); const { SO_DEMO } = await import('../demo/so-demo.ts'); return SO_DEMO; });
  app.post('/v1/auth/switch-org', async (req) => {
    const b = z.object({ org_code: z.string() }).parse(req.body);
    const token = String(req.headers.authorization ?? '').slice(7);
    return hoSo(await ht.phien.doiToChuc(token, b.org_code));
  });
  app.post('/v1/auth/logout', async (req) => { await ht.phien.dangXuat(String(req.headers.authorization ?? '').slice(7)); return { ok: true }; });

  // ---------------- Đăng ký, thành viên, tài khoản nhận tiền ----------------
  app.post('/v1/auth/register', async (req) => {
    const b = z.object({ challenge_id: z.string(), phone: z.string(), code: z.string(), name: z.string().min(1),
      org: z.object({ side: z.enum(['sell', 'buy', 'both']), kind: z.enum(['household', 'cooperative', 'coop_group', 'enterprise', 'trader']), display_name: z.string().min(1), tax_code: z.string().optional(), province_code: z.string().optional(), segment_code: z.enum(['export', 'processor', 'horeca', 'wholesaler']).optional(), plan_code: z.enum(['free', 'procurement', 'enterprise', 'kitchen']).optional() }) }).parse(req.body);
    const { dangKy } = await import('../nghiep-vu/to-chuc.ts'); return dangKy(ht, b);
  });
  app.post('/v1/invitations/accept', async (req) => {
    const b = z.object({ token: z.string(), phone: z.string(), challenge_id: z.string(), code: z.string() }).parse(req.body);
    const { nhanLoiMoi } = await import('../nghiep-vu/to-chuc.ts'); return nhanLoiMoi(ht, b);
  });
  // Ủy quyền người giúp (0048 delegate_helper/revoke_delegation): chủ/coop_board cấp đúng thao tác, có thời hạn.
  app.post('/v1/org/delegations', async (req) => bo.lenh(req, 'uy_quyen_nguoi_giup', 'system', async (t, nd, b) => {
    const x = z.object({ helper_user_id: uuid, actions: z.array(z.enum(['view', 'lot.draft', 'lot.update', 'message.send', 'delivery.record'])).min(1), valid_from: z.string().optional(), valid_to: z.string(), evidence_document_id: uuid.optional() }).parse(b);
    const { appCmd } = await import('../db/command.ts');
    // Thay ủy quyền đang hiệu lực của cùng người giúp (DB cấm chồng thời gian): thu hồi rồi cấp mới, cùng giao dịch.
    const cu = await t.q<any>(`SELECT id FROM core.delegations WHERE org_id=$1 AND helper_user_id=$2 AND revoked_at IS NULL AND upper(valid_during)>$3`, [nd.thanhVien.orgId, x.helper_user_id, new Date(t.thoiDiemMs)]);
    for (const c of cu) await appCmd(t, nd, nd.thanhVien.canSell ? 'seller' : 'buyer', 'revoke_delegation', [c.id]);
    const id = await appCmd<string>(t, nd, nd.thanhVien.canSell ? 'seller' : 'buyer', 'delegate_helper', [x.helper_user_id, `{${x.actions.join(',')}}`, `[${x.valid_from ?? new Date(t.thoiDiemMs).toISOString()},${x.valid_to})`, x.evidence_document_id ?? null]);
    return { id, status: 'active', replaced: cu.map((c: any) => c.id) };
  }));
  app.get('/v1/org/delegations', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => t.q(`SELECT d.id, d.helper_user_id, u.display_name helper_name, d.actions, lower(d.valid_during) valid_from, upper(d.valid_during) valid_to, d.revoked_at FROM core.delegations d JOIN core.users u ON u.id=d.helper_user_id WHERE d.org_id=$1 ORDER BY lower(d.valid_during) DESC`, [nd.thanhVien.orgId])); });
  app.post('/v1/org/delegations/:id/revoke', async (req) => bo.lenh(req, 'thu_hoi_uy_quyen', 'system', async (t, nd) => {
    const { appCmd } = await import('../db/command.ts');
    await appCmd(t, nd, nd.thanhVien.canSell ? 'seller' : 'buyer', 'revoke_delegation', [P(req).id]);
    return { id: P(req).id, status: 'revoked' };
  }));
  app.get('/v1/org/members', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/to-chuc.ts'); return bo.doc((t) => m.danhSachThanhVien(t, nd)); });
  app.post('/v1/org/members/invitations', async (req) => bo.lenh(req, 'moi_thanh_vien', 'system', async (t, nd, b) => {
    const x = z.object({ phone: z.string(), name: z.string().min(1), roles: z.array(z.string()).min(1), approval_limit_vnd: soNguyen.optional() }).parse(b);
    const m = await import('../nghiep-vu/to-chuc.ts'); return m.moiThanhVien(ht, t, nd, x);
  }));
  app.post('/v1/org/members/:id/roles', async (req) => bo.lenh(req, 'doi_vai', 'system', async (t, nd, b) => {
    const x = z.object({ add: z.array(z.enum(['owner', 'purchaser', 'accountant', 'warehouse', 'site_receiver', 'coop_board', 'collection_staff', 'coop_member'])).optional(), remove: z.array(z.string()).optional(), approval_limit_vnd: soNguyen.nullable().optional() }).parse(b);
    const m = await import('../nghiep-vu/truy-van.ts'); return m.doiVai(t, nd, P(req).id, x);
  }));
  app.get('/v1/orders/:id/cancellation-requests', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/truy-van.ts'); return bo.doc((t) => m.yeuCauHuyCuaDon(t, nd, P(req).id)); });
  app.get('/v1/orders/:id/disputes', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/truy-van.ts'); return bo.doc((t) => m.tranhChapCuaDon(t, nd, P(req).id)); });
  app.get('/v1/payments/:id/instruction', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/truy-van.ts'); return bo.doc((t) => m.huongDanTraThang(t, nd, P(req).id)); });
  app.get('/v1/payout-accounts', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/to-chuc.ts'); return bo.doc((t) => m.danhSachTaiKhoan(t, nd)); });
  const phiaToChuc = async (_t: GiaoDich, nd: NguoiDung): Promise<Phia> => (nd.thanhVien.canSell ? 'seller' : 'buyer');
  app.post('/v1/payout-accounts', async (req) => {
    // Yếu tố thứ hai: OTP tới số của chủ tài khoản ngay lúc yêu cầu (gửi bằng /v1/auth/otp/send).
    const nd0 = await bo.xacThuc(req);
    const b0 = z.object({ challenge_id: z.string(), code: z.string() }).passthrough().parse(req.body);
    const sdt = await ht.db.doc((t) => t.gtri<string>(`SELECT replace(convert_from(phone_enc,'UTF8'),'TEST-PLAINTEXT:','') FROM pii.user_contacts WHERE user_id=$1`, [nd0.userId]));
    ht.phien.kiemOtpDangNhap(b0.challenge_id, b0.code, sdt);
    return bo.lenh(req, 'yeu_cau_doi_tai_khoan', phiaToChuc, async (t, nd, b) => {
    const x = z.object({ bank_code: z.string(), account_no: z.string(), holder_name: z.string() }).parse(b);
    const m = await import('../nghiep-vu/to-chuc.ts'); return m.yeuCauTaiKhoan(t, nd, {...x,verified_otp:{id:'bank-change-'+b0.challenge_id,mac:createHmac('sha256',ht.cfg.otpPepper).update(b0.challenge_id+'|bank_account_change|'+nd.userId+'|'+nd.thanhVien.orgId+'|'+x.bank_code+'|'+x.account_no+'|'+x.holder_name).digest()}});
  }); });
  app.post('/v1/payout-accounts/:id/activate', async (req) => bo.lenh(req, 'kich_hoat_tai_khoan', phiaToChuc, async (t, nd) => { const m = await import('../nghiep-vu/to-chuc.ts'); return m.kichHoatTaiKhoan(t, nd, P(req).id); }));
  app.post('/v1/payout-accounts/:id/not-me', async (req) => bo.lenh(req, 'khong_phai_toi', phiaToChuc, async (t, nd) => { const m = await import('../nghiep-vu/to-chuc.ts'); return m.khongPhaiToi(t, nd, P(req).id); }));
  // Chủ đầu tiên qua xác minh hai người (0034): người lập field/risk/supervisor/support, người duyệt risk/supervisor khác người lập.
  app.post('/v1/ops/orgs/:id/owner-verifications', async (req) => bo.lenh(req, 'de_xuat_chu_dau_tien', 'ops', async (t, nd, b) => { const m = await import('../nghiep-vu/to-chuc.ts'); return m.deXuatChuDauTien(t, nd, P(req).id, b); }));
  app.post('/v1/ops/owner-verifications/:id/approve', async (req) => bo.lenh(req, 'duyet_chu_dau_tien', 'ops', async (t, nd) => { const m = await import('../nghiep-vu/to-chuc.ts'); return m.duyetChuDauTien(t, nd, P(req).id); }));
  app.get('/v1/ops/owner-verifications', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/to-chuc.ts'); return bo.doc((t) => m.danhSachXacMinhChu(t, nd)); });
  app.post('/v1/ops/orgs/:id/verify', async (req) => bo.lenh(req, 'xac_minh_to_chuc', 'ops', async (t, nd, b) => { const m = await import('../nghiep-vu/to-chuc.ts'); return m.xacMinhToChuc(t, nd, P(req).id, b); }));

  // ---------------- OTP hành động ----------------
  app.post('/v1/otp/challenges', async (req) => {
    const nd = await bo.xacThuc(req);
    const b = z.object({ purpose: z.enum(['contract_sign', 'amendment_sign', 'money_received']), document_id: uuid.optional(), payment_id: uuid.optional(), amount_vnd: soNguyen.optional() }).parse(req.body);
    return ht.otp.taoThuThach(nd, b);
  });

  // ---------------- Danh mục ----------------
  app.get('/v1/products', async () => ht.db.doc((t) => t.q(`SELECT p.code,p.name_vi,p.group_code,p.open_tier,p.current_profile_version,
      (SELECT json_agg(json_build_object('grade_code',g.grade_code,'label',g.label_vi,'rank',g.rank,'is_substandard',g.is_substandard) ORDER BY g.rank) FROM core.product_grades g WHERE g.product_id=p.id AND g.profile_version=p.current_profile_version) grades
      FROM core.products p ORDER BY p.code`)));
  app.get('/v1/products/:code/profile', async (req) => ht.db.doc(async (t) => {
    const r = await t.mot(`SELECT p.code,p.name_vi,pp.* FROM core.products p JOIN core.product_profiles pp ON pp.product_id=p.id AND pp.profile_version=p.current_profile_version WHERE p.code=$1`, [P(req).code]);
    if (!r) throw loi('KHONG_TIM_THAY');
    const reasons = await t.q(`SELECT reason_code,label_vi,is_safety FROM core.product_reject_reasons rr JOIN core.products p ON p.id=rr.product_id WHERE p.code=$1`, [P(req).code]);
    return { ...r, reject_reasons: reasons };
  }));
  app.get('/v1/reference-prices', async (req) => {
    const q = z.object({ product: z.string(), grade: z.string(), region: z.string().optional() }).parse(req.query);
    return ht.db.doc(async (t) => {
      const p = await t.gtri<string>(`SELECT id FROM core.products WHERE code=$1`, [q.product]);
      if (!p) throw loi('KHONG_TIM_THAY');
      const g = await giaThamKhao(t, p, q.grade, q.region ?? null);
      return g ? { status: 'du_du_lieu', price_vnd: g.gia.toString(), order_count: g.soDon, pair_count: g.soCap, scope: g.scope, as_of: g.asOf } : { status: 'chua_du_du_lieu' };
    });
  });

  // ---------------- Tệp, ảnh ----------------
  app.post('/v1/files', async (req) => bo.lenh(req, 'tai_tep', 'system', async (t, nd, b) => {
    const x = z.object({ mime: z.string(), data_base64: z.string(), entity: z.enum(['lot', 'order', 'delivery', 'acceptance', 'payment', 'dispute', 'organization', 'production_site']), entity_id: uuid, captured_in_app: z.boolean(), lat: z.number().optional(), lng: z.number().optional() }).parse(b);
    let orderId: string | null = null;
    if (x.entity === 'lot') { const l = await t.mot<any>(`SELECT seller_org_id FROM core.lots WHERE id=$1`, [x.entity_id]); if (!l || l.seller_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY'); }
    else if (x.entity === 'order') { await phiaDon(t, nd, x.entity_id); orderId = x.entity_id; }
    else if (x.entity === 'delivery') { await phiaDot(t, nd, x.entity_id); orderId = await t.gtri(`SELECT order_id FROM core.deliveries WHERE id=$1`, [x.entity_id]); }
    else if (x.entity === 'payment') { await phiaKhoan(t, nd, x.entity_id); orderId = await t.gtri(`SELECT order_id FROM core.direct_payments WHERE id=$1`, [x.entity_id]); }
    else if (x.entity === 'organization') {
      const laVanHanh = nd.vaiVanHanh.some((v) => ['field', 'risk', 'supervisor', 'support'].includes(v));
      if (!laVanHanh && x.entity_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
      if (laVanHanh) return luuBangChung(t, nd.userId, x.entity_id, x as any, null);
    }
    return luuBangChung(t, nd.userId, nd.thanhVien.orgId, x as any, orderId, !!nd.thanhVien.nguoiGiup);
  }));

  // ---------------- Lô ----------------
  app.post('/v1/lots', async (req) => bo.lenh(req, 'tao_lo', 'seller', async (t, nd, b) => { canQuyen(nd, 'lot.create'); return Lo.taoLo(t, nd, b); }));
  app.post('/v1/lots/:id/publish', async (req) => bo.lenh(req, 'dang_lo', 'seller', async (t, nd, b) => { canQuyen(nd, 'lot.publish'); return Lo.dangLo(t, nd, P(req).id, b.expected_revision); }));
  app.post('/v1/lots/:id/confirm-available', async (req) => bo.lenh(req, 'xac_nhan_con_hang', 'seller', async (t, nd) => { canQuyen(nd, 'lot.update'); return Lo.xacNhanConHang(t, nd, P(req).id); }));
  app.post('/v1/lots/:id/price', async (req) => bo.lenh(req, 'sua_gia', 'seller', async (t, nd, b) => { canQuyen(nd, 'lot.price'); return Lo.suaGia(t, nd, P(req).id, b); }));
  app.post('/v1/lots/:id/close', async (req) => bo.lenh(req, 'dong_lo', 'seller', async (t, nd) => { canQuyen(nd, 'lot.close'); return Lo.dongLo(t, nd, P(req).id); }));
  app.get('/v1/lots', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; return bo.doc((t) => Lo.danhSachLo(t, nd, { mine: q.mine === 'true', product_code: q.product, grade_code: q.grade })); });
  app.get('/v1/lots/:id', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Lo.xemLo(t, nd, P(req).id)); });
  app.get('/v1/lots/:id/qty', async (req) => { await bo.xacThuc(req); return bo.doc((t) => Lo.soLuongLo(t, P(req).id)); });

  // ---------------- Nhu cầu ----------------
  app.post('/v1/demands', async (req) => bo.lenh(req, 'tao_nhu_cau', 'buyer', async (t, nd, b) => { canQuyen(nd, 'demand.create'); return NhuCau.taoNhuCau(t, nd, b); }));
  app.post('/v1/demands/:id/publish', async (req) => bo.lenh(req, 'dang_nhu_cau', 'buyer', async (t, nd, b) => { canQuyen(nd, 'demand.create'); return NhuCau.dangNhuCau(t, nd, P(req).id, b.expected_revision); }));
  app.post('/v1/demands/:id/lines/:lineId/max-price', async (req) => bo.lenh(req, 'sua_nhu_cau', 'buyer', async (t, nd, b) => { canQuyen(nd, 'demand.create'); return NhuCau.suaGiaToiDa(t, nd, P(req).id, P(req).lineId, b.max_price_vnd); }));
  app.post('/v1/demands/:id/close', async (req) => bo.lenh(req, 'dong_nhu_cau', 'buyer', async (t, nd) => { canQuyen(nd, 'demand.create'); return NhuCau.dongNhuCau(t, nd, P(req).id); }));
  app.get('/v1/demands', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; return bo.doc((t) => NhuCau.danhSachNhuCau(t, nd, { mine: q.mine === 'true', product_code: q.product })); });
  app.get('/v1/demands/:id', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => NhuCau.xemNhuCau(t, nd, P(req).id)); });
  app.get('/v1/demands/:id/matches', async (req) => {
    const nd = await bo.xacThuc(req);
    const { ghepNhuCau } = await import('../nghiep-vu/ghep.ts');
    return ghepNhuCau(ht, nd, P(req).id);
  });

  // ---------------- Lời chào ----------------
  app.post('/v1/offers', async (req) => bo.lenh(req, 'gui_loi_chao', async (_t, _nd) => ((req.body as any)?.direction === 'seller_quote' ? 'seller' : 'buyer'), (t, nd, b) => LoiChao.guiLoiChao(t, nd, b)));
  app.post('/v1/offers/:id/accept', async (req) => bo.lenh(req, 'dong_y', (t, nd) => phiaLoiChao(t, nd, P(req).id), (t, nd, b) => LoiChao.dongYLoiChao(t, nd, P(req).id, b.expected_revision)));
  app.post('/v1/offers/:id/counter', async (req) => bo.lenh(req, 'tra_gia', (t, nd) => phiaLoiChao(t, nd, P(req).id), (t, nd, b) => LoiChao.traGia(t, nd, P(req).id, b.price_vnd, b.qty_g)));
  app.post('/v1/offers/:id/reject', async (req) => bo.lenh(req, 'tu_choi', (t, nd) => phiaLoiChao(t, nd, P(req).id), (t, nd) => LoiChao.tuChoiLoiChao(t, nd, P(req).id)));
  app.post('/v1/offers/:id/withdraw', async (req) => bo.lenh(req, 'rut', (t, nd) => phiaLoiChao(t, nd, P(req).id), (t, nd) => LoiChao.rutLoiChao(t, nd, P(req).id)));
  app.get('/v1/offers', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => LoiChao.danhSachLoiChao(t, nd)); });
  app.get('/v1/offers/:id', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => LoiChao.xemLoiChao(t, nd, P(req).id)); });

  // ---------------- Đơn ----------------
  app.post('/v1/orders', async (req) => bo.lenh(req, 'lap_don', 'buyer', (t, nd, b) => Don.lapDon(t, nd, b)));
  app.post('/v1/orders/:id/submit-approval', async (req) => bo.lenh(req, 'gui_duyet', 'buyer', (t, nd) => Don.guiDuyet(t, nd, P(req).id)));
  app.post('/v1/orders/:id/approve', async (req) => bo.lenh(req, 'duyet', 'buyer', (t, nd, b) => Don.duyetNoiBo(t, nd, P(req).id, true, b.reason)));
  app.post('/v1/orders/:id/reject-approval', async (req) => bo.lenh(req, 'tu_choi_duyet', 'buyer', (t, nd, b) => Don.duyetNoiBo(t, nd, P(req).id, false, b.reason ?? 'Không duyệt')));
  app.post('/v1/orders/:id/sign', async (req) => {
    const nd = await bo.xacThuc(req);
    const b = z.object({ challenge_id: z.string(), code: z.string(), commitment_ack: z.boolean().optional(), abnormal_price_ack: z.boolean().optional(), device_id: z.string().optional() }).passthrough().parse(req.body);
    const cu = await bo.layLai(req, 'ky'); if (cu) return cu;
    await ht.otp.xacMinh(nd, b.challenge_id, b.code);
    return bo.lenh(req, 'ky', (t, n) => phiaDon(t, n, P(req).id), (t, n, body) => Don.kyDon(t, n, P(req).id, body, body.expected_revision));
  });
  app.post('/v1/orders/:id/decline', async (req) => bo.lenh(req, 'tu_choi_ky', 'seller', (t, nd, b) => Don.tuChoiKy(t, nd, P(req).id, b.reason)));
  app.post('/v1/orders/:id/withdraw', async (req) => bo.lenh(req, 'rut_don', 'buyer', (t, nd, b) => Don.rutDon(t, nd, P(req).id, b.reason)));
  app.get('/v1/orders', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Don.danhSachDon(t, nd)); });
  app.get('/v1/orders/:id', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Don.xemDon(t, nd, P(req).id)); });
  app.get('/v1/orders/:id/terms', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Don.tomTatDieuKhoan(t, nd, P(req).id)); });
  app.get('/v1/orders/:id/money', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Tien.tienCuaDon(t, nd, P(req).id)); });
  app.get('/v1/orders/:id/deposit-instruction', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Tien.huongDanCoc(t, nd, P(req).id)); });

  // ---------------- Đề nghị sửa, phụ lục ----------------
  app.get('/v1/orders/:id/amendments', async (req) => { const nd = await bo.xacThuc(req); const { danhSachDeNghi } = await import('../nghiep-vu/de-nghi.ts'); return bo.doc((t) => danhSachDeNghi(t, nd, P(req).id)); });
  app.post('/v1/orders/:id/amendments', async (req) => bo.lenh(req, 'gui_de_nghi', (t, nd) => phiaDon(t, nd, P(req).id), async (t, nd, b) => {
    const x = z.object({ kind: z.enum(['change_date', 'increase_qty', 'decrease_qty', 'force_majeure_reduction', 'change_price', 'change_receiver']), payload: z.record(z.any()), reason: z.string().optional(), evidence_document_ids: z.array(uuid).optional(), notice_days_before_delivery: z.number().int().optional() }).parse(b);
    const { guiDeNghi } = await import('../nghiep-vu/de-nghi.ts'); return guiDeNghi(ht, t, nd, P(req).id, x as any);
  }));
  const phiaDeNghi = async (t: GiaoDich, nd: NguoiDung, id: string) => phiaDon(t, nd, await t.gtri(`SELECT order_id FROM core.amendments WHERE id=$1`, [id]));
  app.post('/v1/amendments/:id/accept', async (req) => bo.lenh(req, 'dong_y_de_nghi', (t, nd) => phiaDeNghi(t, nd, P(req).id), async (t, nd) => { const m = await import('../nghiep-vu/de-nghi.ts'); return m.dongYDeNghi(ht, t, nd, P(req).id); }));
  app.post('/v1/amendments/:id/reject', async (req) => bo.lenh(req, 'khong_dong_y_de_nghi', (t, nd) => phiaDeNghi(t, nd, P(req).id), async (t, nd) => { const m = await import('../nghiep-vu/de-nghi.ts'); return m.tuChoiDeNghi(t, nd, P(req).id); }));
  app.post('/v1/amendments/:id/withdraw', async (req) => bo.lenh(req, 'rut_de_nghi', (t, nd) => phiaDeNghi(t, nd, P(req).id), async (t, nd) => { const m = await import('../nghiep-vu/de-nghi.ts'); return m.rutDeNghi(t, nd, P(req).id); }));
  app.post('/v1/amendments/:id/sign', async (req) => {
    const nd = await bo.xacThuc(req);
    const b = z.object({ challenge_id: z.string(), code: z.string(), device_id: z.string().optional() }).passthrough().parse(req.body);
    const cu = await bo.layLai(req, 'ky_phu_luc'); if (cu) return cu;
    await ht.otp.xacMinh(nd, b.challenge_id, b.code);
    return bo.lenh(req, 'ky_phu_luc', (t, n) => phiaDeNghi(t, n, P(req).id), async (t, n, body) => { const m = await import('../nghiep-vu/de-nghi.ts'); return m.kyPhuLuc(ht, t, n, P(req).id, body); });
  });

  // ---------------- Hủy ----------------
  app.post('/v1/orders/:id/cancel', async (req) => bo.lenh(req, 'huy_truoc_coc', (t, nd) => phiaDon(t, nd, P(req).id), (t, nd, b) => Huy.huyTruocCoc(ht, t, nd, P(req).id, b.reason)));
  app.post('/v1/orders/:id/cancellation-requests', async (req) => bo.lenh(req, 'xin_huy', (t, nd) => phiaDon(t, nd, P(req).id), (t, nd, b) => Huy.xinHuy(ht, t, nd, P(req).id, b)));
  app.get('/v1/orders/:id/cancellation-preview', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; return bo.doc((t) => Huy.heQuaHuy(t, nd, P(req).id, q.reason_kind)); });
  app.post('/v1/cancellation-requests/:id/accept', async (req) => bo.lenh(req, 'dong_y_huy', async (t, nd) => phiaDon(t, nd, await t.gtri(`SELECT order_id FROM core.cancellation_requests WHERE id=$1`, [P(req).id])), (t, nd) => Huy.traLoiHuy(ht, t, nd, P(req).id, true)));
  app.post('/v1/cancellation-requests/:id/reject', async (req) => bo.lenh(req, 'khong_dong_y_huy', async (t, nd) => phiaDon(t, nd, await t.gtri(`SELECT order_id FROM core.cancellation_requests WHERE id=$1`, [P(req).id])), (t, nd) => Huy.traLoiHuy(ht, t, nd, P(req).id, false)));

  // ---------------- Tiền ----------------
  app.get('/v1/orders/:id/payments', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => Tien.danhSachKhoan(t, nd, P(req).id)); });
  app.post('/v1/payments/:id/report', async (req) => bo.lenh(req, 'bao_da_tra', (t, nd) => phiaKhoan(t, nd, P(req).id), (t, nd, b) => Tien.baoDaTra(t, nd, P(req).id, z.object({ amount_vnd: soNguyen, method: z.enum(['bank_transfer', 'cash']), evidence_document_id: uuid.optional() }).parse(b))));
  app.post('/v1/payments/:id/confirm', async (req) => {
    const nd = await bo.xacThuc(req);
    const b = z.object({ challenge_id: z.string(), code: z.string(), amount_vnd: soNguyen, result: z.enum(['full', 'partial']), bank_txn_ref: z.string().optional(), method: z.enum(['bank_transfer', 'cash']).optional(), receipt_document_id: uuid.optional() }).passthrough().parse(req.body);
    const cu = await bo.layLai(req, 'xac_nhan_nhan'); if (cu) return cu;
    await ht.otp.xacMinh(nd, b.challenge_id, b.code);
    return bo.lenh(req, 'xac_nhan_nhan', (t, n) => phiaKhoan(t, n, P(req).id), (t, n, body) => Tien.xacNhanDaNhan(ht, t, n, P(req).id, body));
  });
  app.post('/v1/payments/:id/not-received', async (req) => bo.lenh(req, 'bao_chua_nhan', (t, nd) => phiaKhoan(t, nd, P(req).id), (t, nd, b) => Tien.baoChuaNhan(t, nd, P(req).id, b)));

  // ---------------- Giao nhận ----------------
  app.get('/v1/deliveries/:id', async (req) => { const nd = await bo.xacThuc(req); return bo.doc((t) => GiaoNhan.xemDot(t, nd, P(req).id)); });
  app.get('/v1/deliveries/:id/readiness', async (req) => { const nd = await bo.xacThuc(req); return bo.doc(async (t) => { await phiaDot(t, nd, P(req).id); return GiaoNhan.theSanSang(t, P(req).id); }); });
  app.post('/v1/deliveries/:id/receiver', async (req) => bo.lenh(req, 'chi_dinh_nguoi_nhan', 'buyer', (t, nd, b) => GiaoNhan.chiDinhNguoiNhan(ht, t, nd, P(req).id, z.object({ user_id: uuid }).parse(b).user_id)));
  app.post('/v1/deliveries/:id/trip', async (req) => bo.lenh(req, 'dat_xe', (t, nd) => phiaDot(t, nd, P(req).id), (t, nd, b) => GiaoNhan.datXe(ht, t, nd, P(req).id, z.object({ plate_no: z.string(), freight_vnd: soNguyen.optional() }).parse(b))));
  app.post('/v1/deliveries/:id/receipt-qr', async (req) => bo.lenh(req, 'mo_qr_nhan_hang', 'buyer', (t, nd) => GiaoNhan.layQrNhanHang(ht, t, nd, P(req).id)));
  app.post('/v1/deliveries/:id/start-check', async (req) => bo.lenh(req, 'bat_dau_nghiem_thu', (t, nd) => phiaDot(t, nd, P(req).id), (t, nd, b) => GiaoNhan.batDauNghiemThu(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/acceptance', async (req) => bo.lenh(req, 'gui_ket_qua', 'buyer', (t, nd, b) => GiaoNhan.guiKetQua(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/acceptance/agree', async (req) => bo.lenh(req, 'dong_y_ket_qua', 'seller', (t, nd, b) => GiaoNhan.dongYKetQua(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/acceptance/dispute', async (req) => bo.lenh(req, 'phan_doi_dong', 'seller', (t, nd, b) => GiaoNhan.phanDoiDong(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/ship', async (req) => bo.lenh(req, 'xuat_hang', 'seller', (t, nd, b) => GiaoNhan.xuatHang(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/receive', async (req) => bo.lenh(req, 'ky_nhan_tai_kho', 'buyer', (t, nd, b) => GiaoNhan.kyNhanTaiKho(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/arrival', async (req) => bo.lenh(req, 'ky_nhan_tai_noi_den', 'buyer', (t, nd, b) => GiaoNhan.kyNhanNoiDen(ht, t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/arrival/complaint', async (req) => bo.lenh(req, 'khieu_nai_khac_mau', 'buyer', async (t, nd, b) => {
    const { khieuNaiKhacMau } = await import('../nghiep-vu/tranh-chap.ts');
    return khieuNaiKhacMau(ht, t, nd, P(req).id, b);
  }));
  app.get('/v1/disputes/:id', async (req) => {
    const nd = await bo.xacThuc(req);
    return bo.doc(async (t) => {
      const x = await t.mot<any>(`SELECT d.id,d.order_id,d.status,d.disputed_qty::text disputed_qty_g,d.reason,d.claim_kind,d.created_at,
        (SELECT json_agg(json_build_object('id',i.id,'fee_vnd',i.fee_vnd::text,'due_at',i.due_at,'result',(SELECT r.result FROM core.inspection_results r WHERE r.inspection_id=i.id LIMIT 1))) FROM core.inspections i WHERE i.dispute_id=d.id) inspections
        FROM core.disputes d WHERE d.id=$1`, [P(req).id]);
      if (!x) throw loi('KHONG_TIM_THAY');
      await phiaDon(t, nd, x.order_id);
      return x;
    });
  });
  app.post('/v1/deliveries/:id/arrival/confirm', async (req) => bo.lenh(req, 'xac_nhan_den_dat', 'buyer', (t, nd) => GiaoNhan.xacNhanDenDat(ht, t, nd, P(req).id)));

  // ---------------- Tài liệu ----------------
  app.get('/v1/documents/:id', async (req) => {
    const nd = await bo.xacThuc(req);
    return bo.doc(async (t) => {
      const d = (await t.mot<any>(`SELECT d.id,d.code,d.doc_type,d.version_no,d.status,d.order_id,d.owner_org_id,encode(d.content_sha256,'hex') content_sha256,encode(d.file_sha256,'hex') file_sha256,d.size_bytes,d.created_at,d.canonical_content,
        (SELECT json_agg(json_build_object('party',s.party,'method',s.method,'signed_at',s.signed_at,'signer_user_id',s.signer_user_id,'signed_sha256',encode(s.signed_sha256,'hex'))) FROM core.signatures s WHERE s.document_id=d.id) signatures FROM core.documents d WHERE d.id=$1`, [P(req).id])) ?? docBanTrinhBay(P(req).id);
      if (!d) throw loi('KHONG_TIM_THAY');
      if(d.presentation_only && !await t.mot(`SELECT 1 FROM core.settlements WHERE id=$1 AND order_id=$2`,[d.canonical_content.settlement_id,d.order_id]))throw loi('KHONG_TIM_THAY');
      if (d.order_id) await phiaDon(t, nd, d.order_id); else if (d.owner_org_id && d.owner_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
      return d;
    });
  });
  app.get('/v1/documents/:id/file', async (req, reply) => {
    const nd = await bo.xacThuc(req);
    const d = await bo.doc(async (t) => {
      const x = (await t.mot<any>(`SELECT code, storage_key, mime_type, order_id, owner_org_id, doc_type, entity, entity_id FROM core.documents WHERE id=$1`, [P(req).id])) ?? docBanTrinhBay(P(req).id);
      if (!x) throw loi('KHONG_TIM_THAY');
      if(x.presentation_only && !await t.mot(`SELECT 1 FROM core.settlements WHERE id=$1 AND order_id=$2`,[x.canonical_content.settlement_id,x.order_id]))throw loi('KHONG_TIM_THAY');
      // Ngoại lệ hẹp: ảnh bằng chứng của lô đã công khai (không phải draft/đóng) đọc được bởi người đăng nhập bất kỳ.
      // Chứng từ thanh toán/đơn/tổ chức khác vẫn theo phía đơn hoặc tổ chức sở hữu.
      const anhLoCongKhai = !x.order_id && x.doc_type === 'evidence' && x.entity === 'lot' && String(x.mime_type).startsWith('image/')
        && !!(await t.mot(`SELECT 1 FROM core.lots WHERE id=$1 AND status IN ('on_sale','upcoming','reserved','sold_out')`, [x.entity_id]));
      if (anhLoCongKhai) return x;
      if (x.order_id) await phiaDon(t, nd, x.order_id); else if (x.owner_org_id && x.owner_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
      return x;
    });
    const duoi: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    reply.header('content-type', d.mime_type).header('content-disposition', `inline; filename="${d.code}.${duoi[d.mime_type] ?? 'bin'}"`);
    return reply.send(docTep(d.storage_key));
  });
  // Trang xác minh công khai (QR-06): chỉ metadata, không trả bản gốc (N-05).
  app.get('/v1/verify/:code', async (req) => bo.doc(async (t) => {
    const d = await t.mot<any>(`SELECT code,doc_type,version_no,status,encode(content_sha256,'hex') content_sha256,encode(file_sha256,'hex') file_sha256,created_at,
      (SELECT json_agg(json_build_object('party',party,'method',method,'signed_at',signed_at)) FROM core.signatures s WHERE s.document_id=d.id) signatures
      FROM core.documents d WHERE code=$1 AND doc_type<>'evidence'`, [P(req).code]);
    if (!d) throw loi('KHONG_TIM_THAY');
    return { ...d, ghi_chu: 'DỮ LIỆU THỬ. Ký OTP là chữ ký điện tử đơn giản; ký số là mô phỏng, không phải chữ ký số công cộng.' };
  }));
  app.post('/v1/verify/:code/file', async (req) => {
    const b = z.object({ data_base64: z.string().max(14_000_000) }).parse(req.body);
    const { createHash } = await import('node:crypto');
    const sha = createHash('sha256').update(Buffer.from(b.data_base64, 'base64')).digest('hex');
    return bo.doc(async (t) => {
      const d = await t.mot<any>(`SELECT encode(file_sha256,'hex') f FROM core.documents WHERE code=$1`, [P(req).code]);
      if (!d) throw loi('KHONG_TIM_THAY');
      return { khop: d.f === sha, sha256_tep_tai_len: sha };
    });
  });

  // ---------------- Webhook ngân hàng ----------------
  app.post('/v1/webhooks/bank', async (req) => {
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') h[k.toLowerCase()] = v;
    const r = await Tien.xuLyWebhookNganHang(ht, req.rawBody ?? '', h);
    await Tien.dayLenhSangNganHang(ht);
    return r;
  });

  app.post('/v1/webhooks/inspection', async (req) => {
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') h[k.toLowerCase()] = v;
    const { xuLyWebhookKiemDinh } = await import('../nghiep-vu/tranh-chap.ts');
    const r = await xuLyWebhookKiemDinh(ht, req.rawBody ?? '', h);
    await Tien.dayLenhSangNganHang(ht);
    return r;
  });

  // ---------------- Vận hành ----------------
  app.get('/v1/ops/tasks', async (req) => { const nd = await bo.xacThuc(req); canQuyen(nd, 'ops.view'); return bo.doc((t) => VanHanh.danhSachViec(t, req.query as any)); });
  // ---- Bản 23: hộp việc, phân bổ phí, khiếu nại sau giao, tìm nguồn định kỳ ----
  const B23 = () => import('../nghiep-vu/ban-23.ts');
  app.get('/v1/ops/dossiers', async (req) => { const nd = await bo.xacThuc(req); canQuyen(nd, 'ops.view'); const m = await B23(); return bo.doc((t) => m.hopViec(t, nd, req.query)); });
  app.post('/v1/ops/dossiers/assign', async (req) => bo.lenh(req, 'giao_ho_so', 'ops', async (t, nd, b) => (await B23()).giaoHoSo(t, nd, b)));
  app.get('/v1/orders/:id/dossiers', async (req) => { const nd = await bo.xacThuc(req); const m = await B23(); return bo.doc((t) => m.hoSoDon(t, nd, P(req).id)); });
  app.post('/v1/ops/inspections/:id/fee-allocation-proposals', async (req) => bo.lenh(req, 'de_xuat_phan_bo_phi', 'ops', async (t, nd, b) => (await B23()).deXuatPhanBoPhi(t, nd, P(req).id, b)));
  app.post('/v1/ops/fee-allocations', async (req) => bo.lenh(req, 'ap_phan_bo_phi', 'ops', async (t, nd, b) => (await B23()).apPhanBoPhi(t, nd, b)));
  app.post('/v1/acceptance-lines/:id/post-delivery-claim', async (req) => bo.lenh(req, 'khieu_nai_sau_giao', 'buyer', async (t, nd, b) => (await B23()).khieuNaiSauGiao(t, nd, P(req).id, b)));
  app.post('/v1/sourcing-agreements', async (req) => bo.lenh(req, 'lap_thoa_thuan_nguon', 'buyer', async (t, nd, b) => (await B23()).lapThoaThuanNguon(t, nd, b)));
  app.get('/v1/sourcing-agreements/:id/coverage', async (req) => { const nd = await bo.xacThuc(req); const m = await B23(); return bo.doc((t) => m.doPhuNguon(t, nd, P(req).id)); });
  app.post('/v1/sourcing-agreements/:id/days', async (req) => bo.lenh(req, 'chot_ngay_nguon', 'buyer', async (t, nd, b) => (await B23()).chotNgay(t, nd, P(req).id, b)));
  app.post('/v1/sourcing-agreements/:id/stop', async (req) => bo.lenh(req, 'dung_tim_nguon', 'buyer', async (t, nd) => (await B23()).dungNguon(t, nd, P(req).id)));
  app.post('/v1/ops/sourcing-days/:id/allocations', async (req) => bo.lenh(req, 'de_xuat_nguon', 'ops', async (t, nd, b) => (await B23()).deXuatNguon(t, nd, P(req).id, b)));
  app.post('/v1/sourcing-allocations/:id/approve', async (req) => bo.lenh(req, 'duyet_nguon', 'buyer', async (t, nd) => (await B23()).duyetNguon(t, nd, P(req).id)));
  app.post('/v1/sourcing-allocations/:id/commit', async (req) => bo.lenh(req, 'cam_ket_nguon', 'seller', async (t, nd) => (await B23()).camKetNguon(t, nd, P(req).id)));
  app.post('/v1/sourcing-allocations/:id/change', async (req) => bo.lenh(req, 'xin_doi_luong', 'buyer', async (t, nd, b) => (await B23()).xinDoiLuong(t, nd, P(req).id, b)));
  app.post('/v1/allocation-changes/:id/answer', async (req) => bo.lenh(req, 'tra_loi_doi_luong', 'seller', async (t, nd, b) => (await B23()).traLoiDoiLuong(t, nd, P(req).id, b)));
  app.post('/v1/sourcing-allocations/:id/shortfall', async (req) => bo.lenh(req, 'bao_giao_thieu', 'seller', async (t, nd, b) => (await B23()).baoGiaoThieu(t, nd, P(req).id, b)));
  app.get('/v1/sourcing-cost-claims', async (req) => { const nd = await bo.xacThuc(req); const m = await B23(); return bo.doc((t) => m.dsChiPhiDoiLuong(t, nd)); });
  app.post('/v1/sourcing-cost-claims/:id/paid', async (req) => bo.lenh(req, 'xac_nhan_da_tra_chi_phi', 'seller', async (t, nd, b) => (await B23()).xacNhanDaTraChiPhi(t, nd, P(req).id, b)));
  app.post('/v1/sourcing-cost-claims/:id/answer', async (req) => bo.lenh(req, 'tra_loi_chi_phi_doi_luong', 'buyer', async (t, nd, b) => (await B23()).traLoiChiPhiDoiLuong(t, nd, P(req).id, b)));
  app.post('/v1/credit-terms', async (req) => bo.lenh(req, 'dat_dieu_khoan_tra', 'seller', async (t, nd, b) => (await B23()).datDieuKhoanTra(t, nd, b)));
  app.post('/v1/ops/tasks/:id/claim', async (req) => bo.lenh(req, 'nhan_viec', 'ops', (t, nd) => VanHanh.nhanViec(t, nd, P(req).id)));
  app.post('/v1/ops/tasks/:id/resolve', async (req) => bo.lenh(req, 'xong_viec', 'ops', (t, nd, b) => VanHanh.xongViec(t, nd, P(req).id, b)));
  app.post('/v1/ops/instructions/:id/callback', async (req) => bo.lenh(req, 'goi_lai_truoc_chi', 'ops', (t, nd, b) => VanHanh.xacNhanGoiLai(t, nd, P(req).id, b)));
  app.post('/v1/ops/reconcile', async (req) => bo.lenh(req, 'doi_soat', 'ops', async (t, nd) => { canQuyen(nd, 'ops.reconcile'); return Tien.doiSoat(ht, t); }));

  // ---------------- Mức Vừa cho giao diện ----------------
  app.get('/v1/money/summary', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.soTien(t, nd, req.query as any)); });
  app.get('/v1/demands/:id/offer-comparison', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.soSanhLoiChao(t, nd, P(req).id)); });
  // App bán 0056–0057: mặt hàng xác minh, cơ sở, nhật ký, bán gấp, hợp đồng vụ.
  const NV = () => import('../nghiep-vu/nha-vuon.ts');
  app.get('/v1/seller/verified-products', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await NV(); return bo.doc((t) => m.matHangDaXacMinh(t, nd, q.all === 'true')); });
  app.get('/v1/production-sites', async (req) => { const nd = await bo.xacThuc(req); const m = await NV(); return bo.doc((t) => m.danhSachCoSo(t, nd)); });
  app.post('/v1/production-sites', async (req) => bo.lenh(req, 'tao_co_so', 'seller', async (t, nd, b) => (await NV()).taoCoSo(t, nd, b)));
  app.get('/v1/farm-diary', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await NV(); return bo.doc((t) => m.nhatKy(t, nd, q)); });
  app.post('/v1/farm-diary', async (req) => bo.lenh(req, 'ghi_nhat_ky', 'seller', async (t, nd, b) => (await NV()).ghiNhatKy(t, nd, b)));
  app.post('/v1/lots/:id/urgent-sale', async (req) => bo.lenh(req, 'ban_gap', 'seller', async (t, nd, b) => (await NV()).banGap(t, nd, P(req).id, b)));
  app.get('/v1/seasonal-orders', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await NV(); return bo.doc((t) => m.danhSachDonVu(t, nd, q)); });
  app.get('/v1/seasonal-orders/:id', async (req) => { const nd = await bo.xacThuc(req); const m = await NV(); return bo.doc((t) => m.chiTietDonVu(t, nd, P(req).id)); });
  app.post('/v1/seasonal-orders', async (req) => bo.lenh(req, 'lap_don_vu', 'buyer', async (t, nd, b) => { const m = await import('../nghiep-vu/don.ts'); return m.lapDonVu(t, nd, b); }));
  app.post('/v1/seasonal-orders/:id/production-updates', async (req) => bo.lenh(req, 'cap_nhat_san_luong', 'seller', async (t, nd, b) => (await NV()).capNhatSanLuong(t, nd, P(req).id, b)));
  app.post('/v1/seasonal-orders/:id/harvest-fix', async (req) => bo.lenh(req, 'de_nghi_chot_luong', 'system', async (t, nd, b) => (await NV()).deNghiChotLuong(t, nd, P(req).id, b)));
  app.post('/v1/deliveries/:id/batch-price', async (req) => bo.lenh(req, 'chot_gia_dot', 'system', async (t, nd) => (await NV()).chotGiaDot(t, nd, P(req).id)));
  // Lối tắt nhà vườn: thời tiết, tin nông nghiệp, lịch sử hoạt động.
  app.get('/v1/weather', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await import('../nghiep-vu/tien-ich.ts'); return bo.doc((t) => m.thoiTiet(t, nd, ht.layMang, q.province)); });
  app.get('/v1/news', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await import('../nghiep-vu/tien-ich.ts'); return bo.doc((t) => m.tinTuc(t, nd, ht.layMang, q.product, q.province)); });
  app.get('/v1/seller/history', async (req) => { const nd = await bo.xacThuc(req); const q: any = req.query; const m = await import('../nghiep-vu/tien-ich.ts'); return bo.doc((t) => m.lichSuNguoiBan(t, nd, { limit: q.limit, before: q.before })); });
  app.get('/v1/plans', async () => { const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.danhMucGoi(t)); });
  app.get('/v1/org/subscription', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.goiHienHanh(t, nd)); });
  app.post('/v1/org/subscription', async (req) => bo.lenh(req, 'doi_goi', 'buyer', async (t, nd, b) => { const m = await import('../nghiep-vu/trung-binh.ts'); return m.doiGoi(t, nd, z.object({ plan_code: z.string() }).parse(b).plan_code); }));
  app.get('/v1/support', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.danhSachHoTro(t, nd)); });
  app.post('/v1/support', async (req) => bo.lenh(req, 'ho_tro', 'system', async (t, nd, b) => { const m = await import('../nghiep-vu/trung-binh.ts'); return m.taoHoTro(t, nd, z.object({ message: z.string().min(1), error_code: z.string().optional(), request_id: z.string().optional(), order_id: uuid.optional() }).parse(b)); }));
  app.get('/v1/lots/:id/source-profile', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/trung-binh.ts'); return bo.doc((t) => m.hoSoNguon(t, nd, P(req).id)); });
  // Trợ lý AI cho app: gọi dịch vụ AI nội bộ kèm bối cảnh thật của tổ chức (lô, hợp đồng) để không bịa số. Không phải lệnh ghi.
  app.post('/v1/assistant/ask', async (req, reply) => {
    const nd = await bo.xacThuc(req);
    const b = z.object({ cau: z.string().min(1).max(600) }).parse(req.body);
    if (!ht.cfg.aiUrl) return reply.status(503).send({ errors: [{ code: 'AI_CHUA_BAT', message: 'Trợ lý AI đang tạm nghỉ.', fix: 'Bác dùng các nút gợi ý hoặc nhắn nhân viên AgiViet.' }] });
    const vai = nd.thanhVien.canSell ? 'ban' : 'mua';
    const duLieu = await ht.db.doc(async (t) => {
      const lo = await t.q<any>(`SELECT l.code, p.name_vi, l.grade_code, l.status, l.declared_qty::text qty_g FROM core.lots l JOIN core.products p ON p.id=l.product_id WHERE l.seller_org_id=$1 AND l.status IN ('on_sale','draft','upcoming') ORDER BY l.created_at DESC LIMIT 8`, [nd.thanhVien.orgId]);
      const don = await t.q<any>(`SELECT code, status FROM core.orders WHERE seller_org_id=$1 OR buyer_org_id=$1 ORDER BY created_at DESC LIMIT 6`, [nd.thanhVien.orgId]);
      return [...lo.map((l) => `Lô ${l.code}: ${l.name_vi} loại ${String(l.grade_code).replace(/^L/, '')}, ${Number(l.qty_g) / 1000} kg, trạng thái ${l.status}`),
        ...don.map((d) => `Hợp đồng ${d.code}: trạng thái ${d.status}`)].join('\n');
    });
    try {
      const r = await fetch(`${ht.cfg.aiUrl}/assistant/ask`, { method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'content-type': 'application/json', ...(ht.cfg.aiKey ? { 'x-ai-key': ht.cfg.aiKey } : {}) }, body: JSON.stringify({ cau: b.cau, vai, du_lieu: duLieu }) });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch {
      return reply.status(503).send({ errors: [{ code: 'AI_TAM_LOI', message: 'Trợ lý chưa trả lời được lúc này.', fix: 'Bác thử lại sau ít phút hoặc nhắn nhân viên AgiViet.' }] });
    }
  });
  app.get('/v1/notifications', async (req) => { const nd = await bo.xacThuc(req); const m = await import('../nghiep-vu/outbox.ts'); const q: any = req.query; return bo.doc((t) => m.thongBao(t, nd, { limit: q.limit ? Number(q.limit) : undefined, after_seq: q.after_seq ? Number(q.after_seq) : undefined })); });

  // ---------------- Môi trường thử ----------------
  app.post('/v1/test/outbox/run', async () => { thu(); const m = await import('../nghiep-vu/outbox.ts'); const tong = { claimed: 0, sent: 0, failed: 0, dead: 0 }; for (let i = 0; i < 100; i++) { const r = await m.chayOutbox(ht, 500); tong.claimed += r.claimed; tong.sent += r.sent; tong.failed += r.failed; tong.dead += r.dead; if (r.claimed === 0) break; } return tong; });
  app.post('/v1/test/ai', async (req) => { thu(); const b = z.object({ url: z.string().nullable() }).parse(req.body); ht.cfg.aiUrl = b.url; return { ai_url: ht.cfg.aiUrl }; });
  app.post('/v1/test/reset', async () => { thu(); await ht.datLai(); return { ok: true, gio: ht.dongHo.now().toISOString() }; });
  app.get('/v1/test/clock', async () => { thu(); return { now: ht.dongHo.now().toISOString() }; });
  app.post('/v1/test/clock', async (req) => {
    thu();
    const b = z.object({ advance_minutes: z.number().int().nonnegative().optional(), set: z.string().optional() }).parse(req.body);
    if (b.set) ht.dongHo.datMoc(Date.parse(b.set));
    if (b.advance_minutes) ht.dongHo.tua(b.advance_minutes * PHUT);
    const r = await chayHenGio(ht);
    return { now: ht.dongHo.now().toISOString(), hen_gio: r };
  });
  app.post('/v1/test/timers/run', async () => { thu(); return chayHenGio(ht); });
  app.post('/v1/test/impersonate', async (req) => {
    thu();
    const b = z.object({ phone: z.string().optional(), user_id: uuid.optional(), org_code: z.string().optional() }).parse(req.body);
    const uid = b.user_id ?? await ht.db.doc((t) => t.gtri<string>(`SELECT user_id FROM pii.user_contacts WHERE phone_hash=digest($1,'sha256')`, [b.phone ?? '']));
    if (!uid) throw loi('KHONG_TIM_THAY');
    const r = await ht.phien.taoPhien(uid, b.org_code, 'thiet-bi-dong-vai');
    return { token: r.token, user: hoSo(r.nguoi_dung), canh_bao: 'Chỉ môi trường thử: đóng vai bên kia.' };
  });
  app.get('/v1/test/sms/:phone', async (req) => { thu(); return ht.phien.hopThuSms.get(P(req).phone) ?? []; });
  app.get('/v1/test/accounts', async () => { thu(); return ht.db.doc((t) => t.q(`SELECT u.display_name, replace(convert_from(c.phone_enc,'UTF8'),'TEST-PLAINTEXT:','') phone, o.code org_code, o.display_name org_name, o.kind org_kind, o.can_sell, o.can_buy,
      coalesce((SELECT string_agg(r.role_code,',') FROM core.membership_roles r WHERE r.membership_id=m.id),'') roles, m.approval_limit_vnd::text approval_limit_vnd,
      (SELECT string_agg(role_code,',') FROM ops.staff_assignments s WHERE s.user_id=u.id) staff_roles
      FROM core.users u JOIN pii.user_contacts c ON c.user_id=u.id LEFT JOIN core.memberships m ON m.user_id=u.id AND m.status='active' LEFT JOIN core.organizations o ON o.id=m.org_id ORDER BY o.code NULLS LAST, u.display_name`)); });

  // Ngân hàng mô phỏng
  app.post('/v1/sim/bank/transfers', async (req) => {
    thu();
    const b = z.object({ payment_ref: z.string(), amount_vnd: soNguyen, virtual_account_no: z.string().optional(), payer: z.object({ bank_code: z.string(), account_no: z.string(), name: z.string() }).optional() }).parse(req.body);
    return ht.nganHang.chuyenKhoan({ ...b, amount_vnd: String(b.amount_vnd) });
  });
  app.post('/v1/sim/bank/deliver', async (req) => {
    thu();
    const b = z.object({ mode: z.enum(['all', 'reverse', 'duplicate', 'first']).optional(), hold_last: z.number().int().optional(), bad_signature: z.boolean().optional() }).parse(req.body ?? {});
    return ht.nganHang.giao({ che_do: b.mode, giu_lai: b.hold_last, sai_chu_ky: b.bad_signature });
  });
  app.post('/v1/sim/bank/process-instructions', async (req) => {
    thu();
    const b = z.object({ outcome: z.enum(['succeeded', 'failed']).optional(), code: z.string().optional() }).parse(req.body ?? {});
    await Tien.dayLenhSangNganHang(ht);
    return { queued: ht.nganHang.xuLyLenh(b.outcome, b.code) };
  });
  app.post('/v1/sim/bank/requery-failure', async (req) => { thu(); ht.nganHang.requeryLoi = !!(req.body as any)?.on; return { requery_loi: ht.nganHang.requeryLoi }; });
  app.post('/v1/sim/inspection/result', async (req) => {
    thu();
    const b = z.object({ inspection_id: uuid, result: z.enum(['passed', 'failed', 'inconclusive']), sample_code: z.string().optional(), measurements: z.record(z.any()).optional(), bad_signature: z.boolean().optional() }).parse(req.body);
    const { kyKetQuaKiemDinh } = await import('../nghiep-vu/tranh-chap.ts');
    const { body, headers } = kyKetQuaKiemDinh(ht, b);
    if (b.bad_signature) headers['x-agv-signature'] = 'v1=' + '0'.repeat(64);
    const r = await app.inject({ method: 'POST', url: '/v1/webhooks/inspection', payload: body, headers: { ...headers, 'content-type': 'application/json' } });
    return { http: r.statusCode, body: r.json() };
  });
  app.get('/v1/sim/bank/state', async () => { thu(); return ht.nganHang.trangThai(); });

  function hoSo(nd: NguoiDung) {
    return {
      user_id: nd.userId, name: nd.ten, phone_masked: nd.dienThoaiChe, is_staff: nd.laNhanVien, staff_roles: nd.vaiVanHanh,
      org: { id: nd.thanhVien.orgId, code: nd.thanhVien.orgCode, name: nd.thanhVien.orgTen, kind: nd.thanhVien.orgKind, can_sell: nd.thanhVien.canSell, can_buy: nd.thanhVien.canBuy },
      roles: nd.thanhVien.vai, approval_limit_vnd: nd.thanhVien.hanMucVnd, helper_of: nd.thanhVien.nguoiGiup, orgs: nd.cacToChuc, actions: hanhDongCua(nd),
    };
  }
}
export { duocPhep, CHINH_SACH, GIO };
