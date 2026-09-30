// Giao nhận, nghiệm thu có phiên bản (BR-18), nhãn nguồn (BR-42), bất đồng và trạng thái chuyển cơ chế (BR-44).
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, sha256, loi, khongThay, audit, notify, nextCode, HOUR, DAY } from '../lib/core.js';
import { tienHang } from '../lib/rules.js';
import { benTrongDon, benKia, orgCuaBen, layDon, kg, raKg } from '../lib/chung.js';
import { danhGiaPhi } from './tien.js';

function layDot(id) {
  const d = one('select * from deliveries where id = ?', id);
  if (!d) throw khongThay('Đợt giao');
  return { dot: d, don: layDon(d.order_id) };
}
function dongDon(don) {
  return one('select * from order_lines where order_version_id = ? order by rowid limit 1', don.current_version_id);
}
function ghiNhanHang(don, dot, kq, qty_g, resolution_ref) {
  if (qty_g <= 0) return null;
  const dong = dongDon(don);
  const gia = dong.unit_price_vnd_per_kg + (kq.price_adjust_vnd_per_kg || 0);
  const a = insert('accepted_lines', { id: newId('al_'), order_line_id: dong.id, delivery_id: dot.id, result_version_id: kq.id, qty_g, unit_price_vnd_per_kg: gia, value_vnd: tienHang(qty_g, gia), resolution_ref, created_at: nowIso() });
  const terms = JSON.parse(one('select terms_json from order_versions where id = ?', don.current_version_id).terms_json);
  insert('obligations', { id: newId('ob_'), order_id: don.id, kind: 'tien_hang', payer_org: don.buyer_org, beneficiary_org: don.seller_org, amount_vnd: a.value_vnd, due_at: addMs(nowIso(), (terms.han_tra_ngay ?? 0) * DAY + 12 * HOUR), label: `Tiền hàng đợt ${dot.seq}${resolution_ref.startsWith('TC-') ? ' (sau giải quyết)' : ''}`, created_at: nowIso() });
  return a;
}
function capNhatTrangThaiDon(don) {
  const conLai = one("select count(*) n from deliveries where order_id = ? and status <> 'da_giao'", don.id).n;
  run("update orders set status = ? where id = ? and status in ('da_xac_nhan','giao_tung_phan')", conLai ? 'giao_tung_phan' : 'cho_quyet_toan', don.id);
}

// Nhập kết quả: bên nhập là "tự khai"; phiên bản mới thay bản chưa chốt, xác nhận cũ không dùng lại
route('POST', '/api/deliveries/:id/results', ctx => tx(() => {
  const { dot, don } = layDot(ctx.params.id);
  const ben = benTrongDon(ctx, don);
  if (!['da_xac_nhan', 'giao_tung_phan'].includes(don.status)) throw loi('E05', 'Đơn chưa đủ hai bên xác nhận hoặc đã đóng.');
  if (one("select 1 from inspection_result_versions where delivery_id = ? and status = 'chot'", dot.id)) throw loi('E14', 'Kết quả đợt này đã chốt. Sai sót sau chốt đi theo yêu cầu thay đổi hoặc bất đồng.');
  const b = ctx.body;
  if (!(Number(b.accepted_kg) >= 0)) throw loi('E07', 'Nhập lượng nhận.', 'accepted_kg');
  run("update inspection_result_versions set status = 'thay_the' where delivery_id = ? and status in ('cho_xac_nhan','bat_dong')", dot.id);
  const so = (one('select max(version_no) n from inspection_result_versions where delivery_id = ?', dot.id).n || 0) + 1;
  const kq = { id: newId('ir_'), delivery_id: dot.id, version_no: so, accepted_g: kg(b.accepted_kg), rejected_g: kg(b.rejected_kg || 0), reject_reason: b.reject_reason || null, price_adjust_vnd_per_kg: Number(b.price_adjust || 0), summary: b.summary || null, entered_by_org: ctx.org.id, status: 'cho_xac_nhan', created_at: nowIso() };
  kq.hash = sha256(JSON.stringify([kq.accepted_g, kq.rejected_g, kq.price_adjust_vnd_per_kg, b.measurements || []]));
  insert('inspection_result_versions', kq);
  for (const m of b.measurements || []) insert('measurements', { id: newId('me_'), delivery_id: dot.id, metric: m.metric, value: Math.round(Number(m.value)), unit: m.unit || '', source_label: 'tu_khai', entered_by_org: ctx.org.id, created_at: nowIso() });
  insert('result_confirmations', { id: newId('rf_'), result_version_id: kq.id, party: ben, decision: 'dong_y', user_id: ctx.user.id, at: nowIso() });
  run("update deliveries set status = 'dang_giao' where id = ? and status = 'chua_giao'", dot.id);
  notify(orgCuaBen(don, benKia(ben)), `${don.code} đợt ${dot.seq}: có kết quả cân bản ${so} do ${ctx.org.name} nhập. Bạn chọn Đúng hoặc Không đúng; không trả lời không tính là đồng ý.`);
  audit(ctx, 'inspection_result_versions', kq.id, 'nhap', { ben });
  return { __status: 201, item: kq, nhan: 'Tự khai', ghi_chu: 'Chưa phải kết quả cuối cho tới khi bên kia xác nhận.' };
}));

