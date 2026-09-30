// Kiểm thử theo ca T của Quy trình vận hành v3 (mục 22, 29). Chạy: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { khoiDong } from '../src/server.js';
import { clock, one, all, DAY, HOUR } from '../src/lib/core.js';
import { chayViecNen } from '../src/modules/ho-tro.js';
import { phiThanhCong, khoanThuThem, soSanhGoi, toiDaMoiBen } from '../src/lib/rules.js';
import { Phien } from '../scripts/client.js';
import { taoDuLieuMau } from '../scripts/du-lieu-mau.js';

let s, base, M, so = 0;
const ngay = d => new Date(Date.parse(clock.now().toISOString()) + d * DAY).toISOString().slice(0, 10);
const moi = async (app, ten, them = {}) => { const p = new Phien(base, '07' + String(1e8 + ++so).slice(1), ten); await p.dangNhap({ name: ten, app, ...them }); return p; };
const loiMa = (r, ma) => { assert.equal(r.ok, false, JSON.stringify(r)); assert.equal(r.ma, ma, r.loi); };
async function donDon(mua, ban, { kgMax = 1000, gia = 10000, loId, hoTro = false, payer = 'mua', xacNhan = true } = {}) {
  const lo = loId ? { id: loId } : (await ban.lam('POST', '/api/lots', { product_id: 'mango', qty_kg: kgMax * 2, qty_basis: 'da_can' })).item;
  const d = (await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(5), lines: [{ lot_id: lo.id, qty_kg: kgMax, price: gia }], terms: { dot_giao: [ngay(2)] } })).item;
  let sv = null;
  if (hoTro) {
    sv = (await mua.lam('POST', `/api/orders/${d.id}/services`, { payer, scope: { parties: 'A·B', product_group: 'xoài', max_qty_kg: kgMax, window_start: ngay(1), window_end: ngay(5), included_work: 'hồ sơ', service_period_end: ngay(40) } })).item;
    await mua.lam('POST', `/api/services/${sv.id}/consent`); await ban.lam('POST', `/api/services/${sv.id}/consent`);
  }
  if (xacNhan) { const v = d.phien_ban.at(-1); await ban.lam('POST', `/api/order-versions/${v.id}/confirm`); await mua.lam('POST', `/api/order-versions/${v.id}/confirm`); }
  return { don: (await mua.lam('GET', `/api/orders/${d.id}`)).item, lo, sv };
}

before(async () => {
  s = await khoiDong({ port: 0, db: ':memory:' });
  base = `http://127.0.0.1:${s.address().port}`;
  M = await taoDuLieuMau(base);
});
after(() => { clock.set(null); s.close(); });

test('Quy tắc phí: trần theo đơn, khấu trừ kích hoạt, so gói là mức tối đa (BR-34, BR-41)', () => {
  assert.equal(phiThanhCong(67_000_000, 80, 3_000_000), 536_000);
  assert.equal(phiThanhCong(67_000_000, 30, 1_500_000), 201_000);
  assert.equal(phiThanhCong(500_000_000, 80, 3_000_000), 3_000_000);
  assert.deepEqual(khoanThuThem({ coSo_vnd: 67_000_000, rate_bps: 80, cap_vnd: 3_000_000, kichHoatDaTra_vnd: 100_000, daQuyetToan_vnd: 0 }), { muc_tieu: 536_000, them: 436_000 });
  const g = soSanhGoi([100_000_000, 100_000_000]);
  assert.equal(g.free, 1_600_000); assert.equal(g.business, 2_100_000);
  const t = toiDaMoiBen({ gia_tri_du_kien_vnd: 67_000_000, rate_bps: 80, cap_vnd: 3_000_000, activation_fee_vnd: 100_000, payer_mua_bps: 5000, tax_bps: 0 });
  assert.equal(t.mua + t.ban, t.tong); assert.equal(t.mua, 268_000);   // T03: chia phí không tăng tổng
});

