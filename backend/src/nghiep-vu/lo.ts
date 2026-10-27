import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Lô hàng (03 mục 1): tạo nháp, ảnh, đăng, xác nhận còn hàng, sửa giá, đóng; sổ lượng; giá kín chỉ chủ lô thấy.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { duocPhep } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { chuyenTrangThai, maMoi, phat, soGam } from './chung.ts';
import { B, chiaNuaLen } from './tinh-tien.ts';

export interface TaoLo {
  product_code: string; grade_code: string; qty_basis: 'estimated' | 'weighed'; qty_g: unknown;
  available_from?: string; harvest_on?: string; spray_clear_on?: string; site_id?: string;
  ask_price_vnd: unknown; floor_price_vnd: unknown; variety?: string; below_cost_ack?: boolean;
}

/** Giá tham khảo cùng mặt hàng + loại (+ tỉnh nếu đủ dữ liệu, rồi vùng ĐBSCL). Null = chưa đủ dữ liệu. */
export async function giaThamKhao(t: GiaoDich, productId: string, grade: string, tinh?: string | null) {
  const ds = await t.q<any>(
    `SELECT scope, unit_price_vnd::text gia, order_count, pair_count, as_of FROM mkt.reference_prices
     WHERE product_id=$1 AND grade_code=$2 AND order_count>=$3 AND pair_count>=$4`,
    [productId, grade, CHINH_SACH.giaThamKhaoToiThieuDon, CHINH_SACH.giaThamKhaoToiThieuCap]);
  const chon = ds.find((r) => r.scope === tinh) ?? ds.find((r) => r.scope === 'DBSCL') ?? ds[0];
  if (!chon) return null;
  return { scope: chon.scope as string, gia: B(chon.gia), soDon: Number(chon.order_count), soCap: Number(chon.pair_count), asOf: chon.as_of as Date };
}

function canhBaoGia(floor: bigint, ask: bigint, ptk: bigint | null) {
  const cb: { ma: string; cau: string }[] = [];
  if (ptk) {
    const nguong = chiaNuaLen(ptk * BigInt(CHINH_SACH.canhBaoGiaThapBps), 10000n);
    if (floor < nguong) {
      const pct = Number(((ptk - floor) * 100n) / ptk);
      cb.push({ ma: 'GIA_THAP_HON_MAT_BANG', cau: `Thấp hơn mặt bằng ${pct}%` });
    }
    if (ask > chiaNuaLen(ptk * 13000n, 10000n)) cb.push({ ma: 'GIA_CAO_HON_MAT_BANG', cau: 'Giá mong muốn cao hơn mặt bằng nhiều' });
  }
  return cb;
}

