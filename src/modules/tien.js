// Nghĩa vụ, hướng dẫn thanh toán, khai báo/xác nhận tiền (BR-22), phí thành công lũy kế (v4 mục 8), hóa đơn phí (BR-45), gói.
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, loi, khongThay, audit, notify, nextCode, periodOf, DAY } from '../lib/core.js';
import { THOI_HAN, THUE_BAO_BUSINESS_VND, khoanThuThem, phanVan } from '../lib/rules.js';
import { canQuyen, khongPhaiNguoiGiup, goiCua } from '../lib/chung.js';
import { taiKhoanDangDung } from './dinh-danh.js';

export const ORG_AGIVIET = 'org_agiviet';

/* ---------- Hóa đơn phí dịch vụ ---------- */
export function phatHanhHoaDon({ payer_org, order_id = null, kind, amount_vnd, tax_bps = 0 }) {
  if (!(amount_vnd > 0)) return null;
  const hd = insert('fee_invoices', { id: newId('fi_'), code: nextCode('PDV-', 'fee_invoices'), payer_org, order_id, kind, amount_vnd, tax_vnd: phanVan(amount_vnd, tax_bps), issued_at: nowIso(), due_at: addMs(nowIso(), THOI_HAN.han_tra_phi), status: 'phat_hanh' });
  insert('obligations', { id: newId('ob_'), fee_invoice_id: hd.id, kind: 'phi', payer_org, beneficiary_org: ORG_AGIVIET, amount_vnd: amount_vnd + hd.tax_vnd, due_at: hd.due_at, label: `Hóa đơn ${hd.code}`, created_at: nowIso() });
  notify(payer_org, `Hóa đơn phí ${hd.code}: ${(amount_vnd + hd.tax_vnd).toLocaleString('vi-VN')} đ, hạn ${hd.due_at.slice(0, 10)}. Tách riêng khỏi tiền hàng.`);
  return hd;
}

// Phí thành công lũy kế trên AcceptedLine đã chốt; phần tranh chấp không tính (BR-41)
export function danhGiaPhi(orderId) {
  const sev = one("select * from service_engagement_versions where order_id = ? and status in ('kich_hoat','hoan_tat','ket_thuc_chuyen_co_che') order by version_no desc limit 1", orderId);
  if (!sev) return null;                                                      // tự giao dịch: không phí phần trăm
  const snap = one('select * from fee_policy_snapshots where sev_id = ?', sev.id);
  const don = one('select * from orders where id = ?', orderId);
  const coSo = one('select coalesce(sum(a.value_vnd),0) n from accepted_lines a join deliveries d on d.id = a.delivery_id where d.order_id = ?', orderId).n;
  const kichHoat = one("select coalesce(sum(amount_vnd),0) n from fee_invoices where order_id = ? and kind = 'phi_kich_hoat' and status <> 'huy'", orderId).n;
  const daQT = one("select coalesce(sum(amount_vnd),0) n from fee_invoices where order_id = ? and kind = 'phi_thanh_cong' and status <> 'huy'", orderId).n;
  const { muc_tieu, them } = khoanThuThem({ coSo_vnd: coSo, rate_bps: snap.rate_bps, cap_vnd: snap.cap_vnd, kichHoatDaTra_vnd: kichHoat, daQuyetToan_vnd: daQT });
  insert('fee_assessments', { id: newId('fa_'), order_id: orderId, snapshot_id: snap.id, basis_vnd: coSo, target_fee_vnd: muc_tieu, activation_credit_vnd: kichHoat, settled_before_vnd: daQT, delta_vnd: them, created_at: nowIso() });
  if (them > 0) {
    const phanMua = phanVan(them, snap.payer_mua_bps);
    phatHanhHoaDon({ payer_org: don.buyer_org, order_id: orderId, kind: 'phi_thanh_cong', amount_vnd: phanMua, tax_bps: snap.tax_bps });
    phatHanhHoaDon({ payer_org: don.seller_org, order_id: orderId, kind: 'phi_thanh_cong', amount_vnd: them - phanMua, tax_bps: snap.tax_bps });
  }
  return { co_so_vnd: coSo, muc_tieu_vnd: muc_tieu, thu_them_vnd: them };
}

