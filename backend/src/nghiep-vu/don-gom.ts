// Đơn gom có điều phối (duyệt 18/11/2026): một người mua gom lượng từ nhiều hộ.
// Mỗi hộ là một lời chào bình thường (giá → điều khoản → hợp đồng → cọc riêng), đơn gom chỉ là nhóm điều phối,
// lưu bằng sự kiện (evt.domain_events, aggregate 'don_gom') nên không cần bảng mới.
// Chat: không có phòng chung giữa các hộ (chống thông đồng giá, giữ ẩn danh); "Nhắn cả nhóm" gửi vào từng khung 1-1.
import { randomUUID } from 'node:crypto';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';
import { phat } from './chung.ts';
import { guiLoiChao } from './loi-chao.ts';
import { guiTinNhan } from './tin-nhan.ts';

const kgVN = (g: bigint | string | number) => (Number(g) / 1000).toLocaleString('vi-VN');

async function suKien(t: GiaoDich, id: string) {
  return t.q<any>(`SELECT event_type, payload, actor_org_id FROM evt.domain_events WHERE aggregate_type='don_gom' AND aggregate_id=$1 ORDER BY seq`, [id]);
}

async function moiHo(t: GiaoDich, nd: NguoiDung, id: string, canG: bigint, gia: unknown, n: { lot_id: string; qty_g: unknown }) {
  const of: any = await guiLoiChao(t, nd, { direction: 'buyer_bid', lot_id: n.lot_id, qty_g: n.qty_g, price_vnd: gia });
  // Tin điều phối: người bán biết đây là đơn gom và phần của mình, không thấy hộ khác.
  await guiTinNhan(t, nd, { offer_id: of.id, body: `Lời chào này thuộc một đơn gom ${kgVN(canG)} kg của người mua qua AgiViet; phần của bác ${kgVN(BigInt(String(n.qty_g)))} kg. Bác trả lời giá trong lời chào giúp nha.` } as any).catch(() => {});
  return String(of.id);
}