test('Dữ liệu mẫu: phí chỉ tính phần không tranh chấp; hạn mức 3 dùng + 2 giữ', async () => {
  const tri = M.P.tri;
  const q = await tri.lam('GET', '/api/quota');
  assert.equal(q.ket_noi.da_dung, 3); assert.equal(q.ket_noi.dang_giu, 2); assert.equal(q.ket_noi.con, 0);
  const hd = one("select sum(amount_vnd) n from fee_invoices where order_id = ? and kind = 'phi_thanh_cong'", M.ma.hd0243).n;
  assert.equal(hd, 285_000);                                    // 3.850 kg × 12.500 × 0,8% − 100.000
});

test('T02, T35: từ chối trả lượt; không gửi quá lượt còn; rút lời mời lấy lại lượt', async () => {
  const mua = await moi('mua', 'Mua T35');
  const ban = [];
  for (let i = 0; i < 6; i++) ban.push(await moi('ban', 'Bán ' + i));
  const cr = [];
  for (let i = 0; i < 5; i++) cr.push((await mua.lam('POST', '/api/connections', { to_org: ban[i].org.id, as: 'mua' })).item);
  loiMa(await mua.goi('POST', '/api/connections', { to_org: ban[5].org.id, as: 'mua' }), 'E11');
  await ban[0].lam('POST', `/api/connections/${cr[0].id}/decline`);
  await ban[1].lam('POST', `/api/connections/${cr[1].id}/accept`);
  await ban[1].lam('POST', `/api/connections/${cr[1].id}/accept`);           // gửi lại: không trừ hai lần
  const q = await mua.lam('GET', '/api/quota');
  assert.equal(q.ket_noi.da_dung, 1); assert.equal(q.ket_noi.dang_giu, 3); assert.equal(q.ket_noi.con, 1);
  await mua.lam('POST', `/api/connections/${cr[2].id}/withdraw`);
  assert.equal((await mua.lam('GET', '/api/quota')).ket_noi.con, 2);
});

test('T13: người bán chủ động chào không trừ lượt bên mua', async () => {
  const mua = await moi('mua', 'Mua T13'); const ban = await moi('ban', 'Bán T13');
  const r = await ban.lam('POST', '/api/connections', { to_org: mua.org.id, as: 'ban' });
  await mua.lam('POST', `/api/connections/${r.item.id}/accept`);
  const q = await mua.lam('GET', '/api/quota');
  assert.equal(q.ket_noi.da_dung, 0); assert.equal(q.ket_noi.dang_giu, 0);
});

test('T36: hỏi giá riêng không xuất bản, không trừ lượt tin; tạm giữ lượt kết nối', async () => {
  const mua = await moi('mua', 'Mua T36'); const ban = await moi('ban', 'Bán T36');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: 'durian', qty_kg: 2000 })).item;
  const r = await mua.lam('POST', `/api/lots/${lo.id}/inquiries`, { qty_kg: 500 });
  assert.equal(r.khong_tinh_luot_tin, true); assert.equal(r.tam_giu_luot_ket_noi, true);
  assert.equal(r.han_muc.tin_mua.da_dung, 0); assert.equal(r.han_muc.ket_noi.dang_giu, 1);
});

test('T43: lô sẵn giao 3 ngày vẫn nhận đề nghị; quá 7 ngày ngừng nhận', async () => {
  const ban = await moi('ban', 'Bán T43'); const mua = await moi('mua', 'Mua T43');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: 'longan', qty_kg: 1000 })).item;
  clock.advance(3 * DAY);
  const r3 = (await mua.lam('GET', `/api/lots/${lo.id}`)).item;
  assert.equal(r3.chua_xac_nhan_gan_day, true); assert.equal(r3.ngung_nhan_de_nghi, false);
  clock.advance(5 * DAY);
  loiMa(await mua.goi('POST', '/api/connections', { to_org: ban.org.id, lot_id: lo.id, as: 'mua' }), 'E05');
  await ban.lam('POST', `/api/lots/${lo.id}/confirm`);
  assert.equal((await mua.lam('GET', `/api/lots/${lo.id}`)).item.ngung_nhan_de_nghi, false);
  clock.set(null);
});