/* ---------- Nghĩa vụ và trạng thái tách riêng ---------- */
export function moTaNghiaVu(o) {
  const phanBo = all(`select a.amount_vnd, p.id payment_id, p.created_at, p.method, p.reference,
      (select kind from receipt_confirmations r where r.payment_id = p.id order by at desc limit 1) xac_nhan,
      (select amount_vnd from receipt_confirmations r where r.payment_id = p.id order by at desc limit 1) xac_nhan_so
    from payment_allocations a join payments p on p.id = a.payment_id where a.obligation_id = ?`, o.id);
  const baoDaTra = phanBo.reduce((s, a) => s + a.amount_vnd, 0);
  const daXacNhan = phanBo.reduce((s, a) => s + (a.xac_nhan === 'du' ? a.amount_vnd : a.xac_nhan === 'mot_phan' ? Math.min(a.amount_vnd, a.xac_nhan_so) : 0), 0);
  const trangThai = daXacNhan >= o.amount_vnd ? 'da_xac_nhan' : baoDaTra > 0 ? (phanBo.some(a => a.xac_nhan === 'chua_thay' || a.xac_nhan === 'mot_phan') ? 'dang_doi_soat' : 'cho_doi_chieu') : 'phai_tra';
  return { ...o, bao_da_tra_vnd: baoDaTra, da_xac_nhan_vnd: daXacNhan, con_lai_vnd: o.amount_vnd - daXacNhan, trang_thai: trangThai, khoan_tra: phanBo };
}
route('GET', '/api/money', ctx => {
  const org = ctx.org.id;
  const ds = all(`select o.*, d.code don from obligations o left join orders d on d.id = o.order_id where (o.payer_org = ? or o.beneficiary_org = ?) order by o.created_at desc`, org, org).map(moTaNghiaVu);
  return {
    phai_tra: ds.filter(o => o.payer_org === org), phai_nhan: ds.filter(o => o.beneficiary_org === org),
    hoa_don_phi: all('select *, (amount_vnd + tax_vnd) tong_vnd from fee_invoices where payer_org = ? order by issued_at desc', org),
    ghi_chu: 'App không giữ tiền hàng. Hóa đơn phí tách khỏi tiền hàng và cọc.',
  };
});

// Hướng dẫn chuyển tiền: chụp tài khoản đang dùng lúc phát; không tự đổi (BR-08)
route('POST', '/api/obligations/:id/instruction', ctx => tx(() => {
  const o = one('select * from obligations where id = ? and payer_org = ?', ctx.params.id, ctx.org.id);
  if (!o) throw khongThay('Khoản phải trả');
  if (o.beneficiary_org === ORG_AGIVIET) return { tai_khoan: { bank: 'Tài khoản AgiViet (demo)', number_masked: '•••• 0000' }, demo: true };
  const tk = taiKhoanDangDung(o.beneficiary_org);
  if (!tk) throw loi('E15', 'Người bán chưa có tài khoản nhận tiền đã xác minh.');
  let hd = one('select * from payment_instructions where obligation_id = ? and payout_account_id = ?', o.id, tk.id);
  if (!hd) hd = insert('payment_instructions', { id: newId('pn_'), obligation_id: o.id, payout_account_id: tk.id, issued_at: nowIso() });
  run('update payment_instructions set seen_by_payer_at = coalesce(seen_by_payer_at, ?) where id = ?', nowIso(), hd.id);
  const doiGan = tk.activated_at && Date.parse(nowIso()) - Date.parse(tk.activated_at) < THOI_HAN.canh_bao_tai_khoan_moi;
  const coCu = one('select 1 from payment_instructions where obligation_id = ? and payout_account_id <> ?', o.id, tk.id);
  return {
    tai_khoan: { bank: tk.bank, number_masked: tk.number_masked, holder_name: tk.holder_name },
    canh_bao: doiGan ? `Tài khoản nhận tiền đổi ngày ${tk.activated_at.slice(0, 10)}. Gọi hỏi lại người bán qua số đã biết trước khi chuyển.` : null,
    huong_dan_cu_da_thay: !!coCu,
    gioi_han: 'Chỉ chuyển theo tài khoản đang hiện ở đây. App không chặn được tiền chuyển theo hướng dẫn ngoài app.',
  };
}));

