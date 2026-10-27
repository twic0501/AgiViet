// Truy vấn cho giao diện (docs/frontend/de-xuat-backend.md mức Cao).
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc, khoanDau } from './luong.ts';

them('GD-01', 'Thành viên tổ chức: danh sách, đổi vai (vai đặc quyền chờ 24 giờ)', async (may, th) => {
  const thinh = await may.dangNhap(SDT.thinh); const ha = await may.dangNhap(SDT.ha);
  const ds = (await thinh.get('/v1/org/members')).json;
  const haRow = ds.find((m: any) => m.name === 'Trần Thu Hà');
  th.kiem('Có user_id, vai hiệu lực, hạn mức', !!haRow?.user_id && haRow.roles_effective.includes('purchaser') && haRow.approval_limit_vnd === '50000000', haRow);
  const phuc = ds.find((m: any) => m.name === 'Võ Hoàng Phúc');
  const k = await ha.post(`/v1/org/members/${phuc.membership_id}/roles`, { add: ['site_receiver'] });
  th.bang('Không phải chủ không đổi vai', k.json.errors?.[0]?.code, 'KHONG_CO_QUYEN');
  const r = await thinh.ok(`/v1/org/members/${phuc.membership_id}/roles`, { add: ['site_receiver', 'accountant'] });
  const ac = r.data.roles.find((x: any) => x.role_code === 'accountant');
  th.kiem('Vai kế toán (đặc quyền) hiệu lực sau ≥ 24 giờ', new Date(ac.effective_at).getTime() - Date.now() > 23 * 3600_000, ac);
  const ds2 = (await thinh.get('/v1/org/members')).json.find((m: any) => m.membership_id === phuc.membership_id);
  th.kiem('Vai hiệu lực ngay: site_receiver; chưa có accountant', ds2.roles_effective.includes('site_receiver') && !ds2.roles_effective.includes('accountant'), ds2);
});

them('GD-02', 'Cờ ký phản ánh hạn mức và duyệt nội bộ', async (may, th) => {
  const b = await dangNhapCacBen(may); const thinh = await may.dangNhap(SDT.thinh);
  const o = await b.ha.ok('/v1/offers', { direction: 'buyer_bid', lot_id: b.lotId, qty_g: 2000000, price_vnd: 26000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await b.ha.ok('/v1/orders', { offer_id: o.id, downgrade_price_vnd: 15000, delivery_mode: 'at_farm', transport_by: 'buyer', delivery_from: '2026-11-04T06:00:00+07:00', delivery_to: '2026-11-04T12:00:00+07:00', payment_timing: 'before_loading' });
  let x = (await b.ha.get(`/v1/orders/${d.id}`)).json;
  th.bang('Chưa được ký', x.ky.duoc_ky, false);
  th.bang('Cần duyệt nội bộ', x.ky.can_duyet_noi_bo, true);
  th.kiem('hanh_dong không có sign, có submit_approval', !x.hanh_dong.includes('sign') && x.hanh_dong.includes('submit_approval'), x.hanh_dong);
  await b.ha.ok(`/v1/orders/${d.id}/submit-approval`, {});
  await thinh.ok(`/v1/orders/${d.id}/approve`, {});
  x = (await b.ha.get(`/v1/orders/${d.id}`)).json;
  th.kiem('Sau duyệt: được ký', x.ky.duoc_ky === true && x.hanh_dong.includes('sign'), x.ky);
});

them('GD-03', 'Yêu cầu hủy hiện hành, hướng dẫn trả thẳng theo quyền', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  const p = await khoanDau(b);
  const hd = await b.lan.get(`/v1/payments/${p.id}/instruction`);
  th.bang('Kế toán bên mua xem hướng dẫn', hd.status, 200);
  th.kiem('Có số tài khoản đầy đủ và VietQR', /2186$/.test(hd.json.tai_khoan?.so_tai_khoan ?? '') && typeof hd.json.vietqr === 'string', hd.json);
  th.bang('Nội dung theo mã khoản do DB cấp (0047: BEFORE)', hd.json.noi_dung, `AGV ${b.orderCode!.replace(/-/g, '')} BEFORE`);
  th.bang('Người bán không xem hướng dẫn của bên trả', (await b.nam.get(`/v1/payments/${p.id}/instruction`)).status, 404);
  th.bang('Kho bên mua không có quyền tiền', (await b.phuc.get(`/v1/payments/${p.id}/instruction`)).status, 403);
  const x = await b.ha.ok(`/v1/orders/${b.orderId}/cancellation-requests`, { reason_text: 'giá giảm' });
  const benKia = (await b.nam.get(`/v1/orders/${b.orderId}/cancellation-requests`)).json;
  th.kiem('Người bán thấy yêu cầu và nút đồng ý/từ chối', benKia[0]?.id === x.id && benKia[0].hanh_dong.join() === 'accept,reject' && benKia[0].requested_by_side === 'buyer', benKia);
  const minh = (await b.ha.get(`/v1/orders/${b.orderId}/cancellation-requests`)).json;
  th.kiem('Bên xin không có nút trả lời', minh[0].la_cua_toi === true && minh[0].hanh_dong.length === 0, minh);
});

them('GD-04', 'Danh sách tranh chấp của đơn sau khi tải lại', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  const { traThangVaXacNhan, chuanBiGiao } = await import('./luong.ts');
  await traThangVaXacNhan(b, 32200000); await chuanBiGiao(b);
  await may.he('/v1/test/clock', { set: '2026-11-04T06:30:00+07:00' });
  const qr = await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`, {});
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`, { qr_token: qr.data.qr_token });
  await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/acceptance`, { pin: '2468', weighed_g: 2000000, lines: [{ kind: 'accepted', qty_g: 1880000 }, { kind: 'downgraded', qty_g: 120000, reason_code: 'TRAY_VO' }] });
  await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/dispute`, { line_no: 2, reason: 'Không trầy', option: 'chia_lai' });
  const ds = (await b.phuc.get(`/v1/orders/${b.orderId}/disputes`)).json;
  th.kiem('Bên mua thấy hồ sơ và hành động gửi lại kết quả (0052 chia lại)', ds.length === 1 && ds[0].status === 'open' && ds[0].hanh_dong.includes('resubmit_acceptance') && ds[0].opened_by_side === 'seller', ds);
  const ngoai = await may.dangNhap(SDT.quan);
  th.bang('Tổ chức ngoài không xem', (await ngoai.get(`/v1/orders/${b.orderId}/disputes`)).status, 404);
});
