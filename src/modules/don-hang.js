// Hợp đồng khung, đơn, phiên bản, xác nhận/ký, giữ chỗ (BR-16, BR-39) và dịch vụ hỗ trợ (BR-40, BR-41, BR-44).
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, sha256, loi, khongThay, audit, notify, nextCode, DAY } from '../lib/core.js';
import { BIEU_PHI, MAU_CHUA_CHOT, THOI_HAN, toiDaMoiBen, tienHang } from '../lib/rules.js';
import { canQuyen, khongPhaiNguoiGiup, benTrongDon, benKia, orgCuaBen, layDon, goiCua, kg, raKg, luongKhaDung } from '../lib/chung.js';
import { phatHanhHoaDon } from './tien.js';

/* ---------- Hợp đồng khung ---------- */
route('POST', '/api/frameworks', ctx => tx(() => {
  canQuyen(ctx, 'create');
  const { counterpart_org, title } = ctx.body;
  const laMua = ctx.org.can_buy && !ctx.body.as_seller;
  const f = insert('framework_agreements', { id: newId('fa_'), code: nextCode('HK-', 'framework_agreements'), buyer_org: laMua ? ctx.org.id : counterpart_org, seller_org: laMua ? counterpart_org : ctx.org.id, title: title || 'Thỏa thuận chung', created_at: nowIso() });
  return { __status: 201, item: f, ghi_chu: 'Hợp đồng khung không phải đơn vị áp trần phí; mỗi lần mua là một đơn riêng.' };
}));