test('T29, T30: đơn tối đa 90 ngày; bán thêm là đơn mới', async () => {
  const mua = await moi('mua', 'Mua T29'); const ban = await moi('ban', 'Bán T29');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: 'mango', qty_kg: 5000 })).item;
  loiMa(await mua.goi('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(400), lines: [{ lot_id: lo.id, qty_kg: 100, price: 1 }] }), 'E05');
  const a = await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(10), lines: [{ lot_id: lo.id, qty_kg: 100, price: 1 }] });
  const b = await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(10), lines: [{ lot_id: lo.id, qty_kg: 100, price: 1 }] });
  assert.notEqual(a.item.code, b.item.code);
});

test('T05: hai giữ chỗ tranh lượng cuối — chỉ một được chấp nhận', async () => {
  const ban = await moi('ban', 'Bán T05'); const m1 = await moi('mua', 'Mua T05a'); const m2 = await moi('mua', 'Mua T05b');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: 'mango', qty_kg: 1000 })).item;
  const giu = async mua => {
    const d = (await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(5), lines: [{ lot_id: lo.id, qty_kg: 800, price: 1 }] })).item;
    const r = (await mua.lam('POST', `/api/order-versions/${d.phien_ban[0].id}/reservations`, { lot_id: lo.id, qty_kg: 800, expires_at: new Date(Date.now() + DAY).toISOString() })).item;
    return r;
  };
  const r1 = await giu(m1), r2 = await giu(m2);
  const [a, b] = await Promise.all([ban.goi('POST', `/api/reservations/${r1.id}/consent`), ban.goi('POST', `/api/reservations/${r2.id}/consent`)]);
  assert.equal([a, b].filter(x => x.ok && x.item.status === 'dang_giu').length, 1);
  assert.equal([a, b].filter(x => !x.ok && x.ma === 'E03').length, 1);
});

test('T37: giữ chỗ hết hạn giữa hai lượt ký và lô đã thiếu → E03, không hoàn tất', async () => {
  const ban = await moi('ban', 'Bán T37'); const mua = await moi('mua', 'Mua T37'); const khac = await moi('mua', 'Mua khác T37');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: 'mango', qty_kg: 1000 })).item;
  const d = (await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, window_start: ngay(1), window_end: ngay(5), lines: [{ lot_id: lo.id, qty_kg: 900, price: 1 }] })).item;
  const v = d.phien_ban[0];
  const r = (await mua.lam('POST', `/api/order-versions/${v.id}/reservations`, { lot_id: lo.id, qty_kg: 900, expires_at: new Date(Date.now() + HOUR).toISOString() })).item;
  await ban.lam('POST', `/api/reservations/${r.id}/consent`);
  await ban.lam('POST', `/api/order-versions/${v.id}/confirm`);
  clock.advance(2 * HOUR);                                        // hết hạn giữ
  await donDon(khac, ban, { loId: lo.id, kgMax: 500 });           // người khác lấy mất phần lớn
  loiMa(await mua.goi('POST', `/api/order-versions/${v.id}/confirm`), 'E03');
  assert.equal(one('select current_version_id c from orders where id = ?', d.id).c, null);
  clock.set(null);
});

test('T06: đổi nội dung khi đã có một chữ ký → bản mới, chữ ký cũ không dùng lại', async () => {
  const ban = await moi('ban', 'Bán T06'); const mua = await moi('mua', 'Mua T06');
  const { don } = await donDon(mua, ban, { xacNhan: false });
  const v1 = don.phien_ban[0];
  await ban.lam('POST', `/api/order-versions/${v1.id}/confirm`);
  await mua.lam('POST', `/api/orders/${don.id}/versions`, { window_start: ngay(1), window_end: ngay(6), lines: [{ lot_id: v1.dong[0].lot_id, qty_kg: 900, price: 10000 }] });
  loiMa(await mua.goi('POST', `/api/order-versions/${v1.id}/confirm`), 'E14');
  const ct = (await mua.lam('GET', `/api/orders/${don.id}`)).item;
  assert.equal(ct.phien_ban.at(-1).xac_nhan.length, 0);
});

