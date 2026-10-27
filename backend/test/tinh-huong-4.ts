// Tình huống trả sau, duyệt nội bộ, giữ lệnh chi tài khoản mới (D-07).
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { dangNhapCacBen, baoTra, xacNhan } from './luong.ts';

them('TH-009A', 'Trả sau 7 ngày (bưởi, vựa), trả đúng hạn; lệnh chi ≥ 20 triệu tài khoản mới phải gọi lại', async (may, th) => {
  const tu = await may.dangNhap(SDT.tuHung); const bay = await may.dangNhap(SDT.bay);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0460'`);
  // Tiền điều kiện thêm (D-07): Bảy vừa kích hoạt tài khoản nhận tiền mới (luồng đổi tài khoản chưa có ở backend: ghi thẳng DB thử).
  const moi = await may.ht.db.nhapDuLieuThu( async (t) => {
    await t.q(`SELECT set_config('app.actor_kind','system',true)`);
    const cu = await t.gtri<string>(`SELECT id FROM pii.bank_accounts WHERE org_id=(SELECT id FROM core.organizations WHERE code='TC-B08') AND status='active'`);
    const moi = await t.gtri<string>(`INSERT INTO pii.bank_accounts(org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at)
      SELECT o.id,'Vietinbank',convert_to('TEST:1010007788','UTF8'),digest('1010007788','sha256'),'****7788','Huỳnh Văn Bảy',true,m.user_id,ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED','pending_verification',ref.clock_at()-interval '25 hours'
      FROM core.organizations o JOIN core.memberships m ON m.org_id=o.id WHERE o.code='TC-B08' LIMIT 1 RETURNING id`);
    await t.q(`UPDATE pii.bank_accounts SET status='cooling_down' WHERE id=$1`, [moi]);
    th.bang('Tài khoản cũ còn active trước kích hoạt', (await t.mot<any>(`SELECT status FROM pii.bank_accounts WHERE id=$1`, [cu])).status, 'active');
    return moi;
  });
  // Kích hoạt qua command hệ thống 0036 (giờ chờ theo cmd.test_clock) trong giao dịch runtime thường (cổng/điều phối), không dưới owner.
  await may.ht.db.tx({ actor: 'system' }, (t) => t.voiHeThong(() => t.q(`SELECT cmd.activate_bank_account($1)`, [moi])));
  const o = await tu.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 3000000, price_vnd: 30000 });
  await bay.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await tu.ok('/v1/orders', { offer_id: o.id, downgrade_price_vnd: 20000, delivery_mode: 'at_farm', transport_by: 'buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'after_days', pay_after_days: 7, designated_receiver_user_id: tu.userId, silent_accept_hours: 2 });
  th.bang('G 90.000.000', d.data.tinh.gia_tri_vnd, '90000000');
  th.bang('C 27.000.000', d.data.tinh.coc_vnd, '27000000');
  th.bang('F 900.000 (Miễn phí, đơn đầu 1%)', d.data.tinh.phi_vnd, '900000');
  for (const [p, extra] of [[tu, {}], [bay, { commitment_ack: true }]] as const) {
    const c = await p.otpKy(d.data.document_id);
    await p.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c, code: '123456', ...extra });
  }
  const hd = (await tu.get(`/v1/orders/${d.id}/deposit-instruction`)).json;
  th.bang('Chuyển qua app 27.900.000', hd.total_vnd, '27900000');
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: 27900000, payer: { bank_code: 'ACB', account_no: '1234567890', name: 'TA VAN HUNG' } });
  await may.he('/v1/sim/bank/deliver', {});
  const don = (await tu.get(`/v1/orders/${d.id}`)).json;
  th.bang('Hiệu lực', don.status, 'active');
  const did = don.dot_giao[0].id;
  const xe = await tu.ok(`/v1/deliveries/${did}/trip`, { plate_no: '66C-678.90', freight_vnd: 1500000 });
  th.bang('Không cần trả trước bốc: sẵn sàng ngay', xe.data.delivery_status, 'ready');
  await may.he('/v1/test/clock', { set: '2026-11-04T07:00:00+07:00' });
  const qr = await tu.ok(`/v1/deliveries/${did}/receipt-qr`, {});
  await bay.ok(`/v1/deliveries/${did}/start-check`, { qr_token: qr.data.qr_token });
  const prof = (await tu.get('/v1/products/BUOI_DA_XANH/profile')).json;
  const lyDo = prof.reject_reasons.find((r: any) => !r.is_safety)?.reason_code;
  const kq = await tu.ok(`/v1/deliveries/${did}/acceptance`, { pin: '2468', weighed_g: 3000000, lines: [{ kind: 'accepted', qty_g: 2950000 }, { kind: 'downgraded', qty_g: 50000, reason_code: lyDo }] });
  th.bang('V 89.500.000', kq.data.gia_tri_vnd, '89500000');
  await bay.ok(`/v1/deliveries/${did}/acceptance/agree`, { pin: '2468' });
  await tu.ok(`/v1/deliveries/${did}/arrival`, { weighed_g: 2990000 });
  const den = await tu.ok(`/v1/deliveries/${did}/arrival/confirm`, {});
  th.kiem('Chưa quyết toán khi khoản sau 7 ngày chưa trả', den.data.quyet_toan == null, den.data);
  const pays = (await tu.get(`/v1/orders/${d.id}/payments`)).json;
  const p = pays.find((x: any) => x.kind === 'goods_after_days');
  th.bang('Khoản sau 7 ngày 62.500.000', p?.amount_due_vnd, '62500000');
  await may.he('/v1/test/clock', { advance_minutes: 6 * 24 * 60 });
  await baoTra({} as any, tu, p.id, 62500000);
  const x = await xacNhan(bay, p.id, 62500000, 'full', 'FT-BAY-01');
  th.bang('Bảy xác nhận đủ', x.json.data?.status, 'fully_received');
  const tien = (await tu.get(`/v1/orders/${d.id}/money`)).json;
  const chi = tien.lenh_ngan_hang.find((l: any) => l.kind === 'release_deposit_to_seller');
  th.bang('Chi cọc 27.000.000 cho Bảy', chi?.amount_vnd, '27000000');
  th.bang('Lệnh giữ chờ gọi lại (tài khoản kích hoạt < 72 giờ, ≥ 20 triệu)', chi?.status, 'created');
  th.bang('Cờ cần gọi lại', chi?.callback_required, true);
  const tri = await may.dangNhap(SDT.tri);
  const vy = await may.dangNhap(SDT.vy);
  const k1 = await vy.post(`/v1/ops/instructions/${chi.id}/callback`, { duration_seconds: 60, summary: 'Gọi lại' });
  th.bang('Điều phối viên không được xác nhận gọi lại', k1.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const gl = await tri.ok(`/v1/ops/instructions/${chi.id}/callback`, { duration_seconds: 75, summary: 'Anh Bảy xác nhận tài khoản Vietinbank ****7788' });
  th.bang('Sau gọi lại: lệnh đã gửi', gl.status, 'sent');
  await may.he('/v1/sim/bank/process-instructions', {});
  await may.he('/v1/sim/bank/deliver', {});
  await tri.ok('/v1/ops/reconcile', {});
  const cuoi = (await tu.get(`/v1/orders/${d.id}`)).json;
  th.bang('Hoàn tất', cuoi.status, 'completed');
});

