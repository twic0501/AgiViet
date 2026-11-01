// Tin nhắn thật hai bên trong một lời chào giá / hợp đồng (migration 0076).
// Nội dung được quét liên lạc bằng cùng bộ quét của app (security/lib/lien-lac.mjs) và CHE trước khi lưu.
import { appCmd } from '../db/command.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';
// @ts-ignore — module JS thuần dùng chung với frontend
import { quetLienLacDayDu } from '../../../security/lib/lien-lac.mjs';

export interface GuiTin { offer_id?: string; order_id?: string; body: string }

/** Cuộc trao đổi: hợp đồng → kèm tin nhắn từ lời chào giá đã sinh ra nó. */
async function cuoc(t: GiaoDich, nd: NguoiDung, x: { offer_id?: string; order_id?: string }) {
  if (x.order_id) {
    const o = await t.mot<any>(`SELECT id, offer_id, buyer_org_id, seller_org_id, code FROM core.orders WHERE id=$1`, [x.order_id]);
    if (!o || ![o.buyer_org_id, o.seller_org_id].includes(nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
    return { offerId: o.offer_id as string | null, orderId: o.id as string, phia: o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller', o };
  }
  if (!x.offer_id) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần offer_id hoặc order_id.');
  const o = await t.mot<any>(`SELECT id, buyer_org_id, seller_org_id, code FROM core.offers WHERE id=$1`, [x.offer_id]);
  if (!o || ![o.buyer_org_id, o.seller_org_id].includes(nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const don = await t.gtri<string>(`SELECT id FROM core.orders WHERE offer_id=$1 ORDER BY created_at DESC LIMIT 1`, [o.id]);
  return { offerId: o.id as string, orderId: (don ?? null) as string | null, phia: o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller', o };
}

export async function phiaTinNhan(t: GiaoDich, nd: NguoiDung, x: { offer_id?: string; order_id?: string }) {
  return (await cuoc(t, nd, x)).phia as 'buyer' | 'seller';
}

const CANH_BAO_CHE = 'Tin có số điện thoại, Zalo hoặc số tài khoản nên đã được che. Hai bên trao đổi trong app tới khi ngân hàng đối tác nhận cọc của bên mua; lúc đó liên lạc mới mở.';

/** Đọc chữ trong ảnh qua dịch vụ AI (Gemini vision) rồi quét liên lạc bằng cùng bộ quét. Không đọc được → không gửi (an toàn). */
async function quetAnh(t: GiaoDich, nd: NguoiDung, docId: string, ai: { url: string | null; key?: string | null }) {
  const d = await t.mot<any>(`SELECT storage_key, mime_type, owner_org_id FROM core.documents WHERE id=$1`, [docId]);
  if (!d || d.owner_org_id !== nd.thanhVien.orgId || !String(d.mime_type).startsWith('image/')) throw loi('KHONG_TIM_THAY', 'Không thấy ảnh vừa chụp.');
  if (!ai.url) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chưa kiểm được ảnh lúc này nên chưa gửi. Bác gửi chữ, hoặc thử lại sau ít phút.');
  const { docTep } = await import('./tai-lieu.ts');
  const r = await fetch(`${ai.url}/messages/scan-image`, { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', ...(ai.key ? { 'x-ai-key': ai.key } : {}) },
    body: JSON.stringify({ mime: d.mime_type, du_lieu_b64: docTep(d.storage_key).toString('base64') }) }).catch(() => null);
  if (!r || !r.ok) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chưa kiểm được ảnh lúc này nên chưa gửi. Bác gửi chữ, hoặc thử lại sau ít phút.');
  const kq = await r.json() as { chu: string; qr: boolean; app_nhan_tin: boolean };
  const q = quetLienLacDayDu(kq.chu || '') as { sach: boolean; loai: string[] };
  const loai = [...(q.sach ? [] : q.loai), ...(kq.qr ? ['mã QR'] : []), ...(kq.app_nhan_tin ? ['ảnh chụp app nhắn tin'] : [])];
  return { sach: !loai.length, loai };
}

export async function guiTinNhan(t: GiaoDich, nd: NguoiDung, b: GuiTin & { image_document_id?: string }, ai: { url: string | null; key?: string | null } = { url: null }) {
  const noiDung = String(b.body ?? '').trim() || (b.image_document_id ? '[Ảnh]' : '');
  if (!noiDung) throw loi('DU_LIEU_KHONG_HOP_LE', 'Tin nhắn trống.');
  if (noiDung.length > 1000) throw loi('DU_LIEU_KHONG_HOP_LE', 'Tin nhắn dài quá 1000 chữ.');
  const c = await cuoc(t, nd, b);
  // Quy trình v23: che liên lạc TRƯỚC khi ngân hàng nhận cọc; hợp đồng đã qua bước cọc thì liên lạc được mở (hẹn giao, gọi khi tới vườn).
  const daCoc = c.orderId ? ['active', 'awaiting_settlement', 'outstanding', 'completed'].includes(String(await t.gtri(`SELECT status FROM core.orders WHERE id=$1`, [c.orderId]))) : false;
  // Ảnh: trước cọc mà có liên lạc (số, Zalo, STK, QR, chụp app nhắn tin) thì KHÔNG gửi ảnh — không có cách "che" một phần ảnh an toàn.
  if (b.image_document_id && !daCoc) {
    const qa = await quetAnh(t, nd, b.image_document_id, ai);
    if (!qa.sach) return { id: null, gui: false, da_che: true, loai_che: qa.loai,
      canh_bao: `Ảnh có ${qa.loai.join(', ')} nên KHÔNG gửi. Trước khi ngân hàng nhận cọc, bác gửi ảnh hàng không kèm số điện thoại hay mã QR nhé.` };
  }
  const q = daCoc ? { sach: true, che: noiDung, loai: [] as string[] } : quetLienLacDayDu(noiDung) as { sach: boolean; che: string; loai: string[] };
  // Đã có hợp đồng thì gắn tin vào hợp đồng (vẫn giữ lời chào để nối lịch sử).
  const id = await appCmd<string>(t, nd, c.phia as any, 'send_message', [c.offerId, c.orderId, q.sach ? noiDung : q.che, !q.sach, q.loai ?? [], b.image_document_id ?? null]);
  return { id, gui: true, body: q.sach ? noiDung : q.che, da_che: !q.sach, loai_che: q.loai ?? [], canh_bao: q.sach ? null : CANH_BAO_CHE };
}

export async function docTinNhan(t: GiaoDich, nd: NguoiDung, x: { offer_id?: string; order_id?: string }) {
  const c = await cuoc(t, nd, x);
  const ds = await t.q<any>(`SELECT m.id, m.body, m.had_contact da_che, m.sender_org_id = $1 la_cua_toi, u.display_name nguoi_gui, m.created_at, m.attachment_document_id anh_id
      FROM core.chat_messages_of($1) m JOIN core.users u ON u.id = m.sender_user_id
      WHERE ($2::uuid IS NOT NULL AND m.offer_id = $2) OR ($3::uuid IS NOT NULL AND m.order_id = $3) ORDER BY m.created_at`, [nd.thanhVien.orgId, c.offerId, c.orderId]);
  return { offer_id: c.offerId, order_id: c.orderId, phia: c.phia, tin: ds };
}

/** Tin mới nhất của từng cuộc (để danh sách Tin nhắn hiện dòng xem trước). */
export async function tomTatTinNhan(t: GiaoDich, nd: NguoiDung) {
  // Một cuộc = hợp đồng nếu lời chào đã thành đơn (tin nhắn lúc còn lời chào gộp vào hợp đồng), không thì = lời chào.
  return t.q<any>(`WITH m AS (SELECT x.*, coalesce(x.order_id, (SELECT o.id FROM core.orders o WHERE o.offer_id = x.offer_id ORDER BY o.created_at DESC LIMIT 1)) don
        FROM core.chat_messages_of($1) x)
      SELECT DISTINCT ON (coalesce(m.don, m.offer_id)) CASE WHEN m.don IS NULL THEN m.offer_id END offer_id, m.don order_id, m.id, m.body, m.sender_org_id = $1 la_cua_toi, m.created_at,
      (SELECT count(*) FROM m n WHERE coalesce(n.don, n.offer_id) = coalesce(m.don, m.offer_id))::int so_tin
      FROM m ORDER BY coalesce(m.don, m.offer_id), m.created_at DESC`, [nd.thanhVien.orgId]);
}
