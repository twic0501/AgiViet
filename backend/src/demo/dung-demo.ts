// Dựng 10 tình huống trình diễn cho số 0001–0010 bằng API nghiệp vụ thật (môi trường thử).
// Bên kia do "quản trị đóng vai" qua /v1/test/impersonate. Idempotent: số nào đã đang ở đúng tình huống thì giữ;
// nếu tình huống cũ đã đi tiếp (người dùng đã bấm) thì lời chào/đơn chưa cọc cũ được rút/đóng và dựng tình huống mới.
// Đơn đã cọc cũ không xóa được (sổ cái bất biến) nên giữ lại làm lịch sử.
import { SO_DEMO } from './so-demo.ts';

export type Goi = (method: 'GET' | 'POST', url: string, body?: any, token?: string) => Promise<{ status: number; json: any }>;
const ANH = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PIN = '2468'; const OTP = '123456';
let dem = 0;
const khoa = () => `demo-${Date.now().toString(36)}-${(dem++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface KetQuaDemo { so: string; ten: string; tinh_huong: string; trang_thai: string; giu_nguyen: boolean; ids: Record<string, string> }

/** gioThat: stack không có đồng hồ thử ở DB (Postgres như production) → đặt đồng hồ backend = giờ thật, không tua; khung giao bắt đầu ngay. */
export async function dungDemo(goi: Goi, chi?: string[], gioThat = false): Promise<KetQuaDemo[]> {
  const ok = async (method: 'GET' | 'POST', url: string, body?: any, token?: string) => {
    const b = method === 'POST' && body && !url.startsWith('/v1/otp/') && !url.startsWith('/v1/sim/') && !url.startsWith('/v1/test/') ? { idempotency_key: khoa(), ...body } : body;
    const r = await goi(method, url, b, token);
    if (r.status >= 300) throw new Error(`${method} ${url} -> ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    return r.json;
  };
  const vai = async (phone: string, org?: string) => (await ok('POST', '/v1/test/impersonate', { phone, org_code: org })) as { token: string; user: any };
  if (gioThat) await ok('POST', '/v1/test/clock', { set: new Date().toISOString() });
  const gio = async () => new Date((await ok('GET', '/v1/test/clock')).now);
  const lotTheoMa = async (seller: string, code: string) => {
    const ds = await ok('GET', '/v1/lots?mine=true', undefined, seller);
    const l = ds.find((x: any) => x.code === code); if (!l) throw new Error(`Không thấy lô ${code}`);
    const ct = await ok('GET', `/v1/lots/${l.id}`, undefined, seller);
    return { id: l.id, gia: Number(ct.ask_price_vnd), con: Number(l.available_g) };
  };
  const kyOtp = async (token: string, purpose: string, extra: any) => (await ok('POST', '/v1/otp/challenges', { purpose, ...extra }, token)).challenge_id;
  const chao = async (buyer: string, seller: string, lotCode: string, kg: number) => {
    const lot = await lotTheoMa(seller, lotCode);
    const q = Math.min(kg * 1000, Math.floor(lot.con * 0.7 / 100000) * 100000);
    if (q < 100000) throw new Error(`Lô ${lotCode} không còn đủ hàng để dựng tình huống (${lot.con} g)`);
    const o = await ok('POST', '/v1/offers', { direction: 'buyer_bid', lot_id: lot.id, qty_g: q, price_vnd: lot.gia }, buyer);
    return { offerId: o.id as string, lot, q };
  };
  const lapDon = async (buyer: string, buyerUser: string, seller: string, lotCode: string, kg: number, opt: { payment_timing?: string; receiver?: string; tu?: Date; den?: Date } = {}) => {
    const { offerId, lot, q } = await chao(buyer, seller, lotCode, kg);
    await ok('POST', `/v1/offers/${offerId}/accept`, {}, seller);
    const now = await gio();
    const tu = opt.tu ?? new Date(now.getTime() + (gioThat ? -5 * 60e3 : 2 * 3600e3)); const den = opt.den ?? new Date(tu.getTime() + 8 * 3600e3);
    const d = await ok('POST', '/v1/orders', { offer_id: offerId, downgrade_price_vnd: Math.round(lot.gia * 0.65 / 100) * 100, delivery_mode: 'at_farm', transport_by: 'buyer',
      delivery_from: tu.toISOString(), delivery_to: den.toISOString(), payment_timing: opt.payment_timing ?? 'on_receipt', designated_receiver_user_id: opt.receiver ?? buyerUser, silent_accept_hours: 2 }, buyer);
    return { orderId: d.id as string, docId: d.data.document_id as string, q, gia: lot.gia };
  };
  const kyHaiBen = async (buyer: string, seller: string, don: { orderId: string; docId: string }, chiBenMua = false) => {
    await ok('POST', `/v1/orders/${don.orderId}/sign`, { challenge_id: await kyOtp(buyer, 'contract_sign', { document_id: don.docId }), code: OTP }, buyer);
    if (!chiBenMua) await ok('POST', `/v1/orders/${don.orderId}/sign`, { challenge_id: await kyOtp(seller, 'contract_sign', { document_id: don.docId }), code: OTP, commitment_ack: true }, seller);
  };
  const coc = async (buyer: string, orderId: string, ten: string) => {
    const hd = await ok('GET', `/v1/orders/${orderId}/deposit-instruction`, undefined, buyer);
    await ok('POST', '/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'), name: ten } });
    await ok('POST', '/v1/sim/bank/deliver', {});
  };
  const sanSangVaCan = async (buyer: string, receiver: string, seller: string, orderId: string) => {
    const o = await ok('GET', `/v1/orders/${orderId}`, undefined, buyer);
    const did = o.dot_giao[0].id;
    // Xe phải có trong danh mục; thử lần lượt xe ảo còn trống lịch (DB chặn đặt trùng giờ).
    let datDuoc = false; let loiCuoi = '';
    for (const plate of ['DEMO-66C-001', 'DEMO-66C-002', 'DEMO-66C-003', 'DEMO-66C-004', '66C-123.45', '66C-678.90']) {
      const r = await goi('POST', `/v1/deliveries/${did}/trip`, { idempotency_key: khoa(), plate_no: plate, freight_vnd: 1500000 }, buyer);
      if (r.status < 300) { datDuoc = true; break; }
      loiCuoi = JSON.stringify(r.json).slice(0, 200);
    }
    if (!datDuoc) throw new Error('Không còn xe ảo trống lịch: ' + loiCuoi);
    const d = await ok('GET', `/v1/deliveries/${did}`, undefined, buyer);
    if (!gioThat) await ok('POST', '/v1/test/clock', { set: new Date(new Date(d.window_from).getTime() + 30 * 60e3).toISOString() });
    return did;
  };
  const batDauCan = async (receiver: string, seller: string, did: string) => {
    const qr = await ok('POST', `/v1/deliveries/${did}/receipt-qr`, {}, receiver);
    await ok('POST', `/v1/deliveries/${did}/start-check`, { qr_token: qr.data.qr_token }, seller);
  };
  /** Trả thẳng trước bốc: bên mua báo trả kèm ảnh chứng từ, người bán xác nhận bằng OTP (đúng như app). */
  const traTruocBoc = async (buyer: string, seller: string, orderId: string) => {
    const p = (await ok('GET', `/v1/orders/${orderId}/payments`, undefined, buyer)).find((x: any) => x.kind === 'goods_before_loading');
    const anh = await ok('POST', '/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'payment', entity_id: p.id, captured_in_app: true }, buyer);
    await ok('POST', `/v1/payments/${p.id}/report`, { amount_vnd: Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, buyer);
    const c = await kyOtp(seller, 'money_received', { payment_id: p.id, amount_vnd: String(p.amount_due_vnd) });
    await ok('POST', `/v1/payments/${p.id}/confirm`, { challenge_id: c, code: OTP, amount_vnd: Number(p.amount_due_vnd), result: 'full', bank_txn_ref: 'FT' + Date.now().toString().slice(-10) }, seller);
  };
  const anhDot = async (token: string, did: string) => (await ok('POST', '/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'delivery', entity_id: did, captured_in_app: true }, token)).id;
  const donCua = async (token: string) => (await ok('GET', '/v1/orders', undefined, token)) as any[];

  const ra: KetQuaDemo[] = [];
  const tim = (so: string) => SO_DEMO.find((x) => x.so === so)!;
  const lam = async (so: string, fn: (me: { token: string; user: any }) => Promise<any>) => {
    if (chi && !chi.includes(so)) return;
    const s = tim(so); const me = await vai(s.sdt);
    const r = await fn(me);
    ra.push({ so, ten: s.ten, tinh_huong: s.tinh_huong, ...r });
  };

  // Các bên đóng vai (quản trị)
  const quan = await vai('0903000410'); const viet = await vai('0901000710'); const thinh = await vai('0909000213');
  const kim = await vai('0977000660'); const nam = await vai('0918000421'); const tung = null;
  void tung;

  // 0001: lời chào mới cần trả lời
  await lam('0001', async (me) => {
    const ds = await ok('GET', '/v1/offers', undefined, me.token).catch(() => []);
    const con = (ds as any[]).find((x) => x.status === 'sent' && x.direction === 'buyer_bid');
    if (con) return { trang_thai: 'offer:sent', giu_nguyen: true, ids: { offer_id: con.id } };
    const { offerId } = await chao(quan.token, me.token, 'L-0430', 1500);
    return { trang_thai: 'offer:sent', giu_nguyen: false, ids: { offer_id: offerId } };
  });
  // 0002: hợp đồng chờ người bán ký
  await lam('0002', async (me) => {
    const c = (await donCua(me.token)).find((x) => x.status === 'awaiting_seller');
    if (c) return { trang_thai: 'awaiting_seller', giu_nguyen: true, ids: { order_id: c.id } };
    const d = await lapDon(viet.token, viet.user.user_id, me.token, 'L-0431', 1200);
    await kyHaiBen(viet.token, me.token, d, true);
    return { trang_thai: 'awaiting_seller', giu_nguyen: false, ids: { order_id: d.orderId } };
  });
  // 0003: bên mua báo đã trả tiền trước bốc, chờ người bán xác nhận
  await lam('0003', async (me) => {
    for (const o of (await donCua(me.token)).filter((x) => x.status === 'active')) {
      const p = (await ok('GET', `/v1/orders/${o.id}/payments`, undefined, me.token)).find((x: any) => x.status === 'payer_reported');
      if (p) return { trang_thai: 'payment:payer_reported', giu_nguyen: true, ids: { order_id: o.id, payment_id: p.id } };
    }
    const d = await lapDon(thinh.token, thinh.user.user_id, me.token, 'L-0460', 1000, { payment_timing: 'before_loading' });
    await kyHaiBen(thinh.token, me.token, d); await coc(thinh.token, d.orderId, 'CONG TY NHA MAY SAY DONG XANH');
    const p = (await ok('GET', `/v1/orders/${d.orderId}/payments`, undefined, thinh.token)).find((x: any) => x.kind === 'goods_before_loading');
    const anh = await ok('POST', '/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'payment', entity_id: p.id, captured_in_app: true }, thinh.token);
    await ok('POST', `/v1/payments/${p.id}/report`, { amount_vnd: Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, thinh.token);
    return { trang_thai: 'payment:payer_reported', giu_nguyen: false, ids: { order_id: d.orderId, payment_id: p.id } };
  });
  // 0004: kết quả cân có hạ cấp kèm ảnh, cân thiếu; chờ người bán ký hoặc "Không đúng"
  await lam('0004', async (me) => {
    for (const o of (await donCua(me.token)).filter((x) => x.status === 'active')) {
      const od = await ok('GET', `/v1/orders/${o.id}`, undefined, me.token);
      const dd = od.dot_giao?.find((x: any) => x.status === 'awaiting_seller');
      if (dd) return { trang_thai: 'delivery:awaiting_seller', giu_nguyen: true, ids: { order_id: o.id, delivery_id: dd.id } };
    }
    const d = await lapDon(quan.token, quan.user.user_id, me.token, 'L-0420', 1000);
    await kyHaiBen(quan.token, me.token, d); await coc(quan.token, d.orderId, 'CONG TY XNK SONG TIEN');
    const did = await sanSangVaCan(quan.token, quan.token, me.token, d.orderId);
    await batDauCan(quan.token, me.token, did);
    const anh = await anhDot(quan.token, did);
    const tong = d.q - 40000; // cân thiếu 40 kg so với đợt
    const ha = 60000; const tra = 20000;
    await ok('POST', `/v1/deliveries/${did}/acceptance`, { pin: PIN, weighed_g: tong, seal_code: 'M-' + String(1000 + Math.floor(Math.random() * 8999)), lines: [
      { kind: 'accepted', qty_g: tong - ha - tra }, { kind: 'downgraded', qty_g: ha, reason_code: 'TRAY_VO', evidence_document_id: anh }, { kind: 'rejected', qty_g: tra, reason_code: 'DAP', evidence_document_id: anh }] }, quan.token);
    return { trang_thai: 'delivery:awaiting_seller', giu_nguyen: false, ids: { order_id: d.orderId, delivery_id: did } };
  });
  // 0005: phần trả lại thành lô con loại 2, gợi ý bán gấp
  await lam('0005', async (me) => {
    const lo = (await ok('GET', '/v1/lots?mine=true', undefined, me.token)).find((x: any) => x.goi_y_ban_gap && x.status === 'on_sale');
    if (lo) return { trang_thai: 'lot:return_on_sale', giu_nguyen: true, ids: { lot_id: lo.id } };
    const d = await lapDon(viet.token, viet.user.user_id, me.token, 'L-0450', 800, { payment_timing: 'before_loading' });
    await kyHaiBen(viet.token, me.token, d); await coc(viet.token, d.orderId, 'CONG TY CHE BIEN MEKONG'); await traTruocBoc(viet.token, me.token, d.orderId);
    const did = await sanSangVaCan(viet.token, viet.token, me.token, d.orderId);
    await batDauCan(viet.token, me.token, did);
    const anh = await anhDot(viet.token, did);
    await ok('POST', `/v1/deliveries/${did}/acceptance`, { pin: PIN, weighed_g: d.q, seal_code: 'M-5521', lines: [
      { kind: 'accepted', qty_g: d.q - 150000 }, { kind: 'downgraded', qty_g: 50000, reason_code: 'TRAY_VO', evidence_document_id: anh }, { kind: 'rejected', qty_g: 100000, reason_code: 'DAP', evidence_document_id: anh }] }, viet.token);
    const dy = await ok('POST', `/v1/deliveries/${did}/acceptance/agree`, { pin: PIN }, me.token);
    return { trang_thai: 'lot:return_on_sale', giu_nguyen: false, ids: { order_id: d.orderId, delivery_id: did, lot_id: dy.data?.lo_con?.id ?? '' } };
  });
  // 0006: nhu cầu sầu riêng có 3 báo giá
  await lam('0006', async (me) => {
    const mo = (await ok('GET', '/v1/demands?mine=true', undefined, me.token)).find((x: any) => x.status === 'open');
    if (mo) {
      const so = await ok('GET', `/v1/demands/${mo.id}/offer-comparison`, undefined, me.token).catch(() => null);
      const n = Array.isArray(so) ? so.length : 0;
      if (n >= 2) return { trang_thai: 'demand:open_with_quotes', giu_nguyen: true, ids: { demand_id: mo.id } };
      await ok('POST', `/v1/demands/${mo.id}/close`, {}, me.token).catch(() => null);
    }
    const now = await gio();
    const ngay = (d: number) => new Date(now.getTime() + d * 86400e3).toISOString().slice(0, 10);
    const dm = await ok('POST', '/v1/demands', { product_code: 'SAU_RIENG', segment_code: 'horeca', needed_from: ngay(5), needed_to: ngay(30), delivery_mode: 'self_pickup',
      lines: [{ grade_code: 'A', qty_g: '600000', max_price_vnd: '95000', min_source_qty_g: '100000' }] }, me.token);
    const ct = await ok('GET', `/v1/demands/${dm.id}`, undefined, me.token);
    const line = ct.lines?.[0]?.id ?? ct.dong?.[0]?.id;
    const ids: Record<string, string> = { demand_id: dm.id };
    for (const [sdt, lo, gia] of [['0977000630', 'L-0441', 88000], ['0977000640', 'L-0442', 85000], ['0977000650', 'L-0443', 91000]] as const) {
      const s = await vai(sdt); const l = await lotTheoMa(s.token, lo);
      const q = await ok('POST', '/v1/offers', { direction: 'seller_quote', lot_id: l.id, demand_line_id: line, qty_g: 200000, price_vnd: gia }, s.token);
      ids[lo] = q.id;
    }
    return { trang_thai: 'demand:open_with_quotes', giu_nguyen: false, ids };
  });
  // 0007: hai bên đã ký, bên mua cần chuyển cọc
  await lam('0007', async (me) => {
    const c = (await donCua(me.token)).find((x) => x.status === 'awaiting_deposit');
    if (c) return { trang_thai: 'awaiting_deposit', giu_nguyen: true, ids: { order_id: c.id } };
    const now = await gio();
    const d = await lapDon(me.token, me.user.user_id, kim.token, 'L-0444', 300, { tu: new Date(now.getTime() + 20 * 86400e3), den: new Date(now.getTime() + 20 * 86400e3 + 8 * 3600e3) });
    await kyHaiBen(me.token, kim.token, d);
    return { trang_thai: 'awaiting_deposit', giu_nguyen: false, ids: { order_id: d.orderId } };
  });
  // 0008: đến giờ giao tại vườn, người nhận mở mã rồi nhập nghiệm thu
  await lam('0008', async (me) => {
    for (const o of (await donCua(me.token)).filter((x) => x.status === 'active')) {
      const od = await ok('GET', `/v1/orders/${o.id}`, undefined, me.token);
      const dd = od.dot_giao?.find((x: any) => x.status === 'ready');
      if (dd) { const dv = await ok('GET', `/v1/deliveries/${dd.id}`, undefined, me.token); if (dv.receiver_user_id === me.user.user_id) return { trang_thai: 'delivery:ready', giu_nguyen: true, ids: { order_id: o.id, delivery_id: dd.id } }; }
    }
    const d = await lapDon(quan.token, quan.user.user_id, nam.token, 'L-0412', 800, { receiver: me.user.user_id });
    await kyHaiBen(quan.token, nam.token, d); await coc(quan.token, d.orderId, 'CONG TY XNK SONG TIEN');
    const did = await sanSangVaCan(quan.token, me.token, nam.token, d.orderId);
    return { trang_thai: 'delivery:ready', giu_nguyen: false, ids: { order_id: d.orderId, delivery_id: did } };
  });
  // 0009: tranh chấp chất lượng khác mẫu, chờ kiểm định
  await lam('0009', async (me) => {
    for (const o of await donCua(me.token)) {
      const tc = await ok('GET', `/v1/orders/${o.id}/disputes`, undefined, me.token).catch(() => []);
      const x = (tc as any[]).find((y) => y.status === 'awaiting_inspection');
      if (x) return { trang_thai: 'dispute:awaiting_inspection', giu_nguyen: true, ids: { order_id: o.id, dispute_id: x.id } };
    }
    const d = await lapDon(me.token, me.user.user_id, nam.token, 'L-0414', 600, { payment_timing: 'before_loading' });
    await kyHaiBen(me.token, nam.token, d); await coc(me.token, d.orderId, 'VUA LUA BA THANH'); await traTruocBoc(me.token, nam.token, d.orderId);
    const did = await sanSangVaCan(me.token, me.token, nam.token, d.orderId);
    await batDauCan(me.token, nam.token, did);
    await ok('POST', `/v1/deliveries/${did}/acceptance`, { pin: PIN, weighed_g: d.q, seal_code: 'M-7710', lines: [{ kind: 'accepted', qty_g: d.q }] }, me.token);
    await ok('POST', `/v1/deliveries/${did}/acceptance/agree`, { pin: PIN }, nam.token);
    await ok('POST', `/v1/deliveries/${did}/arrival`, { weighed_g: d.q - 5000 }, me.token);
    const anh = await anhDot(me.token, did);
    const k = await ok('POST', `/v1/deliveries/${did}/arrival/complaint`, { line_no: 1, qty_g: 100000, reason: 'Sâu cuống bên trong, khác mẫu M-7710', reason_code: 'SAU_DUC', seal_code: 'M-7710', inspection_fee_vnd: 280000, evidence_document_id: anh }, me.token);
    return { trang_thai: 'dispute:awaiting_inspection', giu_nguyen: false, ids: { order_id: d.orderId, delivery_id: did, dispute_id: k.id } };
  });
  // 0010: đặt trước khi hái, gần ngày hái, chờ chốt lượng/giá
  await lam('0010', async (me) => {
    const c = (await ok('GET', '/v1/seasonal-orders?type=pre_harvest', undefined, me.token)).find((x: any) => x.phia === 'buyer' && x.order_status === 'active');
    if (c) return { trang_thai: 'pre_harvest:active', giu_nguyen: true, ids: { order_id: c.id } };
    const son = await vai('0977000620');
    const lot = await lotTheoMa(son.token, 'L-0447');
    const q = Math.min(1000000, Math.floor(lot.con * 0.6 / 100000) * 100000);
    const o = await ok('POST', '/v1/offers', { direction: 'buyer_bid', lot_id: lot.id, qty_g: q, price_vnd: lot.gia }, me.token);
    await ok('POST', `/v1/offers/${o.id}/accept`, {}, son.token);
    const now = await gio();
    const ngay = (dd: number) => new Date(now.getTime() + dd * 86400e3);
    const d = await ok('POST', '/v1/seasonal-orders', { offer_id: o.id, delivery_mode: 'at_farm', transport_by: 'buyer', payment_timing: 'on_receipt', designated_receiver_user_id: me.user.user_id,
      vu: { loai: 'pre_harvest', qty_max_g: String(Math.round(q * 1.2)), harvest_from: ngay(3).toISOString().slice(0, 10), harvest_to: ngay(12).toISOString().slice(0, 10),
        batches: [{ qty_g: String(q), from: ngay(6).toISOString(), to: new Date(ngay(6).getTime() + 10 * 3600e3).toISOString() }] } }, me.token);
    await kyHaiBen(me.token, son.token, { orderId: d.id, docId: d.data.document_id });
    await coc(me.token, d.id, 'VUA TRAI CAY TU HUNG');
    return { trang_thai: 'pre_harvest:active', giu_nguyen: false, ids: { order_id: d.id } };
  });
  return ra;
}
