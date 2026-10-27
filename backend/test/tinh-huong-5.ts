// Tình huống giao nhận: giao tại kho, dung sai, vượt, thiếu, giao bù, phản đối dòng tại vườn (09 mục E).
import { May, TinhHuong, SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { baoTra, xacNhan, dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, traThangVaXacNhan, chuanBiGiao, lenhNganHangVaDoiSoat, type BoiCanh } from './luong.ts';
import { ANH_PNG } from './luong.ts';

async function toiSanSang(may: May) {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  await traThangVaXacNhan(b, 32200000); await chuanBiGiao(b);
  await may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { qr_token: qr.data.qr_token });
  return b;
}

async function guiKq(b: BoiCanh, canKg: number, dong: [string, number, string?][], extra: any = {}) {
  return b.phuc.post(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: canKg * 1000, lines: dong.map(([kind, kg, reason_code]) => ({ kind, qty_g: kg * 1000, reason_code })), ...extra });
}

async function denVaChot(b: BoiCanh, kgDen: number) {
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival`, { weighed_g: kgDen * 1000 });
  return b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival/confirm`, {});
}

them('TH-007', 'Giao tại kho bên mua, người bán thuê xe, trả khi nhận', async (may, th) => {
  const ha = await may.dangNhap(SDT.ha); const sau = await may.dangNhap(SDT.sau); const lan = await may.dangNhap(SDT.lan); const phuc = await may.dangNhap(SDT.phuc);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0420'`);
  const o = await ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 1000000, price_vnd: 24000 });
  await sau.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await ha.ok('/v1/orders', { offer_id: o.id, downgrade_price_vnd: 15000, delivery_mode: 'at_buyer_warehouse', transport_by: 'partner_for_seller', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'on_receipt', designated_receiver_user_id: phuc.userId });
  th.bang('C 7.200.000', d.data.tinh.coc_vnd, '7200000');
  th.bang('F 72.000', d.data.tinh.phi_vnd, '72000');
  for (const [p, extra] of [[ha, {}], [sau, { commitment_ack: true }]] as const) {
    const c = await p.otpKy(d.data.document_id);
    await p.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c, code: '123456', ...extra });
  }
  const hd = (await lan.get(`/v1/orders/${d.id}/deposit-instruction`)).json;
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const don = (await ha.get(`/v1/orders/${d.id}`)).json;
  const did = don.dot_giao[0].id;
  const xe = await sau.ok(`/v1/deliveries/${did}/trip`, { plate_no: '66C-678.90', freight_vnd: 1200000 });
  th.bang('Người bán đặt xe, đợt sẵn sàng', xe.data.delivery_status, 'ready');
  await may.he('/v1/test/clock', { set: '2026-11-04T07:00:00+07:00' });
  const qr = await phuc.ok(`/v1/deliveries/${did}/receipt-qr`, {});
  const xh = await sau.ok(`/v1/deliveries/${did}/ship`, { loaded_g: 1000000, ma_6_so: qr.data.ma_6_so, seal_code: 'M-3001' });
  th.bang('Xuất hàng: đang vận chuyển', xh.status, 'in_transit');
  const kn = await phuc.ok(`/v1/deliveries/${did}/receive`, { plate_no: '66C-678.90' });
  th.bang('Ký nhận tại kho: đang nghiệm thu', kn.status, 'checking');
  const kq = await phuc.ok(`/v1/deliveries/${did}/acceptance`, { pin: '2468', weighed_g: 1000000, lines: [{ kind: 'accepted', qty_g: 980000 }, { kind: 'rejected', qty_g: 20000, reason_code: 'THOI' }] });
  th.bang('V 23.520.000', kq.data.gia_tri_vnd, '23520000');
  const dy = await sau.ok(`/v1/deliveries/${did}/acceptance/agree`, { pin: '2468' });
  th.bang('Đợt chốt tại kho', dy.status, 'closed');
  const pays = (await lan.get(`/v1/orders/${d.id}/payments`)).json;
  const p = pays.find((x: any) => x.kind === 'goods_on_receipt');
  th.bang('Khoản trả khi nhận 16.320.000', p?.amount_due_vnd, '16320000');
  await baoTra({} as any, lan, p.id, 16320000);
  await xacNhan(sau, p.id, 16320000, 'full', 'FT-SAU-1');
  const tien = (await ha.get(`/v1/orders/${d.id}/money`)).json;
  const qt = tien.quyet_toan[0];
  th.bang('Chi cọc 7.200.000', qt?.release_vnd, '7200000');
  th.bang('Không hoàn cọc', qt?.refund_vnd, '0');
  const viec = await may.v<number>(`SELECT count(*)::int FROM ops.tasks WHERE kind='V20' AND order_id=$1`, [d.id]);
  th.bang('Việc xử lý 20 kg trả lại ở kho', viec, 1);
  const tri = await may.dangNhap(SDT.tri);
  await may.he('/v1/sim/bank/process-instructions', {}); await may.he('/v1/sim/bank/deliver', {}); await tri.ok('/v1/ops/reconcile', {});
  th.bang('Hoàn tất', (await ha.get(`/v1/orders/${d.id}`)).json.status, 'completed');
});

