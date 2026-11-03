// Kiểm E2E ca tiền thừa: đặt kịch bản "trả lại 80%" → bên mua ảo trả lại có ảnh → chị Năm chấp nhận vượt ngưỡng →
// quyết toán hoàn cọc thừa cho bên mua → ngân hàng giả lập chuyển + nhân viên AI đối soát. Chạy trên stack thử mới khởi động.
// Đẩy một đơn thật qua vòng đời: AI đóng bên mua (vòng đối tác ảo), script làm phần người bán (chị Năm) qua API như người dùng bấm.
// Mỗi lần trạng thái/việc đổi: ghi lại để Playwright chụp màn ban-don ở trạng thái đó.
import { writeFileSync } from 'node:fs';
const B = 'http://127.0.0.1:18980'; const OTP = '123456', PIN = '2468';
const j = async (r) => { const x = await r.json().catch(() => ({})); return x && typeof x === 'object' && 'data' in x ? x.data : x; };
const nam = (await j(await fetch(B + '/v1/test/impersonate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0918000421' }) }))).token;
const goi = async (m, u, b) => { const r = await fetch(B + u, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + nam }, body: m === 'POST' ? JSON.stringify(u.startsWith('/v1/otp/') ? b : { idempotency_key: crypto.randomUUID(), ...(b || {}) }) : undefined }); return [r.status, await j(r)]; };
const ds = async (u) => { const [, v] = await goi('GET', u); return v?.items ?? v ?? []; };
const otp = async (purpose, extra) => (await goi('POST', '/v1/otp/challenges', { purpose, ...extra }))[1]?.challenge_id;
const moc = []; let truoc = '';
await fetch(B + '/v1/test/kich-ban', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ten: 'tra-lai-nhieu' }) }); console.log('đặt kịch bản: trả lại 80% cho lần nghiệm thu kế tiếp');
for (let n = 1; n <= 40; n++) {
  const [, v] = await goi('POST', '/v1/test/doi-tac-ao/vong', {});
  const ai = (v?.viec ?? []).filter((x) => x.ket_qua === 'xong').map((x) => `${x.viec} ${x.doi_tuong}`);
  // người bán thật: lời chào bên mua → trả giá một lần rồi để AI đồng ý
  for (const o of await ds('/v1/offers')) if (o.status === 'sent' && o.vong_cuoi?.from_side === 'buyer') {
    // Vòng 1: trả giá một lần; bên mua ảo trả giá ngược lại (tính cách, E107) thì đồng ý.
    if (Number(o.vong_cuoi.round_no) <= 1) { const g = Math.round(Number(o.vong_cuoi.price_vnd) * 1.02 / 100) * 100; await goi('POST', `/v1/offers/${o.id}/counter`, { price_vnd: g, qty_g: Number(o.vong_cuoi.qty_g) }); ai.push(`Năm trả giá ${g}`); }
    else { const [s] = await goi('POST', `/v1/offers/${o.id}/accept`, { expected_revision: o.revision }); ai.push(`Năm đồng ý giá ${o.code} ${s}`); }
  }
  const tatCa = await ds('/v1/orders');
  for (const d of tatCa) {
    const k = `${d.code} ${d.status}|${d.hien_thi?.toi_luot?.phia ?? ''}|${d.hien_thi?.toi_luot?.viec ?? ''}`;
    if (!moc.some((m) => m.k === k)) moc.push({ id: d.id, code: d.code, k });
    const o = (await goi('GET', `/v1/orders/${d.id}`))[1];
    const luot = d.hien_thi?.toi_luot;
    for (const p of await ds(`/v1/orders/${d.id}/payments`)) if (p.status === 'payer_reported') {
      const c = await otp('money_received', { payment_id: p.id, amount_vnd: String(p.amount_due_vnd) });
      const [s] = await goi('POST', `/v1/payments/${p.id}/confirm`, { challenge_id: c, code: OTP, amount_vnd: Number(p.amount_due_vnd), result: 'full', bank_txn_ref: 'FT' + Date.now().toString().slice(-10) }); ai.push(`Năm xác nhận tiền ${s}`);
    }
    if (luot?.phia === 'seller') {
      if (/Ký/.test(luot.viec)) { const doc = [...(o.tai_lieu ?? [])].reverse().find((x) => x.doc_type === 'contract'); const c = await otp('contract_sign', { document_id: doc?.id });
        const [s, r] = await goi('POST', `/v1/orders/${d.id}/sign`, { challenge_id: c, code: OTP, expected_revision: o.revision, commitment_ack: true, low_downgrade_price_ack: true }); ai.push(`Năm ký ${s}${s >= 300 ? ' ' + JSON.stringify(r).slice(0, 120) : ''}`); }
      else if (/nghiệm thu/i.test(luot.viec)) { const dd = o.dot_giao?.find((x) => x.status === 'awaiting_seller'); if (dd) { const [s] = await goi('POST', `/v1/deliveries/${dd.id}/acceptance/agree`, { pin: PIN, chap_nhan_vuot_nguong: true }); ai.push(`Năm đồng ý số cân ${s}`); } }
      else if (/Giao hàng/.test(luot.viec)) {
        const dd = o.dot_giao?.find((x) => ['ready', 'preparing'].includes(x.status)); const ma = dd && (await goi('GET', `/v1/test/deliveries/${dd.id}/receipt-code`))[1]?.ma_6_so;
        if (dd && ma) { const taiCho = o.delivery_mode === 'at_farm' || /farm|vuon/.test(String(o.dieu_khoan?.delivery_mode ?? o.delivery_mode ?? ''));
          const [s, r] = taiCho ? await goi('POST', `/v1/deliveries/${dd.id}/start-check`, { ma_6_so: ma })
            : await goi('POST', `/v1/deliveries/${dd.id}/ship`, { ma_6_so: ma, loaded_g: String(dd.planned_qty_g), plate_no: 'DEMO-66C-001' });
          ai.push(`Năm ${taiCho ? 'bắt đầu cân' : 'xuất hàng'} (mã ${ma}) ${s}${s >= 300 ? ' ' + JSON.stringify(r).slice(0, 140) : ''}`);
          if (s >= 300 && /cửa sổ giao/.test(JSON.stringify(r))) { await fetch(B + '/v1/test/clock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ advance_minutes: 20 }) }); ai.push('tua đồng hồ 20 phút'); } }
        else ai.push(`(chưa lấy được mã người nhận: ${dd?.status ?? 'không có đợt'})`);
      }
      else ai.push(`(việc người bán chưa tự làm: ${luot.viec})`);
    }
    if (luot && luot.phia !== 'seller' && luot.phia !== 'buyer') { await fetch(B + '/v1/test/clock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ advance_minutes: 180 }) }); ai.push('tua đồng hồ 3h'); }
  }
  if (tatCa.length >= 2 && tatCa.every((d) => /completed|closed/.test(d.status))) { console.log(`vòng ${n}: XONG cả ${tatCa.length} đơn`); break; }
  console.log(`vòng ${n}: ${ai.join(' | ') || '—'}`);
}
writeFileSync(process.env.MOC ?? '/tmp/moc-don.json', JSON.stringify(moc, null, 1));
console.log('mốc:', moc.map((m) => m.k).join('  →  '));

// Kiểm ca tiền thừa: quyết toán có refund > 0 và bên mua thấy ngân hàng đã chuyển đến.
for (const d of await ds('/v1/orders')) { const [, tien] = await goi('GET', `/v1/orders/${d.id}/money`); const qt = (tien?.quyet_toan ?? []).at(-1);
  console.log(d.code, d.status, 'hoàn bên mua', qt?.refund_vnd, 'chi người bán', qt?.release_vnd, 'lệnh', JSON.stringify((tien?.lenh_ngan_hang ?? []).map((l) => [l.kind, l.amount_vnd, l.status]))); }
const acc = await (await fetch(B + '/v1/test/accounts')).json();
for (const a of acc.filter((x) => (x.org_code || '').startsWith('TC-M') && (x.roles || '').includes('owner'))) {
  const tk = (await j(await fetch(B + '/v1/test/impersonate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: a.phone }) }))).token;
  const m = await j(await fetch(B + '/v1/money/summary', { headers: { authorization: 'Bearer ' + tk } }));
  if (Number(m.tong?.ngan_hang_da_chuyen_den) > 0) console.log('BÊN MUA', a.org_name, 'ngân hàng đã chuyển đến', m.tong.ngan_hang_da_chuyen_den);
}
