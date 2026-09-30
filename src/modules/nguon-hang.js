// Danh mục, lô, nhu cầu, kết nối có tạm giữ lượt (BR-05), hỏi giá riêng (BR-46), báo giá, chỉ báo bên mua (BR-43).
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, loi, khongThay, audit, notify, nextCode, periodOf, HOUR } from '../lib/core.js';
import { HAN_MUC, THOI_HAN, CHI_BAO_TOI_THIEU_DON } from '../lib/rules.js';
import { canQuyen, kg, raKg, goiCua, phienBanLo, luongKhaDung, trangThaiXacNhan } from '../lib/chung.js';

/* ---------- Danh mục (gồm mặt hàng tự nhập) ---------- */
route('GET', '/api/products', ctx => ({ items: all("select * from products where custom = 0 or created_by_org = ? or status = 'tu_nhap_da_duyet' order by sector, branch, grp, name_vi", ctx.org.id) }));
route('POST', '/api/products/custom', ctx => tx(() => {
  const ten = String(ctx.body.name || '').trim().replace(/\s+/g, ' ');
  const nhanh = ctx.body.branch;
  if (ten.length < 2) throw loi('E05', 'Nhập tên mặt hàng, ít nhất 2 chữ.', 'name');
  const nh = one('select sector from products where branch = ? limit 1', nhanh);
  if (!nh) throw loi('E05', 'Chọn lĩnh vực của mặt hàng.', 'branch');
  const trung = one('select * from products where lower(name_vi) = lower(?)', ten);
  if (trung) return { item: trung, da_co: true };
  const p = insert('products', { id: 'khac-' + newId(), sector: nh.sector, branch: nhanh, grp: 'khac', name_vi: ten, name_en: ten, custom: 1, created_by_org: ctx.org.id, status: 'tu_nhap_cho_duyet' });
  audit(ctx, 'products', p.id, 'tu_nhap');
  return { __status: 201, item: p, nhan: 'Tự nhập · chờ duyệt vào danh mục' };
}));

/* ---------- Lô hàng ---------- */
function moTaLo(lo, cho = null) {
  const v = phienBanLo(lo.id);
  const sp = one('select name_vi, custom from products where id = ?', lo.product_id);
  const camKet = one("select coalesce(sum(qty_g),0) n from lot_commitments where lot_id = ? and status = 'cam_ket'", lo.id).n;
  const giaoRoi = one('select coalesce(sum(a.qty_g),0) n from accepted_lines a join order_lines l on l.id = a.order_line_id where l.lot_id = ?', lo.id).n;
  const giu = one("select coalesce(sum(qty_g),0) n from reservations where lot_id = ? and status = 'dang_giu' and expires_at > ?", lo.id, nowIso()).n;
  const nguoiBan = one('select id, name, province, seller_type, phone_verified_at from organizations where id = ?', lo.seller_org);
  return {
    ...lo, san_pham: sp?.name_vi, tu_nhap: !!sp?.custom, phien_ban: v, nguoi_ban: nguoiBan,
    luong: { du_kien_kg: raKg(v.qty_g), co_so: v.qty_basis, giu_cho_kg: raKg(giu), cam_ket_kg: raKg(camKet), da_giao_kg: raKg(giaoRoi), con_trong_kg: raKg(luongKhaDung(lo.id)) },
    ...trangThaiXacNhan(lo),
  };
}
route('GET', '/api/lots', ctx => {
  if (ctx.query.cua_toi) return { items: all('select * from lots where seller_org = ? order by created_at desc', ctx.org.id).map(l => moTaLo(l)) };
  const q = ctx.query.q ? `%${ctx.query.q}%` : '%';
  const items = all("select l.* from lots l join products p on p.id = l.product_id where l.status = 'cong_khai' and p.name_vi like ? order by l.created_at desc limit 100", q).map(l => moTaLo(l));
  return { items };
});
route('GET', '/api/lots/:id', ctx => { const lo = one('select * from lots where id = ? or code = ?', ctx.params.id, ctx.params.id); if (!lo) throw khongThay('Lô'); return { item: moTaLo(lo) }; });