// Bên mua báo đã trả; một lần trả phân bổ vào nhiều nghĩa vụ, tổng không vượt số thực trả
route('POST', '/api/payments/report', ctx => tx(() => {
  canQuyen(ctx, 'reconcile', 'approve');
  const { amount_vnd, method = 'chuyen_khoan', reference = null, allocations = [], has_receipt_image = false } = ctx.body;
  const tong = Number(amount_vnd);
  if (!(tong > 0)) throw loi('E08', 'Nhập số tiền đã trả.', 'amount_vnd');
  if (!allocations.length) throw loi('E08', 'Chọn khoản được trả.', 'allocations');
  const tongPB = allocations.reduce((s, a) => s + Number(a.amount_vnd), 0);
  if (tongPB > tong) throw loi('E08', 'Tổng phân bổ vượt số tiền đã trả.');
  const nguoiNhan = new Set();
  for (const a of allocations) {
    const o = one('select * from obligations where id = ? and payer_org = ?', a.obligation_id, ctx.org.id);
    if (!o) throw khongThay('Khoản phải trả');
    const chuaBao = o.amount_vnd - moTaNghiaVu(o).bao_da_tra_vnd;
    if (chuaBao < Number(a.amount_vnd)) throw loi('E08', `Khoản ${o.label || o.kind} chỉ còn ${chuaBao} đ chưa báo trả.`);
    nguoiNhan.add(o.beneficiary_org);
  }
  if (nguoiNhan.size !== 1) throw loi('E08', 'Một lần trả chỉ cho một người nhận.');
  const [payee] = nguoiNhan;
  const p = insert('payments', { id: newId('pm_'), payer_org: ctx.org.id, payee_org: payee, method, mode: payee === ORG_AGIVIET ? 'demo' : 'truc_tiep', amount_vnd: tong, reference, created_at: nowIso() });
  insert('payment_reports', { id: newId('prp_'), payment_id: p.id, reported_by: ctx.user.id, has_receipt_image: has_receipt_image ? 1 : 0, at: nowIso() });
  for (const a of allocations) insert('payment_allocations', { id: newId('pal_'), payment_id: p.id, obligation_id: a.obligation_id, amount_vnd: Number(a.amount_vnd) });
  if (payee === ORG_AGIVIET) {             // phí trả cho AgiViet: demo tự xác nhận, đóng hóa đơn
    insert('receipt_confirmations', { id: newId('rcf_'), payment_id: p.id, confirmed_by: ctx.user.id, kind: 'du', amount_vnd: tong, at: nowIso() });
    for (const a of allocations) { const o = one('select * from obligations where id = ?', a.obligation_id); if (o.fee_invoice_id && moTaNghiaVu(o).con_lai_vnd <= 0) run("update fee_invoices set status = 'da_tra' where id = ?", o.fee_invoice_id); }
    goHanCheNeuHet(ctx.org.id);
  } else notify(payee, `${ctx.org.name} báo đã trả ${tong.toLocaleString('vi-VN')} đ. Xem tài khoản rồi xác nhận.`, '/ban/tien.html#tien');
  audit(ctx, 'payments', p.id, 'bao_da_tra', { tong });
  return { __status: 201, item: p, trang_thai: 'Bên mua báo đã trả', ghi_chu: 'Ảnh biên lai không tự là bằng chứng tiền đã về.' };
}));
// Người bán xác nhận: đủ / một phần (nhập số) / chưa thấy tiền. Không xóa; bấm nhầm → báo sai
route('POST', '/api/payments/:id/receipt', ctx => tx(() => {
  const p = one('select * from payments where id = ? and payee_org = ?', ctx.params.id, ctx.org.id);
  if (!p) throw khongThay('Khoản tiền');
  canQuyen(ctx, 'receive', 'reconcile'); khongPhaiNguoiGiup(ctx, 'xác nhận tiền');
  const kind = ['du', 'mot_phan', 'chua_thay'].includes(ctx.body.kind) ? ctx.body.kind : null;
  if (!kind) throw loi('E08', 'Chọn: đã nhận đủ, nhận một phần hoặc chưa thấy tiền.');
  const so = kind === 'du' ? p.amount_vnd : kind === 'chua_thay' ? 0 : Number(ctx.body.amount_vnd);
  if (kind === 'mot_phan' && !(so > 0 && so < p.amount_vnd)) throw loi('E08', 'Nhập số tiền đã về, nhỏ hơn số bên mua báo.', 'amount_vnd');
  insert('receipt_confirmations', { id: newId('rcf_'), payment_id: p.id, confirmed_by: ctx.user.id, kind, amount_vnd: so, at: nowIso() });
  let ticket = null;
  if (kind !== 'du') {
    ticket = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: `Khoản ${p.id}`, priority: 'P2', category: 'tien', description: kind === 'chua_thay' ? 'Người bán chưa thấy tiền' : `Nhận một phần ${so} / ${p.amount_vnd}`, status: 'moi', created_at: nowIso() }).code;
    notify(p.payer_org, kind === 'chua_thay' ? 'Người bán báo chưa thấy tiền. Đã mở đối soát, chưa ai bị kết luận sai.' : `Người bán nhận ${so.toLocaleString('vi-VN')} đ, thiếu ${(p.amount_vnd - so).toLocaleString('vi-VN')} đ. Đã mở đối soát.`);
  }
  audit(ctx, 'payments', p.id, 'xac_nhan_nhan', { kind, so });
  // Đơn chờ quyết toán: mọi khoản tiền hàng đã xác nhận đủ, không còn tranh chấp mở → đóng
  for (const a of all('select distinct o.order_id from payment_allocations a join obligations o on o.id = a.obligation_id where a.payment_id = ? and o.order_id is not null', p.id)) {
    const don = one('select * from orders where id = ?', a.order_id);
    const conNo = all("select * from obligations where order_id = ? and kind = 'tien_hang'", don.id).map(moTaNghiaVu).some(o => o.con_lai_vnd > 0);
    const conTC = one("select count(*) n from disputes where order_id = ? and status = 'mo'", don.id).n;
    if (don.status === 'cho_quyet_toan' && !conNo && !conTC) run("update orders set status = 'dong' where id = ?", don.id);
  }
  return { item: { kind, amount_vnd: so }, doi_soat: ticket };
}));
route('POST', '/api/payments/:id/correction', ctx => tx(() => {
  const p = one('select * from payments where id = ? and (payee_org = ? or payer_org = ?)', ctx.params.id, ctx.org.id, ctx.org.id);
  if (!p) throw khongThay('Khoản tiền');
  if (!ctx.body.reason) throw loi('E08', 'Nhập lý do báo sai.', 'reason');
  const c = insert('correction_cases', { id: newId('cc_'), entity: 'payments', entity_id: p.id, reason: ctx.body.reason, opened_by: ctx.user.id, status: 'mo', at: nowIso() });
  notify(p.payer_org === ctx.org.id ? p.payee_org : p.payer_org, 'Có báo sai xác nhận tiền. Sự kiện cũ vẫn giữ, đã mở đối soát.');
  return { item: c, ghi_chu: 'Không xóa sự kiện gốc ở bất kỳ thời điểm nào; không tự đảo giao dịch ngân hàng.' };
}));

