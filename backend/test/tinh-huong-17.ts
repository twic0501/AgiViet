// Phiên 17: xem trước hệ quả hủy — đơn chưa ký không còn 500; lý do lạ/sai phía bị từ chối; đơn đã đóng bị chặn.
import { them } from './tinh-huong.ts';
import { dangNhapCacBen, chaoVaDongY } from './luong.ts';

const DON = (offerId: string) => ({ offer_id: offerId, downgrade_price_vnd: 15000, delivery_mode: 'at_farm', transport_by: 'buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'before_loading' });

them('TH-HUY-XEM-TRUOC', 'Xem trước hủy: đơn chưa ký không lỗi 500, kiểm lý do và trạng thái', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null);
  const d = await b.ha.ok('/v1/orders', DON(b.offerId!));
  th.bang('Đơn mới lập chưa có bản hiệu lực', await may.v(`SELECT effective_version_no FROM core.orders WHERE id=$1`, [d.id]), null);
  const r = await b.ha.get(`/v1/orders/${d.id}/cancellation-preview`);
  th.bang('Đơn chưa ký: 200 (trước đây 500)', r.status, 200);
  th.bang('Chưa cọc: cọc 0', r.json?.data?.coc?.so_tien_vnd ?? r.json?.coc?.so_tien_vnd, '0');
  th.bang('Lý do lạ: 422', (await b.ha.get(`/v1/orders/${d.id}/cancellation-preview?reason_kind=abc`)).status, 422);
  th.bang('Bên mua dùng lý do của người bán: 422', (await b.ha.get(`/v1/orders/${d.id}/cancellation-preview?reason_kind=seller_request`)).status, 422);
  const c = await b.ha.otpKy(d.data.document_id);
  await b.ha.ok(`/v1/orders/${d.id}/sign`, { challenge_id: c, code: '123456' });
  await b.ha.ok(`/v1/orders/${d.id}/withdraw`, {});
  const s = (await b.ha.get(`/v1/orders/${d.id}/cancellation-preview`)).status;
  th.kiem('Đơn đã rút (đóng): bị chặn, không 200, không 500', s !== 200 && s < 500, s);
});