test('Người giúp nhập liệu không được ký đơn', async () => {
  const nam = M.P.nam;
  const thao = new Phien(base, '0912000567', 'Thảo'); await thao.dangNhap();
  const d = one("select v.id from orders o join order_versions v on v.order_id = o.id where o.code = 'HĐ-0232'");
  loiMa(await thao.goi('POST', `/api/order-versions/${d.id}/confirm`), 'E01');
  assert.ok(nam);
});

test('T31, T15, T33: dịch vụ thiếu phạm vi bị chặn; đổi gói giữa hai xác nhận phải báo giá lại; người bán trả hết', async () => {
  const ban = await moi('ban', 'Bán T31'); const mua = await moi('mua', 'Mua T31');
  const { don } = await donDon(mua, ban, { xacNhan: false });
  loiMa(await mua.goi('POST', `/api/orders/${don.id}/services`, { scope: { parties: 'A·B', product_group: 'xoài' } }), 'E05');
  const pv = { parties: 'A·B', product_group: 'xoài', max_qty_kg: 1000, window_start: ngay(1), window_end: ngay(5), included_work: 'hồ sơ', service_period_end: ngay(40) };
  const sv = (await ban.lam('POST', `/api/orders/${don.id}/services`, { payer: 'ban', scope: pv })).item;
  const bg = await ban.lam('GET', `/api/services/${sv.id}/quote`);
  assert.ok(bg.phan_ban_tra_toi_da_vnd > 0);
  assert.equal((await mua.lam('GET', `/api/services/${sv.id}/quote`)).phan_ban_tra_toi_da_vnd, 0);
  await ban.lam('POST', `/api/services/${sv.id}/consent`);
  await mua.lam('POST', '/api/subscription/upgrade');
  loiMa(await mua.goi('POST', `/api/services/${sv.id}/consent`), 'E05');
  assert.equal(one('select status from service_engagement_versions where id = ?', sv.id).status, 'vo_hieu');
});

test('T07, T34, T38: số tự khai chưa chốt; phản đối chốt phần không tranh chấp; quá mốc cuối → chuyển cơ chế', async () => {
  const ban = await moi('ban', 'Bán T38'); const mua = await moi('mua', 'Mua T38');
  const { don } = await donDon(mua, ban, { hoTro: true, kgMax: 1000, gia: 10000 });
  const kq = (await mua.lam('POST', `/api/deliveries/${don.dot_giao[0].id}/results`, { accepted_kg: 900, rejected_kg: 100, measurements: [{ metric: 'tinh_g', value: 1000000 }] })).item;
  assert.equal(one("select count(*) n from accepted_lines where delivery_id = ?", don.dot_giao[0].id).n, 0);
  assert.equal(one("select source_label s from measurements where delivery_id = ?", don.dot_giao[0].id).s, 'tu_khai');
  const r = await ban.lam('POST', `/api/results/${kq.id}/confirm`, { decision: 'phan_doi', disputed_kg: 100 });
  assert.equal(r.khong_tranh_chap_kg, 900);
  for (let i = 0; i < 5; i++) { clock.advance(6 * DAY); chayViecNen(); }
  const tc = one('select * from disputes where id = ?', r.vu_viec.id);
  assert.equal(tc.status, 'chuyen_co_che');
  assert.equal(one('select sum(qty_g) n from accepted_lines where delivery_id = ?', don.dot_giao[0].id).n, 900_000);
  const coSo = one('select basis_vnd from fee_assessments where order_id = ? order by created_at desc limit 1', don.id).basis_vnd;
  assert.equal(coSo, 9_000_000);                                  // phần tranh chấp không vào cơ sở phí
  clock.set(null);
});

