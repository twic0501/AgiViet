// App bán 0056–0057: mặt hàng xác minh, nhật ký canh tác, bán gấp, đặt trước / bao tiêu theo vụ.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { ANH_PNG, dangNhapCacBen } from './luong.ts';

them('TH-NV-01', 'Mặt hàng đã xác minh của tổ chức; lô mặt hàng chưa xác minh bị chặn từ bản nháp', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam); const ha = await may.dangNhap(SDT.ha);
  const ds = (await nam.get('/v1/seller/verified-products')).json;
  const xoai = ds.find((x: any) => x.product_code === 'XOAI_CAT_CHU');
  th.kiem('Có xoài cát Chu đang hiệu lực, kèm vườn, hạng, nguồn kiểm, hạn', !!xoai && xoai.trang_thai === 'hieu_luc' && !!xoai.site_name && !!xoai.grade_code && !!xoai.inspection_source && !!xoai.valid_to, xoai);
  th.bang('Bên mua: 403', (await ha.get('/v1/seller/verified-products')).status, 403);
  const r = await nam.post('/v1/lots', { product_code: 'TOM_THE', grade_code: (await may.v<string>(`SELECT g.grade_code FROM core.product_grades g JOIN core.products p ON p.id=g.product_id WHERE p.code='TOM_THE' ORDER BY g.rank LIMIT 1`)), qty_basis: 'weighed', qty_g: 100000, ask_price_vnd: 120000, floor_price_vnd: 110000 });
  th.bang('Tôm chưa xác minh ở vườn chị Năm: 422 MAT_HANG_CHUA_XAC_MINH', r.json.errors?.[0]?.code, 'MAT_HANG_CHUA_XAC_MINH');
});

them('TH-NV-02', 'Nhật ký canh tác: danh sách theo vụ, phun thuốc tính ngày cách ly, ảnh, nhãn tự ghi/nhân viên, sửa bằng bản mới', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam);
  const nk = (await nam.get('/v1/farm-diary')).json;
  th.kiem('Nhật ký mẫu 15 việc, có nhóm theo vụ', nk.viec.length >= 15 && nk.theo_vu.length >= 1, { n: nk.viec.length, vu: nk.theo_vu.map((x: any) => x.khoa) });
  th.kiem('Có nhãn tự ghi và tên việc', nk.viec.every((x: any) => x.nhan && x.ten_viec), nk.viec[0]);
  const site = nk.co_so[0].id;
  const anh = await nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'production_site', entity_id: site, captured_in_app: true });
  const thieu = await nam.post('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-01', activity: 'spray', note: 'Phun ngừa', request_key: 'nk-1' });
  th.bang('Phun thuốc thiếu tên/ngày cách ly: 422', thieu.status, 422);
  const p = await nam.ok('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-01', activity: 'spray', note: 'Phun ngừa thán thư (dữ liệu thử)', medicine_name: 'Thuốc mẫu B (ẢO)', withdrawal_days: 10, photo_document_ids: [anh.id], request_key: 'nk-2' });
  th.bang('Ngày hết cách ly = ngày phun + 10', p.data.clear_on, '2026-11-11');
  th.bang('Nhãn tự ghi', p.data.nhan, 'Tự ghi');
  th.bang('Ngày hết cách ly gần nhất của vườn', p.data.ngay_het_cach_ly_gan_nhat, '2026-11-11');
  const lai = await nam.ok('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-01', activity: 'spray', note: 'Phun ngừa thán thư (dữ liệu thử)', medicine_name: 'Thuốc mẫu B (ẢO)', withdrawal_days: 10, photo_document_ids: [anh.id], request_key: 'nk-2' });
  th.bang('Gửi lặp cùng khóa trả cùng ID', lai.id, p.id);
  const sua = await nam.ok('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-01', activity: 'spray', note: 'Phun ngừa thán thư (sửa tên thuốc)', medicine_name: 'Thuốc mẫu C (ẢO)', withdrawal_days: 3, supersedes_id: p.id, correction_reason: 'Ghi nhầm tên thuốc', request_key: 'nk-3' });
  th.bang('Sửa không rút ngắn cách ly (giữ mốc lớn nhất)', sua.data.ngay_het_cach_ly_gan_nhat, '2026-11-11');
  const nk2 = (await nam.get('/v1/farm-diary')).json;
  th.kiem('Danh sách chỉ bản hiện hành (bản cũ ẩn)', !nk2.viec.some((x: any) => x.id === p.id) && nk2.viec.some((x: any) => x.id === sua.id), null);
  th.kiem('Còn cách ly tới 11/11', nk2.co_so[0].con_cach_ly === true && nk2.co_so[0].ngay_het_cach_ly_gan_nhat === '2026-11-11', nk2.co_so[0]);
  const field = await may.dangNhap('0901000002');
  const nv = await field.post('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-02', activity: 'care', note: 'Nhân viên kiểm vườn, xác nhận tỉa cành', request_key: 'nk-nv-1' });
  th.kiem('Nhân viên field ghi: nhãn nhân viên AgiViet xác nhận', nv.status === 200 && nv.json.data.nhan === 'Nhân viên AgiViet xác nhận', nv.json);
  const teo = await may.dangNhap(SDT.teo);
  const giup = await teo.post('/v1/farm-diary', { site_id: site, occurred_on: '2026-11-02', activity: 'water', note: 'Tưới', request_key: 'nk-teo-1' });
  th.bang('Người giúp không có diary.write: 403', giup.status, 403);
});