/* ---------- Đơn và phiên bản ---------- */
function bamNoiDung(v, dong) { return sha256(JSON.stringify({ w: [v.window_start, v.window_end], t: v.terms_json, l: dong.map(d => [d.lot_id, d.product_id, d.qty_min_g, d.qty_max_g, d.unit_price_vnd_per_kg]) })); }
function kiemCuaSo(tu, den) {
  const ngay = (Date.parse(den) - Date.parse(tu)) / DAY;
  if (!(ngay >= 0)) throw loi('E05', 'Ngày giao chưa đúng.', 'window_end');
  if (ngay > THOI_HAN.don_toi_da_ngay) throw loi('E05', `Một đơn giao tối đa ${THOI_HAN.don_toi_da_ngay} ngày. Lập nhiều đơn dưới một hợp đồng khung.`, 'window_end');
}
function taoPhienBan(ctx, don, b, truoc = null) {
  kiemCuaSo(b.window_start, b.window_end);
  const so = (one('select max(version_no) n from order_versions where order_id = ?', don.id).n || 0) + 1;
  const dong = (b.lines || []).map(l => {
    const lo = l.lot_id ? one('select * from lots where id = ?', l.lot_id) : null;
    if (l.lot_id && !lo) throw khongThay('Lô');
    return { id: newId('ol_'), lot_id: l.lot_id || null, product_id: l.product_id || lo.product_id, qty_min_g: kg(l.qty_min_kg ?? l.qty_kg), qty_max_g: kg(l.qty_max_kg ?? l.qty_kg), unit_price_vnd_per_kg: Number(l.price) };
  });
  if (!dong.length) throw loi('E05', 'Đơn cần ít nhất một dòng hàng.', 'lines');
  const terms = JSON.stringify(b.terms || {});
  const v = { id: newId('ov_'), order_id: don.id, version_no: so, window_start: b.window_start, window_end: b.window_end, terms_json: terms, supersedes_id: truoc, created_by_org: ctx.org.id, created_at: nowIso() };
  v.hash = bamNoiDung(v, dong);
  insert('order_versions', v);
  for (const d of dong) insert('order_lines', { ...d, order_version_id: v.id });
  return v;
}
export function chiTietDon(don, ctx) {
  const ben = benTrongDon(ctx, don);
  const versions = all('select * from order_versions where order_id = ? order by version_no', don.id).map(v => ({
    ...v, terms: JSON.parse(v.terms_json), terms_json: undefined,
    dong: all('select l.*, p.name_vi san_pham from order_lines l join products p on p.id = l.product_id where order_version_id = ?', v.id),
    xac_nhan: all('select party, method, confirmed_at from order_confirmations where order_version_id = ?', v.id),
  }));
  const sev = one("select * from service_engagement_versions where order_id = ? and status not in ('vo_hieu','huy') order by version_no desc limit 1", don.id);
  const dichVu = sev ? {
    ...sev, pham_vi: one('select * from service_scopes where sev_id = ?', sev.id), phi: one('select * from fee_policy_snapshots where sev_id = ?', sev.id),
    dong_y: all('select party, max_share_vnd, at from service_consents where sev_id = ?', sev.id), moc: all('select * from service_milestones where sev_id = ?', sev.id),
  } : null;
  return {
    ...don, ben_cua_ban: ben,
    ten_mua: one('select name from organizations where id = ?', don.buyer_org).name, ten_ban: one('select name from organizations where id = ?', don.seller_org).name,
    cach_giao_dich: dichVu?.status === 'kich_hoat' || dichVu?.status === 'hoan_tat' ? 'co_ho_tro' : 'tu_giao_dich',
    phien_ban: versions, dich_vu: dichVu, phuong_an_bat_dong: one('select * from dispute_plans where order_id = ? order by rowid desc limit 1', don.id),
    giu_cho: all('select r.*, (select group_concat(party) from reservation_consents where reservation_id = r.id) dong_y from reservations r join order_versions v on v.id = r.order_version_id where v.order_id = ?', don.id),
    dot_giao: all('select * from deliveries where order_id = ? order by seq', don.id),
    tranh_chap: all('select * from disputes where order_id = ?', don.id),
  };
}
route('POST', '/api/orders', ctx => tx(() => {
  canQuyen(ctx, 'create');
  const b = ctx.body;
  const laMua = ctx.org.can_buy && b.as !== 'ban';
  const doiTac = one('select * from organizations where id = ?', b.counterpart_org);
  if (!doiTac) throw loi('E05', 'Chọn đối tác của đơn.', 'counterpart_org');
  const don = insert('orders', { id: newId('od_'), code: nextCode(b.framework_id || b.self_trade ? 'Đ-' : 'HĐ-', 'orders'), framework_id: b.framework_id || null, buyer_org: laMua ? ctx.org.id : doiTac.id, seller_org: laMua ? doiTac.id : ctx.org.id, status: 'cho_xac_nhan', created_at: nowIso() });
  taoPhienBan(ctx, don, b);
  notify(doiTac.id, `${ctx.org.name} gửi đơn ${don.code} để bạn xem và xác nhận.`);
  audit(ctx, 'orders', don.id, 'tao');
  return { __status: 201, item: chiTietDon(don, ctx) };
}));
route('GET', '/api/orders', ctx => ({
  items: all(`select o.*, b.name ten_mua, s.name ten_ban,
      (select status from service_engagement_versions where order_id = o.id and status not in ('vo_hieu','huy') order by version_no desc limit 1) dich_vu
    from orders o join organizations b on b.id = o.buyer_org join organizations s on s.id = o.seller_org
    where o.buyer_org = ? or o.seller_org = ? order by o.created_at desc`, ctx.org.id, ctx.org.id)
    .map(o => ({ ...o, cach_giao_dich: ['kich_hoat', 'hoan_tat'].includes(o.dich_vu) ? 'co_ho_tro' : 'tu_giao_dich' })),
}));
route('GET', '/api/orders/:id', ctx => ({ item: chiTietDon(layDon(ctx.params.id), ctx) }));

// Sửa trước/sau khi xác nhận: phiên bản mới; bản cũ giữ nguyên, xác nhận cũ không dùng lại (T06)
route('POST', '/api/orders/:id/versions', ctx => tx(() => {
  const don = layDon(ctx.params.id); benTrongDon(ctx, don);
  if (['huy', 'dong'].includes(don.status)) throw loi('E14', 'Đơn đã đóng hoặc hủy.');
  const truoc = one('select id from order_versions where order_id = ? order by version_no desc limit 1', don.id).id;
  const v = taoPhienBan(ctx, don, ctx.body, truoc);
  run("update signature_attempts set status = 'that_bai' where order_version_id = ? and status = 'cho'", truoc);
  notify(orgCuaBen(don, benKia(benTrongDon(ctx, don))), `Đơn ${don.code} có bản ${v.version_no} mới. Bản cũ không dùng để ký tiếp.`);
  audit(ctx, 'order_versions', v.id, 'tao_ban_moi');
  return { __status: 201, item: chiTietDon(don, ctx) };
}));

