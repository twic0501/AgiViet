// Dữ liệu mẫu chạy QUA API (mọi quy tắc nghiệp vụ được áp dụng), lùi đồng hồ để có lịch sử.
// Nhân vật khớp hai giao diện: chị Năm (bán), Nhà máy sấy Đồng Xanh (mua) và các đối tác.
// Chạy: node scripts/du-lieu-mau.js  → tạo lại data/agiviet.db   (mã OTP demo: 123456)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clock, one, run, insert, newId, nowIso, DAY, HOUR } from '../src/lib/core.js';
import { chayViecNen } from '../src/modules/ho-tro.js';
import { Phien } from './client.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ngay = d => new Date(Date.parse(nowIso()) + d * DAY).toISOString().slice(0, 10);

export const NGUOI_DUNG = {
  nam: ['0912345123', 'Nguyễn Thị Năm'], thao: ['0912000567', 'Thảo (người giúp)'],
  benB: ['0903000222', 'Bên mua B'], benC: ['0903000333', 'Bên mua C'], benD: ['0903000444', 'Bên mua D'], benF: ['0903000666', 'Bên mua F'], utHien: ['0903000777', 'Vựa Út Hiền'],
  tri: ['0909000456', 'Anh Trí'], quang: ['0909000111', 'Anh Quang'],
  phuc: ['0918000771', 'Anh Phúc'], utMai: ['0918000772', 'Chị Út Mai'], htxMX: ['0918000773', 'HTX Xoài Mỹ Xương'], haiThu: ['0918000774', 'Cô Hai Thu'],
  tuBen: ['0918000775', 'Anh Tư Bền'], thanhLoi: ['0918000776', 'Vựa Thành Lợi'], tanPhuoc: ['0918000778', 'HTX Chuối Tân Phước'], bayHoa: ['0918000779', 'Vườn Bảy Hòa'], sauLanh: ['0918000780', 'Chú Sáu Lành'],
  vanHanh: ['0900000000', 'Vận hành AgiViet'],
};