export async function taoLo(t: GiaoDich, nd: NguoiDung, d: TaoLo) {
  const sp = await t.mot<any>(`SELECT id, current_profile_version, open_tier FROM core.products WHERE code=$1`, [d.product_code]);
  if (!sp) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mặt hàng không có trong danh mục.');
  const grade = await t.mot<any>(`SELECT is_substandard FROM core.product_grades WHERE product_id=$1 AND profile_version=$2 AND grade_code=$3`, [sp.id, sp.current_profile_version, d.grade_code]);
  if (!grade) throw loi('DU_LIEU_KHONG_HOP_LE', 'Loại không có trong bảng loại của mặt hàng.');
  const qty = soGam(d.qty_g);
  if (qty <= 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng phải lớn hơn 0.');
  if (d.harvest_on && d.spray_clear_on && d.harvest_on < d.spray_clear_on) {
    throw loi('CHUA_HET_CACH_LY', `Vườn còn cách ly thuốc tới ${d.spray_clear_on}.`);
  }
  const ask = soGam(d.ask_price_vnd, 'ask_price_vnd');
  const floor = soGam(d.floor_price_vnd, 'floor_price_vnd');
  if (ask <= 0n || floor <= 0n || floor > ask) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giá thấp nhất phải > 0 và không vượt giá mong muốn.');
  const orgId = nd.thanhVien.orgId;
  let siteId = d.site_id ?? null;
  if (siteId) {
    const s = await t.mot(`SELECT 1 FROM core.production_sites WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL`, [siteId, orgId]);
    if (!s) throw loi('DU_LIEU_KHONG_HOP_LE', 'Vườn/ao không thuộc tổ chức của bạn.');
  } else {
    siteId = await t.gtri<string | null>(`SELECT id FROM core.production_sites WHERE org_id=$1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1`, [orgId]);
  }
  // 0056: đăng/xác nhận lô cần hồ sơ xác minh đúng tổ chức × cơ sở × mặt hàng × loại; chặn ngay từ bản nháp để không tạo lô không bao giờ đăng được.
  const { coXacMinh } = await import('./nha-vuon.ts');
  if (!(await coXacMinh(t, orgId, siteId, sp.id, sp.current_profile_version, d.grade_code))) throw loi('MAT_HANG_CHUA_XAC_MINH');
  const org = await t.mot<any>(`SELECT province_code FROM core.organizations WHERE id=$1`, [orgId]);
  const ptk = await giaThamKhao(t, sp.id, d.grade_code, org?.province_code);
  const code = await maMoi(t, 'core.lots', 'L');
  const id = await appCmd<string>(t,nd,'seller','create_lot',[{code,product_id:sp.id,profile_version:sp.current_profile_version,grade_code:d.grade_code,variety:d.variety??null,site_id:siteId,qty_basis:d.qty_basis,declared_qty:qty.toString(),available_from:d.available_from??null,harvest_on:d.harvest_on??null,spray_clear_on:d.spray_clear_on??null,is_substandard:grade.is_substandard}]);
  await appCmd(t,nd,'seller','update_lot',[id,'price',{ask_price_vnd:ask.toString(),floor_price_vnd:floor.toString(),below_cost_ack:!!d.below_cost_ack}]);
  const lot=await t.mot<any>(`SELECT id,status,version FROM core.lots WHERE id=$1`,[id]);
  return { id: lot.id, code, status: lot.status, revision: lot.version, canh_bao: canhBaoGia(floor, ask, ptk?.gia ?? null),
    gia_tham_khao: ptk ? { gia_vnd: ptk.gia.toString(), so_don: ptk.soDon, vung: ptk.scope } : null };
}

/** Ảnh lô: tài liệu bằng chứng gắn lô. Đăng lô cần ≥ 1 ảnh chụp trong app. */
export async function soAnhChupTrongApp(t: GiaoDich, lotId: string): Promise<number> {
  return Number(await t.gtri(`SELECT count(*) FROM core.documents WHERE entity='lot' AND entity_id=$1 AND doc_type='evidence' AND captured_in_app`, [lotId]));
}

export async function dangLo(t: GiaoDich, nd: NguoiDung, lotId: string, version?: number) {
  const lot = await layLoCuaToi(t, nd, lotId);
  if (version != null && lot.version !== version) throw loi('REVISION_XUNG_DOT');
  if ((await soAnhChupTrongApp(t, lotId)) < 1) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần ít nhất 1 ảnh chụp trong app mới đăng được.');
  const gia = await t.mot<any>(`SELECT ask_price_vnd::text ask,floor_price_vnd::text floor FROM core.lot_price_versions WHERE lot_id=$1 ORDER BY id DESC LIMIT 1`,[lotId]);
  await appCmd(t, nd, 'seller', 'publish_lot', [lotId, gia.ask, gia.floor]);
  await phat(t, 'lot', lotId, 'lo.da_dang', {});
  const row = await t.mot<any>(`SELECT status,version FROM core.lots WHERE id=$1`, [lotId]);
  return { id: lotId, code: lot.code, status: row.status, revision: row.version };
}

export async function xacNhanConHang(t: GiaoDich, nd: NguoiDung, lotId: string) {
 await layLoCuaToi(t, nd, lotId); await appCmd(t,nd,'seller','update_lot',[lotId,'confirm',{}]);
 return {id:lotId,status:await t.gtri(`SELECT status FROM core.lots WHERE id=$1`,[lotId])};
}

export async function suaGia(t: GiaoDich, nd: NguoiDung, lotId: string, d: { ask_price_vnd: unknown; floor_price_vnd: unknown }) {
 const lot=await layLoCuaToi(t,nd,lotId); const ask=soGam(d.ask_price_vnd), floor=soGam(d.floor_price_vnd);
 if(floor<=0n || floor>ask) throw loi('DU_LIEU_KHONG_HOP_LE');
 await appCmd(t,nd,'seller','update_lot',[lotId,'price',{ask_price_vnd:ask.toString(),floor_price_vnd:floor.toString()}]);
 return {id:lotId,status:lot.status,canh_bao:canhBaoGia(floor,ask,(await giaThamKhao(t,lot.product_id,lot.grade_code))?.gia??null)};
}

export async function dongLo(t: GiaoDich, nd: NguoiDung, lotId: string) {
 await layLoCuaToi(t,nd,lotId); await appCmd(t,nd,'seller','update_lot',[lotId,'close',{}]);
 const r=await t.mot<any>(`SELECT status,version FROM core.lots WHERE id=$1`,[lotId]); return {id:lotId,status:r.status,revision:r.version};
}

async function layLoCuaToi(t: GiaoDich, nd: NguoiDung, lotId: string) {
  const lot = await t.mot<any>(`SELECT l.*, l.available_from::text available_from_text FROM core.lots l WHERE l.id=$1 FOR UPDATE`, [lotId]);
  if (!lot || lot.seller_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  return lot;
}

export async function soLuongLo(t: GiaoDich, lotId: string) {
  const rows = await t.q<any>(`SELECT bucket, sum(qty)::text qty FROM ledger.qty_balances WHERE lot_id=$1 GROUP BY bucket`, [lotId]);
  const m: Record<string, string> = { available: '0', held: '0', committed: '0', in_transit: '0', delivered: '0', returned_pending: '0', moved_to_child: '0', loss: '0' };
  for (const r of rows) if (r.bucket !== 'source') m[r.bucket] = r.qty;
  return m;
}

/** Xem lô: chủ lô thấy giá kín; bên khác chỉ thấy thông tin an toàn (không giá thấp nhất, không giá mong muốn). */
export async function xemLo(t: GiaoDich, nd: NguoiDung | null, lotId: string) {
  const l = await t.mot<any>(
    `SELECT l.id,l.code,l.seller_org_id,o.display_name seller_name,o.province_code,p.code product_code,p.name_vi product_name,l.grade_code,l.qty_basis,
            l.declared_qty::text declared_qty,l.available_from::text,l.harvest_on::text,l.spray_clear_on::text,l.status,l.version,l.is_substandard,
            l.safety_locked_at IS NOT NULL safety_locked,l.last_confirmed_at,l.parent_lot_id,l.urgent_sale_until
     FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id JOIN core.products p ON p.id=l.product_id WHERE l.id=$1`, [lotId]);
  if (!l) throw loi('KHONG_TIM_THAY');
  const laChu = !!nd && nd.thanhVien.orgId === l.seller_org_id && (duocPhep(nd, 'lot.view_private') || !!nd.thanhVien.nguoiGiup?.actions.some((a) => a === 'lot.draft' || a === 'lot.update'));
  if (!laChu && l.status === 'draft') throw loi('KHONG_TIM_THAY');
  const out: any = {
    id: l.id, code: l.code, product_code: l.product_code, product_name: l.product_name, grade_code: l.grade_code,
    qty_basis: l.qty_basis, declared_qty_g: l.declared_qty, available_from: l.available_from, harvest_on: l.harvest_on,
    status: l.status, revision: l.version, is_substandard: l.is_substandard, safety_locked: l.safety_locked,
    province_code: l.province_code, seller_name: l.seller_name, qty: await soLuongLo(t, lotId),
    photos: await t.q(`SELECT id, code, captured_in_app, created_at FROM core.documents WHERE entity='lot' AND entity_id=$1 AND doc_type='evidence' ORDER BY created_at`, [lotId]),
  };
  if (laChu) {
    const gia = await t.mot<any>(`SELECT ask_price_vnd::text ask, floor_price_vnd::text floor, ref_price_vnd::text ref FROM core.lot_price_versions WHERE lot_id=$1 ORDER BY id DESC LIMIT 1`, [lotId]);
    out.ask_price_vnd = gia?.ask ?? null; out.floor_price_vnd = gia?.floor ?? null; out.ref_price_at_set_vnd = gia?.ref ?? null;
    out.urgent_sale_until = l.urgent_sale_until; out.spray_clear_on = l.spray_clear_on; out.last_confirmed_at = l.last_confirmed_at;
  }
  return out;
}

export async function danhSachLo(t: GiaoDich, nd: NguoiDung, q: { mine?: boolean; product_code?: string; grade_code?: string }) {
  if (q.mine) {
    return t.q(`SELECT l.id,l.code,p.code product_code,l.grade_code,l.qty_basis,l.status,l.version revision,l.declared_qty::text declared_qty_g,
      l.urgent_sale_from ban_gap_tu, l.urgent_sale_until ban_gap_den, l.urgent_sale_reason ban_gap_ly_do, l.site_id, l.last_confirmed_at,
      CASE WHEN l.parent_lot_id IS NOT NULL AND l.status='on_sale' AND (l.urgent_sale_until IS NULL OR l.urgent_sale_until <= $3::timestamptz)
        THEN 'Hàng trả lại/hạ cấp tách thành lô riêng: nên bật bán gấp để bán nhanh.' END goi_y_ban_gap, l.parent_lot_id,
      (l.status IN ('on_sale','upcoming') AND coalesce(l.last_confirmed_at,l.created_at) <= $3::timestamptz - make_interval(days => $2)) an_tu_dong,
      CASE WHEN l.status IN ('on_sale','upcoming') AND coalesce(l.last_confirmed_at,l.created_at) <= $3::timestamptz - make_interval(days => $2)
        THEN 'Quá ' || $2 || ' ngày chưa xác nhận còn hàng: bên mua không thấy. Bấm xác nhận còn hàng để hiện lại.' END an_ly_do,
      (SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances b WHERE b.lot_id=l.id AND b.bucket='available') available_g
      FROM core.lots l JOIN core.products p ON p.id=l.product_id WHERE l.seller_org_id=$1 ORDER BY l.code`, [nd.thanhVien.orgId, CHINH_SACH.han.hienThiLoNgay, new Date(t.thoiDiemMs)]);
  }
  // Tìm nguồn: chỉ cột an toàn, không giá (12 A3.10).
  return t.q(`SELECT l.id,l.code,p.code product_code,l.grade_code,l.qty_basis,l.status,o.province_code,l.available_from::text,
      (SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances b WHERE b.lot_id=l.id AND b.bucket='available') available_g,
      (l.urgent_sale_until > $5::timestamptz) ban_gap, CASE WHEN l.urgent_sale_until > $5::timestamptz THEN l.urgent_sale_until END ban_gap_den,
      CASE WHEN l.urgent_sale_until > $5::timestamptz THEN l.urgent_sale_reason END ban_gap_ly_do
      FROM core.lots l JOIN core.products p ON p.id=l.product_id JOIN core.organizations o ON o.id=l.seller_org_id
      WHERE l.status IN ('on_sale','upcoming') AND l.safety_locked_at IS NULL AND l.seller_org_id<>$1
        AND coalesce(l.last_confirmed_at, l.created_at) > $5::timestamptz - make_interval(days => $4)
        AND ($2::text IS NULL OR p.code=$2) AND ($3::text IS NULL OR l.grade_code=$3) ORDER BY (l.urgent_sale_until > $5::timestamptz) IS TRUE DESC, l.code`, [nd.thanhVien.orgId, q.product_code ?? null, q.grade_code ?? null, CHINH_SACH.han.hienThiLoNgay, new Date(t.thoiDiemMs)]);
}
