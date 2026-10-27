// Đề nghị sửa, phụ lục (09: TH-040, TH-039 biến thể đổi ngày, tăng lượng có cọc bổ sung, im lặng = không đồng ý).
import { May, TinhHuong, SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG, baoTra, xacNhan, khoanDau, dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, chuanBiGiao, lenhNganHangVaDoiSoat, type BoiCanh } from './luong.ts';
import type { Phien } from './khung.ts';

async function toiHieuLuc(may: May) {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  return b;
}

async function kyPL(p: Phien, amendmentId: string, docId: string) {
  const c = await p.ok('/v1/otp/challenges', { purpose: 'amendment_sign', document_id: docId }, { khongKhoa: true });
  return p.ok(`/v1/amendments/${amendmentId}/sign`, { challenge_id: c.challenge_id, code: '123456' });
}

them('TH-040', 'Bất khả kháng: giảm 2.000 → 1.500 kg bằng phụ lục hai bên ký', async (may, th) => {
  const b = await toiHieuLuc(may);
  const anh = await b.nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'order', entity_id: b.orderId, captured_in_app: true });
  const dn = await b.nam.ok(`/v1/orders/${b.orderId}/amendments`, { kind: 'force_majeure_reduction', payload: { qty_g: 1500000 }, reason: 'Mưa đá 01/11', evidence_document_ids: [anh.id] });
  th.bang('Đề nghị mở', dn.status, 'open');
  const o1 = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Cờ đề nghị mở', o1.co.de_nghi_mo, true);
  const dy = await b.ha.ok(`/v1/amendments/${dn.id}/accept`, {});
  th.bang('Cọc mới 10.350.000', dy.data.tinh.coc_vnd, '10350000');
  th.bang('Chênh cọc −3.450.000', dy.data.tinh.chenh_coc_vnd, '-3450000');
  th.bang('Phí mới 103.500', dy.data.tinh.phi_vnd, '103500');
  const k1 = await kyPL(b.ha, dn.id, dy.data.annex_document_id);
  th.bang('Bên mua ký phụ lục, chờ bên kia', k1.status, 'cho_ben_kia_ky');
  const k2 = await kyPL(b.nam, dn.id, dy.data.annex_document_id);
  th.bang('Phụ lục hiệu lực', k2.status, 'effective');
  th.bang('Hoàn phí 34.500', k2.data.he_qua?.hoan_phi_vnd, '34500');
  th.bang('Hoàn cọc chênh 3.450.000 ngay khi ký phụ lục (0036)', k2.data.he_qua?.hoan_coc_vnd, '3450000');
  th.bang('Trả thẳng trước bốc mới 24.150.000', k2.data.he_qua?.tra_thang_moi_vnd, '24150000');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Phiên bản hiệu lực 2', o.effective_version_no, 2);
  th.bang('Đợt giao còn 1.500 kg', o.dot_giao[0].planned_qty_g, '1500000');
  const sl = (await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
  th.bang('500 kg về lô', sl.committed, '1500000');
  const meta = (await b.ha.get(`/v1/documents/${dy.data.annex_document_id}`)).json;
  th.bang('Phụ lục là phiên bản 2 trong chuỗi hợp đồng', meta.version_no, 2);
  await may.he('/v1/sim/bank/process-instructions', {});
  await may.he('/v1/sim/bank/deliver', {});
  const p = await khoanDau(b);
  await baoTra(b, b.lan, p.id, 24150000);
  await xacNhan(b.nam, p.id, 24150000, 'full', 'FT-PL-1');
  await chuanBiGiao(b);
  await may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { qr_token: qr.data.qr_token });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: 1500000, lines: [{ kind: 'accepted', qty_g: 1500000 }] });
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival`, { weighed_g: 1495000 });
  const x = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival/confirm`, {});
  th.bang('V 34.500.000', x.data.quyet_toan?.V, '34500000');
  th.bang('C_nb 10.350.000', x.data.quyet_toan?.release_vnd, '10350000');
  th.bang('Quyết toán không hoàn cọc chênh lần hai', x.data.quyet_toan?.refund_vnd, '0');
  await lenhNganHangVaDoiSoat(b);
  th.bang('Hoàn tất', (await b.ha.get(`/v1/orders/${b.orderId}`)).json.status, 'completed');
});

them('TH-040s', 'Đề nghị giảm lượng, bên mua im lặng 24 giờ = không đồng ý', async (may, th) => {
  const b = await toiHieuLuc(may);
  const dn = await b.nam.ok(`/v1/orders/${b.orderId}/amendments`, { kind: 'decrease_qty', payload: { qty_g: 1800000 }, notice_days_before_delivery: 1 });
  const lan2 = await b.nam.post(`/v1/orders/${b.orderId}/amendments`, { kind: 'change_date', payload: { delivery_from: '2026-11-05T06:00:00+07:00', delivery_to: '2026-11-05T12:00:00+07:00' } });
  th.bang('Một đề nghị mở mỗi lúc', lan2.json.errors?.[0]?.code, 'DANG_CO_DE_NGHI');
  await may.he('/v1/test/clock', { advance_minutes: 24 * 60 + 1 });
  const ds = (await b.nam.get(`/v1/orders/${b.orderId}/amendments`)).json;
  th.bang('Im lặng = không đồng ý', ds.find((x: any) => x.id === dn.id)?.status, 'rejected');
  th.bang('Đơn giữ nguyên phiên bản 1', (await b.ha.get(`/v1/orders/${b.orderId}`)).json.effective_version_no, 1);
});

