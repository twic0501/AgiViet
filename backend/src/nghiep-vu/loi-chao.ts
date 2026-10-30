import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Lời chào / báo giá (03 mục 3) và giữ lượng (mục 4). Giá kín không bao giờ lộ: chào dưới giá thấp nhất
// của lô thì tự từ chối, bên mua chỉ thấy câu "Chưa tới mức người bán chấp nhận" (không số).
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { canQuyen } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { chuyenTrangThai, maMoi, phat, soGam, taoHan, dongHan, kg } from './chung.ts';
import { giaThamKhao } from './lo.ts';
import { GIO } from '../dong-ho.ts';

export const CAU_CHUA_HOP_DONG = 'Đây chưa phải hợp đồng.';

export interface GuiLoiChao { direction: 'buyer_bid' | 'seller_quote'; lot_id: string; demand_line_id?: string; qty_g: unknown; price_vnd: unknown }

async function giaThapNhatKin(t: GiaoDich, lotId: string): Promise<bigint> {
  return BigInt(await t.gtri<string>(`SELECT floor_price_vnd::text FROM core.lot_price_versions WHERE lot_id=$1 ORDER BY id DESC LIMIT 1`, [lotId]));
}

async function khaDung(t: GiaoDich, lotId: string): Promise<bigint> {
  return BigInt(await t.gtri<string>(`SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances WHERE lot_id=$1 AND bucket='available'`, [lotId]));
}

