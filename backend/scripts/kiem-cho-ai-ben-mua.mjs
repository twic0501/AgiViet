// Kiểm E2E chợ AI chiều ngược: AI đóng cả bên mua M01 lẫn người bán (gọi vòng bằng nhân viên nên không tổ chức nào bị loại).
// M01 chào giá bưởi L-0604 đúng giá tham khảo → người bán ảo trả giá, giao bằng mã người nhận… → đơn hoàn tất. Chạy trên stack thử mới khởi động.
const B = process.env.API ?? 'http://127.0.0.1:18980';
const j = async (r) => { const x = await r.json().catch(() => ({})); return x && typeof x === 'object' && 'data' in x ? x.data : x; };
const vai = async (p) => (await j(await fetch(B + '/v1/test/impersonate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: p }) }))).token;
const mua = await vai('0909000213'), nv = await vai('0901000004');
const H = (t) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + t });
// TEP_GAN='{"TC-B10":"giao-thieu"}' → gán kiểu cho người bán AI (bên mua M01 là người rút tệp).
if (process.env.TEP_GAN) console.log('tệp khách:', JSON.stringify((await j(await fetch(B + '/v1/test/tep-khach', { method: 'POST', headers: H(mua), body: JSON.stringify({ gan: JSON.parse(process.env.TEP_GAN) }) }))).doi_tac));
const lots = await j(await fetch(B + '/v1/lots', { headers: H(mua) })); const l = (lots.items ?? lots).find((x) => x.code === 'L-0604');
const of = await fetch(B + '/v1/offers', { method: 'POST', headers: H(mua), body: JSON.stringify({ idempotency_key: crypto.randomUUID(), direction: 'buyer_bid', lot_id: l.id, qty_g: 500000, price_vnd: 40000 }) });
const ofd = await j(of); console.log('M01 chào giá L-0604 (bưởi, chị Lan):', of.status, ofd.status);
if (!of.ok || !ofd.id) { console.error('THẤT BẠI: không tạo được lời chào giá'); process.exit(1); }
let xong = false;
for (let n = 1; n <= 25; n++) {
  const v = await j(await fetch(B + '/v1/test/doi-tac-ao/vong', { method: 'POST', headers: H(nv), body: '{}' }));
  const viec = (v.viec ?? []).map((x) => `${x.ket_qua === 'loi' ? 'LỖI ' : ''}${x.to_chuc} ${x.viec} ${x.doi_tuong}${x.ket_qua === 'loi' ? ' ' + (x.chi_tiet ?? '').slice(0, 120) : ''}`).filter((s) => /HD|LC|lệnh|đối soát|LỖI/.test(s));
  const ds = await j(await fetch(B + '/v1/orders', { headers: H(mua) })); const d = (ds.items ?? ds).find((x) => x.offer_id === ofd.id); // bám đúng đơn của lời chào giá vừa tạo
  console.log(`vòng ${n}:`, d ? `${d.code} ${d.status} ${d.hien_thi?.toi_luot?.phia ?? ''}:${d.hien_thi?.toi_luot?.viec ?? ''}` : '-', '|', viec.join(' | ').slice(0, 400));
  if (d?.status === 'completed') { xong = true; break; }
  if (d?.hien_thi?.toi_luot?.viec === 'Giao hàng, quét QR nhận hàng' && n > 3) await fetch(B + '/v1/test/clock', { method: 'POST', headers: H(nv), body: JSON.stringify({ advance_minutes: 20 }) });
}
if (!xong) { console.error('THẤT BẠI: đơn từ lời chào giá', ofd.id, 'chưa hoàn tất sau 25 vòng'); process.exit(1); }
if (process.env.TEP_GAN && Object.values(JSON.parse(process.env.TEP_GAN)).includes('giao-thieu')) {
  const d = ((await j(await fetch(B + '/v1/orders', { headers: H(mua) }))).items ?? []).find((x) => x.offer_id === ofd.id) ?? (await j(await fetch(B + '/v1/orders', { headers: H(mua) }))).find?.((x) => x.offer_id === ofd.id);
  const ct = await j(await fetch(B + `/v1/orders/${d.id}`, { headers: H(mua) })), m = await j(await fetch(B + `/v1/orders/${d.id}/money`, { headers: H(mua) }));
  const v = Number((m.quyet_toan ?? []).at(-1)?.v_vnd), hd = Number(ct.dieu_khoan?.contract_value_vnd), ti = Math.round(v / hd * 100);
  const tin = JSON.stringify(await j(await fetch(B + `/v1/messages?order_id=${d.id}`, { headers: H(mua) })));
  console.log('giao thiếu: giá trị nghiệm thu', v, '/ hợp đồng', hd, `= ${ti}%`, '· có tin báo thiếu:', /chỉ đủ/.test(tin));
  if (ti !== 85 || !/chỉ đủ/.test(tin)) { console.error('THẤT BẠI: giao thiếu không đúng 85% hoặc thiếu tin báo'); process.exit(1); }
}
console.log('ĐẠT: đơn hoàn tất');