export async function taoDuLieuMau(base) {
  const T = Date.now();
  const luc = (d, h = 0) => clock.set(new Date(T + d * DAY + h * HOUR).toISOString());
  const P = {};
  const dk = async (k, dangKy) => { P[k] = new Phien(base, NGUOI_DUNG[k][0], NGUOI_DUNG[k][1]); await P[k].dangNhap({ name: NGUOI_DUNG[k][1], ...dangKy }); return P[k]; };
  const taiKhoan = (p, bank, so, chu) => p.lam('POST', '/api/payout-accounts', { bank, number: so, holder_name: chu, factors: ['otp', 'goi_lai_du_phong'] });
  const lo = async (p, b) => (await p.lam('POST', '/api/lots', b)).item;
  const ketNoi = async (mua, ban) => { const r = await mua.lam('POST', '/api/connections', { to_org: ban.org.id, as: 'mua' }); if (r.item) await ban.lam('POST', `/api/connections/${r.item.id}/accept`); return r.item; };
  const daiDien = (p, x) => p.lam('POST', `/api/ops/orgs/${x.org.id}/verify`, { capability_note: x.__nang_luc });

  async function taoDon({ mua, ban, loHang, kgMin, kgMax = kgMin, gia, tu, den, dot, coc = 0, hanTra = 0, hoTro = false, payer = 'mua', tuGiaoDich = false, xacNhan = true }) {
    const r = await mua.lam('POST', '/api/orders', { counterpart_org: ban.org.id, self_trade: tuGiaoDich, window_start: tu, window_end: den, lines: [{ lot_id: loHang.id, qty_min_kg: kgMin, qty_max_kg: kgMax, price: gia }], terms: { dot_giao: dot, coc_vnd: coc, han_tra_ngay: hanTra, diem_can: 'Cân tại điểm giao, hai bên chứng kiến', quy_trinh: 'QT-1' } });
    const don = r.item;
    if (hoTro) {
      const sv = await mua.lam('POST', `/api/orders/${don.id}/services`, { payer, dispute_plan: 'mau', scope: { parties: `${mua.org.name} · ${ban.org.name}`, product_group: loHang.san_pham, max_qty_kg: kgMax, window_start: tu, window_end: den, included_work: 'Hồ sơ, người trực, đối soát', service_period_end: ngay(40) } });
      await mua.lam('POST', `/api/services/${sv.item.id}/consent`);
      await ban.lam('POST', `/api/services/${sv.item.id}/consent`);
    }
    if (xacNhan) { const v = don.phien_ban.at(-1); await ban.lam('POST', `/api/order-versions/${v.id}/confirm`, { hash: v.hash }); await mua.lam('POST', `/api/order-versions/${v.id}/confirm`, { hash: v.hash }); }
    return (await mua.lam('GET', `/api/orders/${don.id}`)).item;
  }
  const nhapKQ = async (p, dotId, b) => (await p.lam('POST', `/api/deliveries/${dotId}/results`, b)).item;
  const traTien = async (mua, oblId, so) => (await mua.lam('POST', '/api/payments/report', { amount_vnd: so, reference: 'FT' + Math.floor(Math.random() * 1e8), allocations: [{ obligation_id: oblId, amount_vnd: so }], has_receipt_image: true })).item;
  const khoan = async (p, orderId, kind) => (await p.lam('GET', '/api/money')).phai_tra.filter(o => o.order_id === orderId && o.kind === kind);
  const doiMa = (id, ma) => run('update orders set code = ? where id = ?', ma, id);

  /* ===== Đăng ký (60 ngày trước) ===== */
  luc(-60);
  await dk('nam', { app: 'ban', province: 'Đồng Tháp', commune: 'Mỹ Xương, Cao Lãnh', seller_type: 'tu_trong', kind: 'ho' });
  await P.nam.lam('POST', '/api/org/members', { phone: NGUOI_DUNG.thao[0], name: NGUOI_DUNG.thao[1], roles: 'helper,create' });
  await P.nam.lam('POST', '/api/backup-contacts', { kind: 'nguoi_than', label: 'Chị Thảo', value: '0912005567' });
  await taiKhoan(P.nam, 'Agribank', '1234567884421', 'Nguyễn Thị Năm');
  for (const [k, ten, nl] of [['benB', 'Bên mua B · vựa trái cây', 'Kho 20 tấn, xe lạnh 5 tấn'], ['benC', 'Bên mua C · chuỗi cửa hàng', null], ['benD', 'Bên mua D · nhà máy sấy trái cây', 'Kho lạnh 30 tấn, dây chuyền sấy 5 tấn/ngày'], ['benF', 'Bên mua F · công ty xuất khẩu', null], ['utHien', 'Vựa Út Hiền', null]]) { await dk(k, { app: 'mua', org_name: ten }); P[k].__nang_luc = nl; }
  await dk('tri', { app: 'mua', org_name: 'Nhà máy sấy Đồng Xanh', province: 'Đồng Tháp' }); P.tri.__nang_luc = 'Kho lạnh 40 tấn, cân điện tử 60 tấn';
  await P.tri.lam('POST', '/api/org/members', { phone: NGUOI_DUNG.quang[0], name: 'Anh Quang · Giám đốc', roles: 'guest_signer,sign' });
  const banHang = [['phuc', 'Vựa Phúc Thịnh', 'mua_gom', 'Tiền Giang'], ['utMai', 'Chị Út Mai', 'tu_trong', 'Vĩnh Long'], ['htxMX', 'HTX Xoài Mỹ Xương', 'htx', 'Đồng Tháp'], ['haiThu', 'Cô Hai Thu', 'tu_trong', 'Cái Bè, Đồng Tháp'], ['tuBen', 'Anh Tư Bền', 'tu_trong', 'Cao Lãnh, Đồng Tháp'], ['thanhLoi', 'Vựa Thành Lợi', 'mua_gom', 'Tiền Giang'], ['tanPhuoc', 'HTX Chuối Tân Phước', 'htx', 'Tiền Giang'], ['bayHoa', 'Vườn Bảy Hòa', 'tu_trong', 'Bến Tre'], ['sauLanh', 'Chú Sáu Lành', 'tu_trong', 'Vĩnh Long']];
  for (const [k, ten, st, tinh] of banHang) { await dk(k, { app: 'ban', org_name: ten, seller_type: st, province: tinh, kind: st === 'htx' ? 'htx' : 'ho' }); await taiKhoan(P[k], 'Vietcombank', '00712' + P[k].phone.slice(-6), NGUOI_DUNG[k][1] === ten ? ten : NGUOI_DUNG[k][1]); }
  // Người vận hành AgiViet
  const vh = insert('users', { id: newId('u_'), phone: NGUOI_DUNG.vanHanh[0], name: NGUOI_DUNG.vanHanh[1], created_at: nowIso() });
  insert('memberships', { id: newId('m_'), user_id: vh.id, org_id: 'org_agiviet', roles: 'administer', status: 'active' });
  P.vanHanh = new Phien(base, NGUOI_DUNG.vanHanh[0]); await P.vanHanh.dangNhap({ org_id: 'org_agiviet' });
  for (const k of ['benB', 'benD', 'tri']) await daiDien(P.vanHanh, P[k]);
  luc(-58); chayViecNen();                                    // tài khoản nhận tiền qua thời gian chờ → dùng được
  // Tài khoản không khớp tên (anh Phúc đăng tên vựa) → xác minh thủ công; vận hành duyệt tay cho mẫu
  run("update payout_change_requests set status = 'cho' where status = 'xac_minh_thu_cong'"); chayViecNen();

  /* ===== Lịch sử đơn đã quyết toán: chỉ báo trả tiền của bên mua (BR-43) ===== */
  luc(-55);
  const loBay = await lo(P.bayHoa, { product_id: 'pomelo', qty_kg: 60000, qty_basis: 'da_can', grade: 'Loại 1' });
  for (const [mua, tre] of [['benD', [2]], ['tri', [1]]]) {
    for (let i = 0; i < 4; i++) {
      luc(-50 + i * 8);
      const d = await taoDon({ mua: P[mua], ban: P.bayHoa, loHang: loBay, kgMin: 1000, gia: 20000, tu: ngay(0), den: ngay(1), dot: [ngay(0)], tuGiaoDich: true });
      const kq = await nhapKQ(P[mua], d.dot_giao[0].id, { accepted_kg: 1000, measurements: [{ metric: 'tinh_g', value: 1000000, unit: 'g' }] });
      await P.bayHoa.lam('POST', `/api/results/${kq.id}/confirm`, { decision: 'dong_y' });
      const [o] = await khoan(P[mua], d.id, 'tien_hang');
      if (tre.includes(i)) luc(-50 + i * 8 + 3);
      const pm = await traTien(P[mua], o.id, o.amount_vnd);
      await P.bayHoa.lam('POST', `/api/payments/${pm.id}/receipt`, { kind: 'du' });
    }
  }

  /* ===== Phía chị Năm ===== */
  luc(-40);
  const loTom = await lo(P.nam, { product_id: 'shrimp', qty_kg: 1500, qty_basis: 'uoc_tinh', kind: 'mua_vu', avail_from: ngay(60), note: 'Tôm thẻ, thu hoạch dự kiến' });
  luc(-20);
  await ketNoi(P.benB, P.nam);
  luc(-3);
  const loXoai = await lo(P.nam, { product_id: 'mango', qty_kg: 10000, qty_basis: 'uoc_tinh', grade: 'Loại 1', note: 'Xoài cát Chu', ask_price: 6700 });
  const loTL = await lo(P.nam, { product_id: 'dragon-fruit', qty_kg: 3200, qty_basis: 'da_can', grade: 'Ruột đỏ loại 1' });
  luc(-2);
  const hd0231 = await taoDon({ mua: P.benB, ban: P.nam, loHang: loXoai, kgMin: 9000, kgMax: 10000, gia: 6700, tu: ngay(1), den: ngay(6), dot: [ngay(2), ngay(6)], coc: 10_000_000, hoTro: true });
  doiMa(hd0231.id, 'HĐ-0231');
  const [coc31] = await khoan(P.benB, hd0231.id, 'coc');
  const pmCoc31 = await traTien(P.benB, coc31.id, 10_000_000);
  await P.nam.lam('POST', `/api/payments/${pmCoc31.id}/receipt`, { kind: 'du' });
  const donTom = await taoDon({ mua: P.utHien, ban: P.nam, loHang: loTom, kgMin: 800, gia: 145000, tu: ngay(55), den: ngay(62), dot: [ngay(60)], tuGiaoDich: true });
  doiMa(donTom.id, 'Đ-0244');
  const donC = await taoDon({ mua: P.benC, ban: P.nam, loHang: loTL, kgMin: 2000, gia: 18000, tu: ngay(3), den: ngay(10), dot: [ngay(5)], xacNhan: false });
  doiMa(donC.id, 'HĐ-0232');
  luc(0, -3);
  const kq31 = await nhapKQ(P.benB, hd0231.dot_giao[0].id, { accepted_kg: 4820, rejected_kg: 200, reject_reason: 'Trái dập, nứt khi đổ ra sọt', measurements: [{ metric: 'ca_bi_g', value: 5270000, unit: 'g' }, { metric: 'bi_g', value: 250000, unit: 'g' }, { metric: 'brix_x10', value: 139, unit: '°Bx×10' }] });
  luc(0, -2);
  await P.benD.lam('POST', '/api/connections', { to_org: P.nam.org.id, lot_id: loXoai.id, as: 'mua', message: 'Chào chị, bên em cần xoài cát Chu loại 1 cho đợt sấy giữa tháng.' });
  luc(0, -1);
  await P.benF.lam('POST', `/api/lots/${loTL.id}/inquiries`, { qty_kg: 3000, window: '15/10', delivery_point: 'Kho Bên mua F, Cần Thơ' });

  /* ===== Phía Nhà máy sấy Đồng Xanh ===== */
  luc(-40);
  await ketNoi(P.tri, P.phuc);
  const loPhuc = await lo(P.phuc, { product_id: 'mango', qty_kg: 12000, qty_basis: 'da_can', grade: 'Loại 1', note: 'Xoài cát Chu, hàng mua đứt' });
  luc(-8);
  const hd0245 = await taoDon({ mua: P.tri, ban: P.phuc, loHang: loPhuc, kgMin: 12000, gia: 6900, tu: ngay(1), den: ngay(9), dot: [ngay(3), ngay(8)], coc: 15_000_000, hoTro: true });
  doiMa(hd0245.id, 'HĐ-0245');
  const [coc45] = await khoan(P.tri, hd0245.id, 'coc');
  await P.phuc.lam('POST', `/api/payments/${(await traTien(P.tri, coc45.id, 15_000_000)).id}/receipt`, { kind: 'du' });
  luc(-5);
  const kq45 = await nhapKQ(P.tri, hd0245.dot_giao[0].id, { accepted_kg: 6030, measurements: [{ metric: 'tinh_g', value: 6030000, unit: 'g' }, { metric: 'brix_x10', value: 140, unit: '°Bx×10' }] });
  await P.phuc.lam('POST', `/api/results/${kq45.id}/confirm`, { decision: 'dong_y' });
  const [dot1_45] = await khoan(P.tri, hd0245.id, 'tien_hang');
  await P.phuc.lam('POST', `/api/payments/${(await traTien(P.tri, dot1_45.id, dot1_45.amount_vnd)).id}/receipt`, { kind: 'du' });

  luc(-30);
  const loMit = await lo(P.utMai, { product_id: 'jackfruit', qty_kg: 8000, qty_basis: 'uoc_tinh', grade: 'Loại 1' });
  await taiKhoan(P.utMai, 'BIDV', '31410000999', 'Chị Út Mai');       // đổi tài khoản nhận tiền → cảnh báo 30 ngày
  luc(-28); chayViecNen();
  luc(-6);
  const hd0243 = await taoDon({ mua: P.tri, ban: P.utMai, loHang: loMit, kgMin: 4000, kgMax: 4000, gia: 12500, tu: ngay(1), den: ngay(10), dot: [ngay(2), ngay(9)], coc: 5_000_000, hanTra: 4, hoTro: true });
  doiMa(hd0243.id, 'HĐ-0243');
  const [coc43] = await khoan(P.tri, hd0243.id, 'coc');
  await P.utMai.lam('POST', `/api/payments/${(await traTien(P.tri, coc43.id, 5_000_000)).id}/receipt`, { kind: 'du' });
  luc(-4);
  const kq43 = await nhapKQ(P.tri, hd0243.dot_giao[0].id, { accepted_kg: 3850, rejected_kg: 150, reject_reason: 'Mít sượng, múi cứng', measurements: [{ metric: 'tinh_g', value: 4000000, unit: 'g' }] });
  await P.utMai.lam('POST', `/api/results/${kq43.id}/confirm`, { decision: 'phan_doi', disputed_kg: 150, note: 'Mít đủ ngày, chỉ sượng vài múi đầu trái.', goods_location: 'Kho lạnh nhà máy, mẫu lưu M-0921' });

  luc(-6);
  const loMX = await lo(P.htxMX, { product_id: 'mango', qty_kg: 5000, qty_basis: 'uoc_tinh', grade: 'Loại 1', note: 'Lô gộp 3 hộ' });
  const hd0239 = await taoDon({ mua: P.tri, ban: P.htxMX, loHang: loMX, kgMin: 5000, gia: 6800, tu: ngay(8), den: ngay(15), dot: [ngay(10)], xacNhan: false });
  await P.tri.lam('POST', `/api/orders/${hd0239.id}/versions`, { window_start: ngay(8), window_end: ngay(15), lines: [{ lot_id: loMX.id, qty_kg: 5000, price: 6800 }], terms: { dot_giao: [ngay(10)], ghi_chu: 'Bản 2: đổi điểm cân về nhà máy' } });
  doiMa(hd0239.id, 'HĐ-0239');

  luc(-5);
  const loChuoi = await lo(P.thanhLoi, { product_id: 'banana', qty_kg: 5000, qty_basis: 'da_can' });
  const d0247 = await taoDon({ mua: P.tri, ban: P.thanhLoi, loHang: loChuoi, kgMin: 3000, gia: 6000, tu: ngay(0), den: ngay(2), dot: [ngay(1)], hanTra: 7, tuGiaoDich: true });
  doiMa(d0247.id, 'Đ-0247');
  luc(-4);
  const kq47 = await nhapKQ(P.tri, d0247.dot_giao[0].id, { accepted_kg: 3000 });
  await P.thanhLoi.lam('POST', `/api/results/${kq47.id}/confirm`, { decision: 'dong_y' });

  // Nhu cầu mua tháng này: 4/5 tin; 3 kết nối đã dùng + 2 đang tạm giữ
  luc(-2);
  for (const [sp, t, a] of [['banana', 15000, 'Hằng tuần'], ['jackfruit', 8000, null], ['rice', 20000, null], ['mango', 20000, 'Xoài cát Chu loại 1']]) await P.tri.lam('POST', '/api/requests', { product_id: sp, qty_min_kg: t * 0.8, qty_max_kg: t, window_from: ngay(5), window_to: ngay(20), delivery_point: 'Nhà máy Đồng Xanh', pay_terms: 'Khi cân xong', recurring: !!a });
  run("update purchase_requests set code = 'N-014' where id = (select id from purchase_requests where buyer_org = ? order by created_at desc, rowid desc limit 1)", P.tri.org.id);
  for (const k of ['utMai', 'htxMX', 'haiThu']) await ketNoi(P.tri, P[k]);
  const loHai = await lo(P.haiThu, { product_id: 'mango', qty_kg: 6000, qty_basis: 'uoc_tinh', grade: 'Loại 1', note: 'Xoài cát Chu' });
  const n014 = one("select l.id from request_lines l join purchase_requests r on r.id = l.request_id where r.code = 'N-014'");
  await P.haiThu.lam('POST', '/api/quotes', { lot_id: loHai.id, request_line_id: n014.id, price: 7100, qty_kg: 6000, terms: 'Cân tại vườn, trả khi cân xong', alternative: { price: 6600, co_giay: false } });
  const loTu = await lo(P.tuBen, { product_id: 'mango', qty_kg: 8000, qty_basis: 'uoc_tinh', grade: 'Loại 1', avail_from: ngay(12), avail_to: ngay(15) });
  await P.tri.lam('POST', '/api/connections', { to_org: P.tuBen.org.id, lot_id: loTu.id, as: 'mua' });
  await P.tri.lam('POST', `/api/lots/${(await lo(P.sauLanh, { product_id: 'jackfruit', qty_kg: 3000, qty_basis: 'uoc_tinh' })).id}/inquiries`, { qty_kg: 3000 });

  // Nhật ký công việc mẫu (mục 31)
  for (const [cat, phut, ai, kh] of [['huong_dan', 25, 'nhan_vien', 0], ['xac_minh', 40, 'nhan_vien', 0], ['chuan_bi_thoa_thuan', 35, 'nhan_vien', 1], ['chuan_bi_thoa_thuan', 20, 'khach', 1], ['dieu_phoi', 30, 'nhan_vien', 0], ['truc_cho', 120, 'nhan_vien', 0]]) await P.vanHanh.lam('POST', '/api/work-logs', { category: cat, minutes: phut, performed_by: ai, customer_task: kh, order_id: hd0231.id });

  clock.set(null);
  return { P, ma: { hd0231: hd0231.id, hd0245: hd0245.id, hd0243: hd0243.id, kq31: kq31.id } };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const dbPath = process.env.AGIVIET_DB || path.join(goc, 'data', 'agiviet.db');
  for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) if (fs.existsSync(f)) fs.rmSync(f);
  const { khoiDong } = await import('../src/server.js');
  const s = await khoiDong({ port: 0, db: dbPath });
  const base = `http://127.0.0.1:${s.address().port}`;
  await taoDuLieuMau(base);
  s.close();
  const dem = t => one(`select count(*) n from ${t}`).n;
  console.log(`Đã tạo dữ liệu mẫu tại ${dbPath}: ${dem('organizations')} tổ chức, ${dem('lots')} lô, ${dem('orders')} đơn, ${dem('payments')} khoản trả, ${dem('fee_invoices')} hóa đơn phí, ${dem('disputes')} vụ tranh chấp.`);
  console.log('Đăng nhập (OTP demo 123456): chị Năm 0912345123 (/ban/), Anh Trí 0909000456 (/mua/), vận hành 0900000000.');
  process.exit(0);
}