route('POST', '/api/lots', ctx => tx(() => {
  if (!ctx.org.can_sell) throw loi('E01', 'Tổ chức này chưa có vai trò bán.');
  canQuyen(ctx, 'create');
  const b = ctx.body;
  const sp = one('select * from products where id = ?', b.product_id);
  if (!sp) throw loi('E05', 'Chọn mặt hàng.', 'product_id');
  if (!(Number(b.qty_kg) > 0)) throw loi('E05', 'Nhập lượng (có thể ước tính).', 'qty_kg');
  const homNay = nowIso().slice(0, 10);
  const daDang = one("select count(*) n from quota_events where org_id = ? and kind = 'tin_ban' and substr(created_at,1,10) = ?", ctx.org.id, homNay).n;
  if (b.publish !== false && daDang >= HAN_MUC.ban.tin_ban_ngay) throw loi('E11', `Hôm nay đã đăng ${daDang}/${HAN_MUC.ban.tin_ban_ngay} tin mới. Có thể xin nâng hạn mức.`);
  const lo = insert('lots', { id: newId('lo_'), code: nextCode('LO-', 'lots'), seller_org: ctx.org.id, product_id: sp.id, kind: b.kind === 'mua_vu' ? 'mua_vu' : 'san_giao', status: b.publish === false ? 'nhap' : 'cong_khai', created_at: nowIso() });
  insert('lot_versions', { id: newId('lv_'), lot_id: lo.id, revision: 1, qty_g: kg(b.qty_kg), qty_basis: b.qty_basis === 'da_can' ? 'da_can' : 'uoc_tinh', grade: b.grade || null, avail_from: b.avail_from || null, avail_to: b.avail_to || null, locality: b.locality || ctx.org.commune || null, ask_price_vnd_per_kg: b.ask_price || null, note: b.note || null, created_at: nowIso() });
  insert('availability_events', { id: newId('av_'), lot_id: lo.id, kind: 'con_hang', by_user: ctx.user.id, at: nowIso() });
  if (lo.status === 'cong_khai') insert('quota_events', { id: newId('qe_'), org_id: ctx.org.id, kind: 'tin_ban', period: periodOf(), source_id: lo.id, created_at: nowIso() });
  audit(ctx, 'lots', lo.id, 'dang');
  return { __status: 201, item: moTaLo(lo) };
}));
// Cập nhật lượng: phiên bản mới; không sửa cam kết đã ký. Thấp hơn cam kết → E03 kèm danh sách đơn bị ảnh hưởng
route('POST', '/api/lots/:id/update', ctx => tx(() => {
  const lo = one('select * from lots where id = ? and seller_org = ?', ctx.params.id, ctx.org.id);
  if (!lo) throw khongThay('Lô');
  const v = phienBanLo(lo.id);
  const moi = kg(ctx.body.qty_kg ?? raKg(v.qty_g));
  insert('lot_versions', { ...v, id: newId('lv_'), revision: v.revision + 1, qty_g: moi, qty_basis: ctx.body.qty_basis || v.qty_basis, note: ctx.body.note ?? v.note, created_at: nowIso() });
  insert('availability_events', { id: newId('av_'), lot_id: lo.id, kind: ctx.body.ban_ngoai ? 'ban_ngoai' : 'cap_nhat', by_user: ctx.user.id, at: nowIso() });
  audit(ctx, 'lots', lo.id, 'cap_nhat_luong', { qty_kg: raKg(moi) });
  const camKet = one("select coalesce(sum(qty_g),0) n from lot_commitments where lot_id = ? and status = 'cam_ket'", lo.id).n;
  const canhBao = moi < camKet ? { ma: 'E03', don_bi_anh_huong: all("select o.code from lot_commitments c join orders o on o.id = c.order_id where c.lot_id = ? and c.status = 'cam_ket'", lo.id).map(r => r.code) } : null;
  if (canhBao) for (const c of all("select o.buyer_org, o.code from lot_commitments c join orders o on o.id = c.order_id where c.lot_id = ? and c.status = 'cam_ket'", lo.id)) notify(c.buyer_org, `Người bán báo lô ${lo.code} còn ít hơn lượng đã hứa cho ${c.code}. Cam kết cũ vẫn giữ, chờ đề nghị điều chỉnh.`);
  return { item: moTaLo(lo), canh_bao: canhBao };
}));
// Xác nhận còn hàng một chạm (BR-10); người giúp/HTX xác nhận thay được theo vai trò
route('POST', '/api/lots/:id/confirm', ctx => tx(() => {
  const lo = one('select * from lots where id = ? and seller_org = ?', ctx.params.id, ctx.org.id);
  if (!lo) throw khongThay('Lô');
  insert('availability_events', { id: newId('av_'), lot_id: lo.id, kind: lo.status === 'tam_dung' ? 'mo_lai' : 'con_hang', by_user: ctx.user.id, at: nowIso() });
  if (lo.status === 'tam_dung') run("update lots set status = 'cong_khai' where id = ?", lo.id);
  return { item: moTaLo(one('select * from lots where id = ?', lo.id)) };
}));
route('POST', '/api/lots/:id/pause', ctx => tx(() => {
  const lo = one('select * from lots where id = ? and seller_org = ?', ctx.params.id, ctx.org.id);
  if (!lo) throw khongThay('Lô');
  run("update lots set status = ? where id = ?", ctx.body.het_hang ? 'het_hang' : 'tam_dung', lo.id);
  insert('availability_events', { id: newId('av_'), lot_id: lo.id, kind: 'tam_dung', by_user: ctx.user.id, at: nowIso() });
  return { item: moTaLo(one('select * from lots where id = ?', lo.id)) };
}));