// Xác nhận/ký: đủ hai bên cùng bản → cam kết lượng nguyên tử (BR-16), tạo đợt giao, cọc
route('POST', '/api/order-versions/:id/confirm', ctx => tx(() => {
  const v = one('select * from order_versions where id = ?', ctx.params.id);
  if (!v) throw khongThay('Bản đơn');
  const don = layDon(v.order_id);
  const ben = benTrongDon(ctx, don);
  canQuyen(ctx, 'sign'); khongPhaiNguoiGiup(ctx, 'ký hoặc xác nhận đơn');
  if (one("select 1 from org_restrictions where org_id = ? and kind = 'ky_va_doi_tai_khoan' and (until_at is null or until_at > ?)", ctx.org.id, nowIso())) throw loi('E01', 'Tạm khóa ký sau báo mất quyền truy cập.');
  const moiNhat = one('select id from order_versions where order_id = ? order by version_no desc limit 1', don.id).id;
  if (moiNhat !== v.id) throw loi('E14', 'Đây không phải bản mới nhất. Mở bản mới để xem.');
  if (ctx.body.hash && ctx.body.hash !== v.hash) throw loi('E06', 'Nội dung khác bản bạn đang xem. Dừng ký.');
  const phuongThuc = ctx.body.method === 'doi_tac' ? 'doi_tac' : ctx.body.method === 'giay' ? 'giay' : 'app';
  if (phuongThuc === 'doi_tac') {
    const sev = one("select * from service_engagement_versions where order_id = ? and status = 'kich_hoat'", don.id);
    if (!sev || !one("select 1 from service_milestones where sev_id = ? and kind = 'ky_doi_tac' and status <> 'huy'", sev.id)) throw loi('E05', 'Ký qua đối tác là mốc dịch vụ có giá; cần bật dịch vụ và chọn mốc này.');
  }
  run('insert or ignore into order_confirmations (id, order_version_id, party, user_id, method, hash, confirmed_at) values (?,?,?,?,?,?,?)', newId('oc_'), v.id, ben, ctx.user.id, phuongThuc, v.hash, nowIso());
  const du = all('select party from order_confirmations where order_version_id = ?', v.id).length === 2;
  if (du && don.current_version_id !== v.id) {
    for (const d of all('select * from order_lines where order_version_id = ? and lot_id is not null', v.id)) {
      const r = one("select * from reservations where order_version_id = ? and lot_id = ? and status = 'dang_giu'", v.id, d.lot_id);
      if (r && r.expires_at > nowIso()) run("update reservations set status = 'da_cam_ket' where id = ?", r.id);
      else {
        if (r) run("update reservations set status = 'het_han' where id = ?", r.id);
        const cu = one("select qty_g from lot_commitments where lot_id = ? and order_id = ? and status = 'cam_ket'", d.lot_id, don.id)?.qty_g || 0;
        if (luongKhaDung(d.lot_id) + cu < d.qty_max_g) throw loi('E03', `Lô còn ${raKg(luongKhaDung(d.lot_id) + cu)} kg, không đủ ${raKg(d.qty_max_g)} kg. Gia hạn giữ chỗ hoặc tạo bản mới với lượng khả dụng.`);
      }
      run("insert into lot_commitments (id, lot_id, order_id, qty_g, status, created_at) values (?,?,?,?, 'cam_ket', ?) on conflict(lot_id, order_id) do update set qty_g = excluded.qty_g, status = 'cam_ket'", newId('lc_'), d.lot_id, don.id, d.qty_max_g, nowIso());
    }
    const laLanDau = !don.current_version_id;
    run("update orders set current_version_id = ?, status = case when status in ('nhap','cho_xac_nhan') then 'da_xac_nhan' else status end where id = ?", v.id, don.id);
    const terms = JSON.parse(v.terms_json);
    if (laLanDau) {
      const dot = terms.dot_giao?.length ? terms.dot_giao : [v.window_start];
      dot.forEach((ngay, i) => insert('deliveries', { id: newId('dl_'), order_id: don.id, seq: i + 1, planned_at: ngay, status: 'chua_giao' }));
      if (terms.coc_vnd > 0) insert('obligations', { id: newId('ob_'), order_id: don.id, kind: 'coc', payer_org: don.buyer_org, beneficiary_org: don.seller_org, amount_vnd: Number(terms.coc_vnd), due_at: terms.han_coc || addMs(nowIso(), 2 * DAY), label: 'Tiền cọc', created_at: nowIso() });
    }
    notify(orgCuaBen(don, benKia(ben)), `Đơn ${don.code} bản ${v.version_no} đã đủ hai bên xác nhận.`);
  }
  audit(ctx, 'order_versions', v.id, 'xac_nhan', { ben, phuongThuc });
  return { hoan_tat: du, nhan: phuongThuc === 'app' ? 'Xác nhận trên app: OTP và nhật ký thao tác, không phải chữ ký số' : null, item: chiTietDon(layDon(don.id), ctx) };
}));