export async function taoDonGom(t: GiaoDich, nd: NguoiDung, b: { nguon: { lot_id: string; qty_g: unknown }[]; price_vnd: unknown; can_g: unknown }) {
  if (!nd.thanhVien.canBuy) throw loi('KHONG_CO_QUYEN', 'Chỉ tổ chức mua tạo đơn gom.');
  const nguon = Array.isArray(b.nguon) ? b.nguon : [];
  if (nguon.length < 2 || nguon.length > 6) throw loi('DU_LIEU_KHONG_HOP_LE', 'Đơn gom cần từ 2 tới 6 hộ.');
  if (new Set(nguon.map((x) => x.lot_id)).size !== nguon.length) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mỗi lô chỉ một lần trong đơn gom.');
  const canG = BigInt(String(b.can_g ?? 0));
  if (canG <= 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Thiếu tổng lượng cần.');
  const id = randomUUID(), offers: string[] = [];
  for (const n of nguon) offers.push(await moiHo(t, nd, id, canG, b.price_vnd, n));
  await phat(t, 'don_gom', id, 'don_gom.tao', { can_g: String(canG), gia_vnd: String(b.price_vnd), offers });
  return { id, offers };
}

/** Mời thêm/thay hộ (hộ cũ từ chối hoặc hết hàng). */
export async function themHo(t: GiaoDich, nd: NguoiDung, id: string, b: { lot_id: string; qty_g: unknown; price_vnd: unknown }) {
  const ds = await suKien(t, id);
  if (!ds.length || ds[0].actor_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  const offerId = await moiHo(t, nd, id, BigInt(ds[0].payload.can_g), b.price_vnd, b);
  await phat(t, 'don_gom', id, 'don_gom.them', { offers: [offerId] });
  return { id, offer_id: offerId };
}

const dsOffer = (ds: any[]) => ds.flatMap((e) => e.payload.offers ?? []) as string[];

export async function xemDonGom(t: GiaoDich, nd: NguoiDung, id: string) {
  const ds = await suKien(t, id);
  if (!ds.length || ds[0].actor_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  const ho = await t.q<any>(`SELECT o.id offer_id, o.code, o.status, l.code lot_code, (SELECT province_code FROM core.organizations g WHERE g.id=o.seller_org_id) province_code, h.order_id,
      (SELECT qty::text FROM core.offer_rounds r WHERE r.offer_id=o.id ORDER BY round_no DESC LIMIT 1) qty_g,
      (SELECT from_side FROM core.offer_rounds r WHERE r.offer_id=o.id ORDER BY round_no DESC LIMIT 1) ben_cuoi,
      (SELECT x.status FROM core.orders x WHERE x.id=h.order_id) order_status
    FROM core.offers o JOIN core.lots l ON l.id=o.lot_id LEFT JOIN LATERAL (SELECT order_id FROM core.holds WHERE offer_id=o.id ORDER BY created_at DESC LIMIT 1) h ON true
    WHERE o.id = ANY($1::uuid[])`, [dsOffer(ds)]);
  const { tenHien } = await import('./chung.ts');
  for (const h of ho) {
    const s = await t.mot<any>(`SELECT o.seller_org_id, g.display_name FROM core.offers o JOIN core.organizations g ON g.id=o.seller_org_id WHERE o.id=$1`, [h.offer_id]);
    h.seller_name = await tenHien(t, nd.thanhVien.orgId, s.seller_org_id, s.display_name, 'ban');
    h.trang_thai = h.order_id ? 'co_hop_dong' : h.status === 'accepted' ? 'da_chot_gia' : h.status === 'sent' ? (h.ben_cuoi === 'buyer' ? 'cho_nguoi_ban' : 'toi_luot_ban') : 'da_dong';
  }
  const chot = ho.filter((h) => ['co_hop_dong', 'da_chot_gia'].includes(h.trang_thai)).reduce((a, h) => a + BigInt(h.qty_g ?? 0), 0n);
  return { id, can_g: ds[0].payload.can_g, da_chot_g: String(chot), ho };
}

export async function dsDonGom(t: GiaoDich, nd: NguoiDung) {
  const ids = await t.q<any>(`SELECT aggregate_id id, payload->>'can_g' can_g, occurred_at FROM evt.domain_events WHERE aggregate_type='don_gom' AND event_type='don_gom.tao' AND actor_org_id=$1 ORDER BY seq DESC LIMIT 20`, [nd.thanhVien.orgId]);
  return Promise.all(ids.map(async (x) => { const d = await xemDonGom(t, nd, x.id); return { id: x.id, can_g: d.can_g, da_chot_g: d.da_chot_g, so_ho: d.ho.length, tao_luc: x.occurred_at }; }));
}

/** Nhắn cả nhóm: cùng nội dung vào từng khung 1-1 còn mở (qua bộ che liên lạc như tin thường). */
export async function nhanCaNhom(t: GiaoDich, nd: NguoiDung, id: string, body: string) {
  const d = await xemDonGom(t, nd, id);
  let n = 0;
  for (const h of d.ho.filter((x: any) => x.trang_thai !== 'da_dong')) {
    await guiTinNhan(t, nd, h.order_id ? { order_id: h.order_id, body } as any : { offer_id: h.offer_id, body } as any); n++;
  }
  return { id, da_gui: n };
}

/** Cho thẻ giao dịch (cả hai bên): lời chào này có thuộc đơn gom không, phần lượng của hộ này. */
export async function donGomCuaLoiChao(t: GiaoDich, offerId: string) {
  const e = await t.mot<any>(`SELECT aggregate_id, payload FROM evt.domain_events WHERE aggregate_type='don_gom' AND payload->'offers' ? $1 ORDER BY seq LIMIT 1`, [offerId]);
  if (!e) return null;
  const tao = await t.mot<any>(`SELECT payload->>'can_g' can_g FROM evt.domain_events WHERE aggregate_type='don_gom' AND aggregate_id=$1 AND event_type='don_gom.tao'`, [e.aggregate_id]);
  return { id: e.aggregate_id, can_g: tao?.can_g ?? null };
}
