// Tình huống tiền, hủy, quyền, tài liệu, bảo mật (docs/nghiep-vu/09).
import { May, TinhHuong, SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG, baoTra, xacNhan, khoanDau, dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, traThangVaXacNhan, chuanBiGiao, lenhNganHangVaDoiSoat } from './luong.ts';

/** Dựng nhanh tới bước 5 của TH-006 (đơn hiệu lực). */
async function toiHieuLuc(may: May, th: TinhHuong | null) {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null);
  await lapVaKy(b, null);
  await chuyenCoc(b);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th?.bang('Tiền điều kiện: đơn hiệu lực', o.status, 'active');
  return b;
}

const DON_CO_BAN = (offerId: string) => ({ offer_id: offerId, downgrade_price_vnd: 15000, delivery_mode: 'at_farm', transport_by: 'buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'before_loading' });

them('TH-003', 'Đăng lô: chặn cách ly, cảnh báo giá, ảnh chụp trong app, giá kín không lộ', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam);
  const tao = { product_code: 'XOAI_CAT_CHU', grade_code: 'L1', qty_basis: 'weighed', qty_g: 1000000, harvest_on: '2026-10-31', spray_clear_on: '2026-11-01', available_from: '2026-11-02', ask_price_vnd: 24000, floor_price_vnd: 19000 };
  const r1 = await nam.post('/v1/lots', tao);
  th.bang('Chặn ngày hái trước hết cách ly', r1.json.errors?.[0]?.code, 'CHUA_HET_CACH_LY');
  // Bản 23: đã bỏ vai người giúp; chủ hộ tự đăng lô.
  const teo = nam;
  const r2 = await teo.ok('/v1/lots', { ...tao, harvest_on: '2026-11-02' });
  th.bang('Chủ hộ tạo lô nháp được', r2.status, 'draft');
  th.kiem('Cảnh báo thấp hơn mặt bằng 24%', (r2.data.canh_bao ?? []).some((c: any) => c.cau === 'Thấp hơn mặt bằng 24%'), r2.data.canh_bao);
  th.bang('Giá tham khảo 25.000', r2.data.gia_tham_khao?.gia_vnd, '25000');
  await teo.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'lot', entity_id: r2.id, captured_in_app: false });
  const r3 = await teo.post(`/v1/lots/${r2.id}/publish`, {});
  th.bang('Chỉ ảnh tải lên: chưa đăng được', r3.json.errors?.[0]?.code, 'DU_LIEU_KHONG_HOP_LE');
  await teo.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'lot', entity_id: r2.id, captured_in_app: true });
  const xemLo = (await teo.get(`/v1/lots/${r2.id}`)).json;
  const cu = await teo.post(`/v1/lots/${r2.id}/publish`, { expected_revision: xemLo.revision - 1 });
  th.bang('Phiên bản cũ: REVISION_XUNG_DOT', cu.json.errors?.[0]?.code, 'REVISION_XUNG_DOT');
  const r4 = await teo.ok(`/v1/lots/${r2.id}/publish`, { expected_revision: xemLo.revision });
  th.bang('Lô đang bán', r4.status, 'on_sale');
  th.kiem('Sự kiện lo.da_dang', r4.events.includes('lo.da_dang'), r4.events);
  const ha = await may.dangNhap(SDT.ha);
  const xem = (await ha.get(`/v1/lots/${r2.id}`)).json;
  const tim = (await ha.get(`/v1/lots?product=XOAI_CAT_CHU&grade=L1`)).json;
  const chuoi = JSON.stringify(xem) + JSON.stringify(tim);
  th.kiem('Bên mua không thấy 19000 ở API lô/tìm nguồn', !chuoi.includes('19000') && xem.floor_price_vnd === undefined, xem);
  const cuaToi = (await nam.get(`/v1/lots/${r2.id}`)).json;
  th.bang('Chủ lô thấy giá kín', cuaToi.floor_price_vnd, '19000');
  th.bang('Sổ lượng khả dụng 1.000 kg', cuaToi.qty.available, '1000000');
});