them('TH-AM-1', 'Tăng lượng 2.000 → 2.400 kg: cọc bổ sung, chặn giao tới khi ngân hàng nhận', async (may, th) => {
  const b = await toiHieuLuc(may);
  const dn = await b.ha.ok(`/v1/orders/${b.orderId}/amendments`, { kind: 'increase_qty', payload: { qty_g: 2400000 }, reason: 'Cần thêm hàng' });
  const dy = await b.nam.ok(`/v1/amendments/${dn.id}/accept`, {});
  th.bang('Cọc mới 16.560.000', dy.data.tinh.coc_vnd, '16560000');
  await kyPL(b.nam, dn.id, dy.data.annex_document_id);
  const c = await b.ha.ok('/v1/otp/challenges', { purpose: 'amendment_sign', document_id: dy.data.annex_document_id }, { khongKhoa: true });
  const vuot = await b.ha.post(`/v1/amendments/${dn.id}/sign`, { challenge_id: c.challenge_id, code: '123456' });
  th.kiem('Hà ký phụ lục 55,2 triệu vượt hạn mức: bị chặn', vuot.status >= 400, vuot.json);
  const thinh = await may.dangNhap(SDT.thinh);
  const k = await kyPL(thinh, dn.id, dy.data.annex_document_id);
  th.bang('Bổ sung cọc 2.760.000', k.data.he_qua?.chenh_coc_vnd, '2760000');
  const ref = k.data.he_qua?.bo_sung_coc_ref;
  th.kiem('Mã nạp cọc ngắn do DB cấp (TP + 12 số, MOD97)', /^TP\d{12}$/.test(ref ?? ''), k.data);
  const hdc = (await thinh.get(`/v1/orders/${b.orderId}/deposit-instruction`)).json;
  th.kiem('Tải lại: GET deposit-instruction trả lại mã nạp TP… còn chờ', hdc.top_ups?.some((x: any) => x.payment_ref === ref && x.status === 'awaiting_transfer' && x.total_vnd === String(Number(k.data.he_qua.chenh_coc_vnd) + Number(k.data.he_qua.chenh_phi_vnd))), hdc.top_ups);
  const p = await khoanDau(b);
  th.bang('Trả thẳng mới 38.640.000', p.amount_due_vnd, '38640000');
  await baoTra(b, b.lan, p.id, 38640000);
  await xacNhan(b.nam, p.id, 38640000, 'full', 'FT-TANG-1');
  await chuanBiGiao(b);
  let the = (await b.lan.get(`/v1/deliveries/${b.deliveryId}/readiness`)).json;
  th.kiem('Chưa bổ sung cọc: chưa sẵn sàng', (await b.lan.get(`/v1/deliveries/${b.deliveryId}`)).json.status === 'preparing', the);
  const tong = Number(k.data.he_qua.chenh_coc_vnd) + Number(k.data.he_qua.chenh_phi_vnd);
  await may.he('/v1/sim/bank/transfers', { payment_ref: ref, amount_vnd: tong, payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const st = (await b.lan.get(`/v1/deliveries/${b.deliveryId}`)).json.status;
  th.bang('Bổ sung đủ: đợt sẵn sàng', st, 'ready');
  th.bang('Đợt 2.400 kg', (await b.lan.get(`/v1/deliveries/${b.deliveryId}`)).json.planned_qty_g, '2400000');
});

them('TH-AM-2', 'Phụ lục giảm giá 23.000 → 20.000: hoàn cọc chênh về nguồn, phí giữ theo Q06', async (may, th) => {
  const b = await toiHieuLuc(may);
  const dn = await b.nam.ok(`/v1/orders/${b.orderId}/amendments`, { kind: 'change_price', payload: { unit_price_vnd: 20000 }, reason: 'Hai bên đồng ý giảm giá' });
  const dy = await b.ha.ok(`/v1/amendments/${dn.id}/accept`, {});
  const thinh = await may.dangNhap(SDT.thinh);
  await kyPL(b.nam, dn.id, dy.data.annex_document_id);
  const k = await kyPL(thinh, dn.id, dy.data.annex_document_id);
  th.bang('Phụ lục hiệu lực', k.status, 'effective');
  th.bang('Hoàn cọc chênh 1.800.000', k.data.he_qua?.hoan_coc_vnd, '1800000');
  th.bang('Không hoàn phí khi chỉ đổi giá (Q06)', k.data.he_qua?.hoan_phi_vnd ?? '0', '0');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Phiên bản 2', o.effective_version_no, 2);
  th.bang('Phí giữ 138.000', await may.v<string>(`SELECT fee_vnd::text FROM core.order_versions WHERE order_id=$1 AND version_no=2`, [b.orderId]), '138000');
});