/* ---------- Nhu cầu mua ---------- */
export function hanMucMua(orgId) {
  const goi = goiCua(orgId);
  const ky = periodOf();
  const tran = HAN_MUC[goi];
  const daDung = one("select coalesce(sum(amount),0) n from quota_events where org_id = ? and kind = 'ket_noi' and period = ?", orgId, ky).n;
  const dangGiu = one("select count(*) n from quota_holds where org_id = ? and status = 'giu'", orgId).n;
  const tin = one("select coalesce(sum(amount),0) n from quota_events where org_id = ? and kind = 'tin_mua' and period = ?", orgId, ky).n;
  return { goi, ky, ket_noi: { tran: tran.ket_noi, da_dung: daDung, dang_giu: dangGiu, con: Math.max(0, tran.ket_noi - daDung - dangGiu) }, tin_mua: { tran: tran.tin_mua, da_dung: tin, con: Math.max(0, tran.tin_mua - tin) }, dat_lai: ky === periodOf() ? `1/${Number(ky.slice(5)) % 12 + 1}` : null };
}
route('GET', '/api/quota', ctx => hanMucMua(ctx.org.id));

route('GET', '/api/requests', ctx => ({
  items: all('select * from purchase_requests where buyer_org = ? order by created_at desc', ctx.org.id).map(r => ({ ...r, dong: all('select * from request_lines where request_id = ?', r.id) })),
}));
route('GET', '/api/requests/public', ctx => ({
  items: all("select r.*, o.name nguoi_mua from purchase_requests r join organizations o on o.id = r.buyer_org where r.status = 'cong_khai' order by r.published_at desc limit 50").map(r => ({ ...r, dong: all('select l.*, p.name_vi san_pham from request_lines l join products p on p.id = l.product_id where request_id = ?', r.id) })),
}));
route('POST', '/api/requests', ctx => tx(() => {
  if (!ctx.org.can_buy) throw loi('E01', 'Tổ chức này chưa có vai trò mua.');
  canQuyen(ctx, 'create');
  const b = ctx.body;
  if (!one('select 1 from products where id = ?', b.product_id)) throw loi('E05', 'Chọn mặt hàng.', 'product_id');
  const dang = b.publish !== false;
  if (dang) { const hm = hanMucMua(ctx.org.id); if (hm.tin_mua.con <= 0) throw loi('E11', `Đã dùng ${hm.tin_mua.da_dung}/${hm.tin_mua.tran} tin mua tháng này. Sửa tin cũ không tính lượt.`); }
  const r = insert('purchase_requests', { id: newId('pr_'), code: nextCode('N-', 'purchase_requests'), buyer_org: ctx.org.id, status: dang ? 'cong_khai' : 'nhap', recurring: b.recurring ? 1 : 0, created_at: nowIso(), published_at: dang ? nowIso() : null });
  insert('request_lines', { id: newId('rl_'), request_id: r.id, product_id: b.product_id, grade: b.grade || null, qty_min_g: kg(b.qty_min_kg ?? b.qty_kg), qty_max_g: kg(b.qty_max_kg ?? b.qty_kg), window_from: b.window_from, window_to: b.window_to, delivery_point: b.delivery_point || null, pay_terms: b.pay_terms || null });
  if (dang) insert('quota_events', { id: newId('qe_'), org_id: ctx.org.id, kind: 'tin_mua', period: periodOf(), source_id: r.id, created_at: nowIso() });
  audit(ctx, 'purchase_requests', r.id, dang ? 'xuat_ban' : 'luu_nhap');
  return { __status: 201, item: r, han_muc: hanMucMua(ctx.org.id) };
}));