them('TH-005', 'Đồng ý giá, giữ lượng hết hạn sau 24 giờ', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, th);
  let sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('Giữ tạm 2.000 kg', sl.held, '2000000');
  const r = await may.he('/v1/test/clock', { advance_minutes: 24 * 60 + 1 });
  th.kiem('Hẹn giờ giữ lượng chạy', r.hen_gio.some((x: any) => x.kind === 'hold' && x.ket_qua === 'hold_expired'), r.hen_gio);
  sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('Giữ tạm về 0', sl.held, '0');
  th.bang('Khả dụng trả về 4.000 kg', sl.available, '4000000');
  const o = (await b.ha.get(`/v1/offers/${b.offerId}`)).json;
  th.bang('Lời chào vẫn đã đồng ý (khóa)', o.status, 'accepted');
  th.bang('Giữ lượng hết hạn', o.hold.status, 'expired');
});

them('TH-010', 'Trả giá tối đa 2 lượt mỗi bên', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const o = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 2000000, price_vnd: 22000 });
  await b.nam.ok(`/v1/offers/${o.id}/counter`, { price_vnd: 24500 });
  await b.ha.ok(`/v1/offers/${o.id}/counter`, { price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o.id}/counter`, { price_vnd: 23800 });
  const r4 = await b.ha.post(`/v1/offers/${o.id}/counter`, { price_vnd: 23200 });
  th.bang('Hà trả giá lần 2 được', r4.status, 200);
  const r5 = await b.nam.post(`/v1/offers/${o.id}/counter`, { price_vnd: 23500 });
  th.bang('Năm hết lượt trả giá', r5.json.errors?.[0]?.code, 'HET_LUOT_TRA_GIA');
  const x = (await b.nam.get(`/v1/offers/${o.id}`)).json;
  th.bang('Lượt trả giá còn của Năm', x.luot_tra_gia_con, 0);
  th.bang('Tới lượt người bán', x.toi_luot, 'seller');
  const a = await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  th.bang('Năm vẫn đồng ý được', a.status, 'accepted');
});

them('TH-011', 'Lời chào dưới giá kín tự từ chối, không lộ số', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const o = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 2000000, price_vnd: 21000 });
  th.bang('Tự từ chối', o.status, 'auto_rejected');
  th.bang('Câu không số', o.data.thong_bao, 'Chưa tới mức người bán chấp nhận.');
  const x = (await b.ha.get(`/v1/offers/${o.id}`)).json;
  th.kiem('Không lộ 21500 cho bên mua', !JSON.stringify(x).includes('21500') && !JSON.stringify(o).includes('21500'), x);
  const ev = await may.v<number>(`SELECT count(*)::int FROM evt.domain_events WHERE aggregate_id=$1 AND event_type='loi_chao.gui'`, [o.id]);
  th.bang('Không phát sự kiện gửi tới người bán', ev, 0);
});

them('TH-012', 'Ngưỡng 80% (cảnh báo) và 60% (chặn) khi bên mua chào', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const o1 = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 100000, price_vnd: 19500 });
  th.kiem('Dưới 80%: có cảnh báo', (o1.data.canh_bao ?? []).length > 0 || o1.status === 'auto_rejected', o1.data);
  const o2 = await b.ha.post('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 100000, price_vnd: 14000 });
  th.bang('Dưới 60%: chặn gửi', o2.json.errors?.[0]?.code, 'DUOI_60_THAM_KHAO');
});

them('TH-014', 'Chào vượt 2 lần lượng cần của phiếu bị chặn; cùng loại cùng giá', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const line = await may.v<string>(`SELECT l.id FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE d.code='NC-3001'`);
  const lo = async (c: string) => may.v<string>(`SELECT id FROM core.lots WHERE code=$1`, [c]);
  const r1 = await b.ha.post('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, demand_line_id: line, qty_g: 2000000, price_vnd: 23000 });
  const r2 = await b.ha.post('/v1/offers', { direction: 'buyer_bid', lot_id: await lo('L-0420'), demand_line_id: line, qty_g: 1500000, price_vnd: 23000 });
  const r3 = await b.ha.post('/v1/offers', { direction: 'buyer_bid', lot_id: await lo('L-0430'), demand_line_id: line, qty_g: 1000000, price_vnd: 23000 });
  th.kiem('Hai lời chào đầu gửi được', r1.status === 200 && r2.status === 200, [r1.json, r2.json]);
  th.bang('Lời chào thứ ba bị chặn', r3.json.errors?.[0]?.code, 'CHAO_VUOT_LUONG');
  const r4 = await b.ha.post('/v1/offers', { direction: 'buyer_bid', lot_id: await lo('L-0430'), demand_line_id: line, qty_g: 500000, price_vnd: 23000 });
  th.bang('Chào 500 kg (tổng 4.000) được', r4.status, 200);
});

them('TH-015', 'Giá bất thường: cần tick xác nhận, cọc theo giá tính cọc', async (may, th) => {
  const tu = await may.dangNhap(SDT.tuHung); const sau = await may.dangNhap(SDT.sau);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0420'`);
  const o = await tu.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 1000000, price_vnd: 15500 });
  th.kiem('Lời chào 15.500 (dưới giá kín) tự từ chối', o.status === 'auto_rejected', o);
  // Người bán tự báo giá thấp cho phiếu của bên mua (chiều báo giá, không qua giá kín).
  const bg = await tu.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 1000000, price_vnd: 24000 });
  await sau.ok(`/v1/offers/${bg.id}/counter`, { price_vnd: 14000 });
  const offerId: string = bg.id;
  await tu.ok(`/v1/offers/${offerId}/accept`, {});
  const d = await tu.ok('/v1/orders', { ...DON_CO_BAN(offerId), downgrade_price_vnd: 9000 });
  th.bang('Cờ giá bất thường', d.data.tinh.gia_bat_thuong, true);
  th.bang('P_coc 17.500', d.data.tinh.gia_tinh_coc_vnd, '17500');
  th.bang('C 5.250.000', d.data.tinh.coc_vnd, '5250000');
  th.bang('F 175.000', d.data.tinh.phi_vnd, '175000');
  th.bang('Trả thẳng 8.750.000', d.data.tinh.tra_thang_vnd, '8750000');
  const c1 = await tu.otpKy(d.data.document_id);
  await tu.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c1, code: '123456' });
  const c2 = await sau.otpKy(d.data.document_id);
  const k1 = await sau.post(`/v1/orders/${d.id}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  th.bang('Ký thiếu tick bị chặn', k1.json.errors?.[0]?.code, 'CAN_XAC_NHAN_GIA_BAT_THUONG');
  const c3 = await sau.otpKy(d.data.document_id);
  const k2 = await sau.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c3, code: '123456', commitment_ack: true, abnormal_price_ack: true });
  th.bang('Ký có tick: chờ cọc', k2.status, 'awaiting_deposit');
});

them('TH-019', 'Trả thẳng một phần: chặn bốc, bổ sung đủ', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const p = await khoanDau(b);
  await baoTra(b, b.lan, p.id, 32200000);
  const r1 = await xacNhan(b.nam, p.id, 20000000, 'partial', 'FT-A1');
  th.bang('Nhận một phần', r1.json.data?.status, 'partially_received');
  th.bang('Còn thiếu 12.200.000', r1.json.data?.remaining_vnd, '12200000');
  await chuanBiGiao(b);
  const the = (await b.lan.get(`/v1/deliveries/${b.deliveryId}/readiness`)).json;
  const tien = the.find((x: any) => x.ma === 'tien');
  th.kiem('Thẻ Sẵn sàng: dòng Tiền đỏ', tien && !tien.ok, the);
  const dot = (await b.lan.get(`/v1/deliveries/${b.deliveryId}`)).json;
  th.bang('Đợt chưa sẵn sàng', dot.status, 'preparing');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Chặng giữ ở Thanh toán', o.hien_thi.chang, 'Thanh toán');
  const r2 = await xacNhan(b.nam, p.id, 12200000, 'full', 'FT-A2');
  th.bang('Đã nhận đủ', r2.json.data?.status, 'fully_received');
  const dot2 = (await b.lan.get(`/v1/deliveries/${b.deliveryId}`)).json;
  th.bang('Đợt sẵn sàng sau khi đủ tiền', dot2.status, 'ready');
});

them('TH-020', 'Báo đã chuyển nhưng chưa nhận: đối soát, không cộng tiền', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const p = await khoanDau(b);
  await baoTra(b, b.lan, p.id, 32200000);
  const r = await b.nam.ok(`/v1/payments/${p.id}/not-received`, {});
  th.bang('Khoản lệch đối soát', r.status, 'mismatch');
  const viec = await may.v<number>(`SELECT count(*)::int FROM ops.tasks WHERE kind='V08' AND entity_id=$1`, [p.id]);
  th.bang('Việc V08 cho vận hành', viec, 1);
  const D = await may.v<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_confirmations WHERE direct_payment_id=$1`, [p.id]);
  th.bang('Không cộng D', D, '0');
  const thao = await may.dangNhap(SDT.thao);
  const ds = (await thao.get('/v1/ops/tasks?kind=V08')).json;
  th.kiem('Vận hành thấy việc trong hàng', ds.length >= 1, ds);
  const nhan = await thao.post(`/v1/ops/tasks/${ds[0].id}/claim`, {});
  th.bang('Vận hành nhận việc', nhan.json.status, 'claimed');
});