them('TH-NV-03', 'Bán gấp: bật có hạn và lý do, bên mua thấy cờ ở đầu danh sách, tắt được', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam); const ha = await may.dangNhap(SDT.ha);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const thieu = await nam.post(`/v1/lots/${lot}/urgent-sale`, { until: '2026-11-03T18:00:00+07:00' });
  th.bang('Thiếu lý do: 422', thieu.status, 422);
  const r = await nam.ok(`/v1/lots/${lot}/urgent-sale`, { until: '2026-11-03T18:00:00+07:00', reason: 'Trái chín nhanh sau mưa' });
  th.kiem('Có ban_gap từ/đến/lý do', !!r.data.ban_gap?.tu && !!r.data.ban_gap?.den && r.data.ban_gap?.ly_do === 'Trái chín nhanh sau mưa', r.data);
  const ds = (await ha.get('/v1/lots?product=XOAI_CAT_CHU')).json;
  th.kiem('Bên mua thấy lô bán gấp ở đầu danh sách', ds[0]?.id === lot && ds[0]?.ban_gap === true, ds.slice(0, 2));
  const tat = await nam.ok(`/v1/lots/${lot}/urgent-sale`, { on: false });
  th.bang('Tắt bán gấp', tat.data.ban_gap, null);
});

them('TH-NV-04', 'Đặt trước khi hái: lập, ký, cọc 30%; danh sách/chi tiết cho người bán; cập nhật sản lượng; đề nghị chốt lượng', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const thinh = await may.dangNhap(SDT.thinh);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const o = await thinh.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 1000000, price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await thinh.post('/v1/seasonal-orders', {
    offer_id: o.id, delivery_mode: 'at_farm', transport_by: 'buyer', payment_timing: 'before_loading', designated_receiver_user_id: thinh.userId,
    vu: { loai: 'pre_harvest', qty_max_g: 1200000, harvest_from: '2026-12-01', harvest_to: '2026-12-20', batches: [{ qty_g: 1000000, from: '2026-12-10T06:00:00+07:00', to: '2026-12-15T18:00:00+07:00' }] },
  });
  th.kiem('Lập hợp đồng đặt trước', d.status === 200, d.json);
  if (d.status !== 200) return;
  th.bang('Cọc 30% trên lượng tối thiểu = 6.900.000', d.json.data.tinh.coc_vnd, '6900000');
  const id = d.json.id; const docId = d.json.data.document_id;
  const c1 = await thinh.otpKy(docId); await thinh.ok(`/v1/orders/${id}/sign`, { challenge_id: c1, code: '123456' });
  const c2 = await b.nam.otpKy(docId); await b.nam.ok(`/v1/orders/${id}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  const hd = (await thinh.get(`/v1/orders/${id}/deposit-instruction`)).json;
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const ds = (await b.nam.get('/v1/seasonal-orders')).json;
  th.kiem('Danh sách cho người bán có đơn đặt trước', ds.some((x: any) => x.id === id && x.contract_type === 'pre_harvest' && x.phia === 'seller'), ds.map((x: any) => [x.code, x.contract_type, x.order_status]));
  const ct = (await b.nam.get(`/v1/seasonal-orders/${id}`)).json;
  th.bang('Đơn hiệu lực', ct.order_status, 'active');
  th.kiem('Chi tiết có điều khoản khoảng lượng, lịch ban đầu, đợt giao', ct.dieu_khoan?.qty_min_g === '1000000' && ct.dieu_khoan?.qty_max_g === '1200000' && ct.lich_ban_dau?.length === 1 && ct.dot_giao?.length === 1, ct);
  th.kiem('Hành động: cập nhật sản lượng, đề nghị chốt', ct.hanh_dong.includes('production_update') && ct.hanh_dong.includes('propose_harvest_fix'), ct.hanh_dong);
  const anh = await b.nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'order', entity_id: id, captured_in_app: true });
  const cn = await b.nam.ok(`/v1/seasonal-orders/${id}/production-updates`, { qty_min_g: 1050000, qty_max_g: 1150000, harvest_from: '2026-12-03', harvest_to: '2026-12-18', note: 'Trái đậu tốt, ước 1,05–1,15 tấn', photo_document_ids: [anh.id], request_key: 'sl-1' });
  th.bang('Ghi cập nhật sản lượng', cn.status, 'recorded');
  th.bang('Bên mua không cập nhật sản lượng: 403', (await thinh.post(`/v1/seasonal-orders/${id}/production-updates`, { qty_min_g: 1, qty_max_g: 2, harvest_from: '2026-12-03', harvest_to: '2026-12-18', note: 'x', request_key: 'sl-x' })).status, 403);
  const fx = await b.nam.post(`/v1/seasonal-orders/${id}/harvest-fix`, { qty_g: 1100000 });
  th.kiem('Đề nghị chốt 1.100 kg tạo phụ lục chờ bên kia đồng ý', fx.status === 200 && fx.json.data.kind === 'fix_qty_price', fx.json);
  const ct2 = (await thinh.get(`/v1/seasonal-orders/${id}`)).json;
  th.kiem('Bên mua thấy cập nhật sản lượng và đề nghị chờ trả lời', ct2.cap_nhat_san_luong.length === 1 && ct2.hanh_dong.includes('answer_amendment'), ct2.hanh_dong);
  const dy = await thinh.post(`/v1/amendments/${fx.json.id}/accept`, {});
  th.kiem('Bên mua đồng ý chốt: có phụ lục để ký', dy.status === 200 && !!dy.json.data?.annex_document_id, dy.json);
  if (dy.status !== 200) return;
  for (const [p, extra] of [[b.nam, {}], [thinh, {}]] as const) {
    const c = await p.ok('/v1/otp/challenges', { purpose: 'amendment_sign', document_id: dy.json.data.annex_document_id }, { khongKhoa: true });
    const k = await p.post(`/v1/amendments/${fx.json.id}/sign`, { challenge_id: c.challenge_id, code: '123456', ...extra });
    if (k.status !== 200) { th.kiem('Ký phụ lục chốt', false, k.json); return; }
    if (k.json.status === 'effective') th.kiem('Chốt 1.100 kg: cọc chênh 690.000 với mã nạp TP…', k.json.data.he_qua?.chenh_coc_vnd === '690000' && /^TP\d{12}$/.test(k.json.data.he_qua?.bo_sung_coc_ref ?? ''), k.json.data.he_qua);
  }
  const ct3 = (await b.nam.get(`/v1/seasonal-orders/${id}`)).json;
  th.bang('Sau chốt: lượng tối thiểu 1.100 kg', ct3.dieu_khoan?.qty_min_g, '1100000');
});

them('TH-NV-05', 'Từ chối đề nghị chốt lượng', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const thinh = await may.dangNhap(SDT.thinh);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const o = await thinh.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 1000000, price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await thinh.ok('/v1/seasonal-orders', { offer_id: o.id, delivery_mode: 'at_farm', transport_by: 'buyer', payment_timing: 'before_loading', designated_receiver_user_id: thinh.userId,
    vu: { loai: 'pre_harvest', qty_max_g: 1200000, harvest_from: '2026-12-01', harvest_to: '2026-12-20', batches: [{ qty_g: 1000000, from: '2026-12-10T06:00:00+07:00', to: '2026-12-15T18:00:00+07:00' }] } });
  const id = d.id; const docId = d.data.document_id;
  const c1 = await thinh.otpKy(docId); await thinh.ok(`/v1/orders/${id}/sign`, { challenge_id: c1, code: '123456' });
  const c2 = await b.nam.otpKy(docId); await b.nam.ok(`/v1/orders/${id}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  const hd = (await thinh.get(`/v1/orders/${id}/deposit-instruction`)).json;
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const fx = await thinh.ok(`/v1/seasonal-orders/${id}/harvest-fix`, { qty_g: 1200000 });
  const tc = await b.nam.post(`/v1/amendments/${fx.id}/reject`, {});
  th.bang('Người bán từ chối', tc.json.status, 'rejected');
  th.bang('Lượng giữ nguyên 1.000 kg', (await b.nam.get(`/v1/seasonal-orders/${id}`)).json.dieu_khoan?.qty_min_g, '1000000');
});