/* ---------- Kết nối + tạm giữ lượt (BR-05) ---------- */
const coQuanHe = (mua, ban) => !!one('select 1 from relationships where buyer_org = ? and seller_org = ?', mua, ban);
function kiemLoNhanDeNghi(loId) {
  if (!loId) return null;
  const lo = one('select * from lots where id = ?', loId);
  if (!lo) throw khongThay('Lô');
  if (trangThaiXacNhan(lo).ngung_nhan_de_nghi) throw loi('E05', 'Lô này đang tạm ngừng nhận đề nghị mới (lâu chưa xác nhận còn hàng).');
  return lo;
}
export function guiKetNoi(ctx, { to_org, lot_id = null, inquiry_id = null, message = null }) {
  const toi = ctx.org.id;
  const laMua = !!ctx.org.can_buy && !!one('select can_sell from organizations where id = ? and can_sell = 1', to_org);
  const benGui = ctx.body.as === 'ban' || !laMua ? 'ban' : 'mua';
  const [mua, ban] = benGui === 'mua' ? [toi, to_org] : [to_org, toi];
  if (coQuanHe(mua, ban)) return { da_ket_noi: true };
  if (one("select 1 from connection_requests where from_org = ? and to_org = ? and status = 'cho'", toi, to_org)) throw loi('E10', 'Đã có lời mời đang chờ tới đối tác này.');
  const cr = insert('connection_requests', { id: newId('cr_'), from_org: toi, to_org, initiated_by: benGui, lot_id, inquiry_id, message, status: 'cho', created_at: nowIso(), expires_at: addMs(nowIso(), THOI_HAN.ket_noi_het_han) });
  if (benGui === 'mua') {
    const hm = hanMucMua(toi);
    if (hm.ket_noi.con <= 0) throw loi('E11', `Hết lượt: ${hm.ket_noi.da_dung} đã dùng, ${hm.ket_noi.dang_giu} đang tạm giữ. Rút một lời mời đang chờ để lấy lại lượt, hoặc chờ tháng sau.`);
    insert('quota_holds', { id: newId('qh_'), org_id: toi, kind: 'ket_noi', period: periodOf(), source_id: cr.id, status: 'giu', created_at: nowIso() });
  } else {
    // Người bán chủ động: không trừ lượt bên mua; chống spam 5 lời chào/ngày
    const homNay = nowIso().slice(0, 10);
    const n = one("select count(*) n from quota_events where org_id = ? and kind = 'loi_chao' and substr(created_at,1,10) = ?", toi, homNay).n;
    if (n >= HAN_MUC.ban.loi_chao_ngay) throw loi('E11', `Hôm nay đã gửi ${n}/${HAN_MUC.ban.loi_chao_ngay} lời chào tới người mua mới.`);
    insert('quota_events', { id: newId('qe_'), org_id: toi, kind: 'loi_chao', period: periodOf(), source_id: cr.id, created_at: nowIso() });
  }
  notify(to_org, benGui === 'mua' ? `${ctx.org.name} muốn kết nối${inquiry_id ? ' và hỏi giá riêng' : ''}.` : `${ctx.org.name} chào hàng tới bạn.`, benGui === 'mua' ? '/ban/khach.html#khach' : '/mua/nguon-hang.html#nguon-hang');
  audit(ctx, 'connection_requests', cr.id, 'gui', { ben: benGui });
  return { item: cr, tam_giu: benGui === 'mua' };
}
route('POST', '/api/connections', ctx => tx(() => {
  kiemLoNhanDeNghi(ctx.body.lot_id);
  const kq = guiKetNoi(ctx, ctx.body);
  return { __status: kq.da_ket_noi ? 200 : 201, ...kq, han_muc: ctx.org.can_buy ? hanMucMua(ctx.org.id) : null };
}));
route('GET', '/api/connections', ctx => ({
  den: all("select c.*, o.name ten_ben_gui from connection_requests c join organizations o on o.id = c.from_org where c.to_org = ? order by c.created_at desc", ctx.org.id),
  di: all("select c.*, o.name ten_ben_nhan from connection_requests c join organizations o on o.id = c.to_org where c.from_org = ? order by c.created_at desc", ctx.org.id),
  quan_he: all("select r.*, b.name ten_mua, s.name ten_ban from relationships r join organizations b on b.id = r.buyer_org join organizations s on s.id = r.seller_org where r.buyer_org = ? or r.seller_org = ?", ctx.org.id, ctx.org.id),
}));
function dongLoiMoi(id, trangThai, ctx) {
  const cr = one('select * from connection_requests where id = ?', id);
  if (!cr) throw khongThay('Lời mời');
  if (cr.status !== 'cho') return cr;           // gửi lại: giữ kết quả cũ, không trừ hai lần
  run('update connection_requests set status = ?, decided_at = ? where id = ?', trangThai, nowIso(), id);
  const giu = one("select * from quota_holds where source_id = ? and status = 'giu'", id);
  if (trangThai === 'chap_nhan') {
    const [mua, ban] = cr.initiated_by === 'mua' ? [cr.from_org, cr.to_org] : [cr.to_org, cr.from_org];
    run('insert or ignore into relationships (id, buyer_org, seller_org, created_at) values (?,?,?,?)', newId('rs_'), mua, ban, nowIso());
    if (giu) {
      run("update quota_holds set status = 'da_dung', closed_at = ? where id = ?", nowIso(), giu.id);
      run('insert or ignore into quota_events (id, org_id, kind, period, source_id, amount, created_at) values (?,?,?,?,?,1,?)', newId('qe_'), giu.org_id, 'ket_noi', giu.period, id, nowIso());
    }
    notify(cr.from_org, 'Lời mời kết nối đã được chấp nhận.');
  } else if (giu) run("update quota_holds set status = 'tra_lai', closed_at = ? where id = ?", nowIso(), giu.id);
  audit(ctx, 'connection_requests', id, trangThai);
  return one('select * from connection_requests where id = ?', id);
}
route('POST', '/api/connections/:id/accept', ctx => tx(() => {
  const cr = one('select * from connection_requests where id = ? and to_org = ?', ctx.params.id, ctx.org.id);
  if (!cr) throw khongThay('Lời mời');
  return { item: dongLoiMoi(cr.id, 'chap_nhan', ctx) };
}));
route('POST', '/api/connections/:id/decline', ctx => tx(() => {
  const cr = one('select * from connection_requests where id = ? and to_org = ?', ctx.params.id, ctx.org.id);
  if (!cr) throw khongThay('Lời mời');
  return { item: dongLoiMoi(cr.id, 'tu_choi', ctx), ghi_chu: 'Bên gửi không bị báo lý do.' };
}));
route('POST', '/api/connections/:id/withdraw', ctx => tx(() => {
  const cr = one('select * from connection_requests where id = ? and from_org = ?', ctx.params.id, ctx.org.id);
  if (!cr) throw khongThay('Lời mời');
  return { item: dongLoiMoi(cr.id, 'rut', ctx), han_muc: ctx.org.can_buy ? hanMucMua(ctx.org.id) : null };
}));
export function hetHanLoiMoi() {
  const het = all("select id from connection_requests where status = 'cho' and expires_at <= ?", nowIso());
  for (const r of het) tx(() => dongLoiMoi(r.id, 'het_han', null));
  return het.length;
}