test('T32: hủy trước khi giao → không phí thành công; phí kích hoạt giữ theo bên đề nghị', async () => {
  const ban = await moi('ban', 'Bán T32'); const mua = await moi('mua', 'Mua T32');
  const { don } = await donDon(mua, ban, { hoTro: true });
  const r = await mua.lam('POST', `/api/orders/${don.id}/cancel`, { ly_do: 'doi_ke_hoach' });
  assert.equal(r.phi_thanh_cong, 0);
  assert.equal(one("select count(*) n from fee_invoices where order_id = ? and kind = 'phi_thanh_cong'", don.id).n, 0);
  assert.equal(one("select status from fee_invoices where order_id = ? and kind = 'phi_kich_hoat'", don.id).status, 'phat_hanh');
});

test('T39: hóa đơn phí quá hạn 15 ngày chặn bật dịch vụ mới (E16), công cụ cơ bản vẫn dùng được', async () => {
  const ban = await moi('ban', 'Bán T39'); const mua = await moi('mua', 'Mua T39');
  await donDon(mua, ban, { hoTro: true });
  clock.advance(23 * DAY); chayViecNen();
  const { don } = await donDon(mua, ban, { xacNhan: false });
  loiMa(await mua.goi('POST', `/api/orders/${don.id}/services`, { scope: { parties: 'A·B', product_group: 'x', max_qty_kg: 1, window_start: ngay(1), window_end: ngay(5), included_work: 'x', service_period_end: ngay(40) } }), 'E16');
  assert.equal((await mua.goi('GET', '/api/money')).ok, true);
  clock.set(null);
});

test('T25–T28: tài khoản nhận tiền — hai lớp xác thực, chờ xác minh, 72 giờ sau khôi phục, khóa bởi chủ, cảnh báo bên mua', async () => {
  const ban = await moi('ban', 'Chủ Vườn A'); const mua = await moi('mua', 'Mua T25');
  loiMa(await ban.goi('POST', '/api/payout-accounts', { bank: 'VCB', number: '111222333', holder_name: 'Chủ Vườn A', factors: ['otp'] }), 'E15');
  const a = await ban.lam('POST', '/api/payout-accounts', { bank: 'VCB', number: '111222333', holder_name: 'Chủ Vườn A', factors: ['otp', 'goi_lai_du_phong'] });
  assert.equal(a.item.status, 'cho_xac_minh');
  const { don } = await donDon(mua, ban, { gia: 10000 });
  const kq = (await mua.lam('POST', `/api/deliveries/${don.dot_giao[0].id}/results`, { accepted_kg: 1000 })).item;
  await ban.lam('POST', `/api/results/${kq.id}/confirm`, { decision: 'dong_y' });
  const [o] = (await mua.lam('GET', '/api/money')).phai_tra.filter(x => x.order_id === don.id);
  loiMa(await mua.goi('POST', `/api/obligations/${o.id}/instruction`), 'E15');   // T25: chưa hiện khi đang chờ
  clock.advance(25 * HOUR); chayViecNen();
  const hd = await mua.lam('POST', `/api/obligations/${o.id}/instruction`);
  assert.match(hd.canh_bao, /đổi ngày/);                                          // T28
  // T27: tên lệch → xác minh thủ công
  const lech = await ban.lam('POST', '/api/payout-accounts', { bank: 'VCB', number: '999', holder_name: 'Người Khác', factors: ['otp', 'truc_tiep'] });
  assert.equal(lech.item.yeu_cau.status, 'xac_minh_thu_cong');
  // T26: vừa khôi phục → chờ 72 giờ; chủ bấm "Không phải tôi" → khóa ngay
  await ban.lam('POST', '/api/security/recovered');
  const b = await ban.lam('POST', '/api/payout-accounts', { bank: 'VCB', number: '444', holder_name: 'Chủ Vườn A', factors: ['otp', 'video'] });
  assert.ok(Date.parse(b.item.yeu_cau.cooldown_until) - Date.now() > 70 * HOUR);
  const k = await ban.lam('POST', `/api/payout-change-requests/${b.item.yeu_cau.id}/deny`);
  assert.equal(k.da_khoa, true); assert.match(k.ticket, /^HT-/);
  assert.equal(one('select priority from tickets where code = ?', k.ticket).priority, 'P0');
  clock.set(null);
});