them('TH-021', 'Cọc sai số tiền: thiếu thì treo, đủ thì hiệu lực; thừa hoàn về nguồn', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null);
  const { g } = await chuyenCoc(b, 13000000);
  th.kiem('Webhook áp: nhận một phần', JSON.stringify(g).includes('partially_received'), g);
  let o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn vẫn chờ cọc', o.status, 'awaiting_deposit');
  const hd = (await b.lan.get(`/v1/orders/${b.orderId}/deposit-instruction`)).json;
  th.bang('Đã nhận (tiền treo) 13.000.000', hd.received_vnd, '13000000');
  await chuyenCoc(b, 1000000);
  o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Bổ sung đủ: hiệu lực', o.status, 'active');
  const lenh = (await b.ha.get(`/v1/orders/${b.orderId}/money`)).json.lenh_ngan_hang;
  const thua = lenh.find((x: any) => x.kind === 'refund_excess');
  th.bang('Lệnh hoàn thừa 62.000', thua?.amount_vnd, '62000');
  th.bang('Hoàn thừa về tài khoản nguồn', thua?.target_account_masked, '****3456');
});

them('TH-022', 'Sự kiện ngân hàng: chữ ký sai, lặp, tiền lạ vào ngăn treo', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const ref = (await b.lan.get(`/v1/orders/${b.orderId}/deposit-instruction`)).json.payment_ref;
  await may.he('/v1/sim/bank/transfers', { payment_ref: ref, amount_vnd: 5000 });
  const sai = await may.he('/v1/sim/bank/deliver', { bad_signature: true });
  th.bang('Chữ ký sai: 401', (sai[0].ket_qua as any).http, 401);
  const nEv = await may.v<number>(`SELECT count(*)::int FROM core.bank_events WHERE amount_vnd=5000`);
  th.bang('Không ghi sự kiện tiền', nEv, 0);
  await may.he('/v1/sim/bank/transfers', { payment_ref: 'AGV KHONGCO COC', amount_vnd: 7000 });
  const lap = await may.he('/v1/sim/bank/deliver', { mode: 'duplicate' });
  const kq = lap.map((x: any) => x.ket_qua);
  th.bang('Tiền lạ vào ngăn treo', kq[0].body?.ket_qua, 'unmatched');
  th.kiem('Lần hai không áp lại', kq[1].http === 401 || kq[1].body?.ket_qua === 'duplicate_ignored', kq);
  const n = await may.v<number>(`SELECT count(*)::int FROM core.bank_events WHERE amount_vnd=7000`);
  th.bang('Một sự kiện duy nhất', n, 1);
});