// Bên còn lại xác nhận hoặc phản đối; phản đối thì chốt phần không tranh chấp, mở vụ việc
route('POST', '/api/results/:id/confirm', ctx => tx(() => {
  const kq = one('select * from inspection_result_versions where id = ?', ctx.params.id);
  if (!kq) throw khongThay('Kết quả');
  const { dot, don } = layDot(kq.delivery_id);
  const ben = benTrongDon(ctx, don);
  if (kq.status !== 'cho_xac_nhan') throw loi('E14', 'Bản kết quả này đã được thay hoặc đã chốt. Mở bản mới nhất.');
  if (ctx.body.hash && ctx.body.hash !== kq.hash) throw loi('E07', 'Số liệu đã đổi so với bản bạn xem.');
  const quyet = ctx.body.decision === 'phan_doi' ? 'phan_doi' : 'dong_y';
  // Mặc định tranh chấp phần bị từ chối; vượt quá phần đó mới lấn vào phần đã nhận
  const tranhChap_g = quyet === 'phan_doi' ? Math.min(kg(ctx.body.disputed_kg ?? raKg(kq.rejected_g || kq.accepted_g)), kq.accepted_g + kq.rejected_g) : 0;
  insert('result_confirmations', { id: newId('rf_'), result_version_id: kq.id, party: ben, decision: quyet, disputed_g: tranhChap_g, note: ctx.body.note || null, user_id: ctx.user.id, at: nowIso() });
  if (quyet === 'dong_y') {
    run("update inspection_result_versions set status = 'chot' where id = ?", kq.id);
    run("update measurements set source_label = 'ben_kia_xac_nhan' where delivery_id = ? and source_label = 'tu_khai'", dot.id);
    ghiNhanHang(don, dot, kq, kq.accepted_g, 'thong_nhat');
    run("update deliveries set status = 'da_giao' where id = ?", dot.id);
    capNhatTrangThaiDon(don);
    const phi = danhGiaPhi(don.id);
    audit(ctx, 'inspection_result_versions', kq.id, 'dong_y');
    return { chot: true, phi };
  }
  // Phản đối: phần không tranh chấp (đã có hai bên đồng ý) vẫn chốt; phần tranh chấp giữ riêng
  const khongTC = Math.max(0, kq.accepted_g - Math.max(0, tranhChap_g - kq.rejected_g));
  run("update inspection_result_versions set status = 'bat_dong' where id = ?", kq.id);
  ghiNhanHang(don, dot, kq, khongTC, 'khong_tranh_chap');
  const pa = one('select * from dispute_plans where order_id = ? order by rowid desc limit 1', don.id);
  const gia = dongDon(don).unit_price_vnd_per_kg;
  const tc = insert('disputes', { id: newId('ds_'), code: nextCode('TC-', 'disputes'), order_id: don.id, delivery_id: dot.id, result_version_id: kq.id, status: 'mo', step_index: 0, step_deadline: addMs(nowIso(), (pa?.confirm_hours || 24) * HOUR), undisputed_g: khongTC, disputed_g: tranhChap_g, disputed_value_vnd: tienHang(tranhChap_g, gia), goods_location: ctx.body.goods_location || null, created_at: nowIso() });
  insert('dispute_events', { id: newId('de_'), dispute_id: tc.id, step_index: 0, action: 'mo', note: ctx.body.note || null, at: nowIso() });
  insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref: `${don.code} · ${tc.code}`, priority: ctx.body.hang_de_hong ? 'P1' : 'P2', category: 'hang_dang_cho', description: ctx.body.note || 'Bất đồng kết quả cân/đo', status: 'moi', created_at: nowIso() });
  const phi = danhGiaPhi(don.id);
  notify(orgCuaBen(don, benKia(ben)), `${don.code} đợt ${dot.seq}: bên kia phản đối ${raKg(tranhChap_g)} kg. Phần ${raKg(khongTC)} kg không tranh chấp vẫn chốt. Mã vụ việc ${tc.code}.`);
  audit(ctx, 'disputes', tc.id, 'mo', { tranhChap_g, khongTC });
  return { chot: false, vu_viec: tc, khong_tranh_chap_kg: raKg(khongTC), ma: 'E07', phi };
}));