them('TH-NV-06', 'Bao tiêu theo vụ 2 đợt: lập, ký, cọc vụ; mất mùa giảm lượng bằng phụ lục có chứng cứ, giảm đợt cuối', async (may, th) => {
  const b = await dangNhapCacBen(may);
  const thinh = await may.dangNhap(SDT.thinh);
  const lot = await may.v<string>(`SELECT id FROM core.lots WHERE code='L-0412'`);
  const o = await thinh.ok('/v1/offers', { direction: 'buyer_bid', lot_id: lot, qty_g: 2000000, price_vnd: 23000 });
  await b.nam.ok(`/v1/offers/${o.id}/accept`, {});
  const d = await thinh.post('/v1/seasonal-orders', { offer_id: o.id, delivery_mode: 'at_farm', transport_by: 'buyer', payment_timing: 'after_days', pay_after_days: 7, designated_receiver_user_id: thinh.userId,
    vu: { loai: 'offtake', deposit_vnd: 2000000, materials_advance_vnd: 1000000, harvest_from: '2026-12-01', harvest_to: '2027-01-31',
      batches: [{ qty_g: 1000000, from: '2026-12-10T06:00:00+07:00', to: '2026-12-15T18:00:00+07:00', materials_offset_vnd: 1000000 }, { qty_g: 1000000, from: '2027-01-10T06:00:00+07:00', to: '2027-01-15T18:00:00+07:00' }] } });
  th.kiem('Lập bao tiêu 2 đợt', d.status === 200, d.json);
  if (d.status !== 200) return;
  const id = d.json.id; const docId = d.json.data.document_id;
  const c1 = await thinh.otpKy(docId); await thinh.ok(`/v1/orders/${id}/sign`, { challenge_id: c1, code: '123456' });
  const c2 = await b.nam.otpKy(docId); await b.nam.ok(`/v1/orders/${id}/sign`, { challenge_id: c2, code: '123456', commitment_ack: true });
  const hd = (await thinh.get(`/v1/orders/${id}/deposit-instruction`)).json;
  await may.he('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'CONG TY NHA MAY SAY DONG XANH' } });
  await may.he('/v1/sim/bank/deliver', {});
  const ct = (await b.nam.get(`/v1/seasonal-orders/${id}`)).json;
  th.bang('Hiệu lực', ct.order_status, 'active');
  th.bang('Hai đợt giao theo lịch', ct.dot_giao.length, 2);
  th.bang('Cọc vụ 2.000.000', ct.dieu_khoan.deposit_vnd, '2000000');
  th.bang('Phản hồi lập đơn báo đúng cọc vụ', d.json.data.tinh.coc_vnd, '2000000');
  const anh = await b.nam.ok('/v1/files', { mime: 'image/png', data_base64: ANH_PNG, entity: 'order', entity_id: id, captured_in_app: true });
  const dn = await b.nam.post(`/v1/orders/${id}/amendments`, { kind: 'force_majeure_reduction', payload: { qty_g: 1800000 }, reason: 'Mưa lớn làm rụng trái', evidence_document_ids: [anh.id] });
  th.kiem('Đề nghị giảm lượng do mất mùa có chứng cứ', dn.status === 200, dn.json);
  if (dn.status !== 200) return;
  const dy = await thinh.post(`/v1/amendments/${dn.json.id}/accept`, {});
  th.kiem('Bên mua đồng ý', dy.status === 200, dy.json);
  if (dy.status !== 200) return;
  let cuoi: any = null;
  for (const p of [b.nam, thinh]) {
    const c = await p.ok('/v1/otp/challenges', { purpose: 'amendment_sign', document_id: dy.json.data.annex_document_id }, { khongKhoa: true });
    cuoi = await p.post(`/v1/amendments/${dn.json.id}/sign`, { challenge_id: c.challenge_id, code: '123456' });
  }
  th.kiem('Phụ lục hiệu lực', cuoi?.json?.status === 'effective', cuoi?.json);
  const ct2 = (await b.nam.get(`/v1/seasonal-orders/${id}`)).json;
  th.bang('Đợt cuối còn 800 kg', ct2.dot_giao.find((x: any) => x.batch_no === 2)?.planned_qty_g, '800000');
  th.bang('Lịch ban đầu bất biến (1.000 kg)', ct2.lich_ban_dau.find((x: any) => x.batch_no === 2)?.committed_qty_g, '1000000');
});