them('TH-037a', 'Giao trong dung sai 1.960 kg', async (may, th) => {
  const b = await toiSanSang(may);
  const r = await guiKq(b, 1960, [['accepted', 1960]]);
  th.bang('V 45.080.000', r.json.data?.gia_tri_vnd, '45080000');
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  const x = await denVaChot(b, 1955);
  th.bang('C_nb 12.880.000', x.data.quyet_toan?.release_vnd, '12880000');
  th.bang('C_bm 920.000', x.data.quyet_toan?.refund_vnd, '920000');
  const sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('40 kg chưa giao trả về lô', sl.committed, '0');
  th.bang('Khả dụng 2.040 kg', sl.available, '2040000');
});

them('TH-037b', 'Giao vượt 2.100 kg, bên mua nhận phần vượt', async (may, th) => {
  const b = await toiSanSang(may);
  const tu = await guiKq(b, 2100, [['accepted', 2100]]);
  th.bang('Không chọn nhận vượt: chặn', tu.json.errors?.[0]?.code, 'DU_LIEU_KHONG_HOP_LE');
  const r = await guiKq(b, 2100, [['accepted', 2100]], { accept_overage: true });
  th.bang('V 48.300.000', r.json.data?.gia_tri_vnd, '48300000');
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  const x = await denVaChot(b, 2090);
  th.bang('C_nb 13.800.000', x.data.quyet_toan?.release_vnd, '13800000');
  th.bang('T_bm 2.300.000', x.data.quyet_toan?.t_bm_vnd, '2300000');
  await lenhNganHangVaDoiSoat(b);
  const pays = (await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json;
  const p = pays.find((q: any) => q.kind === 'settlement_buyer_balance');
  await baoTra(b, b.lan, p.id, 2300000);
  await xacNhan(b.nam, p.id, 2300000, 'full', 'FT-VUOT-1');
  th.bang('Hoàn tất', (await b.ha.get(`/v1/orders/${b.orderId}`)).json.status, 'completed');
  const nhan = await may.v<string>(`SELECT coalesce(sum(e.amount_vnd),0)::text FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id JOIN ledger.accounts a ON a.id=e.account_id WHERE t.order_id=$1 AND a.account_type='external' AND a.org_id=(SELECT seller_org_id FROM core.orders WHERE id=$1) AND e.amount_vnd>0`, [b.orderId]);
  th.bang('Năm nhận 48.300.000', nhan, '48300000');
});

them('TH-038', 'Giao thiếu 1.850 kg không báo trước: kết thúc phần thiếu, phạt 100% cọc phần thiếu', async (may, th) => {
  const b = await toiSanSang(may);
  await guiKq(b, 1850, [['accepted', 1850]]);
  const k = await b.nam.post(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  th.bang('Thiếu ngoài dung sai: phải chọn cách xử lý', k.json.errors?.[0]?.code, 'DU_LIEU_KHONG_HOP_LE');
  const r = await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468', shortfall: { choice: 'end', notice: 'none' } });
  th.bang('Phạt 1.035.000', r.data.xu_ly_thieu?.penalty_vnd, '1035000');
  const x = await denVaChot(b, 1845);
  th.bang('N 41.515.000', x.data.quyet_toan?.N, '41515000');
  th.bang('C_nb 9.315.000', x.data.quyet_toan?.release_vnd, '9315000');
  th.bang('C_bm 4.485.000', x.data.quyet_toan?.refund_vnd, '4485000');
});

them('TH-039', 'Giao bù 150 kg ở đợt 2; không quyết toán ở đợt 1', async (may, th) => {
  const b = await toiSanSang(may);
  await guiKq(b, 1850, [['accepted', 1850]]);
  const r = await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468', shortfall: { choice: 'backfill', backfill_from: '2026-11-05T06:00:00+07:00', backfill_to: '2026-11-05T12:00:00+07:00' } });
  const d2 = r.data.xu_ly_thieu?.delivery_id;
  th.bang('Đợt 2 lượng 150 kg', r.data.xu_ly_thieu?.planned_g, '150000');
  const x = await denVaChot(b, 1845);
  th.kiem('Đợt 1 chốt nhưng chưa quyết toán', x.data.quyet_toan == null, x.data);
  b.deliveryId = d2;
  const xe = await b.ha.ok(`/v1/deliveries/${d2}/trip`, { plate_no: '66C-123.45', freight_vnd: 500000 });
  th.bang('Đợt 2 sẵn sàng (không cần trả thêm)', xe.data.delivery_status, 'ready');
  await may.he('/v1/test/clock', { set: '2026-11-05T07:00:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${d2}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${d2}/start-check`, { qr_token: qr.data.qr_token });
  await guiKq(b, 150, [['accepted', 150]]);
  await b.nam.ok(`/v1/deliveries/${d2}/acceptance/agree`, { pin: '2468' });
  const y = await denVaChot(b, 150);
  th.bang('V 46.000.000', y.data.quyet_toan?.V, '46000000');
  th.bang('C_nb 13.800.000', y.data.quyet_toan?.release_vnd, '13800000');
  th.bang('C_bm 0', y.data.quyet_toan?.refund_vnd, '0');
});

them('TH-027', 'Phản đối dòng tại vườn, người bán rút phần tranh chấp', async (may, th) => {
  const b = await toiSanSang(may);
  await guiKq(b, 2000, [['accepted', 1850], ['downgraded', 120, 'TRAY_VO'], ['rejected', 30, 'DAP']]);
  const pd = await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/dispute`, { line_no: 2, reason: 'Không phải trầy vỏ', option: 'rut_phan', pin: '2468' });
  th.bang('Tranh chấp mở', pd.status, 'open');
  const chua = await b.nam.post(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  th.kiem('Chưa đồng ý được khi còn dòng tranh chấp', chua.status >= 400, chua.json);
  const r = await guiKq(b, 1880, [['accepted', 1850], ['rejected', 30, 'DAP']], { withdrawn_g: 120000 });
  th.bang('Gửi lại: V 42.550.000', r.json.data?.gia_tri_vnd, '42550000');
  const dy = await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  th.bang('Không phạt thiếu lượng khi rút phần tranh chấp', dy.data.xu_ly_thieu, null);
  const tc = await may.v<string>(`SELECT status FROM core.disputes WHERE id=$1`, [pd.id]);
  th.bang('Tranh chấp kết luận', tc, 'resolved');
  const x = await denVaChot(b, 1845);
  th.bang('C_nb 10.350.000', x.data.quyet_toan?.release_vnd, '10350000');
  th.bang('C_bm 3.450.000', x.data.quyet_toan?.refund_vnd, '3450000');
});

them('TH-R2-CANLAI', 'Phản đối dòng chia_lai, bên mua cân lại có chứng cứ mới, người bán đồng ý, tranh chấp đóng', async (may, th) => {
  const b = await toiSanSang(may);
  await guiKq(b, 2000, [['accepted', 1850], ['downgraded', 120, 'TRAY_VO'], ['rejected', 30, 'DAP']]);
  const pd = await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/dispute`, { line_no: 2, reason: 'Đề nghị cân lại', option: 'chia_lai' });
  const ds = (await b.phuc.get(`/v1/orders/${b.orderId}/disputes`)).json;
  th.kiem('Danh sách có hành động cân lại/chia lại', ds[0]?.hanh_dong?.includes('resubmit_acceptance'), ds);
  const thieu = await guiKq(b, 2000, [['accepted', 1970], ['rejected', 30, 'DAP']]);
  th.bang('Thiếu chứng cứ cân lại: 422', thieu.status, 422);
  await b.phuc.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'order', entity_id: b.orderId, captured_in_app: true });
  const r = await guiKq(b, 2000, [['accepted', 1970], ['rejected', 30, 'DAP']]);
  th.kiem('Chia lại: 120 kg hạ cấp thành đạt, chờ người bán', r.status === 200 && r.json.data?.chia_lai === true, r.json);
  th.bang('V mới 45.310.000', r.json.data?.gia_tri_vnd, '45310000');
  th.bang('Tranh chấp chờ người bán', await may.v<string>(`SELECT status FROM core.disputes WHERE id=$1`, [pd.id]), 'awaiting_seller');
  const dy = await b.nam.post(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  th.kiem('Người bán đồng ý bản chia lại', dy.status === 200, dy.json);
  th.bang('Tranh chấp đóng', await may.v<string>(`SELECT status FROM core.disputes WHERE id=$1`, [pd.id]), 'resolved');
});
