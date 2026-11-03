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
  'TC-B06': '0918000601', 'TC-B07': '0918000602', 'TC-B08': '0918000603', 'TC-B09': '0918000604', 'TC-B10': '0918000605',
  'TC-M06': '0908000601', 'TC-M07': '0908000602', 'TC-M08': '0908000603', 'TC-M09': '0908000604', 'TC-M10': '0908000605',
};
/** Đạo diễn buổi trình diễn: kịch bản cho lần nghiệm thu kế tiếp do bên mua ảo làm (dùng một lần rồi về bình thường). */
export const KICH_BAN: { lanToi: null | 'ha-cap' | 'tra-lai-nhieu' } = { lanToi: null };
// Tệp khách: chọn vai xong, rút ngẫu nhiên 3–4 đối tác AI phía bên kia, mỗi bên một kiểu (theo tình huống ở docs/mo-phong-quy-trinh).
export const KIEU_MUA: Record<string, string> = { 'song-phang': 'Sòng phẳng, nhận đủ trả đủ', 'kho-tinh': 'Khó tính: hạ loại 10% có ảnh', /* can-khong-dung, khac-mau */
  'tra-lai': 'Trả lại 80% có ảnh', /* hang-tra-lai, nghiem-thu-thap */ 'tra-thieu': 'Trả tiền hàng thiếu 30%', /* tra-mot-phan, chua-tra */ 'tra-gia-gat': 'Trả giá gắt 2 lần' /* de-nghi */ };
export const KIEU_BAN: Record<string, string> = { 'giao-deu': 'Giao đều, đúng hẹn', 'giu-gia': 'Giữ giá, trả giá 2 lần', /* nhieu-de-nghi */
  'cham': 'Trả lời chậm', /* theo-sat-don */ 'giao-thieu': 'Xuất thiếu 15%' /* dinh-ky-thieu-luong */ };
