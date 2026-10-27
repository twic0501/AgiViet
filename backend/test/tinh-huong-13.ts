// Lỗi chặn từ bảng đối chiếu (NV11, NV22, NV24–NV26, B08, B18): tái hiện rồi kiểm sửa.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG, dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, traThangVaXacNhan, chuanBiGiao } from './luong.ts';

them('DC-NV11', 'Người bán (chủ vườn) có quyền bắt đầu cân tại vườn: hành động delivery.record và cờ start_check của đợt', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b); await traThangVaXacNhan(b, 32200000); await chuanBiGiao(b);
  const s = (await b.nam.get('/v1/auth/session')).json;
  th.kiem('Phiên chủ vườn có delivery.record (UI đọc c.can("delivery.record"))', s.actions?.includes('delivery.record'), s.actions);
  const d = (await b.nam.get(`/v1/deliveries/${b.deliveryId}`)).json;
  th.bang('Đợt sẵn sàng', d.status, 'ready');
  th.kiem('Đợt trả hanh_dong có start_check cho người bán', d.hanh_dong?.includes('start_check'), d.hanh_dong);
  const m = (await b.phuc.get(`/v1/deliveries/${b.deliveryId}`)).json;
  th.kiem('Người nhận bên mua không có start_check (họ đọc mã, người bán nhập)', !m.hanh_dong?.includes('start_check'), m.hanh_dong);
  const ha = (await b.ha.get('/v1/auth/session')).json;
  th.kiem('Bên mua không có delivery.record', !ha.actions?.includes('delivery.record'), ha.actions);
});

them('DC-NV26', 'GET đợt giao trả cờ ký nghiệm thu seller_agreed_at/buyer_agreed_at trên ket_qua', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b); await traThangVaXacNhan(b, 32200000); await chuanBiGiao(b);
  await may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { qr_token: qr.data.qr_token });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: 2000000, lines: [{ kind: 'accepted', qty_g: 2000000 }] });
  const truoc = (await b.nam.get(`/v1/deliveries/${b.deliveryId}`)).json;
  const k0 = truoc.ket_qua.at(-1);
  th.kiem('Trước khi người bán ký: buyer_agreed_at có, seller_agreed_at null', !!k0.buyer_agreed_at && k0.seller_agreed_at === null, k0);
  th.kiem('Người bán có hành động agree', truoc.hanh_dong?.includes('agree_acceptance'), truoc.hanh_dong);
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  const sau = (await b.nam.get(`/v1/deliveries/${b.deliveryId}`)).json;
  const k = sau.ket_qua.at(-1);
  th.kiem('Sau ký: seller_agreed_at có giá trị (UI không hiện lại form ký)', !!k.seller_agreed_at && !!k.buyer_agreed_at, k);
  th.kiem('Không còn hành động agree', !sau.hanh_dong?.includes('agree_acceptance'), sau.hanh_dong);
});

them('DC-NV24', 'GET điều khoản hợp đồng bao tiêu demo (DEMO56-OFFTAKE, giá công thức) không lỗi 500', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam);
  const id = await may.v<string>(`SELECT id FROM core.orders WHERE code='DEMO56-OFFTAKE'`);
  th.kiem('Có đơn demo', !!id, id);
  const r = await nam.get(`/v1/orders/${id}/terms`);
  th.bang('GET terms: 200', r.status, 200);
  th.kiem('8 thẻ, có ghi chú nguồn dữ liệu', r.json?.the?.length === 8 && !!r.json?.nguon_noi_dung, r.json);
  const p = await may.v<string>(`SELECT id FROM core.orders WHERE code='DEMO56-PRE_HARVEST'`);
  th.bang('GET terms đặt trước demo: 200', (await nam.get(`/v1/orders/${p}/terms`)).status, 200);
  th.bang('GET chi tiết hợp đồng vụ demo: 200', (await nam.get(`/v1/seasonal-orders/${id}`)).status, 200);
});