them('TH-022b', 'Lệnh hoàn thất bại: không cộng tiền, có việc vận hành', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const x = await b.nam.ok(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  await b.ha.ok(`/v1/cancellation-requests/${x.id}/accept`, {});
  await may.he('/v1/sim/bank/process-instructions', { outcome: 'failed' });
  await may.he('/v1/sim/bank/deliver', {});
  const lenh = (await b.ha.get(`/v1/orders/${b.orderId}/money`)).json.lenh_ngan_hang;
  th.kiem('Các lệnh ở trạng thái thất bại', lenh.every((l: any) => l.status === 'failed'), lenh);
  const v = await may.v<number>(`SELECT count(*)::int FROM ops.tasks WHERE kind='V10' AND order_id=$1`, [b.orderId]);
  th.kiem('Việc V10 lập lệnh thay', v >= 1, v);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn chưa đóng', o.status, 'active');
});

them('TH-024', 'Trả lại nhiều: người bán còn phải hoàn ngoài app', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  await traThangVaXacNhan(b, 32200000);
  await chuanBiGiao(b);
  await may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { ma_6_so: qr.data.ma_6_so });
  const dong = (anh?: string) => [{ kind: 'accepted', qty_g: 1200000 }, { kind: 'downgraded', qty_g: 100000, reason_code: 'TRAY_VO' }, { kind: 'rejected', qty_g: 700000, reason_code: 'DAP', evidence_document_id: anh }];
  const thieuAnh = await b.phuc.post(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: 2000000, lines: dong() });
  th.bang('Trả lại 35% không ảnh: chặn', thieuAnh.json.errors?.[0]?.code, 'THIEU_ANH_TRA_LAI');
  const anh = await b.phuc.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'delivery', entity_id: b.deliveryId, captured_in_app: true });
  const kq = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: 2000000, lines: dong(anh.id) });
  th.bang('V 29.100.000', kq.data.gia_tri_vnd, '29100000');
  const sai = await b.nam.post(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '0000' });
  th.bang('PIN sai không ký được', sai.json.errors?.[0]?.code, 'OTP_SAI');
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival`, { weighed_g: 1300000 });
  const x = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival/confirm`, {});
  th.bang('C_nb 0', x.data.quyet_toan?.release_vnd, '0');
  th.bang('C_bm 13.800.000', x.data.quyet_toan?.refund_vnd, '13800000');
  th.bang('T_nb 3.100.000', x.data.quyet_toan?.t_nb_vnd, '3100000');
  await lenhNganHangVaDoiSoat(b);
  let o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn còn công nợ', o.status, 'outstanding');
  th.kiem('Hiển thị người bán còn phải hoàn 3.100.000', String(o.hien_thi.ten).includes('người bán còn phải hoàn 3.100.000'), o.hien_thi);
  const pays = (await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json;
  const hoan = pays.find((p: any) => p.kind === 'seller_refund');
  await baoTra(b, b.nam, hoan.id, 3100000);
  const xn = await xacNhan(b.lan, hoan.id, 3100000, 'full', 'FT-HOAN-1');
  th.bang('Lan xác nhận đã nhận lại', xn.json.data?.status, 'fully_received');
  o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn hoàn tất', o.status, 'completed');
  const lc = await may.v<string>(`SELECT declared_qty::text FROM core.lots WHERE parent_lot_id=$1`, [b.lotId]);
  th.bang('Lô con 700 kg', lc, '700000');
});

