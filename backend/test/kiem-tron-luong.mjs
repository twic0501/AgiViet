// Trọn luồng hai chiều trên stack đang chạy: node test/kiem-tron-luong.mjs [http://127.0.0.1:18990]
// A: người thật MUA, AI bán. B: người thật BÁN, AI mua. Mỗi chiều: chốt giá → đề xuất + sửa điều khoản → hợp đồng đúng bản đã thống nhất.
import assert from 'node:assert';
const B = process.argv[2] || 'http://127.0.0.1:18990';
for (let i = 0; i < 120; i++) { try { if ((await fetch(B + '/v1/test/accounts')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const vao = async (phone) => {
  const H = { 'content-type': 'application/json', 'x-agv-may': 'may-tron-luong-' + phone };
  const j0 = await (await fetch(B + '/v1/test/impersonate', { method: 'POST', headers: H, body: JSON.stringify({ phone }) })).json(); assert.ok(j0.token, 'đăng nhập ' + phone + ': ' + JSON.stringify(j0).slice(0, 200));
  const A = { ...H, authorization: 'Bearer ' + j0.token };
  const un = (j) => j?.items ?? j?.data?.items ?? j?.data ?? j;
  return { user: j0.user,
    get: async (u) => un(await (await fetch(B + u, { headers: A })).json()),
    post: async (u, b = {}) => { const r = await fetch(B + u, { method: 'POST', headers: A, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...b }) }); const j = await r.json().catch(() => null); return { s: r.status, j: un(j), loi: j?.errors?.[0]?.code }; },
    vong: async (n = 1) => { for (let i = 0; i < n; i++) await fetch(B + '/v1/test/doi-tac-ao/vong', { method: 'POST', headers: A, body: '{}' }); } };
};
const cho = async (f, ten, u) => { for (let i = 0; i < 25; i++) { const x = await f(); if (x) return x; await u.vong(); } assert.fail('quá hạn chờ: ' + ten); };
const banSua = (dk, hc) => ({ ...(dk.ban ?? dk.mac_dinh), downgrade_price_vnd: hc });
const tinCuoi = async (u, id) => ((await u.get(`/v1/messages?offer_id=${id}`)).tin ?? []).filter((m) => !m.la_cua_toi).at(-1)?.body ?? '';

// ===== A: người thật mua =====
{
  const u = await vao('0908000510');
  let of = null, gia = 0;
  for (const l of await u.get('/v1/lots')) {
    if (l.status !== 'on_sale') continue; const ct = await u.get(`/v1/lots/${l.id}`); if (/Nguyễn Thị Năm/.test(ct?.seller_name ?? '')) continue;
    const tk = await u.get(`/v1/reference-prices?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`); if (tk?.status !== 'du_du_lieu') continue;
    gia = Math.round(Number(tk.price_vnd) / 100) * 100;
    const r = await u.post('/v1/offers', { direction: 'buyer_bid', lot_id: l.id, qty_g: 100000, price_vnd: gia }); if (r.s < 300) { of = r.j; break; }
  }
  assert.ok(of?.id, 'A: gửi được lời chào');
  await cho(async () => (await u.get(`/v1/offers/${of.id}`)).status === 'accepted', 'AI bán chốt giá gần đây', u); console.log('✔ A1 Mua đúng giá gần đây: AI bán chốt', gia);
  const tin1 = await tinCuoi(u, of.id); assert.ok(!/ 0 đ\/kg/.test(tin1), 'A: không có giá 0 trong tin');
  let dk = await u.get(`/v1/offers/${of.id}/terms`); assert.equal(dk.trang_thai, 'chua_de_xuat');
  const thap = Math.round(gia * 0.4 / 100) * 100;
  const dx = await u.post(`/v1/offers/${of.id}/terms`, { ...banSua(dk, thap), ghi_chu: 'Cắt sáng sớm' }); assert.ok(dx.s < 300, 'A: gửi đề xuất ' + dx.loi);
  const chan = await u.post('/v1/orders', { offer_id: of.id, delivery_mode: 'at_farm', designated_receiver_user_id: u.user.user_id }); assert.ok(chan.s >= 400, 'A: chưa thống nhất thì không tạo được hợp đồng'); console.log('✔ A2 Chưa thống nhất: bị chặn tạo hợp đồng');
  dk = await cho(async () => { const d = await u.get(`/v1/offers/${of.id}/terms`); return d.de_xuat_boi === 'seller' ? d : null; }, 'AI bán đề xuất sửa', u);
  const san = Math.ceil(gia * 0.7 / 100) * 100; assert.equal(Number(dk.ban.downgrade_price_vnd), san, 'A: AI nâng giá xuống loại lên sàn'); console.log('✔ A3 AI bán sửa giá xuống loại', thap, '→', san);
  const dy = await u.post(`/v1/offers/${of.id}/terms/accept`, { phien_ban: dk.phien_ban }); assert.ok(dy.s < 300, 'A: đồng ý ' + dy.loi);
  const hd = await u.post('/v1/orders', { offer_id: of.id, delivery_mode: 'at_farm', delivery_from: '2099-01-01', downgrade_price_vnd: 1, designated_receiver_user_id: u.user.user_id, silent_accept_hours: 2 });
  assert.ok(hd.s < 300, 'A: tạo hợp đồng ' + JSON.stringify(hd.j).slice(0, 200));
  const t = JSON.stringify(await u.get(`/v1/orders/${hd.j.id}`)) + JSON.stringify(await u.get(`/v1/orders/${hd.j.id}/terms`)); assert.ok(t.replace(/\./g, '').includes(String(san)), 'A: hợp đồng dùng đúng giá xuống loại đã thống nhất'); assert.ok(!t.includes('2099'), 'A: bỏ qua số client gửi'); assert.ok(t.includes('Cắt sáng sớm'), 'A: ghi chú vào hợp đồng');
  console.log('✔ A4 Hợp đồng', hd.j.code, 'đúng bản đã thống nhất');
}
// ===== B: người thật bán =====
{
  const u = await vao('0945000880');
  const of = await cho(async () => (await u.get('/v1/offers')).find((x) => x.status === 'sent' && x.vong_cuoi?.from_side === 'buyer'), 'AI mua chào lô', u);
  const dy = await u.post(`/v1/offers/${of.id}/accept`, { expected_revision: of.revision }); assert.ok(dy.s < 300, 'B: đồng ý giá ' + dy.loi); console.log('✔ B1 Người bán chốt', of.code);
  const gia = Number(of.vong_cuoi.price_vnd);
  let dk = await cho(async () => { const d = await u.get(`/v1/offers/${of.id}/terms`); return d.trang_thai === 'cho_tra_loi' ? d : null; }, 'AI mua đề xuất điều khoản', u);
  assert.equal(dk.de_xuat_boi, 'buyer'); assert.equal((await u.get('/v1/orders')).filter((d) => d.offer_id === of.id).length, 0, 'B: chưa đồng ý thì chưa có hợp đồng'); console.log('✔ B2 AI mua gửi điều khoản, chưa tự tạo hợp đồng');
  const hc = Math.round(gia * 0.8 / 100) * 100;
  assert.ok((await u.post(`/v1/offers/${of.id}/terms`, { ...dk.ban, downgrade_price_vnd: hc })).s < 300, 'B: đề xuất sửa');
  await cho(async () => (await u.get(`/v1/offers/${of.id}`)).hold?.order_id, 'AI mua đồng ý rồi tạo hợp đồng', u);
  const ct = await u.get(`/v1/offers/${of.id}`); const t = JSON.stringify(await u.get(`/v1/orders/${ct.hold.order_id}/terms`));
  assert.ok(t.replace(/\./g, '').includes(String(hc)), 'B: hợp đồng dùng đúng bản người bán sửa'); console.log('✔ B3 AI mua đồng ý bản sửa, hợp đồng đúng giá xuống loại', hc);
}
console.log('ĐẠT trọn luồng hai chiều');