them('TH-052a', 'Đơn vượt hạn mức người lập: phải duyệt nội bộ, người lập không tự duyệt', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const thinh = await may.dangNhap(SDT.thinh);
  const o = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 2000000, price_vnd: 26000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await b.ha.ok('/v1/orders', { offer_id: o.id, downgrade_price_vnd: 15000, delivery_mode: 'at_farm', transport_by: 'buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'before_loading' });
  th.bang('Giá trị 52.000.000 > hạn mức 50.000.000', d.data.tinh.gia_tri_vnd, '52000000');
  const c = await b.ha.otpKy(d.data.document_id);
  const k = await b.ha.post(`/v1/orders/${d.id}/sign`, { challenge_id: c, code: '123456' });
  th.bang('Ký khi chưa duyệt: CAN_DUYET_NOI_BO', k.json.errors?.[0]?.code, 'CAN_DUYET_NOI_BO');
  await b.ha.ok(`/v1/orders/${d.id}/submit-approval`, {});
  const tu = await b.ha.post(`/v1/orders/${d.id}/approve`, {});
  th.bang('Người lập không tự duyệt', tu.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const dy = await thinh.ok(`/v1/orders/${d.id}/approve`, {});
  th.bang('Quản lý duyệt: về soạn thảo', dy.status, 'drafting');
  const c2 = await b.ha.otpKy(d.data.document_id);
  const k2 = await b.ha.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c2, code: '123456' });
  th.bang('Ký sau duyệt', k2.status, 'awaiting_seller');
  const otpSai = await b.nam.otpKy(d.data.document_id);
  const ks = await b.nam.post(`/v1/orders/${d.id}/sign`, { challenge_id: otpSai, code: '000000', commitment_ack: true });
  th.bang('OTP sai', ks.json.errors?.[0]?.code, 'OTP_SAI');
  const kt = await b.nam.post(`/v1/orders/${d.id}/sign`, { challenge_id: otpSai, code: '123456' });
  th.bang('Thiếu tick cam kết bị chặn', kt.json.errors?.[0]?.code, 'DU_LIEU_KHONG_HOP_LE');
});