them('TH-026', 'Mã giao dịch trùng khi xác nhận trả thẳng', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const p = await khoanDau(b);
  await baoTra(b, b.lan, p.id, 32200000);
  const r1 = await xacNhan(b.nam, p.id, 16100000, 'partial', 'FT2611040001');
  th.bang('Lần 1 nhận', r1.status, 200);
  const r2 = await xacNhan(b.nam, p.id, 16100000, 'full', 'FT2611040001');
  th.bang('Trùng mã bị chặn', r2.json.errors?.[0]?.code, 'MA_GIAO_DICH_TRUNG');
  const r3 = await xacNhan(b.nam, p.id, 16100000, 'full', 'FT2611040002');
  th.bang('Mã khác: nhận đủ', r3.json.data?.status, 'fully_received');
});

them('TH-042', 'Hủy trước khi người bán ký: rút đơn; quá hạn ký', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null);
  const d = await b.ha.ok('/v1/orders', DON_CO_BAN(b.offerId!));
  const c = await b.ha.otpKy(d.data.document_id);
  await b.ha.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c, code: '123456' });
  const r = await b.ha.ok(`/v1/orders/${d.id}/withdraw`, {});
  th.bang('Rút đơn: đóng', r.status, 'closed');
  th.bang('Lý do hủy trước cọc', r.data.close_reason, 'cancel_before_deposit');
  const sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('Giữ lượng về lô', sl.held, '0');
  const o2 = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: await may.v(`SELECT id FROM core.lots WHERE code='L-0414'`), qty_g: 500000, price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o2.id}/accept`, {});
  const d2 = await b.ha.ok('/v1/orders', DON_CO_BAN(o2.id));
  const c2 = await b.ha.otpKy(d2.data.document_id);
  await b.ha.ok(`/v1/orders/${d2.id}/sign`, { challenge_id: c2, code: '123456' });
  await may.he('/v1/test/clock', { advance_minutes: 24 * 60 + 5 });
  const o = (await b.ha.get(`/v1/orders/${d2.id}`)).json;
  th.bang('Quá hạn ký: đóng', o.status, 'closed');
  th.bang('Lý do quá hạn ký', o.close_reason, 'sign_expired');
});

them('TH-043', 'Quá hạn cọc hàng tươi 12 giờ', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null);
  await may.he('/v1/test/clock', { advance_minutes: 11 * 60 });
  let o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('11 giờ: vẫn chờ cọc', o.status, 'awaiting_deposit');
  await may.he('/v1/test/clock', { advance_minutes: 61 });
  o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('12 giờ 1 phút: đóng', o.status, 'closed');
  th.bang('Lý do quá hạn cọc', o.close_reason, 'deposit_expired');
  const sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('2.000 kg về khả dụng', sl.available, '4000000');
  const phi = await may.v<number>(`SELECT count(*)::int FROM ledger.transactions WHERE order_id=$1`, [b.orderId]);
  th.bang('Không thu phí, không bút toán', phi, 0);
});

them('TH-044', 'Bên mua xin hủy sau cọc: cọc về người bán, phí không hoàn', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const pv = (await b.ha.get(`/v1/orders/${b.orderId}/cancellation-preview`)).json;
  th.bang('Màn hệ quả: cọc về người bán', pv.coc?.ve, 'seller');
  th.bang('Màn hệ quả: phí không hoàn', pv.phi?.hoan, false);
  const x = await b.ha.ok(`/v1/orders/${b.orderId}/cancellation-requests`, { reason_text: 'giá thị trường giảm' });
  th.bang('Yêu cầu chờ trả lời', x.status, 'awaiting_reply');
  const y = await b.nam.ok(`/v1/cancellation-requests/${x.id}/accept`, {});
  th.bang('Đồng ý: xử lý tiền', y.status, 'processing_money');
  const lenh = (await b.ha.get(`/v1/orders/${b.orderId}/money`)).json.lenh_ngan_hang;
  th.kiem('Lệnh chi cọc 13.800.000 cho người bán', lenh.some((l: any) => l.kind === 'release_deposit_to_seller' && l.amount_vnd === '13800000'), lenh);
  th.kiem('Không có lệnh hoàn phí', !lenh.some((l: any) => l.kind === 'refund_fee'), lenh);
  const sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('Lượng về lô', sl.committed, '0');
  await lenhNganHangVaDoiSoat(b);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn đóng', o.status, 'closed');
  th.bang('Lý do hủy sau cọc', o.close_reason, 'cancel_after_deposit');
});

them('TH-044b', 'Xin hủy: bên kia im lặng 24 giờ = không đồng ý', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const x = await b.ha.ok(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  await may.he('/v1/test/clock', { advance_minutes: 24 * 60 + 1 });
  const st = await may.v<string>(`SELECT status FROM core.cancellation_requests WHERE id=$1`, [x.id]);
  th.bang('Bị từ chối do im lặng', st, 'rejected');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn tiếp tục', o.status, 'active');
});

them('TH-045', 'Người bán xin hủy sau cọc: cọc và phí hoàn bên mua; người giúp bị chặn', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const teo = await may.dangNhap(SDT.teo);
  const t1 = await teo.post(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  th.bang('Người giúp xin hủy: chặn', t1.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const x = await b.nam.ok(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  await b.ha.ok(`/v1/cancellation-requests/${x.id}/accept`, {});
  const lenh = (await b.ha.get(`/v1/orders/${b.orderId}/money`)).json.lenh_ngan_hang;
  th.kiem('Hoàn cọc 13.800.000', lenh.some((l: any) => l.kind === 'refund_deposit_to_buyer' && l.amount_vnd === '13800000'), lenh);
  th.kiem('Hoàn phí 138.000', lenh.some((l: any) => l.kind === 'refund_fee' && l.amount_vnd === '138000'), lenh);
  await lenhNganHangVaDoiSoat(b);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn đóng', o.status, 'closed');
});

them('TH-046', 'Bất khả kháng sau khi đã trả thẳng: người bán hoàn 32.200.000', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  await traThangVaXacNhan(b, 32200000);
  const thieu = await b.nam.post(`/v1/orders/${b.orderId}/cancellation-requests`, { reason_kind: 'force_majeure', reason_text: 'Lũ cắt đường' });
  th.bang('Bất khả kháng thiếu chứng cứ: 422', thieu.status, 422);
  await b.nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'order', entity_id: b.orderId, captured_in_app: true });
  const x = await b.nam.ok(`/v1/orders/${b.orderId}/cancellation-requests`, { reason_kind: 'force_majeure', reason_text: 'Lũ cắt đường' });
  await b.ha.ok(`/v1/cancellation-requests/${x.id}/accept`, {});
  const pays = (await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json;
  const hoan = pays.find((p: any) => p.kind === 'seller_refund');
  th.bang('T_nb 32.200.000', hoan?.amount_due_vnd, '32200000');
  await lenhNganHangVaDoiSoat(b);
  let o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Chưa đóng khi chưa hoàn trả thẳng', o.status, 'active');
  await baoTra(b, b.nam, hoan.id, 32200000);
  await xacNhan(b.lan, hoan.id, 32200000, 'full', 'FT-BKK-1');
  o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Đơn đóng bất khả kháng', o.close_reason, 'force_majeure');
});

them('TH-060', 'Gửi lại cùng khóa chống lặp: đúng một chữ ký, trả kết quả cũ', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null);
  const body = DON_CO_BAN(b.offerId!);
  const r1 = await b.ha.ok('/v1/orders', body, { key: 'khoa-lap-don-0001' });
  const r2 = await b.ha.ok('/v1/orders', body, { key: 'khoa-lap-don-0001' });
  th.bang('Lặp lại trả cùng đơn', r2.id, r1.id);
  th.bang('Đánh dấu phát lại', r2.replayed, true);
  const r3 = await b.ha.post('/v1/orders', { ...body, downgrade_price_vnd: 14000 }, { key: 'khoa-lap-don-0001' });
  th.bang('Cùng khóa khác thân: xung đột', r3.json.errors?.[0]?.code, 'IDEMPOTENCY_XUNG_DOT');
  const c = await b.ha.otpKy(r1.data.document_id);
  const s1 = await b.ha.post(`/v1/orders/${r1.id}/sign`, { challenge_id: c, code: '123456' }, { key: 'khoa-ky-0001' });
  th.bang('Ký lần 1', s1.status, 200);
  const s2 = await b.ha.post(`/v1/orders/${r1.id}/sign`, { challenge_id: c, code: '123456' }, { key: 'khoa-ky-0001' });
  th.kiem('Gửi lại ký: không tạo chữ ký thứ hai', s2.status === 200 || s2.json.errors?.[0]?.code === 'OTP_HET_HAN', s2.json);
  const n = await may.v<number>(`SELECT count(*)::int FROM core.signatures WHERE document_id=$1`, [r1.data.document_id]);
  th.bang('Đúng 1 chữ ký', n, 1);
});

them('TH-061', 'Người giúp bị chặn đúng chỗ ở API', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const teo = await may.dangNhap(SDT.teo);
  const ky = await teo.post('/v1/otp/challenges', { purpose: 'contract_sign', document_id: b.docId }, { khongKhoa: true });
  th.bang('Người giúp không nhận OTP ký', ky.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const p = await khoanDau(b);
  const tien = await teo.post('/v1/otp/challenges', { purpose: 'money_received', payment_id: p.id, amount_vnd: '32200000' }, { khongKhoa: true });
  th.bang('Người giúp không xác nhận tiền', tien.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const huy = await teo.post(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  th.bang('Người giúp không xin hủy', huy.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  // Bản 23: không tạo mới ủy quyền người giúp.
  const uq = await b.nam.post('/v1/org/delegations', { helper_user_id: teo.userId, actions: ['lot.draft', 'lot.update'], valid_to: '2026-12-31T00:00:00+07:00' });
  th.bang('Không tạo mới ủy quyền người giúp (bản 23)', uq.json.errors?.[0]?.details?.thong_bao, 'Đã bỏ vai người giúp (bản 23)');
});

them('TH-062', 'PDF: xác minh mã băm, tệp bị sửa không khớp, trang công khai không trả bản gốc', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null);
  const meta = (await b.ha.get(`/v1/documents/${b.docId}`)).json;
  const pub = await may.app.inject({ method: 'GET', url: `/v1/verify/${encodeURIComponent(meta.code)}` });
  th.kiem('Trang xác minh: có mã băm, không có nội dung gốc', pub.statusCode === 200 && pub.json().content_sha256 === meta.content_sha256 && pub.json().canonical_content === undefined, pub.json());
  const pdf = (await b.ha.get(`/v1/documents/${b.docId}/file`)).raw;
  const khop = await may.app.inject({ method: 'POST', url: `/v1/verify/${encodeURIComponent(meta.code)}/file`, payload: { data_base64: Buffer.from(pdf).toString('base64') } });
  th.bang('Bản gốc khớp', khop.json().khop, true);
  const sua = Buffer.from(pdf); sua[sua.length - 10] ^= 1;
  const k2 = await may.app.inject({ method: 'POST', url: `/v1/verify/${encodeURIComponent(meta.code)}/file`, payload: { data_base64: sua.toString('base64') } });
  th.bang('Bản sửa 1 byte không khớp', k2.json().khop, false);
  const ngoai = await may.dangNhap(SDT.quan);
  const r = await ngoai.get(`/v1/documents/${b.docId}/file`);
  th.bang('Tổ chức ngoài đơn không tải được bản gốc', r.status, 404);
  const c = await b.nam.otpKy(b.docId!);
  const kyLai = await b.nam.post(`/v1/orders/${b.orderId}/sign`, { challenge_id: c, code: '123456', commitment_ack: true });
  th.kiem('Ký lại bản đã đủ chữ ký bị chặn', kyLai.status >= 400, kyLai.json);
});

them('BM-01', 'Bảo mật: dữ liệu theo tổ chức, quyền theo hành động, giá kín, webhook', async (may, th) => {
  const b = await toiHieuLuc(may, th);
  const ngoai = await may.dangNhap(SDT.quan);
  th.bang('Tổ chức khác không xem đơn', (await ngoai.get(`/v1/orders/${b.orderId}`)).status, 404);
  th.bang('Không token: 401', (await may.app.inject({ method: 'GET', url: `/v1/orders/${b.orderId}` })).statusCode, 401);
  const k = await b.phuc.post(`/v1/orders/${b.orderId}/cancellation-requests`, {});
  th.bang('Vai kho không xin hủy được', k.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const ncId = await may.v(`SELECT id FROM core.demands WHERE code='NC-3001'`);
  const nd = (await b.ha.get(`/v1/demands/${ncId}`)).json;
  th.kiem('Chủ phiếu thấy giá tối đa', nd.lines?.[0]?.max_price_vnd !== undefined, nd);
  const nd2 = (await b.nam.get(`/v1/demands/${ncId}`)).json;
  th.kiem('Người bán không thấy giá tối đa', Array.isArray(nd2.lines) && nd2.lines.every((l: any) => l.max_price_vnd === undefined), nd2);
  const wh = await may.app.inject({ method: 'POST', url: '/v1/webhooks/bank', payload: { event_id: 'x', bank_txn_ref: 'y' } });
  th.bang('Webhook không chữ ký: 401', wh.statusCode, 401);
  th.bang('Kế toán bên mua xem hướng dẫn cọc', (await b.lan.get(`/v1/orders/${b.orderId}/deposit-instruction`)).status, 200);
  th.bang('Người bán không xem hướng dẫn cọc', (await b.nam.get(`/v1/orders/${b.orderId}/deposit-instruction`)).status, 404);
  const login = await may.q(`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname LIKE 'agv_u_%'`);
  th.kiem('Login riêng (D-01) không superuser, không bypass RLS', login.length > 0 && login.every((r: any) => !r.rolsuper && !r.rolbypassrls), login);
});
