// Tình huống tranh chấp (09 mục E).
import { May, TinhHuong, SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG, dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, traThangVaXacNhan, chuanBiGiao, nghiemThuTaiVuon, lenhNganHangVaDoiSoat, type BoiCanh } from './luong.ts';

/** TH-006 tới bước 14: đã ký nhận ở kho, đang kiểm nơi đến. */
async function toiKiemDen(may: May) {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  await traThangVaXacNhan(b, 32200000); await chuanBiGiao(b);
  await nghiemThuTaiVuon(b, [{ kind: 'accepted', qty_kg: 1850 }, { kind: 'downgraded', qty_kg: 120, reason_code: 'TRAY_VO' }, { kind: 'rejected', qty_kg: 30, reason_code: 'DAP' }]);
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`, { pin: '2468' });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival`, { weighed_g: 1950000 });
  return b;
}

async function khieuNai(b: BoiCanh) {
  const anh = await b.phuc.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'delivery', entity_id: b.deliveryId, captured_in_app: true });
  return b.phuc.ok(`/v1/deliveries/${b.deliveryId}/arrival/complaint`, { line_no: 1, qty_g: 100000, reason: 'Sâu cuống bên trong, khác mẫu M-2291', reason_code: 'SAU_DUC', seal_code: 'M-2291', inspection_fee_vnd: 280000, evidence_document_id: anh.id });
}

async function moDau(may: May, th: TinhHuong) {
  const b = await toiKiemDen(may);
  const k = await khieuNai(b);
  th.bang('Tranh chấp chờ kiểm định', k.status, 'awaiting_inspection');
  const qt = k.data.quyet_toan_tam;
  th.bang('V_kt 42.050.000', qt?.V, '42050000');
  // Bản 23 · E1: trả đủ phần đã công nhận; phí bên mua ứng là khoản đòi thêm chưa bảo đảm, không giữ từ tiền người bán.
  th.bang('E1 chi tạm đủ phần công nhận 9.850.000', qt?.release_vnd, '9850000');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Hiển thị: đã chốt phần không tranh chấp', o.hien_thi.ten, 'Đã chốt phần không tranh chấp · đang xử lý phần còn lại');
  const so = (await b.ha.get(`/v1/orders/${b.orderId}/money`)).json;
  th.bang('E1 không giữ thêm', so.quyet_toan[0]?.additional_hold_vnd, '0');
  await may.he('/v1/sim/bank/process-instructions', {});
  await may.he('/v1/sim/bank/deliver', {});
  return { b, k };
}

them('TH-029A', 'Khiếu nại khác mẫu, kiểm định kết luận người bán sai', async (may, th) => {
  const { b, k } = await moDau(may, th);
  const r = await may.he('/v1/sim/inspection/result', { inspection_id: k.data.inspection_id, result: 'failed', sample_code: 'M-2291' });
  th.bang('Webhook kiểm định có chữ ký được nhận', r.http, 200);
  const qt = r.body.quyet_toan;
  th.bang('N 41.770.000', qt?.N, '41770000');
  th.bang('Không chi thêm', qt?.release_vnd, '0');
  th.bang('Hoàn bên mua phần cọc còn lại 3.950.000', qt?.refund_vnd, '3950000');
  th.bang('E1: người bán hoàn phí 280.000 (đã nhận đủ trước)', qt?.t_nb_vnd, '280000');
  await lenhNganHangVaDoiSoat(b);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Còn hồ sơ: khoản người bán hoàn phí + 30 kg hàng bị từ chối', o.status, 'outstanding');
  const hs = await may.v<string>(`SELECT string_agg(DISTINCT kind,',' ORDER BY kind) FROM core.open_dossiers($1)`, [b.orderId]);
  th.bang('Hồ sơ mở đúng loại', hs, 'hang_tra_lai,tien_truc_tiep');
  const nhan = await may.v<string>(`SELECT coalesce(sum(e.amount_vnd),0)::text FROM ledger.entries e JOIN ledger.transactions t ON t.id=e.transaction_id JOIN ledger.accounts a ON a.id=e.account_id WHERE t.order_id=$1 AND a.account_type='external' AND a.org_id=(SELECT seller_org_id FROM core.orders WHERE id=$1) AND e.amount_vnd>0`, [b.orderId]);
  th.bang('Năm đã nhận 42.050.000, còn nghĩa vụ hoàn 280.000 (ròng 41.770.000)', nhan, '42050000');
});

