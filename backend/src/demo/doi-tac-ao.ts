// Đối tác ảo (CHỈ môi trường thử): đóng vai mọi tổ chức trong chợ mẫu TRỪ số người thật đang bấm,
// tự làm phần việc tới lượt bên đó bằng đúng API nghiệp vụ (không đi tắt DB): trả giá/đồng ý lời chào,
// lập đơn + ký, chuyển cọc qua ngân hàng giả lập, báo trả trước bốc, đặt xe, nghiệm thu, xác nhận tiền, đồng ý số cân.
// Quyết định theo luật đơn giản, ghi rõ trong `nhat_ky` để test đọc lại.
import type { Goi } from './dung-demo.ts';

const OTP = '123456'; const PIN = '2468';
const ANH = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/** Số đại diện mỗi tổ chức trong chợ mẫu (người có quyền ký/nhận). */
export const DAI_DIEN: Record<string, string> = {
  'TC-B01': '0918000421', 'TC-B02': '0977000610', 'TC-B03': '0907000300', 'TC-B04': '0945000880', 'TC-B05': '0919000950',
  'TC-M01': '0909000213', 'TC-M02': '0903000410', 'TC-M03': '0908000510', 'TC-M04': '0938000610', 'TC-M05': '0902000810',
};
let dem = 0;
const DA_LOI = new Set<string>();
const khoa = () => `ao-${Date.now().toString(36)}-${(dem++).toString(36)}`;

export interface ViecAo { to_chuc: string; viec: string; doi_tuong: string; ket_qua: 'xong' | 'loi'; chi_tiet?: string }