/* ---------- Hỏi giá riêng (BR-46) ---------- */
route('POST', '/api/lots/:id/inquiries', ctx => tx(() => {
  if (!ctx.org.can_buy) throw loi('E01', 'Tổ chức này chưa có vai trò mua.');
  const lo = kiemLoNhanDeNghi(ctx.params.id);
  const b = ctx.body;
  const pi = insert('price_inquiries', { id: newId('pi_'), buyer_org: ctx.org.id, lot_id: lo.id, qty_g: kg(b.qty_kg || raKg(phienBanLo(lo.id).qty_g)), window_text: b.window || null, delivery_point: b.delivery_point || null, note: b.note || null, status: 'cho', created_at: nowIso() });
  let ketNoi = null;
  if (!coQuanHe(ctx.org.id, lo.seller_org)) ketNoi = guiKetNoi({ ...ctx, body: { as: 'mua' } }, { to_org: lo.seller_org, lot_id: lo.id, inquiry_id: pi.id, message: b.note });
  else notify(lo.seller_org, `${ctx.org.name} hỏi giá riêng lô ${lo.code}.`, '/ban/khach.html#khach');
  audit(ctx, 'price_inquiries', pi.id, 'hoi_gia');
  return { __status: 201, item: pi, khong_dang_cong_khai: true, khong_tinh_luot_tin: true, tam_giu_luot_ket_noi: !!ketNoi?.tam_giu, han_muc: hanMucMua(ctx.org.id) };
}));
route('GET', '/api/inquiries', ctx => ({
  den: all('select i.*, l.code lo, o.name nguoi_mua from price_inquiries i join lots l on l.id = i.lot_id join organizations o on o.id = i.buyer_org where l.seller_org = ? order by i.created_at desc', ctx.org.id),
  di: all('select i.*, l.code lo from price_inquiries i join lots l on l.id = i.lot_id where i.buyer_org = ? order by i.created_at desc', ctx.org.id),
}));