/* ---------- Giữ chỗ: cần hai bên đồng ý (BR-16) ---------- */
route('POST', '/api/order-versions/:id/reservations', ctx => tx(() => {
  const v = one('select * from order_versions where id = ?', ctx.params.id);
  if (!v) throw khongThay('Bản đơn');
  const don = layDon(v.order_id); const ben = benTrongDon(ctx, don);
  const { lot_id, qty_kg, expires_at } = ctx.body;
  if (!expires_at || expires_at <= nowIso()) throw loi('E05', 'Cần hạn giữ trong tương lai.', 'expires_at');
  const r = insert('reservations', { id: newId('rv_'), order_version_id: v.id, lot_id, qty_g: kg(qty_kg), expires_at, status: 'cho_dong_y', created_at: nowIso() });
  insert('reservation_consents', { id: newId('rc_'), reservation_id: r.id, party: ben, user_id: ctx.user.id, at: nowIso() });
  notify(orgCuaBen(don, benKia(ben)), `Đề nghị giữ ${qty_kg} kg cho ${don.code} đến ${expires_at.slice(0, 16).replace('T', ' ')}. Cần bạn đồng ý.`);
  return { __status: 201, item: r };
}));
route('POST', '/api/reservations/:id/consent', ctx => tx(() => {
  const r = one('select r.*, v.order_id from reservations r join order_versions v on v.id = r.order_version_id where r.id = ?', ctx.params.id);
  if (!r) throw khongThay('Giữ chỗ');
  const don = layDon(r.order_id); const ben = benTrongDon(ctx, don);
  run('insert or ignore into reservation_consents (id, reservation_id, party, user_id, at) values (?,?,?,?,?)', newId('rc_'), r.id, ben, ctx.user.id, nowIso());
  if (all('select 1 from reservation_consents where reservation_id = ?', r.id).length === 2 && r.status === 'cho_dong_y') {
    if (r.expires_at <= nowIso()) { run("update reservations set status = 'het_han' where id = ?", r.id); throw loi('E05', 'Giữ chỗ đã quá hạn trước khi đủ hai bên đồng ý.'); }
    if (luongKhaDung(r.lot_id) < r.qty_g) throw loi('E03', `Lô chỉ còn ${raKg(luongKhaDung(r.lot_id))} kg khả dụng.`);   // kiểm nguyên tử trong giao dịch (T05)
    run("update reservations set status = 'dang_giu' where id = ?", r.id);
  }
  return { item: one('select * from reservations where id = ?', r.id) };
}));

