// Chạy kịch bản "AI đóng vai" (do ChatGPT soạn) trên backend thử bằng API nghiệp vụ thật.
// node scripts/chay-kich-ban-ai.mjs <kich-ban.json> <ket-qua.json>   (API_ORIGIN mặc định http://127.0.0.1:18980)
// Mỗi kịch bản: đặt lại chợ mẫu (/v1/test/reset) rồi chạy từng bước; ghi mã HTTP, lỗi/kết quả, trạng thái sau bước.
import { readFileSync, writeFileSync } from 'node:fs';

const B = process.env.API_ORIGIN ?? 'http://127.0.0.1:18980';
const [, , vao, ra] = process.argv;
const OTP = '123456', PIN = '2468';
const ANH = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Chủ lô / chủ nhu cầu trong chợ mẫu (du-lieu-cho.json)
const CHU_LO = { 'L-0412': '0918000421', 'L-0413': '0918000421', 'L-0414': '0918000421', 'L-0440': '0977000610', 'L-0441': '0977000610', 'L-0447': '0977000610',
  'L-0490': '0907000300', 'L-0491': '0907000300', 'L-0492': '0907000300', 'L-0470': '0945000880', 'L-0471': '0945000880', 'L-0480': '0919000950', 'L-0481': '0919000950' };
const CHU_NC = { 'NC-3001': '0909000213', 'NC-3002': '0909000213', 'NC-3003': '0903000410', 'NC-3005': '0908000510', 'NC-3006': '0938000610', 'NC-3004': '0902000810' };

let dem = 0;
const goi = async (method, url, body, token) => {
  const r = await fetch(B + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: method === 'POST' ? JSON.stringify(url.startsWith('/v1/test/') || url.startsWith('/v1/sim/') || url.startsWith('/v1/otp/') ? body ?? {} : { idempotency_key: `ai-${Date.now()}-${dem++}`, ...body }) : undefined });
  const t = await r.text(); let json; try { json = JSON.parse(t); } catch { json = t; }
  return { status: r.status, json };
};
const ok = async (...a) => { const r = await goi(...a); if (r.status >= 300) { const e = new Error(JSON.stringify(r.json?.errors?.[0] ?? r.json).slice(0, 300)); e.http = r.status; throw e; } return r.json; };
const tokens = new Map();
const vai = async (sdt) => { if (!tokens.has(sdt)) tokens.set(sdt, await ok('POST', '/v1/test/impersonate', { phone: sdt })); return tokens.get(sdt); };
const otp = async (t, purpose, x) => (await ok('POST', '/v1/otp/challenges', { purpose, ...x }, t)).challenge_id;
const du = (d) => d?.data ?? d;