/* ---------- Báo giá ---------- */
route('POST', '/api/quotes', ctx => tx(() => {
  const b = ctx.body;
  const lo = one('select * from lots where id = ? and seller_org = ?', b.lot_id, ctx.org.id);
  if (!lo) throw loi('E01', 'Chỉ người bán của lô được gửi báo giá.');
  let buyer;
  if (b.price_inquiry_id) { const pi = one('select * from price_inquiries where id = ? and lot_id = ?', b.price_inquiry_id, lo.id); if (!pi) throw khongThay('Hỏi giá'); buyer = pi.buyer_org; run("update price_inquiries set status = 'da_bao_gia' where id = ?", pi.id); }
  else if (b.request_line_id) { const rl = one('select r.buyer_org from request_lines l join purchase_requests r on r.id = l.request_id where l.id = ?', b.request_line_id); if (!rl) throw khongThay('Dòng nhu cầu'); buyer = rl.buyer_org; }
  else throw loi('E05', 'Báo giá phải trả lời một hỏi giá hoặc một dòng nhu cầu.');
  if (!coQuanHe(buyer, ctx.org.id) && !b.price_inquiry_id) throw loi('E01', 'Cần kết nối được chấp nhận trước khi gửi báo giá.');
  const q = insert('quotes', { id: newId('qt_'), lot_id: lo.id, request_line_id: b.request_line_id || null, price_inquiry_id: b.price_inquiry_id || null, seller_org: ctx.org.id, buyer_org: buyer, status: 'gui', created_at: nowIso() });
  insert('quote_versions', { id: newId('qv_'), quote_id: q.id, version_no: 1, price_vnd_per_kg: Number(b.price), qty_g: kg(b.qty_kg), valid_until: b.valid_until || addMs(nowIso(), 3 * 24 * HOUR), terms: b.terms || null, created_by_org: ctx.org.id, created_at: nowIso() });
  if (b.alternative) insert('alternative_offers', { id: newId('ao_'), quote_id: q.id, seller_org: ctx.org.id, price_vnd_per_kg: b.alternative.price || null, terms: b.alternative.terms || null, evidence_level: b.alternative.co_giay ? 'co_giay' : 'loi_ke', created_at: nowIso() });
  notify(buyer, `${ctx.org.name} gửi báo giá ${b.price} đ/kg cho lô ${lo.code}. Báo giá không giữ hàng.`, '/mua/bao-gia.html#bao-gia');
  audit(ctx, 'quotes', q.id, 'gui');
  return { __status: 201, item: q, ghi_chu: 'Báo giá không giữ hàng.' };
}));
route('GET', '/api/quotes', ctx => ({
  items: all(`select q.*, v.price_vnd_per_kg, v.qty_g, v.valid_until, v.terms, l.code lo, p.name_vi san_pham, s.name nguoi_ban, b.name nguoi_mua
    from quotes q join quote_versions v on v.quote_id = q.id and v.version_no = (select max(version_no) from quote_versions where quote_id = q.id)
    join lots l on l.id = q.lot_id join products p on p.id = l.product_id join organizations s on s.id = q.seller_org join organizations b on b.id = q.buyer_org
    where q.buyer_org = ? or q.seller_org = ? order by q.created_at desc`, ctx.org.id, ctx.org.id),
}));