/* ---------- Dịch vụ hỗ trợ theo đơn ---------- */
const TRUONG_PHAM_VI = ['parties', 'product_group', 'max_qty_kg', 'window_start', 'window_end', 'included_work', 'service_period_end'];
function giaTriDuKien(don) {
  const v = one('select id from order_versions where order_id = ? order by version_no desc limit 1', don.id);
  return all('select qty_max_g, unit_price_vnd_per_kg from order_lines where order_version_id = ?', v.id).reduce((s, d) => s + tienHang(d.qty_max_g, d.unit_price_vnd_per_kg), 0);
}
function biHanChePhi(orgId) { return !!one("select 1 from org_restrictions where org_id = ? and kind = 'service_activation' and (until_at is null or until_at > ?)", orgId, nowIso()); }
function tinhToiDa(don, snap) {
  const moc = all("select coalesce(sum(price_vnd),0) n from service_milestones where sev_id = ? and status <> 'huy'", snap.sev_id)[0].n;
  return toiDaMoiBen({ gia_tri_du_kien_vnd: giaTriDuKien(don), rate_bps: snap.rate_bps, cap_vnd: snap.cap_vnd, activation_fee_vnd: snap.activation_fee_vnd, moc_vnd: moc, payer_mua_bps: snap.payer_mua_bps, tax_bps: snap.tax_bps });
}
route('POST', '/api/orders/:id/services', ctx => tx(() => {
  const don = layDon(ctx.params.id); const ben = benTrongDon(ctx, don);
  const b = ctx.body; const pv = b.scope || {};
  const thieu = TRUONG_PHAM_VI.filter(k => pv[k] === undefined || pv[k] === '' || pv[k] === null);
  if (thieu.length) throw loi('E05', 'Phạm vi hỗ trợ còn thiếu: ' + thieu.join(', ') + '. Thiếu thì chưa bật được dịch vụ.', thieu[0]);
  kiemCuaSo(pv.window_start, pv.window_end);
  const pa = b.dispute_plan === 'mau' || !b.dispute_plan ? MAU_CHUA_CHOT.phuong_an_bat_dong : b.dispute_plan;
  if (!pa.confirm_hours || !pa.lab_name || !pa.next_mechanism) throw loi('E05', 'Chưa có phương án khi không thống nhất. Chấp nhận phương án mẫu hoặc điền đủ.', 'dispute_plan');
  const payerMua = b.payer === 'ban' ? 0 : b.payer === 'chia' ? 5000 : Number.isInteger(b.payer_mua_bps) ? b.payer_mua_bps : 10000;
  // Bên sẽ phải trả mà đang có phí quá hạn → E16
  if ((payerMua > 0 && biHanChePhi(don.buyer_org)) || (payerMua < 10000 && biHanChePhi(don.seller_org)) || biHanChePhi(ctx.org.id)) throw loi('E16');
  run("update service_engagement_versions set status = 'vo_hieu' where order_id = ? and status = 'de_nghi'", don.id);
  const so = (one('select max(version_no) n from service_engagement_versions where order_id = ?', don.id).n || 0) + 1;
  const sev = insert('service_engagement_versions', { id: newId('sv_'), order_id: don.id, version_no: so, proposed_by: ben, status: 'de_nghi', created_at: nowIso() });
  insert('service_scopes', { id: newId('sc_'), sev_id: sev.id, parties: pv.parties, product_group: pv.product_group, max_qty_g: kg(pv.max_qty_kg), window_start: pv.window_start, window_end: pv.window_end, included_work: pv.included_work, service_period_end: pv.service_period_end, quote_valid_until: pv.quote_valid_until || addMs(nowIso(), THOI_HAN.bao_gia_dich_vu) });
  insert('dispute_plans', { id: newId('dp_'), order_id: don.id, sev_id: sev.id, confirm_hours: pa.confirm_hours, lab_name: pa.lab_name, mediation_days: pa.mediation_days ?? 5, next_mechanism: pa.next_mechanism, [ben === 'mua' ? 'accepted_mua_at' : 'accepted_ban_at']: nowIso() });
  const goi = goiCua(don.buyer_org);
  const snap = insert('fee_policy_snapshots', { id: newId('fs_'), sev_id: sev.id, buyer_plan: goi, rate_bps: BIEU_PHI[goi].rate_bps, cap_vnd: BIEU_PHI[goi].cap_vnd, activation_fee_vnd: MAU_CHUA_CHOT.phi_kich_hoat_vnd, tax_bps: MAU_CHUA_CHOT.thue_phi_bps, payer_mua_bps: payerMua, payer_ban_bps: 10000 - payerMua });
  for (const m of b.milestones || []) insert('service_milestones', { id: newId('ms_'), sev_id: sev.id, kind: m, price_vnd: MAU_CHUA_CHOT.gia_moc[m], status: 'cho' });
  notify(orgCuaBen(don, benKia(ben)), `Đề nghị dịch vụ hỗ trợ cho ${don.code}. Bạn xem phần mình trả trước khi đồng ý; không đồng ý vẫn tự giao dịch được.`);
  audit(ctx, 'service_engagement_versions', sev.id, 'de_nghi', { payerMua });
  return { __status: 201, item: sev, toi_da: tinhToiDa(don, snap), chua_chot: ['phi_kich_hoat', 'gia_moc', 'thue_phi', 'phuong_an_bat_dong'] };
}));
route('GET', '/api/services/:id/quote', ctx => {
  const sev = one('select * from service_engagement_versions where id = ?', ctx.params.id); if (!sev) throw khongThay('Dịch vụ');
  const don = layDon(sev.order_id); const ben = benTrongDon(ctx, don);
  const snap = one('select * from fee_policy_snapshots where sev_id = ?', sev.id);
  const t = tinhToiDa(don, snap);
  return { phan_ban_tra_toi_da_vnd: t[ben], tong_vnd: t.tong, chi_tiet: { phi_kich_hoat_vnd: snap.activation_fee_vnd, ty_le_bps: snap.rate_bps, tran_vnd: snap.cap_vnd, moc: all('select kind, price_vnd from service_milestones where sev_id = ?', sev.id), thue_bps: snap.tax_bps }, chua_chot: true };
});
route('POST', '/api/services/:id/consent', ctx => {
  // Đổi gói trước khi đủ hai xác nhận → vô hiệu đề nghị (ghi lại dù lệnh này báo lỗi), không mang xác nhận cũ (T15)
  const s0 = one("select s.*, f.buyer_plan, o.buyer_org from service_engagement_versions s join fee_policy_snapshots f on f.sev_id = s.id join orders o on o.id = s.order_id where s.id = ? and s.status = 'de_nghi'", ctx.params.id);
  if (s0 && goiCua(s0.buyer_org) !== s0.buyer_plan) {
    tx(() => run("update service_engagement_versions set status = 'vo_hieu' where id = ?", s0.id));
    throw loi('E05', 'Gói bên mua vừa đổi nên biểu phí khác. Tạo đề nghị mới để hai bên xem lại.');
  }
  return dongYDichVu(ctx);
});
const dongYDichVu = ctx => tx(() => {
  const sev = one('select * from service_engagement_versions where id = ?', ctx.params.id); if (!sev) throw khongThay('Dịch vụ');
  const don = layDon(sev.order_id); const ben = benTrongDon(ctx, don);
  canQuyen(ctx, 'approve', 'sign');
  if (sev.status !== 'de_nghi') throw loi('E05', 'Đề nghị này không còn hiệu lực.');
  const pv = one('select * from service_scopes where sev_id = ?', sev.id);
  if (pv.quote_valid_until < nowIso()) throw loi('E05', 'Báo giá dịch vụ đã hết hạn chấp nhận. Tạo đề nghị mới.');
  const snap = one('select * from fee_policy_snapshots where sev_id = ?', sev.id);
  // Đổi gói trước khi đủ hai xác nhận → báo giá lại, không mang xác nhận cũ (T15)
  if (goiCua(don.buyer_org) !== snap.buyer_plan) { run("update service_engagement_versions set status = 'vo_hieu' where id = ?", sev.id); throw loi('E05', 'Gói bên mua vừa đổi nên biểu phí khác. Tạo đề nghị mới để hai bên xem lại.'); }
  const toiDa = tinhToiDa(don, snap)[ben];
  if (ctx.body.max_share_vnd !== undefined && Number(ctx.body.max_share_vnd) !== toiDa) throw loi('E05', `Con số bạn thấy (${ctx.body.max_share_vnd}) khác số hiện tại (${toiDa}). Tải lại để xem.`);
  if (toiDa > 0 && biHanChePhi(ctx.org.id)) throw loi('E16');
  run('insert or ignore into service_consents (id, sev_id, party, user_id, max_share_vnd, at) values (?,?,?,?,?,?)', newId('cs_'), sev.id, ben, ctx.user.id, toiDa, nowIso());
  run(`update dispute_plans set ${ben === 'mua' ? 'accepted_mua_at' : 'accepted_ban_at'} = coalesce(${ben === 'mua' ? 'accepted_mua_at' : 'accepted_ban_at'}, ?) where sev_id = ?`, nowIso(), sev.id);
  const du = all('select 1 from service_consents where sev_id = ?', sev.id).length === 2;
  if (du) {
    run("update service_engagement_versions set status = 'kich_hoat', activated_at = ? where id = ?", nowIso(), sev.id);
    // Phí kích hoạt: bên đề nghị trả, khấu trừ vào phí thành công sau
    phatHanhHoaDon({ payer_org: orgCuaBen(don, sev.proposed_by), order_id: don.id, kind: 'phi_kich_hoat', amount_vnd: snap.activation_fee_vnd, tax_bps: snap.tax_bps });
    run("insert or ignore into eligibility_records (id, order_id, eligible, offered) values (?,?,1,1)", newId('el_'), don.id);
    notify(don.buyer_org, `Dịch vụ hỗ trợ cho ${don.code} đã bật.`); notify(don.seller_org, `Dịch vụ hỗ trợ cho ${don.code} đã bật.`);
  }
  audit(ctx, 'service_engagement_versions', sev.id, 'dong_y', { ben, toiDa });
  return { kich_hoat: du, phan_ban_tra_toi_da_vnd: toiDa };
});
// Mốc dịch vụ đã thực hiện → hóa đơn theo phần chia (ví dụ ký qua đối tác)
route('POST', '/api/services/:id/milestones/:mid/done', ctx => tx(() => {
  const m = one("select m.*, s.order_id from service_milestones m join service_engagement_versions s on s.id = m.sev_id where m.id = ? and s.id = ? and s.status = 'kich_hoat'", ctx.params.mid, ctx.params.id);
  if (!m) throw khongThay('Mốc');
  if (m.status === 'da_lam') return { item: m };
  run("update service_milestones set status = 'da_lam', performed_at = ? where id = ?", nowIso(), m.id);
  const don = layDon(m.order_id); const snap = one('select * from fee_policy_snapshots where sev_id = ?', m.sev_id);
  const phanMua = Math.floor((m.price_vnd * snap.payer_mua_bps + 5000) / 10000);
  if (phanMua) phatHanhHoaDon({ payer_org: don.buyer_org, order_id: don.id, kind: 'phi_moc', amount_vnd: phanMua, tax_bps: snap.tax_bps });
  if (m.price_vnd - phanMua) phatHanhHoaDon({ payer_org: don.seller_org, order_id: don.id, kind: 'phi_moc', amount_vnd: m.price_vnd - phanMua, tax_bps: snap.tax_bps });
  return { item: one('select * from service_milestones where id = ?', m.id) };
}));