/* ---------- Quá hạn phí → tạm dừng bật dịch vụ mới (BR-45) ---------- */
function goHanCheNeuHet(orgId) {
  const conQuaHan = one("select count(*) n from fee_invoices where payer_org = ? and status = 'phat_hanh' and due_at <= ?", orgId, addMs(nowIso(), -THOI_HAN.qua_han_phi_chan)).n;
  if (!conQuaHan) run("update org_restrictions set until_at = ? where org_id = ? and kind = 'service_activation' and until_at is null", nowIso(), orgId);
}
export function xuLyPhiQuaHan() {
  const moc = addMs(nowIso(), -THOI_HAN.qua_han_phi_chan);
  const ds = all("select distinct payer_org from fee_invoices where status = 'phat_hanh' and due_at <= ?", moc);
  for (const r of ds) if (!one("select 1 from org_restrictions where org_id = ? and kind = 'service_activation' and until_at is null", r.payer_org)) {
    insert('org_restrictions', { id: newId('rs_'), org_id: r.payer_org, kind: 'service_activation', reason: 'Hóa đơn phí quá hạn 15 ngày', from_at: nowIso() });
    notify(r.payer_org, 'Phí dịch vụ quá hạn: tạm chưa bật được hỗ trợ cho đơn mới (E16). Đơn đang chạy, nhận tiền, tải hồ sơ vẫn bình thường.');
  }
  return ds.length;
}
route('POST', '/api/fee-invoices/:id/dispute', ctx => tx(() => {
  const hd = one('select * from fee_invoices where id = ? and payer_org = ?', ctx.params.id, ctx.org.id);
  if (!hd) throw khongThay('Hóa đơn');
  run("update fee_invoices set status = 'khieu_nai' where id = ?", hd.id);
  const t = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: hd.code, priority: 'P3', category: 'hoa_don_phi', description: ctx.body.note || 'Khiếu nại hóa đơn phí', status: 'moi', created_at: nowIso() });
  return { ticket: t.code, ghi_chu: 'Phần đang khiếu nại tạm ngưng nhắc.' };
}));