/* ---------- Chỉ báo bên mua (BR-43): chỉ việc người bán đã xác nhận ---------- */
export function chiBaoBenMua(orgId) {
  const quyetToan = one("select count(*) n from orders where buyer_org = ? and status in ('dong','cho_quyet_toan')", orgId).n;
  const dot = all(`select o.due_at, (select min(r.at) from receipt_confirmations r join payment_allocations a on a.payment_id = r.payment_id where a.obligation_id = o.id and r.kind = 'du') nhan_luc, o.created_at
    from obligations o where o.payer_org = ? and o.kind = 'tien_hang' and o.due_at is not null`, orgId).filter(d => d.nhan_luc);
  const dungHan = dot.filter(d => d.nhan_luc <= d.due_at).length;
  const ngay = dot.map(d => (Date.parse(d.nhan_luc) - Date.parse(d.created_at)) / 864e5).sort((a, b) => a - b);
  const org = one('select capability_note, capability_checked_at from organizations where id = ?', orgId);
  if (quyetToan < CHI_BAO_TOI_THIEU_DON) return { du_du_lieu: false, thong_bao: 'Chưa đủ dữ liệu', don_da_quyet_toan: quyetToan };
  return { du_du_lieu: true, don_da_quyet_toan: quyetToan, dot_dung_han: dungHan, tong_dot: dot.length, trung_vi_ngay_tra: ngay.length ? Math.round(ngay[Math.floor(ngay.length / 2)] * 10) / 10 : null, nang_luc: org?.capability_note, nang_luc_doi_chieu: org?.capability_checked_at, ghi_chu: 'Chỉ tính việc người bán đã xác nhận. Không phải bảo đảm thanh toán.' };
}
route('GET', '/api/orgs/:id/indicator', ctx => {
  const coLienQuan = ctx.params.id === ctx.org.id || one('select 1 from relationships where buyer_org = ? and seller_org = ?', ctx.params.id, ctx.org.id) || one("select 1 from connection_requests where (from_org = ? and to_org = ?) or (from_org = ? and to_org = ?)", ctx.params.id, ctx.org.id, ctx.org.id, ctx.params.id);
  if (!coLienQuan) throw khongThay('Tổ chức');
  return chiBaoBenMua(ctx.params.id);
});
route('POST', '/api/indicator/correction', ctx => tx(() => {
  const t = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: 'Chỉ báo bên mua', priority: 'P3', category: 'du_lieu', description: String(ctx.body.note || 'Yêu cầu sửa dữ liệu chỉ báo'), status: 'moi', created_at: nowIso() });
  return { ticket: t.code };
}));