test('T09, T24: báo sai giữ sự kiện cũ; gửi lặp cùng khóa không tạo hai khoản trả', async () => {
  const ban = await moi('ban', 'Bán T24'); const mua = await moi('mua', 'Mua T24');
  await ban.lam('POST', '/api/payout-accounts', { bank: 'VCB', number: '5555', holder_name: 'Bán T24', factors: ['otp', 'video'] });
  const { don } = await donDon(mua, ban);
  const kq = (await mua.lam('POST', `/api/deliveries/${don.dot_giao[0].id}/results`, { accepted_kg: 1000 })).item;
  await ban.lam('POST', `/api/results/${kq.id}/confirm`, { decision: 'dong_y' });
  const [o] = (await mua.lam('GET', '/api/money')).phai_tra.filter(x => x.order_id === don.id);
  const body = { amount_vnd: o.amount_vnd, allocations: [{ obligation_id: o.id, amount_vnd: o.amount_vnd }] };
  const p1 = await mua.lam('POST', '/api/payments/report', body, { 'idempotency-key': 'k-T24' });
  const p2 = await mua.lam('POST', '/api/payments/report', body, { 'idempotency-key': 'k-T24' });
  assert.equal(p1.item.id, p2.item.id);
  assert.equal(one('select count(*) n from payment_allocations where obligation_id = ?', o.id).n, 1);
  await ban.lam('POST', `/api/payments/${p1.item.id}/receipt`, { kind: 'mot_phan', amount_vnd: 1000 });
  await ban.lam('POST', `/api/payments/${p1.item.id}/correction`, { reason: 'Bấm nhầm số' });
  assert.equal(one('select count(*) n from receipt_confirmations where payment_id = ?', p1.item.id).n, 1);
});

test('T41: chỉ báo bên mua — dưới 3 đơn “Chưa đủ dữ liệu”; Bên mua D có dữ liệu có nguồn', async () => {
  const mua = await moi('mua', 'Mua T41');
  const ban = await moi('ban', 'Bán T41');
  await ban.lam('POST', '/api/connections', { to_org: mua.org.id, as: 'ban' });
  assert.equal((await ban.lam('GET', `/api/orgs/${mua.org.id}/indicator`)).du_du_lieu, false);
  const d = await M.P.nam.lam('GET', `/api/orgs/${M.P.benD.org.id}/indicator`);
  assert.equal(d.du_du_lieu, true); assert.equal(d.don_da_quyet_toan, 4); assert.equal(d.tong_dot, 4); assert.equal(d.dot_dung_han, 3);
});

test('T40: nâng Business giữa tháng tính theo ngày, hạn mức không cấp lại toàn bộ', async () => {
  const mua = await moi('mua', 'Mua T40');
  const r = await mua.lam('POST', '/api/subscription/upgrade');
  assert.ok(r.thang_dau_vnd <= 1_500_000 && r.thang_dau_vnd > 0);
  const q = await mua.lam('GET', '/api/quota');
  assert.equal(q.goi, 'business'); assert.equal(q.ket_noi.tran, 50);
});

test('Mặt hàng tự nhập được dùng để đăng lô, nhãn chờ duyệt', async () => {
  const ban = await moi('ban', 'Bán tự nhập');
  const p = (await ban.lam('POST', '/api/products/custom', { name: 'Cá bống tượng', branch: 'farmed' })).item;
  assert.equal(p.status, 'tu_nhap_cho_duyet');
  const lo = (await ban.lam('POST', '/api/lots', { product_id: p.id, qty_kg: 200 })).item;
  assert.equal(lo.tu_nhap, true);
});