async function chayMot(kb) {
  tokens.clear();
  if (process.env.KHONG_DAT_LAI !== '1') await ok('POST', '/v1/test/reset', {});
  const s = { offer: null, order: null, delivery: null, qr: null };
  const ketQua = [];
  const lotTheoMa = async (code) => { const me = await vai(CHU_LO[code]); const l = (await ok('GET', '/v1/lots?mine=true', undefined, me.token)).find((x) => x.code === code); if (!l) throw new Error('Không thấy lô ' + code); return l; };
  const donCt = async (t) => ok('GET', `/v1/orders/${s.order}`, undefined, t);
  const dot = async (t) => { const o = await donCt(t); const d = o.dot_giao?.find((x) => !/closed|cancel/.test(x.status)) ?? o.dot_giao?.[0]; s.delivery = d?.id; return d; };
  for (const [i, b] of kb.buoc.entries()) {
    const ghi = { buoc: i + 1, lam: b.lam, ai: b.ai ?? null, mong_doi: b.mong_doi, can_cu: b.can_cu };
    try {
      const me = b.ai ? await vai(b.ai) : null; const t = me?.token;
      let kq;
      switch (b.lam) {
        case 'chao': { const l = await lotTheoMa(b.lo); kq = du(await ok('POST', '/v1/offers', { direction: 'buyer_bid', lot_id: l.id, qty_g: Math.round(b.kg * 1000), price_vnd: b.gia }, t)); s.offer = kq.id; break; }
        case 'bao_gia': { const chu = await vai(CHU_NC[b.nhu_cau]); const nc = (await ok('GET', '/v1/demands?mine=true', undefined, chu.token)).find((x) => x.code === b.nhu_cau);
          const ct = await ok('GET', `/v1/demands/${nc.id}`, undefined, chu.token); const line = ct.lines?.[0]?.id ?? ct.dong?.[0]?.id; const l = b.lo === '@moi' ? s.loMoi : await lotTheoMa(b.lo);
          kq = du(await ok('POST', '/v1/offers', { direction: 'seller_quote', lot_id: l.id, demand_line_id: line, qty_g: Math.round(b.kg * 1000), price_vnd: b.gia }, t)); s.offer = kq.id; break; }
        case 'tra_gia': { const of = await ok('GET', `/v1/offers/${s.offer}`, undefined, t); kq = du(await ok('POST', `/v1/offers/${s.offer}/counter`, { price_vnd: b.gia, qty_g: Number(b.kg ? b.kg * 1000 : of.rounds.at(-1).qty_g) }, t)); break; }
        case 'dong_y': { const of = await ok('GET', `/v1/offers/${s.offer}`, undefined, t); kq = du(await ok('POST', `/v1/offers/${s.offer}/accept`, { expected_revision: of.revision }, t)); break; }
        case 'tu_choi': kq = du(await ok('POST', `/v1/offers/${s.offer}/reject`, {}, t)); break;
        case 'rut': kq = du(await ok('POST', `/v1/offers/${s.offer}/withdraw`, {}, t)); break;
        case 'nhan': kq = du(await ok('POST', '/v1/messages', { ...(s.order ? { order_id: s.order } : { offer_id: s.offer }), body: b.noi_dung }, t)); break;
        case 'lap_don': { const of = await ok('GET', `/v1/offers/${s.offer}`, undefined, t); const v = of.rounds.at(-1); const now = new Date((await ok('GET', '/v1/test/clock')).now);
          const tu = new Date(now.getTime() + 2 * 3600e3);
          kq = du(await ok('POST', '/v1/orders', { offer_id: s.offer, downgrade_price_vnd: Math.round(Number(v.price_vnd) * 0.65 / 100) * 100, delivery_mode: 'at_farm', transport_by: 'buyer',
            delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 3600e3).toISOString(), payment_timing: b.tra_tien ?? 'on_receipt', designated_receiver_user_id: me.user.user_id, silent_accept_hours: 2 }, t));
          s.order = kq.id; break; }
        case 'ky': { const o = await donCt(t); const doc = [...(o.tai_lieu ?? [])].reverse().find((d) => d.doc_type === 'contract'); const phia = o.phia_cua_ban;
          kq = du(await ok('POST', `/v1/orders/${s.order}/sign`, { challenge_id: await otp(t, 'contract_sign', { document_id: doc?.id }), code: OTP, ...(phia === 'seller' ? { commitment_ack: true } : {}) }, t)); break; }
        case 'tu_choi_ky': kq = du(await ok('POST', `/v1/orders/${s.order}/decline`, { reason: b.ly_do ?? 'Không đồng ý điều khoản' }, t)); break;
        case 'coc': case 'coc_thieu': { const hd = await ok('GET', `/v1/orders/${s.order}/deposit-instruction`, undefined, t); const so = Math.round(Number(hd.total_vnd) * (b.lam === 'coc' ? 1 : (b.phan_tram ?? 50) / 100));
          await ok('POST', '/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: so, payer: { bank_code: 'VCB', account_no: '0071000123456', name: 'BEN MUA AI' } }); kq = await ok('POST', '/v1/sim/bank/deliver', {}); break; }
        case 'tra_truoc_boc': case 'tra_tien_hang': { const loai = b.lam === 'tra_truoc_boc' ? 'goods_before_loading' : 'goods_on_receipt';
          const p = (await ok('GET', `/v1/orders/${s.order}/payments`, undefined, t)).find((x) => x.kind === loai && x.status === 'due'); if (!p) throw new Error('Không có khoản ' + loai + ' đang chờ trả');
          const anh = du(await ok('POST', '/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'payment', entity_id: p.id, captured_in_app: true }, t));
          kq = du(await ok('POST', `/v1/payments/${p.id}/report`, { amount_vnd: Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, t)); break; }
        case 'xac_nhan_tien': { const p = (await ok('GET', `/v1/orders/${s.order}/payments`, undefined, t)).find((x) => x.status === 'payer_reported'); if (!p) throw new Error('Không có khoản nào bên mua đã báo trả');
          kq = du(await ok('POST', `/v1/payments/${p.id}/confirm`, { challenge_id: await otp(t, 'money_received', { payment_id: p.id, amount_vnd: String(p.amount_due_vnd) }), code: OTP, amount_vnd: Number(p.amount_due_vnd), result: 'full', bank_txn_ref: 'FT' + Date.now().toString().slice(-10) }, t)); break; }
        case 'dat_xe': { const d = await dot(t); let r;
          for (const plate of ['DEMO-66C-001', 'DEMO-66C-002', 'DEMO-66C-003', 'DEMO-66C-004', '66C-123.45', '66C-678.90']) { r = await goi('POST', `/v1/deliveries/${d.id}/trip`, { plate_no: plate, freight_vnd: 1500000 }, t); if (r.status < 300) break; }
          if (r.status >= 300) { const e = new Error(JSON.stringify(r.json?.errors?.[0]).slice(0, 300)); e.http = r.status; throw e; } kq = du(r.json); break; }
        case 'phat_qr': { const d = await dot(t); kq = du(await ok('POST', `/v1/deliveries/${d.id}/receipt-qr`, {}, t)); s.qr = kq.qr_token ?? kq.data?.qr_token; break; }
        case 'bat_dau_can': { const d = await dot(t); const dv = await ok('GET', `/v1/deliveries/${d.id}`, undefined, t);
          await ok('POST', '/v1/test/clock', { set: new Date(new Date(dv.window_from).getTime() + 30 * 60e3).toISOString() });
          // Ngoài đời người nhận đưa mã trên app của họ; trong thử, lấy mã phát lại từ bên mua của kịch bản (vai.mua)
          if (!s.qr && kb.vai?.mua) s.qr = du(await ok('POST', `/v1/deliveries/${d.id}/receipt-qr`, {}, (await vai(kb.vai.mua)).token)).qr_token;
          kq = du(await ok('POST', `/v1/deliveries/${d.id}/start-check`, { qr_token: s.qr }, t)); break; }
        case 'nghiem_thu': { const d = await dot(t); const anh = du(await ok('POST', '/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'delivery', entity_id: d.id, captured_in_app: true }, t));
          kq = du(await ok('POST', `/v1/deliveries/${d.id}/acceptance`, { pin: PIN, weighed_g: Math.round(b.can_kg * 1000), seal_code: 'M-' + (1000 + i), lines: b.dong.map((x) => ({ kind: x.loai, qty_g: Math.round(x.kg * 1000), ...(x.ly_do ? { reason_code: x.ly_do, evidence_document_id: anh.id } : {}) })) }, t)); break; }
        case 'dong_y_can': { const d = await dot(t); kq = du(await ok('POST', `/v1/deliveries/${d.id}/acceptance/agree`, { pin: PIN, ...(b.thieu ? { shortfall: { choice: b.thieu } } : {}) }, t)); break; }
        case 'phan_doi_can': { const d = await dot(t); kq = du(await ok('POST', `/v1/deliveries/${d.id}/acceptance/dispute`, { pin: PIN, line_no: b.dong ?? 1, reason: b.ly_do ?? 'Không đúng' }, t)); break; }
        case 'tua_gio': kq = await ok('POST', '/v1/test/clock', { advance_minutes: Math.round((b.gio ?? 1) * 60) }); break;
        case 'xem': break;
        // Chờ đối tác ảo (chạy song song trên cùng backend) phản hồi
        case 'cho': await new Promise((ok) => setTimeout(ok, Math.round((b.giay ?? 8) * 1000))); kq = { cho_giay: b.giay ?? 8 }; break;
        // Chọn lời chào/báo giá hiện tại theo mã lô (bán gộp: nhiều báo giá cho một nhu cầu)
        case 'chon': { const ds = await ok('GET', '/v1/offers', undefined, t); const x = ds.find((o) => o.lot_code === b.lo && /sent|accepted/.test(o.status)) ?? ds.find((o) => o.lot_code === b.lo);
          if (!x) throw new Error('Không thấy lời chào cho lô ' + b.lo); s.offer = x.id; s.order = null;
          const don = (await ok('GET', '/v1/orders', undefined, t)).find((d) => d.offer_id === x.id); if (don) s.order = don.id;
          kq = { offer: x.code, status: x.status, don: don?.code ?? null }; break; }
        // Chọn hợp đồng theo lời chào hiện tại (sau khi bên kia lập đơn)
        case 'chon_don': { const of = s.offer; const ds = await ok('GET', '/v1/orders', undefined, t); const d = ds.find((x) => x.offer_id === of) ?? ds.at(-1);
          if (!d) throw new Error('Chưa có hợp đồng'); s.order = d.id; kq = { don: d.code, status: d.status }; break; }
        // Người bán đăng lô mới (rồi mở bán)
        case 'dang_lo': { const now = new Date((await ok('GET', '/v1/test/clock')).now); const ngay = now.toISOString().slice(0, 10);
          const l = du(await ok('POST', '/v1/lots', { product_code: b.mat_hang, grade_code: b.loai, qty_basis: 'estimated', qty_g: Math.round(b.kg * 1000), available_from: ngay, harvest_on: ngay, ask_price_vnd: b.gia, floor_price_vnd: b.gia_kin ?? Math.round(b.gia * 0.9) }, t));
          const ct = await ok('GET', `/v1/lots/${l.id}`, undefined, t);
          kq = du(await ok('POST', `/v1/lots/${l.id}/publish`, { expected_revision: ct.revision }, t)); s.loMoi = { id: l.id, code: ct.code ?? l.code }; kq = { lo: s.loMoi.code, ...kq }; break; }
        default: throw new Error('Thao tác chưa hỗ trợ: ' + b.lam);
      }
      ghi.http = 200; ghi.ket_qua = JSON.stringify(kq ?? null).slice(0, 400);
    } catch (e) { ghi.http = e.http ?? 0; ghi.loi = String(e.message).slice(0, 400); }
    // Trạng thái sau bước (nhìn từ người làm bước, hoặc bên mua)
    try {
      const t = (await vai(b.ai ?? kb.vai?.mua)).token;
      if (s.order) { const o = await ok('GET', `/v1/orders/${s.order}`, undefined, t); ghi.don = { code: o.code, status: o.status, hien_thi: o.hien_thi, dot: o.dot_giao?.map((x) => x.status) }; }
      else if (s.offer) { const o = await ok('GET', `/v1/offers/${s.offer}`, undefined, t); ghi.loi_chao = { status: o.status, vong: o.rounds?.length, gia: o.rounds?.at(-1)?.price_vnd, luot_con: o.luot_tra_gia_con }; }
      if (b.lam === 'nhan' || b.lam === 'xem') { const m = await ok('GET', `/v1/messages?${s.order ? 'order_id=' + s.order : 'offer_id=' + s.offer}`, undefined, t); ghi.tin = m.tin.slice(-3).map((x) => x.body); }
    } catch (e) { ghi.trang_thai_loi = String(e.message).slice(0, 200); }
    ketQua.push(ghi);
  }
  return { ma: kb.ma, ten: kb.ten, tinh_cach: kb.tinh_cach, buoc: ketQua };
}

const ds = JSON.parse(readFileSync(vao, 'utf8')).kich_ban;
const tatCa = [];
for (const kb of ds) { const r = await chayMot(kb); tatCa.push(r); console.log(`${kb.ma} ${kb.ten}: ${r.buoc.filter((x) => x.http === 200).length}/${r.buoc.length} bước gọi được`); }
writeFileSync(ra, JSON.stringify(tatCa, null, 1));