export async function guiLoiChao(t: GiaoDich, nd: NguoiDung, d: GuiLoiChao) {
  const lot = await t.mot<any>(`SELECT l.*, o.province_code FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id WHERE l.id=$1 FOR UPDATE OF l`, [d.lot_id]);
  if (!lot || !['on_sale', 'upcoming'].includes(lot.status)) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Lô không còn mở bán.');
  if (lot.safety_locked_at) throw loi('LO_KHOA_AN_TOAN');
  const qty = soGam(d.qty_g); const gia = soGam(d.price_vnd, 'price_vnd');
  if (qty <= 0n || gia <= 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng và giá phải lớn hơn 0.');
  let buyerOrg: string; let sellerOrg: string; let side: 'buyer' | 'seller';
  let line: any = null;
  if (d.demand_line_id) {
    line = await t.mot<any>(`SELECT l.*, d.buyer_org_id, d.status demand_status, d.product_id FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE l.id=$1`, [d.demand_line_id]);
    if (!line || line.demand_status !== 'open') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Nhu cầu không còn mở.');
    if (line.product_id !== lot.product_id || line.grade_code !== lot.grade_code) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lô không cùng mặt hàng, loại với dòng nhu cầu.');
  }
  if (d.direction === 'buyer_bid') {
    canQuyen(nd, 'offer.send.buyer');
    buyerOrg = nd.thanhVien.orgId; sellerOrg = lot.seller_org_id; side = 'buyer';
    if (line && line.buyer_org_id !== buyerOrg) throw loi('KHONG_CO_QUYEN', 'Dòng nhu cầu không thuộc tổ chức của bạn.');
  } else {
    canQuyen(nd, 'offer.send.seller');
    if (!line) throw loi('DU_LIEU_KHONG_HOP_LE', 'Báo giá phải trả lời một dòng nhu cầu.');
    if (lot.seller_org_id !== nd.thanhVien.orgId) throw loi('KHONG_CO_QUYEN', 'Lô không thuộc tổ chức của bạn.');
    buyerOrg = line.buyer_org_id; sellerOrg = lot.seller_org_id; side = 'seller';
  }
  if (buyerOrg === sellerOrg) throw loi('DU_LIEU_KHONG_HOP_LE', 'Không tự chào hàng của mình.');
  const ptk = await giaThamKhao(t, lot.product_id, lot.grade_code, lot.province_code);
  let duoi80 = false;
  if (ptk && side === 'buyer') {
    if (gia * 100n < ptk.gia * BigInt(CHINH_SACH.chanChaoDuoiBps / 100)) throw loi('DUOI_60_THAM_KHAO');
    duoi80 = gia * 10000n < ptk.gia * BigInt(CHINH_SACH.canhBaoGiaThapBps);
  }
  if (line) {
    // Q12: tổng lượng các lời chào đang mở của phiếu ≤ 2 × lượng cần.
    const dangMo = BigInt(await t.gtri<string>(`SELECT coalesce(sum(r.qty),0)::text FROM core.offers o JOIN LATERAL (SELECT qty FROM core.offer_rounds WHERE offer_id=o.id ORDER BY round_no DESC LIMIT 1) r ON true WHERE o.demand_line_id=$1 AND o.status='sent'`, [line.id]));
    if (side === 'buyer' && dangMo + qty > BigInt(line.qty) * BigInt(CHINH_SACH.chaoVuotLuongToiDaLan)) throw loi('CHAO_VUOT_LUONG');
    // K12: cùng loại trong cùng phiếu phải cùng giá (chiều bên mua).
    if (side === 'buyer') {
      const khacGia = await t.mot(`SELECT 1 FROM core.offers o JOIN LATERAL (SELECT price_vnd FROM core.offer_rounds WHERE offer_id=o.id AND from_side='buyer' ORDER BY round_no DESC LIMIT 1) r ON true WHERE o.demand_line_id=$1 AND o.status='sent' AND r.price_vnd<>$2`, [line.id, gia]);
      if (khacGia) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cùng loại trong cùng phiếu phải cùng giá (dùng "nâng giá nhóm").');
    }
  }
  const code = await maMoi(t, 'core.offers', 'LC');

  const hetHan = new Date(t.thoiDiemMs + CHINH_SACH.han.traLoiLoiChaoGio * GIO);
  const id=await appCmd<string>(t,nd,side,'send_offer',[code,lot.id,line?.id??null,buyerOrg,d.direction,gia,qty]);
  const off=await t.mot<any>(`SELECT id,status,version FROM core.offers WHERE id=$1`,[id]);
  if(off.status==='auto_rejected')return {id,code,status:off.status,revision:off.version,thong_bao:'Chưa tới mức người bán chấp nhận.'};
  return { id: off.id, code, status: off.status, revision: off.version, canh_bao: duoi80 ? [{ ma: 'DUOI_80_THAM_KHAO', cau: 'Giá chào dưới 80% giá tham khảo.' }] : [],
    phan_tram_tham_khao: ptk ? Number((gia * 100n) / ptk.gia) : null, het_han: hetHan.toISOString() };
}

async function vongCuoi(t: GiaoDich, offerId: string) {
  return t.mot<any>(`SELECT round_no,from_side,price_vnd::text price,qty::text qty,expires_at FROM core.offer_rounds WHERE offer_id=$1 ORDER BY round_no DESC LIMIT 1`, [offerId]);
}

async function layLoiChao(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT * FROM core.offers WHERE id=$1 FOR UPDATE`, [id]);
  if (!o || (o.buyer_org_id !== nd.thanhVien.orgId && o.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const phia: 'buyer' | 'seller' = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller';
  return { o, phia };
}

/** Đồng ý giá → giữ lượng 24 giờ. "Đây chưa phải hợp đồng." */
export async function dongYLoiChao(t: GiaoDich, nd: NguoiDung, id: string, version?: number) {
 const {o,phia}=await layLoiChao(t,nd,id);if(version!=null&&o.version!==version)throw loi('REVISION_XUNG_DOT');
 canQuyen(nd,phia==='seller'?'offer.accept.seller':'offer.accept.buyer');
 const holdId=await appCmd<string>(t,nd,phia,'accept_offer',[id]);
 const h=await t.mot<any>(`SELECT qty::text,expires_at FROM core.holds WHERE id=$1`,[holdId]);
 const row=await t.mot<any>(`SELECT status,version FROM core.offers WHERE id=$1`,[id]);
 return {id,status:row.status,revision:row.version,hold_id:holdId,hold_expires_at:new Date(h.expires_at).toISOString(),thong_bao:`${CAU_CHUA_HOP_DONG} Đã giữ ${kg(h.qty)}.`};
}

export async function traGia(t: GiaoDich, nd: NguoiDung, id: string, giaMoi: unknown, qtyMoi?: unknown) {
 const {phia}=await layLoiChao(t,nd,id);canQuyen(nd,phia==='seller'?'offer.counter.seller':'offer.counter.buyer'); const r=await vongCuoi(t,id); const dem=Number(await t.gtri(`SELECT count(*) FROM core.offer_rounds WHERE offer_id=$1 AND from_side=$2 AND round_no>1`,[id,phia]));if(dem>=CHINH_SACH.luotTraGiaToiDaMoiBen)throw loi('HET_LUOT_TRA_GIA'); const gia=soGam(giaMoi,'price_vnd'); const qty=qtyMoi==null?BigInt(r.qty):soGam(qtyMoi);
 await appCmd(t,nd,phia,'reply_offer',[id,'counter',gia,qty]);
 const row=await t.mot<any>(`SELECT status,version FROM core.offers WHERE id=$1`,[id]);return {id,status:row.status,revision:row.version};
}

export async function tuChoiLoiChao(t: GiaoDich, nd: NguoiDung, id: string) {
 const {phia}=await layLoiChao(t,nd,id);canQuyen(nd,phia==='seller'?'offer.counter.seller':'offer.counter.buyer'); 
 await appCmd(t,nd,phia,'reply_offer',[id,'reject',null,null]);
 const row=await t.mot<any>(`SELECT status,version FROM core.offers WHERE id=$1`,[id]);return {id,status:row.status,revision:row.version};
}

export async function rutLoiChao(t: GiaoDich, nd: NguoiDung, id: string) {
 const {phia}=await layLoiChao(t,nd,id);canQuyen(nd,phia==='seller'?'offer.counter.seller':'offer.counter.buyer'); 
 await appCmd(t,nd,phia,'reply_offer',[id,'withdraw',null,null]);
 const row=await t.mot<any>(`SELECT status,version FROM core.offers WHERE id=$1`,[id]);return {id,status:row.status,revision:row.version};
}

export async function xemLoiChao(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT o.*, l.code lot_code FROM core.offers o JOIN core.lots l ON l.id=o.lot_id WHERE o.id=$1`, [id]);
  if (!o || (o.buyer_org_id !== nd.thanhVien.orgId && o.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const rounds = await t.q<any>(`SELECT round_no,from_side,price_vnd::text price_vnd,qty::text qty_g,expires_at FROM core.offer_rounds WHERE offer_id=$1 ORDER BY round_no`, [id]);
  const hold = await t.mot<any>(`SELECT id,qty::text qty_g,expires_at,status,order_id FROM core.holds WHERE offer_id=$1 ORDER BY created_at DESC LIMIT 1`, [id]);
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller';
  const cuoi = rounds[rounds.length - 1];
  const ref = await t.gtri<string>(`SELECT ref_price_vnd::text FROM core.lot_price_versions WHERE lot_id=$1 AND ref_price_vnd IS NOT NULL ORDER BY id DESC LIMIT 1`, [o.lot_id]);
  return {
    id: o.id, code: o.code, direction: o.direction, lot_id: o.lot_id, lot_code: o.lot_code, demand_line_id: o.demand_line_id,
    status: o.status, revision: o.version, rounds, hold,
    toi_luot: o.status === 'sent' ? (cuoi.from_side === 'buyer' ? 'seller' : 'buyer') : null,
    toi_luot_toi: o.status === 'sent' && cuoi.from_side !== phia,
    luot_tra_gia_con: CHINH_SACH.luotTraGiaToiDaMoiBen - rounds.filter(r=>r.from_side===phia && r.round_no>1).length,
    // Giá tham khảo và % do backend tính (màn S2 không tự tính); câu thông báo sau khi đồng ý (màn S4).
    gia_tham_khao_vnd: ref,
    phan_tram_gia_tham_khao: ref && cuoi ? Math.round(Number(cuoi.price_vnd) * 100 / Number(ref)) : null,
    thong_bao: o.status === 'accepted' ? `${CAU_CHUA_HOP_DONG}${hold ? ` Đã giữ ${kg(BigInt(hold.qty_g))}.` : ''}` : null,
  };
}

export async function danhSachLoiChao(t: GiaoDich, nd: NguoiDung) {
  return t.q(`SELECT o.id,o.code,o.direction,o.status,o.version revision,l.code lot_code,o.buyer_org_id=$1 la_ben_mua,
      o.buyer_org_id,o.demand_line_id,(SELECT display_name FROM core.organizations WHERE id=o.buyer_org_id) buyer_name,
      (SELECT json_build_object('round_no',r.round_no,'from_side',r.from_side,'price_vnd',r.price_vnd::text,'qty_g',r.qty::text,'expires_at',r.expires_at)
       FROM core.offer_rounds r WHERE r.offer_id=o.id ORDER BY r.round_no DESC LIMIT 1) vong_cuoi
      FROM core.offers o JOIN core.lots l ON l.id=o.lot_id WHERE o.buyer_org_id=$1 OR o.seller_org_id=$1 ORDER BY o.created_at DESC`, [nd.thanhVien.orgId]);
}