/* ---------- Gói Business: kỳ theo tháng dương lịch, tháng đầu theo ngày ---------- */
route('POST', '/api/subscription/upgrade', ctx => tx(() => {
  if (!ctx.org.can_buy) throw loi('E01', 'Gói chỉ áp dụng cho vai trò mua.');
  canQuyen(ctx, 'administer');
  if (goiCua(ctx.org.id) === 'business') return { goi: 'business' };
  const ky = periodOf(); const [y, m] = ky.split('-').map(Number);
  const dau = new Date(Date.UTC(y, m - 1, 1) - 7 * 3600e3).toISOString(), cuoi = new Date(Date.UTC(y, m, 1) - 7 * 3600e3).toISOString();
  const soNgay = Math.round((Date.parse(cuoi) - Date.parse(dau)) / DAY);
  const con = Math.ceil((Date.parse(cuoi) - Date.parse(nowIso())) / DAY);
  const tien = Math.round(THUE_BAO_BUSINESS_VND * con / soNgay);
  insert('subscriptions', { id: newId('sb_'), org_id: ctx.org.id, plan: 'business', period_start: nowIso(), period_end: cuoi, prorated_amount_vnd: tien, status: 'dang_dung' });
  phatHanhHoaDon({ payer_org: ctx.org.id, kind: 'thue_bao', amount_vnd: tien, tax_bps: 1000 });
  audit(ctx, 'subscriptions', ctx.org.id, 'nang_business', { tien, con, soNgay });
  return { goi: 'business', thang_dau_vnd: tien, so_ngay_con: con, ghi_chu: 'Trần tháng này = trần Business trừ số lượt đã dùng và đang tạm giữ; không cấp lại toàn bộ.' };
}));
route('POST', '/api/subscription/end', ctx => tx(() => {
  canQuyen(ctx, 'administer');
  run("update subscriptions set status = 'het_han', period_end = ? where org_id = ? and status in ('dang_dung','huy_gia_han')", nowIso(), ctx.org.id);
  return { goi: 'free', ghi_chu: 'Về hạn mức Miễn phí ngay: lượt còn = 5 trừ số đã dùng trong tháng. Dịch vụ đã chốt giữ phí trong phạm vi.' };
}));
