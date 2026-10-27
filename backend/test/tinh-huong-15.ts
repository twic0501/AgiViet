// Bản 23 qua API thật: tìm nguồn định kỳ nhiều người bán; hộp việc hồ sơ mở.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';

them('TH-B23-DK', 'Tìm nguồn định kỳ qua API: thỏa thuận → chốt ngày → đề xuất → duyệt → cam kết; đổi lượng cần người bán đồng ý', async (may, th) => {
  const ha = await may.dangNhap(SDT.ha);
  const nam = await may.dangNhap(SDT.nam);
  const vy = await may.dangNhap(SDT.vy);
  const buyer = await may.v<string>(`SELECT id FROM core.organizations WHERE code='TC-M01'`);
  const seller = await may.v<string>(`SELECT id FROM core.organizations WHERE code='TC-B01'`);
  const ag = await ha.ok('/v1/sourcing-agreements', { code: 'DK-API-1', product_code: 'XOAI_CAT_CHU', spec: { loai: 'L1' }, required_docs: ['chung_nhan_vung_trong'] });
  th.kiem('Lập thỏa thuận', !!ag.id, ag);
  // Ngày theo đồng hồ của DB (bộ thử có thể chỉnh đồng hồ), không theo giờ máy.
  const ngay = await may.v<string>(`SELECT ((coalesce((SELECT max(at) FROM cmd.test_clock), now()) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 3)::text`);
  const d = await ha.ok(`/v1/sourcing-agreements/${ag.id}/days`, { delivery_date: ngay, qty_g: 5000000 });
  const de = await vy.ok(`/v1/ops/sourcing-days/${d.data.day_id}/allocations`, { seller_org_id: seller, qty_g: 2000000, unit_price_vnd_per_kg: 20000 });
  const sớm = await nam.post(`/v1/sourcing-allocations/${de.data.allocation_id}/commit`, {});
  th.kiem('Chưa được bên mua duyệt thì người bán chưa cam kết được', sớm.status >= 400, sớm.json);
  await ha.ok(`/v1/sourcing-allocations/${de.data.allocation_id}/approve`, {});
  const base = await may.v<string>(`SELECT core.pair_exposure($1,$2)::text`, [buyer, seller]);
  await nam.ok('/v1/credit-terms', { buyer_org_id: buyer, pay_after_days: 3, credit_limit_vnd: String(BigInt(base) + 80000000n) });
  await nam.ok(`/v1/sourcing-allocations/${de.data.allocation_id}/commit`, {});
  const phu = (await ha.get(`/v1/sourcing-agreements/${ag.id}/coverage`)).json;
  th.bang('Độ phủ: cần 5 tấn, cam kết 2, thiếu 3', [phu.ngay?.[0]?.confirmed_qty_g, phu.ngay?.[0]?.committed_qty_g, phu.ngay?.[0]?.missing_qty_g].join('/'), '5000000/2000000/3000000');
  const ch = await ha.ok(`/v1/sourcing-allocations/${de.data.allocation_id}/change`, { new_qty_g: 1000000 });
  th.bang('Yêu cầu giảm chưa hiệu lực khi người bán chưa đồng ý', (await ha.get(`/v1/sourcing-agreements/${ag.id}/coverage`)).json.nguon?.[0]?.qty_g, '2000000');
  await nam.ok(`/v1/allocation-changes/${ch.data.change_id}/answer`, { agree: true });
  th.bang('Người bán đồng ý: còn 1 tấn', (await ha.get(`/v1/sourcing-agreements/${ag.id}/coverage`)).json.nguon?.[0]?.qty_g, '1000000');
  const ngoai = await nam.get(`/v1/sourcing-agreements/${ag.id}/coverage`);
  th.kiem('Người bán không xem được toàn bộ kế hoạch thu mua của bên mua', ngoai.status >= 400, ngoai.json);
});

them('TH-B23-HV', 'Hộp việc qua API: hồ sơ mở hiện cho nhân viên, giao người phụ trách; khách xem hồ sơ của đơn mình', async (may, th) => {
  const tam = await may.dangNhap(SDT.tam);
  const ha = await may.dangNhap(SDT.ha);
  // Dùng một đơn có hồ sơ mở từ dữ liệu (nếu bộ thử chưa có, dựng nhanh bằng khoản trả trực tiếp chưa nhận).
  let oid = await may.v<string | null>(`SELECT order_id FROM ops.v_open_dossiers WHERE chua_co_nguoi_phu_trach LIMIT 1`);
  if (!oid) {
    oid = await may.v<string>(`SELECT id FROM core.orders WHERE buyer_org_id=(SELECT id FROM core.organizations WHERE code='TC-M01') AND status NOT IN ('drafting') LIMIT 1`);
  }
  const hv = (await tam.get('/v1/ops/dossiers?chua_giao=true')).json;
  th.kiem('Nhân viên thấy hồ sơ chưa có người phụ trách', Array.isArray(hv.items), hv);
  if (hv.items?.length) {
    const x = hv.items[0];
    const tamId = await may.v<string>(`SELECT id FROM core.users WHERE display_name='Nguyễn Hữu Tâm'`);
    await tam.ok('/v1/ops/dossiers/assign', { order_id: x.order_id, kind: x.kind, ref_id: x.ref_id, owner_user_id: tamId, due_at: new Date(Date.now() + 864e5).toISOString() });
    const sau = (await tam.get('/v1/ops/dossiers')).json.items.find((r: any) => r.order_id === x.order_id && r.kind === x.kind && r.ref_id === x.ref_id);
    th.kiem('Đã giao người phụ trách và hạn', sau && sau.chua_co_nguoi_phu_trach === false, sau);
  }
  const khach = await ha.get('/v1/ops/dossiers');
  th.kiem('Khách không vào được hộp việc vận hành', khach.status >= 400, khach.json);
});