// Kết quả đang chờ bên mình xác nhận (màn "Kết quả đợt" của người bán)
route('GET', '/api/results/pending', ctx => ({
  items: all(`select r.*, d.seq, d.order_id, o.code don, o.buyer_org, o.seller_org, e.name ben_nhap
    from inspection_result_versions r join deliveries d on d.id = r.delivery_id join orders o on o.id = d.order_id join organizations e on e.id = r.entered_by_org
    where r.status = 'cho_xac_nhan' and r.entered_by_org <> ? and (o.buyer_org = ? or o.seller_org = ?) order by r.created_at desc`, ctx.org.id, ctx.org.id, ctx.org.id)
    .map(r => ({ ...r, do: all('select metric, value, unit, source_label from measurements where delivery_id = ? order by created_at', r.delivery_id) })),
}));

/* ---------- Bất đồng: các bước theo phương án, hết mốc cuối → chuyển cơ chế tiếp theo ---------- */
function cacBuoc(don) {
  const pa = one('select * from dispute_plans where order_id = ? order by rowid desc limit 1', don.id) || { confirm_hours: 24, lab_name: 'đơn vị kiểm định do hai bên chọn', mediation_days: null, next_mechanism: 'Cơ chế theo thỏa thuận' };
  const coDieuPhoi = !!one("select 1 from service_engagement_versions where order_id = ? and status = 'kich_hoat'", don.id);
  const b = [{ k: 'doi_chieu', ten: 'Hai bên đối chiếu', han: pa.confirm_hours * HOUR }, { k: 'do_lai', ten: `Đo lại tại ${pa.lab_name}`, han: 3 * DAY }];
  if (coDieuPhoi && pa.mediation_days) b.push({ k: 'hoa_giai', ten: 'Người điều phối hòa giải', han: pa.mediation_days * DAY });
  return { buoc: b, co_che_tiep: pa.next_mechanism };
}
function chuyenCoChe(tc, don, lyDo) {
  const { co_che_tiep } = cacBuoc(don);
  run("update disputes set status = 'chuyen_co_che', next_handler = ?, step_deadline = null where id = ?", co_che_tiep, tc.id);
  insert('dispute_events', { id: newId('de_'), dispute_id: tc.id, step_index: tc.step_index, action: 'chuyen_co_che', note: lyDo, at: nowIso() });
  run("update tickets set status = 'chuyen_co_che' where entity_ref like ?", `%${tc.code}%`);
  for (const o of [don.buyer_org, don.seller_org]) notify(o, `${tc.code}: Chưa giải quyết được, đã chuyển cơ chế tiếp theo (${co_che_tiep}). Phần tranh chấp giữ riêng, không tính phí, không chuyển cọc. Quyền khiếu nại vẫn còn.`);
}
route('GET', '/api/disputes/:id', ctx => {
  const tc = one('select * from disputes where id = ? or code = ?', ctx.params.id, ctx.params.id); if (!tc) throw khongThay('Vụ việc');
  const don = layDon(tc.order_id); benTrongDon(ctx, don);
  const { buoc, co_che_tiep } = cacBuoc(don);
  return { item: tc, buoc: [...buoc.map((b, i) => ({ ...b, han: undefined, xong: i < tc.step_index || tc.status !== 'mo', hien_tai: i === tc.step_index && tc.status === 'mo' })), { k: 'chuyen_co_che', ten: `Chưa thống nhất: chuyển ${co_che_tiep}`, hien_tai: tc.status === 'chuyen_co_che' }], su_kien: all('select * from dispute_events where dispute_id = ? order by at', tc.id) };
});
// Một bên đề xuất giải quyết; bên kia đồng ý → chốt phần được nhận theo đề xuất
route('POST', '/api/disputes/:id/propose', ctx => tx(() => {
  const tc = one('select * from disputes where id = ?', ctx.params.id); if (!tc) throw khongThay('Vụ việc');
  const don = layDon(tc.order_id); const ben = benTrongDon(ctx, don);
  if (tc.status !== 'mo') throw loi('E05', 'Vụ việc không còn mở.');
  const nhan_g = Math.min(kg(ctx.body.accepted_kg ?? 0), tc.disputed_g);
  insert('dispute_events', { id: newId('de_'), dispute_id: tc.id, step_index: tc.step_index, action: `de_xuat:${ben}:${nhan_g}`, note: ctx.body.note || null, at: nowIso() });
  notify(orgCuaBen(don, benKia(ben)), `${tc.code}: đề xuất nhận ${raKg(nhan_g)} kg trong phần tranh chấp. Đồng ý hoặc đề xuất khác.`);
  return { de_xuat_kg: raKg(nhan_g) };
}));
route('POST', '/api/disputes/:id/accept', ctx => tx(() => {
  const tc = one('select * from disputes where id = ?', ctx.params.id); if (!tc) throw khongThay('Vụ việc');
  const don = layDon(tc.order_id); const ben = benTrongDon(ctx, don);
  if (tc.status !== 'mo') throw loi('E05', 'Vụ việc không còn mở.');
  const dx = one("select * from dispute_events where dispute_id = ? and action like 'de_xuat:%' order by at desc limit 1", tc.id);
  if (!dx) throw loi('E05', 'Chưa có đề xuất nào.');
  const [, benDX, nhan] = dx.action.split(':');
  if (benDX === ben) throw loi('E05', 'Bên còn lại phải đồng ý đề xuất của bạn.');
  const kq = one('select * from inspection_result_versions where id = ?', tc.result_version_id);
  const dot = one('select * from deliveries where id = ?', tc.delivery_id);
  ghiNhanHang(don, dot, kq, Number(nhan), tc.code);
  run("update disputes set status = 'da_giai_quyet', step_deadline = null where id = ?", tc.id);
  run("update inspection_result_versions set status = 'chot' where id = ?", kq.id);
  run("update deliveries set status = 'da_giao' where id = ?", dot.id);
  insert('dispute_events', { id: newId('de_'), dispute_id: tc.id, step_index: tc.step_index, action: 'giai_quyet', note: `Nhận ${raKg(Number(nhan))} kg`, at: nowIso() });
  capNhatTrangThaiDon(don);
  return { giai_quyet: true, phi: danhGiaPhi(don.id) };
}));
// Việc nền: quá hạn bước → nhắc và sang bước sau; quá bước cuối → chuyển cơ chế. Không tự trừ tiền, không coi im lặng là đồng ý.
export function xuLyTranhChapQuaHan() {
  let n = 0;
  for (const tc of all("select * from disputes where status = 'mo' and step_deadline <= ?", nowIso())) tx(() => {
    const don = layDon(tc.order_id);
    const { buoc } = cacBuoc(don);
    const tiep = tc.step_index + 1;
    if (tiep >= buoc.length) chuyenCoChe(tc, don, 'Hết mốc cuối của phương án bất đồng');
    else {
      run('update disputes set step_index = ?, step_deadline = ? where id = ?', tiep, addMs(nowIso(), buoc[tiep].han), tc.id);
      insert('dispute_events', { id: newId('de_'), dispute_id: tc.id, step_index: tiep, action: 'sang_buoc', note: buoc[tiep].ten, at: nowIso() });
      for (const o of [don.buyer_org, don.seller_org]) notify(o, `${tc.code}: chuyển sang bước “${buoc[tiep].ten}”. Im lặng không tính là đồng ý.`);
    }
    n++;
  });
  return n;
}
