// Các bước dựng sẵn của luồng thuận HĐ-2001 (TH-006) để tái dùng ở nhiều tình huống.
import { May, Phien, SDT, TinhHuong } from './khung.ts';

export const ANH_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export interface BoiCanh {
  may: May; ha: Phien; nam: Phien; lan: Phien; phuc: Phien;
  lotId: string; offerId?: string; orderId?: string; docId?: string; depositId?: string; paymentRef?: string;
  paymentId?: string; deliveryId?: string; orderCode?: string;
}

export async function dangNhapCacBen(may: May): Promise<BoiCanh> {
  const [ha, nam, lan, phuc] = [await may.dangNhap(SDT.ha), await may.dangNhap(SDT.nam), await may.dangNhap(SDT.lan), await may.dangNhap(SDT.phuc)];
  const lotId = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  return { may, ha, nam, lan, phuc, lotId };
}

/** Chào giá → đồng ý (giữ lượng). */
export async function chaoVaDongY(b: BoiCanh, th: TinhHuong | null, gia = 23000, qtyKg = 2000) {
  const line = await b.may.v<string>(`SELECT l.id FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE d.code='NC-3001' AND l.grade_code='L1'`);
  const o = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, demand_line_id: line, qty_g: qtyKg * 1000, price_vnd: gia });
  th?.bang('Lời chào gửi', o.status, 'sent');
  const a = await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  th?.bang('Đồng ý giá', a.status, 'accepted');
  th?.kiem('Câu "Đây chưa phải hợp đồng."', String(a.data.thong_bao).startsWith('Đây chưa phải hợp đồng.'), a.data.thong_bao);
  b.offerId = o.id;
  return a;
}

export interface DieuKhoan { payment_timing?: string; delivery_mode?: string; transport_by?: string; pay_after_days?: number; silent_accept_hours?: number | null }

/** Lập đơn + ký hai bên (bên mua OTP, người bán OTP + cam kết). */
export async function lapVaKy(b: BoiCanh, th: TinhHuong | null, dk: DieuKhoan = {}) {
  const phucId = b.phuc.userId;
  const d = await b.ha.ok('/v1/orders', {
    offer_id: b.offerId, downgrade_price_vnd: 15000, delivery_mode: dk.delivery_mode ?? 'at_farm', transport_by: dk.transport_by ?? 'partner_for_buyer',
    delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: dk.payment_timing ?? 'before_loading',
    pay_after_days: dk.pay_after_days, designated_receiver_user_id: phucId, silent_accept_hours: dk.silent_accept_hours === undefined ? 2 : dk.silent_accept_hours,
  });
  b.orderId = d.id; b.docId = d.data.document_id; b.orderCode = d.data.code;
  th?.bang('Đơn soạn thảo', d.status, 'drafting');
  const c1 = await b.ha.otpKy(b.docId!);
  const s1 = await b.ha.ok(`/v1/orders/${b.orderId}/sign`, { challenge_id: c1, code: '123456' });
  th?.bang('Bên mua ký và gửi', s1.status, 'awaiting_seller');
  const c2 = await b.nam.otpKy(b.docId!);
  const s2 = await b.nam.ok(`/v1/orders/${b.orderId}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  th?.bang('Người bán ký', s2.status, 'awaiting_deposit');
  return d;
}

/** Bên mua chuyển cọc qua ngân hàng mô phỏng, webhook có chữ ký được giao. */
export async function chuyenCoc(b: BoiCanh, soTien?: number) {
  const hd = (await b.lan.get(`/v1/orders/${b.orderId}/deposit-instruction`)).json;
  b.depositId = hd.deposit_id; b.paymentRef = hd.payment_ref;
  await b.may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: soTien ?? Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  const g = await b.may.he('/v1/sim/bank/deliver', {});
  return { hd, g };
}

export async function baoTra(b: BoiCanh, nguoi: Phien, paymentId: string, soTien: number) {
  const anh = await nguoi.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'payment', entity_id: paymentId, captured_in_app: true });
  return nguoi.ok(`/v1/payments/${paymentId}/report`, { amount_vnd: soTien, method: 'bank_transfer', evidence_document_id: anh.id });
}

export async function xacNhan(nguoi: Phien, paymentId: string, soTien: number, result: 'full' | 'partial', ref: string) {
  const c = await nguoi.otpTien(paymentId, soTien);
  return nguoi.post(`/v1/payments/${paymentId}/confirm`, { challenge_id: c, code: '123456', amount_vnd: soTien, result, bank_txn_ref: ref });
}

export async function khoanDau(b: BoiCanh) {
  const pays = (await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json;
  return pays.find((x: any) => x.direction === 'buyer_to_seller' && x.status !== 'cancelled');
}

export async function traThangVaXacNhan(b: BoiCanh, soTien: number, ref = 'FT-TEST-0001') {
  const pays = (await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json;
  const p = pays.find((x: any) => x.kind === 'goods_before_loading' || x.kind === 'goods_on_receipt' || x.kind === 'goods_after_days');
  b.paymentId = p.id;
  const anh = await b.lan.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'payment', entity_id: p.id, captured_in_app: true });
  await b.lan.ok(`/v1/payments/${p.id}/report`, { amount_vnd: soTien, method: 'bank_transfer', evidence_document_id: anh.id });
  const c = await b.nam.otpTien(p.id, soTien);
  return b.nam.ok(`/v1/payments/${p.id}/confirm`, { challenge_id: c, code: '123456', amount_vnd: soTien, result: 'full', bank_txn_ref: ref });
}

export async function chuanBiGiao(b: BoiCanh) {
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  b.deliveryId = o.dot_giao[0].id;
  return b.ha.ok(`/v1/deliveries/${b.deliveryId}/trip`, { plate_no: '66C-123.45', freight_vnd: 3200000 });
}

export async function nghiemThuTaiVuon(b: BoiCanh, dong: { kind: string; qty_kg: number; reason_code?: string; anh?: boolean }[], canKg?: number) {
  await b.may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { qr_token: qr.data.qr_token, plate_no: '66C-123.45' });
  const tong = canKg ?? dong.reduce((a, x) => a + x.qty_kg, 0);
  const lines = [];
  for (const x of dong) {
    let ev: string | undefined;
    if (x.anh) ev = (await b.phuc.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'delivery', entity_id: b.deliveryId, captured_in_app: true })).id;
    lines.push({ kind: x.kind, qty_g: x.qty_kg * 1000, reason_code: x.reason_code, evidence_document_id: ev });
  }
  return b.phuc.ok(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: tong * 1000, seal_code: 'M-2291', lines });
}

export async function lenhNganHangVaDoiSoat(b: BoiCanh) {
  await b.may.he('/v1/sim/bank/process-instructions', {});
  const g = await b.may.he('/v1/sim/bank/deliver', {});
  const tri = await b.may.dangNhap(SDT.tri);
  const r = await tri.ok('/v1/ops/reconcile', {});
  return { g, r };
}