/** Một vòng quét. nguoiThat: số điện thoại người thật đang dùng (tổ chức của họ không bị đóng vai). */
export async function motVong(goi: Goi, nguoiThat: string[]): Promise<ViecAo[]> {
  const nhat_ky: ViecAo[] = [];
  const vai = async (phone: string) => (await goi('POST', '/v1/test/impersonate', { phone })).json as { token: string; user: any };
  const toChucThat = new Set<string>();
  for (const p of nguoiThat) { const v = await vai(p); if (v?.user?.org?.code) toChucThat.add(v.user.org.code); }
  const post = (u: string, b: any, t: string) => goi('POST', u, u.startsWith('/v1/otp/') || u.startsWith('/v1/sim/') ? b : { idempotency_key: khoa(), ...b }, t);
  const get = async (u: string, t: string) => { const r = await goi('GET', u, undefined, t); return r.status < 300 ? r.json : null; };
  const lam = async (tc: string, viec: string, dt: string, fn: () => Promise<{ status: number; json: any } | void>) => {
    const k = `${tc}|${viec}|${dt}`; if (DA_LOI.has(k)) return; // việc đã lỗi thì không thử lại mỗi vòng (cần người/vận hành)
    const cu = nhat_ky.length;
    try { await lam0(); } finally { if (nhat_ky.length > cu && nhat_ky[nhat_ky.length - 1].ket_qua === 'loi') DA_LOI.add(k); }
    async function lam0() {
    try {
      const r = await fn();
      if (r && r.status >= 300) nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'loi', chi_tiet: JSON.stringify(r.json).slice(0, 200) });
      else nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'xong' });
    } catch (e) { nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'loi', chi_tiet: String(e).slice(0, 200) }); }
    }
  };
  const otp = async (t: string, purpose: string, extra: any) => (await post('/v1/otp/challenges', { purpose, ...extra }, t)).json?.challenge_id;
  const ky = async (t: string, o: any, phia: string) => {
    const doc = [...(o.tai_lieu ?? [])].reverse().find((d: any) => d.doc_type === 'contract');
    return post(`/v1/orders/${o.id}/sign`, { challenge_id: await otp(t, 'contract_sign', { document_id: doc?.id }), code: OTP, expected_revision: o.revision, ...(phia === 'seller' ? { commitment_ack: true } : {}) }, t);
  };

  for (const [tc, sdt] of Object.entries(DAI_DIEN)) {
    if (toChucThat.has(tc)) continue;
    const me = await vai(sdt); if (!me?.token) continue;
    const t = me.token;
    // 1) Lời chào: tới lượt mình → vòng 1 trả giá nhích 3% về phía mình, từ vòng 2 đồng ý.
    for (const of of (await get('/v1/offers', t)) ?? []) {
      const phia = of.la_ben_mua ? 'buyer' : 'seller';
      const v = of.vong_cuoi;
      if (of.status === 'sent' && v && v.from_side !== phia) {
        if (Number(v.round_no) <= 1) {
          const gia = Math.round(Number(v.price_vnd) * (phia === 'seller' ? 1.03 : 0.97) / 100) * 100;
          await lam(tc, `trả giá ${gia}`, of.code, () => post(`/v1/offers/${of.id}/counter`, { price_vnd: gia, qty_g: Number(v.qty_g) }, t));
        } else await lam(tc, 'đồng ý giá', of.code, () => post(`/v1/offers/${of.id}/accept`, { expected_revision: of.revision }, t));
      }
      // Bên mua ảo: lời chào đã chốt mà chưa thành đơn → lập đơn (trùng thì backend từ chối, bỏ qua).
      if (of.status === 'accepted' && phia === 'buyer' && !of.order_id) {
        const now = new Date((await get('/v1/test/clock', t))?.now ?? Date.now());
        const tu = new Date(now.getTime() + 2 * 3600e3);
        const r = await post('/v1/orders', { offer_id: of.id, downgrade_price_vnd: Math.round(Number(v?.price_vnd ?? 0) * 0.65 / 100) * 100, delivery_mode: 'at_farm', transport_by: 'buyer',
          delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 3600e3).toISOString(), payment_timing: 'on_receipt', designated_receiver_user_id: me.user.user_id, silent_accept_hours: 2 }, t);
        if (r.status < 300) nhat_ky.push({ to_chuc: tc, viec: 'lập đơn', doi_tuong: of.code, ket_qua: 'xong' });
      }
    }
    // 2) Đặt trước khi hái chưa chốt lượng/giá → đề nghị chốt bằng lượng đợt đã hẹn (bên kia đồng ý + hai bên ký phụ lục).
    for (const v of (await get('/v1/seasonal-orders?type=pre_harvest', t)) ?? []) {
      if (v.order_status !== 'active') continue;
      const ds = (await get(`/v1/orders/${v.id}/amendments`, t)) ?? [];
      if (ds.length) continue;
      const ct = await get(`/v1/orders/${v.id}`, t); const q = ct?.dot_giao?.[0]?.planned_qty_g; if (!q) continue;
      await lam(tc, `đề nghị chốt lượng ${Number(q) / 1000} kg`, ct.code, () => post(`/v1/seasonal-orders/${v.id}/harvest-fix`, { qty_g: String(q) }, t));
    }
    // 3) Phụ lục: bên kia đề nghị → đồng ý; đã đồng ý → ký OTP.
    for (const d of (await get('/v1/orders', t)) ?? []) {
      if (!['active', 'awaiting_deposit'].includes(d.status)) continue;
      const ds = (await get(`/v1/orders/${d.id}/amendments`, t)) ?? [];
      const hieuLuc = ds.some((a: any) => a.status === 'accepted') ? Number((await get(`/v1/orders/${d.id}`, t))?.effective_version_no ?? 0) : 0;
      for (const a of ds) {
        if (a.status === 'accepted' && Number(a.resulting_version_no) <= hieuLuc) continue; // phụ lục đã có hiệu lực
        if (a.status === 'open' && !a.la_cua_toi) await lam(tc, 'đồng ý phụ lục', `${d.code}/${a.kind}`, () => post(`/v1/amendments/${a.id}/accept`, {}, t));
        if (a.status === 'accepted' && a.annex_document_id) await lam(tc, 'ký phụ lục', `${d.code}/${a.kind}`, async () => post(`/v1/amendments/${a.id}/sign`, { challenge_id: await otp(t, 'amendment_sign', { document_id: a.annex_document_id }), code: OTP }, t));
      }
    }
    // 4) Đơn: làm đúng việc mà backend báo là tới lượt bên mình.
    for (const d of (await get('/v1/orders', t)) ?? []) {
      let luot = d.hien_thi?.toi_luot; const phia = d.phia_cua_ban;
      if (phia === 'seller' && ['active', 'completed'].includes(d.status)) { // khoản bên mua đã báo trả → người bán xác nhận trước mọi việc khác
        let coXacNhan = false;
        for (const p of (await get(`/v1/orders/${d.id}/payments`, t)) ?? []) if (p.status === 'payer_reported') {
          coXacNhan = true;
          await lam(tc, 'xác nhận đã nhận tiền', d.code, async () => post(`/v1/payments/${p.id}/confirm`, { challenge_id: await otp(t, 'money_received', { payment_id: p.id, amount_vnd: String(p.amount_due_vnd) }), code: OTP, amount_vnd: Number(p.amount_due_vnd), result: 'full', bank_txn_ref: 'FT' + Date.now().toString().slice(-10) }, t));
        }
        if (coXacNhan) continue; // vòng sau mới làm tiếp, trạng thái đã đổi
      }
      if (!luot || luot.phia !== phia) continue;
      const o = await get(`/v1/orders/${d.id}`, t); if (!o) continue;
      switch (luot.viec) {
        case 'Ký hợp đồng': case 'Ký và gửi': await lam(tc, 'ký hợp đồng', d.code, () => ky(t, o, phia)); break;
        case 'Chuyển cọc': await lam(tc, 'chuyển cọc', d.code, async () => {
          const hd = await get(`/v1/orders/${d.id}/deposit-instruction`, t);
          await post('/v1/sim/bank/transfers', { payment_ref: hd.payment_ref, amount_vnd: Number(hd.total_vnd), payer: { bank_code: 'VCB', account_no: '0071000123456', name: o.buyer?.display_name ?? 'BEN MUA' } }, t);
          return post('/v1/sim/bank/deliver', {}, t);
        }); break;
        case 'Trả khoản trước bốc': await lam(tc, 'báo đã trả trước bốc', d.code, async () => {
          const p = ((await get(`/v1/orders/${d.id}/payments`, t)) ?? []).find((x: any) => x.kind === 'goods_before_loading' && x.status !== 'payer_reported');
          if (!p) return;
          const anh = (await post('/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'payment', entity_id: p.id, captured_in_app: true }, t)).json;
          return post(`/v1/payments/${p.id}/report`, { amount_vnd: Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, t);
        }); break;
        case 'Trả tiền hàng khi nhận': await lam(tc, 'báo đã trả tiền hàng', d.code, async () => {
          const p = ((await get(`/v1/orders/${d.id}/payments`, t)) ?? []).find((x: any) => x.kind === 'goods_on_receipt' && x.status === 'due');
          if (!p) return;
          const anh = (await post('/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'payment', entity_id: p.id, captured_in_app: true }, t)).json;
          return post(`/v1/payments/${p.id}/report`, { amount_vnd: Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, t);
        }); break;
        case 'Chỉ định người nhận, đặt xe': {
          const did = o.dot_giao?.find((x: any) => x.status === 'preparing')?.id; if (!did) break;
          const sanSang: any[] = (await get(`/v1/deliveries/${did}/readiness`, t)) ?? [];
          const thieu = (ma: string) => sanSang.some((x) => x.ma === ma && !x.ok);
          if (sanSang.some((x) => x.ma === 'xe' && x.ok)) { // đã có xe → chỉ còn phát QR người nhận
            if (thieu('nguoi_nhan')) await lam(tc, 'phát QR nhận hàng', d.code, () => post(`/v1/deliveries/${did}/receipt-qr`, {}, t));
            break;
          }
          await lam(tc, 'đặt xe', d.code, async () => {
          let r: any;
          for (const plate of ['DEMO-66C-001', 'DEMO-66C-002', 'DEMO-66C-003', 'DEMO-66C-004', '66C-123.45', '66C-678.90']) { r = await post(`/v1/deliveries/${did}/trip`, { plate_no: plate, freight_vnd: 1500000 }, t); if (r.status < 300) break; }
          return r;
          }); break;
        }
        case 'Nghiệm thu': await lam(tc, 'nghiệm thu đủ', d.code, async () => {
          const dd = o.dot_giao?.find((x: any) => x.status === 'checking'); if (!dd) return;
          const dv = await get(`/v1/deliveries/${dd.id}`, t); const q = Number(dv?.planned_qty_g ?? dv?.qty_g ?? 0); if (!q) return;
          return post(`/v1/deliveries/${dd.id}/acceptance`, { pin: PIN, weighed_g: q, seal_code: 'M-' + (1000 + (dem % 8999)), lines: [{ kind: 'accepted', qty_g: q }] }, t);
        }); break;
        case 'Xác nhận kết quả nghiệm thu': await lam(tc, 'đồng ý số cân', d.code, async () => {
          const dd = o.dot_giao?.find((x: any) => x.status === 'awaiting_seller'); if (!dd) return;
          return post(`/v1/deliveries/${dd.id}/acceptance/agree`, { pin: PIN }, t);
        }); break;
        default: break; // việc cần người thật/ngân hàng/vận hành: để nguyên
      }
    }
  }
  return nhat_ky;
}