them('TH-029B', 'Khiếu nại khác mẫu, kiểm định kết luận người bán đúng', async (may, th) => {
  const { b, k } = await moDau(may, th);
  const sai = await may.he('/v1/sim/inspection/result', { inspection_id: k.data.inspection_id, result: 'passed', sample_code: 'M-2291', bad_signature: true });
  th.bang('Kết quả kiểm định không chữ ký hợp lệ: 401 (N-11)', sai.http, 401);
  const r = await may.he('/v1/sim/inspection/result', { inspection_id: k.data.inspection_id, result: 'passed', sample_code: 'M-2291' });
  const qt = r.body.quyet_toan;
  th.bang('V 44.350.000', qt?.V, '44350000');
  th.bang('Chi thêm 2.300.000 (đã chi đủ phần công nhận từ trước)', qt?.release_vnd, '2300000');
  th.bang('C_bm 1.650.000', qt?.refund_vnd, '1650000');
  await lenhNganHangVaDoiSoat(b);
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.bang('Người bán đúng: tiền xong, không còn hồ sơ → hoàn tất', o.status, 'completed');
  const hs = await may.v<string | null>(`SELECT string_agg(DISTINCT kind,',' ORDER BY kind) FROM core.open_dossiers($1)`, [b.orderId]);
  th.bang('Không còn hồ sơ mở (phí kiểm định đã xử lý theo kết luận)', hs, null);
});

them('TH-031', 'Kiểm định không kết luận, quá 14 ngày: chuyển cơ chế khác, tiền vẫn giữ', async (may, th) => {
  const { b, k } = await moDau(may, th);
  const r = await may.he('/v1/sim/inspection/result', { inspection_id: k.data.inspection_id, result: 'inconclusive', sample_code: 'M-2291' });
  th.bang('Không kết luận', r.body.ket_qua, 'inconclusive');
  await may.he('/v1/test/clock', { advance_minutes: 14 * 24 * 60 + 1 });
  const st = await may.v<string>(`SELECT status FROM core.disputes WHERE id=$1`, [k.id]);
  th.bang('Chuyển cơ chế khác', st, 'external_resolution');
  const giu = await may.v<string>(`SELECT coalesce(sum(balance_vnd),0)::text FROM ledger.v_account_balances WHERE order_id=$1 AND account_type='deposit_escrow'`, [b.orderId]);
  th.bang('Cọc còn giữ 3.950.000 (E1 đã chi đủ phần công nhận)', giu, '3950000');
  const o = (await b.ha.get(`/v1/orders/${b.orderId}`)).json;
  th.kiem('Đơn chưa hoàn tất', o.status !== 'completed', o.status);
});

them('TH-029x', 'Khiếu nại quá 2 giờ bị chặn', async (may, th) => {
  const b = await toiKiemDen(may);
  await may.he('/v1/test/clock', { advance_minutes: 121 });
  const r = await b.phuc.post(`/v1/deliveries/${b.deliveryId}/arrival/complaint`, { line_no: 1, qty_g: 100000, reason: 'khác mẫu' });
  th.kiem('Quá hạn: chặn (đợt đã chốt theo điều khoản im lặng)', r.status >= 400, r.json);
  const st = await may.v<string>(`SELECT status FROM core.deliveries WHERE id=$1`, [b.deliveryId]);
  th.bang('Im lặng 2 giờ: coi như đạt, đợt chốt', st, 'closed');
});