/* ---------- Hủy đơn (mục 15) ---------- */
route('POST', '/api/orders/:id/cancel', ctx => tx(() => {
  const don = layDon(ctx.params.id); benTrongDon(ctx, don);
  if (['huy', 'dong'].includes(don.status)) return { item: don };
  const daNhan = one('select count(*) n from accepted_lines a join deliveries d on d.id = a.delivery_id where d.order_id = ?', don.id).n;
  if (daNhan) throw loi('E14', 'Đơn đã giao một phần: giữ phần đã nhận, tạo yêu cầu thay đổi cho phần còn lại.');
  run("update orders set status = 'huy' where id = ?", don.id);
  run("update lot_commitments set status = 'giai_phong' where order_id = ?", don.id);
  run("update reservations set status = 'giai_phong' where status in ('cho_dong_y','dang_giu') and order_version_id in (select id from order_versions where order_id = ?)", don.id);
  run("update service_milestones set status = 'huy' where status = 'cho' and sev_id in (select id from service_engagement_versions where order_id = ?)", don.id);
  run("update service_engagement_versions set status = 'huy' where order_id = ? and status in ('de_nghi','kich_hoat')", don.id);
  // AgiViet không bố trí được người → hoàn phí kích hoạt; lý do khác thì giữ (BR-41)
  if (ctx.body.ly_do === 'khong_bo_tri') run("update fee_invoices set status = 'huy' where order_id = ? and kind = 'phi_kich_hoat' and status = 'phat_hanh'", don.id);
  notify(orgCuaBen(don, benKia(benTrongDon(ctx, don))), `Đơn ${don.code} đã hủy khi chưa có hàng được nhận: không có phí thành công.`);
  audit(ctx, 'orders', don.id, 'huy', { ly_do: ctx.body.ly_do });
  return { item: layDon(don.id), phi_thanh_cong: 0 };
}));