export const TEP = new Map<string, string>(); // mã tổ chức AI → kiểu
const THIEU = new Map<string, number>(); // đợt giao do người bán AI 'giao-thieu' → số gam thực giao (bên mua AI cân đúng số này)
const KIEU_TEP: Record<string, { tra?: number; buoc?: number; cham?: boolean }> = { 'tra-gia-gat': { tra: 2, buoc: 0.06 }, 'giu-gia': { tra: 2, buoc: 0.05 }, cham: { cham: true }, 'song-phang': { tra: 0 } };
export function rutTep(orgThat: string, ngauNhien = Math.random, gan?: Record<string, string>) {
  const tron = <T,>(a: T[]) => a.map((x) => [ngauNhien(), x] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const laBan = orgThat.startsWith('TC-B'), kieu = Object.keys(laBan ? KIEU_MUA : KIEU_BAN);
  const doiTac = tron(Object.keys(DAI_DIEN).filter((tc) => tc !== orgThat && tc.startsWith(laBan ? 'TC-M' : 'TC-B'))).slice(0, 3 + (ngauNhien() < 0.5 ? 1 : 0));
  const k = tron(kieu); TEP.clear();
  doiTac.forEach((tc, i) => TEP.set(tc, k[i % k.length]));
  if (gan) { TEP.clear(); for (const [tc, v] of Object.entries(gan)) TEP.set(tc, v); return [...TEP].map(([tc, v]) => ({ to_chuc: tc, kieu: v, mo_ta: (laBan ? KIEU_MUA : KIEU_BAN)[v] })); } // script kiểm gán sẵn
  return doiTac.map((tc) => ({ to_chuc: tc, kieu: TEP.get(tc)!, mo_ta: (laBan ? KIEU_MUA : KIEU_BAN)[TEP.get(tc)!] }));
}
const NV_TAI_CHINH = '0901000004'; // nhân viên đối soát (vai finance) trong chợ mẫu
const DA_CHAO = new Set<string>();
const DA_BAO = new Set<string>();          // dòng nhu cầu của người thật đã được người bán ảo báo giá (mỗi dòng một lần)          // lô của người thật đã được bên mua ảo chào (mỗi lô một lần)
const CHU_LO = new Map<string, string>();  // lot_id → seller_org_id (không đổi, đỡ gọi lại)
let luotMua = 0, luotCham = 0;
// Tính cách giao dịch của người mẫu — khớp dòng mô tả trên thẻ chọn vai (frontend/thiet-ke/dang-nhap.html, bảng TINH).
// tra: số lần trả giá trước khi đồng ý · buoc: mỗi lần nhích giá về phía mình · cham: trả lời cách một vòng.
const KIEU: Record<string, { tra?: number; buoc?: number; cham?: boolean }> = {
  'TC-B01': { tra: 0 },               // dễ chốt nếu giá sát giá tham khảo
  'TC-B04': { cham: true },           // cẩn thận, trả lời chậm
  'TC-B05': { tra: 0 },               // cần bán gấp, chịu bớt
  'TC-B08': { tra: 2, buoc: 0.05 },   // giữ giá
  'TC-B09': { tra: 0, cham: true },   // mới dùng app
  'TC-B10': { buoc: 0.06 },           // đòi giá cao hơn thị trường
  'TC-M04': { tra: 2, buoc: 0.06 },   // trả giá gắt
  'TC-M07': { tra: 0 },               // chốt nhanh khi hàng đẹp
  'TC-M09': { tra: 0 },               // ít trả giá
};
// Giá mua dự kiến của bên mua ảo (ngân sách riêng của họ, theo giá thị trường trong docs/nghiep-vu/du-lieu-cho.json),
// chỉ dùng khi chợ chưa đủ giao dịch để có giá tham khảo. Không hiển thị cho người dùng như giá tham khảo.
const GIA_MUA: Record<string, number> = { 'XOAI_CAT_CHU|L1': 25000, 'XOAI_CAT_CHU|L2': 15000, 'CHANH_KHONG_HAT|L1': 14000, 'TOM_THE|48-52': 120000,
  'LUA_TUOI|OM18-am25': 6600, 'SAU_RIENG|A': 75000, 'BUOI_DA_XANH|L1': 32000, 'THANH_LONG|L1': 18000, 'THANH_LONG|L2': 9000, 'CA_TRA|0.8-1.2': 30000 };
let dem = 0;
const DA_LOI = new Set<string>();
const DA_TRA_LOI = new Set<string>();
const khoa = () => `ao-${Date.now().toString(36)}-${(dem++).toString(36)}`;

/** Câu trả lời của đối tác ảo theo từ khóa trong tin bên kia (bỏ dấu để so). */
export function traLoi(tin: string, phia: 'buyer' | 'seller'): string {
  const t = tin.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  if (/da che|•/.test(t)) return 'Mình trao đổi trong app nha, có gì AgiViet hỗ trợ hai bên.';
  if (/gio|mai|sang|chieu|ngay|xe|toi vuon|lay hang/.test(t)) return phia === 'buyer' ? 'Dạ được, bên em cho xe tới đúng giờ hẹn trong hợp đồng, có gì em nhắn trước.' : 'Dạ được, sáng đó bên chị hái sẵn chờ xe tới cân.';
  if (/gia|bot|tang|giam/.test(t)) return phia === 'buyer' ? 'Giá này bên em tính theo loại 1 rồi, chị xem trả giá trong lời chào giúp em nha.' : 'Giá chị để sát rồi em, em trả giá trong lời chào giúp chị nha.';
  if (/con|du|bao nhieu|tan|kg|hang/.test(t)) return phia === 'buyer' ? 'Bên em cần đúng lượng trong lời chào, đủ loại 1 là em lấy hết.' : 'Còn đủ em, hàng đẹp, loại 1 chiếm phần lớn.';
  return phia === 'buyer' ? 'Dạ em nhận được rồi, có gì em báo lại nha.' : 'Dạ chị nhận được rồi nha em.';
}

export interface ViecAo { to_chuc: string; viec: string; doi_tuong: string; ket_qua: 'xong' | 'loi'; chi_tiet?: string }

/** Một vòng quét. nguoiThat: số điện thoại hoặc mã tổ chức ('TC-…') người thật đang dùng (tổ chức của họ không bị đóng vai).
 *  idThat: id tổ chức người thật — để bên mua ảo chủ động chào giá lô của họ. */
export async function motVong(goi: Goi, nguoiThat: string[], idThat: string[] = []): Promise<ViecAo[]> {
  const nhat_ky: ViecAo[] = [];
  const vai = async (phone: string) => (await goi('POST', '/v1/test/impersonate', { phone })).json as { token: string; user: any };
  const toChucThat = new Set<string>();
  for (const p of nguoiThat) { if (p.startsWith('TC-')) { toChucThat.add(p); continue; } const v = await vai(p); if (v?.user?.org?.code) toChucThat.add(v.user.org.code); }
  const post = (u: string, b: any, t: string) => goi('POST', u, u.startsWith('/v1/otp/') || u.startsWith('/v1/sim/') ? b : { idempotency_key: khoa(), ...b }, t);
  // Danh sách có phân trang trả {items, …} → lấy mảng items cho mọi vòng lặp bên dưới.
  const get = async (u: string, t: string) => { const r = await goi('GET', u, undefined, t); return r.status < 300 ? (Array.isArray(r.json?.items) ? r.json.items : r.json) : null; };
  const lam = async (tc: string, viec: string, dt: string, fn: () => Promise<{ status: number; json: any } | void>) => {
    const k = `${tc}|${viec}|${dt}`; if (DA_LOI.has(k)) return; // việc đã lỗi thì không thử lại mỗi vòng (cần người/vận hành)
    const cu = nhat_ky.length;
    try { await lam0(); } finally { if (nhat_ky.length > cu && nhat_ky[nhat_ky.length - 1].ket_qua === 'loi') DA_LOI.add(k); }
    async function lam0() {
    try {
      const r = await fn();
      if (r === undefined) return; // chưa tới lúc / không có việc → không ghi "xong" (tránh báo sai cho người thật)
      if (r && r.status >= 300) nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'loi', chi_tiet: JSON.stringify(r.json).slice(0, 200) });
      else nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'xong' });
    } catch (e) { nhat_ky.push({ to_chuc: tc, viec, doi_tuong: dt, ket_qua: 'loi', chi_tiet: String(e).slice(0, 200) }); }
    }
  };
  const otp = async (t: string, purpose: string, extra: any) => (await post('/v1/otp/challenges', { purpose, ...extra }, t)).json?.challenge_id;
  const ky = async (t: string, o: any, phia: string) => {
    const doc = [...(o.tai_lieu ?? [])].reverse().find((d: any) => d.doc_type === 'contract');
    return post(`/v1/orders/${o.id}/sign`, { challenge_id: await otp(t, 'contract_sign', { document_id: doc?.id }), code: OTP, expected_revision: o.revision, ...(phia === 'seller' ? { commitment_ack: true, low_downgrade_price_ack: true } : {}) }, t);
  };

  // 0) Chủ động: lô đang bán của người bán thật chưa ai (ảo) chào → một bên mua ảo (xoay vòng) chào đúng giá tham khảo
  //    (chào giá kín: bên mua không thấy giá người bán), chưa đủ dữ liệu thì theo giá mua dự kiến GIA_MUA; không có cả hai thì không chào.
  const muaAo = Object.keys(DAI_DIEN).filter((tc) => tc.startsWith('TC-M') && !toChucThat.has(tc) && (!TEP.size || TEP.has(tc)));
  if (idThat.length && muaAo.length) {
    const tc = muaAo[luotMua++ % muaAo.length]; const me = await vai(DAI_DIEN[tc]);
    if (me?.token) {
      const ds = await get('/v1/lots', me.token); const lots = ds?.items ?? ds ?? [];
      for (const l of lots) {
        if (l.status !== 'on_sale' || DA_CHAO.has(l.id)) continue;
        if (!CHU_LO.has(l.id)) { const ct = await get(`/v1/lots/${l.id}`, me.token); if (ct?.seller_org_id) CHU_LO.set(l.id, ct.seller_org_id); }
        if (!idThat.includes(CHU_LO.get(l.id) ?? '')) continue;
        DA_CHAO.add(l.id);
        const tk = await get(`/v1/reference-prices?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`, me.token);
        const gia = tk?.status === 'du_du_lieu' ? Math.round(Number(tk.price_vnd) / 100) * 100 : (GIA_MUA[`${l.product_code}|${l.grade_code}`] ?? 0), con = Number(l.available_g ?? 0);
        if (!gia || !con) continue;
        const qty = Math.min(con, 500000);
        await lam(tc, `chào giá ${gia.toLocaleString("vi-VN")} đ/kg`, l.code, () => post('/v1/offers', { direction: 'buyer_bid', lot_id: l.id, qty_g: qty, price_vnd: gia }, me.token));
        break; // mỗi vòng một lời chào cho tự nhiên
      }
    }
  }

  // 0b) Nhu cầu đang mở của người mua thật → người bán ảo có lô đúng món + loại gửi báo giá (giá tham khảo +2%; mỗi dòng một báo giá).
  if (idThat.length) {
    for (const [tc, sdt] of Object.entries(DAI_DIEN)) {
      if (!tc.startsWith('TC-B') || toChucThat.has(tc) || (TEP.size && !TEP.has(tc))) continue;
      const me = await vai(sdt); if (!me?.token) continue;
      const nc = ((await get('/v1/demands', me.token)) ?? []).filter((n: any) => n.status === 'open' && idThat.includes(n.buyer_org_id));
      if (!nc.length) break; // không có nhu cầu của người thật → khỏi hỏi người bán khác
      const lots = ((await get('/v1/lots?mine=true', me.token)) ?? []).filter((l: any) => l.status === 'on_sale');
      for (const n of nc) for (const dl of n.lines ?? []) {
        if (DA_BAO.has(dl.id)) continue;
        const l = lots.find((x: any) => x.product_code === n.product_code && x.grade_code === dl.grade_code && Number(x.available_g ?? 0) > 0); if (!l) continue;
        const tk = await get(`/v1/reference-prices?product=${encodeURIComponent(n.product_code)}&grade=${encodeURIComponent(dl.grade_code)}`, me.token);
        const goc = tk?.status === 'du_du_lieu' ? Number(tk.price_vnd) : (GIA_MUA[`${n.product_code}|${dl.grade_code}`] ?? 0); if (!goc) continue;
        const gia = Math.round(goc * 1.02 / 100) * 100, qty = Math.min(Number(dl.qty_g), Number(l.available_g));
        DA_BAO.add(dl.id);
        await lam(tc, `báo giá ${gia.toLocaleString('vi-VN')} đ/kg cho nhu cầu`, n.code, () => post('/v1/offers', { direction: 'seller_quote', lot_id: l.id, demand_line_id: dl.id, qty_g: qty, price_vnd: gia }, me.token));
      }
    }
  }

  for (const [tc, sdt] of Object.entries(DAI_DIEN)) {
    if (toChucThat.has(tc)) continue;
    const me = await vai(sdt); if (!me?.token) continue;
    const t = me.token;
    // 1) Lời chào: tới lượt mình → trả giá theo tính cách (số lần, bước giá), hết lượt trả giá thì đồng ý.
    const kieu = { ...(KIEU[tc] ?? {}), ...(KIEU_TEP[TEP.get(tc) ?? ''] ?? {}) }; const soLanTra = kieu.tra ?? 1, buoc = kieu.buoc ?? 0.03;
    for (const of of (await get('/v1/offers', t)) ?? []) {
      const phia = of.la_ben_mua ? 'buyer' : 'seller';
      const v = of.vong_cuoi;
      if (of.status === 'sent' && v && v.from_side !== phia) {
        if (kieu.cham && (luotCham++ % 2)) continue; // người cẩn thận / mới dùng app trả lời chậm (cách một vòng)
        if (Math.ceil(Number(v.round_no) / 2) <= soLanTra) {
          const gia = Math.round(Number(v.price_vnd) * (phia === 'seller' ? 1 + buoc : 1 - buoc) / 100) * 100;
          await lam(tc, `trả giá ${gia.toLocaleString("vi-VN")} đ/kg`, of.code, () => post(`/v1/offers/${of.id}/counter`, { price_vnd: gia, qty_g: Number(v.qty_g) }, t));
        } else await lam(tc, 'đồng ý giá', of.code, () => post(`/v1/offers/${of.id}/accept`, { expected_revision: of.revision }, t));
      }
      // Bên mua ảo: lời chào đã chốt mà chưa thành đơn → lập đơn (trùng thì backend từ chối, bỏ qua).
      if (of.status === 'accepted' && phia === 'buyer' && !of.order_id) {
        const now = new Date((await get('/v1/test/clock', t))?.now ?? Date.now());
        const tu = new Date(now.getTime() + 15 * 60e3); // trình diễn: giao sau 15 phút để người thật làm tiếp ngay
        const r = await post('/v1/orders', { offer_id: of.id, downgrade_price_vnd: Math.round(Number(v?.price_vnd ?? 0) * 0.65 / 100) * 100, delivery_mode: 'at_farm', transport_by: 'buyer',
          delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 3600e3).toISOString(), payment_timing: 'on_receipt', designated_receiver_user_id: me.user.user_id, silent_accept_hours: 2 }, t);
        if (r.status < 300) nhat_ky.push({ to_chuc: tc, viec: 'lập đơn', doi_tuong: of.code, ket_qua: 'xong' });
      }
    }
    // 1b) Tin nhắn: tin mới nhất của cuộc là của bên kia → trả lời một câu ngắn theo nội dung (luật đơn giản, không gửi liên lạc).
    for (const s of (await get('/v1/messages/summary', t)) ?? []) {
      if (s.la_cua_toi || DA_TRA_LOI.has(s.id)) continue;   // mỗi tin của bên kia chỉ trả lời một lần
      DA_TRA_LOI.add(s.id);
      const cau = traLoi(String(s.body ?? ''), tc.startsWith('TC-M') ? 'buyer' : 'seller');
      await lam(tc, 'trả lời tin nhắn', s.order_id ?? s.offer_id, () => post('/v1/messages', { ...(s.order_id ? { order_id: s.order_id } : { offer_id: s.offer_id }), body: cau }, t));
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
          return post(`/v1/payments/${p.id}/report`, { amount_vnd: TEP.get(tc) === 'tra-thieu' ? Math.round(Number(p.amount_due_vnd) * 0.7 / 1000) * 1000 : Number(p.amount_due_vnd), method: 'bank_transfer', evidence_document_id: anh.id }, t);
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
          let duoc = false; for (const plate of ['DEMO-66C-001', 'DEMO-66C-002', 'DEMO-66C-003', 'DEMO-66C-004', '66C-123.45', '66C-678.90', '66C-246.80', '66C-135.79']) { const r1 = await post(`/v1/deliveries/${did}/trip`, { plate_no: plate, freight_vnd: 1500000 }, t); if (r1.status < 300) { r = r1; duoc = true; if (r1.json?.data?.delivery_status === 'ready' || r1.json?.delivery_status === 'ready') break; } else if (/đủ xe/i.test(JSON.stringify(r1.json ?? ''))) break; else if (!duoc) r = r1; } /* 0081: đơn lớn đi nhiều chuyến */
          return r;
          }); break;
        }
        case 'Giao hàng, quét QR nhận hàng': await lam(tc, 'giao hàng (quét mã người nhận)', d.code, async () => {
          // Người bán ảo quét QR người nhận đang mở (bản thử: lấy mã qua route thử như khi người nhận đưa máy cho quét).
          const dd = o.dot_giao?.find((x: any) => ['ready', 'preparing'].includes(x.status)); if (!dd) return;
          const dv = await get(`/v1/deliveries/${dd.id}`, t);
          const bayGio = new Date((await get('/v1/test/clock', t))?.now ?? Date.now());
          if (dv?.window_from && new Date(dv.window_from) > bayGio) return; // chưa tới giờ giao → vòng sau
          const ma = (await get(`/v1/test/deliveries/${dd.id}/receipt-code`, t))?.ma_6_so; if (!ma) return;
          const taiCho = ['tai_vuon', 'tai_ao', 'tai_ruong', 'tai_diem_gom'].includes(dv?.acceptance_point); // như DIEM_TAI_CHO ở giao-nhan.ts
          if (TEP.get(tc) === 'giao-thieu' && !THIEU.has(dd.id)) {
            const kh = Number(dv?.planned_qty_g ?? 0), co = Math.round(kh * 0.85 / 1000) * 1000; THIEU.set(dd.id, co);
            await post('/v1/messages', { order_id: d.id, body: `Đợt này vườn chỉ đủ ${(co / 1000).toLocaleString('vi-VN')} kg, thiếu ${((kh - co) / 1000).toLocaleString('vi-VN')} kg so với hợp đồng. Mong bên mình thông cảm, cân theo số thực nhận.` }, t);
          }
          return taiCho ? post(`/v1/deliveries/${dd.id}/start-check`, { ma_6_so: ma }, t)
            : post(`/v1/deliveries/${dd.id}/ship`, { ma_6_so: ma, loaded_g: String(THIEU.get(dd.id) ?? dv?.planned_qty_g ?? 0), plate_no: 'DEMO-66C-001' }, t);
        }); break;
        case 'Ký nhận tại nơi đến': await lam(tc, 'ký nhận tại nơi đến', d.code, async () => {
          const dd = o.dot_giao?.find((x: any) => x.status === 'in_transit'); if (!dd) return;
          const dv = await get(`/v1/deliveries/${dd.id}`, t); const q = Number(dv?.loaded_g ?? dv?.planned_qty_g ?? dv?.qty_g ?? 0); if (!q) return;
          return post(`/v1/deliveries/${dd.id}/arrival`, { weighed_g: q }, t); // cân lại đúng số đã bốc (không hao hụt)
        }); break;
        case 'Nghiệm thu': {
          const den = o.dot_giao?.find((x: any) => x.status === 'arrival_check');
          if (den) { await lam(tc, 'xác nhận hàng tới đủ', d.code, () => post(`/v1/deliveries/${den.id}/arrival/confirm`, {}, t)); break; } // tới nơi đủ hàng → hệ thống chốt quyết toán
          const dd = o.dot_giao?.find((x: any) => x.status === 'checking'); if (!dd) break;
          const dv = await get(`/v1/deliveries/${dd.id}`, t); const q = THIEU.get(dd.id) ?? Number(dv?.planned_qty_g ?? dv?.qty_g ?? 0); if (!q) break;
          // Kịch bản người trình diễn đặt trước (một lần): hạ loại 10% hoặc trả lại 80% — có ảnh bằng chứng như luật đòi.
          const kb = KICH_BAN.lanToi ?? ({ 'kho-tinh': 'ha-cap', 'tra-lai': 'tra-lai-nhieu' } as Record<string, 'ha-cap' | 'tra-lai-nhieu'>)[TEP.get(tc) ?? ''] ?? null; KICH_BAN.lanToi = null;
          const phan = kb === 'tra-lai-nhieu' ? { kind: 'rejected', ty: 0.8, ly: 'THOI' } : kb === 'ha-cap' ? { kind: 'downgraded', ty: 0.1, ly: 'DAP' } : null;
          await lam(tc, phan ? (phan.kind === 'rejected' ? 'nghiệm thu: trả lại 80%' : 'nghiệm thu: hạ loại 10%') : 'nghiệm thu đủ', d.code, async () => {
            if (!phan) return post(`/v1/deliveries/${dd.id}/acceptance`, { pin: PIN, weighed_g: q, seal_code: 'M-' + (1000 + (dem % 8999)), lines: [{ kind: 'accepted', qty_g: q }] }, t);
            const anh = (await post('/v1/files', { mime: 'image/png', data_base64: ANH, entity: 'delivery', entity_id: dd.id, captured_in_app: true }, t)).json;
            const xau = Math.round(q * phan.ty / 1000) * 1000;
            return post(`/v1/deliveries/${dd.id}/acceptance`, { pin: PIN, weighed_g: q, seal_code: 'M-' + (1000 + (dem % 8999)), lines: [{ kind: 'accepted', qty_g: q - xau }, { kind: phan.kind, qty_g: xau, reason_code: phan.ly, evidence_document_id: anh.id }] }, t);
          }); break;
        }
        case 'Xác nhận kết quả nghiệm thu': await lam(tc, 'đồng ý số cân', d.code, async () => {
          const dd = o.dot_giao?.find((x: any) => x.status === 'awaiting_seller'); if (!dd) return;
          return post(`/v1/deliveries/${dd.id}/acceptance/agree`, { pin: PIN, ...(THIEU.has(dd.id) ? { shortfall: { choice: 'end' } } : {}) }, t); // giao thiếu: kết thúc phần thiếu (luật Q04)
        }); break;
        default: break; // việc cần người thật/vận hành: để nguyên
      }
    }
  }
  // 5) Ngân hàng giữ hộ (giả lập): xử lý lệnh chi cọc / hoàn tiền thừa đang chờ rồi báo kết quả về hệ thống.
  const nh = await goi('POST', '/v1/sim/bank/process-instructions', {});
  const soLenh = Array.isArray(nh.json?.queued) ? nh.json.queued.length : Number(nh.json?.queued ?? 0);
  if (nh.status < 300 && soLenh > 0) {
    await goi('POST', '/v1/sim/bank/deliver', {});
    nhat_ky.push({ to_chuc: 'NGAN_HANG', viec: `xử lý ${soLenh} lệnh chi/hoàn`, doi_tuong: 'ngân hàng', ket_qua: 'xong' });
  }
  // 6) Nhân viên tài chính AgiViet (AI): đối soát sao kê với lệnh đã thành công → đơn quyết toán xong thì hoàn tất.
  const tc = await vai(NV_TAI_CHINH);
  if (tc?.token) {
    const r = await post('/v1/ops/reconcile', {}, tc.token);
    const xong = r.status < 300 ? (r.json?.reconciled ?? []) : [];
    if (xong.length) nhat_ky.push({ to_chuc: 'AGIVIET', viec: `đối soát ${xong.length} lệnh`, doi_tuong: 'tài chính', ket_qua: 'xong' });
  }
  return nhat_ky;
}