them('DC-B08', 'Tin đăng tự ẩn khỏi tìm nguồn sau 14 ngày không xác nhận còn hàng; xác nhận lại thì hiện', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam); const ha = await may.dangNhap(SDT.ha);
  const lot = await nam.ok('/v1/lots', { product_code: 'XOAI_CAT_CHU', grade_code: 'L1', qty_basis: 'weighed', qty_g: 500000, harvest_on: '2026-11-02', available_from: '2026-11-02', ask_price_vnd: 24000, floor_price_vnd: 21000 });
  await nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'lot', entity_id: lot.id, captured_in_app: true });
  await nam.ok(`/v1/lots/${lot.id}/publish`, {});
  const coTrongDs = async () => ((await ha.get('/v1/lots?product=XOAI_CAT_CHU')).json as any[]).some((x) => x.id === lot.id);
  th.bang('Vừa đăng: bên mua thấy', await coTrongDs(), true);
  await may.he('/v1/test/clock', { advance_minutes: 13 * 24 * 60 });
  th.bang('13 ngày: vẫn thấy', await coTrongDs(), true);
  await may.he('/v1/test/clock', { advance_minutes: 24 * 60 + 1 });
  th.bang('14 ngày 1 phút: bên mua không thấy', await coTrongDs(), false);
  const cuaToi = ((await nam.get('/v1/lots?mine=true')).json as any[]).find((x) => x.id === lot.id);
  th.kiem('Người bán thấy lô bị ẩn và lý do', cuaToi?.an_tu_dong === true && !!cuaToi?.an_ly_do, cuaToi);
  await nam.ok(`/v1/lots/${lot.id}/confirm-available`, {});
  th.bang('Xác nhận còn hàng: hiện lại', await coTrongDs(), true);
});

them('DC-NV22', 'Người bán xem mọi đợt giao của đơn, đơn chỉ ra đợt cần làm tiếp', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const thinh = await may.dangNhap(SDT.thinh);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const o = await thinh.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 2000000, price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await thinh.ok('/v1/seasonal-orders', { offer_id: o.id, delivery_mode: 'at_farm', transport_by: 'buyer', payment_timing: 'after_days', pay_after_days: 7, designated_receiver_user_id: thinh.userId,
    vu: { loai: 'offtake', deposit_vnd: 2000000, harvest_from: '2026-12-01', harvest_to: '2027-01-31',
      batches: [{ qty_g: 1000000, from: '2026-12-10T06:00:00+07:00', to: '2026-12-15T18:00:00+07:00' }, { qty_g: 1000000, from: '2027-01-10T06:00:00+07:00', to: '2027-01-15T18:00:00+07:00' }] } });
  const c1 = await thinh.otpKy(d.data.document_id); await thinh.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c1, code: '123456' });
  const c2 = await b.nam.otpKy(d.data.document_id); await b.nam.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  const hd = (await thinh.get(`/v1/orders/${d.id}/deposit-instruction`)).json;
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const don = (await b.nam.get(`/v1/orders/${d.id}`)).json;
  th.bang('Đơn có 2 đợt', don.dot_giao?.length, 2);
  for (const x of don.dot_giao ?? []) th.bang(`Người bán xem đợt ${x.batch_no ?? ''}`, (await b.nam.get(`/v1/deliveries/${x.id}`)).status, 200);
  th.kiem('Đơn chỉ ra đợt cần làm tiếp (dot_hien_hanh_id)', don.dot_hien_hanh_id === don.dot_giao[0].id, { dot: don.dot_hien_hanh_id });
});

them('DC-B18', 'Người bán từ chối đơn: giữ lý do cụ thể khi đọc lại', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null);
  const d2 = await b.ha.ok('/v1/orders', { offer_id: b.offerId, downgrade_price_vnd: 15000, delivery_mode: 'at_farm', transport_by: 'partner_for_buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'before_loading', designated_receiver_user_id: b.phuc.userId, silent_accept_hours: 2 });
  const c3 = await b.ha.otpKy(d2.data.document_id); await b.ha.ok(`/v1/orders/${d2.id}/sign`, { challenge_id: c3, code: '123456' });
  const tc = await b.nam.ok(`/v1/orders/${d2.id}/decline`, { reason: 'Vườn bị sâu đục trái, không đủ hàng loại 1' });
  th.bang('Đơn đóng', tc.status, 'closed');
  const doc = (await b.ha.get(`/v1/orders/${d2.id}`)).json;
  th.bang('Bên mua đọc lại thấy lý do cụ thể', doc.ly_do_dong, 'Vườn bị sâu đục trái, không đủ hàng loại 1');
  th.bang('Mã lý do giữ nguyên', doc.close_reason, 'seller_declined');
});
